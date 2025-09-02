import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '../../i18n';
import { GlassCard, GlassButton } from '../design-system';

import { 
  FileTextIcon, 
  DownloadIcon, 
  TrashIcon, 
  PencilIcon, 
  EyeIcon,
  CopyIcon
} from '../icons/Icons';
import { Document } from '../../types';

interface DocumentListProps {
  documents: Document[];
  isLoading: boolean;
  onPreviewDocument: (doc: Document) => void;
  onDownloadDocument: (doc: Document) => void;
  onEditDocument: (doc: Document) => void;
  onDeleteDocument: (doc: Document) => void;
  onManageVersions: (doc: Document) => void;
}

const DocumentList: React.FC<DocumentListProps> = ({
  documents,
  isLoading,
  onPreviewDocument,
  onDownloadDocument,
  onEditDocument,
  onDeleteDocument,
  onManageVersions,
}) => {
  const { t } = useTranslation('documentManager');
  const isRtl = i18n.dir() === 'rtl';

  // Function to get appropriate icon for file type
  const getFileIcon = (fileType: string) => {
    // This can be extended with more file type specific icons
    return <FileTextIcon className="w-6 h-6" aria-hidden="true" />;
  };
  
  // Function to format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
  // Format date for display
  const formatDate = (date: Date | string): string => {
    if (!date) return '';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-6">
        {[...Array(3)].map((_, index) => (
          <GlassCard
            key={`skeleton-${index}`}
            className="p-4 animate-pulse"
            variant="light"
          >
            <div className="flex flex-col space-y-3">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
            </div>
          </GlassCard>
        ))}
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <GlassCard
        className="p-6 text-center"
        variant="light"
      >
        <FileTextIcon className="w-12 h-12 mx-auto text-gray-400 mb-4" aria-hidden="true" />
        <p className="text-lg font-medium">{t('noDocuments')}</p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{t('uploadPrompt')}</p>
      </GlassCard>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {documents.map((doc) => (
        <GlassCard
          key={doc.id}
          className="p-0 overflow-hidden"
          variant="medium"
        >
          <div className="flex flex-col h-full">
            {/* Document Preview/Header Area */}
            <div 
              className="p-4 flex items-center border-b border-gray-200 dark:border-gray-700"
              onClick={() => onPreviewDocument(doc)}
              role="button"
              tabIndex={0}
              aria-label={`${t('preview')} ${doc.name}`}
            >
              <div className={`rounded-full p-3 bg-blue-100 dark:bg-blue-900/30 ${isRtl ? 'ml-3' : 'mr-3'}`}>
                {getFileIcon(doc.fileType)}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-lg truncate">{doc.name}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {formatFileSize(doc.size || 0)} • {doc.fileType.toUpperCase()}
                </p>
              </div>
            </div>

            {/* Document Details */}
            <div className="p-4 flex-1 flex flex-col">
              {/* Date & Status */}
              <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400 mb-3">
                <span>{formatDate(doc.updatedAt as Date)}</span>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  doc.status === 'Final' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                  doc.status === 'Submitted' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' :
                  'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                }`}>
                  {doc.status || t('draft')}
                </span>
              </div>

              {/* Tags */}
              {doc.tags && doc.tags.length > 0 && (
                <div className="mb-4">
                  <div className="flex flex-wrap gap-2 mt-2">
                    {doc.tags.slice(0, 3).map((tag, idx) => (
                      <span
                        key={`${doc.id}-tag-${idx}`}
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300"
                      >
                        {tag}
                      </span>
                    ))}
                    {doc.tags.length > 3 && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                        {`+${doc.tags.length - 3}`}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Companies & Jobs */}
              {((doc.associatedCompanies && doc.associatedCompanies.length > 0) || (doc.associatedJobs && doc.associatedJobs.length > 0)) && (
                <div className="mb-4 text-sm">
                  {doc.associatedCompanies && doc.associatedCompanies.length > 0 && (
                    <p className="truncate">
                      <span className="font-medium">{t('companies')}: </span>
                      {doc.associatedCompanies?.join(', ')}
                    </p>
                  )}
                  {doc.associatedJobs && doc.associatedJobs.length > 0 && (
                    <p className="truncate mt-1">
                      <span className="font-medium">{t('jobs')}: </span>
                      {doc.associatedJobs?.join(', ')}
                    </p>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="mt-auto pt-4 flex flex-wrap gap-2">
                <GlassButton
                  size="sm"
                  variant="button"
                  onClick={() => {
                    onPreviewDocument(doc);
                  }}
                  className="flex items-center gap-2"
                >
                  <EyeIcon className="w-4 h-4" />
                  {t('preview')}
                </GlassButton>
                
                <GlassButton
                  size="sm"
                  variant="button"
                  onClick={() => {
                    onDownloadDocument(doc);
                  }}
                  className="flex items-center gap-2"
                >
                  <DownloadIcon className="w-4 h-4" />
                  {t('download')}
                </GlassButton>
                
                <GlassButton
                  size="sm"
                  variant="button"
                  onClick={() => {
                    onEditDocument(doc);
                  }}
                  className="flex items-center gap-2"
                >
                  <PencilIcon className="w-4 h-4" />
                  {t('edit')}
                </GlassButton>
                
                <GlassButton
                  size="sm"
                  variant="button"
                  onClick={() => {
                    onManageVersions(doc);
                  }}
                  className="flex items-center gap-2"
                >
                  <CopyIcon className="w-4 h-4" />
                  {t('versions')}
                </GlassButton>
                
                <GlassButton
                  size="sm"
                  variant="button"
                  onClick={() => {
                    onDeleteDocument(doc);
                  }}
                  className="flex items-center gap-2"
                >
                  <TrashIcon className="w-4 h-4" />
                  {t('delete')}
                </GlassButton>
              </div>
            </div>
          </div>
        </GlassCard>
      ))}
    </div>
  );
};

export default DocumentList;
