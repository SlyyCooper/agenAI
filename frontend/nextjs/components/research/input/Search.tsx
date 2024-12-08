// Search.js
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/config/firebase/AuthContext';
import ResearchForm from '@/components/research/input/ResearchForm';
import Report from '@/components/research/output/Report';
import AgentLogs from '@/components/research/output/AgentLogs';
import AccessReport from '@/components/research/output/AccessReport';
import { ResearchReportUrls, ResearchReportMetadata, StorageFile } from '@/types/interfaces/api.types';

interface ResearchSettings {
  report_type: 'research_report' | 'detailed_report' | 'multi_agents';
  report_source: 'web' | 'local' | 'hybrid';
  tone: string;
  files: StorageFile[];
  maxTokens?: number;
  temperature?: number;
  model?: string;
}

const Search = () => {
  const [task, setTask] = useState<string>('');
  const [reportType, setReportType] = useState<string>('');
  const [reportSource, setReportSource] = useState<string>('');
  const [agentLogs, setAgentLogs] = useState<string[]>([]);
  const [report, setReport] = useState<ResearchReportMetadata>({
    title: '',
    content: '',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    report_type: 'research_report',
    userId: '',
    metadata: {
      sources: [],
      topics: [],
      summary: ''
    }
  });
  const [accessData, setAccessData] = useState<ResearchReportUrls>({
    pdf: undefined,
    docx: undefined,
    md: undefined
  });
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const { user } = useAuth();

  const [chatBoxSettings, setChatBoxSettings] = useState<ResearchSettings>({
    report_type: 'research_report',
    report_source: 'web',
    tone: 'Objective',
    files: [],
    maxTokens: 1000,
    temperature: 0.7,
    model: 'gpt-4'
  });

  useEffect(() => {
    const setupWebSocket = async () => {
      if (typeof window !== 'undefined' && user) {
        const { protocol } = window.location;
        const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const wsUrl = backendUrl.replace(/^https?:\/\//, '');
        const wsProtocol = protocol === 'https:' ? 'wss:' : 'ws:';
        const ws_uri = `${wsProtocol}//${wsUrl}/backend/ws`;

        const newSocket = new WebSocket(ws_uri);
        setSocket(newSocket);

        newSocket.onopen = async () => {
          console.log('WebSocket connection opened');
          const idToken = await user.getIdToken();
          newSocket.send(JSON.stringify({ type: 'auth', token: idToken }));
        };

        newSocket.onmessage = (event) => {
          const data = JSON.parse(event.data);
          if (data.type === 'agentLogs') {
            setAgentLogs((prevLogs) => [...prevLogs, data.output]);
          } else if (data.type === 'report') {
            setReport(data.output);
          } else if (data.type === 'accessData') {
            setAccessData(data.output);
          }
        };

        newSocket.onerror = (error) => {
          console.error('WebSocket error:', error);
        };

        return () => {
          if (newSocket.readyState === WebSocket.OPEN) {
            newSocket.close();
          }
        };
      }
    };

    setupWebSocket();
  }, [user]);

  const handleFormSubmit = (
    task: string,
    reportType: string,
    reportSource: string
  ) => {
    setTask(task);
    setReportType(reportType);
    setReportSource(reportSource);

    // Prepare the data to send
    const data = 'start ' + JSON.stringify({
      task: task,
      report_type: reportType,
      report_source: reportSource,
    });

    // Send data to WebSocket server if connected
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(data);
    } else {
      console.error('WebSocket connection is not established.');
    }
  };

  const handleSaveReport = async () => {
    try {
      // Implement your save logic here
      console.log('Saving report...');
    } catch (error) {
      console.error('Error saving report:', error);
    }
  };

  return (
    <div>
      <ResearchForm
        chatBoxSettings={chatBoxSettings}
        setChatBoxSettings={setChatBoxSettings}
      />
      {agentLogs.length > 0 && <AgentLogs agentLogs={agentLogs} />}
      {report && <Report report={report} />}
      {accessData && (
        <AccessReport 
          accessData={accessData} 
          report={report} 
          onSave={handleSaveReport} 
        />
      )}
    </div>
  );
};

export default Search;