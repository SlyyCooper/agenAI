import { useEffect, useState } from 'react';
import { remark } from 'remark';
import html from 'remark-html';
import Accordion from '@/components/research/output/Accordion';
import { FileText } from 'lucide-react';

const LogMessage = ({ logs }: { logs: any[] }) => {
  const [processedLogs, setProcessedLogs] = useState<any[]>([]);

  useEffect(() => {
    const processLogs = async () => {
      const newLogs = await Promise.all(logs.map(async (log) => {
        if (log.header === 'differences') {
          const data = JSON.parse(log.text).data;
          const processedData = await Promise.all(Object.keys(data).map(async (field) => {
            const fieldValue = data[field].after || data[field].before;
            if (!plainTextFields.includes(field)) {
              const htmlContent = await markdownToHtml(fieldValue);
              return { field, htmlContent, isMarkdown: true };
            }
            return { field, htmlContent: fieldValue, isMarkdown: false };
          }));
          return { ...log, processedData };
        }
        return log;
      }));
      setProcessedLogs(newLogs);
    };

    processLogs();
  }, [logs]);

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
      <div className="flex items-center gap-2 mb-4">
        <FileText className="w-5 h-5 text-blue-500" />
        <h3 className="text-xl font-bold text-gray-800">Log Messages</h3>
      </div>
      <div className="space-y-4">
        {processedLogs.map((log, index) => {
          if (log.header === 'subquery_context_window' || log.header === 'differences') {
            return <Accordion key={index} logs={[log]} />;
          } else {
            return (
              <div key={index} className="p-4 bg-gray-100 rounded-lg">
                <p className="text-gray-700">{log.text}</p>
              </div>
            );
          }
        })}
      </div>
    </div>
  );
};

const markdownToHtml = async (markdown: string): Promise<string> => {
  try {
    const result = await remark().use(html).process(markdown);
    return result.toString();
  } catch (error) {
    console.error('Error converting Markdown to HTML:', error);
    return '';
  }
};

const plainTextFields = ['task', 'sections', 'headers', 'sources', 'research_data'];

export default LogMessage;
