import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFunctions } from 'firebase/functions';

// Enhanced Firebase initialization with proper environment checks
const initializeFirebase = () => {
  // Check if we're in a browser environment
  if (typeof window === 'undefined') {
    console.log('🔧 Firebase: Server-side environment detected, skipping initialization');
    return {
      app: null,
      db: null,
      auth: null,
      functions: null,
      googleProvider: null,
      isInitialized: false,
      error: 'Server-side environment'
    };
  }

  // Validate environment variables
  const requiredEnvVars = {
    VITE_FIREBASE_API_KEY: import.meta.env.VITE_FIREBASE_API_KEY,
    VITE_FIREBASE_PROJECT_ID: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    VITE_FIREBASE_APP_ID: import.meta.env.VITE_FIREBASE_APP_ID
  };

  const missingVars = Object.entries(requiredEnvVars)
    .filter(([key, value]) => !value)
    .map(([key]) => key);

  if (missingVars.length > 0) {
    console.error('❌ Firebase: Missing required environment variables:', missingVars);
    return {
      app: null,
      db: null,
      auth: null,
      functions: null,
      googleProvider: null,
      isInitialized: false,
      error: `Missing environment variables: ${missingVars.join(', ')}`
    };
  }

  console.log('🔧 Firebase Config Check:');
  console.log('API Key:', import.meta.env.VITE_FIREBASE_API_KEY ? '✅ Loaded' : '❌ Missing');
  console.log('Project ID:', import.meta.env.VITE_FIREBASE_PROJECT_ID ? '✅ Loaded' : '❌ Missing');
  console.log('App ID:', import.meta.env.VITE_FIREBASE_APP_ID ? '✅ Loaded' : '❌ Missing');

  const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY?.trim(),
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN?.trim(),
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID?.trim(),
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET?.trim(),
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID?.trim(),
    appId: import.meta.env.VITE_FIREBASE_APP_ID?.trim()
  };

  // Validate config structure
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId || !firebaseConfig.appId) {
    const error = 'Invalid Firebase configuration: missing required fields';
    console.error('❌ Firebase:', error);
    return {
      app: null,
      db: null,
      auth: null,
      functions: null,
      googleProvider: null,
      isInitialized: false,
      error
    };
  }

  try {
    // Check if Firebase is already initialized
    if (typeof window !== 'undefined' && window._firebaseApp) {
      console.log('🔄 Firebase: Reusing existing Firebase app instance');
      return window._firebaseApp;
    }

    console.log('🚀 Firebase: Initializing Firebase services...');
    
    // Initialize Firebase app
    const app = initializeApp(firebaseConfig);
    
    // Initialize Firebase services with error handling for each
    let db, auth, functions, googleProvider;
    
    try {
      db = getFirestore(app);
      console.log('✅ Firestore initialized');
    } catch (dbError) {
      console.error('❌ Firestore initialization failed:', dbError);
      db = null;
    }
    
    try {
      auth = getAuth(app);
      // Configure auth settings
      auth.useDeviceLanguage();
      console.log('✅ Authentication initialized');
    } catch (authError) {
      console.error('❌ Authentication initialization failed:', authError);
      auth = null;
    }
    
    try {
      functions = getFunctions(app);
      // Optional: Configure functions region
      // functions = getFunctions(app, 'us-central1');
      console.log('✅ Cloud Functions initialized');
    } catch (functionsError) {
      console.error('❌ Cloud Functions initialization failed:', functionsError);
      functions = null;
    }
    
    try {
      googleProvider = new GoogleAuthProvider();
      // Add scopes if needed
      googleProvider.addScope('https://www.googleapis.com/auth/userinfo.email');
      googleProvider.addScope('https://www.googleapis.com/auth/userinfo.profile');
      console.log('✅ Google Auth Provider initialized');
    } catch (providerError) {
      console.error('❌ Google Auth Provider initialization failed:', providerError);
      googleProvider = null;
    }

    const firebaseInstance = {
      app,
      db,
      auth,
      functions,
      googleProvider,
      isInitialized: true,
      error: null
    };

    // Store instance globally to prevent re-initialization
    if (typeof window !== 'undefined') {
      window._firebaseApp = firebaseInstance;
    }

    console.log('🎉 Firebase initialization completed successfully');
    return firebaseInstance;

  } catch (error) {
    console.error('❌ Firebase initialization failed:', error);
    
    // Provide more specific error messages
    let errorMessage = 'Unknown initialization error';
    
    if (error.code === 'app/duplicate-app') {
      errorMessage = 'Firebase app already initialized. Using existing instance.';
      console.warn('⚠️', errorMessage);
      
      // Try to get existing app
      try {
        const existingApp = getApp();
        return {
          app: existingApp,
          db: getFirestore(existingApp),
          auth: getAuth(existingApp),
          functions: getFunctions(existingApp),
          googleProvider: new GoogleAuthProvider(),
          isInitialized: true,
          error: null
        };
      } catch (recoveryError) {
        errorMessage = 'Failed to recover existing Firebase app';
      }
    } else if (error.message.includes('invalid config')) {
      errorMessage = 'Invalid Firebase configuration. Please check your environment variables.';
    } else if (error.message.includes('network') || error.message.includes('fetch')) {
      errorMessage = 'Network error during Firebase initialization. Please check your internet connection.';
    } else {
      errorMessage = error.message || 'Firebase initialization failed';
    }

    return {
      app: null,
      db: null,
      auth: null,
      functions: null,
      googleProvider: null,
      isInitialized: false,
      error: errorMessage
    };
  }
};

// Initialize Firebase
const firebase = initializeFirebase();

// Export individual services with fallbacks
export const { 
  app, 
  db, 
  auth, 
  functions, 
  googleProvider 
} = firebase;

// Export initialization status
export const isFirebaseInitialized = firebase.isInitialized;
export const firebaseError = firebase.error;

// Utility function to check Firebase status
export const getFirebaseStatus = () => ({
  isInitialized: firebase.isInitialized,
  error: firebase.error,
  services: {
    app: !!firebase.app,
    firestore: !!firebase.db,
    auth: !!firebase.auth,
    functions: !!firebase.functions,
    googleProvider: !!firebase.googleProvider
  }
});

// Utility function to safely use Firebase services
export const withFirebase = (callback, fallback = null) => {
  if (!firebase.isInitialized) {
    console.warn('⚠️ Firebase not initialized, using fallback');
    return typeof fallback === 'function' ? fallback() : fallback;
  }
  
  try {
    return callback(firebase);
  } catch (error) {
    console.error('❌ Firebase operation failed:', error);
    return typeof fallback === 'function' ? fallback() : fallback;
  }
};

// Re-export for backward compatibility
export default firebase.app;