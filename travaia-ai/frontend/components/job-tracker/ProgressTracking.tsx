import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { JobApplication } from '../../types';
import { GlassCard, GlassButton, GlassModal } from '../design-system';
import ConfirmationModal from '../common/ConfirmationModal';
import { PlusIcon, CheckIcon, TrashIcon } from '../icons/Icons';

interface ProgressTrackingProps {
  application: JobApplication;
  onUpdateApplication: (updatedApp: JobApplication) => void;
  onNavigateToInterview?: (applicationId: string) => void;
}

interface TaskFormData {
  type: 'research_company' | 'prepare_interview' | 'send_thank_you' | 'custom';
  title: string;
  description: string;
}

const ProgressTracking: React.FC<ProgressTrackingProps> = ({
  application,
  onUpdateApplication,
  onNavigateToInterview,
}) => {
  const { t } = useTranslation();
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  const [taskFormData, setTaskFormData] = useState<TaskFormData>({
    type: 'research_company',
    title: '',
    description: '',
  });

  const progressTasks = application.progressTasks || [];

  const handleAddTask = () => {
    const newTask = {
      id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: taskFormData.type,
      title: taskFormData.title || getDefaultTaskTitle(taskFormData.type),
      description: taskFormData.description,
      completed: false,
      createdAt: new Date().toISOString(),
    };

    const updatedApplication = {
      ...application,
      progressTasks: [...progressTasks, newTask],
    };

    onUpdateApplication(updatedApplication);
    setIsAddTaskModalOpen(false);
    setTaskFormData({
      type: 'research_company',
      title: '',
      description: '',
    });
  };

  const handleToggleTask = (taskId: string) => {
    const updatedTasks = progressTasks.map((task) => {
      if (task.id === taskId) {
        return {
          ...task,
          completed: !task.completed,
          completedAt: !task.completed ? new Date().toISOString() : undefined,
        };
      }
      return task;
    });

    const updatedApplication = {
      ...application,
      progressTasks: updatedTasks,
    };

    onUpdateApplication(updatedApplication);
  };

  const handleDeleteTask = (taskId: string) => {
    const updatedTasks = progressTasks.filter((task) => task.id !== taskId);
    const updatedApplication = {
      ...application,
      progressTasks: updatedTasks,
    };

    onUpdateApplication(updatedApplication);
    setTaskToDelete(null);
  };

  const handleTaskAction = (task: any) => {
    if (task.type === 'prepare_interview' && onNavigateToInterview) {
      onNavigateToInterview(application.id);
    } else if (task.type === 'research_company') {
      // TODO: t('progressTracking.todo.implementAIResearch')
      // This would trigger AI research functionality in production
    }
  };

  const getDefaultTaskTitle = (type: string): string => {
    switch (type) {
      case 'research_company':
        return t('progressTracking.taskTypes.researchCompany');
      case 'prepare_interview':
        return t('progressTracking.taskTypes.prepareInterview');
      case 'send_thank_you':
        return t('progressTracking.taskTypes.sendThankYou');
      default:
        return t('progressTracking.taskTypes.custom');
    }
  };

  const getTaskTypeIcon = (type: string): string => {
    switch (type) {
      case 'research_company':
        return '🔍';
      case 'prepare_interview':
        return '🎤';
      case 'send_thank_you':
        return '✉️';
      default:
        return '📝';
    }
  };

  return (
    <GlassCard className="p-6 bg-base_100 dark:bg-dark_card_bg border border-base_300 dark:border-neutral-700">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-primary dark:text-blue-400">
          {t('progressTracking.title')}
        </h3>
        <GlassButton
          variant="button"
          size="sm"
          onClick={() => setIsAddTaskModalOpen(true)}
          className="flex items-center"
        >
          <PlusIcon className="w-4 h-4 mr-2" />
          {t('progressTracking.addTask')}
        </GlassButton>
      </div>

      {progressTasks.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            {t('progressTracking.noTasks')}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {progressTasks.map((task) => (
            <div
              key={task.id}
              className={`p-4 rounded-lg border transition-all duration-200 ${
                task.completed
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700'
                  : 'bg-base_200 dark:bg-neutral-800 border-base_300 dark:border-neutral-600 hover:bg-base_300 dark:hover:bg-neutral-700'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start flex-1">
                  <button
                    onClick={() => handleToggleTask(task.id)}
                    className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center mr-3 mt-0.5 transition-colors ${
                      task.completed
                        ? 'bg-green-500 border-green-500 text-white'
                        : 'border-gray-300 dark:border-gray-600 hover:border-green-400 dark:hover:border-green-500'
                    }`}
                    aria-label={
                      task.completed
                        ? t('progressTracking.taskIncomplete')
                        : t('progressTracking.taskCompleted')
                    }
                  >
                    {task.completed && <CheckIcon className="w-3 h-3" />}
                  </button>

                  <div className="flex-1">
                    <div className="flex items-center mb-1">
                      <span className="text-lg mr-2">{getTaskTypeIcon(task.type)}</span>
                      <h4
                        className={`font-medium ${
                          task.completed
                            ? 'text-green-700 dark:text-green-300 line-through'
                            : 'text-neutral dark:text-gray-200'
                        }`}
                      >
                        {task.title}
                      </h4>
                    </div>
                    {task.description && (
                      <p
                        className={`text-sm ${
                          task.completed
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-gray-500 dark:text-gray-400'
                        }`}
                      >
                        {task.description}
                      </p>
                    )}
                    {(task.type === 'prepare_interview' || task.type === 'research_company') && (
                      <GlassButton
                        variant="button"
                        size="sm"
                        onClick={() => handleTaskAction(task)}
                        className="mt-2"
                      >
                        {task.type === 'prepare_interview' ? '🎤 Start Interview Prep' : '🔍 Start Research'}
                      </GlassButton>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2 ml-4">
                  <button
                    onClick={() => setTaskToDelete(task.id)}
                    className="p-1 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                    aria-label={t('progressTracking.deleteTask')}
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Task Modal */}
      <GlassModal
        isOpen={isAddTaskModalOpen}
        onClose={() => setIsAddTaskModalOpen(false)}
        title={t('progressTracking.addTaskModal.title')}
      >
        <div className="space-y-4">
          <div>
            <label 
              htmlFor="task-type-select"
              className="block text-sm font-medium text-neutral dark:text-gray-300 mb-2"
            >
              {t('progressTracking.addTaskModal.taskType')}
            </label>
            <select
              id="task-type-select"
              name="taskType"
              value={taskFormData.type}
              onChange={(e) =>
                setTaskFormData({
                  ...taskFormData,
                  type: e.target.value as TaskFormData['type'],
                  title: '', // Reset title when type changes
                })
              }
              className="w-full p-3 rounded-lg border border-base_300 dark:border-neutral-600 bg-base_100 dark:bg-neutral-800 text-neutral dark:text-gray-200 focus:ring-2 focus:ring-primary focus:border-transparent"
              title={t('progressTracking.addTaskModal.taskType')}
              aria-label={t('progressTracking.addTaskModal.taskType')}
            >
              <option value="research_company">{t('progressTracking.taskTypes.researchCompany')}</option>
              <option value="prepare_interview">{t('progressTracking.taskTypes.prepareInterview')}</option>
              <option value="send_thank_you">{t('progressTracking.taskTypes.sendThankYou')}</option>
              <option value="custom">{t('progressTracking.taskTypes.custom')}</option>
            </select>
          </div>

          <div>
            <label 
              htmlFor="task-title"
              className="block text-sm font-medium text-neutral dark:text-gray-300 mb-2"
            >
              {t('progressTracking.addTaskModal.taskTitle')}
            </label>
            <input
              type="text"
              id="task-title"
              name="taskTitle"
              value={taskFormData.title}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTaskFormData({ ...taskFormData, title: e.target.value })}
              placeholder={getDefaultTaskTitle(taskFormData.type)}
              className="w-full p-3 rounded-lg border border-base_300 dark:border-neutral-600 bg-base_100 dark:bg-neutral-800 text-neutral dark:text-gray-200 focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          <div>
            <label 
              htmlFor="task-description"
              className="block text-sm font-medium text-neutral dark:text-gray-300 mb-2"
            >
              {t('progressTracking.addTaskModal.taskDescription')}
            </label>
            <textarea
              id="task-description"
              name="taskDescription"
              value={taskFormData.description}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setTaskFormData({ ...taskFormData, description: e.target.value })}
              placeholder={t('progressTracking.addTaskModal.taskDescriptionPlaceholder')}
              className="w-full p-3 rounded-lg border border-base_300 dark:border-neutral-600 bg-base_100 dark:bg-neutral-800 text-neutral dark:text-gray-200 focus:ring-2 focus:ring-primary focus:border-transparent"
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <GlassButton
              variant="button"
              onClick={() => setIsAddTaskModalOpen(false)}
            >
              {t('progressTracking.addTaskModal.cancel')}
            </GlassButton>
            <GlassButton
              variant="button"
              onClick={handleAddTask}
              disabled={taskFormData.type === 'custom' && !taskFormData.title.trim()}
            >
              {t('progressTracking.addTaskModal.save')}
            </GlassButton>
          </div>
        </div>
      </GlassModal>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!taskToDelete}
        onClose={() => setTaskToDelete(null)}
        onConfirm={() => taskToDelete && handleDeleteTask(taskToDelete)}
        title={t('progressTracking.deleteTask')}
        message={t('progressTracking.confirmDelete')}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
      />
    </GlassCard>
  );
};

export default ProgressTracking;
