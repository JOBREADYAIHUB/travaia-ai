/**
 * Enterprise-Grade Routing System for TRAVAIA
 * Designed to handle 20M+ daily users with high performance and reliability
 */

import i18n from '../i18n';
import { LRUCache } from 'lru-cache';

// Performance monitoring interface
interface RouteMetrics {
  translationTime: number;
  cacheHits: number;
  cacheMisses: number;
  errorCount: number;
  lastError?: Error;
}

// Route translation cache configuration
interface CacheConfig {
  maxSize: number;
  ttl: number; // Time to live in milliseconds
  updateAgeOnGet: boolean;
}

// Enterprise routing configuration
interface EnterpriseRoutingConfig {
  supportedLanguages: string[];
  defaultLanguage: string;
  cache: CacheConfig;
  fallbackBehavior: 'redirect' | 'preserve' | 'error';
  enableMetrics: boolean;
  enablePreloading: boolean;
}

class EnterpriseRoutingSystem {
  private static instance: EnterpriseRoutingSystem;
  private translationCache: LRUCache<string, string>;
  private routeKeyCache: LRUCache<string, string>;
  private metrics: RouteMetrics;
  private config: EnterpriseRoutingConfig;
  private preloadedLanguages: Set<string> = new Set();

  private constructor(config: EnterpriseRoutingConfig) {
    this.config = config;
    
    // Initialize high-performance LRU cache
    this.translationCache = new LRUCache({
      max: config.cache.maxSize,
      ttl: config.cache.ttl,
      updateAgeOnGet: config.cache.updateAgeOnGet,
    });

    this.routeKeyCache = new LRUCache({
      max: config.cache.maxSize / 2,
      ttl: config.cache.ttl,
      updateAgeOnGet: config.cache.updateAgeOnGet,
    });

    this.metrics = {
      translationTime: 0,
      cacheHits: 0,
      cacheMisses: 0,
      errorCount: 0,
    };

    // Preload critical languages
    if (config.enablePreloading) {
      this.preloadCriticalLanguages();
    }
  }

  public static getInstance(config?: EnterpriseRoutingConfig): EnterpriseRoutingSystem {
    if (!EnterpriseRoutingSystem.instance) {
      const defaultConfig: EnterpriseRoutingConfig = {
        supportedLanguages: ['en', 'es', 'fr', 'de', 'ar'],
        defaultLanguage: 'en',
        cache: {
          maxSize: 10000, // Cache up to 10k translations
          ttl: 1000 * 60 * 60, // 1 hour TTL
          updateAgeOnGet: true,
        },
        fallbackBehavior: 'redirect',
        enableMetrics: true,
        enablePreloading: true,
      };
      
      EnterpriseRoutingSystem.instance = new EnterpriseRoutingSystem(
        config || defaultConfig
      );
    }
    return EnterpriseRoutingSystem.instance;
  }

  /**
   * Preload critical language resources for better performance
   */
  private async preloadCriticalLanguages(): Promise<void> {
    const criticalLanguages = ['en', 'es']; // Most common languages
    
    const preloadPromises = criticalLanguages.map(async (lang) => {
      try {
        await i18n.loadLanguages(lang);
        this.preloadedLanguages.add(lang);
        
        // Warm up cache with common routes
        const commonRoutes = [
          'routes.dashboard',
          'routes.login',
          'routes.analytics',
          'routes.profile',
        ];
        
        commonRoutes.forEach(routeKey => {
          this.getCachedTranslation(routeKey, lang);
        });
        
      } catch (error) {
        console.warn(`Failed to preload language ${lang}:`, error);
      }
    });

    await Promise.allSettled(preloadPromises);
  }

  /**
   * High-performance cached translation lookup
   */
  private getCachedTranslation(routeKey: string, language: string): string | null {
    const cacheKey = `${routeKey}:${language}`;
    
    // Check cache first
    const cached = this.translationCache.get(cacheKey);
    if (cached) {
      this.metrics.cacheHits++;
      return cached;
    }

    this.metrics.cacheMisses++;
    
    // Fetch from i18n
    const translations = i18n.getDataByLanguage(language)?.translation;
    const translation = translations?.[routeKey];
    
    if (typeof translation === 'string') {
      // Cache the result
      this.translationCache.set(cacheKey, translation);
      return translation;
    }

    return null;
  }

  /**
   * High-performance route key lookup with caching
   */
  private getCachedRouteKey(path: string, language: string): string | null {
    const cacheKey = `${path}:${language}`;
    
    const cached = this.routeKeyCache.get(cacheKey);
    if (cached) {
      this.metrics.cacheHits++;
      return cached;
    }

    this.metrics.cacheMisses++;

    // Clean the path
    const cleanedPath = path.replace(/^\/+|\/+$/g, '');
    const translations = i18n.getDataByLanguage(language)?.translation;
    
    if (!translations) return null;

    // Find matching route key
    for (const key in translations) {
      if (key.startsWith('routes.')) {
        const routeValue = translations[key];
        if (typeof routeValue === 'string' && routeValue === cleanedPath) {
          this.routeKeyCache.set(cacheKey, key);
          return key;
        }
      }
    }

    return null;
  }

