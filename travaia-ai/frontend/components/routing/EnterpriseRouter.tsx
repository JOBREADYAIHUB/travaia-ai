/**
 * Enterprise-Grade Router Component for TRAVAIA
 * Handles 20M+ daily users with high performance and reliability
 */

import React, { useEffect, ReactNode, useState, useCallback, useMemo } from 'react';
import {
  Routes,
  Route,
  Navigate,
  useParams,
  Outlet,
  useNavigate,
  useLocation,
} from 'react-router-dom';
import { ApplicationStatus, JobApplication } from '../../types';
import { useTranslation } from 'react-i18next';
import { enterpriseRouting } from '../../utils/enterpriseRouting';
import DashboardPage from '../dashboard/DashboardPage';
import PremiumJobTrackerPage from '../job-tracker/PremiumJobTrackerPage';
// JobDetailsPage removed - functionality integrated into PremiumJobTrackerPage
import ResumeBuilderPage from '../resume-builder/ResumeBuilderPage';
import MockInterviewPage from '../mock-interview/MockInterviewPage';
import DocumentManagerPage from '../document-manager/DocumentManagerPage';
import AnalyticsPage from '../analytics/AnalyticsPage';
import UserProfilePage from '../profile/UserProfilePage';
import ToddlerUiDemoPage from '../toddler-ui-demo/ToddlerUiDemoPage';
import DocumentArtisanPage from '../document-artisan/DocumentArtisanPage';
import PageNotFound from '../PageNotFound';
import LoginPage from '../auth/LoginPage';
import { useAuth } from '../../contexts/AuthContext';

// Performance monitoring hook
const useRouteMetrics = () => {
  const [metrics, setMetrics] = useState(() => enterpriseRouting.getMetrics());
  
  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(enterpriseRouting.getMetrics());
    }, 30000); // Update every 30 seconds
    
    return () => clearInterval(interval);
  }, []);
  
  return metrics;
};

// Enhanced PrivateRoute with performance optimizations
const PrivateRoute = React.memo(({ children }: { children: ReactNode }) => {
  const { currentUser } = useAuth();
  const { i18n, t } = useTranslation();
  
  // Memoize login route to prevent unnecessary re-renders
  const loginRoute = useMemo(() => t('routes.login'), [t]);
  
  if (!currentUser) {
    return <Navigate to={`/${i18n.language}/${loginRoute}`} replace />;
  }
  
  return <>{children}</>;
});

PrivateRoute.displayName = 'PrivateRoute';

// Optimized wrapper components with React.memo
const JobTrackerPageWithNavigation = React.memo(() => {
  const navigate = useNavigate();
  return <PremiumJobTrackerPage navigate={navigate} setApplicationsForSelection={() => {}} />;
});

// JobDetailsPageWithNavigation removed - functionality integrated into PremiumJobTrackerPage

const AnalyticsPageWithNavigation = React.memo(() => {
  const navigate = useNavigate();
  return <AnalyticsPage navigate={navigate} />;
});

const UserProfilePageWithNavigation = React.memo(() => {
  const navigate = useNavigate();
  return <UserProfilePage navigate={navigate} />;
});

const ResumeBuilderPageWithNavigation = React.memo(() => {
  return <ResumeBuilderPage />;
});

const MockInterviewPageWithNavigation = React.memo(() => {
  const navigate = useNavigate();
  return <MockInterviewPage navigate={navigate} />;
});

const DocumentManagerPageWithNavigation = React.memo(() => {
  const navigate = useNavigate();
  return <DocumentManagerPage navigate={navigate} />;
});

const DocumentArtisanPageWithNavigation = React.memo(() => {
  return <DocumentArtisanPage />;
});

