import { getApp } from 'firebase/app';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getAuth } from 'firebase/auth';
import { db } from '../firebaseConfig';
import { doc, setDoc, getDoc } from 'firebase/firestore';

// Define result structure for resume analysis
export interface ResumeAnalysisResults {
  skills: string[];
  experience: string;
  recommendations: string[];
  rawAnalysis?: any;
  language?: string;
}

// Define interfaces for user preferences
export interface CareerAspirations {
  dreamCompanies: string[];
  preferredIndustries: string[];
  careerGoal: string;
  fiveYearPlan?: string;
}

export interface SkillAssessment {
  skills: string[];
  strengths: string[];
  areasForImprovement: string[];
  preferredLearningStyle: string;
}

export interface JobMatchPreferences {
  workLocationPreferences: string[];
  companySize: string[];
  companyValues: string[];
  workCulture: string[];
}

export interface UserPreferences {
  careerAspirations: CareerAspirations | null;
  skillAssessment: SkillAssessment | null;
  jobPreferences: JobMatchPreferences | null;
}

/**
 * Service for handling resume analysis using Firebase Functions and Gemini API
 * Supports multilingual resume processing
 */
export const resumeAnalysisService = {
  /**
   * Upload a resume file to Firebase Storage
   * @param file The resume file to upload
   * @returns The download URL of the uploaded file
   */
  async uploadResume(file: File): Promise<string> {
    const auth = getAuth();
    const user = auth.currentUser;
    
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    const storage = getStorage();
    const timestamp = new Date().getTime();
    const fileExtension = file.name.split('.').pop();
    const fileName = `resumes/${user.uid}/${timestamp}.${fileExtension}`;
    const fileRef = ref(storage, fileName);
    
    await uploadBytes(fileRef, file);
    const downloadURL = await getDownloadURL(fileRef);
    
    return downloadURL;
  },
  
  /**
   * Process a resume using Firebase Functions and Gemini API
   * @param fileUrl The URL of the resume file to process
   * @param language The language code for analysis (default: 'en')
   * @returns The analysis results
   */
  async processResume(fileUrl: string, language: string = 'en'): Promise<ResumeAnalysisResults> {
    const functions = getFunctions(getApp());
    const analyzeResume = httpsCallable<{fileUrl: string, language: string}, any>(
      functions, 
      'analyzeResume'
    );
    
    try {
      const result = await analyzeResume({
        fileUrl,
        language
      });
      
      return this.formatAnalysisResults(result.data, language);
    } catch (error) {
      console.error('Error processing resume:', error);
      throw error;
    }
  },
  
  /**
   * Format the raw analysis results into a structured format
   * @param rawResults The raw analysis results from the API
   * @param language The language used for analysis
   * @returns Structured analysis results
   */
  formatAnalysisResults(rawResults: any, language: string): ResumeAnalysisResults {
    // Extract skills from raw results
    let skills: string[] = [];
    if (rawResults.skills && Array.isArray(rawResults.skills)) {
      skills = rawResults.skills;
    } else if (typeof rawResults.skills === 'string') {
      // Handle case where skills might be returned as a comma-separated string
      skills = rawResults.skills.split(',').map((skill: string) => skill.trim());
    }
    
    // Extract experience level
    let experience = rawResults.experience || '';
    
    // Extract recommendations
    let recommendations: string[] = [];
    if (rawResults.recommendations && Array.isArray(rawResults.recommendations)) {
      recommendations = rawResults.recommendations;
    } else if (typeof rawResults.recommendations === 'string') {
      // Handle case where recommendations might be returned as a newline-separated string
      recommendations = rawResults.recommendations.split('\n').filter(Boolean);
    }
    
    return {
      skills,
      experience,
      recommendations,
      rawAnalysis: rawResults,
      language
    };
  },
  
  /**
   * Save analysis results to Firestore
   * @param results The analysis results to save
   * @returns True if successful
   */
  async saveAnalysisResults(results: ResumeAnalysisResults): Promise<boolean> {
    const auth = getAuth();
    const user = auth.currentUser;
    
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    try {
      // Create a document with the analysis results
      const resultsRef = doc(db, 'users', user.uid, 'resume', 'analysis');
      
      await setDoc(resultsRef, {
        ...results,
        updatedAt: new Date().toISOString()
      });
      
      return true;
    } catch (error) {
      console.error('Error saving analysis results:', error);
      return false;
    }
  },
  
  /**
   * Get previously saved analysis results
   * @returns The saved analysis results, or null if not found
   */
  async getSavedAnalysisResults(): Promise<ResumeAnalysisResults | null> {
    const auth = getAuth();
    const user = auth.currentUser;
    
    if (!user) {
      return null;
    }
    
    try {
      const resultsRef = doc(db, 'users', user.uid, 'resume', 'analysis');
      const resultsDoc = await getDoc(resultsRef);
      
      if (resultsDoc.exists()) {
        return resultsDoc.data() as ResumeAnalysisResults;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting saved analysis results:', error);
      return null;
    }
  },

  /**
   * Process a resume with user preferences for personalized analysis
   * @param fileUrl The URL of the resume file to process
   * @param language The language code for analysis (default: 'en')
   * @param preferences User preferences for personalized analysis
   * @returns The enhanced analysis results
   */
  async processResumeWithPreferences(
    fileUrl: string, 
    language: string = 'en',
    preferences: UserPreferences
  ): Promise<ResumeAnalysisResults> {
    const functions = getFunctions(getApp());
    const analyzeResumeWithPreferences = httpsCallable<{
      fileUrl: string, 
      language: string, 
      preferences: UserPreferences
    }, any>(
      functions, 
      'analyzeResumeWithPreferences'
    );
    
    try {
      // Call the enhanced Firebase function with preferences
      const result = await analyzeResumeWithPreferences({
        fileUrl,
        language,
        preferences
      });
      
      // Format and return the enhanced results
      const baseResults = this.formatAnalysisResults(result.data, language);
      
      // Enhance the results with personalized information based on preferences
      const enhancedResults: ResumeAnalysisResults = {
        ...baseResults,
        // Add personalized recommendations based on career aspirations
        recommendations: [
          ...baseResults.recommendations,
          // Add industry-specific recommendations if we have industry preferences
          ...(preferences.careerAspirations?.preferredIndustries?.map(industry => 
            `Industry Focus: Consider highlighting experience relevant to ${industry}`
          ) || []),
          // Add skill-focused recommendations if we have skills assessment
          ...(preferences.skillAssessment?.areasForImprovement?.map(skill => 
            `Skill Development: Consider improving your ${skill} skills`
          ) || [])
        ],
        // Add metadata about the preferences used
        rawAnalysis: {
          ...baseResults.rawAnalysis,
          userPreferences: preferences
        }
      };
      
      return enhancedResults;
    } catch (error) {
      console.error('Error processing resume with preferences:', error);
      // Fallback to standard processing if enhanced processing fails
      return this.processResume(fileUrl, language);
    }
  }
};
