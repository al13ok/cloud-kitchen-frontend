/**
 * Centralized ESS API Helper
 * Provides consistent API base URL and helper functions for all ESS components
 */

import { getAuthHeaders } from './api';

/**
 * Get the backend API base URL from environment variables
 * Returns the base URL without trailing slashes and without /api/v1 prefix
 */
export const getBackendUrl = (): string => {
  const envUrl =
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    '';

  if (!envUrl) {
    // In browser, use relative paths (Next.js rewrites will handle it)
    if (typeof window !== 'undefined') {
      return '';
    }
    // Server-side fallback
    return 'https://py-mobiloitte.converiqo.ai';
  }

  // Remove trailing slashes
  let normalized = envUrl.replace(/\/+$/, '');

  // Remove /api/v1 if it's at the end (we'll add it back in specific functions)
  if (normalized.toLowerCase().endsWith('/api/v1')) {
    normalized = normalized.slice(0, -7);
  }

  return normalized;
};

/**
 * Get ESS Portal API base URL
 * Returns: http://base-url/api/v1/ess-portal or /api/v1/ess-portal (relative)
 */
export const getEssPortalApiBase = (): string => {
  const baseUrl = getBackendUrl();

  // If no base URL (browser with relative paths), return relative path
  if (!baseUrl) {
    return '/api/v1/ess-portal';
  }

  // Ensure we have /api/v1/ess-portal
  return `${baseUrl}/api/v1/ess-portal`;
};

/**
 * Get ESS Approval API base URL
 * Returns: http://base-url/api/v1/ess-approval or /api/v1/ess-approval (relative)
 */
export const getEssApprovalApiBase = (): string => {
  const baseUrl = getBackendUrl();

  // If no base URL (browser with relative paths), return relative path
  if (!baseUrl) {
    return '/api/v1/ess-approval';
  }

  // Ensure we have /api/v1/ess-approval
  return `${baseUrl}/api/v1/ess-approval`;
};

/**
 * Get Manager Approval API base URL
 * Returns: http://base-url/api/v1/ess-approval/manager-approval or /api/v1/ess-approval/manager-approval (relative)
 */
export const getManagerApprovalApiBase = (): string => {
  const baseUrl = getBackendUrl();

  // If no base URL (browser with relative paths), return relative path
  if (!baseUrl) {
    return '/api/v1/ess-approval/manager-approval';
  }

  // Ensure we have /api/v1/ess-approval/manager-approval
  return `${baseUrl}/api/v1/ess-approval/manager-approval`;
};

/**
 * Fetch with authentication headers and error handling
 */
