/**
 * React Hook for LiveKit Interview Integration
 * Manages real-time voice interview sessions with LiveKit WebRTC
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  Room, 
  connect, 
  Track, 
  RemoteParticipant, 
  LocalAudioTrack, 
  RemoteAudioTrack,
  DataPacket_Kind,
  RoomEvent
} from 'livekit-client';
import { InterviewSettings, MockInterviewSession, TranscriptEntry } from '../types';

export interface LiveKitInterviewState {
  isConnected: boolean;
  isInterviewActive: boolean;
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'interview_started' | 'interview_ended' | 'error';
  error: string | null;
  room: Room | null;
  aiParticipant: RemoteParticipant | null;
  transcript: TranscriptEntry[];
  isLoading: boolean;
  currentQuestion: string | null;
  sessionId: string | null;
}

export interface LiveKitInterviewActions {
  initializeSession: (settings: InterviewSettings) => Promise<void>;
  startInterview: () => Promise<void>;
  endInterview: () => Promise<MockInterviewSession | null>;
  sendTextMessage: (message: string) => Promise<void>;
  cleanup: () => void;
}

const LIVEKIT_URL = 'wss://travaia-h4it5r9s.livekit.cloud';

export function useLiveKitInterview(): LiveKitInterviewState & LiveKitInterviewActions {
  const { currentUser } = useAuth();
  const roomRef = useRef<Room | null>(null);
  
  const [state, setState] = useState<LiveKitInterviewState>({
    isConnected: false,
    isInterviewActive: false,
    connectionStatus: 'disconnected',
    error: null,
    room: null,
    aiParticipant: null,
    transcript: [],
    isLoading: false,
    currentQuestion: null,
    sessionId: null,
  });

  /**
   * Initialize interview session and connect to LiveKit room
   */
  const initializeSession = useCallback(async (settings: InterviewSettings): Promise<void> => {
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    setState(prev => ({ ...prev, isLoading: true, error: null, connectionStatus: 'connecting' }));

    try {
      // 1. Get LiveKit token from backend
            const response = await fetch(`/api/interviews/livekit/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await currentUser.getIdToken()}`
        },
        body: JSON.stringify({
          userId: currentUser.uid,
          settings: settings
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get LiveKit token');
      }

      const { token, roomName, sessionId } = await response.json();

      // 2. Connect to LiveKit room
      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
        publishDefaults: {
          audioPreset: {
            maxBitrate: 64000,
          },
        },
      });

      // Set up room event listeners
      room.on(RoomEvent.Connected, () => {
        setState(prev => ({ 
          ...prev, 
          isConnected: true, 
          connectionStatus: 'connected',
          room,
          sessionId
        }));
      });

      room.on(RoomEvent.ParticipantConnected, (participant: RemoteParticipant) => {
        if (participant.identity.startsWith('ai_bot_')) {
          setState(prev => ({ 
            ...prev, 
            aiParticipant: participant,
            connectionStatus: 'interview_started'
          }));
          
          // Subscribe to AI participant's audio track
          participant.audioTrackPublications.forEach((publication) => {
            if (publication.track) {
              const audioElement = publication.track.attach();
              document.body.appendChild(audioElement);
            }
          });
        }
      });

      room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
        if (track.kind === Track.Kind.Audio && participant.identity.startsWith('ai_bot_')) {
          // Handle AI voice playback
          const audioElement = track.attach();
          audioElement.play();
        }
      });

      room.on(RoomEvent.DataReceived, (payload: Uint8Array, participant?: RemoteParticipant) => {
        if (participant?.identity.startsWith('ai_bot_')) {
          try {
            const message = JSON.parse(new TextDecoder().decode(payload));
            
            if (message.type === 'transcript') {
              setState(prev => ({
                ...prev,
                transcript: [...prev.transcript, {
                  speaker: message.speaker,
                  text: message.text,
                  timestamp: new Date().toISOString()
                }]
              }));
            }
            
            if (message.type === 'question') {
              setState(prev => ({
                ...prev,
                currentQuestion: message.text
              }));
            }
          } catch (error) {
            console.error('Failed to parse data message:', error);
          }
        }
      });

      room.on(RoomEvent.Disconnected, () => {
        setState(prev => ({ 
          ...prev, 
          isConnected: false, 
          connectionStatus: 'disconnected',
          room: null,
          aiParticipant: null
        }));
      });

      // Connect to room
      await room.connect(LIVEKIT_URL, token);
      roomRef.current = room;

      setState(prev => ({ ...prev, isLoading: false }));

    } catch (error) {
      console.error('Failed to initialize session:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to initialize session',
        isLoading: false,
        connectionStatus: 'error'
      }));
      throw error;
    }
  }, [currentUser]);

  /**
   * Start the interview by enabling microphone and notifying backend
   */
  const startInterview = useCallback(async (): Promise<void> => {
    if (!roomRef.current || !state.sessionId) {
      throw new Error('Session not initialized');
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Enable microphone
      await roomRef.current.localParticipant.enableCameraAndMicrophone(false, true);
      
      // Notify backend to start interview
            const response = await fetch(`/api/interviews/livekit/interview/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await currentUser?.getIdToken()}`
        },
        body: JSON.stringify({
          sessionId: state.sessionId
        })
      });

      if (!response.ok) {
        throw new Error('Failed to start interview');
      }

      setState(prev => ({
        ...prev,
        isInterviewActive: true,
        isLoading: false,
        transcript: [] // Clear previous transcript
      }));

    } catch (error) {
      console.error('Failed to start interview:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to start interview',
        isLoading: false
      }));
      throw error;
    }
  }, [currentUser, state.sessionId]);

  /**
   * Send text message to AI participant
   */
  const sendTextMessage = useCallback(async (message: string): Promise<void> => {
    if (!roomRef.current) {
      throw new Error('Room not connected');
    }

    try {
      const data = JSON.stringify({
        type: 'user_response',
        text: message,
        timestamp: new Date().toISOString()
      });

      await roomRef.current.localParticipant.publishData(
        new TextEncoder().encode(data),
        DataPacket_Kind.RELIABLE
      );

      // Add to local transcript
      setState(prev => ({
        ...prev,
        transcript: [...prev.transcript, {
          speaker: 'user',
          text: message,
          timestamp: new Date().toISOString()
        }]
      }));

    } catch (error) {
      console.error('Failed to send text message:', error);
      throw error;
    }
  }, []);

  /**
   * End the interview and get results
   */
  const endInterview = useCallback(async (): Promise<MockInterviewSession | null> => {
    if (!roomRef.current || !state.sessionId) {
      return null;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Notify backend to end interview
            const response = await fetch(`/api/interviews/livekit/room/${roomRef.current.name}/end`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await currentUser?.getIdToken()}`
        }
      });

      let sessionResults: MockInterviewSession | null = null;

      if (response.ok) {
        sessionResults = await response.json();
      }

      // Disconnect from room
      await roomRef.current.disconnect();

      setState(prev => ({
        ...prev,
        isInterviewActive: false,
        isConnected: false,
        connectionStatus: 'interview_ended',
        isLoading: false
      }));

      return sessionResults;

    } catch (error) {
      console.error('Failed to end interview:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to end interview',
        isLoading: false
      }));
      return null;
    }
  }, [currentUser, state.sessionId]);

  /**
   * Cleanup resources
   */
  const cleanup = useCallback(() => {
    if (roomRef.current) {
      roomRef.current.disconnect();
      roomRef.current = null;
    }

    setState({
      isConnected: false,
      isInterviewActive: false,
      connectionStatus: 'disconnected',
      error: null,
      room: null,
      aiParticipant: null,
      transcript: [],
      isLoading: false,
      currentQuestion: null,
      sessionId: null,
    });
  }, []);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    // State
    ...state,
    
    // Actions
    initializeSession,
    startInterview,
    endInterview,
    sendTextMessage,
    cleanup,
  };
}
