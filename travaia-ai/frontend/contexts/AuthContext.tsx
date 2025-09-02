import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { 
  User as FirebaseUser, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  FacebookAuthProvider,
  TwitterAuthProvider,
  GithubAuthProvider,
  sendPasswordResetEmail,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  getRedirectResult,
  OAuthProvider,
  sendEmailVerification,
  fetchSignInMethodsForEmail,
  updateProfile
} from 'firebase/auth';
import { auth, db } from '../firebaseConfig';
import { useTranslation } from 'react-i18next';
import { userAuthService } from '../services/apiService';
import { storeAuthToken, clearAuthTokens, initSecureAuth } from '../services/secureAuthAdapter';
import '../styles/authStyles.css';
import {
  doc,
  setDoc,
  Timestamp,
} from 'firebase/firestore';
import { UserProfile } from '../types';
import {
  fetchUserProfileDocument,
  updateUserProfile,
} from '../services/firestoreService';

export interface EmailCheckResult {
  exists: boolean;
  displayName?: string;
}

interface AuthContextType {
  currentUser: LocalUserProfile | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  error: string | null;
  validatePassword: (password: string) => { isValid: boolean; errors: string[] };
  signUpWithEmail: (
    email: string,
    password: string,
    displayName?: string,
    isRecruiter?: boolean,
  ) => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signInWithGoogle: (isRecruiter?: boolean) => Promise<void>;
  signInWithApple: (isRecruiter?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  updateUserProfileData: (
    data: Partial<UserProfile> & { newAvatarFile?: File },
  ) => Promise<void>;
  clearError: () => void;
  checkEmailExists: (email: string) => Promise<EmailCheckResult>;
  signInWithLinkedIn: (isRecruiter?: boolean) => Promise<void>;
  redirectToRoleDashboard: (navigate: (path: string) => void) => void;
  refreshUserData: () => Promise<void>;
  // Development mode properties
  devModeEnabled?: boolean;
  devModeLogin?: () => void;
}

interface LocalUserProfile extends Omit<UserProfile, 'createdAt'> {
  password: string;
  createdAt: string; // For local users, we store as ISO string
}

const LOCAL_USERS_KEY = 'careeraceai_local_users';
const LOCAL_CURRENT_USER_KEY = 'careeraceai_local_current_user';

const AuthContext = createContext<
  (AuthContextType & { offlineMode: boolean }) | undefined
>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [offlineMode, setOfflineMode] = useState<boolean>(
    !window.navigator.onLine,
  );
  useEffect(() => {
    const handleOnline = () => setOfflineMode(false);
    const handleOffline = () => setOfflineMode(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const [currentUser, setCurrentUser] = useState<LocalUserProfile | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation();

  // Development mode flag for easy testing
  const [devModeEnabled] = useState<boolean>(process.env.NODE_ENV !== 'production');
  
  // Development mode login function
  const devModeLogin = () => {
    if (!devModeEnabled) return;
    console.log('Dev mode login triggered');
    // Implementation for dev mode login
  };

  // Password validation function with comprehensive checks
  const validatePassword = (password: string): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    if (password.length < 8) {
      errors.push(t('passwordMinLength') || 'Password must be at least 8 characters long');
    }
    if (!/[a-z]/.test(password)) {
      errors.push(t('passwordNeedsLowercase') || 'Password must contain at least one lowercase letter');
    }
    if (!/[A-Z]/.test(password)) {
      errors.push(t('passwordNeedsUppercase') || 'Password must contain at least one uppercase letter');
    }
    if (!/\d/.test(password)) {
      errors.push(t('passwordNeedsNumber') || 'Password must contain at least one number');
    }
    if (!/[!@#$%^&*(),.?\":{}|<>]/.test(password)) {
      errors.push(t('passwordNeedsSpecialChar') || 'Password must contain at least one special character');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  };


  // Track sync attempts to prevent infinite retries
  const syncAttempts = React.useRef<Map<string, number>>(new Map());
  const lastSyncAttempt = React.useRef<Map<string, number>>(new Map());

  // Helper function to convert UserProfile to LocalUserProfile
  const convertToLocalProfile = (profile: UserProfile): LocalUserProfile => ({
    ...profile,
    createdAt: profile.createdAt?.toDate().toISOString() || new Date().toISOString(),
    password: '', // OAuth users don't have passwords
  });

  // Helper function to convert LocalUserProfile to UserProfile
  const convertToUserProfile = (localProfile: LocalUserProfile): UserProfile => ({
    ...localProfile,
    createdAt: Timestamp.fromDate(new Date(localProfile.createdAt)),
  });
  
  // Sync user data with backend service with improved error handling
  const syncWithBackend = useCallback(async (firebaseUser: FirebaseUser): Promise<void> => {
    if (offlineMode) {
      console.log('AuthContext: Skipping backend sync in offline mode');
      return;
    }

    const userId = firebaseUser.uid;
    const now = Date.now();
    const attempts = syncAttempts.current.get(userId) || 0;
    const lastAttempt = lastSyncAttempt.current.get(userId) || 0;
    
    // Prevent excessive retries - max 3 attempts with exponential backoff
    if (attempts >= 3) {
      console.log('AuthContext: Max sync attempts reached for user', userId);
      return;
    }
    
    // Implement exponential backoff: 1s, 5s, 15s
    const backoffDelay = Math.pow(2, attempts) * 1000 + (attempts * 2000);
    if (now - lastAttempt < backoffDelay) {
      console.log(`AuthContext: Sync backoff active, waiting ${backoffDelay}ms`);
      return;
    }

    try {
      console.log(`AuthContext: Syncing user with backend service (attempt ${attempts + 1})`);
      
      // Update attempt tracking
      syncAttempts.current.set(userId, attempts + 1);
      lastSyncAttempt.current.set(userId, now);
      
      const token = await firebaseUser.getIdToken(true); // Force refresh to get valid token
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
      
      const response = await userAuthService.post('/auth/sync', {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        display_name: firebaseUser.displayName,
        photo_url: firebaseUser.photoURL,
        email_verified: firebaseUser.emailVerified,
        phone_number: firebaseUser.phoneNumber,
        metadata: {
          creation_time: firebaseUser.metadata.creationTime,
          last_sign_in_time: firebaseUser.metadata.lastSignInTime
        }
      });
      
      clearTimeout(timeoutId);

      const syncedUser = response.data;
      console.log('AuthContext: Backend sync successful', syncedUser);
      
      // Reset attempt counter on success
      syncAttempts.current.delete(userId);
      lastSyncAttempt.current.delete(userId);
      
    } catch (error) {
      console.error('AuthContext: Backend sync failed:', error);
      
      // For certain errors, don't retry
      if (error instanceof Error) {
        if (error.message.includes('403') || error.message.includes('401')) {
          console.log('AuthContext: Auth error, stopping sync attempts');
          syncAttempts.current.set(userId, 999); // Prevent further attempts
        }
      }
      
      // Don't throw error to avoid breaking auth flow
      // Backend sync is supplementary, not critical for auth
    }
  }, [offlineMode]);

  const getLocalUsers = (): LocalUserProfile[] => {
    try {
      return JSON.parse(localStorage.getItem(LOCAL_USERS_KEY) || '[]');
    } catch {
      return [];
    }
  };

  const setLocalUsers = (users: LocalUserProfile[]) => {
    localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
  };

  const getLocalCurrentUser = (): LocalUserProfile | null => {
    try {
      return JSON.parse(localStorage.getItem(LOCAL_CURRENT_USER_KEY) || 'null');
    } catch {
      return null;
    }
  };

  const setLocalCurrentUser = (user: LocalUserProfile | null) => {
    if (user)
      localStorage.setItem(LOCAL_CURRENT_USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(LOCAL_CURRENT_USER_KEY);
  };

  const localSignUpWithEmail = async (
    email: string,
    password: string,
    displayName?: string,
    isRecruiter?: boolean,
  ) => {
    setLoading(true);
    setError(null);
    const users = getLocalUsers();
    if (users.find((u) => u.email === email)) {
      setError(
        t('signupFailed') || 'Registration failed: Email already exists.',
      );
      setLoading(false);
      throw new Error('Email already exists');
    }
    const newUser: LocalUserProfile = {
      uid: `local-${Date.now()}`,
      email,
      password,
      displayName: displayName || email.split('@')[0],
      avatarUrl: null,
      createdAt: new Date().toISOString(),
      recruiter: isRecruiter,
    };
    users.push(newUser);
    setLocalUsers(users);
    setLocalCurrentUser(newUser);
    // Set the LocalUserProfile directly
    setCurrentUser(newUser);
    setLoading(false);
  };

  const localSignInWithEmail = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    const users = getLocalUsers();
    const user = users.find(
      (u) => u.email === email && u.password === password,
    );
    if (!user) {
      setError(
        t('loginFailed') || 'Login failed: Incorrect email or password.',
      );
      setLoading(false);
      throw new Error('Incorrect email or password');
    }
    setLocalCurrentUser(user);
    setCurrentUser(localUserToProfileAdapter(user));
    setLoading(false);
  };

  // Helper function used by checkEmailExists when in offline mode
  const localCheckEmailExists = async (
    email: string,
  ): Promise<EmailCheckResult> => {
    const users = getLocalUsers();
    const user = users.find((u) => u.email === email);
    return { exists: !!user, displayName: user?.displayName || undefined };
  };

  const localLogout = async () => {
    setLoading(true);
    setError(null);
    setLocalCurrentUser(null);
    setCurrentUser(null);
    setLoading(false);
  };

  const localUpdateUserProfileData = async (
    data: Partial<UserProfile> & { newAvatarFile?: File },
  ) => {
    setLoading(true);
    setError(null);
    let user = getLocalCurrentUser();
    if (!user) {
      setError('User not authenticated');
      setLoading(false);
      throw new Error('User not authenticated');
    }
    if (data.displayName) user.displayName = data.displayName;
    if (data.avatarUrl) user.avatarUrl = data.avatarUrl;
    setLocalCurrentUser(user);
    const users = getLocalUsers().map((u) => (u.uid === user!.uid ? user! : u));
    setLocalUsers(users);
    setCurrentUser(localUserToProfileAdapter(user));
    setLoading(false);
  };

  // Convert local user to UserProfile compatible format
  const localUserToProfileAdapter = (localUser: LocalUserProfile | null): UserProfile | null => {
    if (!localUser) return null;
    
    // Convert string createdAt to Timestamp for compatibility with UserProfile
    return {
      ...localUser,
      createdAt: Timestamp.now(), // We can't convert ISO string to Timestamp directly, so use current time
      email: localUser.email || '', // Ensure email is never null
    };
  };
  
  useEffect(() => {
    if (offlineMode) {
      const localUser = getLocalCurrentUser();
      // Convert to proper UserProfile type before setting state
      setCurrentUser(localUserToProfileAdapter(localUser));
      setFirebaseUser(null);
      setLoading(false);
    }
  }, [offlineMode]);

  // Initialize secure authentication when component mounts
  useEffect(() => {
    if (!offlineMode) {
      // Initialize secure auth with default settings
      initSecureAuth({
        useHttpOnlyCookies: false, // Using in-memory storage as we don't have backend support yet
        useCsrfProtection: true     // Enable CSRF protection for added security
      });
      console.log('Secure authentication initialized');
    }
  }, [offlineMode]);
  
  // Handle OAuth redirect result when component mounts
  useEffect(() => {
    if (!offlineMode) {
      const handleRedirectResult = async () => {
        try {
          // Check for auth_redirect flag to see if we're expecting a redirect result
          const isRedirectFlow = sessionStorage.getItem('auth_redirect') === 'true';
          const redirectTimestamp = sessionStorage.getItem('auth_redirect_timestamp');
          const currentTime = Date.now();
          
          console.log('AuthContext: Checking for redirect result, expecting redirect?', isRedirectFlow);
          if (redirectTimestamp) {
            const elapsed = currentTime - parseInt(redirectTimestamp, 10);
            console.log(`AuthContext: Redirect started ${Math.floor(elapsed/1000)} seconds ago`);
          }
          
          // Debugging: Log auth state before checking for redirect result
          console.log('AuthContext: Current auth state before redirect check:', auth.currentUser ? 'User exists' : 'No user');
          
          // Check if we have a redirect result (handle errors properly)
          let result;
          try {
            result = await getRedirectResult(auth);
            console.log('AuthContext: Redirect result:', result ? 'Success' : 'No result');
          } catch (redirectError: any) {
            console.error('AuthContext: Error during getRedirectResult():', redirectError);
            // Only set error if this was an actual auth attempt
            if (isRedirectFlow) {
              // Handle specific Firebase auth error codes
              let errorMessage = t('authGeneralError', 'Authentication error. Please try again.');
              
              if (redirectError.code === 'auth/cancelled-popup-request' || 
                  redirectError.code === 'auth/popup-closed-by-user' ||
                  redirectError.code === 'auth/cancelled-redirect-operation') {
                errorMessage = t('authCanceledByUser', 'Authentication was canceled. Please try again.');
                console.log('AuthContext: User canceled the authentication');
              } else if (redirectError.code === 'auth/account-exists-with-different-credential') {
                errorMessage = t('authAccountExists', 'An account already exists with the same email address but different sign-in credentials.');
              } else if (redirectError.code === 'auth/network-request-failed') {
                errorMessage = t('authNetworkError', 'Network error occurred. Please check your connection and try again.');
              } else if (redirectError.code === 'auth/timeout') {
                errorMessage = t('authTimeout', 'The authentication process timed out. Please try again.');
              }
              
              setError(errorMessage);
              // Clear redirect flags since this attempt failed
              sessionStorage.removeItem('auth_redirect');
              sessionStorage.removeItem('auth_redirect_timestamp');
              localStorage.removeItem('auth_redirect_pending');
              localStorage.removeItem('auth_redirect_timestamp');
              sessionStorage.removeItem('redirecting');
              setLoading(false);
              return; // Exit early to prevent further processing
            }
          }
          
          if (result?.user) {
            console.log('AuthContext: Redirect authentication successful for', result.user.email);
            
            // Sync with backend service
            await syncWithBackend(result.user);
            
            // Update last login timestamp
            console.log('AuthContext: Updating last login timestamp');
            const userDocRef = doc(db, 'users', result.user.uid);
            await setDoc(userDocRef, { lastLoginAt: Timestamp.now() }, { merge: true });
            
            // Clear redirect flags
            console.log('AuthContext: Clearing redirect flags');
            sessionStorage.removeItem('auth_redirect');
            sessionStorage.removeItem('auth_redirect_timestamp');
            
            // Auth state listener will handle setting user state
            console.log('AuthContext: Login completed, auth state listener will handle user state');
            
            return; // Early return to prevent the finally block from overriding our loading state
          } else if (isRedirectFlow) {
            console.log('AuthContext: Expected a redirect result but got none. Possible auth failure or user canceled.');
            setError(t('authCanceledByUser', 'Authentication was canceled or failed. Please try again.'));
            
            // Clear ALL redirect flags to prevent infinite redirect loops
            console.log('AuthContext: Clearing all redirect flags');
            sessionStorage.removeItem('auth_redirect');
            sessionStorage.removeItem('auth_redirect_timestamp');
            localStorage.removeItem('auth_redirect_pending');
            localStorage.removeItem('auth_redirect_timestamp');
            sessionStorage.removeItem('redirecting');
          } else {
            console.log('AuthContext: No redirect result found');
          }
        } catch (e) {
          console.error('Authentication redirect error:', e);
          setError((e as any).message || 'Authentication redirect failed');
        } finally {
            // Always clear ALL redirect flags when done processing to prevent loops
            const wasRedirectFlow = sessionStorage.getItem('auth_redirect') === 'true';
            if (wasRedirectFlow) {
              console.log('AuthContext: Final cleanup - clearing all redirect flags');
              sessionStorage.removeItem('auth_redirect');
              sessionStorage.removeItem('auth_redirect_timestamp');
              localStorage.removeItem('auth_redirect_pending');
              localStorage.removeItem('auth_redirect_timestamp');
              sessionStorage.removeItem('redirecting');
            }
            setLoading(false);
        }
      };
      handleRedirectResult();
    }
  }, [offlineMode]);

  const fetchUserProfile = useCallback(async (firebaseUser: FirebaseUser): Promise<LocalUserProfile> => {
      try {
        const userProfile = await fetchUserProfileDocument(firebaseUser.uid);
        if (userProfile) {
          return convertToLocalProfile(userProfile);
        }
        // If no profile found, create a new one
        throw new Error('Profile not found');
      } catch (error: any) {
        console.log(
          'User profile not found on backend, creating a new one...',
        );
        const newUserProfile: LocalUserProfile = {
          uid: firebaseUser.uid,
          email: firebaseUser.email || '', // Ensure email is never null
          displayName:
            firebaseUser.displayName ||
            firebaseUser.email?.split('@')[0] ||
            t('userProfile') ||
            'User',
          avatarUrl: firebaseUser.photoURL || null,
          createdAt: new Date().toISOString(),
          recruiter: false, // Default to non-recruiter
          password: '', // Empty password for OAuth users
        };
        
        // Convert to UserProfile for backend storage
        const backendProfile: UserProfile = {
          ...newUserProfile,
          createdAt: Timestamp.now(),
        };
        
        await updateUserProfile(firebaseUser.uid, backendProfile);
        return newUserProfile;
      }
    },
    [t],
  );

  // Prevent token expiration by periodically refreshing the token in the background
  useEffect(() => {
    // Skip in offline mode
    if (offlineMode) return;
    
    let tokenRefreshInterval: NodeJS.Timeout;
    
    // Function to refresh token in the background
    const refreshTokenInBackground = async () => {
      const currentUser = auth.currentUser;
      if (currentUser) {
        console.log('AuthContext: Background token refresh started');
        try {
          // Force token refresh
          const freshToken = await currentUser.getIdToken(true);
          await storeAuthToken(currentUser, freshToken);
          console.log('AuthContext: Background token refresh completed');
        } catch (e) {
          console.error('AuthContext: Background token refresh failed:', e);
        }
      }
    };
    
    // Set up a periodic token refresh (every 10 minutes)
    const refreshInterval = setInterval(refreshTokenInBackground, 10 * 60 * 1000);
    
    // Clean up interval on unmount
    return () => clearInterval(refreshInterval);
  }, [firebaseUser]);

  // Production-ready email/password registration with backend sync
  const signUpWithEmail = async (email: string, password: string, displayNameInput?: string, isRecruiter?: boolean) => {
    console.log('AuthContext: signUpWithEmail called with:', { email, displayName: displayNameInput, isRecruiter });
    
    if (offlineMode) return localSignUpWithEmail(email, password, displayNameInput);
    
    const passwordValidation = validatePassword(password);
    console.log('AuthContext: Password validation result:', passwordValidation);
    if (!passwordValidation.isValid) {
      const errorMessage = passwordValidation.errors.join('. ');
      console.log('AuthContext: Password validation failed:', errorMessage);
      setError(errorMessage);
      throw new Error(errorMessage);
    }
    
    console.log('AuthContext: Setting loading state and starting registration');
    setLoading(true);
    // Don't clear error here - let it be cleared only on success or when a new error occurs
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password,
      );
      
      // Update the user's display name if provided
      if (displayNameInput) {
        await updateProfile(userCredential.user, {
          displayName: displayNameInput,
        });
      }
      
      // Sync with backend service (critical for production)
      await syncWithBackend(userCredential.user);
      
      // Create user document in Firestore
      const userDocRef = doc(db, 'users', userCredential.user.uid);
      const userData = {
        uid: userCredential.user.uid,
        email: userCredential.user.email || '',
        displayName: displayNameInput || userCredential.user.displayName || userCredential.user.email?.split('@')[0] || 'User',
        photoURL: userCredential.user.photoURL || null,
        createdAt: Timestamp.now(),
        lastLoginAt: Timestamp.now(),
        recruiter: isRecruiter || false,
        emailVerified: userCredential.user.emailVerified || false,
      };
      
      await setDoc(userDocRef, userData);
      
      // Send email verification
      await sendEmailVerification(userCredential.user);
      
      console.log('Registration successful, user created:', userCredential.user.uid);
      
      // Ensure auth state is properly updated
      setFirebaseUser(userCredential.user);
      
      // Fetch and set the user profile immediately
      const profile = await fetchUserProfile(userCredential.user);
      setCurrentUser(profile);
      
      // Mark auth as initialized for App.tsx redirect logic
      localStorage.setItem('auth_initialized', 'true');
      localStorage.setItem('last_auth_time', Date.now().toString());
      
      // Clear any previous errors on successful registration
      setError(null);
      setLoading(false);
      
      console.log('Registration complete, auth state updated, should redirect to dashboard');
    } catch (e: any) {
      console.error('Registration error:', e);
      let friendlyError = 'Registration failed. Please try again.';
      
      // Comprehensive error handling for production
      switch (e.code) {
        case 'auth/email-already-in-use':
          friendlyError = 'This email address is already registered. Please use a different email or try logging in.';
          break;
        case 'auth/weak-password':
          friendlyError = 'Password is too weak. Please use a stronger password with at least 8 characters.';
          break;
        case 'auth/invalid-email':
          friendlyError = 'Please enter a valid email address.';
          break;
        case 'auth/operation-not-allowed':
          friendlyError = 'This sign-in method is not enabled. Please contact support.';
          break;
        case 'auth/too-many-requests':
          friendlyError = 'Too many failed attempts. Please wait a moment before trying again.';
          break;
        case 'auth/network-request-failed':
          friendlyError = 'Network error. Please check your connection and try again.';
          break;
        default:
          friendlyError = 'Registration failed. Please try again.';
      }
      
      setError(friendlyError);
      setLoading(false);
      throw e;
    }
  };

  // Production-ready email/password sign-in with backend sync
  const signInWithEmail = async (email: string, password: string) => {
    if (offlineMode) return localSignInWithEmail(email, password);
    setLoading(true);
    // Don't clear error here - let it be cleared only on success or when a new error occurs
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password,
      );
      
      // Sync with backend service (critical for production)
      await syncWithBackend(userCredential.user);
      
      // Update Firestore
      const userDocRef = doc(db, 'users', userCredential.user.uid);
      await setDoc(
        userDocRef,
        { lastLoginAt: Timestamp.now() },
        { merge: true },
      );
      
      // Clear any previous errors on successful login
      setError(null);
      setLoading(false);
    } catch (e: any) {
      console.error('Login error:', e);
      let friendlyError = t('loginFailed');
      
      // Comprehensive error handling for production (email enumeration protection)
      switch (e.code) {
        case 'auth/user-not-found':
        case 'auth/invalid-email':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          // Use generic message for security (email enumeration protection)
          friendlyError = t('invalidCredentials') || 'Invalid email or password';
          break;
        case 'auth/too-many-requests':
          friendlyError = t('tooManyAttempts') || 'Too many failed attempts. Please try again later.';
          break;
        case 'auth/user-disabled':
          friendlyError = t('accountDisabled') || 'This account has been disabled';
          break;
        case 'auth/network-request-failed':
          friendlyError = t('networkError') || 'Network error. Please check your connection.';
          break;
        case 'auth/internal-error':
          friendlyError = t('internalError') || 'An internal error occurred. Please try again.';
          break;
        default:
          friendlyError = t('loginFailed') || 'Login failed. Please try again.';
      }
      
      setError(friendlyError);
      setLoading(false);
      throw e;
    }
  };

