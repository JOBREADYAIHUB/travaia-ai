// firebaseConfig.ts
// @google/genai: Use type import for FirebaseApp
// FIx: Import FirebaseApp, initializeApp, getApp, getApps from firebase/app
// Corrected import for initializeApp, getApp, getApps from firebase/app
// Firebase v9+ uses named exports directly from 'firebase/app'
import { initializeApp, getApp, getApps } from 'firebase/app';
import type { FirebaseApp } from 'firebase/app';
// Corrected import for FirebaseApp type
// import type { FirebaseApp } from 'firebase/app'; // This was duplicated and type is now directly imported
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import type { Auth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import type { FirebaseStorage } from 'firebase/storage';

// IMPORTANT: This configuration is now loaded from environment variables
// for enhanced security. Ensure you have a .env.local file.

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp(); // Get default app if already initialized
}

// Initialize Firebase services immediately
const auth: Auth = getAuth(app);
const db: Firestore = getFirestore(app);
const storage: FirebaseStorage = getStorage(app);

// Enhanced security: Configure authentication persistence
// Use browserLocalPersistence but with additional security settings
const secureAuth = async () => {
  try {
    // Set persistence to local to allow for refresh without losing auth state
    // This ensures that auth state persists across page reloads
    await setPersistence(auth, browserLocalPersistence);
    
    // Configure auth state persistence and additional settings
    auth.useDeviceLanguage();
    
    // Enable token auto-refresh to prevent sessions from expiring
    // This helps when users reload pages in document manager
    auth.onIdTokenChanged((user) => {
      if (user) {
        // Save the authentication state in localStorage for better persistence
        localStorage.setItem('auth_initialized', 'true');
        localStorage.setItem('last_auth_time', Date.now().toString());
      }
    });
    
    console.log('Secure auth persistence configured with enhanced settings');
  } catch (error) {
    console.error('Error configuring auth persistence:', error);
  }
};

// Execute secure auth configuration
secureAuth();

export { app, auth, db, storage };
