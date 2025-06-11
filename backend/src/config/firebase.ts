import { initializeApp } from "firebase/app";
import { getStorage, connectStorageEmulator } from "firebase/storage";

// Configuration dynamique pour les différents environnements
const firebaseConfig = process.env.NODE_ENV === 'production' ? {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: "wivision-1b106.firebaseapp.com",
  projectId: "wivision-1b106",
  storageBucket: "wivision-1b106.appspot.com",
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
} : {
  projectId: "wivision-emulator",
  storageBucket: "wivision-emulator.appspot.com",
  apiKey: "emulator-api-key",
};

const app = initializeApp(firebaseConfig);
const storage = getStorage(app);

// Connexion à l'émulateur en développement
if (process.env.NODE_ENV !== 'production' || process.env.USE_FIREBASE_EMULATOR === 'true') {
  try {
    connectStorageEmulator(storage, '127.0.0.1', 9199);
    console.log('🔥 Firebase Storage Emulator connected on 127.0.0.1:9199');
  } catch (error) {
    console.error('⚠️ Failed to connect to Firebase Storage Emulator:', error);
  }
} else {
  console.log('🚀 Using production Firebase Storage');
}

export default storage;