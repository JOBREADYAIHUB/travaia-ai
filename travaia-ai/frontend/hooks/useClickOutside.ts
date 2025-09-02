import { useEffect, RefObject } from 'react';

/**
 * Custom hook for handling click outside events
 * Eliminates repetitive click outside logic for dropdowns, modals, etc.
 */
export const useClickOutside = (
  ref: RefObject<HTMLElement>,
  handler: () => void,
  enabled: boolean = true
): void => {
  useEffect(() => {
    if (!enabled) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        handler();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [ref, handler, enabled]);
};

export default useClickOutside;
