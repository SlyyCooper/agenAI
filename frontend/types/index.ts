/**
 * Type Exports
 * @description Central location for all type exports
 */

// Import types for re-export
import type { 
    FirebaseUser,
    UserProfile,
    Payment,
    ProcessedEvent,
    StorageFile,
    FileMetadata as FirebaseFileMetadata,
    FirestoreTimestamp,
    FirestoreDocument,
    UseStorageReturn 
} from './interfaces/firebase.types';
import type { 
    UserProfileData, 
    ReportDocument,
    FileMetadata as APIFileMetadata 
} from './interfaces/api.types';
import type { UseFirebaseReturn, UseAPIErrorReturn } from './interfaces/hooks.types';

// Export renamed types to avoid conflicts
export type {
    FirebaseUser as User,
    FirestoreTimestamp as Timestamp,
    UserProfileData as Profile,
    ReportDocument as Report,
    UseStorageReturn as StorageHook,
    UseFirebaseReturn as FirebaseHook,
    UseAPIErrorReturn as APIErrorHook,
    FirebaseFileMetadata,
    APIFileMetadata,
    UserProfile,
    Payment,
    ProcessedEvent,
    StorageFile,
    FirestoreDocument
};

// Export other types from hooks
export type * from './interfaces/hooks.types';

// Common utility types
export type DateString = string;
export type Nullable<T> = T | null;
export type AsyncReturnType<T extends (...args: any) => Promise<any>> = T extends (...args: any) => Promise<infer R> ? R : any;