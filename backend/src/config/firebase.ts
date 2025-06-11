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

console.log('🔧 Environment Debug:', {
  NODE_ENV: process.env.NODE_ENV,
  RENDER: process.env.RENDER,
  RENDER_EXTERNAL_URL: process.env.RENDER_EXTERNAL_URL,
  isProduction,
  isRender
});

// IMPORTANT: Firebase Storage emulator MUST always connect to localhost
// even in production environments like Render, because the emulator
// runs in the same container as your application
try {
  connectStorageEmulator(storage, "localhost", 9199);
  
  if (isRender) {
    console.log('🔥 Firebase Storage Emulator: ACTIF sur localhost:9199 (Render Production)');
  } else if (isProduction) {
    console.log('🔥 Firebase Storage Emulator: ACTIF sur localhost:9199 (Production)');
  } else {
    console.log('🔥 Firebase Storage Emulator: ACTIF sur localhost:9199 (Development)');
  }
} catch (error) {
  console.error('❌ Erreur lors de la connexion à l\'émulateur Storage:', error);
  console.log('⚠️ L\'application continuera avec Firebase Storage réel');
}

export default storage;