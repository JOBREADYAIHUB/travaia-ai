#!/usr/bin/env node

/**
 * Translation Key Validation Script
 * Validates translation coverage, finds missing keys, and reports inconsistencies
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const LOCALES_DIR = path.join(__dirname, '../locales');
const COMPONENTS_DIR = path.join(__dirname, '../components');
const SUPPORTED_LANGUAGES = ['en', 'fr', 'es', 'de', 'ar'];
const BASE_LANGUAGE = 'en';

class TranslationValidator {
  constructor() {
    this.translations = {};
    this.usedKeys = new Set();
    this.missingKeys = {};
    this.duplicateKeys = {};
    this.unusedKeys = {};
  }

  // Load all translation files
  loadTranslations() {
    console.log('📚 Loading translation files...');
    
    for (const lang of SUPPORTED_LANGUAGES) {
      const filePath = path.join(LOCALES_DIR, `${lang}.ts`);
      
      if (!fs.existsSync(filePath)) {
        console.warn(`⚠️  Translation file missing: ${lang}.ts`);
        continue;
      }

      try {
        // Read and parse the TypeScript file (simplified parsing)
        const content = fs.readFileSync(filePath, 'utf8');
        const keys = this.extractKeysFromContent(content);
        this.translations[lang] = keys;
        console.log(`✅ Loaded ${keys.length} keys from ${lang}.ts`);
      } catch (error) {
        console.error(`❌ Error loading ${lang}.ts:`, error.message);
      }
    }
  }

  // Extract translation keys from TypeScript content
  extractKeysFromContent(content) {
    const keys = [];
    const keyRegex = /['"`]([^'"`]+)['"`]\s*:/g;
    let match;

    while ((match = keyRegex.exec(content)) !== null) {
      const key = match[1];
      if (!key.startsWith('//') && !key.includes('export')) {
        keys.push(key);
      }
    }

    return keys;
  }

  // Find translation keys used in components
  findUsedKeys() {
    console.log('🔍 Scanning components for translation key usage...');
    
    const scanDir = (dir) => {
      const files = fs.readdirSync(dir);
      
      for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
          scanDir(filePath);
        } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
          this.scanFileForKeys(filePath);
        }
      }
    };

    scanDir(COMPONENTS_DIR);
    console.log(`🎯 Found ${this.usedKeys.size} unique translation keys in use`);
  }

  // Scan individual file for translation keys
  scanFileForKeys(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Match t('key') and t("key") patterns
      const tFunctionRegex = /t\(['"`]([^'"`]+)['"`]\)/g;
      let match;

      while ((match = tFunctionRegex.exec(content)) !== null) {
        this.usedKeys.add(match[1]);
      }

      // Match translate('key') patterns (legacy)
      const translateRegex = /translate\(['"`]([^'"`]+)['"`]\)/g;
      while ((match = translateRegex.exec(content)) !== null) {
        this.usedKeys.add(match[1]);
      }

    } catch (error) {
      console.warn(`⚠️  Could not scan ${filePath}:`, error.message);
    }
  }

  // Check for missing keys across languages
  checkMissingKeys() {
    console.log('🔍 Checking for missing translation keys...');
    
    const baseKeys = this.translations[BASE_LANGUAGE] || [];
    
    for (const lang of SUPPORTED_LANGUAGES) {
      if (lang === BASE_LANGUAGE) continue;
      
      const langKeys = this.translations[lang] || [];
      const missing = baseKeys.filter(key => !langKeys.includes(key));
      
      if (missing.length > 0) {
        this.missingKeys[lang] = missing;
      }
    }
  }

  // Check for duplicate keys within files
  checkDuplicateKeys() {
    console.log('🔍 Checking for duplicate translation keys...');
    
    for (const lang of SUPPORTED_LANGUAGES) {
      const keys = this.translations[lang] || [];
      const seen = new Set();
      const duplicates = [];
      
      for (const key of keys) {
        if (seen.has(key)) {
          duplicates.push(key);
        } else {
          seen.add(key);
        }
      }
      
      if (duplicates.length > 0) {
        this.duplicateKeys[lang] = duplicates;
      }
    }
  }

  // Check for unused keys
  checkUnusedKeys() {
    console.log('🔍 Checking for unused translation keys...');
    
    for (const lang of SUPPORTED_LANGUAGES) {
      const keys = this.translations[lang] || [];
      const unused = keys.filter(key => !this.usedKeys.has(key));
      
      if (unused.length > 0) {
        this.unusedKeys[lang] = unused;
      }
    }
  }

  // Generate comprehensive report
  generateReport() {
    console.log('\n📊 TRANSLATION VALIDATION REPORT');
    console.log('='.repeat(50));
    
    // Summary
    console.log('\n📈 SUMMARY:');
    for (const lang of SUPPORTED_LANGUAGES) {
      const keyCount = this.translations[lang]?.length || 0;
      const missingCount = this.missingKeys[lang]?.length || 0;
      const duplicateCount = this.duplicateKeys[lang]?.length || 0;
      const unusedCount = this.unusedKeys[lang]?.length || 0;
      
      console.log(`${lang.toUpperCase()}: ${keyCount} keys | ${missingCount} missing | ${duplicateCount} duplicates | ${unusedCount} unused`);
    }

    // Missing keys
    if (Object.keys(this.missingKeys).length > 0) {
      console.log('\n❌ MISSING KEYS:');
      for (const [lang, keys] of Object.entries(this.missingKeys)) {
        console.log(`\n${lang.toUpperCase()} (${keys.length} missing):`);
        keys.slice(0, 10).forEach(key => console.log(`  - ${key}`));
        if (keys.length > 10) {
          console.log(`  ... and ${keys.length - 10} more`);
        }
      }
    }

    // Duplicate keys
    if (Object.keys(this.duplicateKeys).length > 0) {
      console.log('\n🔄 DUPLICATE KEYS:');
      for (const [lang, keys] of Object.entries(this.duplicateKeys)) {
        console.log(`\n${lang.toUpperCase()} (${keys.length} duplicates):`);
        keys.forEach(key => console.log(`  - ${key}`));
      }
    }

    // Used vs Available
    console.log('\n📊 USAGE STATISTICS:');
    console.log(`Total keys in use: ${this.usedKeys.size}`);
    console.log(`Total keys in ${BASE_LANGUAGE}: ${this.translations[BASE_LANGUAGE]?.length || 0}`);
    
    const usageRate = this.translations[BASE_LANGUAGE] 
      ? (this.usedKeys.size / this.translations[BASE_LANGUAGE].length * 100).toFixed(1)
      : 0;
    console.log(`Usage rate: ${usageRate}%`);

    // Missing from base language
    const missingFromBase = Array.from(this.usedKeys).filter(
      key => !this.translations[BASE_LANGUAGE]?.includes(key)
    );
    
    if (missingFromBase.length > 0) {
      console.log(`\n🚨 KEYS USED BUT NOT IN ${BASE_LANGUAGE.toUpperCase()}:`);
      missingFromBase.slice(0, 20).forEach(key => console.log(`  - ${key}`));
      if (missingFromBase.length > 20) {
        console.log(`  ... and ${missingFromBase.length - 20} more`);
      }
    }

    // Recommendations
    console.log('\n💡 RECOMMENDATIONS:');
    
    if (Object.keys(this.missingKeys).length > 0) {
      console.log('1. Add missing translations to maintain consistency across languages');
    }
    
    if (Object.keys(this.duplicateKeys).length > 0) {
      console.log('2. Remove duplicate keys to fix TypeScript compilation errors');
    }
    
    if (missingFromBase.length > 0) {
      console.log('3. Add missing keys to base language file to prevent UI display issues');
    }
    
    if (usageRate < 80) {
      console.log('4. Consider removing unused keys to reduce bundle size');
    }

    console.log('\n✅ Validation complete!');
    
    // Exit with error code if issues found
    const hasIssues = Object.keys(this.missingKeys).length > 0 || 
                     Object.keys(this.duplicateKeys).length > 0 || 
                     missingFromBase.length > 0;
    
    if (hasIssues) {
      console.log('\n⚠️  Issues found - see report above');
      process.exit(1);
    } else {
      console.log('\n🎉 No issues found - translations are healthy!');
      process.exit(0);
    }
  }

  // Run full validation
  run() {
    console.log('🚀 Starting translation validation...\n');
    
    this.loadTranslations();
    this.findUsedKeys();
    this.checkMissingKeys();
    this.checkDuplicateKeys();
    this.checkUnusedKeys();
    this.generateReport();
  }
}

// Run validation if called directly
if (require.main === module) {
  const validator = new TranslationValidator();
  validator.run();
}

module.exports = TranslationValidator;
