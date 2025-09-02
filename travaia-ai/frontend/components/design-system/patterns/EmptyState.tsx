import React from 'react';
import { EmptyStateProps } from '../types/design-system.types';
import '../../../styles/glassmorphism-utilities.css';

/**
 * EmptyState - Reusable empty state component
 * 
 * Features:
 * - Consistent empty state messaging
 * - Optional icon and action button
 * - Theme-aware styling
 * - Accessible and responsive
 */
const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  message,
  icon,
  action,
  className = '',
}) => {
  return (
    <div className={`glass-card p-8 text-center ${className}`}>
      {icon && (
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
          {icon}
        </div>
      )}
      
      <h3 className="text-xl font-semibold text-high-contrast mb-2">
        {title}
      </h3>
      
      {message && (
        <p className="text-high-contrast opacity-70 mb-6">
          {message}
        </p>
      )}
      
      {action && action}
    </div>
  );
};

export default EmptyState;
