import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { LogoutIcon } from '../icons/Icons';
import { useTranslation } from 'react-i18next';

const LogoutButton: React.FC = () => {
  const { logout } = useAuth();
  const { t } = useTranslation();

  const handleLogout = async () => {
    try {
      await logout();
      // Redirect to travaia.co after successful logout
      window.location.href = 'https://travaia.co';
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };

  return (
    <button
      onClick={handleLogout}
      className="fixed bottom-4 right-4 bg-primary text-white p-3 rounded-full shadow-lg hover:bg-primary-focus focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary z-50"
      aria-label={t('logout')}
    >
      <LogoutIcon className="h-6 w-6" />
    </button>
  );
};

export default LogoutButton;
