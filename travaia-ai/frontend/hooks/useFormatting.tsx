import { useLocalization } from '../contexts/LocalizationContext';
import { formatDate, formatRelativeTime } from '../utils/dateFormatter';
import {
  formatNumber,
  formatCurrency,
  formatPercent,
} from '../utils/numberFormatter';

/**
 * React hook for accessing locale-aware formatting utilities
 * Combines date, number, currency and other formatting in one place
 */
export const useFormatting = () => {
  const { language } = useLocalization();

  return {
    // Current locale
    locale: language,

    // Date formatting
    formatDate: (
      date: Date | string | number,
      format: 'short' | 'medium' | 'long' | 'full' | string = 'medium',
    ) => formatDate(date, format, language),

    formatRelativeTime: (date: Date | string | number) =>
      formatRelativeTime(date, language),

    // Number formatting
    formatNumber: (
      value: number,
      options: {
        minimumFractionDigits?: number;
        maximumFractionDigits?: number;
        useGrouping?: boolean;
      } = {},
    ) => formatNumber(value, options, language),

    formatCurrency: (
      value: number,
      options: {
        currencyCode?: string;
        minimumFractionDigits?: number;
        maximumFractionDigits?: number;
      } = {},
    ) => formatCurrency(value, options, language),

    formatPercent: (
      value: number,
      options: {
        minimumFractionDigits?: number;
        maximumFractionDigits?: number;
      } = {},
    ) => formatPercent(value, options, language),

    // Get localized number format info
    getNumberFormatInfo: () => {
      const baseLocale = language.split('-')[0].toLowerCase();
      return {
        decimalSeparator: baseLocale === 'en' ? '.' : ',',
        thousandsSeparator:
          baseLocale === 'en' ? ',' : baseLocale === 'fr' ? ' ' : '.',
        currencySymbol: baseLocale === 'en' ? '$' : '€',
        currencyPosition: baseLocale === 'en' ? 'prefix' : 'suffix',
        isRTL: baseLocale === 'ar',
      };
    },
  };
};

export default useFormatting;
