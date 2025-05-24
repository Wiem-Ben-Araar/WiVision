// firebase.config.ts
import { initializeApp } from "firebase/app";
import { getStorage, connectStorageEmulator } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: "localhost", // Forcé pour l'émulateur
  projectId: "plateforme-bim-c779e",
  storageBucket: "plateforme-bim-c779e.appspot.com",
};

const app = initializeApp(firebaseConfig);
const storage = getStorage(app);

connectStorageEmulator(storage, "127.0.0.1", 4001); // Connexion directe
console.log('🔥 Firebase Storage Emulator: ACTIF');

export default storage;