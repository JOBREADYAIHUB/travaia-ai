import React, {
  createContext,
  useContext,
  ReactNode,
  useCallback,
  useEffect,
} from 'react';
import { useTranslation } from 'react-i18next';

interface LocalizationContextType {
  translate: (key: string, options?: Record<string, any>) => string;
  language: string;
  setLanguage: (language: string) => void;
  supportedLanguages: { code: string; name: string }[];
}

const LocalizationContext = createContext<LocalizationContextType | undefined>(
  undefined,
);

export const LocalizationProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { t, i18n } = useTranslation();

  const setLanguage = useCallback(
    (language: string) => {
      i18n.changeLanguage(language);
    },
    [i18n],
  );

  // Add RTL support for Arabic
  useEffect(() => {
    // Set RTL direction for Arabic
    document.documentElement.dir = i18n.language === 'ar' ? 'rtl' : 'ltr';
    // Also set the lang attribute for accessibility
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  // Use translated language names from the translation files
  const supportedLanguages = [
    { code: 'en', name: t('language.en') },
    { code: 'fr', name: t('language.fr') },
    { code: 'es', name: t('language.es') },
    { code: 'de', name: t('language.de') },
    { code: 'ar', name: t('language.ar') },
  ];

  // Update translate function to support variable replacement
  const translate = (key: string, options?: Record<string, any>): string =>
    t(key, options);

  return (
    <LocalizationContext.Provider
      value={{
        translate,
        language: i18n.language,
        setLanguage,
        supportedLanguages,
      }}
    >
      {children}
    </LocalizationContext.Provider>
  );
};

export const useLocalization = (): LocalizationContextType => {
  const context = useContext(LocalizationContext);
  if (!context) {
    throw new Error(
      'useLocalization must be used within a LocalizationProvider',
    );
  }
  return context;
};
