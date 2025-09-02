import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { JobApplication } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { 
  UsersIcon,
  ChatIcon, 
  DocumentTextIcon,
  LockClosedIcon,
  PencilAltIcon,
  ClipboardCheckIcon
} from '../icons/Icons';
import Avatar from '../Avatar';
import { format } from 'date-fns';

interface TeamCollaborationProps {
  application: JobApplication;
  readOnly?: boolean;
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'admin' | 'recruiter' | 'viewer';
  avatar: string;
  title?: string;
  department?: string;
  lastActive?: Date;
  permissions?: {
    canEdit: boolean;
    canDelete: boolean;
    canInvite: boolean;
    canAssignTasks: boolean;
  };
}

interface Comment {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  text: string;
  timestamp: Date;
  isPrivate: boolean;
}

// Mock team members - would come from API in production
const MOCK_TEAM_MEMBERS: TeamMember[] = [
  {
    id: '1',
    name: 'You',
    email: 'you@example.com',
    role: 'owner',
    avatar: 'https://i.pravatar.cc/150?img=1',
    title: 'HR Manager',
    department: 'Human Resources',
    lastActive: new Date(),
    permissions: {
      canEdit: true,
      canDelete: true,
      canInvite: true,
      canAssignTasks: true
    }
  },
  {
    id: '2',
    name: 'Sarah Thompson',
    email: 'sarah@company.com',
    role: 'recruiter',
    avatar: 'https://i.pravatar.cc/150?img=5',
    title: 'Senior Recruiter',
    department: 'Talent Acquisition',
    lastActive: new Date('2025-07-30T15:45:00'),
    permissions: {
      canEdit: true,
      canDelete: false,
      canInvite: true,
      canAssignTasks: true
    }
  },
  {
    id: '3',
    name: 'Michael Chen',
    email: 'michael@company.com',
    role: 'admin',
    avatar: 'https://i.pravatar.cc/150?img=8',
    title: 'Technical Lead',
    department: 'Engineering',
    lastActive: new Date('2025-07-29T10:20:00'),
    permissions: {
      canEdit: true,
      canDelete: false,
      canInvite: false,
      canAssignTasks: true
    }
  },
  {
    id: '4',
    name: 'Emma Rodriguez',
    email: 'emma@company.com',
    role: 'viewer',
    avatar: 'https://i.pravatar.cc/150?img=3',
    title: 'Hiring Manager',
    department: 'Product',
    lastActive: new Date('2025-07-25T14:15:00'),
    permissions: {
      canEdit: false,
      canDelete: false,
      canInvite: false,
      canAssignTasks: false
    }
  }
];

// Mock comments - would come from API in production
const MOCK_COMMENTS: Comment[] = [
  {
    id: '1',
    userId: '2',
    userName: 'Sarah Thompson',
    userAvatar: 'https://i.pravatar.cc/150?img=5',
    text: 'Candidate has a strong portfolio. I recommend proceeding to the next interview round.',
    timestamp: new Date('2025-07-25T14:32:00'),
    isPrivate: false,
  },
  {
    id: '2',
    userId: '3',
    userName: 'Michael Chen',
    userAvatar: 'https://i.pravatar.cc/150?img=8',
    text: 'I\'ve scheduled the technical interview for August 5th with the engineering team.',
    timestamp: new Date('2025-07-27T09:15:00'),
    isPrivate: true,
  }
];

