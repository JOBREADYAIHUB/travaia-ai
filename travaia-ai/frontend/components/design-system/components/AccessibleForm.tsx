import React from 'react';
import styles from './AccessibleForm.module.css';

interface FormFieldProps {
  id: string;
  label: string;
  type?: 'text' | 'email' | 'password' | 'tel' | 'url' | 'search';
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  error?: string;
  helpText?: string;
  disabled?: boolean;
  className?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
  id,
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  required = false,
  error,
  helpText,
  disabled = false,
  className
}) => {
  const fieldId = `field-${id}`;
  const errorId = `${fieldId}-error`;
  const helpId = `${fieldId}-help`;

  return (
    <div className={`${styles.formField} ${className || ''}`}>
      <label 
        htmlFor={fieldId}
        className={`${styles.label} ${required ? styles.required : ''}`}
      >
        {label}
        {required && <span className={styles.requiredMark} aria-label="required">*</span>}
      </label>
      
      <input
        id={fieldId}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={`${error ? errorId : ''} ${helpText ? helpId : ''}`.trim() || undefined}
        className={`${styles.input} ${error ? styles.inputError : ''}`}
      />
      
      {helpText && (
        <div id={helpId} className={styles.helpText}>
          {helpText}
        </div>
      )}
      
      {error && (
        <div id={errorId} className={styles.errorText} role="alert">
          {error}
        </div>
      )}
    </div>
  );
};

interface SelectFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  required?: boolean;
  error?: string;
  helpText?: string;
  disabled?: boolean;
  className?: string;
}

export const SelectField: React.FC<SelectFieldProps> = ({
  id,
  label,
  value,
  onChange,
  options,
  required = false,
  error,
  helpText,
  disabled = false,
  className
}) => {
  const fieldId = `select-${id}`;
  const errorId = `${fieldId}-error`;
  const helpId = `${fieldId}-help`;

  return (
    <div className={`${styles.formField} ${className || ''}`}>
      <label 
        htmlFor={fieldId}
        className={`${styles.label} ${required ? styles.required : ''}`}
      >
        {label}
        {required && <span className={styles.requiredMark} aria-label="required">*</span>}
      </label>
      
      <select
        id={fieldId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        required={required}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={`${error ? errorId : ''} ${helpText ? helpId : ''}`.trim() || undefined}
        className={`${styles.select} ${error ? styles.inputError : ''}`}
      >
        <option value="">Select an option</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      
      {helpText && (
        <div id={helpId} className={styles.helpText}>
          {helpText}
        </div>
      )}
      
      {error && (
        <div id={errorId} className={styles.errorText} role="alert">
          {error}
        </div>
      )}
    </div>
  );
};

interface TextAreaFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  error?: string;
  helpText?: string;
  disabled?: boolean;
  rows?: number;
  className?: string;
}

export const TextAreaField: React.FC<TextAreaFieldProps> = ({
  id,
  label,
  value,
  onChange,
  placeholder,
  required = false,
  error,
  helpText,
  disabled = false,
  rows = 4,
  className
}) => {
  const fieldId = `textarea-${id}`;
  const errorId = `${fieldId}-error`;
  const helpId = `${fieldId}-help`;

  return (
    <div className={`${styles.formField} ${className || ''}`}>
      <label 
        htmlFor={fieldId}
        className={`${styles.label} ${required ? styles.required : ''}`}
      >
        {label}
        {required && <span className={styles.requiredMark} aria-label="required">*</span>}
      </label>
      
      <textarea
        id={fieldId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        rows={rows}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={`${error ? errorId : ''} ${helpText ? helpId : ''}`.trim() || undefined}
        className={`${styles.textarea} ${error ? styles.inputError : ''}`}
      />
      
      {helpText && (
        <div id={helpId} className={styles.helpText}>
          {helpText}
        </div>
      )}
      
      {error && (
        <div id={errorId} className={styles.errorText} role="alert">
          {error}
        </div>
      )}
    </div>
  );
};
