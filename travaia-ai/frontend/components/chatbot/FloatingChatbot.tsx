import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import ChatbotService, { ChatMessage } from '../../services/chatbotService';
import { LoadingState } from '../design-system';
import styles from './FloatingChatbot.module.css';
import { GlassCard, GlassButton } from '../design-system';
import { useLiveKitInterview } from '../../hooks/useLiveKitInterview';
import { LocalAudioTrack, Track } from 'livekit-client';
import { InterviewDifficulty, InterviewType, InterviewMode, AIVoiceStyle } from '../../types';

interface FloatingChatbotProps {
  className?: string;
}

type ChatMode = 'text' | 'voice';

const FloatingChatbot: React.FC<FloatingChatbotProps> = ({ className = '' }) => {
  const { t } = useTranslation();
  const { currentUser, firebaseUser } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isBackendReady, setIsBackendReady] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [chatMode, setChatMode] = useState<ChatMode>('text');
  const [liveKitMuted, setLiveKitMuted] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatbotService = ChatbotService.getInstance();

  // LiveKit hook for voice mode
  const {
    isConnected: isLiveKitConnected,
    connectionStatus,
    initializeSession,
    sendTextMessage: sendLiveKitMessage,
    transcript: liveKitTranscript,
    cleanup: cleanupLiveKit,
    room,
  } = useLiveKitInterview();

  const isLiveKitConnecting = connectionStatus === 'connecting';

  // Check backend health on component mount
  useEffect(() => {
    const checkBackend = async () => {
      setIsInitializing(true);
      try {
        const isHealthy = await chatbotService.checkBackendHealth();
        setIsBackendReady(isHealthy);
        if (!isHealthy) {
          setConnectionError(t('chatbot.backendNotAvailable') || 'Research assistant is not available');
        }
      } catch (error) {
        setIsBackendReady(false);
        setConnectionError(t('chatbot.connectionError') || 'Failed to connect to research assistant');
      } finally {
        setIsInitializing(false);
      }
    };

    checkBackend();
  }, [t]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initialize session when chatbot opens
  useEffect(() => {
    if (isOpen && currentUser && isBackendReady && messages.length === 0) {
      initializeChat();
    }
  }, [isOpen, currentUser, isBackendReady]);

  // Handle LiveKit transcript updates
  useEffect(() => {
    if (liveKitTranscript && liveKitTranscript.length > 0 && chatMode === 'voice') {
      const latestTranscript = liveKitTranscript[liveKitTranscript.length - 1];
      if (latestTranscript && !messages.find(msg => msg.id === `livekit_${latestTranscript.timestamp}`)) {
        const transcriptMessage: ChatMessage = {
          id: `livekit_${latestTranscript.timestamp}`,
          sender: latestTranscript.speaker === 'user' ? 'user' : 'assistant',
          content: latestTranscript.text,
          timestamp: latestTranscript.timestamp instanceof Date ? latestTranscript.timestamp : new Date(latestTranscript.timestamp.toString()),
          agent: latestTranscript.speaker === 'user' ? undefined : 'Alera Voice'
        };
        setMessages(prev => [...prev, transcriptMessage]);
      }
    }
  }, [liveKitTranscript, chatMode, currentUser, messages]);

  // Handle LiveKit connection errors
  useEffect(() => {
    if (connectionStatus === 'error' && chatMode === 'voice') {
      setConnectionError(t('chatbot.connectionError'));
    }
  }, [connectionStatus, chatMode, t]);

  const initializeChat = async () => {
    if (!currentUser) return;

    try {
      const session = await chatbotService.getCurrentSession(currentUser.uid);
      setMessages(session.messages);
      
      // Add welcome message if no messages exist
      if (session.messages.length === 0) {
        const welcomeMessage: ChatMessage = {
          id: 'welcome',
          sender: 'assistant',
          content: t('chatbot.welcomeMessage'),
          timestamp: new Date(),
          agent: 'Alera AI Coach'
        };
        setMessages([welcomeMessage]);
      }
    } catch (error) {
      console.error('Failed to initialize chat:', error);
      setConnectionError(t('chatbot.initializationError') || 'Failed to initialize chat session');
    }
  };

  const handleSendMessage = useCallback(async () => {
    if (!inputMessage.trim() || !currentUser || isLoading || !isBackendReady) return;

    const messageText = inputMessage.trim();
    setInputMessage('');
    setIsLoading(true);
    setConnectionError(null);

    try {
      if (chatMode === 'voice' && isLiveKitConnected) {
        // Send message via LiveKit data channel
        await sendLiveKitMessage(messageText);
        
        // Add user message to UI immediately
        const userMessage: ChatMessage = {
          id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          sender: 'user',
          content: messageText,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, userMessage]);
        setIsLoading(false);
      } else {
        // Get auth token from Firebase user
        const authToken = firebaseUser ? await firebaseUser.getIdToken() : undefined;
        
        // Use traditional text-based chatbot service
        await chatbotService.sendMessage(
          messageText,
          currentUser.uid,
          // onMessageUpdate callback
          (messageId: string, content: string, agent?: string) => {
            setMessages(prev => prev.map(msg => 
              msg.id === messageId 
                ? { ...msg, content, agent, isStreaming: true }
                : msg
            ));
          },
          // onComplete callback
          () => {
            setIsLoading(false);
            setMessages(prev => prev.map(msg => 
              msg.isStreaming 
                ? { ...msg, isStreaming: false }
                : msg
            ));
          },
          // onError callback
          (error: string) => {
            setIsLoading(false);
            setConnectionError(error);
          },
          authToken
        );

        // Update messages from service
        const currentMessages = chatbotService.getCurrentMessages();
        setMessages([...currentMessages]);
      }
    } catch (error) {
      setIsLoading(false);
      setConnectionError(error instanceof Error ? error.message : 'Unknown error occurred');
    }
  }, [inputMessage, currentUser, isLoading, isBackendReady, chatMode, isLiveKitConnected, sendLiveKitMessage]);

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const toggleChatbot = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setConnectionError(null);
    }
  };

  const clearChat = () => {
    chatbotService.clearSession();
    setMessages([]);
    if (chatMode === 'voice' && isLiveKitConnected) {
      cleanupLiveKit();
    }
    initializeChat();
  };

  const toggleChatMode = async () => {
    const newMode = chatMode === 'text' ? 'voice' : 'text';
    setChatMode(newMode);
    
    if (newMode === 'voice') {
      if (!isLiveKitConnected && !isLiveKitConnecting) {
        try {
          await initializeSession({
            jobRole: 'Career Coaching',
            companyName: 'TRAVAIA',
            difficulty: InterviewDifficulty.MODERATE,
            interviewType: InterviewType.BEHAVIORAL,
            interviewMode: InterviewMode.AUDIO,
            language: 'en',
            voiceStyle: AIVoiceStyle.PROFESSIONAL
          });
        } catch (error) {
          setConnectionError(t('chatbot.connectionError'));
          setChatMode('text');
        }
      }
    } else {
      if (isLiveKitConnected) {
        cleanupLiveKit();
      }
    }
  };

  // Toggle voice input (mute/unmute)
  const toggleVoiceInput = useCallback(() => {
    if (chatMode === 'voice' && isLiveKitConnected && room) {
      const audioTrack = room.localParticipant.getTrackPublication(Track.Source.Microphone)?.track as LocalAudioTrack;
      if (audioTrack) {
        if (liveKitMuted) {
          audioTrack.unmute();
        } else {
          audioTrack.mute();
        }
        setLiveKitMuted(!liveKitMuted);
      }
    }
  }, [chatMode, isLiveKitConnected, room, liveKitMuted]);

  const formatMessageContent = (content: string) => {
    // Basic markdown-like formatting for links
    return content.replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-500 hover:text-blue-700 underline">$1</a>'
    );
  };

  return (
    <>
      {/* Floating Chat Button */}
      <div className={`${styles.floatingButton} ${className}`}>
        <GlassButton
          onClick={toggleChatbot}
          className={`${styles.chatButton} ${isOpen ? styles.chatButtonOpen : ''}`}
          aria-label={t('chatbot.toggleChat') || 'Toggle AI Assistant'}
        >
          {isOpen ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          )}
          {!isBackendReady && (
            <div className={styles.statusIndicator}>
              <div className={styles.statusDot}></div>
            </div>
          )}
        </GlassButton>
      </div>

      {/* Chat Interface */}
      {isOpen && (
        <div className={styles.chatContainer}>
          <GlassCard className={styles.chatCard}>
            {/* Chat Header */}
            <div className={styles.chatHeader}>
              <div className="flex items-center">
                <div className={`w-3 h-3 rounded-full mr-2 ${
                  chatMode === 'voice' && isLiveKitConnected ? 'bg-blue-500' :
                  chatMode === 'voice' && isLiveKitConnecting ? 'bg-yellow-500' :
                  'bg-green-500'
                }`}></div>
                <h3 className="font-semibold text-gray-800 dark:text-gray-200">
                  {t('chatbot.title')}
                  <span className="text-xs ml-2 text-gray-500 dark:text-gray-400">
                    {chatMode === 'voice' ? t('chatbot.voiceMode') : t('chatbot.textMode')}
                  </span>
                </h3>
              </div>
              <div className="flex items-center space-x-2">
                {/* Mode Toggle */}
                <GlassButton
                  onClick={toggleChatMode}
                  className={`p-1 ${
                    chatMode === 'voice' 
                      ? 'text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200'
                      : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                  }`}
                  aria-label={chatMode === 'voice' ? t('chatbot.switchToTextMode') : t('chatbot.switchToVoiceMode')}
                  disabled={isLiveKitConnecting}
                >
                  {chatMode === 'voice' ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  )}
                </GlassButton>
                
                {/* Voice Controls */}
                {chatMode === 'voice' && isLiveKitConnected && (
                  <GlassButton
                    onClick={toggleVoiceInput}
                    className={`p-1 ${
                      liveKitMuted 
                        ? 'text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200'
                        : 'text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-200'
                    }`}
                    aria-label={liveKitMuted ? t('chatbot.unmuteVoice') : t('chatbot.muteVoice')}
                  >
                    {liveKitMuted ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 5.586l12.828 12.828M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                      </svg>
                    )}
                  </GlassButton>
                )}
                
                <GlassButton
                  onClick={clearChat}
                  className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  aria-label={t('chatbot.clearChat')}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </GlassButton>
                <GlassButton
                  onClick={toggleChatbot}
                  className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  aria-label={t('common.close')}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </GlassButton>
              </div>
            </div>

            {/* Connection Status */}
            {(isInitializing || connectionError || !isBackendReady || isLiveKitConnecting) && (
              <div className={styles.statusBar}>
                {isInitializing && (
                  <div className="flex items-center text-blue-600 dark:text-blue-400">
                    <LoadingState size="sm" className="mr-2" />
                    {t('chatbot.connecting')}
                  </div>
                )}
                {isLiveKitConnecting && chatMode === 'voice' && (
                  <div className="flex items-center text-blue-600 dark:text-blue-400">
                    <LoadingState size="sm" className="mr-2" />
                    {t('chatbot.connectingVoice')}
                  </div>
                )}
                {connectionError && (
                  <div className="text-red-600 dark:text-red-400 text-sm">
                    ⚠️ {connectionError}
                    {chatMode === 'voice' && (
                      <button 
                        onClick={() => setChatMode('text')}
                        className="ml-2 underline hover:no-underline"
                      >
                        {t('chatbot.switchToTextMode')}
                      </button>
                    )}
                  </div>
                )}
                {!isBackendReady && !isInitializing && !connectionError && (
                  <div className="text-yellow-600 dark:text-yellow-400 text-sm">
                    🔄 {t('chatbot.reconnecting')}
                  </div>
                )}
                {chatMode === 'voice' && isLiveKitConnected && (
                  <div className="text-green-600 dark:text-green-400 text-sm">
                    🎤 {t('chatbot.voiceActive')} - {liveKitMuted ? t('chatbot.voiceMuted') : t('chatbot.voiceListening')}
                  </div>
                )}
              </div>
            )}

            {/* Messages Area */}
            <div className={styles.messagesContainer}>
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`${styles.message} ${
                    message.sender === 'user' ? styles.userMessage : styles.aiMessage
                  }`}
                >
                  {message.sender === 'assistant' && (
                    <div className={styles.messageHeader}>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {message.agent || 'AI Assistant'}
                        {message.isStreaming && (
                          <span className={styles.streamingIndicator}>
                            <LoadingState size="sm" className="ml-1" />
                          </span>
                        )}
                      </span>
                    </div>
                  )}
                  <div
                    className={styles.messageContent}
                    dangerouslySetInnerHTML={{
                      __html: formatMessageContent(message.content)
                    }}
                  />
                  <div className={styles.messageTime}>
                    {message.timestamp.toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className={styles.inputContainer}>
              <div className="flex space-x-2">
                <input
                  id="chatbot-input"
                  name="chatbot-input"
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder={
                    chatMode === 'voice' && isLiveKitConnected
                      ? t('chatbot.voicePlaceholder')
                      : t('chatbot.inputPlaceholder')
                  }
                  disabled={isLoading || (!isBackendReady && chatMode === 'text') || (chatMode === 'voice' && !isLiveKitConnected)}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                <GlassButton
                  onClick={handleSendMessage}
                  disabled={
                    !inputMessage.trim() || 
                    isLoading || 
                    (chatMode === 'text' && !isBackendReady) ||
                    (chatMode === 'voice' && !isLiveKitConnected)
                  }
                  className={styles.sendButton}
                  aria-label={t('chatbot.sendMessage')}
                >
                  {isLoading ? (
                    <LoadingState size="sm" />
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  )}
                </GlassButton>
              </div>
              
              {/* Voice Mode Instructions */}
              {chatMode === 'voice' && isLiveKitConnected && (
                <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 text-center">
                  {liveKitMuted 
                    ? `🔇 ${t('chatbot.voiceMutedInstructions')}`
                    : `🎤 ${t('chatbot.voiceInstructions')}`
                  }
                </div>
              )}
            </div>
          </GlassCard>
        </div>
      )}
    </>
  );
};

export default FloatingChatbot;
