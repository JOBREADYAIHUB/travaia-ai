#!/usr/bin/env node

/**
 * Translation Coverage Reporter
 * Generates detailed coverage reports and statistics for i18n system
 */

const fs = require('fs');
const path = require('path');

class TranslationCoverageReporter {
  constructor() {
    this.localesDir = path.join(__dirname, '../locales');
    this.languages = ['en', 'fr', 'es', 'de', 'ar'];
    this.baseLanguage = 'en';
    this.translations = {};
    this.stats = {};
  }

  // Load all translation files
  loadTranslations() {
    for (const lang of this.languages) {
      const filePath = path.join(this.localesDir, `${lang}.ts`);
      
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        this.translations[lang] = this.parseTranslationKeys(content);
      } else {
        this.translations[lang] = [];
      }
    }
  }

  // Parse translation keys from TypeScript file
  parseTranslationKeys(content) {
    const keys = [];
    const lines = content.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith("'") && trimmed.includes("':")) {
        const match = trimmed.match(/^'([^']+)':/);
        if (match) {
          keys.push(match[1]);
        }
      }
    }
    
    return keys;
  }

  // Calculate coverage statistics
  calculateStats() {
    const baseKeys = this.translations[this.baseLanguage] || [];
    const baseKeyCount = baseKeys.length;
    
    for (const lang of this.languages) {
      const langKeys = this.translations[lang] || [];
      const langKeyCount = langKeys.length;
      
      // Calculate coverage percentage
      const coverage = baseKeyCount > 0 ? (langKeyCount / baseKeyCount * 100) : 0;
      
      // Find missing keys
      const missingKeys = baseKeys.filter(key => !langKeys.includes(key));
      
      // Find extra keys (not in base language)
      const extraKeys = langKeys.filter(key => !baseKeys.includes(key));
      
      this.stats[lang] = {
        totalKeys: langKeyCount,
        baseKeys: baseKeyCount,
        coverage: coverage,
        missingKeys: missingKeys,
        extraKeys: extraKeys,
        missingCount: missingKeys.length,
        extraCount: extraKeys.length
      };
    }
  }

  // Generate HTML coverage report
  generateHTMLReport() {
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Translation Coverage Report - Travaia Frontend</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background: #f5f7fa;
            color: #333;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 2.5rem;
            font-weight: 300;
        }
        .header p {
            margin: 10px 0 0 0;
            opacity: 0.9;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            padding: 30px;
        }
        .stat-card {
            background: #f8fafc;
            border-radius: 8px;
            padding: 20px;
            border-left: 4px solid #667eea;
        }
        .stat-card h3 {
            margin: 0 0 10px 0;
            color: #2d3748;
            font-size: 1.1rem;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .coverage-bar {
            width: 100%;
            height: 8px;
            background: #e2e8f0;
            border-radius: 4px;
            overflow: hidden;
            margin: 10px 0;
        }
        .coverage-fill {
            height: 100%;
            background: linear-gradient(90deg, #48bb78, #38a169);
            transition: width 0.3s ease;
        }
        .coverage-fill.low { background: linear-gradient(90deg, #f56565, #e53e3e); }
        .coverage-fill.medium { background: linear-gradient(90deg, #ed8936, #dd6b20); }
        .coverage-percentage {
            font-size: 1.5rem;
            font-weight: bold;
            color: #2d3748;
        }
        .details {
            padding: 0 30px 30px;
        }
        .language-section {
            margin-bottom: 30px;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            overflow: hidden;
        }
        .language-header {
            background: #f7fafc;
            padding: 15px 20px;
            border-bottom: 1px solid #e2e8f0;
            font-weight: 600;
            color: #2d3748;
        }
        .language-content {
            padding: 20px;
        }
        .missing-keys, .extra-keys {
            margin-top: 15px;
        }
        .key-list {
            background: #f7fafc;
            border-radius: 4px;
            padding: 10px;
            max-height: 200px;
            overflow-y: auto;
            font-family: 'Monaco', 'Menlo', monospace;
            font-size: 0.9rem;
        }
        .key-item {
            padding: 2px 0;
            color: #4a5568;
        }
        .summary {
            background: #f7fafc;
            padding: 20px;
            margin: 20px 30px;
            border-radius: 8px;
            border-left: 4px solid #38a169;
        }
        .flag {
            font-size: 1.5rem;
            margin-right: 10px;
        }
        .timestamp {
            text-align: center;
            color: #718096;
            padding: 20px;
            font-size: 0.9rem;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🌍 Translation Coverage Report</h1>
            <p>Travaia Frontend Internationalization Analysis</p>
        </div>

        <div class="stats-grid">
            ${this.languages.map(lang => this.generateLanguageCard(lang)).join('')}
        </div>

        <div class="summary">
            <h3>📊 Summary</h3>
            <p><strong>Base Language:</strong> ${this.baseLanguage.toUpperCase()} (${this.stats[this.baseLanguage]?.totalKeys || 0} keys)</p>
            <p><strong>Supported Languages:</strong> ${this.languages.length}</p>
            <p><strong>Average Coverage:</strong> ${this.calculateAverageCoverage().toFixed(1)}%</p>
            <p><strong>Total Translation Keys:</strong> ${this.calculateTotalUniqueKeys()}</p>
        </div>

        <div class="details">
            ${this.languages.filter(lang => lang !== this.baseLanguage).map(lang => this.generateLanguageDetails(lang)).join('')}
        </div>

        <div class="timestamp">
            Generated on ${new Date().toLocaleString()}
        </div>
    </div>
</body>
</html>`;

    return html;
  }

  // Generate language card for stats grid
  generateLanguageCard(lang) {
    const stats = this.stats[lang] || {};
    const coverage = stats.coverage || 0;
    const flag = this.getLanguageFlag(lang);
    
    let coverageClass = 'high';
    if (coverage < 70) coverageClass = 'low';
    else if (coverage < 90) coverageClass = 'medium';

    return `
      <div class="stat-card">
        <h3>${flag} ${lang.toUpperCase()}</h3>
        <div class="coverage-percentage">${coverage.toFixed(1)}%</div>
        <div class="coverage-bar">
          <div class="coverage-fill ${coverageClass}" style="width: ${coverage}%"></div>
        </div>
        <p>${stats.totalKeys || 0} / ${stats.baseKeys || 0} keys</p>
        ${stats.missingCount > 0 ? `<p style="color: #e53e3e;">Missing: ${stats.missingCount}</p>` : ''}
        ${stats.extraCount > 0 ? `<p style="color: #d69e2e;">Extra: ${stats.extraCount}</p>` : ''}
      </div>`;
  }

  // Generate detailed language section
  generateLanguageDetails(lang) {
    const stats = this.stats[lang] || {};
    const flag = this.getLanguageFlag(lang);

    return `
      <div class="language-section">
        <div class="language-header">
          ${flag} ${lang.toUpperCase()} - ${stats.coverage?.toFixed(1) || 0}% Coverage
        </div>
        <div class="language-content">
          <p><strong>Total Keys:</strong> ${stats.totalKeys || 0}</p>
          <p><strong>Missing Keys:</strong> ${stats.missingCount || 0}</p>
          <p><strong>Extra Keys:</strong> ${stats.extraCount || 0}</p>
          
          ${stats.missingCount > 0 ? `
            <div class="missing-keys">
              <h4>Missing Keys (${stats.missingCount}):</h4>
              <div class="key-list">
                ${stats.missingKeys.slice(0, 50).map(key => `<div class="key-item">${key}</div>`).join('')}
                ${stats.missingKeys.length > 50 ? `<div class="key-item">... and ${stats.missingKeys.length - 50} more</div>` : ''}
              </div>
            </div>
          ` : ''}
          
          ${stats.extraCount > 0 ? `
            <div class="extra-keys">
              <h4>Extra Keys (${stats.extraCount}):</h4>
              <div class="key-list">
                ${stats.extraKeys.slice(0, 20).map(key => `<div class="key-item">${key}</div>`).join('')}
                ${stats.extraKeys.length > 20 ? `<div class="key-item">... and ${stats.extraKeys.length - 20} more</div>` : ''}
              </div>
            </div>
          ` : ''}
        </div>
      </div>`;
  }

  // Get flag emoji for language
  getLanguageFlag(lang) {
    const flags = {
      'en': '🇺🇸',
      'fr': '🇫🇷', 
      'es': '🇪🇸',
      'de': '🇩🇪',
      'ar': '🇸🇦'
    };
    return flags[lang] || '🌍';
  }

  // Calculate average coverage across all languages
  calculateAverageCoverage() {
    const coverages = this.languages
      .filter(lang => lang !== this.baseLanguage)
      .map(lang => this.stats[lang]?.coverage || 0);
    
    return coverages.length > 0 
      ? coverages.reduce((sum, coverage) => sum + coverage, 0) / coverages.length
      : 0;
  }

  // Calculate total unique keys across all languages
  calculateTotalUniqueKeys() {
    const allKeys = new Set();
    for (const lang of this.languages) {
      const keys = this.translations[lang] || [];
      keys.forEach(key => allKeys.add(key));
    }
    return allKeys.size;
  }

  // Generate and save report
  generateReport() {
    console.log('📊 Generating translation coverage report...');
    
    this.loadTranslations();
    this.calculateStats();
    
    const html = this.generateHTMLReport();
    const reportPath = path.join(__dirname, '../docs/translation-coverage-report.html');
    
    // Ensure docs directory exists
    const docsDir = path.dirname(reportPath);
    if (!fs.existsSync(docsDir)) {
      fs.mkdirSync(docsDir, { recursive: true });
    }
    
    fs.writeFileSync(reportPath, html);
    
    console.log(`✅ Coverage report generated: ${reportPath}`);
    console.log(`📈 Average coverage: ${this.calculateAverageCoverage().toFixed(1)}%`);
    
    // Print summary to console
    console.log('\n📊 COVERAGE SUMMARY:');
    for (const lang of this.languages) {
      const stats = this.stats[lang] || {};
      const flag = this.getLanguageFlag(lang);
      console.log(`${flag} ${lang.toUpperCase()}: ${(stats.coverage || 0).toFixed(1)}% (${stats.totalKeys || 0}/${stats.baseKeys || 0} keys)`);
    }
    
    return reportPath;
  }
}

// Run if called directly
if (require.main === module) {
  const reporter = new TranslationCoverageReporter();
  reporter.generateReport();
}

module.exports = TranslationCoverageReporter;
