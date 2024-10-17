// Import necessary functions from Firebase SDK
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Firebase configuration object
// These values are fetched from environment variables for security
// This configuration is crucial for connecting to the correct Firebase project
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!, // API key for Firebase project
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!, // Auth domain for Firebase project
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!, // Project ID for Firebase project
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!, // Storage bucket for Firebase project
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!, // Messaging sender ID for Firebase project
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!, // App ID for Firebase project
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID!, // Measurement ID for Firebase Analytics
};

// Initialize Firebase app
// This checks if an app is already initialized. If not, it initializes a new one.
// This prevents re-initialization errors in Next.js with hot reloading.
// The initialized app is used across the entire application for Firebase services
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Get Auth instance
// This creates an instance of Firebase Authentication tied to our app
// This auth instance is used in AuthContext.tsx for managing user authentication state
// It's also used in backendService.ts for getting user tokens for API requests
const auth = getAuth(app);

// Get Firestore instance
// This creates an instance of Firestore (Firebase's NoSQL database) tied to our app
// While not directly used in the provided context, it's available for database operations if needed
const db = getFirestore(app);

// Export the Firebase app, auth, and db instances for use in other parts of the application
// app: Used for general Firebase configuration
// auth: Used in AuthContext.tsx for authentication state management
// auth: Also used in backendService.ts for getting user tokens
// db: Available for Firestore operations (not directly used in the provided context)
export { app, auth, db };

// Note: This file doesn't directly interact with get-stripejs.ts, but the Firebase
// configuration set up here is crucial for the overall application, including
// parts that may involve Stripe payments.
