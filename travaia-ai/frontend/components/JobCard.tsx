import React, { useState } from 'react';
import { JobApplication, ApplicationStatus } from '../types';
import { useLocalization } from '../contexts/LocalizationContext'; // Changed
import { GlassButton } from './design-system';
import {
  EditIcon,
  DeleteIcon,
  LightbulbIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  EyeIcon,
} from './icons/Icons';

interface JobCardProps {
  application: JobApplication;
  onEdit: (application: JobApplication) => void;
  onDelete: (id: string) => void;
  onGetTips: (application: JobApplication) => void;
  onViewDetails: (application: JobApplication) => void;
  className?: string;
}

const getStatusColorClasses = (status: ApplicationStatus | string): string => {
  switch (status) {
    case ApplicationStatus.Applied:
      return 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300';
    case ApplicationStatus.Interviewing:
    case ApplicationStatus.InterviewScheduled:
    case 'Interviewing':
      return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-300';
    case ApplicationStatus.OfferReceived:
    case 'Offer':
      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300';
    case ApplicationStatus.Rejected:
      return 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300';
    case ApplicationStatus.Draft:
    case 'Wishlist':
      return 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300';
    case ApplicationStatus.WaitingResponse:
    case 'On Hold':
      return 'bg-gray-200 text-gray-700 dark:bg-slate-600/30 dark:text-slate-300';
    default:
      return 'bg-gray-200 text-gray-700 dark:bg-slate-500/30 dark:text-slate-400';
  }
};

