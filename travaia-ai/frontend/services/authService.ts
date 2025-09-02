import { userAuthService } from './apiService';
import { auth } from '../firebaseConfig';

export interface AuthResponse {
  success: boolean;
  user?: any;
  error?: string;
}

export interface UserRegistrationData {
  email: string;
  password: string;
  displayName?: string;
  phoneNumber?: string;
}

export interface UserLoginData {
  email: string;
  password: string;
}

/**
 * Authentication service that integrates Firebase Auth with TRAVAIA User Auth Service
 */
export class AuthService {
  
  /**
   * Register a new user with email and password
   */
  static async registerUser(userData: UserRegistrationData): Promise<AuthResponse> {
    try {
      const response = await userAuthService.post('/auth/register', {
        email: userData.email,
        password: userData.password,
        display_name: userData.displayName,
        phone_number: userData.phoneNumber
      });

      return {
        success: true,
        user: response.data.user
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.detail || error.message || 'Registration failed'
      };
    }
  }

  /**
   * Login user with email and password
   */
  static async loginUser(loginData: UserLoginData): Promise<AuthResponse> {
    try {
      const response = await userAuthService.post('/auth/login', {
        email: loginData.email,
        password: loginData.password
      });

      return {
        success: true,
        user: response.data.user
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.detail || error.message || 'Login failed'
      };
    }
  }

  /**
   * Sync Firebase user with backend User Auth Service
   */
  static async syncUserWithBackend(firebaseUser: any): Promise<AuthResponse> {
    try {
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

      return {
        success: true,
        user: response.data.user
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.detail || error.message || 'User sync failed'
      };
    }
  }

  /**
   * Get current user profile from backend
   */
  static async getCurrentUser(): Promise<AuthResponse> {
    try {
      const response = await userAuthService.get('/auth/me');
      
      return {
        success: true,
        user: response.data.user
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.detail || error.message || 'Failed to get user profile'
      };
    }
  }

  /**
   * Update user profile in backend
   */
  static async updateUserProfile(profileData: any): Promise<AuthResponse> {
    try {
      const response = await userAuthService.put('/auth/profile', profileData);
      
      return {
        success: true,
        user: response.data.user
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.detail || error.message || 'Profile update failed'
      };
    }
  }

  /**
   * Logout user from backend (cleanup session)
   */
  static async logoutUser(): Promise<AuthResponse> {
    try {
      await userAuthService.post('/auth/logout');
      
      return {
        success: true
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.detail || error.message || 'Logout failed'
      };
    }
  }
}

export default AuthService;
