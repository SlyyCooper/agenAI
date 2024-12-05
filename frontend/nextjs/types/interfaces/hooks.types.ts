/**
 * Hook Types
 * @description Type definitions for custom hooks
 */

import { StorageFile, UseStorageReturn } from './firebase.types';
import { UserProfileData, PaymentRecord } from './api.types';
import { User } from 'firebase/auth';

// Firebase Hook Types
export interface UseFirebaseReturn {
    signIn: (email: string, password: string) => Promise<User>;
    signUp: (email: string, password: string, name: string) => Promise<User>;
    signInWithGoogle: () => Promise<User>;
    signInWithX: () => Promise<User>;
    logout: () => Promise<void>;
    resetPassword: (email: string) => Promise<void>;
    getUserData: () => Promise<UserProfileData | null>;
    deleteAccount: () => Promise<void>;
    updateUserProfile: (data: { name: string; notifications: boolean }) => Promise<void>;
    isAuthenticated: boolean;
}

// Error Hook Types
export interface UseAPIErrorReturn {
    error: {
        message: string;
        code?: string;
        statusCode?: number;
    } | null;
    setError: (error: Error) => void;
    clearError: () => void;
    handleError: <T>(fn: () => Promise<T>) => Promise<T | undefined>;
} 