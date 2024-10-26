import { useEffect, useState } from 'react';
import { getRemainingReports } from '../../actions/reportAPI';

interface ReportDisplayProps {
  className?: string;
  showLabel?: boolean;
  size?: 'small' | 'medium' | 'large';
}

const ReportDisplay = ({ className = '', showLabel = true, size = 'medium' }: ReportDisplayProps) => {
  const [remainingReports, setRemainingReports] = useState<number | null>(null);

  useEffect(() => {
    const fetchRemainingReports = async () => {
      try {
        const reports = await getRemainingReports();
        setRemainingReports(reports);
      } catch (error) {
        console.error('Error fetching remaining reports:', error);
      }
    };

    fetchRemainingReports();
  }, []);

  const sizeClasses = {
    small: 'text-sm',
    medium: 'text-base',
    large: 'text-lg',
  };

  if (remainingReports === null) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className={`flex items-center gap-1 ${sizeClasses[size]} animate-pulse`}>
          <div className={`${size === 'small' ? 'w-4 h-4' : size === 'medium' ? 'w-5 h-5' : 'w-6 h-6'} bg-gray-200 rounded-full`}></div>
          <div className="h-4 w-16 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className={`flex items-center gap-1 ${sizeClasses[size]}`}>
        {/* Report icon */}
        <svg 
          className={`${size === 'small' ? 'w-4 h-4' : size === 'medium' ? 'w-5 h-5' : 'w-6 h-6'} text-primary`}
          viewBox="0 0 24 24" 
          fill="currentColor"
        >
          <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
        </svg>
        <span className="font-mono">{remainingReports}</span>
        {showLabel && (
          <span className="text-secondary ml-1">
            {remainingReports === 1 ? 'report left' : 'reports left'}
          </span>
        )}
      </div>
    </div>
  );
};

export default ReportDisplay;
