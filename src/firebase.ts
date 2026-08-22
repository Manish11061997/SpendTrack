import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  projectId: "spendtrack-m-1106",
  appId: "1:9705130213:web:aaed30795fb9970cf32c0c",
  storageBucket: "spendtrack-m-1106.firebasestorage.app",
  apiKey: "AIzaSyDF1r44pvaCZKfyWvPTszE3Xe37NPhk7G4",
  authDomain: "spendtrack-m-1106.firebaseapp.com",
  messagingSenderId: "9705130213"
};

// Initialize Firebase safely without duplicate initialization
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});
