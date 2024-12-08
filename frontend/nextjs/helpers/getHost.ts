interface GetHostOptions {
  purpose?: 'langgraph-gui' | 'websocket' | string;
}

export const getHost = () => {
  const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  const wsUrl = backendUrl.replace(/^https?:\/\//, '');
  const protocol = typeof window !== 'undefined' ? window.location.protocol : 'http:';
  const wsProtocol = protocol === 'https:' ? 'wss:' : 'ws:';
  const isProduction = backendUrl !== 'http://localhost:8000';
  const domain = typeof window !== 'undefined' ? window.location.hostname : '';
  const isAgenAI = domain.includes('agenai.app');
  
  // Handle agenai.app domain
  const wsBaseUrl = isAgenAI ? 'wss://orca-app-jfdlt.ondigitalocean.app' : `${wsProtocol}//${wsUrl}`;
  
  return {
    backendUrl,
    wsUrl: wsBaseUrl,
    wsEndpoint: '/ws',
    fullWsUrl: `${wsBaseUrl}/ws`
  };
};

