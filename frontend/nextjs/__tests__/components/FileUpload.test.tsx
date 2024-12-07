import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FileUpload } from '@/components/research/Settings/FileUpload';
import { useStorage } from '@/hooks/useStorage';
import { toast } from 'react-hot-toast';

// Mock dependencies
jest.mock('@/hooks/useStorage');
jest.mock('react-hot-toast');

describe('FileUpload Component', () => {
  const mockUploadFile = jest.fn();
  const mockListFiles = jest.fn();
  const mockDeleteFile = jest.fn();
  const mockOnUploadComplete = jest.fn();

  beforeEach(() => {
    // Setup mocks
    (useStorage as jest.Mock).mockReturnValue({
      uploadFile: mockUploadFile,
      listFiles: mockListFiles,
      deleteFile: mockDeleteFile,
      uploadProgress: {}
    });
    (toast.success as jest.Mock) = jest.fn();
    (toast.error as jest.Mock) = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders file upload component', () => {
    render(<FileUpload onUploadComplete={mockOnUploadComplete} />);
    expect(screen.getByText(/Drag 'n' drop some files here/i)).toBeInTheDocument();
  });

  it('handles file upload success', async () => {
    mockUploadFile.mockResolvedValueOnce({ url: 'test-url' });
    
    render(<FileUpload onUploadComplete={mockOnUploadComplete} />);
    
    const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
    const dropzone = screen.getByText(/Drag 'n' drop some files here/i);

    fireEvent.drop(dropzone, {
      dataTransfer: {
        files: [file]
      }
    });

    await waitFor(() => {
      expect(mockUploadFile).toHaveBeenCalledWith(file);
      expect(toast.success).toHaveBeenCalledWith('Uploaded test.pdf');
      expect(mockListFiles).toHaveBeenCalled();
    });
  });

  it('handles file upload error', async () => {
    mockUploadFile.mockRejectedValueOnce(new Error('Upload failed'));
    
    render(<FileUpload onUploadComplete={mockOnUploadComplete} />);
    
    const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
    const dropzone = screen.getByText(/Drag 'n' drop some files here/i);

    fireEvent.drop(dropzone, {
      dataTransfer: {
        files: [file]
      }
    });

    await waitFor(() => {
      expect(mockUploadFile).toHaveBeenCalledWith(file);
      expect(toast.error).toHaveBeenCalledWith('Failed to upload test.pdf');
    });
  });

  it('should validate file size', async () => {
    render(<FileUpload />);

    const largeFile = new File(['x'.repeat(11 * 1024 * 1024)], 'large.txt', { type: 'text/plain' });

    const dropzone = screen.getByText(/Drag 'n' drop some files here/i);
    fireEvent.drop(dropzone, {
      dataTransfer: {
        files: [largeFile]
      }
    });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('File size must be less than 10MB');
      expect(mockUploadFile).not.toHaveBeenCalled();
    });
  });

  it('should show upload progress', async () => {
    (useStorage as jest.Mock).mockReturnValue({
      uploadFile: mockUploadFile,
      listFiles: mockListFiles,
      deleteFile: mockDeleteFile,
      uploadProgress: {
        'test.txt': 50
      }
    });

    render(<FileUpload />);
    expect(screen.getByText('Uploading...')).toBeInTheDocument();
  });
}); 