'use client';

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { getAuthHeaders } from '@/utils/api';
import { toast } from 'react-hot-toast';
// Assuming lucide-react icons are available in the environment
import { 
  Users, CheckCircle, XCircle, Calendar, FileText, RefreshCw, AlertTriangle, Filter, Search, X, User, Clock, Eye
} from 'lucide-react';
import DashboardHeader from '@/components/header/DashboardHeader';
import Pagination from '@/components/tables/Pagination';

// --- API INTERFACES FOR BACKEND INTEGRATION ---

interface LeaveEmployeeInfo {
  employeeCode: string;
  fullName: string;
  department: string;
  designation: string;
  email: string;
}

interface LeaveDetails {
  leaveType: 'Annual Leave' | 'Sick Leave' | 'Casual Leave' | 'Maternity Leave' | 'Paternity Leave';
  fromDate: string;
  toDate: string;
  reasonForLeave: string;
}

interface ApprovalInfo {
  approvedBy?: string | null;
  approvedDate?: string | null;
  rejectedBy?: string | null;
  rejectedDate?: string | null;
  hrComments?: string | null;
}

interface BackendLeaveApplication {
  leaveId: string;
  // Some backends return internal DB id fields - include them to avoid casting to `any`
  id?: string;
  _id?: string;
  employeeInfo: LeaveEmployeeInfo;
  leaveDetails: LeaveDetails;
  status: 'Pending' | 'Approved' | 'Rejected';
  priority?: 'critical' | 'urgent' | 'high' | 'normal';
  leaveDuration?: number;
  requestedDays?: number;
  daysUntilLeave?: number;
  createdAt: string;
  updatedAt: string;
  approvalInfo?: ApprovalInfo;
}

interface DashboardStats {
  summary: {
    pendingApplications: number;
    urgentApplications: number;
    totalApplications?: number;
    approvedApplications?: number;
    rejectedApplications?: number;
    avgProcessingTime?: number;
    overdueApplications?: number;
  };
  departmentStats: Array<{
    department: string;
    pendingCount: number;
  }>;
  departmentBreakdown?: Record<string, number>;
  priorityBreakdown?: {
    critical: number;
    urgent: number;
    high: number;
    normal: number;
  };
  monthlyTrends?: Array<{
    month: string;
    applications: number;
    approved: number;
    rejected: number;
  }>;
}

interface BulkApprovalRequest {
  applicationIds: string[];
  action: 'approve' | 'reject';
  hrComments?: string;
  approvedBy: string;
}

// --- FRONTEND INTERFACES ---

interface KPI {
  id: number;
  icon: React.ElementType;
  title: string;
  value: number | string;
  color: string;
}

interface ChartData {
  label: string;
  value: number;
  color: string;
  category?: 'Total' | 'Approved' | 'Rejected';
}

interface Application {
  id: string;
  leaveId?: string; // human-friendly leave code (LV-YYYY-NNN)
  employeeName: string;
  employeeId: string;
  department: string;
  type: 'Leave Request' | 'Transfer Request' | 'Policy Clarification';
  leaveType?: 'Annual Leave' | 'Sick Leave' | 'Casual Leave' | 'Maternity Leave' | 'Paternity Leave';
  details: string;
  priority: 'critical' | 'urgent' | 'high' | 'normal';
  appliedOn: string;
  // raw ISO date from backend (used for accurate grouping by month)
  appliedAt?: string;
  status: 'pending' | 'approved' | 'rejected';
  statusDate?: string;
  daysUntilLeave?: number;
  leaveDuration?: number;
  hrComments?: string;
  // Original backend status - used to determine if HR can approve/reject
  originalStatus?: string;
}

// --- API SERVICE FUNCTIONS ---

import { getEssPortalApiBase, ESS_PORTAL_ENDPOINTS } from '@/utils/essApi';

const API_BASE = getEssPortalApiBase();

