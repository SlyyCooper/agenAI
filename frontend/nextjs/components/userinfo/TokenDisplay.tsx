import { useEffect, useState } from 'react';
import { getTokenBalance, TokenBalance } from '../../actions/tokenAPI';

interface TokenDisplayProps {
  className?: string;
  showLabel?: boolean;
  size?: 'small' | 'medium' | 'large';
  refreshTrigger?: number; // Add this to allow parent components to trigger refresh
}

const TokenDisplay = ({ 
  className = '', 
  showLabel = true, 
  size = 'medium',
  refreshTrigger = 0 
}: TokenDisplayProps) => {
  const [tokenData, setTokenData] = useState<TokenBalance | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTokenBalance = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const balance = await getTokenBalance();
        setTokenData(balance);
      } catch (error) {
        console.error('Error fetching token balance:', error);
        setError(error instanceof Error ? error.message : 'Failed to fetch tokens');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTokenBalance();
  }, [refreshTrigger]); // Re-fetch when refreshTrigger changes

  const sizeClasses = {
    small: 'text-sm',
    medium: 'text-base',
    large: 'text-lg',
  };

  if (isLoading) {
    return (
      <div className={`flex items-center gap-2 ${className} animate-pulse`}>
        <div className={`h-${size === 'small' ? '4' : size === 'medium' ? '5' : '6'} w-${size === 'small' ? '4' : size === 'medium' ? '5' : '6'} bg-gray-200 rounded-full`}></div>
        <div className={`h-4 w-12 bg-gray-200 rounded`}></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 text-sm">
        <span title={error}>Failed to load tokens</span>
      </div>
    );
  }

  if (!tokenData) {
    return null;
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className={`flex items-center gap-1 ${sizeClasses[size]}`}>
        {/* Token icon */}
        <svg 
          className={`${size === 'small' ? 'w-4 h-4' : size === 'medium' ? 'w-5 h-5' : 'w-6 h-6'} text-primary`}
          viewBox="0 0 24 24" 
          fill="currentColor"
        >
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
          <path d="M12 6c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z"/>
        </svg>
        <span className="font-mono">{tokenData.balance}</span>
        {showLabel && (
          <div className="flex flex-col">
            <span className="text-secondary ml-1">tokens</span>
            {tokenData.last_updated && (
              <span className="text-xs text-gray-400" title={new Date(tokenData.last_updated).toLocaleString()}>
                Updated {new Date(tokenData.last_updated).toLocaleDateString()}
              </span>
            )}
          </div>
        )}
      </div>
      {tokenData.subscription_status && (
        <span className={`text-xs px-2 py-0.5 rounded-full ${
          tokenData.subscription_status === 'active' ? 'bg-green-100 text-green-800' : 
          tokenData.subscription_status === 'cancelled' ? 'bg-red-100 text-red-800' : 
          'bg-gray-100 text-gray-800'
        }`}>
          {tokenData.subscription_status}
        </span>
      )}
    </div>
  );
};

export default TokenDisplay;
