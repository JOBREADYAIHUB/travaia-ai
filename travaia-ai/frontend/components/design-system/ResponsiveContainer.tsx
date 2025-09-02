import React from 'react';
import { useMediaQuery } from '../../hooks/useMediaQuery';

interface ResponsiveContainerProps {
  children: React.ReactNode;
  className?: string;
  mobileLayout?: boolean;
  tabletLayout?: boolean;
  desktopLayout?: boolean;
}

export const ResponsiveContainer: React.FC<ResponsiveContainerProps> = ({
  children,
  className = '',
  mobileLayout = true,
  tabletLayout = true,
  desktopLayout = true
}) => {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const isTablet = useMediaQuery('(min-width: 769px) and (max-width: 1024px)');
  const isDesktop = useMediaQuery('(min-width: 1025px)');

  // Determine which layout to show
  const shouldRender = 
    (isMobile && mobileLayout) ||
    (isTablet && tabletLayout) ||
    (isDesktop && desktopLayout);

  if (!shouldRender) {
    return null;
  }

  const responsiveClasses = [
    // Base responsive classes
    'w-full',
    
    // Mobile-first approach
    isMobile && [
      'px-4 py-2',
      'text-sm',
      'space-y-3'
    ].filter(Boolean).join(' '),
    
    // Tablet adjustments
    isTablet && [
      'px-6 py-4',
      'text-base',
      'space-y-4'
    ].filter(Boolean).join(' '),
    
    // Desktop adjustments
    isDesktop && [
      'px-8 py-6',
      'text-base',
      'space-y-6'
    ].filter(Boolean).join(' '),
    
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={responsiveClasses}>
      {children}
    </div>
  );
};

// Mobile-specific component wrapper
export const MobileOnly: React.FC<{ children: React.ReactNode; className?: string }> = ({ 
  children, 
  className = '' 
}) => {
  const isMobile = useMediaQuery('(max-width: 768px)');
  
  if (!isMobile) return null;
  
  return <div className={`md:hidden ${className}`}>{children}</div>;
};

// Tablet-specific component wrapper
export const TabletOnly: React.FC<{ children: React.ReactNode; className?: string }> = ({ 
  children, 
  className = '' 
}) => {
  const isTablet = useMediaQuery('(min-width: 769px) and (max-width: 1024px)');
  
  if (!isTablet) return null;
  
  return <div className={`hidden md:block lg:hidden ${className}`}>{children}</div>;
};

// Desktop-specific component wrapper
export const DesktopOnly: React.FC<{ children: React.ReactNode; className?: string }> = ({ 
  children, 
  className = '' 
}) => {
  const isDesktop = useMediaQuery('(min-width: 1025px)');
  
  if (!isDesktop) return null;
  
  return <div className={`hidden lg:block ${className}`}>{children}</div>;
};

// Responsive grid component
export const ResponsiveGrid: React.FC<{
  children: React.ReactNode;
  mobileColumns?: number;
  tabletColumns?: number;
  desktopColumns?: number;
  gap?: 'sm' | 'md' | 'lg';
  className?: string;
}> = ({
  children,
  mobileColumns = 1,
  tabletColumns = 2,
  desktopColumns = 3,
  gap = 'md',
  className = ''
}) => {
  const gapClasses = {
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6'
  };

  const gridClasses = [
    'grid',
    `grid-cols-${mobileColumns}`,
    `md:grid-cols-${tabletColumns}`,
    `lg:grid-cols-${desktopColumns}`,
    gapClasses[gap],
    className
  ].join(' ');

  return (
    <div className={gridClasses}>
      {children}
    </div>
  );
};

// Responsive text component
export const ResponsiveText: React.FC<{
  children: React.ReactNode;
  mobileSize?: 'xs' | 'sm' | 'base' | 'lg' | 'xl';
  tabletSize?: 'xs' | 'sm' | 'base' | 'lg' | 'xl';
  desktopSize?: 'xs' | 'sm' | 'base' | 'lg' | 'xl';
  className?: string;
}> = ({
  children,
  mobileSize = 'sm',
  tabletSize = 'base',
  desktopSize = 'base',
  className = ''
}) => {
  const textClasses = [
    `text-${mobileSize}`,
    `md:text-${tabletSize}`,
    `lg:text-${desktopSize}`,
    className
  ].join(' ');

  return (
    <span className={textClasses}>
      {children}
    </span>
  );
};

// Responsive spacing component
export const ResponsiveSpacing: React.FC<{
  children: React.ReactNode;
  mobilePadding?: string;
  tabletPadding?: string;
  desktopPadding?: string;
  mobileMargin?: string;
  tabletMargin?: string;
  desktopMargin?: string;
  className?: string;
}> = ({
  children,
  mobilePadding = 'p-4',
  tabletPadding = 'p-6',
  desktopPadding = 'p-8',
  mobileMargin = '',
  tabletMargin = '',
  desktopMargin = '',
  className = ''
}) => {
  const spacingClasses = [
    mobilePadding,
    `md:${tabletPadding}`,
    `lg:${desktopPadding}`,
    mobileMargin,
    tabletMargin && `md:${tabletMargin}`,
    desktopMargin && `lg:${desktopMargin}`,
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={spacingClasses}>
      {children}
    </div>
  );
};
