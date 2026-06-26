// ════════════════════════════════════════════════════
//  firebase-config.js
//  Paste your Firebase project config here.
// ════════════════════════════════════════════════════

const firebaseConfig = {
  apiKey: "AIzaSyAcirrvSgPgb4zBkSMJg8G0WIqQdqqtOsM",
  authDomain: "consulate-d6691.firebaseapp.com",
  projectId: "consulate-d6691",
  storageBucket: "consulate-d6691.firebasestorage.app",
  messagingSenderId: "459011165720",
  appId: "1:459011165720:web:40d50df68038219f49fd6d",
  measurementId: "G-E5SQ8LW47N"
};

// Initialize Firebase (compat SDK)
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// ── Firestore collection references ──────────────────
// Users:   db.collection("users").doc(userId)
// Entries: db.collection("users").doc(userId).collection("entries").doc(dateKey)
//
//  User document shape:
//  {
//    name: string,
//    startWeight: number,
//    height: number,
//    goalWeight: number,
//    createdAt: timestamp
//  }
//
//  Entry document shape (dateKey = "YYYY-MM-DD"):
//  {
//    date: string,          // "YYYY-MM-DD"
//    weight: number,
//    calories: number,
//    dayNumber: number,
//    savedAt: timestamp
//  }
