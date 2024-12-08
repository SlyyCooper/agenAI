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
import { StorageFile } from '@/types/interfaces/api.types';
import { toast } from 'react-hot-toast';

interface ResearchSettings {
  report_type: 'research_report' | 'detailed_report' | 'multi_agents';
  report_source: 'web' | 'local' | 'hybrid';
  tone: string;
  files: StorageFile[];
  maxTokens?: number;
  temperature?: number;
  model?: string;
}

interface ResearchSettingsProps {
  chatBoxSettings: ResearchSettings;
  onSettingsChange: (settings: ResearchSettings) => void;
  onWebSocketData?: (data: WebSocketData) => void;
}

interface WebSocketData {
  type: string;
  content?: string;
  output?: string;
  metadata?: {
    sources?: Array<{ title: string; url: string }>;
    topics?: string[];
    summary?: string;
    error?: string;
  };
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
  const [settings, setSettings] = useState<ResearchSettings>(chatBoxSettings);

  const handleSettingsChange = (newSettings: Partial<ResearchSettings>) => {
    const updatedSettings = { ...settings, ...newSettings };
    setSettings(updatedSettings);
    onSettingsChange(updatedSettings);

    // Notify backend of settings change
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'settings_update',
        settings: updatedSettings
      }));
    }
  };

  const handleToneChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    handleSettingsChange({ tone: e.target.value });
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    // If switching to files tab and no files uploaded yet, show upload UI
    if (tab === 'files' && (!settings.files || settings.files.length === 0)) {
      handleSettingsChange({ report_source: 'local' });
    }
  };

  // WebSocket Setup
  useEffect(() => {
    let reconnectTimeout: NodeJS.Timeout;
    const maxReconnectAttempts = 5;
    let reconnectAttempts = 0;

    const setupWebSocket = async () => {
      if (typeof window !== 'undefined' && user) {
        const { fullWsUrl } = getHost();
        const newSocket = new WebSocket(fullWsUrl);
        setSocket(newSocket);

        newSocket.onopen = async () => {
          console.log('WebSocket connection opened');
          reconnectAttempts = 0; // Reset attempts on successful connection
          try {
            const idToken = await user.getIdToken();
            if (!idToken) {
              console.error('Failed to get ID token');
              return;
            }
            newSocket.send(JSON.stringify({ type: 'auth', token: idToken }));
          } catch (error) {
            console.error('Error getting ID token:', error);
            toast.error('Authentication failed. Please try again.');
          }
        };

        newSocket.onmessage = (event) => {
          try {
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
              case 'error':
                toast.error(data.content || 'An error occurred');
                break;
            }

            // Notify parent component if callback exists
            if (onWebSocketData) {
              onWebSocketData(data);
            }
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
            toast.error('Error processing server response');
          }
        };

        newSocket.onerror = (error) => {
          console.error('WebSocket error:', error);
          toast.error('Connection error. Attempting to reconnect...');
        };

        newSocket.onclose = () => {
          console.log('WebSocket connection closed');
          // Attempt to reconnect if not at max attempts
          if (reconnectAttempts < maxReconnectAttempts) {
            reconnectAttempts++;
            reconnectTimeout = setTimeout(setupWebSocket, 3000 * reconnectAttempts);
          } else {
            toast.error('Connection lost. Please refresh the page.');
          }
        };

        return () => {
          if (newSocket.readyState === WebSocket.OPEN) {
            newSocket.close();
          }
          if (reconnectTimeout) {
            clearTimeout(reconnectTimeout);
          }
        };
      }
    };

    setupWebSocket();

    return () => {
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
  }, [user, onWebSocketData]);

  // Function to send WebSocket message
  const sendWebSocketMessage = (message: any) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message));
    } else {
      console.error('WebSocket is not connected');
    }
  };

  const handleFileUpload = async (file: StorageFile): Promise<void> => {
    try {
      // Update the research settings with the file information
      handleSettingsChange({
        files: [...(settings.files || []), file]
      });

      // Notify backend of new file
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
          type: 'file_upload',
          file: {
            name: file.name,
            type: file.type,
            size: file.size,
            url: file.url
          }
        }));
      }

      toast.success('File uploaded successfully');
    } catch (error) {
      console.error('Error handling file upload:', error);
      toast.error('Failed to handle file upload');
    }
  };

  // Sync with parent component's settings
  useEffect(() => {
    setSettings(chatBoxSettings);
  }, [chatBoxSettings]);

  // Cleanup function for component unmount
  useEffect(() => {
    const currentSocket = socket;
    return () => {
      if (currentSocket) {
        currentSocket.close();
      }
      setAgentLogs([]);
      setReport("");
      setAccessData({});
    };
  }, [socket]);

  // Handle WebSocket reconnection on user change
  useEffect(() => {
    const currentSocket = socket;
    if (!user) {
      if (currentSocket) {
        currentSocket.close();
      }
      setSocket(null);
      setAgentLogs([]);
      setReport("");
      setAccessData({});
    }
  }, [user, socket]);

  // Update active tab based on settings changes
  useEffect(() => {
    if (settings.report_source === 'local' || settings.report_source === 'hybrid') {
      setActiveTab('files');
    }
  }, [settings.report_source]);

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
        <Tabs defaultValue={activeTab} className="w-full">
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
                  settings.report_type === 'research_report' ? 'border-blue-500 bg-blue-50' : 'border-transparent hover:bg-gray-100'
                }`}
                onClick={() => handleSettingsChange({ report_type: 'research_report' })}
                whileHover={{ scale: 1.02 }}
              >
                <Clock className="h-8 w-8 mb-2" />
                <div className="font-medium">Summary Report</div>
                <div className="text-sm text-gray-500 text-center">Short and fast (~2 min)</div>
              </motion.div>

              <motion.div 
                className={`flex flex-col items-center p-4 rounded-lg cursor-pointer border-2 ${
                  settings.report_type === 'detailed_report' ? 'border-blue-500 bg-blue-50' : 'border-transparent hover:bg-gray-100'
                }`}
                onClick={() => handleSettingsChange({ report_type: 'detailed_report' })}
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
                  settings.report_source === 'web' ? 'border-blue-500 bg-blue-50' : 'border-transparent hover:bg-gray-100'
                }`}
                onClick={() => handleSettingsChange({ report_source: 'web' })}
                whileHover={{ scale: 1.02 }}
              >
                <Globe className="h-8 w-8 mb-2" />
                <div className="font-medium">Web Search</div>
                <div className="text-sm text-gray-500 text-center">Search across the entire internet</div>
              </motion.div>

              <motion.div 
                className={`flex flex-col items-center p-4 rounded-lg cursor-pointer border-2 ${
                  settings.report_source === 'local' ? 'border-blue-500 bg-blue-50' : 'border-transparent hover:bg-gray-100'
                }`}
                onClick={() => handleSettingsChange({ report_source: 'local' })}
                whileHover={{ scale: 1.02 }}
              >
                <Upload className="h-8 w-8 mb-2" />
                <div className="font-medium">File Analysis</div>
                <div className="text-sm text-gray-500 text-center">Analyze your uploaded documents</div>
              </motion.div>

              <motion.div 
                className={`flex flex-col items-center p-4 rounded-lg cursor-pointer border-2 ${
                  settings.report_source === 'hybrid' ? 'border-blue-500 bg-blue-50' : 'border-transparent hover:bg-gray-100'
                }`}
                onClick={() => handleSettingsChange({ report_source: 'hybrid' })}
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
            <FileUpload onUploadComplete={handleFileUpload} />
          </TabsContent>

          <TabsContent value="tone" className="mt-4">
            <div className="p-4">
              <ToneSelector 
                tone={settings.tone} 
                onToneChange={handleToneChange}
              />
            </div>
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}
