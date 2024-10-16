import { useState } from 'react';
import { getHost } from '../../helpers/getHost';
import { FileText, Download, Save } from 'lucide-react';
import { useAuth } from '@/config/firebase/AuthContext';
import { createReport } from '@/config/firebase/backendService';
import { toast } from 'react-hot-toast';
import { auth } from '@/config/firebase/firebase';

export default function AccessReport({ accessData, report }) {
  const host = getHost();
  const { user } = useAuth();
  const [isSaving, setIsSaving] = useState(false);

  function copyToClipboard(text) {
    if ('clipboard' in navigator) {
      navigator.clipboard.writeText(report);
    } else {
      document.execCommand('copy', true, report);
    }
  }

  const getReportLink = (dataType) => {
    return `${host}/${accessData[dataType]}`;
  };

  const handleSaveReport = async () => {
    if (!user) {
      toast.error('Please log in to save the report');
      return;
    }
    setIsSaving(true);
    try {
      await createReport(user.uid, {
        title: accessData.task,
        content: report,
        createdAt: new Date().toISOString()
      });
      toast.success('Report saved successfully');
    } catch (error) {
      console.error('Error saving report:', error);
      toast.error('Failed to save report');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex items-center justify-between p-2 mb-4">
      <h3 className="text-sm font-semibold text-gray-800">Download Report:</h3>
      <div className="flex gap-2">
        <a
          href={getReportLink('pdf')}
          className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-full text-blue-600 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-150"
          target="_blank"
          rel="noopener noreferrer"
        >
          <FileText className="w-4 h-4 mr-2" />
          View PDF
        </a>
        <a
          href={getReportLink('docx')}
          className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-full text-green-600 bg-green-50 hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors duration-150"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Download className="w-4 h-4 mr-2" />
          Download DOCX
        </a>
        <button
          onClick={handleSaveReport}
          disabled={isSaving}
          className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-full text-purple-600 bg-purple-50 hover:bg-purple-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors duration-150"
        >
          <Save className="w-4 h-4 mr-2" />
          {isSaving ? 'Saving...' : 'Save to Account'}
        </button>
      </div>
    </div>
  );
}
