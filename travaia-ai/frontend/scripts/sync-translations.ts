import * as fs from 'fs';
import * as path from 'path';
import { en } from '../locales/en';
import { fr } from '../locales/fr';
import { es } from '../locales/es';
import { de } from '../locales/de';
import { ar } from '../locales/ar';
import { Translations } from '../types';

/**
 * Utility to synchronize translation keys across all locale files
 * 
 * This script ensures that all keys present in the English source file
 * are also present in all other locale files, with appropriate placeholder values
 * for missing translations.
 */

// List of supported languages
const languages = ['fr', 'es', 'de', 'ar'];

// Missing translation prefix
const MISSING_TRANSLATION_PREFIX = '[MISSING_TRANSLATION]: ';

/**
 * Deep merges source object (English) into target object (other language)
 * - Preserves existing translations in target
 * - Adds missing keys from source with placeholder values
 * - Maintains the nested structure exactly as in the source
 * - Does not remove keys in target that don't exist in source
 */
function synchronizeTranslations(
  sourceObj: any, 
  targetObj: any, 
  path = ''
): any {
  const result = { ...targetObj };

  // Iterate through all keys in the source object
  for (const key in sourceObj) {
    const currentPath = path ? `${path}.${key}` : key;
    
    // If key doesn't exist in target, add it with a placeholder
    if (!(key in result)) {
      if (typeof sourceObj[key] === 'object' && sourceObj[key] !== null) {
        // For nested objects, create the structure
        result[key] = {};
        result[key] = synchronizeTranslations(sourceObj[key], result[key], currentPath);
      } else {
        // For string values, add with placeholder
        result[key] = `${MISSING_TRANSLATION_PREFIX}${sourceObj[key]}`;
      }
    } 
    // If the key exists but is a nested object, recursively sync
    else if (
      typeof sourceObj[key] === 'object' && 
      sourceObj[key] !== null &&
      typeof result[key] === 'object' && 
      result[key] !== null
    ) {
      result[key] = synchronizeTranslations(sourceObj[key], result[key], currentPath);
    }
    // Otherwise, keep the existing translation (even if it's different in structure)
  }

  return result;
}

/**
 * Special handling for route translations to ensure they have actual translations
 * instead of placeholders
 */
function ensureRouteTranslations(result: Translations): Translations {
  // Routes are critical for navigation and should have actual translations, not placeholders
  Object.keys(result).forEach(key => {
    if (key.startsWith('routes.') && result[key].startsWith(MISSING_TRANSLATION_PREFIX)) {
      // For route keys with missing translations, use the English value without the prefix
      result[key] = en[key as keyof typeof en];
    }
  });
  return result;
}

/**
 * Process a specific language file
 */
function processLanguage(lang: string) {
  console.log(`Processing ${lang} translations...`);
  
  let targetTranslations;
  switch(lang) {
    case 'fr':
      targetTranslations = fr;
      break;
    case 'es':
      targetTranslations = es;
      break;
    case 'de':
      targetTranslations = de;
      break;
    case 'ar':
      targetTranslations = ar;
      break;
    default:
      throw new Error(`Unsupported language: ${lang}`);
  }

  // Synchronize translations
  const synchronized = synchronizeTranslations(en, targetTranslations);
  
  // Ensure route translations have actual values
  const result = ensureRouteTranslations(synchronized);

  // Generate file content
  const fileContent = `import { Translations } from '../types';\n\nexport const ${lang}: Translations = ${JSON.stringify(result, null, 2)};\n`;
  
  // Format the file content (convert double to single quotes, etc.)
  const formattedContent = fileContent
    .replace(/"([^"]+)":/g, "'$1':") // Convert property names to single quotes
    .replace(/: "([^"]*)"/g, (match, p1) => {
      // Keep MISSING_TRANSLATION prefix in double quotes
      if (p1.startsWith(MISSING_TRANSLATION_PREFIX)) {
        return `: "${p1}"`;
      }
      // Convert other string values to single quotes
      return `: '${p1.replace(/'/g, "\\'")}'`;
    });

  // Write the synchronized translations back to the file
  const filePath = path.join(__dirname, '..', 'locales', `${lang}.ts`);
  fs.writeFileSync(filePath, formattedContent, 'utf8');
  
  console.log(`✓ ${lang} translations synchronized successfully.`);
}

/**
 * Main execution function
 */
function main() {
  console.log('Starting translation synchronization...');
  
  // Process each language
  languages.forEach(processLanguage);
  
  console.log('All translations synchronized successfully!');
}

// Execute the script
main();
