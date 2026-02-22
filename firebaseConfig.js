import { initializeApp, getApps, getApp } from "firebase/app";
import { initializeAuth, getReactNativePersistence, getAuth } from 'firebase/auth';
import { getFirestore } from "firebase/firestore";
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyBBBn4stb_YfaT3WHI19lsqrP6dY8We9fg",
  authDomain: "lobster-log.firebaseapp.com",
  projectId: "lobster-log",
  storageBucket: "lobster-log.firebasestorage.app",
  messagingSenderId: "845063236282",
  appId: "1:845063236282:web:638cd5ab064c921417b083",
  measurementId: "G-049HXYBMY1"
};

let app;
let auth;

// 1. Initialize App securely (prevents hot-reload crashes)
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
  // 2. Initialize Auth WITH local phone storage immediately
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
  });
} else {
  // If the app hot-reloads, just grab the already running instance
  app = getApp();
  auth = getAuth(app);
}

// 3. Connect to your new Canadian Firestore database
const db = getFirestore(app);

export { auth, db };