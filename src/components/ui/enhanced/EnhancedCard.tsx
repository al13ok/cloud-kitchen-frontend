import React from 'react';
import { cn } from '@/utils/cn';

interface EnhancedCardProps {
  variant?: 'flat' | 'elevated' | 'outlined';
  size?: 'sm' | 'md' | 'lg';
  interactive?: boolean;
  onClick?: () => void;
  loading?: boolean;
  title?: string;
  subtitle?: string;
  className?: string;
  children: React.ReactNode;
}

const EnhancedCard: React.FC<EnhancedCardProps> = ({
  variant = 'elevated',
  size = 'md',
  interactive = false,
  onClick,
  loading = false,
  title,
  subtitle,
  className,
  children,
}) => {
  const variantClasses = {
    flat: 'bg-white dark:bg-gray-800',
    elevated: 'bg-white dark:bg-gray-800 shadow-md',
    outlined: 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700',
  };

  const sizeClasses = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  return (
    <div
      className={cn(
        'rounded-lg transition-all',
        variantClasses[variant],
        sizeClasses[size],
        interactive && 'cursor-pointer hover:shadow-lg',
        className
      )}
      onClick={onClick}
    >
      {loading ? (
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
        </div>
      ) : (
        <>
          {(title || subtitle) && (
            <div className="mb-4">
              {title && <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>}
              {subtitle && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>}
            </div>
          )}
          {children}
        </>
      )}
    </div>
  );
};

export default EnhancedCard;
