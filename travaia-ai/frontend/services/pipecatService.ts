/**
 * Pipecat Integration Service
 * Handles real-time voice interview sessions with backend pipeline
 */

import DailyIframe, { DailyCall, DailyEventObject } from '@daily-co/daily-js';
import { MockInterviewSession, InterviewSettings } from '../types';

export interface PipecatConfig {
  backendUrl?: string; // Optional, will use env var if not provided
  dailyApiKey?: string;
  userId: string;
  sessionId: string;
}

// Get backend URL from environment
const getBackendUrl = (config?: PipecatConfig): string => {
  return config?.backendUrl || 
         import.meta.env.VITE_INTERVIEW_SESSION_SERVICE_URL || 
         import.meta.env.VITE_BACKEND_URL ||
         'https://travaia-interview-session-service-travaia-e1310.a.run.app';
};

export interface InterviewSessionData {
  sessionId: string;
  roomUrl: string;
  roomToken: string;
  interviewType: string;
  language: string;
  difficulty: string;
  persona: string;
}

export interface TranscriptEvent {
  type: 'user' | 'bot';
  text: string;
  timestamp: number;
  confidence?: number;
}

export interface AnalyticsEvent {
  type: 'speech_analysis';
  data: {
    wpm: number;
    pauseCount: number;
    fillerWords: number;
    clarity: number;
    confidence: number;
  };
  timestamp: number;
}

export class PipecatService {
  private config: PipecatConfig;
  private dailyCall: DailyCall | null = null;
  private sessionData: InterviewSessionData | null = null;
  private isConnected = false;
  private transcriptCallback?: (event: TranscriptEvent) => void;
  private analyticsCallback?: (event: AnalyticsEvent) => void;
  private statusCallback?: (status: string) => void;

  constructor(config: PipecatConfig) {
    this.config = {
      ...config,
      backendUrl: getBackendUrl(config)
    };
  }

