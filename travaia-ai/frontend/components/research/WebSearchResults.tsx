// components/research/WebSearchResults.tsx - Enterprise-grade web search result display
import React from 'react';
import { useTranslation } from 'react-i18next';
import { GlassCard } from '../design-system';
import { ExternalLinkIcon, SearchIcon, ShieldCheckIcon, DocumentTextIcon } from '../icons/AdditionalIcons';

interface WebSearchResultsProps {
  results: SearchResult[];
  loading: boolean;
  query: string;
}

export interface SearchResult {
  id: string;
  title: string;
  snippet: string;
  url: string;
  source: string;
  confidence: number;
  timestamp?: string;
}

const WebSearchResults: React.FC<WebSearchResultsProps> = ({ results, loading, query }) => {
  const { t } = useTranslation();
  
  if (loading) {
    return (
      <GlassCard className="mb-6">
        <div className="flex items-center space-x-3 mb-4">
          <SearchIcon className="w-5 h-5 text-blue-500" />
          <h3 className="font-semibold text-lg">{t('researchAssistant.webSearch', 'Web Search')}</h3>
        </div>
        
        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-md">
          <div className="flex items-center">
            <div className="animate-pulse w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
              {t('researchAssistant.searchingWeb', 'Searching the web for insights...')}
            </span>
          </div>
          <p className="mt-2 text-sm text-blue-600 dark:text-blue-400">
            {t('researchAssistant.searchQuery', 'Query')}: "{query}"
          </p>
        </div>
        
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full mb-1"></div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
              <div className="h-2 bg-blue-200 dark:bg-blue-800 rounded w-1/4 mt-2"></div>
            </div>
          ))}
        </div>
      </GlassCard>
    );
  }

  if (results.length === 0) {
    return (
      <GlassCard className="mb-6">
        <div className="flex items-center space-x-3 mb-4">
          <SearchIcon className="w-5 h-5 text-blue-500" />
          <h3 className="font-semibold text-lg">{t('researchAssistant.webSearch', 'Web Search')}</h3>
        </div>
        
        <div className="text-center py-6">
          <SearchIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400 mb-2">
            {t('researchAssistant.noResults', 'No search results found.')}
          </p>
          <p className="text-sm text-gray-400 dark:text-gray-500">
            {t('researchAssistant.tryDifferentQuery', 'Try a different search query or check your internet connection.')}
          </p>
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <SearchIcon className="w-5 h-5 text-blue-500" />
          <h3 className="font-semibold text-lg">{t('researchAssistant.webSearchResults', 'Web Search Results')}</h3>
        </div>
        <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-full">
          {results.length} {t('researchAssistant.sources', 'sources')}
        </span>
      </div>
      
      <div className="mb-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-md">
        <p className="text-sm text-blue-700 dark:text-blue-300 flex items-center">
          <ShieldCheckIcon className="w-4 h-4 mr-1" />
          {t('researchAssistant.searchQuery', 'Query')}: <span className="font-medium ml-1">"{query}"</span>
        </p>
      </div>

      <div className="space-y-4">
        {results.map((result) => (
          <div 
            key={result.id} 
            className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-md dark:hover:shadow-none dark:hover:bg-gray-800/50 transition-all duration-200"
          >
            <div className="flex justify-between items-start">
              <h4 className="font-medium text-base text-blue-600 dark:text-blue-400 mb-1 line-clamp-1">
                {result.title}
              </h4>
              <div className="flex items-center ml-2">
                <span 
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    result.confidence >= 0.8 
                      ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200' 
                      : result.confidence >= 0.5
                        ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {(result.confidence * 100).toFixed(0)}%
                </span>
              </div>
            </div>
            
            <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mb-2">
              <DocumentTextIcon className="w-3 h-3 mr-1" />
              <span className="mr-2">{result.source}</span>
              {result.timestamp && (
                <span>• {result.timestamp}</span>
              )}
            </div>

            <p className="text-sm text-gray-700 dark:text-gray-300 mb-2 line-clamp-3">
              {result.snippet}
            </p>
            
            <div className="flex justify-end">
              <a 
                href={result.url} 
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
              >
                {t('researchAssistant.viewSource', 'View Source')}
                <ExternalLinkIcon className="w-3 h-3 ml-1" />
              </a>
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
        <p className="flex items-center justify-center">
          <ShieldCheckIcon className="w-3 h-3 mr-1" />
          {t('researchAssistant.poweredByGemini', 'Powered by Gemini AI with real-time web search')}
        </p>
      </div>
    </GlassCard>
  );
};

export default WebSearchResults;
