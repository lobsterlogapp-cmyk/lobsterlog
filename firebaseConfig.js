import { initializeApp, getApps, getApp } from "firebase/app";
import { initializeAuth, getReactNativePersistence, getAuth } from 'firebase/auth';
// 1. IMPORT THE NEW FIRESTORE CACHE MODULES
import { initializeFirestore, getFirestore, persistentLocalCache, persistentSingleTabManager } from "firebase/firestore";
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
let db; // 2. CREATE A VARIABLE FOR DB

if (getApps().length === 0) {
  // Fresh load: Initialize everything
  app = initializeApp(firebaseConfig);

  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
  });

  // 3. INITIALIZE FIRESTORE WITH OFFLINE PERSISTENCE
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentSingleTabManager() })
  });

} else {
  // Hot reload: Grab the already running instances
  app = getApp();
  auth = getAuth(app);
  db = getFirestore(app); // Get the existing DB without re-initializing the cache
}

export { auth, db };