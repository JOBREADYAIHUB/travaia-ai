/**
 * Enterprise Routing Hook for TRAVAIA
 * Provides high-performance routing utilities for 20M+ users
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { enterpriseRouting, type RouteMetrics } from '../utils/enterpriseRouting';

interface UseEnterpriseRoutingReturn {
  // Navigation functions
  navigateToRoute: (routeKey: string, params?: Record<string, string>) => Promise<void>;
  switchLanguage: (targetLanguage: string) => Promise<void>;
  
  // State
  isNavigating: boolean;
  currentLanguage: string;
  
  // Performance metrics
  metrics: RouteMetrics;
  cacheStats: any;
  
  // Utilities
  preloadLanguage: (language: string) => Promise<void>;
  clearCache: () => void;
}

export const useEnterpriseRouting = (): UseEnterpriseRoutingReturn => {
  const location = useLocation();
  const navigate = useNavigate();
  const { i18n, t } = useTranslation();
  
  const [isNavigating, setIsNavigating] = useState(false);
  const [metrics, setMetrics] = useState<RouteMetrics>(() => enterpriseRouting.getMetrics());
  const [cacheStats, setCacheStats] = useState(() => enterpriseRouting.getCacheStats());
  
  const metricsIntervalRef = useRef<NodeJS.Timeout>();

  // Update metrics periodically
  useEffect(() => {
    metricsIntervalRef.current = setInterval(() => {
      setMetrics(enterpriseRouting.getMetrics());
      setCacheStats(enterpriseRouting.getCacheStats());
    }, 5000); // Update every 5 seconds

    return () => {
      if (metricsIntervalRef.current) {
        clearInterval(metricsIntervalRef.current);
      }
    };
  }, []);

  // Navigate to a specific route with parameters
  const navigateToRoute = useCallback(async (
    routeKey: string, 
    params: Record<string, string> = {}
  ) => {
    setIsNavigating(true);
    
    try {
      // Get translated path for current language
      const translatedPath = t(routeKey);
      
      // Replace parameters in the path
      let finalPath = translatedPath;
      Object.entries(params).forEach(([key, value]) => {
        finalPath = finalPath.replace(`:${key}`, value);
      });
      
      // Navigate with current language prefix
      const fullPath = `/${i18n.language}/${finalPath}`;
      navigate(fullPath);
      
    } catch (error) {
      console.error('Navigation error:', error);
      
      // Fallback to dashboard
      const dashboardPath = `/${i18n.language}/${t('routes.dashboard')}`;
      navigate(dashboardPath);
    } finally {
      setIsNavigating(false);
    }
  }, [navigate, i18n.language, t]);

  // Switch language with enterprise routing
  const switchLanguage = useCallback(async (targetLanguage: string) => {
    if (targetLanguage === i18n.language) return;
    
    setIsNavigating(true);
    
    try {
      // Map current path to target language
      const currentPath = location.pathname + location.search + location.hash;
      const newPath = await enterpriseRouting.mapPathToLanguage(currentPath, targetLanguage);
      
      // Change language
      await i18n.changeLanguage(targetLanguage);
      
      // Navigate to mapped path
      navigate(newPath, { replace: true });
      
      // Update document attributes for accessibility
      document.documentElement.lang = targetLanguage;
      const isRTL = targetLanguage === 'ar';
      document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
      
      // Store preference
      localStorage.setItem('preferredLanguage', targetLanguage);
      
    } catch (error) {
      console.error('Language switching error:', error);
      
      // Fallback navigation
      const fallbackPath = `/${targetLanguage}/dashboard`;
      await i18n.changeLanguage(targetLanguage);
      navigate(fallbackPath, { replace: true });
    } finally {
      setIsNavigating(false);
    }
  }, [location, navigate, i18n]);

  // Preload a language for better performance
  const preloadLanguage = useCallback(async (language: string) => {
    try {
      await i18n.loadLanguages(language);
    } catch (error) {
      console.warn(`Failed to preload language ${language}:`, error);
    }
  }, [i18n]);

  // Clear routing caches
  const clearCache = useCallback(() => {
    enterpriseRouting.clearCaches();
    setCacheStats(enterpriseRouting.getCacheStats());
  }, []);

  return {
    navigateToRoute,
    switchLanguage,
    isNavigating,
    currentLanguage: i18n.language,
    metrics,
    cacheStats,
    preloadLanguage,
    clearCache,
  };
};
