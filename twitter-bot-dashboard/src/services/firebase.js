import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider } from 'firebase/auth'; // Add GoogleAuthProvider
import { getFunctions } from 'firebase/functions';

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

// Initialize variables
let app;
let db;
let auth;
let functions;
let googleProvider; // Add Google provider

try {
  // Initialize Firebase
  app = initializeApp(firebaseConfig);
  
  // Initialize services
  db = getFirestore(app);
  auth = getAuth(app);
  functions = getFunctions(app);
  googleProvider = new GoogleAuthProvider(); // Initialize Google provider
  
  console.log('✅ Firebase initialized successfully');
  
} catch (error) {
  console.error('❌ Firebase initialization error:', error);
  // Fallback
  db = null;
  auth = null;
  functions = null;
  app = null;
  googleProvider = null;
}

// Export everything
export { db, auth, functions, googleProvider };
export default app;