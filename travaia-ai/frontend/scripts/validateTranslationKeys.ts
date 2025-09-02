import { en } from '../locales/en';
import { fr } from '../locales/fr';
import { es } from '../locales/es';
import { de } from '../locales/de';
import { ar } from '../locales/ar';
import {
  hasBalancedPlaceholders,
  hasValidICUFormat,
  isValidKeyFormat,
} from '../utils/translationFormatters';

interface ValidationReport {
  invalidKeyNames: string[];
  unbalancedPlaceholders: {
    [language: string]: {
      [key: string]: string;
    };
  };
  invalidICUFormats: {
    [language: string]: {
      [key: string]: string;
    };
  };
  dateFormatInconsistencies: string[];
  summary: {
    totalKeys: number;
    invalidKeys: number;
    unbalancedPlaceholderCount: number;
    invalidICUFormatCount: number;
  };
}

/**
 * Validates all translation keys across all languages
 */
const validateTranslations = (): ValidationReport => {
  const allLanguages = { en, fr, es, de, ar };
  const languages = Object.keys(allLanguages);

  const report: ValidationReport = {
    invalidKeyNames: [],
    unbalancedPlaceholders: {},
    invalidICUFormats: {},
    dateFormatInconsistencies: [],
    summary: {
      totalKeys: Object.keys(en).length,
      invalidKeys: 0,
      unbalancedPlaceholderCount: 0,
      invalidICUFormatCount: 0,
    },
  };

  // Initialize language-specific sections
  languages.forEach((lang) => {
    report.unbalancedPlaceholders[lang] = {};
    report.invalidICUFormats[lang] = {};
  });

  // Check key naming conventions
  Object.keys(en).forEach((key) => {
    if (!isValidKeyFormat(key)) {
      report.invalidKeyNames.push(key);
      report.summary.invalidKeys++;
    }
  });

  // Check for balanced placeholders and valid ICU format
  languages.forEach((lang) => {
    const translations = allLanguages[lang as keyof typeof allLanguages];

    Object.entries(translations).forEach(([key, value]) => {
      // Skip non-string values (shouldn't happen in normal translations)
      if (typeof value !== 'string') return;

      // Check balanced placeholders
      if (!hasBalancedPlaceholders(value)) {
        report.unbalancedPlaceholders[lang][key] = value;
        report.summary.unbalancedPlaceholderCount++;
      }

      // Check ICU format validity
      if (
        value.includes('{') &&
        value.includes(',') &&
        !hasValidICUFormat(value)
      ) {
        report.invalidICUFormats[lang][key] = value;
        report.summary.invalidICUFormatCount++;
      }

      // Check for date format inconsistencies
      if (
        key.toLowerCase().includes('date') &&
        lang !== 'en' &&
        value.includes('/')
      ) {
        const enValue = en[key];
        const hasDateFormatDifference =
          (enValue.includes('MM/DD/YYYY') && value.includes('DD/MM/YYYY')) ||
          (enValue.includes('DD/MM/YYYY') && value.includes('MM/DD/YYYY'));

        if (hasDateFormatDifference) {
          report.dateFormatInconsistencies.push(`${lang}.${key}`);
        }
      }
    });
  });

  return report;
};

/**
 * Prints the validation report in a readable format
 */
const printValidationReport = () => {
  const report = validateTranslations();

  console.log('\n=== Translation Validation Report ===\n');
  console.log(`Total keys: ${report.summary.totalKeys}`);
  console.log(`Keys with invalid naming: ${report.invalidKeyNames.length}`);
  console.log(
    `Keys with unbalanced placeholders: ${report.summary.unbalancedPlaceholderCount}`,
  );
  console.log(
    `Keys with invalid ICU format: ${report.summary.invalidICUFormatCount}`,
  );
  console.log(
    `Date format inconsistencies: ${report.dateFormatInconsistencies.length}`,
  );

  if (report.invalidKeyNames.length > 0) {
    console.log('\n--- Invalid Key Names ---');
    report.invalidKeyNames.slice(0, 10).forEach((key) => {
      console.log(`- "${key}"`);
    });
    if (report.invalidKeyNames.length > 10) {
      console.log(`... and ${report.invalidKeyNames.length - 10} more`);
    }
  }

  console.log('\n--- Unbalanced Placeholders ---');
  let hasUnbalancedPlaceholders = false;

  Object.keys(report.unbalancedPlaceholders).forEach((lang) => {
    const keys = Object.keys(report.unbalancedPlaceholders[lang]);
    if (keys.length > 0) {
      hasUnbalancedPlaceholders = true;
      console.log(`\n${lang.toUpperCase()}:`);
      keys.slice(0, 5).forEach((key) => {
        console.log(
          `- "${key}": "${report.unbalancedPlaceholders[lang][key]}"`,
        );
      });
      if (keys.length > 5) {
        console.log(`... and ${keys.length - 5} more in ${lang}`);
      }
    }
  });

  if (!hasUnbalancedPlaceholders) {
    console.log('No unbalanced placeholders found');
  }

  console.log('\n--- Invalid ICU Formats ---');
  let hasInvalidICU = false;

  Object.keys(report.invalidICUFormats).forEach((lang) => {
    const keys = Object.keys(report.invalidICUFormats[lang]);
    if (keys.length > 0) {
      hasInvalidICU = true;
      console.log(`\n${lang.toUpperCase()}:`);
      keys.slice(0, 5).forEach((key) => {
        console.log(`- "${key}": "${report.invalidICUFormats[lang][key]}"`);
      });
      if (keys.length > 5) {
        console.log(`... and ${keys.length - 5} more in ${lang}`);
      }
    }
  });

  if (!hasInvalidICU) {
    console.log('No invalid ICU formats found');
  }

  if (report.dateFormatInconsistencies.length > 0) {
    console.log('\n--- Date Format Inconsistencies ---');
    report.dateFormatInconsistencies.forEach((item) => {
      console.log(`- ${item}`);
    });
  }

  console.log('\n=== End of Report ===');
};

// Run the validation
printValidationReport();
