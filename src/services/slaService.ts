/**
 * Enterprise SLA Management Service
 * Connects frontend to the comprehensive SLA backend system
 */

import { getAuthHeaders } from '@/utils/api';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'https://py-mobiloitte.converiqo.ai';

// Types matching backend structure
export interface SLAPolicy {
  policy_id?: string;
  policy_name: string;
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  ticket_type?: 'incident' | 'request' | 'problem' | 'change' | null;
  response_time_hours: number;
  resolution_time_hours: number;
  escalation_time_hours?: number;
  business_hours_only: boolean;
  business_hours?: {
    start_time: string;
    end_time: string;
    working_days: number[];
    timezone: string;
    holidays: string[];
  };
  auto_escalate: boolean;
  escalation_levels: Array<{
    level: string;
    after_hours: number;
    role: string;
    email?: string; // Email address for this escalation level
  }>;
  notification_enabled: boolean;
  notification_before_breach_minutes: number;
  notification_channels: string[];
  notification_emails?: string[]; // Primary notification recipients
  cc_emails?: string[]; // CC recipients for notifications
  active: boolean;
  created_at?: string;
  updated_at?: string;
  created_by?: string | null;
}

export interface SLAMetrics {
  total_tickets: number;
  met_sla: number;
  breached_sla: number;
  at_risk: number;
  pending: number;
  compliance_rate: number;
  avg_response_time: number;
  avg_resolution_time: number;
  escalated_tickets_summary?: {
    total_escalated: number;
    by_level: {
      level_1: number;
      level_2: number;
      level_3: number;
      level_4: number;
    };
    by_priority: {
      critical: number;
      high: number;
      medium: number;
      low: number;
    };
    avg_escalation_time_hours: number;
    currently_escalated: number;
  };
}

export interface AtRiskTicket {
  ticket_id: string;
  subject: string;
  priority: string;
  status: string;
  assignee?: string;
  created_at: string;
  sla_target_time: string;
  time_remaining: number;
  breach_in_minutes: number;
}

export interface SLABreach {
  _id?: string;
  ticket_id: string;
  breach_type: string;
  breach_time: string;
  breach_amount_minutes: number;
  priority: string;
  sla_policy_id: string;
  escalation_level: number;
  notified: boolean;
}

export interface SLATrend {
  date: string;
  total_tickets: number;
  breached: number;
  compliance_rate: number;
}

export interface EscalatedTicket {
  ticket_id: string;
  ticket_number: string;
  subject: string;
  issue?: string;
  priority: string;
  status: string;
  ticket_type: string;
  escalation_level: string;
  escalated_to: string;
  escalated_at: string;
  escalation_reason: string;
  sla_response_breached: boolean;
  sla_resolution_breached: boolean;
  breach_count: number;
  breaches: Array<{
    breach_id: string;
    breach_type: string;
    breach_duration_minutes: number;
    breach_time: string;
    escalation_level: string;
    acknowledged: boolean;
  }>;
  created_at: string;
  created_by: string | null;
  assigned_to: string | null;
  policy_name: string;
  last_updated: string | null;
  resolution_notes: string | null;
}

/**
 * Get comprehensive SLA metrics
 */
