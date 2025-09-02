/**
 * i18n Routing Test Helper
 * This file provides test utilities to verify URL translations across languages
 * Run this in a development environment to test all language combinations
 */
import i18n from '../../i18n';
import { mapPathToLanguage } from '../routeUtils';
import { 
  supportedLanguages, 
  ensureLanguageLoaded,
  routeTranslationKeys
} from '../i18nUtils';

/**
 * Test all language path translations for a specific route
 * @param path The base path to test (e.g., '/dashboard')
 */
export const testPathTranslations = async (path: string): Promise<void> => {
  console.group(`Testing translations for path: ${path}`);
  
  // First load all languages to ensure tests work properly
  for (const lang of supportedLanguages) {
    await ensureLanguageLoaded(lang);
    console.log(`✅ Loaded language: ${lang}`);
  }
  
  // Test each language combination
  for (const sourceLang of supportedLanguages) {
    const sourcePath = sourceLang === 'en' ? path : await mapPathToLanguage(`/en${path}`, sourceLang);
    
    console.group(`Source language: ${sourceLang} (${sourcePath})`);
    
    for (const targetLang of supportedLanguages) {
      if (sourceLang === targetLang) continue;
      
      try {
        const translatedPath = await mapPathToLanguage(`/${sourceLang}${sourcePath.startsWith('/') ? sourcePath : `/${sourcePath}`}`, targetLang);
        console.log(`${sourceLang} → ${targetLang}: ${translatedPath}`);
      } catch (error) {
        console.error(`❌ Error translating ${sourceLang} → ${targetLang}:`, error);
      }
    }
    
    console.groupEnd();
  }
  
  console.groupEnd();
};

/**
 * Test all route key translations across languages
 * Verifies that all route keys defined in routeTranslationKeys are properly translated
 */
export const testAllRouteKeys = async (): Promise<void> => {
  console.group('Testing all route key translations');
  
  // First load all languages
  for (const lang of supportedLanguages) {
    await ensureLanguageLoaded(lang);
  }
  
  // Test each route key
  for (const [routeName, routeKey] of Object.entries(routeTranslationKeys)) {
    console.group(`Route: ${routeName} (${routeKey})`);
    
    for (const lang of supportedLanguages) {
      const translation = i18n.getDataByLanguage(lang)?.translation?.[routeKey];
      console.log(`${lang}: ${translation || '❌ Missing translation'}`);
    }
    
    console.groupEnd();
  }
  
  console.groupEnd();
};

/**
 * Comprehensive test for all route translations including edge cases
 */
export const testComprehensive = async (): Promise<void> => {
  // Basic routes
  await testPathTranslations('/dashboard');
  await testPathTranslations('/resume-builder');
  await testPathTranslations('/document-manager');
  await testPathTranslations('/job-tracker');
  await testPathTranslations('/analytics');
  await testPathTranslations('/mock-interview');
  
  // Routes with dynamic segments
  await testPathTranslations('/job-tracker/12345');
  await testPathTranslations('/document-manager/resume/67890');
  
  // Routes with query parameters
  await testPathTranslations('/job-tracker?sort=date&filter=active');
  
  // Routes with hash fragments
  await testPathTranslations('/analytics#performance');
  
  // Edge cases - complex path
  await testPathTranslations('/job-tracker/12345?view=detailed&lang=en#history');
  
  // Test all route keys
  await testAllRouteKeys();
};

// For convenience, expose a function to run all tests
export const runAllTests = async (): Promise<void> => {
  console.log('🧪 Running comprehensive i18n routing tests...');
  await testComprehensive();
  console.log('✅ All tests complete!');
};
