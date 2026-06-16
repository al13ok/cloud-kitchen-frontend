"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import ComponentCard from "@/components/common/ComponentCard";
// import PageHeader from "@/components/common/PageHeader";
import ComprehensiveSessionAnalysis, { type SessionData } from "@/components/dashboard/ComprehensiveSessionAnalysis";
import {
  Users,
  Target,
  AlertTriangle,
  Activity,
  Clock,
  CheckCircle,
  XCircle,
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Building,
  Calendar,
  UserCheck,
  Brain,
  FileText,
  ExternalLink,
  RefreshCw,
  MessageCircle,
  Lightbulb,
  AlertCircle
} from "lucide-react";
import Loader from "@/components/Loader";
import { getAuthHeaders } from "@/utils/api";
// import SessionAnalytics from "@/components/dashboard/SessionAnalytics";
// import dynamic from "next/dynamic";
import { fetchIPGeolocation, IPInfo } from "@/GPS/gps";

// Dynamically import ApexCharts (commented out as not used)
// const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

// Types
interface LeadDetails {
  _id: string;
  id?: string;
  name: string;
  email: string;
  phone: string;
  source: string;
  status: string;
  created_at: string;
  lead_score?: number;
  company_name?: string;
  job_title?: string;
  location?: string;
  industry?: string;
  assignment?: {
    assigned_to: string;
    assigned_to_name: string;
    assigned_to_email: string;
    assigned_at: string;
    assignment_method: string;
    confidence?: number;
    assigned_by?: string;
    assignment_notes?: string;
  };
  // Additional assignment fields that may come from different endpoints
  assignment_results?: {
    assigned_agent?: {
      agent_id: string;
      name: string;
      email: string;
    };
    assigned_at?: string;
    assignment_method?: string;
    confidence?: number;
  };
  assigned_to_name?: string;
  assigned_to?: string;
  assigned_agent_id?: string;
  assigned_agent_name?: string;
  enrichment_data?: Record<string, unknown>;
  scoring_details?: Record<string, unknown>;
  consent_status?: string;
  ip_info?: Record<string, unknown>;
  stage?: string;
  message?: string;
  session_data?: Record<string, unknown>;
  session_score?: number;
  session_insights?: Record<string, unknown>;
  interest?: string;

  // Company enrichment fields
  company_industry?: string;
  company_website?: string;
  company_linkedin?: string;
  company_location?: string;
  company_description?: string;
  company_domain?: string;
  company_title?: string;
  company_twitter_url?: string;
  company_founded?: string;
  company_size?: string;
  company_revenue?: string;
  company_ceo?: string;
  company_founder?: string;
  company_employees?: string;
  company_headquarters?: string;
  company_technologies?: string[];
  company_services?: string[];
  company_products?: string[];
  company_competitors?: string[];
  company_clients?: string[];
  company_awards?: string[];
  company_certifications?: string[];
  company_offices?: string[];
  company_subsidiaries?: string[];
  company_partnerships?: string[];
  company_social_media?: string;
  company_news?: string;
  company_specializations?: string[];
  company_target_market?: string;
  company_business_model?: string;
  company_growth_stage?: string;
  company_employee_growth?: string;
  company_revenue_growth?: string;
  company_funding?: string;
  company_investors?: string[];
  company_market_cap?: string;

  // AI enrichment fields
  ai_description?: string;
  ai_founded?: string;
  ai_industry?: string;
  ai_location?: string;
  ai_products?: string;
  ai_size?: string;

  // Person enrichment fields
  person_first_name?: string;
  person_last_name?: string;
  person_job_title?: string;
  person_department?: string;
  person_seniority_level?: string;
  person_experience_years?: string;
  person_decision_authority?: string;
  person_key_skills?: string;
  person_professional_summary?: string;
  person_contact_preference?: string;
  person_data_quality_score?: number;
  person_enrichment_confidence?: number;
  person_last_updated?: string;
  person_linkedin_url?: string;
  person_company?: string;
  person_education?: string;
  person_location?: string;

  // Data quality fields
  data_quality_score?: number;
  email_validation?: Record<string, unknown>;
  phone_validation?: Record<string, unknown>;
  spam_detection?: Record<string, unknown>;
  email_verified?: string;
  email_deliverable?: boolean;
  email_risky?: boolean;
  email_score?: number;
  phone_valid?: boolean;
  enrichment_confidence?: number;
  enrichment_method?: string;
  enriched_at?: string;
  first_name?: string;
  last_name?: string;
  last_updated?: string;
}

interface LeadScore {
  total_score: number;
  demographic_score: number;
  behavioral_score: number;
  predictive_score: number;
  scoring_breakdown: Record<string, unknown>;
  recommendations: string[];
  risk_factors: string[];
  confidence: number;
}

interface LeadAudit {
  log_id: string;
  id?: string;
  action: string;
  timestamp: string;
  user_id?: string;
  details: Record<string, unknown>;
  description?: string;
  status: string;
  error_message?: string;
  entity_type: string;
  entity_id: string;
}

interface Interaction {
  type?: string;
  [key: string]: unknown;
}

// Unused interface - commented out to fix linting errors
/*
interface LeadAppointment {
_id?: string;
id: string;
lead_id: string;
title: string;
description: string;
start_time: string;
end_time: string;
status: string;
location: string;
}
*/

// API Configuration
const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "https://py-mobiloitte.converiqo.ai";
const API_BASE = `${BACKEND_URL}/api/v1/leads-integration`;

// Utility function to check if a string is a MongoDB ObjectId
const isObjectId = (id: string): boolean => {
  if (!id) return false;
  return id.length === 24 && /^[0-9a-fA-F]{24}$/.test(id);
};

// Utility function to get proper lead ID from lead data
interface LeadDataWithId {
  id?: string;
  _id?: string;
  [key: string]: unknown;
}
const getProperLeadId = (leadData: LeadDataWithId): string => {
  // Prioritize the 'id' field (LD-XXXX format) over '_id' (MongoDB ObjectId)
  return leadData.id || leadData._id || '';
};

// Interface for lead with MongoDB ID
interface LeadWithMongoId {
  _id?: string;
  id?: string;
  [key: string]: unknown;
}

// Interface for assignment data
interface AssignmentData {
  assigned_to?: string;
  assigned_to_name?: string;
  assigned_to_email?: string;
  assigned_at?: string;
  assignment_method?: string;
  confidence?: number;
  assigned_by?: string;
  assignment_notes?: string;
  [key: string]: unknown;
}

// Interface for assigned agent
interface AssignedAgent {
  agent_id?: string;
  name?: string;
  email?: string;
  [key: string]: unknown;
}

