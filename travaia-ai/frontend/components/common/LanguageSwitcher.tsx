import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { mapPathToLanguage } from '../../utils/routeUtils';
import { ensureLanguageLoaded } from '../../utils/i18nUtils';
import { useLocation, useNavigate } from 'react-router-dom';

interface LanguageSwitcherProps {
  dropdownPosition?: 'top' | 'bottom';
  showLabel?: boolean;
}

// Language loading states
type LanguageLoadingState = {
  [key: string]: boolean;
};

const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ dropdownPosition = 'bottom', showLabel = true }) => {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingLanguage, setLoadingLanguage] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();
  
  const languages = [
    { code: 'en', label: 'English' },
    { code: 'es', label: 'Español' },
    { code: 'fr', label: 'Français' },
    { code: 'ar', label: 'العربية' },
    { code: 'de', label: 'Deutsch' }
  ];

  const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLanguageChange = async (langCode: string) => {
    try {
      // Set loading state
      setIsLoading(true);
      setLoadingLanguage(langCode);
      
      // Close the dropdown immediately
      setIsOpen(false);
      
      // First ensure the language resources are loaded
      await ensureLanguageLoaded(langCode);
      
      // Calculate the equivalent path in the target language
      const translatedPath = await mapPathToLanguage(location.pathname, langCode);
      
      // Change the language in i18n
      i18n.changeLanguage(langCode);
      
      console.log(`Language switched to ${langCode}, navigating to: ${translatedPath}`);
      
      // Navigate to the translated path
      navigate(translatedPath, { replace: true });
    } catch (error) {
      console.error(`Error switching to language ${langCode}:`, error);
      // Fallback: just change the language without path translation
      i18n.changeLanguage(langCode);
    } finally {
      setIsLoading(false);
      setLoadingLanguage(null);
    }
  };

  return (
    <div className="language-switcher relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-1 px-2 py-1 rounded-md hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
        aria-expanded={isOpen}
        aria-label="Select language"
        disabled={isLoading}
      >
        {showLabel && <span className="mr-1">Language:</span>}
        <span className="font-medium">{currentLanguage.code.toUpperCase()}</span>
        {isLoading ? (
          <span className="ml-1 animate-spin">⟳</span>
        ) : (
          <span className="ml-1">{isOpen ? '▲' : '▼'}</span>
        )}
      </button>

      {isOpen && (
        <div 
          className={`absolute ${dropdownPosition === 'top' ? 'bottom-full mb-1' : 'top-full mt-1'} ${i18n.language === 'ar' ? 'right-0' : 'left-0'} z-50 w-36 bg-white dark:bg-gray-900 rounded-md shadow-lg border border-gray-200 dark:border-gray-700`}
          role="menu"
          aria-orientation="vertical"
        >
          <div className="py-1">
            {languages.map((lang) => (
              <div key={lang.code}>
                <button
                  onClick={() => handleLanguageChange(lang.code)}
                  className={`w-full ${i18n.language === 'ar' ? 'text-right' : 'text-left'} px-3 py-2 text-sm ${lang.code === i18n.language ? 'bg-blue-100 dark:bg-blue-900/30 font-medium' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                  role="menuitem"
                  disabled={isLoading}
                  aria-busy={loadingLanguage === lang.code}
                >
                  {loadingLanguage === lang.code ? `${lang.label} (${i18n.t('common.loading', 'Loading...')})` : lang.label}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default LanguageSwitcher;
