'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, getAuth, User } from 'firebase/auth';
import { app } from './firebase';
import axios, { AxiosError } from 'axios';

const auth = getAuth(app);

// Add base URL constant
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

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

  // Add token refresh
  useEffect(() => {
    let tokenRefreshInterval: NodeJS.Timeout;
    
    const setupTokenRefresh = async (user: User) => {
      // Refresh token every 30 minutes
      tokenRefreshInterval = setInterval(async () => {
        try {
          await user.getIdToken(true); // Force token refresh
          console.log('🔄 Token refreshed');
        } catch (error) {
          console.error('🚨 Token refresh failed:', error);
        }
      }, 30 * 60 * 1000);
    };

    const cleanup = () => {
      if (tokenRefreshInterval) {
        clearInterval(tokenRefreshInterval);
      }
    };

    if (user) {
      setupTokenRefresh(user);
    }

    return cleanup;
  }, [user]);

  useEffect(() => {
    console.log('🔄 Setting up auth state listener');
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        console.log('👤 Auth state changed:', user ? `User ${user.uid}` : 'No user');
        setUser(user);
        
        if (user) {
          console.log('🎫 Getting Firebase token...');
          const token = await user.getIdToken();
          console.log('🔑 Token obtained, fetching user profile...');
          
          const response = await axios.get<UserProfile>(`${BASE_URL}/api/user/profile`, {
            headers: { 
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            }
          });
          
          console.log('📋 User profile received:', response.data);
          setUserProfile(response.data);
          setError(undefined);
        } else {
          console.log('❌ No user, clearing profile');
          setUserProfile(null);
        }
      } catch (error) {
        console.error('🚨 Auth state change error:', error);
        setUserProfile(null);
        if (error instanceof AxiosError) {
          const errorMsg = error.response?.data?.message || 'Failed to fetch user profile';
          console.error('🚨 API Error:', errorMsg);
          setError(errorMsg);
        } else {
          console.error('🚨 Unexpected error:', error);
          setError('An unexpected error occurred');
        }
      } finally {
        console.log('✅ Auth state update complete');
        setLoading(false);
      }
    });

    return () => {
      console.log('🧹 Cleaning up auth state listener');
      unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, userProfile, error }}>
      {children}
    </AuthContext.Provider>
  );
};
