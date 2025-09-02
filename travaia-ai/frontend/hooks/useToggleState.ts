import { useState, useCallback } from 'react';

export interface UseToggleStateReturn {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  setIsOpen: (value: boolean) => void;
}

/**
 * Custom hook for managing boolean toggle states (modals, dropdowns, etc.)
 * Eliminates repetitive useState patterns for toggle functionality
 */
export const useToggleState = (initialState: boolean = false): UseToggleStateReturn => {
  const [isOpen, setIsOpen] = useState(initialState);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen(prev => !prev), []);

  return {
    isOpen,
    open,
    close,
    toggle,
    setIsOpen,
  };
};

export default useToggleState;
