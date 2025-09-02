import React from 'react';
import { useTranslation } from 'react-i18next';
import GlassCard from '../../design-system/components/GlassCard';
import GlassButton from '../../design-system/components/GlassButton';
import { EditorState } from '../types/document-artisan.types';

interface StylePanelProps {
  styleSettings: EditorState['styleSettings'];
  onStyleUpdate: (settings: Partial<EditorState['styleSettings']>) => void;
  onClose: () => void;
}

/**
 * StylePanel - Theme and style customization panel
 * 
 * Features:
 * - Theme selection (Professional, Creative, Minimal)
 * - Font family options
 * - Font size adjustment
 * - Line spacing control
 */
const StylePanel: React.FC<StylePanelProps> = ({
  styleSettings,
  onStyleUpdate,
  onClose
}) => {
  const { t } = useTranslation();

  const themes = [
    { id: 'professional', name: t('documentArtisan.themes.professional'), preview: '📊' },
    { id: 'creative', name: t('documentArtisan.themes.creative'), preview: '🎨' },
    { id: 'minimal', name: t('documentArtisan.themes.minimal'), preview: '⚪' },
    { id: 'modern', name: t('documentArtisan.themes.modern'), preview: '✨' }
  ];

  const fonts = [
    { id: 'Inter', name: 'Inter', preview: 'Aa' },
    { id: 'Roboto', name: 'Roboto', preview: 'Aa' },
    { id: 'Open Sans', name: 'Open Sans', preview: 'Aa' },
    { id: 'Lato', name: 'Lato', preview: 'Aa' },
    { id: 'Montserrat', name: 'Montserrat', preview: 'Aa' }
  ];

  return (
    <GlassCard variant="card" padding="lg" className="space-y-6">
      <div className="flex items-center justify-between">
        <h4 className="text-lg font-semibold text-high-contrast">
          {t('documentArtisan.stylePanel.title')}
        </h4>
        <GlassButton variant="button" size="xs" onClick={onClose}>
          ✕
        </GlassButton>
      </div>

      {/* Theme Selection */}
      <div>
        <label className="block text-sm font-medium text-high-contrast mb-3">
          {t('documentArtisan.stylePanel.theme')}
        </label>
        <div className="grid grid-cols-2 gap-2">
          {themes.map((theme) => (
            <button
              key={theme.id}
              onClick={() => onStyleUpdate({ theme: theme.id })}
              className={`
                p-3 rounded-lg border-2 transition-all duration-200
                ${styleSettings.theme === theme.id 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-glass-border bg-glass-light hover:border-blue-300'
                }
              `}
            >
              <div className="text-center">
                <div className="text-2xl mb-1">{theme.preview}</div>
                <div className="text-xs font-medium text-high-contrast">
                  {theme.name}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Font Family */}
      <div>
        <label className="block text-sm font-medium text-high-contrast mb-3">
          {t('documentArtisan.stylePanel.fontFamily')}
        </label>
        <div className="space-y-2">
          {fonts.map((font) => (
            <button
              key={font.id}
              onClick={() => onStyleUpdate({ fontFamily: font.id })}
              className={`
                w-full p-2 rounded-lg border text-left transition-all duration-200
                ${styleSettings.fontFamily === font.id 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-glass-border bg-glass-light hover:border-blue-300'
                }
              `}
              style={{ fontFamily: font.id }}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm text-high-contrast">{font.name}</span>
                <span className="text-lg">{font.preview}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Font Size */}
      <div>
        <label className="block text-sm font-medium text-high-contrast mb-3">
          {t('documentArtisan.stylePanel.fontSize')} ({styleSettings.fontSize}px)
        </label>
        <input
          type="range"
          min="10"
          max="20"
          value={styleSettings.fontSize}
          onChange={(e) => onStyleUpdate({ fontSize: parseInt(e.target.value) })}
          className="w-full h-2 bg-glass-light rounded-lg appearance-none cursor-pointer"
        />
        <div className="flex justify-between text-xs text-low-contrast mt-1">
          <span>10px</span>
          <span>20px</span>
        </div>
      </div>

      {/* Line Spacing */}
      <div>
        <label className="block text-sm font-medium text-high-contrast mb-3">
          {t('documentArtisan.stylePanel.lineSpacing')} ({styleSettings.spacing})
        </label>
        <input
          type="range"
          min="1"
          max="2"
          step="0.1"
          value={styleSettings.spacing}
          onChange={(e) => onStyleUpdate({ spacing: parseFloat(e.target.value) })}
          className="w-full h-2 bg-glass-light rounded-lg appearance-none cursor-pointer"
        />
        <div className="flex justify-between text-xs text-low-contrast mt-1">
          <span>1.0</span>
          <span>2.0</span>
        </div>
      </div>

      {/* Reset Button */}
      <div className="pt-4 border-t border-glass-border">
        <GlassButton
          variant="button"
          size="sm"
          onClick={() => onStyleUpdate({
            theme: 'professional',
            fontSize: 14,
            fontFamily: 'Inter',
            spacing: 1.2
          })}
          className="w-full"
        >
          {t('documentArtisan.stylePanel.reset')}
        </GlassButton>
      </div>
    </GlassCard>
  );
};

export default StylePanel;
