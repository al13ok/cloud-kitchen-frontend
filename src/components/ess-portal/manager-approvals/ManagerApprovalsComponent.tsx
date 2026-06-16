'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
// Card components removed as they're not used
import DashboardHeader from '@/components/header/DashboardHeader';
import Button from '@/components/ui/button/Button';
import { getAuthHeaders } from '@/utils/api';
import { toast } from 'react-hot-toast';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  FileText, 
  DollarSign, 
  Package,
  Search,
  Calendar,
  User,
  Building,
  Eye,
  Trash2,
  RefreshCw,
  AlertTriangle,
  Filter,
  Users
} from 'lucide-react';

// Tab type
type TabType = 'leave' | 'expense';

// Types
interface ManagerApplication {
  id: string;
  type: 'leave' | 'expense' | 'asset' | 'payslip';
  employee_id: string;
  employee_name: string;
  department: string;
  title: string;
  description: string;
  amount?: number;
  start_date?: string;
  end_date?: string;
  created_at: string;
  priority: string;
  status?: 'pending' | 'manager_approved' | 'manager_rejected' | 'hr_approved' | 'hr_rejected' | 'it_approved' | 'it_rejected' | 'finance_approved' | 'finance_rejected';
  // Additional fields for different types
  expenseId?: string;
  requestId?: string;
  payslipId?: string;
  assetType?: string;
  assetName?: string;
  quantity?: number;
  justification?: string;
  expectedDate?: string;
  rejectedDate?: string;
  // Leave-specific fields
  insufficientBalance?: boolean;
  balanceWarning?: string;
  requestedDays?: number;
  availableDays?: number;
}

interface ManagerApprovalRequest {
  manager_id: string;
  manager_name: string;
  comments?: string;
  rejection_reason?: string;
  deletion_reason?: string;
}

interface DashboardStats {
  pending_applications: {
    total: number;
    leave: number;
    expense: number;
  };
}

interface KPI {
  id: number;
  icon: React.ElementType;
  title: string;
  value: number | string;
  color: string;
}

// Filter state type
type FilterState = {
  search: string;
  status: 'all' | 'pending' | 'approved' | 'rejected';
  type: 'all' | 'leave' | 'expense' | 'asset';
  department: 'all' | string;
  priority: 'all' | 'critical' | 'urgent' | 'high' | 'normal';
};

import { ESS_PORTAL_ENDPOINTS } from '@/utils/essApi';

