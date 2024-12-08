interface GetHostOptions {
  purpose?: 'langgraph-gui' | 'websocket' | string;
}

export const getHost = () => {
  const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  const wsUrl = backendUrl.replace(/^https?:\/\//, '');
  const protocol = typeof window !== 'undefined' ? window.location.protocol : 'http:';
  const wsProtocol = protocol === 'https:' ? 'wss:' : 'ws:';
  const isProduction = backendUrl !== 'http://localhost:8000';
  
  // Use consistent WebSocket URL based on API URL
  const wsBaseUrl = isProduction 
    ? `wss://${new URL(backendUrl).host}`
    : `${wsProtocol}//${wsUrl}`;
  
  return {
    backendUrl: isProduction ? backendUrl : backendUrl,
    wsUrl: wsBaseUrl,
    wsEndpoint: '/ws',
    fullWsUrl: `${wsBaseUrl}/ws`
  };
};

