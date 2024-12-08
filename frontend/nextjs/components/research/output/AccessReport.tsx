import { FC } from 'react';
import { FileText, Download, Save } from 'lucide-react';
import { useState } from 'react';
import { useStorage } from '@/hooks/useStorage';
import { toast } from 'react-hot-toast';
import { StorageFile, ResearchReportUrls, ResearchReportMetadata } from '@/types/interfaces/api.types';

interface AccessReportProps {
  accessData: Record<string, any>;
  report: ResearchReportMetadata | string;
  onSave?: () => Promise<void>;
}

const isResearchReportMetadata = (report: ResearchReportMetadata | string): report is ResearchReportMetadata => {
  return typeof report === 'object' && report !== null && 'title' in report;
};

const AccessReport: FC<AccessReportProps> = ({ accessData, report, onSave }) => {
  const [isSaving, setIsSaving] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const { downloadFile, getFileUrl } = useStorage();

  const copyToClipboard = async (text: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard');
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      toast.error('Failed to copy to clipboard');
    }
  };

  const handleDownload = async (path: string, type: string): Promise<void> => {
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
    } finally {
      setIsDownloading(false);
    }
  };

  const handleSave = async () => {
    if (onSave) {
      setIsSaving(true);
      try {
        await onSave();
      } finally {
        setIsSaving(false);
      }
    }
  };

  if (!isResearchReportMetadata(report)) {
    return null; // or some loading state
  }

  return (
    <div className="flex flex-col space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">{report.title}</h2>
        {onSave && (
          <button
            onClick={handleSave}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <Save className="w-5 h-5 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                <span>Save Report</span>
              </>
            )}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {accessData.pdf && (
          <button
            onClick={() => handleDownload(accessData.pdf!, 'pdf')}
            disabled={isDownloading}
            className="flex items-center justify-center space-x-2 p-4 border rounded hover:bg-gray-50"
          >
            <FileText className="w-5 h-5" />
            <span>Download PDF</span>
          </button>
        )}
        {accessData.docx && (
          <button
            onClick={() => handleDownload(accessData.docx!, 'docx')}
            disabled={isDownloading}
            className="flex items-center justify-center space-x-2 p-4 border rounded hover:bg-gray-50"
          >
            <Download className="w-5 h-5" />
            <span>Download DOCX</span>
          </button>
        )}
        {accessData.md && (
          <button
            onClick={() => copyToClipboard(accessData.md!)}
            className="flex items-center justify-center space-x-2 p-4 border rounded hover:bg-gray-50"
          >
            <FileText className="w-5 h-5" />
            <span>Copy Markdown</span>
          </button>
        )}
      </div>
    </div>
  );
}

export default AccessReport;
