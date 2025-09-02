import React, { useEffect, useState } from 'react';
import { JobApplication, ApplicationStatus } from '../../types';
import { useLocalization } from '../../contexts/LocalizationContext';
import { ClockIcon, BriefcaseIcon } from '../icons/Icons';
import { safeGet, formatTimestamp, getInitials } from '../../utils/dataUtils';
import styles from './JobTracker.module.css';

interface KanbanBoardProps {
  applications: JobApplication[];
  isLoading: boolean;
  error: string | null;
  onViewJobDetails: (app: JobApplication) => void;
  onEditApplication: (app: JobApplication) => void;
  onDeleteApplication: (id: string) => void;
  onDragEnd?: (result: any) => void; // For future drag-and-drop functionality
}

interface KanbanColumn {
  id: ApplicationStatus;
  title: string;
  applications: JobApplication[];
}

const KanbanBoard: React.FC<KanbanBoardProps> = ({
  applications,
  onViewJobDetails,
  onEditApplication,
  onDeleteApplication,
  isLoading,
  error,
}) => {
  const { translate } = useLocalization();
  const [columns, setColumns] = useState<KanbanColumn[]>([]);

  // Organize applications into columns based on their status
  useEffect(() => {
    const statusColumns: KanbanColumn[] = [
      { id: ApplicationStatus.Draft, title: translate('status.draft'), applications: [] },
      { id: ApplicationStatus.Applied, title: translate('status.applied'), applications: [] },
      { id: ApplicationStatus.InterviewScheduled, title: translate('status.interviewScheduled'), applications: [] },
      { id: ApplicationStatus.Interviewing, title: translate('status.interviewing'), applications: [] },
      { id: ApplicationStatus.AssessmentPending, title: translate('status.assessmentPending'), applications: [] },
      { id: ApplicationStatus.WaitingResponse, title: translate('status.waitingResponse'), applications: [] },
      { id: ApplicationStatus.OfferReceived, title: translate('status.offerReceived'), applications: [] },
      { id: ApplicationStatus.Hired, title: translate('status.hired'), applications: [] },
      { id: ApplicationStatus.Rejected, title: translate('status.rejected'), applications: [] },
    ];

    // Sort applications into columns based on their status
    applications.forEach(app => {
      const columnIndex = statusColumns.findIndex(col => col.id === app.status);
      if (columnIndex !== -1) {
        statusColumns[columnIndex].applications.push(app);
      }
    });

    // Only show columns that have applications or are key stages
    const nonEmptyColumns = statusColumns.filter(
      col => col.applications.length > 0 || 
      [
        ApplicationStatus.Draft,
        ApplicationStatus.Applied, 
        ApplicationStatus.InterviewScheduled,
        ApplicationStatus.OfferReceived,
        ApplicationStatus.Hired
      ].includes(col.id)
    );

    setColumns(nonEmptyColumns);
  }, [applications, translate]);

  return (
    <div className={styles.kanbanContainer}>
      {isLoading && <div className={styles.loadingOverlay}>{translate('jobTracker.loading')}</div>}
      {error && <div className={styles.errorOverlay}>{error}</div>}
      {!isLoading && !error && columns.length === 0 && (
        <div className={styles.emptyBoard}>
          <p>{translate('jobTracker.noApplications')}</p>
        </div>
      )}
      {columns.map(column => (
        <div key={column.id} className={styles.kanbanColumn} data-status={column.id}>
          <div className={styles.columnHeader}>
            <h3 className={styles.columnTitle}>
              {column.title}
              <span className={styles.cardCount}>{column.applications.length}</span>
            </h3>
          </div>
          
          <div className={styles.columnContent}>
            {column.applications.length === 0 ? (
              <div className={styles.emptyColumn}>
                <p>{translate('jobTracker.noApplications')}</p>
              </div>
            ) : (
              column.applications.map(app => (
                <div 
                  key={app.id} 
                  className={styles.kanbanCard}
                  onClick={() => onViewJobDetails(app)}
                >
                  <div className={`${styles.statusHighlight} ${styles[app.status]}`}></div>
                  <div className={styles.cardTop}>
                    <div className={styles.companyLogo}>
                      {getInitials(safeGet(app, 'company.name', app.companyName))}
                    </div>
                    <div>
                      <div className={styles.cardCompanyName}>
                        {safeGet(app, 'company.name', app.companyName)}
                      </div>
                      <div className={styles.cardJobTitle}>
                        {safeGet(app, 'role.title', app.jobTitle)}
                      </div>
                    </div>
                  </div>
                  
                  {app.location && (
                    <div className={styles.cardLocation}>
                      <span>{app.location}</span>
                    </div>
                  )}
                  
                  <div className={styles.cardTags}>
                    {app.priority && (
                      <span className={styles.cardTag}>{app.priority}</span>
                    )}
                    {safeGet(app, 'role.employmentMode') && (
                      <span className={styles.cardTag}>{safeGet(app, 'role.employmentMode')}</span>
                    )}
                  </div>
                  
                  <div className={styles.cardFooter}>
                    {safeGet(app, 'keyDates.submissionDate') && (
                      <div className={styles.cardDeadline}>
                        <ClockIcon className="w-4 h-4" />
                        <span>{formatTimestamp(app.keyDates.submissionDate)}</span>
                      </div>
                    )}
                    {app.nextActionDate && (
                      <div className={styles.cardDeadline}>
                        <BriefcaseIcon className="w-4 h-4" />
                        <span>{formatTimestamp(app.nextActionDate)}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default KanbanBoard;
