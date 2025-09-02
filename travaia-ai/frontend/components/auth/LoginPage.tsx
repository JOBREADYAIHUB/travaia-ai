import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { useLocalization } from '../../contexts/LocalizationContext';
import LanguageSelector from '../common/LanguageSelector';
import SuccessMessage from '../common/SuccessMessage';
import PasswordStrengthIndicator from './PasswordStrengthIndicator';
import PasswordMatchIndicator from './PasswordMatchIndicator';
import { FirebaseErrorHandler } from '../../utils/firebaseErrorHandler';
import './LoginPage.css'; // Using regular CSS classes

/**
 * Modern Login Page Component
 * Designed to match the provided UI mockup with Travaia brand colors
 */
const LoginPage: React.FC = () => {
  // Get auth context
  const {
    currentUser,
    signUpWithEmail,
    signInWithEmail,
    signInWithGoogle,
    signInWithGitHub,
    signInWithLinkedIn,
    signInWithFacebook,
    resetPassword,
    loading,
    error: authError,
    clearError,
  } = useAuth();

  // Get translation function from localization context (same as Dashboard)
  const { translate, language } = useLocalization();

  // Start with login UI state for the modern design
  const [isRegistering, setIsRegistering] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Create refs for input elements to handle ARIA attributes directly
  const emailInputRef = React.useRef<HTMLInputElement>(null);
  const passwordInputRef = React.useRef<HTMLInputElement>(null);
  const confirmPasswordInputRef = React.useRef<HTMLInputElement>(null);
  const displayNameInputRef = React.useRef<HTMLInputElement>(null);

  const errorHandler = new FirebaseErrorHandler(translate);

  // Function to get the appropriate blowing bubbles image based on language
  const getLocalizedBubblesImage = (currentLanguage: string): string => {
    const languageImageMap: { [key: string]: string } = {
      'en': '/blowing_bubbles.png',
      'fr': '/blowing_bubbles_fr.png',
      'es': '/blowing_bubbles_es.png',
      'de': '/blowing_bubbles_ge.png',
      'ar': '/blowing_bubbles_ar.png'
    };
    
    return languageImageMap[currentLanguage] || '/blowing_bubbles.png'; // fallback to English
  };

  // Handle redirects at app level instead
  useEffect(() => {
    if (currentUser && typeof currentUser.recruiter === 'boolean') {
      console.log('LoginPage: User authenticated, App.tsx will handle navigation');
    }
  }, [currentUser]);

  // Hide navbar header on login page
  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `header#main-navbar { display: none !important; }`;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Handle auth errors
  useEffect(() => {
    if (authError) {
      setError(authError);
    }
  }, [authError]);

  // Clear success message when there's an error
  useEffect(() => {
    if (error) {
      setShowSuccess(false);
      setSuccessMessage('');
    }
  }, [error]);
  
  // Update ARIA attributes directly via refs to avoid React rendering issues
  useEffect(() => {
    // Set aria-invalid attribute directly on DOM elements
    if (emailInputRef.current) {
      emailInputRef.current.setAttribute('aria-invalid', error ? 'true' : 'false');
    }
    if (passwordInputRef.current) {
      passwordInputRef.current.setAttribute('aria-invalid', error ? 'true' : 'false');
    }
    if (confirmPasswordInputRef.current) {
      confirmPasswordInputRef.current.setAttribute('aria-invalid', error ? 'true' : 'false');
    }
    if (displayNameInputRef.current) {
      displayNameInputRef.current.setAttribute('aria-invalid', error ? 'true' : 'false');
    }
  }, [error]);

  // Clear any auth errors when component mounts
  useEffect(() => {
    clearError();
  }, [clearError]);

  // Translations are loaded when component mounts


  // Handle registration
  const handleRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Registration form submitted!', { email, displayName, password: '•'.repeat(password.length) });
    console.log('signUpWithEmail function available:', typeof signUpWithEmail);
    console.log('loading state:', loading);
    console.log('Auth context loading state:', loading);
    console.log('Current user state:', currentUser);
    // Debug auth state
    
    // Prevent multiple submissions
    if (loading) {
      console.log('Registration blocked - already loading');
      return;
    }
    
    setError(null);
    clearError();

    // Client-side validation - only require displayName if explicitly registering
    const isExplicitRegistration = isRegistering;
    const requiredFieldsMissing = !email || !password || !confirmPassword || (isExplicitRegistration && !displayName);
    
    if (requiredFieldsMissing) {
      console.log('Validation failed - missing fields:', { 
        displayName: !!displayName, 
        email: !!email, 
        password: !!password, 
        confirmPassword: !!confirmPassword,
        isExplicitRegistration 
      });
      setError(translate('pleaseEnterAllFields') || 'Please fill in all fields');
      return;
    }
    console.log('All fields present, continuing validation...');

    if (!email.includes('@') || !email.includes('.')) {
      setError(translate('invalidEmail') || 'Please enter a valid email address.');
      return;
    }

    if (password !== confirmPassword) {
      console.log('Password mismatch validation failed');
      setError(translate('passwordsDoNotMatchDetailed') || 'Passwords do not match. Please ensure both password fields are identical.');
      return;
    }

    if (password.length < 8) {
      console.log('Password length validation failed');
      setError(translate('passwordTooShort') || 'Password must be at least 8 characters');
      return;
    }

    // Password strength validation
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    console.log('Password strength check:', { hasUpperCase, hasLowerCase, hasNumbers, hasSpecialChar });
    
    if (!hasUpperCase || !hasLowerCase || !hasNumbers || !hasSpecialChar) {
      console.log('Password strength validation failed');
      const missingRequirements = [];
      if (!hasUpperCase) missingRequirements.push(translate('passwordRequirementUppercase') || 'uppercase letter');
      if (!hasLowerCase) missingRequirements.push(translate('passwordRequirementLowercase') || 'lowercase letter');
      if (!hasNumbers) missingRequirements.push(translate('passwordRequirementNumber') || 'number');
      if (!hasSpecialChar) missingRequirements.push(translate('passwordRequirementSpecialChar') || 'special character (!@#$%^&*)');
      
      const errorMessage = translate('passwordMustContainRequirements', { requirements: missingRequirements.join(', ') }) || `Password must contain at least one ${missingRequirements.join(', ')}. Please strengthen your password.`;
      setError(errorMessage);
      return;
    }
    
    console.log('All validations passed, proceeding to Firebase registration');
    console.log('signUpWithEmail function:', signUpWithEmail);
    console.log('signUpWithEmail type:', typeof signUpWithEmail);

    console.log('Starting Firebase registration process...');
    try {
      console.log('Calling signUpWithEmail with params:', { email, password: '***', displayName });
      const result = await signUpWithEmail(email, password, displayName || undefined);
      console.log('signUpWithEmail completed successfully, result:', result);
      
      // Show success message
      setError(null);
      setSuccessMessage(translate('accountCreatedSuccessfully') || 'Account created successfully!');
      setShowSuccess(true);
      
      // Clear form
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setDisplayName('');
      
      console.log('Registration success flow completed');
      // Success will be handled by auth state change in App.tsx
    } catch (err: any) {
      const errorMessage = errorHandler.handleAuthError(err);
      setError(errorMessage);
    }
  };

  // Handle login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    clearError();

    // Client-side validation
    if (!email) {
      setError(translate('invalidEmail') || 'Please enter a valid email address.');
      return;
    }
    if (!password) {
      setError(translate('missingPassword') || 'Please enter your password.');
      return;
    }
    if (password.length < 6) {
      setError(translate('passwordTooShortSimple') || 'Password must be at least 6 characters');
      return;
    }

    try {
      await signInWithEmail(email, password);
      setError(null);
    } catch (err: any) {
      const errorMessage = errorHandler.handleAuthError(err);
      setError(errorMessage);
    }
  };

  // Define animation variants
  const formVariants = {
    hidden: { 
      opacity: 0, 
      y: 20,
    },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { 
        duration: 0.4, 
        ease: [0.43, 0.13, 0.23, 0.96] as [number, number, number, number],
        staggerChildren: 0.1,
      },
    },
    exit: {
      opacity: 0,
      y: -20,
      transition: {
        duration: 0.2,
        ease: [0.43, 0.13, 0.23, 0.96] as [number, number, number, number],
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { 
        duration: 0.3, 
        ease: [0.43, 0.13, 0.23, 0.96] as [number, number, number, number] 
      } 
    },
  };
  
  const logoVariant = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { 
        duration: 0.5, 
        ease: [0.43, 0.13, 0.23, 0.96] as [number, number, number, number], 
        delay: 0.1 
      }
    }
  };



  // Render form with email and password fields
  const renderEmailPasswordForm = (onSubmit: (e: React.FormEvent) => void) => (
    <motion.form
      key={isRegistering ? 'register' : 'login'}
      variants={formVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(e);
      }}
      className="formContainer"
    >
      {error ? (
        <motion.div 
          className="errorMessage"
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {error}
        </motion.div>
      ) : null}

      {isRegistering && (
        <motion.div className="inputWrapper" variants={itemVariants}>
          <div className="inputIconWrapper">
            <img src="/icons/user-icon.png" alt="Name" className="inputIcon" />
          </div>
          <input
            ref={displayNameInputRef}
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder={translate('fullName') || 'Full Name'}
            required
            className="input"
            data-testid="name-input"
            aria-label={translate('fullName') || 'Full Name'}
            autoComplete="name"
          />
        </motion.div>
      )}

      <motion.div className="inputWrapper" variants={itemVariants}>
        <div className="inputIconWrapper">
          <img src="/icons/email-icon.png" alt="Email" className="inputIcon" />
        </div>
        <input
          ref={emailInputRef}
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            // Show confirm password field if user enters email and password (new user flow)
            if (e.target.value && password && !isRegistering && !showConfirmPassword) {
              setShowConfirmPassword(true);
            }
          }}
          placeholder={translate('emailAddress')}
          required
          className="input"
          data-testid="email-input"
          aria-label={translate('emailAddress')}
          autoComplete="email"
        />
      </motion.div>
      
      <motion.div className="inputWrapper" variants={itemVariants}>
        <div className="inputIconWrapper">
          <img src="/icons/password-icon.png" alt="Password" className="inputIcon" />
        </div>
        <input
          ref={passwordInputRef}
          type="password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            // Show confirm password field if user enters email and password (new user flow)
            if (email && e.target.value && !isRegistering && !showConfirmPassword) {
              setShowConfirmPassword(true);
            }
          }}
          placeholder={translate('password')}
          required
          className="input"
          data-testid="password-input"
          aria-label={translate('password')}
          autoComplete={(isRegistering || showConfirmPassword) ? "new-password" : "current-password"}
        />
      </motion.div>

      {(isRegistering || showConfirmPassword) && (
        <>
          <motion.div className="inputWrapper" variants={itemVariants}>
            <div className="inputIconWrapper">
              <img src="/icons/password-icon.png" alt="Confirm Password" className="inputIcon" />
            </div>
            <input
              ref={confirmPasswordInputRef}
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={translate('confirmPassword') || 'Confirm Password'}
              required
              className="input"
              data-testid="confirm-password-input"
              aria-label={translate('confirmPassword') || 'Confirm Password'}
              autoComplete="new-password"
            />
          </motion.div>

          <motion.div variants={itemVariants}>
            <PasswordStrengthIndicator 
              password={password}
              showRequirements={true}
            />
          </motion.div>

          {!isRegistering && showConfirmPassword && (
            <motion.div className="inputWrapper" variants={itemVariants}>
              <div className="inputIconWrapper">
                <img src="/icons/user-icon.png" alt="Name" className="inputIcon" />
              </div>
              <input
                ref={displayNameInputRef}
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder={translate('fullNameOptional') || 'Full Name (Optional)'}
                className="input"
                data-testid="name-input"
                aria-label={translate('fullName') || 'Full Name'}
                autoComplete="name"
              />
            </motion.div>
          )}

          <motion.div variants={itemVariants}>
            <PasswordMatchIndicator 
              password={password}
              confirmPassword={confirmPassword}
              showIndicator={true}
            />
          </motion.div>

          <motion.div className="inputWrapper" variants={itemVariants}>
            <div className="inputIconWrapper">
              <img src="/icons/language-icon.png" alt="Language" className="inputIcon" />
            </div>
            <div className="language-selector-wrapper">
              <LanguageSelector 
                variant="mobile" 
                className="login-language-selector"
                showLabel={false}
              />
            </div>
          </motion.div>
        </>
      )}
      
      <motion.button
        type="submit"
        className="primaryButton"
        disabled={loading}
        variants={itemVariants}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        {loading ? (
          <>
            <div className="spinnerIcon">⏳</div>
            {translate('pleaseWait')}
          </>
        ) : (
          (isRegistering || showConfirmPassword) ? translate('createAccount') : translate('signIn')
        )}
      </motion.button>
      
      <div className="toggleModeContainer">
        <p className="toggleText">
          {(isRegistering || showConfirmPassword) ? translate('alreadyHaveAccount') : translate('newToTravaia')}
          <button
            type="button"
            onClick={() => {
              if (isRegistering || showConfirmPassword) {
                setIsRegistering(false);
                setShowConfirmPassword(false);
              } else {
                setIsRegistering(true);
                setShowConfirmPassword(true);
              }
              setError(null);
              clearError();
            }}
            className="toggleButton"
          >
            {(isRegistering || showConfirmPassword) ? translate('signIn') : translate('createFreeAccount')}
          </button>
        </p>
      </div>

      <motion.div 
        className="socialLoginContainer"
        variants={itemVariants}
      >
          <div className="divider">
            <span>{translate('orContinueWith')}</span>
          </div>
          
          <div className="socialButtons">
            <button 
              type="button" 
              className="socialButton" 
              onClick={() => signInWithGoogle()}
              aria-label={translate('signInWithGoogle')}
            >
              <span className="socialIcon googleIcon">G</span>
              <span>{translate('google')}</span>
            </button>
            
            <button 
              type="button" 
              className="socialButton" 
              onClick={() => signInWithApple()}
              aria-label={translate('signInWithApple')}
            >
              <img src="/icons/apple-logo-icon.png" alt="Apple" className="socialIcon" />
              <span>{translate('apple')}</span>
            </button>
            
            <button 
              type="button" 
              className="socialButton" 
              onClick={() => signInWithLinkedIn()}
              aria-label={translate('signInWithLinkedIn')}
            >
              <img src="/icons/linkedin-icon.png" alt="LinkedIn" className="socialIcon" />
              <span>{translate('linkedIn')}</span>
            </button>
          </div>
        </motion.div>
    </motion.form>
  );

  // Main render
  return (
    <div className="loginContainer">
      <div className="loginCard">
        {/* Welcome section with logo and decorative elements */}
        <div className="welcomeSection">
          {/* Logo at top of welcome section */}
          <motion.img 
            src="/travaia_logo.png" 
            alt="Travaia" 
            className="welcomeLogo"
            initial="hidden"
            animate="visible"
            variants={logoVariant}
          />
          
          <motion.h1 
            className="welcomeTitle"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            {translate('welcomeToTravaia')}
          </motion.h1>
          <motion.p 
            className="welcomeText"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            {translate('loginWelcomeMessage')}
          </motion.p>
          
          {/* Interview image - only visible on larger screens */}
          <motion.img 
            src="https://firebasestorage.googleapis.com/v0/b/travaia-e1310.firebasestorage.app/o/appfiles%2Face_interview.png?alt=media&token=9d404e5d-6556-4f39-86d7-4ed2c8ca2441"
            alt="AI Interview Assistant"
            className="interviewImage"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, duration: 0.6 }}
          />
          
          {/* Decorative circles */}
          <div className="decorativeCircle circle1"></div>
          <div className="decorativeCircle circle2"></div>
          <div className="decorativeCircle circle3"></div>
        </div>
        
        {/* Login form section */}
        <div className="loginForm">
          <motion.h2 className="formTitle" variants={itemVariants}>
            {translate('signInOrCreateAccount')}
          </motion.h2>
          
          <AnimatePresence mode="wait">
            {renderEmailPasswordForm((isRegistering || showConfirmPassword) ? handleRegistration : handleLogin)}
          </AnimatePresence>
        </div>
      </div>
      
      {/* Language selector at bottom of page */}
      <div className="languageSelectorContainer">
        <LanguageSelector variant="compact" />
      </div>
      
      {/* Blowing bubbles decorative image */}
      <div className="blowingBubblesContainer">
        <img 
          src={getLocalizedBubblesImage(language)} 
          alt={translate('decorativeBubbles') || 'Decorative bubbles'} 
          className="blowingBubblesImage"
        />
      </div>
      
      {/* Success Message */}
      <AnimatePresence>
        {showSuccess && (
          <SuccessMessage
            message={successMessage}
            onClose={() => setShowSuccess(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default LoginPage;
