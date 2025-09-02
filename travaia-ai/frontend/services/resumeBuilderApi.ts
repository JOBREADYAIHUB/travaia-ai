import { 
  addResumeVersion, 
  updateResumeVersion, 
  deleteResumeVersion, 
  fetchUserSectionData 
} from './firestoreService';
import { auth } from '../firebaseConfig';

interface PersonalInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  linkedinUrl: string;
  portfolioUrl: string;
  summary: string;
}

interface Experience {
  id: string;
  jobTitle: string;
  company: string;
  startDate: string;
  endDate: string;
  currentPosition: boolean;
  description: string;
}

interface Education {
  id: string;
  degree: string;
  institution: string;
  graduationDate: string;
  gpa: string;
}

interface Skill {
  id: string;
  name: string;
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
}

interface Certification {
  id: string;
  name: string;
  issuingOrganization: string;
  issueDate: string;
  expirationDate: string;
}

interface ResumeData {
  personalInfo: PersonalInfo;
  experience: Experience[];
  education: Education[];
  skills: Skill[];
  certifications: Certification[];
}

interface ResumeTemplate {
  id: string;
  name: string;
  category: string;
  previewUrl: string;
  thumbnailUrl: string;
  description: string;
  isPremium: boolean;
}

interface ResumeVersion {
  id: string;
  name: string;
  description: string;
  data: ResumeData;
  templateId: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
}

interface SaveResumeVersionPayload {
  data: ResumeData;
  templateId: string;
  name: string;
  description: string;
}

interface GenerateResumePayload {
  data: ResumeData;
  templateId: string;
  format: 'pdf' | 'docx';
}

// API Base URL - will be configured based on environment
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8080';

