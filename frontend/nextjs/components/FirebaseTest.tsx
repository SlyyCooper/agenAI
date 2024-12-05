'use client';

import { useState } from 'react';
import { useFirebase } from '../hooks/useFirebase';
import { useAuth } from '../config/firebase/AuthContext';

export default function FirebaseTest() {
  const { signIn, signUp, logout } = useFirebase();
  const { user, userProfile, error } = useAuth();
  const [testEmail] = useState('test@example.com');
  const [testPassword] = useState('Test123!');

  const handleSignUp = async () => {
    try {
      await signUp(testEmail, testPassword, 'Test User');
      console.log('Sign up successful');
    } catch (error) {
      console.error('Sign up failed:', error);
    }
  };

  const handleSignIn = async () => {
    try {
      await signIn(testEmail, testPassword);
      console.log('Sign in successful');
    } catch (error) {
      console.error('Sign in failed:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      console.log('Logout successful');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Firebase Configuration Test</h2>
      
      <div className="space-y-4">
        <div>
          <p>Current User: {user ? user.email : 'Not signed in'}</p>
          <p>User Profile: {userProfile ? 'Loaded' : 'Not loaded'}</p>
          {error && <p className="text-red-500">Error: {error}</p>}
        </div>

        <div className="space-x-4">
          <button
            onClick={handleSignUp}
            className="bg-green-500 text-white px-4 py-2 rounded"
          >
            Test Sign Up
          </button>
          
          <button
            onClick={handleSignIn}
            className="bg-blue-500 text-white px-4 py-2 rounded"
          >
            Test Sign In
          </button>
          
          <button
            onClick={handleLogout}
            className="bg-red-500 text-white px-4 py-2 rounded"
          >
            Test Logout
          </button>
        </div>
      </div>
    </div>
  );
} 