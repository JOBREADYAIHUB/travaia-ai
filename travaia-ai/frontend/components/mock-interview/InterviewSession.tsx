import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { GlassCard, GlassButton, GlassModal } from '../design-system';
import styles from './InterviewSession.module.css';
import {
  MockInterviewSession,
  InterviewSettings,
  TranscriptEntry,
  InterviewMode
} from '../../types';

interface InterviewSessionProps {
  session: MockInterviewSession | null;
  settings: InterviewSettings;
  onComplete: (session: MockInterviewSession) => void;
  onEnd: () => void;
}

interface Question {
  id: string;
  text: string;
  type: string;
}

interface RealTimeFeedback {
  pacing: 'fast' | 'slow' | 'good';
  volume: 'low' | 'high' | 'good';
  clarity: 'unclear' | 'clear';
  fillerWords: number;
  confidence: 'low' | 'high';
}

const InterviewSession: React.FC<InterviewSessionProps> = ({
  session,
  settings,
  onComplete,
  
}) => {
  const { t } = useTranslation();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [currentResponse, setCurrentResponse] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showEndConfirmation, setShowEndConfirmation] = useState(false);
  const [sessionStartTime] = useState(Date.now());
  const [realTimeFeedback, setRealTimeFeedback] = useState<RealTimeFeedback>({
    pacing: 'good',
    volume: 'good',
    clarity: 'clear',
    fillerWords: 0,
    confidence: 'high'
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // Initialize questions based on settings
  useEffect(() => {
    const generateQuestions = () => {
      const questionTemplates = {
        Behavioral: [
          "Tell me about a time when you had to work under pressure.",
          "Describe a situation where you had to work with a difficult team member.",
          "Give me an example of a goal you reached and tell me how you achieved it.",
          "Tell me about a time you made a mistake. How did you handle it?",
          "Describe a time when you had to learn something new quickly."
        ],
        Technical: [
          "Explain the difference between synchronous and asynchronous programming.",
          "How would you optimize a slow database query?",
          "Describe your approach to debugging a complex issue.",
          "What are the key principles of good software design?",
          "How do you ensure code quality in your projects?"
        ],
        Situational: [
          "How would you handle a situation where you disagree with your manager?",
          "What would you do if you were assigned a project with an unrealistic deadline?",
          "How would you approach working with a team that has conflicting priorities?",
          "What would you do if you discovered a security vulnerability in production?",
          "How would you handle a situation where a client is unhappy with your work?"
        ],
        General_HR: [
          "Why are you interested in this position?",
          "What are your greatest strengths and weaknesses?",
          "Where do you see yourself in 5 years?",
          "Why are you leaving your current job?",
          "What motivates you in your work?"
        ]
      };

      const selectedQuestions = questionTemplates[settings.interviewType] || questionTemplates.General_HR;
      const shuffled = [...selectedQuestions].sort(() => 0.5 - Math.random());
      
      return shuffled.slice(0, 5).map((text, index) => ({
        id: `q-${index}`,
        text,
        type: settings.interviewType
      }));
    };

    setQuestions(generateQuestions());
  }, [settings.interviewType]);

  // Initialize speech recognition for audio mode
  useEffect(() => {
    if (settings.interviewMode === InterviewMode.AUDIO || settings.interviewMode === InterviewMode.MIXED) {
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognitionRef.current = new SpeechRecognition();
        
        if (recognitionRef.current) {
          recognitionRef.current.continuous = true;
          recognitionRef.current.interimResults = true;
          recognitionRef.current.lang = settings.language || 'en-US';

          recognitionRef.current.onresult = (event) => {
            let finalTranscript = '';
            let interimTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
              const transcript = event.results[i][0].transcript;
              if (event.results[i].isFinal) {
                finalTranscript += transcript;
              } else {
                interimTranscript += transcript;
              }
            }

            if (finalTranscript) {
              setCurrentResponse(prev => prev + finalTranscript);
              // Simulate real-time feedback
              updateRealTimeFeedback(finalTranscript);
            }
          };

          recognitionRef.current.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            setIsRecording(false);
          };
        }
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [settings.interviewMode, settings.language]);

  const updateRealTimeFeedback = (text: string) => {
    const words = text.split(' ');
    const fillerWords = words.filter(word => 
      ['um', 'uh', 'like', 'you know', 'actually', 'basically'].includes(word.toLowerCase())
    ).length;

    setRealTimeFeedback(prev => ({
      ...prev,
      fillerWords: prev.fillerWords + fillerWords,
      pacing: words.length > 50 ? 'fast' : words.length < 10 ? 'slow' : 'good',
      confidence: fillerWords > 3 ? 'low' : 'high'
    }));
  };

  const startRecording = async () => {
    if (settings.interviewMode === InterviewMode.AUDIO || settings.interviewMode === InterviewMode.MIXED) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorderRef.current = new MediaRecorder(stream);
        audioChunksRef.current = [];

        mediaRecorderRef.current.ondataavailable = (event) => {
          audioChunksRef.current.push(event.data);
        };

        mediaRecorderRef.current.start();
        setIsRecording(true);

        if (recognitionRef.current) {
          recognitionRef.current.start();
        }
      } catch (error) {
        console.error('Error starting recording:', error);
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }

      // Stop all media tracks
      mediaRecorderRef.current.stream?.getTracks().forEach(track => track.stop());
    }
  };

  const submitResponse = async () => {
    if (!currentResponse.trim()) return;

    setIsProcessing(true);

    // Add user response to transcript
    const userEntry: TranscriptEntry = {
      speaker: 'user',
      text: currentResponse,
      timestamp: new Date().toISOString()
    };

    const newTranscript = [...transcript, userEntry];
    setTranscript(newTranscript);

    // Simulate AI processing and feedback
    setTimeout(() => {
      const aiResponse = generateAIFeedback(currentResponse);
      const aiEntry: TranscriptEntry = {
        speaker: 'ai',
        text: aiResponse,
        timestamp: new Date().toISOString()
      };

      setTranscript(prev => [...prev, aiEntry]);
      setCurrentResponse('');
      setIsProcessing(false);

      // Move to next question or end interview
      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
      } else {
        handleInterviewEnd();
      }
    }, 2000);
  };

  const generateAIFeedback = (response: string): string => {
    // Analyze response characteristics for more intelligent feedback
    const responseLength = response.trim().length;
    const hasExamples = /example|instance|case|situation|experience/i.test(response);
    const hasNumbers = /\d+|percent|%|increase|decrease|improve/i.test(response);
    const isDetailed = responseLength > 100;
    const isConcise = responseLength < 50;
    
    // Provide feedback based on response analysis
    if (isConcise && responseLength < 20) {
      return "Try to provide more detail in your answer. Elaborate on your experience and provide specific examples.";
    }
    
    if (hasExamples && hasNumbers) {
      return "Excellent! You provided specific examples with quantifiable results. This demonstrates strong analytical thinking.";
    }
    
    if (hasExamples) {
      return "Great answer! You provided specific examples which makes your response more compelling and credible.";
    }
    
    if (hasNumbers) {
      return "Good use of quantifiable data! Numbers help demonstrate the impact of your work.";
    }
    
    if (isDetailed) {
      return "Comprehensive answer! Consider summarizing key points for better clarity in a real interview.";
    }
    
    // Default feedback for standard responses
    const generalFeedback = [
      "Good response. Your answer shows clear thinking and communication skills.",
      "Nice work! Consider adding a specific example to strengthen your answer.",
      "Well articulated. Think about how you could make this more concise for impact.",
      "Solid answer. Try to include measurable outcomes when possible."
    ];
    
    return generalFeedback[Math.floor(Math.random() * generalFeedback.length)];
  };

  const handleInterviewEnd = () => {
    const endTime = Date.now();
    const duration = Math.floor((endTime - sessionStartTime) / 1000);

    const completedSession: MockInterviewSession = {
      ...session!,
      transcript,
      endedAt: new Date().toISOString(),
      durationSeconds: duration,
      status: 'completed',
      overallScore: Math.floor(Math.random() * 30) + 70, // Simulate score 70-100
      feedbackSummary: "Overall good performance with room for improvement in specific areas.",
      strengths: ["Clear communication", "Good examples", "Professional demeanor"],
      weaknesses: ["Could be more concise", "Add more technical details"],
      actionableTips: ["Practice STAR method", "Prepare more specific examples", "Work on confidence"]
    };

    onComplete(completedSession);
  };

  const skipQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      handleInterviewEnd();
    }
  };

  const currentQuestion = questions[currentQuestionIndex];

  if (!currentQuestion) {
    return (
      <GlassCard className="p-8 text-center">
        <div className="animate-pulse">
          <span className="text-4xl block mb-4">⏳</span>
          <p>{t('mockInterview.session.thinking')}</p>
        </div>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Progress */}
      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold mb-2">
              {t('mockInterview.interviewInProgress')}
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              {t('mockInterview.session.questionProgress', {
                current: currentQuestionIndex + 1,
                total: questions.length
              })}
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500 mb-1">
              {t('mockInterview.session.timeElapsed')}
            </div>
            <div className="text-lg font-mono">
              {Math.floor((Date.now() - sessionStartTime) / 60000)}:
              {String(Math.floor(((Date.now() - sessionStartTime) % 60000) / 1000)).padStart(2, '0')}
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className={styles.progressBarContainer}>
          <div
            className={styles.progressBarFill}
            style={{
              '--progress-width': `${((currentQuestionIndex + 1) / questions.length) * 100}%`
            } as React.CSSProperties}
          />
        </div>
      </GlassCard>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Interview Area */}
        <div className="lg:col-span-2 space-y-6">
          {/* Current Question */}
          <GlassCard className="p-8">
            <div className="text-center mb-6">
              <span className="text-4xl mb-4 block">🤔</span>
              <h3 className="text-xl font-semibold mb-4">
                Question {currentQuestionIndex + 1}
              </h3>
              <p className="text-lg text-gray-700 dark:text-gray-300">
                {currentQuestion.text}
              </p>
            </div>

            {/* Response Area */}
            <div className="space-y-4">
              {!settings.interviewMode || settings.interviewMode === InterviewMode.TEXT || (settings.interviewMode as string) === 'Text' ? (
                <div>
                  <textarea
                    id="interview-text-response"
                    name="textResponse"
                    value={currentResponse}
                    onChange={(e) => setCurrentResponse(e.target.value)}
                    placeholder={t('mockInterview.session.textResponsePlaceholder')}
                    rows={6}
                    className={styles.interviewTextarea}
                  />
                </div>
              ) : (
                <div className="text-center space-y-4">
                  <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full transition-all duration-200 ${
                    isRecording 
                      ? 'bg-red-500 animate-pulse' 
                      : 'bg-primary-500 hover:bg-primary-600'
                  }`}>
                    <button
                      onClick={isRecording ? stopRecording : startRecording}
                      className="text-white text-2xl"
                    >
                      {isRecording ? '⏹️' : '🎤'}
                    </button>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {isRecording 
                      ? t('mockInterview.session.recording')
                      : t('mockInterview.session.clickToSpeak')
                    }
                  </p>
                  {currentResponse && (
                    <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <p className="text-sm">{currentResponse}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-4">
                <GlassButton
                  onClick={skipQuestion}
                  variant="button"
                  size="sm"
                >
                  {t('mockInterview.session.skipQuestion')}
                </GlassButton>

                <div className="flex space-x-3">
                  <GlassButton
                    onClick={() => setShowEndConfirmation(true)}
                    variant="button"
                    size="sm"
                  >
                    {t('mockInterview.endInterview')}
                  </GlassButton>
                  
                  <GlassButton
                    onClick={submitResponse}
                    disabled={!currentResponse.trim() || isProcessing}
                    variant="button"
                  >
                    {isProcessing 
                      ? t('mockInterview.session.processing')
                      : currentQuestionIndex === questions.length - 1
                        ? t('common.finish')
                        : t('mockInterview.session.nextQuestion')
                    }
                  </GlassButton>
                </div>
              </div>
            </div>
          </GlassCard>

          {/* Transcript */}
          {transcript.length > 0 && (
            <GlassCard className="p-6">
              <h4 className="text-lg font-semibold mb-4">
                {t('common.transcript')}
              </h4>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {transcript.map((entry, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg ${
                      entry.speaker === 'user'
                        ? 'bg-blue-50 dark:bg-blue-900/20 ml-8'
                        : 'bg-gray-50 dark:bg-gray-800 mr-8'
                    }`}
                  >
                    <div className="flex items-center mb-1">
                      <span className="text-xs font-medium text-gray-500">
                        {entry.speaker === 'user' ? 'You' : 'AI Interviewer'}
                      </span>
                      <span className="text-xs text-gray-400 ml-2">
                        {(() => {
                          // Handle different timestamp types (string, Date, or Firestore Timestamp)
                          let date: Date;
                          if (entry.timestamp instanceof Date) {
                            date = entry.timestamp;
                          } else if (typeof entry.timestamp === 'string') {
                            date = new Date(entry.timestamp);
                          } else if (entry.timestamp && typeof entry.timestamp === 'object' && 'toDate' in entry.timestamp) {
                            // Firestore Timestamp object
                            date = (entry.timestamp as any).toDate();
                          } else {
                            date = new Date(); // Fallback to current time
                          }
                          return date.toLocaleTimeString();
                        })()}
                      </span>
                    </div>
                    <p className="text-sm">{entry.text}</p>
                  </div>
                ))}
              </div>
            </GlassCard>
          )}
        </div>

        {/* Sidebar - Real-time Feedback */}
        <div className="space-y-6">
          <GlassCard className="p-6">
            <h4 className="text-lg font-semibold mb-4">
              {t('mockInterview.feedback.realTime')}
            </h4>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">{t('mockInterview.feedback.pacing')}</span>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    realTimeFeedback.pacing === 'good' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300' :
                    realTimeFeedback.pacing === 'fast' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300' : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
                  }`}
                >
                  {realTimeFeedback.pacing === 'good' 
                    ? t('mockInterview.feedback.goodPace')
                    : realTimeFeedback.pacing === 'fast'
                      ? t('mockInterview.feedback.tooFast')
                      : t('mockInterview.feedback.tooSlow')
                  }
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm">{t('mockInterview.feedback.volume')}</span>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    realTimeFeedback.volume === 'good' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300' :
                    realTimeFeedback.volume === 'low' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300' : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
                  }`}
                >
                  {realTimeFeedback.volume === 'good'
                    ? t('mockInterview.feedback.goodVolume')
                    : realTimeFeedback.volume === 'low'
                      ? t('mockInterview.feedback.tooQuiet')
                      : t('mockInterview.feedback.tooLoud')
                  }
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm">{t('mockInterview.feedback.clarity')}</span>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    realTimeFeedback.clarity === 'clear' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300'
                  }`}
                >
                  {realTimeFeedback.clarity === 'clear'
                    ? t('mockInterview.feedback.clear')
                    : t('mockInterview.feedback.unclear')
                  }
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm">{t('mockInterview.feedback.fillerWords')}</span>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    realTimeFeedback.fillerWords < 3 ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300'
                  }`}
                >
                  {realTimeFeedback.fillerWords}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm">{t('mockInterview.feedback.confidence')}</span>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    realTimeFeedback.confidence === 'high' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300'
                  }`}
                >
                  {realTimeFeedback.confidence === 'high'
                    ? t('mockInterview.feedback.highConfidence')
                    : t('mockInterview.feedback.lowConfidence')
                  }
                </span>
              </div>
            </div>
          </GlassCard>

          {/* Interview Tips */}
          <GlassCard className="p-6 bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20">
            <h4 className="text-lg font-semibold mb-3 text-green-800 dark:text-green-200">
              💡 {t('common.tips')}
            </h4>
            <ul className="text-sm text-green-700 dark:text-green-300 space-y-2">
              <li>• Use the STAR method (Situation, Task, Action, Result)</li>
              <li>• Provide specific examples from your experience</li>
              <li>• Keep answers concise but comprehensive</li>
              <li>• Maintain good eye contact with the camera</li>
              <li>• Speak clearly and at a moderate pace</li>
            </ul>
          </GlassCard>
        </div>
      </div>

      {/* End Interview Confirmation Modal */}
      <GlassModal
        isOpen={showEndConfirmation}
        onClose={() => setShowEndConfirmation(false)}
        title={t('mockInterview.session.confirmEnd')}
        size="sm"
      >
        <div className="p-6">
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {t('mockInterview.session.confirmEndDescription')}
          </p>
          <div className="flex space-x-3">
            <GlassButton
              onClick={() => setShowEndConfirmation(false)}
              variant="button"
              className="flex-1"
            >
              {t('common.cancel')}
            </GlassButton>
            <GlassButton
              onClick={handleInterviewEnd}
              variant="button"
              className="flex-1"
            >
              {t('mockInterview.endInterview')}
            </GlassButton>
          </div>
        </div>
      </GlassModal>
    </div>
  );
};

export default InterviewSession;
