import React from 'react';
import { JobApplication } from '../types';
import JobCard from './JobCard';
import { useLocalization } from '../contexts/LocalizationContext'; // Changed

interface JobListProps {
  applications: JobApplication[];
  onEdit: (application: JobApplication) => void;
  onDelete: (id: string) => void;
  onGetTips: (application: JobApplication) => void;
  onViewDetails: (application: JobApplication) => void;
}

const JobList: React.FC<JobListProps> = ({
  applications,
  onEdit,
  onDelete,
  onGetTips,
  onViewDetails,
}) => {
  const { translate } = useLocalization(); // Changed

  if (applications.length === 0) {
    return (
      <p className="text-center text-neutral text-lg py-10">
        {translate('noApplications')}
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {applications.map((app) => (
        <JobCard
          key={app.id}
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

export default JobList;
