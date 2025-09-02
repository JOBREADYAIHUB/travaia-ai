import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';

// Types for research data
export interface ResearchResult {
  id: string;
  requestId: string;
  title: string;
  content: string;
  sources: string[];
  insights: string[];
  recommendations: string[];
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
    console.log('Environment variables loaded:', {
      VITE_GEMINI_API_KEY: this.apiKey ? '✓ Present' : '✗ Missing',
      VITE_GOOGLE_CLOUD_PROJECT: import.meta.env.VITE_GOOGLE_CLOUD_PROJECT ? '✓ Present' : '✗ Missing',
      VITE_GOOGLE_CLOUD_REGION: import.meta.env.VITE_GOOGLE_CLOUD_REGION ? '✓ Present' : '✗ Missing'
    });
    
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
      this.model = this.genAI.getGenerativeModel({ 
        model: 'gemini-pro',
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
        },
      });
      this.initialized = true;
      console.log('Gemini AI model initialized successfully');
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
   * Perform web search for company/job research
   */
  private async performWebSearch(query: string): Promise<string[]> {
    try {
      // Use Brave Search API or similar web search service
      // For now, we'll simulate web search results
      const searchResults = [
        `Recent news about ${query}`,
        `Company information for ${query}`,
        `Industry analysis related to ${query}`,
        `Career opportunities in ${query}`,
        `Market trends for ${query}`
      ];
      
      return searchResults;
    } catch (error) {
      console.error('Web search error:', error);
      return [];
    }
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
    } catch (error) {
      console.error('Error generating content from Gemini API:', error);
      throw new Error(`Failed to generate content: ${error.message || 'Unknown error'}`);
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
As CareerGPT, a specialized AI research assistant for job seekers, provide a comprehensive company research report for job applications.

Company: ${companyName}

Please provide detailed research in the following areas:

1. COMPANY OVERVIEW
- Business model, products/services, market position
- Size, locations, key leadership
- Mission, values, and strategic direction

2. COMPANY CULTURE & VALUES
- Work environment and culture
- Employee benefits and perks
- Diversity, equity, and inclusion initiatives
- Work-life balance and remote work policies

3. RECENT NEWS & DEVELOPMENTS
- Recent company news, announcements, acquisitions
- Product launches, partnerships, expansions
- Financial performance and growth trends

4. FINANCIAL HEALTH & STABILITY
- Revenue trends, profitability, market cap
- Recent funding, investments, or financial news
- Industry position and competitive advantages

5. COMPETITORS & MARKET POSITION
- Main competitors in the industry
- Competitive advantages and differentiators
- Market share and industry standing

6. INTERVIEW PREPARATION TIPS
- Common interview questions for this company
- What the company values in candidates
- Specific preparation recommendations
- Questions to ask during interviews

Format your response as a structured report with clear sections. Focus on actionable insights that will help with job applications and interviews.

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

Please provide detailed analysis covering:

1. ROLE OVERVIEW & RESPONSIBILITIES
- Typical responsibilities and day-to-day tasks
- Required skills and qualifications
- Career progression opportunities

2. SALARY & COMPENSATION
- Salary ranges for this role
- Benefits and compensation packages
- Geographic variations in pay

3. INDUSTRY TRENDS
- Demand for this role in the market
- Future outlook and growth potential
- Emerging skills and technologies

4. INTERVIEW PREPARATION
- Common interview questions for this role
- Technical skills to highlight
- Portfolio or project recommendations

5. CAREER DEVELOPMENT
- Skills to develop for advancement
- Certification or training recommendations
- Networking opportunities

Provide actionable insights and specific recommendations for job application success.

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

Please analyze:

1. INDUSTRY OVERVIEW
- Current state and market size
- Key players and market leaders
- Business models and revenue streams

2. GROWTH TRENDS & OUTLOOK
- Recent growth patterns
- Future projections and opportunities
- Emerging technologies and disruptions

3. CAREER OPPORTUNITIES
- In-demand roles and skills
- Entry-level vs. senior opportunities
- Remote work and flexibility trends

4. SALARY & COMPENSATION TRENDS
- Average salaries by role level
- Compensation growth trends
- Geographic variations

5. SKILLS & QUALIFICATIONS
- Most valuable skills for this industry
- Educational requirements and certifications
- Professional development opportunities

6. NETWORKING & PROFESSIONAL DEVELOPMENT
- Key industry events and conferences
- Professional associations and communities
- Thought leaders to follow

Provide strategic insights for career planning and job search in this industry.

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
   * Extract section content from text
   */
  private extractSection(text: string, sectionTitle: string): string | null {
    const regex = new RegExp(`${sectionTitle}[\\s\\S]*?(?=\\n\\s*[A-Z][A-Z\\s]+|$)`, 'i');
    const match = text.match(regex);
    return match ? match[0].replace(sectionTitle, '').trim() : null;
  }

  /**
   * Extract list items from a section
   */
  private extractListItems(text: string, sectionTitle: string): string[] {
    const section = this.extractSection(text, sectionTitle);
    if (!section) return [];
    
    const lines = section.split('\n');
    const items = [];
    
    for (const line of lines) {
      if (line.trim().startsWith('-') || line.trim().startsWith('•')) {
        items.push(line.trim().substring(1).trim());
      }
    }
    
    return items;
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `research_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance
export const analyticsAIService = new AnalyticsAIService();
