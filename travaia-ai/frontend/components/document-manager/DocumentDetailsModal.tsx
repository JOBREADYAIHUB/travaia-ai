import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '../../i18n';
import { GlassModal, GlassButton } from '../design-system';

import { 
  SaveIcon,
  XIcon,
  PlusIcon,
  TagIcon,
  BriefcaseIcon,
  DocumentTextIcon,
  StatusOnlineIcon
} from '../icons/Icons';
import { Document } from '../../types';
import { updateDocumentMetadata } from './documentService';

interface DocumentDetailsModalProps {
  document: Document | null;
  isOpen: boolean;
  onClose: () => void;
  onDocumentUpdated: (updatedDoc: Document) => void;
  userId: string;
}

const DocumentDetailsModal: React.FC<DocumentDetailsModalProps> = ({
  document,
  isOpen,
  onClose,
  onDocumentUpdated,
  userId
}) => {
  const { t } = useTranslation('documentManager');
  const isRtl = i18n.dir() === 'rtl';
  
  // Form state
  const [name, setName] = useState('');
  const [status, setStatus] = useState('');
  const [newTag, setNewTag] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [newCompany, setNewCompany] = useState('');
  const [companies, setCompanies] = useState<string[]>([]);
  const [newJob, setNewJob] = useState('');
  const [jobs, setJobs] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  // Status options
  const statusOptions = ['Draft', 'In Review', 'Submitted', 'Final'];
  
  // Initialize form with document data
  useEffect(() => {
    if (document) {
      setName(document.name || '');
      setStatus(document.status || 'Draft');
      setTags(document.tags || []);
      setCompanies(document.associatedCompanies || []);
      setJobs(document.associatedJobs || []);
      setNotes(document.notes || '');
    }
  }, [document]);
  
  // Handle tag addition
  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };
  
  // Handle tag removal
  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };
  
  // Handle company addition
  const handleAddCompany = () => {
    if (newCompany.trim() && !companies.includes(newCompany.trim())) {
      setCompanies([...companies, newCompany.trim()]);
      setNewCompany('');
    }
  };
  
  // Handle company removal
  const handleRemoveCompany = (company: string) => {
    setCompanies(companies.filter(c => c !== company));
  };
  
  // Handle job addition
  const handleAddJob = () => {
    if (newJob.trim() && !jobs.includes(newJob.trim())) {
      setJobs([...jobs, newJob.trim()]);
      setNewJob('');
    }
  };
  
  // Handle job removal
  const handleRemoveJob = (job: string) => {
    setJobs(jobs.filter(j => j !== job));
  };
  
  // Handle form submission
  const handleSave = async () => {
    if (!document) return;
    
    setIsSaving(true);
    try {
      const updates = {
        name,
        status,
        tags,
        associatedCompanies: companies,
        associatedJobs: jobs,
        notes,
      };
      
      await updateDocumentMetadata(userId, document.id, updates);
      
      // Update local state with changes
      const updatedDoc = {
        ...document,
        ...updates
      };
      
      onDocumentUpdated(updatedDoc);
      onClose();
    } catch (error) {
      console.error('Error updating document:', error);
      // Could add error handling UI here
    } finally {
      setIsSaving(false);
    }
  };
  
  // Function to render preview based on file type
  const renderPreview = () => {
    if (!document) return null;
    
    const previewUrl = document.previewUrl;
    const mimeType = document.mimeType || '';
    
    if (mimeType.startsWith('image/')) {
      return (
        <img 
          src={previewUrl} 
          alt={document.name} 
          className="w-full h-auto max-h-64 object-contain rounded-md"
        />
      );
    } else if (mimeType.startsWith('application/pdf')) {
      return (
        <iframe
          src={`${previewUrl}#toolbar=0&view=FitH`}
          title={document.name}
          className="w-full h-64 rounded-md"
        />
      );
    } else {
      // Generic preview for other file types
      return (
        <div className="w-full h-64 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-md">
          <DocumentTextIcon className="w-16 h-16 text-gray-400" aria-hidden="true" />
          <p className="mt-2">{document.name}</p>
        </div>
      );
    }
  };
  
  return (
    <GlassModal
      isOpen={isOpen}
      onClose={onClose}
      title={t('documentDetails')}
      size="lg"
    >
      {document && (
        <div className="space-y-6">
          {/* Preview Section */}
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-2">{t('preview')}</h3>
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              {renderPreview()}
            </div>
            <div className="mt-3 text-sm text-gray-500 dark:text-gray-400">
              {document.originalFileName} • {(document.size ? (document.size / 1024).toFixed(2) + ' KB' : '')}
            </div>
          </div>
          
          {/* Metadata Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Document Name */}
            <div className="md:col-span-2">
              <label htmlFor="doc-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('documentName')}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <DocumentTextIcon className="w-5 h-5 text-gray-400" />
                </div>
                <input
                  id="doc-name"
                  name="doc-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('enterDocumentName')}
                  className="w-full pl-10 pr-3 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-white placeholder-white/60"
                />
              </div>
            </div>
            
            {/* Document Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('status')}
              </label>
              <div className="flex flex-wrap gap-2">
                {statusOptions.map((option) => (
                  <GlassButton
                    key={option}
                    variant={status === option ? 'button' : 'button'}
                    size="sm"
                    onClick={() => setStatus(option)}
                    className="flex-grow"
                  >
                    {status === option && <StatusOnlineIcon className="w-4 h-4 mr-2" />}
                    {option}
                  </GlassButton>
                ))}
              </div>
            </div>
            
            {/* Notes */}
            <div className="md:col-span-2">
              <label htmlFor="doc-notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('notes')}
              </label>
              <textarea
                id="doc-notes"
                name="doc-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t('enterNotes')}
                rows={3}
                className="w-full px-3 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-white placeholder-white/60 resize-vertical"
              />
            </div>
            
            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('tags')}
              </label>
              <div className="flex items-center mb-2">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <TagIcon className="w-5 h-5 text-gray-400" />
                  </div>
                  <input
                    id="new-tag"
                    name="new-tag"
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder={t('addNewTag')}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                    className="w-full pl-10 pr-3 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-white placeholder-white/60"
                  />
                </div>
                <GlassButton
                  variant="button"
                  size="md"
                  onClick={handleAddTag}
                  className="ml-2"
                >
                  <PlusIcon className="w-5 h-5" />
                </GlassButton>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {tags.map((tag, index) => (
                  <span
                    key={`tag-${index}`}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-700"
                  >
                    {tag}
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-2 text-blue-600 dark:text-blue-300 hover:text-blue-800 dark:hover:text-blue-100 focus:outline-none"
                      aria-label={`Remove ${tag} tag`}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
            
            {/* Associated Companies */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('associatedCompanies')}
              </label>
              <div className="flex items-center mb-2">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <BriefcaseIcon className="w-5 h-5 text-gray-400" />
                  </div>
                  <input
                    id="new-company"
                    name="new-company"
                    type="text"
                    value={newCompany}
                    onChange={(e) => setNewCompany(e.target.value)}
                    placeholder={t('addNewCompany')}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddCompany()}
                    className="w-full pl-10 pr-3 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-white placeholder-white/60"
                  />
                </div>
                <GlassButton
                  variant="button"
                  size="md"
                  onClick={handleAddCompany}
                  className="ml-2"
                >
                  <PlusIcon className="w-5 h-5" />
                </GlassButton>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {companies.map((company, index) => (
                  <span
                    key={`company-${index}`}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 border border-purple-200 dark:border-purple-700"
                  >
                    {company}
                    <button
                      onClick={() => handleRemoveCompany(company)}
                      className="ml-2 text-purple-600 dark:text-purple-300 hover:text-purple-800 dark:hover:text-purple-100 focus:outline-none"
                      aria-label={`Remove ${company} company`}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
            
            {/* Associated Jobs */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('associatedJobs')}
              </label>
              <div className="flex items-center mb-2">
                <input
                  id="new-job"
                  name="new-job"
                  type="text"
                  value={newJob}
                  onChange={(e) => setNewJob(e.target.value)}
                  placeholder={t('addNewJob')}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddJob()}
                  className="flex-1 p-3 rounded-lg border border-base_300 dark:border-neutral-600 bg-base_100 dark:bg-neutral-800 text-neutral dark:text-gray-200 focus:ring-2 focus:ring-primary focus:border-transparent"
                />
                <GlassButton
                  variant="button"
                  size="md"
                  onClick={handleAddJob}
                  aria-label={t('addJob')}
                  className="ml-2"
                >
                  <PlusIcon className="w-5 h-5" />
                </GlassButton>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {jobs.map((job, index) => (
                  <span
                    key={`job-${index}`}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                  >
                    {job}
                    <button
                      onClick={() => handleRemoveJob(job)}
                      className="ml-2 text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-200 focus:outline-none"
                      aria-label={`Remove ${job} job`}
                    >
                      <XIcon className="w-4 h-4" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex justify-end space-x-2 pt-4 border-t border-gray-200 dark:border-gray-700">
            <GlassButton
              variant="button"
              size="md"
              onClick={onClose}
              aria-label={t('cancel')}
            >
              <XIcon className="w-5 h-5 mr-2" />
              {t('cancel')}
            </GlassButton>
            <GlassButton
              variant="button"
              size="md"
              onClick={handleSave}
              disabled={isSaving}
              aria-label={t('saveChanges')}
            >
              <SaveIcon className="w-5 h-5 mr-2" />
              {t('saveChanges')}
            </GlassButton>
          </div>
        </div>
      )}
    </GlassModal>
  );
};

export default DocumentDetailsModal;