  // OAuth provider authentication with backend sync
  const signInWithProvider = async (
    providerInstance: GoogleAuthProvider | OAuthProvider,
    _isRecruiter?: boolean,
    usePopup: boolean = true
  ) => {
    setLoading(true);
    setError(null);
    try {
      console.log('AuthContext: Starting OAuth flow with provider:', 
        providerInstance instanceof GoogleAuthProvider ? 'Google' : 
        providerInstance instanceof OAuthProvider ? providerInstance.providerId : 'Unknown',
        usePopup ? '(popup method)' : '(redirect method)');
      
      // Configure provider for best results
      if (providerInstance instanceof GoogleAuthProvider) {
        providerInstance.addScope('https://www.googleapis.com/auth/userinfo.email');
        providerInstance.addScope('https://www.googleapis.com/auth/userinfo.profile');
        providerInstance.setCustomParameters({
          prompt: 'select_account',
          access_type: 'offline'
        });
      } else if (providerInstance instanceof OAuthProvider) {
        providerInstance.addScope('email');
        providerInstance.addScope('name');
      }
      
      // Use popup or redirect based on parameter
      if (usePopup) {
        try {
          const result = await signInWithPopup(auth, providerInstance);
          if (result?.user) {
            await syncWithBackend(result.user);
            const userDocRef = doc(db, 'users', result.user.uid);
            await setDoc(userDocRef, { lastLoginAt: Timestamp.now() }, { merge: true });
          }
        } catch (popupError) {
          console.error('AuthContext: Popup auth failed, falling back to redirect');
          await signInWithRedirect(auth, providerInstance);
        }
      } else {
        await signInWithRedirect(auth, providerInstance);
      }
    } catch (e: any) {
      console.error('Provider sign-in error:', e);
      let specificError = t('loginFailed');
      if (providerInstance instanceof GoogleAuthProvider) {
        specificError = t('googleSignInFailed') || 'Google sign-in failed';
      } else if (providerInstance instanceof OAuthProvider && providerInstance.providerId === 'apple.com') {
        specificError = t('appleSignInFailed') || 'Apple sign-in failed';
      }
      setError(specificError);
      setLoading(false);
      throw e;
    }
  };

