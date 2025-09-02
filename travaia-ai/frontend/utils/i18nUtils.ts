import i18n from '../i18n';

// Tracks whether each language's resources have been loaded
const loadedLanguages: Record<string, boolean> = {};

// Default supported languages - could be moved to a central config
export const supportedLanguages = ['en', 'es', 'fr', 'de', 'ar'];

// Map of common translation keys to check for during route translation
export const routeTranslationKeys: Record<string, string> = {
  dashboard: 'routes.dashboard',
  resume: 'routes.resume-builder', 
  documents: 'routes.documents',
  interview: 'routes.interview',
  jobs: 'routes.job-tracker',
  analytics: 'routes.analytics',
  profile: 'routes.profile'
};

/**
 * Check if a language's resources are already loaded
 */
export const isLanguageLoaded = (language: string): boolean => {
  return !!loadedLanguages[language];
};

/**
 * Marks a language as loaded in our tracking system
 */
export const markLanguageAsLoaded = (language: string): void => {
  loadedLanguages[language] = true;
};

/**
 * Ensures a language's resources are loaded before proceeding
 * Returns a promise that resolves when the language is ready
 */
export const ensureLanguageLoaded = async (language: string): Promise<void> => {
  // If language is already loaded, resolve immediately
  if (isLanguageLoaded(language)) {
    return Promise.resolve();
  }
  
  // Load language resources
  return new Promise((resolve) => {
    // i18next-http-backend will fetch the language resources
    i18n.loadLanguages(language).then(() => {
      markLanguageAsLoaded(language);
      resolve();
    }).catch(err => {
      console.error(`Failed to load language resources for ${language}:`, err);
      resolve(); // Resolve anyway to prevent blocking UI
    });
  });
};

/**
 * Find a route key by its translated value in a specific language
 */
export const findRouteKeyByTranslation = (
  translatedPath: string,
  language: string
): string | null => {
  const translations = i18n.getDataByLanguage(language)?.translation || {};
  
  for (const key in translations) {
    if (key.startsWith('routes.') && translations[key] === translatedPath) {
      return key;
    }
  }
  
  return null;
};

/**
 * Get the translated path for a route key in the target language
 */
export const getTranslatedPathForKey = (
  routeKey: string,
  targetLanguage: string
): string | null => {
  const translations = i18n.getDataByLanguage(targetLanguage)?.translation || {};
  return translations[routeKey] || null;
};

/**
 * Maps a path segment from one language to another
 * @returns The translated segment or the original if no translation found
 */
export const translatePathSegment = (
  segment: string,
  fromLanguage: string,
  toLanguage: string
): string => {
  // Skip translation for segments that look like IDs
  if (!segment || /^[0-9a-f-]+$/.test(segment)) {
    return segment;
  }
  
  // Find route key for this segment in the source language
  const routeKey = findRouteKeyByTranslation(segment, fromLanguage);
  if (!routeKey) return segment;
  
  // Get translation in target language
  const translatedSegment = getTranslatedPathForKey(routeKey, toLanguage);
  return translatedSegment || segment;
};
