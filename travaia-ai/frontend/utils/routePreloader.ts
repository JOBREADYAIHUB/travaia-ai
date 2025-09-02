/**
 * Enterprise Route Preloader for TRAVAIA
 * Preloads critical routes and translations for optimal performance
 */

import i18n from '../i18n';
import { enterpriseRouting } from './enterpriseRouting';

interface PreloadConfig {
  criticalLanguages: string[];
  criticalRoutes: string[];
  preloadOnIdle: boolean;
  maxConcurrentPreloads: number;
}

class RoutePreloader {
  private static instance: RoutePreloader;
  private config: PreloadConfig;
  private preloadQueue: Array<{ language: string; routes: string[] }> = [];
  private isPreloading = false;
  private preloadedCombinations = new Set<string>();

  private constructor(config: PreloadConfig) {
    this.config = config;
    this.initializePreloading();
  }

  public static getInstance(config?: PreloadConfig): RoutePreloader {
    if (!RoutePreloader.instance) {
      const defaultConfig: PreloadConfig = {
        criticalLanguages: ['en', 'es'], // Most common languages
        criticalRoutes: [
          'routes.dashboard',
          'routes.login',
          'routes.analytics',
          'routes.profile',
          'routes.jobs',
        ],
        preloadOnIdle: true,
        maxConcurrentPreloads: 3,
      };
      
      RoutePreloader.instance = new RoutePreloader(config || defaultConfig);
    }
    return RoutePreloader.instance;
  }

  private initializePreloading(): void {
    // Start preloading critical combinations
    this.preloadCriticalRoutes();

    // Set up idle preloading
    if (this.config.preloadOnIdle && 'requestIdleCallback' in window) {
      this.scheduleIdlePreloading();
    }
  }

  private async preloadCriticalRoutes(): Promise<void> {
    const { criticalLanguages, criticalRoutes } = this.config;
    
    for (const language of criticalLanguages) {
      this.preloadQueue.push({ language, routes: criticalRoutes });
    }

    this.processPreloadQueue();
  }

  private scheduleIdlePreloading(): void {
    const idleCallback = () => {
      if (!this.isPreloading && this.preloadQueue.length > 0) {
        this.processPreloadQueue();
      }
      
      // Schedule next idle callback
      if ('requestIdleCallback' in window) {
        (window as any).requestIdleCallback(idleCallback, { timeout: 5000 });
      }
    };

    (window as any).requestIdleCallback(idleCallback);
  }

  private async processPreloadQueue(): Promise<void> {
    if (this.isPreloading || this.preloadQueue.length === 0) return;

    this.isPreloading = true;
    const batch = this.preloadQueue.splice(0, this.config.maxConcurrentPreloads);

    const preloadPromises = batch.map(async ({ language, routes }) => {
      try {
        // Load language resources
        await i18n.loadLanguages(language);
        
        // Preload route translations
        for (const routeKey of routes) {
          const combinationKey = `${language}:${routeKey}`;
          
          if (!this.preloadedCombinations.has(combinationKey)) {
            const translations = i18n.getDataByLanguage(language)?.translation;
            const translation = translations?.[routeKey];
            
            if (translation) {
              // Warm up the enterprise routing cache
              await enterpriseRouting.mapPathToLanguage(`/en/${translation}`, language);
              this.preloadedCombinations.add(combinationKey);
            }
          }
        }
      } catch (error) {
        console.warn(`Preload failed for ${language}:`, error);
      }
    });

    await Promise.allSettled(preloadPromises);
    this.isPreloading = false;

    // Continue processing if there are more items
    if (this.preloadQueue.length > 0) {
      setTimeout(() => this.processPreloadQueue(), 100);
    }
  }

  public preloadLanguageRoutes(language: string, routes: string[]): void {
    this.preloadQueue.push({ language, routes });
    
    if (!this.isPreloading) {
      this.processPreloadQueue();
    }
  }

  public getPreloadStats() {
    return {
      preloadedCombinations: this.preloadedCombinations.size,
      queueLength: this.preloadQueue.length,
      isPreloading: this.isPreloading,
    };
  }
}

export const routePreloader = RoutePreloader.getInstance();
