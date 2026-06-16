import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  MessageCircle,
  Clock,
  Activity,
  Globe,
  Smartphone,
  Monitor,
  Tablet,
  Target,
  BarChart3,
  RefreshCw
} from 'lucide-react';
import EnhancedDashboardCard from './EnhancedDashboardCard';
import EnhancedCard from '@/components/ui/enhanced/EnhancedCard';
import EnhancedButton from '@/components/ui/enhanced/EnhancedButton';
import EnhancedBadge from '@/components/ui/enhanced/EnhancedBadge';

interface SessionData {
  id: string;
  sessionId: string;
  visitorId?: string;
  timestamp: string;
  page: string;
  duration: number;
  interactions: number;
  userAgent: string;
  screenSize: string;
  referrer: string;
  chatbotUsed: boolean;
  formSubmitted: boolean;
  satisfaction: 'good' | 'bad';
  isDemoSession: boolean;
  source: 'demo_sessions' | 'leads';
  leadId?: string;
  leadName?: string;
  leadEmail?: string;
  sessionScore?: number;
}

interface RealTimeMetrics {
  activeUsers: number;
  totalSessions: number;
  pageViews: number;
  interactions: number;
  chatbotInteractions: number;
  formSubmissions: number;
  avgSessionDuration: number;
  bounceRate: number;
  conversionRate: number;
  topPages: Array<{ page: string; views: number }>;
  deviceBreakdown: Array<{ device: string; count: number }>;
  trafficSources: Array<{ source: string; count: number }>;
  satisfactionBreakdown: { good: number; bad: number };
  hourlyActivity: Array<{ hour: string; sessions: number }>;
}