  /**
   * Enterprise-grade path mapping with comprehensive error handling
   */
  public async mapPathToLanguage(
    currentPath: string,
    targetLanguage: string
  ): Promise<string> {
    const startTime = performance.now();
    
    try {
      // Validate inputs
      if (!currentPath || !targetLanguage) {
        throw new Error('Invalid input parameters');
      }

      if (!this.config.supportedLanguages.includes(targetLanguage)) {
        throw new Error(`Unsupported language: ${targetLanguage}`);
      }

      // Ensure target language is loaded
      if (!this.preloadedLanguages.has(targetLanguage)) {
        await i18n.loadLanguages(targetLanguage);
        this.preloadedLanguages.add(targetLanguage);
      }

      // Parse URL components
      const [pathPart, queryString, hashFragment] = this.parseUrl(currentPath);
      
      // Extract language and path segments
      const pathParts = pathPart.split('/').filter(Boolean);
      if (pathParts.length === 0) {
        return this.buildFallbackPath(targetLanguage, queryString, hashFragment);
      }

      const currentLanguage = this.config.supportedLanguages.includes(pathParts[0]) 
        ? pathParts[0] 
        : i18n.language;

      // Early return if same language
      if (currentLanguage === targetLanguage) {
        return currentPath;
      }

      const pathWithoutLang = this.config.supportedLanguages.includes(pathParts[0])
        ? '/' + pathParts.slice(1).join('/')
        : '/' + pathParts.join('/');

      // Handle root path
      if (pathWithoutLang === '/' || pathWithoutLang === '') {
        return `/${targetLanguage}${queryString}${hashFragment}`;
      }

      // Get route key for current path
      const routeKey = this.getCachedRouteKey(
        pathWithoutLang.substring(1),
        currentLanguage
      );

      if (!routeKey) {
        return this.handleTranslationFailure(
          currentPath,
          targetLanguage,
          pathWithoutLang,
          queryString,
          hashFragment
        );
      }

      // Get translation for target language
      const translatedPath = this.getCachedTranslation(routeKey, targetLanguage);
      
      if (!translatedPath) {
        return this.handleTranslationFailure(
          currentPath,
          targetLanguage,
          pathWithoutLang,
          queryString,
          hashFragment
        );
      }

      // Handle dynamic segments
      const finalPath = this.preserveDynamicSegments(
        pathWithoutLang,
        translatedPath
      );

      const result = `/${targetLanguage}/${finalPath}${queryString}${hashFragment}`;
      
      // Update metrics
      this.metrics.translationTime = performance.now() - startTime;
      
      return result;

    } catch (error) {
      this.metrics.errorCount++;
      this.metrics.lastError = error as Error;
      
      console.error('Enterprise routing error:', error);
      
      // Return safe fallback
      return this.buildFallbackPath(targetLanguage);
    }
  }

  /**
   * Parse URL into components for processing
   */
  private parseUrl(url: string): [string, string, string] {
    const [pathPart, ...rest] = url.split(/[?#]/);
    const queryString = rest.join('').includes('?') 
      ? `?${rest.join('').split('?')[1].split('#')[0]}` 
      : '';
    const hashFragment = rest.join('').includes('#') 
      ? `#${rest.join('').split('#')[1]}` 
      : '';
    
    return [pathPart, queryString, hashFragment];
  }

  /**
   * Build safe fallback path
   */
  private buildFallbackPath(
    targetLanguage: string,
    queryString: string = '',
    hashFragment: string = ''
  ): string {
    const dashboardPath = this.getCachedTranslation('routes.dashboard', targetLanguage) 
      || 'dashboard';
    return `/${targetLanguage}/${dashboardPath}${queryString}${hashFragment}`;
  }

  /**
   * Handle translation failures based on configuration
   */
  private handleTranslationFailure(
    currentPath: string,
    targetLanguage: string,
    pathWithoutLang: string,
    queryString: string,
    hashFragment: string
  ): string {
    switch (this.config.fallbackBehavior) {
      case 'redirect':
        return this.buildFallbackPath(targetLanguage, queryString, hashFragment);
      
      case 'preserve':
        return `/${targetLanguage}${pathWithoutLang}${queryString}${hashFragment}`;
      
      case 'error':
        throw new Error(`Cannot translate path: ${currentPath} to language: ${targetLanguage}`);
      
      default:
        return this.buildFallbackPath(targetLanguage, queryString, hashFragment);
    }
  }

  /**
   * Preserve dynamic segments when translating paths
   */
  private preserveDynamicSegments(originalPath: string, translatedPath: string): string {
    const originalSegments = originalPath.substring(1).split('/');
    const translatedSegments = translatedPath.split('/');

    // If segment counts match, try to preserve dynamic values
    if (originalSegments.length === translatedSegments.length) {
      let result = translatedPath;
      
      translatedSegments.forEach((segment, index) => {
        if (segment.startsWith(':') && originalSegments[index]) {
          result = result.replace(segment, originalSegments[index]);
        }
      });
      
      return result;
    }

    return translatedPath;
  }

  /**
   * Get performance metrics
   */
  public getMetrics(): RouteMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset metrics (useful for monitoring systems)
   */
  public resetMetrics(): void {
    this.metrics = {
      translationTime: 0,
      cacheHits: 0,
      cacheMisses: 0,
      errorCount: 0,
    };
  }

  /**
   * Clear caches (useful for memory management)
   */
  public clearCaches(): void {
    this.translationCache.clear();
    this.routeKeyCache.clear();
  }

  /**
   * Get cache statistics
   */
  public getCacheStats() {
    return {
      translationCache: {
        size: this.translationCache.size,
        maxSize: this.translationCache.max,
        hitRate: this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses) || 0,
      },
      routeKeyCache: {
        size: this.routeKeyCache.size,
        maxSize: this.routeKeyCache.max,
      },
    };
  }
}

// Export singleton instance
export const enterpriseRouting = EnterpriseRoutingSystem.getInstance();

// Export types for external use
export type { RouteMetrics, EnterpriseRoutingConfig };
