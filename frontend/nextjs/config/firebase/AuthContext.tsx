'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';
import { getUserProfile, createUserProfile, updateUserProfile } from './backendService';

interface AuthContextType {
  user: User | null;
  userProfile: any | null;
  loading: boolean;
  setUserProfile: (profile: any) => void;
}

const AuthContext = createContext<AuthContextType>({ user: null, userProfile: null, loading: true, setUserProfile: () => {} });

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          const { data: profile } = await getUserProfile(firebaseUser.uid);
          if (!profile) {
            const newProfile = {
              name: firebaseUser.displayName || '',
              email: firebaseUser.email || '',
              createdAt: new Date().toISOString(),
              lastLoginAt: new Date().toISOString(),
            };
            await createUserProfile(firebaseUser.uid, newProfile);
            setUserProfile(newProfile);
          } else {
            await updateUserProfile(firebaseUser.uid, { lastLoginAt: new Date().toISOString() });
            setUserProfile(profile);
          }
        } catch (error) {
          console.error('Error fetching/updating user profile:', error);
        }
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, userProfile, loading, setUserProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
