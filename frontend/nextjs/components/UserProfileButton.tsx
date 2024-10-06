'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/config/firebase/AuthContext';
import { User, LogIn } from 'lucide-react';

const UserProfileButton: React.FC = () => {
  const { user, loading } = useAuth();
  const router = useRouter();

  if (loading) {
    return <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse"></div>;
  }

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
    <button
      onClick={() => router.push('/profile')}
      className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
    >
      {user.photoURL ? (
        <img src={user.photoURL} alt="Profile" className="w-8 h-8 rounded-full mr-2" />
      ) : (
        <User className="w-5 h-5 mr-1" />
      )}
      {user.displayName || 'Profile'}
    </button>
  );
};

export default UserProfileButton;