"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Clock,
  Eye,
  Activity,
  RefreshCw,
  AlertCircle,
  Search,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  Globe,
  Monitor,
  Smartphone,
  Tablet,
  XCircle,
  Target,
  MousePointer,
  FormInput,
  MessageCircle
} from 'lucide-react';
import Tooltip from '@/components/ui/tooltip/Tooltip';
import { cn } from '@/utils/cn';
import DashboardHeader from '@/components/header/DashboardHeader';


interface SessionData {
  // Basic identification
  visitor_id: string;
  session_id: string;
  session_number: number;
  visitor_total_sessions?: number;
  start_time: string;
  last_activity: string;
  end_time?: string;
  is_active: boolean;

  // Page tracking
  current_page: string;
  current_url: string;
  landing_page_url: string;
  page_views: Array<{
    url: string;
    title: string;
    page_name: string;
    timestamp: string;
    time_spent: number;
    scroll_depth: number;
  }>;
  navigation_path: string[];
  exit_page?: string;

  // Activity tracking
  interactions: Array<{
    type: string;
    element: string;
    timestamp: string;
    page: string;
    data: unknown;
  }>;
  chatbot_events: Array<{
    type: string;
    event_type?: string;
    timestamp: string;
    message: string;
    data: unknown;
  }>;
  form_interactions: Array<{
    type: string;
    element: string;
    timestamp: string;
    action: string;
    form_id: string;
    field_name: string;
    data: unknown;
  }>;
  custom_events: Array<{
    type: string;
    timestamp: string;
    name: string;
    data: unknown;
  }>;

  // Time tracking
  total_time_on_site: number;
  time_on_page: number;
  active_time: number;
  idle_time: number;

  // Device and browser info
  device_type: string;
  browser_info: {
    name: string;
    version: string;
  };
  operating_system: {
    name: string;
    version: string;
  };
  screen_resolution: string;
  language: string;
  timezone: string;

  // Network and location
  ip_address?: string;
  geo_location?: {
    country: string;
    city: string;
    region: string;
  };
  referrer: string;
  user_agent: string;

  // Marketing tracking
  utm_parameters: {
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    utm_term?: string;
    utm_content?: string;
  };
  traffic_channel: string;

  // User behavior
  scroll_depth: number;
  is_returning_user: boolean;
  session_replay_id?: string;

  // Lead and conversion tracking
  lead_captured?: {
    lead_id: string;
    form_data: Record<string, unknown>;
    timestamp: string;
    name: string;
    email: string;
    phone: string;
    page: string;
  };
  conversion_timestamp?: string;
  session_to_lead_mapping?: string;

  // Additional metadata
  website: string;
  is_demo_session: boolean;
}

interface HistoricalMetrics {
  total_sessions: number;
  total_visitors: number;
  total_page_views: number;
  avg_session_duration: number;
  bounce_rate: number;
  conversion_rate: number;
  sessions_by_hour: Array<{
    hour: string;
    count: number;
  }>;
  top_pages: Array<{
    page: string;
    views: number;
    unique_visitors: number;
  }>;
}

