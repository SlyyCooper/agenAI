import {getHost} from '../../helpers/getHost'
import { FileText, Download } from 'lucide-react';

export default function AccessReport({ accessData, report }) {
  const host = getHost();

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
      </div>
    </div>
  );
}
