import { FileText, Download, Save } from 'lucide-react';
import { useState } from 'react';

export default function AccessReport({ accessData, report, onSave }) {
  const [isSaving, setIsSaving] = useState(false);

  function copyToClipboard(text) {
    if ('clipboard' in navigator) {
      navigator.clipboard.writeText(report);
    } else {
      document.execCommand('copy', true, report);
    }
  }

  const handleSave = async () => {
    if (!onSave) return;
    setIsSaving(true);
    try {
      await onSave();
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
          className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-full text-yellow-600 bg-yellow-50 hover:bg-yellow-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 transition-colors duration-150"
        >
          <Save className="w-4 h-4 mr-2" />
          {isSaving ? 'Saving...' : 'Save Report'}
        </button>
        
        {accessData?.pdf && (
          <a
            href={accessData.pdf}
            className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-full text-blue-600 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-150"
            target="_blank"
            rel="noopener noreferrer"
          >
            <FileText className="w-4 h-4 mr-2" />
            View PDF
          </a>
        )}
        {accessData?.docx && (
          <a
            href={accessData.docx}
            className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-full text-green-600 bg-green-50 hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors duration-150"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Download className="w-4 h-4 mr-2" />
            Download DOCX
          </a>
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
