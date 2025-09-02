import React from 'react';
import { LoadingStateProps } from '../types/design-system.types';
import '../../../styles/glassmorphism-utilities.css';

/**
 * LoadingState - Reusable loading state component
 * 
 * Features:
 * - Consistent loading spinner (built-in to avoid circular dependencies)
 * - Optional loading message
 * - Full screen or inline display
 * - Theme-aware styling
 * - Accessible loading indicators
 * - TypeScript module resolution fix
 */
const LoadingState: React.FC<LoadingStateProps> = ({
  size = 'lg',
  message,
  fullScreen = false,
  className = '',
}) => {
  const containerClasses = fullScreen
    ? 'min-h-screen flex items-center justify-center'
    : 'flex items-center justify-center p-8';

  // Size classes for built-in spinner
  const sizeClasses = {
    xs: 'h-4 w-4 border-2',
    sm: 'h-6 w-6 border-2',
    md: 'h-8 w-8 border-3',
    lg: 'h-12 w-12 border-4',
    xl: 'h-16 w-16 border-4',
  };

  return (
    <div className={`${containerClasses} ${className}`}>
      <div className="text-center">
        <div
          className={`
            animate-spin rounded-full
            ${sizeClasses[size]}
            border-primary dark:border-blue-400
            border-t-secondary dark:border-t-orange-400
          `}
          role="status"
          aria-label="Loading"
        ></div>
        {message && (
          <p className="text-high-contrast mt-4 text-lg">
            {message}
          </p>
        )}
      </div>
    </div>
  );
};

export default LoadingState;
