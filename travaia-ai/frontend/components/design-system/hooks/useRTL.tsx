import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const RTL_LANGUAGES = ['ar', 'he', 'fa', 'ur'];

export const useRTL = () => {
  const { i18n } = useTranslation();
  
  const isRTL = RTL_LANGUAGES.includes(i18n.language);
  
  useEffect(() => {
    const htmlElement = document.documentElement;
    
    if (isRTL) {
      htmlElement.setAttribute('dir', 'rtl');
      htmlElement.setAttribute('lang', i18n.language);
    } else {
      htmlElement.setAttribute('dir', 'ltr');
      htmlElement.setAttribute('lang', i18n.language);
    }
    
    // Import RTL styles when needed
    if (isRTL) {
      import('../styles/rtl-support.css');
    }
    
    return () => {
      // Cleanup if component unmounts
      htmlElement.removeAttribute('dir');
    };
  }, [isRTL, i18n.language]);
  
  return {
    isRTL,
    direction: isRTL ? 'rtl' : 'ltr',
    language: i18n.language
  };
};
