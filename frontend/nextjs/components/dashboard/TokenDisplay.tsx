import { useEffect, useState } from 'react';
import { getTokenBalance } from '@/api/userprofileAPI';
import type { TokenBalanceResponse } from '@/api/types/models';

interface TokenDisplayProps {
  className?: string;
  showLabel?: boolean;
  size?: 'small' | 'medium' | 'large';
  showHistory?: boolean;
}

const TokenDisplay = ({ 
  className = '', 
  showLabel = true, 
  size = 'medium',
  showHistory = false 
}: TokenDisplayProps) => {
  const [tokenData, setTokenData] = useState<TokenBalanceResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTokens = async () => {
      try {
        const data = await getTokenBalance();
        setTokenData(data);
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Error fetching tokens');
        console.error('Error fetching tokens:', error);
      }
    };

    fetchTokens();
  }, []);

  const sizeClasses = {
    small: 'text-sm',
    medium: 'text-base',
    large: 'text-lg',
  };

  if (error) return null;
  if (!tokenData) return null;

  return (
    <div className={`flex flex-col ${className}`}>
      <div className={`flex items-center gap-2`}>
        <div className={`flex items-center gap-1 ${sizeClasses[size]}`}>
          <svg 
            className={`${size === 'small' ? 'w-4 h-4' : size === 'medium' ? 'w-5 h-5' : 'w-6 h-6'} text-primary`}
            viewBox="0 0 24 24" 
            fill="currentColor"
          >
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
            <path d="M12 6c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z"/>
          </svg>
          <span className="font-mono">{tokenData.tokens}</span>
          {showLabel && <span className="text-secondary ml-1">tokens</span>}
        </div>
      </div>

      {showHistory && tokenData.token_history && tokenData.token_history.length > 0 && (
        <div className="mt-2 text-sm">
          <div className="text-secondary mb-1">Token History:</div>
          <div className="space-y-1">
            {tokenData.token_history.map((transaction, index) => (
              <div key={index} className="flex justify-between">
                <span>{transaction.type}</span>
                <span className={transaction.amount >= 0 ? 'text-green-500' : 'text-red-500'}>
                  {transaction.amount > 0 ? '+' : ''}{transaction.amount}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TokenDisplay;

