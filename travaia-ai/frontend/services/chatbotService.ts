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
   * Initialize a new chat session
   */
  async initializeSession(userId: string): Promise<string> {
    try {
      // For now, generate a simple session ID
      // In production, this would create a session with the backend
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      return sessionId;
    } catch (error) {
      console.error('Failed to initialize chat session:', error);
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
    onError: (error: string) => void
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

      // Try to connect to careergpt-coach-service
      const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Create AI response message
      const aiMessage: ChatMessage = {
        id: messageId,
        sender: 'assistant',
        content: '',
        timestamp: new Date(),
        agent: 'CareerGPT Coach',
        isStreaming: true
      };
      this.currentMessages.push(aiMessage);
      
      try {
        // Attempt to call careergpt-coach-service via proxy
        const response = await fetch('/api/coach/api/coaching/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_id: userId,
            message: message,
            context_type: 'general',
            include_voice: false
          })
        });

        if (response.ok) {
          const data = await response.json();
          const coachResponse = data.response || 'I received your message but couldn\'t generate a proper response.';
          
          // Update the AI message in internal state
          const messageIndex = this.currentMessages.findIndex(msg => msg.id === messageId);
          if (messageIndex !== -1) {
            this.currentMessages[messageIndex] = {
              ...this.currentMessages[messageIndex],
              content: coachResponse,
              isStreaming: false
            };
          }
          
          onMessage(messageId, coachResponse, 'CareerGPT Coach');
          onComplete();
        } else {
          throw new Error(`Coach service responded with status: ${response.status}`);
        }
      } catch (serviceError) {
        console.warn('CareerGPT Coach service unavailable, using fallback:', serviceError);
        
        // Fallback response when service is unavailable
        const fallbackResponse = `Hello! I'm CareerGPT, your AI career coach. I'm currently running in limited mode as the full coaching service is unavailable. I can still help with basic career questions, but for comprehensive coaching including personalized insights based on your profile, interview performance, and job applications, please try again later when the service is fully available.`;
        
        // Update the AI message in internal state
        const messageIndex = this.currentMessages.findIndex(msg => msg.id === messageId);
        if (messageIndex !== -1) {
          this.currentMessages[messageIndex] = {
            ...this.currentMessages[messageIndex],
            content: fallbackResponse,
            isStreaming: false
          };
        }
        
        onMessage(messageId, fallbackResponse, 'CareerGPT (Limited)');
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
      // Check careergpt-coach-service health
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout
      
      const response = await fetch('/api/coach/health', {
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
        console.warn('ChatbotService: CareerGPT Coach service health check timed out - using fallback mode');
      } else if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        console.warn('ChatbotService: CareerGPT Coach service not available - using fallback mode');
      } else {
        console.error('ChatbotService: CareerGPT Coach service health check failed:', error);
      }
      
      // Return true to allow chatbot to function in fallback mode
      return true;
    }
  }
}

export default ChatbotService;
