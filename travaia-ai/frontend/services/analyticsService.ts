import { getAnalytics, logEvent } from 'firebase/analytics';
import { getApp } from 'firebase/app';

/**
 * Service for tracking analytics events throughout the application
 * Uses Firebase Analytics for event tracking
 */
export const analyticsService = {
  /**
   * Track a generic event with optional parameters
   * @param eventName The name of the event to track
   * @param params Optional parameters for the event
   */
  trackEvent(eventName: string, params?: Record<string, any>): void {
    try {
      const analytics = getAnalytics(getApp());
      logEvent(analytics, eventName, params);
    } catch (error) {
      console.error('Error tracking analytics event:', error);
    }
  },
  
  /**
   * Track onboarding events
   */
  onboarding: {
    /**
     * Track when the onboarding process is started
     * @param source The source of the start (after_login, dashboard, reminder)
     * @param language The current language
     */
    started(source: string, language: string): void {
      analyticsService.trackEvent('onboarding_started', {
        source,
        language
      });
    },
    
    /**
     * Track when a file is uploaded during onboarding
     * @param fileType The type of file uploaded (pdf, docx, etc.)
     * @param fileSize The size of the file in bytes
     */
    fileUploaded(fileType: string, fileSize: number): void {
      analyticsService.trackEvent('onboarding_file_uploaded', {
        file_type: fileType,
        file_size: fileSize
      });
    },
    
    /**
     * Track when resume analysis starts
     * @param language The language used for analysis
     */
    analysisStarted(language: string): void {
      analyticsService.trackEvent('onboarding_analysis_started', {
        language
      });
    },
    
    /**
     * Track when resume analysis is completed
     * @param duration The duration of the analysis in milliseconds
     * @param success Whether the analysis was successful
     */
    analysisCompleted(duration: number, success: boolean): void {
      analyticsService.trackEvent('onboarding_analysis_completed', {
        duration,
        success
      });
    },
    
    /**
     * Track when onboarding is skipped
     * @param step The step at which onboarding was skipped
     */
    skipped(step: string): void {
      analyticsService.trackEvent('onboarding_skipped', {
        step
      });
    },
    
    /**
     * Track when onboarding is completed
     * @param duration The total duration of onboarding in milliseconds
     */
    completed(duration: number): void {
      analyticsService.trackEvent('onboarding_completed', {
        duration
      });
    },
    
    /**
     * Track when a reminder is shown
     * @param reminderCount The number of times the reminder has been shown
     * @param daysSinceSkip Days since onboarding was skipped
     */
    reminderShown(reminderCount: number, daysSinceSkip: number): void {
      analyticsService.trackEvent('onboarding_reminder_shown', {
        reminder_count: reminderCount,
        days_since_skip: daysSinceSkip
      });
    },
    
    /**
     * Track reminder interaction
     * @param action The action taken ('dismissed' or 'clicked')
     */
    reminderInteraction(action: 'dismissed' | 'clicked'): void {
      analyticsService.trackEvent('onboarding_reminder_interaction', {
        action
      });
    },

    /**
     * Track when career aspirations are set during onboarding
     * @param dreamCompaniesCount Number of dream companies specified
     * @param industries Comma-separated list of preferred industries
     */
    careerAspirationsSet(dreamCompaniesCount: number, industries: string): void {
      analyticsService.trackEvent('onboarding_career_aspirations_set', {
        dream_companies_count: dreamCompaniesCount,
        industries
      });
    },

    /**
     * Track when skills are assessed during onboarding
     * @param skillsCount Number of skills assessed
     * @param learningStyle Preferred learning style
     */
    skillsAssessed(skillsCount: number, learningStyle: string): void {
      analyticsService.trackEvent('onboarding_skills_assessed', {
        skills_count: skillsCount,
        learning_style: learningStyle
      });
    },

    /**
     * Track when job preferences are set during onboarding
     * @param workLocations Comma-separated list of work location preferences
     * @param companySizes Comma-separated list of company size preferences
     */
    jobPreferencesSet(workLocations: string, companySizes: string): void {
      analyticsService.trackEvent('onboarding_job_preferences_set', {
        work_locations: workLocations,
        company_sizes: companySizes
      });
    }
  },

  /**
   * Track profile events
   */
  profile: {
    /**
     * Track when the profile page is viewed
     * @param userId User ID
     * @param completionPercentage Profile completion percentage
     */
    viewed(userId: string, completionPercentage: number): void {
      analyticsService.trackEvent('profile_viewed', {
        user_id: userId,
        completion_percentage: completionPercentage
      });
    },
    
    /**
     * Track when a profile section is edited
     * @param userId User ID
     * @param section The section being edited
     * @param field The specific field being edited
     */
    sectionEdited(userId: string, section: string, field: string): void {
      analyticsService.trackEvent('profile_section_edited', {
        user_id: userId,
        section,
        field
      });
    },
    
    /**
     * Track when profile update is saved
     * @param userId User ID
     * @param section The section that was updated
     * @param field The field that was updated
     * @param completionDelta Change in completion percentage
     */
    updateSaved(userId: string, section: string, field: string, completionDelta: number): void {
      analyticsService.trackEvent('profile_update_saved', {
        user_id: userId,
        section,
        field,
        completion_delta: completionDelta
      });
    },
    
    /**
     * Track when an avatar is uploaded
     * @param userId User ID
     * @param fileSize The size of the file in bytes
     */
    avatarUpdated(userId: string, fileSize: number): void {
      analyticsService.trackEvent('profile_avatar_updated', {
        user_id: userId,
        file_size: fileSize
      });
    },
    
    /**
     * Track when XP is earned
     * @param userId User ID
     * @param amount Amount of XP earned
     * @param source Source of the XP
     */
    xpEarned(userId: string, amount: number, source: string): void {
      analyticsService.trackEvent('profile_xp_earned', {
        user_id: userId,
        amount,
        source
      });
    },
    
    /**
     * Track when a level is achieved
     * @param userId User ID
     * @param level The new level achieved
     */
    levelUp(userId: string, level: number): void {
      analyticsService.trackEvent('profile_level_up', {
        user_id: userId,
        level
      });
    },
    
    /**
     * Track when an achievement is unlocked
     * @param userId User ID
     * @param achievementId The ID of the achievement
     * @param achievementTitle The title of the achievement
     */
    achievementUnlocked(userId: string, achievementId: string, achievementTitle: string): void {
      analyticsService.trackEvent('profile_achievement_unlocked', {
        user_id: userId,
        achievement_id: achievementId,
        achievement_title: achievementTitle
      });
    },
    
    /**
     * Track when a user accesses analytics or metrics on their profile
     * @param userId User ID
     * @param metricType The type of metric viewed
     */
    metricsViewed(userId: string, metricType: string): void {
      analyticsService.trackEvent('profile_metrics_viewed', {
        user_id: userId,
        metric_type: metricType
      });
    }
  }
};
