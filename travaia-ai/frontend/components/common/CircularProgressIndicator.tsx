/* eslint-disable jsx-a11y/aria-proptypes */
/* eslint-disable react/forbid-component-props */
import React from 'react';
import styles from './CircularProgressIndicator.module.css';

interface CircularProgressIndicatorProps {
  value: number; // 0-100
  size?: number; // size in pixels
  strokeWidth?: number; // stroke width in pixels
  className?: string;
  color?: string; // optional color override
  progressColor?: string; // backward compatibility for existing usages
}

export const CircularProgressIndicator: React.FC<CircularProgressIndicatorProps> = ({
  value,
  size = 48,
  strokeWidth = 4,
  className = '',
  color,
  progressColor,
}) => {
  // Clamp the value between 0-100
  const normalizedValue = Math.min(100, Math.max(0, value));
  
  // Calculate circle attributes
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (normalizedValue / 100) * circumference;
  
  // Map Tailwind color classes to CSS module classes
  const getColorClass = (colorClass: string) => {
    switch(colorClass) {
      case 'bg-green-500': return styles.green;
      case 'bg-blue-500': return styles.blue;
      case 'bg-yellow-500': return styles.yellow;
      case 'bg-red-500': return styles.red;
      case 'bg-gray-200': return styles.gray;
      case 'bg-gray-700': return styles.darkGray;
      default: return styles.blue; // Default to blue
    }
  };

  // Get the progress color class based on value
  const getProgressColorClass = () => {
    if (color) return color;
    if (progressColor) return progressColor;
    if (normalizedValue >= 80) return 'bg-green-500';
    if (normalizedValue >= 50) return 'bg-blue-500';
    if (normalizedValue >= 20) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  // Create a ref to manipulate the DOM element directly
  const progressRef = React.useRef<HTMLDivElement>(null);
  
  // Set ARIA attributes and size via ref after render
  React.useEffect(() => {
    if (progressRef.current) {
      // Set ARIA attributes directly on the DOM element
      progressRef.current.setAttribute('aria-valuenow', String(normalizedValue));
      progressRef.current.setAttribute('aria-valuemin', '0');
      progressRef.current.setAttribute('aria-valuemax', '100');
      // Set size CSS custom property
      progressRef.current.style.setProperty('--size', `${size}px`);
    }
  }, [normalizedValue, size]);
  
  return (
    <div 
      ref={progressRef}
      className={`relative inline-flex ${styles.container} ${className} ${styles.progressContainer}`}
      role="progressbar"
      aria-label={`Progress: ${normalizedValue}%`}
    >
      <svg 
        className="w-full h-full" 
        viewBox={`0 0 ${size} ${size}`}
        data-testid="progress-circle"
      >
        {/* Background Circle */}
        <circle
          className={`${styles.gray} stroke-current`}
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
        />
        
        {/* Progress Circle */}
        <circle
          className={`${styles.progressCircle} ${getColorClass(getProgressColorClass())}`}
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
        />
      </svg>
    </div>
  );
};
/* eslint-enable jsx-a11y/aria-proptypes */
