import { initializeApp } from "firebase/app";
import { getMessaging } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyCZET6iMfRUcBEdeJofHB-aFr9lp2mYYNE",
  authDomain: "puzzle-game-6c4b2.firebaseapp.com",
  databaseURL: "https://puzzle-game-6c4b2-default-rtdb.firebaseio.com",
  projectId: "puzzle-game-6c4b2",
  storageBucket: "puzzle-game-6c4b2.firebasestorage.app",
  messagingSenderId: "977904476376",
  appId: "1:977904476376:web:741c07575de5681fb5b7ad",
  measurementId: "G-JMZQNSTT9E"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const messaging = typeof window !== "undefined" ? getMessaging(app) : null;

export { app, messaging };
