// Import React library for creating React components
import React from 'react';

// Define a functional component named ToneSelector
// It receives two props: tone (current tone) and onToneChange (function to handle tone changes)
export default function ToneSelector({ tone, onToneChange }) {
  return (
    // Wrapper div for the form group
    <div className="form-group">
      {/* Label for the tone selector */}
      <label htmlFor="tone" className="agent_question">Tone </label>
      {/* Select element for choosing the tone */}
      <select 
        name="tone" 
        id="tone" 
        value={tone} // Set the current value to the tone prop
        onChange={onToneChange} // Call onToneChange function when selection changes
        className="form-control drop-box" 
        required // Make this field required
      >
        {/* Option elements for different tones */}
        {/* Each option has a value and descriptive text */}
        <option value="Objective">Objective - Impartial and unbiased presentation of facts and findings</option>
        <option value="Formal">Formal - Adheres to academic standards with sophisticated language and structure</option>
        <option value="Analytical">Analytical - Critical evaluation and detailed examination of data and theories</option>
        <option value="Persuasive">Persuasive - Convincing the audience of a particular viewpoint or argument</option>
        <option value="Informative">Informative - Providing clear and comprehensive information on a topic</option>
        <option value="Explanatory">Explanatory - Clarifying complex concepts and processes</option>
        <option value="Descriptive">Descriptive - Detailed depiction of phenomena, experiments, or case studies</option>
        <option value="Critical">Critical - Judging the validity and relevance of the research and its conclusions</option>
        <option value="Comparative">Comparative - Juxtaposing different theories, data, or methods to highlight differences and similarities</option>
        <option value="Speculative">Speculative - Exploring hypotheses and potential implications or future research directions</option>
        <option value="Reflective">Reflective - Considering the research process and personal insights or experiences</option>
        <option value="Narrative">Narrative - Telling a story to illustrate research findings or methodologies</option>
        <option value="Humorous">Humorous - Light-hearted and engaging, usually to make the content more relatable</option>
        <option value="Optimistic">Optimistic - Highlighting positive findings and potential benefits</option>
        <option value="Pessimistic">Pessimistic - Focusing on limitations, challenges, or negative outcomes</option>
      </select>
    </div>
  );
}