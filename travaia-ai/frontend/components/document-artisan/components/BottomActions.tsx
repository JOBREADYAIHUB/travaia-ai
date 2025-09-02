import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import GlassButton from '../../design-system/components/GlassButton';
import GlassModal from '../../design-system/components/GlassModal';
import { DocumentType, EditorState } from '../types/document-artisan.types';

interface BottomActionsProps {
  documentType: DocumentType;
  documentData: Record<string, any>;
  styleSettings: EditorState['styleSettings'];
}

/**
 * BottomActions - Save and export functionality
 * 
 * Features:
 * - Save as draft
 * - Export to PDF
 * - Share options
 * - Progress tracking
 */
const BottomActions: React.FC<BottomActionsProps> = ({
  documentType,
  documentData,
  styleSettings
}) => {
  const { t } = useTranslation();
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    // Simulate save operation
    setTimeout(() => {
      setIsSaving(false);
      // Show success notification
    }, 1000);
  };

  const handleExport = async (format: 'pdf' | 'docx' | 'html') => {
    setIsExporting(true);
    // Simulate export operation
    setTimeout(() => {
      setIsExporting(false);
      setShowExportModal(false);
      // Trigger download
    }, 2000);
  };

  const getCompletionPercentage = () => {
    const totalFields = Object.keys(documentData).length;
    const filledFields = Object.values(documentData).filter(value => 
      value && (typeof value === 'string' ? value.trim() : true)
    ).length;
    return totalFields > 0 ? Math.round((filledFields / totalFields) * 100) : 0;
  };

  return (
    <>
      {/* Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-glass-nav backdrop-blur-md border-t border-glass-border">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Progress Indicator */}
            <div className="flex items-center space-x-3">
              <div className="text-sm text-medium-contrast">
                {t('documentArtisan.bottomActions.progress')}
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-24 h-2 bg-glass-light rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 transition-all duration-300"
                    style={{ width: `${getCompletionPercentage()}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-high-contrast">
                  {getCompletionPercentage()}%
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-3">
              <GlassButton
                variant="button"
                size="sm"
                loading={isSaving}
                onClick={handleSave}
                className="flex items-center space-x-2"
              >
                <span>💾</span>
                <span>{t('documentArtisan.bottomActions.save')}</span>
              </GlassButton>

              <GlassButton
                variant="button"
                size="sm"
                onClick={() => setShowExportModal(true)}
                className="flex items-center space-x-2 bg-blue-500 text-white"
              >
                <span>📤</span>
                <span>{t('documentArtisan.bottomActions.export')}</span>
              </GlassButton>
            </div>
          </div>
        </div>
      </div>

      {/* Export Modal */}
      <GlassModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        title={t('documentArtisan.export.title')}
        size="md"
      >
        <div className="space-y-6">
          <p className="text-medium-contrast">
            {t('documentArtisan.export.description')}
          </p>

          {/* Export Options */}
          <div className="space-y-3">
            <button
              onClick={() => handleExport('pdf')}
              disabled={isExporting}
              className="w-full p-4 bg-glass-light border border-glass-border rounded-lg hover:bg-glass-medium transition-colors text-left"
            >
              <div className="flex items-center space-x-3">
                <span className="text-2xl">📄</span>
                <div>
                  <div className="font-medium text-high-contrast">
                    {t('documentArtisan.export.pdf.title')}
                  </div>
                  <div className="text-sm text-medium-contrast">
                    {t('documentArtisan.export.pdf.description')}
                  </div>
                </div>
              </div>
            </button>

            <button
              onClick={() => handleExport('docx')}
              disabled={isExporting}
              className="w-full p-4 bg-glass-light border border-glass-border rounded-lg hover:bg-glass-medium transition-colors text-left"
            >
              <div className="flex items-center space-x-3">
                <span className="text-2xl">📝</span>
                <div>
                  <div className="font-medium text-high-contrast">
                    {t('documentArtisan.export.docx.title')}
                  </div>
                  <div className="text-sm text-medium-contrast">
                    {t('documentArtisan.export.docx.description')}
                  </div>
                </div>
              </div>
            </button>

            <button
              onClick={() => handleExport('html')}
              disabled={isExporting}
              className="w-full p-4 bg-glass-light border border-glass-border rounded-lg hover:bg-glass-medium transition-colors text-left"
            >
              <div className="flex items-center space-x-3">
                <span className="text-2xl">🌐</span>
                <div>
                  <div className="font-medium text-high-contrast">
                    {t('documentArtisan.export.html.title')}
                  </div>
                  <div className="text-sm text-medium-contrast">
                    {t('documentArtisan.export.html.description')}
                  </div>
                </div>
              </div>
            </button>
          </div>

          {isExporting && (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent mx-auto mb-2"></div>
              <p className="text-sm text-medium-contrast">
                {t('documentArtisan.export.processing')}
              </p>
            </div>
          )}
        </div>
      </GlassModal>
    </>
  );
};

export default BottomActions;
