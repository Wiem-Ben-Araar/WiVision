import { initializeApp } from "firebase/app";
import { getStorage, connectStorageEmulator } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: "localhost",
  projectId: "wivision-1b106",
  storageBucket: "wivision-1b106.appspot.com",
};

const app = initializeApp(firebaseConfig);
const storage = getStorage(app);

// Déterminer l'host en fonction de l'environnement
const isProduction = process.env.NODE_ENV === 'production';
const storageHost = isProduction ? process.env.RENDER_EXTERNAL_URL || 'localhost' : 'localhost';

// Connexion à l'émulateur
if (isProduction && process.env.RENDER_EXTERNAL_URL) {
  // Sur Render, utiliser l'URL publique sans le protocole
  const renderUrl = process.env.RENDER_EXTERNAL_URL.replace('https://', '').replace('http://', '');
  connectStorageEmulator(storage, renderUrl, 9199);
  console.log(`🔥 Firebase Storage Emulator: ACTIF sur ${renderUrl}:9199`);
} else {
  // En local
  connectStorageEmulator(storage, "localhost", 9199);
  console.log('🔥 Firebase Storage Emulator: ACTIF sur localhost:9199');
}

export default storage;