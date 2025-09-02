// Translation checker - simplified stub since translations moved to i18next JSON format
export const extractPlaceholders = (_text: string): string[] => {
  return [];
};

export const checkTranslations = async () => {
  return {
    missingKeys: {} as Record<string, string[]>,
    extraKeys: {} as Record<string, string[]>,
    inconsistentPlaceholders: {} as Record<string, Record<string, string[]>>,
    totalKeysInBase: 0,
    completionPercentage: {} as Record<string, number>,
  };
};

export const getTranslationCompletionReport = async (): Promise<string> => {
  return '# Translation Completeness Report\n\nTranslation checking is disabled. Translations are now managed via i18next JSON files.\n';
};

export default {
  checkTranslations,
  getTranslationCompletionReport,
  extractPlaceholders,
};
