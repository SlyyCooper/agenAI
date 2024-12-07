import { renderHook, act } from '@testing-library/react';
import { useStorage } from '@/hooks/useStorage';
import { getStorage, ref, uploadBytes, getDownloadURL, listAll, deleteObject } from 'firebase/storage';
import { toast } from 'react-hot-toast';

// Mock dependencies
jest.mock('firebase/storage');
jest.mock('react-hot-toast');

describe('useStorage Hook', () => {
  const mockFile = new File(['test'], 'test.txt', { type: 'text/plain' });
  const mockStorageRef = { fullPath: 'test/test.txt' };
  const mockDownloadUrl = 'https://example.com/test.txt';

  beforeEach(() => {
    // Setup mocks
    (ref as jest.Mock).mockReturnValue(mockStorageRef);
    (uploadBytes as jest.Mock).mockResolvedValue({ ref: mockStorageRef });
    (getDownloadURL as jest.Mock).mockResolvedValue(mockDownloadUrl);
    (listAll as jest.Mock).mockResolvedValue({ items: [] });
    (deleteObject as jest.Mock).mockResolvedValue(undefined);
    (toast.success as jest.Mock) = jest.fn();
    (toast.error as jest.Mock) = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should upload file successfully', async () => {
    const { result } = renderHook(() => useStorage());

    let uploadResult;
    await act(async () => {
      uploadResult = await result.current.uploadFile(mockFile);
    });

    expect(ref).toHaveBeenCalled();
    expect(uploadBytes).toHaveBeenCalledWith(mockStorageRef, mockFile);
    expect(getDownloadURL).toHaveBeenCalledWith(mockStorageRef);
    expect(uploadResult).toBe(mockDownloadUrl);
  });

  it('should handle upload error', async () => {
    const error = new Error('Upload failed');
    (uploadBytes as jest.Mock).mockRejectedValueOnce(error);

    const { result } = renderHook(() => useStorage());

    await act(async () => {
      await expect(result.current.uploadFile(mockFile)).rejects.toThrow('Upload failed');
    });
  });

  it('should list files successfully', async () => {
    const mockItems = [
      { fullPath: 'test/file1.txt' },
      { fullPath: 'test/file2.txt' }
    ];
    (listAll as jest.Mock).mockResolvedValueOnce({ items: mockItems });

    const { result } = renderHook(() => useStorage());

    let files;
    await act(async () => {
      files = await result.current.listFiles();
    });

    expect(ref).toHaveBeenCalled();
    expect(listAll).toHaveBeenCalled();
    expect(files).toHaveLength(2);
  });

  it('should delete file successfully', async () => {
    const { result } = renderHook(() => useStorage());

    await act(async () => {
      await result.current.deleteFile('test/test.txt');
    });

    expect(ref).toHaveBeenCalled();
    expect(deleteObject).toHaveBeenCalledWith(mockStorageRef);
  });

  it('should handle delete error', async () => {
    const error = new Error('Delete failed');
    (deleteObject as jest.Mock).mockRejectedValueOnce(error);

    const { result } = renderHook(() => useStorage());

    await act(async () => {
      await expect(result.current.deleteFile('test/test.txt')).rejects.toThrow('Delete failed');
    });
  });
}); 