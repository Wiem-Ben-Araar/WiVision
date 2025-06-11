// firebase.config.ts
import { initializeApp } from "firebase/app";
import { getStorage, connectStorageEmulator } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: "wivision-1b106.firebaseapp.com",
  projectId: "wivision-1b106",
  storageBucket: "wivision-1b106.appspot.com",
};

const app = initializeApp(firebaseConfig);
const storage = getStorage(app);

// IMPORTANT: Émulateur SEULEMENT en développement local
if (process.env.NODE_ENV === 'development' && process.env.USE_FIREBASE_EMULATOR === 'true') {
  try {
    connectStorageEmulator(storage, "127.0.0.1", 9199);
    console.log('🔥 Firebase Storage Emulator: ACTIF (Development)');
  } catch (error) {
    console.warn('⚠️ Émulateur Firebase non disponible:', error);
  }
} else {
  console.log('🔥 Firebase Storage: Production Mode - Connexion directe à Firebase');
}

export default storage;