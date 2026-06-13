import { getApp, getApps, initializeApp } from '@react-native-firebase/app';
import { getFirestore } from '@react-native-firebase/firestore';
import { getAuth } from '@react-native-firebase/auth';
import { initializeAppCheck, ReactNativeFirebaseAppCheckProvider } from '@react-native-firebase/app-check';

// ─── MANUAL STEP — Firebase Console ──────────────────────────────────────────
// Before deploying to production, register both apps in Firebase Console:
//   Firebase Console → Your project → App Check → Apps
//   Android: choose "Play Integrity" as provider
//   iOS:     choose "DeviceCheck" as provider
// DEV builds (when __DEV__ === true) use the debug provider automatically.
// The debug token printed to the console must be registered in the Firebase
// Console under App Check → Apps → <your app> → Debug tokens.
// See: https://firebase.google.com/docs/app-check
// ─────────────────────────────────────────────────────────────────────────────

// 1. Initialize the Native Firebase App
const app = getApps().length === 0 ? initializeApp() : getApp();

// 2. Initialize App Check — physical devices in production only
//    Simulator does not support DeviceCheck; skip entirely in DEV
if (!__DEV__) {
  const rnfbProvider = new ReactNativeFirebaseAppCheckProvider();
  rnfbProvider.configure({
    android: { provider: 'playIntegrity', debugToken: process.env.EXPO_PUBLIC_FIREBASE_APP_CHECK_DEBUG_TOKEN ?? 'PLACEHOLDER' },
    ios: { provider: 'deviceCheck', debugToken: process.env.EXPO_PUBLIC_FIREBASE_APP_CHECK_DEBUG_TOKEN ?? 'PLACEHOLDER' },
    web: { provider: 'reCaptchaV3', siteKey: 'none' },
  });
  initializeAppCheck(getApp(), { provider: rnfbProvider, isTokenAutoRefreshEnabled: true });
}
console.log('[AppCheck] skip in DEV:', __DEV__);

// 3. Initialize Native Firestore (offline persistence enabled by default)
const db = getFirestore(app);

// 4. Initialize Auth
const auth = getAuth(app);

export { auth, db };
