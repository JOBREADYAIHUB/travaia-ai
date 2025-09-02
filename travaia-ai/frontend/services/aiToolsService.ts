// Service for AI Tools, making calls to backend Genkit flows.
import { auth } from '../firebaseConfig';
// import { JobApplication } from '../types'; // JobApplication not directly used here

const getFirebaseIdToken = async (): Promise<string | null> => {
  const currentUser = auth.currentUser;
  if (currentUser) {
    return await currentUser.getIdToken(true);
  }
  return null;
};

const makeApiCall = async (
  endpoint: string,
  payload: any,
  method: 'POST' | 'GET' = 'POST',
) => {
  const token = await getFirebaseIdToken();
  if (!token) {
    throw new Error('User not authenticated.');
  }

  const options: RequestInit = {
    method: method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  };

  if (method === 'POST' && payload) {
    options.body = JSON.stringify(payload);
  }

  const response = await fetch(endpoint, options);

  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ message: response.statusText }));
    throw new Error(
      errorData.message ||
        `Error ${response.status} from backend calling ${endpoint}.`,
    );
  }
  return response.json();
};

// --- Resume/JD Matcher ---
interface JdMatcherPayload {
  documentText: string;
  jobDescriptionText: string;
  locale: string;
}
interface JdMatcherResponse {
  matchScore: number;
  suggestions: Array<{
    type: 'keyword' | 'skill_gap' | 'phrasing' | 'section' | 'general';
    detail: string;
    importance: 'high' | 'medium' | 'low';
  }>;
}
export const callJdMatcher = async (
  payload: JdMatcherPayload,
): Promise<JdMatcherResponse> => {
  return makeApiCall('/api/match/document-jd', payload);
};

// --- Company Insights ---
interface CompanyInsightsPayload {
  companyName: string;
  locale: string;
}
interface CompanyInsightsResponse {
  insights: {
    themes: string[];
    culturalAspects: string[];
    recentNewsSummary: string;
  };
  sources?: Array<{ title: string; uri: string }>;
}
export const callCompanyInsights = async (
  payload: CompanyInsightsPayload,
): Promise<CompanyInsightsResponse> => {
  return makeApiCall('/api/insights/company', payload);
};

// --- Skill Gap Analysis ---
interface SkillGapPayload {
  userSkills: string[];
  targetJobTitle: string;
  locale: string;
}
interface SkillGapResponse {
  suggestedSkills: string[];
}
export const callSkillGapAnalysis = async (
  payload: SkillGapPayload,
): Promise<SkillGapResponse> => {
  return makeApiCall('/api/skills/gap-analysis', payload);
};

// --- Content Generation (Examples) ---
interface GenerateArticleOutlinePayload {
  topic: string;
  keywords?: string[];
  locale: string;
}
interface GenerateArticleOutlineResponse {
  outline: string;
}
export const generateArticleOutline = async (
  payload: GenerateArticleOutlinePayload,
): Promise<GenerateArticleOutlineResponse> => {
  return makeApiCall('/api/generate/article-outline', payload);
};

interface GenerateFaqPayload {
  topic: string;
  numQuestions?: number;
  locale: string;
}
interface GenerateFaqResponse {
  faqs: Array<{ question: string; answer: string }>;
}
export const generateFaqs = async (
  payload: GenerateFaqPayload,
): Promise<GenerateFaqResponse> => {
  return makeApiCall('/api/generate/faq', payload);
};

interface SummarizeReportPayload {
  reportText: string;
  summaryLength?: 'short' | 'medium' | 'long';
  locale: string;
}
interface SummarizeReportResponse {
  summary: string;
}
export const summarizeReport = async (
  payload: SummarizeReportPayload,
): Promise<SummarizeReportResponse> => {
  return makeApiCall('/api/summarize/report', payload);
};

// --- AI-Powered Resume/Cover Letter Content Generation ---
export interface GenerateResumeSectionPayload {
  sectionType: 'summary' | 'experience_bullet' | 'skills_keywords';
  currentContent?: string;
  jobDescription?: string;
  userProfile?: {
    jobTitle?: string;
    yearsExperience?: number;
    keySkills?: string[];
  };
  locale: string;
}
export interface GenerateResumeSectionResponse {
  generatedText: string;
  suggestions?: string[];
}

export const generateResumeSectionWithAI = async (
  payload: GenerateResumeSectionPayload,
): Promise<GenerateResumeSectionResponse> => {
  return makeApiCall('/api/ai/resume/generate-section', payload);
};

export interface GenerateCoverLetterDraftPayload {
  jobTitle: string;
  companyName: string;
  resumeSummary?: string;
  jobDescriptionSummary?: string;
  tone?: 'professional' | 'enthusiastic' | 'formal' | 'friendly' | 'concise';
  locale: string;
}
export interface GenerateCoverLetterDraftResponse {
  draftContent: string;
}
export const generateCoverLetterDraftWithAI = async (
  payload: GenerateCoverLetterDraftPayload,
): Promise<GenerateCoverLetterDraftResponse> => {
  return makeApiCall('/api/ai/cover-letter/draft', payload);
};

// NLU for Reminder
interface NluReminderPayload {
  transcribedText: string;
  locale: string;
}
interface NluReminderResponse {
  intent: 'set_reminder' | 'unknown' | 'other_command';
  entities?: {
    task?: string;
    subject?: string;
    dateTime?: string;
  };
  originalText: string;
}
export const callNluForReminder = async (
  payload: NluReminderPayload,
): Promise<NluReminderResponse> => {
  return makeApiCall('/api/nlu/reminder', payload);
};