export async function getSLAMetrics(
  startDate?: string,
  endDate?: string,
  priority?: string,
  category?: string
): Promise<SLAMetrics> {
  try {
    console.log('🔍 [SLA Service] getSLAMetrics called with:', {
      startDate,
      endDate,
      priority,
      category,
      startDateType: typeof startDate,
      endDateType: typeof endDate
    });

    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    if (priority) params.append('priority', priority);
    if (category) params.append('category', category);

    const url = `${BACKEND_URL}/api/v1/sla/metrics${params.toString() ? `?${params.toString()}` : ''}`;
    console.log('📊 [SLA Service] Fetching metrics from:', url);
    console.log('📊 [SLA Service] URL params:', params.toString());

    const response = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [SLA Service] Metrics fetch error:', errorText);
      throw new Error(`Failed to fetch SLA metrics: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ [SLA Service] Metrics received:', data);
    return data;
  } catch (error) {
    console.error('❌ [SLA Service] Error fetching metrics:', error);
    throw error;
  }
}

/**
 * Get tickets at risk of SLA breach
 */
export async function getAtRiskTickets(limit: number = 50): Promise<AtRiskTicket[]> {
  try {
    const url = `${BACKEND_URL}/api/v1/sla/at-risk?limit=${limit}`;
    console.log('⚠️ [SLA Service] Fetching at-risk tickets from:', url);

    const response = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [SLA Service] At-risk tickets fetch error:', errorText);
      throw new Error(`Failed to fetch at-risk tickets: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ [SLA Service] At-risk tickets received:', data.at_risk_tickets?.length || 0);
    return data.at_risk_tickets || [];
  } catch (error) {
    console.error('❌ [SLA Service] Error fetching at-risk tickets:', error);
    throw error;
  }
}

/**
 * Get SLA breaches
 */
export async function getSLABreaches(
  startDate?: string,
  endDate?: string,
  priority?: string,
  limit: number = 100
): Promise<SLABreach[]> {
  try {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    if (priority) params.append('priority', priority);
    params.append('limit', limit.toString());

    const url = `${BACKEND_URL}/api/v1/sla/breaches?${params.toString()}`;
    console.log('🚨 [SLA Service] Fetching breaches from:', url);

    const response = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [SLA Service] Breaches fetch error:', errorText);
      throw new Error(`Failed to fetch SLA breaches: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ [SLA Service] Breaches received:', data.breaches?.length || 0);
    return data.breaches || [];
  } catch (error) {
    console.error('❌ [SLA Service] Error fetching breaches:', error);
    throw error;
  }
}

/**
 * Get SLA trends over time
 */
export async function getSLATrends(days: number = 30): Promise<SLATrend[]> {
  try {
    const url = `${BACKEND_URL}/api/v1/sla/trends?days=${days}`;
    console.log('📈 [SLA Service] Fetching trends from:', url);

    const response = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [SLA Service] Trends fetch error:', errorText);
      throw new Error(`Failed to fetch SLA trends: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ [SLA Service] Trends received:', data.trends?.length || 0);
    return data.trends || [];
  } catch (error) {
    console.error('❌ [SLA Service] Error fetching trends:', error);
    throw error;
  }
}

/**
 * Get all SLA policies
 */
export async function getSLAPolicies(): Promise<SLAPolicy[]> {
  try {
    const url = `${BACKEND_URL}/api/v1/sla/policies`;
    console.log('📋 [SLA Service] Fetching policies from:', url);

    const response = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [SLA Service] Policies fetch error:', errorText);
      throw new Error(`Failed to fetch SLA policies: ${response.statusText}`);
    }

    const data = await response.json();
    // Backend returns array directly, not wrapped in object
    const policies = Array.isArray(data) ? data : (data.policies || []);
    console.log('✅ [SLA Service] Policies received:', policies.length);
    return policies;
  } catch (error) {
    console.error('❌ [SLA Service] Error fetching policies:', error);
    throw error;
  }
}

/**
 * Create a new SLA policy
 */
export async function createSLAPolicy(policy: Omit<SLAPolicy, '_id' | 'created_at' | 'updated_at'>): Promise<SLAPolicy> {
  try {
    const url = `${BACKEND_URL}/api/v1/sla/policies`;
    console.log('➕ [SLA Service] Creating policy:', policy);

    const response = await fetch(url, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(policy)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [SLA Service] Create policy error response:', errorText);
      let errorMessage = `Failed to create SLA policy: ${response.statusText}`;
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.detail || errorData.message || errorMessage;
      } catch {
        // If error response is not JSON, use the text
        if (errorText) {
          errorMessage = errorText;
        }
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    console.log('✅ [SLA Service] Policy created:', data);
    return data;
  } catch (error) {
    console.error('❌ [SLA Service] Error creating policy:', error);
    throw error;
  }
}

/**
 * Update an existing SLA policy
 */
export async function updateSLAPolicy(policyId: string, policy: Partial<SLAPolicy>): Promise<SLAPolicy> {
  try {
    const url = `${BACKEND_URL}/api/v1/sla/policies/${policyId}`;
    console.log('✏️ [SLA Service] Updating policy:', policyId, policy);

    const response = await fetch(url, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(policy)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [SLA Service] Update policy error response:', errorText);
      let errorMessage = `Failed to update SLA policy: ${response.statusText}`;
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.detail || errorData.message || errorMessage;
      } catch {
        // If error response is not JSON, use the text
        if (errorText) {
          errorMessage = errorText;
        }
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    console.log('✅ [SLA Service] Policy updated:', data);
    return data;
  } catch (error) {
    console.error('❌ [SLA Service] Error updating policy:', error);
    throw error;
  }
}

/**
 * Delete an SLA policy
 */
export async function deleteSLAPolicy(policyId: string): Promise<void> {
  try {
    if (!policyId || policyId.trim() === '') {
      throw new Error('Policy ID is required for deletion');
    }

    const url = `${BACKEND_URL}/api/v1/sla/policies/${policyId}`;
    console.log('🗑️ [SLA Service] Deleting policy:', policyId);
    console.log('🗑️ [SLA Service] Delete URL:', url);

    const response = await fetch(url, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [SLA Service] Delete policy error response:', errorText);
      let errorMessage = `Failed to delete SLA policy: ${response.statusText}`;
      
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.detail || errorData.message || errorMessage;
      } catch {
        // If error response is not JSON, use the text
        if (errorText) {
          errorMessage = errorText;
        }
      }
      
      throw new Error(errorMessage);
    }

    console.log('✅ [SLA Service] Policy deleted successfully');
  } catch (error) {
    console.error('❌ [SLA Service] Error deleting policy:', error);
    throw error;
  }
}

/**
 * Export SLA report
 */
export async function exportSLAReport(
  format: 'pdf' | 'csv' | 'excel',
  startDate?: string,
  endDate?: string,
  priority?: string
): Promise<Blob> {
  try {
    const params = new URLSearchParams();
    params.append('format', format);
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    if (priority) params.append('priority', priority);

    const url = `${BACKEND_URL}/api/v1/sla/export?${params.toString()}`;
    console.log('📥 [SLA Service] Exporting report:', format, url);

    const response = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [SLA Service] Export error:', errorText);
      throw new Error(`Failed to export SLA report: ${response.statusText}`);
    }

    const blob = await response.blob();
    console.log('✅ [SLA Service] Report exported:', blob.size, 'bytes');
    return blob;
  } catch (error) {
    console.error('❌ [SLA Service] Error exporting report:', error);
    throw error;
  }
}

/**
 * Download exported report
 */
export function downloadReport(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

/**
 * Get ticket SLA status
 */
export async function getTicketSLAStatus(ticketId: string): Promise<Record<string, unknown>> {
  try {
    const url = `${BACKEND_URL}/api/v1/sla/ticket/${ticketId}/status`;
    console.log('🎫 [SLA Service] Fetching ticket SLA status:', ticketId);

    const response = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [SLA Service] Ticket SLA status error:', errorText);
      throw new Error(`Failed to fetch ticket SLA status: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ [SLA Service] Ticket SLA status received:', data);
    return data;
  } catch (error) {
    console.error('❌ [SLA Service] Error fetching ticket SLA status:', error);
    throw error;
  }
}

/**
 * Get escalated tickets with detailed information
 */
export async function getEscalatedTickets(
  startDate?: string,
  endDate?: string,
  escalationLevel?: string,
  priority?: string
): Promise<EscalatedTicket[]> {
  try {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    if (escalationLevel) params.append('escalation_level', escalationLevel);
    if (priority) params.append('priority', priority);

    const url = `${BACKEND_URL}/api/v1/sla/escalated-tickets${params.toString() ? `?${params.toString()}` : ''}`;
    console.log('📈 [SLA Service] Fetching escalated tickets from:', url);

    const response = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [SLA Service] Escalated tickets error:', errorText);
      throw new Error(`Failed to fetch escalated tickets: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ [SLA Service] Escalated tickets received:', data.length);
    return data;
  } catch (error) {
    console.error('❌ [SLA Service] Error fetching escalated tickets:', error);
    throw error;
  }
}

const slaService = {
  getSLAMetrics,
  getAtRiskTickets,
  getSLABreaches,
  getSLATrends,
  getSLAPolicies,
  createSLAPolicy,
  updateSLAPolicy,
  deleteSLAPolicy,
  exportSLAReport,
  downloadReport,
  getTicketSLAStatus,
  getEscalatedTickets
};

export default slaService;
