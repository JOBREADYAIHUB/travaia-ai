import { useCallback } from 'react';
import { useAsyncState } from './useAsyncState';

export interface UseApiCallOptions {
  onSuccess?: (data: any) => void;
  onError?: (error: string) => void;
  transform?: (data: any) => any;
}

export interface UseApiCallReturn<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  execute: (apiCall: () => Promise<T>) => Promise<T | null>;
  reset: () => void;
}

/**
 * Custom hook for API calls with automatic loading/error state management
 * Eliminates repetitive API call patterns across components
 */
export const useApiCall = <T = any>(options: UseApiCallOptions = {}): UseApiCallReturn<T> => {
  const { onSuccess, onError, transform } = options;
  const { data, loading, error, execute: executeAsync, reset } = useAsyncState<T>();

  const execute = useCallback(async (apiCall: () => Promise<T>): Promise<T | null> => {
    try {
      const result = await executeAsync(async () => {
        const response = await apiCall();
        return transform ? transform(response) : response;
      });

      if (result && onSuccess) {
        onSuccess(result);
      }

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'API call failed';
      if (onError) {
        onError(errorMessage);
      }
      return null;
    }
  }, [executeAsync, onSuccess, onError, transform]);

  return {
    data,
    loading,
    error,
    execute,
    reset,
  };
};

export default useApiCall;
