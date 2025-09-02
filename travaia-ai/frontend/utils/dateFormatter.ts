/**
 * Locale-aware date formatting utilities
 */

// Default date format patterns per locale
const DATE_FORMATS: Record<string, Record<string, string>> = {
  en: {
    short: 'MM/dd/yyyy',
    medium: 'MMM d, yyyy',
    long: 'MMMM d, yyyy',
    full: 'EEEE, MMMM d, yyyy',
  },
  fr: {
    short: 'dd/MM/yyyy',
    medium: 'd MMM yyyy',
    long: 'd MMMM yyyy',
    full: 'EEEE d MMMM yyyy',
  },
  es: {
    short: 'dd/MM/yyyy',
    medium: 'd MMM yyyy',
    long: 'd \\de MMMM \\de yyyy',
    full: 'EEEE, d \\de MMMM \\de yyyy',
  },
  de: {
    short: 'dd.MM.yyyy',
    medium: 'd. MMM yyyy',
    long: 'd. MMMM yyyy',
    full: 'EEEE, d. MMMM yyyy',
  },
  ar: {
    short: 'dd/MM/yyyy',
    medium: 'd MMM، yyyy',
    long: 'd MMMM، yyyy',
    full: 'EEEE، d MMMM، yyyy',
  },
};

// Month names by locale
const MONTH_NAMES: Record<string, string[]> = {
  en: [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ],
  fr: [
    'janvier',
    'février',
    'mars',
    'avril',
    'mai',
    'juin',
    'juillet',
    'août',
    'septembre',
    'octobre',
    'novembre',
    'décembre',
  ],
  es: [
    'enero',
    'febrero',
    'marzo',
    'abril',
    'mayo',
    'junio',
    'julio',
    'agosto',
    'septiembre',
    'octubre',
    'noviembre',
    'diciembre',
  ],
  de: [
    'Januar',
    'Februar',
    'März',
    'April',
    'Mai',
    'Juni',
    'Juli',
    'August',
    'September',
    'Oktober',
    'November',
    'Dezember',
  ],
  ar: [
    'يناير',
    'فبراير',
    'مارس',
    'أبريل',
    'مايو',
    'يونيو',
    'يوليو',
    'أغسطس',
    'سبتمبر',
    'أكتوبر',
    'نوفمبر',
    'ديسمبر',
  ],
};

// Short month names by locale
const SHORT_MONTH_NAMES: Record<string, string[]> = {
  en: [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ],
  fr: [
    'janv.',
    'févr.',
    'mars',
    'avr.',
    'mai',
    'juin',
    'juil.',
    'août',
    'sept.',
    'oct.',
    'nov.',
    'déc.',
  ],
  es: [
    'ene.',
    'feb.',
    'mar.',
    'abr.',
    'may.',
    'jun.',
    'jul.',
    'ago.',
    'sept.',
    'oct.',
    'nov.',
    'dic.',
  ],
  de: [
    'Jan.',
    'Feb.',
    'März',
    'Apr.',
    'Mai',
    'Juni',
    'Juli',
    'Aug.',
    'Sept.',
    'Okt.',
    'Nov.',
    'Dez.',
  ],
  ar: [
    'ينا',
    'فبر',
    'مار',
    'أبر',
    'ماي',
    'يون',
    'يول',
    'أغس',
    'سبت',
    'أكت',
    'نوف',
    'ديس',
  ],
};

// Day names by locale
const DAY_NAMES: Record<string, string[]> = {
  en: [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ],
  fr: ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'],
  es: [
    'domingo',
    'lunes',
    'martes',
    'miércoles',
    'jueves',
    'viernes',
    'sábado',
  ],
  de: [
    'Sonntag',
    'Montag',
    'Dienstag',
    'Mittwoch',
    'Donnerstag',
    'Freitag',
    'Samstag',
  ],
  ar: ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'],
};

/**
 * Formats date according to locale-specific patterns
 *
 * @param date Date to format
 * @param format Format type or custom format string
 * @param locale Locale code to use for formatting
 * @returns Formatted date string
 */
export const formatDate = (
  date: Date | string | number,
  format: 'short' | 'medium' | 'long' | 'full' | string = 'medium',
  locale: string = 'en',
): string => {
  // Convert to date object if needed
  const dateObj = date instanceof Date ? date : new Date(date);

  // Get base locale (en, fr, etc) without region
  const baseLocale = locale.split('-')[0].toLowerCase();

  // Use specified format or fall back to default
  const formatString =
    (format in DATE_FORMATS[baseLocale]
      ? DATE_FORMATS[baseLocale][format]
      : format) || DATE_FORMATS.en.medium;

  // Extract date components
  const day = dateObj.getDate();
  const month = dateObj.getMonth();
  const year = dateObj.getFullYear();
  const dayOfWeek = dateObj.getDay();

  // Apply format replacements
  return (
    formatString
      // Year
      .replace(/yyyy/g, year.toString())
      .replace(/yy/g, (year % 100).toString().padStart(2, '0'))
      // Month
      .replace(
        /MMMM/g,
        MONTH_NAMES[baseLocale]?.[month] || MONTH_NAMES.en[month],
      )
      .replace(
        /MMM/g,
        SHORT_MONTH_NAMES[baseLocale]?.[month] || SHORT_MONTH_NAMES.en[month],
      )
      .replace(/MM/g, (month + 1).toString().padStart(2, '0'))
      .replace(/M/g, (month + 1).toString())
      // Day
      .replace(/dd/g, day.toString().padStart(2, '0'))
      .replace(/d/g, day.toString())
      // Day of week
      .replace(
        /EEEE/g,
        DAY_NAMES[baseLocale]?.[dayOfWeek] || DAY_NAMES.en[dayOfWeek],
      )
      // Escape sequences (for literal text)
      .replace(/\\(.)/g, '$1')
  );
};