const EnhancedSessionDashboard: React.FC = () => {
  const [isLive] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [realTimeMetrics, setRealTimeMetrics] = useState<RealTimeMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh] = useState(true);

  // Fetch real-time data
  const fetchRealTimeData = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://py-mobiloitte.converiqo.ai'}/api/v1/unified-session-analytics/sessions/active`, {
        signal: AbortSignal.timeout(10000)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      const transformedSessions: SessionData[] = data.sessions || [];
      const metrics: RealTimeMetrics = {
        activeUsers: data.realTime?.activeUsers || 0,
        totalSessions: data.realTime?.totalSessions || transformedSessions.length,
        pageViews: data.realTime?.pageViews || transformedSessions.length,
        interactions: data.realTime?.interactions || transformedSessions.reduce((sum, s) => sum + s.interactions, 0),
        chatbotInteractions: data.realTime?.chatbotInteractions || transformedSessions.filter(s => s.chatbotUsed).length,
        formSubmissions: data.realTime?.formSubmissions || transformedSessions.filter(s => s.formSubmitted).length,
        avgSessionDuration: data.realTime?.avgSessionDuration || (transformedSessions.reduce((sum, s) => sum + s.duration, 0) / transformedSessions.length || 0),
        bounceRate: data.realTime?.bounceRate || 0,
        conversionRate: data.realTime?.conversionRate || 0,
        topPages: data.realTime?.topPages || [],
        deviceBreakdown: data.realTime?.deviceBreakdown || [],
        trafficSources: data.realTime?.trafficSources || [],
        satisfactionBreakdown: data.realTime?.satisfactionBreakdown || { good: 0, bad: 0 },
        hourlyActivity: data.realTime?.hourlyActivity || []
      };

      setSessions(transformedSessions);
      setRealTimeMetrics(metrics);
      setLastUpdate(new Date());
      setLoading(false);
    } catch (err) {
      console.error('Error fetching real-time data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
      setLoading(false);
    }
  }, []);

  // Auto-refresh effect
  useEffect(() => {
    if (autoRefresh && isLive) {
      const interval = setInterval(fetchRealTimeData, 3000); // 3 seconds refresh interval
      return () => clearInterval(interval);
    }
  }, [autoRefresh, isLive, fetchRealTimeData]);

  // Initial data fetch
  useEffect(() => {
    fetchRealTimeData();
  }, [fetchRealTimeData]);

  const getDeviceIcon = (device: string) => {
    switch (device.toLowerCase()) {
      case 'mobile':
        return <Smartphone className="w-4 h-4" />;
      case 'tablet':
        return <Tablet className="w-4 h-4" />;
      case 'desktop':
        return <Monitor className="w-4 h-4" />;
      default:
        return <Globe className="w-4 h-4" />;
    }
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  const getSatisfactionColor = (satisfaction: 'good' | 'bad') => {
    return satisfaction === 'good' ? 'success' : 'danger';
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Website Analytics
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Real-time monitoring and analysis of user sessions
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <EnhancedBadge
              variant={isLive ? 'success' : 'default'}
              icon={<Activity className="w-3 h-3" />}
              animated={isLive}
            >
              {isLive ? 'Live' : 'Paused'}
            </EnhancedBadge>
            <EnhancedButton
              variant="outline"
              size="sm"
              startIcon={<RefreshCw className="w-4 h-4" />}
              onClick={fetchRealTimeData}
              loading={loading}
            >
              Refresh
            </EnhancedButton>
          </div>
        </div>

        {/* Live Data Banner */}
        <AnimatePresence>
          {isLive && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl"
            >
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-sm font-medium text-green-800 dark:text-green-200">
                  Live Data: Connected to backend API. Showing real-time session analytics data.
                </span>
              </div>
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                Last updated: {lastUpdate.toLocaleTimeString()}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Error State */}
      {error && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl"
        >
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-red-500 rounded-full" />
            <span className="text-sm font-medium text-red-800 dark:text-red-200">
              Error: {error}
            </span>
          </div>
        </motion.div>
      )}

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <EnhancedDashboardCard
          title="Active Users"
          value={realTimeMetrics?.activeUsers || 0}
          icon={<Users className="w-6 h-6" />}
          trend={{
            value: 12,
            label: "from last hour",
            type: "up"
          }}
          color="blue"
          loading={loading}
        />

        <EnhancedDashboardCard
          title="Total Chats"
          value={realTimeMetrics?.chatbotInteractions || 0}
          icon={<MessageCircle className="w-6 h-6" />}
          trend={{
            value: 8,
            label: "from last hour",
            type: "up"
          }}
          color="green"
          loading={loading}
        />

        <EnhancedDashboardCard
          title="Avg Response Time"
          value={formatDuration(realTimeMetrics?.avgSessionDuration || 0)}
          icon={<Clock className="w-6 h-6" />}
          trend={{
            value: 5,
            label: "from last hour",
            type: "down"
          }}
          color="yellow"
          loading={loading}
        />

        <EnhancedDashboardCard
          title="Satisfaction"
          value={`${Math.round(((realTimeMetrics?.satisfactionBreakdown?.good || 0) /
            ((realTimeMetrics?.satisfactionBreakdown?.good || 0) + (realTimeMetrics?.satisfactionBreakdown?.bad || 0) || 1)) * 100)}%`}
          icon={<Target className="w-6 h-6" />}
          trend={{
            value: 2,
            label: "from last hour",
            type: "up"
          }}
          color="purple"
          loading={loading}
        />
      </div>

      {/* Detailed Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Total Chats Chart */}
        <EnhancedCard
          title="Total Chats"
          subtitle="Last 30 days"
          className="h-96"
        >
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">Chart visualization will be here</p>
            </div>
          </div>
        </EnhancedCard>

        {/* Satisfaction Ratings */}
        <EnhancedCard
          title="Satisfaction Ratings"
          subtitle="User feedback analysis"
          className="h-96"
        >
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">Satisfaction chart will be here</p>
            </div>
          </div>
        </EnhancedCard>
      </div>

      {/* Recent Sessions Table */}
      <EnhancedCard
        title="Recent Sessions"
        subtitle="Latest user activity"
        className="mb-8"
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Session ID</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Page</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Duration</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Interactions</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Device</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Satisfaction</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Time</th>
              </tr>
            </thead>
            <tbody>
              {sessions.slice(0, 10).map((session) => (
                <motion.tr
                  key={session.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                >
                  <td className="py-3 px-4 text-sm text-gray-900 dark:text-white font-mono">
                    {session.sessionId.slice(0, 8)}...
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                    {session.page}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                    {formatDuration(session.duration)}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                    {session.interactions}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                    <div className="flex items-center space-x-2">
                      {getDeviceIcon(session.userAgent.includes('Mobile') ? 'mobile' : 'desktop')}
                      <span>{session.userAgent.includes('Mobile') ? 'Mobile' : 'Desktop'}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <EnhancedBadge
                      variant={getSatisfactionColor(session.satisfaction)}
                      size="sm"
                    >
                      {session.satisfaction}
                    </EnhancedBadge>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-500 dark:text-gray-500">
                    {new Date(session.timestamp).toLocaleTimeString()}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </EnhancedCard>
    </div>
  );
};

export default EnhancedSessionDashboard;
