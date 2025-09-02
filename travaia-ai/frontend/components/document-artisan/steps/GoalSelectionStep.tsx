import React from 'react';
import { useTranslation } from 'react-i18next';
import GlassCard from '../../design-system/components/GlassCard';
import { DocumentGoal } from '../types/document-artisan.types';
import { documentGoalConfigs } from '../config/document-configs';

interface GoalSelectionStepProps {
  onGoalSelect: (goal: DocumentGoal) => void;
}

/**
 * GoalSelectionStep - Step 1 of Document Artisan journey
 * 
 * Features:
 * - Three large tappable cards for goal categories
 * - Mobile-first responsive design
 * - Uses existing TRAVAIA design system
 * - Full internationalization support
 */
const GoalSelectionStep: React.FC<GoalSelectionStepProps> = ({ onGoalSelect }) => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-8">
      {/* Header */}
      <div className="text-center mb-12 max-w-2xl">
        <h1 className="text-3xl md:text-4xl font-bold text-high-contrast mb-4">
          {t('documentArtisan.goalSelection.title')}
        </h1>
        <p className="text-lg text-medium-contrast">
          {t('documentArtisan.goalSelection.subtitle')}
        </p>
      </div>

      {/* Goal Cards */}
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-3 gap-6">
        {documentGoalConfigs.map((goal) => (
          <GlassCard
            key={goal.id}
            variant="card"
            padding="lg"
            rounded="xl"
            hover
            className="cursor-pointer transition-all duration-300 hover:scale-105 active:scale-95"
            onClick={() => onGoalSelect(goal.id)}
          >
            <div className="text-center space-y-4">
              {/* Icon */}
              <div className={`text-6xl ${goal.color} mx-auto`}>
                {goal.icon}
              </div>

              {/* Title */}
              <h3 className="text-xl font-semibold text-high-contrast">
                {t(goal.titleKey)}
              </h3>

              {/* Description */}
              <p className="text-medium-contrast text-sm leading-relaxed">
                {t(goal.descriptionKey)}
              </p>

              {/* Document Count */}
              <div className="text-xs text-low-contrast bg-glass-light rounded-full px-3 py-1 inline-block">
                {t('documentArtisan.goalSelection.documentCount', { count: goal.documents.length })}
              </div>
            </div>
          </GlassCard>
        ))}
      </div>

      {/* Help Text */}
      <div className="mt-12 text-center max-w-lg">
        <p className="text-sm text-low-contrast">
          {t('documentArtisan.goalSelection.helpText')}
        </p>
      </div>
    </div>
  );
};

export default GoalSelectionStep;
