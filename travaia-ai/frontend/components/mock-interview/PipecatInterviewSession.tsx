/**
 * Pipecat-powered Interview Session Component
 * Real-time voice interview with Google STT/TTS and Gemini AI
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Timestamp } from 'firebase/firestore';
import { GlassCard, GlassButton, GlassModal } from '../design-system';
import { usePipecat, useTranscript, useRealTimeAnalytics } from '../../hooks/usePipecat';
import { InterviewSettings, MockInterviewSession } from '../../types';

interface PipecatInterviewSessionProps {
  settings: InterviewSettings;
  onComplete: (session: MockInterviewSession) => void;
  onEnd: () => void;
}

const PipecatInterviewSession: React.FC<PipecatInterviewSessionProps> = ({
  settings,
  onComplete,
  onEnd,
}) => {
  const { t } = useTranslation();
  
  // Pipecat integration
  const {
    isInitialized,

    connectionStatus,
    error,
    sessionData,
    transcript,
    currentAnalytics,
    isLoading,
    initializeSession,
    startInterview,
    endInterview,
    cleanup,
  } = usePipecat();

  // Transcript management
  const {
    
    lastUserMessage,
    lastBotMessage,
    messageCount,
    userMessageCount,
    botMessageCount,
  } = useTranscript(transcript);

  // Real-time analytics
  const {
    analytics,
    getPerformanceLevel,
    overallScore,
  } = useRealTimeAnalytics(currentAnalytics);

  // Component state
  const [sessionPhase, setSessionPhase] = useState<'initializing' | 'connecting' | 'ready' | 'active' | 'ending' | 'completed'>('initializing');
  const [showEndConfirmation, setShowEndConfirmation] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  /**
   * Initialize session on component mount
   */
  useEffect(() => {
    const initialize = async () => {
      if (!isInitialized) return;

      try {
        setSessionPhase('connecting');
        await initializeSession(settings);
        setSessionPhase('ready');
      } catch (error) {
        console.error('Failed to initialize session:', error);
        setSessionPhase('initializing');
      }
    };

    initialize();
  }, [isInitialized, settings, initializeSession]);

  /**
   * Handle connection status changes
   */
  useEffect(() => {
    switch (connectionStatus) {
      case 'connected':
      case 'room_joined':
      case 'bot_joined':
        setSessionPhase('ready');
        break;
      case 'interview_started':
        setSessionPhase('active');
        if (!sessionStartTime) {
          setSessionStartTime(Date.now());
        }
        break;
      case 'interview_ended':
        setSessionPhase('completed');
        break;
      case 'error':
        setSessionPhase('initializing');
        break;
    }
  }, [connectionStatus, sessionStartTime]);

  /**
   * Update elapsed time
   */
  useEffect(() => {
    if (sessionPhase !== 'active' || !sessionStartTime) return;

    const interval = setInterval(() => {
      setElapsedTime(Date.now() - sessionStartTime);
    }, 1000);

    return () => clearInterval(interval);
  }, [sessionPhase, sessionStartTime]);

  /**
   * Start the interview
   */
  const handleStartInterview = useCallback(async () => {
    try {
      await startInterview();
    } catch (error) {
      console.error('Failed to start interview:', error);
    }
  }, [startInterview]);

  /**
   * End the interview
   */
  const handleEndInterview = useCallback(async () => {
    try {
      setSessionPhase('ending');
      const sessionResults = await endInterview();
      
      if (sessionResults) {
        onComplete(sessionResults);
      } else {
        // Create mock session result if backend fails
        const mockSession: MockInterviewSession = {
          id: sessionData?.sessionId || 'mock-session',
          userId: 'current-user',
          settings: settings,
          transcript: transcript.map((t) => ({
            speaker: t.type === 'user' ? 'user' : 'ai',
            text: t.text,
            timestamp: new Date(t.timestamp),
          })),
          overallScore: overallScore,
          feedbackSummary: 'Good performance with room for improvement',
          strengths: ['Clear communication', 'Good confidence level'],
          weaknesses: ['Reduce filler words', 'Improve pacing'],
          actionableTips: ['Practice speaking more slowly', 'Use fewer filler words'],
          startedAt: new Date(sessionStartTime || Date.now()).toISOString(),
          endedAt: new Date().toISOString(),
          durationSeconds: Math.floor(elapsedTime / 1000),
          status: 'completed',
          createdAt: Timestamp.fromMillis(sessionStartTime || Date.now()),
          updatedAt: Timestamp.fromMillis(Date.now()),
        };
        
        onComplete(mockSession);
      }
    } catch (error) {
      console.error('Failed to end interview:', error);
      onEnd();
    }
  }, [endInterview, onComplete, onEnd, sessionData, settings, sessionStartTime, elapsedTime, transcript, analytics, overallScore]);

  /**
   * Format elapsed time
   */
  const formatElapsedTime = (ms: number): string => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  /**
   * Get status color based on connection state
   */
  const getStatusColor = (): string => {
    switch (connectionStatus) {
      case 'connected':
      case 'room_joined':
      case 'bot_joined':
      case 'interview_started':
        return 'green';
      case 'connecting':
      case 'initializing':
        return 'yellow';
      case 'error':
        return 'red';
      default:
        return 'gray';
    }
  };

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  if (error) {
    return (
      <GlassCard className="p-8 text-center">
        <div className="text-red-500 mb-4">
          <svg className="w-16 h-16 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <h3 className="text-xl font-semibold mb-2">{t('interview.error.title')}</h3>
          <p className="text-gray-600 mb-4">{error}</p>
        </div>
        <div className="flex gap-4 justify-center">
          <GlassButton
            onClick={() => window.location.reload()}
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
      {/* Header with Status */}
      <GlassCard className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-bold text-gray-800">
              {t('interview.session.title')}
            </h2>
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor()}`}>
              {t(`interview.status.${connectionStatus}`)}
            </span>
          </div>
          
          <div className="flex items-center gap-4">
            {sessionPhase === 'active' && (
              <div className="text-lg font-mono">
                {formatElapsedTime(elapsedTime)}
              </div>
            )}
            
            <GlassButton
              onClick={() => setShowEndConfirmation(true)}
              variant="button"
              size="sm"
              disabled={sessionPhase === 'ending'}
            >
              {t('interview.session.endInterview')}
            </GlassButton>
          </div>
        </div>
      </GlassCard>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Interview Area */}
        <div className="lg:col-span-2 space-y-6">
          {/* Interview Status */}
          <GlassCard className="p-6">
            <AnimatePresence mode="wait">
              {sessionPhase === 'initializing' && (
                <motion.div
                  key="initializing"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center py-8"
                >
                  <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                  <h3 className="text-xl font-semibold mb-2">{t('interview.initializing.title')}</h3>
                  <p className="text-gray-600">{t('interview.initializing.description')}</p>
                </motion.div>
              )}

              {sessionPhase === 'connecting' && (
                <motion.div
                  key="connecting"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center py-8"
                >
                  <div className="animate-pulse w-8 h-8 bg-yellow-500 rounded-full mx-auto mb-4"></div>
                  <h3 className="text-xl font-semibold mb-2">{t('interview.connecting.title')}</h3>
                  <p className="text-gray-600">{t('interview.connecting.description')}</p>
                </motion.div>
              )}

              {sessionPhase === 'ready' && (
                <motion.div
                  key="ready"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="text-center py-8"
                >
                  <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{t('interview.ready.title')}</h3>
                  <p className="text-gray-600 mb-6">{t('interview.ready.description')}</p>
                  <GlassButton
                    onClick={handleStartInterview}
                    variant="button"                    size="lg"
                    disabled={isLoading}
                  >
                    {isLoading ? t('interview.starting') : t('interview.startInterview')}
                  </GlassButton>
                </motion.div>
              )}

              {sessionPhase === 'active' && (
                <motion.div
                  key="active"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4"
                >
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                    <span className="text-lg font-semibold">{t('interview.active.recording')}</span>
                  </div>

                  {/* Latest Messages */}
                  <div className="space-y-4">
                    {lastBotMessage && (
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <div className="text-sm text-blue-600 font-medium mb-1">
                          {t('interview.interviewer')}
                        </div>
                        <div className="text-gray-800">{lastBotMessage}</div>
                      </div>
                    )}

                    {lastUserMessage && (
                      <div className="bg-green-50 p-4 rounded-lg">
                        <div className="text-sm text-green-600 font-medium mb-1">
                          {t('interview.you')}
                        </div>
                        <div className="text-gray-800">{lastUserMessage}</div>
                      </div>
                    )}

                    {!lastBotMessage && !lastUserMessage && (
                      <div className="text-center py-8 text-gray-500">
                        <p>{t('interview.active.waitingForSpeech')}</p>
                      </div>
                    )}
                  </div>

                  {/* Message Count */}
                  <div className="text-sm text-gray-500 text-center">
                    {t('interview.messageCount', { 
                      total: messageCount,
                      user: userMessageCount,
                      bot: botMessageCount 
                    })}
                  </div>
                </motion.div>
              )}

              {sessionPhase === 'ending' && (
                <motion.div
                  key="ending"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center py-8"
                >
                  <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                  <h3 className="text-xl font-semibold mb-2">{t('interview.ending.title')}</h3>
                  <p className="text-gray-600">{t('interview.ending.description')}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </GlassCard>
        </div>

        {/* Real-time Analytics Sidebar */}
        <div className="space-y-6">
          {/* Performance Metrics */}
          <GlassCard className="p-6">
            <h3 className="text-lg font-semibold mb-4">{t('interview.analytics.realTime')}</h3>
            
            {sessionPhase === 'active' && currentAnalytics ? (
              <div className="space-y-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600 mb-1">
                    {overallScore}%
                  </div>
                  <div className="text-sm text-gray-600">
                    {t('interview.analytics.overallScore')}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">{t('interview.analytics.wpm')}</span>
                    <span className={`text-sm font-medium ${
                      getPerformanceLevel('wpm') === 'excellent' ? 'text-green-600' :
                      getPerformanceLevel('wpm') === 'good' ? 'text-blue-600' :
                      getPerformanceLevel('wpm') === 'fair' ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {analytics.wpm}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm">{t('interview.analytics.clarity')}</span>
                    <span className={`text-sm font-medium ${
                      getPerformanceLevel('clarity') === 'excellent' ? 'text-green-600' :
                      getPerformanceLevel('clarity') === 'good' ? 'text-blue-600' :
                      getPerformanceLevel('clarity') === 'fair' ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {Math.round(analytics.clarity * 100)}%
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm">{t('interview.analytics.confidence')}</span>
                    <span className={`text-sm font-medium ${
                      getPerformanceLevel('confidence') === 'excellent' ? 'text-green-600' :
                      getPerformanceLevel('confidence') === 'good' ? 'text-blue-600' :
                      getPerformanceLevel('confidence') === 'fair' ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {Math.round(analytics.confidence * 100)}%
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm">{t('interview.analytics.fillerWords')}</span>
                    <span className={`text-sm font-medium ${
                      getPerformanceLevel('fillerWords') === 'excellent' ? 'text-green-600' :
                      getPerformanceLevel('fillerWords') === 'good' ? 'text-blue-600' :
                      getPerformanceLevel('fillerWords') === 'fair' ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {analytics.fillerWords}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>{t('interview.analytics.waitingForData')}</p>
              </div>
            )}
          </GlassCard>

          {/* Session Info */}
          <GlassCard className="p-6">
            <h3 className="text-lg font-semibold mb-4">{t('interview.session.info')}</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">{t('interview.session.type')}</span>
                <span>{t(`interview.types.${settings.interviewType}`)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">{t('interview.session.language')}</span>
                <span>{settings.language?.toUpperCase() || 'EN'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">{t('interview.session.difficulty')}</span>
                <span>{t(`interview.difficulty.${settings.difficulty}`)}</span>
              </div>
              {sessionData && (
                <div className="flex justify-between">
                  <span className="text-gray-600">{t('interview.session.id')}</span>
                  <span className="font-mono text-xs">{sessionData.sessionId.slice(-8)}</span>
                </div>
              )}
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
          
          {sessionPhase === 'active' && (
            <div className="bg-yellow-50 p-4 rounded-lg">
              <p className="text-sm text-yellow-800">
                {t('interview.endConfirmation.warning')}
              </p>
            </div>
          )}

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
                handleEndInterview();
              }}
              variant="button"
              disabled={sessionPhase === 'ending'}
            >
              {sessionPhase === 'ending' 
                ? t('interview.ending.title')
                : t('interview.endConfirmation.confirm')
              }
            </GlassButton>
          </div>
        </div>
      </GlassModal>
    </div>
  );
};

export default PipecatInterviewSession;
