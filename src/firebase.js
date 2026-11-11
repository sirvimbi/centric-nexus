// firebase.js
// Firebase initialization for Centric Nexus.
// Exposes auth, database, storage, and (optionally) analytics singletons.

import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";

// -----------------------------------------------------------------------------
// Firebase project configuration
// -----------------------------------------------------------------------------
// NOTE: These keys are safe to ship in a client bundle. Access control must be
// enforced with Firebase Security Rules and App Check — never rely on secrecy
// of this config in the browser.
// -----------------------------------------------------------------------------
const firebaseConfig = {
  apiKey: "AIzaSyDQA8w-pRNkNiQfZNvILHdZo_Lw7ViOcNw",
  authDomain: "centric-nexus.firebaseapp.com",
  databaseURL: "https://centric-nexus-default-rtdb.firebaseio.com",
  projectId: "centric-nexus",
  storageBucket: "centric-nexus.firebasestorage.app",
  messagingSenderId: "492072339165",
  appId: "1:492072339165:web:cacef68274f2c3938e3d34",
  measurementId: "G-0BMGCFT8YP",
};

// -----------------------------------------------------------------------------
// Initialize the Firebase app
// -----------------------------------------------------------------------------
const app = initializeApp(firebaseConfig);

// -----------------------------------------------------------------------------
// Core service singletons
// -----------------------------------------------------------------------------
export const auth = getAuth(app);
export const database = getDatabase(app);
export const storage = getStorage(app);
export const db = getFirestore(app);
export const functions = getFunctions(app, "africa-south1");

// -----------------------------------------------------------------------------
// Analytics (browser-only, feature-detected)
// -----------------------------------------------------------------------------
// Analytics is not supported in SSR, some privacy modes, or certain browsers.
// We lazily initialize it and swallow errors so the app keeps working.
export let analytics = null;

if (typeof window !== "undefined") {
  isSupported()
    .then((supported) => {
      if (supported) {
        analytics = getAnalytics(app);
      }
    })
    .catch((error) => {
      console.warn("Firebase Analytics unavailable:", error);
    });
}

export default app;