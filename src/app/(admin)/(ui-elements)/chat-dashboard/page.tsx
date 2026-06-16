'use client';
import React, { useEffect, useState, useRef } from 'react';
import {
  Bot,
  User,
  AlertCircle,
  ArrowLeft,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { Toaster } from 'react-hot-toast';
// Removed unused PageHeader import
// Removed LineChartOne and BarChartOne imports - no longer used after removing analytics section
import DashboardHeader from '@/components/header/DashboardHeader';
import { DateRangePicker } from '@/components/header/actionbar';
import ConfirmModal from '@/components/ui/modal/ConfirmModal';
import Alert from '@/components/ui/alert/Alert';
// --- TYPE DEFINITIONS ---
type Message = {
  id: string;
  sender: 'user' | 'bot' | 'system';
  text: string;
  timestamp: string;
  responseTime?: number;
};



type ChatSession = {
  session_id: string;
  title: string;
  created_at: string;
  updated_at?: string;
  last_modified?: string;
  timestamp?: string;
  date?: string;
  latest_timestamp?: string; // Latest timestamp from conversation history
  messages: Message[];
  tags: string[];
  domain: string; // <-- Add domain property
  user_type?: string; // User type for WhatsApp sessions (GUEST, EMP, etc.)
  instagram_id?: string; // Instagram ID for Instagram sessions
};
// --- FILTER STATE AND LOGIC ---
const useChatFilters = () => {
  const [filterQuery, setFilterQuery] = useState("");
  const [filterField, setFilterField] = useState('title'); // For ActionBar compatibility
  const [timelineFilter, setTimelineFilter] = useState('');
  const [sessionTypeFilter, setSessionTypeFilter] = useState<'all' | 'whatsapp' | 'telegram' | 'instagram' | 'other'>('all');
  const [pendingCustomRange, setPendingCustomRange] = useState<[Date | null, Date | null]>([null, null]);
  const [showFilterField, setShowFilterField] = useState(false);
  const [showCustomPopover, setShowCustomPopover] = useState(false);
  const customPopoverRef = useRef<HTMLDivElement | null>(null);
  // Click outside to close custom popover (like overview dashboard)
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!showCustomPopover || !customPopoverRef.current) return;

      const target = event.target as Node;

      // Don't close if clicking inside the popover
      if (customPopoverRef.current.contains(target)) {
        return;
      }

      // Don't close if clicking on flatpickr calendar elements (date picker calendar)
      const element = target as Element;
      if (
        element.closest?.('.flatpickr-calendar') ||
        element.closest?.('.flatpickr-day') ||
        element.closest?.('.flatpickr-month') ||
        element.closest?.('.flatpickr-weekday') ||
        element.closest?.('.flatpickr-current-month') ||
        element.closest?.('.flatpickr-months') ||
        element.closest?.('.flatpickr-prev-month') ||
        element.closest?.('.flatpickr-next-month') ||
        element.closest?.('.flatpickr-year') ||
        element.closest?.('.flatpickr-current-year') ||
        element.closest?.('#date-range-picker')
      ) {
        return;
      }

      // Close if clicking outside
      setShowCustomPopover(false);
    }
    if (showCustomPopover) {
      // Add delay to prevent immediate closing when opening
      const timeoutId = setTimeout(() => {
        document.addEventListener("mousedown", handleClickOutside);
      }, 200);
      return () => {
        clearTimeout(timeoutId);
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [showCustomPopover]);
  return {
    filterQuery,
    setFilterQuery,
    filterField,
    setFilterField,
    timelineFilter,
    setTimelineFilter,
    sessionTypeFilter,
    setSessionTypeFilter,
    pendingCustomRange,
    setPendingCustomRange,
    showFilterField,
    setShowFilterField,
    showCustomPopover,
    setShowCustomPopover,
    customPopoverRef,
  };
};
const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL;
if (!BACKEND_URL) {
  throw new Error('NEXT_PUBLIC_API_URL environment variable is not set');
}
const WHATSAPP_BOT_API_URL = process.env.NEXT_PUBLIC_WHATSAPP_BOT_API_URL || BACKEND_URL;
const TELEGRAM_BOT_API_URL = 'https://telegram-aiagent.mobiloitte.io';
const INSTAGRAM_BOT_API_URL = 'https://instabot-aiagent.mobiloitte.io';

