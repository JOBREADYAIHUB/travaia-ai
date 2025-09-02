/**
 * Comprehensive Firebase Authentication Error Handler with Internationalization
 * Handles all possible Firebase Auth error codes with localized messages
 */

export interface FirebaseErrorMapping {
  [errorCode: string]: string;
}

/**
 * Complete list of Firebase Authentication error codes
 * Based on official Firebase documentation and real-world usage
 */
export const FIREBASE_AUTH_ERROR_CODES = {
  // Email/Password Authentication Errors
  'auth/email-already-in-use': 'emailAlreadyInUse',
  'auth/invalid-email': 'invalidEmail',
  'auth/operation-not-allowed': 'operationNotAllowed',
  'auth/weak-password': 'weakPassword',
  'auth/user-disabled': 'accountDisabled',
  'auth/user-not-found': 'userNotFound',
  'auth/wrong-password': 'invalidCredentials',
  'auth/invalid-credential': 'invalidCredentials',
  
  // Account Management Errors
  'auth/requires-recent-login': 'requiresRecentLogin',
  'auth/credential-already-in-use': 'credentialAlreadyInUse',
  'auth/account-exists-with-different-credential': 'accountExistsWithDifferentCredential',
  'auth/email-change-needs-verification': 'emailChangeNeedsVerification',
  'auth/email-already-verified': 'emailAlreadyVerified',
  'auth/expired-action-code': 'expiredActionCode',
  'auth/invalid-action-code': 'invalidActionCode',
  'auth/invalid-continue-uri': 'invalidContinueUri',
  'auth/missing-continue-uri': 'missingContinueUri',
  'auth/unauthorized-continue-uri': 'unauthorizedContinueUri',
  
  // Multi-factor Authentication Errors
  'auth/multi-factor-auth-required': 'multiFactorAuthRequired',
  'auth/multi-factor-info-not-found': 'multiFactorInfoNotFound',
  'auth/multi-factor-session-expired': 'multiFactorSessionExpired',
  'auth/second-factor-already-in-use': 'secondFactorAlreadyInUse',
  'auth/maximum-second-factor-count-exceeded': 'maximumSecondFactorCountExceeded',
  'auth/unsupported-first-factor': 'unsupportedFirstFactor',
  'auth/unverified-email': 'unverifiedEmail',
  
  // Network and System Errors
  'auth/network-request-failed': 'networkError',
  'auth/too-many-requests': 'tooManyRequests',
  'auth/app-deleted': 'appDeleted',
  'auth/app-not-authorized': 'appNotAuthorized',
  'auth/argument-error': 'argumentError',
  'auth/invalid-api-key': 'invalidApiKey',
  'auth/invalid-user-token': 'invalidUserToken',
  'auth/user-token-expired': 'userTokenExpired',
  'auth/web-storage-unsupported': 'webStorageUnsupported',
  
  // Provider-specific Errors
  'auth/provider-already-linked': 'providerAlreadyLinked',
  'auth/no-such-provider': 'noSuchProvider',
  'auth/invalid-provider-id': 'invalidProviderId',
  'auth/popup-blocked': 'popupBlocked',
  'auth/popup-closed-by-user': 'popupClosedByUser',
  'auth/unauthorized-domain': 'unauthorizedDomain',
  'auth/cancelled-popup-request': 'cancelledPopupRequest',
  
  // Phone Authentication Errors
  'auth/captcha-check-failed': 'captchaCheckFailed',
  'auth/phone-number-already-exists': 'phoneNumberAlreadyExists',
  'auth/invalid-phone-number': 'invalidPhoneNumber',
  'auth/missing-phone-number': 'missingPhoneNumber',
  'auth/quota-exceeded': 'quotaExceeded',
  'auth/sms-code-expired': 'smsCodeExpired',
  'auth/timeout': 'timeout',
  'auth/missing-verification-code': 'missingVerificationCode',
  'auth/invalid-verification-code': 'invalidVerificationCode',
  'auth/missing-verification-id': 'missingVerificationId',
  'auth/invalid-verification-id': 'invalidVerificationId',
  
  // Custom Token Errors
  'auth/custom-token-mismatch': 'customTokenMismatch',
  'auth/invalid-custom-token': 'invalidCustomToken',
  'auth/claims-too-large': 'claimsTooLarge',
  'auth/id-token-expired': 'idTokenExpired',
  'auth/id-token-revoked': 'idTokenRevoked',
  'auth/insufficient-permission': 'insufficientPermission',
  'auth/internal-error': 'internalError',
  'auth/invalid-argument': 'invalidArgument',
  'auth/invalid-creation-time': 'invalidCreationTime',
  'auth/invalid-disabled-field': 'invalidDisabledField',
  'auth/invalid-display-name': 'invalidDisplayName',
  'auth/invalid-dynamic-link-domain': 'invalidDynamicLinkDomain',
  'auth/invalid-email-verified': 'invalidEmailVerified',
  'auth/invalid-hash-algorithm': 'invalidHashAlgorithm',
  'auth/invalid-hash-block-size': 'invalidHashBlockSize',
  'auth/invalid-hash-derived-key-length': 'invalidHashDerivedKeyLength',
  'auth/invalid-hash-key': 'invalidHashKey',
  'auth/invalid-hash-memory-cost': 'invalidHashMemoryCost',
  'auth/invalid-hash-parallelization': 'invalidHashParallelization',
  'auth/invalid-hash-rounds': 'invalidHashRounds',
  'auth/invalid-hash-salt-separator': 'invalidHashSaltSeparator',
  'auth/invalid-id-token': 'invalidIdToken',
  'auth/invalid-last-sign-in-time': 'invalidLastSignInTime',
  'auth/invalid-page-token': 'invalidPageToken',
  'auth/invalid-password-hash': 'invalidPasswordHash',
  'auth/invalid-password-salt': 'invalidPasswordSalt',
  'auth/invalid-photo-url': 'invalidPhotoUrl',
  'auth/invalid-provider-data': 'invalidProviderData',
  'auth/invalid-provider-uid': 'invalidProviderUid',
  'auth/invalid-oauth-responsetype': 'invalidOauthResponseType',
  'auth/invalid-session-cookie-duration': 'invalidSessionCookieDuration',
  'auth/invalid-uid': 'invalidUid',
  'auth/invalid-user-import': 'invalidUserImport',
  'auth/maximum-user-count-exceeded': 'maximumUserCountExceeded',
  'auth/missing-android-pkg-name': 'missingAndroidPkgName',
  'auth/missing-client-type': 'missingClientType',
  'auth/missing-code': 'missingCode',
  'auth/missing-hash-algorithm': 'missingHashAlgorithm',
  'auth/missing-ios-bundle-id': 'missingIosBundleId',
  'auth/missing-or-invalid-nonce': 'missingOrInvalidNonce',
  'auth/missing-password': 'missingPassword',
  'auth/missing-req-type': 'missingReqType',
  'auth/missing-uid': 'missingUid',
  'auth/reserved-claims': 'reservedClaims',
  'auth/session-cookie-expired': 'sessionCookieExpired',
  'auth/session-cookie-revoked': 'sessionCookieRevoked',
  'auth/uid-already-exists': 'uidAlreadyExists',
  'auth/user-not-disabled': 'userNotDisabled',
  
  // Tenant-specific Errors
  'auth/tenant-id-mismatch': 'tenantIdMismatch',
  'auth/tenant-not-found': 'tenantNotFound',
  'auth/unsupported-tenant-operation': 'unsupportedTenantOperation',
  
  // SAML Errors
  'auth/saml-config-not-found': 'samlConfigNotFound',
  'auth/invalid-saml-response': 'invalidSamlResponse',
  
  // OAuth Errors
  'auth/oauth-token-expired': 'oauthTokenExpired',
  'auth/invalid-oauth-client-id': 'invalidOauthClientId',
  
  // Generic/Unknown Errors
  'auth/unknown': 'unknownError',
} as const;