const hrApprovalAPI = {
  // Helper function for fetch with timeout and retry
  fetchWithRetry: async (url: string, options: RequestInit = {}, retries = 3): Promise<Response> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    try {
      const authHeaders = getAuthHeaders();
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        // Try to extract error details from response body
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errorData = await response.clone().json();
          if (errorData.detail) {
            errorMessage = `HTTP ${response.status}: ${errorData.detail}`;
          } else if (errorData.message) {
            errorMessage = `HTTP ${response.status}: ${errorData.message}`;
          }
        } catch {
          // If parsing fails, use the default error message
        }
        throw new Error(errorMessage);
      }
      
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      
      // Don't retry on 400 Bad Request errors (client errors)
      if (error instanceof Error && error.message.includes('HTTP 400')) {
        throw error;
      }
      
      if (retries > 0 && !controller.signal.aborted) {
        console.warn(`Fetch failed, retrying... (${retries} attempts left)`, error);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
        return hrApprovalAPI.fetchWithRetry(url, options, retries - 1);
      }
      
      throw error;
    }
  },

  // Get manager-approved leave applications ready for HR review
  getPendingApplications: async (department?: string): Promise<BackendLeaveApplication[]> => {
    try {
      // Fetch all leave applications and filter for Manager Approved ones
      const url = ESS_PORTAL_ENDPOINTS.LEAVE.LIST();
      const response = await hrApprovalAPI.fetchWithRetry(url);
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'API returned unsuccessful response');
      }
      
      // Ensure data.data is an array
      const applicationsArray = data.data;
      if (!Array.isArray(applicationsArray)) {
        return [];
      }
      
      // Filter for leave applications that are Manager Approved OR HR processed
      
      let applications: BackendLeaveApplication[] = applicationsArray
        .filter((app: Record<string, unknown>) => {
          const status = String(app.status);
          const isManagerApproved = status === 'Approved' || status.toLowerCase() === 'manager_approved' || status.toLowerCase() === 'approved';
          const isHRProcessed = status.toLowerCase() === 'hr_approved' || status.toLowerCase() === 'hr_rejected';
          return isManagerApproved || isHRProcessed;
        })
        .map((app: Record<string, unknown>) => ({
          leaveId: String(app.leaveId || app.leave_id || app.id), // Prefer human-readable leaveId if available
          id: String(app.id),
          _id: String(app.id),
          employeeInfo: {
            employeeCode: String((app.employeeInfo as Record<string, unknown>)?.employeeCode || app.employee_id || ''),
            fullName: String((app.employeeInfo as Record<string, unknown>)?.fullName || app.employee_name || ''),
            department: String((app.employeeInfo as Record<string, unknown>)?.department || app.department || ''),
            designation: String((app.employeeInfo as Record<string, unknown>)?.designation || 'Employee'),
            email: String((app.employeeInfo as Record<string, unknown>)?.email || `${String(app.employee_id || '').toLowerCase()}@company.com`)
          },
          leaveDetails: {
            leaveType: (String((app.leaveDetails as Record<string, unknown>)?.leaveType || 'Annual Leave') as 'Annual Leave' | 'Sick Leave' | 'Casual Leave' | 'Maternity Leave' | 'Paternity Leave'),
            fromDate: String((app.leaveDetails as Record<string, unknown>)?.fromDate || app.start_date || new Date().toISOString().split('T')[0]),
            toDate: String((app.leaveDetails as Record<string, unknown>)?.toDate || app.end_date || new Date().toISOString().split('T')[0]),
            reasonForLeave: String((app.leaveDetails as Record<string, unknown>)?.reasonForLeave || app.description || 'Leave request')
          },
          status: (() => {
            const status = String(app.status);
            if (status.toLowerCase() === 'hr_approved') return 'Approved';
            if (status.toLowerCase() === 'hr_rejected') return 'Rejected';
            return 'Pending'; // Manager approved applications are pending for HR review
          })(),
          // Store original backend status for validation
          originalStatus: String(app.status),
          priority: (String(app.priority || 'normal') as 'critical' | 'urgent' | 'high' | 'normal'),
          leaveDuration: Number(app.requestedDays || app.amount || 1),
          requestedDays: Number(app.requestedDays || app.amount || 1),
          daysUntilLeave: 0,
          createdAt: String(app.createdAt || app.created_at || ''),
          updatedAt: String(app.updatedAt || app.updated_at || app.created_at || ''),
          approvalInfo: (() => {
            const status = String(app.status);
            if (status.toLowerCase() === 'hr_approved') {
              return {
                approvedBy: 'HR Manager',
                approvedDate: String(app.updatedAt || app.updated_at || app.created_at || ''),
                hrComments: String((app.approvalInfo as Record<string, unknown>)?.hrComments || '')
              };
            }
            if (status.toLowerCase() === 'hr_rejected') {
              return {
                rejectedBy: 'HR Manager',
                rejectedDate: String(app.updatedAt || app.updated_at || app.created_at || ''),
                hrComments: String((app.approvalInfo as Record<string, unknown>)?.hrComments || '')
              };
            }
            return {
              approvedBy: 'Manager',
              approvedDate: String(app.created_at || ''),
              hrComments: null
            };
          })()
        }));
      
      // Filter by department if specified
      if (department) {
        applications = applications.filter((app: BackendLeaveApplication) => 
          app.employeeInfo?.department === department
        );
      }
      
      return applications;
    } catch (error) {
      console.error('❌ Error fetching manager-approved leave applications:', error);
      throw new Error(`Failed to fetch manager-approved leave applications: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  // Get dashboard statistics from leave applications endpoint
  getDashboardStats: async (): Promise<DashboardStats> => {
    try {
      // Fetch all leave applications and filter for Manager Approved ones
      const url = ESS_PORTAL_ENDPOINTS.LEAVE.LIST();
      const response = await hrApprovalAPI.fetchWithRetry(url);
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'API returned unsuccessful response');
      }
      
      // Ensure data.data is an array
      const applicationsArray = data.data;
      if (!Array.isArray(applicationsArray)) {
        return {
          summary: {
            totalApplications: 0,
            pendingApplications: 0,
            approvedApplications: 0,
            rejectedApplications: 0,
            urgentApplications: 0,
            avgProcessingTime: 0,
            overdueApplications: 0
          },
          departmentStats: [],
          departmentBreakdown: {},
          priorityBreakdown: {
            critical: 0,
            urgent: 0,
            high: 0,
            normal: 0
          }
        };
      }
      
      // Filter for leave applications that are Manager Approved OR HR processed
      
      const applications: BackendLeaveApplication[] = applicationsArray
        .filter((app: Record<string, unknown>) => {
          const status = String(app.status);
          const isManagerApproved = status === 'Approved' || status.toLowerCase() === 'manager_approved' || status.toLowerCase() === 'approved';
          const isHRProcessed = status.toLowerCase() === 'hr_approved' || status.toLowerCase() === 'hr_rejected';
          return isManagerApproved || isHRProcessed;
        })
        .map((app: Record<string, unknown>) => ({
          leaveId: String(app.leaveId || app.leave_id || app.id), // Prefer human-readable leaveId if available
          id: String(app.id),
          _id: String(app.id),
          employeeInfo: {
            employeeCode: String((app.employeeInfo as Record<string, unknown>)?.employeeCode || app.employee_id || ''),
            fullName: String((app.employeeInfo as Record<string, unknown>)?.fullName || app.employee_name || ''),
            department: String((app.employeeInfo as Record<string, unknown>)?.department || app.department || ''),
            designation: String((app.employeeInfo as Record<string, unknown>)?.designation || 'Employee'),
            email: String((app.employeeInfo as Record<string, unknown>)?.email || `${String(app.employee_id || '').toLowerCase()}@company.com`)
          },
          leaveDetails: {
            leaveType: (String((app.leaveDetails as Record<string, unknown>)?.leaveType || 'Annual Leave') as 'Annual Leave' | 'Sick Leave' | 'Casual Leave' | 'Maternity Leave' | 'Paternity Leave'),
            fromDate: String((app.leaveDetails as Record<string, unknown>)?.fromDate || app.start_date || new Date().toISOString().split('T')[0]),
            toDate: String((app.leaveDetails as Record<string, unknown>)?.toDate || app.end_date || new Date().toISOString().split('T')[0]),
            reasonForLeave: String((app.leaveDetails as Record<string, unknown>)?.reasonForLeave || app.description || 'Leave request')
          },
          status: (() => {
            const status = String(app.status);
            if (status.toLowerCase() === 'hr_approved') return 'Approved';
            if (status.toLowerCase() === 'hr_rejected') return 'Rejected';
            return 'Pending'; // Manager approved applications are pending for HR review
          })(),
          // Store original backend status for validation
          originalStatus: String(app.status),
          priority: (String(app.priority || 'normal') as 'critical' | 'urgent' | 'high' | 'normal'),
          leaveDuration: Number(app.requestedDays || app.amount || 1),
          requestedDays: Number(app.requestedDays || app.amount || 1),
          daysUntilLeave: 0,
          createdAt: String(app.createdAt || app.created_at || ''),
          updatedAt: String(app.updatedAt || app.updated_at || app.created_at || ''),
          approvalInfo: (() => {
            const status = String(app.status);
            if (status.toLowerCase() === 'hr_approved') {
              return {
                approvedBy: 'HR Manager',
                approvedDate: String(app.updatedAt || app.updated_at || app.created_at || ''),
                hrComments: String((app.approvalInfo as Record<string, unknown>)?.hrComments || '')
              };
            }
            if (status.toLowerCase() === 'hr_rejected') {
              return {
                rejectedBy: 'HR Manager',
                rejectedDate: String(app.updatedAt || app.updated_at || app.created_at || ''),
                hrComments: String((app.approvalInfo as Record<string, unknown>)?.hrComments || '')
              };
            }
            return {
              approvedBy: 'Manager',
              approvedDate: String(app.created_at || ''),
              hrComments: null
            };
          })()
        }));
      
      
      // Calculate stats from the applications data
      const pendingApplications = applications.filter((app: BackendLeaveApplication) => 
        app.status?.toLowerCase() === 'pending'
      ).length;
      
      const totalApplications = applications.length;
      const approvedApplications = applications.filter((app: BackendLeaveApplication) => 
        app.status?.toLowerCase() === 'approved'
      ).length;
      
      const rejectedApplications = applications.filter((app: BackendLeaveApplication) => 
        app.status?.toLowerCase() === 'rejected'
      ).length;
      
      // Calculate department breakdown
      const departmentBreakdown: Record<string, number> = {};
      applications.forEach((app: BackendLeaveApplication) => {
        const dept = app.employeeInfo?.department || 'Unknown';
        departmentBreakdown[dept] = (departmentBreakdown[dept] || 0) + 1;
      });
      
      // Calculate priority breakdown for pending applications
      const priorityBreakdown = {
        critical: applications.filter((app: BackendLeaveApplication) => 
          app.status?.toLowerCase() === 'pending' && app.priority === 'critical'
        ).length,
        urgent: applications.filter((app: BackendLeaveApplication) => 
          app.status?.toLowerCase() === 'pending' && app.priority === 'urgent'
        ).length,
        high: applications.filter((app: BackendLeaveApplication) => 
          app.status?.toLowerCase() === 'pending' && app.priority === 'high'
        ).length,
        normal: applications.filter((app: BackendLeaveApplication) => 
          app.status?.toLowerCase() === 'pending' && (app.priority === 'normal' || !app.priority)
        ).length,
      };
      
      const stats = {
        summary: {
          totalApplications,
          pendingApplications,
          approvedApplications,
          rejectedApplications,
          urgentApplications: priorityBreakdown.critical + priorityBreakdown.urgent,
          avgProcessingTime: 0, // Not available from current API
          overdueApplications: 0,
        },
        departmentStats: Object.entries(departmentBreakdown).map(([department, count]) => ({
          department,
          pendingCount: count
        })),
        departmentBreakdown,
        priorityBreakdown,
      } as DashboardStats;
      
      return stats;
    } catch (error) {
      console.error('❌ Error fetching dashboard stats:', error);
      throw new Error(`Failed to fetch dashboard statistics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  // Approve leave application - update status to hr_approved
  approveApplication: async (applicationId: string, comments?: string) => {
    try {
      const response = await hrApprovalAPI.fetchWithRetry(ESS_PORTAL_ENDPOINTS.LEAVE.HR_APPROVE(applicationId), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          hr_name: 'HR Manager', // TODO: Get from user context
          comments: comments || 'Approved by HR'
        }),
      });
      
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('❌ Error approving application:', error);
      
      // Try to extract detailed error message from response
      if (error instanceof Error) {
        if (error.message.includes('HTTP 400')) {
          let errorDetail = error.message;
          try {
            const errorMatch = error.message.match(/HTTP 400: (.+)/);
            if (errorMatch) {
              errorDetail = errorMatch[1];
            }
          } catch {
            // Ignore parse errors
          }
          throw new Error(`Failed to approve application: ${errorDetail}`);
        }
        throw new Error(`Failed to approve application: ${error.message}`);
      }
      
      throw new Error(`Failed to approve application: Unknown error`);
    }
  },

  // Reject leave application - update status to hr_rejected
  rejectApplication: async (applicationId: string, comments?: string, originalStatus?: string) => {
    try {
      // Validate that the application is in the correct status before attempting to reject
      if (originalStatus) {
        const statusLower = originalStatus.toLowerCase();
        const isValidStatus = statusLower === 'approved' || statusLower === 'manager_approved';
        
        if (!isValidStatus) {
          throw new Error(`Application must be Manager Approved before HR can reject it. Current status: ${originalStatus}`);
        }
      }

      const response = await hrApprovalAPI.fetchWithRetry(ESS_PORTAL_ENDPOINTS.LEAVE.HR_REJECT(applicationId), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          hr_name: 'HR Manager', // TODO: Get from user context
          comments: comments || 'Rejected by HR'
        }),
      });
      
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('❌ Error rejecting application:', error);
      
      // Try to extract detailed error message from response
      if (error instanceof Error) {
        // Check if it's an HTTP error with status
        if (error.message.includes('HTTP 400')) {
          // Try to get more details from the error
          let errorDetail = error.message;
          
          // If we have access to the response, try to parse it
          try {
            // The error might contain response details
            const errorMatch = error.message.match(/HTTP 400: (.+)/);
            if (errorMatch) {
              errorDetail = errorMatch[1];
            }
          } catch {
            // Ignore parse errors
          }
          
          throw new Error(`Failed to reject application: ${errorDetail}`);
        }
        
        throw new Error(`Failed to reject application: ${error.message}`);
      }
      
      throw new Error(`Failed to reject application: Unknown error`);
    }
  },

  // Bulk approve/reject applications
  bulkAction: async (request: BulkApprovalRequest) => {
    // Since ESS Portal doesn't have bulk endpoint, we'll do individual requests
    const promises = request.applicationIds.map(async (applicationId) => {
      const authHeaders = getAuthHeaders();
      const response = await fetch(`${API_BASE}/leave-applications/${applicationId}`, {
        method: 'PUT',
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: request.action === 'approve' ? 'Approved' : 'Rejected'
        }),
      });
      if (!response.ok) throw new Error(`Failed to ${request.action} application ${applicationId}`);
      return response.json();
    });
    
    const results = await Promise.all(promises);
    return {
      success: true,
      message: `Successfully ${request.action}d ${request.applicationIds.length} applications`,
      results
    };
  },
};

