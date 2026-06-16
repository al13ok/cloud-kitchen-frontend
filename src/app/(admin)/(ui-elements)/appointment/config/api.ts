/**
 * Centralized API Configuration
 * Change the backend URL/port here and it will update everywhere
 */

// Backend configuration
export const API_CONFIG = {
  // Change this to your backend URL/port
  BASE_URL: process.env.NEXT_PUBLIC_API_BASE || process.env.NEXT_PUBLIC_API_URL || '',
  // API endpoints
  ENDPOINTS: {
    // Auth endpoints
    AUTH_LOGIN: '/appointment/auth/login',
    AUTH_ME: '/appointment/auth/me',
    AUTH_SIGNUP: '/appointment/auth/signup',
    
    // Chat endpoints
    CHAT: '/appointment/chat',
    
    // Admin endpoints
    ADMIN_SERVICES: '/appointment/admin/services',
    ADMIN_APPOINTMENTS: '/appointment/admin/appointments',
    ADMIN_METRICS_SUMMARY: '/appointment/admin/metrics/summary',
    ADMIN_METRICS_HEATMAP: '/appointment/admin/metrics/heatmap',
    ADMIN_METRICS_LEAD_TIME: '/appointment/admin/metrics/lead-time',
    
    // Availability endpoints
    AVAILABILITY_SLOTS: '/appointment/availability/slots',
    AVAILABILITY_SUGGEST: '/appointment/availability/suggest',
    AVAILABILITY_HOLD: '/appointment/availability/hold',
    
    // Appointment endpoints
    APPOINTMENTS: '/appointment/appointments',
    BOOK: '/appointment/book',
    // Lead/Customer/Employee specific endpoints
    LEAD_BOOK: '/appointment/appointments', // Generic endpoint for leads
    CUSTOMER_BOOK: '/appointment/customer/book', // Customer-specific endpoint
    EMPLOYEE_BOOK: '/appointment/employee/book', // Employee-specific endpoint
    LEAD_RESCHEDULE: '/appointment/lead/appointments',
    LEAD_CANCEL: '/appointment/lead/appointments',
    EMPLOYEE_UPDATE: '/appointment/employee/appointments',
    EMPLOYEE_CANCEL: '/appointment/employee/appointments',
    
    // Health endpoints
    HEALTH: '/appointment/health',
    HEALTH_LIVE: '/appointment/health/live',
    HEALTH_READY: '/appointment/health/ready',
  }
} as const;

// Helper function to build full API URLs
export const getApiUrl = (endpoint: string): string => {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
};

// Export commonly used URLs for convenience
export const API_URLS = {
  // Auth
  AUTH_LOGIN: getApiUrl(API_CONFIG.ENDPOINTS.AUTH_LOGIN),
  AUTH_ME: getApiUrl(API_CONFIG.ENDPOINTS.AUTH_ME),
  AUTH_SIGNUP: getApiUrl(API_CONFIG.ENDPOINTS.AUTH_SIGNUP),
  
  // Chat
  CHAT: getApiUrl(API_CONFIG.ENDPOINTS.CHAT),
  
  // Admin
  ADMIN_SERVICES: getApiUrl(API_CONFIG.ENDPOINTS.ADMIN_SERVICES),
  ADMIN_APPOINTMENTS: getApiUrl(API_CONFIG.ENDPOINTS.ADMIN_APPOINTMENTS),
  ADMIN_METRICS_SUMMARY: getApiUrl(API_CONFIG.ENDPOINTS.ADMIN_METRICS_SUMMARY),
  ADMIN_METRICS_HEATMAP: getApiUrl(API_CONFIG.ENDPOINTS.ADMIN_METRICS_HEATMAP),
  ADMIN_METRICS_LEAD_TIME: getApiUrl(API_CONFIG.ENDPOINTS.ADMIN_METRICS_LEAD_TIME),
  
  // Availability
  AVAILABILITY_SLOTS: getApiUrl(API_CONFIG.ENDPOINTS.AVAILABILITY_SLOTS),
  AVAILABILITY_SUGGEST: getApiUrl(API_CONFIG.ENDPOINTS.AVAILABILITY_SUGGEST),
  AVAILABILITY_HOLD: getApiUrl(API_CONFIG.ENDPOINTS.AVAILABILITY_HOLD),
  
  // Appointments
  APPOINTMENTS: getApiUrl(API_CONFIG.ENDPOINTS.APPOINTMENTS),
  BOOK: getApiUrl(API_CONFIG.ENDPOINTS.BOOK),
  // Lead/Customer/Employee specific endpoints
  LEAD_BOOK: getApiUrl(API_CONFIG.ENDPOINTS.LEAD_BOOK),
  CUSTOMER_BOOK: getApiUrl(API_CONFIG.ENDPOINTS.CUSTOMER_BOOK),
  EMPLOYEE_BOOK: getApiUrl(API_CONFIG.ENDPOINTS.EMPLOYEE_BOOK),
  LEAD_RESCHEDULE: getApiUrl(API_CONFIG.ENDPOINTS.LEAD_RESCHEDULE),
  LEAD_CANCEL: getApiUrl(API_CONFIG.ENDPOINTS.LEAD_CANCEL),
  EMPLOYEE_UPDATE: getApiUrl(API_CONFIG.ENDPOINTS.EMPLOYEE_UPDATE),
  EMPLOYEE_CANCEL: getApiUrl(API_CONFIG.ENDPOINTS.EMPLOYEE_CANCEL),
  
  // Health
  HEALTH: getApiUrl(API_CONFIG.ENDPOINTS.HEALTH),
  HEALTH_LIVE: getApiUrl(API_CONFIG.ENDPOINTS.HEALTH_LIVE),
  HEALTH_READY: getApiUrl(API_CONFIG.ENDPOINTS.HEALTH_READY),
} as const;

// Export the base URL for backward compatibility
export const API_BASE = API_CONFIG.BASE_URL;

// Export the config object for advanced usage
export default API_CONFIG;

