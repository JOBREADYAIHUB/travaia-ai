import React, {
  createContext,
  useState,
  useContext,
  ReactNode,
  useEffect,
  useCallback,
} from 'react';
import { Theme } from '../types';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [theme, setTheme] = useState<Theme>(() => {
    const storedTheme = localStorage.getItem('appTheme') as Theme;
    // Validate stored theme against new theme options
    const validThemes: Theme[] = [
      'light',
      'dark',
    ];
    if (storedTheme && validThemes.includes(storedTheme)) {
      return storedTheme;
    }
    // Check for system preference if no valid theme is stored
    const prefersDark =
      window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: dark)').matches;
    return prefersDark ? 'dark' : 'light';
  });

  useEffect(() => {
    const root = window.document.documentElement;

    // Remove all theme classes first
    root.classList.remove(
      'dark',
    );

    // Apply the current theme
    if (theme === 'dark') {
      root.classList.add('dark');
    } 
    // 'light' theme doesn't need a class as it's the default

    // Force a re-render to ensure theme changes are applied
    document.body.classList.add('theme-applied');
    setTimeout(() => document.body.classList.remove('theme-applied'), 0);

    localStorage.setItem('appTheme', theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prevTheme) => {
      // Cycle through themes: light -> dark -> toddler-blue -> toddler-yellow -> toddler-pink -> light
      const themeOrder: Theme[] = [
        'light',
        'dark',
      ];
      const currentIndex = themeOrder.indexOf(prevTheme);
      const nextIndex = (currentIndex + 1) % themeOrder.length;
      return themeOrder[nextIndex];
    });
  }, []);

  const setSpecificTheme = useCallback((newTheme: Theme) => {
    setTheme(newTheme);
  }, []);

  return (
    <ThemeContext.Provider
      value={{ theme, toggleTheme, setTheme: setSpecificTheme }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
