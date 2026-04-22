import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import Purchases from 'react-native-purchases';
import { auth } from '../../firebaseConfig';
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  deleteUser
} from '@react-native-firebase/auth';
import { doc, deleteDoc } from '@react-native-firebase/firestore';
import { db } from '../../firebaseConfig';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [verificationPending, setVerificationPending] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);

      if (u) {
        setTimeout(async () => {
          try {
            const isConfigured = await Purchases.isConfigured();
            if (isConfigured) {
              await Purchases.logIn(u.uid);
            }
          } catch (e) {
            console.log('Auth Sync Error:', e.message);
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
      Alert.alert('Error', 'Please enter both email and password.');
      return;
    }
    setAuthLoading(true);
    try {
      if (isRegistering) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await userCredential.user.sendEmailVerification();
        await signOut(auth);
        setPendingEmail(email);
        setPassword('');
        setVerificationPending(true);
     } else {
       await signInWithEmailAndPassword(auth, email, password);
     }
    } catch (err) {
      const friendlyMessage =
        err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password'
          ? 'Incorrect email or password. Please try again.'
          : err.code === 'auth/email-already-in-use'
          ? 'An account with this email already exists. Try logging in instead.'
          : err.code === 'auth/weak-password'
          ? 'Password must be at least 6 characters.'
          : err.code === 'auth/invalid-email'
          ? 'Please enter a valid email address.'
          : err.message;
      Alert.alert('Authentication Error', friendlyMessage);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = () => signOut(auth);

  const handleDeleteAccount = async () => {
    Alert.alert('Delete Account', 'Are you sure? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const userRef = doc(db, 'users', user.uid);
            await deleteDoc(userRef);
            await deleteUser(auth.currentUser);
          } catch (error) {
            Alert.alert('Error', error.message);
          }
        }
      }
    ]);
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
    handleDeleteAccount
  };
}