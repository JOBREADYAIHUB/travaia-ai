/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './App.tsx',
    './index.tsx',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class', // Enables dark mode based on class
  theme: {
    extend: {
      colors: {
        // These colors will now pull from the CSS variables
        primary: 'var(--color-primary)',
        secondary: 'var(--color-secondary)',
        accent: 'var(--color-accent)',
        neutral: 'var(--color-neutral)',
        base_100: 'var(--color-base-100)',
        base_200: 'var(--color-base-200)',
        base_300: 'var(--color-base-300)',
        sidebar_bg: 'var(--color-sidebar-bg)',
        dark_bg: 'var(--color-dark-bg)',
        dark_card_bg: 'var(--color-dark-card-bg)',
        dark_input_bg: 'var(--color-dark-input-bg)',
        text_light: 'var(--color-text-light)',
        text_dark: 'var(--color-text-dark)',

        // Specific theme colors if needed directly (though prefer semantic names)
        seeker_primary: 'var(--color-primary-seeker)',
        seeker_secondary: 'var(--color-secondary-seeker)',
        recruiter_primary: 'var(--color-primary-recruiter)',
        recruiter_secondary: 'var(--color-secondary-recruiter)',
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          '"Helvetica Neue"',
          'Arial',
          '"Noto Sans"',
          'sans-serif',
          '"Apple Color Emoji"',
          '"Segoe UI Emoji"',
          '"Segoe UI Symbol"',
          '"Noto Color Emoji"',
        ],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'fade-in-fast': 'fadeIn 0.2s ease-out',
        'slide-in-up': 'slideInUp 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        'slide-in-down':
          'slideInDown 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        'slide-in-left':
          'slideInLeft 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        'slide-in-right':
          'slideInRight 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        'global-load-pulse': 'globalLoadPulse 2s infinite ease-in-out',
        shimmer: 'shimmer 1.8s infinite linear',
        'staggered-item-entry': 'staggeredItemEntry 0.6s ease-out forwards',
        'button-ripple-effect': 'buttonRippleEffect 0.6s linear',
        'underline-reveal-effect':
          'underlineRevealEffect 0.3s ease-out forwards',
        'subtle-pulse': 'subtlePulse 2s infinite ease-in-out',
        'pop-in': 'popIn 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideInUp: {
          '0%': { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInDown: {
          '0%': { opacity: '0', transform: 'translateY(-24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInLeft: {
          '0%': { opacity: '0', transform: 'translateX(-24px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(24px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        globalLoadPulse: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.7', transform: 'scale(1.05)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-1200px 0' },
          '100%': { backgroundPosition: '1200px 0' },
        },
        staggeredItemEntry: {
          '0%': {
            opacity: '0',
            transform: 'translateY(12px) scale(0.98)',
          },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        buttonRippleEffect: {
          to: { transform: 'scale(4)', opacity: '0' },
        },
        underlineRevealEffect: {
          '0%': { width: '0%' },
          '100%': { width: '100%' },
        },
        subtlePulse: {
          '0%, 100%': {
            boxShadow: '0 0 0 0 rgba(var(--color-primary-rgb), 0.3)',
          },
          '70%': {
            boxShadow: '0 0 0 8px rgba(var(--color-primary-rgb), 0)',
          },
        },
        popIn: {
          '0%': { opacity: '0', transform: 'scale(0.9)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
};
