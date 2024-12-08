import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/config/firebase/AuthContext';
import { getHost } from '@/helpers/getHost';
import { toast } from 'react-hot-toast';

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

export const useWebSocket = () => {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { user } = useAuth();

  const setupWebSocket = useCallback(async () => {
    if (typeof window !== 'undefined' && user) {
      const { fullWsUrl } = getHost();
      const newSocket = new WebSocket(fullWsUrl);
      setSocket(newSocket);

      newSocket.onopen = async () => {
        console.log('WebSocket connection opened');
        try {
          const idToken = await user.getIdToken();
          if (!idToken) {
            console.error('Failed to get ID token');
            return;
          }
          newSocket.send(JSON.stringify({ type: 'auth', token: idToken }));
          setIsConnected(true);
        } catch (error) {
          console.error('Error getting ID token:', error);
          toast.error('Authentication failed. Please try again.');
        }
      };

      newSocket.onclose = () => {
        console.log('WebSocket connection closed');
        setIsConnected(false);
        // Attempt to reconnect after 3 seconds
        setTimeout(setupWebSocket, 3000);
      };

      newSocket.onerror = (error) => {
        console.error('WebSocket error:', error);
        toast.error('Connection error. Attempting to reconnect...');
      };

      return () => {
        if (newSocket.readyState === WebSocket.OPEN) {
          newSocket.close();
        }
      };
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
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message));
    } else {
      console.error('WebSocket is not connected');
      toast.error('Not connected to server. Please try again.');
    }
  }, [socket]);

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
    sendMessage,
    addMessageListener
  };
}; 