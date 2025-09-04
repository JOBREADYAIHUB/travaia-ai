import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useLocalization } from '../../contexts/LocalizationContext';
import ChatbotService, { ChatMessage } from '../../services/chatbotService';
import { LoadingState } from '../design-system';
import styles from './SimpleChatbot.module.css';
import { GlassCard, GlassButton } from '../design-system';

interface SimpleChatbotProps {
  className?: string;
}

const SimpleChatbot: React.FC<SimpleChatbotProps> = ({ className = '' }) => {
  const { t } = useTranslation();
  const { language } = useLocalization();
  const { currentUser, firebaseUser } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isBackendReady, setIsBackendReady] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatbotService = ChatbotService.getInstance();
  

  // Check backend health on component mount
  useEffect(() => {
    const checkBackend = async () => {
      try {
        const isHealthy = await chatbotService.checkBackendHealth();
        setIsBackendReady(isHealthy);
        if (!isHealthy) {
          setConnectionError(t('chatbot.backendNotAvailable') || 'Research assistant is not available');
        }
      } catch (error) {
        setIsBackendReady(false);
        setConnectionError(t('chatbot.connectionError') || 'Failed to connect to research assistant');
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

  const initializeChat = async () => {
    if (!currentUser) return;

    try {
      // Get Firebase auth token like demoUI
      if (!firebaseUser) {
        throw new Error('Firebase user not available');
      }
      
      const idToken = await firebaseUser.getIdToken();
      
      // Initialize a new session
      const newSessionId = await chatbotService.initializeSession(currentUser.uid, idToken);
      setSessionId(newSessionId);
      
      // Get existing chat history
      const chatHistory = await chatbotService.getChatHistory(currentUser.uid, newSessionId);
      setMessages(chatHistory);
      
      // Add welcome message if no messages exist
      if (chatHistory.length === 0) {
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
      setConnectionError(t('chatbot.initializationError'));
    }
  };

  const handleSendMessage = useCallback(async () => {
    if (!inputMessage.trim() || !currentUser || isLoading || !isBackendReady) return;

    const messageText = inputMessage.trim();
    setInputMessage('');
    setIsLoading(true);
    setConnectionError(null);

    // Add user message immediately
    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      sender: 'user',
      content: messageText,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      // Get Firebase auth token for sending message
      const authToken = firebaseUser ? await firebaseUser.getIdToken() : undefined;
      
      await chatbotService.sendMessage(
        messageText,
        currentUser.uid,
        // onMessageUpdate callback
        (messageId: string, content: string) => {
          setMessages(prev => {
            const existingMsg = prev.find(msg => msg.id === messageId);
            if (existingMsg) {
              return prev.map(msg => 
                msg.id === messageId 
                  ? { ...msg, content }
                  : msg
              );
            } else {
              // Add new assistant message
              const assistantMessage: ChatMessage = {
                id: messageId,
                sender: 'assistant',
                content: content,
                timestamp: new Date()
              };
              return [...prev, assistantMessage];
            }
          });
        },
        // onComplete callback
        () => {
          setIsLoading(false);
        },
        // onError callback
        (error: string) => {
          setIsLoading(false);
          setConnectionError(error);
        },
        authToken,
        sessionId || undefined
      );

    } catch (error) {
      setIsLoading(false);
      setConnectionError(error instanceof Error ? error.message : 'Unknown error occurred');
    }
  }, [inputMessage, currentUser, isLoading, isBackendReady]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
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

  const clearChat = async () => {
    if (!currentUser || !sessionId) return;
    
    try {
      await chatbotService.clearChat(currentUser.uid, sessionId);
      setMessages([]);
      initializeChat();
    } catch (error) {
      console.error('Failed to clear chat:', error);
      setConnectionError(t('chatbot.clearError') || 'Failed to clear chat session');
    }
  };

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
        <button
          onClick={toggleChatbot}
          className={`${styles.chatButton} ${isOpen ? styles.chatButtonOpen : ''}`}
          aria-label={t('chatbot.toggleChat') || 'Toggle CareerGPT'}
          title={t('chatbot.toggleChat') || 'Toggle CareerGPT'}
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
        </button>
      </div>

      {/* Chat Interface */}
      {isOpen && (
        <div className={styles.chatContainer}>
          <div className={styles.chatCard}>
            {/* Chat Header */}
            <div className={styles.chatHeader}>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                <h3 className="font-semibold text-gray-800 dark:text-gray-200">
                  {t('chatbot.title')}
                </h3>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={clearChat}
                  className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded"
                  aria-label={t('chatbot.clearChat')}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Connection Status */}
            {(connectionError || !isBackendReady) && (
              <div className={styles.statusBar}>
                {connectionError && (
                  <div className="text-red-600 dark:text-red-400 text-sm">
                    ⚠️ {connectionError}
                  </div>
                )}
                {!isBackendReady && !connectionError && (
                  <div className="text-yellow-600 dark:text-yellow-400 text-sm">
                    {t('chatbot.connecting')}
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
                  id="chatbot-message-input"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder={t('chatbot.inputPlaceholder')}
                  disabled={isLoading || !isBackendReady}
                  className={styles.messageInput}
                  aria-label={t('chatbot.inputPlaceholder')}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim() || isLoading || !isBackendReady}
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
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SimpleChatbot;
