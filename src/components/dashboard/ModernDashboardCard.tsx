import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/utils/cn';

interface ModernDashboardCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: {
    value: number;
    label: string;
    type: 'up' | 'down' | 'neutral';
  };
  subtitle?: string;
  loading?: boolean;
  error?: boolean;
  className?: string;
  onClick?: () => void;
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'indigo' | 'pink' | 'gray';
}

const ModernDashboardCard: React.FC<ModernDashboardCardProps> = ({
  title,
  value,
  icon,
  trend,
  subtitle,
  loading = false,
  error = false,
  className = '',
  onClick,
  color = 'blue',
}) => {
  const colorClasses = {
    blue: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      icon: 'bg-blue-500',
      text: 'text-blue-600',
    },
    green: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      icon: 'bg-green-500',
      text: 'text-green-600',
    },
    yellow: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      icon: 'bg-yellow-500',
      text: 'text-yellow-600',
    },
    red: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      icon: 'bg-red-500',
      text: 'text-red-600',
    },
    purple: {
      bg: 'bg-purple-50',
      border: 'border-purple-200',
      icon: 'bg-purple-500',
      text: 'text-purple-600',
    },
    indigo: {
      bg: 'bg-indigo-50',
      border: 'border-indigo-200',
      icon: 'bg-indigo-500',
      text: 'text-indigo-600',
    },
    pink: {
      bg: 'bg-pink-50',
      border: 'border-pink-200',
      icon: 'bg-pink-500',
      text: 'text-pink-600',
    },
    gray: {
      bg: 'bg-gray-50',
      border: 'border-gray-200',
      icon: 'bg-gray-500',
      text: 'text-gray-600',
    },
  };

  const getTrendIcon = () => {
    if (!trend) return null;
    switch (trend.type) {
      case 'up':
        return <TrendingUp className="w-3 h-3" />;
      case 'down':
        return <TrendingDown className="w-3 h-3" />;
      case 'neutral':
        return <Minus className="w-3 h-3" />;
      default:
        return null;
    }
  };

  const getTrendColor = () => {
    if (!trend) return 'text-gray-500';
    switch (trend.type) {
      case 'up':
        return 'text-green-600';
      case 'down':
        return 'text-red-600';
      case 'neutral':
        return 'text-gray-500';
      default:
        return 'text-gray-500';
    }
  };

  const currentColor = colorClasses[color];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn('group', className)}
    >
      <div
        className={cn(
          'relative bg-white rounded-2xl border p-6 h-full flex flex-col',
          'transition-all duration-200 ease-out',
          'hover:shadow-lg hover:-translate-y-1',
          currentColor.border,
          error && 'border-red-300 bg-red-50',
          onClick && 'cursor-pointer'
        )}
        onClick={onClick}
      >
        {/* Header with Icon and Title */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className={cn(
              'p-3 rounded-xl',
              currentColor.icon,
              'text-white'
            )}>
              {icon}
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-600 uppercase tracking-wide">
                {title}
              </h3>
              {subtitle && (
                <p className="text-xs text-gray-500 mt-1">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          
          {/* Trend Badge */}
          {trend && (
            <div className={cn(
              'flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium',
              trend.type === 'up' && 'bg-green-100 text-green-700',
              trend.type === 'down' && 'bg-red-100 text-red-700',
              trend.type === 'neutral' && 'bg-gray-100 text-gray-700'
            )}>
              {getTrendIcon()}
              <span>{trend.value}%</span>
            </div>
          )}
        </div>

        {/* Value */}
        <div className="flex-1 flex items-end">
          {loading ? (
            <div className="h-8 bg-gray-200 rounded animate-pulse w-24" />
          ) : error ? (
            <div className="text-red-500 font-medium text-sm">Error loading data</div>
          ) : (
            <div className="text-3xl font-bold text-gray-900">
              {value}
            </div>
          )}
        </div>

        {/* Trend Label */}
        {trend && !loading && !error && (
          <div className="mt-2">
            <p className={cn('text-xs', getTrendColor())}>
              {trend.label}
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default ModernDashboardCard;
