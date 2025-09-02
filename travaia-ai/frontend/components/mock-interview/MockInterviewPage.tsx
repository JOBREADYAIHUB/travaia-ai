import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { NavigateFunction, useLocation } from 'react-router-dom';
import '../../styles/toddler-glassmorphism.css';
// Import components
// Design System Components (gradual migration)
import { 
  GlassModal,
  GlassCard 
} from '../design-system';
import AppBackground from '../layout/AppBackground';
import PageContent from '../layout/PageContent';
import PageHeader from '../design-system/patterns/PageHeader';

// Import sub-components (continued)
import InteractiveOnboarding from './InteractiveOnboarding';

// Import types and services
import {
  JobApplication,
  ApplicationStatus,
  InterviewSettings,
  InterviewType,
  InterviewMode,
  InterviewDifficulty,
  AIVoiceStyle,
  MockInterviewSession
} from '../../types';
import { fetchUserSectionData } from '../../services/firestoreService';

// Import sub-components
import InterviewStarter from './InterviewStarter';
import InterviewCustomizer from './InterviewCustomizer';
import PipecatInterviewSession from './PipecatInterviewSession';
import LiveKitInterviewSession from './LiveKitInterviewSession';
import InterviewSession from './InterviewSession';
import GamificationPanel from './GamificationPanel';
import InterviewWarmup from './InterviewWarmup';
import InterviewResults from './InterviewResults';

/**
 * Mock Interview Platform - Main component
 * Provides AI-powered interview practice with real-time feedback
 */

interface MockInterviewPageProps {
  navigate: NavigateFunction;
}

type ViewState = 'selection' | 'customization' | 'warmup' | 'session' | 'pipecat-session' | 'livekit-session' | 'pipecat-demo' | 'results' | 'stats';

