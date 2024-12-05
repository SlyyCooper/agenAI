/**
 * Firebase Types
 * @description Types specific to Firebase functionality
 */

import { Timestamp } from 'firebase/firestore';

// Firebase Auth Types
export interface FirebaseUser {
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
}

// Firebase Storage Types
export interface StorageFile {
    path: string;
    url: string;
    metadata: {
        contentType: string;
        size: number;
        created: Date;
        updated: Date;
    };
}

// Firebase Firestore Types
export interface FirestoreTimestamp {
    _seconds: number;
    _nanoseconds: number;
}

export interface FirestoreDocument {
    id: string;
    created_at: Timestamp;
    updated_at: Timestamp;
}

// Hook Return Types
export interface UseStorageReturn {
    uploadFile: (file: File, path: string) => Promise<string>;
    downloadFile: (path: string) => Promise<Blob>;
    deleteFile: (path: string) => Promise<void>;
    getFileUrl: (path: string) => Promise<string>;
    listFiles: (prefix: string) => Promise<StorageFile[]>;
} 