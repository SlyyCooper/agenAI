'use client';

import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Upload, Globe, PenTool, FileText, Clock, BookOpen } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/research/ui/Popover";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/research/ui/tabs";
import ToneSelector from './ToneSelector';
import FileUpload from './FileUpload';
import { motion } from 'framer-motion';
import { useAuth } from '@/config/firebase/AuthContext';
import { getHost } from '../../../helpers/getHost';

interface ResearchSettingsProps {
  chatBoxSettings: {
    report_type: string;
    report_source: string;
    tone: string;
  };
  onSettingsChange: (settings: any) => void;
  onWebSocketData?: (data: any) => void;
}

interface WebSocketData {
  type: string;
  content?: string;
  output?: string;
  metadata?: any;
}

export function ResearchSettings({ 
  chatBoxSettings, 
  onSettingsChange,
  onWebSocketData 
}: ResearchSettingsProps) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('source');
  const { user } = useAuth();
  
  // WebSocket States
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [agentLogs, setAgentLogs] = useState<WebSocketData[]>([]);
  const [report, setReport] = useState("");
  const [accessData, setAccessData] = useState<any>({});

  const handleToneChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onSettingsChange({ ...chatBoxSettings, tone: e.target.value });
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };

  // WebSocket Setup
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
          const data: WebSocketData = JSON.parse(event.data);
          
          // Handle different types of messages
          switch (data.type) {
            case 'logs':
              setAgentLogs(prevLogs => [...prevLogs, data]);
              break;
            case 'report':
              if (data.output) {
                setReport(prevReport => prevReport + data.output);
              }
              break;
            case 'path':
              setAccessData(data);
              break;
          }

          // Notify parent component if callback exists
          if (onWebSocketData) {
            onWebSocketData(data);
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
  }, [user, onWebSocketData]);

  // Function to send WebSocket message
  const sendWebSocketMessage = (message: any) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message));
    } else {
      console.error('WebSocket is not connected');
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 px-3 py-2 rounded-md text-sm"
        >
          <SettingsIcon className="h-4 w-4" />
          Settings
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[600px] p-4" align="start">
        <Tabs defaultValue="source" className="w-full">
          <TabsList className="grid grid-cols-4 gap-4 mb-4">
            <TabsTrigger 
              value="report_type" 
              onClick={() => handleTabChange('report_type')}
              className="flex items-center justify-center"
            >
              <FileText className="mr-2 h-4 w-4" />
              Report Type
            </TabsTrigger>
            <TabsTrigger 
              value="source" 
              onClick={() => handleTabChange('source')}
              className="flex items-center justify-center"
            >
              <Globe className="mr-2 h-4 w-4" />
              Source
            </TabsTrigger>
            <TabsTrigger 
              value="files" 
              onClick={() => handleTabChange('files')}
              className="flex items-center justify-center"
            >
              <Upload className="mr-2 h-4 w-4" />
              Files
            </TabsTrigger>
            <TabsTrigger 
              value="tone" 
              onClick={() => handleTabChange('tone')}
              className="flex items-center justify-center"
            >
              <PenTool className="mr-2 h-4 w-4" />
              Tone
            </TabsTrigger>
          </TabsList>

          <TabsContent value="report_type" className="mt-4">
            <div className="grid grid-cols-2 gap-4">
              <motion.div 
                className={`flex flex-col items-center p-4 rounded-lg cursor-pointer border-2 ${
                  chatBoxSettings.report_type === 'research_report' ? 'border-blue-500 bg-blue-50' : 'border-transparent hover:bg-gray-100'
                }`}
                onClick={() => onSettingsChange({ ...chatBoxSettings, report_type: 'research_report' })}
                whileHover={{ scale: 1.02 }}
              >
                <Clock className="h-8 w-8 mb-2" />
                <div className="font-medium">Summary Report</div>
                <div className="text-sm text-gray-500 text-center">Short and fast (~2 min)</div>
              </motion.div>

              <motion.div 
                className={`flex flex-col items-center p-4 rounded-lg cursor-pointer border-2 ${
                  chatBoxSettings.report_type === 'detailed_report' ? 'border-blue-500 bg-blue-50' : 'border-transparent hover:bg-gray-100'
                }`}
                onClick={() => onSettingsChange({ ...chatBoxSettings, report_type: 'detailed_report' })}
                whileHover={{ scale: 1.02 }}
              >
                <BookOpen className="h-8 w-8 mb-2" />
                <div className="font-medium">Detailed Report</div>
                <div className="text-sm text-gray-500 text-center">In depth and longer (~5 min)</div>
              </motion.div>
            </div>
          </TabsContent>

          <TabsContent value="source" className="mt-4">
            <div className="grid grid-cols-3 gap-4">
              <motion.div 
                className={`flex flex-col items-center p-4 rounded-lg cursor-pointer border-2 ${
                  chatBoxSettings.report_source === 'web' ? 'border-blue-500 bg-blue-50' : 'border-transparent hover:bg-gray-100'
                }`}
                onClick={() => onSettingsChange({ ...chatBoxSettings, report_source: 'web' })}
                whileHover={{ scale: 1.02 }}
              >
                <Globe className="h-8 w-8 mb-2" />
                <div className="font-medium">Web Search</div>
                <div className="text-sm text-gray-500 text-center">Search across the entire internet</div>
              </motion.div>

              <motion.div 
                className={`flex flex-col items-center p-4 rounded-lg cursor-pointer border-2 ${
                  chatBoxSettings.report_source === 'local' ? 'border-blue-500 bg-blue-50' : 'border-transparent hover:bg-gray-100'
                }`}
                onClick={() => onSettingsChange({ ...chatBoxSettings, report_source: 'local' })}
                whileHover={{ scale: 1.02 }}
              >
                <Upload className="h-8 w-8 mb-2" />
                <div className="font-medium">File Analysis</div>
                <div className="text-sm text-gray-500 text-center">Analyze your uploaded documents</div>
              </motion.div>

              <motion.div 
                className={`flex flex-col items-center p-4 rounded-lg cursor-pointer border-2 ${
                  chatBoxSettings.report_source === 'hybrid' ? 'border-blue-500 bg-blue-50' : 'border-transparent hover:bg-gray-100'
                }`}
                onClick={() => onSettingsChange({ ...chatBoxSettings, report_source: 'hybrid' })}
                whileHover={{ scale: 1.02 }}
              >
                <div className="relative h-8 w-8 mb-2">
                  <Upload className="absolute inset-0" />
                  <Globe className="absolute inset-0 opacity-70" />
                </div>
                <div className="font-medium">Hybrid Search</div>
                <div className="text-sm text-gray-500 text-center">Combine web search with your documents</div>
              </motion.div>
            </div>
          </TabsContent>

          <TabsContent value="files" className="mt-4">
            <FileUpload />
          </TabsContent>

          <TabsContent value="tone" className="mt-4">
            <div className="p-4">
              <ToneSelector 
                tone={chatBoxSettings.tone} 
                onToneChange={handleToneChange}
              />
            </div>
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}
