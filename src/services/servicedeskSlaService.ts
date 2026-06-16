/**
 * ServiceDesk SLA Service
 * Handles all API calls for SLA rules management and reporting
 */

import { BACKEND_URL, getAuthHeaders } from '@/utils/api';

const API_BASE_URL = `${BACKEND_URL}/api/v1/servicedesk/sla`;
const SLA_MGMT_API = `${BACKEND_URL}/api/v1/sla`;

// ============================================================================
// TYPES
// ============================================================================

export interface EscalationRule {
  id?: string;
  name: string;
  trigger_time: number; // minutes after SLA breach
  action: 'notify_manager' | 'escalate_priority' | 'assign_to_team' | 'auto_close';
  target: string;
  is_active: boolean;
}

export interface NotificationRule {
  id?: string;
  name: string;
  trigger: 'sla_breach' | 'approaching_breach' | 'sla_met';
  recipients: string[];
  template: string;
  is_active: boolean;
}

export interface SLARule {
  id: string;
  name: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: string;
  first_response_time: number; // in minutes
  resolution_time: number; // in minutes
  business_hours_only: boolean;
  escalation_rules: EscalationRule[];
  notification_rules: NotificationRule[];
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  usage_count: number;
}

export interface SLARuleCreate {
  name: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: string;
  first_response_time: number;
  resolution_time: number;
  business_hours_only: boolean;
  escalation_rules: EscalationRule[];
  notification_rules: NotificationRule[];
  is_active: boolean;
}

export interface SLAReportSummary {
  period: {
    start: string | null;
    end: string | null;
  };
  total_tickets: number;
  sla_compliance: {
    met: number;
    breached: number;
    at_risk: number;
    pending: number;
    compliance_rate: number;
  };
  average_times: {
    first_response_minutes: number;
    resolution_minutes: number;
  };
  by_priority: Record<string, {
    total: number;
    met: number;
    breached: number;
    at_risk: number;
  }>;
  by_category: Record<string, {
    total: number;
    met: number;
    breached: number;
    at_risk: number;
  }>;
}

export interface SLATrend {
  date: string;
  total: number;
  met: number;
  breached: number;
  at_risk: number;
  pending: number;
  compliance_rate: number;
}

export interface SLATrendsReport {
  period_days: number;
  start_date: string;
  end_date: string;
  trends: SLATrend[];
}

export interface BreachedTicket {
  ticket_id: string;
  subject: string;
  priority: string;
  category: string;
  status: string;
  created_at: string;
  sla_breach_time: string | null;
  sla_resolution_due: string | null;
  assigned_to: string | null;
}

export interface SLADetailedRecord {
  ticket_id?: string;
  subject?: string;
  priority?: string;
  category?: string;
  status?: string;
  first_response_time?: number | null;
  resolution_time?: number | null;
  sla_state?: string;
  assigned_to?: string | null;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

interface HelpdeskTicketSummary {
  issue_type?: string | null;
  [key: string]: unknown;
}

// ============================================================================
// SLA RULES MANAGEMENT
// ============================================================================

export async function getSLARules(): Promise<SLARule[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/rules`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch SLA rules: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching SLA rules:', error);
    throw error;
  }
}

export async function getSLARule(ruleId: string): Promise<SLARule> {
  try {
    const response = await fetch(`${API_BASE_URL}/rules/${ruleId}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch SLA rule: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching SLA rule:', error);
    throw error;
  }
}

export async function createSLARule(rule: SLARuleCreate): Promise<{ message: string; rule_id: string; rule: SLARule }> {
  try {
    const response = await fetch(`${API_BASE_URL}/rules`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(rule),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `Failed to create SLA rule: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating SLA rule:', error);
    throw error;
  }
}

export async function updateSLARule(ruleId: string, rule: Partial<SLARuleCreate>): Promise<{ message: string; rule: SLARule }> {
  try {
    const response = await fetch(`${API_BASE_URL}/rules/${ruleId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(rule),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `Failed to update SLA rule: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error updating SLA rule:', error);
    throw error;
  }
}

export async function deleteSLARule(ruleId: string): Promise<{ message: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/rules/${ruleId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to delete SLA rule: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error deleting SLA rule:', error);
    throw error;
  }
}

export async function toggleSLARule(ruleId: string): Promise<{ message: string; is_active: boolean }> {
  try {
    const response = await fetch(`${API_BASE_URL}/rules/${ruleId}/toggle`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to toggle SLA rule: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error toggling SLA rule:', error);
    throw error;
  }
}

// ============================================================================
// SLA REPORTING
// ============================================================================

export async function getSLASummaryReport(
  startDate?: string,
  endDate?: string,
  priority?: string,
  category?: string
): Promise<SLAReportSummary> {
  try {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    if (priority) params.append('priority', priority);
    if (category) params.append('category', category);

    const url = `${API_BASE_URL}/reports/summary${params.toString() ? `?${params.toString()}` : ''}`;
    
    console.log('🌐 [SLA Service] Fetching summary report from:', url);
    console.log('📋 [SLA Service] Request params:', {
      startDate: startDate || 'none',
      endDate: endDate || 'none',
      priority: priority || 'none (all)',
      category: category || 'none (all)'
    });

    const response = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    console.log('📡 [SLA Service] Response status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [SLA Service] Response error:', errorText);
      throw new Error(`Failed to fetch SLA summary report: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ [SLA Service] Summary report data received:', {
      total_tickets: data.total_tickets,
      compliance_rate: data.sla_compliance?.compliance_rate,
      met: data.sla_compliance?.met,
      breached: data.sla_compliance?.breached
    });

    return data;
  } catch (error) {
    console.error('❌ [SLA Service] Error fetching SLA summary report:', error);
    throw error;
  }
}

