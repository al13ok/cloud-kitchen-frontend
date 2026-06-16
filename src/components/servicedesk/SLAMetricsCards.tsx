'use client';
import React from 'react';
import { motion } from 'framer-motion';
import { 
  Activity, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  ArrowUpCircle
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface SLAMetrics {
  total_tickets: number;
  met_sla: number;
  breached_sla: number;
  at_risk: number;
  pending: number;
  compliance_rate: number;
  avg_response_time: number;
  avg_resolution_time: number;
  escalated_tickets_summary?: {
    total_escalated: number;
    by_level: {
      level_1: number;
      level_2: number;
      level_3: number;
      level_4: number;
    };
    by_priority: {
      critical: number;
      high: number;
      medium: number;
      low: number;
    };
    avg_escalation_time_hours: number;
    currently_escalated: number;
  };
}

interface SLAMetricsCardsProps {
  metrics: SLAMetrics;
  loading?: boolean;
}

const formatTime = (minutes: number): string => {
  if (minutes < 60) return `${Math.round(minutes)}m`;
  if (minutes < 1440) return `${Math.round(minutes / 60)}h`;
  return `${Math.round(minutes / 1440)}d`;
};

const MetricCard: React.FC<{
  title: string;
  value: string | number;
  icon: React.ElementType;
  iconBgColor: string;
  iconColor: string;
  textColor: string;
  delay: number;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
}> = ({ 
  title, 
  value, 
  icon: Icon, 
  iconBgColor, 
  iconColor, 
  textColor,
  delay,
  subtitle,
  trend,
  trendValue
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
  >
    <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
              {title}
            </p>
            <p className={`text-3xl font-bold ${textColor}`}>
              {value}
            </p>
            {subtitle && (
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                {subtitle}
              </p>
            )}
            {trend && trendValue && (
              <div className="flex items-center gap-1 mt-2">
                {trend === 'up' ? (
                  <TrendingUp className="w-4 h-4 text-green-600" />
                ) : trend === 'down' ? (
                  <TrendingDown className="w-4 h-4 text-red-600" />
                ) : null}
                <span className={`text-xs font-medium ${
                  trend === 'up' ? 'text-green-600' : 
                  trend === 'down' ? 'text-red-600' : 
                  'text-gray-600'
                }`}>
                  {trendValue}
                </span>
              </div>
            )}
          </div>
          <div className={`w-12 h-12 rounded-full ${iconBgColor} flex items-center justify-center`}>
            <Icon className={`w-6 h-6 ${iconColor}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  </motion.div>
);

export const SLAMetricsCards: React.FC<SLAMetricsCardsProps> = ({ metrics, loading = false }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <Card key={i} className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 mb-2"></div>
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <MetricCard
        title="Total Tickets"
        value={metrics.total_tickets}
        icon={Activity}
        iconBgColor="bg-blue-100 dark:bg-blue-900/30"
        iconColor="text-blue-600 dark:text-blue-400"
        textColor="text-gray-900 dark:text-white"
        delay={0.1}
      />
      
      <MetricCard
        title="SLA Compliance"
        value={`${metrics.compliance_rate.toFixed(1)}%`}
        icon={CheckCircle}
        iconBgColor="bg-green-100 dark:bg-green-900/30"
        iconColor="text-green-600 dark:text-green-400"
        textColor="text-green-600 dark:text-green-400"
        delay={0.2}
        subtitle={`${metrics.met_sla} tickets met SLA`}
      />
      
      <MetricCard
        title="SLA Breached"
        value={metrics.breached_sla}
        icon={XCircle}
        iconBgColor="bg-red-100 dark:bg-red-900/30"
        iconColor="text-red-600 dark:text-red-400"
        textColor="text-red-600 dark:text-red-400"
        delay={0.3}
        subtitle={`${((metrics.breached_sla / metrics.total_tickets) * 100).toFixed(1)}% of total`}
      />
      
      <MetricCard
        title="At Risk"
        value={metrics.at_risk}
        icon={AlertTriangle}
        iconBgColor="bg-yellow-100 dark:bg-yellow-900/30"
        iconColor="text-yellow-600 dark:text-yellow-400"
        textColor="text-yellow-600 dark:text-yellow-400"
        delay={0.4}
        subtitle="Near SLA breach"
      />
      
      <MetricCard
        title="Pending SLA"
        value={metrics.pending}
        icon={Clock}
        iconBgColor="bg-gray-100 dark:bg-gray-700/30"
        iconColor="text-gray-600 dark:text-gray-400"
        textColor="text-gray-900 dark:text-white"
        delay={0.5}
        subtitle="Awaiting resolution"
      />
      
      <MetricCard
        title="Avg Response Time"
        value={formatTime(metrics.avg_response_time)}
        icon={Clock}
        iconBgColor="bg-blue-100 dark:bg-blue-900/30"
        iconColor="text-blue-600 dark:text-blue-400"
        textColor="text-blue-600 dark:text-blue-400"
        delay={0.6}
      />
      
      <MetricCard
        title="Avg Resolution Time"
        value={formatTime(metrics.avg_resolution_time)}
        icon={Clock}
        iconBgColor="bg-indigo-100 dark:bg-indigo-900/30"
        iconColor="text-indigo-600 dark:text-indigo-400"
        textColor="text-indigo-600 dark:text-indigo-400"
        delay={0.7}
      />
      
      <MetricCard
        title="Success Rate"
        value={`${((metrics.met_sla / metrics.total_tickets) * 100).toFixed(1)}%`}
        icon={TrendingUp}
        iconBgColor="bg-emerald-100 dark:bg-emerald-900/30"
        iconColor="text-emerald-600 dark:text-emerald-400"
        textColor="text-emerald-600 dark:text-emerald-400"
        delay={0.8}
      />

      {/* Escalated Tickets Card - Only show if data available */}
      {metrics.escalated_tickets_summary && metrics.escalated_tickets_summary.total_escalated > 0 && (
        <MetricCard
          title="Escalated Tickets"
          value={metrics.escalated_tickets_summary.total_escalated}
          icon={ArrowUpCircle}
          iconBgColor="bg-red-100 dark:bg-red-900/30"
          iconColor="text-red-600 dark:text-red-400"
          textColor="text-red-600 dark:text-red-400"
          delay={0.9}
          subtitle={`${metrics.escalated_tickets_summary.currently_escalated} currently active`}
        />
      )}
    </div>
  );
};

export default SLAMetricsCards;
