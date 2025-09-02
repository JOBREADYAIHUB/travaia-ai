import React from 'react';
import { useTranslation } from 'react-i18next';
import GlassCard from '../../design-system/components/GlassCard';
import GlassButton from '../../design-system/components/GlassButton';
import { DocumentType, EditorState } from '../types/document-artisan.types';
import { getDocumentTemplate } from '../templates/document-templates';
import StylePanel from './StylePanel';

interface LivePreviewProps {
  documentType: DocumentType;
  documentData: Record<string, any>;
  styleSettings: EditorState['styleSettings'];
  onStyleUpdate: (settings: Partial<EditorState['styleSettings']>) => void;
}

/**
 * LivePreview - Real-time document preview with styling options
 * 
 * Features:
 * - Live document preview
 * - Theme and style customization
 * - QR code for mobile preview
 * - Export options
 */
const LivePreview: React.FC<LivePreviewProps> = ({
  documentType,
  documentData,
  styleSettings,
  onStyleUpdate
}) => {
  const { t } = useTranslation();
  const [showStylePanel, setShowStylePanel] = useState(false);
  
  const template = getDocumentTemplate(documentType);

  const renderPreviewContent = () => {
    if (!template) return null;

    return (
      <div 
        className="prose prose-sm max-w-none"
        style={{
          fontSize: `${styleSettings.fontSize}px`,
          fontFamily: styleSettings.fontFamily,
          lineHeight: styleSettings.spacing
        }}
      >
        {template.sections.map((section) => {
          const value = documentData[section.id];
          if (!value) return null;

          return (
            <div key={section.id} className="mb-4">
              <h4 className="font-semibold text-high-contrast mb-2">
                {t(section.titleKey)}
              </h4>
              
              {section.type === 'text' && (
                <p className="text-medium-contrast whitespace-pre-wrap">
                  {value}
                </p>
              )}
              
              {section.type === 'list' && Array.isArray(value) && (
                <ul className="list-disc list-inside text-medium-contrast">
                  {value.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              )}
              
              {section.type === 'contact' && (
                <div className="text-medium-contrast">
                  {typeof value === 'object' ? (
                    <div className="space-y-1">
                      {value.name && <div>{value.name}</div>}
                      {value.email && <div>{value.email}</div>}
                      {value.phone && <div>{value.phone}</div>}
                    </div>
                  ) : (
                    <div>{value}</div>
                  )}
                </div>
              )}
              
              {section.type === 'date' && (
                <div className="text-medium-contrast">
                  {new Date(value).toLocaleDateString()}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Preview Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-high-contrast">
          {t('documentArtisan.preview.title')}
        </h3>
        <div className="flex items-center space-x-2">
          <GlassButton
            variant="button"
            size="xs"
            onClick={() => setShowStylePanel(!showStylePanel)}
          >
            🎨 {t('documentArtisan.preview.style')}
          </GlassButton>
          <GlassButton
            variant="button"
            size="xs"
          >
            📱 {t('documentArtisan.preview.qrCode')}
          </GlassButton>
        </div>
      </div>

      {/* Style Panel */}
      {showStylePanel && (
        <StylePanel
          styleSettings={styleSettings}
          onStyleUpdate={onStyleUpdate}
          onClose={() => setShowStylePanel(false)}
        />
      )}

      {/* Preview Content */}
      <GlassCard variant="card" padding="lg" className="min-h-96">
        <div className="bg-white rounded-lg p-6 shadow-inner">
          {Object.keys(documentData).length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <div className="text-4xl mb-4">📄</div>
              <p>{t('documentArtisan.preview.emptyState')}</p>
            </div>
          ) : (
            renderPreviewContent()
          )}
        </div>
      </GlassCard>

      {/* Preview Actions */}
      <div className="flex justify-center space-x-3">
        <GlassButton variant="button" size="sm">
          🔍 {t('documentArtisan.preview.zoom')}
        </GlassButton>
        <GlassButton variant="button" size="sm">
          📋 {t('documentArtisan.preview.copy')}
        </GlassButton>
        <GlassButton variant="button" size="sm">
          📤 {t('documentArtisan.preview.share')}
        </GlassButton>
      </div>
    </div>
  );
};

export default LivePreview;
