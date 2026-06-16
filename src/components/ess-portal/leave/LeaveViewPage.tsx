"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Calendar, ArrowLeft, User, Clock, FileText, CheckCircle, XCircle, Download, ChevronDown } from 'lucide-react';
import DashboardHeader from '@/components/header/DashboardHeader';
import { ESS_PORTAL_ENDPOINTS, essApiFetch } from '@/utils/essApi';
import jsPDF from 'jspdf';

interface LeaveApplicationDetails {
  id: string;
  leaveId: string;
  employee: {
    name: string;
    code: string;
    designation: string;
    department: string;
    email?: string;
  };
  type: string;
  duration: number;
  startDate: string;
  endDate: string;
  reason: string;
  appliedOn: string;
  appliedTime?: string;
  status: string;
  approvedBy?: string;
  rejectedBy?: string;
  approvedOn?: string;
  rejectedOn?: string;
  comments?: string;
}

interface LeaveBalance {
  annual: number;
  sick: number;
  casual: number;
}

const LeaveViewPage: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [leaveApplication, setLeaveApplication] = useState<LeaveApplicationDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadMenuOpen, setDownloadMenuOpen] = useState(false);
  const [activeLeaveId, setActiveLeaveId] = useState<string | null>(null);
  const [leaveBalance] = useState<LeaveBalance>({ annual: 12, sick: 5, casual: 3 });
  const downloadMenuRef = useRef<HTMLDivElement>(null);

  // Get URL parameters - 'id' is the object_id from the list (primary identifier)
  const primaryLeaveId = searchParams.get('id'); // This is the object_id like "a38eb611-b9e0-4a34-ad99-6812a121f9c9"
  const fallbackLeaveId = searchParams.get('leaveId'); // This is the leaveId like "LV-001"

  // Use primaryLeaveId (object_id) as the main ID to fetch
  // The backend endpoint expects the 'id' field, not 'leaveId'
  const applicationId = primaryLeaveId || fallbackLeaveId;

  // Map backend response to view model
  const mapBackendToView = useCallback((data: Record<string, unknown>, resolvedId: string): LeaveApplicationDetails => {
    const employeeInfo = (data.employeeInfo || data.employee || {}) as Record<string, unknown>;
    const leaveDetails = (data.leaveDetails || data.leave || {}) as Record<string, unknown>;
    const approvalInfo = (data.approvalInfo || {}) as Record<string, unknown>;

    // Calculate duration
    let duration = (data.requestedDays as number) || (data.duration as number) || (data.leaveDuration as number) || 0;
    const fromDate = leaveDetails.fromDate as string | undefined;
    const toDate = leaveDetails.toDate as string | undefined;
    if (!duration && fromDate && toDate) {
      const from = new Date(fromDate);
      const to = new Date(toDate);
      const diffTime = Math.abs(to.getTime() - from.getTime());
      duration = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    }

    // Format dates
    const formatDate = (dateStr: string) => {
      if (!dateStr) return '';
      const date = new Date(dateStr);
      return date.toISOString();
    };

    // Parse applied date/time
    const createdAt = (data.createdAt as string) || (data.appliedOn as string) || '';
    let appliedOn = '';
    let appliedTime = '';
    if (createdAt) {
      const date = new Date(createdAt);
      appliedOn = date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
      appliedTime = date.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    }

    return {
      id: resolvedId,
      leaveId: (data.leaveId as string) || (data.id as string) || resolvedId,
      employee: {
        name: (employeeInfo.fullName as string) || (employeeInfo.name as string) || 'N/A',
        code: (employeeInfo.employeeCode as string) || (employeeInfo.code as string) || 'N/A',
        designation: (employeeInfo.designation as string) || 'N/A',
        department: (employeeInfo.department as string) || 'N/A',
        email: (employeeInfo.email as string) || ''
      },
      type: (leaveDetails.leaveType as string) || (data.type as string) || 'N/A',
      duration: duration,
      startDate: formatDate((leaveDetails.fromDate as string) || (data.startDate as string) || ''),
      endDate: formatDate((leaveDetails.toDate as string) || (data.endDate as string) || ''),
      reason: (leaveDetails.reasonForLeave as string) || (leaveDetails.reason as string) || (data.reason as string) || 'N/A',
      appliedOn: appliedOn,
      appliedTime: appliedTime,
      status: ((data.status as string) || 'pending').toString(),
      approvedBy: (approvalInfo.approvedBy as string) || (data.approvedBy as string) || (data.manager_approved_by as string) || undefined,
      rejectedBy: (approvalInfo.rejectedBy as string) || (data.rejectedBy as string) || undefined,
      approvedOn: (approvalInfo.approvedDate as string) || (data.approvedOn as string) || (data.manager_approved_at as string) || (data.approvedAt as string) || undefined,
      rejectedOn: (approvalInfo.rejectedDate as string) || (data.rejectedOn as string) || undefined,
      comments: (approvalInfo.hrComments as string) || (approvalInfo.comments as string) || (data.comments as string) || (data.manager_comments as string) || (data.approvalComments as string) || undefined
    };
  }, []);

  // Fetch leave application using the object_id (id parameter)
  useEffect(() => {
    if (!applicationId) {
      setError('No leave application ID provided in the URL');
      setLoading(false);
      return;
    }

    let mounted = true;

    const fetchApplication = async () => {
      try {
        console.log(`🔍 Fetching leave application with object_id: ${applicationId}`);
        
        // First, try to fetch from the individual endpoint
        // Endpoint: /api/v1/ess-portal/leave-applications/{application_id}
        let response: Response;
        try {
          response = await essApiFetch(ESS_PORTAL_ENDPOINTS.LEAVE.GET(applicationId), {
            method: 'GET'
          });
        } catch (fetchError) {
          console.warn(`⚠️ Direct fetch failed, trying list endpoint as fallback:`, fetchError);
          response = null as unknown as Response;
        }

        // If direct fetch failed with 403 or 404, try fetching from list and filtering
        if (!response || !response.ok) {
          const status = response?.status || 0;
          console.log(`⚠️ Direct endpoint returned ${status}, trying list endpoint as fallback...`);
          
          // Fallback: Fetch from list endpoint and filter by ID
          try {
            const listResponse = await essApiFetch(ESS_PORTAL_ENDPOINTS.LEAVE.LIST(), {
              method: 'GET'
            });

            if (listResponse.ok) {
              const listResult = await listResponse.json();
              console.log(`✅ List endpoint response:`, listResult);
              
              // Find the application in the list by ID
              const applications = listResult.data || listResult || [];
              const foundApplication = Array.isArray(applications) 
                ? applications.find((app: { id?: string; leaveId?: string }) => app.id === applicationId || app.leaveId === applicationId)
                : null;

              if (foundApplication && mounted) {
                console.log(`✅ Found application in list:`, foundApplication);
                const mapped = mapBackendToView(foundApplication, applicationId);
                setLeaveApplication(mapped);
                setActiveLeaveId(applicationId);
                setError(null);
                setLoading(false);
                return;
              } else {
                console.warn(`⚠️ Application not found in list`);
              }
            }
          } catch (listError) {
            console.error(`❌ List endpoint also failed:`, listError);
          }

          // If both methods failed, show error
          let errorMessage = `HTTP ${status}: ${response?.statusText || 'Unknown error'}`;
          if (response) {
            try {
              const errorData = await response.json();
              errorMessage = errorData.detail || errorData.message || errorMessage;
            } catch {
              // If JSON parsing fails, use status text
              errorMessage = response.statusText || errorMessage;
            }
          }

          if (mounted) {
            setError(errorMessage || 'Leave application not found');
            setLoading(false);
          }
          return;
        }

        // Successfully fetched from direct endpoint
        const result = await response.json();
        console.log(`✅ API Response:`, result);
        
        // Handle different response structures
        // The backend may return: { data: {...} } or directly the object
        let data = null;
        if (result.success && result.data) {
          data = result.data;
        } else if (result.data) {
          data = result.data;
        } else if (result.id || result.leaveId || result.employeeInfo) {
          // Direct data object (the leave application itself)
          data = result;
        }

        if (data && mounted) {
          console.log(`✅ Successfully loaded leave application data:`, data);
          const mapped = mapBackendToView(data, applicationId);
          setLeaveApplication(mapped);
          setActiveLeaveId(applicationId);
          setError(null);
          setLoading(false);
        } else {
          console.warn(`⚠️ No valid data found in response`);
          if (mounted) {
            setError('Invalid response structure from server');
            setLoading(false);
          }
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error occurred';
        console.error(`❌ Error fetching leave application:`, err);
        
        // Last resort: Try fetching from list
        if (mounted) {
          try {
            console.log(`🔄 Attempting fallback to list endpoint...`);
            const listResponse = await essApiFetch(ESS_PORTAL_ENDPOINTS.LEAVE.LIST(), {
              method: 'GET'
            });

            if (listResponse.ok) {
              const listResult = await listResponse.json();
              const applications = listResult.data || listResult || [];
              const foundApplication = Array.isArray(applications) 
                ? applications.find((app: { id?: string; leaveId?: string }) => app.id === applicationId || app.leaveId === applicationId)
                : null;

              if (foundApplication && mounted) {
                console.log(`✅ Found application via fallback:`, foundApplication);
                const mapped = mapBackendToView(foundApplication, applicationId);
                setLeaveApplication(mapped);
                setActiveLeaveId(applicationId);
                setError(null);
                setLoading(false);
                return;
              }
            }
          } catch (fallbackError) {
            console.error(`❌ Fallback also failed:`, fallbackError);
          }
          
          setError(errorMsg);
          setLoading(false);
        }
      }
    };

    fetchApplication();

    return () => {
      mounted = false;
    };
  }, [applicationId, mapBackendToView]);

  // Poll for status updates
  useEffect(() => {
    if (!activeLeaveId) return;

    let mounted = true;
    const interval = setInterval(async () => {
      if (!mounted) return;

      try {
        const response = await essApiFetch(ESS_PORTAL_ENDPOINTS.LEAVE.GET(activeLeaveId), {
          method: 'GET'
        });

        if (!response.ok) return;

        const result = await response.json();
        const data = result.data || result;

        if (data && mounted) {
          const mapped = mapBackendToView(data, activeLeaveId);
          setLeaveApplication(prev => {
            if (prev && prev.status !== mapped.status) {
              return mapped;
            }
            return prev;
          });
        }
      } catch (err) {
        console.warn('Error polling leave application status:', err);
      }
    }, 5000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [activeLeaveId, mapBackendToView]);

  // Close download menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (downloadMenuRef.current && !downloadMenuRef.current.contains(event.target as Node)) {
        setDownloadMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);


  // Format date to long format
  const formatDate = (dateString: string): string => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return 'Invalid Date';
    }
  };

  // Format short date
  const formatShortDate = (dateString: string): string => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return 'Invalid Date';
    }
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    const normalizedStatus = status.toLowerCase();
    
    if (normalizedStatus === 'pending') {
      return (
        <span className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
          <Clock className="w-4 h-4 mr-2" />
          PENDING
        </span>
      );
    } else if (normalizedStatus.includes('approved')) {
      return (
        <span className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
          <CheckCircle className="w-4 h-4 mr-2" />
          {normalizedStatus.includes('hr') ? 'HR APPROVED' : normalizedStatus.includes('manager') ? 'MANAGER APPROVED' : 'APPROVED'}
        </span>
      );
    } else if (normalizedStatus.includes('rejected')) {
      return (
        <span className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
          <XCircle className="w-4 h-4 mr-2" />
          {normalizedStatus.includes('hr') ? 'HR REJECTED' : normalizedStatus.includes('manager') ? 'MANAGER REJECTED' : 'REJECTED'}
        </span>
      );
    }
    
    return (
      <span className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300">
        {status.toUpperCase()}
      </span>
    );
  };

  // Get type badge
  const getTypeBadge = (type: string) => {
    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
        {type}
      </span>
    );
  };

  // Download PDF
  const handleDownloadPDF = () => {
    if (!leaveApplication) return;

    const doc = new jsPDF();
    
    // Title
    doc.setFontSize(20);
    doc.text('Leave Application Details', 20, 30);
    
    // Leave ID
    doc.setFontSize(14);
    doc.text(`Leave ID: ${leaveApplication.leaveId}`, 20, 50);
    
    // Employee Information
    doc.setFontSize(14);
    doc.text('Employee Information:', 20, 70);
    doc.setFontSize(12);
    doc.text(`Employee Code: ${leaveApplication.employee.code}`, 20, 85);
    doc.text(`Full Name: ${leaveApplication.employee.name}`, 20, 95);
    doc.text(`Designation: ${leaveApplication.employee.designation}`, 20, 105);
    doc.text(`Department: ${leaveApplication.employee.department}`, 20, 115);
    
    // Leave Details
    doc.setFontSize(14);
    doc.text('Leave Details:', 20, 135);
    doc.setFontSize(12);
    doc.text(`Leave Type: ${leaveApplication.type}`, 20, 150);
    doc.text(`From Date: ${formatDate(leaveApplication.startDate)}`, 20, 160);
    doc.text(`To Date: ${formatDate(leaveApplication.endDate)}`, 20, 170);
    doc.text(`Duration: ${leaveApplication.duration} days`, 20, 180);
    doc.text(`Applied On: ${leaveApplication.appliedOn}`, 20, 190);
    doc.text(`Status: ${leaveApplication.status}`, 20, 200);
    
    // Reason
    doc.setFontSize(14);
    doc.text('Reason for Leave:', 20, 220);
    doc.setFontSize(12);
    const reasonLines = doc.splitTextToSize(leaveApplication.reason, 170);
    doc.text(reasonLines, 20, 235);
    
    // Generate filename
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
    const filename = `${leaveApplication.leaveId}:${dateStr}:${timeStr}.pdf`;
    
    doc.save(filename);
    setDownloadMenuOpen(false);
  };

  // Download CSV
  const handleDownloadCSV = () => {
    if (!leaveApplication) return;

    const csvRows = [
      ['Field', 'Value'],
      ['Leave ID', leaveApplication.leaveId],
      ['Employee Code', leaveApplication.employee.code],
      ['Full Name', leaveApplication.employee.name],
      ['Designation', leaveApplication.employee.designation],
      ['Department', leaveApplication.employee.department],
      ['Leave Type', leaveApplication.type],
      ['From Date', formatDate(leaveApplication.startDate)],
      ['To Date', formatDate(leaveApplication.endDate)],
      ['Duration', `${leaveApplication.duration} days`],
      ['Applied On', leaveApplication.appliedOn],
      ['Status', leaveApplication.status],
      ['Reason for Leave', leaveApplication.reason]
    ];

    const csvContent = csvRows.map(row => 
      row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
    const filename = `${leaveApplication.leaveId}:${dateStr}:${timeStr}.csv`;
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setDownloadMenuOpen(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3366CC] dark:border-[#4a7dd9] mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-300">Loading leave application details...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show error banner if there's an error but still render the page structure
  const showErrorBanner = error && !leaveApplication;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Banner */}
        {showErrorBanner && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
            <div className="flex items-start">
              <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 mr-3 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-red-800 dark:text-red-300 mb-1">
                  Unable to Load Leave Application
                </h3>
                <p className="text-sm text-red-700 dark:text-red-400 mb-3">
                  {error}
                  {applicationId && !error.includes(applicationId) && (
                    <span className="block mt-1">Leave application not found (ID: {applicationId})</span>
                  )}
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => router.push('/ess-portal/leave')}
                    className="inline-flex items-center px-3 py-1.5 text-sm bg-red-600 hover:bg-red-700 text-white rounded-md transition-all duration-200"
                  >
                    <ArrowLeft className="w-4 h-4 mr-1.5" />
                    Back to Leave Management
                  </button>
                  <button
                    onClick={() => window.location.reload()}
                    className="inline-flex items-center px-3 py-1.5 text-sm bg-white hover:bg-gray-50 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white border border-red-200 dark:border-red-800 rounded-md transition-all duration-200"
                  >
                    Retry
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <DashboardHeader
          title="Leave Application Details"
          subtitle={leaveApplication ? `Leave ID: ${leaveApplication.leaveId}` : `Application ID: ${applicationId || 'N/A'}`}
          icon={Calendar}
          variant="default"
          size="md"
          breadcrumbs={[
            { label: 'Home', href: '/' },
            { label: 'Leave Management', href: '/ess-portal/leave' },
            { label: 'View Application' }
          ]}
          actions={
            <div className="flex items-center gap-3">
              {/* Status Badge */}
              {leaveApplication && getStatusBadge(leaveApplication.status)}
              
              {/* Download Menu */}
              <div className="relative" ref={downloadMenuRef}>
                <button
                  onClick={() => setDownloadMenuOpen(!downloadMenuOpen)}
                  className="inline-flex items-center px-4 py-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-lg transition-all duration-200"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                  <ChevronDown className="w-4 h-4 ml-2" />
                </button>
                {downloadMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10">
                    <button
                      onClick={handleDownloadPDF}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Download as PDF
                    </button>
                    <button
                      onClick={handleDownloadCSV}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Download as CSV
                    </button>
                  </div>
                )}
              </div>
              
              {/* Back Button */}
              <button
                onClick={() => router.push('/ess-portal/leave')}
                className="inline-flex items-center px-4 py-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-lg transition-all duration-200"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </button>
            </div>
          }
        />

        {/* Main Content */}
        {leaveApplication ? (
          <div className="mt-8 space-y-6">
            {/* Top Row: Employee Info, Leave Details, Leave Balance */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Employee Information Card */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center mb-4">
                  <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 mr-3">
                    <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Employee Information</h3>
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Employee Code</p>
                    <p className="text-base font-medium text-gray-900 dark:text-white">{leaveApplication.employee.code}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Full Name</p>
                    <p className="text-base font-medium text-gray-900 dark:text-white">{leaveApplication.employee.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Designation</p>
                    <p className="text-base font-medium text-gray-900 dark:text-white">{leaveApplication.employee.designation}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Department</p>
                    <p className="text-base font-medium text-gray-900 dark:text-white">{leaveApplication.employee.department}</p>
                  </div>
                </div>
              </div>

              {/* Leave Details Card */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center mb-4">
                  <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 mr-3">
                    <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Leave Details</h3>
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Leave Type</p>
                    <div className="mt-1">{getTypeBadge(leaveApplication.type)}</div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">From Date</p>
                    <p className="text-base font-medium text-gray-900 dark:text-white">{formatDate(leaveApplication.startDate)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">To Date</p>
                    <p className="text-base font-medium text-gray-900 dark:text-white">{formatDate(leaveApplication.endDate)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Duration</p>
                    <div className="flex items-center mt-1">
                      <Clock className="w-4 h-4 text-gray-400 mr-2" />
                      <p className="text-base font-medium text-gray-900 dark:text-white">{leaveApplication.duration} days</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Applied On</p>
                    <p className="text-base font-medium text-gray-900 dark:text-white">{leaveApplication.appliedOn}</p>
                  </div>
                </div>
              </div>

              {/* Leave Balance Card */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center mb-4">
                  <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 mr-3">
                    <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Leave Balance</h3>
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Annual Leave</p>
                    <p className="text-base font-medium text-blue-600 dark:text-blue-400">{leaveBalance.annual} days</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Sick Leave</p>
                    <p className="text-base font-medium text-red-600 dark:text-red-400">{leaveBalance.sick} days</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Casual Leave</p>
                    <p className="text-base font-medium text-green-600 dark:text-green-400">{leaveBalance.casual} days</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Reason for Leave Card */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center mb-4">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 mr-3">
                  <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Reason for Leave</h3>
              </div>
              <p className="text-base text-gray-700 dark:text-gray-300 leading-relaxed">{leaveApplication.reason}</p>
            </div>

            {/* Application Timeline Card */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center mb-4">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 mr-3">
                  <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Application Timeline</h3>
              </div>
              <div className="space-y-3">
                <div className="flex items-start">
                  <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 mr-3">
                    <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Application Submitted</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {leaveApplication.appliedOn} {leaveApplication.appliedTime && `at ${leaveApplication.appliedTime}`}
                    </p>
                  </div>
                </div>
                {leaveApplication.approvedOn && (
                  <div className="flex items-start">
                    <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30 mr-3">
                      <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">Approved</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {formatShortDate(leaveApplication.approvedOn)}
                        {leaveApplication.approvedBy && ` by ${leaveApplication.approvedBy}`}
                      </p>
                    </div>
                  </div>
                )}
                {leaveApplication.rejectedOn && (
                  <div className="flex items-start">
                    <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30 mr-3">
                      <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">Rejected</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {formatShortDate(leaveApplication.rejectedOn)}
                        {leaveApplication.rejectedBy && ` by ${leaveApplication.rejectedBy}`}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-8">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
              <p className="text-gray-500 dark:text-gray-400">No leave application data available</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LeaveViewPage;

