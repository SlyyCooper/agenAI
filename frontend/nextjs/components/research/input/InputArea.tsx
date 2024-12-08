import { FC, useEffect, useState } from "react";
import { Search, Loader2, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ResearchSettings } from "../Settings/ResearchSettings";
import { StorageFile } from "@/types/interfaces/api.types";
import { useWebSocket } from "@/hooks/useWebSocket";
import { toast } from "react-hot-toast";

interface ResearchSettingsType {
  report_type: 'research_report' | 'detailed_report' | 'multi_agents';
  report_source: 'web' | 'local' | 'hybrid';
  tone: string;
  files: StorageFile[];
  maxTokens?: number;
  temperature?: number;
  model?: string;
}

type TInputAreaProps = {
  promptValue: string;
  setPromptValue: React.Dispatch<React.SetStateAction<string>>;
  handleDisplayResult: () => void;
  disabled?: boolean;
  reset?: () => void;
  chatBoxSettings: ResearchSettingsType;
  onSettingsChange: (settings: ResearchSettingsType) => void;
};

const InputArea: FC<TInputAreaProps> = ({
  promptValue,
  setPromptValue,
  handleDisplayResult,
  disabled,
  reset,
  chatBoxSettings,
  onSettingsChange,
}) => {
  const { isConnected, connectionState, sendMessage, addMessageListener } = useWebSocket();
  const [isLoading, setIsLoading] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  useEffect(() => {
    const cleanup = addMessageListener((data) => {
      if (data.type === 'error' || (data.type === 'auth' && data.status === 'error')) {
        setIsLoading(false);
        const errorMessage = data.content || data.message || 'An error occurred';
        toast.error(errorMessage);
        if (data.type === 'auth') {
          setConnectionError(errorMessage);
        }
      } else if (data.type === 'auth' && data.status === 'success') {
        setConnectionError(null);
      }
    });

    return () => cleanup?.();
  }, [addMessageListener]);

  // Update connection error based on connection state
  useEffect(() => {
    switch (connectionState) {
      case 'disconnected':
        setConnectionError('Not connected to server');
        break;
      case 'connecting':
        setConnectionError('Connecting to server...');
        break;
      case 'authenticating':
        setConnectionError('Authenticating...');
        break;
      case 'authenticated':
        setConnectionError(null);
        break;
      case 'closing':
      case 'closed':
        setConnectionError('Connection closed');
        break;
      default:
        setConnectionError(null);
    }
  }, [connectionState]);

  const getConnectionStatusColor = () => {
    switch (connectionState) {
      case 'authenticated':
        return 'text-green-500 bg-green-50';
      case 'connecting':
      case 'authenticating':
        return 'text-yellow-500 bg-yellow-50';
      case 'disconnected':
      case 'closing':
      case 'closed':
        return 'text-red-500 bg-red-50';
      default:
        return 'text-gray-500 bg-gray-50';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (connectionState !== 'authenticated') {
      toast.error('Not connected to server. Please wait for connection.');
      return;
    }

    if (!promptValue.trim()) {
      toast.error('Please enter a research query');
      return;
    }

    try {
      if (reset) reset();
      
      // Show loading state
      setIsLoading(true);
      
      // Send research request with promise handling
      await sendMessage({
        type: 'research_request',
        query: promptValue.trim(),
        settings: chatBoxSettings
      });

      handleDisplayResult();
    } catch (error) {
      console.error('Research request error:', error);
      toast.error('Failed to send research request. Please try again.');
      setIsLoading(false);
    }
  };

  const isDisabled = disabled || connectionState !== 'authenticated' || isLoading;

  return (
    <div className="w-full">
      {connectionError && (
        <div className={`flex items-center justify-center gap-2 mb-4 p-2 rounded-md ${getConnectionStatusColor()}`}>
          <WifiOff className="w-4 h-4" />
          <span>{connectionError}</span>
        </div>
      )}
      
      <form
        className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-2"
        onSubmit={handleSubmit}
      >
        <div className="flex-shrink-0">
          <ResearchSettings 
            chatBoxSettings={chatBoxSettings}
            onSettingsChange={onSettingsChange}
          />
        </div>
        <div className="flex flex-1 space-x-2">
          <input
            type="text"
            placeholder="What would you like me to research next?"
            className="flex-1 px-4 py-2 rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
            disabled={isDisabled}
            value={promptValue}
            required
            onChange={(e) => setPromptValue(e.target.value)}
          />
          <Button 
            type="submit" 
            disabled={isDisabled}
            className="flex-shrink-0 w-10 h-10 sm:w-auto sm:h-auto"
            aria-label={isLoading ? "Loading..." : "Search"}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
            ) : (
              <Search className="w-4 h-4 sm:w-5 sm:h-5" />
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default InputArea;