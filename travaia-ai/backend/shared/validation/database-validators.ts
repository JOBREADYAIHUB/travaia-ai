import { z } from 'zod';
import { Timestamp } from 'firebase-admin/firestore';

// Base validation schemas
const timestampSchema = z.custom<Timestamp>((val) => val instanceof Timestamp);
const emailSchema = z.string().email().max(255);
const urlSchema = z.string().url().max(500).optional();
const phoneSchema = z.string().regex(/^\+?[\d\s\-\(\)]{10,20}$/).optional();

// Address validation
export const addressSchema = z.object({
  city: z.string().min(1).max(100),
  state: z.string().min(1).max(50),
  zip: z.string().regex(/^\d{5}(-\d{4})?$/)
});

// Education validation
export const educationItemSchema = z.object({
  id: z.string().uuid(),
  degree: z.string().min(1).max(200),
  institution: z.string().min(1).max(200),
  graduation_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  gpa: z.string().regex(/^\d{1}\.\d{1,2}$/).optional(),
  description: z.string().max(1000).optional()
});

// Experience validation
export const experienceItemSchema = z.object({
  id: z.string().uuid(),
  job_title: z.string().min(1).max(200),
  company: z.string().min(1).max(200),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  current_position: z.boolean(),
  description: z.string().min(1).max(2000),
  skills_used: z.array(z.string().max(50)).optional()
});

// User progress validation
export const userProgressSchema = z.object({
  xp: z.number().int().min(0).max(1000000),
  level: z.number().int().min(1).max(100),
  streak: z.number().int().min(0).max(365),
  weekly_challenge_id: z.string().uuid().optional(),
  last_activity_date: timestampSchema.optional(),
  achievements: z.array(z.string().max(100)).optional()
});

// User settings validation
export const userSettingsSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']),
  language: z.string().regex(/^[a-z]{2}(-[A-Z]{2})?$/),
  notifications_enabled: z.boolean(),
  email_notifications: z.boolean().optional(),
  push_notifications: z.boolean().optional(),
  privacy_settings: z.object({
    profile_visibility: z.enum(['public', 'private']),
    show_progress: z.boolean()
  }).optional()
});

// User profile data validation
export const userProfileDataSchema = z.object({
  first_name: z.string().min(1).max(50),
  last_name: z.string().min(1).max(50),
  phone: phoneSchema,
  address: addressSchema.optional(),
  linkedin_url: urlSchema,
  portfolio_url: urlSchema,
  skills: z.array(z.string().min(1).max(50)).max(100),
  education: z.array(educationItemSchema).max(20),
  experience: z.array(experienceItemSchema).max(50),
  bio: z.string().max(500).optional(),
  profile_image_url: urlSchema
});

// User validation
export const userSchema = z.object({
  user_id: z.string().uuid(),
  email: emailSchema,
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_-]+$/),
  profile_data: userProfileDataSchema,
  progress: userProgressSchema,
  settings: userSettingsSchema,
  email_verified: z.boolean(),
  last_login: timestampSchema.optional(),
  status: z.enum(['active', 'inactive', 'suspended']),
  created_at: timestampSchema,
  updated_at: timestampSchema
});

// Contact item validation
export const contactItemSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  title: z.string().max(100).optional(),
  email: emailSchema.optional(),
  phone: phoneSchema,
  linkedin_url: urlSchema,
  notes: z.string().max(500).optional(),
  contact_date: timestampSchema.optional()
});

// Note item validation
export const noteItemSchema = z.object({
  id: z.string().uuid(),
  content: z.string().min(1).max(2000),
  created_at: timestampSchema,
  updated_at: timestampSchema,
  tags: z.array(z.string().max(30)).max(10).optional(),
  priority: z.enum(['low', 'medium', 'high']).optional()
});

// Application validation
export const applicationSchema = z.object({
  application_id: z.string().uuid(),
  user_id: z.string().uuid(),
  job_title: z.string().min(1).max(200),
  company_name: z.string().min(1).max(200),
  link_to_job_post: urlSchema,
  job_description_text: z.string().max(10000).optional(),
  status: z.enum(['applied', 'interviewing', 'offered', 'rejected', 'withdrawn', 'saved']),
  application_date: timestampSchema,
  contacts: z.array(contactItemSchema).max(20),
  notes: z.array(noteItemSchema).max(100),
  ai_job_fit_report_id: z.string().uuid().optional(),
  salary_range: z.object({
    min: z.number().int().min(0),
    max: z.number().int().min(0),
    currency: z.string().length(3)
  }).optional(),
  location: z.object({
    city: z.string().max(100),
    state: z.string().max(50),
    country: z.string().max(100),
    remote: z.boolean()
  }).optional(),
  deadline: timestampSchema.optional(),
  created_at: timestampSchema,
  updated_at: timestampSchema
});

