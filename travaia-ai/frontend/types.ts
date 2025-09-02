import { Timestamp } from 'firebase/firestore'; // Import Timestamp

// @google/genai: Added Translations type definition
export type Translations = Record<string, string>;

// @google/genai: Added LocaleMessages type definition
export type LocaleMessages = Record<string, Translations>;

// Legacy application status kept for backward compatibility
export enum LegacyApplicationStatus {
  WISHLIST = 'Wishlist',
  APPLIED = 'Applied',
  INTERVIEWING = 'Interviewing',
  OFFER = 'Offer',
  REJECTED = 'Rejected',
  ON_HOLD = 'On Hold',
}

export enum ApplicationStatus {
  Draft = 'Draft',
  Applied = 'Applied',
  Interviewing = 'Interviewing',
  Interviewed = 'Interviewed',
  InterviewScheduled = 'InterviewScheduled',
  AssessmentPending = 'AssessmentPending',
  WaitingResponse = 'WaitingResponse',
  OfferReceived = 'OfferReceived',
  Rejected = 'Rejected',
  Hired = 'Hired',
}

export type CompanySizeType = 'Startup' | 'Enterprise' | 'NGO';
export type JobType = 'Full-time' | 'Part-time' | 'Contract' | 'Internship' | 'Freelance';
export type EmploymentMode = 'On-site' | 'Remote' | 'Hybrid';
export type ApplicationSource = 'JobBoard' | 'CompanyCareerPage' | 'RecruiterReferral' | 'NetworkingEvent' | 'InternalTransfer' | 'Other' | 'Recruiter';
export type PriorityLevel = 'High' | 'Medium' | 'Low';
export type DocumentType = 'Resume' | 'CoverLetter' | 'Other';

export interface JobApplicationNote {
  personalNotes?: string;
  recruiterFeedback?: string;
  interviewerComments?: string;
}

export interface ProgressTask {
  id: string;
  type: 'research_company' | 'prepare_interview' | 'send_thank_you' | 'custom';
  title: string;
  description?: string;
  completed: boolean;
  createdAt: string;
  completedAt?: string;
}

