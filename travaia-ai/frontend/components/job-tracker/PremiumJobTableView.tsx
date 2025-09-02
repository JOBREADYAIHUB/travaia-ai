import React, { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ChevronUpIcon,
  ChevronDownIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  ExternalLinkIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  BuildingOfficeIcon,
  UserIcon,
  CheckIcon,
  XMarkIcon,
  FunnelIcon,
  Squares2X2Icon,
  TableCellsIcon,
  ArrowsUpDownIcon
} from '@heroicons/react/24/outline';
import { JobApplication } from '../../types';
import { GlassCard, GlassButton } from '../design-system';
import styles from './PremiumJobTableView.module.css';

type SortField = 'company' | 'role' | 'status' | 'submissionDate' | 'salary' | 'location';
type SortDirection = 'asc' | 'desc';

interface Column {
  key: SortField;
  label: string;
  sortable: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

interface PremiumJobTableViewProps {
  applications: JobApplication[];
  onView: (application: JobApplication) => void;
  onEdit: (application: JobApplication) => void;
  onDelete: (application: JobApplication) => void;
  onBulkAction?: (action: string, applications: JobApplication[]) => void;
  loading?: boolean;
}

const PremiumJobTableView: React.FC<PremiumJobTableViewProps> = ({
  applications,
  onView,
  onEdit,
  onDelete,
  onBulkAction,
  loading = false
}) => {
  const { t } = useTranslation();
  const [sortField, setSortField] = useState<SortField>('submissionDate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [selectedApplications, setSelectedApplications] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'comfortable' | 'compact'>('comfortable');
  const [showFilters, setShowFilters] = useState(false);

  const columns: Column[] = [
    { key: 'company', label: t('jobTracker.table.company'), sortable: true, width: '20%' },
    { key: 'role', label: t('jobTracker.table.position'), sortable: true, width: '20%' },
    { key: 'status', label: t('jobTracker.table.status'), sortable: true, width: '15%', align: 'center' },
    { key: 'submissionDate', label: t('jobTracker.table.applied'), sortable: true, width: '12%', align: 'center' },
    { key: 'salary', label: t('jobTracker.table.salary'), sortable: true, width: '12%', align: 'right' },
    { key: 'location', label: t('jobTracker.table.location'), sortable: true, width: '15%' }
  ];

  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  }, [sortField, sortDirection]);

