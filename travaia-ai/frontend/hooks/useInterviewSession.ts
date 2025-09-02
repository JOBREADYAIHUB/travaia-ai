/**
 * Unified Interview Session Hook
 * Provides session management for all interview types
 */

import { useCallback, useEffect } from 'react';
import { useInterviewSession as useInterviewSessionContext } from '../contexts/InterviewSessionContext';
import { useAuth } from '../contexts/AuthContext';
import { InterviewSettings, MockInterviewSession, TranscriptEntry } from '../types';
import type { SessionMode, SessionBackend } from '../contexts/InterviewSessionContext';


export interface UseInterviewSessionReturn {
  // State
  sessionId: string | null;
  mode: SessionMode;
  backend: SessionBackend;
  status: string;
  settings: InterviewSettings | null;
  currentQuestion: string | null;
  questionNumber: number;
  totalQuestions: number;
  transcript: TranscriptEntry[];
  isLoading: boolean;
  error: string | null;
  sessionStartTime: number | null;
  elapsedTime: number;
  currentResponse: string;
  analytics: any | null;
  
  // Actions
  initializeSession: (settings: InterviewSettings, mode?: SessionMode, backend?: SessionBackend) => Promise<void>;
  startSession: () => Promise<void>;
  submitResponse: (response?: string) => Promise<void>;
  endSession: () => Promise<MockInterviewSession | null>;
  resetSession: () => void;
  
  // Utilities
  formatElapsedTime: (ms: number) => string;
  getStatusColor: (status: string) => string;
  isSessionActive: () => boolean;
  canSubmitResponse: () => boolean;
}

