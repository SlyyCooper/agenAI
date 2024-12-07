import { renderHook, act } from '@testing-library/react';
import { useStorage } from '@/hooks/useStorage';
import { useAuth } from '@/config/firebase/AuthContext';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// Mock Firebase modules
vi.mock('firebase/storage');
vi.mock('@/config/firebase/AuthContext');

describe('useStorage Hook', () => {
  const mockUser = { uid: 'test-user-123' };
  const mockFile = new File(['test content'], 'test.txt', { type: 'text/plain' });
  const mockStorageRef = { fullPath: 'users/test-user-123/test.txt' };
  const mockDownloadURL = 'https://example.com/test.txt';

  beforeEach(() => {
    // Mock useAuth hook
    (useAuth as any).mockReturnValue({ user: mockUser });

    // Mock storage functions
    (getStorage as any).mockReturnValue({});
    (ref as any).mockReturnValue(mockStorageRef);
    (getDownloadURL as any).mockResolvedValue(mockDownloadURL);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should handle file upload with progress tracking', async () => {
    const { result } = renderHook(() => useStorage());

    // Mock uploadBytesResumable
    const mockUploadTask = {
      on: vi.fn((event, progressCallback, errorCallback, completeCallback) => {
        // Simulate upload progress
        progressCallback({ bytesTransferred: 50, totalBytes: 100 });
        // Simulate upload completion
        completeCallback();
      }),
      snapshot: { ref: mockStorageRef }
    };
    (uploadBytesResumable as any).mockReturnValue(mockUploadTask);

    let uploadResult;
    await act(async () => {
      uploadResult = await result.current.uploadFile(mockFile, 'test.txt');
    });

    expect(uploadResult).toBe(mockDownloadURL);
    expect(result.current.uploadProgress['test.txt']).toBe(50);
  });

  it('should handle upload errors', async () => {
    const { result } = renderHook(() => useStorage());

    // Mock upload failure
    const mockError = new Error('Upload failed');
    const mockUploadTask = {
      on: vi.fn((event, progressCallback, errorCallback) => {
        errorCallback(mockError);
      })
    };
    (uploadBytesResumable as any).mockReturnValue(mockUploadTask);

    await expect(
      act(async () => {
        await result.current.uploadFile(mockFile, 'test.txt');
      })
    ).rejects.toThrow('Upload failed');
  });

  it('should require authentication for operations', () => {
    // Mock unauthenticated state
    (useAuth as any).mockReturnValue({ user: null });

    const { result } = renderHook(() => useStorage());

    expect(
      result.current.uploadFile(mockFile, 'test.txt')
    ).rejects.toThrow('Must be logged in to upload files');
  });

  it('should handle file deletion', async () => {
    const { result } = renderHook(() => useStorage());

    const mockDeleteObject = vi.fn().mockResolvedValue(undefined);
    (ref as any).mockReturnValue({
      delete: mockDeleteObject
    });

    await act(async () => {
      await result.current.deleteFile('test.txt');
    });

    expect(mockDeleteObject).toHaveBeenCalled();
  });

  it('should list files with metadata', async () => {
    const { result } = renderHook(() => useStorage());

    const mockFiles = [
      {
        fullPath: 'users/test-user-123/file1.txt',
        getMetadata: () => Promise.resolve({
          contentType: 'text/plain',
          size: 1024,
          timeCreated: new Date().toISOString(),
          updated: new Date().toISOString()
        })
      }
    ];

    (ref as any).mockReturnValue({
      listAll: () => Promise.resolve({ items: mockFiles })
    });

    let files;
    await act(async () => {
      files = await result.current.listFiles('');
    });

    expect(files).toHaveLength(1);
    expect(files[0]).toHaveProperty('path');
    expect(files[0]).toHaveProperty('url');
    expect(files[0]).toHaveProperty('metadata');
  });

  it('should retry failed operations', async () => {
    const { result } = renderHook(() => useStorage());

    let attempts = 0;
    const mockOperation = vi.fn().mockImplementation(() => {
      attempts++;
      if (attempts < 3) {
        throw new Error('Temporary failure');
      }
      return Promise.resolve('success');
    });

    let operationResult;
    await act(async () => {
      operationResult = await result.current.retryOperation(mockOperation);
    });

    expect(operationResult).toBe('success');
    expect(attempts).toBe(3);
  });
}); 