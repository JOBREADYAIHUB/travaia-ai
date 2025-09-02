/**
 * React Hook for Pipecat Interview Integration
 * Manages real-time voice interview sessions with state management
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { PipecatService, PipecatConfig, InterviewSessionData, TranscriptEvent, AnalyticsEvent } from '../services/pipecatService';
import { InterviewSession, InterviewSettings, SpeechAnalytics } from '../types';

export interface PipecatState {
  isInitialized: boolean;
  isConnected: boolean;
  isInterviewActive: boolean;
  connectionStatus: string;
  error: string | null;
  sessionData: InterviewSessionData | null;
  transcript: TranscriptEvent[];
  currentAnalytics: AnalyticsEvent | null;
  isLoading: boolean;
}

export interface PipecatActions {
  initializeSession: (settings: InterviewSettings) => Promise<void>;
  startInterview: () => Promise<void>;
  endInterview: () => Promise<InterviewSession | null>;
  cleanup: () => void;
  getSessionAnalytics: (sessionId: string) => Promise<SpeechAnalytics | null>;
}

const BACKEND_URL = import.meta.env.VITE_PIPECAT_BACKEND_URL || 'https://travaia-interview-bot-3666tidp6a-uc.a.run.app';

export function usePipecat(): PipecatState & PipecatActions {
  const { currentUser } = useAuth();
  const pipecatServiceRef = useRef<PipecatService | null>(null);
  
  const [state, setState] = useState<PipecatState>({
    isInitialized: false,
    isConnected: false,
    isInterviewActive: false,
    connectionStatus: 'disconnected',
    error: null,
    sessionData: null,
    transcript: [],
    currentAnalytics: null,
    isLoading: false,
  });

  // Generate unique session ID
  const sessionId = useRef<string>(`session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);

  /**
   * Initialize Pipecat service
   */
  const initializePipecatService = useCallback(() => {
    if (!currentUser || pipecatServiceRef.current) return;

    const config: PipecatConfig = {
      backendUrl: BACKEND_URL,
      userId: currentUser.uid,
      sessionId: sessionId.current,
    };

    const service = new PipecatService(config);

    // Set up event callbacks
    service.setTranscriptCallback((event: TranscriptEvent) => {
      setState(prev => ({
        ...prev,
        transcript: [...prev.transcript, event],
      }));
    });

    service.setAnalyticsCallback((event: AnalyticsEvent) => {
      setState(prev => ({
        ...prev,
        currentAnalytics: event,
      }));
    });

    service.setStatusCallback((status: string) => {
      setState(prev => ({
        ...prev,
        connectionStatus: status,
        isConnected: ['connected', 'room_joined', 'bot_joined', 'interview_started'].includes(status),
        isInterviewActive: status === 'interview_started',
        error: status === 'error' ? 'Connection error occurred' : null,
      }));
    });

    pipecatServiceRef.current = service;
    setState(prev => ({ ...prev, isInitialized: true }));
  }, [currentUser]);

  /**
   * Initialize interview session
   */
  const initializeSession = useCallback(async (settings: InterviewSettings): Promise<void> => {
    if (!pipecatServiceRef.current) {
      throw new Error('Pipecat service not initialized');
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Initialize session with backend
      const sessionData = await pipecatServiceRef.current.initializeSession(settings);
      
      setState(prev => ({
        ...prev,
        sessionData,
        isLoading: false,
      }));

      // Connect to Daily.co room
      await pipecatServiceRef.current.connectToRoom();
      
    } catch (error) {
      console.error('Failed to initialize session:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to initialize session',
        isLoading: false,
      }));
      throw error;
    }
  }, []);

  /**
   * Start the interview
   */
  const startInterview = useCallback(async (): Promise<void> => {
    if (!pipecatServiceRef.current) {
      throw new Error('Pipecat service not initialized');
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      await pipecatServiceRef.current.startInterview();
      setState(prev => ({
        ...prev,
        isLoading: false,
        transcript: [], // Clear previous transcript
      }));
    } catch (error) {
      console.error('Failed to start interview:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to start interview',
        isLoading: false,
      }));
      throw error;
    }
  }, []);

  /**
   * End the interview
   */
  const endInterview = useCallback(async (): Promise<InterviewSession | null> => {
    if (!pipecatServiceRef.current) {
      return null;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const sessionResults = await pipecatServiceRef.current.endInterview();
      
      setState(prev => ({
        ...prev,
        isInterviewActive: false,
        isConnected: false,
        connectionStatus: 'disconnected',
        isLoading: false,
      }));

      return sessionResults;
    } catch (error) {
      console.error('Failed to end interview:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to end interview',
        isLoading: false,
      }));
      return null;
    }
  }, []);

  /**
   * Get session analytics
   */
  const getSessionAnalytics = useCallback(async (sessionId: string): Promise<SpeechAnalytics | null> => {
    if (!pipecatServiceRef.current) {
      return null;
    }

    try {
      return await pipecatServiceRef.current.getSessionAnalytics(sessionId);
    } catch (error) {
      console.error('Failed to get session analytics:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to get analytics',
      }));
      return null;
    }
  }, []);

  /**
   * Cleanup resources
   */
  const cleanup = useCallback(() => {
    if (pipecatServiceRef.current) {
      pipecatServiceRef.current.cleanup();
      pipecatServiceRef.current = null;
    }

    setState({
      isInitialized: false,
      isConnected: false,
      isInterviewActive: false,
      connectionStatus: 'disconnected',
      error: null,
      sessionData: null,
      transcript: [],
      currentAnalytics: null,
      isLoading: false,
    });

    // Generate new session ID for next use
    sessionId.current = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  /**
   * Initialize service when user is available
   */
  useEffect(() => {
    if (currentUser && !pipecatServiceRef.current) {
      initializePipecatService();
    }
  }, [currentUser, initializePipecatService]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  /**
   * Handle connection status changes
   */
  useEffect(() => {
    if (state.connectionStatus === 'error') {
      // Auto-retry connection after error
      const retryTimeout = setTimeout(() => {
        setState(prev => ({ ...prev, error: null }));
      }, 3000);

      return () => clearTimeout(retryTimeout);
    }
  }, [state.connectionStatus]);

  return {
    // State
    ...state,
    
    // Actions
    initializeSession,
    startInterview,
    endInterview,
    cleanup,
    getSessionAnalytics,
  };
}

/**
 * Helper hook for transcript management
 */
export function useTranscript(transcript: TranscriptEvent[]) {
  const [displayTranscript, setDisplayTranscript] = useState<string>('');
  const [lastUserMessage, setLastUserMessage] = useState<string>('');
  const [lastBotMessage, setLastBotMessage] = useState<string>('');

  useEffect(() => {
    if (transcript.length === 0) {
      setDisplayTranscript('');
      setLastUserMessage('');
      setLastBotMessage('');
      return;
    }

    // Format transcript for display
    const formatted = transcript
      .map(event => `${event.type === 'user' ? 'You' : 'Interviewer'}: ${event.text}`)
      .join('\n');
    
    setDisplayTranscript(formatted);

    // Get last messages
    const userMessages = transcript.filter(e => e.type === 'user');
    const botMessages = transcript.filter(e => e.type === 'bot');

    if (userMessages.length > 0) {
      setLastUserMessage(userMessages[userMessages.length - 1].text);
    }

    if (botMessages.length > 0) {
      setLastBotMessage(botMessages[botMessages.length - 1].text);
    }
  }, [transcript]);

  return {
    displayTranscript,
    lastUserMessage,
    lastBotMessage,
    messageCount: transcript.length,
    userMessageCount: transcript.filter(e => e.type === 'user').length,
    botMessageCount: transcript.filter(e => e.type === 'bot').length,
  };
}

/**
 * Helper hook for real-time analytics
 */
export function useRealTimeAnalytics(currentAnalytics: AnalyticsEvent | null) {
  const [analytics, setAnalytics] = useState({
    wpm: 0,
    pauseCount: 0,
    fillerWords: 0,
    clarity: 0,
    confidence: 0,
  });

  useEffect(() => {
    if (currentAnalytics?.type === 'speech_analysis') {
      setAnalytics(currentAnalytics.data);
    }
  }, [currentAnalytics]);

  const getPerformanceLevel = (metric: keyof typeof analytics): 'poor' | 'fair' | 'good' | 'excellent' => {
    const value = analytics[metric];
    
    switch (metric) {
      case 'wpm':
        if (value < 120) return 'poor';
        if (value < 150) return 'fair';
        if (value < 180) return 'good';
        return 'excellent';
      
      case 'clarity':
      case 'confidence':
        if (value < 0.6) return 'poor';
        if (value < 0.75) return 'fair';
        if (value < 0.9) return 'good';
        return 'excellent';
      
      case 'fillerWords':
      case 'pauseCount':
        if (value > 10) return 'poor';
        if (value > 5) return 'fair';
        if (value > 2) return 'good';
        return 'excellent';
      
      default:
        return 'fair';
    }
  };

  return {
    analytics,
    getPerformanceLevel,
    overallScore: Math.round(
      (analytics.clarity * 0.3 + 
       analytics.confidence * 0.3 + 
       Math.min(analytics.wpm / 150, 1) * 0.2 + 
       Math.max(1 - analytics.fillerWords / 10, 0) * 0.2) * 100
    ),
  };
}
