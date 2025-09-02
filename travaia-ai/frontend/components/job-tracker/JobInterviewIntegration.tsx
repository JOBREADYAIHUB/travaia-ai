/**
 * Job Interview Integration Component
 * Provides seamless navigation from job applications to interview practice
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { JobApplication, InterviewMode } from '../../types';
import { GlassCard, GlassButton, GlassModal } from '../design-system';
import { 
  convertJobApplicationToInterviewSettings,
  generatePersonalizedQuestions,
  calculateInterviewReadiness,
  createInterviewSessionContext,
  generateInterviewPreparationTasks,
  extractSkillsFromJobApplication
} from '../../services/jobInterviewIntegrationService';

interface JobInterviewIntegrationProps {
  application: JobApplication;
  onUpdateApplication: (updatedApp: JobApplication) => void;
  onStartInterview?: (application: JobApplication, settings: any) => void;
}

const JobInterviewIntegration: React.FC<JobInterviewIntegrationProps> = ({
  application,
  onUpdateApplication,
  onStartInterview,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [selectedMode, setSelectedMode] = useState<InterviewMode>(InterviewMode.TEXT);
  const [personalizedQuestions, setPersonalizedQuestions] = useState<string[]>([]);
  const [readinessData, setReadinessData] = useState<any>(null);

  // Calculate interview readiness on component mount
  useEffect(() => {
    const readiness = calculateInterviewReadiness(application);
    setReadinessData(readiness);
    
    // Generate personalized questions
    const questions = generatePersonalizedQuestions(application);
    setPersonalizedQuestions(questions);
  }, [application]);

  const handleStartInterview = () => {
    const interviewSettings = convertJobApplicationToInterviewSettings(application, selectedMode);
    const sessionContext = createInterviewSessionContext(application);
    
    // Store interview context in localStorage for the interview page
    localStorage.setItem('interviewContext', JSON.stringify({
      ...sessionContext,
      settings: interviewSettings,
      personalizedQuestions,
    }));
    
    if (onStartInterview) {
      onStartInterview(application, { ...interviewSettings, ...sessionContext });
    } else {
      // Navigate to interview page with job context
      navigate('/mock-interview', { 
        state: { 
          jobApplication: application,
          interviewSettings,
          sessionContext,
          personalizedQuestions,
        }
      });
    }
  };

  const handleAddPreparationTasks = () => {
    const newTasks = generateInterviewPreparationTasks(application);
    const existingTasks = application.progressTasks || [];
    
    // Avoid duplicating tasks
    const uniqueNewTasks = newTasks.filter(newTask => 
      !existingTasks.some(existingTask => existingTask.title === newTask.title)
    );
    
    if (uniqueNewTasks.length > 0) {
      const updatedApplication = {
        ...application,
        progressTasks: [...existingTasks, ...uniqueNewTasks],
      };
      onUpdateApplication(updatedApplication);
    }
  };



  const getReadinessIcon = (level: string) => {
    switch (level) {
      case 'well-prepared': return '🌟';
      case 'ready': return '✅';
      case 'partially-ready': return '⚠️';
      default: return '🔴';
    }
  };

  return (
    <GlassCard className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-700">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="text-3xl">🎯</div>
          <div>
            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200">
              {t('jobInterview.interviewPreparation', 'Interview Preparation')}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('jobInterview.practiceWithAI', 'Practice with AI for')} {application.company?.name || application.companyName}
            </p>
          </div>
        </div>
        
        {readinessData && (
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
            readinessData.level === 'high' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
            readinessData.level === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' :
            'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
          }`}>
            {getReadinessIcon(readinessData.level)} {readinessData.score}% Ready
          </span>
        )}
      </div>

      {/* Interview Readiness Overview */}
      {readinessData && (
        <div className="mb-6 p-4 bg-white/50 dark:bg-gray-800/50 rounded-lg">
          <h4 className="font-semibold mb-3 text-gray-800 dark:text-gray-200">
            📊 Readiness Assessment
          </h4>
          
          <div className="w-full bg-gray-200 rounded-full h-3 mb-3">
            <div 
              className={`h-3 rounded-full transition-all duration-500 ${
                readinessData.level === 'well-prepared' ? 'bg-green-500' :
                readinessData.level === 'ready' ? 'bg-blue-500' :
                readinessData.level === 'partially-ready' ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ width: `${readinessData.score}%` }}
            />
          </div>
          
          {readinessData.recommendations.length > 0 && (
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Recommendations:
              </p>
              {readinessData.recommendations.map((rec: string, index: number) => (
                <p key={index} className="text-xs text-gray-600 dark:text-gray-400">
                  • {rec}
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <GlassCard className="p-4 hover:shadow-md transition-shadow">
          <div className="text-center">
            <div className="text-2xl mb-2">💬</div>
            <h4 className="font-semibold mb-2">Text Interview</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Quick practice with typed responses
            </p>
            <GlassButton
              variant="button"
              size="sm"
              onClick={() => {
                setSelectedMode(InterviewMode.TEXT);
                handleStartInterview();
              }}
              className="w-full"
            >
              Start Text Interview
            </GlassButton>
          </div>
        </GlassCard>

        <GlassCard className="p-4 hover:shadow-md transition-shadow">
          <div className="text-center">
            <div className="text-2xl mb-2">🎤</div>
            <h4 className="font-semibold mb-2">Voice Interview</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Realistic practice with speech
            </p>
            <GlassButton
              variant="button"
              size="sm"
              onClick={() => {
                setSelectedMode(InterviewMode.AUDIO);
                handleStartInterview();
              }}
              className="w-full"
            >
              Start Voice Interview
            </GlassButton>
          </div>
        </GlassCard>
      </div>

      {/* Additional Actions */}
      <div className="flex flex-wrap gap-3">
        <GlassButton
          variant="button"
          size="sm"
          onClick={() => setShowPreviewModal(true)}
        >
          📋 Preview Questions
        </GlassButton>
        
        <GlassButton
          variant="button"
          size="sm"
          onClick={handleAddPreparationTasks}
        >
          {t('jobInterview.addPrepTasks', '➕ Add Prep Tasks')}
        </GlassButton>
        
        <GlassButton
          variant="button"
          size="sm"
          onClick={() => {
            // Navigate to company research
            window.open(`https://www.google.com/search?q=${encodeURIComponent(
              `${application.company?.name || application.companyName} company information`
            )}`, '_blank');
          }}
        >
          {t('jobInterview.researchCompany', '🔍 Research Company')}
        </GlassButton>
      </div>

      {/* Job Context Summary */}
      <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <h4 className="font-semibold mb-3 text-gray-800 dark:text-gray-200">
          🎯 Interview Context
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-700 dark:text-gray-300">{t('jobInterview.position', 'Position')}:</span>
            <p className="text-gray-600 dark:text-gray-400">
              {application.role?.title || application.jobTitle || 'Not specified'}
            </p>
          </div>
          <div>
            <span className="font-medium text-gray-700 dark:text-gray-300">{t('jobInterview.company', 'Company')}:</span>
            <p className="text-gray-600 dark:text-gray-400">
              {application.company?.name || application.companyName || 'Not specified'}
            </p>
          </div>
          {(() => {
            const extractedSkills = extractSkillsFromJobApplication(application);
            return extractedSkills.length > 0 && (
              <div className="md:col-span-2">
                <span className="font-medium text-gray-700 dark:text-gray-300">{t('jobInterview.keySkills', 'Key Skills')}:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {extractedSkills.slice(0, 5).map((skill, index) => (
                    <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Questions Preview Modal */}
      <GlassModal
        isOpen={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        title="Personalized Interview Questions"
      >
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-400">
            {t('jobInterview.questionsIntro', 'Based on your job application, here are some questions you might be asked:')}
          </p>
          
          <div className="space-y-3">
            {personalizedQuestions.map((question, index) => (
              <div key={index} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0">
                    {index + 1}
                  </div>
                  <p className="text-gray-800 dark:text-gray-200">{question}</p>
                </div>
              </div>
            ))}
          </div>
          
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <GlassButton
              variant="button"
              onClick={() => setShowPreviewModal(false)}
            >
              {t('common.close', 'Close')}
            </GlassButton>
            <GlassButton
              variant="button"
              onClick={() => {
                setShowPreviewModal(false);
                handleStartInterview();
              }}
            >
              {t('jobInterview.startInterview', 'Start Interview')}
            </GlassButton>
          </div>
        </div>
      </GlassModal>
    </GlassCard>
  );
};

export default JobInterviewIntegration;
