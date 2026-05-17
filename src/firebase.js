import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const requiredEnv = {
  apiKey: "VITE_FIREBASE_API_KEY",
  authDomain: "VITE_FIREBASE_AUTH_DOMAIN",
  projectId: "VITE_FIREBASE_PROJECT_ID",
  storageBucket: "VITE_FIREBASE_STORAGE_BUCKET",
  messagingSenderId: "VITE_FIREBASE_MESSAGING_SENDER_ID",
  appId: "VITE_FIREBASE_APP_ID",
};

const fallbackFirebaseConfig = {
  apiKey: "AIzaSyCAR62SkCs3h6N4RPmrK9qJvVd7Isf7bWg",
  authDomain: "gestiones-marset-2-0.firebaseapp.com",
  projectId: "gestiones-marset-2-0",
  storageBucket: "gestiones-marset-2-0.firebasestorage.app",
  messagingSenderId: "923461841461",
  appId: "1:923461841461:web:80b24767ba3798604af77c",
  measurementId: "G-3VRNY7JVZB",
};

const firebaseConfig = {
  apiKey: import.meta.env[requiredEnv.apiKey] || fallbackFirebaseConfig.apiKey,
  authDomain: import.meta.env[requiredEnv.authDomain] || fallbackFirebaseConfig.authDomain,
  projectId: import.meta.env[requiredEnv.projectId] || fallbackFirebaseConfig.projectId,
  storageBucket: import.meta.env[requiredEnv.storageBucket] || fallbackFirebaseConfig.storageBucket,
  messagingSenderId: import.meta.env[requiredEnv.messagingSenderId] || fallbackFirebaseConfig.messagingSenderId,
  appId: import.meta.env[requiredEnv.appId] || fallbackFirebaseConfig.appId,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || fallbackFirebaseConfig.measurementId,
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: "select_account",
});
