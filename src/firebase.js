import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const requiredEnv = {
  apiKey: "VITE_FIREBASE_API_KEY",
  authDomain: "VITE_FIREBASE_AUTH_DOMAIN",
  projectId: "VITE_FIREBASE_PROJECT_ID",
  storageBucket: "VITE_FIREBASE_STORAGE_BUCKET",
  messagingSenderId: "VITE_FIREBASE_MESSAGING_SENDER_ID",
  appId: "VITE_FIREBASE_APP_ID",
};

const missingEnv = Object.values(requiredEnv).filter((key) => !import.meta.env[key]);

if (missingEnv.length > 0) {
  throw new Error(
    `Faltan variables de entorno Firebase: ${missingEnv.join(", ")}. Revisar .env.example.`,
  );
}

const firebaseConfig = {
  apiKey: import.meta.env[requiredEnv.apiKey],
  authDomain: import.meta.env[requiredEnv.authDomain],
  projectId: import.meta.env[requiredEnv.projectId],
  storageBucket: import.meta.env[requiredEnv.storageBucket],
  messagingSenderId: import.meta.env[requiredEnv.messagingSenderId],
  appId: import.meta.env[requiredEnv.appId],
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
