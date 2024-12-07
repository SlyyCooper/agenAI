import { FileText, Download, Save } from 'lucide-react';
import { useState } from 'react';
import { useStorage } from '@/hooks/useStorage';
import { toast } from 'react-hot-toast';

export default function AccessReport({ accessData, report, onSave }) {
  const [isSaving, setIsSaving] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const { downloadFile, getFileUrl } = useStorage();

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard');
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      toast.error('Failed to copy to clipboard');
    }
  };

  const handleDownload = async (path, type) => {
    setIsDownloading(true);
    try {
      const url = await getFileUrl(path);
      const response = await fetch(url);
      const blob = await response.blob();
      
      // Create download link
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `report.${type}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      
      toast.success(`Downloaded ${type.toUpperCase()} file`);
    } catch (error) {
      console.error(`Error downloading ${type} file:`, error);
      toast.error(`Failed to download ${type.toUpperCase()} file`);
      // Retry logic could be added here
    } finally {
      setIsDownloading(false);
    }
  };

  const handleSave = async () => {
    if (!onSave) return;
    setIsSaving(true);
    try {
      await onSave();
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
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-full text-yellow-600 bg-yellow-50 hover:bg-yellow-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="w-4 h-4 mr-2" />
          {isSaving ? 'Saving...' : 'Save Report'}
        </button>
        
        {accessData?.pdf && (
          <button
            onClick={() => handleDownload(accessData.pdf, 'pdf')}
            disabled={isDownloading}
            className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-full text-blue-600 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileText className="w-4 h-4 mr-2" />
            {isDownloading ? 'Downloading...' : 'View PDF'}
          </button>
        )}
        
        {accessData?.docx && (
          <button
            onClick={() => handleDownload(accessData.docx, 'docx')}
            disabled={isDownloading}
            className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-full text-green-600 bg-green-50 hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4 mr-2" />
            {isDownloading ? 'Downloading...' : 'Download DOCX'}
          </button>
        )}
        
        {accessData?.md && (
          <button
            onClick={() => copyToClipboard(report)}
            className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-full text-purple-600 bg-purple-50 hover:bg-purple-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors duration-150"
          >
            <FileText className="w-4 h-4 mr-2" />
            Copy Markdown
          </button>
        )}
      </div>
    </div>
  );
}
