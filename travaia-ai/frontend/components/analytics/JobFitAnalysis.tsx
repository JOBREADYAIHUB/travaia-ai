import React, { useState, useEffect, useRef } from 'react';
import styles from './JobFitAnalysis.module.css';
import { useTranslation } from 'react-i18next';
import { JobApplication } from '../../types';
import { GlassButton, GlassCard, GlassModal } from '../design-system';
// select and span replaced with native elements
import { CircularProgressIndicator } from '../common/CircularProgressIndicator';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';
import { DownloadIcon, LinkedInIcon, TwitterIcon, FacebookIcon, ShareIcon } from '../icons/AdditionalIcons';
import html2canvas from 'html2canvas';
import ShareableCard from './ShareableCard';

interface Props {
  jobApplications: JobApplication[];
  className?: string;
}

interface JobFitMatch {
  overall: number;
  skills: number;
  experience: number;
  education: number;
  strengths: string[];
  improvementAreas: string[];
  suggestedSkills: string[];
}

const JobFitAnalysis: React.FC<Props> = ({ jobApplications, className }) => {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [selectedJob, setSelectedJob] = useState<JobApplication | null>(null);
  const [matchResults, setMatchResults] = useState<JobFitMatch | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState<boolean>(false);
  const [shareableImage, setShareableImage] = useState<string>('');
  const shareableCardRef = useRef<HTMLDivElement>(null);
  
  // Update selected job when ID changes
  useEffect(() => {
    if (selectedJobId) {
      const job = jobApplications.find(j => j.id === selectedJobId);
      setSelectedJob(job || null);
    } else {
      setSelectedJob(null);
    }
  }, [selectedJobId, jobApplications]);

  // Analyze the job fit based on user profile and job requirements
  const analyzeJobFit = async () => {
    if (!selectedJob || !currentUser) {
      setError(t('analyticsPage.jobFitAnalysis.errorNoSelection'));
      return;
    }
    
    setIsAnalyzing(true);
    setError(null);
    
    try {
      // Simulate analysis - this would be replaced with actual AI service call
      // In a real implementation, use AI to analyze the match based on job requirements
      // and user profile
      
      setTimeout(() => {
        // Simulated results
        setMatchResults({
          overall: Math.round(Math.random() * 40 + 60), // 60-100%
          skills: Math.round(Math.random() * 40 + 60),
          experience: Math.round(Math.random() * 40 + 60),
          education: Math.round(Math.random() * 40 + 60),
          strengths: [
            'Communication skills',
            'Problem solving',
            'Team collaboration'
          ],
          improvementAreas: [
            'Leadership experience',
            'Project management'
          ],
          suggestedSkills: [
            'Agile methodology',
            'Data analysis',
            'UI/UX design'
          ]
        });
        setIsAnalyzing(false);
      }, 2000);
    } catch (err) {
      console.error('Error analyzing job fit:', err);
      setError(t('analyticsPage.jobFitAnalysis.errorAnalysis'));
      setIsAnalyzing(false);
    }
  };

  const handleShareResults = async () => {
    if (!matchResults || !selectedJob || !currentUser) return;
    
    setShowShareModal(true);
    
    // If we've already generated the shareable image, no need to regenerate it
    if (!shareableImage && shareableCardRef.current) {
      try {
        const canvas = await html2canvas(shareableCardRef.current, { 
          scale: 2, // Higher quality
          backgroundColor: null,
          logging: false
        });
        
        const image = canvas.toDataURL('image/png');
        setShareableImage(image);
      } catch (err) {
        console.error('Error generating shareable image:', err);
        toast.error(t('analyticsPage.jobFitAnalysis.errorShareImage'));
      }
    }
  };

  const handleDownloadPDF = () => {
    if (!shareableImage) return;
    
    const link = document.createElement('a');
    link.href = shareableImage;
    link.download = `job-fit-analysis-${new Date().getTime()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success(t('analyticsPage.jobFitAnalysis.downloadSuccess'));
  };

  const handleSocialShare = (platform: 'linkedin' | 'twitter' | 'facebook') => {
    if (!shareableImage || !selectedJob || !currentUser) return;

    const baseUrl = window.location.origin;
    const shareUrl = `${baseUrl}/share/job-fit/${selectedJob.id}`;

    const title = `Check out my job fit analysis for ${selectedJob.role?.title || 'a position'} at ${selectedJob.company?.name || 'a company'}!`;
    const description = `I have a ${matchResults?.overall}% match for this position. See the full analysis!`;

    let shareLink = '';

    switch (platform) {
      case 'linkedin':
        shareLink = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(title)}&summary=${encodeURIComponent(description)}`;
        break;
      case 'twitter':
        shareLink = `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(`${title} ${description}`)}`;
        break;
      case 'facebook':
        shareLink = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(`${title} ${description}`)}`;
        break;
    }

    window.open(shareLink, '_blank', 'width=600,height=400');
  };

  const renderScoreBar = (value: number, label: string) => {
    return (
      <div className="mb-3 last:mb-0">
        <div className="flex justify-between text-sm mb-1">
          <span>{label}</span>
          <span>{value}%</span>
        </div>
        <div className="h-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`${styles.progressBar} h-full bg-blue-500 rounded-full`}
            data-progress={value}
            ref={(el) => {
              if (el) {
                el.style.setProperty('--progress-width', `${value}%`);
              }
            }}
          ></div>
        </div>
      </div>
    );
  };

  return (
    <GlassCard className={`w-full ${className || ''}`}>
      <div className="p-6">
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}
        {!selectedJobId && (
          <div className="text-center py-8">
            <h3 className="text-xl font-semibold mb-4">{t('analyticsPage.jobFitAnalysis.selectJob')}</h3>
            <p className="text-gray-600 dark:text-gray-400">
              {t('analyticsPage.jobFitAnalysis.selectJobDesc')}
            </p>
          </div>
        )}

        {selectedJobId && (
          <div>
            <h3 className="text-xl font-semibold mb-4">{selectedJob?.role?.title || t('common.untitled')} at {selectedJob?.company?.name || t('common.unknown')}</h3>
            <p className="text-gray-600 dark:text-gray-400">
              {t('analyticsPage.jobFitAnalysis.selectedJobDesc')}
            </p>
          </div>
        )}

        <div className="mb-6">
          <label htmlFor="job-select" className="block text-sm font-medium mb-2">
            {t('analyticsPage.jobFitAnalysis.selectJob')}
          </label>
          <select
            id="job-select"
            name="job-select"
            value={selectedJobId}
            onChange={(e) => setSelectedJobId(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="" disabled>
              {t('analyticsPage.jobFitAnalysis.selectJobPlaceholder')}
            </option>
            {jobApplications.map((job) => (
              <option key={job.id} value={job.id}>
                {`${job.role?.title || t('common.untitled')} at ${job.company?.name || t('common.unknown')}`}
              </option>
            ))}
          </select>
        </div>

        <div className="flex justify-center mb-6">
          <GlassButton
            variant="button"
            onClick={analyzeJobFit}
            disabled={!selectedJobId || isAnalyzing}
          >
            {t('analyticsPage.jobFitAnalysis.analyzeButton')}
          </GlassButton>
          <p className="ml-3 text-gray-600 dark:text-gray-300">
            {t('analyticsPage.jobFitAnalysis.noJobSelected')}
          </p>
        </div>
      </div>
    )
      
      {!isAnalyzing && matchResults && selectedJob && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-5 border border-gray-200 dark:border-gray-700">
          <div className="flex flex-col md:flex-row items-center justify-between mb-6">
            <div>
              <h4 className="text-lg font-medium mb-1">{selectedJob.jobTitle}</h4>
              <p className="text-gray-600 dark:text-gray-400">{selectedJob.companyName}</p>
            </div>
            
            <div className="flex flex-col items-center mt-4 md:mt-0">
              <div className="relative h-24 w-24">
                <CircularProgressIndicator 
                  value={matchResults.overall}
                  size={96}
                  strokeWidth={8}
                  progressColor={
                    matchResults.overall >= 80 ? 'bg-green-500' : 
                    matchResults.overall >= 60 ? 'bg-blue-500' : 
                    matchResults.overall >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                  }
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold">{matchResults.overall}%</span>
                </div>
              </div>
              <p className="text-sm font-medium mt-2">{t('analyticsPage.jobFitAnalysis.matchScore')}</p>
            </div>
          </div>
          
          <div className="mb-6">
            <h5 className="text-sm font-medium mb-3 text-gray-700 dark:text-gray-300">
              {t('analyticsPage.jobFitAnalysis.matchScore')} {t('common.breakdown')}
            </h5>
            
            {renderScoreBar(matchResults.skills, t('analyticsPage.jobFitAnalysis.skillMatch'))}
            {renderScoreBar(matchResults.experience, t('analyticsPage.jobFitAnalysis.experienceMatch'))}
            {renderScoreBar(matchResults.education, t('analyticsPage.jobFitAnalysis.educationMatch'))}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <h5 className="text-sm font-medium mb-3 text-gray-700 dark:text-gray-300">
                {t('analyticsPage.jobFitAnalysis.strengthAreas')}
              </h5>
              <ul className="space-y-2">
                {matchResults.strengths.map((strength, index) => (
                  <li key={index} className="flex items-start">
                    <span className="inline-block bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-full p-1 mr-2">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                    <span className="text-sm">{strength}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <div>
              <h5 className="text-sm font-medium mb-3 text-gray-700 dark:text-gray-300">
                {t('analyticsPage.jobFitAnalysis.improvementAreas')}
              </h5>
              <ul className="space-y-2">
                {matchResults.improvementAreas.map((area, index) => (
                  <li key={index} className="flex items-start">
                    <span className="inline-block bg-yellow-100 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400 rounded-full p-1 mr-2">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </span>
                    <span className="text-sm">{area}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          
          <div className="mb-6">
            <h5 className="text-sm font-medium mb-3 text-gray-700 dark:text-gray-300">
              {t('analyticsPage.jobFitAnalysis.suggestedSkills')}
            </h5>
            <div className="flex flex-wrap gap-2">
              {matchResults.suggestedSkills.length > 0 ? (
                matchResults.suggestedSkills.map((skill, index) => (
                  <span key={index} className="inline-block px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full mr-2 mb-2">
                    {skill}
                  </span>
                ))
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                  {t('analyticsPage.skillsManagement.noSkills')}
                </p>
              )}
            </div>
          </div>
          
          <div className="flex justify-end space-x-3">
            <GlassButton
              variant="button"
              onClick={handleShareResults}
              className="flex items-center"
            >
              <ShareIcon className="w-4 h-4 mr-1" />
              {t('analyticsPage.jobFitAnalysis.shareResults')}
            </GlassButton>
            
            <GlassButton
              variant="button"
              onClick={handleDownloadPDF}
              className="flex items-center"
            >
              <DownloadIcon className="w-4 h-4 mr-1" />
              {t('analyticsPage.jobFitAnalysis.downloadPDF')}
            </GlassButton>
          </div>
        </div>
      )}
      
      {/* Hidden ShareableCard for image generation */}
      <div className={styles.hiddenElement}>
        <div ref={shareableCardRef}>
          {matchResults && selectedJob && currentUser && (
            <ShareableCard
              companyName={selectedJob.company?.name || ''}
              jobTitle={selectedJob.role?.title || ''}
              matchScore={matchResults.overall}
              userName={currentUser.displayName || ''}
              skills={[
                { name: t('analyticsPage.jobFitAnalysis.skillMatch'), score: matchResults.skills },
                { name: t('analyticsPage.jobFitAnalysis.experienceMatch'), score: matchResults.experience },
                { name: t('analyticsPage.jobFitAnalysis.educationMatch'), score: matchResults.education }
              ]}
              strengths={matchResults.strengths}
            />
          )}
        </div>
      </div>

      {/* Share Modal */}
      <GlassModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        title={t('analyticsPage.jobFitAnalysis.shareResults')}
      >
        <div className="space-y-6">
          {shareableImage ? (
            <div className="flex flex-col items-center">
              <img 
                src={shareableImage} 
                alt={t('analyticsPage.jobFitAnalysis.shareableImage')} 
                className="max-w-full rounded-lg shadow-lg mb-4" 
              />
              
              <div className="text-center text-sm text-gray-500 dark:text-gray-400 mb-4">
                {t('analyticsPage.jobFitAnalysis.shareExplanation')}
              </div>
              
              <div className="flex flex-wrap gap-4 justify-center">
                <GlassButton
                  variant="button"
                  onClick={() => handleSocialShare('linkedin')}
                  className="flex items-center justify-center"
                >
                  <LinkedInIcon className="w-5 h-5 mr-2" /> LinkedIn
                </GlassButton>
                
                <GlassButton
                  variant="button"
                  onClick={() => handleSocialShare('twitter')}
                  className="flex items-center justify-center"
                >
                  <TwitterIcon className="w-5 h-5 mr-2" /> Twitter
                </GlassButton>
                
                <GlassButton
                  variant="button"
                  onClick={() => handleSocialShare('facebook')}
                  className="flex items-center justify-center"
                >
                  <FacebookIcon className="w-5 h-5 mr-2" /> Facebook
                </GlassButton>
              </div>
              
              <div className="mt-4">
                <GlassButton
                  variant="button"
                  onClick={handleDownloadPDF}
                  className="flex items-center justify-center"
                >
                  <DownloadIcon className="w-5 h-5 mr-2" /> {t('analyticsPage.jobFitAnalysis.downloadImage')}
                </GlassButton>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center p-6">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
              <p>{t('analyticsPage.jobFitAnalysis.generatingImage')}</p>
            </div>
          )}
        </div>
      </GlassModal>
    </GlassCard>
  );
};

export default JobFitAnalysis;
