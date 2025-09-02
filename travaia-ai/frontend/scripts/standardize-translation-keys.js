#!/usr/bin/env node

/**
 * Translation Key Standardization Tool
 * Migrates flat keys to hierarchical namespacing and standardizes organization
 */

const fs = require('fs');
const path = require('path');

class TranslationKeyStandardizer {
  constructor() {
    this.localesDir = path.join(__dirname, '../locales');
    this.languages = ['en', 'fr', 'es', 'de', 'ar'];
    this.keyMappings = this.defineKeyMappings();
  }

  // Define mappings from flat keys to hierarchical keys
  defineKeyMappings() {
    return {
      // Dashboard flat keys -> hierarchical
      'welcomeToCareerAce': 'dashboard.welcome',
      'platformDescription': 'dashboard.description',
      'jobApplicationTracker': 'dashboard.jobTracker',
      'quickOverview': 'dashboard.quickOverview',
      'personalizedAITips': 'dashboard.aiTips',
      'nextBestActions': 'dashboard.nextActions',
      
      // Authentication flat keys -> hierarchical
      'accessYourAccount': 'auth.accessAccount',
      'enterEmailToStart': 'auth.enterEmail',
      'emailAddress': 'auth.email',
      'processing': 'auth.processing',
      'continue': 'auth.continue',
      'loginBtn': 'auth.login',
      'signup': 'auth.signup',
      'password': 'auth.password',
      'forgotPassword': 'auth.forgotPassword',
      'resetPassword': 'auth.resetPassword',
      'resetPasswordInstructions': 'auth.resetInstructions',
      'backToLogin': 'auth.backToLogin',
      'continueWithGoogle': 'auth.continueWithGoogle',
      'continueWithApple': 'auth.continueWithApple',
      
      // Job application flat keys -> hierarchical
      'appliedTo': 'jobs.appliedTo',
      'scheduledInterviewFor': 'jobs.scheduledInterview',
      
      // Navigation flat keys -> hierarchical
      'logout': 'nav.logout',
      'documentManager': 'nav.documentManager',
      'collapseSidebar': 'nav.collapseSidebar',
      'closeSidebar': 'nav.closeSidebar',
      'openSidebar': 'nav.openSidebar',
      'analytics': 'nav.analytics',
      
      // Common UI flat keys -> hierarchical (if any exist)
      'save': 'common.save',
      'cancel': 'common.cancel',
      'edit': 'common.edit',
      'delete': 'common.delete',
      'confirm': 'common.confirm',
      'loading': 'common.loading',
      'error': 'common.error',
      'success': 'common.success',
      'warning': 'common.warning',
      'info': 'common.info'
    };
  }

