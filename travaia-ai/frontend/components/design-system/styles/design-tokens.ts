/**
 * TRAVAIA Design System - Design Tokens
 * Centralized design values for consistent styling across all components
 */

// Color Palette
export const colors = {
  // Primary Brand Colors
  primary: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
  },
  
  // Secondary Colors
  secondary: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
  },
  
  // Accent Colors
  accent: {
    purple: '#8b5cf6',
    pink: '#ec4899',
    green: '#10b981',
    yellow: '#f59e0b',
    orange: '#f97316',
  },
  
  // Semantic Colors
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',
  
  // Glass/Glassmorphism Colors
  glass: {
    light: {
      background: 'rgba(255, 255, 255, 0.1)',
      border: 'rgba(255, 255, 255, 0.2)',
    },
    medium: {
      background: 'rgba(255, 255, 255, 0.15)',
      border: 'rgba(255, 255, 255, 0.25)',
    },
    strong: {
      background: 'rgba(255, 255, 255, 0.2)',
      border: 'rgba(255, 255, 255, 0.3)',
    },
    dark: {
      light: {
        background: 'rgba(0, 0, 0, 0.2)',
        border: 'rgba(255, 255, 255, 0.1)',
      },
      medium: {
        background: 'rgba(0, 0, 0, 0.3)',
        border: 'rgba(255, 255, 255, 0.15)',
      },
      strong: {
        background: 'rgba(0, 0, 0, 0.4)',
        border: 'rgba(255, 255, 255, 0.2)',
      },
    },
  },
  
  // Animated Background Circle Colors
  backgroundCircles: [
    'rgba(255, 105, 180, 0.15)', // Hot Pink
    'rgba(135, 206, 250, 0.15)', // Light Sky Blue
    'rgba(152, 251, 152, 0.15)', // Light Green
    'rgba(255, 215, 0, 0.15)',   // Gold
    'rgba(238, 130, 238, 0.15)', // Violet
  ],
};

// Typography
export const typography = {
  fontFamily: {
    sans: ['Inter', 'system-ui', 'sans-serif'],
    mono: ['Fira Code', 'monospace'],
  },
  fontSize: {
    xs: '0.75rem',    // 12px
    sm: '0.875rem',   // 14px
    base: '1rem',     // 16px
    lg: '1.125rem',   // 18px
    xl: '1.25rem',    // 20px
    '2xl': '1.5rem',  // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem', // 36px
    '5xl': '3rem',    // 48px
  },
  fontWeight: {
    light: 300,
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },
};

// Spacing
export const spacing = {
  0: '0',
  1: '0.25rem',   // 4px
  2: '0.5rem',    // 8px
  3: '0.75rem',   // 12px
  4: '1rem',      // 16px
  5: '1.25rem',   // 20px
  6: '1.5rem',    // 24px
  8: '2rem',      // 32px
  10: '2.5rem',   // 40px
  12: '3rem',     // 48px
  16: '4rem',     // 64px
  20: '5rem',     // 80px
  24: '6rem',     // 96px
  32: '8rem',     // 128px
};

// Border Radius
export const borderRadius = {
  none: '0',
  sm: '0.125rem',   // 2px
  base: '0.25rem',  // 4px
  md: '0.375rem',   // 6px
  lg: '0.5rem',     // 8px
  xl: '0.75rem',    // 12px
  '2xl': '1rem',    // 16px
  '3xl': '1.5rem',  // 24px
  full: '9999px',
};

// Shadows
export const shadows = {
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  base: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  glass: '0 8px 32px rgba(0, 0, 0, 0.1)',
  glassDark: '0 8px 32px rgba(0, 0, 0, 0.3)',
};

// Breakpoints
export const breakpoints = {
  xs: 320,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
};

// Z-Index Scale
export const zIndex = {
  hide: -1,
  auto: 'auto',
  base: 0,
  docked: 10,
  dropdown: 1000,
  sticky: 1100,
  banner: 1200,
  overlay: 1300,
  modal: 1400,
  popover: 1500,
  skipLink: 1600,
  toast: 1700,
  tooltip: 1800,
};

// Animation Durations
export const duration = {
  fast: '150ms',
  normal: '300ms',
  slow: '500ms',
  slower: '750ms',
};

// Animation Easings
export const easing = {
  linear: 'linear',
  easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
  easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
  easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
};

// Backdrop Blur Values
export const blur = {
  none: '0',
  sm: '4px',
  base: '8px',
  md: '12px',
  lg: '16px',
  xl: '24px',
  '2xl': '40px',
  '3xl': '64px',
};

// Component Size Scales
export const componentSizes = {
  xs: {
    padding: spacing[2],
    fontSize: typography.fontSize.xs,
    height: '1.5rem',
  },
  sm: {
    padding: spacing[3],
    fontSize: typography.fontSize.sm,
    height: '2rem',
  },
  md: {
    padding: spacing[4],
    fontSize: typography.fontSize.base,
    height: '2.5rem',
  },
  lg: {
    padding: spacing[5],
    fontSize: typography.fontSize.lg,
    height: '3rem',
  },
  xl: {
    padding: spacing[6],
    fontSize: typography.fontSize.xl,
    height: '3.5rem',
  },
};
