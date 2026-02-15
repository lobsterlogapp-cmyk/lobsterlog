import { initializeApp, getApp, getApps } from "firebase/app";
import { initializeAuth, getReactNativePersistence, getAuth } from 'firebase/auth';
import { getFirestore } from "firebase/firestore";
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyBBBn4stb_YfaT3WHI19lsqrP6dY8We9fg",
  authDomain: "lobster-log.firebaseapp.com",
  projectId: "lobster-log",
  storageBucket: "lobster-log.firebasestorage.app",
  messagingSenderId: "845063236282",
  appId: "1:845063236282:web:638cd5ab064c921417b083",
  measurementId: "G-049HXYBMY1"
};

// 1. Initialize App (Check if it already exists first)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// 2. Initialize Auth (Check if it already exists first)
let auth;
try {
  auth = getAuth(app);
} catch (e) {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage)
  });
}

// 3. Initialize Database
const db = getFirestore(app);

export { auth, db };