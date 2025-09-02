import { useState, useCallback, useEffect } from 'react';
import { resumeBuilderApi } from '../services/resumeBuilderApi';

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
}

interface UseResumeBuilderReturn {
  // State
  resumeData: ResumeData;
  selectedTemplateId: string | null;
  templates: ResumeTemplate[];
  versions: ResumeVersion[];
  currentVersionId: string | null;
  
  // Loading states
  isLoading: boolean;
  isSaving: boolean;
  isGeneratingPreview: boolean;
  isEnhancing: boolean;
  
  // Error states
  error: string | null;
  templateError: string | null;
  
  // Actions
  updateResumeData: (data: ResumeData) => void;
  selectTemplate: (templateId: string) => void;
  saveResume: () => Promise<void>;
  loadVersion: (versionId: string) => Promise<void>;
  createNewVersion: (name: string, description?: string) => Promise<void>;
  deleteVersion: (versionId: string) => Promise<void>;
  enhanceWithAI: () => Promise<void>;
  downloadResume: () => Promise<void>;
  parseUploadedFile: (file: File) => Promise<void>;
  
  // Undo/Redo
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
  
  // Validation
  validateData: () => { isValid: boolean; errors: string[] };
}

const createEmptyResumeData = (): ResumeData => ({
  personalInfo: {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    linkedinUrl: '',
    portfolioUrl: '',
    summary: ''
  },
  experience: [],
  education: [],
  skills: [],
  certifications: []
});

