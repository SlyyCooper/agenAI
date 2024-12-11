import React, { useState, useEffect } from 'react';
import ResearchForm from '../input/ResearchForm';
import Report from '../output/Report';
import AgentLogs from '../output/AgentLogs';
import AccessReport from '../output/AccessReport';
import { useAuth } from '@/config/firebase/AuthContext';
import { getHost } from '../../../helpers/getHost';
import { StorageFile, ResearchSettings, Tone } from '@/types/interfaces/api.types';

interface ChatBoxProps {
  chatBoxSettings: Partial<ResearchSettings>;
  setChatBoxSettings: React.Dispatch<React.SetStateAction<Partial<ResearchSettings>>>;
}

export default function ChatBox({ chatBoxSettings, setChatBoxSettings }: ChatBoxProps) {
  const [agentLogs, setAgentLogs] = useState<any[]>([]);
  const [report, setReport] = useState<string>("");
  const [accessData, setAccessData] = useState<Record<string, any>>({});
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    const setupWebSocket = async () => {
      if (typeof window !== 'undefined' && user) {
        const { fullWsUrl } = getHost();
        const newSocket = new WebSocket(fullWsUrl);
        setSocket(newSocket);

        newSocket.onopen = async () => {
          console.log('WebSocket connection opened');
          try {
            const idToken = await user.getIdToken();
            if (!idToken) {
              console.error('Failed to get ID token');
              return;
            }
            newSocket.send(JSON.stringify({ type: 'auth', token: idToken }));
          } catch (error) {
            console.error('Error getting ID token:', error);
          }
        };

        newSocket.onmessage = (event) => {
          const data = JSON.parse(event.data);
          if (data.type === 'logs') {
            setAgentLogs((prevLogs) => [...prevLogs, data]);
          } else if (data.type === 'report') {
            setReport((prevReport) => prevReport + data.output);
          } else if (data.type === 'path') {
            setAccessData(data);
          }
        };

        newSocket.onerror = (error) => {
          console.error('WebSocket connection error:', error);
          setTimeout(setupWebSocket, 5000);
        };

        return () => {
          if (newSocket && newSocket.readyState === WebSocket.OPEN) {
            newSocket.close();
          }
        };
      }
    };

    setupWebSocket();
  }, [user]);

  return (
    <div>
      <main className="container" id="form">
        <ResearchForm 
          settings={chatBoxSettings} 
          setSettings={setChatBoxSettings} 
        />

        {agentLogs?.length > 0 ? <AgentLogs agentLogs={agentLogs} /> : ''}
        <div className="margin-div">
          {report ? <Report report={report} /> : ''}
          {Object.keys(accessData).length !== 0 ? <AccessReport accessData={accessData} report={report} /> : ''}
        </div>
      </main>
    </div>
  );
}