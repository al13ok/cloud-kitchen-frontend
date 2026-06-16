"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { DollarLineIcon } from '@/icons';
import { DollarSign, RefreshCw, Plus, Calendar, Download, Trash2, Edit, Eye, CheckCircle, XCircle } from 'lucide-react';
import DashboardHeader from '@/components/header/DashboardHeader';
import { apiFetch } from '@/lib/api';
import jsPDF from 'jspdf';
import Pagination from '@/components/tables/Pagination';

interface Payslip {
  id: string;
  payslipId: string;
  employee: {
    name: string;
    empId: string;
    jobTitle: string;
    email: string;
  };
  department: string;
  month: string;
  payDate: string;
  grossPay: number;
  netPay: number;
  status: 'Pending' | 'Finance Approved' | 'Finance Rejected' | 'Generated';
}

// Types for transforming API response into the modal shape
type ApiPayslip = {
  id: string;
  employeeInfo: {
    employeeCode: string;
    fullName: string;
    email: string;
    designation: string;
    dateOfJoining: string;
    bankAccountNo: string;
    uan: string;
    department: string;
    panNumber: string;
    ifscCode: string;
  };
  payslipInfo: {
    payPeriodStart: string;
    payPeriodEnd: string;
    payDate: string;
  };
  earnings: Array<{ type: string; amount: number }>;
  deductions: Array<{ type: string; amount: number }>;
  totals: {
    totalEarnings: number;
    totalDeductions: number;
    netPay: number;
    grossPay: number;
  };
  additionalInfo?: {
    pfNumber?: string;
    esiNumber?: string;
    remarks?: string;
  };
  status?: string;
  createdAt: string;
  updatedAt: string;
};

