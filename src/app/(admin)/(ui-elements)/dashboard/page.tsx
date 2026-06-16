'use client';
import React from "react";
import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  MessageCircle,
  BookOpen,
  Users,
  Briefcase,
  MessageSquare,
} from 'lucide-react';
import { motion } from 'framer-motion';
// =============================================================================
// COMPONENT IMPORTS
// =============================================================================
import BarChartOne from '@/components/charts/bar/BarChartOne';
import Loader from '@/components/Loader';
import DashboardHeader from '@/components/header/DashboardHeader';
import Link from 'next/link';
import { getAuthHeaders } from '@/utils/api';
// Modal form imports
import JobApplicationForm from './JobApplicationForm';
import LeadsForm from './LeadsForm';
import EmployeeTicketForm from './EmployeeTicketForm';
import CustomerTicketForm from './CustomerTicketForm';
import ActionBar from '@/components/header/actionbar';
// =============================================================================
// TYPE DEFINITIONS & INTERFACES
// =============================================================================
/**
 * Timeline filter options for dashboard data filtering
 */
type TimelineFilter = '' | 'all' | 'today' | 'yesterday' | 'thisweek' | 'thismonth' | 'custom';
type CategoryFilter = 'all' | 'leads' | 'support' | 'recruitment';
/**
 * Dashboard metrics data structure
 */
interface DashboardMetrics {
  threads: number;
  documents: number;
  leads: number;
  applicants: number;
  tickets: number;
}
type DocumentsBreakdown = Record<string, number>;
/**
 * Activity item structure for recent activities
 */
interface Activity {
  type: 'session_history' | 'lead' | 'job_applicant' | 'employee' | 'customer';
  created_at: string;
  // Session history specific fields
  title?: string;
  domain?: string;
  history_count?: number;
  // Lead specific fields
  name?: string;
  source?: string;
  interest?: string;
  // Job applicant specific fields
  job_category?: string;
  status?: string;
  // Ticket specific fields
  issue_type?: string;
  issue?: string;
}
type LeadData = {
  _id: string;
  id: string;
  name: string;
  email: string;
  phone: string;
  source: string;
  interest: string;
  message: string;
  created_at: string;
  updated_at: string | null;
  status: string;
  stage: string;
};
// =============================================================================
// API CONFIGURATION
// =============================================================================
const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL;
if (!BACKEND_URL) {
  throw new Error('NEXT_PUBLIC_API_URL environment variable is not set');
}
const API_CONFIG = {
  baseUrl: BACKEND_URL,
  endpoints: {
    sessions: {
      domain1: '/domain/domain_1/sessions',
      domain2: '/domain/domain_2/sessions',
      domain3: '/domain/domain_3/sessions',
    },
    files: {
      domain1: '/domain/domain_1/files?page=1&page_size=10',
      domain2: '/domain/domain_2/files?page=1&page_size=10',
      domain3: '/domain/domain_3/files?page=1&page_size=10',
    },
    leads: '/api/v1/leads/',
    jobs: '/api/v1/jobs',
    tickets: {
      employee: '/api/v1/helpdesk/employee/tickets',
      customer: '/api/v1/helpdesk/tickets',
      // Alternative endpoints if the above don't work
      employeeAlt: '/api/v1/helpdesk/employee-ticket',
      customerAlt: '/api/v1/helpdesk/customer-ticket',
    },
    activities: '/recent-activities',
  },
} as const;
// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================
/**
 * Safe API fetch with timeout, retry logic and error handling
 * @param url - API endpoint URL
 * @param timeout - Request timeout in milliseconds (default: 30 seconds)
 * @param retries - Number of retry attempts (default: 2)
 * @returns Promise with API response or null on error
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const safeApiFetch = async (url: string, timeout: number = 30000, retries: number = 2): Promise<any> => {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, timeout);
      
      const response = await fetch(url, { 
        headers: getAuthHeaders(),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        // Don't retry on 404s as the endpoint likely doesn't exist
        if (response.status === 404) {
          console.warn("Endpoint not found: " + url);
          return null;
        }
        throw new Error("HTTP " + response.status + ": " + response.statusText);
      }
      
      return await response.json();
    } catch (error) {
      const isLastAttempt = attempt === retries;
      
      if (error instanceof Error && error.name === 'AbortError') {
        console.warn("Request timeout for " + url + " (attempt " + (attempt + 1) + "/" + (retries + 1) + ")");
      } else {
        console.warn("API fetch failed for " + url + " (attempt " + (attempt + 1) + "/" + (retries + 1) + "):", error);
      }
      
      if (isLastAttempt) {
        return null;
      }
      
      // Wait before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }
  return null;
};
/**
 * Calculate timeline filter multiplier for data scaling
 * @param timeline - Selected timeline filter
 * @returns Multiplier value for data scaling
 */
