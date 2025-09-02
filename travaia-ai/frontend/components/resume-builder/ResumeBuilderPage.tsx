import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../LoadingSpinner';
import useResumeDocuments from './useResumeDocuments';
import { PageHeader, GlassCard, GlassButton } from '../design-system';
import AppBackground from '../layout/AppBackground';
import PageContent from '../layout/PageContent';

import {
  FileTextIcon,
  DocumentAddIcon,
  MailIcon,
  UserGroupIcon,
  BriefcaseIcon,
  PlusIcon,
  UsersIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ShareIcon,
  LogoutIcon,
  RefreshIcon,
  TagIcon,
  SparklesIcon,
  CopyIcon,
  UserCircleIcon,
  ChatIcon,
  FolderIcon,
  DocumentReportIcon
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

interface ResumeBuilderPageProps {
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

const ResumeBuilderPage: React.FC<ResumeBuilderPageProps> = ({ navigate }) => {
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
  const handleCreateResume = () => handleCreateDocument('resume-modern');
  const handleCreateCoverLetter = () => handleCreateDocument('cover-letter-professional');
  const handleCreatePortfolio = () => handleCreateDocument('portfolio-creative');
  
  const handleImportDocument = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.doc,.docx';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        try {
          // TODO: Implement file import logic
          console.log('Importing file:', file.name);
        } catch (err) {
          console.error('Failed to import document:', err);
        }
      }
    };
    input.click();
  };

  // Loading state
  if (loading) {
    return (
      <AppBackground>
        <PageContent>
          <div className="min-h-screen flex items-center justify-center">
            <LoadingSpinner size="lg" />
          </div>
        </PageContent>
      </AppBackground>
    );
  }
  
  // Error state
  if (error) {
    return (
      <AppBackground>
        <PageContent>
          <div className="min-h-screen flex items-center justify-center">
            <GlassCard className="p-8 text-center">
              <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
              <GlassButton onClick={() => window.location.reload()}>
                {t('common.tryAgain')}
              </GlassButton>
            </GlassCard>
          </div>
        </PageContent>
      </AppBackground>
    );
  }

  return (
    <AppBackground>
      <PageContent>
        {/* Resume Builder Header */}
        <PageHeader
          title={t('resumeBuilder.title')}
          subtitle={t('resumeBuilder.subtitle')}
          showUserProfile={true}
        />

        <div className="container mx-auto px-4 py-8">

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
            {t('documentDashboard.quickActions')}
          </h2>
          
          {/* Core Documents */}
          <div className="mb-8 p-6 bg-blue-50/55 dark:bg-blue-900/25 rounded-xl border border-blue-100 dark:border-blue-800/30">
            <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-4">
              {t('documentDashboard.coreDocuments')}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              <GlassButton 
                onClick={() => handleCreateResume()}
                className="p-4 text-left hover:shadow-lg transition-shadow min-h-[100px] flex flex-col justify-center bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 border border-blue-200 dark:border-blue-700"
              >
                <PlusIcon className="w-6 h-6 mb-2 text-blue-600 dark:text-blue-400" />
                <h4 className="font-medium text-sm text-gray-900 dark:text-white leading-tight">
                  {t('documentDashboard.createResume')}
                </h4>
              </GlassButton>
              
              <GlassButton 
                onClick={() => handleCreateCoverLetter()}
                className="p-4 text-left hover:shadow-lg transition-shadow min-h-[100px] flex flex-col justify-center bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 border border-green-200 dark:border-green-700"
              >
                <MailIcon className="w-6 h-6 mb-2 text-green-600 dark:text-green-400" />
                <h4 className="font-medium text-sm text-gray-900 dark:text-white leading-tight">
                  {t('documentDashboard.createCoverLetter')}
                </h4>
              </GlassButton>
              
              <GlassButton 
                onClick={() => handleCreatePortfolio()}
                className="p-4 text-left hover:shadow-lg transition-shadow min-h-[100px] flex flex-col justify-center bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 border border-purple-200 dark:border-purple-700"
              >
                <BriefcaseIcon className="w-6 h-6 mb-2 text-purple-600 dark:text-purple-400" />
                <h4 className="font-medium text-sm text-gray-900 dark:text-white leading-tight">
                  {t('documentDashboard.createPortfolio')}
                </h4>
              </GlassButton>
              
              <GlassButton 
                onClick={() => handleImportDocument()}
                className="p-4 text-left hover:shadow-lg transition-shadow min-h-[100px] flex flex-col justify-center bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/30 dark:to-orange-800/30 border border-orange-200 dark:border-orange-700"
              >
                <DocumentAddIcon className="w-6 h-6 mb-2 text-orange-600 dark:text-orange-400" />
                <h4 className="font-medium text-sm text-gray-900 dark:text-white leading-tight">
                  {t('documentDashboard.importDocument')}
                </h4>
              </GlassButton>
            </div>
          </div>

          {/* Pre-Application & Networking */}
          <div className="mb-8 p-6 bg-green-50/55 dark:bg-green-900/25 rounded-xl border border-green-100 dark:border-green-800/30">
            <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-4">
              {t('documentDashboard.preApplicationNetworking')}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              <GlassButton 
                onClick={() => handleCreateDocument('professional-bio')}
                className="p-4 text-left hover:shadow-lg transition-shadow min-h-[100px] flex flex-col justify-center bg-gradient-to-br from-cyan-50 to-cyan-100 dark:from-cyan-900/30 dark:to-cyan-800/30 border border-cyan-200 dark:border-cyan-700"
              >
                <UsersIcon className="w-6 h-6 mb-2 text-cyan-600 dark:text-cyan-400" />
                <h4 className="font-medium text-sm text-gray-900 dark:text-white leading-tight">
                  {t('documentDashboard.professionalBio')}
                </h4>
              </GlassButton>
              
              <GlassButton 
                onClick={() => handleCreateDocument('networking-email')}
                className="p-4 text-left hover:shadow-lg transition-shadow min-h-[100px] flex flex-col justify-center bg-gradient-to-br from-teal-50 to-teal-100 dark:from-teal-900/30 dark:to-teal-800/30 border border-teal-200 dark:border-teal-700"
              >
                <MailIcon className="w-6 h-6 mb-2 text-teal-600 dark:text-teal-400" />
                <h4 className="font-medium text-sm text-gray-900 dark:text-white leading-tight">
                  {t('documentDashboard.networkingEmail')}
                </h4>
              </GlassButton>
              
              <GlassButton 
                onClick={() => handleCreateDocument('thank-you-email')}
                className="p-4 text-left hover:shadow-lg transition-shadow min-h-[100px] flex flex-col justify-center bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/30 dark:to-emerald-800/30 border border-emerald-200 dark:border-emerald-700"
              >
                <CheckCircleIcon className="w-6 h-6 mb-2 text-emerald-600 dark:text-emerald-400" />
                <h4 className="font-medium text-sm text-gray-900 dark:text-white leading-tight">
                  {t('documentDashboard.thankYouEmail')}
                </h4>
              </GlassButton>
            </div>
          </div>

          {/* Post-Application Communication */}
          <div className="mb-8 p-6 bg-purple-50/55 dark:bg-purple-900/25 rounded-xl border border-purple-100 dark:border-purple-800/30">
            <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-4">
              {t('documentDashboard.postApplicationComm')}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              <GlassButton 
                onClick={() => handleCreateDocument('application-submission-email')}
                className="p-4 text-left hover:shadow-lg transition-shadow min-h-[100px] flex flex-col justify-center bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/30 dark:to-indigo-800/30 border border-indigo-200 dark:border-indigo-700"
              >
                <ShareIcon className="w-6 h-6 mb-2 text-indigo-600 dark:text-indigo-400" />
                <h4 className="font-medium text-sm text-gray-900 dark:text-white leading-tight">
                  {t('documentDashboard.applicationSubmissionEmail')}
                </h4>
              </GlassButton>
              
              <GlassButton 
                onClick={() => handleCreateDocument('interview-thank-you')}
                className="p-4 text-left hover:shadow-lg transition-shadow min-h-[100px] flex flex-col justify-center bg-gradient-to-br from-pink-50 to-pink-100 dark:from-pink-900/30 dark:to-pink-800/30 border border-pink-200 dark:border-pink-700"
              >
                <ChatIcon className="w-6 h-6 mb-2 text-pink-600 dark:text-pink-400" />
                <h4 className="font-medium text-sm text-gray-900 dark:text-white leading-tight">
                  {t('documentDashboard.interviewThankYou')}
                </h4>
              </GlassButton>
              
              <GlassButton 
                onClick={() => handleCreateDocument('follow-up-email')}
                className="p-4 text-left hover:shadow-lg transition-shadow min-h-[100px] flex flex-col justify-center bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/30 dark:to-amber-800/30 border border-amber-200 dark:border-amber-700"
              >
                <ClockIcon className="w-6 h-6 mb-2 text-amber-600 dark:text-amber-400" />
                <h4 className="font-medium text-sm text-gray-900 dark:text-white leading-tight">
                  {t('documentDashboard.followUpEmail')}
                </h4>
              </GlassButton>
              
              <GlassButton 
                onClick={() => handleCreateDocument('acceptance-letter')}
                className="p-4 text-left hover:shadow-lg transition-shadow min-h-[100px] flex flex-col justify-center bg-gradient-to-br from-lime-50 to-lime-100 dark:from-lime-900/30 dark:to-lime-800/30 border border-lime-200 dark:border-lime-700"
              >
                <CheckCircleIcon className="w-6 h-6 mb-2 text-lime-600 dark:text-lime-400" />
                <h4 className="font-medium text-sm text-gray-900 dark:text-white leading-tight">
                  {t('documentDashboard.acceptanceLetter')}
                </h4>
              </GlassButton>
              
              <GlassButton 
                onClick={() => handleCreateDocument('decline-letter')}
                className="p-4 text-left hover:shadow-lg transition-shadow min-h-[100px] flex flex-col justify-center bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-800/30 border border-red-200 dark:border-red-700"
              >
                <XCircleIcon className="w-6 h-6 mb-2 text-red-600 dark:text-red-400" />
                <h4 className="font-medium text-sm text-gray-900 dark:text-white leading-tight">
                  {t('documentDashboard.declineLetter')}
                </h4>
              </GlassButton>
            </div>
          </div>

          {/* Negotiation & Onboarding */}
          <div className="mb-8 p-6 bg-orange-50/55 dark:bg-orange-900/25 rounded-xl border border-orange-100 dark:border-orange-800/30">
            <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-4">
              {t('documentDashboard.negotiationOnboarding')}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              <GlassButton 
                onClick={() => handleCreateDocument('salary-negotiation')}
                className="p-4 text-left hover:shadow-lg transition-shadow min-h-[100px] flex flex-col justify-center bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/30 dark:to-yellow-800/30 border border-yellow-200 dark:border-yellow-700"
              >
                <TagIcon className="w-6 h-6 mb-2 text-yellow-600 dark:text-yellow-400" />
                <h4 className="font-medium text-sm text-gray-900 dark:text-white leading-tight">
                  {t('documentDashboard.salaryNegotiation')}
                </h4>
              </GlassButton>
              
              <GlassButton 
                onClick={() => handleCreateDocument('counter-offer')}
                className="p-4 text-left hover:shadow-lg transition-shadow min-h-[100px] flex flex-col justify-center bg-gradient-to-br from-violet-50 to-violet-100 dark:from-violet-900/30 dark:to-violet-800/30 border border-violet-200 dark:border-violet-700"
              >
                <RefreshIcon className="w-6 h-6 mb-2 text-violet-600 dark:text-violet-400" />
                <h4 className="font-medium text-sm text-gray-900 dark:text-white leading-tight">
                  {t('documentDashboard.counterOffer')}
                </h4>
              </GlassButton>
              
              <GlassButton 
                onClick={() => handleCreateDocument('employment-review')}
                className="p-4 text-left hover:shadow-lg transition-shadow min-h-[100px] flex flex-col justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900/30 dark:to-slate-800/30 border border-slate-200 dark:border-slate-700"
              >
                <FileTextIcon className="w-6 h-6 mb-2 text-slate-600 dark:text-slate-400" />
                <h4 className="font-medium text-sm text-gray-900 dark:text-white leading-tight">
                  {t('documentDashboard.employmentReview')}
                </h4>
              </GlassButton>
            </div>
          </div>

          {/* Special Situations */}
          <div className="mb-8 p-6 bg-red-50/55 dark:bg-red-900/25 rounded-xl border border-red-100 dark:border-red-800/30">
            <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-4">
              {t('documentDashboard.specialSituations')}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              <GlassButton 
                onClick={() => handleCreateDocument('cold-email')}
                className="p-4 text-left hover:shadow-lg transition-shadow min-h-[100px] flex flex-col justify-center bg-gradient-to-br from-sky-50 to-sky-100 dark:from-sky-900/30 dark:to-sky-800/30 border border-sky-200 dark:border-sky-700"
              >
                <MailIcon className="w-6 h-6 mb-2 text-sky-600 dark:text-sky-400" />
                <h4 className="font-medium text-sm text-gray-900 dark:text-white leading-tight">
                  {t('documentDashboard.coldEmail')}
                </h4>
              </GlassButton>
              
              <GlassButton 
                onClick={() => handleCreateDocument('recommendation-request')}
                className="p-4 text-left hover:shadow-lg transition-shadow min-h-[100px] flex flex-col justify-center bg-gradient-to-br from-rose-50 to-rose-100 dark:from-rose-900/30 dark:to-rose-800/30 border border-rose-200 dark:border-rose-700"
              >
                <SparklesIcon className="w-6 h-6 mb-2 text-rose-600 dark:text-rose-400" />
                <h4 className="font-medium text-sm text-gray-900 dark:text-white leading-tight">
                  {t('documentDashboard.recommendationRequest')}
                </h4>
              </GlassButton>
              
              <GlassButton 
                onClick={() => handleCreateDocument('resignation-letter')}
                className="p-4 text-left hover:shadow-lg transition-shadow min-h-[100px] flex flex-col justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900/30 dark:to-gray-800/30 border border-gray-200 dark:border-gray-700"
              >
                <LogoutIcon className="w-6 h-6 mb-2 text-gray-600 dark:text-gray-400" />
                <h4 className="font-medium text-sm text-gray-900 dark:text-white leading-tight">
                  {t('documentDashboard.resignationLetter')}
                </h4>
              </GlassButton>
              
              <GlassButton 
                onClick={() => handleCreateDocument('internal-transfer')}
                className="p-4 text-left hover:shadow-lg transition-shadow min-h-[100px] flex flex-col justify-center bg-gradient-to-br from-stone-50 to-stone-100 dark:from-stone-900/30 dark:to-stone-800/30 border border-stone-200 dark:border-stone-700"
              >
                <RefreshIcon className="w-6 h-6 mb-2 text-stone-600 dark:text-stone-400" />
                <h4 className="font-medium text-sm text-gray-900 dark:text-white leading-tight">
                  {t('documentDashboard.internalTransfer')}
                </h4>
              </GlassButton>
              
              <GlassButton 
                onClick={() => handleCreateDocument('freelance-proposal')}
                className="p-4 text-left hover:shadow-lg transition-shadow min-h-[100px] flex flex-col justify-center bg-gradient-to-br from-fuchsia-50 to-fuchsia-100 dark:from-fuchsia-900/30 dark:to-fuchsia-800/30 border border-fuchsia-200 dark:border-fuchsia-700"
              >
                <CopyIcon className="w-6 h-6 mb-2 text-fuchsia-600 dark:text-fuchsia-400" />
                <h4 className="font-medium text-sm text-gray-900 dark:text-white leading-tight">
                  {t('documentDashboard.freelanceProposal')}
                </h4>
              </GlassButton>
            </div>
          </div>

          {/* Dynamic Templates Section */}
          {filteredTemplates.length > 0 && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                {t('documentDashboard.templates.title', 'Document Templates')}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-6">
                {filteredTemplates.map((template) => {
                  const IconComponent = template.icon === 'FileTextIcon' ? FileTextIcon :
                                    template.icon === 'MailIcon' ? MailIcon :
                                    template.icon === 'BriefcaseIcon' ? BriefcaseIcon :
                                    FileTextIcon; // fallback
                  
                  return (
                    <GlassButton
                      key={template.id}
                      onClick={() => handleCreateDocument(template.id)}
                      className="p-4 text-left hover:shadow-lg transition-shadow min-h-[100px] flex flex-col justify-center bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 border border-blue-200 dark:border-blue-700"
                    >
                      <IconComponent className="w-6 h-6 mb-2 text-blue-600 dark:text-blue-400" />
                      <h4 className="font-medium text-sm text-gray-900 dark:text-white leading-tight mb-1">
                        {t(template.titleKey)}
                      </h4>
                      <p className="text-xs text-gray-600 dark:text-gray-300">
                        {t(template.descriptionKey)}
                      </p>
                    </GlassButton>
                  );
                })}
              </div>
            </div>
          )}

          {/* Document Categories */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              {t('documentDashboard.categories')}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-6">
              {getDocumentCategories().map((category) => {
                const IconComponent = category.icon === 'FileTextIcon' ? FileTextIcon :
                                   category.icon === 'MailIcon' ? MailIcon :
                                   category.icon === 'BriefcaseIcon' ? BriefcaseIcon :
                                   UserGroupIcon;
                return (
                  <div key={category.id} onClick={() => handleCategoryChange(category.id)} className="cursor-pointer">
                    <GlassCard className={`p-4 hover:shadow-lg transition-shadow min-h-[120px] flex flex-col ${
                      category.id === 'resumes' ? 'bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 border border-blue-200 dark:border-blue-700' :
                      category.id === 'coverLetters' ? 'bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 border border-green-200 dark:border-green-700' :
                      category.id === 'portfolios' ? 'bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 border border-purple-200 dark:border-purple-700' :
                      'bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900/30 dark:to-gray-800/30 border border-gray-200 dark:border-gray-700'
                    }`}>
                    <div className="flex items-center mb-3">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg mr-3 flex-shrink-0">
                        <IconComponent className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-sm text-gray-900 dark:text-white mb-1 truncate">
                          {category.name}
                        </h3>
                        <p className="text-xs text-gray-600 dark:text-gray-300">
                          {category.count} documents
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-300 flex-1 line-clamp-2">
                      {category.description}
                    </p>
                    </GlassCard>
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* Document Templates */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              {t('documentDashboard.templates')}
            </h2>
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-6">
              {/* Category filters */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleCategoryChange('all')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedCategory === 'all'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  {t('documentDashboard.allDocuments')}
                </button>
                {getDocumentCategories().map((category) => (
                  <button
                    key={category.id}
                    onClick={() => handleCategoryChange(category.id)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      selectedCategory === category.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    {category.name}
                  </button>
                ))}
              </div>
              
              {/* Search */}
              <div className="relative">
                <FileTextIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder={t('documentDashboard.searchPlaceholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            
            {/* Templates Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {getDocumentTemplates().map((template) => (
                <div key={template.id} onClick={() => handleCreateDocument(template.id)} className="cursor-pointer">
                  <GlassCard className="p-4 hover:shadow-lg transition-all duration-200 flex flex-col h-full">
                  <div className="flex items-center mb-3">
                    <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg mr-3 flex-shrink-0">
                      <FileTextIcon className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm text-gray-900 dark:text-white mb-1 truncate">
                        {t(template.titleKey)}
                      </h3>
                      <span className="inline-block px-2 py-1 bg-gray-100 dark:bg-gray-700 text-xs font-medium text-gray-600 dark:text-gray-300 rounded truncate">
                        {template.category}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-300 mb-3 flex-1 line-clamp-3">
                    {t(template.descriptionKey)}
                  </p>
                  <GlassButton
                    onClick={() => handleCreateDocument(template.id)}
                    className="w-full py-2 text-sm text-center mt-auto"
                  >
                    {t('documentDashboard.createDocument')}
                  </GlassButton>
                  </GlassCard>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Document Categories */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            {t('documentDashboard.categories')}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-6">
            {getDocumentCategories().map((category) => {
              const IconComponent = category.icon === 'FileTextIcon' ? FileTextIcon :
                                 category.icon === 'MailIcon' ? MailIcon :
                                 category.icon === 'BriefcaseIcon' ? BriefcaseIcon :
                                 UserGroupIcon;
              return (
                <div key={category.id} onClick={() => handleCategoryChange(category.id)} className="cursor-pointer">
                  <GlassCard className={`p-4 hover:shadow-lg transition-shadow min-h-[120px] flex flex-col ${
                    category.id === 'resumes' ? 'bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 border border-blue-200 dark:border-blue-700' :
                    category.id === 'coverLetters' ? 'bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 border border-green-200 dark:border-green-700' :
                    category.id === 'portfolios' ? 'bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 border border-purple-200 dark:border-purple-700' :
                    'bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900/30 dark:to-gray-800/30 border border-gray-200 dark:border-gray-700'
                  }`}>
                  <div className="flex items-center mb-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg mr-3 flex-shrink-0">
                      <IconComponent className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm text-gray-900 dark:text-white mb-1 truncate">
                        {category.name}
                      </h3>
                      <p className="text-xs text-gray-600 dark:text-gray-300">
                        {category.count} documents
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-300 flex-1 line-clamp-2">
                    {category.description}
                  </p>
                  </GlassCard>
                </div>
              );
            })}
          </div>
        </div>
        
        {/* Document Templates */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            {t('documentDashboard.templates')}
          </h2>
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-6">
            {/* Category filters */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleCategoryChange('all')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedCategory === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                {t('documentDashboard.allDocuments')}
              </button>
              {getDocumentCategories().map((category) => (
                <button
                  key={category.id}
                  onClick={() => handleCategoryChange(category.id)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedCategory === category.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>
            
            {/* Search */}
            <div className="relative">
              <FileTextIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder={t('documentDashboard.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          
          {/* Templates Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {getDocumentTemplates().map((template) => (
              <div key={template.id} onClick={() => handleCreateDocument(template.id)} className="cursor-pointer">
                <GlassCard className="p-4 hover:shadow-lg transition-all duration-200 flex flex-col h-full">
                <div className="flex items-center mb-3">
                  <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg mr-3 flex-shrink-0">
                    <FileTextIcon className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm text-gray-900 dark:text-white mb-1 truncate">
                      {t(template.titleKey)}
                    </h3>
                    <span className="inline-block px-2 py-1 bg-gray-100 dark:bg-gray-700 text-xs font-medium text-gray-600 dark:text-gray-300 rounded truncate">
                      {template.category}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-300 mb-3 flex-1 line-clamp-3">
                  {t(template.descriptionKey)}
                </p>
                <GlassButton
                  onClick={() => handleCreateDocument(template.id)}
                  className="w-full py-2 text-sm text-center mt-auto"
                >
                  {t('documentDashboard.createDocument')}
                </GlassButton>
                </GlassCard>
              </div>
            ))}
          </div>
        </div>
        </div>
      </PageContent>
    </AppBackground>
  );
};

export default ResumeBuilderPage;
