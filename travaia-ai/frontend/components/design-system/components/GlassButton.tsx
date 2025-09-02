import React from 'react';
import { GlassButtonProps } from '../types/design-system.types';
import '../../../styles/glassmorphism-utilities.css';

/**
 * GlassButton - Enhanced glassmorphism button component
 * 
 * Features:
 * - Multiple glass variants and sizes
 * - Loading and disabled states
 * - Hover and focus effects
 * - Theme-aware styling
 * - Accessible keyboard navigation
 * - TypeScript module resolution fix
 */
const GlassButton: React.FC<GlassButtonProps> = ({
  variant = 'button',
  size = 'md',
  disabled = false,
  loading = false,
  onClick,
  type = 'button',
  fullWidth = false,
  className = '',
  children,
  theme,
  title,
  'aria-label': ariaLabel,
  'aria-expanded': ariaExpanded,
  'aria-controls': ariaControls,
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

  // Size classes
  const sizeClasses = {
    xs: 'px-2 py-1 text-xs',
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
    xl: 'px-8 py-4 text-xl',
  };

  // Additional classes
  const widthClass = fullWidth ? 'w-full' : '';
  const disabledClass = disabled || loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer';
  const themeClass = theme === 'dark' ? 'dark' : '';

  const handleClick = () => {
    if (!disabled && !loading && onClick) {
      onClick();
    }
  };

  return (
    <button
      type={type}
      onClick={handleClick}
      disabled={disabled || loading}
      title={title}
      aria-label={ariaLabel}
      aria-expanded={ariaExpanded}
      aria-controls={ariaControls}
      className={`
        ${glassClasses[variant]}
        ${sizeClasses[size]}
        ${widthClass}
        ${disabledClass}
        ${themeClass}
        rounded-lg
        font-medium
        text-high-contrast
        transition-all
        duration-300
        focus:outline-none
        focus:ring-2
        focus:ring-blue-500
        focus:ring-opacity-50
        ${!disabled && !loading ? 'hover:scale-105 active:scale-95' : ''}
        ${className}
      `}
    >
      <div className="flex items-center justify-center space-x-2">
        {loading && (
          <div
            className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent"
            role="status"
            aria-label="Loading"
          ></div>
        )}
        <span>{children}</span>
      </div>
    </button>
  );
};

export default GlassButton;
