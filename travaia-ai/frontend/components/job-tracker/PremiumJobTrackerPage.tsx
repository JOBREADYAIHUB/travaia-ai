import React, { useReducer, useCallback, useEffect, useState } from 'react';
import { EnhancedJobApplication, PaginationMeta } from '../../types';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { GlassButton, GlassModal } from '../design-system';
import { JobApplicationApiService } from '../../services/jobApplicationApiService';
import { LoadingState, ErrorState, EmptyState } from '../design-system';
import EnhancedJobList from './EnhancedJobList';

interface PremiumJobTrackerPageProps {
  navigate: (route: string) => void;
  setApplicationsForSelection: React.Dispatch<React.SetStateAction<EnhancedJobApplication[]>>;
}

interface State {
  applications: EnhancedJobApplication[];
  isLoadingData: boolean;
  dataError: string | null;
  currentPage: number;
  itemsPerPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  pagination: PaginationMeta | null;
}

type Action =
  | { type: 'FETCH_INIT' }
  | { type: 'FETCH_SUCCESS'; payload: { applications: EnhancedJobApplication[]; pagination: PaginationMeta } }
  | { type: 'FETCH_FAILURE'; payload: string }
  | { type: 'SET_PAGE'; payload: number };

const initialState: State = {
  applications: [],
  isLoadingData: true,
  dataError: null,
  currentPage: 1,
  itemsPerPage: 15,
  totalPages: 1,
  hasNextPage: false,
  hasPrevPage: false,
  pagination: null,
};

function jobTrackerReducer(state: State, action: Action): State {
  switch (action.type) {
    case 'FETCH_INIT':
      return { ...state, isLoadingData: true, dataError: null };
    case 'FETCH_SUCCESS': {
      const pagination = action.payload.pagination;
      return {
        ...state,
        isLoadingData: false,
        applications: action.payload.applications || [],
        pagination,
        totalPages: pagination?.total_pages || 1,
        hasNextPage: pagination?.has_next || false,
        hasPrevPage: pagination?.has_prev || false,
        currentPage: pagination?.page || 1,
      };
    }
    case 'FETCH_FAILURE':
      return { ...state, isLoadingData: false, dataError: action.payload, applications: [] };
    case 'SET_PAGE':
      return { ...state, currentPage: action.payload };
    default:
      return state;
  }
}

