import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { JobApplication } from '../../types';
import { 
  ShareIcon, 
  UserGroupIcon,
  LockClosedIcon,
  GlobeIcon,
  ChartBarIcon,
  UsersIcon,
  BadgeCheckIcon,
  
} from '../icons/Icons';
import { AnimatePresence, motion } from 'framer-motion';
import Avatar from '../Avatar';

interface SocialFeaturesProps {
  application: JobApplication;
  onShareSuccess?: () => void;
}

interface NetworkConnection {
  id: string;
  name: string;
  title: string;
  company: string;
  avatar: string;
  connectionType: 'firstDegree' | 'secondDegree' | 'external';
  status: 'active' | 'open' | 'applied' | 'interviewing' | 'hired';
}

// Mock connections - would be fetched from API in production
const MOCK_CONNECTIONS: NetworkConnection[] = [
  {
    id: '1',
    name: 'Alex Johnson',
    title: 'Senior Developer',
    company: 'Google',
    avatar: 'https://i.pravatar.cc/150?img=11',
    connectionType: 'firstDegree',
    status: 'active'
  },
  {
    id: '2',
    name: 'Jamie Smith',
    title: 'Product Manager',
    company: 'Google',
    avatar: 'https://i.pravatar.cc/150?img=20',
    connectionType: 'secondDegree',
    status: 'hired'
  },
  {
    id: '3',
    name: 'Taylor Reid',
    title: 'UX Designer',
    company: 'Google',
    avatar: 'https://i.pravatar.cc/150?img=32',
    connectionType: 'external',
    status: 'interviewing'
  }
];

// Mock community insights - would come from API in production
const MOCK_COMMUNITY_INSIGHTS = {
  totalApplicants: 123,
  averageTimeToResponse: 12, // days
  averageInterviewCount: 2.5,
  responseRate: 0.45,
};

