import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { GlassCard, GlassButton, GlassModal } from '../design-system';
import { MockInterviewSession } from '../../types';

interface SocialSharingPanelProps {
  session: MockInterviewSession | null;
  onGenerateReport: () => void;
}

interface ShareableReport {
  id: string;
  title: string;
  score: number;
  duration: string;
  highlights: string[];
  shareUrl: string;
  createdAt: string;
}

const SocialSharingPanel: React.FC<SocialSharingPanelProps> = ({
  session,
  
}) => {
  const { t } = useTranslation();
  const [showShareModal, setShowShareModal] = useState(false);
  const [showReportPreview, setShowReportPreview] = useState(false);
  const [shareableReport, setShareableReport] = useState<ShareableReport | null>(null);
  const [customMessage, setCustomMessage] = useState('');
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [copiedToClipboard, setCopiedToClipboard] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const generateShareableReport = async () => {
    if (!session) return;

    setIsGeneratingReport(true);

    // Simulate report generation
    setTimeout(() => {
      const report: ShareableReport = {
        id: `report-${Date.now()}`,
        title: t('mockInterview.social.reportTitle'),
        score: session.overallScore || 0,
        duration: formatDuration(session.durationSeconds || 0),
        highlights: session.strengths || [
          t('mockInterview.social.defaultStrength1'),
          t('mockInterview.social.defaultStrength2'),
          t('mockInterview.social.defaultStrength3')
        ],
        shareUrl: `${window.location.origin}/shared-report/${Date.now()}`,
        createdAt: new Date().toISOString()
      };

      setShareableReport(report);
      setIsGeneratingReport(false);
      setShowReportPreview(true);
    }, 2000);
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const generateSocialMediaPost = (platform: 'linkedin' | 'twitter' | 'facebook') => {
    if (!shareableReport) return '';

    const baseMessage = customMessage || 
      t('mockInterview.social.defaultMessage', {
        score: shareableReport.score,
        role: 'Interview'
      });

    const hashtags = '#InterviewPrep #CareerDevelopment #JobSearch #MockInterview #Travaia';
    const url = shareableReport.shareUrl;

    switch (platform) {
      case 'linkedin':
        return `${baseMessage}\n\n${hashtags}\n\n${url}`;
      case 'twitter':
        return `${baseMessage} ${hashtags} ${url}`.substring(0, 280);
      case 'facebook':
        return `${baseMessage}\n\n${url}`;
      default:
        return baseMessage;
    }
  };

  const shareToSocialMedia = (platform: 'linkedin' | 'twitter' | 'facebook') => {
    if (!shareableReport) return;

    const message = generateSocialMediaPost(platform);
    const encodedMessage = encodeURIComponent(message);
    const encodedUrl = encodeURIComponent(shareableReport.shareUrl);

    let shareUrl = '';

    switch (platform) {
      case 'linkedin':
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}&summary=${encodedMessage}`;
        break;
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?text=${encodedMessage}`;
        break;
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedMessage}`;
        break;
    }

    window.open(shareUrl, '_blank', 'width=600,height=400');
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedToClipboard(true);
      setTimeout(() => setCopiedToClipboard(false), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const generateReportImage = async () => {
    if (!shareableReport || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = 800;
    canvas.height = 600;

    // Create gradient background
    const gradient = ctx.createLinearGradient(0, 0, 800, 600);
    gradient.addColorStop(0, '#667eea');
    gradient.addColorStop(1, '#764ba2');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 800, 600);

    // Add Travaia branding
    ctx.fillStyle = 'white';
    ctx.font = 'bold 32px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(t('common.appName'), 400, 80);
    ctx.font = '18px Arial';
    ctx.fillText(t('mockInterview.social.mockInterviewResults'), 400, 110);

    // Add score circle
    ctx.beginPath();
    ctx.arc(400, 250, 80, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.fill();
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Add score text
    ctx.fillStyle = 'white';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`${shareableReport.score}%`, 400, 265);

    // Add details
    ctx.font = '24px Arial';
    ctx.fillText(shareableReport.title, 400, 380);
    ctx.font = '18px Arial';
    ctx.fillText(t('mockInterview.social.overallScore'), 400, 410);
    ctx.fillText(`${t('mockInterview.social.duration')}: ${shareableReport.duration}`, 400, 420);

    // Add highlights
    ctx.font = '16px Arial';
    ctx.textAlign = 'left';
    shareableReport.highlights.slice(0, 3).forEach((highlight, index) => {
      ctx.fillText(`✓ ${highlight}`, 200, 480 + (index * 25));
    });

    // Convert to blob and download
    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${t('mockInterview.social.interviewResults')}-${Date.now()}.png`;
        a.click();
        URL.revokeObjectURL(url);
      }
    });
  };

  const shareViaEmail = () => {
    if (!shareableReport) return;

    const subject = encodeURIComponent(t('mockInterview.social.emailSubject', { score: shareableReport.score }));
    const body = encodeURIComponent(t('mockInterview.social.emailBody', {
      score: shareableReport.score,
      duration: shareableReport.duration,
      highlights: shareableReport.highlights.map(h => `• ${h}`).join('\n'),
      shareUrl: shareableReport.shareUrl,
      origin: window.location.origin
    }));

    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  if (!session) {
    return (
      <GlassCard className="p-6 text-center">
        <span className="text-4xl block mb-4">📊</span>
        <p className="text-gray-600 dark:text-gray-400">
          {t('mockInterview.social.noSession')}
        </p>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-6">
      {/* Share Your Success */}
      <GlassCard className="p-6 bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20">
        <div className="text-center mb-6">
          <span className="text-4xl block mb-3">🎉</span>
          <h3 className="text-xl font-bold text-green-800 dark:text-green-200 mb-2">
            {t('mockInterview.social.shareSuccess')}
          </h3>
          <p className="text-sm text-green-600 dark:text-green-300">
            {t('mockInterview.social.shareSuccessDesc')}
          </p>
        </div>

        <div className="space-y-3">
          <GlassButton
            onClick={generateShareableReport}
            disabled={isGeneratingReport}
            variant="button"            
            className="w-full"
          >
            {isGeneratingReport 
              ? t('mockInterview.social.generatingReport')
              : t('mockInterview.social.generateReport')
            }
          </GlassButton>

          {shareableReport && (
            <GlassButton
              onClick={() => setShowShareModal(true)}
              variant="button"
              className="w-full"
            >
              {t('mockInterview.social.shareNow')}
            </GlassButton>
          )}
        </div>
      </GlassCard>

      {/* Quick Share Options */}
      {shareableReport && (
        <GlassCard className="p-6">
          <h4 className="text-lg font-semibold mb-4 flex items-center">
            <span className="mr-2">📱</span>
            {t('mockInterview.social.quickShare')}
          </h4>

          <div className="grid grid-cols-2 gap-3">
            <GlassButton
              onClick={() => shareToSocialMedia('linkedin')}
              variant="button"
              className="flex items-center justify-center"
            >
              <span className="mr-2">💼</span>
              LinkedIn
            </GlassButton>

            <GlassButton
              onClick={() => shareToSocialMedia('twitter')}
              variant="button"
              className="flex items-center justify-center"
            >
              <span className="mr-2">🐦</span>
              Twitter
            </GlassButton>

            <GlassButton
              onClick={() => shareToSocialMedia('facebook')}
              variant="button"
              className="flex items-center justify-center"
            >
              <span className="mr-2">📘</span>
              Facebook
            </GlassButton>

            <GlassButton
              onClick={shareViaEmail}
              variant="button"
              className="flex items-center justify-center"
            >
              <span className="mr-2">📧</span>
              Email
            </GlassButton>
          </div>
        </GlassCard>
      )}

      {/* Achievement Showcase */}
      <GlassCard className="p-6">
        <h4 className="text-lg font-semibold mb-4 flex items-center">
          <span className="mr-2">🏆</span>
          {t('mockInterview.social.achievements')}
        </h4>

        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
            <div className="flex items-center">
              <span className="text-2xl mr-3">🎯</span>
              <div>
                <div className="font-medium text-yellow-800 dark:text-yellow-200">
                  {t('mockInterview.social.scoreAchievement')}
                </div>
                <div className="text-sm text-yellow-600 dark:text-yellow-300">
                  {session.overallScore}% {t('mockInterview.social.overallScore')}
                </div>
              </div>
            </div>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200">
              {(session.overallScore ?? 0) >= 90 ? t('mockInterview.rating.excellent') : 
               (session.overallScore ?? 0) >= 80 ? t('mockInterview.rating.great') : 
               (session.overallScore ?? 0) >= 70 ? t('mockInterview.rating.good') : t('mockInterview.rating.improving')}
            </span>
          </div>

          <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="flex items-center">
              <span className="text-2xl mr-3">⏱️</span>
              <div>
                <div className="font-medium text-blue-800 dark:text-blue-200">
                  {t('mockInterview.social.timeManagement')}
                </div>
                <div className="text-sm text-blue-600 dark:text-blue-300">
                  {formatDuration(session.durationSeconds || 0)} {t('mockInterview.social.duration')}
                </div>
              </div>
            </div>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-200">
              {t('common.completed')}
            </span>
          </div>

          <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <div className="flex items-center">
              <span className="text-2xl mr-3">💪</span>
              <div>
                <div className="font-medium text-green-800 dark:text-green-200">
                  {t('mockInterview.social.strengthsShown')}
                </div>
                <div className="text-sm text-green-600 dark:text-green-300">
                  {(session.strengths || []).length} {t('mockInterview.social.keyStrengths')}
                </div>
              </div>
            </div>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-200">
              {t('common.identified')}
            </span>
          </div>
        </div>
      </GlassCard>

      {/* Share Modal */}
      <GlassModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        title={t('mockInterview.social.shareResults')}
        size="lg"
      >
        <div className="p-6">
          {shareableReport && (
            <div className="space-y-6">
              {/* Custom Message */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  {t('mockInterview.social.customMessage')}
                </label>
                <textarea
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder={t('mockInterview.social.messagePlaceholder')}
                  rows={4}
                  className="w-full p-3 rounded-lg bg-white bg-opacity-20 backdrop-blur-sm border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
              </div>

              {/* Preview */}
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <h5 className="font-medium mb-2">{t('common.preview')}:</h5>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {generateSocialMediaPost('linkedin')}
                </p>
              </div>

              {/* Share Options */}
              <div className="grid grid-cols-2 gap-4">
                <GlassButton
                  onClick={() => shareToSocialMedia('linkedin')}
                  variant="button"
                  className="flex items-center justify-center"
                >
                  <span className="mr-2">💼</span>
                  {t('mockInterview.social.shareLinkedIn')}
                </GlassButton>

                <GlassButton
                  onClick={() => shareToSocialMedia('twitter')}
                  variant="button"
                  className="flex items-center justify-center"
                >
                  <span className="mr-2">🐦</span>
                  {t('mockInterview.social.shareTwitter')}
                </GlassButton>

                <GlassButton
                  onClick={() => copyToClipboard(shareableReport.shareUrl)}
                  variant="button"
                  className="flex items-center justify-center"
                >
                  <span className="mr-2">🔗</span>
                  {copiedToClipboard ? t('common.copied') : t('common.copyLink')}
                </GlassButton>

                <GlassButton
                  onClick={generateReportImage}
                  variant="button"
                  className="flex items-center justify-center"
                >
                  <span className="mr-2">📸</span>
                  {t('mockInterview.social.downloadImage')}
                </GlassButton>
              </div>
            </div>
          )}
        </div>
      </GlassModal>

      {/* Report Preview Modal */}
      <GlassModal
        isOpen={showReportPreview}
        onClose={() => setShowReportPreview(false)}
        title={t('mockInterview.social.reportPreview')}
        size="lg"
      >
        <div className="p-6">
          {shareableReport && (
            <div className="text-center space-y-4">
              <div className="p-6 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg">
                <h3 className="text-xl font-bold mb-2">{shareableReport.title}</h3>
                <div className="text-4xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                  {shareableReport.score}%
                </div>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  {t('mockInterview.social.completedIn')} {shareableReport.duration}
                </p>
                <div className="text-left">
                  <h4 className="font-semibold mb-2">{t('mockInterview.social.keyHighlights')}:</h4>
                  <ul className="space-y-1">
                    {shareableReport.highlights.map((highlight, index) => (
                      <li key={index} className="flex items-center text-sm">
                        <span className="mr-2 text-green-500">✓</span>
                        {highlight}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="flex space-x-3">
                <GlassButton
                  onClick={() => {
                    setShowReportPreview(false);
                    setShowShareModal(true);
                  }}
                  variant="button"
                  className="flex-1"
                >
                  {t('mockInterview.social.shareNow')}
                </GlassButton>
                <GlassButton
                  onClick={() => setShowReportPreview(false)}
                  variant="button"
                  className="flex-1"
                >
                  {t('common.close')}
                </GlassButton>
              </div>
            </div>
          )}
        </div>
      </GlassModal>

      {/* Hidden canvas for image generation */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default SocialSharingPanel;
