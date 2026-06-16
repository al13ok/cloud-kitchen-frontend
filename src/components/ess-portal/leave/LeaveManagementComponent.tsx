"use client";



import React, { useState, useMemo, useEffect } from 'react';

import { useRouter } from 'next/navigation';

import { Calendar, RefreshCw, Plus } from 'lucide-react';
import DashboardHeader from '@/components/header/DashboardHeader';
import Pagination from '@/components/tables/Pagination';

import jsPDF from 'jspdf';

import { getAuthHeaders, BACKEND_URL } from '@/utils/api';


interface LeaveApplication {

  id: string;

  leaveId?: string;

  employeeInfo: {

    employeeCode: string;

    fullName: string;

    department: string;

    designation: string;

    email: string;

  };

  leaveDetails: {

    leaveType: string;

    fromDate: string;

    toDate: string;

    reasonForLeave: string;

  };

  status: 'Pending' | 'Approved' | 'Rejected';

  requestedDays: number;

  availableDays: number;

  createdAt: string;

  updatedAt: string;

  priority?: string;

  leaveDuration?: number;

  daysUntilLeave?: number;

  approvalInfo?: {

    approvedBy: string | null;

    approvedDate: string | null;

    rejectedBy: string | null;

    rejectedDate: string | null;

    hrComments: string | null;

  };

}



interface LeaveStats {

  totalApplications: number;

  pending: number;

  approved: number;

  rejected: number;

}



