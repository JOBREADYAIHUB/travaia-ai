import React from 'react';
import { EnhancedJobApplication } from '../../types';
import EnhancedJobCard from './EnhancedJobCard';
import { useLocalization } from '../../contexts/LocalizationContext';
import styles from './JobTracker.module.css';

interface EnhancedJobListProps {
  applications: EnhancedJobApplication[];
  onEdit: (application: EnhancedJobApplication) => void;
  onDelete: (id: string) => void;
  onGetTips: (application: EnhancedJobApplication) => void;
  onViewDetails: (application: EnhancedJobApplication) => void;
}

const EnhancedJobList: React.FC<EnhancedJobListProps> = ({
  applications,
  onEdit,
  onDelete,
  onGetTips,
  onViewDetails,
}) => {
  const { translate } = useLocalization();

  if (applications.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="mb-4 opacity-60">
          <svg className="w-16 h-16 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2 2v-5m16 0h-2M4 13h2m13-8V9a2 2 0 01-2 2H9a2 2 0 01-2-2V5a2 2 0 012-2h8a2 2 0 012 2z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-300 mb-2">
          {translate('noApplications')}
        </h3>
        <p className="text-sm text-gray-400 max-w-md mx-auto">
          {translate('noApplicationsDescription') || 'Start tracking your job applications by clicking the "Add Application" button above.'}
        </p>
      </div>
    );
  }

  return (
    <div className={styles.jobCardsGrid}>
      {applications.map((app) => (
        <EnhancedJobCard
          key={app.application_id}
          application={app}
          onEdit={onEdit}
          onDelete={onDelete}
          onGetTips={onGetTips}
          onViewDetails={onViewDetails}
        />
      ))}
    </div>
  );
};

export default EnhancedJobList;
export { EnhancedJobList };
