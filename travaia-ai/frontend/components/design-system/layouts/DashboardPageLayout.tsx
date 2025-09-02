import React from 'react';
import AppBackground from '../../layout/AppBackground';
import PageContent from '../../layout/PageContent';
import PageHeader from '../patterns/PageHeader';
import LoadingState from './../patterns/LoadingState';
import ErrorState from './../patterns/ErrorState';
import { DashboardPageLayoutProps } from '../types/design-system.types';
import '../../../styles/glassmorphism-utilities.css';

/**
 * DashboardPageLayout - Specialized layout for dashboard-style pages
 * 
 * Features:
 * - Dashboard-specific header with greeting
 * - Optional stats section
 * - Quick actions area
 * - Grid-based content layout
 * - Consistent dashboard styling
 */
const DashboardPageLayout: React.FC<DashboardPageLayoutProps> = ({
  children,
  title,
  subtitle,
  greeting,
  showHeader = true,
  showUserProfile = true,
  showStats = false,
  quickActions,
  className = '',
  loading = false,
  error = null,
}) => {
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
        <div className={`container mx-auto px-4 py-8 ${className}`}>
          {/* Dashboard Header */}
          {showHeader && (
            <div className="mb-8">
              <PageHeader
                title={title || ''}
                subtitle={subtitle}
                showUserProfile={showUserProfile}
                className="mb-6"
              />
              
              {/* Dashboard Greeting */}
              {greeting && (
                <div className="glass-card p-6 mb-6">
                  <p className="text-lg text-high-contrast font-medium">
                    {greeting}
                  </p>
                </div>
              )}

              {/* Quick Actions */}
              {quickActions && (
                <div className="glass-card p-6 mb-6">
                  <h3 className="text-lg font-semibold text-high-contrast mb-4">
                    Quick Actions
                  </h3>
                  {quickActions}
                </div>
              )}
            </div>
          )}

          {/* Dashboard Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {children}
          </div>
        </div>
      </PageContent>
    </AppBackground>
  );
};

export default DashboardPageLayout;
