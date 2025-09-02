import React, { useState, useEffect, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { GlassButton } from '../design-system';
// Using SVG icons from public/icons folder instead of imported components
import LoadingSpinner from '../LoadingSpinner';
import styles from './PremiumJobTrackerNavigation.module.css';

// Note: These components are loaded by the parent component as needed

export type ViewMode = 'overview' | 'kanban' | 'list' | 'analytics';

interface PremiumJobTrackerNavigationProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onFilterClick: () => void;
  isLoading?: boolean;
  className?: string;
}

interface NavigationItem {
  id: ViewMode;
  label: string;
  iconSrc: string; // Path to SVG icon in public/icons folder
  description: string;
  badge?: string | number;
  premium?: boolean;
}

const PremiumJobTrackerNavigation: React.FC<PremiumJobTrackerNavigationProps> = ({
  currentView,
  onViewChange,
  searchTerm,
  onSearchChange,
  onFilterClick,
  isLoading = false,
  className = ''
}) => {
  const { t } = useTranslation();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [navigationHistory, setNavigationHistory] = useState<ViewMode[]>(['overview']);
  const [currentHistoryIndex, setCurrentHistoryIndex] = useState(0);

  const navigationItems: NavigationItem[] = [
    {
      id: 'overview',
      label: t('jobTracker.overview.title'),
      iconSrc: '/icons/overview.svg',
      description: 'Personalized dashboard with key metrics and insights',
      badge: 'NEW'
    },
    {
      id: 'kanban',
      label: t('jobTracker.kanbanView'),
      iconSrc: '/icons/grid.svg',
      description: 'Drag-and-drop board view with status columns'
    },
    {
      id: 'list',
      label: t('jobTracker.listView'),
      iconSrc: '/icons/list.svg',
      description: 'Compact list view with quick actions'
    },
    {
      id: 'analytics',
      label: t('analytics.title'),
      iconSrc: '/icons/bar-chart.svg',
      description: 'Detailed analytics and performance insights',
      premium: true
    }
  ];

  // Handle view transitions with smooth animations
  const handleViewChange = async (newView: ViewMode) => {
    if (newView === currentView || isTransitioning) return;

    setIsTransitioning(true);

    // Add to navigation history
    const newHistory = navigationHistory.slice(0, currentHistoryIndex + 1);
    newHistory.push(newView);
    setNavigationHistory(newHistory);
    setCurrentHistoryIndex(newHistory.length - 1);

    // Simulate transition delay for smooth animation
    await new Promise(resolve => setTimeout(resolve, 150));
    
    onViewChange(newView);
    
    // Complete transition
    setTimeout(() => {
      setIsTransitioning(false);
    }, 300);
  };

  // Navigation history functions
  const canGoBack = currentHistoryIndex > 0;
  const canGoForward = currentHistoryIndex < navigationHistory.length - 1;

  const goBack = () => {
    if (canGoBack) {
      const newIndex = currentHistoryIndex - 1;
      setCurrentHistoryIndex(newIndex);
      onViewChange(navigationHistory[newIndex]);
    }
  };

  const goForward = () => {
    if (canGoForward) {
      const newIndex = currentHistoryIndex + 1;
      setCurrentHistoryIndex(newIndex);
      onViewChange(navigationHistory[newIndex]);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Only handle shortcuts when not typing in input fields
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      const isCtrlOrCmd = event.ctrlKey || event.metaKey;

      if (isCtrlOrCmd) {
        switch (event.key) {
          case '1':
            event.preventDefault();
            handleViewChange('overview');
            break;
          case '2':
            event.preventDefault();
            handleViewChange('kanban');
            break;
          case '3':
            event.preventDefault();
            handleViewChange('list');
            break;
          case '4':
            event.preventDefault();
            // Table view was removed
            handleViewChange('list'); // Fallback to list view
            break;
          case '5':
            event.preventDefault();
            handleViewChange('analytics');
            break;
          case 'f':
            event.preventDefault();
            onFilterClick();
            break;
          case 'k':
            event.preventDefault();
            document.getElementById('job-tracker-search')?.focus();
            break;
        }
      }

      // Navigation shortcuts
      if (event.altKey) {
        switch (event.key) {
          case 'ArrowLeft':
            event.preventDefault();
            goBack();
            break;
          case 'ArrowRight':
            event.preventDefault();
            goForward();
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [currentView, currentHistoryIndex, navigationHistory]);

  return (
    <div className={`${styles.navigationContainer} ${className}`}>
      {/* Top Navigation Bar */}
      <div className={styles.topBar}>
        {/* Navigation History Controls */}
        <div className={styles.historyControls}>
          <GlassButton
            onClick={goBack}
            variant="button"
            size="sm"
            disabled={!canGoBack}
            className={`${styles.historyButton} ${!canGoBack ? styles.disabled : ''}`}
            aria-label={t('common.back')}
          >
            <img src="/icons/chevron-left.svg" alt="Previous" className="w-5 h-5" />
          </GlassButton>
          <GlassButton
            onClick={goForward}
            variant="button"
            size="sm"
            disabled={!canGoForward}
            className={`${styles.historyButton} ${!canGoForward ? styles.disabled : ''}`}
            aria-label={t('common.forward')}
          >
            <img src="/icons/chevron-right.svg" alt="Next" className="w-5 h-5" />
          </GlassButton>
        </div>

        {/* Search Bar */}
        <div className={`${styles.searchContainer} ${searchFocused ? styles.focused : ''}`}>
          <img src="/icons/search.svg" alt="Search" className={`${styles.searchIcon} w-5 h-5`} />
          <input
            id="job-tracker-search"
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            placeholder={t('jobTracker.searchPlaceholder')}
            className={styles.searchInput}
          />
          {searchTerm && (
            <GlassButton
              onClick={() => onSearchChange('')}
              variant="button"
              size="sm"
              className={styles.clearButton}
            >
              ×
            </GlassButton>
          )}
          <div className={styles.searchShortcut}>
            Ctrl+K
          </div>
        </div>

        {/* Action Buttons */}
        <div className={styles.actionButtons}>
          <GlassButton
            onClick={onFilterClick}
            variant="button"
            size="sm"
            className={styles.actionButton}
            aria-label={t('jobTracker.filter')}
          >
            <img src="/icons/settings.svg" alt="Settings" className="w-5 h-5" />
          </GlassButton>
        </div>
      </div>

      {/* View Navigation Tabs - Glassmorphic Buttons */}
      <div className={styles.viewTabs}>
        {navigationItems.map((item, index) => {
          const isActive = currentView === item.id;
          
          return (
            <div
              key={item.id}
              className={styles.tabContainer}
            >
              <button
                onClick={() => handleViewChange(item.id)}
                disabled={isTransitioning}
                className={`${styles.tab} ${isActive ? styles.activeTab : ''}`}
                title={`${item.description} (Ctrl+${index + 1})`}
                data-tooltip={item.label}
                aria-current={isActive ? 'page' : undefined}
              >
                <img 
                  src={item.iconSrc} 
                  alt={item.label} 
                  width={24} 
                  height={24} 
                  className={styles.tabIcon} 
                />
                <span className={styles.tabLabel}>{item.label}</span>
                {item.badge && (
                  <span className={styles.tabBadge}>{item.badge}</span>
                )}
                {item.premium && (
                  <span className={styles.premiumBadge}>PRO</span>
                )}
              </button>
              {isActive && <div className={styles.activeIndicator} />}
            </div>
          );
        })}
      </div>

      {/* Loading Overlay */}
      {(isTransitioning || isLoading) && (
        <div className={styles.loadingOverlay}>
          <div className={styles.loadingContent}>
            <LoadingSpinner size="md" />
            <span className={styles.loadingText}>
              {isTransitioning ? t('jobTracker.navigation.switchingView') : t('jobTracker.navigation.loading')}
            </span>
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts Help */}
   
    </div>
  );
};

// Suspense wrapper component for lazy loading
export const PremiumJobTrackerWithSuspense: React.FC<{
  currentView: ViewMode;
  children: React.ReactNode;
}> = ({ currentView, children }) => {
  const { t } = useTranslation();
  return (
    <Suspense
      fallback={
        <div className={styles.suspenseLoader}>
          <LoadingSpinner size="xl" />
          <p>{t('jobTracker.navigation.loadingView', { view: t(`jobTracker.${currentView}View`) })}</p>
        </div>
      }
    >
      {children}
    </Suspense>
  );
};

export default PremiumJobTrackerNavigation;
