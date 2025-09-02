/**
 * Types for Document Artisan feature
 */

export type DocumentGoal = 'preparation' | 'application' | 'post-interview';

export type DocumentType = 
  // Preparation & Networking
  | 'personal-brand-statement'
  | 'networking-email'
  | 'linkedin-message'
  | 'elevator-pitch'
  | 'company-research-notes'
  // Application Documents
  | 'tailored-resume'
  | 'targeted-cover-letter'
  | 'portfolio-document'
  | 'reference-list'
  | 'application-email'
  // Post-Interview & Offer
  | 'thank-you-note'
  | 'follow-up-inquiry'
  | 'salary-negotiation-script'
  | 'offer-acceptance-letter'
  | 'offer-decline-letter';

export interface DocumentGoalConfig {
  id: DocumentGoal;
  titleKey: string;
  descriptionKey: string;
  icon: string;
  color: string;
  documents: DocumentType[];
}

export interface DocumentTypeConfig {
  id: DocumentType;
  titleKey: string;
  descriptionKey: string;
  icon: string;
  estimatedTime: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

export interface DocumentSection {
  id: string;
  titleKey: string;
  type: 'text' | 'list' | 'contact' | 'date' | 'signature';
  required: boolean;
  placeholder?: string;
  maxLength?: number;
  suggestions?: string[];
}

export interface DocumentTemplate {
  id: string;
  documentType: DocumentType;
  sections: DocumentSection[];
  previewTemplate: string;
}

export interface DocumentData {
  id: string;
  userId: string;
  documentType: DocumentType;
  title: string;
  content: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  status: 'draft' | 'completed';
}

export interface EditorState {
  activeSection: string | null;
  previewMode: boolean;
  styleSettings: {
    theme: string;
    fontSize: number;
    fontFamily: string;
    spacing: number;
  };
}