// const getTimelineMultiplier = (timeline: TimelineFilter): number => {
//   const multipliers: Record<TimelineFilter, number> = {
//     '': 1,
//     'all': 1,
//     'today': 0.25,
//     'yesterday': 0.2,
//     'thisweek': 0.6,
//     'thismonth': 0.8,
//     'custom': 0.5,
//   };
//   return multipliers[timeline] || 1;
// };
/**
 * Filter activities by timeline selection
 * @param activities - Array of activities to filter
 * @param timeline - Timeline filter to apply
 * @param customRange - Custom date range for custom filter
 * @returns Filtered activities array
 */
const filterActivitiesByTimeline = (
    activities: Activity[],
  timeline: TimelineFilter,
    customRange: [Date | null, Date | null]
): Activity[] => {
    if (!timeline || timeline === 'all') return activities;
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    return activities.filter((activity) => {
      try {
    const activityDate = new Date(activity.created_at);
        if (isNaN(activityDate.getTime())) return false;
        
        switch (timeline) {
          case 'today':
            return activityDate >= today;
      
          case 'yesterday':
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
            return activityDate >= yesterday && activityDate < today;
      
          case 'thisweek':
            const weekStart = new Date(today);
            weekStart.setDate(today.getDate() - today.getDay());
            return activityDate >= weekStart;
      
          case 'thismonth':
            const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
            return activityDate >= monthStart;
      
          case 'custom':
              const [start, end] = customRange;
              if (start && end) {
                const endDate = new Date(end);
              endDate.setHours(23, 59, 59, 999);
          return activityDate >= start && activityDate <= endDate;
        }
        if (start && !end) return activityDate >= start;
              if (!start && end) {
                const endDate = new Date(end);
                endDate.setHours(23, 59, 59, 999);
                return activityDate <= endDate;
              }
            return true;
      
          default:
            return true;
        }
      } catch (error) {
      console.warn('Invalid date format in activity:', activity.created_at, error);
        return false;
      }
    });
};
/**
 * Get activity display configuration based on activity type
 * @param activity - Activity item to get configuration for
 * @returns Configuration object with styling and display properties
 */
const getActivityConfig = (activity: Activity) => {
  const configs = {
    session_history: {
      cardBg: 'bg-blue-50 dark:bg-gray-600',
      iconBg: 'bg-blue-100',
      badge: <span className="ml-2 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs">Session</span>,
      icon: <MessageCircle className="text-blue-600" size={22} />,
      getText: () => {
        const domainLabels: Record<string, string> = {
          'domain_1': 'Employee',
          'domain_2': 'Customer', 
          'domain_3': 'Guest'
        };
        const domainLabel = domainLabels[activity.domain || ''] || activity.domain || '';
        return {
          mainText: (activity.title || 'Session') + " (" + domainLabel + ")",
          subText: "History Count: " + (activity.history_count || 0)
        };
      }
    },
    lead: {
      cardBg: 'bg-green-50 dark:bg-gray-600',
      iconBg: 'bg-green-100',
      badge: <span className="ml-2 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs">Lead</span>,
      icon: <Users className="text-green-600" size={22} />,
      getText: () => ({
        mainText: (activity.name || 'Lead') + " (" + (activity.source || '') + ")",
        subText: "Interest: " + (activity.interest || '')
      })
    },
    job_applicant: {
      cardBg: 'bg-yellow-50 dark:bg-gray-600',
      iconBg: 'bg-yellow-100',
      badge: <span className="ml-2 px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 text-xs">Applicant</span>,
      icon: <Briefcase className="text-yellow-600" size={22} />,
      getText: () => ({
        mainText: (activity.name || 'Applicant') + " (" + (activity.job_category || '') + ")",
        subText: "Status: " + (activity.status || '')
      })
    },
    employee: {
      cardBg: 'bg-pink-50 dark:bg-gray-600',
      iconBg: 'bg-pink-100',
      badge: <span className="ml-2 px-2 py-0.5 rounded-full bg-pink-100 text-pink-700 text-xs">Employee</span>,
      icon: <MessageSquare className="text-pink-600" size={22} />,
      getText: () => ({
        mainText: (activity.name || 'Employee Ticket') + " (" + (activity.issue_type || '') + ")",
        subText: "Issue: " + (activity.issue || '')
      })
    },
    customer: {
      cardBg: 'bg-pink-50 dark:bg-gray-600',
      iconBg: 'bg-pink-100',
      badge: <span className="ml-2 px-2 py-0.5 rounded-full bg-pink-100 text-pink-700 text-xs">Customer</span>,
      icon: <MessageSquare className="text-pink-600" size={22} />,
      getText: () => ({
        mainText: (activity.name || 'Customer Ticket') + " (" + (activity.issue_type || '') + ")",
        subText: "Issue: " + (activity.issue || '')
      })
    }
  };
  const config = configs[activity.type];
  if (config) {
    const { mainText, subText } = config.getText();
    return { ...config, mainText, subText };
  }
  // Default fallback configuration
    return {
    cardBg: 'bg-gray-50 dark:bg-gray-800',
    iconBg: 'bg-gray-200',
    badge: null,
    icon: <BookOpen className="text-gray-400" size={22} />,
    mainText: activity.type || 'Activity',
    subText: ''
  };
};
// Map LeadData to Activity type
const mapLeadToActivity = (lead: LeadData): Activity => ({
  type: 'lead',
  created_at: lead.created_at,
  name: lead.name,
  source: lead.source,
  interest: lead.interest,
});
// =============================================================================
// MAIN DASHBOARD COMPONENT
// =============================================================================

 

