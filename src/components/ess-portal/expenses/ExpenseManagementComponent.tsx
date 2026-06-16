"use client";

import { ESS_PORTAL_ENDPOINTS } from '@/utils/essApi';

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import jsPDF from 'jspdf';
import { getAuthHeaders } from '@/utils/api';
import Pagination from '@/components/tables/Pagination';

interface ExpenseClaim {
  id: string;
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
    receiptFileName: string | null;
  };
  expenseId?: string;
  // Status comes from backend with varying formats (case/spacing/underscores);
  // use a broad type to support all variants used in UI comparisons.
  status: string;
  createdAt: string;
  updatedAt: string;
}

const ExpenseManagementComponent: React.FC = () => {
  const router = useRouter();

  // State for expense claims data
  const [expenseClaims, setExpenseClaims] = useState<ExpenseClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch expense claims from API
  useEffect(() => {
    let mounted = true;

    const fetchExpenseClaims = async () => {
      try {
        setLoading(true);
        const authHeaders = getAuthHeaders();
        const response = await fetch(ESS_PORTAL_ENDPOINTS.EXPENSES.LIST(), {
          method: 'GET',
          headers: {
            ...authHeaders,
            'accept': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();

        if (result.success && mounted) {
          setExpenseClaims(result.data);
        } else {
          throw new Error(result.message || 'Failed to fetch expenses');
        }
      } catch (error) {
        if (mounted) {
          console.error('Error fetching expenses:', error);
          setError(error instanceof Error ? error.message : 'Failed to fetch expenses');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchExpenseClaims();

    // Poll for status updates every 10 seconds to reflect manager approval changes
    const interval = setInterval(async () => {
      if (!mounted) return;

      try {
        const authHeaders = getAuthHeaders();
        const response = await fetch(ESS_PORTAL_ENDPOINTS.EXPENSES.LIST(), {
          method: 'GET',
          headers: {
            ...authHeaders,
            'accept': 'application/json'
          }
        });

        if (!response.ok) return;

        const result = await response.json();

        if (result.success && result.data && mounted) {
          setExpenseClaims(prevClaims => {
            // Only update if there are actual changes
            const hasChanges = JSON.stringify(prevClaims) !== JSON.stringify(result.data);
            return hasChanges ? result.data : prevClaims;
          });
        }
      } catch (error) {
        // Ignore polling errors
        console.warn('Error polling expenses status:', error);
      }
    }, 10000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [categoryFilter, setCategoryFilter] = useState('All Categories');
  const [departmentFilter, setDepartmentFilter] = useState('All Departments');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    const totalClaims = expenseClaims.length;
    const pending = expenseClaims.filter(claim =>
      claim.status === 'Pending' || claim.status === 'pending'
    ).length;
    const managerApproved = expenseClaims.filter(claim =>
      claim.status === 'Manager_Approved' || claim.status === 'Manager Approved' ||
      claim.status === 'manager_approved' || claim.status === 'manager approved'
    ).length;
    const managerRejected = expenseClaims.filter(claim =>
      claim.status === 'Manager_Rejected' || claim.status === 'Manager Rejected' ||
      claim.status === 'manager_rejected' || claim.status === 'manager rejected'
    ).length;
    const financeApproved = expenseClaims.filter(claim =>
      claim.status === 'Finance_Approved' || claim.status === 'Finance Approved' ||
      claim.status === 'finance_approved' || claim.status === 'finance approved'
    ).length;
    const financeRejected = expenseClaims.filter(claim =>
      claim.status === 'Finance_Rejected' || claim.status === 'Finance Rejected' ||
      claim.status === 'finance_rejected' || claim.status === 'finance rejected'
    ).length;

    const pendingAmount = expenseClaims
      .filter(claim => claim.status === 'Pending' || claim.status === 'pending')
      .reduce((sum, claim) => sum + claim.expenseDetails.amount, 0);

    const managerApprovedAmount = expenseClaims
      .filter(claim =>
        claim.status === 'Manager_Approved' || claim.status === 'Manager Approved' ||
        claim.status === 'manager_approved' || claim.status === 'manager approved'
      )
      .reduce((sum, claim) => sum + claim.expenseDetails.amount, 0);

    const financeApprovedAmount = expenseClaims
      .filter(claim =>
        claim.status === 'Finance_Approved' || claim.status === 'Finance Approved' ||
        claim.status === 'finance_approved' || claim.status === 'finance approved'
      )
      .reduce((sum, claim) => sum + claim.expenseDetails.amount, 0);

    const rejectedAmount = expenseClaims
      .filter(claim =>
        claim.status === 'Manager_Rejected' || claim.status === 'Manager Rejected' ||
        claim.status === 'manager_rejected' || claim.status === 'manager rejected' ||
        claim.status === 'Finance_Rejected' || claim.status === 'Finance Rejected' ||
        claim.status === 'finance_rejected' || claim.status === 'finance rejected'
      )
      .reduce((sum, claim) => sum + claim.expenseDetails.amount, 0);

    return {
      totalClaims,
      pending,
      managerApproved,
      managerRejected,
      financeApproved,
      financeRejected,
      pendingAmount,
      managerApprovedAmount,
      financeApprovedAmount,
      rejectedAmount
    };
  }, [expenseClaims]);

  // Filter expense claims
  const filteredClaims = useMemo(() => {
    return expenseClaims.filter(claim => {
      const matchesSearch =
        claim.expenseDetails.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        claim.employeeInfo.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        claim.employeeInfo.employeeCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        claim.employeeInfo.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        claim.id.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'All Status' || claim.status === statusFilter;
      const matchesCategory = categoryFilter === 'All Categories' || claim.expenseDetails.category === categoryFilter;
      const matchesDepartment = departmentFilter === 'All Departments' || claim.employeeInfo.department === departmentFilter;

      return matchesSearch && matchesStatus && matchesCategory && matchesDepartment;
    });
  }, [expenseClaims, searchTerm, statusFilter, categoryFilter, departmentFilter]);

  // Pagination calculations
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedClaims = filteredClaims.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, categoryFilter, departmentFilter]);

  const getStatusBadge = (status: string) => {
    // Handle case-sensitive status values from backend
    const normalizedStatus = status.toLowerCase();

    switch (normalizedStatus) {
      case 'pending':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-[#3366CC]/10 dark:bg-[#3366CC]/20 text-[#3366CC] dark:text-[#4a7dd9] border border-[#3366CC]/30 dark:border-[#3366CC]/40">
            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
            </svg>
            Pending
          </span>
        );
      case 'manager_approved':
      case 'manager approved':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-[#3366CC]/10 dark:bg-[#3366CC]/20 text-[#3366CC] dark:text-[#4a7dd9] border border-[#3366CC]/30 dark:border-[#3366CC]/40">
            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Manager Approved
          </span>
        );
      case 'manager_rejected':
      case 'manager rejected':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border border-red-300 dark:border-red-700">
            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            Manager Rejected
          </span>
        );
      case 'finance_approved':
      case 'finance approved':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border border-green-300 dark:border-green-700">
            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Manager Approved, Finance Approved
          </span>
        );
      case 'finance_rejected':
      case 'finance rejected':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border border-red-300 dark:border-red-700">
            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            Manager Approved, Finance Rejected
          </span>
        );
      case 'approved':
        // Handle legacy "approved" status - treat as manager approved
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-[#3366CC]/10 dark:bg-[#3366CC]/20 text-[#3366CC] dark:text-[#4a7dd9] border border-[#3366CC]/30 dark:border-[#3366CC]/40">
            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Manager Approved
          </span>
        );
      case 'rejected':
        // Handle legacy "rejected" status - treat as manager rejected
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border border-red-300 dark:border-red-700">
            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414-1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            Manager Rejected
          </span>
        );
      case 'IT Approved':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 border border-purple-300 dark:border-purple-700">
            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            IT Approved
          </span>
        );
      case 'IT Rejected':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border border-red-300 dark:border-red-700">
            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            IT Rejected
          </span>
        );
      case 'Finance Approved':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Finance Approved
          </span>
        );
      case 'Finance Rejected':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border border-red-300 dark:border-red-700">
            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            Finance Rejected
          </span>
        );
      case 'Cancelled':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 border border-gray-300 dark:border-gray-600">
            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            Cancelled
          </span>
        );
      default:
        return null;
    }
  };

  const getCategoryBadge = (category: string) => {
    const categoryColors = {
      'Meal': 'bg-[#3366CC]/10 dark:bg-[#3366CC]/20 text-[#3366CC] dark:text-[#4a7dd9] border border-[#3366CC]/30 dark:border-[#3366CC]/40',
      'Travel': 'bg-[#3366CC]/10 dark:bg-[#3366CC]/20 text-[#3366CC] dark:text-[#4a7dd9] border border-[#3366CC]/30 dark:border-[#3366CC]/40',
      'Stationery': 'bg-[#3366CC]/10 dark:bg-[#3366CC]/20 text-[#3366CC] dark:text-[#4a7dd9] border border-[#3366CC]/30 dark:border-[#3366CC]/40',
      'Other': 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 border border-gray-300 dark:border-gray-600'
    };

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${categoryColors[category as keyof typeof categoryColors] || 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 border border-gray-300 dark:border-gray-600'}`}>
        {category}
      </span>
    );
  };

  const formatCurrency = (amount: number, currency: string = 'INR') => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const handleView = (claim: ExpenseClaim) => {
    try {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('selectedExpense', JSON.stringify(claim));
      }
    } catch {
      // ignore storage errors (private mode, quota, etc.)
    }
    router.push(`/ess-portal/expenses/view?id=${claim.id}`);
  };

  const handleDownload = (expenseId: string) => {
    // Find the expense claim data
    const claim = expenseClaims.find(exp => exp.id === expenseId);
    if (!claim) {
      console.error('Expense claim not found:', expenseId);
      return;
    }

    // Create PDF document
    const doc = new jsPDF();

    // Add title
    doc.setFontSize(20);
    doc.text('Expense Claim Details', 20, 30);

    // Add expense ID (use actual expenseId or fallback to id)
    doc.setFontSize(14);
    doc.text(`Expense ID: ${claim.expenseId || claim.id}`, 20, 50);

    // Add employee information
    doc.setFontSize(14);
    doc.text('Employee Information:', 20, 70);
    doc.setFontSize(12);
    doc.text(`Employee Code: ${claim.employeeInfo.employeeCode}`, 20, 85);
    doc.text(`Full Name: ${claim.employeeInfo.fullName}`, 20, 95);
    doc.text(`Designation: ${claim.employeeInfo.designation}`, 20, 105);
    doc.text(`Department: ${claim.employeeInfo.department}`, 20, 115);
    doc.text(`Email: ${claim.employeeInfo.email}`, 20, 125);

    // Add expense details
    doc.setFontSize(14);
    doc.text('Expense Details:', 20, 145);
    doc.setFontSize(12);
    doc.text(`Title: ${claim.expenseDetails.title}`, 20, 160);
    doc.text(`Category: ${claim.expenseDetails.category}`, 20, 170);
    doc.text(`Amount: ${claim.expenseDetails.currency} ${claim.expenseDetails.amount}`, 20, 180);
    doc.text(`Date: ${formatDate(claim.expenseDetails.date)}`, 20, 190);
    doc.text(`Status: ${claim.status}`, 20, 200);
    doc.text(`Created: ${formatDate(claim.createdAt)}`, 20, 210);

    // Add description
    doc.setFontSize(14);
    doc.text('Description:', 20, 230);
    doc.setFontSize(12);
    const descriptionLines = doc.splitTextToSize(claim.expenseDetails.description, 170);
    doc.text(descriptionLines, 20, 245);

    // Add receipt information if available
    if (claim.expenseDetails.receiptFileName) {
      doc.setFontSize(14);
      doc.text('Receipt Information:', 20, 265);
      doc.setFontSize(12);
      doc.text(`Receipt File: ${claim.expenseDetails.receiptFileName}`, 20, 280);
    }

    // Generate filename with custom format: expenseId:date:time
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD format
    const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS format
    const expenseIdValue = claim.expenseId || claim.id;
    const filename = `${expenseIdValue}:${dateStr}:${timeStr}.pdf`;

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

  return (
    <div className="mt-8">
      {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Claims */}
          <div className="relative group bg-white dark:bg-gray-800 rounded-xl shadow-lg dark:shadow-gray-900/50 hover:shadow-xl transition-all duration-300 border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="relative z-10 p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 rounded-xl bg-[#3366CC]">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">{summaryStats.totalClaims}</div>
              <div className="text-sm text-gray-600 dark:text-gray-300 font-medium">Total Claims</div>
              <div className="mt-3 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div className="bg-[#3366CC] h-2 rounded-full" style={{ width: '100%' }}></div>
              </div>
            </div>
          </div>

          {/* Pending */}
          <div className="relative group bg-white dark:bg-gray-800 rounded-xl shadow-lg dark:shadow-gray-900/50 hover:shadow-xl transition-all duration-300 border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="relative z-10 p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 rounded-xl bg-[#3366CC]">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">{summaryStats.pending}</div>
              <div className="text-sm text-gray-600 dark:text-gray-300 font-medium">Pending</div>
              <div className="mt-3 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div className="bg-[#3366CC] h-2 rounded-full" style={{ width: `${(summaryStats.pending / summaryStats.totalClaims) * 100}%` }}></div>
              </div>
            </div>
          </div>


          {/* Rejected */}
          <div className="relative group bg-white dark:bg-gray-800 rounded-xl shadow-lg dark:shadow-gray-900/50 hover:shadow-xl transition-all duration-300 border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="relative z-10 p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 rounded-xl bg-[#3366CC]">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">{summaryStats.managerRejected + summaryStats.financeRejected}</div>
              <div className="text-sm text-gray-600 dark:text-gray-300 font-medium">Rejected</div>
              <div className="mt-3 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div className="bg-[#3366CC] h-2 rounded-full" style={{ width: `${((summaryStats.managerRejected + summaryStats.financeRejected) / summaryStats.totalClaims) * 100}%` }}></div>
              </div>
            </div>
          </div>

          {/* Pending Amount */}
          <div className="relative group bg-white dark:bg-gray-800 rounded-xl shadow-lg dark:shadow-gray-900/50 hover:shadow-xl transition-all duration-300 border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="relative z-10 p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 rounded-xl bg-[#3366CC]">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">{formatCurrency(summaryStats.pendingAmount)}</div>
              <div className="text-sm text-gray-600 dark:text-gray-300 font-medium">Pending Amount</div>
              <div className="mt-3 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div className="bg-[#3366CC] h-2 rounded-full" style={{ width: '75%' }}></div>
              </div>
            </div>
          </div>

          {/* Approved Amount */}
          <div className="relative group bg-white dark:bg-gray-800 rounded-xl shadow-lg dark:shadow-gray-900/50 hover:shadow-xl transition-all duration-300 border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="relative z-10 p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 rounded-xl bg-[#3366CC]">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">{formatCurrency(summaryStats.managerApprovedAmount + summaryStats.financeApprovedAmount)}</div>
              <div className="text-sm text-gray-600 dark:text-gray-300 font-medium">Approved Amount</div>
              <div className="mt-3 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div className="bg-[#3366CC] h-2 rounded-full" style={{ width: '90%' }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl dark:shadow-gray-900/50 border border-gray-200 dark:border-gray-700 hover:shadow-2xl transition-all duration-300 p-6 mb-8">
          <div className="flex items-center mb-4">
            <div className="p-2 rounded-xl bg-[#3366CC]/10 dark:bg-[#3366CC]/20 mr-3">
              <svg className="w-5 h-5 text-[#3366CC] dark:text-[#4a7dd9]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-[#3366CC] dark:text-[#4a7dd9] flex items-center">
              Advanced Filters
            </h2>
          </div>
          <p className="text-gray-600 dark:text-gray-300 mb-6 text-sm">Refine your expense data with powerful filtering options</p>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="group">
              <label className="block text-sm font-medium text-[#3366CC] dark:text-[#4a7dd9] mb-2 flex items-center">
                <svg className="w-4 h-4 mr-2 group-focus-within:text-[#3366CC]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Search Expenses
              </label>
              <input
                type="text"
                placeholder="Search by title, employee name, employee code, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-[#3366CC]/50 dark:focus:ring-[#3366CC]/50 focus:border-[#3366CC] dark:focus:border-[#3366CC] bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-400 hover:bg-white/80 dark:hover:bg-gray-700/80 transition-all duration-200 shadow-sm hover:shadow-md"
              />
            </div>
            <div className="relative">
              <label className="block text-sm font-medium text-[#3366CC] dark:text-[#4a7dd9] mb-2">Status Filter</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-[#3366CC]/50 dark:focus:ring-[#3366CC]/50 focus:border-[#3366CC] dark:focus:border-[#3366CC] bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-white/80 dark:hover:bg-gray-700/80 transition-all duration-200 shadow-sm hover:shadow-md appearance-none cursor-pointer"
              >
                <option value="All Status" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white">All Status</option>
                <option value="Pending" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white">Pending</option>
                <option value="Manager Approved" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white">Manager Approved</option>
                <option value="Manager Rejected" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white">Manager Rejected</option>
                <option value="Finance Approved" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white">Finance Approved</option>
                <option value="Finance Rejected" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white">Finance Rejected</option>
                <option value="Cancelled" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white">Cancelled</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <svg className="w-5 h-5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
            <div className="relative">
              <label className="block text-sm font-medium text-[#3366CC] dark:text-[#4a7dd9] mb-2">Category Filter</label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-[#3366CC]/50 dark:focus:ring-[#3366CC]/50 focus:border-[#3366CC] dark:focus:border-[#3366CC] bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-white/80 dark:hover:bg-gray-700/80 transition-all duration-200 shadow-sm hover:shadow-md appearance-none cursor-pointer"
              >
                <option value="All Categories" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white">All Categories</option>
                <option value="Meal" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white">Meal</option>
                <option value="Travel" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white">Travel</option>
                <option value="Stationery" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white">Stationery</option>
                <option value="Other" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white">Other</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <svg className="w-5 h-5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
            <div className="relative">
              <label className="block text-sm font-medium text-[#3366CC] dark:text-[#4a7dd9] mb-2">Department Filter</label>
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-[#3366CC]/50 dark:focus:ring-[#3366CC]/50 focus:border-[#3366CC] dark:focus:border-[#3366CC] bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-white/80 dark:hover:bg-gray-700/80 transition-all duration-200 shadow-sm hover:shadow-md appearance-none cursor-pointer"
              >
                <option value="All Departments" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white">All Departments</option>
                <option value="Engineering" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white">Engineering</option>
                <option value="Human Resources" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white">Human Resources</option>
                <option value="Finance" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white">Finance</option>
                <option value="Marketing" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white">Marketing</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <svg className="w-5 h-5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg dark:shadow-gray-900/50 border border-gray-200 dark:border-gray-700 p-8 text-center">
            <div className="flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-[#3366CC] border-t-transparent rounded-full animate-spin mr-3"></div>
              <span className="text-gray-600 dark:text-gray-300">Loading expense claims...</span>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg dark:shadow-gray-900/50 border border-gray-200 dark:border-gray-700 p-8 text-center">
            <div className="text-red-600 dark:text-red-400 mb-4">
              <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-lg font-medium">Error Loading Expenses</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{error}</p>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-[#3366CC] hover:bg-[#2d5bb3] text-white rounded-lg transition-all duration-200"
            >
              Retry
            </button>
          </div>
        )}

        {/* Expense Claims Table */}
        {!loading && !error && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg dark:shadow-gray-900/50 border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-[#3366CC] dark:text-[#4a7dd9]">Expense Claims ({filteredClaims.length})</h2>
            </div>
            {filteredClaims.length === 0 ? (
              <div className="p-8 text-center">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-8">
                  <div className="flex flex-col items-center justify-center py-8">
                    <svg className="w-20 h-20 text-gray-300 dark:text-gray-600 mb-6" fill="none" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
                      <rect x="14" y="10" width="36" height="44" rx="4" stroke="currentColor" strokeWidth="2" fill="none" />
                      <path d="M22 22h20M22 30h20M22 38h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">No expense claims found</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Try adjusting your filters or search criteria.</p>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-900/50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[#3366CC] dark:text-[#4a7dd9] uppercase tracking-wider">Employee Code</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[#3366CC] dark:text-[#4a7dd9] uppercase tracking-wider">Employee</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[#3366CC] dark:text-[#4a7dd9] uppercase tracking-wider">Title</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[#3366CC] dark:text-[#4a7dd9] uppercase tracking-wider">Category</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[#3366CC] dark:text-[#4a7dd9] uppercase tracking-wider">Amount</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[#3366CC] dark:text-[#4a7dd9] uppercase tracking-wider">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[#3366CC] dark:text-[#4a7dd9] uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[#3366CC] dark:text-[#4a7dd9] uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {paginatedClaims.map((claim) => (
                        <tr key={claim.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all duration-200">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                            {claim.expenseId ?? claim.employeeInfo.employeeCode}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900 dark:text-white">{claim.employeeInfo.fullName}</div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                {claim.employeeInfo.employeeCode}, {claim.employeeInfo.designation}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">{claim.employeeInfo.department}</div>
                              <div className="text-sm text-gray-600 dark:text-gray-300">{claim.employeeInfo.email}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div>
                              <div className="text-sm font-medium text-gray-900 dark:text-white">{claim.expenseDetails.title}</div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">Submitted: {new Date(claim.createdAt).toLocaleDateString()}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getCategoryBadge(claim.expenseDetails.category)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                            {formatCurrency(claim.expenseDetails.amount, claim.expenseDetails.currency)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {new Date(claim.expenseDetails.date).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getStatusBadge(claim.status)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleView(claim)}
                                className="inline-flex items-center justify-center w-8 h-8 border border-gray-300 dark:border-gray-600 rounded-md text-gray-600 dark:text-gray-400 hover:text-[#3366CC] dark:hover:text-[#4a7dd9] hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                              </button>

                              <button
                                onClick={() => handleDownload(claim.id)}
                                className="w-8 h-8 flex items-center justify-center border border-gray-400 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-[#3366CC]/50 dark:focus:ring-[#3366CC]/50 transition-colors"
                                title="Download"
                              >
                                <svg width={18} height={18} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-gray-600 dark:text-gray-400">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5V18a2.25 2.25 0 0 0 2.25 2.25h13.5A2.25 2.25 0 0 0 21 18v-1.5M7.5 12l4.5 4.5m0 0l4.5-4.5m-4.5 4.5V3" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {filteredClaims.length > 0 && (
                  <Pagination
                    currentPage={currentPage}
                    pageSize={pageSize}
                    totalItems={filteredClaims.length}
                    onPageChange={setCurrentPage}
                    onPageSizeChange={(newSize) => {
                      setPageSize(newSize);
                      setCurrentPage(1);
                    }}
                    label="expense claims"
                  />
                )}
              </>
            )}
          </div>
        )}
    </div>
  );
};

export default ExpenseManagementComponent;