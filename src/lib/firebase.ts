// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, initializeAuth, browserLocalPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCbUaM3BtSLsijul4kfEfX37q1CVlke-lI",
  authDomain: "vyom-setu-website.firebaseapp.com",
  projectId: "vyom-setu-website",
  storageBucket: "vyom-setu-website.appspot.com",
  messagingSenderId: "706422243230",
  appId: "1:706422243230:web:36985f2e33ab31df6f608f",
  measurementId: "G-QDEQJL56ZG"
};


// Initialize Firebase
export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Explicitly initialize Auth with persistence to avoid potential redirect issues
export const auth = initializeAuth(app, {
    persistence: browserLocalPersistence
});

export const db = getFirestore(app);
