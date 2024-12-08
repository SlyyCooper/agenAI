import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/config/firebase/AuthContext';
import { getHost } from '@/helpers/getHost';
import { toast } from 'react-hot-toast';
import { ResearchSettings, ResearchResponse, Retriever } from '@/types/interfaces/api.types';

type ConnectionState = 
  | "disconnected"
  | "connecting"
  | "connected"
  | "authenticating"
  | "authenticated"
  | "closing"
  | "closed";

interface WebSocketData {
  type: string;
  content?: string;
  output?: string;
  status?: 'success' | 'error';
  message?: string;
  state?: ConnectionState;
  metadata?: {
    sources?: Array<{ title: string; url: string }>;
    topics?: string[];
    summary?: string;
    error?: string;
  };
}

interface QueuedMessage {
  data: any;
  resolve: (value: any) => void;
  reject: (error: Error) => void;
}

const validateResearchSettings = (settings: Partial<ResearchSettings>): ResearchSettings => {
  if (!settings.type || settings.type !== 'research') {
    throw new Error('Research type is required and must be "research"');
  }

  if (!settings.task) {
    throw new Error('Research task is required');
  }

  // Validate retrievers if provided
  const VALID_RETRIEVERS: Retriever[] = [
    'arxiv', 'bing', 'custom', 'duckduckgo', 'exa', 'google',
    'searchapi', 'searx', 'semantic_scholar', 'serpapi',
    'serper', 'tavily', 'pubmed_central'
  ];

  if (settings.retrievers) {
    const invalidRetrievers = settings.retrievers.filter(r => !VALID_RETRIEVERS.includes(r));
    if (invalidRetrievers.length > 0) {
      throw new Error(`Invalid retrievers: ${invalidRetrievers.join(', ')}`);
    }
  }

  // Validate numeric values
  if (settings.total_words && (settings.total_words < 100 || settings.total_words > 10000)) {
    throw new Error('Total words must be between 100 and 10000');
  }

  if (settings.max_subtopics && (settings.max_subtopics < 1 || settings.max_subtopics > 10)) {
    throw new Error('Max subtopics must be between 1 and 10');
  }

  if (settings.temperature && (settings.temperature < 0 || settings.temperature > 1)) {
    throw new Error('Temperature must be between 0 and 1');
  }

  if (settings.llm_temperature && (settings.llm_temperature < 0 || settings.llm_temperature > 1)) {
    throw new Error('LLM temperature must be between 0 and 1');
  }

  if (settings.similarity_threshold && (settings.similarity_threshold < 0 || settings.similarity_threshold > 1)) {
    throw new Error('Similarity threshold must be between 0 and 1');
  }

  // Return validated settings with defaults
  return {
    type: 'research',
    task: settings.task,
    report_type: settings.report_type || 'research_report',
    report_source: settings.report_source || 'web',
    report_format: settings.report_format || 'APA',
    total_words: settings.total_words || 1200,
    max_subtopics: settings.max_subtopics || 5,
    llm_provider: settings.llm_provider || 'openai',
    llm_model: settings.llm_model || 'gpt-4o',
    temperature: settings.temperature || 0.4,
    llm_temperature: settings.llm_temperature || 0.55,
    retrievers: settings.retrievers || ['tavily'],
    max_search_results_per_query: settings.max_search_results_per_query || 5,
    similarity_threshold: settings.similarity_threshold || 0.42,
    fast_token_limit: settings.fast_token_limit || 4000,
    smart_token_limit: settings.smart_token_limit || 6000,
    summary_token_limit: settings.summary_token_limit || 1200,
    browse_chunk_max_length: settings.browse_chunk_max_length || 8192,
    max_iterations: settings.max_iterations || 3,
    scraper: settings.scraper || 'bs',
    ...(settings.agent_role && { agent_role: settings.agent_role }),
    ...(settings.doc_path && { doc_path: settings.doc_path })
  };
};

