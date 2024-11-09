import { FC } from "react";
import { Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ResearchSettings } from "../Settings/ResearchSettings";

type TInputAreaProps = {
  promptValue: string;
  setPromptValue: React.Dispatch<React.SetStateAction<string>>;
  handleDisplayResult: () => void;
  disabled?: boolean;
  reset?: () => void;
  chatBoxSettings: {
    report_type: string;
    report_source: string;
    tone: string;
  };
  onSettingsChange: (settings: any) => void;
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
  return (
    <form
      className="flex items-center space-x-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (reset) reset();
        handleDisplayResult();
      }}
    >
      <ResearchSettings 
        chatBoxSettings={chatBoxSettings}
        onSettingsChange={onSettingsChange}
      />
      <input
        type="text"
        placeholder="What would you like me to research next?"
        className="flex-1 px-4 py-2 rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
        disabled={disabled}
        value={promptValue}
        required
        onChange={(e) => setPromptValue(e.target.value)}
      />
      <Button type="submit" disabled={disabled}>
        {disabled ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <Search className="w-5 h-5" />
        )}
      </Button>
    </form>
  );
};

export default InputArea;