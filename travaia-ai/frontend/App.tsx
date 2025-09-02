import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Sidebar from './components/Sidebar';
import EnterpriseRouter from './components/routing/EnterpriseRouter';
import usePageTitle from './hooks/usePageTitle';
// LogoutButton import removed - preventing overlap with chatbot icon
import SimpleChatbot from './components/chatbot/SimpleChatbot';
import styles from './styles/App.module.css';
import BottomNavigation from './components/BottomNavigation_';

const App: React.FC = () => {
  usePageTitle();
  const { i18n, t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, loading } = useAuth();
  
  // Track first load to prevent premature redirects
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  // Add a delay timer to ensure auth has time to restore
  const [authCheckDelay, setAuthCheckDelay] = useState(true);
  
  // Delay initial navigation until auth has time to restore
  useEffect(() => {
    const timer = setTimeout(() => {
      setAuthCheckDelay(false);
      console.log('App: Auth check delay completed');
    }, 2500); // Give auth 2.5 seconds to restore from persistence (increased for reliability)
    
    return () => clearTimeout(timer);
  }, []);
  
  // Check for and handle any pending OAuth redirects on app load
  useEffect(() => {
    const isRedirectFlow = sessionStorage.getItem('auth_redirect') === 'true';
    if (isRedirectFlow) {
      console.log('App: Detected pending OAuth redirect on app initialization');
    }
  }, []);
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Check if we're on a login-related route
  // Use a more precise check that matches only exact login routes, not paths like '/login/dashboard'
  const loginPath = `/${i18n.language}/${t('routes.login')}`;
  const isLoginRoute = location.pathname === loginPath || location.pathname === '/login';
  
  // Track when the initial authentication check is complete
  useEffect(() => {
    if (!loading && !initialLoadComplete && !authCheckDelay) {
      console.log('App: Initial authentication check complete, loading:', loading, 'user:', currentUser ? 'authenticated' : 'not authenticated');
      setInitialLoadComplete(true);
    }
  }, [loading, initialLoadComplete, currentUser, authCheckDelay]);
  
  // Handle authentication state changes and route navigation
  useEffect(() => {
    // Skip navigation logic until initial authentication check is complete and delay timer has finished
    if (loading || !initialLoadComplete || authCheckDelay) {
      console.log('App: Waiting for auth to complete before navigation decisions, loading:', loading, 'delay:', authCheckDelay);
      return;
    }
    
    console.log('App: Authentication state:', currentUser ? 'Authenticated' : 'Not authenticated');
    console.log('Current route:', location.pathname, 'isLoginRoute:', isLoginRoute);
    
    // Check if we're in an OAuth redirect flow
    const isOAuthRedirectFlow = sessionStorage.getItem('auth_redirect') === 'true';
    if (isOAuthRedirectFlow) {
      console.log('App: In OAuth redirect flow, waiting for redirect result processing');
      return; // Let AuthContext handle the redirect flow first
    }
    
    // Check if auth state is still initializing from localStorage
    const wasAuthenticated = localStorage.getItem('auth_initialized') === 'true';
    if (!currentUser && wasAuthenticated) {
      const lastAuthTime = parseInt(localStorage.getItem('last_auth_time') || '0', 10);
      const timeSinceAuth = Date.now() - lastAuthTime;
      
      // Only wait for a reasonable amount of time (30 seconds)
      if (timeSinceAuth < 30000) {
        console.log(`App: Previously authenticated ${Math.floor(timeSinceAuth/1000)}s ago, waiting for auth state to restore...`);
        return; // Wait for auth state to restore from persistence
      } else {
        console.log('App: Auth state restoration timed out after 30s, proceeding with navigation');
        localStorage.removeItem('auth_initialized');
      }
    }
    
    // IMPORTANT: Check for special flag to avoid infinite redirects
    const isInRedirectProcess = sessionStorage.getItem('redirecting') === 'true';
    if (isInRedirectProcess) {
      console.log('App: Already in redirect process, skipping navigation logic');
      return;
    }
    
    if (currentUser) {
      // If we're on a login route but authenticated, redirect to dashboard
      if (isLoginRoute) {
        console.log('App: User authenticated, redirecting to dashboard');
        // Set flag to prevent infinite redirects
        sessionStorage.setItem('redirecting', 'true');
        // Increased timeout to ensure any pending state updates complete
        setTimeout(() => {
          console.log('App: Executing dashboard navigation now');
          // Using react-router navigate instead of window.location to prevent page reloads
          navigate(`/${i18n.language}/${t('routes.dashboard')}`, { replace: true });
          // Clear the redirect flag after navigation
          setTimeout(() => sessionStorage.removeItem('redirecting'), 1000);
        }, 250);
      } else {
        console.log('App: User authenticated and already on a protected route');
      }
    } else if (!isLoginRoute && !location.pathname.includes('/signup')) {
      // If not authenticated and not on login/signup page, redirect to login
      console.log('App: User not authenticated, redirecting to login');
      // Set flag to prevent infinite redirects
      sessionStorage.setItem('redirecting', 'true');
      // Use the translated route key for login
      const loginRoute = t('routes.login');
      navigate(`/${i18n.language}/${loginRoute}`, { replace: true });
      // Clear the redirect flag after navigation
      setTimeout(() => sessionStorage.removeItem('redirecting'), 1000);
    } else {
      console.log('App: User not authenticated, but already on login/signup page');
    }
  }, [currentUser, isLoginRoute, navigate, i18n.language, location.pathname, loading, initialLoadComplete, authCheckDelay]);
  
  // Show loading state while authentication is being checked or delay is active
  if (loading || authCheckDelay) {
    // Check if there was a previous authenticated session
    const wasAuthenticated = localStorage.getItem('auth_initialized') === 'true';
    
    // If we were previously authenticated, show loading UI instead of login flash
    if (wasAuthenticated && !isLoginRoute) {
      return (
        <div className="flex items-center justify-center h-screen w-screen bg-base_200 dark:bg-dark_bg">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-neutral dark:text-gray-200">Loading your session...</p>
          </div>
        </div>
      );
    }
  }
  
  // Check for active auth redirect flow to handle it properly
  const isAuthRedirectFlow = sessionStorage.getItem('auth_redirect') === 'true';
  
  // If we're on the login page and authentication isn't being checked, render only the login content
  // OR if we're in a redirect flow, just render the router to allow the auth redirect to complete
  if (isLoginRoute || isAuthRedirectFlow) {
    console.log('App: Rendering only router for login or auth redirect flow');
    return <EnterpriseRouter />;
  }
  
  // For authenticated pages, render the full app layout
  return (
    <div
      className={`flex flex-col min-h-screen w-full overflow-hidden bg-base_200 dark:bg-dark_bg text-neutral dark:text-gray-200 ${styles.appContainer}`}
    >
      <div
        className={`flex flex-1 overflow-hidden ${
          i18n.dir() === 'rtl' ? 'flex-row-reverse' : ''
        }`}
      >
        {currentUser && (
          <Sidebar
            isSidebarOpen={isSidebarOpen}
            setIsSidebarOpen={setIsSidebarOpen}
            isRecruiterView={false}
          />
        )}
        {currentUser && isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
            onClick={() => setIsSidebarOpen(false)}
            aria-label="Close navigation menu"
          ></div>
        )}
        <main
          id="main-content"
          className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8"
        >
          <EnterpriseRouter />
        </main>
      </div>
      { /* LogoutButton removed - was appearing behind chatbot icon */ }
      {currentUser && <SimpleChatbot />}
    </div>
  );
};

export default App;