  const sortedApplications = useMemo(() => {
    return [...applications].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'company':
          aValue = a.company?.name?.toLowerCase() || '';
          bValue = b.company?.name?.toLowerCase() || '';
          break;
        case 'role':
          aValue = a.role?.title?.toLowerCase() || '';
          bValue = b.role?.title?.toLowerCase() || '';
          break;
        case 'status':
          aValue = a.status || '';
          bValue = b.status || '';
          break;
        case 'submissionDate':
          aValue = a.keyDates?.submissionDate?.toDate?.() || a.keyDates?.submissionDate || new Date(0);
          bValue = b.keyDates?.submissionDate?.toDate?.() || b.keyDates?.submissionDate || new Date(0);
          break;
        case 'salary':
          aValue = a.role?.salary?.min || 0;
          bValue = b.role?.salary?.min || 0;
          break;
        case 'location':
          aValue = a.role?.location?.toLowerCase() || '';
          bValue = b.role?.location?.toLowerCase() || '';
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [applications, sortField, sortDirection]);

  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      setSelectedApplications(new Set(applications.map(app => app.id)));
    } else {
      setSelectedApplications(new Set());
    }
  }, [applications]);

  const handleSelectApplication = useCallback((applicationId: string, checked: boolean) => {
    const newSelected = new Set(selectedApplications);
    if (checked) {
      newSelected.add(applicationId);
    } else {
      newSelected.delete(applicationId);
    }
    setSelectedApplications(newSelected);
  }, [selectedApplications]);

  const handleBulkAction = useCallback((action: string) => {
    const selectedApps = applications.filter(app => selectedApplications.has(app.id));
    if (selectedApps.length > 0 && onBulkAction) {
      onBulkAction(action, selectedApps);
      setSelectedApplications(new Set());
    }
  }, [applications, selectedApplications, onBulkAction]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'applied': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'screening': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'interview': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
      case 'offer': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'rejected': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      case 'withdrawn': return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
    }
  };

  const formatSalary = (salary?: { min?: number; max?: number; currency?: string }) => {
    if (!salary?.min) return '-';
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
    if (!date) return '-';
    const dateObj = date.toDate ? date.toDate() : new Date(date);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(dateObj);
  };

  if (loading) {
    return (
      <GlassCard className={styles.loadingContainer}>
        <div className={styles.loadingSpinner} />
        <p className={styles.loadingText}>{t('jobTracker.table.loading')}</p>
      </GlassCard>
    );
  }

  const isAllSelected = applications.length > 0 && selectedApplications.size === applications.length;
  const isPartiallySelected = selectedApplications.size > 0 && selectedApplications.size < applications.length;

  return (
    <div className={styles.tableContainer}>
      {/* Table Header Controls */}
      <div className={styles.tableControls}>
        <div className={styles.leftControls}>
          <div className={styles.viewModeToggle}>
            <GlassButton
              variant={viewMode === 'comfortable' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setViewMode('comfortable')}
              className={styles.viewModeButton}
            >
              <Squares2X2Icon className="w-4 h-4" />
              {t('jobTracker.table.comfortable')}
            </GlassButton>
            <GlassButton
              variant={viewMode === 'compact' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setViewMode('compact')}
              className={styles.viewModeButton}
            >
              <TableCellsIcon className="w-4 h-4" />
              {t('jobTracker.table.compact')}
            </GlassButton>
          </div>
          
          {selectedApplications.size > 0 && (
            <div className={styles.bulkActions}>
              <span className={styles.selectedCount}>
                {t('jobTracker.table.selected', { count: selectedApplications.size })}
              </span>
              <GlassButton
                variant="secondary"
                size="sm"
                onClick={() => handleBulkAction('delete')}
                className={styles.bulkActionButton}
              >
                <TrashIcon className="w-4 h-4" />
                {t('jobTracker.table.deleteSelected')}
              </GlassButton>
              <GlassButton
                variant="secondary"
                size="sm"
                onClick={() => handleBulkAction('export')}
                className={styles.bulkActionButton}
              >
                <ExternalLinkIcon className="w-4 h-4" />
                {t('jobTracker.table.exportSelected')}
              </GlassButton>
            </div>
          )}
        </div>

        <div className={styles.rightControls}>
          <GlassButton
            variant="secondary"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className={styles.filterButton}
          >
            <FunnelIcon className="w-4 h-4" />
            {t('jobTracker.table.filters')}
          </GlassButton>
        </div>
      </div>

      {/* Table */}
      <GlassCard className={styles.tableCard}>
        <div className={styles.tableWrapper}>
          <table className={`${styles.table} ${viewMode === 'compact' ? styles.compactTable : ''}`}>
            <thead className={styles.tableHeader}>
              <tr>
                <th className={styles.checkboxHeader}>
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = isPartiallySelected;
                    }}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className={styles.checkbox}
                    aria-label={t('jobTracker.table.selectAll')}
                  />
                </th>
                {columns.map((column) => (
                  <th
                    key={column.key}
                    className={`${styles.tableHeaderCell} ${column.align ? styles[`align${column.align.charAt(0).toUpperCase() + column.align.slice(1)}`] : ''}`}
                    style={{ width: column.width }}
                  >
                    {column.sortable ? (
                      <button
                        className={styles.sortButton}
                        onClick={() => handleSort(column.key)}
                        aria-label={t('jobTracker.table.sortBy', { field: column.label })}
                      >
                        <span>{column.label}</span>
                        <div className={styles.sortIcons}>
                          <ChevronUpIcon
                            className={`${styles.sortIcon} ${
                              sortField === column.key && sortDirection === 'asc' ? styles.activeSortIcon : ''
                            }`}
                          />
                          <ChevronDownIcon
                            className={`${styles.sortIcon} ${
                              sortField === column.key && sortDirection === 'desc' ? styles.activeSortIcon : ''
                            }`}
                          />
                        </div>
                      </button>
                    ) : (
                      column.label
                    )}
                  </th>
                ))}
                <th className={styles.actionsHeader}>{t('jobTracker.table.actions')}</th>
              </tr>
            </thead>
            <tbody className={styles.tableBody}>
              {sortedApplications.map((application) => (
                <tr
                  key={application.id}
                  className={`${styles.tableRow} ${selectedApplications.has(application.id) ? styles.selectedRow : ''}`}
                >
                  <td className={styles.checkboxCell}>
                    <input
                      type="checkbox"
                      checked={selectedApplications.has(application.id)}
                      onChange={(e) => handleSelectApplication(application.id, e.target.checked)}
                      className={styles.checkbox}
                      aria-label={t('jobTracker.table.selectApplication', { 
                        company: application.company?.name || '',
                        role: application.role?.title || ''
                      })}
                    />
                  </td>
                  
                  <td className={styles.companyCell}>
                    <div className={styles.companyInfo}>
                      {application.company?.logo ? (
                        <img
                          src={application.company.logo}
                          alt={`${application.company.name} logo`}
                          className={styles.companyLogo}
                        />
                      ) : (
                        <div className={styles.companyLogoPlaceholder}>
                          <BuildingOfficeIcon className="w-4 h-4" />
                        </div>
                      )}
                      <div className={styles.companyDetails}>
                        <div className={styles.companyName}>
                          {application.company?.name || t('jobTracker.table.unknownCompany')}
                        </div>
                        {application.company?.website && (
                          <a
                            href={application.company.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.companyWebsite}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ExternalLinkIcon className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  </td>
                  
                  <td className={styles.roleCell}>
                    <div className={styles.roleInfo}>
                      <div className={styles.roleTitle}>
                        {application.role?.title || t('jobTracker.table.unknownRole')}
                      </div>
                      {application.role?.department && (
                        <div className={styles.roleDepartment}>
                          {application.role.department}
                        </div>
                      )}
                    </div>
                  </td>
                  
                  <td className={styles.statusCell}>
                    <span className={`${styles.statusBadge} ${getStatusColor(application.status)}`}>
                      {t(`jobTracker.status.${application.status}`)}
                    </span>
                  </td>
                  
                  <td className={styles.dateCell}>
                    {formatDate(application.keyDates?.submissionDate)}
                  </td>
                  
                  <td className={styles.salaryCell}>
                    {formatSalary(application.role?.salary)}
                  </td>
                  
                  <td className={styles.locationCell}>
                    <div className={styles.locationInfo}>
                      {application.role?.location || '-'}
                      {application.role?.remote && (
                        <span className={styles.remoteBadge}>
                          {t('jobTracker.table.remote')}
                        </span>
                      )}
                    </div>
                  </td>
                  
                  <td className={styles.actionsCell}>
                    <div className={styles.actionButtons}>
                      <GlassButton
                        variant="ghost"
                        size="sm"
                        onClick={() => onView(application)}
                        className={styles.actionButton}
                        aria-label={t('jobTracker.table.viewApplication')}
                      >
                        <EyeIcon className="w-4 h-4" />
                      </GlassButton>
                      <GlassButton
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(application)}
                        className={styles.actionButton}
                        aria-label={t('jobTracker.table.editApplication')}
                      >
                        <PencilIcon className="w-4 h-4" />
                      </GlassButton>
                      <GlassButton
                        variant="ghost"
                        size="sm"
                        onClick={() => onDelete(application)}
                        className={`${styles.actionButton} ${styles.deleteButton}`}
                        aria-label={t('jobTracker.table.deleteApplication')}
                      >
                        <TrashIcon className="w-4 h-4" />
                      </GlassButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {sortedApplications.length === 0 && (
          <div className={styles.emptyState}>
            <TableCellsIcon className={styles.emptyStateIcon} />
            <h3 className={styles.emptyStateTitle}>
              {t('jobTracker.table.noApplications')}
            </h3>
            <p className={styles.emptyStateMessage}>
              {t('jobTracker.table.noApplicationsMessage')}
            </p>
          </div>
        )}
      </GlassCard>
    </div>
  );
};

export default PremiumJobTableView;
