import React, { useState, useEffect } from 'react';
import { ApplicationStatus, JobApplication } from '../../types';
// Using FirebaseTimestamp interface to avoid TypeScript errors with instanceof checks
type FirebaseTimestamp = {
  toDate: () => Date;
  seconds: number;
  nanoseconds: number;
};
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { GlassCard, GlassButton } from '../design-system';
import FeatureTile from '../dashboard/FeatureTile';
// Icons are now loaded directly from public/icons as SVG images
import styles from './PremiumJobTrackerOverview.module.css';

interface PremiumJobTrackerOverviewProps {
  applications: JobApplication[];
  onAddApplication: () => void;
  onViewAnalytics: () => void;
  onViewApplication: (application: JobApplication) => void;
  isLoading?: boolean;
}

interface QuickStats {
  totalApplications: number;
  activeApplications: number;
  interviews: number;
  offers: number;
  successRate: number;
  avgResponseTime: string;
  thisWeekApplications: number;
  upcomingDeadlines: number;
}

interface RecentActivity {
  id: string;
  type: 'applied' | 'interview_scheduled' | 'status_update' | 'offer_received';
  application: JobApplication;
  timestamp: Date;
  description: string;
}

const PremiumJobTrackerOverview: React.FC<PremiumJobTrackerOverviewProps> = ({
  applications,
  onAddApplication,
  onViewAnalytics,
  onViewApplication,
  isLoading = false
}) => {
  const { t } = useTranslation();
  const { } = useAuth(); // currentUser was here, removed since it's unused
  const [stats, setStats] = useState<QuickStats>({
    totalApplications: 0,
    activeApplications: 0,
    interviews: 0,
    offers: 0,
    successRate: 0,
    avgResponseTime: '0 days',
    thisWeekApplications: 0,
    upcomingDeadlines: 0
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [upcomingReminders, setUpcomingReminders] = useState<JobApplication[]>([]);

  // Calculate statistics from applications
  useEffect(() => {
    if (!applications.length) {
      setStats({
        totalApplications: 0,
        activeApplications: 0,
        interviews: 0,
        offers: 0,
        successRate: 0,
        avgResponseTime: '0 days',
        thisWeekApplications: 0,
        upcomingDeadlines: 0
      });
      return;
    }

    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const totalApplications = applications.length;
    const activeApplications = applications.filter(app => 
      !['rejected', 'hired', 'withdrawn'].includes(app.status)
    ).length;
    
    // Count applications by status
    const interviews = applications.filter(app => app.status === ApplicationStatus.InterviewScheduled).length;
    const offers = applications.filter(app => app.status === ApplicationStatus.OfferReceived).length;
    
    const successRate = totalApplications > 0 ? Math.round((offers / totalApplications) * 100) : 0;
    
    const thisWeekApplications = applications.filter(app => {
      const appliedDate = app.keyDates?.submissionDate ? new Date(app.keyDates.submissionDate) : null;
      return appliedDate && appliedDate >= oneWeekAgo;
    }).length;

    // Calculate upcoming deadlines (next 7 days)
    const upcomingDeadlines = applications.filter(app => {
      if (app.keyDates?.offerExpiryDate) {
        const deadline = new Date(app.keyDates.offerExpiryDate);
        return deadline > new Date() && deadline <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      }
      return false;
    }).length;

    // Calculate average response time (simplified)
    const avgResponseTime = '3-5 days'; // This would be calculated from actual data

    setStats({
      totalApplications,
      activeApplications,
      interviews,
      offers,
      successRate,
      avgResponseTime,
      thisWeekApplications,
      upcomingDeadlines
    });

    // Generate recent activity
    const activity: RecentActivity[] = applications
      .filter(app => app.updatedAt)
      .sort((a, b) => {
        if (!a.updatedAt) return 1; // Sort undefined dates to the end
        if (!b.updatedAt) return -1;
        
        // Handle both Timestamp objects and string/Date values
        const dateA = typeof a.updatedAt === 'object' && a.updatedAt !== null && 'toDate' in a.updatedAt ? 
          (a.updatedAt as FirebaseTimestamp).toDate() : new Date(a.updatedAt);
        const dateB = typeof b.updatedAt === 'object' && b.updatedAt !== null && 'toDate' in b.updatedAt ? 
          (b.updatedAt as FirebaseTimestamp).toDate() : new Date(b.updatedAt);
          
        return dateB.getTime() - dateA.getTime();
      })
      .slice(0, 5)
      .map(app => ({
        id: app.id,
        type: app.status === ApplicationStatus.Applied ? 'applied' : 
              app.status === ApplicationStatus.InterviewScheduled ? 'interview_scheduled' :
              app.status === ApplicationStatus.OfferReceived ? 'offer_received' : 'status_update',
        application: app,
        timestamp: app.updatedAt && typeof app.updatedAt === 'object' && app.updatedAt !== null && 'toDate' in app.updatedAt ? 
          (app.updatedAt as FirebaseTimestamp).toDate() : new Date(app.updatedAt || Date.now()),
        description: getActivityDescription(app)
      }));

    setRecentActivity(activity);

    // Get upcoming reminders
    const reminders = applications
      .filter(app => app.keyDates?.nextAction)
      .sort((a, b) => {
        // Safer null/undefined checking for nested properties
        if (!a.keyDates?.nextAction) return 1; // Sort undefined dates to the end
        if (!b.keyDates?.nextAction) return -1;
        
        // Handle both Timestamp objects and string/Date values with type checking
        const dateA = a.keyDates.nextAction && typeof a.keyDates.nextAction === 'object' && a.keyDates.nextAction !== null && 'toDate' in a.keyDates.nextAction
          ? (a.keyDates.nextAction as FirebaseTimestamp).toDate() 
          : new Date(a.keyDates.nextAction);
        const dateB = b.keyDates.nextAction && typeof b.keyDates.nextAction === 'object' && b.keyDates.nextAction !== null && 'toDate' in b.keyDates.nextAction
          ? (b.keyDates.nextAction as FirebaseTimestamp).toDate() 
          : new Date(b.keyDates.nextAction);
          
        return dateA.getTime() - dateB.getTime();
      })
      .slice(0, 3);

    setUpcomingReminders(reminders);
  }, [applications]);

  const getActivityDescription = (app: JobApplication): string => {
    const companyName = app.company?.name || app.companyName || 'Unknown Company';
    const roleName = app.role?.title || 'Unknown Role';
    
    switch (app.status) {
      case ApplicationStatus.Applied:
        return `Applied to ${roleName} at ${companyName}`;
      case ApplicationStatus.InterviewScheduled:
        return `Interview scheduled for ${roleName} at ${companyName}`;
      case ApplicationStatus.OfferReceived:
        return `Offer received from ${companyName}`;
      default:
        return `Updated ${roleName} at ${companyName}`;
    }
  };

  const formatTimeAgo = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    if (diffMinutes > 0) return `${diffMinutes}m ago`;
    return 'Just now';
  };



  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSkeleton}>
          <div className={styles.skeletonHeader}></div>
          <div className={styles.skeletonStats}>
            {[1, 2, 3, 4].map(i => (
              <div key={i} className={styles.skeletonCard}></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.overviewContainer}>
      {/* Welcome Header */}
      <div className={styles.welcomeHeader}>
        <div className={styles.welcomeText}>
          <p className={styles.subtitle}>
            {t('jobTracker.overview.todaysDate', { 
              date: new Date().toLocaleDateString() 
            })}
          </p>
        </div>
        <GlassButton
          onClick={onAddApplication}
          variant="button"
          className={styles.quickAddButton}
        >
          <img src="/icons/add.svg" alt="Add" className="w-5 h-5" />
          {t('jobTracker.addApplication')}
        </GlassButton>
      </div>

      {/* Quick Stats Grid */}
      <div className={styles.statsGrid}>
        <FeatureTile
          icon={<img src="/icons/briefcase.svg" alt="Briefcase" />}
          title={t('jobTracker.totalApplications')}
          description={`${stats.totalApplications} | +${stats.thisWeekApplications} ${t('jobTracker.overview.thisWeek')}`}
        />
        <FeatureTile
          icon={<img src="/icons/trending-up.svg" alt="Trending Up" />}
          title={t('jobTracker.activeApplications')}
          description={`${stats.activeApplications} | ${stats.successRate}% ${t('jobTracker.successRate')}`}
        />
        <FeatureTile
          icon={<img src="/icons/users.svg" alt="User Group" />}
          title={t('jobTracker.interviews')}
          description={`${stats.interviews} | ${stats.avgResponseTime} avg`}
        />
        <FeatureTile
          icon={<img src="/icons/clock.svg" alt="Clock" />}
          title={t('jobTracker.overview.upcomingReminders')}
          description={`${stats.upcomingDeadlines} | Next 7 days`}
        />
      </div>

      {/* Content Grid */}
      <div className={styles.contentGrid}>
        {/* Recent Activity */}
        <GlassCard className={styles.activityCard}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>
              <img src="/icons/chart-bar.svg" alt="Chart" className="w-5 h-5" />
              {t('jobTracker.overview.recentActivity')}
            </h3>
          </div>
          <div className={styles.activityList}>
            {recentActivity.length > 0 ? (
              recentActivity.map((activity) => (
                <div key={activity.id} className={styles.activityItem}>
                  <div className={styles.activityIcon}>
                    <img src="/icons/chevron-right.svg" alt="Chevron Right" className={styles.actionIcon} />
                    <div className={`${styles.activityDot} ${styles[activity.type]}`}></div>
                  </div>
                  <div className={styles.activityContent}>
                    <p className={styles.activityDescription}>
                      {activity.description}
                    </p>
                    <span className={styles.activityTime}>
                      {formatTimeAgo(activity.timestamp)}
                    </span>
                  </div>
                  <GlassButton
                    onClick={() => onViewApplication(activity.application)}
                    variant="button"
                    size="sm"
                  >
                    <img src="/icons/chevron-right.svg" alt="Chevron Right" className="w-4 h-4" />
                  </GlassButton>
                </div>
              ))
            ) : (
              <div className={styles.emptyState}>
                <p>{t('jobTracker.overview.noRecentActivity')}</p>
              </div>
            )}
          </div>
        </GlassCard>

        {/* Upcoming Reminders */}
        <GlassCard className={styles.remindersCard}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>
              <img src="/icons/clock.svg" alt="Clock" className="w-5 h-5" />
              {t('jobTracker.overview.upcomingReminders')}
            </h3>
          </div>
          <div className={styles.remindersList}>
            {upcomingReminders.length > 0 ? (
              upcomingReminders.map((app) => (
                <div key={app.id} className={styles.reminderItem}>
                  <div className={styles.reminderContent}>
                    <p className={styles.reminderTitle}>
                      {app.role?.title || t('jobTracker.overview.unknownRole', 'Unknown Role')}
                    </p>
                    <p className={styles.reminderCompany}>
                      {app.company?.name || app.companyName}
                    </p>
                    <span className={styles.reminderDate}>
                      {app.keyDates?.nextAction && 
                        new Date(app.keyDates.nextAction).toLocaleDateString()
                      }
                    </span>
                  </div>
                  <GlassButton
                    onClick={() => onViewApplication(app)}
                    variant="button"
                    size="sm"
                  >
                    <img src="/icons/chevron-right.svg" alt="Chevron Right" className="w-4 h-4" />
                  </GlassButton>
                </div>
              ))
            ) : (
              <div className={styles.emptyState}>
                <p>{t('jobTracker.overview.noUpcomingReminders')}</p>
              </div>
            )}
          </div>
        </GlassCard>

        {/* AI Insights Preview */}
        <GlassCard className={styles.insightsCard}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>
              <img src="/icons/lightbulb.svg" alt="Lightbulb" className="w-5 h-5" />
              {t('jobTracker.overview.aiInsights')}
            </h3>
          </div>
          <div className={styles.insightsContent}>
            <div className={styles.insightItem}>
              <div className={styles.insightIcon}>
                <img src="/icons/trending-up.svg" alt="Trending Up" className="w-4 h-4 text-green-500" />
              </div>
              <p className={styles.insightText}>
                {t('jobTracker.overview.insightApplicationRate', 'Your application rate has increased 25% this week. Keep up the momentum!')}
              </p>
            </div>
            <div className={styles.insightItem}>
              <div className={styles.insightIcon}>
                <img src="/icons/clock.svg" alt="Clock" className="w-4 h-4 text-blue-500" />
              </div>
              <p className={styles.insightText}>
                {t('jobTracker.overview.insightSubmissionTiming', 'Tuesday-Thursday applications get 40% more responses. Consider timing your submissions.')}
              </p>
            </div>
            <GlassButton
              onClick={onViewAnalytics}
              variant="button"
              size="sm"
              className={styles.viewAllButton}
            >
              {t('common.viewAll')}
              <img src="/icons/chevron-right.svg" alt="Chevron Right" className="w-4 h-4" />
            </GlassButton>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};

export default PremiumJobTrackerOverview;