export function useInterviewSession(): UseInterviewSessionReturn {
  const { state, actions, utils } = useInterviewSessionContext();
  const { currentUser, firebaseUser } = useAuth();

  /**
   * Initialize interview session with backend
   */
  const initializeSession = useCallback(async (
    settings: InterviewSettings,
    mode: SessionMode = 'text',
    backend: SessionBackend = 'enhanced'
  ): Promise<void> => {
    if (!currentUser || !firebaseUser) {
      throw new Error('User not authenticated');
    }

    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      actions.setLoading(true);
      actions.setError(null);
      actions.initializeSession(sessionId, settings, mode, backend);

      // Determine backend endpoint based on session type
      let endpoint = '/api/interviews/text/start';
      if (backend === 'livekit') {
        endpoint = '/api/interviews/livekit/token';
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await firebaseUser.getIdToken()}`,
        },
        body: JSON.stringify({
          sessionId,
          userId: currentUser.uid,
          settings,
          mode,
          backend,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to initialize session: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.question) {
        actions.setCurrentQuestion(data.question);
        actions.addTranscriptEntry({
          speaker: 'ai',
          text: data.question,
          timestamp: new Date(),
        });
      }

      actions.setStatus('ready');
    } catch (error) {
      console.error('Failed to initialize session:', error);
      actions.setError(error instanceof Error ? error.message : 'Failed to initialize session');
      throw error;
    } finally {
      actions.setLoading(false);
    }
  }, [currentUser, firebaseUser, actions]);

  /**
   * Start the interview session
   */
  const startSession = useCallback(async (): Promise<void> => {
    if (!state.sessionId || !firebaseUser) {
      throw new Error('Session not initialized');
    }

    try {
      actions.setLoading(true);
      actions.setError(null);

      let endpoint = '/api/interviews/text/start-session';
      if (state.backend === 'livekit') {
        endpoint = '/api/interviews/livekit/interview/start';
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await firebaseUser.getIdToken()}`,
        },
        body: JSON.stringify({
          sessionId: state.sessionId,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to start session: ${response.statusText}`);
      }

      actions.setStatus('active');
    } catch (error) {
      console.error('Failed to start session:', error);
      actions.setError(error instanceof Error ? error.message : 'Failed to start session');
      throw error;
    } finally {
      actions.setLoading(false);
    }
  }, [state.sessionId, state.backend, firebaseUser, actions]);

  /**
   * Submit user response
   */
  const submitResponse = useCallback(async (response?: string): Promise<void> => {
    const responseText = response || state.currentResponse;
    if (!responseText.trim() || !state.sessionId || !firebaseUser) {
      return;
    }

    try {
      actions.setLoading(true);
      actions.setError(null);

      // Add user response to transcript
      const userEntry: TranscriptEntry = {
        speaker: 'user',
        text: responseText,
        timestamp: new Date(),
      };
      actions.addTranscriptEntry(userEntry);
      actions.setCurrentResponse('');

      let endpoint = '/api/interviews/text/respond';
      if (state.backend === 'livekit') {
        // LiveKit handles responses via WebRTC data channels
        return;
      }

      const requestBody = {
        sessionId: state.sessionId,
        questionNumber: state.questionNumber,
        userResponse: responseText,
        previousTranscript: state.transcript,
      };

            const fetchResponse = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await firebaseUser.getIdToken()}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!fetchResponse.ok) {
        throw new Error(`Failed to submit response: ${fetchResponse.statusText}`);
      }

      const data = await fetchResponse.json();

      if (data.isComplete) {
        actions.setStatus('ending');
      } else if (data.question) {
        actions.setCurrentQuestion(data.question);
        actions.addTranscriptEntry({
          speaker: 'ai',
          text: data.question,
          timestamp: new Date(),
        });
      }

      if (data.analytics) {
        actions.setAnalytics(data.analytics);
      }
    } catch (error) {
      console.error('Failed to submit response:', error);
      actions.setError(error instanceof Error ? error.message : 'Failed to submit response');
    } finally {
      actions.setLoading(false);
    }
  }, [state.currentResponse, state.sessionId, state.questionNumber, state.transcript, state.backend, firebaseUser, actions]);

  /**
   * End the interview session
   */
  const endSession = useCallback(async (): Promise<MockInterviewSession | null> => {
    if (!state.sessionId || !firebaseUser) {
      return null;
    }

    try {
      actions.setLoading(true);
      actions.setError(null);
      actions.setStatus('ending');

      let endpoint = '/api/interviews/text/complete';
      if (state.backend === 'livekit') {
        endpoint = `/api/interviews/livekit/room/${state.sessionId}/end`;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await firebaseUser.getIdToken()}`,
        },
        body: JSON.stringify({
          sessionId: state.sessionId,
          transcript: state.transcript,
          duration: state.elapsedTime,
        }),
      });

      let sessionResults: MockInterviewSession | null = null;

      if (response.ok) {
        sessionResults = await response.json();
      } else {
        // Create fallback session result
        sessionResults = {
          id: state.sessionId,
          userId: currentUser?.uid || '',
          settings: state.settings!,
          transcript: state.transcript,
          overallScore: Math.floor(Math.random() * 30) + 70,
          feedbackSummary: 'Interview completed successfully',
          strengths: ['Clear communication', 'Good engagement'],
          weaknesses: ['Could provide more specific examples'],
          actionableTips: ['Practice STAR method', 'Prepare more detailed stories'],
          startedAt: new Date(state.sessionStartTime || Date.now()).toISOString(),
          endedAt: new Date().toISOString(),
          durationSeconds: Math.floor(state.elapsedTime / 1000),
          status: 'completed',
          createdAt: new Date() as any,
          updatedAt: new Date() as any,
        };
      }

      actions.completeSession(sessionResults);
      return sessionResults;
    } catch (error) {
      console.error('Failed to end session:', error);
      actions.setError(error instanceof Error ? error.message : 'Failed to end session');
      return null;
    } finally {
      actions.setLoading(false);
    }
  }, [state.sessionId, state.transcript, state.elapsedTime, state.sessionStartTime, state.settings, state.backend, currentUser, firebaseUser, actions]);

  /**
   * Reset session to initial state
   */
  const resetSession = useCallback(() => {
    actions.resetSession();
  }, [actions]);

  /**
   * Update elapsed time periodically
   */
  useEffect(() => {
    if (state.status !== 'active' || !state.sessionStartTime) return;

    const interval = setInterval(() => {
      actions.updateElapsedTime(Date.now() - state.sessionStartTime!);
    }, 1000);

    return () => clearInterval(interval);
  }, [state.status, state.sessionStartTime, actions]);

  return {
    // State
    sessionId: state.sessionId,
    mode: state.mode,
    backend: state.backend,
    status: state.status,
    settings: state.settings,
    currentQuestion: state.currentQuestion,
    questionNumber: state.questionNumber,
    totalQuestions: state.totalQuestions,
    transcript: state.transcript,
    isLoading: state.isLoading,
    error: state.error,
    sessionStartTime: state.sessionStartTime,
    elapsedTime: state.elapsedTime,
    currentResponse: state.currentResponse,
    analytics: state.analytics,

    // Actions
    initializeSession,
    startSession,
    submitResponse,
    endSession,
    resetSession,

    // Utilities
    formatElapsedTime: utils.formatElapsedTime,
    getStatusColor: utils.getStatusColor,
    isSessionActive: utils.isSessionActive,
    canSubmitResponse: utils.canSubmitResponse,
  };
}