/**
 * Centralized Firebase error handler with internationalization support
 */
export class FirebaseErrorHandler {
  private translateFunction: (key: string, options?: any) => string;

  constructor(translateFunction: (key: string, options?: any) => string) {
    this.translateFunction = translateFunction;
  }

  /**
   * Handle Firebase authentication errors and return localized messages
   * @param error - Firebase error object
   * @param fallbackMessage - Default message if translation not found
   * @returns Localized error message
   */
  public handleAuthError(error: any, fallbackMessage?: string): string {
    const errorCode = error?.code || '';
    const errorMessage = error?.message || '';
    
    console.error('Firebase Auth Error:', {
      code: errorCode,
      message: errorMessage,
      fullError: error
    });

    // Get the translation key for this error code
    const translationKey = FIREBASE_AUTH_ERROR_CODES[errorCode as keyof typeof FIREBASE_AUTH_ERROR_CODES];
    
    if (translationKey) {
      // Try to get the localized message
      const localizedMessage = this.translateFunction(translationKey);
      
      // If translation exists and is different from the key, return it
      if (localizedMessage && localizedMessage !== translationKey) {
        return localizedMessage;
      }
    }

    // Fallback to English messages for known error codes
    const englishFallbacks: { [key: string]: string } = {
      'auth/email-already-in-use': 'This email address is already registered. Please use a different email or try logging in.',
      'auth/invalid-email': 'Please enter a valid email address.',
      'auth/operation-not-allowed': 'This sign-in method is not enabled. Please contact support.',
      'auth/weak-password': 'Password is too weak. Please use a stronger password with at least 8 characters.',
      'auth/user-disabled': 'This account has been disabled. Please contact support for assistance.',
      'auth/user-not-found': 'No account found with this email address. Please check your email or create a new account.',
      'auth/wrong-password': 'Invalid email or password. Please check your credentials and try again.',
      'auth/invalid-credential': 'Invalid email or password. Please check your credentials and try again.',
      'auth/too-many-requests': 'Too many failed attempts. Please wait a moment before trying again.',
      'auth/network-request-failed': 'Network error. Please check your connection and try again.',
      'auth/requires-recent-login': 'This operation requires recent authentication. Please log in again.',
      'auth/account-exists-with-different-credential': 'An account already exists with this email but different sign-in credentials.',
      'auth/popup-blocked': 'Sign-in popup was blocked by your browser. Please allow popups and try again.',
      'auth/popup-closed-by-user': 'Sign-in was cancelled. Please try again.',
      'auth/unauthorized-domain': 'This domain is not authorized for OAuth operations.',
      'auth/invalid-phone-number': 'Please enter a valid phone number.',
      'auth/missing-verification-code': 'Please enter the verification code.',
      'auth/invalid-verification-code': 'Invalid verification code. Please try again.',
      'auth/captcha-check-failed': 'reCAPTCHA verification failed. Please try again.',
      'auth/app-not-authorized': 'This app is not authorized to use Firebase Authentication.',
      'auth/invalid-api-key': 'Invalid API key. Please contact support.',
      'auth/user-token-expired': 'Your session has expired. Please log in again.',
      'auth/web-storage-unsupported': 'Your browser does not support web storage. Please enable cookies and try again.',
    };

    // Return English fallback if available
    if (englishFallbacks[errorCode]) {
      return englishFallbacks[errorCode];
    }

    // Final fallback
    return fallbackMessage || 'An unexpected error occurred. Please try again.';
  }

  /**
   * Check if an error is a Firebase authentication error
   * @param error - Error object to check
   * @returns True if it's a Firebase auth error
   */
  public isFirebaseAuthError(error: any): boolean {
    return error?.code && typeof error.code === 'string' && error.code.startsWith('auth/');
  }

  /**
   * Get all supported error codes
   * @returns Array of all Firebase auth error codes
   */
  public getSupportedErrorCodes(): string[] {
    return Object.keys(FIREBASE_AUTH_ERROR_CODES);
  }
}

/**
 * Create a Firebase error handler instance
 * @param translateFunction - Translation function from i18n
 * @returns FirebaseErrorHandler instance
 */
export const createFirebaseErrorHandler = (
  translateFunction: (key: string, options?: any) => string
): FirebaseErrorHandler => {
  return new FirebaseErrorHandler(translateFunction);
};
