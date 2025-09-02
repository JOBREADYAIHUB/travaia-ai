import { useCallback, useRef } from 'react';
import { logger } from '../services/LoggingService';

export interface UseLoggerReturn {
  debug: (message: string, data?: any) => void;
  info: (message: string, data?: any) => void;
  warn: (message: string, data?: any) => void;
  error: (message: string, data?: any) => void;
  logUserAction: (action: string, data?: any) => void;
  logApiCall: (endpoint: string, method: string, status?: number, duration?: number) => void;
  logPerformance: (metric: string, value: number) => void;
  logError: (error: Error, context?: string) => void;
}

export const useLogger = (componentName?: string): UseLoggerReturn => {
  const componentRef = useRef(componentName || 'Unknown');

  const debug = useCallback((message: string, data?: any) => {
    logger.debug(message, 'component', data, componentRef.current);
  }, []);

  const info = useCallback((message: string, data?: any) => {
    logger.info(message, 'component', data, componentRef.current);
  }, []);

  const warn = useCallback((message: string, data?: any) => {
    logger.warn(message, 'component', data, componentRef.current);
  }, []);

  const error = useCallback((message: string, data?: any) => {
    logger.error(message, 'component', data, componentRef.current);
  }, []);

  const logUserAction = useCallback((action: string, data?: any) => {
    logger.logUserAction(action, componentRef.current, data);
  }, []);

  const logApiCall = useCallback((endpoint: string, method: string, status?: number, duration?: number) => {
    logger.logApiCall(endpoint, method, status, duration);
  }, []);

  const logPerformance = useCallback((metric: string, value: number) => {
    logger.logPerformance(metric, value, componentRef.current);
  }, []);

  const logError = useCallback((error: Error, context?: string) => {
    logger.logError(error, context, componentRef.current);
  }, []);

  return {
    debug,
    info,
    warn,
    error,
    logUserAction,
    logApiCall,
    logPerformance,
    logError
  };
};
