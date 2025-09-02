/**
 * TRAVAIA Design System Types
 * Centralized type definitions for consistent component interfaces
 */

// Theme Types
export type ThemeMode = 'light' | 'dark' | 'auto';

export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: {
    primary: string;
    secondary: string;
    accent: string;
  };
  border: string;
  glass: {
    light: string;
    medium: string;
    strong: string;
  };
}

// Glass Component Variants
export type GlassVariant = 'light' | 'medium' | 'strong' | 'modal' | 'popup' | 'input' | 'button' | 'card' | 'nav';

// Size Types
export type ComponentSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

// Layout Types
export interface PageLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  showHeader?: boolean;
  showUserProfile?: boolean;
  className?: string;
  loading?: boolean;
  error?: string | null;
}

export interface StandardPageLayoutProps extends PageLayoutProps {
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  centered?: boolean;
}

export interface DashboardPageLayoutProps extends PageLayoutProps {
  greeting?: string;
  showStats?: boolean;
  quickActions?: React.ReactNode;
}

// Glass Component Props
export interface BaseGlassProps {
  variant?: GlassVariant;
  className?: string;
  children: React.ReactNode;
  theme?: ThemeMode;
}

export interface GlassCardProps extends BaseGlassProps, Omit<React.HTMLAttributes<HTMLDivElement>, 'className'> {
  padding?: ComponentSize;
  rounded?: ComponentSize;
  shadow?: boolean;
  hover?: boolean;
}

export interface GlassButtonProps extends BaseGlassProps {
  size?: ComponentSize;
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  fullWidth?: boolean;
  title?: string;
  'aria-label'?: string;
  'aria-expanded'?: boolean;
  'aria-controls'?: string;
}

export interface GlassInputProps extends BaseGlassProps {
  size?: ComponentSize;
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  error?: string;
  label?: string;
}

export interface GlassModalProps {
  variant?: GlassVariant;
  className?: string;
  children?: React.ReactNode;
  theme?: ThemeMode;
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  size?: ComponentSize;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  // Confirmation modal props
  message?: string;
  onConfirm?: () => void;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: 'primary' | 'danger' | 'success';
}

// Responsive Types
export interface BreakpointValues {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
}

export interface ResponsiveValue<T> {
  xs?: T;
  sm?: T;
  md?: T;
  lg?: T;
  xl?: T;
}

// Animation Types
export type AnimationType = 'fade' | 'slide' | 'scale' | 'bounce' | 'none';

export interface AnimationConfig {
  type: AnimationType;
  duration?: number;
  delay?: number;
  easing?: string;
}

// Common Pattern Props
export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  showUserProfile?: boolean;
  userProfileUrl?: string;
  userName?: string;
  actions?: React.ReactNode;
  className?: string;
}

export interface LoadingStateProps {
  size?: ComponentSize;
  message?: string;
  fullScreen?: boolean;
  className?: string;
}

export interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  fullScreen?: boolean;
  className?: string;
}

export interface EmptyStateProps {
  title: string;
  message?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}
