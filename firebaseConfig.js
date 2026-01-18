import { initializeApp } from "firebase/app";
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from "firebase/firestore";
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

// Your REAL configuration (from the console)
const firebaseConfig = {
  apiKey: "AIzaSyBBBn4stb_YfaT3WHI19lsqrP6dY8We9fg",
  authDomain: "lobster-log.firebaseapp.com",
  projectId: "lobster-log",
  storageBucket: "lobster-log.firebasestorage.app",
  messagingSenderId: "845063236282",
  appId: "1:845063236282:web:638cd5ab064c921417b083",
  measurementId: "G-049HXYBMY1"
};

// 1. Initialize the App
const app = initializeApp(firebaseConfig);

// 2. Initialize Auth with Persistence (Crucial for keeping users logged in on mobile)
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});

// 3. Initialize Database
const db = getFirestore(app);

export { auth, db };