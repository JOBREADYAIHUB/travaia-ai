import React, { useMemo } from 'react';
import styles from './BackgroundCircles.module.css';

interface CircleConfig {
  id: number;
  size: number;
  colorVar: string;
  position: {
    top: number;
    left: number;
  };
  animation: {
    duration: number;
    delay: number;
  };
}

interface BackgroundCirclesProps {
  count?: number;
  variant?: 'default' | 'subtle' | 'vibrant';
  className?: string;
}

const BackgroundCircles: React.FC<BackgroundCirclesProps> = ({
  count = 10,
  variant = 'default',
  className = ''
}) => {
  const circles = useMemo(() => {
    const circleColors = [
      'var(--circle-color-1)',
      'var(--circle-color-2)',
      'var(--circle-color-3)',
      'var(--circle-color-4)',
      'var(--circle-color-5)',
      'var(--circle-color-6)',
      'var(--circle-color-7)',
      'var(--circle-color-8)',
      'var(--circle-color-9)',
      'var(--circle-color-10)',
    ];

    return Array.from({ length: count }, (_, i): CircleConfig => {
      const baseSize = variant === 'subtle' ? 150 : variant === 'vibrant' ? 400 : 250;
      const sizeVariance = variant === 'subtle' ? 100 : variant === 'vibrant' ? 200 : 150;
      
      return {
        id: i,
        size: Math.random() * sizeVariance + baseSize,
        colorVar: circleColors[i % circleColors.length],
        position: {
          top: Math.random() * 100,
          left: Math.random() * 100
        },
        animation: {
          duration: Math.random() * 10 + 15, // 15-25 seconds
          delay: Math.random() * 5 // 0-5 seconds delay
        }
      };
    });
  }, [count, variant]);

  return (
    <div className={`${styles.backgroundCircles} ${className}`} aria-hidden="true">
      {circles.map(circle => (
        <div
          key={circle.id}
          className={`${styles.backgroundCircle} ${styles[`variant-${variant}`]}`}
          style={{
            '--circle-size': `${circle.size}px`,
            '--circle-bg': circle.colorVar,
            '--circle-top': `${circle.position.top}%`,
            '--circle-left': `${circle.position.left}%`,
            '--circle-duration': `${circle.animation.duration}s`,
            '--circle-delay': `${circle.animation.delay}s`
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
};

export default BackgroundCircles;