const PayslipsComponent: React.FC = () => {
  const router = useRouter();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [departmentFilter, setDepartmentFilter] = useState('All Departments');
  const [userRole, setUserRole] = useState<string>('employee');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationMessage, setGenerationMessage] = useState<string>('');

  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  // filterApplied state removed as it's not used

  // Helpers to map API data to table row
  const parseMonth = (start: string, end: string) => {
    // Expect formats like DD/MM/YYYY
    const pick = end || start;
    const parts = pick.split('/');
    const mm = parts[1];
    const yyyy = parts[2];
    return yyyy && mm ? `${yyyy}-${mm}` : pick;
  };

  const mapApiToRow = useCallback((p: ApiPayslip): Payslip => {
    const basicId = p.id;
    const payslipId = `PS-${parseMonth(p.payslipInfo.payPeriodStart, p.payslipInfo.payPeriodEnd)}-${p.employeeInfo.employeeCode}`;
    return {
      id: basicId,
      payslipId,
      employee: {
        name: p.employeeInfo.fullName,
        empId: p.employeeInfo.employeeCode,
        jobTitle: p.employeeInfo.designation,
        email: p.employeeInfo.email,
      },
      department: p.employeeInfo.department,
      month: parseMonth(p.payslipInfo.payPeriodStart, p.payslipInfo.payPeriodEnd),
      payDate: p.payslipInfo.payDate,
      grossPay: p.totals.grossPay,
      netPay: p.totals.netPay,
      // Map backend status to frontend status - Only Finance-related statuses for payslips
      status: (() => {
        if (p.status) {
          const status = p.status.toLowerCase();
          if (status === 'approved' || status === 'finance_approved') {
            return 'Finance Approved' as const;
          } else if (status === 'rejected' || status === 'finance_rejected') {
            return 'Finance Rejected' as const;
          } else if (status === 'generated') {
            return 'Generated' as const;
          } else {
            return 'Pending' as const;
          }
        }
        return 'Pending' as const;
      })(),
    };
  }, []);

  // Determine user role
  useEffect(() => {
    if (user && 'role' in user && user.role) {
      setUserRole(user.role as string);
    } else {
      // Fallback to checking localStorage or default to employee
      const role = localStorage.getItem('userRole') || 'employee';
      setUserRole(role);
    }
  }, [user]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await apiFetch('/api/v1/ess-portal/payslips', { headers: { accept: 'application/json' } });
        if (!res.ok) throw new Error(`Failed to fetch payslips (${res.status})`);
        const json = await res.json();
        const items: ApiPayslip[] = json?.data || [];
        const rows = items.map(mapApiToRow);
        if (mounted) setPayslips(rows);
      } catch (e: unknown) {
        if (mounted) setError(e instanceof Error ? e.message : 'Failed to load payslips');
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    load();

    // Poll for status updates every 10 seconds to reflect manager approval changes
    const interval = setInterval(async () => {
      if (!mounted) return;

      try {
        const res = await apiFetch('/api/v1/ess-portal/payslips', { headers: { accept: 'application/json' } });
        if (!res.ok) return;

        const json = await res.json();
        const items: ApiPayslip[] = json?.data || [];
        const rows = items.map(mapApiToRow);

        if (mounted) {
          setPayslips(prevPayslips => {
            // Only update if there are actual changes
            const hasChanges = JSON.stringify(prevPayslips) !== JSON.stringify(rows);
            return hasChanges ? rows : prevPayslips;
          });
        }
      } catch (e) {
        // Ignore polling errors
        console.warn('Error polling payslips status:', e);
      }
    }, 10000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [mapApiToRow]);

  // Calculate summary statistics
  const totalPayslips = payslips.length;
  const approvedPayslips = payslips.filter(p => p.status === 'Finance Approved').length;
  const rejectedPayslips = payslips.filter(p => p.status === 'Finance Rejected').length;
  const pendingPayslips = payslips.filter(p => p.status === 'Pending').length;

  // Filter payslips based on search and filters
  const filteredPayslips = payslips.filter(payslip => {
    const matchesSearch = searchTerm === '' ||
      payslip.employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payslip.employee.empId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payslip.employee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payslip.payslipId.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'All Status' || payslip.status === statusFilter;
    const matchesDepartment = departmentFilter === 'All Departments' || payslip.department === departmentFilter;

    return matchesSearch && matchesStatus && matchesDepartment;
  });

  // Calculate pagination
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedPayslips = filteredPayslips.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, departmentFilter]);

  const handleDownload = (payslip: Payslip) => {
    // Create PDF document
    const doc = new jsPDF();

    // Add title
    doc.setFontSize(20);
    doc.text('Payslip Details', 20, 30);

    // Add payslip ID
    doc.setFontSize(14);
    doc.text(`Payslip ID: ${payslip.payslipId}`, 20, 50);

    // Add employee information
    doc.setFontSize(14);
    doc.text('Employee Information:', 20, 70);
    doc.setFontSize(12);
    doc.text(`Employee ID: ${payslip.employee.empId}`, 20, 85);
    doc.text(`Full Name: ${payslip.employee.name}`, 20, 95);
    doc.text(`Job Title: ${payslip.employee.jobTitle}`, 20, 105);
    doc.text(`Email: ${payslip.employee.email}`, 20, 115);
    doc.text(`Department: ${payslip.department}`, 20, 125);

    // Add payslip details
    doc.setFontSize(14);
    doc.text('Payslip Information:', 20, 145);
    doc.setFontSize(12);
    doc.text(`Month: ${payslip.month}`, 20, 160);
    doc.text(`Pay Date: ${formatDate(payslip.payDate)}`, 20, 170);
    doc.text(`Gross Pay: $${payslip.grossPay.toFixed(2)}`, 20, 180);
    doc.text(`Net Pay: $${payslip.netPay.toFixed(2)}`, 20, 190);
    doc.text(`Status: ${payslip.status}`, 20, 200);

    // Add summary
    doc.setFontSize(14);
    doc.text('Summary:', 20, 220);
    doc.setFontSize(12);
    doc.text(`Total Gross Pay: $${payslip.grossPay.toFixed(2)}`, 20, 235);
    doc.text(`Total Net Pay: $${payslip.netPay.toFixed(2)}`, 20, 245);
    const deductions = payslip.grossPay - payslip.netPay;
    doc.text(`Total Deductions: $${deductions.toFixed(2)}`, 20, 255);

    // Generate filename with custom format: payslip_id:date:time
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD format
    const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS format
    const filename = `${payslip.payslipId}:${dateStr}:${timeStr}.pdf`;

    // Save the PDF
    doc.save(filename);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const handleView = (row: Payslip) => {
    // Navigate to the dynamic payslip view page
    router.push(`/ess-portal/payslips/${row.id}`);
  };

  // Expose a reusable loader for handlers to refresh data after actions
  const loadPayslips = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiFetch('/api/v1/ess-portal/payslips', { headers: { accept: 'application/json' } });
      if (!res.ok) throw new Error(`Failed to fetch payslips (${res.status})`);
      const json = await res.json();
      const items: ApiPayslip[] = json?.data || [];
      const rows = items.map(mapApiToRow);
      setPayslips(rows);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load payslips');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (payslipId: string) => {
    try {
      const response = await apiFetch(`/api/v1/ess-portal/payslips/${payslipId}/approve`, {
        method: 'PUT',
      });

      if (response.ok) {
        // Refresh the payslips list
        await loadPayslips();
        console.log('Payslip approved successfully');
      } else {
        throw new Error('Failed to approve payslip');
      }
    } catch (error) {
      console.error('Error approving payslip:', error);
    }
  };

  const handleReject = async (payslipId: string) => {
    try {
      const response = await apiFetch(`/api/v1/ess-portal/payslips/${payslipId}/reject`, {
        method: 'PUT',
      });

      if (response.ok) {
        // Refresh the payslips list
        await loadPayslips();
        console.log('Payslip rejected successfully');
      } else {
        throw new Error('Failed to reject payslip');
      }
    } catch (error) {
      console.error('Error rejecting payslip:', error);
    }
  };

  const handleFilterChange = (filterType: string, value: string) => {
    // setFilterApplied calls removed as filterApplied state is not used

    if (filterType === 'status') {
      setStatusFilter(value);
    } else if (filterType === 'department') {
      setDepartmentFilter(value);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Finance Approved':
        return 'bg-gradient-to-r from-emerald-100 to-emerald-100 text-emerald-700 border-emerald-200';
      case 'Finance Rejected':
        return 'bg-gradient-to-r from-red-100 to-red-100 text-red-700 border-red-200';
      case 'Generated':
        return 'bg-gradient-to-r from-blue-100 to-blue-100 text-blue-700 border-blue-200';
      case 'Pending':
        return 'bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-700 border-amber-200';
      default:
        return 'bg-gradient-to-r from-slate-100 to-gray-100 text-slate-700 border-slate-200';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  // Automated payslip generation functions
  const generateMonthlyPayslips = async () => {
    if (userRole !== 'finance' && userRole !== 'admin') {
      setError('Only finance team and admin users can generate payslips');
      return;
    }

    setIsGenerating(true);
    setGenerationMessage('');
    setError(null);

    try {
      const currentDate = new Date();
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1; // JavaScript months are 0-indexed

      const response = await apiFetch('/api/v1/ess-portal/payslips/generate-monthly', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          year: year,
          month: month
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to generate payslips: ${errorText}`);
      }

      const result = await response.json();

      if (result.success) {
        setGenerationMessage(`Successfully generated ${result.generatedCount} payslips for ${month}/${year}`);
        // Refresh the payslips list
        window.location.reload();
      } else {
        setError(result.message || 'Failed to generate payslips');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to generate payslips');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeletePayslip = async (payslipId: string) => {
    if (userRole !== 'finance' && userRole !== 'admin') {
      setError('Only finance team and admin users can delete payslips');
      return;
    }

    if (!confirm('Are you sure you want to delete this payslip? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await apiFetch(`/api/v1/ess-portal/payslips/${payslipId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to delete payslip: ${errorText}`);
      }

      // Remove the payslip from the local state
      setPayslips(prevPayslips => prevPayslips.filter(p => p.id !== payslipId));
      setGenerationMessage('Payslip deleted successfully');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to delete payslip');
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden dark:bg-black" style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.03) 0%, rgba(99, 102, 241, 0.03) 50%, rgba(14, 165, 233, 0.03) 100%)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        {/* Error Alert */}
        {error && (
          <div className="mb-6 animate-slide-down">
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 shadow-sm">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400 dark:text-red-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Success Message */}
        {generationMessage && (
          <div className="mb-6 animate-slide-down">
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 shadow-sm">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-400 dark:text-green-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-green-800 dark:text-green-200">{generationMessage}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modern Header */}
        <DashboardHeader
          title="Payslips Management"
          subtitle={`Advanced payroll management system with intelligent salary processing, automated monthly payslip generation, and enterprise-grade financial compliance. ${userRole === 'finance' || userRole === 'admin' ? 'Full CRUD operations available for finance team.' : 'Apply for payslips, view and download your payslips.'}`}
          icon={DollarSign}
          variant="default"
          size="md"
          actions={
            <div className="flex flex-col space-y-3 sm:flex-row sm:space-y-0 sm:space-x-3">
              {/* Employee Actions */}
              {userRole === 'employee' && (
                <button
                  onClick={() => router.push('/ess-portal/payslips/create')}
                  className="flex items-center px-6 py-3 bg-white/20 rounded-xl backdrop-blur-sm border border-white/30 text-white hover:bg-white/30 transition-all duration-200 hover:scale-105 whitespace-nowrap"
                  title="Apply for Payslip"
                >
                  <Plus className="w-5 h-5 mr-2 flex-shrink-0" />
                  <span className="font-medium whitespace-nowrap">Apply Payslip</span>
                </button>
              )}

              {/* Finance/Admin Actions */}
              {(userRole === 'finance' || userRole === 'admin') && (
                <>
                  <button
                    onClick={() => router.push('/ess-portal/payslips/create')}
                    className="flex items-center px-6 py-3 bg-white/20 rounded-xl backdrop-blur-sm border border-white/30 text-white hover:bg-white/30 transition-all duration-200 hover:scale-105 whitespace-nowrap"
                    title="Create New Payslip"
                  >
                    <Plus className="w-5 h-5 mr-2 flex-shrink-0" />
                    <span className="font-medium whitespace-nowrap">Create New Payslip</span>
                  </button>

                  <button
                    onClick={generateMonthlyPayslips}
                    disabled={isGenerating}
                    className="flex items-center px-6 py-3 bg-white/20 rounded-xl backdrop-blur-sm border border-white/30 text-white hover:bg-white/30 transition-all duration-200 hover:scale-105 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Generate Monthly Payslips Automatically"
                  >
                    <Calendar className="w-5 h-5 mr-2 flex-shrink-0" />
                    <span className="font-medium whitespace-nowrap">
                      {isGenerating ? 'Generating...' : 'Auto Generate'}
                    </span>
                  </button>
                </>
              )}

              <button
                onClick={() => window.location.reload()}
                className="flex items-center px-6 py-3 bg-white/20 rounded-xl backdrop-blur-sm border border-white/30 text-white hover:bg-white/30 transition-all duration-200 hover:scale-105 whitespace-nowrap"
                title="Refresh Data"
              >
                <RefreshCw className="w-5 h-5 mr-2 flex-shrink-0" />
                <span className="font-medium whitespace-nowrap">Refresh</span>
              </button>
            </div>
          }
        />

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="relative bg-white/90 dark:bg-black backdrop-blur-sm rounded-2xl shadow-lg dark:shadow-gray-900/50 hover:shadow-2xl transition-all duration-500 hover:scale-105 cursor-pointer group overflow-hidden border border-slate-200/50 dark:border-gray-700/50" style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.03) 0%, rgba(99, 102, 241, 0.03) 50%, rgba(14, 165, 233, 0.03) 100%)' }}>
            {/* Professional Background Effects */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/90 to-slate-50/90 dark:from-gray-800/90 dark:to-gray-900/90 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-indigo-100/60 to-slate-100/60 dark:from-indigo-900/40 dark:to-slate-900/40 rounded-full -translate-y-10 translate-x-10 opacity-0 group-hover:opacity-70 transition-opacity duration-500"></div>
            <div className="relative z-10 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-xl bg-[#3366CC] shadow-lg">
                  <DollarLineIcon className="w-6 h-6 text-white" />
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-3xl font-bold text-slate-800 dark:text-white">{totalPayslips}</p>
                <p className="text-slate-600 dark:text-gray-300 text-sm font-medium">Total Payslips</p>
                <div className="mt-auto">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-slate-500 dark:text-gray-400">Progress</span>
                    <span className="text-xs font-semibold text-slate-700 dark:text-gray-300">{totalPayslips > 0 ? '100%' : '0%'}</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                    <div className="bg-[#3366CC] h-2 rounded-full transition-all duration-1000 ease-out group-hover:animate-pulse" style={{ width: totalPayslips > 0 ? '100%' : '0%' }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="relative bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-lg dark:shadow-gray-900/50 hover:shadow-2xl transition-all duration-500 hover:scale-105 cursor-pointer group overflow-hidden border border-slate-200/50 dark:border-gray-700/50" style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.03) 0%, rgba(99, 102, 241, 0.03) 50%, rgba(14, 165, 233, 0.03) 100%)' }}>
            {/* Professional Background Effects */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/90 to-slate-50/90 dark:from-gray-800/90 dark:to-gray-900/90 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-indigo-100/60 to-slate-100/60 dark:from-indigo-900/40 dark:to-slate-900/40 rounded-full -translate-y-10 translate-x-10 opacity-0 group-hover:opacity-70 transition-opacity duration-500"></div>
            <div className="relative z-10 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-xl bg-[#3366CC] shadow-lg">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-3xl font-bold text-[#3366CC] dark:text-[#4a7dd9]">{pendingPayslips}</p>
                <p className="text-slate-600 dark:text-gray-300 text-sm font-medium">Pending</p>
                <div className="mt-auto">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-slate-500 dark:text-gray-400">Progress</span>
                    <span className="text-xs font-semibold text-slate-700 dark:text-gray-300">{totalPayslips > 0 ? Math.round((pendingPayslips / totalPayslips) * 100) : 0}%</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                    <div className="bg-[#3366CC] h-2 rounded-full transition-all duration-1000 ease-out group-hover:animate-pulse" style={{ width: totalPayslips > 0 ? `${(pendingPayslips / totalPayslips) * 100}%` : '0%' }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="relative bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-lg dark:shadow-gray-900/50 hover:shadow-2xl transition-all duration-500 hover:scale-105 cursor-pointer group overflow-hidden border border-slate-200/50 dark:border-gray-700/50" style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.03) 0%, rgba(99, 102, 241, 0.03) 50%, rgba(14, 165, 233, 0.03) 100%)' }}>
            {/* Professional Background Effects */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/90 to-slate-50/90 dark:from-gray-800/90 dark:to-gray-900/90 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-indigo-100/60 to-slate-100/60 dark:from-indigo-900/40 dark:to-slate-900/40 rounded-full -translate-y-10 translate-x-10 opacity-0 group-hover:opacity-70 transition-opacity duration-500"></div>
            <div className="relative z-10 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-xl bg-[#3366CC] shadow-lg">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-3xl font-bold text-[#3366CC] dark:text-[#4a7dd9]">{approvedPayslips}</p>
                <p className="text-slate-600 dark:text-gray-300 text-sm font-medium">Approved</p>
                <div className="mt-auto">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-slate-500 dark:text-gray-400">Progress</span>
                    <span className="text-xs font-semibold text-slate-700 dark:text-gray-300">{totalPayslips > 0 ? Math.round((approvedPayslips / totalPayslips) * 100) : 0}%</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                    <div className="bg-[#3366CC] h-2 rounded-full transition-all duration-1000 ease-out group-hover:animate-pulse" style={{ width: totalPayslips > 0 ? `${(approvedPayslips / totalPayslips) * 100}%` : '0%' }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="relative bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-lg dark:shadow-gray-900/50 hover:shadow-2xl transition-all duration-500 hover:scale-105 cursor-pointer group overflow-hidden border border-slate-200/50 dark:border-gray-700/50" style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.03) 0%, rgba(99, 102, 241, 0.03) 50%, rgba(14, 165, 233, 0.03) 100%)' }}>
            {/* Professional Background Effects */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/90 to-slate-50/90 dark:from-gray-800/90 dark:to-gray-900/90 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-indigo-100/60 to-slate-100/60 dark:from-indigo-900/40 dark:to-slate-900/40 rounded-full -translate-y-10 translate-x-10 opacity-0 group-hover:opacity-70 transition-opacity duration-500"></div>
            <div className="relative z-10 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-xl bg-[#3366CC] shadow-lg">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-3xl font-bold text-[#3366CC] dark:text-[#4a7dd9]">{rejectedPayslips}</p>
                <p className="text-slate-600 dark:text-gray-300 text-sm font-medium">Rejected</p>
                <div className="mt-auto">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-slate-500 dark:text-gray-400">Progress</span>
                    <span className="text-xs font-semibold text-slate-700 dark:text-gray-300">{totalPayslips > 0 ? Math.round((rejectedPayslips / totalPayslips) * 100) : 0}%</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                    <div className="bg-[#3366CC] h-2 rounded-full transition-all duration-1000 ease-out group-hover:animate-pulse" style={{ width: totalPayslips > 0 ? `${(rejectedPayslips / totalPayslips) * 100}%` : '0%' }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>


        </div>

        {/* Filters */}
        <div className="bg-white/90 dark:bg-black backdrop-blur-sm rounded-2xl shadow-xl dark:shadow-gray-900/50 border border-slate-200/50 dark:border-gray-700/50 hover:shadow-2xl transition-all duration-300 p-6 mb-8" style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.03) 0%, rgba(99, 102, 241, 0.03) 50%, rgba(14, 165, 233, 0.03) 100%)' }}>
          <div className="flex items-center mb-4">
            <div className="p-2 rounded-xl bg-[#3366CC]/10 dark:bg-[#3366CC]/20 mr-3">
              <svg className="w-5 h-5 text-[#3366CC] dark:text-[#4a7dd9]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-[#3366CC] dark:text-[#4a7dd9] flex items-center">Advanced Filters</h2>
          </div>
          <p className="text-slate-600 dark:text-gray-300 text-sm mb-6">Filter and search through payslips with precision</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="group">
              <label className="block text-sm font-medium text-[#3366CC] dark:text-[#4a7dd9] mb-2 flex items-center">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Search
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-[#3366CC]/50 dark:focus:ring-[#3366CC]/50 focus:border-[#3366CC] dark:focus:border-[#3366CC] bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-400 hover:bg-white/80 dark:hover:bg-gray-700/80 transition-all duration-200 shadow-sm hover:shadow-md"
                  placeholder="Search by name, ID, or email..."
                />
                <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#3366CC] dark:text-[#4a7dd9] transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">Status</label>
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="w-full px-3 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-[#3366CC]/50 dark:focus:ring-[#3366CC]/50 focus:border-[#3366CC] dark:focus:border-[#3366CC] bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-white/80 dark:hover:bg-gray-700/80 transition-all duration-200 shadow-sm hover:shadow-md appearance-none cursor-pointer"
                >
                  <option value="All Status" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white">All Status</option>
                  <option value="Pending" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white">Pending</option>
                  <option value="Finance Approved" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white">Finance Approved</option>
                  <option value="Finance Rejected" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white">Finance Rejected</option>
                  <option value="Generated" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white">Generated</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">Department</label>
              <div className="relative">
                <select
                  value={departmentFilter}
                  onChange={(e) => handleFilterChange('department', e.target.value)}
                  className="w-full px-3 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-[#3366CC]/50 dark:focus:ring-[#3366CC]/50 focus:border-[#3366CC] dark:focus:border-[#3366CC] bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-white/80 dark:hover:bg-gray-700/80 transition-all duration-200 shadow-sm hover:shadow-md appearance-none cursor-pointer"
                >
                  <option value="All Departments" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white">All Departments</option>
                  <option value="Engineering" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white">Engineering</option>
                  <option value="Human Resources" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white">Human Resources</option>
                  <option value="Finance" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white">Finance</option>
                  <option value="Marketing" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white">Marketing</option>
                  <option value="Sales" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white">Sales</option>
                  <option value="Operations" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white">Operations</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Payslips Table */}
        <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl shadow-lg dark:shadow-gray-900/50 border border-slate-200/50 dark:border-gray-700/50 overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.03) 0%, rgba(99, 102, 241, 0.03) 50%, rgba(14, 165, 233, 0.03) 100%)' }}>
          <div className="px-6 py-4 border-b border-slate-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-[#3366CC] dark:text-[#4a7dd9]">
              Payslips ({isLoading ? '...' : filteredPayslips.length})
            </h2>
          </div>

          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3366CC] dark:border-[#4a7dd9] mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-300">Loading payslips...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <svg className="w-12 h-12 text-red-400 dark:text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Error loading payslips</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center px-4 py-2 bg-[#3366CC] hover:bg-[#2d5bb3] text-white rounded-md transition-all duration-200"
              >
                Try Again
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-slate-50/80 dark:bg-gray-800/80 backdrop-blur-sm">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#3366CC] dark:text-[#4a7dd9] uppercase tracking-wider">
                      Payslip ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#3366CC] dark:text-[#4a7dd9] uppercase tracking-wider">
                      Employee
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#3366CC] dark:text-[#4a7dd9] uppercase tracking-wider">
                      Department
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#3366CC] dark:text-[#4a7dd9] uppercase tracking-wider">
                      Month
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#3366CC] dark:text-[#4a7dd9] uppercase tracking-wider">
                      Pay Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#3366CC] dark:text-[#4a7dd9] uppercase tracking-wider">
                      Gross Pay
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#3366CC] dark:text-[#4a7dd9] uppercase tracking-wider">
                      Net Pay
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#3366CC] dark:text-[#4a7dd9] uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#3366CC] dark:text-[#4a7dd9] uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm divide-y divide-slate-200 dark:divide-gray-700" style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.03) 0%, rgba(99, 102, 241, 0.03) 50%, rgba(14, 165, 233, 0.03) 100%)' }}>
                  {paginatedPayslips.map((payslip) => (
                    <tr key={payslip.id} className="hover:bg-gradient-to-r hover:from-blue-50/50 hover:via-indigo-50/50 hover:to-sky-50/50 dark:hover:from-blue-900/20 dark:hover:via-indigo-900/20 dark:hover:to-sky-900/20 transition-all duration-200">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {payslip.payslipId}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">{payslip.employee.name}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">{payslip.employee.empId}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400 truncate">{payslip.employee.email}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">{payslip.employee.jobTitle}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-[#3366CC]/10 dark:bg-[#3366CC]/20 text-[#3366CC] dark:text-[#4a7dd9]">
                          {payslip.department}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {payslip.month}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {payslip.payDate}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(payslip.grossPay)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600 dark:text-green-400">
                        {formatCurrency(payslip.netPay)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full border ${getStatusColor(payslip.status)}`}>
                          {payslip.status.charAt(0).toUpperCase() + payslip.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          {/* View button - available to all users */}
                          <button
                            onClick={() => handleView(payslip)}
                            className="inline-flex items-center justify-center w-8 h-8 border border-slate-300 dark:border-gray-600 rounded-md text-slate-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-600/10 dark:hover:bg-blue-600/20 transition-all duration-200"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Download button - available to all users */}
                          <button
                            onClick={() => handleDownload(payslip)}
                            className="w-8 h-8 flex items-center justify-center border border-slate-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 hover:bg-indigo-600/10 dark:hover:bg-indigo-600/20 hover:text-indigo-600 dark:hover:text-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 transition-all duration-200"
                            title="Download PDF"
                          >
                            <Download className="w-4 h-4" />
                          </button>

                          {/* Finance/Admin only actions */}
                          {(userRole === 'finance' || userRole === 'admin') && (
                            <>
                              {/* Approve/Reject buttons for Pending payslips */}
                              {payslip.status === 'Pending' && (
                                <>
                                  <button
                                    onClick={() => handleApprove(payslip.id)}
                                    className="w-8 h-8 flex items-center justify-center border border-green-300 dark:border-green-600 rounded-md bg-white dark:bg-gray-700 hover:bg-green-600/10 dark:hover:bg-green-600/20 hover:text-green-600 dark:hover:text-green-400 focus:outline-none focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 transition-all duration-200"
                                    title="Approve Payslip"
                                  >
                                    <CheckCircle className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleReject(payslip.id)}
                                    className="w-8 h-8 flex items-center justify-center border border-red-300 dark:border-red-600 rounded-md bg-white dark:bg-gray-700 hover:bg-red-600/10 dark:hover:bg-red-600/20 hover:text-red-600 dark:hover:text-red-400 focus:outline-none focus:ring-2 focus:ring-red-500 dark:focus:ring-red-400 transition-all duration-200"
                                    title="Reject Payslip"
                                  >
                                    <XCircle className="w-4 h-4" />
                                  </button>
                                </>
                              )}

                              <button
                                onClick={() => router.push(`/ess-portal/payslips/${payslip.id}/edit`)}
                                className="w-8 h-8 flex items-center justify-center border border-slate-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 hover:bg-yellow-600/10 dark:hover:bg-yellow-600/20 hover:text-yellow-600 dark:hover:text-yellow-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:focus:ring-yellow-400 transition-all duration-200"
                                title="Edit Payslip"
                              >
                                <Edit className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => handleDeletePayslip(payslip.id)}
                                className="w-8 h-8 flex items-center justify-center border border-slate-300 rounded-md bg-white hover:bg-red-600/10 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 transition-all duration-200"
                                title="Delete Payslip"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {!isLoading && !error && filteredPayslips.length > 0 && (
            <div className="border-t border-slate-200 dark:border-gray-700">
              <Pagination
                currentPage={currentPage}
                pageSize={pageSize}
                totalItems={filteredPayslips.length}
                onPageChange={(page) => setCurrentPage(page)}
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  setCurrentPage(1);
                }}
                label="payslips"
                className="bg-white/90 dark:bg-gray-800/90"
              />
            </div>
          )}

          {!isLoading && !error && filteredPayslips.length === 0 && (
            <div className="text-center py-12">
              <svg className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No payslips found</h3>
              <p className="text-gray-500 dark:text-gray-400">Try adjusting your filters or search criteria.</p>
            </div>
          )}
        </div>
      </div>

    </div>
  );
};

export default PayslipsComponent;
