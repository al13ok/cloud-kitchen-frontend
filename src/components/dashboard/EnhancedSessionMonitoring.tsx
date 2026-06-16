'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  Users,
  Eye,
  MousePointer,
  MessageSquare,
  FileText,
  Clock,
  Smartphone,
  Monitor,
  Tablet,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  XCircle,
  Play,
  Pause
} from 'lucide-react';

interface SessionData {
  id: string;
  sessionId: string;
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
  sessionInsights?: Record<string, unknown> | string[];
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

interface EnhancedSessionMonitoringProps {
  className?: string;
}

const EnhancedSessionMonitoring: React.FC<EnhancedSessionMonitoringProps> = ({ className = '' }) => {
  const [isLive, setIsLive] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [realTimeMetrics, setRealTimeMetrics] = useState<RealTimeMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTimeRange] = useState<'1h' | '6h' | '24h' | '7d'>('1h');
  const autoRefresh = true;
  const refreshInterval = 3000; // 3 seconds for real-time response
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch real-time data
  const fetchRealTimeData = async () => {
    try {
      setError(null);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://py-mobiloitte.converiqo.ai'}/api/v1/unified-session-analytics/sessions/active`, {
        signal: AbortSignal.timeout(10000)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // Transform the data to match our interface
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
  };

  // Auto-refresh effect
  useEffect(() => {
    if (autoRefresh && isLive) {
      intervalRef.current = setInterval(fetchRealTimeData, refreshInterval);
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [autoRefresh, isLive, refreshInterval]);

  // Initial data fetch
  useEffect(() => {
    fetchRealTimeData();
  }, [selectedTimeRange]);

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const getDeviceIcon = (userAgent: string) => {
    if (userAgent.includes('Mobile')) return <Smartphone className="h-4 w-4" />;
    if (userAgent.includes('Tablet')) return <Tablet className="h-4 w-4" />;
    return <Monitor className="h-4 w-4" />;
  };

  const getSatisfactionColor = (satisfaction: 'good' | 'bad') => {
    return satisfaction === 'good' ? 'text-green-600' : 'text-red-600';
  };

  const getSatisfactionIcon = (satisfaction: 'good' | 'bad') => {
    return satisfaction === 'good' ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />;
  };

  if (loading) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 ${className}`}>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600 dark:text-gray-300">Loading real-time monitoring...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg ${className}`}>
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Activity className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Real-Time Session Monitoring
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Live analytics and user behavior tracking
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Live Status Indicator */}
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${isLive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {isLive ? 'LIVE' : 'PAUSED'}
              </span>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsLive(!isLive)}
                className={`p-2 rounded-lg transition-colors ${isLive
                  ? 'bg-red-100 text-red-600 hover:bg-red-200'
                  : 'bg-green-100 text-green-600 hover:bg-green-200'
                  }`}
              >
                {isLive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </button>

              <button
                onClick={fetchRealTimeData}
                className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Last Update */}
        <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
          Last updated: {lastUpdate.toLocaleTimeString()}
        </div>
      </div>

      {error && (
        <div className="p-6">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <p className="text-red-800 dark:text-red-200 font-medium">Connection Error</p>
            </div>
            <p className="text-red-700 dark:text-red-300 text-sm mt-1">{error}</p>
            <button
              onClick={fetchRealTimeData}
              className="mt-3 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              Retry Connection
            </button>
          </div>
        </div>
      )}

      {realTimeMetrics && (
        <div className="p-6 space-y-6">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-4 text-white"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm">Active Users</p>
                  <p className="text-2xl font-bold">{realTimeMetrics.activeUsers}</p>
                </div>
                <Users className="h-8 w-8 text-blue-200" />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-4 text-white"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm">Total Sessions</p>
                  <p className="text-2xl font-bold">{realTimeMetrics.totalSessions}</p>
                </div>
                <Activity className="h-8 w-8 text-green-200" />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg p-4 text-white"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm">Page Views</p>
                  <p className="text-2xl font-bold">{realTimeMetrics.pageViews}</p>
                </div>
                <Eye className="h-8 w-8 text-purple-200" />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg p-4 text-white"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-sm">Interactions</p>
                  <p className="text-2xl font-bold">{realTimeMetrics.interactions}</p>
                </div>
                <MousePointer className="h-8 w-8 text-orange-200" />
              </div>
            </motion.div>
          </div>

          {/* Secondary Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <MessageSquare className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Chatbot Interactions</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {realTimeMetrics.chatbotInteractions}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Form Submissions</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {realTimeMetrics.formSubmissions}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Avg. Session Duration</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {formatDuration(realTimeMetrics.avgSessionDuration)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Live Sessions Table */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Live Sessions ({sessions.length})
              </h3>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Real-time</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-600">
                    <th className="text-left py-2 text-gray-600 dark:text-gray-400">Session ID</th>
                    <th className="text-left py-2 text-gray-600 dark:text-gray-400">User</th>
                    <th className="text-left py-2 text-gray-600 dark:text-gray-400">Device</th>
                    <th className="text-left py-2 text-gray-600 dark:text-gray-400">Page</th>
                    <th className="text-left py-2 text-gray-600 dark:text-gray-400">Duration</th>
                    <th className="text-left py-2 text-gray-600 dark:text-gray-400">Interactions</th>
                    <th className="text-left py-2 text-gray-600 dark:text-gray-400">Status</th>
                    <th className="text-left py-2 text-gray-600 dark:text-gray-400">Time</th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence>
                    {sessions.slice(0, 10).map((session, index) => (
                      <motion.tr
                        key={session.sessionId}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ delay: index * 0.05 }}
                        className="border-b border-gray-100 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                      >
                        <td className="py-3">
                          <span className="font-mono text-xs bg-gray-200 dark:bg-gray-600 px-2 py-1 rounded">
                            {session.sessionId.slice(0, 8)}...
                          </span>
                        </td>
                        <td className="py-3">
                          {session.leadName ? (
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">{session.leadName}</p>
                              <p className="text-xs text-gray-500">{session.leadEmail}</p>
                            </div>
                          ) : (
                            <span className="text-gray-500">Anonymous</span>
                          )}
                        </td>
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            {getDeviceIcon(session.userAgent)}
                            <span className="text-xs">{session.screenSize}</span>
                          </div>
                        </td>
                        <td className="py-3">
                          <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
                            {session.page.split('/').pop() || 'Home'}
                          </span>
                        </td>
                        <td className="py-3">
                          <span className="text-xs">{formatDuration(session.duration)}</span>
                        </td>
                        <td className="py-3">
                          <div className="flex items-center gap-1">
                            <MousePointer className="h-3 w-3 text-gray-500" />
                            <span>{session.interactions}</span>
                          </div>
                        </td>
                        <td className="py-3">
                          <div className="flex items-center gap-1">
                            {getSatisfactionIcon(session.satisfaction)}
                            <span className={`text-xs ${getSatisfactionColor(session.satisfaction)}`}>
                              {session.satisfaction}
                            </span>
                          </div>
                        </td>
                        <td className="py-3">
                          <span className="text-xs text-gray-500">{formatTime(session.timestamp)}</span>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          </div>

          {/* Satisfaction Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                Satisfaction Breakdown
              </h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">Good</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    {realTimeMetrics.satisfactionBreakdown.good}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-red-600" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">Bad</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    {realTimeMetrics.satisfactionBreakdown.bad}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                Engagement Metrics
              </h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Bounce Rate</span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    {realTimeMetrics.bounceRate.toFixed(1)}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Conversion Rate</span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    {realTimeMetrics.conversionRate.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedSessionMonitoring;
