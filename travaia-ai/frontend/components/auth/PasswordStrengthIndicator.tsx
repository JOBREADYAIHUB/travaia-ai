import React from 'react';
import './PasswordStrengthIndicator.css';

interface PasswordStrengthIndicatorProps {
  password: string;
  showRequirements?: boolean;
}

interface PasswordRequirement {
  label: string;
  test: (password: string) => boolean;
  met: boolean;
}

const PasswordStrengthIndicator: React.FC<PasswordStrengthIndicatorProps> = ({ 
  password, 
  showRequirements = true 
}) => {
  const requirements: PasswordRequirement[] = [
    {
      label: 'At least 8 characters',
      test: (pwd) => pwd.length >= 8,
      met: password.length >= 8
    },
    {
      label: 'One uppercase letter',
      test: (pwd) => /[A-Z]/.test(pwd),
      met: /[A-Z]/.test(password)
    },
    {
      label: 'One lowercase letter',
      test: (pwd) => /[a-z]/.test(pwd),
      met: /[a-z]/.test(password)
    },
    {
      label: 'One number',
      test: (pwd) => /\d/.test(pwd),
      met: /\d/.test(password)
    },
    {
      label: 'One special character (!@#$%^&*)',
      test: (pwd) => /[!@#$%^&*(),.?":{}|<>]/.test(pwd),
      met: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    }
  ];

  const metRequirements = requirements.filter(req => req.met).length;
  const strengthPercentage = (metRequirements / requirements.length) * 100;

  const getStrengthLevel = () => {
    if (metRequirements === 0) return { level: 'none', color: '#e0e0e0', text: '' };
    if (metRequirements <= 1) return { level: 'weak', color: '#f44336', text: 'Weak' };
    if (metRequirements <= 2) return { level: 'fair', color: '#ff9800', text: 'Fair' };
    if (metRequirements <= 3) return { level: 'good', color: '#2196f3', text: 'Good' };
    return { level: 'strong', color: '#4caf50', text: 'Strong' };
  };

  const strength = getStrengthLevel();

  if (!password && !showRequirements) return null;

  return (
    <div className="password-strength-container">
      {password && (
        <div className="password-strength-bar">
          <div className="strength-label">
            <span>Password Strength: </span>
            <span className={`strength-text ${strength.level}`}>{strength.text}</span>
          </div>
          <div className="strength-bar-background">
            <div 
              className={`strength-bar-fill ${strength.level}`}
              style={{ 
                width: `${strengthPercentage}%`,
                backgroundColor: strength.color
              }}
            />
          </div>
        </div>
      )}
      
      {showRequirements && (
        <div className="password-requirements">
          <div className="requirements-title">Password must contain:</div>
          <ul className="requirements-list">
            {requirements.map((requirement, index) => (
              <li 
                key={index}
                className={`requirement-item ${requirement.met ? 'met' : 'unmet'}`}
              >
                <span className={`requirement-icon ${requirement.met ? 'check' : 'cross'}`}>
                  {requirement.met ? '✓' : '✗'}
                </span>
                <span className="requirement-text">{requirement.label}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default PasswordStrengthIndicator;
