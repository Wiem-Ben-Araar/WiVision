import { initializeApp } from "firebase/app";
import { getStorage, connectStorageEmulator } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NODE_ENV === "production" 
    ? "wivision-1b106.firebaseapp.com" 
    : "localhost",
  projectId: "wivision-1b106",
 // storageBucket: "wivision-1b106.appspot.com",
};

const app = initializeApp(firebaseConfig);
const storage = getStorage(app);

if (process.env.NODE_ENV === "development" && typeof window !== "undefined") {
  connectStorageEmulator(storage, "127.0.0.1", 4001);
  console.log('🔥 Firebase Storage Emulator: ACTIF');
}

export default storage;
