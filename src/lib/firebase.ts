// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, initializeAuth, browserLocalPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration is stored in an environment variable.
// This is a public configuration and is safe to expose on the client side.
let firebaseConfig: any;

try {
  firebaseConfig = JSON.parse(process.env.NEXT_PUBLIC_FIREBASE_CONFIG || '{}');
} catch (e) {
  console.error("Could not parse NEXT_PUBLIC_FIREBASE_CONFIG. Please ensure it is a valid JSON string.");
  firebaseConfig = {};
}

// Initialize Firebase
export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Explicitly initialize Auth with persistence to avoid potential redirect issues
export const auth = initializeAuth(app, {
    persistence: browserLocalPersistence
});

export const db = getFirestore(app);
