import React, { useState, useCallback } from 'react';
import { useStorage } from '@/hooks/useStorage';
import { useAuth } from '@/config/firebase/AuthContext';
import { toast } from 'react-hot-toast';
import { StorageFile } from '@/types/interfaces/api.types';

interface FileUploadProps {
  onUploadComplete?: (file: StorageFile) => Promise<void>;
}

type ProgressStep = 0 | 10 | 20 | 30 | 40 | 50 | 60 | 70 | 80 | 90 | 100;

const progressWidthClasses: Record<ProgressStep, string> = {
  0: 'w-0',
  10: 'w-1/12',
  20: 'w-2/12',
  30: 'w-3/12',
  40: 'w-4/12',
  50: 'w-1/2',
  60: 'w-7/12',
  70: 'w-8/12',
  80: 'w-9/12',
  90: 'w-11/12',
  100: 'w-full'
};

const getProgressStep = (progress: number): ProgressStep => {
  const step = Math.round(progress / 10) * 10;
  return (Math.min(Math.max(step, 0), 100) as ProgressStep);
};

export default function FileUpload({ onUploadComplete }: FileUploadProps) {
  const { user } = useAuth();
  const { uploadFile, validateFile, uploadProgress } = useStorage();
  const [isDragging, setIsDragging] = useState(false);
  const [currentFile, setCurrentFile] = useState<File | null>(null);

  const handleFileUpload = useCallback(async (file: File) => {
    if (!user) {
      toast.error('Please sign in to upload files');
      return;
    }

    try {
      setCurrentFile(file);

      // Validate file before upload
      await validateFile(file);

      // Upload file
      const path = `users/${user.uid}/research/${file.name}`;
      const url = await uploadFile(file, path);

      // Notify parent component
      if (onUploadComplete) {
        await onUploadComplete({
          name: file.name,
          path,
          type: file.type,
          size: file.size,
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
          metadata: {
            contentType: file.type,
            size: file.size,
            created: new Date(),
            updated: new Date(),
            customMetadata: {},
          },
          url,
        });
      }

      toast.success('File uploaded successfully');
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to upload file');
    } finally {
      setCurrentFile(null);
    }
  }, [user, uploadFile, validateFile, onUploadComplete]);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      await handleFileUpload(files[0]);
    }
  }, [handleFileUpload]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await handleFileUpload(files[0]);
    }
  }, [handleFileUpload]);

  const getUploadProgress = () => {
    if (!currentFile) return 0;
    const progress = uploadProgress[`users/${user?.uid}/research/${currentFile.name}`];
    return typeof progress === 'number' ? progress : 0;
  };

  return (
    <div
      className={`relative border-2 border-dashed rounded-lg p-6 transition-colors duration-200 ease-in-out ${
        isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
      }`}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      role="presentation"
    >
      <label htmlFor="file-upload" className="sr-only">
        Upload file (PDF, DOC, DOCX, TXT, or MD)
      </label>
      <input
        id="file-upload"
        name="file-upload"
        type="file"
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        onChange={handleFileSelect}
        accept=".pdf,.doc,.docx,.txt,.md"
        title="Choose a file to upload"
        aria-label="Choose a file to upload"
        aria-describedby="file-upload-description"
      />
      
      <div className="text-center">
        <p id="file-upload-description" className="text-sm text-gray-600">
          {isDragging ? 'Drop your file here' : 'Drag and drop your file here, or click to select'}
        </p>
        <p className="text-xs text-gray-500 mt-2" id="file-upload-formats">
          Supported formats: PDF, DOC, DOCX, TXT, MD
        </p>
      </div>

      {currentFile && (
        <div className="mt-4" aria-live="polite">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>Current file: {currentFile.name}</span>
            <span>Upload progress: {Math.round(getUploadProgress())}%</span>
          </div>
          <div 
            className="w-full bg-gray-200 rounded-full h-2 mt-1"
            role="presentation"
          >
            <div
              className={`bg-blue-500 rounded-full h-2 transition-all duration-300 ${
                progressWidthClasses[getProgressStep(getUploadProgress())]
              }`}
              role="progressbar"
              aria-valuenow={Math.round(getUploadProgress())}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Upload progress"
            />
          </div>
        </div>
      )}
    </div>
  );
}