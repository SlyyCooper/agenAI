"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/config/firebase/AuthContext";

import Answer from "@/components/research/output/Answer";
import Hero from "@/components/ui/Hero";
import InputArea from "@/components/research/input/InputArea";

import Sources from "@/components/research/output/Sources";
import Question from "@/components/research/input/Question";
import SubQuestions from "@/components/research/output/SubQuestions";
import { useRef } from "react";
import AccessReport from '@/components/research/output/AccessReport';
import LogMessage from '@/components/research/output/LogMessage';

import { startLanggraphResearch } from '@/components/Langgraph/Langgraph';
import findDifferences from '@/helpers/findDifferences';
import HumanFeedback from "@/components/research/input/HumanFeedback";
import Image from 'next/image';
import { saveResearchReport } from '@/api/storageAPI';
import { toast } from 'react-hot-toast';

// Access control constants
const TIER_LIMITS = {
  FREE: {
    reportsPerMonth: 5,
    tokensPerReport: 1000,
    modelAccess: ['gpt-3.5-turbo']
  },
  PRO: {
    reportsPerMonth: -1, // unlimited
    tokensPerReport: 4000,
    modelAccess: ['gpt-4', 'gpt-3.5-turbo']
  },
  ENTERPRISE: {
    reportsPerMonth: -1,
    tokensPerReport: 8000,
    modelAccess: ['gpt-4', 'gpt-3.5-turbo', 'claude-3']
  }
};

