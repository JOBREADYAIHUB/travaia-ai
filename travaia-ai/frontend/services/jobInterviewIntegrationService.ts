/**
 * Job Tracker and Interview Integration Service
 * Provides seamless linking between job applications and interview practice
 */

import { JobApplication, InterviewSettings, InterviewMode } from '../types';

export interface JobInterviewIntegration {
  applicationId: string;
  companyName: string;
  position: string;
  interviewType: 'phone' | 'video' | 'in-person' | 'panel' | 'technical';
  interviewDate?: string;
  interviewerName?: string;
  jobDescription?: string;
  requiredSkills?: string[];
  companyInfo?: {
    industry: string;
    size: string;
    culture: string;
    values: string[];
  };
  preparationTasks: {
    id: string;
    title: string;
    completed: boolean;
    type: 'research' | 'practice' | 'technical' | 'behavioral';
  }[];
}

/**
 * Convert JobApplication to InterviewSettings for seamless integration
 */
export const convertJobApplicationToInterviewSettings = (
  application: JobApplication,
  interviewMode: InterviewMode = InterviewMode.TEXT
): InterviewSettings => {
  const settings: InterviewSettings = {
    interviewMode,
    difficulty: 'intermediate', // Default, can be customized
    duration: 30, // Default 30 minutes
    focusAreas: [],
    language: 'en',
    
    // Job-specific context
    jobTitle: application.position || application.jobTitle || '',
    companyName: application.company?.name || application.companyName || '',
    jobDescription: application.jobDescription || application.description || '',
    
    // Extract skills from job description or requirements
    requiredSkills: extractSkillsFromJobApplication(application),
    
    // Company context for personalized questions
    companyInfo: {
      industry: application.company?.industry || application.industry || '',
      size: application.company?.size || '',
      culture: application.company?.culture || '',
      values: application.company?.values || [],
    },
    
    // Interview type context
    interviewType: determineInterviewType(application),
    
    // Preparation context
    preparationLevel: calculatePreparationLevel(application),
  };

  return settings;
};

/**
 * Extract relevant skills from job application
 */
export const extractSkillsFromJobApplication = (application: JobApplication): string[] => {
  const skills: string[] = [];
  
  // From job description using keyword extraction
  const jobText = (application.jobDescription || '').toLowerCase();
  const commonSkills = [
    'javascript', 'typescript', 'react', 'node.js', 'python', 'java', 'sql',
    'aws', 'docker', 'kubernetes', 'git', 'agile', 'scrum', 'leadership',
    'communication', 'problem-solving', 'teamwork', 'project management'
  ];
  
  commonSkills.forEach(skill => {
    if (jobText.includes(skill.toLowerCase()) && !skills.includes(skill)) {
      skills.push(skill);
    }
  });
  
  return skills.slice(0, 10); // Limit to top 10 skills
};

/**
 * Determine interview type based on job application data
 */
const determineInterviewType = (application: JobApplication): string => {
  const position = (application.position || application.jobTitle || '').toLowerCase();
  const description = (application.jobDescription || application.description || '').toLowerCase();
  
  if (position.includes('senior') || position.includes('lead') || position.includes('manager')) {
    return 'behavioral-leadership';
  }
  
  if (position.includes('engineer') || position.includes('developer') || description.includes('coding')) {
    return 'technical';
  }
  
  if (position.includes('sales') || position.includes('marketing')) {
    return 'behavioral-sales';
  }
  
  return 'general';
};

/**
 * Calculate preparation level based on completed tasks and application status
 */
const calculatePreparationLevel = (application: JobApplication): 'beginner' | 'intermediate' | 'advanced' => {
  const tasks = application.progressTasks || [];
  const completedTasks = tasks.filter(task => task.completed);
  const completionRate = tasks.length > 0 ? completedTasks.length / tasks.length : 0;
  
  if (completionRate >= 0.8) return 'advanced';
  if (completionRate >= 0.5) return 'intermediate';
  return 'beginner';
};

/**
 * Generate interview preparation tasks based on job application
 */
export const generateInterviewPreparationTasks = (application: JobApplication) => {
  const tasks = [];
  const companyName = application.company?.name || application.companyName || 'the company';
  
  // Company research task
  tasks.push({
    id: `research_${application.id}`,
    type: 'research_company' as const,
    title: `Research ${companyName}`,
    description: `Learn about ${companyName}'s mission, values, recent news, and company culture`,
    completed: false,
    createdAt: new Date().toISOString(),
    priority: 'high' as const,
    estimatedTime: 30,
  });
  
  // Role-specific preparation
  tasks.push({
    id: `role_prep_${application.id}`,
    type: 'prepare_interview' as const,
    title: `Prepare for ${application.position || 'the role'}`,
    description: `Practice common questions for ${application.position || 'this position'} and prepare STAR method examples`,
    completed: false,
    createdAt: new Date().toISOString(),
    priority: 'high' as const,
    estimatedTime: 45,
  });
  
  // Technical preparation (if applicable)
  const skills = extractSkillsFromJobApplication(application);
  if (skills.length > 0) {
    tasks.push({
      id: `technical_prep_${application.id}`,
      type: 'prepare_interview' as const,
      title: 'Technical Skills Review',
      description: `Review and practice: ${skills.slice(0, 5).join(', ')}`,
      completed: false,
      createdAt: new Date().toISOString(),
      priority: 'medium' as const,
      estimatedTime: 60,
    });
  }
  
  // Mock interview practice
  tasks.push({
    id: `mock_interview_${application.id}`,
    type: 'prepare_interview' as const,
    title: 'Complete Mock Interview',
    description: `Practice with TRAVAIA's AI interviewer using your job-specific context`,
    completed: false,
    createdAt: new Date().toISOString(),
    priority: 'high' as const,
    estimatedTime: 30,
    actionable: true, // This task can trigger navigation to interview
  });
  
  return tasks;
};

