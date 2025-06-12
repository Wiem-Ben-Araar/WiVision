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

// Déterminer l'environnement
const isProduction = process.env.NODE_ENV === 'production';
const isRender = process.env.RENDER === 'true' || process.env.RENDER_EXTERNAL_URL;
const useEmulator = process.env.USE_FIREBASE_EMULATOR === 'true';

console.log('🔧 Environment Debug:', {
  NODE_ENV: process.env.NODE_ENV,
  RENDER: process.env.RENDER,
  RENDER_EXTERNAL_URL: process.env.RENDER_EXTERNAL_URL,
  USE_FIREBASE_EMULATOR: process.env.USE_FIREBASE_EMULATOR,
  isProduction,
  isRender,
  useEmulator
});

// Utiliser l'émulateur seulement si explicitement demandé
// Sinon utiliser le Storage réel gratuit de Firebase
if (useEmulator) {
  try {
    connectStorageEmulator(storage, "localhost", 9199);
    console.log('🔥 Firebase Storage Emulator: ACTIF sur localhost:9199');
  } catch (error) {
    console.error('❌ Erreur lors de la connexion à l\'émulateur Storage:', error);
    console.log('⚠️ Basculement vers Firebase Storage réel');
  }
} else {
  console.log('🔥 Firebase Storage: Mode PRODUCTION (gratuit jusqu\'à 5GB)');
}

export default storage;