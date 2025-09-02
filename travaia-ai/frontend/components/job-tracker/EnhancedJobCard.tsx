import React, { useState } from 'react';
import { EnhancedJobApplication, SalaryRange } from '../../types';
import { useLocalization } from '../../contexts/LocalizationContext';

interface EnhancedJobCardProps {
  application: EnhancedJobApplication;
  onEdit: (application: EnhancedJobApplication) => void;
  onDelete: (applicationId: string) => void;
  onGetTips: (application: EnhancedJobApplication) => void;
  onViewDetails: (application: EnhancedJobApplication) => void;
  className?: string;
}

const formatSalary = (salaryRange?: SalaryRange): string => {
  if (!salaryRange || (!salaryRange.min_amount && !salaryRange.max_amount)) {
    return '';
  }
  const min = salaryRange.min_amount ? `$${(salaryRange.min_amount / 1000).toFixed(0)}k` : '';
  const max = salaryRange.max_amount ? `$${(salaryRange.max_amount / 1000).toFixed(0)}k` : '';
  if (min && max) {
    return `${min} - ${max}`;
  }
  return min || max;
};

const getStatusColorClasses = (status: string): string => {
  switch (status?.toLowerCase()) {
    case 'applied':
      return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
    case 'interviewing':
      return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
    case 'offer':
      return 'bg-green-500/20 text-green-300 border-green-500/30';
    case 'rejected':
      return 'bg-red-500/20 text-red-300 border-red-500/30';
    case 'withdrawn':
      return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    default:
      return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
  }
};

const EnhancedJobCard: React.FC<EnhancedJobCardProps> = ({
  application,
  onEdit,
  onDelete,
  onGetTips,
  onViewDetails,
  className = '',
}) => {
  const { translate } = useLocalization();
  const [showActions, setShowActions] = useState(false);

  const handleCardClick = (e: React.MouseEvent) => {
    // Prevent card click when clicking on action buttons
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }
      onViewDetails(application);
  };

  const formatDate = (dateString: string | undefined): string => {
    if (!dateString) return translate('notSpecified') || 'Not specified';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return translate('invalidDate') || 'Invalid date';
    }
  };

  const { job_title, company_name, location, status, application_date, salary_range, job_type, remote_policy, priority_score } = application;
  const formattedDate = formatDate(application_date);
  const formattedSalary = formatSalary(salary_range);

  return (
    <div
      className={`relative bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6 cursor-pointer transition-all duration-300 hover:bg-white/10 hover:border-white/20 hover:shadow-lg ${className}`}
      onClick={handleCardClick}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Status Badge */}
      <div className={`absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-medium border ${getStatusColorClasses(status)}`}>
        {translate(`status.${status}`) || status}
      </div>

      {/* Priority Score */}
      {priority_score && (
        <div className="absolute top-4 left-4 flex items-center text-yellow-300 font-bold text-sm">
          <span className="mr-1">⭐</span>
          <span>{priority_score.toFixed(1)}</span>
        </div>
      )}

      {/* Job Title & Company */}
      <div className="mt-8 mb-4">
        <h3 className="text-lg font-semibold text-white mb-1 pr-20 truncate" title={job_title}>{job_title || translate('untitledPosition')}</h3>
        <p className="text-white/70 font-medium truncate" title={company_name}>{company_name || translate('unknownCompany')}</p>
      </div>

      {/* Job Details */}
      <div className="space-y-2 mb-4 text-sm text-white/70">
        {location && <div className="flex items-center"><span className="mr-2 w-4">📍</span><span className="truncate" title={location}>{location}</span></div>}
        {formattedSalary && <div className="flex items-center"><span className="mr-2 w-4">💰</span><span>{formattedSalary}</span></div>}
        {job_type && <div className="flex items-center"><span className="mr-2 w-4">💼</span><span>{job_type}</span></div>}
        {remote_policy && <div className="flex items-center"><span className="mr-2 w-4">🏠</span><span>{remote_policy}</span></div>}
        <div className="flex items-center"><span className="mr-2 w-4">📅</span><span>{translate('appliedOn') || 'Applied on'}: {formattedDate}</span></div>
      </div>

      {/* Action Buttons */}
      {showActions && (
        <div className="absolute bottom-4 right-4 flex space-x-2">
          <button
            className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/30 rounded-lg p-2 transition-all duration-200"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(application);
            }}
            title={translate('edit') || 'Edit'}
          >
            ✏️
          </button>
          
          <button
            className="bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 border border-yellow-500/30 rounded-lg p-2 transition-all duration-200"
            onClick={(e) => {
              e.stopPropagation();
              onGetTips(application);
            }}
            title={translate('getTips') || 'Get AI Tips'}
          >
            💡
          </button>
          
          <button
            className="bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 rounded-lg p-2 transition-all duration-200"
            onClick={(e) => {
              e.stopPropagation();
              if (window.confirm(translate('confirmDelete') || 'Are you sure you want to delete this application?')) {
                onDelete(application.application_id);
              }
            }}
            title={translate('delete') || 'Delete'}
          >
            🗑️
          </button>
        </div>
      )}
    </div>
  );
};

export default EnhancedJobCard;
