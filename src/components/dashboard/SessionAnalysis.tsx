'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import Badge from '@/components/ui/badge/Badge';
import {
  Activity,
  Clock,
  Users,
  MousePointer,
  Globe,
  Smartphone,
  Monitor,
  Tablet,
  TrendingUp,
  Eye,
  Calendar,
  BarChart3
} from 'lucide-react';

interface SessionData {
  sessionId: string;
  startTime: string;
  lastActivity: string;
  totalTimeOnSite: number;
  pageViews: number;
  interactions: number;
  referrer: string;
  userAgent: string;
  deviceType: string;
  language: string;
  timezone: string;
  screenResolution: string;
  website: string;
  currentUrl: string;
  detailedPageViews: Array<{
    url: string;
    title: string;
    timestamp: string;
    timeSpent: number;
    scrollDepth: number;
  }>;
  detailedInteractions: Array<{
    type: string;
    element: string;
    timestamp: string;
    data: Record<string, unknown>;
  }>;
}

interface SessionAnalytics {
  totalSessions: number;
  averageSessionDuration: number;
  totalPageViews: number;
  totalInteractions: number;
  deviceBreakdown: {
    desktop: number;
    mobile: number;
    tablet: number;
  };
  topReferrers: Array<{
    referrer: string;
    count: number;
  }>;
  topPages: Array<{
    url: string;
    title: string;
    views: number;
    avgTimeSpent: number;
  }>;
  interactionTypes: Array<{
    type: string;
    count: number;
  }>;
  hourlyActivity: Array<{
    hour: number;
    sessions: number;
  }>;
  engagementLevel: 'low' | 'medium' | 'high';
}

interface SessionAnalysisProps {
  leadId?: string;
  showDetailedView?: boolean;
}

const SessionAnalysis: React.FC<SessionAnalysisProps> = ({
  leadId,
  showDetailedView = false
}) => {
  const [sessionData, setSessionData] = useState<SessionData[]>([]);
  const [analytics, setAnalytics] = useState<SessionAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState('7d');

  useEffect(() => {
    fetchSessionData();
  }, [leadId, selectedTimeRange]);

  const fetchSessionData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Use the updated session analytics endpoint
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://py-mobiloitte.converiqo.ai'}/api/v1/unified-session-analytics/sessions/active`);

      if (!response.ok) {
        throw new Error('Failed to fetch session data');
      }

      const data = await response.json();
      setSessionData(data.sessions || []);
      setAnalytics(data.analytics || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching session data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType.toLowerCase()) {
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

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-center text-red-600">
          <p>Error loading session data: {error}</p>
          <button
            onClick={fetchSessionData}
            className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Activity className="w-6 h-6 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-900">Session Analysis</h2>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedTimeRange}
            onChange={(e) => setSelectedTimeRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="1d">Last 24 hours</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
        </div>
      </div>

      {/* Overview Cards */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Sessions</p>
                <p className="text-2xl font-bold text-gray-900">{analytics.totalSessions}</p>
              </div>
              <Users className="w-8 h-8 text-blue-600" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg. Duration</p>
                <p className="text-2xl font-bold text-gray-900">{formatDuration(analytics.averageSessionDuration)}</p>
              </div>
              <Clock className="w-8 h-8 text-green-600" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Page Views</p>
                <p className="text-2xl font-bold text-gray-900">{analytics.totalPageViews}</p>
              </div>
              <Eye className="w-8 h-8 text-purple-600" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Interactions</p>
                <p className="text-2xl font-bold text-gray-900">{analytics.totalInteractions}</p>
              </div>
              <MousePointer className="w-8 h-8 text-orange-600" />
            </div>
          </Card>
        </div>
      )}

      {/* Device Breakdown */}
      {analytics && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Device Breakdown
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
              <Monitor className="w-6 h-6 text-blue-600" />
              <div>
                <p className="font-medium">Desktop</p>
                <p className="text-2xl font-bold text-blue-600">{analytics.deviceBreakdown.desktop}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
              <Smartphone className="w-6 h-6 text-green-600" />
              <div>
                <p className="font-medium">Mobile</p>
                <p className="text-2xl font-bold text-green-600">{analytics.deviceBreakdown.mobile}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
              <Tablet className="w-6 h-6 text-purple-600" />
              <div>
                <p className="font-medium">Tablet</p>
                <p className="text-2xl font-bold text-purple-600">{analytics.deviceBreakdown.tablet}</p>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Top Pages */}
      {analytics && analytics.topPages.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Top Pages
          </h3>
          <div className="space-y-3">
            {analytics.topPages.slice(0, 5).map((page, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <p className="font-medium text-sm">{page.title}</p>
                  <p className="text-xs text-gray-600 truncate">{page.url}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{page.views} views</p>
                  <p className="text-xs text-gray-600">{formatDuration(page.avgTimeSpent)} avg</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Interaction Types */}
      {analytics && analytics.interactionTypes.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <MousePointer className="w-5 h-5" />
            Interaction Types
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {analytics.interactionTypes.map((interaction, index) => (
              <div key={index} className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="font-semibold text-lg">{interaction.count}</p>
                <p className="text-sm text-gray-600 capitalize">{interaction.type.replace('_', ' ')}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Recent Sessions */}
      {showDetailedView && sessionData.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Recent Sessions
          </h3>
          <div className="space-y-4">
            {sessionData.slice(0, 10).map((session, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getDeviceIcon(session.deviceType)}
                    <span className="font-medium text-sm">{session.deviceType}</span>
                    <Badge color="info" size="sm">
                      {session.language}
                    </Badge>
                  </div>
                  <div className="text-right text-sm text-gray-600">
                    <p>{formatTime(session.startTime)}</p>
                    <p>{formatDuration(session.totalTimeOnSite)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Pages</p>
                    <p className="font-semibold">{session.pageViews}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Interactions</p>
                    <p className="font-semibold">{session.interactions}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Referrer</p>
                    <p className="font-semibold truncate">{session.referrer || 'Direct'}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Resolution</p>
                    <p className="font-semibold">{session.screenResolution}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Engagement Level */}
      {analytics && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Engagement Level
          </h3>
          <div className="flex items-center gap-4">
            <Badge
              color={analytics.engagementLevel === 'high' ? 'success' : analytics.engagementLevel === 'medium' ? 'warning' : 'error'}
              size="md"
            >
              {analytics.engagementLevel.toUpperCase()}
            </Badge>
            <div className="text-sm text-gray-600">
              Based on session duration, page views, and interaction patterns
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default SessionAnalysis;
