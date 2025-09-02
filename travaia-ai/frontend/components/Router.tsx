import React, { useState, useEffect, ReactNode } from 'react';
import { Routes, Route, Navigate, useParams, Outlet, useNavigate } from 'react-router-dom';
// ApplicationStatus, JobApplication imports removed - no longer needed
import { useTranslation } from 'react-i18next';
import { synchronizeLanguage } from '../utils/routeUtils';
import DashboardPage from './dashboard/DashboardPage';
import PremiumJobTrackerPage from './job-tracker/PremiumJobTrackerPage';
// JobDetailsPage removed - functionality integrated into PremiumJobTrackerPage
import ResumeBuilderPage from './resume-builder/ResumeBuilderPage';
import MockInterviewPage from './mock-interview/MockInterviewPage';
import DocumentManagerPage from './document-manager/DocumentManagerPage';
import AnalyticsPage from './analytics/AnalyticsPage';
import UserProfilePage from './profile/UserProfilePage';
import ToddlerUiDemoPage from './toddler-ui-demo/ToddlerUiDemoPage';
import DocumentArtisanPage from './document-artisan/DocumentArtisanPage';
import PageNotFound from './PageNotFound';
import LoginPage from './auth/LoginPage';
import { useAuth } from '../contexts/AuthContext';

const PrivateRoute = ({ children }: { children: ReactNode }) => {
  const { currentUser } = useAuth();
  const { i18n, t } = useTranslation();
  const loginRoute = t('routes.login');
  return currentUser ? <>{children}</> : <Navigate to={`/${i18n.language}/${loginRoute}`} replace />;
};

// Wrapper components to provide navigate prop to pages that need it
const JobTrackerPageWithNavigation = () => {
  const navigate = useNavigate();
  return <PremiumJobTrackerPage navigate={navigate} setApplicationsForSelection={() => {}} />;
};

// JobDetailsPageWithNavigation removed - functionality integrated into PremiumJobTrackerPage

const AnalyticsPageWithNavigation = () => {
  const navigate = useNavigate();
  return <AnalyticsPage navigate={navigate} />;
};

const UserProfilePageWithNavigation = () => {
  const navigate = useNavigate();
  return <UserProfilePage navigate={navigate} />;
};

const ResumeBuilderPageWithNavigation = () => {
  const navigate = useNavigate();
  return <ResumeBuilderPage navigate={navigate} />;
};

const MockInterviewPageWithNavigation = () => {
  const navigate = useNavigate();
  return <MockInterviewPage navigate={navigate} />;
};

const DocumentManagerPageWithNavigation = () => {
  const navigate = useNavigate();
  return <DocumentManagerPage navigate={navigate} />;
};

const DocumentArtisanPageWithNavigation = () => {
  return <DocumentArtisanPage />;
};



const LanguageWrapper = () => {
  const { lang } = useParams<{ lang: string }>();
  const { i18n } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!lang) return;

    const handleLanguageSync = async () => {
      if (i18n.language !== lang) {
        setIsLoading(true);
        try {
          await i18n.loadLanguages(lang);
          synchronizeLanguage(lang);
        } catch (error) {
          console.error('Error synchronizing language:', error);
        } finally {
          setIsLoading(false);
        }
      }
    };

    handleLanguageSync();
  }, [lang, i18n]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full p-10">
        <div className="animate-pulse text-center">
          <p className="text-lg">Loading translations...</p>
        </div>
      </div>
    );
  }

  return <Outlet />;
};

const AppRouter: React.FC = () => {
  const { t, i18n } = useTranslation();

  // Initialize routes

  return (
    <Routes>
      {/* Root redirect to dashboard with current language */}
      <Route
        path="/"
        element={<Navigate to={`/${i18n.language}/${t('routes.dashboard')}`} replace />}
      />
      
      {/* Route for testing has been removed */}
      
      {/* Language-prefixed routes */}
      <Route path="/:lang" element={<LanguageWrapper />}>
        {/* Public routes */}
        <Route path={t('routes.login')} element={<LoginPage />} />
        
        <Route
          path={t('routes.documents')}
          element={
            <PrivateRoute>
              <DocumentManagerPageWithNavigation />
            </PrivateRoute>
          }
        />
        <Route
          path={t('routes.document-artisan')}
          element={<PrivateRoute><DocumentArtisanPageWithNavigation /></PrivateRoute>}
        />
        <Route
          path={t('routes.dashboard')}
          element={
            <PrivateRoute>
              <DashboardPage />
            </PrivateRoute>
          }
        />
        <Route
          path={t('routes.jobs')}
          element={
            <PrivateRoute>
              <JobTrackerPageWithNavigation />
            </PrivateRoute>
          }
        />
        {/* Job details route removed - functionality integrated into PremiumJobTrackerPage */}
        <Route
          path={t('routes.resume-builder')}
          element={
            <PrivateRoute>
              <ResumeBuilderPageWithNavigation />
            </PrivateRoute>
          }
        />
        <Route
          path={t('routes.interview')}
          element={
            <PrivateRoute>
              <MockInterviewPageWithNavigation />
            </PrivateRoute>
          }
        />
        <Route
          path={t('routes.interview.selection')}
          element={
            <PrivateRoute>
              <MockInterviewPageWithNavigation />
            </PrivateRoute>
          }
        />
        <Route
          path={t('routes.interview.customization')}
          element={
            <PrivateRoute>
              <MockInterviewPageWithNavigation />
            </PrivateRoute>
          }
        />
        <Route
          path={t('routes.interview.warmup')}
          element={
            <PrivateRoute>
              <MockInterviewPageWithNavigation />
            </PrivateRoute>
          }
        />
        <Route
          path={t('routes.interview.session')}
          element={
            <PrivateRoute>
              <MockInterviewPageWithNavigation />
            </PrivateRoute>
          }
        />
        <Route
          path={t('routes.interview.results')}
          element={
            <PrivateRoute>
              <MockInterviewPageWithNavigation />
            </PrivateRoute>
          }
        />
        <Route
          path={t('routes.interview.stats')}
          element={
            <PrivateRoute>
              <MockInterviewPageWithNavigation />
            </PrivateRoute>
          }
        />
        <Route
          path={t('routes.documents')}
          element={
            <PrivateRoute>
              <DocumentManagerPageWithNavigation />
            </PrivateRoute>
          }
        />
        {/* Document Artisan route removed - using hardcoded path above */}
        <Route
          path={t('routes.analytics')}
          element={
            <PrivateRoute>
              <AnalyticsPageWithNavigation />
            </PrivateRoute>
          }
        />
        <Route
          path={t('routes.profile')}
          element={
            <PrivateRoute>
              <UserProfilePageWithNavigation />
            </PrivateRoute>
          }
        />
        <Route
          path={t('routes.toddler-ui-demo')}
          element={
            <PrivateRoute>
              <ToddlerUiDemoPage />
            </PrivateRoute>
          }
        />
                  
        
        
        <Route path="*" element={<PageNotFound />} />
      </Route>
    </Routes>
  );
};

export default AppRouter;
