import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import FileUpload from '@/components/research/Settings/FileUpload';
import { useStorage } from '@/hooks/useStorage';
import { toast } from 'react-hot-toast';

// Mock dependencies
vi.mock('@/hooks/useStorage');
vi.mock('react-hot-toast');

describe('FileUpload Component', () => {
  const mockUploadFile = vi.fn();
  const mockListFiles = vi.fn();
  const mockDeleteFile = vi.fn();

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Mock useStorage hook
    (useStorage as any).mockReturnValue({
      uploadFile: mockUploadFile,
      listFiles: mockListFiles,
      deleteFile: mockDeleteFile,
      uploadProgress: {}
    });

    // Mock initial file list
    mockListFiles.mockResolvedValue([
      {
        path: 'research/test.txt',
        url: 'https://example.com/test.txt',
        metadata: {
          contentType: 'text/plain',
          size: 1024,
          created: new Date(),
          updated: new Date()
        }
      }
    ]);
  });

  it('should render upload area and file list', async () => {
    render(<FileUpload />);

    // Check if upload area is rendered
    expect(screen.getByText(/Drag 'n' drop some files here/i)).toBeInTheDocument();
    
    // Wait for file list to be rendered
    await waitFor(() => {
      expect(screen.getByText('test.txt')).toBeInTheDocument();
    });
  });

  it('should handle file upload', async () => {
    render(<FileUpload />);

    const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
    mockUploadFile.mockResolvedValueOnce('https://example.com/test.txt');

    // Simulate file drop
    const dropzone = screen.getByText(/Drag 'n' drop some files here/i);
    fireEvent.drop(dropzone, {
      dataTransfer: {
        files: [file]
      }
    });

    await waitFor(() => {
      expect(mockUploadFile).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith('Uploaded test.txt');
      expect(mockListFiles).toHaveBeenCalled();
    });
  });

  it('should handle file deletion', async () => {
    render(<FileUpload />);

    // Wait for file list to be rendered
    await waitFor(() => {
      expect(screen.getByText('test.txt')).toBeInTheDocument();
    });

    // Find and click delete button
    const deleteButton = screen.getByRole('button');
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(mockDeleteFile).toHaveBeenCalledWith('research/test.txt');
      expect(toast.success).toHaveBeenCalledWith('File deleted successfully');
      expect(mockListFiles).toHaveBeenCalled();
    });
  });

  it('should validate file size', async () => {
    render(<FileUpload />);

    const largeFile = new File(['x'.repeat(11 * 1024 * 1024)], 'large.txt', { type: 'text/plain' });

    // Simulate file drop
    const dropzone = screen.getByText(/Drag 'n' drop some files here/i);
    fireEvent.drop(dropzone, {
      dataTransfer: {
        files: [largeFile]
      }
    });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('File size must be less than 10MB'));
      expect(mockUploadFile).not.toHaveBeenCalled();
    });
  });

  it('should validate file type', async () => {
    render(<FileUpload />);

    const invalidFile = new File(['test'], 'test.exe', { type: 'application/x-msdownload' });

    // Simulate file drop
    const dropzone = screen.getByText(/Drag 'n' drop some files here/i);
    fireEvent.drop(dropzone, {
      dataTransfer: {
        files: [invalidFile]
      }
    });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('File type not supported'));
      expect(mockUploadFile).not.toHaveBeenCalled();
    });
  });

  it('should handle upload errors', async () => {
    render(<FileUpload />);

    const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
    mockUploadFile.mockRejectedValueOnce(new Error('Upload failed'));

    // Simulate file drop
    const dropzone = screen.getByText(/Drag 'n' drop some files here/i);
    fireEvent.drop(dropzone, {
      dataTransfer: {
        files: [file]
      }
    });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('Failed to upload test.txt'));
    });
  });

  it('should show upload progress', async () => {
    // Mock useStorage with progress
    (useStorage as any).mockReturnValue({
      uploadFile: mockUploadFile,
      listFiles: mockListFiles,
      deleteFile: mockDeleteFile,
      uploadProgress: {
        'test.txt': 50
      }
    });

    render(<FileUpload />);

    // Check if uploading state is shown
    expect(screen.getByText('Uploading...')).toBeInTheDocument();
  });
}); 