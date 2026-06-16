'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, User, FileText, CheckCircle, Package } from 'lucide-react';
import { getAuthHeaders, BACKEND_URL } from '@/utils/api';
import { ESS_PORTAL_ENDPOINTS } from '@/utils/essApi';
import { useAuth } from '@/hooks/useAuth';
import DashboardHeader from '@/components/header/DashboardHeader';
import { toast } from 'react-hot-toast';

interface FormData {
  employeeCode: string;
  fullName: string;
  department: string;
  email: string;
  assetType: string;
  assetName: string;
  quantity: number;
  justification: string;
  priority: string;
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

const RequestAssetForm: React.FC = () => {
  const router = useRouter();
  const { user } = useAuth();
  const [formData, setFormData] = useState<FormData>({
    employeeCode: '',
    fullName: '',
    department: '',
    email: '',
    assetType: 'Other',
    assetName: '',
    quantity: 1,
    justification: '',
    priority: 'Medium'
  });

  const [currentDate, setCurrentDate] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [autoFilledFields, setAutoFilledFields] = useState<Set<string>>(new Set());
  const [isLoadingEmployeeData, setIsLoadingEmployeeData] = useState(false);

  useEffect(() => {
    // Set current date
    const today = new Date();
    const formattedDate = today.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).replace(/\//g, '-');
    setCurrentDate(formattedDate);
  }, []);

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
              console.log('✅ Auto-filled email in asset form:', userEmail);
            }
            if (userName) {
              console.log('✅ Auto-filled name in asset form:', userName);
            }
            if (userCode) {
              console.log('✅ Auto-filled employee code in asset form:', userCode);
            }
            if (userDept) {
              console.log('✅ Auto-filled department in asset form:', userDept);
            }
          }
        } catch (error) {
          console.warn('⚠️ Could not auto-fill asset form data:', error);
        }
      };

      updateFormData();
    }
  }, [user]);

  const assetTypes = ['Hardware', 'Software', 'Other'];
  const priorities = ['Low', 'Medium', 'High', 'Urgent'];
  const commonAssets = ['Office Chair', 'Desk', 'Stationery', 'Books', 'Cables', 'Storage Devices'];

  const departments = [
    { value: 'Select Department', label: 'Select Department' },
    { value: 'Engineering', label: 'Engineering' },
    { value: 'IT', label: 'IT' },
    { value: 'Python', label: 'Python' },
    { value: 'HR', label: 'HR' },
    { value: 'Finance', label: 'Finance' },
    { value: 'Marketing', label: 'Marketing' },
    { value: 'Sales', label: 'Sales' },
    { value: 'Operations', label: 'Operations' }
  ];

  const handleAssetTypeChange = (type: string) => {
    setFormData({ ...formData, assetType: type });
  };

  const handleCommonAssetClick = (asset: string) => {
    setFormData({ ...formData, assetName: asset });
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Employee Information validation
    if (!formData.employeeCode.trim()) newErrors.employeeCode = 'Employee Code is required';
    if (!formData.fullName.trim()) newErrors.fullName = 'Full Name is required';
    if (!formData.department.trim()) newErrors.department = 'Department is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = 'Please enter a valid email address';

    // Asset Details validation
    if (!formData.assetName.trim()) newErrors.assetName = 'Asset Name is required';
    if (!formData.justification.trim()) newErrors.justification = 'Justification is required';
    if (formData.justification.trim().length < 10) newErrors.justification = 'Justification must be at least 10 characters';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Prepare the request payload matching backend API structure
      const requestPayload = {
        employeeInfo: {
          employeeCode: formData.employeeCode,
          fullName: formData.fullName,
          department: formData.department,
          email: formData.email
        },
        assetDetails: {
          assetType: formData.assetType,
          assetName: formData.assetName,
          quantity: formData.quantity,
          justification: formData.justification,
          priority: formData.priority
        }
      };

      console.log('Submitting asset request:', requestPayload);

      // Make API call to backend
      const authHeaders = getAuthHeaders();
      const response = await fetch(ESS_PORTAL_ENDPOINTS.ASSETS.CREATE(), {
        method: 'POST',
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json',
          'accept': 'application/json'
        },
        body: JSON.stringify(requestPayload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        console.log('Asset request created successfully:', result.data);

        // Show success message
        toast.success(`Asset request submitted successfully! Request ID: ${result.data.requestId}, Status: ${result.data.status}`);

        // Redirect to assets page
        router.push('/ess-portal/assets');
      } else {
        throw new Error(result.message || 'Failed to create asset request');
      }

    } catch (error) {
      console.error('Error submitting asset request:', error);
      toast.error(`Error submitting asset request: ${error instanceof Error ? error.message : 'Please try again.'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getAssetTypeIcon = (type: string) => {
    switch (type) {
      case 'Hardware':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V8zm0 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1v-2z" clipRule="evenodd" />
          </svg>
        );
      case 'Software':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V8zm0 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1v-2z" clipRule="evenodd" />
          </svg>
        );
    }
  };

  const handleBack = () => {
    router.push('/ess-portal/assets');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Dashboard Header */}
        <DashboardHeader
          title="Request Asset"
          subtitle="Submit your asset request with comprehensive details for quick approval and efficient resource allocation."
          icon={Package}
          iconColor="text-white"
          hideTenantPrefix={true}
          breadcrumbs={[
            { label: 'Home', href: '/' },
            { label: 'ESS Portal', href: '/ess-portal' },
            { label: 'Assets', href: '/ess-portal/assets' },
            { label: 'Request' }
          ]}
          actions={
            <button
              onClick={handleBack}
              className="flex items-center px-6 py-3 bg-white/20 rounded-xl backdrop-blur-sm border border-white/30 text-white hover:bg-white/30 transition-all duration-200 hover:scale-105 whitespace-nowrap"
              title="Back to Asset Management"
            >
              <ArrowLeft className="w-5 h-5 mr-2 flex-shrink-0" />
              <span className="font-medium whitespace-nowrap">Back</span>
            </button>
          }
        />

        <form onSubmit={handleSubmit} className="space-y-8 mt-8">
          {/* Employee Information */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl dark:shadow-gray-900/50 border border-gray-200 dark:border-gray-700 hover:shadow-2xl transition-all duration-300 p-6 lg:p-8">
            <div className="flex items-center mb-6">
              <div className="p-3 rounded-xl bg-[#3366CC]/10 dark:bg-[#3366CC]/20 mr-4">
                <User className="w-6 h-6 text-[#3366CC] dark:text-[#4a7dd9]" />
              </div>
              <h2 className="text-2xl font-bold text-[#3366CC] dark:text-[#4a7dd9]">Employee Information</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-[#3366CC] dark:text-[#4a7dd9] mb-2">
                  Employee Code *
                </label>
                <input
                  type="text"
                  value={formData.employeeCode}
                  onChange={(e) => setFormData({ ...formData, employeeCode: e.target.value })}
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
                <label className="block text-sm font-medium text-[#3366CC] dark:text-[#4a7dd9] mb-2">
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
                    setFormData({ ...formData, fullName: value });
                  }}
                  onInput={(e) => {
                    // Extra layer: Remove numbers on input event
                    const target = e.target as HTMLInputElement;
                    let value = target.value.replace(/[^a-zA-Z\s\.\-\']/g, '');
                    if (target.value !== value) {
                      value = value.split(' ').map(word =>
                        word.length > 0 ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase() : ''
                      ).join(' ');
                      setFormData({ ...formData, fullName: value });
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
                      setFormData({ ...formData, fullName: capitalized });
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
                <label className="block text-sm font-medium text-[#3366CC] dark:text-[#4a7dd9] mb-2">
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
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3366CC]/50 dark:focus:ring-[#3366CC]/50 focus:border-[#3366CC] dark:focus:border-[#3366CC] bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-white/80 dark:hover:bg-gray-700/80 transition-all duration-200 shadow-sm hover:shadow-md appearance-none ${errors.department ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                        }`}
                    >
                      <option value="">Select Department</option>
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
                    <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                )}
                {errors.department && (
                  <p className="text-red-500 dark:text-red-400 text-sm mt-1">{errors.department}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-[#3366CC] dark:text-[#4a7dd9] mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
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

          {/* Asset Details */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl dark:shadow-gray-900/50 border border-gray-200 dark:border-gray-700 hover:shadow-2xl transition-all duration-300 p-6 lg:p-8">
            <div className="flex items-center mb-6">
              <div className="p-3 rounded-xl bg-[#3366CC]/10 dark:bg-[#3366CC]/20 mr-4">
                <Package className="w-6 h-6 text-[#3366CC] dark:text-[#4a7dd9]" />
              </div>
              <h2 className="text-2xl font-bold text-[#3366CC] dark:text-[#4a7dd9]">Asset Details</h2>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-[#3366CC] dark:text-[#4a7dd9] mb-2">
                  Asset Type *
                </label>
                <select
                  value={formData.assetType}
                  onChange={(e) => handleAssetTypeChange(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3366CC]/50 dark:focus:ring-[#3366CC]/50 focus:border-[#3366CC] dark:focus:border-[#3366CC] bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-white/80 dark:hover:bg-gray-700/80 transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  {assetTypes.map((type) => (
                    <option key={type} value={type} className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white">{type}</option>
                  ))}
                </select>
                <div className="mt-2">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-[#3366CC]/10 dark:bg-[#3366CC]/20 text-[#3366CC] dark:text-[#4a7dd9] border border-[#3366CC]/30 dark:border-[#3366CC]/40">
                    {getAssetTypeIcon(formData.assetType)}
                    <span className="ml-2">{formData.assetType}</span>
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-[#3366CC] dark:text-[#4a7dd9] mb-2">
                    Priority *
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3366CC]/50 dark:focus:ring-[#3366CC]/50 focus:border-[#3366CC] dark:focus:border-[#3366CC] bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-white/80 dark:hover:bg-gray-700/80 transition-all duration-200 shadow-sm hover:shadow-md"
                  >
                    {priorities.map((priority) => (
                      <option key={priority} value={priority} className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white">{priority}</option>
                    ))}
                  </select>
                  <div className="mt-2">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${formData.priority === 'High' || formData.priority === 'Urgent'
                      ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 border border-red-300 dark:border-red-700'
                      : formData.priority === 'Medium'
                        ? 'bg-[#3366CC]/10 dark:bg-[#3366CC]/20 text-[#3366CC] dark:text-[#4a7dd9] border border-[#3366CC]/30 dark:border-[#3366CC]/40'
                        : 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 border border-green-300 dark:border-green-700'
                      }`}>
                      {formData.priority} Priority
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#3366CC] dark:text-[#4a7dd9] mb-2">
                    Quantity *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3366CC]/50 dark:focus:ring-[#3366CC]/50 focus:border-[#3366CC] dark:focus:border-[#3366CC] bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-400 hover:bg-white/80 dark:hover:bg-gray-700/80 transition-all duration-200 shadow-sm hover:shadow-md"
                  />
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Maximum 10 items per request</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#3366CC] dark:text-[#4a7dd9] mb-2">
                  Asset Name *
                </label>
                <input
                  type="text"
                  value={formData.assetName}
                  onChange={(e) => setFormData({ ...formData, assetName: e.target.value })}
                  placeholder="e.g., MacBook Pro, Microsoft Office License, Office Chair"
                  className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3366CC]/50 dark:focus:ring-[#3366CC]/50 focus:border-[#3366CC] dark:focus:border-[#3366CC] bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-400 hover:bg-white/80 dark:hover:bg-gray-700/80 transition-all duration-200 shadow-sm hover:shadow-md ${errors.assetName ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                    }`}
                />
                {errors.assetName && (
                  <p className="text-red-500 dark:text-red-400 text-sm mt-1">{errors.assetName}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-[#3366CC] dark:text-[#4a7dd9] mb-2">Common Assets</label>
                <div className="flex flex-wrap gap-2">
                  {commonAssets.map((asset) => (
                    <button
                      key={asset}
                      type="button"
                      onClick={() => handleCommonAssetClick(asset)}
                      className="px-3 py-1 bg-[#3366CC]/10 dark:bg-[#3366CC]/20 text-[#3366CC] dark:text-[#4a7dd9] rounded-full text-sm hover:bg-[#3366CC]/20 dark:hover:bg-[#3366CC]/30 border border-[#3366CC]/30 dark:border-[#3366CC]/40 transition-colors"
                    >
                      {asset}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#3366CC] dark:text-[#4a7dd9] mb-2">Request Date</label>
                <input
                  type="text"
                  value={currentDate}
                  readOnly
                  className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-600 dark:text-gray-300"
                />
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Automatically set to today&apos;s date</p>
              </div>
            </div>
          </div>

          {/* Justification */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl dark:shadow-gray-900/50 border border-gray-200 dark:border-gray-700 hover:shadow-2xl transition-all duration-300 p-6 lg:p-8">
            <div className="flex items-center mb-6">
              <div className="p-3 rounded-xl bg-[#3366CC]/10 dark:bg-[#3366CC]/20 mr-4">
                <FileText className="w-6 h-6 text-[#3366CC] dark:text-[#4a7dd9]" />
              </div>
              <h2 className="text-2xl font-bold text-[#3366CC] dark:text-[#4a7dd9]">Justification</h2>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-[#3366CC] dark:text-[#4a7dd9] mb-2">
                Provide detailed reason for this asset request *
              </label>
              <textarea
                value={formData.justification}
                onChange={(e) => setFormData({ ...formData, justification: e.target.value })}
                placeholder="Please explain why you need this asset, how it will be used, and its impact on your work productivity..."
                rows={6}
                maxLength={500}
                className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3366CC]/50 dark:focus:ring-[#3366CC]/50 focus:border-[#3366CC] dark:focus:border-[#3366CC] bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-400 hover:bg-white/80 dark:hover:bg-gray-700/80 transition-all duration-200 shadow-sm hover:shadow-md resize-none ${errors.justification ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
              />
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {formData.justification.length}/500 characters (minimum 10 required)
              </p>
              {errors.justification && (
                <p className="text-red-500 dark:text-red-400 text-sm mt-1">{errors.justification}</p>
              )}
            </div>

            {/* Request Guidelines */}
            <div className="bg-[#3366CC]/10 dark:bg-[#3366CC]/20 border border-[#3366CC]/30 dark:border-[#3366CC]/40 rounded-lg p-4 mb-6">
              <h3 className="text-sm font-semibold text-[#3366CC] dark:text-[#4a7dd9] mb-3">Request Guidelines:</h3>
              <ul className="text-sm text-[#3366CC] dark:text-[#4a7dd9] space-y-1">
                <li>• Be specific about the asset name and model if applicable</li>
                <li>• Explain how this asset will improve your work efficiency</li>
                <li>• Mention if this replaces an existing asset or is additional</li>
                <li>• For software, specify if you need a specific version or license type</li>
                <li>• Include any urgent business requirements or deadlines</li>
              </ul>
            </div>

            {/* Request Summary */}
            <div className="bg-[#3366CC] text-white py-8 px-8 rounded-2xl shadow-2xl border border-[#3366CC]/40 dark:border-[#3366CC]/60 mt-8">
              <div className="text-center">
                <div className="flex items-center justify-center mb-4">
                  <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm border border-white/30 mr-4">
                    <CheckCircle className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold">Request Summary</h3>
                </div>
                <div className="flex items-center justify-center space-x-4">
                  <div className="flex items-center px-4 py-2 bg-white/20 rounded-xl backdrop-blur-sm border border-white/30">
                    <div className="w-2 h-2 bg-cyan-400 rounded-full mr-3"></div>
                    <span className="text-sm font-medium">Asset: {formData.assetName || 'Not specified'}</span>
                  </div>
                  <div className="flex items-center px-4 py-2 bg-white/20 rounded-xl backdrop-blur-sm border border-white/30">
                    <div className="w-2 h-2 bg-emerald-400 rounded-full mr-3"></div>
                    <span className="text-sm font-medium">Type: {formData.assetType} • Priority: {formData.priority}</span>
                  </div>
                  <div className="flex items-center px-4 py-2 bg-white/20 rounded-xl backdrop-blur-sm border border-white/30">
                    <div className="w-2 h-2 bg-violet-400 rounded-full mr-3"></div>
                    <span className="text-sm font-medium">Qty: {formData.quantity} • Date: {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Submit Button Section */}
          <div className="flex justify-start mt-8">
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex items-center px-8 py-4 bg-[#3366CC] hover:bg-[#2d5bb3] text-white rounded-2xl shadow-2xl border border-[#3366CC]/40 dark:border-[#3366CC]/60 transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Submit Asset Request"
            >
              {isSubmitting ? (
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin mr-3 flex-shrink-0"></div>
              ) : (
                <CheckCircle className="w-6 h-6 mr-3 flex-shrink-0" />
              )}
              <span className="text-lg font-semibold">
                {isSubmitting ? 'Submitting...' : 'Submit Request'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RequestAssetForm;