export default function DashboardPage() {                                         
  // Core dashboard data states
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    threads: 0,
    documents: 0,
    leads: 0,
    applicants: 0,
    tickets: 0
  });
  
  const [activities, setActivities] = useState<Activity[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(true);
  const [isDataFetching, setIsDataFetching] = useState(false);
  const [documentsBreakdown, setDocumentsBreakdown] = useState<DocumentsBreakdown>({});
  // Filter and UI states
  const [timelineFilter, setTimelineFilter] = useState<TimelineFilter>('');
  const [categoryFilter] = useState<CategoryFilter>('all');
  // Filter and UI states
  const [pendingCustomRange, setPendingCustomRange] = useState<[Date | null, Date | null]>([null, null]);
  // ActionBar state and refs
  const [filterQuery, setFilterQuery] = useState('');
  const [showFilterField, setShowFilterField] = useState(false);
  const [filterField, setFilterField] = useState('name');
  const [showCustomPopover, setShowCustomPopover] = useState(false);
  const [downloadMenuOpen, setDownloadMenuOpen] = useState(false);
  const [mobileDownloadMenuOpen, setMobileDownloadMenuOpen] = useState(false);
  
  // Modal states
  const [isJobApplicationFormOpen, setIsJobApplicationFormOpen] = useState(false);
  const [isLeadsFormOpen, setIsLeadsFormOpen] = useState(false);
  const [isCustomerTicketOpen, setIsCustomerTicketOpen] = useState(false);
  const [ticketType, setTicketType] = useState<'customer' | 'employee'>('customer');

  const downloadMenuRef = useRef<HTMLDivElement>(null);
  const mobileDownloadMenuRef = useRef<HTMLDivElement>(null);
  const customPopoverRef = useRef<HTMLDivElement>(null);
  const fetchingRef = useRef(false);

  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);
  // =============================================================================
  // COMPUTED VALUES (MEMOIZED FOR PERFORMANCE)
  // =============================================================================
  // Calculate filtered metrics based on timeline selection
  const filteredMetrics = useMemo(() => {
    if (!timelineFilter || timelineFilter === 'all') {
      return metrics;
    }
    // Recompute from activities when a timeline is applied so cards reflect actual filtered data
    const timelineFiltered = filterActivitiesByTimeline(activities, timelineFilter, pendingCustomRange);
    let threads = 0;
    let documents = 0;
    let leads = 0;
    let applicants = 0;
    let tickets = 0;
    for (const a of timelineFiltered) {
      if (a.type === 'session_history') {
        // Use history_count if present, otherwise count item as 1
        threads += typeof a.history_count === 'number' ? a.history_count : 1;
      } else if (a.type === 'lead') {
        leads += 1;
      } else if (a.type === 'job_applicant') {
        applicants += 1;
      } else if (a.type === 'employee' || a.type === 'customer') {
        tickets += 1;
      }
    }
    // Documents are not represented in activities; fallback to original when unknown
    documents = metrics.documents;
    return { threads, documents, leads, applicants, tickets } as DashboardMetrics;
  }, [metrics, activities, timelineFilter, pendingCustomRange]);
  // Filter activities by timeline and search query
  const visibleActivities = useMemo(() => {
    const timelineFiltered = filterActivitiesByTimeline(activities, timelineFilter, pendingCustomRange);
    const categoryFiltered = categoryFilter === 'all'
      ? timelineFiltered
      : timelineFiltered.filter((a) => {
          if (categoryFilter === 'leads') return a.type === 'lead';
          if (categoryFilter === 'recruitment') return a.type === 'job_applicant';
          if (categoryFilter === 'support') return a.type === 'employee' || a.type === 'customer';
          return true;
        });
    if (!filterQuery) return categoryFiltered;
    return categoryFiltered.filter((activity) =>
      JSON.stringify(activity).toLowerCase().includes(filterQuery.toLowerCase())
    );
  }, [activities, timelineFilter, pendingCustomRange, filterQuery, categoryFilter]);
  // Compute trends vs last week for KPIs
  const kpiTrends = useMemo(() => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    const prevWeekStart = new Date(startOfWeek);
    prevWeekStart.setDate(startOfWeek.getDate() - 7);
    const prevWeekEnd = new Date(startOfWeek);
    prevWeekEnd.setDate(startOfWeek.getDate() - 1);

    const inRange = (dt: Date, start: Date, end: Date) => dt >= start && dt <= end;

    const thisWeek = { threads: 0, leads: 0, applicants: 0, tickets: 0 } as DashboardMetrics;
    const lastWeek = { threads: 0, leads: 0, applicants: 0, tickets: 0 } as DashboardMetrics;

    for (const a of activities) {
      const d = new Date(a.created_at);
      const isThisWeek = inRange(d, startOfWeek, now);
      const isLastWeek = inRange(d, prevWeekStart, prevWeekEnd);
      const inc = (bucket: DashboardMetrics) => {
        if (a.type === 'session_history') {
          bucket.threads += typeof a.history_count === 'number' ? a.history_count : 1;
        } else if (a.type === 'lead') {
          bucket.leads += 1;
        } else if (a.type === 'job_applicant') {
          bucket.applicants += 1;
        } else if (a.type === 'employee' || a.type === 'customer') {
          bucket.tickets += 1;
        }
      };
      if (isThisWeek) inc(thisWeek);
      if (isLastWeek) inc(lastWeek);
    }

    const pct = (curr: number, prev: number) => {
      if (prev === 0) return curr > 0 ? 100 : 0;
      return Math.round(((curr - prev) / prev) * 100);
    };

    return {
      leads: pct(thisWeek.leads, lastWeek.leads),
      applicants: pct(thisWeek.applicants, lastWeek.applicants),
      tickets: pct(thisWeek.tickets, lastWeek.tickets),
      threads: pct(thisWeek.threads, lastWeek.threads),
      documents: 0,
    } as Record<string, number>;
  }, [activities]);
  // Chart data for bar chart visualization
  const chartData = useMemo(() => [
    { label: 'Threads', value: filteredMetrics.threads, color: '#3366CC' },
    { label: 'Documents', value: filteredMetrics.documents, color: '#3366CC' },
    { label: 'Leads', value: filteredMetrics.leads, color: '#3366CC' },
    { label: 'Applicants', value: filteredMetrics.applicants, color: '#3366CC' },
    { label: 'Tickets', value: filteredMetrics.tickets, color: '#3366CC' },
  ], [filteredMetrics]);
  // Build 7-day series for mini-sparklines from activities
  // mini-series sparkline removed (unused)
  // Wrapper function for ActionBar compatibility
  const handleTimelineFilterChange = useCallback((value: string) => {
    setTimelineFilter(value as TimelineFilter);
  }, []);
  const fetchDashboardData = useCallback(async () => {
    if (fetchingRef.current) {
      return;
    }
    fetchingRef.current = true;
    if (isMountedRef.current) {
      setIsDataFetching(true);
      setActivitiesLoading(true);
    }
    try {
      const [
        sessionsData,
        filesData,
        leadsData,
        jobsData,
        ticketsData,
        activitiesData
      ] = await Promise.all([
        Promise.all([
          safeApiFetch(API_CONFIG.baseUrl + API_CONFIG.endpoints.sessions.domain1),
          safeApiFetch(API_CONFIG.baseUrl + API_CONFIG.endpoints.sessions.domain2),
          safeApiFetch(API_CONFIG.baseUrl + API_CONFIG.endpoints.sessions.domain3)
        ]),
        Promise.all([
          safeApiFetch(API_CONFIG.baseUrl + API_CONFIG.endpoints.files.domain1),
          safeApiFetch(API_CONFIG.baseUrl + API_CONFIG.endpoints.files.domain2),
          safeApiFetch(API_CONFIG.baseUrl + API_CONFIG.endpoints.files.domain3)
        ]),
        safeApiFetch(API_CONFIG.baseUrl + API_CONFIG.endpoints.leads),
        safeApiFetch(API_CONFIG.baseUrl + API_CONFIG.endpoints.jobs),
        (async () => {
          try {
            const [employeeTickets, customerTickets] = await Promise.all([
              safeApiFetch(API_CONFIG.baseUrl + API_CONFIG.endpoints.tickets.employee),
              safeApiFetch(API_CONFIG.baseUrl + API_CONFIG.endpoints.tickets.customer)
            ]);
            if (!employeeTickets || !customerTickets) {
              console.log('Primary ticket endpoints failed, trying alternatives...');
              const [employeeTicketsAlt, customerTicketsAlt] = await Promise.all([
                safeApiFetch(API_CONFIG.baseUrl + API_CONFIG.endpoints.tickets.employeeAlt),
                safeApiFetch(API_CONFIG.baseUrl + API_CONFIG.endpoints.tickets.customerAlt)
              ]);
              return [employeeTicketsAlt || employeeTickets, customerTicketsAlt || customerTickets];
            }
            return [employeeTickets, customerTickets];
          } catch (error) {
            console.error('Error fetching tickets:', error);
            return [null, null];
          }
        })(),
        safeApiFetch(API_CONFIG.baseUrl + API_CONFIG.endpoints.activities)
      ]);
      const [sessions1, sessions2, sessions3] = sessionsData;
      const sessionCount = [sessions1, sessions2, sessions3].reduce((total, data) => {
        if (data?.sessions && Array.isArray(data.sessions)) {
          return total + data.sessions.length;
        }
        if (Array.isArray(data)) {
          return total + data.length;
        }
        return total;
      }, 0);
      const [files1, files2, files3] = filesData;
      const fileCount = [files1, files2, files3].reduce((total, data) => {
        if (data && typeof data.total_files === 'number') {
          return total + data.total_files;
        }
        if (data?.files && Array.isArray(data.files)) {
          return total + data.files.length;
        }
        return total;
      }, 0);
      const breakdown: DocumentsBreakdown = {};
      const addToBreakdown = (nameOrType: string | undefined) => {
        if (!nameOrType) return;
        const lower = nameOrType.toLowerCase();
        let ext = '';
        if (lower.includes('/')) {
          ext = lower.split('/').pop() || '';
        } else if (lower.includes('.')) {
          ext = lower.split('.').pop() || '';
        }
        if (!ext) return;
        breakdown[ext] = (breakdown[ext] || 0) + 1;
      };
      const collectFiles = (data: unknown) => {
        const anyData = data as { files?: Array<{ file_name?: string; name?: string; mime_type?: string; content_type?: string }> };
        if (anyData?.files && Array.isArray(anyData.files)) {
          for (const f of anyData.files) {
            addToBreakdown(f.file_name || f.name);
            addToBreakdown((f as unknown as { content_type?: string }).content_type);
            addToBreakdown(f.mime_type);
          }
        }
      };
      collectFiles(files1);
      collectFiles(files2);
      collectFiles(files3);
      if (isMountedRef.current) {
        setDocumentsBreakdown(breakdown);
      }
      const leadsCount = Array.isArray(leadsData) ? leadsData.length : 0;
      const applicantsCount = Array.isArray(jobsData) ? jobsData.length : 0;
      const [employeeTickets, customerTickets] = ticketsData;
      let employeeTicketsCount = 0;
      let customerTicketsCount = 0;
      if (Array.isArray(employeeTickets)) {
        employeeTicketsCount = employeeTickets.length;
      } else if (employeeTickets && typeof employeeTickets === 'object') {
        if (employeeTickets.data && Array.isArray(employeeTickets.data)) {
          employeeTicketsCount = employeeTickets.data.length;
        } else if (employeeTickets.tickets && Array.isArray(employeeTickets.tickets)) {
          employeeTicketsCount = employeeTickets.tickets.length;
        } else if (employeeTickets.count !== undefined) {
          employeeTicketsCount = employeeTickets.count;
        }
      }
      if (Array.isArray(customerTickets)) {
        customerTicketsCount = customerTickets.length;
      } else if (customerTickets && typeof customerTickets === 'object') {
        if (customerTickets.data && Array.isArray(customerTickets.data)) {
          customerTicketsCount = customerTickets.data.length;
        } else if (customerTickets.tickets && Array.isArray(customerTickets.tickets)) {
          customerTicketsCount = customerTickets.tickets.length;
        } else if (customerTickets.count !== undefined) {
          customerTicketsCount = customerTickets.count;
        }
      }
      const ticketsCount = employeeTicketsCount + customerTicketsCount;
      if (ticketsCount > 0) {
        console.log("Tickets loaded: " + employeeTicketsCount + " employee + " + customerTicketsCount + " customer = " + ticketsCount + " total");
      }
      const mappedLeadActivities: Activity[] = Array.isArray(leadsData) ? leadsData.map(mapLeadToActivity) : [];

      let allActivities: Activity[] = [];
      if (activitiesData?.activities && Array.isArray(activitiesData.activities)) {
        allActivities = [...(activitiesData.activities as Activity[]), ...mappedLeadActivities];
      } else {
        allActivities = mappedLeadActivities;
      }
      // Sort activities by created_at in descending order (most recent first)
      allActivities.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setActivities(allActivities);
      if (isMountedRef.current) {
        setMetrics({
          threads: sessionCount,
          documents: fileCount,
          leads: leadsCount,
          applicants: applicantsCount,
          tickets: ticketsCount
        });
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      if (isMountedRef.current) {
        setMetrics({
          threads: 0,
          documents: 0,
          leads: 0,
          applicants: 0,
          tickets: 0
        });
        setActivities([]);
        console.error('Dashboard data fetch failed, setting default values');
      }
    } finally {
      fetchingRef.current = false;
      if (isMountedRef.current) {
        setIsDataFetching(false);
        setActivitiesLoading(false);
      }
    }
  }, []);

  // Handle refresh action
  const handleRefresh = useCallback(() => {
    if (!isDataFetching) {
      fetchDashboardData();
    }
  }, [fetchDashboardData, isDataFetching]);
  // =============================================================================
  // DATA FETCHING LOGIC
  // =============================================================================
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);
  // =============================================================================
  // MAIN RENDER
  // =============================================================================
  // Modal states
  // const [isJobApplicationFormOpen, setIsJobApplicationFormOpen] = useState(false);
  // const [isLeadsFormOpen, setIsLeadsFormOpen] = useState(false);
  // const [isCustomerTicketOpen, setIsCustomerTicketOpen] = useState(false);
  // const [ticketType, setTicketType] = useState<'customer' | 'employee'>('customer');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-500">
      {/* Main Content Container */}
      <div className="w-full p-4 sm:p-6 lg:p-8 space-y-6">
        
        {/* Dashboard Header */}
        <DashboardHeader
          variant="default"
          size="md"
          title="Dashboard"
          subtitle="Overview of your business metrics and performance"
          icon={() => (
            <svg className="w-6 h-6 sm:w-8 sm:h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20 6h-2l-2-2H8L6 6H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zM10 4h4v2h-4V4zm8 14H6V8h12v10z"/>
            </svg>
          )}
          breadcrumbs={[
            { label: 'Home', href: '/' },
            { label: 'Dashboard', href: '/dashboard' }
          ]}
        />

        {/* ActionBar Filter Component */}
        <ActionBar
          filterQuery={filterQuery}
          setFilterQuery={setFilterQuery}
          showFilterField={showFilterField}
          setShowFilterField={setShowFilterField}
          filterField={filterField}
          setFilterField={setFilterField}
          timelineFilter={timelineFilter}
          setTimelineFilter={handleTimelineFilterChange}
          pendingCustomRange={pendingCustomRange}
          setPendingCustomRange={setPendingCustomRange}
          showCustomPopover={showCustomPopover}
          setShowCustomPopover={setShowCustomPopover}
          downloadMenuOpen={downloadMenuOpen}
          setDownloadMenuOpen={setDownloadMenuOpen}
          downloadMenuRef={downloadMenuRef}
          mobileDownloadMenuOpen={mobileDownloadMenuOpen}
          setMobileDownloadMenuOpen={setMobileDownloadMenuOpen}
          mobileDownloadMenuRef={mobileDownloadMenuRef}
          customPopoverRef={customPopoverRef}
          handleExport={() => {}}
          onRefresh={handleRefresh}
          onCreate={() => {}}
          searchPlaceholder="Search activities..."
          filterOptions={[]}
          showSearchInput={true}
          showFilterToggle={true}
          showFilterSelector={false}
          showTimelineSelector={true}
          showDownloadButton={false}
          showRefreshButton={true}
          showCreateButton={false}
          showUploadButton={false}
        />

        {/* Tier 1 — Business KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
          {/* KPI: Total Leads */}
          <Link href="/crm-leads" className="block group">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="relative overflow-hidden bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md hover:-translate-y-0.5 transform transition-all duration-200 ring-1 ring-transparent hover:ring-blue-300"
            >
              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-900/30">
                    <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M16 4c0-1.11.89-2 2-2s2 .89 2 2-.89 2-2 2-2-.89-2-2zm4 18v-6h2.5l-2.54-7.63A1.5 1.5 0 0 0 18.54 8H17c-.8 0-1.54.37-2.01.99L14 10.5c-.47-.62-1.21-.99-2.01-.99H9.46c-.8 0-1.54.37-2.01.99L6 10.5c-.47-.62-1.21-.99-2.01-.99H2.46c-.8 0-1.54.37-2.01.99L0 10.5v7.5h2v6h4v-6h2v6h4v-6h2v6h4zM12.5 11.5c.83 0 1.5-.67 1.5-1.5s-.67-1.5-1.5-1.5S11 9.17 11 10s.67 1.5 1.5 1.5z"/>
                    </svg>
                  </div>
                </div>
                <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">{filteredMetrics.leads}</div>
                <div className="flex items-center text-sm font-medium text-gray-600 dark:text-gray-400" title={`Leads: ${filteredMetrics.leads} (${kpiTrends.leads >= 0 ? '+' : '-'}${Math.abs(kpiTrends.leads)}% vs last week)`}>
                  Total Leads
                </div>
              </div>
            </motion.div>
          </Link>
          {/* KPI: Tickets */}
          <Link href="/helpdesk-employee-ticket" className="block group">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="relative overflow-hidden bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md hover:-translate-y-0.5 transform transition-all duration-200 ring-1 ring-transparent hover:ring-blue-300"
            >
              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-900/30">
                    <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4l4 4 4-4h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
                    </svg>
                  </div>
                </div>
                <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">{filteredMetrics.tickets}</div>
                <div className="flex items-center text-sm font-medium text-gray-600 dark:text-gray-400" title={`Employee Ticket: ${filteredMetrics.tickets} (${kpiTrends.tickets >= 0 ? '+' : '-'}${Math.abs(kpiTrends.tickets)}% vs last week)`}>
                  Employee Ticket
                </div>
              </div>
            </motion.div>
          </Link>
          
          {/* KPI: Applicants */}
          <Link href="/Jobs" className="block group">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="relative overflow-hidden bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md hover:-translate-y-0.5 transform transition-all duration-200 ring-1 ring-transparent hover:ring-blue-300"
            >
              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-900/30">
                    <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20 6h-2l-2-2H8L6 6H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zM10 4h4v2h-4V4zm8 14H6V8h12v10z"/>
                    </svg>
                  </div>
                </div>
                <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">{filteredMetrics.applicants}</div>
                <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Applicants</div>
              </div>
            </motion.div>
          </Link>

          {/* KPI: Documents */}
          <Link href="/customer" className="block group">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="relative overflow-hidden bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md hover:-translate-y-0.5 transform transition-all duration-200 ring-1 ring-transparent hover:ring-blue-300"
            >
              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-900/30">
                    <BookOpen className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">{filteredMetrics.documents}</div>
                <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Documents</div>
                <div className="absolute left-0 right-0 top-full mt-2 hidden group-hover:block z-20">
                  <div className="mx-auto w-full max-w-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-md p-3">
                    <div className="text-xs font-medium text-gray-700 dark:text-gray-200 mb-2">Breakdown</div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 dark:text-gray-300">
                      {Object.keys(documentsBreakdown).length === 0 ? (
                        <span className="text-gray-500 dark:text-gray-400">No breakdown available</span>
                      ) : (
                        Object.entries(documentsBreakdown).slice(0, 6).map(([ext, count]) => (
                          <div key={ext} className="flex items-center justify-between">
                            <span className="uppercase">{ext}</span>
                            <span className="font-semibold">{count}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </Link>
        </div>

        {/* Main Content Grid: Recent Activity + Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Recent Activity Section */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: 0.6 }} 
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 col-span-2 overflow-hidden"
          >
            <div className="sticky top-0 z-10 bg-slate-50 dark:bg-gray-800 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-slate-600 shadow-lg">
                    <MessageCircle className="w-5 h-5 text-white" />
              </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                Recent Activity
              </h3>
                </div>
                <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {visibleActivities.length} {visibleActivities.length === 1 ? 'item' : 'items'}
                </span>
                  <select
                    aria-label="Time filter"
                    value={timelineFilter}
                    onChange={(e) => handleTimelineFilterChange(e.target.value as TimelineFilter)}
                    className="px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-slate-500"
                  >
                    <option value="">All Time</option>
                    <option value="today">Today</option>
                    <option value="yesterday">Yesterday</option>
                    <option value="thisweek">This Week</option>
                    <option value="thismonth">This Month</option>
                  </select>
                </div>
              </div>
            </div>
            
            <div className="p-6">
              <ul className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
              {activitiesLoading ? (
                <li className="flex items-center justify-center py-8">
                  <div className="flex flex-col items-center gap-3">
                    <Loader />
                    <span className="text-gray-500 dark:text-gray-400 text-sm">Loading activities...</span>
                  </div>
                </li>
              ) : visibleActivities.length === 0 ? (
                <li className="text-gray-500 dark:text-gray-400 text-sm text-center py-8">
                  {timelineFilter ? "No activities found for the selected time period." : "No activity yet. Get started by adding your first lead."}
                </li>
              ) : (
                visibleActivities.map((item, idx) => {
                  const config = getActivityConfig(item);
                  const dateStr = new Date(item.created_at).toLocaleString();
                  return (
                    <li key={"activity-" + idx + "-" + item.created_at} className="relative pl-8">
                      <span className="absolute left-0 top-2 w-2 h-2 rounded-full bg-blue-500"></span>
                      <div className={`rounded-xl p-4 border ${config.cardBg} border-gray-100 dark:border-gray-700`}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${config.iconBg}`}>{config.icon}</div>
                            <div>
                              <div className="text-sm font-semibold text-gray-900 dark:text-white">{config.mainText} {config.badge}</div>
                              <div className="text-xs text-gray-600 dark:text-gray-300 mt-0.5">{dateStr}</div>
                              {config.subText && <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{config.subText}</div>}
                            </div>
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })
              )}
            </ul>
            </div>
          </motion.div>

          {/* Quick Actions Section */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: 0.7 }} 
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden"
          >
            <div className="sticky top-0 z-10 bg-slate-50 dark:bg-gray-800 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-slate-600 shadow-lg">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20 6h-2l-2-2H8L6 6H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zM10 4h4v2h-4V4zm8 14H6V8h12v10z"/>
                  </svg>
              </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                Quick Actions
              </h3>
                <button
                  className="ml-auto px-2 py-1 text-xs rounded-md bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600"
                  onClick={(e) => {
                    const section = (e.currentTarget.closest('div')?.parentElement?.parentElement) as HTMLElement | null;
                    if (section) section.classList.toggle('h-14');
                  }}
                  title="Collapse"
                  aria-label="Collapse quick actions"
                >
                  Collapse
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              {/* Add Lead CTA (Primary - Emerald) */}
              <button 
                onClick={() => setIsLeadsFormOpen(true)} 
                className="group relative w-full overflow-hidden rounded-2xl p-5 transition-all duration-200 border focus:outline-none focus:ring-2 focus:ring-blue-500 bg-blue-600 hover:bg-blue-700 text-white hover:-translate-y-0.5 border-blue-600"
                title="Add a new lead"
                aria-label="Add Lead"
              >
                <div className="flex items-center gap-4 text-left">
                  <div className="relative z-10 flex items-center justify-center w-12 h-12 bg-white/20 rounded-xl shadow-sm group-hover:shadow-md transition-all">
                    <Users className="w-5 h-5 text-white" />
                  </div>
                  <div className="relative z-10">
                    <span className="font-semibold text-base text-white">Add Lead</span>
                    <p className="text-sm text-white/80 mt-0.5">Turn new opportunities into conversions — add a lead in seconds.</p>
                  </div>
                </div>
              </button>

              {/* Create Ticket CTA (Secondary - Blue) */}
              <button 
                onClick={() => { setTicketType('customer'); setIsCustomerTicketOpen(true); }}
                className="group relative w-full overflow-hidden rounded-2xl p-5 transition-all duration-200 border focus:outline-none focus:ring-2 focus:ring-blue-500 bg-blue-600 hover:bg-blue-700 text-white hover:-translate-y-0.5 border-blue-600"
                title="Create a support ticket"
                aria-label="Create Ticket"
              >
                <div className="flex items-center gap-4 text-left">
                  <div className="relative z-10 flex items-center justify-center w-12 h-12 bg-white/20 rounded-xl shadow-sm group-hover:shadow-md transition-all">
                    <MessageSquare className="w-5 h-5 text-white" />
                  </div>
                  <div className="relative z-10">
                    <span className="font-semibold text-base text-white">Create Ticket</span>
                    <p className="text-sm text-white/80 mt-0.5">Resolve issues faster — create a support ticket.</p>
                  </div>
                </div>
              </button>

              {/* New Applicants CTA */}
              <button 
                onClick={() => setIsJobApplicationFormOpen(true)} 
                className="group relative w-full overflow-hidden rounded-2xl p-5 transition-all duration-200 border focus:outline-none focus:ring-2 focus:ring-blue-500 bg-blue-600 hover:bg-blue-700 text-white hover:-translate-y-0.5 border-blue-600"
                title="Add job applicants"
                aria-label="New Applicants"
              >
                <div className="flex items-center gap-4 text-left">
                  <div className="relative z-10 flex items-center justify-center w-12 h-12 bg-white/20 rounded-xl shadow-sm group-hover:shadow-md transition-all">
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20 6h-2l-2-2H8L6 6H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zM10 4h4v2h-4V4zm8 14H6V8h12v10z"/>
                  </svg>
                  </div>
                  <div className="relative z-10">
                    <span className="font-semibold text-base text-white">New Applicants</span>
                    <p className="text-sm text-white/80 mt-0.5">Grow your team — add a new applicant.</p>
                  </div>
                </div>
              </button>
            </div>
          </motion.div>
        </div>

        {/* Enhanced Dashboard Chart Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden"
        >
          <div className="bg-gray-50 dark:bg-gray-800 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-blue-600 shadow-lg">
                <Briefcase className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                Analytics Overview
              </h3>
            </div>
            </div>
            
          <div className="p-6">
            {/* Enhanced Bar Chart Component */}
            <div className="relative">
              <div className="absolute inset-0 bg-gray-50 dark:bg-gray-900/10 rounded-xl opacity-50"></div>
              <div className="relative z-10">
                <BarChartOne data={chartData} />
              </div>
            </div>
          </div>
        </motion.div>
      </div>
      {/* =============================================================================
          MODAL COMPONENTS
          ============================================================================= */}

 

      {/* Job Application Form Modal */}
      <JobApplicationForm 
        open={isJobApplicationFormOpen} 
        onClose={() => setIsJobApplicationFormOpen(false)} 
      />
      {/* Leads Form Modal */}
      <LeadsForm 
        open={isLeadsFormOpen} 
        onClose={() => setIsLeadsFormOpen(false)} 
        showAlert={() => {}} 
        onSuccess={() => setIsLeadsFormOpen(false)} 
      />
      {/* Ticket Modals - Conditional rendering based on ticket type */}
      {isCustomerTicketOpen && (
        ticketType === 'customer' ? (
          <CustomerTicketForm
            open={isCustomerTicketOpen}
            onClose={() => setIsCustomerTicketOpen(false)}
            onSwitchType={(type: 'customer' | 'employee') => setTicketType(type)}
          />
        ) : (
          <EmployeeTicketForm
            open={isCustomerTicketOpen}
            onClose={() => setIsCustomerTicketOpen(false)}
            onSwitchType={(type: 'customer' | 'employee') => setTicketType(type)}
          />
        )
      )}
    </div>
  );
}
