import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import useResumeDocuments from '../resume-builder/useResumeDocuments';
import { GlassButton, StandardPageLayout } from '../design-system';

import {
  FileTextIcon,
  PlusIcon,
  BriefcaseIcon,
  CheckCircleIcon,
  EditIcon,
  TagIcon,
  SparklesIcon,
  UploadIcon,
  UserSearchIcon,
  ViewGridAddIcon,
  ClipboardListIcon,
  DownloadIcon,
  TrashIcon,
  EyeIcon
} from '../icons/Icons';

// Document types and interfaces
interface DocumentTemplate {
  id: string;
  titleKey: string;
  descriptionKey: string;
  category: string;
  icon: React.ReactNode;
}

interface DocumentCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  count: number;
}

interface DocumentManagerPageProps {
  navigate: (path: string) => void;
}

// Document categories with icons and counts
const getDocumentCategories = (): DocumentCategory[] => [
  {
    id: 'resumes',
    name: 'Resumes',
    description: 'Create and manage your resumes',
    icon: 'FileTextIcon',
    count: 3
  },
  {
    id: 'coverLetters',
    name: 'Cover Letters',
    description: 'Create and manage your cover letters',
    icon: 'MailIcon',
    count: 2
  },
  {
    id: 'portfolios',
    name: 'Portfolios',
    description: 'Create and manage your portfolios',
    icon: 'BriefcaseIcon',
    count: 1
  },
  {
    id: 'references',
    name: 'References',
    description: 'Create and manage your references',
    icon: 'UserGroupIcon',
    count: 4
  }
];

// Document templates
const getDocumentTemplates = (): DocumentTemplate[] => [
  {
    id: 'modern-resume',
    titleKey: 'documentDashboard.templates.modernResume.title',
    descriptionKey: 'documentDashboard.templates.modernResume.description',
    category: 'resumes',
    icon: 'FileTextIcon'
  },
  {
    id: 'creative-resume',
    titleKey: 'documentDashboard.templates.creativeResume.title',
    descriptionKey: 'documentDashboard.templates.creativeResume.description',
    category: 'resumes',
    icon: 'FileTextIcon'
  },
  {
    id: 'professional-cover-letter',
    titleKey: 'documentDashboard.templates.professionalCoverLetter.title',
    descriptionKey: 'documentDashboard.templates.professionalCoverLetter.description',
    category: 'coverLetters',
    icon: 'MailIcon'
  },
  {
    id: 'personal-portfolio',
    titleKey: 'documentDashboard.templates.personalPortfolio.title',
    descriptionKey: 'documentDashboard.templates.personalPortfolio.description',
    category: 'portfolios',
    icon: 'BriefcaseIcon'
  }
];

