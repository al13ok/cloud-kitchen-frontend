"use client";

import { ESS_PORTAL_ENDPOINTS } from '@/utils/essApi';

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import jsPDF from 'jspdf';
import { getAuthHeaders } from '@/utils/api';
import DashboardHeader from '@/components/header/DashboardHeader';
import { Box, RefreshCw } from 'lucide-react';
import Pagination from '@/components/tables/Pagination';

interface AssetRequest {
  id: string;
  requestId: string;
  employeeInfo: {
    employeeCode: string;
    fullName: string;
    department: string;
    designation: string;
    email: string;
  };
  assetDetails: {
    assetType: string;
    assetName: string;
    quantity: number;
    justification: string;
    priority: string;
    expectedDate?: string;
  };
  status: 'Pending' | 'Approved' | 'Rejected' | 'Issued';
  requestedDate: string;
  expectedDate: string;
  createdAt: string;
  updatedAt: string;
}

const AssetManagementComponent: React.FC = () => {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [typeFilter, setTypeFilter] = useState('All Types');
  const [departmentFilter, setDepartmentFilter] = useState('All Departments');

  // State for asset requests data
  const [assetRequests, setAssetRequests] = useState<AssetRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Fetch asset requests from API
  useEffect(() => {
    let mounted = true;

    const fetchAssetRequests = async () => {
      try {
        setLoading(true);
        const authHeaders = getAuthHeaders();

        // Debug: Log headers to verify Authorization is included
        const hasAuth = authHeaders instanceof Headers
          ? authHeaders.has('Authorization')
          : (authHeaders as Record<string, string>)['Authorization'] ? true : false;
        const authValue = authHeaders instanceof Headers
          ? authHeaders.get('Authorization')
          : (authHeaders as Record<string, string>)['Authorization'];
        console.log('🔍 AssetManagementComponent - Fetching assets with headers:', {
          hasAuthorization: hasAuth,
          authorizationPreview: authValue ? authValue.substring(0, 30) + '...' : 'NOT FOUND',
          allHeaders: authHeaders instanceof Headers ? Array.from(authHeaders.keys()) : Object.keys(authHeaders)
        });

        const response = await fetch(ESS_PORTAL_ENDPOINTS.ASSETS.LIST(), {
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
          setAssetRequests(result.data);
        } else {
          throw new Error(result.message || 'Failed to fetch asset requests');
        }
      } catch (error) {
        if (mounted) {
          console.error('Error fetching asset requests:', error);
          setError(error instanceof Error ? error.message : 'Failed to fetch asset requests');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchAssetRequests();

    // Poll for status updates every 10 seconds to reflect manager approval changes
    const interval = setInterval(async () => {
      if (!mounted) return;

      try {
        const authHeaders = getAuthHeaders();

        // Debug: Log headers for polling requests
        const hasAuth = authHeaders instanceof Headers
          ? authHeaders.has('Authorization')
          : (authHeaders as Record<string, string>)['Authorization'] ? true : false;
        if (!hasAuth) {
          console.warn('⚠️ AssetManagementComponent - Polling request: No Authorization header found!');
        }

        const response = await fetch(ESS_PORTAL_ENDPOINTS.ASSETS.LIST(), {
          method: 'GET',
          headers: {
            ...authHeaders,
            'accept': 'application/json'
          }
        });

        if (!response.ok) return;

        const result = await response.json();

        if (result.success && result.data && mounted) {
          setAssetRequests(prevRequests => {
            // Only update if there are actual changes
            const hasChanges = JSON.stringify(prevRequests) !== JSON.stringify(result.data);
            return hasChanges ? result.data : prevRequests;
          });
        }
      } catch (error) {
        // Ignore polling errors
        console.warn('Error polling asset requests status:', error);
      }
    }, 10000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  // Filter and search logic
  const filteredRequests = useMemo(() => {
    return assetRequests.filter(request => {
      const matchesSearch =
        request.requestId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.employeeInfo.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.employeeInfo.employeeCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.employeeInfo.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.assetDetails.assetName.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'All Status' ||
        (statusFilter === 'Pending' && request.status === 'Pending') ||
        (statusFilter === 'Approved' && request.status === 'Approved') ||
        (statusFilter === 'Rejected' && request.status === 'Rejected') ||
        (statusFilter === 'Issued' && request.status === 'Issued');

      const matchesType = typeFilter === 'All Types' || request.assetDetails.assetType === typeFilter;
      const matchesDepartment = departmentFilter === 'All Departments' ||
        request.employeeInfo.department === departmentFilter;

      return matchesSearch && matchesStatus && matchesType && matchesDepartment;
    });
  }, [assetRequests, searchTerm, statusFilter, typeFilter, departmentFilter]);

  // Pagination logic
  const paginatedRequests = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredRequests.slice(startIndex, endIndex);
  }, [filteredRequests, currentPage, pageSize]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, typeFilter, departmentFilter]);

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    const totalRequests = assetRequests.length;
    const pending = assetRequests.filter(r => r.status === 'Pending').length;
    const approved = assetRequests.filter(r => r.status === 'Approved').length;
    const issued = assetRequests.filter(r => r.status === 'Issued').length;
    const rejected = assetRequests.filter(r => r.status === 'Rejected').length;
    const totalItems = assetRequests.reduce((sum, r) => sum + r.assetDetails.quantity, 0);
    const pendingItems = assetRequests
      .filter(r => r.status === 'Pending')
      .reduce((sum, r) => sum + r.assetDetails.quantity, 0);
    const highPriorityRequests = assetRequests.filter(r => r.assetDetails.priority === 'High').length;

    return {
      totalRequests,
      pending,
      approved,
      rejected,
      issued,
      totalItems,
      pendingItems,
      highPriorityRequests
    };
  }, [assetRequests]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Pending':
        return (
          <span className="inline-flex items-center px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-xs font-medium bg-[#3366CC]/10 dark:bg-[#3366CC]/20 text-[#3366CC] dark:text-[#4a7dd9] border border-[#3366CC]/30 dark:border-[#3366CC]/40">
            Pending
          </span>
        );
      case 'Manager Approved':
        return (
          <span className="inline-flex items-center px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-xs font-medium bg-[#3366CC]/10 dark:bg-[#3366CC]/20 text-[#3366CC] dark:text-[#4a7dd9] border border-[#3366CC]/30 dark:border-[#3366CC]/40">
            Manager Approved
          </span>
        );
      case 'Manager Rejected':
        return (
          <span className="inline-flex items-center px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 border border-red-300 dark:border-red-700">
            Manager Rejected
          </span>
        );
      case 'HR Approved':
        return (
          <span className="inline-flex items-center px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 border border-green-300 dark:border-green-700">
            HR Approved
          </span>
        );
      case 'HR Rejected':
        return (
          <span className="inline-flex items-center px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 border border-red-300 dark:border-red-700">
            HR Rejected
          </span>
        );
      case 'IT Approved':
        return (
          <span className="inline-flex items-center px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-xs font-medium bg-[#3366CC]/10 dark:bg-[#3366CC]/20 text-[#3366CC] dark:text-[#4a7dd9] border border-[#3366CC]/30 dark:border-[#3366CC]/40">
            IT Approved
          </span>
        );
      case 'IT Rejected':
        return (
          <span className="inline-flex items-center px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 border border-red-300 dark:border-red-700">
            IT Rejected
          </span>
        );
      case 'Finance Approved':
        return (
          <span className="inline-flex items-center px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 border border-green-300 dark:border-green-700">
            Finance Approved
          </span>
        );
      case 'Finance Rejected':
        return (
          <span className="inline-flex items-center px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 border border-red-300 dark:border-red-700">
            Finance Rejected
          </span>
        );
      case 'Issued':
        return (
          <span className="inline-flex items-center px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-xs font-medium bg-[#3366CC]/10 dark:bg-[#3366CC]/20 text-[#3366CC] dark:text-[#4a7dd9] border border-[#3366CC]/30 dark:border-[#3366CC]/40">
            Issued
          </span>
        );
      default:
        return null;
    }
  };

  const handleDownload = (requestId: string) => {
    // Find the asset request data
    const request = assetRequests.find(req => req.requestId === requestId);
    if (!request) {
      console.error('Asset request not found:', requestId);
      return;
    }

    // Create PDF document
    const doc = new jsPDF();

    // Add title
    doc.setFontSize(20);
    doc.text('Asset Request Details', 20, 30);

    // Add request ID
    doc.setFontSize(14);
    doc.text(`Request ID: ${request.requestId}`, 20, 50);

    // Add employee information
    doc.setFontSize(14);
    doc.text('Employee Information:', 20, 70);
    doc.setFontSize(12);
    doc.text(`Employee Code: ${request.employeeInfo.employeeCode}`, 20, 85);
    doc.text(`Full Name: ${request.employeeInfo.fullName}`, 20, 95);
    doc.text(`Designation: ${request.employeeInfo.designation}`, 20, 105);
    doc.text(`Department: ${request.employeeInfo.department}`, 20, 115);
    doc.text(`Email: ${request.employeeInfo.email}`, 20, 125);

    // Add asset details
    doc.setFontSize(14);
    doc.text('Asset Details:', 20, 145);
    doc.setFontSize(12);
    doc.text(`Asset Type: ${request.assetDetails.assetType}`, 20, 160);
    doc.text(`Asset Name: ${request.assetDetails.assetName}`, 20, 170);
    doc.text(`Quantity: ${request.assetDetails.quantity}`, 20, 180);
    doc.text(`Priority: ${request.assetDetails.priority}`, 20, 190);
    doc.text(`Status: ${request.status}`, 20, 200);
    doc.text(`Requested On: ${formatDate(request.requestedDate)}`, 20, 210);

    // Add justification
    doc.setFontSize(14);
    doc.text('Justification:', 20, 230);
    doc.setFontSize(12);
    const justificationLines = doc.splitTextToSize(request.assetDetails.justification, 170);
    doc.text(justificationLines, 20, 245);

    // Generate filename with custom format: requestId:date:time
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD format
    const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS format
    const filename = `${request.requestId}:${dateStr}:${timeStr}.pdf`;

    // Save the PDF
    doc.save(filename);
  };

  const getTypeBadge = (type: string) => {
    return (
      <span className="inline-flex items-center px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-xs font-medium bg-[#3366CC]/10 dark:bg-[#3366CC]/20 text-[#3366CC] dark:text-[#4a7dd9] border border-[#3366CC]/30 dark:border-[#3366CC]/40">
        {type}
      </span>
    );
  };

  const handleView = (requestId: string) => {
    router.push(`/ess-portal/assets/view?id=${requestId}`);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getPriorityBadge = (priority: string) => {
    const priorityColors = {
      'High': 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 border-red-300 dark:border-red-700',
      'Medium': 'bg-[#3366CC]/10 dark:bg-[#3366CC]/20 text-[#3366CC] dark:text-[#4a7dd9] border-[#3366CC]/30 dark:border-[#3366CC]/40',
      'Low': 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 border-gray-300 dark:border-gray-600'
    };

    return (
      <span className={`inline-flex px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs font-semibold rounded-full border ${priorityColors[priority as keyof typeof priorityColors] || priorityColors.Medium}`}>
        {priority}
      </span>
    );
  };

  // Removed approve/reject handlers as actions are now View/Download only

  const handleNewRequest = () => {
    router.push('/ess-portal/assets/request');
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Dashboard Header */}
        <DashboardHeader
          title="Asset Management"
          subtitle="Comprehensive asset management system with request tracking, approval workflows, inventory monitoring, and detailed reporting for efficient resource allocation and management."
          icon={Box}
          iconColor="text-white"
          hideTenantPrefix={true}
          breadcrumbs={[
            { label: 'Home', href: '/' },
            { label: 'ESS Portal', href: '/ess-portal' },
            { label: 'Assets' }
          ]}
          actions={
            <div className="flex items-center gap-3">
              <button
                onClick={handleNewRequest}
                className="flex items-center px-6 py-3 bg-[#3366CC] hover:bg-[#2d5bb3] rounded-xl text-white font-medium transition-all duration-200 hover:scale-105 whitespace-nowrap"
                title="New Asset Request"
              >
                <Box className="w-5 h-5 mr-2 flex-shrink-0" />
                <span className="font-medium whitespace-nowrap">Asset Request</span>
              </button>
              <button
                onClick={handleRefresh}
                className="flex items-center px-6 py-3 bg-white/20 rounded-xl backdrop-blur-sm border border-white/30 text-white hover:bg-white/30 transition-all duration-200 hover:scale-105 whitespace-nowrap"
                title="Refresh"
              >
                <RefreshCw className="w-5 h-5 mr-2 flex-shrink-0" />
                <span className="font-medium whitespace-nowrap">Refresh</span>
              </button>
            </div>
          }
        />

        {/* Summary Cards */}
        <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-5 gap-3 sm:gap-4 lg:gap-6 xl:gap-8 mb-6 sm:mb-8 lg:mb-10 xl:mb-12">
          {/* Total Requests */}
          <div className="relative group bg-white dark:bg-gray-800 rounded-xl shadow-lg dark:shadow-gray-900/50 hover:shadow-xl transition-all duration-300 border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="relative z-10 p-4 sm:p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 rounded-xl bg-[#3366CC]">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-[#3366CC] dark:text-[#4a7dd9] mb-1">{summaryStats.totalRequests}</div>
              <div className="text-sm text-gray-600 dark:text-gray-300 font-medium">Total Requests</div>
              <div className="mt-3 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div className="bg-[#3366CC] h-2 rounded-full" style={{ width: '100%' }}></div>
              </div>
            </div>
          </div>

          {/* Pending */}
          <div className="relative group bg-white dark:bg-gray-800 rounded-xl shadow-lg dark:shadow-gray-900/50 hover:shadow-xl transition-all duration-300 border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="relative z-10 p-4 sm:p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 rounded-xl bg-[#3366CC]">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-[#3366CC] dark:text-[#4a7dd9] mb-1">{summaryStats.pending}</div>
              <div className="text-sm text-gray-600 dark:text-gray-300 font-medium">Pending</div>
              <div className="mt-3 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div className="bg-[#3366CC] h-2 rounded-full" style={{ width: `${summaryStats.totalRequests > 0 ? (summaryStats.pending / summaryStats.totalRequests) * 100 : 0}%` }}></div>
              </div>
            </div>
          </div>

          {/* Approved */}
          <div className="relative group bg-white dark:bg-gray-800 rounded-xl shadow-lg dark:shadow-gray-900/50 hover:shadow-xl transition-all duration-300 border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="relative z-10 p-4 sm:p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 rounded-xl bg-[#3366CC]">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-[#3366CC] dark:text-[#4a7dd9] mb-1">{summaryStats.approved}</div>
              <div className="text-sm text-gray-600 dark:text-gray-300 font-medium">Approved</div>
              <div className="mt-3 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div className="bg-[#3366CC] h-2 rounded-full" style={{ width: `${summaryStats.totalRequests > 0 ? (summaryStats.approved / summaryStats.totalRequests) * 100 : 0}%` }}></div>
              </div>
            </div>
          </div>

          {/* Issued */}
          <div className="relative group bg-white dark:bg-gray-800 rounded-xl shadow-lg dark:shadow-gray-900/50 hover:shadow-xl transition-all duration-300 border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="relative z-10 p-4 sm:p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 rounded-xl bg-[#3366CC]">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-[#3366CC] dark:text-[#4a7dd9] mb-1">{summaryStats.issued}</div>
              <div className="text-sm text-gray-600 dark:text-gray-300 font-medium">Issued</div>
              <div className="mt-3 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div className="bg-[#3366CC] h-2 rounded-full" style={{ width: `${summaryStats.totalRequests > 0 ? (summaryStats.issued / summaryStats.totalRequests) * 100 : 0}%` }}></div>
              </div>
            </div>
          </div>

          {/* High Priority */}
          <div className="relative group bg-white dark:bg-gray-800 rounded-xl shadow-lg dark:shadow-gray-900/50 hover:shadow-xl transition-all duration-300 border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="relative z-10 p-4 sm:p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 rounded-xl bg-[#3366CC]">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-[#3366CC] dark:text-[#4a7dd9] mb-1">{summaryStats.highPriorityRequests}</div>
              <div className="text-sm text-gray-600 dark:text-gray-300 font-medium">High Priority</div>
              <div className="mt-3 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div className="bg-[#3366CC] h-2 rounded-full" style={{ width: `${summaryStats.totalRequests > 0 ? (summaryStats.highPriorityRequests / summaryStats.totalRequests) * 100 : 0}%` }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl dark:shadow-gray-900/50 border border-gray-200 dark:border-gray-700 hover:shadow-2xl transition-all duration-300 p-6 mb-6">
          <div className="flex items-center mb-4">
            <div className="p-2 rounded-xl bg-[#3366CC]/10 dark:bg-[#3366CC]/20 mr-3">
              <svg className="w-5 h-5 text-[#3366CC] dark:text-[#4a7dd9]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-[#3366CC] dark:text-[#4a7dd9] flex items-center">
              Advanced Filters
            </h3>
          </div>
          <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">Refine your asset requests with powerful filtering options</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative group">
              <label className="block text-sm font-medium text-[#3366CC] dark:text-[#4a7dd9] mb-2 flex items-center">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Search Assets
              </label>
              <input
                type="text"
                placeholder="Search by name, ID, or employee..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 text-sm border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-[#3366CC]/50 dark:focus:ring-[#3366CC]/50 focus:border-[#3366CC] dark:focus:border-[#3366CC] bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-400 hover:bg-white/80 dark:hover:bg-gray-700/80 transition-all duration-200 shadow-sm hover:shadow-md"
              />
              <svg className="absolute left-3 top-9 w-4 h-4 text-[#3366CC] dark:text-[#4a7dd9] group-focus-within:text-[#2d5bb3] dark:group-focus-within:text-[#5a8de5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <div className="relative">
              <label className="block text-sm font-medium text-[#3366CC] dark:text-[#4a7dd9] mb-2">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-3 text-sm border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-[#3366CC]/50 dark:focus:ring-[#3366CC]/50 focus:border-[#3366CC] dark:focus:border-[#3366CC] bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-white/80 dark:hover:bg-gray-700/80 transition-all duration-200 shadow-sm hover:shadow-md appearance-none cursor-pointer"
              >
                <option value="All Status" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white">All Status</option>
                <option value="Pending" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white">Pending</option>
                <option value="Approved" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white">Approved</option>
                <option value="Rejected" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white">Rejected</option>
                <option value="Issued" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white">Issued</option>
              </select>
              <svg className="absolute right-3 top-9 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
            <div className="relative">
              <label className="block text-sm font-medium text-[#3366CC] dark:text-[#4a7dd9] mb-2">Asset Type</label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full px-4 py-3 text-sm border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-[#3366CC]/50 dark:focus:ring-[#3366CC]/50 focus:border-[#3366CC] dark:focus:border-[#3366CC] bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-white/80 dark:hover:bg-gray-700/80 transition-all duration-200 shadow-sm hover:shadow-md appearance-none cursor-pointer"
              >
                <option value="All Types" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white">All Types</option>
                <option value="Hardware" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white">Hardware</option>
                <option value="Software" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white">Software</option>
                <option value="Other" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white">Other</option>
              </select>
              <svg className="absolute right-3 top-9 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
            <div className="relative">
              <label className="block text-sm font-medium text-[#3366CC] dark:text-[#4a7dd9] mb-2">Department</label>
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="w-full px-4 py-3 text-sm border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-[#3366CC]/50 dark:focus:ring-[#3366CC]/50 focus:border-[#3366CC] dark:focus:border-[#3366CC] bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-white/80 dark:hover:bg-gray-700/80 transition-all duration-200 shadow-sm hover:shadow-md appearance-none cursor-pointer"
              >
                <option value="All Departments" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white">All Departments</option>
                <option value="Engineering" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white">Engineering</option>
                <option value="Human Resources" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white">Human Resources</option>
                <option value="Finance" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white">Finance</option>
                <option value="Marketing" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white">Marketing</option>
              </select>
              <svg className="absolute right-3 top-9 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        {/* Asset Requests Table */}
        {loading ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg dark:shadow-gray-900/50 border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3366CC]"></div>
              <span className="ml-3 text-base text-gray-600 dark:text-gray-300">Loading asset requests...</span>
            </div>
          </div>
        ) : error ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-gray-900/50 p-4 sm:p-6 lg:p-8 border border-gray-200 dark:border-gray-700">
            <div className="text-center py-8 sm:py-12 lg:py-16">
              <div className="mx-auto w-16 h-16 sm:w-20 sm:h-20 bg-red-50 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4 sm:mb-6">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-red-500 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-2 sm:mb-3">Error Loading Asset Data</h3>
              <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mb-6 sm:mb-8 max-w-md mx-auto px-4">
                {error.includes('500') ? 'HTTP error! status: 500' :
                  error.includes('Failed to fetch') ? 'Unable to connect to server. Please check your connection.' :
                    'There was a problem loading your asset requests. Please try again.'}
              </p>
              <button
                onClick={() => {
                  setError(null);
                  setLoading(true);
                  // Retry the fetch
                  const authHeaders = getAuthHeaders();

                  // Debug: Log headers for retry
                  const hasAuth = authHeaders instanceof Headers
                    ? authHeaders.has('Authorization')
                    : (authHeaders as Record<string, string>)['Authorization'] ? true : false;
                  if (!hasAuth) {
                    console.error('❌ AssetManagementComponent - Retry: No Authorization header found!');
                  }

                  fetch('https://py-mobiloitte.converiqo.ai/api/v1/ess-portal/assets', {
                    method: 'GET',
                    headers: {
                      ...authHeaders,
                      'accept': 'application/json'
                    }
                  })
                    .then(response => {
                      if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                      }
                      return response.json();
                    })
                    .then(result => {
                      if (result.success) {
                        setAssetRequests(result.data);
                      } else {
                        throw new Error(result.message || 'Failed to fetch asset requests');
                      }
                    })
                    .catch(error => {
                      console.error('Error fetching asset requests:', error);
                      setError(error instanceof Error ? error.message : 'Failed to fetch asset requests');
                    })
                    .finally(() => {
                      setLoading(false);
                    });
                }}
                className="inline-flex items-center px-4 sm:px-6 lg:px-8 py-2 sm:py-3 bg-[#3366CC] hover:bg-[#2d5bb3] text-white text-sm sm:text-base font-semibold rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Try Again
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg dark:shadow-gray-900/50 border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-bold text-[#3366CC] dark:text-[#4a7dd9]">Asset Requests ({filteredRequests.length})</h3>
            </div>

            {/* Mobile Card Layout */}
            <div className="block md:hidden">
              {paginatedRequests.length === 0 ? (
                <div className="text-center py-12 sm:py-16 lg:py-20 px-4">
                  <div className="mx-auto w-12 h-12 sm:w-16 sm:h-16 text-gray-400 mb-4 sm:mb-6">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-1 sm:mb-2">No asset requests found</h3>
                  <p className="text-gray-500 text-xs sm:text-sm">Try adjusting your filters or search criteria.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-gray-700 space-y-1">
                  {paginatedRequests.map((request) => (
                    <div key={request.id} className="p-3 sm:p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 bg-white dark:bg-gray-800 rounded-md sm:rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-2 sm:mb-3">
                      <div className="flex items-start justify-between mb-2 sm:mb-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-1 sm:gap-2 mb-2 sm:mb-3">
                            <span className="text-xs font-mono text-[#3366CC] dark:text-[#4a7dd9] bg-[#3366CC]/10 dark:bg-[#3366CC]/20 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-xs">
                              {request.requestId}
                            </span>
                            {getStatusBadge(request.status)}
                            {getPriorityBadge(request.assetDetails.priority)}
                          </div>

                          <div className="mb-2 sm:mb-3">
                            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-1">{request.assetDetails.assetName}</h4>
                            <p className="text-xs text-gray-600 dark:text-gray-300 mb-1">{request.employeeInfo.fullName} ({request.employeeInfo.employeeCode})</p>
                            <p className="text-xs text-gray-600 dark:text-gray-300 mb-1 sm:mb-2">{request.employeeInfo.designation} • {request.employeeInfo.department}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 sm:mb-2 truncate">{request.employeeInfo.email}</p>
                            <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs text-gray-500 dark:text-gray-400">
                              <span className="whitespace-nowrap">Qty: {request.assetDetails.quantity}</span>
                              <span>{getTypeBadge(request.assetDetails.assetType)}</span>
                              <span className="whitespace-nowrap">Requested: {formatDate(request.createdAt)}</span>
                            </div>
                          </div>

                          <div className="text-xs text-gray-500 dark:text-gray-400 mb-2 sm:mb-3 line-clamp-2">
                            {request.assetDetails.justification}
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-1 ml-2 sm:ml-4">
                          <button
                            onClick={() => handleView(request.requestId)}
                            className="inline-flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 border border-gray-300 dark:border-gray-600 rounded text-gray-600 dark:text-gray-400 hover:text-[#3366CC] dark:hover:text-[#4a7dd9] hover:bg-[#3366CC]/10 dark:hover:bg-[#3366CC]/20 hover:border-[#3366CC] dark:hover:border-[#3366CC] transition-colors"
                            title="View"
                          >
                            <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDownload(request.requestId)}
                            className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center border border-gray-400 dark:border-gray-600 rounded bg-white dark:bg-gray-800 hover:bg-[#3366CC]/10 dark:hover:bg-[#3366CC]/20 hover:border-[#3366CC] dark:hover:border-[#3366CC] focus:outline-none focus:ring-2 focus:ring-[#3366CC]/50 dark:focus:ring-[#3366CC]/50 text-gray-600 dark:text-gray-400 hover:text-[#3366CC] dark:hover:text-[#4a7dd9] transition-colors"
                            title="Download"
                          >
                            <svg width={12} height={12} className="sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5V18a2.25 2.25 0 0 0 2.25 2.25h13.5A2.25 2.25 0 0 0 21 18v-1.5M7.5 12l4.5 4.5m0 0l4.5-4.5m-4.5 4.5V3" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {/* Pagination for Mobile */}
              {filteredRequests.length > 0 && (
                <div className="mt-4 border-t border-gray-200 dark:border-gray-700 px-4">
                  <Pagination
                    currentPage={currentPage}
                    pageSize={pageSize}
                    totalItems={filteredRequests.length}
                    onPageChange={setCurrentPage}
                    onPageSizeChange={(newSize) => {
                      setPageSize(newSize);
                      setCurrentPage(1);
                    }}
                    label="asset requests"
                  />
                </div>
              )}
            </div>

            {/* Desktop Table Layout */}
            <div className="hidden md:block">
              <div className="overflow-x-auto shadow-sm border border-gray-200 dark:border-gray-700 rounded-lg">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-2 md:px-3 lg:px-4 py-3 text-left text-xs font-medium text-[#3366CC] dark:text-[#4a7dd9] uppercase tracking-wider w-24 md:w-28 lg:w-32">Request ID</th>
                      <th className="px-2 md:px-3 lg:px-4 py-3 text-left text-xs font-medium text-[#3366CC] dark:text-[#4a7dd9] uppercase tracking-wider w-32 md:w-40 lg:w-48">Employee</th>
                      <th className="px-2 md:px-3 lg:px-4 py-3 text-left text-xs font-medium text-[#3366CC] dark:text-[#4a7dd9] uppercase tracking-wider w-40 md:w-48 lg:w-64">Asset Details</th>
                      <th className="px-2 md:px-3 lg:px-4 py-3 text-left text-xs font-medium text-[#3366CC] dark:text-[#4a7dd9] uppercase tracking-wider w-16 md:w-20 lg:w-24">Type</th>
                      <th className="px-2 md:px-3 lg:px-4 py-3 text-left text-xs font-medium text-[#3366CC] dark:text-[#4a7dd9] uppercase tracking-wider w-12 md:w-16 lg:w-20">Qty</th>
                      <th className="px-2 md:px-3 lg:px-4 py-3 text-left text-xs font-medium text-[#3366CC] dark:text-[#4a7dd9] uppercase tracking-wider w-16 md:w-20 lg:w-24">Priority</th>
                      <th className="px-2 md:px-3 lg:px-4 py-3 text-left text-xs font-medium text-[#3366CC] dark:text-[#4a7dd9] uppercase tracking-wider w-20 md:w-24 lg:w-28">Requested</th>
                      <th className="px-2 md:px-3 lg:px-4 py-3 text-left text-xs font-medium text-[#3366CC] dark:text-[#4a7dd9] uppercase tracking-wider w-20 md:w-24 lg:w-28">Expected</th>
                      <th className="px-2 md:px-3 lg:px-4 py-3 text-left text-xs font-medium text-[#3366CC] dark:text-[#4a7dd9] uppercase tracking-wider w-24 md:w-32 lg:w-40">Status</th>
                      <th className="px-2 md:px-3 lg:px-4 py-3 text-left text-xs font-medium text-[#3366CC] dark:text-[#4a7dd9] uppercase tracking-wider w-16 md:w-20 lg:w-24">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {paginatedRequests.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="px-4 sm:px-6 py-16 sm:py-20 lg:py-2 text-center">
                          <div className="mx-auto w-12 h-12 sm:w-16 sm:h-16 text-gray-400 dark:text-gray-500 mb-4 sm:mb-6">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                          <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white mb-1 sm:mb-2">No asset requests found</h3>
                          <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400">Try adjusting your filters or search criteria.</p>
                        </td>
                      </tr>
                    ) : (
                      paginatedRequests.map((request) => (
                        <tr key={request.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          <td className="px-2 md:px-3 lg:px-4 py-2 md:py-3 lg:py-4 text-xs md:text-sm font-medium">
                            <div className="font-mono text-[#3366CC] dark:text-[#4a7dd9] whitespace-nowrap">
                              {request.requestId}
                            </div>
                          </td>
                          <td className="px-2 md:px-3 lg:px-4 py-2 md:py-3 lg:py-4">
                            <div>
                              <div className="text-xs md:text-sm font-medium text-gray-900 dark:text-white truncate">{request.employeeInfo.fullName}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">{request.employeeInfo.employeeCode}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{request.employeeInfo.designation} • {request.employeeInfo.department}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{request.employeeInfo.email}</div>
                            </div>
                          </td>
                          <td className="px-2 md:px-3 lg:px-4 py-2 md:py-3 lg:py-4">
                            <div>
                              <div className="text-xs md:text-sm font-medium text-gray-900 dark:text-white truncate">{request.assetDetails.assetName}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-xs" title={request.assetDetails.justification}>
                                {request.assetDetails.justification}
                              </div>
                            </div>
                          </td>
                          <td className="px-2 md:px-3 lg:px-4 py-2 md:py-3 lg:py-4">
                            {getTypeBadge(request.assetDetails.assetType)}
                          </td>
                          <td className="px-2 md:px-3 lg:px-4 py-2 md:py-3 lg:py-4 text-xs md:text-sm text-gray-900 dark:text-white text-center">
                            <span className="inline-flex items-center justify-center w-6 h-6 md:w-8 md:h-8 bg-[#3366CC]/10 dark:bg-[#3366CC]/20 rounded-full text-xs font-medium text-[#3366CC] dark:text-[#4a7dd9]">
                              {request.assetDetails.quantity}
                            </span>
                          </td>
                          <td className="px-2 md:px-3 lg:px-4 py-2 md:py-3 lg:py-4">
                            {getPriorityBadge(request.assetDetails.priority)}
                          </td>
                          <td className="px-2 md:px-3 lg:px-4 py-2 md:py-3 lg:py-4 text-xs md:text-sm text-gray-900 dark:text-white">
                            {formatDate(request.createdAt)}
                          </td>
                          <td className="px-2 md:px-3 lg:px-4 py-2 md:py-3 lg:py-4 text-xs md:text-sm text-gray-900 dark:text-white">
                            {request.assetDetails.expectedDate ? formatDate(request.assetDetails.expectedDate) : formatDate(request.expectedDate)}
                          </td>
                          <td className="px-2 md:px-3 lg:px-4 py-2 md:py-3 lg:py-4">
                            <div className="space-y-1">
                              {getStatusBadge(request.status)}
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {request.status === 'Issued' && (
                                  <div>Issued: {formatDate(request.updatedAt)}</div>
                                )}
                                {request.status === 'Approved' && (
                                  <div>Approved: {formatDate(request.updatedAt)}</div>
                                )}
                                {request.status === 'Rejected' && (
                                  <div>Rejected: {formatDate(request.updatedAt)}</div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-2 md:px-3 lg:px-4 py-2 md:py-3 lg:py-4">
                            <div className="flex items-center space-x-1">
                              <button
                                onClick={() => handleView(request.requestId)}
                                className="inline-flex items-center justify-center w-6 h-6 md:w-7 md:h-7 lg:w-8 lg:h-8 border border-gray-300 dark:border-gray-600 rounded-md text-gray-600 dark:text-gray-400 hover:text-[#3366CC] dark:hover:text-[#4a7dd9] hover:bg-[#3366CC]/10 dark:hover:bg-[#3366CC]/20 hover:border-[#3366CC] dark:hover:border-[#3366CC] transition-colors"
                                title="View"
                              >
                                <svg className="w-3 h-3 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                              </button>

                              <button
                                onClick={() => handleDownload(request.requestId)}
                                className="w-6 h-6 md:w-7 md:h-7 lg:w-8 lg:h-8 flex items-center justify-center border border-gray-400 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 hover:bg-[#3366CC]/10 dark:hover:bg-[#3366CC]/20 hover:border-[#3366CC] dark:hover:border-[#3366CC] focus:outline-none focus:ring-2 focus:ring-[#3366CC]/50 dark:focus:ring-[#3366CC]/50 text-gray-600 dark:text-gray-400 hover:text-[#3366CC] dark:hover:text-[#4a7dd9] transition-colors"
                                title="Download"
                              >
                                <svg width={12} height={12} className="md:w-4 md:h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5V18a2.25 2.25 0 0 0 2.25 2.25h13.5A2.25 2.25 0 0 0 21 18v-1.5M7.5 12l4.5 4.5m0 0l4.5-4.5m-4.5 4.5V3" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      )))}
                  </tbody>
                </table>
              </div>
              {/* Pagination */}
              {filteredRequests.length > 0 && (
                <div className="mt-4 border-t border-gray-200 dark:border-gray-700">
                  <Pagination
                    currentPage={currentPage}
                    pageSize={pageSize}
                    totalItems={filteredRequests.length}
                    onPageChange={setCurrentPage}
                    onPageSizeChange={(newSize) => {
                      setPageSize(newSize);
                      setCurrentPage(1);
                    }}
                    label="asset requests"
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AssetManagementComponent;
