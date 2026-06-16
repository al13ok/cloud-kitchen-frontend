'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { getAuthHeaders } from '@/utils/api';
import { ESS_PORTAL_ENDPOINTS, essApiFetch } from '@/utils/essApi';
import Button from '@/components/ui/button/Button';
import {
  DollarSign,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Eye,
  Clock,
  FileText,
} from 'lucide-react';

// Types
interface ExpenseApplication {
  id: string;
  expenseId?: string;
  employeeName: string;
  employeeId: string;
  department: string;
  type: 'Expense Claim' | 'Budget Request' | 'Advance Request';
  details: string;
  category: string;
  amount: number;
  priority: 'high' | 'normal' | 'low';
  submittedOn: string;
  status: 'pending' | 'approved' | 'rejected' | 'manager_approved' | 'manager_rejected' | 'finance_approved' | 'finance_rejected' | 'manager approved' | 'manager rejected' | 'finance approved' | 'finance rejected';
  statusDate?: string;
}

// API Response Types
type ApiExpense = {
  id?: string;
  expenseId?: string;
  employeeInfo?: {
    fullName?: string;
    employeeCode?: string;
    department?: string;
    email?: string;
  };
  expenseDetails?: {
    description?: string;
    category?: string;
    amount?: number;
    date?: string;
  };
  createdAt?: string;
  updatedAt?: string;
  status?: string;
  priority?: string;
};

// Currency formatter
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount).replace('₹', '₹');
};

