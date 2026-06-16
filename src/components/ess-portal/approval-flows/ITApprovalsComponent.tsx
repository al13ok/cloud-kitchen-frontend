'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { getAuthHeaders } from '@/utils/api';
import { toast } from 'react-hot-toast';
// Assuming lucide-react icons are available in the environment
import { 
  Square, CheckCircle, XCircle, Clock, HardHat, Server, PieChart, Users, RefreshCw, AlertTriangle, Filter, Search, X, User, Eye, FileText, Calendar
} from 'lucide-react';
import DashboardHeader from '@/components/header/DashboardHeader';
import Pagination from '@/components/tables/Pagination';

// --- INTERFACES FOR BACKEND INTEGRATION ---

interface ITEmployeeInfo {
  employeeCode: string;
  fullName: string;
  department: string;
  designation: string;
  email: string;
}

interface AssetDetails {
  assetType: 'Hardware' | 'Software' | 'Other';
  assetName: string;
  quantity: number;
  justification: string;
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  expectedDate?: string | null;
}

interface ApprovalInfo {
  approvedBy?: string | null;
  approvedDate?: string | null;
  rejectedBy?: string | null;
  rejectedDate?: string | null;
  itComments?: string | null;
}

interface BackendAssetRequest {
  _id?: string;
  id: string;
  requestId: string;
  employeeInfo: ITEmployeeInfo;
  assetDetails: AssetDetails;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Issued';
  urgency?: 'critical' | 'urgent' | 'high' | 'normal';
  daysUntilNeeded?: number;
  requestedDate: string;
  expectedDate: string;
  createdAt: string;
  updatedAt: string;
  approvalInfo?: ApprovalInfo;
  approver?: string;
  rejectionReason?: string;
}

// Utility functions for data access
const getEmployeeName = (req: BackendAssetRequest): string => req.employeeInfo?.fullName || '';
const getEmployeeId = (req: BackendAssetRequest): string => req.employeeInfo?.employeeCode || '';
const getDepartment = (req: BackendAssetRequest): string => req.employeeInfo?.department || '';
const getAssetName = (req: BackendAssetRequest): string => req.assetDetails?.assetName || '';
const getAssetType = (req: BackendAssetRequest): string => req.assetDetails?.assetType || '';
const getPriority = (req: BackendAssetRequest): string => req.assetDetails?.priority || '';

const getStatusDate = (req: BackendAssetRequest): string => {
  if (req.approvalInfo?.approvedDate) return req.approvalInfo.approvedDate;
  if (req.approvalInfo?.rejectedDate) return req.approvalInfo.rejectedDate;
  return req.createdAt;
};
const getAssetDetailsString = (req: BackendAssetRequest): string => {
  return `${req.assetDetails?.assetType || ''} - ${req.assetDetails?.justification || ''}`;
};

interface ITDashboardStats {
  summary: {
    pendingRequests: number;
    urgentRequests: number;
    totalRequests?: number;
    approvedRequests?: number;
    rejectedRequests?: number;
  };
  departmentStats: Array<{
    department: string;
    pendingCount: number;
  }>;
  assetTypeStats: Array<{
    assetType: string;
    pendingCount: number;
  }>;
  requestTypeStats?: Array<{
    requestType: string;
    pendingCount: number;
  }>;
}

// --- FRONTEND INTERFACES ---

interface KPI {
  id: number;
  icon: React.ElementType;
  title: string;
  value: number | string;
  color: string;
}

interface ChartData {
  label: string;
  value: number;
  color: string;
  category?: string; // For stacked charts
}

// --- API SERVICE FUNCTIONS ---

// API Configuration - Ensure full path is included
import { getEssPortalApiBase, ESS_PORTAL_ENDPOINTS } from '@/utils/essApi';

const API_BASE = getEssPortalApiBase();

// Minimal shape for API assets to avoid any/unknown while accessing optional fields
type ApiAsset = {
  id?: string;
  _id?: string;
  requestId?: string;
  employeeInfo?: Partial<ITEmployeeInfo>;
  assetDetails?: Partial<AssetDetails> & { expectedDate?: string | null };
  status?: BackendAssetRequest['status'];
  createdAt?: string;
  requestedDate?: string;
  updatedAt?: string;
  approver?: string;
  approvedDate?: string;
  rejectedBy?: string;
  rejectedDate?: string;
  itComments?: string;
  rejectionReason?: string;
};

