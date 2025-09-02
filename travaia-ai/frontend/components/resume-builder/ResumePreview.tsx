import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { GlassCard, GlassButton } from '../design-system';

interface PersonalInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  linkedinUrl: string;
  portfolioUrl: string;
  summary: string;
}

interface Experience {
  id: string;
  jobTitle: string;
  company: string;
  startDate: string;
  endDate: string;
  currentPosition: boolean;
  description: string;
}

interface Education {
  id: string;
  degree: string;
  institution: string;
  graduationDate: string;
  gpa: string;
}

interface Skill {
  id: string;
  name: string;
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
}

interface Certification {
  id: string;
  name: string;
  issuingOrganization: string;
  issueDate: string;
  expirationDate: string;
}

interface ResumeData {
  personalInfo: PersonalInfo;
  experience: Experience[];
  education: Education[];
  skills: Skill[];
  certifications: Certification[];
}

interface ResumePreviewProps {
  data: ResumeData;
  templateId?: string;
  isGenerating?: boolean;
  onDownload: () => void;
  onEnhanceWithAI: () => void;
  className?: string;
}

const ResumePreview: React.FC<ResumePreviewProps> = ({
  data,
  templateId,
  isGenerating = false,
  onDownload,
  onEnhanceWithAI,
  className = ''
}) => {
  const { t } = useTranslation();
  const [previewScale, setPreviewScale] = useState(1);

  // Format date for display
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short' 
    });
  };

  // Check if resume has any content
  const hasContent = () => {
    return (
      data.personalInfo.firstName ||
      data.personalInfo.lastName ||
      data.experience.length > 0 ||
      data.education.length > 0 ||
      data.skills.length > 0
    );
  };

  // Adjust preview scale based on container size
  useEffect(() => {
    const handleResize = () => {
      const container = document.getElementById('resume-preview-container');
      if (container) {
        const containerWidth = container.clientWidth;
        const resumeWidth = 300; // Base width for resume preview
        const scale = Math.min(1, (containerWidth - 32) / resumeWidth);
        setPreviewScale(scale);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (isGenerating) {
    return (
      <GlassCard variant="default" className={`p-6 ${className}`}>
        <h2 className="text-xl font-semibold mb-6 text-gray-900 dark:text-white">
          {t('resumeBuilder.preview.title')}
        </h2>
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">{t('resumeBuilder.preview.loading')}</p>
        </div>
      </GlassCard>
    );
  }

  if (!hasContent()) {
    return (
      <GlassCard variant="default" className={`p-6 ${className}`}>
        <h2 className="text-xl font-semibold mb-6 text-gray-900 dark:text-white">
          {t('resumeBuilder.preview.title')}
        </h2>
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-gray-600 dark:text-gray-400">{t('resumeBuilder.preview.noData')}</p>
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard variant="default" className={`p-6 ${className}`}>
      <h2 className="text-xl font-semibold mb-6 text-gray-900 dark:text-white">
        {t('resumeBuilder.preview.title')}
      </h2>
      
      {/* Resume Preview Container */}
      <div 
        id="resume-preview-container"
        className="mb-6 overflow-hidden"
      >
        <div 
          className="bg-white border border-gray-200 rounded-lg shadow-sm mx-auto"
          style={{ 
            transform: `scale(${previewScale})`,
            transformOrigin: 'top center',
            width: '300px',
            minHeight: '400px'
          }}
        >
          {/* Modern Template Preview */}
          <div className="p-4 text-gray-900">
            {/* Header */}
            <div className="text-center mb-4 pb-4 border-b border-gray-200">
              <h1 className="text-lg font-bold mb-1">
                {data.personalInfo.firstName} {data.personalInfo.lastName}
              </h1>
              {data.experience.length > 0 && (
                <p className="text-sm text-gray-600 mb-2">
                  {data.experience[0].jobTitle}
                </p>
              )}
              <div className="text-xs text-gray-500 space-y-1">
                {data.personalInfo.email && (
                  <div>{data.personalInfo.email}</div>
                )}
                {data.personalInfo.phone && (
                  <div>{data.personalInfo.phone}</div>
                )}
                {(data.personalInfo.city || data.personalInfo.state) && (
                  <div>
                    {data.personalInfo.city}
                    {data.personalInfo.city && data.personalInfo.state && ', '}
                    {data.personalInfo.state}
                  </div>
                )}
                {data.personalInfo.linkedinUrl && (
                  <div className="text-blue-600">LinkedIn Profile</div>
                )}
              </div>
            </div>

            {/* Professional Summary */}
            {data.personalInfo.summary && (
              <div className="mb-4">
                <h2 className="text-sm font-semibold text-gray-900 border-b border-gray-300 pb-1 mb-2">
                  PROFESSIONAL SUMMARY
                </h2>
                <p className="text-xs text-gray-700 leading-relaxed">
                  {data.personalInfo.summary.substring(0, 150)}
                  {data.personalInfo.summary.length > 150 && '...'}
                </p>
              </div>
            )}

            {/* Experience */}
            {data.experience.length > 0 && (
              <div className="mb-4">
                <h2 className="text-sm font-semibold text-gray-900 border-b border-gray-300 pb-1 mb-2">
                  EXPERIENCE
                </h2>
                <div className="space-y-3">
                  {data.experience.slice(0, 2).map((exp) => (
                    <div key={exp.id}>
                      <div className="flex justify-between items-start mb-1">
                        <div>
                          <p className="text-xs font-medium text-gray-900">{exp.jobTitle}</p>
                          <p className="text-xs text-gray-600">{exp.company}</p>
                        </div>
                        <p className="text-xs text-gray-500">
                          {formatDate(exp.startDate)} - {exp.currentPosition ? 'Present' : formatDate(exp.endDate)}
                        </p>
                      </div>
                      {exp.description && (
                        <p className="text-xs text-gray-700 mt-1">
                          • {exp.description.substring(0, 80)}
                          {exp.description.length > 80 && '...'}
                        </p>
                      )}
                    </div>
                  ))}
                  {data.experience.length > 2 && (
                    <p className="text-xs text-gray-500 italic">
                      +{data.experience.length - 2} more positions
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Education */}
            {data.education.length > 0 && (
              <div className="mb-4">
                <h2 className="text-sm font-semibold text-gray-900 border-b border-gray-300 pb-1 mb-2">
                  EDUCATION
                </h2>
                <div className="space-y-2">
                  {data.education.slice(0, 2).map((edu) => (
                    <div key={edu.id} className="flex justify-between items-start">
                      <div>
                        <p className="text-xs font-medium text-gray-900">{edu.degree}</p>
                        <p className="text-xs text-gray-600">{edu.institution}</p>
                      </div>
                      <p className="text-xs text-gray-500">{formatDate(edu.graduationDate)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Skills */}
            {data.skills.length > 0 && (
              <div className="mb-4">
                <h2 className="text-sm font-semibold text-gray-900 border-b border-gray-300 pb-1 mb-2">
                  SKILLS
                </h2>
                <div className="flex flex-wrap gap-1">
                  {data.skills.slice(0, 8).map((skill) => (
                    <span
                      key={skill.id}
                      className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
                    >
                      {skill.name}
                    </span>
                  ))}
                  {data.skills.length > 8 && (
                    <span className="px-2 py-1 bg-gray-200 text-gray-600 rounded text-xs">
                      +{data.skills.length - 8} more
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Certifications */}
            {data.certifications.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-gray-900 border-b border-gray-300 pb-1 mb-2">
                  CERTIFICATIONS
                </h2>
                <div className="space-y-1">
                  {data.certifications.slice(0, 3).map((cert) => (
                    <div key={cert.id} className="flex justify-between items-start">
                      <div>
                        <p className="text-xs font-medium text-gray-900">{cert.name}</p>
                        <p className="text-xs text-gray-600">{cert.issuingOrganization}</p>
                      </div>
                      <p className="text-xs text-gray-500">{formatDate(cert.issueDate)}</p>
                    </div>
                  ))}
                  {data.certifications.length > 3 && (
                    <p className="text-xs text-gray-500 italic">
                      +{data.certifications.length - 3} more certifications
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-3">
        <GlassButton
          variant="primary"
          size="md"
          onClick={onDownload}
          className="w-full"
        >
          {t('resumeBuilder.downloadResume')}
        </GlassButton>
        
        <GlassButton
          variant="secondary"
          size="md"
          onClick={onEnhanceWithAI}
          className="w-full"
        >
          {t('resumeBuilder.ai.enhance')}
        </GlassButton>

        {/* Template Info */}
        {templateId && (
          <div className="text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t('common.template', 'Template')}: {templateId}
            </p>
          </div>
        )}
      </div>

      {/* Preview Scale Controls */}
      <div className="mt-4 flex justify-center items-center space-x-2">
        <button
          onClick={() => setPreviewScale(Math.max(0.5, previewScale - 0.1))}
          className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          disabled={previewScale <= 0.5}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
          </svg>
        </button>
        <span className="text-xs text-gray-500 dark:text-gray-400 min-w-12 text-center">
          {Math.round(previewScale * 100)}%
        </span>
        <button
          onClick={() => setPreviewScale(Math.min(1.5, previewScale + 0.1))}
          className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          disabled={previewScale >= 1.5}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>
    </GlassCard>
  );
};

export default ResumePreview;
