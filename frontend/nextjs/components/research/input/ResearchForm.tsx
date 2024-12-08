import { FC } from 'react';
import { StorageFile } from '@/types/interfaces/api.types';
import FileUpload from '../Settings/FileUpload';
import ToneSelector from '../Settings/ToneSelector';

interface ResearchSettings {
  report_type: 'research_report' | 'detailed_report' | 'multi_agents';
  report_source: 'web' | 'local' | 'hybrid';
  tone: string;
  files: StorageFile[];
  maxTokens?: number;
  temperature?: number;
  model?: string;
}

interface ResearchFormProps {
  chatBoxSettings: ResearchSettings;
  setChatBoxSettings: React.Dispatch<React.SetStateAction<ResearchSettings>>;
}

const ResearchForm: FC<ResearchFormProps> = ({ chatBoxSettings, setChatBoxSettings }) => {
    const { report_type, report_source, tone } = chatBoxSettings;

    const onFormChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const { name, value } = e.target;
        setChatBoxSettings({
            ...chatBoxSettings,
            [name]: value
        });
    };

    const onToneChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setChatBoxSettings({
            ...chatBoxSettings,
            tone: e.target.value
        });
    };

    return (
        <form method="POST" className="mt-3 report_settings">
            <div className="form-group">
                <label htmlFor="report_type" className="agent_question">Report Type</label>
                <select 
                    id="report_type"
                    name="report_type" 
                    value={report_type} 
                    onChange={onFormChange} 
                    className="form-control drop-box" 
                    required
                    title="Select the type of report you want to generate"
                >
                    <option value="multi_agents">Multi Agents Report</option>
                    <option value="research_report">Summary - Short and fast (~2 min)</option>
                    <option value="detailed_report">Detailed - In depth and longer (~5 min)</option>
                </select>
            </div>
            <div className="form-group">
                <label htmlFor="report_source" className="agent_question">Report Source</label>
                <select 
                    id="report_source"
                    name="report_source" 
                    value={report_source} 
                    onChange={onFormChange} 
                    className="form-control drop-box" 
                    required
                    title="Select the source of information for your report"
                >
                    <option value="web">The Internet</option>
                    <option value="local">My Documents</option>
                    <option value="hybrid">Hybrid</option>
                </select>
            </div>
            {report_source === 'local' || report_source === 'hybrid' ? <FileUpload /> : null}
            <ToneSelector tone={tone} onToneChange={onToneChange} />
        </form>
    );
}

export default ResearchForm;