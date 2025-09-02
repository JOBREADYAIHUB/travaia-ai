import React, { useState, useMemo } from 'react';
import { JobApplication, ApplicationStatus } from '../../types';
import { useLocalization } from '../../contexts/LocalizationContext';
import { ClockIcon } from '../icons/Icons';
import { formatTimestamp } from '../../utils/dataUtils';
import styles from './JobTracker.module.css';

interface JobAnalyticsChartsProps {
  applications: JobApplication[];
  isLoading: boolean;
  error: string | null;
}

type ChartType = 'applicationVolume' | 'statusDistribution' | 'activityTimeline';

const JobAnalyticsCharts: React.FC<JobAnalyticsChartsProps> = ({ applications, isLoading, error }) => {
  const { translate } = useLocalization();
  const [activeChart, setActiveChart] = useState<ChartType>('statusDistribution');
  const chartData = useMemo(() => {
    if (applications.length === 0) return null;

    try {
      switch (activeChart) {
        case 'statusDistribution':
          return calculateStatusDistribution();
        case 'applicationVolume':
          return calculateApplicationVolume();
        case 'activityTimeline':
          return calculateActivityTimeline();
        default:
          return null;
      }
    } catch (e) {
      console.error('Error calculating chart data:', e);
      return null; // Return null to indicate an error state
    }
  }, [activeChart, applications]);

  const calculateStatusDistribution = (): any => {
    // Count applications per status
    const statusCounts = Object.values(ApplicationStatus).reduce((acc, status) => {
      acc[status] = 0;
      return acc;
    }, {} as Record<string, number>);

    // Count applications for each status
    applications.forEach(app => {
      if (statusCounts[app.status] !== undefined) {
        statusCounts[app.status]++;
      }
    });

    // Format data for display
    const formattedData = Object.entries(statusCounts).map(([status, count]) => ({
      status,
      count,
      translatedStatus: translate(`status.${status.charAt(0).toLowerCase() + status.slice(1)}`)
    })).filter(item => item.count > 0);

    return {
      labels: formattedData.map(item => item.translatedStatus),
      values: formattedData.map(item => item.count),
      colors: formattedData.map(item => getStatusColor(item.status as ApplicationStatus))
    };
  };

  const calculateApplicationVolume = (): any => {
    // Calculate applications per month
    const monthlyData = applications.reduce((acc, app) => {
      const formattedDate = formatTimestamp(app.createdAt, 'yyyy-MM');
      if (!formattedDate) return acc; // Skip if date is invalid

      const [year, month] = formattedDate.split('-');
      const monthKey = `${year}-${month}`;
      if (!acc[monthKey]) {
        acc[monthKey] = {
          month: new Date(Number(year), Number(month) - 1).toLocaleString('default', { month: 'short' }),
          year: Number(year),
          count: 0
        };
      }
      acc[monthKey].count++;
      return acc;
    }, {} as Record<string, { month: string; year: number; count: number }>);

    // Sort data chronologically
    const sortedData = Object.values(monthlyData).sort((a, b) => {
      return a.year - b.year || 
        new Date(Date.parse(`${a.month} 1, 2000`)).getMonth() - 
        new Date(Date.parse(`${b.month} 1, 2000`)).getMonth();
    });

    return {
      labels: sortedData.map(item => `${item.month} ${item.year}`),
      values: sortedData.map(item => item.count),
      colors: sortedData.map(() => '#8B5CF6')
    };
  };

  const calculateActivityTimeline = (): any => {
    // For simplicity, let's create a weekly activity chart for the last 8 weeks
    const now = new Date();
    const weeks: { start: Date; end: Date; label: string; count: number }[] = [];
    
    // Generate the past 8 weeks
    for (let i = 7; i >= 0; i--) {
      const endDate = new Date(now);
      endDate.setDate(now.getDate() - (i * 7));
      
      const startDate = new Date(endDate);
      startDate.setDate(endDate.getDate() - 6);
      
      weeks.push({
        start: startDate,
        end: endDate,
        label: `${startDate.getDate()}/${startDate.getMonth() + 1} - ${endDate.getDate()}/${endDate.getMonth() + 1}`,
        count: 0
      });
    }

    // Count applications for each week
    applications.forEach(app => {
      const appDate = new Date(formatTimestamp(app.createdAt, 'yyyy-MM-dd'));
      if (!appDate || isNaN(appDate.getTime())) return;

      const weekIndex = weeks.findIndex(week => 
        appDate >= week.start && appDate <= week.end
      );
      
      if (weekIndex !== -1) {
        weeks[weekIndex].count++;
      }
    });

    return {
      labels: weeks.map(week => week.label),
      values: weeks.map(week => week.count),
      colors: weeks.map(() => '#10B981')
    };
  };

  const getStatusColor = (status: ApplicationStatus): string => {
    const colors: Record<ApplicationStatus, string> = {
      [ApplicationStatus.Draft]: '#9CA3AF',
      [ApplicationStatus.Applied]: '#3B82F6',
      [ApplicationStatus.InterviewScheduled]: '#8B5CF6',
      [ApplicationStatus.Interviewing]: '#EC4899',
      [ApplicationStatus.AssessmentPending]: '#F59E0B',
      [ApplicationStatus.WaitingResponse]: '#10B981',
      [ApplicationStatus.OfferReceived]: '#6EE7B7',
      [ApplicationStatus.Rejected]: '#EF4444',
      [ApplicationStatus.Hired]: '#34D399',
    };

    return colors[status] || '#9CA3AF';
  };

  // Simple canvas-based bar chart renderer
  const renderBarChart = () => {
    if (!chartData || !chartData.values.length) return null;

    const maxValue = Math.max(...chartData.values);
    
    return (
      <div className="chart-container relative h-64">
        <div className="flex h-full items-end">
          {chartData.values.map((value: number, index: number) => {
            const heightPercentage = (value / maxValue) * 100;
            return (
              <div 
                key={index} 
                className="flex flex-col items-center mx-1 flex-1"
              >
                <div 
                  className="w-full rounded-t-md transition-all duration-500 ease-in-out" 
                  style={{ 
                    height: `${heightPercentage}%`, 
                    backgroundColor: chartData.colors[index], 
                    minHeight: value > 0 ? '10px' : '0px'
                  }}
                ></div>
                <div className="text-xs mt-2 transform -rotate-45 origin-left whitespace-nowrap">
                  {chartData.labels[index]}
                </div>
                <div className="text-xs font-bold mt-1">{value}</div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className={styles.chartContainer}>
      <h2 className="text-lg font-semibold mb-3">{translate('jobTracker.analyticsTitle')}</h2>
      
      <div className={styles.chartTabs}>
        <div 
          className={`${styles.chartTab} ${activeChart === 'statusDistribution' ? styles.active : ''}`}
          onClick={() => setActiveChart('statusDistribution')}
        >
          <img src="/icons/pie-chart.svg" alt="Status Distribution" className="w-4 h-4 inline-block mr-2" />
          {translate('jobTracker.statusDistribution')}
        </div>
        <div 
          className={`${styles.chartTab} ${activeChart === 'applicationVolume' ? styles.active : ''}`}
          onClick={() => setActiveChart('applicationVolume')}
        >
          <img src="/icons/chart-bar.svg" alt="Application Volume" className="w-4 h-4 inline-block mr-2" />
          {translate('jobTracker.applicationVolume')}
        </div>
        <div 
          className={`${styles.chartTab} ${activeChart === 'activityTimeline' ? styles.active : ''}`}
          onClick={() => setActiveChart('activityTimeline')}
        >
          <ClockIcon className="w-4 h-4 inline-block mr-2" />
          {translate('jobTracker.activityTimeline')}
        </div>
      </div>
      
      {isLoading && <div className="text-center py-10 text-gray-500">{translate('jobTracker.loading')}</div>}
      {error && <div className="text-center py-10 text-red-500">{error}</div>}
      {!isLoading && !error && (!chartData || chartData.values.length === 0) && (
        <div className="text-center py-10 text-gray-500">
          {translate('jobTracker.noDataAvailable')}
        </div>
      )}
      {!isLoading && !error && chartData && chartData.values.length > 0 && (
        <div className="chart-wrapper">
          {renderBarChart()}
        </div>
      )}
    </div>
  );
};

export default JobAnalyticsCharts;