export interface JobApplication {
  id: string;
  userId: string;
  status: ApplicationStatus;
  company: {
    name: string;
    department?: string;
    sizeType?: CompanySizeType;
    industry?: string;
    website?: string;
  };
  role: {
    title: string;
    jobId?: string;
    jobType?: JobType;
    employmentMode?: EmploymentMode;
  };
  /**
   * @deprecated Temporary backward-compatibility fields. Prefer using `company.name` and `role.title`.
   */
  companyName?: string;
  /**
   * @deprecated Temporary backward-compatibility fields. Prefer using `role.title`.
   */
  jobTitle?: string;
  /**
   * @deprecated Temporary backward-compatibility field. Job description should be stored elsewhere.
   */
  jobDescription?: string;
  /**
   * @deprecated Temporary backward-compatibility field for reminder dates.
   */
  reminderDate?: string;
  source: ApplicationSource;
  priority: PriorityLevel;
  tags: string[];
  keyDates: {
    submissionDate: string;
    interviewDates?: string[];
    offerExpiryDate?: string;
    nextAction?: string;
  };
  documents: Array<{
    type: DocumentType;
    path: string;
    name: string;
  }>;
  notes: JobApplicationNote;
  statusHistory?: Array<{
    status: ApplicationStatus;
    date: string;
  }>;
  // Enhanced progress tracking fields
  progressTasks?: ProgressTask[];
  nextActionDate?: string;
  nextActionDescription?: string;
  url?: string;
  salary?: string | {
    min?: number;
    max?: number;
    currency?: string;
  };
  location?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export enum InterviewType {
  BEHAVIORAL = 'Behavioral',
  TECHNICAL = 'Technical',
  SITUATIONAL = 'Situational',
  GENERAL_HR = 'General_HR',
}

export enum InterviewMode {
  TEXT = 'Text',
  AUDIO = 'Audio',
  VIDEO = 'Video',
  MIXED = 'Mixed',
}

// @google/genai: Added Modality type definition based on usage in backend/src/index.ts
export type Modality = 'AUDIO' | 'TEXT';

export enum InterviewDifficulty {
  EASY = 'Easy',
  MODERATE = 'Moderate',
  EXPERT = 'Expert',
}

export enum AIVoiceStyle {
  FRIENDLY = 'Friendly',
  PROFESSIONAL = 'Professional',
  TOUGH = 'Tough',
  CASUAL = 'Casual',
}

export interface InterviewSettings {
  interviewName?: string; // Added
  jobRole: string;
  jobDescription?: string;
  companyName?: string;
  linkedApplicationId?: string; // Added
  resumeId?: string; // Added
  coverLetterId?: string; // Added
  otherDocumentId?: string; // Added
  interviewType: InterviewType;
  interviewMode: InterviewMode;
  difficulty: InterviewDifficulty;
  focusAreas?: string; // Added
  language: string;
  voiceStyle: AIVoiceStyle;
}

export interface InterviewQuestion {
  id: string;
  text: string;
  type: InterviewType;
}

export interface InterviewAnswer {
  questionId: string;
  answerText: string;
  score?: number;
  feedback?: string;
}

export interface TranscriptEntry {
  speaker: 'ai' | 'user' | 'system';
  text: string;
  timestamp: Date | Timestamp | string; // Allow string for easier Firestore storage then convert back
  isPartial?: boolean;
}

export interface ResumeSection {
  id: string; // e.g., 'summary', 'experience-0', 'education-1'
  type: 'summary' | 'experience' | 'education' | 'skills' | 'custom';
  title?: string; // e.g., "Professional Summary", "Work Experience"
  // For list-based sections like experience, education, skills (array of items)
  items?: Array<{
    id: string; // e.g., 'exp-item-0', 'skill-item-1'
    title?: string; // Job title, Degree, Skill name
    subtitle?: string; // Company, School
    dateRange?: string; // "Jan 2020 - Present", "May 2022"
    location?: string; // City, State
    description?: string; // Bullet points or paragraph
    bulletPoints?: string[];
  }>;
  // For paragraph-based sections like summary
  paragraph?: string;
  // For skills section (could also use items)
  skillList?: string[];
}

export interface ResumeTemplateStructure {
  title: string; // e.g., "Professional Chronological Resume"
  sections: ResumeSection[];
  layoutSettings?: {
    fontFamily?: string;
    fontSize?: number; // e.g. 10, 11, 12
    primaryColor?: string; // Hex code for accents
    secondaryColor?: string; // Hex code
    margins?: { top: number; right: number; bottom: number; left: number }; // in mm or pt
  };
}

export interface Resume {
  id: string;
  userId: string;
  versionName: string;
  // Content can be a stringified JSON of ResumeTemplateStructure or plain text.
  content: string;
  templateId?: string; // ID of the visual template chosen (from ResumeTemplate collection)
  lastModified: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface DocumentVersion {
  versionId: string;
  storagePath: string;
  timestamp: string;
  notes: string;
  previewUrl: string;
}

export interface Document {
  id: string;
  userId: string;
  name: string;
  fileType: string;
  mimeType: string;
  originalFileName: string;
  storagePath: string;
  previewUrl: string;
  size?: number;
  status?: string;
  notes?: string;
  tags?: string[];
  type?: DocumentType; // Added to match the filter usage
  associatedCompanies?: string[];
  associatedJobs?: string[];
  versions?: DocumentVersion[];
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
}

export interface AnalyticsData {
  applicationVolume: { month: string; count: number }[];
  interviewFunnel: { stage: string; count: number }[];
  offerRejectionRatio: { offers: number; rejections: number };
  aiInsights: string[];
}

export interface UserSkill {
  id: string;
  name: string;
  level: number; // 1-5 skill proficiency level
  years?: number; // Years of experience with this skill
  verified?: boolean; // Whether this skill has been verified 
}

export interface UserProfile {
  uid: string;
  email?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
  createdAt?: Timestamp;
  lastLoginAt?: Timestamp;
  recruiter?: boolean; // Whether the user is a recruiter or job seeker
  // Profile information
  professionalTitle?: string;
  company?: string;
  location?: string;
  industry?: string;
  careerGoals?: string;
  skills?: UserSkill[]; // User skills for job matching
  preferences?: {
    theme?: 'light' | 'dark';
    language?: string; // Changed from LanguageCode, will be managed by new system
    favoriteTemplateIds?: string[];
    recentlyUsedTemplateIds?: string[];
  };
}

export interface MockInterviewSession {
  id: string;
  userId: string;
  settings: InterviewSettings;
  transcript: TranscriptEntry[];
  overallScore?: number;
  feedbackSummary?: string;
  strengths?: string[];
  weaknesses?: string[];
  actionableTips?: string[];
  startedAt?: string; // ISO date string
  endedAt?: string; // ISO date string
  durationSeconds?: number;
  status?: 'pending' | 'completed' | 'error' | 'in-progress';
  createdAt: Timestamp; // Firestore Timestamp
  updatedAt: Timestamp; // Firestore Timestamp
}

export type Theme = 'light' | 'dark';

// Application routes for navigation
export type AppRoute = string;

export interface ResumeTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  imageUrl: string;
  previewUrl: string;
  tags?: string[];
  rating?: number | null;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  downloads?: number;
  isPremium?: boolean;
  structure?: ResumeTemplateStructure;
}

export interface ResumeCategory {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  description?: string;
  templateCount?: number;
}

export type WebSocketClientMessage =
  | { type: 'start_session'; payload: InterviewSettings }
  | { type: 'audio_chunk'; payload: string }
  | { type: 'text_input'; payload: string }
  | { type: 'end_session' };

export type WebSocketServerMessage =
  | { type: 'session_started'; payload: { sessionId: string } }
  | { type: 'ai_audio_chunk'; payload: string }
  | { type: 'ai_text_response'; payload: string }
  | {
      type: 'transcription_update';
      payload: { text: string; isPartial: boolean; speaker: 'user' | 'ai' };
    }
  | { type: 'session_ended'; payload: { summary?: string } }
  | { type: 'error'; payload: string };

// @google/genai: Added minimal SpeechGrammar interface
export interface SpeechGrammar {
  src?: string;
  weight?: number;
}

// Centralized JobMatchPreferences interface for onboarding and services
export interface JobMatchPreferences {
  workLocationPreferences: string[];
  companySize: string[];
  companyValues: string[];
  workCulture: string[]; // Used by resumeAnalysisService
  workCulturePreferences?: string[]; // Legacy property for backward compatibility
  dealBreakers?: string[]; // Optional for onboarding
  salary?: {
    range: [number, number];
    negotiable: boolean;
  }; // Optional for onboarding
}

// ===== API RESPONSE TYPES =====
// Generic API response interface matching backend ApiResponse structure
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  pagination?: PaginationMeta;
  timestamp?: string;
}