// --- UTILITY FUNCTIONS ---

const transformBackendToFrontend = (backendApp: BackendLeaveApplication): Application => {
  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (error) {
      console.warn('❌ Error formatting date:', dateStr, error);
      return 'N/A';
    }
  };

  // Ensure all required fields exist
  if (!backendApp.leaveId || !backendApp.employeeInfo || !backendApp.leaveDetails) {
    throw new Error('Invalid application data structure');
  }

  return {
    // Prefer internal DB id if available, otherwise fall back to leaveId (human code)
    id: backendApp.id || backendApp._id || backendApp.leaveId,
    leaveId: backendApp.leaveId,
    employeeName: backendApp.employeeInfo?.fullName || 'Unknown',
    employeeId: backendApp.employeeInfo?.employeeCode || 'Unknown',
    department: backendApp.employeeInfo?.department || 'Unknown',
    type: 'Leave Request',
    leaveType: (backendApp.leaveDetails?.leaveType as 'Annual Leave' | 'Sick Leave' | 'Casual Leave' | 'Maternity Leave' | 'Paternity Leave') || 'Annual Leave',
    details: `${backendApp.leaveDuration || backendApp.requestedDays || 0} days - ${backendApp.leaveDetails?.reasonForLeave || 'No reason provided'}`,
    priority: (backendApp.priority || 'normal') as 'critical' | 'urgent' | 'high' | 'normal',
    appliedOn: formatDate(backendApp.createdAt),
    appliedAt: backendApp.createdAt,
    status: backendApp.status.toLowerCase() as 'pending' | 'approved' | 'rejected',
    statusDate: backendApp.approvalInfo?.approvedDate || backendApp.approvalInfo?.rejectedDate 
      ? formatDate(backendApp.approvalInfo.approvedDate || backendApp.approvalInfo.rejectedDate || '')
      : undefined,
    daysUntilLeave: backendApp.daysUntilLeave || 0,
    leaveDuration: backendApp.leaveDuration || backendApp.requestedDays || 0,
    hrComments: undefined,
    // Store original backend status for validation
    originalStatus: backendApp.status,
  };
};

// --- CUSTOM HOOKS FOR DATA MANAGEMENT ---

