import React from 'react';

interface Paper {
  id: string;
  title: string;
  date: string;
}

export default function ResearchPapers({ papers }: { papers: Paper[] }) {
  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Research Papers</h2>
      {papers.length > 0 ? (
        <ul>
          {papers.map((paper) => (
            <li key={paper.id} className="mb-2">
              <span className="font-medium">{paper.title}</span> - {paper.date}
            </li>
          ))}
        </ul>
      ) : (
        <p>No research papers found.</p>
      )}
    </div>
  );
}