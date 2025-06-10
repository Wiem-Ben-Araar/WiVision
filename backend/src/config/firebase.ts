import { initializeApp } from "firebase/app";
import { getStorage, connectStorageEmulator } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: "wivision-1b106.firebaseapp.com",
  projectId: "wivision-1b106",
  storageBucket: "wivision-1b106.appspot.com",
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const storage = getStorage(app);

// Connexion à l'émulateur Storage en développement
if (process.env.NODE_ENV === 'development' || process.env.USE_FIREBASE_EMULATOR === 'true') {
  try {
    // Connecter à l'émulateur Storage (port par défaut: 9199)
    connectStorageEmulator(storage, 'localhost', 9199);
    console.log('🔥 Firebase Storage Emulator connected on localhost:9199');
  } catch (error) {
    console.warn('⚠️ Firebase Storage Emulator connection failed:', error);
  }
}

export default storage;