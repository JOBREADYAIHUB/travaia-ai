// components/job-tracker/EnhancedAIInsights.tsx - Interactive AI Insights with Gemini
import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { JobApplication } from '../../types';
import { GlassCard, GlassButton } from '../design-system';
import { SparklesIcon, RefreshIcon, LightbulbIcon } from '../icons/Icons';
import { llmService, generateAIInsights, generateTaskSuggestions, LLMStreamResponse } from '../../services/llmService';

interface EnhancedAIInsightsProps {
  application: JobApplication;
  userProfile?: {
    name?: string;
    experience?: string;
    skills?: string[];
    careerGoals?: string;
  };
}

interface AIMessage {
  id: string;
  type: 'insight' | 'suggestion' | 'chat';
  content: string;
  isStreaming: boolean;
  timestamp: Date;
  isComplete: boolean;
}

const EnhancedAIInsights: React.FC<EnhancedAIInsightsProps> = ({
  application,
  userProfile,
}) => {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [isChatMode, setIsChatMode] = useState(false);
  const [sessionId] = useState(() => `session_${application.id}_${Date.now()}`);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initialize with AI insights on component mount
  useEffect(() => {
    if (llmService.isAvailable() && messages.length === 0) {
      generateInitialInsights();
    }
  }, [application.id]);

  const generateInitialInsights = async () => {
    if (!llmService.isAvailable()) {
      addFallbackMessage();
      return;
    }

    setIsGenerating(true);
    const messageId = `insight_${Date.now()}`;
    
    // Add streaming message placeholder
    const streamingMessage: AIMessage = {
      id: messageId,
      type: 'insight',
      content: '',
      isStreaming: true,
      timestamp: new Date(),
      isComplete: false,
    };
    
    setMessages([streamingMessage]);

    const streamCallbacks: LLMStreamResponse = {
      onChunk: (chunk: string) => {
        setMessages(prev => prev.map(msg => 
          msg.id === messageId 
            ? { ...msg, content: msg.content + chunk }
            : msg
        ));
      },
      onComplete: (fullResponse: string) => {
        setMessages(prev => prev.map(msg => 
          msg.id === messageId 
            ? { ...msg, content: fullResponse, isStreaming: false, isComplete: true }
            : msg
        ));
        setIsGenerating(false);
      },
      onError: (error: string) => {
        setMessages(prev => prev.map(msg => 
          msg.id === messageId 
            ? { ...msg, content: `Error: ${error}`, isStreaming: false, isComplete: true }
            : msg
        ));
        setIsGenerating(false);
      },
    };

    try {
      await generateAIInsights(application, userProfile);
      // The streaming is handled by callbacks above
    } catch (error) {
      streamCallbacks.onError('Failed to generate AI insights');
    }
  };

  const generateTaskSuggestionsAI = async () => {
    if (!llmService.isAvailable()) return;

    setIsGenerating(true);
    const messageId = `suggestion_${Date.now()}`;
    
    const streamingMessage: AIMessage = {
      id: messageId,
      type: 'suggestion',
      content: '',
      isStreaming: true,
      timestamp: new Date(),
      isComplete: false,
    };
    
    setMessages(prev => [...prev, streamingMessage]);

    try {
      const response = await generateTaskSuggestions(application, userProfile);
      
      setMessages(prev => prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, content: response.content, isStreaming: false, isComplete: true }
          : msg
      ));
    } catch (error) {
      setMessages(prev => prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, content: 'Failed to generate task suggestions', isStreaming: false, isComplete: true }
          : msg
      ));
    }
    
    setIsGenerating(false);
  };

  const startChatMode = async () => {
    if (!llmService.isAvailable()) return;

    setIsChatMode(true);
    
    // Initialize chat session with context
    try {
      await llmService.startChatSession(sessionId, { application, userProfile });
      
      // Add welcome message
      const welcomeMessage: AIMessage = {
        id: `chat_welcome_${Date.now()}`,
        type: 'chat',
        content: `Hi! I'm your AI career assistant. I've reviewed your application for ${application.role.title} at ${application.company.name}. What would you like to discuss about this opportunity?`,
        isStreaming: false,
        timestamp: new Date(),
        isComplete: true,
      };
      
      setMessages(prev => [...prev, welcomeMessage]);
    } catch (error) {
      console.error('Failed to start chat session:', error);
    }
  };

  const sendChatMessage = async () => {
    if (!chatInput.trim() || !llmService.isAvailable()) return;

    const userMessage: AIMessage = {
      id: `user_${Date.now()}`,
      type: 'chat',
      content: chatInput,
      isStreaming: false,
      timestamp: new Date(),
      isComplete: true,
    };

    const aiMessageId = `ai_${Date.now()}`;
    const aiMessage: AIMessage = {
      id: aiMessageId,
      type: 'chat',
      content: '',
      isStreaming: true,
      timestamp: new Date(),
      isComplete: false,
    };

    setMessages(prev => [...prev, userMessage, aiMessage]);
    setChatInput('');
    setIsGenerating(true);

    const streamCallbacks: LLMStreamResponse = {
      onChunk: (chunk: string) => {
        setMessages(prev => prev.map(msg => 
          msg.id === aiMessageId 
            ? { ...msg, content: msg.content + chunk }
            : msg
        ));
      },
      onComplete: (fullResponse: string) => {
        setMessages(prev => prev.map(msg => 
          msg.id === aiMessageId 
            ? { ...msg, content: fullResponse, isStreaming: false, isComplete: true }
            : msg
        ));
        setIsGenerating(false);
      },
      onError: (error: string) => {
        setMessages(prev => prev.map(msg => 
          msg.id === aiMessageId 
            ? { ...msg, content: `I apologize, but I encountered an error: ${error}`, isStreaming: false, isComplete: true }
            : msg
        ));
        setIsGenerating(false);
      },
    };

    try {
      await llmService.sendChatMessage(sessionId, userMessage.content, streamCallbacks);
    } catch (error) {
      streamCallbacks.onError('Failed to send message');
    }
  };

  const addFallbackMessage = () => {
    const fallbackMessage: AIMessage = {
      id: `fallback_${Date.now()}`,
      type: 'insight',
      content: t('aiInsights.fallbackMessage', 'AI insights are currently unavailable. Please check your configuration.'),
      isStreaming: false,
      timestamp: new Date(),
      isComplete: true,
    };
    setMessages([fallbackMessage]);
  };

  const refreshInsights = () => {
    setMessages([]);
    generateInitialInsights();
  };

  const getMessageIcon = (type: string) => {
    switch (type) {
      case 'insight':
        return <LightbulbIcon className="w-5 h-5 text-yellow-500" />;
      case 'suggestion':
        return <SparklesIcon className="w-5 h-5 text-purple-500" />;
      case 'chat':
        return <SparklesIcon className="w-5 h-5 text-blue-500" />;
      default:
        return <SparklesIcon className="w-5 h-5 text-gray-500" />;
    }
  };

  const getMessageTypeLabel = (type: string) => {
    switch (type) {
      case 'insight':
        return t('aiInsights.insights');
      case 'suggestion':
        return t('aiInsights.suggestions');
      case 'chat':
        return t('aiInsights.chat');
      default:
        return t('aiInsights.ai');
    }
  };

  return (
    <GlassCard className="p-6 bg-base_100 dark:bg-dark_card_bg border border-base_300 dark:border-neutral-700">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <SparklesIcon className="w-6 h-6 text-purple-500 mr-2" />
          <h3 className="text-xl font-semibold text-primary dark:text-blue-400">
            {t('aiInsights.enhancedTitle', 'AI Career Assistant')}
          </h3>
          {isGenerating && (
            <div className="ml-3 flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-500"></div>
              <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                {t('aiInsights.thinking', 'Thinking...')}
              </span>
            </div>
          )}
        </div>
        
        <div className="flex space-x-2">
          {!isChatMode && (
            <>
              <GlassButton
                variant="button"
                size="sm"
                onClick={generateTaskSuggestionsAI}
                disabled={isGenerating}
                className="flex items-center"
              >
                <SparklesIcon className="w-4 h-4 mr-1" />
                {t('aiInsights.suggestions', 'Suggestions')}
              </GlassButton>
              
              <GlassButton
                variant="button"
                size="sm"
                onClick={startChatMode}
                disabled={isGenerating}
                className="flex items-center"
              >
                <SparklesIcon className="w-4 h-4 mr-1" />
                {t('aiInsights.chat', 'Chat')}
              </GlassButton>
            </>
          )}
          
          <GlassButton
            variant="button"
            size="sm"
            onClick={refreshInsights}
            disabled={isGenerating}
            className="flex items-center"
          >
            <RefreshIcon className="w-4 h-4 mr-1" />
            {t('aiInsights.refresh', 'Refresh')}
          </GlassButton>
        </div>
      </div>

      {/* Messages Container */}
      <div className="space-y-4 max-h-96 overflow-y-auto">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`p-4 rounded-lg border transition-all duration-200 ${
              message.type === 'chat' && message.content.startsWith('Hi!')
                ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700'
                : 'bg-base_200 dark:bg-neutral-800 border-base_300 dark:border-neutral-600'
            }`}
          >
            <div className="flex items-start">
              <div className="flex-shrink-0 mr-3 mt-1">
                {getMessageIcon(message.type)}
              </div>
              <div className="flex-1">
                <div className="flex items-center mb-2">
                  <span className="text-sm font-medium text-neutral dark:text-gray-200">
                    {getMessageTypeLabel(message.type)}
                  </span>
                  <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                    {message.timestamp.toLocaleTimeString()}
                  </span>
                  {message.isStreaming && (
                    <div className="ml-2 flex items-center">
                      <div className="animate-pulse w-2 h-2 bg-purple-500 rounded-full"></div>
                      <span className="ml-1 text-xs text-purple-500">
                        {t('aiInsights.streaming', 'Streaming...')}
                      </span>
                    </div>
                  )}
                </div>
                <div className="text-neutral dark:text-gray-300 whitespace-pre-wrap">
                  {message.content}
                  {message.isStreaming && (
                    <span className="inline-block w-2 h-4 bg-purple-500 animate-pulse ml-1"></span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Chat Input */}
      {isChatMode && (
        <div className="mt-4 flex space-x-2">
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
            placeholder={t('aiInsights.chatPlaceholder', 'Ask me anything about this job application...')}
            className="flex-1 px-3 py-2 border border-base_300 dark:border-neutral-600 rounded-md bg-base_100 dark:bg-neutral-800 text-neutral dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
            disabled={isGenerating}
          />
          <GlassButton
            variant="button"
            size="sm"
            onClick={sendChatMessage}
            disabled={isGenerating || !chatInput.trim()}
          >
            {t('aiInsights.send', 'Send')}
          </GlassButton>
        </div>
      )}

      {/* Status Indicator */}
      {!llmService.isAvailable() && (
        <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-md">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            {t('aiInsights.configurationRequired', 'AI features require configuration. Please set up your Gemini API key.')}
          </p>
        </div>
      )}
    </GlassCard>
  );
};

export default EnhancedAIInsights;