  const signInWithGoogle = async (isRecruiter?: boolean) => {
    const provider = new GoogleAuthProvider();
    await signInWithProvider(provider, isRecruiter, true);
  };

  const signInWithApple = async (isRecruiter?: boolean) => {
    const provider = new OAuthProvider('apple.com');
    await signInWithProvider(provider, isRecruiter, true);
  };

  const signInWithLinkedIn = async (_isRecruiter?: boolean) => {
    // LinkedIn OAuth implementation would go here
    console.log('LinkedIn sign-in not yet implemented', _isRecruiter);
    setError(t('featureNotImplemented') || 'LinkedIn sign-in not yet implemented');
  };

  const checkEmailExists = async (email: string): Promise<EmailCheckResult> => {
    if (offlineMode) return localCheckEmailExists(email);
    try {
      const methods = await fetchSignInMethodsForEmail(auth, email);
      return {
        exists: methods.length > 0,
        displayName: undefined // Firebase doesn't provide display name in this check
      };
    } catch (error) {
      console.error('Error checking email:', error);
      return { exists: false };
    }
  };

  const logout = async () => {
    if (offlineMode) return localLogout();
    setLoading(true);
    setError(null);
    try {
      await signOut(auth);
      await clearAuthTokens();
      setCurrentUser(null);
      setFirebaseUser(null);
    } catch (e: any) {
      console.error('Logout error:', e);
      setError(t('logoutFailed') || 'Logout failed');
      throw e;
    } finally {
      setLoading(false);
    }
  };

