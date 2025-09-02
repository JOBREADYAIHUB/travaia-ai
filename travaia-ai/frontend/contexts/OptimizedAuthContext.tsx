import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  ReactNode,
  useCallback,
  useMemo,
} from 'react';
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithRedirect,
  signInWithPopup,
  getRedirectResult,
  updateProfile as updateFirebaseUserProfile,
  fetchSignInMethodsForEmail,
  sendEmailVerification,
} from 'firebase/auth';
import type { User as FirebaseUser } from 'firebase/auth';
import { auth, db } from '../firebaseConfig';
import { storeAuthToken, clearAuthTokens, initSecureAuth } from '../services/secureAuthAdapter';
import {
  doc,
  setDoc,
  Timestamp,
} from 'firebase/firestore';
import { UserProfile } from '../types';
import { useTranslation } from 'react-i18next';
import {
  fetchUserProfileDocument,
  updateUserProfile,
} from '../services/firestoreService';

// Split contexts for better performance
interface AuthState {
  currentUser: LocalUserProfile | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  error: string | null;
}

interface AuthActions {
  validatePassword: (password: string) => { isValid: boolean; errors: string[] };
  signUpWithEmail: (email: string, password: string, displayName: string) => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithMicrosoft: () => Promise<void>;
  signOutUser: () => Promise<void>;
  checkEmailExists: (email: string) => Promise<EmailCheckResult>;
  updateUserProfileData: (profileData: Partial<UserProfile>) => Promise<void>;
  refreshUserProfile: () => Promise<void>;
  clearError: () => void;
}

export interface EmailCheckResult {
  exists: boolean;
  displayName?: string;
}

interface LocalUserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
  profile?: UserProfile;
}

