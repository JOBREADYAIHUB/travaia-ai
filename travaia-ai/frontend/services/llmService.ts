// services/llmService.ts - Centralized LLM Operations with Google Gemini
import { GoogleGenerativeAI, GenerativeModel, ChatSession } from '@google/generative-ai';
import { JobApplication } from '../types';

// LLM Configuration
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const MODEL_NAME = 'gemini-1.5-flash'; // Fast, efficient model for real-time interactions

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// LLM Response Types
export interface LLMResponse {
  content: string;
  isStreaming: boolean;
  isComplete: boolean;
  error?: string;
}

export interface LLMStreamResponse {
  onChunk: (chunk: string) => void;
  onComplete: (fullResponse: string) => void;
  onError: (error: string) => void;
}

// Context Types for Different LLM Operations
export interface TaskSuggestionContext {
  jobTitle: string;
  companyName: string;
}

export interface JobApplicationContext {
  application: JobApplication;
  userProfile?: {
    name?: string;
    experience?: string;
    skills?: string[];
    careerGoals?: string;
  };
  conversationHistory?: string[];
}

export interface LLMPromptConfig {
  systemPrompt: string;
  userPrompt: string;
  context?: JobApplicationContext | TaskSuggestionContext;
  temperature?: number;
  maxTokens?: number;
}

// Centralized LLM Service Class
class LLMService {
  private model: GenerativeModel;
  private chatSessions: Map<string, ChatSession> = new Map();

  constructor() {
    this.model = genAI.getGenerativeModel({ 
      model: MODEL_NAME,
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
      },
    });
  }

  // Check if LLM service is available
  isAvailable(): boolean {
    return !!GEMINI_API_KEY && GEMINI_API_KEY.length > 0;
  }

  // Generate single response (non-streaming)
  async generateResponse(config: LLMPromptConfig): Promise<LLMResponse> {
    try {
      if (!this.isAvailable()) {
        throw new Error('Gemini API key not configured');
      }

      const fullPrompt = this.buildPrompt(config);
      const result = await this.model.generateContent(fullPrompt);
      const response = await result.response;
      const content = response.text();

      return {
        content,
        isStreaming: false,
        isComplete: true,
      };
    } catch (error: any) {
      console.error('LLM Generation Error:', error);
      return {
        content: '',
        isStreaming: false,
        isComplete: true,
        error: error.message || 'Failed to generate AI response',
      };
    }
  }

  // Generate streaming response (real-time)
  async generateStreamingResponse(
    config: LLMPromptConfig,
    callbacks: LLMStreamResponse
  ): Promise<void> {
    try {
      if (!this.isAvailable()) {
        throw new Error('Gemini API key not configured');
      }

      const fullPrompt = this.buildPrompt(config);
      const result = await this.model.generateContentStream(fullPrompt);

      let fullResponse = '';
      
      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        fullResponse += chunkText;
        callbacks.onChunk(chunkText);
      }

      callbacks.onComplete(fullResponse);
    } catch (error: any) {
      console.error('LLM Streaming Error:', error);
      callbacks.onError(error.message || 'Failed to generate AI response');
    }
  }

  // Start or continue a chat session
  async startChatSession(sessionId: string, context?: JobApplicationContext): Promise<ChatSession> {
    if (this.chatSessions.has(sessionId)) {
      return this.chatSessions.get(sessionId)!;
    }

    const systemPrompt = this.buildSystemPrompt(context);
    const chat = this.model.startChat({
      history: [
        {
          role: 'user',
          parts: [{ text: systemPrompt }],
        },
        {
          role: 'model',
          parts: [{ text: 'I understand. I\'m ready to help you with your job application journey. How can I assist you today?' }],
        },
      ],
    });

    this.chatSessions.set(sessionId, chat);
    return chat;
  }

  // Send message in chat session
  async sendChatMessage(
    sessionId: string,
    message: string,
    callbacks?: LLMStreamResponse
  ): Promise<LLMResponse> {
    try {
      const chat = this.chatSessions.get(sessionId);
      if (!chat) {
        throw new Error('Chat session not found');
      }

      if (callbacks) {
        // Streaming response
        const result = await chat.sendMessageStream(message);
        let fullResponse = '';
        
        for await (const chunk of result.stream) {
          const chunkText = chunk.text();
          fullResponse += chunkText;
          callbacks.onChunk(chunkText);
        }

        callbacks.onComplete(fullResponse);
        return {
          content: fullResponse,
          isStreaming: true,
          isComplete: true,
        };
      } else {
        // Non-streaming response
        const result = await chat.sendMessage(message);
        const response = await result.response;
        const content = response.text();

        return {
          content,
          isStreaming: false,
          isComplete: true,
        };
      }
    } catch (error: any) {
      console.error('Chat Message Error:', error);
      if (callbacks) {
        callbacks.onError(error.message || 'Failed to send chat message');
      }
      return {
        content: '',
        isStreaming: false,
        isComplete: true,
        error: error.message || 'Failed to send chat message',
      };
    }
  }

  // Clear chat session
  clearChatSession(sessionId: string): void {
    this.chatSessions.delete(sessionId);
  }

  // Build full prompt with context
  private buildPrompt(config: LLMPromptConfig): string {
    let prompt = config.systemPrompt + '\n\n';
    
    if (config.context) {
      prompt += this.buildContextPrompt(config.context) + '\n\n';
    }
    
    prompt += config.userPrompt;
    return prompt;
  }

  // Build system prompt with context
  private buildSystemPrompt(context?: JobApplicationContext): string {
    let systemPrompt = `You are an expert career coach and job application assistant. You provide personalized, actionable advice to help users succeed in their job search and career development.

Your personality:
- Encouraging and supportive
- Professional yet friendly
- Data-driven and practical
- Proactive in suggesting improvements
- Empathetic to job search challenges

Your capabilities:
- Analyze job applications and provide strategic advice
- Suggest specific action items and next steps
- Help with interview preparation and company research
- Provide resume and cover letter feedback
- Offer networking and follow-up strategies
- Share industry insights and trends`;

    if (context?.application) {
      systemPrompt += '\n\nCurrent Job Application Context:\n';
      systemPrompt += this.buildContextPrompt(context);
    }

    return systemPrompt;
  }

  // Build context prompt from job application data
  private buildContextPrompt(context: JobApplicationContext | TaskSuggestionContext): string {
    let contextPrompt = '';

    if ('application' in context) {
      // Full JobApplicationContext
      const { application, userProfile } = context;
      contextPrompt += `Job Application Details:\n- Company: ${application.company.name}\n- Role: ${application.role.title}\n- Status: ${application.status}\n- Applied Date: ${application.keyDates.submissionDate || 'Not specified'}\n- Next Action: ${application.nextActionDate || 'Not specified'}`;
      if (application.jobDescription) {
        contextPrompt += `\n- Job Description: ${application.jobDescription.substring(0, 500)}...`;
      }

      if (application.notes) {
        contextPrompt += `\n- Notes: ${application.notes}`;
      }

      if (userProfile) {
        contextPrompt += '\n\nUser Profile:';
        if (userProfile.name) contextPrompt += `\n- Name: ${userProfile.name}`;
        if (userProfile.experience) contextPrompt += `\n- Experience: ${userProfile.experience}`;
        if (userProfile.skills?.length) contextPrompt += `\n- Skills: ${userProfile.skills.join(', ')}`;
        if (userProfile.careerGoals) contextPrompt += `\n- Career Goals: ${userProfile.careerGoals}`;
      }
    } else {
      // Simplified TaskSuggestionContext
      const { jobTitle, companyName } = context;
      contextPrompt += `Job Application Details:\n- Company: ${companyName}\n- Role: ${jobTitle}`;
    }

    return contextPrompt;
  }
}

