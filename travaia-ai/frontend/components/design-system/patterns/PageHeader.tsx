import React from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { PageHeaderProps } from '../types/design-system.types';
import sharedStyles from '../../../styles/sharedPageLayout.module.css';
import '../../../styles/glassmorphism-utilities.css';

/**
 * PageHeader - Reusable page header with consistent styling
 * 
 * Features:
 * - User profile picture with fallback
 * - Title and subtitle display
 * - Optional action buttons
 * - Consistent spacing and typography
 * - Theme-aware styling
 */
const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  showUserProfile = true,
  userProfileUrl,
  userName,
  actions,
  className = '',
}) => {
  const { currentUser } = useAuth();

  // Use provided user data or fallback to auth context
  const profileUrl = userProfileUrl || currentUser?.avatarUrl || '/profile_avatar.png';
  const displayName = userName || currentUser?.displayName || 'User';

  return (
    <div className={`${sharedStyles.pageNavbar} ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          {/* User Profile Picture */}
          {showUserProfile && (
            <div className="w-8 h-8 rounded-full overflow-hidden mr-3 flex-shrink-0 border-2 border-primary dark:border-blue-400">
              <img
                src={profileUrl}
                alt={`${displayName} Avatar`}
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = '/profile_avatar.png';
                }}
              />
            </div>
          )}

          {/* Title and Subtitle */}
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-white">
              {title}
            </h1>
            {subtitle && (
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        {actions && (
          <div className="flex items-center space-x-3">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};

export default PageHeader;
