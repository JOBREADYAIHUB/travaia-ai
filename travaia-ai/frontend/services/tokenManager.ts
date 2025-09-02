import { User as FirebaseUser } from 'firebase/auth';
import { storeAuthToken, clearAuthTokens } from './secureAuthAdapter';
import { getCsrfToken } from './csrfProtection';

/**
 * TokenManager
 * 
 * Centralized service for managing authentication tokens across the application.
 * This service handles token refreshing, validation, storage, and headers creation.
 */

// Track if we're currently refreshing a token to prevent infinite loops
let isRefreshingToken = false;

// Queue of callbacks to execute after token refresh
let refreshCallbacks: Array<(token: string) => void> = [];

/**
 * Execute all pending callbacks with the new token
 * @param token New authentication token
 */
const processQueue = (token: string) => {
  refreshCallbacks.forEach(callback => callback(token));
  refreshCallbacks = [];
};

/**
 * Get a fresh authentication token from Firebase user
 * @param user Firebase user
 * @param forceRefresh Whether to force token refresh from server
 * @returns Promise resolving to fresh token
 */
export const getFreshToken = async (
  user: FirebaseUser | null, 
  forceRefresh: boolean = false
): Promise<string | null> => {
  if (!user) return null;
  
  try {
    // Get fresh token
    const token = await user.getIdToken(forceRefresh);
    
    // Store token securely
    await storeAuthToken(user, token);
    
    return token;
  } catch (error) {
    console.error('Error refreshing token:', error);
    return null;
  }
};

/**
 * Refresh token with request queueing to prevent multiple simultaneous refreshes
 * @param user Firebase user
 * @returns Promise resolving to fresh token
 */
export const refreshTokenWithQueue = async (
  user: FirebaseUser | null
): Promise<string | null> => {
  if (!user) return null;
  
  // If already refreshing, queue this request
  if (isRefreshingToken) {
    return new Promise<string | null>((resolve) => {
      refreshCallbacks.push(token => {
        resolve(token);
      });
    });
  }
  
  // Start refreshing
  isRefreshingToken = true;
  
  try {
    // Force token refresh
    const token = await user.getIdToken(true);
    
    // Store token securely
    await storeAuthToken(user, token);
    
    isRefreshingToken = false;
    
    // Process any queued requests
    processQueue(token);
    
    return token;
  } catch (error) {
    console.error('Token refresh failed:', error);
    isRefreshingToken = false;
    return null;
  }
};

/**
 * Check if token needs refresh based on its expiration time
 * @param user Firebase user
 * @returns Promise resolving to true if token needs refresh
 */
export const doesTokenNeedRefresh = async (
  user: FirebaseUser | null
): Promise<boolean> => {
  if (!user) return false;
  
  try {
    // Get token result without refreshing
    const tokenResult = await user.getIdTokenResult(false);
    
    if (!tokenResult.expirationTime) return true;
    
    // Calculate time until expiration
    const expirationTime = new Date(tokenResult.expirationTime).getTime();
    const currentTime = Date.now();
    const timeUntilExpiration = expirationTime - currentTime;
    
    // Refresh if token expires in less than 5 minutes (300,000 ms)
    return timeUntilExpiration < 300000;
  } catch (error) {
    console.error('Error checking token expiration:', error);
    return true; // If there's an error, better to refresh
  }
};

/**
 * Create authentication headers for API requests
 * @param user Firebase user
 * @returns Promise resolving to headers object
 */
export const createAuthHeaders = async (
  user: FirebaseUser | null
): Promise<Record<string, string>> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-CSRF-Token': getCsrfToken()
  };
  
  if (!user) return headers;
  
  // Check if token needs refresh
  const needsRefresh = await doesTokenNeedRefresh(user);
  
  // Get token (fresh if needed)
  const token = await getFreshToken(user, needsRefresh);
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
};

/**
 * Handle authentication errors with automatic token refresh
 * @param user Firebase user
 * @param errorCode Error code from Firebase or response status
 * @returns Promise resolving to fresh token or null
 */
export const handleAuthError = async (
  user: FirebaseUser | null,
  errorCode: string | number
): Promise<string | null> => {
  // Handle token expired errors or permission denied errors
  if (
    user && 
    (errorCode === 'auth/id-token-expired' || 
     errorCode === 'permission-denied' ||
     errorCode === 401 || 
     errorCode === 403)
  ) {
    console.log('Auth error detected, refreshing token...');
    return refreshTokenWithQueue(user);
  }
  
  return null;
};

/**
 * Clear all authentication tokens
 * Should be called during logout
 */
export const clearAllTokens = async (): Promise<void> => {
  // Clear secure tokens
  await clearAuthTokens();
  
  // Reset refresh state
  isRefreshingToken = false;
  refreshCallbacks = [];
};
