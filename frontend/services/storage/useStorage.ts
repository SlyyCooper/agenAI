import { useCallback, useRef, useState } from 'react';
import { 
  ref, 
  uploadBytesResumable, 
  getDownloadURL, 
  deleteObject, 
  listAll, 
  getMetadata,
  StorageError
} from 'firebase/storage';
import { collection, doc, getDoc } from 'firebase/firestore';
import { storage, db, auth } from '../config/firebase/firebase';
import type { StorageFile, StorageHook, UploadProgress } from '../types/interfaces/api.types';
import { cacheManager, withCache, generateCacheKey } from '../utils/cacheUtils';

// Custom error classes for storage operations
class StorageOperationError extends Error {
  constructor(
    message: string,
    public code: string,
    public originalError: Error
  ) {
    super(message);
    this.name = 'StorageOperationError';
  }
}

class QuotaExceededError extends StorageOperationError {
  constructor(error: Error) {
    super('Storage quota exceeded', 'storage/quota-exceeded', error);
    this.name = 'QuotaExceededError';
  }
}

class UnauthorizedError extends StorageOperationError {
  constructor(error: Error) {
    super('Unauthorized access to storage', 'storage/unauthorized', error);
    this.name = 'UnauthorizedError';
  }
}

class FileNotFoundError extends StorageOperationError {
  constructor(error: Error) {
    super('File not found', 'storage/object-not-found', error);
    this.name = 'FileNotFoundError';
  }
}

// Error handling utility for storage operations
const handleStorageError = (error: StorageError): never => {
  console.error('Storage operation failed:', error);
  
  switch (error.code) {
    case 'storage/quota-exceeded':
      throw new QuotaExceededError(error);
    
    case 'storage/unauthorized':
    case 'storage/invalid-argument':
      throw new UnauthorizedError(error);
    
    case 'storage/object-not-found':
      throw new FileNotFoundError(error);
    
    case 'storage/canceled':
      throw new StorageOperationError(
        'Operation was cancelled',
        error.code,
        error
      );
    
    case 'storage/invalid-checksum':
      throw new StorageOperationError(
        'File integrity check failed',
        error.code,
        error
      );
    
    case 'storage/retry-limit-exceeded':
      throw new StorageOperationError(
        'Maximum retry attempts exceeded',
        error.code,
        error
      );
    
    default:
      throw new StorageOperationError(
        'An unexpected storage error occurred',
        error.code,
        error
      );
  }
};

// Wrapper for storage operations with error handling
const withStorageErrorHandling = async <T>(
  operation: () => Promise<T>,
  context: string
): Promise<T> => {
  try {
    return await operation();
  } catch (error) {
    console.error(`Error in ${context}:`, error);
    
    if (error instanceof StorageError) {
      handleStorageError(error);
    }
    
    if (error instanceof Error) {
      throw new StorageOperationError(
        error.message,
        'unknown',
        error
      );
    }
    
    throw new StorageOperationError(
      'An unknown error occurred',
      'unknown',
      new Error(String(error))
    );
  }
};

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

