import { initializeApp } from 'firebase/app';
import { getStorage } from 'firebase/storage';

// Check if Firebase is properly configured
const isFirebaseConfigured = !!(
  import.meta.env.REACT_APP_FIREBASE_API_KEY &&
  import.meta.env.REACT_APP_FIREBASE_PROJECT_ID &&
  import.meta.env.REACT_APP_FIREBASE_STORAGE_BUCKET
);

console.log('🔥 Firebase Configuration Status:', {
  isConfigured: isFirebaseConfigured,
  apiKey: import.meta.env.REACT_APP_FIREBASE_API_KEY ? '✅ Set' : '❌ Missing',
  projectId: import.meta.env.REACT_APP_FIREBASE_PROJECT_ID ? '✅ Set' : '❌ Missing',
  storageBucket: import.meta.env.REACT_APP_FIREBASE_STORAGE_BUCKET ? '✅ Set' : '❌ Missing'
});

// Firebase configuration - replace with your actual Firebase config
// You can get these from Firebase Console > Project Settings > General > Your apps
const firebaseConfig = {
  apiKey: import.meta.env.REACT_APP_FIREBASE_API_KEY || "demo-api-key",
  authDomain: import.meta.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "demo-project.firebaseapp.com",
  projectId: import.meta.env.REACT_APP_FIREBASE_PROJECT_ID || "demo-project-id",
  storageBucket: import.meta.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "demo-project.appspot.com",
  messagingSenderId: import.meta.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "123456789",
  appId: import.meta.env.REACT_APP_FIREBASE_APP_ID || "demo-app-id"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Storage
export const storage = getStorage(app);

export { isFirebaseConfigured };
export default app;
