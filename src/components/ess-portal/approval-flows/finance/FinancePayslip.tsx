'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { getAuthHeaders } from '@/utils/api';
import { ESS_PORTAL_ENDPOINTS, essApiFetch } from '@/utils/essApi';
import {
  FileText,
  Search,
  Filter,
  Eye,
  Clock,
  CheckCircle,
  XCircle,
  X,
  User,
  CreditCard,
  DollarSign,
  Calculator,
  Calendar,
  Save
} from 'lucide-react';
// Removed import - will fetch directly from backend API

// Types - Updated to match backend API response
interface Payslip {
  id: string;
  payslipId?: string; // Human-readable payslip ID like "PS-001"
  employeeInfo: {
    employeeCode: string;
    fullName: string;
    department: string;
    designation: string;
    email: string;
    bankAccountNo?: string;
    ifscCode?: string;
    panNumber?: string;
    uan?: string;
    dateOfJoining?: string;
  };
  payslipInfo: {
    payPeriodStart: string;
    payPeriodEnd: string;
    payDate: string;
  };
  earnings: Array<{
    type: string;
    amount: number;
  }>;
  deductions: Array<{
    type: string;
    amount: number;
  }>;
  totals: {
    totalEarnings: number;
    totalDeductions: number;
    netPay: number;
    grossPay: number;
  };
  status: string;
  payslipType?: 'auto_generated' | 'manual' | 'employee_request';
  createdAt: string;
  updatedAt: string;
  additionalInfo?: {
    remarks?: string;
    generatedBy?: string;
    bankAccountNo?: string;
    ifscCode?: string;
    pfNumber?: string;
    esiNumber?: string;
    panNumber?: string;
    uan?: string;
  };
}

