import { useCallback, useState } from 'react';
import { 
  getStorage, 
  ref, 
  uploadBytes, 
  uploadBytesResumable,
  getDownloadURL, 
  deleteObject, 
  listAll, 
  getMetadata,
  StorageError 
} from 'firebase/storage';
import { useAuth } from '../config/firebase/AuthContext';
import { useAPIError } from './useAPIError';
import type { StorageFile, StorageHook, ResearchReportUrls, UploadProgress } from '../types/interfaces/api.types';
import { saveResearchReport } from '../api/storageAPI';

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

export const useStorage = (): StorageHook => {
  const { user } = useAuth();
  const { handleError } = useAPIError();
  const storage = getStorage();
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({});

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const handleStorageError = (error: StorageError) => {
    switch (error.code) {
      case 'storage/unauthorized':
        throw new Error('User not authorized to access storage');
      case 'storage/canceled':
        throw new Error('Upload canceled by user');
      case 'storage/unknown':
      default:
        throw new Error(`Storage error: ${error.message}`);
    }
  };

  const retryOperation = async <T>(
    operation: () => Promise<T>,
    retries = MAX_RETRIES
  ): Promise<T> => {
    try {
      return await operation();
    } catch (error) {
      if (retries > 0 && error instanceof StorageError) {
        await sleep(RETRY_DELAY);
        return retryOperation(operation, retries - 1);
      }
      throw error;
    }
  };

  const uploadFile = useCallback(async (file: File, path: string): Promise<string> => {
    if (!user) throw new Error('Must be logged in to upload files');

    return handleError(async () => {
      const storageRef = ref(storage, `users/${user.uid}/${path}`);
      
      // Use resumable upload for tracking progress
      const uploadTask = uploadBytesResumable(storageRef, file);
      
      return new Promise((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            setUploadProgress(prev => ({
              ...prev,
              [path]: {
                bytesTransferred: snapshot.bytesTransferred,
                totalBytes: snapshot.totalBytes,
                progress: progress
              }
            }));
          },
          (error) => {
            handleStorageError(error);
            reject(error);
          },
          async () => {
            try {
              const url = await getDownloadURL(uploadTask.snapshot.ref);
              setUploadProgress(prev => {
                const newProgress = { ...prev };
                delete newProgress[path];
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
  }, [user, storage, handleError]);

  const downloadFile = useCallback(async (path: string): Promise<Blob> => {
    if (!user) throw new Error('Must be logged in to download files');

    return handleError(async () => {
      return retryOperation(async () => {
        const storageRef = ref(storage, `users/${user.uid}/${path}`);
        const url = await getDownloadURL(storageRef);
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.blob();
      });
    });
  }, [user, storage, handleError]);

  const deleteFile = useCallback(async (path: string): Promise<void> => {
    if (!user) throw new Error('Must be logged in to delete files');

    return handleError(async () => {
      return retryOperation(async () => {
        const storageRef = ref(storage, `users/${user.uid}/${path}`);
        await deleteObject(storageRef);
      });
    });
  }, [user, storage, handleError]);

  const getFileUrl = useCallback(async (path: string): Promise<string> => {
    if (!user) throw new Error('Must be logged in to access files');

    return handleError(async () => {
      return retryOperation(async () => {
        const storageRef = ref(storage, `users/${user.uid}/${path}`);
        return getDownloadURL(storageRef);
      });
    });
  }, [user, storage, handleError]);

  const listFiles = useCallback(async (prefix: string): Promise<StorageFile[]> => {
    if (!user) throw new Error('Must be logged in to list files');

    return handleError(async () => {
      return retryOperation(async () => {
        const storageRef = ref(storage, `users/${user.uid}/${prefix}`);
        const res = await listAll(storageRef);
        
        const files = await Promise.all(
          res.items.map(async (item) => {
            const [url, metadata] = await Promise.all([
              getDownloadURL(item),
              getMetadata(item)
            ]);
            
            return {
              path: item.fullPath,
              url,
              metadata: {
                contentType: metadata.contentType,
                size: metadata.size,
                created: new Date(metadata.timeCreated),
                updated: new Date(metadata.updated),
                customMetadata: metadata.customMetadata || {}
              }
            };
          })
        );
        
        return files;
      });
    });
  }, [user, storage, handleError]);

  const saveReport = useCallback(async (
    content: string,
    title: string,
    reportType: string,
    source?: string
  ): Promise<ResearchReportUrls> => {
    if (!user) throw new Error('Must be logged in to save reports');

    return handleError(async () => {
      const metadata = {
        title,
        report_type: reportType,
        source: source || 'web',
        userId: user.uid
      };

      return saveResearchReport({
        content,
        metadata,
        userId: user.uid
      });
    });
  }, [user, handleError]);

  return {
    uploadFile,
    downloadFile,
    deleteFile,
    getFileUrl,
    listFiles,
    uploadProgress: uploadProgress as UploadProgress,
    saveReport
  };
}; 