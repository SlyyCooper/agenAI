'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/config/firebase/AuthContext';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/config/firebase/firebase';

interface TokenDisplayProps {
  className?: string;
  showLabel?: boolean;
  size?: 'small' | 'medium' | 'large';
  showHistory?: boolean;
}

interface TokenTransaction {
  amount: number;
  type: string;
  timestamp: Date;
}

const TokenDisplay = ({ 
  className = '', 
  showLabel = true, 
  size = 'medium',
  showHistory = false 
}: TokenDisplayProps) => {
  const { user, userProfile } = useAuth();
  const [tokenHistory, setTokenHistory] = useState<TokenTransaction[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    // Subscribe to real-time token updates
    const unsubscribe = onSnapshot(
      doc(db, 'users', user.uid),
      (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          setTokenHistory(data.token_history || []);
        }
      },
      (error) => {
        setError(error.message);
        console.error('Error fetching tokens:', error);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const sizeClasses = {
    small: 'text-sm',
    medium: 'text-base',
    large: 'text-lg',
  };

  if (error) return null;
  if (!userProfile) return null;

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
          <span className="font-mono">{userProfile.tokens}</span>
          {showLabel && <span className="text-secondary ml-1">tokens</span>}
        </div>
      </div>

      {showHistory && tokenHistory.length > 0 && (
        <div className="mt-2 text-sm">
          <div className="text-secondary mb-1">Token History:</div>
          <div className="space-y-1">
            {tokenHistory.slice().reverse().map((transaction, index) => (
              <div key={index} className="flex justify-between">
                <span>{transaction.type}</span>
                <div>
                  <span className={transaction.amount >= 0 ? 'text-green-500' : 'text-red-500'}>
                    {transaction.amount > 0 ? '+' : ''}{transaction.amount}
                  </span>
                  <span className="text-xs text-gray-400 ml-2">
                    {new Date(transaction.timestamp).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TokenDisplay;

