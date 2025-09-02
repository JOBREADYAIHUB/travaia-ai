import React, { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { GlassCard } from '../design-system';
import { CircularProgressIndicator } from '../common/CircularProgressIndicator';
// Using direct path to logo in public directory instead of import
// as the assets directory doesn't exist

interface ShareableCardProps {
  companyName: string;
  jobTitle: string;
  matchScore: number;
  userName: string;
  skills: { name: string; score: number }[];
  strengths: string[];
  className?: string;
}

const ShareableCard: React.FC<ShareableCardProps> = ({
  companyName,
  jobTitle,
  matchScore,
  userName,
  skills,
  strengths,
  className = '',
}) => {
  const { t } = useTranslation();
  const cardRef = useRef<HTMLDivElement>(null);

  // Color gradient based on match score
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'from-green-400 to-green-600';
    if (score >= 60) return 'from-blue-400 to-blue-600';
    if (score >= 40) return 'from-yellow-400 to-yellow-600';
    return 'from-red-400 to-red-600';
  };

  return (
    <div ref={cardRef} className={`${className} max-w-lg mx-auto`}>
      <GlassCard className="overflow-hidden">
        {/* Header with branding */}
        <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200 dark:border-gray-700/40">
          <div className="flex items-center">
            <img src="/logo.svg" alt="Company Logo" className="h-8 w-auto mr-2" />
            <h2 className="text-xl font-bold">Travaia</h2>
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {t('analyticsPage.shareableCard.generatedBy')}
          </div>
        </div>

        {/* Job Match Info */}
        <div className="text-center mb-6">
          <h3 className="text-lg font-semibold mb-1">{t('analyticsPage.shareableCard.jobMatchFor', { userName })}</h3>
          <div className="text-xl font-bold mb-2">
            {jobTitle} @ {companyName}
          </div>
          
          {/* Match score with animation */}
          <div className="flex justify-center mb-4">
            <div className="relative w-32 h-32">
              <CircularProgressIndicator 
                value={matchScore} 
                size={128} 
                strokeWidth={8} 
                progressColor={matchScore >= 80 ? '#22c55e' : matchScore >= 60 ? '#3b82f6' : matchScore >= 40 ? '#eab308' : '#ef4444'} 
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div>
                  <div className="text-3xl font-bold">{matchScore}%</div>
                  <div className="text-sm">{t('analyticsPage.shareableCard.match')}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Key skills with animation */}
        <div className="mb-6">
          <h4 className="text-md font-semibold mb-3">{t('analyticsPage.shareableCard.keySkills')}</h4>
          <div className="space-y-3">
            {skills.slice(0, 3).map((skill, index) => (
              <motion.div 
                key={index}
                initial={{ width: 0 }}
                animate={{ width: `${skill.score}%` }}
                transition={{ duration: 1, delay: index * 0.2 }}
                className="relative h-8"
              >
                <div 
                  className={`absolute top-0 left-0 h-full rounded-full bg-gradient-to-r ${getScoreColor(skill.score)}`} 
                  style={{ width: `${skill.score}%` }}
                />
                <div className="absolute top-0 left-0 h-full w-full px-3 flex items-center justify-between">
                  <span className="font-medium text-sm text-white drop-shadow-md">{skill.name}</span>
                  <span className="font-medium text-sm text-white drop-shadow-md">{skill.score}%</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Strengths */}
        <div>
          <h4 className="text-md font-semibold mb-3">{t('analyticsPage.shareableCard.keyStrengths')}</h4>
          <ul className="space-y-2">
            {strengths.slice(0, 3).map((strength, index) => (
              <li key={index} className="flex items-start">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.8 + index * 0.2 }}
                  className="flex items-start w-full"
                >
                <span className="inline-block bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-full p-1 mr-2">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </span>
                <span className="text-sm">{strength}</span>
                </motion.div>
              </li>
            ))}
          </ul>
        </div>

        {/* Footer with social prompt */}
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700/40 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('analyticsPage.shareableCard.findOutYourMatch')}
          </p>
          <p className="text-sm font-medium">www.travaia.ai</p>
        </div>
      </GlassCard>
    </div>
  );
};

export default ShareableCard;
