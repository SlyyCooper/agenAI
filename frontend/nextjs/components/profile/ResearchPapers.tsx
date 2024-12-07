'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/config/firebase/AuthContext';
import { useStorage } from '@/hooks/useStorage';
import { ReportDocument } from '@/types/interfaces/api.types';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';

export default function ResearchPapers() {
  const { user } = useAuth();
  const { listFiles, getFileUrl } = useStorage();
  const [reports, setReports] = useState<ReportDocument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        // Fetch reports from API
        const response = await fetch('/api/reports');
        if (!response.ok) {
          throw new Error('Failed to fetch reports');
        }
        const data = await response.json();

        // Fetch storage files
        const storageFiles = await listFiles('research');
        
        // Map storage files to reports
        const updatedReports = await Promise.all(
          data.map(async (report: ReportDocument) => {
            try {
              // Get updated URLs for each file
              const fileUrls = await Promise.all(
                report.file_urls.map(async (url) => {
                  const urlParts = url.split('/');
                  const filename = urlParts[urlParts.length - 1];
                  if (!filename) return url;
                  
                  const storageFile = storageFiles.find(f => f.path.includes(filename));
                  if (storageFile) {
                    return await getFileUrl(storageFile.path);
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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!reports.length) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No research reports found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold mb-4">Research Reports</h2>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {reports.map((report) => (
          <div
            key={report.id}
            className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
          >
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-2 truncate">{report.title}</h3>
              <div className="text-sm text-gray-500 space-y-1">
                <p>Type: {report.report_type}</p>
                <p>Created: {format(new Date(report.created_at), 'MMM d, yyyy')}</p>
                <p>Files: {report.file_urls.length}</p>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {report.file_urls.map((url, index) => (
                  <a
                    key={index}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-3 py-1 border border-blue-500 text-blue-500 rounded-md hover:bg-blue-50 text-sm"
                  >
                    View Report {report.file_urls.length > 1 ? `#${index + 1}` : ''}
                  </a>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}