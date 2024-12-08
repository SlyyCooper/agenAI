import { FC, useState, ChangeEvent } from 'react';
import { ResearchSettings, ReportType, ReportSource, Tone, Retriever } from '@/types/interfaces/api.types';
import FileUpload from '../Settings/FileUpload';
import ToneSelector from '../Settings/ToneSelector';

const DEFAULT_SETTINGS: Partial<ResearchSettings> = {
  report_type: 'research_report',
  report_source: 'web',
  report_format: 'APA',
  total_words: 1200,
  max_subtopics: 5,
  tone: 'balanced' as Tone,
  llm_provider: 'openai',
  llm_model: 'gpt-4o',
  temperature: 0.4,
  llm_temperature: 0.55,
  retrievers: ['tavily'],
  max_search_results_per_query: 5,
  similarity_threshold: 0.42,
  fast_token_limit: 4000,
  smart_token_limit: 6000,
  summary_token_limit: 1200,
  browse_chunk_max_length: 8192,
  max_iterations: 3,
  scraper: 'bs'
};

interface ResearchFormProps {
  settings: Partial<ResearchSettings>;
  setSettings: React.Dispatch<React.SetStateAction<Partial<ResearchSettings>>>;
}

const ResearchForm: FC<ResearchFormProps> = ({ settings, setSettings }) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const onSettingChange = (name: keyof ResearchSettings, value: any) => {
    setSettings(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleToneChange = (e: ChangeEvent<HTMLSelectElement>) => {
    onSettingChange('tone', e.target.value as Tone);
  };

  const VALID_RETRIEVERS: Retriever[] = [
    'arxiv', 'bing', 'custom', 'duckduckgo', 'exa', 'google',
    'searchapi', 'searx', 'semantic_scholar', 'serpapi',
    'serper', 'tavily', 'pubmed_central'
  ];

  return (
    <form method="POST" className="mt-3 space-y-4">
      {/* Basic Settings */}
      <div className="space-y-4">
        <div className="form-group">
          <label htmlFor="report_type" className="block text-sm font-medium">
            Report Type
          </label>
          <select
            id="report_type"
            name="report_type"
            value={settings.report_type}
            onChange={(e) => onSettingChange('report_type', e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
          >
            <option value="research_report">Summary - Short and fast (~2 min)</option>
            <option value="detailed_report">Detailed - In depth and longer (~5 min)</option>
            <option value="multi_agents">Multi Agents Report</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="report_source" className="block text-sm font-medium">
            Report Source
          </label>
          <select
            id="report_source"
            name="report_source"
            value={settings.report_source}
            onChange={(e) => onSettingChange('report_source', e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
          >
            <option value="web">The Internet</option>
            <option value="local">My Documents</option>
            <option value="hybrid">Hybrid</option>
          </select>
        </div>

        {(settings.report_source === 'local' || settings.report_source === 'hybrid') && (
          <FileUpload />
        )}

        <ToneSelector
          tone={settings.tone || DEFAULT_SETTINGS.tone!}
          onToneChange={handleToneChange}
        />
      </div>

      {/* Advanced Settings Toggle */}
      <button
        type="button"
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="text-blue-600 hover:text-blue-800"
      >
        {showAdvanced ? 'Hide Advanced Settings' : 'Show Advanced Settings'}
      </button>

      {/* Advanced Settings */}
      {showAdvanced && (
        <div className="space-y-4 border-t pt-4 mt-4">
          {/* Research Settings */}
          <div className="space-y-2">
            <h3 className="font-medium">Research Settings</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="report_format" className="block text-sm">
                  Report Format
                </label>
                <input
                  type="text"
                  id="report_format"
                  value={settings.report_format || DEFAULT_SETTINGS.report_format}
                  onChange={(e) => onSettingChange('report_format', e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                />
              </div>
              <div>
                <label htmlFor="total_words" className="block text-sm">
                  Total Words
                </label>
                <input
                  type="number"
                  id="total_words"
                  value={settings.total_words || DEFAULT_SETTINGS.total_words}
                  onChange={(e) => onSettingChange('total_words', parseInt(e.target.value))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                />
              </div>
            </div>
          </div>

          {/* LLM Settings */}
          <div className="space-y-2">
            <h3 className="font-medium">LLM Settings</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="llm_provider" className="block text-sm">
                  LLM Provider
                </label>
                <input
                  type="text"
                  id="llm_provider"
                  value={settings.llm_provider || DEFAULT_SETTINGS.llm_provider}
                  onChange={(e) => onSettingChange('llm_provider', e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                />
              </div>
              <div>
                <label htmlFor="llm_model" className="block text-sm">
                  LLM Model
                </label>
                <input
                  type="text"
                  id="llm_model"
                  value={settings.llm_model || DEFAULT_SETTINGS.llm_model}
                  onChange={(e) => onSettingChange('llm_model', e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                />
              </div>
            </div>
          </div>

          {/* Search Settings */}
          <div className="space-y-2">
            <h3 className="font-medium">Search Settings</h3>
            <div>
              <label htmlFor="retrievers" className="block text-sm">
                Retrievers
              </label>
              <select
                multiple
                id="retrievers"
                value={settings.retrievers || DEFAULT_SETTINGS.retrievers}
                onChange={(e) => {
                  const selected = Array.from(e.target.selectedOptions, option => option.value as Retriever);
                  onSettingChange('retrievers', selected);
                }}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
              >
                {VALID_RETRIEVERS.map(retriever => (
                  <option key={retriever} value={retriever}>
                    {retriever}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Token Settings */}
          <div className="space-y-2">
            <h3 className="font-medium">Token Settings</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="fast_token_limit" className="block text-sm">
                  Fast Token Limit
                </label>
                <input
                  type="number"
                  id="fast_token_limit"
                  value={settings.fast_token_limit || DEFAULT_SETTINGS.fast_token_limit}
                  onChange={(e) => onSettingChange('fast_token_limit', parseInt(e.target.value))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                />
              </div>
              <div>
                <label htmlFor="smart_token_limit" className="block text-sm">
                  Smart Token Limit
                </label>
                <input
                  type="number"
                  id="smart_token_limit"
                  value={settings.smart_token_limit || DEFAULT_SETTINGS.smart_token_limit}
                  onChange={(e) => onSettingChange('smart_token_limit', parseInt(e.target.value))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                />
              </div>
            </div>
          </div>

          {/* Agent Settings */}
          <div className="space-y-2">
            <h3 className="font-medium">Agent Settings</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="agent_role" className="block text-sm">
                  Agent Role
                </label>
                <input
                  type="text"
                  id="agent_role"
                  value={settings.agent_role || ''}
                  onChange={(e) => onSettingChange('agent_role', e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                />
              </div>
              <div>
                <label htmlFor="max_iterations" className="block text-sm">
                  Max Iterations
                </label>
                <input
                  type="number"
                  id="max_iterations"
                  value={settings.max_iterations || DEFAULT_SETTINGS.max_iterations}
                  onChange={(e) => onSettingChange('max_iterations', parseInt(e.target.value))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </form>
  );
};

export default ResearchForm;