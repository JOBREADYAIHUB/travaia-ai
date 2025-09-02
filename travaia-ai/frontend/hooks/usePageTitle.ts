import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const usePageTitle = () => {
  const location = useLocation();
  const { t, i18n } = useTranslation();

  useEffect(() => {
    const pathParts = location.pathname.split('/').filter(Boolean);
    const lang = pathParts[0];
    const routeKey = pathParts.slice(1).join('.') || 'dashboard';

    if (lang === i18n.language) {
      const titleKey = `routes.${routeKey}`;
      const translatedTitle = t(titleKey);
      document.title = `Travaia - ${translatedTitle}`;
    }
  }, [location, t, i18n.language]);
};

export default usePageTitle;