const JobCard: React.FC<JobCardProps> = ({
  application,
  onEdit,
  onDelete,
  onGetTips,
  onViewDetails,
  className,
}) => {
  const { translate, language } = useLocalization();
  // Determine RTL based on language code since direction isn't directly provided by context
  const isRtl = language === 'ar';
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div
      className={`bg-base_100 dark:bg-dark_card_bg rounded-xl shadow-lg p-4 sm:p-5 md:p-6 transition-all duration-300 ease-in-out hover:shadow-2xl dark:hover:shadow-neutral-900/60 hover:-translate-y-1 flex flex-col justify-between border border-base_300 dark:border-neutral-700/80 opacity-80 ${isRtl ? 'text-right' : 'text-left'} ${className || ''}`}
    >
      <div>
        <div
          className={`flex justify-between items-start mb-3 ${isRtl ? 'flex-row-reverse' : ''}`}
        >
          <div>
            <h3
              className="text-xl font-semibold text-primary dark:text-blue-400 cursor-pointer hover:underline hover:text-secondary dark:hover:text-orange-400 transition-colors"
              onClick={() => onViewDetails(application)}
            >
              {application.role.title}
            </h3>
            <p className="text-neutral dark:text-gray-300 text-base sm:text-md">
              {application.company.name}
            </p>
          </div>
          <span
            className={`px-3 py-1.5 sm:px-2.5 sm:py-1 text-sm sm:text-xs font-medium rounded-full ${getStatusColorClasses(application.status)}`}
          >
            {translate(`jobApplication.status.${application.status.toLowerCase()}`)}
          </span>
        </div>

        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2 mt-2">
          {translate('jobApplication.applicationDate')}:{' '}
          {application.keyDates && application.keyDates.submissionDate
            ? new Date(application.keyDates.submissionDate).toLocaleDateString(language)
            : application.createdAt
              ? new Date(application.createdAt.toDate()).toLocaleDateString(language)
              : translate('jobApplication.notAvailable')}
        </p>
        {application.location && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
            {' '}
            {translate('jobApplication.location')}: {application.location}
          </p>
        )}

        {isExpanded && (
          <div className="mt-4 space-y-4 text-sm text-neutral dark:text-gray-300 animate-fadeIn">
            {/* Job URL */}
            {application.url && (
              <div>
                <strong className="block mb-1">{translate('jobApplication.url')}:</strong>
                <a
                  href={application.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary dark:text-blue-400 hover:underline break-all"
                >
                  {application.url}
                </a>
              </div>
            )}
            
            {/* Salary Information */}
            {application.salary && (
              <div>
                <strong className="block mb-1">{translate('jobApplication.salary')}:</strong>
                <p className="bg-gray-50 dark:bg-dark_input_bg p-2 rounded-md text-gray-700 dark:text-gray-300">
                  {typeof application.salary === 'object' && application.salary !== null
                    ? `${application.salary.currency || '$'}${application.salary.min || 0} - ${application.salary.currency || '$'}${application.salary.max || 0} ${application.salary.currency === '$' ? 'USD' : ''}`
                    : application.salary}
                </p>
              </div>
            )}
            
            {/* Key Dates */}
            {application.keyDates && (
              <div>
                <strong className="block mb-1">{translate('jobApplication.keyDates')}:</strong>
                <div className="bg-gray-50 dark:bg-dark_input_bg p-2 rounded-md text-gray-700 dark:text-gray-300">
                  {application.keyDates.submissionDate && (
                    <p>
                      <span className="font-medium">{translate('jobApplication.submissionDate')}:</span>{' '}
                      {new Date(application.keyDates.submissionDate).toLocaleDateString(language)}
                    </p>
                  )}
                  {application.keyDates.interviewDates && application.keyDates.interviewDates.length > 0 && (
                    <p>
                      <span className="font-medium">{translate('jobApplication.interviewDates')}:</span>{' '}
                      {application.keyDates.interviewDates.map(date => 
                        new Date(date).toLocaleDateString(language)).join(', ')}
                    </p>
                  )}
                  {application.keyDates.offerExpiryDate && (
                    <p>
                      <span className="font-medium">{translate('jobApplication.offerExpiryDate')}:</span>{' '}
                      {new Date(application.keyDates.offerExpiryDate).toLocaleDateString(language)}
                    </p>
                  )}
                </div>
              </div>
            )}
            
            {/* Notes */}
            {application.notes && (
              <div>
                <strong className="block mb-1">{translate('jobApplication.noteTitle')}:</strong>
                <div className="bg-gray-50 dark:bg-dark_input_bg p-2 rounded-md text-gray-700 dark:text-gray-300">
                  {typeof application.notes === 'string' ? (
                    <p className="whitespace-pre-wrap">{application.notes}</p>
                  ) : (
                    <>
                      {application.notes.personalNotes && (
                        <div className="mb-2">
                          <span className="font-medium">{translate('jobApplication.personalNotes')}:</span>
                          <p className="whitespace-pre-wrap mt-1">{application.notes.personalNotes}</p>
                        </div>
                      )}
                      {application.notes.recruiterFeedback && (
                        <div className="mb-2">
                          <span className="font-medium">{translate('jobApplication.recruiterFeedback')}:</span>
                          <p className="whitespace-pre-wrap mt-1">{application.notes.recruiterFeedback}</p>
                        </div>
                      )}
                      {application.notes.interviewerComments && (
                        <div>
                          <span className="font-medium">{translate('jobApplication.interviewerComments')}:</span>
                          <p className="whitespace-pre-wrap mt-1">{application.notes.interviewerComments}</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
            
            {/* Role Details */}
            {application.role && (
              <div>
                <strong className="block mb-1">{translate('jobApplication.roleDetails')}:</strong>
                <div className="whitespace-pre-wrap bg-gray-50 dark:bg-dark_input_bg p-2 rounded-md text-gray-700 dark:text-gray-300 max-h-40 overflow-y-auto">
                  <p>
                    <span className="font-medium">{translate('jobApplication.title')}:</span> {application.role.title}
                  </p>
                  {application.role.jobType && (
                    <p>
                      <span className="font-medium">{translate('jobApplication.jobType')}:</span> {application.role.jobType}
                    </p>
                  )}
                  {application.role.employmentMode && (
                    <p>
                      <span className="font-medium">{translate('jobApplication.employmentMode')}:</span> {application.role.employmentMode}
                    </p>
                  )}
                  {application.role.jobId && (
                    <p>
                      <span className="font-medium">{translate('jobApplication.jobId')}:</span> {application.role.jobId}
                    </p>
                  )}
                </div>
              </div>
            )}
            
            {/* Company Details */}
            {application.company && (
              <div>
                <strong className="block mb-1">{translate('jobApplication.companyDetails')}:</strong>
                <div className="whitespace-pre-wrap bg-gray-50 dark:bg-dark_input_bg p-2 rounded-md text-gray-700 dark:text-gray-300">
                  {application.company.department && (
                    <p>
                      <span className="font-medium">{translate('jobApplication.department')}:</span> {application.company.department}
                    </p>
                  )}
                  {application.company.industry && (
                    <p>
                      <span className="font-medium">{translate('jobApplication.industry')}:</span> {application.company.industry}
                    </p>
                  )}
                  {application.company.sizeType && (
                    <p>
                      <span className="font-medium">{translate('jobApplication.companySize')}:</span> {application.company.sizeType}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-base_200 dark:border-neutral-700">
        <div
          className={`flex items-center justify-between ${isRtl ? 'flex-row-reverse' : ''}`}
        >
          <GlassButton
            onClick={() => setIsExpanded(!isExpanded)}
            variant="button"
            size="sm"
            className={`text-primary dark:text-blue-400 ${isRtl ? 'flex-row-reverse' : ''}`}
            aria-expanded={isExpanded}
            aria-controls={`job-card-details-${application.id}`}
          >
            {isExpanded ? translate('jobApplication.showLess') : translate('jobApplication.showMore')}
            {isExpanded ? (
              <ChevronUpIcon className="w-4 h-4 sm:w-3.5 sm:h-3.5 ml-1" />
            ) : (
              <ChevronDownIcon className="w-4 h-4 sm:w-3.5 sm:h-3.5 ml-1" />
            )}
          </GlassButton>
          <div
            className={`flex ${isRtl ? 'space-x-reverse space-x-2' : 'space-x-2'}`}
          >
            <GlassButton
              onClick={() => onViewDetails(application)}
              variant="button"
              size="sm"
              className="text-blue-500 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-500/20"
              title={translate('viewDetails')}
              aria-label={`${translate('viewDetails')} for ${application.role?.title || ''}`}
            >
              <EyeIcon className="w-5 h-5 sm:w-4 sm:h-4" />
            </GlassButton>
            <GlassButton
              onClick={() => onGetTips(application)}
              variant="button"
              size="sm"
              className="text-accent dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-500/20"
              title={translate('getAITips')}
              aria-label={`${translate('getAITips')} for ${application.role?.title || ''}`}
            >
              <LightbulbIcon className="w-5 h-5 sm:w-4 sm:h-4" />
            </GlassButton>
            <GlassButton
              onClick={() => onEdit(application)}
              variant="button"
              size="sm"
              className="text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-500/20"
              title={translate('edit')}
              aria-label={`${translate('edit')} ${application.role?.title || ''}`}
            >
              <EditIcon className="w-5 h-5 sm:w-4 sm:h-4" />
            </GlassButton>
            <GlassButton
              onClick={() => onDelete(application.id)}
              variant="button"
              size="sm"
              className="text-red-500 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20"
              title={translate('delete')}
              aria-label={`${translate('delete')} ${application.role?.title || ''}`}
            >
              <DeleteIcon className="w-5 h-5 sm:w-4 sm:h-4" />
            </GlassButton>
          </div>
        </div>
        <div id={`job-card-details-${application.id}`} className="sr-only">
          {translate('cardDetails')}: {application.role?.title || ''} at{' '}
          {application.company?.name || ''}. Status {application.status}. Applied on{' '}
          {application.keyDates?.submissionDate ? new Date(application.keyDates.submissionDate).toLocaleDateString(language) : application.createdAt ? new Date(application.createdAt.toDate()).toLocaleDateString(language) : translate('notAvailable')}.
          {application.notes && (
            application.notes.personalNotes ? 
            ` Notes: ${application.notes.personalNotes.substring(0, 50)}${application.notes.personalNotes.length > 50 ? '...' : ''}` : 
            application.notes.recruiterFeedback ? 
            ` Recruiter feedback: ${application.notes.recruiterFeedback.substring(0, 50)}${application.notes.recruiterFeedback.length > 50 ? '...' : ''}` : 
            application.notes.interviewerComments ? 
            ` Interviewer comments: ${application.notes.interviewerComments.substring(0, 50)}${application.notes.interviewerComments.length > 50 ? '...' : ''}` : 
            ''
          )}
        </div>
      </div>
    </div>
  );
};

export default JobCard;
