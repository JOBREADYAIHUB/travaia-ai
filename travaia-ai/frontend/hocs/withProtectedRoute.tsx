import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';

/**
 * Higher-order component that wraps a component to ensure it's only accessible
 * to authenticated users. If the user is not authenticated, they are redirected
 * to the login page.
 * 
 * @param Component The component to wrap with authentication protection
 * @returns A wrapped component that checks for authentication
 */
const withProtectedRoute = <P extends object>(Component: React.ComponentType<P>) => {
  const WithProtectedRoute: React.FC<P> = (props) => {
    const { currentUser } = useAuth();
    const { i18n, t } = useTranslation();
    const loginRoute = t('routes.login');

    if (!currentUser) {
      // If not authenticated, redirect to login page
      return <Navigate to={`/${i18n.language}/${loginRoute}`} replace />;
    }

    // User is authenticated, render the protected component
    return <Component {...props} />;
  };

  // Set displayName for debugging purposes
  const displayName = Component.displayName || Component.name || 'Component';
  WithProtectedRoute.displayName = `withProtectedRoute(${displayName})`;

  return WithProtectedRoute;
};

export default withProtectedRoute;
