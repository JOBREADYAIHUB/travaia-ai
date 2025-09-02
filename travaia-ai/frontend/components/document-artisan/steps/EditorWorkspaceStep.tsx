import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import GlassCard from '../../design-system/components/GlassCard';
import GlassButton from '../../design-system/components/GlassButton';
import { DocumentGoal, DocumentType, EditorState } from '../types/document-artisan.types';
import { documentTypeConfigs } from '../config/document-configs';
import SectionEditor from '../components/SectionEditor';
import LivePreview from '../components/LivePreview';
import FloatingActionButton from '../components/FloatingActionButton';
import BottomActions from '../components/BottomActions';

interface EditorWorkspaceStepProps {
  selectedGoal: DocumentGoal;
  selectedDocument: DocumentType;
  onBack: () => void;
}

/**
 * EditorWorkspaceStep - Step 3 of Document Artisan journey
 * 
 * Features:
 * - Interactive Section Cards with drag & drop
 * - Live Preview with theming options
 * - Floating Action Button for preview/style
 * - Save/Export functionality
 * - Mobile-first responsive design
 */
const EditorWorkspaceStep: React.FC<EditorWorkspaceStepProps> = ({
  selectedGoal,
  selectedDocument,
  onBack
}) => {
  const { t } = useTranslation();
  const [editorState, setEditorState] = useState<EditorState>({
    activeSection: null,
    previewMode: false,
    styleSettings: {
      theme: 'professional',
      fontSize: 14,
      fontFamily: 'Inter',
      spacing: 1.2
    }
  });

  const [documentData, setDocumentData] = useState<Record<string, any>>({});
  const [showPreview, setShowPreview] = useState(false);

  const docConfig = documentTypeConfigs[selectedDocument];

  const handleSectionUpdate = (sectionId: string, value: any) => {
    setDocumentData(prev => ({
      ...prev,
      [sectionId]: value
    }));
  };

  const handleStyleUpdate = (newSettings: Partial<EditorState['styleSettings']>) => {
    setEditorState(prev => ({
      ...prev,
      styleSettings: { ...prev.styleSettings, ...newSettings }
    }));
  };

  const togglePreview = () => {
    setShowPreview(!showPreview);
  };

  return (
    <div className="min-h-screen bg-transparent">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-glass-nav backdrop-blur-md border-b border-glass-border">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <GlassButton
                variant="button"
                size="sm"
                onClick={onBack}
                className="flex items-center space-x-2"
              >
                <span>←</span>
                <span>{t('common.back')}</span>
              </GlassButton>
              
              <div className="flex items-center space-x-3">
                <span className="text-2xl">{docConfig.icon}</span>
                <div>
                  <h1 className="text-lg font-semibold text-high-contrast">
                    {t(docConfig.titleKey)}
                  </h1>
                  <p className="text-sm text-medium-contrast">
                    {t('documentArtisan.editor.subtitle')}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <GlassButton
                variant="button"
                size="sm"
                onClick={togglePreview}
                className={showPreview ? 'bg-blue-500 text-white' : ''}
              >
                {showPreview ? t('documentArtisan.editor.hidePreview') : t('documentArtisan.editor.showPreview')}
              </GlassButton>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className={`grid gap-6 ${showPreview ? 'lg:grid-cols-2' : 'lg:grid-cols-1'}`}>
          {/* Editor Panel */}
          <div className="space-y-6">
            <SectionEditor
              documentType={selectedDocument}
              documentData={documentData}
              activeSection={editorState.activeSection}
              onSectionUpdate={handleSectionUpdate}
              onSectionSelect={(sectionId) => 
                setEditorState(prev => ({ ...prev, activeSection: sectionId }))
              }
            />
          </div>

          {/* Preview Panel */}
          {showPreview && (
            <div className="lg:sticky lg:top-24 lg:h-fit">
              <LivePreview
                documentType={selectedDocument}
                documentData={documentData}
                styleSettings={editorState.styleSettings}
                onStyleUpdate={handleStyleUpdate}
              />
            </div>
          )}
        </div>
      </div>

      {/* Floating Action Button */}
      <FloatingActionButton
        onPreviewToggle={togglePreview}
        showPreview={showPreview}
        styleSettings={editorState.styleSettings}
        onStyleUpdate={handleStyleUpdate}
      />

      {/* Bottom Actions */}
      <BottomActions
        documentType={selectedDocument}
        documentData={documentData}
        styleSettings={editorState.styleSettings}
      />
    </div>
  );
};

export default EditorWorkspaceStep;
