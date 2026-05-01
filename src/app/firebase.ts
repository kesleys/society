import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Firebase project credentials
export const firebaseConfig = {
  apiKey: "AIzaSyChwoIRuQTTOHeZXEQwodi3gHCx9K-isxw",
  authDomain: "app-do-fut.firebaseapp.com",
  projectId: "app-do-fut",
  storageBucket: "app-do-fut.firebasestorage.app",
  messagingSenderId: "240906268187",
  appId: "1:240906268187:web:d47065247d6f9bb93f12be",
};

// Firestore document id under the "sync_data" collection
export const DEFAULT_SYNC_CODE = "SNC7336";

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(app);
