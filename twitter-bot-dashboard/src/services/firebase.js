import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getFunctions } from 'firebase/functions';

// Debug: Check environment variables
console.log('🔧 Firebase Config Check:');
console.log('API Key:', import.meta.env.VITE_FIREBASE_API_KEY ? '✅ Loaded' : '❌ Missing');
console.log('Project ID:', import.meta.env.VITE_FIREBASE_PROJECT_ID ? '✅ Loaded' : '❌ Missing');

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

try {
  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
  
  // Initialize services
  export const db = getFirestore(app);
  export const auth = getAuth(app);
  export const functions = getFunctions(app);
  
  console.log('✅ Firebase initialized successfully');
  console.log('📊 Firestore:', db);
  
} catch (error) {
  console.error('❌ Firebase initialization error:', error);
  // Fallback: Create mock services for development
  export const db = null;
  export const auth = null;
  export const functions = null;
}

export default app;