// Standard error response interface for consistent error handling
export interface StandardErrorResponse {
  success: false;
  message: string;
  error: string;
  timestamp?: string;
}

// Pagination interfaces matching backend models
export interface PaginationParams {
  page: number; // Page number (starts from 1)
  limit: number; // Number of items per page (max 100)
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

// ===== BACKEND MODEL EQUIVALENTS =====
// Contact interface matching backend Contact model
export interface Contact {
  contact_id?: string;
  name: string;
  role?: string;
  email?: string;
  phone?: string;
  created_at?: string; // ISO date string for frontend compatibility
}

// Contact creation request matching backend ContactAddRequest
export interface ContactAddRequest {
  name: string;
  role?: string;
  email?: string;
  phone?: string;
}

// Note interfaces matching backend Note and NoteItem models
export interface Note {
  note_id?: string;
  content: string;
  created_at?: string; // ISO date string for frontend compatibility
}

export interface NoteItem {
  note_id: string;
  content: string;
  created_at: string; // ISO date string
}

// Note creation request matching backend NoteAddRequest
export interface NoteAddRequest {
  content: string;
}

// FavoriteJob interface matching backend FavoriteJob model
export interface FavoriteJob {
  favorite_job_id: string;
  user_id: string;
  job_title: string;
  company_name: string;
  link: string;
  saved_date: string; // ISO date string
  created_at: string; // ISO date string
  updated_at: string; // ISO date string
}

// FavoriteJob creation request matching backend FavoriteJobCreateRequest
export interface FavoriteJobCreateRequest {
  job_title: string;
  company_name: string;
  link: string;
}

// Interview-related interfaces matching backend models
export interface InterviewConfiguration {
  difficulty: string;
  language: string;
  question_set_id: string;
}

export interface InterviewQuestionSetCreateRequest {
  name: string;
  language: string;
  questions: string[];
}

export interface InterviewQuestionSetUpdateRequest {
  name?: string;
  language?: string;
  questions?: string[];
}

export interface InterviewCreateRequest {
  application_id: string;
  interview_type: 'mock' | 'practice' | 'real';
  configuration: InterviewConfiguration;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
}

export interface Interview {
  interview_id: string;
  user_id: string;
  application_id: string;
  interview_type: string;
  configuration: InterviewConfiguration;
  status: string;
  created_at: string; // ISO date string
  updated_at: string; // ISO date string
}

export interface InterviewAttemptCreateRequest {
  // Empty model for starting an attempt - all fields are server-generated
}

export interface InterviewAttemptUpdateRequest {
  status?: 'in_progress' | 'completed' | 'cancelled';
  score?: number; // 0-100
  end_time?: string; // ISO date string
  recording_url?: string;
  feedback_report_id?: string;
}

export interface InterviewAttempt {
  attempt_id: string;
  user_id: string;
  interview_id: string;
  status: string;
  score: number; // 0-100
  start_time: string; // ISO date string
  end_time?: string; // ISO date string
  recording_url?: string;
  feedback_report_id?: string;
  created_at: string; // ISO date string
  updated_at: string; // ISO date string
}

export interface InterviewQuestionSet {
  question_set_id: string;
  user_id: string;
  name: string;
  language: string;
  questions: string[];
  created_at: string; // ISO date string
  updated_at: string; // ISO date string
}

// ===== BACKEND-COMPATIBLE APPLICATION MODEL =====
// Backend-compatible Application interface (flattened structure)
export interface BackendApplication {
  application_id: string;
  user_id: string;
  job_title: string;
  company_name: string;
  job_description?: string;
  link_to_job_post?: string;
  status: string;
  application_date?: string; // ISO date string
  created_at: string; // ISO date string
  updated_at: string; // ISO date string
  contacts: Contact[];
  notes: Note[];
}

// Application creation request matching backend ApplicationCreateRequest
export interface ApplicationCreateRequest {
  job_title: string;
  company_name: string;
  job_description?: string;
  link_to_job_post?: string;
  status?: string;
  application_date?: string; // ISO date string
  contacts?: ContactAddRequest[];
  notes?: NoteAddRequest[];
}

// Application update request matching backend ApplicationUpdateRequest
export interface ApplicationUpdateRequest {
  job_title?: string;
  company_name?: string;
  job_description?: string;
  link_to_job_post?: string;
  status?: string;
  application_date?: string; // ISO date string
  contacts?: ContactAddRequest[];
  notes?: NoteAddRequest[];
}

// Status update request matching backend StatusUpdateRequest
export interface StatusUpdateRequest {
  status: string;
}

// ===== ENHANCED JOB TRACKER MODELS =====

export interface SalaryRange {
  min_amount?: number;
  max_amount?: number;
  currency?: string;
}

export interface RecruiterInfo {
  name?: string;
  email?: string;
  linkedin_profile_url?: string;
}

export interface AISummaries {
  job_description_summary?: string;
  fit_assessment?: string;
  next_step_suggestions?: string;
}

export interface EnhancedJobApplication {
  application_id: string;
  user_id: string;
  job_title: string;
  company_name: string;
  status: string;
  application_date?: string; // ISO date string
  created_at: string; // ISO date string
  updated_at: string; // ISO date string
  notes: Note[];
  contacts: Contact[];
  link_to_job_post?: string;
  location?: string;
  remote_policy?: 'on_site' | 'hybrid' | 'remote';
  job_type?: 'full_time' | 'part_time' | 'contract' | 'internship';
  salary_range?: SalaryRange;
  recruiter_info?: RecruiterInfo;
  source?: string;
  ai_summaries?: AISummaries;
  priority_score?: number;
  job_description?: string; // @google/genai: Added for AI tips feature
}

export interface PaginatedEnhancedApplicationsResponse {
  applications: EnhancedJobApplication[];
  pagination: PaginationMeta;
}
