import React from 'react';
import BackgroundCircles from './BackgroundCircles';
import styles from './UniversalPageLayout.module.css';

export type PageVariant = 'dashboard' | 'auth' | 'profile' | 'default';

interface UniversalPageLayoutProps {
  children: React.ReactNode;
  variant?: PageVariant;
  showBackgroundCircles?: boolean;
  circleVariant?: 'default' | 'subtle' | 'vibrant';
  circleCount?: number;
  customBackground?: string;
  className?: string;
  contentClassName?: string;
  showNavbar?: boolean;
  navbarContent?: React.ReactNode;
  fullHeight?: boolean;
}

const UniversalPageLayout: React.FC<UniversalPageLayoutProps> = ({
  children,
  variant = 'default',
  showBackgroundCircles = true,
  circleVariant = 'default',
  circleCount = 10,
  customBackground,
  className = '',
  contentClassName = '',
  showNavbar = false,
  navbarContent,
  fullHeight = true
}) => {
  const getVariantClasses = (variant: PageVariant): string => {
    switch (variant) {
      case 'dashboard':
        return styles.variantDashboard;
      case 'auth':
        return styles.variantAuth;
      case 'profile':
        return styles.variantProfile;
      default:
        return styles.variantDefault;
    }
  };

  const containerClasses = [
    styles.pageContainer,
    getVariantClasses(variant),
    fullHeight ? styles.fullHeight : '',
    className
  ].filter(Boolean).join(' ');

  const contentClasses = [
    styles.mainContent,
    contentClassName
  ].filter(Boolean).join(' ');

  return (
    <div 
      className={containerClasses}
      style={customBackground ? { background: customBackground } : undefined}
    >
      {/* Background Circles */}
      {showBackgroundCircles && (
        <BackgroundCircles 
          count={circleCount}
          variant={circleVariant}
        />
      )}

      {/* Optional Navbar */}
      {showNavbar && navbarContent && (
        <div className={styles.pageNavbar}>
          {navbarContent}
        </div>
      )}

      {/* Main Content */}
      <div className={contentClasses}>
        {children}
      </div>
    </div>
  );
};

export default UniversalPageLayout;