  const updateUserProfileData = async (
    data: Partial<UserProfile> & { newAvatarFile?: File }
  ) => {
    if (offlineMode) return localUpdateUserProfileData(data);
    if (!currentUser) {
      setError('User not authenticated');
      throw new Error('User not authenticated');
    }
    setLoading(true);
    setError(null);
    try {
      await updateUserProfile(currentUser.uid, data);
      const updatedProfile = await fetchUserProfileDocument(currentUser.uid);
      if (updatedProfile) {
        setCurrentUser(updatedProfile);
      }
    } catch (e: any) {
      console.error('Profile update error:', e);
      setError(t('profileUpdateFailed') || 'Profile update failed');
      throw e;
    } finally {
      setLoading(false);
    }
  };

  const clearError = () => {
    setError(null);
  };

  const redirectToRoleDashboard = (navigate: (path: string) => void) => {
    if (currentUser?.recruiter) {
      navigate('/recruiter-dashboard');
    } else {
      navigate('/dashboard');
    }
  };

  const refreshUserData = async () => {
    if (!firebaseUser) return;
    try {
      const profile = await fetchUserProfile(firebaseUser);
      setCurrentUser(profile);
    } catch (error) {
      console.error('Error refreshing user data:', error);
    }
  };

  // Firebase auth state listener with improved backend sync
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('AuthContext: Auth state changed', firebaseUser?.uid);
      setLoading(true);
      
      if (firebaseUser) {
        try {
          setFirebaseUser(firebaseUser);
          
          // Sync with backend service (non-blocking)
          syncWithBackend(firebaseUser).catch(err => {
            console.log('AuthContext: Background sync failed, continuing with local auth:', err.message);
          });
          
          // Fetch user profile
          const profile = await fetchUserProfile(firebaseUser);
          setCurrentUser(profile);
          
        } catch (error) {
          console.error('AuthContext: Error during auth state change:', error);
          setError(t('authenticationError') || 'Authentication error occurred');
        }
      } else {
        setCurrentUser(null);
        setFirebaseUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []); // Remove dependencies to prevent infinite loop

  const value = {
    validatePassword,
    currentUser,
    firebaseUser,
    loading,
    error,
    signUpWithEmail,
    signInWithEmail,
    signInWithGoogle,
    signInWithApple,
    checkEmailExists,
    signInWithLinkedIn,
    logout,
    updateUserProfileData,
    clearError,
    redirectToRoleDashboard,
    refreshUserData,
    offlineMode,
    devModeEnabled,
    devModeLogin,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
