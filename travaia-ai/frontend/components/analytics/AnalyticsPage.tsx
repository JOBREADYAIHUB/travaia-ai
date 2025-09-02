import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { JobApplication } from '../../types';
import { fetchUserSectionData } from '../../services/firestoreService';
import { analyticsAIService, ResearchResult, SearchResult } from '../../services/analyticsAIService';
import { GlassCard, GlassButton, GlassModal, StandardPageLayout } from '../design-system';
// ToddlerGlassInput removed - using native textarea for multiline inputs
import WebSearchResults from '../research/WebSearchResults';
import SkillsManagement from './SkillsManagement';
import JobFitAnalysis from './JobFitAnalysis';
// LoadingSpinner removed - not needed in research assistant
import { motion } from 'framer-motion';

interface AnalyticsPageProps {
  navigate: (route: string) => void;
}

interface ResearchData {
  id: string;
  userId: string;
  title: string;
  content: string;
  applicationId?: string;
  companyName?: string;
  jobTitle?: string;
  createdAt: string;
  updatedAt: string;
  webSearchResults?: SearchResult[];
}

// ResearchSession interface removed - not used in current implementation

const AnalyticsPage: React.FC<AnalyticsPageProps> = () => {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  
  // State management
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [savedResearch, setSavedResearch] = useState<ResearchData[]>([]);
  const [selectedApplication, setSelectedApplication] = useState<string | null>(null);
  const [customResearchText, setCustomResearchText] = useState('');
  const [isResearching, setIsResearching] = useState(false);
  const [currentResearch, setCurrentResearch] = useState<ResearchData | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [researchToDelete, setResearchToDelete] = useState<ResearchData | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  // AI service is available as singleton - no initialization needed

  // Load data on component mount
  useEffect(() => {
    const loadData = async () => {
      if (!currentUser) {
        setLoading(false);
        return;
      }

      try {
        // Load job applications
        const userApplications = await fetchUserSectionData(currentUser.uid, 'jobApplications') as JobApplication[];
        setApplications(userApplications || []);
        
        // TODO: Load saved research from Firestore
        // For now, using empty array - this will be implemented with the backend Firestore service
        setSavedResearch([]);
        
      } catch (err) {
        console.error('Failed to load data:', err);
        setError(t('analyticsPage.loadError'));
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [currentUser, t]);

  // Handle AI research
  const handleStartResearch = async () => {
    console.log('Start research button clicked');
    if (!currentUser) {
      setError(t('analyticsPage.loadError'));
      return;
    }

    const researchQuery = selectedApplication 
      ? `Research ${applications.find(app => app.id === selectedApplication)?.company.name} for the ${applications.find(app => app.id === selectedApplication)?.role.title} position`
      : customResearchText;

    if (!researchQuery.trim()) {
      setError(t('analyticsPage.researchError'));
      return;
    }

    setIsResearching(true);
    setError(null);

    try {
      // Check if AI service is available
      console.log('AI service available check:', analyticsAIService.isAvailable());
      if (!analyticsAIService.isAvailable()) {
        console.error('AI service not available');
        setError(t('analyticsPage.aiNotAvailable'));
        setIsResearching(false);
        return;
      }

      let researchResult: ResearchResult;
      
      if (selectedApplication) {
        // Research specific job application
        const app = applications.find(a => a.id === selectedApplication);
        if (!app) {
          setError(t('researchAssistant.applicationNotFound'));
          setIsResearching(false);
          return;
        }

        researchResult = await analyticsAIService.generateJobResearch(app.role.title, app.company.name);
        
        // Process and extract web search results if present
        if (researchResult.content) {
          const extractedResults = analyticsAIService.extractWebSearchResults(researchResult.content);
          if (extractedResults && extractedResults.length > 0) {
            researchResult.webSearchResults = extractedResults;
          }
        }
      } else if (customResearchText) {
        // Research custom query
        researchResult = await analyticsAIService.generateCustomResearch(customResearchText);
        
        // Process and extract web search results if present
        if (researchResult.content) {
          const extractedResults = analyticsAIService.extractWebSearchResults(researchResult.content);
          if (extractedResults && extractedResults.length > 0) {
            researchResult.webSearchResults = extractedResults;
          }
        }
      } else {
        setError(t('researchAssistant.researchError'));
        setIsResearching(false);
        return;
      }

      // Convert ResearchResult to ResearchData format
      const researchData: ResearchData = {
        id: researchResult.id,
        userId: currentUser.uid,
        title: researchResult.title,
        content: researchResult.content,
        applicationId: selectedApplication || undefined,
        companyName: selectedApplication 
          ? applications.find(app => app.id === selectedApplication)?.company.name
          : undefined,
        jobTitle: selectedApplication 
          ? applications.find(app => app.id === selectedApplication)?.role.title
          : undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        webSearchResults: researchResult.webSearchResults || undefined
      };

      setCurrentResearch(researchData);
      
      // Add to saved research list
      setSavedResearch(prev => [researchData, ...prev]);
      
      // TODO: Save to Firestore here
      setIsResearching(false);
    } catch (err) {
      console.error('Research failed:', err);
      setError(t('researchAssistant.researchError'));
      setIsResearching(false);
    }
  };

  // Handle edit research
  const handleEditResearch = (research: ResearchData) => {
    setCurrentResearch(research);
    setEditingContent(research.content);
    setShowEditModal(true);
  };

  // Handle save edited research
  const handleSaveEdit = async () => {
    if (!currentResearch) return;

    try {
      const updatedResearch = {
        ...currentResearch,
        content: editingContent,
        updatedAt: new Date().toISOString()
      };
      
      // TODO: Update in Firestore
      setCurrentResearch(updatedResearch);
      setSavedResearch(prev => 
        prev.map(r => r.id === updatedResearch.id ? updatedResearch : r)
      );
      
      setShowEditModal(false);
      setEditingContent('');
    } catch (err) {
      console.error('Failed to save research:', err);
      setError(t('researchAssistant.updateError'));
    }
  };

  // Handle delete research
  const handleDeleteResearch = async () => {
    if (!researchToDelete) return;

    try {
      // TODO: Delete from Firestore
      setSavedResearch(prev => prev.filter(r => r.id !== researchToDelete.id));
      
      if (currentResearch?.id === researchToDelete.id) {
        setCurrentResearch(null);
      }
      
      setShowDeleteModal(false);
      setResearchToDelete(null);
    } catch (err) {
      console.error('Failed to delete research:', err);
      setError(t('researchAssistant.deleteError'));
    }
  };

  if (loading) {
    return (
      <StandardPageLayout
        title={t('analyticsPage.title')}
        subtitle={t('analyticsPage.subtitle')}
        loading={true}
      >
        <div />
      </StandardPageLayout>
    );
  }

  return (
    <StandardPageLayout
      title={t('analyticsPage.title')}
      subtitle={t('analyticsPage.subtitle')}
      showUserProfile={true}
    >
      <div className="space-y-6">
        
        {/* Skills Management Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="lg:col-span-3">
          <SkillsManagement 
            initialSkills={currentUser?.skills || []}
            className="mb-8"
          />
        </motion.div>

        {/* Job Fit Analysis */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="lg:col-span-3">
          <JobFitAnalysis 
            jobApplications={applications} 
            className="mb-8"
          />
        </motion.div>

        {/* Error Display */}
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-4 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400"
          >
            {error}
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Research Input Section */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="lg:col-span-1">
            <GlassCard className="p-6 h-full">
              <h2 className="text-xl font-semibold mb-4">
                {t('analyticsPage.newResearch')}
              </h2>
              
              {/* Job Application Selector */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">
                  {t('analyticsPage.selectApplication')}
                </label>
                <select
                  value={selectedApplication || ''}
                  onChange={(e) => setSelectedApplication(e.target.value || null)}
                  className="w-full p-3 bg-white/10 dark:bg-gray-800/10 border border-white/20 dark:border-gray-700/20 rounded-lg backdrop-blur-md"
                  title={t('analyticsPage.selectApplication')}
                  aria-label={t('analyticsPage.selectApplication')}
                >
                  <option value="">{t('analyticsPage.selectApplicationPlaceholder')}</option>
                  {applications.map((app) => (
                    <option key={app.id} value={app.id}>
                      {app.company?.name || app.company || 'Unknown Company'} - {app.role?.title || app.position || app.title || 'Unknown Position'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Custom Research Text */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">
                  {t('analyticsPage.customResearch')}
                </label>
                <textarea
                  id="customResearch"
                  name="customResearch"
                  value={customResearchText}
                  onChange={(e) => setCustomResearchText(e.target.value)}
                  placeholder={t('analyticsPage.customResearchPlaceholder')}
                  rows={3}
                  className="w-full p-3 bg-white/10 dark:bg-gray-800/10 border border-white/20 dark:border-gray-700/20 rounded-lg backdrop-blur-md resize-none"
                />
              </div>

              {/* Start Research Button */}
              <GlassButton
                onClick={handleStartResearch}
                disabled={isResearching || (!selectedApplication && !customResearchText.trim())}
                className="w-full"
              >
                {isResearching ? t('analyticsPage.researching') : t('analyticsPage.startResearch')}
              </GlassButton>
            </GlassCard>
          </motion.div>

          {/* Current Research Display */}
          {currentResearch && (
            <div className="space-y-4 w-full">
              {isResearching && (
                <p className="text-center">{t('analyticsPage.researchingV2')}</p>
              )}
              
              <GlassCard className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold">{currentResearch.title}</h2>
                  <div className="flex space-x-2">
                    <GlassButton
                      variant="button"
                      size="sm"
                      onClick={() => handleEditResearch(currentResearch)}
                    >
                      {t('analyticsPage.editResearch')}
                    </GlassButton>
                    <GlassButton
                      variant="button"
                      size="sm"
                      onClick={() => {
                        setResearchToDelete(currentResearch);
                        setShowDeleteModal(true);
                      }}
                    >
                      {t('analyticsPage.delete')}
                    </GlassButton>
                  </div>
                </div>
                
                <div className="whitespace-pre-wrap markdown">
                  {currentResearch.content}
                </div>
                
                {/* Web Search Results Section */}
                {currentResearch.webSearchResults && currentResearch.webSearchResults.length > 0 && (
                  <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold mb-4">{t('analyticsPage.webSources')}</h3>
                    <WebSearchResults 
                      results={currentResearch.webSearchResults} 
                      loading={false} 
                      query={currentResearch.title}
                    />
                  </div>
                )}
                
                {currentResearch.companyName && (
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 text-sm text-gray-400">
                    <strong>{t('analyticsPage.company')}:</strong> {currentResearch.companyName}
                    {currentResearch.jobTitle && (
                      <span className="ml-4">
                        <strong>{t('analyticsPage.position')}:</strong> {currentResearch.jobTitle}
                      </span>
                    )}
                  </div>
                )}
              </GlassCard>
            </div>
          )}

          {/* Saved Research List */}
          <div className="flex-1">
            <GlassCard className="p-6 h-full">
              <h2 className="text-xl font-semibold mb-4">
                {t('analyticsPage.savedResearch')}
              </h2>
              
              {savedResearch.length === 0 ? (
                <div className="text-center text-gray-400 py-8">
                  {t('analyticsPage.noSavedResearch')}
                </div>
              ) : (
                <div className="space-y-4">
                  {savedResearch.map((research) => (
                    <div key={research.id} className="p-4 bg-white/5 dark:bg-gray-800/5 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium">{research.title}</h3>
                        <div className="flex space-x-2">
                          <GlassButton
                            variant="button"
                            size="sm"
                            onClick={() => handleEditResearch(research)}
                          >
                            {t('analyticsPage.editResearch')}
                          </GlassButton>
                          <GlassButton
                            variant="button"
                            size="sm"
                            onClick={() => {
                              setResearchToDelete(research);
                              setShowDeleteModal(true);
                            }}
                          >
                            {t('analyticsPage.delete')}
                          </GlassButton>
                        </div>
                      </div>
                      
                      <p className="text-sm text-gray-400 mb-2">
                        {research.content.substring(0, 150)}...
                      </p>
                      
                      <div className="text-xs text-gray-500">
                        {t('analyticsPage.createdAt')}: {new Date(research.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </GlassCard>
          </div>
        </div>

      {/* Edit Modal */}
      {showEditModal && currentResearch && (
        <GlassModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setEditingContent('');
          }}
          title={t('researchAssistant.editResearch')}
        >
          <div className="space-y-4">
            <textarea
              id="editContent"
              name="editContent"
              value={editingContent}
              onChange={(e) => setEditingContent(e.target.value)}
              rows={10}
              placeholder={t('researchAssistant.editContentPlaceholder')}
              className="w-full p-3 bg-white/10 dark:bg-gray-800/10 border border-white/20 dark:border-gray-700/20 rounded-lg backdrop-blur-md resize-none"
            />
            
            <div className="flex space-x-4">
              <GlassButton
                onClick={handleSaveEdit}
                className="flex-1"
              >
                {t('common.save')}
              </GlassButton>
              <GlassButton
                variant="button"
                onClick={() => {
                  setShowEditModal(false);
                  setEditingContent('');
                }}
                className="flex-1"
              >
                {t('common.cancel')}
              </GlassButton>
            </div>
          </div>
        </GlassModal>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && researchToDelete && (
        <GlassModal
          isOpen={showDeleteModal}
          onClose={() => {
            setShowDeleteModal(false);
            setResearchToDelete(null);
          }}
          title={t('researchAssistant.deleteResearch')}
        >
          <div className="space-y-4">
            <p>{t('researchAssistant.deleteConfirmation', { title: researchToDelete.title })}</p>
            
            <div className="flex space-x-4">
              <GlassButton
                variant="button"
                onClick={handleDeleteResearch}
                className="flex-1"
              >
                {t('common.delete')}
              </GlassButton>
              <GlassButton
                variant="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setResearchToDelete(null);
                }}
                className="flex-1"
              >
                {t('common.cancel')}
              </GlassButton>
            </div>
          </div>
        </GlassModal>
      )}
      </div>
    </StandardPageLayout>
  );
};

export default AnalyticsPage;
