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
import { useWebSocket } from "@/hooks/useWebSocket";

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
  const { isConnected, sendMessage, addMessageListener } = useWebSocket();
  const [settings, setSettings] = useState<ResearchSettings>(chatBoxSettings);

  useEffect(() => {
    const cleanup = addMessageListener((data) => {
      if (onWebSocketData) {
        onWebSocketData(data);
      }
    });

    return () => cleanup?.();
  }, [addMessageListener, onWebSocketData]);

  const handleSettingsChange = (newSettings: Partial<ResearchSettings>) => {
    const updatedSettings = { ...settings, ...newSettings };
    setSettings(updatedSettings);
    onSettingsChange(updatedSettings);

    // Notify backend of settings change
    if (isConnected) {
      sendMessage({
        type: 'settings_update',
        settings: updatedSettings
      });
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

  const handleFileUpload = async (file: StorageFile): Promise<void> => {
    try {
      // Update the research settings with the file information
      handleSettingsChange({
        files: [...(settings.files || []), file]
      });

      // Notify backend of new file
      if (isConnected) {
        sendMessage({
          type: 'file_upload',
          file: {
            name: file.name,
            type: file.type,
            size: file.size,
            url: file.url
          }
        });
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
          <span className="hidden sm:inline">Settings</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[90vw] sm:w-[600px] p-4" align="start">
        <Tabs defaultValue={activeTab} className="w-full">
          <TabsList className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 mb-4">
            <TabsTrigger 
              value="report_type" 
              onClick={() => handleTabChange('report_type')}
              className="flex items-center justify-center text-xs sm:text-sm"
            >
              <FileText className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Report Type</span>
              <span className="sm:hidden">Type</span>
            </TabsTrigger>
            <TabsTrigger 
              value="source" 
              onClick={() => handleTabChange('source')}
              className="flex items-center justify-center text-xs sm:text-sm"
            >
              <Globe className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
              <span>Source</span>
            </TabsTrigger>
            <TabsTrigger 
              value="files" 
              onClick={() => handleTabChange('files')}
              className="flex items-center justify-center text-xs sm:text-sm"
            >
              <Upload className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
              <span>Files</span>
            </TabsTrigger>
            <TabsTrigger 
              value="tone" 
              onClick={() => handleTabChange('tone')}
              className="flex items-center justify-center text-xs sm:text-sm"
            >
              <PenTool className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
              <span>Tone</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="report_type" className="mt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <motion.div 
                className={`flex flex-col items-center p-3 sm:p-4 rounded-lg cursor-pointer border-2 ${
                  settings.report_type === 'research_report' ? 'border-blue-500 bg-blue-50' : 'border-transparent hover:bg-gray-100'
                }`}
                onClick={() => handleSettingsChange({ report_type: 'research_report' })}
                whileHover={{ scale: 1.02 }}
              >
                <Clock className="h-6 w-6 sm:h-8 sm:w-8 mb-2" />
                <div className="font-medium text-sm sm:text-base">Summary Report</div>
                <div className="text-xs sm:text-sm text-gray-500 text-center">Short and fast (~2 min)</div>
              </motion.div>

              <motion.div 
                className={`flex flex-col items-center p-3 sm:p-4 rounded-lg cursor-pointer border-2 ${
                  settings.report_type === 'detailed_report' ? 'border-blue-500 bg-blue-50' : 'border-transparent hover:bg-gray-100'
                }`}
                onClick={() => handleSettingsChange({ report_type: 'detailed_report' })}
                whileHover={{ scale: 1.02 }}
              >
                <BookOpen className="h-6 w-6 sm:h-8 sm:w-8 mb-2" />
                <div className="font-medium text-sm sm:text-base">Detailed Report</div>
                <div className="text-xs sm:text-sm text-gray-500 text-center">In depth and longer (~5 min)</div>
              </motion.div>
            </div>
          </TabsContent>

          <TabsContent value="source" className="mt-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
