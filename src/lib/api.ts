import { getAuthHeaders } from '@/utils/api';
import { ESS_PORTAL_ENDPOINTS, essApiFetch } from '@/utils/essApi';

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export function apiFetch(path: string, options?: RequestInit) {
  const url = path.startsWith('http') ? path : `${API_BASE_URL}${path}`;
  const authHeaders = getAuthHeaders();
  return fetch(url, {
    ...options,
    headers: {
      ...authHeaders,
      ...options?.headers,
    },
  });
}

// Leave Type Types
export interface LeaveType {
  id: string;
  name: string;
  description: string;
  maxDaysPerMonth: number;
  maxDaysPerYear: number;
  carryForward: boolean;
  requiresApproval: boolean;
  color: string;
  icon: string;
  rules: string[];
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface LeaveTypeCreate {
  name: string;
  description?: string;
  maxDaysPerMonth: number;
  maxDaysPerYear: number;
  carryForward: boolean;
  requiresApproval: boolean;
  color?: string;
  icon?: string;
  rules?: string[];
  isActive?: boolean;
}

export interface LeaveTypeUpdate {
  name?: string;
  description?: string;
  maxDaysPerMonth?: number;
  maxDaysPerYear?: number;
  carryForward?: boolean;
  requiresApproval?: boolean;
  color?: string;
  icon?: string;
  rules?: string[];
  isActive?: boolean;
}

// Leave Type API Functions
export async function getLeaveTypes(): Promise<LeaveType[]> {
  try {
    const url = ESS_PORTAL_ENDPOINTS.LEAVE.TYPES();
    console.log('🔍 getLeaveTypes - Fetching from URL:', url);
    
    if (!url.includes('/api/v1/ess-portal/leave-types')) {
      console.warn(`⚠️ getLeaveTypes - URL may be incorrect: ${url}`);
    }
    
    const response = await essApiFetch(url, {
      method: 'GET',
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ getLeaveTypes - API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      throw new Error(`Failed to fetch leave types: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ getLeaveTypes - Response:', {
      isArray: Array.isArray(data),
      count: Array.isArray(data) ? data.length : 0
    });
    
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('❌ Error fetching leave types:', error);
    throw error;
  }
}

export async function createLeaveType(leaveType: LeaveTypeCreate): Promise<LeaveType> {
  try {
    const url = ESS_PORTAL_ENDPOINTS.LEAVE.TYPES();
    console.log('🔍 createLeaveType - Creating leave type:', {
      url,
      data: leaveType
    });
    
    if (!url.includes('/api/v1/ess-portal/leave-types')) {
      console.warn(`⚠️ createLeaveType - URL may be incorrect: ${url}`);
    }
    
    const response = await essApiFetch(url, {
      method: 'POST',
      body: JSON.stringify(leaveType),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ 
        detail: response.statusText 
      }));
      const errorMessage = errorData.detail || errorData.message || `Failed to create leave type: ${response.statusText}`;
      console.error('❌ createLeaveType - API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorMessage
      });
      throw new Error(errorMessage);
    }

    const data = await response.json();
    console.log('✅ createLeaveType - Created successfully:', data);
    return data;
  } catch (error) {
    console.error('❌ Error creating leave type:', error);
    throw error;
  }
}

export async function updateLeaveType(id: string, leaveType: LeaveTypeUpdate): Promise<LeaveType> {
  try {
    const url = ESS_PORTAL_ENDPOINTS.LEAVE.TYPE(id);
    console.log('🔍 updateLeaveType - Updating leave type:', {
      url,
      id,
      data: leaveType
    });
    
    if (!url.includes('/api/v1/ess-portal/leave-types')) {
      console.warn(`⚠️ updateLeaveType - URL may be incorrect: ${url}`);
    }
    
    const response = await essApiFetch(url, {
      method: 'PUT',
      body: JSON.stringify(leaveType),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ 
        detail: response.statusText 
      }));
      const errorMessage = errorData.detail || errorData.message || `Failed to update leave type: ${response.statusText}`;
      console.error('❌ updateLeaveType - API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorMessage
      });
      throw new Error(errorMessage);
    }

    const data = await response.json();
    console.log('✅ updateLeaveType - Updated successfully:', data);
    return data;
  } catch (error) {
    console.error('❌ Error updating leave type:', error);
    throw error;
  }
}

export async function deleteLeaveType(id: string): Promise<void> {
  try {
    const url = ESS_PORTAL_ENDPOINTS.LEAVE.TYPE(id);
    console.log('🔍 deleteLeaveType - Deleting leave type:', {
      url,
      id
    });
    
    if (!url.includes('/api/v1/ess-portal/leave-types')) {
      console.warn(`⚠️ deleteLeaveType - URL may be incorrect: ${url}`);
    }
    
    const response = await essApiFetch(url, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ 
        detail: response.statusText 
      }));
      const errorMessage = errorData.detail || errorData.message || `Failed to delete leave type: ${response.statusText}`;
      console.error('❌ deleteLeaveType - API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorMessage
      });
      throw new Error(errorMessage);
    }

    console.log('✅ deleteLeaveType - Deleted successfully');
  } catch (error) {
    console.error('❌ Error deleting leave type:', error);
    throw error;
  }
}
