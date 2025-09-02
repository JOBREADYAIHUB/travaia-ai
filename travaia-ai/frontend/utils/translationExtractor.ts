import * as fs from 'fs';
import * as path from 'path';

/**
 * Options for translation key extraction
 */
interface ExtractorOptions {
  scanPaths: string[];
  outputFile?: string;
  excludeDirs?: string[];
  includeFilePatterns?: RegExp[];
}

/**
 * Result of translation extraction
 */
interface ExtractorResult {
  potentialUntranslatedStrings: string[];
  translationKeysFound: string[];
  files: {
    [filePath: string]: {
      translationKeys: string[];
      potentialUntranslatedStrings: string[];
    };
  };
}

/**
 * Extracts potential translation keys and untranslated strings from source files
 */
export class TranslationExtractor {
  private options: ExtractorOptions;

  constructor(options: ExtractorOptions) {
    this.options = {
      ...options,
      excludeDirs: options.excludeDirs || [
        'node_modules',
        'build',
        'dist',
        '.git',
      ],
      includeFilePatterns: options.includeFilePatterns || [
        /\.(tsx|ts|jsx|js)$/,
      ],
    };
  }

  /**
   * Runs the extraction process
   */
  public extract(): ExtractorResult {
    const result: ExtractorResult = {
      potentialUntranslatedStrings: [],
      translationKeysFound: [],
      files: {},
    };

    for (const scanPath of this.options.scanPaths) {
      this.scanDirectory(scanPath, result);
    }

    // Remove duplicates
    result.translationKeysFound = [...new Set(result.translationKeysFound)];
    result.potentialUntranslatedStrings = [
      ...new Set(result.potentialUntranslatedStrings),
    ];

    // Write output if requested
    if (this.options.outputFile) {
      this.writeOutput(result);
    }

    return result;
  }

  /**
   * Recursively scans directories for files to analyze
   */
  private scanDirectory(dirPath: string, result: ExtractorResult): void {
    const items = fs.readdirSync(dirPath);

    for (const item of items) {
      const itemPath = path.join(dirPath, item);
      const stats = fs.statSync(itemPath);

      if (stats.isDirectory()) {
        // Skip excluded directories
        if (this.options.excludeDirs?.includes(item)) {
          continue;
        }

        this.scanDirectory(itemPath, result);
      } else if (stats.isFile()) {
        // Check if file matches include patterns
        const shouldInclude = this.options.includeFilePatterns?.some(
          (pattern) => pattern.test(itemPath),
        );

        if (shouldInclude) {
          this.analyzeFile(itemPath, result);
        }
      }
    }
  }

  /**
   * Analyzes a single file for translation keys and untranslated strings
   */
  private analyzeFile(filePath: string, result: ExtractorResult): void {
    const content = fs.readFileSync(filePath, 'utf-8');
    const fileResult = {
      translationKeys: [] as string[],
      potentialUntranslatedStrings: [] as string[],
    };

    // Find translation keys (t('key'), translate('key'), etc.)
    const translationKeyPattern = /(?:t|translate)\(\s*['"]([^'"]+)['"]/g;
    let match: RegExpExecArray | null;

    while ((match = translationKeyPattern.exec(content)) !== null) {
      const key = match[1];
      fileResult.translationKeys.push(key);
      result.translationKeysFound.push(key);
    }

    // Find potential untranslated strings (UI labels, messages)
    // This is complex and prone to false positives, but useful as a starting point
    const potentialStringPatterns = [
      // JSX text content
      />([A-Z][a-zA-Z\s]{2,})</g,
      // String literals in component props (not already in translation calls)
      /(?<!(?:t|translate)\(\s*)['"]([A-Z][a-zA-Z\s]{2,})['"]/g,
    ];

    for (const pattern of potentialStringPatterns) {
      while ((match = pattern.exec(content)) !== null) {
        const str = match[1].trim();
        // Skip very short strings, numbers, and variable names
        if (str.length > 2 && !/^\d+$/.test(str) && !str.includes('{')) {
          fileResult.potentialUntranslatedStrings.push(str);
          result.potentialUntranslatedStrings.push(str);
        }
      }
    }

    if (
      fileResult.translationKeys.length ||
      fileResult.potentialUntranslatedStrings.length
    ) {
      result.files[filePath] = fileResult;
    }
  }

  /**
   * Writes extraction results to an output file
   */
  private writeOutput(result: ExtractorResult): void {
    if (!this.options.outputFile) return;

    let output = '# Translation Extraction Report\n\n';

    output += '## Translation Keys Found\n\n';
    result.translationKeysFound.forEach((key) => {
      output += `- \`${key}\`\n`;
    });

    output += '\n## Potential Untranslated Strings\n\n';
    result.potentialUntranslatedStrings.forEach((str) => {
      output += `- "${str}"\n`;
    });

    output += '\n## Files Analysis\n\n';
    Object.entries(result.files).forEach(([filePath, fileResult]) => {
      output += `### ${path.relative(process.cwd(), filePath)}\n\n`;

      if (fileResult.translationKeys.length) {
        output += '**Translation keys:**\n\n';
        fileResult.translationKeys.forEach((key) => {
          output += `- \`${key}\`\n`;
        });
        output += '\n';
      }

      if (fileResult.potentialUntranslatedStrings.length) {
        output += '**Potential untranslated strings:**\n\n';
        fileResult.potentialUntranslatedStrings.forEach((str) => {
          output += `- "${str}"\n`;
        });
        output += '\n';
      }
    });

    fs.writeFileSync(this.options.outputFile, output, 'utf-8');
  }
}

/**
 * Simple function to run extraction with default settings
 */
export const extractTranslations = (
  scanPaths: string[] = ['./src', './components'],
  outputFile = './translation-extraction-report.md',
): ExtractorResult => {
  const extractor = new TranslationExtractor({
    scanPaths,
    outputFile,
  });

  return extractor.extract();
};

export default {
  TranslationExtractor,
  extractTranslations,
};