const TeamCollaboration: React.FC<TeamCollaborationProps> = ({ 
  readOnly = false 
}) => {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const [comments, setComments] = useState<Comment[]>(MOCK_COMMENTS);
  // Using teamMembers for display only; setTeamMembers reserved for future edit functionality
  const [teamMembers] = useState<TeamMember[]>(MOCK_TEAM_MEMBERS);
  const [newComment, setNewComment] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [activeTab, setActiveTab] = useState<'comments' | 'tasks' | 'team'>('comments');
  const [isLoading, setIsLoading] = useState(false);
  
  // Note: Permission modal functionality has been temporarily removed
  // Will be reimplemented when the team management feature is completed
  
  // Team permissions functionality has been temporarily removed
  // Will be reimplemented with the complete permissions management system
  
  // Team invitation functionality is implemented directly in the button's onClick handler
  
  // Add a new comment
  const handleAddComment = () => {
    if (!newComment.trim() || !currentUser) return;
    
    setIsLoading(true);
    
    // Simulate API call with delay
    setTimeout(() => {
      const newCommentObj: Comment = {
        id: `new-${Date.now()}`,
        userId: currentUser.uid,
        userName: 'You',
        userAvatar: currentUser.avatarUrl || 'https://i.pravatar.cc/150?img=1',
        text: newComment,
        timestamp: new Date(),
        isPrivate,
      };
      
      setComments([...comments, newCommentObj]);
      setNewComment('');
      setIsPrivate(false);
      setIsLoading(false);
    }, 500);
  };

  return (
    <div className="w-full bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 mb-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200">
          {t('teamCollaboration.title')}
        </h3>
        
        <div className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 px-2 py-1 rounded-full">
          {t('teamCollaboration.enterpriseFeature')}
        </div>
      </div>
      
      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-4">
        <div className="flex -mb-px">
          <button
            onClick={() => setActiveTab('comments')}
            className={`px-4 py-2 text-sm font-medium ${
              activeTab === 'comments'
                ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <div className="flex items-center">
              <ChatIcon className="w-4 h-4 mr-1.5" />
              {t('teamCollaboration.tabs.comments')}
            </div>
          </button>
          
          <button
            onClick={() => setActiveTab('tasks')}
            className={`px-4 py-2 text-sm font-medium ${
              activeTab === 'tasks'
                ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <div className="flex items-center">
              <ClipboardCheckIcon className="w-4 h-4 mr-1.5" />
              {t('teamCollaboration.tabs.tasks')}
            </div>
          </button>
          
          <button
            onClick={() => setActiveTab('team')}
            className={`px-4 py-2 text-sm font-medium ${
              activeTab === 'team'
                ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <div className="flex items-center">
              <UsersIcon className="w-4 h-4 mr-1.5" />
              {t('teamCollaboration.tabs.team')}
            </div>
          </button>
        </div>
      </div>
      
      {/* Comments Tab */}
      {activeTab === 'comments' && (
        <div>
          <div className="space-y-4 mb-4 max-h-60 overflow-y-auto">
            {comments.length === 0 ? (
              <p className="text-center text-gray-500 dark:text-gray-400 py-4">
                {t('teamCollaboration.noComments')}
              </p>
            ) : (
              comments.map(comment => (
                <div
                  key={comment.id}
                  className={`p-3 rounded-lg ${
                    comment.isPrivate
                      ? 'bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/30'
                      : 'bg-gray-50 dark:bg-gray-900/20'
                  }`}
                >
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <Avatar
                        src={comment.userAvatar}
                        alt={comment.userName}
                        size="sm"
                      />
                    </div>
                    
                    <div className="ml-3 flex-grow">
                      <div className="flex justify-between">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {comment.userName}
                          {comment.userId === currentUser?.uid && (
                            <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                              ({t('common.you')})
                            </span>
                          )}
                        </div>
                        
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {format(comment.timestamp, 'MMM d, h:mm a')}
                          {comment.isPrivate && (
                            <span className="ml-2 inline-flex items-center">
                              <LockClosedIcon className="w-3 h-3 mr-0.5" />
                              {t('teamCollaboration.private')}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="mt-1 text-sm text-gray-700 dark:text-gray-300">
                        {comment.text}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          
          {!readOnly && (
            <div>
              <div className="mb-3">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder={t('teamCollaboration.addComment')}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                />
              </div>
              
              <div className="flex justify-between items-center">
                <label className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                  <input
                    type="checkbox"
                    checked={isPrivate}
                    onChange={() => setIsPrivate(!isPrivate)}
                    className="mr-2 h-4 w-4 text-blue-600 border-gray-300 rounded"
                  />
                  <LockClosedIcon className="w-3.5 h-3.5 mr-1" />
                  {t('teamCollaboration.markPrivate')}
                </label>
                
                <button
                  onClick={handleAddComment}
                  disabled={!newComment.trim() || isLoading}
                  className={`px-4 py-2 text-sm font-medium rounded-md flex items-center gap-2
                    bg-blue-600 hover:bg-blue-700 text-white
                    ${(!newComment.trim() || isLoading) ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                >
                  <ChatIcon className="w-4 h-4" />
                  {t('teamCollaboration.submitComment')}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Tasks Tab */}
      {activeTab === 'tasks' && (
        <div className="text-center py-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 mb-3">
            <ClipboardCheckIcon className="w-8 h-8" />
          </div>
          <h4 className="text-lg font-medium text-gray-800 dark:text-white mb-2">
            {t('teamCollaboration.taskManagement')}
          </h4>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs mx-auto mb-4">
            {t('teamCollaboration.taskDescription')}
          </p>
          <button className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700">
            {t('teamCollaboration.upgradeEnterprise')}
          </button>
        </div>
      )}
      
      {/* Team Tab */}
      {activeTab === 'team' && (
        <div>
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('teamCollaboration.teamMembers')}
            </h4>
            {!readOnly && (
              <div className="flex gap-2">
                <button 
                  className="px-3 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/30 flex items-center"
                  onClick={() => alert(t('teamCollaboration.featureComingSoon'))}
                >
                  <PencilAltIcon className="w-3 h-3 mr-1" />
                  {t('common.manage')}
                </button>
                <button 
                  className="px-3 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/30 flex items-center"
                  onClick={() => alert(t('teamCollaboration.featureComingSoon'))}
                >
                  <UsersIcon className="w-3 h-3 mr-1" />
                  {t('teamCollaboration.invite')}
                </button>
              </div>
            )}
          </div>

          {/* Team member cards */}
          <div className="space-y-3 mb-4">
            {teamMembers.map(member => {
              // Calculate how long since last active
              const lastActiveDiff = member.lastActive ? 
                Math.floor((new Date().getTime() - member.lastActive.getTime()) / (1000 * 60 * 60)) : null;
              
              const getLastActiveText = () => {
                if (!lastActiveDiff) return t('common.unknown');
                if (lastActiveDiff === 0) return t('common.justNow');
                if (lastActiveDiff < 24) return t('common.hoursAgo', { count: lastActiveDiff });
                return t('common.daysAgo', { count: Math.floor(lastActiveDiff / 24) });
              };
              
              return (
                <div
                  key={member.id}
                  className="p-3 border border-gray-100 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center">
                      <Avatar
                        src={member.avatar}
                        alt={member.name}
                        size="sm"
                      />
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900 dark:text-white flex items-center">
                          {member.name}
                          {member.id === '1' && (
                            <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                              ({t('common.you')})
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {member.email}
                        </p>
                      </div>
                    </div>
                    
                    <div className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                      {t(`teamCollaboration.roles.${member.role}`)}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                    {member.title && (
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">{t('common.title')}: </span>
                        <span className="text-gray-800 dark:text-gray-200">{member.title}</span>
                      </div>
                    )}
                    {member.department && (
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">{t('common.department')}: </span>
                        <span className="text-gray-800 dark:text-gray-200">{member.department}</span>
                      </div>
                    )}
                    {member.lastActive && (
                      <div className="col-span-2">
                        <span className="text-gray-500 dark:text-gray-400">{t('common.lastActive')}: </span>
                        <span className="text-gray-800 dark:text-gray-200">{getLastActiveText()}</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Permissions indicators - only shown for non-readonly mode */}
                  {!readOnly && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {member.permissions?.canEdit && (
                        <span className="inline-flex items-center rounded-full bg-green-100 dark:bg-green-900/30 px-2 py-0.5 text-xs text-green-700 dark:text-green-300">
                          <DocumentTextIcon className="w-3 h-3 mr-1" />
                          {t('permissions.canEdit')}
                        </span>
                      )}
                      {member.permissions?.canDelete && (
                        <span className="inline-flex items-center rounded-full bg-red-100 dark:bg-red-900/30 px-2 py-0.5 text-xs text-red-700 dark:text-red-300">
                          <LockClosedIcon className="w-3 h-3 mr-1" />
                          {t('permissions.canDelete')}
                        </span>
                      )}
                      {member.permissions?.canInvite && (
                        <span className="inline-flex items-center rounded-full bg-purple-100 dark:bg-purple-900/30 px-2 py-0.5 text-xs text-purple-700 dark:text-purple-300">
                          <UsersIcon className="w-3 h-3 mr-1" />
                          {t('permissions.canInvite')}
                        </span>
                      )}
                      {member.permissions?.canAssignTasks && (
                        <span className="inline-flex items-center rounded-full bg-yellow-100 dark:bg-yellow-900/30 px-2 py-0.5 text-xs text-yellow-700 dark:text-yellow-300">
                          <ClipboardCheckIcon className="w-3 h-3 mr-1" />
                          {t('permissions.canAssignTasks')}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          
          {!readOnly && (
            <div className="flex flex-col gap-3 p-3 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg items-center justify-center bg-gray-50 dark:bg-gray-800/50">
              <UsersIcon className="w-8 h-8 text-blue-500 dark:text-blue-400" />
              <div className="text-center">
                <h5 className="font-medium mb-1 text-gray-800 dark:text-white">{t('teamCollaboration.inviteTeamMembers')}</h5>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">{t('teamCollaboration.inviteDescription')}</p>
              </div>
              <button 
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 flex items-center"
                onClick={() => alert(t('teamCollaboration.featureComingSoon'))}
              >
                <UsersIcon className="w-4 h-4 mr-1.5" />
                {t('teamCollaboration.inviteMembers')}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TeamCollaboration;
