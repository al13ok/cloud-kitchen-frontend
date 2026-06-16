'use client';
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, 
  MessageSquare, 
  BarChart3,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Loader2,
  ArrowLeft,
  RefreshCw
} from 'lucide-react';
import Link from 'next/link';
import { Ticket, User, DashboardMetrics } from '@/types/servicedesk';
import { getAuthHeaders, BACKEND_URL } from '@/utils/api';
import { safeParseDate } from '@/utils/timeUtils';
import dynamic from 'next/dynamic';
import { ApexOptions } from 'apexcharts';
import DashboardHeader from '@/components/header/DashboardHeader';

type SlaComplianceSummary = {
  compliance_rate?: number;
  met?: number;
  breached?: number;
  at_risk?: number;
  pending?: number;
};

type SlaAverageTimes = {
  resolution_minutes?: number;
  first_response_minutes?: number;
};

interface SlaReportSummary {
  sla_compliance?: SlaComplianceSummary;
  average_times?: SlaAverageTimes;
}

const ReactApexChart = dynamic(() => import('react-apexcharts'), { ssr: false });

export default function AdminDashboardPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    total_tickets: 0,
    open_tickets: 0,
    resolved_tickets: 0,
    pending_tickets: 0,
    sla_compliance: 0,
    avg_resolution_time: 0,
    customer_satisfaction: 0
  });
  const [slaReport, setSlaReport] = useState<SlaReportSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [, setLastUpdated] = useState<string>('');


  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      
      // Use the backend URL as configured, support both HTTP and HTTPS
      let baseUrl = BACKEND_URL || process.env['NEXT_PUBLIC_API_URL'] || 'https://py-mobiloitte.converiqo.ai';
      
      // Remove trailing slash if present
      baseUrl = baseUrl.replace(/\/$/, '');
      
      // Only convert to HTTPS if explicitly configured or if it's a production domain (not localhost/127.0.0.1)
      // This allows HTTP for local development
      if (baseUrl.startsWith('http://') && 
          !baseUrl.includes('localhost') && 
          !baseUrl.includes('127.0.0.1') &&
          !baseUrl.includes('0.0.0.0')) {
        // For non-local URLs, try HTTPS first but allow fallback
        baseUrl = baseUrl.replace('http://', 'https://');
      }
      
      try {
        const headers = getAuthHeaders();

        // Fetch tickets (both customer and employee tickets) and SLA report
        // Note: helpdesk router is registered with /api/v1 prefix
        // Use fetch with error handling that works for both HTTP and HTTPS
        const fetchWithFallback = async (url: string, options: RequestInit) => {
          try {
            const response = await fetch(url, options);
            return response;
          } catch (error) {
            // If HTTPS fails and URL is HTTPS, try HTTP fallback for localhost
            if (url.startsWith('https://') && (url.includes('localhost') || url.includes('127.0.0.1'))) {
              const httpUrl = url.replace('https://', 'http://');
              console.warn(`HTTPS failed for ${url}, trying HTTP fallback: ${httpUrl}`);
              return await fetch(httpUrl, options);
            }
            throw error;
          }
        };
        
        const [customerTicketsRes, employeeTicketsRes, slaReportRes] = await Promise.allSettled([
          fetchWithFallback(`${baseUrl}/api/v1/helpdesk/tickets`, { headers }),
          fetchWithFallback(`${baseUrl}/api/v1/helpdesk/employee/tickets`, { headers }),
          fetchWithFallback(`${baseUrl}/api/v1/servicedesk/sla/reports/summary`, { headers })
        ]);

        // Process customer tickets from GET /api/v1/helpdesk/tickets
        let customerTickets: Ticket[] = [];
        let rawCustomerTickets: Record<string, unknown>[] = [];
        if (customerTicketsRes.status === 'fulfilled') {
          if (customerTicketsRes.value.ok) {
            try {
              const customerData = await customerTicketsRes.value.json();
              const ticketsArray = Array.isArray(customerData) ? customerData : (customerData.tickets || customerData.data || []);
              console.log('✅ Customer tickets fetched from /api/v1/helpdesk/tickets:', ticketsArray.length);
              console.log('📋 Sample ticket data:', ticketsArray.length > 0 ? ticketsArray[0] : 'No tickets');
              rawCustomerTickets = ticketsArray; // Store raw tickets for customer extraction
              customerTickets = ticketsArray.length > 0 
                ? ticketsArray.map((ticket: Record<string, unknown>) => transformTicket(ticket))
                : [];
            } catch (e) {
              console.error('❌ Error parsing customer tickets:', e);
            }
          } else {
            const errorText = await customerTicketsRes.value.text().catch(() => 'Unknown error');
            console.warn('❌ Customer tickets API failed:', customerTicketsRes.value.status, customerTicketsRes.value.statusText, errorText);
          }
        } else {
          console.error('❌ Customer tickets fetch failed:', customerTicketsRes.reason);
        }

        // Process employee tickets
        let employeeTickets: Ticket[] = [];
        if (employeeTicketsRes.status === 'fulfilled') {
          if (employeeTicketsRes.value.ok) {
            try {
              const employeeData = await employeeTicketsRes.value.json();
              const ticketsArray = Array.isArray(employeeData) ? employeeData : (employeeData.tickets || employeeData.data || []);
              console.log('Employee tickets fetched:', ticketsArray.length, ticketsArray);
              employeeTickets = ticketsArray.length > 0 
                ? ticketsArray.map((ticket: Record<string, unknown>) => transformTicket(ticket))
                : [];
            } catch (e) {
              console.error('Error parsing employee tickets:', e);
            }
          } else {
            console.warn('Employee tickets API failed:', employeeTicketsRes.value.status, employeeTicketsRes.value.statusText);
          }
        } else {
          console.error('Employee tickets fetch failed:', employeeTicketsRes.reason);
        }

        // Combine all tickets
        const allTickets = [...customerTickets, ...employeeTickets];
        console.log('Total tickets after combining:', allTickets.length);
        
        // Always use real data, even if empty
          setTickets(allTickets);
        if (allTickets.length > 0) {
          console.log('✅ Using real API data for tickets');
        } else {
          console.warn('⚠️ No tickets found from API');
        }

        // Extract unique customers from GET /api/v1/helpdesk/tickets endpoint
        // Use raw ticket data directly from API response (before transformation)
        // The API returns: name, email, phone, created_at fields directly
        const customerMap = new Map<string, { name: string; email: string; created_at: Date }>();
        
        console.log(`🔍 Processing ${rawCustomerTickets.length} raw customer tickets for customer extraction`);
        
        // Process raw customer tickets from /api/v1/helpdesk/tickets
        rawCustomerTickets.forEach((ticket: Record<string, unknown>, index: number) => {
          // Get customer name and email directly from ticket API response
          // Check multiple possible field names
          const name = typeof ticket.name === 'string' ? ticket.name.trim() : 
                      (typeof ticket.customer_name === 'string' ? ticket.customer_name.trim() : '');
          const email = typeof ticket.email === 'string' ? ticket.email.trim().toLowerCase() : 
                       (typeof ticket.customer_email === 'string' ? ticket.customer_email.trim().toLowerCase() : '');
          const createdAt = ticket.created_at;
          
          // Debug first few tickets
          if (index < 3) {
            console.log(`📝 Ticket ${index + 1}:`, {
              name: name || 'MISSING',
              email: email || 'MISSING',
              hasName: !!name,
              hasEmail: !!email,
              rawTicket: ticket
            });
          }
          
          // Only process if we have both email and a valid name
          if (email && name && name !== 'Unknown' && name !== '' && name.length > 0) {
            const existing = customerMap.get(email);
            // Parse created_at date
            let ticketDate = new Date();
            if (createdAt) {
              try {
                ticketDate = typeof createdAt === 'string' ? new Date(createdAt) : new Date(String(createdAt));
                if (isNaN(ticketDate.getTime())) {
                  ticketDate = new Date();
                }
              } catch {
                ticketDate = new Date();
              }
            }
            
            // Keep the most recent ticket's name for each customer
            if (!existing || ticketDate > existing.created_at) {
              customerMap.set(email, {
                name: name,
                email: email,
                created_at: ticketDate
              });
            }
          } else if (index < 5) {
            console.warn(`⚠️ Skipping ticket ${index + 1} - missing data:`, {
              hasName: !!name,
              hasEmail: !!email,
              nameValue: name,
              emailValue: email
            });
          }
        });
        
        console.log(`✅ Extracted ${customerMap.size} unique customers from /api/v1/helpdesk/tickets`);
        if (customerMap.size > 0) {
          console.log('📋 Sample customers:', Array.from(customerMap.values()).slice(0, 3));
        }

        // Convert customer map to User array
        const customersFromTickets: User[] = Array.from(customerMap.values()).map(customer => ({
          id: customer.email, // Use email as ID for customers
          full_name: customer.name,
          email: customer.email,
          role: 'customer' as const,
          is_active: true,
          created_at: customer.created_at.toISOString(), // Convert Date to string
          updated_at: undefined
        }));

        // Use only customers from tickets (no API users endpoint)
        console.log('📊 Customer Summary:');
        console.log('  - Customers from tickets:', customersFromTickets.length);
        console.log('  - Total customers:', customersFromTickets.length);
        
        // Always use real data, even if empty
        setUsers(customersFromTickets);
        if (customersFromTickets.length > 0) {
          console.log('✅ Using customer data from tickets only');
        } else {
          console.warn('⚠️ No customers found from tickets');
          console.warn('  - Raw customer tickets count:', rawCustomerTickets.length);
          console.warn('  - Customer map size:', customerMap.size);
        }

        // Process SLA summary report
        let slaReportData: SlaReportSummary | null = null;
        if (slaReportRes.status === 'fulfilled' && slaReportRes.value.ok) {
          try {
            slaReportData = await slaReportRes.value.json();
            console.log('✅ SLA Summary Report fetched:', slaReportData);
            setSlaReport(slaReportData);
          } catch (e) {
            console.error('❌ Error parsing SLA report:', e);
          }
        } else {
          if (slaReportRes.status === 'fulfilled') {
            const errorText = await slaReportRes.value.text().catch(() => 'Unknown error');
            console.warn('⚠️ SLA Report API failed:', slaReportRes.value.status, slaReportRes.value.statusText, errorText);
          } else {
            console.error('❌ SLA Report fetch failed:', slaReportRes.reason);
          }
        }

        // Calculate metrics from fetched data (always calculate, even if empty)
          const calculatedMetrics = calculateMetrics(allTickets);
          setMetrics(calculatedMetrics);
        console.log('📊 Calculated metrics:', calculatedMetrics);
        setLastUpdated(new Date().toISOString());

      } catch (err) {
        console.error('❌ Error fetching dashboard data:', err);
        
        // Provide more specific error messages
        let errorMessage = 'Failed to load dashboard data. Please refresh the page.';
        if (err instanceof TypeError && err.message.includes('fetch')) {
          errorMessage = `Unable to connect to the server at ${baseUrl}. Please check your connection and ensure the backend is running.`;
        } else if (err instanceof Error) {
          errorMessage = `Error: ${err.message}`;
        }
        
        console.error('Dashboard error:', errorMessage);
        // Don't set mock data - keep empty arrays to show empty states
        setTickets([]);
        setUsers([]);
        setMetrics({
          total_tickets: 0,
          open_tickets: 0,
          resolved_tickets: 0,
          pending_tickets: 0,
          sla_compliance: 0,
          avg_resolution_time: 0,
          customer_satisfaction: 0
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [refreshKey]);

  // Transform backend ticket to frontend Ticket format
  const transformTicket = (ticket: Record<string, unknown>): Ticket => {
    // Map backend fields to frontend format
    // Backend uses: _id, ticket_id, display_id, name, email, issue_type, issue, message, status, assigned_to, created_at, score, severity
    // Frontend expects: id, ticket_number, subject, description, priority, status, requester_name, requester_id, created_at, updated_at, sla_status
    
    // Map priority from severity or score
    let priority: Ticket['priority'] = 'medium';
    const severity = typeof ticket.severity === 'string' ? ticket.severity.toLowerCase() : '';
    const score = typeof ticket.score === 'number' ? ticket.score : 0;
    if (severity.includes('critical') || severity.includes('urgent') || score >= 80) {
      priority = 'urgent';
    } else if (severity.includes('high') || score >= 60) {
      priority = 'high';
    } else if (severity.includes('low') || score <= 30) {
      priority = 'low';
    }

    // Normalize status
    let status = (typeof ticket.status === 'string' ? ticket.status : 'open').toLowerCase().replace(/ /g, '_');
    if (!['open', 'pending', 'in_progress', 'resolved', 'closed'].includes(status)) {
      status = 'open';
    }

    // Use issue as subject, issue_type + issue as description
    const issueStr = typeof ticket.issue === 'string' ? ticket.issue : '';
    const messageStr = typeof ticket.message === 'string' ? ticket.message : '';
    const issueTypeStr = typeof ticket.issue_type === 'string' ? ticket.issue_type : '';
    const subject = issueStr || (messageStr ? messageStr.substring(0, 50) : '') || 'No subject';
    const description = messageStr || `${issueTypeStr} - ${issueStr}`.trim() || 'No description';

    // Format dates using safe utility function
    const created_at = safeParseDate(ticket.created_at);
    const updated_at_raw = ticket.updated_at || ticket.modified_at || ticket.created_at;
    const updated_at = updated_at_raw ? safeParseDate(updated_at_raw, new Date(created_at)) : created_at;

    // Create ticket number from ticket_id or display_id
    const displayId = typeof ticket.display_id === 'string' ? ticket.display_id : '';
    const ticketId = typeof ticket.ticket_id === 'string' ? ticket.ticket_id : '';
    const ticketIdRaw = ticket._id;
    const ticketIdStr = typeof ticketIdRaw === 'string' ? ticketIdRaw : (ticketIdRaw ? String(ticketIdRaw) : '');
    const ticket_number = displayId || ticketId || `TKT-${ticketIdStr ? ticketIdStr.slice(-6) : '000000'}`;

    // Get ID fields
    const idRaw = ticket._id || ticket.id;
    const id = typeof idRaw === 'string' ? idRaw : (idRaw ? String(idRaw) : String(Math.random()));
    
    // Get requester name and email
    const nameStr = typeof ticket.name === 'string' ? ticket.name : '';
    const emailStr = typeof ticket.email === 'string' ? ticket.email : '';
    const requester_name = nameStr || (emailStr ? emailStr.split('@')[0] : '') || 'Unknown';
    const requester_email = emailStr || '';

    // Get assignee info
    const assignedTo = ticket.assigned_to;
    let assignee_id: string | undefined;
    let assignee_name: string | undefined;
    if (assignedTo) {
      if (typeof assignedTo === 'string') {
        assignee_id = assignedTo;
        assignee_name = assignedTo;
      } else if (typeof assignedTo === 'object' && assignedTo !== null) {
        const assignedToObj = assignedTo as Record<string, unknown>;
        assignee_id = typeof assignedToObj._id === 'string' ? assignedToObj._id : (typeof assignedToObj.id === 'string' ? assignedToObj.id : undefined);
        assignee_name = typeof assignedToObj.name === 'string' ? assignedToObj.name : (typeof assignedToObj.email === 'string' ? assignedToObj.email : undefined);
      }
    }

    // Get attachments count
    const attachments = Array.isArray(ticket.attachments) ? ticket.attachments.length : (ticket.attachments ? 1 : 0);

    // Get tags
    const tagsRaw = ticket.tags;
    const tags = Array.isArray(tagsRaw) && tagsRaw.every(tag => typeof tag === 'string') 
      ? tagsRaw as string[] 
      : (issueTypeStr ? [issueTypeStr] : []);

    // Get SLA status
    const slaStatusRaw = ticket.sla_status;
    type SLAStatus = 'pending' | 'on_time' | 'at_risk' | 'breached';
    let sla_status: Ticket['sla_status'];
    if (slaStatusRaw && typeof slaStatusRaw === 'object' && slaStatusRaw !== null && 'status' in slaStatusRaw) {
      const slaObj = slaStatusRaw as { status: unknown; resolution_due?: unknown };
      const statusValue = slaObj.status;
      const validStatuses: SLAStatus[] = ['pending', 'on_time', 'at_risk', 'breached'];
      const slaStatus: SLAStatus = (typeof statusValue === 'string' && validStatuses.includes(statusValue as SLAStatus))
        ? statusValue as SLAStatus
        : 'pending';
      sla_status = {
        status: slaStatus,
        resolution_due: typeof slaObj.resolution_due === 'string' ? slaObj.resolution_due : undefined
      };
    } else {
      sla_status = {
        status: 'pending' as const,
        resolution_due: typeof ticket.resolution_due === 'string' ? ticket.resolution_due : undefined
      };
    }

    return {
      id: id,
      ticket_number: ticket_number,
      subject: subject,
      description: description,
      priority: priority,
      status: status as Ticket['status'],
      requester_id: id,
      requester_name: requester_name,
      requester_email: requester_email, // Add email to ticket for customer extraction
      assignee_id: assignee_id,
      assignee_name: assignee_name,
      attachments: attachments,
      tags: tags,
      created_at: created_at,
      updated_at: updated_at,
      sla_status: sla_status
    } as Ticket & { requester_email?: string }; // Extend Ticket type temporarily
  };

  // Calculate metrics from tickets
  const calculateMetrics = (tickets: Ticket[]): DashboardMetrics => {
    const totalTickets = tickets.length;
    const openTickets = tickets.filter(t => t.status === 'open' || t.status === 'in_progress').length;
    const resolvedTickets = tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length;
    const pendingTickets = tickets.filter(t => t.status === 'pending').length;

    // Calculate SLA compliance (tickets resolved on time)
    const ticketsWithSLA = tickets.filter(t => t.sla_status?.resolution_due);
    const onTimeResolved = ticketsWithSLA.filter(t => {
      if (t.status !== 'resolved' && t.status !== 'closed') return false;
      if (!t.sla_status?.resolution_due) return false;
      const resolvedAt = new Date(t.updated_at);
      const dueDate = new Date(t.sla_status.resolution_due);
      return resolvedAt <= dueDate;
    }).length;
    const slaCompliance = ticketsWithSLA.length > 0 
      ? Math.round((onTimeResolved / ticketsWithSLA.length) * 100) 
      : 0;

    // Calculate average resolution time (in hours)
    const resolvedTicketsWithDates = tickets
      .filter(t => (t.status === 'resolved' || t.status === 'closed') && t.created_at && t.updated_at)
      .map(t => {
        const created = new Date(t.created_at);
        const resolved = new Date(t.updated_at);
        return (resolved.getTime() - created.getTime()) / (1000 * 60 * 60); // Convert to hours
      });
    const avgResolutionTime = resolvedTicketsWithDates.length > 0
      ? Math.round(resolvedTicketsWithDates.reduce((a, b) => a + b, 0) / resolvedTicketsWithDates.length)
      : 0;

    // Customer satisfaction - calculate from resolved tickets or set to 0 if no data
    // TODO: Fetch from feedback/rating API when available
    const customerSatisfaction = 0; // Will be updated when feedback API is integrated

    return {
      total_tickets: totalTickets,
      open_tickets: openTickets,
      resolved_tickets: resolvedTickets,
      pending_tickets: pendingTickets,
      sla_compliance: slaCompliance,
      avg_resolution_time: avgResolutionTime,
      customer_satisfaction: customerSatisfaction
    };
  };

  // Calculate admin-specific metrics
  // Use SLA report data if available, otherwise fall back to calculated metrics
  const getSlaCompliance = () => {
    if (slaReport?.sla_compliance?.compliance_rate !== undefined) {
      return Math.round(slaReport.sla_compliance.compliance_rate);
    }
    return metrics.sla_compliance;
  };

  const getAvgResolutionTime = () => {
    if (slaReport?.average_times?.resolution_minutes !== undefined) {
      // Convert minutes to hours, round to nearest hour
      return Math.round(slaReport.average_times.resolution_minutes / 60);
    }
    return metrics.avg_resolution_time;
  };

  const getOverdueTickets = () => {
    // Use SLA report breached + at_risk tickets if available
    if (slaReport?.sla_compliance) {
      return (slaReport.sla_compliance.breached || 0) + (slaReport.sla_compliance.at_risk || 0);
    }
    // Fallback to calculated overdue tickets
    return tickets.filter(t => {
      if (!t.sla_status?.resolution_due) return false;
      return new Date(t.sla_status.resolution_due) < new Date() && t.status !== 'resolved' && t.status !== 'closed';
    }).length;
  };

  const adminMetrics = {
    totalUsers: users.length,
    activeUsers: users.filter(u => u.is_active).length,
    totalTickets: tickets.length,
    openTickets: tickets.filter(t => t.status === 'open' || t.status === 'in_progress').length,
    overdueTickets: getOverdueTickets(),
    slaCompliance: getSlaCompliance(),
    avgResolutionTime: getAvgResolutionTime(),
    customerSatisfaction: metrics.customer_satisfaction,
    // Additional SLA metrics from report
    slaMet: slaReport?.sla_compliance?.met || 0,
    slaBreached: slaReport?.sla_compliance?.breached || 0,
    slaAtRisk: slaReport?.sla_compliance?.at_risk || 0,
    slaPending: slaReport?.sla_compliance?.pending || 0,
    avgResponseTime: slaReport?.average_times?.first_response_minutes 
      ? Math.round(slaReport.average_times.first_response_minutes / 60) 
      : 0
  };

  // Get recent activity
  const recentTickets = tickets
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  const recentUsers = users
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  const handleManualRefresh = () => setRefreshKey((prev) => prev + 1);
  const formattedResolution = metrics.avg_resolution_time ? `${Math.round(metrics.avg_resolution_time)}h` : '—';
  const slaCardValue = getSlaCompliance() ?? 0;
  const formattedSla = `${Math.round(slaCardValue)}%`;

  const heroGradient = 'from-sky-500 via-indigo-500 to-purple-500';

  const headerHighlights = [
    {
      label: 'Total Tickets',
      value: metrics.total_tickets,
      gradient: heroGradient
    },
    {
      label: 'Open Tickets',
      value: metrics.open_tickets,
      gradient: heroGradient
    },
    {
      label: 'SLA Compliance',
      value: formattedSla,
      gradient: heroGradient
    },
    {
      label: 'Avg Resolution',
      value: formattedResolution,
      gradient: heroGradient
    }
  ];

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40 dark:from-gray-900 dark:via-slate-900 dark:to-indigo-950/50">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600 dark:text-blue-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400 font-medium">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40 dark:from-gray-900 dark:via-slate-900 dark:to-indigo-950/50 transition-colors duration-500">
      <div className="w-full flex flex-col items-center p-4 sm:p-6 md:p-8 gap-6 lg:gap-8">
        
        {/* Enhanced Page Header */}
        <div className="w-full max-w-screen-xl">
          <DashboardHeader
            title="Self Service Dashboard"
            subtitle="Monitor live ticket queues, SLA performance, and customer satisfaction in one command center."
            icon={BarChart3}
            iconColor="text-white"
            variant="default"
            size="lg"
            breadcrumbs={[
              { label: 'Home', href: '/' },
              { label: 'Service Desk', href: '/servicedesk/servicedesk-dashboard' },
              { label: 'Self Service Dashboard' }
            ]}
            actions={
              <div className="flex flex-wrap items-center gap-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleManualRefresh}
                  disabled={loading}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl font-semibold bg-white/20 backdrop-blur-sm text-white border border-white/30 shadow-lg hover:bg-white/30 hover:shadow-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  {loading ? 'Refreshing...' : 'Refresh Data'}
                </motion.button>
                <Link href="/servicedesk/servicedesk-reporting" className="inline-block">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl font-semibold border border-white/30 text-white bg-white/10 backdrop-blur-sm shadow-md hover:bg-white/20 hover:shadow-lg transition-all"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Reporting Hub
                  </motion.button>
                </Link>
              </div>
            }
          />
          
          {/* Header Highlights Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            {headerHighlights.map((item) => (
              <div
                key={item.label}
                className={`rounded-2xl border border-white/40 dark:border-white/5 bg-gradient-to-br ${item.gradient} text-white/90 px-4 py-3 shadow-lg`}
              >
                <p className="text-xs uppercase tracking-wide">{item.label}</p>
                <p className="text-2xl font-bold mt-1">{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="w-full max-w-screen-xl grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          
          {/* Enhanced Recent Tickets */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
          >
            <div className="relative bg-gradient-to-br from-white via-white to-blue-50/30 dark:from-gray-800 dark:via-gray-800 dark:to-blue-950/20 border border-gray-200/60 dark:border-gray-700/60 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 h-full overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-500"></div>
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-md">
                      <MessageSquare className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">Recent Tickets</h3>
                  </div>
                </div>
                <div className="space-y-3">
                  {recentTickets.map((ticket, index) => (
                    <motion.div
                      key={ticket.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.6 + index * 0.1 }}
                      className="group p-4 bg-gradient-to-r from-gray-50 to-white dark:from-gray-700/50 dark:to-gray-800/50 rounded-xl border border-gray-200/50 dark:border-gray-700/50 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-md transition-all duration-300 cursor-pointer"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                          #{ticket.ticket_number}
                        </span>
                        </div>
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold shadow-sm ${
                          ticket.priority === 'urgent' ? 'bg-gradient-to-r from-red-500 to-red-600 text-white' :
                          ticket.priority === 'high' ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white' :
                          ticket.priority === 'medium' ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white' :
                          'bg-gradient-to-r from-green-500 to-green-600 text-white'
                        }`}>
                          {ticket.priority.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white mb-3 line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {ticket.subject}
                      </p>
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <Users className="w-3.5 h-3.5 text-gray-400" />
                          <span className="text-gray-600 dark:text-gray-400 font-medium">{ticket.requester_name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-gray-400" />
                          <span className="text-gray-500 dark:text-gray-500">{new Date(ticket.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                  {recentTickets.length === 0 && (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                        <MessageSquare className="w-8 h-8 text-gray-400" />
                      </div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No recent tickets</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Enhanced Recent Users */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
          >
            <div className="relative bg-gradient-to-br from-white via-white to-purple-50/30 dark:from-gray-800 dark:via-gray-800 dark:to-purple-950/20 border border-gray-200/60 dark:border-gray-700/60 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 h-full overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-pink-500 to-indigo-500"></div>
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-md">
                      <Users className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">Recent Customers</h3>
                  </div>
                </div>
                <div className="space-y-3">
                  {recentUsers.map((user, index) => (
                    <motion.div
                      key={user.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.7 + index * 0.1 }}
                      className="group p-4 bg-gradient-to-r from-gray-50 to-white dark:from-gray-700/50 dark:to-gray-800/50 rounded-xl border border-gray-200/50 dark:border-gray-700/50 hover:border-purple-300 dark:hover:border-purple-700 hover:shadow-md transition-all duration-300 cursor-pointer"
                    >
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 via-pink-500 to-indigo-500 rounded-full flex items-center justify-center text-white font-bold text-base shadow-lg group-hover:scale-110 transition-transform duration-300">
                          {user.full_name.charAt(0).toUpperCase()}
                          </div>
                          {user.is_active && (
                            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full"></div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                            {user.full_name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                            {user.email}
                          </p>
                        </div>
                        <span className={`px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm whitespace-nowrap ${
                          user.role === 'customer' ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white' :
                          user.role === 'agent' ? 'bg-gradient-to-r from-green-500 to-green-600 text-white' :
                          user.role === 'admin' ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white' :
                          'bg-gradient-to-r from-red-500 to-red-600 text-white'
                        }`}>
                          {user.role.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                  {recentUsers.length === 0 && (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Users className="w-8 h-8 text-gray-400" />
                      </div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No recent customers</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Enhanced Performance Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="w-full max-w-screen-xl"
        >
          <div className="relative bg-gradient-to-br from-white via-white to-indigo-50/30 dark:from-gray-800 dark:via-gray-800 dark:to-indigo-950/20 border border-gray-200/60 dark:border-gray-700/60 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
            <div className="p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl shadow-md">
                  <BarChart3 className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Performance Overview</h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.8 }}
                  className="group text-center p-5 bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/20 dark:to-gray-800 rounded-xl border border-blue-200/50 dark:border-blue-800/50 hover:shadow-lg transition-all duration-300"
                >
                  <div className="text-3xl sm:text-4xl font-extrabold bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-400 dark:to-blue-500 bg-clip-text text-transparent mb-2 group-hover:scale-110 transition-transform duration-300">
                    {adminMetrics.avgResolutionTime}h
                  </div>
                  <div className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">Avg Resolution Time</div>
                  <div className="mt-2 flex items-center justify-center gap-1 text-xs text-blue-600 dark:text-blue-400">
                    <TrendingUp className="w-3 h-3" />
                    <span>{slaReport ? 'From SLA Report' : 'Calculated'}</span>
                </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.85 }}
                  className="group text-center p-5 bg-gradient-to-br from-green-50 to-white dark:from-green-950/20 dark:to-gray-800 rounded-xl border border-green-200/50 dark:border-green-800/50 hover:shadow-lg transition-all duration-300"
                >
                  <div className="text-3xl sm:text-4xl font-extrabold bg-gradient-to-r from-green-600 to-green-700 dark:from-green-400 dark:to-green-500 bg-clip-text text-transparent mb-2 group-hover:scale-110 transition-transform duration-300">
                    {adminMetrics.customerSatisfaction > 0 ? `${adminMetrics.customerSatisfaction.toFixed(1)}/5` : metrics.resolved_tickets}
                  </div>
                  <div className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">Customer Satisfaction</div>
                  <div className="mt-2 flex items-center justify-center gap-1 text-xs text-green-600 dark:text-green-400">
                    {adminMetrics.customerSatisfaction > 0 ? (
                      <>
                        <CheckCircle className="w-3 h-3" />
                        <span>{adminMetrics.customerSatisfaction >= 4 ? 'Excellent' : adminMetrics.customerSatisfaction >= 3 ? 'Good' : 'Needs Improvement'}</span>
                      </>
                    ) : (
                      <span className="text-gray-400">Resolved Tickets</span>
                    )}
                </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.9 }}
                  className="group text-center p-5 bg-gradient-to-br from-purple-50 to-white dark:from-purple-950/20 dark:to-gray-800 rounded-xl border border-purple-200/50 dark:border-purple-800/50 hover:shadow-lg transition-all duration-300"
                >
                  <div className="text-3xl sm:text-4xl font-extrabold bg-gradient-to-r from-purple-600 to-purple-700 dark:from-purple-400 dark:to-purple-500 bg-clip-text text-transparent mb-2 group-hover:scale-110 transition-transform duration-300">
                    {adminMetrics.slaCompliance}%
                  </div>
                  <div className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">SLA Compliance</div>
                  <div className="mt-2 flex items-center justify-center gap-1 text-xs text-purple-600 dark:text-purple-400">
                    {adminMetrics.slaCompliance >= 90 ? (
                      <>
                        <CheckCircle className="w-3 h-3" />
                        <span>Excellent</span>
                      </>
                    ) : adminMetrics.slaCompliance >= 75 ? (
                      <>
                    <TrendingUp className="w-3 h-3" />
                        <span>Good</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-3 h-3" />
                        <span>Needs Improvement</span>
                      </>
                    )}
                </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.95 }}
                  className="group text-center p-5 bg-gradient-to-br from-orange-50 to-white dark:from-orange-950/20 dark:to-gray-800 rounded-xl border border-orange-200/50 dark:border-orange-800/50 hover:shadow-lg transition-all duration-300"
                >
                  <div className="text-3xl sm:text-4xl font-extrabold bg-gradient-to-r from-orange-600 to-orange-700 dark:from-orange-400 dark:to-orange-500 bg-clip-text text-transparent mb-2 group-hover:scale-110 transition-transform duration-300">
                    {adminMetrics.overdueTickets}
                  </div>
                  <div className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">Overdue Tickets</div>
                  <div className="mt-2 flex items-center justify-center gap-1 text-xs text-orange-600 dark:text-orange-400">
                    <AlertTriangle className="w-3 h-3" />
                    <span>
                      {adminMetrics.slaBreached > 0 && `${adminMetrics.slaBreached} Breached`}
                      {adminMetrics.slaBreached > 0 && adminMetrics.slaAtRisk > 0 && ' • '}
                      {adminMetrics.slaAtRisk > 0 && `${adminMetrics.slaAtRisk} At Risk`}
                      {adminMetrics.slaBreached === 0 && adminMetrics.slaAtRisk === 0 && 'None'}
                    </span>
                </div>
                </motion.div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Charts Section - Line Graph and Pie Chart */}
        <div className="w-full max-w-screen-xl grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          
          {/* Line Graph - Tickets Over Time */}
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.8 }}
            className="relative bg-gradient-to-br from-white via-white to-blue-50/30 dark:from-gray-800 dark:via-gray-800 dark:to-blue-950/20 border border-gray-200/60 dark:border-gray-700/60 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden"
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>
            <div className="p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-md">
                  <TrendingUp className="w-6 h-6 text-white" />
                    </div>
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Tickets Over Time</h3>
                    </div>
              <div className="h-[300px]">
                {(() => {
                  // Prepare data for line chart - last 7 days
                  const today = new Date();
                  const last7Days: string[] = [];
                  for (let i = 6; i >= 0; i--) {
                    const d = new Date(today);
                    d.setDate(today.getDate() - i);
                    last7Days.push(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
                  }

                  const ticketsByDay: number[] = [];
                  last7Days.forEach(day => {
                    let count = 0;
                    tickets.forEach(ticket => {
                      const ticketDate = new Date(ticket.created_at);
                      const dayKey = ticketDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                      if (dayKey === day) {
                        count++;
                      }
                    });
                    ticketsByDay.push(count);
                  });

                  const lineChartOptions: ApexOptions = {
                    chart: {
                      type: 'line',
                      height: 300,
                      toolbar: { show: false },
                      fontFamily: 'Outfit, sans-serif',
                    },
                    colors: ['#3B82F6', '#8B5CF6'],
                    stroke: {
                      curve: 'smooth',
                      width: 3,
                    },
                    fill: {
                      type: 'gradient',
                      gradient: {
                        shade: 'light',
                        type: 'vertical',
                        shadeIntensity: 0.3,
                        gradientToColors: ['#60A5FA', '#A78BFA'],
                        opacityFrom: 0.6,
                        opacityTo: 0.1,
                      },
                    },
                    markers: {
                      size: 5,
                      strokeColors: '#3B82F6',
                      strokeWidth: 2,
                      hover: {
                        size: 7,
                      },
                    },
                    grid: {
                      show: true,
                      borderColor: '#E5E7EB',
                      strokeDashArray: 0,
                      xaxis: {
                        lines: {
                          show: false,
                        },
                      },
                      yaxis: {
                        lines: {
                          show: true,
                        },
                      },
                    },
                    dataLabels: {
                      enabled: false,
                    },
                    tooltip: {
                      enabled: true,
                      theme: 'light',
                      style: {
                        fontSize: '12px',
                        fontFamily: 'Outfit, sans-serif',
                      },
                    },
                    xaxis: {
                      categories: last7Days,
                      axisBorder: {
                        show: false,
                      },
                      axisTicks: {
                        show: false,
                      },
                      labels: {
                        style: {
                          colors: '#6B7280',
                          fontSize: '12px',
                          fontFamily: 'Outfit, sans-serif',
                        },
                      },
                    },
                    yaxis: {
                      labels: {
                        style: {
                          colors: '#6B7280',
                          fontSize: '12px',
                          fontFamily: 'Outfit, sans-serif',
                        },
                      },
                    },
                  };

                  const lineChartSeries = [
                    {
                      name: 'Tickets',
                      data: ticketsByDay,
                    },
                  ];

                  return (
                    <ReactApexChart
                      options={lineChartOptions}
                      series={lineChartSeries}
                      type="line"
                      height={300}
                    />
                  );
                })()}
                    </div>
                  </div>
          </motion.div>

          {/* Pie Chart - Ticket Status Distribution */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.9 }}
            className="relative bg-gradient-to-br from-white via-white to-purple-50/30 dark:from-gray-800 dark:via-gray-800 dark:to-purple-950/20 border border-gray-200/60 dark:border-gray-700/60 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden"
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-pink-500 to-indigo-500"></div>
            <div className="p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-md">
                  <BarChart3 className="w-6 h-6 text-white" />
                    </div>
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Ticket Status Distribution</h3>
                    </div>
              <div className="h-[300px] flex items-center justify-center">
                {(() => {
                  // Calculate ticket status distribution
                  const statusCounts: Record<string, number> = {
                    open: 0,
                    pending: 0,
                    in_progress: 0,
                    resolved: 0,
                    closed: 0,
                  };

                  tickets.forEach(ticket => {
                    const status = (ticket.status || 'open').toLowerCase();
                    if (statusCounts[status] !== undefined) {
                      statusCounts[status]++;
                    } else {
                      statusCounts['open']++;
                    }
                  });

                  const pieLabels = Object.keys(statusCounts).map(s => 
                    s.charAt(0).toUpperCase() + s.slice(1).replace('_', ' ')
                  );
                  const pieSeries = Object.values(statusCounts);
                  const pieColors = ['#3B82F6', '#F59E0B', '#8B5CF6', '#10B981', '#EF4444'];

                  const pieChartOptions: ApexOptions = {
                    chart: {
                      type: 'pie',
                      height: 300,
                      toolbar: { show: false },
                      fontFamily: 'Outfit, sans-serif',
                    },
                    labels: pieLabels,
                    colors: pieColors,
                    legend: {
                      position: 'bottom',
                      fontFamily: 'Outfit, sans-serif',
                      fontSize: '12px',
                      labels: {
                        colors: '#6B7280',
                      },
                    },
                    dataLabels: {
                      enabled: true,
                      style: {
                        fontSize: '12px',
                        fontFamily: 'Outfit, sans-serif',
                        fontWeight: 600,
                      },
                      dropShadow: {
                        enabled: false,
                      },
                    },
                    tooltip: {
                      enabled: true,
                      theme: 'light',
                      style: {
                        fontSize: '12px',
                        fontFamily: 'Outfit, sans-serif',
                      },
                      y: {
                        formatter: (val: number) => `${val} tickets`,
                      },
                    },
                    plotOptions: {
                      pie: {
                        expandOnClick: true,
                        offsetX: 0,
                        offsetY: 0,
                      },
                    },
                    responsive: [
                      {
                        breakpoint: 480,
                        options: {
                          chart: {
                            width: 300,
                          },
                          legend: {
                            position: 'bottom',
                          },
                        },
                      },
                    ],
                  };

                  return (
                    <ReactApexChart
                      options={pieChartOptions}
                      series={pieSeries}
                      type="pie"
                      height={300}
                    />
                  );
                })()}
              </div>
            </div>
        </motion.div>
        </div>
      </div>
    </div>
  );
}
