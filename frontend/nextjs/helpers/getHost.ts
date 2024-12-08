interface GetHostOptions {
  purpose?: 'langgraph-gui' | string;
}

export const getHost = ({ purpose }: GetHostOptions = {}): string => {
  if (typeof window === 'undefined') return '';

  const { host } = window.location;
  const isLocalEnvironment = host.includes('localhost');

  if (purpose === 'langgraph-gui') {
    return isLocalEnvironment
      ? (process.env.NEXT_PUBLIC_LANGGRAPH_LOCAL_URL || 'http://127.0.0.1:8123')
      : (process.env.NEXT_PUBLIC_LANGGRAPH_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000');
  }

  return isLocalEnvironment
    ? (process.env.NEXT_PUBLIC_API_LOCAL_URL || 'http://localhost:8000')
    : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000');
};

