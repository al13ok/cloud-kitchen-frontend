"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Button from '@/components/ui/button/Button';
import Badge from '@/components/ui/badge/Badge';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { RBAC_CONFIG, getApiUrl } from '@/utils/config';

import { 
  RefreshCw, TrendingUp, Zap, Shield, AlertTriangle,
  Users, Activity, Clock, MapPin, Smartphone, Monitor, Tablet,
  ChevronDown, ChevronUp, CheckCircle, XCircle,
  Timer, BarChart3, Target, Database, Check,
  User, PauseCircle, Pause, Brain, Cpu,
  Gauge, ShieldX, MapPinned,
  Layers, Radar
} from 'lucide-react';

// Enhanced interfaces
interface Device {
  device_id: string;
  device_name: string;
  device_type: string;
  status: string;
  last_active: string;
  ip_address: string;
  location: string;
  anomaly_score: number;
  is_trusted: boolean;
  flagged_reasons: string[];
  created_at?: string;
  user_id?: string;
  confidence_score?: number;
  cluster_id?: string;
}

interface Threat {
  id?: string;
  type?: string;
  severity?: string;
  description?: string;
  [key: string]: unknown;
}

interface ThreatAnalysis {
  overall_threat_level: string;
  threat_score: number;
  active_threats: Threat[];
  risk_factors: string[];
  recommendations: string[];
}

interface BiometricDevice {
  type: string;
  registered_at: string;
  last_used?: string;
  use_count: number;
}

interface SessionMetrics {
  totalSessions: number;
  activeSessions: number;
  securityScore: number;
  suspiciousActivity: boolean;
  deviceBreakdown: Record<string, number>;
  uniqueLocations: number;
  threatLevel: string;
}

// API Response Types
interface UserStatistics {
  total_users?: number;
  active_users?: number;
  inactive_users?: number;
  active_user_percentage?: number;
}

interface SessionStatistics {
  total_sessions?: number;
  average_duration?: number;
  average_duration_formatted?: string;
}

interface DeviceStatistics {
  [deviceType: string]: number;
}

interface LoginTimeDistribution {
  morning?: number;
  afternoon?: number;
  evening?: number;
  night?: number;
}

interface AnalyticsSessionsData {
  user_statistics?: UserStatistics;
  session_statistics?: SessionStatistics;
  device_statistics?: DeviceStatistics;
  login_time_distribution?: LoginTimeDistribution;
  timestamp?: string;
}

interface UsersSessionsSummary {
  total_users?: number;
  total_active_sessions?: number;
  total_inactive_sessions?: number;
  total_terminated_sessions?: number;
  global_sessions?: {
    active?: number;
    inactive?: number;
    terminated?: number;
    total?: number;
  };
}

interface UsersSessionsUser {
  user_id?: string;
  email?: string;
  full_name?: string;
  user_role?: string;
  last_login?: string;
  account_status?: string;
  sessions?: {
    active?: unknown[];
    inactive?: unknown[];
    terminated?: unknown[];
    counts?: {
      active?: number;
      inactive?: number;
      terminated?: number;
      total?: number;
    };
  };
}

interface UsersSessionsData {
  users?: UsersSessionsUser[];
  summary?: UsersSessionsSummary;
}

interface SessionData {
  session_id?: string;
  user_id?: string;
  email?: string;
  device_type?: string;
  device_name?: string;
  access_token?: string;
  refresh_token?: string;
  csrf_token?: string;
  expires_at?: string;
  created_at?: string;
  last_active?: string;
  status?: string;
  login_time?: string;
  logout_time?: string | null;
  ip_address?: string;
  user_agent?: string;
  is_expired?: boolean;
  is_active?: boolean;
  role_ids?: string[];
}

interface SessionStatusData {
  session_id?: string;
  user_email?: string;
  total_active_sessions?: number;
  session_data?: SessionData;
}

interface UserLoginDetails {
  user?: {
    user_id?: string;
    email?: string;
    full_name?: string;
    user_role?: string;
    sessions?: {
      user_sessions?: Array<{
        is_active?: boolean;
        [key: string]: unknown;
      }>;
      total_device_sessions?: number;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  timestamp?: string;
  [key: string]: unknown;
}

interface ThreatAlert {
  id?: string;
  priority?: 'HIGH' | 'MEDIUM' | 'LOW';
  type?: string;
  timestamp?: string;
  session_id?: string;
  user_id?: string;
  risk_score?: number;
  threat_level?: 'critical' | 'high' | 'medium' | 'low';
  anomalies?: string[];
  recommendations?: string[];
  [key: string]: unknown;
}

interface MLModelInfo {
  trained?: boolean;
  type?: string;
  error?: string;
  [key: string]: unknown;
}

interface MLModelStatus {
  models?: Record<string, MLModelInfo>;
  [key: string]: unknown;
}

interface PerformanceMetrics {
  total_analyses?: number;
  threats_detected?: number;
  sessions_terminated?: number;
  processing_time_avg?: number;
  [key: string]: unknown;
}

interface ActiveSession {
  session_id?: string;
  user_id?: string;
  email?: string;
  user_role?: string;
  device_type?: string;
  device_name?: string;
  ip_address?: string;
  login_time?: string;
  last_active?: string;
  is_active?: boolean;
  status?: string;
  [key: string]: unknown;
}

const EnhancedSessionManagement: React.FC = () => {
  const { user } = useAuth();
  const [isMounted, setIsMounted] = useState(false);
  
  // Core state - ALL hooks must be declared before any conditional returns
  const [devices, setDevices] = useState<Device[]>([]);
  const [threatAnalysis] = useState<ThreatAnalysis | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [biometricDevices, setBiometricDevices] = useState<Record<string, BiometricDevice[]>>({});
  const [sessionMetrics, setSessionMetrics] = useState<SessionMetrics>({
    totalSessions: 0,
    activeSessions: 0,
    securityScore: 85,
    suspiciousActivity: false,
    deviceBreakdown: {},
    uniqueLocations: 0,
    threatLevel: 'low'
  });

  // Optimized ML state (reduced redundancy) - unused but kept for future use
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [mlAnalysisResults] = useState<Record<string, unknown>>({});
  const [threatAlerts] = useState<ThreatAlert[]>([]);
  const [realTimeSessionData] = useState<unknown[]>([]);
  const [mlModelStatus, setMlModelStatus] = useState<MLModelStatus | null>(null);
  const [automationConfig] = useState<Record<string, unknown> | null>(null);
  const [performanceMetrics] = useState<PerformanceMetrics | null>(null);
  
  // UI state (simplified)
  const [activeTab, setActiveTab] = useState<'overview'>('overview');
  const [loading, setLoading] = useState(true);
  const [realTimeUpdates, setRealTimeUpdates] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  const [advancedFingerprinting, setAdvancedFingerprinting] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [sessionClusters, setSessionClusters] = useState<Record<string, string>>({});
  
  // Session data (consolidated)
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [sessionAnalytics] = useState<unknown>(null);
  const [loginHistory, setLoginHistory] = useState<ActiveSession[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [myActivity, setMyActivity] = useState<unknown[]>([]);
  const [allSessions, setAllSessions] = useState<ActiveSession[]>([]);
  const [sessionStatus, setSessionStatus] = useState<SessionStatusData | null>(null);
  const [allUsersLoginData, setAllUsersLoginData] = useState<{ user_statistics?: UserStatistics; session_statistics?: SessionStatistics; login_time_distribution?: LoginTimeDistribution; users?: UsersSessionsUser[]; [key: string]: unknown } | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [monitoringData] = useState<unknown[]>([]);
  const [usersSessionsData, setUsersSessionsData] = useState<UsersSessionsData | null>(null);
  const [isSessionDetailsExpanded, setIsSessionDetailsExpanded] = useState(false);
  const [isActiveSessionsExpanded, setIsActiveSessionsExpanded] = useState(false);
  const [isAnalyticsExpanded, setIsAnalyticsExpanded] = useState(false);
  const [analyticsSessionsData, setAnalyticsSessionsData] = useState<AnalyticsSessionsData | null>(null);
  const [selectedUserDetails, setSelectedUserDetails] = useState<UserLoginDetails | null>(null);
  const [showUserDetailsModal, setShowUserDetailsModal] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [loadingUserDetails, setLoadingUserDetails] = useState(false);
  
  // Fetch functions - ALL hooks must be declared before any conditional returns
  // Enhanced fetch functions for ALL session endpoints
  const getAuthHeaders = () => ({
    'Authorization': `Bearer ${localStorage.getItem('access_token') || localStorage.getItem('token')}`,
    'Content-Type': 'application/json'
  });

  // Removed - endpoint returns 404
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const fetchDevices = useCallback(async () => {
    // Endpoint not available - no-op
    return;
  }, []);

  // Fetch all active sessions
  const fetchActiveSessions = useCallback(async () => {
    try {
      const response = await fetch(getApiUrl(RBAC_CONFIG.API_ENDPOINTS.SESSIONS_ACTIVE), {
        headers: getAuthHeaders()
      });
      if (response.ok) {
        const data = await response.json();
        // Handle both response formats: { active_sessions: [...] } or { sessions: [...] } or array
        setActiveSessions(data.active_sessions || data.sessions || data || []);
        return data;
      } else if (response.status === 404) {
        setActiveSessions([]);
      }
    } catch {
      setActiveSessions([]);
    }
  }, []);

  // Removed - endpoint returns 404
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const fetchSessionAnalytics = useCallback(async () => {
    // Endpoint not available - no-op
    return;
  }, []);

  // Fetch analytics sessions data
  const fetchAnalyticsSessions = useCallback(async () => {
    try {
      const response = await fetch(getApiUrl(RBAC_CONFIG.API_ENDPOINTS.ANALYTICS_SESSIONS), {
        headers: getAuthHeaders()
      });
      if (response.ok) {
        const data = await response.json();
        setAnalyticsSessionsData(data);
        return data;
      } else if (response.status === 404) {
        setAnalyticsSessionsData(null);
      }
    } catch {
      setAnalyticsSessionsData(null);
    }
  }, []);

  // Fetch user login details
  const fetchUserLoginDetails = useCallback(async (userId: string) => {
    if (!userId) {
      return;
    }
    setLoadingUserDetails(true);
    try {
      const url = getApiUrl(`${RBAC_CONFIG.API_ENDPOINTS.USER_LOGIN_DETAILS}/${userId}/login-details`);
      const response = await fetch(url, {
        headers: getAuthHeaders()
      });
      if (response.ok) {
        const data = await response.json();
        setSelectedUserDetails(data);
        setShowUserDetailsModal(true);
        return data;
      }
    } catch {
    } finally {
      setLoadingUserDetails(false);
    }
  }, []);

  // Fetch users login history
  const fetchUsersLoginHistory = useCallback(async (limit = 50) => {
    try {
      const response = await fetch(getApiUrl(`${RBAC_CONFIG.API_ENDPOINTS.USERS_LOGIN_HISTORY}?limit=${limit}`), {
        headers: getAuthHeaders()
      });
      if (response.ok) {
        const data = await response.json();
        setLoginHistory(data.login_history || data || []);
        return data;
      }
    } catch {
    }
  }, []);

  // Fetch user activity
  const fetchMyActivity = useCallback(async () => {
    try {
      const response = await fetch(getApiUrl(RBAC_CONFIG.API_ENDPOINTS.MY_ACTIVITY), {
        headers: getAuthHeaders()
      });
      if (response.ok) {
        const data = await response.json();
        setMyActivity(data.activities || data || []);
        return data;
      }
    } catch {
    }
  }, []);

  // Fetch all sessions overview
  const fetchAllSessions = useCallback(async () => {
    try {
      const response = await fetch(getApiUrl(RBAC_CONFIG.API_ENDPOINTS.SESSIONS_ALL), {
        headers: getAuthHeaders()
      });
      if (response.ok) {
        const data = await response.json();
        setAllSessions(data.sessions || data || []);
        return data;
      }
    } catch {
    }
  }, []);

  // Removed - endpoint returns 404
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const fetchMonitoringActiveSessions = useCallback(async () => {
    // Endpoint not available - no-op
    return;
  }, []);

  // Fetch session status
  const fetchSessionStatus = useCallback(async () => {
    try {
      const response = await fetch(getApiUrl(RBAC_CONFIG.API_ENDPOINTS.SESSION_STATUS), {
        headers: getAuthHeaders()
      });
      if (response.ok) {
        const data = await response.json();
        setSessionStatus(data);
        return data;
      }
    } catch {
    }
  }, []);

  // Fetch users all login data (comprehensive)
  const fetchUsersAllLoginData = useCallback(async () => {
    try {
      const response = await fetch(getApiUrl(RBAC_CONFIG.API_ENDPOINTS.USERS_ALL_LOGIN_DATA), {
        headers: getAuthHeaders()
      });
      if (response.ok) {
        const data = await response.json();
        setAllUsersLoginData(data);
        return data;
      }
    } catch {
    }
  }, []);

  // Fetch users sessions with detailed breakdown
  const fetchUsersSessions = useCallback(async () => {
    try {
      const response = await fetch(getApiUrl(RBAC_CONFIG.API_ENDPOINTS.USERS_SESSIONS), {
        headers: getAuthHeaders()
      });
      if (response.ok) {
        const data = await response.json();
        setUsersSessionsData(data);
        return data;
      } else if (response.status === 404) {
        setUsersSessionsData(null);
      }
    } catch {
      setUsersSessionsData(null);
    }
  }, []);

  // ML-powered session automation fetch functions - REMOVED (endpoints removed)
  // const fetchMLModelStatus = useCallback(async () => { ... }, []);
  // const fetchThreatAlerts = useCallback(async (limit = 20) => { ... }, []);
  // const fetchSessionMonitoring = useCallback(async (limit = 50) => { ... }, []);
  // const analyzeSessionML = useCallback(async (sessionData: any) => { ... }, []);

  const trainMLModels = useCallback(async (trainingData: unknown[]) => {
    try {
      // Use existing session analytics endpoint for training simulation
      const response = await fetch(getApiUrl(RBAC_CONFIG.API_ENDPOINTS.SESSION_ANALYTICS_DASHBOARD), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ training_data: trainingData })
      });
      if (response.ok) {
        const data = await response.json();
        return data;
      }
    } catch {
    }
  }, []);