// Singleton instance
export const llmService = new LLMService();

// Specialized LLM Operations for Job Tracker Features

// AI Insights Generation
export async function generateAIInsights(
  application: JobApplication,
  userProfile?: any
): Promise<LLMResponse> {
  const config: LLMPromptConfig = {
    systemPrompt: `You are a career coach providing specific, actionable insights for a job application. Focus on practical next steps and strategic advice.`,
    userPrompt: `Based on the current job application status (${application.status}) and details, provide 3-5 specific, actionable insights or tips. Each insight should be:
1. Specific to this application and status
2. Actionable with clear next steps
3. Strategic and valuable
4. Concise (1-2 sentences each)

Format as a numbered list with brief, practical advice.`,
    context: { application, userProfile },
    temperature: 0.7,
  };

  return await llmService.generateResponse(config);
}

// Task Suggestions Generation
export async function generateTaskSuggestions(
  application: JobApplication,
  userProfile?: any
): Promise<LLMResponse> {
  const config: LLMPromptConfig = {
    systemPrompt: `You are a career coach suggesting specific tasks and action items for job applications.`,
    userPrompt: `Based on this job application's current status (${application.status}), suggest 3-5 specific tasks or action items the user should complete. Each task should be:
1. Relevant to the current status
2. Actionable and specific
3. Time-bound when appropriate
4. Strategic for advancing the application

Format as a simple list with task titles and brief descriptions.`,
    context: { application, userProfile },
    temperature: 0.6,
  };

  return await llmService.generateResponse(config);
}

// Company Research Generation
export async function generateCompanyResearch(
  application: JobApplication,
  callbacks?: LLMStreamResponse
): Promise<LLMResponse> {
  const config: LLMPromptConfig = {
    systemPrompt: `You are a research assistant providing comprehensive company insights for job applications.`,
    userPrompt: `Provide detailed research insights about ${application.company.name} that would be valuable for a job application. Include:
1. Company overview and recent developments
2. Industry position and competitive advantages
3. Company culture and values
4. Recent news or achievements
5. Interview tips specific to this company

Make it practical and actionable for someone applying for a ${application.role.title} position.`,
    context: { application },
    temperature: 0.5,
  };

  if (callbacks) {
    await llmService.generateStreamingResponse(config, callbacks);
    return { content: '', isStreaming: true, isComplete: false };
  }

  return await llmService.generateResponse(config);
}

// Interview Preparation
export async function generateInterviewPrep(
  application: JobApplication,
  userProfile?: any,
  callbacks?: LLMStreamResponse
): Promise<LLMResponse> {
  const config: LLMPromptConfig = {
    systemPrompt: `You are an interview coach providing personalized interview preparation.`,
    userPrompt: `Create a comprehensive interview preparation guide for a ${application.role.title} position at ${application.company.name}. Include:
1. 5-7 likely interview questions specific to this role
2. STAR method examples relevant to this position
3. Questions to ask the interviewer
4. Key points to emphasize about background/experience
5. Company-specific talking points

Make it personalized and actionable.`,
    context: { application, userProfile },
    temperature: 0.6,
  };

  if (callbacks) {
    await llmService.generateStreamingResponse(config, callbacks);
    return { content: '', isStreaming: true, isComplete: false };
  }

  return await llmService.generateResponse(config);
}

export default llmService;
