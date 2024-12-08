import type { StorageConfig } from '../types/interfaces/api.types';

export const storageConfig: StorageConfig = {
  validation: {
    MAX_REPORT_SIZE: 10_000_000, // 10MB
    SUPPORTED_FORMATS: ['pdf', 'docx', 'md'],
    CLEANUP_AGE_DAYS: 7
  },
  paths: {
    reports: 'reports',
    research: 'research',
    temp: 'temp'
  }
};

export const getStoragePath = (userId: string, type: keyof StorageConfig['paths'], filename: string): string => {
  return `users/${userId}/${storageConfig.paths[type]}/${filename}`;
};

export const validateStorageFile = (file: File): void => {
  // Size validation
  if (file.size > storageConfig.validation.MAX_REPORT_SIZE) {
    throw new Error(`File size exceeds ${storageConfig.validation.MAX_REPORT_SIZE / 1_000_000}MB limit`);
  }

  // Format validation
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (!ext || !storageConfig.validation.SUPPORTED_FORMATS.includes(ext)) {
    throw new Error(`Unsupported file format. Supported formats: ${storageConfig.validation.SUPPORTED_FORMATS.join(', ')}`);
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