export default function ResearchPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [userTier, setUserTier] = useState<'FREE' | 'PRO' | 'ENTERPRISE'>('FREE');
  const [monthlyUsage, setMonthlyUsage] = useState(0);

  // Check user's subscription status and usage
  useEffect(() => {
    const checkAccess = async () => {
      if (!user) {
        router.push('/login?redirect=research');
        return;
      }

      try {
        // Get subscription status
        const subscriptionRes = await fetch('/api/subscription/status');
        const subscriptionData = await subscriptionRes.json();

        // Determine user tier
        let tier: 'FREE' | 'PRO' | 'ENTERPRISE' = 'FREE';
        if (subscriptionData.subscription_status === 'active') {
          tier = subscriptionData.subscription_id.includes('enterprise') 
            ? 'ENTERPRISE' 
            : 'PRO';
        }
        setUserTier(tier);

        // Get monthly usage
        const usageRes = await fetch('/api/usage/monthly');
        const usageData = await usageRes.json();
        setMonthlyUsage(usageData.reports_count || 0);

      } catch (error) {
        console.error('Error checking access:', error);
        toast.error('Error checking access status');
      }
    };

    if (!authLoading) {
      checkAccess();
    }
  }, [user, authLoading, router]);

  // Check if user can create new report
  const canCreateReport = () => {
    const tierLimit = TIER_LIMITS[userTier].reportsPerMonth;
    if (tierLimit === -1) return true; // unlimited
    return monthlyUsage < tierLimit;
  };

  // Handle upgrade prompt
  const handleUpgradePrompt = () => {
    const remaining = TIER_LIMITS[userTier].reportsPerMonth - monthlyUsage;
    
    if (remaining <= 0) {
      toast((t) => (
        <div>
          <p>You've reached your monthly report limit.</p>
          <button
            className="mt-2 bg-blue-500 text-white px-4 py-2 rounded"
            onClick={() => {
              toast.dismiss(t.id);
              router.push('/plans');
            }}
          >
            Upgrade Now
          </button>
        </div>
      ), { duration: 5000 });
      return false;
    }
    
    if (remaining <= 2) {
      toast((t) => (
        <div>
          <p>You have {remaining} report{remaining === 1 ? '' : 's'} remaining this month.</p>
          <button
            className="mt-2 bg-blue-500 text-white px-4 py-2 rounded"
            onClick={() => {
              toast.dismiss(t.id);
              router.push('/plans');
            }}
          >
            Upgrade for Unlimited Reports
          </button>
        </div>
      ), { duration: 5000 });
    }
    
    return true;
  };

  const [promptValue, setPromptValue] = useState("");
  const [showResult, setShowResult] = useState(false);
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [chatBoxSettings, setChatBoxSettings] = useState({ report_source: 'web', report_type: 'research_report', tone: 'Objective' });
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const [question, setQuestion] = useState("");
  const [sources, setSources] = useState<{ name: string; url: string }[]>([]);
  const [similarQuestions, setSimilarQuestions] = useState<string[]>([]);

  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [orderedData, setOrderedData] = useState<any[]>([]);
  const heartbeatInterval = useRef<number | null>(null);
  const [showHumanFeedback, setShowHumanFeedback] = useState(false);
  const [questionForHuman, setQuestionForHuman] = useState(false);
  const [hasOutput, setHasOutput] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [orderedData]);

  const startResearch = async (chatBoxSettings: {
    task?: string;
    report_type: string;
    report_source: string;
    tone: string;
  }) => {
    const storedConfig = localStorage.getItem('apiVariables');
    const apiVariables = storedConfig ? JSON.parse(storedConfig) : {};
    const headers = {
      'retriever': apiVariables.RETRIEVER,
      'langchain_api_key': apiVariables.LANGCHAIN_API_KEY,
      'openai_api_key': apiVariables.OPENAI_API_KEY,
      'tavily_api_key': apiVariables.TAVILY_API_KEY,
      'google_api_key': apiVariables.GOOGLE_API_KEY,
      'google_cx_key': apiVariables.GOOGLE_CX_KEY,
      'bing_api_key': apiVariables.BING_API_KEY,
      'searchapi_api_key': apiVariables.SEARCHAPI_API_KEY,
      'serpapi_api_key': apiVariables.SERPAPI_API_KEY,
      'serper_api_key': apiVariables.SERPER_API_KEY,
      'searx_url': apiVariables.SEARX_URL
    };

    if (!socket) {
      if (typeof window !== 'undefined') {
        const { protocol } = window.location;
        let { host } = window.location;
        host = host.includes('localhost')
          ? 'localhost:8000'
          : 'dolphin-app-49eto.ondigitalocean.app/backend';
        
        const ws_uri = `${protocol === 'https:' ? 'wss:' : 'ws:'}//${host}/ws`;
        
        // Get the Firebase ID token
        const idToken = await user?.getIdToken();
        if (!idToken) {
          console.error('Failed to retrieve ID token');
          router.push('/login');
          return;
        }
        
        const newSocket = new WebSocket(ws_uri);
        setSocket(newSocket as WebSocket);

        newSocket.onmessage = (event) => {
          const data = JSON.parse(event.data);
          console.log('websocket data caught in frontend: ', data);

          if (data.type === 'human_feedback' && data.content === 'request') {
            console.log('triggered human feedback condition')
            setQuestionForHuman(data.output)
            setShowHumanFeedback(true);
          } else {
            const contentAndType = `${data.content}-${data.type}`;
            setOrderedData((prevOrder) => [...prevOrder, { ...data, contentAndType }]);

            if (data.type === 'report') {
              setAnswer((prev) => prev + data.output);
            } else if (data.type === 'path') {
              setLoading(false);
              newSocket.close();
              setSocket(null);
            }
          }
          
        };

        newSocket.onopen = () => {
          console.log('WebSocket connection opened');
          console.log('Sending auth message');
          // Send the ID token as the first message after connection
          newSocket.send(JSON.stringify({ type: 'auth', token: idToken }));

          const { task, report_type, report_source, tone } = chatBoxSettings;
          let data = "start " + JSON.stringify({
            task: promptValue,
            report_type,
            report_source,
            tone,
            headers
          });
          newSocket.send(data);

          // Start sending heartbeat messages every 30 seconds
          // heartbeatInterval.current = setInterval(() => {
          //   newSocket.send(JSON.stringify({ type: 'ping' }));
          // }, 30000);
        };

        newSocket.onclose = () => {
          clearInterval(heartbeatInterval.current as number);
          setSocket(null);
        };
      }
    } else {
      const { task, report_type, report_source, tone } = chatBoxSettings;
      let data = "start " + JSON.stringify({ task: promptValue, report_type, report_source, tone, headers });
      socket.send(data);
    }
  };

  // Add this function to handle feedback submission
  const handleFeedbackSubmit = (feedback: string | null) => {
    console.log('user feedback is passed to handleFeedbackSubmit: ', feedback);
    if (socket) {
      socket.send(JSON.stringify({ type: 'human_feedback', content: feedback }));
    }
    setShowHumanFeedback(false);
  };

  const handleDisplayResult = async (newQuestion?: string) => {
    if (!canCreateReport()) {
      handleUpgradePrompt();
      return;
    }

    setIsTransitioning(true);
    newQuestion = newQuestion || promptValue;

    setShowResult(true);
    setLoading(true);
    setQuestion(newQuestion);
    setPromptValue("");
    setAnswer(""); // Reset answer for new query
    setHasOutput(false); // Reset hasOutput

    // Add the new question to orderedData
    setOrderedData((prevOrder) => [...prevOrder, { type: 'question', content: newQuestion }]);

    const { report_type, report_source, tone } = chatBoxSettings;

    // Retrieve LANGGRAPH_HOST_URL from local storage or state
    const storedConfig = localStorage.getItem('apiVariables');
    const apiVariables = storedConfig ? JSON.parse(storedConfig) : {};
    const langgraphHostUrl = apiVariables.LANGGRAPH_HOST_URL;

    if (report_type === 'multi_agents' && langgraphHostUrl) {
      let { streamResponse, host, thread_id } = await startLanggraphResearch(newQuestion, report_source, langgraphHostUrl);

      const langsmithGuiLink = `https://smith.langchain.com/studio/thread/${thread_id}?baseUrl=${host}`;

      console.log('langsmith-gui-link in page.tsx', langsmithGuiLink);
      // Add the Langgraph button to orderedData
      setOrderedData((prevOrder) => [...prevOrder, { type: 'langgraphButton', link: langsmithGuiLink }]);

      let previousChunk = null;

      for await (const chunk of streamResponse) {
        console.log(chunk);
        if (chunk.data.report != null && chunk.data.report != "Full report content here") {
          setOrderedData((prevOrder) => [...prevOrder, { ...chunk.data, output: chunk.data.report, type: 'report' }]);
          setLoading(false);
          setHasOutput(true); // Set hasOutput to true when the first output is generated
        } else if (previousChunk) {
          const differences = findDifferences(previousChunk, chunk);
          setOrderedData((prevOrder) => [...prevOrder, { type: 'differences', content: 'differences', output: JSON.stringify(differences) }]);
          setHasOutput(true); // Set hasOutput to true when the first output is generated
        }
        previousChunk = chunk;
      }
    } else {
      startResearch(chatBoxSettings);
      setHasOutput(true); // Set hasOutput to true when the research starts
    }
    // Wait for the transition to complete
    setTimeout(() => {
      setIsTransitioning(false);
    }, 500); // Adjust this value to match your transition duration
  };

  const reset = () => {
    setShowResult(false);
    setPromptValue("");
    setQuestion("");
    setAnswer("");
    setSources([]);
    setSimilarQuestions([]);
  };

  const handleClickSuggestion = (value: string) => {
    setPromptValue(value);
    const element = document.getElementById('input-area');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const preprocessOrderedData = (data: any[]): any[] => {
    const groupedData: any[] = [];
    let currentAccordionGroup: any = null;
    let currentSourceGroup: any = null;
    let currentReportGroup: any = null;
    let finalReportGroup: any = null;
    let sourceBlockEncountered = false;
    let lastSubqueriesIndex = -1;
  
    data.forEach((item: any, index: number) => {
      const { type, content, metadata, output, link } = item;
  
      if (type === 'report') {
        if (!currentReportGroup) {
          currentReportGroup = { type: 'reportBlock', content: '' };
          groupedData.push(currentReportGroup);
        }
        currentReportGroup.content += output;
      } else if (type === 'logs' && content === 'research_report') {
        if (!finalReportGroup) {
          finalReportGroup = { type: 'reportBlock', content: '' };
          groupedData.push(finalReportGroup);
        }
        finalReportGroup.content += output.report;
      } else if (type === 'langgraphButton') {
        groupedData.push({ type: 'langgraphButton', link });
      } else if (type === 'question') {
        groupedData.push({ type: 'question', content });
      } else if (type === 'accordionBlock') {
        if (!currentAccordionGroup) {
          currentAccordionGroup = { type: 'accordionBlock', items: [] };
          groupedData.push(currentAccordionGroup);
        }
        currentAccordionGroup.items.push(item);
      } else {
        if (currentReportGroup) {
          currentReportGroup = null;
        }
  
        if (content === 'subqueries') {
          if (currentAccordionGroup) {
            currentAccordionGroup = null;
          }
          if (currentSourceGroup) {
            groupedData.push(currentSourceGroup);
            currentSourceGroup = null;
          }
          groupedData.push(item);
          lastSubqueriesIndex = groupedData.length - 1;
        } else if (type === 'sourceBlock') {
          currentSourceGroup = item;
          if (lastSubqueriesIndex !== -1) {
            groupedData.splice(lastSubqueriesIndex + 1, 0, currentSourceGroup);
            lastSubqueriesIndex = -1;
          } else {
            groupedData.push(currentSourceGroup);
          }
          sourceBlockEncountered = true;
          currentSourceGroup = null;
        } else if (content === 'added_source_url') {
          if (!currentSourceGroup) {
            currentSourceGroup = { type: 'sourceBlock', items: [] };
            if (lastSubqueriesIndex !== -1) {
              groupedData.splice(lastSubqueriesIndex + 1, 0, currentSourceGroup);
              lastSubqueriesIndex = -1;
            } else {
              groupedData.push(currentSourceGroup);
            }
            sourceBlockEncountered = true;
          }
          const hostname = new URL(metadata).hostname.replace('www.', '');
          currentSourceGroup.items.push({ name: hostname, url: metadata });
        } else if (type !== 'path' && content !== '') {
          if (sourceBlockEncountered) {
            if (!currentAccordionGroup) {
              currentAccordionGroup = { type: 'accordionBlock', items: [] };
              groupedData.push(currentAccordionGroup);
            }
            currentAccordionGroup.items.push(item);
          } else {
            groupedData.push(item);
          }
        } else {
          if (currentAccordionGroup) {
            currentAccordionGroup = null;
          }
          if (currentSourceGroup) {
            currentSourceGroup = null;
          }
          groupedData.push(item);
        }
      }
    });
  
    return groupedData;
  };

  const renderComponentsInOrder = () => {
    const groupedData = preprocessOrderedData(orderedData);
    console.log('orderedData in renderComponentsInOrder: ', groupedData);

    const leftComponents: React.ReactNode[] = [];
    const rightComponents: React.ReactNode[] = [];

    let accessReportComponent: React.ReactNode | null = null;

    // First, find the AccessReport component
    groupedData.forEach((data) => {
      if (data.type === 'path') {
        accessReportComponent = <AccessReport key="accessReport" accessData={data.output} report={answer} />;
      }
    });

    // Add the AccessReport component at the very beginning if it exists
    if (accessReportComponent) {
      leftComponents.push(accessReportComponent);
    }

    // Add the Question component after the AccessReport
    if (question) {
      leftComponents.push(<Question key="question" question={question} />);
    }

    groupedData.forEach((data, index) => {
      const uniqueKey = `${data.type}-${index}`;

      if (data.type === 'sourceBlock') {
        leftComponents.push(<Sources key={uniqueKey} sources={data.items} />);
      } else if (data.type === 'accordionBlock') {
        const logs = data.items.map((item: any, subIndex: number) => ({
          header: item.content,
          text: item.output,
          key: `${item.type}-${item.content}-${subIndex}`,
        }));
        leftComponents.push(<LogMessage key={uniqueKey} logs={logs} />);
      } else if (data.content === 'subqueries') {
        leftComponents.push(
          <SubQuestions
            key={uniqueKey}
            metadata={data.metadata}
            handleClickSuggestion={handleClickSuggestion}
          />
        );
      } else {
        let component: React.ReactNode = null;
        if (data.type === 'reportBlock') {
          component = <Answer key={uniqueKey} answer={data.content} />;
        } else if (data.type === 'langgraphButton') {
          component = <div key={uniqueKey}></div>;
        }
        if (component) {
          rightComponents.push(component);
        }
      }
    });

    return { leftComponents, rightComponents };
  };

  // Add function to save report
  const saveReport = async (reportContent: string) => {
    try {
      setIsSaving(true);
      const url = await saveResearchReport(
        reportContent,
        question,
        chatBoxSettings.report_type
      );
      toast.success('Report saved successfully');
      return url;
    } catch (error) {
      console.error('Error saving report:', error);
      toast.error('Failed to save report');
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  // Modify WebSocket message handler
  useEffect(() => {
    if (socket) {
      socket.onmessage = async (event) => {
        const data = JSON.parse(event.data);
        console.log('websocket data caught in frontend: ', data);

        if (data.type === 'human_feedback' && data.content === 'request') {
          console.log('triggered human feedback condition')
          setQuestionForHuman(data.output)
          setShowHumanFeedback(true);
        } else {
          const contentAndType = `${data.content}-${data.type}`;
          setOrderedData((prevOrder) => [...prevOrder, { ...data, contentAndType }]);

          if (data.type === 'report') {
            setAnswer((prev) => prev + data.output);
            // Save report when it's complete
            if (data.content === 'complete') {
              try {
                await saveReport(data.output);
              } catch (error) {
                console.error('Failed to save report:', error);
              }
            }
          } else if (data.type === 'path') {
            setLoading(false);
            socket.close();
            setSocket(null);
          }
        }
      };
    }
  }, [socket, question, chatBoxSettings.report_type]);

  // Add tier indicator
  const TierIndicator = () => (
    <div className="absolute top-4 right-4 flex items-center space-x-2">
      <span className={`px-3 py-1 rounded-full text-sm font-medium
        ${userTier === 'ENTERPRISE' ? 'bg-purple-100 text-purple-800' :
          userTier === 'PRO' ? 'bg-blue-100 text-blue-800' :
          'bg-green-100 text-green-800'}`}>
        {userTier} Plan
      </span>
      {userTier === 'FREE' && (
        <span className="text-sm text-gray-500">
          {TIER_LIMITS.FREE.reportsPerMonth - monthlyUsage} reports remaining
        </span>
      )}
    </div>
  );

  if (authLoading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return null; // or a loading spinner, as the useEffect will redirect
  }

  return (
    <div className="relative min-h-screen bg-gray-50">
      <TierIndicator />
      <div className="flex flex-col min-h-screen">
        <main className="flex-grow flex flex-col overflow-hidden relative">
          {/* Top container for Hero, InputArea, and Settings */}
          <div className="w-full relative p-4 bg-gray-50 shadow-sm">
            <div className="max-w-7xl mx-auto">
              <div className="flex items-center justify-between mb-2">
                <div className="flex-grow flex justify-center">
                  <Image 
                    src="/TAN.png" 
                    alt="TAN Logo" 
                    width={showResult ? 40 : 80}
                    height={showResult ? 40 : 80}
                    className="transition-all duration-500 ease-in-out"
                  />
                </div>
              </div>
              
              <div className={`transition-all duration-500 ease-in-out ${
                showResult ? 'translate-y-0 opacity-100' : 'translate-y-1/2 opacity-0'
              }`}>
                <InputArea
                  promptValue={promptValue}
                  setPromptValue={setPromptValue}
                  handleDisplayResult={handleDisplayResult}
                  disabled={loading}
                  reset={reset}
                  chatBoxSettings={chatBoxSettings}
                  onSettingsChange={setChatBoxSettings}
                />
              </div>
              
              {!showResult && !isTransitioning && (
                <div className="mt-2">
                  <Hero
                    promptValue={promptValue}
                    setPromptValue={setPromptValue}
                    handleDisplayResult={handleDisplayResult}
                    chatBoxSettings={chatBoxSettings}
                    onSettingsChange={setChatBoxSettings}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Container for left and right content */}
          <div className="flex-grow flex overflow-hidden">
            {/* Left side - Sources and other components */}
            <div
              className={`flex flex-col transition-all duration-500 ${
                showResult ? 'w-1/3 min-w-[300px]' : 'w-full'
              } bg-white border-r border-gray-200`}
            >
              {/* Scrollable container for left components */}
              <div className="flex-grow overflow-y-auto p-4 space-y-4">
                {renderComponentsInOrder().leftComponents.map((component, index) => (
                  <div key={index} className="bg-gray-50 rounded-lg shadow-sm p-4">
                    {component}
                  </div>
                ))}
              </div>
            </div>

            {/* Right side - Output components */}
            <div
              className={`flex flex-col transition-all duration-500 ${
                showResult ? 'flex-1 opacity-100' : 'w-0 opacity-0 overflow-hidden'
              }`}
            >
              {/* Scrollable container for right components */}
              <div className="flex-grow overflow-y-auto bg-gray-100 rounded-lg shadow-inner p-4">
                {showResult && (
                  <div className="space-y-4">
                    {renderComponentsInOrder().rightComponents.map((component, index) => (
                      <div key={index} className="bg-white rounded-lg shadow-sm p-6">
                        {component}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {showHumanFeedback && (
                <div className="mt-4 bg-white rounded-lg shadow-sm p-4">
                  <HumanFeedback
                    questionForHuman={questionForHuman}
                    websocket={socket}
                    onFeedbackSubmit={handleFeedbackSubmit}
                  />
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}