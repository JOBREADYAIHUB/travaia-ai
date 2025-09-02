import React from 'react';
import { GlassCardProps } from '../types/design-system.types';

/**
 * GlassCard - Enhanced glassmorphism card component
 * 
 * Features:
 * - Multiple glass variants (light, medium, strong)
 * - Configurable padding and border radius
 * - Optional hover effects and shadows
 * - Theme-aware styling
 * - Accessible and responsive
 */
const GlassCard: React.FC<GlassCardProps> = ({
  variant = 'card',
  padding = 'md',
  rounded = 'xl',
  shadow = true,
  hover = false,
  className = '',
  children,
  theme,
  ...rest
}) => {
  // Glass variant classes
  const glassClasses = {
    light: 'glass-light',
    medium: 'glass-medium',
    strong: 'glass-strong',
    modal: 'glass-modal',
    popup: 'glass-popup',
    input: 'glass-input',
    button: 'glass-button',
    card: 'glass-card',
    nav: 'glass-nav',
  };

  // Padding classes
  const paddingClasses = {
    xs: 'p-2',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
    xl: 'p-8',
  };

  // Border radius classes
  const roundedClasses = {
    xs: 'rounded',
    sm: 'rounded-md',
    md: 'rounded-lg',
    lg: 'rounded-xl',
    xl: 'rounded-2xl',
  };

  // Additional classes
  const shadowClass = shadow ? 'shadow-lg' : '';
  const hoverClass = hover ? 'hover:scale-105 transition-transform duration-300' : '';
  const themeClass = theme === 'dark' ? 'dark' : '';

  return (
    <div
      className={`
        ${glassClasses[variant]}
        ${paddingClasses[padding]}
        ${roundedClasses[rounded]}
        ${shadowClass}
        ${hoverClass}
        ${themeClass}
        ${className}
      `}
      {...rest}
    >
      {children}
    </div>
  );
};

export default GlassCard;
