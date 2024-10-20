'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, getAuth, User } from 'firebase/auth';
import { app } from './firebase';
import axios from 'axios';

const auth = getAuth(app);

export interface AuthContextProps {
  user: User | null;
  loading: boolean;
  userProfile: any | null;
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
  const [userProfile, setUserProfile] = useState<any | null>(null);

  const createStripeCustomer = async (token: string) => {
    try {
      const response = await axios.post('https://dolphin-app-49eto.ondigitalocean.app/backend/create-stripe-customer', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data.customer_id;
    } catch (error) {
      console.error('Error creating Stripe customer:', error);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      setLoading(false);
      if (user) {
        const token = await user.getIdToken();
        try {
          const response = await axios.get('https://dolphin-app-49eto.ondigitalocean.app/backend/user/profile', {
            headers: { Authorization: `Bearer ${token}` }
          });
          setUserProfile(response.data);
          if (!response.data.stripe_customer_id) {
            await createStripeCustomer(token);
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
        }
      } else {
        setUserProfile(null);
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, userProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
