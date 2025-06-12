import { initializeApp } from "firebase/app";
import { getStorage, connectStorageEmulator } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: "localhost",
  projectId: "wivision-1b106",
  storageBucket: "wivision-1b106.appspot.com",
};

// Enhanced logging function
const logDebug = (message: string, data?: any) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] 🔧 FIREBASE DEBUG: ${message}`);
  if (data) {
    console.log(`[${timestamp}] 📊 DATA:`, JSON.stringify(data, null, 2));
  }
};

const logError = (message: string, error?: any) => {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] ❌ FIREBASE ERROR: ${message}`);
  if (error) {
    console.error(`[${timestamp}] 🚨 ERROR DETAILS:`, {
      message: error.message,
      code: error.code,
      stack: error.stack,
      customData: error.customData
    });
  }
};

const logSuccess = (message: string, data?: any) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ✅ FIREBASE SUCCESS: ${message}`);
  if (data) {
    console.log(`[${timestamp}] 📈 SUCCESS DATA:`, data);
  }
};

// Initialize Firebase App
logDebug("Initializing Firebase App", firebaseConfig);
const app = initializeApp(firebaseConfig);
logSuccess("Firebase App initialized");

// Initialize Storage
logDebug("Initializing Firebase Storage");
const storage = getStorage(app);
logSuccess("Firebase Storage initialized");

// Environment detection with detailed logging
const isProduction = process.env.NODE_ENV === 'production';
const isRender = process.env.RENDER === 'true' || process.env.RENDER_EXTERNAL_URL;
const useEmulator = process.env.USE_FIREBASE_EMULATOR === 'true';

const envDebugInfo = {
  NODE_ENV: process.env.NODE_ENV,
  RENDER: process.env.RENDER,
  RENDER_EXTERNAL_URL: process.env.RENDER_EXTERNAL_URL,
  USE_FIREBASE_EMULATOR: process.env.USE_FIREBASE_EMULATOR,
  FIREBASE_API_KEY: process.env.FIREBASE_API_KEY ? '***SET***' : 'NOT_SET',
  isProduction,
  isRender,
  useEmulator,
  timestamp: new Date().toISOString()
};

logDebug("Environment Analysis", envDebugInfo);

// Firebase Storage Rules Check
const checkStorageRules = () => {
  logDebug("Firebase Storage Rules Reminder", {
    message: "Ensure your storage.rules allow read/write access",
    suggestedRules: `
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if true; // For development only
    }
  }
}`,
    productionNote: "Use proper authentication rules in production"
  });
};

// Emulator connection with enhanced error handling
if (useEmulator) {
  logDebug("Attempting to connect to Firebase Storage Emulator");
  try {
    connectStorageEmulator(storage, "localhost", 9199);
    logSuccess("Firebase Storage Emulator connected", {
      host: "localhost",
      port: 9199,
      note: "Make sure emulator is running: firebase emulators:start"
    });
  } catch (error) {
    logError("Failed to connect to Firebase Storage Emulator", error);
    logDebug("Emulator Connection Troubleshooting", {
      steps: [
        "1. Check if Firebase emulator is running",
        "2. Verify port 9199 is available",
        "3. Check firebase.json configuration",
        "4. Ensure firebaserc is properly configured"
      ],
      fallback: "Switching to production Firebase Storage"
    });
  }
} else {
  logSuccess("Using Production Firebase Storage", {
    bucket: firebaseConfig.storageBucket,
    freeQuota: "5GB storage, 1GB/day download, 20K/day uploads",
    billingNote: "Free tier should be sufficient for most use cases"
  });
  checkStorageRules();
}

// Storage configuration validation
const validateStorageConfig = () => {
  logDebug("Validating Storage Configuration");
  
  const validations = {
    apiKey: !!process.env.FIREBASE_API_KEY,
    projectId: !!firebaseConfig.projectId,
    storageBucket: !!firebaseConfig.storageBucket,
    bucketFormat: firebaseConfig.storageBucket?.includes('.appspot.com')
  };
  
  logDebug("Configuration Validation Results", validations);
  
  const issues = [];
  if (!validations.apiKey) issues.push("FIREBASE_API_KEY not set");
  if (!validations.projectId) issues.push("Project ID missing");
  if (!validations.storageBucket) issues.push("Storage bucket missing");
  if (!validations.bucketFormat) issues.push("Storage bucket format incorrect");
  
  if (issues.length > 0) {
    logError("Configuration Issues Found", { issues });
  } else {
    logSuccess("Configuration validation passed");
  }
  
  return issues.length === 0;
};

// Run validation
validateStorageConfig();

export default storage;
export { logDebug, logError, logSuccess };
