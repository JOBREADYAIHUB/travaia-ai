import React from 'react';

interface AvatarProps {
  src: string;
  alt?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

/**
 * Avatar component for displaying user profile images
 */
const Avatar: React.FC<AvatarProps> = ({ 
  src, 
  alt = 'User avatar', 
  size = 'md', 
  className = '' 
}) => {
  // Size mapping to TailwindCSS classes
  const sizeClasses = {
    xs: 'w-6 h-6',
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  // Generate classes based on size
  const avatarClasses = `${sizeClasses[size]} rounded-full object-cover border border-gray-200 dark:border-gray-700 ${className}`;

  return (
    <img 
      src={src} 
      alt={alt}
      className={avatarClasses}
      onError={(e) => {
        // Fallback to default avatar if image fails to load
        const target = e.target as HTMLImageElement;
        target.onerror = null;
        target.src = 'https://ui-avatars.com/api/?name=User&background=random';
      }}
    />
  );
};

export default Avatar;
