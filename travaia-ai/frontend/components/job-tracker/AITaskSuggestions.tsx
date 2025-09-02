// components/job-tracker/AITaskSuggestions.tsx - AI-Powered Task Suggestions
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ProgressTask } from '../../types';
import { GlassCard, GlassButton } from '../design-system';
import { SparklesIcon, PlusIcon, ClockIcon } from '../icons/Icons';
import { llmService, LLMStreamResponse } from '../../services/llmService';

interface AITaskSuggestionsProps {
  jobTitle: string;
  companyName: string;
  onAddTask: (task: Pick<ProgressTask, 'type' | 'title' | 'description'>) => void;
}

interface AISuggestedTask {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  estimatedTime: string;
  type: 'research_company' | 'prepare_interview' | 'send_thank_you' | 'custom';
  reasoning: string;
}

const AITaskSuggestions: React.FC<AITaskSuggestionsProps> = ({
  jobTitle,
  companyName,
  onAddTask,
}) => {
  const { t } = useTranslation();
  const [suggestedTasks, setSuggestedTasks] = useState<AISuggestedTask[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);

  useEffect(() => {
    if (llmService.isAvailable()) {
      generateAITaskSuggestions();
    } else {
      generateFallbackTasks();
    }
  }, [jobTitle, companyName]);

  const generateAITaskSuggestions = async () => {
    setIsGenerating(true);
    setIsStreaming(true);
    setStreamingContent('');
    setSuggestedTasks([]);

    const streamCallbacks: LLMStreamResponse = {
      onChunk: (chunk: string) => {
        setStreamingContent(prev => prev + chunk);
      },
      onComplete: (fullResponse: string) => {
        setIsStreaming(false);
        parseAIResponse(fullResponse);
        setIsGenerating(false);
      },
      onError: (error: string) => {
        console.error('AI Task Generation Error:', error);
        setIsStreaming(false);
        generateFallbackTasks();
        setIsGenerating(false);
      },
    };

    try {
      const prompt = buildTaskSuggestionPrompt();
      await llmService.generateStreamingResponse({
        systemPrompt: 'You are an expert career coach providing specific, actionable task recommendations for job applications.',
        userPrompt: prompt,
        context: { jobTitle, companyName },
        temperature: 0.7,
      }, streamCallbacks);
    } catch (error) {
      streamCallbacks.onError('Failed to generate AI task suggestions');
    }
  };

  const buildTaskSuggestionPrompt = (): string => {
    return `Based on this job application for ${jobTitle} at ${companyName}, suggest 4-6 specific, actionable tasks.

For each task, provide:
1. Task title (concise, action-oriented)
2. Detailed description (what exactly to do)
3. Priority level (high/medium/low)
4. Estimated time to complete
5. Task type (research_company/prepare_interview/send_thank_you/custom)
6. Brief reasoning (why this task is important now)

Format your response as JSON array:
[
  {
    "title": "Task Title",
    "description": "Detailed description of what to do",
    "priority": "high",
    "estimatedTime": "30 minutes",
    "type": "research_company",
    "reasoning": "Why this task is important for this application"
  }
]

Focus on tasks that are:
- Specific to the current application status
- Actionable and time-bound
- Strategic for advancing the application
- Realistic and achievable`;
  };

  const parseAIResponse = (response: string) => {
    try {
      // Extract JSON from the response
      const jsonMatch = response.match(/[[\s\S]*]/);
      if (!jsonMatch) {
        throw new Error('No JSON array found in response');
      }

      const tasksData = JSON.parse(jsonMatch[0]);
      const parsedTasks: AISuggestedTask[] = tasksData.map((task: any, index: number) => ({
        id: `ai_task_${Date.now()}_${index}`,
        title: task.title || 'Untitled Task',
        description: task.description || 'No description provided',
        priority: task.priority || 'medium',
        estimatedTime: task.estimatedTime || '15 minutes',
        type: task.type || 'custom',
        reasoning: task.reasoning || 'AI-generated recommendation',
      }));

      setSuggestedTasks(parsedTasks);
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      generateFallbackTasks();
    }
  };

  const generateFallbackTasks = () => {
    const fallbackTasks: AISuggestedTask[] = [
      {
        id: 'fallback_1',
        title: t('aiTasks.researchCompany'),
        description: t('aiTasks.researchCompanyDesc'),
        priority: 'high',
        estimatedTime: '30 minutes',
        type: 'research_company',
        reasoning: t('aiTasks.researchReasoning'),
      },
      {
        id: 'fallback_2',
        title: t('aiTasks.prepareInterview'),
        description: t('aiTasks.prepareInterviewDesc'),
        priority: 'high',
        estimatedTime: '45 minutes',
        type: 'prepare_interview',
        reasoning: t('aiTasks.prepareReasoning'),
      },
      {
        id: 'fallback_3',
        title: t('aiTasks.followUp'),
        description: t('aiTasks.followUpDesc'),
        priority: 'medium',
        estimatedTime: '15 minutes',
        type: 'send_thank_you',
        reasoning: t('aiTasks.followUpReasoning'),
      },
    ];

    setSuggestedTasks(fallbackTasks);
  };

  const handleAddTask = (suggestedTask: AISuggestedTask) => {
    onAddTask({
      type: suggestedTask.type,
      title: suggestedTask.title,
      description: suggestedTask.description,
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700';
      case 'medium':
        return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700';
      case 'low':
        return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700';
      default:
        return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-700';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high':
        return '🔥';
      case 'medium':
        return '⚡';
      case 'low':
        return '📝';
      default:
        return '💡';
    }
  };

  return (
    <GlassCard className="p-6 bg-base_100 dark:bg-dark_card_bg border border-base_300 dark:border-neutral-700">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <SparklesIcon className="w-6 h-6 text-purple-500 mr-2" />
          <h3 className="text-xl font-semibold text-primary dark:text-blue-400">
            {t('aiTasks.title', 'AI Task Suggestions')}
          </h3>
          {isGenerating && (
            <div className="ml-3 flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-500"></div>
              <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                {t('aiTasks.generating', 'Generating suggestions...')}
              </span>
            </div>
          )}
        </div>
        
        <GlassButton
          variant="button"
          size="sm"
          onClick={generateAITaskSuggestions}
          disabled={isGenerating}
          className="flex items-center"
        >
          <SparklesIcon className="w-4 h-4 mr-1" />
          {t('aiTasks.regenerate', 'Regenerate')}
        </GlassButton>
      </div>

      {/* Streaming Content Display */}
      {isStreaming && (
        <div className="mb-6 p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-lg">
          <div className="flex items-center mb-2">
            <div className="animate-pulse w-2 h-2 bg-purple-500 rounded-full mr-2"></div>
            <span className="text-sm font-medium text-purple-700 dark:text-purple-300">
              {t('aiTasks.analyzing', 'AI is analyzing your application...')}
            </span>
          </div>
          <div className="text-sm text-purple-600 dark:text-purple-400 whitespace-pre-wrap">
            {streamingContent}
            <span className="inline-block w-2 h-4 bg-purple-500 animate-pulse ml-1"></span>
          </div>
        </div>
      )}

      {/* Task Suggestions */}
      {suggestedTasks.length > 0 && (
        <div className="space-y-4">
          {suggestedTasks.map((task) => (
            <div
              key={task.id}
              className="p-4 rounded-lg border bg-base_200 dark:bg-neutral-800 border-base_300 dark:border-neutral-600 hover:bg-base_300 dark:hover:bg-neutral-700 transition-all duration-200"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    <span className="text-lg mr-2">{getPriorityIcon(task.priority)}</span>
                    <h4 className="font-semibold text-neutral dark:text-gray-200">
                      {task.title}
                    </h4>
                    <span className={`ml-2 px-2 py-1 text-xs font-medium rounded-full border ${getPriorityColor(task.priority)}`}>
                      {task.priority.toUpperCase()}
                    </span>
                  </div>
                  
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    {task.description}
                  </p>
                  
                  <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mb-2">
                    <ClockIcon className="w-3 h-3 mr-1" />
                    <span className="mr-4">{task.estimatedTime}</span>
                    <span className="text-purple-600 dark:text-purple-400">
                      💡 {task.reasoning}
                    </span>
                  </div>
                </div>
                
                <GlassButton
                  variant="button"
                  size="sm"
                  onClick={() => handleAddTask(task)}
                  className="flex items-center ml-4"
                >
                  <PlusIcon className="w-4 h-4 mr-1" />
                  {t('aiTasks.addTask', 'Add Task')}
                </GlassButton>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Status Messages */}
      {!llmService.isAvailable() && (
        <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-md">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            {t('aiTasks.configurationRequired', 'AI task suggestions require Gemini API configuration.')}
          </p>
        </div>
      )}

      {suggestedTasks.length === 0 && !isGenerating && !isStreaming && (
        <div className="text-center py-8">
          <SparklesIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">
            {t('aiTasks.noSuggestions', 'No task suggestions available. Try regenerating.')}
          </p>
        </div>
      )}
    </GlassCard>
  );
};

export default AITaskSuggestions;