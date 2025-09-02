import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { PageHeader, GlassCard, GlassButton, ProgressBar } from '../design-system';

interface GamificationPanelProps {
  userId?: string; // Add userId as optional
  currentXP?: number;
  currentLevel?: number;
  streak?: number;
  badges?: Badge[];
  recentAchievements?: Achievement[];
  onViewAllBadges?: () => void;
}

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  unlockedAt?: string;
  progress?: number;
  maxProgress?: number;
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  xpReward: number;
  unlockedAt: string;
  icon: string;
}

const GamificationPanel: React.FC<GamificationPanelProps> = ({
  userId,
  currentXP = 0,
  currentLevel = 1,
  streak = 0,
  badges = [],
  onViewAllBadges = () => {}
}) => {
  const { t } = useTranslation();
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);
  const [animatingXP, setAnimatingXP] = useState(false);

  // Effect to fetch user gamification data when userId changes
  useEffect(() => {
    if (userId) {
      // TODO: Replace mock data with actual data fetching
      console.log(`Fetching gamification data for user ${userId}`);
      // Possible implementation:
      // fetchUserGamificationData(userId).then(data => {
      //   if (data) {
      //     setCurrentXP(data.currentXP);
      //     setCurrentLevel(data.currentLevel);
      //     setStreak(data.streak);
      //     // etc.
      //   }
      // });
    }
  }, [userId]);

  // Calculate level progress
  const xpForCurrentLevel = currentLevel * 1000;
  const xpForNextLevel = (currentLevel + 1) * 1000;
  const xpProgress = currentXP - xpForCurrentLevel;
  const xpNeeded = xpForNextLevel - xpForCurrentLevel;
  const progressPercentage = Math.min((xpProgress / xpNeeded) * 100, 100);

  // Mock data for demonstration
  const mockBadges: Badge[] = [
    {
      id: 'first-interview',
      name: t('mockInterview.gamification.badges.firstInterview'),
      description: t('mockInterview.gamification.badges.firstInterviewDesc'),
      icon: '🎤',
      rarity: 'common',
      unlockedAt: new Date().toISOString()
    },
    {
      id: 'perfect-score',
      name: t('mockInterview.gamification.badges.perfectScore'),
      description: t('mockInterview.gamification.badges.perfectScoreDesc'),
      icon: '💯',
      rarity: 'legendary',
      progress: 85,
      maxProgress: 100
    },
    {
      id: 'streak-master',
      name: t('mockInterview.gamification.badges.streakMaster'),
      description: t('mockInterview.gamification.badges.streakMasterDesc'),
      icon: '🔥',
      rarity: 'epic',
      progress: streak,
      maxProgress: 7
    },
    {
      id: 'tech-expert',
      name: t('mockInterview.gamification.badges.techExpert'),
      description: t('mockInterview.gamification.badges.techExpertDesc'),
      icon: '💻',
      rarity: 'rare',
      progress: 3,
      maxProgress: 10
    }
  ];

  const mockAchievements: Achievement[] = [
    {
      id: 'completed-interview',
      title: t('mockInterview.gamification.achievements.completedInterview'),
      description: t('mockInterview.gamification.achievements.completedInterviewDesc'),
      xpReward: 100,
      unlockedAt: new Date().toISOString(),
      icon: '✅'
    },
    {
      id: 'high-score',
      title: t('mockInterview.gamification.achievements.highScore'),
      description: t('mockInterview.gamification.achievements.highScoreDesc'),
      xpReward: 250,
      unlockedAt: new Date(Date.now() - 86400000).toISOString(),
      icon: '🌟'
    }
  ];

  useEffect(() => {
    // Simulate XP animation when component mounts
    setAnimatingXP(true);
    const timer = setTimeout(() => setAnimatingXP(false), 1000);
    return () => clearTimeout(timer);
  }, [currentXP]);

  const getRarityColor = (rarity: Badge['rarity']) => {
    switch (rarity) {
      case 'common': return 'text-gray-600 border-gray-300';
      case 'rare': return 'text-blue-600 border-blue-300';
      case 'epic': return 'text-purple-600 border-purple-300';
      case 'legendary': return 'text-yellow-600 border-yellow-300';
      default: return 'text-gray-600 border-gray-300';
    }
  };

  const getRarityBg = (rarity: Badge['rarity']) => {
    switch (rarity) {
      case 'common': return 'bg-gray-50 dark:bg-gray-800';
      case 'rare': return 'bg-blue-50 dark:bg-blue-900/20';
      case 'epic': return 'bg-purple-50 dark:bg-purple-900/20';
      case 'legendary': return 'bg-yellow-50 dark:bg-yellow-900/20';
      default: return 'bg-gray-50 dark:bg-gray-800';
    }
  };

  const getStreakEmoji = (streak: number) => {
    if (streak >= 30) return '🔥🔥🔥';
    if (streak >= 14) return '🔥🔥';
    if (streak >= 7) return '🔥';
    if (streak >= 3) return '⚡';
    return '💪';
  };

  return (
    <div className="space-y-6">
      {/* Level and XP Progress */}
      <GlassCard className="p-6 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20">
        <div className="text-center mb-4">
          <div className="flex items-center justify-center mb-2">
            <span className="text-2xl mr-2">🏆</span>
            <h3 className="text-xl font-bold text-purple-800 dark:text-purple-200">
              {t('mockInterview.gamification.level')} {currentLevel}
            </h3>
          </div>
          <p className="text-sm text-purple-600 dark:text-purple-300">
            {t('mockInterview.gamification.interviewMaster')}
          </p>
        </div>

        {/* XP Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-purple-700 dark:text-purple-300">
              {xpProgress.toLocaleString()} XP
            </span>
            <span className="text-purple-700 dark:text-purple-300">
              {xpNeeded.toLocaleString()} XP
            </span>
          </div>
          <ProgressBar 
            value={progressPercentage}
            max={100}
            variant="gamification"
            size="lg"
            animated={true}
            className={animatingXP ? 'animate-pulse' : ''}
          />
          <div className="text-center">
            <span className="text-xs text-purple-600 dark:text-purple-400">
              {Math.round(progressPercentage)}% {t('mockInterview.gamification.toNextLevel')}
            </span>
          </div>
        </div>
      </GlassCard>

      {/* Streak Counter */}
      <GlassCard className="p-6 bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20">
        <div className="text-center">
          <div className="text-4xl mb-2">{getStreakEmoji(streak)}</div>
          <h4 className="text-lg font-semibold text-orange-800 dark:text-orange-200 mb-1">
            {streak} {t('mockInterview.gamification.dayStreak')}
          </h4>
          <p className="text-sm text-orange-600 dark:text-orange-300">
            {streak > 0 
              ? t('mockInterview.gamification.keepItUp')
              : t('mockInterview.gamification.startStreak')
            }
          </p>
        </div>
      </GlassCard>

      {/* Recent Badges */}
      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-semibold flex items-center">
            <span className="mr-2">🏅</span>
            {t('mockInterview.gamification.badges.title')}
          </h4>
          <GlassButton
            onClick={onViewAllBadges}
            variant="button"
            size="sm"
          >
            {t('common.viewAll')}
          </GlassButton>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {mockBadges.slice(0, 4).map((badge) => (
            <div
              key={badge.id}
              className={`p-3 rounded-lg border-2 ${getRarityBg(badge.rarity)} ${getRarityColor(badge.rarity)} ${
                badge.unlockedAt ? 'opacity-100' : 'opacity-50'
              }`}
            >
              <div className="text-center">
                <div className="text-2xl mb-1">{badge.icon}</div>
                <div className="text-xs font-medium mb-1">{badge.name}</div>
                {badge.progress !== undefined && badge.maxProgress && (
                  <ProgressBar 
                    value={badge.progress}
                    max={badge.maxProgress}
                    variant="achievement"
                    size="sm"
                  />
                )}
                {badge.unlockedAt && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 mt-1">
                    {t('common.unlocked')}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Recent Achievements */}
      {mockAchievements.length > 0 && (
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold flex items-center">
              <span className="mr-2">🎯</span>
              {t('mockInterview.gamification.achievements.title')}
            </h4>
            <GlassButton
              onClick={() => setShowAchievements(true)}
              variant="button"
              size="sm"
            >
              {t('common.viewAll')}
            </GlassButton>
          </div>

          <div className="space-y-3">
            {mockAchievements.slice(0, 3).map((achievement) => (
              <div
                key={achievement.id}
                className="flex items-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800"
              >
                <span className="text-2xl mr-3">{achievement.icon}</span>
                <div className="flex-1">
                  <div className="font-medium text-green-800 dark:text-green-200">
                    {achievement.title}
                  </div>
                  <div className="text-sm text-green-600 dark:text-green-300">
                    {achievement.description}
                  </div>
                </div>
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                  +{achievement.xpReward} XP
                </span>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* Quick Stats */}
      <GlassCard className="p-6">
        <h4 className="text-lg font-semibold mb-4 flex items-center">
          <span className="mr-2">📊</span>
          {t('mockInterview.gamification.stats')}
        </h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {Math.floor(currentXP / 100)}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              {t('mockInterview.gamification.totalInterviews')}
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {Math.floor(Math.random() * 20) + 80}%
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              {t('mockInterview.gamification.avgScore')}
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {mockBadges.filter(b => b.unlockedAt).length}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              {t('mockInterview.gamification.badgesEarned')}
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {streak}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              {t('mockInterview.gamification.bestStreak')}
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Level Up Modal */}
      <GlassModal
        isOpen={showLevelUp}
        onClose={() => setShowLevelUp(false)}
        title={t('mockInterview.gamification.levelUp')}
        size="sm"
      >
        <div className="p-6 text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h3 className="text-2xl font-bold mb-2">
            {t('mockInterview.gamification.congratulations')}!
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {t('mockInterview.gamification.reachedLevel')} {currentLevel}!
          </p>
          <GlassButton
            onClick={() => setShowLevelUp(false)}
            variant="button"
            className="w-full"
          >
            {t('common.awesome')}
          </GlassButton>
        </div>
      </GlassModal>

      {/* Achievements Modal */}
      <GlassModal
        isOpen={showAchievements}
        onClose={() => setShowAchievements(false)}
        title={t('mockInterview.gamification.achievements.title')}
        size="lg"
      >
        <div className="p-6">
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {mockAchievements.map((achievement) => (
              <div
                key={achievement.id}
                className="flex items-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
              >
                <span className="text-3xl mr-4">{achievement.icon}</span>
                <div className="flex-1">
                  <div className="font-semibold text-gray-800 dark:text-gray-200">
                    {achievement.title}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    {achievement.description}
                  </div>
                  <div className="text-xs text-gray-500">
                    {t('common.unlocked')} {new Date(achievement.unlockedAt).toLocaleDateString()}
                  </div>
                </div>
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                  +{achievement.xpReward} XP
                </span>
              </div>
            ))}
          </div>
        </div>
      </GlassModal>
    </div>
  );
};

export default GamificationPanel;
