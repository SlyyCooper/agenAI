import { getAuth } from 'firebase/auth';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export const storageAPI = {
  // Upload file
  uploadFile: async (file: File) => {
    const auth = getAuth();
    const token = await auth.currentUser?.getIdToken();
    
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${BASE_URL}/api/storage/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });
    return response.json();
  },

  // Delete file
  deleteFile: async (filename: string) => {
    const auth = getAuth();
    const token = await auth.currentUser?.getIdToken();

    const response = await fetch(`${BASE_URL}/api/storage/delete/${filename}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    return response.json();
  },

  // List files
  listFiles: async () => {
    const auth = getAuth();
    const token = await auth.currentUser?.getIdToken();

    const response = await fetch(`${BASE_URL}/api/storage/list`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    return response.json();
  },

  // Download file
  downloadFile: async (filename: string) => {
    const auth = getAuth();
    const token = await auth.currentUser?.getIdToken();

    const response = await fetch(`${BASE_URL}/api/storage/download/${filename}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    return response.blob();
  },

  // Get file metadata
  getMetadata: async (filename: string) => {
    const auth = getAuth();
    const token = await auth.currentUser?.getIdToken();

    const response = await fetch(`${BASE_URL}/api/storage/metadata/${filename}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    return response.json();
  },

  // Get signed URL
  getSignedUrl: async (filename: string) => {
    const auth = getAuth();
    const token = await auth.currentUser?.getIdToken();

    const response = await fetch(`${BASE_URL}/api/storage/signed-url/${filename}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    return response.json();
  },

  // Update metadata
  updateMetadata: async (filename: string, metadata: Record<string, any>) => {
    const auth = getAuth();
    const token = await auth.currentUser?.getIdToken();

    const response = await fetch(`${BASE_URL}/api/storage/metadata/${filename}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(metadata),
    });
    return response.json();
  },

  // Copy file
  copyFile: async (sourceFilename: string, destinationFilename: string) => {
    const auth = getAuth();
    const token = await auth.currentUser?.getIdToken();

    const response = await fetch(`${BASE_URL}/api/storage/copy`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source_filename: sourceFilename,
        destination_filename: destinationFilename,
      }),
    });
    return response.json();
  },
};
