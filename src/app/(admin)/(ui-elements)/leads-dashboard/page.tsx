/*
Leads Dashboard Page
- Displays lead statistics, charts, and filters
- Fetches data from API endpoints and renders KPI cards, charts, and tables
*/
"use client";
import React, { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Users, PlusCircle, Clock, CheckCircle, TrendingUp, FileText } from "lucide-react";
import Loader from "@/components/Loader";
import DashboardHeader from "@/components/header/DashboardHeader";
import { useDashboardData } from "@/hooks/useDashboardData";
import ActionBar from "@/components/header/actionbar";

// Dynamically import ApexCharts for Pie/Donut
const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL;
const API_URL = BACKEND_URL + "/api/v1/leads/";
const DAILY_COUNT_URL = BACKEND_URL + "/api/v1/leads/daily-count";

interface Lead {
  label: string;
  score: number;
  description: string;
  created_at: string;
  status?: string;
  lead_source?: string;
  source?: string;
  lead_score?: number | string | null;
  ats_score?: number | string | null;
  date?: string;
  "Date|time"?: string;
  Date?: string;
  createdAt?: string;
  // Added for proper lead type parsing
  lead_type?: string;
  lead_metadata?: unknown;
  agent?: string;
  [key: string]: unknown;
}

interface PipelineDataItem {
  stage: string;
  [key: string]: unknown;
}

interface FunnelDataItem {
  stage: string;
  [key: string]: unknown;
}

interface TrendsDataItem {
  date: string;
  [key: string]: unknown;
}

