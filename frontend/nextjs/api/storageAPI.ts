/**
 * @purpose: Provides frontend API client for Firebase Storage operations with authentication
 * @prereq: Requires configured Firebase Auth and valid API_URL environment variable
 * @reference: Interfaces with backend storage_routes.py endpoints
 * @maintenance: Update endpoint paths and auth headers when backend API changes
 */

import { getAuth } from 'firebase/auth';
import {
  FileUpload,
  UserReport,
  ReportDocument,
  FileMetadata,
  CreateReportRequest,
} from '@/types/interfaces/api.types';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

// Helper function to get Firebase token (similar to userprofileAPI)
const getFirebaseToken = async (): Promise<string> => {
  const auth = getAuth();
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('No user logged in');
  }
  return await currentUser.getIdToken();
};

export const storageAPI = {
  /**
   * @purpose: Uploads file to user's storage space with authentication
   * @prereq: User must be authenticated with valid Firebase token
   * @performance: Upload time scales with file size
   * @example: 
   *   const result = await storageAPI.uploadFile(fileObj);
   *   console.log(result.url);
   */
  uploadFile: async (file: File): Promise<FileMetadata> => {
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

  /**
   * @purpose: Deletes file from user's storage space
   * @prereq: File must exist in user's storage space
   * @invariant: Users can only delete their own files
   */
  deleteFile: async (filename: string): Promise<{ success: boolean }> => {
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

  /**
   * @purpose: Lists all files in user's storage space
   * @performance: O(n) where n is number of user files
   * @limitation: Returns up to 1000 files per request
   */
  listFiles: async (): Promise<FileMetadata[]> => {
    const auth = getAuth();
    const token = await auth.currentUser?.getIdToken();

    const response = await fetch(`${BASE_URL}/api/storage/list`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    return response.json();
  },

  /**
   * @purpose: Downloads file content with user isolation
   * @prereq: File must exist in user's storage space
   * @performance: Download time scales with file size
   * @limitation: Memory limited by file size
   */
  downloadFile: async (filename: string): Promise<Blob> => {
    const auth = getAuth();
    const token = await auth.currentUser?.getIdToken();

    const response = await fetch(`${BASE_URL}/api/storage/download/${filename}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    return response.blob();
  },

  /**
   * @purpose: Retrieves file metadata with user isolation
   * @reference: Maps to Firebase Storage metadata fields
   * @example: Returns size, content type, creation time
   */
  getMetadata: async (filename: string): Promise<FileMetadata> => {
    const auth = getAuth();
    const token = await auth.currentUser?.getIdToken();

    const response = await fetch(`${BASE_URL}/api/storage/metadata/${filename}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    return response.json();
  },

  /**
   * @purpose: Generates temporary access URL for file
   * @limitation: URL expires after configured duration (default 1 hour)
   * @security: URL grants read-only access to single file
   */
  getSignedUrl: async (filename: string): Promise<{ url: string; expires: string }> => {
    const auth = getAuth();
    const token = await auth.currentUser?.getIdToken();

    const response = await fetch(`${BASE_URL}/api/storage/signed-url/${filename}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    return response.json();
  },

  /**
   * @purpose: Updates file metadata with user isolation
   * @prereq: File must exist in user's storage space
   * @limitation: Cannot modify system metadata fields
   */
  updateMetadata: async (filename: string, metadata: Partial<FileMetadata>): Promise<FileMetadata> => {
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

  /**
   * @purpose: Copies file within user's storage space
   * @prereq: Source file must exist in user's storage
   * @performance: O(1) for same-bucket copies
   * @limitation: Cross-bucket copies not supported
   */
  copyFile: async (sourceFilename: string, destinationFilename: string): Promise<FileMetadata> => {
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

  /**
   * @purpose: Uploads report file with optional metadata
   * @prereq: User must be authenticated and have report upload permissions
   * @example: 
   *   await storageAPI.uploadReport(file, 'financial', 'Q4 2023');
   * @reference: Interfaces with reports endpoint in storage_routes.py
   */
  uploadReport: async (file: File, reportType?: string, query?: string): Promise<UserReport> => {
    const auth = getAuth();
    const token = await auth.currentUser?.getIdToken();
    
    const formData = new FormData();
    formData.append('file', file);
    if (reportType) formData.append('report_type', reportType);
    if (query) formData.append('query', query);

    const response = await fetch(`${BASE_URL}/api/storage/reports/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });
    return response.json();
  },

  /**
   * @purpose: Lists all reports in user's storage space
   * @performance: O(n) where n is number of reports
   * @reference: Maps to list_user_reports in storage_utils.py
   */
  listReports: async (): Promise<UserReport[]> => {
    const auth = getAuth();
    const token = await auth.currentUser?.getIdToken();

    const response = await fetch(`${BASE_URL}/api/storage/reports`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    return response.json();
  },

  /**
   * @purpose: Deletes report with user isolation
   * @prereq: Report must exist in user's storage space
   * @invariant: Users can only delete their own reports
   * @reference: Maps to delete_user_report in storage_utils.py
   */
  deleteReport: async (filename: string): Promise<{ success: boolean }> => {
    const auth = getAuth();
    const token = await auth.currentUser?.getIdToken();

    const response = await fetch(`${BASE_URL}/api/storage/reports/${filename}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    return response.json();
  },
};

export async function saveResearchReport(report: string, title: string, reportType: string): Promise<string> {
  try {
    // Convert report to Blob
    const reportBlob = new Blob([report], { type: 'text/markdown' });
    const filename = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${Date.now()}.md`;

    // Create form data
    const formData = new FormData();
    formData.append('file', reportBlob, filename);
    formData.append('content_type', 'text/markdown');
    formData.append('make_public', 'false');

    // Upload file
    const response = await fetch(`${BASE_URL}/api/storage/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to upload report');
    }

    const { url } = await response.json();

    // Create report document
    const createReportResponse = await fetch(`${BASE_URL}/api/reports`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title,
        file_urls: [url],
        query: title,
        report_type: reportType,
      } as CreateReportRequest),
    });

    if (!createReportResponse.ok) {
      throw new Error('Failed to create report document');
    }

    return url;
  } catch (error) {
    console.error('Error saving research report:', error);
    throw error;
  }
}