// Removed ChatVolumeOverTimeChart - no longer used after removing analytics section
/* const ChatVolumeOverTimeChart: React.FC<{ timelineFilter: string; pendingCustomRange: [Date | null, Date | null] }> = ({ timelineFilter, pendingCustomRange }) => {
  const [series] = useState<{ name: string; data: number[] }[]>([]);
  const [data, setData] = useState<{ duration: number; timestamp: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  useEffect(() => {
    setIsLoading(true);
    // Use multiple endpoints for line chart to get data from different domains
    const endpoints = [
      BACKEND_URL + "/dashboard/domain/domain_1/chat-volume-over-time",
      BACKEND_URL + "/dashboard/domain/domain_2/chat-volume-over-time",
      BACKEND_URL + "/dashboard/domain/tech_company/chat-volume-over-time"
    ];
    const tryEndpoint = async (url: string) => {
      try {
        const response = await fetch(url, { headers: { 'accept': 'application/json' } });
        if (response.ok) {
          const data = await response.json();
          return data;
        }
      } catch {
        // ignore
      }
      return null;
    };
    // Helper function to get date range based on filter
    const getDateRange = (filter: string) => {
      const now = new Date();
      let start: Date | null = null;
      let end: Date | null = null;
      switch (filter) {
        case 'today':
          start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
          break;
        case 'yesterday':
          start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
          end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'thisweek':
          const dayOfWeek = now.getDay();
          const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
          start = new Date(now.getFullYear(), now.getMonth(), diff);
          end = new Date(now.getFullYear(), now.getMonth(), diff + 7);
          break;
        case 'thismonth':
          start = new Date(now.getFullYear(), now.getMonth(), 1);
          end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
          break;
        case 'lastweek':
          const lastWeekDayOfWeek = now.getDay();
          const lastWeekDiff = now.getDate() - lastWeekDayOfWeek - 6;
          start = new Date(now.getFullYear(), now.getMonth(), lastWeekDiff);
          end = new Date(now.getFullYear(), now.getMonth(), lastWeekDiff + 7);
          break;
        case 'custom':
          if (pendingCustomRange[0] && pendingCustomRange[1]) {
            start = new Date(pendingCustomRange[0]);
            end = new Date(pendingCustomRange[1]);
            end.setHours(23, 59, 59, 999);
          }
          break;
        default:
          return { start: null, end: null };
      }
      return { start, end };
    };
    const isDateInRange = (dateStr: string, start: Date | null, end: Date | null) => {
      if (!start || !end) return true;
      try {
        const itemDate = new Date(dateStr);
        return itemDate >= start && itemDate < end;
      } catch {
        return false;
      }
    };
    const fetchData = async () => {
      const successfulResponses: Array<{ data: Array<{ count: number; date: string;[key: string]: unknown }> }> = [];
      for (const endpoint of endpoints) {
        const data = await tryEndpoint(endpoint);
        if (data && Array.isArray(data.data)) {
          successfulResponses.push(data);
        }
      }
      if (successfulResponses.length > 0) {
        const { start, end } = getDateRange(timelineFilter);
        const aggregatedData: { [key: string]: number } = {};
        successfulResponses.forEach(response => {
          response.data.forEach((item: { count: number; date: string;[key: string]: unknown }) => {
            if (isDateInRange(item.date, start, end)) {
              const date = new Date(item.date);
              const month = String(date.getMonth() + 1).padStart(2, '0');
              const day = String(date.getDate()).padStart(2, '0');
              const timestamp = month + "-" + day;
              aggregatedData[timestamp] = (aggregatedData[timestamp] || 0) + item.count;
            }
          });
        });
        const chartData = Object.entries(aggregatedData)
          .map(([timestamp, count]) => ({ duration: count, timestamp }))
          .sort((a, b) => new Date("2024-" + a.timestamp).getTime() - new Date("2024-" + b.timestamp).getTime());
        setData(chartData);
      } else {
        setData([]);
      }
      setIsLoading(false);
    };
    fetchData();
  }, [timelineFilter, pendingCustomRange]);
  return (
    <div className="col-span-12 rounded-2xl bg-gradient-to-br from-white via-white to-gray-50/30 dark:from-gray-800 dark:via-gray-800 dark:to-gray-900/50 p-6 shadow-xl border-0 overflow-hidden backdrop-blur-sm relative xl:col-span-12 w-full">
      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z" />
            </svg>
          </div>
          <h5 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-200 bg-clip-text text-transparent">Chat Volume</h5>
        </div>
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : data.length > 0 ? (
          <LineChartOne data={data} series={series} />
        ) : (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="text-gray-400 dark:text-gray-500 text-lg font-medium mb-2">No Data Available</div>
              <div className="text-gray-400 dark:text-gray-500 text-sm">
                No chat volume data available
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}; */
// Removed ChatVolumeBarChart - no longer used after removing analytics section
/* const ChatVolumeBarChart: React.FC<{ timelineFilter: string; pendingCustomRange: [Date | null, Date | null] }> = ({ timelineFilter, pendingCustomRange }) => {
  const [barData, setBarData] = useState<{ label: string; value: number }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  useEffect(() => {
    setIsLoading(true);
    // Use multiple endpoints for bar chart to get data from different domains
    const endpoints = [
      BACKEND_URL + "/dashboard/domain/domain_1/chat-volume-heatmap",
      BACKEND_URL + "/dashboard/domain/domain_2/chat-volume-heatmap",
      BACKEND_URL + "/dashboard/domain/tech_company/chat-volume-heatmap"
    ];
    const tryEndpoint = async (url: string) => {
      try {
        const response = await fetch(url, { headers: { 'accept': 'application/json' } });
        if (response.ok) {
          const data = await response.json();
          console.log(`Bar chart API response from ${url}:`, data);
          return data;
        }
      } catch (error) {
        console.log(`Failed to fetch from ${url}:`, error);
      }
      return null;
    };
    // Helper function to get hour range based on filter for bar chart
    const getHourRange = (filter: string) => {
      switch (filter) {
        case 'today':
          // Show business hours for today (9 AM to 6 PM)
          return { start: 9, end: 18 };
        case 'yesterday':
          // Show business hours for yesterday (9 AM to 6 PM)
          return { start: 9, end: 18 };
        case 'last12':
          // Show peak hours for last 12 hours (7 AM to 9 PM)
          return { start: 7, end: 22 };
        case 'custom':
          // For custom range, show business hours (9 AM to 6 PM)
          return { start: 9, end: 18 };
        default:
          // For 'all' or empty filter, show all hours
          return { start: 0, end: 24 };
      }
    };
    // Try each endpoint and aggregate data from all successful responses
    const fetchData = async () => {
      const successfulResponses: Array<{
        data: Array<{
          hour?: number;
          hour_label?: string;
          count?: number;
          intensity?: number;
          label?: string;
          value?: number;
          date?: string;
          [key: string]: unknown;
        }>
      }> = [];

      // Fetch from all endpoints
      for (const endpoint of endpoints) {
        const data = await tryEndpoint(endpoint);
        if (data && Array.isArray(data.data)) {
          successfulResponses.push(data);
          console.log(`Successfully fetched bar chart data from ${endpoint}:`, data);
        } else {
          console.log(`No valid bar chart data from ${endpoint}:`, data);
        }
      }
      if (successfulResponses.length > 0) {
        // Get hour range based on current filter
        const { start: hourStart, end: hourEnd } = getHourRange(timelineFilter);
        console.log(`Filtering bar chart data with hour range:`, {
          filter: timelineFilter,
          start: hourStart,
          end: hourEnd
        });
        // The API response contains hourly data with hour, hour_label, count, and intensity
        const aggregatedData: { [key: string]: number } = {};

        successfulResponses.forEach(response => {
          response.data.forEach((item: {
            hour?: number;
            hour_label?: string;
            count?: number;
            intensity?: number;
            label?: string;
            value?: number;
            date?: string;
            [key: string]: unknown;
          }) => {
            // If custom selected and item has a date, filter by selected range
            if (timelineFilter === 'custom' && pendingCustomRange[0] && pendingCustomRange[1] && item.date) {
              try {
                const d = new Date(item.date);
                const startD = new Date(pendingCustomRange[0]);
                const endD = new Date(pendingCustomRange[1]);
                endD.setHours(23, 59, 59, 999);
                if (!(d >= startD && d <= endD)) {
                  return; // skip out-of-range items
                }
              } catch { }
            }
            // Filter by hour range
            const hour = item.hour || 0;
            let isInHourRange = false;

            if (hourStart <= hourEnd) {
              // Normal range (e.g., 9-18 for business hours)
              isInHourRange = hour >= hourStart && hour < hourEnd;
            } else {
              // Wrapped range (e.g., 22-7 for off hours)
              isInHourRange = hour >= hourStart || hour < hourEnd;
            }

            if (isInHourRange) {
              const label = item.hour_label || ("Hour " + item.hour) || item.label || '';
              const value = item.count || item.value || 0;

              if (aggregatedData[label]) {
                aggregatedData[label] += value;
              } else {
                aggregatedData[label] = value;
              }
            }
          });
        });
        // Convert aggregated data to chart format
        const chartData = Object.entries(aggregatedData).map(([label, value]) => ({
          label: label,
          value: value,
        }));
        console.log('Filtered bar chart data:', chartData);
        console.log("Filter applied: " + timelineFilter + ", Data points: " + chartData.length);
        setBarData(chartData);
      } else {
        console.log('No successful responses from any endpoint for bar chart');
        setBarData([]);
      }

      setIsLoading(false);
    };
    fetchData();
  }, [timelineFilter, pendingCustomRange]);
  return (
    <div className="col-span-12 rounded-2xl bg-gradient-to-br from-white via-white to-gray-50/30 dark:from-gray-800 dark:via-gray-800 dark:to-gray-900/50 p-6 shadow-xl border-0 overflow-hidden backdrop-blur-sm relative xl:col-span-12 w-full">
      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z" />
            </svg>
          </div>
          <h5 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-200 bg-clip-text text-transparent">Volume by Hours</h5>
        </div>
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : barData.length > 0 ? (
          <div className="w-full h-48 sm:h-56 md:h-64 lg:h-72 xl:h-80">
            <BarChartOne data={barData} hideLegend={true} />
          </div>
        ) : (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="text-gray-400 dark:text-gray-500 text-lg font-medium mb-2">No Data Available</div>
              <div className="text-gray-400 dark:text-gray-500 text-sm">
                No volume by hours data available
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}; */
// Helper function to convert Unix timestamp to ISO string
const convertUnixTimestamp = (timestamp: number | string | null | undefined): string | null => {
  if (!timestamp) return null;
  try {
    const num = typeof timestamp === 'string' ? parseFloat(timestamp) : timestamp;
    if (isNaN(num)) return null;
    // If timestamp is in seconds, convert to milliseconds
    const ms = num < 10000000000 ? num * 1000 : num;
    return new Date(ms).toISOString();
  } catch {
    return null;
  }
};
// --- MAIN DASHBOARD COMPONENT ---
export default function ChatDashboardPage() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [filteredSessions, setFilteredSessions] = useState<ChatSession[]>([]);
  const [activeSession, setActiveSession] = useState<ChatSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [showChatOnMobile, setShowChatOnMobile] = useState(false);
  const [showHelp] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmMsg, setConfirmMsg] = useState("");
  const [sessionToDelete, setSessionToDelete] = useState<ChatSession | null>(null);

  // Alert state for toast messages
  const [showAlert, setShowAlert] = useState(false);
  const [alertType, setAlertType] = useState<'success' | 'error' | 'warning' | 'info'>('info');
  const [alertMessage, setAlertMessage] = useState('');

  // Use the filter hook
  const filterState = useChatFilters();

  // Auto-hide alert after 5 seconds
  useEffect(() => {
    if (showAlert) {
      const timer = setTimeout(() => {
        setShowAlert(false);
        setAlertMessage('');
        setAlertType('info');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showAlert]);

  // Fetch all sessions function - reusable for refresh
  const fetchAllSessions = async () => {
    setLoading(true);
    try {
      const [sessions1, sessions2, sessions3, techCompanySessions, aiagentSessions, telegramSessions, instagramUsers] = await Promise.all([
        // Existing domain-based endpoints
        fetch(BACKEND_URL + "/domain/domain_1/sessions", { headers: { 'accept': 'application/json' } }).then(res => res.json()).catch((err) => { console.error('domain_1 error', err); return { sessions: [] }; }),
        fetch(BACKEND_URL + "/domain/domain_2/sessions", { headers: { 'accept': 'application/json' } }).then(res => res.json()).catch((err) => { console.error('domain_2 error', err); return { sessions: [] }; }),
        fetch(BACKEND_URL + "/domain/tech_company/sessions", { headers: { 'accept': 'application/json' } }).then(res => res.json()).catch((err) => { console.error('tech_company error', err); return { sessions: [] }; }),
        // Tech Company domain endpoint
        fetch(BACKEND_URL + "/domain/tech_company/sessions", { headers: { 'accept': 'application/json' } }).then(res => res.json()).catch((err) => { console.error('tech_company error', err); return { sessions: [] }; }),
        // WhatsApp AI Agent endpoint
        fetch(WHATSAPP_BOT_API_URL + "/aiagent/sessions", { headers: { 'accept': 'application/json' } }).then(res => res.json()).catch((err) => { console.error('aiagent sessions error', err); return []; }),
        // Telegram Bot endpoint
        fetch(TELEGRAM_BOT_API_URL + "/chat/sessions?limit=100&skip=0", { headers: { 'accept': 'application/json' } }).then(res => res.json()).catch((err) => { console.error('telegram sessions error', err); return []; }),
        // Instagram Bot endpoint
        fetch(INSTAGRAM_BOT_API_URL + "/chat/users?days=30", { headers: { 'accept': 'application/json' } })
          .then(res => {
            if (!res.ok) {
              console.warn('Instagram API response not OK:', res.status, res.statusText);
              return { users: [] };
            }
            return res.json();
          })
          .then(data => {
            console.log('Instagram API response:', data);
            return data;
          })
          .catch((err) => {
            console.error('instagram users error', err);
            return { users: [] };
          }),
      ]);

      // Process domain-based sessions
      // Ensure session_id is set from title if not present (preserves original UUID for API calls)
      const domainSessions = [
        ...(Array.isArray(sessions1?.sessions) ? sessions1.sessions.map((s: Record<string, unknown>) => ({
          ...s,
          domain: 'domain_1',
          session_id: s.session_id || s.title || '', // Preserve original identifier
        })) : []),
        ...(Array.isArray(sessions2?.sessions) ? sessions2.sessions.map((s: Record<string, unknown>) => ({
          ...s,
          domain: 'domain_2',
          session_id: s.session_id || s.title || '', // Preserve original identifier
        })) : []),
        ...(Array.isArray(sessions3?.sessions) ? sessions3.sessions.map((s: Record<string, unknown>) => ({
          ...s,
          domain: 'tech_company',
          session_id: s.session_id || s.title || '', // Preserve original identifier
        })) : []),
        ...(Array.isArray(techCompanySessions?.sessions) ? techCompanySessions.sessions.map((s: Record<string, unknown>) => ({
          ...s,
          domain: 'tech_company',
          session_id: s.session_id || s.title || '', // Preserve original identifier
        })) : []),
      ];

      // Process WhatsApp AI Agent sessions
      const whatsappSessions = Array.isArray(aiagentSessions) ? aiagentSessions.map((s: Record<string, unknown>) => {
        // Convert Unix timestamps to ISO strings
        const created_at = convertUnixTimestamp(s.created_at as number) || new Date().toISOString();
        const updated_at = convertUnixTimestamp(s.updated_at as number) || created_at;

        return {
          session_id: s.session_id || '',
          title: s.title || 'Untitled',
          created_at: created_at,
          updated_at: updated_at,
          latest_timestamp: updated_at, // Use updated_at as latest timestamp
          domain: 'aiagent', // Mark as aiagent domain
          messages: [], // Will be fetched when session is selected
          tags: s.tags || [],
          user_type: s.user_type || 'GUEST',
          message_count: s.message_count || 0,
        };
      }) : [];

      // Process Telegram Bot sessions
      const telegramSessionsProcessed = Array.isArray(telegramSessions) ? telegramSessions.map((s: Record<string, unknown>) => {
        // Convert Unix timestamps to ISO strings
        const created_at = convertUnixTimestamp(s.created_at as number) || new Date().toISOString();
        const updated_at = convertUnixTimestamp(s.updated_at as number) || created_at;

        // Use user_name if available, otherwise fall back to title or session_id
        const userName = s.user_name as string | undefined;
        const title = userName || (s.title as string) || (s.session_id as string) || 'Untitled';

        return {
          session_id: s.session_id || '',
          title: title,
          created_at: created_at,
          updated_at: updated_at,
          latest_timestamp: updated_at, // Use updated_at as latest timestamp
          domain: 'telegram', // Mark as telegram domain
          messages: [], // Will be fetched when session is selected
          tags: s.tags || [],
          user_type: s.user_type || 'guest',
          message_count: s.message_count || 0,
        };
      }) : [];

      // Process Instagram Bot users
      // Handle multiple response formats:
      // 1. { users: [...] }
      // 2. Array directly [...]
      // 3. Single object with user_id
      let instagramUsersList: Record<string, unknown>[] = [];
     
      if (instagramUsers) {
        if (Array.isArray(instagramUsers)) {
          // Response is an array directly
          instagramUsersList = instagramUsers;
        } else if (Array.isArray(instagramUsers.users)) {
          // Response has users property
          instagramUsersList = instagramUsers.users;
        } else if (instagramUsers.user_id) {
          // Single user object with user_id
          instagramUsersList = [instagramUsers];
        } else if (typeof instagramUsers === 'object') {
          // Try to find any array property
          const keys = Object.keys(instagramUsers);
          for (const key of keys) {
            if (Array.isArray((instagramUsers as Record<string, unknown>)[key])) {
              instagramUsersList = (instagramUsers as Record<string, unknown>)[key] as Record<string, unknown>[];
              break;
            }
          }
        }
      }
     
      const instagramSessionsProcessed = instagramUsersList.map((u: Record<string, unknown>) => {
        // Handle different ID field names
        const userId = u._id || u.user_id || u.id || '';
       
        // Convert ISO timestamps - handle different timestamp field names
        const first_activity = u.first_activity ? String(u.first_activity) :
                              u.created_at ? String(u.created_at) :
                              u.timestamp ? String(u.timestamp) :
                              new Date().toISOString();
        const last_activity = u.last_activity ? String(u.last_activity) :
                             u.updated_at ? String(u.updated_at) :
                             u.latest_timestamp ? String(u.latest_timestamp) :
                             first_activity;

        // Get username from different possible fields
        const username = u.username || u.name || u.display_name || '';

        return {
          session_id: userId,
          title: username ? String(username) : `Instagram User ${userId}`,
          created_at: first_activity,
          updated_at: last_activity,
          latest_timestamp: last_activity, // Use last_activity as latest timestamp
          domain: 'instagram', // Mark as instagram domain
          messages: [], // Will be fetched when session is selected
          tags: [],
          user_type: 'guest',
          message_count: u.message_count || u.total_messages || 0,
          instagram_id: userId, // Store Instagram ID
        };
      });
     
      console.log(`Processed ${instagramSessionsProcessed.length} Instagram sessions from ${instagramUsersList.length} users`);

      const allSessions = [...domainSessions, ...whatsappSessions, ...telegramSessionsProcessed, ...instagramSessionsProcessed];

      // Fetch conversation details for each session to get the latest timestamp
      const sessionsWithDates = await Promise.allSettled(
        allSessions.map(async (session) => {
          try {
            // Add timeout to prevent hanging requests
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

            let response;
            // Use different endpoint based on domain
            if (session.domain === 'aiagent') {
              // Use session_id for WhatsApp sessions
              response = await fetch(WHATSAPP_BOT_API_URL + "/aiagent/session/" + encodeURIComponent(session.session_id as string) + "?prefer_source=mongodb", {
                headers: { 'accept': 'application/json' },
                signal: controller.signal
              });
            } else if (session.domain === 'telegram') {
              // Use session_id for Telegram sessions
              response = await fetch(TELEGRAM_BOT_API_URL + "/chat/session/" + encodeURIComponent(session.session_id as string), {
                headers: { 'accept': 'application/json' },
                signal: controller.signal
              });
            } else if (session.domain === 'instagram') {
              // Use instagram_id or session_id for Instagram sessions
              const instagramId = session.instagram_id || session.session_id;
              response = await fetch(INSTAGRAM_BOT_API_URL + "/chat/conversation/" + encodeURIComponent(instagramId), {
                headers: { 'accept': 'application/json' },
                signal: controller.signal
              });
            } else {
              // Use session_id or title for domain-based sessions (session_id preserves original UUID)
              const domainIdentifier = session.session_id || session.title;
              response = await fetch(BACKEND_URL + "/domain/" + session.domain + "/session/" + encodeURIComponent(domainIdentifier as string), {
                headers: { 'accept': 'application/json' },
                signal: controller.signal
              });
            }

            clearTimeout(timeoutId);

            if (!response.ok) {
              console.warn("Failed to fetch session details for " + (session.title || session.session_id) + ": " + response.status);
              return {
                ...session,
                latest_timestamp: session.latest_timestamp || session.updated_at || session.created_at || null
              };
            }

            const data = await response.json();

            // Get the latest timestamp from conversation history or messages
            let latestTimestamp = null;

            if (session.domain === 'aiagent') {
              // For WhatsApp sessions, check messages array
              if (data.messages && Array.isArray(data.messages) && data.messages.length > 0) {
                const timestamps = data.messages
                  .map((item: { timestamp: number | string }) => item.timestamp)
                  .filter(Boolean);

                if (timestamps.length > 0) {
                  // Find the latest timestamp
                  let latestTime = 0;
                  for (const timestamp of timestamps) {
                    try {
                      const num = typeof timestamp === 'string' ? parseFloat(timestamp) : timestamp;
                      const ms = num < 10000000000 ? num * 1000 : num;
                      if (!isNaN(ms) && ms > latestTime) {
                        latestTime = ms;
                        latestTimestamp = new Date(ms).toISOString();
                      }
                    } catch (error) {
                      console.log('Error parsing timestamp:', timestamp, error);
                    }
                  }
                }
              }
              // Fallback to updated_at or last_message_at
              if (!latestTimestamp) {
                latestTimestamp = convertUnixTimestamp(data.updated_at || data.last_message_at) || session.updated_at || session.created_at || null;
              }
            } else if (session.domain === 'telegram') {
              // For Telegram sessions, check messages array with interaction type
              if (data.messages && Array.isArray(data.messages) && data.messages.length > 0) {
                const timestamps: string[] = [];
                data.messages.forEach((item: { user?: { timestamp?: string }; bot?: { timestamp?: string } }) => {
                  if (item.user?.timestamp) timestamps.push(item.user.timestamp);
                  if (item.bot?.timestamp) timestamps.push(item.bot.timestamp);
                });

                if (timestamps.length > 0) {
                  // Find the latest timestamp (ISO string format)
                  let latestTime = 0;
                  for (const timestamp of timestamps) {
                    try {
                      const date = new Date(timestamp);
                      if (!isNaN(date.getTime()) && date.getTime() > latestTime) {
                        latestTime = date.getTime();
                        latestTimestamp = timestamp;
                      }
                    } catch (error) {
                      console.log('Error parsing timestamp:', timestamp, error);
                    }
                  }
                }
              }
              // Fallback to end_time, updated_at, or created_at
              if (!latestTimestamp) {
                latestTimestamp = data.end_time || convertUnixTimestamp(data.updated_at) || session.updated_at || session.created_at || null;
              }
            } else if (session.domain === 'instagram') {
              // For Instagram sessions, use /chat/conversation endpoint for timestamps
              const instagramId = session.instagram_id || session.session_id;
              try {
                const conversationResponse = await fetch(INSTAGRAM_BOT_API_URL + "/chat/conversation/" + encodeURIComponent(instagramId), {
                  headers: { 'accept': 'application/json' },
                  signal: controller.signal
                });

                if (conversationResponse.ok) {
                  const conversationData = await conversationResponse.json();
                  // Check conversation array for timestamps
                  if (conversationData.conversation && Array.isArray(conversationData.conversation) && conversationData.conversation.length > 0) {
                    const timestamps: string[] = [];
                    conversationData.conversation.forEach((item: { timestamp?: string }) => {
                      if (item.timestamp) timestamps.push(item.timestamp);
                    });

                    if (timestamps.length > 0) {
                      // Find the latest timestamp (ISO string format)
                      let latestTime = 0;
                      for (const timestamp of timestamps) {
                        try {
                          const date = new Date(timestamp);
                          if (!isNaN(date.getTime()) && date.getTime() > latestTime) {
                            latestTime = date.getTime();
                            latestTimestamp = timestamp;
                          }
                        } catch (error) {
                          console.log('Error parsing timestamp:', timestamp, error);
                        }
                      }
                    }
                  }
                }
              } catch (error) {
                console.log('Error fetching Instagram conversation for timestamp:', error);
              }
              // Fallback to last_activity or created_at
              if (!latestTimestamp) {
                latestTimestamp = session.updated_at || session.created_at || null;
              }
            } else {
              // For domain-based sessions, check conversation history
              let firstQuery = '';
              if (data.conversation?.history && Array.isArray(data.conversation.history)) {
                const history = data.conversation.history;
               
                // Extract first query to use as title
                if (history.length > 0) {
                  const firstItem = history[0];
                  firstQuery = String(firstItem.query || firstItem.message || firstItem.user_message || firstItem.text || '').trim();
                }
               
                // Get timestamps from history
                const timestamps = history
                  .map((item: { timestamp: string }) => item.timestamp)
                  .filter(Boolean);

                if (timestamps.length > 0) {
                  // Find the latest timestamp
                  let latestTime = 0;
                  for (const timestamp of timestamps) {
                    try {
                      const date = new Date(timestamp);
                      if (!isNaN(date.getTime()) && date.getTime() > latestTime) {
                        latestTime = date.getTime();
                        latestTimestamp = timestamp;
                      }
                    } catch (error) {
                      console.log('Error parsing timestamp:', timestamp, error);
                    }
                  }
                }
              }
             
              // Update session title with first query if available
              // But preserve original title/UUID in session_id for API calls
              // Domain sessions might only have 'title' field, so use that as session_id if session_id is missing
              const originalIdentifier = session.session_id || session.title || ''; // Preserve original UUID/title
              const updatedTitle = firstQuery || session.title;
             
              return {
                ...session,
                session_id: originalIdentifier, // Keep original UUID/title for API calls
                title: updatedTitle, // Use first query for display
                latest_timestamp: latestTimestamp || session.updated_at || session.created_at || null
              };
            }

            // Return for WhatsApp, Telegram, and Instagram sessions (they don't modify title)
            return {
              ...session,
              latest_timestamp: latestTimestamp || session.updated_at || session.created_at || null
            };
          } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
              console.warn("Timeout fetching details for session " + (session.title || session.session_id));
            } else {
              console.warn(`Error fetching details for session ${session.title || session.session_id}:`, error);
            }
            return {
              ...session,
              latest_timestamp: session.latest_timestamp || session.updated_at || session.created_at || null
            };
          }
        })
      );

      // Extract successful results and filter out failed ones
      const successfulSessions = sessionsWithDates
        .filter((result): result is PromiseFulfilledResult<ChatSession> => result.status === 'fulfilled')
        .map(result => result.value);

      const failedSessions = sessionsWithDates
        .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
        .map(result => result.reason);

      if (failedSessions.length > 0) {
        console.warn('Some session details failed to fetch:', failedSessions.length);
      }

      // Debug: Log the first session to see the date format
      if (successfulSessions.length > 0) {
        console.log('First session data:', successfulSessions[0]);
        console.log('latest_timestamp value:', successfulSessions[0].latest_timestamp);
      }

      // Sort by latest_timestamp (newest first) instead of reverse
      const sortedSessions = successfulSessions.sort((a, b) => {
        const dateA = a.latest_timestamp ? new Date(a.latest_timestamp).getTime() : 0;
        const dateB = b.latest_timestamp ? new Date(b.latest_timestamp).getTime() : 0;
        return dateB - dateA;
      });

      setSessions(sortedSessions);
    } catch (err) {
      console.error("Failed to fetch sessions:", err);
      setSessions([]);
    } finally {
      setLoading(false);
    }
  };

  // Refresh handler - only refresh chat dashboard data, not the entire page
  const handleRefresh = () => {
    fetchAllSessions();
  };

  // Visibility flags for buttons
  const showRefreshButton = true;

  // Removed getThemeColors function - no longer used after removing KPI cards
  /* const getThemeColors = () => {
    switch (filterState.sessionTypeFilter) {
      case 'whatsapp':
        return {
          bg: 'bg-green-50/50 dark:bg-green-900/10',
          text: 'text-green-600 dark:text-green-400',
          groupHoverText: 'group-hover:text-green-600 dark:group-hover:text-green-400',
          iconBg: 'bg-green-100 dark:bg-green-900/30',
          shadow: 'hover:shadow-green-500/10'
        };
      case 'telegram':
        return {
          bg: 'bg-blue-50/50 dark:bg-blue-900/10',
          text: 'text-blue-600 dark:text-blue-400',
          groupHoverText: 'group-hover:text-blue-600 dark:group-hover:text-blue-400',
          iconBg: 'bg-blue-100 dark:bg-blue-900/30',
          shadow: 'hover:shadow-blue-500/10'
        };
      case 'instagram':
        return {
          bg: 'bg-pink-50/50 dark:bg-pink-900/10',
          text: 'text-pink-600 dark:text-pink-400',
          groupHoverText: 'group-hover:text-pink-600 dark:group-hover:text-pink-400',
          iconBg: 'bg-pink-100 dark:bg-pink-900/30',
          shadow: 'hover:shadow-pink-500/10'
        };
      case 'other':
        return {
          bg: 'bg-purple-50/50 dark:bg-purple-900/10',
          text: 'text-purple-600 dark:text-purple-400',
          groupHoverText: 'group-hover:text-purple-600 dark:group-hover:text-purple-400',
          iconBg: 'bg-purple-100 dark:bg-purple-900/30',
          shadow: 'hover:shadow-purple-500/10'
        };
      default:
        return {
          bg: 'bg-blue-50/50 dark:bg-blue-900/10',
          text: 'text-blue-600 dark:text-blue-400',
          groupHoverText: 'group-hover:text-blue-600 dark:group-hover:text-blue-400',
          iconBg: 'bg-blue-100 dark:bg-blue-900/30',
          shadow: 'hover:shadow-blue-500/10'
        };
    }
  }; */

  // Filter sessions based on current filter state
  useEffect(() => {
    let filtered = [...sessions];
    // Timeline filter
    if (filterState.timelineFilter && filterState.timelineFilter !== 'all') {
      const now = new Date();
      let start: Date | null = null;
      let end: Date | null = null;
      if (filterState.timelineFilter === 'today') {
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      } else if (filterState.timelineFilter === 'yesterday') {
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      } else if (filterState.timelineFilter === 'thisweek') {
        const dayOfWeek = now.getDay();
        const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        start = new Date(now.getFullYear(), now.getMonth(), diff);
        end = new Date(now.getFullYear(), now.getMonth(), diff + 7);
      } else if (filterState.timelineFilter === 'thismonth') {
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      } else if (filterState.timelineFilter === 'lastweek') {
        const dayOfWeek = now.getDay();
        const diff = now.getDate() - dayOfWeek - 6;
        start = new Date(now.getFullYear(), now.getMonth(), diff);
        end = new Date(now.getFullYear(), now.getMonth(), diff + 7);
      } else if (filterState.timelineFilter === 'custom' && filterState.pendingCustomRange[0] && filterState.pendingCustomRange[1]) {
        start = new Date(filterState.pendingCustomRange[0]);
        end = new Date(filterState.pendingCustomRange[1]);
        end.setHours(23, 59, 59, 999);
      }
      if (start && end) {
        filtered = filtered.filter(session => {
          // Try to get the latest date from available fields
          const possibleDates = [
            session.latest_timestamp,
            session.created_at,
            session.updated_at,
            session.last_modified,
            session.timestamp,
            session.date
          ].filter(Boolean);

          if (possibleDates.length === 0) return false;

          // Find the most recent date
          let latestDate = null;
          let latestTimestamp = 0;

          for (const dateStr of possibleDates) {
            try {
              if (typeof dateStr === 'string') {
                const date = new Date(dateStr);
                if (!isNaN(date.getTime())) {
                  const timestamp = date.getTime();
                  if (timestamp > latestTimestamp) {
                    latestTimestamp = timestamp;
                    latestDate = date;
                  }
                } else {
                  // Try parsing as timestamp
                  const timestamp = parseInt(dateStr);
                  if (!isNaN(timestamp) && timestamp > latestTimestamp) {
                    latestTimestamp = timestamp;
                    latestDate = new Date(timestamp);
                  }
                }
              }
            } catch (error) {
              console.log('Error parsing date:', dateStr, error);
            }
          }

          if (latestDate) {
            return latestDate >= start && latestDate < end;
          }

          return false;
        });
      }
    }
    // Session type filter (WhatsApp, Telegram, Instagram, or Chatbot)
    if (filterState.sessionTypeFilter !== 'all') {
      filtered = filtered.filter((session) => {
        if (filterState.sessionTypeFilter === 'whatsapp') {
          return session.domain === 'aiagent';
        } else if (filterState.sessionTypeFilter === 'telegram') {
          return session.domain === 'telegram';
        } else if (filterState.sessionTypeFilter === 'instagram') {
          return session.domain === 'instagram';
        } else if (filterState.sessionTypeFilter === 'other') {
          return session.domain !== 'aiagent' && session.domain !== 'telegram' && session.domain !== 'instagram';
        }
        return true;
      });
    }
    // Field filter
    if (filterState.filterQuery.trim()) {
      const q = filterState.filterQuery.trim().toLowerCase();
      filtered = filtered.filter((session) => {
        // Search in title by default since we removed specific filter options
        return session.title?.toLowerCase().includes(q);
      });
    }
    setFilteredSessions(filtered);
  }, [sessions, filterState.filterQuery, filterState.timelineFilter, filterState.sessionTypeFilter, filterState.pendingCustomRange]);

  // Clear active session if it doesn't match the current filter
  useEffect(() => {
    if (activeSession && filterState.sessionTypeFilter !== 'all') {
      const sessionMatchesFilter = (() => {
        if (filterState.sessionTypeFilter === 'whatsapp') {
          return activeSession.domain === 'aiagent';
        } else if (filterState.sessionTypeFilter === 'telegram') {
          return activeSession.domain === 'telegram';
        } else if (filterState.sessionTypeFilter === 'instagram') {
          return activeSession.domain === 'instagram';
        } else if (filterState.sessionTypeFilter === 'other') {
          return activeSession.domain !== 'aiagent' && activeSession.domain !== 'telegram' && activeSession.domain !== 'instagram';
        }
        return true;
      })();

      // Also check if the session is in the filtered list
      const isInFilteredList = filteredSessions.some(s => s.session_id === activeSession.session_id);

      if (!sessionMatchesFilter || !isInFilteredList) {
        setActiveSession(null);
      }
    }
  }, [filterState.sessionTypeFilter, filteredSessions, activeSession]);

  // Fetch all sessions from all domains on mount
  useEffect(() => {
    fetchAllSessions();
  }, []);


  // Fetch details for a specific session
  const fetchSessionDetails = (session: ChatSession) => {
    setLoading(true);

    // Add timeout to prevent hanging requests
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    // Determine the correct endpoint based on domain
    const isWhatsAppSession = session.domain === 'aiagent';
    const isTelegramSession = session.domain === 'telegram';
    const isInstagramSession = session.domain === 'instagram';
   
    // For Instagram, try conversation endpoint first, fallback to history if it fails
    const instagramId = session.instagram_id || session.session_id;
   
    // For domain-based sessions, use session_id for API calls (preserves original UUID/title)
    // session.title might have been updated with first query for display purposes
    const domainSessionIdentifier = session.session_id || session.title;
   
    const primaryEndpoint = isWhatsAppSession
      ? WHATSAPP_BOT_API_URL + "/aiagent/session/" + encodeURIComponent(session.session_id) + "?prefer_source=mongodb"
      : isTelegramSession
        ? TELEGRAM_BOT_API_URL + "/chat/session/" + encodeURIComponent(session.session_id)
        : isInstagramSession
          ? INSTAGRAM_BOT_API_URL + "/chat/conversation/" + encodeURIComponent(instagramId)
          : BACKEND_URL + "/domain/" + session.domain + "/session/" + encodeURIComponent(domainSessionIdentifier);

    // Helper function to fetch and parse response
    const fetchAndParse = (url: string, useFallback = false): Promise<unknown> => {
      return fetch(url, {
        headers: { 'accept': 'application/json' },
        signal: controller.signal
      })
        .then((res: Response) => {
          if (!res.ok) {
            // For Instagram, try fallback endpoint if primary fails
            if (isInstagramSession && !useFallback && res.status >= 500) {
              console.warn(`Instagram conversation endpoint failed with ${res.status}, trying history endpoint...`);
              const fallbackEndpoint = INSTAGRAM_BOT_API_URL + "/chat/history/" + encodeURIComponent(instagramId);
              return fetchAndParse(fallbackEndpoint, true);
            }
            throw new Error("HTTP error! status: " + res.status);
          }
          return res.json();
        });
    };

    fetchAndParse(primaryEndpoint)
      .then((data: unknown) => {
        const responseData = data as Record<string, unknown>;
        console.log('Session details response:', responseData); // Debug log
        console.log('Instagram session data structure:', {
          hasMessages: !!responseData.messages,
          messagesType: Array.isArray(responseData.messages) ? 'array' : typeof responseData.messages,
          messagesLength: Array.isArray(responseData.messages) ? responseData.messages.length : 0,
          firstMessage: Array.isArray(responseData.messages) && responseData.messages.length > 0 ? responseData.messages[0] : null,
          user_id: responseData.user_id,
          total_messages: responseData.total_messages
        });

        const messages: Message[] = [];

        if (isWhatsAppSession) {
          // Handle WhatsApp AI Agent API response format
          // Messages are in data.messages array with role, text, timestamp
          if (responseData.messages && Array.isArray(responseData.messages)) {
            responseData.messages.forEach((item: Record<string, unknown>, idx: number) => {
              const role = String(item.role || '');
              const text = String(item.text || '');
              const timestamp = item.timestamp
                ? convertUnixTimestamp(item.timestamp as number) || new Date().toISOString()
                : new Date().toISOString();

              // Map role to sender type
              let sender: 'user' | 'bot' | 'system' = 'user';
              if (role === 'bot' || role === 'assistant') {
                sender = 'bot';
              } else if (role === 'system') {
                sender = 'system';
              }

              // Only add message if there's content
              if (text && text.trim()) {
                messages.push({
                  id: item.message_id ? String(item.message_id) : `${idx}-${sender}`,
                  sender: sender,
                  text: text,
                  timestamp: timestamp,
                });
              }
            });
          }

          setActiveSession({
            session_id: session.session_id,
            title: (responseData.title as string) || session.title || 'Chat Session',
            created_at: convertUnixTimestamp(responseData.created_at as number) || session.created_at,
            messages,
            tags: (responseData.tags as string[]) || session.tags || [],
            domain: session.domain,
            user_type: (responseData.user_type as string) || session.user_type,
          });
        } else if (isTelegramSession) {
          // Handle Telegram Bot API response format
          // Messages are in data.messages array with type: "interaction", user, and bot objects
          if (responseData.messages && Array.isArray(responseData.messages)) {
            responseData.messages.forEach((item: { type?: string; user?: { message?: string; timestamp?: string }; bot?: { message?: string; timestamp?: string } }, idx: number) => {
              // Add user message if present
              if (item.user?.message && item.user.message.trim()) {
                messages.push({
                  id: `telegram-${idx}-user`,
                  sender: 'user',
                  text: item.user.message,
                  timestamp: item.user.timestamp || new Date().toISOString(),
                });
              }

              // Add bot message if present
              if (item.bot?.message && item.bot.message.trim()) {
                messages.push({
                  id: `telegram-${idx}-bot`,
                  sender: 'bot',
                  text: item.bot.message,
                  timestamp: item.bot.timestamp || new Date().toISOString(),
                });
              }
            });
          }

          // Use user_name if available, otherwise fall back to title or session_id
          const telegramUserName = (responseData.user_name as string) || session.title || (responseData.session_id as string) || 'Chat Session';

          setActiveSession({
            session_id: session.session_id,
            title: telegramUserName,
            created_at: (responseData.start_time as string) || session.created_at,


            messages,
            tags: (responseData.tags as string[]) || session.tags || [],
            domain: session.domain,
            user_type: (responseData.user_type as string) || session.user_type,
          });
        } else if (isInstagramSession) {
          // Handle Instagram Bot API response format
          // Messages can be in different formats:
          // Format 1: { messages: [{ role: "user"/"bot", text: "...", timestamp: "..." }] }
          // Format 2: { messages: [{ message_type: "user"/"bot", message: "...", timestamp: "..." }] }
          let firstUserQuery = '';
         
          if (responseData.messages && Array.isArray(responseData.messages)) {
            // Sort by timestamp ascending so newest appears at bottom
            const sortedMessages = [...responseData.messages].sort((a: { timestamp?: string }, b: { timestamp?: string }) => {
              const ta = a?.timestamp ? new Date(a.timestamp).getTime() : 0;
              const tb = b?.timestamp ? new Date(b.timestamp).getTime() : 0;
              return ta - tb;
            });

            sortedMessages.forEach((item: {
              role?: string;
              text?: string | null;
              message?: string | null;
              message_type?: string;
              timestamp?: string;
              _id?: string;
              message_id?: string | null;
            }, idx: number) => {
              // Get message text from either 'text' or 'message' field
              const messageText = item.text || item.message;
             
              // Skip messages with null or empty text
              if (!messageText || !String(messageText).trim()) return;

              // Map role/message_type to sender type
              // Support both formats: role (new format) and message_type (old format)
              let sender: 'user' | 'bot' | 'system' = 'user';
              const roleOrType = item.role || item.message_type;
             
              if (roleOrType === 'bot' || roleOrType === 'assistant') {
                sender = 'bot';
              } else if (roleOrType === 'system') {
                sender = 'system';
              } else if (roleOrType === 'user') {
                sender = 'user';
              }

              // Extract first user query for title (from chronologically first user message)
              if (!firstUserQuery && sender === 'user' && messageText) {
                firstUserQuery = String(messageText).trim();
                // Limit length to 50 characters for display
                if (firstUserQuery.length > 50) {
                  firstUserQuery = firstUserQuery.substring(0, 47) + '...';
                }
              }

              // Use message_id if available, otherwise _id, otherwise generate one
              const messageId = item.message_id || item._id || `instagram-${idx}-${sender}`;

              messages.push({
                id: String(messageId),
                sender: sender,
                text: String(messageText),
                timestamp: item.timestamp || new Date().toISOString(),
              });
            });
           
            console.log(`Processed ${messages.length} Instagram messages from ${responseData.messages.length} raw messages`);
          } else {
            console.warn('Instagram session data does not contain messages array:', responseData);
          }

          // Use first user query if available, otherwise fall back to username or user_id
          const instagramTitle = firstUserQuery ||
                                (responseData.username as string) ||
                                (responseData.user_id as string) ||
                                (responseData.instagram_id as string) ||
                                session.title ||
                                'Instagram Chat';

          // Update the session in the sessions list with the new title
          setSessions(prevSessions =>
            prevSessions.map(s =>
              s.session_id === session.session_id && s.domain === 'instagram'
                ? { ...s, title: instagramTitle }
                : s
            )
          );

          setActiveSession({
            session_id: session.session_id,
            title: instagramTitle,
            created_at: session.created_at,
            messages,
            tags: session.tags || [],
            domain: session.domain,
            user_type: session.user_type,
            instagram_id: (responseData.user_id as string) || (responseData.instagram_id as string) || session.instagram_id,
          });
        } else {
          // Handle domain-based API response format
          const conversation = (responseData.conversation || responseData) as Record<string, unknown>;
          const history = (conversation?.history || conversation?.messages || []) as Array<Record<string, unknown>>;

          // Extract first query to use as title/identifier
          let firstQuery = '';
          if (Array.isArray(history) && history.length > 0) {
            const firstItem = history[0];
            firstQuery = String(firstItem.query || firstItem.message || firstItem.user_message || firstItem.text || '').trim();
          }

          if (Array.isArray(history)) {
            history.forEach((item: Record<string, unknown>, idx: number) => {
              // Handle different message formats
              const query = String(item.query || item.message || item.user_message || item.text || '');
              const response = String(item.response || item.bot_message || item.reply || '');
              const timestamp = String(item.timestamp || new Date().toISOString());

              // Only add user message if there's content
              if (query && query.trim()) {
                messages.push({
                  id: `${idx}-user`,
                  sender: 'user',
                  text: query,
                  timestamp: timestamp,
                });
              }

              // Only add bot message if there's content
              if (response && response.trim()) {
                messages.push({
                  id: `${idx}-bot`,
                  sender: 'bot',
                  text: response,
                  timestamp: timestamp,
                });
              }
            });
          }

          console.log('Processed messages:', messages); // Debug log
          console.log('First query extracted:', firstQuery); // Debug log

          // Use first query as title if available, otherwise fall back to conversation title or session title
          const sessionTitle = firstQuery || (conversation?.title as string) || session.title || 'Chat Session';

          setActiveSession({
            session_id: session.session_id,
            title: sessionTitle,
            created_at: session.created_at,
            messages,
            tags: (conversation?.tags as string[]) || session.tags || [],
            domain: (conversation?.domain as string) || session.domain,
            user_type: session.user_type,
          });
        }
      })
      .catch((err: unknown) => {
        clearTimeout(timeoutId);
        if (err instanceof Error && err.name === 'AbortError') {
          console.warn("Session details fetch timed out");
        } else {
          console.error("Failed to fetch session details:", err);
          // Show user-friendly error message
          if (err instanceof Error && err.message.includes('500')) {
            console.error("Instagram API returned 500 error. This might be a server-side issue.");
          }
        }

        // Set a fallback session with empty messages instead of null
        setActiveSession({
          session_id: session.session_id,
          title: session.title,
          created_at: session.created_at,
          messages: [],
          tags: session.tags || [],
          domain: session.domain,
          user_type: session.user_type,
          instagram_id: session.instagram_id,
        });
        setLoading(false);
      })
      .finally(() => setLoading(false));
  };

  const getSenderIcon = (sender: Message['sender']) => {
    switch (sender) {
      case 'user':
        return <User className="h-6 w-6 text-blue-500" />;
      case 'bot':
        return <Bot className="h-6 w-6 text-purple-500" />;
      case 'system':
        return <AlertCircle className="h-6 w-6 text-gray-500" />;
      default:
        return null;
    }
  };
  // Handle session selection with mobile view management
  const handleSessionSelect = (session: ChatSession) => {
    fetchSessionDetails(session);
    // On mobile, show the chat view
    if (window.innerWidth < 768) {
      setShowChatOnMobile(true);
    }
  };
  // Handle back button on mobile
  const handleBackToThreads = () => {
    setShowChatOnMobile(false);
  };

  // Handle delete session for all types - Show confirmation modal
  const handleDeleteSession = (session: ChatSession, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent selecting the session when clicking delete

    // Set session to delete and show confirmation modal
    setSessionToDelete(session);
    const sessionType = session.domain === 'aiagent' ? 'WhatsApp'
      : session.domain === 'telegram' ? 'Telegram'
        : session.domain === 'instagram' ? 'Instagram'
          : 'Chatbot';
    setConfirmMsg(`Are you sure you want to delete the ${sessionType} session "${session.title || session.session_id}"?`);
    setConfirmOpen(true);
  };

  // Execute delete after confirmation
  const executeDelete = async () => {
    if (!sessionToDelete) return;

    try {
      const session = sessionToDelete;
      let response: Response | null = null;

      // Handle different session types
      if (session.domain === 'aiagent') {
        // WhatsApp session
        const sessionId = session.session_id;
        response = await fetch(WHATSAPP_BOT_API_URL + "/aiagent/session/" + encodeURIComponent(sessionId), {
          method: 'DELETE',
          headers: { 'accept': 'application/json' },
        });
      } else if (session.domain === 'telegram') {
        // Telegram session - call delete API then update local state
        const sessionId = session.session_id;
        response = await fetch(`${TELEGRAM_BOT_API_URL}/chat/session/${encodeURIComponent(sessionId)}`, {
          method: 'DELETE',
          headers: { 'accept': 'application/json' },
        });
      } else if (session.domain === 'instagram') {
        // Instagram session - call delete API then update local state
        const instagramId = session.instagram_id || session.session_id;
        response = await fetch(`${INSTAGRAM_BOT_API_URL}/chat/history/${encodeURIComponent(instagramId)}`, {
          method: 'DELETE',
          headers: { 'accept': 'application/json' },
        });
      } else {
        // Chatbot session (domain_1, domain_2, tech_company)
        // Use session_id which contains the original UUID/title for API calls
        const sessionIdentifier = session.session_id || session.title;
        response = await fetch(BACKEND_URL + "/domain/" + session.domain + "/session/" + encodeURIComponent(sessionIdentifier), {
          method: 'DELETE',
          headers: { 'accept': 'application/json' },
        });
      }

      // Handle API response for WhatsApp and Chatbot
      if (response) {
        if (response.ok) {
          const data = await response.json();
          console.log('Delete response:', data);

          // Remove the session from the list
          // For chatbot sessions, compare by session_id and domain (session_id contains original UUID)
          if (session.domain === 'domain_1' || session.domain === 'domain_2' || session.domain === 'tech_company') {
            setSessions(prevSessions => prevSessions.filter(s =>
              !(s.session_id === session.session_id && s.domain === session.domain)
            ));
            if (activeSession?.session_id === session.session_id && activeSession?.domain === session.domain) {
              setActiveSession(null);
            }
          } else {
            setSessions(prevSessions => prevSessions.filter(s => s.session_id !== session.session_id));
            if (activeSession?.session_id === session.session_id) {
              setActiveSession(null);
            }
          }
          // Show success toast message
          setAlertMessage(`Session "${session.title || session.session_id}" deleted successfully.`);
          setAlertType('success');
          setShowAlert(true);
        } else {
          console.error('Failed to delete session:', response.status);
          setAlertMessage('Failed to delete session. Please try again.');
          setAlertType('error');
          setShowAlert(true);
        }
      }
    } catch (error) {
      console.error('Error deleting session:', error);
      setAlertMessage('An error occurred while deleting the session. Please try again.');
      setAlertType('error');
      setShowAlert(true);
    } finally {
      setConfirmOpen(false);
      setSessionToDelete(null);
    }
  };

  return (
    <div className="relative min-h-screen bg-gray-50 dark:bg-gray-900">
      <Toaster /> {/* ToastContainer added here */}
     
      {/* Alert Messages */}
      {showAlert && (
        <Alert
          variant={alertType}
          title={alertType === 'success' ? 'Success' : alertType === 'error' ? 'Error' : 'Info'}
          message={alertMessage}
          showLink={false}
          showCloseButton={true}
          onClose={() => {
            setShowAlert(false);
            setAlertMessage('');
            setAlertType('info');
          }}
        />
      )}

      {/* Chat Dashboard Header */}
      <div className="mx-4 md:mx-6 mt-6">
        <DashboardHeader
          variant="default"
          size="lg"
          title="Chat Dashboard"
          subtitle="Analyze and manage chatbot conversations with filters, search, and performance insights"
          icon={() => (
            <svg className="w-6 h-6 sm:w-8 sm:h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4l4 4 4-4h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z" />
            </svg>
          )}
          breadcrumbs={[
            { label: 'Home', href: '/' },
            { label: 'Chat Dashboard', href: '/chat-dashboard' }
          ]}
        />
      </div>

      {/* Enhanced Help Panel */}
      {showHelp && (
        <div className="bg-white/90 backdrop-blur-md border border-gray-200 rounded-2xl p-6 shadow-xl mt-8 mx-4 md:mx-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Quick Tips</h3>
              <ul className="space-y-2 text-gray-700">
                <li>• Use search to find specific chat sessions quickly</li>
                <li>• Filter by timeline to analyze conversations by date ranges</li>
                <li>• Monitor response times to optimize chatbot performance</li>
                <li>• Track conversation patterns across different domains</li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Features</h3>
              <ul className="space-y-2 text-gray-700">
                <li>• Real-time chat session monitoring</li>
                <li>• Advanced filtering and search capabilities</li>
                <li>• Performance analytics and insights</li>
                <li>• Multi-domain conversation tracking</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      <div className="w-full max-w-7xl mx-auto p-4 md:p-6 flex-1">
        {/* ActionBar Component */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow p-4 mb-6">
          {/* Desktop */}
          <div className="hidden sm:flex items-center justify-between">
            <div className="flex items-center flex-1 mr-4 min-w-[180px]">
              <input
                type="text"
                placeholder="Search sessions"
                value={filterState.filterQuery}
                onChange={(e) => filterState.setFilterQuery(e.target.value)}
                className="border px-4 py-2 rounded-md text-sm w-full dark:bg-gray-800 dark:text-white"
                aria-label="Search"
              />
            </div>
            <div className="flex items-center gap-2" style={{ position: "relative" }}>
              <button
                className="flex items-center gap-1 border px-3 py-1.5 rounded-md text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-white"
                type="button"
                onClick={() => {
                  const filtersActive = Boolean(
                    (filterState.filterQuery && filterState.filterQuery.trim() !== "") ||
                    (filterState.timelineFilter && filterState.timelineFilter !== "" && filterState.timelineFilter !== "all") ||
                    (filterState.pendingCustomRange && (filterState.pendingCustomRange[0] || filterState.pendingCustomRange[1])) ||
                    (filterState.sessionTypeFilter && filterState.sessionTypeFilter !== "all")
                  );
                  if (filtersActive && filterState.timelineFilter !== 'custom') {
                    filterState.setFilterQuery("");
                    filterState.setTimelineFilter("");
                    filterState.setSessionTypeFilter("all");
                    filterState.setPendingCustomRange([null, null]);
                    filterState.setShowCustomPopover(false);
                    filterState.setShowFilterField(false);
                  } else {
                    filterState.setShowFilterField(!filterState.showFilterField);
                  }
                }}
                aria-expanded={filterState.showFilterField}
                aria-label="Toggle filters"
              >
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 0 1 1-1h16a1 1 0 0 1 .8 1.6l-5.6 7.47A2 2 0 0 0 15 14.13V19a1 1 0 0 1-1.45.89l-4-2A1 1 0 0 1 9 17v-2.87a2 2 0 0 0-.2-.93L3.2 5.6A1 1 0 0 1 3 4z" /></svg>
                Filters
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
              </button>
              {filterState.showFilterField && (
                <>
                  {/* Session Type Selector - Desktop */}
                  <select
                    className="border px-3 py-1.5 rounded-md text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-white min-w-[160px]"
                    value={filterState.sessionTypeFilter}
                    onChange={(e) => filterState.setSessionTypeFilter(e.target.value as 'all' | 'whatsapp' | 'telegram' | 'instagram' | 'other')}
                    style={{ marginRight: "8px" }}
                    aria-label="Select session type"
                  >
                    <option value="all"> All Sessions</option>
                    <option value="whatsapp"> WhatsApp</option>
                    <option value="telegram"> Telegram</option>
                    <option value="instagram"> Instagram</option>
                    <option value="other"> Chatbot</option>
                  </select>
                  {/* Timeline Selector */}
                  <select
                    className="border px-3 py-1.5 rounded-md text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-white min-w-[140px]"
                    value={filterState.timelineFilter}
                    onChange={(e) => {
                      const val = e.target.value;
                      filterState.setTimelineFilter(val);
                      filterState.setShowCustomPopover(val === "custom");
                    }}
                    style={{ marginRight: "8px" }}
                  >
                    <option value="">Select Timeline</option>
                    <option value="all">All</option>
                    <option value="today">Today</option>
                    <option value="yesterday">Yesterday</option>
                    <option value="thisweek">This week</option>
                    <option value="thismonth">This month</option>
                    <option value="last30">Last 30 days</option>
                    <option value="custom">Custom</option>
                  </select>
                  {filterState.showCustomPopover && (
                    <div ref={filterState.customPopoverRef} className="absolute left-0 top-full z-[9999] mt-2 w-auto max-w-[90vw] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded shadow-xl p-4">
                      <div className="absolute -top-2 left-8 w-4 h-4 bg-white dark:bg-gray-900 border-l border-t border-gray-200 dark:border-gray-700 rotate-45 z-0"></div>
                      <DateRangePicker
                        value={filterState.pendingCustomRange}
                        onChange={filterState.setPendingCustomRange}
                      />
                      <div className="mt-3 flex items-center justify-end gap-2">
                        <button
                          type="button"
                          className="px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200"
                          onClick={() => {
                            filterState.setPendingCustomRange([null, null]);
                            filterState.setTimelineFilter("");
                            filterState.setShowCustomPopover(false);
                          }}
                        >
                          Clear
                        </button>
                        <button
                          type="button"
                          className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700"
                          onClick={() => {
                            if (filterState.pendingCustomRange && filterState.pendingCustomRange[0] && filterState.pendingCustomRange[1]) {
                              if (filterState.timelineFilter !== "custom") filterState.setTimelineFilter("custom");
                              filterState.setShowCustomPopover(false);
                            }
                          }}
                        >
                          Apply
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
              {showRefreshButton && (
                <button
                  onClick={handleRefresh}
                  className="flex items-center gap-1 border px-3 py-1.5 rounded-md text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-white"
                  aria-label="Refresh"
                >
                  <RefreshCw className="w-4 h-4" />
                  Refresh
                </button>
              )}
            </div>
          </div>

          {/* Mobile */}
          <div className="block sm:hidden">
            <input
              type="text"
              placeholder="Search sessions"
              value={filterState.filterQuery}
              onChange={(e) => filterState.setFilterQuery(e.target.value)}
              className="w-full border px-3 py-2 rounded-md text-sm dark:bg-gray-800 dark:text-white dark:border-gray-700 mb-4"
              aria-label="Search"
            />
            <div className="flex items-center justify-between gap-2">
              <button
                className="flex items-center justify-center min-w-[72px] h-[44px] px-3 border rounded-md text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                type="button"
                onClick={() => {
                  const filtersActive = Boolean(
                    (filterState.filterQuery && filterState.filterQuery.trim() !== "") ||
                    (filterState.timelineFilter && filterState.timelineFilter !== "" && filterState.timelineFilter !== "all") ||
                    (filterState.pendingCustomRange && (filterState.pendingCustomRange[0] || filterState.pendingCustomRange[1])) ||
                    (filterState.sessionTypeFilter && filterState.sessionTypeFilter !== "all")
                  );
                  if (filtersActive) {
                    filterState.setFilterQuery("");
                    filterState.setTimelineFilter("");
                    filterState.setSessionTypeFilter("all");
                    filterState.setPendingCustomRange([null, null]);
                    filterState.setShowCustomPopover(false);
                    filterState.setShowFilterField(false);
                  } else {
                    filterState.setShowFilterField(!filterState.showFilterField);
                  }
                }}
                title="Filters"
                aria-expanded={filterState.showFilterField}
                aria-label="Toggle filters"
              >
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 0 1 1-1h16a1 1 0 0 1 .8 1.6l-5.6 7.47A2 2 0 0 0 15 14.13V19a1 1 0 0 1-1.45.89l-4-2A1 1 0 0 1 9 17v-2.87a2 2 0 0 0-.2-.93L3.2 5.6A1 1 0 0 1 3 4z" /></svg>
              </button>
              {filterState.showFilterField && (
                <>
                  {/* Session Type Selector - Mobile */}
                  <select
                    className="flex-1 min-w-[140px] border px-3 py-2 rounded-md text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-white"
                    value={filterState.sessionTypeFilter}
                    onChange={(e) => filterState.setSessionTypeFilter(e.target.value as 'all' | 'whatsapp' | 'telegram' | 'instagram' | 'other')}
                    aria-label="Select session type"
                  >
                    <option value="all">📋 All</option>
                    <option value="whatsapp">💬 WhatsApp</option>
                    <option value="telegram">✈️ Telegram</option>
                    <option value="instagram">📷 Instagram</option>
                    <option value="other">🤖 Chatbot</option>
                  </select>
                  {/* Timeline Selector - Mobile */}
                  <select
                    className="flex-1 min-w-[160px] border px-3 py-2 rounded-md text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-white"
                    value={filterState.timelineFilter}
                    onChange={(e) => {
                      const val = e.target.value;
                      filterState.setTimelineFilter(val);
                      filterState.setShowCustomPopover(val === "custom");
                    }}
                    aria-label="Select timeline"
                  >
                    <option value="">Select Timeline</option>
                    <option value="all">All</option>
                    <option value="today">Today</option>
                    <option value="yesterday">Yesterday</option>
                    <option value="thisweek">This week</option>
                    <option value="thismonth">This month</option>
                    <option value="last30">Last 30 days</option>
                    <option value="custom">Custom</option>
                  </select>
                </>
              )}
              {showRefreshButton && (
                <button
                  onClick={handleRefresh}
                  className="flex items-center justify-center min-w-[72px] h-[44px] px-3 border rounded-md text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  title="Refresh"
                  aria-label="Refresh"
                >
                  <RefreshCw className="w-5 h-5" />
                </button>
              )}
            </div>
            {filterState.showFilterField && (
              <div className="mt-4 space-y-3">
                {filterState.showCustomPopover && (
                  <div ref={filterState.customPopoverRef} className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded shadow-xl p-4">
                    <DateRangePicker
                      value={filterState.pendingCustomRange}
                      onChange={filterState.setPendingCustomRange}
                    />
                    <div className="mt-3 flex items-center justify-end gap-2">
                      <button
                        type="button"
                        className="px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200"
                        onClick={() => {
                          filterState.setPendingCustomRange([null, null]);
                          filterState.setTimelineFilter("");
                          filterState.setShowCustomPopover(false);
                        }}
                      >
                          Clear
                        </button>
                      <button
                        type="button"
                        className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700"
                        onClick={() => {
                          if (filterState.pendingCustomRange && filterState.pendingCustomRange[0] && filterState.pendingCustomRange[1]) {
                            if (filterState.timelineFilter !== "custom") filterState.setTimelineFilter("custom");
                            filterState.setShowCustomPopover(false);
                          }
                        }}
                      >
                          Apply
                        </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Main Chat Layout - Fully Responsive */}
        <div className="flex flex-col md:flex-row h-[calc(100vh-180px)] gap-4 md:gap-6 overflow-x-hidden">
          {/* Chat Sessions List - Responsive Sidebar */}
          <div className={"w-full md:w-1/2 lg:w-1/2 h-screen md:h-auto flex flex-col rounded-2xl bg-gradient-to-br from-white via-white to-gray-50/30 dark:from-gray-800 dark:via-gray-800 dark:to-gray-900/50 shadow-xl border-0 overflow-hidden backdrop-blur-sm relative " + (showChatOnMobile ? 'hidden md:flex' : 'flex')}>
            <div className="relative z-10 border-b border-gray-200/50 dark:border-gray-700/50 px-4 md:px-6 py-4 dark:bg-gray-800/50">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4l4 4 4-4h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z" />
                  </svg>
                </div>
                <h3 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-200 bg-clip-text text-transparent">Chat Threads ({filteredSessions.length})</h3>
              </div>
            </div>
            <div className="flex-grow overflow-y-auto enhanced-scrollbar dark:bg-gray-900/50">
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
              ) : (
                Array.isArray(filteredSessions) ? filteredSessions.map((session, idx) => (
                  <div
                    key={session.session_id + '-' + idx}
                    onClick={() => handleSessionSelect(session)}
                    className={"group relative cursor-pointer items-center gap-3 md:gap-4 p-4 md:p-5 border-b border-gray-200/50 dark:border-gray-700/50 hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-purple-50/50 dark:hover:from-gray-700/50 dark:hover:to-gray-600/50 transition-all duration-300 hover:scale-[1.02] " + (activeSession?.session_id === session.session_id ? 'bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-700 dark:to-gray-600' : '')}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent dark:via-gray-800/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg"></div>
                    <div className="relative z-10 flex items-center gap-3 md:gap-4">
                      {/* Icons removed per request */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h4 className="font-semibold text-gray-900 dark:text-white text-sm md:text-base truncate group-hover:text-gray-700 dark:group-hover:text-gray-100 transition-colors duration-300">
                            {session.title || session.session_id || 'Untitled'}
                          </h4>
                          {/* Session Type Badge */}
                          <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${session.domain === 'aiagent'
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                            : session.domain === 'telegram'
                              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                              : session.domain === 'instagram'
                                ? 'bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-400'
                                : 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
                            }`}>
                            {session.domain === 'aiagent' ? 'WhatsApp' : session.domain === 'telegram' ? 'Telegram' : session.domain === 'instagram' ? 'Instagram' : 'Chatbot'}
                          </span>
                          {/* User Type Badge for WhatsApp */}
                          {session.domain === 'aiagent' && session.user_type && (
                            <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400">
                              {session.user_type.toUpperCase()}
                            </span>
                          )}
                        </div>
                        {session.domain === 'aiagent' && session.session_id && (
                          <p className="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5">
                            ID: {session.session_id}
                          </p>
                        )}
                        <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 truncate group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors duration-300 mt-1">
                          {(() => {
                            // Try to get the latest date from available fields
                            const possibleDates = [
                              session.latest_timestamp, // Use the latest timestamp from conversation history
                              session.created_at,
                              session.updated_at,
                              session.last_modified,
                              session.timestamp,
                              session.date
                            ].filter(Boolean);

                            if (possibleDates.length === 0) {
                              return 'No date available';
                            }

                            // Find the most recent date
                            let latestDate = null;
                            let latestTimestamp = 0;

                            for (const dateStr of possibleDates) {
                              try {
                                if (typeof dateStr === 'string') {
                                  const date = new Date(dateStr);
                                  if (!isNaN(date.getTime())) {
                                    const timestamp = date.getTime();
                                    if (timestamp > latestTimestamp) {
                                      latestTimestamp = timestamp;
                                      latestDate = date;
                                    }
                                  } else {
                                    // Try parsing as timestamp
                                    const timestamp = parseInt(dateStr);
                                    if (!isNaN(timestamp) && timestamp > latestTimestamp) {
                                      latestTimestamp = timestamp;
                                      latestDate = new Date(timestamp);
                                    }
                                  }
                                }
                              } catch (error) {
                                console.log('Error parsing date:', dateStr, error);
                              }
                            }

                            if (latestDate) {
                              return latestDate.toLocaleString();
                            }

                            return 'No valid date found';
                          })()}
                        </p>
                      </div>
                      {/* Delete button for all session types */}
                      <button
                        onClick={(e) => handleDeleteSession(session, e)}
                        className="flex-shrink-0 p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 transition-all duration-300"
                        title="Delete session"
                        aria-label="Delete session"
                      >
                        <Trash2 className="h-4 w-4 md:h-5 md:w-5" />
                      </button>
                      <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10 blur-xl"></div>
                    </div>
                  </div>
                )) : <div className="flex items-center justify-center h-32">
                  <div className="text-center">
                    <div className="text-gray-400 dark:text-gray-500 text-lg font-medium mb-2">No Sessions Found</div>
                    <div className="text-gray-400 dark:text-gray-500 text-sm">No chat sessions available</div>
                  </div>
                </div>
              )}
            </div>
          </div>
          {/* Chat Thread Viewer - Responsive Main Content */}
          <div className={"w-full md:w-1/2 lg:w-1/2 h-screen md:h-auto flex flex-col rounded-2xl bg-gradient-to-br from-white via-white to-gray-50/30 dark:from-gray-800 dark:via-gray-800 dark:to-gray-900/50 shadow-xl border-0 overflow-hidden backdrop-blur-sm relative " + (showChatOnMobile ? 'flex' : 'hidden md:flex')}>
            {activeSession ? (
              <>
                <div className="relative z-10 border-b border-gray-200/50 dark:border-gray-700/50 px-4 md:px-6 py-4 dark:bg-gray-800/50">
                  <div className="flex items-center gap-3">
                    {/* Back button for mobile */}
                    <button
                      onClick={handleBackToThreads}
                      className="md:hidden flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                    </button>
                    <div className="flex items-center gap-3 flex-1">
                      <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                        <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4l4 4 4-4h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z" />
                        </svg>
                      </div>
                      <h3 className="font-semibold text-gray-900 dark:text-white text-sm md:text-base lg:text-lg truncate">{activeSession.title}</h3>
                    </div>
                  </div>
                </div>
                <div className="relative z-10 flex-grow space-y-3 md:space-y-4 overflow-y-auto p-4 md:p-6 enhanced-scrollbar">
                  {Array.isArray(activeSession.messages) && activeSession.messages.length > 0 ? (
                    activeSession.messages.map(msg => (
                      <div key={msg.id} className={"flex items-start gap-2 md:gap-3 " + (msg.sender === 'user' ? 'justify-end' : '')}>
                        {msg.sender !== 'user' && (
                          <div className="flex-shrink-0 p-2 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 shadow-md">
                            {getSenderIcon(msg.sender)}
                          </div>
                        )}
                        <div className={"max-w-full md:max-w-md rounded-2xl p-4 shadow-lg transition-all duration-300 hover:scale-[1.02] " + (msg.sender === 'user' ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white' : 'bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 text-gray-900 dark:text-white')}>
                          <p className="text-sm md:text-base break-words leading-relaxed">{msg.text || 'Empty message'}</p>
                          <p className="mt-2 text-right text-xs opacity-70">
                            {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString() : 'No timestamp'}
                          </p>
                        </div>
                        {msg.sender === 'user' && (
                          <div className="flex-shrink-0 p-2 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 shadow-md">
                            {getSenderIcon(msg.sender)}
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <div className="mx-auto h-16 w-16 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center mb-4">
                          <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Messages</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">The conversation history is empty</p>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="relative z-10 flex h-full items-center justify-center p-4 md:p-6 dark:bg-gray-900/50">
                <div className="text-center">
                  <div className="mx-auto h-20 w-20 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 flex items-center justify-center mb-6">
                    <svg className="h-10 w-10 text-blue-500 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No Chat Selected</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Select a chat thread from the left panel to view the conversation</p>
                  <div className="flex items-center justify-center">
                    <div className="flex items-center space-x-2 text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 px-3 py-2 rounded-full">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Click on any chat thread to start viewing</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Chat Analytics section removed as requested */}
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        open={confirmOpen}
        message={confirmMsg}
        onConfirm={executeDelete}
        onCancel={() => {
          setConfirmOpen(false);
          setSessionToDelete(null);
        }}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
}