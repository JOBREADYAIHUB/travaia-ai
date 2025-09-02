import React from 'react';
import { useTranslation } from 'react-i18next';

interface FormFieldProps {
  label: string;
  type?: 'text' | 'email' | 'tel' | 'url' | 'date' | 'textarea' | 'select';
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  options?: { value: string; label: string }[];
  rows?: number;
  className?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  required = false,
  options,
  rows = 3,
  className = ''
}) => {
  const { t } = useTranslation();
  
  const baseInputClasses = "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent";

  const renderInput = () => {
    switch (type) {
      case 'textarea':
        return (
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={baseInputClasses}
            placeholder={placeholder}
            required={required}
            rows={rows}
            aria-label={label}
          />
        );
      
      case 'select':
        return (
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={baseInputClasses}
            required={required}
            aria-label={label}
          >
            {options?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );
      
      default:
        return (
          <input
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={baseInputClasses}
            placeholder={placeholder}
            required={required}
            aria-label={label}
          />
        );
    }
  };

  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {renderInput()}
    </div>
  );
};
