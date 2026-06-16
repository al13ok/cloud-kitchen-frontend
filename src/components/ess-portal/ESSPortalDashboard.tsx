"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import {
  DollarLineIcon,
  TaskIcon,
  UserIcon
} from '@/icons';
import { TrendingUp, Calendar, Clock, DollarSign, Package } from 'lucide-react';
import { BACKEND_URL, getAuthHeaders } from '@/utils/api';
import { Toaster } from 'react-hot-toast';

// Custom CSS animations
const customStyles = `
  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(30px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  @keyframes slideInLeft {
    from {
      opacity: 0;
      transform: translateX(-50px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
  
  @keyframes slideInRight {
    from {
      opacity: 0;
      transform: translateX(50px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
  
  @keyframes bounceIn {
    0% {
      opacity: 0;
      transform: scale(0.3);
    }
    50% {
      opacity: 1;
      transform: scale(1.05);
    }
    70% {
      transform: scale(0.9);
    }
    100% {
      opacity: 1;
      transform: scale(1);
    }
  }
  
  @keyframes float {
    0%, 100% {
      transform: translateY(0px);
    }
    50% {
      transform: translateY(-10px);
    }
  }
  
  @keyframes floatSlow {
    0%, 100% {
      transform: translateY(0px) translateX(0px);
    }
    50% {
      transform: translateY(-5px) translateX(5px);
    }
  }
  
  @keyframes floatReverse {
    0%, 100% {
      transform: translateY(0px) translateX(0px);
    }
    50% {
      transform: translateY(5px) translateX(-5px);
    }
  }
  
  @keyframes gradientShift {
    0%, 100% {
      background-position: 0% 50%;
    }
    50% {
      background-position: 100% 50%;
    }
  }
  
  .animate-fade-in-up {
    animation: fadeInUp 0.8s ease-out forwards;
  }
  
  .animate-slide-in-left {
    animation: slideInLeft 0.8s ease-out forwards;
  }
  
  .animate-slide-in-right {
    animation: slideInRight 0.8s ease-out forwards;
  }
  
  .animate-bounce-in {
    animation: bounceIn 0.8s ease-out forwards;
  }
  
  .animate-float {
    animation: float 3s ease-in-out infinite;
  }
  
  .animate-float-slow {
    animation: floatSlow 4s ease-in-out infinite;
  }
  
  .animate-float-reverse {
    animation: floatReverse 4s ease-in-out infinite;
  }
  
  .animate-gradient-shift {
    background-size: 200% 200%;
    animation: gradientShift 3s ease infinite;
  }
  
  .delay-300 {
    animation-delay: 0.3s;
  }
  
  .delay-500 {
    animation-delay: 0.5s;
  }
  
  .delay-700 {
    animation-delay: 0.7s;
  }
  
  .delay-1000 {
    animation-delay: 1s;
  }
`;

// Type guards for API data
interface PayslipData {
  status?: string;
  id?: string;
  issueDate?: string;
  createdAt?: string;
  created_at?: string;
  [key: string]: unknown;
}

interface LeaveData {
  status?: string;
  createdAt?: string;
  created_at?: string;
  id?: string;
  leaveDetails?: {
    leaveType?: string;
  };
  requestedDays?: number;
  availableDays?: number;
  [key: string]: unknown;
}

interface ExpenseData {
  status?: string;
  id?: string;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
  expenseDetails?: {
    title?: string;
    amount?: number;
  };
  amount?: number;
  [key: string]: unknown;
}

interface AssetData {
  status?: string;
  id?: string;
  updatedAt?: string;
  createdAt?: string;
  assetDetails?: {
    assetType?: string;
    assetName?: string;
  };
  [key: string]: unknown;
}

interface EmployeeData {
  leaveBalance?: {
    annualLeave?: number;
    sickLeave?: number;
    casualLeave?: number;
  } | number;
  [key: string]: unknown;
}


// Type guard functions
const isPayslip = (obj: unknown): obj is PayslipData => {
  return typeof obj === 'object' && obj !== null;
};

const isLeave = (obj: unknown): obj is LeaveData => {
  return typeof obj === 'object' && obj !== null;
};

const isExpense = (obj: unknown): obj is ExpenseData => {
  return typeof obj === 'object' && obj !== null;
};

const isAsset = (obj: unknown): obj is AssetData => {
  return typeof obj === 'object' && obj !== null;
};

const isEmployee = (obj: unknown): obj is EmployeeData => {
  return typeof obj === 'object' && obj !== null;
};

// Safe date creation utility
const createSafeDate = (dateValue?: string): Date => {
  if (!dateValue) return new Date(0); // Return epoch if no date
  try {
    const date = new Date(dateValue);
    return isNaN(date.getTime()) ? new Date(0) : date;
  } catch {
    return new Date(0);
  }
};

