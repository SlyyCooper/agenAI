import { FC } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "./button";
import InputArea from "./InputArea";

type THeroProps = {
  promptValue: string;
  setPromptValue: React.Dispatch<React.SetStateAction<string>>;
  handleDisplayResult: () => void;
};

const Hero: FC<THeroProps> = ({
  promptValue,
  setPromptValue,
  handleDisplayResult,
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
