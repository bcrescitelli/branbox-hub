import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBEDEnzlDux8Fe8THAMxGkOBBvuj_W4MdQ",
  authDomain: "branbox-hub.firebaseapp.com",
  projectId: "branbox-hub",
  storageBucket: "branbox-hub.firebasestorage.app",
  messagingSenderId: "377780537570",
  appId: "1:377780537570:web:0b03afb2b32dacf4f836bb",
  databaseURL: "https://branbox-hub-default-rtdb.firebaseio.com" // Standard URL for Firebase RTDB
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export the "Tools" so the games can use them
export const db = getDatabase(app);
export const auth = getAuth(app);
