'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/config/firebase/AuthContext';
import { User, LogIn, LogOut } from 'lucide-react';
import { auth } from '@/config/firebase/firebase';
import { signOut } from 'firebase/auth';

const UserProfileButton: React.FC = () => {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  if (loading) {
    return <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse"></div>;
  }

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (!user) {
    return (
      <button
        onClick={() => router.push('/login')}
        className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
      >
        <LogIn className="w-5 h-5 mr-1" />
        Login
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
      >
        {user.photoURL ? (
          <img src={user.photoURL} alt="Profile" className="w-8 h-8 rounded-full mr-2" />
        ) : (
          <User className="w-5 h-5 mr-1" />
        )}
        {user.displayName || 'Profile'}
      </button>
      {isMenuOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10">
          <button
            onClick={() => {
              setIsMenuOpen(false);
              router.push('/profile');
            }}
            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            Profile
          </button>
          <button
            onClick={() => {
              setIsMenuOpen(false);
              handleSignOut();
            }}
            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            <LogOut className="w-4 h-4 inline-block mr-2" />
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
};

export default UserProfileButton;