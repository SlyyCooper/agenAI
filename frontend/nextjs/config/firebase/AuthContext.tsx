'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, getAuth, User } from 'firebase/auth';
import { app } from './firebase';
import axios, { AxiosError } from 'axios';

const auth = getAuth(app);

// Add base URL constant
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://dolphin-app-49eto.ondigitalocean.app/backend';

interface UserProfile {
  email: string;
  name?: string;
  stripe_customer_id?: string;
  has_access: boolean;
  one_time_purchase: boolean;
  tokens: number;
  token_history?: Array<{
    amount: number;
    type: string;
    timestamp: Date;
  }>;
}

export interface AuthContextProps {
  user: User | null;
  loading: boolean;
  userProfile: UserProfile | null;
  error?: string;
}

const AuthContext = createContext<AuthContextProps>({
  user: null,
  loading: true,
  userProfile: null,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [error, setError] = useState<string>();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        setUser(user);
        if (user) {
          const token = await user.getIdToken();
          const response = await axios.get<UserProfile>(`${BASE_URL}/api/user/profile`, {
            headers: { 
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            }
          });
          setUserProfile(response.data);
          setError(undefined);
        } else {
          setUserProfile(null);
        }
      } catch (error) {
        console.error('Auth state change error:', error);
        setUserProfile(null);
        if (error instanceof AxiosError) {
          setError(error.response?.data?.message || 'Failed to fetch user profile');
        } else {
          setError('An unexpected error occurred');
        }
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, userProfile, error }}>
      {children}
    </AuthContext.Provider>
  );
};
