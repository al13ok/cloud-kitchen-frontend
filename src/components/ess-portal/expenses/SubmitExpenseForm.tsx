"use client";

import { ESS_PORTAL_ENDPOINTS, essApiFetch } from '@/utils/essApi';

import Image from 'next/image';
import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { BACKEND_URL, getAuthHeaders } from '@/utils/api';
import DashboardHeader from '@/components/header/DashboardHeader';
import { DollarSign, ArrowLeft } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface ExpenseFormData {
  employeeCode: string;
  fullName: string;
  department: string;
  email: string;
  title: string;
  category: string;
  amount: number;
  currency: string;
  date: string;
  description: string;
  receipt: File | null;
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

const SubmitExpenseForm: React.FC = () => {
  const router = useRouter();
  const { user } = useAuth();
  const dateInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<ExpenseFormData>({
    employeeCode: '',
    fullName: '',
    department: '',
    email: '',
    title: '',
    category: '',
    amount: 0,
    currency: 'INR',
    date: '',
    description: '',
    receipt: null
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showReceiptPreview, setShowReceiptPreview] = useState(false);
  const [receiptPreviewUrl, setReceiptPreviewUrl] = useState<string | null>(null);
  const [autoFilledFields, setAutoFilledFields] = useState<Set<string>>(new Set());
  const [isLoadingEmployeeData, setIsLoadingEmployeeData] = useState(false);

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
              const updates: ExpenseFormData = { ...prev };
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
              console.log('✅ Auto-filled email in expense form:', userEmail);
            }
            if (userName) {
              console.log('✅ Auto-filled name in expense form:', userName);
            }
            if (userCode) {
              console.log('✅ Auto-filled employee code in expense form:', userCode);
            }
            if (userDept) {
              console.log('✅ Auto-filled department in expense form:', userDept);
            }
          }
        } catch (error) {
          console.warn('⚠️ Could not auto-fill expense form data:', error);
        }
      };

      updateFormData();
    }
  }, [user]);

  const categories = [
    { value: 'Meal', label: 'Meal' },
    { value: 'Travel', label: 'Travel' },
    { value: 'Stationery', label: 'Stationery' },
    { value: 'Other', label: 'Other' }
  ];

  const currencies = [
    { value: 'INR', label: 'INR (₹)' }
  ];

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

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Employee Information validation
    if (!formData.employeeCode.trim()) newErrors.employeeCode = 'Employee Code is required';
    if (!formData.fullName.trim()) newErrors.fullName = 'Full Name is required';
    if (!formData.department.trim()) newErrors.department = 'Department is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Email is invalid';

    // Expense Details validation
    if (!formData.title.trim()) newErrors.title = 'Title is required';
    if (!formData.category) newErrors.category = 'Category is required';
    if (!formData.amount || formData.amount <= 0) newErrors.amount = 'Amount must be greater than 0';
    if (!formData.currency) newErrors.currency = 'Currency is required';
    if (!formData.date) newErrors.date = 'Date is required';
    if (!formData.description.trim()) newErrors.description = 'Description is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      // Prepare the data in the format expected by the backend
      const expenseData = {
        employeeInfo: {
          employeeCode: formData.employeeCode,
          fullName: formData.fullName,
          department: formData.department,
          email: formData.email
        },
        expenseDetails: {
          title: formData.title,
          category: formData.category,
          amount: formData.amount,
          currency: formData.currency,
          date: formData.date,
          description: formData.description,
          receiptFileName: formData.receipt?.name || null
        }
      };

      const response = await essApiFetch(ESS_PORTAL_ENDPOINTS.EXPENSES.CREATE(), {
        method: 'POST',
        body: JSON.stringify(expenseData),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Failed to submit expense');
      }

      toast.success(result.message || 'Expense submitted successfully!');
      router.push('/ess-portal/expenses');
    } catch (error) {
      console.error('Error submitting expense:', error);
      toast.error(`Error submitting expense: ${error instanceof Error ? error.message : 'Please try again.'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof ExpenseFormData, value: string | number | File | null) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setFormData(prev => ({ ...prev, receipt: file }));

    // Create preview URL for the uploaded file
    if (file) {
      const url = URL.createObjectURL(file);
      setReceiptPreviewUrl(url);
    } else {
      if (receiptPreviewUrl) {
        URL.revokeObjectURL(receiptPreviewUrl);
      }
      setReceiptPreviewUrl(null);
    }
  };

  const showDatePicker = () => {
    if (dateInputRef.current) {
      dateInputRef.current.showPicker();
    }
  };

  const handleViewReceipt = () => {
    if (receiptPreviewUrl) {
      setShowReceiptPreview(true);
    }
  };

  const handleCloseReceiptPreview = () => {
    setShowReceiptPreview(false);
  };

  const getFileType = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(extension || '')) {
      return 'image';
    } else if (extension === 'pdf') {
      return 'pdf';
    }
    return 'unknown';
  };

  const handleBack = () => {
    router.push('/ess-portal/expenses');
  };

  return (
    <div className="min-h-screen relative overflow-hidden dark:bg-black" style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.03) 0%, rgba(99, 102, 241, 0.03) 50%, rgba(14, 165, 233, 0.03) 100%)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        {/* Dashboard Header */}
        <DashboardHeader
          title="Submit Expense Claim"
          subtitle="Submit your expense claim with comprehensive details for quick approval and seamless financial management."
          icon={DollarSign}
          iconColor="text-white"
          hideTenantPrefix={true}
          breadcrumbs={[
            { label: 'Home', href: '/' },
            { label: 'ESS Portal', href: '/ess-portal' },
            { label: 'Expenses', href: '/ess-portal/expenses' },
            { label: 'Submit' }
          ]}
          actions={
            <button
              onClick={handleBack}
              className="flex items-center px-6 py-3 bg-white/20 rounded-xl backdrop-blur-sm border border-white/30 text-white hover:bg-white/30 transition-all duration-200 hover:scale-105 whitespace-nowrap"
              title="Back to Expenses"
            >
              <ArrowLeft className="w-5 h-5 mr-2 flex-shrink-0" />
              <span className="font-medium whitespace-nowrap">Back</span>
            </button>
          }
        />

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Employee Information Section */}
          <div className="group bg-white dark:bg-gray-800 rounded-2xl shadow-xl dark:shadow-gray-900/50 border border-gray-200 dark:border-gray-700 hover:shadow-2xl transition-all duration-300 p-8">
            <div className="flex items-center mb-8">
              <div className="p-3 bg-[#3366CC] rounded-xl mr-4 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
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
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.employeeCode}</p>
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
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.fullName}</p>
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
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.department}</p>
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
                  placeholder="Enter email address"
                  readOnly={autoFilledFields.has('email')}
                  disabled={autoFilledFields.has('email')}
                  className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3366CC]/50 dark:focus:ring-[#3366CC]/50 focus:border-[#3366CC] dark:focus:border-[#3366CC] bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-400 hover:bg-white/80 dark:hover:bg-gray-700/80 transition-all duration-200 shadow-sm hover:shadow-md ${errors.email ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                    } ${autoFilledFields.has('email') ? 'bg-gray-100 dark:bg-gray-600 cursor-not-allowed opacity-75' : ''}`}
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.email}</p>
                )}
              </div>
            </div>
          </div>

          {/* Expense Details Section */}
          <div className="group bg-white dark:bg-gray-800 rounded-2xl shadow-xl dark:shadow-gray-900/50 border border-gray-200 dark:border-gray-700 hover:shadow-2xl transition-all duration-300 p-8">
            <div className="flex items-center mb-8">
              <div className="p-3 bg-[#3366CC] rounded-xl mr-4 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-[#3366CC] dark:text-[#4a7dd9]">Expense Details</h2>
            </div>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Expense Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3366CC]/50 dark:focus:ring-[#3366CC]/50 focus:border-[#3366CC] dark:focus:border-[#3366CC] bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-400 hover:bg-white/80 dark:hover:bg-gray-700/80 transition-all duration-200 shadow-sm hover:shadow-md ${errors.title ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                    }`}
                  placeholder="e.g., Client meeting lunch, Travel to Mumbai"
                />
                {errors.title && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.title}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Amount *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400">₹</span>
                    <input
                      type="number"
                      value={formData.amount}
                      onChange={(e) => handleInputChange('amount', parseFloat(e.target.value) || 0)}
                      className={`w-full pl-8 pr-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3366CC]/50 dark:focus:ring-[#3366CC]/50 focus:border-[#3366CC] dark:focus:border-[#3366CC] bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-400 hover:bg-white/80 dark:hover:bg-gray-700/80 transition-all duration-200 shadow-sm hover:shadow-md ${errors.amount ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                        }`}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  {errors.amount && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.amount}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Currency *
                  </label>
                  <div className="relative">
                    <select
                      value={formData.currency}
                      onChange={(e) => handleInputChange('currency', e.target.value)}
                      className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3366CC]/50 dark:focus:ring-[#3366CC]/50 focus:border-[#3366CC] dark:focus:border-[#3366CC] bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-white/80 dark:hover:bg-gray-700/80 transition-all duration-200 shadow-sm hover:shadow-md appearance-none ${errors.currency ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                        }`}
                    >
                      {currencies.map((currency) => (
                        <option key={currency.value} value={currency.value} className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                          {currency.label}
                        </option>
                      ))}
                    </select>
                    <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                  {errors.currency && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.currency}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Category *
                  </label>
                  <div className="relative">
                    <select
                      value={formData.category}
                      onChange={(e) => handleInputChange('category', e.target.value)}
                      className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3366CC]/50 dark:focus:ring-[#3366CC]/50 focus:border-[#3366CC] dark:focus:border-[#3366CC] bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-white/80 dark:hover:bg-gray-700/80 transition-all duration-200 shadow-sm hover:shadow-md appearance-none ${errors.category ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                        }`}
                    >
                      <option value="" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white">Select category</option>
                      {categories.map((category) => (
                        <option key={category.value} value={category.value} className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                          {category.label}
                        </option>
                      ))}
                    </select>
                    <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                  {formData.category && (
                    <div className="mt-2">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-[#3366CC]/10 dark:bg-[#3366CC]/20 text-[#3366CC] dark:text-[#4a7dd9] border border-[#3366CC]/30 dark:border-[#3366CC]/40">
                        {formData.category}
                      </span>
                    </div>
                  )}
                  {errors.category && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.category}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Date of Expense *
                  </label>
                  <div className="relative">
                    <input
                      ref={dateInputRef}
                      type="date"
                      value={formData.date}
                      onChange={(e) => handleInputChange('date', e.target.value)}
                      onClick={showDatePicker}
                      onFocus={showDatePicker}
                      className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3366CC]/50 dark:focus:ring-[#3366CC]/50 focus:border-[#3366CC] dark:focus:border-[#3366CC] bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-white/80 dark:hover:bg-gray-700/80 transition-all duration-200 shadow-sm hover:shadow-md ${errors.date ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                        }`}
                    />
                    <button
                      type="button"
                      onClick={showDatePicker}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-[#3366CC] dark:hover:text-[#4a7dd9]"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </button>
                  </div>
                  {errors.date && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.date}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description *
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  rows={4}
                  className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3366CC]/50 dark:focus:ring-[#3366CC]/50 focus:border-[#3366CC] dark:focus:border-[#3366CC] bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-400 hover:bg-white/80 dark:hover:bg-gray-700/80 transition-all duration-200 shadow-sm hover:shadow-md ${errors.description ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                    }`}
                  placeholder="Provide detailed description of the expense..."
                />
                {errors.description && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.description}</p>
                )}
              </div>
            </div>
          </div>

          {/* Receipt Upload Section */}
          <div className="group bg-white dark:bg-gray-800 rounded-2xl shadow-xl dark:shadow-gray-900/50 border border-gray-200 dark:border-gray-700 hover:shadow-2xl transition-all duration-300 p-8">
            <div className="flex items-center mb-8">
              <div className="p-3 bg-[#3366CC] rounded-xl mr-4 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-[#3366CC] dark:text-[#4a7dd9]">Receipt Upload</h2>
            </div>
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center bg-gray-50 dark:bg-gray-900/50 hover:bg-gray-100 dark:hover:bg-gray-900/70 transition-all duration-300">
              <div className="p-4 bg-[#3366CC]/10 dark:bg-[#3366CC]/20 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <svg className="w-8 h-8 text-[#3366CC] dark:text-[#4a7dd9]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <p className="text-gray-600 dark:text-gray-300 mb-6 font-medium">Upload receipt or invoice (JPG, PNG, PDF - Max 5MB)</p>
              <input
                type="file"
                onChange={handleFileChange}
                accept="image/*,.pdf"
                className="hidden"
                id="receipt-upload"
              />
              <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
                <label
                  htmlFor="receipt-upload"
                  className="inline-flex items-center px-6 py-3 bg-[#3366CC] hover:bg-[#2d5bb3] text-white rounded-xl cursor-pointer shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  Choose File
                </label>

                {formData.receipt && (
                  <button
                    type="button"
                    onClick={handleViewReceipt}
                    className="inline-flex items-center px-6 py-3 bg-[#3366CC] hover:bg-[#2d5bb3] text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    View Receipt
                  </button>
                )}
              </div>

              {formData.receipt && (
                <div className="mt-4 p-4 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-[#3366CC]/10 dark:bg-[#3366CC]/20 rounded-lg">
                        {getFileType(formData.receipt.name) === 'image' ? (
                          <svg className="w-5 h-5 text-[#3366CC] dark:text-[#4a7dd9]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5 text-[#3366CC] dark:text-[#4a7dd9]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-800 dark:text-white">{formData.receipt.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{(formData.receipt.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-1 bg-[#3366CC]/10 dark:bg-[#3366CC]/20 text-[#3366CC] dark:text-[#4a7dd9] text-xs font-medium rounded-full border border-[#3366CC]/30 dark:border-[#3366CC]/40">
                        {getFileType(formData.receipt.name).toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </form>

        {/* Request Summary Footer */}
        <div className="group bg-white dark:bg-gray-800 rounded-2xl shadow-2xl dark:shadow-gray-900/50 border border-gray-200 dark:border-gray-700 hover:shadow-3xl transition-all duration-300 mt-8 overflow-hidden">
          {/* Header Section */}
          <div className="bg-[#3366CC] px-8 py-6">
            <div className="flex items-center justify-center">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl mr-4 shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-white">Request Summary</h3>
            </div>
          </div>

          {/* Content Section */}
          <div className="p-8 bg-white dark:bg-gray-800">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Expense Type Card */}
              <div className="bg-[#3366CC]/10 dark:bg-[#3366CC]/20 rounded-xl p-6 border border-[#3366CC]/30 dark:border-[#3366CC]/40 shadow-sm hover:shadow-md transition-all duration-300">
                <div className="flex items-center mb-4">
                  <div className="p-2 bg-[#3366CC] rounded-lg mr-3">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                  </div>
                  <h4 className="text-lg font-semibold text-gray-800 dark:text-white">Expense Type</h4>
                </div>
                <p className="text-2xl font-bold text-[#3366CC] dark:text-[#4a7dd9] mb-2">{formData.category || 'Not Selected'}</p>
                <p className="text-sm text-gray-600 dark:text-gray-300">Category selected for this claim</p>
              </div>

              {/* Amount Card */}
              <div className="bg-[#3366CC]/10 dark:bg-[#3366CC]/20 rounded-xl p-6 border border-[#3366CC]/30 dark:border-[#3366CC]/40 shadow-sm hover:shadow-md transition-all duration-300">
                <div className="flex items-center mb-4">
                  <div className="p-2 bg-[#3366CC] rounded-lg mr-3">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                  </div>
                  <h4 className="text-lg font-semibold text-gray-800 dark:text-white">Amount</h4>
                </div>
                <p className="text-2xl font-bold text-[#3366CC] dark:text-[#4a7dd9] mb-2">₹{formData.amount || '0.00'}</p>
                <p className="text-sm text-gray-600 dark:text-gray-300">Total expense amount</p>
              </div>

              {/* Date Card */}
              <div className="bg-[#3366CC]/10 dark:bg-[#3366CC]/20 rounded-xl p-6 border border-[#3366CC]/30 dark:border-[#3366CC]/40 shadow-sm hover:shadow-md transition-all duration-300">
                <div className="flex items-center mb-4">
                  <div className="p-2 bg-[#3366CC] rounded-lg mr-3">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h4 className="text-lg font-semibold text-gray-800 dark:text-white">Date</h4>
                </div>
                <p className="text-2xl font-bold text-[#3366CC] dark:text-[#4a7dd9] mb-2">{formData.date ? new Date(formData.date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'Not Selected'}</p>
                <p className="text-sm text-gray-600 dark:text-gray-300">Expense occurred date</p>
              </div>
            </div>

            {/* Additional Info Section */}
            <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-[#3366CC] rounded-lg">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Employee</p>
                    <p className="text-lg font-semibold text-gray-800 dark:text-white">{formData.fullName || 'Not Provided'}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-[#3366CC] rounded-lg">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Department</p>
                    <p className="text-lg font-semibold text-gray-800 dark:text-white">{formData.department || 'Not Selected'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Status Indicator */}
            <div className="mt-6 flex items-center justify-center">
              <div className="flex items-center space-x-2 px-4 py-2 bg-[#3366CC]/10 dark:bg-[#3366CC]/20 rounded-full border border-[#3366CC]/30 dark:border-[#3366CC]/40">
                <div className="w-3 h-3 bg-[#3366CC] rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-[#3366CC] dark:text-[#4a7dd9]">Ready for Submission</span>
              </div>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-start mt-8">
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="group relative inline-flex items-center px-8 py-4 bg-[#3366CC] hover:bg-[#2d5bb3] text-white font-semibold rounded-2xl shadow-2xl hover:shadow-3xl transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            <div className="relative flex items-center">
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-3"></div>
              ) : (
                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              )}
              {isSubmitting ? 'Submitting...' : 'Submit Expense Claim'}
            </div>
          </button>
        </div>

        {/* Receipt Preview Modal */}
        {showReceiptPreview && receiptPreviewUrl && formData.receipt && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl max-h-[90vh] w-full overflow-hidden">
              {/* Modal Header */}
              <div className="bg-[#3366CC] px-6 py-4 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-white/20 rounded-lg">
                    {getFileType(formData.receipt.name) === 'image' ? (
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">Receipt Preview</h3>
                    <p className="text-white/80 text-sm">{formData.receipt.name}</p>
                  </div>
                </div>
                <button
                  onClick={handleCloseReceiptPreview}
                  className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors duration-200"
                >
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 max-h-[calc(90vh-120px)] overflow-auto bg-white dark:bg-gray-800">
                {getFileType(formData.receipt.name) === 'image' ? (
                  <div className="flex justify-center">
                    <Image
                      src={receiptPreviewUrl}
                      alt="Receipt Preview"
                      width={1024}
                      height={768}
                      unoptimized
                      className="max-w-full h-auto rounded-lg shadow-lg"
                      style={{ maxHeight: '70vh' }}
                      sizes="(max-width: 1024px) 100vw, 1024px"
                    />
                  </div>
                ) : getFileType(formData.receipt.name) === 'pdf' ? (
                  <div className="flex justify-center">
                    <iframe
                      src={receiptPreviewUrl}
                      className="w-full rounded-lg shadow-lg"
                      style={{ height: '70vh', minHeight: '500px' }}
                      title="PDF Preview"
                    />
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                      <svg className="w-8 h-8 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <h4 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">File Preview Not Available</h4>
                    <p className="text-gray-600 dark:text-gray-300 mb-4">This file type cannot be previewed in the browser.</p>
                    <a
                      href={receiptPreviewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-4 py-2 bg-[#3366CC] hover:bg-[#2d5bb3] text-white rounded-lg transition-colors duration-200"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      Open in New Tab
                    </a>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="bg-gray-50 dark:bg-gray-900 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-300">
                  <span>File Size: {(formData.receipt.size / 1024 / 1024).toFixed(2)} MB</span>
                  <span>Type: {getFileType(formData.receipt.name).toUpperCase()}</span>
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={handleCloseReceiptPreview}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors duration-200"
                  >
                    Close
                  </button>
                  <a
                    href={receiptPreviewUrl}
                    download={formData.receipt.name}
                    className="px-4 py-2 bg-[#3366CC] hover:bg-[#2d5bb3] text-white rounded-lg transition-colors duration-200"
                  >
                    Download
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SubmitExpenseForm;