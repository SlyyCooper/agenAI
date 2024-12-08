'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/config/firebase/AuthContext';
import { useStorage } from '@/hooks/useStorage';
import { ReportDocument, StorageFile } from '@/types/interfaces/api.types';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';
import { FileText, Download, Trash2, ExternalLink, Filter } from 'lucide-react';

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

const getFileTypeIcon = (url: string) => {
  if (url.endsWith('.pdf')) return '📄';
  if (url.endsWith('.docx')) return '📝';
  if (url.endsWith('.md')) return '📋';
  return '📄';
};

const getFileTypeName = (url: string) => {
  if (url.endsWith('.pdf')) return 'PDF';
  if (url.endsWith('.docx')) return 'Word';
  if (url.endsWith('.md')) return 'Markdown';
  return 'Document';
};

export default function ResearchPapers() {
  const { user } = useAuth();
  const { listFiles, getFileUrl, deleteFile } = useStorage();
  const [reports, setReports] = useState<StorageFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'title'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const retryOperation = useCallback(async <T,>(
    operation: () => Promise<T>, 
    retries = MAX_RETRIES
  ): Promise<T> => {
    try {
      return await operation();
    } catch (error) {
      if (retries > 0) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        return retryOperation(operation, retries - 1);
      }
      throw error;
    }
  }, []);

  const loadReports = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const files = await listFiles('reports');
      
      const sortedFiles = [...files].sort((a, b) => {
        if (sortBy === 'date') {
          const dateA = new Date(a.metadata.created).getTime();
          const dateB = new Date(b.metadata.created).getTime();
          return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
        } else {
          return sortOrder === 'asc' 
            ? a.name.localeCompare(b.name)
            : b.name.localeCompare(a.name);
        }
      });

      const filteredFiles = filter === 'all' 
        ? sortedFiles 
        : sortedFiles.filter(file => file.type.includes(filter));

      setReports(filteredFiles);
    } catch (error) {
      console.error('Error loading reports:', error);
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  }, [user, listFiles, filter, sortBy, sortOrder]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const handleDelete = async (report: StorageFile) => {
    if (!confirm('Are you sure you want to delete this report?')) return;

    try {
      // Delete from storage
      await deleteFile(report.path);
      
      // Refresh the list
      await loadReports();
      
      toast.success('Report deleted successfully');
    } catch (error) {
      console.error('Error deleting report:', error);
      toast.error('Failed to delete report');
    }
  };

  const handleDownload = async (report: StorageFile) => {
    try {
      const response = await fetch(report.url);
      const blob = await response.blob();
      
      // Create download link
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = report.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      
      toast.success('File downloaded successfully');
    } catch (error) {
      console.error('Error downloading file:', error);
      toast.error('Failed to download file');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const filteredAndSortedReports = reports
    .filter(report => filter === 'all' || report.type.includes(filter))
    .sort((a, b) => {
      const aValue = sortBy === 'date' ? new Date(a.created).getTime() : a.name;
      const bValue = sortBy === 'date' ? new Date(b.created).getTime() : b.name;
      return sortOrder === 'asc' ? (aValue > bValue ? 1 : -1) : (aValue < bValue ? 1 : -1);
    });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Research Reports</h2>
        <div className="flex gap-4">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-2 border rounded-md text-sm"
            aria-label="Filter reports by type"
            title="Filter reports by type"
          >
            <option value="all">All Types</option>
            <option value="research_report">Summary Report</option>
            <option value="detailed_report">Detailed Report</option>
            <option value="multi_agents">Multi Agents Report</option>
          </select>
          <select
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [by, order] = e.target.value.split('-');
              setSortBy(by as 'date' | 'title');
              setSortOrder(order as 'asc' | 'desc');
            }}
            className="px-3 py-2 border rounded-md text-sm"
            aria-label="Sort reports"
            title="Sort reports"
          >
            <option value="date-desc">Newest First</option>
            <option value="date-asc">Oldest First</option>
            <option value="title-asc">Title A-Z</option>
            <option value="title-desc">Title Z-A</option>
          </select>
        </div>
      </div>

      {!filteredAndSortedReports.length ? (
        <div className="text-center py-8">
          <FileText className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2 text-gray-500">No research reports found.</p>
          <a
            href="/research"
            className="mt-4 inline-block px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            Create New Report
          </a>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredAndSortedReports.map((report) => (
            <div
              key={report.path}
              className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">{report.name}</h3>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleDownload(report)}
                      className="text-blue-600 hover:text-blue-800"
                      aria-label={`Download ${report.name}`}
                      title={`Download ${report.name}`}
                    >
                      <Download className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(report)}
                      className="text-red-600 hover:text-red-800"
                      aria-label={`Delete ${report.name}`}
                      title={`Delete ${report.name}`}
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                <div className="text-sm text-gray-600">
                  <p>Type: {getFileTypeName(report.type)}</p>
                  <p>Size: {formatFileSize(report.size)}</p>
                  <p>Created: {format(new Date(report.created), 'PPp')}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}