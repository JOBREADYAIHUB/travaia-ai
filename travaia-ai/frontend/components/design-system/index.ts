/**
 * TRAVAIA Design System - Modular Component Library
 * 
 * This is the central export file for all design system components.
 * Import everything from here to ensure consistency and reduce repetition.
 */

// Export core components
export { default as GlassCard } from './components/GlassCard';
export { default as GlassButton } from './components/GlassButton';
export { default as GlassModal } from './components/GlassModal';
export { default as ProgressBar } from './ProgressBar';
export { default as Chart } from './components/Chart';
export { FormField, SelectField, TextAreaField } from './components/AccessibleForm';
export { default as SkipLink } from './components/SkipLink';
export { default as LiveRegion } from './components/LiveRegion';
export { default as DataTable } from './components/DataTable';

// Export layout components
export { default as StandardPageLayout } from './layouts/StandardPageLayout';
export { default as DashboardPageLayout } from './layouts/DashboardPageLayout';

// Export pattern components
export { default as PageHeader } from './patterns/PageHeader';
export { default as LoadingState } from './patterns/LoadingState';
export { default as ErrorState } from './patterns/ErrorState';
export { default as EmptyState } from './patterns/EmptyState';

// Export new standardized components
export { 
  LoadingStateStandardized,
  ButtonLoadingState,
  PageLoadingState,
  ContentLoadingState,
  InlineLoadingState
} from './LoadingStateStandardized';

// Export accessibility components
export { AccessibilityProvider, useAccessibility, FocusTrap } from './AccessibilityProvider';

// Export responsive components
export { 
  ResponsiveContainer, 
  MobileOnly, 
  TabletOnly, 
  DesktopOnly, 
  ResponsiveGrid, 
  ResponsiveText, 
  ResponsiveSpacing 
} from './ResponsiveContainer';