export const useResumeBuilder = (): UseResumeBuilderReturn => {
  // Core state
  const [resumeData, setResumeData] = useState<ResumeData>(createEmptyResumeData());
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [templates, setTemplates] = useState<ResumeTemplate[]>([]);
  const [versions, setVersions] = useState<ResumeVersion[]>([]);
  const [currentVersionId, setCurrentVersionId] = useState<string | null>(null);
  
  // Loading states
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  
  // Error states
  const [error, setError] = useState<string | null>(null);
  const [templateError, setTemplateError] = useState<string | null>(null);
  
  // Undo/Redo state
  const [history, setHistory] = useState<ResumeData[]>([createEmptyResumeData()]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Load templates on mount
  useEffect(() => {
    loadTemplates();
    loadVersions();
  }, []);

  // Add to history when resume data changes (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      addToHistory(resumeData);
    }, 1000);

    return () => clearTimeout(timer);
  }, [resumeData]);

  const addToHistory = useCallback((data: ResumeData) => {
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(JSON.parse(JSON.stringify(data)));
      return newHistory.slice(-50); // Keep last 50 states
    });
    setHistoryIndex(prev => Math.min(prev + 1, 49));
  }, [historyIndex]);

  const loadTemplates = async () => {
    try {
      setIsLoading(true);
      setTemplateError(null);
      const fetchedTemplates = await resumeBuilderApi.fetchTemplates();
      setTemplates(fetchedTemplates);
    } catch (err) {
      setTemplateError(err instanceof Error ? err.message : 'Failed to load templates');
    } finally {
      setIsLoading(false);
    }
  };

  const loadVersions = async () => {
    try {
      const fetchedVersions = await resumeBuilderApi.getResumeVersions();
      setVersions(fetchedVersions);
    } catch (err) {
      console.error('Failed to load resume versions:', err);
    }
  };

  const updateResumeData = useCallback((data: ResumeData) => {
    setResumeData(data);
    setError(null);
  }, []);

  const selectTemplate = useCallback((templateId: string) => {
    setSelectedTemplateId(templateId);
    setError(null);
  }, []);

  const saveResume = async () => {
    try {
      setIsSaving(true);
      setError(null);

      const validation = validateData();
      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '));
      }

      if (!selectedTemplateId) {
        throw new Error('Please select a template');
      }

      const savedVersion = await resumeBuilderApi.saveResumeVersion({
        data: resumeData,
        templateId: selectedTemplateId,
        name: currentVersionId ? `Version ${Date.now()}` : 'Draft Resume',
        description: 'Auto-saved resume'
      });

      setCurrentVersionId(savedVersion.id);
      await loadVersions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save resume');
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  const loadVersion = async (versionId: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const version = await resumeBuilderApi.getResumeVersion(versionId);
      setResumeData(version.data);
      setSelectedTemplateId(version.templateId);
      setCurrentVersionId(versionId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load resume version');
    } finally {
      setIsLoading(false);
    }
  };

  const createNewVersion = async (name: string, description?: string) => {
    try {
      setIsSaving(true);
      setError(null);

      if (!selectedTemplateId) {
        throw new Error('Please select a template');
      }

      const newVersion = await resumeBuilderApi.saveResumeVersion({
        data: resumeData,
        templateId: selectedTemplateId,
        name,
        description: description || ''
      });

      setCurrentVersionId(newVersion.id);
      await loadVersions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create new version');
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  const deleteVersion = async (versionId: string) => {
    try {
      setError(null);
      await resumeBuilderApi.deleteResumeVersion(versionId);
      
      if (currentVersionId === versionId) {
        setCurrentVersionId(null);
      }
      
      await loadVersions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete version');
      throw err;
    }
  };

  const enhanceWithAI = async () => {
    try {
      setIsEnhancing(true);
      setError(null);

      const enhancedData = await resumeBuilderApi.enhanceWithAI(resumeData);
      setResumeData(enhancedData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to enhance resume with AI');
    } finally {
      setIsEnhancing(false);
    }
  };

  const downloadResume = async () => {
    try {
      setIsGeneratingPreview(true);
      setError(null);

      if (!selectedTemplateId) {
        throw new Error('Please select a template');
      }

      const validation = validateData();
      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '));
      }

      await resumeBuilderApi.generateResume({
        data: resumeData,
        templateId: selectedTemplateId,
        format: 'pdf'
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download resume');
    } finally {
      setIsGeneratingPreview(false);
    }
  };

  const parseUploadedFile = async (file: File) => {
    try {
      setIsLoading(true);
      setError(null);

      const parsedData = await resumeBuilderApi.parseResumeFile(file);
      setResumeData(parsedData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse uploaded file');
    } finally {
      setIsLoading(false);
    }
  };

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setResumeData(JSON.parse(JSON.stringify(history[newIndex])));
    }
  }, [history, historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setResumeData(JSON.parse(JSON.stringify(history[newIndex])));
    }
  }, [history, historyIndex]);

  const validateData = useCallback((): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    // Personal info validation
    if (!resumeData.personalInfo.firstName.trim()) {
      errors.push('First name is required');
    }
    if (!resumeData.personalInfo.lastName.trim()) {
      errors.push('Last name is required');
    }
    if (!resumeData.personalInfo.email.trim()) {
      errors.push('Email is required');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(resumeData.personalInfo.email)) {
      errors.push('Valid email is required');
    }

    // Experience validation
    resumeData.experience.forEach((exp, index) => {
      if (!exp.jobTitle.trim()) {
        errors.push(`Job title is required for experience ${index + 1}`);
      }
      if (!exp.company.trim()) {
        errors.push(`Company is required for experience ${index + 1}`);
      }
      if (!exp.startDate) {
        errors.push(`Start date is required for experience ${index + 1}`);
      }
      if (!exp.currentPosition && !exp.endDate) {
        errors.push(`End date is required for experience ${index + 1} (or mark as current position)`);
      }
    });

    // Education validation
    resumeData.education.forEach((edu, index) => {
      if (!edu.degree.trim()) {
        errors.push(`Degree is required for education ${index + 1}`);
      }
      if (!edu.institution.trim()) {
        errors.push(`Institution is required for education ${index + 1}`);
      }
    });

    // Skills validation
    resumeData.skills.forEach((skill, index) => {
      if (!skill.name.trim()) {
        errors.push(`Skill name is required for skill ${index + 1}`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }, [resumeData]);

  return {
    // State
    resumeData,
    selectedTemplateId,
    templates,
    versions,
    currentVersionId,
    
    // Loading states
    isLoading,
    isSaving,
    isGeneratingPreview,
    isEnhancing,
    
    // Error states
    error,
    templateError,
    
    // Actions
    updateResumeData,
    selectTemplate,
    saveResume,
    loadVersion,
    createNewVersion,
    deleteVersion,
    enhanceWithAI,
    downloadResume,
    parseUploadedFile,
    
    // Undo/Redo
    canUndo: historyIndex > 0,
    canRedo: historyIndex < history.length - 1,
    undo,
    redo,
    
    // Validation
    validateData
  };
};
