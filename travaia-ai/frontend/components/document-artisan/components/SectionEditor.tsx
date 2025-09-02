import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import GlassCard from '../../design-system/components/GlassCard';
import GlassButton from '../../design-system/components/GlassButton';
import { DocumentType } from '../types/document-artisan.types';
import { getDocumentTemplate } from '../templates/document-templates';
import SectionCard from './SectionCard';

interface SectionEditorProps {
  documentType: DocumentType;
  documentData: Record<string, any>;
  activeSection: string | null;
  onSectionUpdate: (sectionId: string, value: any) => void;
  onSectionSelect: (sectionId: string) => void;
}

/**
 * SectionEditor - Interactive section cards with drag & drop
 * 
 * Features:
 * - Drag and drop reordering
 * - Edit mode with focused modals
 * - AI regeneration capabilities
 * - Real-time content updates
 */
const SectionEditor: React.FC<SectionEditorProps> = ({
  documentType,
  documentData,
  activeSection,
  onSectionUpdate,
  onSectionSelect
}) => {
  const { t } = useTranslation();
  const [draggedSection, setDraggedSection] = useState<string | null>(null);
  const [sectionOrder, setSectionOrder] = useState<string[]>([]);

  const template = getDocumentTemplate(documentType);

  // Initialize section order if not set
  React.useEffect(() => {
    if (sectionOrder.length === 0 && template) {
      setSectionOrder(template.sections.map(s => s.id));
    }
  }, [template, sectionOrder.length]);

  const handleDragStart = (sectionId: string) => {
    setDraggedSection(sectionId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (targetSectionId: string) => {
    if (!draggedSection || draggedSection === targetSectionId) return;

    const newOrder = [...sectionOrder];
    const draggedIndex = newOrder.indexOf(draggedSection);
    const targetIndex = newOrder.indexOf(targetSectionId);

    // Remove dragged item and insert at new position
    newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, draggedSection);

    setSectionOrder(newOrder);
    setDraggedSection(null);
  };

  if (!template) {
    return (
      <GlassCard variant="card" padding="lg">
        <div className="text-center py-8">
          <p className="text-medium-contrast">
            {t('documentArtisan.editor.templateNotFound')}
          </p>
        </div>
      </GlassCard>
    );
  }

  const orderedSections = sectionOrder
    .map(id => template.sections.find(s => s.id === id))
    .filter(Boolean);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-high-contrast">
          {t('documentArtisan.editor.sectionsTitle')}
        </h2>
        <div className="text-sm text-medium-contrast">
          {t('documentArtisan.editor.dragToReorder')}
        </div>
      </div>

      {/* Section Cards */}
      <div className="space-y-3">
        {orderedSections.map((section) => (
          <SectionCard
            key={section!.id}
            section={section!}
            value={documentData[section!.id] || ''}
            isActive={activeSection === section!.id}
            onUpdate={(value) => onSectionUpdate(section!.id, value)}
            onSelect={() => onSectionSelect(section!.id)}
            onDragStart={() => handleDragStart(section!.id)}
            onDragOver={handleDragOver}
            onDrop={() => handleDrop(section!.id)}
            isDragging={draggedSection === section!.id}
          />
        ))}
      </div>

      {/* Help Text */}
      <GlassCard variant="light" padding="md" className="mt-6">
        <div className="flex items-start space-x-3">
          <span className="text-blue-500 text-lg">💡</span>
          <div className="text-sm text-medium-contrast">
            <p className="font-medium mb-1">
              {t('documentArtisan.editor.tips.title')}
            </p>
            <ul className="space-y-1 text-xs">
              <li>• {t('documentArtisan.editor.tips.dragReorder')}</li>
              <li>• {t('documentArtisan.editor.tips.clickEdit')}</li>
              <li>• {t('documentArtisan.editor.tips.aiRegenerate')}</li>
            </ul>
          </div>
        </div>
      </GlassCard>
    </div>
  );
};

export default SectionEditor;
