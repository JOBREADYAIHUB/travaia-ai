import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useLocalization } from '../../contexts/LocalizationContext';
import { GlassCard, PageHeader } from '../design-system';
import AppBackground from '../layout/AppBackground';
import PageContent from '../layout/PageContent';
import enhancedStyles from './EnhancedDashboard.module.css';
import FeatureTile from './FeatureTile';

import { JobApplication, ApplicationStatus } from '../../types';

interface Activity {
  id: string;
  text: string;
  date: string;
}

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { translate, language } = useLocalization();
  const { t } = useTranslation();
  const { currentUser } = useAuth();

  // TODO: Fetch applications from a service
  const applications: JobApplication[] = [];

  const activeApplicationsCount = applications.filter(
    (app) =>
      app.status !== ApplicationStatus.Rejected &&
      app.status !== ApplicationStatus.OfferReceived,
  ).length;

  const upcomingInterviewsCount = applications.filter(
    (app) => app.status === ApplicationStatus.InterviewScheduled,
  ).length;

  // Mock data for enhanced dashboard features
  const todayApplications = 3;
  const xpEarned = 150;
  const streakDays = 7;
  const weeklyChallenge = { current: 2, total: 5 };
  const userLevel = 8;
  const xpToNext = 75;

  const recentActivities: Activity[] = applications.slice(0, 3).map((app) => ({
    id: app.id,
    text: translate('appliedTo', {
      jobTitle: app.role.title,
      companyName: app.company.name,
    }),
    date: new Date(app.keyDates.submissionDate).toLocaleDateString(language),
  }));

  if (
    recentActivities.length < 3 &&
    applications.some((app) => app.status === ApplicationStatus.InterviewScheduled)
  ) {
    const interviewApp = applications.find(
      (app) => app.status === ApplicationStatus.InterviewScheduled,
    );
    if (
      interviewApp &&
      !recentActivities.find((act) => act.id.includes(interviewApp.id))
    ) {
      recentActivities.push({
        id: `interview-${interviewApp.id}`,
        text: translate('scheduledInterviewFor', {
          jobTitle: interviewApp.role.title,
        }),
        date: new Date().toLocaleDateString(language),
      });
    }
  }
  const displayActivities = recentActivities.slice(0, 3);

  const dummyPersonalizedTips = [
    translate('aiSuggestionJobFit', {
      jobTitle: 'Software Engineer',
      companyName: 'Tech Solutions Inc.',
    }),
    'Focus on roles requiring Python; your resume highlights it well.',
    'Consider networking with professionals in the FinTech industry.',
    'Practice behavioral questions using the STAR method for upcoming interviews.',
  ];

  return (
    <AppBackground>
      <PageContent>
        {/* Dashboard Header */}
        <PageHeader
          title={(() => {
            const userName = currentUser?.displayName || 
                           currentUser?.email?.split('@')[0] || 
                           'User';
            return `${t('dashboard.greeting')} ${userName}!`;
          })()} 
          subtitle={t('dashboard.subtitle')}
          showUserProfile={true}
        />

        {/* Welcome Hub */}
        <div className={enhancedStyles.welcomeHub}>
          <div className={enhancedStyles.welcomeGreeting}>
          </div>
        </div>

        {/* Feature Tiles */}
        <div className={enhancedStyles.featureTiles}>
          <FeatureTile
            icon="📋"
            title={t('dashboard.featureTiles.trackApplications')}
            description={t('dashboard.featureTiles.trackApplicationsDesc')}
            onClick={() => navigate(`/${language}/${t('routes.jobs')}`)}
          />
          <FeatureTile
            icon="📝"
            title={t('dashboard.featureTiles.buildCV')}
            description={t('dashboard.featureTiles.buildCVDesc')}
            onClick={() => navigate(`/${language}/${t('routes.cvBuilder')}`)}
          />
          <FeatureTile
            icon="🎤"
            title={t('dashboard.featureTiles.practiceInterview')}
            description={t('dashboard.featureTiles.practiceInterviewDesc')}
            onClick={() => navigate(`/${language}/${t('routes.interview')}`)}
          />
          <FeatureTile
            icon="📊"
            title={t('dashboard.featureTiles.viewInsights')}
            description={t('dashboard.featureTiles.viewInsightsDesc')}
            onClick={() => navigate(`/${language}/${t('routes.analytics')}`)}
          />
          <FeatureTile
            icon="📁"
            title={t('dashboard.featureTiles.manageDocuments')}
            description={t('dashboard.featureTiles.manageDocumentsDesc')}
            onClick={() => navigate(`/${language}/${t('routes.documentManager')}`)}
          />
        </div>

        {/* Progress & Goals Section */}
        <section className={enhancedStyles.progressSection}>
          <h2 className="text-2xl font-bold text-white mb-6">
            {t('dashboard.progress.title')}
          </h2>
          <div className={enhancedStyles.progressGrid}>
            <GlassCard 
              className={enhancedStyles.challengeCard}
              variant="medium"
              padding="lg"
            >
              <div className={enhancedStyles.challengeHeader}>
                <h3 className={enhancedStyles.challengeTitle}>
                  {t('dashboard.progress.weeklyChallenge')}
                </h3>
                <span className={enhancedStyles.challengeProgress}>
                  {t('dashboard.progress.challengeProgress', {
                    current: weeklyChallenge.current,
                    total: weeklyChallenge.total
                  })}
                </span>
              </div>
              <progress 
                value={(weeklyChallenge.current / weeklyChallenge.total) * 100}
                max={100}
                className={`${enhancedStyles.progressBar} w-full h-2 rounded-lg`}
              />
              <div className={enhancedStyles.badgesGrid}>
                <div className={enhancedStyles.badgeItem}>
                  <span className={enhancedStyles.badgeIcon}>🏆</span>
                  <span className={enhancedStyles.badgeText}>
                    {t('dashboard.progress.badges')}
                  </span>
                </div>
                <div className={enhancedStyles.badgeItem}>
                  <span className={enhancedStyles.badgeIcon}>⚡</span>
                  <span className={enhancedStyles.badgeText}>
                    {t('dashboard.progress.xpBuildUp')}
                  </span>
                </div>
              </div>
            </GlassCard>

            <GlassCard 
              className={enhancedStyles.xpCard}
              variant="medium"
              padding="lg"
            >
              <div className={enhancedStyles.xpLevel}>
                {t('dashboard.progress.level', { level: userLevel })}
              </div>
              <div className={enhancedStyles.xpProgress}>
                {t('dashboard.progress.nextLevel', { xp: xpToNext })}
              </div>
            </GlassCard>
          </div>
        </section>

        {/* Personalization & Tips */}
        <section className={enhancedStyles.personalizationSection}>
          <h2 className="text-2xl font-bold text-white mb-6">
            {t('dashboard.personalization.title')}
          </h2>
          <div className={enhancedStyles.tipsGrid}>
            <GlassCard 
              className={enhancedStyles.tipCard}
              variant="light"
              padding="md"
            >
              <span className={enhancedStyles.tipIcon}>🌍</span>
              <p className={enhancedStyles.tipText}>
                {t('dashboard.personalization.languageTip')}
              </p>
            </GlassCard>
            <GlassCard 
              className={enhancedStyles.tipCard}
              variant="light"
              padding="md"
            >
              <span className={enhancedStyles.tipIcon}>📄</span>
              <p className={enhancedStyles.tipText}>
                {t('dashboard.personalization.cvTip')}
              </p>
            </GlassCard>
            <GlassCard 
              className={enhancedStyles.tipCard}
              variant="light"
              padding="md"
            >
              <span className={enhancedStyles.tipIcon}>🎯</span>
              <p className={enhancedStyles.tipText}>
                {t('dashboard.personalization.interviewTip')}
              </p>
            </GlassCard>
            <GlassCard 
              className={enhancedStyles.tipCard}
              variant="light"
              padding="md"
            >
              <span className={enhancedStyles.tipIcon}>🤝</span>
              <p className={enhancedStyles.tipText}>
                {t('dashboard.personalization.networkingTip')}
              </p>
            </GlassCard>
          </div>
        </section>
      </PageContent>
    </AppBackground>
  );
};

export default DashboardPage;
