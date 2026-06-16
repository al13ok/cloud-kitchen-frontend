// Centralized configuration for API endpoints
export const API_CONFIG = {
  // Use environment variable with fallback to production
  BASE_URL: process.env.NEXT_PUBLIC_API_URL,
  
  // Remote server URLs (for fallback or specific features)
  REMOTE_BASE_URL: (process.env.NEXT_PUBLIC_API_URL),
  
  // Endpoints
  ENDPOINTS: {
    USERS: '/users',
    CHAT_THREADS: '/chat-threads',
    DOCUMENTS: '/documents',
    WEBSITE_LEADS: '/website-leads',
    JOB_APPLICANTS: '/job-applicants',
    HELPDESK_TICKETS: '/helpdesk-tickets',
    RECENT_ACTIVITY: '/recent-activity',
    DASHBOARD_SETTINGS: '/dashboard-settings',
    SEND_DASHBOARD_SUMMARY: '/send-dashboard-summary-to-email',
  }
};

// Configuration for RBAC system
export const RBAC_CONFIG = {
  // API Endpoints
  API_ENDPOINTS: {
    LOGIN: '/api/v1/login',
      REFRESH: '/api/v1/refresh',
    LOGOUT: '/api/v1/logout',
      LOGOUT_ALL: '/api/v1/logout-all',
    USER_ROUTES: '/api/v1/frontend-routes/user/routes',
    ROUTE_CHECK: '/api/v1/frontend-routes/routes/check',
    ROUTE_VALIDATE: '/api/v1/frontend-routes/routes/validate',
    NAVIGATION_CONFIG: '/api/v1/frontend-routes/navigation-config',
    QUICK_ACTIONS: '/api/v1/frontend-routes/quick-actions',
    ROLE_REDIRECTS: '/api/v1/frontend-routes/role-redirects',
    ROLE_PATHS: '/api/v1/frontend-routes/role-paths',
    USER_REDIRECT_PATH: '/api/v1/frontend-routes/user/redirect-path',
    USER_PATHS: '/api/v1/frontend-routes/user/paths',
    SYSTEM_STATUS: '/api/v1/frontend-routes/system-status',
    SYSTEM_INITIALIZE: '/api/v1/frontend-routes/system/initialize',
    
      // Privacy & Cookie Management
    PRIVACY_CONSENT: '/api/v1/privacy/consent',
      PRIVACY_REMOVE: '/api/v1/privacy/remove',
      PRIVACY_EVENTS: '/api/v1/privacy/events',
      PRIVACY_STATS: '/api/v1/privacy/stats',
      PRIVACY_NOTIFICATIONS: '/api/v1/privacy/notifications',
    COOKIE_STATUS: '/api/v1/cookie-status',
      CLEAR_CACHE: '/api/v1/clear-cache',
    
    // Session Management Endpoints
    SESSION_DEVICES: '/api/v1/sessions/devices',
    SESSIONS_ACTIVE: '/api/v1/sessions/active',
    SESSIONS_ANALYTICS: '/api/v1/sessions/analytics',
    USERS_LOGIN_HISTORY: '/api/v1/users/login-history',
    MY_ACTIVITY: '/api/v1/me/activity',
    SESSIONS_ALL: '/api/v1/sessions',
    MONITORING_ACTIVE_SESSIONS: '/api/v1/sessions/monitoring/active',
    SESSION_STATUS: '/api/v1/session-status',
    USERS_ALL_LOGIN_DATA: '/api/v1/users/all-login-data',
    SESSION_ANALYTICS_DASHBOARD: '/api/v1/sessions/analytics/dashboard',
    SESSIONS_REVOKE: '/api/v1/sessions/revoke',
    SESSION_THREAT_ANALYSIS: '/api/v1/sessions/threat-analysis',
    SESSION_REALTIME_DASHBOARD: '/api/v1/sessions/realtime/dashboard',
    SESSION_BIOMETRIC: '/api/v1/sessions/biometric',
    SESSION_REALTIME_STATUS: '/api/v1/sessions/realtime/status',
    ADD_TRUSTED_LOCATION: '/api/v1/sessions/trusted-locations',
    CHECK_RADIUS_ACCESS: '/api/v1/sessions/radius-access',
    USERS_SESSIONS: '/api/v1/users/sessions',
    ANALYTICS_SESSIONS: '/api/v1/analytics/sessions',
    USER_LOGIN_DETAILS: '/api/v1/users',
  },

  // Backend URL
  BACKEND_URL: process.env.NEXT_PUBLIC_API_URL,

  // Default redirects (can be overridden by backend)
  DEFAULT_REDIRECTS: {
    UNAUTHORIZED: process.env.NEXT_PUBLIC_UNAUTHORIZED_REDIRECT || '/signin',
    DEFAULT: process.env.NEXT_PUBLIC_DEFAULT_REDIRECT || '/', // All users redirect to home page
    ROLE_BASED: {}, // Will be populated dynamically from backend
  },

  // Public routes that don't require authentication
  PUBLIC_ROUTES: [
    '/signin',
    '/signup',
    '/forgot-password',
    '/reset-password',
    '/error',
    '/404',
    '/500',
    '/survey', // Survey routes are public (matches backend implementation)
  ],

  // Feature flags
  FEATURES: {
    ENABLE_FALLBACK_CONFIG: process.env.NEXT_PUBLIC_ENABLE_FALLBACK_CONFIG === 'true',
    ENABLE_CSRF_PROTECTION: process.env.NEXT_PUBLIC_ENABLE_CSRF_PROTECTION !== 'false',
    ENABLE_ROUTE_CACHING: process.env.NEXT_PUBLIC_ENABLE_ROUTE_CACHING !== 'false',
  },

  // Cache settings
  CACHE: {
    NAVIGATION_TTL: parseInt(process.env.NEXT_PUBLIC_NAVIGATION_CACHE_TTL || '300000'), // 5 minutes
    ROUTE_TTL: parseInt(process.env.NEXT_PUBLIC_ROUTE_CACHE_TTL || '60000'), // 1 minute
  },
};

// Environment-specific configurations
export const getConfig = () => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const isProduction = process.env.NODE_ENV === 'production';

  return {
    ...RBAC_CONFIG,
    ENVIRONMENT: {
      isDevelopment,
      isProduction,
      isTest: process.env.NODE_ENV === 'test',
    },
    DEBUG: {
      ENABLE_LOGGING: isDevelopment || process.env.NEXT_PUBLIC_ENABLE_DEBUG_LOGGING === 'true',
      LOG_LEVEL: process.env.NEXT_PUBLIC_LOG_LEVEL || 'warn',
    },
  };
};

// Helper function to get full URL
export const getApiUrl = (endpoint: string): string => {
  return API_CONFIG.BASE_URL + endpoint;
};

// Helper function to get remote URL
export const getRemoteApiUrl = (endpoint: string): string => {
  return API_CONFIG.REMOTE_BASE_URL + endpoint;
}; 