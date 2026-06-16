'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getAuthHeaders } from '@/utils/api';
import DashboardHeader from '@/components/header/DashboardHeader';
import FinanceOverview from './FinanceOverview';
import FinancePayslip from './FinancePayslip';
import { DollarSign, FileText, BarChart3, RefreshCw, CheckCircle, XCircle, Eye, Filter, Search } from 'lucide-react';

type TabType = 'overview' | 'expense' | 'payslip';

// Interface for Finance Applications - Updated to match API response
interface FinanceApplication {
  id: string;
  expenseId: string;
  employeeInfo: {
    employeeCode: string;
    fullName: string;
    department: string;
    designation: string;
    email: string;
  };
  expenseDetails: {
    title: string;
    category: string;
    amount: number;
    currency: string;
    date: string;
    description: string;
    receiptFileName?: string;
  };
  status: string;
  createdAt: string;
  updatedAt: string;
}

const FinanceApprovals: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State for applications and filters
  const [applications, setApplications] = useState<FinanceApplication[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [selectedPriority, setSelectedPriority] = useState<string>('');

  const tabs = [
    { id: 'overview' as TabType, label: 'Overview', icon: BarChart3 },
    { id: 'expense' as TabType, label: 'Expense Applications', icon: DollarSign },
    { id: 'payslip' as TabType, label: 'Payslips', icon: FileText },
  ];

  // API Configuration - Always use full absolute URL
  const getApiBase = () => {
    // Get base URL from environment or default
    const baseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL ||
      process.env.NEXT_PUBLIC_BACKEND_URL ||
      'https://py-mobiloitte.converiqo.ai').replace(/\/+$/, ''); // Remove trailing slashes

    // Always ensure we have the full path to ess-portal endpoints
    // If baseUrl already includes /api/v1/ess-portal, use it as is
    if (baseUrl.includes('/api/v1/ess-portal')) {
      return baseUrl;
    }

    // Otherwise, append the ess-portal path
    return `${baseUrl}/api/v1/ess-portal`;
  };

  // Compute API_BASE at component level (not inside function)
  const API_BASE = getApiBase();

  // Narrow API response shape to avoid any
  type ApiExpense = {
    id?: string;
    expenseId?: string;
    status?: string;
    employeeInfo?: {
      employeeCode?: string;
      fullName?: string;
      department?: string;
      designation?: string;
      email?: string;
    };
    expenseDetails?: {
      title?: string;
      category?: string;
      amount?: number;
      currency?: string;
      date?: string;
      description?: string;
      receiptFileName?: string;
    };
    createdAt?: string;
    updatedAt?: string;
    [key: string]: unknown;
  };

  // Helper function for fetch with timeout and retry
  // Define as useCallback to ensure stable reference
  const fetchWithRetry = useCallback(async (url: string, options: RequestInit = {}, retries = 3): Promise<Response> => {
    const timeout = 10000; // 10 seconds timeout
    const authHeaders = getAuthHeaders();

    for (let i = 0; i < retries; i++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        console.log(`🔍 FinanceApprovals - Fetching from: ${url} (Attempt ${i + 1})`);

        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...authHeaders,
            ...options.headers,
          },
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unable to read error response');
          console.error(`❌ FinanceApprovals - HTTP Error ${response.status} for URL: ${url}`);
          console.error(`❌ Response:`, errorText);
          throw new Error(`HTTP error! status: ${response.status}, URL: ${url}`);
        }

        return response;
      } catch (error) {
        console.warn(`Attempt ${i + 1} failed:`, error);
        if (i === retries - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
    throw new Error('All retry attempts failed');
  }, []);

  // Fetch applications from API - only manager-approved expenses
  // Define as useCallback so it can be used in other handlers
  const fetchApplications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Construct full absolute URL - ensure it includes /api/v1/ess-portal
      const expensesUrl = `${API_BASE}/expenses`;

      // Validate URL format
      if (!expensesUrl.startsWith('http://') && !expensesUrl.startsWith('https://')) {
        throw new Error(`Invalid URL format: ${expensesUrl}. URL must start with http:// or https://`);
      }

      // Ensure URL contains the correct path
      if (!expensesUrl.includes('/api/v1/ess-portal/expenses')) {
        console.warn(`⚠️ FinanceApprovals - URL may be incorrect: ${expensesUrl}`);
        console.warn(`⚠️ Expected URL should contain: /api/v1/ess-portal/expenses`);
      }

      console.log('🔍 FinanceApprovals - Final expenses URL:', expensesUrl);
      console.log('🔍 FinanceApprovals - API_BASE:', API_BASE);
      console.log('🔍 FinanceApprovals - Environment:', {
        NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
        NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL
      });

      const response = await fetchWithRetry(expensesUrl);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ FinanceApprovals - API Error (${response.status}):`, errorText);
        throw new Error(`Failed to fetch expenses: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success && result.data) {
        // Filter for manager-approved expenses AND finance-approved/rejected expenses
        // Show all expenses that Finance team has worked on or needs to work on
        const financeRelevantExpenses = (result.data as ApiExpense[]).filter((app) => {
          const status = String(app.status || '').toLowerCase();
          return status === 'manager_approved' || status === 'manager approved' ||
            status === 'approved' ||
            status === 'finance_approved' || status === 'finance approved' ||
            status === 'finance_rejected' || status === 'finance rejected' ||
            status === 'rejected'; // Include rejected for backward compatibility
        });
        // Map API to FinanceApplication shape to satisfy state type
        const mapped: FinanceApplication[] = financeRelevantExpenses.map((app) => ({
          id: String(app.id || app.expenseId || ''),
          expenseId: String(app.expenseId || app.id || ''),
          employeeInfo: {
            employeeCode: app.employeeInfo?.employeeCode || '',
            fullName: app.employeeInfo?.fullName || '',
            department: app.employeeInfo?.department || '',
            designation: app.employeeInfo?.designation || '',
            email: app.employeeInfo?.email || '',
          },
          expenseDetails: {
            title: app.expenseDetails?.title || '',
            category: app.expenseDetails?.category || '',
            amount: app.expenseDetails?.amount || 0,
            currency: app.expenseDetails?.currency || 'INR',
            date: app.expenseDetails?.date || '',
            description: app.expenseDetails?.description || '',
            receiptFileName: app.expenseDetails?.receiptFileName,
          },
          status: app.status || 'pending',
          createdAt: app.createdAt || '',
          updatedAt: app.updatedAt || '',
        }));
        setApplications(mapped);
      } else {
        throw new Error(result.detail || 'Failed to fetch applications');
      }
    } catch (error) {
      console.error('Error fetching applications:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch applications');
      setApplications([]);
    } finally {
      setLoading(false);
    }
  }, [API_BASE, fetchWithRetry]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchApplications();
    setRefreshing(false);
  };

  // Initialize applications on component mount
  React.useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  // Filter applications based on search and filters
  const filteredApplications = useMemo(() => {
    let filtered = applications;

    if (searchTerm && searchTerm.trim() !== '') {
      const q = searchTerm.trim().toLowerCase();
      filtered = filtered.filter(app =>
        (app.expenseId || app.id || '').toLowerCase().includes(q) ||
        (app.employeeInfo?.fullName || '').toLowerCase().includes(q) ||
        (app.expenseDetails?.description || '').toLowerCase().includes(q) ||
        (app.expenseDetails?.category || '').toLowerCase().includes(q) ||
        (app.expenseDetails?.title || '').toLowerCase().includes(q)
      );
    }

    if (selectedStatus) {
      filtered = filtered.filter(app => {
        const appStatus = (app.status || '').toLowerCase();
        const filterStatus = selectedStatus.toLowerCase();

        // Handle multiple status variations
        if (filterStatus === 'approved' || filterStatus === 'manager_approved' || filterStatus === 'manager approved') {
          return appStatus === 'approved' || appStatus === 'manager_approved' || appStatus === 'manager approved';
        }
        if (filterStatus === 'finance_approved' || filterStatus === 'finance approved') {
          return appStatus === 'finance_approved' || appStatus === 'finance approved';
        }
        if (filterStatus === 'finance_rejected' || filterStatus === 'finance rejected') {
          return appStatus === 'finance_rejected' || appStatus === 'finance rejected' || appStatus === 'rejected';
        }

        // Exact match for other statuses
        return appStatus === filterStatus;
      });
    }

    if (selectedType) {
      filtered = filtered.filter(app => (app.expenseDetails?.category || '').toLowerCase().includes(selectedType.toLowerCase()));
    }

    if (selectedDepartment) {
      filtered = filtered.filter(app => (app.employeeInfo?.department || '').toLowerCase().includes(selectedDepartment.toLowerCase()));
    }

    if (selectedPriority) {
      // For now, we'll use amount as priority indicator since API doesn't have priority field
      filtered = filtered.filter(app => {
        const amount = app.expenseDetails?.amount || 0;
        if (selectedPriority === 'high') return amount > 10000;
        if (selectedPriority === 'normal') return amount >= 1000 && amount <= 10000;
        if (selectedPriority === 'low') return amount < 1000;
        return true;
      });
    }

    return filtered;
  }, [applications, searchTerm, selectedStatus, selectedType, selectedDepartment, selectedPriority]);

  // Utility functions
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Action handlers
  const router = useRouter();

  const handleView = useCallback((applicationId: string) => {
    router.push(`/ess-portal/finance/view?id=${encodeURIComponent(applicationId)}`);
  }, [router]);

  const handleApprove = useCallback(async (applicationId: string) => {
    try {
      setError(null); // Clear previous errors
      const response = await fetchWithRetry(`${API_BASE}/expenses/${applicationId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'Finance_Approved'
        })
      });

      const result = await response.json();

      if (result.success) {
        // Refresh the applications list WITHOUT page reload (preserves active tab)
        await fetchApplications();
        console.log('✅ Application approved successfully - staying on Expense Applications tab');
      } else {
        throw new Error(result.detail || 'Failed to approve application');
      }
    } catch (error) {
      console.error('❌ Error approving application:', error);
      setError(error instanceof Error ? error.message : 'Failed to approve application');
    }
  }, [fetchApplications, fetchWithRetry, API_BASE]);

  const handleReject = useCallback(async (applicationId: string) => {
    try {
      setError(null); // Clear previous errors
      const response = await fetchWithRetry(`${API_BASE}/expenses/${applicationId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'Finance_Rejected'
        })
      });

      const result = await response.json();

      if (result.success) {
        // Refresh the applications list WITHOUT page reload (preserves active tab)
        await fetchApplications();
        console.log('✅ Application rejected successfully - staying on Expense Applications tab');
      } else {
        throw new Error(result.detail || 'Failed to reject application');
      }
    } catch (error) {
      console.error('❌ Error rejecting application:', error);
      setError(error instanceof Error ? error.message : 'Failed to reject application');
    }
  }, [fetchApplications, fetchWithRetry, API_BASE]);

  // StatusTag component
  const StatusTag: React.FC<{ status: string }> = ({ status }) => {
    let bgColor = 'bg-gray-100 text-gray-700';
    let label = status.charAt(0).toUpperCase() + status.slice(1);

    switch (status.toLowerCase()) {
      case 'manager_approved':
      case 'manager approved':
        bgColor = 'bg-blue-100 text-blue-700 font-medium';
        label = 'Manager Approved';
        break;
      case 'approved':
        bgColor = 'bg-blue-100 text-blue-700 font-medium';
        label = 'Manager Approved';
        break;
      case 'finance_approved':
      case 'finance approved':
        bgColor = 'bg-green-100 text-green-700 font-medium';
        label = 'Manager Approved, Finance Approved';
        break;
      case 'manager_rejected':
      case 'manager rejected':
        bgColor = 'bg-red-100 text-red-700 font-medium';
        label = 'Manager Rejected';
        break;
      case 'finance_rejected':
      case 'finance rejected':
        bgColor = 'bg-red-100 text-red-700 font-medium';
        label = 'Manager Approved, Finance Rejected';
        break;
      case 'pending':
        bgColor = 'bg-yellow-100 text-yellow-700 font-medium';
        label = 'Pending';
        break;
      case 'high':
        bgColor = 'bg-red-500 text-white font-medium';
        break;
      case 'normal':
        bgColor = 'bg-indigo-500 text-white font-medium';
        break;
      case 'low':
        bgColor = 'bg-blue-500 text-white font-medium';
        break;
      case 'travel':
        bgColor = 'bg-purple-100 text-purple-700 font-medium';
        break;
      case 'office supplies':
        bgColor = 'bg-blue-100 text-blue-700 font-medium';
        break;
      case 'professional development':
        bgColor = 'bg-orange-100 text-orange-700 font-medium';
        break;
      case 'marketing':
        bgColor = 'bg-green-100 text-green-700 font-medium';
        break;
    }

    const baseClasses = 'inline-flex items-center text-xs px-2 py-0.5 rounded-full whitespace-nowrap';

    return (
      <span className={`${baseClasses} ${bgColor}`}>
        {label}
      </span>
    );
  };

  const TabButton: React.FC<{ tab: TabType; label: string; icon: React.ElementType }> = ({ tab, label, icon: Icon }) => {
    const isActive = activeTab === tab;
    return (
      <button
        onClick={() => setActiveTab(tab)}
        className={`flex items-center px-6 py-3 text-sm font-medium rounded-t-xl transition-all duration-300 relative
          ${isActive
            ? 'bg-[#3366CC]/10 dark:bg-[#3366CC]/20 text-[#3366CC] dark:text-[#4a7dd9] shadow-lg border-b-2 border-[#3366CC] dark:border-[#3366CC] transform -translate-y-1'
            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-[#3366CC] dark:hover:text-[#4a7dd9] hover:transform hover:-translate-y-0.5'}`
        }
      >
        <Icon className={`w-4 h-4 mr-2 transition-colors duration-300 ${isActive ? 'text-[#3366CC] dark:text-[#4a7dd9]' : 'text-gray-500 dark:text-gray-400'}`} />
        {label}
        {isActive && (
          <div className="absolute inset-0 bg-[#3366CC]/5 dark:bg-[#3366CC]/10 rounded-t-xl -z-10"></div>
        )}
      </button>
    );
  };

  // Applications Table Component
  const RecentApplicationsContent: React.FC = () => {
    return (
      <div className="pt-6">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
          <DollarSign className="w-5 h-5 mr-2" style={{ color: '#3366CC' }} />
          Finance Applications ({filteredApplications.length})
        </h3>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 hover:shadow-2xl transition-all duration-300 p-6 mb-6">
          <h4 className="text-xl font-bold flex items-center mb-3" style={{ color: '#3366CC' }}>
            <div className="p-2 rounded-xl mr-3 bg-[#3366CC]/10 dark:bg-[#3366CC]/20">
              <Filter className="h-5 w-5" style={{ color: '#3366CC' }} />
            </div>
            Advanced Filters
          </h4>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Refine your search with powerful filtering options</p>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center mb-2">
                <Search className="h-4 w-4 mr-1" style={{ color: '#3366CC' }} />
                Search
              </label>
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500 group-focus-within:transition-colors" style={{ color: 'inherit' }} />
                <input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search applications..."
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-[#3366CC]/50 focus:border-[#3366CC] bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-all duration-200 shadow-sm hover:shadow-md"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Status</label>
              <div className="relative">
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-[#3366CC]/50 focus:border-[#3366CC] bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-all duration-200 shadow-sm hover:shadow-md appearance-none cursor-pointer"
                >
                  <option value="">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Manager Approved</option>
                  <option value="manager_approved">Manager Approved</option>
                  <option value="manager approved">Manager Approved</option>
                  <option value="finance_approved">Finance Approved</option>
                  <option value="finance approved">Finance Approved</option>
                  <option value="finance_rejected">Finance Rejected</option>
                  <option value="finance rejected">Finance Rejected</option>
                  <option value="rejected">Rejected</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <svg className="w-4 h-4 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Type</label>
              <div className="relative">
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-[#3366CC]/50 focus:border-[#3366CC] bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-all duration-200 shadow-sm hover:shadow-md appearance-none cursor-pointer"
                >
                  <option value="">All Types</option>
                  <option value="Travel">Travel</option>
                  <option value="Office Supplies">Office Supplies</option>
                  <option value="Professional Development">Professional Development</option>
                  <option value="Marketing">Marketing</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <svg className="w-4 h-4 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Department</label>
              <div className="relative">
                <select
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-[#3366CC]/50 focus:border-[#3366CC] bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-all duration-200 shadow-sm hover:shadow-md appearance-none cursor-pointer"
                >
                  <option value="">All Departments</option>
                  {Array.from(new Set(applications.map(a => a.employeeInfo?.department).filter(Boolean))).sort().map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <svg className="w-4 h-4 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Priority</label>
              <div className="relative">
                <select
                  value={selectedPriority}
                  onChange={(e) => setSelectedPriority(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-[#3366CC]/50 focus:border-[#3366CC] bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-all duration-200 shadow-sm hover:shadow-md appearance-none cursor-pointer"
                >
                  <option value="">All Priorities</option>
                  <option value="high">High</option>
                  <option value="normal">Normal</option>
                  <option value="low">Low</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <svg className="w-4 h-4 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
            <div className="flex flex-col items-center justify-center">
              <div className="h-8 w-8 border-2 border-t-transparent rounded-full animate-spin mb-4" style={{ borderColor: '#3366CC' }}></div>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">Loading applications...</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Please wait while we fetch the latest data</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-red-200/50 p-6 mb-6" style={{ background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.03) 0%, rgba(220, 38, 38, 0.03) 50%, rgba(185, 28, 28, 0.03) 100%)' }}>
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <XCircle className="h-5 w-5 text-red-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error loading applications</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
                <div className="mt-4">
                  <button
                    onClick={fetchApplications}
                    className="bg-red-100 px-3 py-2 rounded-md text-sm font-medium text-red-800 hover:bg-red-200 transition-colors"
                  >
                    Try again
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Applications Table */}
        {!loading && !error && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-x-auto border border-gray-200 dark:border-gray-700">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider min-w-[120px]">
                    Application ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider min-w-[150px]">
                    Employee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider min-w-[200px]">
                    Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Priority
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider min-w-[100px]">
                    Submitted
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider min-w-[150px]">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredApplications.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-12">
                      <div className="flex flex-col items-center justify-center py-1">
                        <svg className="w-20 h-20 text-gray-300 dark:text-gray-600 mb-6" fill="none" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
                          <rect x="14" y="10" width="36" height="44" rx="4" stroke="currentColor" strokeWidth="2" fill="none" />
                          <path d="M22 22h20M22 30h20M22 38h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <p className="text-m font-semibold text-gray-900 dark:text-white">No applications found</p>
                        <p className="text-m text-gray-500 dark:text-gray-400 mt-2">Try adjusting your filters or search criteria.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredApplications.map((app) => (
                    <tr key={app.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition duration-150">

                      {/* Application ID */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium cursor-pointer" style={{ color: '#3366CC' }}>
                        {app.expenseId || app.id}
                      </td>

                      {/* Employee */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{app.employeeInfo?.fullName || 'N/A'}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{app.employeeInfo?.employeeCode || 'N/A'} • {app.employeeInfo?.department || 'N/A'}</div>
                      </td>

                      {/* Details */}
                      <td className="px-6 py-4 whitespace-normal">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{app.expenseDetails?.title || 'N/A'}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{app.expenseDetails?.description || 'N/A'}</div>
                      </td>

                      {/* Type */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusTag status={app.expenseDetails?.category || 'N/A'} />
                      </td>

                      {/* Amount */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {formatCurrency(app.expenseDetails?.amount || 0)}
                      </td>

                      {/* Priority */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusTag status={app.expenseDetails?.amount > 10000 ? 'high' : app.expenseDetails?.amount > 1000 ? 'normal' : 'low'} />
                      </td>

                      {/* Submitted Date */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {app.createdAt ? new Date(app.createdAt).toLocaleDateString('en-GB') : 'N/A'}
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusTag status={app.status} />
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {app.status !== 'Pending' && app.updatedAt && `Updated: ${new Date(app.updatedAt).toLocaleDateString('en-GB')}`}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium flex space-x-1">
                        <button
                          onClick={() => handleView(app.id)}
                          className="inline-flex items-center justify-center w-8 h-8 border border-gray-300 dark:border-gray-600 rounded-md text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {(() => {
                          const status = app.status?.toLowerCase() || '';
                          const shouldShowActions =
                            status === 'pending' ||
                            status === 'manager_approved' ||
                            status === 'manager approved' ||
                            status === 'approved' ||
                            (status.includes('manager') && !status.includes('finance'));

                          // Debug logging
                          console.log(`Application ${app.id}: status="${app.status}", shouldShowActions=${shouldShowActions}`);

                          return shouldShowActions ? (
                            <>
                              <button
                                onClick={() => handleApprove(app.id)}
                                className="inline-flex items-center justify-center w-8 h-8 border border-green-300 dark:border-green-600 rounded-md text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                                title="Approve"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleReject(app.id)}
                                className="inline-flex items-center justify-center w-8 h-8 border border-red-300 dark:border-red-600 rounded-md text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                title="Reject"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            </>
                          ) : null;
                        })()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return <FinanceOverview />;
      case 'expense':
        return <RecentApplicationsContent />;
      case 'payslip':
        return <FinancePayslip />;
      default:
        return <FinanceOverview />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Dashboard Header */}
        <DashboardHeader
          title="Finance Approvals"
          subtitle="Advanced financial management system with intelligent expense tracking, budget monitoring, and automated payroll processing for multinational operations."
          icon={DollarSign}
          iconColor="text-white"
          hideTenantPrefix={true}
          breadcrumbs={[
            { label: 'Home', href: '/' },
            { label: 'ESS Approval Flows', href: '/ess-approval-flows' },
            { label: 'Finance' }
          ]}
          actions={
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center px-6 py-3 bg-white/20 rounded-xl backdrop-blur-sm border border-white/30 text-white hover:bg-white/30 transition-all duration-200 hover:scale-105 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
              title="Refresh Data"
            >
              <RefreshCw className={`w-5 h-5 mr-2 flex-shrink-0 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="font-medium whitespace-nowrap">
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </span>
            </button>
          }
        />

        {/* Tab Navigation */}
        <div className="flex space-x-1 border-b border-gray-200 dark:border-gray-700 overflow-x-auto bg-white dark:bg-gray-800 rounded-t-xl px-4 mt-8">
          {tabs.map(tab => (
            <TabButton
              key={tab.id}
              tab={tab.id}
              label={tab.label}
              icon={tab.icon}
            />
          ))}
        </div>

        {/* Content Area */}
        <div className="pt-4">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default FinanceApprovals;

