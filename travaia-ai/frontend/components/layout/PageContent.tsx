import React from 'react';
import sharedStyles from '../../styles/sharedPageLayout.module.css';

interface PageContentProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * PageContent - Main content wrapper with proper z-index and spacing
 * 
 * This component provides:
 * - Proper z-index layering above background
 * - Consistent content spacing and layout
 * - Responsive design patterns
 * - Theme-aware styling
 */
const PageContent: React.FC<PageContentProps> = ({ children, className = '' }) => {
  return (
    <div className={`${sharedStyles.mainContent} ${className}`}>
      {children}
    </div>
  );
};

export default PageContent;
