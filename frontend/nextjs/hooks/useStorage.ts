import { useCallback, useRef, useState } from 'react';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject, listAll, getMetadata } from 'firebase/storage';
import { collection, doc, getDoc } from 'firebase/firestore';
import { storage, db, auth } from '../config/firebase/firebase';
import type { StorageFile, StorageHook, UploadProgress, ReportStorageError } from '../types/interfaces/api.types';

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
      throw new Error('User must be authenticated');
    }
    return user;
  });

  const handleError = useCallback(<T>(operation: () => Promise<T>): Promise<T> => {
    return operation().catch((error: Error) => {
      const storageError: ReportStorageError = {
        type: 'validation',
        details: {
          reason: error.message || 'Unknown error occurred',
        },
        customData: {
          serverResponse: error.message || '',
        },
        code: error.name,
        name: error.name,
        message: error.message,
      };
      throw storageError;
    });
  }, []);

  const uploadFile = useCallback(async (file: File, path: string): Promise<string> => {
    const currentUser = ensureUserRef.current();
    
    return handleError(async () => {
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
                resolve(url);
              } catch (error) {
                reject(error);
              }
            }
          );
        });
      });
    });
  }, []);

  const downloadFile = useCallback(async (path: string): Promise<Blob> => {
    const currentUser = ensureUserRef.current();
    
    return handleError(async () => {
      return retryOperationRef.current(async () => {
        const fullPath = `users/${currentUser.uid}/${path}`;
        const storageRef = ref(storage, fullPath);
        const url = await getDownloadURL(storageRef);
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error('Failed to download file');
        }
        return response.blob();
      });
    });
  }, []);

  const deleteFile = useCallback(async (path: string): Promise<void> => {
    const currentUser = ensureUserRef.current();
    
    return handleError(async () => {
      return retryOperationRef.current(async () => {
        const fullPath = `users/${currentUser.uid}/${path}`;
        const storageRef = ref(storage, fullPath);
        await deleteObject(storageRef);
      });
    });
  }, []);

  const getFileUrl = useCallback(async (path: string): Promise<string> => {
    const currentUser = ensureUserRef.current();
    
    return handleError(async () => {
      return retryOperationRef.current(async () => {
        const fullPath = `users/${currentUser.uid}/${path}`;
        const storageRef = ref(storage, fullPath);
        return getDownloadURL(storageRef);
      });
    });
  }, []);

  const listFiles = useCallback(async (prefix: string): Promise<StorageFile[]> => {
    const currentUser = ensureUserRef.current();
    
    return handleError(async () => {
      return retryOperationRef.current(async () => {
        const path = `users/${currentUser.uid}/${prefix}`;
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
        
        return files;
      });
    });
  }, [handleError]);

  const validateFile = useCallback(async (file: File): Promise<void> => {
    return handleError(async () => {
      // Add your file validation logic here
      if (!file) {
        throw new Error('No file provided');
      }
      // Example validation
      if (file.size > 100 * 1024 * 1024) { // 100MB limit
        throw new Error('File size exceeds limit');
      }
    });
  }, []);

  const getStorageQuota = useCallback(async (): Promise<{ used: number; total: number }> => {
    const currentUser = ensureUserRef.current();
    
    return handleError(async () => {
      return retryOperationRef.current(async () => {
        const quotaDoc = await getDoc(doc(db, 'users', currentUser.uid));
        const data = quotaDoc.data();
        
        if (!data || typeof data.storageUsed !== 'number' || typeof data.storageLimit !== 'number') {
          return { used: 0, total: 1024 * 1024 * 1024 }; // Default 1GB
        }
        
        return {
          used: data.storageUsed,
          total: data.storageLimit,
        };
      });
    });
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