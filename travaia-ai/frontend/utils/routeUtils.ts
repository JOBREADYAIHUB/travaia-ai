import i18n from '../i18n';
import { 
  supportedLanguages, 
  ensureLanguageLoaded, 
  translatePathSegment, 
  routeTranslationKeys
} from './i18nUtils';

/**
 * Maps a translated path to its canonical route key
 * @param path The current path (without language prefix)
 * @param language The language to use for translation lookup
 * @returns The canonical route key (e.g., 'routes.dashboard')
 */
export const getCanonicalRouteKey = (
  path: string,
  language: string = i18n.language,
): string | null => {
  const translations = i18n.getDataByLanguage(language)?.translation;
  if (!translations) return null;

  // Clean the path (remove leading slash and any trailing slashes)
  const cleanedPath = path.replace(/^\/+|\/+$/g, '');

  // Special case for resume-builder to ensure compatibility with both routes.resume and routes.resume-builder
  if (cleanedPath === 'resume-builder') {
    // Check if routes.resume-builder exists in translations
    if (translations['routes.resume-builder'] === 'resume-builder') {
      return 'routes.resume-builder';
    }
    // Fallback to routes.resume if it exists and matches
    if (translations['routes.resume'] === 'resume-builder') {
      return 'routes.resume';
    }
  }

  // First, try direct match with route translations
  for (const key in translations) {
    if (key.startsWith('routes.')) {
      const routeValue = translations[key];
      if (typeof routeValue === 'string' && routeValue === cleanedPath) {
        return key;
      }
    }
  }

  // If no direct match, try matching with dynamic segments
  for (const key in translations) {
    if (key.startsWith('routes.')) {
      const routeValue = translations[key];
      if (typeof routeValue === 'string') {
        // Convert route pattern to regex (handling dynamic segments like :id)
        const routePattern = routeValue.replace(/:[a-zA-Z0-9_]+/g, '([^/]+)');
        const routeRegex = new RegExp(`^${routePattern}$`);

        if (routeRegex.test(cleanedPath)) {
          return key;
        }
      }
    }
  }

  return null;
};

/**
 * Gets the translated path for a canonical route key in the specified language
 * @param routeKey The canonical route key (e.g., 'routes.dashboard')
 * @param language The target language
 * @returns The translated path for the specified language
 */
export const getTranslatedPath = (
  routeKey: string,
  language: string,
): string | null => {
  const translations = i18n.getDataByLanguage(language)?.translation;
  if (!translations || !routeKey) return null;

  const translatedPath = translations[routeKey];
  return typeof translatedPath === 'string' ? translatedPath : null;
};

/**
 * Maps the current path to its equivalent in another language
 * Enterprise-grade implementation with robust error handling and fallbacks
 * @param currentPath The current full path (with language prefix)
 * @param targetLanguage The target language to translate to
 * @returns A promise that resolves to the equivalent path in the target language
 */
