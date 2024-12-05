'use client';

import React, { useState } from 'react';
import { useAuth } from '@/config/firebase/AuthContext';
import { useFirebase } from '@/hooks/useFirebase';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';

export default function DeleteAccount() {
  const { user } = useAuth();
  const { deleteAccount } = useFirebase();
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    if (!user) return;

    const confirmed = window.confirm(
      'Are you sure you want to delete your account? This action cannot be undone.'
    );

    if (!confirmed) return;

    try {
      setIsDeleting(true);
      await deleteAccount();
      toast.success('Account deleted successfully');
      router.push('/');
    } catch (error) {
      console.error('Error deleting account:', error);
      toast.error('Failed to delete account');
    } finally {
      setIsDeleting(false);
    }
  };

  if (!user) return null;

  return (
    <div className="border border-red-200 rounded-lg p-6 bg-red-50">
      <h2 className="text-xl font-semibold mb-4 text-red-600">Delete Account</h2>
      <p className="mb-4 text-gray-700">
        Warning: This action cannot be undone. All your data, including reports and settings,
        will be permanently deleted.
      </p>
      <button
        onClick={handleDeleteAccount}
        disabled={isDeleting}
        className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 disabled:bg-red-300 disabled:cursor-not-allowed transition-colors"
      >
        {isDeleting ? 'Deleting...' : 'Delete My Account'}
      </button>
    </div>
  );
}