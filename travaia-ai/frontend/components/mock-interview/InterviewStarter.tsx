import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { GlassCard, GlassButton, GlassModal } from '../design-system';
// ToddlerGlassInput replaced with native input
import { JobApplication } from '../../types';

interface InterviewStarterProps {
  applications: JobApplication[];
  onApplicationSelect: (application: JobApplication) => void;
  onCustomInterviewStart: (jobDescription?: string, profileData?: string) => void;
  onGenericInterviewStart: () => void;
  isLoading: boolean;
  error: string | null;
}

type StartMode = 'options' | 'selection' | 'custom' | 'generic';

const InterviewStarter: React.FC<InterviewStarterProps> = ({
  applications,
  onApplicationSelect,
  onCustomInterviewStart,
  onGenericInterviewStart,
  isLoading,
  error
}) => {
  const { t } = useTranslation();
  const [startMode, setStartMode] = useState<StartMode>('options');
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [jobDescription, setJobDescription] = useState('');
  const [profileData, setProfileData] = useState('');

  // Memoize change handlers to prevent re-rendering issues
  const handleJobDescriptionChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setJobDescription(e.target.value);
  }, []);

  const handleProfileDataChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setProfileData(e.target.value);
  }, []);

  const handleCustomInterviewSubmit = () => {
    onCustomInterviewStart(
      jobDescription.trim() || undefined,
      profileData.trim() || undefined
    );
    setShowCustomModal(false);
    setJobDescription('');
    setProfileData('');
  };

  const handleGenericStart = () => {
    onGenericInterviewStart();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-center">
        <div className="relative">
          <GlassCard className="p-3 w-full max-w-xs opacity-25">
            <div className="text-center">
              <div className="mb-2 flex justify-center">
                <div className="w-16 h-16 sm:w-18 sm:h-18 md:w-20 md:h-20"></div>
              </div>
              <h2 className="text-lg font-bold mb-1">
                {t('mockInterview.startInterview')}
              </h2>
            </div>
          </GlassCard>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <div className="mb-2 flex justify-center">
                <img 
                  src="/ai_interview.png" 
                  alt="AI Interview" 
                  className="w-16 h-16 sm:w-18 sm:h-18 md:w-20 md:h-20 object-contain"
                />
              </div>
              <h2 className="text-lg font-bold mb-1 text-gray-900 dark:text-white">
                {t('mockInterview.startInterview')}
              </h2>
            </div>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <GlassCard className="p-4 bg-red-50/50 dark:bg-red-900/20 border-red-200/50 dark:border-red-800/50">
          <div className="flex items-center space-x-3">
            <span className="text-red-500 text-xl">⚠️</span>
            <div>
              <h4 className="font-medium text-red-800 dark:text-red-200">
                {t('common.error')}
              </h4>
              <p className="text-sm text-red-600 dark:text-red-300">
                {error}
              </p>
            </div>
          </div>
        </GlassCard>
      )}

      {/* Interview Start Options - Only show when in 'options' mode */}
      {startMode === 'options' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 min-h-0 w-full auto-rows-fr justify-items-center">
          {/* Option 1: Select from Applications */}
          <GlassCard className="p-3 text-center hover:shadow-lg transition-all duration-200 bg-blue-50/50 dark:bg-blue-900/20 border-blue-200/50 dark:border-blue-800/50 w-full sm:w-[23%] lg:w-[30%]">
            <div className="mb-2">
              <span className="text-2xl block mb-1">📋</span>
              <h3 className="text-sm font-semibold mb-1 text-blue-800 dark:text-blue-200">
                {t('mockInterview.selectFromApplications')}
              </h3>
              <p className="text-xs text-blue-600 dark:text-blue-300 mb-2">
                {t('mockInterview.selectFromApplicationsDesc')}
              </p>
            </div>
            <GlassButton
              onClick={() => setStartMode('selection')}
              variant="button"
              className="w-full"
              disabled={applications.length === 0}
            >
              {applications.length > 0 
                ? t('mockInterview.selectApplication') 
                : t('mockInterview.noApplicationsAvailable')
              }
            </GlassButton>
            {applications.length === 0 && (
              <p className="text-xs text-gray-500 mt-2">
                {t('mockInterview.addApplicationsFirst')}
              </p>
            )}
          </GlassCard>

        {/* Option 2: Custom with Job Description */}
        <GlassCard className="p-3 text-center hover:shadow-lg transition-all duration-200 bg-green-50/50 dark:bg-green-900/20 border-green-200/50 dark:border-green-800/50 w-full sm:w-[23%] lg:w-[30%]">
          <div className="mb-2">
            <span className="text-2xl block mb-1">📝</span>
            <h3 className="text-sm font-semibold mb-1 text-green-800 dark:text-green-200">
              {t('mockInterview.customInterview')}
            </h3>
            <p className="text-xs text-green-600 dark:text-green-300 mb-2">
              {t('mockInterview.customInterviewDesc')}
            </p>
          </div>
          <GlassButton
            onClick={() => setShowCustomModal(true)}
            variant="button"
            className="w-full"
          >
            {t('mockInterview.startCustom')}
          </GlassButton>
        </GlassCard>

        {/* Option 3: Generic Interview */}
        <GlassCard className="p-3 text-center hover:shadow-lg transition-all duration-200 bg-purple-50/50 dark:bg-purple-900/20 border-purple-200/50 dark:border-purple-800/50 w-full sm:w-[23%] lg:w-[30%]">
          <div className="mb-2">
            <span className="text-2xl block mb-1">🎤</span>
            <h3 className="text-sm font-semibold mb-1 text-purple-800 dark:text-purple-200">
              {t('mockInterview.genericInterview')}
            </h3>
            <p className="text-xs text-purple-600 dark:text-purple-300 mb-2">
              {t('mockInterview.genericInterviewDesc')}
            </p>
          </div>
          <GlassButton
            onClick={handleGenericStart}
            variant="button"
            className="w-full"
            disabled={isLoading}
            loading={isLoading}
          >
            {t('mockInterview.startGeneric')}
          </GlassButton>
        </GlassCard>
        </div>
      )}

      {/* Applications List (when selection mode is active) */}
      {startMode === 'selection' && applications.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <GlassButton
              onClick={() => setStartMode('options')}
              variant="button"
              size="sm"
            >
              ← Back to Options
            </GlassButton>
            <h3 className="text-lg font-semibold">
              {t('mockInterview.selectApplicationTitle')}
            </h3>
            <div></div> {/* Spacer for centering */}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {applications.map((application) => (
              <GlassCard
                key={application.id}
                className="p-4 hover:shadow-lg transition-all duration-200 border-2 border-transparent hover:border-primary-200 dark:hover:border-primary-700"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h4 className="font-semibold mb-1">
                      {application.role.title}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {application.company.name}
                    </p>
                    {application.location && (
                      <p className="text-xs text-gray-500 mt-1">
                        📍 {application.location}
                      </p>
                    )}
                  </div>
                  <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full">
                    {application.status}
                  </span>
                </div>
                <GlassButton
                  onClick={() => onApplicationSelect(application)}
                  variant="button"
                  size="sm"
                  className="w-full"
                  disabled={isLoading}
                  loading={isLoading}
                >
                  {t('mockInterview.getStarted')}
                </GlassButton>
              </GlassCard>
            ))}
          </div>
        </div>
      )}

      {/* Custom Interview Modal */}
      <GlassModal
        isOpen={showCustomModal}
        onClose={() => setShowCustomModal(false)}
        title={t('mockInterview.customInterviewSetup')}
        size="lg"
      >
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">
              {t('mockInterview.jobDescription')} ({t('common.optional')})
            </label>
            <textarea
              key="job-description-textarea"
              value={jobDescription}
              onChange={handleJobDescriptionChange}
              placeholder={t('mockInterview.jobDescriptionPlaceholder')}
              className="w-full h-32 p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 resize-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">
              {t('mockInterview.jobDescriptionHint')}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              {t('mockInterview.profileData')} ({t('common.optional')})
            </label>
            <textarea
              key="profile-data-textarea"
              value={profileData}
              onChange={handleProfileDataChange}
              placeholder={t('mockInterview.profileDataPlaceholder')}
              className="w-full h-24 p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 resize-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">
              {t('mockInterview.profileDataHint')}
            </p>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <div className="flex items-start">
              <span className="text-xl mr-2">💡</span>
              <div>
                <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                  {t('mockInterview.customTip')}
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">
                  {t('mockInterview.customTipDesc')}
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <GlassButton
              onClick={() => setShowCustomModal(false)}
              variant="button"
            >
              {t('common.cancel')}
            </GlassButton>
            <GlassButton
              onClick={handleCustomInterviewSubmit}
              variant="button"
              disabled={isLoading}
              loading={isLoading}
            >
              {t('mockInterview.startInterview')}
            </GlassButton>
          </div>
        </div>
      </GlassModal>

      {/* Info Card */}
      <GlassCard className="p-4 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
        <div className="flex items-center">
          <span className="text-2xl mr-3">🚀</span>
          <div>
            <p className="text-sm font-medium text-green-800 dark:text-green-200">
              {t('mockInterview.readyToStart')}
            </p>
            <p className="text-xs text-green-600 dark:text-green-300 mt-1">
              {t('mockInterview.readyToStartDesc')}
            </p>
          </div>
        </div>
      </GlassCard>
    </div>
  );
};

export default InterviewStarter;
