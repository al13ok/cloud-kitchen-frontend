'use client';
import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { Users, Activity, Power } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import DashboardHeader from '@/components/header/DashboardHeader';
import { BACKEND_URL, getAuthHeaders } from '@/utils/api';
import Pagination from '@/components/tables/Pagination';
import { ActionBar } from '@/components/header/actionbar';
import * as XLSX from 'xlsx';

// --- Types ---

interface AttendanceLocation {
  ip?: string;
  city?: string;
  region?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  lat?: number;
  lng?: number;
  address?: string;
  raw_address?: string;
  is_remote?: boolean;
  isRemote?: boolean;
}

interface Employee {
  emp_id: string;
  full_name: string;
  email: string;
  phone: string;
  department: string;
  created_at: string;
  id: string;
  has_rbac_account: boolean;
  number_of_projects: number;
}

interface EmployeesResponse {
  page: number;
  size: number;
  total_records: number;
  total_pages: number;
  data: Employee[];
}

type AttendanceRecord = {
  id: string;
  employeeEmail: string;
  employeeCode: string;
  employeeName?: string;
  date?: string;
  clockIn?: string;
  clockOut?: string;
  clockInLocation?: AttendanceLocation;
  clockOutLocation?: AttendanceLocation;
  clockInStatus?: string;
  clockOutStatus?: string;
  lateBy?: string;
  lateByMinutes?: number;
  earlyBy?: string;
  earlyByMinutes?: number;
  overTime?: string | null;
  overTimeMinutes?: number;
  isSpecialDay?: boolean;
  specialDayType?: string | null;
  holidayName?: string | null;
  totalHours?: number;
  overtimeHours?: number;
  status?: string;
  location?: AttendanceLocation;
  isLeaveDay?: boolean;
  remarks?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
};

interface RawAttendanceRecord {
  _id?: string;
  id?: string;
  email?: string;
  employeeEmail?: string;
  employee_email?: string;
  employeeCode?: string;
  emp_id?: string;
  employeeId?: string;
  employeeName?: string;
  name?: string;
  employee_name?: string;
  date?: string;
  clockIn?: string;
  clock_in?: string;
  clockOut?: string;
  clock_out?: string;
  clockInLocation?: AttendanceLocation;
  clockOutLocation?: AttendanceLocation;
  clockInStatus?: string;
  clockOutStatus?: string;
  lateBy?: string;
  late_by?: string;
  lateByMinutes?: number;
  earlyBy?: string;
  earlyByMinutes?: number;
  overTime?: string | null;
  overTimeMinutes?: number;
  isSpecialDay?: boolean;
  specialDayType?: string | null;
  holidayName?: string | null;
  totalHours?: number;
  total_hours?: number;
  overtimeHours?: number;
  overtime_hours?: number;
  status?: string;
  location?: AttendanceLocation;
  isLeaveDay?: boolean;
  is_leave_day?: boolean;
  remarks?: string;
  notes?: string;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
}

interface AttendanceResponse {
  success?: boolean;
  count?: number;
  data?: RawAttendanceRecord[];
  detail?: string;
  records?: RawAttendanceRecord[];
  statistics?: Statistics;
}

type Statistics = {
  statusCounts: Record<string, number>;
  totalHours: number;
  totalOvertime: number;
  averageHoursPerDay: number;
  totalUniqueEmployees: number;
};

// Derived type for the "Dashboard" view list
type EmployeeSummary = {
  employeeEmail: string;
  employeeCode: string;
  employeeName: string;
  currentStatus: 'working' | 'offline';
  lastClockIn: string | null;
  lastClockOut: string | null;
  totalHours: number; // Sum of hours for the period
  records: AttendanceRecord[];
};

// --- Helper Functions ---

const getAttendanceEndpoint = () => {
  return `${BACKEND_URL}/api/v1/attendance`;
};

