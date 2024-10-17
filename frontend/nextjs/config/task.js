// This file defines the structure and content of a research task

export const task = {
  // Main task configuration
  "task": {
    "query": "Is AI in a hype cycle?", // The main research question
    "include_human_feedback": false, // Whether to include human feedback in the research process
    "model": "gpt-4o", // The AI model to be used for analysis
    "max_sections": 3, // Maximum number of sections in the report
    "publish_formats": {
      // Output formats for the final report
      "markdown": true,
      "pdf": true,
      "docx": true
    },
    "source": "web", // The primary source of information (web in this case)
    "follow_guidelines": true, // Whether to adhere to specified guidelines
    "guidelines": [
      // List of guidelines for the report
      "The report MUST fully answer the original question",
      "The report MUST be written in apa format",
      "The report MUST be written in english"
    ],
    "verbose": true // Whether to include detailed information in the output
  },
  
  // Research components
  "initial_research": "Initial research data here", // Placeholder for initial research findings
  "sections": ["Section 1", "Section 2"], // Main sections of the report
  "research_data": "Research data here", // Placeholder for collected research data
  
  // Report structure
  "title": "Research Title", // Title of the research report
  "headers": {
    // Headers for different sections of the report
    "introduction": "Introduction header",
    "table_of_contents": "Table of Contents header",
    "conclusion": "Conclusion header",
    "sources": "Sources header"
  },
  "date": "2023-10-01", // Date of the report
  "table_of_contents": "- Introduction\n- Section 1\n- Section 2\n- Conclusion", // Structure of the report
  "introduction": "Introduction content here", // Placeholder for introduction content
  "conclusion": "Conclusion content here", // Placeholder for conclusion content
  "sources": ["Source 1", "Source 2"], // List of sources used in the research
  "report": "Full report content here" // Placeholder for the complete report content
}