import { FC, useEffect } from "react";
import { Search, Loader2 } from "lucide-react";
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

  useEffect(() => {
    const cleanup = addMessageListener((data) => {
      if (data.type === 'error') {
        toast.error(data.content || 'An error occurred');
      }
    });

    return () => cleanup?.();
  }, [addMessageListener]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected) {
      toast.error('Not connected to server. Please try again.');
      return;
    }

    if (reset) reset();

    // Send research request
    sendMessage({
      type: 'research_request',
      query: promptValue,
      settings: chatBoxSettings
    });

    handleDisplayResult();
  };

  return (
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
          disabled={disabled || !isConnected}
          value={promptValue}
          required
          onChange={(e) => setPromptValue(e.target.value)}
        />
        <Button 
          type="submit" 
          disabled={disabled || !isConnected}
          className="flex-shrink-0 w-10 h-10 sm:w-auto sm:h-auto"
          aria-label={disabled ? "Loading..." : "Search"}
        >
          {disabled ? (
            <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
          ) : (
            <Search className="w-4 h-4 sm:w-5 sm:h-5" />
          )}
        </Button>
      </div>
    </form>
  );
};

export default InputArea;