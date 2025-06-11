import { initializeApp } from "firebase/app";
import { getStorage, connectStorageEmulator } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: "localhost", // Toujours localhost pour l'émulateur
  projectId: "wivision-1b106",
  storageBucket: "wivision-1b106.appspot.com",
};

const app = initializeApp(firebaseConfig);
const storage = getStorage(app);

// Connexion à l'émulateur - TOUJOURS ACTIVE
connectStorageEmulator(storage, "127.0.0.1", 9199);
console.log('🔥 Firebase Storage Emulator: ACTIF (en mode production)');

export default storage;