import { User as FirebaseUser } from 'firebase/auth';

/**
 * Secure Authentication Adapter
 * 
 * This service provides a more secure approach to token management by:
 * 1. Minimizing token exposure in browser memory
 * 2. Supporting HTTP-only cookies for refresh tokens when a backend is available
 * 3. Adding CSRF protection for token operations
 */

// Configuration for the secure auth adapter
interface SecureAuthConfig {
  // Base URL for authentication API endpoints
  apiBaseUrl?: string;
  
  // Whether to use HTTP-only cookies (requires backend support)
  useHttpOnlyCookies: boolean;
  
  // Whether to use CSRF protection for token operations
  useCsrfProtection: boolean;
}

// Default configuration
const defaultConfig: SecureAuthConfig = {
  apiBaseUrl: '/api/auth',
  useHttpOnlyCookies: false, // Default to false as it requires backend support
  useCsrfProtection: true
};

// Store configuration
let config: SecureAuthConfig = {...defaultConfig};

/**
 * Initialize the secure auth adapter
 * @param customConfig Custom configuration options
 */
export const initSecureAuth = (customConfig: Partial<SecureAuthConfig> = {}) => {
  config = {
    ...defaultConfig,
    ...customConfig
  };
  
  console.log('Secure Auth Adapter initialized with config:', 
    JSON.stringify({
      useHttpOnlyCookies: config.useHttpOnlyCookies,
      useCsrfProtection: config.useCsrfProtection
    })
  );
};

/**
 * Generate a CSRF token for protection against CSRF attacks
 * @returns CSRF token
 */
const generateCsrfToken = (): string => {
  const token = Math.random().toString(36).substring(2, 15) + 
               Math.random().toString(36).substring(2, 15);
               
  // Store in sessionStorage for the duration of the session
  sessionStorage.setItem('csrf_token', token);
  return token;
};

/**
 * Get the current CSRF token or generate a new one
 * @returns Current CSRF token
 */
export const getCsrfToken = (): string => {
  let token = sessionStorage.getItem('csrf_token');
  
  if (!token) {
    token = generateCsrfToken();
  }
  
  return token;
};

/**
 * Store an ID token securely
 * When HTTP-only cookies are enabled and backend support exists:
 * - ID token is sent to backend to be stored as HTTP-only cookie
 * - Only a minimal reference is kept in memory
 * 
 * Otherwise:
 * - Token is stored in memory only (not localStorage/sessionStorage)
 * 
 * @param user Firebase user
 * @param idToken ID token to store
 */
export const storeAuthToken = async (
  user: FirebaseUser,
  idToken: string
): Promise<void> => {
  if (config.useHttpOnlyCookies) {
    try {
      // When using HTTP-only cookies, send token to backend to set as cookie
      const response = await fetch(`${config.apiBaseUrl}/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Add CSRF protection
          ...(config.useCsrfProtection ? { 'X-CSRF-Token': getCsrfToken() } : {})
        },
        // Include credentials to allow cookies to be set
        credentials: 'include',
        body: JSON.stringify({ token: idToken, uid: user.uid })
      });
      
      if (!response.ok) {
        throw new Error('Failed to store auth token securely');
      }
      
      console.log('Auth token securely stored in HTTP-only cookie');
    } catch (error) {
      console.error('Error storing auth token:', error);
      throw error;
    }
  } else {
    // In-memory storage only - nothing to do as Firebase manages this
    console.log('Using Firebase default token management (in-memory)');
  }
};

/**
 * Clear stored authentication tokens
 * This should be called during logout
 */
export const clearAuthTokens = async (): Promise<void> => {
  if (config.useHttpOnlyCookies) {
    try {
      // When using HTTP-only cookies, call backend to clear cookies
      const response = await fetch(`${config.apiBaseUrl}/logout`, {
        method: 'POST',
        headers: {
          ...(config.useCsrfProtection ? { 'X-CSRF-Token': getCsrfToken() } : {})
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        console.warn('Failed to clear auth tokens from HTTP-only cookies');
      }
    } catch (error) {
      console.error('Error clearing auth tokens:', error);
    }
  }
  
  // Always clear any CSRF token
  sessionStorage.removeItem('csrf_token');
};

/**
 * Get auth headers for API requests
 * When using HTTP-only cookies, this only adds CSRF token
 * Otherwise, it adds the current Firebase ID token from the user
 * 
 * @param user Firebase user
 * @returns Headers object with authentication headers
 */
export const getAuthHeaders = async (
  user: FirebaseUser | null
): Promise<Record<string, string>> => {
  const headers: Record<string, string> = {};
  
  if (config.useCsrfProtection) {
    headers['X-CSRF-Token'] = getCsrfToken();
  }
  
  // When using HTTP-only cookies, the ID token is automatically included by the browser
  // We only need to add it manually if NOT using HTTP-only cookies
  if (!config.useHttpOnlyCookies && user) {
    try {
      const token = await user.getIdToken(false);
      headers['Authorization'] = `Bearer ${token}`;
    } catch (error) {
      console.error('Error getting ID token for headers:', error);
    }
  }
  
  return headers;
};
