import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, CheckCircle, Camera, Mic, Volume2 } from "lucide-react";

interface InterviewWarmupProps {
  onComplete: () => void;
  onSkip: () => void;
  jobApplication?: any;
}

type WarmupStep = 'welcome' | 'confidence' | 'technical' | 'practice' | 'complete';

interface ConfidenceExercise {
  id: string;
  name: string;
  description: string;
  duration: number;
  instructions: string[];
  icon: React.ReactNode;
}

const InterviewWarmup: React.FC<InterviewWarmupProps> = ({
  onComplete,
  onSkip,
  jobApplication
}) => {
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState<WarmupStep>('welcome');
  const [completedSteps, setCompletedSteps] = useState<Set<WarmupStep>>(new Set());
  const [isExerciseActive, setIsExerciseActive] = useState(false);
  const [exerciseTimer, setExerciseTimer] = useState(0);
  const [isPracticing, setIsPracticing] = useState(false);
  const [practiceTimer, setPracticeTimer] = useState(0);
  const [currentExercise, setCurrentExercise] = useState<ConfidenceExercise | null>(null);
  const [currentPracticeQuestion, setCurrentPracticeQuestion] = useState('');
  const [mediaStreamRef, setMediaStreamRef] = useState<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Use useMemo to safely handle translation keys and prevent rendering objects
  const confidenceExercises: ConfidenceExercise[] = React.useMemo(() => [
    {
      id: 'breathing',
      name: String(t('interview.warmup.confidence.breathing.name') || 'Deep Breathing'),
      description: String(t('interview.warmup.confidence.breathing.description') || 'Calm your nerves with focused breathing'),
      duration: 60,
      instructions: [
        String(t('interview.warmup.confidence.breathing.step1') || 'Sit comfortably with your back straight'),
        String(t('interview.warmup.confidence.breathing.step2') || 'Breathe in slowly through your nose for 4 counts'),
        String(t('interview.warmup.confidence.breathing.step3') || 'Hold your breath for 4 counts'),
        String(t('interview.warmup.confidence.breathing.step4') || 'Exhale slowly through your mouth for 6 counts'),
        String(t('interview.warmup.confidence.breathing.step5') || 'Repeat this cycle 5-10 times')
      ],
      icon: <Volume2 className="w-6 h-6" />
    },
    {
      id: 'posture',
      name: String(t('interview.warmup.confidence.posture.name') || 'Power Posture'),
      description: String(t('interview.warmup.confidence.posture.description') || 'Adopt confident body language'),
      duration: 30,
      instructions: [
        String(t('interview.warmup.confidence.posture.step1') || 'Stand tall with shoulders back'),
        String(t('interview.warmup.confidence.posture.step2') || 'Keep your chin parallel to the floor'),
        String(t('interview.warmup.confidence.posture.step3') || 'Relax your arms at your sides'),
        String(t('interview.warmup.confidence.posture.step4') || 'Take up space confidently'),
        String(t('interview.warmup.confidence.posture.step5') || 'Hold this posture for 30 seconds')
      ],
      icon: <CheckCircle className="w-6 h-6" />
    },
    {
      id: 'visualization',
      name: String(t('interview.warmup.confidence.visualization.name') || 'Success Visualization'),
      description: String(t('interview.warmup.confidence.visualization.description') || 'Visualize a successful interview outcome'),
      duration: 90,
      instructions: [
        String(t('interview.warmup.confidence.visualization.step1') || 'Close your eyes and relax'),
        String(t('interview.warmup.confidence.visualization.step2') || 'Picture yourself entering the interview room confidently'),
        String(t('interview.warmup.confidence.visualization.step3') || 'Imagine giving clear, thoughtful answers'),
        String(t('interview.warmup.confidence.visualization.step4') || 'See the interviewer responding positively'),
        String(t('interview.warmup.confidence.visualization.step5') || 'Feel the satisfaction of a successful interview')
      ],
      icon: <Play className="w-6 h-6" />
    }
  ], [t]);

  const practiceQuestions = React.useMemo(() => [
    String(t('interview.warmup.practice.questions.aboutYourself') || 'Tell me about yourself.'),
    String(t('interview.warmup.practice.questions.whyThisRole') || 'Why are you interested in this role?'),
    String(t('interview.warmup.practice.questions.strengths') || 'What are your greatest strengths?'),
    String(t('interview.warmup.practice.questions.challenges') || 'What challenges are you looking for in this position?'),
    String(t('interview.warmup.practice.questions.experience') || 'Tell me about a relevant experience.')
  ], [t]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (mediaStreamRef) {
        mediaStreamRef.getTracks().forEach(track => track.stop());
      }
    };
  }, [mediaStreamRef]);

  const skipStep = (step: WarmupStep) => {
    setCompletedSteps(prev => new Set([...prev, step]));
    moveToNextStep();
  };

  const completeStep = (step: WarmupStep) => {
    setCompletedSteps(prev => new Set([...prev, step]));
    moveToNextStep();
  };

  const moveToNextStep = () => {
    const steps: WarmupStep[] = ['welcome', 'confidence', 'technical', 'practice', 'complete'];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1]);
    }
  };

  const startExercise = (exercise: ConfidenceExercise) => {
    setCurrentExercise(exercise);
    setIsExerciseActive(true);
    setExerciseTimer(exercise.duration);
    
    timerRef.current = setInterval(() => {
      setExerciseTimer(prev => {
        if (prev <= 1) {
          setIsExerciseActive(false);
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const startTechCheck = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      });
      setMediaStreamRef(stream);
    } catch (error) {
      console.error('Failed to access media devices:', error);
    }
  };

  const startPractice = (question: string) => {
    setCurrentPracticeQuestion(question);
    setIsPracticing(true);
    setPracticeTimer(120); // 2 minutes for practice
    
    timerRef.current = setInterval(() => {
      setPracticeTimer(prev => {
        if (prev <= 1) {
          setIsPracticing(false);
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderStepNavigation = () => (
    <div className="flex justify-between items-center p-4 bg-gray-50 border-t">
      <button
        onClick={() => onSkip()}
        className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
      >
        {t('interview.warmup.nav.skipAll')}
      </button>
      
      <div className="flex space-x-2">
        {['welcome', 'confidence', 'technical', 'practice'].map((step, index) => (
          <div
            key={step}
            className={`w-3 h-3 rounded-full ${
              completedSteps.has(step as WarmupStep)
                ? 'bg-green-500'
                : currentStep === step
                ? 'bg-blue-500'
                : 'bg-gray-300'
            }`}
          />
        ))}
      </div>
      
      <button
        onClick={() => skipStep(currentStep)}
        className="px-4 py-2 text-blue-600 hover:text-blue-800 transition-colors"
      >
        {String(t('interview.warmup.nav.skip') || 'Skip Warm-up')}
      </button>
    </div>
  );

  const renderWelcomeStep = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="text-center p-8"
    >
      <h2 className="text-3xl font-bold text-gray-900 mb-4">
        {String(t('interview.warmup.welcome.title') || 'Welcome to Your Interview Warm-up')}
      </h2>
      <p className="text-lg text-gray-600 mb-8">
        {String(t('interview.warmup.welcome.description') || 'Take a few minutes to prepare yourself mentally and technically for your interview.')}
      </p>
      
      {jobApplication && (
        <div className="bg-blue-50 p-4 rounded-lg mb-6">
          <h3 className="font-semibold text-blue-900 mb-2">
            {String(t('interview.warmup.welcome.interviewFor') || 'Interview for')}
          </h3>
          <p className="text-blue-800">
            {String(jobApplication.role?.title || jobApplication.role || 'Role')} {String(t('interview.warmup.welcome.at') || 'at')} {String(jobApplication.company?.name || jobApplication.company || 'Company')}
          </p>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="p-4 bg-green-50 rounded-lg">
          <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
          <h4 className="font-semibold text-green-900 mb-1">
            {String(t('interview.warmup.welcome.benefits.confidence') || 'Build Confidence')}
          </h4>
          <p className="text-sm text-green-700">
            {String(t('interview.warmup.welcome.benefits.confidenceDesc') || 'Practice exercises to boost your confidence before the interview')}
          </p>
        </div>
        
        <div className="p-4 bg-blue-50 rounded-lg">
          <Camera className="w-8 h-8 text-blue-600 mx-auto mb-2" />
          <h4 className="font-semibold text-blue-900 mb-1">
            {String(t('interview.warmup.welcome.benefits.technical') || 'Technical Setup')}
          </h4>
          <p className="text-sm text-blue-700">
            {String(t('interview.warmup.welcome.benefits.technicalDesc') || 'Test your camera, microphone, and environment')}
          </p>
        </div>
        
        <div className="p-4 bg-purple-50 rounded-lg">
          <Play className="w-8 h-8 text-purple-600 mx-auto mb-2" />
          <h4 className="font-semibold text-purple-900 mb-1">
            {String(t('interview.warmup.welcome.benefits.practice') || 'Quick Practice')}
          </h4>
          <p className="text-sm text-purple-700">
            {String(t('interview.warmup.welcome.benefits.practiceDesc') || 'Practice with warm-up questions to get comfortable')}
          </p>
        </div>
      </div>
      
      <button
        onClick={() => completeStep('welcome')}
        className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        {String(t('interview.warmup.welcome.getStarted') || 'Get Started')}
      </button>
    </motion.div>
  );

  const renderConfidenceStep = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="p-8"
    >
      <h2 className="text-2xl font-bold text-gray-900 mb-4">
        {t('interview.warmup.confidence.title')}
      </h2>
      <p className="text-gray-600 mb-6">
        {t('interview.warmup.confidence.description')}
      </p>
      
      {!currentExercise ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {confidenceExercises.map((exercise) => (
            <div key={exercise.id} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
              <div className="flex items-center mb-3">
                {exercise.icon}
                <h3 className="ml-2 font-semibold">{exercise.name}</h3>
              </div>
              <p className="text-sm text-gray-600 mb-3">{exercise.description}</p>
              <p className="text-xs text-gray-500 mb-4">
                {t('interview.warmup.confidence.duration', { duration: exercise.duration })}
              </p>
              <button
                onClick={() => startExercise(exercise)}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                {t('interview.warmup.confidence.start')}
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="max-w-md mx-auto text-center">
          <div className="mb-6">
            {currentExercise.icon}
            <h3 className="text-xl font-semibold mt-2">{currentExercise.name}</h3>
          </div>
          
          {isExerciseActive ? (
            <div>
              <div className="text-4xl font-bold text-blue-600 mb-4">
                {formatTime(exerciseTimer)}
              </div>
              <div className="space-y-2 mb-6">
                {currentExercise.instructions.map((instruction, index) => (
                  <p key={index} className="text-sm text-gray-600">
                    {instruction}
                  </p>
                ))}
              </div>
              <button
                onClick={() => {
                  setIsExerciseActive(false);
                  if (timerRef.current) clearInterval(timerRef.current);
                }}
                className="px-6 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
              >
                {t('interview.warmup.confidence.stop')}
              </button>
            </div>
          ) : (
            <div>
              <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
              <p className="text-lg text-gray-800 mb-4">
                {t('interview.warmup.confidence.completed')}
              </p>
              <div className="space-x-4">
                <button
                  onClick={() => setCurrentExercise(null)}
                  className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
                >
                  {t('interview.warmup.confidence.tryAnother')}
                </button>
                <button
                  onClick={() => completeStep('confidence')}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                >
                  {t('interview.warmup.confidence.continue')}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );

  const renderTechnicalStep = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="p-8"
    >
      <h2 className="text-2xl font-bold text-gray-900 mb-4">
        {t('interview.warmup.technical.title')}
      </h2>
      <p className="text-gray-600 mb-6">
        {t('interview.warmup.technical.description')}
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="p-4 border rounded-lg">
          <Camera className="w-8 h-8 text-blue-600 mb-3" />
          <h3 className="font-semibold mb-2">{t('interview.warmup.technical.camera.title')}</h3>
          <p className="text-sm text-gray-600 mb-4">
            {t('interview.warmup.technical.camera.description')}
          </p>
          {mediaStreamRef ? (
            <div>
              <video
                ref={(video) => {
                  if (video && mediaStreamRef) {
                    video.srcObject = mediaStreamRef;
                  }
                }}
                autoPlay
                muted
                className="w-full h-32 bg-gray-200 rounded mb-2"
              />
              <CheckCircle className="w-5 h-5 text-green-600 inline mr-2" />
              <span className="text-green-600">{t('interview.warmup.technical.camera.working')}</span>
            </div>
          ) : (
            <button
              onClick={startTechCheck}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              {t('interview.warmup.technical.camera.test')}
            </button>
          )}
        </div>
        
        <div className="p-4 border rounded-lg">
          <Mic className="w-8 h-8 text-green-600 mb-3" />
          <h3 className="font-semibold mb-2">{t('interview.warmup.technical.microphone.title')}</h3>
          <p className="text-sm text-gray-600 mb-4">
            {t('interview.warmup.technical.microphone.description')}
          </p>
          <div className="space-y-2">
            <div className="flex items-center">
              <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
              <span className="text-sm">{t('interview.warmup.technical.microphone.clear')}</span>
            </div>
            <div className="flex items-center">
              <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
              <span className="text-sm">{t('interview.warmup.technical.microphone.quiet')}</span>
            </div>
            <div className="flex items-center">
              <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
              <span className="text-sm">{t('interview.warmup.technical.microphone.positioned')}</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-yellow-50 p-4 rounded-lg mb-6">
        <h4 className="font-semibold text-yellow-900 mb-2">
          {t('interview.warmup.technical.environment.title')}
        </h4>
        <ul className="text-sm text-yellow-800 space-y-1">
          <li>• {t('interview.warmup.technical.environment.lighting')}</li>
          <li>• {t('interview.warmup.technical.environment.background')}</li>
          <li>• {t('interview.warmup.technical.environment.distractions')}</li>
          <li>• {t('interview.warmup.technical.environment.connection')}</li>
        </ul>
      </div>
      
      <button
        onClick={() => completeStep('technical')}
        className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
      >
        {t('interview.warmup.technical.ready')}
      </button>
    </motion.div>
  );

  const renderPracticeStep = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="p-8"
    >
      <h2 className="text-2xl font-bold text-gray-900 mb-4">
        {t('interview.warmup.practice.title')}
      </h2>
      <p className="text-gray-600 mb-6">
        {t('interview.warmup.practice.description')}
      </p>
      
      {!isPracticing ? (
        <div className="space-y-4">
          {practiceQuestions.map((question, index) => (
            <div key={index} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
              <p className="font-medium mb-3">{question}</p>
              <button
                onClick={() => startPractice(question)}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                {t('interview.warmup.practice.start')}
              </button>
            </div>
          ))}
          
          <div className="text-center pt-6">
            <button
              onClick={() => completeStep('practice')}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              {t('interview.warmup.practice.skipToPractice')}
            </button>
          </div>
        </div>
      ) : (
        <div className="max-w-2xl mx-auto text-center">
          <div className="bg-blue-50 p-6 rounded-lg mb-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-4">
              {currentPracticeQuestion}
            </h3>
            <div className="text-3xl font-bold text-blue-600 mb-4">
              {formatTime(practiceTimer)}
            </div>
            <p className="text-sm text-blue-700">
              {t('interview.warmup.practice.speakNow')}
            </p>
          </div>
          
          <div className="space-x-4">
            <button
              onClick={() => {
                setIsPracticing(false);
                if (timerRef.current) clearInterval(timerRef.current);
              }}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
            >
              {t('interview.warmup.practice.stop')}
            </button>
            <button
              onClick={() => completeStep('practice')}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
            >
              {t('interview.warmup.practice.done')}
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );

  const renderCompleteStep = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="text-center p-8"
    >
      <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
      <h2 className="text-2xl font-bold text-gray-900 mb-4">
        {t('interview.warmup.complete.title')}
      </h2>
      <p className="text-gray-600 mb-8">
        {t('interview.warmup.complete.description')}
      </p>
      
      <div className="bg-green-50 p-4 rounded-lg mb-6">
        <h3 className="font-semibold text-green-900 mb-2">
          {t('interview.warmup.complete.summary')}
        </h3>
        <div className="text-sm text-green-800">
          <p>{t('interview.warmup.complete.completedSteps', { count: completedSteps.size })}</p>
        </div>
      </div>
      
      <button
        onClick={onComplete}
        className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        {t('interview.warmup.complete.startInterview')}
      </button>
    </motion.div>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'welcome':
        return renderWelcomeStep();
      case 'confidence':
        return renderConfidenceStep();
      case 'technical':
        return renderTechnicalStep();
      case 'practice':
        return renderPracticeStep();
      case 'complete':
        return renderCompleteStep();
      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
        <h1 className="text-2xl font-bold">
          {t('interview.warmup.title')}
        </h1>
        <p className="text-blue-100 mt-2">
          {t('interview.warmup.subtitle')}
        </p>
      </div>
      
      <div className="min-h-96">
        <AnimatePresence mode="wait">
          {renderCurrentStep()}
        </AnimatePresence>
      </div>
      
      {currentStep !== 'complete' && renderStepNavigation()}
    </div>
  );
};

export default InterviewWarmup;