/**
 * Interactive Onboarding System
 * Provides guided tour and feature discovery for first-time users
 * Progressive disclosure to prevent overwhelm
 */

import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard, GlassButton } from '../design-system';

interface InteractiveOnboardingProps {
  isVisible: boolean;
  onComplete: () => void;
  onSkip: () => void;
  currentView: string;
}

type OnboardingStep = 
  | 'welcome'
  | 'platform-overview'
  | 'interview-types'
  | 'ai-features'
  | 'warmup-intro'
  | 'results-preview'
  | 'gamification'
  | 'mobile-tips'
  | 'complete';

interface OnboardingStepData {
  id: OnboardingStep;
  title: string;
  description: string;
  icon: string;
  targetElement?: string;
  position: 'center' | 'top' | 'bottom' | 'left' | 'right';
  showProgress: boolean;
  canSkip: boolean;
}

const InteractiveOnboarding: React.FC<InteractiveOnboardingProps> = ({
  isVisible,
  onComplete,
  onSkip,
  currentView,
}) => {
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome');
  const [isAnimating, setIsAnimating] = useState(false);
  const [userPreferences, setUserPreferences] = useState({
    experienceLevel: 'beginner' as 'beginner' | 'intermediate' | 'advanced',
    primaryGoal: 'practice' as 'practice' | 'preparation' | 'improvement',
    preferredMode: 'both' as 'text' | 'voice' | 'both',
  });
  const overlayRef = useRef<HTMLDivElement>(null);

  // Onboarding steps configuration
  const onboardingSteps: OnboardingStepData[] = [
    {
      id: 'welcome',
      title: 'Welcome to TRAVAIA Interview Bot! 🎉',
      description: 'Let\'s take a quick tour to help you get the most out of your interview practice experience.',
      icon: '👋',
      position: 'center',
      showProgress: false,
      canSkip: true,
    },
    {
      id: 'platform-overview',
      title: 'Your AI Interview Coach',
      description: 'TRAVAIA uses advanced AI to provide personalized interview practice with real-time feedback and coaching.',
      icon: '🤖',
      position: 'center',
      showProgress: true,
      canSkip: true,
    },
    {
      id: 'interview-types',
      title: 'Multiple Interview Modes',
      description: 'Choose between text-based interviews for quick practice or voice interviews for realistic experience.',
      icon: '🎯',
      position: 'center',
      showProgress: true,
      canSkip: true,
    },
    {
      id: 'ai-features',
      title: 'Intelligent Features',
      description: 'Our AI generates personalized questions, provides real-time coaching, and gives detailed feedback.',
      icon: '✨',
      position: 'center',
      showProgress: true,
      canSkip: true,
    },
    {
      id: 'warmup-intro',
      title: 'Warm-up Before Interviews',
      description: 'Build confidence with breathing exercises, tech checks, and practice questions before your interview.',
      icon: '🧘‍♀️',
      position: 'center',
      showProgress: true,
      canSkip: true,
    },
    {
      id: 'results-preview',
      title: 'Detailed Analytics',
      description: 'Get comprehensive feedback on your performance with actionable improvement suggestions.',
      icon: '📊',
      position: 'center',
      showProgress: true,
      canSkip: true,
    },
    {
      id: 'gamification',
      title: 'Level Up Your Skills',
      description: 'Earn XP, unlock badges, and track your progress as you improve your interview skills.',
      icon: '🏆',
      position: 'center',
      showProgress: true,
      canSkip: true,
    },
    {
      id: 'mobile-tips',
      title: 'Mobile-Friendly',
      description: 'Practice anywhere! Our platform is optimized for mobile devices with touch-friendly controls.',
      icon: '📱',
      position: 'center',
      showProgress: true,
      canSkip: true,
    },
    {
      id: 'complete',
      title: 'You\'re All Set!',
      description: 'Ready to start your interview practice journey? Let\'s begin with your first interview!',
      icon: '🚀',
      position: 'center',
      showProgress: false,
      canSkip: false,
    },
  ];

  const currentStepData = onboardingSteps.find(step => step.id === currentStep);
  const currentStepIndex = onboardingSteps.findIndex(step => step.id === currentStep);
  const totalSteps = onboardingSteps.length;

  // Auto-advance for certain steps
  useEffect(() => {
    if (currentStep === 'platform-overview') {
      const timer = setTimeout(() => {
        nextStep();
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [currentStep]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (!isVisible) return;
      
      switch (event.key) {
        case 'ArrowRight':
        case 'Space':
          event.preventDefault();
          nextStep();
          break;
        case 'ArrowLeft':
          event.preventDefault();
          previousStep();
          break;
        case 'Escape':
          event.preventDefault();
          onSkip();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isVisible, currentStep]);

  // Save onboarding completion to localStorage
  useEffect(() => {
    if (currentStep === 'complete') {
      localStorage.setItem('travaia_onboarding_completed', 'true');
      localStorage.setItem('travaia_onboarding_date', new Date().toISOString());
      localStorage.setItem('travaia_user_preferences', JSON.stringify(userPreferences));
    }
  }, [currentStep, userPreferences]);

  const nextStep = () => {
    if (isAnimating) return;
    
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < onboardingSteps.length) {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentStep(onboardingSteps[nextIndex].id);
        setIsAnimating(false);
      }, 300);
    } else {
      onComplete();
    }
  };

  const previousStep = () => {
    if (isAnimating || currentStepIndex === 0) return;
    
    const prevIndex = currentStepIndex - 1;
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentStep(onboardingSteps[prevIndex].id);
      setIsAnimating(false);
    }, 300);
  };

  const skipToEnd = () => {
    setCurrentStep('complete');
  };

  const handlePreferenceChange = (key: keyof typeof userPreferences, value: string) => {
    setUserPreferences(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  if (!isVisible || !currentStepData) {
    return null;
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 'welcome':
        return (
          <div className="text-center space-y-6">
            <div className="text-8xl mb-6">{currentStepData.icon}</div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
              {currentStepData.title}
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-8">
              {currentStepData.description}
            </p>
            
            {/* User Experience Level */}
            <div className="bg-blue-50 p-6 rounded-lg max-w-md mx-auto mb-6">
              <h3 className="font-semibold mb-4 text-blue-800">
                What's your interview experience level?
              </h3>
              <div className="space-y-2">
                {[
                  { value: 'beginner', label: '🌱 Beginner - New to interviews' },
                  { value: 'intermediate', label: '🌿 Intermediate - Some experience' },
                  { value: 'advanced', label: '🌳 Advanced - Experienced interviewer' },
                ].map((option) => (
                  <label key={option.value} className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      name="experienceLevel"
                      value={option.value}
                      checked={userPreferences.experienceLevel === option.value}
                      onChange={(e) => handlePreferenceChange('experienceLevel', e.target.value)}
                      className="text-blue-600"
                    />
                    <span className="text-sm">{option.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex gap-4 justify-center">
              <GlassButton
                onClick={nextStep}
                variant="button"
                size="lg"
              >
                Let's Start the Tour! 🚀
              </GlassButton>
              <GlassButton
                onClick={onSkip}
                variant="button"
                size="lg"
              >
                Skip Tour
              </GlassButton>
            </div>
          </div>
        );

      case 'interview-types':
        return (
          <div className="text-center space-y-6">
            <div className="text-6xl mb-6">{currentStepData.icon}</div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4">
              {currentStepData.title}
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-8">
              {currentStepData.description}
            </p>

            {/* Interview Mode Preference */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto mb-8">
              <div 
                className={`cursor-pointer transition-all ${
                  userPreferences.preferredMode === 'text' ? 'ring-2 ring-blue-500' : ''
                }`}
                onClick={() => handlePreferenceChange('preferredMode', 'text')}
              >
                <GlassCard className="p-4">
                  <div className="text-center">
                    <div className="text-3xl mb-2">💬</div>
                    <h3 className="font-semibold mb-2">Text Interviews</h3>
                    <p className="text-sm text-gray-600">Quick practice with typed responses</p>
                  </div>
                </GlassCard>
              </div>

              <div 
                className={`cursor-pointer transition-all ${
                  userPreferences.preferredMode === 'voice' ? 'ring-2 ring-blue-500' : ''
                }`}
                onClick={() => handlePreferenceChange('preferredMode', 'voice')}
              >
                <GlassCard className="p-4">
                  <div className="text-center">
                    <div className="text-3xl mb-2">🎤</div>
                    <h3 className="font-semibold mb-2">Voice Interviews</h3>
                    <p className="text-sm text-gray-600">Realistic practice with speech</p>
                  </div>
                </GlassCard>
              </div>

              <div 
                className={`cursor-pointer transition-all ${
                  userPreferences.preferredMode === 'both' ? 'ring-2 ring-blue-500' : ''
                }`}
                onClick={() => handlePreferenceChange('preferredMode', 'both')}
              >
                <GlassCard className="p-4">
                  <div className="text-center">
                    <div className="text-3xl mb-2">🎯</div>
                    <h3 className="font-semibold mb-2">Both Modes</h3>
                    <p className="text-sm text-gray-600">Maximum flexibility</p>
                  </div>
                </GlassCard>
              </div>
            </div>
          </div>
        );

      case 'mobile-tips':
        return (
          <div className="text-center space-y-6">
            <div className="text-6xl mb-6">{currentStepData.icon}</div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4">
              {currentStepData.title}
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-8">
              {currentStepData.description}
            </p>

            {/* Mobile Tips */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              <GlassCard className="p-6">
                <div className="text-center">
                  <div className="text-4xl mb-4">👆</div>
                  <h3 className="font-semibold mb-2">Touch Controls</h3>
                  <p className="text-sm text-gray-600">
                    Tap, swipe, and pinch gestures work throughout the app
                  </p>
                </div>
              </GlassCard>

              <GlassCard className="p-6">
                <div className="text-center">
                  <div className="text-4xl mb-4">🔄</div>
                  <h3 className="font-semibold mb-2">Responsive Design</h3>
                  <p className="text-sm text-gray-600">
                    Interface adapts perfectly to your screen size
                  </p>
                </div>
              </GlassCard>

              <GlassCard className="p-6">
                <div className="text-center">
                  <div className="text-4xl mb-4">🎤</div>
                  <h3 className="font-semibold mb-2">Voice Recognition</h3>
                  <p className="text-sm text-gray-600">
                    Works great on mobile browsers with microphone access
                  </p>
                </div>
              </GlassCard>

              <GlassCard className="p-6">
                <div className="text-center">
                  <div className="text-4xl mb-4">⚡</div>
                  <h3 className="font-semibold mb-2">Fast Performance</h3>
                  <p className="text-sm text-gray-600">
                    Optimized for quick loading and smooth interactions
                  </p>
                </div>
              </GlassCard>
            </div>
          </div>
        );

      case 'complete':
        return (
          <div className="text-center space-y-6">
            <div className="text-8xl mb-6">{currentStepData.icon}</div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
              {currentStepData.title}
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-8">
              {currentStepData.description}
            </p>

            {/* Personalized Recommendations */}
            <GlassCard className="p-6 max-w-md mx-auto mb-8">
              <h3 className="font-semibold mb-4 text-blue-800">
                Personalized Recommendations
              </h3>
              <div className="space-y-2 text-sm text-left">
                {userPreferences.experienceLevel === 'beginner' && (
                  <p>• Start with text interviews to build confidence</p>
                )}
                {userPreferences.experienceLevel === 'advanced' && (
                  <p>• Try challenging voice interviews for realistic practice</p>
                )}
                {userPreferences.preferredMode === 'voice' && (
                  <p>• Don't forget to do the tech check in warm-up</p>
                )}
                <p>• Use the warm-up module to reduce interview anxiety</p>
                <p>• Check your stats regularly to track improvement</p>
              </div>
            </GlassCard>

            <div className="flex gap-4 justify-center">
              <GlassButton
                onClick={onComplete}
                variant="button"
                size="lg"
              >
                Start My First Interview! 🎯
              </GlassButton>
            </div>
          </div>
        );

      default:
        return (
          <div className="text-center space-y-6">
            <div className="text-6xl mb-6">{currentStepData.icon}</div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4">
              {currentStepData.title}
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              {currentStepData.description}
            </p>
          </div>
        );
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          ref={overlayRef}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === overlayRef.current) {
              onSkip();
            }
          }}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
          >
            <GlassCard className="p-8 m-0 rounded-2xl">
              {/* Progress Bar */}
              {currentStepData.showProgress && (
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">
                      Step {currentStepIndex + 1} of {totalSteps}
                    </span>
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {Math.round(((currentStepIndex + 1) / totalSteps) * 100)}% Complete
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${((currentStepIndex + 1) / totalSteps) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Step Content */}
              <motion.div
                key={currentStep}
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -20, opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                {renderStepContent()}
              </motion.div>

              {/* Navigation */}
              {currentStep !== 'welcome' && currentStep !== 'complete' && (
                <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
                  <GlassButton
                    onClick={previousStep}
                    variant="button"
                    disabled={currentStepIndex === 0 || isAnimating}
                  >
                    ← Previous
                  </GlassButton>

                  <div className="flex gap-3">
                    {currentStepData.canSkip && (
                      <GlassButton
                        onClick={skipToEnd}
                        variant="button"
                      >
                        Skip Tour
                      </GlassButton>
                    )}
                    <GlassButton
                      onClick={nextStep}
                      variant="button"
                      disabled={isAnimating}
                    >
                      Next →
                    </GlassButton>
                  </div>
                </div>
              )}

              {/* Keyboard Hints */}
              <div className="mt-6 text-center text-xs text-gray-500">
                Use arrow keys to navigate • ESC to skip • Space to continue
              </div>
            </GlassCard>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default InteractiveOnboarding;
