import { initializeApp } from "firebase/app";
import { getStorage, connectStorageEmulator } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.NODE_ENV === 'production' 
    ? "wivision-1b106.firebaseapp.com" 
    : "localhost",
  projectId: "wivision-1b106",
  storageBucket: "wivision-1b106.appspot.com",
};

const app = initializeApp(firebaseConfig);
const storage = getStorage(app);

// Toujours connecter à l'émulateur
connectStorageEmulator(storage, "127.0.0.1", 9199);
console.log('🔥 Firebase Storage Emulator: ACTIF');

export default storage;