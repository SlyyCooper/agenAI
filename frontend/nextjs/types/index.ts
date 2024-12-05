/**
 * Type Exports
 * @description Central location for all type exports
 */

// Import types for re-export
import { FirebaseUser, FirestoreTimestamp, UseStorageReturn } from './interfaces/firebase.types';
import { UserProfileData, ReportDocument } from './interfaces/api.types';
import { UseFirebaseReturn, UseAPIErrorReturn } from './interfaces/hooks.types';

// Export all types
export * from './interfaces/api.types';
export * from './interfaces/firebase.types';
export * from './interfaces/hooks.types';

// Common utility types
export type DateString = string;
export type Nullable<T> = T | null;
export type AsyncReturnType<T extends (...args: any) => Promise<any>> = T extends (...args: any) => Promise<infer R> ? R : any;

// Re-export common types with better names
export type {
    FirebaseUser as User,
    FirestoreTimestamp as Timestamp,
    UserProfileData as Profile,
    ReportDocument as Report,
    UseStorageReturn as StorageHook,
    UseFirebaseReturn as FirebaseHook,
    UseAPIErrorReturn as APIErrorHook
}; 