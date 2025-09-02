import React, { useEffect, useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { SunIcon, MoonIcon } from './icons/Icons';
import '../styles/toddler-glassmorphism.css';
import styles from '../styles/CompactThemeToggle.module.css';

/**
 * A simple, responsive theme toggle button that switches between light and dark modes.
 * Uses clear sun/moon icons for better touch targets on small devices.
 */
const CompactThemeToggle: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const [isDark, setIsDark] = useState(theme === 'dark');

  // Sync internal state with theme context
  useEffect(() => {
    setIsDark(theme === 'dark');
  }, [theme]);

  // Apply theme class when component mounts or theme changes
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(isDark ? 'dark' : 'light');
  }, [isDark]);

  const handleThemeToggle = () => {
    const newIsDark = !isDark;
    const newTheme = newIsDark ? 'dark' : 'light';

    setIsDark(newIsDark);
    setTheme(newTheme);

    // Directly apply theme class to ensure immediate visual feedback
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(newTheme);

    // Also update localStorage for persistence
    localStorage.setItem('appTheme', newTheme);
  };

  return (
    <button
      onClick={handleThemeToggle}
      className={`${styles.themeToggleBtn} ${
        isDark ? styles.themeToggleBtnDark : styles.themeToggleBtnLight
      }`}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? (
        <SunIcon className="w-5 h-5 text-yellow-300" />
      ) : (
        <MoonIcon className="w-5 h-5 text-indigo-600" />
      )}

      {/* Small decorative glow effect */}
      <span
        className={`${styles.glowEffect} ${
          isDark ? styles.glowEffectDark : styles.glowEffectLight
        }`}
        aria-hidden="true"
      />
    </button>
  );
};

export default CompactThemeToggle;
