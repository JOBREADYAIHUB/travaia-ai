import { getAuth } from 'firebase/auth';

/**
 * API interceptor for handling authentication token refreshes
 * This utility adds automatic token refresh capabilities when API calls fail with 401/403 errors
 */

// Track if we're currently refreshing a token to prevent infinite loops
let isRefreshing = false;

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
 * Add authentication headers to fetch request
 * @param headers Headers object to augment
 * @returns Promise resolving to headers with auth token
 */
export const addAuthHeaders = async (headers: Record<string, string> = {}): Promise<Record<string, string>> => {
  const auth = getAuth();
  const user = auth.currentUser;
  
  if (user) {
    try {
      const token = await user.getIdToken(false); // Don't force refresh initially
      return {
        ...headers,
        'Authorization': `Bearer ${token}`
      };
    } catch (error) {
      console.error('Error getting auth token:', error);
    }
  }
  
  return headers;
};

/**
 * Handle authentication errors and refresh token if needed
 * @param response Fetch response object
 * @param originalRequest Original request configuration
 * @returns Promise resolving to response or retried request
 */
export const handleAuthErrors = async (response: Response, originalRequest: RequestInit) => {
  // If not an auth error, just return the response
  if (response.status !== 401 && response.status !== 403) {
    return response;
  }
  
  const auth = getAuth();
  const user = auth.currentUser;
  
  if (!user) {
    console.error('Auth error but no user is logged in');
    return response; // Can't refresh token without a user
  }
  
  // If we're already refreshing, queue this request
  if (isRefreshing) {
    return new Promise<Response>((resolve) => {
      refreshCallbacks.push(async (token) => {
        // Retry the original request with new token
        const newHeaders = {
          ...originalRequest.headers as Record<string, string>,
          'Authorization': `Bearer ${token}`
        };
        
        try {
          const retryResponse = await fetch(response.url, {
            ...originalRequest,
            headers: newHeaders
          });
          resolve(retryResponse);
        } catch (error) {
          console.error('Error retrying request after token refresh:', error);
          resolve(response); // Return original error response if retry fails
        }
      });
    });
  }
  
  // Start refreshing process
  isRefreshing = true;
  
  try {
    // Force token refresh
    const newToken = await user.getIdToken(true);
    isRefreshing = false;
    
    // Process any queued requests
    processQueue(newToken);
    
    // Retry the current request
    const newHeaders = {
      ...originalRequest.headers as Record<string, string>,
      'Authorization': `Bearer ${newToken}`
    };
    
    return fetch(response.url, {
      ...originalRequest,
      headers: newHeaders
    });
  } catch (error) {
    console.error('Token refresh failed:', error);
    isRefreshing = false;
    return response; // Return original error response
  }
};

/**
 * Fetch wrapper with automatic token refresh
 * @param url URL to fetch
 * @param options Fetch options
 * @returns Promise resolving to response
 */
export const secureFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
  // Add auth headers to initial request
  const authHeaders = await addAuthHeaders(options.headers as Record<string, string>);
  const requestOptions = {
    ...options,
    headers: authHeaders
  };
  
  try {
    const response = await fetch(url, requestOptions);
    
    // Handle 401/403 responses with token refresh
    if (response.status === 401 || response.status === 403) {
      return handleAuthErrors(response, requestOptions);
    }
    
    return response;
  } catch (error) {
    console.error('Fetch error:', error);
    throw error;
  }
};
