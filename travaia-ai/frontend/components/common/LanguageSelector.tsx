import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLocalization } from '../../contexts/LocalizationContext';
import { mapPathToLanguage } from '../../utils/routeUtils';
import '../../styles/glassmorphism-utilities.css';
import styles from './LanguageSelector.module.css';

interface Language {
  code: string;
  name: string;
  isRtl: boolean;
  emoji: string;
  bcp47: string;
}

interface LanguageSelectorProps {
  variant?: 'compact' | 'mobile' | 'dropdown';
  className?: string;
  showLabel?: boolean;
  dropdownPosition?: 'top' | 'bottom' | 'left' | 'right';
}

/**
 * Unified language selector component that supports multiple variants:
 * - compact: Emoji-based selector for sidebars
 * - mobile: Native select dropdown for mobile devices
 * - dropdown: Full dropdown with language names
 */
export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  variant = 'dropdown',
  className = '',
  showLabel = true,
  dropdownPosition = 'bottom',
}) => {
  const {
    language = 'en',
    setLanguage,
    supportedLanguages = [],
  } = useLocalization();
  const { i18n, t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const [isRtl, setIsRtl] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Define language data with proper BCP 47 compliant codes
  const defaultLanguages: Language[] = [
    { code: 'en', name: 'English', isRtl: false, emoji: '🇬🇧', bcp47: 'en-GB' },
    { code: 'es', name: 'Español', isRtl: false, emoji: '🇪🇸', bcp47: 'es-ES' },
    { code: 'fr', name: 'Français', isRtl: false, emoji: '🇫🇷', bcp47: 'fr-FR' },
    { code: 'de', name: 'Deutsch', isRtl: false, emoji: '🇩🇪', bcp47: 'de-DE' },
    { code: 'ar', name: 'العربية', isRtl: true, emoji: '🇸🇦', bcp47: 'ar-SA' },
  ];

  // Map supported languages to our extended format
  const languages =
    supportedLanguages.length > 0
      ? supportedLanguages.map((lang) => {
          const defaultLang = defaultLanguages.find(
            (d) => d.code === lang.code,
          );
          return {
            ...lang,
            name: defaultLang?.name || lang.name,
            emoji: defaultLang?.emoji || '🌐',
            isRtl: defaultLang?.isRtl || false,
            bcp47: defaultLang?.bcp47 || `${lang.code}-${lang.code.toUpperCase()}`,
          };
        })
      : defaultLanguages;

  // Get current language data
  const currentLang =
    languages.find((lang) => lang.code === language) || defaultLanguages[0];

  useEffect(() => {
    // Set document direction based on language
    const newIsRtl = currentLang.isRtl || false;
    if (newIsRtl !== isRtl) {
      setIsRtl(newIsRtl);
      document.documentElement.dir = newIsRtl ? 'rtl' : 'ltr';
    }
  }, [language, currentLang, isRtl]);

  const handleLanguageChange = async (newLangCode: string) => {
    setIsLoading(true);

    try {
      // Map current path to new language
      const currentPath = location.pathname;
      const newPath = mapPathToLanguage(currentPath, newLangCode);
      
      // Force reload resources for the new language
      await i18n.reloadResources(newLangCode);
      
      // Change language directly through i18n instance
      await i18n.changeLanguage(newLangCode);
      
      // Update language state in context
      setLanguage(newLangCode);

      // Get the new language data for RTL support
      const newLang = languages.find((lang) => lang.code === newLangCode) || defaultLanguages[0];
      
      // Force update document direction
      document.documentElement.dir = newLang.isRtl ? 'rtl' : 'ltr';
      document.documentElement.lang = newLangCode;

      // Navigate to the new localized path
      navigate(newPath, { replace: true });

      console.log(`Language changed to ${newLangCode}, navigating from ${currentPath} to ${newPath}`);
    } catch (error) {
      console.error('Error changing language:', error);
    } finally {
      setTimeout(() => setIsLoading(false), 300);
    }
  };

  // Click outside listener for dropdown variants
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };

    if (dropdownOpen && variant !== 'mobile') {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [dropdownOpen, variant]);

  // Mobile variant - native select
  if (variant === 'mobile') {
    return (
      <div className={`language-selector language-selector--mobile ${className}`}>
        <select
          value={language}
          onChange={(e) => handleLanguageChange(e.target.value)}
          className="language-selector__select"
          aria-label={t('common.changeLanguage')}
          disabled={isLoading}
        >
          {languages.map((lang) => (
            <option
              key={lang.code}
              value={lang.code}
              dir={lang.isRtl ? 'rtl' : 'ltr'}
            >
              {`${lang.emoji} ${lang.code === 'ar' ? 'عربي' : lang.code.toUpperCase()}`}
            </option>
          ))}
        </select>
      </div>
    );
  }

  // Compact variant - clean text-only dropdown following app theme
  if (variant === 'compact') {
    return (
      <div
        className="relative"
        ref={dropdownRef}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="flex items-center justify-center p-2 rounded-full w-10 h-10 bg-white/10 dark:bg-gray-800/50 hover:bg-white/20 dark:hover:bg-gray-700/50 transition-colors border border-white/20 dark:border-gray-600/50"
          aria-label={t('common.changeLanguage')}
          onClick={() => setDropdownOpen(!dropdownOpen)}
          aria-expanded={dropdownOpen ? "true" : "false"}
          aria-controls="language-dropdown"
          disabled={isLoading}
        >
          {isLoading ? (
            <span className="animate-pulse text-gray-600 dark:text-gray-300" aria-hidden="true">
              ⏳
            </span>
          ) : (
            <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
              {currentLang.code === 'ar' ? 'عر' : currentLang.code.toUpperCase()}
            </span>
          )}
        </button>

        {dropdownOpen && (
          <div
            id="language-dropdown"
            className="absolute left-1/2 transform -translate-x-1/2 bottom-full mb-2 z-50 min-w-[80px] bg-white/95 dark:bg-gray-800/95 backdrop-blur-lg border border-white/20 dark:border-gray-600/50 rounded-lg shadow-lg"
            role="menu"
            aria-orientation="vertical"
          >
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => {
                  handleLanguageChange(lang.code);
                  setDropdownOpen(false);
                }}
                className={`w-full px-3 py-2 text-center text-sm font-medium transition-colors ${
                  language === lang.code
                    ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100/50 dark:hover:bg-gray-700/50'
                } ${lang.code === languages[0].code ? 'rounded-t-lg' : ''} ${
                  lang.code === languages[languages.length - 1].code ? 'rounded-b-lg' : ''
                }`}
                role="menuitem"
                dir={lang.isRtl ? 'rtl' : 'ltr'}
                lang={lang.bcp47}
                aria-current={language === lang.code ? 'true' : 'false'}
              >
                {lang.code === 'ar' ? 'عربي' : lang.code.toUpperCase()}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Default dropdown variant
  return (
    <div className={`language-selector language-selector--dropdown ${className}`}>
      <div className="language-selector__wrapper" ref={dropdownRef}>
        <button
          className="language-selector__button"
          onClick={() => setDropdownOpen(!dropdownOpen)}
          aria-label={t('common.changeLanguage')}
          aria-expanded={dropdownOpen ? "true" : "false"}
          disabled={isLoading}
        >
          {showLabel && (
            <span className="language-selector__label">
              {t('common.language')}
            </span>
          )}
          <div className="language-selector__current">
            <span className="language-selector__current-name">
              {currentLang?.name || language}
            </span>
            <svg
              className="language-selector__arrow"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
        </button>

        {dropdownOpen && (
          <div
            className={`language-selector__dropdown language-selector__dropdown--${dropdownPosition}`}
            role="menu"
          >
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => {
                  handleLanguageChange(lang.code);
                  setDropdownOpen(false);
                }}
                className={`language-selector__option ${
                  language === lang.code
                    ? 'language-selector__option--active'
                    : ''
                }`}
                role="menuitem"
              >
                {lang.name}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LanguageSelector;
