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
  const { isConnected, sendMessage, addMessageListener } = useWebSocket();
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

  // Update connection error when connection status changes
  useEffect(() => {
    if (!isConnected) {
      setConnectionError('Not connected to server');
    } else {
      setConnectionError(null);
    }
  }, [isConnected]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isConnected) {
      toast.error('Not connected to server. Please try again.');
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
      
      // Send research request
      sendMessage({
        type: 'research_request',
        query: promptValue.trim(),
        settings: chatBoxSettings
      });

      handleDisplayResult();
    } catch (error) {
      console.error('Research request error:', error);
      toast.error('Failed to send research request');
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full">
      {connectionError && (
        <div className="flex items-center justify-center gap-2 text-red-500 mb-4 p-2 bg-red-50 rounded-md">
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
            disabled={disabled || !isConnected || isLoading}
            value={promptValue}
            required
            onChange={(e) => setPromptValue(e.target.value)}
          />
          <Button 
            type="submit" 
            disabled={disabled || !isConnected || isLoading}
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