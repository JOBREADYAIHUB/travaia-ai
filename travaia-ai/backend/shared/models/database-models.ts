import { Timestamp, DocumentReference } from 'firebase-admin/firestore';

// Base interface for all documents
export interface BaseDocument {
  created_at: Timestamp;
  updated_at: Timestamp;
}

// User Profile Data Types
export interface Address {
  city: string;
  state: string;
  zip: string;
}

export interface EducationItem {
  id: string;
  degree: string;
  institution: string;
  graduation_date: string;
  gpa?: string;
  description?: string;
}

export interface ExperienceItem {
  id: string;
  job_title: string;
  company: string;
  start_date: string;
  end_date?: string;
  current_position: boolean;
  description: string;
  skills_used?: string[];
}

export interface UserProgress {
  xp: number;
  level: number;
  streak: number;
  weekly_challenge_id?: string;
  last_activity_date?: Timestamp;
  achievements?: string[];
}

export interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  language: string;
  notifications_enabled: boolean;
  email_notifications?: boolean;
  push_notifications?: boolean;
  privacy_settings?: {
    profile_visibility: 'public' | 'private';
    show_progress: boolean;
  };
}

export interface UserProfileData {
  first_name: string;
  last_name: string;
  phone?: string;
  address?: Address;
  linkedin_url?: string;
  portfolio_url?: string;
  skills: string[];
  education: EducationItem[];
  experience: ExperienceItem[];
  bio?: string;
  profile_image_url?: string;
}

// User Model
export interface User extends BaseDocument {
  user_id: string;
  email: string;
  username: string;
  profile_data: UserProfileData;
  progress: UserProgress;
  settings: UserSettings;
  email_verified: boolean;
  last_login?: Timestamp;
  status: 'active' | 'inactive' | 'suspended';
}

// Application Related Types
export interface ContactItem {
  id: string;
  name: string;
  title?: string;
  email?: string;
  phone?: string;
  linkedin_url?: string;
  notes?: string;
  contact_date?: Timestamp;
}

export interface NoteItem {
  id: string;
  content: string;
  created_at: Timestamp;
  updated_at: Timestamp;
  tags?: string[];
  priority?: 'low' | 'medium' | 'high';
}

// Application Model
export interface Application extends BaseDocument {
  application_id: string;
  user_id: string; // Reference to users collection
  job_title: string;
  company_name: string;
  link_to_job_post?: string;
  job_description_text?: string;
  status: 'applied' | 'interviewing' | 'offered' | 'rejected' | 'withdrawn' | 'saved';
  application_date: Timestamp;
  contacts: ContactItem[];
  notes: NoteItem[];
  ai_job_fit_report_id?: string; // Reference to ai_reports collection
  salary_range?: {
    min: number;
    max: number;
    currency: string;
  };
  location?: {
    city: string;
    state: string;
    country: string;
    remote: boolean;
  };
  deadline?: Timestamp;
}

// Favorite Jobs Model
export interface FavoriteJob extends BaseDocument {
  favorite_job_id: string;
  user_id: string; // Reference to users collection
  job_title: string;
  company_name: string;
  link: string;
  saved_date: Timestamp;
  job_description?: string;
  salary_range?: {
    min: number;
    max: number;
    currency: string;
  };
  location?: string;
  tags?: string[];
}

// Interview Questions Model
export interface InterviewQuestionSet extends BaseDocument {
  question_set_id: string;
  user_id: string; // Reference to users collection
  name: string;
  language: string;
  questions: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  category?: string;
  tags?: string[];
  is_public: boolean;
  usage_count?: number;
}

// Interview Configuration
export interface InterviewConfiguration {
  difficulty: 'easy' | 'medium' | 'hard';
  language: string;
  question_set_id: string; // Reference to interview_questions collection
  duration_minutes?: number;
  question_count?: number;
  enable_recording?: boolean;
  enable_ai_feedback?: boolean;
}

// Interview Model
export interface Interview extends BaseDocument {
  interview_id: string;
  user_id: string; // Reference to users collection
  application_id?: string; // Reference to applications collection
  interview_type: 'mock' | 'practice' | 'real' | 'assessment';
  configuration: InterviewConfiguration;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'failed';
  scheduled_date?: Timestamp;
  total_attempts: number;
  best_score?: number;
  average_score?: number;
}

// Interview Attempts Sub-collection
export interface InterviewAttempt extends BaseDocument {
  attempt_id: string;
  interview_id: string; // Parent interview reference
  score: number;
  start_time: Timestamp;
  end_time?: Timestamp;
  recording_url?: string;
  feedback_report_id?: string; // Reference to ai_reports collection
  questions_answered: number;
  total_questions: number;
  duration_seconds: number;
  status: 'in_progress' | 'completed' | 'abandoned';
  answers?: {
    question: string;
    answer: string;
    score?: number;
    feedback?: string;
  }[];
}