// Status Tag Component
const StatusTag: React.FC<{ status: string }> = ({ status }) => {
  let bgColor = 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300';
  const label = status.charAt(0).toUpperCase() + status.slice(1);

  switch (status) {
    case 'approved': bgColor = 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-medium'; break;
    case 'rejected': bgColor = 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 font-medium'; break;
    case 'pending': bgColor = 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 font-medium'; break;
    case 'high': bgColor = 'bg-red-500 dark:bg-red-600 text-white font-medium'; break;
    case 'normal': bgColor = 'bg-[#3366CC] dark:bg-[#4a7dd9] text-white font-medium'; break;
    case 'low': bgColor = 'bg-[#3366CC]/80 dark:bg-[#3366CC] text-white font-medium'; break;
    case 'Business Travel': bgColor = 'bg-[#3366CC] dark:bg-[#4a7dd9] text-white'; break;
    case 'Business Meals': bgColor = 'bg-[#4a7dd9] dark:bg-[#5c8de6] text-white'; break;
    case 'Professional Development': bgColor = 'bg-[#5c8de6] dark:bg-[#6d9df3] text-white'; break;
    case 'Capital Expenditure': bgColor = 'bg-[#6d9df3] dark:bg-[#7eadf9] text-white'; break;
    case 'Office Supplies': bgColor = 'bg-[#7eadf9] dark:bg-[#8fbefc] text-white'; break;
    case 'Travel Advance': bgColor = 'bg-[#8fbefc] dark:bg-[#a1ceff] text-gray-900 dark:text-white'; break;
    case 'Expense Claim': bgColor = 'bg-[#3366CC] dark:bg-[#4a7dd9] text-white'; break;
    case 'Budget Request': bgColor = 'bg-[#4a7dd9] dark:bg-[#5c8de6] text-white'; break;
    case 'Advance Request': bgColor = 'bg-[#5c8de6] dark:bg-[#6d9df3] text-white'; break;
  }

  return (
    <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${bgColor}`}>
      {label}
    </span>
  );
};

// Type Icon Component
const TypeIcon: React.FC<{ type: string }> = ({ type }) => {
  const iconColor = '#3366CC';
  switch (type) {
    case 'Expense Claim': return <DollarSign className="h-4 w-4" style={{ color: iconColor }} />;
    case 'Budget Request': return <FileText className="h-4 w-4" style={{ color: iconColor }} />;
    case 'Advance Request': return <Clock className="h-4 w-4" style={{ color: iconColor }} />;
    default: return <FileText className="h-4 w-4 text-gray-600 dark:text-gray-400" />;
  }
};

// Main Component
const FinanceExpense: React.FC = () => {
  const [applications, setApplications] = useState<ExpenseApplication[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('All Status');
  const [selectedType, setSelectedType] = useState('All Types');
  const [selectedDepartment, setSelectedDepartment] = useState('All Departments');
  const [selectedPriority, setSelectedPriority] = useState('All Priorities');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');

  // Load data from API
  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const expensesUrl = ESS_PORTAL_ENDPOINTS.EXPENSES.LIST();

      // Validate URL
      if (!expensesUrl || typeof expensesUrl !== 'string') {
        throw new Error(`Invalid URL: ${expensesUrl}`);
      }

      if (!expensesUrl.includes('/api/v1/ess-portal/expenses')) {
        console.warn(`⚠️ FinanceExpense - URL may be incorrect: ${expensesUrl}`);
      }

      console.log('🔍 FinanceExpense - Fetching expenses from URL:', expensesUrl);

      // Use essApiFetch for consistent authentication and error handling
      const response = await essApiFetch(expensesUrl, {
        method: 'GET',
      });

      const data = await response.json();
      console.log('📊 FinanceExpense - API response:', {
        success: data.success,
        count: data.count,
        dataLength: data.data?.length || 0,
        hasData: !!data.data,
        filterApplied: data.filter_applied
      });

      if (data.success && Array.isArray(data.data)) {
        // Transform backend data to match frontend interface
        const transformedExpenses = (data.data as ApiExpense[])
          .map((app) => ({
            id: String(app.id || app.expenseId || ''),
            expenseId: String(app.expenseId || app.id || ''),
            employeeName: app.employeeInfo?.fullName || '',
            employeeId: app.employeeInfo?.employeeCode || '',
            department: app.employeeInfo?.department || '',
            type: 'Expense Claim' as const, // Default type
            details: app.expenseDetails?.description || '',
            category: app.expenseDetails?.category || '',
            amount: app.expenseDetails?.amount || 0,
            priority: (app.priority || 'normal') as 'high' | 'normal' | 'low',
            submittedOn: app.createdAt ? new Date(app.createdAt).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB'),
            status: (app.status?.toLowerCase() || 'pending') as ExpenseApplication['status'],
            statusDate: app.updatedAt ? new Date(app.updatedAt).toLocaleDateString('en-GB') : undefined
          }))
          // Filter to show only manager-approved applications
          .filter(app => {
            const status = app.status?.toLowerCase() || '';
            return status === 'manager_approved' ||
              status === 'manager approved' ||
              status === 'approved'; // Also show approved ones
          });

        if (transformedExpenses.length === 0) {
          console.warn('⚠️ FinanceExpense - No manager-approved expenses found.');
          setApplications([]);
        } else {
          console.log(`✅ FinanceExpense - Loaded ${transformedExpenses.length} manager-approved expenses`);
          setApplications(transformedExpenses);
        }
      } else if (data.success && !data.data) {
        console.warn('⚠️ FinanceExpense - API returned success but no data field');
        setApplications([]);
      } else {
        const errorMsg = data.message || data.error || 'API returned unsuccessful response';
        console.error('❌ FinanceExpense - API error:', errorMsg);
        throw new Error(errorMsg);
      }
    } catch (err) {
      console.error('❌ FinanceExpense - Error fetching expenses:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch expenses';
      setError(errorMessage);
      setApplications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load data on mount
  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  // Filter applications
  const filteredApplications = useMemo(() => {
    return applications.filter(app => {
      const q = searchTerm.trim().toLowerCase();
      const matchesSearch = q === '' || (
        app.employeeName.toLowerCase().includes(q) ||
        app.employeeId.toLowerCase().includes(q) ||
        app.details.toLowerCase().includes(q) ||
        ((app.expenseId || app.id) as string).toLowerCase().includes(q)
      );

      const matchesStatus = selectedStatus === 'All Status' || app.status === selectedStatus;
      const matchesType = selectedType === 'All Types' || app.type === selectedType;
      const matchesDept = selectedDepartment === 'All Departments' || app.department === selectedDepartment;
      const matchesPriority = selectedPriority === 'All Priorities' || app.priority === selectedPriority;
      const matchesCategory = selectedCategory === 'All Categories' || app.category === selectedCategory;

      return matchesSearch && matchesStatus && matchesType && matchesDept && matchesPriority && matchesCategory;
    });
  }, [applications, searchTerm, selectedStatus, selectedType, selectedDepartment, selectedPriority, selectedCategory]);

  // All filtered applications are manager-approved (already filtered in fetchExpenses)
  // No need to separate pending/upcoming since we only show manager-approved

  // Calculate summary statistics - Only manager-approved applications
  const summaryStats = useMemo(() => {
    const totalClaims = filteredApplications.length;
    // All are pending finance approval (manager-approved)
    const pendingClaims = filteredApplications.length;
    const approvedClaims = filteredApplications.filter(app =>
      app.status === 'finance_approved' ||
      app.status === 'finance approved'
    ).length;
    const rejectedClaims = filteredApplications.filter(app =>
      app.status === 'finance_rejected' ||
      app.status === 'finance rejected'
    ).length;

    const pendingAmount = filteredApplications.reduce((sum, app) => sum + app.amount, 0);

    const approvedAmount = filteredApplications
      .filter(app =>
        app.status === 'finance_approved' ||
        app.status === 'finance approved'
      )
      .reduce((sum, app) => sum + app.amount, 0);

    return {
      totalClaims,
      pendingClaims,
      approvedClaims,
      rejectedClaims,
      pendingAmount,
      approvedAmount
    };
  }, [filteredApplications]);

  // Handle approval
  const handleApproval = async (application: ExpenseApplication) => {
    try {
      const approveUrl = ESS_PORTAL_ENDPOINTS.EXPENSES.APPROVE(application.id);
      console.log('🔍 FinanceExpense - Approving expense:', approveUrl);

      if (!approveUrl.includes('/api/v1/ess-portal/expenses')) {
        console.error(`❌ FinanceExpense - Invalid approve URL: ${approveUrl}`);
        throw new Error(`Invalid API URL: ${approveUrl}`);
      }

      const response = await fetch(approveUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'accept': 'application/json',
          ...getAuthHeaders()
        },
      });

      if (response.ok) {
        // Refresh the expenses list
        await fetchExpenses();
        console.log('Application approved successfully');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to approve application');
      }
    } catch (error) {
      console.error('Error approving application:', error);
      setError(error instanceof Error ? error.message : 'Failed to approve application');
    }
  };

  // Handle rejection
  const handleRejection = async (application: ExpenseApplication) => {
    try {
      const rejectUrl = ESS_PORTAL_ENDPOINTS.EXPENSES.REJECT(application.id);
      console.log('🔍 FinanceExpense - Rejecting expense:', rejectUrl);

      if (!rejectUrl.includes('/api/v1/ess-portal/expenses')) {
        console.error(`❌ FinanceExpense - Invalid reject URL: ${rejectUrl}`);
        throw new Error(`Invalid API URL: ${rejectUrl}`);
      }

      const response = await fetch(rejectUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'accept': 'application/json',
          ...getAuthHeaders()
        },
      });

      if (response.ok) {
        // Refresh the expenses list
        await fetchExpenses();
        console.log('Application rejected successfully');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to reject application');
      }
    } catch (error) {
      console.error('Error rejecting application:', error);
      setError(error instanceof Error ? error.message : 'Failed to reject application');
    }
  };

  // Handle view
  const handleView = (application: ExpenseApplication) => {
    // Store application data and navigate to detail view
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('selectedFinanceApplication', JSON.stringify(application));
      window.location.href = `/ess-portal/finance/view?id=${application.id}`;
    }
  };

  return (
    <div className="space-y-6">
      {/* Professional Header */}
      <div className="flex items-center justify-between bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: '#3366CC' }}>Finance Expense Applications</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Review and approve employee expense applications</p>
        </div>
        <div className="flex items-center space-x-2 bg-[#3366CC]/10 dark:bg-[#3366CC]/20 px-4 py-2 rounded-xl">
          <Clock className="h-5 w-5" style={{ color: '#3366CC' }} />
          <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">
            {filteredApplications.length} applications
          </span>
        </div>
      </div>

      {/* Professional Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        {/* Total Claims Card */}
        <div className="relative bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 hover:scale-105 cursor-pointer group h-full overflow-hidden border border-gray-200 dark:border-gray-700">
          <div className="absolute inset-0 bg-[#3366CC]/5 dark:bg-[#3366CC]/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="absolute top-0 right-0 w-20 h-20 bg-[#3366CC]/10 dark:bg-[#3366CC]/20 rounded-full -translate-y-10 translate-x-10 opacity-0 group-hover:opacity-70 transition-opacity duration-500"></div>

          <div className="relative z-10 flex flex-col h-full">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-2xl shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110" style={{ backgroundColor: '#3366CC' }}>
                <FileText className="w-6 h-6 text-white" />
              </div>
            </div>

            <div className="mb-4">
              <p className="text-3xl font-bold text-gray-900 dark:text-white group-hover:text-[#3366CC] dark:group-hover:text-[#4a7dd9] transition-colors duration-300">
                {summaryStats.totalClaims}
              </p>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300 group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors duration-300 mt-1">
                Total Claims
              </p>
            </div>

            <div className="mt-auto">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-500 dark:text-gray-400">Progress</span>
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">85%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                <div className="h-2 rounded-full transition-all duration-1000 ease-out group-hover:animate-pulse" style={{ width: '85%', backgroundColor: '#3366CC' }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Pending Claims Card */}
        <div className="relative bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 hover:scale-105 cursor-pointer group h-full overflow-hidden border border-gray-200 dark:border-gray-700">
          <div className="absolute inset-0 bg-[#3366CC]/5 dark:bg-[#3366CC]/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="absolute top-0 right-0 w-20 h-20 bg-[#3366CC]/10 dark:bg-[#3366CC]/20 rounded-full -translate-y-10 translate-x-10 opacity-0 group-hover:opacity-70 transition-opacity duration-500"></div>

          <div className="relative z-10 flex flex-col h-full">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-2xl shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110" style={{ backgroundColor: '#3366CC' }}>
                <Clock className="w-6 h-6 text-white" />
              </div>
            </div>

            <div className="mb-4">
              <p className="text-3xl font-bold text-gray-900 dark:text-white group-hover:text-[#3366CC] dark:group-hover:text-[#4a7dd9] transition-colors duration-300">
                {summaryStats.pendingClaims}
              </p>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300 group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors duration-300 mt-1">
                Pending Claims
              </p>
            </div>

            <div className="mt-auto">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-500 dark:text-gray-400">Progress</span>
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">85%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                <div className="h-2 rounded-full transition-all duration-1000 ease-out group-hover:animate-pulse" style={{ width: '85%', backgroundColor: '#3366CC' }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Approved Claims Card */}
        <div className="relative bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 hover:scale-105 cursor-pointer group h-full overflow-hidden border border-gray-200 dark:border-gray-700">
          <div className="absolute inset-0 bg-[#3366CC]/5 dark:bg-[#3366CC]/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="absolute top-0 right-0 w-20 h-20 bg-[#3366CC]/10 dark:bg-[#3366CC]/20 rounded-full -translate-y-10 translate-x-10 opacity-0 group-hover:opacity-70 transition-opacity duration-500"></div>

          <div className="relative z-10 flex flex-col h-full">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-2xl shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110" style={{ backgroundColor: '#3366CC' }}>
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
            </div>

            <div className="mb-4">
              <p className="text-3xl font-bold text-gray-900 dark:text-white group-hover:text-[#3366CC] dark:group-hover:text-[#4a7dd9] transition-colors duration-300">
                {summaryStats.approvedClaims}
              </p>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300 group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors duration-300 mt-1">
                Approved Claims
              </p>
            </div>

            <div className="mt-auto">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-500 dark:text-gray-400">Progress</span>
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">85%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                <div className="h-2 rounded-full transition-all duration-1000 ease-out group-hover:animate-pulse" style={{ width: '85%', backgroundColor: '#3366CC' }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Rejected Claims Card */}
        <div className="relative bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 hover:scale-105 cursor-pointer group h-full overflow-hidden border border-gray-200 dark:border-gray-700">
          <div className="absolute inset-0 bg-[#3366CC]/5 dark:bg-[#3366CC]/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="absolute top-0 right-0 w-20 h-20 bg-[#3366CC]/10 dark:bg-[#3366CC]/20 rounded-full -translate-y-10 translate-x-10 opacity-0 group-hover:opacity-70 transition-opacity duration-500"></div>

          <div className="relative z-10 flex flex-col h-full">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-2xl shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110" style={{ backgroundColor: '#3366CC' }}>
                <XCircle className="w-6 h-6 text-white" />
              </div>
            </div>

            <div className="mb-4">
              <p className="text-3xl font-bold text-gray-900 dark:text-white group-hover:text-[#3366CC] dark:group-hover:text-[#4a7dd9] transition-colors duration-300">
                {summaryStats.rejectedClaims}
              </p>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300 group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors duration-300 mt-1">
                Rejected Claims
              </p>
            </div>

            <div className="mt-auto">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-500 dark:text-gray-400">Progress</span>
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">85%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                <div className="h-2 rounded-full transition-all duration-1000 ease-out group-hover:animate-pulse" style={{ width: '85%', backgroundColor: '#3366CC' }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Pending Amount Card */}
        <div className="relative bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 hover:scale-105 cursor-pointer group h-full overflow-hidden border border-gray-200 dark:border-gray-700">
          <div className="absolute inset-0 bg-[#3366CC]/5 dark:bg-[#3366CC]/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="absolute top-0 right-0 w-20 h-20 bg-[#3366CC]/10 dark:bg-[#3366CC]/20 rounded-full -translate-y-10 translate-x-10 opacity-0 group-hover:opacity-70 transition-opacity duration-500"></div>

          <div className="relative z-10 flex flex-col h-full">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-2xl shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110" style={{ backgroundColor: '#3366CC' }}>
                <DollarSign className="w-6 h-6 text-white" />
              </div>
            </div>

            <div className="mb-4">
              <p className="text-3xl font-bold text-gray-900 dark:text-white group-hover:text-[#3366CC] dark:group-hover:text-[#4a7dd9] transition-colors duration-300">
                {formatCurrency(summaryStats.pendingAmount)}
              </p>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300 group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors duration-300 mt-1">
                Pending Amount
              </p>
            </div>

            <div className="mt-auto">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-500 dark:text-gray-400">Progress</span>
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">85%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                <div className="h-2 rounded-full transition-all duration-1000 ease-out group-hover:animate-pulse" style={{ width: '85%', backgroundColor: '#3366CC' }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Approved Amount Card */}
        <div className="relative bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 hover:scale-105 cursor-pointer group h-full overflow-hidden border border-gray-200 dark:border-gray-700">
          <div className="absolute inset-0 bg-[#3366CC]/5 dark:bg-[#3366CC]/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="absolute top-0 right-0 w-20 h-20 bg-[#3366CC]/10 dark:bg-[#3366CC]/20 rounded-full -translate-y-10 translate-x-10 opacity-0 group-hover:opacity-70 transition-opacity duration-500"></div>

          <div className="relative z-10 flex flex-col h-full">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-2xl shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110" style={{ backgroundColor: '#3366CC' }}>
                <DollarSign className="w-6 h-6 text-white" />
              </div>
            </div>

            <div className="mb-4">
              <p className="text-3xl font-bold text-gray-900 dark:text-white group-hover:text-[#3366CC] dark:group-hover:text-[#4a7dd9] transition-colors duration-300">
                {formatCurrency(summaryStats.approvedAmount)}
              </p>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300 group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors duration-300 mt-1">
                Approved Amount
              </p>
            </div>

            <div className="mt-auto">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-500 dark:text-gray-400">Progress</span>
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">85%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                <div className="h-2 rounded-full transition-all duration-1000 ease-out group-hover:animate-pulse" style={{ width: '85%', backgroundColor: '#3366CC' }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Professional Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 hover:shadow-2xl transition-all duration-300">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-xl font-bold flex items-center" style={{ color: '#3366CC' }}>
            <div className="p-2 rounded-xl mr-3 bg-[#3366CC]/10 dark:bg-[#3366CC]/20">
              <Filter className="h-5 w-5" style={{ color: '#3366CC' }} />
            </div>
            Advanced Filters
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Refine your search with powerful filtering options</p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
            {/* Search Input */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center">
                <Search className="h-4 w-4 mr-1" style={{ color: '#3366CC' }} />
                Search
              </label>
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500 group-focus-within:transition-colors" />
                <input
                  type="text"
                  placeholder="Search applications..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-[#3366CC]/50 focus:border-[#3366CC] bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-all duration-200 shadow-sm hover:shadow-md"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center">
                <div className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: '#3366CC' }}></div>
                Status
              </label>
              <div className="relative group">
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-[#3366CC]/50 focus:border-[#3366CC] bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-all duration-200 shadow-sm hover:shadow-md appearance-none cursor-pointer"
                >
                  <option>All Status</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <div className="w-2 h-2 border-r-2 border-b-2 border-gray-400 dark:border-gray-500 rotate-45 transform"></div>
                </div>
              </div>
            </div>

            {/* Type Filter */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center">
                <div className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: '#3366CC' }}></div>
                Type
              </label>
              <div className="relative group">
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-[#3366CC]/50 focus:border-[#3366CC] bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-all duration-200 shadow-sm hover:shadow-md appearance-none cursor-pointer"
                >
                  <option>All Types</option>
                  <option>Expense Claim</option>
                  <option>Budget Request</option>
                  <option>Advance Request</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <div className="w-2 h-2 border-r-2 border-b-2 border-gray-400 dark:border-gray-500 rotate-45 transform"></div>
                </div>
              </div>
            </div>

            {/* Department Filter */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center">
                <div className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: '#3366CC' }}></div>
                Department
              </label>
              <div className="relative group">
                <select
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-[#3366CC]/50 focus:border-[#3366CC] bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-all duration-200 shadow-sm hover:shadow-md appearance-none cursor-pointer"
                >
                  <option>All Departments</option>
                  <option>Engineering</option>
                  <option>Sales</option>
                  <option>Marketing</option>
                  <option>IT</option>
                  <option>Operations</option>
                  <option>HR</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <div className="w-2 h-2 border-r-2 border-b-2 border-gray-400 dark:border-gray-500 rotate-45 transform"></div>
                </div>
              </div>
            </div>

            {/* Priority Filter */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center">
                <div className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: '#3366CC' }}></div>
                Priority
              </label>
              <div className="relative group">
                <select
                  value={selectedPriority}
                  onChange={(e) => setSelectedPriority(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-[#3366CC]/50 focus:border-[#3366CC] bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-all duration-200 shadow-sm hover:shadow-md appearance-none cursor-pointer"
                >
                  <option>All Priorities</option>
                  <option value="high">High</option>
                  <option value="normal">Normal</option>
                  <option value="low">Low</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <div className="w-2 h-2 border-r-2 border-b-2 border-gray-400 dark:border-gray-500 rotate-45 transform"></div>
                </div>
              </div>
            </div>

            {/* Category Filter */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center">
                <div className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: '#3366CC' }}></div>
                Category
              </label>
              <div className="relative group">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-[#3366CC]/50 focus:border-[#3366CC] bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-all duration-200 shadow-sm hover:shadow-md appearance-none cursor-pointer"
                >
                  <option>All Categories</option>
                  <option>Business Travel</option>
                  <option>Business Meals</option>
                  <option>Professional Development</option>
                  <option>Capital Expenditure</option>
                  <option>Office Supplies</option>
                  <option>Travel Advance</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <div className="w-2 h-2 border-r-2 border-b-2 border-gray-400 dark:border-gray-500 rotate-45 transform"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Professional Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-8 bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: '#3366CC' }}></div>
          <span className="ml-2 text-gray-600 dark:text-gray-400">Loading applications...</span>
        </div>
      )}

      {/* Professional Error State */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4 shadow-lg">
          <p className="text-red-700 dark:text-red-400 font-medium">⚠️ {error}</p>
          {error.includes('server is not running') && (
            <div className="mt-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-blue-800 text-sm font-medium mb-2">
                <strong>🚀 To fix this:</strong> Start your Python backend server
              </p>
              <div className="bg-gray-100 p-2 rounded text-xs font-mono text-gray-700">
                <div>cd mobiloitte-converiqoai-10000012-python</div>
                <div>python main.py</div>
                <div className="text-gray-500 mt-1"># or</div>
                <div>uvicorn main:app --reload --host 0.0.0.0 --port 8000</div>
              </div>
              <p className="text-blue-700 text-xs mt-2">
                Then visit <code className="bg-blue-100 px-1 rounded">https://py-mobiloitte.converiqo.ai/docs</code> to verify the server is running.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Professional Applications Table */}
      {!loading && !error && filteredApplications.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-x-auto border border-gray-200 dark:border-gray-700">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold flex items-center" style={{ color: '#3366CC' }}>
              <FileText className="h-5 w-5 mr-2" style={{ color: '#3366CC' }} />
              Finance Applications ({filteredApplications.length})
            </h3>
          </div>
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Application ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Employee</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Details</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Priority</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Submitted</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredApplications.map((application) => (
                <tr key={application.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition duration-150">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium" style={{ color: '#3366CC' }}>
                    {application.expenseId || application.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">{application.employeeName}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{application.employeeId}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 dark:text-white">{application.details}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{application.department}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <TypeIcon type={application.type} />
                      <span className="ml-2 text-sm text-gray-900 dark:text-white">{application.type}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600 dark:text-green-400">
                    {formatCurrency(application.amount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StatusTag status={application.priority} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {application.submittedOn}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StatusTag status={application.status} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleView(application)}
                        className="inline-flex items-center px-3 py-1.5 text-sm font-medium border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md transition-colors"
                        style={{ color: '#3366CC' }}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </button>
                      {(() => {
                        const status = application.status?.toLowerCase() || '';
                        const shouldShowActions =
                          status === 'manager_approved' ||
                          status === 'manager approved' ||
                          status === 'approved';

                        return shouldShowActions ? (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleApproval(application)}
                              className="bg-green-600 hover:bg-green-700 text-white"
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRejection(application)}
                              className="text-red-600 dark:text-red-400 border-red-600 dark:border-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </>
                        ) : null;
                      })()}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Professional Empty State */}
      {!loading && !error && filteredApplications.length === 0 && (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700">
          <FileText className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No applications found</h3>
          <p className="text-slate-500">No manager-approved expense applications available. Applications will appear here once they are approved by managers.</p>
        </div>
      )}
    </div>
  );
};

export default FinanceExpense;