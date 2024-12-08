interface GetHostOptions {
  purpose?: 'langgraph-gui' | 'websocket' | string;
}

export const getHost = () => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const backendUrl = isDevelopment 
    ? process.env.NEXT_PUBLIC_API_LOCAL_URL 
    : process.env.NEXT_PUBLIC_API_URL;
  
  const wsUrl = backendUrl?.replace(/^https?:\/\//, '') || 'localhost:8000';
  const protocol = typeof window !== 'undefined' ? window.location.protocol : 'http:';
  const wsProtocol = protocol === 'https:' ? 'wss:' : 'ws:';
  
  // Use consistent WebSocket URL based on environment
  const wsBaseUrl = isDevelopment
    ? `${wsProtocol}//${wsUrl}`
    : `${wsProtocol}//${wsUrl}`;
  
  return {
    backendUrl: backendUrl || 'http://localhost:8000',
    wsUrl: wsBaseUrl,
    wsEndpoint: '/ws',
    fullWsUrl: `${wsBaseUrl}/ws`,
    langgraphUrl: isDevelopment 
      ? process.env.NEXT_PUBLIC_LANGGRAPH_LOCAL_URL 
      : process.env.NEXT_PUBLIC_LANGGRAPH_URL
  };
};