// Separate contexts to prevent unnecessary re-renders
const AuthStateContext = createContext<AuthState | undefined>(undefined);
const AuthActionsContext = createContext<AuthActions | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const OptimizedAuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const { t } = useTranslation();
  
  // State management
  const [currentUser, setCurrentUser] = useState<LocalUserProfile | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Memoized state object to prevent unnecessary re-renders
  const authState = useMemo<AuthState>(() => ({
    currentUser,
    firebaseUser,
    loading,
    error,
  }), [currentUser, firebaseUser, loading, error]);

  // Password validation
  const validatePassword = useCallback((password: string) => {
    const errors: string[] = [];
    
    if (password.length < 8) {
      errors.push(t('auth.validation.passwordTooShort'));
    }
    if (!/[A-Z]/.test(password)) {
      errors.push(t('auth.validation.passwordNeedsUppercase'));
    }
    if (!/[a-z]/.test(password)) {
      errors.push(t('auth.validation.passwordNeedsLowercase'));
    }
    if (!/\d/.test(password)) {
      errors.push(t('auth.validation.passwordNeedsNumber'));
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push(t('auth.validation.passwordNeedsSpecialChar'));
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }, [t]);

  // User profile management
  const fetchAndSetUserProfile = useCallback(async (user: FirebaseUser) => {
    try {
      const profileDoc = await fetchUserProfileDocument(user.uid);
      const localUser: LocalUserProfile = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        emailVerified: user.emailVerified,
        profile: profileDoc || undefined,
      };
      setCurrentUser(localUser);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      setError(t('auth.errors.profileFetchFailed'));
    }
  }, [t]);

  // Authentication methods
  const signUpWithEmail = useCallback(async (email: string, password: string, displayName: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      await updateFirebaseUserProfile(user, { displayName });
      
      const userProfile: UserProfile = {
        uid: user.uid,
        email: user.email!,
        displayName: displayName,
        photoURL: user.photoURL,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        emailVerified: user.emailVerified,
        profile_data: {
          skills: [],
          education: [],
          experience: [],
        },
        settings: {
          notifications: {
            email: true,
            push: true,
            interview_reminders: true,
            job_alerts: true,
          },
          privacy: {
            profile_visibility: 'private',
            data_sharing: false,
          },
          preferences: {
            theme: 'system',
            language: 'en',
          },
        },
        progress: {
          xp: 0,
          level: 1,
          current_streak: 0,
          longest_streak: 0,
          last_activity: Timestamp.now(),
        },
      };
      
      await setDoc(doc(db, 'users', user.uid), userProfile);
      await sendEmailVerification(user);
      
    } catch (error: any) {
      setError(error.message || t('auth.errors.signUpFailed'));
      throw error;
    } finally {
      setLoading(false);
    }
  }, [t]);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      setError(error.message || t('auth.errors.signInFailed'));
      throw error;
    } finally {
      setLoading(false);
    }
  }, [t]);

  const signInWithGoogle = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const provider = new GoogleAuthProvider();
      provider.addScope('profile');
      provider.addScope('email');
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      setError(error.message || t('auth.errors.googleSignInFailed'));
      throw error;
    } finally {
      setLoading(false);
    }
  }, [t]);

  const signInWithMicrosoft = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const provider = new OAuthProvider('microsoft.com');
      provider.addScope('profile');
      provider.addScope('email');
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      setError(error.message || t('auth.errors.microsoftSignInFailed'));
      throw error;
    } finally {
      setLoading(false);
    }
  }, [t]);

  const signOutUser = useCallback(async () => {
    try {
      setLoading(true);
      await signOut(auth);
      await clearAuthTokens();
      setCurrentUser(null);
      setFirebaseUser(null);
    } catch (error: any) {
      setError(error.message || t('auth.errors.signOutFailed'));
      throw error;
    } finally {
      setLoading(false);
    }
  }, [t]);

  const checkEmailExists = useCallback(async (email: string): Promise<EmailCheckResult> => {
    try {
      const signInMethods = await fetchSignInMethodsForEmail(auth, email);
      return {
        exists: signInMethods.length > 0,
      };
    } catch (error) {
      return { exists: false };
    }
  }, []);

  const updateUserProfileData = useCallback(async (profileData: Partial<UserProfile>) => {
    if (!currentUser?.uid) return;
    
    try {
      setLoading(true);
      await updateUserProfile(currentUser.uid, profileData);
      await fetchAndSetUserProfile(firebaseUser!);
    } catch (error: any) {
      setError(error.message || t('auth.errors.profileUpdateFailed'));
      throw error;
    } finally {
      setLoading(false);
    }
  }, [currentUser?.uid, firebaseUser, fetchAndSetUserProfile, t]);

  const refreshUserProfile = useCallback(async () => {
    if (!firebaseUser) return;
    await fetchAndSetUserProfile(firebaseUser);
  }, [firebaseUser, fetchAndSetUserProfile]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Memoized actions object to prevent unnecessary re-renders
  const authActions = useMemo<AuthActions>(() => ({
    validatePassword,
    signUpWithEmail,
    signInWithEmail,
    signInWithGoogle,
    signInWithMicrosoft,
    signOutUser,
    checkEmailExists,
    updateUserProfileData,
    refreshUserProfile,
    clearError,
  }), [
    validatePassword,
    signUpWithEmail,
    signInWithEmail,
    signInWithGoogle,
    signInWithMicrosoft,
    signOutUser,
    checkEmailExists,
    updateUserProfileData,
    refreshUserProfile,
    clearError,
  ]);

  // Firebase auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      
      if (user) {
        await storeAuthToken(await user.getIdToken());
        await fetchAndSetUserProfile(user);
      } else {
        setCurrentUser(null);
        await clearAuthTokens();
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, [fetchAndSetUserProfile]);

  // Initialize secure auth
  useEffect(() => {
    initSecureAuth();
  }, []);

  return (
    <AuthStateContext.Provider value={authState}>
      <AuthActionsContext.Provider value={authActions}>
        {children}
      </AuthActionsContext.Provider>
    </AuthStateContext.Provider>
  );
};

// Optimized hooks that only subscribe to what they need
export const useAuthState = () => {
  const context = useContext(AuthStateContext);
  if (context === undefined) {
    throw new Error('useAuthState must be used within an OptimizedAuthProvider');
  }
  return context;
};

export const useAuthActions = () => {
  const context = useContext(AuthActionsContext);
  if (context === undefined) {
    throw new Error('useAuthActions must be used within an OptimizedAuthProvider');
  }
  return context;
};

// Convenience hook for components that need both
export const useAuth = () => {
  const state = useAuthState();
  const actions = useAuthActions();
  return { ...state, ...actions };
};
