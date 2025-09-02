import React from 'react';
import './PasswordMatchIndicator.css';

interface PasswordMatchIndicatorProps {
  password: string;
  confirmPassword: string;
  showIndicator?: boolean;
}

const PasswordMatchIndicator: React.FC<PasswordMatchIndicatorProps> = ({ 
  password, 
  confirmPassword, 
  showIndicator = true 
}) => {
  // Don't show anything if confirm password is empty
  if (!confirmPassword || !showIndicator) return null;

  const passwordsMatch = password === confirmPassword;

  return (
    <div className={`password-match-indicator ${passwordsMatch ? 'match' : 'mismatch'}`}>
      <span className={`match-icon ${passwordsMatch ? 'check' : 'cross'}`}>
        {passwordsMatch ? '✓' : '✗'}
      </span>
      <span className="match-text">
        {passwordsMatch ? 'Passwords match' : 'Passwords do not match'}
      </span>
    </div>
  );
};

export default PasswordMatchIndicator;
