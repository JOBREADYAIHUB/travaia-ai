import React from 'react';
import { useTranslation } from 'react-i18next';
import { GlassButton } from '../design-system';
import { FormField } from './FormField';

interface FormSectionProps<T> {
  title: string;
  items: T[];
  onAdd: () => void;
  onUpdate: (id: string, field: keyof T, value: any) => void;
  onRemove: (id: string) => void;
  renderFields: (item: T, onUpdate: (field: keyof T, value: any) => void) => React.ReactNode;
  addButtonText: string;
  emptyMessage?: string;
}

export function FormSection<T extends { id: string }>({
  title,
  items,
  onAdd,
  onUpdate,
  onRemove,
  renderFields,
  addButtonText,
  emptyMessage
}: FormSectionProps<T>) {
  const { t } = useTranslation();

  return (
    <div className="mb-8">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">
          {title}
        </h3>
        <GlassButton
          variant="primary"
          size="sm"
          onClick={onAdd}
          className="flex items-center gap-2"
        >
          <span>+</span>
          {addButtonText}
        </GlassButton>
      </div>

      {items.length === 0 && emptyMessage && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          {emptyMessage}
        </div>
      )}

      <div className="space-y-6">
        {items.map((item, index) => (
          <div key={item.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800/50">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-md font-medium text-gray-700 dark:text-gray-300">
                {title.slice(0, -1)} {index + 1}
              </h4>
              <GlassButton
                variant="secondary"
                size="sm"
                onClick={() => onRemove(item.id)}
                className="text-red-600 hover:text-red-700"
                title={`Remove ${title.slice(0, -1).toLowerCase()}`}
              >
                ×
              </GlassButton>
            </div>
            {renderFields(item, (field, value) => onUpdate(item.id, field, value))}
          </div>
        ))}
      </div>
    </div>
  );
}
