import { useCallback } from 'react';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject, listAll, getMetadata } from 'firebase/storage';
import { useAuth } from '../config/firebase/AuthContext';
import { useAPIError } from './useAPIError';
import type { StorageFile, UseStorageReturn } from '../types';

export const useStorage = (): UseStorageReturn => {
    const { user } = useAuth();
    const { handleError } = useAPIError();
    const storage = getStorage();

    const uploadFile = useCallback(async (file: File, path: string): Promise<string> => {
        if (!user) throw new Error('Must be logged in to upload files');

        return handleError(async () => {
            // Create storage reference
            const storageRef = ref(storage, `users/${user.uid}/${path}`);
            
            // Upload file
            await uploadBytes(storageRef, file);
            
            // Get download URL
            const url = await getDownloadURL(storageRef);
            return url;
        });
    }, [user, storage, handleError]);

    const downloadFile = useCallback(async (path: string): Promise<Blob> => {
        if (!user) throw new Error('Must be logged in to download files');

        return handleError(async () => {
            const storageRef = ref(storage, `users/${user.uid}/${path}`);
            const url = await getDownloadURL(storageRef);
            
            // Download file
            const response = await fetch(url);
            const blob = await response.blob();
            return blob;
        });
    }, [user, storage, handleError]);

    const deleteFile = useCallback(async (path: string): Promise<void> => {
        if (!user) throw new Error('Must be logged in to delete files');

        return handleError(async () => {
            const storageRef = ref(storage, `users/${user.uid}/${path}`);
            await deleteObject(storageRef);
        });
    }, [user, storage, handleError]);

    const getFileUrl = useCallback(async (path: string): Promise<string> => {
        if (!user) throw new Error('Must be logged in to access files');

        return handleError(async () => {
            const storageRef = ref(storage, `users/${user.uid}/${path}`);
            return getDownloadURL(storageRef);
        });
    }, [user, storage, handleError]);

    const listFiles = useCallback(async (prefix: string): Promise<StorageFile[]> => {
        if (!user) throw new Error('Must be logged in to list files');

        return handleError(async () => {
            const storageRef = ref(storage, `users/${user.uid}/${prefix}`);
            const res = await listAll(storageRef);
            
            const files = await Promise.all(
                res.items.map(async (item) => {
                    const url = await getDownloadURL(item);
                    const metadata = await getMetadata(item);
                    
                    return {
                        path: item.fullPath,
                        url,
                        metadata: {
                            contentType: metadata.contentType,
                            size: metadata.size,
                            created: new Date(metadata.timeCreated),
                            updated: new Date(metadata.updated)
                        }
                    };
                })
            );
            
            return files;
        });
    }, [user, storage, handleError]);

    return {
        uploadFile,
        downloadFile,
        deleteFile,
        getFileUrl,
        listFiles
    };
}; 