const DocumentManagerPage: React.FC<DocumentManagerPageProps> = ({ navigate }) => {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const {
    documents,
    templates,
    loading,
    error,
    searchTerm,
    selectedCategory,
    setSearchTerm,
    setSelectedCategory,
    createDocument,
    
    deleteDocument,
    duplicateDocument,
    clearError
  } = useResumeDocuments();
  const [categories, setCategories] = useState<DocumentCategory[]>([]);

  // Initialize component
  useEffect(() => {
    if (!currentUser) {
      clearError();
    }
  }, [currentUser, t]);

  // Filtering logic
  const filteredTemplates = getDocumentTemplates().filter(template => {
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    const matchesSearch = searchTerm === '' || 
      t(template.titleKey).toLowerCase().includes(searchTerm.toLowerCase()) ||
      t(template.descriptionKey).toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Document action handlers
  const handleCreateDocument = async (templateId: string) => {
    try {
      await createDocument(templateId, {
        name: `New Document - ${new Date().toLocaleDateString()}`,
        category: 'resume' as const
      });
    } catch (err) {
      console.error('Failed to create document:', err);
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (window.confirm(t('documentDashboard.confirmDelete'))) {
      try {
        await deleteDocument(docId);
      } catch (err) {
        console.error('Failed to delete document:', err);
      }
    }
  };

  const handleDuplicateDocument = async (docId: string) => {
    try {
      await duplicateDocument(docId);
    } catch (err) {
      console.error('Failed to duplicate document:', err);
    }
  };

  // Category mapping function to convert UI category IDs to document category values
  const mapCategoryIdToDocumentCategory = (categoryId: string): 'resume' | 'coverLetter' | 'portfolio' | 'references' | 'bio' | 'email' | 'letter' | 'other' | 'all' => {
    const categoryMap: Record<string, 'resume' | 'coverLetter' | 'portfolio' | 'references' | 'bio' | 'email' | 'letter' | 'other' | 'all'> = {
      'resumes': 'resume',
      'coverLetters': 'coverLetter', 
      'portfolios': 'portfolio',
      'references': 'references',
      'bio': 'bio',
      'email': 'email',
      'letter': 'letter',
      'other': 'other',
      'all': 'all'
    };
    return categoryMap[categoryId] || 'all';
  };

  // Event handlers
  const handleCategoryChange = useCallback((categoryId: string) => {
    const documentCategory = mapCategoryIdToDocumentCategory(categoryId);
    setSelectedCategory(documentCategory);
  }, []);
  
  const handleSearchChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  }, []);

  // Quick action handlers

  // Loading state
  if (loading) {
    return (
      <StandardPageLayout
        title={t('documentManager.title')}
        subtitle={t('documentManager.subtitle')}
        loading={true}
      >
        <div />
      </StandardPageLayout>
    );
  }
  
  // Error state
  if (error) {
    return (
      <StandardPageLayout
        title={t('documentManager.title')}
        subtitle={t('documentManager.subtitle')}
        error={error}
      >
        <div />
      </StandardPageLayout>
    );
  }

  return (
    <StandardPageLayout
      title={t('documentManager.title')}
      subtitle={t('documentManager.subtitle')}
    >
      <div className="container mx-auto px-4 py-8">
        {/* Document Management System */}
        <div className="mb-12">


          {/* Document Upload Zone */}
          <div className="mb-8 p-6 bg-gray-50/55 dark:bg-gray-900/25 rounded-xl border border-gray-100 dark:border-gray-800/30">
            <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-4">
              {t('documentDashboard.docManagement.uploadDocuments')}
            </h3>
            
            {/* Drag and Drop Upload Zone */}
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center hover:border-blue-500 dark:hover:border-blue-400 transition-colors">
              <UploadIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-300 mb-2">
                {t('documentDashboard.docManagement.uploadInstructions')}
              </p>
              <div className="flex gap-3 mt-4">
                <GlassButton>
                  <PlusIcon className="w-4 h-4 mr-2" />
                  {t('documentDashboard.docManagement.uploadDocuments')}
                </GlassButton>
                <GlassButton 
                  onClick={() => navigate('/resume-builder/create')}
                >
                  <FileTextIcon className="w-4 h-4 mr-2" />
                  Create Resume
                </GlassButton>
              </div>
            </div>

            {/* Document Metadata Form */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('documentDashboard.docManagement.nameDocument')}
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  placeholder={t('documentDashboard.docManagement.nameDocument')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('documentDashboard.docManagement.assignCategory')}
                </label>
                <select 
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  aria-label={t('documentDashboard.docManagement.assignCategory')}
                >
                  <option value="">{t('documentDashboard.docManagement.assignCategory')}</option>
                  <option value="resume">{t('documentDashboard.coreDocuments')}</option>
                  <option value="coverLetter">{t('documentDashboard.preApplicationNetworking')}</option>
                  <option value="portfolio">{t('documentDashboard.postApplicationComm')}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('documentDashboard.docManagement.assignJobApplication')}
                </label>
                <select 
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  aria-label={t('documentDashboard.docManagement.assignJobApplication')}
                >
                  <option value="">{t('documentDashboard.docManagement.assignJobApplication')}</option>
                  <option value="new">{t('documentDashboard.docManagement.createJobApplication')}</option>
                </select>
              </div>
            </div>
          </div>

          {/* Document Search and Filter Controls */}
          <div className="mb-6 p-6 bg-indigo-50/55 dark:bg-indigo-900/25 rounded-xl border border-indigo-100 dark:border-indigo-800/30">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Search Documents */}
              <div className="relative">
                <UserSearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder={t('documentDashboard.docManagement.searchDocuments')}
                  className="pl-10 pr-4 py-2 w-full border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Filter by Job Application */}
              <select 
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                aria-label={t('documentDashboard.docManagement.filterByJob')}
              >
                <option value="">{t('documentDashboard.docManagement.filterByJob')}</option>
                <option value="unassigned">{t('documentDashboard.docManagement.unassignedDocuments')}</option>
              </select>

              {/* Filter by Category */}
              <select 
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                aria-label={t('documentDashboard.docManagement.filterByCategory')}
              >
                <option value="">{t('documentDashboard.docManagement.filterByCategory')}</option>
                <option value="resume">{t('documentDashboard.coreDocuments')}</option>
                <option value="coverLetter">{t('documentDashboard.preApplicationNetworking')}</option>
              </select>

              {/* View Toggle */}
              <div className="flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden">
                <button 
                  className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm font-medium"
                  aria-label={t('documentDashboard.docManagement.gridView')}
                  title={t('documentDashboard.docManagement.gridView')}
                >
                  <ViewGridAddIcon className="w-4 h-4 mx-auto" />
                </button>
                <button 
                  className="flex-1 px-3 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700"
                  aria-label={t('documentDashboard.docManagement.listView')}
                  title={t('documentDashboard.docManagement.listView')}
                >
                  <ClipboardListIcon className="w-4 h-4 mx-auto" />
                </button>
              </div>
            </div>

            {/* AI-Powered Suggestions */}
            <div className="mt-4 p-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg border border-purple-200 dark:border-purple-700/30">
              <div className="flex items-center mb-2">
                <SparklesIcon className="w-5 h-5 text-purple-600 dark:text-purple-400 mr-2" />
                <h4 className="font-medium text-purple-800 dark:text-purple-200">
                  {t('documentDashboard.docManagement.aiSuggestions')}
                </h4>
              </div>
              <p className="text-sm text-purple-700 dark:text-purple-300">
                {t('documentDashboard.docManagement.linkToActiveJobs')}
              </p>
            </div>
          </div>

          {/* Document Management Interface */}
          <div className="mb-6 p-6 bg-emerald-50/55 dark:bg-emerald-900/25 rounded-xl border border-emerald-100 dark:border-emerald-800/30">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">
                {t('documentDashboard.docManagement.documentListView')}
              </h3>
              
              {/* Bulk Actions */}
              <div className="flex items-center space-x-2">
                <GlassButton size="sm" variant="button">
                  <CheckCircleIcon className="w-4 h-4 mr-2" />
                  {t('documentDashboard.docManagement.multiSelect')}
                </GlassButton>
                <GlassButton size="sm" variant="button">
                  <DownloadIcon className="w-4 h-4 mr-2" />
                  {t('documentDashboard.docManagement.bulkDownload')}
                </GlassButton>
                <GlassButton size="sm" variant="button">
                  <TrashIcon className="w-4 h-4 mr-2" />
                  {t('documentDashboard.docManagement.bulkDelete')}
                </GlassButton>
              </div>
            </div>

            {/* Document Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">
                      <input 
                        type="checkbox" 
                        className="rounded"
                        aria-label={t('documentDashboard.docManagement.multiSelect')}
                        title={t('documentDashboard.docManagement.multiSelect')}
                      />
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">
                      {t('documentDashboard.docManagement.documentName')}
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">
                      {t('documentDashboard.docManagement.documentCategory')}
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">
                      {t('documentDashboard.docManagement.linkedJob')}
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">
                      {t('documentDashboard.docManagement.uploadDate')}
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">
                      {t('documentDashboard.docManagement.actions')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {/* Sample Document Row */}
                  <tr className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="py-3 px-4">
                      <input 
                        type="checkbox" 
                        className="rounded"
                        aria-label="Select Software Engineer Resume.pdf"
                        title="Select Software Engineer Resume.pdf"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center">
                        <FileTextIcon className="w-4 h-4 text-blue-600 mr-2" />
                        <span className="font-medium text-gray-900 dark:text-white">Software Engineer Resume.pdf</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-block px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 text-xs font-medium rounded">
                        Resume
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-600 dark:text-gray-300">
                      Google - Software Engineer
                    </td>
                    <td className="py-3 px-4 text-gray-600 dark:text-gray-300">
                      2024-01-15
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        <button 
                          className="p-1 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
                          aria-label={t('documentDashboard.docManagement.preview')}
                          title={t('documentDashboard.docManagement.preview')}
                        >
                          <EyeIcon className="w-4 h-4" />
                        </button>
                        <button 
                          className="p-1 text-gray-600 dark:text-gray-300 hover:text-green-600 dark:hover:text-green-400"
                          aria-label={t('documentDashboard.docManagement.edit')}
                          title={t('documentDashboard.docManagement.edit')}
                        >
                          <EditIcon className="w-4 h-4" />
                        </button>
                        <button 
                          className="p-1 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
                          aria-label={t('documentDashboard.docManagement.download')}
                          title={t('documentDashboard.docManagement.download')}
                        >
                          <DownloadIcon className="w-4 h-4" />
                        </button>
                        <button 
                          className="p-1 text-gray-600 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400"
                          aria-label={t('documentDashboard.docManagement.delete')}
                          title={t('documentDashboard.docManagement.delete')}
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Categories & Jobs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Recent Categories */}
            <div className="p-6 bg-amber-50/55 dark:bg-amber-900/25 rounded-xl border border-amber-100 dark:border-amber-800/30">
              <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-4 flex items-center">
                <TagIcon className="w-5 h-5 mr-2 text-amber-600 dark:text-amber-400" />
                {t('documentDashboard.docManagement.recentCategories')}
              </h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded-lg">
                  <span className="text-sm text-gray-700 dark:text-gray-300">Resume</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">5 documents</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded-lg">
                  <span className="text-sm text-gray-700 dark:text-gray-300">Cover Letter</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">3 documents</span>
                </div>
              </div>
            </div>

            {/* Recent Job Applications */}
            <div className="p-6 bg-cyan-50/55 dark:bg-cyan-900/25 rounded-xl border border-cyan-100 dark:border-cyan-800/30">
              <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-4 flex items-center">
                <BriefcaseIcon className="w-5 h-5 mr-2 text-cyan-600 dark:text-cyan-400" />
                {t('documentDashboard.docManagement.recentJobs')}
              </h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded-lg">
                  <span className="text-sm text-gray-700 dark:text-gray-300">Google - Software Engineer</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">3 documents</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded-lg">
                  <span className="text-sm text-gray-700 dark:text-gray-300">Microsoft - Product Manager</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">2 documents</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </StandardPageLayout>
  );
};

export default DocumentManagerPage;
