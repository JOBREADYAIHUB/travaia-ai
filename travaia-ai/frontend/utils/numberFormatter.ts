/**
 * Locale-aware number formatting utilities
 */

/**
 * Format options for numbers across different locales
 */
interface LocaleNumberFormat {
  thousands: string;
  decimal: string;
  groupSize: number;
  currencySymbol: string;
  currencyCode: string;
  percentSymbol: string;
  currencyFormat: string; // {symbol}{value} or {value}{symbol}
}

/**
 * Number format specifications by locale
 */
const NUMBER_FORMATS: Record<string, LocaleNumberFormat> = {
  en: {
    thousands: ',',
    decimal: '.',
    groupSize: 3,
    currencySymbol: '$',
    currencyCode: 'USD',
    percentSymbol: '%',
    currencyFormat: '{symbol}{value}',
  },
  fr: {
    thousands: ' ',
    decimal: ',',
    groupSize: 3,
    currencySymbol: '€',
    currencyCode: 'EUR',
    percentSymbol: '%',
    currencyFormat: '{value} {symbol}',
  },
  es: {
    thousands: '.',
    decimal: ',',
    groupSize: 3,
    currencySymbol: '€',
    currencyCode: 'EUR',
    percentSymbol: '%',
    currencyFormat: '{value} {symbol}',
  },
  de: {
    thousands: '.',
    decimal: ',',
    groupSize: 3,
    currencySymbol: '€',
    currencyCode: 'EUR',
    percentSymbol: '%',
    currencyFormat: '{value} {symbol}',
  },
  ar: {
    thousands: '٬',
    decimal: '٫',
    groupSize: 3,
    currencySymbol: 'ر.س.‏',
    currencyCode: 'SAR',
    percentSymbol: '٪',
    currencyFormat: '{value} {symbol}',
  },
};

// Arabic digits for number formatting
const ARABIC_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

/**
 * Format a number according to locale-specific conventions
 *
 * @param value Number to format
 * @param options Format options
 * @param locale Locale code
 * @returns Formatted number string
 */
export const formatNumber = (
  value: number,
  options: {
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
    useGrouping?: boolean;
    useArabicDigits?: boolean;
  } = {},
  locale: string = 'en',
): string => {
  const baseLocale = locale.split('-')[0].toLowerCase();
  const format = NUMBER_FORMATS[baseLocale] || NUMBER_FORMATS.en;

  // Default options
  const {
    minimumFractionDigits = 0,
    maximumFractionDigits = 2,
    useGrouping = true,
    useArabicDigits = baseLocale === 'ar',
  } = options;

  // Handle Infinity and NaN
  if (!isFinite(value)) {
    return value.toString();
  }

  // Split into integer and decimal parts
  const parts = value.toFixed(maximumFractionDigits).split('.');
  let intPart = parts[0];
  let decimalPart = parts[1] || '';

  // Ensure minimum fraction digits
  while (decimalPart.length < minimumFractionDigits) {
    decimalPart += '0';
  }

  // Add thousands separators to integer part
  if (useGrouping) {
    const regex = new RegExp(`\\B(?=(\\d{${format.groupSize}})+(?!\\d))`, 'g');
    intPart = intPart.replace(regex, format.thousands);
  }

  // Combine parts
  let result = intPart;
  if (decimalPart.length > 0) {
    result += format.decimal + decimalPart;
  }

  // Convert to Arabic digits if needed
  if (useArabicDigits) {
    result = result.replace(/[0-9]/g, (m) => ARABIC_DIGITS[parseInt(m, 10)]);
  }

  return result;
};

/**
 * Format a currency value according to locale
 *
 * @param value Currency amount
 * @param options Format options
 * @param locale Locale code
 * @returns Formatted currency string
 */
export const formatCurrency = (
  value: number,
  options: {
    currencyCode?: string;
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
    useArabicDigits?: boolean;
  } = {},
  locale: string = 'en',
): string => {
  const baseLocale = locale.split('-')[0].toLowerCase();
  const format = NUMBER_FORMATS[baseLocale] || NUMBER_FORMATS.en;

  // Default options
  const {
    currencyCode = format.currencyCode,
    minimumFractionDigits = 2,
    maximumFractionDigits = 2,
    useArabicDigits = baseLocale === 'ar',
  } = options;

  // Get symbol for specified currency
  let currencySymbol = format.currencySymbol;
  if (currencyCode !== format.currencyCode) {
    // Simple fallback to currency code if symbol not found
    currencySymbol = currencyCode;
  }

  // Format the number
  const formattedValue = formatNumber(
    value,
    {
      minimumFractionDigits,
      maximumFractionDigits,
      useGrouping: true,
      useArabicDigits,
    },
    locale,
  );

  // Apply currency format template
  return format.currencyFormat
    .replace('{symbol}', currencySymbol)
    .replace('{value}', formattedValue);
};

/**
 * Format a percentage value according to locale
 *
 * @param value Percentage value (0.1 = 10%)
 * @param options Format options
 * @param locale Locale code
 * @returns Formatted percentage string
 */
export const formatPercent = (
  value: number,
  options: {
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
    useArabicDigits?: boolean;
  } = {},
  locale: string = 'en',
): string => {
  const baseLocale = locale.split('-')[0].toLowerCase();
  const format = NUMBER_FORMATS[baseLocale] || NUMBER_FORMATS.en;

  // Default options
  const {
    minimumFractionDigits = 0,
    maximumFractionDigits = 0,
    useArabicDigits = baseLocale === 'ar',
  } = options;

  // Format the number (convert to percentage)
  const formattedValue = formatNumber(
    value * 100,
    {
      minimumFractionDigits,
      maximumFractionDigits,
      useGrouping: true,
      useArabicDigits,
    },
    locale,
  );

  // Add percentage symbol
  // In most locales percentage comes after the number
  return formattedValue + format.percentSymbol;
};

export default {
  formatNumber,
  formatCurrency,
  formatPercent,
};
