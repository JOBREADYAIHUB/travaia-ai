import { useEffect } from 'react';

export interface KeyboardShortcutOptions {
  key: string;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  metaKey?: boolean;
  preventDefault?: boolean;
  enabled?: boolean;
}

/**
 * Custom hook for handling keyboard shortcuts
 * Eliminates repetitive keyboard event handling across components
 */
export const useKeyboardShortcut = (
  options: KeyboardShortcutOptions,
  handler: (event: KeyboardEvent) => void
): void => {
  const {
    key,
    ctrlKey = false,
    altKey = false,
    shiftKey = false,
    metaKey = false,
    preventDefault = true,
    enabled = true,
  } = options;

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const isMatch =
        event.key.toLowerCase() === key.toLowerCase() &&
        event.ctrlKey === ctrlKey &&
        event.altKey === altKey &&
        event.shiftKey === shiftKey &&
        event.metaKey === metaKey;

      if (isMatch) {
        if (preventDefault) {
          event.preventDefault();
        }
        handler(event);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [key, ctrlKey, altKey, shiftKey, metaKey, preventDefault, enabled, handler]);
};

export default useKeyboardShortcut;
