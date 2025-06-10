import { initializeApp } from "firebase/app";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: "wivision-1b106.firebaseapp.com",
  projectId: "wivision-1b106",
  storageBucket: "wivision-1b106.appspot.com", // Changed from .firebasestorage.app
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const storage = getStorage(app);

export default storage;