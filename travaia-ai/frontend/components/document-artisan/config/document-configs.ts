import { DocumentGoalConfig, DocumentTypeConfig, DocumentGoal, DocumentType } from '../types/document-artisan.types';

/**
 * Configuration for document goals and types
 */

export const documentGoalConfigs: DocumentGoalConfig[] = [
  {
    id: 'preparation',
    titleKey: 'documentArtisan.goals.preparation.title',
    descriptionKey: 'documentArtisan.goals.preparation.description',
    icon: '🚀',
    color: 'text-blue-500',
    documents: [
      'personal-brand-statement',
      'networking-email',
      'linkedin-message',
      'elevator-pitch',
      'company-research-notes'
    ]
  },
  {
    id: 'application',
    titleKey: 'documentArtisan.goals.application.title',
    descriptionKey: 'documentArtisan.goals.application.description',
    icon: '📄',
    color: 'text-green-500',
    documents: [
      'tailored-resume',
      'targeted-cover-letter',
      'portfolio-document',
      'reference-list',
      'application-email'
    ]
  },
  {
    id: 'post-interview',
    titleKey: 'documentArtisan.goals.postInterview.title',
    descriptionKey: 'documentArtisan.goals.postInterview.description',
    icon: '🎯',
    color: 'text-purple-500',
    documents: [
      'thank-you-note',
      'follow-up-inquiry',
      'salary-negotiation-script',
      'offer-acceptance-letter',
      'offer-decline-letter'
    ]
  }
];

export const documentTypeConfigs: Record<DocumentType, DocumentTypeConfig> = {
  // Preparation & Networking
  'personal-brand-statement': {
    id: 'personal-brand-statement',
    titleKey: 'documentArtisan.documents.personalBrandStatement.title',
    descriptionKey: 'documentArtisan.documents.personalBrandStatement.description',
    icon: '✨',
    estimatedTime: '15-20 min',
    difficulty: 'intermediate'
  },
  'networking-email': {
    id: 'networking-email',
    titleKey: 'documentArtisan.documents.networkingEmail.title',
    descriptionKey: 'documentArtisan.documents.networkingEmail.description',
    icon: '📧',
    estimatedTime: '10-15 min',
    difficulty: 'beginner'
  },
  'linkedin-message': {
    id: 'linkedin-message',
    titleKey: 'documentArtisan.documents.linkedinMessage.title',
    descriptionKey: 'documentArtisan.documents.linkedinMessage.description',
    icon: '💼',
    estimatedTime: '5-10 min',
    difficulty: 'beginner'
  },
  'elevator-pitch': {
    id: 'elevator-pitch',
    titleKey: 'documentArtisan.documents.elevatorPitch.title',
    descriptionKey: 'documentArtisan.documents.elevatorPitch.description',
    icon: '🗣️',
    estimatedTime: '20-30 min',
    difficulty: 'intermediate'
  },
  'company-research-notes': {
    id: 'company-research-notes',
    titleKey: 'documentArtisan.documents.companyResearchNotes.title',
    descriptionKey: 'documentArtisan.documents.companyResearchNotes.description',
    icon: '🔍',
    estimatedTime: '30-45 min',
    difficulty: 'advanced'
  },

  // Application Documents
  'tailored-resume': {
    id: 'tailored-resume',
    titleKey: 'documentArtisan.documents.tailoredResume.title',
    descriptionKey: 'documentArtisan.documents.tailoredResume.description',
    icon: '📋',
    estimatedTime: '45-60 min',
    difficulty: 'advanced'
  },
  'targeted-cover-letter': {
    id: 'targeted-cover-letter',
    titleKey: 'documentArtisan.documents.targetedCoverLetter.title',
    descriptionKey: 'documentArtisan.documents.targetedCoverLetter.description',
    icon: '✉️',
    estimatedTime: '30-45 min',
    difficulty: 'intermediate'
  },
  'portfolio-document': {
    id: 'portfolio-document',
    titleKey: 'documentArtisan.documents.portfolioDocument.title',
    descriptionKey: 'documentArtisan.documents.portfolioDocument.description',
    icon: '🎨',
    estimatedTime: '60-90 min',
    difficulty: 'advanced'
  },
  'reference-list': {
    id: 'reference-list',
    titleKey: 'documentArtisan.documents.referenceList.title',
    descriptionKey: 'documentArtisan.documents.referenceList.description',
    icon: '👥',
    estimatedTime: '15-20 min',
    difficulty: 'beginner'
  },
  'application-email': {
    id: 'application-email',
    titleKey: 'documentArtisan.documents.applicationEmail.title',
    descriptionKey: 'documentArtisan.documents.applicationEmail.description',
    icon: '📨',
    estimatedTime: '10-15 min',
    difficulty: 'beginner'
  },

  // Post-Interview & Offer
  'thank-you-note': {
    id: 'thank-you-note',
    titleKey: 'documentArtisan.documents.thankYouNote.title',
    descriptionKey: 'documentArtisan.documents.thankYouNote.description',
    icon: '🙏',
    estimatedTime: '10-15 min',
    difficulty: 'beginner'
  },
  'follow-up-inquiry': {
    id: 'follow-up-inquiry',
    titleKey: 'documentArtisan.documents.followUpInquiry.title',
    descriptionKey: 'documentArtisan.documents.followUpInquiry.description',
    icon: '⏳',
    estimatedTime: '10-15 min',
    difficulty: 'intermediate'
  },
  'salary-negotiation-script': {
    id: 'salary-negotiation-script',
    titleKey: 'documentArtisan.documents.salaryNegotiationScript.title',
    descriptionKey: 'documentArtisan.documents.salaryNegotiationScript.description',
    icon: '💰',
    estimatedTime: '30-45 min',
    difficulty: 'advanced'
  },
  'offer-acceptance-letter': {
    id: 'offer-acceptance-letter',
    titleKey: 'documentArtisan.documents.offerAcceptanceLetter.title',
    descriptionKey: 'documentArtisan.documents.offerAcceptanceLetter.description',
    icon: '✅',
    estimatedTime: '15-20 min',
    difficulty: 'beginner'
  },
  'offer-decline-letter': {
    id: 'offer-decline-letter',
    titleKey: 'documentArtisan.documents.offerDeclineLetter.title',
    descriptionKey: 'documentArtisan.documents.offerDeclineLetter.description',
    icon: '❌',
    estimatedTime: '10-15 min',
    difficulty: 'beginner'
  }
};

export const getDifficultyColor = (difficulty: 'beginner' | 'intermediate' | 'advanced'): string => {
  switch (difficulty) {
    case 'beginner':
      return 'text-green-500 bg-green-100';
    case 'intermediate':
      return 'text-yellow-500 bg-yellow-100';
    case 'advanced':
      return 'text-red-500 bg-red-100';
    default:
      return 'text-gray-500 bg-gray-100';
  }
};
