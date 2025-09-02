import React from 'react';
import { useAccessibility } from './AccessibilityProvider';

interface LoadingStateProps {
  variant?: 'spinner' | 'skeleton' | 'pulse' | 'dots';
  size?: 'sm' | 'md' | 'lg';
  message?: string;
  className?: string;
  fullScreen?: boolean;
}

export const LoadingStateStandardized: React.FC<LoadingStateProps> = ({
  variant = 'spinner',
  size = 'md',
  message = 'Loading...',
  className = '',
  fullScreen = false
}) => {
  const { isReducedMotion, announceMessage } = useAccessibility();

  React.useEffect(() => {
    if (message) {
      announceMessage(message);
    }
  }, [message, announceMessage]);

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  const containerClasses = fullScreen 
    ? 'fixed inset-0 flex items-center justify-center bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm z-50'
    : 'flex items-center justify-center p-4';

  const renderSpinner = () => (
    <div 
      className={`${sizeClasses[size]} border-2 border-gray-200 dark:border-gray-700 border-t-blue-600 rounded-full ${
        isReducedMotion ? '' : 'animate-spin'
      }`}
      role="status"
      aria-label={message}
    >
      <span className="sr-only">{message}</span>
    </div>
  );

  const renderSkeleton = () => (
    <div className="space-y-3 w-full max-w-md">
      <div className={`h-4 bg-gray-200 dark:bg-gray-700 rounded ${isReducedMotion ? '' : 'animate-pulse'}`}></div>
      <div className={`h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6 ${isReducedMotion ? '' : 'animate-pulse'}`}></div>
      <div className={`h-4 bg-gray-200 dark:bg-gray-700 rounded w-4/6 ${isReducedMotion ? '' : 'animate-pulse'}`}></div>
    </div>
  );

  const renderPulse = () => (
    <div className={`${sizeClasses[size]} bg-blue-600 rounded-full ${isReducedMotion ? '' : 'animate-pulse'}`}>
      <span className="sr-only">{message}</span>
    </div>
  );

  const renderDots = () => (
    <div className="flex space-x-1" role="status" aria-label={message}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={`w-2 h-2 bg-blue-600 rounded-full ${
            isReducedMotion ? '' : 'animate-bounce'
          }`}
          style={isReducedMotion ? {} : { animationDelay: `${i * 0.1}s` }}
        ></div>
      ))}
      <span className="sr-only">{message}</span>
    </div>
  );

  const renderLoadingContent = () => {
    switch (variant) {
      case 'skeleton':
        return renderSkeleton();
      case 'pulse':
        return renderPulse();
      case 'dots':
        return renderDots();
      default:
        return renderSpinner();
    }
  };

  return (
    <div className={`${containerClasses} ${className}`}>
      <div className="flex flex-col items-center space-y-3">
        {renderLoadingContent()}
        {message && variant !== 'skeleton' && (
          <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
            {message}
          </p>
        )}
      </div>
    </div>
  );
};

// Specialized loading components
export const ButtonLoadingState: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size = 'sm' }) => (
  <LoadingStateStandardized variant="spinner" size={size} message="" />
);

export const PageLoadingState: React.FC<{ message?: string }> = ({ message = 'Loading page...' }) => (
  <LoadingStateStandardized variant="spinner" size="lg" message={message} fullScreen />
);

export const ContentLoadingState: React.FC<{ message?: string }> = ({ message = 'Loading content...' }) => (
  <LoadingStateStandardized variant="skeleton" message={message} />
);

export const InlineLoadingState: React.FC<{ message?: string }> = ({ message = 'Loading...' }) => (
  <LoadingStateStandardized variant="dots" size="sm" message={message} />
);

export default LoadingStateStandardized;
