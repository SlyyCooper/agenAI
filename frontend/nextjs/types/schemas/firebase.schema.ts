import { z } from 'zod';

/**
 * @purpose: Zod schemas for runtime validation of Firebase data
 * @reference: Matches types in ../interfaces/firebase.types.ts
 */

// User Profile Schema
export const UserProfileSchema = z.object({
    // Core fields
    email: z.string().email(),
    name: z.string(),
    created_at: z.string().datetime(),
    last_login: z.string().datetime(),
    
    // Access control
    has_access: z.boolean(),
    one_time_purchase: z.boolean(),
    
    // Token management
    tokens: z.number().int(),
    token_history: z.array(z.object({
        amount: z.number(),
        timestamp: z.string().datetime(),
        reason: z.string(),
        transaction_id: z.string()
    })),
    
    // Payment information
    stripe_customer_id: z.string(),
    payment_history: z.array(z.object({
        amount: z.number(),
        currency: z.string(),
        status: z.string(),
        timestamp: z.string().datetime(),
        payment_id: z.string()
    })),
    
    // Research fields
    report_type: z.string().optional(),
    file_urls: z.array(z.string()).optional(),
    query: z.string().optional(),
    title: z.string().optional(),
    
    // Status fields
    type: z.string().optional(),
    message: z.string().optional(),
    status: z.string().optional(),
    timestamp: z.string().datetime().optional(),
    expires_at: z.string().datetime().optional(),
    
    // Task fields
    task: z.string().optional(),
    output: z.any().optional(),
    report: z.any().optional(),
    filename: z.string().optional(),
    file_paths: z.array(z.string()).optional(),
    firebase_url: z.string().optional()
});

// Payment Schema
export const PaymentSchema = z.object({
    // Core fields
    created_at: z.string().datetime(),
    updated_at: z.string().datetime(),
    payment_id: z.string(),
    status: z.string(),
    
    // Payment details
    amount: z.number().optional(),
    user_id: z.string().optional(),
    payment_type: z.string().optional(),
    
    // Subscription fields
    subscription_id: z.string().optional(),
    subscription_status: z.string().optional(),
    subscription_end_date: z.string().datetime().optional(),
    
    // Event fields
    event_type: z.string().optional(),
    event_id: z.string().optional(),
    timestamp: z.string().datetime().optional(),
    processed_at: z.string().datetime().optional(),
    completed_at: z.string().datetime().optional(),
    failed_at: z.string().datetime().optional(),
    
    // Status fields
    processing_status: z.string().optional(),
    error: z.string().optional(),
    result: z.any().optional(),
    mode: z.string().optional(),
    reason: z.string().optional(),
    message: z.string().optional(),
    type: z.string().optional()
});

// Processed Event Schema
export const ProcessedEventSchema = z.object({
    // Core fields
    event_type: z.string(),
    event_id: z.string(),
    completed_at: z.string().datetime(),
    processed_at: z.string().datetime(),
    processing_status: z.enum(['pending', 'completed', 'failed']),
    
    // User fields
    user_id: z.string().optional(),
    
    // Status fields
    error: z.string().optional(),
    result: z.any().optional(),
    timestamp: z.string().datetime().optional(),
    status: z.string().optional(),
    message: z.string().optional(),
    type: z.string().optional(),
    expires_at: z.string().datetime().optional(),
    
    // Research fields
    report_type: z.string().optional(),
    file_urls: z.array(z.string()).optional(),
    query: z.string().optional(),
    title: z.string().optional()
});

// Storage File Schema
export const StorageFileSchema = z.object({
    path: z.string(),
    url: z.string().url(),
    metadata: z.object({
        contentType: z.string(),
        size: z.number().positive(),
        created: z.date(),
        updated: z.date()
    })
});

// File Metadata Schema
export const FileMetadataSchema = z.object({
    id: z.string(),
    path: z.string(),
    url: z.string(),
    content_type: z.string(),
    size: z.number(),
    created: z.string().datetime(),
    updated: z.string().datetime(),
    metadata: z.object({
        contentType: z.string(),
        size: z.number(),
        created: z.date(),
        updated: z.date()
    }),
    content: z.string().optional(),
    file_path: z.string().optional(),
    full_path: z.string().optional(),
    public_url: z.string().optional(),
    title: z.string().optional(),
    type: z.string().optional()
});

// Base Types
export const FirestoreTimestampSchema = z.object({
    _seconds: z.number(),
    _nanoseconds: z.number()
});

export const FirestoreDocumentSchema = z.object({
    id: z.string(),
    created_at: z.string().datetime(),
    updated_at: z.string().datetime()
});

// Export types derived from schemas
export type UserProfile = z.infer<typeof UserProfileSchema>;
export type Payment = z.infer<typeof PaymentSchema>;
export type ProcessedEvent = z.infer<typeof ProcessedEventSchema>;
export type StorageFile = z.infer<typeof StorageFileSchema>;
export type FileMetadata = z.infer<typeof FileMetadataSchema>;
export type FirestoreTimestamp = z.infer<typeof FirestoreTimestampSchema>;
export type FirestoreDocument = z.infer<typeof FirestoreDocumentSchema>; 