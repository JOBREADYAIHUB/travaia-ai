import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '../design-system';
import AppBackground from '../layout/AppBackground';
import PageContent from '../layout/PageContent';
import GoalSelectionStep from './steps/GoalSelectionStep';
import DocumentSelectionStep from './steps/DocumentSelectionStep';
import EditorWorkspaceStep from './steps/EditorWorkspaceStep';
import { DocumentGoal, DocumentType } from './types/document-artisan.types';

/**
 * DocumentArtisanPage - Main component for the guided three-step document journey
 * 
 * Features:
 * - Step 1: Goal Selection (Preparation, Application, Post-Interview)
 * - Step 2: Document Selection (filtered by goal)
 * - Step 3: Editor Workspace (interactive document creation)
 * - Mobile-first responsive design
 * - Uses existing TRAVAIA design system
 */
const DocumentArtisanPage: React.FC = () => {
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Component state management
  const [selectedGoal, setSelectedGoal] = useState<DocumentGoal | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<DocumentType | null>(null);

  const handleGoalSelection = (goal: DocumentGoal) => {
    setSelectedGoal(goal);
    setCurrentStep(2);
  };

  const handleDocumentSelection = (documentType: DocumentType) => {
    setSelectedDocument(documentType);
    setCurrentStep(3);
  };

  const handleBackToGoals = () => {
    setSelectedGoal(null);
    setCurrentStep(1);
  };

  const handleBackToDocuments = () => {
    setSelectedDocument(null);
    setCurrentStep(2);
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <GoalSelectionStep 
            onGoalSelect={handleGoalSelection}
          />
        );
      case 2:
        return (
          <DocumentSelectionStep 
            selectedGoal={selectedGoal!}
            onDocumentSelect={handleDocumentSelection}
            onBack={handleBackToGoals}
          />
        );
      case 3:
        return (
          <EditorWorkspaceStep 
            selectedGoal={selectedGoal!}
            selectedDocument={selectedDocument!}
            onBack={handleBackToDocuments}
          />
        );
      default:
        return null;
    }
  };

  return (
    <AppBackground>
      <PageContent>
        {currentStep === 1 && (
          <PageHeader
            title={t('documentArtisan.title')}
            subtitle={t('documentArtisan.subtitle')}
          />
        )}
        <div className="max-w-4xl mx-auto">
          {renderCurrentStep()}
        </div>
      </PageContent>
    </AppBackground>
  );
};

export default DocumentArtisanPage;
