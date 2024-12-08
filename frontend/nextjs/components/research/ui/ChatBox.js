import React, { useState, useEffect } from 'react';
import ResearchForm from '../input/ResearchForm';
import Report from '../output/Report';
import AgentLogs from '../output/AgentLogs';
import AccessReport from '../output/AccessReport';
import { useAuth } from '@/config/firebase/AuthContext';

export default function ChatBox({ chatBoxSettings, setChatBoxSettings }) {
  const [agentLogs, setAgentLogs] = useState([]);
  const [report, setReport] = useState("");
  const [accessData, setAccessData] = useState({});
  const [socket, setSocket] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    const setupWebSocket = async () => {
      if (typeof window !== 'undefined' && user) {
        const { protocol } = window.location;
        const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const wsUrl = backendUrl.replace(/^https?:\/\//, '');
        const wsProtocol = protocol === 'https:' ? 'wss:' : 'ws:';
        const ws_uri = `${wsProtocol}//${wsUrl}/ws`;

        const newSocket = new WebSocket(ws_uri);
        setSocket(newSocket);

        newSocket.onopen = async () => {
          console.log('WebSocket connection opened');
          const idToken = await user.getIdToken();
          newSocket.send(JSON.stringify({ type: 'auth', token: idToken }));
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
          chatBoxSettings={chatBoxSettings} 
          setChatBoxSettings={setChatBoxSettings} 
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