class ResumeBuilderApiService {
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    try {
      // Get auth token from Firebase
      const user = auth.currentUser;
      const token = user ? await user.getIdToken() : null;
      
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          ...options.headers,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  /**
   * Intake Agent Service - Create new resume
   */
  async createResume(payload: SaveResumeVersionPayload): Promise<{ resumeId: string; status: string }> {
    return this.makeRequest('/api/intake/resume/form', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  /**
   * Intake Agent Service - Upload resume file
   */
  async uploadResumeFile(file: File): Promise<{ uploadId: string; status: string }> {
    const formData = new FormData();
    formData.append('file', file);

    const user = auth.currentUser;
    const token = user ? await user.getIdToken() : null;
    
    const response = await fetch(`${API_BASE_URL}/api/intake/resume/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to upload resume file');
    }

    return await response.json();
  }

  /**
   * Intake Agent Service - Fetch available templates
   */
  async fetchTemplates(): Promise<ResumeTemplate[]> {
    try {
      return await this.makeRequest<ResumeTemplate[]>('/api/intake/templates');
    } catch (error) {
      // Fallback to mock templates if service is unavailable
      console.warn('Templates service unavailable, using mock data:', error);
      return this.getMockTemplates();
    }
  }

  /**
   * Intake Agent Service - Select template
   */
  async selectTemplate(templateId: string, resumeId: string): Promise<{ success: boolean }> {
    return this.makeRequest('/api/intake/template/select', {
      method: 'POST',
      body: JSON.stringify({ templateId, resumeId }),
    });
  }

  /**
   * Intake Agent Service - Check processing status
   */
  async getProcessingStatus(resumeId: string): Promise<{ status: string; progress: number }> {
    return this.makeRequest(`/api/intake/resume/${resumeId}/status`);
  }

  /**
   * Deconstruction Agent Service - Parse uploaded resume
   */
  async parseResumeFile(file: File): Promise<ResumeData> {
    try {
      // First upload the file
      const uploadResult = await this.uploadResumeFile(file);
      
      // Then parse it
      const parseResult = await this.makeRequest<{ data: ResumeData }>('/api/deconstruction/parse', {
        method: 'POST',
        body: JSON.stringify({ uploadId: uploadResult.uploadId }),
      });

      return parseResult.data;
    } catch (error) {
      console.warn('File parsing service unavailable, using mock parsing:', error);
      return this.getMockParsedData();
    }
  }

  /**
   * Deconstruction Agent Service - Analyze job description
   */
  async analyzeJobDescription(jobId: string): Promise<{ keywords: string[]; requirements: string[] }> {
    return this.makeRequest(`/api/deconstruction/job/${jobId}/analyze`);
  }

  /**
   * Deconstruction Agent Service - Extract structured data
   */
  async extractStructuredData(content: string): Promise<ResumeData> {
    return this.makeRequest('/api/deconstruction/extract', {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  }

  /**
   * Deconstruction Agent Service - Get supported formats
   */
  async getSupportedFormats(): Promise<{ formats: string[] }> {
    try {
      return await this.makeRequest('/api/deconstruction/formats');
    } catch (error) {
      // Fallback to default formats
      return { formats: ['pdf', 'docx', 'txt'] };
    }
  }

  /**
   * Synthesis & Assembly Agent Service - Enhance content with AI
   */
  async enhanceWithAI(data: ResumeData): Promise<ResumeData> {
    try {
      const result = await this.makeRequest<{ enhancedData: ResumeData }>('/api/synthesis/enhance', {
        method: 'POST',
        body: JSON.stringify({ data }),
      });

      return result.enhancedData;
    } catch (error) {
      console.warn('AI enhancement service unavailable:', error);
      throw new Error('AI enhancement is currently unavailable. Please try again later.');
    }
  }

  /**
   * Synthesis & Assembly Agent Service - Merge data with template
   */
  async mergeWithTemplate(data: ResumeData, templateId: string): Promise<{ mergedContent: string }> {
    return this.makeRequest('/api/assembly/merge', {
      method: 'POST',
      body: JSON.stringify({ data, templateId }),
    });
  }

  /**
   * Synthesis & Assembly Agent Service - Generate final resume
   */
  async generateResume(payload: GenerateResumePayload): Promise<{ downloadUrl: string }> {
    try {
      const result = await this.makeRequest<{ downloadUrl: string }>('/api/assembly/generate', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      // Trigger download
      const link = document.createElement('a');
      link.href = result.downloadUrl;
      link.download = `resume.${payload.format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      return result;
    } catch (error) {
      console.warn('Resume generation service unavailable:', error);
      throw new Error('Resume generation is currently unavailable. Please try again later.');
    }
  }

  /**
   * Synthesis & Assembly Agent Service - Get resume versions
   */
  async getResumeVersions(): Promise<ResumeVersion[]> {
    try {
      return await this.makeRequest<ResumeVersion[]>('/api/assembly/versions');
    } catch (error) {
      // Fallback to Firestore for resume versions
      console.warn('Versions service unavailable, using Firestore:', error);
      return this.getVersionsFromFirestore();
    }
  }

  /**
   * Synthesis & Assembly Agent Service - Get specific resume version
   */
  async getResumeVersion(versionId: string): Promise<ResumeVersion> {
    try {
      return await this.makeRequest<ResumeVersion>(`/api/assembly/versions/${versionId}`);
    } catch (error) {
      // Fallback to Firestore
      return this.getVersionFromFirestore(versionId);
    }
  }

  /**
   * Synthesis & Assembly Agent Service - Save resume version
   */
  async saveResumeVersion(payload: SaveResumeVersionPayload): Promise<ResumeVersion> {
    try {
      return await this.makeRequest<ResumeVersion>('/api/assembly/save', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    } catch (error) {
      // Fallback to Firestore
      console.warn('Save service unavailable, using Firestore:', error);
      return this.saveVersionToFirestore(payload);
    }
  }

  /**
   * Synthesis & Assembly Agent Service - Delete resume version
   */
  async deleteResumeVersion(versionId: string): Promise<{ success: boolean }> {
    try {
      return await this.makeRequest(`/api/assembly/version/${versionId}`, {
        method: 'DELETE',
      });
    } catch (error) {
      // Fallback to Firestore
      return this.deleteVersionFromFirestore(versionId);
    }
  }

  // Fallback methods using Firestore
  private async getVersionsFromFirestore(): Promise<ResumeVersion[]> {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');

      const versions = await fetchUserSectionData(user.uid, 'resumes');

      return versions.map((doc: any) => ({
        id: doc.id,
        ...doc.data()
      })) as ResumeVersion[];
    } catch (error) {
      console.error('Failed to get versions from Firestore:', error);
      return [];
    }
  }

  private async getVersionFromFirestore(versionId: string): Promise<ResumeVersion> {
    const user = auth.currentUser;
    const token = user ? await user.getIdToken() : null;
    // Mock implementation for now - would fetch from Firestore
    const doc = { exists: () => false, id: versionId, data: () => ({}) };
    if (!doc.exists()) {
      throw new Error('Resume version not found');
    }

    return {
      id: doc.id,
      ...doc.data()
    } as ResumeVersion;
  }

  private async saveVersionToFirestore(payload: SaveResumeVersionPayload): Promise<ResumeVersion> {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    const versionData = {
      ...payload,
      userId: user.uid,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const resumeData = {
      versionName: 'Resume Version',
      content: JSON.stringify(payload),
      lastModified: new Date().toISOString()
    };
    const version = await addResumeVersion(user.uid, resumeData);
    
    return {
      id: version.id,
      ...versionData
    };
  }

  private async deleteVersionFromFirestore(versionId: string): Promise<{ success: boolean }> {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');
    await deleteResumeVersion(user.uid, versionId);
    return { success: true };
  }

  // Mock data for development/fallback
  private getMockTemplates(): ResumeTemplate[] {
    return [
      {
        id: 'modern-1',
        name: 'Modern Professional',
        category: 'modern',
        previewUrl: '/templates/modern-1-preview.html',
        thumbnailUrl: '/templates/modern-1-thumb.jpg',
        description: 'Clean and modern design perfect for tech professionals',
        isPremium: false
      },
      {
        id: 'classic-1',
        name: 'Classic Executive',
        category: 'classic',
        previewUrl: '/templates/classic-1-preview.html',
        thumbnailUrl: '/templates/classic-1-thumb.jpg',
        description: 'Traditional format ideal for corporate positions',
        isPremium: false
      },
      {
        id: 'creative-1',
        name: 'Creative Portfolio',
        category: 'creative',
        previewUrl: '/templates/creative-1-preview.html',
        thumbnailUrl: '/templates/creative-1-thumb.jpg',
        description: 'Eye-catching design for creative professionals',
        isPremium: true
      },
      {
        id: 'professional-1',
        name: 'Professional Standard',
        category: 'professional',
        previewUrl: '/templates/professional-1-preview.html',
        thumbnailUrl: '/templates/professional-1-thumb.jpg',
        description: 'Versatile template suitable for most industries',
        isPremium: false
      },
      {
        id: 'minimal-1',
        name: 'Minimal Clean',
        category: 'minimal',
        previewUrl: '/templates/minimal-1-preview.html',
        thumbnailUrl: '/templates/minimal-1-thumb.jpg',
        description: 'Simple and elegant design focusing on content',
        isPremium: false
      }
    ];
  }

  private getMockParsedData(): ResumeData {
    return {
      personalInfo: {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        phone: '(555) 123-4567',
        address: '123 Main St',
        city: 'San Francisco',
        state: 'CA',
        zipCode: '94105',
        linkedinUrl: 'https://linkedin.com/in/johndoe',
        portfolioUrl: 'https://johndoe.dev',
        summary: 'Experienced software engineer with 5+ years in full-stack development.'
      },
      experience: [
        {
          id: '1',
          jobTitle: 'Senior Software Engineer',
          company: 'Tech Corp',
          startDate: '2021-01-01',
          endDate: '',
          currentPosition: true,
          description: 'Lead development of key features and mentor junior developers.'
        }
      ],
      education: [
        {
          id: '1',
          degree: 'Bachelor of Computer Science',
          institution: 'University of California',
          graduationDate: '2019-05-01',
          gpa: '3.8'
        }
      ],
      skills: [
        { id: '1', name: 'JavaScript', level: 'expert' },
        { id: '2', name: 'React', level: 'advanced' },
        { id: '3', name: 'Node.js', level: 'advanced' }
      ],
      certifications: []
    };
  }
}

export const resumeBuilderApi = new ResumeBuilderApiService();