const SessionHistory = () => {
  // API Configuration - Use environment variables
  const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "https://py-mobiloitte.converiqo.ai";
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [historicalMetrics, setHistoricalMetrics] = useState<HistoricalMetrics | null>(null);
  const [, setAllSessionsForMetrics] = useState<SessionData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [totalSessions, setTotalSessions] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSession, setSelectedSession] = useState<SessionData | null>(null);
  const [showSessionDetails, setShowSessionDetails] = useState(false);
  const [sortBy, setSortBy] = useState<'start_time' | 'duration' | 'page_views' | 'interactions'>('start_time');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  interface VisitorStatistics {
    [key: string]: unknown;
  }
  const [visitorStatistics, setVisitorStatistics] = useState<VisitorStatistics | null>(null);

  // Fetch ALL sessions for metrics calculation (not paginated)
  const fetchAllSessionsForMetrics = useCallback(async () => {
    try {
      // Fetch all sessions with a very large limit to get all sessions for metrics
      const response = await fetch(`${BACKEND_URL}/api/v1/unified-session-analytics/sessions/all?skip=0&limit=10000&sort_by=start_time&sort_order=-1`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(10000)
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();

      if (data.status === 'success') {
        setAllSessionsForMetrics(data.data || []);
        // Calculate metrics from ALL sessions
        const metrics = calculateHistoricalMetrics(data.data || []);
        setHistoricalMetrics(metrics);
      }
    } catch (err) {
      console.error('Error fetching all sessions for metrics:', err);
      // If this fails, metrics will use the total count from pagination
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Map frontend sort fields to backend field names
  const mapSortField = (field: string): string => {
    const fieldMap: Record<string, string> = {
      'start_time': 'start_time',
      'duration': 'total_time_on_site',
      'page_views': 'page_views',
      'interactions': 'interactions'
    };
    return fieldMap[field] || field;
  };

  // Fetch historical data with pagination and search
  const fetchHistoricalData = useCallback(async (page: number = currentPage, reset: boolean = false, searchQuery: string = '') => {
    try {
      if (reset || page === 1) {
        setIsLoading(true);
      } else {
        setIsRefreshing(true);
      }
      setError(null);

      // Calculate skip for pagination
      const skip = (page - 1) * itemsPerPage;
      const sortOrderInt = sortOrder === 'desc' ? -1 : 1;

      // Map sort field to backend field name
      const backendSortField = mapSortField(sortBy);

      // Build query parameters
      const params = new URLSearchParams({
        skip: skip.toString(),
        limit: itemsPerPage.toString(),
        sort_by: backendSortField,
        sort_order: sortOrderInt.toString()
      });

      // Add search query if provided
      if (searchQuery && searchQuery.trim()) {
        params.append('search', searchQuery.trim());
      }

      // Use the new endpoint that returns ALL sessions with pagination
      const response = await fetch(`${BACKEND_URL}/api/v1/unified-session-analytics/sessions/all?${params.toString()}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(10000)
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();

      if (data.status === 'success') {
        // Always replace sessions when fetching new page
        setSessions(data.data);

        // Update pagination state
        setTotalSessions(data.total || 0);
        setHasMore(data.has_more || false);

        // Store visitor statistics if available
        if (data.visitor_statistics) {
          setVisitorStatistics(data.visitor_statistics);
        }
      }

      setLastUpdated(new Date());

    } catch (err) {
      console.error('Error fetching historical data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch historical data');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsPerPage, sortBy, sortOrder]);

  const calculateHistoricalMetrics = (sessionsData: SessionData[]): HistoricalMetrics => {
    const totalSessions = sessionsData.length;
    if (totalSessions === 0) {
      return {
        total_sessions: 0,
        total_visitors: 0,
        total_page_views: 0,
        avg_session_duration: 0,
        bounce_rate: 0,
        conversion_rate: 0,
        sessions_by_hour: Array.from({ length: 24 }, (_, i) => ({
          hour: `${i.toString().padStart(2, '0')}:00`,
          count: 0
        })),
        top_pages: []
      };
    }

    const uniqueVisitors = new Set(sessionsData.map(s => s.visitor_id)).size;
    const totalPageViews = sessionsData.reduce((sum, s) => sum + (Array.isArray(s.page_views) ? s.page_views.length : 0), 0);
    const avgDuration = sessionsData.reduce((sum, s) => sum + (s.total_time_on_site || 0), 0) / totalSessions;

    // Calculate bounce rate (sessions with only 1 page view)
    const bouncedSessions = sessionsData.filter(s => (Array.isArray(s.page_views) ? s.page_views.length : 0) === 1).length;
    const bounceRate = (bouncedSessions / totalSessions) * 100;

    // Group sessions by hour


    // Sessions by hour (keeping for other charts)
    const sessionsByHour = Array.from({ length: 24 }, (_, i) => ({
      hour: `${i.toString().padStart(2, '0')}:00`,
      count: 0
    }));

    sessionsData.forEach(session => {
      const hour = new Date(session.start_time).getHours();
      sessionsByHour[hour].count++;
    });


    // Top pages
    const pageCounts = sessionsData.reduce((acc, s) => {
      if (Array.isArray(s.page_views)) {
        s.page_views.forEach(pv => {
          const pageName = pv.page_name || pv.title || 'Unknown Page';
          acc[pageName] = (acc[pageName] || { views: 0, visitors: new Set() });
          acc[pageName].views++;
          acc[pageName].visitors.add(s.visitor_id);
        });
      }
      return acc;
    }, {} as Record<string, { views: number; visitors: Set<string> }>);

    const topPages = Object.entries(pageCounts)
      .map(([page, data]) => ({
        page,
        views: data.views,
        unique_visitors: data.visitors.size
      }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 10);


    return {
      total_sessions: totalSessions,
      total_visitors: uniqueVisitors,
      total_page_views: totalPageViews,
      avg_session_duration: avgDuration,
      bounce_rate: bounceRate,
      conversion_rate: 0, // Would need conversion data
      sessions_by_hour: sessionsByHour,
      top_pages: topPages
    };
  };

  // Fetch all sessions for metrics on initial load
  useEffect(() => {
    fetchAllSessionsForMetrics();
  }, [fetchAllSessionsForMetrics]);

  // Debounce search term for real-time filtering
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300); // 300ms debounce for real-time search

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Initial data fetch and refetch when sort or search changes
  useEffect(() => {
    setCurrentPage(1); // Reset to first page when filters change
    fetchHistoricalData(1, true, debouncedSearchTerm);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortBy, sortOrder, debouncedSearchTerm]); // Refetch when sort or search changes

  // Handle page change
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    fetchHistoricalData(newPage, true, debouncedSearchTerm);
  };

  // Client-side sorting as fallback/ensurance (in case backend doesn't sort properly)
  const displaySessions = React.useMemo(() => {
    if (!sessions || sessions.length === 0) return sessions;

    // Create a sorted copy
    const sorted = [...sessions].sort((a, b) => {
      let aValue: unknown;
      let bValue: unknown;

      switch (sortBy) {
        case 'start_time':
          aValue = new Date(a.start_time).getTime();
          bValue = new Date(b.start_time).getTime();
          break;
        case 'duration':
          aValue = a.total_time_on_site || 0;
          bValue = b.total_time_on_site || 0;
          break;
        case 'page_views':
          aValue = Array.isArray(a.page_views) ? a.page_views.length : 0;
          bValue = Array.isArray(b.page_views) ? b.page_views.length : 0;
          break;
        case 'interactions':
          aValue = Array.isArray(a.interactions) ? a.interactions.length : 0;
          bValue = Array.isArray(b.interactions) ? b.interactions.length : 0;
          break;
        default:
          return 0;
      }

      const aVal = typeof aValue === 'number' ? aValue : (typeof aValue === 'string' ? parseFloat(aValue) || 0 : 0);
      const bVal = typeof bValue === 'number' ? bValue : (typeof bValue === 'string' ? parseFloat(bValue) || 0 : 0);
      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      } else {
        return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
      }
    });

    return sorted;
  }, [sessions, sortBy, sortOrder]);

  // Pagination - use server-side paginated sessions
  const totalPages = Math.ceil(totalSessions / itemsPerPage);

  const formatDuration = (timeValue: number) => {
    if (!timeValue || timeValue === 0) return '0s';

    // Backend stores total_time_on_site in seconds according to the API model
    // However, the tracker may have incorrectly added milliseconds in some places
    // Detect and convert mixed units:
    let seconds = timeValue;

    // If value is > 7200 (2 hours) but < 86400 (24 hours), it might be milliseconds
    // If value > 86400, it's definitely in milliseconds or incorrectly stored
    // Typical session durations are less than a few hours, so values > 7200 seconds
    // are suspicious and likely need conversion

    // If value > 2 hours in seconds (7200), check if it makes more sense as milliseconds
    // 756 seconds = 12.6 minutes (reasonable)
    // 756000 milliseconds = 756 seconds = 12.6 minutes (reasonable after conversion)
    // 756 minutes displayed suggests the value was incorrectly stored

    // If the value is greater than 1 hour (3600 seconds) but less than a day,
    // and when divided by 1000 gives a reasonable duration (< 2 hours), treat as milliseconds
    if (timeValue > 3600 && timeValue < 86400000) {
      const convertedSeconds = Math.floor(timeValue / 1000);
      // If converted value is more reasonable (< 2 hours = 7200 seconds), use it
      if (convertedSeconds < 7200) {
        seconds = convertedSeconds;
      } else if (timeValue > 86400) {
        // If original is > 24 hours in seconds, definitely treat as milliseconds
        seconds = Math.floor(timeValue / 1000);
      }
    } else if (timeValue > 86400) {
      // Values > 24 hours are almost certainly in milliseconds
      seconds = Math.floor(timeValue / 1000);
    }

    // Safety check: if result is still unreasonably large (> 24 hours), cap it
    if (seconds > 86400) {
      seconds = 86400; // Cap at 24 hours
    }

    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString();
  };

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType.toLowerCase()) {
      case 'mobile':
        return <Smartphone className="h-4 w-4" />;
      case 'tablet':
        return <Tablet className="h-4 w-4" />;
      default:
        return <Monitor className="h-4 w-4" />;
    }
  };

  // Check if session is actually active based on last activity
  const isSessionActive = (session: SessionData) => {
    if (!session.last_activity) return false;

    const lastActivity = new Date(session.last_activity);
    const now = new Date();
    const timeDiff = (now.getTime() - lastActivity.getTime()) / 1000; // seconds

    // Consider session inactive if no activity for more than 5 minutes
    return timeDiff < 300; // 5 minutes
  };

  const getStatusIcon = (isActive: boolean) => {
    if (isActive) {
      return <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>;
    } else {
      return <div className="w-2 h-2 bg-gray-400 rounded-full"></div>;
    }
  };


  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading session history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-3 sm:p-4 lg:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <DashboardHeader
            variant="default"
            size="lg"
            title="Session History"
            subtitle="Historical session data and analytics"
            hideTenantPrefix
            breadcrumbs={[
              { label: 'Home', href: '/' },
              { label: 'Session History', href: '/session-history' }
            ]}
            icon={({ className, ...props }) => (
              <svg
                {...props}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`w-6 h-6 sm:w-8 sm:h-8 text-white ${className ?? ''}`}
              >
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
            actions={
              <div className="flex items-center gap-3 text-white/80">
                {lastUpdated && (
                  <span className="flex items-center text-xs sm:text-sm">
                    <Clock className="w-4 h-4 mr-1" />
                    {lastUpdated.toLocaleTimeString()}
                  </span>
                )}
                <button
                  onClick={() => fetchHistoricalData(currentPage, true, debouncedSearchTerm)}
                  disabled={isRefreshing}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/15 text-white text-xs sm:text-sm font-semibold hover:bg-white/25 transition-colors disabled:opacity-60"
                >
                  <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>
            }
          />
        </div>

        {/* Error State */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
          >
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-500 dark:text-red-400 mr-2" />
              <span className="text-red-700 dark:text-red-300">{error}</span>
            </div>
          </motion.div>
        )}

        {/* Historical Metrics */}
        {historicalMetrics && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
            {/* Total Sessions Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-xl border border-gray-200/60 dark:border-gray-700/60 p-4 sm:p-6 relative overflow-hidden cursor-pointer transition-transform duration-300 ease-in-out"
            >
              <div className="flex items-start justify-between mb-3 sm:mb-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg">
                  <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
              </div>
              <div className="mt-3 sm:mt-4">
                <p className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-1 sm:mb-2">{totalSessions || historicalMetrics.total_sessions}</p>
                <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">Total Sessions</p>
              </div>
            </motion.div>

            {/* Unique Visitors Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-xl border border-gray-200/60 dark:border-gray-700/60 p-4 sm:p-6 relative overflow-hidden cursor-pointer transition-transform duration-300 ease-in-out"
            >
              <div className="flex items-start justify-between mb-3 sm:mb-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg">
                  <Users className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
              </div>
              <div className="mt-3 sm:mt-4">
                <p className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-1 sm:mb-2">
                  {String(visitorStatistics?.total_visitors || historicalMetrics.total_visitors || 0)}
                </p>
                <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">Unique Visitors</p>
                {visitorStatistics && (
                  <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    <span className="text-green-600 dark:text-green-400">
                      {String(visitorStatistics.returning_visitors || 0)} returning
                    </span>
                    {' • '}
                    <span className="text-blue-600 dark:text-blue-400">
                      {String(visitorStatistics.new_visitors || 0)} new
                    </span>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Page Views Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-xl border border-gray-200/60 dark:border-gray-700/60 p-4 sm:p-6 relative overflow-hidden cursor-pointer transition-transform duration-300 ease-in-out"
            >
              <div className="flex items-start justify-between mb-3 sm:mb-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg">
                  <Eye className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
              </div>
              <div className="mt-3 sm:mt-4">
                <p className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-1 sm:mb-2">{historicalMetrics.total_page_views}</p>
                <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">Page Views</p>
              </div>
            </motion.div>

            {/* Bounce Rate Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-xl border border-gray-200/60 dark:border-gray-700/60 p-4 sm:p-6 relative overflow-hidden cursor-pointer transition-transform duration-300 ease-in-out"
            >
              <div className="flex items-start justify-between mb-3 sm:mb-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg">
                  <Activity className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
              </div>
              <div className="mt-3 sm:mt-4">
                <p className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-1 sm:mb-2">{historicalMetrics.bounce_rate.toFixed(1)}%</p>
                <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">Bounce Rate</p>
              </div>
            </motion.div>
          </div>
        )}


        {/* Sessions Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-xl border border-gray-200/60 dark:border-gray-700/60 mb-6 sm:mb-8 overflow-hidden relative">
          <div className="p-4 sm:p-6 lg:p-8 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 sm:gap-4 mb-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0">
                <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">All Sessions</h2>
                <p className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm mt-1">Historical session data and analytics</p>
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:gap-4 mt-4">
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 sm:space-x-0">
                {/* Search */}
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search sessions..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Sort */}
                <select
                  value={`${sortBy}-${sortOrder}`}
                  onChange={(e) => {
                    const [field, order] = e.target.value.split('-');
                    setSortBy(field as 'start_time' | 'duration' | 'page_views' | 'interactions');
                    setSortOrder(order as 'asc' | 'desc');
                  }}
                  className="px-3 sm:px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="start_time-desc">Newest First</option>
                  <option value="start_time-asc">Oldest First</option>
                  <option value="duration-desc">Longest Duration</option>
                  <option value="duration-asc">Shortest Duration</option>
                  <option value="page_views-desc">Most Page Views</option>
                  <option value="interactions-desc">Most Interactions</option>
                </select>
              </div>
            </div>
          </div>

          {displaySessions.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-gray-400 dark:text-gray-500" />
              </div>
              <p className="text-gray-500 dark:text-gray-400">No sessions found</p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Visitor
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Start Time
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Duration
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Device
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Page Views
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {displaySessions.map((session, index) => (
                      <motion.tr
                        key={session.session_id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-8 w-8">
                              <div className={`h-8 w-8 rounded-full flex items-center justify-center ${session.is_returning_user
                                ? 'bg-green-100 dark:bg-green-900'
                                : 'bg-blue-100 dark:bg-blue-900'
                                }`}>
                                <span className={`text-sm font-medium ${session.is_returning_user
                                  ? 'text-green-600 dark:text-green-300'
                                  : 'text-blue-600 dark:text-blue-300'
                                  }`}>
                                  {session.visitor_id.slice(0, 2).toUpperCase()}
                                </span>
                              </div>
                            </div>
                            <div className="ml-3">
                              <div className="flex items-center gap-2">
                                <div className="text-sm font-medium text-gray-900 dark:text-white">
                                  Visitor #{Array.from(new Set(sessions.map(s => s.visitor_id))).indexOf(session.visitor_id) + 1}
                                </div>
                                {session.is_returning_user && (
                                  <span className="px-2 py-0.5 text-xs font-medium bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-full">
                                    Returning
                                  </span>
                                )}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                Session #{session.session_number} of {session.visitor_total_sessions || 1}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 dark:text-white">{formatDate(session.start_time)}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">{formatTime(session.start_time)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {formatDuration(session.total_time_on_site)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center text-sm text-gray-900 dark:text-white">
                            {getDeviceIcon(session.device_type)}
                            <span className="ml-2 capitalize">{session.device_type}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {session.page_views.length}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {getStatusIcon(isSessionActive(session))}
                            <span className="ml-2 text-sm text-gray-900 dark:text-white">
                              {isSessionActive(session) ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => {
                              setSelectedSession(session);
                              setShowSessionDetails(true);
                            }}
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                          >
                            View Details
                          </button>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="lg:hidden">
                {/* Column Headers */}
                <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-700/50">
                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">VISITOR</div>
                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">START TIME</div>
                </div>

                {/* Session Cards */}
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {displaySessions.map((session, index) => (
                    <motion.div
                      key={session.session_id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="px-4 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                      onClick={() => {
                        setSelectedSession(session);
                        setShowSessionDetails(true);
                      }}
                    >
                      <div className="flex items-center justify-between">
                        {/* Visitor Column */}
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 ${session.is_returning_user
                            ? 'bg-green-100 dark:bg-green-900'
                            : 'bg-blue-100 dark:bg-blue-900'
                            }`}>
                            <span className={`text-sm font-medium ${session.is_returning_user
                              ? 'text-green-600 dark:text-green-300'
                              : 'text-blue-600 dark:text-blue-300'
                              }`}>
                              {session.visitor_id.slice(0, 2).toUpperCase()}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                Visitor #{Array.from(new Set(sessions.map(s => s.visitor_id))).indexOf(session.visitor_id) + 1}
                              </div>
                              {session.is_returning_user && (
                                <span className="px-2 py-0.5 text-xs font-medium bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-full whitespace-nowrap flex-shrink-0">
                                  Returning
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              Session #{session.session_number} of {session.visitor_total_sessions || 1}
                            </div>
                          </div>
                        </div>

                        {/* Start Time Column */}
                        <div className="text-right flex-shrink-0 ml-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">{formatDate(session.start_time)}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{formatTime(session.start_time)}</div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-4 sm:px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 text-center sm:text-left">
                    Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, totalSessions)} of {totalSessions} sessions
                  </div>
                  <div className="flex items-center space-x-1 sm:space-x-2">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1 || isLoading}
                      className="p-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 text-xs sm:text-sm"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      <span className="hidden sm:inline">Previous</span>
                    </button>
                    <div className="flex items-center gap-1 sm:gap-2">
                      {/* Page number buttons */}
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        return (
                          <button
                            key={pageNum}
                            onClick={() => handlePageChange(pageNum)}
                            disabled={isLoading}
                            className={`px-2 sm:px-3 py-1 text-xs sm:text-sm rounded ${currentPage === pageNum
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                              } disabled:opacity-50 disabled:cursor-not-allowed`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages || isLoading || !hasMore}
                      className="p-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 text-xs sm:text-sm"
                    >
                      <span className="hidden sm:inline">Next</span>
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Professional Session Details Modal */}
        <AnimatePresence>
          {showSessionDetails && selectedSession && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
              onClick={() => setShowSessionDetails(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden"
              >
                {/* Enhanced Header */}
                <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-8 py-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                        <Target className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Session Details</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          Session #{selectedSession.session_number} • {formatDate(selectedSession.start_time)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2" role="status" aria-live="polite">
                        <span
                          className={cn(
                            'inline-flex items-center px-2 py-1 text-xs font-medium rounded-full border',
                            isSessionActive(selectedSession)
                              ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800'
                              : 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700'
                          )}
                          aria-label={isSessionActive(selectedSession) ? 'Active' : 'Inactive'}
                        >
                          <span className={cn('mr-1 inline-block w-1.5 h-1.5 rounded-full', isSessionActive(selectedSession) ? 'bg-green-500' : 'bg-gray-400')} />
                          {isSessionActive(selectedSession) ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <button
                        onClick={() => setShowSessionDetails(false)}
                        className="w-8 h-8 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center transition-colors"
                      >
                        <XCircle className="h-5 w-5 text-gray-500" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Content Area with Proper Spacing */}
                <div className="overflow-y-auto max-h-[calc(90vh-180px)]">
                  <div className="p-8 space-y-8">
                    {/* Session Overview - Card */}
                    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-950 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5">
                      <div className="px-6 pt-5">
                        <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Session Overview</h4>
                      </div>
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 p-6">
                        <div className="text-center p-4 md:p-6 bg-[#1A73E8] rounded-xl shadow-sm text-white">
                          <div className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold mb-1 md:mb-2">#{selectedSession.session_number}</div>
                          <div className="text-[9px] sm:text-[10px] md:text-xs font-medium text-white/90">Session</div>
                        </div>
                        <div className="text-center p-4 md:p-6 bg-[#1A73E8] rounded-xl shadow-sm text-white">
                          <div className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold mb-1 md:mb-2">{formatDuration(selectedSession.total_time_on_site)}</div>
                          <div className="text-[9px] sm:text-[10px] md:text-xs font-medium text-white/90">Duration</div>
                        </div>
                        <div className="text-center p-4 md:p-6 bg-[#1A73E8] rounded-xl shadow-sm text-white">
                          <div className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold mb-1 md:mb-2">{selectedSession.page_views.length}</div>
                          <div className="text-[9px] sm:text-[10px] md:text-xs font-medium text-white/90">Pages</div>
                        </div>
                        <div className="text-center p-4 md:p-6 bg-[#1A73E8] rounded-xl shadow-sm text-white">
                          <div className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold mb-1 md:mb-2">
                            {(() => {
                              const nonChatbotInteractions = (selectedSession.interactions || []).filter(interaction => {
                                const element = String(interaction.element || '').toLowerCase();
                                const type = String(interaction.type || '').toLowerCase();
                                const dataStr = JSON.stringify(interaction.data || {}).toLowerCase();
                                return !element.includes('mobilolite') &&
                                  !element.includes('chatbot') &&
                                  !element.includes('bot-widget') &&
                                  !element.includes('bot_widget') &&
                                  !type.includes('chatbot') &&
                                  !type.includes('bot_') &&
                                  !dataStr.includes('chatbot') &&
                                  !dataStr.includes('bot_widget');
                              });
                              return nonChatbotInteractions.length;
                            })()}
                          </div>
                          <div className="text-[9px] sm:text-[10px] md:text-xs font-medium text-white/90">Interactions</div>
                        </div>
                      </div>
                    </div>

                    {/* Session Information - Card */}
                    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-950 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5">
                      <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800">
                        <h4 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                          <Target className="h-5 w-5 text-gray-700 dark:text-gray-300" />
                          Session Information
                        </h4>
                      </div>
                      <div className="space-y-6 p-6">
                        {/* Visitor Information */}
                        <div>
                          <label className="text-sm font-medium text-gray-500 block mb-2">Visitor Information</label>
                          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-base font-bold text-gray-900">
                                Visitor #{Array.from(new Set(sessions.map(s => s.visitor_id))).indexOf(selectedSession.visitor_id) + 1}
                              </span>
                              {selectedSession.is_returning_user && (
                                <span className="px-2.5 py-1 text-xs font-semibold bg-green-100 text-green-700 rounded-full">
                                  Returning Visitor
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mb-2">
                              <p className="text-xs text-gray-600 font-mono break-all">{selectedSession.visitor_id}</p>
                              <button onClick={() => navigator.clipboard.writeText(selectedSession.visitor_id)} className="px-2 py-0.5 text-[11px] rounded border border-gray-200 hover:bg-gray-50" aria-label="Copy Visitor ID">Copy</button>
                            </div>
                            {selectedSession.visitor_total_sessions && (
                              <p className="text-xs text-gray-500">
                                Total Sessions: {selectedSession.visitor_total_sessions}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Session Number */}
                        <div>
                          <label className="text-sm font-medium text-gray-500 block mb-2">Session Number</label>
                          <p className="text-base font-bold text-gray-900">
                            Session #{selectedSession.session_number}
                            {selectedSession.visitor_total_sessions && selectedSession.visitor_total_sessions > 1 && (
                              <span className="text-gray-500 text-sm font-normal ml-2">
                                (of {selectedSession.visitor_total_sessions})
                              </span>
                            )}
                          </p>
                        </div>

                        {/* Session ID */}
                        <div>
                          <label className="text-sm font-medium text-gray-500 block mb-2">Session ID</label>
                          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 flex items-center gap-2">
                            <p className="text-xs text-gray-600 font-mono break-all flex-1">{selectedSession.session_id}</p>
                            <button onClick={() => navigator.clipboard.writeText(selectedSession.session_id)} className="px-2 py-0.5 text-[11px] rounded border border-gray-200 hover:bg-gray-100" aria-label="Copy Session ID">Copy</button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Device & Browser - Card */}
                    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-950 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5">
                      <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800">
                        <h4 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                          <Monitor className="h-5 w-5 text-gray-700 dark:text-gray-300" />
                          Device & Browser
                        </h4>
                      </div>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-6">
                        <div className="space-y-6">
                          <div>
                            <label className="text-sm font-medium text-gray-500 block mb-2">Device Type</label>
                            <div className="flex items-center gap-2">
                              {getDeviceIcon(selectedSession.device_type)}
                              <span className="text-sm font-medium text-gray-900 capitalize">{selectedSession.device_type}</span>
                            </div>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-500 block mb-2">Screen Resolution</label>
                            <p className="text-sm text-gray-900">{selectedSession.screen_resolution}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-500 block mb-2">Language</label>
                            <p className="text-sm text-gray-900">{selectedSession.language}</p>
                          </div>
                        </div>
                        <div className="space-y-6">
                          <div>
                            <label className="text-sm font-medium text-gray-500 block mb-2">Browser</label>
                            <p className="text-sm text-gray-900">
                              {selectedSession.browser_info?.name || 'Unknown'} {selectedSession.browser_info?.version ? ` ${selectedSession.browser_info.version}` : ''}
                            </p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-500 block mb-2">Operating System</label>
                            <p className="text-sm text-gray-900">{selectedSession.operating_system?.name || 'Unknown'}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-500 block mb-2">Timezone</label>
                            <p className="text-sm text-gray-900">{selectedSession.timezone}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Network & Location Information - Card */}
                    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-950 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5">
                      <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center">
                        <Globe className="h-5 w-5 text-gray-700 dark:text-gray-300" />
                        <h4 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white ml-2">Network & Location Information</h4>
                      </div>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-6">
                        <div className="space-y-6">
                          <div>
                            <label className="text-sm font-medium text-gray-500 block mb-2">IP Address</label>
                            <p className="text-sm text-gray-900 font-mono">{selectedSession.ip_address || 'Not available'}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-500 block mb-2">Current Page</label>
                            <p className="text-sm text-gray-900">{selectedSession.current_page || 'N/A'}</p>
                          </div>
                        </div>
                        <div className="space-y-6">
                          <div>
                            <label className="text-sm font-medium text-gray-500 block mb-2">Referrer</label>
                            {selectedSession.referrer ? (
                              <Tooltip content={selectedSession.referrer}>
                                <a href={selectedSession.referrer} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline truncate inline-block max-w-full">
                                  {selectedSession.referrer}
                                </a>
                              </Tooltip>
                            ) : (
                              <p className="text-sm text-gray-400">Direct</p>
                            )}
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-500 block mb-2">Current URL</label>
                            {selectedSession.current_url ? (
                              <Tooltip content={selectedSession.current_url}>
                                <a href={selectedSession.current_url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline truncate inline-block max-w-full">
                                  {selectedSession.current_url}
                                </a>
                              </Tooltip>
                            ) : (
                              <p className="text-sm text-gray-400">N/A</p>
                            )}
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-500 block mb-2">Landing Page</label>
                            {selectedSession.landing_page_url || selectedSession.current_url ? (
                              <Tooltip content={(selectedSession.landing_page_url || selectedSession.current_url) as string}>
                                <a href={(selectedSession.landing_page_url || selectedSession.current_url) as string} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline truncate inline-block max-w-full">
                                  {selectedSession.landing_page_url || selectedSession.current_url}
                                </a>
                              </Tooltip>
                            ) : (
                              <p className="text-sm text-gray-400">N/A</p>
                            )}
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-500 block mb-2">Website</label>
                            <p className="text-sm text-gray-900">{selectedSession.website || 'N/A'}</p>
                          </div>
                        </div>
                      </div>
                    </div>



                    {/* User Behavior Information - Card */}
                    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-950 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5">
                      <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center">
                        <Activity className="h-5 w-5 text-gray-700 dark:text-gray-300" />
                        <h4 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white ml-2">User Behavior Information</h4>
                      </div>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-6">
                        <div className="space-y-6">
                          <div>
                            <label className="text-sm font-medium text-gray-500 block mb-2">Total Time on Site</label>
                            <p className="text-sm text-gray-900">{formatDuration(selectedSession.total_time_on_site)}</p>
                          </div>



                          <div>
                            <label className="text-sm font-medium text-gray-500 block mb-2">Is Returning User</label>
                            <p className="text-sm text-gray-900">{selectedSession.is_returning_user ? 'Yes' : 'No'}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-500 block mb-2">Session Replay ID</label>
                            <p className="text-sm text-gray-900 font-mono text-xs break-all">{selectedSession.session_replay_id || 'Not available'}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-500 block mb-2">Is Demo Session</label>
                            <p className="text-sm text-gray-900">{selectedSession.is_demo_session ? 'Yes' : 'No'}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Navigation Path - Card */}
                    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-950 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5">
                      <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center">
                        <Globe className="h-5 w-5 text-gray-700 dark:text-gray-300" />
                        <h4 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white ml-2">Navigation Path ({selectedSession.navigation_path?.length || 0} pages)</h4>
                      </div>
                      <div className="space-y-2 max-h-40 overflow-y-auto p-6">
                        {selectedSession.navigation_path?.map((url, index) => (
                          <div key={index} className="flex items-center p-3 bg-gray-50/70 hover:bg-gray-100 dark:bg-gray-800/50 dark:hover:bg-gray-800 rounded-lg transition-colors border border-transparent hover:border-gray-200 dark:hover:border-gray-700">
                            <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                              <span className="text-xs font-medium text-blue-600">{index + 1}</span>
                            </div>
                            <p className="text-sm text-gray-900 break-all">{url}</p>
                          </div>
                        )) || <p className="text-sm text-gray-500">No navigation data available</p>}
                      </div>
                    </div>

                    {/* Page Views - Card */}
                    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-950 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5">
                      <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center">
                        <Eye className="h-5 w-5 text-gray-700 dark:text-gray-300" />
                        <h4 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white ml-2">Page Views ({selectedSession.page_views?.length || 0})</h4>
                      </div>
                      <div className="space-y-2 max-h-40 overflow-y-auto p-6">
                        {selectedSession.page_views?.map((pageView, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-gray-50/70 hover:bg-gray-100 dark:bg-gray-800/50 dark:hover:bg-gray-800 rounded-lg transition-colors border border-transparent hover:border-gray-200 dark:hover:border-gray-700">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900">{pageView.page_name}</p>
                              <p className="text-xs text-gray-500 break-all">{pageView.url}</p>
                              <p className="text-xs text-gray-500">Scroll: {pageView.scroll_depth || 0}%</p>
                            </div>
                            <div className="text-right ml-4">
                              <p className="text-xs text-gray-500">{formatTime(pageView.timestamp)}</p>
                              <p className="text-xs text-gray-500">{formatDuration(pageView.time_spent)}</p>
                            </div>
                          </div>
                        )) || <p className="text-sm text-gray-500">No page view data available</p>}
                      </div>
                    </div>

                    {/* Interactions - Card */}
                    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm hover:shadow-md transition-shadow">
                      <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center">
                        <MousePointer className="h-5 w-5 text-gray-700 dark:text-gray-300" />
                        <h4 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white ml-2">Interactions ({(() => {
                          const nonChatbotInteractions = (selectedSession.interactions || []).filter(interaction => {
                            const element = String(interaction.element || '').toLowerCase();
                            const type = String(interaction.type || '').toLowerCase();
                            const dataStr = JSON.stringify(interaction.data || {}).toLowerCase();
                            // Filter out chatbot-related interactions
                            return !element.includes('mobilolite') &&
                              !element.includes('chatbot') &&
                              !element.includes('bot-widget') &&
                              !element.includes('bot_widget') &&
                              !type.includes('chatbot') &&
                              !type.includes('bot_') &&
                              !dataStr.includes('chatbot') &&
                              !dataStr.includes('bot_widget');
                          });
                          return nonChatbotInteractions.length;
                        })()})</h4>
                      </div>
                      <div className="space-y-2 max-h-40 overflow-y-auto p-6">
                        {(() => {
                          const nonChatbotInteractions = (selectedSession.interactions || []).filter(interaction => {
                            const element = String(interaction.element || '').toLowerCase();
                            const type = String(interaction.type || '').toLowerCase();
                            const dataStr = JSON.stringify(interaction.data || {}).toLowerCase();
                            // Filter out chatbot-related interactions
                            return !element.includes('mobilolite') &&
                              !element.includes('chatbot') &&
                              !element.includes('bot-widget') &&
                              !element.includes('bot_widget') &&
                              !type.includes('chatbot') &&
                              !type.includes('bot_') &&
                              !dataStr.includes('chatbot') &&
                              !dataStr.includes('bot_widget');
                          });
                          return nonChatbotInteractions.length > 0 ? (
                            nonChatbotInteractions.map((interaction, index) => (
                              <div key={index} className="flex items-center justify-between p-3 bg-gray-50/70 hover:bg-gray-100 dark:bg-gray-800/50 dark:hover:bg-gray-800 rounded-lg transition-colors border border-transparent hover:border-gray-200 dark:hover:border-gray-700">
                                <div>
                                  <p className="text-sm font-medium text-gray-900 capitalize">{String(interaction.type || '')}</p>
                                  <p className="text-xs text-gray-500">{String(interaction.element || '')}</p>
                                  {(() => {
                                    if (interaction.data && typeof interaction.data === 'object' && interaction.data !== null && Object.keys(interaction.data).length > 0) {
                                      return <p className="text-xs text-gray-400">Data: {String(JSON.stringify(interaction.data).substring(0, 50))}...</p>;
                                    }
                                    return null;
                                  })()}
                                </div>
                                <p className="text-xs text-gray-500">{formatTime(interaction.timestamp)}</p>
                              </div>
                            ))
                          ) : (
                            <p className="text-sm text-gray-500">No interaction data available</p>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Form Interactions - Card */}
                    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm hover:shadow-md transition-shadow">
                      <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center">
                        <FormInput className="h-5 w-5 text-gray-700 dark:text-gray-300" />
                        <h4 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white ml-2">Form Interactions ({selectedSession.form_interactions?.length || 0})</h4>
                      </div>
                      <div className="space-y-2 max-h-40 overflow-y-auto p-6">
                        {selectedSession.form_interactions?.map((formInteraction, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-gray-50/70 hover:bg-gray-100 dark:bg-gray-800/50 dark:hover:bg-gray-800 rounded-lg transition-colors border border-transparent hover:border-gray-200 dark:hover:border-gray-700">
                            <div>
                              <p className="text-sm font-medium text-gray-900 capitalize">{formInteraction.action}</p>
                              <p className="text-xs text-gray-500">Form: {formInteraction.form_id}</p>
                              {formInteraction.field_name && (
                                <p className="text-xs text-gray-500">Field: {formInteraction.field_name}</p>
                              )}
                            </div>
                            <p className="text-xs text-gray-500">{formatTime(formInteraction.timestamp)}</p>
                          </div>
                        )) || <p className="text-sm text-gray-500">No form interaction data available</p>}
                      </div>
                    </div>

                    {/* Chatbot Events - Card */}
                    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm hover:shadow-md transition-shadow">
                      <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center">
                        <MessageCircle className="h-5 w-5 text-gray-700 dark:text-gray-300" />
                        <h4 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white ml-2">Chatbot Events ({(() => {
                          // Count dedicated chatbot events
                          const chatbotEventsCount = (selectedSession.chatbot_events || []).length;
                          // Count chatbot-related interactions
                          const chatbotInteractions = (selectedSession.interactions || []).filter(interaction => {
                            const element = String(interaction.element || '').toLowerCase();
                            const type = String(interaction.type || '').toLowerCase();
                            const dataStr = JSON.stringify(interaction.data || {}).toLowerCase();
                            // Include chatbot-related interactions
                            return element.includes('mobilolite') ||
                              element.includes('chatbot') ||
                              element.includes('bot-widget') ||
                              element.includes('bot_widget') ||
                              type.includes('chatbot') ||
                              type.includes('bot_') ||
                              dataStr.includes('chatbot') ||
                              dataStr.includes('bot_widget');
                          }).length;
                          return chatbotEventsCount + chatbotInteractions;
                        })()})</h4>
                      </div>
                      <div className="space-y-2 max-h-40 overflow-y-auto p-6">
                        {(() => {
                          // Get dedicated chatbot events
                          const chatbotEvents = (selectedSession.chatbot_events || []).map(event => {
                            const eventAny = event as { event_type?: string; type?: string;[key: string]: unknown };
                            return {
                              ...event,
                              event_type: eventAny.event_type || event.type || 'Chatbot Event',
                              type: event.type || eventAny.event_type || 'Chatbot Event',
                              isDedicatedEvent: true
                            };
                          });

                          // Get chatbot-related interactions
                          const chatbotInteractions = (selectedSession.interactions || []).filter(interaction => {
                            const element = String(interaction.element || '').toLowerCase();
                            const type = String(interaction.type || '').toLowerCase();
                            const dataStr = JSON.stringify(interaction.data || {}).toLowerCase();
                            // Include chatbot-related interactions
                            return element.includes('mobilolite') ||
                              element.includes('chatbot') ||
                              element.includes('bot-widget') ||
                              element.includes('bot_widget') ||
                              type.includes('chatbot') ||
                              type.includes('bot_') ||
                              dataStr.includes('chatbot') ||
                              dataStr.includes('bot_widget');
                          }).map(interaction => ({
                            type: interaction.type || 'Chatbot Interaction',
                            event_type: interaction.type || 'Chatbot Interaction',
                            timestamp: interaction.timestamp,
                            message: interaction.element || interaction.type || 'Chatbot interaction',
                            data: interaction.data,
                            isDedicatedEvent: false
                          } as SessionData['chatbot_events'][0]));

                          const allChatbotEvents = [...chatbotEvents, ...chatbotInteractions].sort((a, b) =>
                            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
                          );

                          return allChatbotEvents.length > 0 ? (
                            allChatbotEvents.map((event, index) => (
                              <div key={index} className="flex items-center justify-between p-3 bg-gray-50/70 hover:bg-gray-100 dark:bg-gray-800/50 dark:hover:bg-gray-800 rounded-lg transition-colors border border-transparent hover:border-gray-200 dark:hover:border-gray-700">
                                <div>
                                  <p className="text-sm font-medium text-gray-900 capitalize">
                                    {event.event_type || event.type || 'Chatbot Event'}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {String(event.message || (event.data && typeof event.data === 'object' ? JSON.stringify(event.data).substring(0, 100) : String(event.data || 'No message')))}
                                  </p>
                                  {(() => {
                                    const eventData = event.data;
                                    const isDedicated = (event as { isDedicatedEvent?: boolean }).isDedicatedEvent;
                                    if (eventData && typeof eventData === 'object' && eventData !== null && Object.keys(eventData).length > 0 && !isDedicated) {
                                      return <p className="text-xs text-gray-400">Element: {String((eventData as { element?: string }).element || JSON.stringify(eventData).substring(0, 50))}</p>;
                                    }
                                    return null;
                                  })()}
                                </div>
                                <p className="text-xs text-gray-500">{formatTime(event.timestamp)}</p>
                              </div>
                            ))
                          ) : (
                            <p className="text-sm text-gray-500">No chatbot event data available</p>
                          );
                        })()}
                      </div>
                    </div>



                    {/* Lead Capture Information */}
                    {selectedSession.lead_captured && (
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                          <Target className="h-5 w-5 mr-2" />
                          Lead Capture Information
                        </h4>
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                          <div>
                            <label className="text-sm font-medium text-gray-500">Name</label>
                            <p className="text-sm text-gray-900">{selectedSession.lead_captured.name || 'Not provided'}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-500">Email</label>
                            <p className="text-sm text-gray-900">{selectedSession.lead_captured.email || 'Not provided'}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-500">Phone</label>
                            <p className="text-sm text-gray-900">{selectedSession.lead_captured.phone || 'Not provided'}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-500">Captured At</label>
                            <p className="text-sm text-gray-900">{formatTime(selectedSession.lead_captured.timestamp)}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-500">Page</label>
                            <p className="text-sm text-gray-900">{selectedSession.lead_captured.page}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-500">Conversion Timestamp</label>
                            <p className="text-sm text-gray-900">
                              {selectedSession.conversion_timestamp ? formatTime(selectedSession.conversion_timestamp) : 'Not available'}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* User Agent - Card */}
                    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-950 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5">
                      <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center">
                        <Monitor className="h-5 w-5 text-gray-700 dark:text-gray-300" />
                        <h4 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white ml-2">User Agent</h4>
                      </div>
                      <div className="p-6">
                        <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                          <p className="text-xs text-gray-700 dark:text-gray-300 break-all">{selectedSession.user_agent}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default SessionHistory;

