// multi_agents/gpt_researcher_nextjs/components/Task/Accordion.tsx

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

const plainTextFields = ['task', 'sections', 'headers', 'sources', 'research_data'];

const Accordion = ({ logs }: { logs: any[] }) => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const getLogHeaderText = (log: { text?: string; header: string }) => {
    if (log.header === 'differences') {
      return 'Updated Langgraph Fields: ' + Object.keys(JSON.parse(log.text || '{}').data).join(', ');
    } else {
      const regex = /📃 Source: (https?:\/\/[^\s]+)/;
      const match = log.text?.match(regex);
      let sourceUrl = match ? match[1] : '';
      return `Retrieved content from: ${sourceUrl}`;
    }
  };

  const renderLogContent = (log: { 
    header: string; 
    processedData?: Array<{ field: string; isMarkdown: boolean; htmlContent: string | object }>;
    text?: string;
  }) => {
    if (log.header === 'differences' && log.processedData) {
      return log.processedData.map((data, index) => (
        <div key={index} className="mb-4">
          <h4 className="font-semibold text-lg text-gray-700">{data.field}:</h4>
          {data.isMarkdown ? (
            <div className="markdown-content prose" dangerouslySetInnerHTML={{ __html: typeof data.htmlContent === 'string' ? data.htmlContent : '' }} />
          ) : (
            <p className="text-gray-600">{typeof data.htmlContent === 'object' ? JSON.stringify(data.htmlContent) : data.htmlContent}</p>
          )}
        </div>
      ));
    } else {
      return <p className="text-gray-600">{log.text || 'No content available'}</p>;
    }
  };

  const handleToggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="space-y-4">
      {logs.map((log, index) => (
        <div key={index} className="border border-gray-200 rounded-lg overflow-hidden">
          <button
            className="flex items-center justify-between w-full p-4 text-left bg-gray-50 hover:bg-gray-100 transition-colors"
            onClick={() => handleToggle(index)}
          >
            <span className="font-medium text-gray-700">{getLogHeaderText(log)}</span>
            {openIndex === index ? (
              <ChevronUp className="w-5 h-5 text-gray-500" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-500" />
            )}
          </button>
          {openIndex === index && (
            <div className="p-4 bg-white">
              {renderLogContent(log)}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default Accordion;
