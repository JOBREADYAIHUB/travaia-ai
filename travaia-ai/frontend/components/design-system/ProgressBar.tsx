import React from 'react';
import styles from './ProgressBar.module.css';

interface ProgressBarProps {
  value: number;
  max?: number;
  variant?: 'default' | 'interview' | 'upload' | 'gamification' | 'achievement';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  label?: string;
  className?: string;
  animated?: boolean;
}

const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  variant = 'default',
  size = 'md',
  showLabel = false,
  label,
  className,
  animated = true
}) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  const sizeClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3'
  };

  const variantClasses = {
    default: {
      container: 'bg-gray-200 dark:bg-gray-700',
      fill: 'bg-blue-600 dark:bg-blue-500'
    },
    interview: {
      container: 'bg-gray-200 dark:bg-gray-700',
      fill: 'bg-blue-600 dark:bg-blue-500'
    },
    upload: {
      container: 'bg-gray-200 dark:bg-gray-700',
      fill: 'bg-primary dark:bg-blue-400'
    },
    gamification: {
      container: 'bg-gray-200 dark:bg-gray-700',
      fill: 'bg-gradient-to-r from-purple-500 to-blue-500'
    },
    achievement: {
      container: 'bg-gray-200 dark:bg-gray-700',
      fill: 'bg-current'
    }
  };

  const containerClass = [
    'w-full rounded-full overflow-hidden',
    sizeClasses[size],
    variantClasses[variant].container,
    className
  ].filter(Boolean).join(' ');

  const progressRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (progressRef.current) {
      progressRef.current.style.setProperty('--progress-width', `${percentage}%`);
      progressRef.current.setAttribute('aria-valuenow', String(Math.round(percentage)));
      progressRef.current.setAttribute('aria-valuemin', '0');
      progressRef.current.setAttribute('aria-valuemax', '100');
    }
  }, [percentage]);

  const fillClass = [
    'h-full rounded-full',
    styles.progressFill,
    styles[variant],
    animated && styles.animated
  ].filter(Boolean).join(' ');

  return (
    <div className="w-full">
      {showLabel && (
        <div className="flex justify-between items-center mb-2">
          {label && (
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {label}
            </span>
          )}
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {Math.round(percentage)}%
          </span>
        </div>
      )}
      <div 
        ref={progressRef}
        className={`${containerClass} ${styles.progressContainer}`}
        role="progressbar"
        aria-label={label || `Progress: ${Math.round(percentage)}%`}
      >
        <div className={fillClass} />
      </div>
    </div>
  );
};

export default ProgressBar;
