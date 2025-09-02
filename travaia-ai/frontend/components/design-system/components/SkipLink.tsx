import React from 'react';
import styles from './SkipLink.module.css';

interface SkipLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
}

const SkipLink: React.FC<SkipLinkProps> = ({ href, children, className }) => {
  return (
    <a 
      href={href}
      className={`${styles.skipLink} ${className || ''}`}
      onFocus={(e) => e.currentTarget.classList.add(styles.visible)}
      onBlur={(e) => e.currentTarget.classList.remove(styles.visible)}
    >
      {children}
    </a>
  );
};

export default SkipLink;
