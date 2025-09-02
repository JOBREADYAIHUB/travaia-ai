import React from 'react';
import sharedStyles from '../../styles/sharedPageLayout.module.css';

interface AppBackgroundProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * AppBackground - Centralized background component with signature animated circles
 * 
 * This component provides the consistent TRAVAIA visual identity with:
 * - Dynamic animated floating circles background (5 circles with varied sizes, colors, and positions)
 * - Proper glassmorphism foundation
 * - Theme-aware styling
 * - Responsive design
 */
const AppBackground: React.FC<AppBackgroundProps> = ({ children, className = '' }) => {
  return (
    <div className={`${sharedStyles.pageContainer} ${className}`}>
      {/* Signature animated circles - dynamic implementation with 5 varied circles */}
      <div className={sharedStyles.backgroundCircles}>
        {[...Array(5)].map((_, i) => {
          const size = Math.random() * 200 + 100;
          const colors = [
            'rgba(255, 105, 180, 0.1)',
            'rgba(135, 206, 250, 0.1)',
            'rgba(152, 251, 152, 0.1)',
            'rgba(255, 215, 0, 0.1)',
            'rgba(238, 130, 238, 0.1)',
          ];

          return (
            <div
              key={i}
              className={sharedStyles.backgroundCircle}
              style={{
                width: `${size}px`,
                height: `${size}px`,
                backgroundColor: colors[i % 5],
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                animationDuration: `${Math.random() * 20 + 10}s`,
                animationDelay: `${Math.random() * 5}s`,
              }}
              aria-hidden="true"
            />
          );
        })}
      </div>
      {children}
    </div>
  );
};

export default AppBackground;
