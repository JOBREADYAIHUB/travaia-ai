import React from 'react';
import { GlassButton } from '../index';
import { ErrorStateProps } from '../types/design-system.types';
import '../../../styles/glassmorphism-utilities.css';

/**
 * ErrorState - Reusable error state component
 * 
 * Features:
 * - Consistent error messaging
 * - Optional retry functionality
 * - Full screen or inline display
 * - Theme-aware styling
 * - Accessible error indicators
 * - TypeScript module resolution fix
 */
const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  message,
  onRetry,
  retryLabel = 'Try Again',
  fullScreen = false,
  className = '',
}) => {
  const containerClasses = fullScreen
    ? 'min-h-screen flex items-center justify-center'
    : 'flex items-center justify-center p-8';

  return (
    <div className={`${containerClasses} ${className}`}>
      <div className="glass-card p-8 text-center max-w-md">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
          <svg
            className="w-8 h-8 text-red-600 dark:text-red-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        </div>
        
        <h3 className="text-xl font-semibold text-high-contrast mb-2">
          {title}
        </h3>
        
        <p className="text-red-600 dark:text-red-400 mb-6">
          {message}
        </p>
        
        {onRetry && (
          <GlassButton onClick={onRetry} variant="button">
            {retryLabel}
          </GlassButton>
        )}
      </div>
    </div>
  );
};

export default ErrorState;
