// Analytics AI Service - CareerGPT Research Assistant
// Frontend-only implementation using Vertex AI and web search

import { GoogleGenerativeAI, GenerativeModel, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

export interface ResearchRequest {
  id: string;
  type: 'company' | 'job' | 'industry' | 'freetext';
  query: string;
  companyName?: string;
  jobTitle?: string;
  industry?: string;
  userId: string;
}

export interface SearchResult {
  id: string;
  title: string;
  url: string;
  snippet: string;
  source: string;
  confidence: number;
}

export interface ResearchResult {
  id: string;
  requestId: string;
  title: string;
  content: string;
  sources: string[];
  insights: string[];
  recommendations: string[];
  webSearchResults?: SearchResult[];
  timestamp: Date;
  status: 'pending' | 'completed' | 'failed';
}

export interface CompanyResearch {
  overview: string;
  culture: string;
  recentNews: string[];
  financials: string;
  competitors: string[];
  interviewTips: string[];
}

/**
 * Service for AI-powered research using Google Gemini API
 */
class AnalyticsAIService {
  private apiKey: string;
  private genAI: GoogleGenerativeAI | null = null;
  private model: GenerativeModel | null = null;
  private initialized = false;

  constructor() {
    // Get API key from environment variables
    this.apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
    console.log('API Key available:', !!this.apiKey);
    console.log('API Key length:', this.apiKey?.length || 0);
    console.log('API Key first 5 chars:', this.apiKey?.substring(0, 5) || 'none');
    console.log('Environment variables loaded:', {
      VITE_GEMINI_API_KEY: this.apiKey ? '✓ Present' : '✗ Missing',
      VITE_GOOGLE_CLOUD_PROJECT: import.meta.env.VITE_GOOGLE_CLOUD_PROJECT ? '✓ Present' : '✗ Missing',
      VITE_GOOGLE_CLOUD_REGION: import.meta.env.VITE_GOOGLE_CLOUD_REGION ? '✓ Present' : '✗ Missing'
    });
    
    // Log all available import.meta.env keys (without values for security)
    console.log('Available import.meta.env keys:', Object.keys(import.meta.env));
    
    if (!this.apiKey) {
      console.error('VITE_GEMINI_API_KEY not found. AI features will be disabled. Please check your .env file and restart the application.');
      return;
    }

    this.initializeModel();
  }

  /**
   * Initialize the Gemini model
   */
  private initializeModel() {
    try {
      this.genAI = new GoogleGenerativeAI(this.apiKey);
      
      // Log available models for debugging
      console.log('Initializing Gemini API with the following models:');
      
      // Try using gemini-1.5-pro as it's more widely supported in the current API version
      this.model = this.genAI.getGenerativeModel({ 
        model: 'gemini-1.5-pro', // Changed from gemini-2.5-flash to more compatible model
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
        },
        // Safety settings for content generation
        safetySettings: [
          {
            category: HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
          },
          {
            category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
          }
        ]
      });
      this.initialized = true;
      console.log('Gemini AI model initialized successfully with model: gemini-1.5-pro');
    } catch (error) {
      console.error('Failed to initialize Gemini AI:', error);
      this.initialized = false;
    }
  }

  /**
   * Check if AI service is available
   */
  isAvailable(): boolean {
    const available = this.initialized && !!this.apiKey && !!this.model;
    console.log('AI service available:', available);
    return available;
  }

  /**
   * Generate content safely with error handling
   */
  private async generateContentSafely(prompt: string): Promise<string> {
    if (!this.isAvailable() || !this.model) {
      throw new Error('AI service not available');
    }

    try {
      console.log('Sending request to Gemini API...');
      const result = await this.model.generateContent(prompt);
      console.log('Received response from Gemini API');
      
      const response = await result.response;
      const text = response.text();
      
      console.log('Successfully parsed response text, length:', text.length);
      return text;
    } catch (error: any) {
      console.error('Error generating content from Gemini API:', error);
      throw new Error(`Failed to generate content: ${error.message || 'Unknown error'}`);
    }
  }

  /**
   * Perform web search for company/job research
   * Note: Since Gemini 1.5-pro doesn't have built-in web search in our current configuration,
   * we'll add instructions to the prompt asking the model to "simulate" search results.
   * This method returns context information for the prompt to improve results quality.
   */
  private async performWebSearch(query: string): Promise<string[]> {
    try {
      // Log the research query for debugging
      console.log(`Creating search context for: ${query}`);
      
      // Create search context to enhance the model's response quality
      // with instructions that simulate web search results
      const searchContext = [
        `Please provide the latest information about: ${query}`,
        `Include recent news, trends, and relevant data from 2023-2024`,
        `Focus on career-relevant information for job seekers`
      ];
      
      return searchContext;
    } catch (error) {
      console.error('Error setting up web search context:', error);
      return [`Please search for the latest information about ${query}`];
    }
  }

  /**
   * Generate company research report
   */
  async generateCompanyResearch(companyName: string): Promise<ResearchResult> {
    if (!this.isAvailable()) {
      throw new Error('AI service not available');
    }

    try {
      // Perform web search for company information
      const searchResults = await this.performWebSearch(`${companyName} company research career`);

      const prompt = `
As CareerGPT, provide comprehensive company research for a job seeker.

Company: ${companyName}

Please analyze and create a visually appealing, professional report with the following sections. Use appropriate emojis at the beginning of each section and subsection to enhance readability and visual appeal:

## 🏢 COMPANY OVERVIEW
- Business model and main products/services
- Mission, vision, and core values
- Company size, locations, and structure

## 👥 COMPANY CULTURE & WORK ENVIRONMENT
- Work culture and employee experience
- Remote/hybrid work policies
- Benefits and perks
- Employee reviews and satisfaction

## 📰 RECENT NEWS & DEVELOPMENTS
- Latest company news and announcements
- Recent product launches or initiatives
- Leadership changes or restructuring
- Financial performance and growth trends

## 📊 FINANCIAL HEALTH & STABILITY
- Revenue trends, profitability, market cap
- Recent funding, investments, or financial news
- Industry position and competitive advantages

## 🥇 COMPETITORS & MARKET POSITION
- Main competitors in the industry
- Competitive advantages and differentiators
- Market share and industry standing

## 🎯 INTERVIEW PREPARATION TIPS
- Common interview questions for this company
- What the company values in candidates
- Specific preparation recommendations
- Questions to ask during interviews

Format your response as a visually appealing, professional report with clear sections marked by emojis. Use bullet points, bold text for important points, and create a visually structured layout. Focus on actionable insights that will help with job applications and interviews.

Include a brief "💡 KEY TAKEAWAYS" section at the end with 3-5 most important points.

Web search context: ${searchResults.join(', ')}
`;

      const text = await this.generateContentSafely(prompt);

      // Convert to ResearchResult format
      return {
        id: this.generateId(),
        requestId: this.generateId(),
        title: `Company Research: ${companyName}`,
        content: text,
        sources: searchResults,
        insights: this.extractInsights(text),
        recommendations: this.extractRecommendations(text),
        timestamp: new Date(),
        status: 'completed'
      };

    } catch (error) {
      console.error('Error generating company research:', error);
      throw error;
    }
  }

  /**
   * Generate job-specific research
   */
  async generateJobResearch(jobTitle: string, companyName?: string): Promise<ResearchResult> {
    if (!this.isAvailable()) {
      throw new Error('AI service not available');
    }

    try {
      const searchQuery = companyName ? `${jobTitle} at ${companyName}` : jobTitle;
      const searchResults = await this.performWebSearch(`${searchQuery} job research career`);

      const prompt = `
As CareerGPT, provide comprehensive job research for a job seeker.

Job Title: ${jobTitle}
${companyName ? `Company: ${companyName}` : ''}

Please create a visually appealing, professional report with the following sections. Use appropriate emojis at the beginning of each section and subsection to enhance readability and visual appeal:

## 💼 ROLE OVERVIEW & RESPONSIBILITIES
- Typical responsibilities and day-to-day tasks
- Required skills and qualifications
- Career progression opportunities

## 💰 SALARY & COMPENSATION
- Salary ranges for this role
- Benefits and compensation packages
- Geographic variations in pay

## 📈 INDUSTRY TRENDS
- Demand for this role in the market
- Future outlook and growth potential
- Emerging skills and technologies

## 📝 INTERVIEW PREPARATION
- Common interview questions for this role
- Technical skills to highlight
- Portfolio or project recommendations

## 📚 CAREER DEVELOPMENT
- Skills to develop for advancement
- Certification or training recommendations
- Networking opportunities

Format your response as a visually appealing, professional report with clear sections marked by emojis. Use bullet points, bold text for important points, and create a visually structured layout.

Include a brief "💡 KEY TAKEAWAYS" section at the end with 3-5 most important points for job application success.

Web search context: ${searchResults.join(', ')}
`;

      const text = await this.generateContentSafely(prompt);

      return {
        id: this.generateId(),
        requestId: this.generateId(),
        title: `Job Research: ${jobTitle}${companyName ? ` at ${companyName}` : ''}`,
        content: text,
        sources: searchResults,
        insights: this.extractInsights(text),
        recommendations: this.extractRecommendations(text),
        timestamp: new Date(),
        status: 'completed'
      };

    } catch (error) {
      console.error('Error generating job research:', error);
      throw error;
    }
  }

  /**
   * Generate industry analysis
   */
  async generateIndustryResearch(industry: string): Promise<ResearchResult> {
    if (!this.isAvailable()) {
      throw new Error('AI service not available');
    }

    try {
      const searchResults = await this.performWebSearch(`${industry} industry analysis career trends`);

      const prompt = `
As CareerGPT, provide comprehensive industry research for career planning.

Industry: ${industry}

Please create a visually appealing, professional report with the following sections. Use appropriate emojis at the beginning of each section and subsection to enhance readability and visual appeal:

## 🏛 INDUSTRY OVERVIEW
- Current state and market size
- Key players and market leaders
- Business models and revenue streams

## 📉 GROWTH TRENDS & OUTLOOK
- Recent growth patterns
- Future projections and opportunities
- Emerging technologies and disruptions

## 💼 CAREER OPPORTUNITIES
- In-demand roles and skills
- Entry-level vs. senior opportunities
- Remote work and flexibility trends

## 💸 SALARY & COMPENSATION TRENDS
- Average salaries by role level
- Compensation growth trends
- Geographic variations

## 🎓 SKILLS & QUALIFICATIONS
- Most valuable skills for this industry
- Educational requirements and certifications
- Professional development opportunities

## 👥 NETWORKING & PROFESSIONAL DEVELOPMENT
- Key industry events and conferences
- Professional associations and communities
- Thought leaders to follow

Format your response as a visually appealing, professional report with clear sections marked by emojis. Use bullet points, bold text for important points, and create a visually structured layout.

Include a brief "💡 KEY TAKEAWAYS" section at the end with 3-5 most important strategic insights for career planning and job search in this industry.

Web search context: ${searchResults.join(', ')}
`;

      const text = await this.generateContentSafely(prompt);

      return {
        id: this.generateId(),
        requestId: this.generateId(),
        title: `Industry Analysis: ${industry}`,
        content: text,
        sources: searchResults,
        insights: this.extractInsights(text),
        recommendations: this.extractRecommendations(text),
        timestamp: new Date(),
        status: 'completed'
      };

    } catch (error) {
      console.error('Error generating industry research:', error);
      throw error;
    }
  }

  /**
   * Generate custom research from free text
   */
  async generateCustomResearch(query: string): Promise<ResearchResult> {
    if (!this.isAvailable()) {
      throw new Error('AI service not available');
    }

    try {
      const searchResults = await this.performWebSearch(query);

      const prompt = `
As CareerGPT, a specialized AI research assistant for job seekers, provide comprehensive research based on this query:

Query: ${query}

Please provide detailed analysis and actionable insights that will help with:
- Job search strategy
- Career development
- Interview preparation
- Industry understanding
- Skill development
- Professional networking

Structure your response with clear sections and provide specific, actionable recommendations.

Web search context: ${searchResults.join(', ')}
`;

      const text = await this.generateContentSafely(prompt);

      return {
        id: this.generateId(),
        requestId: this.generateId(),
        title: `Custom Research: ${query.substring(0, 50)}${query.length > 50 ? '...' : ''}`,
        content: text,
        sources: searchResults,
        insights: this.extractInsights(text),
        recommendations: this.extractRecommendations(text),
        timestamp: new Date(),
        status: 'completed'
      };

    } catch (error) {
      console.error('Error generating custom research:', error);
      throw error;
    }
  }

  /**
   * Extract insights from research content
   */
  private extractInsights(text: string): string[] {
    // Extract key insights - this is a simplified implementation
    const insights = [];
    const lines = text.split('\n');
    
    for (const line of lines) {
      if (line.includes('insight') || line.includes('key') || line.includes('important')) {
        insights.push(line.trim());
      }
    }
    
    return insights.slice(0, 5); // Return top 5 insights
  }

  /**
   * Extract recommendations from research content
   */
  private extractRecommendations(text: string): string[] {
    // Extract recommendations - this is a simplified implementation
    const recommendations = [];
    const lines = text.split('\n');
    
    for (const line of lines) {
      if (line.includes('recommend') || line.includes('should') || line.includes('consider')) {
        recommendations.push(line.trim());
      }
    }
    
    return recommendations.slice(0, 5); // Return top 5 recommendations
  }

  /**
   * Extract web search results from the AI response
   * @param text The response from the AI
   * @returns An array of search results
   */
  public extractWebSearchResults(text: string): any[] {
    try {
      const results = [];
      
      // First try to extract explicitly formatted search results
      // Look for patterns like [Source: X] or [Reference: X]
      const sourceRegex = /\[(?:Source|Reference)(?:\s*\d*)?:?\s+(.+?)\]/gi;
      let sourceMatch;
      const foundSources = new Set<string>();
      
      while ((sourceMatch = sourceRegex.exec(text)) !== null) {
        const source = sourceMatch[1].trim();
        
        // Skip duplicates
        if (foundSources.has(source)) continue;
        foundSources.add(source);
        
        // Extract the context around this source
        const startPos = Math.max(0, sourceMatch.index - 150);
        const endPos = Math.min(text.length, sourceMatch.index + source.length + 150);
        const context = text.substring(startPos, endPos);
        
        // Try to extract a URL if present
        const urlMatch = source.match(/(https?:\/\/[^\s\])]+)/);
        const url = urlMatch ? urlMatch[1] : `https://www.google.com/search?q=${encodeURIComponent(source)}`;
        
        results.push({
          id: this.generateId(),
          title: source.substring(0, 60) + (source.length > 60 ? '...' : ''),
          url: url,
          snippet: context,
          source: 'AI Research',
          confidence: 0.8,
        });
      }
      
      // Next, look for explicit URLs in the text
      if (results.length < 3) {
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        let urlMatch;
        
        while ((urlMatch = urlRegex.exec(text)) !== null) {
          const url = urlMatch[1];
          
          // Skip if we already found this URL
          if (results.some(r => r.url === url)) continue;
          
          const surroundingText = text.substring(
            Math.max(0, urlMatch.index - 100), 
            Math.min(text.length, urlMatch.index + url.length + 100)
          );
          
          results.push({
            id: this.generateId(),
            title: url.replace(/^https?:\/\//, '').split('/')[0],
            url: url,
            snippet: surroundingText.replace(url, '').trim(),
            source: 'Referenced URL',
            confidence: 0.75,
          });
          
          // Limit to max 5 results
          if (results.length >= 5) break;
        }
      }
      
      return results;
    } catch (error: any) {
      console.error('Error extracting web search results:', error);
      return [];
    }
  
  }

  /**
   * Generate unique ID
   */
  public generateId(): string {
    return `research_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}

// Export singleton instance
export const analyticsAIService = new AnalyticsAIService();