/**
 * Create interview session context from job application
 */
export const createInterviewSessionContext = (application: JobApplication) => {
  return {
    jobContext: {
      company: application.company?.name || application.companyName,
      position: application.position || application.jobTitle,
      description: application.jobDescription || application.description,
      requirements: application.requiredSkills || [],
      industry: application.company?.industry || application.industry,
    },
    interviewContext: {
      type: determineInterviewType(application),
      preparationLevel: calculatePreparationLevel(application),
      focusAreas: extractSkillsFromJobApplication(application).slice(0, 5),
    },
    userContext: {
      applicationId: application.id,
      applicationStatus: application.status,
      appliedDate: application.appliedDate,
      interviewDate: application.interviewDate,
    },
  };
};

/**
 * Generate personalized interview questions based on job application
 */
export const generatePersonalizedQuestions = (application: JobApplication): string[] => {
  const questions: string[] = [];
  const companyName = application.company?.name || application.companyName || 'our company';
  const position = application.position || application.jobTitle || 'this role';
  
  // Company-specific questions
  questions.push(`Why do you want to work at ${companyName}?`);
  questions.push(`What do you know about ${companyName}'s mission and values?`);
  
  // Role-specific questions
  questions.push(`What interests you most about the ${position} position?`);
  questions.push(`How does your experience align with the requirements for ${position}?`);
  
  // Skill-based questions
  const skills = extractSkillsFromJobApplication(application);
  if (skills.length > 0) {
    questions.push(`Can you describe your experience with ${skills[0]}?`);
    if (skills.length > 1) {
      questions.push(`How have you used ${skills[1]} in your previous projects?`);
    }
  }
  
  // Behavioral questions based on job requirements
  const jobText = (application.jobDescription || '').toLowerCase();
  if (jobText.includes('team') || jobText.includes('collaboration')) {
    questions.push('Tell me about a time when you had to work with a difficult team member.');
  }
  
  if (jobText.includes('leadership') || jobText.includes('lead')) {
    questions.push('Describe a situation where you had to lead a project or team.');
  }
  
  if (jobText.includes('problem') || jobText.includes('challenge')) {
    questions.push('Walk me through how you approach solving complex problems.');
  }
  
  return questions.slice(0, 8); // Limit to 8 personalized questions
};

/**
 * Track interview completion and update job application
 */
export const updateJobApplicationAfterInterview = (
  application: JobApplication,
  interviewResults: {
    score: number;
    feedback: string;
    completedAt: string;
    duration: number;
    questionsAnswered: number;
  }
) => {
  const updatedApplication: JobApplication = {
    ...application,
    
    // Update interview preparation task as completed
    progressTasks: (application.progressTasks || []).map(task => 
      task.type === 'prepare_interview' && task.title.includes('Mock Interview')
        ? { ...task, completed: true, completedAt: interviewResults.completedAt }
        : task
    ),
    
    // Add interview practice record
    interviewPracticeHistory: [
      ...(application.interviewPracticeHistory || []),
      {
        id: `practice_${Date.now()}`,
        completedAt: interviewResults.completedAt,
        score: interviewResults.score,
        feedback: interviewResults.feedback,
        duration: interviewResults.duration,
        questionsAnswered: interviewResults.questionsAnswered,
        type: 'mock_interview',
      }
    ],
    
    // Update last activity
    updatedAt: interviewResults.completedAt,
  };
  
  return updatedApplication;
};

/**
 * Get interview readiness score based on preparation tasks
 */
export const calculateInterviewReadiness = (application: JobApplication): {
  score: number;
  level: 'not-ready' | 'partially-ready' | 'ready' | 'well-prepared';
  recommendations: string[];
} => {
  const tasks = application.progressTasks || [];
  const completedTasks = tasks.filter(task => task.completed);
  const completionRate = tasks.length > 0 ? completedTasks.length / tasks.length : 0;
  
  const hasCompanyResearch = tasks.some(task => 
    task.type === 'research_company' && task.completed
  );
  
  const hasInterviewPrep = tasks.some(task => 
    task.type === 'prepare_interview' && task.completed
  );
  
  const hasMockInterview = (application.interviewPracticeHistory || []).length > 0;
  
  let score = 0;
  const recommendations: string[] = [];
  
  // Base score from task completion
  score += completionRate * 40;
  
  // Bonus points for specific preparations
  if (hasCompanyResearch) score += 20;
  else recommendations.push('Complete company research');
  
  if (hasInterviewPrep) score += 20;
  else recommendations.push('Practice common interview questions');
  
  if (hasMockInterview) score += 20;
  else recommendations.push('Complete a mock interview with AI');
  
  // Determine readiness level
  let level: 'not-ready' | 'partially-ready' | 'ready' | 'well-prepared';
  if (score >= 80) level = 'well-prepared';
  else if (score >= 60) level = 'ready';
  else if (score >= 30) level = 'partially-ready';
  else level = 'not-ready';
  
  return { score, level, recommendations };
};