export async function getSLADetailedReport(
  startDate?: string,
  endDate?: string,
  priority?: string,
  category?: string,
  status?: string
): Promise<SLADetailedRecord[]> {
  try {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    if (priority) params.append('priority', priority);
    if (category) params.append('category', category);
    if (status) params.append('status', status);

    const url = `${API_BASE_URL}/reports/detailed${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch detailed SLA report: ${response.statusText}`);
    }

    const data = await response.json();
    return Array.isArray(data) ? (data as SLADetailedRecord[]) : [];
  } catch (error) {
    console.error('Error fetching detailed SLA report:', error);
    throw error;
  }
}

export async function getSLATrendsReport(days: number = 30): Promise<SLATrendsReport> {
  try {
    const url = `${API_BASE_URL}/reports/trends?days=${days}`;
    console.log('🌐 [SLA Service] Fetching trends report from:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    console.log('📡 [SLA Service] Trends response status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [SLA Service] Trends response error:', errorText);
      throw new Error(`Failed to fetch SLA trends report: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ [SLA Service] Trends report data received:', {
      period_days: data.period_days,
      trends_count: data.trends?.length || 0
    });

    return data;
  } catch (error) {
    console.error('❌ [SLA Service] Error fetching SLA trends report:', error);
    throw error;
  }
}

export async function getBreachedTickets(limit: number = 50): Promise<BreachedTicket[]> {
  try {
    const url = `${API_BASE_URL}/reports/breached?limit=${limit}`;
    console.log('🌐 [SLA Service] Fetching breached tickets from:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    console.log('📡 [SLA Service] Breached tickets response status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [SLA Service] Breached tickets response error:', errorText);
      throw new Error(`Failed to fetch breached tickets: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ [SLA Service] Breached tickets data received:', {
      count: data?.length || 0
    });

    return data;
  } catch (error) {
    console.error('❌ [SLA Service] Error fetching breached tickets:', error);
    throw error;
  }
}

// ============================================================================
// HELPDESK CATEGORIES (for SLA rule category selection)
// ============================================================================

export interface HelpdeskOption {
  id: string;
  optionid: number;
  option_label: string;
  list_label: string;
  severity_context?: string;
}

/**
 * Fetch helpdesk customer options (categories/issue types)
 * These are used as categories for SLA rules
 */
