import React from 'react';

interface ErrorDisplayProps {
  message: string;
  onRetry?: () => void;
  className?: string;
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ 
  message, 
  onRetry, 
  className = '' 
}) => {
  return (
    <div className={`rounded-xl bg-red-500/10 p-4 text-sm text-red-900 ring-1 ring-red-400/20 dark:text-red-200 ${className}`}>
      <div className="flex items-center justify-between">
        <div>{message}</div>
        {onRetry && (
          <button 
            onClick={onRetry}
            className="ml-4 rounded-lg bg-red-600 px-3 py-1 text-xs text-white hover:bg-red-700"
          >
            Retry
          </button>
        )}
      </div>
    </div>
  );
};

export default ErrorDisplay;