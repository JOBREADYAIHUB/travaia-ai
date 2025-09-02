import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

export interface OnboardingState {
  completed: boolean;
  skipped: boolean;
  lastSkippedDate: string | null;
  reminderCount: number;
  resumeUploaded: boolean;
  lastAnalysisDate: string | null;
}

const defaultOnboardingState: OnboardingState = {
  completed: false,
  skipped: false,
  lastSkippedDate: null,
  reminderCount: 0,
  resumeUploaded: false,
  lastAnalysisDate: null,
};

/**
 * Custom hook for managing onboarding state
 * Provides functions to:
 * - Check if onboarding is completed
 * - Mark onboarding as completed
 * - Skip onboarding
 * - Get reminder status
 * - Handle resume upload state
 */
export const useOnboarding = () => {
  const { currentUser } = useAuth();
  const [onboardingState, setOnboardingState] = useState<OnboardingState | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Fetch onboarding state when user changes
  useEffect(() => {
    const fetchOnboardingState = async () => {
      if (!currentUser) {
        setOnboardingState(null);
        setLoading(false);
        return;
      }
      
      try {
        const onboardingRef = doc(db, 'users', currentUser.uid, 'settings', 'onboarding');
        const onboardingSnap = await getDoc(onboardingRef);
        
        if (onboardingSnap.exists()) {
          setOnboardingState(onboardingSnap.data() as OnboardingState);
        } else {
          // Create default onboarding state if it doesn't exist
          await setDoc(onboardingRef, defaultOnboardingState);
          setOnboardingState(defaultOnboardingState);
        }
      } catch (error) {
        console.error('Error fetching onboarding state:', error);
        setOnboardingState(defaultOnboardingState);
      } finally {
        setLoading(false);
      }
    };
    
    fetchOnboardingState();
  }, [currentUser]);
  
  // Mark onboarding as completed
  const completeOnboarding = async () => {
    if (!currentUser || !onboardingState) return;
    
    try {
      const onboardingRef = doc(db, 'users', currentUser.uid, 'settings', 'onboarding');
      
      const updatedState: Partial<OnboardingState> = {
        completed: true,
        skipped: false,
      };
      
      await updateDoc(onboardingRef, updatedState);
      setOnboardingState(prev => prev ? { ...prev, ...updatedState } : null);
      
      return true;
    } catch (error) {
      console.error('Error completing onboarding:', error);
      return false;
    }
  };
  
  // Skip onboarding
  const skipOnboarding = async () => {
    if (!currentUser || !onboardingState) return;
    
    try {
      const onboardingRef = doc(db, 'users', currentUser.uid, 'settings', 'onboarding');
      
      const updatedState: Partial<OnboardingState> = {
        skipped: true,
        lastSkippedDate: new Date().toISOString(),
        reminderCount: onboardingState.reminderCount + 1,
      };
      
      await updateDoc(onboardingRef, updatedState);
      setOnboardingState(prev => prev ? { ...prev, ...updatedState } : null);
      
      return true;
    } catch (error) {
      console.error('Error skipping onboarding:', error);
      return false;
    }
  };
  
  // Record resume upload
  const recordResumeUpload = async () => {
    if (!currentUser || !onboardingState) return;
    
    try {
      const onboardingRef = doc(db, 'users', currentUser.uid, 'settings', 'onboarding');
      
      const updatedState: Partial<OnboardingState> = {
        resumeUploaded: true,
        lastAnalysisDate: new Date().toISOString(),
      };
      
      await updateDoc(onboardingRef, updatedState);
      setOnboardingState(prev => prev ? { ...prev, ...updatedState } : null);
      
      return true;
    } catch (error) {
      console.error('Error recording resume upload:', error);
      return false;
    }
  };
  
  // Check if reminder should be shown
  const shouldShowReminder = () => {
    if (!onboardingState) return false;
    
    // Don't show reminder if onboarding is completed
    if (onboardingState.completed) return false;
    
    // Don't show reminder if not skipped
    if (!onboardingState.skipped) return false;
    
    // Don't show reminder if the user has seen too many reminders
    if (onboardingState.reminderCount > 3) return false;
    
    // Show reminder if it's been at least 2 days since last skip
    if (onboardingState.lastSkippedDate) {
      const lastSkippedDate = new Date(onboardingState.lastSkippedDate);
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      
      return lastSkippedDate < twoDaysAgo;
    }
    
    return false;
  };
  
  // Reset reminder counter
  const resetReminderCount = async () => {
    if (!currentUser || !onboardingState) return;
    
    try {
      const onboardingRef = doc(db, 'users', currentUser.uid, 'settings', 'onboarding');
      
      await updateDoc(onboardingRef, { reminderCount: 0 });
      setOnboardingState(prev => prev ? { ...prev, reminderCount: 0 } : null);
      
      return true;
    } catch (error) {
      console.error('Error resetting reminder count:', error);
      return false;
    }
  };
  
  return {
    onboardingState,
    loading,
    isCompleted: onboardingState?.completed || false,
    isSkipped: onboardingState?.skipped || false,
    hasUploadedResume: onboardingState?.resumeUploaded || false,
    shouldShowReminder: shouldShowReminder(),
    completeOnboarding,
    skipOnboarding,
    recordResumeUpload,
    resetReminderCount,
  };
};