export const mapPathToLanguage = async (
  currentPath: string,
  targetLanguage: string,
): Promise<string> => {
  try {
    // First, ensure the target language resources are loaded
    await ensureLanguageLoaded(targetLanguage);
    
    // Extract URL components (path, query string, hash)
    const [pathPart, ...rest] = currentPath.split(/[?#]/);
    const queryString = rest.join('').includes('?') ? `?${rest.join('').split('?')[1].split('#')[0]}` : '';
    const hashFragment = rest.join('').includes('#') ? `#${rest.join('').split('#')[1]}` : '';

    // Default fallback path - use localized dashboard route
    const translations = i18n.getDataByLanguage(targetLanguage)?.translation;
    const localizedDashboard = translations?.['routes.dashboard'] || 'dashboard';
    const fallbackPath = `/${targetLanguage}/${localizedDashboard}${queryString}${hashFragment}`;
  
    // Extract current language and path
    const pathParts = pathPart.split('/').filter(Boolean);
    if (pathParts.length === 0) return fallbackPath;
    
    // Determine current language from path or fallback to i18n current language
    const currentLanguage = supportedLanguages.includes(pathParts[0]) ? pathParts[0] : i18n.language;
    
    // If current language is the same as target, just return the current path
    if (currentLanguage === targetLanguage) {
      return currentPath;
    }
    
    // Detect RTL language transitions (especially Arabic)
    const isFromArabic = currentLanguage === 'ar';
    const isToArabic = targetLanguage === 'ar';
    
    // Build path without language prefix for translation lookup
    const pathWithoutLang = supportedLanguages.includes(pathParts[0])
      ? '/' + pathParts.slice(1).join('/')
      : '/' + pathParts.join('/');
      
    // Special case for root path
    if (pathWithoutLang === '/' || pathWithoutLang === '') {
      return `/${targetLanguage}${queryString}${hashFragment}`;
    }
    
    // Use a more modular approach for route translation, no hardcoded routes needed
    // First check if this is a root/canonical route using our shared route keys
    const cleanPath = pathWithoutLang.startsWith('/') ? pathWithoutLang.substring(1) : pathWithoutLang;
    const firstSegment = cleanPath.split('/')[0];
    
    // Arabic-specific handling: If coming from Arabic and URL structure is different,
    // we need to be extra careful about the translation
    if (isFromArabic && !isToArabic) {
      console.log('Special handling: RTL to LTR transition (Arabic to other language)');
      // For safety, check if we can identify this as a known page
      for (const [, routeKey] of Object.entries(routeTranslationKeys)) {
        const arabicName = i18n.getDataByLanguage('ar')?.translation?.[routeKey];
        // If we find a match in the Arabic routes, use the direct mapping
        if (arabicName && firstSegment === arabicName) {
          const targetName = translations?.[routeKey];
          if (targetName) {
            console.log(`Found direct Arabic route mapping: ${arabicName} → ${targetName}`);
            const remainingSegments = cleanPath.includes('/') ? cleanPath.substring(cleanPath.indexOf('/')) : '';
            return `/${targetLanguage}/${targetName}${remainingSegments}${queryString}${hashFragment}`;
          }
        }
      }
      // If no direct match found for Arabic route, use safe fallback
      console.warn(`No direct Arabic route mapping found for ${firstSegment}, using dashboard fallback`);
      return fallbackPath;
    }
    
    // Standard route key matching for non-Arabic transitions
    // Try to match this path against our known route keys
    for (const [, routeKey] of Object.entries(routeTranslationKeys)) {
      const currentTranslation = i18n.getDataByLanguage(currentLanguage)?.translation?.[routeKey];
      if (currentTranslation === firstSegment) {
        // Found a match! Get the translation for target language
        const targetTranslation = i18n.getDataByLanguage(targetLanguage)?.translation?.[routeKey];
        if (targetTranslation) {
          // Replace the first segment with the translation
          const remainingSegments = cleanPath.includes('/') ? cleanPath.substring(cleanPath.indexOf('/')) : '';
          return `/${targetLanguage}/${targetTranslation}${remainingSegments}${queryString}${hashFragment}`;
        }
      }
    }
    
    // Try to get canonical route key for the current path
    const routeKey = getCanonicalRouteKey(
      pathWithoutLang.substring(1),
      currentLanguage,
    );
    
    // If no route key found, try segment-by-segment translation as fallback
    if (!routeKey) {
      console.warn(
        `Could not find canonical route key for path: ${pathWithoutLang} in language: ${currentLanguage}, attempting segment-by-segment translation`,
      );
      
      // Try segment-by-segment translation using our utility functions
      const currentSegments = pathWithoutLang.substring(1).split('/');
      const translatedSegments: string[] = [];
      
      for (const segment of currentSegments) {
        // Use our utility function to translate each segment
        const translatedSegment = translatePathSegment(segment, currentLanguage, targetLanguage);
        translatedSegments.push(translatedSegment);
      }
      
      if (translatedSegments.length > 0) {
        return `/${targetLanguage}/${translatedSegments.join('/')}${queryString}${hashFragment}`;
      }
      
      // For Arabic transitions, use fallback path instead of keeping original structure
      if (isFromArabic && !isToArabic) {
        console.warn('Arabic transition with no segment mapping, using dashboard fallback');
        return fallbackPath;
      }
      
      // Last resort: keep original path but change language prefix
      return `/${targetLanguage}${pathWithoutLang}${queryString}${hashFragment}`;
    }

    // Get translated path for the target language
    const translatedPath = getTranslatedPath(routeKey, targetLanguage);
    if (!translatedPath) {
      console.warn(
        `Could not find translation for route key: ${routeKey} in language: ${targetLanguage}, returning path with changed language prefix`,
      );
      
      // For all transitions, maintain consistent URL structure even when no translation is found
      // We previously had special handling for Arabic transitions, but this caused 404 errors
      console.warn(`Could not find translation for route key: ${routeKey} in language: ${targetLanguage}, maintaining URL structure with changed language prefix`);
      
      // Fallback: keep original path structure but change language prefix
      return `/${targetLanguage}${pathWithoutLang}${queryString}${hashFragment}`;
    }

    // Log successful mapping for debugging
    console.log(
      `Mapping path: ${currentPath} to ${targetLanguage} using route key: ${routeKey}, result: /${targetLanguage}/${translatedPath}${queryString}${hashFragment}`,
    );

    // Preserve dynamic segments from the original path
    const currentPathSegments = pathWithoutLang.substring(1).split('/');
    const translatedPathSegments = translatedPath.split('/');

    // Handle segment count mismatch more intelligently
    if (currentPathSegments.length !== translatedPathSegments.length) {
      console.warn(`Segment count mismatch during translation. Original: ${currentPathSegments.length}, Translated: ${translatedPathSegments.length}`);
      
      // Check if this is just a static page with no dynamic segments
      const hasDynamicSegments = translatedPathSegments.some(segment => segment.startsWith(':'));
      if (!hasDynamicSegments) {
        return `/${targetLanguage}/${translatedPath}${queryString}${hashFragment}`;
      }
      
      // Try to preserve IDs and numeric parameters by position
      const idPattern = /^[0-9a-f-]+$/; // UUID or numeric ID pattern
      let patchedTranslatedPath = translatedPath;
      
      // Replace dynamic segments with corresponding values from original path where possible
      translatedPathSegments.forEach((segment, index) => {
        if (segment.startsWith(':') && currentPathSegments[index]) {
          patchedTranslatedPath = patchedTranslatedPath.replace(
            segment, 
            currentPathSegments[index]
          );
        } else if (segment.startsWith(':') && index < currentPathSegments.length) {
          // Find the next segment in original path that looks like an ID
          for (let i = 0; i < currentPathSegments.length; i++) {
            if (idPattern.test(currentPathSegments[i])) {
              patchedTranslatedPath = patchedTranslatedPath.replace(
                segment, 
                currentPathSegments[i]
              );
              break;
            }
          }
        }
      });
      
      return `/${targetLanguage}/${patchedTranslatedPath}${queryString}${hashFragment}`;
    }

    // Replace dynamic segments in the translated path
    let resultPath = translatedPath;
    for (let i = 0; i < translatedPathSegments.length; i++) {
      if (translatedPathSegments[i].startsWith(':')) {
        // This is a dynamic segment, preserve the value from the current path
        const paramName = translatedPathSegments[i];
        const paramValue = currentPathSegments[i] || '';
        resultPath = resultPath.replace(paramName, paramValue);
      }
    }

    return `/${targetLanguage}/${resultPath}${queryString}${hashFragment}`;
  } catch (error) {
    console.error('Error in mapPathToLanguage:', error);
    
    // Safe fallback - redirect to the main dashboard in target language
    // This prevents 404 errors when switching languages
    const translations = i18n.getDataByLanguage(targetLanguage)?.translation;
    const dashboardPath = translations?.['routes.dashboard'] || 'dashboard';
    return `/${targetLanguage}/${dashboardPath}`;
  }

};

/**
 * Ensures the i18n language state is synchronized with the URL language prefix
 * @param urlLanguage The language from the URL
 */
export const synchronizeLanguage = (urlLanguage: string): void => {
  if (urlLanguage && i18n.language !== urlLanguage) {
    i18n.changeLanguage(urlLanguage);
  }
};
