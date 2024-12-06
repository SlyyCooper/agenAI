import { z } from 'zod';

/**
 * @purpose: Zod schemas for runtime validation of Firebase data
 * @reference: Matches types in ../interfaces/firebase.types.ts
 */

// User Profile Schema
export const UserProfileSchema = z.object({
    email: z.string().email(),
    created_at: z.string().datetime(),
    last_login: z.string().datetime(),
    stripe_customer_id: z.string(),
    tokens: z.number().int().min(0),
    has_access: z.boolean(),
    one_time_purchase: z.boolean(),
    token_history: z.array(z.unknown()),
    name: z.string().nullable()
});

// Processed Event Schema
export const ProcessedEventSchema = z.object({
    event_type: z.string(),
    event_id: z.string(),
    completed_at: z.string().datetime(),
    processed_at: z.string().datetime(),
    processing_status: z.enum(['pending', 'completed', 'failed'])
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

// Export types derived from schemas
export type UserProfile = z.infer<typeof UserProfileSchema>;
export type ProcessedEvent = z.infer<typeof ProcessedEventSchema>;
export type StorageFile = z.infer<typeof StorageFileSchema>; 