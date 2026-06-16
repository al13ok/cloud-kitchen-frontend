'use client';

import React, { useState, useEffect, useCallback } from 'react';
import DashboardHeader from '@/components/header/DashboardHeader';
import { Clock, Calendar, User, AlertCircle } from 'lucide-react';
import { getBackendUrl, getAuthHeaders } from '@/utils/api';
import { getEmployees } from '@/utils/api';

// Types
interface Employee {
  emp_id: string;
  full_name: string;
  email: string;
  phone: string;
  department: string;
  id: string;
}

interface AttendanceRecord {
  _id?: string;
  email: string;
  date: string;
  clockIn?: string;
  clockOut?: string;
  clockInStatus?: string;
  lateByMinutes?: number;
  lateBy?: string;
  workHours?: number;
  status?: string;
  clockOutStatus?: string;
  earlyByMinutes?: number;
  earlyBy?: string;
  overTimeMinutes?: number;
  overTime?: string;
  isSpecialDay?: boolean;
  specialDayType?: string;
  holidayName?: string;
}

interface OfficeTime {
  officeStartTime: string;
  officeEndTime: string;
}

export default function AttendanceComponent() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRecord | null>(null);
  const [, setOfficeTime] = useState<OfficeTime>({ officeStartTime: '09:30', officeEndTime: '18:30' });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Get user email from localStorage
  const getUserEmail = (): string | null => {
    if (typeof window === 'undefined') return null;
    
    // Try to get from userData
    const userData = localStorage.getItem('userData');
    if (userData) {
      try {
        const parsed = JSON.parse(userData);
        return parsed.email || parsed.username || null;
      } catch {
        // Ignore parse errors
      }
    }
    
    // Try to get from token (decode if needed)
    const token = localStorage.getItem('access_token') || 
                  localStorage.getItem('jwtToken') || 
                  localStorage.getItem('token');
    
    if (token) {
      try {
        // Simple JWT decode (just for email extraction)
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.sub || payload.email || payload.username || null;
      } catch {
        // Ignore decode errors
      }
    }
    
    return null;
  };

  // Fetch employee information
  const fetchEmployeeInfo = useCallback(async (email: string) => {
    try {
      const response = await getEmployees(1, 100) as { data?: Employee[] };
      const employees = response.data || [];
      const foundEmployee = employees.find(emp => emp.email.toLowerCase() === email.toLowerCase());
      
      if (foundEmployee) {
        setEmployee(foundEmployee);
        return foundEmployee;
      } else {
        // Create a basic employee object from email if not found
        const basicEmployee: Employee = {
          emp_id: email.split('@')[0],
          full_name: email.split('@')[0].replace(/\./g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          email: email,
          phone: '',
          department: 'General',
          id: ''
        };
        setEmployee(basicEmployee);
        return basicEmployee;
      }
    } catch (err) {
      console.error('Error fetching employee info:', err);
      // Create basic employee from email
      const basicEmployee: Employee = {
        emp_id: email.split('@')[0],
        full_name: email.split('@')[0].replace(/\./g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        email: email,
        phone: '',
        department: 'General',
        id: ''
      };
      setEmployee(basicEmployee);
      return basicEmployee;
    }
  }, []);

  // Fetch office time
  const fetchOfficeTime = useCallback(async () => {
    try {
      const backendUrl = getBackendUrl();
      const response = await fetch(`${backendUrl}/api/v1/attendance/office-time`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.officeStartTime && data.officeEndTime) {
          setOfficeTime({
            officeStartTime: data.officeStartTime,
            officeEndTime: data.officeEndTime,
          });
        }
      }
    } catch (err) {
      console.error('Error fetching office time:', err);
    }
  }, []);

  // Fetch today's attendance
  const fetchTodayAttendance = useCallback(async (email: string) => {
    try {
      const backendUrl = getBackendUrl();
      const today = new Date().toISOString().split('T')[0];
      const response = await fetch(`${backendUrl}/api/v1/attendance?email=${encodeURIComponent(email)}`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data && Array.isArray(data.data)) {
          const todayRecord = data.data.find((record: AttendanceRecord) => record.date === today);
          setAttendance(todayRecord || null);
        }
      }
    } catch (err) {
      console.error('Error fetching attendance:', err);
    }
  }, []);

  // Calculate work hours
  const calculateWorkHours = (clockIn: string, clockOut?: string): number => {
    if (!clockIn) return 0;
    if (!clockOut) {
      // Calculate from clock-in to now
      const clockInTime = new Date(clockIn);
      const now = new Date();
      const diffMs = now.getTime() - clockInTime.getTime();
      return Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100; // Round to 2 decimal places
    }
    
    const clockInTime = new Date(clockIn);
    const clockOutTime = new Date(clockOut);
    const diffMs = clockOutTime.getTime() - clockInTime.getTime();
    return Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;
  };

  // Clock In
  const handleClockIn = async () => {
    if (!employee?.email) {
      setError('Employee email not found');
      return;
    }

    setActionLoading(true);
    setError(null);

    try {
      const backendUrl = getBackendUrl();
      const response = await fetch(
        `${backendUrl}/api/v1/attendance/clock-in?email=${encodeURIComponent(employee.email)}`,
        {
          method: 'POST',
          headers: getAuthHeaders(),
        }
      );

      const data = await response.json();

      if (data.success) {
        setAttendance(data.data);
        // Refresh attendance data
        await fetchTodayAttendance(employee.email);
      } else {
        setError(data.message || 'Failed to clock in');
        if (data.data) {
          setAttendance(data.data);
        }
      }
    } catch (err) {
      console.error('Error clocking in:', err);
      setError('Failed to clock in. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  // Fetch attendance history
  const fetchAttendanceHistory = useCallback(async (email: string) => {
    try {
      setHistoryLoading(true);
      const backendUrl = getBackendUrl();
      const response = await fetch(
        `${backendUrl}/api/v1/attendance?email=${encodeURIComponent(email)}`,
        {
          method: 'GET',
          headers: getAuthHeaders(),
        }
      );

      const data = await response.json();

      if (data.success && data.data && Array.isArray(data.data)) {
        setAttendanceHistory(data.data);
      } else {
        setAttendanceHistory([]);
      }
    } catch (err) {
      console.error('Error fetching attendance history:', err);
      setAttendanceHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  // Handle History button click
  const handleHistoryClick = async () => {
    if (!employee?.email) {
      setError('Employee email not found');
      return;
    }
    setShowHistory(true);
    await fetchAttendanceHistory(employee.email);
  };

  // Clock Out
  const handleClockOut = async () => {
    if (!employee?.email) {
      setError('Employee email not found');
      return;
    }

    setActionLoading(true);
    setError(null);

    try {
      const backendUrl = getBackendUrl();
      const response = await fetch(
        `${backendUrl}/api/v1/attendance/clock-out?email=${encodeURIComponent(employee.email)}`,
        {
          method: 'PUT',
          headers: getAuthHeaders(),
        }
      );

      const data = await response.json();

      if (data.success) {
        setAttendance(data.data);
        // Refresh attendance data
        await fetchTodayAttendance(employee.email);
      } else {
        setError(data.message || 'Failed to clock out');
      }
    } catch (err) {
      console.error('Error clocking out:', err);
      setError('Failed to clock out. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  // Initialize data
  useEffect(() => {
    const initialize = async () => {
      setLoading(true);
      const email = getUserEmail();
      
      if (!email) {
        setError('User email not found. Please log in again.');
        setLoading(false);
        return;
      }

      try {
        await Promise.all([
          fetchEmployeeInfo(email),
          fetchOfficeTime(),
          fetchTodayAttendance(email),
        ]);
      } catch (err) {
        console.error('Error initializing:', err);
        setError('Failed to load attendance data');
      } finally {
        setLoading(false);
      }
    };

    initialize();
  }, [fetchEmployeeInfo, fetchOfficeTime, fetchTodayAttendance]);

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
      
      // Update work hours if clocked in but not out
      if (attendance?.clockIn && !attendance?.clockOut) {
        const workHours = calculateWorkHours(attendance.clockIn);
        setAttendance(prev => prev ? { ...prev, workHours } : null);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [attendance]);

  // Format time with spaces (e.g., "15 : 32 : 42")
  const formatTime = (date: Date): string => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    return `${hours} : ${minutes} : ${seconds}`;
  };

  // Format date
  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Format time from ISO string
  const formatTimeFromISO = (isoString?: string): string => {
    if (!isoString) return 'Not clocked in';
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return 'Invalid time';
    }
  };

  // Format work hours to "X hours Y minutes" format
  const formatWorkHours = (hours: number): string => {
    if (hours === 0) return '0 hours 0 minutes';
    
    const wholeHours = Math.floor(hours);
    const decimalPart = hours - wholeHours;
    const minutes = Math.round(decimalPart * 60);
    
    if (wholeHours === 0) {
      return `${minutes} minutes`;
    } else if (minutes === 0) {
      return `${wholeHours} ${wholeHours === 1 ? 'hour' : 'hours'}`;
    } else {
      return `${wholeHours} ${wholeHours === 1 ? 'hour' : 'hours'} ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
    }
  };

  // Get status badge
  const getStatusBadge = (status?: string) => {
    if (!status) return null;
    
    const statusLower = status.toLowerCase();
    if (statusLower === 'present' || statusLower === 'on-time') {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
          {status}
        </span>
      );
    } else if (statusLower === 'late') {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300">
          {status}
        </span>
      );
    } else if (statusLower === 'absent') {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300">
          {status}
        </span>
      );
    }
    
    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300">
        {status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading attendance data...</p>
        </div>
      </div>
    );
  }

  const workHours = attendance?.clockIn 
    ? calculateWorkHours(attendance.clockIn, attendance.clockOut)
    : 0;

  // Button state logic:
  // - Not clocked in: Clock In enabled, Clock Out disabled
  // - Clocked in but not clocked out: Clock In disabled, Clock Out enabled
  // - Both clocked in and clocked out: Both disabled
  const hasClockIn = !!attendance?.clockIn;
  const hasClockOut = !!attendance?.clockOut;
  const canClockIn = !hasClockIn || (hasClockIn && hasClockOut);
  const canClockOut = hasClockIn && !hasClockOut;
  const bothDisabled = hasClockIn && hasClockOut;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 lg:p-8">
      <DashboardHeader
        title="Attendance Tracker"
        subtitle="Track your daily attendance"
        icon={Clock}
        iconColor="text-white"
        hideTenantPrefix={true}
      />

      <div className="max-w-7xl mx-auto mt-8 space-y-6">
        {/* Time and Date Display Card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 lg:p-8 border border-gray-200 dark:border-gray-700">
          <div className="text-center">
            <div className="text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white mb-2">
              {formatTime(currentTime)}
            </div>
            <div className="text-lg lg:text-xl text-gray-600 dark:text-gray-400">
              {formatDate(currentTime)}
            </div>
          </div>
          
          {/* Clock In/Out Buttons Below Clock */}
          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
            {/* Clock In Button */}
            <button
              onClick={handleClockIn}
              disabled={!canClockIn || actionLoading || bothDisabled}
              className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
                canClockIn && !bothDisabled
                  ? 'bg-green-600 hover:bg-green-700 text-white cursor-pointer'
                  : 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
              } ${actionLoading ? 'opacity-50' : ''}`}
            >
              <Clock className="w-5 h-5" />
              {actionLoading && canClockIn ? 'Processing...' : 'Clock In'}
            </button>

            {/* Clock Out Button */}
            <button
              onClick={handleClockOut}
              disabled={!canClockOut || actionLoading || bothDisabled}
              className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
                canClockOut && !bothDisabled
                  ? 'bg-red-600 hover:bg-red-700 text-white cursor-pointer'
                  : 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
              } ${actionLoading ? 'opacity-50' : ''}`}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              {actionLoading && canClockOut ? 'Processing...' : 'Clock Out'}
            </button>

            {/* History Button */}
            <button
              onClick={handleHistoryClick}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              History
            </button>
          </div>
        </div>

        {/* Employee Information and Today's Attendance */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Employee Information Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Employee Information</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Employee Code</p>
                <p className="text-base font-medium text-gray-900 dark:text-white">
                  {employee?.emp_id || 'N/A'}
                </p>
              </div>
              
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Full Name</p>
                <p className="text-base font-medium text-gray-900 dark:text-white">
                  {employee?.full_name || 'N/A'}
                </p>
              </div>
              
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Department</p>
                <p className="text-base font-medium text-gray-900 dark:text-white">
                  {employee?.department || 'N/A'}
                </p>
              </div>
              
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Designation</p>
                <p className="text-base font-medium text-gray-900 dark:text-white">
                  Software Engineer
                </p>
              </div>
            </div>
          </div>

          {/* Today's Attendance Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Today&apos;s Attendance</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Clock In</p>
                <p className="text-base font-medium text-gray-900 dark:text-white">
                  {formatTimeFromISO(attendance?.clockIn)}
                </p>
                {attendance?.lateBy && attendance.lateByMinutes && attendance.lateByMinutes > 0 && (
                  <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                    Late By {attendance.lateBy}
                  </p>
                )}
              </div>
              
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Clock Out</p>
                <p className="text-base font-medium text-gray-900 dark:text-white">
                  {formatTimeFromISO(attendance?.clockOut) || 'Not clocked out'}
                </p>
                {/* Show early clock-out time */}
                {attendance?.earlyBy && attendance.earlyByMinutes && attendance.earlyByMinutes > 0 && (
                  <p className="text-sm text-orange-600 dark:text-orange-400 mt-1">
                    Early By {attendance.earlyBy}
                  </p>
                )}
                {/* Show overtime clock-out time (only if clocked out after office end time) */}
                {attendance?.overTime && attendance.overTimeMinutes && attendance.overTimeMinutes > 0 && (
                  <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                    Overtime {attendance.overTime}
                  </p>
                )}
              </div>
              
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Work Hours</p>
                <p className="text-base font-medium text-gray-900 dark:text-white">
                  {formatWorkHours(workHours)}
                </p>
              </div>
              
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Status</p>
                <div className="mt-1">
                  {getStatusBadge(attendance?.clockInStatus || (attendance?.clockIn ? 'present' : undefined))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
          </div>
        )}

        {/* Attendance History Modal */}
        {showHistory && (
          <div className="fixed inset-0 bg-black/10 dark:bg-black/20 flex items-center justify-center z-50 p-4 backdrop-blur-md">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden border border-gray-200 dark:border-gray-700">
              {/* Modal Header */}
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Attendance History</h2>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={async () => {
                        if (employee?.email) {
                          await fetchAttendanceHistory(employee.email);
                        }
                      }}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      title="Refresh data"
                    >
                      <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setShowHistory(false)}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              {/* Modal Content */}
              <div className="p-6 overflow-y-auto max-h-[60vh]">
                {historyLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : attendanceHistory.length > 0 ? (
                  <div className="space-y-4">
                    {attendanceHistory.map((record, index) => (
                      <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-3">
                            <div className={`w-3 h-3 rounded-full ${
                              record.clockInStatus === 'late' ? 'bg-orange-500' :
                              record.clockInStatus === 'on-time' ? 'bg-green-500' :
                              'bg-gray-400'
                            }`}></div>
                            <span className="font-medium text-gray-900 dark:text-white">{record.date}</span>
                            {record.clockInStatus && (
                              <span className={`text-sm px-2 py-1 rounded-full ${
                                record.clockInStatus === 'late' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300' :
                                record.clockInStatus === 'on-time' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' :
                                'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                              }`}>
                                {record.clockInStatus}
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {record.workHours ? formatWorkHours(record.workHours) : '0 hours 0 minutes'}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Clock In:</span>
                            <div className="font-medium text-gray-900 dark:text-white">{formatTimeFromISO(record.clockIn) || 'N/A'}</div>
                            {record.lateBy && record.lateByMinutes && record.lateByMinutes > 0 && (
                              <div className="text-xs text-red-600 dark:text-red-400 mt-1">Late By {record.lateBy}</div>
                            )}
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Clock Out:</span>
                            <div className="font-medium text-gray-900 dark:text-white">{formatTimeFromISO(record.clockOut) || 'N/A'}</div>
                            {record.earlyBy && record.earlyByMinutes && record.earlyByMinutes > 0 && (
                              <div className="text-xs text-orange-600 dark:text-orange-400 mt-1">Early By {record.earlyBy}</div>
                            )}
                            {record.overTime && record.overTimeMinutes && record.overTimeMinutes > 0 && (
                              <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">Overtime {record.overTime}</div>
                            )}
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Work Hours:</span>
                            <div className="font-medium text-gray-900 dark:text-white">{record.workHours ? formatWorkHours(record.workHours) : '0 hours 0 minutes'}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <svg className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-gray-500 dark:text-gray-400">No attendance history found</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