const useHRApplications = () => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (retryCount = 0) => {
    try {
      setLoading(true);
      setError(null);

      // Fetch both pending applications and dashboard stats
      const [pendingApps, stats] = await Promise.all([
        hrApprovalAPI.getPendingApplications(),
        hrApprovalAPI.getDashboardStats(),
      ]);

      // pendingApps are already in the correct BackendLeaveApplication format
      // We need to convert them to the frontend Application format
      
      const transformedApps = pendingApps
        .filter(app => {
          const isValid = app && app.leaveId && app.employeeInfo && app.leaveDetails;
          return isValid;
        })
        .map(app => {
          try {
            // Since the data is already in BackendLeaveApplication format, we can transform it directly
            const transformed = transformBackendToFrontend(app);
            return transformed;
          } catch (error) {
            console.error('Error transforming application:', error, app);
            return null;
          }
        })
        .filter(app => app !== null) as Application[];
      
      setApplications(transformedApps);
      setDashboardStats(stats);
      
      // Clear any previous errors
      setError(null);
    } catch (err) {
      console.error('❌ Error fetching HR data:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load data';
      
      // Retry logic for network errors
      if (retryCount < 2 && (errorMessage.includes('fetch') || errorMessage.includes('network') || errorMessage.includes('timeout'))) {
        setTimeout(() => {
          fetchData(retryCount + 1);
        }, 2000);
        return;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial data load with immediate execution
  useEffect(() => {
    fetchData();
    
    // Set up auto-refresh every 30 seconds
    const refreshInterval = setInterval(() => {
      fetchData();
    }, 30000);
    
    return () => {
      clearInterval(refreshInterval);
    };
  }, [fetchData]);

  // Create a refresh function for UI interactions (no parameters)
  const refreshData = useCallback(() => {
    fetchData();
  }, [fetchData]);

  // Handle approve/reject actions
  const handleAction = useCallback(async (
    applicationId: string, 
    action: 'approve' | 'reject',
    comments?: string,
    originalStatus?: string
  ) => {
    try {
      if (action === 'approve') {
        await hrApprovalAPI.approveApplication(applicationId, comments);
      } else {
        await hrApprovalAPI.rejectApplication(applicationId, comments, originalStatus);
      }

      // Refresh data after action
      await fetchData();
      
      return { success: true };
    } catch (err) {
      console.error(`Error ${action}ing application:`, err);
      
      // Extract error message
      let errorMessage = `Failed to ${action} application`;
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      }
      
      return { 
        success: false, 
        error: errorMessage
      };
    }
  }, [fetchData]);

  // Handle bulk actions
  const handleBulkAction = useCallback(async (
    applicationIds: string[],
    action: 'approve' | 'reject',
    comments?: string
  ) => {
    try {
      const request: BulkApprovalRequest = {
        applicationIds,
        action: action,
        hrComments: comments || '',
        approvedBy: 'HR Manager',
      };

      await hrApprovalAPI.bulkAction(request);
      await fetchData(); // Refresh data
      
      return { success: true };
    } catch (err) {
      console.error(`Error in bulk ${action}:`, err);
      return { 
        success: false, 
        error: err instanceof Error ? err.message : `Failed to ${action} applications` 
      };
    }
  }, [fetchData]);

  return {
    applications,
    dashboardStats,
    loading,
    error,
    refreshData: refreshData,
    handleAction,
    handleBulkAction,
  };
};

// --- UTILITY COMPONENTS ---

// Function to convert request type or priority to display styling
const StatusTag: React.FC<{ status: Application['status'] | Application['priority'] | Application['leaveType'] | Application['type'] }> = ({ status }) => {
  let bgColor = 'bg-gray-100 text-gray-700';
  let label = status ? status.charAt(0).toUpperCase() + status.slice(1) : '';
  const baseClasses = 'inline-flex items-center text-xs px-2 py-0.5 rounded-full whitespace-nowrap';

  switch (status) {
    case 'approved': bgColor = 'bg-green-100 text-green-700 font-medium'; label = 'Approved'; break;
    case 'rejected': bgColor = 'bg-red-100 text-red-700 font-medium'; label = 'Rejected'; break;
    case 'pending': bgColor = 'bg-yellow-100 text-yellow-700 font-medium'; label = 'Pending'; break;
    case 'critical': bgColor = 'bg-red-600 text-white font-medium'; label = '🔥 Critical'; break;
    case 'urgent': bgColor = 'bg-red-500 text-white font-medium'; label = '⚡ Urgent'; break;
    case 'high': bgColor = 'bg-orange-500 text-white font-medium'; label = '🔶 High'; break;
    case 'normal': bgColor = 'bg-indigo-500 text-white font-medium'; label = '📋 Normal'; break;
    case 'Annual Leave': bgColor = 'bg-blue-600 text-white font-medium'; break;
    case 'Sick Leave': bgColor = 'bg-red-500 text-white font-medium'; break;
    case 'Casual Leave': bgColor = 'bg-green-600 text-white font-medium'; break;
    case 'Maternity Leave': bgColor = 'bg-orange-500 text-white font-medium'; break;
    case 'Transfer Request': bgColor = 'bg-purple-500 text-white font-medium'; break;
    case 'Policy Clarification': bgColor = 'bg-gray-700 text-white font-medium'; break;
    default: label = status ? status.charAt(0).toUpperCase() + status.slice(1) : ''; break;
  }

  return (
    <span className={`${baseClasses} ${bgColor}`}>
      {label}
    </span>
  );
};

// Custom Doughnut Chart component (responsive)
const DoughnutChart: React.FC<{ title: string; data: ChartData[]; total: number }> = ({ title, data, total }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState<number>(150);
  const strokeWidth = 20;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const [hovered, setHovered] = useState<{ label: string; value: number; x: number; y: number } | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const resize = () => {
      const w = Math.max(120, Math.min(260, el.clientWidth));
      setSize(w);
    };

    resize();
    const ro = new ResizeObserver(() => resize());
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const getDoughnutSegments = () => {
    let currentOffset = 0;
    return data.map((item, index) => {
      const segmentRatio = total > 0 ? item.value / total : 0;
      const strokeDasharray = `${segmentRatio * circumference} ${circumference}`;
      const strokeDashoffset = currentOffset;
      currentOffset -= segmentRatio * circumference;

      return (
        <circle
          key={index}
          className="transition-all duration-500 cursor-pointer"
          r={radius}
          cx={size / 2}
          cy={size / 2}
          fill="none"
          stroke={item.color}
          strokeWidth={strokeWidth}
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="butt"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          onMouseMove={(e: React.MouseEvent<SVGCircleElement>) => {
            // Use viewport coordinates so tooltip can be positioned fixed relative to viewport
            setHovered({ 
              label: item.label, 
              value: item.value, 
              x: e.clientX, 
              y: e.clientY 
            });
          }}
          onMouseLeave={() => setHovered(null)}
        />
      );
    });
  };

  return (
    <div ref={containerRef} className="flex flex-col h-full bg-white dark:bg-gray-800 backdrop-blur-sm p-4 md:p-6 rounded-xl shadow-lg transition duration-300 hover:shadow-2xl border border-slate-200/50 dark:border-gray-700 relative" style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.03) 0%, rgba(99, 102, 241, 0.03) 50%, rgba(14, 165, 233, 0.03) 100%)' }}>
      <h3 className="text-base md:text-lg font-semibold text-gray-800 dark:text-white mb-4" style={{ color: '#3366CC' }}>{title}</h3>
      <div className="flex flex-col items-center justify-center flex-grow min-h-0 overflow-visible relative">
        <div className="relative mb-6" style={{ minHeight: size }}>
          {total > 0 ? (
            <>
              <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                {/* Background Circle */}
                <circle
                  r={radius}
                  cx={size / 2}
                  cy={size / 2}
                  fill="none"
                  stroke="#e5e7eb"
                  className="dark:stroke-gray-700"
                  strokeWidth={strokeWidth}
                />
                {getDoughnutSegments()}
              </svg>
                    {/* Enhanced Tooltip (follows cursor closely) - Portal based */}
                    {hovered && typeof document !== 'undefined' && createPortal(
                      (() => {
                        const vw = window.innerWidth;
                        const vh = window.innerHeight;
                        const tooltipWidth = 180;
                        const tooltipHeight = 80;
                        const offset = 15; // Distance from cursor
                        
                        // Position tooltip near cursor with smart boundary detection
                        let left = hovered.x + offset;
                        let top = hovered.y + offset;
                        
                        // Adjust if tooltip would go off right edge
                        if (left + tooltipWidth > vw) {
                          left = hovered.x - tooltipWidth - offset;
                        }
                        
                        // Adjust if tooltip would go off bottom edge
                        if (top + tooltipHeight > vh) {
                          top = hovered.y - tooltipHeight - offset;
                        }
                        
                        // Ensure tooltip stays within viewport
                        left = Math.max(8, Math.min(left, vw - tooltipWidth - 8));
                        top = Math.max(8, Math.min(top, vh - tooltipHeight - 8));
                        
                        const percentage = total > 0 ? ((hovered.value / total) * 100).toFixed(1) : '0';
                        return (
                          <div
                            className="pointer-events-none bg-gradient-to-r from-gray-800 to-gray-900 text-white text-xs px-3 py-2 rounded-lg shadow-xl border border-gray-600"
                            style={{ 
                              position: 'fixed', 
                              left, 
                              top, 
                              width: tooltipWidth,
                              zIndex: 99999, // Very high z-index to ensure it appears above everything
                              transform: 'none' // Remove any transforms for precise positioning
                            }}
                          >
                            <div className="font-semibold text-sm mb-1">{hovered.label}</div>
                            <div className="text-lg font-bold text-blue-300 mb-1">{hovered.value} applications</div>
                            <div className="text-xs text-gray-300">
                              {percentage}% of total
                            </div>
                            <div className="text-xs text-gray-400 mt-1">
                              Total: {total} applications
                            </div>
                            <div className="text-xs text-gray-500 mt-1 border-t border-gray-600 pt-1">
                              Last updated: {new Date().toLocaleTimeString('en-GB')}
                            </div>
                          </div>
                        );
                      })(),
                      document.body
                    )}
            </>
          ) : (
            <div className="text-sm text-gray-500 dark:text-gray-400">No data to display</div>
          )}
        </div>
        
        <div className="flex flex-col gap-1 text-sm w-full">
          {data.map((item, index) => (
            <div key={index} className="flex items-center justify-center">
              <span 
                className="w-3 h-3 rounded-full mr-2 flex-shrink-0" 
                style={{ backgroundColor: item.color }}
              ></span>
              <span className="text-gray-600 dark:text-gray-300 font-medium text-center">{item.label}: {item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Custom Bar Chart component
const BarChart: React.FC<{ title: string; data: ChartData[]; max: number; yLabelFormatter: (val: number) => string, stacked?: boolean }> = ({ title, data, max, yLabelFormatter, stacked = false }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  // const yAxisTicks = useMemo(() => [0, 0.25, 0.5, 0.75, 1.0], []); // commented as unused
  const [chartHeight, setChartHeight] = useState<number>(350); // dynamic based on width

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const resize = () => {
      const w = el.clientWidth;
      if (w < 480) setChartHeight(220);
      else if (w < 768) setChartHeight(280);
      else if (w < 1024) setChartHeight(340);
      else setChartHeight(420);
    };

    resize();
    const ro = new ResizeObserver(() => resize());
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  
  // State for hover tooltip
  const [hoveredBar, setHoveredBar] = useState<{ value: number; label: string; x: number; y: number } | null>(null);
  
  // If stacked, we group the data by label (month) and then by color (category)
  const groupedData: Record<string, ChartData[]> = useMemo(() => {
    if (!stacked) return {};
    return data.reduce((acc, item) => {
      acc[item.label] = acc[item.label] || [];
      acc[item.label].push(item);
      return acc;
    }, {} as Record<string, ChartData[]>);
  }, [data, stacked]);

  const barLabels = stacked ? Object.keys(groupedData) : data.map(d => d.label);

  const stackLegend = stacked ? [
    { category: 'Total', color: '#3b82f6' }, 
    { category: 'Approved', color: '#10b981' }, 
    { category: 'Rejected', color: '#ef4444' }
  ] : [];

  const handleMouseEnter = (event: React.MouseEvent, value: number, label: string, category?: string) => {
    // Use client coordinates so tooltip can be positioned fixed relative to viewport
    const x = event.clientX;
    const y = event.clientY;
    setHoveredBar({
      value,
      label: category ? `${label} - ${category}` : label,
      x,
      y
    });
  };

  const handleMouseLeave = () => {
    setHoveredBar(null);
  };

  return (
    <div ref={containerRef} className="flex flex-col h-full bg-white dark:bg-gray-800 backdrop-blur-sm p-4 md:p-6 rounded-xl shadow-lg transition duration-300 hover:shadow-2xl relative border border-slate-200/50 dark:border-gray-700" style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.03) 0%, rgba(99, 102, 241, 0.03) 50%, rgba(14, 165, 233, 0.03) 100%)' }}>
      <h3 className="text-base md:text-lg font-semibold mb-4 flex items-center" style={{ color: '#3366CC' }}>
        {title === "Monthly Application Trends" && <Calendar className="w-4 h-4 mr-2" style={{ color: '#3366CC' }} />}
        {title}
      </h3>
      
      {/* Chart Container */}
      <div className="flex-1 flex overflow-hidden" style={{ height: `${chartHeight}px` }}>
        
        {/* Y-Axis Labels */}
        <div className="w-10 flex flex-col justify-between text-right pr-2 py-2">
          {[1.0, 0.75, 0.5, 0.25, 0].map((ratio, index) => (
            <div key={index} className="text-xs text-gray-600 dark:text-gray-300 font-medium">
              {yLabelFormatter(max * ratio)}
            </div>
          ))}
        </div>
        
        {/* Chart Area */}
        <div className="flex-1 relative border-l border-b border-gray-300 dark:border-gray-600">
          {/* Horizontal grid lines */}
          {[0.25, 0.5, 0.75, 1.0].map((ratio, index) => (
            <div 
              key={index} 
              className="absolute left-0 right-0 border-t border-gray-100 dark:border-gray-700" 
              style={{ bottom: `${ratio * 100}%` }}
            />
          ))}
          
          {/* Bars Container */}
          <div className="absolute inset-0 flex items-end justify-between px-2 pb-1">
            {stacked ? (
              // Stacked bars for Monthly Trends
              barLabels.map((month, monthIndex) => {
                const monthData = groupedData[month]
                  .filter(item => item.category && item.category !== 'Total')
                  .sort((a) => (a.category === 'Rejected' ? 1 : -1));
                
                const totalMonthValue = monthData.reduce((sum, item) => sum + item.value, 0);
                const barHeight = Math.min((totalMonthValue / max) * 95, 95); // Cap at 95% to prevent overflow

                return (
                  <div 
                    key={monthIndex} 
                    className="flex flex-col justify-end flex-1 mx-1 rounded-t-lg relative" 
                    style={{ height: `${barHeight}%` }}
                  >
                    {monthData.map((item, itemIndex) => (
                      <div
                        key={itemIndex}
                        className="transition-all duration-200 hover:brightness-110 cursor-pointer hover:scale-x-105"
                        style={{ 
                          height: `${(item.value / totalMonthValue) * 100}%`,
                          backgroundColor: item.color,
                        }}
                        onMouseEnter={(e) => {
                          e.stopPropagation();
                          handleMouseEnter(e, item.value, month, item.category);
                        }}
                        onMouseLeave={handleMouseLeave}
                      />
                    ))}
                  </div>
                );
              })
            ) : (
              // Individual bars for Department-wise
              data.map((item, index) => {
                const barHeight = Math.min((item.value / max) * 95, 95); // Cap at 95% to prevent overflow
                return (
                  <div
                    key={index}
                    className="flex-1 mx-1 rounded-t-lg transition-all duration-200 hover:scale-105 hover:shadow-lg hover:brightness-110 cursor-pointer"
                    style={{ 
                      height: `${barHeight}%`,
                      backgroundColor: item.color,
                    }}
                    onMouseEnter={(e) => {
                      e.stopPropagation();
                      handleMouseEnter(e, item.value, item.label);
                    }}
                    onMouseLeave={handleMouseLeave}
                  />
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* X-Axis Labels */}
      <div className="flex ml-10 pt-2">
        <div className="flex-1 flex justify-between text-center text-xs text-gray-600 dark:text-gray-300 font-medium">
          {barLabels.map((label, index) => (
            <div key={index} className="flex-1">
              {label.length > 3 ? label.substring(0, 3) : label}
            </div>
          ))}
        </div>
      </div>

      {/* Enhanced Hover Tooltip (follows cursor closely) - Portal based */}
      {hoveredBar && typeof document !== 'undefined' && createPortal(
        <div 
          className="bg-gradient-to-r from-gray-800 to-gray-900 text-white text-sm px-4 py-3 rounded-lg shadow-xl pointer-events-none border border-gray-600"
          style={{
            position: 'fixed',
            left: (() => {
              const vw = window.innerWidth;
              const tooltipWidth = 160;
              const offset = 15;
              let left = hoveredBar.x + offset;
              if (left + tooltipWidth > vw) {
                left = hoveredBar.x - tooltipWidth - offset;
              }
              return Math.max(8, Math.min(left, vw - tooltipWidth - 8));
            })(),
            top: (() => {
              const vh = window.innerHeight;
              const tooltipHeight = 80;
              const offset = 15;
              let top = hoveredBar.y + offset;
              if (top + tooltipHeight > vh) {
                top = hoveredBar.y - tooltipHeight - offset;
              }
              return Math.max(8, Math.min(top, vh - tooltipHeight - 8));
            })(),
            minWidth: '140px',
            textAlign: 'center',
            zIndex: 99999, // Very high z-index to ensure it appears above everything
            transform: 'none' // Remove transforms for precise positioning
          }}
        >
          <div className="font-semibold text-sm mb-1">{hoveredBar.label}</div>
          <div className="text-xl font-bold text-blue-300 mb-1">{hoveredBar.value} applications</div>
          {stacked && (
            <div className="text-xs text-gray-300">
              {title === "Monthly Application Trends" ? "Monthly breakdown" : "Department data"}
            </div>
          )}
          <div className="text-xs text-gray-400 mt-1 border-t border-gray-600 pt-1">
            Last updated: {new Date().toLocaleTimeString('en-GB')}
          </div>
        </div>,
        document.body
      )}
      
      {/* Legend for Stacked Chart */}
      {stacked && (
        <div className="flex justify-center gap-4 mt-4 text-sm">
          {stackLegend.filter(l => l.category !== 'Total').map((item, index) => (
            <div key={index} className="flex items-center">
              <span 
                className="w-3 h-3 rounded-full mr-2" 
                style={{ backgroundColor: item.color }}
              />
              <span className="text-gray-600 dark:text-gray-300">{item.category}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};


// --- HR VIEW COMPONENTS ---

const HROverviewContent: React.FC<{ applications: Application[]; dashboardStats: DashboardStats | null }> = ({ applications }) => {
  
  // 1. Leave Types Distribution Data (Doughnut Chart)
  const leaveTypeData: ChartData[] = useMemo(() => {
    const leaveRequests = applications.filter(a => a.type === 'Leave Request' && a.leaveType);
    const counts = leaveRequests.reduce((acc, req) => {
      // Use the leaveType as the key
      if (req.leaveType) {
        acc[req.leaveType] = (acc[req.leaveType] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    // Use colors from the image: Blue, Red, Green, Orange
    return [
      { label: 'Annual Leave', value: counts['Annual Leave'] || 0, color: '#3b82f6' }, // Blue
      { label: 'Sick Leave', value: counts['Sick Leave'] || 0, color: '#ef4444' }, // Red
      { label: 'Casual Leave', value: counts['Casual Leave'] || 0, color: '#10b981' }, // Green
      { label: 'Maternity Leave', value: counts['Maternity Leave'] || 0, color: '#f97316' }, // Orange
    ].filter(d => d.value > 0);
  }, [applications]);
  const totalLeaveRequests = leaveTypeData.reduce((sum, d) => sum + d.value, 0);

  
  // 2. Department-wise Applications Data (Bar Chart) - Use real application data
  const departmentData: ChartData[] = useMemo(() => {
    // Calculate department counts from actual applications
    const departmentCounts: Record<string, number> = {};
    applications.forEach(app => {
      const dept = app.department || 'Unknown';
      departmentCounts[dept] = (departmentCounts[dept] || 0) + 1;
    });


    // Color mapping for departments
    const colorMap: Record<string, string> = {
      'Engineering': '#ef4444', 
      'Human Resources': '#10b981',
      'Finance': '#f97316',         
      'Operations': '#8b5cf6',     
      'Marketing': '#06b6d4',
      'Quality Assurance': '#3b82f6',
      'Development': '#3b82f6',
    };

    // Sort departments by count desc for stable chart ordering
    const entries = Object.entries(departmentCounts).sort((a, b) => b[1] - a[1]);
    return entries.map(([department, count]) => ({
      label: department.length > 12 ? 
        (department === 'Human Resources' ? 'HR' : 
         department === 'Quality Assurance' ? 'QA' : 
         department === 'Engineering' ? 'Eng' :
         department.substring(0, 3)) : 
        department,
      value: count,
      color: colorMap[department] || '#3b82f6', 
    })).filter(d => d.value > 0);
  }, [applications]);

  // Max department application count for the y-axis
  const maxDeptApplications = Math.max(...departmentData.map(d => d.value));
  // Set Y-axis max to a clean integer slightly above the max count for scaling (e.g., if max is 2, set max to 3)
  const deptYMax = maxDeptApplications > 0 ? Math.ceil(maxDeptApplications * 1.5) : 1; 

  const formatDeptLabel = (val: number) => Math.round(val).toString();

  // 3. Monthly Application Trends (Stacked Bar Chart) - last 6 months dynamic
  const monthlyTrendsData: ChartData[] = useMemo(() => {
    const now = new Date();
    const months: string[] = [];
    const monthLabels: string[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleString('en-US', { month: 'short' });
      months.push(`${d.getFullYear()}-${d.getMonth() + 1}`); // e.g., 2025-9
      monthLabels.push(label);
    }

    // Initialize counts
    const stats: Record<string, { total: number; approved: number; rejected: number }> = {};
    months.forEach(m => stats[m] = { total: 0, approved: 0, rejected: 0 });

    applications.forEach(app => {
      const dateKey = app.appliedAt ? (() => {
        try {
          const d = new Date(app.appliedAt as string);
          return `${d.getFullYear()}-${d.getMonth() + 1}`;
        } catch { return null; }
      })() : null;

      if (dateKey && stats[dateKey]) {
        stats[dateKey].total += 1;
        if (app.status === 'approved') stats[dateKey].approved += 1;
        if (app.status === 'rejected') stats[dateKey].rejected += 1;
      }
    });

    // Build ChartData array in the stacked format (for each month: Total, Approved, Rejected)
    const result: ChartData[] = [];
    months.forEach((m, idx) => {
      const label = monthLabels[idx];
      const s = stats[m] || { total: 0, approved: 0, rejected: 0 };
      result.push({ label, value: Math.max(s.total, 0), color: '#3b82f6', category: 'Total' });
      result.push({ label, value: Math.max(s.approved, 0), color: '#10b981', category: 'Approved' });
      result.push({ label, value: Math.max(s.rejected, 0), color: '#ef4444', category: 'Rejected' });
    });

    return result;
  }, [applications]);

  // derive max from monthlyTrendsData total values for correct scaling
  const maxMonthlyTrends = useMemo(() => {
    // For stacked, compute per-month total (Approved+Rejected or Total)
    const months = Array.from(new Set(monthlyTrendsData.map(d => d.label)));
    let maxVal = 1;
    months.forEach(m => {
      const vals = monthlyTrendsData.filter(d => d.label === m && d.category !== 'Total');
      const total = vals.reduce((s, v) => s + v.value, 0);
      // fallback to 'Total' category if present
      const totalCat = monthlyTrendsData.find(d => d.label === m && d.category === 'Total');
      const monthTotal = Math.max(total, totalCat ? totalCat.value : 0);
      if (monthTotal > maxVal) maxVal = monthTotal;
    });
    return Math.max(5, Math.ceil(maxVal * 1.2));
  }, [monthlyTrendsData]);

  const formatMonthlyLabel = (val: number) => Math.round(val).toString();


  return (
    <div className="grid grid-cols-1 gap-4 md:gap-6 pt-4 md:pt-6">
      
      {/* Chart Row 1: Doughnut and Dept-wise Bar */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-6">
        <div className="min-h-[400px]">
          <DoughnutChart 
            title="Leave Types Distribution" 
            data={leaveTypeData} 
            total={totalLeaveRequests} 
          />
        </div>
        <div className="min-h-[400px]">
          <BarChart 
            title="Department-wise Applications" 
            data={departmentData} 
            max={deptYMax} 
            yLabelFormatter={formatDeptLabel} 
          />
        </div>
      </div>

      {/* Chart Row 2: Monthly Trends Bar */}
      <div className="min-h-[400px]">
        <BarChart 
          title="Monthly Application Trends" 
          data={monthlyTrendsData} 
          max={maxMonthlyTrends} 
          yLabelFormatter={formatMonthlyLabel} 
          stacked={true} // Use stacked visualization for this chart
        />
      </div>
    </div>
  );
};


const HRRecentApprovalsContent: React.FC<{ 
  applications: Application[]; 
  onAction: (id: string, action: 'approve' | 'reject', comments?: string, originalStatus?: string) => Promise<{success: boolean; error?: string}>;
}> = ({ applications, onAction }) => {
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showCommentModal, setShowCommentModal] = useState<{id: string; action: 'approve' | 'reject'} | null>(null);
  const [actionComment, setActionComment] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);

  // Reset to page 1 when applications change (e.g., when filters change)
  useEffect(() => {
    setCurrentPage(1);
  }, [applications.length]);

  // Calculate paginated applications
  const paginatedApplications = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return applications.slice(startIndex, endIndex);
  }, [applications, currentPage, pageSize]);

  // Handle view action
  const handleView = (application: Application) => {
    setSelectedApplication(application);
    setShowViewModal(true);
  };

  // Effect to blur the background when modal is open
  useEffect(() => {
    if (showCommentModal || showViewModal) {
      // Add blur to the main content area only, not the modal
      const mainContent = document.querySelector('main') || document.querySelector('[data-main-content]');
      if (mainContent) {
        (mainContent as HTMLElement).style.filter = 'blur(8px)';
        (mainContent as HTMLElement).style.pointerEvents = 'none';
      }
      
      // Also blur sidebar and header if they exist
      const sidebar = document.querySelector('[data-sidebar]') || document.querySelector('aside') || document.querySelector('.sidebar');
      if (sidebar) {
        (sidebar as HTMLElement).style.filter = 'blur(8px)';
        (sidebar as HTMLElement).style.pointerEvents = 'none';
      }
      
      const header = document.querySelector('header') || document.querySelector('[data-header]');
      if (header) {
        (header as HTMLElement).style.filter = 'blur(8px)';
        (header as HTMLElement).style.pointerEvents = 'none';
      }
      
      // Prevent body scroll
      document.body.style.overflow = 'hidden';
    } else {
      // Remove blur when modal is closed
      const mainContent = document.querySelector('main') || document.querySelector('[data-main-content]');
      if (mainContent) {
        (mainContent as HTMLElement).style.filter = '';
        (mainContent as HTMLElement).style.pointerEvents = '';
      }
      
      const sidebar = document.querySelector('[data-sidebar]') || document.querySelector('aside') || document.querySelector('.sidebar');
      if (sidebar) {
        (sidebar as HTMLElement).style.filter = '';
        (sidebar as HTMLElement).style.pointerEvents = '';
      }
      
      const header = document.querySelector('header') || document.querySelector('[data-header]');
      if (header) {
        (header as HTMLElement).style.filter = '';
        (header as HTMLElement).style.pointerEvents = '';
      }
      
      document.body.style.overflow = '';
    }

    // Cleanup on unmount
    return () => {
      const mainContent = document.querySelector('main') || document.querySelector('[data-main-content]');
      if (mainContent) {
        (mainContent as HTMLElement).style.filter = '';
        (mainContent as HTMLElement).style.pointerEvents = '';
      }
      
      const sidebar = document.querySelector('[data-sidebar]') || document.querySelector('aside') || document.querySelector('.sidebar');
      if (sidebar) {
        (sidebar as HTMLElement).style.filter = '';
        (sidebar as HTMLElement).style.pointerEvents = '';
      }
      
      const header = document.querySelector('header') || document.querySelector('[data-header]');
      if (header) {
        (header as HTMLElement).style.filter = '';
        (header as HTMLElement).style.pointerEvents = '';
      }
      
      document.body.style.overflow = '';
    };
  }, [showCommentModal, showViewModal]);

  // Handle action with loading state
  const handleAction = async (id: string, action: 'approve' | 'reject' | 'view', comments?: string) => {
    if (action === 'view') {
      console.log(`Viewing application ${id}`);
      return;
    }

    // Find the application to get its original status
    const application = applications.find(app => app.id === id);
    const originalStatus = application?.originalStatus;

    try {
      setActionLoading(id);
      const result = await onAction(id, action, comments, originalStatus);
      
      if (result.success) {
        console.log(`✅ Application ${id} ${action}ed successfully`);
        // Reset modal state
        setShowCommentModal(null);
        setActionComment('');
        // Show success message
        toast.success(`Application ${action === 'approve' ? 'approved' : 'rejected'} successfully!`);
      } else {
        console.error(`❌ Failed to ${action} application:`, result.error);
        // Show detailed error message
        const errorMsg = result.error || `Failed to ${action} application`;
        toast.error(`Error: ${errorMsg}`);
      }
    } catch (error) {
      console.error(`❌ Error ${action}ing application:`, error);
      const errorMsg = error instanceof Error ? error.message : `Unknown error occurred while ${action}ing application`;
      toast.error(`Error: ${errorMsg}`);
    } finally {
      setActionLoading(null);
    }
  };

  // Show comment modal for approve/reject
  const handleActionWithComment = (id: string, action: 'approve' | 'reject') => {
    setShowCommentModal({ id, action });
    setActionComment('');
  };

  // Submit action with comment
  const submitActionWithComment = () => {
    if (showCommentModal) {
      handleAction(showCommentModal.id, showCommentModal.action, actionComment);
    }
  };

  return (
    <div className="pt-6">
      <h3 className="text-xl font-semibold mb-4 flex items-center" style={{ color: '#3366CC' }}>
        <FileText className="w-5 h-5 mr-2" style={{ color: '#3366CC' }} />
        Recent HR Applications ({applications.length})
      </h3>
      
      <div className="bg-white dark:bg-gray-800 backdrop-blur-sm rounded-xl shadow-lg overflow-x-auto border border-slate-200/50 dark:border-gray-700" style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.03) 0%, rgba(99, 102, 241, 0.03) 50%, rgba(14, 165, 233, 0.03) 100%)' }}>
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-2 md:px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider min-w-[100px] md:min-w-[120px]">
                App ID
              </th>
              <th className="px-2 md:px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider min-w-[120px] md:min-w-[150px]">
                Employee
              </th>
              <th className="px-2 md:px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider min-w-[100px] md:min-w-[150px]">
                Type
              </th>
              <th className="px-2 md:px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider min-w-[150px] md:min-w-[200px]">
                Details
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider min-w-[90px]">
                Priority
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider min-w-[100px]">
                Applied On
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider min-w-[150px]">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {applications.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-12">
                  <div className="flex flex-col items-center justify-center py-1">
                     <svg className="w-20 h-20 text-gray-300 dark:text-gray-600 mb-6" fill="none" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
                       <rect x="14" y="10" width="36" height="44" rx="4" stroke="currentColor" strokeWidth="2" fill="none" />
                       <path d="M22 22h20M22 30h20M22 38h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                     </svg>
                    <p className="text-m font-semibold text-gray-900 dark:text-white">No applications found</p>
                    <p className="text-m text-gray-500 dark:text-gray-400 mt-2">Try adjusting your filters or search criteria.</p>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedApplications.map((app) => (
                <tr key={app.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition duration-150">
                  
                  {/* Application ID (show human-friendly leaveId when available) */}
                  <td className="px-2 md:px-4 py-3 md:py-4 whitespace-normal text-xs md:text-sm font-medium cursor-pointer" style={{ color: '#3366CC' }}>
                    <div className="break-words max-w-[220px] md:max-w-none hover:opacity-80" title={app.leaveId || app.id}>{app.leaveId || app.id}</div>
                  </td>

                  {/* Employee */}
                  <td className="px-2 md:px-4 py-3 md:py-4 whitespace-nowrap">
                    <div className="text-xs md:text-sm font-medium text-gray-900 dark:text-white truncate max-w-[120px]">{app.employeeName}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{app.employeeId} • {app.department}</div>
                  </td>

                  {/* Type */}
                  <td className="px-2 md:px-4 py-3 md:py-4 whitespace-nowrap">
                    <div className="text-xs md:text-sm font-medium text-gray-900 dark:text-white">{app.type}</div>
                    {app.leaveType && <StatusTag status={app.leaveType} />}
                  </td>

                  {/* Details */}
                  <td className="px-2 md:px-4 py-3 md:py-4 whitespace-normal">
                    <div className="text-xs md:text-sm text-gray-700 dark:text-gray-300 line-clamp-2">{app.details}</div>
                  </td>

                  {/* Priority */}
                  <td className="px-2 md:px-4 py-3 md:py-4 whitespace-nowrap">
                    <StatusTag status={app.priority} />
                  </td>

                  {/* Applied On */}
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {app.appliedOn}
                  </td>
                  
                  {/* Status */}
                  <td className="px-4 py-4 whitespace-nowrap">
                    <StatusTag status={app.status} />
                    {app.statusDate && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {app.status.charAt(0).toUpperCase() + app.status.slice(1)}: {app.statusDate}
                      </div>
                    )}
                  </td>

                   {/* Actions */}
                     <td className="px-4 py-4 whitespace-nowrap text-sm font-medium flex space-x-1">
                     <button 
                       onClick={() => handleView(app)}
                       className="inline-flex items-center justify-center w-8 h-8 border border-gray-300 dark:border-gray-600 rounded-md text-gray-600 dark:text-gray-300 hover:text-[#3366CC] dark:hover:text-[#4a7dd9] hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                       title="View Details"
                     >
                       <Eye className="w-4 h-4" />
                     </button>
                     {(() => {
                       // Show approve/reject buttons for any pending application
                       // HR can approve/reject applications that are pending for their review
                       const isPendingForHR = app.status === 'pending';
                       
                       if (isPendingForHR) {
                         return (
                           <>
                             <button 
                               onClick={() => handleActionWithComment(app.id, 'approve')}
                               disabled={actionLoading === app.id}
                               className="p-2 text-green-500 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-full transition duration-150 disabled:opacity-50"
                               title="Approve"
                             >
                               {actionLoading === app.id ? (
                                 <RefreshCw className="w-5 h-5 animate-spin" />
                               ) : (
                                 <CheckCircle className="w-5 h-5" />
                               )}
                             </button>
                             <button 
                               onClick={() => handleActionWithComment(app.id, 'reject')}
                               disabled={actionLoading === app.id}
                               className="p-2 text-red-500 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-full transition duration-150 disabled:opacity-50"
                               title="Reject"
                             >
                               {actionLoading === app.id ? (
                                 <RefreshCw className="w-5 h-5 animate-spin" />
                               ) : (
                                 <XCircle className="w-5 h-5" />
                               )}
                             </button>
                           </>
                         );
                       }
                       return null;
                     })()}
                   </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        
        {/* Pagination */}
        {applications.length > 0 && (
          <Pagination
            currentPage={currentPage}
            pageSize={pageSize}
            totalItems={applications.length}
            pageSizeOptions={[10, 20, 30, 50, 100]}
            onPageChange={(page) => setCurrentPage(page)}
            onPageSizeChange={(newPageSize) => {
              setPageSize(newPageSize);
              setCurrentPage(1); // Reset to first page when page size changes
            }}
            label="applications"
            className="border-t border-gray-200 dark:border-gray-700"
          />
        )}
      </div>

       {/* Comment Modal */}
       {showCommentModal && (
         <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-black dark:bg-opacity-70 flex items-center justify-center z-[99999]">
           <div 
             className="bg-white dark:bg-gray-800 rounded-lg p-6 w-96 max-w-md mx-4 z-[100000] shadow-2xl"
             style={{
               filter: 'none !important', // Ensure modal itself is not blurred
               backdropFilter: 'none !important',
               position: 'relative',
               zIndex: 100000,
             }}
           >
             <h3 className="text-lg font-semibold mb-4 flex items-center text-gray-900 dark:text-white">
               {showCommentModal.action === 'approve' ? (
                 <CheckCircle className="w-5 h-5 text-green-500 dark:text-green-400 mr-2" />
               ) : (
                 <XCircle className="w-5 h-5 text-red-500 dark:text-red-400 mr-2" />
               )}
               {showCommentModal.action === 'approve' ? 'Approve' : 'Reject'} Application
             </h3>
             
             <p className="text-gray-600 dark:text-gray-300 mb-4">
               Application ID: <span className="font-medium text-gray-900 dark:text-white">
                 {(() => {
                   const app = applications.find(a => a.id === showCommentModal.id);
                   return app?.leaveId || showCommentModal.id;
                 })()}
               </span>
             </p>
             
             <div className="mb-4">
               <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                 Comments {showCommentModal.action === 'reject' && <span className="text-red-500 dark:text-red-400">*</span>}
               </label>
               <textarea
                 value={actionComment}
                 onChange={(e) => setActionComment(e.target.value)}
                 placeholder={showCommentModal.action === 'approve' 
                   ? "Add approval comments (optional)" 
                   : "Please provide reason for rejection"}
                 className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-[#3366CC] bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-400"
                 rows={3}
               />
             </div>
             
             <div className="flex space-x-3">
               <button
                 onClick={submitActionWithComment}
                 disabled={showCommentModal.action === 'reject' && !actionComment.trim()}
                 className={`flex-1 px-4 py-2 rounded-md text-white font-medium transition duration-150 
                   ${showCommentModal.action === 'approve' 
                     ? 'bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700' 
                     : 'bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700'} 
                   disabled:opacity-50 disabled:cursor-not-allowed`}
               >
                 {showCommentModal.action === 'approve' ? 'Approve' : 'Reject'}
               </button>
               <button
                 onClick={() => setShowCommentModal(null)}
                 className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition duration-150"
               >
                 Cancel
               </button>
             </div>
           </div>
         </div>
       )}

      {/* View Application Details Modal */}
      {showViewModal && selectedApplication && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Application Details</h2>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  {selectedApplication.employeeName} ({selectedApplication.employeeId})
                </p>
              </div>
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setSelectedApplication(null);
                }}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <X className="w-6 h-6 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Application ID & Status */}
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                  <FileText className="w-5 h-5 mr-2" style={{ color: '#3366CC' }} />
                  Application Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">Application ID:</span>
                    <p className="font-medium text-gray-900 dark:text-white break-words">{selectedApplication.leaveId || selectedApplication.id}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">Status:</span>
                    <p className="font-medium mt-1">
                      <StatusTag status={selectedApplication.status} />
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">Application Type:</span>
                    <p className="font-medium text-gray-900 dark:text-white">{selectedApplication.type}</p>
                  </div>
                  {selectedApplication.leaveType && (
                    <div>
                      <span className="text-sm text-gray-600 dark:text-gray-400">Leave Type:</span>
                      <p className="font-medium mt-1">
                        <StatusTag status={selectedApplication.leaveType} />
                      </p>
                    </div>
                  )}
                  <div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">Priority:</span>
                    <p className="font-medium mt-1">
                      <StatusTag status={selectedApplication.priority} />
                    </p>
                  </div>
                  {selectedApplication.statusDate && (
                    <div>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {selectedApplication.status.charAt(0).toUpperCase() + selectedApplication.status.slice(1)} Date:
                      </span>
                      <p className="font-medium text-gray-900 dark:text-white">{selectedApplication.statusDate}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Employee Information */}
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                  <User className="w-5 h-5 mr-2" style={{ color: '#3366CC' }} />
                  Employee Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">Employee Name:</span>
                    <p className="font-medium text-gray-900 dark:text-white">{selectedApplication.employeeName}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">Employee ID:</span>
                    <p className="font-medium text-gray-900 dark:text-white">{selectedApplication.employeeId}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">Department:</span>
                    <p className="font-medium text-gray-900 dark:text-white">{selectedApplication.department}</p>
                  </div>
                </div>
              </div>

              {/* Leave Details */}
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                  <Calendar className="w-5 h-5 mr-2" style={{ color: '#3366CC' }} />
                  Leave Details
                </h3>
                <div className="space-y-4">
                  <div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">Applied On:</span>
                    <p className="font-medium text-gray-900 dark:text-white">{selectedApplication.appliedOn}</p>
                  </div>
                  {selectedApplication.leaveDuration !== undefined && (
                    <div>
                      <span className="text-sm text-gray-600 dark:text-gray-400">Leave Duration:</span>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {selectedApplication.leaveDuration} {selectedApplication.leaveDuration === 1 ? 'day' : 'days'}
                      </p>
                    </div>
                  )}
                  {selectedApplication.daysUntilLeave !== undefined && selectedApplication.daysUntilLeave > 0 && (
                    <div>
                      <span className="text-sm text-gray-600 dark:text-gray-400">Days Until Leave:</span>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {selectedApplication.daysUntilLeave} {selectedApplication.daysUntilLeave === 1 ? 'day' : 'days'}
                      </p>
                    </div>
                  )}
                  <div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">Details:</span>
                    <p className="font-medium text-gray-900 dark:text-white mt-1 whitespace-pre-wrap">{selectedApplication.details}</p>
                  </div>
                </div>
              </div>

              {/* HR Comments */}
              {selectedApplication.hrComments && (
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 flex items-center">
                    <FileText className="w-5 h-5 mr-2" style={{ color: '#3366CC' }} />
                    HR Comments
                  </h3>
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{selectedApplication.hrComments}</p>
                </div>
              )}

              {/* Additional Information */}
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                  <Clock className="w-5 h-5 mr-2" style={{ color: '#3366CC' }} />
                  Additional Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedApplication.appliedAt && (
                    <div>
                      <span className="text-sm text-gray-600 dark:text-gray-400">Applied At (ISO):</span>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {new Date(selectedApplication.appliedAt).toLocaleString('en-GB', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  )}
                  {selectedApplication.originalStatus && (
                    <div>
                      <span className="text-sm text-gray-600 dark:text-gray-400">Original Status:</span>
                      <p className="font-medium text-gray-900 dark:text-white">{selectedApplication.originalStatus}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setSelectedApplication(null);
                }}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- MAIN COMPONENT ---

const HRApprovalsDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'recent'>('overview');
  
  // Use the custom hook for data management
  const { 
    applications, 
    dashboardStats, 
    loading, 
    error, 
    refreshData, 
    handleAction 
  } = useHRApplications();

  // Filters state (search, status, type, department)
  type FilterState = {
    search: string;
    status: 'all' | 'pending' | 'approved' | 'rejected';
    type: 'all' | 'Leave Request' | 'Transfer Request' | 'Policy Clarification';
    department: 'all' | string;
    priority: 'all' | 'critical' | 'urgent' | 'high' | 'normal';
  };

  const [filters, setFilters] = useState<FilterState>({ search: '', status: 'all', type: 'all', department: 'all', priority: 'all' });

  // Departments list for the select (derived from current applications)
  const departmentOptions = useMemo(() => {
    const set = new Set<string>();
    applications.forEach(a => set.add(a.department || 'Unknown'));
    return Array.from(set).sort();
  }, [applications]);

  // Helper to update filters (keeps JSX cleaner)
  const onFilterChange = <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    setFilters(prev => ({ ...prev, [key]: value } as FilterState));
  };

  // Filtered applications derived from current filters and raw applications
  const filteredApplications = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    return applications.filter(app => {
      // Status filter
      if (filters.status !== 'all' && app.status !== filters.status) return false;
      // Priority filter
      if (filters.priority !== 'all' && app.priority !== filters.priority) return false;

      // Type filter
      if (filters.type !== 'all' && app.type !== filters.type) return false;

      // Department filter
      if (filters.department !== 'all' && app.department !== filters.department) return false;

      // Search filter across name, id, leaveId, details and department
      if (q) {
        const hay = `${app.employeeName} ${app.employeeId} ${app.details} ${app.id} ${app.leaveId || ''} ${app.department}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }

      return true;
    });
  }, [applications, filters]);

  // Derived KPIs from the real data
  const kpis: KPI[] = useMemo(() => {
    // Prefer backend stats when available, otherwise compute from applications
    const totalApplications = dashboardStats?.summary?.totalApplications ?? applications.length;
    const totalPending = dashboardStats?.summary?.pendingApplications ?? applications.filter(a => a.status === 'pending').length;
    const approved = dashboardStats?.summary?.approvedApplications ?? applications.filter(a => a.status === 'approved').length;
    const rejected = dashboardStats?.summary?.rejectedApplications ?? applications.filter(a => a.status === 'rejected').length;
    const urgent = dashboardStats?.summary?.urgentApplications ?? applications.filter(a => 
      a.status === 'pending' && (a.priority === 'critical' || a.priority === 'urgent')
    ).length;

    return [
      { id: 1, icon: Users, title: 'Total Applications', value: totalApplications, color: 'text-indigo-600' },
      { id: 2, icon: Users, title: 'Total Pending', value: totalPending, color: 'text-blue-600' },
      { id: 3, icon: CheckCircle, title: 'Approved', value: approved, color: 'text-green-600' },
      { id: 4, icon: XCircle, title: 'Rejected', value: rejected, color: 'text-red-500' },
      { id: 5, icon: AlertTriangle, title: 'Urgent Applications', value: urgent, color: 'text-orange-500' },
    ];
  }, [applications, dashboardStats]);

  const KPICard: React.FC<{ kpi: KPI }> = ({ kpi }) => {
    const { icon: Icon, title, value } = kpi;
    
    return (
      <div className="relative bg-white dark:bg-gray-800 backdrop-blur-sm p-6 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 hover:scale-105 cursor-pointer group h-full overflow-hidden border border-slate-200/50 dark:border-gray-700" style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.03) 0%, rgba(99, 102, 241, 0.03) 50%, rgba(14, 165, 233, 0.03) 100%)' }}>
        <div className="absolute inset-0 bg-gradient-to-br from-white/90 to-slate-50/90 dark:from-gray-800/90 dark:to-gray-700/90 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        <div className="absolute top-0 right-0 w-20 h-20 bg-[#3366CC]/10 dark:bg-[#3366CC]/20 rounded-full -translate-y-10 translate-x-10 opacity-0 group-hover:opacity-70 transition-opacity duration-500"></div>
        
        <div className="relative z-10 flex flex-col h-full">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-2xl shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110" style={{ backgroundColor: '#3366CC' }}>
              <Icon className="w-6 h-6 text-white" />
            </div>
          </div>
          
          <div className="mb-4">
            <p className="text-3xl font-bold text-gray-900 dark:text-white group-hover:text-[#3366CC] dark:group-hover:text-[#4a7dd9] transition-colors duration-300">
              {value}
            </p>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-300 group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors duration-300 mt-1">
              {title}
            </p>
          </div>
          
          <div className="mt-auto">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500 dark:text-gray-400">Progress</span>
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">85%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
              <div className="h-2 rounded-full transition-all duration-1000 ease-out group-hover:animate-pulse" style={{ width: '85%', backgroundColor: '#3366CC' }}></div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const TabButton: React.FC<{ tab: 'overview' | 'recent', label: string }> = ({ tab, label }) => {
    const isActive = activeTab === tab;
    return (
      <button
        onClick={() => setActiveTab(tab)}
        className={`px-4 py-2 text-sm font-medium rounded-t-lg transition duration-200 
          ${isActive 
            ? 'bg-[#3366CC]/10 dark:bg-[#3366CC]/20 text-[#3366CC] dark:text-[#4a7dd9] shadow-md border-b-2 border-[#3366CC] dark:border-[#3366CC]' 
            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`
        }
      >
        <span>
          {label}
          {tab === 'recent' && ` (${applications.length})`}
        </span>
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Dashboard Header */}
        <DashboardHeader
          title="HR Approvals"
          subtitle="Advanced human resources management system with intelligent workflow automation, employee lifecycle management, and enterprise-grade compliance for multinational operations."
          icon={Users}
          iconColor="text-white"
          hideTenantPrefix={true}
          breadcrumbs={[
            { label: 'Home', href: '/' },
            { label: 'ESS Approval Flows', href: '/ess-approval-flows' },
            { label: 'HR' }
          ]}
          actions={
            <button
              onClick={refreshData}
              className="flex items-center px-6 py-3 bg-white/20 rounded-xl backdrop-blur-sm border border-white/30 text-white hover:bg-white/30 transition-all duration-200 hover:scale-105 whitespace-nowrap"
              title="Refresh Data"
            >
              <RefreshCw className="w-5 h-5 mr-2 flex-shrink-0" />
              <span className="font-medium whitespace-nowrap">Refresh</span>
            </button>
          }
        />

        {/* Tab Navigation */}
        <div className="flex space-x-1 border-b border-gray-200 dark:border-gray-700 overflow-x-auto bg-white dark:bg-gray-800 rounded-t-xl px-4 mt-8">
          <TabButton tab="overview" label="Overview" />
          <TabButton tab="recent" label="Recent Approvals" />
        </div>

        {/* Content Area */}
        <div className="pt-4">
          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin mr-3" style={{ color: '#3366CC' }} />
              <span className="text-lg text-gray-600 dark:text-gray-300">Loading HR data...</span>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 mr-2" />
                <div>
                  <h3 className="text-red-800 dark:text-red-300 font-medium">Error Loading Data</h3>
                  <p className="text-red-600 dark:text-red-400 text-sm mt-1">{error}</p>
                  <button 
                    onClick={refreshData}
                    className="mt-2 text-sm text-red-700 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 underline"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Data Content */}
          {!loading && !error && (
            <div>
              {/* KPI Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6" style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.03) 0%, rgba(99, 102, 241, 0.03) 50%, rgba(14, 165, 233, 0.03) 100%)' }}>
                {kpis.map(kpi => (
                  <KPICard key={kpi.id} kpi={kpi} />
                ))}
              </div>

              {/* Filters (only show for Recent tab) */}
              {activeTab === 'recent' && (
                <div className="bg-white dark:bg-gray-800 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-200/50 dark:border-gray-700 hover:shadow-2xl transition-all duration-300 p-6 mb-6 mt-4" style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.03) 0%, rgba(99, 102, 241, 0.03) 50%, rgba(14, 165, 233, 0.03) 100%)' }}>
                  <h4 className="text-xl font-bold flex items-center mb-3" style={{ color: '#3366CC' }}>
                    <div className="p-2 rounded-xl mr-3" style={{ backgroundColor: 'rgba(51, 102, 204, 0.1)' }}>
                      <Filter className="h-5 w-5" style={{ color: '#3366CC' }} />
                    </div>
                    Advanced Filters
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">Refine your search with powerful filtering options</p>
                   <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                     <div>
                       <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center mb-2">
                         <Search className="h-4 w-4 mr-1" style={{ color: '#3366CC' }} />
                         Search
                       </label>
                       <div className="relative group">
                         <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500 group-focus-within:opacity-80 transition-colors" style={{ color: '#3366CC' }} />
                         <input
                           value={filters.search}
                           onChange={(e) => onFilterChange('search', e.target.value)}
                           placeholder="Search applications..."
                           className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-[#3366CC]/50 focus:border-[#3366CC] bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-400 backdrop-blur-sm hover:bg-gray-50 dark:hover:bg-gray-600 transition-all duration-200 shadow-sm hover:shadow-md"
                         />
                       </div>
                     </div>

                     <div>
                       <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Status</label>
                       <div className="relative">
                         <select
                           value={filters.status}
                           onChange={(e) => onFilterChange('status', e.target.value as FilterState['status'])}
                           className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-[#3366CC]/50 focus:border-[#3366CC] bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-all duration-200 shadow-sm hover:shadow-md appearance-none cursor-pointer"
                         >
                           <option value="all">All Status</option>
                           <option value="pending">Pending</option>
                           <option value="approved">Approved</option>
                           <option value="rejected">Rejected</option>
                         </select>
                         <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                           <svg className="w-4 h-4 text-gray-400 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                           </svg>
                         </div>
                       </div>
                     </div>

                     <div>
                       <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Type</label>
                       <div className="relative">
                         <select
                           value={filters.type}
                           onChange={(e) => onFilterChange('type', e.target.value as FilterState['type'])}
                           className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-[#3366CC]/50 focus:border-[#3366CC] bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-all duration-200 shadow-sm hover:shadow-md appearance-none cursor-pointer"
                         >
                           <option value="all">All Types</option>
                           <option value="Leave Request">Leave Request</option>
                           <option value="Transfer Request">Transfer Request</option>
                           <option value="Policy Clarification">Policy Clarification</option>
                         </select>
                         <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                           <svg className="w-4 h-4 text-gray-400 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                           </svg>
                         </div>
                       </div>
                     </div>

                     <div>
                       <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Department</label>
                       <div className="relative">
                         <select
                           value={filters.department}
                           onChange={(e) => onFilterChange('department', e.target.value as FilterState['department'])}
                           className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-[#3366CC]/50 focus:border-[#3366CC] bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-all duration-200 shadow-sm hover:shadow-md appearance-none cursor-pointer"
                         >
                           <option value="all">All Departments</option>
                           {departmentOptions.map(dept => (
                             <option key={dept} value={dept}>{dept}</option>
                           ))}
                         </select>
                         <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                           <svg className="w-4 h-4 text-gray-400 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                           </svg>
                         </div>
                       </div>
                     </div>

                     <div>
                       <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Priority</label>
                       <div className="relative">
                         <select
                           value={filters.priority}
                           onChange={(e) => onFilterChange('priority', e.target.value as FilterState['priority'])}
                           className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-[#3366CC]/50 focus:border-[#3366CC] bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-all duration-200 shadow-sm hover:shadow-md appearance-none cursor-pointer"
                         >
                           <option value="all">All Priorities</option>
                           <option value="critical">Critical</option>
                           <option value="urgent">Urgent</option>
                           <option value="high">High</option>
                           <option value="normal">Normal</option>
                         </select>
                         <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                           <svg className="w-4 h-4 text-gray-400 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                           </svg>
                         </div>
                       </div>
                     </div>
                   </div>
                </div>
              )}

              {/* Main Content */}
              {activeTab === 'overview' && <HROverviewContent applications={applications} dashboardStats={dashboardStats} />}
              {activeTab === 'recent' && <HRRecentApprovalsContent applications={filteredApplications} onAction={handleAction} />}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HRApprovalsDashboard;