// Main Lead Detail Component
export default function LeadDetailPage() {
  // Force rebuild to clear browser cache - Key prop fixes applied
  const router = useRouter();
  const params = useParams();
  const leadId = params.id as string;

  // Helper function to capitalize first letter of a string
  const capitalizeFirstLetter = (str: string): string => {
    if (!str) return str;
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  };

  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [leadDetails, setLeadDetails] = useState<LeadDetails | null>(null);
  const [leadScore, setLeadScore] = useState<LeadScore | null>(null);
  const [, setAuditLogs] = useState<LeadAudit[]>([]);
  interface Appointment {
    [key: string]: unknown;
  }
  const [, setAppointments] = useState<Appointment[]>([]);
  const [activeTab, setActiveTab] = useState('overview');
  interface Agent {
    [key: string]: unknown;
  }
  const [availableAgents, setAvailableAgents] = useState<Agent[]>([]);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  interface ProcessingStatus {
    assigned?: boolean;
    [key: string]: unknown;
  }
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus | null>(null);
  const [isReenriching, setIsReenriching] = useState(false);
  const [currentStage, setCurrentStage] = useState<string>('');
  const [showStageModal, setShowStageModal] = useState(false);
  const [selectedStage, setSelectedStage] = useState('');
  const [appointmentTitle, setAppointmentTitle] = useState('');
  const [appointmentDescription, setAppointmentDescription] = useState('');
  const [actualLeadId, setActualLeadId] = useState<string>('');
  const [appointmentStartTime, setAppointmentStartTime] = useState('');
  const [appointmentEndTime, setAppointmentEndTime] = useState('');
  const [appointmentLocation, setAppointmentLocation] = useState('');
  const [appointmentTimezone, setAppointmentTimezone] = useState('UTC');
  const [appointmentType, setAppointmentType] = useState('meeting');
  const [appointmentReminders, setAppointmentReminders] = useState(['5 minutes before', '30 minutes before']);
  const [appointmentRecurrence, setAppointmentRecurrence] = useState('none');
  const [appointmentGoogleMeet, setAppointmentGoogleMeet] = useState(true);
  const [appointmentMeetingLink, setAppointmentMeetingLink] = useState('');
  interface AgentDetails {
    agent_id?: string;
    department?: string;
    [key: string]: unknown;
  }
  const [agentDetails, setAgentDetails] = useState<AgentDetails | null>(null);

  // Refs to prevent excessive API calls
  const isFetchingAssignmentStatus = useRef(false);
  const lastFetchedAssignmentId = useRef<string | null>(null);

  // Session Analytics state - matches ComprehensiveSessionAnalysis SessionData interface
  type SessionAnalyticsData = {
    leadId: string;
    leadName: string;
    leadEmail: string;
    hasSessionData: boolean;
    sessionData?: {
      sessionId: string;
      startTime: string;
      lastActivity: string;
      totalTimeOnSite: number;
      currentPage: string;
      interactionCount: number;
      chatbotInteractions: number;
      formSubmitted: boolean;
      satisfaction: 'good' | 'bad';
      userAgent: string;
      screenResolution: string;
      deviceType: string;
      language: string;
      timezone: string;
      referrer: string;
      website: string;
      pageViews: number | Array<{
        url: string;
        title: string;
        pageName?: string;
        timestamp: string;
        timeSpent: number;
        scrollDepth: number;
        exitPage: boolean;
        chatbotPresent?: boolean;
      }>;
      interactions: Array<{
        type: string;
        element: string | null | Record<string, unknown>;
        timestamp: string;
        page: string;
        data: { [key: string]: unknown };
      }> | number;
      chatbotEvents?: Array<Record<string, unknown>>;
      form_interactions?: Array<Record<string, unknown>>;
      chatbot_events?: Array<Record<string, unknown>>;
      custom_events?: Array<Record<string, unknown>>;
      [key: string]: unknown;
    };
    sessionInsights?: { [key: string]: unknown };
    sessionScore?: number;
    timestamp?: string;
    [key: string]: unknown;
  };
  const [sessionAnalyticsData, setSessionAnalyticsData] = useState<SessionAnalyticsData | null>(null);
  const [sessionAnalyticsLoading, setSessionAnalyticsLoading] = useState(false);
  const [sessionAnalyticsError, setSessionAnalyticsError] = useState<string | null>(null);

  // Audit Logs state
  const [, setAuditLogsLoading] = useState(false);
  const [, setAuditLogsError] = useState<string | null>(null);
  const [, setLastAuditRefresh] = useState<Date | null>(null);

  // Assignment Required Modal state
  const [showAssignmentRequiredModal, setShowAssignmentRequiredModal] = useState(false);

  // IP Information state
  const [ipInfo, setIpInfo] = useState<IPInfo | null>(null);
  const [ipInfoLoading, setIpInfoLoading] = useState<boolean>(false);
  const [ipInfoError, setIpInfoError] = useState<string>('');

  // Thread state (for Thread tab)
  interface ThreadMessage {
    message_id?: string;
    sender_type?: string;
    sender_name?: string;
    sender_email?: string;
    message?: string;
    timestamp?: string;
    created_at?: string;
    status?: string;
  }
  const [thread, setThread] = useState<ThreadMessage[]>([]);
  const [replyText, setReplyText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [threadLoading, setThreadLoading] = useState(false);
  const [threadStatusOptions, setThreadStatusOptions] = useState<string[]>(['Contacted', 'Engaged', 'Won', 'Close', 'Lost', 'Junk']);
  const [threadSelectedStatus, setThreadSelectedStatus] = useState<string>('');
  // Removed unused setIsSavingThreadStatus
  const threadEndRef = useRef<HTMLDivElement | null>(null);
  const statusUpdatedToInProcessRef = useRef<boolean>(false);

  // Load IP info when enrichment tab opens, preferring server-provided data
  useEffect(() => {
    try {
      interface LeadWithEnrichment {
        enrichment_data?: { ip_information?: IPInfo };
        lead_metadata?: { ip_information?: IPInfo };
      }
      const fromServer: IPInfo | null = (leadDetails as LeadWithEnrichment)?.enrichment_data?.ip_information || (leadDetails as LeadWithEnrichment)?.lead_metadata?.ip_information || null;
      if (fromServer && !ipInfo) {
        setIpInfo(fromServer);
        setIpInfoError('');
        setIpInfoLoading(false);
        return;
      }
    } catch { }

    if (activeTab === 'enrichment' && !ipInfo && !ipInfoLoading) {
      (async () => {
        try {
          setIpInfoLoading(true);
          const data = await fetchIPGeolocation();
          setIpInfo(data);
          setIpInfoError(data ? '' : 'Unable to fetch IP information');
        } catch {
          setIpInfoError('Unable to fetch IP information');
        } finally {
          setIpInfoLoading(false);
        }
      })();
    }
  }, [activeTab, leadDetails, ipInfo, ipInfoLoading]);

  // Fetch status options for thread tab
  useEffect(() => {
    fetch(`${BACKEND_URL}/api/v1/leads/options`)
      .then(res => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then((data: Array<{ optionid?: number; list_label?: string }>) => {
        const statuses = Array.isArray(data)
          ? data
            .filter(item => Number(item.optionid) === 3 && (item.list_label ?? '').toString().trim().length > 0)
            .map(item => String(item.list_label))
          : [];
        if (statuses.length > 0) {
          setThreadStatusOptions(statuses);
        }
      })
      .catch((error) => {
        console.warn('Failed to fetch status options from backend, using defaults:', error);
      });
  }, []);

  // Set initial thread status when leadDetails changes
  useEffect(() => {
    if (leadDetails && typeof leadDetails.status === 'string') {
      setThreadSelectedStatus(threadStatusOptions.includes(leadDetails.status) ? leadDetails.status : '');
    }
  }, [leadDetails, threadStatusOptions]);

  // Fetch thread when thread tab is active
  useEffect(() => {
    if (activeTab === 'thread' && leadDetails && (leadDetails._id || leadDetails.id)) {
      const fetchThread = async () => {
        setThreadLoading(true);
        try {
          const mongoId = leadDetails._id || (leadDetails.id && String(leadDetails.id).length === 24 && /^[0-9a-fA-F]{24}$/i.test(String(leadDetails.id)) ? leadDetails.id : null);
          if (!mongoId) {
            console.warn('MongoDB ObjectId not found for lead, cannot fetch thread');
            setThread([]);
            setThreadLoading(false);
            return;
          }
          const res = await fetch(`${BACKEND_URL}/api/v1/leads/${mongoId}/thread`);
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data)) {
              setThread(data.map((m: ThreadMessage) => ({
                message_id: m.message_id,
                sender_type: m.sender_type ?? '',
                sender_name: m.sender_name,
                sender_email: m.sender_email,
                message: m.message ?? '',
                timestamp: m.timestamp ?? m.created_at,
                status: m.status ?? (m.sender_type && String(m.sender_type).toLowerCase() === 'admin' ? 'Pending' : ''),
              })));
            } else if ('messages' in data && Array.isArray(data.messages)) {
              setThread(data.messages.map((m: ThreadMessage) => ({
                message_id: m.message_id,
                sender_type: m.sender_type ?? '',
                sender_name: m.sender_name,
                sender_email: m.sender_email,
                message: m.message ?? '',
                timestamp: m.timestamp ?? m.created_at,
                status: m.status ?? (m.sender_type && String(m.sender_type).toLowerCase() === 'admin' ? 'Pending' : ''),
              })));
              if (data.current_status && data.current_status !== leadDetails.status) {
                setLeadDetails({ ...leadDetails, status: data.current_status });
                if (threadStatusOptions.includes(data.current_status)) {
                  setThreadSelectedStatus(data.current_status);
                }
              }
            } else {
              setThread([]);
            }
          } else {
            setThread([]);
          }
        } catch (error) {
          console.error('Error fetching thread:', error);
          setThread([]);
        } finally {
          setThreadLoading(false);
        }
      };
      fetchThread();
    }
  }, [activeTab, leadDetails, threadStatusOptions]);

  // Auto-scroll to bottom when thread updates
  useEffect(() => {
    if (threadEndRef.current && activeTab === 'thread') {
      setTimeout(() => {
        threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [thread, activeTab]);

  // Fetch lead details
  useEffect(() => {
    const fetchLeadDetails = async () => {
      setLoading(true);
      setError(null);

      try {
        // First check if backend is running
        try {
          const healthCheck = await fetch(`${BACKEND_URL}/health`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
          });

          if (!healthCheck.ok) {
            throw new Error('Backend server is not running. Please start the backend server.');
          }
        } catch (healthError) {
          console.warn('Backend health check failed:', healthError);
          throw new Error('Backend server is not running. Please start the backend server.');
        }

        // Try to fetch lead from leads-integration endpoint first
        let leadData = null;
        try {
          const leadRes = await fetch(`${API_BASE}/${leadId}/enrich`, {
            headers: getAuthHeaders()
          });
          if (leadRes.ok) {
            const leadResponse = await leadRes.json();
            leadData = leadResponse.lead;
          }
        } catch (error) {
          console.warn('Failed to fetch from leads-integration endpoint:', error);
        }

        // If not found and leadId looks like an ObjectId, try to find by ObjectId
        if (!leadData && isObjectId(leadId)) {
          try {
            console.log(`🔍 Trying to find lead by ObjectId: ${leadId}`);
            // Try to get all leads and find the one with matching _id
            const allLeadsRes = await fetch(`${BACKEND_URL}/api/v1/leads`, {
              headers: getAuthHeaders()
            });

            if (allLeadsRes.ok) {
              const allLeads = await allLeadsRes.json();
              leadData = allLeads.find((lead: LeadWithMongoId) => lead._id === leadId);
              if (leadData) {
                console.log('✅ Found lead by ObjectId:', leadData);
              }
            }
          } catch (error) {
            console.log('Failed to search by ObjectId:', error);
          }
        }

        // Fallback to general leads endpoint if not found
        if (!leadData) {
          const leadsRes = await fetch(`${BACKEND_URL}/api/v1/leads`, {
            headers: getAuthHeaders()
          });

          if (leadsRes.ok) {
            const allLeads = await leadsRes.json();
            leadData = allLeads.find((lead: LeadWithMongoId) =>
              lead.id === leadId ||
              lead._id === leadId ||
              lead.id === `LD-${leadId}` ||
              lead._id === `LD-${leadId}`
            );
          } else {
            throw new Error('Failed to fetch leads');
          }
        }

        if (leadData) {
          setLeadDetails(leadData);
          setCurrentStage(leadData.stage || 'Contacted');

          // Set the actual lead ID (LD-XXXX format) - prioritize the proper lead ID
          const actualId = getProperLeadId(leadData);
          setActualLeadId(actualId);
          console.log(`🔍 Found lead with actual ID: ${actualId}`);
          console.log(`🔍 Lead data structure:`, { id: leadData.id, _id: leadData._id, actualId });

          // Check if lead has assignment data in any of the possible structures
          // Check both assignment object and root-level fields (assigned_agent_id, assigned_agent_name)
          const hasAssignment = leadData.assignment ||
            leadData.assignment_results ||
            leadData.assigned_to_name ||
            leadData.assigned_to ||
            leadData.assigned_agent_id ||
            leadData.assigned_agent_name;

          if (hasAssignment) {
            console.log(`🔍 Lead has assignment data:`, {
              assignment: leadData.assignment,
              assignment_results: leadData.assignment_results,
              assigned_to_name: leadData.assigned_to_name,
              assigned_to: leadData.assigned_to,
              assigned_agent_id: leadData.assigned_agent_id,
              assigned_agent_name: leadData.assigned_agent_name
            });

            // Normalize assignment data to the expected structure
            // Merge data from all possible sources
            if (!leadData.assignment || !leadData.assignment.assigned_to) {
              leadData.assignment = {
                assigned_to: leadData.assignment?.assigned_to ||
                  leadData.assigned_to ||
                  leadData.assigned_agent_id ||
                  leadData.assignment_results?.assigned_agent?.agent_id,
                assigned_to_name: leadData.assignment?.assigned_to_name ||
                  leadData.assigned_to_name ||
                  leadData.assigned_agent_name ||
                  leadData.assignment_results?.assigned_agent?.name,
                assigned_to_email: leadData.assignment?.assigned_to_email ||
                  leadData.assignment_results?.assigned_agent?.email || '',
                assigned_at: leadData.assignment?.assigned_at ||
                  leadData.assigned_at ||
                  leadData.assignment_results?.assigned_at ||
                  new Date().toISOString(),
                assignment_method: leadData.assignment?.assignment_method ||
                  leadData.assignment_results?.assignment_method ||
                  'unknown',
                confidence: leadData.assignment?.confidence ||
                  leadData.assignment_results?.confidence ||
                  100
              };
              setLeadDetails(leadData);
            }
          }

          // If we found the lead by ObjectId and it has a proper ID, redirect to the proper URL
          if (isObjectId(leadId) && leadData.id && leadData.id !== leadId) {
            console.log(`🔄 Redirecting from ObjectId ${leadId} to proper ID ${leadData.id}`);
            router.replace(`/lead-integration/${leadData.id}`);
            return;
          }

          // Set lead score from the lead data (already enriched)
          if (leadData.lead_score) {
            setLeadScore({
              total_score: leadData.lead_score,
              demographic_score: leadData.lead_score * 0.4,
              behavioral_score: leadData.lead_score * 0.3,
              predictive_score: leadData.lead_score * 0.3,
              scoring_breakdown: {},
              recommendations: ['Lead is already enriched and scored'],
              risk_factors: [],
              confidence: 0.85
            });
          }
        } else {
          // Provide more helpful error message
          const errorMessage = isObjectId(leadId)
            ? `Lead with ObjectId ${leadId} not found. This might be an old MongoDB ObjectId. Please check if the lead exists in the database.`
            : `Lead with ID ${leadId} not found`;
          throw new Error(errorMessage);
        }

        // Initialize audit logs as empty - will be fetched when user visits audit tab
        setAuditLogs([]);

        // Fetch appointments
        await fetchAppointments();

        // Check processing status and trigger if needed
        try {
          const debugRes = await fetch(`${API_BASE}/${leadId}/debug`, {
            headers: getAuthHeaders()
          });
          if (debugRes.ok) {
            const debugData = await debugRes.json();
            const processingStatus = debugData.processing_status;

            // Override assignment status based on actual assignment data
            // Check all possible assignment fields to determine if lead is actually assigned
            if (processingStatus) {
              const assignment = leadData.assignment || {};
              const assignmentResults = leadData.assignment_results || {};
              const assignedAgent = assignmentResults.assigned_agent || {};

              // Check if assigned_to exists and is not empty (matching backend logic)
              // Check all possible assignment fields including root-level assigned_agent_id
              interface AssignmentData {
                assigned_to?: string;
                assigned_to_name?: string;
                assigned_by?: string;
                assignment_notes?: string;
              }
              interface AssignedAgent {
                agent_id?: string;
                name?: string;
              }
              const assignedTo = (assignment as AssignmentData)?.assigned_to ||
                (assignedAgent as AssignedAgent)?.agent_id ||
                leadData.assigned_to ||
                leadData.assigned_agent_id;
              const isActuallyAssigned = assignedTo !== null && assignedTo !== undefined && assignedTo !== '';

              // Also check for assigned_to_name as additional confirmation
              const hasAssignedName = !!(
                (assignment as AssignmentData)?.assigned_to_name ||
                (assignedAgent as AssignedAgent)?.name ||
                leadData.assigned_to_name ||
                leadData.assigned_agent_name
              );

              // Update processing status if assignment state differs
              if (processingStatus.assigned !== isActuallyAssigned || (isActuallyAssigned && hasAssignedName)) {
                processingStatus.assigned = isActuallyAssigned || hasAssignedName;
                console.log('🔄 Updated processing status.assigned to:', processingStatus.assigned, {
                  assignedTo,
                  hasAssignedName,
                  assignment: assignment.assigned_to,
                  assignedAgent: assignedAgent.agent_id
                });
              }
            }

            setProcessingStatus(processingStatus);

            // If lead is not fully processed, trigger bulk processing
            if (processingStatus &&
              (!processingStatus.enriched ||
                !processingStatus.scored ||
                !processingStatus.assigned)) {
              console.log('Lead not fully processed, triggering bulk processing...');
              try {
                const bulkRes = await fetch(`${API_BASE}/bulk-process`, {
                  method: 'POST',
                  headers: getAuthHeaders()
                });
                if (bulkRes.ok) {
                  console.log('Bulk processing triggered successfully');
                }
              } catch (bulkError) {
                console.warn('Failed to trigger bulk processing:', bulkError);
              }
            }
          }
        } catch (debugError) {
          console.warn('Failed to check processing status:', debugError);
        }

        // Fetch enrichment data with automatic retry if not ready
        const fetchEnrichmentData = async (retryCount = 0, maxRetries = 10) => {
          try {
            const enrichRes = await fetch(`${API_BASE}/${leadId}/enrich`, {
              headers: getAuthHeaders()
            });
            if (enrichRes.ok) {
              const enrichData = await enrichRes.json();
              console.log('🔍 Enrichment API Response:', enrichData);
              console.log('🔍 Lead data from API:', enrichData.lead);

              if (enrichData.lead) {
                // Check if enrichment is complete by looking for enrichment fields
                const hasEnrichmentData = enrichData.lead.company_industry ||
                  enrichData.lead.company_website ||
                  enrichData.lead.company_linkedin ||
                  enrichData.lead.enrichment_data ||
                  enrichData.lead.enriched_at;

                if (hasEnrichmentData) {
                  console.log('✅ Found enrichment data, updating state');
                  setLeadDetails(prev => {
                    if (prev) {
                      const updated = {
                        ...prev,
                        ...enrichData.lead, // Merge all enrichment fields
                        enrichment_data: enrichData.lead.enrichment_data,
                        ip_info: enrichData.lead.ip_info,
                        // Company information
                        company_industry: enrichData.lead.company_industry,
                        company_website: enrichData.lead.company_website,
                        company_linkedin: enrichData.lead.company_linkedin,
                        company_location: enrichData.lead.company_location,
                        company_size: enrichData.lead.company_size,
                        // Person information
                        job_title: enrichData.lead.job_title || enrichData.lead.person_job_title,
                        location: enrichData.lead.location || enrichData.lead.person_location
                      };
                      console.log('🔄 Updated leadDetails with enrichment:', updated);
                      return updated;
                    }
                    return prev;
                  });
                } else {
                  // Enrichment not complete yet, retry after delay
                  if (retryCount < maxRetries) {
                    console.log(`⏳ Enrichment not ready yet, retrying in 3 seconds... (${retryCount + 1}/${maxRetries})`);
                    setTimeout(() => {
                      fetchEnrichmentData(retryCount + 1, maxRetries);
                    }, 3000);
                  } else {
                    console.log('⏱ Max retries reached, enrichment may still be in progress');
                  }
                }
              }
            } else {
              console.warn('Failed to fetch enrichment data:', enrichRes.status);
              // Retry on failure if we haven't exceeded max retries
              if (retryCount < maxRetries) {
                setTimeout(() => {
                  fetchEnrichmentData(retryCount + 1, maxRetries);
                }, 3000);
              }
            }
          } catch (enrichError) {
            console.warn('Failed to fetch enrichment data:', enrichError);
            // Retry on error if we haven't exceeded max retries
            if (retryCount < maxRetries) {
              setTimeout(() => {
                fetchEnrichmentData(retryCount + 1, maxRetries);
              }, 3000);
            }
          }
        };

        // Start fetching enrichment data with auto-retry
        fetchEnrichmentData();

      } catch (error) {
        console.error("Error fetching lead details:", error);
        setError("Failed to fetch lead details: " + (error as Error).message);

        // Set empty state instead of mock data
        setLeadDetails(null);
        setLeadScore(null);
        setAuditLogs([]);
        setAppointments([]);
      } finally {
        setLoading(false);
      }
    };

    if (leadId) {
      fetchLeadDetails();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadId]);

  // Fetch session analytics when session tab is activated
  useEffect(() => {
    if (activeTab === 'session' && leadId && !sessionAnalyticsData) {
      fetchSessionAnalytics();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, leadId, sessionAnalyticsData]);


  // Fetch available agents
  const fetchAvailableAgents = async () => {
    try {
      const response = await fetch(`${API_BASE}/agents`, {
        headers: getAuthHeaders()
      });
      if (response.ok) {
        const data = await response.json();
        setAvailableAgents(data.agents || []);
      }
    } catch (error) {
      console.error('Failed to fetch agents:', error);
    }
  };

  // Fetch agent details by agent ID
  const fetchAgentById = async (agentId: string) => {
    if (!agentId) return;

    try {
      console.log(`🔍 Fetching agent details for ID: ${agentId}`);
      const response = await fetch(`${API_BASE}/agents/${agentId}`, {
        headers: getAuthHeaders()
      });

      if (response.ok) {
        const data = await response.json();
        const agent = data.agent || data;

        if (agent) {
          // Extract email and department from multiple possible field names
          const agentEmail = agent.email || agent.agent_email || agent.agentEmail || '';
          const agentName = agent.name || agent.agent_name || agent.agentName || '';
          const department = agent.department || '';

          const agentData = {
            agent_id: agent.agent_id || agentId,
            name: agentName,
            email: agentEmail,
            department: department,
            phone: agent.phone || '',
            specialization: agent.specialization || [],
            is_active: agent.is_active !== undefined ? agent.is_active : true
          };

          console.log('✅ Fetched agent details:', agentData);
          setAgentDetails(agentData);
          return agentData;
        }
      } else {
        console.warn(`⚠ Failed to fetch agent ${agentId}: ${response.status}`);
      }
    } catch (error) {
      console.error(`❌ Error fetching agent ${agentId}:`, error);
    }

    return null;
  };

  // Fetch assignment status including agent details
  const fetchAssignmentStatus = async (leadIdForStatus?: string) => {
    // Prevent concurrent calls
    if (isFetchingAssignmentStatus.current) {
      return;
    }

    try {
      const id = leadIdForStatus || actualLeadId || (params.id as string);
      if (!id) return;

      isFetchingAssignmentStatus.current = true;
      lastFetchedAssignmentId.current = id;

      const response = await fetch(`${API_BASE}/${id}/assignment-status`, {
        headers: getAuthHeaders()
      });
      if (!response.ok) {
        isFetchingAssignmentStatus.current = false;
        return;
      }
      const data = await response.json();
      console.log('📋 Assignment status response:', data);

      // Get agent ID from assignment data
      const agentId = data.assignment_details?.assigned_to ||
        leadDetails?.assignment?.assigned_to ||
        leadDetails?.assigned_agent_id ||
        leadDetails?.assigned_to;

      // If we have agent details from assignment-status, use them
      if (data && data.agent_details) {
        console.log('✅ Setting agent details from assignment-status:', data.agent_details);
        setAgentDetails(data.agent_details);
      } else if (agentId) {
        // Otherwise, fetch agent details directly by agent ID
        console.log(`🔄 Fetching agent details directly for agent ID: ${agentId}`);
        await fetchAgentById(agentId);
      } else {
        console.log('⚠ No agent details in response and no agent ID found');
        setAgentDetails(null);
      }
      // Update assignment details if available OR if lead is assigned (check is_assigned flag)
      if (data && (data.assignment_details || data.is_assigned)) {
        setLeadDetails(prev => {
          if (!prev) return prev;

          // If assignment_details exists, use it; otherwise check if lead is assigned and use existing data
          const assignmentDetails = data.assignment_details || (data.is_assigned && prev.assignment ? prev.assignment : null);

          if (!assignmentDetails && !data.is_assigned) {
            // Lead is not assigned, clear assignment data
            return {
              ...prev,
              assignment: undefined,
              assigned_to: undefined,
              assigned_to_name: undefined,
              assigned_agent_id: undefined,
              assigned_agent_name: undefined
            };
          }

          if (assignmentDetails) {
            const currentAssignmentId = prev.assignment?.assigned_to || prev.assigned_agent_id;
            const newAssignmentId = assignmentDetails.assigned_to;

            // Always update to ensure we have the latest data from the backend
            const updatedAssignment = {
              assigned_to: assignmentDetails.assigned_to,
              assigned_to_name: assignmentDetails.assigned_to_name,
              assigned_to_email: assignmentDetails.assigned_to_email,
              assigned_at: assignmentDetails.assigned_at,
              assignment_method: assignmentDetails.assignment_method,
              confidence: assignmentDetails.confidence,
              assigned_by: (prev.assignment as AssignmentData)?.assigned_by || assignmentDetails.assigned_by,
              assignment_notes: (prev.assignment as AssignmentData)?.assignment_notes || assignmentDetails.assignment_notes
            };

            // Only update if assignment actually changed to prevent unnecessary re-renders
            if (currentAssignmentId !== newAssignmentId || !prev.assignment) {
              console.log('🔄 Updating lead assignment details:', {
                from: currentAssignmentId,
                to: newAssignmentId,
                assignment: updatedAssignment
              });
              return {
                ...prev,
                assignment: updatedAssignment,
                // Also update legacy fields for compatibility
                assigned_to: updatedAssignment.assigned_to,
                assigned_to_name: updatedAssignment.assigned_to_name,
                assigned_agent_id: updatedAssignment.assigned_to,
                assigned_agent_name: updatedAssignment.assigned_to_name
              };
            }
            // Even if ID hasn't changed, update other fields that might have changed
            return {
              ...prev,
              assignment: {
                ...prev.assignment,
                ...updatedAssignment
              },
              // Also update legacy fields
              assigned_agent_id: updatedAssignment.assigned_to,
              assigned_agent_name: updatedAssignment.assigned_to_name
            };
          }

          return prev;
        });
      }
    } catch {
      // swallow
    } finally {
      isFetchingAssignmentStatus.current = false;
    }
  };


  // Fetch assignment status when assignment tab becomes active or lead ID changes
  useEffect(() => {
    // Only fetch when assignment tab is active
    if (activeTab !== 'assignment' || !actualLeadId) return;

    // Prevent fetching if already fetching
    if (isFetchingAssignmentStatus.current) return;

    // Fetch available agents first (as fallback for agent details)
    fetchAvailableAgents();

    // Always fetch when assignment tab is opened to ensure fresh data
    // Also fetch if lead ID changed or if we haven't fetched yet
    if (lastFetchedAssignmentId.current !== actualLeadId || activeTab === 'assignment') {
      console.log('🔄 Fetching assignment status for tab:', { activeTab, actualLeadId });
      fetchAssignmentStatus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, actualLeadId]); // Only depend on activeTab and actualLeadId

  // Fetch agent details when we have an agent ID from lead details
  useEffect(() => {
    // Only fetch when assignment tab is active and we have lead details
    if (activeTab !== 'assignment' || !leadDetails) return;

    // Get agent ID from various possible locations
    const agentId = leadDetails.assignment?.assigned_to ||
      leadDetails.assigned_agent_id ||
      leadDetails.assigned_to ||
      agentDetails?.agent_id;

    // If we have an agent ID but no agent details (or agent details missing email/department), fetch it
    if (agentId && (!agentDetails || !agentDetails.email || !agentDetails.department)) {
      console.log(`🔄 Fetching agent details for agent ID: ${agentId}`);
      fetchAgentById(agentId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, leadDetails?.assignment?.assigned_to, leadDetails?.assigned_agent_id, leadDetails?.assigned_to]);

  // Update processing status when assignment data changes
  useEffect(() => {
    if (processingStatus && leadDetails) {
      const assignment = leadDetails.assignment || {};
      const assignmentResults = leadDetails.assignment_results || {};
      const assignedAgent = assignmentResults.assigned_agent || {};

      // Check if assigned_to exists and is not empty (matching backend logic)
      // Check all possible assignment fields including root-level assigned_agent_id
      const assignedTo = (assignment as AssignmentData)?.assigned_to ||
        (assignedAgent as AssignedAgent)?.agent_id ||
        leadDetails.assigned_to ||
        leadDetails.assigned_agent_id;
      const isActuallyAssigned = assignedTo !== null && assignedTo !== undefined && assignedTo !== '';

      // Also check for assigned_to_name as additional confirmation
      const hasAssignedName = !!(
        (assignment as AssignmentData)?.assigned_to_name ||
        (assignedAgent as AssignedAgent)?.name ||
        leadDetails.assigned_to_name ||
        leadDetails.assigned_agent_name
      );

      const finalAssignedStatus = isActuallyAssigned || hasAssignedName;

      if (processingStatus.assigned !== finalAssignedStatus) {
        console.log('🔄 Updating processing status.assigned:', {
          from: processingStatus.assigned,
          to: finalAssignedStatus,
          assignedTo,
          hasAssignedName
        });
        setProcessingStatus((prev: ProcessingStatus | null) => ({
          ...prev,
          assigned: finalAssignedStatus
        }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadDetails?.assignment, leadDetails?.assignment_results, leadDetails?.assigned_to_name, leadDetails?.assigned_to, processingStatus]);

  // Attempt AI auto-assignment silently; returns true if assignment succeeded
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _autoAssignLeadIfPossible = async (leadIdForAssignment: string): Promise<boolean> => {
    try {
      if (!leadIdForAssignment) return false;
      console.log(`🤖 Attempting silent auto-assignment for lead: ${leadIdForAssignment}`);
      const response = await fetch(`${API_BASE}/${leadIdForAssignment}/assign`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        console.warn('🤖 Auto-assign failed (non-OK):', response.status, response.statusText, errText);
        return false;
      }
      interface AutoAssignResponse {
        assignment?: {
          assigned_to?: string;
        };
        assignment_results?: {
          assigned_agent?: string;
        };
        assigned_to?: string;
        [key: string]: unknown;
      }
      const data = await response.json().catch(() => ({} as AutoAssignResponse));
      const assignedTo = data?.assignment?.assigned_to || data?.assignment_results?.assigned_agent || data?.assigned_to;
      if (assignedTo) {
        setLeadDetails(prev => prev ? { ...prev, assignment: data.assignment || prev.assignment } : prev);
        // Reset refs to allow fresh fetch and refresh panel
        lastFetchedAssignmentId.current = null;
        isFetchingAssignmentStatus.current = false;
        fetchAssignmentStatus(leadIdForAssignment);
        // Optionally refresh audit logs if needed later by callers
        return true;
      }
      return false;
    } catch (e) {
      console.warn('🤖 Auto-assign encountered an error:', e);
      return false;
    }
  };

  // Handle stage update
  const handleStageUpdate = async () => {
    if (!selectedStage) {
      alert('❌ Please select a stage to update to.');
      return;
    }

    // Use the proper lead ID for pipeline update
    const leadIdForUpdate = actualLeadId || leadId;

    if (!leadIdForUpdate) {
      alert('❌ No valid lead ID found. Please refresh the page and try again.');
      return;
    }

    // Note: Pipeline update no longer requires an assigned agent

    console.log(`🔄 Updating stage for lead: ${leadIdForUpdate} to stage: ${selectedStage}`);
    console.log(`📡 API Endpoint: ${API_BASE}/pipeline`);
    console.log(`📦 Request Body:`, {
      lead_id: leadIdForUpdate,
      stage: selectedStage
    });

    try {
      const requestBody = {
        lead_id: leadIdForUpdate,
        stage: selectedStage
      };

      console.log('📤 Sending request to:', `${API_BASE}/pipeline`);
      console.log('📤 Request body:', requestBody);
      console.log('📤 Headers:', {
        ...getAuthHeaders(),
        'Content-Type': 'application/json'
      });

      const response = await fetch(`${API_BASE}/pipeline`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Stage update successful:', data);
        setCurrentStage(selectedStage);
        setLeadDetails(prev => prev ? {
          ...prev,
          stage: selectedStage,
          status: selectedStage  // Update status to match pipeline stage for crm-leads table
        } : null);
        setShowStageModal(false);
        setSelectedStage('');
        alert(`✅ Lead moved to ${selectedStage} stage successfully!`);

        // Refresh audit logs to show the stage update
        if (activeTab === 'audit') {
          setTimeout(() => {
            fetchAuditLogs();
          }, 1000);
        }
      } else {
        // Try to extract the most useful error information possible
        interface ErrorBody {
          error?: string;
          message?: string;
          [key: string]: unknown;
        }
        let errorBody: ErrorBody | null = null;
        let errorText: string | null = null;
        try {
          errorBody = await response.json();
        } catch {
          try {
            errorText = await response.text();
          } catch {
            errorText = null;
          }
        }

        const extractedMessage = (errorBody && (errorBody.message || errorBody.error || errorBody.detail))
          || (errorText && errorText.trim())
          || `HTTP ${response.status}: ${response.statusText}`;

        // Log a fully materialized string to avoid empty-object logging in certain consoles/overlays
        const logPayload = {
          status: response.status,
          statusText: response.statusText,
          leadId: leadIdForUpdate,
          stage: selectedStage,
          errorMessage: extractedMessage,
          errorBody,
          errorText
        };
        let logString = '';
        try {
          logString = JSON.stringify(logPayload, null, 2);
        } catch {
          logString = String(extractedMessage);
        }
        console.error('❌ Stage update failed:', extractedMessage, '\nDetails:', logString);

        // Handle specific error cases
        // Do not enforce assignment requirement for pipeline updates
        if (String(extractedMessage).toLowerCase().includes('not found')) {
          throw new Error('Lead not found. Please refresh the page and try again.');
        }

        throw new Error(`Failed to update stage: ${extractedMessage}`);
      }
    } catch (error) {
      // Ensure meaningful logging even if a non-Error is thrown
      interface ErrorWithMessage {
        message?: string;
      }
      const fallbackMessage = (error && typeof error === 'object' && 'message' in error)
        ? (error as ErrorWithMessage).message
        : String(error || 'Unknown error occurred');
      let caughtString = '';
      try {
        caughtString = JSON.stringify({ message: fallbackMessage, error }, null, 2);
      } catch {
        caughtString = String(fallbackMessage);
      }
      console.error('❌ Stage update failed (caught):', fallbackMessage, '\nDetails:', caughtString);
      alert(`❌ Failed to update stage: ${fallbackMessage}\n\nPlease check:\n- Lead ID is valid\n- Backend service is running\n- Network connection is stable`);
    }
  };

  // Handle re-enrichment
  const handleReenrich = async () => {
    if (!leadDetails) return;

    const leadIdForReenrich = actualLeadId || leadId;
    if (!leadIdForReenrich) return;

    setIsReenriching(true);
    try {
      console.log(`🔄 Starting re-enrichment for lead: ${leadIdForReenrich}`);

      const response = await fetch(`${API_BASE}/${leadIdForReenrich}/reenrich`, {
        method: 'POST',
        headers: getAuthHeaders()
      });

      if (response.ok) {
        const result = await response.json();
        console.log('🔄 Re-enrichment result:', result);

        // Show detailed success message
        const enrichmentStatus = result.enrichment_success ? '✅ Success' : '❌ Failed';
        const scoringStatus = result.scoring_success ? '✅ Success' : '❌ Failed';

        alert(`🎉 Lead re-enriched successfully!\n\n📊 Enrichment: ${enrichmentStatus}\n🎯 Scoring: ${scoringStatus}\n\n🔄 Refreshing data...`);

        // Refresh the page to show updated data
        setTimeout(() => {
          window.location.reload();
        }, 1000);

        // Refresh audit logs to show the re-enrichment activity
        if (activeTab === 'audit') {
          setTimeout(() => {
            fetchAuditLogs();
          }, 2000);
        }
      } else {
        const error = await response.json();
        console.error('❌ Re-enrichment failed:', error);
        alert(`❌ Re-enrichment failed: ${error.detail || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('❌ Re-enrichment error:', error);
      alert('❌ Re-enrichment failed. Please try again.');
    } finally {
      setIsReenriching(false);
    }
  };


  // Pipeline stages configuration
  const pipelineStages = [
    { value: 'Contacted', label: 'Contacted', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'Qualified', label: 'Qualified', color: 'bg-orange-100 text-orange-800' },
    { value: 'Proposal Sent', label: 'Proposal Sent', color: 'bg-pink-100 text-pink-800' },
    { value: 'Closed Won', label: 'Closed Won', color: 'bg-green-100 text-green-800' },
    { value: 'Closed Lost', label: 'Closed Lost', color: 'bg-red-100 text-red-800' }
  ];

  // Fetch appointments
  const fetchAppointments = async () => {
    try {
      const appointmentRes = await fetch(`${API_BASE}/${leadId}/appointment`, {
        headers: getAuthHeaders()
      });
      if (appointmentRes.ok) {
        const appointmentData = await appointmentRes.json();
        setAppointments(appointmentData.appointments || []);
      }
    } catch (appointmentError) {
      console.warn('Failed to fetch appointments:', appointmentError);
      setAppointments([]);
    }
  };

  // Fetch session analytics - prefer lead_sessions collection via unified-session-analytics
  // Helper function to check if session data is meaningful (created through bot/session tracking)
  interface SessionObject {
    session_id?: string;
    sessionId?: string;
    [key: string]: unknown;
  }
  const hasValidSessionData = (sessionObj: SessionObject | null | undefined): boolean => {
    if (!sessionObj) return false;

    // CRITICAL: More lenient validation - if session data exists and has a session ID, it's valid
    // This ensures leads created through bot widget are recognized even if some fields are missing
    const hasValidSessionId = !!(sessionObj.session_id || sessionObj.sessionId);

    // If we have a session ID, the session is valid (data was tracked)
    if (hasValidSessionId) {
      return true;
    }

    // Fallback: Check for other indicators of valid session data
    // Check if there's actual meaningful session data
    const totalTime = typeof sessionObj.total_time_on_site === 'number' ? sessionObj.total_time_on_site :
      typeof sessionObj.totalTimeOnSite === 'number' ? sessionObj.totalTimeOnSite : 0;
    const pageViews = sessionObj.page_views || sessionObj.pageViews || [];
    const interactions = sessionObj.interactions || [];
    const visitorId = sessionObj.visitor_id || sessionObj.visitorId;
    const startTime = sessionObj.start_time || sessionObj.startTime;

    // Check if session has meaningful activity
    const hasValidTime = typeof totalTime === 'number' && totalTime > 0;
    const hasPageViews = Array.isArray(pageViews) ? pageViews.length > 0 : (typeof pageViews === 'number' ? pageViews > 0 : false);
    const hasInteractions = Array.isArray(interactions) ? interactions.length > 0 : false;
    const hasVisitorId = !!visitorId;
    const hasStartTime = !!startTime;

    // Session is valid if it has:
    // - A visitor ID AND start time (basic session tracking), OR
    // - Any meaningful activity (time, page views, or interactions)
    return !!(hasVisitorId && hasStartTime) || hasValidTime || hasPageViews || hasInteractions;
  };

  const fetchSessionAnalytics = async () => {
    const leadIdForSessions = actualLeadId || leadId;
    if (!leadIdForSessions) return;

    setSessionAnalyticsLoading(true);
    setSessionAnalyticsError(null);

    const headers = getAuthHeaders();
    try {
      // 1) Try unified-session-analytics debug endpoint to read directly from lead_sessions
      try {
        const unifiedDebugRes = await fetch(`${BACKEND_URL}/api/v1/unified-session-analytics/debug/raw-data/${leadIdForSessions}`, { headers });
        if (unifiedDebugRes.ok) {
          const debugData = await unifiedDebugRes.json();
          const leadSessionsDoc = debugData?.lead_sessions_doc;
          const unifiedSession = debugData?.unified_session;
          const sessionFromLeadSessions = debugData?.session_from_lead_sessions;

          // Try to get session data from multiple sources
          let sessionObj = null;

          // Priority 1: session_from_lead_sessions (extracted session data)
          if (sessionFromLeadSessions) {
            sessionObj = sessionFromLeadSessions;
          }
          // Priority 2: unified_session (direct from unified_sessions collection)
          else if (unifiedSession) {
            sessionObj = unifiedSession;
          }
          // Priority 3: session_data from lead_sessions_doc
          else if (leadSessionsDoc?.session_data) {
            sessionObj = leadSessionsDoc.session_data;
          }
          // Priority 4: session from lead_sessions_doc (legacy)
          else if (leadSessionsDoc?.session) {
            sessionObj = leadSessionsDoc.session;
          }

          // Check if no session document exists at all
          if (!sessionObj) {
            console.log('No session document found in debug endpoint - lead was not created through bot');
            setSessionAnalyticsData(null);
            setSessionAnalyticsError(null); // No error, just no data
            setSessionAnalyticsLoading(false);
            return;
          }

          if (sessionObj) {
            // Debug logging
            console.log('🔍 Checking session data validity:', {
              hasSessionId: !!(sessionObj.session_id || sessionObj.sessionId),
              hasVisitorId: !!(sessionObj.visitor_id || sessionObj.visitorId),
              hasStartTime: !!(sessionObj.start_time || sessionObj.startTime),
              totalTime: sessionObj.total_time_on_site || sessionObj.totalTimeOnSite || 0,
              pageViews: sessionObj.page_views || sessionObj.pageViews || [],
              interactions: sessionObj.interactions || [],
              isValid: hasValidSessionData(sessionObj),
              sessionObjKeys: Object.keys(sessionObj)
            });

            // CRITICAL: Only process if session has meaningful data (created through bot)
            if (!hasValidSessionData(sessionObj)) {
              console.warn('⚠ No valid session data found - session object:', sessionObj);
              console.warn('⚠ Session validation failed - lead was not created through bot or session data is incomplete');
              setSessionAnalyticsData(null);
              setSessionAnalyticsError(null); // No error, just no data
              setSessionAnalyticsLoading(false);
              return;
            }

            console.log('✅ Session data is valid, processing...');

            // CRITICAL: Extract all session data including chatbot events
            const pageViews = sessionObj.page_views || sessionObj.pageViews || sessionObj.detailedPageViews || sessionObj.detailed_page_views || [];
            const interactions = sessionObj.interactions || sessionObj.detailedInteractions || sessionObj.detailed_interactions || [];
            const chatbotEvents = sessionObj.chatbotEvents || sessionObj.chatbot_events || sessionObj.detailedChatbotEvents || sessionObj.detailed_chatbot_events || [];
            const totalTime = sessionObj.total_time_on_site || sessionObj.totalTimeOnSite || 0;

            // Combine interactions and chatbot events for total interaction count
            const allInteractions = [
              ...(Array.isArray(interactions) ? interactions : []),
              ...(Array.isArray(chatbotEvents) ? chatbotEvents : [])
            ];

            // Calculate chatbot interactions count
            const chatbotInteractionsCount = Array.isArray(chatbotEvents) ? chatbotEvents.length : 0;

            const mapped = {
              leadId: leadIdForSessions,
              leadName: leadDetails?.name || '',
              leadEmail: leadDetails?.email || '',
              hasSessionData: true,
              sessionData: {
                sessionId: sessionObj.session_id || sessionObj.sessionId || 'N/A',
                startTime: sessionObj.start_time || sessionObj.startTime || leadSessionsDoc.timestamp || leadSessionsDoc.created_at || '',
                lastActivity: sessionObj.last_activity || sessionObj.lastActivity || '',
                totalTimeOnSite: totalTime,
                currentPage: sessionObj.current_page || sessionObj.currentPage || '',
                interactionCount: allInteractions.length,
                chatbotInteractions: chatbotInteractionsCount,
                formSubmitted: Array.isArray(interactions) ? interactions.some((i: Interaction) => i?.type === 'form_submission') : false,
                satisfaction: totalTime > 30000 ? 'good' as const : 'bad' as const,
                userAgent: sessionObj.user_agent || sessionObj.userAgent || '',
                screenResolution: sessionObj.screen_resolution || sessionObj.screenResolution || '',
                deviceType: sessionObj.device_type || sessionObj.deviceType || '',
                language: sessionObj.language || '',
                timezone: sessionObj.timezone || '',
                referrer: sessionObj.referrer || '',
                website: sessionObj.website || '',
                pageViews: Array.isArray(pageViews) ? pageViews : (typeof pageViews === 'number' ? pageViews : 0),
                interactions: allInteractions,
                chatbotEvents: Array.isArray(chatbotEvents) ? chatbotEvents : []
              },
              sessionInsights: leadSessionsDoc.session_insights || {},
              sessionScore: leadSessionsDoc.session_score || 0,
              timestamp: leadSessionsDoc.created_at || new Date().toISOString()
            };
            setSessionAnalyticsData(mapped);
            return;
          }
        }
      } catch (e) {
        console.warn('Unified debug fetch failed, falling back:', e);
      }

      // 2) Try unified-session-analytics proper sessions-by-lead as fallback
      try {
        const unifiedRes = await fetch(`${BACKEND_URL}/api/v1/unified-session-analytics/sessions/by-lead/${leadIdForSessions}`, { headers });
        if (unifiedRes.ok) {
          const unifiedJson = await unifiedRes.json();
          const arr = unifiedJson?.data || [];

          // Check if backend returned empty array (no sessions found)
          if (arr.length === 0) {
            console.log('Backend returned empty sessions array - lead was not created through bot');
            setSessionAnalyticsData(null);
            setSessionAnalyticsError(null); // No error, just no data
            setSessionAnalyticsLoading(false);
            return;
          }

          if (arr.length > 0) {
            const s = arr[0];

            // CRITICAL: Only process if session has meaningful data (created through bot)
            if (!hasValidSessionData(s)) {
              console.log('No valid session data found - lead was not created through bot');
              setSessionAnalyticsData(null);
              setSessionAnalyticsError(null); // No error, just no data
              setSessionAnalyticsLoading(false);
              return;
            }

            // CRITICAL: Extract all session data including chatbot events
            const pageViews = s.page_views || s.pageViews || s.detailedPageViews || s.detailed_page_views || [];
            const interactions = s.interactions || s.detailedInteractions || s.detailed_interactions || [];
            const chatbotEvents = s.chatbotEvents || s.chatbot_events || s.detailedChatbotEvents || s.detailed_chatbot_events || [];
            const totalTime = s.total_time_on_site || s.totalTimeOnSite || 0;

            // Combine interactions and chatbot events for total interaction count
            const allInteractions = [
              ...(Array.isArray(interactions) ? interactions : []),
              ...(Array.isArray(chatbotEvents) ? chatbotEvents : [])
            ];

            // Calculate chatbot interactions count
            const chatbotInteractionsCount = Array.isArray(chatbotEvents) ? chatbotEvents.length : 0;

            const mapped = {
              leadId: leadIdForSessions,
              leadName: leadDetails?.name || '',
              leadEmail: leadDetails?.email || '',
              hasSessionData: true,
              sessionData: {
                sessionId: s.session_id || s.sessionId || 'N/A',
                startTime: s.start_time || s.startTime || s.timestamp || '',
                lastActivity: s.last_activity || s.lastActivity || s.end_time || '',
                totalTimeOnSite: totalTime,
                currentPage: s.current_page || s.currentPage || s.current_url || '',
                interactionCount: allInteractions.length,
                chatbotInteractions: chatbotInteractionsCount,
                formSubmitted: Array.isArray(interactions) ? interactions.some((i: Interaction) => i?.type === 'form_submission') : false,
                satisfaction: totalTime > 30000 ? 'good' as const : 'bad' as const,
                userAgent: s.user_agent || s.userAgent || '',
                screenResolution: s.screen_resolution || s.screenResolution || '',
                deviceType: s.device_type || s.deviceType || '',
                language: s.language || '',
                timezone: s.timezone || '',
                referrer: s.referrer || '',
                website: s.website || '',
                pageViews: Array.isArray(pageViews) ? pageViews : (typeof pageViews === 'number' ? pageViews : 0),
                interactions: allInteractions,
                chatbotEvents: Array.isArray(chatbotEvents) ? chatbotEvents : []
              },
              sessionInsights: {},
              sessionScore: 0,
              timestamp: s.start_time || s.startTime || new Date().toISOString()
            };
            setSessionAnalyticsData(mapped);
            return;
          }
        }
      } catch (e) {
        console.warn('Unified sessions-by-lead fetch failed, falling back:', e);
      }

      // 3) Try original leads-integration endpoint
      try {
        const response = await fetch(`${API_BASE}/session-analytics/lead/${leadIdForSessions}`, { headers });
        if (response.ok) {
          const data = await response.json();

          // Check if the response has meaningful session data
          if (data && data.sessionData && hasValidSessionData(data.sessionData)) {
            setSessionAnalyticsData(data);
            return;
          } else {
            // No meaningful session data
            console.log('Leads-integration endpoint returned no valid session data');
            setSessionAnalyticsData(null);
            setSessionAnalyticsError(null);
            setSessionAnalyticsLoading(false);
            return;
          }
        }
      } catch (e) {
        console.warn('Leads-integration session analytics fetch failed:', e);
      }

      // 4) Last resort: get full lead details and extract session block if present
      try {
        const detailsRes = await fetch(`${API_BASE}/${leadIdForSessions}`, { headers });
        if (detailsRes.ok) {
          const detailsJson = await detailsRes.json();
          const data = detailsJson?.data || {};
          const sessionObj = data?.session || data?.session_data;
          if (sessionObj) {
            // CRITICAL: Only process if session has meaningful data (created through bot)
            if (!hasValidSessionData(sessionObj)) {
              console.log('No valid session data found - lead was not created through bot');
              setSessionAnalyticsData(null);
              setSessionAnalyticsError(null); // No error, just no data
              setSessionAnalyticsLoading(false);
              return;
            }

            // CRITICAL: Extract all session data including chatbot events
            const pageViews = sessionObj.page_views || sessionObj.pageViews || sessionObj.detailedPageViews || sessionObj.detailed_page_views || [];
            const interactions = sessionObj.interactions || sessionObj.detailedInteractions || sessionObj.detailed_interactions || [];
            const chatbotEvents = sessionObj.chatbotEvents || sessionObj.chatbot_events || sessionObj.detailedChatbotEvents || sessionObj.detailed_chatbot_events || [];
            const totalTime = sessionObj.total_time_on_site || sessionObj.totalTimeOnSite || 0;

            // Combine interactions and chatbot events for total interaction count
            const allInteractions = [
              ...(Array.isArray(interactions) ? interactions : []),
              ...(Array.isArray(chatbotEvents) ? chatbotEvents : [])
            ];

            // Calculate chatbot interactions count
            const chatbotInteractionsCount = Array.isArray(chatbotEvents) ? chatbotEvents.length : 0;

            const mapped = {
              leadId: leadIdForSessions,
              leadName: data?.lead?.name || '',
              leadEmail: data?.lead?.email || '',
              hasSessionData: true,
              sessionData: {
                sessionId: sessionObj.session_id || sessionObj.sessionId || 'N/A',
                startTime: sessionObj.start_time || sessionObj.startTime || '',
                lastActivity: sessionObj.last_activity || sessionObj.lastActivity || '',
                totalTimeOnSite: totalTime,
                currentPage: sessionObj.current_page || sessionObj.currentPage || '',
                interactionCount: allInteractions.length,
                chatbotInteractions: chatbotInteractionsCount,
                formSubmitted: Array.isArray(interactions) ? interactions.some((i: Interaction) => i?.type === 'form_submission') : false,
                satisfaction: totalTime > 30000 ? 'good' as const : 'bad' as const,
                userAgent: sessionObj.user_agent || sessionObj.userAgent || '',
                screenResolution: sessionObj.screen_resolution || sessionObj.screenResolution || '',
                deviceType: sessionObj.device_type || sessionObj.deviceType || '',
                language: sessionObj.language || '',
                timezone: sessionObj.timezone || '',
                referrer: sessionObj.referrer || '',
                website: sessionObj.website || '',
                pageViews: Array.isArray(pageViews) ? pageViews : (typeof pageViews === 'number' ? pageViews : 0),
                interactions: allInteractions,
                chatbotEvents: Array.isArray(chatbotEvents) ? chatbotEvents : []
              },
              sessionInsights: data?.session_insights || {},
              sessionScore: data?.session_score || 0,
              timestamp: data?.timestamp || new Date().toISOString()
            };
            setSessionAnalyticsData(mapped);
            return;
          }
        }
      } catch (e) {
        console.warn('Lead details fetch failed:', e);
      }

      // If all attempts failed - no session data found
      // This is not an error, just means the lead doesn't have session data (wasn't created through bot)
      console.log('No session data found for this lead - it was likely not created through the bot');
      setSessionAnalyticsData(null);
      setSessionAnalyticsError(null); // No error, just no data available
    } catch (error) {
      console.error('Error fetching session analytics:', error);
      setSessionAnalyticsError(error instanceof Error ? error.message : 'Failed to load session analytics');
    } finally {
      setSessionAnalyticsLoading(false);
    }
  };

  // Fetch audit logs
  const fetchAuditLogs = async () => {
    if (!leadId) return;

    setAuditLogsLoading(true);
    setAuditLogsError(null);

    try {
      // Use the actual lead ID (LD-XXXX format) instead of MongoDB _id
      const auditLeadId = leadDetails?.id || leadDetails?._id || leadId;
      console.log(`🔍 Fetching audit logs for lead: ${auditLeadId}`);

      const response = await fetch(`${API_BASE}/${auditLeadId}/audit`, {
        headers: getAuthHeaders()
      });

      console.log(`📊 Audit logs response status: ${response.status}`);

      if (response.ok) {
        const data = await response.json();
        console.log(`📋 Audit logs data:`, data);
        console.log(`📝 Number of audit logs: ${data.audit_logs?.length || 0}`);
        setAuditLogs(data.audit_logs || []);
        setLastAuditRefresh(new Date());
      } else {
        throw new Error(`Failed to fetch audit logs: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      setAuditLogsError(error instanceof Error ? error.message : 'Failed to load audit logs');
    } finally {
      setAuditLogsLoading(false);
    }
  };

  // Handle appointment creation
  const handleCreateAppointment = async () => {
    if (!appointmentTitle || !appointmentStartTime) {
      alert('Please fill in all required fields (Title and Start Time)');
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/${leadId}/appointment`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          lead_id: actualLeadId,
          title: appointmentTitle,
          description: appointmentDescription,
          start_time: appointmentStartTime,
          end_time: appointmentEndTime,
          timezone: appointmentTimezone,
          location: appointmentLocation,
          type: appointmentType,
          reminders: appointmentReminders,
          recurrence: appointmentRecurrence,
          google_meet: appointmentGoogleMeet,
          meeting_link: appointmentMeetingLink
        })
      });

      if (response.ok) {
        // const data = await response.json(); // Unused variable
        // Refresh appointments list to get the latest data
        await fetchAppointments();
        setShowAppointmentModal(false);
        // Reset form
        setAppointmentTitle('');
        setAppointmentDescription('');
        setAppointmentStartTime('');
        setAppointmentEndTime('');
        setAppointmentLocation('');
        setAppointmentTimezone('UTC');
        setAppointmentType('meeting');
        setAppointmentReminders(['5 minutes before', '30 minutes before']);
        setAppointmentRecurrence('none');
        setAppointmentGoogleMeet(true);
        setAppointmentMeetingLink('');
        alert('Appointment created successfully!');
      } else {
        throw new Error('Failed to create appointment');
      }
    } catch (error) {
      console.error('Appointment creation failed:', error);
      alert('Failed to create appointment. Please try again.');
    }
  };

  // Handle appointment cancellation
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleCancelAppointment = async (appointmentId: string) => {
    if (!confirm('Are you sure you want to cancel this appointment?')) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/appointments/${appointmentId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (response.ok) {
        await fetchAppointments();
        alert('Appointment cancelled successfully!');
      } else {
        throw new Error('Failed to cancel appointment');
      }
    } catch (error) {
      console.error('Appointment cancellation failed:', error);
      alert('Failed to cancel appointment. Please try again.');
    }
  };

  // Handle appointment rescheduling
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleRescheduleAppointment = async (appointmentId: string, newStartTime: string) => {
    try {
      const response = await fetch(`${API_BASE}/appointments/${appointmentId}`, {
        method: 'PUT',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          new_start_time: newStartTime
        })
      });

      if (response.ok) {
        await fetchAppointments();
        alert('Appointment rescheduled successfully!');
      } else {
        throw new Error('Failed to reschedule appointment');
      }
    } catch (error) {
      console.error('Appointment rescheduling failed:', error);
      alert('Failed to reschedule appointment. Please try again.');
    }
  };

  if (loading) {
    return <Loader />;
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-red-400" />
          <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-white">Error loading lead</h3>
          <p className="mt-1 text-gray-500 dark:text-gray-400">{error}</p>

          {error.includes('Backend server is not running') && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg text-left">
              <h4 className="text-lg font-semibold text-blue-800 mb-2">Backend Server Not Running</h4>
              <p className="text-blue-700 mb-3">
                To view lead details, please start the backend server:
              </p>
              <div className="bg-gray-100 p-3 rounded font-mono text-sm">
                <div>cd L_S_A_backend/leads-sales-automation-converiqoai-10000019-python</div>
                <div>python main.py</div>
              </div>
              <p className="text-blue-700 mt-3 text-sm">
                Once the backend is running, refresh this page to load the lead details.
              </p>
            </div>
          )}

          <button
            onClick={() => router.back()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!leadDetails) {
    return (
      <div className="p-6">
        <div className="text-center">
          <Users className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-white">Currently no data available</h3>
          <p className="mt-1 text-gray-500 dark:text-gray-400">Unable to load lead details at this time. Please try again later.</p>
          <button
            onClick={() => router.back()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 overflow-y-hidden">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-600">
        <div className="px-4 sm:px-6 lg:px-8 py-6">
          {/* Back Button */}
          <div className="mb-4">
            <button
              onClick={() => router.back()}
              className="group inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium">Back to Leads</span>
            </button>
          </div>
          {/* Page Header */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center shadow">
                <Users className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl lg:text-4xl font-bold text-gray-900">{leadDetails.name}</h1>
                <p className="text-sm text-gray-600 mt-1">
                  Lead ID: <span className="font-mono font-semibold text-blue-600">{actualLeadId || leadDetails.id || leadDetails._id || 'N/A'}</span>
                </p>
                <p className="text-gray-600 mt-2">Comprehensive lead information, scoring, and analytics dashboard</p>
              </div>
            </div>
            {/* Status */}
            <div className="flex items-center gap-3">
              <div className={`px-4 py-2 rounded-full text-sm font-semibold ${leadDetails.status === 'active'
                ? 'bg-green-100 text-green-800'
                : leadDetails.status === 'qualified'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-gray-100 text-gray-800'
                }`}>
                {leadDetails.status?.charAt(0).toUpperCase() + leadDetails.status?.slice(1) || 'Unknown'}
              </div>
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10 px-4 sm:px-6 lg:px-8 mt-6 lg:mt-8 pb-8 space-y-6 lg:space-y-8">

        {/* Enhanced Processing Status */}
        {processingStatus && (
          <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl shadow-xl shadow-blue-500/5 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                <Activity className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Processing Status</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className={`group p-4 rounded-xl border-2 transition-all duration-300 hover:scale-105 ${processingStatus.enriched
                ? 'bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800'
                : 'bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 border-red-200 dark:border-red-800'
                }`}>
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${processingStatus.enriched ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'
                    }`}>
                    {processingStatus.enriched ? (
                      <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                    ) : (
                      <Clock className="w-4 h-4 text-red-600 dark:text-red-400" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">Enrichment</p>
                    <p className={`text-sm font-medium ${processingStatus.enriched ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                      }`}>
                      {processingStatus.enriched ? 'Completed' : 'Pending'}
                    </p>
                  </div>
                </div>
              </div>

              <div className={`group p-4 rounded-xl border-2 transition-all duration-300 hover:scale-105 ${processingStatus.scored
                ? 'bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800'
                : 'bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 border-red-200 dark:border-red-800'
                }`}>
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${processingStatus.scored ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'
                    }`}>
                    {processingStatus.scored ? (
                      <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                    ) : (
                      <Clock className="w-4 h-4 text-red-600 dark:text-red-400" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">Scoring</p>
                    <p className={`text-sm font-medium ${processingStatus.scored ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                      }`}>
                      {processingStatus.scored ? 'Completed' : 'Pending'}
                    </p>
                  </div>
                </div>
              </div>

              <div className={`group p-4 rounded-xl border-2 transition-all duration-300 hover:scale-105 ${processingStatus.assigned
                ? 'bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800'
                : 'bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 border-red-200 dark:border-red-800'
                }`}>
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${processingStatus.assigned ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'
                    }`}>
                    {processingStatus.assigned ? (
                      <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                    ) : (
                      <Clock className="w-4 h-4 text-red-600 dark:text-red-400" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">Assignment</p>
                    <p className={`text-sm font-medium ${processingStatus.assigned ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                      }`}>
                      {processingStatus.assigned ? 'Completed' : 'Pending'}
                    </p>
                  </div>
                </div>
              </div>

              <div className={`group p-4 rounded-xl border-2 transition-all duration-300 hover:scale-105 ${processingStatus.in_pipeline
                ? 'bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800'
                : 'bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 border-red-200 dark:border-red-800'
                }`}>
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${processingStatus.in_pipeline ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'
                    }`}>
                    {processingStatus.in_pipeline ? (
                      <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                    ) : (
                      <Clock className="w-4 h-4 text-red-600 dark:text-red-400" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">Pipeline</p>
                    <p className={`text-sm font-medium ${processingStatus.in_pipeline ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                      }`}>
                      {processingStatus.in_pipeline ?
                        (currentStage === 'Closed Won' ? 'Completed' : currentStage) :
                        'Pending'
                      }
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Lead Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          {/* Lead Score Card */}
          <div className="group bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl shadow-sm dark:shadow-lg p-4 sm:p-6 transition-transform duration-200 hover:scale-105 hover:shadow-md dark:hover:shadow-xl">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300 flex-shrink-0 mt-4">
                <Target className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Lead Score</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {(() => {
                    const score = leadDetails.lead_score || leadScore?.total_score;
                    return score !== null && score !== undefined ? Number(score).toFixed(2) : 'N/A';
                  })()}
                </p>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-1000"
                    style={{ width: `${Math.min((leadDetails.lead_score || leadScore?.total_score || 0) * 2, 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* Status Card */}
          <div className="group bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl shadow-sm dark:shadow-lg p-4 sm:p-6 transition-transform duration-200 hover:scale-105 hover:shadow-md dark:hover:shadow-xl">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300 flex-shrink-0 mt-4">
                <CheckCircle className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Status</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white capitalize">
                  {leadDetails.status}
                </p>
                <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium mt-2 ${leadDetails.status === 'active'
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                  : leadDetails.status === 'qualified'
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
                  }`}>
                  <div className="w-1.5 h-1.5 bg-current rounded-full animate-pulse"></div>
                  {(() => {
                    // Check if lead is assigned
                    const isAssigned = !!(
                      leadDetails.assignment?.assigned_to ||
                      leadDetails.assignment_results?.assigned_agent ||
                      leadDetails.assigned_to_name ||
                      leadDetails.assigned_to
                    );

                    if (isAssigned) {
                      // Get the assigned agent name
                      const assignedToName = (leadDetails.assignment?.assigned_to_name ||
                        leadDetails.assignment_results?.assigned_agent?.name ||
                        leadDetails.assigned_to_name) as string | undefined;

                      if (assignedToName && typeof assignedToName === 'string' && assignedToName !== 'Unknown Agent') {
                        return assignedToName;
                      }

                      // Try to find the agent name from available agents
                      const assignedToId = leadDetails.assignment?.assigned_to ||
                        leadDetails.assignment_results?.assigned_agent?.agent_id ||
                        leadDetails.assigned_to;

                      if (assignedToId && availableAgents.length > 0) {
                        const agent = availableAgents.find(a => a.id === assignedToId || a.agent_id === assignedToId);
                        if (agent && agent.name && typeof agent.name === 'string') {
                          return agent.name;
                        }
                      }

                      return 'Assigned';
                    }

                    // Default status logic
                    return leadDetails.status === 'active' ? 'Active' : leadDetails.status === 'qualified' ? 'Qualified' : 'Unknown';
                  })() as string}
                </div>
              </div>
            </div>
          </div>

          {/* Company Card */}
          <div className="group bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl shadow-sm dark:shadow-lg p-6 transition-transform duration-200 hover:scale-105 hover:shadow-md dark:hover:shadow-xl overflow-hidden">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300 flex-shrink-0 mt-4">
                <Building className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Company</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white max-w-full break-words whitespace-normal leading-tight">
                  {leadDetails.company_name || 'Unknown'}
                </p>
                {leadDetails.company_industry && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-full break-words whitespace-normal">
                    {leadDetails.company_industry}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Created Date Card */}
          <div className="group bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl shadow-sm dark:shadow-lg p-4 sm:p-6 transition-transform duration-200 hover:scale-105 hover:shadow-md dark:hover:shadow-xl">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300 flex-shrink-0 mt-4">
                <Calendar className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Created</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  {new Date(leadDetails.created_at).toLocaleDateString()}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {new Date(leadDetails.created_at).toLocaleTimeString()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Tab Navigation */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl shadow-sm dark:shadow-lg overflow-hidden">
          <div className="relative">
            <nav className="flex gap-0 overflow-x-auto px-4 scrollbar-hide lg:grid lg:grid-cols-6 lg:gap-0">
              {[
                { id: 'overview', label: 'Overview', icon: Users, color: 'blue' },
                { id: 'enrichment', label: 'Enrichment', icon: Brain, color: 'purple' },
                { id: 'scoring', label: 'Scoring', icon: Target, color: 'green' },
                { id: 'session', label: 'Session Analytics', icon: Activity, color: 'orange' },
                { id: 'assignment', label: 'Assignment', icon: UserCheck, color: 'indigo' },
                { id: 'thread', label: 'Thread', icon: MessageCircle, color: 'teal' }
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setActiveTab(tab.id);
                    }}
                    className={`group relative flex flex-col items-center justify-center gap-1 py-4 px-3 font-semibold text-xs transition-all duration-300 whitespace-nowrap rounded-xl border flex-shrink-0 min-w-[120px] lg:min-w-0 lg:w-full m-2 ${isActive
                      ? `text-${tab.color}-600 dark:text-${tab.color}-400 border-${tab.color}-200 dark:border-${tab.color}-900/40 bg-${tab.color}-50/40 dark:bg-${tab.color}-900/10 shadow-sm`
                      : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 border-transparent hover:border-gray-200 dark:hover:border-gray-700'
                      }`}
                  >
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all duration-300 ${isActive
                      ? `bg-${tab.color}-100 dark:bg-${tab.color}-900/30 shadow-lg shadow-${tab.color}-500/25`
                      : 'bg-gray-100 dark:bg-gray-700 group-hover:bg-gray-200 dark:group-hover:bg-gray-600'
                      }`}>
                      <Icon className={`w-3.5 h-3.5 transition-transform duration-200 ${isActive ? `text-${tab.color}-600 dark:text-${tab.color}-400` : 'text-gray-500 dark:text-gray-400'
                        } ${isActive ? 'scale-110' : 'group-hover:scale-110 group-hover:-translate-y-0.5'}`} />
                    </div>
                    <span className={`transition-all duration-300 text-center leading-tight ${isActive ? 'font-bold' : 'font-medium'}`}>
                      {tab.label}
                    </span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        <div className="p-4 sm:p-6 lg:p-8">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-8 animate-in fade-in-50 duration-500">
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-8">
                {/* Enhanced Basic Information */}
                <div className="group bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl shadow-sm dark:shadow-lg p-4 sm:p-6 transition-transform duration-200 hover:scale-105 hover:shadow-md dark:hover:shadow-xl">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                      <Users className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">Basic Information</h3>
                  </div>
                  <div className="space-y-6">
                    <div className="group flex items-center gap-4 p-4 rounded-xl bg-gray-50/50 dark:bg-gray-700/30 hover:bg-gray-100/50 dark:hover:bg-gray-700/50 transition-all duration-200">
                      <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                        <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Name</p>
                        <p className="font-semibold text-gray-900 dark:text-white break-words">{leadDetails.name}</p>
                      </div>
                    </div>

                    <div className="group flex items-center gap-4 p-4 rounded-xl bg-gray-50/50 dark:bg-gray-700/30 hover:bg-gray-100/50 dark:hover:bg-gray-700/50 transition-all duration-200">
                      <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                        <Mail className="w-5 h-5 text-green-600 dark:text-green-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Email</p>
                        <p className="font-semibold text-gray-900 dark:text-white break-all">{leadDetails.email}</p>
                      </div>
                    </div>

                    <div className="group flex items-center gap-4 p-4 rounded-xl bg-gray-50/50 dark:bg-gray-700/30 hover:bg-gray-100/50 dark:hover:bg-gray-700/50 transition-all duration-200">
                      <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                        <Phone className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Phone</p>
                        <p className="font-semibold text-gray-900 dark:text-white break-words">{leadDetails.phone}</p>
                      </div>
                    </div>

                    <div className="group flex items-center gap-4 p-4 rounded-xl bg-gray-50/50 dark:bg-gray-700/30 hover:bg-gray-100/50 dark:hover:bg-gray-700/50 transition-all duration-200">
                      <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                        <ExternalLink className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Source</p>
                        <p className="font-semibold text-gray-900 dark:text-white capitalize break-words">{leadDetails.source}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Enhanced Company Information */}
                <div className="group bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl shadow-sm dark:shadow-lg p-4 sm:p-6 transition-transform duration-200 hover:scale-105 hover:shadow-md dark:hover:shadow-xl">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                      <Building className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">Company Information</h3>
                  </div>
                  <div className="space-y-6">
                    <div className="group flex items-center gap-4 p-4 rounded-xl bg-gray-50/50 dark:bg-gray-700/30 hover:bg-gray-100/50 dark:hover:bg-gray-700/50 transition-all duration-200">
                      <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                        <Building className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Company</p>
                        <p className="font-semibold text-gray-900 dark:text-white break-words">{leadDetails.company_name || 'Not available'}</p>
                      </div>
                    </div>

                    <div className="group flex items-center gap-4 p-4 rounded-xl bg-gray-50/50 dark:bg-gray-700/30 hover:bg-gray-100/50 dark:hover:bg-gray-700/50 transition-all duration-200">
                      <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                        <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Job Title</p>
                        <p className="font-semibold text-gray-900 dark:text-white break-words">{leadDetails.job_title || 'Not available'}</p>
                      </div>
                    </div>

                    <div className="group flex items-center gap-4 p-4 rounded-xl bg-gray-50/50 dark:bg-gray-700/30 hover:bg-gray-100/50 dark:hover:bg-gray-700/50 transition-all duration-200">
                      <div className="w-10 h-10 bg-teal-100 dark:bg-teal-900/30 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                        <MapPin className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Location</p>
                        <p className="font-semibold text-gray-900 dark:text-white break-words">{leadDetails.location || 'Not available'}</p>
                      </div>
                    </div>

                    <div className="group flex items-center gap-4 p-4 rounded-xl bg-gray-50/50 dark:bg-gray-700/30 hover:bg-gray-100/50 dark:hover:bg-gray-700/50 transition-all duration-200">
                      <div className="w-10 h-10 bg-pink-100 dark:bg-pink-900/30 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                        <Building className="w-5 h-5 text-pink-600 dark:text-pink-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Industry</p>
                        <p className="font-semibold text-gray-900 dark:text-white break-words">{leadDetails.industry || 'Not available'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Enhanced Lead Message */}
              {(leadDetails.message || leadDetails.interest) && (
                <div className="group bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl shadow-sm dark:shadow-lg p-4 sm:p-6 transition-transform duration-200 hover:scale-105 hover:shadow-md dark:hover:shadow-xl">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                      <MessageCircle className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">Lead Information</h3>
                  </div>
                  <div className="space-y-6">
                    {leadDetails.interest && (
                      <div className="p-4 rounded-xl bg-green-50/50 dark:bg-green-900/20 border border-green-200/50 dark:border-green-800/50">
                        <div className="flex items-center gap-3 mb-3">
                          <Lightbulb className="w-5 h-5 text-green-600 dark:text-green-400" />
                          <p className="text-sm font-semibold text-green-800 dark:text-green-300">Interest</p>
                        </div>
                        <p className="text-gray-900 dark:text-white leading-relaxed break-words">{leadDetails.interest}</p>
                      </div>
                    )}
                    {leadDetails.message && (
                      <div className="p-4 rounded-xl bg-blue-50/50 dark:bg-blue-900/20 border border-blue-200/50 dark:border-blue-800/50">
                        <div className="flex items-center gap-3 mb-3">
                          <MessageCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                          <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">Message</p>
                        </div>
                        <p className="text-gray-900 dark:text-white leading-relaxed break-words">{leadDetails.message}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Enrichment Tab */}
          {activeTab === 'enrichment' && (
            <div className="space-y-4 sm:space-y-6">
              <ComponentCard title="Enrichment Data">
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                    <h3 className="text-lg font-semibold">Enrichment Data</h3>
                    <button
                      onClick={handleReenrich}
                      disabled={isReenriching}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md hover:shadow-lg hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 w-full sm:w-auto"
                    >
                      {isReenriching ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Re-enriching...
                        </>
                      ) : (
                        <>
                          <Activity className="h-4 w-4" />
                          Re-enrich Lead
                        </>
                      )}
                    </button>
                  </div>

                  {(leadDetails.enrichment_data || leadDetails.company_name || leadDetails.ai_description || leadDetails.person_first_name || leadDetails.person_job_title || leadDetails.person_company) ? (
                    <div className="space-y-5">
                      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-3 mb-2">
                        <p className="text-green-800 dark:text-green-200 text-sm font-medium">
                          ✅ Enrichment data available
                        </p>
                      </div>

                      {/* Company Information */}
                      {leadDetails.company_name && (
                        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl p-4 sm:p-6">
                          <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-4 sm:mb-5 flex items-center gap-3">
                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                              <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7l9-4 9 4-9 4-9-4zm0 8l9 4 9-4M3 7v8m18-8v8" /></svg>
                            </span>
                            Company Information
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                            <div>
                              <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Company Name</label>
                              <p className="text-gray-900 dark:text-white font-semibold leading-relaxed break-words">{leadDetails.company_name}</p>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Industry</label>
                              <p className="text-gray-900 dark:text-white leading-relaxed break-words">{leadDetails.company_industry || leadDetails.ai_industry}</p>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Website</label>
                              <p className="text-gray-900 dark:text-white break-all">
                                {leadDetails.company_website ? (
                                  <a href={leadDetails.company_website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors break-all">
                                    {leadDetails.company_website}
                                  </a>
                                ) : 'N/A'}
                              </p>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-gray-600 dark:text-gray-400">LinkedIn</label>
                              <p className="text-gray-900 dark:text-white break-all">
                                {leadDetails.company_linkedin ? (
                                  <a href={leadDetails.company_linkedin} target="_blank" rel="noopener noreferrer" className="inline-flex items-center px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors break-all">
                                    {leadDetails.company_linkedin}
                                  </a>
                                ) : 'N/A'}
                              </p>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Location</label>
                              <p className="text-gray-900 dark:text-white break-words">{leadDetails.company_location || leadDetails.ai_location}</p>
                            </div>
                            {/* Only show fields that have actual data */}
                            {leadDetails.company_founded && leadDetails.company_founded !== 'Unknown' && leadDetails.company_founded !== 'N/A' && (
                              <div>
                                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Founded</label>
                                <p className="text-gray-900 dark:text-white break-words">{leadDetails.company_founded || leadDetails.ai_founded}</p>
                              </div>
                            )}
                            {leadDetails.company_size && leadDetails.company_size !== 'Unknown' && leadDetails.company_size !== 'N/A' && (
                              <div>
                                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Size</label>
                                <p className="text-gray-900 dark:text-white break-words">{leadDetails.company_size}</p>
                              </div>
                            )}
                            {leadDetails.company_revenue && leadDetails.company_revenue !== 'Unknown' && leadDetails.company_revenue !== 'N/A' && (
                              <div>
                                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Revenue</label>
                                <p className="text-gray-900 dark:text-white break-words">{leadDetails.company_revenue}</p>
                              </div>
                            )}
                            {leadDetails.company_ceo && leadDetails.company_ceo !== 'Unknown' && leadDetails.company_ceo !== 'N/A' && (
                              <div>
                                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">CEO</label>
                                <p className="text-gray-900 dark:text-white break-words">{leadDetails.company_ceo}</p>
                              </div>
                            )}
                            {leadDetails.company_founder && leadDetails.company_founder !== 'Unknown' && leadDetails.company_founder !== 'N/A' && (
                              <div>
                                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Founder</label>
                                <p className="text-gray-900 dark:text-white break-words">{leadDetails.company_founder}</p>
                              </div>
                            )}
                            {leadDetails.company_employees && leadDetails.company_employees !== 'Unknown' && leadDetails.company_employees !== 'N/A' && (
                              <div>
                                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Employees</label>
                                <p className="text-gray-900 dark:text-white break-words">{leadDetails.company_employees}</p>
                              </div>
                            )}
                            {leadDetails.company_headquarters && leadDetails.company_headquarters !== 'Unknown' && leadDetails.company_headquarters !== 'N/A' && (
                              <div>
                                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Headquarters</label>
                                <p className="text-gray-900 dark:text-white break-words">{leadDetails.company_headquarters}</p>
                              </div>
                            )}
                          </div>

                          {/* Company Description */}
                          {(leadDetails.company_description || leadDetails.ai_description) && (
                            <div className="mt-4">
                              <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Description</label>
                              <p className="text-gray-900 dark:text-white mt-1 text-sm leading-relaxed">
                                {leadDetails.company_description || leadDetails.ai_description}
                              </p>
                            </div>
                          )}

                          {/* Technologies - Only show if data exists */}
                          {leadDetails.company_technologies && leadDetails.company_technologies.length > 0 && !leadDetails.company_technologies.includes('Unknown') && (
                            <div className="mt-4">
                              <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Technologies</label>
                              <div className="flex flex-wrap gap-2 mt-1">
                                {leadDetails.company_technologies.filter(tech => tech !== 'Unknown').map((tech: string) => (
                                  <span key={`tech-${tech}`} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full dark:bg-blue-900 dark:text-blue-200">
                                    {tech}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Services - Only show if data exists */}
                          {leadDetails.company_services && leadDetails.company_services.length > 0 && !leadDetails.company_services.includes('Unknown') && (
                            <div className="mt-4">
                              <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Services</label>
                              <div className="flex flex-wrap gap-2 mt-1">
                                {leadDetails.company_services.filter(service => service !== 'Unknown').map((service: string) => (
                                  <span key={`service-${service}`} className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full dark:bg-green-900 dark:text-green-200">
                                    {service}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Products - Only show if data exists */}
                          {leadDetails.company_products && leadDetails.company_products.length > 0 && !leadDetails.company_products.includes('Unknown') && (
                            <div className="mt-4">
                              <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Products</label>
                              <div className="flex flex-wrap gap-2 mt-1">
                                {leadDetails.company_products.filter(product => product !== 'Unknown').map((product: string) => (
                                  <span key={`product-${product}`} className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full dark:bg-purple-900 dark:text-purple-200">
                                    {product}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Products/Services (Legacy) */}
                          {leadDetails.ai_products && (
                            <div className="mt-4">
                              <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Products/Services (Legacy)</label>
                              <p className="text-gray-900 dark:text-white mt-1 text-sm leading-relaxed">
                                {leadDetails.ai_products}
                              </p>
                            </div>
                          )}

                          {/* Competitors - Only show if data exists */}
                          {leadDetails.company_competitors && leadDetails.company_competitors.length > 0 && !leadDetails.company_competitors.includes('Unknown') && (
                            <div className="mt-4">
                              <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Competitors</label>
                              <div className="flex flex-wrap gap-2 mt-1">
                                {leadDetails.company_competitors.filter(competitor => competitor !== 'Unknown').map((competitor: string) => (
                                  <span key={`competitor-${competitor}`} className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full dark:bg-orange-900 dark:text-orange-200">
                                    {competitor}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Business Model & Growth - Only show if data exists */}
                          {(leadDetails.company_business_model || leadDetails.company_growth_stage || leadDetails.company_target_market || leadDetails.company_market_cap) && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                              {leadDetails.company_business_model && leadDetails.company_business_model !== 'Unknown' && leadDetails.company_business_model !== 'N/A' && (
                                <div>
                                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Business Model</label>
                                  <p className="text-gray-900 dark:text-white break-words">{leadDetails.company_business_model}</p>
                                </div>
                              )}
                              {leadDetails.company_growth_stage && leadDetails.company_growth_stage !== 'Unknown' && leadDetails.company_growth_stage !== 'N/A' && (
                                <div>
                                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Growth Stage</label>
                                  <p className="text-gray-900 dark:text-white break-words">{leadDetails.company_growth_stage}</p>
                                </div>
                              )}
                              {leadDetails.company_target_market && leadDetails.company_target_market !== 'Unknown' && leadDetails.company_target_market !== 'N/A' && (
                                <div>
                                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Target Market</label>
                                  <p className="text-gray-900 dark:text-white break-words">{leadDetails.company_target_market}</p>
                                </div>
                              )}
                              {leadDetails.company_market_cap && leadDetails.company_market_cap !== 'Unknown' && leadDetails.company_market_cap !== 'N/A' && (
                                <div>
                                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Market Cap</label>
                                  <p className="text-gray-900 dark:text-white break-words">{leadDetails.company_market_cap}</p>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Funding & Investors - Only show if data exists */}
                          {((leadDetails.company_funding && leadDetails.company_funding !== 'Unknown' && leadDetails.company_funding !== 'N/A') ||
                            (leadDetails.company_investors && leadDetails.company_investors.length > 0 && !leadDetails.company_investors.includes('Unknown'))) && (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                {leadDetails.company_funding && leadDetails.company_funding !== 'Unknown' && leadDetails.company_funding !== 'N/A' && (
                                  <div>
                                    <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Funding</label>
                                    <p className="text-gray-900 dark:text-white break-words">{leadDetails.company_funding}</p>
                                  </div>
                                )}
                                {leadDetails.company_investors && leadDetails.company_investors.length > 0 && !leadDetails.company_investors.includes('Unknown') && (
                                  <div>
                                    <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Investors</label>
                                    <p className="text-gray-900 dark:text-white">
                                      {leadDetails.company_investors.join(', ')}
                                    </p>
                                  </div>
                                )}
                              </div>
                            )}

                          {/* Certifications & Awards - Only show if data exists */}
                          {((leadDetails.company_certifications && leadDetails.company_certifications.length > 0 && !leadDetails.company_certifications.includes('Unknown')) ||
                            (leadDetails.company_awards && leadDetails.company_awards.length > 0 && !leadDetails.company_awards.includes('Unknown'))) && (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                {leadDetails.company_certifications && leadDetails.company_certifications.length > 0 && !leadDetails.company_certifications.includes('Unknown') && (
                                  <div>
                                    <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Certifications</label>
                                    <div className="flex flex-wrap gap-2 mt-1">
                                      {leadDetails.company_certifications.map((cert: string) => (
                                        <span key={`cert-${cert}`} className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full dark:bg-yellow-900 dark:text-yellow-200">
                                          {cert}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {leadDetails.company_awards && leadDetails.company_awards.length > 0 && !leadDetails.company_awards.includes('Unknown') && (
                                  <div>
                                    <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Awards</label>
                                    <div className="flex flex-wrap gap-2 mt-1">
                                      {leadDetails.company_awards.map((award: string) => (
                                        <span key={`award-${award}`} className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full dark:bg-red-900 dark:text-red-200">
                                          {award}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}

                          {/* Other Offices - Only show if data exists */}
                          {leadDetails.company_offices && leadDetails.company_offices.length > 0 && !leadDetails.company_offices.includes('Unknown') && (
                            <div className="mt-4">
                              <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Other Offices</label>
                              <div className="flex flex-wrap gap-2 mt-1">
                                {leadDetails.company_offices.filter(office => office !== 'Unknown').map((office: string) => (
                                  <span key={`office-${office}`} className="px-2 py-1 bg-indigo-100 text-indigo-800 text-xs rounded-full dark:bg-indigo-900 dark:text-indigo-200">
                                    {office}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Recent News - Only show if data exists */}
                          {leadDetails.company_news && leadDetails.company_news !== 'Unknown' && leadDetails.company_news !== 'N/A' && (
                            <div className="mt-4">
                              <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Recent News</label>
                              <p className="text-gray-900 dark:text-white mt-1 text-sm leading-relaxed">
                                {leadDetails.company_news}
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Raw Data (for debugging) */}
                      {leadDetails.enrichment_data && (
                        <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                          <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Raw Enrichment Data</h4>
                          <pre className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg overflow-hidden text-sm">
                            {JSON.stringify(leadDetails.enrichment_data, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Brain className="mx-auto h-12 w-12 text-gray-400" />
                      <p className="mt-2">No enrichment data available</p>
                      <p className="text-sm mt-1">Click &quot;Re-enrich Lead&quot; to fetch fresh data</p>
                      <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                        <p className="text-yellow-800 dark:text-yellow-200 text-sm">
                          Debug: Check console for enrichment data logs
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </ComponentCard>

              {/* IP Information */}
              <ComponentCard title="🌐 IP Information">
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 sm:p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white">🌐 IP Information</h4>
                    <div className="flex items-center space-x-2">
                      {ipInfoLoading ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200">⏳ Loading</span>
                      ) : ipInfo ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200">✓ Loaded</span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200">⚠ Unavailable</span>
                      )}
                    </div>
                  </div>

                  {ipInfoLoading && (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Fetching IP Information</h3>
                      <p className="text-gray-600 dark:text-gray-400">Please wait a moment…</p>
                    </div>
                  )}

                  {!ipInfoLoading && ipInfo && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div><p className="text-sm text-gray-500">IP</p><p className="font-medium">{ipInfo.ip || '—'}</p></div>
                      <div><p className="text-sm text-gray-500">Country</p><p className="font-medium">{ipInfo.country || '—'}</p></div>
                      <div><p className="text-sm text-gray-500">City</p><p className="font-medium">{ipInfo.city || '—'}</p></div>
                      <div><p className="text-sm text-gray-500">Region/State</p><p className="font-medium">{ipInfo.region || ipInfo.state || '—'}</p></div>
                      <div><p className="text-sm text-gray-500">Timezone</p><p className="font-medium">{ipInfo.timezone || '—'}</p></div>
                      <div><p className="text-sm text-gray-500">Organization</p><p className="font-medium">{ipInfo.organization || '—'}</p></div>
                      <div><p className="text-sm text-gray-500">Country Code</p><p className="font-medium">{ipInfo.country_code || '—'}</p></div>
                      <div><p className="text-sm text-gray-500">Latitude</p><p className="font-medium">{ipInfo.latitude ?? '—'}</p></div>
                      <div><p className="text-sm text-gray-500">Longitude</p><p className="font-medium">{ipInfo.longitude ?? '—'}</p></div>
                    </div>
                  )}

                  {!ipInfoLoading && !ipInfo && (
                    <div className="text-center py-8">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">IP Information</h3>
                      <p className="text-gray-600 dark:text-gray-400">{ipInfoError || 'This data is currently unavailable.'}</p>
                    </div>
                  )}
                </div>
              </ComponentCard>
            </div>
          )}

          {/* Scoring Tab */}
          {activeTab === 'scoring' && (
            <div className="space-y-6">
              {leadScore ? (
                <>
                  <ComponentCard title="Lead Score Breakdown">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      <div className="group p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-600 shadow-sm dark:shadow-lg hover:shadow-md dark:hover:shadow-xl transition-all duration-300 hover:scale-105">
                        <div className="flex items-center justify-between mb-3">
                          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                            <Target className="w-5 h-5 text-white" />
                          </div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                        </div>
                        <p className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-2">Total Score</p>
                        <p className="text-3xl font-bold text-blue-700 dark:text-blue-300">
                          {leadScore.total_score !== null && leadScore.total_score !== undefined
                            ? Number(leadScore.total_score).toFixed(2)
                            : 'N/A'}
                        </p>
                        <div className="mt-3 w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2">
                          <div className="bg-blue-500 h-2 rounded-full transition-all duration-1000" style={{ width: `${Math.min((leadScore.total_score || 0) * 2, 100)}%` }}></div>
                        </div>
                      </div>
                      <div className="group p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-600 shadow-sm dark:shadow-lg hover:shadow-md dark:hover:shadow-xl transition-all duration-300 hover:scale-105">
                        <div className="flex items-center justify-between mb-3">
                          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                            <Users className="w-5 h-5 text-white" />
                          </div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                        </div>
                        <p className="text-sm font-medium text-green-600 dark:text-green-400 mb-2">Demographic</p>
                        <p className="text-3xl font-bold text-green-700 dark:text-green-300">
                          {leadScore.demographic_score !== null && leadScore.demographic_score !== undefined
                            ? Number(leadScore.demographic_score).toFixed(2)
                            : 'N/A'}
                        </p>
                        <div className="mt-3 w-full bg-green-200 dark:bg-green-800 rounded-full h-2">
                          <div className="bg-green-500 h-2 rounded-full transition-all duration-1000" style={{ width: `${Math.min((leadScore.demographic_score || 0) * 2, 100)}%` }}></div>
                        </div>
                      </div>
                      <div className="group p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-600 shadow-sm dark:shadow-lg hover:shadow-md dark:hover:shadow-xl transition-all duration-300 hover:scale-105">
                        <div className="flex items-center justify-between mb-3">
                          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                            <Activity className="w-5 h-5 text-white" />
                          </div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                        </div>
                        <p className="text-sm font-medium text-purple-600 dark:text-purple-400 mb-2">Behavioral</p>
                        <p className="text-3xl font-bold text-purple-700 dark:text-purple-300">
                          {leadScore.behavioral_score !== null && leadScore.behavioral_score !== undefined
                            ? Number(leadScore.behavioral_score).toFixed(2)
                            : 'N/A'}
                        </p>
                        <div className="mt-3 w-full bg-purple-200 dark:bg-purple-800 rounded-full h-2">
                          <div className="bg-purple-500 h-2 rounded-full transition-all duration-1000" style={{ width: `${Math.min((leadScore.behavioral_score || 0) * 2, 100)}%` }}></div>
                        </div>
                      </div>
                      <div className="group p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-600 shadow-sm dark:shadow-lg hover:shadow-md dark:hover:shadow-xl transition-all duration-300 hover:scale-105">
                        <div className="flex items-center justify-between mb-3">
                          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                            <Brain className="w-5 h-5 text-white" />
                          </div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                        </div>
                        <p className="text-sm font-medium text-orange-600 dark:text-orange-400 mb-2">Predictive</p>
                        <p className="text-3xl font-bold text-orange-700 dark:text-orange-300">
                          {leadScore.predictive_score !== null && leadScore.predictive_score !== undefined
                            ? Number(leadScore.predictive_score).toFixed(2)
                            : 'N/A'}
                        </p>
                        <div className="mt-3 w-full bg-orange-200 dark:bg-orange-800 rounded-full h-2">
                          <div className="bg-orange-500 h-2 rounded-full transition-all duration-1000" style={{ width: `${Math.min((leadScore.predictive_score || 0) * 2, 100)}%` }}></div>
                        </div>
                      </div>
                    </div>
                  </ComponentCard>

                  {/* Recommendations */}
                  {leadScore.recommendations && leadScore.recommendations.length > 0 && (
                    <ComponentCard title="Recommendations">
                      <div className="space-y-4">
                        {leadScore.recommendations.map((rec, index) => (
                          <div key={`rec-${index}-${rec.slice(0, 20)}`} className="group p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200/50 dark:border-green-700/50 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 hover:scale-[1.02] hover:-translate-y-0.5">
                            <div className="flex items-start gap-3">
                              <div className="w-6 h-6 bg-green-500 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                                <CheckCircle className="w-3 h-3 text-white" />
                              </div>
                              <p className="text-green-800 dark:text-green-200 font-medium leading-relaxed">{rec}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ComponentCard>
                  )}

                  {/* Risk Factors */}
                  {leadScore.risk_factors && leadScore.risk_factors.length > 0 && (
                    <ComponentCard title="Risk Factors">
                      <div className="space-y-4">
                        {leadScore.risk_factors.map((risk, index) => (
                          <div key={`risk-${index}-${risk.slice(0, 20)}`} className="group p-4 bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 border border-red-200/50 dark:border-red-700/50 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 hover:scale-[1.02] hover:-translate-y-0.5">
                            <div className="flex items-start gap-3">
                              <div className="w-6 h-6 bg-red-500 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                                <AlertCircle className="w-3 h-3 text-white" />
                              </div>
                              <p className="text-red-800 dark:text-red-200 font-medium leading-relaxed">{risk}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ComponentCard>
                  )}
                </>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Target className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2">No scoring data available</p>
                </div>
              )}
            </div>
          )}

          {/* Session Analytics Tab */}
          {activeTab === 'session' && (
            <div className="space-y-6">
              <ComponentCard title="Session Analytics">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">Session Analytics Data</h3>
                    <button
                      onClick={fetchSessionAnalytics}
                      disabled={sessionAnalyticsLoading}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {sessionAnalyticsLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Loading...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-4 w-4" />
                          Refresh Data
                        </>
                      )}
                    </button>
                  </div>

                  {sessionAnalyticsLoading ? (
                    <div className="flex justify-center items-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      <span className="ml-2 text-gray-600">Loading session analytics...</span>
                    </div>
                  ) : sessionAnalyticsError ? (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                      <div className="flex items-center gap-2">
                        <XCircle className="h-5 w-5 text-red-600" />
                        <p className="text-red-800 dark:text-red-200 font-medium">Error loading session analytics</p>
                      </div>
                      <p className="text-red-700 dark:text-red-300 text-sm mt-1">{sessionAnalyticsError}</p>
                    </div>
                  ) : sessionAnalyticsData && sessionAnalyticsData.hasSessionData ? (
                    <div className="space-y-6">
                      {/* Comprehensive Session Analytics */}
                      <ComprehensiveSessionAnalysis
                        sessionData={sessionAnalyticsData as unknown as SessionData}
                        loading={sessionAnalyticsLoading}
                        error={sessionAnalyticsError}
                        onRefresh={fetchSessionAnalytics}
                        className="w-full"
                      />
                    </div>
                  ) : (
                    <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                      <Activity className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Session Data Available</h3>
                      <p className="text-gray-600 dark:text-gray-400 mb-1">
                        This lead was not created through the chatbot/session tracking system.
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-500">
                        Session analytics are only available for leads created through the demo page with active session tracking.
                      </p>
                    </div>
                  )}
                </div>
              </ComponentCard>
            </div>
          )}


          {/* Assignment Tab */}
          {activeTab === 'assignment' && (
            <div className="space-y-6">
              {(leadDetails.assignment ||
                leadDetails.assignment_results ||
                leadDetails.assigned_to_name ||
                leadDetails.assigned_to ||
                leadDetails.assigned_agent_id ||
                leadDetails.assigned_agent_name ||
                agentDetails) ? (
                <>
                  <ComponentCard title="Assignment Details">
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Assigned To</p>
                          <p className="font-medium text-gray-900 dark:text-white break-words">
                            {(() => {
                              // Check multiple assignment data structures like the list view does
                              // Also check root-level assigned_agent_id and assigned_agent_name
                              const assignedToName = leadDetails.assignment?.assigned_to_name ||
                                leadDetails.assignment_results?.assigned_agent?.name ||
                                leadDetails.assigned_to_name ||
                                leadDetails.assigned_agent_name ||
                                agentDetails?.name;
                              const assignedToId = leadDetails.assignment?.assigned_to ||
                                leadDetails.assignment_results?.assigned_agent?.agent_id ||
                                leadDetails.assigned_to ||
                                leadDetails.assigned_agent_id ||
                                agentDetails?.agent_id;

                              // If we have a proper name, use it
                              if (assignedToName && typeof assignedToName === 'string' && assignedToName !== 'Unknown Agent') {
                                return capitalizeFirstLetter(assignedToName);
                              }

                              // Try to find the agent name from available agents
                              if (assignedToId && availableAgents.length > 0) {
                                const agent = availableAgents.find(a => a.id === assignedToId || a.agent_id === assignedToId);
                                if (agent && agent.name && typeof agent.name === 'string') {
                                  return capitalizeFirstLetter(agent.name);
                                }
                              }

                              // Fallback to showing the agent ID
                              if (assignedToId) {
                                return `Agent ${assignedToId}`;
                              }

                              return 'Not Available';
                            })()}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Email</p>
                          <p className="font-medium text-gray-900 dark:text-white break-all">
                            {leadDetails.email || 'Not Available'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Method</p>
                          <p className="font-medium text-gray-900 dark:text-white capitalize break-words">
                            {(() => {
                              const method = leadDetails.assignment?.assignment_method ||
                                leadDetails.assignment_results?.assignment_method;

                              // Show "Manually" instead of "unknown" for manual assignments
                              if (method === 'manual' || method === 'Manual') {
                                return 'Manually';
                              }

                              // Capitalize first letter of other methods
                              if (method && method !== 'unknown' && method !== 'Unknown') {
                                return method.charAt(0).toUpperCase() + method.slice(1).toLowerCase();
                              }

                              // If agent is assigned but method is missing/unknown, default to "Manually"
                              const isAssigned = !!(
                                leadDetails.assignment?.assigned_to ||
                                leadDetails.assigned_agent_id ||
                                leadDetails.assigned_to ||
                                agentDetails?.agent_id
                              );

                              if (isAssigned) {
                                return 'Manually';
                              }

                              return 'Not Available';
                            })()}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Confidence</p>
                          <p className="font-medium text-gray-900 dark:text-white break-words">
                            {(() => {
                              const confidence = leadDetails.assignment?.confidence || leadDetails.assignment_results?.confidence;
                              const assignmentMethod = leadDetails.assignment?.assignment_method || leadDetails.assignment_results?.assignment_method;

                              if (confidence === null || confidence === undefined) {
                                // For manual assignments, show 100% confidence
                                if (assignmentMethod === 'manual') {
                                  return '100.0%';
                                }
                                return 'Not Available';
                              }

                              if (typeof confidence === 'number' && !isNaN(confidence)) {
                                // If confidence is already a percentage (0-100), use as is
                                if (confidence > 1) {
                                  return `${confidence.toFixed(1)}%`;
                                }
                                // If confidence is a decimal (0-1), convert to percentage
                                return `${(confidence * 100).toFixed(1)}%`;
                              }

                              return 'Not Available';
                            })()}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Assigned At</p>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {(() => {
                              const assignedAt = leadDetails.assignment?.assigned_at || leadDetails.assignment_results?.assigned_at;
                              if (!assignedAt) return 'Not Available';

                              try {
                                const date = new Date(assignedAt);
                                // Check if date is valid and not in the future (more than 1 hour)
                                const now = new Date();
                                const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

                                if (isNaN(date.getTime())) {
                                  return 'Invalid Date';
                                }

                                if (date > oneHourFromNow) {
                                  // If date is in the future, use current time instead
                                  return new Date().toLocaleString();
                                }

                                return date.toLocaleString();
                              } catch {
                                return 'Invalid Date';
                              }
                            })()}
                          </p>
                        </div>
                      </div>
                    </div>
                  </ComponentCard>
                  {(leadDetails.assignment ||
                    leadDetails.assignment_results ||
                    leadDetails.assigned_to_name ||
                    leadDetails.assigned_to) && (
                      <ComponentCard title="Agent Details">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Agent ID</p>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {agentDetails?.agent_id ||
                                leadDetails.assignment?.assigned_to ||
                                leadDetails.assignment_results?.assigned_agent?.agent_id ||
                                leadDetails.assigned_to ||
                                leadDetails.assigned_agent_id || 'Not Available'}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Agent Name</p>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {(() => {
                                const agentName = (agentDetails?.name ||
                                  leadDetails.assignment?.assigned_to_name ||
                                  leadDetails.assignment_results?.assigned_agent?.name ||
                                  leadDetails.assigned_to_name ||
                                  leadDetails.assigned_agent_name) as string | undefined;
                                if (agentName && typeof agentName === 'string' && agentName !== 'Not Available') {
                                  return capitalizeFirstLetter(agentName);
                                }
                                return 'Not Available';
                              })()}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Agent Email</p>
                            <p className="font-medium text-gray-900 dark:text-white break-all overflow-hidden">
                              {(() => {
                                // Priority: agentDetails (from assignment-status endpoint) > assignment > assignment_results > availableAgents
                                let agentEmail: string | undefined = typeof agentDetails?.email === 'string' ? agentDetails.email : undefined;

                                if (agentEmail && agentEmail.trim() !== '') {
                                  return agentEmail;
                                }

                                // Fallback to assignment data
                                agentEmail = (leadDetails.assignment?.assigned_to_email ||
                                  leadDetails.assignment_results?.assigned_agent?.email) as string | undefined;

                                if (agentEmail && typeof agentEmail === 'string' && agentEmail.trim() !== '') {
                                  return agentEmail;
                                }

                                // Try to find from available agents (check multiple field name variations)
                                const agentId = agentDetails?.agent_id ||
                                  leadDetails.assignment?.assigned_to ||
                                  leadDetails.assignment_results?.assigned_agent?.agent_id ||
                                  leadDetails.assigned_to ||
                                  leadDetails.assigned_agent_id;

                                if (agentId && availableAgents.length > 0) {
                                  const agent = availableAgents.find(a =>
                                    a.id === agentId ||
                                    a.agent_id === agentId ||
                                    (a as { agentId?: string }).agentId === agentId
                                  );
                                  if (agent) {
                                    // Check multiple field name variations
                                    interface AgentWithEmail {
                                      email?: string;
                                      agent_email?: string;
                                      agentEmail?: string;
                                    }
                                    const emailValue = (agent as AgentWithEmail).email ||
                                      (agent as AgentWithEmail).agent_email ||
                                      (agent as AgentWithEmail).agentEmail;
                                    agentEmail = typeof emailValue === 'string' ? emailValue : undefined;
                                    if (agentEmail && agentEmail.trim() !== '') {
                                      return agentEmail;
                                    }
                                  }
                                }

                                return 'Not Available';
                              })() as string}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Department</p>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {(() => {
                                // Priority: agentDetails (from assignment-status endpoint) > availableAgents
                                const department = agentDetails?.department;

                                if (department && typeof department === 'string' && department.trim() !== '') {
                                  return department;
                                }

                                // Try to find from available agents
                                const agentId = agentDetails?.agent_id ||
                                  leadDetails.assignment?.assigned_to ||
                                  leadDetails.assignment_results?.assigned_agent?.agent_id ||
                                  leadDetails.assigned_to ||
                                  leadDetails.assigned_agent_id;

                                if (agentId && availableAgents.length > 0) {
                                  const agent = availableAgents.find(a =>
                                    a.id === agentId ||
                                    a.agent_id === agentId ||
                                    (a as { agentId?: string }).agentId === agentId
                                  );
                                  const agentDept = agent?.department;
                                  if (agentDept && typeof agentDept === 'string') {
                                    return agentDept;
                                  }
                                }

                                return 'Not Available';
                              })()}
                            </p>
                          </div>
                        </div>
                      </ComponentCard>
                    )}
                </>
              ) : (
                <div className="space-y-6">
                  <div className="text-center py-8 text-gray-500">
                    <UserCheck className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="mt-2">Lead is not assigned</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Thread Tab */}
          {activeTab === 'thread' && (
            <div className="space-y-6 animate-in fade-in-50 duration-500">
              {threadLoading ? (
                <div className="flex items-center justify-center h-[60vh]">
                  <div className="text-center">
                    <div role="status">
                      <svg aria-hidden="true" className="inline w-8 h-8 text-gray-200 animate-spin dark:text-gray-600 fill-blue-600" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor" />
                        <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentFill" />
                      </svg>
                      <span className="sr-only">Loading...</span>
                    </div>
                    <div className="mt-2 text-lg text-gray-500">Loading thread...</div>
                  </div>
                </div>
              ) : (
                <>
                  {/* Ticket ID Header */}
                  <div className="flex items-center justify-between pb-4">
                    <div className="flex items-center gap-3">
                      <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Ticket ID #{leadDetails?.id || leadId}</h2>
                    </div>
                  </div>

                  {/* Pipeline Management Section */}
                  <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl shadow-sm dark:shadow-lg p-6 mb-6">
                    <div className="space-y-6">
                      {/* Current Stage Display */}
                      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div className="space-y-1">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Current Stage</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Lead is currently in:</p>
                        </div>
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
                          <span className={`px-3 py-2 rounded-full text-sm font-medium text-center ${pipelineStages.find(s => s.value === currentStage)?.color || 'bg-gray-100 text-gray-800'
                            }`}>
                            {currentStage}
                          </span>
                          <button
                            onClick={() => setShowStageModal(true)}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors w-full sm:w-auto"
                          >
                            Change Stage
                          </button>
                        </div>
                      </div>

                      {/* Pipeline Stages Overview */}
                      <div>
                        <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-4">Pipeline Stages</h4>
                        <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-2 flex-wrap">
                          {pipelineStages.map((stage, index) => {
                            const currentIndex = pipelineStages.findIndex(s => s.value === currentStage);
                            const isCompleted = index < currentIndex || (currentStage === 'Closed Won' && stage.value === 'Closed Won') || (currentStage === 'Closed Lost' && stage.value === 'Closed Lost');
                            const isCurrent = currentStage === stage.value && currentStage !== 'Closed Won' && currentStage !== 'Closed Lost';

                            return (
                              <div
                                key={stage.value}
                                className={`flex-1 min-w-[160px] sm:min-w-[180px] md:min-w-[200px] p-4 rounded-lg border-2 transition-all ${isCurrent
                                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-lg'
                                  : isCompleted
                                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                                    : 'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800'
                                  }`}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${isCompleted
                                      ? 'bg-green-500 text-white'
                                      : isCurrent
                                        ? 'bg-blue-500 text-white'
                                        : 'bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-400'
                                      }`}>
                                      {isCompleted ? '✓' : index + 1}
                                    </div>
                                    <div>
                                      <h5 className={`font-medium ${isCompleted
                                        ? 'text-green-800 dark:text-green-200'
                                        : isCurrent
                                          ? 'text-blue-800 dark:text-blue-200'
                                          : 'text-gray-900 dark:text-white'
                                        }`}>
                                        {stage.label}
                                      </h5>
                                      <p className={`text-sm ${isCompleted
                                        ? 'text-green-600 dark:text-green-400'
                                        : isCurrent
                                          ? 'text-blue-600 dark:text-blue-400'
                                          : 'text-gray-600 dark:text-gray-400'
                                        }`}>
                                        {isCompleted ? 'Completed' : isCurrent ? 'Current Stage' : 'Pending'}
                                      </p>
                                    </div>
                                  </div>
                                  {isCurrent && (
                                    <div className="flex items-center space-x-2">
                                      <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                                      <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">Active</span>
                                    </div>
                                  )}
                                  {isCompleted && (
                                    <div className="flex items-center space-x-2">
                                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                                      <span className="text-xs text-green-600 dark:text-green-400 font-medium">Done</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Lead details card - compact row layout */}
                  {leadDetails && (
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-200 dark:border-gray-700 p-5 mb-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Name</p>
                          <p className="text-sm text-gray-900 dark:text-white break-words">{leadDetails.name || '-'}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Email</p>
                          <p className="text-sm text-gray-900 dark:text-white break-words break-all">{leadDetails.email || '-'}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Phone</p>
                          <p className="text-sm text-gray-900 dark:text-white break-words">{leadDetails.phone || '-'}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Source</p>
                          <p className="text-sm text-gray-900 dark:text-white break-words">{leadDetails.source || '-'}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Interest</p>
                          <p className="text-sm text-gray-900 dark:text-white break-words">{leadDetails.interest || '-'}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Status</p>
                          <p className="text-sm text-gray-900 dark:text-white break-words">{leadDetails.status || '-'}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Date</p>
                          <p className="text-sm text-gray-900 dark:text-white break-words">
                            {new Date(leadDetails.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })}
                          </p>
                        </div>
                        {leadDetails.message && (
                          <div className="space-y-1 sm:col-span-2">
                            <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Message</p>
                            <p className="text-sm text-gray-900 dark:text-white break-words">{leadDetails.message}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Thread UI - message bubbles */}
                      <div className="w-full flex justify-center">
                    <div className="w-full max-w-7xl mb-26">
                      <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-200 dark:border-gray-700 p-0 flex flex-col flex-1 min-h-[400px] sm:min-h-[500px] max-h-[70vh] sm:max-h-[65vh] min-h-0">
                        {/* Scrollable thread area */}
                        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 min-h-0">
                          {/* Always show original customer message first */}
                          {leadDetails && leadDetails.message && (
                            <div className="flex items-start gap-3">
                              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                                {leadDetails.name ? (leadDetails.name.split(' ').length > 1 ? (leadDetails.name.split(' ')[0][0] + leadDetails.name.split(' ')[leadDetails.name.split(' ').length - 1][0]).toUpperCase() : leadDetails.name[0].toUpperCase()) : 'U'}
                              </div>
                              <div className="max-w-full sm:max-w-[80%] w-fit">
                                <div className="bg-blue-100 dark:bg-blue-900 rounded-lg p-3 inline-block">
                                  <div className="font-semibold text-sm text-blue-800 dark:text-blue-200 mb-1">Customer Message:</div>
                                  <div className="text-gray-900 dark:text-white text-sm">{leadDetails.message}</div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    {new Date(leadDetails.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true })}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Show all admin replies from thread */}
                          {thread.length > 0 && thread.map((msg: ThreadMessage, idx: number) => (
                            <div key={msg.message_id || idx} className="flex items-start gap-3 justify-end">
                              <div className="max-w-full sm:max-w-[80%] w-fit">
                                <div className="bg-green-100 dark:bg-green-900 rounded-lg p-3 ml-auto inline-block">
                                  <div className="font-semibold text-sm text-green-800 dark:text-green-200 mb-1">
                                    {msg.sender_type && msg.sender_type.toLowerCase() === 'admin' ? 'Admin Reply:' : 'Customer Message:'}
                                  </div>
                                  <div className="text-gray-900 dark:text-white text-sm">{msg.message}</div>
                                  {msg.sender_type && msg.sender_type.toLowerCase() === 'admin' && (msg.status || leadDetails?.status) && String(msg.status || leadDetails?.status).toLowerCase() !== 'open' && (
                                    <div className={`mt-2 inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${String(msg.status || leadDetails?.status).toLowerCase() === 'in process'
                                      ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                      : String(msg.status || leadDetails?.status).toLowerCase() === 'pending'
                                        ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                                        : String(msg.status || leadDetails?.status).toLowerCase() === 'close'
                                          ? 'bg-green-100 text-green-800 border border-green-200'
                                          : 'bg-blue-100 text-blue-800 border border-blue-200'
                                      }`}>
                                      <span>Status: {msg.status || leadDetails?.status}</span>
                                      <span className="text-[11px] text-red-500/80">
                                        {msg.timestamp ? new Date(msg.timestamp).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true }) : ''}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                                {msg.sender_type && msg.sender_type.toLowerCase() === 'admin' ? 'AD' : (msg.sender_name && msg.sender_name[0] ? msg.sender_name[0].toUpperCase() : (leadDetails?.name ? leadDetails.name[0].toUpperCase() : 'U'))}
                              </div>
                            </div>
                          ))}

                          <div ref={threadEndRef} />
                        </div>

                        {/* Reply box fixed at the bottom of the thread container */}
                        {leadDetails && (threadSelectedStatus || leadDetails.status || '').toLowerCase() !== 'closed' && (
                          <div className="sticky bottom-0 left-0 w-full bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-lg p-4 z-10">
                            <form className="w-full" onSubmit={async (e) => {
                              e.preventDefault();
                              if (!replyText.trim() || !leadDetails) return;
                              try {
                                setIsSending(true);
                                const messageToSend = replyText;
                                setReplyText('');
                                const tempId = `temp-${Date.now()}`;
                                setThread(prev => ([
                                  ...prev,
                                  {
                                    message_id: tempId,
                                    sender_type: 'Admin',
                                    message: messageToSend,
                                    timestamp: new Date().toISOString(),
                                    status: 'Pending',
                                  }
                                ]));
                                const mongoId = leadDetails._id || (leadDetails.id && String(leadDetails.id).length === 24 && /^[0-9a-fA-F]{24}$/i.test(String(leadDetails.id)) ? leadDetails.id : null);
                                if (mongoId) {
                                  await fetch(`${BACKEND_URL}/api/v1/leads/${mongoId}/status`, {
                                    method: 'PUT',
                                    headers: {
                                      'accept': 'application/json',
                                      'Content-Type': 'application/json',
                                    },
                                    body: JSON.stringify({
                                      status: 'Pending',
                                      updated_by: 'Admin',
                                      notes: 'Status changed to Pending when admin sent reply',
                                      timestamp: new Date().toISOString(),
                                    }),
                                  });
                                }
                                await fetch(`${BACKEND_URL}/customer-chat/lead-thread/start`, {
                                  method: 'POST',
                                  headers: {
                                    'Content-Type': 'application/json',
                                    'accept': 'application/json'
                                  },
                                  body: JSON.stringify({
                                    customer_name: leadDetails.name,
                                    customer_email: leadDetails.email,
                                    subject: `Lead Thread - ${leadDetails.id || leadId}`,
                                    message: messageToSend
                                  }),
                                });
                                await new Promise(resolve => setTimeout(resolve, 500));
                                // Refresh thread
                                if (leadDetails && (leadDetails._id || leadDetails.id)) {
                                  const mongoId = leadDetails._id || (leadDetails.id && String(leadDetails.id).length === 24 && /^[0-9a-fA-F]{24}$/i.test(String(leadDetails.id)) ? leadDetails.id : null);
                                  if (mongoId) {
                                    try {
                                      const res = await fetch(`${BACKEND_URL}/api/v1/leads/${mongoId}/thread`);
                                      if (res.ok) {
                                        const data = await res.json();
                                        if (Array.isArray(data)) {
                                          setThread(data.map((m: ThreadMessage) => ({
                                            message_id: m.message_id,
                                            sender_type: m.sender_type ?? '',
                                            sender_name: m.sender_name,
                                            sender_email: m.sender_email,
                                            message: m.message ?? '',
                                            timestamp: m.timestamp ?? m.created_at,
                                            status: m.status ?? (m.sender_type && String(m.sender_type).toLowerCase() === 'admin' ? 'Pending' : ''),
                                          })));
                                        } else if ('messages' in data && Array.isArray(data.messages)) {
                                          setThread(data.messages.map((m: ThreadMessage) => ({
                                            message_id: m.message_id,
                                            sender_type: m.sender_type ?? '',
                                            sender_name: m.sender_name,
                                            sender_email: m.sender_email,
                                            message: m.message ?? '',
                                            timestamp: m.timestamp ?? m.created_at,
                                            status: m.status ?? (m.sender_type && String(m.sender_type).toLowerCase() === 'admin' ? 'Pending' : ''),
                                          })));
                                        }
                                      }
                                    } catch (error) {
                                      console.error('Error fetching thread:', error);
                                    }
                                  }
                                }
                              } catch (error) {
                                console.error('Error sending reply:', error);
                                setThread(prev => prev.filter(m => m.message_id && !String(m.message_id).startsWith('temp-')));
                              } finally {
                                setIsSending(false);
                              }
                            }}>
                              <div className="flex gap-2 items-center">
                                <textarea
                                  rows={2}
                                  className="flex-1 block w-full px-4 py-3 text-sm text-gray-800 dark:text-white bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none disabled:opacity-60"
                                  placeholder="Type your reply…  •  Enter to send, Shift+Enter for new line"
                                  required
                                  value={replyText}
                                  onChange={(e) => {
                                    const newText = e.target.value;
                                    setReplyText(newText);
                                    if (newText.trim().length > 0 && leadDetails && leadDetails.status !== 'In Process' && !statusUpdatedToInProcessRef.current) {
                                      const mongoId = leadDetails._id || (leadDetails.id && String(leadDetails.id).length === 24 && /^[0-9a-fA-F]{24}$/i.test(String(leadDetails.id)) ? leadDetails.id : null);
                                      if (mongoId) {
                                        fetch(`${BACKEND_URL}/api/v1/leads/${mongoId}/status`, {
                                          method: 'PUT',
                                          headers: {
                                            'accept': 'application/json',
                                            'Content-Type': 'application/json',
                                          },
                                          body: JSON.stringify({
                                            status: 'In Process',
                                            updated_by: 'Admin',
                                            notes: 'Status automatically changed to In Process when admin started typing reply',
                                            timestamp: new Date().toISOString(),
                                          }),
                                        }).then(response => {
                                          if (response.ok) {
                                            return response.json();
                                          }
                                          throw new Error('Failed to update status');
                                        }).then(data => {
                                          const newStatus = data?.new_status || 'In Process';
                                          setLeadDetails(prev => prev ? { ...prev, status: newStatus } : null);
                                          setThreadSelectedStatus(newStatus);
                                          statusUpdatedToInProcessRef.current = true;
                                        }).catch(error => {
                                          console.error('Error auto-updating status to In Process:', error);
                                        });
                                      }
                                    }
                                  }}
                                  disabled={isSending}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                      e.preventDefault();
                                      if (replyText.trim()) {
                                        (e.target as HTMLFormElement).form?.requestSubmit();
                                      }
                                    }
                                  }}
                                />
                                <button type="submit" disabled={isSending || !replyText.trim()} className={`inline-flex items-center px-6 py-3 text-sm font-medium text-center text-white rounded-lg focus:ring-4 focus:ring-blue-200 dark:focus:ring-blue-900 transition ${isSending || !replyText.trim() ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}>
                                  {isSending ? 'Sending...' : 'Reply'}
                                </button>
                              </div>
                            </form>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

        </div>
      </div>


      {/* Google Calendar Style Appointment Modal */}
      {showAppointmentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-hidden">
            {/* Header with action icons */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 bg-blue-500 rounded"></div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Create Appointment</h2>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                  <Mail className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </button>
                <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                  <RefreshCw className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </button>
                <button
                  onClick={() => setShowAppointmentModal(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                >
                  <XCircle className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </button>
              </div>
            </div>

            {/* Main Content */}
            <div className="p-6 space-y-6">
              {/* Title - Large input like Google Calendar */}
              <div>
                <input
                  type="text"
                  value={appointmentTitle}
                  onChange={(e) => setAppointmentTitle(e.target.value)}
                  className="w-full text-2xl font-medium bg-transparent border-none outline-none text-gray-900 dark:text-white placeholder-gray-400"
                  placeholder="Add title"
                  required
                />
              </div>

              {/* Date and Time */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-gray-400" />
                  <div className="flex-1">
                    <input
                      type="datetime-local"
                      value={appointmentStartTime}
                      onChange={(e) => setAppointmentStartTime(e.target.value)}
                      className="w-full bg-transparent border-none outline-none text-gray-900 dark:text-white"
                      required
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-gray-400" />
                  <div className="flex-1">
                    <input
                      type="datetime-local"
                      value={appointmentEndTime}
                      onChange={(e) => setAppointmentEndTime(e.target.value)}
                      className="w-full bg-transparent border-none outline-none text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Recurrence */}
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-gray-400" />
                <select
                  value={appointmentRecurrence}
                  onChange={(e) => setAppointmentRecurrence(e.target.value)}
                  className="bg-transparent border-none outline-none text-gray-900 dark:text-white"
                >
                  <option value="none">Does not repeat</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>

              {/* Location */}
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={appointmentLocation}
                  onChange={(e) => setAppointmentLocation(e.target.value)}
                  className="flex-1 bg-transparent border-none outline-none text-gray-900 dark:text-white placeholder-gray-400"
                  placeholder="Add location"
                />
              </div>

              {/* Google Meet Integration */}
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 bg-blue-500 rounded flex items-center justify-center">
                  <span className="text-white text-xs font-bold">G</span>
                </div>
                <div className="flex-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={appointmentGoogleMeet}
                      onChange={(e) => setAppointmentGoogleMeet(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-gray-900 dark:text-white">Add Google Meet video conferencing</span>
                  </label>
                  {appointmentGoogleMeet && (
                    <div className="mt-2 ml-6">
                      <input
                        type="text"
                        value={appointmentMeetingLink}
                        onChange={(e) => setAppointmentMeetingLink(e.target.value)}
                        className="w-full bg-transparent border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-gray-900 dark:text-white placeholder-gray-400"
                        placeholder="meet.google.com/xxx-xxxx-xxx"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Reminders */}
              <div className="flex items-start gap-3">
                <Activity className="w-5 h-5 text-gray-400 mt-1" />
                <div className="flex-1">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Reminders</p>
                  <div className="space-y-2">
                    {appointmentReminders.map((reminder, index) => (
                      <div key={`reminder-${index}-${reminder}`} className="flex items-center gap-2">
                        <span className="text-sm text-gray-900 dark:text-white">{reminder}</span>
                        <button
                          onClick={() => setAppointmentReminders(prev => prev.filter((_, i) => i !== index))}
                          className="text-red-500 hover:text-red-700"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <select
                      onChange={(e) => {
                        if (e.target.value && !appointmentReminders.includes(e.target.value)) {
                          setAppointmentReminders(prev => [...prev, e.target.value]);
                        }
                        e.target.value = '';
                      }}
                      className="text-sm text-gray-600 dark:text-gray-400 bg-transparent border-none outline-none"
                    >
                      <option value="">Add reminder</option>
                      <option value="5 minutes before">5 minutes before</option>
                      <option value="10 minutes before">10 minutes before</option>
                      <option value="30 minutes before">30 minutes before</option>
                      <option value="1 hour before">1 hour before</option>
                      <option value="1 day before">1 day before</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="flex items-start gap-3">
                <FileText className="w-5 h-5 text-gray-400 mt-1" />
                <textarea
                  value={appointmentDescription}
                  onChange={(e) => setAppointmentDescription(e.target.value)}
                  className="flex-1 bg-transparent border-none outline-none text-gray-900 dark:text-white placeholder-gray-400 resize-none"
                  rows={4}
                  placeholder="Add description"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2">
                  <button className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                    <Mail className="w-4 h-4 inline mr-2" />
                    Invite via link
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      setShowAppointmentModal(false);
                      setAppointmentTitle('');
                      setAppointmentDescription('');
                      setAppointmentStartTime('');
                      setAppointmentEndTime('');
                      setAppointmentLocation('');
                      setAppointmentTimezone('UTC');
                      setAppointmentType('meeting');
                      setAppointmentReminders(['5 minutes before', '30 minutes before']);
                      setAppointmentRecurrence('none');
                      setAppointmentGoogleMeet(true);
                      setAppointmentMeetingLink('');
                    }}
                    className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateAppointment}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    Create
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stage Change Modal */}
      {showStageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Change Pipeline Stage</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Current Stage
                </label>
                <p className="text-sm text-gray-600 dark:text-gray-400">{currentStage}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  New Stage
                </label>
                <select
                  value={selectedStage}
                  onChange={(e) => setSelectedStage(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">Select new stage...</option>
                  {pipelineStages.map((stage) => (
                    <option key={stage.value} value={stage.value}>
                      {stage.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleStageUpdate}
                  disabled={!selectedStage}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
                >
                  Update Stage
                </button>
                <button
                  onClick={() => {
                    setShowStageModal(false);
                    setSelectedStage('');
                  }}
                  className="flex-1 bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assignment Required Modal */}
      {showAssignmentRequiredModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center">
                <UserCheck className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Assignment Required</h3>
            </div>

            <div className="mb-6">
              <p className="text-gray-700 dark:text-gray-300 mb-3">
                To update the pipeline stage, this lead must first be assigned to an agent.
              </p>
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>Next Steps:</strong>
                </p>
                <ol className="text-sm text-blue-700 dark:text-blue-300 mt-1 list-decimal list-inside space-y-1">
                  <li>Go to the <strong>Assignment</strong> tab</li>
                  <li>Assign the lead to an available agent</li>
                  <li>Return to update the pipeline stage</li>
                </ol>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowAssignmentRequiredModal(false);
                  setActiveTab('assignment');
                }}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <UserCheck className="h-4 w-4" />
                Go to Assignment
              </button>
              <button
                onClick={() => setShowAssignmentRequiredModal(false)}
                className="flex-1 bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}