const itApprovalAPI = {
  // Helper function for fetch with timeout and retry
  fetchWithRetry: async (url: string, options: RequestInit = {}, retries = 3): Promise<Response> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    try {
      const authHeaders = getAuthHeaders();
      
      // Debug: Log headers for troubleshooting
      const hasAuthHeader = authHeaders instanceof Headers 
        ? authHeaders.has('Authorization')
        : (authHeaders as Record<string, string>)['Authorization'] ? true : false;
      if (!hasAuthHeader) {
        console.warn('⚠️ ITApprovalsComponent - No Authorization header found in fetchWithRetry');
      }
      
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'accept': 'application/json',
          ...authHeaders,
          ...options.headers,
        },
      });
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (retries > 0 && !controller.signal.aborted) {
        console.warn(`Fetch failed, retrying... (${retries} attempts left)`, error);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
        return itApprovalAPI.fetchWithRetry(url, options, retries - 1);
      }
      
      throw error;
    }
  },

  // Get asset requests for IT approval
  getPendingAssetRequests: async (department?: string, assetType?: string): Promise<BackendAssetRequest[]> => {
    try {
      const assetsUrl = ESS_PORTAL_ENDPOINTS.ASSETS.LIST();
      console.log('📡 ITApprovalsComponent - Fetching asset requests from:', assetsUrl);
      console.log('📡 ITApprovalsComponent - API_BASE:', API_BASE);
      
      const response = await itApprovalAPI.fetchWithRetry(assetsUrl, {
        method: 'GET',
        headers: {
          'accept': 'application/json'
        }
      });
      
      const data = await response.json();
      console.log('📊 Raw API response:', data);
      
      if (!data.success) {
        throw new Error(data.message || 'API returned unsuccessful response');
      }
      
      // Map asset requests to IT approval format
      let assets: BackendAssetRequest[] = (data.data || []).map((asset: ApiAsset) => ({
        id: asset.id || asset._id,
        requestId: asset.requestId || asset.id || asset._id,
        employeeInfo: {
          employeeCode: asset.employeeInfo?.employeeCode || '',
          fullName: asset.employeeInfo?.fullName || '',
          department: asset.employeeInfo?.department || '',
          designation: asset.employeeInfo?.designation || 'Employee',
          email: asset.employeeInfo?.email || ''
        },
        assetDetails: {
          assetType: asset.assetDetails?.assetType || 'Hardware',
          assetName: asset.assetDetails?.assetName || '',
          quantity: asset.assetDetails?.quantity || 1,
          justification: asset.assetDetails?.justification || '',
          priority: asset.assetDetails?.priority || 'Medium',
          expectedDate: asset.assetDetails?.expectedDate || null
        },
        status: asset.status || 'Pending',
        urgency: asset.assetDetails?.priority === 'High' || asset.assetDetails?.priority === 'Urgent' ? 'high' : 'normal',
        daysUntilNeeded: 0,
        requestedDate: asset.createdAt || asset.requestedDate || '',
        expectedDate: asset.assetDetails?.expectedDate || '',
        createdAt: asset.createdAt || '',
        updatedAt: asset.updatedAt || asset.createdAt || '',
        approvalInfo: {
          approvedBy: asset.approver || null,
          approvedDate: asset.approvedDate || null,
          rejectedBy: asset.rejectedBy || null,
          rejectedDate: asset.rejectedDate || null,
          itComments: asset.itComments || null
        },
        approver: asset.approver || null,
        rejectionReason: asset.rejectionReason || null
      }));
      
      // Filter by department if specified
      if (department) {
        assets = assets.filter((asset: BackendAssetRequest) =>
          asset.employeeInfo?.department?.toLowerCase().includes(department.toLowerCase())
        );
      }

      if (assetType) {
        assets = assets.filter((asset: BackendAssetRequest) =>
          asset.assetDetails?.assetType?.toLowerCase().includes(assetType.toLowerCase())
        );
      }

      console.log('✅ Fetched asset requests count:', assets.length);
      return assets;
    } catch (error) {
      console.error('❌ Error fetching asset requests:', error);
      throw new Error(`Failed to fetch asset requests: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  // Get asset dashboard statistics
  getAssetDashboardStats: async (): Promise<ITDashboardStats> => {
    try {
      const statsUrl = ESS_PORTAL_ENDPOINTS.ASSETS.LIST();
      console.log('📊 ITApprovalsComponent - Fetching dashboard stats from:', statsUrl);
      
      const response = await itApprovalAPI.fetchWithRetry(statsUrl, {
        method: 'GET',
        headers: {
          'accept': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'API returned unsuccessful response');
      }
      
      // Map asset requests to IT approval format
      const assets: BackendAssetRequest[] = (data.data || []).map((asset: ApiAsset) => ({
        id: asset.id || asset._id,
        requestId: asset.requestId || asset.id || asset._id,
        employeeInfo: {
          employeeCode: asset.employeeInfo?.employeeCode || '',
          fullName: asset.employeeInfo?.fullName || '',
          department: asset.employeeInfo?.department || '',
          designation: asset.employeeInfo?.designation || 'Employee',
          email: asset.employeeInfo?.email || ''
        },
        assetDetails: {
          assetType: asset.assetDetails?.assetType || 'Hardware',
          assetName: asset.assetDetails?.assetName || '',
          quantity: asset.assetDetails?.quantity || 1,
          justification: asset.assetDetails?.justification || '',
          priority: asset.assetDetails?.priority || 'Medium',
          expectedDate: asset.assetDetails?.expectedDate || null
        },
        status: asset.status || 'Pending',
        urgency: asset.assetDetails?.priority === 'High' || asset.assetDetails?.priority === 'Urgent' ? 'high' : 'normal',
        daysUntilNeeded: 0,
        requestedDate: asset.createdAt || asset.requestedDate || '',
        expectedDate: asset.assetDetails?.expectedDate || '',
        createdAt: asset.createdAt || '',
        updatedAt: asset.updatedAt || asset.createdAt || '',
        approvalInfo: {
          approvedBy: asset.approver || null,
          approvedDate: asset.approvedDate || null,
          rejectedBy: asset.rejectedBy || null,
          rejectedDate: asset.rejectedDate || null,
          itComments: asset.itComments || null
        },
        approver: asset.approver || null,
        rejectionReason: asset.rejectionReason || null
      }));
      
      console.log('📈 Processing stats for', assets.length, 'asset requests');
      
      // Calculate stats from the asset data
      const totalRequests = assets.length;
      const pendingRequests = assets.filter((a: BackendAssetRequest) => a.status === 'Pending').length;
      const approvedRequests = assets.filter((a: BackendAssetRequest) => a.status === 'Approved').length;
      const rejectedRequests = assets.filter((a: BackendAssetRequest) => a.status === 'Rejected').length;
      const urgentRequests = assets.filter((a: BackendAssetRequest) =>
        a.status === 'Pending' &&
        (a.assetDetails?.priority === 'High' || a.assetDetails?.priority === 'Urgent')
      ).length;

      // Calculate department breakdown
      const departmentStats = assets
        .filter((a: BackendAssetRequest) => a.status === 'Pending')
        .reduce((acc: Record<string, number>, asset: BackendAssetRequest) => {
          const dept = asset.employeeInfo?.department || 'Unknown';
          acc[dept] = (acc[dept] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

      // Calculate asset type breakdown  
      const assetTypeStats = assets
        .filter((a: BackendAssetRequest) => a.status === 'Pending')
        .reduce((acc: Record<string, number>, asset: BackendAssetRequest) => {
          const type = asset.assetDetails?.assetType || 'Unknown';
          acc[type] = (acc[type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

      const stats = {
        summary: {
          pendingRequests,
          urgentRequests,
          totalRequests,
          approvedRequests,
          rejectedRequests
        },
        departmentStats: Object.entries(departmentStats).map(([department, pendingCount]) => ({
          department,
          pendingCount: pendingCount as number
        })),
        assetTypeStats: Object.entries(assetTypeStats).map(([assetType, pendingCount]) => ({
          assetType,
          pendingCount: pendingCount as number
        }))
      };
      
      console.log('✅ Dashboard stats calculated:', stats);
      return stats;
    } catch (error) {
      console.error('❌ Error fetching dashboard stats:', error);
      throw new Error(`Failed to fetch dashboard statistics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  // Get single asset request for approval
  getAssetRequest: async (requestId: string): Promise<BackendAssetRequest> => {
    const authHeaders = getAuthHeaders();
    const response = await itApprovalAPI.fetchWithRetry(ESS_PORTAL_ENDPOINTS.ASSETS.GET(requestId), {
      method: 'GET',
      headers: {
        ...authHeaders,
        'accept': 'application/json'
      }
    });
    
    if (!response.ok) throw new Error('Failed to fetch asset request');

    const data = await response.json();
    return data.data;
  },

  // Approve asset request - update status to Approved
  approveAssetRequest: async (requestId: string, approvedBy: string = 'it@company.com', comments?: string) => {
    try {
      console.log('✅ Approving asset request:', requestId);
      const response = await itApprovalAPI.fetchWithRetry(ESS_PORTAL_ENDPOINTS.ASSETS.GET(requestId), {
        method: 'PUT',
        body: JSON.stringify({
          status: 'Approved',
          approver: approvedBy,
          approvedDate: new Date().toISOString(),
          itComments: comments || 'Approved by IT Department'
        }),
      });
      
      const result = await response.json();
      console.log('✅ Asset request approved successfully:', result);
      return result;
    } catch (error) {
      console.error('❌ Error approving asset request:', error);
      throw new Error(`Failed to approve asset request: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  // Reject asset request - update status to Rejected
  rejectAssetRequest: async (requestId: string, rejectedBy: string = 'it@company.com', comments?: string) => {
    try {
      console.log('❌ Rejecting asset request:', requestId);
      const response = await itApprovalAPI.fetchWithRetry(ESS_PORTAL_ENDPOINTS.ASSETS.GET(requestId), {
        method: 'PUT',
        body: JSON.stringify({
          status: 'Rejected',
          rejectedBy: rejectedBy,
          rejectedDate: new Date().toISOString(),
          rejectionReason: comments || 'Rejected by IT Department'
        }),
      });
      
      const result = await response.json();
      console.log('❌ Asset request rejected successfully:', result);
      return result;
    } catch (error) {
      console.error('❌ Error rejecting asset request:', error);
      throw new Error(`Failed to reject asset request: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
};


// --- MOCK DATA (fallback) ---

const MOCK_REQUESTS: BackendAssetRequest[] = [
  { 
    id: 'AST-2025-001', 
    requestId: 'AST-2025-001',
    employeeInfo: {
      employeeCode: 'EMP0234',
      fullName: 'Tushar Baranwal',
      department: 'Engineering',
      designation: 'Software Engineer',
      email: 'tushar@company.com'
    },
    assetDetails: {
      assetType: 'Hardware',
      assetName: 'MacBook Pro 14-inch',
      quantity: 1,
      justification: 'MacBook Pro 14-inch for development',
      priority: 'High',
      expectedDate: '2025-10-10'
    },
    status: 'Pending',
    urgency: 'high',
    daysUntilNeeded: 6,
    requestedDate: '2025-10-03',
    expectedDate: '2025-10-10',
    createdAt: '2025-10-03T16:52:52.692695',
    updatedAt: '2025-10-03T16:52:52.692695'
  }
];

// --- UTILITY COMPONENTS ---

const StatusTag: React.FC<{ status: string }> = ({ status }) => {
  let bgColor = 'bg-gray-100 text-gray-700';
  let label = status.charAt(0).toUpperCase() + status.slice(1);
  let Icon = Square; // Default icon

  switch (status.toLowerCase()) {
    case 'approved':
      bgColor = 'bg-green-100 text-green-700 font-medium';
      label = 'Approved';
      break;
    case 'rejected':
      bgColor = 'bg-red-100 text-red-700 font-medium';
      label = 'Rejected';
      break;
    case 'pending':
      bgColor = 'bg-yellow-100 text-yellow-700 font-medium';
      label = 'Pending';
      break;
    case 'issued':
      bgColor = 'bg-blue-100 text-blue-700 font-medium';
      label = 'Issued';
      break;
    case 'high':
    case 'urgent':
      bgColor = 'bg-red-500 text-white font-medium';
      break;
    case 'medium':
    case 'normal':
      bgColor = 'bg-indigo-500 text-white font-medium';
      break;
    case 'low':
      bgColor = 'bg-blue-500 text-white font-medium';
      break;
    case 'hardware':
      bgColor = 'bg-gray-800 text-white font-medium';
      Icon = HardHat;
      break;
    case 'software':
      bgColor = 'bg-black text-white font-medium';
      Icon = Server;
      break;
    case 'other':
      bgColor = 'bg-purple-500 text-white font-medium';
      break;
  }

  const baseClasses = 'inline-flex items-center text-xs px-2 py-0.5 rounded-full whitespace-nowrap';

  return (
    <span className={`${baseClasses} ${bgColor}`}>
      {(['hardware', 'software', 'other'].includes(status.toLowerCase())) && <Icon size={12} className="mr-1" />}
      {label}
    </span>
  );
};

// Custom Chart components (using CSS/SVG to comply with single file rule)
const DoughnutChart: React.FC<{ title: string; data: ChartData[]; total: number }> = ({ title, data, total }) => {
  const [hoveredSegment, setHoveredSegment] = useState<{ value: number; label: string; x: number; y: number } | null>(null);
  
  const size = 150;
  const strokeWidth = 20;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  
  const handleSegmentHover = (event: React.MouseEvent, item: ChartData) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setHoveredSegment({
      value: item.value,
      label: item.label,
      x: rect.left + rect.width / 2,
      y: rect.top - 10
    });
  };

  const handleSegmentLeave = () => {
    setHoveredSegment(null);
  };
  
  const getDoughnutSegments = () => {
    let currentOffset = 0;
    return data.map((item, index) => {
      const segmentRatio = item.value / total;
      const strokeDasharray = `${segmentRatio * circumference} ${circumference}`;
      const strokeDashoffset = currentOffset;
      
      // Calculate the next offset
      currentOffset -= segmentRatio * circumference;

      return (
        <circle
          key={index}
          className="transition-all duration-500 cursor-pointer hover:brightness-110"
          r={radius}
          cx={size / 2}
          cy={size / 2}
          fill="none"
          stroke={item.color}
          strokeWidth={strokeWidth}
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="butt"
          transform={`rotate(-90 ${size / 2} ${size / 2})`} // Start from the top
          onMouseEnter={(e) => handleSegmentHover(e, item)}
          onMouseLeave={handleSegmentLeave}
        />
      );
    });
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg transition duration-300 hover:shadow-2xl relative border border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">{title}</h3>
      <div className="flex flex-col items-center justify-center flex-grow">
        <div className="relative mb-6">
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            {/* Background Circle */}
            <circle
              r={radius}
              cx={size / 2}
              cy={size / 2}
              fill="none"
              stroke="#e5e7eb"
              strokeWidth={strokeWidth}
            />
            {getDoughnutSegments()}
          </svg>
        </div>
        
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-sm">
          {data.map((item, index) => (
            <div key={index} className="flex items-center">
              <span 
                className="w-3 h-3 rounded-full mr-2" 
                style={{ backgroundColor: item.color }}
              ></span>
              <span className="text-gray-600 dark:text-gray-300 font-medium">{item.label}: {item.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Hover Tooltip for Doughnut Chart */}
      {hoveredSegment && (
        <div
          className="fixed z-50 bg-gray-800 text-white px-3 py-2 rounded-lg shadow-lg text-sm pointer-events-none"
          style={{
            left: `${hoveredSegment.x}px`,
            top: `${hoveredSegment.y}px`,
            transform: 'translate(-50%, -100%)'
          }}
        >
          <div className="font-medium">{hoveredSegment.label}</div>
          <div className="text-gray-300">Value: {hoveredSegment.value}</div>
          <div className="text-gray-300">
            Percentage: {total > 0 ? ((hoveredSegment.value / total) * 100).toFixed(1) : 0}%
          </div>
        </div>
      )}
    </div>
  );
};

const BarChart: React.FC<{ title: string; data: ChartData[], max: number, yLabelFormatter: (val: number) => string, stacked?: boolean }> = ({ title, data, max, yLabelFormatter, stacked = false }) => {
  const yAxisTicks = useMemo(() => {
    // Create appropriate ticks based on max value - don't reverse here
    return [0, 0.2, 0.4, 0.6, 0.8, 1.0];
  }, []);

  // State for hover tooltip
  const [hoveredBar, setHoveredBar] = useState<{ value: number; label: string; x: number; y: number; category?: string } | null>(null);

  // If stacked, we group the data by label (month) and then by color (category)
  const groupedData: Record<string, ChartData[]> = useMemo(() => {
    if (!stacked) return {};
    return data.reduce((acc, item) => {
      acc[item.label] = acc[item.label] || [];
      acc[item.label].push(item);
      return acc;
    }, {} as Record<string, ChartData[]>);
  }, [data, stacked]);

  const barLabels = stacked ? Object.keys(groupedData) : data.map(d => d.label);

  // Hover handlers
  const handleMouseEnter = (event: React.MouseEvent, value: number, label: string, category?: string) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setHoveredBar({
      value,
      label,
      category,
      x: rect.left + rect.width / 2,
      y: rect.top - 10
    });
  };

  const handleMouseLeave = () => {
    setHoveredBar(null);
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg transition duration-300 hover:shadow-2xl relative border border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">{title}</h3>
      
      {/* Legend for Stacked Chart */}
      {stacked && (
        <div className="flex flex-wrap gap-4 mb-4 text-xs">
          <div className="flex items-center">
            <div className="w-3 h-3 rounded mr-2" style={{ backgroundColor: '#3366CC' }}></div>
            <span className="font-medium" style={{ color: '#3366CC' }}>Approved</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded mr-2" style={{ backgroundColor: '#3366CC' }}></div>
            <span className="font-medium" style={{ color: 'white' }}>Rejected</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded mr-2" style={{ backgroundColor: '#3366CC' }}></div>
            <span className="font-medium" style={{ color: 'white' }}>Pending</span>
          </div>
        </div>
      )}
      
      <div className="flex-grow flex flex-col justify-end h-full overflow-hidden">
        {/* Y-Axis Labels Column */}
        <div className="flex h-full">
          {/* Y-Axis Numbers */}
          <div className="w-12 flex flex-col justify-between text-right pr-2 py-4">
            {[1.0, 0.8, 0.6, 0.4, 0.2, 0].map((ratio, index) => (
              <div key={index} className="text-xs text-gray-600 dark:text-gray-300 font-medium">
                {yLabelFormatter(max * ratio)}
              </div>
            ))}
          </div>
          
          {/* Chart Area */}
          <div className="flex-1 relative border-l border-b border-gray-300 dark:border-gray-600 min-h-[300px]">
            {/* Horizontal grid lines */}
            {yAxisTicks.map((ratio, index) => (
              <div 
                key={index} 
                className="absolute left-0 right-0 border-t border-gray-100 dark:border-gray-700" 
                style={{ bottom: `${ratio * 100}%` }}
              />
            ))}
            
            {/* Bars Container */}
            <div className="absolute inset-0 flex items-end gap-2 md:gap-4 px-2 pb-1">
              {stacked ? (
                // Stacked bars for Monthly Trends
                barLabels.map((month, monthIndex) => {
                  const monthData = groupedData[month]
                    .filter(item => item.category && item.category !== 'Total')
                    .sort((a) => (a.category === 'Rejected' ? 1 : -1));
                  
                  const totalMonthValue = monthData.reduce((sum, item) => sum + item.value, 0);
                  const barHeight = Math.min((totalMonthValue / max) * 95, 95); // Cap at 95% to prevent overflow

                  return (
                    <div 
                      key={monthIndex} 
                      className="flex flex-col justify-end flex-1 mx-1 rounded-t-lg relative" 
                      style={{ height: `${barHeight}%` }}
                      title={`${month}: ${totalMonthValue} total requests`}
                    >
                      {monthData.map((item, itemIndex) => (
                        <div
                          key={itemIndex}
                          className="transition-all duration-200 hover:brightness-110 cursor-pointer"
                          style={{ 
                            height: `${totalMonthValue > 0 ? (item.value / totalMonthValue) * 100 : 0}%`,
                            backgroundColor: item.color,
                          }}
                          onMouseEnter={(e) => handleMouseEnter(e, item.value, month, item.category)}
                          onMouseLeave={handleMouseLeave}
                        />
                      ))}
                    </div>
                  );
                })
              ) : (
                // Individual bars for Department-wise
                data.map((item, index) => {
                  const barHeight = Math.min((item.value / max) * 95, 95); // Cap at 95% to prevent overflow
                  return (
                    <div
                      key={index}
                      className="flex-grow rounded-t-lg transition-all duration-700 hover:scale-[1.03] hover:shadow-md cursor-pointer"
                      style={{ 
                        height: `${barHeight}%`,
                        backgroundColor: item.color,
                        minWidth: '20px' 
                      }}
                      onMouseEnter={(e) => handleMouseEnter(e, item.value, item.label)}
                      onMouseLeave={handleMouseLeave}
                    ></div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* X-Axis Labels */}
        <div className="flex justify-start ml-12 border-t border-gray-300 dark:border-gray-600 pt-2 text-center text-xs mt-2">
          {barLabels.map((label, index) => (
            <div 
              key={index} 
              className="flex-grow min-w-[20px] text-gray-600 dark:text-gray-300 font-medium" 
              style={{ flexBasis: '0', flexGrow: 1 }}
            >
              {label}
            </div>
          ))}
        </div>
      </div>

      {/* Hover Tooltip */}
      {hoveredBar && (
        <div
          className="fixed z-50 bg-gray-800 text-white px-3 py-2 rounded-lg shadow-lg text-sm pointer-events-none"
          style={{
            left: `${hoveredBar.x}px`,
            top: `${hoveredBar.y}px`,
            transform: 'translate(-50%, -100%)'
          }}
        >
          <div className="font-medium">
            {hoveredBar.category ? `${hoveredBar.label} - ${hoveredBar.category}` : hoveredBar.label}
          </div>
          <div className="text-gray-300">
            Value: {hoveredBar.value}
          </div>
        </div>
      )}
    </div>
  );
};


// --- VIEW COMPONENTS ---

const OverviewContent: React.FC<{ requests: BackendAssetRequest[] }> = ({ requests }) => {
  // 1. Asset Type Distribution Data (Doughnut Chart) - Dynamic from live data
  const assetTypeData: ChartData[] = useMemo(() => {
    if (!requests || requests.length === 0) {
      return [
        { label: 'Hardware', value: 0, color: '#1f2937' },
        { label: 'Software', value: 0, color: '#059669' },
        { label: 'Other', value: 0, color: '#71e6c1ff' },
      ];
    }

    const counts = requests.reduce((acc, req) => {
      const type = getAssetType(req) || 'Other';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return [
      { label: 'Hardware', value: counts['Hardware'] || 0, color: '#1f2937' },
      { label: 'Software', value: counts['Software'] || 0, color: '#059669' },
      { label: 'Other', value: counts['Other'] || 0, color: '#71e6c1ff' },
    ].filter(item => item.value > 0); // Only show categories with data
  }, [requests]);
  
  // 2. Request Priority Distribution Data (Doughnut Chart) - Dynamic from live data
  const priorityData: ChartData[] = useMemo(() => {
    if (!requests || requests.length === 0) {
      return [
        { label: 'High', value: 0, color: '#ef4444' },
        { label: 'Medium', value: 0, color: '#f59e0b' },
        { label: 'Low', value: 0, color: '#4b5563' },
        { label: 'Urgent', value: 0, color: '#dc2626' },
      ];
    }

    const counts = requests.reduce((acc, req) => {
      const priority = getPriority(req) || 'Medium';
      acc[priority] = (acc[priority] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return [
      { label: 'High', value: counts['High'] || 0, color: '#ef4444' },
      { label: 'Medium', value: counts['Medium'] || 0, color: '#f59e0b' },
      { label: 'Low', value: counts['Low'] || 0, color: '#4b5563' },
      { label: 'Urgent', value: counts['Urgent'] || 0, color: '#dc2626' },
    ].filter(item => item.value > 0); // Only show priorities with data
  }, [requests]);

  // 3. Department-wise Requests Data (Bar Chart) - Enhanced with better data handling
  const departmentData: ChartData[] = useMemo(() => {
    if (!requests || requests.length === 0) {
      return [];
    }

    // Calculate department counts from actual requests
    const departmentCounts: Record<string, number> = {};
    requests.forEach(req => {
      const dept = getDepartment(req) || 'Unknown';
      departmentCounts[dept] = (departmentCounts[dept] || 0) + 1;
    });

    // Color mapping for departments
    const colorMap: Record<string, string> = {
      'Engineering': '#ef4444', 
      'Human Resources': '#10b981',
      'Finance': '#f97316',         
      'Operations': '#8b5cf6',     
      'Marketing': '#06b6d4',
      'Quality Assurance': '#3b82f6',
      'Development': '#3b82f6',
      'Design': '#059669',     
      'QA': '#f59e0b',         
      'DevOps': '#ef4444',     
      'Security': '#059669',
      'IT': '#6366f1',
      'Python': '#f59e0b',
      'HR': '#10b981',
      'Unknown': '#9ca3af',
    };

    // Sort departments by count desc for stable chart ordering
    const entries = Object.entries(departmentCounts)
      .filter(([, count]) => count > 0)
      .sort((a, b) => b[1] - a[1]);
    
    return entries.map(([department, count]) => ({
      label: department.length > 12 ? 
        (department === 'Human Resources' ? 'HR' : 
         department === 'Quality Assurance' ? 'QA' : 
         department === 'Engineering' ? 'Eng' :
         department === 'Development' ? 'Dev' :
         department.substring(0, 8)) : 
        department,
      value: count,
      color: colorMap[department] || '#3b82f6', 
    }));
  }, [requests]);

  // Max department request count for the y-axis
  const maxDeptRequests = departmentData.length > 0 ? Math.max(...departmentData.map(d => d.value)) : 1;
  // Set Y-axis max to ensure proper scaling with adequate headroom
  const deptYMax = maxDeptRequests > 0 ? Math.max(5, Math.ceil(maxDeptRequests * 1.25)) : 5; 
  // This ensures bars never go beyond 80% of chart height (maxValue / 1.25 = 80%)
  
  const formatDeptLabel = (val: number) => {
    // Ensure the labels on the Y-axis are clean integers
    return Math.round(val * deptYMax).toString();
  };

  // 4. Monthly Request Trends (Stacked Bar Chart) - Enhanced with better error handling
  const monthlyTrendsData: ChartData[] = useMemo(() => {
    if (!requests || requests.length === 0) {
      // Return empty data for last 6 months when no requests
      const now = new Date();
      const months: string[] = [];
      
      for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push(date.toLocaleDateString('en-US', { month: 'short' }));
      }

      const chartData: ChartData[] = [];
      months.forEach(month => {
        ['Approved', 'Rejected', 'Pending'].forEach(category => {
          chartData.push({
            label: month,
            value: 0,
            color: '#3366CC',
            category
          });
        });
      });
      return chartData;
    }

    const now = new Date();
    const months: string[] = [];
    
    // Generate last 6 months
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(date.toLocaleDateString('en-US', { month: 'short' }));
    }

    const monthlyStats: Record<string, Record<string, number>> = {};
    
    // Initialize months
    months.forEach(month => {
      monthlyStats[month] = { Approved: 0, Rejected: 0, Pending: 0 };
    });

    // Calculate monthly stats with error handling
    requests.forEach(req => {
      try {
        const reqDate = new Date(req.createdAt);
        if (!isNaN(reqDate.getTime())) {
          const monthKey = reqDate.toLocaleDateString('en-US', { month: 'short' });
          
          if (monthlyStats[monthKey]) {
            const status = req.status || 'Pending';
            if (status === 'Approved') {
              monthlyStats[monthKey].Approved++;
            } else if (status === 'Rejected') {
              monthlyStats[monthKey].Rejected++;
            } else {
              monthlyStats[monthKey].Pending++;
            }
          }
        }
      } catch {
        console.warn('Invalid date in IT request:', req.createdAt);
      }
    });

    // Convert to chart data format
    const chartData: ChartData[] = [];
    months.forEach(month => {
      const stats = monthlyStats[month];
      // Add individual status entries for stacked chart
      chartData.push({
        label: month,
        value: stats.Approved,
        color: '#3366CC',
        category: 'Approved'
      });
      chartData.push({
        label: month,
        value: stats.Rejected,
        color: '#3366CC',
        category: 'Rejected'
      });
      chartData.push({
        label: month,
        value: stats.Pending,
        color: '#3366CC',
        category: 'Pending'
      });
    });

    return chartData;
  }, [requests]);

  // Calculate max for monthly trends with better handling
  const maxMonthlyTrends = useMemo(() => {
    if (!monthlyTrendsData || monthlyTrendsData.length === 0) {
      return 5;
    }

    let maxVal = 0;
    const months = Array.from(new Set(monthlyTrendsData.map(d => d.label)));
    months.forEach(m => {
      const vals = monthlyTrendsData.filter(d => d.label === m && d.category !== 'Total');
      const total = vals.reduce((sum, v) => sum + v.value, 0);
      if (total > maxVal) maxVal = total;
    });
    return Math.max(5, Math.ceil(maxVal * 1.2));
  }, [monthlyTrendsData]);

  const formatMonthlyLabel = (val: number) => Math.round(val * maxMonthlyTrends).toString();

  return (
    <div className="grid grid-cols-1 gap-4 md:gap-6 pt-4 md:pt-6">
      
      {/* Chart Row 1: Asset Type and Department-wise Bar */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-6">
        <div className="min-h-[400px]">
          <DoughnutChart 
            title="Asset Type Distribution" 
            data={assetTypeData} 
            total={Math.max(1, assetTypeData.reduce((sum, item) => sum + item.value, 0))} 
          />
        </div>
        <div className="min-h-[400px]">
          <BarChart 
            title="Department-wise Requests" 
            data={departmentData} 
            max={deptYMax} 
            yLabelFormatter={formatDeptLabel} 
          />
        </div>
      </div>

      {/* Chart Row 2: Priority Distribution and Monthly Trends */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-6">
        <div className="min-h-[400px]">
          <DoughnutChart 
            title="Request Priority Distribution" 
            data={priorityData} 
            total={Math.max(1, priorityData.reduce((sum, item) => sum + item.value, 0))} 
          />
        </div>
        <div className="min-h-[400px]">
          <BarChart 
            title="Monthly Request Trends" 
            data={monthlyTrendsData} 
            max={maxMonthlyTrends} 
            yLabelFormatter={formatMonthlyLabel} 
            stacked={true}
          />
        </div>
      </div>
    </div>
  );
};


const RecentApprovalsContent: React.FC<{ 
  requests: BackendAssetRequest[];
  onApprove: (requestId: string) => void;
  onReject: (requestId: string) => void;
}> = ({ requests, onApprove, onReject }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<BackendAssetRequest | null>(null);

  // Handle view action
  const handleView = (request: BackendAssetRequest) => {
    setSelectedRequest(request);
    setShowViewModal(true);
  };

  // Effect to blur the background when modal is open
  useEffect(() => {
    if (showViewModal) {
      // Add blur to the main content area only, not the modal
      const mainContent = document.querySelector('main') || document.querySelector('[data-main-content]');
      if (mainContent) {
        (mainContent as HTMLElement).style.filter = 'blur(8px)';
        (mainContent as HTMLElement).style.pointerEvents = 'none';
      }
      
      // Also blur sidebar and header if they exist
      const sidebar = document.querySelector('[data-sidebar]') || document.querySelector('aside') || document.querySelector('.sidebar');
      if (sidebar) {
        (sidebar as HTMLElement).style.filter = 'blur(8px)';
        (sidebar as HTMLElement).style.pointerEvents = 'none';
      }
      
      const header = document.querySelector('header') || document.querySelector('[data-header]');
      if (header) {
        (header as HTMLElement).style.filter = 'blur(8px)';
        (header as HTMLElement).style.pointerEvents = 'none';
      }
      
      // Prevent body scroll
      document.body.style.overflow = 'hidden';
    } else {
      // Remove blur when modal is closed
      const mainContent = document.querySelector('main') || document.querySelector('[data-main-content]');
      if (mainContent) {
        (mainContent as HTMLElement).style.filter = '';
        (mainContent as HTMLElement).style.pointerEvents = '';
      }
      
      const sidebar = document.querySelector('[data-sidebar]') || document.querySelector('aside') || document.querySelector('.sidebar');
      if (sidebar) {
        (sidebar as HTMLElement).style.filter = '';
        (sidebar as HTMLElement).style.pointerEvents = '';
      }
      
      const header = document.querySelector('header') || document.querySelector('[data-header]');
      if (header) {
        (header as HTMLElement).style.filter = '';
        (header as HTMLElement).style.pointerEvents = '';
      }
      
      document.body.style.overflow = '';
    }

    // Cleanup on unmount
    return () => {
      const mainContent = document.querySelector('main') || document.querySelector('[data-main-content]');
      if (mainContent) {
        (mainContent as HTMLElement).style.filter = '';
        (mainContent as HTMLElement).style.pointerEvents = '';
      }
      
      const sidebar = document.querySelector('[data-sidebar]') || document.querySelector('aside') || document.querySelector('.sidebar');
      if (sidebar) {
        (sidebar as HTMLElement).style.filter = '';
        (sidebar as HTMLElement).style.pointerEvents = '';
      }
      
      const header = document.querySelector('header') || document.querySelector('[data-header]');
      if (header) {
        (header as HTMLElement).style.filter = '';
        (header as HTMLElement).style.pointerEvents = '';
      }
      
      document.body.style.overflow = '';
    };
  }, [showViewModal]);

  // Reset to page 1 when requests change (e.g., filters applied)
  useEffect(() => {
    setCurrentPage(1);
  }, [requests.length]);

  // Calculate paginated data
  const paginatedRequests = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return requests.slice(start, end);
  }, [requests, currentPage, pageSize]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Scroll to top of table when page changes
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1); // Reset to first page when page size changes
  };

  return (
    <div className="pt-6">
      <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-4 flex items-center">
        <PieChart className="w-5 h-5 mr-2" style={{ color: '#3366CC' }} />
        Recent IT Asset Requests ({requests.length})
      </h3>
      
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-x-auto border border-gray-200 dark:border-gray-700">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider min-w-[120px]">
                Request ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider min-w-[150px]">
                Employee
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider min-w-[250px]">
                Asset Details
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Priority
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider min-w-[100px]">
                Requested
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
            {paginatedRequests.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-12">
                  <div className="flex flex-col items-center justify-center py-1">
                    <svg className="w-20 h-20 text-gray-300 dark:text-gray-600 mb-6" fill="none" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
                      <rect x="14" y="10" width="36" height="44" rx="4" stroke="currentColor" strokeWidth="2" fill="none" />
                      <path d="M22 22h20M22 30h20M22 38h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <p className="text-m font-semibold text-gray-900 dark:text-white">No IT asset requests found</p>
                    <p className="text-m text-gray-500 dark:text-gray-400 mt-2">Try adjusting your filters or search criteria.</p>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedRequests.map((req) => (
                <tr key={req.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition duration-150">
                  
                  {/* Request ID */}
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium cursor-pointer" style={{ color: '#3366CC' }}>
                    <span className="hover:underline">{req.requestId || req.id}</span>
                  </td>

                  {/* Employee */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">{getEmployeeName(req)}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{getEmployeeId(req)} • {getDepartment(req)}</div>
                  </td>

                  {/* Asset Details */}
                  <td className="px-6 py-4 whitespace-normal">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">{getAssetName(req)}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{getAssetDetailsString(req)}</div>
                  </td>

                  {/* Type */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StatusTag status={getAssetType(req)} />
                  </td>

                  {/* Priority */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StatusTag status={getPriority(req)} />
                  </td>

                  {/* Requested Date */}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {req.requestedDate}
                  </td>
                  
                  {/* Status */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StatusTag status={req.status} />
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {req.status !== 'Pending' && `${req.status}: ${getStatusDate(req)}`}
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium flex space-x-1">
                    <button 
                      onClick={() => handleView(req)}
                      className="inline-flex items-center justify-center w-8 h-8 border border-gray-300 dark:border-gray-600 rounded-md text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    {req.status === 'Pending' && (
                      <>
                        <button 
                          onClick={() => onApprove(req.id)}
                          className="p-2 text-green-500 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-full transition duration-150"
                          title="Approve"
                        >
                          <CheckCircle className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => onReject(req.id)}
                          className="p-2 text-red-500 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-full transition duration-150"
                          title="Reject"
                        >
                          <XCircle className="w-5 h-5" />
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        
        {/* Pagination Component */}
        {requests.length > 0 && (
          <Pagination
            currentPage={currentPage}
            pageSize={pageSize}
            totalItems={requests.length}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
            label="requests"
            className="border-t border-gray-200 dark:border-gray-700"
          />
        )}
      </div>

      {/* View Asset Request Details Modal */}
      {showViewModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Asset Request Details</h2>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  {getEmployeeName(selectedRequest)} ({getEmployeeId(selectedRequest)})
                </p>
              </div>
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setSelectedRequest(null);
                }}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <X className="w-6 h-6 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Request ID & Status */}
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                  <FileText className="w-5 h-5 mr-2" style={{ color: '#3366CC' }} />
                  Request Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">Request ID:</span>
                    <p className="font-medium text-gray-900 dark:text-white break-words">{selectedRequest.requestId || selectedRequest.id}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">Status:</span>
                    <p className="font-medium mt-1">
                      <StatusTag status={selectedRequest.status} />
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">Asset Type:</span>
                    <p className="font-medium mt-1">
                      <StatusTag status={getAssetType(selectedRequest)} />
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">Priority:</span>
                    <p className="font-medium mt-1">
                      <StatusTag status={getPriority(selectedRequest)} />
                    </p>
                  </div>
                  {selectedRequest.approvalInfo?.approvedDate && (
                    <div>
                      <span className="text-sm text-gray-600 dark:text-gray-400">Approved Date:</span>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {new Date(selectedRequest.approvalInfo.approvedDate).toLocaleString('en-GB', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  )}
                  {selectedRequest.approvalInfo?.rejectedDate && (
                    <div>
                      <span className="text-sm text-gray-600 dark:text-gray-400">Rejected Date:</span>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {new Date(selectedRequest.approvalInfo.rejectedDate).toLocaleString('en-GB', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Employee Information */}
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                  <User className="w-5 h-5 mr-2" style={{ color: '#3366CC' }} />
                  Employee Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">Employee Name:</span>
                    <p className="font-medium text-gray-900 dark:text-white">{getEmployeeName(selectedRequest)}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">Employee ID:</span>
                    <p className="font-medium text-gray-900 dark:text-white">{getEmployeeId(selectedRequest)}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">Department:</span>
                    <p className="font-medium text-gray-900 dark:text-white">{getDepartment(selectedRequest)}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">Designation:</span>
                    <p className="font-medium text-gray-900 dark:text-white">{selectedRequest.employeeInfo?.designation || 'N/A'}</p>
                  </div>
                  {selectedRequest.employeeInfo?.email && (
                    <div>
                      <span className="text-sm text-gray-600 dark:text-gray-400">Email:</span>
                      <p className="font-medium text-gray-900 dark:text-white">{selectedRequest.employeeInfo.email}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Asset Details */}
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                  <HardHat className="w-5 h-5 mr-2" style={{ color: '#3366CC' }} />
                  Asset Details
                </h3>
                <div className="space-y-4">
                  <div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">Asset Name:</span>
                    <p className="font-medium text-gray-900 dark:text-white">{getAssetName(selectedRequest)}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">Asset Type:</span>
                    <p className="font-medium mt-1">
                      <StatusTag status={getAssetType(selectedRequest)} />
                    </p>
                  </div>
                  {selectedRequest.assetDetails?.quantity && (
                    <div>
                      <span className="text-sm text-gray-600 dark:text-gray-400">Quantity:</span>
                      <p className="font-medium text-gray-900 dark:text-white">{selectedRequest.assetDetails.quantity}</p>
                    </div>
                  )}
                  {selectedRequest.assetDetails?.justification && (
                    <div>
                      <span className="text-sm text-gray-600 dark:text-gray-400">Justification:</span>
                      <p className="font-medium text-gray-900 dark:text-white mt-1 whitespace-pre-wrap">{selectedRequest.assetDetails.justification}</p>
                    </div>
                  )}
                  {selectedRequest.assetDetails?.expectedDate && (
                    <div>
                      <span className="text-sm text-gray-600 dark:text-gray-400">Expected Date:</span>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {new Date(selectedRequest.assetDetails.expectedDate).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Request Dates */}
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                  <Calendar className="w-5 h-5 mr-2" style={{ color: '#3366CC' }} />
                  Request Timeline
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">Requested Date:</span>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {selectedRequest.requestedDate ? new Date(selectedRequest.requestedDate).toLocaleString('en-GB', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      }) : 'N/A'}
                    </p>
                  </div>
                  {selectedRequest.createdAt && (
                    <div>
                      <span className="text-sm text-gray-600 dark:text-gray-400">Created At:</span>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {new Date(selectedRequest.createdAt).toLocaleString('en-GB', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  )}
                  {selectedRequest.updatedAt && (
                    <div>
                      <span className="text-sm text-gray-600 dark:text-gray-400">Last Updated:</span>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {new Date(selectedRequest.updatedAt).toLocaleString('en-GB', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Approval Information */}
              {selectedRequest.approvalInfo && (
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                    <CheckCircle className="w-5 h-5 mr-2" style={{ color: '#3366CC' }} />
                    Approval Information
                  </h3>
                  <div className="space-y-3">
                    {selectedRequest.approvalInfo.approvedBy && (
                      <div>
                        <span className="text-sm text-gray-600 dark:text-gray-400">Approved By:</span>
                        <p className="font-medium text-gray-900 dark:text-white">{selectedRequest.approvalInfo.approvedBy}</p>
                      </div>
                    )}
                    {selectedRequest.approvalInfo.rejectedBy && (
                      <div>
                        <span className="text-sm text-gray-600 dark:text-gray-400">Rejected By:</span>
                        <p className="font-medium text-gray-900 dark:text-white">{selectedRequest.approvalInfo.rejectedBy}</p>
                      </div>
                    )}
                    {selectedRequest.approvalInfo.itComments && (
                      <div>
                        <span className="text-sm text-gray-600 dark:text-gray-400">IT Comments:</span>
                        <p className="font-medium text-gray-900 dark:text-white mt-1 whitespace-pre-wrap">{selectedRequest.approvalInfo.itComments}</p>
                      </div>
                    )}
                    {selectedRequest.rejectionReason && (
                      <div>
                        <span className="text-sm text-gray-600 dark:text-gray-400">Rejection Reason:</span>
                        <p className="font-medium text-gray-900 dark:text-white mt-1 whitespace-pre-wrap">{selectedRequest.rejectionReason}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setSelectedRequest(null);
                }}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- MAIN COMPONENT ---

const ITApprovalsDashboard: React.FC = () => {
  // State for data
  const [assetRequests, setAssetRequests] = useState<BackendAssetRequest[]>([]);
  // Keep the full unfiltered list so selects (departments, types) can be populated
  const [allAssetRequests, setAllAssetRequests] = useState<BackendAssetRequest[]>([]);
  const [dashboardStats, setDashboardStats] = useState<ITDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // refreshing state removed as it's not used

  // State for UI
  const [activeTab, setActiveTab] = useState<'overview' | 'recent'>('overview');
  // Filters (replaces simple Department / Asset Type controls)
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>(''); // Hardware / Software / Other
  const [selectedStatus, setSelectedStatus] = useState<string>(''); // Pending / Approved / Rejected / Issued
  const [selectedPriority, setSelectedPriority] = useState<string>(''); // Low / Medium / High / Urgent

  // Load data
  const loadData = useCallback(async () => {
    try {
      setError(null);
      const [assets, stats] = await Promise.all([
        // keep department/type server filter where possible (pass undefined if empty)
        itApprovalAPI.getPendingAssetRequests(selectedDepartment || undefined, selectedType || undefined),
        itApprovalAPI.getAssetDashboardStats()
      ]);
      // keep a copy of the full asset list (before client-side filtering)
      setAllAssetRequests(assets);
      
      // Apply remaining filters client-side (search, status, priority)
      let filtered = assets;

      if (searchTerm && searchTerm.trim() !== '') {
        const q = searchTerm.trim().toLowerCase();
        filtered = filtered.filter(a =>
          (a.requestId || a.id || '').toLowerCase().includes(q) ||
          (a.employeeInfo?.fullName || '').toLowerCase().includes(q) ||
          (a.assetDetails?.assetName || '').toLowerCase().includes(q) ||
          (a.assetDetails?.justification || '').toLowerCase().includes(q)
        );
      }

      if (selectedStatus) {
        filtered = filtered.filter(a => (a.status || '').toLowerCase() === selectedStatus.toLowerCase());
      }

      if (selectedPriority) {
        filtered = filtered.filter(a => (a.assetDetails?.priority || '').toLowerCase() === selectedPriority.toLowerCase());
      }

      setAssetRequests(filtered);
       setDashboardStats(stats);
     } catch (err) {
       console.error('Error loading IT approval data:', err);
       setError(err instanceof Error ? err.message : 'Failed to load data');
       // Fallback to mock data
       setAssetRequests(MOCK_REQUESTS);
       setDashboardStats({
         summary: {
           pendingRequests: MOCK_REQUESTS.length,
           urgentRequests: MOCK_REQUESTS.filter(r => r.urgency === 'urgent' || r.urgency === 'critical').length
         },
         departmentStats: [],
         assetTypeStats: []
       });
    } finally {
      setLoading(false);
    }
  }, [searchTerm, selectedDepartment, selectedType, selectedStatus, selectedPriority]);
  
  // Initial load and refresh when filters change
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Refresh function
  const handleRefresh = useCallback(async () => {
    await loadData();
  }, [loadData]);

  // Handle approve action
  const handleApprove = useCallback(async (requestId: string) => {
    try {
      await itApprovalAPI.approveAssetRequest(requestId);
      await handleRefresh(); // Refresh data after action
    } catch (err) {
      console.error('Error approving request:', err);
      toast.error('Failed to approve request');
    }
  }, [handleRefresh]);

  // Handle reject action
  const handleReject = useCallback(async (requestId: string) => {
    try {
      await itApprovalAPI.rejectAssetRequest(requestId);
      await handleRefresh(); // Refresh data after action
    } catch (err) {
      console.error('Error rejecting request:', err);
      toast.error('Failed to reject request');
    }
  }, [handleRefresh]);


  // Derived KPIs from the real data
  const kpis: KPI[] = useMemo(() => {
    const total = dashboardStats?.summary?.totalRequests ?? assetRequests.length;
    const pending = dashboardStats?.summary?.pendingRequests ?? assetRequests.filter(r => r.status === 'Pending').length;
    const approved = dashboardStats?.summary?.approvedRequests ?? assetRequests.filter(r => r.status === 'Approved').length;
    const rejected = dashboardStats?.summary?.rejectedRequests ?? assetRequests.filter(r => r.status === 'Rejected').length;
    const urgent = dashboardStats?.summary?.urgentRequests ?? assetRequests.filter(r => 
      r.status === 'Pending' && 
      (getPriority(r) === 'High' || getPriority(r) === 'Urgent')
    ).length;

    return [
      { id: 1, icon: Users, title: 'Total Requests', value: total, color: 'text-blue-600' },
      { id: 2, icon: Clock, title: 'Pending Review', value: pending, color: 'text-yellow-500' },
      { id: 3, icon: CheckCircle, title: 'Approved', value: approved, color: 'text-green-600' },
      { id: 4, icon: XCircle, title: 'Rejected', value: rejected, color: 'text-red-600' },
      { id: 5, icon: AlertTriangle, title: 'Urgent', value: urgent, color: 'text-red-600' },
    ];
  }, [assetRequests, dashboardStats]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <RefreshCw className="w-6 h-6 animate-spin" style={{ color: '#3366CC' }} />
          <span className="text-gray-600 dark:text-gray-300">Loading IT approvals...</span>
        </div>
      </div>
    );
  }

  const KPICard: React.FC<{ kpi: KPI }> = ({ kpi }) => {
    const { icon: Icon, title, value } = kpi;

    return (
      <div className="relative bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 hover:scale-105 cursor-pointer group h-full overflow-hidden border border-gray-200 dark:border-gray-700">
        <div className="absolute inset-0 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-700 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
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
            <p className="text-sm font-medium text-gray-600 dark:text-gray-300 group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors duration-300 mt-1">
              {title}
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
    );
  };

  const TabButton: React.FC<{ tab: 'overview' | 'recent', label: string }> = ({ tab, label }) => {
    const isActive = activeTab === tab;
    return (
      <button
        onClick={() => setActiveTab(tab)}
        className={`px-4 py-2 text-sm font-medium rounded-t-lg transition duration-200 
          ${isActive 
            ? 'bg-[#3366CC]/10 dark:bg-[#3366CC]/20 text-[#3366CC] dark:text-[#4a7dd9] shadow-md border-b-2 border-[#3366CC] dark:border-[#3366CC]' 
            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`
        }
      >
        <span>
          {label}
          {tab === 'recent' && ` (${assetRequests.length})`}
        </span>
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Dashboard Header */}
        <DashboardHeader
          title="IT Approvals"
          subtitle="Advanced information technology management system with intelligent asset tracking, automated provisioning, and enterprise-grade security for multinational operations."
          icon={Server}
          iconColor="text-white"
          hideTenantPrefix={true}
          breadcrumbs={[
            { label: 'Home', href: '/' },
            { label: 'ESS Approval Flows', href: '/ess-approval-flows' },
            { label: 'IT' }
          ]}
          actions={
            <button
              onClick={handleRefresh}
              className="flex items-center px-6 py-3 bg-white/20 rounded-xl backdrop-blur-sm border border-white/30 text-white hover:bg-white/30 transition-all duration-200 hover:scale-105 whitespace-nowrap"
              title="Refresh Data"
            >
              <RefreshCw className="w-5 h-5 mr-2 flex-shrink-0" />
              <span className="font-medium whitespace-nowrap">Refresh</span>
            </button>
          }
        />

        {/* Error banner (if any) */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded">{error}</div>
        )}

        {/* Tab Navigation */}
        <div className="flex space-x-1 border-b border-gray-200 dark:border-gray-700 overflow-x-auto bg-white dark:bg-gray-800 rounded-t-xl px-4 mt-8">
          <TabButton tab="overview" label="Overview" />
          <TabButton tab="recent" label="Recent Approvals" />
        </div>

        {/* Content Area */}
        <div className="pt-4">
          {/* KPI Row (Always visible) */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4" style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.03) 0%, rgba(99, 102, 241, 0.03) 50%, rgba(14, 165, 233, 0.03) 100%)' }}>
            {kpis.map(kpi => (
              <KPICard key={kpi.id} kpi={kpi} />
            ))}
          </div>

          {/* Filters (only show for Recent tab) - moved here to match HR component placement */}
          {activeTab === 'recent' && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 hover:shadow-2xl transition-all duration-300 p-6 mb-6 mt-4">
              <h4 className="text-xl font-bold flex items-center mb-3" style={{ color: '#3366CC' }}>
                <div className="p-2 rounded-xl mr-3" style={{ backgroundColor: '#3366CC', opacity: 0.1 }}>
                  <Filter className="h-5 w-5" style={{ color: '#3366CC' }} />
                </div>
                Advanced Filters
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">Refine your search with powerful filtering options</p>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center mb-2">
                    <Search className="h-4 w-4 mr-1" style={{ color: '#3366CC' }} />
                    Search
                  </label>
                  <div className="relative group">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500 group-focus-within:transition-colors" style={{ color: '#3366CC' }} />
                    <input
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search applications..."
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-[#3366CC] focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600 transition-all duration-200 shadow-sm hover:shadow-md"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Status</label>
                  <div className="relative">
                    <select
                      value={selectedStatus}
                      onChange={(e) => setSelectedStatus(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-[#3366CC] focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-all duration-200 shadow-sm hover:shadow-md appearance-none cursor-pointer"
                    >
                      <option value="">All Status</option>
                      <option value="Pending">Pending</option>
                      <option value="Approved">Approved</option>
                      <option value="Rejected">Rejected</option>
                      <option value="Issued">Issued</option>
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
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-[#3366CC] focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-all duration-200 shadow-sm hover:shadow-md appearance-none cursor-pointer"
                    >
                      <option value="">All Types</option>
                      <option value="Hardware">Hardware</option>
                      <option value="Software">Software</option>
                      <option value="Other">Other</option>
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
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-[#3366CC] focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-all duration-200 shadow-sm hover:shadow-md appearance-none cursor-pointer"
                    >
                      <option value="">All Departments</option>
                      {Array.from(new Set(allAssetRequests.map(a => a.employeeInfo?.department || 'Unknown'))).sort().map(dept => (
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
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-[#3366CC] focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-all duration-200 shadow-sm hover:shadow-md appearance-none cursor-pointer"
                    >
                      <option value="">All Priorities</option>
                      <option value="Critical">Critical</option>
                      <option value="High">High</option>
                      <option value="Normal">Normal</option>
                      <option value="Low">Low</option>
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
          )}

          {/* Main Content */}
          {activeTab === 'overview' && <OverviewContent requests={assetRequests} />}
          {activeTab === 'recent' && (
            <RecentApprovalsContent 
              requests={assetRequests}
              onApprove={handleApprove}
              onReject={handleReject}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default ITApprovalsDashboard;