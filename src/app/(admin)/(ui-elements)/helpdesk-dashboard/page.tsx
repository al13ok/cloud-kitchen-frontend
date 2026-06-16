/*
  Helpdesk Dashboard Page - FIXED
  - Shows employee/customer tickets, KPIs, charts, and filters
  - Fetches ticket stats and renders actionable insights
*/
"use client";
import React, { useEffect, useState, useRef } from "react";
import BarChartOne from "@/components/charts/bar/BarChartOne";
import dynamic from "next/dynamic";
import { Siren, CheckCircle, Clock, FilePlus, ListChecks, Grid, User } from "lucide-react";
import Loader from "@/components/Loader";
import DashboardHeader from "@/components/header/DashboardHeader";
import Link from "next/link";
import { ActionBar } from "@/components/header/actionbar";
import { getEmployeeTickets } from "@/utils/api";

// Dynamically import ApexCharts for Pie/Donut
const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL;
if (!BACKEND_URL) {
  throw new Error('NEXT_PUBLIC_API_URL environment variable is not set');
}
const CUSTOMER_TICKETS_URL = BACKEND_URL + "/api/v1/helpdesk/tickets";

type Ticket = {
  status?: string;
  severity?: string;
  created_at?: string;
  createdAt?: string;
  date?: string;
  timestamp?: string;
  issue_type?: string;
  type?: string;
  source?: string;
  employee_id?: string;
};

type TimelineFilter = 
  | ""
  | "all"
  | "today"
  | "yesterday"
  | "thisweek"
  | "thismonth"
  | "lastweek"
  | "custom";
 
