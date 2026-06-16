
"use client";

import { ESS_PORTAL_ENDPOINTS, essApiFetch } from '@/utils/essApi';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { BACKEND_URL, getAuthHeaders } from '@/utils/api';
import DashboardHeader from '@/components/header/DashboardHeader';
import { DollarSign, ArrowLeft, RefreshCw } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface FormData {
  employeeCode: string;
  fullName: string;
  email: string;
  department: string;
  payPeriodStart: string;
  payPeriodEnd: string;
  reason: string;
  requestType: string;
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

const CreatePayslipForm: React.FC = () => {
  const router = useRouter();
  const { user } = useAuth();
  const [, setUserRole] = useState<string>('employee');
  const [formData, setFormData] = useState<FormData>({
    employeeCode: '',
    fullName: '',
    email: '',
    department: '',
    payPeriodStart: '',
    payPeriodEnd: '',
    reason: '',
    requestType: 'payslip_request'
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [autoFilledFields, setAutoFilledFields] = useState<Set<string>>(new Set());
  const [isLoadingEmployeeData, setIsLoadingEmployeeData] = useState(false);

  // Determine user role
  useEffect(() => {
    if (user && 'role' in user && user.role) {
      setUserRole(user.role as string);
    } else {
      const role = localStorage.getItem('userRole') || 'employee';
      setUserRole(role);
    }
  }, [user]);

  // Function to clean and format name (remove numbers, capitalize only - NO splitting)
  const cleanAndFormatName = (name: string | null | undefined): string => {
    if (!name) return '';
    let cleaned = name.replace(/[^a-zA-Z\s\.\-\']/g, '').trim();
    if (!cleaned) return '';
    cleaned = cleaned.split(' ').map((word: string) => {
      if (word.length === 0) return '';
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    }).filter(word => word.length > 0).join(' ');
    return cleaned;
  };

  // Function to fetch employee data from the employees API
  const fetchEmployeeData = async (email: string): Promise<{ emp_id: string; department: string } | null> => {
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
          console.log('✅ Found employee data:', { emp_id: employee.emp_id, department: employee.department });
          setIsLoadingEmployeeData(false);
          return {
            emp_id: employee.emp_id,
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

          // Priority 1: Fetch employee data from employees API (for emp_id and department)
          if (userEmail) {
            const employeeData = await fetchEmployeeData(userEmail);
            if (employeeData) {
              userCode = employeeData.emp_id;
              userDept = employeeData.department;
              console.log('✅ Fetched employee code and department from API:', { userCode, userDept });
            }
          }

          // Priority 1: Fetch name from backend API (most accurate)
          if (userEmail) {
            userName = await fetchUserNameFromBackend(userEmail) || '';
          }

          // Priority 2: Get name from user object
          if (!userName && user) {
            const userObj = user as User;
            userName = userObj.full_name || userObj.name || userObj.fullName || '';
          }

          // Priority 3: Fallback to localStorage
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
              const updates: FormData = { ...prev };
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
              console.log('✅ Auto-filled email in payslip form:', userEmail);
            }
            if (userName) {
              console.log('✅ Auto-filled name in payslip form (from backend):', userName);
            }
            if (userCode) {
              console.log('✅ Auto-filled employee code in payslip form:', userCode);
            }
            if (userDept) {
              console.log('✅ Auto-filled department in payslip form:', userDept);
            }
          }
        } catch (error) {
          console.warn('⚠️ Could not auto-fill payslip form data:', error);
        }
      };

      updateFormData();
    }
  }, [user]);

  // Validation
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.employeeCode.trim()) newErrors.employeeCode = 'Employee Code is required';
    if (!formData.fullName.trim()) newErrors.fullName = 'Full Name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    if (!formData.department) newErrors.department = 'Department is required';
    if (!formData.payPeriodStart) newErrors.payPeriodStart = 'Pay Period Start is required';
    if (!formData.payPeriodEnd) newErrors.payPeriodEnd = 'Pay Period End is required';
    if (!formData.reason.trim()) newErrors.reason = 'Reason for payslip request is required';

    // Format validations
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    // Validate date range
    if (formData.payPeriodStart && formData.payPeriodEnd) {
      const startDate = new Date(formData.payPeriodStart);
      const endDate = new Date(formData.payPeriodEnd);
      if (endDate < startDate) {
        newErrors.payPeriodEnd = 'Pay Period End must be after Pay Period Start';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
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
      // Format pay period dates
      const formatDateForAPI = (dateString: string) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toISOString().split('T')[0]; // YYYY-MM-DD format
      };

      // Prepare API payload for payslip creation
      const apiPayload = {
        employeeInfo: {
          employeeCode: formData.employeeCode,
          fullName: formData.fullName,
          email: formData.email,
          department: formData.department,
          designation: 'Employee', // Default designation
          dateOfJoining: '2020-01-01', // Default date
          bankAccountNo: '000000000000', // Default account
          uan: '000000000000', // Default UAN
          panNumber: 'ABCDE1234F', // Default PAN
          ifscCode: 'HDFC0000000' // Default IFSC
        },
        payslipInfo: {
          payPeriodStart: formatDateForAPI(formData.payPeriodStart),
          payPeriodEnd: formatDateForAPI(formData.payPeriodEnd),
          payDate: formatDateForAPI(formData.payPeriodEnd) // Use end date as pay date
        },
        earnings: [
          { type: 'Basic Salary', amount: 0 },
          { type: 'HRA', amount: 0 },
          { type: 'Special Allowance', amount: 0 }
        ],
        deductions: [
          { type: 'PF', amount: 0 },
          { type: 'ESI', amount: 0 },
          { type: 'TDS', amount: 0 }
        ],
        additionalInfo: {
          pfNumber: '',
          esiNumber: '',
          remarks: `Application Reason: ${formData.reason} | Request Type: ${formData.requestType}`
        }
      };

      console.log('Submitting payslip application:', apiPayload);

      // Call the ESS payslip creation endpoint via essApiFetch (includes auth headers + retry)
      const response = await essApiFetch(ESS_PORTAL_ENDPOINTS.PAYSLIPS.CREATE(), {
        method: 'POST',
        body: JSON.stringify(apiPayload),
      });

      const result = await response.json();
      console.log('Payslip request created successfully:', result);

      // Show success message and redirect
      toast.success(result.message || 'Payslip request created successfully! The finance team will review and process your request.');
      router.push('/ess-portal/payslips');

    } catch (error) {
      console.error('Error creating payslip request:', error);
      toast.error(`Error creating payslip request: ${error instanceof Error ? error.message : 'Please try again.'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 lg:p-8">
      <DashboardHeader
        title="Create New Payslip"
        subtitle="Advanced payroll management system with intelligent salary processing, comprehensive payslip generation, and enterprise-grade financial compliance for multinational operations."
        icon={DollarSign}
        iconColor="text-white"
        hideTenantPrefix={true}
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'ESS Portal', href: '/ess-portal' },
          { label: 'Payslips', href: '/ess-portal/payslips' },
          { label: 'Create' }
        ]}
        actions={
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/ess-portal/payslips')}
              className="flex items-center px-4 py-2 bg-white/20 rounded-lg backdrop-blur-sm border border-white/30 text-white hover:bg-white/30 transition-all duration-200"
              title="Back to Payslips"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              <span className="font-medium">Back</span>
            </button>
            <button
              onClick={() => window.location.reload()}
              className="flex items-center px-4 py-2 bg-white/20 rounded-lg backdrop-blur-sm border border-white/30 text-white hover:bg-white/30 transition-all duration-200"
              title="Refresh Data"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              <span className="font-medium">Refresh</span>
            </button>
          </div>
        }
      />

      <div className="max-w-7xl mx-auto mt-8">
        <form onSubmit={handleSubmit} className="space-y-8">

          {/* Employee Information */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-300 p-6 lg:p-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Employee Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Employee Code *
                </label>
                <input
                  type="text"
                  value={formData.employeeCode}
                  onChange={(e) => handleInputChange('employeeCode', e.target.value)}
                  readOnly={autoFilledFields.has('employeeCode') || isLoadingEmployeeData}
                  disabled={autoFilledFields.has('employeeCode') || isLoadingEmployeeData}
                  className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400 transition-all duration-200 ${errors.employeeCode
                    ? 'border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/20 text-gray-900 dark:text-white'
                    : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-400'
                    } ${(autoFilledFields.has('employeeCode') || isLoadingEmployeeData) ? 'bg-gray-100 dark:bg-gray-600 cursor-not-allowed opacity-75' : ''}`}
                  placeholder={isLoadingEmployeeData ? "Loading employee code..." : "Enter employee code"}
                />
                {errors.employeeCode && (
                  <p className="text-red-500 dark:text-red-400 text-sm">{errors.employeeCode}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
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
                  readOnly={autoFilledFields.has('fullName')}
                  disabled={autoFilledFields.has('fullName')}
                  className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400 transition-all duration-200 ${errors.fullName
                    ? 'border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/20 text-gray-900 dark:text-white'
                    : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-400'
                    } ${autoFilledFields.has('fullName') ? 'bg-gray-100 dark:bg-gray-600 cursor-not-allowed opacity-75' : ''}`}
                  placeholder="Enter full name"
                />
                {errors.fullName && (
                  <p className="text-red-500 dark:text-red-400 text-sm">{errors.fullName}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Email *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  readOnly={autoFilledFields.has('email')}
                  disabled={autoFilledFields.has('email')}
                  className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400 transition-all duration-200 ${errors.email
                    ? 'border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/20 text-gray-900 dark:text-white'
                    : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-400'
                    } ${autoFilledFields.has('email') ? 'bg-gray-100 dark:bg-gray-600 cursor-not-allowed opacity-75' : ''}`}
                  placeholder="Enter email address"
                />
                {errors.email && (
                  <p className="text-red-500 dark:text-red-400 text-sm">{errors.email}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Department *
                </label>
                {autoFilledFields.has('department') || isLoadingEmployeeData ? (
                  // Read-only input when fetched from API
                  <input
                    type="text"
                    value={formData.department}
                    readOnly
                    disabled
                    className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400 transition-all duration-200 ${errors.department
                      ? 'border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/20 text-gray-900 dark:text-white'
                      : 'border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-600 text-gray-900 dark:text-white'
                      } cursor-not-allowed opacity-75`}
                    placeholder={isLoadingEmployeeData ? "Loading department..." : "Department"}
                  />
                ) : (
                  // Editable select when not fetched from API
                  <select
                    value={formData.department}
                    onChange={(e) => handleInputChange('department', e.target.value)}
                    className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400 transition-all duration-200 ${errors.department
                      ? 'border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/20 text-gray-900 dark:text-white'
                      : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white'
                      }`}
                  >
                    <option value="">Select department</option>
                    <option value="HR">HR</option>
                    <option value="Finance">Finance</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Sales">Sales</option>
                    <option value="Operations">Operations</option>
                    <option value="IT">IT</option>
                    <option value="Engineering">Engineering</option>
                    <option value="Administration">Administration</option>
                    {/* Add dynamic department option if it doesn't match predefined ones */}
                    {formData.department && !['HR', 'Finance', 'Marketing', 'Sales', 'Operations', 'IT', 'Engineering', 'Administration'].includes(formData.department) && (
                      <option value={formData.department}>{formData.department}</option>
                    )}
                  </select>
                )}
                {errors.department && (
                  <p className="text-red-500 dark:text-red-400 text-sm">{errors.department}</p>
                )}
              </div>
            </div>
          </div>

          {/* Application Details */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-300 p-6 lg:p-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Application Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Pay Period Start *
                </label>
                <div className="relative">
                  <input
                    type="date"
                    id="payPeriodStartInput"
                    value={formData.payPeriodStart}
                    onChange={(e) => handleInputChange('payPeriodStart', e.target.value)}
                    className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400 transition-all duration-200 ${errors.payPeriodStart
                      ? 'border-red-500 dark:border-red-600 bg-red-50 dark:bg-red-900/20 text-gray-900 dark:text-white'
                      : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white'
                      }`}
                  />
                  <button
                    type="button"
                    aria-label="Open pay period start date picker"
                    onClick={() => (document.getElementById('payPeriodStartInput') as HTMLInputElement)?.showPicker?.()}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>
                {errors.payPeriodStart && (
                  <p className="text-red-500 dark:text-red-400 text-sm mt-1">{errors.payPeriodStart}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Pay Period End *
                </label>
                <div className="relative">
                  <input
                    type="date"
                    id="payPeriodEndInput"
                    value={formData.payPeriodEnd}
                    onChange={(e) => handleInputChange('payPeriodEnd', e.target.value)}
                    className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400 transition-all duration-200 ${errors.payPeriodEnd
                      ? 'border-red-500 dark:border-red-600 bg-red-50 dark:bg-red-900/20 text-gray-900 dark:text-white'
                      : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white'
                      }`}
                  />
                  <button
                    type="button"
                    aria-label="Open pay period end date picker"
                    onClick={() => (document.getElementById('payPeriodEndInput') as HTMLInputElement)?.showPicker?.()}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>
                {errors.payPeriodEnd && (
                  <p className="text-red-500 dark:text-red-400 text-sm mt-1">{errors.payPeriodEnd}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Request Type
                </label>
                <select
                  value={formData.requestType}
                  onChange={(e) => handleInputChange('requestType', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-400 transition-all duration-200 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="payslip_request">Payslip Request</option>
                  <option value="salary_correction">Salary Correction</option>
                  <option value="bonus_request">Bonus Request</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="md:col-span-2 space-y-2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Reason for Request *
                </label>
                <textarea
                  value={formData.reason}
                  onChange={(e) => handleInputChange('reason', e.target.value)}
                  rows={4}
                  className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-400 transition-all duration-200 resize-none ${errors.reason
                    ? 'border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/20 text-gray-900 dark:text-white'
                    : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-400'
                    }`}
                  placeholder="Please provide a detailed reason for your payslip request..."
                />
                {errors.reason && (
                  <p className="text-red-500 dark:text-red-400 text-sm">{errors.reason}</p>
                )}
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-start pt-8">
            <button
              type="submit"
              disabled={isSubmitting}
              className="group relative inline-flex items-center px-8 py-4 bg-[#3366CC] hover:bg-[#2d5bb3] text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-[#3366CC]/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-3"></div>
              ) : (
                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              )}
              <span className="text-lg">
                {isSubmitting ? 'Submitting Application...' : 'Submit Application'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreatePayslipForm;