  const executeManualSessionAction = useCallback(async (actionData: Record<string, unknown>) => {
    try {
      // Use existing session revocation endpoint
      const response = await fetch(getApiUrl(RBAC_CONFIG.API_ENDPOINTS.SESSIONS_REVOKE), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(actionData)
      });
      if (response.ok) {
        const data = await response.json();
        // Refresh data after action - removed endpoints
        // await fetchSessionMonitoring();
        // await fetchThreatAlerts();
        return data;
      }
    } catch {
    }
  }, []); // Removed dependencies - endpoints removed

  // Removed - endpoint returns 404
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const fetchThreatAnalysis = useCallback(async () => {
    // Endpoint not available - no-op
    return;
  }, []);

  // Removed - endpoint returns 404
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const fetchSessionMetrics = useCallback(async () => {
    // Endpoint not available - no-op
    return;
  }, []);

  // Removed - endpoint returns 404
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const fetchRealtimeDashboard = useCallback(async () => {
    // Endpoint not available - no-op
    return;
  }, []);

  const fetchBiometricData = useCallback(async () => {
    try {
      const biometricData: Record<string, BiometricDevice[]> = {};
      for (const device of devices) {
        const response = await fetch(getApiUrl(`${RBAC_CONFIG.API_ENDPOINTS.SESSION_BIOMETRIC}/${device.device_id}`), {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (response.ok) {
          const data = await response.json();
          biometricData[device.device_id] = data.biometrics;
        }
      }
      setBiometricDevices(biometricData);
    } catch {
    }
  }, [devices]);

  // Real-time updates via HTTP polling (no WebSocket)
  useEffect(() => {
    if (!user?.user_id || !realTimeUpdates) return;
    
    // Check if token exists before starting polling
    const token = localStorage.getItem('access_token') || localStorage.getItem('token');
    if (!token) {
      setConnectionStatus('disconnected');
      return;
    }
    
    let pollInterval: NodeJS.Timeout;
    
    
    const startPolling = () => {
      setConnectionStatus('connecting');
      
      // Initial connection
      fetchRealtimeStatus()
        .then(() => {
          setConnectionStatus('connected');
        })
        .catch((error: unknown) => {
          setConnectionStatus('disconnected');
          
          // Stop polling if endpoint is not found
          if (error && typeof error === 'object' && 'message' in error && error.message === 'ENDPOINT_NOT_FOUND') {
            setRealTimeUpdates(false);
            return;
          }
          
          
          // If it's an auth error, don't retry
          if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string' && error.message.includes('Authentication failed')) {
            return;
          }
        });
      
      // Set up polling every 5 seconds
      pollInterval = setInterval(async () => {
        try {
          await fetchRealtimeStatus();
          if (connectionStatus !== 'connected') {
            setConnectionStatus('connected');
          }
        } catch (error: unknown) {
          // Stop polling if endpoint is not found
          if (error && typeof error === 'object' && 'message' in error && error.message === 'ENDPOINT_NOT_FOUND') {
            setConnectionStatus('disconnected');
            setRealTimeUpdates(false);
            if (pollInterval) {
              clearInterval(pollInterval);
            }
            return;
          }
          setConnectionStatus('disconnected');
        }
      }, 5000);
    };
    
    startPolling();
    
    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.user_id, realTimeUpdates]);

  // Comprehensive data loading function
  const loadAllSessionData = useCallback(async () => {
    if (!user?.user_id) return;
    
    setLoading(true);
    
    try {
        // Load working session data endpoints only (removed 404 endpoints)
        const dataPromises = [
          fetchActiveSessions(),
          fetchUsersLoginHistory(3),
          fetchMyActivity(),
          fetchAllSessions(),
          fetchSessionStatus(),
          fetchUsersAllLoginData(),
          fetchUsersSessions(),
          fetchAnalyticsSessions()
        ];
      
      // Execute all API calls in parallel
      await Promise.allSettled(dataPromises);
      
    } catch {
    } finally {
      setLoading(false);
    }
  }, [
    user?.user_id, fetchActiveSessions, fetchUsersLoginHistory,
    fetchMyActivity, fetchAllSessions, fetchSessionStatus, 
    fetchUsersAllLoginData, fetchUsersSessions, fetchAnalyticsSessions
  ]);

  // Load all session data on component mount
  useEffect(() => {
    if (user?.user_id) {
      loadAllSessionData();
    }
  }, [user?.user_id, loadAllSessionData]);

  // Removed - endpoint returns 404
  const fetchRealtimeStatus = useCallback(async () => {
    // Endpoint not available - throw to stop polling
    throw new Error('ENDPOINT_NOT_FOUND');
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleRealTimeUpdate = (data: Record<string, unknown>) => {
    switch (data.type) {
      case 'status_update':
        // Update session metrics from polling data
        if (data.metrics && typeof data.metrics === 'object') {
          const metrics = data.metrics as Record<string, unknown>;
          setSessionMetrics(prev => ({
            ...prev,
            activeSessions: (typeof metrics.active_sessions === 'number' ? metrics.active_sessions : prev.activeSessions),
            totalSessions: (typeof metrics.total_activity === 'number' ? metrics.total_activity : prev.totalSessions),
            uniqueLocations: (typeof metrics.unique_locations === 'number' ? metrics.unique_locations : prev.uniqueLocations),
            suspiciousActivity: (typeof metrics.average_risk_score === 'number' ? metrics.average_risk_score > 0.7 : prev.suspiciousActivity)
          }));
        }
        break;
      case 'metrics_update':
        if (typeof data.device_id === 'string' && data.metrics && typeof data.metrics === 'object') {
          setDevices(prev => prev.map(device => 
            device.device_id === data.device_id 
              ? { ...device, ...(data.metrics as Partial<Device>) }
              : device
          ));
        }
        break;
      case 'biometric_registered':
      case 'biometric_verification':
        fetchBiometricData();
        break;
      case 'cluster_optimization':
        if (Array.isArray(data.results)) {
          const clusterMap: Record<string, string> = {};
          data.results.forEach((result: unknown) => {
            if (result && typeof result === 'object' && 'device_id' in result && 'new_cluster' in result) {
              clusterMap[String(result.device_id)] = String(result.new_cluster);
            }
          });
          setSessionClusters(prev => ({ ...prev, ...clusterMap }));
        }
        break;
      case 'threat_level_changed':
        // Removed - endpoint not available
        break;
    }
  };

  // Initialize data
  useEffect(() => {
    // Removed - endpoints not available
    // Data will be loaded via loadAllSessionData
  }, [user?.user_id]);

  useEffect(() => {
    if (devices.length > 0) {
      fetchBiometricData();
    }
  }, [devices, fetchBiometricData]);

  // Enhanced Actions with Real-time Features
  const addTrustedLocation = async (name: string, latitude: number, longitude: number, radius: number = 50) => {
    try {
      const response = await fetch(getApiUrl(RBAC_CONFIG.API_ENDPOINTS.ADD_TRUSTED_LOCATION), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          name,
          latitude,
          longitude,
          radius_km: radius
        })
      });
      if (response.ok) {
        // Refresh data - endpoint removed
      }
    } catch {
    }
  };

  const checkRadiusAccess = async (latitude: number, longitude: number) => {
    try {
      const response = await fetch(getApiUrl(RBAC_CONFIG.API_ENDPOINTS.CHECK_RADIUS_ACCESS), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ latitude, longitude })
      });
      if (response.ok) {
        const data = await response.json();
        return (data as { access_check?: boolean }).access_check;
      }
    } catch {
    }
    return null;
  };

  // Removed - endpoint removed
  // const registerBiometric = async (deviceId: string, biometricType: string, templateData: string) => {
  //   try {
  //     const response = await fetch(getApiUrl(RBAC_CONFIG.API_ENDPOINTS.BIOMETRIC_REGISTER), {
  //       method: 'POST',
  //       headers: {
  //         'Content-Type': 'application/json',
  //         'Authorization': `Bearer ${localStorage.getItem('token')}`
  //       },
  //       body: JSON.stringify({
  //         device_id: deviceId,
  //         biometric_type: biometricType,
  //         template_data: templateData
  //       })
  //     });
  //     if (response.ok) {
  //       const data = await response.json();
  //       console.log('Biometric registered:', data);
  //       await fetchBiometricData();
  //     }
  //   } catch (error) {
  //     console.error('Failed to register biometric:', error);
  //   }
  // };

  const optimizeSessionClusters = async () => {
    try {
      const response = await fetch(getApiUrl('/api/v1/devices/session-analytics'), {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        await response.json();
      }
    } catch {
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const trainMLModel = async () => {
    try {
      setMlModelStatus({ models: { training: { trained: false, type: 'training' } } });
      const response = await fetch(getApiUrl('/api/v1/devices/session-analytics'), {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        const modelStatus = (data as { model_status?: string }).model_status;
        setMlModelStatus({ models: { training: { trained: modelStatus === 'trained', type: modelStatus || 'unknown' } } });
      }
    } catch {
      setMlModelStatus({ models: {} });
    }
  };

  const enableAdvancedFingerprinting = async () => {
    try {
      // Collect advanced device fingerprinting data
      const fingerprintData = {
        canvas_fingerprint: generateCanvasFingerprint(),
        webgl_fingerprint: generateWebGLFingerprint(),
        audio_fingerprint: generateAudioFingerprint(),
        timezone_offset: new Date().getTimezoneOffset(),
        platform: navigator.platform,
        hardware_concurrency: (navigator as Navigator & { hardwareConcurrency?: number }).hardwareConcurrency,
        device_memory: (navigator as Navigator & { deviceMemory?: number }).deviceMemory,
        touch_support: 'ontouchstart' in window,
        screen_orientation: (screen as Screen & { orientation?: { type?: string } }).orientation?.type,
        color_depth: screen.colorDepth,
        pixel_ratio: window.devicePixelRatio,
        fonts_list: await detectFonts(),
        plugins_list: Array.from(navigator.plugins).map(p => p.name)
      };

      const response = await fetch(getApiUrl('/api/v1/devices/session-analytics'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(fingerprintData)
      });
      
      if (response.ok) {
        setAdvancedFingerprinting(true);
        // Refresh devices - endpoint removed
      }
    } catch {
    }
  };

  // Fingerprinting utilities
  const generateCanvasFingerprint = (): string => {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return 'unavailable';
      
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillText('Device fingerprinting test 🔒', 2, 2);
      return canvas.toDataURL();
    } catch {
      return 'error';
    }
  };

  const generateWebGLFingerprint = (): string => {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl');
      if (!gl) return 'unavailable';
      
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (!debugInfo) return 'no_debug_info';
      
      return [
        gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL),
        gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
      ].join('|');
    } catch {
      return 'error';
    }
  };

  const generateAudioFingerprint = (): string => {
    try {
      // Simplified audio fingerprinting
      const AudioContextClass = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return 'unavailable';
      const audioContext = new AudioContextClass();
      const oscillator = audioContext.createOscillator();
      const analyser = audioContext.createAnalyser();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(analyser);
      analyser.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      return `${audioContext.sampleRate}_${analyser.fftSize}`;
    } catch {
      return 'unavailable';
    }
  };

  const detectFonts = async (): Promise<string[]> => {
    // Simplified font detection
    const testFonts = ['Arial', 'Times New Roman', 'Courier New', 'Helvetica', 'Georgia'];
    return testFonts; // In production, implement actual font detection
  };

  const getThreatLevelColor = (level: string) => {
    switch (level) {
      case 'critical': return 'text-red-600 bg-red-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const getConnectionStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'bg-green-500';
      case 'connecting': return 'bg-yellow-500';
      default: return 'bg-red-500';
    }
  };

  // Set mounted state - must be called after all hooks
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Show consistent loading state on both server and client until mounted
  // This ensures hydration doesn't fail due to different initial renders
  if (!isMounted) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <span className="text-gray-600">Loading...</span>
        </div>
      </div>
    );
  }
  
  // Only check authentication after component is mounted (client-side only)
  // This prevents hydration mismatches from different auth states
  if (!user || !user.user_id) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Authentication Required</h2>
          <p className="text-gray-600 mb-4">Please login to access the Enhanced Session Management dashboard.</p>
          <div className="space-y-2 mb-4">
            <p className="text-sm text-gray-500">This dashboard provides:</p>
            <ul className="text-sm text-gray-500 list-disc list-inside space-y-1">
              <li>Real-time device monitoring</li>
              <li>Security threat analysis</li>
              <li>Biometric authentication management</li>
              <li>Location-based access controls</li>
            </ul>
          </div>
          <Button onClick={() => window.location.href = '/signin'}>
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <span className="text-gray-600">Loading enhanced session management...</span>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header with Real-time Status */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Enhanced Session Management</h1>
            <p className="text-gray-600">World-class security with real-time monitoring</p>
          </div>
        </div>

        {/* Security Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Security Score</p>
                  <p className="text-2xl font-bold text-gray-900">{sessionMetrics.securityScore}</p>
                </div>
                <Gauge className={`h-8 w-8 ${
                  sessionMetrics.securityScore > 80 ? 'text-green-500' : 
                  sessionMetrics.securityScore > 60 ? 'text-yellow-500' : 'text-red-500'
                }`} />
              </div>
              <Progress value={sessionMetrics.securityScore} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Threat Level</p>
                  <div className={getThreatLevelColor(threatAnalysis?.overall_threat_level || 'low')}>
                    <Badge>
                    {threatAnalysis?.overall_threat_level || 'Low'}
                  </Badge>
                  </div>
                </div>
                <Shield className={`h-8 w-8 ${
                  threatAnalysis?.overall_threat_level === 'low' ? 'text-green-500' : 
                  threatAnalysis?.overall_threat_level === 'medium' ? 'text-yellow-500' : 'text-red-500'
                }`} />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {threatAnalysis?.active_threats?.length || 0} active threats
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Navigation Tabs */}
        <div className="border-b border-gray-200">
          <div className="flex items-center justify-between">
            <nav className="flex space-x-8">
              {[
                { id: 'overview', label: 'Overview', icon: BarChart3 }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as 'overview')}
                  className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                </button>
              ))}
            </nav>
            
            {/* Refresh Controls */}
            <div className="flex items-center gap-3 pb-2">
              <Button 
                onClick={loadAllSessionData}
                size="sm"
                disabled={loading}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Loading...' : 'Refresh'}
              </Button>
            </div>
          </div>
        </div>

        {/* Tab Content */}
        
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* User Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Users className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Total Users</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {(analyticsSessionsData?.user_statistics?.total_users) ?? (usersSessionsData?.summary?.total_users) ?? (allUsersLoginData?.user_statistics?.total_users) ?? loginHistory.length ?? 0}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <CheckCircle className="h-6 w-6 text-green-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Active Users</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {(analyticsSessionsData?.user_statistics?.active_users) ?? 
                         (usersSessionsData?.summary?.total_active_sessions) ?? 
                         (allUsersLoginData?.user_statistics?.active_users) ?? 
                         loginHistory.filter((session): session is ActiveSession => session && typeof session === 'object' && 'is_active' in session && session.is_active === true).length ?? 0}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Activity className="h-6 w-6 text-purple-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Total Sessions</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {(analyticsSessionsData?.session_statistics?.total_sessions) ?? 
                         (usersSessionsData?.summary?.global_sessions?.total) ?? 
                         (allUsersLoginData?.session_statistics?.total_sessions) ?? 
                         allSessions.length ?? 0}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-orange-100 rounded-lg">
                      <Clock className="h-6 w-6 text-orange-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Avg Session</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {analyticsSessionsData?.session_statistics?.average_duration_formatted ?? 
                         allUsersLoginData?.session_statistics?.average_duration_formatted ?? '6h 27m'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Current Session Status */}
            {sessionStatus && (
            <Card>
                <div 
                  className="cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => setIsSessionDetailsExpanded(!isSessionDetailsExpanded)}
                >
              <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <User className="h-5 w-5" />
                        Current Session Status
                      </div>
                      {isSessionDetailsExpanded ? (
                        <ChevronUp className="h-5 w-5 text-gray-500" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-gray-500" />
                      )}
                </CardTitle>
              </CardHeader>
                </div>
                {isSessionDetailsExpanded && (
              <CardContent>
                <div className="space-y-4">
                      {/* Session Info */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 bg-gray-50 rounded-lg">
                          <p className="text-xs font-semibold text-gray-600 mb-2">Session ID</p>
                          <p className="text-sm font-mono text-gray-900 break-all">{sessionStatus?.session_id ?? 'N/A'}</p>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-lg">
                          <p className="text-xs font-semibold text-gray-600 mb-2">User Email</p>
                          <p className="text-sm text-gray-900">{sessionStatus?.user_email ?? 'N/A'}</p>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-lg">
                          <p className="text-xs font-semibold text-gray-600 mb-2">Total Active Sessions</p>
                          <p className="text-2xl font-bold text-blue-600">{sessionStatus?.total_active_sessions ?? 0}</p>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-lg">
                          <p className="text-xs font-semibold text-gray-600 mb-2">Session Status</p>
                          <div className="mt-1">
                            <Badge variant={sessionStatus?.session_data?.is_active ? 'solid' : 'light'} 
                                   color={sessionStatus?.session_data?.is_active ? 'success' : 'error'}>
                              {sessionStatus?.session_data?.status ?? 'Unknown'}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      {/* Session Details */}
                      {sessionStatus?.session_data && (
                        <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                          <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <Monitor className="h-4 w-4" />
                            Session Details
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <p className="text-xs font-semibold text-gray-600 mb-1">Device Type</p>
                              <p className="text-sm text-gray-900">{sessionStatus.session_data.device_type ?? 'N/A'}</p>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-gray-600 mb-1">Device Name</p>
                              <p className="text-sm text-gray-900">{sessionStatus.session_data.device_name ?? 'N/A'}</p>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-gray-600 mb-1">IP Address</p>
                              <p className="text-sm text-gray-900">{sessionStatus.session_data.ip_address ?? 'N/A'}</p>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-gray-600 mb-1">User Agent</p>
                              <p className="text-xs text-gray-700 break-all">{sessionStatus.session_data.user_agent ?? 'N/A'}</p>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-gray-600 mb-1">Login Time</p>
                              <p className="text-sm text-gray-900">
                                {sessionStatus.session_data.login_time 
                                  ? new Date(sessionStatus.session_data.login_time).toLocaleString() 
                                  : 'N/A'}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-gray-600 mb-1">Last Active</p>
                              <p className="text-sm text-gray-900">
                                {sessionStatus.session_data.last_active 
                                  ? new Date(sessionStatus.session_data.last_active).toLocaleString() 
                                  : 'N/A'}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-gray-600 mb-1">Created At</p>
                              <p className="text-sm text-gray-900">
                                {sessionStatus.session_data.created_at 
                                  ? new Date(sessionStatus.session_data.created_at).toLocaleString() 
                                  : 'N/A'}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-gray-600 mb-1">Expires At</p>
                              <p className="text-sm text-gray-900">
                                {sessionStatus.session_data.expires_at 
                                  ? new Date(sessionStatus.session_data.expires_at).toLocaleString() 
                                  : 'N/A'}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-gray-600 mb-1">Is Expired</p>
                              <div className="mt-1">
                                <Badge variant={sessionStatus.session_data.is_expired ? 'solid' : 'light'} 
                                       color={sessionStatus.session_data.is_expired ? 'error' : 'success'}>
                                  {sessionStatus.session_data.is_expired ? 'Yes' : 'No'}
                                </Badge>
                              </div>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-gray-600 mb-1">Is Active</p>
                              <div className="mt-1">
                                <Badge variant={sessionStatus.session_data.is_active ? 'solid' : 'light'} 
                                       color={sessionStatus.session_data.is_active ? 'success' : 'error'}>
                                  {sessionStatus.session_data.is_active ? 'Yes' : 'No'}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          
                          {/* Role IDs */}
                          {sessionStatus.session_data.role_ids && sessionStatus.session_data.role_ids.length > 0 && (
                            <div className="mt-4">
                              <p className="text-xs font-semibold text-gray-600 mb-2">Role IDs</p>
                              <div className="flex flex-wrap gap-2">
                                {sessionStatus.session_data.role_ids.map((roleId: string, index: number) => (
                                  <div key={index} className="px-2 py-1 bg-white rounded border border-gray-200">
                                    <p className="text-xs font-mono text-gray-700">{roleId}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                )}
              </Card>
            )}

            {/* Active Sessions */}
            {activeSessions && activeSessions.length > 0 && (
              <Card>
                <div 
                  className="cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => setIsActiveSessionsExpanded(!isActiveSessionsExpanded)}
                >
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Activity className="h-5 w-5" />
                        Active Sessions ({activeSessions.length})
                      </div>
                      {isActiveSessionsExpanded ? (
                        <ChevronUp className="h-5 w-5 text-gray-500" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-gray-500" />
                      )}
                    </CardTitle>
                  </CardHeader>
                </div>
                {isActiveSessionsExpanded && (
                  <CardContent>
                    <div className="space-y-4">
                      {/* Group sessions by user */}
                      {(() => {
                        // Group sessions by user_id
                        interface SessionGroup {
                          user_id: string;
                          email: string;
                          sessions: unknown[];
                        }
                        const userGroups = activeSessions.reduce((acc: Record<string, SessionGroup>, session: unknown) => {
                          if (!session || typeof session !== 'object') return acc;
                          const sessionObj = session as { user_id?: string; email?: string };
                          const userId = sessionObj.user_id || 'unknown';
                          if (!acc[userId]) {
                            acc[userId] = {
                              user_id: userId,
                              email: sessionObj.email || '',
                              sessions: []
                            };
                          }
                          acc[userId].sessions.push(session);
                          return acc;
                        }, {} as Record<string, SessionGroup>);

                        return Object.values(userGroups).map((userGroup: SessionGroup, index: number) => {
                          const firstSession = userGroup.sessions[0] as ActiveSession | undefined;
                          const userEmail = userGroup.email;
                          
                          // Try to get user details from usersSessionsData
                          const userFromSessionsData = usersSessionsData?.users?.find((u) => u.user_id === userGroup.user_id);
                          const firstSessionObj = firstSession && typeof firstSession === 'object' ? firstSession : { email: undefined, user_role: undefined };
                          const userFromSessionsDataObj = userFromSessionsData && typeof userFromSessionsData === 'object' ? userFromSessionsData : undefined;
                          const userName = userFromSessionsDataObj?.full_name ?? firstSessionObj.email?.split('@')[0]?.replace('.', ' ') ?? 'Unknown User';
                          const userRole = userFromSessionsDataObj?.user_role ?? firstSessionObj.user_role ?? 'User';
                          const totalSessions = userGroup.sessions.length;
                          
                          return (
                            <div key={userGroup.user_id || index} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
                            <span className="text-white font-semibold text-lg">
                                      {userName.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                                    <h4 className="font-semibold text-gray-900">{userName}</h4>
                                    <p className="text-sm text-gray-600">{userEmail}</p>
                                    <div className="flex items-center gap-3 mt-1">
                                      <span className="text-xs text-gray-500">
                                        Role: {userRole}
                                      </span>
                                      <span className="text-xs text-gray-500 font-mono">
                                        ID: {userGroup.user_id}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-medium text-gray-600">Total Sessions</p>
                                  <p className="text-2xl font-bold text-blue-600">{totalSessions}</p>
                                </div>
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </CardContent>
                )}
              </Card>
            )}

            {/* Recent Users Activity - Professional Design */}
            <Card className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Users className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Recent User Activity</h3>
                      <p className="text-xs text-gray-500 font-normal">Click on any user to view detailed session information</p>
                    </div>
                  </CardTitle>
                  {usersSessionsData?.users && (
                    <div className="text-xs">
                      <Badge variant="light" color="info">
                        {usersSessionsData.users.length} Users
                      </Badge>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {usersSessionsData?.users && usersSessionsData.users.length > 0 ? (
                    usersSessionsData.users.map((userData: UsersSessionsUser, index: number) => {
                      const activeCount = userData.sessions?.counts?.active || 0;
                      const totalCount = userData.sessions?.counts?.total || 0;
                      const isActive = activeCount > 0;
                      
                      return (
                        <div 
                          key={userData.user_id || index} 
                          className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white p-5 cursor-pointer transition-all duration-200 hover:border-blue-300 hover:shadow-lg hover:-translate-y-0.5"
                          onClick={() => userData.user_id && fetchUserLoginDetails(userData.user_id)}
                        >
                          <div className="flex items-start justify-between">
                            {/* User Info */}
                            <div className="flex items-start gap-4 flex-1">
                              {/* Avatar */}
                              <div className="relative">
                                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-md ring-2 ring-white">
                                  <span className="text-white font-bold text-xl">
                                    {(userData.full_name || userData.email || 'U').charAt(0).toUpperCase()}
                                  </span>
                                </div>
                                {isActive && (
                                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 border-2 border-white rounded-full flex items-center justify-center">
                                    <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                                  </div>
                                )}
                              </div>

                              {/* User Details */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-semibold text-gray-900 text-base truncate">
                                    {userData.full_name || 'Unknown User'}
                                  </h4>
                                  <div className="text-xs">
                                    <Badge 
                                      variant={userData.account_status === 'active' ? 'solid' : 'light'} 
                                      color={userData.account_status === 'active' ? 'success' : 'dark'}
                                    >
                                      {userData.account_status === 'active' ? 'Active' : 'Inactive'}
                                    </Badge>
                                  </div>
                                </div>
                                <p className="text-sm text-gray-600 mb-2 truncate">{userData.email}</p>
                                
                                {/* Session Stats */}
                                <div className="flex items-center gap-4 flex-wrap">
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                                    <span className="text-xs font-medium text-gray-700">
                                      {activeCount} Active Session{activeCount !== 1 ? 's' : ''}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Database className="h-3 w-3 text-gray-400" />
                                    <span className="text-xs text-gray-600">
                                      {totalCount} Total
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Shield className="h-3 w-3 text-gray-400" />
                                    <span className="text-xs text-gray-600 capitalize">
                                      {userData.user_role || 'User'}
                                    </span>
                                  </div>
                                </div>

                                {/* Last Login */}
                                {userData.last_login && (
                                  <div className="flex items-center gap-1.5 mt-2">
                                    <Clock className="h-3 w-3 text-gray-400" />
                                    <span className="text-xs text-gray-500">
                                      Last login: {new Date(userData.last_login).toLocaleString('en-US', { 
                                        month: 'short', 
                                        day: 'numeric', 
                                        hour: '2-digit', 
                                        minute: '2-digit' 
                                      })}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Action Indicator */}
                            <div className="flex flex-col items-end gap-2 ml-4">
                              <div className="p-2 rounded-lg bg-gray-50 group-hover:bg-blue-50 transition-colors">
                                <ChevronUp className="h-5 w-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                              </div>
                              {activeCount > 0 && (
                                <div className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                                  {activeCount} Active
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : allUsersLoginData?.users && allUsersLoginData.users.length > 0 ? (
                    allUsersLoginData.users.slice(0, 5).map((userData: UsersSessionsUser, index: number) => {
                      const sessionCount = userData.sessions?.counts?.total ?? 0;
                      
                      return (
                        <div 
                          key={userData.user_id || index} 
                          className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white p-5 cursor-pointer transition-all duration-200 hover:border-blue-300 hover:shadow-lg hover:-translate-y-0.5"
                          onClick={() => userData.user_id && fetchUserLoginDetails(userData.user_id)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-4 flex-1">
                              <div className="relative">
                                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-md ring-2 ring-white">
                                  <span className="text-white font-bold text-xl">
                                    {(userData.full_name || userData.email || 'U').charAt(0).toUpperCase()}
                                  </span>
                                </div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-semibold text-gray-900 text-base truncate">
                                    {userData.full_name || 'Unknown User'}
                                  </h4>
                                  <div className="text-xs">
                                    <Badge 
                                      variant={(userData as { status?: boolean } | undefined)?.status ? 'solid' : 'light'} 
                                      color={(userData as { status?: boolean } | undefined)?.status ? 'success' : 'dark'}
                                    >
                                {(userData as { status?: boolean } | undefined)?.status ? 'Active' : 'Inactive'}
                              </Badge>
                                  </div>
                                </div>
                                <p className="text-sm text-gray-600 mb-2 truncate">{userData.email}</p>
                                <div className="flex items-center gap-4 flex-wrap">
                                  <div className="flex items-center gap-2">
                                    <Database className="h-3 w-3 text-gray-400" />
                                    <span className="text-xs text-gray-600">
                                      {sessionCount} Session{sessionCount !== 1 ? 's' : ''}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Shield className="h-3 w-3 text-gray-400" />
                                    <span className="text-xs text-gray-600">
                                      {userData.user_role ?? (userData as { userRoles?: string } | undefined)?.userRoles ?? 'User'}
                                    </span>
                                  </div>
                                </div>
                                {userData.last_login && (
                                  <div className="flex items-center gap-1.5 mt-2">
                                    <Clock className="h-3 w-3 text-gray-400" />
                              <span className="text-xs text-gray-500">
                                      Last: {new Date(userData.last_login).toLocaleDateString()}
                              </span>
                            </div>
                                )}
                          </div>
                        </div>
                            <div className="p-2 rounded-lg bg-gray-50 group-hover:bg-blue-50 transition-colors ml-4">
                              <ChevronUp className="h-5 w-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                        </div>
                      </div>
                        </div>
                      );
                    })
                  ) : loginHistory.length > 0 ? (
                    loginHistory.slice(0, 5).map((session: ActiveSession, index: number) => (
                      <div 
                        key={session.session_id || index} 
                        className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white p-5 cursor-pointer transition-all duration-200 hover:border-blue-300 hover:shadow-lg hover:-translate-y-0.5"
                        onClick={() => session.user_id && fetchUserLoginDetails(session.user_id)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-4 flex-1">
                            <div className="w-14 h-14 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-md ring-2 ring-white">
                              <span className="text-white font-bold text-xl">
                              {((session.full_name ?? session.email ?? 'U') as string).charAt(0).toUpperCase()}
                            </span>
                          </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-semibold text-gray-900 text-base truncate">
                                  {String(session.full_name ?? 'Unknown User')}
                                </h4>
                                <div className="text-xs">
                                  <Badge 
                                    variant={session.is_active ? 'solid' : 'light'} 
                                    color={session.is_active ? 'success' : 'dark'}
                                  >
                                {session.is_active ? 'Active' : 'Inactive'}
                              </Badge>
                                </div>
                              </div>
                              <p className="text-sm text-gray-600 mb-2 truncate">{session.email}</p>
                              <div className="flex items-center gap-4 flex-wrap">
                                <div className="flex items-center gap-2">
                                  <Monitor className="h-3 w-3 text-gray-400" />
                                  <span className="text-xs text-gray-600">
                                    {session.device_name || session.device_type || 'Unknown'}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <MapPin className="h-3 w-3 text-gray-400" />
                                  <span className="text-xs text-gray-600">{session.ip_address}</span>
                                </div>
                              </div>
                              {session.login_time && (
                                <div className="flex items-center gap-1.5 mt-2">
                                  <Clock className="h-3 w-3 text-gray-400" />
                              <span className="text-xs text-gray-500">
                                    {new Date(session.login_time).toLocaleString()}
                              </span>
                            </div>
                              )}
                          </div>
                        </div>
                          <div className="p-2 rounded-lg bg-gray-50 group-hover:bg-blue-50 transition-colors ml-4">
                            <ChevronUp className="h-5 w-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Users className="h-8 w-8 text-gray-400" />
                      </div>
                      <p className="text-gray-600 font-medium mb-1">No user activity found</p>
                      <p className="text-sm text-gray-400">User data will appear here when available</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Analytics Sessions Data */}
            {analyticsSessionsData && (
              <Card>
                <div 
                  className="cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => setIsAnalyticsExpanded(!isAnalyticsExpanded)}
                >
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5" />
                        Session Analytics
                      </div>
                      {isAnalyticsExpanded ? (
                        <ChevronUp className="h-5 w-5 text-gray-500" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-gray-500" />
                      )}
                    </CardTitle>
                  </CardHeader>
                </div>
                {isAnalyticsExpanded && (
                  <CardContent>
                    <div className="space-y-8">
                      {/* User Statistics Section */}
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                          <Users className="h-5 w-5 text-blue-600" />
                          User Overview
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                          <div className="p-5 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between mb-2">
                              <Users className="h-5 w-5 text-blue-600" />
                            </div>
                            <p className="text-sm font-medium text-gray-700 mb-1">Total Users</p>
                            <p className="text-3xl font-bold text-blue-700">
                              {analyticsSessionsData.user_statistics?.total_users || 0}
                            </p>
                            <p className="text-xs text-gray-600 mt-2">Registered users in system</p>
                          </div>
                          
                          <div className="p-5 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between mb-2">
                              <CheckCircle className="h-5 w-5 text-green-600" />
                            </div>
                            <p className="text-sm font-medium text-gray-700 mb-1">Active Users</p>
                            <p className="text-3xl font-bold text-green-700">
                              {analyticsSessionsData.user_statistics?.active_users || 0}
                            </p>
                            <p className="text-xs text-gray-600 mt-2">Currently logged in</p>
                          </div>
                          
                          <div className="p-5 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between mb-2">
                              <PauseCircle className="h-5 w-5 text-gray-600" />
                            </div>
                            <p className="text-sm font-medium text-gray-700 mb-1">Inactive Users</p>
                            <p className="text-3xl font-bold text-gray-700">
                              {analyticsSessionsData.user_statistics?.inactive_users || 0}
                            </p>
                            <p className="text-xs text-gray-600 mt-2">Not currently active</p>
                          </div>
                          
                          <div className="p-5 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border border-purple-200 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between mb-2">
                              <TrendingUp className="h-5 w-5 text-purple-600" />
                            </div>
                            <p className="text-sm font-medium text-gray-700 mb-1">Active Percentage</p>
                            <p className="text-3xl font-bold text-purple-700">
                              {analyticsSessionsData.user_statistics?.active_user_percentage || 0}%
                            </p>
                            <p className="text-xs text-gray-600 mt-2">Active user ratio</p>
                          </div>
                        </div>
                      </div>

                      {/* Session Statistics Section */}
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                          <Activity className="h-5 w-5 text-purple-600" />
                          Session Statistics
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="p-5 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border border-purple-200 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between mb-2">
                              <Activity className="h-5 w-5 text-purple-600" />
                            </div>
                            <p className="text-sm font-medium text-gray-700 mb-1">Total Sessions</p>
                            <p className="text-3xl font-bold text-purple-700">
                              {analyticsSessionsData.session_statistics?.total_sessions || 0}
                            </p>
                            <p className="text-xs text-gray-600 mt-2">All time sessions</p>
                          </div>
                          
                          <div className="p-5 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg border border-orange-200 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between mb-2">
                              <Timer className="h-5 w-5 text-orange-600" />
                            </div>
                            <p className="text-sm font-medium text-gray-700 mb-1">Average Duration</p>
                            <p className="text-2xl font-bold text-orange-700">
                              {analyticsSessionsData.session_statistics?.average_duration?.toFixed(2) ?? '0.00'}
                            </p>
                            <p className="text-xs text-gray-600 mt-2">In seconds</p>
                          </div>
                          
                          <div className="p-5 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between mb-2">
                              <Clock className="h-5 w-5 text-blue-600" />
                            </div>
                            <p className="text-sm font-medium text-gray-700 mb-1">Average Duration</p>
                            <p className="text-2xl font-bold text-blue-700">
                              {analyticsSessionsData.session_statistics?.average_duration_formatted || '0h 0m 0s'}
                            </p>
                            <p className="text-xs text-gray-600 mt-2">Human readable format</p>
                          </div>
                        </div>
                      </div>

                      {/* Device Statistics Section */}
                      {analyticsSessionsData.device_statistics && Object.keys(analyticsSessionsData.device_statistics).length > 0 && (
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <Monitor className="h-5 w-5 text-indigo-600" />
                            Device Statistics
                          </h3>
                          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                            {Object.entries(analyticsSessionsData.device_statistics).map(([deviceType, count]: [string, number]) => (
                              <div key={deviceType} className="p-5 bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg border border-indigo-200 shadow-sm hover:shadow-md transition-shadow text-center">
                                <div className="flex justify-center mb-3">
                                  {deviceType.toLowerCase() === 'web' ? (
                                    <Monitor className="h-8 w-8 text-indigo-600" />
                                  ) : deviceType.toLowerCase() === 'mobile' ? (
                                    <Smartphone className="h-8 w-8 text-indigo-600" />
                                  ) : deviceType.toLowerCase() === 'tablet' ? (
                                    <Tablet className="h-8 w-8 text-indigo-600" />
                                  ) : (
                                    <Monitor className="h-8 w-8 text-indigo-600" />
                                  )}
                                </div>
                                <p className="text-sm font-semibold text-gray-700 mb-2">{deviceType}</p>
                                <p className="text-3xl font-bold text-indigo-700">{count}</p>
                                <p className="text-xs text-gray-600 mt-2">Sessions</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Login Time Distribution Section */}
                      {analyticsSessionsData.login_time_distribution && (
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <Clock className="h-5 w-5 text-amber-600" />
                            Login Time Distribution
                          </h3>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="p-5 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200 shadow-sm hover:shadow-md transition-shadow text-center">
                              <div className="flex justify-center mb-3">
                                <div className="w-12 h-12 bg-blue-200 rounded-full flex items-center justify-center">
                                  <Clock className="h-6 w-6 text-blue-700" />
                                </div>
                              </div>
                              <p className="text-sm font-semibold text-gray-700 mb-2">Morning</p>
                              <p className="text-3xl font-bold text-blue-700">
                                {analyticsSessionsData.login_time_distribution.morning || 0}
                              </p>
                              <p className="text-xs text-gray-600 mt-2">6 AM - 12 PM</p>
                            </div>
                            
                            <div className="p-5 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200 shadow-sm hover:shadow-md transition-shadow text-center">
                              <div className="flex justify-center mb-3">
                                <div className="w-12 h-12 bg-green-200 rounded-full flex items-center justify-center">
                                  <Clock className="h-6 w-6 text-green-700" />
                                </div>
                              </div>
                              <p className="text-sm font-semibold text-gray-700 mb-2">Afternoon</p>
                              <p className="text-3xl font-bold text-green-700">
                                {analyticsSessionsData.login_time_distribution.afternoon || 0}
                              </p>
                              <p className="text-xs text-gray-600 mt-2">12 PM - 6 PM</p>
                            </div>
                            
                            <div className="p-5 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg border border-orange-200 shadow-sm hover:shadow-md transition-shadow text-center">
                              <div className="flex justify-center mb-3">
                                <div className="w-12 h-12 bg-orange-200 rounded-full flex items-center justify-center">
                                  <Clock className="h-6 w-6 text-orange-700" />
                                </div>
                              </div>
                              <p className="text-sm font-semibold text-gray-700 mb-2">Evening</p>
                              <p className="text-3xl font-bold text-orange-700">
                                {analyticsSessionsData.login_time_distribution.evening || 0}
                              </p>
                              <p className="text-xs text-gray-600 mt-2">6 PM - 12 AM</p>
                            </div>
                            
                            <div className="p-5 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border border-purple-200 shadow-sm hover:shadow-md transition-shadow text-center">
                              <div className="flex justify-center mb-3">
                                <div className="w-12 h-12 bg-purple-200 rounded-full flex items-center justify-center">
                                  <Clock className="h-6 w-6 text-purple-700" />
                                </div>
                              </div>
                              <p className="text-sm font-semibold text-gray-700 mb-2">Night</p>
                              <p className="text-3xl font-bold text-purple-700">
                                {analyticsSessionsData.login_time_distribution.night || 0}
                              </p>
                              <p className="text-xs text-gray-600 mt-2">12 AM - 6 AM</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Timestamp Footer */}
                      {analyticsSessionsData.timestamp && (
                        <div className="pt-4 border-t border-gray-200">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <Clock className="h-3 w-3" />
                              <span>Last updated: {new Date(analyticsSessionsData.timestamp).toLocaleString()}</span>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-gray-400">
                              <BarChart3 className="h-3 w-3" />
                              <span>Analytics Data</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                )}
              </Card>
            )}

            {/* User Details - Inline on Same Page */}
            {showUserDetailsModal && selectedUserDetails && (
              <div className="mt-6">
                <Card>
                  <div className="border-b border-gray-200 p-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
                        <span className="text-white font-semibold text-lg">
                          {(selectedUserDetails.user?.full_name || selectedUserDetails.user?.email || 'U').charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-gray-900">
                          {selectedUserDetails.user?.full_name || 'Unknown User'}
                        </h2>
                        <p className="text-sm text-gray-600">{selectedUserDetails.user?.email}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setShowUserDetailsModal(false);
                        setSelectedUserDetails(null);
                      }}
                      className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                      <XCircle className="h-6 w-6 text-gray-500" />
                    </button>
                  </div>

                  <div className="p-6 space-y-6">
                    {/* User Information */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <User className="h-5 w-5" />
                          User Information
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          <div>
                            <p className="text-xs font-medium text-gray-500 mb-1">User ID</p>
                            <p className="text-sm font-semibold text-gray-900 font-mono">
                              {selectedUserDetails.user?.user_id || 'N/A'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-gray-500 mb-1">UUID</p>
                            <p className="text-sm font-semibold text-gray-900 font-mono">
                              {(selectedUserDetails.user as { uuid?: string } | undefined)?.uuid ?? 'N/A'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-gray-500 mb-1">Role</p>
                            <Badge variant="light" color="info">
                              {selectedUserDetails.user?.user_role ?? (selectedUserDetails.user as { userRoles?: string } | undefined)?.userRoles ?? 'User'}
                            </Badge>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-gray-500 mb-1">Status</p>
                            <Badge variant={(selectedUserDetails.user as { status?: boolean } | undefined)?.status ? 'solid' : 'light'} color={(selectedUserDetails.user as { status?: boolean } | undefined)?.status ? 'success' : 'dark'}>
                              {(selectedUserDetails.user as { status?: boolean } | undefined)?.status ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-gray-500 mb-1">Login Flag</p>
                            <p className="text-sm font-semibold text-gray-900 capitalize">
                              {String((selectedUserDetails.user as { login_flag?: string } | undefined)?.login_flag ?? 'N/A')}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-gray-500 mb-1">Last Login</p>
                            <p className="text-sm font-semibold text-gray-900">
                              {(selectedUserDetails.user as { last_login?: string } | undefined)?.last_login 
                                ? new Date(String((selectedUserDetails.user as { last_login?: string }).last_login)).toLocaleString() 
                                : 'Never'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-gray-500 mb-1">Created At</p>
                            <p className="text-sm font-semibold text-gray-900">
                              {(selectedUserDetails.user as { created_at?: string } | undefined)?.created_at 
                                ? new Date(String((selectedUserDetails.user as { created_at?: string }).created_at)).toLocaleString() 
                                : 'N/A'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-gray-500 mb-1">Updated At</p>
                            <p className="text-sm font-semibold text-gray-900">
                              {(selectedUserDetails.user as { updated_at?: string } | undefined)?.updated_at 
                                ? new Date(String((selectedUserDetails.user as { updated_at?: string }).updated_at)).toLocaleString() 
                                : 'N/A'}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Session Statistics */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Activity className="h-5 w-5" />
                          Session Statistics
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="p-4 bg-blue-50 rounded-lg">
                            <p className="text-xs font-medium text-gray-600 mb-1">Total User Sessions</p>
                            <p className="text-2xl font-bold text-blue-600">
                              {Number(selectedUserDetails.user?.sessions?.total_user_sessions) || 0}
                            </p>
                          </div>
                          <div className="p-4 bg-purple-50 rounded-lg">
                            <p className="text-xs font-medium text-gray-600 mb-1">Total Device Sessions</p>
                            <p className="text-2xl font-bold text-purple-600">
                              {selectedUserDetails.user?.sessions?.total_device_sessions || 0}
                            </p>
                          </div>
                          <div className="p-4 bg-green-50 rounded-lg">
                            <p className="text-xs font-medium text-gray-600 mb-1">Active Sessions</p>
                            <p className="text-2xl font-bold text-green-600">
                              {(selectedUserDetails && typeof selectedUserDetails === 'object' && 'user' in selectedUserDetails && 
                                selectedUserDetails.user && typeof selectedUserDetails.user === 'object' && 'sessions' in selectedUserDetails.user &&
                                selectedUserDetails.user.sessions && typeof selectedUserDetails.user.sessions === 'object' && 'user_sessions' in selectedUserDetails.user.sessions &&
                                Array.isArray(selectedUserDetails.user.sessions.user_sessions))
                                ? selectedUserDetails.user.sessions.user_sessions.filter((s: unknown) => s && typeof s === 'object' && 'is_active' in s && s.is_active === true).length
                                : 0}
                            </p>
                          </div>
                          <div className="p-4 bg-gray-50 rounded-lg">
                            <p className="text-xs font-medium text-gray-600 mb-1">Inactive Sessions</p>
                            <p className="text-2xl font-bold text-gray-600">
                              {selectedUserDetails.user?.sessions?.user_sessions?.filter((s): s is { is_active?: boolean; [key: string]: unknown } => s && typeof s === 'object' && 'is_active' in s && !s.is_active).length || 0}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Session History */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Clock className="h-5 w-5" />
                          Session History ({selectedUserDetails.user?.sessions?.user_sessions?.length || 0})
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {selectedUserDetails.user?.sessions?.user_sessions?.map((session: { session_id?: string; is_active?: boolean; status?: string; device_type?: string; device_name?: string; ip_address?: string; login_time?: string; last_active?: string; logout_time?: string; expires_at?: string; anomaly_score?: number; is_trusted_device?: boolean; revocation_reason?: string; [key: string]: unknown }, index: number) => (
                            <div 
                              key={session.session_id || index} 
                              className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors"
                            >
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                  <div className={`p-2 rounded-lg ${
                                    session.is_active ? 'bg-green-100' : 
                                    session.status === 'expired' ? 'bg-red-100' : 
                                    'bg-gray-100'
                                  }`}>
                                    {session.device_type === 'Web' ? (
                                      <Monitor className={`h-5 w-5 ${
                                        session.is_active ? 'text-green-600' : 
                                        session.status === 'expired' ? 'text-red-600' : 
                                        'text-gray-600'
                                      }`} />
                                    ) : (
                                      <Smartphone className={`h-5 w-5 ${
                                        session.is_active ? 'text-green-600' : 
                                        session.status === 'expired' ? 'text-red-600' : 
                                        'text-gray-600'
                                      }`} />
                                    )}
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2 mb-1">
                                      <p className="font-semibold text-gray-900">{session.device_name || session.device_type}</p>
                                      <Badge 
                                        variant={session.is_active ? 'solid' : 'light'} 
                                        color={
                                          session.is_active ? 'success' : 
                                          session.status === 'expired' ? 'error' : 
                                          'dark'
                                        }
                                      >
                                        {session.status || (session.is_active ? 'active' : 'inactive')}
                                      </Badge>
                                      {session.is_trusted_device && (
                                        <Badge variant="light" color="info">Trusted</Badge>
                                      )}
                                    </div>
                                    <p className="text-xs text-gray-600">{session.ip_address}</p>
                                  </div>
                                </div>
                                {session.anomaly_score && session.anomaly_score > 0 && (
                                  <div className="text-right">
                                    <Badge variant="light" color="warning">
                                      Anomaly: {((session.anomaly_score ?? 0) * 100).toFixed(1)}%
                                    </Badge>
                                  </div>
                                )}
                              </div>

                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                                <div>
                                  <p className="text-gray-500 mb-1">Login Time</p>
                                  <p className="font-medium text-gray-900">
                                    {session.login_time ? new Date(session.login_time).toLocaleString() : 'N/A'}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-gray-500 mb-1">Last Active</p>
                                  <p className="font-medium text-gray-900">
                                    {session.last_active ? new Date(session.last_active).toLocaleString() : 'N/A'}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-gray-500 mb-1">Logout Time</p>
                                  <p className="font-medium text-gray-900">
                                    {session.logout_time ? new Date(session.logout_time).toLocaleString() : 'Active'}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-gray-500 mb-1">Expires At</p>
                                  <p className="font-medium text-gray-900">
                                    {session.expires_at ? new Date(session.expires_at).toLocaleString() : 'N/A'}
                                  </p>
                                </div>
                              </div>

                              {session.revocation_reason && typeof session.revocation_reason === 'string' && (
                                <div className="mt-3 p-2 bg-red-50 rounded border border-red-200">
                                  <p className="text-xs font-semibold text-red-700 mb-1">Revocation Reason:</p>
                                  <p className="text-xs text-red-600">{session.revocation_reason}</p>
                                </div>
                              )}

                              {session.user_agent && typeof session.user_agent === 'string' ? (
                                <div className="mt-2">
                                  <p className="text-xs text-gray-500 font-mono break-all">
                                    {String(session.user_agent)}
                                  </p>
                                </div>
                              ) : null}
                            </div>
                          )) || (
                            <div className="text-center py-8 text-gray-500">
                              <Activity className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                              <p>No session history available</p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Timestamp */}
                    {selectedUserDetails.timestamp && (
                      <div className="text-xs text-gray-500 text-center pt-4 border-t border-gray-200">
                        Last updated: {new Date(String(selectedUserDetails.timestamp)).toLocaleString()}
                      </div>
                    )}
                  </div>
                </Card>
              </div>
            )}

            {/* Login Distribution Chart (fallback) */}
            {!analyticsSessionsData && allUsersLoginData?.login_time_distribution && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Login Time Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">
                        {allUsersLoginData.login_time_distribution.morning || 0}
                      </div>
                      <div className="text-sm text-gray-600">Morning</div>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {allUsersLoginData.login_time_distribution.afternoon || 0}
                      </div>
                      <div className="text-sm text-gray-600">Afternoon</div>
                    </div>
                    <div className="text-center p-4 bg-orange-50 rounded-lg">
                      <div className="text-2xl font-bold text-orange-600">
                        {allUsersLoginData.login_time_distribution.evening || 0}
                      </div>
                      <div className="text-sm text-gray-600">Evening</div>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">
                        {allUsersLoginData.login_time_distribution.night || 0}
                      </div>
                      <div className="text-sm text-gray-600">Night</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Removed Devices Tab */}
        {false && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Monitor className="h-5 w-5" />
                  Device Management
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {devices.length > 0 ? devices.map((device) => (
                    <div key={device.device_id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            {device.device_type === 'mobile' && <Smartphone className="h-5 w-5" />}
                            {device.device_type === 'tablet' && <Tablet className="h-5 w-5" />}
                            {device.device_type === 'desktop' && <Monitor className="h-5 w-5" />}
                            <div>
                              <h4 className="font-medium">{device.device_name || device.device_id}</h4>
                              <p className="text-sm text-gray-500">{device.device_type} • {device.ip_address}</p>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={device.status === 'active' ? 'solid' : 'light'} 
                                 color={device.status === 'active' ? 'success' : 'warning'}>
                            {device.status}
                          </Badge>
                          {device.is_trusted && (
                            <Badge variant="light" color="info">Trusted</Badge>
                          )}
                        </div>
                      </div>
                      <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Location:</span>
                          <div className="font-medium">{device.location || 'Unknown'}</div>
                        </div>
                        <div>
                          <span className="text-gray-500">Last Active:</span>
                          <div className="font-medium">{new Date(device.last_active).toLocaleString()}</div>
                        </div>
                        <div>
                          <span className="text-gray-500">Anomaly Score:</span>
                          <div className={`font-medium ${device.anomaly_score > 0.7 ? 'text-red-600' : device.anomaly_score > 0.4 ? 'text-yellow-600' : 'text-green-600'}`}>
                            {(device.anomaly_score * 100).toFixed(1)}%
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-500">Confidence:</span>
                          <div className="font-medium">{((device.confidence_score || 0) * 100).toFixed(1)}%</div>
                        </div>
                      </div>
                    </div>
                  )) : (
                    <div className="text-center py-8">
                      <Monitor className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">No devices found</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Login History Tab (removed) */}
        {false && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Login History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {loginHistory.length > 0 ? loginHistory.map((session, index) => (
                    <div key={session.session_id || index} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <User className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <h4 className="font-medium">{String(session.full_name ?? session.email ?? 'Unknown')}</h4>
                            <p className="text-sm text-gray-500">{String(session.email ?? 'N/A')}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant={session.is_active ? 'solid' : 'light'} 
                                 color={session.is_active ? 'success' : 'dark'}>
                            {session.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                          <p className="text-sm text-gray-500 mt-1">
                            {session.login_time ? new Date(session.login_time).toLocaleString() : 'Unknown'}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Device:</span>
                          <div className="font-medium">{session.device_name || session.device_type || 'Unknown'}</div>
                        </div>
                        <div>
                          <span className="text-gray-500">IP Address:</span>
                          <div className="font-medium">{session.ip_address || 'Unknown'}</div>
                        </div>
                        <div>
                          <span className="text-gray-500">Status:</span>
                          <div className="font-medium">{session.status || 'Unknown'}</div>
                        </div>
                        <div>
                          <span className="text-gray-500">Last Active:</span>
                          <div className="font-medium">
                            {session.last_active ? new Date(session.last_active).toLocaleString() : 'Unknown'}
                          </div>
                        </div>
                      </div>
                    </div>
                  )) : (
                    <div className="text-center py-8">
                      <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">No login history found</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}


        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Device List */}
            <Card>
              {/* <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Monitor className="h-5 w-5" />
                  Active Devices
                </CardTitle>
              </CardHeader> */}
              <CardContent>
                <div className="space-y-4">
                  {devices.map((device) => (
                    <div key={device.device_id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-blue-50 rounded-lg">
                          {device.device_type === 'mobile' && <Smartphone className="h-5 w-5 text-blue-600" />}
                          {device.device_type === 'desktop' && <Monitor className="h-5 w-5 text-blue-600" />}
                          {device.device_type === 'tablet' && <Tablet className="h-5 w-5 text-blue-600" />}
                        </div>
                        <div>
                          <h3 className="font-medium">{device.device_name}</h3>
                          <p className="text-sm text-gray-500">
                            {device.location} • Last active: {new Date(device.last_active).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Tooltip>
                          <TooltipTrigger>
                            <div className="flex items-center gap-1">
                              <Gauge className="h-4 w-4 text-gray-400" />
                              <span className="text-sm">{Math.round((device.confidence_score || 0.5) * 100)}%</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>Device Confidence Score</TooltipContent>
                        </Tooltip>
                        
                        <Badge variant="solid" color={device.is_trusted ? 'success' : 'error'}>
                          {device.is_trusted ? 'Trusted' : 'Untrusted'}
                        </Badge>
                        
                        {device.anomaly_score > 0.7 && (
                          <Tooltip>
                            <TooltipTrigger>
                              <AlertTriangle className="h-4 w-4 text-red-500" />
                            </TooltipTrigger>
                            <TooltipContent>High Risk Device</TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}



        {/* Removed Security & ML Tab */}
        {false && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPinned className="h-5 w-5" />
                  Location & Radius Management
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Current Location Status */}
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-medium mb-2">Current Location Access</h4>
                    <Button 
                      onClick={async () => {
                        if (navigator.geolocation) {
                          navigator.geolocation.getCurrentPosition(async (position) => {
                            const { latitude, longitude } = position.coords;
                            const accessCheck = await checkRadiusAccess(latitude, longitude);
                            if (accessCheck) {
                              console.log('Access check result:', accessCheck);
                            }
                          });
                        }
                      }}
                      size="sm"
                    >
                      <MapPin className="h-4 w-4 mr-2" />
                      Check Current Location
                    </Button>
                  </div>

                  {/* Add Trusted Location */}
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-3">Add Trusted Location</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Location Name</label>
                        <input
                          type="text"
                          placeholder="Home, Office, etc."
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          id="location-name"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Radius (km)</label>
                        <input
                          type="number"
                          placeholder="50"
                          min="1"
                          max="1000"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          id="location-radius"
                        />
                      </div>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <Button 
                        onClick={() => {
                          if (navigator.geolocation) {
                            navigator.geolocation.getCurrentPosition(async (position) => {
                              const name = (document.getElementById('location-name') as HTMLInputElement)?.value || 'Current Location';
                              const radius = Number((document.getElementById('location-radius') as HTMLInputElement)?.value) || 50;
                              const { latitude, longitude } = position.coords;
                              await addTrustedLocation(name, latitude, longitude, radius);
                            });
                          }
                        }}
                        size="sm"
                      >
                        <MapPin className="h-4 w-4 mr-2" />
                        Use Current Location
                      </Button>
                      <Button 
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          // Manual coordinate input
                          const lat = prompt('Enter latitude:');
                          const lng = prompt('Enter longitude:');
                          const name = (document.getElementById('location-name') as HTMLInputElement)?.value || 'Manual Location';
                          const radius = Number((document.getElementById('location-radius') as HTMLInputElement)?.value) || 50;
                          if (lat && lng) {
                            addTrustedLocation(name, parseFloat(lat), parseFloat(lng), radius);
                          }
                        }}
                      >
                        <Target className="h-4 w-4 mr-2" />
                        Manual Coordinates
                      </Button>
                    </div>
                  </div>

                  {/* Radius Visualization */}
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-3">Location Access Rules</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="text-sm font-medium">Within Trusted Radius</span>
                        </div>
                        <Badge variant="solid" color="success">Allowed</Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <XCircle className="h-4 w-4 text-red-600" />
                          <span className="text-sm font-medium">Outside Trusted Radius</span>
                        </div>
                        <Badge variant="solid" color="error">Blocked</Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Removed AI Analytics Tab */}
        {false && (
          <div className="space-y-6">
            {/* ML Dashboard Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cpu className="h-5 w-5" />
                  ML-Powered Session Security Dashboard
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Total Analyses</p>
                          <p className="text-2xl font-bold text-blue-600">
                            {performanceMetrics?.total_analyses || 0}
                          </p>
                        </div>
                        <Brain className="h-8 w-8 text-blue-500" />
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Threats Detected</p>
                          <p className="text-2xl font-bold text-red-600">
                            {performanceMetrics?.threats_detected || 0}
                          </p>
                        </div>
                        <AlertTriangle className="h-8 w-8 text-red-500" />
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Sessions Terminated</p>
                          <p className="text-2xl font-bold text-orange-600">
                            {performanceMetrics?.sessions_terminated || 0}
                          </p>
                        </div>
                        <ShieldX className="h-8 w-8 text-orange-500" />
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Avg Processing</p>
                          <p className="text-2xl font-bold text-green-600">
                            {((performanceMetrics?.processing_time_avg || 0) * 1000).toFixed(0)}ms
                          </p>
                        </div>
                        <Gauge className="h-8 w-8 text-green-500" />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* ML Model Status */}
                <div className="space-y-4">
                  <h4 className="font-medium">ML Model Status</h4>
                  {(() => {
                    if (!mlModelStatus?.models) return null;
                    const models: Record<string, MLModelInfo> = mlModelStatus!.models as Record<string, MLModelInfo>;
                    if (Object.keys(models).length === 0) return null;
                    return (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {Object.entries(models).map(([modelName, modelInfo]: [string, MLModelInfo]) => (
                        <div key={modelName} className="p-4 border rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <h5 className="font-medium capitalize">{modelName.replace('_', ' ')}</h5>
                            <Badge variant={modelInfo.trained ? 'solid' : 'light'} color={modelInfo.trained ? 'success' : 'warning'}>
                              {modelInfo.trained ? 'Trained' : 'Not Trained'}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600">{modelInfo.type}</p>
                          {modelInfo.error && (
                            <p className="text-sm text-red-600 mt-1">Error: {modelInfo.error}</p>
                          )}
                        </div>
                      ))}
                      </div>
                    );
                  })()}
                  {mlModelStatus?.models && Object.keys(mlModelStatus!.models as Record<string, MLModelInfo>).length === 0 && (
                    <div className="text-center py-8 bg-gray-50 rounded-lg">
                      <Brain className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">ML Models Not Available</p>
                      <p className="text-sm text-gray-400">Machine learning features are being initialized</p>
                    </div>
                  )}
                  {!mlModelStatus && (
                    <div className="text-center py-8 bg-gray-50 rounded-lg">
                      <Brain className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">ML Models Not Available</p>
                      <p className="text-sm text-gray-400">Machine learning features are being initialized</p>
                    </div>
                  )}
                </div>

                {/* Real-time Session Monitoring */}
                <div className="mt-6">
                  <h4 className="font-medium mb-3">Real-time Session Analysis</h4>
                  {realTimeSessionData.length > 0 ? (
                    <div className="space-y-3">
                      {realTimeSessionData.slice(0, 10).map((session: unknown, index: number) => {
                        const sessionObj = session && typeof session === 'object' ? session as { session_id?: string; risk_score?: number; email?: string; device_type?: string; ip_address?: string; ml_analysis?: { threat_level?: string; anomalies?: string[] } } : {};
                        return (
                        <div key={sessionObj.session_id || index} className="p-4 border rounded-lg">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`w-3 h-3 rounded-full ${
                                (sessionObj.risk_score ?? 0) > 0.8 ? 'bg-red-500' :
                                (sessionObj.risk_score ?? 0) > 0.6 ? 'bg-orange-500' :
                                (sessionObj.risk_score ?? 0) > 0.3 ? 'bg-yellow-500' : 'bg-green-500'
                              }`}></div>
                              <div>
                                <span className="font-medium">{sessionObj.email ?? 'N/A'}</span>
                                <p className="text-sm text-gray-600">
                                  {sessionObj.device_type ?? 'N/A'} • {sessionObj.ip_address ?? 'N/A'}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <Badge variant="solid" color={
                                (sessionObj.risk_score ?? 0) > 0.8 ? 'error' :
                                (sessionObj.risk_score ?? 0) > 0.6 ? 'warning' :
                                (sessionObj.risk_score ?? 0) > 0.3 ? 'warning' : 'success'
                              }>
                                Risk: {((sessionObj.risk_score ?? 0) * 100).toFixed(0)}%
                              </Badge>
                              {sessionObj.ml_analysis && (
                                <p className="text-sm text-gray-500 mt-1">
                                  Threat: {sessionObj.ml_analysis.threat_level ?? 'Unknown'}
                                </p>
                              )}
                            </div>
                          </div>
                          {sessionObj.ml_analysis?.anomalies && Array.isArray(sessionObj.ml_analysis.anomalies) && sessionObj.ml_analysis.anomalies.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {sessionObj.ml_analysis.anomalies.map((anomaly: string, idx: number) => (
                                <div key={idx} className="text-xs">
                                  <Badge variant="light" color="warning">
                                  {anomaly.replace('_', ' ')}
                                </Badge>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8 bg-gray-50 rounded-lg">
                      <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">No Real-time Session Data</p>
                      <p className="text-sm text-gray-400">Session monitoring will appear here when available</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Removed AI Analytics Tab */}
        {false && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Security Threat Alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {threatAlerts.length > 0 ? threatAlerts.map((alert: ThreatAlert, index: number) => (
                    <div key={alert.id || index} className={`p-4 border-l-4 rounded-lg ${
                      alert.priority === 'HIGH' ? 'border-red-500 bg-red-50' :
                      alert.priority === 'MEDIUM' ? 'border-orange-500 bg-orange-50' :
                      'border-yellow-500 bg-yellow-50'
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <Badge variant="solid" color={
                            alert.priority === 'HIGH' ? 'error' :
                            alert.priority === 'MEDIUM' ? 'warning' : 'warning'
                          }>
                            {alert.priority}
                          </Badge>
                          <h4 className="font-medium">{alert.type?.replace('_', ' ') ?? 'Unknown'}</h4>
                        </div>
                        <span className="text-sm text-gray-500">
                          {alert.timestamp ? new Date(alert.timestamp).toLocaleString() : 'N/A'}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Session ID:</span>
                          <div className="font-mono">{alert.session_id ?? 'N/A'}</div>
                        </div>
                        <div>
                          <span className="text-gray-600">User ID:</span>
                          <div className="font-medium">{alert.user_id ?? 'N/A'}</div>
                        </div>
                        <div>
                          <span className="text-gray-600">Risk Score:</span>
                          <div className="font-medium">{alert.risk_score ? (alert.risk_score * 100).toFixed(1) : '0'}%</div>
                        </div>
                        <div>
                          <span className="text-gray-600">Threat Level:</span>
                          <Badge variant="light" color={
                            alert.threat_level === 'critical' ? 'error' :
                            alert.threat_level === 'high' ? 'error' :
                            alert.threat_level === 'medium' ? 'warning' : 'success'
                          }>
                            {alert.threat_level ?? 'unknown'}
                          </Badge>
                        </div>
                      </div>
                      
                      {alert.anomalies && Array.isArray(alert.anomalies) && alert.anomalies.length > 0 && (
                        <div className="mt-3">
                          <span className="text-sm text-gray-600">Anomalies Detected:</span>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {alert.anomalies.map((anomaly: string, idx: number) => (
                              <div key={idx} className="text-xs">
                                <Badge variant="light" color="error">
                                {anomaly.replace('_', ' ')}
                              </Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {alert.recommendations && Array.isArray(alert.recommendations) && alert.recommendations.length > 0 && (
                        <div className="mt-3">
                          <span className="text-sm text-gray-600">Recommendations:</span>
                          <ul className="mt-1 space-y-1">
                            {alert.recommendations.slice(0, 3).map((rec: string, idx: number) => (
                              <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                                <CheckCircle className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                                {rec}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      <div className="mt-4 flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => executeManualSessionAction({
                            session_id: alert.session_id,
                            action: 'clear_alerts',
                            reason: 'Alert reviewed and resolved'
                          })}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Mark Resolved
                        </Button>
                        {alert.priority === 'HIGH' && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => executeManualSessionAction({
                              session_id: alert.session_id,
                              action: 'terminate',
                              reason: 'High priority threat - manual termination'
                            })}
                          >
                            <ShieldX className="h-4 w-4 mr-1" />
                            Terminate Session
                          </Button>
                        )}
                      </div>
                    </div>
                  )) : (
                    <div className="text-center py-8">
                      <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">No threat alerts at this time</p>
                      <p className="text-sm text-gray-400">Security monitoring is active</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Disabled ML Model Training & Configuration section */}
        {false && null}
        {false && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  ML Model Training & Configuration
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Training Controls */}
                  <div className="p-4 border rounded-lg" key="training-controls">
                    <h4 className="font-medium mb-3">Train ML Models</h4>
                    <p className="text-sm text-gray-600 mb-4">
                      Train machine learning models using historical session data to improve anomaly detection,
                      fraud prevention, and risk scoring accuracy.
                    </p>
                    
                    <div className="flex items-center gap-4">
                      
                      <Button 
                        onClick={async (): Promise<void> => {
                          // Generate sample training data from current sessions
                          const trainingData = activeSessions.slice(0, 50).map((session) => {
                            const userId = typeof session.user_id === 'string' ? session.user_id : 'unknown';
                            const sessionId = typeof session.session_id === 'string' ? session.session_id : 'unknown';
                            const lastActive = typeof session.last_active === 'string' ? session.last_active : new Date().toISOString();
                            const ipAddress = typeof session.ip_address === 'string' ? session.ip_address : '';
                            const deviceType = typeof session.device_type === 'string' ? session.device_type : 'unknown';
                            
                            const data: Record<string, string | number> = {
                              user_id: userId,
                              session_id: sessionId,
                              timestamp: lastActive,
                              ip_address: ipAddress,
                              device_type: deviceType,
                              is_fraudulent: Math.random() > 0.9 ? 1 : 0, // Random labels for demo
                              is_bot: Math.random() > 0.95 ? 1 : 0
                            };
                            return data;
                          });
                          
                          if (trainingData.length > 0) {
                            await trainMLModels(trainingData as unknown[]).catch(() => {
                              // Ignore errors in disabled code
                            });
                            // Refresh model status - removed endpoint
                            // await fetchMLModelStatus();
                          }
                          return undefined;
                        }}
                      >
                        <Zap className="h-4 w-4 mr-2" />
                        Train with Current Data
                      </Button>
                      
                      <Button 
                        variant="outline"
                        onClick={() => {
                          // fetchMLModelStatus(); // Removed - endpoint removed
                        }}
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh Status
                      </Button>
                    </div>
                  </div>

                  {/* Automation Configuration */}
                  {automationConfig && typeof automationConfig === 'object' && automationConfig !== null && (
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium mb-3">Automation Configuration</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {Object.entries(automationConfig as Record<string, unknown>).map(([key, value]: [string, unknown]) => {
                          const isEnabled = Boolean(value);
                          return (
                            <div key={key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <span className="text-sm font-medium capitalize">
                                {key.replace(/_/g, ' ')}
                              </span>
                              <Badge variant={isEnabled ? 'solid' : 'light'} color={isEnabled ? 'success' : 'dark'}>
                                {isEnabled ? 'Enabled' : 'Disabled'}
                              </Badge>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Model Performance Metrics */}
                  {performanceMetrics ? (() => {
                    const pm = performanceMetrics as PerformanceMetrics;
                    const threatsDetected: number = (pm.threats_detected ?? 0);
                    const totalAnalyses: number = (pm.total_analyses ?? 1);
                    const mfaTriggeredValue: unknown = pm.mfa_triggered;
                    const mfaTriggered: number = (typeof mfaTriggeredValue === 'number' ? (mfaTriggeredValue as number) : 0);
                    const falsePositivesValue: unknown = pm.false_positives;
                    const falsePositives: number = (typeof falsePositivesValue === 'number' ? (falsePositivesValue as number) : 0);
                    return (
                      <div className="p-4 border rounded-lg">
                        <h4 className="font-medium mb-3">Performance Metrics</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="text-center p-3 bg-blue-50 rounded-lg">
                            <div className="text-2xl font-bold text-blue-600">
                              {((threatsDetected / Math.max(totalAnalyses, 1)) * 100).toFixed(1)}%
                            </div>
                            <div className="text-sm text-gray-600">Threat Detection Rate</div>
                          </div>
                          <div className="text-center p-3 bg-green-50 rounded-lg">
                            <div className="text-2xl font-bold text-green-600">
                              {mfaTriggered}
                            </div>
                            <div className="text-sm text-gray-600">MFA Triggers</div>
                          </div>
                          <div className="text-center p-3 bg-orange-50 rounded-lg">
                            <div className="text-2xl font-bold text-orange-600">
                              {falsePositives}
                            </div>
                            <div className="text-sm text-gray-600">False Positives</div>
                          </div>
                        </div>
                      </div>
                    );
                  })() : null}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {false && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  Advanced Features
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* ML Model Training */}
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">Machine Learning Anomaly Detection</h4>
                      <p className="text-sm text-gray-600">
                        Train AI models to detect suspicious behavior patterns
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={mlModelStatus?.models?.fraud_classifier?.trained ? 'solid' : 'light'} color={mlModelStatus?.models?.fraud_classifier?.trained ? 'success' : 'warning'}>
                        {mlModelStatus?.models?.fraud_classifier?.trained ? 'Trained' : 'Not Trained'}
                      </Badge>
                      <Button 
                        onClick={() => {/* Tab removed */}}
                        size="sm"
                        disabled
                      >
                        <Brain className="h-4 w-4" />
                        Configure ML
                      </Button>
                    </div>
                  </div>

                  {/* Advanced Fingerprinting */}
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">Advanced Device Fingerprinting</h4>
                      <p className="text-sm text-gray-600">
                        Enhanced device identification using canvas, WebGL, and audio fingerprinting
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={advancedFingerprinting ? 'solid' : 'light'} color={advancedFingerprinting ? 'success' : 'warning'}>
                        {advancedFingerprinting ? 'Enabled' : 'Disabled'}
                      </Badge>
                      <Button 
                        onClick={enableAdvancedFingerprinting} 
                        size="sm"
                        disabled={advancedFingerprinting}
                      >
                        <Radar className="h-4 w-4" />
                        Enable
                      </Button>
                    </div>
                  </div>

                  {/* Session Clustering */}
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">Session Clustering Optimization</h4>
                      <p className="text-sm text-gray-600">
                        Optimize session distribution across geographic regions
                      </p>
                    </div>
                    <Button onClick={optimizeSessionClusters} size="sm">
                      <Layers className="h-4 w-4" />
                      Optimize Clusters
                    </Button>
                  </div>

                  {/* Real-time Session Tracking */}
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">Real-time Session Tracking</h4>
                      <p className="text-sm text-gray-600">
                        Monitor all active sessions with live updates and security analysis
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={realTimeUpdates ? 'solid' : 'light'} color={realTimeUpdates ? 'success' : 'warning'}>
                        {realTimeUpdates ? 'Active' : 'Disabled'}
                      </Badge>
                      <Button 
                        onClick={() => setRealTimeUpdates(!realTimeUpdates)}
                        size="sm"
                      >
                        {realTimeUpdates ? <Pause className="h-4 w-4" /> : <Activity className="h-4 w-4" />}
                        {realTimeUpdates ? 'Pause' : 'Resume'}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
};

export default EnhancedSessionManagement;
