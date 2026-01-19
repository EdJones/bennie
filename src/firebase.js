import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'

// Helper function to safely get and trim environment variables
function getEnvVar(key) {
  const value = import.meta.env[key]
  return value ? String(value).trim() : undefined
}

const firebaseConfig = {
  apiKey: getEnvVar('VITE_FIREBASE_API_KEY'),
  authDomain: getEnvVar('VITE_FIREBASE_AUTH_DOMAIN'),
  projectId: getEnvVar('VITE_FIREBASE_PROJECT_ID'),
  storageBucket: getEnvVar('VITE_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: getEnvVar('VITE_FIREBASE_MESSAGING_SENDER_ID'),
  appId: getEnvVar('VITE_FIREBASE_APP_ID')
}

// Validate configuration in development
if (import.meta.env.DEV) {
  const missing = Object.entries(firebaseConfig)
    .filter(([key, value]) => !value)
    .map(([key]) => key)

  if (missing.length > 0) {
    console.warn('Missing Firebase config values:', missing)
  }

  // Check for newlines in critical values
  if (firebaseConfig.authDomain && firebaseConfig.authDomain.includes('\n')) {
    console.warn('authDomain contains newlines! This will cause iframe errors.')
  }
  if (firebaseConfig.apiKey && firebaseConfig.apiKey.includes('\n')) {
    console.warn('apiKey contains newlines! This will cause iframe errors.')
  }
}

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)
export const auth = getAuth(app)
export const googleProvider = new GoogleAuthProvider()
