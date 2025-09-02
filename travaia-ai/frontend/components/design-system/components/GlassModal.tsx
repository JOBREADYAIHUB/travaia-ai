import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import GlassButton from './GlassButton';
import { GlassModalProps } from '../types/design-system.types';
import '../../../styles/glassmorphism-utilities.css';

/**
 * GlassModal - Enhanced glassmorphism modal component
 * 
 * Features:
 * - Consistent glassmorphism styling
 * - Accessibility compliance (WCAG 2.1 AA)
 * - Keyboard navigation and focus management
 * - Multiple sizes and variants
 * - Portal rendering for proper z-index
 * - Confirmation modal variant
 * - Theme-aware styling
 */
const GlassModal: React.FC<GlassModalProps> = ({
  isOpen,
  onClose,
  title,
  size = 'md',
  variant = 'modal',
  closeOnOverlayClick = true,
  closeOnEscape = true,
  className = '',
  children,
  theme,
  // Confirmation modal props
  message,
  onConfirm,
  confirmText,
  cancelText,
  confirmVariant = 'danger',
}) => {
  const { t } = useTranslation();
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Size configurations
  const sizeClasses = {
    xs: 'max-w-sm',
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl',
  };

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

  // Focus management
  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      modalRef.current?.focus();
    } else {
      previousFocusRef.current?.focus();
    }
  }, [isOpen]);

  // Keyboard event handling
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;

      if (event.key === 'Escape' && closeOnEscape) {
        onClose();
      }

      // Trap focus within modal
      if (event.key === 'Tab') {
        const focusableElements = modalRef.current?.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        
        if (focusableElements && focusableElements.length > 0) {
          const firstElement = focusableElements[0] as HTMLElement;
          const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

          if (event.shiftKey) {
            if (document.activeElement === firstElement) {
              event.preventDefault();
              lastElement.focus();
            }
          } else {
            if (document.activeElement === lastElement) {
              event.preventDefault();
              firstElement.focus();
            }
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeOnEscape, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleOverlayClick = (event: React.MouseEvent) => {
    if (event.target === event.currentTarget && closeOnOverlayClick) {
      onClose();
    }
  };

  if (!isOpen) return null;

  const themeClass = theme === 'dark' ? 'dark' : '';

  const modalContent = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
    >
      <div
        ref={modalRef}
        className={`
          ${glassClasses[variant]}
          ${sizeClasses[size]}
          ${themeClass}
          w-full
          max-h-[90vh]
          overflow-y-auto
          rounded-xl
          p-6
          ${className}
        `}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        {title && (
          <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/20">
            <h2
              id="modal-title"
              className="text-xl font-semibold text-high-contrast"
            >
              {title}
            </h2>
            <GlassButton
              onClick={onClose}
              size="sm"
              variant="button"
              className="p-2"
              aria-label="Close modal"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </GlassButton>
          </div>
        )}

        {/* Modal Content */}
        <div className="text-high-contrast">
          {variant === 'popup' && message ? (
            // Confirmation modal content
            <div>
              <p className="text-neutral-700 dark:text-gray-300 mb-6">
                {message}
              </p>
              
              <div className="flex justify-end space-x-3">
                <GlassButton
                  variant="button"
                  size="sm"
                  onClick={onClose}
                >
                  {cancelText || t('common.cancel', 'Cancel')}
                </GlassButton>
                <GlassButton
                  variant="button"
                  size="sm"
                  className={confirmVariant === 'danger' ? 'bg-red-600 hover:bg-red-700 text-white' : ''}
                  onClick={() => {
                    onConfirm?.();
                    onClose();
                  }}
                >
                  {confirmText || t('common.confirm', 'Confirm')}
                </GlassButton>
              </div>
            </div>
          ) : (
            children
          )}
        </div>
      </div>
    </div>
  );

  // Render modal in portal
  return createPortal(modalContent, document.body);
};

export default GlassModal;
