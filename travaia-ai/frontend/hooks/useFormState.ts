import { useState, useCallback } from 'react';

export interface UseFormStateReturn<T> {
  formData: T;
  updateField: (field: keyof T, value: any) => void;
  updateNestedField: (path: string, value: any) => void;
  resetForm: () => void;
  setFormData: (data: T) => void;
  isDirty: boolean;
}

/**
 * Custom hook for managing form state with nested field updates
 * Eliminates repetitive form state management patterns
 */
export const useFormState = <T extends Record<string, any>>(
  initialData: T
): UseFormStateReturn<T> => {
  const [formData, setFormData] = useState<T>(initialData);
  const [isDirty, setIsDirty] = useState(false);

  const updateField = useCallback((field: keyof T, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    setIsDirty(true);
  }, []);

  const updateNestedField = useCallback((path: string, value: any) => {
    setFormData(prev => {
      const keys = path.split('.');
      const newData = { ...prev };
      let current: any = newData;

      // Navigate to the parent of the target field
      for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i];
        if (current[key] === undefined || current[key] === null) {
          current[key] = {};
        } else {
          current[key] = { ...current[key] };
        }
        current = current[key];
      }

      // Set the final value
      current[keys[keys.length - 1]] = value;
      return newData;
    });
    setIsDirty(true);
  }, []);

  const resetForm = useCallback(() => {
    setFormData(initialData);
    setIsDirty(false);
  }, [initialData]);

  const setFormDataWrapper = useCallback((data: T) => {
    setFormData(data);
    setIsDirty(false);
  }, []);

  return {
    formData,
    updateField,
    updateNestedField,
    resetForm,
    setFormData: setFormDataWrapper,
    isDirty,
  };
};

export default useFormState;