const SocialFeatures: React.FC<SocialFeaturesProps> = ({ 
  application, 
  onShareSuccess
}) => {
  const { t } = useTranslation();
  const [shareType, setShareType] = useState<'private' | 'anonymous' | 'public'>('anonymous');
  const [isSharing, setIsSharing] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);
  const [showConnections, setShowConnections] = useState(false);
  const [selectedConnections, setSelectedConnections] = useState<string[]>([]);
  
  // Filter connections based on the company
  const relevantConnections = MOCK_CONNECTIONS.filter(
    connection => connection.company.toLowerCase() === (application.company?.name || '').toLowerCase()
  );
  
  const handleShare = () => {
    setIsSharing(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsSharing(false);
      setShareSuccess(true);
      if (onShareSuccess) onShareSuccess();
      
      // Reset success message after 3 seconds
      setTimeout(() => {
        setShareSuccess(false);
      }, 3000);
    }, 1500);
  };
  
  const toggleConnection = (id: string) => {
    if (selectedConnections.includes(id)) {
      setSelectedConnections(selectedConnections.filter(c => c !== id));
    } else {
      setSelectedConnections([...selectedConnections, id]);
    }
  };
  
  const handleConnectionsToggle = () => {
    setShowConnections(!showConnections);
  };

  return (
    <div className="w-full bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 mb-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200">
          {t('social.features.title')}
        </h3>
        
        {relevantConnections.length > 0 && (
          <button
            onClick={handleConnectionsToggle}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full hover:bg-purple-200 dark:hover:bg-purple-800/50"
          >
            <UsersIcon className="w-3.5 h-3.5" />
            {t('social.connections.view')}
            <span className="inline-flex items-center justify-center w-5 h-5 ml-1 text-xs font-medium bg-purple-200 dark:bg-purple-800 text-purple-800 dark:text-purple-200 rounded-full">
              {relevantConnections.length}
            </span>
          </button>
        )}
      </div>
      
      {/* Community Insights */}
      <div className="mb-5 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
        <h4 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2 flex items-center">
          <ChartBarIcon className="w-4 h-4 mr-1.5" />
          {t('social.communityInsights')} - {application.company?.name}
        </h4>
        
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-gray-600 dark:text-gray-400">
              {t('social.insights.totalApplicants')}
            </p>
            <p className="font-semibold text-gray-800 dark:text-gray-200">
              {MOCK_COMMUNITY_INSIGHTS.totalApplicants}
            </p>
          </div>
          
          <div>
            <p className="text-gray-600 dark:text-gray-400">
              {t('social.insights.avgResponseTime')}
            </p>
            <p className="font-semibold text-gray-800 dark:text-gray-200">
              {MOCK_COMMUNITY_INSIGHTS.averageTimeToResponse} {t('common.days')}
            </p>
          </div>
          
          <div>
            <p className="text-gray-600 dark:text-gray-400">
              {t('social.insights.avgInterviews')}
            </p>
            <p className="font-semibold text-gray-800 dark:text-gray-200">
              {MOCK_COMMUNITY_INSIGHTS.averageInterviewCount}
            </p>
          </div>
          
          <div>
            <p className="text-gray-600 dark:text-gray-400">
              {t('social.insights.responseRate')}
            </p>
            <p className="font-semibold text-gray-800 dark:text-gray-200">
              {Math.round(MOCK_COMMUNITY_INSIGHTS.responseRate * 100)}%
            </p>
          </div>
        </div>
      </div>
      
      {/* Share Journey Options */}
      <div className="mb-4">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {t('social.shareJourney')}
        </h4>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => setShareType('private')}
            className={`flex-1 p-3 rounded-lg border text-sm flex items-center justify-center gap-2 ${
              shareType === 'private' 
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' 
                : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30'
            }`}
          >
            <LockClosedIcon className="w-4 h-4" />
            {t('social.shareOptions.private')}
          </button>
          
          <button
            onClick={() => setShareType('anonymous')}
            className={`flex-1 p-3 rounded-lg border text-sm flex items-center justify-center gap-2 ${
              shareType === 'anonymous' 
                ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300' 
                : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30'
            }`}
          >
            <UserGroupIcon className="w-4 h-4" />
            {t('social.shareOptions.anonymous')}
          </button>
          
          <button
            onClick={() => setShareType('public')}
            className={`flex-1 p-3 rounded-lg border text-sm flex items-center justify-center gap-2 ${
              shareType === 'public' 
                ? 'border-green-500 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300' 
                : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30'
            }`}
          >
            <GlobeIcon className="w-4 h-4" />
            {t('social.shareOptions.public')}
          </button>
        </div>
      </div>
      
      {/* Share Message */}
      <div className="mb-4">
        <label htmlFor="shareMessage" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t('social.shareMessage')}
        </label>
        <textarea
          id="shareMessage"
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-sm"
          defaultValue={
            shareType === 'public' 
              ? t('social.templates.public', { company: application.company?.name, role: application.role?.title }) 
              : shareType === 'anonymous'
                ? t('social.templates.anonymous', { company: application.company?.name, role: application.role?.title })
                : t('social.templates.private', { company: application.company?.name, role: application.role?.title })
          }
        />
      </div>
      
      {/* Share Button */}
      <div className="flex justify-end">
        <button
          onClick={handleShare}
          disabled={isSharing}
          className={`px-4 py-2 text-sm font-medium rounded-md flex items-center gap-2
            ${shareType === 'private' ? 'bg-blue-600 hover:bg-blue-700 text-white' : 
             shareType === 'anonymous' ? 'bg-purple-600 hover:bg-purple-700 text-white' :
             'bg-green-600 hover:bg-green-700 text-white'}
            transition-colors duration-150 ease-in-out
            ${isSharing ? 'opacity-70 cursor-not-allowed' : ''}
          `}
        >
          <ShareIcon className="w-4 h-4" />
          {isSharing 
            ? t('social.sharing')
            : shareType === 'private' 
              ? t('social.sharePrivately')
              : shareType === 'anonymous'
                ? t('social.shareAnonymously')
                : t('social.sharePublicly')
          }
        </button>
      </div>
      
      {/* Success message */}
      <AnimatePresence>
        {shareSuccess && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-3 text-sm text-green-600 dark:text-green-400 flex items-center justify-end gap-1.5"
          >
            <BadgeCheckIcon className="w-4 h-4" />
            {t('social.shareSuccess')}
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Connections Modal */}
      <AnimatePresence>
        {showConnections && relevantConnections.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-30 dark:bg-opacity-50 z-40 flex items-center justify-center p-4"
            onClick={() => setShowConnections(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">
                {t('social.connections.titleWithCompany', { company: application.company?.name })}
              </h3>
              
              <div className="space-y-3 mb-4">
                {relevantConnections.map(connection => (
                  <div 
                    key={connection.id}
                    className={`p-3 border rounded-lg flex items-center ${
                      selectedConnections.includes(connection.id) 
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                        : 'border-gray-200 dark:border-gray-700'
                    } cursor-pointer`}
                    onClick={() => toggleConnection(connection.id)}
                  >
                    <div className="flex-shrink-0">
                      <Avatar 
                        src={connection.avatar} 
                        alt={connection.name} 
                        size="md"
                      />
                    </div>
                    
                    <div className="ml-3 flex-grow">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="text-sm font-medium text-gray-800 dark:text-white">
                            {connection.name}
                          </h4>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {connection.title} {t('common.at')} {connection.company}
                          </p>
                        </div>
                        
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          connection.status === 'hired'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                            : connection.status === 'interviewing'
                              ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
                              : connection.status === 'applied'
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                        }`}>
                          {t(`social.status.${connection.status}`)}
                        </span>
                      </div>
                      
                      <div className="flex gap-2 mt-1.5">
                        {connection.connectionType === 'firstDegree' ? (
                          <span className="inline-flex items-center text-xs text-blue-600 dark:text-blue-400">
                            <UsersIcon className="w-3 h-3 mr-1" />
                            {t('social.connections.direct')}
                          </span>
                        ) : connection.connectionType === 'secondDegree' ? (
                          <span className="inline-flex items-center text-xs text-purple-600 dark:text-purple-400">
                            <UsersIcon className="w-3 h-3 mr-1" />
                            {t('social.connections.secondDegree')}
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-xs text-gray-600 dark:text-gray-400">
                            <UsersIcon className="w-3 h-3 mr-1" />
                            {t('social.connections.community')}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex-shrink-0 ml-3">
                      <label className="sr-only" htmlFor={`select-connection-${connection.id}`}>
                        {t('social.connections.selectContact', { name: connection.name })}
                      </label>
                      <input 
                        id={`select-connection-${connection.id}`}
                        type="checkbox" 
                        className="h-5 w-5 text-blue-600 dark:text-blue-500 rounded border-gray-300 dark:border-gray-600 focus:ring-blue-500"
                        checked={selectedConnections.includes(connection.id)}
                        onChange={() => toggleConnection(connection.id)}
                        aria-label={t('social.connections.selectContact', { name: connection.name })}
                      />
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="flex justify-between">
                <button
                  onClick={() => setShowConnections(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md text-sm hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  {t('common.cancel')}
                </button>
                
                <button
                  onClick={() => {
                    // Handle connect action
                    setShowConnections(false);
                    // Show success message
                    setShareSuccess(true);
                    setTimeout(() => setShareSuccess(false), 3000);
                  }}
                  disabled={selectedConnections.length === 0}
                  className={`px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 
                    ${selectedConnections.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                >
                  {t('social.connections.connect', { count: selectedConnections.length })}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SocialFeatures;
