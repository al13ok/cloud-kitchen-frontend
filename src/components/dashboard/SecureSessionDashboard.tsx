"use client";
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  MessageCircle,
  Clock,
  Eye,
  Activity,
  RefreshCw,
  AlertCircle
} from 'lucide-react';

// WebSocket connection for real-time updates
interface WebSocketMessage {
  type: string;
  data: Record<string, unknown>;
  timestamp: string;
}

interface SessionData {
  visitor_id: string;
  session_id: string;
  session_number: number;
  start_time: string;
  last_activity: string;
  is_active: boolean;
  current_page: string;
  current_url: string;
  page_views: Array<{
    url: string;
    title: string;
    page_name: string;
    timestamp: string;
    time_spent: number;
    scroll_depth: number;
  }>;
  interactions: Array<{
    type: string;
    element: string;
    timestamp: string;
    page: string;
    data: Record<string, unknown>;
  }>;
  total_time_on_site: number;
  device_type: string;
  language: string;
  timezone: string;
}

interface RealTimeMetrics {
  active_users: number;
  total_page_views: number;
  total_interactions: number;
  total_chatbot_events: number;
  avg_session_duration: number;
  timestamp: string;
}

interface SecureSessionDashboardProps {
  className?: string;
}

const SecureSessionDashboard: React.FC<SecureSessionDashboardProps> = ({ className = '' }) => {
  const [metrics, setMetrics] = useState<RealTimeMetrics>({
    active_users: 0,
    total_page_views: 0,
    total_interactions: 0,
    total_chatbot_events: 0,
    avg_session_duration: 0,
    timestamp: new Date().toISOString()
  });

  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');

  const wsRef = useRef<WebSocket | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);
  const maxRetries = 3;

  // Refs for WebSocket handlers to avoid circular dependencies
  const handleWebSocketMessageRef = useRef<(message: WebSocketMessage) => void>(() => { });
  const scheduleReconnectRef = useRef<() => void>(() => { });
  const fetchDataRef = useRef<() => Promise<void>>(async () => { });
  const connectWebSocketRef = useRef<() => void>(() => { });

  // Fetch data from API
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch metrics and sessions in parallel
      const [metricsResponse, sessionsResponse] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://py-mobiloitte.converiqo.ai'}/api/v1/unified-session-analytics/metrics/real-time`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(10000)
        }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://py-mobiloitte.converiqo.ai'}/api/v1/unified-session-analytics/sessions/active`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(10000)
        })
      ]);

      if (!metricsResponse.ok) {
        throw new Error(`Metrics API error: ${metricsResponse.status}`);
      }
      if (!sessionsResponse.ok) {
        throw new Error(`Sessions API error: ${sessionsResponse.status}`);
      }

      const metricsData = await metricsResponse.json();
      const sessionsData = await sessionsResponse.json();

      if (metricsData.status === 'success') {
        setMetrics(metricsData.data);
      }
      if (sessionsData.status === 'success') {
        setSessions(sessionsData.data);
      }

      setLastUpdated(new Date());

    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Set fetchData ref
  fetchDataRef.current = fetchData;

  // WebSocket message handler
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
        if (message.data && typeof message.data === 'object' && message.data !== null) {
          const metricsData = message.data as unknown as RealTimeMetrics;
          setMetrics(metricsData);
        }
        setLastUpdated(new Date());
        break;
      default:
        console.log('Unknown message type:', message.type);
    }
  }, []);

  // Set handleWebSocketMessage ref
  handleWebSocketMessageRef.current = handleWebSocketMessage;

  // Schedule reconnect function
  const scheduleReconnect = useCallback((): void => {
    if (retryCountRef.current < maxRetries) {
      retryCountRef.current++;
      const delay = Math.pow(2, retryCountRef.current) * 1000; // Exponential backoff
      console.log(`Scheduling WebSocket reconnection in ${delay}ms (attempt ${retryCountRef.current})`);

      retryTimeoutRef.current = setTimeout(() => {
        if (connectWebSocketRef.current) {
          connectWebSocketRef.current();
        }
      }, delay);
    } else {
      console.log('Max WebSocket reconnection attempts reached');
      setConnectionStatus('disconnected');
    }
  }, []);

  // Set scheduleReconnect ref
  scheduleReconnectRef.current = scheduleReconnect;

  // WebSocket connection management
  const connectWebSocket = useCallback((): void => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      setConnectionStatus('connecting');
      wsRef.current = new WebSocket('ws://localhost:8000/api/v1/realtime/ws');

      wsRef.current.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setConnectionStatus('connected');
        retryCountRef.current = 0;
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          if (handleWebSocketMessageRef.current) {
            handleWebSocketMessageRef.current(message);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      wsRef.current.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
        setConnectionStatus('disconnected');
        if (scheduleReconnectRef.current) {
          scheduleReconnectRef.current();
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsConnected(false);
        setConnectionStatus('disconnected');
      };

    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
      if (scheduleReconnectRef.current) {
        scheduleReconnectRef.current();
      }
    }
  }, []);

  // Set connectWebSocket ref
  connectWebSocketRef.current = connectWebSocket;

  // Initial data fetch and WebSocket connection
  useEffect(() => {
    fetchData();
    connectWebSocket();

    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [fetchData, connectWebSocket]);

  // Periodic data refresh (reduced frequency)
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isConnected) {
        fetchData();
      }
    }, 30000); // 30 seconds instead of 3 seconds

    return () => clearInterval(interval);
  }, [fetchData, isConnected]);

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  if (isLoading && !lastUpdated) {
    return (
      <div className={`flex items-center justify-center h-96 ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading session analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-lg p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Activity className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Secure Session Analytics</h2>
            <p className="text-sm text-gray-600">Real-time monitoring with WebSocket updates</p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {/* Connection Status */}
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${connectionStatus === 'connected' ? 'bg-green-500' :
              connectionStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' :
                'bg-red-500'
              }`}></div>
            <span className="text-sm text-gray-600">
              {connectionStatus === 'connected' ? 'WebSocket Connected' :
                connectionStatus === 'connecting' ? 'Connecting...' :
                  'Disconnected'}
            </span>
          </div>

          {/* Last Updated */}
          {lastUpdated && (
            <div className="text-sm text-gray-500">
              <Clock className="w-4 h-4 inline mr-1" />
              {lastUpdated.toLocaleTimeString()}
            </div>
          )}

          {/* Refresh Button */}
          <button
            onClick={fetchData}
            disabled={isLoading}
            className="p-2 text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg"
        >
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
            <span className="text-red-700">{error}</span>
          </div>
        </motion.div>
      )}

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">Active Users</p>
              <p className="text-3xl font-bold text-blue-900">{metrics.active_users}</p>
            </div>
            <Users className="h-8 w-8 text-blue-500" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">Page Views</p>
              <p className="text-3xl font-bold text-green-900">{metrics.total_page_views}</p>
            </div>
            <Eye className="h-8 w-8 text-green-500" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-xl"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-600">Interactions</p>
              <p className="text-3xl font-bold text-purple-900">{metrics.total_interactions}</p>
            </div>
            <MessageCircle className="h-8 w-8 text-purple-500" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-xl"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-600">Avg Duration</p>
              <p className="text-3xl font-bold text-orange-900">{formatDuration(metrics.avg_session_duration)}</p>
            </div>
            <Clock className="h-8 w-8 text-orange-500" />
          </div>
        </motion.div>
      </div>

      {/* Active Sessions Table */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Active Sessions</h3>

        {sessions.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="h-8 w-8 text-gray-400" />
            </div>
            <p className="text-gray-500">No active sessions</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Visitor ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Page
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Device
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Interactions
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sessions.map((session, index) => (
                  <motion.tr
                    key={session.session_id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="hover:bg-gray-50"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                      {session.visitor_id.slice(0, 8)}...
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {session.current_page}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {session.device_type}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDuration(session.total_time_on_site)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {session.interactions.length}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {session.is_active ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          <div className="w-2 h-2 bg-gray-400 rounded-full mr-2"></div>
                          Inactive
                        </span>
                      )}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default SecureSessionDashboard;
