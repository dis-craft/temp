// Import the functions you need from the SDKs yo u need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, sendPasswordResetEmail } from "firebase/auth";
import { getFirestore, enableIndexedDbPersistence, initializeFirestore, CACHE_SIZE_UNLIMITED } from "firebase/firestore";
import { logActivity } from "./logger";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration is built from environment variables.
// This is a public configuration and is safe to expose on the client side.

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

if (!firebaseConfig.apiKey) {
    // During build, env vars might not be available. We don't want to throw.
    if (typeof window !== 'undefined') {
      console.error("Missing Firebase config. Please set NEXT_PUBLIC_FIREBASE_... variables in your .env file.");
    }
}


// Initialize Firebase
export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Initialize Firestore with persistence
let db: any;
if (typeof window !== 'undefined') {
  try {
    db = initializeFirestore(app, {
      cacheSizeBytes: CACHE_SIZE_UNLIMITED,
    });
    enableIndexedDbPersistence(db).catch((err) => {
      if (err.code == 'failed-precondition') {
        // Multiple tabs open, persistence can only be enabled
        // in one tab at a time.
        console.warn('Firestore persistence failed: failed-precondition. Multiple tabs open?');
      } else if (err.code == 'unimplemented') {
        // The current browser does not support all of the
        // features required to enable persistence.
        console.warn('Firestore persistence failed: unimplemented. Browser not supported.');
      }
    });
  } catch (e) {
    console.error("Error initializing Firestore with persistence", e);
    db = getFirestore(app);
  }
} else {
    db = getFirestore(app);
}

export { db };


export const sendPasswordReset = async (email: string) => {
  try {
    await sendPasswordResetEmail(auth, email);
    await logActivity(`Password reset email sent to: ${email}`, 'Authentication', null);

    // Send notification email to admin
    await fetch('/api/send-password-reset-notice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

  } catch (error: any) {
    console.error("Error sending password reset email:", error);
    await logActivity(`Failed to send password reset to ${email}: ${error.code} - ${error.message}`, 'Error', null);
    // Re-throw the error so the calling component can handle it
    throw error;
  }
};
