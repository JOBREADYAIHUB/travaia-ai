#!/usr/bin/env node

/**
 * Legacy i18n Code Migration Tool
 * Migrates useLocalization() to useTranslation() and updates translation patterns
 */

const fs = require('fs');
const path = require('path');

class LegacyI18nMigrator {
  constructor() {
    this.componentsDir = path.join(__dirname, '../components');
    this.migratedFiles = [];
    this.errors = [];
  }

  // Find all TypeScript/React files that might use legacy i18n
  findFilesToMigrate() {
    const files = [];
    
    const scanDir = (dir) => {
      const entries = fs.readdirSync(dir);
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          scanDir(fullPath);
        } else if (entry.endsWith('.tsx') || entry.endsWith('.ts')) {
          const content = fs.readFileSync(fullPath, 'utf8');
          
          // Check if file uses legacy patterns
          if (this.hasLegacyPatterns(content)) {
            files.push(fullPath);
          }
        }
      }
    };
    
    scanDir(this.componentsDir);
    return files;
  }

  // Check if file contains legacy i18n patterns
  hasLegacyPatterns(content) {
    const legacyPatterns = [
      /useLocalization\(\)/,
      /translate\(/,
      /language\s*:/,
      /LocalizationContext/,
      /from\s+['"].*localization.*['"]/
    ];
    
    return legacyPatterns.some(pattern => pattern.test(content));
  }

  // Migrate a single file
  migrateFile(filePath) {
    console.log(`🔄 Migrating ${path.relative(this.componentsDir, filePath)}...`);
    
    try {
      let content = fs.readFileSync(filePath, 'utf8');
      const originalContent = content;
      
      // Create backup
      const backupPath = `${filePath}.backup.${Date.now()}`;
      fs.writeFileSync(backupPath, originalContent);
      
      // Apply migrations
      content = this.migrateImports(content);
      content = this.migrateHookUsage(content);
      content = this.migrateTranslationCalls(content);
      content = this.migrateLanguageAccess(content);
      content = this.cleanupUnusedImports(content);
      
      // Only write if content changed
      if (content !== originalContent) {
        fs.writeFileSync(filePath, content);
        
        this.migratedFiles.push({
          path: filePath,
          backupPath,
          changes: this.analyzeChanges(originalContent, content)
        });
        
        console.log(`✅ Migrated ${path.basename(filePath)}`);
      } else {
        // Remove backup if no changes
        fs.unlinkSync(backupPath);
        console.log(`ℹ️  No changes needed for ${path.basename(filePath)}`);
      }
      
    } catch (error) {
      console.error(`❌ Error migrating ${filePath}:`, error.message);
      this.errors.push({ path: filePath, error: error.message });
    }
  }

  // Migrate import statements
  migrateImports(content) {
    // Replace useLocalization import with useTranslation
    content = content.replace(
      /import\s*{\s*useLocalization\s*}\s*from\s*['"][^'"]*['"];?/g,
      "import { useTranslation } from 'react-i18next';"
    );
    
    // Remove LocalizationContext imports
    content = content.replace(
      /import\s*{\s*[^}]*LocalizationContext[^}]*\s*}\s*from\s*['"][^'"]*['"];?\n?/g,
      ''
    );
    
    // Replace custom localization imports
    content = content.replace(
      /import\s*{\s*[^}]*translate[^}]*\s*}\s*from\s*['"][^'"]*localization[^'"]*['"];?\n?/g,
      "import { useTranslation } from 'react-i18next';\n"
    );
    
    return content;
  }

  // Migrate hook usage
  migrateHookUsage(content) {
    // Replace useLocalization() with useTranslation()
    content = content.replace(
      /const\s*{\s*([^}]*)\s*}\s*=\s*useLocalization\(\);?/g,
      (match, destructured) => {
        // Parse destructured variables
        const vars = destructured.split(',').map(v => v.trim());
        const newVars = [];
        
        for (const variable of vars) {
          if (variable.includes('translate')) {
            newVars.push('t');
          } else if (variable.includes('language')) {
            newVars.push('i18n');
          } else {
            newVars.push(variable);
          }
        }
        
        return `const { ${newVars.join(', ')} } = useTranslation();`;
      }
    );
    
    return content;
  }

  // Migrate translation function calls
  migrateTranslationCalls(content) {
    // Replace translate() calls with t() calls
    content = content.replace(/translate\(/g, 't(');
    
    // Handle translate with parameters
    content = content.replace(
      /t\(\s*['"`]([^'"`]+)['"`]\s*,\s*([^)]+)\)/g,
      "t('$1', $2)"
    );
    
    return content;
  }

  // Migrate language access patterns
  migrateLanguageAccess(content) {
    // Replace language variable with i18n.language
    content = content.replace(
      /\blanguage\b(?!\s*:)/g,
      'i18n.language'
    );
    
    // Replace language setting patterns
    content = content.replace(
      /setLanguage\s*\(\s*(['"`][^'"`]+['"`])\s*\)/g,
      'i18n.changeLanguage($1)'
    );
    
    return content;
  }

  // Clean up unused imports
  cleanupUnusedImports(content) {
    const lines = content.split('\n');
    const cleanedLines = [];
    
    for (const line of lines) {
      // Skip empty import lines
      if (line.trim().match(/^import\s*{\s*}\s*from/)) {
        continue;
      }
      
      // Skip duplicate react-i18next imports
      if (line.includes("import { useTranslation } from 'react-i18next'")) {
        if (cleanedLines.some(l => l.includes("import { useTranslation } from 'react-i18next'"))) {
          continue;
        }
      }
      
      cleanedLines.push(line);
    }
    
    return cleanedLines.join('\n');
  }

  // Analyze changes made to a file
  analyzeChanges(original, migrated) {
    const changes = [];
    
    if (original.includes('useLocalization') && !migrated.includes('useLocalization')) {
      changes.push('Migrated useLocalization to useTranslation');
    }
    
    if (original.includes('translate(') && migrated.includes('t(')) {
      changes.push('Migrated translate() calls to t()');
    }
    
    if (original.includes('language') && migrated.includes('i18n.language')) {
      changes.push('Migrated language access to i18n.language');
    }
    
    if (original.includes('LocalizationContext') && !migrated.includes('LocalizationContext')) {
      changes.push('Removed LocalizationContext imports');
    }
    
    return changes;
  }

  // Generate migration report
  generateMigrationReport() {
    console.log('\n📊 LEGACY I18N MIGRATION REPORT');
    console.log('='.repeat(50));
    
    console.log(`\n📈 SUMMARY:`);
    console.log(`Files migrated: ${this.migratedFiles.length}`);
    console.log(`Errors encountered: ${this.errors.length}`);
    
    if (this.migratedFiles.length > 0) {
      console.log(`\n✅ SUCCESSFULLY MIGRATED FILES:`);
      for (const file of this.migratedFiles) {
        const relativePath = path.relative(this.componentsDir, file.path);
        console.log(`\n📄 ${relativePath}:`);
        for (const change of file.changes) {
          console.log(`  - ${change}`);
        }
        console.log(`  💾 Backup: ${path.basename(file.backupPath)}`);
      }
    }
    
    if (this.errors.length > 0) {
      console.log(`\n❌ ERRORS:`);
      for (const error of this.errors) {
        const relativePath = path.relative(this.componentsDir, error.path);
        console.log(`  ${relativePath}: ${error.error}`);
      }
    }
    
    console.log(`\n💡 NEXT STEPS:`);
    console.log(`1. Test all migrated components thoroughly`);
    console.log(`2. Check for any remaining legacy patterns`);
    console.log(`3. Remove LocalizationContext if no longer used`);
    console.log(`4. Update any custom translation utilities`);
    console.log(`5. Remove backup files once migration is verified`);
    
    // Generate detailed migration guide
    this.generateDetailedGuide();
    
    console.log(`\n✅ Migration complete!`);
  }

  // Generate detailed migration guide
  generateDetailedGuide() {
    const guide = `# Legacy i18n Migration Guide

## Migration Summary

This migration updates the Travaia frontend from custom \`useLocalization\` hook to the standard \`useTranslation\` hook from react-i18next.

## Changes Made

### 1. Import Statements
**Before:**
\`\`\`typescript
import { useLocalization } from '../contexts/LocalizationContext';
\`\`\`

**After:**
\`\`\`typescript
import { useTranslation } from 'react-i18next';
\`\`\`

### 2. Hook Usage
**Before:**
\`\`\`typescript
const { translate, language } = useLocalization();
\`\`\`

**After:**
\`\`\`typescript
const { t, i18n } = useTranslation();
\`\`\`

### 3. Translation Function Calls
**Before:**
\`\`\`typescript
translate('welcomeMessage')
translate('greeting', { name: 'John' })
\`\`\`

**After:**
\`\`\`typescript
t('welcomeMessage')
t('greeting', { name: 'John' })
\`\`\`

### 4. Language Access
**Before:**
\`\`\`typescript
console.log(language);
setLanguage('fr');
\`\`\`

**After:**
\`\`\`typescript
console.log(i18n.language);
i18n.changeLanguage('fr');
\`\`\`

## Benefits of Migration

1. **Standardization**: Uses the official react-i18next patterns
2. **Better Performance**: More optimized translation loading
3. **Enhanced Features**: Access to all react-i18next features
4. **Community Support**: Better documentation and community
5. **Future-Proof**: Aligned with modern i18n practices

## Files Migrated

${this.migratedFiles.map(file => {
  const relativePath = path.relative(this.componentsDir, file.path);
  return `- \`${relativePath}\`\n  ${file.changes.map(change => `  - ${change}`).join('\n  ')}`;
}).join('\n\n')}

## Testing Checklist

After migration, verify:

- [ ] All translated text displays correctly
- [ ] Language switching still works
- [ ] No console errors related to translations
- [ ] All components render without issues
- [ ] Translation parameters work correctly
- [ ] Fallback language behavior is maintained

## Rollback Instructions

If issues arise, you can rollback using the backup files:

\`\`\`bash
# Restore individual file
cp component.tsx.backup.TIMESTAMP component.tsx

# Restore all files (if needed)
find . -name "*.backup.*" -exec bash -c 'cp "$1" "\${1%.backup.*}"' _ {} \\;
\`\`\`

## Cleanup

Once migration is verified, remove backup files:

\`\`\`bash
find . -name "*.backup.*" -delete
\`\`\`

## Common Issues and Solutions

### Issue: Translation not found
**Solution**: Check if the translation key exists in the locale files

### Issue: Parameters not working
**Solution**: Verify parameter syntax: \`t('key', { param: value })\`

### Issue: Language switching not working
**Solution**: Use \`i18n.changeLanguage()\` instead of custom setLanguage

### Issue: TypeScript errors
**Solution**: Ensure proper imports and type definitions

---

Generated on: ${new Date().toISOString()}
Migration tool version: 1.0.0`;

    const guidePath = path.join(__dirname, '../docs/legacy-i18n-migration-guide.md');
    fs.writeFileSync(guidePath, guide);
    console.log(`📖 Detailed migration guide created: docs/legacy-i18n-migration-guide.md`);
  }

  // Run migration
  migrate() {
    console.log('🚀 Starting legacy i18n migration...\n');
    
    const filesToMigrate = this.findFilesToMigrate();
    
    if (filesToMigrate.length === 0) {
      console.log('✅ No files found with legacy i18n patterns!');
      return;
    }
    
    console.log(`📁 Found ${filesToMigrate.length} files to migrate:\n`);
    filesToMigrate.forEach(file => {
      console.log(`  - ${path.relative(this.componentsDir, file)}`);
    });
    console.log('');
    
    // Migrate each file
    for (const file of filesToMigrate) {
      this.migrateFile(file);
    }
    
    // Generate report
    this.generateMigrationReport();
  }
}

// Run if called directly
if (require.main === module) {
  const migrator = new LegacyI18nMigrator();
  
  // Check for dry-run flag
  if (process.argv.includes('--dry-run')) {
    console.log('🔍 DRY RUN MODE - Finding files that would be migrated...\n');
    const files = migrator.findFilesToMigrate();
    console.log(`Found ${files.length} files with legacy patterns:`);
    files.forEach(file => {
      console.log(`  - ${path.relative(migrator.componentsDir, file)}`);
    });
  } else {
    migrator.migrate();
  }
}

module.exports = LegacyI18nMigrator;