export const essApiFetch = async (
  endpoint: string,
  options: RequestInit = {},
  retries = 3
): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

  try {
    const authHeaders = getAuthHeaders();
    const response = await fetch(endpoint, {
      ...options,
      signal: controller.signal,
      headers: {
        ...authHeaders,
        'Content-Type': 'application/json',
        'accept': 'application/json',
        ...options.headers,
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response;
  } catch (error) {
    clearTimeout(timeoutId);

    if (retries > 0 && !controller.signal.aborted) {
      console.warn(`ESS API fetch failed, retrying... (${retries} attempts left)`, error);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return essApiFetch(endpoint, options, retries - 1);
    }

    throw error;
  }
};

/**
 * ESS Portal API Endpoints
 */
export const ESS_PORTAL_ENDPOINTS = {
  // Payslips
  PAYSLIPS: {
    LIST: () => `${getEssPortalApiBase()}/payslips`,
    GET: (id: string) => `${getEssPortalApiBase()}/payslips/${id}`,
    CREATE: () => `${getEssPortalApiBase()}/payslips`,
    UPDATE: (id: string) => `${getEssPortalApiBase()}/payslips/${id}`,
    DELETE: (id: string) => `${getEssPortalApiBase()}/payslips/${id}`,
    APPROVE: (id: string) => `${getEssPortalApiBase()}/payslips/${id}/approve`,
    REJECT: (id: string) => `${getEssPortalApiBase()}/payslips/${id}/reject`,
    GENERATE_MONTHLY: () => `${getEssPortalApiBase()}/payslips/generate-monthly`,
  },

  // Leave Applications
  LEAVE: {
    LIST: () => `${getEssPortalApiBase()}/leave-applications`,
    GET: (id: string) => `${getEssPortalApiBase()}/leave-applications/${id}`,
    CREATE: () => `${getEssPortalApiBase()}/leave-applications`,
    UPDATE: (id: string) => `${getEssPortalApiBase()}/leave-applications/${id}`,
    DELETE: (id: string) => `${getEssPortalApiBase()}/leave-applications/${id}`,
    APPROVE: (id: string) => `${getEssPortalApiBase()}/leave-applications/${id}/approve`,
    REJECT: (id: string) => `${getEssPortalApiBase()}/leave-applications/${id}/reject`,
    HR_APPROVE: (id: string) => `${getEssPortalApiBase()}/leave-applications/${id}/hr-approve`,
    HR_REJECT: (id: string) => `${getEssPortalApiBase()}/leave-applications/${id}/hr-reject`,
    TYPES: () => `${getEssPortalApiBase()}/leave-types`,
    TYPE: (id: string) => `${getEssPortalApiBase()}/leave-types/${id}`,
  },

  // Attendance
  ATTENDANCE: {
    CLOCK_IN: () => `${getEssPortalApiBase()}/attendance/clock-in`,
    CLOCK_OUT: () => `${getEssPortalApiBase()}/attendance/clock-out`,
    HISTORY: (code: string) => `${getEssPortalApiBase()}/attendance/attendance-history/${code}`,
    STATS: (code: string) => `${getEssPortalApiBase()}/attendance/attendance-stats/${code}`,
    REPORT: () => `${getEssPortalApiBase()}/attendance/attendance-report`,
  },

  // Expenses
  EXPENSES: {
    LIST: () => `${getEssPortalApiBase()}/expenses`,
    GET: (id: string) => `${getEssPortalApiBase()}/expenses/${id}`,
    CREATE: () => `${getEssPortalApiBase()}/expenses`,
    UPDATE: (id: string) => `${getEssPortalApiBase()}/expenses/${id}`,
    DELETE: (id: string) => `${getEssPortalApiBase()}/expenses/${id}`,
    APPROVE: (id: string) => `${getEssPortalApiBase()}/expenses/${id}/approve`,
    REJECT: (id: string) => `${getEssPortalApiBase()}/expenses/${id}/reject`,
  },

  // Assets
  ASSETS: {
    LIST: () => `${getEssPortalApiBase()}/assets`,
    GET: (id: string) => `${getEssPortalApiBase()}/assets/${id}`,
    CREATE: () => `${getEssPortalApiBase()}/assets`,
    UPDATE: (id: string) => `${getEssPortalApiBase()}/assets/${id}`,
    DELETE: (id: string) => `${getEssPortalApiBase()}/assets/${id}`,
    APPROVE: (id: string) => `${getEssPortalApiBase()}/assets/${id}/approve`,
    REJECT: (id: string) => `${getEssPortalApiBase()}/assets/${id}/reject`,
  },

  // Users (for attendance details)
  USERS: {
    ALL: () => `${getEssPortalApiBase()}/users/all`,
  },
};

/**
 * ESS Approval API Endpoints
 */
export const ESS_APPROVAL_ENDPOINTS = {
  LEAVE: {
    PENDING: () => `${getEssApprovalApiBase()}/leave/pending`,
    DASHBOARD_STATS: () => `${getEssApprovalApiBase()}/leave/dashboard-stats`,
    APPROVE: (id: string) => `${getEssApprovalApiBase()}/leave/${id}/approve`,
    REJECT: (id: string) => `${getEssApprovalApiBase()}/leave/${id}/reject`,
    BULK_ACTION: () => `${getEssApprovalApiBase()}/leave/bulk-action`,
  },
  HEALTH: () => `${getEssApprovalApiBase()}/health`,
};

/**
 * Manager Approval API Endpoints
 */
export const MANAGER_APPROVAL_ENDPOINTS = {
  PENDING: (managerId: string) => `${getManagerApprovalApiBase()}/pending?manager_id=${managerId}`,
  APPROVED: () => `${getManagerApprovalApiBase()}/approved`,
  REJECTED: () => `${getManagerApprovalApiBase()}/rejected`,
  DASHBOARD_STATS: (managerId: string) => `${getManagerApprovalApiBase()}/dashboard-stats?manager_id=${managerId}`,
  APPROVE: (type: string, id: string) => `${getManagerApprovalApiBase()}/${type}/${id}/approve`,
  REJECT: (type: string, id: string) => `${getManagerApprovalApiBase()}/${type}/${id}/reject`,
  VIEW: (type: string, id: string) => `${getManagerApprovalApiBase()}/${type}/${id}/view`,
  DELETE: (type: string, id: string) => `${getManagerApprovalApiBase()}/${type}/${id}/delete`,
};

const essApiUtils = {
  getBackendUrl,
  getEssPortalApiBase,
  getEssApprovalApiBase,
  getManagerApprovalApiBase,
  essApiFetch,
  ESS_PORTAL_ENDPOINTS,
  ESS_APPROVAL_ENDPOINTS,
  MANAGER_APPROVAL_ENDPOINTS,
};

export default essApiUtils;