// Add a generic DashboardTabs component (inline for now)
const DashboardTabsModern = ({ value, onChange }: { value: string; onChange: (val: 'employee' | 'customer') => void }) => {
  const tabs = [
    { label: 'Employee Ticket', value: 'employee', icon: <Grid className="w-5 h-5 mr-2" /> },
    { label: 'Customer Ticket', value: 'customer', icon: <User className="w-5 h-5 mr-2" /> },
  ];
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-2 shadow-xl border border-gray-200/60 dark:border-gray-700/60 overflow-hidden mb-6 w-full sm:w-auto">
      <div className="flex w-full sm:w-auto">
        {tabs.map((tab) => {
          const isActive = value === tab.value;
          return (
            <button
              key={tab.value}
              onClick={() => onChange(tab.value as 'employee' | 'customer')}
              className={`flex items-center px-6 py-3 text-sm font-semibold focus:outline-none transition-all duration-200 rounded-xl ${
                isActive 
                  ? 'text-white bg-blue-600 shadow' 
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
              tabIndex={0}
            >
              {tab.icon}
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default function HelpdeskDashboard() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
 
  const [showFilterField, setShowFilterField] = useState(false);
  const [timelineFilter, setTimelineFilter] = useState<TimelineFilter>('all');
  const [showCustomPopover, setShowCustomPopover] = useState(false);
  const [pendingCustomRange, setPendingCustomRange] = useState<[Date | null, Date | null]>([null, null]);
  const customPopoverRef = useRef<HTMLDivElement | null>(null);
  const [filterQuery, setFilterQuery] = useState('');
  const [filterField] = useState<string>('status');
  const [downloadMenuOpen, setDownloadMenuOpen] = useState(false);
  const downloadMenuRef = useRef<HTMLDivElement | null>(null);
  const [mobileDownloadMenuOpen, setMobileDownloadMenuOpen] = useState(false);
  const mobileDownloadMenuRef = useRef<HTMLDivElement | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [ticketSource, setTicketSource] = useState<'employee' | 'customer'>('employee');


  // Click outside to close custom popover
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (showCustomPopover && customPopoverRef.current && !customPopoverRef.current.contains(event.target as Node)) {
        setShowCustomPopover(false);
      }
    }
    if (showCustomPopover) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showCustomPopover]);
 
  // Close download menus when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (downloadMenuOpen && downloadMenuRef.current && !downloadMenuRef.current.contains(target)) {
        setDownloadMenuOpen(false);
      }
      if (mobileDownloadMenuOpen && mobileDownloadMenuRef.current && !mobileDownloadMenuRef.current.contains(target)) {
        setMobileDownloadMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [downloadMenuOpen, mobileDownloadMenuOpen]);

  useEffect(() => {
    const fetchTickets = async () => {
      setLoading(true);
      setError(null);
      
      try {
        if (ticketSource === 'employee') {
          // Backend already filters tickets by user role
          const employeeTickets = await getEmployeeTickets();
          console.log('🎫 Fetched employee tickets from backend (already filtered by role):', Array.isArray(employeeTickets) ? employeeTickets.length : 0);
          const typedTickets: Ticket[] = Array.isArray(employeeTickets) ? (employeeTickets as Ticket[]) : [];
          setTickets(typedTickets);
          setError(null);
        } else if (ticketSource === 'customer') {
          const response = await fetch(CUSTOMER_TICKETS_URL, { 
            headers: { 
              'accept': 'application/json',
              ...(typeof window !== 'undefined' ? {
                'Authorization': `Bearer ${localStorage.getItem('access_token') || localStorage.getItem('jwtToken') || ''}`
              } : {})
            } 
          });
          const customer = response.ok ? await response.json() : [];
          setTickets(Array.isArray(customer) ? customer : []);
          setError(null);
        }
      } catch (error) {
        console.error('Error fetching tickets:', error);
        setError(ticketSource === 'employee' ? "Failed to fetch employee tickets" : "Failed to fetch customer tickets");
        setTickets([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTickets();
  }, [ticketSource, reloadKey]);

  function filterTicketsByTimeline(
    tickets: Ticket[],
    timeline: TimelineFilter,
    customRange: [Date | null, Date | null]
  ) {
    if (!timeline || timeline === "all") return tickets;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    const yesterdayEnd = new Date(yesterday);
    yesterdayEnd.setHours(23, 59, 59, 999);
    
    return tickets.filter((ticket: Ticket) => {
      const dateStr = ticket.created_at || ticket.createdAt || ticket.date || ticket.timestamp;
      if (!dateStr) return false;
      const ticketDate = new Date(dateStr);
      ticketDate.setHours(0, 0, 0, 0);
      
      switch (timeline) {
        case "today":
          return ticketDate.getTime() >= today.getTime() && ticketDate.getTime() <= todayEnd.getTime();
        case "yesterday":
          return ticketDate.getTime() >= yesterday.getTime() && ticketDate.getTime() <= yesterdayEnd.getTime();
        case "thisweek":
          const weekStart = new Date(today);
          weekStart.setDate(today.getDate() - today.getDay());
          weekStart.setHours(0, 0, 0, 0);
          return ticketDate >= weekStart;
        case "thismonth":
          const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
          monthStart.setHours(0, 0, 0, 0);
          return ticketDate >= monthStart;
        case "lastweek":
          const lastWeekStart = new Date(today);
          lastWeekStart.setDate(today.getDate() - today.getDay() - 7);
          lastWeekStart.setHours(0, 0, 0, 0);
          const lastWeekEnd = new Date(today);
          lastWeekEnd.setDate(today.getDate() - today.getDay() - 1);
          lastWeekEnd.setHours(23, 59, 59, 999);
          return ticketDate >= lastWeekStart && ticketDate <= lastWeekEnd;
        case "custom":
          if (customRange && customRange[0] && customRange[1]) {
            const startDate = new Date(customRange[0]);
            startDate.setHours(0, 0, 0, 0);
            const endDate = new Date(customRange[1]);
            endDate.setHours(23, 59, 59, 999);
            return ticketDate >= startDate && ticketDate <= endDate;
          }
          return false;
        default:
          return true;
      }
    });
  }

  const filteredTickets = filterTicketsByTimeline(
    tickets.filter(ticket => {
      const query = filterQuery.trim().toLowerCase();
      if (!query) return true;
      switch ((filterField || 'type').toLowerCase()) {
        case 'type':
          return ((ticket.issue_type || ticket.type || '').toLowerCase().includes(query));
        case 'status':
          return ((ticket.status || '').toLowerCase().includes(query));
        case 'source':
          return ((ticket.source || '').toLowerCase().includes(query));
        default:
          return (
            ((ticket.issue_type || ticket.type || '').toLowerCase().includes(query)) ||
            ((ticket.status || '').toLowerCase().includes(query)) ||
            ((ticket.source || '').toLowerCase().includes(query))
          );
      }
    }),
    timelineFilter,
    pendingCustomRange
  );

  // Removed unused handleExport function

  // Calculate today's date for filtering
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart);
  todayEnd.setHours(23, 59, 59, 999);

  // Calculate all card metrics dynamically from filtered tickets
  const totalTickets = filteredTickets.length;
  
  // Calculate today's tickets - tickets created today
  const todayTickets = filteredTickets.filter(t => {
    const dateStr = t.created_at || t.createdAt || t.date || t.timestamp;
    if (!dateStr) return false;
    const ticketDate = new Date(dateStr);
    return ticketDate >= todayStart && ticketDate <= todayEnd;
  }).length;
  
  const pendingTickets = filteredTickets.filter(t => (t.status || "").toLowerCase() === "pending").length;
  const solvedTickets = filteredTickets.filter(t => (t.status || "").toLowerCase() === "close" || (t.status || "").toLowerCase() === "closed" || (t.status || "").toLowerCase() === "solved").length;
  const highSeverityTickets = filteredTickets.filter(t => (t.severity || "").toLowerCase() === "high").length;
  
  const today = new Date();
  const last7Days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    last7Days.push(d.toLocaleDateString("en-US", { month: "short", day: "numeric" }));
  }

  const statusList = ["new", "pending", "solved", "closed", "in progress"];
  const ticketsByDay: Record<string, Record<string, number>> = {};
  last7Days.forEach(day => {
    ticketsByDay[day] = {};
    statusList.forEach(status => {
      ticketsByDay[day][status] = 0;
    });
  });

  filteredTickets.forEach(t => {
    const dateStr = t.created_at || t.createdAt || t.date || t.timestamp;
    if (dateStr) {
      const d = new Date(dateStr);
      const key = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const status = (t.status || "new").toLowerCase();
      if (ticketsByDay[key] && ticketsByDay[key][status] !== undefined) {
        ticketsByDay[key][status]++;
      }
    }
  });

  const statusCounts: Record<string, number> = {};
  filteredTickets.forEach(t => {
    const status = (t.status || "new").toLowerCase();
    statusCounts[status] = (statusCounts[status] || 0) + 1;
  });
  const statusPieLabels = Object.keys(statusCounts).map(s => s.charAt(0).toUpperCase() + s.slice(1));
  const statusPieSeries = Object.values(statusCounts);

  const typeCounts: Record<string, number> = {};
  filteredTickets.forEach(t => {
    const type = (t.issue_type || t.type || "Other").trim();
    typeCounts[type] = (typeCounts[type] || 0) + 1;
  });
  const typeBarData = Object.entries(typeCounts).map(([label, value], index) => {
    const colors = ["#3B82F6", "#F59E0B", "#10B981", "#8B5CF6", "#EF4444"];
    return { label, value, color: colors[index % colors.length] };
  });

  const severityCounts: Record<string, number> = {};
  filteredTickets.forEach(t => {
    const sev = (t.severity || "medium").toLowerCase();
    severityCounts[sev] = (severityCounts[sev] || 0) + 1;
  });
  const severityPieLabels = Object.keys(severityCounts).map(s => s.charAt(0).toUpperCase() + s.slice(1));
  const severityPieSeries = Object.values(severityCounts);

  const cardIcons = [
    <ListChecks key="total" className="w-7 h-7 text-blue-500" />,
    <Clock key="pending" className="w-7 h-7 text-yellow-500" />,
    <CheckCircle key="solved" className="w-7 h-7 text-green-500" />,
    <FilePlus key="new" className="w-7 h-7 text-indigo-500" />,
    <Siren key="high" className="w-7 h-7 text-red-500" />,
  ];

  const cardData = [
    { label: "Total Tickets", value: totalTickets, icon: cardIcons[0], colorClass: "blue" },
    { label: "Today Tickets", value: todayTickets, icon: cardIcons[3], colorClass: "green" },
    { label: "Pending Tickets", value: pendingTickets, icon: cardIcons[1], colorClass: "yellow" },
    { label: "Solved Tickets", value: solvedTickets, icon: cardIcons[2], colorClass: "purple" },
    { label: "High Severity Tickets", value: highSeverityTickets, icon: cardIcons[4], colorClass: "red" },
  ];
 
  const handleRefresh = () => setReloadKey(k => k + 1);

  return (
    <div className="relative min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Helpdesk Dashboard Header */}
      <div className="mx-4 md:mx-6 mt-6">
        <DashboardHeader
          variant="default"
          size="lg"
          title="Helpdesk Dashboard"
          subtitle="Monitor and manage helpdesk tickets with filters, severity tracking, and performance insights"
          icon={() => (
            <svg className="w-6 h-6 sm:w-8 sm:h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20 6h-2l-2-2H8L6 6H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zM10 4h4v2h-4V4zm8 14H6V8h12v10z"/>
            </svg>
          )}
          breadcrumbs={[
            { label: 'Home', href: '/' },
            { label: 'Helpdesk Dashboard', href: '/helpdesk-dashboard' }
          ]}
        />
      </div>

      <div className="w-full max-w-7xl mx-auto p-4 md:p-6 flex-1">
        <div className="mb-8">
          <DashboardTabsModern value={ticketSource === 'employee' ? 'employee' : 'customer'} onChange={val => setTicketSource(val as 'employee' | 'customer')} />
        </div>

        <div className="w-full mb-8">
          <ActionBar
            filterQuery={filterQuery}
            setFilterQuery={setFilterQuery}
            showFilterField={showFilterField}
            setShowFilterField={setShowFilterField}
            filterField={filterField}
            setFilterField={() => {}} // Not used in helpdesk dashboard
            timelineFilter={timelineFilter}
            setTimelineFilter={setTimelineFilter as (v: string) => void}
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
            handleExport={() => {}} // No export functionality required for helpdesk dashboard as of now
            onRefresh={handleRefresh}
            onCreate={() => {}} // No create functionality required for helpdesk dashboard
            showFilterToggle={true}
            showSearchInput={false}
            showFilterSelector={true}
            showTimelineSelector={true}
            showDownloadButton={false}
            showRefreshButton={true}
            showUploadButton={false}
            showCreateButton={false}
          />
        </div>

        {loading ? (
          <div className="text-center py-12">
            <Loader />
            <p className="mt-4 text-lg text-gray-500 dark:text-white">Loading dashboard data...</p>
          </div>
        ) : error ? (
          <div className="text-center text-red-600 py-12">{error}</div>
        ) : (
          <>
            {totalTickets > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6 mb-8">
                {cardData.map((card) => {
                  return (
                    <Link
                      href={ticketSource === 'employee' ? '/helpdesk-employee-ticket' : '/helpdesk-customer-ticket'}
                      key={card.label}
                      className="block group"
                    >
                      <div className="group relative overflow-hidden bg-white dark:bg-gray-800 border border-gray-200/60 dark:border-gray-700/60 rounded-3xl p-6 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 cursor-pointer min-h-[140px]">
                        <div className="absolute inset-0 bg-blue-50/50 dark:bg-blue-900/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                        <div className="relative z-10">
                          <div className="flex items-center justify-between mb-4">
                            <div className="p-3 rounded-2xl bg-blue-100 dark:bg-blue-900/30 group-hover:scale-110 transition-transform duration-300">
                              <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/>
                              </svg>
                            </div>
                            <div className="text-right">
                              <div className="text-2xl font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300">
                                {card.value}
                              </div>
                              <div className="text-sm font-medium text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors duration-300">
                                {card.label}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="bg-gradient-to-br from-white via-white to-gray-50/30 dark:from-gray-800 dark:via-gray-800 dark:to-gray-900/50 rounded-2xl shadow-xl border-0 p-12 mb-8 backdrop-blur-sm overflow-hidden relative">
                <div className="relative z-10 text-center">
                  <div className="text-6xl mb-4">📊</div>
                  <div className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-200 bg-clip-text text-transparent mb-2">No Data Available</div>
                  <div className="text-gray-500 dark:text-gray-400">No tickets found matching your current filters.</div>
                </div>
              </div>
            )}
          
            {totalTickets > 0 && (
              <div className="mt-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/30 dark:to-orange-800/30">
                    <svg className="w-5 h-5 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-200 bg-clip-text text-transparent">
                    Ticket Analytics
                  </h3>
                </div>
                
                <div className="space-y-8">
                  <div className="bg-gradient-to-br from-white via-white to-gray-50/30 dark:from-gray-800 dark:via-gray-800 dark:to-gray-900/50 rounded-2xl p-6 shadow-xl border-0 overflow-hidden backdrop-blur-sm relative w-full">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-orange-500/10 to-red-500/10 rounded-full -translate-y-16 translate-x-16"></div>
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-full translate-y-12 -translate-x-12"></div>
                    <div className="relative z-10">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 rounded-lg bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/30 dark:to-orange-800/30">
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-orange-600 dark:text-orange-400">
                            <path d="M3 3v18h18"></path>
                            <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3"></path>
                          </svg>
                        </div>
                        <h3 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-200 bg-clip-text text-transparent">Tickets by Issue Type</h3>
                      </div>
                      <BarChartOne data={typeBarData} />
                    </div>
                  </div>
              
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
                    <div className="bg-gradient-to-br from-white via-white to-gray-50/30 dark:from-gray-800 dark:via-gray-800 dark:to-gray-900/50 rounded-2xl p-6 shadow-xl border-0 overflow-hidden backdrop-blur-sm relative">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-full -translate-y-16 translate-x-16"></div>
                      <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-br from-green-500/10 to-blue-500/10 rounded-full translate-y-12 -translate-x-12"></div>
                      <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-6">
                          <div className="p-2 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-blue-600 dark:text-blue-400">
                              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>
                            </svg>
                          </div>
                          <h3 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-200 bg-clip-text text-transparent">Ticket Status Distribution</h3>
                        </div>
                        <div className="w-full h-full flex items-center justify-center p-4">
                          <div className="w-full max-w-[300px] sm:max-w-[350px] md:max-w-[400px] flex items-center justify-center">
                            <ReactApexChart
                              options={{
                                labels: statusPieLabels,
                                legend: { position: "bottom" },
                                chart: { type: "pie" },
                                plotOptions: {
                                  pie: {
                                    dataLabels: {
                                      offset: -15,
                                      minAngleToShowLabel: 10
                                    }
                                  }
                                },
                                dataLabels: {
                                  enabled: true,
                                  formatter: function(val: number) {
                                    return val > 10 ? val.toFixed(1) + '%' : '';
                                  },
                                  style: {
                                    fontSize: '12px',
                                    fontWeight: 'bold',
                                    colors: ['#fff']
                                  },
                                  dropShadow: {
                                    enabled: false
                                  }
                                },
                                responsive: [
                                  { 
                                    breakpoint: 480, 
                                    options: { 
                                      chart: { width: 250 }, 
                                      legend: { position: "bottom", fontSize: "12px" } 
                                    } 
                                  },
                                  { 
                                    breakpoint: 768, 
                                    options: { 
                                      chart: { width: 300 }, 
                                      legend: { position: "bottom", fontSize: "14px" } 
                                    } 
                                  }
                                ],
                              }}
                              series={statusPieSeries}
                              type="pie"
                              width="100%"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-gradient-to-br from-white via-white to-gray-50/30 dark:from-gray-800 dark:via-gray-800 dark:to-gray-900/50 rounded-2xl p-6 shadow-xl border-0 overflow-hidden backdrop-blur-sm relative">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-red-500/10 to-pink-500/10 rounded-full -translate-y-16 translate-x-16"></div>
                      <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-br from-orange-500/10 to-red-500/10 rounded-full translate-y-12 -translate-x-12"></div>
                      <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-6">
                          <div className="p-2 rounded-lg bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-800/30">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-red-600 dark:text-red-400">
                              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>
                            </svg>
                          </div>
                          <h3 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-200 bg-clip-text text-transparent">Tickets by Severity</h3>
                        </div>
                        <div className="w-full h-full flex items-center justify-center p-4">
                          <div className="w-full max-w-[350px] sm:max-w-[350px] md:max-w-[400px] flex items-center justify-center">
                            <ReactApexChart
                              options={{
                                labels: severityPieLabels,
                                legend: { position: "bottom" },
                                chart: { type: "pie" },
                                plotOptions: {
                                  pie: {
                                    dataLabels: {
                                      offset: -15,
                                      minAngleToShowLabel: 10
                                    }
                                  }
                                },
                                dataLabels: {
                                  enabled: true,
                                  formatter: function(val: number) {
                                    return val > 10 ? val.toFixed(1) + '%' : '';
                                  },
                                  style: {
                                    fontSize: '12px',
                                    fontWeight: 'bold',
                                    colors: ['#fff']
                                  },
                                  dropShadow: {
                                    enabled: false
                                  }
                                },
                                responsive: [
                                  { 
                                    breakpoint: 480, 
                                    options: { 
                                      chart: { width: 250 }, 
                                      legend: { position: "bottom", fontSize: "12px" } 
                                    } 
                                  },
                                  { 
                                    breakpoint: 768, 
                                    options: { 
                                      chart: { width: 300 }, 
                                      legend: { position: "bottom", fontSize: "14px" } 
                                    } 
                                  }
                                ],
                              }}
                              series={severityPieSeries}
                              type="pie"
                              width="100%"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
