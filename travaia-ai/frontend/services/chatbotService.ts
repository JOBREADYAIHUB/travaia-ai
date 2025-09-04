// Chatbot Service - For the floating chatbot component
// This is separate from the analyticsAIService which is used for the AnalyticsPage

export interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
  agent?: string;
  isStreaming?: boolean;
}

export interface ChatSession {
  id: string;
  userId: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * ChatbotService for the floating chatbot component
 * This handles the chat UI functionality and backend communication
 */
class ChatbotService {
  private static instance: ChatbotService;
  private baseUrl: string;
  private appName: string;
  private currentMessages: ChatMessage[] = [];
  private lastHealthCheck: number = 0;
  private healthCheckCache: boolean = true;
  private readonly HEALTH_CHECK_CACHE_DURATION = 30000; // 30 seconds

  private constructor() {
    this.baseUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
    this.appName = 'travaia-career-assistant';
  }

  static getInstance(): ChatbotService {
    if (!ChatbotService.instance) {
      ChatbotService.instance = new ChatbotService();
    }
    return ChatbotService.instance;
  }

  /**
   * Get authentication token for API requests
   */
  private async getAuthToken(): Promise<string> {
    // This will be handled by the UI components passing the token
    // For now, return empty string as auth may be handled by proxy
    return '';
  }

  /**
   * Initialize a new chat session with the chatbot agent
   */
  async initializeSession(userId: string, authToken?: string): Promise<string> {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }
      
      // Create session with chatbot agent specifically
      const response = await fetch(`/api/apps/chatbot/users/${userId}/sessions`, {
        method: 'POST',
        headers,
      });

      if (!response.ok) {
        throw new Error(`Failed to create chatbot session: ${response.status}`);
      }

