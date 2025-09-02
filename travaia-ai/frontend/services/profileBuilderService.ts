import { getAuth } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { ResumeAnalysisResults, CareerAspirations, SkillAssessment, JobMatchPreferences, UserPreferences } from './resumeAnalysisService';

// Define structured profile data
export interface UserProfile {
  userId: string;
  fullName?: string;
  professionalTitle?: string;
  skills: string[];
  experienceLevel: string;
  yearsOfExperience?: number;
  professionalSummary?: string;
  lastUpdated: string;
  preferredLanguage: string;
  completionPercentage: number;
  sectors?: string[];
  recommendations?: string[];
}

/**
 * Service for building and managing user professional profiles
 * based on resume analysis and user input
 */
export const profileBuilderService = {
  /**
   * Create a profile from resume analysis results
   * @param analysisResults The resume analysis results
   * @returns The structured user profile
   */
  createProfileFromAnalysis(analysisResults: ResumeAnalysisResults): Partial<UserProfile> {
    // Extract structured profile data from analysis results
    const profile: Partial<UserProfile> = {
      skills: analysisResults.skills || [],
      experienceLevel: analysisResults.experience || 'Not specified',
      recommendations: analysisResults.recommendations || [],
      lastUpdated: new Date().toISOString(),
      preferredLanguage: analysisResults.language || 'en',
      completionPercentage: 40, // Initial completion percentage after resume analysis
    };
    
    // Try to extract years of experience as a number
    const experienceYears = this.extractExperienceYears(analysisResults.experience || '');
    if (experienceYears) {
      profile.yearsOfExperience = experienceYears;
    }
    
    return profile;
  },
  
  /**
   * Extract numeric years of experience from the experience string
   * @param experienceText The experience text from analysis
   * @returns Numeric years of experience, or undefined if not found
   */
  extractExperienceYears(experienceText: string): number | undefined {
    // Try to extract a number representing years
    const yearMatches = experienceText.match(/(\d+)(?:\s*-\s*\d+)?\s*(?:years|year|yr|yrs|ans|años|jahre|سنوات|سنة)/i);
    
    if (yearMatches && yearMatches[1]) {
      return parseInt(yearMatches[1], 10);
    }
    
    // Try to match a range and use the lower number
    const rangeMatches = experienceText.match(/(\d+)\s*-\s*(\d+)/);
    if (rangeMatches && rangeMatches[1]) {
      return parseInt(rangeMatches[1], 10);
    }
    
    return undefined;
  },
  
  /**
   * Save the user profile to Firestore
   * @param profile The user profile to save
   * @returns True if successful
   */
  async saveUserProfile(profile: Partial<UserProfile>): Promise<boolean> {
    const auth = getAuth();
    const user = auth.currentUser;
    
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    try {
      const profileRef = doc(db, 'users', user.uid, 'profile', 'professional');
      const profileSnap = await getDoc(profileRef);
      
      // Update existing profile or create new one
      if (profileSnap.exists()) {
        const existingData = profileSnap.data();
        
        // Calculate new completion percentage
        let completionFields = 0;
        let totalFields = 7; // Count of key profile fields to consider for completion
        
        // Check which important fields are filled
        if (existingData.fullName || profile.fullName) completionFields++;
        if (existingData.professionalTitle || profile.professionalTitle) completionFields++;
        if ((existingData.skills && existingData.skills.length > 0) || 
            (profile.skills && profile.skills.length > 0)) completionFields++;
        if (existingData.experienceLevel || profile.experienceLevel) completionFields++;
        if (existingData.yearsOfExperience || profile.yearsOfExperience) completionFields++;
        if (existingData.professionalSummary || profile.professionalSummary) completionFields++;
        if ((existingData.sectors && existingData.sectors.length > 0) || 
            (profile.sectors && profile.sectors.length > 0)) completionFields++;
        
        // Calculate percentage
        const completionPercentage = Math.round((completionFields / totalFields) * 100);
        
        // Merge existing and new data, prioritizing new data
        await updateDoc(profileRef, {
          ...profile,
          userId: user.uid,
          lastUpdated: new Date().toISOString(),
          completionPercentage,
        });
      } else {
        // Create new profile
        await setDoc(profileRef, {
          ...profile,
          userId: user.uid,
          lastUpdated: new Date().toISOString(),
        });
      }
      
      return true;
    } catch (error) {
      console.error('Error saving user profile:', error);
      return false;
    }
  },
  
  /**
   * Get the current user profile from Firestore
   * @returns The user profile, or null if not found
   */
  async getUserProfile(): Promise<UserProfile | null> {
    const auth = getAuth();
    const user = auth.currentUser;
    
    if (!user) {
      return null;
    }
    
    try {
      const profileRef = doc(db, 'users', user.uid, 'profile', 'professional');
      const profileSnap = await getDoc(profileRef);
      
      if (profileSnap.exists()) {
        return {
          ...profileSnap.data(),
          userId: user.uid,
        } as UserProfile;
      }
      
      // Return a minimal profile if none exists
      return {
        userId: user.uid,
        skills: [],
        experienceLevel: '',
        lastUpdated: new Date().toISOString(),
        preferredLanguage: 'en',
        completionPercentage: 0,
      };
    } catch (error) {
      console.error('Error getting user profile:', error);
      return null;
    }
  },
  
  /**
   * Update specific profile fields
   * @param fields The fields to update
   * @returns True if successful
   */
  async updateProfileFields(fields: Partial<UserProfile>): Promise<boolean> {
    const auth = getAuth();
    const user = auth.currentUser;
    
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    try {
      const profileRef = doc(db, 'users', user.uid, 'profile', 'professional');
      
      // Mark as updated
      fields.lastUpdated = new Date().toISOString();
      
      await updateDoc(profileRef, fields);
      return true;
    } catch (error) {
      console.error('Error updating profile fields:', error);
      return false;
    }
  },

  /**
   * Save user preferences from onboarding steps
   * @param preferences The user preferences from onboarding
   * @returns True if successful
   */
  async savePreferences(preferences: UserPreferences): Promise<boolean> {
    const auth = getAuth();
    const user = auth.currentUser;
    
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    try {
      // Store preferences in a separate document
      const prefsRef = doc(db, 'users', user.uid, 'profile', 'preferences');
      
      await setDoc(prefsRef, {
        ...preferences,
        lastUpdated: new Date().toISOString(),
      });
      
      return true;
    } catch (error) {
      console.error('Error saving user preferences:', error);
      return false;
    }
  },

  /**
   * Get saved user preferences
   * @returns The user preferences, or null if not found
   */
  async getSavedPreferences(): Promise<UserPreferences | null> {
    const auth = getAuth();
    const user = auth.currentUser;
    
    if (!user) {
      return null;
    }
    
    try {
      const prefsRef = doc(db, 'users', user.uid, 'profile', 'preferences');
      const prefsSnap = await getDoc(prefsRef);
      
      if (prefsSnap.exists()) {
        return prefsSnap.data() as UserPreferences;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting user preferences:', error);
      return null;
    }
  },

  /**
   * Create an enriched profile from analysis results and user preferences
   * @param analysisResults The resume analysis results
   * @param careerAspirations User's career aspirations
   * @param skillAssessment User's skill self-assessment
   * @param jobPreferences User's job preferences
   * @returns Enhanced user profile with preference data
   */
  createEnrichedProfileFromAnalysis(
    analysisResults: ResumeAnalysisResults,
    careerAspirations: CareerAspirations | null,
    skillAssessment: SkillAssessment | null,
    jobPreferences: JobMatchPreferences | null
  ): Partial<UserProfile> {
    // Start with the base profile from analysis
    const baseProfile = this.createProfileFromAnalysis(analysisResults);
    
    // Enhance the profile with user preferences data
    const enrichedProfile: Partial<UserProfile> = {
      ...baseProfile,
      // A user who completes preferences has a higher completion percentage
      completionPercentage: baseProfile.completionPercentage ? baseProfile.completionPercentage + 20 : 60,
    };
    
    // Add career sectors from aspirations if available
    if (careerAspirations?.preferredIndustries) {
      enrichedProfile.sectors = careerAspirations.preferredIndustries;
    }
    
    // Combine AI-detected skills with self-reported skills
    if (skillAssessment?.skills && skillAssessment.skills.length > 0) {
      // Create a Set to remove duplicates
      const skillsSet = new Set([...(baseProfile.skills || []), ...skillAssessment.skills]);
      enrichedProfile.skills = Array.from(skillsSet);
    }
    
    // Add enhanced recommendations based on preferences
    const enhancedRecommendations: string[] = [...(baseProfile.recommendations || [])];
    
    if (careerAspirations) {
      enhancedRecommendations.push(
        `Target your resume for ${careerAspirations.dreamCompanies.join(', ')} or similar companies.`
      );
    }
    
    if (skillAssessment?.areasForImprovement) {
      enhancedRecommendations.push(
        `Consider focusing on improving these skills: ${skillAssessment.areasForImprovement.join(', ')}.`
      );
    }
    
    enrichedProfile.recommendations = enhancedRecommendations;
    
    return enrichedProfile;
  }
};
