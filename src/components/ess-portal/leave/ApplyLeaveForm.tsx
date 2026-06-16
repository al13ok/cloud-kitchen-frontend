"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, ArrowLeft, User, Clock, FileText, CheckCircle } from 'lucide-react';
import DashboardHeader from '@/components/header/DashboardHeader';
import { getAuthHeaders, BACKEND_URL } from '@/utils/api';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'react-hot-toast';

interface LeaveFormData {
  employeeCode: string;
  fullName: string;
  department: string;
  email: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  reason: string;
}

interface LeaveBalance {
  annual: number;
  sick: number;
  casual: number;
}

interface User {
  email?: string;
  user_email?: string;
  sub?: string;
  employeeCode?: string;
  employee_code?: string;
  department?: string;
  full_name?: string;
  name?: string;
  fullName?: string;
}

interface ApiUser {
  email?: string;
  fullName?: string;
  [key: string]: unknown;
}

interface EmployeeData {
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

interface EmployeesApiResponse {
  page: number;
  size: number;
  total_records: number;
  total_pages: number;
  data: EmployeeData[];
}

const ApplyLeaveForm: React.FC = () => {
  const router = useRouter();
  const { user } = useAuth();
  const [formData, setFormData] = useState<LeaveFormData>({
    employeeCode: '',
    fullName: '',
    department: '',
    email: '',
    leaveType: 'Select type of Leave',
    startDate: '',
    endDate: '',
    reason: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [autoFilledFields, setAutoFilledFields] = useState<Set<string>>(new Set());
  const [isLoadingEmployeeData, setIsLoadingEmployeeData] = useState(false);

  // Function to clean and format name (remove numbers, capitalize only - NO splitting)
  const cleanAndFormatName = (name: string | null | undefined): string => {
    if (!name) return '';
    // Remove numbers and invalid characters (keep spaces, dots, hyphens, apostrophes)
    let cleaned = name.replace(/[^a-zA-Z\s\.\-\']/g, '').trim();
    if (!cleaned) return '';
    // Only capitalize first letter of each word - DON'T split names
    cleaned = cleaned.split(' ').map((word: string) => {
      if (word.length === 0) return '';
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    }).filter(word => word.length > 0).join(' ');
    return cleaned;
  };

  // Function to fetch employee data from the employees API
  const fetchEmployeeData = async (email: string): Promise<{ emp_id: string; full_name: string; department: string } | null> => {
    if (!email) return null;

    setIsLoadingEmployeeData(true);
    try {
      const EMPLOYEES_API_BASE = 'https://py-mobiloitte.converiqo.ai/api/v1/employees';
      const authHeaders = getAuthHeaders();
      let currentPage = 1;
      let totalPages = 1;
      const pageSize = 100; // Use larger page size to reduce API calls

      // Fetch all pages until we find the employee or exhaust all pages
      do {
        const url = `${EMPLOYEES_API_BASE}/?page=${currentPage}&size=${pageSize}`;
        const response = await fetch(url, {
          headers: {
            ...authHeaders,
            'accept': 'application/json',
          },
          cache: 'no-store',
        });

        if (!response.ok) {
          console.warn(`⚠️ Failed to fetch employees page ${currentPage}:`, response.statusText);
          break;
        }

        const data: EmployeesApiResponse = await response.json();
        totalPages = data.total_pages;

        // Search for employee by email (case-insensitive)
        const employee = data.data.find(
          (emp) => emp.email?.toLowerCase() === email.toLowerCase()
        );

        if (employee) {
          console.log('✅ Found employee data:', { emp_id: employee.emp_id, full_name: employee.full_name, department: employee.department });
          setIsLoadingEmployeeData(false);
          return {
            emp_id: employee.emp_id,
            full_name: employee.full_name,
            department: employee.department,
          };
        }

        currentPage++;
      } while (currentPage <= totalPages);

      console.warn(`⚠️ Employee not found with email: ${email}`);
      setIsLoadingEmployeeData(false);
      return null;
    } catch (error) {
      console.error('❌ Error fetching employee data:', error);
      setIsLoadingEmployeeData(false);
      toast.error('Failed to fetch employee information. Please try again.');
      return null;
    }
  };

  // Function to fetch user name from backend API
  const fetchUserNameFromBackend = async (email: string): Promise<string | null> => {
    if (!email) return null;
    try {
      const response = await fetch(`${BACKEND_URL}/api/v1/users`, {
        headers: { 'accept': 'application/json' },
        cache: 'no-store',
      });
      if (!response.ok) return null;
      const users = await response.json();
      const currentUser = Array.isArray(users)
        ? (users as ApiUser[]).find((u) => u.email?.toLowerCase() === email.toLowerCase())
        : null;
      return currentUser?.fullName || null;
    } catch (error) {
      console.warn('⚠️ Failed to fetch user name from backend:', error);
      return null;
    }
  };

  // Auto-fill email, name, employee code, and department from logged-in user
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const updateFormData = async () => {
        try {
          // Get user data from auth context or localStorage
          let userEmail = '';
          let userName = '';
          let userCode = '';
          let userDept = '';

          if (user) {
            const userObj = user as User;
            userEmail = userObj.email || userObj.user_email || userObj.sub || '';
            userCode = userObj.employeeCode || userObj.employee_code || '';
            userDept = userObj.department || '';
          }

          // Fallback to localStorage for email
          if (!userEmail) {
            userEmail = localStorage.getItem('email') || localStorage.getItem('user_email') || '';
          }

          // Priority 1: Fetch employee data from employees API (for emp_id, full_name, and department)
          if (userEmail) {
            const employeeData = await fetchEmployeeData(userEmail);
            if (employeeData) {
              userCode = employeeData.emp_id;
              userDept = employeeData.department;
              userName = employeeData.full_name;
              console.log('✅ Fetched employee data from API:', { userCode, userDept, userName });
            }
          }

          // Priority 2: Fetch name from backend API if not found from employees API
          if (!userName && userEmail) {
            userName = await fetchUserNameFromBackend(userEmail) || '';
          }

          // Priority 3: Get name from user object
          if (!userName && user) {
            const userObj = user as User;
            userName = userObj.full_name || userObj.name || userObj.fullName || '';
          }

          // Priority 4: Fallback to localStorage
          if (!userName) {
            userName = localStorage.getItem('full_name') || localStorage.getItem('name') || '';
          }

          // Clean and format name (ONLY capitalize, NO splitting)
          userName = cleanAndFormatName(userName);

          // Fallback: Get other fields from localStorage only if not fetched from API
          if (!userCode) {
            userCode = localStorage.getItem('employeeCode') || localStorage.getItem('employee_code') || '';
          }
          if (!userDept) {
            userDept = localStorage.getItem('department') || '';
          }

          // Auto-fill form if data is available
          if (userEmail || userName || userCode || userDept) {
            const filledFields = new Set<string>();

            setFormData(prev => {
              const updates: LeaveFormData = { ...prev };
              if (userEmail) {
                updates.email = userEmail;
                filledFields.add('email');
              }
              if (userName) {
                updates.fullName = userName;
                filledFields.add('fullName');
              }
              if (userCode) {
                updates.employeeCode = userCode;
                filledFields.add('employeeCode');
              }
              if (userDept) {
                updates.department = userDept;
                filledFields.add('department');
              }
              return updates;
            });

            setAutoFilledFields(filledFields);

            if (userEmail) {
              console.log('✅ Auto-filled email in leave form:', userEmail);
            }
            if (userName) {
              console.log('✅ Auto-filled name in leave form:', userName);
            }
            if (userCode) {
              console.log('✅ Auto-filled employee code in leave form:', userCode);
            }
            if (userDept) {
              console.log('✅ Auto-filled department in leave form:', userDept);
            }
          }
        } catch (error) {
          console.warn('⚠️ Could not auto-fill leave form data:', error);
        }
      };

      updateFormData();
    }
  }, [user]);

  // Leave balance data
  const [leaveBalance] = useState<LeaveBalance>({
    annual: 12,
    sick: 5,
    casual: 3
  });

  const leaveTypes = [
    { value: 'Select type of Leave', label: 'Select type of Leave' },
    { value: 'Annual Leave', label: 'Annual Leave' },
    { value: 'Sick Leave', label: 'Sick Leave' },
    { value: 'Casual Leave', label: 'Casual Leave' },
    { value: 'Emergency Leave', label: 'Emergency Leave' },
    { value: 'Maternity Leave', label: 'Maternity Leave' },
    { value: 'Paternity Leave', label: 'Paternity Leave' }
  ];

  const departments = [
    { value: 'Select department', label: 'Select department' },
    { value: 'Engineering', label: 'Engineering' },
    { value: 'IT', label: 'IT' },
    { value: 'Python', label: 'Python' },
    { value: 'HR', label: 'HR' },
    { value: 'Finance', label: 'Finance' },
    { value: 'Marketing', label: 'Marketing' },
    { value: 'Sales', label: 'Sales' },
    { value: 'Operations', label: 'Operations' }
  ];

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Employee Information validation
    if (!formData.employeeCode.trim()) newErrors.employeeCode = 'Employee Code is required';
    if (!formData.fullName.trim()) newErrors.fullName = 'Full Name is required';
    if (!formData.department) newErrors.department = 'Department is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(formData.email)) newErrors.email = 'Invalid email address';

    // Leave Details validation
    if (!formData.leaveType) newErrors.leaveType = 'Leave Type is required';
    if (!formData.startDate) newErrors.startDate = 'Start date is required';
    if (!formData.endDate) newErrors.endDate = 'End date is required';
    if (!formData.reason.trim()) newErrors.reason = 'Reason is required';

    // Validate date range
    if (formData.startDate && formData.endDate) {
      const startDate = new Date(formData.startDate);
      const endDate = new Date(formData.endDate);
      if (endDate < startDate) {
        newErrors.endDate = 'End date must be after start date';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof LeaveFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        employeeInfo: {
          employeeCode: formData.employeeCode,
          fullName: formData.fullName,
          department: formData.department,
          email: formData.email,
        },
        leaveDetails: {

          leaveType: formData.leaveType,
          fromDate: formData.startDate, // backend expects YYYY-MM-DD
          toDate: formData.endDate,
          reasonForLeave: formData.reason,
        }
      };

      const authHeaders = getAuthHeaders();
      const url = `${BACKEND_URL}/api/v1/ess-portal/leave-applications`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          ...authHeaders, // ✅ Include auth headers
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        let errorMessage = `Server error ${res.status}`;

        // Try to parse error detail from response
        try {
          const errorData = JSON.parse(text);
          if (errorData.detail) {
            errorMessage = errorData.detail;
          } else if (errorData.message) {
            errorMessage = errorData.message;
          }
        } catch {
          // If parsing fails, use the raw text
          if (text && text.length < 500) {
            errorMessage = text.replace(/^.*?"detail"\s*:\s*"([^"]+)".*$/, '$1') || text;
          }
        }

        throw new Error(errorMessage);
      }

      const result = await res.json();
      if (!result || !result.success) {
        throw new Error(result?.message || 'Failed to create leave application');
      }

      // navigate back to leave list (the list component will re-fetch)
      toast.success('Leave application submitted successfully!');
      router.push('/ess-portal/leave');
    } catch (error) {
      console.error('Error submitting leave application:', error);

      // Extract and display detailed error message
      const errorMessage = error instanceof Error ? error.message : 'Failed to submit leave application. Please try again.';

      // Show user-friendly error message
      if (errorMessage.includes('overlap')) {
        toast.error(`${errorMessage} Please select different dates that do not overlap with your existing leave applications.`);
      } else if (errorMessage.includes('balance') || errorMessage.includes('Insufficient')) {
        toast.error(`${errorMessage} Please contact your manager or HR for assistance.`);
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // removed unused calculateDays to satisfy linter

  const getLeaveBalance = (leaveType: string) => {
    switch (leaveType) {
      case 'Annual Leave':
        return leaveBalance.annual;
      case 'Sick Leave':
        return leaveBalance.sick;
      case 'Casual Leave':
        return leaveBalance.casual;
      default:
        return 0;
    }
  };

  const getLeaveTypeColor = (leaveType: string) => {
    switch (leaveType) {
      case 'Annual Leave':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300';
      case 'Sick Leave':
        return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300';
      case 'Casual Leave':
        return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300';
    }
  };

  const handleBack = () => {
    router.push('/ess-portal/leave');
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        {/* Dashboard Header */}
        <DashboardHeader
          title="Apply for Leave"
          subtitle="Submit your leave application with comprehensive details for quick approval and seamless workforce management."
          icon={Calendar}
          iconColor="text-white"
          hideTenantPrefix={true}
          breadcrumbs={[
            { label: 'Home', href: '/' },
            { label: 'ESS Portal', href: '/ess-portal' },
            { label: 'Leave', href: '/ess-portal/leave' },
            { label: 'Apply' }
          ]}
          actions={
            <button
              onClick={handleBack}
              className="flex items-center px-6 py-3 bg-white/20 rounded-xl backdrop-blur-sm border border-white/30 text-white hover:bg-white/30 transition-all duration-200 hover:scale-105 whitespace-nowrap"
              title="Back to Leave Management"
            >
              <ArrowLeft className="w-5 h-5 mr-2 flex-shrink-0" />
              <span className="font-medium whitespace-nowrap">Back</span>
            </button>
          }
        />

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Employee Information */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 hover:shadow-2xl transition-all duration-300 p-6 lg:p-8">
            <div className="flex items-center mb-6">
              <div className="p-3 rounded-xl bg-[#3366CC]/10 dark:bg-[#3366CC]/20 mr-4">
                <User className="w-6 h-6 text-[#3366CC] dark:text-[#4a7dd9]" />
              </div>
              <h2 className="text-2xl font-bold text-[#3366CC] dark:text-[#4a7dd9]">Employee Information</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Employee Code *
                </label>
                <input
                  type="text"
                  value={formData.employeeCode}
                  onChange={(e) => handleInputChange('employeeCode', e.target.value)}
                  readOnly={autoFilledFields.has('employeeCode') || isLoadingEmployeeData}
                  disabled={autoFilledFields.has('employeeCode') || isLoadingEmployeeData}
                  placeholder={isLoadingEmployeeData ? "Loading employee code..." : "Enter employee code"}
                  className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3366CC]/50 dark:focus:ring-[#3366CC]/50 focus:border-[#3366CC] dark:focus:border-[#3366CC] bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-400 hover:bg-white/80 dark:hover:bg-gray-700/80 transition-all duration-200 shadow-sm hover:shadow-md ${errors.employeeCode ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                    } ${(autoFilledFields.has('employeeCode') || isLoadingEmployeeData) ? 'bg-gray-100 dark:bg-gray-600 cursor-not-allowed opacity-75' : ''}`}
                />
                {errors.employeeCode && (
                  <p className="text-red-500 dark:text-red-400 text-sm mt-1">{errors.employeeCode}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={formData.fullName.replace(/[^a-zA-Z\s\.\-\']/g, '')}
                  onChange={(e) => {
                    // Remove ALL numbers and invalid characters immediately
                    let value = e.target.value.replace(/[^a-zA-Z\s\.\-\']/g, '');
                    // Capitalize first letter of each word
                    value = value.split(' ').map(word =>
                      word.length > 0 ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase() : ''
                    ).join(' ');
                    handleInputChange('fullName', value);
                  }}
                  onInput={(e) => {
                    // Extra layer: Remove numbers on input event
                    const target = e.target as HTMLInputElement;
                    let value = target.value.replace(/[^a-zA-Z\s\.\-\']/g, '');
                    if (target.value !== value) {
                      value = value.split(' ').map(word =>
                        word.length > 0 ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase() : ''
                      ).join(' ');
                      handleInputChange('fullName', value);
                    }
                  }}
                  onKeyDown={(e) => {
                    // Block ALL number keys (0-9, numpad, etc.)
                    if ((e.key >= '0' && e.key <= '9') ||
                      (e.key >= 'Numpad0' && e.key <= 'Numpad9') ||
                      e.key === 'Digit0' || e.key === 'Digit1' || e.key === 'Digit2' ||
                      e.key === 'Digit3' || e.key === 'Digit4' || e.key === 'Digit5' ||
                      e.key === 'Digit6' || e.key === 'Digit7' || e.key === 'Digit8' ||
                      e.key === 'Digit9') {
                      e.preventDefault();
                      return false;
                    }
                  }}
                  onPaste={(e) => {
                    // Block pasting numbers
                    e.preventDefault();
                    const pastedText = e.clipboardData.getData('text');
                    const cleanedText = pastedText.replace(/[^a-zA-Z\s\.\-\']/g, '');
                    if (cleanedText) {
                      const capitalized = cleanedText.split(' ').map(word =>
                        word.length > 0 ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase() : ''
                      ).join(' ');
                      handleInputChange('fullName', capitalized);
                    }
                  }}
                  placeholder="Enter full name"
                  readOnly={autoFilledFields.has('fullName')}
                  disabled={autoFilledFields.has('fullName')}
                  className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3366CC]/50 dark:focus:ring-[#3366CC]/50 focus:border-[#3366CC] dark:focus:border-[#3366CC] bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-400 hover:bg-white/80 dark:hover:bg-gray-700/80 transition-all duration-200 shadow-sm hover:shadow-md ${errors.fullName ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                    } ${autoFilledFields.has('fullName') ? 'bg-gray-100 dark:bg-gray-600 cursor-not-allowed opacity-75' : ''}`}
                />
                {errors.fullName && (
                  <p className="text-red-500 dark:text-red-400 text-sm mt-1">{errors.fullName}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Department *
                </label>
                {autoFilledFields.has('department') || isLoadingEmployeeData ? (
                  // Read-only input when fetched from API
                  <input
                    type="text"
                    value={formData.department}
                    readOnly
                    disabled
                    className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3366CC]/50 dark:focus:ring-[#3366CC]/50 focus:border-[#3366CC] dark:focus:border-[#3366CC] bg-gray-100 dark:bg-gray-600 text-gray-900 dark:text-white transition-all duration-200 shadow-sm ${errors.department ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                      } cursor-not-allowed opacity-75`}
                    placeholder={isLoadingEmployeeData ? "Loading department..." : "Department"}
                  />
                ) : (
                  // Editable select when not fetched from API
                  <div className="relative">
                    <select
                      value={formData.department}
                      onChange={(e) => handleInputChange('department', e.target.value)}
                      className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3366CC]/50 dark:focus:ring-[#3366CC]/50 focus:border-[#3366CC] dark:focus:border-[#3366CC] bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-white/80 dark:hover:bg-gray-700/80 transition-all duration-200 shadow-sm hover:shadow-md appearance-none ${errors.department ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                        }`}
                    >
                      <option value="">Select department</option>
                      {departments.slice(1).map((dept) => (
                        <option key={dept.value} value={dept.value} className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                          {dept.label}
                        </option>
                      ))}
                      {/* Add dynamic department option if it doesn't match predefined ones */}
                      {formData.department && !departments.slice(1).some(dept => dept.value === formData.department) && (
                        <option value={formData.department}>{formData.department}</option>
                      )}
                    </select>
                    <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500 dark:text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                )}
                {errors.department && (
                  <p className="text-red-500 dark:text-red-400 text-sm mt-1">{errors.department}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="name@company.com"
                  readOnly={autoFilledFields.has('email')}
                  disabled={autoFilledFields.has('email')}
                  className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3366CC]/50 dark:focus:ring-[#3366CC]/50 focus:border-[#3366CC] dark:focus:border-[#3366CC] bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-400 hover:bg-white/80 dark:hover:bg-gray-700/80 transition-all duration-200 shadow-sm hover:shadow-md ${errors.email ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                    } ${autoFilledFields.has('email') ? 'bg-gray-100 dark:bg-gray-600 cursor-not-allowed opacity-75' : ''}`}
                />
                {errors.email && (
                  <p className="text-red-500 dark:text-red-400 text-sm mt-1">{errors.email}</p>
                )}
              </div>
            </div>
          </div>

          {/* Leave Balance */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 hover:shadow-2xl transition-all duration-300 p-6 lg:p-8">
            <div className="flex items-center mb-6">
              <div className="p-3 rounded-xl bg-[#3366CC]/10 dark:bg-[#3366CC]/20 mr-4">
                <Clock className="w-6 h-6 text-[#3366CC] dark:text-[#4a7dd9]" />
              </div>
              <h2 className="text-2xl font-bold text-[#3366CC] dark:text-[#4a7dd9]">Leave Balance</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-[#3366CC] dark:text-[#4a7dd9] mb-2">{leaveBalance.annual}</div>
                <div className="text-gray-600 dark:text-gray-300">Annual Leave</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-[#3366CC] dark:text-[#4a7dd9] mb-2">{leaveBalance.sick}</div>
                <div className="text-gray-600 dark:text-gray-300">Sick Leave</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-[#3366CC] dark:text-[#4a7dd9] mb-2">{leaveBalance.casual}</div>
                <div className="text-gray-600 dark:text-gray-300">Casual Leave</div>
              </div>
            </div>
          </div>

          {/* Leave Details */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 hover:shadow-2xl transition-all duration-300 p-6 lg:p-8">
            <div className="flex items-center mb-6">
              <div className="p-3 rounded-xl bg-[#3366CC]/10 dark:bg-[#3366CC]/20 mr-4">
                <FileText className="w-6 h-6 text-[#3366CC] dark:text-[#4a7dd9]" />
              </div>
              <h2 className="text-2xl font-bold text-[#3366CC] dark:text-[#4a7dd9]">Leave Details</h2>
            </div>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Leave Type *
                </label>
                <select
                  value={formData.leaveType}
                  onChange={(e) => handleInputChange('leaveType', e.target.value)}
                  className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3366CC]/50 dark:focus:ring-[#3366CC]/50 focus:border-[#3366CC] dark:focus:border-[#3366CC] bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-white/80 dark:hover:bg-gray-700/80 transition-all duration-200 shadow-sm hover:shadow-md ${errors.leaveType ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                    }`}
                >
                  {leaveTypes.map((type) => (
                    <option key={type.value} value={type.value} className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                      {type.label}
                    </option>
                  ))}
                </select>
                <div className="mt-2">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getLeaveTypeColor(formData.leaveType)}`}>
                    {formData.leaveType}
                  </span>
                  <span className="ml-2 text-sm text-gray-600 dark:text-gray-300">
                    Available: {getLeaveBalance(formData.leaveType)} days
                  </span>
                </div>
                {errors.leaveType && (
                  <p className="text-red-500 dark:text-red-400 text-sm mt-1">{errors.leaveType}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    From Date *
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      id="startDateInput"
                      value={formData.startDate}
                      onChange={(e) => handleInputChange('startDate', e.target.value)}
                      className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3366CC]/50 dark:focus:ring-[#3366CC]/50 focus:border-[#3366CC] dark:focus:border-[#3366CC] bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-white/80 dark:hover:bg-gray-700/80 transition-all duration-200 shadow-sm hover:shadow-md ${errors.startDate ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                        }`}
                    />
                    <button
                      type="button"
                      aria-label="Open start date picker"
                      onClick={(e) => {
                        e.preventDefault();
                        const input = document.getElementById('startDateInput') as HTMLInputElement;
                        input?.showPicker?.();
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-500 dark:text-gray-400 hover:text-[#3366CC] dark:hover:text-[#4a7dd9]"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </button>
                  </div>
                  {errors.startDate && (
                    <p className="text-red-500 dark:text-red-400 text-sm mt-1">{errors.startDate}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    To Date *
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      id="endDateInput"
                      value={formData.endDate}
                      onChange={(e) => handleInputChange('endDate', e.target.value)}
                      min={formData.startDate || undefined}
                      className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3366CC]/50 dark:focus:ring-[#3366CC]/50 focus:border-[#3366CC] dark:focus:border-[#3366CC] bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-white/80 dark:hover:bg-gray-700/80 transition-all duration-200 shadow-sm hover:shadow-md ${errors.endDate ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                        }`}
                    />
                    <button
                      type="button"
                      aria-label="Open end date picker"
                      onClick={(e) => {
                        e.preventDefault();
                        const input = document.getElementById('endDateInput') as HTMLInputElement;
                        input?.showPicker?.();
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-500 dark:text-gray-400 hover:text-[#3366CC] dark:hover:text-[#4a7dd9]"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </button>
                  </div>
                  {errors.endDate && (
                    <p className="text-red-500 dark:text-red-400 text-sm mt-1">{errors.endDate}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Reason for Leave *
                </label>
                <textarea
                  value={formData.reason}
                  onChange={(e) => handleInputChange('reason', e.target.value)}
                  rows={4}
                  className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3366CC]/50 dark:focus:ring-[#3366CC]/50 focus:border-[#3366CC] dark:focus:border-[#3366CC] bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-400 hover:bg-white/80 dark:hover:bg-gray-700/80 transition-all duration-200 shadow-sm hover:shadow-md ${errors.reason ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                    }`}
                  placeholder="Please provide a reason for your leave request..."
                />
                {errors.reason && (
                  <p className="text-red-500 dark:text-red-400 text-sm mt-1">{errors.reason}</p>
                )}
              </div>
            </div>
          </div>

          {/* Application Summary */}
          <div className="bg-[#3366CC] text-white py-8 px-8 rounded-2xl shadow-2xl border border-[#3366CC]/40 backdrop-blur-xl mt-8">
            <div className="text-center">
              <div className="flex items-center justify-center mb-4">
                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm border border-white/30 mr-4">
                  <CheckCircle className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold">Application Summary</h3>
              </div>
              <div className="flex items-center justify-center space-x-4">
                <div className="flex items-center px-4 py-2 bg-white/20 rounded-xl backdrop-blur-sm border border-white/30">
                  <div className="w-2 h-2 bg-white rounded-full mr-3"></div>
                  <span className="text-sm font-medium">Leave Type: {formData.leaveType}</span>
                </div>
                <div className="flex items-center px-4 py-2 bg-white/20 rounded-xl backdrop-blur-sm border border-white/30">
                  <div className="w-2 h-2 bg-white rounded-full mr-3"></div>
                  <span className="text-sm font-medium">Requested: {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Submit Button Section */}
          <div className="flex justify-start mt-8">
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex items-center px-8 py-4 bg-[#3366CC] hover:bg-[#2d5bb3] text-white rounded-2xl shadow-2xl border border-[#3366CC]/40 backdrop-blur-xl transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Submit Leave Application"
            >
              {isSubmitting ? (
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin mr-3 flex-shrink-0"></div>
              ) : (
                <CheckCircle className="w-6 h-6 mr-3 flex-shrink-0" />
              )}
              <span className="text-lg font-semibold">
                {isSubmitting ? 'Submitting...' : 'Submit Application'}
              </span>
            </button>
          </div>
        </form>
      </div>

    </div>
  );
};

export default ApplyLeaveForm;