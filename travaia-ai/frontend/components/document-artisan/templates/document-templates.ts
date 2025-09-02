import { DocumentType, DocumentTemplate, DocumentSection } from '../types/document-artisan.types';

/**
 * Document templates with sections and structure
 */

const createSection = (
  id: string,
  titleKey: string,
  type: DocumentSection['type'],
  required: boolean = true,
  placeholder?: string,
  maxLength?: number,
  suggestions?: string[]
): DocumentSection => ({
  id,
  titleKey,
  type,
  required,
  placeholder,
  maxLength,
  suggestions
});

// Template definitions
const templates: Record<DocumentType, DocumentTemplate> = {
  // Preparation & Networking
  'personal-brand-statement': {
    id: 'personal-brand-statement',
    documentType: 'personal-brand-statement',
    sections: [
      createSection('introduction', 'documentArtisan.sections.introduction', 'text', true, 
        'Introduce yourself and your professional identity...', 200),
      createSection('value-proposition', 'documentArtisan.sections.valueProposition', 'text', true,
        'What unique value do you bring...', 300),
      createSection('key-strengths', 'documentArtisan.sections.keyStrengths', 'list', true),
      createSection('career-goals', 'documentArtisan.sections.careerGoals', 'text', true,
        'Where do you see your career heading...', 250)
    ],
    previewTemplate: 'brand-statement'
  },

  'networking-email': {
    id: 'networking-email',
    documentType: 'networking-email',
    sections: [
      createSection('subject-line', 'documentArtisan.sections.subjectLine', 'text', true,
        'Brief and compelling subject...', 60),
      createSection('greeting', 'documentArtisan.sections.greeting', 'text', true,
        'Dear [Name]...', 50),
      createSection('introduction', 'documentArtisan.sections.introduction', 'text', true,
        'Introduce yourself and connection...', 150),
      createSection('purpose', 'documentArtisan.sections.purpose', 'text', true,
        'Why are you reaching out...', 200),
      createSection('call-to-action', 'documentArtisan.sections.callToAction', 'text', true,
        'What would you like them to do...', 100),
      createSection('closing', 'documentArtisan.sections.closing', 'text', true,
        'Professional closing...', 50)
    ],
    previewTemplate: 'email'
  },

  'linkedin-message': {
    id: 'linkedin-message',
    documentType: 'linkedin-message',
    sections: [
      createSection('opening', 'documentArtisan.sections.opening', 'text', true,
        'Hi [Name], I noticed...', 100),
      createSection('connection-reason', 'documentArtisan.sections.connectionReason', 'text', true,
        'Why you want to connect...', 150),
      createSection('value-add', 'documentArtisan.sections.valueAdd', 'text', false,
        'What you can offer...', 100),
      createSection('closing', 'documentArtisan.sections.closing', 'text', true,
        'Looking forward to connecting...', 50)
    ],
    previewTemplate: 'message'
  },

  'elevator-pitch': {
    id: 'elevator-pitch',
    documentType: 'elevator-pitch',
    sections: [
      createSection('hook', 'documentArtisan.sections.hook', 'text', true,
        'Attention-grabbing opening...', 100),
      createSection('who-you-are', 'documentArtisan.sections.whoYouAre', 'text', true,
        'Your professional identity...', 150),
      createSection('what-you-do', 'documentArtisan.sections.whatYouDo', 'text', true,
        'Your key skills and experience...', 200),
      createSection('unique-value', 'documentArtisan.sections.uniqueValue', 'text', true,
        'What sets you apart...', 150),
      createSection('call-to-action', 'documentArtisan.sections.callToAction', 'text', true,
        'What you want from the listener...', 100)
    ],
    previewTemplate: 'pitch'
  },

  'company-research-notes': {
    id: 'company-research-notes',
    documentType: 'company-research-notes',
    sections: [
      createSection('company-overview', 'documentArtisan.sections.companyOverview', 'text', true,
        'Company mission, values, size...', 300),
      createSection('recent-news', 'documentArtisan.sections.recentNews', 'list', true),
      createSection('key-people', 'documentArtisan.sections.keyPeople', 'list', true),
      createSection('culture-insights', 'documentArtisan.sections.cultureInsights', 'text', true,
        'Company culture and work environment...', 250),
      createSection('interview-questions', 'documentArtisan.sections.interviewQuestions', 'list', false)
    ],
    previewTemplate: 'research-notes'
  },

  // Application Documents
  'tailored-resume': {
    id: 'tailored-resume',
    documentType: 'tailored-resume',
    sections: [
      createSection('contact-info', 'documentArtisan.sections.contactInfo', 'contact', true),
      createSection('professional-summary', 'documentArtisan.sections.professionalSummary', 'text', true,
        'Brief overview of your experience...', 200),
      createSection('key-skills', 'documentArtisan.sections.keySkills', 'list', true),
      createSection('work-experience', 'documentArtisan.sections.workExperience', 'text', true,
        'Relevant work experience...', 800),
      createSection('education', 'documentArtisan.sections.education', 'text', true,
        'Educational background...', 200),
      createSection('certifications', 'documentArtisan.sections.certifications', 'list', false)
    ],
    previewTemplate: 'resume'
  },

  'targeted-cover-letter': {
    id: 'targeted-cover-letter',
    documentType: 'targeted-cover-letter',
    sections: [
      createSection('header', 'documentArtisan.sections.header', 'contact', true),
      createSection('date', 'documentArtisan.sections.date', 'date', true),
      createSection('employer-address', 'documentArtisan.sections.employerAddress', 'contact', true),
      createSection('salutation', 'documentArtisan.sections.salutation', 'text', true,
        'Dear Hiring Manager...', 50),
      createSection('opening-paragraph', 'documentArtisan.sections.openingParagraph', 'text', true,
        'Position you are applying for...', 200),
      createSection('body-paragraph', 'documentArtisan.sections.bodyParagraph', 'text', true,
        'Why you are qualified...', 400),
      createSection('closing-paragraph', 'documentArtisan.sections.closingParagraph', 'text', true,
        'Call to action and next steps...', 150),
      createSection('signature', 'documentArtisan.sections.signature', 'signature', true)
    ],
    previewTemplate: 'cover-letter'
  },

  'portfolio-document': {
    id: 'portfolio-document',
    documentType: 'portfolio-document',
    sections: [
      createSection('title-page', 'documentArtisan.sections.titlePage', 'text', true,
        'Portfolio title and your name...', 100),
      createSection('about-me', 'documentArtisan.sections.aboutMe', 'text', true,
        'Brief professional introduction...', 300),
      createSection('project-list', 'documentArtisan.sections.projectList', 'list', true),
      createSection('skills-showcase', 'documentArtisan.sections.skillsShowcase', 'list', true),
      createSection('testimonials', 'documentArtisan.sections.testimonials', 'text', false,
        'Client or colleague testimonials...', 400)
    ],
    previewTemplate: 'portfolio'
  },

  'reference-list': {
    id: 'reference-list',
    documentType: 'reference-list',
    sections: [
      createSection('header', 'documentArtisan.sections.header', 'contact', true),
      createSection('reference-1', 'documentArtisan.sections.reference1', 'contact', true),
      createSection('reference-2', 'documentArtisan.sections.reference2', 'contact', true),
      createSection('reference-3', 'documentArtisan.sections.reference3', 'contact', false)
    ],
    previewTemplate: 'reference-list'
  },

  'application-email': {
    id: 'application-email',
    documentType: 'application-email',
    sections: [
      createSection('subject-line', 'documentArtisan.sections.subjectLine', 'text', true,
        'Application for [Position Title]...', 80),
      createSection('greeting', 'documentArtisan.sections.greeting', 'text', true,
        'Dear Hiring Manager...', 50),
      createSection('introduction', 'documentArtisan.sections.introduction', 'text', true,
        'Position you are applying for...', 150),
      createSection('qualifications', 'documentArtisan.sections.qualifications', 'text', true,
        'Brief overview of qualifications...', 250),
      createSection('attachments', 'documentArtisan.sections.attachments', 'text', true,
        'Mention attached documents...', 100),
      createSection('closing', 'documentArtisan.sections.closing', 'text', true,
        'Professional closing...', 100)
    ],
    previewTemplate: 'email'
  },

  // Post-Interview & Offer
  'thank-you-note': {
    id: 'thank-you-note',
    documentType: 'thank-you-note',
    sections: [
      createSection('subject-line', 'documentArtisan.sections.subjectLine', 'text', true,
        'Thank you for the interview...', 60),
      createSection('greeting', 'documentArtisan.sections.greeting', 'text', true,
        'Dear [Interviewer Name]...', 50),
      createSection('gratitude', 'documentArtisan.sections.gratitude', 'text', true,
        'Thank them for their time...', 150),
      createSection('key-points', 'documentArtisan.sections.keyPoints', 'text', true,
        'Reinforce key qualifications...', 200),
      createSection('additional-info', 'documentArtisan.sections.additionalInfo', 'text', false,
        'Any forgotten details...', 150),
      createSection('next-steps', 'documentArtisan.sections.nextSteps', 'text', true,
        'Express continued interest...', 100),
      createSection('closing', 'documentArtisan.sections.closing', 'text', true,
        'Professional closing...', 50)
    ],
    previewTemplate: 'email'
  },

  'follow-up-inquiry': {
    id: 'follow-up-inquiry',
    documentType: 'follow-up-inquiry',
    sections: [
      createSection('subject-line', 'documentArtisan.sections.subjectLine', 'text', true,
        'Following up on my application...', 60),
      createSection('greeting', 'documentArtisan.sections.greeting', 'text', true,
        'Dear [Name]...', 50),
      createSection('reference', 'documentArtisan.sections.reference', 'text', true,
        'Reference previous interaction...', 150),
      createSection('inquiry', 'documentArtisan.sections.inquiry', 'text', true,
        'Politely ask for update...', 150),
      createSection('value-reminder', 'documentArtisan.sections.valueReminder', 'text', true,
        'Briefly remind of your value...', 200),
      createSection('closing', 'documentArtisan.sections.closing', 'text', true,
        'Professional closing...', 100)
    ],
    previewTemplate: 'email'
  },

  'salary-negotiation-script': {
    id: 'salary-negotiation-script',
    documentType: 'salary-negotiation-script',
    sections: [
      createSection('opening', 'documentArtisan.sections.opening', 'text', true,
        'Express gratitude for offer...', 150),
      createSection('market-research', 'documentArtisan.sections.marketResearch', 'text', true,
        'Present salary research...', 200),
      createSection('value-proposition', 'documentArtisan.sections.valueProposition', 'text', true,
        'Highlight your unique value...', 250),
      createSection('counter-offer', 'documentArtisan.sections.counterOffer', 'text', true,
        'Present your counter-offer...', 150),
      createSection('flexibility', 'documentArtisan.sections.flexibility', 'text', true,
        'Show willingness to negotiate...', 150),
      createSection('closing', 'documentArtisan.sections.closing', 'text', true,
        'Professional closing...', 100)
    ],
    previewTemplate: 'script'
  },

  'offer-acceptance-letter': {
    id: 'offer-acceptance-letter',
    documentType: 'offer-acceptance-letter',
    sections: [
      createSection('date', 'documentArtisan.sections.date', 'date', true),
      createSection('employer-address', 'documentArtisan.sections.employerAddress', 'contact', true),
      createSection('greeting', 'documentArtisan.sections.greeting', 'text', true,
        'Dear [Hiring Manager]...', 50),
      createSection('acceptance', 'documentArtisan.sections.acceptance', 'text', true,
        'Formally accept the offer...', 150),
      createSection('terms-confirmation', 'documentArtisan.sections.termsConfirmation', 'text', true,
        'Confirm key terms...', 200),
      createSection('start-date', 'documentArtisan.sections.startDate', 'text', true,
        'Confirm start date...', 100),
      createSection('gratitude', 'documentArtisan.sections.gratitude', 'text', true,
        'Express enthusiasm...', 150),
      createSection('signature', 'documentArtisan.sections.signature', 'signature', true)
    ],
    previewTemplate: 'formal-letter'
  },

  'offer-decline-letter': {
    id: 'offer-decline-letter',
    documentType: 'offer-decline-letter',
    sections: [
      createSection('date', 'documentArtisan.sections.date', 'date', true),
      createSection('employer-address', 'documentArtisan.sections.employerAddress', 'contact', true),
      createSection('greeting', 'documentArtisan.sections.greeting', 'text', true,
        'Dear [Hiring Manager]...', 50),
      createSection('gratitude', 'documentArtisan.sections.gratitude', 'text', true,
        'Thank them for the opportunity...', 150),
      createSection('decline', 'documentArtisan.sections.decline', 'text', true,
        'Politely decline the offer...', 150),
      createSection('reason', 'documentArtisan.sections.reason', 'text', false,
        'Brief, professional reason...', 100),
      createSection('future-consideration', 'documentArtisan.sections.futureConsideration', 'text', true,
        'Keep door open for future...', 100),
      createSection('signature', 'documentArtisan.sections.signature', 'signature', true)
    ],
    previewTemplate: 'formal-letter'
  }
};

export const getDocumentTemplate = (documentType: DocumentType): DocumentTemplate | null => {
  return templates[documentType] || null;
};

export const getAllTemplates = (): DocumentTemplate[] => {
  return Object.values(templates);
};
