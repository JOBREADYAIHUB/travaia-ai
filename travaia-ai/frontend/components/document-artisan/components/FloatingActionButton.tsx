import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import GlassButton from '../../design-system/components/GlassButton';
import GlassModal from '../../design-system/components/GlassModal';
import StylePanel from './StylePanel';
import { EditorState } from '../types/document-artisan.types';

interface FloatingActionButtonProps {
  onPreviewToggle: () => void;
  showPreview: boolean;
  styleSettings: EditorState['styleSettings'];
  onStyleUpdate: (settings: Partial<EditorState['styleSettings']>) => void;
}

/**
 * FloatingActionButton - Persistent FAB for quick actions
 * 
 * Features:
 * - Preview toggle
 * - Style panel access
 * - Quick actions menu
 * - Mobile-optimized positioning
 */
const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  onPreviewToggle,
  showPreview,
  styleSettings,
  onStyleUpdate
}) => {
  const { t } = useTranslation();
  const [showMenu, setShowMenu] = useState(false);
  const [showStyleModal, setShowStyleModal] = useState(false);

  const toggleMenu = () => {
    setShowMenu(!showMenu);
  };

  return (
    <>
      {/* Main FAB */}
      <div className="fixed bottom-6 right-6 z-50">
        <div className="relative">
          {/* Action Menu */}
          {showMenu && (
            <div className="absolute bottom-16 right-0 space-y-2 mb-2">
              <GlassButton
                variant="button"
                size="sm"
                onClick={() => {
                  onPreviewToggle();
                  setShowMenu(false);
                }}
                className="w-full justify-start"
              >
                {showPreview ? '📝' : '👁️'} {showPreview ? t('documentArtisan.fab.hidePreview') : t('documentArtisan.fab.showPreview')}
              </GlassButton>
              
              <GlassButton
                variant="button"
                size="sm"
                onClick={() => {
                  setShowStyleModal(true);
                  setShowMenu(false);
                }}
                className="w-full justify-start"
              >
                🎨 {t('documentArtisan.fab.style')}
              </GlassButton>
              
              <GlassButton
                variant="button"
                size="sm"
                onClick={() => {
                  // Generate QR code for mobile preview
                  setShowMenu(false);
                }}
                className="w-full justify-start"
              >
                📱 {t('documentArtisan.fab.mobilePreview')}
              </GlassButton>
            </div>
          )}

          {/* Main Button */}
          <GlassButton
            variant="button"
            size="lg"
            onClick={toggleMenu}
            className={`
              w-14 h-14 rounded-full shadow-lg transition-transform duration-200
              ${showMenu ? 'rotate-45' : 'hover:scale-110'}
            `}
          >
            <span className="text-xl">
              {showMenu ? '✕' : '⚡'}
            </span>
          </GlassButton>
        </div>
      </div>

      {/* Style Modal */}
      <GlassModal
        isOpen={showStyleModal}
        onClose={() => setShowStyleModal(false)}
        title={t('documentArtisan.stylePanel.title')}
        size="md"
      >
        <StylePanel
          styleSettings={styleSettings}
          onStyleUpdate={onStyleUpdate}
          onClose={() => setShowStyleModal(false)}
        />
      </GlassModal>
    </>
  );
};

export default FloatingActionButton;