const formatDateOnly = (value?: string): string => {
  if (!value) return '-';
  const parsed = new Date(value);
  if (isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const formatMinutesToHoursAndMinutes = (totalMinutes?: number | null): string => {
  if (totalMinutes === undefined || totalMinutes === null || isNaN(totalMinutes) || totalMinutes < 0) {
    return '-';
  }

  if (totalMinutes === 0) return 'On time';

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0 && minutes > 0) {
    return `${hours}h ${minutes}m`;
  } else if (hours > 0) {
    return `${hours}h`;
  } else {
    return `${minutes}m`;
  }
};

const formatDelayTime = (timeBy?: string | null, timeByMinutes?: number | null): string => {
  if (timeByMinutes !== undefined && timeByMinutes !== null && !isNaN(timeByMinutes)) {
    return formatMinutesToHoursAndMinutes(timeByMinutes);
  }

  if (!timeBy || timeBy.trim() === '' || timeBy.toLowerCase() === 'on time' || timeBy.toLowerCase() === 'ontime') {
    return 'On time';
  }
  const minutesMatch = timeBy.match(/(\d+)\s*(?:minutes?|mins?|m)/i);
  if (!minutesMatch) {
    const numberMatch = timeBy.match(/(\d+)/);
    if (numberMatch) {
      const minutes = parseInt(numberMatch[1], 10);
      if (isNaN(minutes) || minutes < 0) return timeBy;
      return formatMinutesToHoursAndMinutes(minutes);
    }
    return timeBy;
  }
  const minutes = parseInt(minutesMatch[1], 10);
  if (isNaN(minutes) || minutes < 0) return timeBy;
  return formatMinutesToHoursAndMinutes(minutes);
};

const formatWorkingHours = (hours?: number | null): string => {
  if (!hours || hours === 0) return '0h 0m';
 
  // Convert decimal hours to total minutes
  const totalMinutes = Math.round(hours * 60);
 
  if (totalMinutes < 1) return '0h 0m';
 
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
 
  return `${h}h ${m}m`;
};

const getAttendanceDisplayName = (record?: AttendanceRecord | EmployeeSummary): string => {
  if (!record) return 'Unknown';
  if (record.employeeName && record.employeeName.trim()) return record.employeeName.trim();
  if (record.employeeEmail) {
    const localPart = record.employeeEmail.split('@')[0] ?? record.employeeEmail;
    return localPart.replace(/[._]/g, ' ');
  }
  if (record.employeeCode) return record.employeeCode;
  return 'Unknown';
};

const getAttendanceLocationText = (record?: AttendanceRecord): string => {
  if (!record) return 'N/A';
 
  // Prefer clockInLocation, fallback to clockOutLocation, then location
  const loc = record.clockInLocation || record.clockOutLocation || record.location;
  if (!loc) return 'N/A';
 
  // New API format: city, region, country
  if (loc.city || loc.region || loc.country) {
    const parts = [];
    if (loc.city) parts.push(loc.city);
    if (loc.region) parts.push(loc.region);
    if (loc.country) parts.push(loc.country);
    return parts.join(', ');
  }
 
  // Fallback to address or coordinates
  return (
    loc.address ||
    loc.raw_address ||
    (loc.lat !== undefined && loc.lng !== undefined
      ? `${loc.lat}, ${loc.lng}`
      : loc.latitude !== undefined && loc.longitude !== undefined
      ? `${loc.latitude}, ${loc.longitude}`
      : 'N/A')
  );
};

const getInitial = (name?: string, email?: string): string => {
  const source = (name && name.trim()) || (email && email.trim()) || '';
  if (!source) return '?';
  const letter = source.replace(/^[^a-zA-Z]*|\s+/g, '').charAt(0);
  return letter ? letter.toUpperCase() : '?';
};

const formatTimeOnly = (value?: string | null): string => {
  if (!value) return '-';
  const date = new Date(value);
  if (isNaN(date.getTime())) return value;
  try {
    return date.toLocaleTimeString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  } catch {
    return date.toLocaleTimeString();
  }
};

const matchesTimelineFilter = (recordDate: string | undefined, timelineFilter: string, customRange?: [Date | null, Date | null]): boolean => {
  if (!recordDate) return false;
 
  const recordDateObj = new Date(recordDate);
  if (isNaN(recordDateObj.getTime())) return false;
 
  const today = new Date();
  today.setHours(0, 0, 0, 0);
 
  const recordDateOnly = new Date(recordDateObj);
  recordDateOnly.setHours(0, 0, 0, 0);
 
  switch (timelineFilter) {
    case 'all':
      return true;
   
    case 'today':
      return recordDateOnly.getTime() === today.getTime();
   
    case 'yesterday': {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return recordDateOnly.getTime() === yesterday.getTime();
    }
   
    case 'thisweek': {
      const startOfWeek = new Date(today);
      const day = startOfWeek.getDay();
      const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
      startOfWeek.setDate(diff);
      startOfWeek.setHours(0, 0, 0, 0);
      return recordDateOnly >= startOfWeek && recordDateOnly <= today;
    }
   
    case 'thismonth': {
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      return recordDateOnly >= startOfMonth && recordDateOnly <= today;
    }
   
    case 'last30days': {
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return recordDateOnly >= thirtyDaysAgo && recordDateOnly <= today;
    }
   
    case 'custom': {
      if (!customRange || !customRange[0] || !customRange[1]) return false;
      const startDate = new Date(customRange[0]);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(customRange[1]);
      endDate.setHours(23, 59, 59, 999);
      return recordDateOnly >= startDate && recordDateOnly <= endDate;
    }
   
    default:
      return true;
  }
};

// --- Component ---

export default function EmployeeDashboardPage() {
  // State
  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, setEmployeesData] = useState<Employee[]>([]);

  const [activeView, setActiveView] = useState<'dashboard' | 'attendance'>('dashboard');
 
  // Filters
  const [filterQuery, setFilterQuery] = useState('');
  const [showFilterField, setShowFilterField] = useState(false);
  const [filterField, setFilterField] = useState('name'); // name, email, id

  const [timelineFilter, setTimelineFilter] = useState('thismonth'); // Default to this month as per API


  const [workingSearch, setWorkingSearch] = useState('');
  const [offlineSearch, setOfflineSearch] = useState('');

  // Pagination for Attendance View
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [rowsPerPage, setRowsPerPage] = useState<number>(10);

  // Modal
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null);

  const [downloadMenuOpen, setDownloadMenuOpen] = useState(false);
  const downloadMenuRef = useRef<HTMLDivElement | null>(null);
  const [mobileDownloadMenuOpen, setMobileDownloadMenuOpen] = useState(false);
  const mobileDownloadMenuRef = useRef<HTMLDivElement | null>(null);
  const customPopoverRef = useRef<HTMLDivElement | null>(null);

  const [pendingCustomRange, setPendingCustomRange] = useState<[Date | null, Date | null]>([null, null]);
  const [showCustomPopover, setShowCustomPopover] = useState(false);

  // Dummy function for onCreate as it's a required prop but not used in this context
  const handleCreate = useCallback(() => {
    console.log("Create button clicked!");
    // Add your creation logic here if needed
  }, []);

  // Fetch Data
  const fetchAttendanceRecords = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const headers = new Headers(getAuthHeaders());
      headers.delete('Content-Type');
      headers.set('accept', 'application/json');

      const attendanceEndpoint = getAttendanceEndpoint();
      const employeesEndpoint = `${BACKEND_URL}/api/v1/employees/?page=1&size=100`; // Fetch all employees for now

      const [attendanceResponse, employeesResponse] = await Promise.all([
        fetch(attendanceEndpoint, { headers, cache: 'no-store' }),
        fetch(employeesEndpoint, { headers, cache: 'no-store' }),
      ]);

      let attendancePayload: AttendanceResponse | RawAttendanceRecord[] | null = null;
      try {
        attendancePayload = await attendanceResponse.json();
      } catch {
        attendancePayload = null;
      }

      let employeesPayload: EmployeesResponse | null = null;
      try {
        employeesPayload = await employeesResponse.json();
      } catch {
        employeesPayload = null;
      }

      if (!attendanceResponse.ok) {
        const errorDetail = (attendancePayload as AttendanceResponse)?.detail || `Failed to fetch attendance (${attendanceResponse.status})`;
        throw new Error(errorDetail);
      }

      if (!employeesResponse.ok) {
        // Fix: Type EmployeesResponse may not have 'detail'. Show fallback message if not found.
        const errorDetail =
          (typeof employeesPayload === 'object' &&
            employeesPayload !== null &&
            'detail' in employeesPayload &&
            typeof (employeesPayload as { detail?: unknown }).detail === 'string'
              ? (employeesPayload as { detail?: string }).detail
              : null) ||
          `Failed to fetch employees (${employeesResponse.status})`;
        throw new Error(errorDetail);
      }

      // Handle both attendance response formats
      let rawAttendanceRecords: RawAttendanceRecord[] = [];
     
      if (Array.isArray(attendancePayload)) {
        rawAttendanceRecords = attendancePayload;
      } else if (attendancePayload && typeof attendancePayload === 'object' && 'success' in attendancePayload) {
        const wrappedPayload = attendancePayload as AttendanceResponse;
        if (wrappedPayload.success === false) {
          throw new Error(wrappedPayload.detail || 'Failed to fetch attendance data');
        }
        if (Array.isArray(wrappedPayload.data)) {
          rawAttendanceRecords = wrappedPayload.data;
        } else if (Array.isArray(wrappedPayload.records)) {
          rawAttendanceRecords = wrappedPayload.records;
        }
        if (wrappedPayload.statistics) {
          setStatistics(wrappedPayload.statistics);
        }
      }

      // Set employees data
      if (employeesPayload && Array.isArray(employeesPayload.data)) {
        setEmployeesData(employeesPayload.data);
      } else {
        setEmployeesData([]);
      }

      // Create a map for quick employee lookup by email
      const employeeMap = new Map<string, Employee>();
      employeesPayload?.data.forEach(emp => {
        employeeMap.set(emp.email.toLowerCase(), emp);
      });

      // Normalize Attendance Records
      const records: AttendanceRecord[] = rawAttendanceRecords.map((record: RawAttendanceRecord, index: number) => {
        const email = (record.email || record.employeeEmail || record.employee_email || '').toLowerCase();
        const employeeFromApi = employeeMap.get(email);

        const code = employeeFromApi?.emp_id || record.employeeCode || record.emp_id || record.employeeId || '';
        const idValue = record._id || record.id || `${email}-${record.date || index}`;
       
        const statusRaw = record.clockInStatus || record.clockOutStatus || record.status || '';
        const formattedStatus = statusRaw ? statusRaw.charAt(0).toUpperCase() + statusRaw.slice(1) : undefined;

        const clockInLocation = record.clockInLocation;
        const clockOutLocation = record.clockOutLocation;
       
        const locationSource = clockInLocation || clockOutLocation || record.location;
        const normalizedLocation = locationSource ? { ...locationSource } : undefined;

        let totalHours = record.totalHours ?? record.total_hours;
        if (!totalHours && record.clockIn && record.clockOut) {
          try {
            const clockInTime = new Date(record.clockIn).getTime();
            const clockOutTime = new Date(record.clockOut).getTime();
            if (!isNaN(clockInTime) && !isNaN(clockOutTime) && clockOutTime > clockInTime) {
              totalHours = (clockOutTime - clockInTime) / (1000 * 60 * 60); // Convert to hours
            }
          } catch {
            // Ignore calculation errors
          }
        }

        const overtimeHours = record.overtimeHours ?? record.overtime_hours ??
          (record.overTimeMinutes ? record.overTimeMinutes / 60 : undefined);

        return {
          id: idValue,
          employeeEmail: email,
          employeeCode: code,
          employeeName: record.employeeName || record.name || record.employee_name,
          date: record.date,
          clockIn: record.clockIn || record.clock_in,
          clockOut: record.clockOut || record.clock_out,
          clockInLocation: clockInLocation,
          clockOutLocation: clockOutLocation,
          clockInStatus: record.clockInStatus,
          clockOutStatus: record.clockOutStatus,
          lateBy: record.lateBy || record.late_by,
          lateByMinutes: record.lateByMinutes,
          earlyBy: record.earlyBy,
          earlyByMinutes: record.earlyByMinutes,
          overTime: record.overTime,
          overTimeMinutes: record.overTimeMinutes,
          isSpecialDay: record.isSpecialDay,
          specialDayType: record.specialDayType,
          holidayName: record.holidayName,
          totalHours: totalHours,
          overtimeHours: overtimeHours,
          status: formattedStatus,
          location: normalizedLocation,
          isLeaveDay: record.isLeaveDay ?? record.is_leave_day,
          remarks: record.remarks,
          notes: record.notes,
          createdAt: record.createdAt || record.created_at,
          updatedAt: record.updatedAt || record.updated_at,
        };
      });

      setAttendanceData(records);

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load attendance data';
      setError(message);
      setAttendanceData([]);
    } finally {
      setLoading(false);
    }
  }, []); // Fetch on mount

  useEffect(() => {
    fetchAttendanceRecords();
  }, [fetchAttendanceRecords]);

  const handleRefresh = () => {
    fetchAttendanceRecords();
  };

  // Derived Data: Group by Employee for Dashboard View
  const employeeSummaries = useMemo(() => {
    const summaries = new Map<string, EmployeeSummary>();
    const today = new Date();
    const oneDayAgo = new Date(today.getTime() - 24 * 60 * 60 * 1000);

    const isToday = (dateStr?: string) => {
        if (!dateStr) return false;
        const d = new Date(dateStr);
        return !isNaN(d.getTime()) && d.toDateString() === today.toDateString();
    };

    // Filter attendance data by timeline first
    const timelineFilteredData = attendanceData.filter(record =>
      matchesTimelineFilter(record.date, timelineFilter, pendingCustomRange)
    );

    timelineFilteredData.forEach(record => {
      const key = (record.employeeEmail || record.employeeCode || '').toLowerCase();
      if (!key) return;

      if (!summaries.has(key)) {
        summaries.set(key, {
          employeeEmail: record.employeeEmail,
          employeeCode: record.employeeCode,
          employeeName: getAttendanceDisplayName(record),
          currentStatus: 'offline',
          lastClockIn: null,
          lastClockOut: null,
          totalHours: 0,
          records: []
        });
      }

      const summary = summaries.get(key)!;
      summary.records.push(record);
      summary.totalHours += Number(record.totalHours || 0);

      // Determine "Working" status
      // Logic: Has clock in today/recently AND no clock out
      const hasClockIn = !!record.clockIn && record.clockIn !== '-';
      const hasClockOut = !!record.clockOut && record.clockOut !== '-';

      if (hasClockIn && !hasClockOut) {
          let isRecent = false;
          if (isToday(record.date)) isRecent = true;
          else if (record.clockIn) {
              const d = new Date(record.clockIn);
              if (!isNaN(d.getTime()) && d >= oneDayAgo) isRecent = true;
          }

          if (isRecent) {
              summary.currentStatus = 'working';
          }
      }
     
      // Update last clock in/out
      if (record.clockIn && (!summary.lastClockIn || new Date(record.clockIn) > new Date(summary.lastClockIn))) {
          summary.lastClockIn = record.clockIn;
      }
      if (record.clockOut && (!summary.lastClockOut || new Date(record.clockOut) > new Date(summary.lastClockOut))) {
          summary.lastClockOut = record.clockOut;
      }
    });

    return Array.from(summaries.values());
  }, [attendanceData, timelineFilter, pendingCustomRange]);

  // Filtered Lists
  const filteredEmployees = useMemo(() => {
      const q = filterQuery.trim().toLowerCase();
      if (!q) return employeeSummaries;
     
      return employeeSummaries.filter(e => {
        if (filterField === 'name') {
          return e.employeeName.toLowerCase().includes(q);
        } else if (filterField === 'email') {
          return e.employeeEmail.toLowerCase().includes(q);
        } else if (filterField === 'id') {
          return e.employeeCode.toLowerCase().includes(q);
        }
        // Default: search all fields
        return e.employeeName.toLowerCase().includes(q) ||
               e.employeeEmail.toLowerCase().includes(q) ||
               e.employeeCode.toLowerCase().includes(q);
      });
  }, [employeeSummaries, filterQuery, filterField]);

  const workingEmployees = useMemo(() => {
      const q = workingSearch.trim().toLowerCase();
      let list = filteredEmployees.filter(e => e.currentStatus === 'working');
      if (q) {
          list = list.filter(e =>
            e.employeeName.toLowerCase().includes(q) ||
            e.employeeEmail.toLowerCase().includes(q) ||
            e.employeeCode.toLowerCase().includes(q)
          );
      }
      return list;
  }, [filteredEmployees, workingSearch]);

  const offlineEmployees = useMemo(() => {
      const q = offlineSearch.trim().toLowerCase();
      let list = filteredEmployees.filter(e => e.currentStatus === 'offline');
      if (q) {
          list = list.filter(e =>
            e.employeeName.toLowerCase().includes(q) ||
            e.employeeEmail.toLowerCase().includes(q) ||
            e.employeeCode.toLowerCase().includes(q)
          );
      }
      return list;
  }, [filteredEmployees, offlineSearch]);

  // Filtered Attendance Records (for Attendance View)
  const filteredAttendance = useMemo(() => {
    // First filter by timeline
    const filtered = attendanceData.filter(record =>
      matchesTimelineFilter(record.date, timelineFilter, pendingCustomRange)
    );
   
    // Then filter by search query if provided
    const q = filterQuery.trim().toLowerCase();
    if (!q) return filtered;
   
    return filtered.filter(record => {
      if (filterField === 'name') {
        const name = getAttendanceDisplayName(record).toLowerCase();
        return name.includes(q);
      } else if (filterField === 'email') {
        const email = (record.employeeEmail || '').toLowerCase();
        return email.includes(q);
      } else if (filterField === 'id') {
        const code = (record.employeeCode || '').toLowerCase();
        return code.includes(q);
      }
      // Default: search all fields
      const name = getAttendanceDisplayName(record).toLowerCase();
      const email = (record.employeeEmail || '').toLowerCase();
      const code = (record.employeeCode || '').toLowerCase();
      const status = (record.status || '').toLowerCase();
      const location = getAttendanceLocationText(record).toLowerCase();
     
      return name.includes(q) || email.includes(q) || code.includes(q) || status.includes(q) || location.includes(q);
    });
  }, [attendanceData, filterQuery, filterField, timelineFilter, pendingCustomRange]);

  // Pagination for Attendance View
  const paginatedAttendance = useMemo(() => {
      const start = (currentPage - 1) * rowsPerPage;
      return filteredAttendance.slice(start, start + rowsPerPage);
  }, [filteredAttendance, currentPage, rowsPerPage]);

  useEffect(() => {
      setCurrentPage(1);
  }, [activeView, filterQuery, rowsPerPage]);

  // Counts
  const totalEmployeesCount = statistics?.totalUniqueEmployees || employeeSummaries.length;
  const workingCount = workingEmployees.length; // Derived from our logic as API doesn't give live count directly in stats
  const offlineCount = Math.max(0, totalEmployeesCount - workingCount);

  const cards = [
    { label: 'Total Employees', value: totalEmployeesCount, icon: <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" /> },
    { label: 'Working Now', value: workingCount, icon: <Activity className="w-5 h-5 text-blue-600 dark:text-blue-400" /> },
    { label: 'Offline', value: offlineCount, icon: <Power className="w-5 h-5 text-blue-600 dark:text-blue-400" /> },
  ];

  // Export
  const handleExport = (format: 'csv' | 'excel' = 'csv') => {
      // Only export attendance records view, as that's what matches the table format
      const dataToExport = activeView === 'attendance' ? filteredAttendance : [];
      
      if (!dataToExport.length) {
          alert("No data to download");
          return;
      }

      // Prepare data with columns matching the table: EMPLOYEE, EMPLOYEE ID, DATE, CLOCK IN, CLOCK OUT, WORKING HOURS, LATE BY, EARLY BY, LOCATION
      const exportData = dataToExport.map((record: AttendanceRecord) => {
          const employeeName = getAttendanceDisplayName(record);
          const employeeEmail = record.employeeEmail || '-';
          // Use newline for Excel, space for CSV
          const employeeDisplay = format === 'excel' ? `${employeeName}\n${employeeEmail}` : `${employeeName} ${employeeEmail}`;
          
          // Format Clock In with LATE tag if applicable
          let clockInDisplay = formatTimeOnly(record.clockIn);
          if (record.clockInStatus === 'late' && clockInDisplay !== '-') {
              clockInDisplay = `${clockInDisplay} (LATE)`;
          }
          
          // Format Clock Out with EARLY tag if applicable
          let clockOutDisplay = formatTimeOnly(record.clockOut);
          if (record.clockOutStatus === 'early' && clockOutDisplay !== '-') {
              clockOutDisplay = `${clockOutDisplay} (EARLY)`;
          }
          
          // Format Late By
          const lateByDisplay = record.lateByMinutes && record.lateByMinutes > 0 
              ? formatDelayTime(record.lateBy, record.lateByMinutes)
              : '-';
          
          // Format Early By
          const earlyByDisplay = record.earlyByMinutes && record.earlyByMinutes > 0
              ? formatDelayTime(record.earlyBy, record.earlyByMinutes)
              : '-';

          return {
              'EMPLOYEE': employeeDisplay,
              'EMPLOYEE ID': record.employeeCode || '-',
              'DATE': formatDateOnly(record.date),
              'CLOCK IN': clockInDisplay,
              'CLOCK OUT': clockOutDisplay,
              'WORKING HOURS': formatWorkingHours(record.totalHours),
              'LATE BY': lateByDisplay,
              'EARLY BY': earlyByDisplay,
              'LOCATION': getAttendanceLocationText(record)
          };
      });

      const fileName = `employee-report-${new Date().toISOString().split('T')[0]}.${format === 'excel' ? 'xlsx' : 'csv'}`;

      if (format === 'excel') {
          // Create Excel file using xlsx library
          const ws = XLSX.utils.json_to_sheet(exportData);
          
          // Set column widths
          const columnWidths = [
              { wch: 30 }, // EMPLOYEE
              { wch: 15 }, // EMPLOYEE ID
              { wch: 15 }, // DATE
              { wch: 18 }, // CLOCK IN
              { wch: 18 }, // CLOCK OUT
              { wch: 15 }, // WORKING HOURS
              { wch: 12 }, // LATE BY
              { wch: 12 }, // EARLY BY
              { wch: 40 }  // LOCATION
          ];
          ws['!cols'] = columnWidths;
          
          const wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws, 'Attendance Records');
          XLSX.writeFile(wb, fileName);
      } else {
          // CSV export
          const headers = ['EMPLOYEE', 'EMPLOYEE ID', 'DATE', 'CLOCK IN', 'CLOCK OUT', 'WORKING HOURS', 'LATE BY', 'EARLY BY', 'LOCATION'];
          const rows = exportData.map(row => 
              headers.map(header => `"${String(row[header as keyof typeof row] || '').replace(/"/g, '""')}"`).join(',')
          );
          const csvContent = [headers.join(','), ...rows].join('\r\n');
          const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.setAttribute("download", fileName);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
      }
  };

  // Detail Modal Data
  const selectedEmployeeRecords = useMemo(() => {
      if (!selectedEmail) return [];
      return attendanceData.filter(r => r.employeeEmail === selectedEmail).sort((a, b) => {
          const da = a.clockIn ? new Date(a.clockIn).getTime() : 0;
          const db = b.clockIn ? new Date(b.clockIn).getTime() : 0;
          return db - da;
      });
  }, [attendanceData, selectedEmail]);

  const selectedEmployeeSummary = useMemo(() => {
      if (!selectedEmail) return null;
      return employeeSummaries.find(e => e.employeeEmail === selectedEmail);
  }, [employeeSummaries, selectedEmail]);


  return (
    <div className="relative min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="mx-4 md:mx-6 mt-6">
        <DashboardHeader
          variant="default"
          size="lg"
          title="Employee Dashboard"
          subtitle="Employee performance and activity overview"
          icon={() => (
            <svg className="w-6 h-6 sm:w-8 sm:h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
            </svg>
          )}
          breadcrumbs={[
            { label: 'Home', href: '/' },
            { label: 'Employee Dashboard', href: '/employee-dashboard' }
          ]}
        />
      </div>

      <div className="w-full max-w-7xl mx-auto p-4 md:p-6 flex-1">
        {error && <div className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</div>}

        {/* View Toggle */}
        <div className="mb-8">
            <div className="inline-flex rounded-xl bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 border border-gray-200 dark:border-gray-700 p-1.5 shadow-lg">
              <button
                type="button"
                onClick={() => setActiveView('dashboard')}
                className={`px-8 py-3 text-sm font-semibold rounded-lg transition-all duration-300 ${
                  activeView === 'dashboard'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg transform scale-105'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-700/50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-3zM14 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1h-4a1 1 0 01-1-1v-3z" />
                  </svg>
                  Dashboard
                </div>
              </button>
              <button
                type="button"
                onClick={() => setActiveView('attendance')}
                className={`px-8 py-3 text-sm font-semibold rounded-lg transition-all duration-300 ${
                  activeView === 'attendance'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg transform scale-105'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-700/50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                  Attendance Records
                </div>
              </button>
            </div>
        </div>

        <div className="w-full mb-8">
          <ActionBar
            filterQuery={filterQuery}
            setFilterQuery={setFilterQuery}
            showFilterField={showFilterField}
            setShowFilterField={setShowFilterField}
            filterField={filterField}
            setFilterField={setFilterField}
            timelineFilter={timelineFilter}
            setTimelineFilter={setTimelineFilter}
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
            handleExport={handleExport}
            onRefresh={handleRefresh}
            onCreate={handleCreate}
            searchPlaceholder="Search by name, email, or employee ID..."
            filterOptions={[
              { value: "name", label: "Filter by Name" },
              { value: "email", label: "Filter by Email" },
              { value: "id", label: "Filter by Employee ID" },
            ]}
            showUploadButton={false}
            showCreateButton={false}
            showFilterSelector={true}
            showTimelineSelector={true}
          />
        </div>

        {activeView === 'dashboard' ? (
          <>
            {/* Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {cards.map((card, index) => (
                <div key={index} className="group relative overflow-hidden bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-1">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700"></div>
                  <div className="relative z-10">
                    <div className="flex items-start justify-between mb-6">
                      <div className="p-4 rounded-xl bg-gray-100 dark:bg-gray-700 shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300">
                        {card.icon}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                        {loading ? (
                          <div className="h-9 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                        ) : (
                          card.value
                        )}
                      </div>
                      <div className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                        {card.label}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Analytics */}
            <div className="mt-8">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-200 bg-clip-text text-transparent">Employee Analytics</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">Real-time employee status and activity</p>
                </div>
              </div>

              <div className="grid grid-cols-12 gap-6">
                <div className="col-span-12 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 overflow-hidden">
                  <div className="relative z-10">
                    <div className="flex items-center gap-3 p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-emerald-50 to-blue-50 dark:from-emerald-900/20 dark:to-blue-900/20">
                      <div className="p-2.5 rounded-lg bg-gradient-to-br from-emerald-500 to-blue-600 shadow-lg">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-200 bg-clip-text text-transparent">Live Status</h3>
                    </div>
                   
                    <div className="p-6">

                    {/* Working Now */}
                    <div className="mb-8">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                            <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <div>
                            <h4 className="text-base font-bold text-gray-900 dark:text-white">Currently Working</h4>
                            <p className="text-xs text-gray-600 dark:text-gray-400">{workingCount} {workingCount === 1 ? 'employee' : 'employees'} active</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                          <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">LIVE</span>
                        </div>
                      </div>
                      <div className="mb-4">
                        <div className="relative">
                          <input
                            type="text"
                            value={workingSearch}
                            onChange={(e) => setWorkingSearch(e.target.value)}
                            placeholder="Search working employees..."
                            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                          />
                          <svg className="absolute left-3 top-3 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                        </div>
                      </div>
                      {workingEmployees.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 px-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-dashed border-gray-300 dark:border-gray-700">
                          <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mb-3">
                            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                            </svg>
                          </div>
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">No Active Employees</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">No one is currently working</p>
                        </div>
                      ) : (
                        <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
                          <div className="overflow-x-auto max-h-80 overflow-y-auto">
                            <table className="w-full">
                              <thead className="bg-gradient-to-r from-emerald-50 to-blue-50 dark:from-emerald-900/20 dark:to-blue-900/20">
                                <tr className="border-b border-gray-200 dark:border-gray-700">
                                  <th className="text-left py-3 px-4 font-bold text-xs text-gray-700 dark:text-gray-300 uppercase tracking-wider">Employee</th>
                                  <th className="text-left py-3 px-4 font-bold text-xs text-gray-700 dark:text-gray-300 uppercase tracking-wider">Email</th>
                                  <th className="text-left py-3 px-4 font-bold text-xs text-gray-700 dark:text-gray-300 uppercase tracking-wider">Status</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {workingEmployees.map((emp, idx) => (
                                  <tr key={idx} className="hover:bg-emerald-50 dark:hover:bg-emerald-900/10 cursor-pointer transition-colors duration-150" onClick={() => { setSelectedEmail(emp.employeeEmail); setDetailOpen(true); }}>
                                    <td className="py-3 px-4">
                                      <div className="flex items-center gap-3">
                                        <div className="relative">
                                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center text-white text-xs font-bold">
                                            {getInitial(emp.employeeName, emp.employeeEmail)}
                                          </div>
                                          <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white dark:border-gray-800 animate-pulse"></span>
                                        </div>
                                        <span className="text-sm font-semibold text-gray-900 dark:text-white">{emp.employeeName}</span>
                                      </div>
                                    </td>
                                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">{emp.employeeEmail}</td>
                                    <td className="py-3 px-4">
                                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                                        WORKING
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Offline */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700">
                            <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414" />
                            </svg>
                          </div>
                          <div>
                            <h4 className="text-base font-bold text-gray-900 dark:text-white">Offline</h4>
                            <p className="text-xs text-gray-600 dark:text-gray-400">{offlineCount} {offlineCount === 1 ? 'employee' : 'employees'} inactive</p>
                          </div>
                        </div>
                        <div className="px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-700">
                          <span className="text-xs font-bold text-gray-600 dark:text-gray-400">OFFLINE</span>
                        </div>
                      </div>
                      <div className="mb-4">
                        <div className="relative">
                          <input
                            type="text"
                            value={offlineSearch}
                            onChange={(e) => setOfflineSearch(e.target.value)}
                            placeholder="Search offline employees..."
                            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-gray-500 focus:border-transparent transition-all"
                          />
                          <svg className="absolute left-3 top-3 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                        </div>
                      </div>
                      {offlineEmployees.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 px-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-dashed border-gray-300 dark:border-gray-700">
                          <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mb-3">
                            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">All Employees Online</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">No offline employees found</p>
                        </div>
                      ) : (
                        <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
                          <div className="overflow-x-auto max-h-80 overflow-y-auto">
                            <table className="w-full">
                              <thead className="bg-gray-50 dark:bg-gray-900">
                                <tr className="border-b border-gray-200 dark:border-gray-700">
                                  <th className="text-left py-3 px-4 font-bold text-xs text-gray-700 dark:text-gray-300 uppercase tracking-wider">Employee</th>
                                  <th className="text-left py-3 px-4 font-bold text-xs text-gray-700 dark:text-gray-300 uppercase tracking-wider">Email</th>
                                  <th className="text-left py-3 px-4 font-bold text-xs text-gray-700 dark:text-gray-300 uppercase tracking-wider">Status</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {offlineEmployees.map((emp, idx) => (
                                  <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors duration-150" onClick={() => { setSelectedEmail(emp.employeeEmail); setDetailOpen(true); }}>
                                    <td className="py-3 px-4">
                                      <div className="flex items-center gap-3">
                                        <div className="relative">
                                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center text-white text-xs font-bold">
                                            {getInitial(emp.employeeName, emp.employeeEmail)}
                                          </div>
                                          <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-gray-400 rounded-full border-2 border-white dark:border-gray-800"></span>
                                        </div>
                                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{emp.employeeName}</span>
                                      </div>
                                    </td>
                                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">{emp.employeeEmail}</td>
                                    <td className="py-3 px-4">
                                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                                        <span className="w-1.5 h-1.5 bg-gray-500 rounded-full"></span>
                                        OFFLINE
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>

                  </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="mt-6 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 overflow-hidden">
            <div className="relative z-10">
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6 text-white">
                      <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"></path>
                      <path d="M16 3.128a4 4 0 0 1 0 7.744"></path>
                      <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                      <circle cx="9" cy="7" r="4"></circle>
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-200 bg-clip-text text-transparent">Attendance Records</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                      {loading ? 'Loading...' : `${filteredAttendance.length} ${filteredAttendance.length === 1 ? 'record' : 'records'} found`}
                    </p>
                  </div>
                </div>
              </div>
             
              <div className="p-6">
             
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 border-b border-gray-200 dark:border-gray-700">
                      <th className="py-4 px-6 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Employee</th>
                      <th className="py-4 px-6 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Employee ID</th>
                      <th className="py-4 px-6 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Date</th>
                      <th className="py-4 px-6 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Clock In</th>
                      <th className="py-4 px-6 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Clock Out</th>
                      <th className="py-4 px-6 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Working Hours</th>
                      <th className="py-4 px-6 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Late By</th>
                      <th className="py-4 px-6 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Early By</th>
                      <th className="py-4 px-6 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Location</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {loading ? (
                      <tr>
                        <td colSpan={9} className="py-12 text-center">
                          <div className="flex flex-col items-center gap-3">
                            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                              </svg>
                            </div>
                            <div>
                              <p className="text-lg font-semibold text-gray-900 dark:text-white">No Attendance Records</p>
                              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">No attendance data available for the selected period</p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ) : paginatedAttendance.length > 0 ? (
                      paginatedAttendance.map((r, i) => (
                        <tr key={i} className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 dark:hover:from-blue-900/10 dark:hover:to-indigo-900/10 transition-all duration-200 cursor-pointer group" onClick={() => { setSelectedEmail(r.employeeEmail); setDetailOpen(true); }}>
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold shadow-lg group-hover:scale-110 transition-transform duration-200">
                                {getInitial(getAttendanceDisplayName(r), r.employeeEmail)}
                              </div>
                              <div>
                                <div className="font-semibold text-gray-900 dark:text-white">{getAttendanceDisplayName(r)}</div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">{r.employeeEmail || '-'}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-6 text-sm font-medium text-gray-900 dark:text-white">
                            {r.employeeCode || '-'}
                          </td>
                          <td className="py-4 px-6 text-sm font-medium text-gray-900 dark:text-white whitespace-nowrap">{formatDateOnly(r.date)}</td>
                          <td className="py-4 px-6">
                            <div className="text-sm font-medium text-gray-900 dark:text-white whitespace-nowrap">{formatTimeOnly(r.clockIn)}</div>
                            {r.clockInStatus && (
                              <div>
                                <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold mt-1.5 ${
                                  r.clockInStatus === 'late' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' :
                                  r.clockInStatus === 'on-time' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' :
                                  'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200'
                                }`}>
                                  {r.clockInStatus === 'late' ? '(LATE)' : `(${r.clockInStatus.toUpperCase()})`}
                                </span>
                              </div>
                            )}
                          </td>
                          <td className="py-4 px-6">
                            <div className="text-sm font-medium text-gray-900 dark:text-white whitespace-nowrap">{formatTimeOnly(r.clockOut)}</div>
                            {r.clockOutStatus && (
                              <div>
                                <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold mt-1.5 whitespace-nowrap ${
                                  r.clockOutStatus === 'early'
                                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                                    : r.clockOutStatus === 'on-time'
                                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                                    : r.clockOutStatus === 'over-time'
                                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                                    : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200'
                                }`}>
                                  {r.clockOutStatus.toUpperCase()}
                                </span>
                              </div>
                            )}
                          </td>
                          <td className="py-4 px-6">
                            {r.isSpecialDay ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                                </svg>
                                {r.holidayName || r.specialDayType || 'Special Day'}
                              </span>
                            ) : (
                              <div className="text-sm font-bold text-gray-900 dark:text-white">{formatWorkingHours(r.totalHours)}</div>
                            )}
                          </td>
                          <td className="py-4 px-6">
                            {r.lateByMinutes && r.lateByMinutes > 0 ? (
                              <div className="space-y-1">
                                <div className="text-sm font-bold text-red-600 dark:text-red-400">{formatDelayTime(r.lateBy, r.lateByMinutes)}</div>
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                                On Time
                              </span>
                            )}
                          </td>
                          <td className="py-4 px-6">
                            {r.earlyByMinutes && r.earlyByMinutes > 0 ? (
                              <div className="space-y-1">
                                <div className="text-sm font-bold text-amber-600 dark:text-amber-400">{formatDelayTime(r.earlyBy, r.earlyByMinutes)}</div>
                              </div>
                            ) : (
                              <span className="text-sm text-gray-400 dark:text-gray-500">—</span>
                            )}
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex items-start gap-2 max-w-xs">
                              <svg className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                              </svg>
                              <div className="text-sm text-gray-700 dark:text-gray-300">{getAttendanceLocationText(r)}</div>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={9} className="py-12 text-center">
                          <div className="flex flex-col items-center gap-3">
                            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                              </svg>
                            </div>
                            <div>
                              <p className="text-lg font-semibold text-gray-900 dark:text-white">No Attendance Records</p>
                              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">No attendance data available for the selected period</p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
                {filteredAttendance.length > 0 && (
                  <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <Pagination
                      className=""
                      currentPage={currentPage}
                      pageSize={rowsPerPage}
                      totalItems={filteredAttendance.length}
                      pageSizeOptions={[5, 10, 25, 50]}
                      onPageChange={setCurrentPage}
                      onPageSizeChange={(size) => { setRowsPerPage(size); setCurrentPage(1); }}
                      label="records"
                    />
                  </div>
                )}
              </div>
              </div>
            </div>
          </div>
        )}

        <Modal isOpen={detailOpen} onClose={() => setDetailOpen(false)}>
          <div className="min-w-[360px] max-w-[960px] dark:text-white">
            <h3 className="text-lg font-semibold text-black dark:text-white">Employee Details</h3>
            {selectedEmail && <p className="text-sm text-gray-500 dark:text-white mt-1 break-all">{selectedEmail}</p>}
           
            {selectedEmployeeSummary ? (
              <div className="mt-4 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-white">Name</p>
                    <p className="text-sm text-black dark:text-white">{selectedEmployeeSummary.employeeName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-white">Emp ID</p>
                    <p className="text-sm text-black dark:text-white">{selectedEmployeeSummary.employeeCode}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-white">Status</p>
                    <p className="text-sm dark:text-white capitalize">{selectedEmployeeSummary.currentStatus}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-white">Total Hours (Month)</p>
                    <p className="text-sm dark:text-white">{formatWorkingHours(selectedEmployeeSummary.totalHours)}</p>
                  </div>
                </div>
               
                <div>
                  <h4 className="text-sm font-medium text-black dark:text-white mb-2">Recent Records</h4>
                  <div className="max-h-80 overflow-y-auto border border-stroke dark:border-strokedark rounded">
                    <table className="min-w-full text-left text-sm dark:text-white">
                      <thead>
                        <tr className="text-xs uppercase text-gray-500 dark:text-white border-b border-stroke dark:border-strokedark">
                          <th className="py-2 px-3">Date</th>
                          <th className="py-2 px-3">Clock In</th>
                          <th className="py-2 px-3">Clock Out</th>
                          <th className="py-2 px-3">Status</th>
                          <th className="py-2 px-3">Late/Early</th>
                          <th className="py-2 px-3">Location</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedEmployeeRecords.length > 0 ? (
                          selectedEmployeeRecords.map((rec, idx) => (
                            <tr key={idx} className="border-b border-stroke dark:border-strokedark">
                              <td className="py-2 px-3 dark:text-white">{formatDateOnly(rec.date)}</td>
                              <td className="py-2 px-3 dark:text-white">
                                <div className="whitespace-nowrap">{formatTimeOnly(rec.clockIn)}</div>
                                {rec.clockInStatus && (
                                  <div>
                                    <span className={`inline-block px-1 py-0.5 rounded text-xs mt-0.5 ${
                                      rec.clockInStatus === 'late' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' :
                                      rec.clockInStatus === 'on-time' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                                      'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200'
                                    }`}>
                                      {rec.clockInStatus === 'late' ? '(LATE)' : `(${rec.clockInStatus.toUpperCase()})`}
                                    </span>
                                  </div>
                                )}
                              </td>
                              <td className="py-2 px-3 dark:text-white">
                                <div className="whitespace-nowrap">{formatTimeOnly(rec.clockOut)}</div>
                                {rec.clockOutStatus && (
                                  <div>
                                    <span className={`inline-block px-1 py-0.5 rounded text-xs mt-0.5 whitespace-nowrap ${
                                      rec.clockOutStatus === 'early'
                                        ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'
                                        : rec.clockOutStatus === 'on-time'
                                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                                        : rec.clockOutStatus === 'over-time'
                                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                                        : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200'
                                    }`}>
                                      {rec.clockOutStatus}
                                    </span>
                                  </div>
                                )}
                              </td>
                              <td className="py-2 px-3 dark:text-white">
                                {rec.isSpecialDay ? (
                                  <span className="inline-block px-1 py-0.5 rounded text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                                    {rec.holidayName || rec.specialDayType || 'Special'}
                                  </span>
                                ) : (
                                  <div className="text-xs font-semibold">{formatWorkingHours(rec.totalHours)}</div>
                                )}
                              </td>
                              <td className="py-2 px-3 dark:text-white text-xs">
                                {rec.lateBy && rec.lateBy !== 'On time' && (
                                  <div className="text-red-600 dark:text-red-400">Late: {rec.lateBy}</div>
                                )}
                                {rec.earlyBy && rec.earlyBy !== '-' && (
                                  <div className="text-orange-600 dark:text-orange-400">Early: {rec.earlyBy}</div>
                                )}
                                {(!rec.lateBy || rec.lateBy === 'On time') && (!rec.earlyBy || rec.earlyBy === '-') && (
                                  <div className="text-green-600 dark:text-green-400">On Time</div>
                                )}
                              </td>
                              <td className="py-2 px-3 dark:text-white text-xs max-w-xs truncate">{getAttendanceLocationText(rec)}</td>
                            </tr>
                          ))
                        ) : (
                          <tr><td className="py-3 px-3 dark:text-white" colSpan={6}>No records found</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-8">No details available</div>
            )}
          </div>
        </Modal>
      </div>
    </div>
  );
}