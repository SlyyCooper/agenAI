import React, { useCallback, useEffect, useState } from "react";
import { useDropzone } from 'react-dropzone';
import { useStorage } from '@/hooks/useStorage';
import { toast } from 'react-hot-toast';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['application/pdf', 'text/plain', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

const FileUpload = () => {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const { uploadFile, listFiles, deleteFile } = useStorage();

  const fetchFiles = useCallback(async () => {
    try {
      const fileList = await listFiles('research');
      setFiles(fileList);
    } catch (error) {
      console.error('Error fetching files:', error);
      toast.error('Failed to load files');
    }
  }, [listFiles]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const validateFile = (file) => {
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`File size must be less than ${MAX_FILE_SIZE / 1024 / 1024}MB`);
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      throw new Error('File type not supported');
    }
  };

  const onDrop = async (acceptedFiles) => {
    setUploading(true);
    try {
      for (const file of acceptedFiles) {
        try {
          validateFile(file);
          const timestamp = new Date().toISOString();
          const filename = `${timestamp}-${file.name}`;
          await uploadFile(file, `research/${filename}`);
          toast.success(`Uploaded ${file.name}`);
        } catch (error) {
          toast.error(`Failed to upload ${file.name}: ${error.message}`);
        }
      }
      fetchFiles();
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (file) => {
    try {
      await deleteFile(file.path);
      toast.success('File deleted successfully');
      fetchFiles();
    } catch (error) {
      console.error('Error deleting file:', error);
      toast.error('Failed to delete file');
    }
  };

  const { getRootProps, getInputProps } = useDropzone({ 
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    },
    maxSize: MAX_FILE_SIZE
  });

  return (
    <div className="mb-4 w-full">
      <div 
        {...getRootProps()} 
        className={`drop-box ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <input {...getInputProps()} disabled={uploading} />
        <p>{uploading ? 'Uploading...' : "Drag 'n' drop some files here, or click to select files"}</p>
        <p className="text-sm text-gray-500 mt-2">
          Supported files: PDF, TXT, DOCX (max {MAX_FILE_SIZE / 1024 / 1024}MB)
        </p>
      </div>
      {files.length > 0 && (
        <>
          <h2 className="text-gray-900 mt-2 text-xl">Uploaded Files</h2>
          <ul role="list" className="my-2 divide-y divide-gray-100">
            {files.map((file) => (
              <li key={file.path} className="flex justify-between gap-x-6 py-1">
                <div className="flex-1">
                  <span className="font-medium">{file.path.split('/').pop()}</span>
                  <span className="text-sm text-gray-500 ml-2">
                    ({(file.metadata.size / 1024).toFixed(1)} KB)
                  </span>
                </div>
                <button 
                  onClick={(e) => { 
                    e.preventDefault(); 
                    handleDelete(file);
                  }}
                  className="text-red-500 hover:text-red-700"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5"
                       stroke="currentColor" className="size-6">
                    <path strokeLinecap="round" strokeLinejoin="round"
                          d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"/>
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
};

export default FileUpload;