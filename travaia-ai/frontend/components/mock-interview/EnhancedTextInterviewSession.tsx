/**
 * Enhanced Text Interview Session with LLM Integration
 * Uses modern API gateway for intelligent text-based interviews
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { PageHeader, GlassCard, GlassButton, ProgressBar } from '../design-system';
import { InterviewSettings, MockInterviewSession, TranscriptEntry } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { User as FirebaseUser } from 'firebase/auth';
import { Timestamp } from 'firebase/firestore';


interface EnhancedTextInterviewSessionProps {
  settings: InterviewSettings;
  onComplete: (session: MockInterviewSession) => void;
  onEnd: () => void;
}

interface TextInterviewState {
  sessionId: string;
  currentQuestion: string;
  questionNumber: number;
  totalQuestions: number;
  transcript: TranscriptEntry[];
  isLoading: boolean;
  isWaitingForResponse: boolean;
  error: string | null;
  sessionStartTime: number;
  currentResponse: string;
}

interface LLMResponse {
  question: string;
  feedback?: string;
  isComplete: boolean;
  analytics?: {
    responseQuality: number;
    relevance: number;
    completeness: number;
    suggestions: string[];
  };
}

const EnhancedTextInterviewSession: React.FC<EnhancedTextInterviewSessionProps> = ({
  settings,
  onComplete,
  onEnd,
}) => {
  const { t } = useTranslation();
  const { currentUser, firebaseUser } = useAuth();
  
  const [state, setState] = useState<TextInterviewState>({
    sessionId: `text_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    currentQuestion: '',
    questionNumber: 0,
    totalQuestions: 5,
    transcript: [],
    isLoading: true,
    isWaitingForResponse: false,
    error: null,
    sessionStartTime: Date.now(),
    currentResponse: '',
  });

  const [showEndConfirmation, setShowEndConfirmation] = useState(false);

  /**
   * Initialize interview session with backend
   */
  const initializeSession = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

            const response = await fetch(`/api/interviews/text/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await firebaseUser?.getIdToken()}`,
        },
        body: JSON.stringify({
          sessionId: state.sessionId,
          userId: currentUser?.uid,
          interviewType: settings.interviewType,
          language: settings.language || 'en',
          difficulty: settings.difficulty || 'medium',
          jobRole: settings.jobRole,
          companyName: settings.companyName,
          jobDescription: settings.jobDescription,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to initialize session: ${response.statusText}`);
      }

      const data: LLMResponse = await response.json();
      
      setState(prev => ({
        ...prev,
        currentQuestion: data.question,
        questionNumber: 1,
        isLoading: false,
        transcript: [{
          id: `q1_${Date.now()}`,
          speaker: 'ai',
          text: data.question,
          timestamp: new Date(),
          confidence: 1.0,
        }],
      }));
    } catch (error) {
      console.error('Failed to initialize text interview:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to initialize interview',
        isLoading: false,
      }));
    }
  }, [state.sessionId, currentUser, settings]);

  /**
   * Submit user response and get next question
   */
  const submitResponse = useCallback(async () => {
    if (!state.currentResponse.trim()) return;

    try {
      setState(prev => ({ ...prev, isWaitingForResponse: true, error: null }));

      // Add user response to transcript
      const userEntry: TranscriptEntry = {
        speaker: 'user',
        text: state.currentResponse,
        timestamp: new Date(),
      };

      setState(prev => ({
        ...prev,
        transcript: [...prev.transcript, userEntry],
        currentResponse: '',
      }));

      // Send response to backend for analysis and next question
            const response = await fetch(`/api/interviews/text/respond`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await firebaseUser?.getIdToken()}`,
        },
        body: JSON.stringify({
          sessionId: state.sessionId,
          questionNumber: state.questionNumber,
          userResponse: state.currentResponse,
          previousTranscript: state.transcript,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to submit response: ${response.statusText}`);
      }

      const data: LLMResponse = await response.json();

      if (data.isComplete) {
        // Interview is complete
        await completeInterview();
      } else {
        // Add next question to transcript
        const aiEntry: TranscriptEntry = {
          speaker: 'ai',
          text: data.question,
          timestamp: new Date(),
        };

        setState(prev => ({
          ...prev,
          currentQuestion: data.question,
          questionNumber: prev.questionNumber + 1,
          transcript: [...prev.transcript, aiEntry],
          isWaitingForResponse: false,
        }));
      }
    } catch (error) {
      console.error('Failed to submit response:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to submit response',
        isWaitingForResponse: false,
      }));
    }
  }, [state.currentResponse, state.sessionId, state.questionNumber, state.transcript]);

  /**
   * Complete the interview and get final results
   */
  const completeInterview = useCallback(async () => {
    try {
            const response = await fetch(`/api/interviews/text/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await firebaseUser?.getIdToken()}`,
        },
        body: JSON.stringify({
          sessionId: state.sessionId,
          transcript: state.transcript,
          duration: Date.now() - state.sessionStartTime,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to complete interview: ${response.statusText}`);
      }

      const sessionResults = await response.json();

      // Create MockInterviewSession compatible result
      const mockSession: MockInterviewSession = {
        id: state.sessionId,
        userId: currentUser?.uid || 'anonymous',
        settings: settings, // InterviewSettings object contains all interview configuration
        transcript: state.transcript,
        overallScore: sessionResults.analytics?.overallScore || 85,
        feedbackSummary: sessionResults.feedback || 'Good performance with thoughtful responses',
        strengths: sessionResults.strengths || ['Clear communication', 'Relevant responses'],
        weaknesses: sessionResults.improvements || ['Provide more specific examples'],
        actionableTips: sessionResults.actionableTips || ['Practice with more specific examples'],
        startedAt: new Date(state.sessionStartTime).toISOString(),
        endedAt: new Date().toISOString(),
        durationSeconds: Math.floor((Date.now() - state.sessionStartTime) / 1000),
        status: 'completed',
        createdAt: Timestamp.fromMillis(state.sessionStartTime),
        updatedAt: Timestamp.fromMillis(Date.now()),
      };

      onComplete(mockSession);
    } catch (error) {
      console.error('Failed to complete interview:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to complete interview',
      }));
    }
  }, [state, currentUser, settings, onComplete]);

  /**
   * Get authentication token
   */
  const getAuthToken = useCallback(async (): Promise<string> => {
    if (!firebaseUser) {
      throw new Error('User not authenticated');
    }
    return await firebaseUser.getIdToken();
  }, [firebaseUser]);

  /**
   * Handle keyboard shortcuts
   */
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key === 'Enter' && event.ctrlKey) {
        event.preventDefault();
        submitResponse();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [submitResponse]);

  /**
   * Initialize session on mount
   */
  useEffect(() => {
    initializeSession();
  }, [initializeSession]);

  /**
   * Format elapsed time
   */
  const formatElapsedTime = (ms: number): string => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (state.error) {
    return (
      <GlassCard className="p-8 text-center">
        <div className="text-red-500 mb-4">
          <svg className="w-16 h-16 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <h3 className="text-xl font-semibold mb-2">{t('interview.error.title')}</h3>
          <p className="text-gray-600 mb-4">{state.error}</p>
        </div>
        <div className="flex gap-4 justify-center">
          <GlassButton
            onClick={initializeSession}
            variant="button"
          >
            {t('interview.error.retry')}
          </GlassButton>
          <GlassButton
            onClick={onEnd}
            variant="button"
          >
            {t('interview.error.goBack')}
          </GlassButton>
        </div>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <GlassCard className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-bold text-gray-800">
              {t('interview.textSession.title', 'AI-Powered Text Interview')}
            </h2>
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
              {t('interview.textSession.enhanced', 'Enhanced with AI')}
            </span>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-lg font-mono">
              {formatElapsedTime(Date.now() - state.sessionStartTime)}
            </div>
            
            <GlassButton
              onClick={() => setShowEndConfirmation(true)}
              variant="button"
              size="sm"
            >
              {t('interview.session.endInterview')}
            </GlassButton>
          </div>
        </div>
      </GlassCard>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Interview Area */}
        <div className="lg:col-span-2 space-y-6">
          {/* Interview Progress */}
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                {t('interview.progress.title')}
              </h3>
              <span className="text-sm text-gray-600">
                {state.questionNumber} / {state.totalQuestions}
              </span>
            </div>
            
            <ProgressBar 
              value={state.questionNumber}
              max={state.totalQuestions}
              variant="interview"
              size="md"
            />
          </GlassCard>

          {/* Current Question */}
          {state.isLoading ? (
            <GlassCard className="p-6">
              <div className="flex items-center gap-3 py-8">
                <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
                <span className="text-lg">{t('interview.textSession.initializing', 'Generating personalized questions...')}</span>
              </div>
            </GlassCard>
          ) : (
            <GlassCard className="p-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="font-medium text-blue-600">
                    {t('interview.interviewer')}
                  </span>
                </div>
                
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-gray-800 text-lg leading-relaxed">
                    {state.currentQuestion}
                  </p>
                </div>

                {/* Response Area */}
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700">
                    {t('interview.textSession.yourResponse', 'Your Response')}
                  </label>
                  
                  <textarea
                    value={state.currentResponse}
                    onChange={(e) => setState(prev => ({ ...prev, currentResponse: e.target.value }))}
                    placeholder={t('interview.textSession.responsePlaceholder', 'Type your response here... (Ctrl+Enter to submit)')}
                    className="w-full h-32 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    disabled={state.isWaitingForResponse}
                  />
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">
                      {state.currentResponse.length} characters
                    </span>
                    
                    <GlassButton
                      onClick={submitResponse}
                      variant="button"                      disabled={!state.currentResponse.trim() || state.isWaitingForResponse}
                    >
                      {state.isWaitingForResponse 
                        ? t('interview.textSession.processing', 'Processing...') 
                        : t('interview.textSession.submit', 'Submit Response')
                      }
                    </GlassButton>
                  </div>
                </div>
              </div>
            </GlassCard>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Session Info */}
          <GlassCard className="p-6">
            <h3 className="text-lg font-semibold mb-4">{t('interview.session.info')}</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">{t('interview.session.type')}</span>
                <span>{t(`interview.types.${settings.interviewType}`)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">{t('interview.session.mode')}</span>
                <span>{t('interview.modes.text')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">{t('interview.session.language')}</span>
                <span>{settings.language?.toUpperCase() || 'EN'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">{t('interview.session.difficulty')}</span>
                <span>{t(`interview.difficulty.${settings.difficulty}`)}</span>
              </div>
            </div>
          </GlassCard>

          {/* AI Features */}
          <GlassCard className="p-6">
            <h3 className="text-lg font-semibold mb-4">{t('interview.textSession.aiFeatures', 'AI Features')}</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm">{t('interview.textSession.personalizedQuestions', 'Personalized Questions')}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm">{t('interview.textSession.intelligentFollowup', 'Intelligent Follow-up')}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm">{t('interview.textSession.realTimeAnalysis', 'Real-time Analysis')}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm">{t('interview.textSession.detailedFeedback', 'Detailed Feedback')}</span>
              </div>
            </div>
          </GlassCard>

          {/* Tips */}
          <GlassCard className="p-6">
            <h3 className="text-lg font-semibold mb-4">{t('interview.textSession.tips', 'Tips')}</h3>
            <div className="space-y-2 text-sm text-gray-600">
              <p>• {t('interview.textSession.tip1', 'Use Ctrl+Enter to submit quickly')}</p>
              <p>• {t('interview.textSession.tip2', 'Provide specific examples')}</p>
              <p>• {t('interview.textSession.tip3', 'Take your time to think')}</p>
              <p>• {t('interview.textSession.tip4', 'Be honest and authentic')}</p>
            </div>
          </GlassCard>
        </div>
      </div>

      {/* End Interview Confirmation Modal */}
      <GlassModal
        isOpen={showEndConfirmation}
        onClose={() => setShowEndConfirmation(false)}
        title={t('interview.endConfirmation.title')}
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            {t('interview.endConfirmation.message')}
          </p>
          
          <div className="bg-yellow-50 p-4 rounded-lg">
            <p className="text-sm text-yellow-800">
              {t('interview.textSession.endWarning', 'Your progress will be saved, but you won\'t be able to continue this session.')}
            </p>
          </div>

          <div className="flex gap-4 justify-end">
            <GlassButton
              onClick={() => setShowEndConfirmation(false)}
              variant="button"
            >
              {t('interview.endConfirmation.cancel')}
            </GlassButton>
            <GlassButton
              onClick={() => {
                setShowEndConfirmation(false);
                completeInterview();
              }}
              variant="button"
            >
              {t('interview.endConfirmation.confirm')}
            </GlassButton>
          </div>
        </div>
      </GlassModal>
    </div>
  );
};

export default EnhancedTextInterviewSession;
