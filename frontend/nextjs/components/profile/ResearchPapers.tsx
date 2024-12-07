'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/config/firebase/AuthContext';
import { useStorage } from '@/hooks/useStorage';
import { ReportDocument } from '@/types/interfaces/api.types';
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
  const [reports, setReports] = useState<ReportDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'title'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const retryOperation = async <T,>(operation: () => Promise<T>, retries = MAX_RETRIES): Promise<T> => {
    try {
      return await operation();
    } catch (error) {
      if (retries > 0) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        return retryOperation(operation, retries - 1);
      }
      throw error;
    }
  };

  useEffect(() => {
    const fetchReports = async () => {
      try {
        setLoading(true);
        
        // Fetch reports with retry
        const response = await retryOperation(async () => {
          const res = await fetch('/api/reports');
          if (!res.ok) throw new Error('Failed to fetch reports');
          return res;
        });
        
        const data = await response.json();
        const storageFiles = await listFiles('research');
        
        // Map storage files to reports with retry
        const updatedReports = await Promise.all(
          data.map(async (report: ReportDocument) => {
            try {
              const fileUrls = await Promise.all(
                report.file_urls.map(async (url) => {
                  const urlParts = url.split('/');
                  const filename = urlParts[urlParts.length - 1];
                  if (!filename) return url;
                  
                  const storageFile = storageFiles.find(f => f.path.includes(filename));
                  if (storageFile) {
                    return await retryOperation(() => getFileUrl(storageFile.path));
                  }
                  return url;
                })
              );

              return {
                ...report,
                file_urls: fileUrls.filter(Boolean)
              };
            } catch (error) {
              console.error('Error updating report URLs:', error);
              return report;
            }
          })
        );

        setReports(updatedReports);
      } catch (error) {
        console.error('Error fetching reports:', error);
        toast.error('Failed to load research papers');
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchReports();
    }
  }, [user, listFiles, getFileUrl]);

  const handleDelete = async (report: ReportDocument) => {
    if (!confirm('Are you sure you want to delete this report?')) return;

    try {
      // Delete from storage
      await Promise.all(report.file_urls.map(url => {
        const filename = url.split('/').pop();
        return filename ? deleteFile(`research/${filename}`) : Promise.resolve();
      }));

      // Delete from database
      const response = await fetch(`/api/reports/${report.id}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete report');

      // Update UI
      setReports(prev => prev.filter(r => r.id !== report.id));
      toast.success('Report deleted successfully');
    } catch (error) {
      console.error('Error deleting report:', error);
      toast.error('Failed to delete report');
    }
  };

  const filteredAndSortedReports = reports
    .filter(report => filter === 'all' || report.report_type === filter)
    .sort((a, b) => {
      const aValue = sortBy === 'date' ? new Date(a.created_at).getTime() : a.title;
      const bValue = sortBy === 'date' ? new Date(b.created_at).getTime() : b.title;
      return sortOrder === 'asc' 
        ? aValue > bValue ? 1 : -1
        : aValue < bValue ? 1 : -1;
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
              key={report.id}
              className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
            >
              <div className="p-6">
                <h3 className="text-lg font-semibold mb-2 truncate">{report.title}</h3>
                <div className="text-sm text-gray-500 space-y-1">
                  <p className="flex items-center gap-1">
                    <Filter className="h-4 w-4" />
                    Type: {report.report_type.replace(/_/g, ' ')}
                  </p>
                  <p className="flex items-center gap-1">
                    <FileText className="h-4 w-4" />
                    Files: {report.file_urls.length}
                  </p>
                  <p className="flex items-center gap-1">
                    Created: {format(new Date(report.created_at), 'MMM d, yyyy')}
                  </p>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {report.file_urls.map((url, index) => (
                    <a
                      key={index}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-3 py-1 border border-blue-500 text-blue-500 rounded-md hover:bg-blue-50 text-sm gap-1"
                      title={`View ${getFileTypeName(url)} version`}
                    >
                      <span className="mr-1">{getFileTypeIcon(url)}</span>
                      {getFileTypeName(url)}
                    </a>
                  ))}
                  <button
                    onClick={() => handleDelete(report)}
                    className="inline-flex items-center px-3 py-1 border border-red-500 text-red-500 rounded-md hover:bg-red-50 text-sm gap-1"
                    title="Delete report"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}