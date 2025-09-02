import { 
  JobApplication, 
  ApplicationStatus, 
  ApiResponse, 
  Contact, 
  ContactAddRequest, 
  Note, 
  NoteAddRequest, 
  BackendApplication,
  EnhancedJobApplication,
  PaginatedEnhancedApplicationsResponse,
  PaginationMeta
} from '../types';
import { auth } from '../firebaseConfig';

// Use Google Cloud API Gateway directly
const API_BASE = '/api';

/**
 * Job Application API Service
 * Handles all job application CRUD operations via the application-job-service microservice
 * Routes all requests through Google Cloud API Gateway
 */
export class JobApplicationApiService {

  /**
   * Get authentication headers with improved error handling
   */
  private static async getAuthHeaders(): Promise<HeadersInit> {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User not authenticated. Cannot make API request.');
    }

    try {
      // Force token refresh to ensure we get a fresh token with correct audience
      const token = await user.getIdToken(true);
      return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      };
    } catch (error) {
      console.error('Error getting auth token:', error);
      throw new Error('Failed to retrieve authentication token.');
    }
  }

  /**
   * Centralized request handler for all API calls
   */
  private static async _request<T>(endpoint: string, options: RequestInit): Promise<T> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers,
      });

      if (!response.ok) {
        let errorDetails;
        try {
          const errorData = await response.json();
          errorDetails = errorData.detail || errorData.message || JSON.stringify(errorData);
        } catch (e) {
          errorDetails = `HTTP ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorDetails);
      }

      if (response.status === 204) {
        return null as T;
      }

      return response.json();

    } catch (error: any) {
      console.error(`API service error on ${options.method} ${endpoint}:`, error.message);
      throw error;
    }
  }

  /**
   * Centralized request handler for all API calls with proper ApiResponse typing
   */
  private static async _requestTyped<T>(endpoint: string, options: RequestInit): Promise<ApiResponse<T>> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers,
      });

      if (!response.ok) {
        let errorDetails = `HTTP ${response.status}: ${response.statusText}`;
        try {
          // Attempt to parse more specific error messages from the backend
          const errorData = await response.json();
          errorDetails = errorData.message || errorData.error || JSON.stringify(errorData) || errorDetails;
        } catch (e) {
          // If not JSON, try to read plain text body for diagnostics
          try {
            const text = await response.text();
            if (text && text.trim().length > 0) {
              errorDetails += ` | body: ${text.substring(0, 500)}`; // cap to avoid flooding console
            }
          } catch (_) {
            // ignore
          }
        }
        throw new Error(errorDetails);
      }

      // Handle successful responses with no content (e.g., DELETE)
      if (response.status === 204) {
        return { success: true, message: 'Operation completed successfully' } as ApiResponse<T>;
      }

      const result: ApiResponse<T> = await response.json();
      return result;

    } catch (error: any) {
      console.error(`API service error on ${options.method} ${endpoint}:`, error);
      // Re-throw the error so the calling component can handle it
      throw new Error(error.message || 'An unknown API error occurred.');
    }
  }

  /**
   * Fetch all job applications for analytics without pagination
   */
  static async fetchJobApplicationsForAnalytics(): Promise<JobApplication[]> {
    const response = await this._request<{ success: boolean, data: JobApplication[] }>('/applications/analytics', { method: 'GET' });
    return response.data || [];
  }

  /**
   * Fetch paginated job applications for the current user
   */
  static async fetchJobApplications(page: number = 1, limit: number = 10): Promise<{ applications: BackendApplication[], pagination: PaginationMeta }> {
    const response = await this._request<{ success: boolean, data: BackendApplication[], pagination: PaginationMeta }>(
      `/applications?page=${page}&limit=${limit}`,
      { method: 'GET' }
    );
    console.log('Raw API Response:', JSON.stringify(response, null, 2));
    console.log('Response data:', response.data);
    console.log('Response pagination:', response.pagination);
    console.log('Response keys:', Object.keys(response));
    // Transform backend ApiResponse format to expected frontend format
    // Backend returns: { success, data: [...applications...], pagination }
    // Frontend expects: { applications: [...], pagination }
    return {
      applications: response.data || [],
      pagination: response.pagination
    };
  }

  /**
   * Create a new job application
   */
  static async createJobApplication(
    applicationData: Omit<BackendApplication, 'application_id' | 'user_id' | 'created_at' | 'updated_at'>
  ): Promise<BackendApplication> {
    const response = await this._request<{ success: boolean, data: BackendApplication }>('/applications', {
      method: 'POST',
      body: JSON.stringify(applicationData),
    });
    return response.data;
  }

  /**
   * Update an existing job application
   */
  static async updateJobApplication(
    applicationId: string,
    applicationData: Partial<Omit<JobApplication, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>
  ): Promise<JobApplication> {
    const response = await this._request<{ success: boolean, data: JobApplication }>(`/applications/${applicationId}`, {
      method: 'PUT',
      body: JSON.stringify(applicationData),
    });
    return response.data;
  }

  /**
   * Delete a job application
   */
  static async deleteJobApplication(applicationId: string): Promise<void> {
    await this._request<void>(`/applications/${applicationId}`, { method: 'DELETE' });
  }

  /**
   * Get a specific job application by ID
   */
  static async getJobApplication(applicationId: string): Promise<JobApplication> {
    const response = await this._request<{ success: boolean, data: JobApplication }>(`/applications/${applicationId}`, { method: 'GET' });
    return response.data;
  }

  /**
   * Update job application status
   */
  static async updateJobApplicationStatus(
    applicationId: string, 
    status: ApplicationStatus
  ): Promise<JobApplication> {
    const response = await this._request<{ success: boolean, data: JobApplication }>(`/applications/${applicationId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    return response.data;
  }

  /**
   * Add a note to a job application
   */
  static async addJobApplicationNote(
    applicationId: string,
    note: string
  ): Promise<JobApplication> {
    const response = await this._request<{ success: boolean, data: JobApplication }>(`/applications/${applicationId}/notes`, {
      method: 'PATCH',
      body: JSON.stringify({ note }),
    });
    return response.data;
  }

  /**
   * Get job applications by status
   */
  static async getJobApplicationsByStatus(status: ApplicationStatus): Promise<JobApplication[]> {
    const response = await this._request<{ success: boolean, data: JobApplication[] }>(`/applications/status/${status}`, { method: 'GET' });
    return response.data || [];
  }

  /**
   * Search job applications
   */
  static async searchJobApplications(query: string): Promise<JobApplication[]> {
    const response = await this._request<{ success: boolean, data: JobApplication[] }>(`/applications/search?q=${encodeURIComponent(query)}`, { method: 'GET' });
    return response.data || [];
  }

  /**
   * Get job application analytics/statistics
   */
  static async getJobApplicationStats(): Promise<any> {
    const response = await this._request<{ success: boolean, data: any }>('/applications/stats', { method: 'GET' });
    return response.data;
  }

  /**
   * Add a contact to a job application
   */
  static async addContactToApplication(
    applicationId: string,
    contactData: ContactAddRequest
  ): Promise<ApiResponse<BackendApplication>> {
    return this._requestTyped<BackendApplication>(`/applications/${applicationId}/contacts`, {
      method: 'POST',
      body: JSON.stringify(contactData),
    });
  }

  /**
   * Add a note to a job application
   */
  static async addNoteToApplication(
    applicationId: string,
    noteData: NoteAddRequest
  ): Promise<ApiResponse<BackendApplication>> {
    return this._requestTyped<BackendApplication>(`/applications/${applicationId}/notes`, {
      method: 'POST',
      body: JSON.stringify(noteData),
    });
  }

  /**
   * Get all contacts for a job application
   */
  static async getApplicationContacts(applicationId: string): Promise<Contact[]> {
    const response = await this._request<{ success: boolean, data: Contact[] }>(`/applications/${applicationId}/contacts`, { method: 'GET' });
    return response.data || [];
  }

  /**
   * Get all notes for a job application
   */
  static async getApplicationNotes(applicationId: string): Promise<Note[]> {
    const response = await this._request<{ success: boolean, data: Note[] }>(`/applications/${applicationId}/notes`, { method: 'GET' });
    return response.data || [];
  }

  /**
   * Update a specific contact for a job application
   */
  static async updateApplicationContact(
    applicationId: string,
    contactId: string,
    contactData: Partial<ContactAddRequest>
  ): Promise<ApiResponse<Contact>> {
    return this._requestTyped<Contact>(`/applications/${applicationId}/contacts/${contactId}`, {
      method: 'PUT',
      body: JSON.stringify(contactData),
    });
  }

  /**
   * Delete a specific contact from a job application
   */
  static async deleteApplicationContact(
    applicationId: string,
    contactId: string
  ): Promise<void> {
    await this._request<void>(`/applications/${applicationId}/contacts/${contactId}`, { method: 'DELETE' });
  }

  /**
   * Update a specific note for a job application
   */
  static async updateApplicationNote(
    applicationId: string,
    noteId: string,
    noteData: Partial<NoteAddRequest>
  ): Promise<ApiResponse<Note>> {
    return this._requestTyped<Note>(`/applications/${applicationId}/notes/${noteId}`, {
      method: 'PUT',
      body: JSON.stringify(noteData),
    });
  }

  /**
   * Delete a specific note from a job application
   */
  static async deleteApplicationNote(
    applicationId: string,
    noteId: string
  ): Promise<void> {
    await this._request<void>(`/applications/${applicationId}/notes/${noteId}`, { method: 'DELETE' });
  }

  /**
   * Fetch paginated ENHANCED job applications for the current user
   */
  /**
   * Fetch AI analysis for a job application
   */
  static async getJobAnalysis(userProfile: any, jobDescription: string, userId: string): Promise<any> {
    const analysisRequest = {
      user_profile: userProfile,
      job_description: jobDescription,
      user_id: userId,
      analysis_type: "comprehensive",
      language: "en",
    };

    // Note: The endpoint is routed through the API gateway to the ai-engine-service
    return this._request<any>('/ai/analyze-job', {
      method: 'POST',
      body: JSON.stringify(analysisRequest),
    });
  }

  /**
   * Fetch paginated ENHANCED job applications for the current user
   */
  static async fetchEnhancedJobApplications(page: number = 1, limit: number = 15): Promise<PaginatedEnhancedApplicationsResponse> {
    const response = await this._request<ApiResponse<BackendApplication[]>>(
      `/applications?page=${page}&limit=${limit}`,
      { method: 'GET' }
    );
    // This is a workaround until the backend is fully standardized.
    // It ensures that the frontend receives the data in the expected format.
    return {
      applications: response.data,
      pagination: response.pagination,
    } as PaginatedEnhancedApplicationsResponse;
  }
}
