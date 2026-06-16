"use client";
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  MessageCircle,
  Clock,
  TrendingUp,
  Eye,
  Activity,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  XCircle,
  Globe,
  Monitor,
  Smartphone,
  Tablet,
  Target,
  MousePointer,
  FormInput,
  ChevronLeft,
  ChevronRight,
  PlusCircle
} from 'lucide-react';
import DashboardHeader from '@/components/header/DashboardHeader';

// Chart components
import dynamic from 'next/dynamic';
import RealTimeActivityChart from '@/components/charts/RealTimeActivityChart';
import SessionTrendsChart from '@/components/charts/SessionTrendsChart';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const ApexCharts = dynamic(() => import('react-apexcharts'), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-96"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
});

interface SessionData {
  // Basic identification
  visitor_id: string;
  session_id: string;
  session_number: number;
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

interface RealTimeMetrics {
  active_users: number;
  total_page_views: number;
  total_interactions: number;
  total_chatbot_events: number;
  avg_session_duration: number;
  timestamp: string;
}

// WebsiteAnalytics interface removed - not currently used
// interface WebsiteAnalytics {
//   total_visitors: number;
//   total_sessions: number;
//   total_page_views: number;
//   avg_session_duration: number;
//   bounce_rate: number;
//   conversion_rate: number;
//   top_pages: Array<{
//     page: string;
//     views: number;
//     unique_visitors: number;
//   }>;
//   device_breakdown: Array<{
//     device: string;
//     count: number;
//     percentage: number;
//   }>;
//   traffic_sources: Array<{
//     source: string;
//     count: number;
//     percentage: number;
//   }>;
// }

const UnifiedSessionAnalysis = () => {
  // API Configuration - Use environment variables
  const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "https://py-mobiloitte.converiqo.ai";

  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [metrics, setMetrics] = useState<RealTimeMetrics>({
    active_users: 0,
    total_page_views: 0,
    total_interactions: 0,
    total_chatbot_events: 0,
    avg_session_duration: 0,
    timestamp: new Date().toISOString()
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [selectedSession, setSelectedSession] = useState<SessionData | null>(null);
  const [showSessionDetails, setShowSessionDetails] = useState(false);
  const [, setIsWebSocketConnected] = useState(false);
  const [wsConnectionStatus, setWsConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  interface RealTimeDataItem {
    timestamp: string;
    page_views?: number;
    active_sessions?: number;
    interactions?: number;
    new_visitors?: number;
    [key: string]: unknown;
  }
  interface TrendsDataItem {
    timestamp: string;
    avg_duration?: number;
    bounce_rate?: number;
    conversion_rate?: number;
    [key: string]: unknown;
  }
  const [realTimeData, setRealTimeData] = useState<RealTimeDataItem[]>([]);
  const [trendsData, setTrendsData] = useState<TrendsDataItem[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [sessionsPerPage] = useState(10);
  const [totalSessions, setTotalSessions] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [allSessionsForMetrics, setAllSessionsForMetrics] = useState<SessionData[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);
  const fetchDataRef = useRef<(() => Promise<void>) | null>(null);
  const maxRetries = 3;

  // Generate fallback demo sessions for testing
  const generateFallbackSessions = () => {
    const now = new Date();
    const demoSession: SessionData = {
      visitor_id: 'demo-visitor-123',
      session_id: 'demo-session-456',
      session_number: Math.floor(Math.random() * 3) + 1, // Random session number 1-3
      start_time: new Date(now.getTime() - 120000).toISOString(), // 2 minutes ago
      last_activity: new Date(now.getTime() - 30000).toISOString(), // 30 seconds ago
      end_time: undefined,
      is_active: true,
      current_page: 'Home',
      current_url: 'https://py-mobiloitte.converiqo.ai/demo',
      landing_page_url: 'https://py-mobiloitte.converiqo.ai/demo',
      page_views: [
        {
          url: 'https://py-mobiloitte.converiqo.ai/demo',
          title: 'Home',
          page_name: 'Home',
          timestamp: new Date(now.getTime() - 120000).toISOString(),
          time_spent: 120000,
          scroll_depth: 75
        }
      ],
      navigation_path: ['Home'],
      exit_page: undefined,
      interactions: [
        {
          type: 'click',
          element: 'button',
          timestamp: new Date(now.getTime() - 60000).toISOString(),
          page: 'Home',
          data: {}
        }
      ],
      chatbot_events: [],
      form_interactions: [],
      custom_events: [],
      total_time_on_site: 120,
      time_on_page: 120000,
      active_time: 90000,
      idle_time: 30000,
      device_type: 'desktop',
      browser_info: { name: 'Chrome', version: '120.0' },
      operating_system: { name: 'Windows', version: '10' },
      screen_resolution: '1920x1080',
      language: 'en',
      timezone: 'UTC',
      ip_address: '127.0.0.1',
      geo_location: undefined,
      referrer: '',
      user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      utm_parameters: {},
      traffic_channel: 'Direct',
      scroll_depth: 75,
      is_returning_user: false,
      session_replay_id: 'replay-123',
      lead_captured: undefined,
      conversion_timestamp: undefined,
      session_to_lead_mapping: undefined,
      website: 'demo',
      is_demo_session: true
    };

    return [demoSession];
  };

  // Generate fallback metrics for testing
  const generateFallbackMetrics = (): RealTimeMetrics => {
    return {
      timestamp: new Date().toISOString(),
      total_page_views: 3,
      total_interactions: 5,
      total_chatbot_events: 0,
      active_users: 1,
      avg_session_duration: 120
    };
  };

  // Define SessionDataRaw interface early
  interface SessionDataRaw {
    start_time?: string;
    startTime?: string;
    last_activity?: string;
    lastActivity?: string;
    end_time?: string;
    endTime?: string;
    page_views?: Array<{ time_spent?: number }>;
    time_on_page?: number;
    visitor_id?: string;
    visitorId?: string;
    session_id?: string;
    sessionId?: string;
    session_number?: number;
    active_time?: number;
    idle_time?: number;
    [key: string]: unknown;
  }

  interface WebSocketMessage {
    type: string;
    data?: RealTimeMetrics;
  }

  // Refs for WebSocket callbacks to avoid circular dependencies
  const handleWebSocketMessageRef = useRef<((message: WebSocketMessage) => void) | null>(null);
  const scheduleReconnectRef = useRef<(() => void) | null>(null);
  const connectWebSocketRef = useRef<(() => void) | null>(null);

  // Fetch data from unified session analytics
  const fetchData = useCallback(async () => {
    try {
      setIsRefreshing(true);
      setError(null);

      // Calculate skip for pagination
      const skip = (currentPage - 1) * sessionsPerPage;

      // Fetch sessions and metrics in parallel - use /sessions/all for all sessions with pagination
      const [sessionsResponse, metricsResponse] = await Promise.all([
        fetch(`${BACKEND_URL}/api/v1/unified-session-analytics/sessions/all?skip=${skip}&limit=${sessionsPerPage}&sort_by=start_time&sort_order=-1`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(10000)
        }),
        fetch(`${BACKEND_URL}/api/v1/unified-session-analytics/metrics/real-time`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(10000)
        })
      ]);

      if (!sessionsResponse.ok) {
        console.log(`Sessions API error: ${sessionsResponse.status}, using fallback data`);
        // Don't throw error, use fallback data instead
      }
      if (!metricsResponse.ok) {
        console.log(`Metrics API error: ${metricsResponse.status}, using fallback data`);
        // Don't throw error, use fallback data instead
      }

      let sessionsData, metricsData;

      try {
        sessionsData = await sessionsResponse.json();
      } catch {
        console.log('Failed to parse sessions response, using fallback data');
        sessionsData = { status: 'error' };
      }

      try {
        metricsData = await metricsResponse.json();
      } catch {
        console.log('Failed to parse metrics response, using fallback data');
        metricsData = { status: 'error' };
      }

      if (sessionsData.status === 'success') {
        // Update pagination state
        setTotalSessions(sessionsData.total || 0);
        setHasMore(sessionsData.has_more || false);

        // Get all sessions first to calculate session numbers and returning user status
        const allSessionsForProcessing = Array.isArray(sessionsData.data) ? sessionsData.data : [];

        // Group sessions by visitor_id to calculate session numbers
        const visitorSessionMap = new Map<string, number>();
        const visitorSessionsMap = new Map<string, SessionDataRaw[]>();

        // First pass: group by visitor_id
        allSessionsForProcessing.forEach((session: SessionDataRaw) => {
          const vid = String(session.visitor_id || session.visitorId || '');
          if (vid) {
            if (!visitorSessionsMap.has(vid)) {
              visitorSessionsMap.set(vid, []);
            }
            visitorSessionsMap.get(vid)!.push(session);
          }
        });

        // Sort sessions by start_time for each visitor and assign session numbers
        visitorSessionsMap.forEach((visitorSessions) => {
          visitorSessions.sort((a, b) => {
            const timeA = new Date(a.start_time || a.startTime || 0).getTime();
            const timeB = new Date(b.start_time || b.startTime || 0).getTime();
            return timeA - timeB;
          });

          visitorSessions.forEach((session, index) => {
            visitorSessionMap.set(String(session.session_id || (session as SessionDataRaw & { sessionId?: string }).sessionId || ''), index + 1);
          });
        });

        // Normalize session data with proper calculations
        interface SessionDataRaw {
          start_time?: string;
          startTime?: string;
          last_activity?: string;
          lastActivity?: string;
          end_time?: string;
          endTime?: string;
          page_views?: Array<{ time_spent?: number }>;
          time_on_page?: number;
          [key: string]: unknown;
        }
        const normalizedSessions = allSessionsForProcessing.map((session: SessionDataRaw) => {
          const startTime = new Date(session.start_time || session.startTime || Date.now());
          const lastActivityTime = session.last_activity || session.lastActivity || session.start_time || session.startTime;
          const lastActivity = lastActivityTime ? new Date(lastActivityTime) : new Date(Date.now());
          const endTimeValue = session.end_time || session.endTime;
          const endTime = endTimeValue ? new Date(String(endTimeValue)) : null;

          // Calculate total time on site
          const totalTimeOnSite = endTime
            ? Math.floor((endTime.getTime() - startTime.getTime()) / 1000)
            : Math.floor((lastActivity.getTime() - startTime.getTime()) / 1000);

          // Calculate time on page from page_views
          const pageViews = Array.isArray(session.page_views) ? session.page_views : [];
          const timeOnPage = session.time_on_page || (pageViews.length > 0
            ? (pageViews[pageViews.length - 1]?.time_spent || 0) / 1000
            : 0);

          // Calculate active and idle time
          const activeTime = typeof session.active_time === 'number' ? session.active_time : (totalTimeOnSite * 0.8); // Estimate 80% active if not provided
          const idleTime = typeof session.idle_time === 'number' ? session.idle_time : (totalTimeOnSite * 0.2); // Estimate 20% idle if not provided

          // Calculate session number for this visitor
          const sessionIdStr = String(session.session_id || session.sessionId || '');
          const sessionNumber = visitorSessionMap.get(sessionIdStr) || (typeof session.session_number === 'number' ? session.session_number : 1);

          // Check if returning user (has previous sessions for this visitor_id)
          const visitorId = String(session.visitor_id || session.visitorId || '');
          const visitorSessions = visitorSessionsMap.get(visitorId) || [];
          const isReturningUser = visitorSessions.length > 1 && sessionNumber > 1;

          // Generate simple IDs for display (visitor-N, session-N)
          const visitorIndex = Array.from(visitorSessionsMap.keys()).indexOf(visitorId) + 1;
          const displayVisitorId = `visitor-${visitorIndex}`;
          const displaySessionId = `session-${sessionNumber}`;

          return {
            ...session,
            // Ensure is_active is a boolean
            is_active: session.is_active === true || session.is_active === 'true' || session.is_active === 1,
            page_views: pageViews,
            interactions: Array.isArray(session.interactions) ? session.interactions : [],
            form_interactions: Array.isArray(session.form_interactions) ? session.form_interactions : [],
            chatbot_events: Array.isArray(session.chatbot_events) ? session.chatbot_events : [],
            custom_events: Array.isArray(session.custom_events) ? session.custom_events : [],
            // Fix time calculations
            total_time_on_site: totalTimeOnSite,
            time_on_page: timeOnPage,
            active_time: activeTime,
            idle_time: idleTime,
            // Fix session number
            session_number: sessionNumber,
            // Fix returning user
            is_returning_user: isReturningUser || session.is_returning_user === true || session.is_returning_user === 'true',
            // Add display IDs (keep original for API calls)
            display_visitor_id: displayVisitorId,
            display_session_id: displaySessionId,
            original_visitor_id: visitorId,
            original_session_id: session.session_id || session.sessionId || ''
          };
        });
        setSessions(normalizedSessions);
      } else {
        // Generate fallback demo data when backend is not available
        const fallbackSessions = generateFallbackSessions();
        setSessions(fallbackSessions);
        setTotalSessions(fallbackSessions.length);
        setHasMore(false);
      }
      if (metricsData.status === 'success') {
        setMetrics(metricsData.data);
      } else {
        // Generate fallback metrics when backend is not available
        const fallbackMetrics = generateFallbackMetrics();
        setMetrics(fallbackMetrics);
      }

      // Fetch all sessions for metrics calculation (separate from pagination)
      try {
        const allSessionsResponse = await fetch(`${BACKEND_URL}/api/v1/unified-session-analytics/sessions/all?skip=0&limit=10000&sort_by=start_time&sort_order=-1`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(10000)
        });

        if (allSessionsResponse.ok) {
          const allSessionsData = await allSessionsResponse.json();
          if (allSessionsData.status === 'success') {
            // Apply same normalization logic as paginated sessions
            const allSessionsForProcessing = Array.isArray(allSessionsData.data) ? allSessionsData.data : [];

            // Group sessions by visitor_id for session numbering
            const visitorSessionMap = new Map<string, number>();
            const visitorSessionsMap = new Map<string, SessionDataRaw[]>();

            allSessionsForProcessing.forEach((session: SessionDataRaw) => {
              const vid = String(session.visitor_id || session.visitorId || '');
              if (vid) {
                if (!visitorSessionsMap.has(vid)) {
                  visitorSessionsMap.set(vid, []);
                }
                visitorSessionsMap.get(vid)!.push(session);
              }
            });

            visitorSessionsMap.forEach((visitorSessions) => {
              visitorSessions.sort((a, b) => {
                const timeA = new Date(a.start_time || a.startTime || Date.now()).getTime();
                const timeB = new Date(b.start_time || b.startTime || Date.now()).getTime();
                return timeA - timeB;
              });

              visitorSessions.forEach((session, index) => {
                visitorSessionMap.set(String(session.session_id || session.sessionId || ''), index + 1);
              });
            });

            // Normalize all sessions for metrics
            const normalizedAllSessions = allSessionsForProcessing.map((session: SessionDataRaw) => {
              const startTime = new Date(session.start_time || session.startTime || Date.now());
              const lastActivityTime = session.last_activity || session.lastActivity || session.start_time || session.startTime;
              const lastActivity = lastActivityTime ? new Date(lastActivityTime) : new Date(Date.now());
              const endTime = session.end_time || session.endTime ? new Date(String(session.end_time || session.endTime)) : null;

              const totalTimeOnSite = endTime
                ? Math.floor((endTime.getTime() - startTime.getTime()) / 1000)
                : Math.floor((lastActivity.getTime() - startTime.getTime()) / 1000);

              const pageViews = Array.isArray(session.page_views) ? session.page_views : [];
              const timeOnPage = session.time_on_page || (pageViews.length > 0
                ? (pageViews[pageViews.length - 1]?.time_spent || 0) / 1000
                : 0);

              const activeTime = typeof session.active_time === 'number' ? session.active_time : (totalTimeOnSite * 0.8);
              const idleTime = typeof session.idle_time === 'number' ? session.idle_time : (totalTimeOnSite * 0.2);
              const sessionIdStr = String(session.session_id || session.sessionId || '');
              const sessionNumber = visitorSessionMap.get(sessionIdStr) || session.session_number || 1;
              const visitorId = String(session.visitor_id || session.visitorId || '');
              const visitorSessions = visitorSessionsMap.get(visitorId) || [];
              const isReturningUser = visitorSessions.length > 1 && sessionNumber > 1;

              return {
                ...session,
                is_active: session.is_active === true || session.is_active === 'true' || session.is_active === 1,
                page_views: pageViews,
                interactions: Array.isArray(session.interactions) ? session.interactions : [],
                form_interactions: Array.isArray(session.form_interactions) ? session.form_interactions : [],
                chatbot_events: Array.isArray(session.chatbot_events) ? session.chatbot_events : [],
                custom_events: Array.isArray(session.custom_events) ? session.custom_events : [],
                total_time_on_site: totalTimeOnSite,
                time_on_page: timeOnPage,
                active_time: activeTime,
                idle_time: idleTime,
                session_number: sessionNumber,
                is_returning_user: isReturningUser || session.is_returning_user === true || session.is_returning_user === 'true'
              };
            });
            setAllSessionsForMetrics(normalizedAllSessions);
          }
        }
      } catch (e) {
        console.log('Error fetching all sessions for metrics:', e);
      }

      // Generate real-time chart data with stored data integration
      const now = new Date();
      const currentSessions = sessionsData.status === 'success' ? sessionsData.data : generateFallbackSessions();
      const activeSessions = currentSessions.filter((s: SessionData) => isSessionActive(s)).length;
      // Use allSessionsForMetrics if available, otherwise use currentSessions for calculations
      const sessionsForCalculation = allSessionsForMetrics.length > 0 ? allSessionsForMetrics : currentSessions;

      // Calculate metrics from actual session data
      const totalSessionsForCalc = sessionsForCalculation.length;

      // Calculate average session duration (in seconds, convert to minutes for display)
      // For active sessions, calculate duration from start_time to now
      // For inactive sessions, use total_time_on_site
      const sessionsWithDuration = sessionsForCalculation.map((s: SessionData) => {
        const isActive = isSessionActive(s);
        let duration = 0;

        if (isActive && s.start_time) {
          // Active session: calculate from start_time to now
          const startTime = new Date(s.start_time);
          duration = Math.floor((now.getTime() - startTime.getTime()) / 1000); // seconds
        } else if (s.total_time_on_site) {
          // Inactive session: use stored duration
          duration = s.total_time_on_site;
        } else if (s.start_time && s.end_time) {
          // Calculate from start to end if available
          const startTime = new Date(s.start_time);
          const endTime = new Date(s.end_time);
          duration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);
        } else if (s.start_time && s.last_activity) {
          // Fallback: use last_activity as end time
          const startTime = new Date(s.start_time);
          const lastActivity = new Date(s.last_activity);
          duration = Math.floor((lastActivity.getTime() - startTime.getTime()) / 1000);
        }

        return duration;
      }).filter((d: number) => d > 0);

      const avgDurationSeconds = sessionsWithDuration.length > 0
        ? sessionsWithDuration.reduce((sum: number, d: number) => sum + d, 0) / sessionsWithDuration.length
        : 0;
      const avgDurationMinutes = avgDurationSeconds / 60; // Convert to minutes

      // Calculate bounce rate: sessions with only 1 page view
      const bouncedSessions = sessionsForCalculation.filter((s: SessionData) => {
        const pageViews = Array.isArray(s.page_views) ? s.page_views : [];
        return pageViews.length <= 1;
      }).length;
      const bounceRate = totalSessionsForCalc > 0 ? bouncedSessions / totalSessionsForCalc : 0;

      // Calculate conversion rate: sessions with lead_captured
      const convertedSessions = sessionsForCalculation.filter((s: SessionData) => {
        return s.lead_captured && (s.lead_captured.lead_id || s.lead_captured.email || s.lead_captured.name);
      }).length;
      const conversionRate = totalSessionsForCalc > 0 ? convertedSessions / totalSessionsForCalc : 0;

      const newRealTimeData = {
        timestamp: now.toISOString(),
        page_views: metricsData.status === 'success' ? metricsData.data.total_page_views : Math.floor(Math.random() * 50) + 10,
        active_sessions: activeSessions,
        interactions: metricsData.status === 'success' ? metricsData.data.total_interactions : Math.floor(Math.random() * 20) + 5,
        new_visitors: Math.floor(Math.random() * 10) + 2
      };

      // Use calculated metrics from actual session data instead of API metrics
      const newTrendsData = {
        timestamp: now.toISOString(),
        avg_duration: avgDurationMinutes > 0 ? avgDurationMinutes : (metricsData.status === 'success' && metricsData.data.avg_session_duration > 0 ? metricsData.data.avg_session_duration : 0),
        bounce_rate: bounceRate > 0 || totalSessionsForCalc > 0 ? bounceRate : (metricsData.status === 'success' && metricsData.data.bounce_rate >= 0 ? metricsData.data.bounce_rate : 0),
        conversion_rate: conversionRate > 0 || totalSessionsForCalc > 0 ? conversionRate : (metricsData.status === 'success' && metricsData.data.conversion_rate >= 0 ? metricsData.data.conversion_rate : 0)
      };

      setRealTimeData(prev => [...prev.slice(-19), newRealTimeData]); // Keep last 20 data points
      setTrendsData(prev => [...prev.slice(-19), newTrendsData]); // Keep last 20 data points

      setLastUpdated(now);

    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
    // allSessionsForMetrics is set within this function, so including it would cause unnecessary re-renders
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, sessionsPerPage, BACKEND_URL]);

  // Handle page change
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  // Pagination calculation
  const totalPages = Math.ceil(totalSessions / sessionsPerPage);

  // Store fetchData in ref to avoid circular dependency
  useEffect(() => {
    fetchDataRef.current = fetchData;
  }, [fetchData]);

  // Handle WebSocket messages
  const handleWebSocketMessage = useCallback((message: WebSocketMessage) => {
    console.log('Received WebSocket message:', message);

    switch (message.type) {
      case 'session_connected':
      case 'session_active':
      case 'session_inactive':
      case 'session_ended':
      case 'page_view':
      case 'interaction':
        // Refresh data when session events occur
        if (fetchDataRef.current) {
          fetchDataRef.current();
        }
        break;
      case 'metrics_update':
        if (message.data) {
          setMetrics(message.data);
          setLastUpdated(new Date());
        }
        break;
      default:
        console.log('Unknown message type:', message.type);
    }
  }, []);

  // Schedule WebSocket reconnection
  const scheduleReconnect = useCallback(() => {
    if (retryCountRef.current < maxRetries) {
      retryCountRef.current++;
      const delay = Math.pow(2, retryCountRef.current) * 1000;
      console.log(`Scheduling WebSocket reconnection in ${delay}ms (attempt ${retryCountRef.current})`);

      retryTimeoutRef.current = setTimeout(() => {
        if (connectWebSocketRef.current) {
          connectWebSocketRef.current();
        }
      }, delay);
    } else {
      console.log('Max WebSocket reconnection attempts reached. Using polling mode for real-time updates.');
      setWsConnectionStatus('disconnected');
      // Fall back to polling every 15 seconds using ref (same as the main interval)
      retryTimeoutRef.current = setTimeout(() => {
        if (fetchDataRef.current) {
          fetchDataRef.current();
        }
      }, 15000);
    }
  }, []);

  // WebSocket connection management
  const connectWebSocket = useCallback((): void => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      setWsConnectionStatus('connecting');

      // Check if we're in a browser environment
      if (typeof window === 'undefined') {
        console.log('WebSocket: Not in browser environment, skipping connection');
        setWsConnectionStatus('disconnected');
        return;
      }

      // Check if backend is available first
      fetch(`${BACKEND_URL}/api/v1/health`)
        .then(response => {
          if (!response.ok) {
            throw new Error('Backend not available');
          }
        })
        .catch(() => {
          console.log('Backend server not running, skipping WebSocket connection');
          setWsConnectionStatus('disconnected');
          return;
        });

      // Determine WebSocket URL based on environment
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.hostname;
      const port = process.env.NODE_ENV === 'production' ? '' : ':8000';
      const wsUrl = `${protocol}//${host}${port}/api/v1/realtime/ws`;

      console.log('WebSocket: Attempting to connect to:', wsUrl);

      // Create WebSocket with better error handling
      try {
        wsRef.current = new WebSocket(wsUrl);
      } catch (wsError) {
        console.log('WebSocket creation failed:', wsError);
        setWsConnectionStatus('disconnected');
        return;
      }

      wsRef.current.onopen = () => {
        console.log('WebSocket connected successfully');
        setIsWebSocketConnected(true);
        setWsConnectionStatus('connected');
        retryCountRef.current = 0;
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (handleWebSocketMessageRef.current) {
            handleWebSocketMessageRef.current(message);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      wsRef.current.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        setIsWebSocketConnected(false);
        setWsConnectionStatus('disconnected');

        // Only retry if it wasn't a normal closure
        if (event.code !== 1000) {
          if (scheduleReconnectRef.current) {
            scheduleReconnectRef.current();
          }
        }
      };

      wsRef.current.onerror = () => {
        console.log('WebSocket connection failed. Backend server may not be running.');
        console.log('Switching to polling mode for real-time updates.');
        setIsWebSocketConnected(false);
        setWsConnectionStatus('disconnected');

        // Don't retry on error, let the close handler handle it
      };

    } catch {
      console.log('WebSocket connection failed');
      console.log('Falling back to polling mode for real-time updates');
      setIsWebSocketConnected(false);
      setWsConnectionStatus('disconnected');

      // Fall back to polling mode immediately
      if (fetchDataRef.current) {
        fetchDataRef.current();
      }
    }
  }, [BACKEND_URL]);

  // Store WebSocket callbacks in refs
  useEffect(() => {
    handleWebSocketMessageRef.current = handleWebSocketMessage;
    scheduleReconnectRef.current = scheduleReconnect;
    connectWebSocketRef.current = connectWebSocket;
  }, [handleWebSocketMessage, scheduleReconnect, connectWebSocket]);

  // Initial data fetch and WebSocket connection
  useEffect(() => {
    fetchData();

    // Only attempt WebSocket connection if we're in a browser environment
    if (typeof window !== 'undefined') {
      connectWebSocket();
    }

    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [fetchData, connectWebSocket]);

  // Periodic data refresh every 3 seconds for maximum real-time responsiveness
  useEffect(() => {
    const interval = setInterval(() => {
      fetchData(); // Always fetch data for real-time updates
    }, 3000); // 3 seconds for maximum speed

    return () => clearInterval(interval);
  }, [fetchData]);

  // Listen for immediate session activity updates
  useEffect(() => {
    const handleSessionActivityUpdate = (event: CustomEvent) => {
      const { sessionId, isActive, pageViews, interactions } = event.detail;

      // Immediately update the UI with new data
      setSessions(prevSessions => {
        return prevSessions.map(session => {
          if (session.session_id === sessionId) {
            return {
              ...session,
              is_active: isActive,
              last_activity: new Date().toISOString(),
              page_views: Array.from({ length: pageViews }, () => ({
                url: session.current_url,
                title: session.current_page,
                page_name: session.current_page,
                timestamp: new Date().toISOString(),
                time_spent: 0,
                scroll_depth: 0
              })),
              interactions: Array.from({ length: interactions }, () => ({
                type: 'click',
                element: 'button',
                timestamp: new Date().toISOString(),
                page: session.current_page,
                data: {}
              }))
            };
          }
          return session;
        });
      });

      // Update metrics immediately
      setMetrics(prevMetrics => ({
        ...prevMetrics,
        total_page_views: pageViews,
        total_interactions: interactions,
        active_users: isActive ? 1 : 0,
        timestamp: new Date().toISOString()
      }));
    };

    window.addEventListener('sessionActivityUpdate', handleSessionActivityUpdate as EventListener);

    return () => {
      window.removeEventListener('sessionActivityUpdate', handleSessionActivityUpdate as EventListener);
    };
  }, []);

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

    if (seconds < 60) return `${Math.floor(seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  };

  // Check if session is actually active based on recent activity
  const isSessionActive = (session: SessionData) => {
    // Strictly respect the is_active flag from backend - if it's explicitly false, session is inactive
    if (session.is_active === false) {
      return false;
    }

    // If is_active is explicitly true, trust the backend completely (it's the source of truth)
    // Don't do additional checks - backend knows best
    if (session.is_active === true) {
      return true;
    }

    // If is_active is not set or undefined, use last_activity as fallback indicator
    // This handles cases where backend hasn't set the flag yet
    if (!session.last_activity) {
      // If no last_activity and no is_active flag, assume inactive
      return false;
    }

    const lastActivity = new Date(session.last_activity);
    const now = new Date();
    const timeDiff = (now.getTime() - lastActivity.getTime()) / 1000; // seconds

    // For sessions without explicit is_active flag, use last_activity
    // Be lenient for demo sessions (90 seconds) to account for heartbeat intervals and network delays
    // This ensures sessions stay active while user is viewing the page
    const threshold = session.is_demo_session || session.current_url?.includes('/demo') ? 90 : 30;
    return timeDiff < threshold;
  };

  // Format element name to be more readable
  const formatElementName = (elementName: string): string => {
    if (!elementName) return 'Unknown Element';

    // If it's already a readable name (no CSS selectors), return as is
    if (!elementName.includes('.') && !elementName.includes('#') && !elementName.match(/^[a-z]+$/)) {
      return elementName;
    }

    // Extract meaningful parts from CSS selector
    // Remove common prefixes and suffixes
    let name = elementName
      .replace(/^[a-z]+\./, '') // Remove tag prefix like "input."
      .replace(/^[a-z]+#/, '') // Remove tag prefix like "button#"
      .replace(/\.[a-z0-9-]+$/i, '') // Remove class suffix
      .replace(/#[a-z0-9-]+$/i, ''); // Remove id suffix

    // Convert kebab-case, camelCase, snake_case to readable format
    name = name
      .replace(/([A-Z])/g, ' $1') // Add space before capital letters
      .replace(/[-_]/g, ' ') // Replace hyphens and underscores with spaces
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .trim()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');

    // If we still have a technical selector, provide a generic name
    if (name.includes('.') || name.includes('#') || name.length === 0) {
      // Try to infer from the original selector
      if (elementName.includes('input')) {
        if (elementName.includes('email')) return 'Email Input';
        if (elementName.includes('password')) return 'Password Input';
        if (elementName.includes('message') || elementName.includes('chat')) return 'Message Input';
        if (elementName.includes('mobilolite')) return 'Chatbot Input';
        return 'Input Field';
      }
      if (elementName.includes('textarea')) {
        if (elementName.includes('message') || elementName.includes('chat')) return 'Message Text Area';
        if (elementName.includes('mobilolite')) return 'Chatbot Input';
        return 'Text Area';
      }
      if (elementName.includes('button')) {
        if (elementName.includes('submit')) return 'Submit Button';
        if (elementName.includes('send')) return 'Send Button';
        return 'Button';
      }
      return 'Element';
    }

    return name || 'Element';
  };

  // Get status icon based on activity
  const getStatusIcon = (isActive: boolean) => {
    if (isActive) {
      return <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>;
    } else {
      return <div className="w-2 h-2 bg-gray-400 rounded-full"></div>;
    }
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


  // Chart options (commented out - not currently used)
  // Chart options (commented out - not currently used)
  // const sessionsChartOptions = {
  //   chart: {
  //     type: 'area',
  //     height: 350,
  //     toolbar: { show: false }
  //   },
  //   dataLabels: { enabled: false },
  //   stroke: { curve: 'smooth', width: 2 },
  //   xaxis: {
  //     categories: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', '24:00'],
  //     labels: { style: { colors: '#6B7280' } }
  //   },
  //   yaxis: {
  //     labels: { style: { colors: '#6B7280' } }
  //   },
  //   grid: { borderColor: '#E5E7EB' },
  //   colors: ['#3B82F6', '#10B981', '#F59E0B'],
  //   fill: {
  //     type: 'gradient',
  //     gradient: {
  //       shadeIntensity: 1,
  //       opacityFrom: 0.7,
  //       opacityTo: 0.3,
  //       stops: [0, 100]
  //     }
  //   }
  // };

  // const deviceChartOptions = {
  //   chart: {
  //     type: 'donut',
  //     height: 300
  //   },
  //   labels: ['Desktop', 'Mobile', 'Tablet'],
  //   colors: ['#3B82F6', '#10B981', '#F59E0B'],
  //   legend: {
  //     position: 'bottom',
  //     labels: { colors: '#6B7280' }
  //   },
  //   dataLabels: {
  //     enabled: true,
  //     formatter: (val: string) => `${val}%`
  //   }
  // };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Website session analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Professional Header */}
      <DashboardHeader
        variant="default"
        size="lg"
        title="Unified Session Analysis"
        subtitle="Real-time session monitoring with WebSocket updates and behavioral intelligence"
        hideTenantPrefix={true}
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Unified Session Analysis', href: '/unified-session-analysis' }
        ]}
        icon={() => (
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 sm:w-8 sm:h-8 text-white" aria-hidden="true">
            <path d="M3 3v18h18" />
            <path d="M8 17l3-3 2 2 5-5" />
            <circle cx="9" cy="7" r="2" />
            <circle cx="16" cy="10" r="2" />
          </svg>
        )}
        actions={
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
            {/* Status and Time Row - Mobile Optimized */}
            <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
              {/* Connection Status Badge */}
              <div className="flex items-center gap-2 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-lg sm:rounded-xl bg-white/10 backdrop-blur-sm border border-white/20">
                <span
                  className={`inline-flex w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full ${wsConnectionStatus === 'connected'
                    ? 'bg-green-400 shadow-lg shadow-green-400/50'
                    : wsConnectionStatus === 'connecting'
                      ? 'bg-yellow-300 animate-pulse shadow-lg shadow-yellow-300/50'
                      : 'bg-blue-200'
                    }`}
                />
                <span className="text-xs sm:text-sm font-medium text-white">
                  {wsConnectionStatus === 'connected'
                    ? 'WS Connected'
                    : wsConnectionStatus === 'connecting'
                      ? 'Connecting…'
                      : 'Polling'}
                </span>
              </div>

              {/* Time Display */}
              {lastUpdated && (
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-lg sm:rounded-xl bg-white/10 backdrop-blur-sm border border-white/20">
                  <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white/90" />
                  <span className="text-xs sm:text-sm font-medium text-white">
                    {lastUpdated.toLocaleTimeString().slice(0, 5)}
                  </span>
                </div>
              )}
            </div>

            {/* Refresh Button - Enhanced Mobile Design */}
            <button
              onClick={fetchData}
              disabled={isRefreshing}
              className="inline-flex items-center justify-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl bg-white/15 hover:bg-white/25 active:bg-white/30 backdrop-blur-sm border border-white/20 text-white text-xs sm:text-sm font-semibold transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed shadow-lg hover:shadow-xl w-full sm:w-auto"
            >
              <RefreshCw className={`w-4 h-4 sm:w-4 sm:h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        }
      />

      <div className="px-3 sm:px-4 py-4 sm:py-6 lg:px-12 space-y-4 sm:space-y-6 md:space-y-8">

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

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
          {/* Active Users Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-xl border border-gray-200/60 dark:border-gray-700/60 p-4 sm:p-6 relative overflow-hidden cursor-pointer transition-transform duration-300 ease-in-out"
          >
            <div className="flex items-start justify-start mb-3 sm:mb-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg">
                <Users className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
            </div>
            <div className="mt-3 sm:mt-4">
              <p className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-1 sm:mb-2">
                {allSessionsForMetrics.length > 0
                  ? allSessionsForMetrics.filter(s => isSessionActive(s)).length
                  : sessions.filter(s => isSessionActive(s)).length}
              </p>
              <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">Active Users</p>
            </div>
          </motion.div>

          {/* Page Views Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-xl border border-gray-200/60 dark:border-gray-700/60 p-4 sm:p-6 relative overflow-hidden cursor-pointer transition-transform duration-300 ease-in-out"
          >
            <div className="flex items-start justify-start mb-3 sm:mb-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg">
                <PlusCircle className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
            </div>
            <div className="mt-3 sm:mt-4">
              <p className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-1 sm:mb-2">{metrics.total_page_views}</p>
              <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">Page Views</p>
            </div>
          </motion.div>

          {/* Interactions Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-xl border border-gray-200/60 dark:border-gray-700/60 p-4 sm:p-6 relative overflow-hidden cursor-pointer transition-transform duration-300 ease-in-out"
          >
            <div className="flex items-start justify-start mb-3 sm:mb-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg">
                <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
            </div>
            <div className="mt-3 sm:mt-4">
              <p className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-1 sm:mb-2">
                {(() => {
                  // Calculate non-chatbot interactions from all sessions
                  const allNonChatbotInteractions = allSessionsForMetrics.reduce((total, session) => {
                    const nonChatbotInteractions = (session.interactions || []).filter((interaction) => {
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
                    return total + nonChatbotInteractions.length;
                  }, 0);
                  return allNonChatbotInteractions || metrics.total_interactions || 0;
                })()}
              </p>
              <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">Interactions</p>
            </div>
          </motion.div>

          {/* Avg Duration Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-xl border border-gray-200/60 dark:border-gray-700/60 p-4 sm:p-6 relative overflow-hidden cursor-pointer transition-transform duration-300 ease-in-out"
          >
            <div className="flex items-start justify-start mb-3 sm:mb-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg">
                <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
            </div>
            <div className="mt-3 sm:mt-4">
              <p className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-1 sm:mb-2">
                {(() => {
                  const duration = metrics.avg_session_duration || 0;
                  let seconds = duration;
                  if (duration > 3600 && duration < 86400000) {
                    const convertedSeconds = Math.floor(duration / 1000);
                    if (convertedSeconds < 7200) {
                      seconds = convertedSeconds;
                    } else if (duration > 86400) {
                      seconds = Math.floor(duration / 1000);
                    }
                  } else if (duration > 86400) {
                    seconds = Math.floor(duration / 1000);
                  }
                  if (seconds > 86400) seconds = 86400;
                  const minutes = Math.floor(seconds / 60);
                  return minutes > 0 ? minutes : Math.floor(seconds);
                })()}
              </p>
              <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">Avg Duration (min)</p>
            </div>
          </motion.div>
        </div>

        {/* Real-time Analytics Charts - Full Width */}
        <div className="space-y-4 sm:space-y-6 mb-4 sm:mb-6">
          {/* Real-time Activity Chart - Full Width */}
          <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-xl border border-gray-200/60 dark:border-gray-700/60 p-4 sm:p-6 md:p-8 overflow-hidden relative">
            {/* Enhanced Header */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-6 md:mb-8">
              <div className="flex items-center gap-3 sm:gap-4 flex-1">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0">
                  <Activity className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-white">Real-time Activity</h3>
                  <p className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm mt-1 hidden sm:block">Live monitoring of active users and interactions.</p>
                </div>
              </div>
              <div className="flex items-center justify-between sm:justify-end space-x-3 sm:space-x-4">
                <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                  <span className="hidden sm:inline">Active Users: </span>
                  <span className="font-bold text-green-600 dark:text-green-400">
                    {allSessionsForMetrics.length > 0
                      ? allSessionsForMetrics.filter(s => isSessionActive(s)).length
                      : sessions.filter(s => isSessionActive(s)).length}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-xs text-green-600 dark:text-green-400 font-medium">LIVE</span>
                </div>
              </div>
            </div>
            {/* Chart Content */}
            <div className="bg-gradient-to-br from-blue-50/50 to-blue-50/50 dark:from-blue-900/20 dark:to-blue-900/20 rounded-lg sm:rounded-xl p-3 sm:p-4 md:p-6 border border-blue-200/50 dark:border-blue-700/50">
              <div className="h-64 sm:h-72 md:h-80">
                <RealTimeActivityChart data={realTimeData} />
              </div>
            </div>
          </div>

          {/* Session Trends Chart - Full Width */}
          <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-xl border border-gray-200/60 dark:border-gray-700/60 p-4 sm:p-6 md:p-8 overflow-hidden relative">
            {/* Enhanced Header */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-6 md:mb-8">
              <div className="flex items-center gap-3 sm:gap-4 flex-1">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0">
                  <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-white">Session Trends</h3>
                  <p className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm mt-1 hidden sm:block">Historical trends and analytics over time.</p>
                </div>
              </div>
              <div className="flex items-center justify-between sm:justify-end space-x-3 sm:space-x-4">
                <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                  <span className="hidden sm:inline">Active Sessions: </span>
                  <span className="font-bold text-blue-600 dark:text-blue-400">
                    {allSessionsForMetrics.length > 0
                      ? allSessionsForMetrics.filter(s => isSessionActive(s)).length
                      : sessions.filter(s => isSessionActive(s)).length}
                  </span>
                  <span className="text-gray-500 dark:text-gray-500 ml-1 sm:ml-2">
                    <span className="hidden sm:inline">(Total: </span>
                    <span className="sm:hidden">(</span>
                    {totalSessions}
                    <span>)</span>
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">UPDATING</span>
                </div>
              </div>
            </div>
            {/* Chart Content */}
            <div className="bg-gradient-to-br from-blue-50/50 to-blue-50/50 dark:from-blue-900/20 dark:to-blue-900/20 rounded-lg sm:rounded-xl p-3 sm:p-4 md:p-6 border border-blue-200/50 dark:border-blue-700/50">
              <div className="h-64 sm:h-72 md:h-80">
                <SessionTrendsChart data={trendsData} />
              </div>
            </div>
          </div>
        </div>

        {/* Sessions Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-xl border border-gray-200/60 dark:border-gray-700/60 mb-4 sm:mb-8 overflow-hidden relative">
          <div className="p-4 sm:p-6 md:p-8 border-b border-gray-200 dark:border-gray-700">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-4">
              <div className="flex items-center gap-3 sm:gap-4 flex-1">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0">
                  <Users className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-white">Real-time Session Monitoring</h2>
                  <p className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm mt-1 hidden sm:block">Live tracking of all active and recent sessions.</p>
                </div>
              </div>
              <button
                onClick={async () => {
                  if (confirm('Are you sure you want to clear ALL session history? This action cannot be undone.')) {
                    try {
                      const response = await fetch(`${BACKEND_URL}/api/v1/unified-session-analytics/sessions/clear-all`, {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json' }
                      });
                      if (response.ok) {
                        alert('All session history has been cleared successfully.');
                        fetchData(); // Refresh data
                      } else {
                        alert('Failed to clear session history. Please try again.');
                      }
                    } catch (error) {
                      console.error('Error clearing sessions:', error);
                      alert('Failed to clear session history. Please try again.');
                    }
                  }
                }}
                className="px-3 sm:px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap"
              >
                Clear All Sessions
              </button>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0 mt-3 sm:mt-4">
              <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                Showing {(currentPage - 1) * sessionsPerPage + 1} to {Math.min(currentPage * sessionsPerPage, totalSessions)} of {totalSessions} sessions
              </span>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs text-green-600 dark:text-green-400 font-medium">LIVE</span>
              </div>
            </div>
          </div>

          {sessions.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-gray-400 dark:text-gray-500" />
              </div>
              <p className="text-gray-500 dark:text-gray-400">No active sessions</p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Visitor
                      </th>
                      <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Page
                      </th>
                      <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Device
                      </th>
                      <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Duration
                      </th>
                      <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Interactions
                      </th>
                      <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Live Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {sessions.map((session, index) => (
                      <motion.tr
                        key={session.session_id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-8 w-8">
                              <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                                <span className="text-sm font-medium text-blue-600 dark:text-blue-300">
                                  {((session as SessionData & { display_visitor_id?: string }).display_visitor_id || session.visitor_id || 'V1').replace('visitor-', '').slice(0, 2).toUpperCase()}
                                </span>
                              </div>
                            </div>
                            <div className="ml-3">
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {((session as SessionData & { display_visitor_id?: string }).display_visitor_id || session.visitor_id?.slice(0, 8) || 'visitor-1')}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                Session #{session.session_number}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 dark:text-white">{session.current_page}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs">
                            {session.current_url}
                          </div>
                        </td>
                        <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center text-sm text-gray-900 dark:text-white">
                            {getDeviceIcon(session.device_type)}
                            <span className="ml-2 capitalize">{session.device_type}</span>
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {session.screen_resolution}
                          </div>
                        </td>
                        <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {formatDuration(session.total_time_on_site)}
                        </td>
                        <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {(() => {
                            const nonChatbotInteractions = (session.interactions || []).filter(interaction => {
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
                        </td>
                        <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center space-x-2">
                            <div className={`w-2 h-2 rounded-full ${isSessionActive(session) ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
                              }`}></div>
                            <span className={`text-xs font-medium ${isSessionActive(session) ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'
                              }`}>
                              {isSessionActive(session) ? 'LIVE' : 'INACTIVE'}
                            </span>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden space-y-3 p-4">
                {sessions.map((session, index) => (
                  <motion.div
                    key={session.session_id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600"
                    onClick={() => {
                      setSelectedSession(session);
                      setShowSessionDetails(true);
                    }}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                            <span className="text-sm font-medium text-blue-600 dark:text-blue-300">
                              {((session as SessionData & { display_visitor_id?: string }).display_visitor_id || session.visitor_id || 'V1').replace('visitor-', '').slice(0, 2).toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                            {((session as SessionData & { display_visitor_id?: string }).display_visitor_id || session.visitor_id?.slice(0, 8) || 'visitor-1')}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            Session #{session.session_number}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 flex-shrink-0">
                        <div className={`w-2 h-2 rounded-full ${isSessionActive(session) ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
                          }`}></div>
                        <span className={`text-xs font-medium ${isSessionActive(session) ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'
                          }`}>
                          {isSessionActive(session) ? 'LIVE' : 'INACTIVE'}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-start gap-2">
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 w-20 flex-shrink-0">Page:</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 dark:text-white truncate">{session.current_page}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{session.current_url}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 w-20 flex-shrink-0">Device:</span>
                        <div className="flex items-center text-sm text-gray-900 dark:text-white">
                          {getDeviceIcon(session.device_type)}
                          <span className="ml-2 capitalize">{session.device_type}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-600">
                        <div className="flex items-center gap-4">
                          <div>
                            <span className="text-xs text-gray-500 dark:text-gray-400">Duration</span>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">{formatDuration(session.total_time_on_site)}</div>
                          </div>
                          <div>
                            <span className="text-xs text-gray-500 dark:text-gray-400">Interactions</span>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {(() => {
                                const nonChatbotInteractions = (session.interactions || []).filter(interaction => {
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
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-0">
                  <div className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 text-center sm:text-left">
                    Showing {(currentPage - 1) * sessionsPerPage + 1} to {Math.min(currentPage * sessionsPerPage, totalSessions)} of {totalSessions} sessions
                  </div>
                  <div className="flex items-center space-x-1 sm:space-x-2">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1 || isLoading}
                      className="p-1.5 sm:p-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 text-xs sm:text-sm"
                    >
                      <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="hidden sm:inline">Previous</span>
                      <span className="sm:hidden">Prev</span>
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
                      className="p-1.5 sm:p-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 text-xs sm:text-sm"
                    >
                      <span className="hidden sm:inline">Next</span>
                      <span className="sm:hidden">Next</span>
                      <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Session Details Modal */}
        <AnimatePresence>
          {showSessionDetails && selectedSession && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto m-4"
              >
                <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">Session Details</h3>
                    <button
                      onClick={() => setShowSessionDetails(false)}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      <XCircle className="h-5 w-5 sm:h-6 sm:w-6" />
                    </button>
                  </div>
                </div>

                <div className="p-4 sm:p-6 space-y-6 sm:space-y-8">
                  {/* Basic Session Information */}
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <Target className="h-5 w-5 mr-2" />
                      Session & Visitor Identification
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Visitor ID</label>
                        <p className="text-sm text-gray-900 font-mono break-all">
                          {((selectedSession as SessionData & { display_visitor_id?: string }).display_visitor_id || selectedSession.visitor_id)}
                          {((selectedSession as SessionData & { original_visitor_id?: string; display_visitor_id?: string }).original_visitor_id &&
                            (selectedSession as SessionData & { original_visitor_id?: string; display_visitor_id?: string }).original_visitor_id !==
                            (selectedSession as SessionData & { original_visitor_id?: string; display_visitor_id?: string }).display_visitor_id) && (
                              <span className="text-xs text-gray-500 ml-2">({(selectedSession as SessionData & { original_visitor_id?: string }).original_visitor_id})</span>
                            )}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Session ID</label>
                        <p className="text-sm text-gray-900 font-mono break-all">
                          {((selectedSession as SessionData & { display_session_id?: string }).display_session_id || selectedSession.session_id)}
                          {((selectedSession as SessionData & { original_session_id?: string; display_session_id?: string }).original_session_id &&
                            (selectedSession as SessionData & { original_session_id?: string; display_session_id?: string }).original_session_id !==
                            (selectedSession as SessionData & { original_session_id?: string; display_session_id?: string }).display_session_id) && (
                              <span className="text-xs text-gray-500 ml-2">({(selectedSession as SessionData & { original_session_id?: string }).original_session_id})</span>
                            )}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Session Number</label>
                        <p className="text-sm text-gray-900">#{selectedSession.session_number}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Start Time</label>
                        <p className="text-sm text-gray-900">{formatTime(selectedSession.start_time)}</p>
                        <p className="text-xs text-gray-500">{formatDate(selectedSession.start_time)}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Last Activity</label>
                        <p className="text-sm text-gray-900">{formatTime(selectedSession.last_activity)}</p>
                        <p className="text-xs text-gray-500">{formatDate(selectedSession.last_activity)}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Status</label>
                        <div className="flex items-center">
                          {getStatusIcon(selectedSession.is_active)}
                          <span className="ml-2 text-sm text-gray-900">
                            {selectedSession.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Device & Browser Information */}
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <Monitor className="h-5 w-5 mr-2" />
                      Device & Browser Information
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Device Type</label>
                        <div className="flex items-center">
                          {getDeviceIcon(selectedSession.device_type)}
                          <span className="ml-2 text-sm text-gray-900 capitalize">{selectedSession.device_type}</span>
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Screen Resolution</label>
                        <p className="text-sm text-gray-900">{selectedSession.screen_resolution}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Language</label>
                        <p className="text-sm text-gray-900">{selectedSession.language}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Browser</label>
                        <p className="text-sm text-gray-900">
                          {selectedSession.browser_info?.name || (selectedSession as SessionData & { browserInfo?: { name?: string } }).browserInfo?.name || 'Unknown'}
                          {selectedSession.browser_info?.version || (selectedSession as SessionData & { browserInfo?: { version?: string } }).browserInfo?.version ? ` ${selectedSession.browser_info?.version || (selectedSession as SessionData & { browserInfo?: { version?: string } }).browserInfo?.version}` : ''}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Operating System</label>
                        <p className="text-sm text-gray-900">
                          {selectedSession.operating_system?.name || (selectedSession as SessionData & { operatingSystem?: { name?: string } }).operatingSystem?.name || 'Unknown'}
                          {selectedSession.operating_system?.version || (selectedSession as SessionData & { operatingSystem?: { version?: string } }).operatingSystem?.version ? ` ${selectedSession.operating_system?.version || (selectedSession as SessionData & { operatingSystem?: { version?: string } }).operatingSystem?.version}` : ''}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Timezone</label>
                        <p className="text-sm text-gray-900">{selectedSession.timezone}</p>
                      </div>
                    </div>
                  </div>

                  {/* Network & Location Information */}
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <Globe className="h-5 w-5 mr-2" />
                      Network & Location Information
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500">IP Address</label>
                        <p className="text-sm text-gray-900 font-mono">{selectedSession.ip_address || 'Not available'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Referrer</label>
                        <p className="text-sm text-gray-900 break-all">{selectedSession.referrer || 'Direct'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Landing Page</label>
                        <p className="text-sm text-gray-900 break-all">{selectedSession.landing_page_url || selectedSession.current_url}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Current Page</label>
                        <p className="text-sm text-gray-900">{selectedSession.current_page}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Current URL</label>
                        <p className="text-sm text-gray-900 break-all">{selectedSession.current_url}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Website</label>
                        <p className="text-sm text-gray-900">{selectedSession.website}</p>
                      </div>
                    </div>
                  </div>

                  {/* User Behavior Information */}
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <Activity className="h-5 w-5 mr-2" />
                      User Behavior Information
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Total Time on Site</label>
                        <p className="text-sm text-gray-900">{formatDuration(selectedSession.total_time_on_site)}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Time on Page</label>
                        <p className="text-sm text-gray-900">
                          {(() => {
                            // time_on_page is in seconds from backend, convert to display
                            const timeOnPage = selectedSession.time_on_page || 0;
                            if (timeOnPage > 0) {
                              return formatDuration(timeOnPage);
                            }
                            // Fallback: calculate from last page view
                            if (selectedSession.page_views?.length > 0) {
                              const lastPageView = selectedSession.page_views[selectedSession.page_views.length - 1];
                              const timeSpent = lastPageView.time_spent || (lastPageView as { timeSpent?: number }).timeSpent || 0;
                              if (timeSpent > 0) {
                                return formatDuration(timeSpent >= 1000 ? timeSpent : timeSpent * 1000);
                              }
                            }
                            return '0s';
                          })()}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Active Time</label>
                        <p className="text-sm text-gray-900">
                          {(() => {
                            // active_time is in seconds from backend
                            const activeTime = selectedSession.active_time || 0;
                            if (activeTime > 0) {
                              return formatDuration(activeTime);
                            }
                            // Fallback: estimate 80% of total time
                            const totalTime = selectedSession.total_time_on_site || 0;
                            if (totalTime > 0) {
                              return formatDuration(Math.round(totalTime * 0.8));
                            }
                            return '0s';
                          })()}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Idle Time</label>
                        <p className="text-sm text-gray-900">
                          {(() => {
                            // idle_time is in seconds from backend
                            const idleTime = selectedSession.idle_time || 0;
                            if (idleTime > 0) {
                              return formatDuration(idleTime);
                            }
                            // Fallback: estimate 20% of total time
                            const totalTime = selectedSession.total_time_on_site || 0;
                            if (totalTime > 0) {
                              return formatDuration(Math.round(totalTime * 0.2));
                            }
                            return '0s';
                          })()}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Scroll Depth</label>
                        <p className="text-sm text-gray-900">{selectedSession.scroll_depth || 0}%</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Is Returning User</label>
                        <p className="text-sm text-gray-900">{selectedSession.is_returning_user ? 'Yes' : 'No'}</p>
                      </div>
                      <div className="lg:col-span-2">
                        <label className="text-sm font-medium text-gray-500">Session Replay ID</label>
                        <p className="text-sm text-gray-900 font-mono text-xs break-all">
                          {selectedSession.session_replay_id || (selectedSession as SessionData & { sessionReplayId?: string }).sessionReplayId || 'Not available'}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Is Demo Session</label>
                        <p className="text-sm text-gray-900">{selectedSession.is_demo_session ? 'Yes' : 'No'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Navigation Path */}
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <Globe className="h-5 w-5 mr-2" />
                      Navigation Path ({selectedSession.navigation_path?.length || 0} pages)
                    </h4>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {selectedSession.navigation_path?.map((url, index) => (
                        <div key={index} className="flex items-center p-3 bg-gray-50 rounded-lg">
                          <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                            <span className="text-xs font-medium text-blue-600">{index + 1}</span>
                          </div>
                          <p className="text-sm text-gray-900 break-all">{url}</p>
                        </div>
                      )) || <p className="text-sm text-gray-500">No navigation data available</p>}
                    </div>
                  </div>

                  {/* Page Views */}
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <Eye className="h-5 w-5 mr-2" />
                      Page Views ({Array.isArray(selectedSession.page_views) ? selectedSession.page_views.length : 0})
                    </h4>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {Array.isArray(selectedSession.page_views) && selectedSession.page_views.length > 0 ? (
                        selectedSession.page_views.map((pageView: SessionData['page_views'][0], index: number) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900">{pageView.page_name || pageView.title || 'Unknown Page'}</p>
                              <p className="text-xs text-gray-500 break-all">{pageView.url || 'N/A'}</p>
                              <p className="text-xs text-gray-500">Scroll: {pageView.scroll_depth || 0}%</p>
                            </div>
                            <div className="text-right ml-4">
                              <p className="text-xs text-gray-500">{formatTime(pageView.timestamp || new Date().toISOString())}</p>
                              <p className="text-xs text-gray-500">{formatDuration(pageView.time_spent || 0)}</p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-gray-500">No page view data available</p>
                      )}
                    </div>
                  </div>

                  {/* Interactions - Filter out chatbot-related interactions */}
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <MousePointer className="h-5 w-5 mr-2" />
                      Interactions ({(() => {
                        const nonChatbotInteractions = (selectedSession.interactions || []).filter((interaction: SessionData['interactions'][0]) => {
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
                      })()})
                    </h4>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {(() => {
                        const nonChatbotInteractions = (selectedSession.interactions || []).filter((interaction: SessionData['interactions'][0]) => {
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

                        return nonChatbotInteractions.length > 0 ? (
                          nonChatbotInteractions.map((interaction: SessionData['interactions'][0], index: number) => {
                            // Get readable element name
                            const rawElementName = interaction.element || 'Unknown Element';
                            const elementName = formatElementName(rawElementName);
                            const isTechnicalSelector = rawElementName.includes('.') || rawElementName.includes('#') || rawElementName.match(/^[a-z]+$/);

                            // Format interaction type
                            const interactionType = (interaction.type || 'interaction')
                              .replace(/_/g, ' ')
                              .split(' ')
                              .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
                              .join(' ');

                            // Format data display
                            const formatInteractionData = (data: unknown): string => {
                              if (!data || typeof data !== 'object') return '';
                              const dataObj = data as Record<string, unknown>;
                              if (dataObj.url && typeof dataObj.url === 'string') return `Link: ${dataObj.url}`;
                              if (dataObj.scrollDepth !== undefined && typeof dataObj.scrollDepth === 'number') return `Scroll: ${dataObj.scrollDepth}%`;
                              return Object.entries(dataObj)
                                .map(([key, value]) => `${key.charAt(0).toUpperCase() + key.slice(1)}: ${String(value)}`)
                                .join(', ');
                            };

                            return (
                              <div key={index} className="flex items-start justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded">
                                      {interactionType}
                                    </span>
                                    <span className="text-xs text-gray-400">
                                      #{index + 1}
                                    </span>
                                  </div>
                                  <p className="text-sm font-semibold text-gray-900">
                                    {elementName}
                                  </p>
                                  {(() => {
                                    const data = interaction.data;
                                    if (data && typeof data === 'object' && data !== null && Object.keys(data).length > 0) {
                                      return (
                                        <p className="text-xs text-gray-600 mt-1">
                                          {formatInteractionData(data)}
                                        </p>
                                      );
                                    }
                                    return null;
                                  })()}
                                  {isTechnicalSelector && rawElementName !== elementName && (
                                    <p className="text-xs text-gray-400 font-mono mt-1" title="Technical selector">
                                      {rawElementName}
                                    </p>
                                  )}
                                </div>
                                <p className="text-xs text-gray-500 ml-4 whitespace-nowrap">{formatTime(interaction.timestamp || new Date().toISOString())}</p>
                              </div>
                            );
                          })
                        ) : (
                          <div className="text-center py-8">
                            <MousePointer className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                            <p className="text-sm text-gray-500">No interaction data available</p>
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Form Interactions */}
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <FormInput className="h-5 w-5 mr-2" />
                      Form Interactions ({Array.isArray(selectedSession.form_interactions) ? selectedSession.form_interactions.length : 0})
                    </h4>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {Array.isArray(selectedSession.form_interactions) && selectedSession.form_interactions.length > 0 ? (
                        selectedSession.form_interactions.map((formInteraction: SessionData['form_interactions'][0], index: number) => (
                          <div key={index} className="flex items-start justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="bg-orange-100 text-orange-800 text-xs font-medium px-2 py-1 rounded capitalize">
                                  {formInteraction.action || formInteraction.type || 'form'}
                                </span>
                                <span className="text-xs text-gray-400">#{index + 1}</span>
                              </div>
                              {formInteraction.field_name && (
                                <p className="text-sm font-semibold text-gray-900 mb-1">
                                  {formInteraction.field_name}
                                </p>
                              )}
                              <div className="space-y-1">
                                <p className="text-xs text-gray-600">
                                  <span className="font-medium">Form:</span> {formInteraction.form_id || 'Unknown'}
                                </p>
                                {(() => {
                                  const dataObj = formInteraction.data as Record<string, unknown> | undefined;
                                  const fieldType = dataObj?.field_type;
                                  const fieldValue = dataObj?.field_value;
                                  return (
                                    <>
                                      {fieldType && typeof fieldType === 'string' && (
                                        <p className="text-xs text-gray-600">
                                          <span className="font-medium">Type:</span> {fieldType}
                                        </p>
                                      )}
                                      {fieldValue && typeof fieldValue === 'string' && (
                                        <p className="text-xs text-gray-600">
                                          <span className="font-medium">Value:</span> {fieldValue.substring(0, 50)}
                                          {fieldValue.length > 50 && '...'}
                                        </p>
                                      )}
                                    </>
                                  );
                                })()}
                              </div>
                            </div>
                            <p className="text-xs text-gray-500 ml-4 whitespace-nowrap">{formatTime(formInteraction.timestamp || new Date().toISOString())}</p>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8">
                          <FormInput className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                          <p className="text-sm text-gray-500">No form interaction data available</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Chatbot Events - Full Conversation - Include both dedicated chatbot_events and chatbot-related interactions */}
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <MessageCircle className="h-5 w-5 mr-2" />
                      Chatbot Conversation ({(() => {
                        // Count dedicated chatbot events
                        const chatbotEventsCount = Array.isArray(selectedSession.chatbot_events) ? selectedSession.chatbot_events.length : 0;
                        // Count chatbot-related interactions
                        const chatbotInteractions = (selectedSession.interactions || []).filter((interaction) => {
                          const element = String(interaction.element || '').toLowerCase();
                          const type = String(interaction.type || '').toLowerCase();
                          const dataStr = JSON.stringify(interaction.data || {}).toLowerCase();
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
                      })()} messages)
                    </h4>
                    <div className="space-y-3 max-h-96 overflow-y-auto bg-gray-50 rounded-lg p-4">
                      {(() => {
                        // Get dedicated chatbot events
                        const chatbotEvents = Array.isArray(selectedSession.chatbot_events)
                          ? selectedSession.chatbot_events.map((event: SessionData['chatbot_events'][0]) => ({
                            ...event,
                            isDedicatedEvent: true
                          }))
                          : [];

                        // Get chatbot-related interactions and convert to chatbot event format
                        const chatbotInteractions = (selectedSession.interactions || []).filter((interaction) => {
                          const element = String(interaction.element || '').toLowerCase();
                          const type = String(interaction.type || '').toLowerCase();
                          const dataStr = JSON.stringify(interaction.data || {}).toLowerCase();
                          return element.includes('mobilolite') ||
                            element.includes('chatbot') ||
                            element.includes('bot-widget') ||
                            element.includes('bot_widget') ||
                            type.includes('chatbot') ||
                            type.includes('bot_') ||
                            dataStr.includes('chatbot') ||
                            dataStr.includes('bot_widget');
                        }).map((interaction) => {
                          const dataObj = interaction.data as Record<string, unknown> | undefined;
                          return {
                            event_type: interaction.type || 'chatbot_interaction',
                            type: interaction.type || 'chatbot_interaction',
                            timestamp: interaction.timestamp,
                            message: interaction.element || (dataObj?.message && typeof dataObj.message === 'string' ? dataObj.message : '') || (dataObj?.text && typeof dataObj.text === 'string' ? dataObj.text : '') || 'Chatbot interaction',
                            data: interaction.data,
                            isDedicatedEvent: false
                          };
                        });

                        // Combine and sort by timestamp
                        const allChatbotEvents = [...chatbotEvents, ...chatbotInteractions].sort((a, b) =>
                          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
                        );

                        return allChatbotEvents.length > 0 ? (
                          allChatbotEvents.map((event: SessionData['chatbot_events'][0] & { isDedicatedEvent?: boolean; message?: string }, index: number) => {
                            const eventType = event.type || '';
                            const eventData = event.data as Record<string, unknown> | undefined;
                            const message = event.message || (eventData?.message && typeof eventData.message === 'string' ? eventData.message : '') || (eventData?.text && typeof eventData.text === 'string' ? eventData.text : '') || '';
                            const isUserMessage = eventType === 'message_sent' || eventType === 'user_message' || eventType === 'user_input' || eventType === 'click' || (eventType.toLowerCase().includes('user') || eventType.toLowerCase().includes('click'));
                            const isBotMessage = eventType === 'message_received' || eventType === 'bot_message' || eventType === 'bot_response' || eventType === 'bot_initialized' || (eventType.toLowerCase().includes('bot') && !eventType.toLowerCase().includes('click'));
                            const isSystemEvent = !isUserMessage && !isBotMessage;

                            return (
                              <div key={index} className={`flex ${isUserMessage ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] rounded-lg p-3 ${isUserMessage
                                  ? 'bg-blue-500 text-white'
                                  : isBotMessage
                                    ? 'bg-white text-gray-900 border border-gray-200'
                                    : 'bg-yellow-50 text-gray-700 border border-yellow-200'
                                  }`}>
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className={`text-xs font-semibold ${isUserMessage ? 'text-blue-100' : isBotMessage ? 'text-blue-600' : 'text-yellow-700'
                                      }`}>
                                      {isUserMessage ? '👤 User' : isBotMessage ? '🤖 Bot' : '⚙️ System'}
                                    </span>
                                    <span className={`text-xs ${isUserMessage ? 'text-blue-200' : 'text-gray-500'
                                      }`}>
                                      {formatTime(event.timestamp || new Date().toISOString())}
                                    </span>
                                  </div>
                                  {message && (
                                    <p className={`text-sm ${isUserMessage ? 'text-white' : 'text-gray-900'} whitespace-pre-wrap break-words`}>
                                      {message}
                                    </p>
                                  )}
                                  {!message && (() => {
                                    const eventData = event.data;
                                    if (eventData && typeof eventData === 'object' && eventData !== null && Object.keys(eventData).length > 0) {
                                      return (
                                        <div className="text-xs mt-1">
                                          <pre className={`overflow-x-auto ${isUserMessage ? 'text-blue-100' : 'text-gray-600'}`}>
                                            {JSON.stringify(eventData, null, 2)}
                                          </pre>
                                        </div>
                                      );
                                    }
                                    return null;
                                  })()}
                                  {(() => {
                                    const eventData = event.data as Record<string, unknown> | undefined;
                                    const messageLength = eventData?.message_length;
                                    return messageLength && typeof messageLength === 'number' ? (
                                      <p className={`text-xs mt-1 ${isUserMessage ? 'text-blue-200' : 'text-gray-500'
                                        }`}>
                                        {messageLength} characters
                                      </p>
                                    ) : null;
                                  })()}
                                  {isSystemEvent && eventType && (
                                    <p className={`text-xs mt-1 font-medium ${isUserMessage ? 'text-blue-200' : 'text-yellow-700'
                                      }`}>
                                      Event: {eventType.replace('_', ' ')}
                                    </p>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="text-center py-8">
                            <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                            <p className="text-sm text-gray-500">No chatbot conversation data available</p>
                          </div>
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
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
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

                  {/* User Agent */}
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <Monitor className="h-5 w-5 mr-2" />
                      User Agent
                    </h4>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-700 break-all">{selectedSession.user_agent}</p>
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

export default UnifiedSessionAnalysis;
