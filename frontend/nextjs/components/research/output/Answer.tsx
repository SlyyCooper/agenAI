import Image from "next/image";
import { Toaster, toast } from "react-hot-toast";
import { useEffect, useState } from 'react';
import { remark } from 'remark';
import html from 'remark-html';
import { Copy } from 'lucide-react'; // Import the Copy icon from lucide-react

export default function Answer({ answer }: { answer: string }) {
  async function markdownToHtml(markdown: string) {
    try {
      const result = await remark().use(html).process(markdown);
      console.log('Markdown to HTML conversion result:', result.toString());
      return result.toString();
    } catch (error) {
      console.error('Error converting Markdown to HTML:', error);
      return ''; // Handle error gracefully, return empty string or default content
    }
  }

  const [htmlContent, setHtmlContent] = useState('');

  useEffect(() => {
    markdownToHtml(answer).then((html) => setHtmlContent(html));
  }, [answer]);
  
  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
      <div className="flex items-center justify-end mb-4">
        {answer && (
          <button
            aria-label="Copy answer to clipboard"
            onClick={() => {
              navigator.clipboard.writeText(answer.trim());
              toast("Answer copied to clipboard", {
                icon: "✂️",
              });
            }}
            className="text-blue-500 hover:text-blue-600 transition-colors"
          >
            <Copy className="w-5 h-5" />
          </button>
        )}
      </div>
      <div className="text-gray-700">
        {answer ? (
          <div className="answer-container">
            <div className="markdown-content" dangerouslySetInnerHTML={{ __html: htmlContent }} />
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="h-4 w-full animate-pulse rounded-md bg-gray-200" />
            <div className="h-4 w-3/4 animate-pulse rounded-md bg-gray-200" />
            <div className="h-4 w-5/6 animate-pulse rounded-md bg-gray-200" />
            <div className="h-4 w-2/3 animate-pulse rounded-md bg-gray-200" />
          </div>
        )}
      </div>
      <Toaster
        position="top-center"
        reverseOrder={false}
        toastOptions={{ duration: 2000 }}
      />
      <style jsx>{`
        .answer-container {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', sans-serif;
        }
        .markdown-content {
          /* Reset margins and paddings */
          margin: 0;
          padding: 0;
          /* Heading styles */
          h1, h2, h3, h4, h5, h6 {
            font-weight: 600;
            line-height: 1.25;
            margin-top: 1.5em;
            margin-bottom: 0.5em;
          }
          h1 { font-size: 2em; }
          h2 { font-size: 1.5em; }
          h3 { font-size: 1.25em; }
          h4 { font-size: 1em; }
          h5 { font-size: 0.875em; }
          h6 { font-size: 0.85em; }
          /* Paragraph and list styles */
          p, ul, ol {
            margin-bottom: 1em;
          }
          ul, ol {
            padding-left: 1.5em;
          }
          /* Link styles */
          a {
            color: #0071e3;
            text-decoration: none;
          }
          a:hover {
            text-decoration: underline;
          }
          /* Code block styles */
          pre {
            background-color: #f5f7fa;
            border-radius: 0.375rem;
            padding: 1em;
            overflow-x: auto;
          }
          code {
            font-family: 'SF Mono', 'Menlo', 'Monaco', 'Courier New', monospace;
            font-size: 0.9em;
          }
        }
      `}</style>
    </div>
  );
}
