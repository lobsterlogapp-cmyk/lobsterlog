import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import i18next from 'i18next';
import Purchases from 'react-native-purchases';
import { auth } from '../../firebaseConfig';
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  deleteUser,
  reauthenticateWithCredential,
  EmailAuthProvider,
  setLanguageCode
} from '@react-native-firebase/auth';
import { doc, deleteDoc } from '@react-native-firebase/firestore';
import { db } from '../../firebaseConfig';
import { wipeAllStores, clearLocalDfoStores } from '../utils/dfoBackup';
import { setActiveDfoUid } from '../utils/dfoStorageKeys';

export function useAuth() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [verificationPending, setVerificationPending] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');
  // Delete Account reauth modal (cross-platform; replaces the iOS-only Alert.prompt).
  const [reauthVisible, setReauthVisible] = useState(false);
  const [reauthError, setReauthError] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      // Namespacing: keep the ambient DFO uid in lockstep with identity so every DFO
      // storage accessor reads/writes this account's namespace (null on sign-out →
      // accessors fall to the fail-closed __anon__ namespace, never legacy bare keys).
      setActiveDfoUid(u?.uid ?? null);

      if (u) {
        setTimeout(async () => {
          try {
            const isConfigured = await Purchases.isConfigured();
            if (isConfigured) {
              await Purchases.logIn(u.uid);
            }
          } catch (e) {
            console.log('Auth Sync Error:', (e as any).message);
          }
        }, 500);
      } else {
        await Purchases.logOut().catch(() => {});
      }

      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const handleLoginSubmit = async () => {
    if (!email || !password) {
      Alert.alert(i18next.t('login.errorTitle'), i18next.t('login.errors.missingFields'));
      return;
    }
    setAuthLoading(true);
    try {
      if (isRegistering) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        // Verification email goes out in the app language (template localization is Firebase-console side)
        await setLanguageCode(auth, i18next.language);
        await userCredential.user.sendEmailVerification();
        await signOut(auth);
        setPendingEmail(email);
        setPassword('');
        setVerificationPending(true);
     } else {
       await signInWithEmailAndPassword(auth, email, password);
     }
    } catch (err: any) {
      const friendlyMessage =
        err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password'
          ? i18next.t('login.errors.invalidCredential')
          : err.code === 'auth/email-already-in-use'
          ? i18next.t('login.errors.emailInUse')
          : err.code === 'auth/weak-password'
          ? i18next.t('login.errors.weakPassword')
          : err.code === 'auth/invalid-email'
          ? i18next.t('login.errors.invalidEmail')
          : err.message;
      Alert.alert(i18next.t('login.errors.authErrorTitle'), friendlyMessage);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = () => signOut(auth);

  const handleDeleteAccount = async () => {
    // 1. Confirm dialog still gates entry. Its destructive button opens the
    //    cross-platform reauth modal (replaces the iOS-only Alert.prompt), which
    //    collects the password. The actual reauth + destructive sequence runs in
    //    confirmReauthDelete below — invoked by the modal's Confirm button.
    Alert.alert(
      i18next.t('settings.deleteAccountTitle'),
      i18next.t('settings.deleteAccountConfirm'),
      [
        { text: i18next.t('nav.cancel'), style: 'cancel' },
        {
          text: i18next.t('settings.deleteAccountButton'),
          style: 'destructive',
          onPress: () => {
            setReauthError('');
            setReauthVisible(true);
          },
        },
      ]
    );
  };

  // Invoked by ReauthPasswordModal's Confirm with the entered password.
  const confirmReauthDelete = async (password: string) => {
    // 3. REAUTHENTICATE FIRST. On failure, show the error INLINE in the modal and
    //    keep it open for a retry — destroy NOTHING. Nothing destructive below runs
    //    unless reauthenticateWithCredential resolves successfully.
    try {
      const credential = EmailAuthProvider.credential(user.email, password);
      await reauthenticateWithCredential(auth.currentUser!, credential);
    } catch {
      setReauthError(i18next.t('account.reauthFailed')); // inline; modal stays open
      return;
    }

    // 4. Reauth succeeded — dismiss the modal, then run the destructive sequence.
    setReauthVisible(false);
    setReauthError('');
    // Capture the uid BEFORE anything destructive: deleteUser fires
    // onAuthStateChanged(null), which nulls the ambient active DFO uid, so the local
    // clear below must be told which namespace to wipe explicitly (it can no longer
    // read the ambient uid).
    const deletedUid = user.uid;
    try {
      // Cloud wipe FIRST, while still signed in (block-and-retry): if the cloud
      // copy can't be removed, ABORT before deleting the profile/account so the
      // account stays intact and the harvester can retry. Once deleteUser runs the
      // uid is gone and the dfo-elog backup is permanently unreachable (rules
      // require request.auth.uid == uid).
      const wipe = await wipeAllStores(deletedUid);
      if (!wipe.ok) {
        Alert.alert(
          i18next.t('settings.errorTitle'),
          i18next.t('backup.wipeFailedRetry')
        );
        return; // account left fully intact; nothing deleted
      }
      const userRef = doc(db, 'users', deletedUid);
      await deleteDoc(userRef);
      await deleteUser(auth.currentUser!);
      // 5. Clear THIS account's local DFO data on-device, last — the captured uid's
      //    namespace only, so a coexisting account on this device is untouched.
      await clearLocalDfoStores(deletedUid);
    } catch (error: any) {
      Alert.alert(i18next.t('settings.errorTitle'), error.message);
    }
  };

  const cancelReauthDelete = () => {
    setReauthVisible(false);
    setReauthError('');
  };

  return {
    user,
    loading,
    isRegistering,
    setIsRegistering,
    email,
    setEmail,
    password,
    setPassword,
    authLoading,
    verificationPending,
    setVerificationPending,
    pendingEmail,
    handleLoginSubmit,
    handleSignOut,
    handleDeleteAccount,
    reauthVisible,
    reauthError,
    confirmReauthDelete,
    cancelReauthDelete
  };
}