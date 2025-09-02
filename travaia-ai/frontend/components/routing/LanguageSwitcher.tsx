/**
 * Enterprise-Grade Language Switcher Component
 * Optimized for high-performance language switching with 20M+ users
 */

import React, { useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import { enterpriseRouting } from '../../utils/enterpriseRouting';

interface Language {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  rtl?: boolean;
}

const SUPPORTED_LANGUAGES: Language[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦', rtl: true },
];

interface LanguageSwitcherProps {
  variant?: 'dropdown' | 'inline' | 'compact';
  showFlags?: boolean;
  showNativeNames?: boolean;
  className?: string;
}

const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({
  variant = 'dropdown',
  showFlags = true,
  showNativeNames = true,
  className = '',
}) => {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  // Memoize current language object
  const currentLanguage = useMemo(
    () => SUPPORTED_LANGUAGES.find(lang => lang.code === i18n.language) || SUPPORTED_LANGUAGES[0],
    [i18n.language]
  );

  // Optimized language switching with enterprise routing
  const handleLanguageChange = useCallback(async (targetLanguage: string) => {
    if (targetLanguage === i18n.language) return;

    setIsLoading(targetLanguage);
    setIsOpen(false);

    try {
      // Use enterprise routing for path mapping
      const newPath = await enterpriseRouting.mapPathToLanguage(
        location.pathname + location.search + location.hash,
        targetLanguage
      );

      // Change language in i18n
      await i18n.changeLanguage(targetLanguage);

      // Navigate to the mapped path
      navigate(newPath, { replace: true });

      // Update document language and direction for accessibility
      const targetLang = SUPPORTED_LANGUAGES.find(lang => lang.code === targetLanguage);
      if (targetLang) {
        document.documentElement.lang = targetLanguage;
        document.documentElement.dir = targetLang.rtl ? 'rtl' : 'ltr';
      }

      // Store language preference
      localStorage.setItem('preferredLanguage', targetLanguage);

    } catch (error) {
      console.error('Language switching error:', error);
      
      // Fallback: navigate to dashboard in target language
      const fallbackPath = `/${targetLanguage}/dashboard`;
      await i18n.changeLanguage(targetLanguage);
      navigate(fallbackPath, { replace: true });
    } finally {
      setIsLoading(null);
    }
  }, [i18n, location, navigate]);

  // Dropdown variant
  if (variant === 'dropdown') {
    return (
      <div className={`relative ${className}`}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 transition-all duration-200"
          disabled={!!isLoading}
        >
          {showFlags && <span className="text-lg">{currentLanguage.flag}</span>}
          <span className="font-medium">
            {showNativeNames ? currentLanguage.nativeName : currentLanguage.name}
          </span>
          <svg
            className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isOpen && (
          <div className="absolute top-full mt-2 right-0 bg-white/95 backdrop-blur-sm rounded-lg shadow-xl border border-white/20 min-w-[200px] z-50">
            {SUPPORTED_LANGUAGES.map((language) => (
              <button
                key={language.code}
                onClick={() => handleLanguageChange(language.code)}
                disabled={!!isLoading}
                className={`w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-blue-50 transition-colors duration-150 first:rounded-t-lg last:rounded-b-lg ${
                  language.code === i18n.language ? 'bg-blue-100 text-blue-700' : 'text-gray-700'
                } ${isLoading === language.code ? 'opacity-50' : ''}`}
              >
                {showFlags && <span className="text-lg">{language.flag}</span>}
                <div className="flex-1">
                  <div className="font-medium">
                    {showNativeNames ? language.nativeName : language.name}
                  </div>
                  {showNativeNames && language.nativeName !== language.name && (
                    <div className="text-sm text-gray-500">{language.name}</div>
                  )}
                </div>
                {isLoading === language.code && (
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                )}
                {language.code === i18n.language && !isLoading && (
                  <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Overlay to close dropdown */}
        {isOpen && (
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
        )}
      </div>
    );
  }

  // Inline variant
  if (variant === 'inline') {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        {SUPPORTED_LANGUAGES.map((language) => (
          <button
            key={language.code}
            onClick={() => handleLanguageChange(language.code)}
            disabled={!!isLoading}
            className={`flex items-center space-x-1 px-3 py-2 rounded-lg transition-all duration-200 ${
              language.code === i18n.language
                ? 'bg-blue-600 text-white'
                : 'bg-white/10 hover:bg-white/20 text-gray-700'
            } ${isLoading === language.code ? 'opacity-50' : ''}`}
          >
            {showFlags && <span className="text-sm">{language.flag}</span>}
            <span className="text-sm font-medium">
              {language.code.toUpperCase()}
            </span>
            {isLoading === language.code && (
              <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin"></div>
            )}
          </button>
        ))}
      </div>
    );
  }

  // Compact variant
  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-1 px-2 py-1 rounded bg-white/10 hover:bg-white/20 transition-colors duration-200"
        disabled={!!isLoading}
      >
        {showFlags && <span className="text-sm">{currentLanguage.flag}</span>}
        <span className="text-sm font-medium">{currentLanguage.code.toUpperCase()}</span>
      </button>

      {isOpen && (
        <div className="absolute top-full mt-1 right-0 bg-white/95 backdrop-blur-sm rounded shadow-lg border border-white/20 z-50">
          {SUPPORTED_LANGUAGES.map((language) => (
            <button
              key={language.code}
              onClick={() => handleLanguageChange(language.code)}
              disabled={!!isLoading}
              className={`w-full flex items-center space-x-2 px-3 py-2 text-left hover:bg-blue-50 transition-colors duration-150 ${
                language.code === i18n.language ? 'bg-blue-100 text-blue-700' : 'text-gray-700'
              } ${isLoading === language.code ? 'opacity-50' : ''}`}
            >
              {showFlags && <span className="text-sm">{language.flag}</span>}
              <span className="text-sm">{language.code.toUpperCase()}</span>
              {isLoading === language.code && (
                <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin"></div>
              )}
            </button>
          ))}
        </div>
      )}

      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export default React.memo(LanguageSwitcher);