// Enhanced LanguageWrapper with enterprise routing
const LanguageWrapper = React.memo(() => {
  const { lang } = useParams<{ lang: string }>();
  const { i18n } = useTranslation();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLanguageSync = useCallback(async (urlLanguage: string) => {
    if (i18n.language !== urlLanguage) {
      setIsLoading(true);
      setError(null);
      
      try {
        await i18n.loadLanguages(urlLanguage);
        await i18n.changeLanguage(urlLanguage);
        
        // Validate that the current path exists in the new language
        const currentPath = location.pathname;
        const mappedPath = await enterpriseRouting.mapPathToLanguage(currentPath, urlLanguage);
        
        // If the mapped path is different and it's a fallback, show a warning
        if (mappedPath !== currentPath && mappedPath.includes('dashboard')) {
          console.warn(`Path ${currentPath} was mapped to fallback dashboard in ${urlLanguage}`);
        }
        
      } catch (err) {
        console.error('Error synchronizing language:', err);
        setError(`Failed to load language: ${urlLanguage}`);
      } finally {
        setIsLoading(false);
      }
    }
  }, [i18n, location.pathname]);

  useEffect(() => {
    if (lang) {
      handleLanguageSync(lang);
    }
  }, [lang, handleLanguageSync]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-full p-10">
        <div className="text-center text-red-600">
          <p className="text-lg font-semibold">Language Loading Error</p>
          <p className="text-sm mt-2">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full p-10">
        <div className="animate-pulse text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg">Loading translations...</p>
          <p className="text-sm text-gray-600 mt-2">Optimizing for your language</p>
        </div>
      </div>
    );
  }

  return <Outlet />;
});

LanguageWrapper.displayName = 'LanguageWrapper';

// Route configuration for better maintainability
const routeConfig = [
  { path: 'routes.dashboard', component: DashboardPage },
  { path: 'routes.jobs', component: JobTrackerPageWithNavigation },
  // Job details route removed - functionality integrated into PremiumJobTrackerPage
  { path: 'routes.resume-builder', component: ResumeBuilderPageWithNavigation },
  { path: 'routes.interview', component: MockInterviewPageWithNavigation },
  { path: 'routes.interview.selection', component: MockInterviewPageWithNavigation },
  { path: 'routes.interview.customization', component: MockInterviewPageWithNavigation },
  { path: 'routes.interview.warmup', component: MockInterviewPageWithNavigation },
  { path: 'routes.interview.session', component: MockInterviewPageWithNavigation },
  { path: 'routes.interview.results', component: MockInterviewPageWithNavigation },
  { path: 'routes.interview.stats', component: MockInterviewPageWithNavigation },
  { path: 'routes.documents', component: DocumentManagerPageWithNavigation },
  { path: 'routes.document-artisan', component: DocumentArtisanPageWithNavigation },
  { path: 'routes.analytics', component: AnalyticsPageWithNavigation },
  { path: 'routes.profile', component: UserProfilePageWithNavigation },
  { path: 'routes.toddler-ui-demo', component: ToddlerUiDemoPage },
];

// Performance monitoring component (only in development)
const RoutePerformanceMonitor = React.memo(() => {
  const metrics = useRouteMetrics();
  
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }
  
  return (
    <div className="fixed bottom-4 right-4 bg-black bg-opacity-75 text-white p-2 rounded text-xs z-50">
      <div>Cache Hit Rate: {((metrics.cacheHits / (metrics.cacheHits + metrics.cacheMisses)) * 100 || 0).toFixed(1)}%</div>
      <div>Translation Time: {metrics.translationTime.toFixed(2)}ms</div>
      <div>Errors: {metrics.errorCount}</div>
    </div>
  );
});

RoutePerformanceMonitor.displayName = 'RoutePerformanceMonitor';

const EnterpriseRouter: React.FC = () => {
  const { t, i18n } = useTranslation();
  
  // Memoize dashboard route to prevent unnecessary re-renders
  const dashboardRoute = useMemo(() => t('routes.dashboard'), [t]);
  
  return (
    <>
      <Routes>
        {/* Root redirect to dashboard with current language */}
        <Route
          path="/"
          element={<Navigate to={`/${i18n.language}/${dashboardRoute}`} replace />}
        />
        
        {/* Language-prefixed routes */}
        <Route path="/:lang" element={<LanguageWrapper />}>
          {/* Public routes */}
          <Route path={t('routes.login')} element={<LoginPage />} />
          
          {/* Protected routes - dynamically generated from config */}
          {routeConfig.map(({ path, component: Component }) => (
            <Route
              key={path}
              path={t(path)}
              element={
                <PrivateRoute>
                  <Component />
                </PrivateRoute>
              }
            />
          ))}
          
          {/* 404 handler */}
          <Route path="*" element={<PageNotFound />} />
        </Route>
      </Routes>
      
      {/* Performance monitoring in development - disabled */}
      {/* <RoutePerformanceMonitor /> */}
    </>
  );
};

export default React.memo(EnterpriseRouter);
