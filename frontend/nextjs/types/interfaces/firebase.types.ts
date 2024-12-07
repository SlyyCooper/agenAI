/**
 * Firebase Types
 * @description Types specific to Firebase functionality
 */

import { Timestamp } from 'firebase/firestore';

// Firebase Auth Types
export interface FirebaseUser {
    uid: string;
    email: string;
    displayName: string | null;
    photoURL: string | null;
}

/** @collection users */
export interface UserProfile {
    // Core fields
    email: string;
    name: string;
    created_at: Timestamp;
    last_login: Timestamp;
    
    // Access control
    has_access: boolean;
    one_time_purchase: boolean;
    
    // Token management
    tokens: number;
    token_history: Array<{
        amount: number;
        timestamp: Timestamp;
        reason: string;
        transaction_id: string;
    }>;
    
    // Payment information
    stripe_customer_id: string;
    payment_history: Array<{
        amount: number;
        currency: string;
        status: string;
        timestamp: Timestamp;
        payment_id: string;
    }>;
    
    // Research fields
    report_type?: string;
    file_urls?: string[];
    query?: string;
    title?: string;
    
    // Status fields
    type?: string;
    message?: string;
    status?: string;
    timestamp?: Timestamp;
    expires_at?: Timestamp;
    
    // Task fields
    task?: string;
    output?: any;
    report?: any;
    filename?: string;
    file_paths?: string[];
    firebase_url?: string;
}

/** @collection payments */
export interface Payment {
    // Core fields
    created_at: Timestamp;
    updated_at: Timestamp;
    payment_id: string;
    status: string;
    
    // Payment details
    amount?: number;
    user_id?: string;
    payment_type?: string;
    
    // Subscription fields
    subscription_id?: string;
    subscription_status?: string;
    subscription_end_date?: Timestamp;
    
    // Event fields
    event_type?: string;
    event_id?: string;
    timestamp?: Timestamp;
    processed_at?: Timestamp;
    completed_at?: Timestamp;
    failed_at?: Timestamp;
    
    // Status fields
    processing_status?: string;
    error?: string;
    result?: any;
    mode?: string;
    reason?: string;
    message?: string;
    type?: string;
}

/** @collection processed_events */
export interface ProcessedEvent {
    // Core fields
    event_type: string;
    event_id: string;
    completed_at: Timestamp;
    processed_at: Timestamp;
    processing_status: 'pending' | 'completed' | 'failed';
    
    // User fields
    user_id?: string;
    
    // Status fields
    error?: string;
    result?: any;
    timestamp?: Timestamp;
    status?: string;
    message?: string;
    type?: string;
    expires_at?: Timestamp;
    
    // Research fields
    report_type?: string;
    file_urls?: string[];
    query?: string;
    title?: string;
}

// Storage Types
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

export interface FileMetadata {
    id: string;
    path: string;
    url: string;
    content_type: string;
    size: number;
    created: Timestamp;
    updated: Timestamp;
    metadata: {
        contentType: string;
        size: number;
        created: Date;
        updated: Date;
    };
    content?: string;
    file_path?: string;
    full_path?: string;
    public_url?: string;
    title?: string;
    type?: string;
}

// Base Types
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
    uploadProgress: Record<string, {
        bytesTransferred: number;
        totalBytes: number;
        progress: number;
    }>;
} 