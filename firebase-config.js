// ──────────────────────────────────────────────
//  firebase-config.js
//  Paste YOUR firebaseConfig object below.
//  This file also exports the db & auth instances
//  used throughout app.js.
// ──────────────────────────────────────────────

import { initializeApp }              from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore,
         doc, getDoc, setDoc,
         collection, getDocs,
         orderBy, query }             from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth,
         signInAnonymously,
         onAuthStateChanged }         from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// ── YOUR FIREBASE CONFIG ──────────────────────
const firebaseConfig = {
  apiKey:            "AIzaSyAcirrvSgPgb4zBkSMJg8G0WIqQdqqtOsM",
  authDomain:        "consulate-d6691.firebaseapp.com",
  projectId:         "consulate-d6691",
  storageBucket:     "consulate-d6691.firebasestorage.app",
  messagingSenderId: "459011165720",
  appId:             "1:459011165720:web:40d50df68038219f49fd6d",
  measurementId:     "G-E5SQ8LW47N"
};
// ─────────────────────────────────────────────

const app  = initializeApp(firebaseConfig);
const db   = getFirestore(app);
const auth = getAuth(app);

export {
  db, auth,
  doc, getDoc, setDoc,
  collection, getDocs,
  orderBy, query,
  signInAnonymously,
  onAuthStateChanged
};
