'use client';

import React from 'react';
import Image from 'next/image';
import { useAuth } from '@/config/firebase/AuthContext';
import { UserProfileData } from '@/types/interfaces/api.types';

export default function ProfileHeader() {
  const { user, userProfile, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center space-x-4 animate-pulse">
        <div className="w-16 h-16 bg-gray-200 rounded-full" />
        <div>
          <div className="h-6 w-32 bg-gray-200 rounded mb-2" />
          <div className="h-4 w-48 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const profile = userProfile as UserProfileData;

  return (
    <div className="flex items-center space-x-4">
      {user.photoURL ? (
        <Image
          src={user.photoURL}
          alt={profile?.name || user.displayName || 'Profile'}
          width={64}
          height={64}
          className="rounded-full"
        />
      ) : (
        <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center text-gray-500">
          {(profile?.name || user.displayName || 'U')[0].toUpperCase()}
        </div>
      )}
      <div>
        <h1 className="text-2xl font-bold">
          {profile?.name || user.displayName || 'User'}
        </h1>
        <p className="text-gray-600">{user.email}</p>
        {profile && (
          <div className="mt-2 text-sm text-gray-500">
            <span className="mr-4">Tokens: {profile.tokens}</span>
            <span>Member since: {new Date(profile.created_at).toLocaleDateString()}</span>
          </div>
        )}
      </div>
    </div>
  );
}