// Favorite job validation
export const favoriteJobSchema = z.object({
  favorite_job_id: z.string().uuid(),
  user_id: z.string().uuid(),
  job_title: z.string().min(1).max(200),
  company_name: z.string().min(1).max(200),
  link: z.string().url().max(500),
  saved_date: timestampSchema,
  job_description: z.string().max(5000).optional(),
  salary_range: z.object({
    min: z.number().int().min(0),
    max: z.number().int().min(0),
    currency: z.string().length(3)
  }).optional(),
  location: z.string().max(200).optional(),
  tags: z.array(z.string().max(30)).max(10).optional(),
  created_at: timestampSchema,
  updated_at: timestampSchema
});

// Interview question set validation
export const interviewQuestionSetSchema = z.object({
  question_set_id: z.string().uuid(),
  user_id: z.string().uuid(),
  name: z.string().min(1).max(200),
  language: z.string().regex(/^[a-z]{2}(-[A-Z]{2})?$/),
  questions: z.array(z.string().min(10).max(1000)).min(1).max(100),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  category: z.string().max(50).optional(),
  tags: z.array(z.string().max(30)).max(10).optional(),
  is_public: z.boolean(),
  usage_count: z.number().int().min(0).optional(),
  created_at: timestampSchema,
  updated_at: timestampSchema
});

// Interview configuration validation
export const interviewConfigurationSchema = z.object({
  difficulty: z.enum(['easy', 'medium', 'hard']),
  language: z.string().regex(/^[a-z]{2}(-[A-Z]{2})?$/),
  question_set_id: z.string().uuid(),
  duration_minutes: z.number().int().min(5).max(180).optional(),
  question_count: z.number().int().min(1).max(50).optional(),
  enable_recording: z.boolean().optional(),
  enable_ai_feedback: z.boolean().optional()
});

// Interview validation
export const interviewSchema = z.object({
  interview_id: z.string().uuid(),
  user_id: z.string().uuid(),
  application_id: z.string().uuid().optional(),
  interview_type: z.enum(['mock', 'practice', 'real', 'assessment']),
  configuration: interviewConfigurationSchema,
  status: z.enum(['scheduled', 'in_progress', 'completed', 'cancelled', 'failed']),
  scheduled_date: timestampSchema.optional(),
  total_attempts: z.number().int().min(0),
  best_score: z.number().min(0).max(100).optional(),
  average_score: z.number().min(0).max(100).optional(),
  created_at: timestampSchema,
  updated_at: timestampSchema
});

// Interview attempt validation
export const interviewAttemptSchema = z.object({
  attempt_id: z.string().uuid(),
  interview_id: z.string().uuid(),
  score: z.number().min(0).max(100),
  start_time: timestampSchema,
  end_time: timestampSchema.optional(),
  recording_url: urlSchema,
  feedback_report_id: z.string().uuid().optional(),
  questions_answered: z.number().int().min(0),
  total_questions: z.number().int().min(1),
  duration_seconds: z.number().int().min(0),
  status: z.enum(['in_progress', 'completed', 'abandoned']),
  answers: z.array(z.object({
    question: z.string().max(1000),
    answer: z.string().max(5000),
    score: z.number().min(0).max(100).optional(),
    feedback: z.string().max(1000).optional()
  })).optional(),
  created_at: timestampSchema,
  updated_at: timestampSchema
});

// AI report content validation
export const aiReportContentSchema = z.object({
  score: z.number().min(0).max(100),
  strengths: z.array(z.string().max(200)).max(20),
  weaknesses: z.array(z.string().max(200)).max(20),
  detailed_feedback: z.string().max(5000),
  transcription: z.string().max(50000).optional(),
  recommendations: z.array(z.string().max(300)).max(10).optional(),
  improvement_areas: z.array(z.object({
    area: z.string().max(100),
    priority: z.enum(['low', 'medium', 'high']),
    suggestions: z.array(z.string().max(200)).max(5)
  })).max(10).optional(),
  skill_assessment: z.record(z.object({
    score: z.number().min(0).max(100),
    feedback: z.string().max(500)
  })).optional()
});

// AI report validation
export const aiReportSchema = z.object({
  report_id: z.string().uuid(),
  user_id: z.string().uuid(),
  application_id: z.string().uuid().optional(),
  interview_id: z.string().uuid().optional(),
  report_type: z.enum(['job_fit', 'interview_feedback', 'skill_assessment', 'resume_analysis']),
  generated_at: timestampSchema,
  content: aiReportContentSchema,
  version: z.string().max(20),
  ai_model_used: z.string().max(50).optional(),
  confidence_score: z.number().min(0).max(1).optional(),
  processing_time_ms: z.number().int().min(0).optional(),
  created_at: timestampSchema,
  updated_at: timestampSchema
});