export const useWebSocket = () => {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [connectionState, setConnectionState] = useState<ConnectionState>("disconnected");
  const { user } = useAuth();
  
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const messageQueueRef = useRef<QueuedMessage[]>([]);

  const processPendingMessages = useCallback(() => {
    while (messageQueueRef.current.length > 0 && connectionState === "authenticated") {
      const message = messageQueueRef.current.shift();
      if (message && socket?.readyState === WebSocket.OPEN) {
        try {
          socket.send(JSON.stringify(message.data));
          message.resolve(true);
        } catch (error) {
          message.reject(error as Error);
        }
      }
    }
  }, [socket, connectionState]);

  const handleConnectionState = useCallback((newState: ConnectionState) => {
    console.log(`WebSocket state: ${newState}`);
    setConnectionState(newState);
    
    if (newState === "authenticated") {
      setIsConnected(true);
      setIsAuthenticating(false);
      reconnectAttempts.current = 0;
      processPendingMessages();
    } else if (newState === "authenticating") {
      setIsAuthenticating(true);
    } else if (["disconnected", "closed"].includes(newState)) {
      setIsConnected(false);
      setIsAuthenticating(false);
    }
  }, [processPendingMessages]);

  const setupWebSocket = useCallback(async () => {
    if (typeof window !== 'undefined' && user) {
      try {
        handleConnectionState("connecting");
        const { fullWsUrl } = getHost();
        console.log('Connecting to WebSocket:', fullWsUrl);
        
        const newSocket = new WebSocket(fullWsUrl);
        setSocket(newSocket);

        newSocket.onopen = async () => {
          console.log('WebSocket connection opened');
          handleConnectionState("connected");
          
          try {
            const idToken = await user.getIdToken();
            if (!idToken) {
              throw new Error('Failed to get ID token');
            }
            
            handleConnectionState("authenticating");
            newSocket.send(JSON.stringify({ type: 'auth', token: idToken }));
          } catch (error) {
            console.error('Error getting ID token:', error);
            toast.error('Authentication failed. Please try again.');
            newSocket.close();
          }
        };

        newSocket.onmessage = (event) => {
          try {
            const data: WebSocketData = JSON.parse(event.data);
            
            // Handle connection state updates
            if (data.type === "connection_state" && data.state) {
              handleConnectionState(data.state);
            }
            
            // Handle auth responses
            if (data.type === "auth") {
              if (data.status === "success") {
                handleConnectionState("authenticated");
              } else {
                handleConnectionState("disconnected");
                toast.error(data.message || 'Authentication failed');
              }
            }
            
            // Handle errors
            if (data.type === "error") {
              toast.error(data.message || 'An error occurred');
            }
          } catch (error) {
            console.error('Error processing message:', error);
            toast.error('Error processing server response');
          }
        };

        newSocket.onclose = () => {
          console.log('WebSocket connection closed');
          handleConnectionState("closed");
          
          // Attempt to reconnect if not at max attempts
          if (reconnectAttempts.current < maxReconnectAttempts) {
            const timeout = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
            console.log(`Attempting to reconnect in ${timeout}ms...`);
            
            reconnectTimeoutRef.current = setTimeout(() => {
              reconnectAttempts.current++;
              setupWebSocket();
            }, timeout);
          } else {
            toast.error('Connection lost. Please refresh the page to reconnect.');
          }
        };

        newSocket.onerror = (error) => {
          console.error('WebSocket error:', error);
          toast.error('Connection error. Attempting to reconnect...');
        };

        return () => {
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
          }
          if (newSocket.readyState === WebSocket.OPEN) {
            handleConnectionState("closing");
            newSocket.close();
          }
        };
      } catch (error) {
        console.error('Error setting up WebSocket:', error);
        toast.error('Failed to establish connection. Please try again.');
        handleConnectionState("disconnected");
      }
    }
  }, [user, handleConnectionState]);

  useEffect(() => {
    let cleanupFn: (() => void) | undefined;
    
    setupWebSocket().then(cleanup => {
      cleanupFn = cleanup;
    });

    return () => {
      if (cleanupFn) {
        cleanupFn();
      }
    };
  }, [setupWebSocket]);

  const sendMessage = useCallback((message: any): Promise<boolean> => {
    return new Promise((resolve, reject) => {
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        console.warn('WebSocket not ready, queueing message');
        messageQueueRef.current.push({ data: message, resolve, reject });
        return;
      }

      if (connectionState !== "authenticated") {
        console.warn('Not authenticated, queueing message');
        messageQueueRef.current.push({ data: message, resolve, reject });
        return;
      }

      try {
        socket.send(JSON.stringify(message));
        resolve(true);
      } catch (error) {
        console.error('Error sending message:', error);
        reject(error);
        messageQueueRef.current.push({ data: message, resolve, reject });
      }
    });
  }, [socket, connectionState]);

  const addMessageListener = useCallback((callback: (data: WebSocketData) => void) => {
    if (!socket) return;

    const handleMessage = (event: MessageEvent) => {
      try {
        const data: WebSocketData = JSON.parse(event.data);
        callback(data);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
        toast.error('Error processing server response');
      }
    };

    socket.addEventListener('message', handleMessage);
    return () => socket.removeEventListener('message', handleMessage);
  }, [socket]);

  const sendResearchRequest = useCallback(async (settings: Partial<ResearchSettings>): Promise<void> => {
    try {
      const validatedSettings = validateResearchSettings(settings);
      await sendMessage(validatedSettings);
    } catch (error) {
      console.error('Error sending research request:', error);
      toast.error((error as Error).message);
    }
  }, [sendMessage]);

  return {
    socket,
    isConnected,
    isAuthenticating,
    connectionState,
    sendMessage,
    addMessageListener,
    reconnect: setupWebSocket,
    sendResearchRequest
  };
}; 