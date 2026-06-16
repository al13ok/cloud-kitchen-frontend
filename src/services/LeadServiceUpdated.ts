/**
 * Updated Lead Service for Separate Collections Structure
 * This service handles lead data from separate collections
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL ? `${process.env.NEXT_PUBLIC_API_URL}/api/v1` : 'https://py-mobiloitte.converiqo.ai/api/v1';

export interface LeadData {
  // Essential lead data
  id: string;
  name: string;
  email: string;
  phone?: string;
  source: string;
  interest?: string;
  message?: string;
  status: string;
  source_type: string;
  is_returning_visitor: boolean;
  previous_leads_count: number;
  created_at: string;
  updated_at: string;
  ip_address?: string;
  visitor_id?: string;
  session_id?: string;
  user_agent?: string;
  validation_confidence?: number;
  validation_warnings?: string[];
}

export interface EnrichmentData {
  lead_id: string;
  enriched_at?: string;
  enrichment_confidence?: number;
  enrichment_method?: string;
  enrichment_version?: string;
  data_quality_score?: number;
  domain_name?: string;
  email_domain?: string;
  email_valid?: boolean;
  email_verification_disposable?: boolean;
  email_verification_gibberish?: boolean;
  email_verification_regex?: boolean;
  email_verification_score?: number;
  email_verification_status?: string;
  email_verification_webmail?: boolean;
  hunter_email_source?: string;
  hunter_email_timestamp?: string;
  openai_company_source?: string;
  openai_company_timestamp?: string;
  openai_person_source?: string;
  openai_person_timestamp?: string;
  person_bio?: string;
  person_budget_authority?: string;
  person_company?: string;
  person_decision_maker?: string;
  person_department?: string;
  person_experience?: string;
  person_first_name?: string;
  person_full_name?: string;
  person_github?: string;
  person_headline?: string;
  person_industry?: string;
  person_influence_level?: string;
  person_job_title?: string;
  person_last_name?: string;
  person_linkedin?: string;
  person_location?: string;
  person_seniority_level?: string;
  person_specialization?: string;
  person_twitter?: string;
  person_website?: string;
  phone_carrier?: string;
  phone_country?: string;
  phone_formatted?: string;
  phone_location?: string;
  phone_valid?: boolean;
  created_at: string;
  updated_at: string;
}

export interface ConsentData {
  lead_id: string;
  consent_form_id?: string;
  consent_required?: boolean;
  consent_status?: string;
  created_at: string;
  updated_at: string;
}

export interface ScoringData {
  lead_id: string;
  lead_score?: number;
  session_score?: number;
  scoring_details?: Record<string, unknown>;
  scoring_results?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface SessionData {
  lead_id: string;
  session?: Record<string, unknown>;
  session_insights?: Record<string, unknown>;
  session_enriched_at?: string;
  created_at: string;
  updated_at: string;
}

export interface AssignmentData {
  lead_id: string;
  assigned_agent_id?: string;
  assigned_agent_name?: string;
  assigned_at?: string;
  assignment_id?: string;
  assignment_results?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface AIQualificationData {
  lead_id: string;
  ai_qualification?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface PredictiveAnalyticsData {
  lead_id: string;
  predictive_analytics?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface GeoLocationData {
  lead_id: string;
  geo_location?: Record<string, unknown>;
  ip_info?: Record<string, unknown>;
  location_confidence?: number;
  location_data?: Record<string, unknown>;
  location_detected_at?: string;
  location_sources?: unknown[];
  created_at: string;
  updated_at: string;
}

export interface CompanyData {
  lead_id: string;
  company_awards?: unknown[];
  company_business_model?: string;
  company_ceo?: string;
  company_certifications?: unknown[];
  company_clients?: unknown[];
  company_competitors?: unknown[];
  company_description?: string;
  company_employee_growth?: string;
  company_employees?: string;
  company_facebook?: string;
  company_founded?: string;
  company_founder?: string;
  company_funding?: string;
  company_growth_stage?: string;
  company_headquarters?: string;
  company_industry?: string;
  company_investors?: unknown[];
  company_linkedin?: string;
  company_location?: string;
  company_market_cap?: string;
  company_news?: string;
  company_offices?: unknown[];
  company_partnerships?: unknown[];
  company_products?: unknown[];
  company_revenue?: string;
  company_revenue_growth?: string;
  company_services?: unknown[];
  company_size?: string;
  company_social_media?: string;
  company_specializations?: unknown[];
  company_subsidiaries?: unknown[];
  company_target_market?: string;
  company_technologies?: unknown[];
  company_twitter?: string;
  company_website?: string;
  created_at: string;
  updated_at: string;
}

export interface CombinedLeadData {
  lead: LeadData;
  enrichment?: EnrichmentData;
  consent?: ConsentData;
  scoring?: ScoringData;
  session?: SessionData;
  assignment?: AssignmentData;
  ai_qualification?: AIQualificationData;
  predictive_analytics?: PredictiveAnalyticsData;
  geo_location?: GeoLocationData;
  company?: CompanyData;
}

export class LeadServiceUpdated {
  private static instance: LeadServiceUpdated;
  private authToken: string | null = null;

  private constructor() {
    // Get auth token from localStorage or cookies
    if (typeof window !== 'undefined') {
      this.authToken = localStorage.getItem('authToken') || null;
    }
  }

  public static getInstance(): LeadServiceUpdated {
    if (!LeadServiceUpdated.instance) {
      LeadServiceUpdated.instance = new LeadServiceUpdated();
    }
    return LeadServiceUpdated.instance;
  }

  private getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    return headers;
  }

  /**
   * Create a new lead with separate collections structure
   */
  async createLead(leadData: Record<string, unknown>): Promise<{ success: boolean; data?: unknown; error?: string }> {
    try {
      const response = await fetch(`${API_BASE}/leads-integration/`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(leadData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      console.error('Error creating lead:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create lead'
      };
    }
  }

  /**
   * Get a lead with all related data from separate collections
   */
  async getLead(leadId: string): Promise<{ success: boolean; data?: CombinedLeadData; error?: string }> {
    try {
      const response = await fetch(`${API_BASE}/leads-integration/${leadId}`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Lead not found');
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // If the response has the new structure with separate collections, use it
      if (data.data && typeof data.data === 'object') {
        return { success: true, data: data.data };
      }

      // Fallback to old structure for backward compatibility
      return { success: true, data: data };
    } catch (error) {
      console.error('Error getting lead:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get lead'
      };
    }
  }

  /**
   * Get session analytics for a specific lead
   */
  async getLeadSessionAnalytics(leadId: string): Promise<{ success: boolean; data?: unknown; error?: string }> {
    try {
      const response = await fetch(`${API_BASE}/session-analytics/lead/${leadId}`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      console.error('Error getting lead session analytics:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get session analytics'
      };
    }
  }

  /**
   * Get all leads with pagination
   */
  async getLeads(page: number = 1, limit: number = 10, filters?: Record<string, unknown>): Promise<{ success: boolean; data?: unknown; error?: string }> {
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...filters
      });

      const response = await fetch(`${API_BASE}/leads-integration/?${queryParams}`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      console.error('Error getting leads:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get leads'
      };
    }
  }

  /**
   * Update lead data in specific collection
   */
  async updateLeadData(leadId: string, collection: string, data: Record<string, unknown>): Promise<{ success: boolean; data?: unknown; error?: string }> {
    try {
      const response = await fetch(`${API_BASE}/leads-integration/${leadId}/${collection}`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const responseData = await response.json();
      return { success: true, data: responseData };
    } catch (error) {
      console.error(`Error updating ${collection} for lead ${leadId}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : `Failed to update ${collection}`
      };
    }
  }

  /**
   * Get session analytics dashboard data
   */
  async getSessionAnalyticsDashboard(): Promise<{ success: boolean; data?: unknown; error?: string }> {
    try {
      const response = await fetch(`${API_BASE}/session-analytics/dashboard`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      console.error('Error getting session analytics dashboard:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get session analytics dashboard'
      };
    }
  }

  /**
   * Get real-time session data
   */
  async getRealTimeSessionData(): Promise<{ success: boolean; data?: unknown; error?: string }> {
    try {
      const response = await fetch(`${API_BASE}/session-analytics/real-time`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      console.error('Error getting real-time session data:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get real-time session data'
      };
    }
  }

  /**
   * Update auth token
   */
  setAuthToken(token: string): void {
    this.authToken = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('authToken', token);
    }
  }

  /**
   * Clear auth token
   */
  clearAuthToken(): void {
    this.authToken = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('authToken');
    }
  }
}

// Export singleton instance
export const leadServiceUpdated = LeadServiceUpdated.getInstance();
