import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BuildingOfficeIcon,
  MapPinIcon,
  CurrencyDollarIcon,
  CalendarIcon,
  UserIcon,
  PhoneIcon,
  EnvelopeIcon,
  LinkIcon,
  DocumentTextIcon,
  PaperClipIcon,
  StarIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  PencilIcon,
  TrashIcon,
  ShareIcon,
  BookmarkIcon,
  ChartBarIcon,
  BriefcaseIcon,
  
  GlobeAltIcon
  // HeartIcon - Removed unused import
} from '@heroicons/react/24/outline';
import {
  StarIcon as StarIconSolid,
  BookmarkIcon as BookmarkIconSolid,

} from '@heroicons/react/24/solid';
import { JobApplication } from '../../types';
import { GlassCard, GlassButton } from '../design-system';
import styles from './JobDetails.module.css';

interface EnhancedJobDetailsProps {
  application: JobApplication;
  onEdit: () => void;
  onDelete: () => void;
  onStatusChange: (newStatus: string) => void;
  onToggleFavorite?: () => void;
  onToggleBookmark?: () => void;
  onShare?: () => void;
  loading?: boolean;
}

const EnhancedJobDetails: React.FC<EnhancedJobDetailsProps> = ({
  application,
  onEdit,
  onDelete,
  onToggleFavorite,
  onToggleBookmark,
  onShare,
  loading = false
}) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('overview');

  const statusConfig = {
    applied: { 
      color: 'text-blue-700 dark:text-blue-300', 
      bg: 'bg-blue-100 dark:bg-blue-900/30',
      border: 'border-blue-200 dark:border-blue-700',
      icon: InformationCircleIcon
    },
    screening: { 
      color: 'text-yellow-700 dark:text-yellow-300', 
      bg: 'bg-yellow-100 dark:bg-yellow-900/30',
      border: 'border-yellow-200 dark:border-yellow-700',
      icon: ClockIcon
    },
    interview: { 
      color: 'text-purple-700 dark:text-purple-300', 
      bg: 'bg-purple-100 dark:bg-purple-900/30',
      border: 'border-purple-200 dark:border-purple-700',
      icon: UserIcon
    },
    offer: { 
      color: 'text-green-700 dark:text-green-300', 
      bg: 'bg-green-100 dark:bg-green-900/30',
      border: 'border-green-200 dark:border-green-700',
      icon: CheckCircleIcon
    },
    rejected: { 
      color: 'text-red-700 dark:text-red-300', 
      bg: 'bg-red-100 dark:bg-red-900/30',
      border: 'border-red-200 dark:border-red-700',
      icon: XCircleIcon
    },
    withdrawn: { 
      color: 'text-gray-700 dark:text-gray-300', 
      bg: 'bg-gray-100 dark:bg-gray-900/30',
      border: 'border-gray-200 dark:border-gray-700',
      icon: ExclamationTriangleIcon
    }
  };

  const currentStatus = statusConfig[(application.status as unknown) as keyof typeof statusConfig] || statusConfig.applied;
  const StatusIcon = currentStatus.icon;

  const formatSalary = (salary?: { min?: number; max?: number; currency?: string }) => {
    if (!salary?.min) return null;
    const currency = salary.currency || 'USD';
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
    
    if (salary.max && salary.max !== salary.min) {
      return `${formatter.format(salary.min)} - ${formatter.format(salary.max)}`;
    }
    return formatter.format(salary.min);
  };

  const formatDate = (date: any) => {
    if (!date) return null;
    const dateObj = date.toDate ? date.toDate() : new Date(date);
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(dateObj);
  };

  const formatDateShort = (date: any) => {
    if (!date) return null;
    const dateObj = date.toDate ? date.toDate() : new Date(date);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(dateObj);
  };

  const getTimelineEvents = () => {
    const events = [];
    
    if (application.keyDates?.submissionDate) {
      events.push({
        date: application.keyDates.submissionDate,
        type: 'applied',
        title: t('jobTracker.details.timeline.applied'),
        icon: DocumentTextIcon,
        color: 'text-blue-600 dark:text-blue-400'
      });
    }
    
    // Check if there are interview dates and use the first one for screening
    if (application.keyDates?.interviewDates && application.keyDates.interviewDates.length > 0) {
      events.push({
        date: application.keyDates.interviewDates[0],
        type: 'screening',
        title: t('jobTracker.details.timeline.screening'),
        icon: ClockIcon,
        color: 'text-yellow-600 dark:text-yellow-400'
      });
    }
    
    // Check if there are multiple interview dates and use the last one for the interview event
    if (application.keyDates?.interviewDates && application.keyDates.interviewDates.length > 1) {
      events.push({
        date: application.keyDates.interviewDates[application.keyDates.interviewDates.length - 1],
        type: 'interview',
        title: t('jobTracker.details.timeline.interview'),
        icon: UserIcon,
        color: 'text-purple-600 dark:text-purple-400'
      });
    }
    
    if (application.keyDates?.offerExpiryDate) {
      events.push({
        date: application.keyDates.offerExpiryDate,
        type: 'offer',
        title: t('jobTracker.details.timeline.offer'),
        icon: CheckCircleIcon,
        color: 'text-green-600 dark:text-green-400'
      });
    }
    
    return events.sort((a, b) => {
      // Handle different date formats by safely creating Date objects
      let aDate: Date;
      let bDate: Date;
      
      try {
        // First try to convert to Date directly
        aDate = new Date(a.date);
      } catch (e) {
        // Fallback to current date if parsing fails
        console.error('Invalid date format in timeline:', a.date);
        aDate = new Date();
      }
      
      try {
        bDate = new Date(b.date);
      } catch (e) {
        console.error('Invalid date format in timeline:', b.date);
        bDate = new Date();
      }
      
      return aDate.getTime() - bDate.getTime();
    });
  };


  const tabs = [
    { id: 'overview', label: t('jobTracker.details.tabs.overview'), icon: InformationCircleIcon },
    { id: 'company', label: t('jobTracker.details.tabs.company'), icon: BuildingOfficeIcon },
    { id: 'timeline', label: t('jobTracker.details.tabs.timeline'), icon: ClockIcon },
    { id: 'documents', label: t('jobTracker.details.tabs.documents'), icon: DocumentTextIcon },
    { id: 'notes', label: t('jobTracker.details.tabs.notes'), icon: PencilIcon }
  ];

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner} />
        <p className={styles.loadingText}>{t('jobTracker.details.loading')}</p>
      </div>
    );
  }

  return (
    <div className={styles.detailsContainer}>
      {/* Header */}
      <div className={styles.detailsHeader}>
        <div className={styles.headerContent}>
          <div className={styles.companySection}>
            {(application.company as any)?.logo ? (
              <img
                src={(application.company as any).logo}
                alt={`${application.company.name} logo`}
                className={styles.companyLogo}
              />
            ) : (
              <div className={styles.companyLogoPlaceholder}>
                <BuildingOfficeIcon className="w-8 h-8" />
              </div>
            )}
            <div className={styles.companyInfo}>
              <h1 className={styles.companyName}>
                {application.company?.name || t('jobTracker.details.unknownCompany')}
              </h1>
              <h2 className={styles.roleTitle}>
                {application.role?.title || t('jobTracker.details.unknownRole')}
              </h2>
              {/* Display department info from role metadata or jobType if available */}
              {(application.role?.jobType || application.role?.employmentMode) && (
                <p className={styles.roleDepartment}>
                  {application.role.jobType && <span>{application.role.jobType}</span>}
                  {application.role.jobType && application.role.employmentMode && <span> · </span>}
                  {application.role.employmentMode && <span>{application.role.employmentMode}</span>}
                </p>
              )}
            </div>
          </div>
          
          <div className={styles.headerActions}>
            <div className={styles.statusBadge}>
              <StatusIcon className={`w-5 h-5 ${currentStatus.color}`} />
              <span className={`${styles.statusText} ${currentStatus.color} ${currentStatus.bg} ${currentStatus.border}`}>
                {t(`jobTracker.status.${application.status}`)}
              </span>
            </div>
            
            <div className={styles.actionButtons}>
              <GlassButton
                variant="button"
                size="sm"
                onClick={onToggleFavorite}
                className={styles.favoriteButton}
                aria-label={t('jobTracker.details.toggleFavorite')}
              >
                {(application as any).isFavorite ? (
                  <StarIconSolid className="w-5 h-5 text-yellow-500" />
                ) : (
                  <StarIcon className="w-5 h-5" />
                )}
              </GlassButton>
              
              <GlassButton
                variant="button"
                size="sm"
                onClick={onToggleBookmark}
                className={styles.bookmarkButton}
                aria-label={t('jobTracker.details.toggleBookmark')}
              >
                {(application as any).isBookmarked ? (
                  <BookmarkIconSolid className="w-5 h-5 text-indigo-500" />
                ) : (
                  <BookmarkIcon className="w-5 h-5" />
                )}
              </GlassButton>
              
              <GlassButton
                variant="button"
                size="sm"
                onClick={onShare}
                className={styles.shareButton}
                aria-label={t('jobTracker.details.share')}
              >
                <ShareIcon className="w-5 h-5" />
              </GlassButton>
              
              <GlassButton
                variant="button"
                size="sm"
                onClick={onEdit}
                className={styles.editButton}
              >
                <PencilIcon className="w-4 h-4" />
                {t('jobTracker.details.edit')}
              </GlassButton>
              
              <GlassButton
                variant="button"
                size="sm"
                onClick={onDelete}
                className={styles.deleteButton}
              >
                <TrashIcon className="w-4 h-4" />
                {t('jobTracker.details.delete')}
              </GlassButton>
            </div>variant
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className={styles.quickStats}>
        <GlassCard className={styles.statsGrid}>
          {formatSalary((application.role as any)?.salary) && (
            <div className={styles.statItem}>
              <CurrencyDollarIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
              <div className={styles.statContent}>
                <span className={styles.statLabel}>{t('jobTracker.details.salary')}</span>
                <span className={styles.statValue}>{formatSalary((application.role as any)?.salary)}</span>
              </div>
            </div>
          )}
          
          {(application.role as any)?.location && (
            <div className={styles.statItem}>
              <MapPinIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <div className={styles.statContent}>
                <span className={styles.statLabel}>{t('jobTracker.details.location')}</span>
                <span className={styles.statValue}>
                  {/* Location isn't in the role type, so we use a placeholder */}
                  {t('jobTracker.details.unknownLocation')}
                  {/* Display remote badge if employment mode indicates remote */}
                  {application.role.employmentMode === 'Remote' && (
                    <span className={styles.remoteBadge}>
                      {t('jobTracker.details.remote')}
                    </span>
                  )}
                </span>
              </div>
            </div>
          )}
          
          {application.keyDates?.submissionDate && (
            <div className={styles.statItem}>
              <CalendarIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              <div className={styles.statContent}>
                <span className={styles.statLabel}>{t('jobTracker.details.applied')}</span>
                <span className={styles.statValue}>{formatDateShort(application.keyDates.submissionDate)}</span>
              </div>
            </div>
          )}
          
          {(application as any).recruiter?.name && (
            <div className={styles.statItem}>
              <UserIcon className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              <div className={styles.statContent}>
                <span className={styles.statLabel}>{t('jobTracker.details.recruiter')}</span>
                <span className={styles.statValue}>{(application as any).recruiter.name}</span>
              </div>
            </div>
          )}
        </GlassCard>
      </div>

      {/* Tab Navigation */}
      <div className={styles.tabNavigation}>
        {tabs.map((tab) => {
          const TabIcon = tab.icon;
          return (
            <button
              key={tab.id}
              className={`${styles.tabButton} ${activeTab === tab.id ? styles.activeTab : ''}`}
              onClick={() => setActiveTab(tab.id)}
              aria-label={tab.label}
            >
              <TabIcon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className={styles.tabContent}>
        {activeTab === 'overview' && (
          <div className={styles.overviewTab}>
            <GlassCard className={styles.overviewCard}>
              <h3 className={styles.sectionTitle}>{t('jobTracker.details.jobDescription')}</h3>
              <div className={styles.jobDescription}>
                {(application.role as any)?.description ? (
                  <p className={styles.descriptionText}>{(application.role as any).description}</p>
                ) : (
                  <p className={styles.noData}>{t('jobTracker.details.noDescription')}</p>
                )}
              </div>
              
              {(application.role as any)?.requirements && (application.role as any).requirements.length > 0 && (
                <div className={styles.requirements}>
                  <h4 className={styles.subsectionTitle}>{t('jobTracker.details.requirements')}</h4>
                  <ul className={styles.requirementsList}>
                    {(application.role as any).requirements.map((req: string, index: number) => (
                      <li key={index} className={styles.requirementItem}>
                        <CheckCircleIcon className="w-4 h-4 text-green-600 dark:text-green-400" />
                        <span>{req}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {/* Benefits section - commented out due to type mismatch */}
              {/* If you need to display benefits, update the JobApplication type to include benefits */}
              {/* 
              {application.role?.benefits && application.role.benefits.length > 0 && (
                <div className={styles.benefits}>
                  <h4 className={styles.subsectionTitle}>{t('jobTracker.details.benefits')}</h4>
                  <ul className={styles.benefitsList}>
                    {application.role.benefits.map((benefit, index) => (
                      <li key={index} className={styles.benefitItem}>
                        <HeartIcon className="w-4 h-4 text-pink-600 dark:text-pink-400" />
                        <span>{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              */}
            </GlassCard>
          </div>
        )}

        {activeTab === 'company' && (
          <div className={styles.companyTab}>
            <GlassCard className={styles.companyCard}>
              <div className={styles.companyHeader}>
                <div className={styles.companyBasicInfo}>
                  <h3 className={styles.sectionTitle}>{t('jobTracker.details.companyInfo')}</h3>
                  <div className={styles.companyDetails}>
                    {application.company?.website && (
                      <a
                        href={application.company.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.companyWebsite}
                      >
                        <GlobeAltIcon className="w-4 h-4" />
                        {t('jobTracker.details.visitWebsite')}
                        <LinkIcon className="w-3 h-3" />
                      </a>
                    )}
                    
                    {(application.company as any)?.size && (
                      <div className={styles.companyMetric}>
                        <BriefcaseIcon className="w-4 h-4" />
                        <span>{t('jobTracker.details.companySize')}: {(application.company as any).size}</span>
                      </div>
                    )}
                    
                    {application.company?.industry && (
                      <div className={styles.companyMetric}>
                        <ChartBarIcon className="w-4 h-4" />
                        <span>{t('jobTracker.details.industry')}: {application.company.industry}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {(application.company as any)?.description && (
                <div className={styles.companyDescription}>
                  <h4 className={styles.subsectionTitle}>{t('jobTracker.details.aboutCompany')}</h4>
                  <p className={styles.descriptionText}>{(application.company as any).description}</p>
                </div>
              )}
              
              {/* Recruiter section - adding type guard to fix TypeScript error */}
              {(application as any).recruiter && 'name' in (application as any).recruiter && (
                <div className={styles.recruiterInfo}>
                  <h4 className={styles.subsectionTitle}>{t('jobTracker.details.recruiterContact')}</h4>
                  <div className={styles.recruiterCard}>
                    <div className={styles.recruiterDetails}>
                      <h5 className={styles.recruiterName}>{(application as any).recruiter.name}</h5>
                      {(application as any).recruiter.title && (
                        <p className={styles.recruiterTitle}>{(application as any).recruiter.title}</p>
                      )}
                      <div className={styles.recruiterContact}>
                        {(application as any).recruiter.email && (
                          <a
                            href={`mailto:${(application as any).recruiter.email}`}
                            className={styles.contactLink}
                          >
                            <EnvelopeIcon className="w-4 h-4" />
                            {(application as any).recruiter.email}
                          </a>
                        )}
                        {(application as any).recruiter.phone && (
                          <a
                            href={`tel:${(application as any).recruiter.phone}`}
                            className={styles.contactLink}
                          >
                            <PhoneIcon className="w-4 h-4" />
                            {(application as any).recruiter.phone}
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </GlassCard>
          </div>
        )}

        {activeTab === 'timeline' && (
          <div className={styles.timelineTab}>
            <GlassCard className={styles.timelineCard}>
              <h3 className={styles.sectionTitle}>{t('jobTracker.details.applicationTimeline')}</h3>
              <div className={styles.timeline}>
                {getTimelineEvents().map((event, index) => {
                  const EventIcon = event.icon;
                  return (
                    <div key={index} className={styles.timelineEvent}>
                      <div className={styles.timelineMarker}>
                        <EventIcon className={`w-5 h-5 ${event.color}`} />
                      </div>
                      <div className={styles.timelineContent}>
                        <h4 className={styles.timelineTitle}>{event.title}</h4>
                        <p className={styles.timelineDate}>{formatDate(event.date)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </GlassCard>
          </div>
        )}

        {activeTab === 'documents' && (
          <div className={styles.documentsTab}>
            <GlassCard className={styles.documentsCard}>
              <h3 className={styles.sectionTitle}>{t('jobTracker.details.attachedDocuments')}</h3>
              {(application as any).attachments && (application as any).attachments.length > 0 ? (
                <div className={styles.documentsList}>
                  {(application as any).attachments.map((doc: { name: string; size: string | number }, index: number) => (
                    <div key={index} className={styles.documentItem}>
                      <DocumentTextIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      <div className={styles.documentInfo}>
                        <span className={styles.documentName}>{doc.name}</span>
                        <span className={styles.documentSize}>{doc.size}</span>
                      </div>
                      <GlassButton
                        variant="button"
                        size="sm"
                        className={styles.documentAction}
                        aria-label={t('jobTracker.details.downloadDocument')}
                      >
                        <LinkIcon className="w-4 h-4" />
                      </GlassButton>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={styles.noDocuments}>
                  <PaperClipIcon className="w-12 h-12 text-gray-300 dark:text-gray-600" />
                  <p className={styles.noData}>{t('jobTracker.details.noDocuments')}</p>
                  <GlassButton
                    variant="button"
                    size="sm"
                    className={styles.addDocumentButton}
                  >
                    <PaperClipIcon className="w-4 h-4" />
                    {t('jobTracker.details.addDocument')}
                  </GlassButton>
                </div>
              )}
            </GlassCard>
          </div>
        )}

        {activeTab === 'notes' && (
          <div className={styles.notesTab}>
            <GlassCard className={styles.notesCard}>
              <h3 className={styles.sectionTitle}>{t('jobTracker.details.personalNotes')}</h3>
              {(application as any).notes?.personalNotes ? (
                <div className={styles.notesContent}>
                  <p className={styles.notesText}>{(application as any).notes.personalNotes}</p>
                  <GlassButton
                    variant="button"
                    size="sm"
                    onClick={onEdit}
                    className={styles.editNotesButton}
                  >
                    <PencilIcon className="w-4 h-4" />
                    {t('jobTracker.details.editNotes')}
                  </GlassButton>
                </div>
              ) : (
                <div className={styles.noNotes}>
                  <PencilIcon className="w-12 h-12 text-gray-300 dark:text-gray-600" />
                  <p className={styles.noData}>{t('jobTracker.details.noNotes')}</p>
                  <GlassButton
                    variant="button"
                    size="sm"
                    onClick={onEdit}
                    className={styles.addNotesButton}
                  >
                    <PencilIcon className="w-4 h-4" />
                    {t('jobTracker.details.addNotes')}
                  </GlassButton>
                </div>
              )}
            </GlassCard>
          </div>
        )}
      </div>
    </div>
  );
};

export default EnhancedJobDetails;
