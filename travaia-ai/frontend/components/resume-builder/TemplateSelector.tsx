import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { GlassCard, GlassButton } from '../design-system';

interface ResumeTemplate {
  id: string;
  name: string;
  category: string;
  previewUrl: string;
  thumbnailUrl: string;
  description: string;
  isPremium: boolean;
}

interface TemplateSelectorProps {
  selectedTemplateId?: string;
  onTemplateSelect: (templateId: string) => void;
  templates: ResumeTemplate[];
  isLoading?: boolean;
  error?: string;
}

const TemplateSelector: React.FC<TemplateSelectorProps> = ({
  selectedTemplateId,
  onTemplateSelect,
  templates,
  isLoading = false,
  error
}) => {
  const { t } = useTranslation();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [previewTemplate, setPreviewTemplate] = useState<ResumeTemplate | null>(null);

  // Get unique categories from templates
  const categories = ['all', ...new Set(templates.map(template => template.category))];

  // Filter templates by category
  const filteredTemplates = selectedCategory === 'all' 
    ? templates 
    : templates.filter(template => template.category === selectedCategory);

  const handleTemplateSelect = (templateId: string) => {
    onTemplateSelect(templateId);
  };

  const handlePreview = (template: ResumeTemplate) => {
    setPreviewTemplate(template);
  };

  const closePreview = () => {
    setPreviewTemplate(null);
  };

  if (error) {
    return (
      <GlassCard variant="default" className="p-6">
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {t('resumeBuilder.templates.error')}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <GlassButton variant="primary" onClick={() => window.location.reload()}>
            {t('common.retry', 'Retry')}
          </GlassButton>
        </div>
      </GlassCard>
    );
  }

  return (
    <>
      <GlassCard variant="default" className="p-6">
        <h3 className="text-lg font-medium mb-4 text-gray-800 dark:text-gray-200">
          {t('resumeBuilder.templates.title')}
        </h3>

        {/* Category Filter */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  selectedCategory === category
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                {category === 'all' ? t('common.all', 'All') : t(`resumeBuilder.templates.${category}`, category)}
              </button>
            ))}
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">{t('resumeBuilder.templates.loading')}</p>
          </div>
        )}

        {/* Templates Grid */}
        {!isLoading && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredTemplates.map((template) => (
              <div
                key={template.id}
                className={`relative border-2 rounded-lg p-3 cursor-pointer transition-all hover:shadow-lg ${
                  selectedTemplateId === template.id
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-600 hover:border-blue-300'
                }`}
              >
                {/* Premium Badge */}
                {template.isPremium && (
                  <div className="absolute top-2 right-2 bg-yellow-500 text-white text-xs px-2 py-1 rounded-full">
                    {t('common.premium', 'Premium')}
                  </div>
                )}

                {/* Template Thumbnail */}
                <div className="aspect-[3/4] bg-gray-100 dark:bg-gray-700 rounded mb-3 overflow-hidden">
                  {template.thumbnailUrl ? (
                    <img
                      src={template.thumbnailUrl}
                      alt={template.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Template Info */}
                <div className="text-center">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                    {t(`resumeBuilder.templates.${template.name.toLowerCase()}`, template.name)}
                  </h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                    {template.description}
                  </p>

                  {/* Action Buttons */}
                  <div className="space-y-2">
                    <button
                      onClick={() => handleTemplateSelect(template.id)}
                      className={`w-full px-3 py-1 text-xs rounded transition-colors ${
                        selectedTemplateId === template.id
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                      }`}
                    >
                      {selectedTemplateId === template.id 
                        ? t('common.selected', 'Selected')
                        : t('resumeBuilder.templates.select')
                      }
                    </button>
                    <button
                      onClick={() => handlePreview(template)}
                      className="w-full px-3 py-1 text-xs border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      {t('resumeBuilder.templates.preview')}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && filteredTemplates.length === 0 && (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-4">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-gray-600 dark:text-gray-400">
              {t('common.noResults', 'No templates found for this category')}
            </p>
          </div>
        )}
      </GlassCard>

      {/* Preview Modal */}
      {previewTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-600">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {t(`resumeBuilder.templates.${previewTemplate.name.toLowerCase()}`, previewTemplate.name)} - {t('resumeBuilder.templates.preview')}
              </h3>
              <button
                onClick={closePreview}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4">
              {previewTemplate.previewUrl ? (
                <iframe
                  src={previewTemplate.previewUrl}
                  className="w-full h-96 border border-gray-200 dark:border-gray-600 rounded"
                  title={`Preview of ${previewTemplate.name}`}
                />
              ) : (
                <div className="w-full h-96 bg-gray-100 dark:bg-gray-700 rounded flex items-center justify-center">
                  <p className="text-gray-500 dark:text-gray-400">
                    {t('common.previewNotAvailable', 'Preview not available')}
                  </p>
                </div>
              )}
              <div className="mt-4 flex justify-between items-center">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {previewTemplate.description}
                  </p>
                  {previewTemplate.isPremium && (
                    <span className="inline-block mt-2 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 text-xs px-2 py-1 rounded">
                      {t('common.premium', 'Premium')} {t('common.template', 'Template')}
                    </span>
                  )}
                </div>
                <GlassButton
                  variant="primary"
                  onClick={() => {
                    handleTemplateSelect(previewTemplate.id);
                    closePreview();
                  }}
                >
                  {t('resumeBuilder.templates.select')}
                </GlassButton>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TemplateSelector;
