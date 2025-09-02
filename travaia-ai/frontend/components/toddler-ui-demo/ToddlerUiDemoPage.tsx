/**
 * Toddler UI Demo Page - Playground/Sandbox for TRAVAIA Features
 * Fully internationalized, theme-aware, and context-aware testing environment
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useAsyncState, useToggleState } from '../../hooks';
import { 
  StandardPageLayout, 
  GlassCard, 
  GlassButton, 
  GlassModal,
  LoadingState,
  ErrorState,
  EmptyState
} from '../design-system';
import SampleDataService from '../../services/sampleDataService';
import DebugSampleDataService from '../../services/debugSampleDataService';

interface DemoSection {
  id: string;
  titleKey: string;
  descriptionKey: string;
  component: React.ReactNode;
  category: 'components' | 'layouts' | 'features' | 'interactions';
}

const ToddlerUiDemoPage: React.FC = () => {
  const { t } = useTranslation();
  const { currentUser, firebaseUser } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [activeSection, setActiveSection] = useState<string>('overview');
  const [showModal, setShowModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [demoData, setDemoData] = useState<any[]>([]);
  const [isPopulatingData, setIsPopulatingData] = useState(false);
  const [dataPopulationProgress, setDataPopulationProgress] = useState({
    step: '',
    progress: 0,
    total: 100,
    message: '',
  });
  const [dataPopulationComplete, setDataPopulationComplete] = useState(false);
  const [debugResults, setDebugResults] = useState<any[]>([]);
  const [isDebugging, setIsDebugging] = useState(false);
  const [activeKnowledgeTab, setActiveKnowledgeTab] = useState<string>('overview');

  // Auth service testing functions
  const AUTH_SERVICE_URL =
    'https://travaia-user-auth-service-976191766214.us-central1.run.app/';

  const testAuthEndpoint = async (endpoint: string) => {
    const resultElement = document.getElementById(`${endpoint}-result`);
    if (!resultElement) return;

    try {
      resultElement.innerHTML = '<span class="text-yellow-600">Testing...</span>';

      let response;
      let requestData;

      switch (endpoint) {
        case 'register':
          const email = (document.getElementById('register-email') as HTMLInputElement)?.value;
          const password = (document.getElementById('register-password') as HTMLInputElement)?.value;
          const displayName = (document.getElementById('register-name') as HTMLInputElement)?.value;

          requestData = { email, password, display_name: displayName };
          response = await fetch(`${AUTH_SERVICE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestData),
          });
          break;

        case 'login':
          const loginEmail = (document.getElementById('login-email') as HTMLInputElement)?.value;
          const loginPassword = (document.getElementById('login-password') as HTMLInputElement)?.value;

          requestData = { email: loginEmail, password: loginPassword };
          response = await fetch(`${AUTH_SERVICE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestData),
          });
          break;

        case 'profile':
          const token = (document.getElementById('profile-token') as HTMLInputElement)?.value;
          response = await fetch(`${AUTH_SERVICE_URL}/profile/`, {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });
          break;

        case 'gamification':
          const gamificationToken = (document.getElementById('gamification-token') as HTMLInputElement)?.value;
          response = await fetch(`${AUTH_SERVICE_URL}/gamification/stats`, {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${gamificationToken}`,
              'Content-Type': 'application/json',
            },
          });
          break;

        default:
          throw new Error('Unknown endpoint');
      }

      const result = await response.json();

      if (response.ok) {
        resultElement.innerHTML = `
          <div class="text-green-600">
            <strong>✅ Success (${response.status})</strong><br>
            <pre class="mt-1 bg-gray-100 dark:bg-gray-700 p-2 rounded text-xs overflow-x-auto">${JSON.stringify(
              result,
              null,
              2,
            )}</pre>
          </div>
        `;

        // Auto-fill token fields if login was successful
        if (endpoint === 'login' && result.access_token) {
          const profileTokenInput = document.getElementById('profile-token') as HTMLInputElement;
          const gamificationTokenInput = document.getElementById('gamification-token') as HTMLInputElement;
          if (profileTokenInput) profileTokenInput.value = result.access_token;
          if (gamificationTokenInput) gamificationTokenInput.value = result.access_token;
        }
      } else {
        resultElement.innerHTML = `
          <div class="text-red-600">
            <strong>❌ Error (${response.status})</strong><br>
            <pre class="mt-1 bg-gray-100 dark:bg-gray-700 p-2 rounded text-xs overflow-x-auto">${JSON.stringify(
              result,
              null,
              2,
            )}</pre>
          </div>
        `;
      }
    } catch (error) {
      resultElement.innerHTML = `
        <div class="text-red-600">
          <strong>❌ Network Error</strong><br>
          <span class="text-xs">${error instanceof Error ? error.message : 'Unknown error'}</span><br>
          <span class="text-xs text-gray-500">Make sure the User & Authentication Service is running on port 8080</span>
        </div>
      `;
    }
  };

  const checkServiceHealth = async () => {
    const resultElement = document.getElementById('health-check-result');
    const statusElement = document.getElementById('auth-service-status');
    if (!resultElement) return;

    try {
      resultElement.innerHTML = '<span class="text-yellow-600">Checking health...</span>';

      const response = await fetch(`${AUTH_SERVICE_URL}/health`);
      const result = await response.json();

      if (response.ok) {
        resultElement.innerHTML = `
          <div class="text-green-600">
            <strong>✅ Service Healthy</strong><br>
            <pre class="mt-1 bg-gray-100 dark:bg-gray-700 p-2 rounded text-xs overflow-x-auto">${JSON.stringify(
              result,
              null,
              2,
            )}</pre>
          </div>
        `;
        if (statusElement) {
          statusElement.innerHTML = `
            <div class="flex items-center gap-1">
              <div class="w-2 h-2 bg-green-500 rounded-full"></div>
              <span class="text-green-600 font-medium">✅ Connected</span>
            </div>
          `;
        }
      } else {
        resultElement.innerHTML = `<div class="text-red-600"><strong>❌ Health Check Failed (${response.status})</strong></div>`;
        if (statusElement) {
          statusElement.innerHTML = `
            <div class="flex items-center gap-1">
              <div class="w-2 h-2 bg-red-500 rounded-full"></div>
              <span class="text-red-600 font-medium">❌ Connection Failed</span>
            </div>
          `;
        }
      }
    } catch (error) {
      resultElement.innerHTML = `
        <div class="text-red-600">
          <strong>❌ Service Unavailable</strong><br>
          <span class="text-xs">Cannot connect to ${AUTH_SERVICE_URL}</span><br>
          <span class="text-xs text-gray-500">Make sure the service is running: cd backend/user-auth-service && python main.py</span>
        </div>
      `;
      if (statusElement) {
        statusElement.innerHTML = `
          <div class="flex items-center gap-1">
            <div class="w-2 h-2 bg-red-500 rounded-full"></div>
            <span class="text-red-600 font-medium">❌ Offline</span>
          </div>
        `;
      }
    }
  };

  const checkServiceStatus = async () => {
    const resultElement = document.getElementById('health-check-result');
    if (!resultElement) return;

    try {
      resultElement.innerHTML = '<span class="text-yellow-600">Checking status...</span>';

      const response = await fetch(`${AUTH_SERVICE_URL}/status`);
      const result = await response.json();

      if (response.ok) {
        resultElement.innerHTML = `
          <div class="text-blue-600">
            <strong>📊 Service Status</strong><br>
            <pre class="mt-1 bg-gray-100 dark:bg-gray-700 p-2 rounded text-xs overflow-x-auto">${JSON.stringify(
              result,
              null,
              2,
            )}</pre>
          </div>
        `;
      } else {
        resultElement.innerHTML = `<div class="text-red-600"><strong>❌ Status Check Failed (${response.status})</strong></div>`;
      }
    } catch (error) {
      resultElement.innerHTML = `
        <div class="text-red-600">
          <strong>❌ Service Unavailable</strong><br>
          <span class="text-xs">Cannot connect to ${AUTH_SERVICE_URL}/status</span>
        </div>
      `;
    }
  };

  // Auto-check service health on component mount
  useEffect(() => {
    const timer = setTimeout(() => {
      checkServiceHealth();
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  // Debug function to test Firestore permissions
  const debugFirestorePermissions = async () => {
    if (!firebaseUser) {
      alert('You must be authenticated to test Firestore permissions');
      return;
    }

    setIsDebugging(true);
    setDebugResults([]);

    try {
      const debugService = new DebugSampleDataService((progress) => {
        setDebugResults((prev) => (Array.isArray(prev) ? [...prev, progress] : [progress]));
      });

      await debugService.testFirestorePermissions(firebaseUser);
    } catch (error) {
      console.error('Error during debug test:', error);
      setDebugResults((prev) =>
        Array.isArray(prev)
          ? [
              ...prev,
              {
                step: 'Critical Error',
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
              },
            ]
          : [
              {
                step: 'Critical Error',
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
              },
            ],
      );
    } finally {
      setIsDebugging(false);
    }
  };

  // Sample data population function
  const populateSampleData = async () => {
    if (!firebaseUser) {
      alert('You must be authenticated to populate sample data');
      return;
    }

    setIsPopulatingData(true);
    setDataPopulationComplete(false);
    setDataPopulationProgress({ step: '', progress: 0, total: 100, message: '' });

    try {
      const sampleDataService = new SampleDataService((progress) => {
        setDataPopulationProgress(progress);
      });

      await sampleDataService.populateDatabase(firebaseUser);
      setDataPopulationComplete(true);

      // Show success message
      setTimeout(() => {
        setIsPopulatingData(false);
        setDataPopulationComplete(false);
      }, 3000);
    } catch (error) {
      console.error('Error populating sample data:', error);
      alert(`Error populating sample data: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsPopulatingData(false);
      setDataPopulationComplete(false);
    }
  };

  // Simulate loading states for demo purposes
  const simulateLoading = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setDemoData([
        { id: 1, name: 'Sample Data 1', value: 42 },
        { id: 2, name: 'Sample Data 2', value: 85 },
        { id: 3, name: 'Sample Data 3', value: 67 },
      ]);
    }, 2000);
  };

  // Simulate error states for demo purposes
  const simulateError = () => {
    setHasError(true);
    setTimeout(() => setHasError(false), 3000);
  };

  const demoSections: DemoSection[] = [
    {
      id: 'components',
      titleKey: 'toddlerDemo.sections.components.title',
      descriptionKey: 'toddlerDemo.sections.components.description',
      category: 'components',
      component: (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <GlassCard className="p-6">
              <h3 className="text-lg font-semibold mb-3">{t('toddlerDemo.components.glassCard.title')}</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                {t('toddlerDemo.components.glassCard.description')}
              </p>
              <GlassButton variant="button" size="sm">
                {t('toddlerDemo.components.glassCard.action')}
              </GlassButton>
            </GlassCard>

            <GlassCard>
              <h3 className="text-lg font-semibold mb-3">{t('toddlerDemo.components.elevatedCard.title')}</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                {t('toddlerDemo.components.elevatedCard.description')}
              </p>
              <div className="flex gap-2">
                <GlassButton variant="button" size="sm">
                  {t('common.cancel')}
                </GlassButton>
                <GlassButton variant="button" size="sm">
                  {t('common.save')}
                </GlassButton>
              </div>
            </GlassCard>

            <GlassCard className="p-6">
              <h3 className="text-lg font-semibold mb-3">{t('toddlerDemo.components.subtleCard.title')}</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                {t('toddlerDemo.components.subtleCard.description')}
              </p>
              <GlassButton variant="button" size="sm" onClick={() => setShowModal(true)}>
                {t('toddlerDemo.components.subtleCard.action')}
              </GlassButton>
            </GlassCard>
          </div>

          <GlassCard className="p-6">
            <h3 className="text-xl font-semibold mb-4">{t('toddlerDemo.components.buttonVariants.title')}</h3>
            <div className="flex flex-wrap gap-4">
              <GlassButton variant="button">{t('toddlerDemo.buttons.primary')}</GlassButton>
              <GlassButton variant="button">{t('toddlerDemo.buttons.secondary')}</GlassButton>
              <GlassButton variant="button">{t('toddlerDemo.buttons.outline')}</GlassButton>
              <GlassButton variant="button">{t('toddlerDemo.buttons.ghost')}</GlassButton>
              <GlassButton variant="button">{t('toddlerDemo.buttons.danger')}</GlassButton>
            </div>

            <div className="mt-6">
              <h4 className="text-lg font-medium mb-3">{t('toddlerDemo.components.buttonSizes.title')}</h4>
              <div className="flex flex-wrap items-center gap-4">
                <GlassButton variant="button" size="sm">
                  {t('toddlerDemo.sizes.small')}
                </GlassButton>
                <GlassButton variant="button" size="md">
                  {t('toddlerDemo.sizes.medium')}
                </GlassButton>
                <GlassButton variant="button" size="lg">
                  {t('toddlerDemo.sizes.large')}
                </GlassButton>
              </div>
            </div>
          </GlassCard>
        </div>
      ),
    },
    {
      id: 'theming',
      titleKey: 'toddlerDemo.sections.theming.title',
      descriptionKey: 'toddlerDemo.sections.theming.description',
      category: 'features',
      component: (
        <div className="space-y-6">
          <GlassCard className="p-6">
            <h3 className="text-xl font-semibold mb-4">{t('toddlerDemo.theming.current.title')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-lg font-medium mb-3">{t('toddlerDemo.theming.current.info')}</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>{t('toddlerDemo.theming.current.theme')}:</span>
                    <span className="font-mono capitalize">{theme}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t('toddlerDemo.theming.current.user')}:</span>
                    <span className="font-mono">{currentUser?.email || 'Anonymous'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t('toddlerDemo.theming.current.language')}:</span>
                    <span className="font-mono uppercase">{t('common.currentLanguage')}</span>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="text-lg font-medium mb-3">{t('toddlerDemo.theming.controls.title')}</h4>
                <div className="space-y-3">
                  <GlassButton variant="button" onClick={toggleTheme} className="w-full">
                    {t('toddlerDemo.theming.controls.toggle')} ({theme === 'light' ? t('toddlerDemo.theming.dark') : t('toddlerDemo.theming.light')})
                  </GlassButton>
                </div>
              </div>
            </div>
          </GlassCard>

        </div>
      ),
    },
    {
      id: 'sampleData',
      titleKey: 'toddlerDemo.sections.sampleData.title',
      descriptionKey: 'toddlerDemo.sections.sampleData.description',
      category: 'features',
      component: (
        <div className="space-y-6">
          <GlassCard className="p-6">
            <h3 className="text-xl font-semibold mb-4">{t('toddlerDemo.sections.sampleData.title')}</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              {t('toddlerDemo.sections.sampleData.description')}
            </p>

            {isPopulatingData && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">{dataPopulationProgress.step}</span>
                  <span className="text-sm text-gray-500">
                    {dataPopulationProgress.progress}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${dataPopulationProgress.progress}%` }}
                  ></div>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                  {dataPopulationProgress.message}
                </p>
              </div>
            )}

            {dataPopulationComplete && (
              <div className="mb-6 p-4 bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700 rounded-lg">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <span className="text-green-500 text-xl">✅</span>
                  </div>
                  <div className="ml-3">
                    <h4 className="text-sm font-medium text-green-800 dark:text-green-200">
                      {t('toddlerDemo.sampleData.success.title')}
                    </h4>
                    <p className="text-sm text-green-700 dark:text-green-300">
                      {t('toddlerDemo.sampleData.success.description')}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                  {t('toddlerDemo.sampleData.created.title')}
                </h4>
                <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                  <li>• {t('toddlerDemo.sampleData.created.profile')}</li>
                  <li>• {t('toddlerDemo.sampleData.created.applications')}</li>
                  <li>• {t('toddlerDemo.sampleData.created.favorites')}</li>
                  <li>• {t('toddlerDemo.sampleData.created.interviewQuestions')}</li>
                  <li>• {t('toddlerDemo.sampleData.created.interviewRecords')}</li>
                  <li>• {t('toddlerDemo.sampleData.created.aiReports')}</li>
                  <li>• {t('toddlerDemo.sampleData.created.documents')}</li>
                </ul>
              </div>

              <div className="space-y-3">
                <GlassButton
                  variant="button"
                  size="lg"
                  onClick={populateSampleData}
                  disabled={isPopulatingData || !firebaseUser}
                  className="w-full"
                >
                  {isPopulatingData ? t('toddlerDemo.sampleData.button.populating') : t('toddlerDemo.sampleData.button.populate')}
                </GlassButton>

                <GlassButton
                  variant="button"
                  size="md"
                  onClick={debugFirestorePermissions}
                  disabled={isDebugging || !firebaseUser}
                  className="w-full bg-yellow-500/20 hover:bg-yellow-500/30 border-yellow-500/50"
                >
                  {isDebugging ? t('toddlerDemo.sampleData.button.testing') : '🔍 Debug Firestore Permissions'}
                </GlassButton>
              </div>

              {!firebaseUser && (
                <p className="text-sm text-red-600 dark:text-red-400 text-center">
                  {t('toddlerDemo.sampleData.unauthenticated')}
                </p>
              )}

              {debugResults.length > 0 && (
                <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">
                    🔍 {t('toddlerDemo.sampleData.debugResults.title')}
                  </h4>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {debugResults.map((result, index) => (
                      <div
                        key={index}
                        className={`flex items-start space-x-2 p-2 rounded text-sm ${
                          result.success
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                            : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
                        }`}
                      >
                        <span className="flex-shrink-0 mt-0.5">{result.success ? '✅' : '❌'}</span>
                        <div className="flex-1">
                          <div className="font-medium">{result.step}</div>
                          {result.error && (
                            <div className="text-xs mt-1 opacity-80">
                              {t('common.error')}: {result.error}
                            </div>
                          )}
                          {result.details && (
                            <div className="text-xs mt-1 opacity-80">{result.details}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 text-xs text-gray-600 dark:text-gray-400">
                    {t('toddlerDemo.sampleData.debugResults.footer')}
                  </div>
                </div>
              )}
            </div>
          </GlassCard>
        </div>
      ),
    },
    {
      id: 'knowledge-base',
      titleKey: 'toddlerDemo.sections.knowledgeBase.title',
      descriptionKey: 'toddlerDemo.sections.knowledgeBase.description',
      category: 'features',
      component: (
        <div className="space-y-6">
          <GlassCard className="p-6">
            <h3 className="text-xl font-semibold mb-4 text-purple-700 dark:text-purple-300">
              📚 {t('toddlerDemo.knowledgeBase.title')}
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              {t('toddlerDemo.knowledgeBase.description')}
            </p>
            <div className="flex flex-wrap gap-3 mb-6">
              <GlassButton
                variant={activeKnowledgeTab === 'overview' ? 'button' : 'light'}
                size="sm"
                onClick={() => setActiveKnowledgeTab('overview')}
              >
                {t('toddlerDemo.knowledgeBase.tabs.overview')}
              </GlassButton>
              <GlassButton
                variant={activeKnowledgeTab === 'database' ? 'button' : 'light'}
                size="sm"
                onClick={() => setActiveKnowledgeTab('database')}
              >
                {t('toddlerDemo.knowledgeBase.tabs.database')}
              </GlassButton>
            </div>

            {/* Knowledge Base Content */}
            <div className="min-h-[400px]">
              {activeKnowledgeTab === 'overview' && (
                <div className="space-y-4">
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg border border-blue-200 dark:border-blue-700">
                    <h4 className="text-lg font-semibold mb-3 text-blue-800 dark:text-blue-200">
                      🎯 {t('toddlerDemo.knowledgeBase.overview.title')}
                    </h4>
                    <div className="text-gray-800 dark:text-gray-200 space-y-3">
                      <p className="text-base leading-relaxed">
                        {t('toddlerDemo.knowledgeBase.overview.description')}
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-blue-200 dark:border-blue-600">
                          <h5 className="font-semibold text-blue-700 dark:text-blue-300 mb-2">🗂️ {t('toddlerDemo.knowledgeBase.overview.database.title')}</h5>
                          <p className="text-sm text-gray-700 dark:text-gray-300">
                            {t('toddlerDemo.knowledgeBase.overview.database.description')}
                          </p>
                        </div>
                        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-purple-200 dark:border-purple-600">
                          <h5 className="font-semibold text-purple-700 dark:text-purple-300 mb-2">🔥 {t('toddlerDemo.knowledgeBase.overview.architecture.title')}</h5>
                          <p className="text-sm text-gray-700 dark:text-gray-300">
                            {t('toddlerDemo.knowledgeBase.overview.architecture.description')}
                          </p>
                        </div>
                        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-yellow-200 dark:border-yellow-600">
                          <h5 className="font-semibold text-yellow-700 dark:text-yellow-300 mb-2">🔧 {t('toddlerDemo.knowledgeBase.overview.debugging.title')}</h5>
                          <p className="text-sm text-gray-700 dark:text-gray-300">
                            {t('toddlerDemo.knowledgeBase.overview.debugging.description')}
                          </p>
                        </div>
                        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-green-200 dark:border-green-600">
                          <h5 className="font-semibold text-green-700 dark:text-green-300 mb-2">💡 {t('toddlerDemo.knowledgeBase.overview.bestPractices.title')}</h5>
                          <p className="text-sm text-gray-700 dark:text-gray-300">
                            {t('toddlerDemo.knowledgeBase.overview.bestPractices.description')}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeKnowledgeTab === 'database' && (
                <div className="space-y-4">
                  <div className="bg-indigo-50 dark:bg-indigo-900/20 p-6 rounded-lg border border-indigo-200 dark:border-indigo-700">
                    <h4 className="text-lg font-semibold mb-4 text-indigo-800 dark:text-indigo-200">
                      🗂️ {t('toddlerDemo.knowledgeBase.database.diagram.title')}
                    </h4>
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg overflow-x-auto border border-indigo-300 dark:border-indigo-600">
                      <div className="font-mono text-sm space-y-2 min-w-max">
                        <div className="text-indigo-900 dark:text-indigo-100 font-bold text-base">📊 TRAVAIA Firestore Database</div>
                        <div className="text-gray-800 dark:text-gray-200">└── 🔐 <strong>users/</strong> (Root Collection)</div>
                        <div className="text-gray-800 dark:text-gray-200 ml-8">└── 👤 <strong>{'{userId}'}</strong> (User Document)</div>
                        <div className="text-green-700 dark:text-green-300 ml-12">├── 📝 profile: string</div>
                        <div className="text-green-700 dark:text-green-300 ml-12">├── 📧 email: string</div>
                        <div className="text-green-700 dark:text-green-300 ml-12">├── 🎯 preferences: object</div>
                        <div className="text-green-700 dark:text-green-300 ml-12">├── 📅 createdAt: timestamp</div>
                        <div className="text-green-700 dark:text-green-300 ml-12">└── 🔄 updatedAt: timestamp</div>
                        <div className="text-gray-600 dark:text-gray-400 ml-12">│</div>
                        <div className="text-blue-600 dark:text-blue-300 ml-12">├── 📋 <strong>jobApplications/</strong> (Sub-collection)</div>
                        <div className="text-gray-600 dark:text-gray-400 ml-16">└── 🆔 <strong>{'{applicationId}'}</strong></div>
                        <div className="text-green-700 dark:text-green-300 ml-20">├── 🏢 company: string</div>
                        <div className="text-green-700 dark:text-green-300 ml-20">├── 💼 position: string</div>
                        <div className="text-green-700 dark:text-green-300 ml-20">├── 📊 status: enum</div>
                        <div className="text-green-700 dark:text-green-300 ml-20">├── 💰 salary: number</div>
                        <div className="text-green-700 dark:text-green-300 ml-20">├── 📍 location: string</div>
                        <div className="text-green-700 dark:text-green-300 ml-20">├── 🔗 ai_job_fit_report_id: reference</div>
                        <div className="text-green-700 dark:text-green-300 ml-20">└── 📅 appliedAt: timestamp</div>
                        <div className="text-gray-600 dark:text-gray-400 ml-12">│</div>
                        <div className="text-blue-600 dark:text-blue-300 ml-12">├── ⭐ <strong>favoriteJobs/</strong> (Sub-collection)</div>
                        <div className="text-gray-600 dark:text-gray-400 ml-16">└── 🆔 <strong>{'{favoriteId}'}</strong></div>
                        <div className="text-green-700 dark:text-green-300 ml-20">├── 🏢 company: string</div>
                        <div className="text-green-700 dark:text-green-300 ml-20">├── 💼 title: string</div>
                        <div className="text-green-700 dark:text-green-300 ml-20">├── 📍 location: string</div>
                        <div className="text-green-700 dark:text-green-300 ml-20">├── 💰 salaryRange: object</div>
                        <div className="text-green-700 dark:text-green-300 ml-20">├── 🔗 jobUrl: string</div>
                        <div className="text-green-700 dark:text-green-300 ml-20">└── 📅 savedAt: timestamp</div>
                        <div className="text-gray-600 dark:text-gray-400 ml-12">│</div>
                        <div className="text-blue-600 dark:text-blue-300 ml-12">├── 🎤 <strong>interviews/</strong> (Sub-collection)</div>
                        <div className="text-gray-600 dark:text-gray-400 ml-16">└── 🆔 <strong>{'{interviewId}'}</strong></div>
                        <div className="text-green-700 dark:text-green-300 ml-20">├── 🏢 company: string</div>
                        <div className="text-green-700 dark:text-green-300 ml-20">├── 💼 position: string</div>
                        <div className="text-green-700 dark:text-green-300 ml-20">├── 🎯 type: enum (text|voice)</div>
                        <div className="text-green-700 dark:text-green-300 ml-20">├── 📊 overallScore: number</div>
                        <div className="text-green-700 dark:text-green-300 ml-20">├── ⏱️ duration: number</div>
                        <div className="text-green-700 dark:text-green-300 ml-20">├── 📅 completedAt: timestamp</div>
                        <div className="text-gray-600 dark:text-gray-400 ml-20">│</div>
                        <div className="text-purple-600 dark:text-purple-300 ml-20">└── 🔄 <strong>attempts/</strong> (Sub-sub-collection)</div>
                        <div className="text-gray-600 dark:text-gray-400 ml-24">└── 🆔 <strong>{'{attemptId}'}</strong></div>
                        <div className="text-green-700 dark:text-green-300 ml-28">├── ❓ question: string</div>
                        <div className="text-green-700 dark:text-green-300 ml-28">├── 💬 answer: string</div>
                        <div className="text-green-700 dark:text-green-300 ml-28">├── 📊 score: number</div>
                        <div className="text-green-700 dark:text-green-300 ml-28">├── 💭 feedback: string</div>
                        <div className="text-green-700 dark:text-green-300 ml-28">└── ⏱️ responseTime: number</div>
                        <div className="text-gray-600 dark:text-gray-400 ml-12">│</div>
                        <div className="text-blue-600 dark:text-blue-300 ml-12">├── ❓ <strong>interviewQuestions/</strong> (Sub-collection)</div>
                        <div className="text-gray-600 dark:text-gray-400 ml-16">└── 🆔 <strong>{'{questionSetId}'}</strong></div>
                        <div className="text-green-700 dark:text-green-300 ml-20">├── 🏷️ category: string</div>
                        <div className="text-green-700 dark:text-green-300 ml-20">├── 📊 difficulty: enum</div>
                        <div className="text-green-700 dark:text-green-300 ml-20">├── 📝 questions: array</div>
                        <div className="text-green-700 dark:text-green-300 ml-20">├── 🎯 industry: string</div>
                        <div className="text-green-700 dark:text-green-300 ml-20">└── 📅 createdAt: timestamp</div>
                        <div className="text-gray-600 dark:text-gray-400 ml-12">│</div>
                        <div className="text-blue-600 dark:text-blue-300 ml-12">├── 🤖 <strong>aiReports/</strong> (Sub-collection)</div>
                        <div className="text-gray-600 dark:text-gray-400 ml-16">└── 🆔 <strong>{'{reportId}'}</strong></div>
                        <div className="text-green-700 dark:text-green-300 ml-20">├── 📊 jobFitScore: number</div>
                        <div className="text-green-700 dark:text-green-300 ml-20">├── 🎯 skillsMatch: array</div>
                        <div className="text-green-700 dark:text-green-300 ml-20">├── 📈 recommendations: array</div>
                        <div className="text-green-700 dark:text-green-300 ml-20">├── 🔍 analysis: object</div>
                        <div className="text-green-700 dark:text-green-300 ml-20">├── 🏢 company: string</div>
                        <div className="text-green-700 dark:text-green-300 ml-20">├── 💼 position: string</div>
                        <div className="text-green-700 dark:text-green-300 ml-20">└── 📅 generatedAt: timestamp</div>
                        <div className="text-gray-600 dark:text-gray-400 ml-12">│</div>
                        <div className="text-blue-600 dark:text-blue-300 ml-12">└── 📄 <strong>documents/</strong> (Sub-collection)</div>
                        <div className="text-gray-600 dark:text-gray-400 ml-16">└── 🆔 <strong>{'{documentId}'}</strong></div>
                        <div className="text-green-700 dark:text-green-300 ml-20">├── 📝 name: string</div>
                        <div className="text-green-700 dark:text-green-300 ml-20">├── 🏷️ type: enum (resume|cover_letter|portfolio)</div>
                        <div className="text-green-700 dark:text-green-300 ml-20">├── 📁 fileUrl: string</div>
                        <div className="text-green-700 dark:text-green-300 ml-20">├── 📊 size: number</div>
                        <div className="text-green-700 dark:text-green-300 ml-20">├── 🔒 isPublic: boolean</div>
                        <div className="text-green-700 dark:text-green-300 ml-20">├── 📅 uploadedAt: timestamp</div>
                        <div className="text-green-700 dark:text-green-300 ml-20">└── 🔄 lastModified: timestamp</div>
                      </div>

                      <div className="mt-6 p-4 bg-white dark:bg-gray-800 rounded-lg border border-indigo-200 dark:border-indigo-700">
                        <h6 className="font-semibold text-indigo-800 dark:text-indigo-200 mb-2">🔗 {t('toddlerDemo.knowledgeBase.database.relationships.title')}</h6>
                        <div className="text-sm space-y-1">
                          <div>• <strong>jobApplications.ai_job_fit_report_id</strong> → {t('toddlerDemo.knowledgeBase.database.relationships.applicationReport')}</div>
                          <div>• <strong>interviews</strong> {t('toddlerDemo.knowledgeBase.database.relationships.interviewAttempts')}</div>
                          <div>• <strong>interviews.attempts</strong> → {t('toddlerDemo.knowledgeBase.database.relationships.attemptsNested')}</div>
                          <div>• {t('toddlerDemo.knowledgeBase.database.relationships.userIsolation')}</div>
                          <div>• {t('toddlerDemo.knowledgeBase.database.relationships.crossReferences')}</div>
                          <div>• {t('toddlerDemo.knowledgeBase.database.relationships.securityModel')}</div>
                          <div>• {t('toddlerDemo.knowledgeBase.database.relationships.subcollectionsInherit')}</div>
                        </div>
                      </div>
                    </div>

                    {/* Firestore Architecture Section */}
                    <div className="border-l-4 border-blue-500 pl-4 mt-6">
                      <h4 className="text-lg font-semibold mb-3 text-blue-700 dark:text-blue-300">
                        🔥 {t('toddlerDemo.knowledgeBase.architecture.title')}
                      </h4>
                      <div className="space-y-4">
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                          <h5 className="font-semibold mb-2">✅ {t('toddlerDemo.knowledgeBase.architecture.correctPatterns.title')}</h5>
                          <div className="font-mono text-sm space-y-1 text-green-700 dark:text-green-300">
                            <div>• users/<strong>{'{userId}'}</strong> - {t('toddlerDemo.knowledgeBase.architecture.correctPatterns.userProfiles')}</div>
                            <div>• users/<strong>{'{userId}'}</strong>/jobApplications/<strong>{'{id}'}</strong> - {t('toddlerDemo.knowledgeBase.architecture.correctPatterns.jobApplications')}</div>
                            <div>• users/<strong>{'{userId}'}</strong>/documents/<strong>{'{id}'}</strong> - {t('toddlerDemo.knowledgeBase.architecture.correctPatterns.userDocuments')}</div>
                            <div>• users/<strong>{'{userId}'}</strong>/favoriteJobs/<strong>{'{id}'}</strong> - {t('toddlerDemo.knowledgeBase.architecture.correctPatterns.savedJobs')}</div>
                            <div>• users/<strong>{'{userId}'}</strong>/interviews/<strong>{'{id}'}</strong> - {t('toddlerDemo.knowledgeBase.architecture.correctPatterns.interviewRecords')}</div>
                            <div>• users/<strong>{'{userId}'}</strong>/interviews/<strong>{'{id}'}</strong>/attempts/<strong>{'{id}'}</strong> - {t('toddlerDemo.knowledgeBase.architecture.correctPatterns.subCollection')}</div>
                            <div>• users/<strong>{'{userId}'}</strong>/aiReports/<strong>{'{id}'}</strong> - {t('toddlerDemo.knowledgeBase.architecture.correctPatterns.aiReports')}</div>
                            <div>• users/<strong>{'{userId}'}</strong>/interviewQuestions/<strong>{'{id}'}</strong> - {t('toddlerDemo.knowledgeBase.architecture.correctPatterns.questionSets')}</div>
                          </div>
                        </div>

                        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
                          <h5 className="font-semibold mb-2">❌ {t('toddlerDemo.knowledgeBase.architecture.mistakes.title')}</h5>
                          <div className="font-mono text-sm space-y-1 text-red-700 dark:text-red-300">
                            <div>• applications/<strong>{'{id}'}</strong> - {t('toddlerDemo.knowledgeBase.architecture.mistakes.rootLevel')}</div>
                            <div>• favorite_jobs/<strong>{'{id}'}</strong> - {t('toddlerDemo.knowledgeBase.architecture.mistakes.underscore')}</div>
                            <div>• interview_questions/<strong>{'{id}'}</strong> - {t('toddlerDemo.knowledgeBase.architecture.mistakes.wrongStructure')}</div>
                            <div>• {t('toddlerDemo.knowledgeBase.architecture.mistakes.missingValidation')}</div>
                            <div>• {t('toddlerDemo.knowledgeBase.architecture.mistakes.incorrectRules')}</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Debugging Process Section */}
                    <div className="border-l-4 border-yellow-500 pl-4 mt-6">
                      <h4 className="text-lg font-semibold mb-3 text-yellow-700 dark:text-yellow-300">
                        🔧 {t('toddlerDemo.knowledgeBase.debugging.title')}
                      </h4>
                      <div className="space-y-4">
                        <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
                          <h5 className="font-semibold mb-2">{t('toddlerDemo.knowledgeBase.debugging.process.title')}</h5>
                          <ol className="list-decimal list-inside space-y-2 text-sm">
                            <li><strong>{t('toddlerDemo.knowledgeBase.debugging.process.step1.title')}</strong>: {t('toddlerDemo.knowledgeBase.debugging.process.step1.description')}</li>
                            <li><strong>{t('toddlerDemo.knowledgeBase.debugging.process.step2.title')}</strong>: {t('toddlerDemo.knowledgeBase.debugging.process.step2.description')}</li>
                            <li><strong>{t('toddlerDemo.knowledgeBase.debugging.process.step3.title')}</strong>: {t('toddlerDemo.knowledgeBase.debugging.process.step3.description')}</li>
                            <li><strong>{t('toddlerDemo.knowledgeBase.debugging.process.step4.title')}</strong>: {t('toddlerDemo.knowledgeBase.debugging.process.step4.description')}</li>
                            <li><strong>{t('toddlerDemo.knowledgeBase.debugging.process.step5.title')}</strong>: {t('toddlerDemo.knowledgeBase.debugging.process.step5.description')}</li>
                            <li><strong>{t('toddlerDemo.knowledgeBase.debugging.process.step6.title')}</strong>: {t('toddlerDemo.knowledgeBase.debugging.process.step6.description')}</li>
                          </ol>
                        </div>

                        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                          <h5 className="font-semibold mb-2">{t('toddlerDemo.knowledgeBase.debugging.codeExample.title')}</h5>
                          <pre className="text-xs overflow-x-auto">
                            {`// ❌ ${t('toddlerDemo.knowledgeBase.debugging.codeExample.wrong')}\nawait addDoc(collection(db, 'applications'), data);\n\n// ✅ ${t('toddlerDemo.knowledgeBase.debugging.codeExample.correct')}\nawait addDoc(collection(db, 'users', userId, 'jobApplications'), data);`}
                          </pre>
                        </div>
                      </div>
                    </div>

                    {/* Best Practices Section */}
                    <div className="border-l-4 border-green-500 pl-4 mt-6">
                      <h4 className="text-lg font-semibold mb-3 text-green-700 dark:text-green-300">
                        💡 {t('toddlerDemo.knowledgeBase.bestPractices.title')}
                      </h4>
                      <div className="space-y-4">
                        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                          <h5 className="font-semibold mb-2">{t('toddlerDemo.knowledgeBase.bestPractices.guidelines.title')}</h5>
                          <ul className="list-disc list-inside space-y-1 text-sm">
                            <li>
                              <strong>{t('toddlerDemo.knowledgeBase.bestPractices.guidelines.nestedCollections.title')}</strong>: {t('toddlerDemo.knowledgeBase.bestPractices.guidelines.nestedCollections.description')}
                            </li>
                            <li>
                              <strong>{t('toddlerDemo.knowledgeBase.bestPractices.guidelines.camelCase.title')}</strong>: {t('toddlerDemo.knowledgeBase.bestPractices.guidelines.camelCase.description')}
                            </li>
                            <li>
                              <strong>{t('toddlerDemo.knowledgeBase.bestPractices.guidelines.debugTools.title')}</strong>: {t('toddlerDemo.knowledgeBase.bestPractices.guidelines.debugTools.description')}
                            </li>
                            <li>
                              <strong>{t('toddlerDemo.knowledgeBase.bestPractices.guidelines.followPatterns.title')}</strong>: {t('toddlerDemo.knowledgeBase.bestPractices.guidelines.followPatterns.description')}
                            </li>
                            <li>
                              <strong>{t('toddlerDemo.knowledgeBase.bestPractices.guidelines.validateAuth.title')}</strong>: {t('toddlerDemo.knowledgeBase.bestPractices.guidelines.validateAuth.description')}
                            </li>
                            <li>
                              <strong>{t('toddlerDemo.knowledgeBase.bestPractices.guidelines.batchOperations.title')}</strong>: {t('toddlerDemo.knowledgeBase.bestPractices.guidelines.batchOperations.description')}
                            </li>
                            <li>
                              <strong>{t('toddlerDemo.knowledgeBase.bestPractices.guidelines.handleErrors.title')}</strong>: {t('toddlerDemo.knowledgeBase.bestPractices.guidelines.handleErrors.description')}
                            </li>
                          </ul>
                        </div>

                        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                          <h5 className="font-semibold mb-2">{t('toddlerDemo.knowledgeBase.bestPractices.security.title')}</h5>
                          <ul className="list-disc list-inside space-y-1 text-sm">
                            <li>{t('toddlerDemo.knowledgeBase.bestPractices.security.access')}</li>
                            <li>{t('toddlerDemo.knowledgeBase.bestPractices.security.authRequired')}</li>
                            <li>{t('toddlerDemo.knowledgeBase.bestPractices.security.noCrossAccess')}</li>
                            <li>{t('toddlerDemo.knowledgeBase.bestPractices.security.subcollections')}</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </GlassCard>
        </div>
      ),
    },
    {
      id: 'auth-service-test',
      titleKey: 'toddlerDemo.sections.authService.title',
      descriptionKey: 'toddlerDemo.sections.authService.description',
      category: 'features',
      component: (
        <div className="space-y-6">
          <GlassCard className="p-6">
            <h3 className="text-xl font-semibold mb-4 text-blue-700 dark:text-blue-300">
              🔐 {t('toddlerDemo.authService.title')}
            </h3>

            <div className="space-y-6">
              {/* Service Information */}
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-700">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-blue-800 dark:text-blue-200">{t('toddlerDemo.authService.info.title')}</h4>
                  <button
                    onClick={checkServiceHealth}
                    className="text-xs bg-blue-100 dark:bg-blue-800 hover:bg-blue-200 dark:hover:bg-blue-700 px-2 py-1 rounded transition-colors"
                  >
                    🔄 Refresh Status
                  </button>
                </div>
                <div className="text-sm space-y-2">
                  <div className="bg-white dark:bg-gray-800 p-3 rounded border">
                    <div className="flex items-center justify-between mb-2">
                      <strong>{t('toddlerDemo.authService.info.url')}</strong>
                      <span id="auth-service-status" className="flex items-center gap-1">
                        <div className="animate-pulse w-2 h-2 bg-yellow-500 rounded-full"></div>
                        <span className="text-yellow-600 text-xs">Checking connection...</span>
                      </span>
                    </div>
                    <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-xs break-all block">
                      https://travaia-user-auth-service-976191766214.us-central1.run.app
                    </code>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="bg-white dark:bg-gray-800 p-2 rounded border">
                      <strong className="text-xs">{t('toddlerDemo.authService.info.firebaseProject')}</strong>
                      <div className="text-xs text-gray-600 dark:text-gray-400">travaia-e1310</div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-2 rounded border">
                      <strong className="text-xs">{t('toddlerDemo.authService.info.endpoints')}</strong>
                      <div className="text-xs text-gray-600 dark:text-gray-400">/auth, /profile, /gamification</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Authentication Testing */}
              <div className="border-l-4 border-green-500 pl-4">
                <h4 className="text-lg font-semibold mb-3 text-green-700 dark:text-green-300">
                  🔑 {t('toddlerDemo.authService.endpoints.title')}
                </h4>

                <div className="space-y-4">
                  {/* Register Test */}
                  <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border">
                    <h5 className="font-semibold mb-2">POST /auth/register</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <input
                          type="email"
                          placeholder="test@example.com"
                          id="register-email"
                          className="w-full p-2 border rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
                        />
                      </div>
                      <div>
                        <input
                          type="password"
                          placeholder="password123"
                          id="register-password"
                          className="w-full p-2 border rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          placeholder="Test User"
                          id="register-name"
                          className="w-full p-2 border rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
                        />
                      </div>
                      <div>
                        <button
                          onClick={() => testAuthEndpoint('register')}
                          className="w-full bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 text-sm"
                        >
                          {t('toddlerDemo.authService.endpoints.register')}
                        </button>
                      </div>
                    </div>
                    <div id="register-result" className="mt-2 text-xs"></div>
                  </div>

                  {/* Login Test */}
                  <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border">
                    <h5 className="font-semibold mb-2">POST /auth/login</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <input
                          type="email"
                          placeholder="test@example.com"
                          id="login-email"
                          className="w-full p-2 border rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
                        />
                      </div>
                      <div>
                        <input
                          type="password"
                          placeholder="password123"
                          id="login-password"
                          className="w-full p-2 border rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <button
                          onClick={() => testAuthEndpoint('login')}
                          className="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 text-sm"
                        >
                          {t('toddlerDemo.authService.endpoints.login')}
                        </button>
                      </div>
                    </div>
                    <div id="login-result" className="mt-2 text-xs"></div>
                  </div>

                  {/* Profile Test */}
                  <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border">
                    <h5 className="font-semibold mb-2">GET /profile</h5>
                    <div className="flex gap-4">
                      <input
                        type="text"
                        placeholder={t('toddlerDemo.authService.endpoints.tokenPlaceholder')}
                        id="profile-token"
                        className="flex-1 p-2 border rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
                      />
                      <button
                        onClick={() => testAuthEndpoint('profile')}
                        className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 text-sm"
                      >
                        {t('toddlerDemo.authService.endpoints.profile')}
                      </button>
                    </div>
                    <div id="profile-result" className="mt-2 text-xs"></div>
                  </div>

                  {/* Gamification Test */}
                  <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border">
                    <h5 className="font-semibold mb-2">GET /gamification/stats</h5>
                    <div className="flex gap-4">
                      <input
                        type="text"
                        placeholder={t('toddlerDemo.authService.endpoints.tokenPlaceholder')}
                        id="gamification-token"
                        className="flex-1 p-2 border rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
                      />
                      <button
                        onClick={() => testAuthEndpoint('gamification')}
                        className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600 text-sm"
                      >
                        {t('toddlerDemo.authService.endpoints.gamification')}
                      </button>
                    </div>
                    <div id="gamification-result" className="mt-2 text-xs"></div>
                  </div>
                </div>
              </div>

              {/* Service Health Check */}
              <div className="border-l-4 border-blue-500 pl-4">
                <h4 className="text-lg font-semibold mb-3 text-blue-700 dark:text-blue-300">
                  🏥 {t('toddlerDemo.authService.health.title')}
                </h4>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border">
                  <div className="flex gap-4 mb-4">
                    <button
                      onClick={() => checkServiceHealth()}
                      className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 text-sm"
                    >
                      {t('toddlerDemo.authService.health.checkHealth')}
                    </button>
                    <button
                      onClick={() => checkServiceStatus()}
                      className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 text-sm"
                    >
                      {t('toddlerDemo.authService.health.checkStatus')}
                    </button>
                  </div>
                  <div id="health-check-result" className="text-xs"></div>
                </div>
              </div>

              {/* Integration Notes */}
              <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
                <h4 className="font-semibold mb-2 text-yellow-800 dark:text-yellow-200">
                  📝 {t('toddlerDemo.authService.notes.title')}
                </h4>
                <ul className="text-sm space-y-1 text-yellow-700 dark:text-yellow-300">
                  <li>• {t('toddlerDemo.authService.notes.firebase')}</li>
                  <li>• {t('toddlerDemo.authService.notes.cors')}</li>
                  <li>• {t('toddlerDemo.authService.notes.firestore')}</li>
                  <li>• {t('toddlerDemo.authService.notes.gamification')}</li>
                  <li>• {t('toddlerDemo.authService.notes.profile')}</li>
                  <li>• {t('toddlerDemo.authService.notes.deployment')}</li>
                </ul>
              </div>
            </div>
          </GlassCard>
        </div>
      ),
    },
    {
      id: 'cloud-deployments',
      titleKey: 'toddlerDemo.sections.cloudDeployments.title',
      descriptionKey: 'toddlerDemo.sections.cloudDeployments.description',
      category: 'features',
      component: (
        <div className="space-y-6">
          <GlassCard className="p-6">
            <h3 className="text-xl font-semibold mb-4 text-blue-700 dark:text-blue-300">
              ☁️ {t('toddlerDemo.cloudDeployments.title')}
            </h3>

            <div className="space-y-6">
              {/* Deployment Success Status */}
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-700">
                <h4 className="font-semibold mb-2 text-green-800 dark:text-green-200 flex items-center">
                  <span className="mr-2">🎉</span> {t('toddlerDemo.cloudDeployments.success.title')}
                </h4>
                <div className="text-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <strong>{t('toddlerDemo.cloudDeployments.success.authService')}</strong>
                    <a
                      href="https://travaia-user-auth-service-976191766214.us-central1.run.app"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 underline"
                    >
                      https://travaia-user-auth-service-976191766214.us-central1.run.app
                    </a>
                  </div>
                  <div className="flex items-center justify-between">
                    <strong>{t('toddlerDemo.cloudDeployments.success.interviewBot')}</strong>
                    <a
                      href="https://travaia-interview-bot-3666tidp6a-uc.a.run.app"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 underline"
                    >
                      https://travaia-interview-bot-3666tidp6a-uc.a.run.app
                    </a>
                  </div>
                  <div className="mt-2 text-xs text-green-700 dark:text-green-300">
                    ✅ {t('toddlerDemo.cloudDeployments.success.footer')}
                  </div>
                </div>
              </div>

              {/* Deployment Lessons Learned */}
              <div className="border-l-4 border-orange-500 pl-4">
                <h4 className="text-lg font-semibold mb-3 text-orange-700 dark:text-orange-300">
                  📚 {t('toddlerDemo.cloudDeployments.lessons.title')}
                </h4>
                <div className="space-y-4">
                  <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg">
                    <h5 className="font-semibold mb-2 text-orange-800 dark:text-orange-200">
                      🐳 {t('toddlerDemo.cloudDeployments.lessons.docker.title')}
                    </h5>
                    <div className="text-sm space-y-2">
                      <div>
                        <strong>{t('toddlerDemo.cloudDeployments.lessons.docker.dependencies.title')}</strong>
                      </div>
                      <div className="font-mono text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded">
                        {`# ${t('toddlerDemo.cloudDeployments.lessons.docker.dependencies.comment')}\nRUN apt-get update && apt-get install -y \\\n  gcc \\\n  g++ \\\n  curl \\\n  && rm -rf /var/lib/apt/lists/* \\\n  && apt-get clean`}
                      </div>

                      <div className="mt-3">
                        <strong>{t('toddlerDemo.cloudDeployments.lessons.docker.env.title')}</strong>
                      </div>
                      <div className="font-mono text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded">
                        {`ENV PYTHONPATH=/app\nENV PYTHONUNBUFFERED=1`}
                      </div>

                      <div className="mt-3">
                        <strong>{t('toddlerDemo.cloudDeployments.lessons.docker.package.title')}</strong>
                      </div>
                      <div className="font-mono text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded">
                        {`RUN touch /app/__init__.py \\\n  && touch /app/api/__init__.py \\\n  && touch /app/services/__init__.py`}
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                    <h5 className="font-semibold mb-2 text-blue-800 dark:text-blue-200">
                      🚀 {t('toddlerDemo.cloudDeployments.lessons.strategies.title')}
                    </h5>
                    <div className="text-sm space-y-2">
                      <div>
                        <strong>{t('toddlerDemo.cloudDeployments.lessons.strategies.method1.title')}</strong>
                      </div>
                      <div className="font-mono text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded">
                        {`gcloud run deploy [SERVICE-NAME] \\\n  --source . \\\n  --region us-central1 \\\n  --platform managed \\\n  --allow-unauthenticated \\\n  --port 8080 \\\n  --memory 1Gi \\\n  --project travaia-e1310`}
                      </div>

                      <div className="mt-3">
                        <strong>{t('toddlerDemo.cloudDeployments.lessons.strategies.method2.title')}</strong>
                      </div>
                      <div className="font-mono text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded">
                        {`gcloud builds submit --config cloudbuild.yaml --project travaia-e1310`}
                      </div>

                      <div className="mt-3 text-green-700 dark:text-green-300">
                        <strong>✅ {t('toddlerDemo.cloudDeployments.lessons.strategies.successFactor.title')}</strong>: {t('toddlerDemo.cloudDeployments.lessons.strategies.successFactor.description')}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step-by-Step Deployment Guide */}
              <div className="border-l-4 border-purple-500 pl-4">
                <h4 className="text-lg font-semibold mb-3 text-purple-700 dark:text-purple-300">
                  📋 {t('toddlerDemo.cloudDeployments.guide.title')}
                </h4>
                <div className="space-y-4">
                  <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
                    <h5 className="font-semibold mb-2 text-purple-800 dark:text-purple-200">
                      {t('toddlerDemo.cloudDeployments.guide.phase1.title')}
                    </h5>
                    <ol className="list-decimal list-inside text-sm space-y-1 ml-4">
                      <li>
                        <strong>{t('toddlerDemo.cloudDeployments.guide.phase1.step1.title')}</strong>:{' '}
                        <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">gcloud config get-value project</code>
                      </li>
                      <li>
                        <strong>{t('toddlerDemo.cloudDeployments.guide.phase1.step2.title')}</strong>: {t('toddlerDemo.cloudDeployments.guide.phase1.step2.description')}
                      </li>
                      <li>
                        <strong>{t('toddlerDemo.cloudDeployments.guide.phase1.step3.title')}</strong>: {t('toddlerDemo.cloudDeployments.guide.phase1.step3.description')}
                      </li>
                      <li>
                        <strong>{t('toddlerDemo.cloudDeployments.guide.phase1.step4.title')}</strong>: {t('toddlerDemo.cloudDeployments.guide.phase1.step4.description')}
                      </li>
                      <li>
                        <strong>{t('toddlerDemo.cloudDeployments.guide.phase1.step5.title')}</strong>: {t('toddlerDemo.cloudDeployments.guide.phase1.step5.description')}
                      </li>
                    </ol>
                  </div>

                  <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-lg">
                    <h5 className="font-semibold mb-2 text-indigo-800 dark:text-indigo-200">
                      {t('toddlerDemo.cloudDeployments.guide.phase2.title')}
                    </h5>
                    <ol className="list-decimal list-inside text-sm space-y-1 ml-4">
                      <li>
                        <strong>{t('toddlerDemo.cloudDeployments.guide.phase2.step1.title')}</strong>:{' '}
                        <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">cd backend/[service-name]</code>
                      </li>
                      <li>
                        <strong>{t('toddlerDemo.cloudDeployments.guide.phase2.step2.title')}</strong>:
                      </li>
                      <div className="font-mono text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded mt-1 ml-4">
                        {`gcloud run deploy travaia-[service-name] \\\n  --source . \\\n  --region us-central1 \\\n  --platform managed \\\n  --allow-unauthenticated \\\n  --port 8080 \\\n  --memory 1Gi \\\n  --project travaia-e1310`}
                      </div>
                      <li>
                        <strong>{t('toddlerDemo.cloudDeployments.guide.phase2.step3.title')}</strong>: {t('toddlerDemo.cloudDeployments.guide.phase2.step3.description')}
                      </li>
                      <li>
                        <strong>{t('toddlerDemo.cloudDeployments.guide.phase2.step4.title')}</strong>: {t('toddlerDemo.cloudDeployments.guide.phase2.step4.description')}
                      </li>
                    </ol>
                  </div>

                  <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                    <h5 className="font-semibold mb-2 text-green-800 dark:text-green-200">
                      {t('toddlerDemo.cloudDeployments.guide.phase3.title')}
                    </h5>
                    <ol className="list-decimal list-inside text-sm space-y-1 ml-4">
                      <li>
                        <strong>{t('toddlerDemo.cloudDeployments.guide.phase3.step1.title')}</strong> {t('toddlerDemo.cloudDeployments.guide.phase3.step1.description')}
                      </li>
                      <li>
                        <strong>{t('toddlerDemo.cloudDeployments.guide.phase3.step2.title')}</strong> {t('toddlerDemo.cloudDeployments.guide.phase3.step2.description')}
                      </li>
                      <li>
                        <strong>{t('toddlerDemo.cloudDeployments.guide.phase3.step3.title')}</strong> {t('toddlerDemo.cloudDeployments.guide.phase3.step3.description')}
                      </li>
                      <li>
                        <strong>{t('toddlerDemo.cloudDeployments.guide.phase3.step4.title')}</strong> {t('toddlerDemo.cloudDeployments.guide.phase3.step4.description')}
                      </li>
                      <li>
                        <strong>{t('toddlerDemo.cloudDeployments.guide.phase3.step5.title')}</strong> {t('toddlerDemo.cloudDeployments.guide.phase3.step5.description')}
                      </li>
                      <li>
                        <strong>{t('toddlerDemo.cloudDeployments.guide.phase3.step6.title')}</strong> {t('toddlerDemo.cloudDeployments.guide.phase3.step6.description')}
                      </li>
                    </ol>
                  </div>
                </div>
              </div>

              {/* Environment Variables Configuration */}
              <div className="border-l-4 border-red-500 pl-4">
                <h4 className="text-lg font-semibold mb-3 text-red-700 dark:text-red-300">
                  🔧 {t('toddlerDemo.cloudDeployments.env.title')}
                </h4>
                <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
                  <h5 className="font-semibold mb-2 text-red-800 dark:text-red-200">
                    {t('toddlerDemo.cloudDeployments.env.required.title')}
                  </h5>
                  <div className="text-sm space-y-2">
                    <div className="font-mono text-xs bg-gray-100 dark:bg-gray-800 p-3 rounded">
                      {`# Firebase Configuration (matching frontend)\nFIREBASE_PROJECT_ID=travaia-e1310\nFIREBASE_API_KEY=AIzaSyAUW3xyiVdv2F5un5YzRjqJdz8FKpZZJr0\nFIREBASE_AUTH_DOMAIN=travaia-e1310.firebaseapp.com\nFIREBASE_STORAGE_BUCKET=travaia-e1310.firebasestorage.app\nFIREBASE_MESSAGING_SENDER_ID=976191766214\nFIREBASE_APP_ID=1:976191766214:web:0ad7b47b0e5993ee7521c7\nFIREBASE_MEASUREMENT_ID=G-PF8XN3P8EJ\n\n# Service Configuration\nPORT=8080\nENVIRONMENT=production\nLOG_LEVEL=INFO\n\n# CORS Configuration\nALLOWED_ORIGINS=https://travaia-frontend.web.app,http://localhost:5173,http://localhost:5174\n\n# Security\nGOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json`}
                    </div>
                  </div>
                </div>
              </div>

              {/* Troubleshooting Guide */}
              <div className="border-l-4 border-yellow-500 pl-4">
                <h4 className="text-lg font-semibold mb-3 text-yellow-700 dark:text-yellow-300">
                  🔍 {t('toddlerDemo.cloudDeployments.troubleshooting.title')}
                </h4>
                <div className="space-y-4">
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
                    <h5 className="font-semibold mb-2 text-yellow-800 dark:text-yellow-200">
                      {t('toddlerDemo.cloudDeployments.troubleshooting.docker.title')}
                    </h5>
                    <ul className="text-sm space-y-1 list-disc list-inside ml-4">
                      <li>
                        <strong>{t('toddlerDemo.cloudDeployments.troubleshooting.docker.curl.title')}</strong>:{' '}
                        {t('toddlerDemo.cloudDeployments.troubleshooting.docker.curl.description')}
                      </li>
                      <li>
                        <strong>{t('toddlerDemo.cloudDeployments.troubleshooting.docker.imports.title')}</strong>:{' '}
                        {t('toddlerDemo.cloudDeployments.troubleshooting.docker.imports.description')}
                      </li>
                      <li>
                        <strong>{t('toddlerDemo.cloudDeployments.troubleshooting.docker.env.title')}</strong>:{' '}
                        {t('toddlerDemo.cloudDeployments.troubleshooting.docker.env.description')}
                      </li>
                      <li>
                        <strong>{t('toddlerDemo.cloudDeployments.troubleshooting.docker.permissions.title')}</strong>:{' '}
                        {t('toddlerDemo.cloudDeployments.troubleshooting.docker.permissions.description')}
                      </li>
                    </ul>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                    <h5 className="font-semibold mb-2">{t('toddlerDemo.cloudDeployments.troubleshooting.cloudBuild.title')}</h5>
                    <ul className="text-sm space-y-1 list-disc list-inside ml-4">
                      <li>
                        <strong>{t('toddlerDemo.cloudDeployments.troubleshooting.cloudBuild.format.title')}</strong>:{' '}
                        {t('toddlerDemo.cloudDeployments.troubleshooting.cloudBuild.format.description')}
                      </li>
                      <li>
                        <strong>{t('toddlerDemo.cloudDeployments.troubleshooting.cloudBuild.timeout.title')}</strong>:{' '}
                        {t('toddlerDemo.cloudDeployments.troubleshooting.cloudBuild.timeout.description')}
                      </li>
                      <li>
                        <strong>{t('toddlerDemo.cloudDeployments.troubleshooting.cloudBuild.permissions.title')}</strong>:{' '}
                        {t('toddlerDemo.cloudDeployments.troubleshooting.cloudBuild.permissions.description')}
                      </li>
                    </ul>
                  </div>

                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                    <h5 className="font-semibold mb-2 text-blue-800 dark:text-blue-200">
                      {t('toddlerDemo.cloudDeployments.troubleshooting.runtime.title')}
                    </h5>
                    <ul className="text-sm space-y-1 list-disc list-inside ml-4">
                      <li>
                        <strong>{t('toddlerDemo.cloudDeployments.troubleshooting.runtime.health.title')}</strong>:{' '}
                        {t('toddlerDemo.cloudDeployments.troubleshooting.runtime.health.description')}
                      </li>
                      <li>
                        <strong>{t('toddlerDemo.cloudDeployments.troubleshooting.runtime.firebase.title')}</strong>:{' '}
                        {t('toddlerDemo.cloudDeployments.troubleshooting.runtime.firebase.description')}
                      </li>
                      <li>
                        <strong>{t('toddlerDemo.cloudDeployments.troubleshooting.runtime.cors.title')}</strong>:{' '}
                        {t('toddlerDemo.cloudDeployments.troubleshooting.runtime.cors.description')}
                      </li>
                      <li>
                        <strong>{t('toddlerDemo.cloudDeployments.troubleshooting.runtime.memory.title')}</strong>:{' '}
                        {t('toddlerDemo.cloudDeployments.troubleshooting.runtime.memory.description')}
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Next Microservices Roadmap */}
              <div className="border-l-4 border-green-500 pl-4">
                <h4 className="text-lg font-semibold mb-3 text-green-700 dark:text-green-300">
                  🗺️ {t('toddlerDemo.cloudDeployments.roadmap.title')}
                </h4>
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                  <h5 className="font-semibold mb-2 text-green-800 dark:text-green-200">
                    {t('toddlerDemo.cloudDeployments.roadmap.planned.title')}
                  </h5>
                  <div className="text-sm space-y-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h6 className="font-semibold mb-1">
                          ✅ {t('toddlerDemo.cloudDeployments.roadmap.completed.title')}
                        </h6>
                        <ul className="space-y-1 text-xs">
                          <li>• {t('toddlerDemo.cloudDeployments.roadmap.completed.auth')}</li>
                          <li>• {t('toddlerDemo.cloudDeployments.roadmap.completed.interviewBot')}</li>
                        </ul>
                      </div>
                      <div>
                        <h6 className="font-semibold mb-1">
                          🔄 {t('toddlerDemo.cloudDeployments.roadmap.next.title')}
                        </h6>
                        <ul className="space-y-1 text-xs">
                          <li>• {t('toddlerDemo.cloudDeployments.roadmap.next.applicationJob')}</li>
                          <li>• {t('toddlerDemo.cloudDeployments.roadmap.next.aiEngine')}</li>
                          <li>• {t('toddlerDemo.cloudDeployments.roadmap.next.documentReport')}</li>
                          <li>• {t('toddlerDemo.cloudDeployments.roadmap.next.analyticsGrowth')}</li>
                        </ul>
                      </div>
                    </div>

                    <div className="mt-4 p-3 bg-white dark:bg-gray-800 rounded border">
                      <h6 className="font-semibold mb-1">🎯 {t('toddlerDemo.cloudDeployments.roadmap.strategy.title')}</h6>
                      <p className="text-xs">
                        {t('toddlerDemo.cloudDeployments.roadmap.strategy.description')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </GlassCard>
        </div>
      ),
    },
    {
      id: 'animations',
      titleKey: 'toddlerDemo.sections.animations.title',
      descriptionKey: 'toddlerDemo.sections.animations.description',
      category: 'interactions',
      component: (
        <div className="space-y-6">
          <GlassCard className="p-6">
            <h3 className="text-xl font-semibold mb-4">{t('toddlerDemo.animations.motion.title')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="p-4 bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-lg cursor-pointer"
              >
                <h4 className="font-semibold">{t('toddlerDemo.animations.hover.title')}</h4>
                <p className="text-sm opacity-90">{t('toddlerDemo.animations.hover.description')}</p>
              </motion.div>

              <motion.div
                animate={{
                  rotate: [0, 5, -5, 0],
                  transition: { duration: 2, repeat: Infinity },
                }}
                className="p-4 bg-gradient-to-br from-green-500 to-teal-600 text-white rounded-lg"
              >
                <h4 className="font-semibold">{t('toddlerDemo.animations.rotation.title')}</h4>
                <p className="text-sm opacity-90">{t('toddlerDemo.animations.rotation.description')}</p>
              </motion.div>

              <motion.div
                animate={{
                  y: [0, -10, 0],
                  transition: { duration: 1.5, repeat: Infinity },
                }}
                className="p-4 bg-gradient-to-br from-orange-500 to-red-600 text-white rounded-lg"
              >
                <h4 className="font-semibold">{t('toddlerDemo.animations.float.title')}</h4>
                <p className="text-sm opacity-90">{t('toddlerDemo.animations.float.description')}</p>
              </motion.div>
            </div>
          </GlassCard>
        </div>
      ),
    },
    {
      id: 'auth-overview',
      titleKey: 'toddlerDemo.sections.auth.overview.title',
      descriptionKey: 'toddlerDemo.sections.auth.overview.description',
      category: 'authentication',
      component: (
        <div className="space-y-6">
          <GlassCard className="p-8">
            <h3 className="text-2xl font-semibold mb-6 text-blue-600 dark:text-blue-400">
              🔐 TRAVAIA Authentication System
            </h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div>
                  <h4 className="text-lg font-semibold mb-3 text-green-600 dark:text-green-400">
                    ✅ Current Features
                  </h4>
                  <ul className="space-y-2 text-sm">
                    <li>• Multi-provider OAuth (Gmail, Apple, LinkedIn)</li>
                    <li>• Firebase Authentication with ID token validation</li>
                    <li>• Backend sync with exponential backoff retry</li>
                    <li>• React Context state management</li>
                    <li>• TypeScript type safety with conversion helpers</li>
                    <li>• Cloud Run backend deployment</li>
                  </ul>
                </div>

                <div>
                  <h4 className="text-lg font-semibold mb-3 text-orange-600 dark:text-orange-400">
                    🔧 Recent Fixes
                  </h4>
                  <ul className="space-y-2 text-sm">
                    <li>• Fixed infinite reload loops in AuthContext</li>
                    <li>• Added missing /auth/sync backend endpoint</li>
                    <li>• Resolved 401 token validation errors</li>
                    <li>• Fixed TypeScript type mismatches</li>
                  </ul>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <h4 className="text-lg font-semibold mb-3 text-purple-600 dark:text-purple-400">
                    🏗️ Architecture
                  </h4>
                  <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg font-mono text-xs">
                    <div className="space-y-1">
                      <div>Frontend (React + Firebase JS SDK)</div>
                      <div className="ml-4">├── AuthContext.tsx</div>
                      <div className="ml-4">├── Firebase Auth Providers</div>
                      <div className="ml-4">└── User Profile State</div>
                      <div className="mt-2">Backend (FastAPI + Firebase Admin)</div>
                      <div className="ml-4">├── /auth/sync endpoint</div>
                      <div className="ml-4">├── Token validation</div>
                      <div className="ml-4">└── User data persistence</div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-lg font-semibold mb-3 text-red-600 dark:text-red-400">
                    ⚠️ Known Issues
                  </h4>
                  <ul className="space-y-2 text-sm">
                    <li>• TypeScript errors in AuthContext (type conversion)</li>
                    <li>• Unused convertToUserProfile function</li>
                    <li>• UserProfile vs LocalUserProfile type mismatches</li>
                  </ul>
                </div>
              </div>
            </div>
          </GlassCard>
        </div>
      ),
    },
  ];

  const categories = [
    { id: 'overview', labelKey: 'toddlerDemo.categories.overview' },
    { id: 'components', labelKey: 'toddlerDemo.categories.components' },
    { id: 'features', labelKey: 'toddlerDemo.categories.features' },
    { id: 'interactions', labelKey: 'toddlerDemo.categories.interactions' },
    { id: 'knowledge', labelKey: 'toddlerDemo.categories.knowledge' },
    { id: 'authentication', labelKey: 'toddlerDemo.categories.authentication' },
  ];

  const getFilteredSections = () => {
    if (activeSection === 'overview') return demoSections;
    return demoSections.filter((section) => section.category === activeSection);
  };

  return (
    <StandardPageLayout
      title={t('toddlerDemo.title')}
      subtitle={t('toddlerDemo.subtitle')}
    >
      <div className="space-y-8">
        {/* Category Navigation */}
        <GlassCard className="p-6">
          <h2 className="text-xl font-semibold mb-4">{t('toddlerDemo.navigation.title')}</h2>
          <div className="flex flex-wrap gap-3">
            {categories.map((category) => (
              <GlassButton
                key={category.id}
                variant={activeSection === category.id ? 'button' : 'light'}
                size="sm"
                onClick={() => setActiveSection(category.id)}
              >
                {t(category.labelKey)}
              </GlassButton>
            ))}
          </div>
        </GlassCard>

        {/* Demo Sections */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeSection}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-8"
          >
            {activeSection === 'overview' ? (
              <GlassCard className="p-8 text-center">
                <h2 className="text-2xl font-bold mb-4">{t('toddlerDemo.overview.welcome')}</h2>
                <p className="text-lg text-gray-600 dark:text-gray-300 mb-6 max-w-2xl mx-auto">
                  {t('toddlerDemo.overview.description')}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                  <div className="p-6 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-lg">
                    <div className="text-3xl mb-3">🎨</div>
                    <h3 className="font-semibold mb-2">{t('toddlerDemo.overview.features.design.title')}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {t('toddlerDemo.overview.features.design.description')}
                    </p>
                  </div>
                  <div className="p-6 bg-gradient-to-br from-green-500/10 to-teal-500/10 rounded-lg">
                    <div className="text-3xl mb-3">🌍</div>
                    <h3 className="font-semibold mb-2">{t('toddlerDemo.overview.features.i18n.title')}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {t('toddlerDemo.overview.features.i18n.description')}
                    </p>
                  </div>
                  <div className="p-6 bg-gradient-to-br from-orange-500/10 to-red-500/10 rounded-lg">
                    <div className="text-3xl mb-3">⚡</div>
                    <h3 className="font-semibold mb-2">{t('toddlerDemo.overview.features.interactive.title')}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {t('toddlerDemo.overview.features.interactive.description')}
                    </p>
                  </div>
                </div>
              </GlassCard>
            ) : (
              getFilteredSections().map((section) => (
                <div key={section.id}>
                  {section.component}
                </div>
              ))
            )}
          </motion.div>
        </AnimatePresence>

        {/* Demo Modal */}
        <GlassModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title={t('toddlerDemo.modal.title')}
        >
          <div className="space-y-4">
            <p>{t('toddlerDemo.modal.content')}</p>
            <div className="flex justify-end gap-3">
              <GlassButton variant="button" onClick={() => setShowModal(false)}>
                {t('common.cancel')}
              </GlassButton>
              <GlassButton variant="button" onClick={() => setShowModal(false)}>
                {t('common.confirm')}
              </GlassButton>
            </div>
          </div>
        </GlassModal>
      </div>
    </StandardPageLayout>
  );
};

export default ToddlerUiDemoPage;