  /**
   * Initialize interview session with backend
   */
  async initializeSession(settings: InterviewSettings): Promise<InterviewSessionData> {
    try {
      const response = await fetch(`${this.config.backendUrl}/interview/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`,
        },
        body: JSON.stringify({
          userId: this.config.userId,
          sessionId: this.config.sessionId,
          interviewType: settings.interviewType,
          language: settings.language || 'en',
          difficulty: settings.difficulty || 'medium',
          jobRole: settings.jobRole,
          jobDescription: settings.jobDescription,
          companyName: settings.companyName,
          focusAreas: settings.focusAreas,
          voiceStyle: settings.voiceStyle,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to initialize session: ${response.statusText}`);
      }

      const sessionData = await response.json();
      
      if (!sessionData) {
        throw new Error('Invalid session data received from backend');
      }
      
      this.sessionData = sessionData;
      return sessionData;
    } catch (error) {
      console.error('Error initializing Pipecat session:', error);
      throw error;
    }
  }

  /**
   * Connect to Daily.co room for WebRTC audio
   */
  async connectToRoom(): Promise<void> {
    if (!this.sessionData) {
      throw new Error('Session not initialized. Call initializeSession first.');
    }

    try {
      // Create Daily call instance
      this.dailyCall = DailyIframe.createCallObject({
        audioSource: true,
        videoSource: false, // Audio-only for interviews
      });

      // Set up event listeners
      this.setupEventListeners();

      // Join the room
      await this.dailyCall.join({
        url: this.sessionData.roomUrl,
        token: this.sessionData.roomToken,
      });

      this.isConnected = true;
      this.statusCallback?.('connected');
    } catch (error) {
      console.error('Error connecting to Daily.co room:', error);
      throw error;
    }
  }

  /**
   * Start the interview session
   */
  async startInterview(): Promise<void> {
    if (!this.isConnected || !this.sessionData) {
      throw new Error('Not connected to room. Call connectToRoom first.');
    }

    try {
      // Enable microphone
      await this.dailyCall?.setLocalAudio(true);

      // Notify backend to start interview pipeline
      await fetch(`${this.config.backendUrl}/interview/${this.sessionData.sessionId}/start`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${await this.getAuthToken()}`,
        },
      });

      this.statusCallback?.('interview_started');
    } catch (error) {
      console.error('Error starting interview:', error);
      throw error;
    }
  }

  /**
   * End the interview session
   */
  async endInterview(): Promise<MockInterviewSession> {
    if (!this.sessionData) {
      throw new Error('No active session to end.');
    }

    try {
      // Notify backend to end interview
      const response = await fetch(`${this.config.backendUrl}/interview/${this.sessionData.sessionId}/end`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${await this.getAuthToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to end interview: ${response.statusText}`);
      }

      const sessionResults = await response.json();

      // Leave Daily.co room
      await this.dailyCall?.leave();
      this.dailyCall?.destroy();
      this.dailyCall = null;
      this.isConnected = false;

      this.statusCallback?.('interview_ended');
      return sessionResults;
    } catch (error) {
      console.error('Error ending interview:', error);
      throw error;
    }
  }

  /**
   * Get session analytics
   */
  async getSessionAnalytics(sessionId: string): Promise<any> {
    try {
      const response = await fetch(`${this.config.backendUrl}/analytics/session/${sessionId}`, {
        headers: {
          'Authorization': `Bearer ${await this.getAuthToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get analytics: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting session analytics:', error);
      throw error;
    }
  }

  /**
   * Set up event listeners for Daily.co and backend events
   */
  private setupEventListeners(): void {
    if (!this.dailyCall) return;

    // Daily.co events
    this.dailyCall.on('joined-meeting', this.handleJoinedMeeting.bind(this));
    this.dailyCall.on('left-meeting', this.handleLeftMeeting.bind(this));
    this.dailyCall.on('participant-joined', this.handleParticipantJoined.bind(this));
    this.dailyCall.on('error', this.handleError.bind(this));

    // Set up WebSocket for real-time events (transcript, analytics)
    this.setupWebSocketConnection();
  }

  /**
   * Set up WebSocket connection for real-time events
   */
  private setupWebSocketConnection(): void {
    if (!this.sessionData) return;

    // Note: This would typically use WebSocket for real-time events
    // For now, we'll use polling as a fallback
    this.pollForUpdates();
  }

  /**
   * Poll for transcript and analytics updates
   */
  private pollForUpdates(): void {
    const pollInterval = setInterval(async () => {
      if (!this.isConnected || !this.sessionData) {
        clearInterval(pollInterval);
        return;
      }

      try {
        // Get latest transcript
        const transcriptResponse = await fetch(
          `${this.config.backendUrl}/interview/${this.sessionData.sessionId}/transcript`,
          {
            headers: {
              'Authorization': `Bearer ${await this.getAuthToken()}`,
            },
          }
        );

        if (transcriptResponse.ok) {
          const transcript = await transcriptResponse.json();
          if (transcript.latest) {
            this.transcriptCallback?.(transcript.latest);
          }
        }

        // Get real-time analytics
        const analyticsResponse = await fetch(
          `${this.config.backendUrl}/analytics/session/${this.sessionData.sessionId}/realtime`,
          {
            headers: {
              'Authorization': `Bearer ${await this.getAuthToken()}`,
            },
          }
        );

        if (analyticsResponse.ok) {
          const analytics = await analyticsResponse.json();
          if (analytics.latest) {
            this.analyticsCallback?.(analytics.latest);
          }
        }
      } catch (error) {
        console.error('Error polling for updates:', error);
      }
    }, 1000); // Poll every second
  }

  /**
   * Event handlers
   */
  private handleJoinedMeeting(event: DailyEventObject): void {
    console.log('Joined Daily.co meeting:', event);
    this.statusCallback?.('room_joined');
  }

  private handleLeftMeeting(event: DailyEventObject): void {
    console.log('Left Daily.co meeting:', event);
    this.statusCallback?.('room_left');
  }

  private handleParticipantJoined(event: DailyEventObject): void {
    console.log('Participant joined:', event);
    if (event.participant?.user_name === 'pipecat-bot') {
      this.statusCallback?.('bot_joined');
    }
  }

  private handleError(event: DailyEventObject): void {
    console.error('Daily.co error:', event);
    this.statusCallback?.('error');
  }

  /**
   * Get Firebase auth token
   */
  private async getAuthToken(): Promise<string> {
    // This would integrate with your Firebase auth
    // For now, return a placeholder
    return 'auth-token-placeholder';
  }

  /**
   * Set callback functions
   */
  setTranscriptCallback(callback: (event: TranscriptEvent) => void): void {
    this.transcriptCallback = callback;
  }

  setAnalyticsCallback(callback: (event: AnalyticsEvent) => void): void {
    this.analyticsCallback = callback;
  }

  setStatusCallback(callback: (status: string) => void): void {
    this.statusCallback = callback;
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): string {
    if (!this.dailyCall) return 'disconnected';
    return this.isConnected ? 'connected' : 'connecting';
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.dailyCall) {
      this.dailyCall.leave();
      this.dailyCall.destroy();
      this.dailyCall = null;
    }
    this.isConnected = false;
    this.sessionData = null;
  }
}
