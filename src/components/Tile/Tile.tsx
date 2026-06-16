import React from 'react';

 

type TileProps = {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  className?: string;
  iconBg?: string;
};

 

const Tile: React.FC<TileProps> = ({
  icon,
  title,
  subtitle,
  badge,
  className = 'bg-gradient-to-r from-gray-50 to-gray-100/50 dark:from-gray-700 dark:to-gray-800/50',
  iconBg = 'bg-gradient-to-br from-white to-gray-50 dark:from-gray-600 dark:to-gray-700',
}) => {
  return (
    <li
      className={`group relative rounded-2xl shadow-md hover:shadow-lg p-4 sm:p-5 flex flex-row gap-3 sm:gap-4 items-start transition-all duration-300 hover:scale-[1.02] border border-gray-100/50 dark:border-gray-700/50 backdrop-blur-sm ${className}`}
    >
      {/* Background overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent dark:via-gray-800/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"></div>
      
      {icon && (
        <div
          className={`relative z-10 flex-shrink-0 flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-xl shadow-md group-hover:shadow-lg transition-all duration-300 group-hover:scale-110 ${iconBg}`}
        >
          {icon}
        </div>
      )}
      <div className="relative z-10 flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-2">
          <span className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white group-hover:text-gray-700 dark:group-hover:text-gray-100 transition-colors duration-300 truncate">
            {title}
          </span>
          {badge}
        </div>
        {subtitle && (
          <span className="block text-xs sm:text-sm text-gray-600 dark:text-gray-400 leading-relaxed group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors duration-300 line-clamp-2">
            {subtitle}
          </span>
        )}
      </div>
      
      {/* Subtle glow effect */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10 blur-xl"></div>
    </li>
  );
};

 

export default Tile;