/**
 * Returns a localized relative time string (e.g. "2 days ago", "in 3 hours")
 *
 * @param date Date to format
 * @param locale Locale code
 * @returns Relative time string
 */
export const formatRelativeTime = (
  date: Date | string | number,
  locale: string = 'en',
): string => {
  // Convert to date object if needed
  const dateObj = date instanceof Date ? date : new Date(date);
  const now = new Date();

  // Get base locale
  const baseLocale = locale.split('-')[0].toLowerCase();

  // Time difference in milliseconds
  const diffMs = dateObj.getTime() - now.getTime();
  const diffAbs = Math.abs(diffMs);

  // Is this in the past or future?
  const isPast = diffMs < 0;

  // Time units in milliseconds
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;
  const month = 30 * day;
  const year = 365 * day;

  // Localized time units
  const timeUnits: Record<
    string,
    Record<string, { singular: string; plural: string }>
  > = {
    en: {
      now: { singular: 'just now', plural: 'just now' },
      minute: { singular: 'a minute', plural: '{{count}} minutes' },
      hour: { singular: 'an hour', plural: '{{count}} hours' },
      day: { singular: 'a day', plural: '{{count}} days' },
      week: { singular: 'a week', plural: '{{count}} weeks' },
      month: { singular: 'a month', plural: '{{count}} months' },
      year: { singular: 'a year', plural: '{{count}} years' },
    },
    fr: {
      now: { singular: "à l'instant", plural: "à l'instant" },
      minute: { singular: 'une minute', plural: '{{count}} minutes' },
      hour: { singular: 'une heure', plural: '{{count}} heures' },
      day: { singular: 'un jour', plural: '{{count}} jours' },
      week: { singular: 'une semaine', plural: '{{count}} semaines' },
      month: { singular: 'un mois', plural: '{{count}} mois' },
      year: { singular: 'un an', plural: '{{count}} ans' },
    },
    es: {
      now: { singular: 'ahora mismo', plural: 'ahora mismo' },
      minute: { singular: 'un minuto', plural: '{{count}} minutos' },
      hour: { singular: 'una hora', plural: '{{count}} horas' },
      day: { singular: 'un día', plural: '{{count}} días' },
      week: { singular: 'una semana', plural: '{{count}} semanas' },
      month: { singular: 'un mes', plural: '{{count}} meses' },
      year: { singular: 'un año', plural: '{{count}} años' },
    },
    de: {
      now: { singular: 'gerade jetzt', plural: 'gerade jetzt' },
      minute: { singular: 'eine Minute', plural: '{{count}} Minuten' },
      hour: { singular: 'eine Stunde', plural: '{{count}} Stunden' },
      day: { singular: 'ein Tag', plural: '{{count}} Tage' },
      week: { singular: 'eine Woche', plural: '{{count}} Wochen' },
      month: { singular: 'ein Monat', plural: '{{count}} Monate' },
      year: { singular: 'ein Jahr', plural: '{{count}} Jahre' },
    },
    ar: {
      now: { singular: 'الآن', plural: 'الآن' },
      minute: { singular: 'دقيقة واحدة', plural: '{{count}} دقائق' },
      hour: { singular: 'ساعة واحدة', plural: '{{count}} ساعات' },
      day: { singular: 'يوم واحد', plural: '{{count}} أيام' },
      week: { singular: 'أسبوع واحد', plural: '{{count}} أسابيع' },
      month: { singular: 'شهر واحد', plural: '{{count}} أشهر' },
      year: { singular: 'سنة واحدة', plural: '{{count}} سنوات' },
    },
  };

  // Get correct time unit and count
  let count = 0;
  let unit: keyof typeof timeUnits.en = 'now';

  if (diffAbs < minute) {
    unit = 'now';
    count = 0;
  } else if (diffAbs < hour) {
    unit = 'minute';
    count = Math.round(diffAbs / minute);
  } else if (diffAbs < day) {
    unit = 'hour';
    count = Math.round(diffAbs / hour);
  } else if (diffAbs < week) {
    unit = 'day';
    count = Math.round(diffAbs / day);
  } else if (diffAbs < month) {
    unit = 'week';
    count = Math.round(diffAbs / week);
  } else if (diffAbs < year) {
    unit = 'month';
    count = Math.round(diffAbs / month);
  } else {
    unit = 'year';
    count = Math.round(diffAbs / year);
  }

  // Get localized unit, fallback to English if locale not supported
  const unitStrings = timeUnits[baseLocale]?.[unit] || timeUnits.en[unit];

  // Format the string with count
  let timeString =
    count <= 1
      ? unitStrings.singular
      : unitStrings.plural.replace('{{count}}', count.toString());

  // Add past/future prefix/suffix
  if (unit !== 'now') {
    if (isPast) {
      // Add locale-specific "ago" suffix
      switch (baseLocale) {
        case 'fr':
          timeString = `il y a ${timeString}`;
          break;
        case 'es':
          timeString = `hace ${timeString}`;
          break;
        case 'de':
          timeString = `vor ${timeString}`;
          break;
        case 'ar':
          timeString = `منذ ${timeString}`;
          break;
        default:
          timeString = `${timeString} ago`;
      }
    } else {
      // Add locale-specific future prefix
      switch (baseLocale) {
        case 'fr':
          timeString = `dans ${timeString}`;
          break;
        case 'es':
          timeString = `en ${timeString}`;
          break;
        case 'de':
          timeString = `in ${timeString}`;
          break;
        case 'ar':
          timeString = `في ${timeString}`;
          break;
        default:
          timeString = `in ${timeString}`;
      }
    }
  }

  return timeString;
};

export default {
  formatDate,
  formatRelativeTime,
};