const PremiumJobTrackerPage: React.FC<PremiumJobTrackerPageProps> = ({
  navigate,
  setApplicationsForSelection,
}) => {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const [state, dispatch] = useReducer(jobTrackerReducer, initialState);
  const [isTipsModalOpen, setTipsModalOpen] = useState(false);
  const [aiTips, setAiTips] = useState<string[]>([]);
  const [isFetchingTips, setIsFetchingTips] = useState(false);
  const [tipsError, setTipsError] = useState<string | null>(null);

  const {
    applications, isLoadingData, dataError, currentPage,
    itemsPerPage, totalPages, hasNextPage, hasPrevPage
  } = state;

    const loadApplications = useCallback(async (pageToLoad: number) => {
    if (!currentUser?.uid) return;
    dispatch({ type: 'FETCH_INIT' });
    try {
      const data = await JobApplicationApiService.fetchEnhancedJobApplications(pageToLoad, itemsPerPage);
      dispatch({ type: 'FETCH_SUCCESS', payload: { applications: data.applications, pagination: data.pagination } });
      setApplicationsForSelection(data.applications);
    } catch (error: any) {
      console.error('Load applications error:', error);
      dispatch({ type: 'FETCH_FAILURE', payload: error.message || t('jobTracker.loadError') });
    }
  }, [currentUser?.uid, setApplicationsForSelection, t, itemsPerPage]);

  useEffect(() => {
    if (currentUser?.uid) {
      loadApplications(currentPage);
    }
  }, [loadApplications, currentPage, currentUser?.uid]);

    const handleEdit = (application: EnhancedJobApplication) => {
    console.log('Edit application:', application);
  };

  const handleDelete = (applicationId: string) => {
    console.log('Delete application:', applicationId);
  };

  const handleGetTips = useCallback(async (application: EnhancedJobApplication) => {
    if (!currentUser?.uid) {
      setTipsError('User profile is not available.');
      setTipsModalOpen(true);
      return;
    }

    if (!application.job_description) {
        setTipsError(t('jobTracker.noJobDescription'));
        setTipsModalOpen(true);
        return;
    }

    setIsFetchingTips(true);
    setTipsError(null);
    setAiTips([]);
    setTipsModalOpen(true);

    try {
      const response = await JobApplicationApiService.getJobAnalysis(
        currentUser,
        application.job_description,
        currentUser.uid
      );
      if (response.suggested_improvements && response.suggested_improvements.length > 0) {
        setAiTips(response.suggested_improvements);
      } else {
        setAiTips([]);
        setTipsError(t('jobTracker.noTipsAvailable'));
      }
    } catch (error: any) {
      console.error('Error fetching AI tips:', error);
      setTipsError(error.message || t('jobTracker.tipsError'));
    } finally {
      setIsFetchingTips(false);
    }
  }, [currentUser, t]);

    const handleViewDetails = (application: EnhancedJobApplication) => {
    console.log('View details for application:', application);
  };

  const handlePrevPage = () => {
    if (hasPrevPage) {
      dispatch({ type: 'SET_PAGE', payload: currentPage - 1 });
    }
  };

  const handleNextPage = () => {
    if (hasNextPage) {
      dispatch({ type: 'SET_PAGE', payload: currentPage + 1 });
    }
  };

  // Show authentication required state
  if (!currentUser?.uid) {
    return (
      <EmptyState 
        title="Authentication Required"
        message="Please log in to view your job applications"
        action={
          <GlassButton 
            variant="button"
            onClick={() => navigate('/login')}
          >
            Log In
          </GlassButton>
        }
      />
    );
  }

  if (isLoadingData) {
    return <LoadingState message={t('jobTracker.loading') || 'Loading applications...'} />;
  }

  if (dataError) {
    return (
      <ErrorState 
        message={dataError} 
        onRetry={() => loadApplications(currentPage)}
      />
    );
  }

  const renderModalContent = () => {
    if (isFetchingTips) {
      return <LoadingState message={t('jobTracker.fetchingTips') || 'Fetching AI tips...'} />;
    }
    if (tipsError) {
      return <ErrorState message={tipsError} onRetry={() => setTipsModalOpen(false)} />;
    }
    if (aiTips.length > 0) {
      return (
        <ul className="space-y-4">
          {aiTips.map((tip, index) => (
            <li key={index} className="p-4 bg-white/10 rounded-lg shadow-md">
              <p className="text-white">{tip}</p>
            </li>
          ))}
        </ul>
      );
    }
    return <EmptyState title={t('jobTracker.noTipsYet')} message={t('jobTracker.noTipsGenerated')} />;
  };

  if (applications.length === 0) {
    return (
      <EmptyState 
        title={t('jobTracker.noApplications') || 'No job applications found'}
        message={t('jobTracker.addFirstDescription') || 'Start tracking your job applications to see them here'}
        action={
          <GlassButton 
            onClick={() => navigate('/job-tracker/add')}
            variant="button"
          >
            {t('jobTracker.addFirst') || 'Add your first application'}
          </GlassButton>
        }
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            {t('jobTracker.title') || 'Job Applications'}
          </h1>
          <p className="text-white/70">
            {t('jobTracker.subtitle') || 'Track and manage your job applications'}
          </p>
        </div>

        <EnhancedJobList
          applications={applications}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onGetTips={handleGetTips}
          onViewDetails={handleViewDetails}
        />

        {totalPages > 1 && (
          <div className="flex justify-center items-center mt-8 space-x-4">
            <GlassButton 
              onClick={handlePrevPage} 
              disabled={!hasPrevPage || isLoadingData} 
              variant="button"
              size="sm"
            >
              {t('pagination.previous') || 'Previous'}
            </GlassButton>
            
            <span className="text-white/70 px-4">
              {t('pagination.pageOf', { current: currentPage, total: totalPages }) || 
                `Page ${currentPage} of ${totalPages}`}
            </span>
            
            <GlassButton 
              onClick={handleNextPage} 
              disabled={!hasNextPage || isLoadingData} 
              variant="button"
              size="sm"
            >
              {t('pagination.next') || 'Next'}
            </GlassButton>
          </div>
        )}
      </div>

      <GlassModal
        isOpen={isTipsModalOpen}
        onClose={() => setTipsModalOpen(false)}
        title={t('jobTracker.aiTipsTitle') || 'AI-Powered Application Tips'}
      >
        {renderModalContent()}
      </GlassModal>

    </div>
  );
};

export default PremiumJobTrackerPage;