const LeadsDashboard = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [todaysLeadsCount, setTodaysLeadsCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timelineFilter, setTimelineFilter] = useState('all');
  const [showFilterField, setShowFilterField] = useState(false);
  const [showCustomPopover, setShowCustomPopover] = useState(false);
  const [pendingCustomRange, setPendingCustomRange] = useState<[Date | null, Date | null]>([null, null]);
  // Shared ActionBar auxiliary state
  const [filterQuery, setFilterQuery] = useState("");

  // Charts data (reuse enhanced dashboard data sources)
  const {
    pipelineData,
    funnelData,
    pipelineTrends,
    chartsLoading,
    chartsError,
  } = useDashboardData();

  // Chart configurations (aligned with enhanced dashboard)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const pipelineChartOptions = {
    chart: { type: 'bar' as const, height: 350, toolbar: { show: false } },
    plotOptions: { bar: { horizontal: false, columnWidth: '55%', borderRadius: 4 } },
    dataLabels: { enabled: false },
    stroke: { show: true, width: 2, colors: ['transparent'] },
    xaxis: {
      categories: pipelineData && pipelineData.length > 0 ? pipelineData.map((item) => {
        const itemData = item as unknown as PipelineDataItem;
        return itemData.stage || '';
      }) : [],
      labels: { style: { colors: '#64748b', fontSize: '12px' } },
    },
    yaxis: {
      title: { text: 'Number of Leads', style: { color: '#64748b', fontSize: '12px' } },
      labels: { style: { colors: '#64748b', fontSize: '12px' } },
    },
    fill: { opacity: 1, colors: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'] },
    tooltip: { y: { formatter: (val: number) => `${val} leads` } },
    grid: { borderColor: '#e2e8f0', strokeDashArray: 4 },
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const funnelChartOptions = {
    chart: { type: 'bar' as const, height: 350, toolbar: { show: false } },
    plotOptions: { bar: { horizontal: true, barHeight: '70%', borderRadius: 4 } },
    dataLabels: {
      enabled: true,
      formatter: (val: number) => `${val} leads`,
      style: { colors: ['#fff'], fontSize: '12px', fontWeight: 'bold' },
    },
    xaxis: {
      categories: funnelData && funnelData.length > 0 ? funnelData.map((item) => {
        const itemData = item as unknown as FunnelDataItem;
        return itemData.stage || '';
      }) : [],
      labels: { style: { colors: '#64748b', fontSize: '12px' } },
    },
    yaxis: { labels: { style: { colors: '#64748b', fontSize: '12px' } } },
    fill: { opacity: 1, colors: ['#8b5cf6'] },
    tooltip: { y: { formatter: (val: number) => `${val} leads` } },
    grid: { borderColor: '#e2e8f0', strokeDashArray: 4 },
  };

  const trendsChartOptions = {
    chart: { type: 'line' as const, height: 350, toolbar: { show: false } },
    stroke: { curve: 'smooth' as const, width: 3 },
    markers: { size: 6, colors: ['#3b82f6'], strokeColors: '#fff', strokeWidth: 2 },
    xaxis: {
      categories: pipelineTrends && pipelineTrends.length > 0 ? pipelineTrends.map((item) => {
        const itemData = item as unknown as TrendsDataItem;
        return itemData.date || '';
      }) : [],
      labels: { style: { colors: '#64748b', fontSize: '12px' } },
    },
    yaxis: {
      title: { text: 'Number of Leads', style: { color: '#64748b', fontSize: '12px' } },
      labels: { style: { colors: '#64748b', fontSize: '12px' } },
    },
    colors: ['#3b82f6'],
    tooltip: { y: { formatter: (val: number) => `${val} leads` } },
    grid: { borderColor: '#e2e8f0', strokeDashArray: 4 },
  };

  // Build date range query params based on selected timeline/custom range
  function getDateRangeParams(timeline: string, customRange: [Date | null, Date | null]) {
    const toYmd = (d: Date) => {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return yyyy + "-" + mm + "-" + dd;
    };

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let start: Date | null = null;
    let end: Date | null = null;

    switch ((timeline || '').toLowerCase()) {
      case 'today':
        start = new Date(today);
        end = new Date(today);
        break;
      case 'yesterday': {
        const y = new Date(today);
        y.setDate(today.getDate() - 1);
        start = y;
        end = y;
        break;
      }
      case 'thisweek': {
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        start = weekStart;
        end = new Date(today);
        break;
      }
      case 'thismonth': {
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        start = monthStart;
        end = new Date(today);
        break;
      }
      case 'lastweek': {
        const lastWeekStart = new Date(today);
        lastWeekStart.setDate(today.getDate() - today.getDay() - 7);
        const lastWeekEnd = new Date(today);
        lastWeekEnd.setDate(today.getDate() - today.getDay() - 1);
        start = lastWeekStart;
        end = lastWeekEnd;
        break;
      }
      case 'lastmonth': {
        const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
        start = lastMonthStart;
        end = lastMonthEnd;
        break;
      }
      case 'custom': {
        if (customRange[0] && customRange[1]) {
          start = new Date(customRange[0]);
          end = new Date(customRange[1]);
        }
        break;
      }
      default:
        break;
    }

    if (start && end) {
      const params = new URLSearchParams();
      params.set('start_date', toYmd(start));
      params.set('end_date', toYmd(end));
      return params;
    }
    return null;
  }





























































  // Ensure default shows all months together on mount
  useEffect(() => {
    setTimelineFilter('all');
    setPendingCustomRange([null, null]);
  }, []);

  // reloadToken allows external triggers (e.g., from CRM assign) to refetch
  const [reloadToken, setReloadToken] = useState<number>(0);















  useEffect(() => {
    setLoading(true);
    const url = new URL(API_URL);
    const params = getDateRangeParams(timelineFilter, pendingCustomRange);
    if (params) url.search = params.toString();
    fetch(url.toString(), { headers: { accept: "application/json" } })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch leads");
        return res.json();
      })
      .then((data) => {
        const leadData = Array.isArray(data) ? data : [];
        setLeads(leadData);
        setError(null);
      })
      .catch((err) => {
        console.error("Error fetching leads:", err);
        setError(err.message || "Unknown error");
        setLeads([]);
      })
      .finally(() => setLoading(false));
  }, [timelineFilter, pendingCustomRange, reloadToken]);















  // Listen for global updates dispatched from other pages (e.g., CRM leads assign)
  useEffect(() => {
    const handler = () => setReloadToken(Date.now());
    try {
      window.addEventListener('leads-updated', handler);
    } catch { }
    return () => {
      try { window.removeEventListener('leads-updated', handler); } catch { }
    };
  }, []);

  // Fetch today's leads count
  useEffect(() => {
    const url = new URL(DAILY_COUNT_URL);
    const params = getDateRangeParams(timelineFilter, pendingCustomRange);
    if (params) url.search = params.toString();
    fetch(url.toString(), { headers: { accept: "application/json" } })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch today's leads count");
        return res.json();
      })
      .then((data) => {
        const count = typeof data?.count === 'number' ? data.count : 0;
        setTodaysLeadsCount(count);
        // console.log("Today's leads count:", count, "date:", data?.date);
      })
      .catch((err) => {
        console.error("Error fetching today's leads count:", err);
        setTodaysLeadsCount(0);
      });
  }, [timelineFilter, pendingCustomRange]);

  // Filtering logic
  function filterLeads(leads: Lead[], timeline: string, customRange: [Date | null, Date | null]) {
    let filtered = [...leads];
    if (timeline && timeline !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      filtered = filtered.filter(lead => {
        const dateStr = lead.created_at || lead.date || lead.Date || lead["Date|time"] || lead.createdAt;
        if (!dateStr) return false;
        const leadDate = new Date(dateStr);
        switch (timeline) {
          case 'today':
            return leadDate >= today;
          case 'yesterday':
            return leadDate >= yesterday && leadDate < today;
          case 'thisweek':
            const weekStart = new Date(today);
            weekStart.setDate(today.getDate() - today.getDay());
            return leadDate >= weekStart;
          case 'thismonth':
            const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
            return leadDate >= monthStart;
          case 'lastweek':
            const lastWeekStart = new Date(today);
            lastWeekStart.setDate(today.getDate() - today.getDay() - 7);
            const lastWeekEnd = new Date(today);
            lastWeekEnd.setDate(today.getDate() - today.getDay());
            return leadDate >= lastWeekStart && leadDate < lastWeekEnd;
          case 'lastmonth':
            const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 1);
            return leadDate >= lastMonthStart && leadDate < lastMonthEnd;
          case 'custom':
            if (customRange[0] && customRange[1]) {
              const startDate = new Date(customRange[0]);
              const endDate = new Date(customRange[1]);
              endDate.setHours(23, 59, 59, 999);
              return leadDate >= startDate && leadDate <= endDate;
            }
            return true;
          default:
            return true;
        }
      });
    }
    return filtered;
  }
  // Filtered leads based on status and timeline (memoized)
  const filteredLeads = useMemo(() => (
    filterLeads(leads, timelineFilter, pendingCustomRange)
  ), [leads, timelineFilter, pendingCustomRange]);






  // Metrics using filteredLeads
  const totalLeads = filteredLeads.length;
  const pendingLeads = filteredLeads.filter((l: Lead) => (l.status || "").toLowerCase() === "pending").length;
  const qualifiedLeads = filteredLeads.filter((l: Lead) => {
    const status = (l.status || "").toLowerCase();
    return status === "qualified";
  }).length;
  // Heatmap component function with improved responsiveness
  const LeadsHeatmap = ({ leads, hideLegend = false }: { leads: Lead[], hideLegend?: boolean }) => {
    const processHeatmapData = () => {
      if (!leads || leads.length === 0) return { sources: [], days: [], data: [], dateMap: {} };

      // Helper to normalize source strictly from API's `source` field with fallbacks
      const getLeadSource = (lead: Lead): string => {
        const src = (lead.source || lead.lead_source || lead.label || '').toString().trim();
        return src.length > 0 ? src : 'Unknown';
      };

      // Get unique sources
      const sources = Array.from(new Set(leads.map(lead => getLeadSource(lead))))
        .filter(source => source && source !== 'Unknown')
        .sort();

      // Note: heatmap no longer needs today's date reference

      // Process leads data: extract day and aggregate by source and day
      const leadData = leads.map(lead => {
        if (!lead.created_at) return null;

        // Convert lead date to IST
        const leadDate = new Date(lead.created_at);
        const istDate = new Date(leadDate.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
        const day = istDate.getDate();
        const source = getLeadSource(lead);
        const fullDate = istDate.toISOString().split('T')[0];

        return { day, source, fullDate };
      }).filter(Boolean);

      // Group by source and day, aggregate leads
      const aggregatedData: Record<string, Record<number, { count: number, dates: string[] }>> = {};

      leadData.forEach((item) => {
        if (!item) return;
        const { day, source, fullDate } = item;
        if (!aggregatedData[source]) {
          aggregatedData[source] = {};
        }
        if (!aggregatedData[source][day]) {
          aggregatedData[source][day] = { count: 0, dates: [] };
        }
        aggregatedData[source][day].count++;
        if (!aggregatedData[source][day].dates.includes(fullDate)) {
          aggregatedData[source][day].dates.push(fullDate);
        }
      });

      // Create day order: shift relative to today (today is rightmost)
      const days: number[] = Array.from({ length: 31 }, (_, i) => i + 1); // 1..31 ascending

      // Create data matrix
      const data: number[][] = [];
      const dateMap: Record<string, string[]> = {}; // For hover tooltips

      sources.forEach(source => {
        const sourceData: number[] = [];
        days.forEach(day => {
          const count = aggregatedData[source]?.[day]?.count || 0;
          sourceData.push(count);

          // Store dates for this day for hover
          const key = source + "-" + day;
          dateMap[key] = aggregatedData[source]?.[day]?.dates || [];
        });
        data.push(sourceData);
      });

      return { sources, days, data, dateMap };
    };
    const { sources, days, data, dateMap } = processHeatmapData();
    // Color intensity function
    const getColorIntensity = (value: number, maxValue: number) => {
      if (maxValue === 0) return 'bg-gray-100 dark:bg-gray-800';
      const intensity = value / maxValue;
      if (intensity === 0) return 'bg-gray-100 dark:bg-gray-800';
      if (intensity <= 0.25) return 'bg-blue-200 dark:bg-blue-900';
      if (intensity <= 0.5) return 'bg-blue-300 dark:bg-blue-800';
      if (intensity <= 0.75) return 'bg-blue-400 dark:bg-blue-700';
      return 'bg-blue-500 dark:bg-blue-600';
    };
    // Get max value for color scaling
    const maxValue = Math.max(...data.flat());
    if (loading) {
      return (
        <div className="flex items-center justify-center h-64 text-gray-500">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-xs text-gray-400">Fetching data from API</p>
          </div>
        </div>
      );
    }
    if (error) {
      return (
        <div className="flex items-center justify-center h-64 text-gray-500">
          <div className="text-center">
            <svg className="mx-auto h-12 w-12 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <p className="mt-2 text-sm text-blue-600">Error loading data</p>
            <p className="text-xs text-gray-400">{error}</p>
          </div>
        </div>
      );
    }
    if (sources.length === 0 || days.length === 0) {
      return (
        <div className="flex items-center justify-center h-64 text-gray-500">
          <div className="text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2zm0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <p className="mt-2 text-sm">No data available</p>
            <p className="text-xs text-gray-400">No leads found for the selected criteria</p>
          </div>
        </div>
      );
    }
    return (
      <div className="w-full">
        {/* Enhanced responsive heatmap container */}
        <div className="w-full overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-gray-100 dark:scrollbar-track-800">
          <div className="min-w-fit mx-auto w-full" style={{ minWidth: `${Math.max(400, days.length * 36 + 280)}px` }}>
            {/* Enhanced header row with days */}
            <div className="flex mb-4">
              <div className="w-20 sm:w-24 md:w-28 lg:w-32 xl:w-36 flex-shrink-0"></div>
              <div className="flex gap-1">
                {days.map((day) => (
                  <div
                    key={day}
                    className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 lg:w-11 lg:h-11 xl:w-12 xl:h-12 flex items-center justify-center text-xs font-semibold relative text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"
                    title={"Day " + day}
                  >
                    <span className="text-xs font-bold">{day}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Enhanced heatmap rows */}
            {sources.map((source, sourceIndex) => (
              <div key={source} className="flex items-center mb-2 group">
                {/* Enhanced source label */}
                <div className="w-20 sm:w-24 md:w-28 lg:w-32 xl:w-36 flex-shrink-0 pr-2 sm:pr-3">
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-600 shadow-sm group-hover:shadow-md transition-shadow duration-200">
                    <div
                      className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 font-semibold truncate"
                      title={source}
                      style={{
                        fontSize: source.length > 12 ? '10px' : source.length > 8 ? '11px' : '12px',
                        lineHeight: '1.3'
                      }}
                    >
                      {source.length > 15 ? `${source.substring(0, 12)}...` : source}
                    </div>
                  </div>
                </div>

                {/* Enhanced heatmap cells */}
                <div className="flex gap-1">
                  {days.map((day, dayIndex) => {
                    const count = data[sourceIndex][dayIndex];
                    const key = source + "-" + day;
                    const dates = dateMap[key] || [];
                    const datesText = dates.length > 0 ? dates.join(', ') : 'No specific dates';

                    return (
                      <div
                        key={source + "-" + day}
                        className={`w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 lg:w-11 lg:h-11 xl:w-12 xl:h-12 border border-gray-200 dark:border-gray-600 rounded-lg ${getColorIntensity(count, maxValue)} transition-all duration-300 hover:scale-110 hover:z-10 cursor-pointer relative group/cell shadow-sm hover:shadow-lg`}
                        title={`${source}: ${count} leads on day ${day}${dates.length > 0 ? ` (${datesText})` : ''}`}
                      >
                        {/* Enhanced hover tooltip */}
                        <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-gray-900 dark:bg-gray-700 text-white text-xs px-2 py-1 rounded-lg opacity-0 group-hover/cell:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-20">
                          {count} leads
                          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900 dark:border-t-gray-700"></div>
                        </div>

                        {/* Count indicator for non-zero values */}
                        {count > 0 && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-xs font-bold text-white drop-shadow-sm">
                              {count > 9 ? '9+' : count}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
        {/* Enhanced Legend */}
        {!hideLegend && (
          <div className="mt-8 bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex flex-col sm:flex-row items-center justify-between space-y-4 sm:space-y-0">
              <div className="flex items-center space-x-4">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Intensity Scale:</span>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Less</span>
                  <div className="flex space-x-1">
                    <div className="w-4 h-4 bg-gray-100 dark:bg-gray-700 rounded border border-gray-300 dark:border-gray-600"></div>
                    <div className="w-4 h-4 bg-blue-200 dark:bg-blue-900 rounded border border-gray-300 dark:border-gray-600"></div>
                    <div className="w-4 h-4 bg-blue-300 dark:bg-blue-800 rounded border border-gray-300 dark:border-gray-600"></div>
                    <div className="w-4 h-4 bg-blue-400 dark:bg-blue-700 rounded border border-gray-300 dark:border-gray-600"></div>
                    <div className="w-4 h-4 bg-blue-500 dark:bg-blue-600 rounded border border-gray-300 dark:border-gray-600"></div>
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">More</span>
                </div>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 px-3 py-1 rounded-full">
                Lead activity by source and date
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Summary Stats */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {sources.length}
                </div>
                <div className="text-sm text-blue-600 dark:text-blue-400 font-medium">Sources</div>
              </div>
              <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {days.length}
                </div>
                <div className="text-sm text-blue-600 dark:text-blue-400 font-medium">Days</div>
              </div>
              <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {maxValue}
                </div>
                <div className="text-sm text-blue-600 dark:text-blue-400 font-medium">Max/Day</div>
              </div>
              <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {leads.length}
                </div>
                <div className="text-sm text-blue-600 dark:text-blue-400 font-medium">Total Leads</div>
              </div>
              <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>
        {/* Enhanced Source Breakdown */}
        <div className="mt-8 w-full">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h4 className="text-lg font-bold text-gray-900 dark:text-white">Leads by Source</h4>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 w-full">
            {sources.map((source) => {
              const sourceTotal = leads.filter(lead =>
                (lead.source || lead.lead_source || 'Unknown') === source
              ).length;
              const sourcePercentage = ((sourceTotal / leads.length) * 100).toFixed(1);

              return (
                <div key={source} className="group bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-lg transition-all duration-300">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="text-sm font-semibold text-gray-900 dark:text-white truncate" title={source}>
                        {source.length > 20 ? `${source.substring(0, 17)}...` : source}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {sourceTotal}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {sourcePercentage}% of total
                      </div>
                    </div>

                    <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <svg className="w-6 h-6 text-blue-500 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-3 w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${sourcePercentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };
  // Pie Chart: Leads by Type (aligned with CRM Leads)
  const leadTypeCounts: Record<string, number> = {};












  // Robustly extract lead_type from various shapes (same logic as CRM Leads usage)
  const extractLeadType = (l: Lead): string | undefined => {
    // direct fields
    const direct = l?.lead_type ?? (l as Lead & { leadType?: string })?.leadType ?? (l as Lead & { 'Lead Type'?: string })?.['Lead Type'];
    if (typeof direct === 'string' && direct.trim()) return direct;







    // metadata as JSON string or object
    const metaRaw = l?.lead_metadata ?? (l as Lead & { metadata?: unknown })?.metadata;
    if (metaRaw) {
      try {
        const meta = typeof metaRaw === 'string' ? JSON.parse(metaRaw) : metaRaw;
        const mt = meta?.lead_type ?? meta?.leadType ?? meta?.['Lead Type'];
        if (typeof mt === 'string' && mt.trim()) return mt;
      } catch {
        // ignore
      }
    }
    // sometimes Excel headers come through directly on the object
    const excelLike = (l as Lead & { 'Lead type'?: string; 'lead type'?: string })?.['Lead type'] ?? (l as Lead & { 'lead type'?: string })?.['lead type'];
    if (typeof excelLike === 'string' && excelLike.trim()) return excelLike;







    return undefined;
  };




  // Count leads by exact lead_type value (top-level or metadata), fallback to 'Unspecified'
  filteredLeads.forEach((l: Lead) => {
    const raw = extractLeadType(l);
    const key = (raw && raw.toString().trim()) ? raw.toString().trim() : 'Unspecified';
    leadTypeCounts[key] = (leadTypeCounts[key] || 0) + 1;
  });







  // pie labels/series removed (no chart rendering)
  // Donut Chart: Lead Status breakdown
  const statusCounts: Record<string, number> = {};
  filteredLeads.forEach((l: Lead) => {
    let status = "Unknown";
    if (l.status) {
      status = l.status.toString().trim();
    }

    const statusLower = status.toLowerCase();
    if (statusLower === "new" || statusLower === "pending" || statusLower === "closed" || statusLower === "close" ||
      statusLower === "qualified" || statusLower === "disqualified" || statusLower === "converted") {
      status = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
    } else {
      status = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
    }

    statusCounts[status] = (statusCounts[status] || 0) + 1;
  });
  const donutLabels = Object.keys(statusCounts);
  const donutSeries = Object.values(statusCounts);



  // Interests extraction and aggregation
  const normalizeInterest = (v: unknown): string[] => {
    if (v == null) return [];
    if (Array.isArray(v)) {
      return v
        .map((x) => (typeof x === 'string' ? x : (x as { name?: string })?.name || ''))
        .filter(Boolean)
        .map((s) => s.toString().trim())
        .filter((s) => s.length > 0);
    }
    const s = String(v);
    if (!s.trim()) return [];
    // split common delimiters
    return s
      .split(/[,|/;]+/)
      .map((x) => x.trim())
      .filter((x) => x.length > 0);
  };



  const extractInterests = (l: Lead): string[] => {
    // direct fields first
    const directKeys = ['interests', 'interest', 'tags', 'category', 'categories', 'property_type'];
    for (const key of directKeys) {
      if (l && (l as Record<string, unknown>)[key] != null) {
        const vals = normalizeInterest((l as Record<string, unknown>)[key]);
        if (vals.length) return vals;
      }
    }
    // excel-like headers
    const excelKeys = ['Interest', 'Interests', 'Tags', 'Category', 'Categories', 'Property Type'];
    for (const key of excelKeys) {
      if (l && (l as Record<string, unknown>)[key] != null) {
        const vals = normalizeInterest((l as Record<string, unknown>)[key]);
        if (vals.length) return vals;
      }
    }
    // metadata
    const metaRaw = l?.lead_metadata ?? (l as Lead & { metadata?: unknown })?.metadata;
    if (metaRaw) {
      try {
        const meta = typeof metaRaw === 'string' ? JSON.parse(metaRaw) : metaRaw;
        for (const key of [...directKeys, ...excelKeys, 'preferences', 'prefs']) {
          const v = meta?.[key];
          const vals = normalizeInterest(v);
          if (vals.length) return vals;
        }
        // nested preferences.common_interests etc.
        const nested = meta?.preferences || meta?.prefs;
        if (nested) {
          for (const k of Object.keys(nested)) {
            const vals = normalizeInterest(nested[k]);
            if (vals.length) return vals;
          }
        }
      } catch { }
    }
    return [];
  };



  const interestCounts: Record<string, number> = {};
  filteredLeads.forEach((l: Lead) => {
    const ints = extractInterests(l);
    if (!ints || ints.length === 0) {
      interestCounts['Unspecified'] = (interestCounts['Unspecified'] || 0) + 1;
      return;
    }
    ints.forEach((i) => {
      const key = i.trim();
      if (!key) return;
      interestCounts[key] = (interestCounts[key] || 0) + 1;
    });
  });
  const interestLabels = Object.keys(interestCounts);
  const interestSeries = interestLabels.map((label) => interestCounts[label]);
  const sortedInterests = Object.entries(interestCounts).sort((a, b) => b[1] - a[1]);















  // Agent-wise counts (from various assignment fields)
  const agentCounts: Record<string, number> = {};
  filteredLeads.forEach((l: Lead) => {
    let agent = '';
    try {
      // Check multiple possible agent fields in order of preference
      agent =
        (l as Lead & { assigned_agent_name?: string })?.assigned_agent_name ||
        (l as Lead & { assignment?: { assigned_to_name?: string } })?.assignment?.assigned_to_name ||
        (l as Lead & { assignment_results?: { assigned_agent?: { name?: string } } })?.assignment_results?.assigned_agent?.name ||
        (l as Lead & { assigned_to_name?: string })?.assigned_to_name ||
        (l.agent as string) ||
        '';

      // If still no agent, check metadata
      if (!agent) {
        const metaRaw = l?.lead_metadata;
        if (metaRaw) {
          const meta = typeof metaRaw === 'string' ? JSON.parse(metaRaw) : metaRaw;
          agent = (meta?.agent as string) || '';
        }
      }
    } catch { }
    const key = agent && agent.trim() ? agent.trim() : 'Unassigned';
    agentCounts[key] = (agentCounts[key] || 0) + 1;
  });
  const totalAgentLeads = Object.values(agentCounts).reduce((a, b) => a + b, 0) || 1;
  const sortedAgents = Object.entries(agentCounts)
    .sort((a, b) => b[1] - a[1]);
  return (
    <div className="relative min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Professional Header */}
      <DashboardHeader
        variant="default"
        size="md"
        title="Leads Dashboard"
        subtitle="Analyze and manage leads across sources, timelines, and scores to optimize conversion rates"
        hideTenantPrefix={true}
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Leads Dashboard', href: '/leads-dashboard' }
        ]}
        icon={() => (
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 sm:w-8 sm:h-8 text-white" aria-hidden="true">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
          </svg>
        )}
      />

      {/* Spacing between header and content */}
      <div className="mt-4 sm:mt-6 md:mt-8 mb-2 sm:mb-3 md:mb-4"></div>

      <div className="w-full min-h-screen flex flex-col">
        <div className="w-full px-3 sm:px-4 md:px-6 flex-1">
          {/* ActionBar with Timeline Filter Only */}
          <ActionBar
            filterQuery={filterQuery}
            setFilterQuery={setFilterQuery}
            showFilterField={showFilterField}
            setShowFilterField={setShowFilterField}
            filterField=""
            setFilterField={() => { }}
            timelineFilter={timelineFilter}
            setTimelineFilter={setTimelineFilter}
            pendingCustomRange={pendingCustomRange}
            setPendingCustomRange={setPendingCustomRange}
            showCustomPopover={showCustomPopover}
            setShowCustomPopover={setShowCustomPopover}
            downloadMenuOpen={false}
            setDownloadMenuOpen={() => { }}
            downloadMenuRef={{ current: null }}
            mobileDownloadMenuOpen={false}
            setMobileDownloadMenuOpen={() => { }}
            mobileDownloadMenuRef={{ current: null }}
            customPopoverRef={{ current: null }}
            handleExport={() => { }}
            onRefresh={() => setReloadToken(Date.now())}
            onCreate={() => { }}
            searchPlaceholder="Search leads..."
            showSearchInput={false}
            showFilterToggle={true}
            showFilterSelector={false}
            showTimelineSelector={true}
            showDownloadButton={false}
            showRefreshButton={true}
            showCreateButton={false}
            showUploadButton={false}
          />
          {loading ? (
            <div className="text-center py-10">
              <Loader />
              <p className="mt-4 text-gray-500 dark:text-white">Loading leads...</p>
            </div>
          ) : error ? (
            <div className="text-center py-10 text-blue-500">{error}</div>
          ) : (
            <>
              {/* Enhanced Summary Cards */}
              {totalLeads > 0 ? (
                <>
                  {/* Mobile: 2x2 grid */}
                  <div className="sm:hidden mb-4 grid grid-cols-2 gap-2 w-full">
                    <Link href="/crm-leads" className="block group">
                      <div className="group relative overflow-hidden bg-white dark:bg-gray-800 border border-gray-200/60 dark:border-gray-700/60 rounded-xl sm:rounded-2xl md:rounded-3xl p-3 sm:p-4 md:p-6 shadow-lg hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-500 hover:-translate-y-1 cursor-pointer min-h-[100px] sm:min-h-[120px]">
                        {/* Professional gradient overlay */}
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-900/10 dark:to-indigo-900/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                        {/* Animated background pattern */}
                        <div className="absolute inset-0 opacity-5 group-hover:opacity-10 transition-opacity duration-500">
                          <div className="absolute inset-0 bg-gradient-to-br from-blue-400/20 to-indigo-400/20 rounded-xl sm:rounded-2xl md:rounded-3xl"></div>
                        </div>

                        {/* Card content */}
                        <div className="relative z-10 flex flex-col items-center justify-center text-center h-full">
                          <div className="flex items-start justify-between mb-2 sm:mb-3 w-full">
                            <div className="relative">
                              <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg sm:rounded-xl md:rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/25 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                                <svg className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M16 4c0-1.11.89-2 2-2s2 .89 2 2-.89 2-2 2-2-.89-2-2zm4 18v-6h2.5l-2.54-7.63A1.5 1.5 0 0 0 18.54 8H17c-.8 0-1.54.37-2.01.99L14 10.5c-.47-.62-1.21-.99-2.01-.99H9.46c-.8 0-1.54.37-2.01.99L6 10.5c-.47-.62-1.21-.99-2.01-.99H2.46c-.8 0-1.54.37-2.01.99L0 10.5v7.5h2v6h4v-6h2v6h4v-6h2v6h4zM12.5 11.5c.83 0 1.5-.67 1.5-1.5s-.67-1.5-1.5-1.5S11 9.17 11 10s.67 1.5 1.5 1.5z" />
                                </svg>
                              </div>
                              {/* Glow effect */}
                              <div className="absolute inset-0 bg-gradient-to-br from-blue-400/30 to-indigo-500/30 rounded-lg sm:rounded-xl md:rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10"></div>
                            </div>
                          </div>

                          <div className="text-center w-full">
                            <div className="flex items-center justify-center gap-1 mb-0.5 sm:mb-1">
                              <span className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300">
                                {totalLeads.toLocaleString()}
                              </span>
                            </div>
                            <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm font-medium truncate">Total Leads</p>
                          </div>
                        </div>
                      </div>
                    </Link>
                    <Link href="/crm-leads" className="block group">
                      <div className="group relative overflow-hidden bg-white dark:bg-gray-800 border border-gray-200/60 dark:border-gray-700/60 rounded-xl sm:rounded-2xl md:rounded-3xl p-3 sm:p-4 md:p-6 shadow-lg hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-500 hover:-translate-y-1 cursor-pointer min-h-[100px] sm:min-h-[120px]">
                        {/* Professional gradient overlay */}
                        <div className="absolute inset-0 bg-blue-50/50 dark:bg-blue-900/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                        {/* Animated background pattern */}
                        <div className="absolute inset-0 opacity-5 group-hover:opacity-10 transition-opacity duration-500">
                          <div className="absolute inset-0 bg-blue-400/20 rounded-xl sm:rounded-2xl md:rounded-3xl"></div>
                        </div>

                        {/* Card content */}
                        <div className="relative z-10 flex flex-col items-center justify-center text-center h-full">
                          <div className="flex items-start justify-between mb-2 sm:mb-3 w-full">
                            <div className="relative">
                              <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-blue-600 rounded-lg sm:rounded-xl md:rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/25 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                                <svg className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                                </svg>
                              </div>
                              {/* Glow effect */}
                              <div className="absolute inset-0 bg-blue-400/30 rounded-lg sm:rounded-xl md:rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10"></div>
                            </div>
                          </div>

                          <div className="text-center w-full">
                            <div className="flex items-center justify-center gap-1 mb-0.5 sm:mb-1">
                              <span className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300">
                                {todaysLeadsCount.toLocaleString()}
                              </span>
                            </div>
                            <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm font-medium truncate">Today&apos;s Leads</p>
                          </div>
                        </div>
                      </div>
                    </Link>
                    <Link href="/crm-leads" className="block group">
                      <div className="group relative overflow-hidden bg-white dark:bg-gray-800 border border-gray-200/60 dark:border-gray-700/60 rounded-xl sm:rounded-2xl md:rounded-3xl p-3 sm:p-4 md:p-6 shadow-lg hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-500 hover:-translate-y-1 cursor-pointer min-h-[100px] sm:min-h-[120px]">
                        {/* Professional gradient overlay */}
                        <div className="absolute inset-0 bg-blue-50/50 dark:bg-blue-900/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                        {/* Animated background pattern */}
                        <div className="absolute inset-0 opacity-5 group-hover:opacity-10 transition-opacity duration-500">
                          <div className="absolute inset-0 bg-blue-400/20 rounded-xl sm:rounded-2xl md:rounded-3xl"></div>
                        </div>

                        {/* Card content */}
                        <div className="relative z-10 flex flex-col items-center justify-center text-center h-full">
                          <div className="flex items-start justify-between mb-2 sm:mb-3 w-full">
                            <div className="relative">
                              <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-blue-600 rounded-lg sm:rounded-xl md:rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/25 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                                <svg className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z" />
                                  <path d="M12.5 7H11v6l5.25 3.15.75-1.23-4.5-2.67z" />
                                </svg>
                              </div>
                              {/* Glow effect */}
                              <div className="absolute inset-0 bg-blue-400/30 rounded-lg sm:rounded-xl md:rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10"></div>
                            </div>
                          </div>

                          <div className="text-center w-full">
                            <div className="flex items-center justify-center gap-1 mb-0.5 sm:mb-1">
                              <span className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300">
                                {pendingLeads.toLocaleString()}
                              </span>
                            </div>
                            <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm font-medium truncate">Pending Leads</p>
                          </div>
                        </div>
                      </div>
                    </Link>
                    <Link href="/crm-leads" className="block group">
                      <div className="group relative overflow-hidden bg-white dark:bg-gray-800 border border-gray-200/60 dark:border-gray-700/60 rounded-xl sm:rounded-2xl md:rounded-3xl p-3 sm:p-4 md:p-6 shadow-lg hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-500 hover:-translate-y-1 cursor-pointer min-h-[100px] sm:min-h-[120px]">
                        {/* Professional gradient overlay */}
                        <div className="absolute inset-0 bg-blue-50/50 dark:bg-blue-900/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                        {/* Animated background pattern */}
                        <div className="absolute inset-0 opacity-5 group-hover:opacity-10 transition-opacity duration-500">
                          <div className="absolute inset-0 bg-blue-400/20 rounded-xl sm:rounded-2xl md:rounded-3xl"></div>
                        </div>

                        {/* Card content */}
                        <div className="relative z-10 flex flex-col items-center justify-center text-center h-full">
                          <div className="flex items-start justify-between mb-2 sm:mb-3 w-full">
                            <div className="relative">
                              <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-blue-600 rounded-lg sm:rounded-xl md:rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/25 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                                <svg className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                                </svg>
                              </div>
                              {/* Glow effect */}
                              <div className="absolute inset-0 bg-blue-400/30 rounded-lg sm:rounded-xl md:rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10"></div>
                            </div>
                          </div>

                          <div className="text-center w-full">
                            <div className="flex items-center justify-center gap-1 mb-0.5 sm:mb-1">
                              <span className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300">
                                {qualifiedLeads.toLocaleString()}
                              </span>
                            </div>
                            <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm font-medium truncate">Qualified Leads</p>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </div>

                  {/* Enhanced Tablet: 2x2 grid */}
                  <div className="hidden sm:grid md:hidden mb-6 grid grid-cols-2 gap-4 w-full">
                    <Link href="/crm-leads" className="block group">
                      <div className="group relative overflow-hidden bg-white dark:bg-gray-800 border border-gray-200/60 dark:border-gray-700/60 rounded-3xl p-8 shadow-lg hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-500 hover:-translate-y-2 cursor-pointer min-h-[180px]">
                        {/* Professional gradient overlay */}
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-900/10 dark:to-indigo-900/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                        {/* Animated background pattern */}
                        <div className="absolute inset-0 opacity-5 group-hover:opacity-10 transition-opacity duration-500">
                          <div className="absolute inset-0 bg-gradient-to-br from-blue-400/20 to-indigo-400/20 rounded-3xl"></div>
                        </div>

                        {/* Card content */}
                        <div className="relative z-10 flex flex-col items-center justify-center text-center h-full">
                          <div className="flex items-start justify-between mb-6 w-full">
                            <div className="relative">
                              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/25 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                                <Users className="w-8 h-8 text-white" />
                              </div>
                              {/* Glow effect */}
                              <div className="absolute inset-0 bg-gradient-to-br from-blue-400/30 to-indigo-500/30 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10"></div>
                            </div>
                          </div>

                          <div className="text-center">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-4xl font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300">
                                {totalLeads.toLocaleString()}
                              </span>
                            </div>
                            <p className="text-gray-500 dark:text-gray-400 text-base font-medium">Total Leads</p>
                          </div>
                        </div>
                      </div>
                    </Link>
                    <Link href="/crm-leads" className="block group">
                      <div className="group relative overflow-hidden bg-white dark:bg-gray-800 border border-gray-200/60 dark:border-gray-700/60 rounded-3xl p-8 shadow-lg hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-500 hover:-translate-y-2 cursor-pointer min-h-[180px]">
                        {/* Professional gradient overlay */}
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-blue-50/50 dark:from-blue-900/10 dark:to-blue-900/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                        {/* Animated background pattern */}
                        <div className="absolute inset-0 opacity-5 group-hover:opacity-10 transition-opacity duration-500">
                          <div className="absolute inset-0 bg-gradient-to-br from-blue-400/20 to-blue-400/20 rounded-3xl"></div>
                        </div>

                        {/* Card content */}
                        <div className="relative z-10 flex flex-col items-center justify-center text-center h-full">
                          <div className="flex items-start justify-between mb-6 w-full">
                            <div className="relative">
                              <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/25 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                                <PlusCircle className="w-8 h-8 text-white" />
                              </div>
                              {/* Glow effect */}
                              <div className="absolute inset-0 bg-gradient-to-br from-blue-400/30 to-blue-400/30 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10"></div>
                            </div>
                          </div>

                          <div className="text-center">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-4xl font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300">
                                {todaysLeadsCount.toLocaleString()}
                              </span>
                            </div>
                            <p className="text-gray-500 dark:text-gray-400 text-base font-medium">Today&apos;s Leads</p>
                          </div>
                        </div>
                      </div>
                    </Link>
                    <Link href="/crm-leads" className="block group">
                      <div className="group relative overflow-hidden bg-white dark:bg-gray-800 border border-gray-200/60 dark:border-gray-700/60 rounded-3xl p-8 shadow-lg hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-500 hover:-translate-y-2 cursor-pointer min-h-[180px]">
                        {/* Professional gradient overlay */}
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-blue-50/50 dark:from-blue-900/10 dark:to-blue-900/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                        {/* Animated background pattern */}
                        <div className="absolute inset-0 opacity-5 group-hover:opacity-10 transition-opacity duration-500">
                          <div className="absolute inset-0 bg-gradient-to-br from-blue-400/20 to-blue-400/20 rounded-3xl"></div>
                        </div>

                        {/* Card content */}
                        <div className="relative z-10 flex flex-col items-center justify-center text-center h-full">
                          <div className="flex items-start justify-between mb-6 w-full">
                            <div className="relative">
                              <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/25 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                                <Clock className="w-8 h-8 text-white" />
                              </div>
                              {/* Glow effect */}
                              <div className="absolute inset-0 bg-gradient-to-br from-blue-400/30 to-blue-400/30 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10"></div>
                            </div>
                          </div>

                          <div className="text-center">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-4xl font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300">
                                {pendingLeads.toLocaleString()}
                              </span>
                            </div>
                            <p className="text-gray-500 dark:text-gray-400 text-base font-medium">Pending Leads</p>
                          </div>
                        </div>
                      </div>
                    </Link>
                    <Link href="/crm-leads" className="block group">
                      <div className="group relative overflow-hidden bg-white dark:bg-gray-800 border border-gray-200/60 dark:border-gray-700/60 rounded-3xl p-8 shadow-lg hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-500 hover:-translate-y-2 cursor-pointer min-h-[180px]">
                        {/* Professional gradient overlay */}
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-blue-50/50 dark:from-blue-900/10 dark:to-blue-900/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                        {/* Animated background pattern */}
                        <div className="absolute inset-0 opacity-5 group-hover:opacity-10 transition-opacity duration-500">
                          <div className="absolute inset-0 bg-gradient-to-br from-blue-400/20 to-blue-400/20 rounded-3xl"></div>
                        </div>

                        {/* Card content */}
                        <div className="relative z-10 flex flex-col items-center justify-center text-center h-full">
                          <div className="flex items-start justify-between mb-6 w-full">
                            <div className="relative">
                              <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/25 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                                <CheckCircle className="w-8 h-8 text-white" />
                              </div>
                              {/* Glow effect */}
                              <div className="absolute inset-0 bg-gradient-to-br from-blue-400/30 to-blue-400/30 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10"></div>
                            </div>
                          </div>

                          <div className="text-center">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-4xl font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300">
                                {qualifiedLeads.toLocaleString()}
                              </span>
                            </div>
                            <p className="text-gray-500 dark:text-gray-400 text-base font-medium">Qualified Leads</p>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </div>

                  {/* Enhanced Desktop: 4-column grid */}
                  <div className="hidden md:grid mb-8 grid-cols-4 gap-4 w-full">
                    <Link href="/crm-leads" className="block group">
                      <div className="group relative overflow-hidden bg-white dark:bg-gray-800 border border-gray-200/60 dark:border-gray-700/60 rounded-3xl p-8 shadow-lg hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-500 hover:-translate-y-2 cursor-pointer min-h-[200px]">
                        {/* Professional gradient overlay */}
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-900/10 dark:to-indigo-900/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                        {/* Animated background pattern */}
                        <div className="absolute inset-0 opacity-5 group-hover:opacity-10 transition-opacity duration-500">
                          <div className="absolute inset-0 bg-gradient-to-br from-blue-400/20 to-indigo-400/20 rounded-3xl"></div>
                        </div>

                        {/* Card content */}
                        <div className="relative z-10 flex flex-col items-center justify-center text-center h-full">
                          <div className="flex items-start justify-between mb-6 w-full">
                            <div className="relative">
                              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/25 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                                <Users className="w-8 h-8 text-white" />
                              </div>
                              {/* Glow effect */}
                              <div className="absolute inset-0 bg-gradient-to-br from-blue-400/30 to-indigo-500/30 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10"></div>
                            </div>
                          </div>

                          <div className="text-center">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-4xl font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300">
                                {totalLeads.toLocaleString()}
                              </span>
                            </div>
                            <p className="text-gray-500 dark:text-gray-400 text-base font-medium">Total Leads</p>
                          </div>
                        </div>
                      </div>
                    </Link>
                    <Link href="/crm-leads" className="block group">
                      <div className="group relative overflow-hidden bg-white dark:bg-gray-800 border border-gray-200/60 dark:border-gray-700/60 rounded-3xl p-8 shadow-lg hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-500 hover:-translate-y-2 cursor-pointer min-h-[200px]">
                        {/* Professional gradient overlay */}
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-blue-50/50 dark:from-blue-900/10 dark:to-blue-900/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                        {/* Animated background pattern */}
                        <div className="absolute inset-0 opacity-5 group-hover:opacity-10 transition-opacity duration-500">
                          <div className="absolute inset-0 bg-gradient-to-br from-blue-400/20 to-blue-400/20 rounded-3xl"></div>
                        </div>

                        {/* Card content */}
                        <div className="relative z-10 flex flex-col items-center justify-center text-center h-full">
                          <div className="flex items-start justify-between mb-6 w-full">
                            <div className="relative">
                              <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/25 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                                <PlusCircle className="w-8 h-8 text-white" />
                              </div>
                              {/* Glow effect */}
                              <div className="absolute inset-0 bg-gradient-to-br from-blue-400/30 to-blue-400/30 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10"></div>
                            </div>
                          </div>

                          <div className="text-center">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-4xl font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300">
                                {todaysLeadsCount.toLocaleString()}
                              </span>
                            </div>
                            <p className="text-gray-500 dark:text-gray-400 text-base font-medium">Today&apos;s Leads</p>
                          </div>
                        </div>
                      </div>
                    </Link>
                    <Link href="/crm-leads" className="block group">
                      <div className="group relative overflow-hidden bg-white dark:bg-gray-800 border border-gray-200/60 dark:border-gray-700/60 rounded-3xl p-8 shadow-lg hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-500 hover:-translate-y-2 cursor-pointer min-h-[200px]">
                        {/* Professional gradient overlay */}
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-blue-50/50 dark:from-blue-900/10 dark:to-blue-900/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                        {/* Animated background pattern */}
                        <div className="absolute inset-0 opacity-5 group-hover:opacity-10 transition-opacity duration-500">
                          <div className="absolute inset-0 bg-gradient-to-br from-blue-400/20 to-blue-400/20 rounded-3xl"></div>
                        </div>

                        {/* Card content */}
                        <div className="relative z-10 flex flex-col items-center justify-center text-center h-full">
                          <div className="flex items-start justify-between mb-6 w-full">
                            <div className="relative">
                              <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/25 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                                <Clock className="w-8 h-8 text-white" />
                              </div>
                              {/* Glow effect */}
                              <div className="absolute inset-0 bg-gradient-to-br from-blue-400/30 to-blue-400/30 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10"></div>
                            </div>
                          </div>

                          <div className="text-center">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-4xl font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300">
                                {pendingLeads.toLocaleString()}
                              </span>
                            </div>
                            <p className="text-gray-500 dark:text-gray-400 text-base font-medium">Pending Leads</p>
                          </div>
                        </div>
                      </div>
                    </Link>
                    <Link href="/crm-leads" className="block group">
                      <div className="group relative overflow-hidden bg-white dark:bg-gray-800 border border-gray-200/60 dark:border-gray-700/60 rounded-3xl p-8 shadow-lg hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-500 hover:-translate-y-2 cursor-pointer min-h-[200px]">
                        {/* Professional gradient overlay */}
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-blue-50/50 dark:from-blue-900/10 dark:to-blue-900/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                        {/* Animated background pattern */}
                        <div className="absolute inset-0 opacity-5 group-hover:opacity-10 transition-opacity duration-500">
                          <div className="absolute inset-0 bg-gradient-to-br from-blue-400/20 to-blue-400/20 rounded-3xl"></div>
                        </div>

                        {/* Card content */}
                        <div className="relative z-10 flex flex-col items-center justify-center text-center h-full">
                          <div className="flex items-start justify-between mb-6 w-full">
                            <div className="relative">
                              <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/25 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                                <CheckCircle className="w-8 h-8 text-white" />
                              </div>
                              {/* Glow effect */}
                              <div className="absolute inset-0 bg-gradient-to-br from-blue-400/30 to-blue-400/30 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10"></div>
                            </div>
                          </div>

                          <div className="text-center">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-4xl font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300">
                                {qualifiedLeads.toLocaleString()}
                              </span>
                            </div>
                            <p className="text-gray-500 dark:text-gray-400 text-base font-medium">Qualified Leads</p>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </div>
                </>
              ) : (
                <div className="bg-gradient-to-br from-white via-white to-gray-50/30 dark:from-gray-800 dark:via-gray-800 dark:to-gray-900/50 rounded-2xl shadow-xl border-0 p-8 sm:p-12 mb-6 sm:mb-8 backdrop-blur-sm overflow-hidden relative">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-blue-500/10 rounded-full -translate-y-16 translate-x-16"></div>
                  <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-br from-blue-500/10 to-blue-500/10 rounded-full translate-y-12 -translate-x-12"></div>
                  <div className="relative z-10 text-center">
                    <div className="text-4xl sm:text-6xl mb-4">📊</div>
                    <div className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-200 bg-clip-text text-transparent mb-2">No Data Available</div>
                    <div className="text-sm sm:text-base text-gray-500 dark:text-gray-400">No leads found matching your current filters</div>
                  </div>
                </div>
              )}
              {/* Charts */}
              {totalLeads > 0 ? (
                <>
                  {/* Enhanced Heatmap */}
                  <div className="mb-4 sm:mb-6 md:mb-8 w-full">
                    <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-xl border border-gray-200/60 dark:border-gray-700/60 p-4 sm:p-6 md:p-8 overflow-hidden relative w-full">
                      {/* Enhanced Header */}
                      <div className="flex items-center gap-2 sm:gap-3 md:gap-4 mb-4 sm:mb-6 md:mb-8">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg sm:rounded-xl md:rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0">
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-white">
                            <path d="M3 3v18h18"></path>
                            <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3"></path>
                          </svg>
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-base sm:text-lg md:text-2xl font-bold text-gray-900 dark:text-white truncate">Leads by Source & Date</h3>
                          <p className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm mt-0.5 sm:mt-1 line-clamp-2">Visualize lead activity patterns across different sources and time periods.</p>
                        </div>
                      </div>

                      {/* Enhanced Heatmap Content */}
                      <div className="bg-gradient-to-br from-gray-50 to-gray-100/50 dark:from-gray-900/50 dark:to-gray-800/50 rounded-lg sm:rounded-xl p-3 sm:p-4 md:p-6 border border-gray-200/50 dark:border-gray-700/50 overflow-x-auto">
                        {filteredLeads.length > 0 ? (
                          <LeadsHeatmap leads={filteredLeads} />
                        ) : (
                          <div className="flex items-center justify-center h-64 text-gray-500">
                            <div className="text-center">
                              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                              </div>
                              <h4 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">No Data Available</h4>
                              <p className="text-sm text-gray-500 dark:text-gray-400">No leads found for the selected criteria</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  {/* Conversion Funnel (from Enhanced dashboard) */}
                  <div className="w-full mb-4 sm:mb-6">
                    {/* Conversion Funnel - Donut Chart */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-xl border border-gray-200/60 dark:border-gray-700/60 p-4 sm:p-6 md:p-8 overflow-hidden relative">
                      {/* Enhanced Header */}
                      <div className="flex items-center gap-2 sm:gap-3 md:gap-4 mb-4 sm:mb-6 md:mb-8">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg sm:rounded-xl md:rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0">
                          <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-white" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-base sm:text-lg md:text-2xl font-bold text-gray-900 dark:text-white">Conversion Funnel</h3>
                          <p className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm mt-0.5 sm:mt-1">Lead progression through conversion stages.</p>
                        </div>
                      </div>

                      {/* Chart Content */}
                      <div className="bg-gradient-to-br from-blue-50/50 to-blue-50/50 dark:from-blue-900/20 dark:to-blue-900/20 rounded-lg sm:rounded-xl p-3 sm:p-4 md:p-6 border border-blue-200/50 dark:border-blue-700/50 overflow-x-auto">
                        {chartsLoading ? (
                          <div className="flex items-center justify-center h-64 text-gray-500">
                            <div className="text-center">
                              <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-2"></div>
                              <p className="text-sm">Loading chart data...</p>
                            </div>
                          </div>
                        ) : chartsError ? (
                          <div className="flex items-center justify-center h-64 text-gray-500">
                            <div className="text-center">
                              <p className="text-sm">Failed to load funnel data</p>
                            </div>
                          </div>
                        ) : funnelData && funnelData.length > 0 ? (
                          <div className="w-full">
                            <ReactApexChart
                              options={{
                                chart: {
                                  type: 'bar',
                                  height: 280,
                                  toolbar: { show: false }
                                },
                                responsive: [{
                                  breakpoint: 640,
                                  options: {
                                    chart: { height: 250 }
                                  }
                                }],
                                plotOptions: {
                                  bar: {
                                    horizontal: false,
                                    columnWidth: '55%',
                                    borderRadius: 6,
                                    distributed: true
                                  }
                                },
                                dataLabels: {
                                  enabled: true,
                                  formatter: (val: number) => Math.round(val).toLocaleString(),
                                  offsetY: -18,
                                  style: { fontSize: '12px', colors: ['#111827'], fontWeight: 700 }
                                },
                                xaxis: {
                                  categories: funnelData
                                    .filter((i) => {
                                      const item = i as unknown as FunnelDataItem;
                                      return item.stage !== 'Lead Scored' && item.stage !== 'Demo Scheduled';
                                    })
                                    .map((i) => {
                                      const item = i as unknown as FunnelDataItem;
                                      return item.stage || 'Stage';
                                    }),
                                  labels: { style: { colors: '#64748b', fontSize: '12px' } },
                                  axisBorder: { color: '#e5e7eb' },
                                  axisTicks: { color: '#e5e7eb' }
                                },
                                yaxis: {
                                  labels: {
                                    formatter: (v: number) => Math.round(v).toLocaleString(),
                                    style: { colors: '#64748b', fontSize: '12px' }
                                  }
                                },
                                grid: { borderColor: '#e5e7eb', strokeDashArray: 4 },
                                tooltip: {
                                  y: {
                                    formatter: (v: number, { dataPointIndex }: { dataPointIndex: number }) => {
                                      const filteredData = funnelData.filter((i) => {
                                        const item = i as unknown as FunnelDataItem;
                                        return item.stage !== 'Lead Scored' && item.stage !== 'Demo Scheduled';
                                      });
                                      const prevItem = dataPointIndex > 0 ? filteredData[dataPointIndex - 1] : filteredData[dataPointIndex];
                                      const prev = (prevItem as unknown as FunnelDataItem & { leads?: number })?.leads || 0;
                                      const rate = prev > 0 ? ((v / prev) * 100).toFixed(1) : '100.0';
                                      return `${Math.round(v).toLocaleString()} leads • ${rate}% from previous`;
                                    }
                                  }
                                },
                                colors: ['#60a5fa', '#93c5fd', '#a7f3d0', '#6ee7b7', '#86efac', '#bae6fd', '#bfdbfe'],
                                fill: {
                                  type: 'gradient',
                                  gradient: {
                                    shadeIntensity: 0.35,
                                    opacityFrom: 0.95,
                                    opacityTo: 0.85,
                                    stops: [0, 90, 100]
                                  }
                                },
                                legend: { show: false }
                              }}
                              series={[{
                                name: 'Leads',
                                data: funnelData
                                  .filter((i) => {
                                    const item = i as unknown as FunnelDataItem;
                                    return item.stage !== 'Lead Scored' && item.stage !== 'Demo Scheduled';
                                  })
                                  .map((i) => {
                                    const item = i as unknown as FunnelDataItem & { leads?: number };
                                    return item.leads || 0;
                                  })
                              }]}
                              type="bar"
                              height={280}
                            />
                          </div>
                        ) : (
                          <div className="flex items-center justify-center h-64 text-gray-500">
                            <div className="text-center">
                              <p className="text-sm">No funnel data available</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  {/* Pipeline Trends Over Time */}
                  <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-xl border border-gray-200/60 dark:border-gray-700/60 p-4 sm:p-6 md:p-8 overflow-hidden relative mb-4 sm:mb-6">
                    {/* Enhanced Header */}
                    <div className="flex items-center gap-2 sm:gap-3 md:gap-4 mb-4 sm:mb-6 md:mb-8">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg sm:rounded-xl md:rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0">
                        <FileText className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-white" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-base sm:text-lg md:text-2xl font-bold text-gray-900 dark:text-white">Pipeline Trends Over Time</h3>
                        <p className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm mt-0.5 sm:mt-1">Lead volume trends over the selected period.</p>
                      </div>
                    </div>

                    {/* Chart Content */}
                    <div className="bg-gradient-to-br from-blue-50/50 to-blue-50/50 dark:from-blue-900/20 dark:to-blue-900/20 rounded-lg sm:rounded-xl p-3 sm:p-4 md:p-6 border border-blue-200/50 dark:border-blue-700/50 overflow-x-auto">
                      {chartsLoading ? (
                        <div className="flex items-center justify-center h-64 text-gray-500">
                          <div className="text-center">
                            <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-2"></div>
                            <p className="text-sm">Loading chart data...</p>
                          </div>
                        </div>
                      ) : chartsError ? (
                        <div className="flex items-center justify-center h-64 text-gray-500">
                          <div className="text-center">
                            <p className="text-sm">Failed to load trends data</p>
                          </div>
                        </div>
                      ) : pipelineTrends && pipelineTrends.length > 0 ? (
                        <ReactApexChart
                          options={{
                            ...trendsChartOptions,
                            chart: { ...trendsChartOptions.chart, toolbar: { show: false } },
                            colors: ['#3b82f6'],
                            stroke: { curve: 'smooth', width: 3 },
                            markers: { size: 6, colors: ['#3b82f6'], strokeColors: '#fff', strokeWidth: 2 },
                            fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.7, opacityTo: 0.3, stops: [0, 100] } },
                            grid: { borderColor: '#e2e8f0', strokeDashArray: 4, xaxis: { lines: { show: false } }, yaxis: { lines: { show: true } } },
                          }}
                          series={[{
                            name: 'Leads', data: pipelineTrends.map((item) => {
                              const itemData = item as unknown as TrendsDataItem & { value?: number };
                              return itemData.value || 0;
                            })
                          }]}
                          type="line"
                          height={280}
                        />
                      ) : (
                        <div className="flex items-center justify-center h-64 text-gray-500">
                          <div className="text-center">
                            <p className="text-sm">No trends data available</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Charts Grid - Enhanced with modern styling and better space utilization */}
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 sm:gap-4 w-full">
                    {/* Enhanced Leads by Interest */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-xl border border-gray-200/60 dark:border-gray-700/60 p-4 sm:p-6 md:p-8 overflow-hidden relative">
                      {/* Enhanced Header */}
                      <div className="flex items-center gap-2 sm:gap-3 md:gap-4 mb-4 sm:mb-6 md:mb-8">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg sm:rounded-xl md:rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0">
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-white">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>
                          </svg>
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-base sm:text-lg md:text-2xl font-bold text-gray-900 dark:text-white">Leads by Interest</h3>
                          <p className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm mt-0.5 sm:mt-1">Distribution of leads across different interest categories.</p>
                        </div>
                      </div>

                      {/* Enhanced Chart Content */}
                      <div className="bg-gradient-to-br from-blue-50/50 to-blue-50/50 dark:from-blue-900/20 dark:to-blue-900/20 rounded-lg sm:rounded-xl p-3 sm:p-4 md:p-6 border border-blue-200/50 dark:border-blue-700/50 overflow-x-auto">
                        <div className="w-full">
                          {interestLabels.length > 0 && interestSeries.some((v) => v > 0) ? (
                            <>
                              {/* Donut using all interests */}
                              {(() => {
                                const displayPairs = sortedInterests.filter(([, v]) => v > 0);
                                const displayLabels = displayPairs.map(([k]) => k);
                                const displaySeries = displayPairs.map(([, v]) => v);
                                return (
                                  <div className="flex justify-center items-center">
                                    <div className="w-full max-w-[340px]">
                                      <ReactApexChart
                                        options={{
                                          labels: displayLabels,
                                          legend: { position: 'bottom' },
                                          chart: { type: 'donut' },
                                          plotOptions: { pie: { donut: { size: '65%' } } },
                                          dataLabels: { enabled: false },
                                          tooltip: { y: { formatter: function (value: number) { return "" + value; } } },
                                          responsive: [
                                            { breakpoint: 768, options: { chart: { width: 280 }, plotOptions: { pie: { donut: { size: '60%' } } }, dataLabels: { enabled: false } } },
                                            { breakpoint: 480, options: { chart: { width: 250 }, plotOptions: { pie: { donut: { size: '58%' } } }, dataLabels: { enabled: false } } }
                                          ]
                                        }}
                                        series={displaySeries}
                                        type="donut"
                                        width="100%"
                                        height={280}
                                      />
                                    </div>
                                  </div>
                                );
                              })()}
                            </>
                          ) : (
                            <div className="flex items-center justify-center h-64 text-gray-500">
                              <div className="text-center">
                                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                                <p className="mt-2 text-sm">No interest data available</p>
                                <p className="text-xs text-gray-400">No interests found for the selected criteria</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    {/* Enhanced Leads by Agent */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-xl border border-gray-200/60 dark:border-gray-700/60 p-4 sm:p-6 md:p-8 overflow-hidden relative">
                      {/* Enhanced Header */}
                      <div className="flex items-center gap-2 sm:gap-3 md:gap-4 mb-4 sm:mb-6 md:mb-8">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-gradient-to-br from-blue-600 to-blue-600 rounded-lg sm:rounded-xl md:rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0">
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-white">
                            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                            <circle cx="9" cy="7" r="4"></circle>
                            <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                          </svg>
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-base sm:text-lg md:text-2xl font-bold text-gray-900 dark:text-white">Leads by Agent</h3>
                          <p className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm mt-0.5 sm:mt-1">Lead distribution and performance across team members.</p>
                        </div>
                      </div>

                      {/* Enhanced Chart Content */}
                      <div className="bg-gradient-to-br from-blue-50/50 to-blue-50/50 dark:from-blue-900/20 dark:to-blue-900/20 rounded-lg sm:rounded-xl p-3 sm:p-4 md:p-6 border border-blue-200/50 dark:border-blue-700/50 overflow-x-auto">
                        <div className="w-full">
                          {sortedAgents.length > 0 ? (
                            <>
                              <div className="mb-3 grid grid-cols-2 gap-2 text-[11px] sm:text-xs text-gray-600 dark:text-gray-400">
                                <div>Agents: <span className="font-medium text-gray-800 dark:text-gray-200">{sortedAgents.length}</span></div>
                              </div>
                              <div className="space-y-4 max-h-80 overflow-y-auto pr-1">
                                {sortedAgents.map(([agent, count]) => {
                                  const pct = Math.round((count / totalAgentLeads) * 100);
                                  const isUnassigned = agent === 'Unassigned';
                                  return (
                                    <div
                                      key={agent}
                                      className="group p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-300"
                                    >
                                      <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-3 min-w-0">
                                          <div
                                            className={`w-12 h-12 rounded-xl flex items-center justify-center text-sm font-bold shadow-lg ${isUnassigned
                                                ? 'bg-gradient-to-br from-gray-400 to-gray-500 text-white'
                                                : 'bg-gradient-to-br from-blue-500 to-blue-600 text-white'
                                              }`}
                                            title={agent}
                                          >
                                            {isUnassigned ? '?' : (agent || '').charAt(0).toUpperCase()}
                                          </div>
                                          <div className="min-w-0">
                                            <div className="flex items-center gap-2 min-w-0">
                                              <div className="truncate text-sm font-semibold text-gray-900 dark:text-white" title={agent}>{agent}</div>
                                              {!isUnassigned && (
                                                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                                              )}
                                            </div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400">{pct}% of assigned leads</div>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                          <span className="inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-blue-50 to-blue-50 text-blue-700 dark:from-blue-900/30 dark:to-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-700">
                                            {count} leads
                                          </span>
                                        </div>
                                      </div>

                                      {/* Enhanced Progress Bar */}
                                      <div className="relative">
                                        <div className="h-3 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                          <div
                                            className={`h-full transition-all duration-700 ease-out ${isUnassigned
                                                ? 'bg-gradient-to-r from-gray-400 to-gray-500'
                                                : 'bg-gradient-to-r from-blue-500 via-blue-500 to-blue-500'
                                              }`}
                                            style={{ width: `${pct}%` }}
                                          >
                                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent rounded-full animate-pulse"></div>
                                          </div>
                                        </div>
                                        <div className="mt-1 flex justify-between text-xs text-gray-500 dark:text-gray-400">
                                          <span>0</span>
                                          <span className="font-medium">{pct}%</span>
                                          <span>{totalAgentLeads}</span>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </>
                          ) : (
                            <div className="text-center py-6 text-gray-500 dark:text-gray-400 text-sm">No agent assignment data</div>
                          )}
                        </div>
                      </div>
                    </div>
                    {/* Removed Leads by Type chart as requested */}
                    {/* Enhanced Lead Status Breakdown */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-xl border border-gray-200/60 dark:border-gray-700/60 p-4 sm:p-6 md:p-8 overflow-hidden relative">
                      {/* Enhanced Header */}
                      <div className="flex items-center gap-2 sm:gap-3 md:gap-4 mb-4 sm:mb-6 md:mb-8">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-blue-600 rounded-lg sm:rounded-xl md:rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0">
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-white">
                            <path d="M9 11H5a2 2 0 0 0-2 2v3c0 1.1.9 2 2 2h4l3 3V8l-3 3z"></path>
                            <path d="M22 12c0-3-2-5-2-5s-2 2-2 5 2 5 2 5 2-2 2-5z"></path>
                          </svg>
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-base sm:text-lg md:text-2xl font-bold text-gray-900 dark:text-white">Lead Status Breakdown</h3>
                          <p className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm mt-0.5 sm:mt-1">Current status distribution of leads in your pipeline.</p>
                        </div>
                      </div>

                      {/* Enhanced Chart Content */}
                      <div className="bg-blue-50/50 dark:bg-blue-900/20 rounded-lg sm:rounded-xl p-3 sm:p-4 md:p-6 border border-blue-200/50 dark:border-blue-700/50 overflow-x-auto">
                        <div className="w-full flex justify-center items-center">
                          <div className="w-full max-w-[300px] sm:max-w-[340px] flex justify-center">
                            {donutSeries.some(value => value > 0) ? (
                              <ReactApexChart
                                options={{
                                  labels: donutLabels,
                                  legend: { position: "bottom" },
                                  chart: { type: "donut" },
                                  plotOptions: {
                                    pie: {
                                      donut: { size: '65%' }
                                    }
                                  },
                                  dataLabels: {
                                    enabled: false
                                  },
                                  tooltip: {
                                    y: {
                                      formatter: function (value: number) {
                                        try {
                                          // Show raw count instead of percentage
                                          return "" + value;
                                        } catch {
                                          return "" + value;
                                        }
                                      }
                                    }
                                  },
                                  responsive: [
                                    {
                                      breakpoint: 768,
                                      options: {
                                        chart: { width: 280 },
                                        plotOptions: { pie: { donut: { size: '60%' } } },
                                        dataLabels: { enabled: false }
                                      }
                                    },
                                    {
                                      breakpoint: 480,
                                      options: {
                                        chart: { width: 250 },
                                        plotOptions: { pie: { donut: { size: '58%' } } },
                                        dataLabels: { enabled: false }
                                      }
                                    }
                                  ],
                                }}
                                series={donutSeries}
                                type="donut"
                                width="100%"
                                height={280}
                              />
                            ) : (
                              <div className="flex items-center justify-center h-64 text-gray-500">
                                <div className="text-center">
                                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                  </svg>
                                  <p className="mt-2 text-sm">No data available</p>
                                  <p className="text-xs text-gray-400">No status data found</p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="bg-gradient-to-br from-white via-white to-gray-50/30 dark:from-gray-800 dark:via-gray-800 dark:to-gray-900/50 rounded-2xl shadow-xl border-0 p-8 sm:p-12 backdrop-blur-sm overflow-hidden relative">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-blue-500/10 rounded-full -translate-y-16 translate-x-16"></div>
                  <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-br from-blue-500/10 to-blue-500/10 rounded-full translate-y-12 -translate-x-12"></div>
                  <div className="relative z-10 text-center">
                    <div className="text-4xl sm:text-6xl mb-4">📈</div>
                    <div className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-200 bg-clip-text text-transparent mb-2">No Charts to Display</div>
                    <div className="text-sm sm:text-base text-gray-500 dark:text-gray-400">Charts will appear when lead data is available</div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
export default LeadsDashboard;