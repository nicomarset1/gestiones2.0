import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCAR62SkCs3h6N4RPmrK9qJvVd7Isf7bWg",
  authDomain: "gestiones-marset-2-0.firebaseapp.com",
  projectId: "gestiones-marset-2-0",
  storageBucket: "gestiones-marset-2-0.firebasestorage.app",
  messagingSenderId: "923461841461",
  appId: "1:923461841461:web:80b24767ba3798604af77c",
  measurementId: "G-3VRNY7JVZB"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();