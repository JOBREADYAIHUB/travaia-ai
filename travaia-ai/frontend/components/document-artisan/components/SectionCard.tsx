import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import GlassCard from '../../design-system/components/GlassCard';
import GlassButton from '../../design-system/components/GlassButton';
import GlassModal from '../../design-system/components/GlassModal';
import { DocumentSection } from '../types/document-artisan.types';

interface SectionCardProps {
  section: DocumentSection;
  value: any;
  isActive: boolean;
  onUpdate: (value: any) => void;
  onSelect: () => void;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: () => void;
  isDragging: boolean;
}

/**
 * SectionCard - Individual editable section with drag & drop
 * 
 * Features:
 * - Drag and drop handle
 * - Edit modal with input methods
 * - AI regeneration button
 * - Content preview
 */
const SectionCard: React.FC<SectionCardProps> = ({
  section,
  value,
  isActive,
  onUpdate,
  onSelect,
  onDragStart,
  onDragOver,
  onDrop,
  isDragging
}) => {
  const { t } = useTranslation();
  const [showEditModal, setShowEditModal] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [isRegenerating, setIsRegenerating] = useState(false);

  const handleSave = () => {
    onUpdate(editValue);
    setShowEditModal(false);
  };

  const handleCancel = () => {
    setEditValue(value);
    setShowEditModal(false);
  };

  const handleRegenerate = async () => {
    setIsRegenerating(true);
    // Simulate AI regeneration
    setTimeout(() => {
      const suggestions = section.suggestions || [];
      if (suggestions.length > 0) {
        const randomSuggestion = suggestions[Math.floor(Math.random() * suggestions.length)];
        setEditValue(randomSuggestion);
      }
      setIsRegenerating(false);
    }, 1500);
  };

  const getPreviewText = () => {
    if (!value) return t('documentArtisan.editor.emptySection');
    if (typeof value === 'string') {
      return value.length > 100 ? `${value.substring(0, 100)}...` : value;
    }
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    return String(value);
  };

  return (
    <>
      <GlassCard
        variant="card"
        padding="md"
        rounded="lg"
        hover={!isDragging}
        className={`
          cursor-pointer transition-all duration-200
          ${isActive ? 'ring-2 ring-blue-500 ring-opacity-50' : ''}
          ${isDragging ? 'opacity-50 scale-95' : ''}
          ${!value ? 'border-dashed border-2 border-yellow-300' : ''}
        `}
        draggable
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onClick={onSelect}
      >
        <div className="flex items-start space-x-3">
          {/* Drag Handle */}
          <div className="flex-shrink-0 mt-1 cursor-grab active:cursor-grabbing">
            <div className="w-4 h-4 flex flex-col justify-center space-y-0.5">
              <div className="w-full h-0.5 bg-medium-contrast rounded"></div>
              <div className="w-full h-0.5 bg-medium-contrast rounded"></div>
              <div className="w-full h-0.5 bg-medium-contrast rounded"></div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-grow min-w-0">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-high-contrast">
                {t(section.titleKey)}
                {section.required && <span className="text-red-500 ml-1">*</span>}
              </h3>
              <div className="flex items-center space-x-2">
                <GlassButton
                  variant="button"
                  size="xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowEditModal(true);
                  }}
                >
                  {t('common.edit')}
                </GlassButton>
              </div>
            </div>

            <p className="text-sm text-medium-contrast mb-2">
              {getPreviewText()}
            </p>

            {section.type && (
              <div className="flex items-center space-x-2 text-xs text-low-contrast">
                <span className="capitalize">{section.type}</span>
                {section.maxLength && (
                  <span>• Max {section.maxLength} chars</span>
                )}
              </div>
            )}
          </div>
        </div>
      </GlassCard>

      {/* Edit Modal */}
      <GlassModal
        isOpen={showEditModal}
        onClose={handleCancel}
        title={t(section.titleKey)}
        size="lg"
      >
        <div className="space-y-4">
          {/* Input Field */}
          {section.type === 'text' && (
            <textarea
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              placeholder={section.placeholder}
              maxLength={section.maxLength}
              rows={6}
              className="w-full p-3 bg-glass-input border border-glass-border rounded-lg text-high-contrast placeholder-low-contrast focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
            />
          )}

          {section.type === 'list' && (
            <div className="space-y-2">
              {(editValue as string[])?.map((item, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={item}
                    onChange={(e) => {
                      const newList = [...(editValue as string[])];
                      newList[index] = e.target.value;
                      setEditValue(newList);
                    }}
                    className="flex-grow p-2 bg-glass-input border border-glass-border rounded text-high-contrast"
                  />
                  <GlassButton
                    variant="button"
                    size="xs"
                    onClick={() => {
                      const newList = (editValue as string[]).filter((_, i) => i !== index);
                      setEditValue(newList);
                    }}
                  >
                    ×
                  </GlassButton>
                </div>
              )) || []}
              <GlassButton
                variant="button"
                size="sm"
                onClick={() => setEditValue([...(editValue as string[] || []), ''])}
              >
                + {t('documentArtisan.editor.addItem')}
              </GlassButton>
            </div>
          )}

          {/* Character Count */}
          {section.maxLength && typeof editValue === 'string' && (
            <div className="text-xs text-low-contrast text-right">
              {editValue.length} / {section.maxLength}
            </div>
          )}

          {/* AI Regenerate */}
          {section.suggestions && section.suggestions.length > 0 && (
            <div className="border-t border-glass-border pt-4">
              <GlassButton
                variant="button"
                size="sm"
                loading={isRegenerating}
                onClick={handleRegenerate}
                className="w-full"
              >
                ✨ {t('documentArtisan.editor.regenerateWithAI')}
              </GlassButton>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-glass-border">
            <GlassButton
              variant="button"
              size="sm"
              onClick={handleCancel}
            >
              {t('common.cancel')}
            </GlassButton>
            <GlassButton
              variant="button"
              size="sm"
              onClick={handleSave}
              className="bg-blue-500 text-white"
            >
              {t('common.save')}
            </GlassButton>
          </div>
        </div>
      </GlassModal>
    </>
  );
};

export default SectionCard;