const MockInterviewPage: React.FC<MockInterviewPageProps> = ({ navigate }): React.ReactNode => {
  const { t, i18n } = useTranslation();
  const { currentUser } = useAuth();
  const location = useLocation();

  // Helper function to determine view from URL path
  const getViewFromPath = (): ViewState => {
    const path = location.pathname;
    const currentLang = i18n.language;
    
    // Extract the sub-route from the path
    const mockInterviewBasePath = `/${currentLang}/${t('routes.interview')}`;
    const subPath = path.replace(mockInterviewBasePath, '').replace(/^\//, '');
    
    // Map sub-routes to view states
    const routeMap: Record<string, ViewState> = {
      'selection': 'selection',
      'customization': 'customization', 
      'warmup': 'warmup',
      'session': 'session',
      'livekit-session': 'livekit-session',
      'pipecat-session': 'pipecat-session',
      'results': 'results',
      'stats': 'stats'
    };
    
    return routeMap[subPath] || 'selection';
  };

  // Helper function to navigate to different views using URL routing
  const navigateToView = (view: ViewState) => {
    const currentLang = i18n.language;
    const mockInterviewBasePath = `/${currentLang}/${t('routes.interview')}`;
    
    // Map view states to sub-routes
    const viewRouteMap: Record<ViewState, string> = {
      'selection': '',
      'customization': '/customization',
      'warmup': '/warmup',
      'session': '/session',
      'pipecat-session': '/session',
      'livekit-session': '/session',
      'pipecat-demo': '/session',
      'results': '/results',
      'stats': '/stats'
    };
    
    const targetPath = mockInterviewBasePath + viewRouteMap[view];
    navigate(targetPath, { replace: false });
    setCurrentView(view);
  };

  // State management
  const [currentView, setCurrentView] = useState<ViewState>(getViewFromPath());
  const [jobApplications, setJobApplications] = useState<JobApplication[]>([]);
  const [selectedApplication, setSelectedApplication] = useState<JobApplication | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [interviewSettings, setInterviewSettings] = useState<InterviewSettings>({
    jobRole: '',
    interviewType: InterviewType.BEHAVIORAL,
    interviewMode: InterviewMode.TEXT,
    difficulty: InterviewDifficulty.MODERATE,
    language: 'en',
    voiceStyle: AIVoiceStyle.PROFESSIONAL
  });
  const [interviewSession, setInterviewSession] = useState<MockInterviewSession | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionRestored, setSessionRestored] = useState(false);

  // Session persistence key
  const SESSION_STORAGE_KEY = 'mockInterview_session';

  // Save session data to localStorage
  const saveSessionData = () => {
    const sessionData = {
      selectedApplication,
      interviewSettings,
      interviewSession,
      showOnboarding
    };
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionData));
  };

  // Load session data from localStorage
  const loadSessionData = () => {
    try {
      const savedData = localStorage.getItem(SESSION_STORAGE_KEY);
      if (savedData) {
        const sessionData = JSON.parse(savedData);
        let hasRestoredData = false;
        
        if (sessionData.selectedApplication) {
          setSelectedApplication(sessionData.selectedApplication);
          hasRestoredData = true;
        }
        if (sessionData.interviewSettings) {
          setInterviewSettings(sessionData.interviewSettings);
          hasRestoredData = true;
        }
        if (sessionData.interviewSession) {
          setInterviewSession(sessionData.interviewSession);
          hasRestoredData = true;
        }
        if (sessionData.showOnboarding !== undefined) {
          setShowOnboarding(sessionData.showOnboarding);
        }
        
        // Show restoration notification if data was restored
        if (hasRestoredData) {
          setSessionRestored(true);
          // Auto-hide notification after 5 seconds
          setTimeout(() => setSessionRestored(false), 5000);
        }
      }
    } catch (error) {
      console.error('Failed to load session data:', error);
    }
  };

  // Clear session data
  const clearSessionData = () => {
    localStorage.removeItem(SESSION_STORAGE_KEY);
  };

  // Sync URL changes with component state
  useEffect(() => {
    const newView = getViewFromPath();
    if (newView !== currentView) {
      setCurrentView(newView);
    }
  }, [location.pathname, i18n.language]);

  // Load session data on component mount
  useEffect(() => {
    loadSessionData();
  }, []);

  // Save session data when relevant state changes
  useEffect(() => {
    if (selectedApplication || interviewSession) {
      saveSessionData();
    }
  }, [selectedApplication, interviewSettings, interviewSession, showOnboarding]);

  // Load job applications on component mount
  useEffect(() => {
    const loadJobApplications = async () => {
      if (!currentUser) return;
      
      try {
        setIsLoading(true);
        const applications = await fetchUserSectionData<JobApplication>(
          currentUser.uid,
          'jobApplications'
        );
        setJobApplications(applications);
      } catch (err) {
        console.error('Failed to load job applications:', err);
        setError(t('mockInterview.error.loadFailed'));
      } finally {
        setIsLoading(false);
      }
    };

    loadJobApplications();
  }, [currentUser, t]);

  // Handle application selection
  const handleApplicationSelect = (application: JobApplication) => {
    setSelectedApplication(application);
    navigateToView('customization');
  };

  // Handle custom interview start
  const handleCustomInterviewStart = (jobDescription?: string, _profileData?: string) => {
    // Create a mock application for custom interview
    const customApplication: JobApplication = {
      id: `custom_${Date.now()}`,
      userId: currentUser?.uid || '',
      status: ApplicationStatus.Applied,
      company: {
        name: 'Practice Session'
      },
      role: {
        title: 'Custom Interview'
      },
      source: 'manual' as any,
      priority: 'medium' as any,
      tags: ['practice', 'custom'],
      keyDates: {
        submissionDate: new Date().toISOString()
      },
      documents: [],
      notes: {
        personalNotes: jobDescription || ''
      },
      createdAt: new Date() as any,
      updatedAt: new Date() as any
    };
    
    setSelectedApplication(customApplication);
    navigateToView('customization');
  };

  // Handle generic interview start
  const handleGenericInterviewStart = () => {
    // Create a generic application
    const genericApplication: JobApplication = {
      id: `generic_${Date.now()}`,
      userId: currentUser?.uid || '',
      status: ApplicationStatus.Applied,
      company: {
        name: 'Practice Session'
      },
      role: {
        title: 'General Interview Practice'
      },
      source: 'manual' as any,
      priority: 'medium' as any,
      tags: ['practice', 'generic'],
      keyDates: {
        submissionDate: new Date().toISOString()
      },
      documents: [],
      notes: {
        personalNotes: ''
      },
      createdAt: new Date() as any,
      updatedAt: new Date() as any
    };
    
    setSelectedApplication(genericApplication);
    navigateToView('customization');
  };

  // Handle interview start
  const handleInterviewStart = async (settings: InterviewSettings) => {
    try {
      setIsLoading(true);
      setInterviewSettings(settings);
      
      // Create new interview session
      setInterviewSession({
        id: Date.now().toString(),
        userId: currentUser?.uid || '',
        settings: interviewSettings,
        transcript: [],
        status: 'in-progress',
        startedAt: new Date().toISOString(),
        createdAt: new Date() as any, // Will be set by Firestore
        updatedAt: new Date() as any  // Will be set by Firestore
      });
      navigateToView('warmup');
    } catch (error) {
      console.error('Failed to start interview:', error);
      setError(t('mockInterview.errors.startFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  // Handle interview completion
  const handleInterviewComplete = (session: MockInterviewSession) => {
    setInterviewSession(session);
    navigateToView('results');
  };

  // Handle starting new interview
  const handleNewInterview = () => {
    setInterviewSession(null);
    setSelectedApplication(null);
    setShowOnboarding(false);
    clearSessionData();
    navigateToView('selection');
    setError(null);
  };

  // Render different views based on current state
  const renderCurrentView = () => {
    switch (currentView) {
      case 'selection':
        return (
          <InterviewStarter
            applications={jobApplications}
            onApplicationSelect={handleApplicationSelect}
            onCustomInterviewStart={handleCustomInterviewStart}
            onGenericInterviewStart={handleGenericInterviewStart}
            isLoading={isLoading}
            error={error}
          />
        );
      
      case 'customization':
        return (
          <InterviewCustomizer
            selectedApplication={selectedApplication}
            initialSettings={interviewSettings}
            onStartInterview={handleInterviewStart}
            onBack={() => navigateToView('selection')}
            isLoading={isLoading}
          />
        );

      case 'warmup':
        return (
          <InterviewWarmup
            jobApplication={selectedApplication}
            onComplete={() => navigateToView('session')}
            onSkip={() => navigateToView('session')}
          />
        );
      
      case 'session':
        // Use LiveKit for voice interviews, regular session for text
        if (interviewSettings.interviewMode === InterviewMode.AUDIO) {
          return (
            <LiveKitInterviewSession
              settings={interviewSettings}
              onComplete={handleInterviewComplete}
              onEnd={() => navigateToView('results')}
            />
          );
        } else {
          return (
            <InterviewSession
              session={interviewSession}
              settings={interviewSettings}
              onComplete={handleInterviewComplete}
              onEnd={() => navigateToView('results')}
            />
          );
        }
      
      case 'livekit-session':
        return (
          <LiveKitInterviewSession
            settings={interviewSettings}
            onComplete={handleInterviewComplete}
            onEnd={() => navigateToView('results')}
          />
        );
      
      case 'pipecat-session':
        return (
          <PipecatInterviewSession
            settings={interviewSettings}
            onComplete={handleInterviewComplete}
            onEnd={() => navigateToView('results')}
          />
        );
      
      case 'results':
        return (
          <InterviewResults
            session={interviewSession}
            onNewInterview={handleNewInterview}
            onPracticeMore={() => setCurrentView('customization')}
          />
        );
        
      case 'stats':
        return (
          <div className="space-y-6">
            {/* Stats Page Header */}
            <GlassCard className="p-6">
              <div className="text-center">
                <span className="text-6xl mb-4 block">📊</span>
                <h2 className="text-2xl font-bold mb-2">
                  {t('mockInterview.myStats')}
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  {t('mockInterview.statsDescription')}
                </p>
              </div>
            </GlassCard>
            
            {/* Gamification Panel - Full Width */}
            {currentUser && (
              <GamificationPanel userId={currentUser.uid} />
            )}
          </div>
        );
      
      default:
        return null;
    }
  };



  return (
    <AppBackground>
      <PageContent>
        {/* Mock Interview Header */}
        <PageHeader
          title={t('mockInterview.title')}
          subtitle={t('mockInterview.subtitle')}
          showUserProfile={true}
        />

        <div className="relative w-full h-full">
        {/* Session Restoration Notification */}
        {sessionRestored && (
          <div className="fixed top-4 right-4 z-50 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg shadow-lg max-w-sm">
            <div className="flex items-center space-x-2">
              <span className="text-lg">✅</span>
              <div>
                <p className="font-semibold">{t('mockInterview.sessionRestored')}</p>
                <p className="text-sm">{t('mockInterview.sessionRestoredDescription')}</p>
              </div>
              <button
                onClick={() => setSessionRestored(false)}
                className="ml-2 text-green-600 hover:text-green-800"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Interactive Onboarding */}
        {showOnboarding && (
          <InteractiveOnboarding
            isVisible={showOnboarding}
            currentView={currentView}
            onComplete={() => setShowOnboarding(false)}
            onSkip={() => setShowOnboarding(false)}
          />
        )}

        {/* Header Navigation */}
        <div className="flex items-center justify-between mb-6">
          <div></div> {/* Spacer */}
          
          <div className="flex items-center space-x-4">
            {/* Back Button - shown when not on selection view */}
            {currentView !== 'selection' && currentView !== 'stats' && (
              <button
                onClick={() => {
                  if (currentView === 'customization') navigateToView('selection');
                  else if (currentView === 'warmup') navigateToView('customization');
                  else if (currentView === 'session') navigateToView('warmup');
                  else if (currentView === 'results') navigateToView('session');
                }}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg transition-colors font-semibold"
              >
                {t('common.back')}
              </button>
            )}
            
            {/* Stats Button - shown on all views except stats */}
            {currentView !== 'stats' && (
              <button
                onClick={() => navigateToView('stats')}
                className="px-4 py-2 bg-blue-100 hover:bg-blue-200 dark:bg-blue-800 dark:hover:bg-blue-700 text-blue-700 dark:text-blue-200 rounded-lg transition-colors flex items-center space-x-2 font-semibold"
              >
                <span>📊</span>
                <span>{t('mockInterview.myStats')}</span>
              </button>
            )}
            
            {/* Back to Selection from Stats */}
            {currentView === 'stats' && (
              <button
                onClick={() => navigateToView('selection')}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg transition-colors font-semibold"
              >
                {t('common.back')}
              </button>
            )}
          </div>
        </div>

        {/* Progress Indicator */}
        {currentView !== 'selection' && (
          <div className="mb-6">
            <div className="flex items-center space-x-4">
              {['selection', 'customization', 'warmup', 'session', 'results'].map((step, index) => (
                <div key={step} className="flex items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      currentView === step
                        ? 'bg-blue-600 text-white'
                        : ['selection', 'customization', 'warmup', 'session', 'results'].indexOf(currentView) > index
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-300 text-gray-600'
                    }`}
                  >
                    {index + 1}
                  </div>
                  {index < 4 && (
                    <div
                      className={`w-12 h-1 mx-2 ${
                        ['selection', 'customization', 'warmup', 'session', 'results'].indexOf(currentView) > index
                          ? 'bg-green-600'
                          : 'bg-gray-300'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
          {renderCurrentView()}
        </div>

        {/* Error Modal */}
        {error && (
          <GlassModal
            isOpen={!!error}
            onClose={() => setError(null)}
            title={t('common.error')}
          >
            <div className="p-4">
              <p className="text-gray-700 mb-4">{error}</p>
              <button
                onClick={() => setError(null)}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                {t('common.ok')}
              </button>
            </div>
          </GlassModal>
        )}
        </div>
      </PageContent>
    </AppBackground>
  );
};

export default MockInterviewPage;