  // Parse translation file and extract key-value pairs
  parseTranslationFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const translations = {};
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith("'") && trimmed.includes("':")) {
        const match = trimmed.match(/^'([^']+)':\s*'([^']*)',?$/);
        if (match) {
          translations[match[1]] = match[2];
        }
      }
    }
    
    return translations;
  }

  // Generate standardized translation file content
  generateStandardizedContent(translations, language) {
    const standardized = {};
    const unmapped = {};
    
    // Process mapped keys
    for (const [flatKey, hierarchicalKey] of Object.entries(this.keyMappings)) {
      if (translations[flatKey]) {
        standardized[hierarchicalKey] = translations[flatKey];
      }
    }
    
    // Keep existing hierarchical keys
    for (const [key, value] of Object.entries(translations)) {
      if (!this.keyMappings[key]) {
        if (key.includes('.')) {
          standardized[key] = value;
        } else {
          unmapped[key] = value;
        }
      }
    }
    
    // Generate organized content
    const sections = this.organizeKeysByNamespace(standardized);
    let content = `import { Translations } from '../types';\n\n`;
    content += `export const ${language}: Translations = {\n`;
    
    // Add organized sections
    for (const [namespace, keys] of Object.entries(sections)) {
      content += `  // ${this.getNamespaceComment(namespace)}\n`;
      
      for (const [key, value] of Object.entries(keys)) {
        content += `  '${key}': '${value}',\n`;
      }
      content += '\n';
    }
    
    // Add unmapped keys at the end with a warning comment
    if (Object.keys(unmapped).length > 0) {
      content += '  // ⚠️ UNMAPPED FLAT KEYS - Consider organizing these\n';
      for (const [key, value] of Object.entries(unmapped)) {
        content += `  '${key}': '${value}',\n`;
      }
      content += '\n';
    }
    
    content += '};\n';
    
    return { content, unmapped: Object.keys(unmapped) };
  }

  // Organize keys by namespace
  organizeKeysByNamespace(translations) {
    const sections = {
      common: {},
      routes: {},
      auth: {},
      dashboard: {},
      nav: {},
      jobs: {},
      mockInterview: {},
      userProfile: {},
      other: {}
    };
    
    for (const [key, value] of Object.entries(translations)) {
      const namespace = key.split('.')[0];
      
      if (sections[namespace]) {
        sections[namespace][key] = value;
      } else {
        sections.other[key] = value;
      }
    }
    
    // Remove empty sections
    return Object.fromEntries(
      Object.entries(sections).filter(([_, keys]) => Object.keys(keys).length > 0)
    );
  }

  // Get comment for namespace
  getNamespaceComment(namespace) {
    const comments = {
      common: 'Common UI elements and actions',
      routes: 'Route translations',
      auth: 'Authentication and login',
      dashboard: 'Dashboard page content',
      nav: 'Navigation and sidebar',
      jobs: 'Job applications and tracking',
      mockInterview: 'Mock interview platform',
      userProfile: 'User profile page',
      other: 'Other translations'
    };
    
    return comments[namespace] || `${namespace.charAt(0).toUpperCase() + namespace.slice(1)} translations`;
  }

  // Standardize all translation files
  standardizeAllFiles() {
    console.log('🔧 Starting translation key standardization...\n');
    
    const results = {};
    
    for (const language of this.languages) {
      const filePath = path.join(this.localesDir, `${language}.ts`);
      
      if (!fs.existsSync(filePath)) {
        console.warn(`⚠️  File not found: ${language}.ts`);
        continue;
      }
      
      console.log(`📝 Processing ${language}.ts...`);
      
      try {
        // Parse existing translations
        const translations = this.parseTranslationFile(filePath);
        
        // Generate standardized content
        const { content, unmapped } = this.generateStandardizedContent(translations, language);
        
        // Create backup
        const backupPath = `${filePath}.backup.${Date.now()}`;
        fs.copyFileSync(filePath, backupPath);
        console.log(`💾 Backup created: ${path.basename(backupPath)}`);
        
        // Write standardized file
        fs.writeFileSync(filePath, content);
        
        results[language] = {
          totalKeys: Object.keys(translations).length,
          standardizedKeys: Object.keys(translations).length - unmapped.length,
          unmappedKeys: unmapped,
          backupPath
        };
        
        console.log(`✅ Standardized ${results[language].standardizedKeys}/${results[language].totalKeys} keys`);
        if (unmapped.length > 0) {
          console.log(`⚠️  ${unmapped.length} unmapped flat keys remain`);
        }
        
      } catch (error) {
        console.error(`❌ Error processing ${language}.ts:`, error.message);
      }
    }
    
    // Generate summary report
    this.generateStandardizationReport(results);
    
    return results;
  }

  // Generate standardization report
  generateStandardizationReport(results) {
    console.log('\n📊 STANDARDIZATION REPORT');
    console.log('='.repeat(50));
    
    let totalKeys = 0;
    let totalStandardized = 0;
    let totalUnmapped = 0;
    
    for (const [language, result] of Object.entries(results)) {
      totalKeys += result.totalKeys;
      totalStandardized += result.standardizedKeys;
      totalUnmapped += result.unmappedKeys.length;
      
      console.log(`\n${language.toUpperCase()}:`);
      console.log(`  Total keys: ${result.totalKeys}`);
      console.log(`  Standardized: ${result.standardizedKeys}`);
      console.log(`  Unmapped: ${result.unmappedKeys.length}`);
      console.log(`  Success rate: ${(result.standardizedKeys / result.totalKeys * 100).toFixed(1)}%`);
      
      if (result.unmappedKeys.length > 0) {
        console.log(`  Unmapped keys: ${result.unmappedKeys.slice(0, 5).join(', ')}${result.unmappedKeys.length > 5 ? '...' : ''}`);
      }
    }
    
    console.log(`\n📈 OVERALL SUMMARY:`);
    console.log(`Total keys processed: ${totalKeys}`);
    console.log(`Keys standardized: ${totalStandardized}`);
    console.log(`Keys remaining unmapped: ${totalUnmapped}`);
    console.log(`Overall success rate: ${totalKeys > 0 ? (totalStandardized / totalKeys * 100).toFixed(1) : 0}%`);
    
    console.log('\n💡 NEXT STEPS:');
    if (totalUnmapped > 0) {
      console.log('1. Review unmapped keys and add them to the keyMappings');
      console.log('2. Update component imports to use new hierarchical keys');
      console.log('3. Test the application to ensure all translations work');
    } else {
      console.log('1. Update component imports to use new hierarchical keys');
      console.log('2. Test the application thoroughly');
      console.log('3. Remove backup files once everything is verified');
    }
    
    console.log('\n✅ Standardization complete!');
  }

  // Generate migration guide for developers
  generateMigrationGuide() {
    const guidePath = path.join(__dirname, '../docs/translation-key-migration-guide.md');
    
    let guide = `# Translation Key Migration Guide\n\n`;
    guide += `This guide helps developers migrate from flat translation keys to hierarchical namespacing.\n\n`;
    guide += `## Key Mappings\n\n`;
    guide += `The following flat keys have been migrated to hierarchical keys:\n\n`;
    guide += `| Old Key (Flat) | New Key (Hierarchical) | Category |\n`;
    guide += `|----------------|------------------------|----------|\n`;
    
    for (const [flatKey, hierarchicalKey] of Object.entries(this.keyMappings)) {
      const category = hierarchicalKey.split('.')[0];
      guide += `| \`${flatKey}\` | \`${hierarchicalKey}\` | ${category} |\n`;
    }
    
    guide += `\n## Usage Examples\n\n`;
    guide += `### Before (Flat Keys)\n`;
    guide += `\`\`\`typescript\n`;
    guide += `const { t } = useTranslation();\n`;
    guide += `return <h1>{t('welcomeToCareerAce')}</h1>;\n`;
    guide += `\`\`\`\n\n`;
    guide += `### After (Hierarchical Keys)\n`;
    guide += `\`\`\`typescript\n`;
    guide += `const { t } = useTranslation();\n`;
    guide += `return <h1>{t('dashboard.welcome')}</h1>;\n`;
    guide += `\`\`\`\n\n`;
    guide += `## Benefits of Hierarchical Keys\n\n`;
    guide += `1. **Better Organization**: Related keys are grouped together\n`;
    guide += `2. **Easier Maintenance**: Clear namespace structure\n`;
    guide += `3. **Reduced Conflicts**: Namespace prevents key collisions\n`;
    guide += `4. **Better IDE Support**: Autocomplete and navigation\n`;
    guide += `5. **Scalability**: Easy to add new features without conflicts\n\n`;
    guide += `## Migration Checklist\n\n`;
    guide += `- [ ] Run standardization script\n`;
    guide += `- [ ] Update component imports\n`;
    guide += `- [ ] Test all translated content\n`;
    guide += `- [ ] Update documentation\n`;
    guide += `- [ ] Remove backup files\n`;
    
    fs.writeFileSync(guidePath, guide);
    console.log(`📖 Migration guide created: ${guidePath}`);
    
    return guidePath;
  }
}

// Run if called directly
if (require.main === module) {
  const standardizer = new TranslationKeyStandardizer();
  
  // Check if --dry-run flag is provided
  const isDryRun = process.argv.includes('--dry-run');
  
  if (isDryRun) {
    console.log('🔍 DRY RUN MODE - No files will be modified\n');
    // In dry run, just show what would be changed
    console.log('Key mappings that would be applied:');
    for (const [flat, hierarchical] of Object.entries(standardizer.keyMappings)) {
      console.log(`  ${flat} → ${hierarchical}`);
    }
  } else {
    standardizer.standardizeAllFiles();
    standardizer.generateMigrationGuide();
  }
}

module.exports = TranslationKeyStandardizer;
