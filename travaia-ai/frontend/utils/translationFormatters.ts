/**
 * Utility functions for standardizing i18n translation formats
 */

/**
 * Validates if a translation key follows the recommended naming convention.
 * Naming convention: namespace.section.subsection
 *
 * @param key Translation key to validate
 * @returns True if valid, false otherwise
 */
export const isValidKeyFormat = (key: string): boolean => {
  const regex = /^[a-z]+(\.[a-z0-9]+)*$/;
  return regex.test(key) || key.includes('.');
};

/**
 * Validates if a translation string has properly balanced placeholder brackets
 *
 * @param text Translation string to validate
 * @returns True if valid, false otherwise
 */
export const hasBalancedPlaceholders = (text: string): boolean => {
  if (!text || typeof text !== 'string') return true;

  const stack: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    // Handle quotes which might be inside placeholders
    if (char === '"' || char === "'") {
      inQuotes = !inQuotes;
      continue;
    }

    // Skip characters inside quotes
    if (inQuotes) continue;

    if (char === '{') {
      stack.push(char);
    } else if (char === '}') {
      if (stack.length === 0 || stack.pop() !== '{') {
        return false;
      }
    }
  }

  return stack.length === 0;
};

/**
 * Validates ICU MessageFormat syntax for plurals and selects
 *
 * @param text Translation string to validate
 * @returns True if valid, false otherwise
 */
export const hasValidICUFormat = (text: string): boolean => {
  if (!text || typeof text !== 'string') return true;

  // Simple check for plural format: {count, plural, one {item} other {items}}
  const pluralRegex = /{([^{}]+),\s*plural\s*,([^{}]|{[^{}]*})*}/;

  // Simple check for select format: {gender, select, male {he} female {she} other {they}}
  const selectRegex = /{([^{}]+),\s*select\s*,([^{}]|{[^{}]*})*}/;

  const hasPluralFormat = pluralRegex.test(text);
  const hasSelectFormat = selectRegex.test(text);

  // If no ICU format detected, return true
  if (!hasPluralFormat && !hasSelectFormat) return true;

  // This is a very basic check. A more robust validation would require a proper parser
  // We just check if there are paired brackets after plural/select keyword
  try {
    let inICU = false;
    let bracketCount = 0;
    let inOption = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];

      if (char === '{') {
        bracketCount++;
        if (bracketCount === 1) inICU = true;
      } else if (char === '}') {
        bracketCount--;
        if (bracketCount === 0) inICU = false;
      }

      if (
        inICU &&
        (text.substring(i).startsWith('plural,') ||
          text.substring(i).startsWith('select,'))
      ) {
        inOption = true;
      }

      if (inOption && bracketCount < 2) {
        return false;
      }
    }

    return bracketCount === 0;
  } catch (e) {
    return false;
  }
};

/**
 * Standardizes date/time format across translations
 *
 * @param format Original format string
 * @param locale Locale to standardize for
 * @returns Standardized format string for the locale
 */
export const standardizeDateFormat = (
  format: string,
  locale: string,
): string => {
  // Basic standardization rules
  switch (locale) {
    case 'en':
      return format.replace(/DD\/MM\/YYYY/g, 'MM/DD/YYYY');
    case 'fr':
    case 'es':
    case 'de':
      return format.replace(/MM\/DD\/YYYY/g, 'DD/MM/YYYY');
    case 'ar':
      // Arabic uses different date separators traditionally
      return format.replace(/MM\/DD\/YYYY/g, 'DD/MM/YYYY').replace(/\//g, '-');
    default:
      return format;
  }
};

/**
 * Generates a standard HTML language attribute value from locale code
 *
 * @param locale Locale code (e.g., 'en-US')
 * @returns Standardized language code (e.g., 'en')
 */
export const standardizeLanguageCode = (locale: string): string => {
  if (!locale) return 'en';

  // Extract the primary language code
  const primaryCode = locale.split('-')[0].toLowerCase();
  return primaryCode;
};

export default {
  isValidKeyFormat,
  hasBalancedPlaceholders,
  hasValidICUFormat,
  standardizeDateFormat,
  standardizeLanguageCode,
};
