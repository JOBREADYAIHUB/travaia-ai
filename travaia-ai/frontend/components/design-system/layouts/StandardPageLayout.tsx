import React from 'react';
import AppBackground from '../../layout/AppBackground';
import PageContent from '../../layout/PageContent';
import PageHeader from '../patterns/PageHeader';
import LoadingState from './../patterns/LoadingState';
import ErrorState from './../patterns/ErrorState';
import { StandardPageLayoutProps } from '../types/design-system.types';
import '../../../styles/glassmorphism-utilities.css';

/**
 * StandardPageLayout - Reusable page layout with consistent structure
 * 
 * Features:
 * - Centralized background and content wrapper
 * - Optional header with user profile
 * - Loading and error state handling
 * - Responsive max-width options
 * - Consistent spacing and layout
 */
const StandardPageLayout: React.FC<StandardPageLayoutProps> = ({
  children,
  title,
  subtitle,
  showHeader = true,
  showUserProfile = true,
  className = '',
  loading = false,
  error = null,
  maxWidth = 'xl',
  centered = false,
}) => {
  // Max width classes
  const maxWidthClasses = {
    sm: 'max-w-2xl',
    md: 'max-w-4xl',
    lg: 'max-w-6xl',
    xl: 'max-w-7xl',
    full: 'max-w-none',
  };

  // Loading state
  if (loading) {
    return (
      <AppBackground>
        <LoadingState fullScreen />
      </AppBackground>
    );
  }

  // Error state
  if (error) {
    return (
      <AppBackground>
        <ErrorState 
          message={error} 
          onRetry={() => window.location.reload()}
          fullScreen 
        />
      </AppBackground>
    );
  }

  return (
    <AppBackground>
      <PageContent>
        <div className={`
          ${maxWidthClasses[maxWidth]}
          ${centered ? 'mx-auto' : 'container mx-auto'}
          px-4 py-8
          ${className}
        `}>
          {/* Page Header */}
          {showHeader && title && (
            <PageHeader
              title={title}
              subtitle={subtitle}
              showUserProfile={showUserProfile}
              className="mb-8"
            />
          )}

          {/* Main Content */}
          <div className="space-y-6">
            {children}
          </div>
        </div>
      </PageContent>
    </AppBackground>
  );
};

export default StandardPageLayout;