export const useStorage = (): StorageHook => {
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({});
  
  const retryOperationRef = useRef(async <T>(operation: () => Promise<T>): Promise<T> => {
    let lastError: Error | null = null;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * Math.pow(2, attempt)));
      }
    }
    throw lastError;
  });

  const ensureUserRef = useRef(() => {
    const user = auth.currentUser;
    if (!user) {
      throw new UnauthorizedError(new Error('User must be authenticated'));
    }
    return user;
  });

  const uploadFile = useCallback(async (file: File, path: string): Promise<string> => {
    const currentUser = ensureUserRef.current();
    
    return withStorageErrorHandling(async () => {
      return retryOperationRef.current(async () => {
        const fullPath = `users/${currentUser.uid}/${path}`;
        const storageRef = ref(storage, fullPath);
        
        const uploadTask = uploadBytesResumable(storageRef, file);
        
        return new Promise<string>((resolve, reject) => {
          uploadTask.on(
            'state_changed',
            (snapshot) => {
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              setUploadProgress(prev => ({
                ...prev,
                [fullPath]: progress
              }));
            },
            (error) => {
              reject(error);
            },
            async () => {
              try {
                const url = await getDownloadURL(uploadTask.snapshot.ref);
                setUploadProgress(prev => {
                  const newProgress = { ...prev };
                  delete newProgress[fullPath];
                  return newProgress;
                });
                // Invalidate file list cache after upload
                cacheManager.invalidateAll('storageFiles');
                resolve(url);
              } catch (error) {
                reject(error);
              }
            }
          );
        });
      });
    }, 'uploadFile');
  }, []);

  const downloadFile = useCallback(async (path: string): Promise<Blob> => {
    const currentUser = ensureUserRef.current();
    
    return withStorageErrorHandling(async () => {
      return retryOperationRef.current(async () => {
        const fullPath = `users/${currentUser.uid}/${path}`;
        
        // Check cache for download URL
        const cachedUrl = cacheManager.get<string>('storageUrls', fullPath);
        let url: string;
        
        if (cachedUrl) {
          url = cachedUrl;
        } else {
          const storageRef = ref(storage, fullPath);
          url = await getDownloadURL(storageRef);
          cacheManager.set('storageUrls', fullPath, url, 5 * 60 * 1000); // 5 minutes cache
        }
        
        const response = await fetch(url);
        if (!response.ok) {
          throw new StorageOperationError(
            'Failed to download file',
            'download-failed',
            new Error(response.statusText)
          );
        }
        return response.blob();
      });
    }, 'downloadFile');
  }, []);

  const deleteFile = useCallback(async (path: string): Promise<void> => {
    const currentUser = ensureUserRef.current();
    
    return withStorageErrorHandling(async () => {
      return retryOperationRef.current(async () => {
        const fullPath = `users/${currentUser.uid}/${path}`;
        const storageRef = ref(storage, fullPath);
        await deleteObject(storageRef);
        
        // Invalidate related caches
        cacheManager.invalidate('storageUrls', fullPath);
        cacheManager.invalidateAll('storageFiles');
      });
    }, 'deleteFile');
  }, []);

  const getFileUrl = useCallback(async (path: string): Promise<string> => {
    const currentUser = ensureUserRef.current();
    
    return withStorageErrorHandling(async () => {
      return retryOperationRef.current(async () => {
        const fullPath = `users/${currentUser.uid}/${path}`;
        
        // Check cache first
        const cachedUrl = cacheManager.get<string>('storageUrls', fullPath);
        if (cachedUrl) {
          return cachedUrl;
        }
        
        const storageRef = ref(storage, fullPath);
        const url = await getDownloadURL(storageRef);
        
        // Cache the URL
        cacheManager.set('storageUrls', fullPath, url, 5 * 60 * 1000); // 5 minutes cache
        
        return url;
      });
    }, 'getFileUrl');
  }, []);

  const listFiles = useCallback(async (prefix: string): Promise<StorageFile[]> => {
    const currentUser = ensureUserRef.current();
    
    return withStorageErrorHandling(async () => {
      return retryOperationRef.current(async () => {
        const path = `users/${currentUser.uid}/${prefix}`;
        
        // Check cache first
        const cachedFiles = cacheManager.get<StorageFile[]>('storageFiles', path);
        if (cachedFiles) {
          return cachedFiles;
        }
        
        const storageRef = ref(storage, path);
        const result = await listAll(storageRef);
        
        const files = await Promise.all(
          result.items.map(async (item) => {
            const [url, metadata] = await Promise.all([
              getDownloadURL(item),
              getMetadata(item)
            ]);
            
            return {
              name: item.name,
              path: item.fullPath,
              type: metadata.contentType || '',
              size: metadata.size,
              created: metadata.timeCreated,
              updated: metadata.updated,
              metadata: {
                contentType: metadata.contentType || '',
                size: metadata.size,
                created: new Date(metadata.timeCreated),
                updated: new Date(metadata.updated),
                customMetadata: metadata.customMetadata || {},
              },
              url,
            };
          })
        );
        
        // Cache the file list
        cacheManager.set('storageFiles', path, files, 2 * 60 * 1000); // 2 minutes cache
        
        return files;
      });
    }, 'listFiles');
  }, []);

  const validateFile = useCallback(async (file: File): Promise<void> => {
    return withStorageErrorHandling(async () => {
      if (!file) {
        throw new StorageOperationError(
          'No file provided',
          'validation/no-file',
          new Error()
        );
      }
      if (file.size > 100 * 1024 * 1024) { // 100MB limit
        throw new StorageOperationError(
          'File size exceeds limit',
          'validation/file-too-large',
          new Error()
        );
      }
    }, 'validateFile');
  }, []);

  const getStorageQuota = useCallback(async (): Promise<{ used: number; total: number }> => {
    const currentUser = ensureUserRef.current();
    
    return withStorageErrorHandling(async () => {
      return retryOperationRef.current(async () => {
        const cacheKey = `quota_${currentUser.uid}`;
        
        // Check cache first
        const cachedQuota = cacheManager.get<{ used: number; total: number }>('storageQuota', cacheKey);
        if (cachedQuota) {
          return cachedQuota;
        }
        
        const quotaDoc = await getDoc(doc(db, 'users', currentUser.uid));
        const data = quotaDoc.data();
        
        const quota = {
          used: data?.storageUsed || 0,
          total: data?.storageLimit || 1024 * 1024 * 1024 // Default 1GB
        };
        
        // Cache the quota
        cacheManager.set('storageQuota', cacheKey, quota, 5 * 60 * 1000); // 5 minutes cache
        
        return quota;
      });
    }, 'getStorageQuota');
  }, []);

  return {
    uploadFile,
    downloadFile,
    deleteFile,
    getFileUrl,
    listFiles,
    uploadProgress,
    validateFile,
    getStorageQuota,
  };
};

export default useStorage; 