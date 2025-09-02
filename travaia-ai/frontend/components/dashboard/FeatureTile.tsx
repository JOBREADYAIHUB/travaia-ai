import React from 'react';
import { GlassCard } from '../design-system';
import styles from './EnhancedDashboard.module.css';

interface FeatureTileProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick?: () => void;
  className?: string;
}

const FeatureTile: React.FC<FeatureTileProps> = ({ icon, title, description, onClick, className }) => {
  const isClickable = !!onClick;

  return (
    <div 
      className={`${styles.featureTile} ${isClickable ? 'cursor-pointer' : ''} ${className || ''}`}
      onClick={onClick}
    >
      <GlassCard 
        variant="medium"
        hover={isClickable}
      >
        <span className={styles.tileIcon}>{icon}</span>
        <h3 className={styles.tileTitle}>{title}</h3>
        <p className={styles.tileDescription}>{description}</p>
      </GlassCard>
    </div>
  );
};

export default FeatureTile;