      const data = await response.json();
      return data.id;
    } catch (error) {
      console.error('Failed to initialize chatbot session:', error);
      throw error;
    }
  }

  /**
   * Send a message to the chatbot
   */
  async sendMessage(
    message: string,
    userId: string,
    onMessage: (messageId: string, content: string, agent?: string) => void,
    onComplete: () => void,
    onError: (error: string) => void,
    authToken?: string,
    sessionId?: string
  ): Promise<void> {
    try {
      // Add user message to internal state
      const userMessage: ChatMessage = {
        id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        sender: 'user',
        content: message,
        timestamp: new Date()
      };
      this.currentMessages.push(userMessage);

      // Connect to ai-service chatbot agent
      const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Create AI response message
      const aiMessage: ChatMessage = {
        id: messageId,
        sender: 'assistant',
        content: '',
        timestamp: new Date(),
        agent: 'Alera AI Coach',
        isStreaming: true
      };
      this.currentMessages.push(aiMessage);
      
      try {
        if (!userId) {
          throw new Error('User ID is required');
        }

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };

        if (authToken) {
          headers['Authorization'] = `Bearer ${authToken}`;
        }
        
        // Call ai-service run_sse endpoint (same as demoUI)
        const response = await fetch('/api/run_sse', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            appName: 'chatbot',
            userId: userId,
            sessionId: sessionId || `session_${userId}_${Date.now()}`,
            newMessage: {
              parts: [{ text: message }],
              role: "user",
            },
            streaming: false,
          })
        });

        if (response.ok) {
          const reader = response.body?.getReader();
          if (!reader) {
            throw new Error('No response body reader available');
          }

          const decoder = new TextDecoder();
          let fullResponse = '';

          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              const chunk = decoder.decode(value, { stream: true });
              const lines = chunk.split('\n');

              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  const data = line.slice(6);
                  if (data === '[DONE]') {
                    break;
                  }
                  try {
                    const parsed = JSON.parse(data);
                    console.log('[CHATBOT SSE PARSED EVENT]:', JSON.stringify(parsed, null, 2));
                    
                    // Extract text content like demoUI
                    if (parsed.content && parsed.content.parts) {
                      const textParts = parsed.content.parts
                        .filter((part: any) => part.text)
                        .map((part: any) => part.text);
                      
                      if (textParts.length > 0) {
                        fullResponse += textParts.join('');
                        onMessage(messageId, fullResponse, 'Alera AI Coach');
                      }
                    } else if (parsed.content && typeof parsed.content === 'string') {
                      // Fallback for simple string content
                      fullResponse += parsed.content;
                      onMessage(messageId, fullResponse, 'Alera AI Coach');
                    }
                  } catch (e) {
                    console.error('Error parsing SSE data:', e, 'Raw data:', data);
                  }
                }
              }
            }
          } finally {
            reader.releaseLock();
          }

          // Update the AI message in internal state
          const messageIndex = this.currentMessages.findIndex(msg => msg.id === messageId);
          if (messageIndex !== -1) {
            this.currentMessages[messageIndex] = {
              ...this.currentMessages[messageIndex],
              content: fullResponse,
              isStreaming: false
            };
          }
          
          onComplete();
        } else {
          throw new Error(`AI service responded with status: ${response.status}`);
        }
      } catch (serviceError) {
        console.warn('AI service unavailable, using fallback:', serviceError);
        
        // Fallback response when service is unavailable
        const fallbackResponse = `Hello! I'm Alera, your AI career coach. I'm currently running in limited mode as the AI service is unavailable. I can still help with basic career questions, but for comprehensive coaching including personalized insights, please try again later when the service is fully available.`;
        
        // Update the AI message in internal state
        const messageIndex = this.currentMessages.findIndex(msg => msg.id === messageId);
        if (messageIndex !== -1) {
          this.currentMessages[messageIndex] = {
            ...this.currentMessages[messageIndex],
            content: fallbackResponse,
            isStreaming: false
          };
        }
        
        onMessage(messageId, fallbackResponse, 'Alera (Limited)');
        onComplete();
      }

    } catch (error) {
      console.error('Failed to send message:', error);
      onError('Failed to send message. Please try again.');
    }
  }

  /**
   * Clear chat history
   */
  async clearChat(userId: string, sessionId: string): Promise<void> {
    try {
      // Clear internal message state
      this.currentMessages = [];
      
      // In production, this would clear the chat history on the backend
      console.log('Chat cleared for user:', userId, 'session:', sessionId);
    } catch (error) {
      console.error('Failed to clear chat:', error);
      throw error;
    }
  }

  /**
   * Get current session for a user
   */
  async getCurrentSession(userId: string): Promise<ChatSession> {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      // In production, this would fetch the current session from the backend
      // For now, create a default session structure
      const sessionId = `session_${userId}_${Date.now()}`;
      
      const session: ChatSession = {
        id: sessionId,
        userId: userId,
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      return session;
    } catch (error) {
      console.error('Failed to get current session:', error);
      throw error;
    }
  }

  /**
   * Get chat history
   */
  async getChatHistory(userId: string, sessionId: string): Promise<ChatMessage[]> {
    try {
      // In production, this would fetch chat history from the backend
      return [];
    } catch (error) {
      console.error('Failed to get chat history:', error);
      return [];
    }
  }

  /**
   * Get current messages from the active session
   */
  getCurrentMessages(): ChatMessage[] {
    return [...this.currentMessages];
  }

  /**
   * Clear session messages
   */
  clearSession(): void {
    this.currentMessages = [];
  }

  /**
   * Check backend health status with caching and improved error handling
   */
  async checkBackendHealth(): Promise<boolean> {
    const now = Date.now();
    
    // Return cached result if within cache duration
    if (now - this.lastHealthCheck < this.HEALTH_CHECK_CACHE_DURATION) {
      return this.healthCheckCache;
    }
    
    try {
      // Check ai-service health (same as demoUI)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout
      
      const response = await fetch('/api/docs', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      this.healthCheckCache = response.ok;
      this.lastHealthCheck = now;
      return response.ok;
    } catch (error) {
      // Update cache and timestamp even on error to prevent repeated attempts
      this.healthCheckCache = true; // Allow fallback mode
      this.lastHealthCheck = now;
      
      // Silently handle connection errors to avoid console spam
      if (error instanceof Error && error.name === 'AbortError') {
        console.warn('ChatbotService: AI service health check timed out - using fallback mode');
      } else if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        console.warn('ChatbotService: AI service not available - using fallback mode');
      } else {
        console.error('ChatbotService: AI service health check failed:', error);
      }
      
      // Return true to allow chatbot to function in fallback mode
      return true;
    }
  }
}

export default ChatbotService;
