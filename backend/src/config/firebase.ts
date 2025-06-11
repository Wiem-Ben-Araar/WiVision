// firebase.config.ts
import { initializeApp } from "firebase/app";
import { getStorage, connectStorageEmulator } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.NODE_ENV === 'production' 
    ? "wivision-1b106.firebaseapp.com"  // Production
    : "localhost",                       // Development
  projectId: "wivision-1b106",
  storageBucket: "wivision-1b106.appspot.com",
};

const app = initializeApp(firebaseConfig);
const storage = getStorage(app);

// 🔥 CONDITION CRITIQUE : Émulateur SEULEMENT en développement
if (process.env.NODE_ENV !== 'production') {
  try {
    connectStorageEmulator(storage, "127.0.0.1", 9199);
    console.log('🔥 Firebase Storage Emulator: ACTIF (Development)');
  } catch (error) {
    console.warn('⚠️ Émulateur déjà connecté ou erreur:', error);
  }
} else {
  console.log('🚀 Firebase Storage: PRODUCTION MODE');
}

export default storage;