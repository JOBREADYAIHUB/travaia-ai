import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLocalization } from '../contexts/LocalizationContext';
import { useTranslation } from 'react-i18next'; 
import { PageNotFoundIcon } from './icons/Icons';

const PageNotFound: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { translate } = useLocalization();

  // Enhanced debugging
  console.log('❌ PageNotFound - 404 page is rendering!');
  console.log('❌ PageNotFound - Current URL:', location.pathname);
  console.log('❌ PageNotFound - Current search params:', location.search);
  console.log('❌ PageNotFound - Current hash:', location.hash);
  console.log('❌ PageNotFound - Current state:', location.state);
  console.log('❌ PageNotFound - Route key:', location.key);

  const handleGoHome = () => {
    navigate(`/${i18n.language}/${t('routes.dashboard')}`);
  };

  return (
    <div className="flex flex-col items-center justify-center h-full text-center">
      <div className="bg-base_100 dark:bg-dark_card_bg p-10 rounded-lg shadow-xl border border-base_300 dark:border-neutral-700">
        <PageNotFoundIcon className="w-24 h-24 text-accent dark:text-orange-400 mb-6 mx-auto" />
        <h1 className="text-4xl font-bold text-primary dark:text-blue-400 mb-4">
          {translate('pageNotFound')}
        </h1>
        <p className="text-neutral dark:text-gray-300 text-lg mb-8">
          {translate('pageNotFoundMessage')}
        </p>
        <button
          onClick={handleGoHome}
          className="bg-primary hover:bg-blue-600 dark:hover:bg-blue-500 text-white font-semibold py-3 px-6 rounded-lg shadow-md transition duration-150 ease-in-out transform hover:scale-105 flex items-center mx-auto"
        >
          {translate('goBack')} {translate('home')}
        </button>
      </div>
    </div>
  );
};

export default PageNotFound;
