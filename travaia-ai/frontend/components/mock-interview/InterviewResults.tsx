import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { GlassCard, GlassButton, GlassModal } from '../design-system';
import { MockInterviewSession } from '../../types';
import styles from './InterviewResults.module.css';

// Helper function to convert Firestore Timestamp to Date
const convertTimestampToDate = (timestamp: any): Date => {
  if (timestamp && typeof timestamp.toDate === 'function') {
    return timestamp.toDate();
  }
  if (timestamp instanceof Date) {
    return timestamp;
  }
  return new Date(timestamp);
};

interface InterviewResultsProps {
  session: MockInterviewSession | null;
  onNewInterview: () => void;
  onPracticeMore: () => void;
}

const InterviewResults: React.FC<InterviewResultsProps> = ({
  session,
  onNewInterview,
  onPracticeMore
}) => {
  const { t } = useTranslation();
  const [showTranscript, setShowTranscript] = useState(false);
  const [followUpQuestion, setFollowUpQuestion] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isAskingAI, setIsAskingAI] = useState(false);

  if (!session) {
    return (
      <GlassCard className="p-8 text-center">
        <span className="text-4xl block mb-4">⚠️</span>
        <p>{t('mockInterview.error.loadFailed')}</p>
      </GlassCard>
    );
  }

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600 dark:text-green-400';
    if (score >= 80) return 'text-blue-600 dark:text-blue-400';
    if (score >= 70) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 90) return t('common.excellent');
    if (score >= 80) return t('common.good');
    if (score >= 70) return t('common.average');
    return t('common.needsWork');
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleAskAI = async () => {
    if (!followUpQuestion.trim()) return;

    setIsAskingAI(true);
    
    // Simulate AI response
    setTimeout(() => {
      const responses = [
        "Based on your interview performance, I'd recommend focusing on providing more specific examples using the STAR method. Your communication was clear, but adding concrete metrics and outcomes would strengthen your answers.",
        "Great job on maintaining confidence throughout the interview! To improve further, consider preparing 2-3 detailed stories for each common behavioral question category.",
        "Your technical knowledge came through well. For future interviews, try to explain your thought process more explicitly as you work through problems.",
        "You demonstrated good problem-solving skills. Consider practicing with a timer to ensure you can deliver complete answers within typical interview timeframes."
      ];
      
      setAiResponse(responses[Math.floor(Math.random() * responses.length)]);
      setIsAskingAI(false);
      setFollowUpQuestion('');
    }, 2000);
  };

  const overallScore = session.overallScore || 0;
  const duration = session.durationSeconds || 0;
  const questionsAnswered = session.transcript?.filter(entry => entry.speaker === 'user').length || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <GlassCard className="p-6 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20">
        <div className="text-center">
          <span className="text-6xl mb-4 block">🎉</span>
          <h2 className="text-3xl font-bold mb-2">
            {t('mockInterview.interviewCompleted')}
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            {t('mockInterview.results.title')}
          </p>
        </div>
      </GlassCard>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Results */}
        <div className="lg:col-span-2 space-y-6">
          {/* Overall Score */}
          <GlassCard className="p-8 text-center">
            <h3 className="text-xl font-semibold mb-4">
              {t('mockInterview.results.overallScore')}
            </h3>
            <div className={`text-6xl font-bold mb-2 ${getScoreColor(overallScore)}`}>
              {overallScore}%
            </div>
            <span
              className={`inline-flex items-center px-6 py-2 text-lg rounded-full font-medium ${
                overallScore >= 80 
                  ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-200" 
                  : overallScore >= 60 
                  ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200" 
                  : "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-200"
              }`}
            >
              {getScoreLabel(overallScore)}
            </span>
          </GlassCard>

          {/* Score Breakdown */}
          <GlassCard className="p-6">
            <h3 className="text-xl font-semibold mb-6">
              {t('mockInterview.results.breakdown')}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { key: 'relevance', score: Math.floor(Math.random() * 20) + 80 },
                { key: 'clarity', score: Math.floor(Math.random() * 20) + 75 },
                { key: 'vocabulary', score: Math.floor(Math.random() * 20) + 85 },
                { key: 'softSkills', score: Math.floor(Math.random() * 20) + 70 },
                { key: 'pacing', score: Math.floor(Math.random() * 20) + 80 },
                { key: 'speechTone', score: Math.floor(Math.random() * 20) + 85 }
              ].map((item) => (
                <div key={item.key} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">
                      {t(`mockInterview.results.${item.key}`)}
                    </span>
                    <span className={`font-bold ${getScoreColor(item.score)}`}>
                      {item.score}%
                    </span>
                  </div>
                  <div className={styles.scoreProgressContainer}>
                    <div
                      className={`${styles.scoreProgressBar} ${
                        item.score >= 80 ? styles.excellent :
                        item.score >= 70 ? styles.good : styles.needsImprovement
                      }`}
                      style={{
                        '--score-width': `${item.score}%`
                      } as React.CSSProperties}
                    />
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>

          {/* Feedback Sections */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Strengths */}
            <GlassCard className="p-6 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
              <h4 className="text-lg font-semibold mb-4 text-green-800 dark:text-green-200 flex items-center">
                <span className="mr-2">💪</span>
                {t('mockInterview.results.strengths')}
              </h4>
              <ul className="space-y-2">
                {(session.strengths || []).map((strength, index) => (
                  <li key={index} className="flex items-start text-green-700 dark:text-green-300">
                    <span className="mr-2 mt-1">✓</span>
                    <span className="text-sm">{strength}</span>
                  </li>
                ))}
              </ul>
            </GlassCard>

            {/* Areas for Improvement */}
            <GlassCard className="p-6 bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800">
              <h4 className="text-lg font-semibold mb-4 text-orange-800 dark:text-orange-200 flex items-center">
                <span className="mr-2">🎯</span>
                {t('mockInterview.results.improvements')}
              </h4>
              <ul className="space-y-2">
                {(session.weaknesses || []).map((weakness, index) => (
                  <li key={index} className="flex items-start text-orange-700 dark:text-orange-300">
                    <span className="mr-2 mt-1">→</span>
                    <span className="text-sm">{weakness}</span>
                  </li>
                ))}
              </ul>
            </GlassCard>
          </div>

          {/* Actionable Tips */}
          <GlassCard className="p-6 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
            <h4 className="text-lg font-semibold mb-4 text-blue-800 dark:text-blue-200 flex items-center">
              <span className="mr-2">💡</span>
              {t('mockInterview.results.actionableTips')}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(session.actionableTips || []).map((tip, index) => (
                <div key={index} className="flex items-start text-blue-700 dark:text-blue-300">
                  <span className="mr-2 mt-1 text-blue-500">💡</span>
                  <span className="text-sm">{tip}</span>
                </div>
              ))}
            </div>
          </GlassCard>

          {/* Dialogic Learning */}
          <GlassCard className="p-6">
            <h4 className="text-lg font-semibold mb-4 flex items-center">
              <span className="mr-2">🤖</span>
              {t('mockInterview.learning.askAi')}
            </h4>
            <div className="space-y-4">
              <div className="flex space-x-3">
                <input
                  id="follow-up-question"
                  name="followUpQuestion"
                  type="text"
                  value={followUpQuestion}
                  onChange={(e) => setFollowUpQuestion(e.target.value)}
                  placeholder={t('mockInterview.learning.followUpPlaceholder')}
                  className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 text-gray-900 dark:text-gray-100"
                />
                <GlassButton
                  onClick={handleAskAI}
                  disabled={!followUpQuestion.trim() || isAskingAI}
                  variant="button"
                                  >
                  {isAskingAI ? t('common.loading') : t('common.ask')}
                </GlassButton>
              </div>
              
              {/* Quick Questions */}
              <div className="flex flex-wrap gap-2">
                {[
                  t('mockInterview.learning.improvementTips'),
                  t('mockInterview.learning.commonMistakes'),
                  t('mockInterview.learning.bestPractices'),
                  t('mockInterview.learning.industryInsights')
                ].map((question) => (
                  <GlassButton
                    key={question}
                    onClick={() => setFollowUpQuestion(question)}
                    variant="button"
                    size="sm"
                  >
                    {question}
                  </GlassButton>
                ))}
              </div>

              {aiResponse && (
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <h5 className="font-medium mb-2 text-gray-800 dark:text-gray-200">
                    {t('mockInterview.learning.aiResponse')}:
                  </h5>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{aiResponse}</p>
                </div>
              )}
            </div>
          </GlassCard>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Stats */}
          <GlassCard className="p-6">
            <h4 className="text-lg font-semibold mb-4">
              {t('common.summary')}
            </h4>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {t('mockInterview.results.duration')}
                </span>
                <span className="font-medium">{formatDuration(duration)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {t('mockInterview.results.questionsAnswered')}
                </span>
                <span className="font-medium">{questionsAnswered}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {t('mockInterview.results.averageResponseTime')}
                </span>
                <span className="font-medium">
                  {questionsAnswered > 0 ? Math.floor(duration / questionsAnswered) : 0}s
                </span>
              </div>
            </div>
          </GlassCard>

          {/* Action Buttons */}
          <div className="space-y-3">
            <GlassButton
              onClick={() => setShowTranscript(true)}
              variant="button"
              className="w-full"
            >
              {t('mockInterview.results.transcript')}
            </GlassButton>
            
            <GlassButton
              onClick={onPracticeMore}
              variant="button"
              className="w-full"
            >
              {t('mockInterview.practiceMore')}
            </GlassButton>
            
            <GlassButton
              onClick={onNewInterview}
              variant="button"
              className="w-full"
            >
              {t('mockInterview.newInterview')}
            </GlassButton>
          </div>

          {/* Gamification Preview */}
          <GlassCard className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20">
            <h4 className="text-lg font-semibold mb-4 text-purple-800 dark:text-purple-200">
              🏆 {t('mockInterview.gamification.xpEarned')}
            </h4>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600 dark:text-purple-400 mb-2">
                +{Math.floor(overallScore / 10) * 10} XP
              </div>
              <p className="text-sm text-purple-700 dark:text-purple-300">
                {overallScore >= 90 && "🥇 Perfect Performance!"}
                {overallScore >= 80 && overallScore < 90 && "🥈 Great Job!"}
                {overallScore >= 70 && overallScore < 80 && "🥉 Good Effort!"}
                {overallScore < 70 && "📈 Keep Practicing!"}
              </p>
            </div>
          </GlassCard>
        </div>
      </div>

      {/* Transcript Modal */}
      <GlassModal
        isOpen={showTranscript}
        onClose={() => setShowTranscript(false)}
        title={t('mockInterview.results.transcript')}
        size="lg"
      >
        <div className="p-6 max-h-96 overflow-y-auto">
          {session.transcript && session.transcript.length > 0 ? (
            <div className="space-y-4">
              {session.transcript.map((entry, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg ${
                    entry.speaker === 'user'
                      ? 'bg-blue-50 dark:bg-blue-900/20 ml-8'
                      : entry.speaker === 'ai'
                        ? 'bg-green-50 dark:bg-green-900/20 mr-8'
                        : 'bg-gray-50 dark:bg-gray-800'
                  }`}
                >
                  <div className="flex items-center mb-2">
                    <span className="text-sm font-medium">
                      {entry.speaker === 'user' ? 'You' : 
                       entry.speaker === 'ai' ? 'AI Interviewer' : 'System'}
                    </span>
                    <span className="text-xs text-gray-500 ml-2">
                      {convertTimestampToDate(entry.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-sm">{entry.text}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">
              <span className="text-4xl block mb-4">📝</span>
              <p>No transcript available</p>
            </div>
          )}
        </div>
      </GlassModal>
    </div>
  );
};

export default InterviewResults;
