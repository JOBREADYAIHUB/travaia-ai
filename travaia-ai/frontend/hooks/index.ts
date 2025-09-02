/**
 * TRAVAIA Frontend Hooks - Centralized Export
 * Common custom hooks for repeated patterns across the application
 */

// Async State Management
export { useAsyncState } from './useAsyncState';
export type { AsyncState, UseAsyncStateReturn } from './useAsyncState';

// API Calls
export { useApiCall } from './useApiCall';
export type { UseApiCallOptions, UseApiCallReturn } from './useApiCall';

// Form State Management
export { useFormState } from './useFormState';
export type { UseFormStateReturn } from './useFormState';

// Toggle States (Modals, Dropdowns, etc.)
export { useToggleState } from './useToggleState';
export type { UseToggleStateReturn } from './useToggleState';

// Utility Hooks
export { useDebounce } from './useDebounce';
export { useClickOutside } from './useClickOutside';
export { useKeyboardShortcut } from './useKeyboardShortcut';
export type { KeyboardShortcutOptions } from './useKeyboardShortcut';
export { useArrayManager } from './useArrayManager';
export type { ArrayItem, UseArrayManagerReturn } from './useArrayManager';
export { useLogger } from './useLogger';
export type { UseLoggerReturn } from './useLogger';

// Existing Hooks (mixed export patterns)
export { default as useLocalStorage } from './useLocalStorage';
export { useMediaQuery } from './useMediaQuery';
export { default as useWindowSize } from './useWindowSize';
export { default as usePageTitle } from './usePageTitle';
export { default as useRTL } from './useRTL';
export { default as useFormatting } from './useFormatting';
export { default as useMobileOptimization } from './useMobileOptimization';

// Note: Some hooks may not exist or have different export patterns
// Only including hooks that are confirmed to work

// Interview-specific Hooks
export { useInterviewSession } from './useInterviewSession';
export { useLiveKitInterview } from './useLiveKitInterview';
export { usePipecat } from './usePipecat';
