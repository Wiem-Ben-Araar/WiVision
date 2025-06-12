import { initializeApp } from "firebase/app";
import { getStorage, connectStorageEmulator } from "firebase/storage";

// Configuration Firebase avec validation
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || "wivision-1b106.firebaseapp.com",
  projectId: process.env.FIREBASE_PROJECT_ID || "wivision-1b106",
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "wivision-1b106.appspot.com",
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
};

console.log('🔧 Firebase Config Debug:', {
  apiKey: firebaseConfig.apiKey ? `${firebaseConfig.apiKey.substring(0, 10)}...` : 'MISSING',
  authDomain: firebaseConfig.authDomain,
  projectId: firebaseConfig.projectId,
  storageBucket: firebaseConfig.storageBucket,
  hasMessagingSenderId: !!firebaseConfig.messagingSenderId,
  hasAppId: !!firebaseConfig.appId
});

// Vérifier les variables d'environnement critiques
const requiredEnvVars = ['FIREBASE_API_KEY'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ Variables d\'environnement manquantes:', missingVars);
  throw new Error(`Variables d'environnement manquantes: ${missingVars.join(', ')}`);
}

let app;
let storage;

try {
  console.log('🚀 Initialisation de Firebase...');
  app = initializeApp(firebaseConfig);
  console.log('✅ Firebase App initialisée avec succès');
  
  storage = getStorage(app);
  console.log('✅ Firebase Storage initialisé avec succès');
  console.log('📦 Storage configuré pour le bucket:', firebaseConfig.storageBucket);
  
} catch (error) {
  console.error('❌ Erreur lors de l\'initialisation Firebase:', error);
  throw error;
}

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

// Connecter l'émulateur seulement en développement local
if (useEmulator && !isProduction) {
  try {
    connectStorageEmulator(storage, "localhost", 9199);
    console.log('🔥 Firebase Storage Emulator: ACTIF sur localhost:9199');
  } catch (error) {
    console.error('❌ Erreur émulateur Storage:', error);
    console.log('⚠️ Basculement vers Firebase Storage réel');
  }
} else {
  console.log('🔥 Firebase Storage: Mode PRODUCTION');
  console.log('📍 Bucket utilisé:', firebaseConfig.storageBucket);
}

// Export both storage and config for debugging
export { firebaseConfig };
export default storage;