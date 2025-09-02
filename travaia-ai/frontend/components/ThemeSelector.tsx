import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import CompactThemeToggle from './CompactThemeToggle';

export const ThemeSelector: React.FC = () => {
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  return <CompactThemeToggle />;
};
