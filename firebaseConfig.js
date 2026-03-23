import { getApp, getApps, initializeApp } from '@react-native-firebase/app';
import { getFirestore } from '@react-native-firebase/firestore';
import { getAuth } from '@react-native-firebase/auth';

// 1. Initialize the Native Firebase App
const app = getApps().length === 0 ? initializeApp() : getApp();

// 2. Initialize Native Firestore
// Offline persistence is automatically enabled in the Native SDK.
const db = getFirestore(app);

// 3. Initialize Auth
const auth = getAuth(app);

export { auth, db };