// API Response Types


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
  let label = status;

  switch (status.toLowerCase()) {
    case 'approved':
    case 'finance_approved':
      bgColor = 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-medium';
      label = 'Approved';
      break;
    case 'pending':
      bgColor = 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 font-medium';
      label = 'Pending';
      break;
    case 'rejected':
    case 'finance_rejected':
      bgColor = 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 font-medium';
      label = 'Rejected';
      break;
    case 'generated':
      bgColor = 'bg-[#3366CC]/10 dark:bg-[#3366CC]/20 text-[#3366CC] dark:text-[#4a7dd9] font-medium';
      label = 'Generated';
      break;
    default:
      label = status.charAt(0).toUpperCase() + status.slice(1);
  }

  return (
    <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${bgColor}`}>
      {label}
    </span>
  );
};

// Main Component
const FinancePayslip: React.FC = () => {
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('All Status');
  const [selectedDepartment, setSelectedDepartment] = useState('All Departments');
  const [selectedPayPeriod, setSelectedPayPeriod] = useState('All Periods');
  const [selectedYear, setSelectedYear] = useState('All Years');

  // Payslip creation/editing modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedPayslip, setSelectedPayslip] = useState<Payslip | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    basicSalary: 0,
    hra: 0,
    specialAllowance: 0,
    otherAllowances: 0,
    pf: 0,
    esi: 0,
    tds: 0,
    otherDeductions: 0,
    bankAccountNo: '',
    ifscCode: '',
    pfNumber: '',
    esiNumber: '',
    panNumber: '',
    uan: '',
    remarks: ''
  });
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);

  // Fetch payslips from API
  const fetchPayslips = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const payslipsUrl = ESS_PORTAL_ENDPOINTS.PAYSLIPS.LIST();

      // Validate URL (allow both absolute and relative paths)
      if (!payslipsUrl || typeof payslipsUrl !== 'string') {
        throw new Error(`Invalid URL: ${payslipsUrl}`);
      }

      // Check if URL contains the correct endpoint path
      if (!payslipsUrl.includes('/api/v1/ess-portal/payslips')) {
        console.warn(`⚠️ FinancePayslip - URL may be incorrect: ${payslipsUrl}`);
      }

      console.log('🔍 FinancePayslip - Fetching payslips from URL:', payslipsUrl);

      // Use essApiFetch for consistent authentication and error handling
      const response = await essApiFetch(payslipsUrl, {
        method: 'GET',
      });

      const data = await response.json();
      console.log('📊 FinancePayslip - API response:', {
        success: data.success,
        count: data.count,
        dataLength: data.data?.length || 0,
        hasData: !!data.data,
        filterApplied: data.filter_applied
      });

      if (data.success && Array.isArray(data.data)) {
        if (data.data.length === 0) {
          console.warn('⚠️ FinancePayslip - API returned empty array. No payslips found.');
          setPayslips([]);
        } else {
          console.log(`✅ FinancePayslip - Loaded ${data.data.length} payslips`);
          setPayslips(data.data);
        }
      } else if (data.success && !data.data) {
        console.warn('⚠️ FinancePayslip - API returned success but no data field');
        setPayslips([]);
      } else {
        const errorMsg = data.message || data.error || 'API returned unsuccessful response';
        console.error('❌ FinancePayslip - API error:', errorMsg);
        throw new Error(errorMsg);
      }
    } catch (err) {
      console.error('❌ FinancePayslip - Error fetching payslips:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch payslips';
      setError(errorMessage);
      // Don't fallback to mock data - show error to user instead
      setPayslips([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load data on mount
  useEffect(() => {
    fetchPayslips();
  }, [fetchPayslips]);

  // Filter payslips
  const filteredPayslips = useMemo(() => {
    return payslips.filter(payslip => {
      const q = searchTerm.trim().toLowerCase();
      const matchesSearch = q === '' || (
        payslip.employeeInfo?.fullName?.toLowerCase().includes(q) ||
        payslip.employeeInfo?.employeeCode?.toLowerCase().includes(q) ||
        payslip.id.toLowerCase().includes(q) ||
        (payslip.payslipId && payslip.payslipId.toLowerCase().includes(q)) ||
        (payslip.employeeInfo?.department && payslip.employeeInfo.department.toLowerCase().includes(q))
      );

      const matchesStatus = selectedStatus === 'All Status' || payslip.status?.toLowerCase() === selectedStatus.toLowerCase();

      const matchesDept = selectedDepartment === 'All Departments' || payslip.employeeInfo?.department === selectedDepartment;

      // Extract pay period for filtering
      const payPeriod = payslip.payslipInfo?.payPeriodStart ? new Date(payslip.payslipInfo.payPeriodStart).getFullYear().toString() : 'Unknown';
      const matchesPeriod = selectedPayPeriod === 'All Periods' || payPeriod === selectedPayPeriod;

      const matchesYear = selectedYear === 'All Years' || payPeriod === selectedYear;

      return matchesSearch && matchesStatus && matchesDept && matchesPeriod && matchesYear;
    });
  }, [payslips, searchTerm, selectedStatus, selectedDepartment, selectedPayPeriod, selectedYear]);

  // pendingPayslips and upcomingPayslips removed as they're not used

  // Calculate summary statistics - Payslips go directly to Finance team
  const summaryStats = useMemo(() => {
    const totalPayslips = filteredPayslips.length;
    const approvedPayslips = filteredPayslips.filter(p =>
      p.status?.toLowerCase() === 'approved' || p.status?.toLowerCase() === 'finance_approved'
    ).length;
    const pendingPayslips = filteredPayslips.filter(p =>
      p.status?.toLowerCase() === 'pending'
    ).length;
    const rejectedPayslips = filteredPayslips.filter(p =>
      p.status?.toLowerCase() === 'rejected' || p.status?.toLowerCase() === 'finance_rejected'
    ).length;
    const generatedPayslips = filteredPayslips.filter(p =>
      p.status?.toLowerCase() === 'generated'
    ).length;
    const totalAmount = filteredPayslips.reduce((sum, p) => sum + (p.totals?.netPay || 0), 0);
    const averagePay = totalPayslips > 0 ? totalAmount / totalPayslips : 0;

    return {
      totalPayslips,
      approvedPayslips,
      pendingPayslips,
      rejectedPayslips,
      generatedPayslips,
      totalAmount,
      averagePay
    };
  }, [filteredPayslips]);

  // Handle view
  const handleView = (payslip: Payslip) => {
    // Show payslip details in a modal
    setSelectedPayslip(payslip);
    setShowViewModal(true);
  };

  // Handle edit
  const handleEdit = (payslip: Payslip) => {
    // Set edit mode and populate form with existing payslip data
    setSelectedPayslip(payslip);
    setIsEditMode(true);

    // Extract earnings and deductions from existing payslip
    const basicSalary = payslip.earnings?.find(e => e.type === 'Basic Salary')?.amount || 0;
    const hra = payslip.earnings?.find(e => e.type === 'HRA')?.amount || 0;
    const specialAllowance = payslip.earnings?.find(e => e.type === 'Special Allowance')?.amount || 0;
    const otherAllowances = payslip.earnings?.find(e => e.type === 'Other Allowances')?.amount || 0;

    const pf = payslip.deductions?.find(d => d.type === 'PF')?.amount || 0;
    const esi = payslip.deductions?.find(d => d.type === 'ESI')?.amount || 0;
    const tds = payslip.deductions?.find(d => d.type === 'TDS')?.amount || 0;
    const otherDeductions = payslip.deductions?.find(d => d.type === 'Other Deductions')?.amount || 0;

    setCreateFormData({
      basicSalary,
      hra,
      specialAllowance,
      otherAllowances,
      pf,
      esi,
      tds,
      otherDeductions,
      bankAccountNo: payslip.employeeInfo?.bankAccountNo || payslip.additionalInfo?.bankAccountNo || '',
      ifscCode: payslip.employeeInfo?.ifscCode || payslip.additionalInfo?.ifscCode || '',
      pfNumber: payslip.additionalInfo?.pfNumber || '',
      esiNumber: payslip.additionalInfo?.esiNumber || '',
      panNumber: payslip.employeeInfo?.panNumber || payslip.additionalInfo?.panNumber || '',
      uan: payslip.employeeInfo?.uan || payslip.additionalInfo?.uan || '',
      remarks: payslip.additionalInfo?.remarks || ''
    });
    setCreateError(null);
    setCreateSuccess(null);
    setShowCreateModal(true);
  };

  // Handle approve
  const handleApprove = async (payslipId: string) => {
    try {
      const approveUrl = ESS_PORTAL_ENDPOINTS.PAYSLIPS.APPROVE(payslipId);
      console.log('🔍 FinancePayslip - Approving payslip:', approveUrl);

      if (!approveUrl.includes('/api/v1/ess-portal/payslips')) {
        console.error(`❌ FinancePayslip - Invalid approve URL: ${approveUrl}`);
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
        setSuccess('Payslip approved successfully!');
        // Clear success message after 3 seconds
        setTimeout(() => {
          setSuccess(null);
        }, 3000);
        // Refresh the payslips list WITHOUT reloading page (preserves active tab)
        setTimeout(() => {
          // Reload payslips data without page reload
          fetchPayslips();
        }, 500);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to approve payslip');
      }
    } catch (error) {
      console.error('Error approving payslip:', error);
      setError(error instanceof Error ? error.message : 'Failed to approve payslip');
    }
  };

  // Handle reject
  const handleReject = async (payslipId: string) => {
    try {
      const rejectUrl = ESS_PORTAL_ENDPOINTS.PAYSLIPS.REJECT(payslipId);
      console.log('🔍 FinancePayslip - Rejecting payslip:', rejectUrl);

      if (!rejectUrl.includes('/api/v1/ess-portal/payslips')) {
        console.error(`❌ FinancePayslip - Invalid reject URL: ${rejectUrl}`);
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
        setSuccess('Payslip rejected successfully!');
        // Clear success message after 3 seconds
        setTimeout(() => {
          setSuccess(null);
        }, 3000);
        // Refresh the payslips list WITHOUT reloading page (preserves active tab)
        setTimeout(() => {
          // Reload payslips data without page reload
          fetchPayslips();
        }, 500);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to reject payslip');
      }
    } catch (error) {
      console.error('Error rejecting payslip:', error);
      setError(error instanceof Error ? error.message : 'Failed to reject payslip');
    }
  };

  // Handle create payslip
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _handleCreatePayslip = (payslip: Payslip) => {
    setSelectedPayslip(payslip);
    setIsEditMode(false);
    setCreateFormData({
      basicSalary: 0,
      hra: 0,
      specialAllowance: 0,
      otherAllowances: 0,
      pf: 0,
      esi: 0,
      tds: 0,
      otherDeductions: 0,
      bankAccountNo: payslip.employeeInfo?.bankAccountNo || '',
      ifscCode: payslip.employeeInfo?.ifscCode || '',
      pfNumber: payslip.additionalInfo?.pfNumber || '',
      esiNumber: payslip.additionalInfo?.esiNumber || '',
      panNumber: payslip.employeeInfo?.panNumber || '',
      uan: payslip.employeeInfo?.uan || '',
      remarks: ''
    });
    setCreateError(null);
    setCreateSuccess(null);
    setShowCreateModal(true);
  };

  // Handle form input changes
  const handleFormInputChange = (field: string, value: string | number) => {
    setCreateFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Calculate totals
  const totalEarnings = createFormData.basicSalary + createFormData.hra + createFormData.specialAllowance + createFormData.otherAllowances;
  const totalDeductions = createFormData.pf + createFormData.esi + createFormData.tds + createFormData.otherDeductions;
  const netPay = totalEarnings - totalDeductions;

  // Handle form submission (both create and edit)
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPayslip) return;

    setCreateLoading(true);
    setCreateError(null);
    setCreateSuccess(null);

    try {
      const payslipData = {
        employeeInfo: {
          employeeCode: selectedPayslip.employeeInfo?.employeeCode || '',
          fullName: selectedPayslip.employeeInfo?.fullName || '',
          email: selectedPayslip.employeeInfo?.email || '',
          department: selectedPayslip.employeeInfo?.department || '',
          designation: selectedPayslip.employeeInfo?.designation || '',
          dateOfJoining: selectedPayslip.employeeInfo?.dateOfJoining || '',
          bankAccountNo: createFormData.bankAccountNo,
          uan: createFormData.uan,
          panNumber: createFormData.panNumber,
          ifscCode: createFormData.ifscCode
        },
        payslipInfo: {
          payPeriodStart: selectedPayslip.payslipInfo?.payPeriodStart || '',
          payPeriodEnd: selectedPayslip.payslipInfo?.payPeriodEnd || '',
          payDate: selectedPayslip.payslipInfo?.payDate || ''
        },
        earnings: [
          { type: 'Basic Salary', amount: createFormData.basicSalary },
          { type: 'HRA', amount: createFormData.hra },
          { type: 'Special Allowance', amount: createFormData.specialAllowance },
          { type: 'Other Allowances', amount: createFormData.otherAllowances }
        ],
        deductions: [
          { type: 'PF', amount: createFormData.pf },
          { type: 'ESI', amount: createFormData.esi },
          { type: 'TDS', amount: createFormData.tds },
          { type: 'Other Deductions', amount: createFormData.otherDeductions }
        ],
        additionalInfo: {
          pfNumber: createFormData.pfNumber || '',
          esiNumber: createFormData.esiNumber || '',
          remarks: createFormData.remarks || ''
        }
      };

      if (isEditMode) {
        // Update existing payslip
        const updateUrl = ESS_PORTAL_ENDPOINTS.PAYSLIPS.UPDATE(selectedPayslip.id);
        console.log('🔍 FinancePayslip - Updating payslip with URL:', updateUrl);

        if (!updateUrl.includes('/api/v1/ess-portal/payslips')) {
          console.error(`❌ FinancePayslip - Invalid URL format: ${updateUrl}`);
          throw new Error(`Invalid API URL: ${updateUrl}. Expected URL to contain /api/v1/ess-portal/payslips`);
        }

        const response = await fetch(updateUrl, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'accept': 'application/json',
            ...getAuthHeaders()
          },
          body: JSON.stringify(payslipData)
        });

        if (response.ok) {
          setCreateSuccess('Payslip updated successfully!');
          // Close modal and refresh data WITHOUT reloading page (preserves active tab)
          setTimeout(() => {
            setShowCreateModal(false);
            setIsEditMode(false);
            // Reload payslips data without page reload
            fetchPayslips();
          }, 500);
        } else {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to update payslip');
        }
      } else {
        // Create new payslip
        const createUrl = ESS_PORTAL_ENDPOINTS.PAYSLIPS.CREATE();
        console.log('🔍 FinancePayslip - Creating payslip with URL:', createUrl);

        // Add status to the payload to mark as Finance Approved after creation
        const payslipDataWithStatus = {
          ...payslipData,
          status: 'Finance_Approved'
        };

        if (!createUrl.includes('/api/v1/ess-portal/payslips')) {
          console.error(`❌ FinancePayslip - Invalid URL format: ${createUrl}`);
          throw new Error(`Invalid API URL: ${createUrl}. Expected URL to contain /api/v1/ess-portal/payslips`);
        }

        const response = await fetch(createUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'accept': 'application/json',
            ...getAuthHeaders()
          },
          body: JSON.stringify(payslipDataWithStatus)
        });

        if (response.ok) {
          setCreateSuccess('Payslip created successfully!');
          // Close modal and refresh data WITHOUT reloading page (preserves active tab)
          setTimeout(() => {
            setShowCreateModal(false);
            setIsEditMode(false);
            // Reload payslips data without page reload
            fetchPayslips();
          }, 500);
        } else {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to create payslip');
        }
      }
    } catch (error) {
      console.error(`Error ${isEditMode ? 'updating' : 'creating'} payslip:`, error);
      setCreateError(error instanceof Error ? error.message : `Failed to ${isEditMode ? 'update' : 'create'} payslip`);
    } finally {
      setCreateLoading(false);
    }
  };




  return (
    <div className="space-y-6">
      {/* Professional Header */}
      <div className="flex items-center justify-between bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: '#3366CC' }}>Finance Payslip Management</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Manage and review employee payslips</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 bg-[#3366CC]/10 dark:bg-[#3366CC]/20 px-4 py-2 rounded-xl">
            <Clock className="h-5 w-5" style={{ color: '#3366CC' }} />
            <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">
              {filteredPayslips.length} payslips
            </span>
          </div>

          {/* Create New Payslip Button */}
          <button
            onClick={() => window.location.href = '/ess-portal/finance/payslip/create'}
            className="inline-flex items-center px-4 py-2 text-white text-sm font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-200 shadow-lg hover:shadow-xl"
            style={{ backgroundColor: '#3366CC' }}
          >
            <FileText className="w-4 h-4 mr-2" />
            Create New Payslip
          </button>
        </div>
      </div>

      {/* Professional Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Payslips Card */}
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
                {summaryStats.totalPayslips}
              </p>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300 group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors duration-300 mt-1">
                Total Payslips
              </p>
            </div>

            <div className="mt-auto">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-500 dark:text-gray-400">Progress</span>
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{summaryStats.totalPayslips > 0 ? '100%' : '0%'}</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                <div className="h-2 rounded-full transition-all duration-1000 ease-out group-hover:animate-pulse" style={{ width: summaryStats.totalPayslips > 0 ? '100%' : '0%', backgroundColor: '#3366CC' }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Pending Payslips Card */}
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
                {summaryStats.pendingPayslips}
              </p>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300 group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors duration-300 mt-1">
                Pending Payslips
              </p>
            </div>

            <div className="mt-auto">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-500 dark:text-gray-400">Progress</span>
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{summaryStats.totalPayslips > 0 ? Math.round((summaryStats.pendingPayslips / summaryStats.totalPayslips) * 100) : 0}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                <div className="h-2 rounded-full transition-all duration-1000 ease-out group-hover:animate-pulse" style={{ width: summaryStats.totalPayslips > 0 ? `${(summaryStats.pendingPayslips / summaryStats.totalPayslips) * 100}%` : '0%', backgroundColor: '#3366CC' }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Approved Payslips Card */}
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
                {summaryStats.approvedPayslips}
              </p>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300 group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors duration-300 mt-1">
                Approved Payslips
              </p>
            </div>

            <div className="mt-auto">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-500 dark:text-gray-400">Progress</span>
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{summaryStats.totalPayslips > 0 ? Math.round((summaryStats.approvedPayslips / summaryStats.totalPayslips) * 100) : 0}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                <div className="h-2 rounded-full transition-all duration-1000 ease-out group-hover:animate-pulse" style={{ width: summaryStats.totalPayslips > 0 ? `${(summaryStats.approvedPayslips / summaryStats.totalPayslips) * 100}%` : '0%', backgroundColor: '#3366CC' }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Generated Payslips Card */}
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
                {summaryStats.generatedPayslips}
              </p>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300 group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors duration-300 mt-1">
                Generated Payslips
              </p>
            </div>

            <div className="mt-auto">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-500 dark:text-gray-400">Progress</span>
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{summaryStats.totalPayslips > 0 ? Math.round((summaryStats.generatedPayslips / summaryStats.totalPayslips) * 100) : 0}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                <div className="h-2 rounded-full transition-all duration-1000 ease-out group-hover:animate-pulse" style={{ width: summaryStats.totalPayslips > 0 ? `${(summaryStats.generatedPayslips / summaryStats.totalPayslips) * 100}%` : '0%', backgroundColor: '#3366CC' }}></div>
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
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
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
                  placeholder="Search payslips..."
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
                  <option value="approved">Approved</option>
                  <option value="pending">Pending</option>
                  <option value="rejected">Rejected</option>
                  <option value="generated">Generated</option>
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

            {/* Pay Period Filter */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center">
                <div className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: '#3366CC' }}></div>
                Pay Period
              </label>
              <div className="relative group">
                <select
                  value={selectedPayPeriod}
                  onChange={(e) => setSelectedPayPeriod(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-[#3366CC]/50 focus:border-[#3366CC] bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-all duration-200 shadow-sm hover:shadow-md appearance-none cursor-pointer"
                >
                  <option>All Periods</option>
                  <option value="2025">2025</option>
                  <option value="2024">2024</option>
                  <option value="2023">2023</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <div className="w-2 h-2 border-r-2 border-b-2 border-gray-400 dark:border-gray-500 rotate-45 transform"></div>
                </div>
              </div>
            </div>

            {/* Year Filter */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center">
                <div className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: '#3366CC' }}></div>
                Year
              </label>
              <div className="relative group">
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-[#3366CC]/50 focus:border-[#3366CC] bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-all duration-200 shadow-sm hover:shadow-md appearance-none cursor-pointer"
                >
                  <option>All Years</option>
                  <option value="2025">2025</option>
                  <option value="2024">2024</option>
                  <option value="2023">2023</option>
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
          <span className="ml-2 text-gray-600 dark:text-gray-400">Loading payslips...</span>
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
                <div>cd employee-self-service-converiqoai-10000016-python</div>
                <div>python main.py</div>
                <div className="text-gray-500 mt-1"># or</div>
                <div>uvicorn main:app --reload --host 0.0.0.0 --port 8000</div>
              </div>
              <p className="text-blue-700 text-xs mt-2">
                Then visit <code className="bg-blue-100 px-1 rounded">https://py-mobiloitte.converiqo.ai/docs</code> to verify the server is running.
              </p>
            </div>
          )}
          {error.includes('API not accessible') && !error.includes('server is not running') && (
            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-blue-800 text-sm">
                <strong>Development Mode:</strong> Make sure your Python backend server is running on <code className="bg-blue-100 px-1 rounded">https://py-mobiloitte.converiqo.ai</code>
              </p>
              <p className="text-blue-700 text-xs mt-1">
                Check the browser console for detailed API connection logs.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl p-4 shadow-lg mb-6">
          <p className="text-green-700 dark:text-green-400 font-medium">✅ {success}</p>
        </div>
      )}

      {/* Payslips Table */}
      {!loading && !error && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-x-auto border border-gray-200 dark:border-gray-700">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider min-w-[120px]">
                  Payslip ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider min-w-[150px]">
                  Employee
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider min-w-[200px]">
                  Pay Period
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Department
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Net Pay
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider min-w-[100px]">
                  Pay Date
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
              {filteredPayslips.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12">
                    <div className="flex flex-col items-center justify-center py-1">
                      <svg className="w-20 h-20 text-gray-300 dark:text-gray-600 mb-6" fill="none" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
                        <rect x="14" y="10" width="36" height="44" rx="4" stroke="currentColor" strokeWidth="2" fill="none" />
                        <path d="M22 22h20M22 30h20M22 38h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <p className="text-m font-semibold text-gray-900 dark:text-white">No payslips found</p>
                      <p className="text-m text-gray-500 dark:text-gray-400 mt-2">Try adjusting your filters or search criteria.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredPayslips.map((payslip) => (
                  <tr key={payslip.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition duration-150">

                    {/* Payslip ID */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium cursor-pointer" style={{ color: '#3366CC' }}>
                      {payslip.payslipId || payslip.id}
                    </td>

                    {/* Employee */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{payslip.employeeInfo?.fullName || 'N/A'}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{payslip.employeeInfo?.employeeCode || 'N/A'} • {payslip.employeeInfo?.designation || 'N/A'}</div>
                    </td>

                    {/* Pay Period */}
                    <td className="px-6 py-4 whitespace-normal">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{payslip.payslipInfo?.payPeriodStart || 'N/A'} - {payslip.payslipInfo?.payPeriodEnd || 'N/A'}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Pay Period</div>
                    </td>

                    {/* Department */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusTag status={payslip.employeeInfo?.department || 'N/A'} />
                    </td>

                    {/* Net Pay */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {formatCurrency(payslip.totals?.netPay || 0)}
                    </td>

                    {/* Pay Date */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {payslip.payslipInfo?.payDate ? new Date(payslip.payslipInfo.payDate).toLocaleDateString('en-GB') : 'N/A'}
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col space-y-1">
                        <StatusTag status={payslip.status || 'Pending'} />
                        {payslip.payslipType && (
                          <span className={`text-xs px-2 py-1 rounded-full ${payslip.payslipType === 'auto_generated'
                            ? 'bg-[#3366CC]/10 dark:bg-[#3366CC]/20 text-[#3366CC] dark:text-[#4a7dd9]'
                            : payslip.payslipType === 'employee_request'
                              ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'
                              : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                            }`}>
                            {payslip.payslipType === 'auto_generated' ? 'Auto Generated' :
                              payslip.payslipType === 'employee_request' ? 'Employee Request' :
                                'Manual'}
                          </span>
                        )}
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {payslip.updatedAt && `Updated: ${new Date(payslip.updatedAt).toLocaleDateString('en-GB')}`}
                        </div>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-1">
                        {/* View Button */}
                        <button
                          onClick={() => handleView(payslip)}
                          className="inline-flex items-center justify-center w-8 h-8 border border-gray-300 dark:border-gray-600 rounded-md text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* Edit Button - Only show for manual applications (not auto-generated) */}
                        {payslip.payslipType !== 'auto_generated' && (
                          <button
                            onClick={() => handleEdit(payslip)}
                            className="inline-flex items-center justify-center w-8 h-8 border rounded-md transition-colors"
                            style={{ borderColor: '#3366CC', color: '#3366CC' }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = '#3366CC';
                              e.currentTarget.style.color = 'white';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'transparent';
                              e.currentTarget.style.color = '#3366CC';
                            }}
                            title="Edit Payslip"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                        )}

                        {/* Approve Button - Show for any pending payslip */}
                        {payslip.status?.toLowerCase() === 'pending' && (
                          <button
                            onClick={() => handleApprove(payslip.id)}
                            className="inline-flex items-center justify-center w-8 h-8 border border-green-300 dark:border-green-600 rounded-md text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                            title="Approve Payslip"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}

                        {/* Reject Button - Show for any pending payslip */}
                        {payslip.status?.toLowerCase() === 'pending' && (
                          <button
                            onClick={() => handleReject(payslip.id)}
                            className="inline-flex items-center justify-center w-8 h-8 border border-red-300 dark:border-red-600 rounded-md text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            title="Reject Payslip"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}

                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Payslip Creation Modal */}
      {showCreateModal && selectedPayslip && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {isEditMode ? 'Edit Payslip' : 'Create Payslip'}
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  {isEditMode ? 'Update' : 'Create'} payslip details for {selectedPayslip.employeeInfo?.fullName} ({selectedPayslip.employeeInfo?.employeeCode})
                </p>
              </div>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setIsEditMode(false);
                }}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <X className="w-6 h-6 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            {/* Modal Content */}
            <form onSubmit={handleCreateSubmit} className="p-6 space-y-6">
              {/* Employee Information */}
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                  <User className="w-5 h-5 mr-2" style={{ color: '#3366CC' }} />
                  Employee Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Employee Name</label>
                    <input
                      type="text"
                      value={selectedPayslip.employeeInfo?.fullName || ''}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Employee ID</label>
                    <input
                      type="text"
                      value={selectedPayslip.employeeInfo?.employeeCode || ''}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Department</label>
                    <input
                      type="text"
                      value={selectedPayslip.employeeInfo?.department || ''}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Designation</label>
                    <input
                      type="text"
                      value={selectedPayslip.employeeInfo?.designation || ''}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                    />
                  </div>
                </div>
              </div>

              {/* Pay Period */}
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                  <Calendar className="w-5 h-5 mr-2" style={{ color: '#3366CC' }} />
                  Pay Period
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Pay Period Start</label>
                    <input
                      type="text"
                      value={selectedPayslip.payslipInfo?.payPeriodStart || ''}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Pay Period End</label>
                    <input
                      type="text"
                      value={selectedPayslip.payslipInfo?.payPeriodEnd || ''}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Pay Date</label>
                    <input
                      type="text"
                      value={selectedPayslip.payslipInfo?.payDate || ''}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                    />
                  </div>
                </div>
              </div>

              {/* Salary Details */}
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                  <DollarSign className="w-5 h-5 mr-2" style={{ color: '#3366CC' }} />
                  Salary Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Earnings */}
                  <div className="space-y-4">
                    <h4 className="text-md font-medium text-gray-800 dark:text-gray-200">Earnings</h4>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Basic Salary *</label>
                      <input
                        type="number"
                        value={createFormData.basicSalary || ''}
                        onChange={(e) => handleFormInputChange('basicSalary', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#3366CC]/50 focus:border-[#3366CC]"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">HRA</label>
                      <input
                        type="number"
                        value={createFormData.hra || ''}
                        onChange={(e) => handleFormInputChange('hra', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#3366CC]/50 focus:border-[#3366CC]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Special Allowance</label>
                      <input
                        type="number"
                        value={createFormData.specialAllowance || ''}
                        onChange={(e) => handleFormInputChange('specialAllowance', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#3366CC]/50 focus:border-[#3366CC]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Other Allowances</label>
                      <input
                        type="number"
                        value={createFormData.otherAllowances || ''}
                        onChange={(e) => handleFormInputChange('otherAllowances', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#3366CC]/50 focus:border-[#3366CC]"
                      />
                    </div>
                  </div>

                  {/* Deductions */}
                  <div className="space-y-4">
                    <h4 className="text-md font-medium text-gray-800 dark:text-gray-200">Deductions</h4>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">PF</label>
                      <input
                        type="number"
                        value={createFormData.pf || ''}
                        onChange={(e) => handleFormInputChange('pf', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#3366CC]/50 focus:border-[#3366CC]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ESI</label>
                      <input
                        type="number"
                        value={createFormData.esi || ''}
                        onChange={(e) => handleFormInputChange('esi', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#3366CC]/50 focus:border-[#3366CC]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">TDS</label>
                      <input
                        type="number"
                        value={createFormData.tds || ''}
                        onChange={(e) => handleFormInputChange('tds', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#3366CC]/50 focus:border-[#3366CC]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Other Deductions</label>
                      <input
                        type="number"
                        value={createFormData.otherDeductions || ''}
                        onChange={(e) => handleFormInputChange('otherDeductions', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#3366CC]/50 focus:border-[#3366CC]"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Salary Summary */}
              <div className="bg-[#3366CC]/10 dark:bg-[#3366CC]/20 rounded-xl p-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                  <Calculator className="w-5 h-5 mr-2" style={{ color: '#3366CC' }} />
                  Salary Summary
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white dark:bg-gray-700 rounded-lg p-3">
                    <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Total Earnings</h4>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">₹{totalEarnings.toLocaleString()}</p>
                  </div>
                  <div className="bg-white dark:bg-gray-700 rounded-lg p-3">
                    <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Total Deductions</h4>
                    <p className="text-2xl font-bold text-red-600 dark:text-red-400">₹{totalDeductions.toLocaleString()}</p>
                  </div>
                  <div className="bg-white dark:bg-gray-700 rounded-lg p-3">
                    <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Net Pay</h4>
                    <p className="text-2xl font-bold" style={{ color: '#3366CC' }}>₹{netPay.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {/* Bank Information for Salary Transfer */}
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                  <CreditCard className="w-5 h-5 mr-2" style={{ color: '#3366CC' }} />
                  Bank Information (Salary Transfer)
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Required fields for salary transfer processing. These details are used for NEFT/RTGS transactions.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Account Number *
                      <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">(Salary transfer account)</span>
                    </label>
                    <input
                      type="text"
                      value={createFormData.bankAccountNo || ''}
                      onChange={(e) => handleFormInputChange('bankAccountNo', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#3366CC]/50 focus:border-[#3366CC]"
                      placeholder="Enter bank account number"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      IFSC Code *
                      <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">(For NEFT/RTGS)</span>
                    </label>
                    <input
                      type="text"
                      value={createFormData.ifscCode || ''}
                      onChange={(e) => handleFormInputChange('ifscCode', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#3366CC]/50 focus:border-[#3366CC]"
                      placeholder="Enter IFSC code"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Additional Employee Information */}
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                  <User className="w-5 h-5 mr-2" style={{ color: '#3366CC' }} />
                  Additional Employee Information
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Optional fields used for tax calculations, deductions, and employee records.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      PAN Number
                      <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">(For TDS calculation)</span>
                    </label>
                    <input
                      type="text"
                      value={createFormData.panNumber || ''}
                      onChange={(e) => handleFormInputChange('panNumber', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#3366CC]/50 focus:border-[#3366CC]"
                      placeholder="Enter PAN number"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      UAN Number
                      <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">(Provident Fund)</span>
                    </label>
                    <input
                      type="text"
                      value={createFormData.uan || ''}
                      onChange={(e) => handleFormInputChange('uan', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#3366CC]/50 focus:border-[#3366CC]"
                      placeholder="Enter UAN number"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      PF Number
                      <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">(For PF deduction)</span>
                    </label>
                    <input
                      type="text"
                      value={createFormData.pfNumber || ''}
                      onChange={(e) => handleFormInputChange('pfNumber', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#3366CC]/50 focus:border-[#3366CC]"
                      placeholder="Enter PF number"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      ESI Number
                      <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">(Health insurance)</span>
                    </label>
                    <input
                      type="text"
                      value={createFormData.esiNumber || ''}
                      onChange={(e) => handleFormInputChange('esiNumber', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#3366CC]/50 focus:border-[#3366CC]"
                      placeholder="Enter ESI number"
                    />
                  </div>
                </div>
              </div>

              {/* Remarks */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Remarks</label>
                <textarea
                  value={createFormData.remarks || ''}
                  onChange={(e) => handleFormInputChange('remarks', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#3366CC]/50 focus:border-[#3366CC]"
                  placeholder="Enter any remarks or notes..."
                />
              </div>

              {/* Error/Success Messages */}
              {createError && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                  <p className="text-red-600 dark:text-red-400">{createError}</p>
                </div>
              )}

              {createSuccess && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                  <p className="text-green-600 dark:text-green-400">{createSuccess}</p>
                </div>
              )}

              {/* Modal Footer */}
              <div className="flex justify-end space-x-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="px-6 py-2 text-white rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  style={{ backgroundColor: '#3366CC' }}
                >
                  {createLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      {isEditMode ? 'Updating...' : 'Creating...'}
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      {isEditMode ? 'Update Payslip' : 'Create Payslip'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payslip View Modal */}
      {showViewModal && selectedPayslip && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Payslip Details</h2>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  {selectedPayslip.employeeInfo?.fullName} ({selectedPayslip.employeeInfo?.employeeCode})
                </p>
              </div>
              <button
                onClick={() => setShowViewModal(false)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <X className="w-6 h-6 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Employee Information */}
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Employee Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">Employee Code:</span>
                    <p className="font-medium text-gray-900 dark:text-white">{selectedPayslip.employeeInfo?.employeeCode}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">Full Name:</span>
                    <p className="font-medium text-gray-900 dark:text-white">{selectedPayslip.employeeInfo?.fullName}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">Email:</span>
                    <p className="font-medium text-gray-900 dark:text-white">{selectedPayslip.employeeInfo?.email}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">Department:</span>
                    <p className="font-medium text-gray-900 dark:text-white">{selectedPayslip.employeeInfo?.department}</p>
                  </div>
                </div>
              </div>

              {/* Payslip Information */}
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Payslip Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">Payslip ID:</span>
                    <p className="font-medium text-gray-900 dark:text-white" style={{ color: '#3366CC' }}>
                      {selectedPayslip.payslipId || selectedPayslip.id}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">Pay Period:</span>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {selectedPayslip.payslipInfo?.payPeriodStart && selectedPayslip.payslipInfo?.payPeriodEnd
                        ? `${new Date(selectedPayslip.payslipInfo.payPeriodStart).toLocaleDateString('en-GB')} - ${new Date(selectedPayslip.payslipInfo.payPeriodEnd).toLocaleDateString('en-GB')}`
                        : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">Pay Date:</span>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {selectedPayslip.payslipInfo?.payDate ? new Date(selectedPayslip.payslipInfo.payDate).toLocaleDateString('en-GB') : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">Status:</span>
                    <p className="font-medium">
                      <StatusTag status={selectedPayslip.status || 'Pending'} />
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">Type:</span>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {selectedPayslip.payslipType === 'auto_generated' ? 'Auto Generated' :
                        selectedPayslip.payslipType === 'employee_request' ? 'Employee Request' :
                          'Manual'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Earnings */}
              {selectedPayslip.earnings && selectedPayslip.earnings.length > 0 && (
                <div className="bg-green-50 rounded-xl p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Earnings</h3>
                  <div className="space-y-2">
                    {selectedPayslip.earnings.map((earning, index) => (
                      <div key={index} className="flex justify-between">
                        <span className="text-gray-600">{earning.type}:</span>
                        <span className="font-medium">₹{earning.amount.toLocaleString()}</span>
                      </div>
                    ))}
                    <div className="border-t pt-2 mt-2">
                      <div className="flex justify-between font-bold text-lg">
                        <span>Total Earnings:</span>
                        <span>₹{selectedPayslip.earnings.reduce((sum, earning) => sum + earning.amount, 0).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Deductions */}
              {selectedPayslip.deductions && selectedPayslip.deductions.length > 0 && (
                <div className="bg-red-50 rounded-xl p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Deductions</h3>
                  <div className="space-y-2">
                    {selectedPayslip.deductions.map((deduction, index) => (
                      <div key={index} className="flex justify-between">
                        <span className="text-gray-600">{deduction.type}:</span>
                        <span className="font-medium">₹{deduction.amount.toLocaleString()}</span>
                      </div>
                    ))}
                    <div className="border-t pt-2 mt-2">
                      <div className="flex justify-between font-bold text-lg">
                        <span>Total Deductions:</span>
                        <span>₹{selectedPayslip.deductions.reduce((sum, deduction) => sum + deduction.amount, 0).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Net Pay */}
              {selectedPayslip.totals?.netPay !== undefined && (
                <div className="bg-blue-50 rounded-xl p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-xl font-bold text-gray-900">Net Pay:</span>
                    <span className="text-2xl font-bold text-blue-600">₹{selectedPayslip.totals.netPay.toLocaleString()}</span>
                  </div>
                </div>
              )}

              {/* Additional Information */}
              {selectedPayslip.additionalInfo && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Information</h3>
                  <div className="space-y-2">
                    {selectedPayslip.additionalInfo.pfNumber && (
                      <div>
                        <span className="text-sm text-gray-600">PF Number:</span>
                        <p className="font-medium">{selectedPayslip.additionalInfo.pfNumber}</p>
                      </div>
                    )}
                    {selectedPayslip.additionalInfo.esiNumber && (
                      <div>
                        <span className="text-sm text-gray-600">ESI Number:</span>
                        <p className="font-medium">{selectedPayslip.additionalInfo.esiNumber}</p>
                      </div>
                    )}
                    {selectedPayslip.additionalInfo.remarks && (
                      <div>
                        <span className="text-sm text-gray-600">Remarks:</span>
                        <p className="font-medium">{selectedPayslip.additionalInfo.remarks}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setShowViewModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {
                  // Download payslip as PDF
                  console.log('Download payslip:', selectedPayslip.id);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Download PDF
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default FinancePayslip;