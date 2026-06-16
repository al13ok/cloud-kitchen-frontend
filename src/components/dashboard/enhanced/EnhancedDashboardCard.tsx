import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import EnhancedCard from '@/components/ui/enhanced/EnhancedCard';
import EnhancedBadge from '@/components/ui/enhanced/EnhancedBadge';
import { cn } from '@/utils/cn';

interface EnhancedDashboardCardProps {
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
  className?: string;
  onClick?: () => void;
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'indigo' | 'pink' | 'gray';
  size?: 'sm' | 'md' | 'lg';
}

const EnhancedDashboardCard: React.FC<EnhancedDashboardCardProps> = ({
  title,
  value,
  icon,
  trend,
  subtitle,
  loading = false,
  className = '',
  onClick,
  color = 'blue',
  size = 'md',
}) => {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    yellow: 'from-yellow-500 to-yellow-600',
    red: 'from-red-500 to-red-600',
    purple: 'from-purple-500 to-purple-600',
    indigo: 'from-indigo-500 to-indigo-600',
    pink: 'from-pink-500 to-pink-600',
    gray: 'from-gray-500 to-gray-600',
  };

  // const sizeClasses = {
  //   sm: 'p-4',
  //   md: 'p-6',
  //   lg: 'p-8',
  // };

  const iconSizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  };

  const valueSizeClasses = {
    sm: 'text-2xl',
    md: 'text-3xl',
    lg: 'text-4xl',
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
    if (!trend) return 'default';
    switch (trend.type) {
      case 'up':
        return 'success';
      case 'down':
        return 'danger';
      case 'neutral':
        return 'default';
      default:
        return 'default';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn('group', className)}
    >
      <EnhancedCard
        variant="elevated"
        size={size}
        interactive={!!onClick}
        onClick={onClick}
        loading={loading}
        className="relative overflow-hidden"
      >
        {/* Gradient Background */}
        <div className={cn(
          'absolute top-0 right-0 w-20 h-20 rounded-full opacity-10',
          `bg-gradient-to-br ${colorClasses[color]}`
        )} />
        
        {/* Icon with Gradient Background */}
        <div className={cn(
          'inline-flex items-center justify-center rounded-xl mb-4',
          `bg-gradient-to-br ${colorClasses[color]} text-white`,
          iconSizeClasses[size]
        )}>
          {icon}
        </div>

        {/* Content */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {title}
            </h3>
            {trend && (
              <EnhancedBadge
                variant={getTrendColor() as 'default' | 'success' | 'warning' | 'danger' | 'info'}
                size="xs"
                icon={getTrendIcon()}
                className="flex items-center gap-1"
              >
                {Math.abs(trend.value)}%
              </EnhancedBadge>
            )}
          </div>

          <div className="space-y-1">
            <div className={cn(
              'font-bold text-gray-900 dark:text-white',
              valueSizeClasses[size]
            )}>
              {loading ? (
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              ) : (
                value
              )}
            </div>
            
            {subtitle && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {subtitle}
              </p>
            )}
            
            {trend && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {trend.label}
              </p>
            )}
          </div>
        </div>

        {/* Hover Effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </EnhancedCard>
    </motion.div>
  );
};

export default EnhancedDashboardCard;