// AI Report Content Types
export interface AIReportContent {
  score: number;
  strengths: string[];
  weaknesses: string[];
  detailed_feedback: string;
  transcription?: string;
  recommendations?: string[];
  improvement_areas?: {
    area: string;
    priority: 'low' | 'medium' | 'high';
    suggestions: string[];
  }[];
  skill_assessment?: {
    [skill: string]: {
      score: number;
      feedback: string;
    };
  };
}

// AI Reports Model
export interface AIReport extends BaseDocument {
  report_id: string;
  user_id: string; // Reference to users collection
  application_id?: string; // Reference to applications collection
  interview_id?: string; // Reference to interviews collection
  report_type: 'job_fit' | 'interview_feedback' | 'skill_assessment' | 'resume_analysis';
  generated_at: Timestamp;
  content: AIReportContent;
  version: string;
  ai_model_used?: string;
  confidence_score?: number;
  processing_time_ms?: number;
}

// Documents Model
export interface Document extends BaseDocument {
  document_id: string;
  user_id: string; // Reference to users collection
  application_id?: string; // Reference to applications collection
  file_name: string;
  file_url: string;
  type: 'resume' | 'cover_letter' | 'portfolio' | 'certificate' | 'transcript' | 'other';
  file_size_bytes: number;
  mime_type: string;
  template_id?: string; // Reference to resume_templates collection
  version?: string;
  is_primary?: boolean;
  tags?: string[];
  access_level: 'private' | 'shared' | 'public';
}

// Resume Version Data
export interface ResumeVersionData {
  personal_info: UserProfileData;
  sections: {
    [section: string]: any;
  };
  template_settings?: {
    template_id: string;
    theme: string;
    font_family: string;
    font_size: number;
    color_scheme: string;
  };
  custom_sections?: {
    id: string;
    title: string;
    content: any;
    order: number;
  }[];
}

// Resume Versions Model
export interface ResumeVersion extends BaseDocument {
  version_id: string;
  user_id: string; // Reference to users collection
  name: string;
  description?: string;
  version_data: ResumeVersionData;
  is_active: boolean;
  template_id?: string; // Reference to resume_templates collection
  generated_document_id?: string; // Reference to documents collection
  usage_count?: number;
  last_used?: Timestamp;
}

// Resume Templates Model
export interface ResumeTemplate extends BaseDocument {
  template_id: string;
  name: string;
  description: string;
  html_url: string;
  css_url: string;
  preview_url: string;
  tags: string[];
  category: string;
  difficulty_level: 'beginner' | 'intermediate' | 'advanced';
  is_premium: boolean;
  usage_count: number;
  rating?: number;
  author?: string;
  version: string;
  supported_sections: string[];
  customization_options?: {
    colors: boolean;
    fonts: boolean;
    layout: boolean;
    sections: boolean;
  };
}

// Collection names as constants
export const COLLECTIONS = {
  USERS: 'users',
  APPLICATIONS: 'applications',
  FAVORITE_JOBS: 'favorite_jobs',
  INTERVIEW_QUESTIONS: 'interview_questions',
  INTERVIEWS: 'interviews',
  INTERVIEW_ATTEMPTS: 'interview_attempts', // Sub-collection of interviews
  AI_REPORTS: 'ai_reports',
  DOCUMENTS: 'documents',
  RESUME_VERSIONS: 'resume_versions',
  RESUME_TEMPLATES: 'resume_templates'
} as const;

// Type guards for runtime validation
export const isValidUser = (data: any): data is User => {
  return data && 
    typeof data.user_id === 'string' &&
    typeof data.email === 'string' &&
    typeof data.username === 'string' &&
    data.profile_data &&
    data.progress &&
    data.settings;
};

export const isValidApplication = (data: any): data is Application => {
  return data &&
    typeof data.application_id === 'string' &&
    typeof data.user_id === 'string' &&
    typeof data.job_title === 'string' &&
    typeof data.company_name === 'string' &&
    ['applied', 'interviewing', 'offered', 'rejected', 'withdrawn', 'saved'].includes(data.status);
};

// Export all types for use across the application
export type {
  BaseDocument,
  Address,
  EducationItem,
  ExperienceItem,
  UserProgress,
  UserSettings,
  UserProfileData,
  User,
  ContactItem,
  NoteItem,
  Application,
  FavoriteJob,
  InterviewQuestionSet,
  InterviewConfiguration,
  Interview,
  InterviewAttempt,
  AIReportContent,
  AIReport,
  Document,
  ResumeVersionData,
  ResumeVersion,
  ResumeTemplate
};