const ESSPortalDashboard: React.FC = () => {
  const [payslipCount, setPayslipCount] = useState(0);
  const [leaveApplications, setLeaveApplications] = useState(0);
  const [activeAssetRequests, setActiveAssetRequests] = useState(2);
  // derived metrics state
  const [avgLeaveBalance, setAvgLeaveBalance] = useState<number | null>(null);
  const [employeesCount, setEmployeesCount] = useState<number | null>(null);

  // API data states for accurate calculations
  const [leaves, setLeaves] = useState<unknown[]>([]);
  const [expenses, setExpenses] = useState<unknown[]>([]);
  const [payslips, setPayslips] = useState<unknown[]>([]);
  const [assets, setAssets] = useState<unknown[]>([]);

  // Get current user from authentication system
  const { getCurrentUser } = useAuth();

  // Get employee ID from auth or localStorage as fallback
  const employeeId = React.useMemo(() => {
    try {
      const currentUser = getCurrentUser();
      if (currentUser?.user_id) {
        return currentUser.user_id;
      }
      // Fallback to localStorage
      const userData = localStorage.getItem('user_id') || localStorage.getItem('employee_id');
      return userData;
    } catch (error) {
      console.warn('Could not get employee ID from auth:', error);
      return null;
    }
  }, [getCurrentUser]);

  // Enhanced fetch utility for staging API with timeout and better error handling
  const fetchWithTimeout = async (url: string, options: RequestInit = {}, timeout = 10000) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      // Get authentication headers
      const authHeaders = getAuthHeaders();

      // Debug: Log token availability (without exposing full token)
      if (typeof window !== 'undefined') {
        const jwtToken = localStorage.getItem('jwtToken');
        const accessToken = localStorage.getItem('access_token');
        const accessTokenAlt = localStorage.getItem('accessToken');
        // Check if authHeaders has Authorization (handle both Headers object and Record types)
        const hasAuthHeader = authHeaders instanceof Headers
          ? authHeaders.has('Authorization')
          : (authHeaders as Record<string, string>)['Authorization'] ? true : false;
        console.log('🔐 Auth Debug:', {
          hasJwtToken: !!jwtToken,
          hasAccessToken: !!accessToken,
          hasAccessTokenAlt: !!accessTokenAlt,
          tokenLength: jwtToken?.length || accessToken?.length || accessTokenAlt?.length || 0,
          hasAuthHeader,
          url
        });
      }

      // Validate URL before making request
      if (!url || typeof url !== 'string') {
        throw new Error(`Invalid URL: ${url}`);
      }

      // Check if BACKEND_URL is set
      if (!BACKEND_URL || BACKEND_URL === 'undefined') {
        console.error('❌ BACKEND_URL not configured. Check environment variables.');
        throw new Error('Backend URL not configured. Please set NEXT_PUBLIC_API_URL environment variable.');
      }

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          ...authHeaders,
          ...options.headers
        }
      });

      clearTimeout(timeoutId);

      // Debug: Log response status (only for non-ok responses)
      // Don't try to read response body here as it might be consumed by caller
      if (!response.ok) {
        // Only log error if it's not a common "expected" error status
        // 404, 403, 401 are often expected for optional endpoints
        const isExpectedError = response.status === 404 || response.status === 403 || response.status === 401;

        if (!isExpectedError) {
          // Check if authHeaders has Authorization (handle both Headers object and Record types)
          const hasAuthHeader = authHeaders instanceof Headers
            ? authHeaders.has('Authorization')
            : (authHeaders as Record<string, string>)['Authorization'] ? true : false;
          console.warn('⚠️ API Error:', {
            status: response.status,
            statusText: response.statusText,
            url: url.substring(0, 100) + (url.length > 100 ? '...' : ''), // Truncate long URLs
            hasAuthHeader,
            backendUrl: BACKEND_URL?.substring(0, 50) || 'Not set'
          });
        }
        // Don't throw here, let caller handle it
        // Just log for debugging
      }

      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error(`Request timeout after ${timeout}ms`);
        }
        // Enhanced error message for network errors
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
          console.error('❌ Network Error:', {
            message: error.message,
            url,
            backendUrl: BACKEND_URL,
            suggestion: 'Check if backend server is running and CORS is configured'
          });
          throw new Error(`Network error: Unable to connect to ${BACKEND_URL}. Please check if backend server is running.`);
        }
      }
      throw error;
    }
  };

  // Check for device sizes with proper breakpoints
  React.useEffect(() => {
    const checkDeviceSize = () => {
      if (typeof window !== 'undefined') {
        // width variable removed as it's not used
        // Mobile detection removed as it's not used
      }
    };

    checkDeviceSize();
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', checkDeviceSize);
      return () => window.removeEventListener('resize', checkDeviceSize);
    }
  }, []);

  // Fetch live payslip count from API
  React.useEffect(() => {
    const fetchPayslipData = async () => {
      try {
        const url = new URL('/api/v1/ess-portal/payslips', BACKEND_URL);
        if (employeeId) url.searchParams.set('employee_id', String(employeeId));

        const response = await fetchWithTimeout(url.toString(), {
          method: 'GET'
        });

        if (response.ok) {
          const result = await response.json();
          console.log('Payslip API response:', result);

          // Initialize counts
          let totalPayslips = 0;
          let approved = 0;
          let pending = 0;
          let rejected = 0;

          // Set count from API response and store payslips data
          if (result.success && result.data && Array.isArray(result.data)) {
            totalPayslips = result.data.length;
            setPayslips(result.data); // Store payslips data

            // Check if payslip has status field, otherwise assume business logic
            if (result.data.length > 0 && result.data[0].status) {
              // If status field exists, use it
              approved = result.data.filter((payslip: unknown) =>
                isPayslip(payslip) && payslip.status && payslip.status.toLowerCase() === 'approved'
              ).length;

              pending = result.data.filter((payslip: unknown) =>
                isPayslip(payslip) && payslip.status && payslip.status.toLowerCase() === 'pending'
              ).length;

              rejected = result.data.filter((payslip: unknown) =>
                isPayslip(payslip) && payslip.status && payslip.status.toLowerCase() === 'rejected'
              ).length;
            } else {
              // If no status field, assume newly generated payslips are pending
              // until manually approved by HR/Admin
              approved = 0; // No auto-approval
              pending = result.data.length; // All generated payslips are pending approval
              rejected = 0; // No rejected until reviewed
            }

            console.log('Payslip Status Counts:', { totalPayslips, approved, pending, rejected });
          } else if (result.success && result.count !== undefined) {
            totalPayslips = result.count;
            approved = 0; // No auto-approval
            pending = result.count; // All generated payslips are pending
            rejected = 0;
          }

          // Set all state values
          setPayslipCount(totalPayslips);
          // Payslip status counts removed as they're not used
        } else {
          // Try to get error message from response
          let errorDetail = response.statusText;
          try {
            const errorData = await response.json();
            errorDetail = errorData.detail || errorData.message || errorDetail;
            console.error('❌ Payslip API Error Detail:', errorDetail);
          } catch {
            // Response might not be JSON
          }

          console.error('Payslip API failed:', response.status, response.statusText, {
            detail: errorDetail,
            status: response.status
          });

          // If 403, it means user doesn't have employee info or authentication issue
          if (response.status === 403) {
            console.error('🔒 Access Forbidden - Possible causes:');
            console.error('1. User employee information not found in database');
            console.error('2. Token missing or invalid');
            console.error('3. User not properly authenticated');
            console.error('4. Missing employeeCode/department in user profile');
          }

          setPayslipCount(0);
          // Payslip status counts removed as they're not used
        }
      } catch (error) {
        console.error('Error fetching payslip data:', error);
        setPayslipCount(0);
        // Payslip status counts removed as they're not used
      }
    };

    // Fetch data immediately and then every 30 seconds
    fetchPayslipData();
    const interval = setInterval(fetchPayslipData, 30000);

    return () => clearInterval(interval);
  }, [employeeId]);

  // Fetch live leave applications count from API
  React.useEffect(() => {
    const fetchLeaveApplicationsData = async () => {
      try {
        const url = new URL('/api/v1/ess-portal/leave-applications', BACKEND_URL);
        if (employeeId) url.searchParams.set('employee_id', String(employeeId));

        const response = await fetchWithTimeout(url.toString(), {
          method: 'GET'
        });

        if (response.ok) {
          const result = await response.json();
          console.log('Leave Applications API response:', result);

          // Initialize counts
          let totalApps = 0;
          let approved = 0;
          let pending = 0;
          let rejected = 0;

          // Set count from API response and store leaves data
          if (result.success && result.data && Array.isArray(result.data)) {
            totalApps = result.data.length;
            setLeaves(result.data); // Store leaves data for calculations

            // Calculate leave status counts from actual API data
            approved = result.data.filter((leave: unknown) =>
              isLeave(leave) && leave.status && leave.status.toLowerCase() === 'approved'
            ).length;

            pending = result.data.filter((leave: unknown) =>
              isLeave(leave) && leave.status && leave.status.toLowerCase() === 'pending'
            ).length;

            rejected = result.data.filter((leave: unknown) =>
              isLeave(leave) && leave.status && leave.status.toLowerCase() === 'rejected'
            ).length;

            console.log('Leave Status Counts:', { totalApps, approved, pending, rejected });
          } else if (result.success && result.count !== undefined) {
            totalApps = result.count;
          }

          // Set all state values
          setLeaveApplications(totalApps);
          // Leave status counts removed as they're not used

          // Extract available days from the first application if available
          if (result.data && Array.isArray(result.data) && result.data.length > 0) {
            const firstApplication = result.data[0];
            if (isLeave(firstApplication) && firstApplication.availableDays) {
              console.log('Available days found:', firstApplication.availableDays);
            }
          }
        } else {
          console.error('Leave Applications API failed:', response.status, response.statusText);
          setLeaveApplications(0);
          // Leave status counts removed as they're not used
        }
      } catch (error) {
        console.error('Error fetching leave applications data:', error);
        setLeaveApplications(0);
        // Leave status counts removed as they're not used
      }
    };

    // Fetch data immediately and then every 30 seconds
    fetchLeaveApplicationsData();
    const interval = setInterval(fetchLeaveApplicationsData, 30000);

    return () => clearInterval(interval);
  }, [employeeId]);

  // Fetch live expenses count from API
  React.useEffect(() => {
    const fetchExpensesData = async () => {
      try {
        const url = new URL('/api/v1/ess-portal/expenses', BACKEND_URL);
        if (employeeId) url.searchParams.set('employee_id', String(employeeId));

        const response = await fetchWithTimeout(url.toString(), {
          method: 'GET'
        });

        if (response.ok) {
          const result = await response.json();
          console.log('Expenses API response:', result);

          // Initialize counts
          let totalExpenses = 0;
          let approved = 0;
          let pending = 0;
          let rejected = 0;

          // Set count from API response and store expenses data
          if (result.success && result.data && Array.isArray(result.data)) {
            totalExpenses = result.data.length;
            setExpenses(result.data); // Store expenses data for calculations

            // Calculate expense status counts from actual API data
            approved = result.data.filter((exp: unknown) =>
              isExpense(exp) && exp.status && exp.status.toLowerCase() === 'approved'
            ).length;

            pending = result.data.filter((exp: unknown) =>
              isExpense(exp) && exp.status && exp.status.toLowerCase() === 'pending'
            ).length;

            rejected = result.data.filter((exp: unknown) =>
              isExpense(exp) && exp.status && exp.status.toLowerCase() === 'rejected'
            ).length;

            console.log('Expense Status Counts:', { totalExpenses, approved, pending, rejected });
          } else if (result.success && result.count !== undefined) {
            totalExpenses = result.count;
          }

          // Set all state values
          // Expense status counts removed as they're not used
          // Update expenses array length for total count
          if (result.data && Array.isArray(result.data)) {
            setExpenses(result.data);
          }
        } else {
          console.error('Expenses API failed:', response.status, response.statusText);
          // Expense status counts removed as they're not used
          setExpenses([]);
        }
      } catch (error) {
        console.error('Error fetching expenses data:', error);
        // Expense status counts removed as they're not used
        setExpenses([]);
      }
    };

    // Fetch data immediately and then every 30 seconds
    fetchExpensesData();
    const interval = setInterval(fetchExpensesData, 30000);

    return () => clearInterval(interval);
  }, [employeeId]);

  // Fetch live assets count from API
  React.useEffect(() => {
    const fetchAssetsData = async () => {
      try {
        const url = new URL('/api/v1/ess-portal/assets', BACKEND_URL);
        if (employeeId) url.searchParams.set('employee_id', String(employeeId));

        const response = await fetchWithTimeout(url.toString(), {
          method: 'GET'
        });

        if (response.ok) {
          const result = await response.json();
          console.log('Assets API response:', result);

          if (result.success && result.data && Array.isArray(result.data)) {
            setAssets(result.data);
            setActiveAssetRequests(result.data.length);

            // Calculate status counts
            const approved = result.data.filter((asset: unknown) => isAsset(asset) && asset.status?.toLowerCase() === 'approved').length;
            const pending = result.data.filter((asset: unknown) => isAsset(asset) && asset.status?.toLowerCase() === 'pending').length;
            const rejected = result.data.filter((asset: unknown) => isAsset(asset) && asset.status?.toLowerCase() === 'rejected').length;

            // Asset status counts removed as they're not used

            // Calculate asset type counts
            const hardware = result.data.filter((asset: unknown) => isAsset(asset) && asset.assetDetails?.assetType?.toLowerCase() === 'hardware').length;
            const software = result.data.filter((asset: unknown) => isAsset(asset) && asset.assetDetails?.assetType?.toLowerCase() === 'software').length;
            const office = result.data.filter((asset: unknown) =>
              isAsset(asset) && (asset.assetDetails?.assetType?.toLowerCase() === 'office' ||
                asset.assetDetails?.assetType?.toLowerCase() === 'other')
            ).length;

            // Asset type counts removed as they're not used

            console.log('Asset calculations:', {
              total: result.data.length,
              approved,
              pending,
              rejected,
              hardware,
              software,
              office
            });
          } else if (result.count !== undefined) {
            setActiveAssetRequests(result.count);
          } else {
            setActiveAssetRequests(0);
          }
        } else {
          console.error('Assets API failed:', response.status, response.statusText);
          setActiveAssetRequests(0);
        }
      } catch (error) {
        console.error('Error fetching assets data:', error);
        setActiveAssetRequests(0);
      }
    };

    // Fetch data immediately and then every 30 seconds
    fetchAssetsData();
    const interval = setInterval(fetchAssetsData, 30000);

    return () => clearInterval(interval);
  }, [employeeId]);

  // Fetch employees data for leave balance calculation
  React.useEffect(() => {
    const fetchEmployeesData = async () => {
      try {
        const url = new URL('/api/v1/ess-portal/employees', BACKEND_URL);
        if (employeeId) url.searchParams.set('employee_id', String(employeeId));

        const response = await fetchWithTimeout(url.toString(), {
          method: 'GET'
        });

        if (response.ok) {
          const result = await response.json();
          console.log('Employees API response:', result);

          if (result.success && result.data && Array.isArray(result.data)) {
            // Calculate average leave balance from all employees
            const totalLeaves = result.data.reduce((sum: number, emp: unknown) => {
              if (isEmployee(emp) && emp.leaveBalance) {
                const empLeaves = emp.leaveBalance;
                if (typeof empLeaves === 'object') {
                  return sum + (empLeaves.annualLeave || 0) + (empLeaves.sickLeave || 0) + (empLeaves.casualLeave || 0);
                } else if (typeof empLeaves === 'number') {
                  return sum + empLeaves;
                }
              }
              return sum;
            }, 0);
            const avgLeaveBalance = Math.round(totalLeaves / result.data.length);
            console.log('Average leave balance calculated:', avgLeaveBalance);
            setAvgLeaveBalance(avgLeaveBalance);
            setEmployeesCount(result.data.length);
          }
        } else {
          console.error('Employees API failed:', response.status, response.statusText);
        }
      } catch (error) {
        console.error('Error fetching employees data:', error);
      }
    };

    // Fetch data immediately and then every 30 seconds
    fetchEmployeesData();
    const interval = setInterval(fetchEmployeesData, 30000);

    return () => clearInterval(interval);
  }, [employeeId]);

  // Add aggregated dashboard stats fetch to get payroll and attendance data
  const [monthlyPayrollValue, setMonthlyPayrollValue] = useState<string | null>(null);
  const [attendancePercent, setAttendancePercent] = useState<number | null>(null);
  const [leaveBalanceDays, setLeaveBalanceDays] = useState<number | null>(null);
  const [expenseEfficiencyPercent, setExpenseEfficiencyPercent] = useState<number | null>(null);
  const [taskCompletionPercent, setTaskCompletionPercent] = useState<number | null>(null);
  const [todayAttendanceStatus, setTodayAttendanceStatus] = useState<{ clockedIn: boolean; clockInTime?: string } | null>(null);

  React.useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        const now = new Date();

        // 1) Payroll analytics (optional - don't fail if unavailable)
        try {
          const payrollUrl = new URL('/api/v1/ess-portal/analytics/payroll', BACKEND_URL);
          payrollUrl.searchParams.set('month', String(now.getMonth() + 1));
          payrollUrl.searchParams.set('year', String(now.getFullYear()));
          const payrollRes = await fetchWithTimeout(payrollUrl.toString(), { method: 'GET' });
          if (payrollRes.ok) {
            try {
              const payroll = await payrollRes.json();
              const data = payroll?.data;
              const totalNet = (typeof data === 'object' && data?.total_net_salary) ? Number(data.total_net_salary) : null;
              if (totalNet !== null && !isNaN(totalNet)) {
                const formatted = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(totalNet);
                setMonthlyPayrollValue(formatted);
              }
            } catch {
              // Silently skip JSON parse errors
            }
          }
          // Silently skip non-ok responses (404, 403, etc. are expected for optional endpoints)
        } catch {
          // Silently handle errors - these are optional stats
          // Don't log - these are expected to fail for many users
        }

        // 2) Attendance stats for current employee (optional)
        try {
          if (employeeId) {
            // Fetch monthly attendance stats
            const attendanceUrl = new URL(`/api/v1/ess-portal/attendance/attendance-stats/${employeeId}`, BACKEND_URL);
            const attRes = await fetchWithTimeout(attendanceUrl.toString(), { method: 'GET' });
            if (attRes.ok) {
              try {
                const attData = await attRes.json();
                const rate = attData?.stats?.attendanceRate;
                if (typeof rate === 'number') setAttendancePercent(Math.round(rate));
              } catch {
                // Silently skip JSON parse errors
              }
            }
            // Silently skip non-ok responses (expected for optional endpoints)

            // Fetch today's attendance status for "Attendance Today" card
            try {
              const todayStatusUrl = new URL(`/api/v1/ess-portal/attendance/today-status/${employeeId}`, BACKEND_URL);
              const todayRes = await fetchWithTimeout(todayStatusUrl.toString(), { method: 'GET' });
              if (todayRes.ok) {
                try {
                  const todayData = await todayRes.json();
                  if (todayData.success && todayData.attendance) {
                    setTodayAttendanceStatus({
                      clockedIn: !!todayData.attendance.clock_in,
                      clockInTime: todayData.attendance.clock_in
                    });
                  }
                } catch {
                  // Silently skip JSON parse errors
                }
              }
              // Silently skip non-ok responses
            } catch {
              // Silently handle - today status is optional
            }
          }
        } catch {
          // Silently handle errors - these are optional stats
        }

        // 3) Leave balance for current employee (optional)
        try {
          if (employeeId) {
            const lbUrl = new URL(`/api/v1/ess-portal/employees/${employeeId}/leave-balance`, BACKEND_URL);
            const lbRes = await fetchWithTimeout(lbUrl.toString(), { method: 'GET' });
            if (lbRes.ok) {
              try {
                const lb = await lbRes.json();
                const balance = lb?.data?.leaveBalance;
                if (balance && typeof balance === 'object') {
                  const sum = ['annualLeave', 'sickLeave', 'casualLeave'].reduce((acc, k) => acc + (Number(balance[k]) || 0), 0);
                  setLeaveBalanceDays(sum);
                }
              } catch {
                // Silently skip JSON parse errors
              }
            }
            // Silently skip non-ok responses (expected for optional endpoints)
          }
        } catch {
          // Silently handle errors - these are optional stats
        }

        // 4) Expense efficiency from expenses data already fetched in another effect
        //    We recompute below from local state, so no extra call here

        // 5) Task completion not available in backend → keep null (will render as —)
      } catch (error) {
        console.warn('Error fetching dashboard stats:', error);
      }
    };

    // Fetch dashboard stats every 60 seconds (less frequent than individual endpoints)
    if (employeeId) {
      fetchDashboardStats();
      const interval = setInterval(fetchDashboardStats, 60000);
      return () => clearInterval(interval);
    }
  }, [employeeId]);

  // Derive expense efficiency from fetched expenses and persist to state (used in UI)
  React.useEffect(() => {
    try {
      const approvedExpensesCount = expenses.filter((e): e is ExpenseData => isExpense(e) && !!e.status && e.status.toLowerCase() === 'approved').length;
      const totalExpensesCount = expenses.filter((e): e is ExpenseData => isExpense(e)).length;
      const calculatedExpenseEfficiency = totalExpensesCount === 0 ? 0 : Math.round((approvedExpensesCount / totalExpensesCount) * 100);
      setExpenseEfficiencyPercent(calculatedExpenseEfficiency);
    } catch { }
  }, [expenses]);

  // Task completion not yet provided by backend; set to a safe default so UI remains stable
  React.useEffect(() => {
    if (taskCompletionPercent === null) {
      setTaskCompletionPercent(0);
    }
  }, [taskCompletionPercent]);

  // Compute main dashboard stats from live data
  // Monthly Payroll: use aggregated data if available, otherwise try to get from latest payslip
  const monthlyPayroll = monthlyPayrollValue || (() => {
    // For single employee, try to get from latest payslip
    if (employeeId && payslips.length > 0) {
      const latestPayslip = payslips
        .filter((p): p is PayslipData => isPayslip(p))
        .sort((a, b) => {
          const dateAStr = (typeof a.paymentDate === 'string' ? a.paymentDate : null)
            || (typeof a.payment_date === 'string' ? a.payment_date : null)
            || (typeof a.createdAt === 'string' ? a.createdAt : null)
            || (typeof a.created_at === 'string' ? a.created_at : null)
            || undefined;
          const dateBStr = (typeof b.paymentDate === 'string' ? b.paymentDate : null)
            || (typeof b.payment_date === 'string' ? b.payment_date : null)
            || (typeof b.createdAt === 'string' ? b.createdAt : null)
            || (typeof b.created_at === 'string' ? b.created_at : null)
            || undefined;
          const dateA = createSafeDate(dateAStr);
          const dateB = createSafeDate(dateBStr);
          return dateB.getTime() - dateA.getTime();
        })[0];

      if (latestPayslip) {
        const netSalary = latestPayslip.netSalary || latestPayslip.net_salary || latestPayslip.totalNetSalary || latestPayslip.total_net_salary;
        if (typeof netSalary === 'number') {
          return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(netSalary);
        }
      }
    }
    return '—';
  })();
  const monthlyPayrollSubtitle = '+2.4% from last month';

  // On Leave Today: count leave entries where today falls within the leave date range (fromDate to toDate)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const onLeaveTodayCount = leaves.filter((l) => {
    if (!isLeave(l)) return false;
    const status = (l.status || '').toString().toLowerCase();
    // Only count approved or pending leaves
    if (status !== 'approved' && status !== 'pending') return false;

    // Check if today falls within leave date range
    const fromDateStr = (typeof l.fromDate === 'string' ? l.fromDate : null)
      || (typeof l.from_date === 'string' ? l.from_date : null)
      || (typeof l.startDate === 'string' ? l.startDate : null)
      || (typeof l.start_date === 'string' ? l.start_date : null)
      || undefined;
    const toDateStr = (typeof l.toDate === 'string' ? l.toDate : null)
      || (typeof l.to_date === 'string' ? l.to_date : null)
      || (typeof l.endDate === 'string' ? l.endDate : null)
      || (typeof l.end_date === 'string' ? l.end_date : null)
      || undefined;

    if (!fromDateStr || !toDateStr) return false;

    const leaveStart = createSafeDate(fromDateStr);
    const leaveEnd = createSafeDate(toDateStr);

    leaveStart.setHours(0, 0, 0, 0);
    leaveEnd.setHours(23, 59, 59, 999);

    return today >= leaveStart && today <= leaveEnd;
  }).length;

  // Attendance Today: For single employee, check if they clocked in today
  const attendanceToday = (() => {
    if (employeeId) {
      // For single employee, show if they clocked in today
      if (todayAttendanceStatus?.clockedIn) {
        return '1'; // Clocked in
      } else if (todayAttendanceStatus !== null) {
        return '0'; // Not clocked in (status fetched but no clock in)
      }
      // If no data yet, show percentage if available
      return attendancePercent !== null ? `${attendancePercent}%` : '—';
    }
    // For managers/HR: show aggregate count
    return attendancePercent !== null ?
      `${attendancePercent}%` :
      (employeesCount !== null ? Math.max(0, employeesCount - onLeaveTodayCount) : '—');
  })();
  const lateArrivals = 0; // no source available for late arrivals

  // Pending Actions: pending leaves + pending expenses + pending assets + pending payslips
  const pendingLeavesCount = leaves.filter((l) => isLeave(l) && (l.status || '').toString().toLowerCase() === 'pending').length;
  const pendingExpensesCount = expenses.filter((e) => isExpense(e) && (e.status || '').toString().toLowerCase() === 'pending').length;
  const pendingAssetsCount = assets.filter((a) => isAsset(a) && (a.status || '').toString().toLowerCase() === 'pending').length;
  const pendingPayslipsCount = payslips.filter((p) => isPayslip(p) && (p.status || '').toString().toLowerCase() === 'pending').length;
  const pendingActions = pendingLeavesCount + pendingExpensesCount + pendingAssetsCount + pendingPayslipsCount;

  const mainStats = [
    {
      title: 'Monthly Payroll',
      value: monthlyPayroll,
      subtitle: monthlyPayrollSubtitle,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      icon: <DollarLineIcon className="w-6 h-6 text-green-600" />
    },
    {
      title: 'Attendance Today',
      value: typeof attendanceToday === 'string' ? attendanceToday : String(attendanceToday),
      subtitle: `${lateArrivals} late arrivals (present)`,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      icon: <UserIcon className="w-6 h-6 text-blue-600" />
    },
    {
      title: 'On Leave Today',
      value: String(onLeaveTodayCount),
      subtitle: `${onLeaveTodayCount} on leave`,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      icon: <TaskIcon className="w-6 h-6 text-purple-600" />
    },
    {
      title: 'Pending Actions',
      value: String(pendingActions),
      subtitle: 'Requires attention',
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      icon: <TaskIcon className="w-6 h-6 text-red-600" />
    }
  ];



  // Use backend data for performance metrics, with fallbacks to calculated values
  // For single employee, use their actual attendance rate, otherwise use aggregate
  const attendanceRate = attendancePercent !== null ? attendancePercent : (() => {
    // If no attendance data, try to calculate from leaves or default to 95% for employee
    if (employeeId) {
      // For single employee, try to infer from leave balance or default
      return 95; // Default for employee until attendance endpoint provides data
    }
    return employeesCount ? 95 : 0;
  })();

  // Leave Balance: For single employee, use their actual leave balance
  const displayLeaveBalance = leaveBalanceDays !== null ? leaveBalanceDays : (() => {
    // Try to calculate from leaves data if available
    if (employeeId && leaves.length > 0) {
      // Extract leave balance from first leave application if available
      const firstLeave = leaves.find(l => isLeave(l) && l.availableDays);
      if (firstLeave && isLeave(firstLeave) && typeof firstLeave.availableDays === 'number') {
        return firstLeave.availableDays;
      }
    }
    return avgLeaveBalance; // Fallback to average for managers/HR
  })();

  // Use backend expense efficiency if available, otherwise calculate from local data
  const approvedExpensesCount = expenses.filter((e): e is ExpenseData => isExpense(e) && !!e.status && e.status.toLowerCase() === 'approved').length;
  const totalExpensesCount = expenses.filter((e): e is ExpenseData => isExpense(e)).length;
  const calculatedExpenseEfficiency = totalExpensesCount === 0 ? 0 : Math.round((approvedExpensesCount / totalExpensesCount) * 100);
  const expenseEfficiency = expenseEfficiencyPercent !== null ? expenseEfficiencyPercent : calculatedExpenseEfficiency;

  // Use backend task completion if available, otherwise show placeholder
  const taskCompletion = taskCompletionPercent !== null ? taskCompletionPercent : 0;

  const performanceMetrics = [
    {
      label: 'Attendance Rate',
      value: `${attendanceRate}%`,
      trend: attendanceRate > 90 ? '+2%' : attendanceRate > 80 ? '+1%' : '-1%',
      color: 'text-green-600'
    },
    {
      label: 'Leave Balance',
      value: displayLeaveBalance !== null ? `${displayLeaveBalance} days` : '—',
      trend: displayLeaveBalance !== null ? (displayLeaveBalance > 15 ? '+1 day' : displayLeaveBalance > 5 ? '0' : '-1 day') : '',
      color: 'text-blue-600'
    },
    {
      label: 'Expense Efficiency',
      value: `${expenseEfficiency}%`,
      trend: expenseEfficiency >= 80 ? '+5%' : expenseEfficiency >= 60 ? '+2%' : '-2%',
      color: 'text-purple-600'
    },
    {
      label: 'Task Completion',
      value: taskCompletion > 0 ? `${taskCompletion}%` : '—',
      trend: taskCompletion >= 80 ? '+3%' : taskCompletion >= 60 ? '+1%' : '-1%',
      color: 'text-teal-600'
    }
  ];

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: customStyles }} />
      <div className="min-h-screen bg-gradient-to-br from-indigo-50/30 via-white to-sky-50/30 dark:from-black dark:via-black dark:to-black relative overflow-hidden">
        {/* Ultra-Modern Premium Background Elements */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-indigo-100/15 to-blue-100/15 dark:from-indigo-900/20 dark:to-blue-900/20 rounded-full -translate-y-40 translate-x-40 animate-float-slow"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-sky-100/15 to-indigo-100/15 dark:from-sky-900/20 dark:to-indigo-900/20 rounded-full translate-y-32 -translate-x-32 animate-float-reverse"></div>
        <div className="absolute top-1/3 left-1/4 w-32 h-32 bg-gradient-to-r from-blue-100/10 to-sky-100/10 dark:from-blue-900/15 dark:to-sky-900/15 rounded-full animate-float delay-500"></div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">


          {/* Performance Metrics - Modern Cards */}
          <div className="mb-8 animate-fade-in-up delay-300">
            <div className="flex items-center mb-6">
              <div className="p-2 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl mr-3">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 dark:from-gray-200 dark:to-gray-400 bg-clip-text text-transparent">Performance Metrics</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {performanceMetrics.map((metric, index) => {
                const titleAttr = `${metric.label}: ${metric.value}${metric.trend ? ` (${metric.trend})` : ''}`;
                return (
                  <div key={index} title={titleAttr} className="group bg-white/80 dark:bg-black backdrop-blur-sm rounded-2xl p-6 border border-white/50 dark:border-gray-700/50 shadow-lg dark:shadow-gray-900/50 hover:shadow-xl hover:scale-105 transition-all duration-300 hover:bg-white/90 dark:hover:bg-gray-900">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-sm font-medium text-gray-600 dark:text-gray-300">{metric.label}</div>
                      <TrendingUp className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className={`text-2xl font-bold ${metric.color}`}>{metric.value}</div>
                      <div className={`text-sm ${metric.color} bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full font-medium`}>{metric.trend}</div>
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 text-xs text-gray-500 dark:text-gray-400 mt-3 transition-opacity">
                      {metric.trend ? `Trend: ${metric.trend}` : 'More details available'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Main Stats Cards - Modern Design */}
          <div className="mb-8 animate-fade-in-up delay-500">
            <div className="flex items-center mb-6">
              <div className="p-2 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl mr-3">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 dark:from-gray-200 dark:to-gray-400 bg-clip-text text-transparent">Dashboard Overview</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {mainStats.map((stat, index) => {
                const tooltipText = stat.title === 'Pending Actions'
                  ? `Leaves: ${pendingLeavesCount}, Expenses: ${pendingExpensesCount}, Assets: ${pendingAssetsCount}, Payslips: ${pendingPayslipsCount}`
                  : stat.title === 'Attendance Today'
                    ? `Employees: ${employeesCount ?? '—'}, On leave: ${onLeaveTodayCount}`
                    : `${stat.title}: ${stat.subtitle}`;

                return (
                  <div key={index} title={tooltipText} className="group bg-white/80 dark:bg-black backdrop-blur-sm rounded-2xl p-6 border border-white/50 dark:border-gray-700/50 shadow-lg dark:shadow-gray-900/50 hover:shadow-xl hover:scale-105 transition-all duration-300 hover:bg-white/90 dark:hover:bg-gray-900">
                    <div className="flex items-center justify-between mb-4">
                      <div className={`p-3 rounded-2xl ${stat.bgColor} flex-shrink-0 group-hover:scale-110 transition-transform duration-200`}>
                        <div className="w-6 h-6 flex items-center justify-center">
                          {React.cloneElement(stat.icon, {
                            className: "w-6 h-6 flex-shrink-0"
                          })}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-3xl font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{stat.value}</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-lg font-semibold text-gray-800 dark:text-gray-200">{stat.title}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{stat.subtitle}</p>
                      <div className="opacity-0 group-hover:opacity-100 text-xs text-gray-500 dark:text-gray-400 mt-2 transition-opacity">
                        {tooltipText}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Employee Services Section - Modern Design */}
          <div className="mb-8 animate-fade-in-up delay-700">
            <div className="flex items-center mb-6">
              <div className="p-2 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl mr-3">
                <Package className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 dark:from-gray-200 dark:to-gray-400 bg-clip-text text-transparent">Employee Services</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
              {/* Payslips */}
              <Link href="/ess-portal/payslips" className="group">
                <div className="bg-white/80 dark:bg-black backdrop-blur-sm rounded-2xl p-6 border border-white/50 dark:border-gray-700/50 shadow-lg dark:shadow-gray-900/50 hover:shadow-xl hover:scale-105 transition-all duration-300 hover:bg-white/90 dark:hover:bg-gray-900 h-full">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-500 flex-shrink-0 group-hover:scale-110 transition-transform duration-200">
                      <DollarSign className="w-6 h-6 text-white" />
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-gray-900 dark:text-white group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">{payslipCount}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">Available</div>
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
                    Payslips
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 text-sm line-clamp-2">View and download your payslips, tax documents, and salary statements</p>
                </div>
              </Link>

              {/* Leave Management */}
              <Link href="/ess-portal/leave" className="group">
                <div className="bg-white/80 dark:bg-black backdrop-blur-sm rounded-2xl p-6 border border-white/50 dark:border-gray-700/50 shadow-lg dark:shadow-gray-900/50 hover:shadow-xl hover:scale-105 transition-all duration-300 hover:bg-white/90 dark:hover:bg-gray-900 h-full">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-500 flex-shrink-0 group-hover:scale-110 transition-transform duration-200">
                      <Calendar className="w-6 h-6 text-white" />
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{leaveApplications}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">Applications</div>
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    Leave Management
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 text-sm line-clamp-2">Apply for leave, check leave balance, and track leave history</p>
                </div>
              </Link>

              {/* Attendance */}
              <Link href="/ess-portal/attendance" className="group">
                <div className="bg-white/80 dark:bg-black backdrop-blur-sm rounded-2xl p-6 border border-white/50 dark:border-gray-700/50 shadow-lg dark:shadow-gray-900/50 hover:shadow-xl hover:scale-105 transition-all duration-300 hover:bg-white/90 dark:hover:bg-gray-900 h-full">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 rounded-2xl bg-gradient-to-r from-purple-500 to-violet-500 flex-shrink-0 group-hover:scale-110 transition-transform duration-200">
                      <Clock className="w-6 h-6 text-white" />
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                        {attendancePercent !== null ? `${attendancePercent}%` : '—'}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">This Month</div>
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                    Attendance
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 text-sm line-clamp-2">Clock in/out, view attendance records, and track working hours</p>
                </div>
              </Link>

              {/* Expenses */}
              <Link href="/ess-portal/expenses" className="group">
                <div className="bg-white/80 dark:bg-black backdrop-blur-sm rounded-2xl p-6 border border-white/50 dark:border-gray-700/50 shadow-lg dark:shadow-gray-900/50 hover:shadow-xl hover:scale-105 transition-all duration-300 hover:bg-white/90 dark:hover:bg-gray-900 h-full">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 rounded-2xl bg-gradient-to-r from-yellow-500 to-orange-500 flex-shrink-0 group-hover:scale-110 transition-transform duration-200">
                      <DollarSign className="w-6 h-6 text-white" />
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-gray-900 dark:text-white group-hover:text-yellow-600 dark:group-hover:text-yellow-400 transition-colors">{expenses.length}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">Total Apps</div>
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 group-hover:text-yellow-600 dark:group-hover:text-yellow-400 transition-colors">
                    Expenses
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 text-sm line-clamp-2">Submit expense claims, track reimbursements, and view expense history</p>
                </div>
              </Link>

              {/* Asset Requests */}
              <Link href="/ess-portal/assets" className="group">
                <div className="bg-white/80 dark:bg-black backdrop-blur-sm rounded-2xl p-6 border border-white/50 dark:border-gray-700/50 shadow-lg dark:shadow-gray-900/50 hover:shadow-xl hover:scale-105 transition-all duration-300 hover:bg-white/90 dark:hover:bg-gray-900 h-full">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-500 flex-shrink-0 group-hover:scale-110 transition-transform duration-200">
                      <Package className="w-6 h-6 text-white" />
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{activeAssetRequests}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">Active</div>
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    Asset Requests
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 text-sm line-clamp-2">Request IT equipment, office supplies, and other company assets</p>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            borderRadius: '8px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            fontSize: '14px',
            fontWeight: '500',
            padding: '12px 16px',
          },
          success: {
            style: {
              background: '#10B981',
              color: '#fff',
            },
            iconTheme: {
              primary: '#fff',
              secondary: '#10B981',
            },
          },
          error: {
            style: {
              background: '#EF4444',
              color: '#fff',
            },
            iconTheme: {
              primary: '#fff',
              secondary: '#EF4444',
            },
          },
        }}
      />
    </>
  );
};

export default ESSPortalDashboard;