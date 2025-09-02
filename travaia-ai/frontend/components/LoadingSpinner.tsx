import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  color?: string; // e.g., border-primary, border-white
  secondaryColor?: string; // e.g., border-t-secondary
  responsive?: boolean; // Whether to use responsive sizes
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  className = '',
  color = 'border-primary dark:border-blue-400',
  secondaryColor = 'border-t-secondary dark:border-t-orange-400',
  responsive = true,
}) => {
  const sizeClasses = responsive
    ? {
        sm: 'h-4 w-4 sm:h-5 sm:w-5 border-2',
        md: 'h-7 w-7 sm:h-8 sm:w-8 border-t-3 border-r-2 border-b-2 border-l-3 sm:border-t-4 sm:border-r-2 sm:border-b-2 sm:border-l-4', // Asymmetric for style
        lg: 'h-10 w-10 sm:h-12 sm:w-12 border-t-3 border-r-2 border-b-2 border-l-3 sm:border-t-4 sm:border-r-2 sm:border-b-2 sm:border-l-4', // Asymmetric for style
        xl: 'h-14 w-14 sm:h-16 sm:w-16 border-t-4 border-r-3 border-b-3 border-l-4 sm:border-t-5 sm:border-r-3 sm:border-b-3 sm:border-l-5', // Larger size
      }
    : {
        sm: 'h-5 w-5 border-2',
        md: 'h-8 w-8 border-t-4 border-r-2 border-b-2 border-l-4', // Asymmetric for style
        lg: 'h-12 w-12 border-t-4 border-r-2 border-b-2 border-l-4', // Asymmetric for style
        xl: 'h-16 w-16 border-t-5 border-r-3 border-b-3 border-l-5', // Larger size
      };

  return (
    <div
      className={`animate-spin rounded-full ${sizeClasses[size]} ${color} ${secondaryColor} ${className}`}
    ></div>
  );
};

export default LoadingSpinner;