// Utility Components
const StatusTag: React.FC<{ status: string }> = ({ status }) => {
  let bgColor = 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300';
  let label = status.charAt(0).toUpperCase() + status.slice(1);

  switch (status) {
    case 'critical': bgColor = 'bg-red-600 dark:bg-red-800 text-white font-medium'; label = '🔥 Critical'; break;
    case 'urgent': bgColor = 'bg-red-500 dark:bg-red-700 text-white font-medium'; label = '⚡ Urgent'; break;
    case 'high': bgColor = 'bg-orange-500 dark:bg-orange-700 text-white font-medium'; label = '🔶 High'; break;
    case 'normal': bgColor = 'bg-[#3366CC] dark:bg-[#4a7dd9] text-white font-medium'; label = '📋 Normal'; break;
    case 'low': bgColor = 'bg-[#3366CC]/80 dark:bg-[#4a7dd9]/80 text-white font-medium'; label = '📘 Low'; break;
    case 'pending': bgColor = 'bg-[#3366CC]/10 dark:bg-[#3366CC]/20 text-[#3366CC] dark:text-[#4a7dd9] font-medium'; label = '⏳ Pending'; break;
    case 'manager_approved': bgColor = 'bg-[#3366CC]/10 dark:bg-[#3366CC]/20 text-[#3366CC] dark:text-[#4a7dd9] font-medium'; label = '✅ Approved'; break;
    case 'manager_rejected': bgColor = 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 font-medium'; label = '❌ Rejected'; break;
    case 'hr_approved': bgColor = 'bg-[#3366CC]/10 dark:bg-[#3366CC]/20 text-[#3366CC] dark:text-[#4a7dd9] font-medium'; label = '👥 HR Approved'; break;
    case 'hr_rejected': bgColor = 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 font-medium'; label = '👥 HR Rejected'; break;
    case 'it_approved': bgColor = 'bg-[#3366CC]/10 dark:bg-[#3366CC]/20 text-[#3366CC] dark:text-[#4a7dd9] font-medium'; label = '💻 IT Approved'; break;
    case 'it_rejected': bgColor = 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 font-medium'; label = '💻 IT Rejected'; break;
    case 'finance_approved': bgColor = 'bg-[#3366CC]/10 dark:bg-[#3366CC]/20 text-[#3366CC] dark:text-[#4a7dd9] font-medium'; label = '💰 Finance Approved'; break;
    case 'finance_rejected': bgColor = 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 font-medium'; label = '💰 Finance Rejected'; break;
    case 'approved': bgColor = 'bg-[#3366CC]/10 dark:bg-[#3366CC]/20 text-[#3366CC] dark:text-[#4a7dd9] font-medium'; label = '✅ Approved'; break;
    case 'rejected': bgColor = 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 font-medium'; label = '❌ Rejected'; break;
    case 'Approved': bgColor = 'bg-[#3366CC]/10 dark:bg-[#3366CC]/20 text-[#3366CC] dark:text-[#4a7dd9] font-medium'; label = '✅ Approved'; break;
    case 'Rejected': bgColor = 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 font-medium'; label = '❌ Rejected'; break;
    case 'Pending': bgColor = 'bg-[#3366CC]/10 dark:bg-[#3366CC]/20 text-[#3366CC] dark:text-[#4a7dd9] font-medium'; label = '⏳ Pending'; break;
  }

  return (
    <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${bgColor}`}>
      {label}
    </span>
  );
};

const TypeIcon: React.FC<{ type: string }> = ({ type }) => {
  const iconColor = 'text-[#3366CC] dark:text-[#4a7dd9]';
  switch (type) {
    case 'leave': return <Calendar className={`h-4 w-4 ${iconColor}`} />;
    case 'expense': return <DollarSign className={`h-4 w-4 ${iconColor}`} />;
    case 'asset': return <Package className={`h-4 w-4 ${iconColor}`} />;
    case 'payslip': return <FileText className={`h-4 w-4 ${iconColor}`} />;
    default: return <FileText className={`h-4 w-4 ${iconColor}`} />;
  }
};

// Main Component
const ManagerApprovalsComponent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('leave');
  const [applications, setApplications] = useState<ManagerApplication[]>([]);
  const [, setStats] = useState<DashboardStats>({
    pending_applications: {
      total: 0,
      leave: 0,
      expense: 0
    }
  });
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedApplication, setSelectedApplication] = useState<ManagerApplication | null>(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showCommentModal, setShowCommentModal] = useState<{id: string; action: 'approve' | 'reject' | 'delete'} | null>(null);
  const [actionComment, setActionComment] = useState('');
  const [approvalData, setApprovalData] = useState<ManagerApprovalRequest>({
    manager_id: 'MGR001',
    manager_name: 'Current Manager',
    comments: '',
    rejection_reason: '',
    deletion_reason: ''
  });

  // Filters state
  const [filters, setFilters] = useState<FilterState>({ 
    search: '', 
    status: 'all', 
    type: 'all', 
    department: 'all', 
    priority: 'all' 
  });

  // Tabs configuration
  const tabs = [
    { id: 'leave' as TabType, label: 'Leave Applications', icon: Calendar },
    { id: 'expense' as TabType, label: 'Expense Applications', icon: DollarSign },
  ];

  // Mapping functions for each application type - wrapped in useCallback to prevent recreation
  // Defined before fetchPendingApplications to avoid "used before declaration" error

  const mapExpenseToApplication = useCallback((item: Record<string, unknown>): ManagerApplication => {
    // Map backend status to frontend status
    let mappedStatus = 'pending';
    if (item.status) {
      const originalStatus = String(item.status);
      const statusLower = originalStatus.toLowerCase();
      
      // Handle all possible status values from backend
      if (statusLower === 'pending' || originalStatus === 'Pending') {
        mappedStatus = 'pending';
      } else if (statusLower.includes('manager_approved') || originalStatus === 'Manager_Approved' || originalStatus === 'Approved') {
        mappedStatus = 'manager_approved';
      } else if (statusLower.includes('manager_rejected') || originalStatus === 'Manager_Rejected' || originalStatus === 'Rejected') {
        mappedStatus = 'manager_rejected';
      } else if (statusLower.includes('manager_viewed') || originalStatus === 'Manager_Viewed') {
        mappedStatus = 'pending'; // Treat viewed as still pending for manager
      } else if (statusLower.includes('department_pending') || originalStatus === 'Department_Pending') {
        mappedStatus = 'manager_approved'; // Manager approved, now with department
      } else if (statusLower.includes('finance_approved') || originalStatus === 'Finance_Approved') {
        mappedStatus = 'finance_approved';
      } else if (statusLower.includes('finance_rejected') || originalStatus === 'Finance_Rejected') {
        mappedStatus = 'finance_rejected';
      } else if (statusLower.includes('approved')) {
        mappedStatus = 'manager_approved'; // Generic approved
      } else if (statusLower.includes('rejected')) {
        mappedStatus = 'manager_rejected'; // Generic rejected
      } else {
        mappedStatus = statusLower; // Keep other statuses as-is
      }
    }

    return {
      id: String(item.id || ''),
      type: 'expense',
      employee_id: String((item.employeeInfo as Record<string, unknown>)?.employeeCode || ''),
      employee_name: String((item.employeeInfo as Record<string, unknown>)?.fullName || 'Unknown'),
      department: String((item.employeeInfo as Record<string, unknown>)?.department || 'Unknown'),
      title: String((item.expenseDetails as Record<string, unknown>)?.title || 'Expense Claim'),
      description: String((item.expenseDetails as Record<string, unknown>)?.description || ''),
      amount: Number((item.expenseDetails as Record<string, unknown>)?.amount || 0),
      start_date: String((item.expenseDetails as Record<string, unknown>)?.date || ''),
      end_date: String((item.expenseDetails as Record<string, unknown>)?.date || ''),
      created_at: String(item.createdAt || new Date().toISOString()),
      priority: 'normal',
      status: mappedStatus as 'pending' | 'manager_approved' | 'manager_rejected' | 'hr_approved' | 'hr_rejected' | 'it_approved' | 'it_rejected' | 'finance_approved' | 'finance_rejected',
      expenseId: String(item.expenseId || '')
    };
  }, []);

  const mapLeaveToApplication = useCallback((item: Record<string, unknown>): ManagerApplication => {
    // Map backend status to frontend status
    let mappedStatus = 'pending';
    if (item.status) {
      const originalStatus = String(item.status);
      const statusLower = originalStatus.toLowerCase();
      
      // Handle all possible status values from backend
      if (statusLower === 'pending' || originalStatus === 'Pending') {
        mappedStatus = 'pending';
      } else if (statusLower.includes('manager_approved') || originalStatus === 'Manager_Approved' || originalStatus === 'Approved') {
        mappedStatus = 'manager_approved';
      } else if (statusLower.includes('manager_rejected') || originalStatus === 'Manager_Rejected' || originalStatus === 'Rejected') {
        mappedStatus = 'manager_rejected';
      } else if (statusLower.includes('manager_viewed') || originalStatus === 'Manager_Viewed') {
        mappedStatus = 'pending'; // Treat viewed as still pending for manager
      } else if (statusLower.includes('department_pending') || originalStatus === 'Department_Pending') {
        mappedStatus = 'manager_approved'; // Manager approved, now with department
      } else if (statusLower.includes('hr_approved') || statusLower.includes('it_approved') || statusLower.includes('finance_approved')) {
        mappedStatus = statusLower; // Keep department-approved statuses
      } else if (statusLower.includes('hr_rejected') || statusLower.includes('it_rejected') || statusLower.includes('finance_rejected')) {
        mappedStatus = statusLower; // Keep department-rejected statuses
      } else if (statusLower.includes('approved')) {
        mappedStatus = 'manager_approved'; // Generic approved
      } else if (statusLower.includes('rejected')) {
        mappedStatus = 'manager_rejected'; // Generic rejected
      } else {
        mappedStatus = statusLower; // Keep other statuses as-is
      }
    }

    const mappedApplication = {
      id: String(item.id || ''),
      type: 'leave' as const,
      employee_id: String((item.employeeInfo as Record<string, unknown>)?.employeeCode || ''),
      employee_name: String((item.employeeInfo as Record<string, unknown>)?.fullName || 'Unknown'),
      department: String((item.employeeInfo as Record<string, unknown>)?.department || 'Unknown'),
      title: `${String((item.leaveDetails as Record<string, unknown>)?.leaveType || '')} - ${String((item.employeeInfo as Record<string, unknown>)?.fullName || '')}`,
      description: String((item.leaveDetails as Record<string, unknown>)?.reasonForLeave || ''),
      amount: undefined,
      start_date: String((item.leaveDetails as Record<string, unknown>)?.fromDate || ''),
      end_date: String((item.leaveDetails as Record<string, unknown>)?.toDate || ''),
      created_at: String(item.createdAt || new Date().toISOString()),
      priority: 'normal',
      status: mappedStatus as 'pending' | 'manager_approved' | 'manager_rejected' | 'hr_approved' | 'hr_rejected' | 'it_approved' | 'it_rejected' | 'finance_approved' | 'finance_rejected',
      // Leave-specific fields
      insufficientBalance: Boolean(item.insufficientBalance),
      balanceWarning: String(item.balanceWarning || ''),
      requestedDays: Number(item.requestedDays || 0),
      availableDays: Number(item.availableDays || 0)
    };
    
    console.log('🔍 Mapped leave application:', mappedApplication);
    console.log('🔍 Application status for display:', mappedApplication.status);
    return mappedApplication;
  }, []);

  // API Functions
  const fetchPendingApplications = useCallback(async () => {
    try {
      setError(null);
      
      // Fetch from ESS portal endpoints (excluding payslips and assets)
      const authHeaders = getAuthHeaders();
      const [expensesResponse, leaveResponse] = await Promise.all([
        fetch(ESS_PORTAL_ENDPOINTS.EXPENSES.LIST(), {
          headers: {
            ...authHeaders,
            'accept': 'application/json'
          }
        }),
        fetch(ESS_PORTAL_ENDPOINTS.LEAVE.LIST(), {
          headers: {
            ...authHeaders,
            'accept': 'application/json'
          }
        })
      ]);

      const allApplications: ManagerApplication[] = [];


      // Process expenses
      if (expensesResponse.ok) {
        const expensesData = await expensesResponse.json();
        console.log('📊 Expenses API response:', expensesData);
        if (expensesData.success && expensesData.data) {
          console.log(`📋 Processing ${expensesData.data.length} expense applications`);
          // Log status distribution
          const statusCounts: Record<string, number> = {};
          expensesData.data.forEach((item: Record<string, unknown>) => {
            const status = String(item.status || 'unknown');
            statusCounts[status] = (statusCounts[status] || 0) + 1;
          });
          console.log('📊 Expense status distribution:', statusCounts);
          
          const expenseApplications = expensesData.data.map((item: Record<string, unknown>) => mapExpenseToApplication(item));
          console.log(`✅ Mapped ${expenseApplications.length} expense applications`);
          allApplications.push(...expenseApplications);
        } else {
          console.warn('⚠️ Expenses response not successful or no data:', expensesData);
        }
      } else {
        console.error('❌ Expenses response not ok:', expensesResponse.status, expensesResponse.statusText);
        const errorText = await expensesResponse.text().catch(() => 'Unable to read error');
        console.error('❌ Expenses error details:', errorText);
      }

      // Process leave applications
      if (leaveResponse.ok) {
        const leaveData = await leaveResponse.json();
        console.log('📊 Leave API response:', leaveData);
        if (leaveData.success && leaveData.data) {
          console.log(`📋 Processing ${leaveData.data.length} leave applications`);
          // Log status distribution
          const statusCounts: Record<string, number> = {};
          leaveData.data.forEach((item: Record<string, unknown>) => {
            const status = String(item.status || 'unknown');
            statusCounts[status] = (statusCounts[status] || 0) + 1;
          });
          console.log('📊 Leave status distribution:', statusCounts);
          
          const leaveApplications = leaveData.data.map((item: Record<string, unknown>) => mapLeaveToApplication(item));
          console.log(`✅ Mapped ${leaveApplications.length} leave applications`);
          allApplications.push(...leaveApplications);
        } else {
          console.warn('⚠️ Leave applications response not successful or no data:', leaveData);
        }
      } else {
        console.error('❌ Leave applications response not ok:', leaveResponse.status, leaveResponse.statusText);
        const errorText = await leaveResponse.text().catch(() => 'Unable to read error');
        console.error('❌ Leave error details:', errorText);
      }


      console.log('📊 All applications fetched:', allApplications);
      console.log('📊 Total applications count:', allApplications.length);
      console.log('📊 Leave applications count:', allApplications.filter(app => app.type === 'leave').length);
      setApplications(allApplications);

    } catch (error) {
      console.error('Error fetching pending applications:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch applications');
      setApplications([]);
    }
  }, [mapExpenseToApplication, mapLeaveToApplication]);



  const fetchDashboardStats = useCallback(async () => {
    try {
      // Calculate stats from the applications data
      // const totalApplications = applications.length;
      const pendingApplications = applications.filter(app => app.status === 'pending').length;
      const leaveApplications = applications.filter(app => app.type === 'leave').length;
      const expenseApplications = applications.filter(app => app.type === 'expense').length;
      setStats({
        pending_applications: {
          total: pendingApplications,
          leave: leaveApplications,
          expense: expenseApplications
        }
      });
    } catch (error) {
      console.error('Error calculating dashboard stats:', error);
      // Use default values
      setStats({
        pending_applications: {
          total: 0,
          leave: 0,
          expense: 0
        }
      });
    }
  }, [applications]);

  const loadData = useCallback(async () => {
    setInitialLoading(true);
    try {
      await fetchPendingApplications();
      // Stats will be calculated after applications are loaded
    } finally {
      setInitialLoading(false);
    }
  }, [fetchPendingApplications]);

  // Calculate stats when applications change
  useEffect(() => {
    if (applications.length > 0) {
      fetchDashboardStats();
    }
  }, [applications, fetchDashboardStats]);

  // Load data on component mount
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Departments list for the select (derived from current applications)
  const departmentOptions = useMemo(() => {
    const set = new Set<string>();
    applications.forEach(a => set.add(a.department || 'Unknown'));
    return Array.from(set).sort();
  }, [applications]);

  // Helper to update filters (keeps JSX cleaner)
  const onFilterChange = <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    setFilters(prev => ({ ...prev, [key]: value } as FilterState));
  };

  // Filter and sort applications (most recent first) - also filter by active tab
  const filteredApplications = useMemo(() => {
    console.log('🔍 Filtering applications. Total:', applications.length);
    console.log('🔍 Current filters:', filters);
    console.log('🔍 Active tab:', activeTab);
    
    // First filter by active tab
    const tabFiltered = applications.filter(app => {
      if (activeTab === 'leave') {
        return app.type === 'leave';
      } else if (activeTab === 'expense') {
        return app.type === 'expense';
      }
      return true;
    });
    
    const q = filters.search.trim().toLowerCase();
    const filtered = tabFiltered.filter(app => {
      // Status filter - handle multiple status variations
      if (filters.status !== 'all') {
        const appStatus = (app.status || 'pending').toLowerCase();
        const filterStatus = filters.status.toLowerCase();
        
        if (filterStatus === 'pending') {
          if (appStatus !== 'pending') return false;
        } else if (filterStatus === 'approved') {
          // Match any approved status: manager_approved, hr_approved, finance_approved, etc.
          if (!appStatus.includes('approved') && appStatus !== 'approved') return false;
        } else if (filterStatus === 'rejected') {
          // Match any rejected status: manager_rejected, hr_rejected, finance_rejected, etc.
          if (!appStatus.includes('rejected') && appStatus !== 'rejected') return false;
        } else {
          // Exact match for other statuses
          if (appStatus !== filterStatus) return false;
        }
      }
      
      // Priority filter
      if (filters.priority !== 'all' && app.priority !== filters.priority) return false;

      // Type filter
      if (filters.type !== 'all' && app.type !== filters.type) return false;

      // Department filter
      if (filters.department !== 'all' && app.department !== filters.department) return false;

      // Search filter across name, title, department
      if (q) {
        const hay = `${app.employee_name} ${app.title} ${app.department}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }

      return true;
    });

    console.log('🔍 Filtered applications count:', filtered.length);
    console.log('🔍 Leave applications after filtering:', filtered.filter(app => app.type === 'leave'));

    // Sort by creation date (most recent first)
    const sorted = filtered.sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return dateB - dateA; // Most recent first
    });
    
    console.log('🔍 Final sorted applications:', sorted);
    return sorted;
  }, [applications, filters, activeTab]);

  // Derived KPIs from the real data
  const kpis: KPI[] = useMemo(() => {
    const totalApplications = applications.length;
    const totalPending = applications.filter(app => app.status === 'pending').length;
    const leaveApplications = applications.filter(app => app.type === 'leave').length;
    const expenseApplications = applications.filter(app => app.type === 'expense').length;
    return [
      { id: 1, icon: Users, title: 'Total Applications', value: totalApplications, color: 'text-[#3366CC] dark:text-[#4a7dd9]' },
      { id: 2, icon: Clock, title: 'Total Pending', value: totalPending, color: 'text-[#3366CC] dark:text-[#4a7dd9]' },
      { id: 3, icon: Calendar, title: 'Leave Requests', value: leaveApplications, color: 'text-[#3366CC] dark:text-[#4a7dd9]' },
      { id: 4, icon: DollarSign, title: 'Expense Claims', value: expenseApplications, color: 'text-[#3366CC] dark:text-[#4a7dd9]' },
    ];
  }, [applications]);

  // TabButton Component
  const TabButton: React.FC<{ tab: TabType; label: string; icon: React.ElementType }> = ({ tab, label, icon: Icon }) => {
    const isActive = activeTab === tab;
    return (
      <button
        onClick={() => setActiveTab(tab)}
        className={`flex items-center px-6 py-3 text-sm font-medium rounded-t-xl transition-all duration-300 relative
          ${isActive 
            ? 'bg-[#3366CC]/10 dark:bg-[#3366CC]/20 text-[#3366CC] dark:text-[#4a7dd9] shadow-lg border-b-2 border-[#3366CC] dark:border-[#4a7dd9] transform -translate-y-1' 
            : 'text-gray-600 dark:text-gray-400 hover:text-[#3366CC] dark:hover:text-[#4a7dd9] hover:bg-[#3366CC]/5 dark:hover:bg-[#3366CC]/10 hover:transform hover:-translate-y-0.5'}`
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

  // KPI Card Component
  const KPICard: React.FC<{ kpi: KPI }> = ({ kpi }) => {
    const { icon: Icon, title, value } = kpi;
    
    return (
      <div className="relative bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 hover:scale-105 cursor-pointer group h-full overflow-hidden border border-gray-200 dark:border-gray-700">
        <div className="absolute inset-0 bg-[#3366CC]/5 dark:bg-[#3366CC]/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        <div className="absolute top-0 right-0 w-20 h-20 bg-[#3366CC]/10 dark:bg-[#3366CC]/20 rounded-full -translate-y-10 translate-x-10 opacity-0 group-hover:opacity-70 transition-opacity duration-500"></div>
        
        <div className="relative z-10 flex flex-col h-full">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-2xl shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110" style={{ backgroundColor: '#3366CC' }}>
              <Icon className="w-6 h-6 text-white" />
            </div>
          </div>
          
          <div className="mb-4">
            <p className="text-3xl font-bold text-gray-900 dark:text-white group-hover:text-[#3366CC] dark:group-hover:text-[#4a7dd9] transition-colors duration-300">
              {value}
            </p>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors duration-300 mt-1">
              {title}
            </p>
          </div>
          
          <div className="mt-auto">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500 dark:text-gray-400">Progress</span>
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                {(() => {
                  const totalApplications = applications.length;
                  if (totalApplications === 0) return '0%';
                  
                  switch (kpi.id) {
                    case 1: return '100%'; // Total Applications
                    case 2: return Math.round((Number(value) / totalApplications) * 100) + '%'; // Total Pending
                    case 3: return Math.round((Number(value) / totalApplications) * 100) + '%'; // Leave Requests
                    case 4: return Math.round((Number(value) / totalApplications) * 100) + '%'; // Expense Claims
                    default: return '0%';
                  }
                })()}
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
              <div className="h-2 rounded-full transition-all duration-1000 ease-out group-hover:animate-pulse" style={{ 
                backgroundColor: '#3366CC',
                width: (() => {
                  const totalApplications = applications.length;
                  if (totalApplications === 0) return '0%';
                  
                  switch (kpi.id) {
                    case 1: return '100%'; // Total Applications
                    case 2: return `${(Number(value) / totalApplications) * 100}%`; // Total Pending
                    case 3: return `${(Number(value) / totalApplications) * 100}%`; // Leave Requests
                    case 4: return `${(Number(value) / totalApplications) * 100}%`; // Expense Claims
                    default: return '0%';
                  }
                })()
              }}></div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Handle action with loading state
  const handleAction = async (id: string, action: 'approve' | 'reject' | 'delete' | 'view', comments?: string) => {
    if (action === 'view') {
      console.log(`Viewing application ${id}`);
      return;
    }

    try {
      setActionLoading(id);
      
      if (action === 'approve') {
        await submitApprovalAction(id, comments || '');
      } else if (action === 'reject') {
        await submitRejectionAction(id, comments || '');
      } else if (action === 'delete') {
        await submitDeleteAction(id, comments || '');
      }
      
      // Refresh data after action
      await fetchPendingApplications();
      
      return { success: true };
    } catch (err) {
      console.error(`Error ${action}ing application:`, err);
      return { 
        success: false, 
        error: err instanceof Error ? err.message : `Failed to ${action} application` 
      };
    } finally {
      setActionLoading(null);
    }
  };

  // Show comment modal for approve/reject/delete
  const handleActionWithComment = (id: string, action: 'approve' | 'reject' | 'delete') => {
    setShowCommentModal({ id, action });
    setActionComment('');
  };

  // Submit action with comment
  const submitActionWithComment = async () => {
    if (showCommentModal) {
      const result = await handleAction(showCommentModal.id, showCommentModal.action, actionComment);
      
      if (result && result.success) {
        console.log(`Application ${showCommentModal.id} ${showCommentModal.action}ed successfully`);
        setShowCommentModal(null);
        setActionComment('');
      } else {
        console.error(`Failed to ${showCommentModal.action} application:`, result?.error);
        toast.error(`Failed to ${showCommentModal.action} application: ${result?.error || 'Unknown error'}`);
      }
    }
  };


  // Individual action functions
  const submitApprovalAction = async (id: string, comments: string) => {
    const application = applications.find(app => app.id === id);
    if (!application) throw new Error('Application not found');

    let endpoint = '';
    let requestBody: Record<string, unknown> = {};
    let method = 'PUT';

    if (application.type === 'payslip') {
      endpoint = ESS_PORTAL_ENDPOINTS.PAYSLIPS.GET(id);
      requestBody = {
        status: 'Approved',
        comments: comments
      };
    } else if (application.type === 'expense') {
      endpoint = ESS_PORTAL_ENDPOINTS.EXPENSES.GET(id);
      requestBody = {
        status: 'Manager_Approved',
        comments: comments
      };
    } else if (application.type === 'leave') {
      endpoint = ESS_PORTAL_ENDPOINTS.LEAVE.APPROVE(id);
      requestBody = {
        manager_name: 'Manager',
        comments: comments
      };
      method = 'POST';
    } else if (application.type === 'asset') {
      endpoint = ESS_PORTAL_ENDPOINTS.ASSETS.GET(id);
      requestBody = {
        status: 'Approved',
        comments: comments
      };
    }

    const response = await fetch(endpoint, {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Approval failed: ${errorText}`);
    }

    return await response.json();
  };

  const submitRejectionAction = async (id: string, reason: string) => {
    const application = applications.find(app => app.id === id);
    if (!application) throw new Error('Application not found');

    let endpoint = '';
    let requestBody: Record<string, unknown> = {};
    let method = 'PUT';

    if (application.type === 'payslip') {
      endpoint = ESS_PORTAL_ENDPOINTS.PAYSLIPS.GET(id);
      requestBody = {
        status: 'Rejected'
      };
    } else if (application.type === 'expense') {
      endpoint = ESS_PORTAL_ENDPOINTS.EXPENSES.GET(id);
      requestBody = {
        status: 'Manager_Rejected'
      };
    } else if (application.type === 'leave') {
      endpoint = ESS_PORTAL_ENDPOINTS.LEAVE.REJECT(id);
      requestBody = {
        manager_name: 'Manager',
        comments: reason
      };
      method = 'POST';
    } else if (application.type === 'asset') {
      endpoint = ESS_PORTAL_ENDPOINTS.ASSETS.GET(id);
      requestBody = {
        status: 'Rejected',
        rejectionReason: reason
      };
    }

    const response = await fetch(endpoint, {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Rejection failed: ${errorText}`);
    }

    return await response.json();
  };

  const submitDeleteAction = async (id: string, reason: string) => {
    const application = applications.find(app => app.id === id);
    if (!application) throw new Error('Application not found');

    let endpoint = '';
    if (application.type === 'payslip') {
      endpoint = ESS_PORTAL_ENDPOINTS.PAYSLIPS.GET(id);
    } else if (application.type === 'expense') {
      endpoint = ESS_PORTAL_ENDPOINTS.EXPENSES.GET(id);
    } else if (application.type === 'leave') {
      endpoint = ESS_PORTAL_ENDPOINTS.LEAVE.GET(id);
    } else if (application.type === 'asset') {
      endpoint = ESS_PORTAL_ENDPOINTS.ASSETS.GET(id);
    }

    const response = await fetch(endpoint, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        reason: reason
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Delete failed: ${errorText}`);
    }

    return await response.json();
  };

  // Submit approval
  const submitApproval = async () => {
    if (!selectedApplication) return;
    
    setLoading(true);
    try {
      // API call to approve application - using ESS portal endpoints
      let endpoint = '';
      if (selectedApplication.type === 'expense') {
        endpoint = ESS_PORTAL_ENDPOINTS.EXPENSES.APPROVE(selectedApplication.id);
      } else if (selectedApplication.type === 'leave') {
        endpoint = ESS_PORTAL_ENDPOINTS.LEAVE.APPROVE(selectedApplication.id);
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(approvalData),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Approval successful:', result);
        setShowApprovalModal(false);
        setSelectedApplication(null);
        
        // Refresh data from server
        await loadData();
        toast.success('Application approved successfully!');
      } else {
        const errorText = await response.text();
        console.error('Approval failed:', errorText);
        toast.error(`Approval failed: ${errorText}`);
      }
    } catch (error) {
      console.error('Error approving application:', error);
      toast.error('Error approving application. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Submit rejection
  const submitRejection = async () => {
    if (!selectedApplication || !approvalData.rejection_reason) return;
    
    setLoading(true);
    try {
      // API call to reject application - using ESS portal endpoints
      let endpoint = '';
      if (selectedApplication.type === 'expense') {
        endpoint = ESS_PORTAL_ENDPOINTS.EXPENSES.REJECT(selectedApplication.id);
      } else if (selectedApplication.type === 'leave') {
        endpoint = ESS_PORTAL_ENDPOINTS.LEAVE.REJECT(selectedApplication.id);
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(approvalData),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Rejection successful:', result);
        setShowRejectionModal(false);
        setSelectedApplication(null);
        
        // Refresh data from server
        await loadData();
        toast.success('Application rejected successfully!');
      } else {
        const errorText = await response.text();
        console.error('Rejection failed:', errorText);
        toast.error(`Rejection failed: ${errorText}`);
      }
    } catch (error) {
      console.error('Error rejecting application:', error);
      toast.error('Error rejecting application. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Submit view
  const submitView = async () => {
    if (!selectedApplication) return;
    
    setLoading(true);
    try {
      // API call to view application - using ESS portal endpoints
      let endpoint = '';
      if (selectedApplication.type === 'expense') {
        endpoint = ESS_PORTAL_ENDPOINTS.EXPENSES.GET(selectedApplication.id);
      } else if (selectedApplication.type === 'leave') {
        endpoint = ESS_PORTAL_ENDPOINTS.LEAVE.GET(selectedApplication.id);
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(approvalData),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('View action successful:', result);
        setShowViewModal(false);
        setSelectedApplication(null);
        
        // Refresh data from server
        await loadData();
        toast.success('Application marked as viewed!');
      } else {
        const errorText = await response.text();
        console.error('View action failed:', errorText);
        toast.error(`View action failed: ${errorText}`);
      }
    } catch (error) {
      console.error('Error viewing application:', error);
      toast.error('Error viewing application. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Submit delete
  const submitDelete = async () => {
    if (!selectedApplication || !approvalData.deletion_reason) return;
    
    setLoading(true);
    try {
      // API call to delete application - using ESS portal endpoints
      let endpoint = '';
      if (selectedApplication.type === 'expense') {
        endpoint = ESS_PORTAL_ENDPOINTS.EXPENSES.DELETE(selectedApplication.id);
      } else if (selectedApplication.type === 'leave') {
        endpoint = ESS_PORTAL_ENDPOINTS.LEAVE.DELETE(selectedApplication.id);
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(approvalData),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Delete action successful:', result);
        setShowDeleteModal(false);
        setSelectedApplication(null);
        
        // Refresh data from server
        await loadData();
        toast.success('Application deleted successfully!');
      } else {
        const errorText = await response.text();
        console.error('Delete action failed:', errorText);
        toast.error(`Delete action failed: ${errorText}`);
      }
    } catch (error) {
      console.error('Error deleting application:', error);
      toast.error('Error deleting application. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (initialLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="space-y-6">
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="h-8 w-8 border-2 rounded-full animate-spin mx-auto mb-4" style={{ borderColor: '#3366CC', borderTopColor: 'transparent' }}></div>
                <p className="text-gray-600 dark:text-gray-400">Loading manager approvals...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="space-y-6">
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="h-12 w-12 text-red-500 dark:text-red-400 mx-auto mb-4">
                  <XCircle className="h-full w-full" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Error Loading Data</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
                <Button onClick={loadData} className="bg-[#3366CC] hover:bg-[#4a7dd9] text-white">
                  Try Again
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <DashboardHeader
          title="Manager Approvals"
          subtitle="Comprehensive management approval system with intelligent workflow automation, team oversight capabilities, and enterprise-grade decision management for organizational excellence."
          icon={Users}
          iconColor="text-white"
          hideTenantPrefix={true}
          breadcrumbs={[
            { label: 'Home', href: '/' },
            { label: 'ESS Approval Flows', href: '/ess-approval-flows' },
            { label: 'Manager Approvals' }
          ]}
          actions={
            <button
              onClick={loadData}
              className="inline-flex items-center px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg font-medium transition-all duration-300"
              title="Refresh data"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </button>
          }
        />

        <div className="space-y-6 mt-8">

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin mr-3" style={{ color: '#3366CC' }} />
            <span className="text-lg text-gray-600 dark:text-gray-400">Loading manager data...</span>
        </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 mr-2" />
              <div>
                <h3 className="text-red-800 dark:text-red-400 font-medium">Error Loading Data</h3>
                <p className="text-red-600 dark:text-red-400 text-sm mt-1">{error}</p>
                <button
                  onClick={loadData}
                  className="mt-2 text-sm text-red-700 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 underline"
                >
                
                  Try Again
                </button>
              </div>
              </div>
            </div>
        )}

        {/* Data Content */}
        {!loading && !error && (
          <div>
            {/* KPI Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
              {kpis.map(kpi => (
                <KPICard key={kpi.id} kpi={kpi} />
              ))}
              </div>

            {/* Tab Navigation */}
            <div className="flex space-x-1 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-t-xl px-4 mb-6">
              {tabs.map(tab => (
                <TabButton 
                  key={tab.id} 
                  tab={tab.id} 
                  label={tab.label} 
                  icon={tab.icon} 
                />
              ))}
            </div>

            {/* Advanced Filters */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 hover:shadow-2xl transition-all duration-300 p-6 mb-6 mt-4">
              <h4 className="text-xl font-bold text-[#3366CC] dark:text-[#4a7dd9] flex items-center mb-3">
                <div className="p-2 rounded-xl bg-[#3366CC]/10 dark:bg-[#3366CC]/20 mr-3">
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
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500 group-focus-within:text-[#3366CC] dark:group-focus-within:text-[#4a7dd9] transition-colors" />
                    <input
                      value={filters.search}
                      onChange={(e) => onFilterChange('search', e.target.value)}
                      placeholder="Search applications..."
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-[#3366CC]/50 focus:border-[#3366CC] bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 hover:bg-gray-50 dark:hover:bg-gray-600 transition-all duration-200 shadow-sm hover:shadow-md"
                    />
            </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Status</label>
                  <div className="relative">
                    <select
                      value={filters.status}
                      onChange={(e) => onFilterChange('status', e.target.value as FilterState['status'])}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-[#3366CC]/50 focus:border-[#3366CC] bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-all duration-200 shadow-sm hover:shadow-md appearance-none cursor-pointer"
                    >
                      <option value="all">All Status</option>
                      <option value="pending">Pending</option>
                      <option value="approved">Approved</option>
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
                      value={filters.type}
                      onChange={(e) => onFilterChange('type', e.target.value as FilterState['type'])}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-[#3366CC]/50 focus:border-[#3366CC] bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-all duration-200 shadow-sm hover:shadow-md appearance-none cursor-pointer"
                    >
                      <option value="all">All Types</option>
                      <option value="leave">Leave Request</option>
                      <option value="expense">Expense Claim</option>
                      <option value="asset">Asset Request</option>
                      <option value="payslip">Payslip Generation</option>
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
                      value={filters.department}
                      onChange={(e) => onFilterChange('department', e.target.value as FilterState['department'])}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-[#3366CC]/50 focus:border-[#3366CC] bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-all duration-200 shadow-sm hover:shadow-md appearance-none cursor-pointer"
                    >
                      <option value="all">All Departments</option>
                      {departmentOptions.map(dept => (
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
                      value={filters.priority}
                      onChange={(e) => onFilterChange('priority', e.target.value as FilterState['priority'])}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-[#3366CC]/50 focus:border-[#3366CC] bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-all duration-200 shadow-sm hover:shadow-md appearance-none cursor-pointer"
                    >
                      <option value="all">All Priorities</option>
                      <option value="critical">Critical</option>
                      <option value="urgent">Urgent</option>
                      <option value="high">High</option>
                      <option value="normal">Normal</option>
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

      {/* Applications List */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-x-auto border border-gray-200 dark:border-gray-700">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold text-gray-800 dark:text-white flex items-center">
                    {activeTab === 'leave' ? (
                      <Calendar className="w-5 h-5 mr-2" style={{ color: '#3366CC' }} />
                    ) : (
                      <DollarSign className="w-5 h-5 mr-2" style={{ color: '#3366CC' }} />
                    )}
                    {activeTab === 'leave' ? 'Leave' : 'Expense'} Applications ({filteredApplications.length})
                  </h3>
                  <div className="text-sm text-gray-600 dark:text-gray-400 bg-[#3366CC]/10 dark:bg-[#3366CC]/20 px-3 py-2 rounded-lg border border-[#3366CC]/20 dark:border-[#3366CC]/30">
                    <span className="font-medium" style={{ color: '#3366CC' }}>📅 Sorted by:</span> <span className="dark:text-gray-300">Most recent applications first</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4 px-6 pb-6">
            {filteredApplications.map((application) => (
                  <div key={application.id} className="border border-gray-200 dark:border-gray-700 rounded-xl p-6 bg-white dark:bg-gray-800 hover:bg-[#3366CC]/5 dark:hover:bg-[#3366CC]/10 transition-all duration-300 hover:shadow-lg">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-3">
                      <TypeIcon type={application.type} />
                          <h3 className="font-semibold text-gray-900 dark:text-white text-lg">{application.title}</h3>
                      <StatusTag status={application.priority} />
                      <StatusTag status={application.status || 'pending'} />
                      {/* New Application Badge */}
                      {(() => {
                        const now = new Date().getTime();
                        const appTime = new Date(application.created_at).getTime();
                        const hoursDiff = (now - appTime) / (1000 * 60 * 60);
                        return hoursDiff < 1 ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-[#3366CC] dark:bg-[#4a7dd9] text-white shadow-lg animate-pulse">
                            🆕 NEW
                          </span>
                        ) : null;
                      })()}
                      
                      {/* Insufficient Balance Warning for Leave Applications */}
                      {application.type === 'leave' && application.insufficientBalance && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-red-500 dark:bg-red-600 text-white shadow-lg">
                          ⚠️ INSUFFICIENT BALANCE
                        </span>
                      )}
                    </div>
                    
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600 dark:text-gray-400 mb-4">
                      <div className="flex items-center">
                            <User className="h-4 w-4 mr-2" style={{ color: '#3366CC' }} />
                            <span className="font-medium dark:text-gray-300">{application.employee_name}</span>
                            <span className="text-gray-500 dark:text-gray-500 ml-1">({application.employee_id})</span>
                      </div>
                      <div className="flex items-center">
                            <Building className="h-4 w-4 mr-2" style={{ color: '#3366CC' }} />
                        <span className="dark:text-gray-300">{application.department}</span>
                      </div>
                      <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-2" style={{ color: '#3366CC' }} />
                        <span className="font-medium dark:text-gray-300">
                          Submitted: {new Date(application.created_at).toLocaleDateString()} at {new Date(application.created_at).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                    
                        <p className="text-gray-700 dark:text-gray-300 mb-4 leading-relaxed">{application.description}</p>
                    
                        <div className="flex flex-wrap gap-4">
                    {application.amount && (
                            <div className="flex items-center font-medium px-3 py-1 rounded-lg" style={{ color: '#3366CC', backgroundColor: 'rgba(51, 102, 204, 0.1)' }}>
                        <DollarSign className="h-4 w-4 mr-1" />
                        ₹{application.amount.toLocaleString()}
                      </div>
                    )}
                    
                    {application.start_date && application.end_date && (
                            <div className="flex items-center text-sm px-3 py-1 rounded-lg" style={{ color: '#3366CC', backgroundColor: 'rgba(51, 102, 204, 0.1)' }}>
                        <Calendar className="h-4 w-4 mr-1" />
                        {new Date(application.start_date).toLocaleDateString()} - {new Date(application.end_date).toLocaleDateString()}
                      </div>
                    )}

                    {/* Leave Balance Information */}
                    {application.type === 'leave' && (
                      <div className="flex items-center text-sm px-3 py-1 rounded-lg" 
                           style={{ 
                             backgroundColor: application.insufficientBalance ? 'rgba(220, 38, 38, 0.1)' : 'rgba(51, 102, 204, 0.1)',
                             color: application.insufficientBalance ? '#dc2626' : '#3366CC'
                           }}>
                        <Clock className="h-4 w-4 mr-1" />
                        {application.requestedDays} days requested, {application.availableDays} available
                        {application.insufficientBalance && (
                          <span className="ml-2 font-bold">⚠️</span>
                        )}
                      </div>
                    )}

                    {application.type === 'asset' && application.quantity && (
                            <div className="flex items-center text-sm px-3 py-1 rounded-lg" style={{ color: '#3366CC', backgroundColor: 'rgba(51, 102, 204, 0.1)' }}>
                        <Package className="h-4 w-4 mr-1" />
                        Qty: {application.quantity}
                      </div>
                    )}

                    {application.type === 'payslip' && application.payslipId && (
                            <div className="flex items-center text-sm px-3 py-1 rounded-lg" style={{ color: '#3366CC', backgroundColor: 'rgba(51, 102, 204, 0.1)' }}>
                        <FileText className="h-4 w-4 mr-1" />
                        ID: {application.payslipId}
                      </div>
                    )}

                    {application.type === 'expense' && application.expenseId && (
                            <div className="flex items-center text-sm px-3 py-1 rounded-lg" style={{ color: '#3366CC', backgroundColor: 'rgba(51, 102, 204, 0.1)' }}>
                        <DollarSign className="h-4 w-4 mr-1" />
                        ID: {application.expenseId}
                      </div>
                    )}
                        </div>
                  </div>
                  
                      <div className="flex flex-wrap gap-2 ml-6">
                    <button 
                      onClick={() => handleAction(application.id, 'view')}
                      className="inline-flex items-center justify-center w-8 h-8 border border-gray-300 dark:border-gray-600 rounded-md text-gray-600 dark:text-gray-400 hover:text-[#3366CC] dark:hover:text-[#4a7dd9] hover:bg-[#3366CC]/10 dark:hover:bg-[#3366CC]/20 transition-all duration-200"
                      title="View Details"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    {application.status === 'pending' && (
                      <>
                        <button 
                          onClick={() => handleActionWithComment(application.id, 'approve')}
                          disabled={actionLoading === application.id}
                          className="p-2 rounded-full transition duration-150 disabled:opacity-50"
                          style={{ color: '#3366CC' }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(51, 102, 204, 0.1)'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                          title="Approve"
                        >
                          {actionLoading === application.id ? (
                            <RefreshCw className="w-5 h-5 animate-spin" />
                          ) : (
                            <CheckCircle className="w-5 h-5" />
                          )}
                        </button>
                        <button 
                          onClick={() => handleActionWithComment(application.id, 'reject')}
                          disabled={actionLoading === application.id}
                          className="p-2 text-red-500 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-full transition duration-150 disabled:opacity-50"
                          title="Reject"
                        >
                          {actionLoading === application.id ? (
                            <RefreshCw className="w-5 h-5 animate-spin" />
                          ) : (
                            <XCircle className="w-5 h-5" />
                          )}
                        </button>
                        <button 
                          onClick={() => handleActionWithComment(application.id, 'delete')}
                          disabled={actionLoading === application.id}
                          className="p-2 text-orange-500 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-900/20 rounded-full transition duration-150 disabled:opacity-50"
                          title="Delete"
                        >
                          {actionLoading === application.id ? (
                            <RefreshCw className="w-5 h-5 animate-spin" />
                          ) : (
                            <Trash2 className="w-5 h-5" />
                          )}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {filteredApplications.length === 0 && (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                    <div className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(51, 102, 204, 0.1)' }}>
                      <FileText className="h-10 w-10" style={{ color: '#3366CC' }} />
                    </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      {filters.search ? 'No applications match your search' : 'No pending applications'}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                      {filters.search 
                        ? 'Try adjusting your search terms or clear the filters to see all applications.'
                    : 'All applications have been processed. Check back later for new requests.'
                  }
                </p>
                    {filters.search && (
                  <Button 
                    variant="outline" 
                        onClick={() => setFilters(prev => ({ ...prev, search: '' }))}
                    className="mt-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Clear Search
                  </Button>
                )}
              </div>
            )}
          </div>
            </div>
          </div>
        )}

      {/* Approval Modal */}
      {showApprovalModal && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Approve Application</h3>
            {selectedApplication && (
              <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg mb-4">
                <h4 className="font-medium text-gray-900 dark:text-white">{selectedApplication.title}</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">by {selectedApplication.employee_name}</p>
              </div>
            )}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Comments (Optional)
              </label>
              <textarea
                value={approvalData.comments}
                onChange={(e) => setApprovalData(prev => ({ ...prev, comments: e.target.value }))}
                placeholder="Add any comments for the employee..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-[#3366CC]/50 focus:border-[#3366CC]"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowApprovalModal(false)} className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                Cancel
              </Button>
              <Button onClick={submitApproval} disabled={loading} className="bg-[#3366CC] hover:bg-[#4a7dd9] text-white">
                {loading ? 'Approving...' : 'Approve Application'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {showRejectionModal && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Reject Application</h3>
            {selectedApplication && (
              <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg mb-4">
                <h4 className="font-medium text-gray-900 dark:text-white">{selectedApplication.title}</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">by {selectedApplication.employee_name}</p>
              </div>
            )}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Rejection Reason *
              </label>
              <textarea
                value={approvalData.rejection_reason}
                onChange={(e) => setApprovalData(prev => ({ ...prev, rejection_reason: e.target.value }))}
                placeholder="Please provide a reason for rejection..."
                rows={3}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-[#3366CC]/50 focus:border-[#3366CC]"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowRejectionModal(false)} className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                Cancel
              </Button>
              <Button 
                onClick={submitRejection} 
                disabled={loading || !approvalData.rejection_reason}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {loading ? 'Rejecting...' : 'Reject Application'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {showViewModal && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">View Application Details</h3>
            {selectedApplication && (
              <div className="space-y-4">
                <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                  <h4 className="font-medium text-lg text-gray-900 dark:text-white">{selectedApplication.title}</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">by {selectedApplication.employee_name}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-500">Department: {selectedApplication.department}</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Application Type</label>
                    <p className="text-sm text-gray-900 dark:text-white capitalize">{selectedApplication.type}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Employee ID</label>
                    <p className="text-sm text-gray-900 dark:text-white">{selectedApplication.employee_id}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Created Date</label>
                    <p className="text-sm text-gray-900 dark:text-white">{new Date(selectedApplication.created_at).toLocaleDateString()}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Priority</label>
                    <p className="text-sm text-gray-900 dark:text-white capitalize">{selectedApplication.priority}</p>
                  </div>
                  
                  {selectedApplication.amount && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Amount</label>
                      <p className="text-sm text-gray-900 dark:text-white">₹{selectedApplication.amount.toLocaleString()}</p>
                    </div>
                  )}
                  
                  {selectedApplication.start_date && selectedApplication.end_date && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date Range</label>
                      <p className="text-sm text-gray-900 dark:text-white">
                          {selectedApplication.start_date && selectedApplication.end_date ? 
                            `${new Date(selectedApplication.start_date).toLocaleDateString()} - ${new Date(selectedApplication.end_date).toLocaleDateString()}` : 
                            'N/A'
                          }
                      </p>
                    </div>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                  <p className="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">{selectedApplication.description}</p>
                </div>
              </div>
            )}
            <div className="flex justify-end space-x-2 mt-6">
              <Button variant="outline" onClick={() => setShowViewModal(false)} className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                Close
              </Button>
              <Button onClick={submitView} disabled={loading} className="bg-[#3366CC] hover:bg-[#4a7dd9] text-white">
                {loading ? 'Marking as Viewed...' : 'Mark as Viewed'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Delete Application</h3>
            {selectedApplication && (
              <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg mb-4">
                <h4 className="font-medium text-gray-900 dark:text-white">{selectedApplication.title}</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">by {selectedApplication.employee_name}</p>
              </div>
            )}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Deletion Reason *
              </label>
              <textarea
                value={approvalData.deletion_reason}
                onChange={(e) => setApprovalData(prev => ({ ...prev, deletion_reason: e.target.value }))}
                placeholder="Please provide a reason for deletion..."
                rows={3}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-[#3366CC]/50 focus:border-[#3366CC]"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowDeleteModal(false)} className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                Cancel
              </Button>
              <Button 
                onClick={submitDelete} 
                disabled={loading || !approvalData.deletion_reason}
                className="bg-orange-600 hover:bg-orange-700 text-white"
              >
                {loading ? 'Deleting...' : 'Delete Application'}
              </Button>
            </div>
          </div>
        </div>
        )}

      {/* Comment Modal */}
      {showCommentModal && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-[99999]">
          <div 
            className="bg-white dark:bg-gray-800 rounded-lg p-6 w-96 max-w-md mx-4 z-[100000] border border-gray-200 dark:border-gray-700"
            style={{
              filter: 'none !important', // Ensure modal itself is not blurred
              backdropFilter: 'none !important',
              position: 'relative',
              zIndex: 100000,
            }}
          >
            <h3 className="text-lg font-semibold mb-4 flex items-center text-gray-900 dark:text-white">
              {showCommentModal.action === 'approve' ? (
                <CheckCircle className="w-5 h-5 text-green-500 dark:text-green-400 mr-2" />
              ) : showCommentModal.action === 'reject' ? (
                <XCircle className="w-5 h-5 text-red-500 dark:text-red-400 mr-2" />
              ) : (
                <Trash2 className="w-5 h-5 text-orange-500 dark:text-orange-400 mr-2" />
              )}
              {showCommentModal.action === 'approve' ? 'Approve' : 
               showCommentModal.action === 'reject' ? 'Reject' : 'Delete'} Application
            </h3>
            
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Application ID: <span className="font-medium text-gray-900 dark:text-white">{showCommentModal.id}</span>
            </p>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {showCommentModal.action === 'approve' ? 'Comments (Optional)' :
                 showCommentModal.action === 'reject' ? 'Rejection Reason *' :
                 'Deletion Reason *'}
              </label>
              <textarea
                value={actionComment}
                onChange={(e) => setActionComment(e.target.value)}
                placeholder={showCommentModal.action === 'approve' 
                  ? "Add approval comments (optional)" 
                  : showCommentModal.action === 'reject'
                  ? "Please provide reason for rejection"
                  : "Please provide reason for deletion"}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#3366CC]/50 focus:border-[#3366CC]"
                rows={3}
              />
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={submitActionWithComment}
                disabled={(showCommentModal.action === 'reject' || showCommentModal.action === 'delete') && !actionComment.trim()}
                className={`flex-1 px-4 py-2 rounded-md text-white font-medium transition duration-150 
                  ${showCommentModal.action === 'approve' 
                    ? 'bg-[#3366CC] hover:bg-[#4a7dd9]' 
                    : showCommentModal.action === 'reject'
                    ? 'bg-red-500 hover:bg-red-600'
                    : 'bg-orange-500 hover:bg-orange-600'} 
                  disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {showCommentModal.action === 'approve' ? 'Approve' : 
                 showCommentModal.action === 'reject' ? 'Reject' : 'Delete'}
              </button>
              <button
                onClick={() => setShowCommentModal(null)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition duration-150"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
        </div>
      </div>
    </div>
  );
};

export default ManagerApprovalsComponent;