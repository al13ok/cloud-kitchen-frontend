import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, AlertCircle } from 'lucide-react';
import { cn } from '@/utils/cn';

interface EnterpriseDashboardCardProps {
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
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'elevated' | 'outlined' | 'glass';
}

const EnterpriseDashboardCard: React.FC<EnterpriseDashboardCardProps> = ({
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
  size = 'md',
  variant = 'default',
}) => {
  const colorClasses = {
    blue: {
      bg: 'from-blue-500 to-blue-600',
      text: 'text-blue-600',
      light: 'bg-blue-50',
      border: 'border-blue-200',
    },
    green: {
      bg: 'from-green-500 to-green-600',
      text: 'text-green-600',
      light: 'bg-green-50',
      border: 'border-green-200',
    },
    yellow: {
      bg: 'from-yellow-500 to-yellow-600',
      text: 'text-yellow-600',
      light: 'bg-yellow-50',
      border: 'border-yellow-200',
    },
    red: {
      bg: 'from-red-500 to-red-600',
      text: 'text-red-600',
      light: 'bg-red-50',
      border: 'border-red-200',
    },
    purple: {
      bg: 'from-purple-500 to-purple-600',
      text: 'text-purple-600',
      light: 'bg-purple-50',
      border: 'border-purple-200',
    },
    indigo: {
      bg: 'from-indigo-500 to-indigo-600',
      text: 'text-indigo-600',
      light: 'bg-indigo-50',
      border: 'border-indigo-200',
    },
    pink: {
      bg: 'from-pink-500 to-pink-600',
      text: 'text-pink-600',
      light: 'bg-pink-50',
      border: 'border-pink-200',
    },
    gray: {
      bg: 'from-gray-500 to-gray-600',
      text: 'text-gray-600',
      light: 'bg-gray-50',
      border: 'border-gray-200',
    },
  };

  const sizeClasses = {
    sm: {
      card: 'p-4',
      icon: 'w-8 h-8',
      value: 'text-2xl',
      title: 'text-xs',
    },
    md: {
      card: 'p-6',
      icon: 'w-10 h-10',
      value: 'text-3xl',
      title: 'text-sm',
    },
    lg: {
      card: 'p-8',
      icon: 'w-12 h-12',
      value: 'text-4xl',
      title: 'text-base',
    },
  };

  const variantClasses = {
    default: 'enterprise-card',
    elevated: 'enterprise-card-elevated',
    outlined: 'border-2 border-gray-300 bg-transparent',
    glass: 'bg-white/80 backdrop-blur-sm border border-white/20',
  };

  const getTrendIcon = () => {
    if (!trend) return null;
    switch (trend.type) {
      case 'up':
        return <TrendingUp className="w-4 h-4" />;
      case 'down':
        return <TrendingDown className="w-4 h-4" />;
      case 'neutral':
        return <Minus className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const getTrendColor = () => {
    if (!trend) return 'neutral';
    switch (trend.type) {
      case 'up':
        return 'positive';
      case 'down':
        return 'negative';
      case 'neutral':
        return 'neutral';
      default:
        return 'neutral';
    }
  };

  const currentColor = colorClasses[color];
  const currentSize = sizeClasses[size];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn('group', className)}
    >
      <div
        className={cn(
          variantClasses[variant],
          currentSize.card,
          'relative overflow-hidden transition-all duration-200 ease-out',
          onClick && 'cursor-pointer hover:shadow-lg hover:-translate-y-1',
          error && 'border-red-300 bg-red-50'
        )}
        onClick={onClick}
      >
        {/* Gradient Background */}
        <div className={cn(
          'absolute top-0 right-0 w-20 h-20 rounded-full opacity-5',
          `bg-gradient-to-br ${currentColor.bg}`
        )} />
        
        {/* Error State */}
        {error && (
          <div className="absolute top-2 right-2">
            <AlertCircle className="w-4 h-4 text-red-500" />
          </div>
        )}

        {/* Icon */}
        <div className={cn(
          'inline-flex items-center justify-center rounded-xl mb-4',
          `bg-gradient-to-br ${currentColor.bg} text-white`,
          currentSize.icon
        )}>
          {icon}
        </div>

        {/* Content */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className={cn(
              'font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide',
              currentSize.title
            )}>
              {title}
            </h3>
            {trend && (
              <div className={cn(
                'flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
                getTrendColor() === 'positive' && 'bg-green-100 text-green-700',
                getTrendColor() === 'negative' && 'bg-red-100 text-red-700',
                getTrendColor() === 'neutral' && 'bg-gray-100 text-gray-700'
              )}>
                {getTrendIcon()}
                {Math.abs(trend.value)}%
              </div>
            )}
          </div>

          <div className="space-y-1">
            {loading ? (
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            ) : error ? (
              <div className="text-red-500 font-medium">Error loading data</div>
            ) : (
              <div className={cn(
                'font-bold text-gray-900 dark:text-white',
                currentSize.value
              )}>
                {value}
              </div>
            )}
            
            {subtitle && !loading && !error && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {subtitle}
              </p>
            )}
            
            {trend && !loading && !error && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {trend.label}
              </p>
            )}
          </div>
        </div>

        {/* Hover Effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>
    </motion.div>
  );
};

export default EnterpriseDashboardCard;