// Document validation
export const documentSchema = z.object({
  document_id: z.string().uuid(),
  user_id: z.string().uuid(),
  application_id: z.string().uuid().optional(),
  file_name: z.string().min(1).max(255),
  file_url: z.string().url().max(500),
  type: z.enum(['resume', 'cover_letter', 'portfolio', 'certificate', 'transcript', 'other']),
  file_size_bytes: z.number().int().min(1).max(50 * 1024 * 1024), // 50MB max
  mime_type: z.string().max(100),
  template_id: z.string().uuid().optional(),
  version: z.string().max(20).optional(),
  is_primary: z.boolean().optional(),
  tags: z.array(z.string().max(30)).max(10).optional(),
  access_level: z.enum(['private', 'shared', 'public']),
  created_at: timestampSchema,
  updated_at: timestampSchema
});

// Resume version data validation
export const resumeVersionDataSchema = z.object({
  personal_info: userProfileDataSchema,
  sections: z.record(z.any()),
  template_settings: z.object({
    template_id: z.string().uuid(),
    theme: z.string().max(50),
    font_family: z.string().max(50),
    font_size: z.number().min(8).max(24),
    color_scheme: z.string().max(50)
  }).optional(),
  custom_sections: z.array(z.object({
    id: z.string().uuid(),
    title: z.string().max(100),
    content: z.any(),
    order: z.number().int().min(0)
  })).optional()
});

// Resume version validation
export const resumeVersionSchema = z.object({
  version_id: z.string().uuid(),
  user_id: z.string().uuid(),
  name: z.string().min(1).max(200),
  description: z.string().max(500).optional(),
  version_data: resumeVersionDataSchema,
  is_active: z.boolean(),
  template_id: z.string().uuid().optional(),
  generated_document_id: z.string().uuid().optional(),
  usage_count: z.number().int().min(0).optional(),
  last_used: timestampSchema.optional(),
  created_at: timestampSchema,
  updated_at: timestampSchema
});

// Resume template validation
export const resumeTemplateSchema = z.object({
  template_id: z.string().uuid(),
  name: z.string().min(1).max(200),
  description: z.string().max(1000),
  html_url: z.string().url().max(500),
  css_url: z.string().url().max(500),
  preview_url: z.string().url().max(500),
  tags: z.array(z.string().max(30)).max(20),
  category: z.string().max(50),
  difficulty_level: z.enum(['beginner', 'intermediate', 'advanced']),
  is_premium: z.boolean(),
  usage_count: z.number().int().min(0),
  rating: z.number().min(0).max(5).optional(),
  author: z.string().max(100).optional(),
  version: z.string().max(20),
  supported_sections: z.array(z.string().max(50)),
  customization_options: z.object({
    colors: z.boolean(),
    fonts: z.boolean(),
    layout: z.boolean(),
    sections: z.boolean()
  }).optional(),
  created_at: timestampSchema,
  updated_at: timestampSchema
});

// Validation helper functions
export class DatabaseValidator {
  static validateUser(data: any) {
    return userSchema.parse(data);
  }

  static validateApplication(data: any) {
    return applicationSchema.parse(data);
  }

  static validateFavoriteJob(data: any) {
    return favoriteJobSchema.parse(data);
  }

  static validateInterviewQuestionSet(data: any) {
    return interviewQuestionSetSchema.parse(data);
  }

  static validateInterview(data: any) {
    return interviewSchema.parse(data);
  }

  static validateInterviewAttempt(data: any) {
    return interviewAttemptSchema.parse(data);
  }

  static validateAIReport(data: any) {
    return aiReportSchema.parse(data);
  }

  static validateDocument(data: any) {
    return documentSchema.parse(data);
  }

  static validateResumeVersion(data: any) {
    return resumeVersionSchema.parse(data);
  }

  static validateResumeTemplate(data: any) {
    return resumeTemplateSchema.parse(data);
  }

  // Partial validation for updates
  static validateUserUpdate(data: any) {
    return userSchema.partial().parse(data);
  }

  static validateApplicationUpdate(data: any) {
    return applicationSchema.partial().parse(data);
  }

  // Custom validation rules
  static validateDateRange(startDate: string, endDate?: string) {
    if (!endDate) return true;
    return new Date(startDate) <= new Date(endDate);
  }

  static validateSalaryRange(min: number, max: number) {
    return min <= max && min >= 0;
  }

  static validateFileSize(sizeBytes: number, maxSizeMB: number = 50) {
    return sizeBytes <= maxSizeMB * 1024 * 1024;
  }

  static validateImageFile(mimeType: string) {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    return allowedTypes.includes(mimeType);
  }

  static validateDocumentFile(mimeType: string) {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];
    return allowedTypes.includes(mimeType);
  }
}

// Export validation schemas
export {
  userSchema,
  applicationSchema,
  favoriteJobSchema,
  interviewQuestionSetSchema,
  interviewSchema,
  interviewAttemptSchema,
  aiReportSchema,
  documentSchema,
  resumeVersionSchema,
  resumeTemplateSchema
};
