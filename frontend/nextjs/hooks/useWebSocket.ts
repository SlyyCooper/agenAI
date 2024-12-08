import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/config/firebase/AuthContext';
import { getHost } from '@/helpers/getHost';
import { toast } from 'react-hot-toast';

interface WebSocketData {
  type: string;
  content?: string;
  output?: string;
  status?: 'success' | 'error';
  message?: string;
  metadata?: {
    sources?: Array<{ title: string; url: string }>;
    topics?: string[];
    summary?: string;
    error?: string;
  };
}

export const useWebSocket = () => {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const { user } = useAuth();
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const messageQueueRef = useRef<any[]>([]);

  const setupWebSocket = useCallback(async () => {
    if (typeof window !== 'undefined' && user) {
      try {
        const { fullWsUrl } = getHost();
        console.log('Connecting to WebSocket:', fullWsUrl);
        
        const newSocket = new WebSocket(fullWsUrl);
        setSocket(newSocket);

        newSocket.onopen = async () => {
          console.log('WebSocket connection opened');
          setIsAuthenticating(true);
          
          try {
            const idToken = await user.getIdToken();
            if (!idToken) {
              throw new Error('Failed to get ID token');
            }
            
            newSocket.send(JSON.stringify({ type: 'auth', token: idToken }));
          } catch (error) {
            console.error('Error getting ID token:', error);
            toast.error('Authentication failed. Please try again.');
            newSocket.close();
          }
        };

        newSocket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'auth') {
              if (data.status === 'success') {
                setIsConnected(true);
                setIsAuthenticating(false);
                reconnectAttempts.current = 0;
                
                // Send any queued messages
                while (messageQueueRef.current.length > 0) {
                  const message = messageQueueRef.current.shift();
                  if (newSocket.readyState === WebSocket.OPEN) {
                    newSocket.send(JSON.stringify(message));
                  }
                }
              } else {
                throw new Error(data.message || 'Authentication failed');
              }
            }
          } catch (error) {
            console.error('Error processing message:', error);
            setIsConnected(false);
            setIsAuthenticating(false);
          }
        };

        newSocket.onclose = () => {
          console.log('WebSocket connection closed');
          setIsConnected(false);
          setIsAuthenticating(false);
          
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
            newSocket.close();
          }
        };
      } catch (error) {
        console.error('Error setting up WebSocket:', error);
        toast.error('Failed to establish connection. Please try again.');
      }
    }
  }, [user]);

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

  const sendMessage = useCallback((message: any) => {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket not ready, queueing message');
      messageQueueRef.current.push(message);
      return;
    }

    if (isAuthenticating) {
      console.warn('Still authenticating, queueing message');
      messageQueueRef.current.push(message);
      return;
    }

    try {
      socket.send(JSON.stringify(message));
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message. Please try again.');
      messageQueueRef.current.push(message);
    }
  }, [socket, isAuthenticating]);

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

  return {
    socket,
    isConnected,
    isAuthenticating,
    sendMessage,
    addMessageListener,
    reconnect: setupWebSocket
  };
}; 