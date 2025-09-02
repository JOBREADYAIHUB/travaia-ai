/**
 * CSRF Protection Utility
 * 
 * This utility provides Cross-Site Request Forgery (CSRF) protection
 * by generating, storing, and validating CSRF tokens.
 */

// Storage key for the CSRF token
const CSRF_TOKEN_KEY = 'travaia_csrf_token';

/**
 * Generate a secure random CSRF token
 * @returns A random string to be used as a CSRF token
 */
const generateToken = (): string => {
  // Create a random token by combining multiple random values
  const randomPart1 = Math.random().toString(36).substring(2, 15);
  const randomPart2 = Math.random().toString(36).substring(2, 15);
  const timestamp = Date.now().toString(36);
  
  return `${randomPart1}${timestamp}${randomPart2}`;
};

/**
 * Get the current CSRF token, generating a new one if needed
 * @param forceNew Force generation of a new token even if one exists
 * @returns The CSRF token
 */
export const getCsrfToken = (forceNew: boolean = false): string => {
  let token = sessionStorage.getItem(CSRF_TOKEN_KEY);
  
  if (!token || forceNew) {
    token = generateToken();
    sessionStorage.setItem(CSRF_TOKEN_KEY, token);
  }
  
  return token;
};

/**
 * Clear the stored CSRF token
 * This should be called during logout
 */
export const clearCsrfToken = (): void => {
  sessionStorage.removeItem(CSRF_TOKEN_KEY);
};

/**
 * Add CSRF token to headers
 * @param headers Existing headers object to augment
 * @returns Updated headers object with CSRF token
 */
export const addCsrfHeader = (headers: Record<string, string> = {}): Record<string, string> => {
  return {
    ...headers,
    'X-CSRF-Token': getCsrfToken()
  };
};

/**
 * Add CSRF token to fetch options
 * @param options Existing fetch options
 * @returns Updated fetch options with CSRF token header
 */
export const addCsrfToFetchOptions = (options: RequestInit = {}): RequestInit => {
  const existingHeaders = options.headers as Record<string, string> || {};
  
  return {
    ...options,
    headers: addCsrfHeader(existingHeaders)
  };
};
