import { initializeApp } from "firebase/app";
import { getStorage, connectStorageEmulator } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NODE_ENV === "production" 
    ? "plateforme-bim-c779e.firebaseapp.com" // Production
    : "localhost", // Développement
  projectId: "plateforme-bim-c779e",
  storageBucket: "plateforme-bim-c779e.appspot.com",
};

const app = initializeApp(firebaseConfig);
const storage = getStorage(app);

// Connexion émulateur SEULEMENT en développement
if (process.env.NODE_ENV !== "production") {
  connectStorageEmulator(storage, "127.0.0.1", 4001);
  console.log('🔥 Firebase Storage Emulator: ACTIF');
}

export default storage;