const LeaveManagementComponent: React.FC = () => {

  const router = useRouter();

  const [searchTerm, setSearchTerm] = useState('');

  const [statusFilter, setStatusFilter] = useState('All Status');

  const [typeFilter, setTypeFilter] = useState('All Types');

  const [departmentFilter, setDepartmentFilter] = useState('All Departments');

  const [leaveApplications, setLeaveApplications] = useState<LeaveApplication[]>([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);



  // Fetch leave applications from API

  useEffect(() => {
    let mounted = true;

    const fetchLeaveApplications = async () => {
      const url = `${BACKEND_URL}/api/v1/ess-portal/leave-applications`;

      try {

        setLoading(true);

        const authHeaders = getAuthHeaders();
        const response = await fetch(url, {

          method: 'GET',

          headers: {
            ...authHeaders,
            'Accept': 'application/json',

            'Content-Type': 'application/json',

          },

        });



        if (!response.ok) {

          throw new Error(`HTTP error! status: ${response.status}`);

        }



        const result = await response.json();

        console.log('📋 Leave Applications API Response:', {
          success: result.success,
          count: result.count,
          total: result.total,
          dataLength: result.data?.length || 0,
          filterApplied: result.filter_applied
        });

        if (result.success && result.data) {

          if (mounted) {
            setLeaveApplications(result.data);
            console.log(`✅ Loaded ${result.data.length} leave applications`);
          }

        } else {
          console.warn('⚠️ Leave applications response indicates failure:', result);
          if (mounted) {
            setLeaveApplications([]);
          }

        }

      } catch (err) {

        if (mounted) {
          const errorMessage = err instanceof Error ? err.message : 'An error occurred';
          setError(errorMessage);
          setLeaveApplications([]); // Clear on error

          // Enhanced error logging
          if (errorMessage.includes('Failed to fetch') || errorMessage.includes('Network')) {
            console.error('❌ Network Error fetching leave applications:', {
              error: errorMessage,
              url,
              backendUrl: BACKEND_URL,
              suggestion: 'Check backend server and CORS configuration'
            });
          } else {
            console.error('❌ Error fetching leave applications:', err);
          }
        }

      } finally {

        if (mounted) {
          setLoading(false);
        }

      }

    };



    fetchLeaveApplications();

    // Poll for status updates every 10 seconds to reflect manager approval changes
    const interval = setInterval(async () => {
      if (!mounted) return;

      try {
        const authHeaders = getAuthHeaders();
        const url = `${BACKEND_URL}/api/v1/ess-portal/leave-applications`;
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            ...authHeaders, // ✅ Include auth headers
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) return;

        const result = await response.json();

        if (result.success && result.data && mounted) {
          setLeaveApplications(prevApplications => {
            // Only update if there are actual changes
            const hasChanges = JSON.stringify(prevApplications) !== JSON.stringify(result.data);
            return hasChanges ? result.data : prevApplications;
          });
        }
      } catch (err) {
        // Ignore polling errors
        console.warn('Error polling leave applications status:', err);
      }
    }, 10000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };

  }, []);



  // Calculate stats

  const stats: LeaveStats = useMemo(() => {
    return {
      totalApplications: leaveApplications.length,
      pending: leaveApplications.filter(app => {
        const status = String(app.status);
        return status === 'Pending' || status.toLowerCase() === 'pending';
      }).length,
      approved: leaveApplications.filter(app => {
        const status = String(app.status);
        return status === 'Approved' || status.toLowerCase() === 'approved' ||
          status.toLowerCase() === 'manager_approved' || status.toLowerCase() === 'hr_approved';
      }).length,
      rejected: leaveApplications.filter(app => {
        const status = String(app.status);
        return status === 'Rejected' || status.toLowerCase() === 'rejected' ||
          status.toLowerCase() === 'manager_rejected' || status.toLowerCase() === 'hr_rejected';
      }).length
    };
  }, [leaveApplications]);



  // Filter applications

  const filteredApplications = useMemo(() => {

    return leaveApplications.filter(app => {

      const matchesSearch = searchTerm === '' ||

        app.employeeInfo.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||

        app.employeeInfo.employeeCode.toLowerCase().includes(searchTerm.toLowerCase()) ||

        app.id.toLowerCase().includes(searchTerm.toLowerCase());



      const matchesStatus = statusFilter === 'All Status' ||
        (statusFilter === 'Pending' && (app.status === 'Pending' || app.status.toLowerCase() === 'pending')) ||
        (statusFilter === 'Approved' && (app.status === 'Approved' || app.status.toLowerCase() === 'approved' || app.status.toLowerCase() === 'manager_approved' || app.status.toLowerCase() === 'hr_approved')) ||
        (statusFilter === 'Rejected' && (app.status === 'Rejected' || app.status.toLowerCase() === 'rejected' || app.status.toLowerCase() === 'manager_rejected' || app.status.toLowerCase() === 'hr_rejected'));

      const matchesType = typeFilter === 'All Types' || app.leaveDetails.leaveType.toLowerCase().includes(typeFilter.toLowerCase());

      const matchesDepartment = departmentFilter === 'All Departments' || app.employeeInfo.department === departmentFilter;



      return matchesSearch && matchesStatus && matchesType && matchesDepartment;

    });

  }, [leaveApplications, searchTerm, statusFilter, typeFilter, departmentFilter]);

  // Calculate pagination
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedApplications = filteredApplications.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, typeFilter, departmentFilter]);



  const getStatusBadge = (status: string, approvalInfo?: { approvedBy: string | null; rejectedBy: string | null }) => {
    // Handle case-sensitive status values from backend first
    const originalStatus = String(status);
    let normalizedStatus = originalStatus.toLowerCase();

    // Map case-sensitive backend status to normalized status
    if (originalStatus === 'Approved') {
      normalizedStatus = 'manager_approved';
    } else if (originalStatus === 'Rejected') {
      normalizedStatus = 'manager_rejected';
    } else if (originalStatus === 'Pending') {
      normalizedStatus = 'pending';
    }

    switch (normalizedStatus) {
      case 'pending':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
            </svg>
            Pending
          </span>
        );

      case 'manager_approved':
      case 'approved':
        return (
          <div className="flex flex-col">
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 mb-1">
              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Manager Approved
            </span>
            {approvalInfo?.approvedBy && <span className="text-xs text-gray-500">by {approvalInfo.approvedBy}</span>}
          </div>
        );

      case 'hr_approved':
        return (
          <div className="flex flex-col">
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 mb-1">
              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Manager Approved, HR Approved
            </span>
            {approvalInfo?.approvedBy && <span className="text-xs text-gray-500">by {approvalInfo.approvedBy}</span>}
          </div>
        );

      case 'hr_rejected':
        return (
          <div className="flex flex-col">
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 mb-1">
              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              Manager Approved, HR Rejected
            </span>
            {approvalInfo?.rejectedBy && <span className="text-xs text-gray-500">by {approvalInfo.rejectedBy}</span>}
          </div>
        );

      case 'manager_rejected':
      case 'rejected':
        return (
          <div className="flex flex-col">
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 mb-1">
              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              Manager Rejected
            </span>
            {approvalInfo?.rejectedBy && <span className="text-xs text-gray-500">by {approvalInfo.rejectedBy}</span>}
          </div>
        );

      case 'it_approved':

        return (

          <div className="flex flex-col">

            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 mb-1">

              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">

                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />

              </svg>

              IT Approved

            </span>

            {approvalInfo?.approvedBy && <span className="text-xs text-gray-500">by {approvalInfo.approvedBy}</span>}

          </div>

        );

      case 'it_rejected':

        return (

          <div className="flex flex-col">

            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 mb-1">

              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">

                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />

              </svg>

              IT Rejected

            </span>

            {approvalInfo?.rejectedBy && <span className="text-xs text-gray-500">by {approvalInfo.rejectedBy}</span>}

          </div>

        );

      case 'finance_approved':

        return (

          <div className="flex flex-col">

            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 mb-1">

              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">

                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />

              </svg>

              Finance Approved

            </span>

            {approvalInfo?.approvedBy && <span className="text-xs text-gray-500">by {approvalInfo.approvedBy}</span>}

          </div>

        );

      case 'finance_rejected':

        return (

          <div className="flex flex-col">

            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 mb-1">

              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">

                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />

              </svg>

              Finance Rejected

            </span>

            {approvalInfo?.rejectedBy && <span className="text-xs text-gray-500">by {approvalInfo.rejectedBy}</span>}

          </div>

        );

      default:
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
            </svg>
            {originalStatus}
          </span>
        );

    }

  };



  const getTypeBadge = (leaveType: string) => {

    const normalizedType = leaveType.toLowerCase();

    const typeColors = {

      'annual leave': 'bg-blue-100 text-blue-800',

      'sick leave': 'bg-pink-100 text-pink-800',

      'casual leave': 'bg-green-100 text-green-800',

      'emergency leave': 'bg-red-100 text-red-800',

      'maternity leave': 'bg-purple-100 text-purple-800',

      'paternity leave': 'bg-indigo-100 text-indigo-800'

    };



    return (

      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${typeColors[normalizedType as keyof typeof typeColors] || 'bg-gray-100 text-gray-800'}`}>

        {leaveType}

      </span>

    );

  };



  // Helper function to format date range

  const formatDateRange = (fromDate: string, toDate: string) => {

    const formatDate = (dateStr: string) => {

      const date = new Date(dateStr);

      return date.toLocaleDateString('en-GB', {

        day: '2-digit',

        month: '2-digit',

        year: 'numeric'

      });

    };

    return `${formatDate(fromDate)} to ${formatDate(toDate)}`;

  };



  // Helper function to format applied date

  const formatAppliedDate = (dateStr: string) => {

    const date = new Date(dateStr);

    return date.toLocaleDateString('en-GB', {

      day: '2-digit',

      month: '2-digit',

      year: 'numeric'

    });

  };



  const handleView = (applicationId: string, leaveId?: string) => {

    const query = new URLSearchParams({ id: applicationId });
    if (leaveId) {
      query.set('leaveId', leaveId);
    }
    router.push(`/ess-portal/leave/view?${query.toString()}`);

  };



  const handleDownload = (applicationId: string) => {

    // Find the leave application data
    const application = leaveApplications.find(app => app.id === applicationId);
    if (!application) {
      console.error('Leave application not found:', applicationId);
      return;
    }

    // Create PDF document
    const doc = new jsPDF();

    // Add title
    doc.setFontSize(20);
    doc.text('Leave Application Details', 20, 30);

    // Add application ID (use actual leaveId or fallback to id)
    doc.setFontSize(14);
    doc.text(`Application ID: ${application.leaveId || application.id}`, 20, 50);

    // Add employee information
    doc.setFontSize(14);
    doc.text('Employee Information:', 20, 70);
    doc.setFontSize(12);
    doc.text(`Employee Code: ${application.employeeInfo.employeeCode}`, 20, 85);
    doc.text(`Full Name: ${application.employeeInfo.fullName}`, 20, 95);
    doc.text(`Designation: ${application.employeeInfo.designation}`, 20, 105);
    doc.text(`Department: ${application.employeeInfo.department}`, 20, 115);
    doc.text(`Email: ${application.employeeInfo.email}`, 20, 125);

    // Add leave details
    doc.setFontSize(14);
    doc.text('Leave Details:', 20, 145);
    doc.setFontSize(12);
    doc.text(`Leave Type: ${application.leaveDetails.leaveType}`, 20, 160);
    doc.text(`From Date: ${formatDate(application.leaveDetails.fromDate)}`, 20, 170);
    doc.text(`To Date: ${formatDate(application.leaveDetails.toDate)}`, 20, 180);
    doc.text(`Requested Days: ${application.requestedDays}`, 20, 190);
    doc.text(`Available Days: ${application.availableDays}`, 20, 200);
    doc.text(`Status: ${application.status}`, 20, 210);
    doc.text(`Created: ${formatDate(application.createdAt)}`, 20, 220);

    // Add reason for leave
    doc.setFontSize(14);
    doc.text('Reason for Leave:', 20, 240);
    doc.setFontSize(12);
    const reasonLines = doc.splitTextToSize(application.leaveDetails.reasonForLeave, 170);
    doc.text(reasonLines, 20, 255);

    // Add approval information if available
    if (application.approvalInfo) {
      let yPosition = 275;
      doc.setFontSize(14);
      doc.text('Approval Information:', 20, yPosition);
      yPosition += 15;
      doc.setFontSize(12);

      if (application.approvalInfo.approvedBy) {
        doc.text(`Approved By: ${application.approvalInfo.approvedBy}`, 20, yPosition);
        yPosition += 10;
        doc.text(`Approved Date: ${formatDate(application.approvalInfo.approvedDate || '')}`, 20, yPosition);
        yPosition += 10;
      }

      if (application.approvalInfo.rejectedBy) {
        doc.text(`Rejected By: ${application.approvalInfo.rejectedBy}`, 20, yPosition);
        yPosition += 10;
        doc.text(`Rejected Date: ${formatDate(application.approvalInfo.rejectedDate || '')}`, 20, yPosition);
        yPosition += 10;
      }

      if (application.approvalInfo.hrComments) {
        doc.text('HR Comments:', 20, yPosition);
        yPosition += 10;
        const commentLines = doc.splitTextToSize(application.approvalInfo.hrComments, 170);
        doc.text(commentLines, 20, yPosition);
      }
    }

    // Generate filename with custom format: leave_id:date:time
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD format
    const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS format
    const leaveId = application.leaveId || application.id;
    const filename = `${leaveId}:${dateStr}:${timeStr}.pdf`;

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



  // Removed reject handler as Approve/Reject are not used anymore



  return (

    <div className="min-h-screen relative overflow-hidden dark:bg-black" style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.03) 0%, rgba(99, 102, 241, 0.03) 50%, rgba(14, 165, 233, 0.03) 100%)' }}>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">

        {/* Modern Header */}

        {/* Modern Header */}
        <DashboardHeader
          title="Leave Management"
          subtitle="Comprehensive leave management system with application tracking, approval workflows, balance monitoring, and detailed reporting for efficient workforce management."
          icon={Calendar}
          variant="default"
          size="md"
          actions={
            <div className="flex flex-col space-y-3 sm:flex-row sm:space-y-0 sm:space-x-3">
              <button
                onClick={() => router.push('/ess-portal/leave/apply')}
                className="flex items-center px-6 py-3 bg-white/20 rounded-xl backdrop-blur-sm border border-white/30 text-white hover:bg-white/30 transition-all duration-200 hover:scale-105 whitespace-nowrap"
                title="Apply for Leave"
              >
                <Plus className="w-5 h-5 mr-2 flex-shrink-0" />
                <span className="font-medium whitespace-nowrap">Apply Leave</span>
              </button>

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

          <div className="relative bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-lg dark:shadow-gray-900/50 hover:shadow-2xl transition-all duration-500 hover:scale-105 cursor-pointer group overflow-hidden border border-slate-200/50 dark:border-gray-700/50" style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.03) 0%, rgba(99, 102, 241, 0.03) 50%, rgba(14, 165, 233, 0.03) 100%)' }}>

            {/* Professional Background Effects */}

            <div className="absolute inset-0 bg-gradient-to-br from-white/90 to-slate-50/90 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-indigo-100/60 to-slate-100/60 rounded-full -translate-y-10 translate-x-10 opacity-0 group-hover:opacity-70 transition-opacity duration-500"></div>

            <div className="relative z-10 p-6">

              <div className="flex items-center justify-between mb-4">

                <div className="p-3 rounded-xl bg-[#3366CC] shadow-lg">

                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">

                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />

                  </svg>

                </div>

              </div>

              <div className="space-y-2">

                <p className="text-3xl font-bold text-slate-800 dark:text-white">{stats.totalApplications}</p>

                <p className="text-slate-600 dark:text-gray-300 text-sm font-medium">Total Applications</p>

                <div className="w-full bg-slate-200 dark:bg-gray-700 rounded-full h-2 mt-3">

                  <div className="bg-[#3366CC] h-2 rounded-full transition-all duration-500" style={{ width: '100%' }}></div>

                </div>

              </div>

            </div>

          </div>



          <div className="relative bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-lg dark:shadow-gray-900/50 hover:shadow-2xl transition-all duration-500 hover:scale-105 cursor-pointer group overflow-hidden border border-slate-200/50 dark:border-gray-700/50" style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.03) 0%, rgba(99, 102, 241, 0.03) 50%, rgba(14, 165, 233, 0.03) 100%)' }}>

            {/* Professional Background Effects */}

            <div className="absolute inset-0 bg-gradient-to-br from-white/90 to-slate-50/90 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-indigo-100/60 to-slate-100/60 rounded-full -translate-y-10 translate-x-10 opacity-0 group-hover:opacity-70 transition-opacity duration-500"></div>

            <div className="relative z-10 p-6">

              <div className="flex items-center justify-between mb-4">

                <div className="p-3 rounded-xl bg-[#3366CC] shadow-lg">

                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">

                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />

                  </svg>

                </div>

              </div>

              <div className="space-y-2">

                <p className="text-3xl font-bold text-[#3366CC] dark:text-[#4a7dd9]">{stats.pending}</p>

                <p className="text-slate-600 dark:text-gray-300 text-sm font-medium">Pending</p>

                <div className="w-full bg-slate-200 dark:bg-gray-700 rounded-full h-2 mt-3">

                  <div className="bg-[#3366CC] h-2 rounded-full transition-all duration-500" style={{ width: `${stats.totalApplications > 0 ? (stats.pending / stats.totalApplications) * 100 : 0}%` }}></div>

                </div>

              </div>

            </div>

          </div>



          <div className="relative bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-lg dark:shadow-gray-900/50 hover:shadow-2xl transition-all duration-500 hover:scale-105 cursor-pointer group overflow-hidden border border-slate-200/50 dark:border-gray-700/50" style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.03) 0%, rgba(99, 102, 241, 0.03) 50%, rgba(14, 165, 233, 0.03) 100%)' }}>

            {/* Professional Background Effects */}

            <div className="absolute inset-0 bg-gradient-to-br from-white/90 to-slate-50/90 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-indigo-100/60 to-slate-100/60 rounded-full -translate-y-10 translate-x-10 opacity-0 group-hover:opacity-70 transition-opacity duration-500"></div>

            <div className="relative z-10 p-6">

              <div className="flex items-center justify-between mb-4">

                <div className="p-3 rounded-xl bg-[#3366CC] shadow-lg">

                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">

                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />

                  </svg>

                </div>

              </div>

              <div className="space-y-2">

                <p className="text-3xl font-bold text-[#3366CC] dark:text-[#4a7dd9]">{stats.approved}</p>

                <p className="text-slate-600 dark:text-gray-300 text-sm font-medium">Approved</p>

                <div className="w-full bg-slate-200 dark:bg-gray-700 rounded-full h-2 mt-3">

                  <div className="bg-[#3366CC] h-2 rounded-full transition-all duration-500" style={{ width: `${stats.totalApplications > 0 ? (stats.approved / stats.totalApplications) * 100 : 0}%` }}></div>

                </div>

              </div>

            </div>

          </div>



          <div className="relative bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-lg dark:shadow-gray-900/50 hover:shadow-2xl transition-all duration-500 hover:scale-105 cursor-pointer group overflow-hidden border border-slate-200/50 dark:border-gray-700/50" style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.03) 0%, rgba(99, 102, 241, 0.03) 50%, rgba(14, 165, 233, 0.03) 100%)' }}>

            {/* Professional Background Effects */}

            <div className="absolute inset-0 bg-gradient-to-br from-white/90 to-slate-50/90 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-indigo-100/60 to-slate-100/60 rounded-full -translate-y-10 translate-x-10 opacity-0 group-hover:opacity-70 transition-opacity duration-500"></div>

            <div className="relative z-10 p-6">

              <div className="flex items-center justify-between mb-4">

                <div className="p-3 rounded-xl bg-[#3366CC] shadow-lg">

                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">

                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />

                  </svg>

                </div>

              </div>

              <div className="space-y-2">

                <p className="text-3xl font-bold text-[#3366CC] dark:text-[#4a7dd9]">{stats.rejected}</p>

                <p className="text-slate-600 dark:text-gray-300 text-sm font-medium">Rejected</p>

                <div className="w-full bg-slate-200 dark:bg-gray-700 rounded-full h-2 mt-3">

                  <div className="bg-[#3366CC] h-2 rounded-full transition-all duration-500" style={{ width: `${stats.totalApplications > 0 ? (stats.rejected / stats.totalApplications) * 100 : 0}%` }}></div>

                </div>

              </div>

            </div>

          </div>

        </div>



        {/* Filters */}

        <div className="bg-white/90 dark:bg-black backdrop-blur-sm rounded-2xl shadow-xl border border-slate-200/50 dark:border-gray-700/50 hover:shadow-2xl transition-all duration-300 p-6 mb-8" style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.03) 0%, rgba(99, 102, 241, 0.03) 50%, rgba(14, 165, 233, 0.03) 100%)' }}>

          <div className="flex items-center mb-4">

            <div className="p-2 rounded-xl bg-[#3366CC]/10 dark:bg-[#3366CC]/20 mr-3">

              <svg className="w-5 h-5 text-[#3366CC] dark:text-[#4a7dd9]" fill="none" stroke="currentColor" viewBox="0 0 24 24">

                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />

              </svg>

            </div>

            <h2 className="text-xl font-bold text-[#3366CC] dark:text-[#4a7dd9] flex items-center">Advanced Filters</h2>

          </div>

          <p className="text-slate-600 dark:text-gray-300 text-sm mb-6">Filter and search through leave applications with precision</p>



          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">

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

                  onChange={(e) => setStatusFilter(e.target.value)}

                  className="w-full px-3 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-[#3366CC]/50 dark:focus:ring-[#3366CC]/50 focus:border-[#3366CC] dark:focus:border-[#3366CC] bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-white/80 dark:hover:bg-gray-700/80 transition-all duration-200 shadow-sm hover:shadow-md appearance-none cursor-pointer"

                >

                  <option value="All Status" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white">All Status</option>

                  <option value="Pending" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white">Pending</option>

                  <option value="Approved" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white">Approved</option>

                  <option value="Rejected" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white">Rejected</option>

                </select>

                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">

                  <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">

                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />

                  </svg>

                </div>

              </div>

            </div>



            <div>

              <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">Type</label>

              <div className="relative">

                <select

                  value={typeFilter}

                  onChange={(e) => setTypeFilter(e.target.value)}

                  className="w-full px-3 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-[#3366CC]/50 dark:focus:ring-[#3366CC]/50 focus:border-[#3366CC] dark:focus:border-[#3366CC] bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-white/80 dark:hover:bg-gray-700/80 transition-all duration-200 shadow-sm hover:shadow-md appearance-none cursor-pointer"

                >

                  <option value="All Types" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white">All Types</option>

                  <option value="Annual Leave" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white">Annual Leave</option>

                  <option value="Sick Leave" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white">Sick Leave</option>

                  <option value="Casual Leave" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white">Casual Leave</option>

                  <option value="Emergency Leave" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white">Emergency Leave</option>

                  <option value="Maternity Leave" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white">Maternity Leave</option>

                  <option value="Paternity Leave" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white">Paternity Leave</option>

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

                  onChange={(e) => setDepartmentFilter(e.target.value)}

                  className="w-full px-3 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-[#3366CC]/50 dark:focus:ring-[#3366CC]/50 focus:border-[#3366CC] dark:focus:border-[#3366CC] bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-white/80 dark:hover:bg-gray-700/80 transition-all duration-200 shadow-sm hover:shadow-md appearance-none cursor-pointer"

                >

                  <option value="All Departments" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white">All Departments</option>

                  <option value="Engineering" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white">Engineering</option>

                  <option value="Human Resources" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white">Human Resources</option>

                  <option value="Finance" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white">Finance</option>

                  <option value="Marketing" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white">Marketing</option>

                  <option value="Sales" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white">Sales</option>

                  <option value="IT" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white">IT</option>

                  <option value="Operations" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white">Operations</option>

                  <option value="Quality Control" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white">Quality Control</option>

                  <option value="Quality Assurance" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white">Quality Assurance</option>

                  <option value="Development" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white">Development</option>

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



        {/* Leave Applications Table */}

        <div className="bg-white/90 dark:bg-black backdrop-blur-sm rounded-xl shadow-lg border border-slate-200/50 dark:border-gray-700/50 overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.03) 0%, rgba(99, 102, 241, 0.03) 50%, rgba(14, 165, 233, 0.03) 100%)' }}>

          <div className="px-6 py-4 border-b border-slate-200 dark:border-gray-700">

            <h2 className="text-lg font-semibold text-[#3366CC] dark:text-[#4a7dd9]">

              Leave Applications ({filteredApplications.length})

            </h2>

          </div>



          {loading ? (

            <div className="text-center py-12">

              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3366CC] dark:border-[#4a7dd9] mx-auto mb-4"></div>

              <p className="text-gray-600 dark:text-gray-300">Loading leave applications...</p>

            </div>

          ) : error ? (

            <div className="text-center py-12">

              <svg className="w-12 h-12 text-red-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">

                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />

              </svg>

              <h3 className="text-lg font-medium text-gray-900 mb-2">Error loading applications</h3>

              <p className="text-gray-500 mb-4">{error}</p>

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

                      Leave ID

                    </th>

                    <th className="px-6 py-3 text-left text-xs font-medium text-[#3366CC] dark:text-[#4a7dd9] uppercase tracking-wider">

                      Employee

                    </th>

                    <th className="px-6 py-3 text-left text-xs font-medium text-[#3366CC] dark:text-[#4a7dd9] uppercase tracking-wider">

                      Type

                    </th>

                    <th className="px-6 py-3 text-left text-xs font-medium text-[#3366CC] dark:text-[#4a7dd9] uppercase tracking-wider">

                      Duration

                    </th>

                    <th className="px-6 py-3 text-left text-xs font-medium text-[#3366CC] dark:text-[#4a7dd9] uppercase tracking-wider">

                      Period

                    </th>

                    <th className="px-6 py-3 text-left text-xs font-medium text-[#3366CC] dark:text-[#4a7dd9] uppercase tracking-wider">

                      Applied On

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

                  {paginatedApplications.map((application) => (

                    <tr key={application.id} className="hover:bg-gradient-to-r hover:from-blue-50/50 hover:via-indigo-50/50 hover:to-sky-50/50 transition-all duration-200">

                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">

                        {application.leaveId || application.id}

                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">

                        <div>

                          <div className="text-sm font-medium text-gray-900 dark:text-white">{application.employeeInfo.fullName}</div>

                          <div className="text-sm text-gray-500 dark:text-gray-400">{application.employeeInfo.employeeCode}</div>

                          <div className="text-sm text-gray-500 dark:text-gray-400 truncate">{application.employeeInfo.email}</div>

                          <div className="text-sm text-gray-500 dark:text-gray-400">{application.employeeInfo.designation}</div>

                          <div className="text-sm text-gray-500 dark:text-gray-400">{application.employeeInfo.department}</div>

                        </div>

                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">

                        {getTypeBadge(application.leaveDetails.leaveType)}

                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">

                        <div className="flex items-center">

                          <svg className="w-4 h-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">

                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />

                          </svg>

                          <span className="text-sm text-gray-900 dark:text-gray-200">{application.requestedDays} days</span>

                        </div>

                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">

                        {formatDateRange(application.leaveDetails.fromDate, application.leaveDetails.toDate)}

                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">

                        {formatAppliedDate(application.createdAt)}

                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">

                        {getStatusBadge(application.status, application.approvalInfo)}

                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">

                        <div className="flex space-x-2">

                          <button

                            onClick={() => handleView(application.id, application.leaveId)}

                            className="inline-flex items-center justify-center w-8 h-8 border border-slate-300 dark:border-gray-600 rounded-md text-slate-600 dark:text-gray-300 hover:text-[#3366CC] dark:hover:text-[#4a7dd9] hover:bg-[#3366CC]/10 dark:hover:bg-[#3366CC]/20 transition-all duration-200"

                          >

                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">

                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />

                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />

                            </svg>

                          </button>



                          <button

                            onClick={() => handleDownload(application.id)}

                            className="w-8 h-8 flex items-center justify-center border border-slate-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 hover:bg-[#3366CC]/10 dark:hover:bg-[#3366CC]/20 hover:text-[#3366CC] dark:hover:text-[#4a7dd9] focus:outline-none focus:ring-2 focus:ring-[#3366CC]/50 dark:focus:ring-[#3366CC]/50 transition-all duration-200"

                            title="Download"

                          >

                            <svg width={18} height={18} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">

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

          )}

          {/* Pagination */}
          {!loading && !error && filteredApplications.length > 0 && (
            <div className="border-t border-slate-200 dark:border-gray-700">
              <Pagination
                currentPage={currentPage}
                pageSize={pageSize}
                totalItems={filteredApplications.length}
                onPageChange={(page) => setCurrentPage(page)}
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  setCurrentPage(1);
                }}
                label="leave applications"
                className="bg-white/90 dark:bg-gray-800/90"
              />
            </div>
          )}

          {!loading && !error && filteredApplications.length === 0 && (

            <div className="text-center py-12">

              <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">

                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />

              </svg>

              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No leave applications found</h3>

              <p className="text-gray-500 dark:text-gray-400">Try adjusting your filters or search criteria.</p>

            </div>

          )}

        </div>

      </div>



      <style jsx>{`

        @keyframes fade-in-up {

          from {

            opacity: 0;

            transform: translateY(30px);

          }

          to {

            opacity: 1;

            transform: translateY(0);

          }

        }



        @keyframes slide-in-left {

          from {

            opacity: 0;

            transform: translateX(-50px);

          }

          to {

            opacity: 1;

            transform: translateX(0);

          }

        }



        @keyframes float {

          0%, 100% {

            transform: translateY(0px);

          }

          50% {

            transform: translateY(-10px);

          }

        }



        @keyframes gradient-shift {

          0% {

            transform: translateX(-100%);

          }

          100% {

            transform: translateX(100%);

          }

        }



        .animate-fade-in-up {

          animation: fade-in-up 0.6s ease-out;

        }



        .animate-slide-in-left {

          animation: slide-in-left 0.8s ease-out;

        }



        .animate-float {

          animation: float 3s ease-in-out infinite;

        }



        .animate-gradient-shift {

          animation: gradient-shift 8s ease-in-out infinite;

        }

      `}</style>

    </div>

  );

};



export default LeaveManagementComponent;
