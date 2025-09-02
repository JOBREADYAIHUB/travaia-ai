import React from 'react';
import { useTranslation } from 'react-i18next';
import GlassCard from '../../design-system/components/GlassCard';
import GlassButton from '../../design-system/components/GlassButton';
import { DocumentGoal, DocumentType } from '../types/document-artisan.types';
import { documentGoalConfigs, documentTypeConfigs, getDifficultyColor } from '../config/document-configs';

interface DocumentSelectionStepProps {
  selectedGoal: DocumentGoal;
  onDocumentSelect: (documentType: DocumentType) => void;
  onBack: () => void;
}

/**
 * DocumentSelectionStep - Step 2 of Document Artisan journey
 * 
 * Features:
 * - Filtered document types based on selected goal
 * - Grid layout with document cards
 * - Difficulty indicators and time estimates
 * - Back navigation to goal selection
 */
const DocumentSelectionStep: React.FC<DocumentSelectionStepProps> = ({
  selectedGoal,
  onDocumentSelect,
  onBack
}) => {
  const { t } = useTranslation();
  
  const goalConfig = documentGoalConfigs.find(g => g.id === selectedGoal);
  const availableDocuments = goalConfig?.documents || [];

  return (
    <div className="min-h-screen px-4 py-8">
      {/* Header with Back Button */}
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <GlassButton
            variant="button"
            size="sm"
            onClick={onBack}
            className="flex items-center space-x-2"
          >
            <span>←</span>
            <span>{t('common.back')}</span>
          </GlassButton>
        </div>

        {/* Goal Context */}
        <div className="text-center mb-12">
          <div className={`text-5xl ${goalConfig?.color} mb-4`}>
            {goalConfig?.icon}
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-high-contrast mb-2">
            {goalConfig && t(goalConfig.titleKey)}
          </h1>
          <p className="text-medium-contrast max-w-2xl mx-auto">
            {t('documentArtisan.documentSelection.subtitle')}
          </p>
        </div>

        {/* Document Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {availableDocuments.map((documentId) => {
            const docConfig = documentTypeConfigs[documentId];
            return (
              <GlassCard
                key={documentId}
                variant="card"
                padding="lg"
                rounded="xl"
                hover
                className="cursor-pointer transition-all duration-300 hover:scale-105 active:scale-95 h-full"
                onClick={() => onDocumentSelect(documentId)}
              >
                <div className="flex flex-col h-full space-y-4">
                  {/* Icon and Title */}
                  <div className="text-center">
                    <div className="text-4xl mb-3">
                      {docConfig.icon}
                    </div>
                    <h3 className="text-lg font-semibold text-high-contrast">
                      {t(docConfig.titleKey)}
                    </h3>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-medium-contrast leading-relaxed flex-grow">
                    {t(docConfig.descriptionKey)}
                  </p>

                  {/* Metadata */}
                  <div className="space-y-2">
                    {/* Time Estimate */}
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-low-contrast">
                        {t('documentArtisan.documentSelection.estimatedTime')}
                      </span>
                      <span className="text-medium-contrast font-medium">
                        {docConfig.estimatedTime}
                      </span>
                    </div>

                    {/* Difficulty Badge */}
                    <div className="flex justify-center">
                      <span className={`
                        px-3 py-1 rounded-full text-xs font-medium
                        ${getDifficultyColor(docConfig.difficulty)}
                      `}>
                        {t(`documentArtisan.difficulty.${docConfig.difficulty}`)}
                      </span>
                    </div>
                  </div>
                </div>
              </GlassCard>
            );
          })}
        </div>

        {/* Help Text */}
        <div className="mt-12 text-center max-w-lg mx-auto">
          <p className="text-sm text-low-contrast">
            {t('documentArtisan.documentSelection.helpText')}
          </p>
        </div>
      </div>
    </div>
  );
};

export default DocumentSelectionStep;
