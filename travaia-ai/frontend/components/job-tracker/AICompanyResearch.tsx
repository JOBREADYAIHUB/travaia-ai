// components/job-tracker/AICompanyResearch.tsx - AI-Powered Company Research
import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { JobApplication } from '../../types';
import { PageHeader, GlassCard, GlassButton, ProgressBar } from '../design-system';
import { SparklesIcon, GlobeIcon, TrendingUpIcon, UsersIcon } from '../icons/Icons';
import { llmService, generateCompanyResearch, LLMStreamResponse } from '../../services/llmService';

interface AICompanyResearchProps {
  application: JobApplication;
  onResearchComplete?: (insights: string) => void;
}

interface ResearchSection {
  id: string;
  title: string;
  content: string;
  icon: string;
  isComplete: boolean;
}

const AICompanyResearch: React.FC<AICompanyResearchProps> = ({
  application,
  onResearchComplete,
}) => {
  const { t } = useTranslation();
  const [isResearching, setIsResearching] = useState(false);
  const [researchSections, setResearchSections] = useState<ResearchSection[]>([]);
  const [streamingContent, setStreamingContent] = useState('');
  const [currentSection, setCurrentSection] = useState<string>('');
  const [progress, setProgress] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Auto-scroll to bottom during streaming
    if (contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [streamingContent]);

  const initializeResearchSections = () => {
    const sections: ResearchSection[] = [
      {
        id: 'overview',
        title: t('aiResearch.companyOverview', 'Company Overview'),
        content: '',
        icon: '🏢',
        isComplete: false,
      },
      {
        id: 'culture',
        title: t('aiResearch.companyCulture', 'Company Culture & Values'),
        content: '',
        icon: '🤝',
        isComplete: false,
      },
      {
        id: 'industry',
        title: t('aiResearch.industryPosition', 'Industry Position'),
        content: '',
        icon: '📈',
        isComplete: false,
      },
      {
        id: 'recent',
        title: t('aiResearch.recentNews', 'Recent Developments'),
        content: '',
        icon: '📰',
        isComplete: false,
      },
      {
        id: 'interview',
        title: t('aiResearch.interviewTips', 'Interview Insights'),
        content: '',
        icon: '💡',
        isComplete: false,
      },
    ];
    setResearchSections(sections);
    return sections;
  };

  const startCompanyResearch = async () => {
    if (!llmService.isAvailable()) {
      generateFallbackResearch();
      return;
    }

    setIsResearching(true);
    setStreamingContent('');
    setProgress(0);
    setCurrentSection('Initializing research...');
    
    const sections = initializeResearchSections();

    const streamCallbacks: LLMStreamResponse = {
      onChunk: (chunk: string) => {
        setStreamingContent(prev => prev + chunk);
        
        // Update progress based on content length (rough estimation)
        const estimatedProgress = Math.min(90, (streamingContent.length + chunk.length) / 50);
        setProgress(estimatedProgress);
      },
      onComplete: (fullResponse: string) => {
        setProgress(100);
        setCurrentSection('Processing research results...');
        parseResearchResponse(fullResponse, sections);
        setIsResearching(false);
        
        if (onResearchComplete) {
          onResearchComplete(fullResponse);
        }
      },
      onError: (error: string) => {
        console.error('Company Research Error:', error);
        setCurrentSection('Research failed, using fallback data...');
        generateFallbackResearch();
        setIsResearching(false);
      },
    };

    try {
      setCurrentSection(`Researching ${application.company.name}...`);
      await generateCompanyResearch(application, streamCallbacks);
    } catch (error) {
      streamCallbacks.onError('Failed to start company research');
    }
  };

  const parseResearchResponse = (response: string, sections: ResearchSection[]) => {
    try {
      // Parse the AI response and distribute content to sections
      const lines = response.split('\n').filter(line => line.trim());
      let currentSectionIndex = 0;
      let currentContent = '';

      for (const line of lines) {
        // Check if line is a section header
        if (line.includes('Overview') || line.includes('Company Culture') || 
            line.includes('Industry') || line.includes('Recent') || 
            line.includes('Interview')) {
          
          // Save previous section content
          if (currentContent && currentSectionIndex < sections.length) {
            sections[currentSectionIndex].content = currentContent.trim();
            sections[currentSectionIndex].isComplete = true;
          }
          
          // Move to next section
          currentSectionIndex++;
          currentContent = '';
        } else {
          currentContent += line + '\n';
        }
      }

      // Save last section
      if (currentContent && currentSectionIndex < sections.length) {
        sections[currentSectionIndex].content = currentContent.trim();
        sections[currentSectionIndex].isComplete = true;
      }

      // Fill any remaining sections with general content
      sections.forEach((section, index) => {
        if (!section.content) {
          section.content = `Research insights for ${section.title.toLowerCase()} will be available here.`;
          section.isComplete = true;
        }
      });

      setResearchSections([...sections]);
    } catch (error) {
      console.error('Failed to parse research response:', error);
      generateFallbackResearch();
    }
  };

  const generateFallbackResearch = () => {
    const fallbackSections: ResearchSection[] = [
      {
        id: 'overview',
        title: t('aiResearch.companyOverview'),
        content: t('aiResearch.fallbackOverview', `${application.company.name} is a company in the ${application.company.industry || 'technology'} sector. Research their mission, values, and recent achievements to better understand their business focus.`),
        icon: '🏢',
        isComplete: true,
      },
      {
        id: 'culture',
        title: t('aiResearch.companyCulture'),
        content: t('aiResearch.fallbackCulture', 'Research the company culture through their website, employee reviews on Glassdoor, and social media presence. Look for information about work-life balance, team dynamics, and company values.'),
        icon: '🤝',
        isComplete: true,
      },
      {
        id: 'industry',
        title: t('aiResearch.industryPosition'),
        content: t('aiResearch.fallbackIndustry', 'Analyze the company\'s position in their industry, key competitors, market trends, and growth opportunities. This will help you understand their business challenges and opportunities.'),
        icon: '📈',
        isComplete: true,
      },
      {
        id: 'recent',
        title: t('aiResearch.recentNews'),
        content: t('aiResearch.fallbackNews', 'Search for recent news articles, press releases, and company announcements. This information can provide great talking points during interviews.'),
        icon: '📰',
        isComplete: true,
      },
      {
        id: 'interview',
        title: t('aiResearch.interviewTips'),
        content: t('aiResearch.fallbackInterview', 'Prepare questions about the role, team structure, and company goals. Research common interview questions for this type of position and practice your responses.'),
        icon: '💡',
        isComplete: true,
      },
    ];

    setResearchSections(fallbackSections);
    setProgress(100);
    setIsResearching(false);
  };

  const getSectionIcon = (iconString: string) => {
    switch (iconString) {
      case '🏢':
        return <SparklesIcon className="w-5 h-5 text-blue-500" />;
      case '🤝':
        return <UsersIcon className="w-5 h-5 text-green-500" />;
      case '📈':
        return <TrendingUpIcon className="w-5 h-5 text-purple-500" />;
      case '📰':
        return <GlobeIcon className="w-5 h-5 text-orange-500" />;
      case '💡':
        return <SparklesIcon className="w-5 h-5 text-yellow-500" />;
      default:
        return <span className="text-lg">{iconString}</span>;
    }
  };

  return (
    <GlassCard className="p-6 bg-base_100 dark:bg-dark_card_bg border border-base_300 dark:border-neutral-700">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <SparklesIcon className="w-6 h-6 text-blue-500 mr-2" />
          <h3 className="text-xl font-semibold text-primary dark:text-blue-400">
            {t('aiResearch.title', 'AI Company Research')}
          </h3>
        </div>
        
        <GlassButton
          variant="button"
          size="sm"
          onClick={startCompanyResearch}
          disabled={isResearching}
          className="flex items-center"
        >
          <SparklesIcon className="w-4 h-4 mr-1" />
          {isResearching 
            ? t('aiResearch.researching', 'Researching...') 
            : t('aiResearch.startResearch', 'Start Research')
          }
        </GlassButton>
      </div>

      {/* Progress Indicator */}
      {isResearching && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-neutral dark:text-gray-200">
              {currentSection}
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {Math.round(progress)}%
            </span>
          </div>
          <ProgressBar 
            value={progress}
            max={100}
            variant="default"
            size="md"
          />
        </div>
      )}

      {/* Streaming Content Display */}
      {isResearching && streamingContent && (
        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg max-h-64 overflow-y-auto" ref={contentRef}>
          <div className="flex items-center mb-2">
            <div className="animate-pulse w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
              {t('aiResearch.analyzing', 'AI is researching the company...')}
            </span>
          </div>
          <div className="text-sm text-blue-600 dark:text-blue-400 whitespace-pre-wrap">
            {streamingContent}
            <span className="inline-block w-2 h-4 bg-blue-500 animate-pulse ml-1"></span>
          </div>
        </div>
      )}

      {/* Research Results */}
      {researchSections.length > 0 && (
        <div className="space-y-4">
          {researchSections.map((section) => (
            <div
              key={section.id}
              className={`p-4 rounded-lg border transition-all duration-200 ${
                section.isComplete
                  ? 'bg-base_200 dark:bg-neutral-800 border-base_300 dark:border-neutral-600'
                  : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 opacity-50'
              }`}
            >
              <div className="flex items-center mb-3">
                {getSectionIcon(section.icon)}
                <h4 className="ml-2 font-semibold text-neutral dark:text-gray-200">
                  {section.title}
                </h4>
                {section.isComplete && (
                  <div className="ml-auto">
                    <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200 rounded-full">
                      ✓ {t('aiResearch.complete', 'Complete')}
                    </span>
                  </div>
                )}
              </div>
              
              {section.content && (
                <div className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                  {section.content}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Status Messages */}
      {!llmService.isAvailable() && (
        <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-md">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            {t('aiResearch.configurationRequired', 'AI company research requires Gemini API configuration.')}
          </p>
        </div>
      )}

      {researchSections.length === 0 && !isResearching && (
        <div className="text-center py-8">
          <SparklesIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            {t('aiResearch.noResearch', 'No company research available yet.')}
          </p>
          <p className="text-sm text-gray-400 dark:text-gray-500">
            {t('aiResearch.clickToStart', 'Click "Start Research" to begin AI-powered company analysis.')}
          </p>
        </div>
      )}
    </GlassCard>
  );
};

export default AICompanyResearch;
