/**
 * Unified Interview Session Context
 * Manages state and logic for all interview session types
 */

import React, { createContext, useContext, useReducer, useCallback, ReactNode } from 'react';
import { InterviewSettings, MockInterviewSession, TranscriptEntry } from '../types';

export type SessionMode = 'text' | 'voice' | 'mixed';
export type SessionBackend = 'livekit' | 'enhanced' | 'basic';
export type SessionStatus = 'idle' | 'initializing' | 'connecting' | 'ready' | 'active' | 'ending' | 'completed' | 'error';

export interface InterviewSessionState {
  sessionId: string | null;
  mode: SessionMode;
  backend: SessionBackend;
  status: SessionStatus;
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
}

export type InterviewSessionAction =
  | { type: 'INITIALIZE_SESSION'; payload: { sessionId: string; settings: InterviewSettings; mode: SessionMode; backend: SessionBackend } }
  | { type: 'SET_STATUS'; payload: SessionStatus }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_CURRENT_QUESTION'; payload: string }
  | { type: 'ADD_TRANSCRIPT_ENTRY'; payload: TranscriptEntry }
  | { type: 'SET_CURRENT_RESPONSE'; payload: string }
  | { type: 'UPDATE_ELAPSED_TIME'; payload: number }
  | { type: 'SET_ANALYTICS'; payload: any }
  | { type: 'COMPLETE_SESSION'; payload: MockInterviewSession }
  | { type: 'RESET_SESSION' };

const initialState: InterviewSessionState = {
  sessionId: null,
  mode: 'text',
  backend: 'basic',
  status: 'idle',
  settings: null,
  currentQuestion: null,
  questionNumber: 0,
  totalQuestions: 5,
  transcript: [],
  isLoading: false,
  error: null,
  sessionStartTime: null,
  elapsedTime: 0,
  currentResponse: '',
  analytics: null,
};

function interviewSessionReducer(
  state: InterviewSessionState,
  action: InterviewSessionAction
): InterviewSessionState {
  switch (action.type) {
    case 'INITIALIZE_SESSION':
      return {
        ...state,
        sessionId: action.payload.sessionId,
        settings: action.payload.settings,
        mode: action.payload.mode,
        backend: action.payload.backend,
        status: 'initializing',
        transcript: [],
        questionNumber: 0,
        sessionStartTime: Date.now(),
        error: null,
      };

    case 'SET_STATUS':
      return {
        ...state,
        status: action.payload,
        ...(action.payload === 'active' && !state.sessionStartTime && { sessionStartTime: Date.now() }),
      };

    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };

    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        status: action.payload ? 'error' : state.status,
        isLoading: false,
      };

    case 'SET_CURRENT_QUESTION':
      return {
        ...state,
        currentQuestion: action.payload,
        questionNumber: state.questionNumber + 1,
      };

    case 'ADD_TRANSCRIPT_ENTRY':
      return {
        ...state,
        transcript: [...state.transcript, action.payload],
      };

    case 'SET_CURRENT_RESPONSE':
      return {
        ...state,
        currentResponse: action.payload,
      };

    case 'UPDATE_ELAPSED_TIME':
      return {
        ...state,
        elapsedTime: action.payload,
      };

    case 'SET_ANALYTICS':
      return {
        ...state,
        analytics: action.payload,
      };

    case 'COMPLETE_SESSION':
      return {
        ...state,
        status: 'completed',
        isLoading: false,
      };

    case 'RESET_SESSION':
      return initialState;

    default:
      return state;
  }
}

export interface InterviewSessionContextType {
  state: InterviewSessionState;
  actions: {
    initializeSession: (sessionId: string, settings: InterviewSettings, mode: SessionMode, backend: SessionBackend) => void;
    setStatus: (status: SessionStatus) => void;
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    setCurrentQuestion: (question: string) => void;
    addTranscriptEntry: (entry: TranscriptEntry) => void;
    setCurrentResponse: (response: string) => void;
    updateElapsedTime: (time: number) => void;
    setAnalytics: (analytics: any) => void;
    completeSession: (session: MockInterviewSession) => void;
    resetSession: () => void;
  };
  utils: {
    formatElapsedTime: (ms: number) => string;
    getStatusColor: (status: SessionStatus) => string;
    isSessionActive: () => boolean;
    canSubmitResponse: () => boolean;
  };
}

const InterviewSessionContext = createContext<InterviewSessionContextType | undefined>(undefined);

export const InterviewSessionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(interviewSessionReducer, initialState);

  // Actions
  const actions = {
    initializeSession: useCallback((sessionId: string, settings: InterviewSettings, mode: SessionMode, backend: SessionBackend) => {
      dispatch({ type: 'INITIALIZE_SESSION', payload: { sessionId, settings, mode, backend } });
    }, []),

    setStatus: useCallback((status: SessionStatus) => {
      dispatch({ type: 'SET_STATUS', payload: status });
    }, []),

    setLoading: useCallback((loading: boolean) => {
      dispatch({ type: 'SET_LOADING', payload: loading });
    }, []),

    setError: useCallback((error: string | null) => {
      dispatch({ type: 'SET_ERROR', payload: error });
    }, []),

    setCurrentQuestion: useCallback((question: string) => {
      dispatch({ type: 'SET_CURRENT_QUESTION', payload: question });
    }, []),

    addTranscriptEntry: useCallback((entry: TranscriptEntry) => {
      dispatch({ type: 'ADD_TRANSCRIPT_ENTRY', payload: entry });
    }, []),

    setCurrentResponse: useCallback((response: string) => {
      dispatch({ type: 'SET_CURRENT_RESPONSE', payload: response });
    }, []),

    updateElapsedTime: useCallback((time: number) => {
      dispatch({ type: 'UPDATE_ELAPSED_TIME', payload: time });
    }, []),

    setAnalytics: useCallback((analytics: any) => {
      dispatch({ type: 'SET_ANALYTICS', payload: analytics });
    }, []),

    completeSession: useCallback((session: MockInterviewSession) => {
      dispatch({ type: 'COMPLETE_SESSION', payload: session });
    }, []),

    resetSession: useCallback(() => {
      dispatch({ type: 'RESET_SESSION' });
    }, []),
  };

  // Utility functions
  const utils = {
    formatElapsedTime: useCallback((ms: number): string => {
      const minutes = Math.floor(ms / 60000);
      const seconds = Math.floor((ms % 60000) / 1000);
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }, []),

    getStatusColor: useCallback((status: SessionStatus): string => {
      switch (status) {
        case 'ready':
        case 'active':
          return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
        case 'initializing':
        case 'connecting':
          return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300';
        case 'error':
          return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300';
        case 'completed':
          return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300';
        default:
          return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
      }
    }, []),

    isSessionActive: useCallback((): boolean => {
      return state.status === 'active';
    }, [state.status]),

    canSubmitResponse: useCallback((): boolean => {
      return state.status === 'active' && state.currentResponse.trim().length > 0 && !state.isLoading;
    }, [state.status, state.currentResponse, state.isLoading]),
  };

  const contextValue: InterviewSessionContextType = {
    state,
    actions,
    utils,
  };

  return (
    <InterviewSessionContext.Provider value={contextValue}>
      {children}
    </InterviewSessionContext.Provider>
  );
};

export const useInterviewSession = (): InterviewSessionContextType => {
  const context = useContext(InterviewSessionContext);
  if (!context) {
    throw new Error('useInterviewSession must be used within an InterviewSessionProvider');
  }
  return context;
};

export default InterviewSessionContext;
