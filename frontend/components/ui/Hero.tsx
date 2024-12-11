import { FC, Dispatch, SetStateAction } from 'react';
import { StorageFile } from '@/types/interfaces/api.types';
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import InputArea from "@/components/research/input/InputArea";

interface ResearchSettings {
  report_type: 'research_report' | 'detailed_report' | 'multi_agents';
  report_source: 'web' | 'local' | 'hybrid';
  tone: string;
  files: StorageFile[];
  maxTokens?: number;
  temperature?: number;
  model?: string;
}

interface HeroProps {
  promptValue: string;
  setPromptValue: Dispatch<SetStateAction<string>>;
  handleDisplayResult: () => void;
  chatBoxSettings: ResearchSettings;
  onSettingsChange: Dispatch<SetStateAction<ResearchSettings>>;
}

const Hero: FC<HeroProps> = ({
  promptValue,
  setPromptValue,
  handleDisplayResult,
  chatBoxSettings,
  onSettingsChange,
}) => {
  const handleClickSuggestion = (value: string) => {
    setPromptValue(value);
  };

  return (
    <div className="bg-gradient-to-b from-gray-50 to-white py-20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold mb-4 lg:text-6xl">
            What Took Days, <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-teal-400">
              Now Takes Seconds
            </span>
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Harness the power of AI for lightning-fast research
          </p>
        </div>

        <div className="max-w-2xl mx-auto mb-12">
          <InputArea
            promptValue={promptValue}
            setPromptValue={setPromptValue}
            handleDisplayResult={handleDisplayResult}
            chatBoxSettings={chatBoxSettings}
            onSettingsChange={onSettingsChange}
          />
        </div>

        <div className="flex flex-wrap justify-center gap-4">
          {suggestions.map((item) => (
            <Button
              key={item.id}
              variant="outline"
              onClick={() => handleClickSuggestion(item.name)}
              className="flex items-center space-x-2"
            >
              <span>{item.name}</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
};

type suggestionType = {
  id: number;
  name: string;
  icon: string;
};

const suggestions: suggestionType[] = [
  {
    id: 1,
    name: "Stock analysis on ",
    icon: "/img/stock2.svg",
  },
  {
    id: 2,
    name: "Help me plan an adventure to ",
    icon: "/img/hiker.svg",
  },
  {
    id: 3,
    name: "What are the latest news on ",
    icon: "/img/news.svg",
  },
];

export default Hero;
