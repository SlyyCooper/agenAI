import { useEffect, useState } from 'react';
import { getUserProfile } from '../../api/userprofileAPI';

interface TokenDisplayProps {
  className?: string;
  showLabel?: boolean;
  size?: 'small' | 'medium' | 'large';
}

const TokenDisplay = ({ className = '', showLabel = true, size = 'medium' }: TokenDisplayProps) => {
  const [tokens, setTokens] = useState<number | null>(null);

  useEffect(() => {
    const fetchTokens = async () => {
      try {
        const profile = await getUserProfile();
        setTokens(profile.tokens);
      } catch (error) {
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

  if (tokens === null) {
    return null; // or a loading spinner
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
        <span className="font-mono">{tokens}</span>
        {showLabel && <span className="text-secondary ml-1">tokens</span>}
      </div>
    </div>
  );
};

export default TokenDisplay;