export async function getHelpdeskCategories(): Promise<string[]> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/v1/helpdesk/customer/options`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      console.warn(`Failed to fetch helpdesk categories: ${response.statusText}`);
      // Try fallback: get categories from existing tickets
      return await getCategoriesFromTickets();
    }

    const options: HelpdeskOption[] = await response.json();
    console.log('📦 Helpdesk options API response:', options);
    console.log('📊 Total options received:', options?.length || 0);
    
    if (!options || !Array.isArray(options) || options.length === 0) {
      console.warn('⚠️ No helpdesk options found or empty array, trying fallback');
      return await getCategoriesFromTickets();
    }
    
    // Log all option structures to understand the data
    console.log('🔍 Sample option structure:', options[0]);
    console.log('🔍 All optionids:', options.map(opt => ({
      optionid: opt.optionid,
      option_label: opt.option_label,
      list_label: opt.list_label
    })));
    
    // Filter for issue types (optionid === 1) and extract unique list_label values
    const filteredOptions = options.filter(opt => {
      const optionId = opt.optionid;
      const optionIdStr = optionId !== undefined ? String(optionId).toLowerCase() : undefined;
      const isType =
        optionId === 1 ||
        optionIdStr === '1' ||
        optionIdStr === 'type' ||
        optionId === undefined;
      console.log(`🔍 Option: ${opt.list_label}, optionid: ${optionId}, isType: ${isType}`);
      return isType; // optionid 1 = "type" (issue types/categories)
    });
    
    console.log('📋 Filtered options (type only):', filteredOptions);
    
    const categories = filteredOptions
      .map(opt => opt.list_label)
      .filter((value): value is string => typeof value === 'string' && value.trim().length > 0) // Filter out null/undefined
      .filter((value, index, self) => self.indexOf(value) === index) // Remove duplicates
      .sort(); // Sort alphabetically
    
    console.log('✅ Extracted categories from options:', categories);
    console.log('📊 Categories count:', categories.length);
    
    // If no categories found from options, try fallback
    if (categories.length === 0) {
      console.warn('No categories found in options, trying fallback');
      return await getCategoriesFromTickets();
    }
    
    return categories;
  } catch (error) {
    console.error('Error fetching helpdesk categories:', error);
    // Try fallback: get categories from existing tickets
    try {
      return await getCategoriesFromTickets();
    } catch (fallbackError) {
      console.error('Fallback also failed:', fallbackError);
      // Return default categories as last resort
      return ['Technical Support', 'Billing', 'General', 'System Critical'];
    }
  }
}

/**
 * Fallback: Get unique categories from existing helpdesk tickets
 */
async function getCategoriesFromTickets(): Promise<string[]> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/v1/helpdesk/tickets`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch tickets: ${response.statusText}`);
    }

    const tickets: HelpdeskTicketSummary[] = await response.json();
    
    // Extract unique issue_type values from tickets
    const categories = tickets
      .map(ticket => ticket.issue_type)
      .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      .filter((value, index, self) => self.indexOf(value) === index) // Remove duplicates
      .sort(); // Sort alphabetically
    
    console.log('Extracted categories from tickets:', categories);
    
    // If still no categories, return defaults
    if (categories.length === 0) {
      return ['Technical Support', 'Billing', 'General', 'System Critical'];
    }
    
    return categories;
  } catch (error) {
    console.error('Error fetching categories from tickets:', error);
    // Return default categories as last resort
    return ['Technical Support', 'Billing', 'General', 'System Critical'];
  }
}

// =====================================
// NEW SLA MANAGEMENT API ENDPOINTS
// =====================================

/**
 * SLA Metrics Response Interface (from new SLA Management API)
 */
export interface SLAMetrics {
  total_tickets_monitored: number;
  compliance_rate: number;
  total_breaches: number;
  at_risk_count: number;
  avg_response_time_minutes: number;
  avg_resolution_time_minutes: number;
  tickets_by_priority: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  recent_breaches: number;
}

/**
 * At-Risk Ticket Interface
 */
export interface AtRiskTicket {
  ticket_id: string;
  customer_id: string;
  priority: string;
  created_at: string;
  response_sla_remaining_minutes: number;
  resolution_sla_remaining_minutes: number;
  status: string;
  issue_type?: string;
}

/**
 * SLA Breach Interface
 */
export interface SLABreach {
  breach_id: string;
  ticket_id: string;
  customer_id: string;
  priority: string;
  breach_type: string;
  breach_time: string;
  minutes_overdue: number;
  escalation_level: number;
  status: string;
}

/**
 * SLA Policy Interface
 */
export interface SLAPolicy {
  policy_id: string;
  policy_name: string;
  priority: string;
  response_time_hours: number;
  resolution_time_hours: number;
  business_hours_only: boolean;
  escalation_enabled: boolean;
  escalation_levels: number;
  auto_escalate: boolean;
  created_at: string;
  updated_at?: string;
}

/**
 * Get comprehensive SLA metrics
 * @param startDate Optional start date for filtering
 * @param endDate Optional end date for filtering
 * @param priority Optional priority filter (critical, high, medium, low)
 */
export async function getSLAMetrics(
  startDate?: string,
  endDate?: string,
  priority?: string
): Promise<SLAMetrics> {
  try {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    if (priority) params.append('priority', priority);

    const url = `${SLA_MGMT_API}/metrics${params.toString() ? `?${params.toString()}` : ''}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch SLA metrics: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching SLA metrics:', error);
    throw error;
  }
}

/**
 * Get tickets at risk of SLA breach
 * @param priority Optional priority filter
 * @param limit Maximum number of tickets to return
 */
export async function getAtRiskTickets(
  priority?: string,
  limit: number = 50
): Promise<AtRiskTicket[]> {
  try {
    const params = new URLSearchParams();
    if (priority) params.append('priority', priority);
    params.append('limit', limit.toString());

    const url = `${SLA_MGMT_API}/at-risk?${params.toString()}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch at-risk tickets: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching at-risk tickets:', error);
    throw error;
  }
}

/**
 * Get SLA breaches
 * @param priority Optional priority filter
 * @param status Optional status filter (active, resolved, escalated)
 * @param limit Maximum number of breaches to return
 */
export async function getSLABreachesNew(
  priority?: string,
  status?: string,
  limit: number = 50
): Promise<SLABreach[]> {
  try {
    const params = new URLSearchParams();
    if (priority) params.append('priority', priority);
    if (status) params.append('status', status);
    params.append('limit', limit.toString());

    const url = `${SLA_MGMT_API}/breaches?${params.toString()}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch SLA breaches: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching SLA breaches:', error);
    throw error;
  }
}

/**
 * Get all SLA policies
 */
export async function getSLAPolicies(): Promise<SLAPolicy[]> {
  try {
    const response = await fetch(`${SLA_MGMT_API}/policies`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch SLA policies: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching SLA policies:', error);
    throw error;
  }
}

