import React from 'react';

interface AvatarProps {
  username: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const Avatar: React.FC<AvatarProps> = ({ 
  username, 
  size = 'md', 
  className = '' 
}) => {
  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm', 
    lg: 'w-10 h-10 text-base'
  };

  const getInitials = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  const getAvatarColor = (name: string) => {
    // Generate a consistent color based on the username
    const colors = [
      'bg-purple-500',
      'bg-blue-500', 
      'bg-green-500',
      'bg-yellow-500',
      'bg-red-500',
      'bg-indigo-500',
      'bg-pink-500',
      'bg-gray-500'
    ];
    
    const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[index % colors.length];
  };

  return (
    <div 
      className={`
        ${sizeClasses[size]} 
        ${getAvatarColor(username)}
        ${className}
        rounded-full flex items-center justify-center text-white font-medium
      `}
      title={username}
    >
      {getInitials(username)}
    </div>
  );
};

export default Avatar;
