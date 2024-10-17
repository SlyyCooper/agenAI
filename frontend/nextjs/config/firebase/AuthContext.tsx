'use client'; // Indicates that this is a client-side component

// Import necessary dependencies and functions
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase'; // Importing auth instance from firebase.ts
import { getUserProfile, createUserProfile, updateUserProfile } from './backendService'; // Importing user profile functions from backendService.ts

// Define the shape of the AuthContext
// This interface describes the structure of the authentication context
interface AuthContextType {
  user: User | null; // The current Firebase user object or null if not authenticated
  userProfile: any | null; // The user's profile data from the backend or null
  loading: boolean; // Indicates whether the authentication state is still being determined
  setUserProfile: (profile: any) => void; // Function to update the user profile
}

// Create the AuthContext with default values
// This context will be used to share authentication state across components
const AuthContext = createContext<AuthContextType>({ user: null, userProfile: null, loading: true, setUserProfile: () => {} });

// Custom hook to use the AuthContext
// This allows easy access to the auth context in any component
export const useAuth = () => useContext(AuthContext);

// AuthProvider component to wrap the app and provide authentication context
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // State to hold the current user, user profile, and loading status
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Subscribe to auth state changes using Firebase's onAuthStateChanged
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser); // Update the user state with the current Firebase user
      if (firebaseUser) {
        try {
          // Fetch user profile from backend using function from backendService.ts
          const { data: profile } = await getUserProfile(firebaseUser.uid);
          if (!profile) {
            // If profile doesn't exist, create a new one using backendService.ts function
            const newProfile = {
              name: firebaseUser.displayName || '',
              email: firebaseUser.email || '',
              createdAt: new Date().toISOString(),
              lastLoginAt: new Date().toISOString(),
            };
            await createUserProfile(firebaseUser.uid, newProfile);
            setUserProfile(newProfile);
          } else {
            // If profile exists, update last login time using backendService.ts function
            await updateUserProfile(firebaseUser.uid, { lastLoginAt: new Date().toISOString() });
            setUserProfile(profile);
          }
        } catch (error) {
          console.error('Error fetching/updating user profile:', error);
        }
      } else {
        // If no user is logged in, set userProfile to null
        setUserProfile(null);
      }
      // Set loading to false once auth state is determined
      setLoading(false);
    });

    // Cleanup function to unsubscribe from auth state changes
    return () => unsubscribe();
  }, []); // Empty dependency array means this effect runs once on mount

  // Provide the auth context to child components
  // This makes the auth state and functions available to all child components
  return (
    <AuthContext.Provider value={{ user, userProfile, loading, setUserProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

// Note: This file interacts with:
// 1. firebase.ts: It uses the 'auth' instance to listen for authentication state changes.
// 2. backendService.ts: It uses functions like getUserProfile, createUserProfile, and updateUserProfile
//    to manage user profiles in the backend.
// 3. While this file doesn't directly interact with get-stripejs.ts, the auth context it provides
//    is likely used in components that handle payments, where Stripe functionality is needed.
