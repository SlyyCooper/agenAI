import type { StorageConfig } from '../types/interfaces/api.types';
import { cacheManager } from '../utils/cacheUtils';
import { storage } from './firebase/firebase';
import { ref, listAll, getMetadata } from 'firebase/storage';

interface MimeTypes {
  [key: string]: string;
}

interface StorageValidation {
  MAX_FILE_SIZE_MB: number;
  SUPPORTED_FORMATS: string[];
  CLEANUP_AGE_DAYS: number;
  MAX_FILES_PER_USER: number;
  MIME_TYPES: MimeTypes;
}

interface StorageFile {
  name: string;
  size: number;
  contentType: string;
  timeCreated: string;
}

async function listUserFiles(userId: string): Promise<StorageFile[]> {
  try {
    // Try to get from cache first
    const cachedFiles = cacheManager.get('userFiles', userId) as StorageFile[] | null;
    if (cachedFiles) {
      return cachedFiles;
    }

    // If not in cache, fetch from Firebase Storage
    const userStorageRef = ref(storage, `users/${userId}`);
    const filesList = await listAll(userStorageRef);
    
    const filesPromises = filesList.items.map(async (fileRef) => {
      const metadata = await getMetadata(fileRef);
      return {
        name: fileRef.name,
        size: metadata.size,
        contentType: metadata.contentType || 'application/octet-stream',
        timeCreated: metadata.timeCreated
      };
    });

    const files = await Promise.all(filesPromises);
    
    // Cache the result
    const cacheTTL = storageConfig.cache?.TTL ?? 5 * 60 * 1000;
    cacheManager.set('userFiles', userId, files, cacheTTL);
    
    return files;
  } catch (error) {
    console.error('Error listing user files:', error);
    return [];
  }
}

export const storageValidation: StorageValidation = {
  MAX_FILE_SIZE_MB: 10,
  SUPPORTED_FORMATS: ['pdf', 'docx', 'md', 'json', 'txt'],
  CLEANUP_AGE_DAYS: 7,
  MAX_FILES_PER_USER: 100,
  MIME_TYPES: {
    'pdf': 'application/pdf',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'md': 'text/markdown',
    'json': 'application/json',
    'txt': 'text/plain'
  }
};

export const storageConfig: StorageConfig = {
  validation: storageValidation,
  paths: {
    reports: 'reports',
    research: 'research',
    temp: 'temp',
    public: 'public'
  },
  cache: {
    TTL: 5 * 60 * 1000, // 5 minutes
    MAX_SIZE: 50 * 1024 * 1024 // 50MB
  }
};

export const getStoragePath = (userId: string, type: keyof StorageConfig['paths'], filename: string): string => {
  return `users/${userId}/${storageConfig.paths[type]}/${filename}`;
};

export const validateStorageFile = (file: File): void => {
  // Size validation
  if (file.size > storageConfig.validation.MAX_FILE_SIZE_MB * 1_000_000) {
    throw new Error(`File size exceeds ${storageConfig.validation.MAX_FILE_SIZE_MB}MB limit`);
  }

  // Format validation
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (!ext || !storageConfig.validation.SUPPORTED_FORMATS.includes(ext)) {
    throw new Error(`Unsupported file format. Supported formats: ${storageConfig.validation.SUPPORTED_FORMATS.join(', ')}`);
  }

  // MIME type validation
  const expectedMimeType = storageConfig.validation.MIME_TYPES[ext as keyof typeof storageConfig.validation.MIME_TYPES];
  if (file.type !== expectedMimeType) {
    throw new Error(`Invalid MIME type. Expected ${expectedMimeType} for .${ext} files`);
  }
};

export const isStoragePathValid = (path: string): boolean => {
  // Validate path structure
  const parts = path.split('/');
  if (parts.length < 4) return false; // users/userId/type/filename
  
  // Validate path components
  const [users, userId, type] = parts;
  return (
    users === 'users' &&
    userId?.length > 0 &&
    Object.values(storageConfig.paths).includes(type)
  );
};

export const getCachedStorageUrl = async (path: string): Promise<string | null> => {
  const cached = cacheManager.get('storageUrls', path);
  if (cached) {
    return cached as string;
  }
  return null;
};

export const setCachedStorageUrl = (path: string, url: string): void => {
  const cacheTTL = storageConfig.cache?.TTL ?? 5 * 60 * 1000; // Default to 5 minutes if not specified
  cacheManager.set('storageUrls', path, url, cacheTTL);
};

export const validateUserStorage = async (userId: string, newFileSize: number): Promise<boolean> => {
  try {
    const userFiles = await listUserFiles(userId);
    const totalSize = userFiles.reduce((acc, file) => acc + file.size, 0) + newFileSize;
    const newCount = userFiles.length + 1;
    const maxCacheSize = storageConfig.cache?.MAX_SIZE ?? 50 * 1024 * 1024; // Default to 50MB

    return (
      totalSize <= maxCacheSize &&
      newCount <= storageConfig.validation.MAX_FILES_PER_USER
    );
  } catch (error) {
    console.error('Error validating user storage:', error);
    return false;
  }
};