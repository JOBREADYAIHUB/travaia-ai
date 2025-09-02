import { get } from 'lodash';
import { format, isValid, parseISO } from 'date-fns';

/**
 * Safely retrieves a nested property from an object using a path string.
 * @param obj The object to query.
 * @param path The path of the property to retrieve.
 * @param defaultValue The value to return if the path is not found.
 * @returns The value at the specified path or the default value.
 */
export const safeGet = (obj: any, path: string, defaultValue: any = null) => {
  return get(obj, path, defaultValue);
};

/**
 * Parses and formats a date from various potential formats (ISO string, Firestore Timestamp).
 * @param dateInput The date to format (string, Firestore Timestamp, etc.).
 * @param formatString The desired output format string (e.g., 'MMM d, yyyy').
 * @returns The formatted date string or an empty string if the date is invalid.
 */
export const formatTimestamp = (dateInput: any, formatString: string = 'MMM d'): string => {
  if (!dateInput) return '';

  let date: Date;

  // Handle Firestore Timestamp object with toDate() method
  if (typeof dateInput === 'object' && dateInput !== null && typeof dateInput.toDate === 'function') {
    date = dateInput.toDate();
  } 
  // Handle Firestore Timestamp object with seconds and nanoseconds
  else if (typeof dateInput === 'object' && dateInput !== null && 'seconds' in dateInput) {
    date = new Date(dateInput.seconds * 1000);
  } 
  // Handle ISO 8601 string or other string representations
  else if (typeof dateInput === 'string') {
    date = parseISO(dateInput);
  } 
  // Handle native Date object
  else if (dateInput instanceof Date) {
    date = dateInput;
  } 
  // Fallback for unexpected types
  else {
    return '';
  }

  // Check if the parsed date is valid before formatting
  if (!isValid(date)) {
    return '';
  }

  return format(date, formatString);
};

/**
 * Generates initials from a name string.
 * @param name The name to generate initials from.
 * @param fallback The fallback string if the name is empty.
 * @returns A 2-character string of initials.
 */
export const getInitials = (name?: string, fallback: string = '?'): string => {
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return fallback;
  }
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();
};
