import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { GlassCard, GlassButton } from '../design-system';
// ToddlerGlassInput replaced with native input
// ToddlerGlassBadge replaced with native span
import {
  JobApplication,
  InterviewSettings,
  InterviewType,
  InterviewMode,
  InterviewDifficulty,
  AIVoiceStyle
} from '../../types';

interface InterviewCustomizerProps {
  selectedApplication: JobApplication | null;
  initialSettings: InterviewSettings;
  onStartInterview: (settings: InterviewSettings) => void;
  onBack: () => void;
  isLoading: boolean;
}

const InterviewCustomizer: React.FC<InterviewCustomizerProps> = ({
  selectedApplication,
  initialSettings,
  onStartInterview,
  onBack,
  isLoading
}) => {
  const { t } = useTranslation();
  const [settings, setSettings] = useState<InterviewSettings>(initialSettings);

  const handleSettingChange = useCallback((key: keyof InterviewSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleStart = () => {
    onStartInterview(settings);
  };

  const interviewTypes = [
    { value: InterviewType.BEHAVIORAL, label: t('mockInterview.type.behavioral'), icon: '🧠' },
    { value: InterviewType.TECHNICAL, label: t('mockInterview.type.technical'), icon: '💻' },
    { value: InterviewType.SITUATIONAL, label: t('mockInterview.type.situational'), icon: '🎭' },
    { value: InterviewType.GENERAL_HR, label: t('mockInterview.type.generalHr'), icon: '👥' }
  ];

  const interviewModes = [
    { value: InterviewMode.TEXT, label: t('mockInterview.mode.text'), icon: '📝' },
    { value: InterviewMode.AUDIO, label: t('mockInterview.mode.audio'), icon: '🎤' },
    { value: InterviewMode.MIXED, label: t('mockInterview.mode.mixed'), icon: '🔀' }
  ];

  const difficulties = [
    { value: InterviewDifficulty.EASY, label: t('mockInterview.difficulty.easy'), icon: '🟢', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
    { value: InterviewDifficulty.MODERATE, label: t('mockInterview.difficulty.moderate'), icon: '🟡', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' },
    { value: InterviewDifficulty.EXPERT, label: t('mockInterview.difficulty.expert'), icon: '🔴', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' }
  ];

  const voiceStyles = [
    { value: AIVoiceStyle.FRIENDLY, label: t('mockInterview.voiceStyle.friendly'), icon: '😊' },
    { value: AIVoiceStyle.PROFESSIONAL, label: t('mockInterview.voiceStyle.professional'), icon: '👔' },
    { value: AIVoiceStyle.TOUGH, label: t('mockInterview.voiceStyle.tough'), icon: '😤' },
    { value: AIVoiceStyle.CASUAL, label: t('mockInterview.voiceStyle.casual'), icon: '😎' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <GlassCard className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">
              {t('mockInterview.customizeInterview')}
            </h2>
            {selectedApplication && (
              <div className="flex items-center space-x-2">
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                  {selectedApplication.role.title}
                </span>
                <span className="text-gray-500">at</span>
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                  {selectedApplication.company.name}
                </span>
              </div>
            )}
          </div>
          <span className="text-4xl">⚙️</span>
        </div>
      </GlassCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Interview Name */}
          <GlassCard className="p-6">
            <h3 className="text-lg font-semibold mb-4">
              {t('mockInterview.settings.interviewName')}
            </h3>
            <input
              id="interview-name"
              name="interviewName"
              type="text"
              value={settings.interviewName || ''}
              onChange={(e) => handleSettingChange('interviewName', e.target.value)}
              placeholder={t('mockInterview.settings.interviewNamePlaceholder')}
              className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              key="interview-name-input"
            />
          </GlassCard>

          {/* Interview Type */}
          <GlassCard className="p-6">
            <h3 className="text-lg font-semibold mb-4">
              {t('mockInterview.settings.interviewType')}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {interviewTypes.map((type) => (
                <button
                  key={type.value}
                  onClick={() => handleSettingChange('interviewType', type.value)}
                  className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                    settings.interviewType === type.value
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-primary-200 dark:hover:border-primary-700'
                  }`}
                >
                  <div className="text-2xl mb-2">{type.icon}</div>
                  <div className="text-sm font-medium">{type.label}</div>
                </button>
              ))}
            </div>
          </GlassCard>

          {/* Interview Mode */}
          <GlassCard className="p-6">
            <h3 className="text-lg font-semibold mb-4">
              {t('mockInterview.settings.interviewMode')}
            </h3>
            <div className="space-y-3">
              {interviewModes.map((mode) => (
                <button
                  key={mode.value}
                  onClick={() => handleSettingChange('interviewMode', mode.value)}
                  className={`w-full p-4 rounded-lg border-2 transition-all duration-200 flex items-center ${
                    settings.interviewMode === mode.value
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-primary-200 dark:hover:border-primary-700'
                  }`}
                >
                  <span className="text-2xl mr-3">{mode.icon}</span>
                  <span className="font-medium">{mode.label}</span>
                </button>
              ))}
            </div>
          </GlassCard>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Difficulty Level */}
          <GlassCard className="p-6">
            <h3 className="text-lg font-semibold mb-4">
              {t('mockInterview.settings.difficulty')}
            </h3>
            <div className="space-y-3">
              {difficulties.map((difficulty) => (
                <button
                  key={difficulty.value}
                  onClick={() => handleSettingChange('difficulty', difficulty.value)}
                  className={`w-full p-4 rounded-lg border-2 transition-all duration-200 flex items-center justify-between ${
                    settings.difficulty === difficulty.value
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-primary-200 dark:hover:border-primary-700'
                  }`}
                >
                  <div className="flex items-center">
                    <span className="text-xl mr-3">{difficulty.icon}</span>
                    <span className="font-medium">{difficulty.label}</span>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${difficulty.color}`}>
                    {difficulty.label}
                  </span>
                </button>
              ))}
            </div>
          </GlassCard>

          {/* AI Voice Style */}
          <GlassCard className="p-6">
            <h3 className="text-lg font-semibold mb-4">
              {t('mockInterview.settings.voiceStyle')}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {voiceStyles.map((style) => (
                <button
                  key={style.value}
                  onClick={() => handleSettingChange('voiceStyle', style.value)}
                  className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                    settings.voiceStyle === style.value
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-primary-200 dark:hover:border-primary-700'
                  }`}
                >
                  <div className="text-2xl mb-2">{style.icon}</div>
                  <div className="text-sm font-medium">{style.label}</div>
                </button>
              ))}
            </div>
          </GlassCard>

          {/* Focus Areas */}
          <GlassCard className="p-6">
            <h3 className="text-lg font-semibold mb-4">
              {t('mockInterview.settings.focusAreas')}
            </h3>
            <input
              id="focus-areas"
              name="focusAreas"
              type="text"
              value={settings.focusAreas || ''}
              onChange={(e) => handleSettingChange('focusAreas', e.target.value)}
              placeholder={t('mockInterview.settings.focusAreasPlaceholder')}
              className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              key="focus-areas-input"
            />
          </GlassCard>
        </div>
      </div>

      {/* Action Buttons */}
      <GlassCard className="p-6">
        <div className="flex items-center justify-between">
          <GlassButton
            onClick={onBack}
            variant="button"
          >
            {t('common.back')}
          </GlassButton>

          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center space-x-2">
                <span>⏱️</span>
                <span>{t('mockInterview.settings.duration')}: 15-30 {t('common.minutes')}</span>
              </div>
            </div>
            
            <GlassButton
              onClick={handleStart}
              variant="button"
              disabled={isLoading}
              className="px-8"
            >
              {isLoading ? t('common.loading') : t('mockInterview.startInterview')}
            </GlassButton>
          </div>
        </div>
      </GlassCard>

      {/* Preview Card */}
      <GlassCard className="p-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-blue-200 dark:border-blue-800">
        <div className="flex items-start space-x-4">
          <span className="text-3xl">🎯</span>
          <div>
            <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">
              {t('mockInterview.interviewSettings')}
            </h4>
            <div className="grid grid-cols-2 gap-4 text-sm text-blue-700 dark:text-blue-300">
              <div>
                <span className="font-medium">{t('mockInterview.settings.interviewType')}:</span>
                <span className="ml-2">{interviewTypes.find(t => t.value === settings.interviewType)?.label}</span>
              </div>
              <div>
                <span className="font-medium">{t('mockInterview.settings.interviewMode')}:</span>
                <span className="ml-2">{interviewModes.find(m => m.value === settings.interviewMode)?.label}</span>
              </div>
              <div>
                <span className="font-medium">{t('mockInterview.settings.difficulty')}:</span>
                <span className="ml-2">{difficulties.find(d => d.value === settings.difficulty)?.label}</span>
              </div>
              <div>
                <span className="font-medium">{t('mockInterview.settings.voiceStyle')}:</span>
                <span className="ml-2">{voiceStyles.find(v => v.value === settings.voiceStyle)?.label}</span>
              </div>
            </div>
          </div>
        </div>
      </GlassCard>
    </div>
  );
};

export default InterviewCustomizer;
