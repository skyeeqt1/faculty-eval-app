import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore"; // Added this


const firebaseConfig = {
  apiKey: "AIzaSyCvBPJ6zB0VxIg8Bz4Uocf-x8MdFr2zMOo",
  authDomain: "faculty-evaluation-48bfa.firebaseapp.com",
  projectId: "faculty-evaluation-48bfa",
  storageBucket: "faculty-evaluation-48bfa.appspot.com",
  messagingSenderId: "233643640484",
  appId: "1:233643640484:web:9837614d147eeb308e0831"
};

// Use getApps() to prevent initializing the app multiple times during hot reloads
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);
export const db = getFirestore(app); // Added this