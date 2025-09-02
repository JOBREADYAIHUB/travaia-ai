import React from 'react';
import styles from './Chart.module.css';

interface ChartProps {
  data: {
    labels: string[];
    values: number[];
    colors: string[];
  };
  type: 'bar' | 'pie' | 'line';
  title?: string;
  height?: number;
  className?: string;
  animated?: boolean;
}

const Chart: React.FC<ChartProps> = ({
  data,
  type,
  title,
  height = 200,
  className,
  animated = true
}) => {
  const maxValue = Math.max(...data.values);

  const renderBarChart = () => {
    return (
      <div 
        className={`${styles.barChart} ${animated ? styles.animated : ''}`} 
        ref={(el) => {
          if (el) {
            el.style.setProperty('--chart-height', `${height}px`);
          }
        }}
      >
        <div className={styles.barContainer}>
          {data.values.map((value, index) => {
            const heightPercentage = (value / maxValue) * 100;
            return (
              <div key={index} className={styles.barWrapper}>
                <div 
                  className={styles.bar}
                  ref={(el) => {
                    if (el) {
                      el.style.setProperty('--bar-height', `${heightPercentage}%`);
                      el.style.setProperty('--bar-color', data.colors[index] || '#3B82F6');
                    }
                  }}
                />
                <div className={styles.barLabel}>
                  {data.labels[index]}
                </div>
                <div className={styles.barValue}>{value}</div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderPieChart = () => {
    const total = data.values.reduce((sum, value) => sum + value, 0);
    let cumulativePercentage = 0;

    return (
      <div 
        className={styles.pieChart} 
        ref={(el) => {
          if (el) {
            el.style.setProperty('--chart-height', `${height}px`);
          }
        }}
      >
        <svg viewBox="0 0 200 200" className={styles.pieSvg}>
          {data.values.map((value, index) => {
            const percentage = (value / total) * 100;
            const strokeDasharray = `${percentage} ${100 - percentage}`;
            const strokeDashoffset = -cumulativePercentage;
            cumulativePercentage += percentage;

            return (
              <circle
                key={index}
                cx="100"
                cy="100"
                r="80"
                fill="transparent"
                stroke={data.colors[index] || '#3B82F6'}
                strokeWidth="40"
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                className={animated ? styles.pieSlice : ''}
              />
            );
          })}
        </svg>
        <div className={styles.pieLegend}>
          {data.labels.map((label, index) => (
            <div key={index} className={styles.legendItem}>
              <div 
                className={`${styles.legendColor} bg-blue-500`}
                data-color={data.colors[index] || '#3B82F6'}
                style={{ backgroundColor: data.colors[index] || '#3B82F6' }}
              />
              <span className={styles.legendLabel}>{label}</span>
              <span className={styles.legendValue}>{data.values[index]}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className={`${styles.chartContainer} ${className || ''}`}>
      {title && <h3 className={styles.chartTitle}>{title}</h3>}
      {type === 'bar' && renderBarChart()}
      {type === 'pie' && renderPieChart()}
      {type === 'line' && <div className={styles.placeholder}>Line chart coming soon</div>}
    </div>
  );
};

export default Chart;
