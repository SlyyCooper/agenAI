// Import necessary React hooks and components
import React, { useState, useEffect } from 'react';
import ResearchForm from '../Task/ResearchForm';
import Report from '../Task/Report';
import AgentLogs from '../Task/AgentLogs';
import AccessReport from '../Task/AccessReport';

// Define the main ChatBox component
export default function ChatBox({ chatBoxSettings, setChatBoxSettings }) {
  // State variables to manage different aspects of the chat
  const [agentLogs, setAgentLogs] = useState([]); // Stores logs from the agent
  const [report, setReport] = useState(""); // Stores the generated report
  const [accessData, setAccessData] = useState({}); // Stores access-related data
  const [socket, setSocket] = useState(null); // Manages WebSocket connection

  // useEffect hook to set up WebSocket connection when the component mounts
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Construct WebSocket URI based on current location
      const { protocol, pathname } = window.location;
      let { host } = window.location;
      host = host.includes('localhost') ? 'localhost:8000' : host;
      const ws_uri = `${protocol === 'https:' ? 'wss:' : 'ws:'}//${host}${pathname}ws`;
      
      // Create new WebSocket connection
      const newSocket = new WebSocket(ws_uri);
      setSocket(newSocket);

      // Set up message handler for incoming WebSocket messages
      newSocket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'logs') {
          // Update agent logs
          setAgentLogs((prevLogs) => [...prevLogs, data]);
        } else if (data.type === 'report') {
          // Update report content
          setReport((prevReport) => prevReport + data.output);
        } else if (data.type === 'path') {
          // Update access data
          setAccessData(data);
        }
      };

      // Clean up function to close WebSocket when component unmounts
      return () => {
        newSocket.close();
      };
    }
  }, []); // Empty dependency array means this effect runs once on mount

  // Render the ChatBox component
  return (
    <div>
      <main className="container" id="form">
        {/* Render the ResearchForm component */}
        <ResearchForm 
          chatBoxSettings={chatBoxSettings} 
          setChatBoxSettings={setChatBoxSettings} 
        />

        {/* Render AgentLogs component if there are any logs */}
        {agentLogs?.length > 0 ? <AgentLogs agentLogs={agentLogs} /> : ''}
        <div className="margin-div">
          {/* Render Report component if there's a report */}
          {report ? <Report report={report} /> : ''}
          {/* Commented out AccessReport component */}
          {/* {Object.keys(accessData).length != 0 ? <AccessReport accessData={accessData} report={report} /> : ''} */}
        </div>
      </main>
    </div>
  );
}