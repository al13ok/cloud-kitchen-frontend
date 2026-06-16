"use client";
import React, { useState, useEffect, useCallback } from "react";
import { FaArrowLeft, FaSearch, FaPlus, FaEdit, FaTrash, FaEye, FaUser, FaBuilding, FaCalendar, FaClock, FaTimesCircle, FaSync, FaEnvelope, FaPhone, FaCode, FaRocket, FaBug, FaReceipt, FaLaptop, FaDownload, FaUpload } from "react-icons/fa";
import { Modal } from "@/components/ui/modal";
import Loader from "@/components/Loader";
import Alert from '@/components/ui/alert/Alert';
import EmployeeRecordForm from './EmployeeRecordForm';
import PhoneInput2 from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import { apiFetch } from '@/lib/api';
import { useRouter } from 'next/navigation';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';

// Employee interface
interface Employee {
    id: string;
    emp_id: string;
    full_name: string;
    email: string;
    phone: string;
    department: string;
    position?: string;
    salary?: number;
    hire_date?: string;
    created_at: string;
    updated_at?: string;
}

// Salary interface (legacy - kept for compatibility)
interface Salary {
    id: string;
    employee_id: string;
    basic_salary: number;
    allowances: number;
    deductions: number;
    net_salary: number;
    month: string;
    year: number;
    status: 'pending' | 'paid' | 'cancelled';
    payment_date?: string;
    created_at: string;
}

// Payslip interface (from ESS Portal)
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

// API Payslip response type
type ApiPayslip = {
    id: string;
    payslipId?: string;  // Backend-generated payslip ID (format: PS-NNN)
    employeeInfo: {
        employeeCode: string;
        fullName: string;
        email: string;
        designation: string;
        dateOfJoining?: string;
        bankAccountNo?: string;
        uan?: string;
        department: string;
        panNumber?: string;
        ifscCode?: string;
    };
    payslipInfo: {
        payPeriodStart: string;
        payPeriodEnd: string;
        payDate: string;
    };
    earnings?: Array<{
        type: string;
        amount: number;
    }>;
    deductions?: Array<{
        type: string;
        amount: number;
    }>;
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
    createdAt?: string;
    updatedAt?: string;
};

// Attendance interface - Updated to match API response
interface Attendance {
    _id?: string;
    id?: string;
    email?: string;
    date: string;
    clockIn?: string;
    clockInLocation?: {
        ip?: string;
        city?: string;
        region?: string;
        country?: string;
        latitude?: number;
        longitude?: number;
    };
    clockOut?: string | null;
    clockOutLocation?: {
        ip?: string;
        city?: string;
        region?: string;
        country?: string;
        latitude?: number;
        longitude?: number;
    } | null;
    clockInStatus?: string;
    clockOutStatus?: string;
    lateByMinutes?: number;
    lateBy?: string;
    earlyBy?: string | null;
    earlyByMinutes?: number;
    isSpecialDay?: boolean;
    specialDayType?: string | null;
    holidayName?: string | null;
    overTimeMinutes?: number;
    overTime?: string | null;
    // Legacy fields for backward compatibility
    clock_in?: string;
    clock_out?: string;
    total_hours?: number;
    overtime_hours?: number;
    status?: string;
    late_by?: string;
    location?: {
        latitude?: number;
        longitude?: number;
        address?: string;
        is_remote?: boolean;
    };
    remarks?: string;
    notes?: string;
    is_leave_day?: boolean;
    leave_type?: string;
}

// Leave interface (legacy - kept for compatibility)
interface Leave {
    id: string;
    employee_id: string;
    leave_type: 'sick' | 'vacation' | 'personal' | 'maternity' | 'paternity' | 'emergency';
    start_date: string;
    end_date: string;
    days: number;
    reason: string;
    status: 'pending' | 'approved' | 'rejected';
    approved_by?: string;
    approved_date?: string;
    created_at: string;
}

// Leave Application interface (from ESS Portal)
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
    status: string;
    requestedDays: number;
    availableDays?: number;
    insufficientBalance?: boolean;
    balanceWarning?: string | null;
    createdAt: string;
    updatedAt?: string;
    // Approval fields
    approvalComments?: string;
    approvedAt?: string;
    approvedBy?: string;
    // Manager approval fields
    manager_approved_at?: string;
    manager_approved_by?: string;
    manager_comments?: string;
    manager_id?: string;
    // HR approval fields
    hrApprovalComments?: string;
    hrApprovedAt?: string;
    hrApprovedBy?: string;
    // Rejection fields
    rejectedAt?: string;
    rejectedBy?: string;
    rejectionReason?: string;
}

interface ExpenseApplication {
    id: string;
    expenseId?: string;
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
        description?: string;
        receiptFileName?: string | null;
    };
    status: string;
    createdAt: string;
    updatedAt?: string;
}

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
        justification?: string;
        priority: string;
        expectedDate?: string;
    };
    status: string;
    requestedDate?: string;
    createdAt?: string;
    updatedAt?: string;
}

// Time Tracking interface
interface TimeTrackingEntry {
    clock_in: string;
    clock_out: string | null;
    location_in: {
        latitude: number;
        longitude: number;
    } | null;
    location_out: {
        latitude: number;
        longitude: number;
    } | null;
    is_flagged: boolean;
    flag_reason: string | null;
}

interface TimeTrackingData {
    employee: {
        email: string;
        emp_id: string;
        full_name: string;
    };
    period_start: string | null;
    period_end: string | null;
    current_status: 'online' | 'offline';
    total_hours_worked: number;
    current_working_hours: number;
    total_entries: number;
    completed_entries: number;
    flagged_entries: number;
    last_clock_in: string | null;
    last_clock_out: string | null;
    compliance_rate: number;
    entries: TimeTrackingEntry[];
}

// Project interface (connected to customer projects)
interface Project {
    id: string;
    order_number: string;
    customer_id: string;
    customer_name: string;
    project_name: string;
    project_type: 'web_development' | 'mobile_app' | 'api_development' | 'maintenance' | 'consulting' | 'custom_software';
    status: 'planning' | 'in_progress' | 'testing' | 'completed' | 'on_hold' | 'cancelled';
    priority: 'low' | 'medium' | 'high' | 'urgent';
    description: string;
    technologies: string;
    start_date: string;
    delivery_date: string;
    budget: number;
    paid_amount: number;
    progress_percentage: number;
    team_members: string;
    project_manager: string;
    employee_role: 'project_manager' | 'team_member'; // Role of current employee in this project
    created_at: string;
    updated_at: string;
}

// Union type for all record types
type RecordType = Salary | Attendance | Leave | Project;

// Form data type
type FormData = Record<string, unknown>;

// Employee Details Modal Component
const EmployeeDetailsModal = ({ employee, isOpen, onClose }: { employee: Employee | null; isOpen: boolean; onClose: () => void }) => {
    if (!employee) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <div className="relative overflow-hidden w-full max-w-7xl mx-2 sm:mx-4 max-h-[95vh] overflow-y-auto">

                <div className="relative p-4 sm:p-6 lg:p-8">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-6 sm:mb-8 gap-4">
                        <div className="min-w-0 flex-1">
                            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mb-2 break-words leading-tight">
                                {employee.full_name}
                            </h2>
                            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 break-words">
                                {employee.emp_id} • {employee.department}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 flex-shrink-0 self-start sm:self-auto"
                        >
                            <FaTimesCircle className="w-5 h-5 sm:w-6 sm:h-6" />
                        </button>
                    </div>

                    {/* Employee Details Grid */}
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
                        {/* Left Column */}
                        <div className="space-y-4 sm:space-y-6">
                            {/* Personal Information */}
                            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-white/20 dark:border-gray-700/50 rounded-2xl p-4 sm:p-6">
                                <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">Personal Information</h3>
                                <div className="space-y-3">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                        <div>
                                            <span className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">Employee ID</span>
                                            <p className="text-sm sm:text-base text-gray-900 dark:text-white break-words">
                                                {employee.emp_id}
                                            </p>
                                        </div>
                                        <div>
                                            <span className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">Email</span>
                                            <p className="text-sm sm:text-base text-gray-900 dark:text-white break-words">
                                                {employee.email}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                        <div>
                                            <span className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">Phone</span>
                                            <p className="text-sm sm:text-base text-gray-900 dark:text-white break-words">
                                                {employee.phone}
                                            </p>
                                        </div>
                                        <div>
                                            <span className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">Department</span>
                                            <p className="text-sm sm:text-base text-gray-900 dark:text-white break-words">
                                                {employee.department}
                                            </p>
                                        </div>
                                    </div>
                                    {employee.position && (
                                        <div>
                                            <span className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">Position</span>
                                            <p className="text-sm sm:text-base text-gray-900 dark:text-white break-words">
                                                {employee.position}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Employment Information */}
                            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-white/20 dark:border-gray-700/50 rounded-2xl p-4 sm:p-6">
                                <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">Employment Information</h3>
                                <div className="space-y-3">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                        <div>
                                            <span className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">Hire Date</span>
                                            <p className="text-sm sm:text-base text-gray-900 dark:text-white break-words">
                                                {employee.hire_date ? new Date(employee.hire_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}
                                            </p>
                                        </div>
                                        <div>
                                            <span className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">Created</span>
                                            <p className="text-sm sm:text-base text-gray-900 dark:text-white break-words">
                                                {new Date(employee.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Column */}
                        <div className="space-y-4 sm:space-y-6">
                            {/* Salary Information */}
                            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-white/20 dark:border-gray-700/50 rounded-2xl p-4 sm:p-6">
                                <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">Salary Information</h3>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">Current Salary</span>
                                        <span className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white break-words">
                                            {employee.salary ? `₹${employee.salary.toLocaleString()}` : 'N/A'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">Monthly</span>
                                        <span className="text-base sm:text-lg font-semibold text-green-600 dark:text-green-400 break-words">
                                            {employee.salary ? `₹${(employee.salary / 12).toLocaleString()}` : 'N/A'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Quick Stats */}
                            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-white/20 dark:border-gray-700/50 rounded-2xl p-4 sm:p-6">
                                <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">Quick Stats</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="text-center">
                                        <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-2">
                                            <FaCalendar className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                                        </div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Days Worked</p>
                                        <p className="text-lg font-semibold text-gray-900 dark:text-white">-</p>
                                    </div>
                                    <div className="text-center">
                                        <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-2">
                                            <FaClock className="w-6 h-6 text-green-600 dark:text-green-400" />
                                        </div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Total Hours</p>
                                        <p className="text-lg font-semibold text-gray-900 dark:text-white">-</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

// Main Employee Details Page Component
interface EmployeeDetailsPageProps {
    employeeId: string;
    employeeName: string;
    onBack: () => void;
}

export default function EmployeeDetailsPage({ employeeId, employeeName, onBack }: EmployeeDetailsPageProps) {
    const router = useRouter();
    const [employee, setEmployee] = useState<Employee | null>(null);
    const [, setSalaries] = useState<Salary[]>([]);
    const [payslips, setPayslips] = useState<Payslip[]>([]);
    const [isLoadingPayslips, setIsLoadingPayslips] = useState(false);
    const [payslipStatusFilter, setPayslipStatusFilter] = useState<string>('All Status');
    const [attendanceRecords, setAttendanceRecords] = useState<Attendance[]>([]);
    const [isLoadingAttendance, setIsLoadingAttendance] = useState(false);
    const [leaveApplications, setLeaveApplications] = useState<LeaveApplication[]>([]);
    const [isLoadingLeaves, setIsLoadingLeaves] = useState(false);
    const [leaveStatusFilter, setLeaveStatusFilter] = useState<string>('All Status');
    const [expenseApplications, setExpenseApplications] = useState<ExpenseApplication[]>([]);
    const [isLoadingExpenses, setIsLoadingExpenses] = useState(false);
    const [expenseStatusFilter, setExpenseStatusFilter] = useState<string>('All Status');
    const [assetRequests, setAssetRequests] = useState<AssetRequest[]>([]);
    const [isLoadingAssets, setIsLoadingAssets] = useState(false);
    const [assetStatusFilter, setAssetStatusFilter] = useState<string>('All Status');
    const [projects, setProjects] = useState<Project[]>([]);
    const [timeTracking, setTimeTracking] = useState<TimeTrackingData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
    const [showEmployeeModal, setShowEmployeeModal] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<{ show: boolean; type: 'salary' | 'attendance' | 'leave' | 'project' | 'expense' | 'asset'; item: RecordType | null }>({ show: false, type: 'salary' as const, item: null });
    const [isDeleting, setIsDeleting] = useState(false);
    const [alert, setAlert] = useState<{ show: boolean; variant: 'success' | 'error'; title: string; message: string }>({ show: false, variant: 'success', title: '', message: '' });
    const [currentView, setCurrentView] = useState<'overview' | 'salary' | 'attendance' | 'leave' | 'project' | 'expense' | 'asset'>('overview');
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    
    // Form state
    const [showRecordForm, setShowRecordForm] = useState(false);
    const [recordFormType, setRecordFormType] = useState<'salary' | 'attendance' | 'leave' | 'project'>('salary');
    const [editingRecord, setEditingRecord] = useState<RecordType | null>(null);
    const [isFormLoading, setIsFormLoading] = useState(false);
    
    // Pagination state
    const [pageSize, setPageSize] = useState(10);
    const [payslipPageSize, setPayslipPageSize] = useState(10);
    const [payslipCurrentPage, setPayslipCurrentPage] = useState(1);
    const [attendanceCurrentPage, setAttendanceCurrentPage] = useState(1);
    const [leaveCurrentPage, setLeaveCurrentPage] = useState(1);
    const [projectCurrentPage, setProjectCurrentPage] = useState(1);
    const [expenseCurrentPage, setExpenseCurrentPage] = useState(1);
    const [assetCurrentPage, setAssetCurrentPage] = useState(1);
    
    // Download modal state
    const [showDownloadModal, setShowDownloadModal] = useState(false);
    
    // Edit Profile modal state
    const [showEditProfileModal, setShowEditProfileModal] = useState(false);
    const [editProfileFormData, setEditProfileFormData] = useState({
        emp_id: '',
        full_name: '',
        email: '',
        department: '',
        phone: '',
    });
    const [editProfileErrors, setEditProfileErrors] = useState<{
        emp_id: string;
        full_name: string;
        email: string;
        department: string;
        phone: string;
    }>({
        emp_id: '',
        full_name: '',
        email: '',
        department: '',
        phone: '',
    });
    const [editProfileTouched, setEditProfileTouched] = useState<Set<string>>(new Set());
    const [mobile, setMobile] = useState("");
    const [dialCode, setDialCode] = useState<string>('91');
    const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

    // Fetch employee time tracking data
    const fetchEmployeeTimeTracking = useCallback(async (employeeEmail: string, startDate?: string, endDate?: string) => {
        try {
            const RAW_BASE_URL = process.env.NEXT_PUBLIC_API_URL;
            if (!RAW_BASE_URL) {
                throw new Error('NEXT_PUBLIC_API_URL environment variable is not set');
            }
            const BASE_URL = RAW_BASE_URL.replace(/\/+$/, '');
            
            // Build query parameters
            const params = new URLSearchParams();
            if (startDate) params.append('start_date', startDate);
            if (endDate) params.append('end_date', endDate);
            
            const queryString = params.toString();
            const url = `${BASE_URL}/api/v1/time/admin/employee-time-details/${encodeURIComponent(employeeEmail)}${queryString ? `?${queryString}` : ''}`;
            
            const response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        'accept': 'application/json',
                    },
                });
                
            if (response.ok) {
                const timeTrackingData = await response.json();
                setTimeTracking(timeTrackingData);
                console.log('✅ Successfully fetched time tracking data for:', employeeEmail);
                } else {
                console.log('❌ Failed to fetch time tracking data:', response.status);
                setTimeTracking(null);
            }
        } catch (error) {
            console.error('Error fetching employee time tracking:', error);
            setTimeTracking(null);
        }
    }, []);

    // Helper function to parse month from date strings (handles both ISO format YYYY-MM-DD and DD/MM/YYYY)
    const parseMonth = useCallback((start: string, end: string) => {
        const pick = end || start;
        if (!pick) return '';
        
        // Handle ISO format (YYYY-MM-DD)
        if (pick.includes('-') && pick.length >= 7) {
            const parts = pick.split('-');
            if (parts.length >= 2) {
                const yyyy = parts[0];
                const mm = parts[1];
                if (yyyy && mm) {
                    // Return month name and year (e.g., "December 2024")
                    const date = new Date(`${yyyy}-${mm}-01`);
                    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                }
            }
        }
        
        // Handle DD/MM/YYYY format
        const parts = pick.split('/');
        if (parts.length >= 3) {
            const mm = parts[1];
            const yyyy = parts[2];
            if (yyyy && mm) {
                const date = new Date(`${yyyy}-${mm}-01`);
                return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
            }
        }
        
        return pick;
    }, []);

    // Helper function to map API payslip to Payslip interface
    const mapApiToPayslip = useCallback((p: ApiPayslip): Payslip => {
        const basicId = p.id;
        // Use payslipId from backend response (format: PS-NNN)
        // Backend automatically migrates old format payslipIds to PS-NNN format
        const payslipId = p.payslipId || 'PS-000'; // Fallback only if completely missing
        
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
    }, [parseMonth]);

    // Fetch employee payslips
    const fetchEmployeePayslips = useCallback(async (employeeCode: string) => {
        if (!employeeCode) {
            setPayslips([]);
            return;
        }

        setIsLoadingPayslips(true);
        try {
            console.log('🔍 Fetching payslips for employee code:', employeeCode);
            
            // Get auth token from localStorage or sessionStorage (checking multiple possible keys)
            const token = localStorage.getItem('token') || 
                         localStorage.getItem('jwtToken') || 
                         localStorage.getItem('access_token') || 
                         localStorage.getItem('accessToken') ||
                         sessionStorage.getItem('token') || 
                         sessionStorage.getItem('jwtToken') || 
                         sessionStorage.getItem('access_token') || 
                         sessionStorage.getItem('accessToken') || 
                         '';
            
            if (!token) {
                console.warn('⚠️ No authentication token found');
            }
            
            const RAW_BASE_URL = process.env.NEXT_PUBLIC_API_URL;
            if (!RAW_BASE_URL) {
                throw new Error('NEXT_PUBLIC_API_URL environment variable is not set');
            }
            const BASE_URL = RAW_BASE_URL.replace(/\/+$/, '');
            
            const response = await fetch(`${BASE_URL}/api/v1/ess-portal/payslips`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'accept': 'application/json',
                },
            });
            
            if (!response.ok) {
                const errorText = await response.text().catch(() => '');
                console.error('❌ Payslip fetch error:', {
                    status: response.status,
                    statusText: response.statusText,
                    error: errorText,
                    hasToken: !!token
                });
                throw new Error(`Failed to fetch payslips (${response.status}): ${response.statusText}`);
            }
            
            const json = await response.json();
            const allItems: ApiPayslip[] = json?.data || [];
            
            console.log('✅ Fetched all payslips:', allItems.length);
            console.log('📋 All payslip employee codes:', allItems.map(p => p.employeeInfo?.employeeCode));
            console.log('🔍 Looking for employee code:', employeeCode);
            console.log('📊 API filter_applied:', json?.filter_applied);
            
            // Filter payslips by employee code (case-insensitive, trimmed)
            // The API may filter by logged-in user, but payslip data contains the actual employee code
            const searchCode = employeeCode.toLowerCase().trim();
            const employeePayslips = allItems.filter((p) => {
                const empCode = p.employeeInfo?.employeeCode?.toLowerCase().trim();
                const matches = empCode === searchCode;
                if (!matches && empCode) {
                    console.log(`⚠️ Payslip employee code mismatch - Looking for: "${searchCode}", Found: "${empCode}"`);
                }
                return matches;
            });
            
            console.log('✅ Filtered payslips for employee:', employeeCode, 'Count:', employeePayslips.length);
            
            // If no filtered results but we have data, log for debugging
            if (employeePayslips.length === 0 && allItems.length > 0) {
                console.warn('⚠️ No payslips found for employee code:', employeeCode);
                console.warn('Available employee codes in payslips:', [...new Set(allItems.map(p => p.employeeInfo?.employeeCode))]);
                console.warn('API filter_applied:', json?.filter_applied);
                console.warn('💡 Tip: Check if employee.emp_id matches the employeeCode in payslip data');
            }
            
            // Map API payslips to Payslip interface
            const mappedPayslips = employeePayslips.map(mapApiToPayslip);
            
            console.log('📊 Final mapped payslips count:', mappedPayslips.length);
            setPayslips(mappedPayslips);
        } catch (error) {
            console.error('❌ Error fetching payslips:', error);
            setPayslips([]);
        } finally {
            setIsLoadingPayslips(false);
        }
    }, [mapApiToPayslip]);

    // Format late by time: convert minutes to hours and minutes if >= 60
    const formatLateByTime = useCallback((lateBy?: string): string => {
        if (!lateBy || lateBy === '-') return '-';
        
        // Extract number from string (handles formats like "105 minutes", "105 min", "105", etc.)
        const match = lateBy.match(/(\d+)/);
        if (!match) return lateBy; // Return as-is if no number found
        
        const totalMinutes = parseInt(match[1], 10);
        
        if (totalMinutes < 60) {
            // Less than 60 minutes: show as minutes
            return `${totalMinutes} minute${totalMinutes !== 1 ? 's' : ''}`;
        } else {
            // 60 minutes or more: convert to hours and minutes
            const hours = Math.floor(totalMinutes / 60);
            const minutes = totalMinutes % 60;
            
            if (minutes === 0) {
                return `${hours} hour${hours !== 1 ? 's' : ''}`;
            } else {
                return `${hours} hour${hours !== 1 ? 's' : ''} ${minutes} minute${minutes !== 1 ? 's' : ''}`;
            }
        }
    }, []);

    // Format total hours: convert decimal hours to minutes/hours format
    const formatTotalHours = useCallback((totalHours?: number): string => {
        if (!totalHours || totalHours === 0) return '-';
        
        // Convert decimal hours to total minutes
        const totalMinutes = Math.round(totalHours * 60);
        
        if (totalMinutes < 60) {
            // Less than 60 minutes: show as minutes
            return `${totalMinutes} minute${totalMinutes !== 1 ? 's' : ''}`;
        } else {
            // 60 minutes or more: convert to hours and minutes
            const hours = Math.floor(totalMinutes / 60);
            const minutes = totalMinutes % 60;
            
            if (minutes === 0) {
                return `${hours} hour${hours !== 1 ? 's' : ''}`;
            } else {
                return `${hours} hour${hours !== 1 ? 's' : ''} ${minutes} minute${minutes !== 1 ? 's' : ''}`;
            }
        }
    }, []);

    const formatOvertimeHours = useCallback((overtimeHours?: number): string => {
        if (typeof overtimeHours !== 'number' || overtimeHours <= 0) return '-';
        
        const totalMinutes = Math.round(overtimeHours * 60);
        if (totalMinutes <= 0) return '-';
        
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        
        if (minutes === 0) {
            return `${hours} hour${hours !== 1 ? 's' : ''}`;
        }
        if (hours === 0) {
            return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
        }
        return `${hours} hour${hours !== 1 ? 's' : ''} ${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }, []);

    // Fetch employee attendance records
    const fetchEmployeeAttendance = useCallback(async (employeeEmail: string) => {
        if (!employeeEmail) {
            setAttendanceRecords([]);
            return;
        }

        setIsLoadingAttendance(true);
        try {
            const normalizedEmail = employeeEmail.toLowerCase().trim();
            console.log('🔍 Fetching attendance records for employee:', normalizedEmail);
            
            // Updated endpoint to match API structure
            const params = new URLSearchParams({
                email: normalizedEmail
            });
            
            const res = await apiFetch(`/api/v1/attendance?${params.toString()}`, { 
                headers: { accept: 'application/json' } 
            });
            
            if (!res.ok) {
                throw new Error(`Failed to fetch attendance records (${res.status})`);
            }
            
            const json = await res.json();
            // Updated to use 'data' field from API response
            const records: Attendance[] = json?.data || [];
            
            console.log('📋 Attendance records fetched:', records.length, 'Total count:', json?.count);
            setAttendanceRecords(records);
        } catch (error) {
            console.error('Error fetching attendance records:', error);
            setAttendanceRecords([]);
        } finally {
            setIsLoadingAttendance(false);
        }
    }, []);

    // Fetch employee leave applications
    const fetchEmployeeLeaves = useCallback(async (employeeEmail: string) => {
        if (!employeeEmail) {
            setLeaveApplications([]);
            return;
        }

        setIsLoadingLeaves(true);
        try {
            const normalizedEmail = employeeEmail.toLowerCase().trim();
            console.log('🔍 Fetching leave applications for employee:', normalizedEmail);
            
            const res = await apiFetch('/api/v1/ess-portal/leave-applications', { 
                headers: { accept: 'application/json' } 
            });
            
            if (!res.ok) {
                throw new Error(`Failed to fetch leave applications (${res.status})`);
            }
            
            const json = await res.json();
            const items: LeaveApplication[] = json?.data || [];
            
            console.log('📋 Total leave applications fetched from backend:', items.length);
            
            // Filter leave applications by employee email (case-insensitive, trimmed)
            const employeeLeaves = items
                .filter((app: LeaveApplication) => {
                    const appEmail = app.employeeInfo?.email?.toLowerCase().trim();
                    const matches = appEmail === normalizedEmail;
                    if (!matches && appEmail) {
                        console.log(`⚠️ Email mismatch - Looking for: "${normalizedEmail}", Found: "${appEmail}"`);
                    }
                    return matches;
                });
            
            console.log('✅ Filtered leave applications for employee:', normalizedEmail, 'Count:', employeeLeaves.length);
            setLeaveApplications(employeeLeaves);
        } catch (error) {
            console.error('❌ Error fetching leave applications:', error);
            setLeaveApplications([]);
        } finally {
            setIsLoadingLeaves(false);
        }
    }, []);

    const fetchEmployeeExpenses = useCallback(async (employeeEmail: string) => {
        if (!employeeEmail) {
            setExpenseApplications([]);
            return;
        }

        setIsLoadingExpenses(true);
        try {
            const normalizedEmail = employeeEmail.toLowerCase().trim();
            console.log('🔍 Fetching expense applications for employee:', normalizedEmail);

            const res = await apiFetch('/api/v1/ess-portal/expenses', {
                headers: { accept: 'application/json' }
            });

            if (!res.ok) {
                throw new Error(`Failed to fetch expenses (${res.status})`);
            }

            const json = await res.json();
            const items: ExpenseApplication[] = json?.data || [];

            const employeeExpenses = items.filter((expense) => {
                const appEmail = expense.employeeInfo?.email?.toLowerCase().trim();
                return appEmail === normalizedEmail;
            });

            console.log('✅ Filtered expenses for employee:', normalizedEmail, 'Count:', employeeExpenses.length);
            setExpenseApplications(employeeExpenses);
        } catch (error) {
            console.error('❌ Error fetching expense applications:', error);
            setExpenseApplications([]);
        } finally {
            setIsLoadingExpenses(false);
        }
    }, []);

    const fetchEmployeeAssets = useCallback(async (employeeEmail: string) => {
        if (!employeeEmail) {
            setAssetRequests([]);
            return;
        }

        setIsLoadingAssets(true);
        try {
            const normalizedEmail = employeeEmail.toLowerCase().trim();
            console.log('🔍 Fetching asset requests for employee:', normalizedEmail);

            const res = await apiFetch('/api/v1/ess-portal/assets', {
                headers: { accept: 'application/json' }
            });

            if (!res.ok) {
                throw new Error(`Failed to fetch assets (${res.status})`);
            }

            const json = await res.json();
            const items: AssetRequest[] = json?.data || [];

            const employeeAssets = items.filter((asset) => {
                const appEmail = asset.employeeInfo?.email?.toLowerCase().trim();
                return appEmail === normalizedEmail;
            });

            console.log('✅ Filtered asset requests for employee:', normalizedEmail, 'Count:', employeeAssets.length);
            setAssetRequests(employeeAssets);
        } catch (error) {
            console.error('❌ Error fetching asset requests:', error);
            setAssetRequests([]);
        } finally {
            setIsLoadingAssets(false);
        }
    }, []);

    const normalizeProjectStatus = (status?: string): Project['status'] => {
        const value = (status || '').toString().toLowerCase();
        switch (value) {
            case 'planning':
            case 'in_progress':
            case 'testing':
            case 'completed':
            case 'on_hold':
            case 'cancelled':
                return value as Project['status'];
            case 'pending':
                return 'planning';
            case 'delay':
                return 'on_hold';
            default:
                return 'planning';
        }
    };

    const normalizeProjectType = (type?: string): Project['project_type'] => {
        const value = (type || '').toString().toLowerCase();
        switch (value) {
            case 'web_development':
            case 'mobile_app':
            case 'api_development':
            case 'maintenance':
            case 'consulting':
            case 'custom_software':
                return value as Project['project_type'];
            default:
                return 'custom_software';
        }
    };

    const fetchManualEmployeeProjects = useCallback(
        async (baseUrl: string, employeeId?: string, employeeEmail?: string): Promise<Project[]> => {
            if (!employeeId) {
                return [];
            }

            try {
                const response = await fetch(
                    `${baseUrl}/api/v1/employee-project/?employee_id=${encodeURIComponent(employeeId)}&page=1&size=1000`,
                    {
                        method: 'GET',
                        headers: {
                            accept: 'application/json',
                        },
                    }
                );

                if (!response.ok) {
                    console.error('❌ Failed to fetch manual employee projects:', response.status, response.statusText);
                    return [];
                }

                const responseData = await response.json();
                const assignments = responseData.data || [];

                return assignments.map((assignment: Record<string, unknown>) => {
                    const assignmentStatus = normalizeProjectStatus(assignment.status as string);
                    const createdAt = (assignment.created_at as string) || '';
                    const updatedAt = (assignment.updated_at as string) || createdAt;

                    return {
                        id:
                            (assignment.id as string) ||
                            (assignment._id as string) ||
                            `${assignment.employee_id}-${assignment.project_name}`,
                        order_number: (assignment.project_name as string) || '',
                        customer_id: '',
                        customer_name: (assignment.customer_email as string) || 'Unknown Customer',
                        project_name: (assignment.project_name as string) || '',
                        project_type: normalizeProjectType(assignment.project_type as string),
                        status: assignmentStatus,
                        priority: 'medium',
                        description: (assignment.task as string) || '',
                        technologies: '',
                        start_date: (assignment.deadline as string) || '',
                        delivery_date: (assignment.deadline as string) || '',
                        budget: 0,
                        paid_amount: 0,
                        progress_percentage: assignmentStatus === 'completed' ? 100 : 0,
                        team_members: (assignment.employee_email as string) || (employeeEmail ?? ''),
                        project_manager:
                            (assignment.employee_role as string) === 'project_manager'
                                ? (assignment.employee_email as string) || (employeeEmail ?? '')
                                : '',
                        employee_role:
                            (assignment.employee_role as string) === 'project_manager'
                                ? 'project_manager'
                                : 'team_member',
                        created_at: createdAt,
                        updated_at: updatedAt,
                    };
                });
            } catch (error) {
                console.error('❌ Error fetching manual employee projects:', error);
                return [];
            }
        },
        []
    );

    // Fetch employee projects using the manual assignment endpoint plus by-team endpoint
    const fetchEmployeeProjects = useCallback(
        async (employeeEmail: string, employeeId?: string) => {
        try {
            const RAW_BASE_URL = process.env.NEXT_PUBLIC_API_URL;
            if (!RAW_BASE_URL) {
                throw new Error('NEXT_PUBLIC_API_URL environment variable is not set');
            }
            const BASE_URL = RAW_BASE_URL.replace(/\/+$/, '');
            
            const manualProjects = await fetchManualEmployeeProjects(BASE_URL, employeeId, employeeEmail);

            // Use the new endpoint that searches by email in project_manager or team_members
            const projectsResponse = await fetch(
                `${BASE_URL}/api/v1/projects/by-team/?email=${encodeURIComponent(employeeEmail)}&page=1&size=1000`,
                {
                method: 'GET',
                headers: {
                    'accept': 'application/json',
                },
                }
            );

            if (!projectsResponse.ok) {
                console.error('❌ Failed to fetch employee projects:', projectsResponse.status, projectsResponse.statusText);
                setProjects([]);
                return;
            }

            const projectsData = await projectsResponse.json();
            const projects = projectsData.data || [];
            console.log('✅ Fetched employee projects:', projects.length);

            // Map the response to match the Project interface
            const mappedProjects: Project[] = projects.map((project: Record<string, unknown>) => {
                const customerData = project.customer_data as Record<string, unknown> || {};
                const isProjectManager = project.project_manager && 
                    typeof project.project_manager === 'string' && 
                    project.project_manager.toLowerCase() === employeeEmail.toLowerCase();
                
                return {
                    id: (project.project_number as string) || '',
                    order_number: (project.project_number as string) || '',
                    customer_id: (customerData.customer_id as string) || '',
                    customer_name: (customerData.full_name as string) || 'Unknown Customer',
                    project_name: (project.project_name as string) || '',
                    project_type: (project.project_type as Project['project_type']) || 'custom_software',
                    status: (project.status as Project['status']) || 'planning',
                    priority: (project.priority as Project['priority']) || 'medium',
                    description: (project.description as string) || '',
                    technologies: (project.technologies as string) || '',
                    start_date: (project.start_date as string) || '',
                    delivery_date: (project.delivery_date as string) || '',
                    budget: (project.budget as number) || 0,
                    paid_amount: (project.paid_amount as number) || 0,
                    progress_percentage: (project.progress_percentage as number) || 0,
                    team_members: (project.team_members as string) || '',
                    project_manager: (project.project_manager as string) || '',
                    employee_role: isProjectManager ? 'project_manager' : 'team_member',
                    created_at: (project.created_at as string) || '',
                    updated_at: (project.updated_at as string) || (project.created_at as string) || ''
                };
            });
            
            console.log('✅ Mapped employee projects:', mappedProjects.length, 'Manual projects:', manualProjects.length);
            setProjects([...manualProjects, ...mappedProjects]);
            
                } catch (error) {
            console.error('❌ Error fetching employee projects:', error);
            setProjects([]);
        }
    }, [fetchManualEmployeeProjects]);

    // Fetch employee details
    const fetchEmployeeDetails = useCallback(async () => {
        setIsLoading(true);
        try {
            const RAW_BASE_URL = process.env.NEXT_PUBLIC_API_URL;
            if (!RAW_BASE_URL) {
                throw new Error('NEXT_PUBLIC_API_URL environment variable is not set');
            }
            const BASE_URL = RAW_BASE_URL.replace(/\/+$/, '');
            let fetchedEmployee: Employee | null = null;
            
            // Fetch employee details from the employees list endpoint
            const employeeResponse = await fetch(`${BASE_URL}/api/v1/employees/?emp_id=${employeeId}&size=1`, {
                method: 'GET',
                headers: {
                    'accept': 'application/json',
                },
            });

            if (employeeResponse.ok) {
                const employeeData = await employeeResponse.json();
                if (employeeData.data && employeeData.data.length > 0) {
                    const employeeRecord = employeeData.data[0];
                    fetchedEmployee = employeeRecord;
                    setEmployee(employeeRecord);
                    
                    // Fetch projects, time tracking, payslips, and leaves after employee data is loaded
                    if (employeeRecord.email) {
                        await fetchEmployeeProjects(employeeRecord.email, employeeRecord.emp_id);
                        await fetchEmployeeTimeTracking(employeeRecord.email);
                        if (employeeRecord.emp_id) {
                            await fetchEmployeePayslips(employeeRecord.emp_id);
                        }
                        await fetchEmployeeLeaves(employeeRecord.email);
                        await fetchEmployeeExpenses(employeeRecord.email);
                        await fetchEmployeeAssets(employeeRecord.email);
                    }
                }
            }

            // Note: Salary endpoint doesn't exist in the backend
            setSalaries([]);
            
            // Fetch attendance records if employee email is available
            if (fetchedEmployee?.email) {
                await fetchEmployeeAttendance(fetchedEmployee.email);
            } else {
                setAttendanceRecords([]);
            }
            
        } catch (error) {
            console.error('Error fetching employee details:', error);
            setAlert({ 
                show: true, 
                variant: 'error', 
                title: 'Error', 
                message: 'Failed to fetch employee details. Please try again.' 
            });
            setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 3000);
        } finally {
            setIsLoading(false);
        }
    }, [employeeId, fetchEmployeeProjects, fetchEmployeeTimeTracking, fetchEmployeePayslips, fetchEmployeeLeaves, fetchEmployeeExpenses, fetchEmployeeAssets, fetchEmployeeAttendance]);

    // Fetch data on component mount and when page changes
    useEffect(() => {
        fetchEmployeeDetails();
    }, [fetchEmployeeDetails]);

    // Refetch payslips when Salary tab is opened or employee changes
    useEffect(() => {
        if (currentView === 'salary' && employee?.emp_id) {
            console.log('🔄 Salary tab opened, refetching payslips for employee code:', employee.emp_id);
            fetchEmployeePayslips(employee.emp_id);
        }
    }, [currentView, employee?.emp_id, fetchEmployeePayslips]);

    // Refetch leave applications when Leave tab is opened or employee changes
    useEffect(() => {
        if (currentView === 'leave' && employee?.email) {
            console.log('🔄 Leave tab opened, refetching leave applications for:', employee.email);
            fetchEmployeeLeaves(employee.email);
        }
    }, [currentView, employee?.email, fetchEmployeeLeaves]);

    // Ensure India (+91) is default when edit profile modal opens and phone is empty
    // Also update dial code when mobile value changes
    useEffect(() => {
        if (showEditProfileModal) {
            if (!mobile || mobile.trim() === '') {
                setDialCode('91');
            } else {
                const cleanMobile = mobile.replace(/[^\d+]/g, '');
                const match = cleanMobile.match(/^\+?(\d{1,3})/);
                if (match) {
                    const countryCode = match[1];
                    setDialCode(countryCode);
                }
            }
        }
    }, [showEditProfileModal, mobile]);

    useEffect(() => {
        if (currentView === 'expense' && employee?.email) {
            console.log('🔄 Expense tab opened, refetching expenses for:', employee.email);
            fetchEmployeeExpenses(employee.email);
        }
    }, [currentView, employee?.email, fetchEmployeeExpenses]);

    useEffect(() => {
        if (currentView === 'asset' && employee?.email) {
            console.log('🔄 Asset tab opened, refetching assets for:', employee.email);
            fetchEmployeeAssets(employee.email);
        }
    }, [currentView, employee?.email, fetchEmployeeAssets]);

    // Refetch attendance records when Attendance tab is opened or employee changes
    useEffect(() => {
        if (currentView === 'attendance' && employee?.email) {
            console.log('🔄 Attendance tab opened, refetching attendance records for:', employee.email);
            fetchEmployeeAttendance(employee.email);
        }
    }, [currentView, employee?.email, fetchEmployeeAttendance]);

    const handleViewEmployee = (emp: Employee) => {
        setSelectedEmployee(emp);
        setShowEmployeeModal(true);
    };

    // Download Asset Template
    const downloadAssetTemplate = (format: 'xlsx' | 'csv') => {
        const templateData = [
            {
                // Employee Info
                'employeeCode': 'EMP001',
                'fullName': 'John Doe',
                'department': 'Engineering',
                'designation': 'Software Engineer',
                'email': 'john.doe@example.com',
                // Asset Details
                'assetType': 'Hardware',
                'assetName': 'Laptop - MacBook Pro',
                'quantity': 1,
                'justification': 'Need for development work',
                'priority': 'Medium',
                'expectedDate': '2024-01-20'
            }
        ];

        if (format === 'xlsx') {
            const ws = XLSX.utils.json_to_sheet(templateData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Asset Template');
            
            // Auto-size columns
            const colWidths = [
                { wch: 15 }, // employeeCode
                { wch: 20 }, // fullName
                { wch: 15 }, // department
                { wch: 20 }, // designation
                { wch: 30 }, // email
                { wch: 15 }, // assetType
                { wch: 25 }, // assetName
                { wch: 10 }, // quantity
                { wch: 30 }, // justification
                { wch: 12 }, // priority
                { wch: 15 }  // expectedDate
            ];
            ws['!cols'] = colWidths;

            XLSX.writeFile(wb, 'Asset_Template.xlsx');
        } else {
            const ws = XLSX.utils.json_to_sheet(templateData);
            const csv = XLSX.utils.sheet_to_csv(ws);
            
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', 'Asset_Template.csv');
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    // Download Expense Template
    const downloadExpenseTemplate = (format: 'xlsx' | 'csv') => {
        const templateData = [
            {
                'EXPENSE ID': 'EXP-001',
                'EMPLOYEE': 'John Doe',
                'TITLE': 'Business Travel',
                'CATEGORY': 'Travel',
                'AMOUNT': 5000,
                'DATE': '2024-01-15',
                'STATUS': 'Pending',
                'ACTIONS': ''
            }
        ];

        if (format === 'xlsx') {
            const ws = XLSX.utils.json_to_sheet(templateData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Expense Template');
            
            // Auto-size columns
            const colWidths = [
                { wch: 15 }, // EXPENSE ID
                { wch: 20 }, // EMPLOYEE
                { wch: 20 }, // TITLE
                { wch: 15 }, // CATEGORY
                { wch: 12 }, // AMOUNT
                { wch: 12 }, // DATE
                { wch: 12 }, // STATUS
                { wch: 10 }  // ACTIONS
            ];
            ws['!cols'] = colWidths;

            XLSX.writeFile(wb, 'Expense_Template.xlsx');
        } else {
            const ws = XLSX.utils.json_to_sheet(templateData);
            const csv = XLSX.utils.sheet_to_csv(ws);
            
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', 'Expense_Template.csv');
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    // Download Project Template
    const downloadProjectTemplate = (format: 'xlsx' | 'csv') => {
        const templateData = [
            {
                'Project Name': 'E-commerce Platform',
                'Customer': 'ABC Corporation',
                'Status': 'In Progress',
                'Role': 'Project Manager',
                'Progress': '75%',
                'Actions': ''
            }
        ];

        if (format === 'xlsx') {
            const ws = XLSX.utils.json_to_sheet(templateData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Projects Template');
            
            // Auto-size columns
            const colWidths = [
                { wch: 25 }, // Project Name
                { wch: 20 }, // Customer
                { wch: 15 }, // Status
                { wch: 18 }, // Role
                { wch: 12 }, // Progress
                { wch: 10 }  // Actions
            ];
            ws['!cols'] = colWidths;

            XLSX.writeFile(wb, 'Projects_Template.xlsx');
        } else {
            const ws = XLSX.utils.json_to_sheet(templateData);
            const csv = XLSX.utils.sheet_to_csv(ws);
            
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', 'Projects_Template.csv');
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    // Download Leave Template
    const downloadLeaveTemplate = (format: 'xlsx' | 'csv') => {
        const templateData = [
            {
                // Employee Info
                'employeeCode': 'EMP001',
                'fullName': 'John Doe',
                'department': 'Engineering',
                'designation': 'Software Engineer',
                'email': 'john.doe@example.com',
                // Leave Details
                'leaveType': 'Annual Leave',
                'fromDate': '2024-12-01',
                'toDate': '2024-12-05',
                'reasonForLeave': 'Family vacation'
            }
        ];

        if (format === 'xlsx') {
            const ws = XLSX.utils.json_to_sheet(templateData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Leave Template');
            
            // Auto-size columns
            const colWidths = [
                { wch: 15 }, // employeeCode
                { wch: 20 }, // fullName
                { wch: 15 }, // department
                { wch: 20 }, // designation
                { wch: 30 }, // email
                { wch: 20 }, // leaveType
                { wch: 15 }, // fromDate
                { wch: 15 }, // toDate
                { wch: 30 }  // reasonForLeave
            ];
            ws['!cols'] = colWidths;

            XLSX.writeFile(wb, 'Leave_Template.xlsx');
        } else {
            const ws = XLSX.utils.json_to_sheet(templateData);
            const csv = XLSX.utils.sheet_to_csv(ws);
            
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', 'Leave_Template.csv');
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    // Download Attendance Template
    const downloadAttendanceTemplate = (format: 'xlsx' | 'csv') => {
        const templateData = [
            {
                'Date': '2024-01-15',
                'Clock In': '09:00 AM',
                'Clock Out': '06:00 PM',
                'Total Hours': '9 hours',
                'Overtime': '1 hour',
                'Status': 'Present',
                'Late By': '0 min',
                'Location': 'Noida, Uttar Pradesh, India',
                'Remarks': 'Regular attendance'
            }
        ];

        if (format === 'xlsx') {
            const ws = XLSX.utils.json_to_sheet(templateData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Attendance Template');
            
            // Auto-size columns
            const colWidths = [
                { wch: 12 }, // Date
                { wch: 12 }, // Clock In
                { wch: 12 }, // Clock Out
                { wch: 12 }, // Total Hours
                { wch: 12 }, // Overtime
                { wch: 12 }, // Status
                { wch: 12 }, // Late By
                { wch: 30 }, // Location
                { wch: 25 }  // Remarks
            ];
            ws['!cols'] = colWidths;

            XLSX.writeFile(wb, 'Attendance_Template.xlsx');
        } else {
            const ws = XLSX.utils.json_to_sheet(templateData);
            const csv = XLSX.utils.sheet_to_csv(ws);
            
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', 'Attendance_Template.csv');
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    // Download Attendance Data (currently visible records)
    const downloadAttendanceData = (format: 'xlsx' | 'csv') => {
        // Get the currently visible (paginated) attendance records
        const dataToExport = paginatedAttendance.map(record => {
            // Calculate total hours
            const calculateTotalHours = () => {
                const clockIn = record.clockIn || record.clock_in;
                const clockOut = record.clockOut || record.clock_out;
                if (!clockIn) return '-';
                if (!clockOut) return 'In Progress';
                
                try {
                    const inTime = new Date(clockIn);
                    const outTime = new Date(clockOut);
                    const diffMs = outTime.getTime() - inTime.getTime();
                    const diffHours = diffMs / (1000 * 60 * 60);
                    const hours = Math.floor(diffHours);
                    const minutes = Math.floor((diffHours - hours) * 60);
                    return `${hours}h ${minutes}m`;
                } catch {
                    return '-';
                }
            };

            // Format time for display
            const formatTime = (timeStr?: string | null) => {
                if (!timeStr) return '-';
                try {
                    const date = new Date(timeStr);
                    return date.toLocaleTimeString('en-US', { 
                        hour: '2-digit', 
                        minute: '2-digit',
                        hour12: true
                    });
                } catch {
                    return timeStr;
                }
            };

            // Get location string
            const getLocationString = () => {
                const location = record.clockInLocation || record.location;
                if (!location) return '-';
                if ('city' in location && location.city && 'region' in location && location.region && 'country' in location && location.country) {
                    return `${location.city}, ${location.region}, ${location.country}`;
                }
                if ('latitude' in location && 'longitude' in location && location.latitude && location.longitude) {
                    return `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`;
                }
                if ('address' in location && location.address) {
                    return location.address;
                }
                return '-';
            };

            // Get status display
            const getStatusDisplay = () => {
                if (record.clockInStatus) return record.clockInStatus;
                if (record.clockOutStatus) return record.clockOutStatus;
                if (record.status) return record.status;
                if (record.clockIn && !record.clockOut) return 'In Progress';
                return '-';
            };

            return {
                'Date': new Date(record.date).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'short', 
                    day: 'numeric',
                    weekday: 'short'
                }),
                'Clock In': formatTime(record.clockIn || record.clock_in),
                'Clock Out': formatTime(record.clockOut || record.clock_out),
                'Total Hours': record.total_hours ? formatTotalHours(record.total_hours) : calculateTotalHours(),
                'Overtime': record.overTime || (record.overTimeMinutes ? `${record.overTimeMinutes} min` : null) || formatOvertimeHours(record.overtime_hours) || '-',
                'Status': getStatusDisplay(),
                'Late By': record.lateBy || formatLateByTime(record.late_by) || '-',
                'Location': getLocationString(),
                'Remarks': record.remarks || record.notes || record.holidayName || '-'
            };
        });

        if (format === 'xlsx') {
            const ws = XLSX.utils.json_to_sheet(dataToExport);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Attendance Records');
            
            // Auto-size columns
            const colWidths = [
                { wch: 20 }, // Date
                { wch: 12 }, // Clock In
                { wch: 12 }, // Clock Out
                { wch: 12 }, // Total Hours
                { wch: 12 }, // Overtime
                { wch: 15 }, // Status
                { wch: 12 }, // Late By
                { wch: 35 }, // Location
                { wch: 30 }  // Remarks
            ];
            ws['!cols'] = colWidths;

            const fileName = `Attendance_Records_${employee?.full_name || 'Employee'}_${new Date().toISOString().split('T')[0]}.xlsx`;
            XLSX.writeFile(wb, fileName);
        } else {
            const ws = XLSX.utils.json_to_sheet(dataToExport);
            const csv = XLSX.utils.sheet_to_csv(ws);
            
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            const fileName = `Attendance_Records_${employee?.full_name || 'Employee'}_${new Date().toISOString().split('T')[0]}.csv`;
            link.setAttribute('download', fileName);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }

        setShowDownloadModal(false);
    };

    // Download Leave Data (currently visible records)
    const downloadLeaveData = (format: 'xlsx' | 'csv') => {
        // Get the currently visible (paginated) leave records
        const dataToExport = paginatedLeaves.map(leave => {
            const duration = leave.requestedDays || calculateDuration(leave.leaveDetails.fromDate, leave.leaveDetails.toDate);
            const period = formatPeriod(leave.leaveDetails.fromDate, leave.leaveDetails.toDate);
            const appliedOn = formatDate(leave.createdAt);
            const leaveId = leave.leaveId || leave.id.substring(0, 8).toUpperCase();
            const status = leave.status.replace(/_/g, ' ');

            return {
                'Leave ID': leaveId,
                'Employee Name': leave.employeeInfo.fullName,
                'Employee Email': leave.employeeInfo.email,
                'Employee Code': leave.employeeInfo.employeeCode,
                'Leave Type': leave.leaveDetails.leaveType,
                'Duration (Days)': duration,
                'Period': period,
                'From Date': formatDate(leave.leaveDetails.fromDate),
                'To Date': formatDate(leave.leaveDetails.toDate),
                'Reason': leave.leaveDetails.reasonForLeave,
                'Applied On': appliedOn,
                'Status': status,
                'Available Days': leave.availableDays || '-',
                'Requested Days': leave.requestedDays || '-'
            };
        });

        if (format === 'xlsx') {
            const ws = XLSX.utils.json_to_sheet(dataToExport);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Leave Records');
            
            // Auto-size columns
            const colWidths = [
                { wch: 12 }, // Leave ID
                { wch: 20 }, // Employee Name
                { wch: 25 }, // Employee Email
                { wch: 15 }, // Employee Code
                { wch: 15 }, // Leave Type
                { wch: 12 }, // Duration
                { wch: 25 }, // Period
                { wch: 12 }, // From Date
                { wch: 12 }, // To Date
                { wch: 30 }, // Reason
                { wch: 12 }, // Applied On
                { wch: 15 }, // Status
                { wch: 12 }, // Available Days
                { wch: 12 }  // Requested Days
            ];
            ws['!cols'] = colWidths;

            const fileName = `Leave_Records_${employee?.full_name || 'Employee'}_${new Date().toISOString().split('T')[0]}.xlsx`;
            XLSX.writeFile(wb, fileName);
        } else {
            const ws = XLSX.utils.json_to_sheet(dataToExport);
            const csv = XLSX.utils.sheet_to_csv(ws);
            
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            const fileName = `Leave_Records_${employee?.full_name || 'Employee'}_${new Date().toISOString().split('T')[0]}.csv`;
            link.setAttribute('download', fileName);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }

        setShowDownloadModal(false);
    };

    // Download Project Data (currently visible records)
    const downloadProjectData = (format: 'xlsx' | 'csv') => {
        // Get the currently visible (paginated) project records
        const dataToExport = paginatedProjects.map(project => {
            return {
                'Project Name': project.project_name,
                'Order Number': project.order_number || '-',
                'Customer Name': project.customer_name || '-',
                'Project Type': project.project_type.replace('_', ' ').toUpperCase(),
                'Status': project.status.replace('_', ' ').toUpperCase(),
                'Role': project.employee_role === 'project_manager' ? 'Manager' : 'Member',
                'Progress (%)': project.progress_percentage || 0,
                'Project Manager': project.project_manager || '-',
                'Start Date': project.start_date ? formatDate(project.start_date) : '-',
                'End Date': project.delivery_date ? formatDate(project.delivery_date) : '-'
            };
        });

        if (format === 'xlsx') {
            const ws = XLSX.utils.json_to_sheet(dataToExport);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Project Records');
            
            // Auto-size columns
            const colWidths = [
                { wch: 25 }, // Project Name
                { wch: 15 }, // Order Number
                { wch: 20 }, // Customer Name
                { wch: 18 }, // Project Type
                { wch: 15 }, // Status
                { wch: 12 }, // Role
                { wch: 12 }, // Progress
                { wch: 20 }, // Project Manager
                { wch: 12 }, // Start Date
                { wch: 12 }  // End Date
            ];
            ws['!cols'] = colWidths;

            const fileName = `Project_Records_${employee?.full_name || 'Employee'}_${new Date().toISOString().split('T')[0]}.xlsx`;
            XLSX.writeFile(wb, fileName);
        } else {
            const ws = XLSX.utils.json_to_sheet(dataToExport);
            const csv = XLSX.utils.sheet_to_csv(ws);
            
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            const fileName = `Project_Records_${employee?.full_name || 'Employee'}_${new Date().toISOString().split('T')[0]}.csv`;
            link.setAttribute('download', fileName);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }

        setShowDownloadModal(false);
    };

    // Download Expense Data (currently visible records)
    const downloadExpenseData = (format: 'xlsx' | 'csv') => {
        // Get the currently visible (paginated) expense records
        const dataToExport = paginatedExpenses.map(expense => {
            const amount = formatExpenseAmount(expense.expenseDetails.amount, expense.expenseDetails.currency);
            const date = formatDate(expense.expenseDetails.date);
            const expenseId = expense.expenseId || expense.id.substring(0, 8).toUpperCase();
            const status = expense.status?.replace(/_/g, ' ') || '';

            return {
                'Expense ID': expenseId,
                'Employee Name': expense.employeeInfo.fullName,
                'Employee Email': expense.employeeInfo.email || '-',
                'Employee Code': expense.employeeInfo.employeeCode,
                'Title': expense.expenseDetails.title,
                'Category': expense.expenseDetails.category,
                'Amount': amount,
                'Currency': expense.expenseDetails.currency || 'INR',
                'Date': date,
                'Description': expense.expenseDetails.description || '-',
                'Receipt File': expense.expenseDetails.receiptFileName || '-',
                'Status': status,
                'Created On': formatDate(expense.createdAt)
            };
        });

        if (format === 'xlsx') {
            const ws = XLSX.utils.json_to_sheet(dataToExport);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Expense Records');
            
            // Auto-size columns
            const colWidths = [
                { wch: 12 }, // Expense ID
                { wch: 20 }, // Employee Name
                { wch: 25 }, // Employee Email
                { wch: 15 }, // Employee Code
                { wch: 20 }, // Title
                { wch: 15 }, // Category
                { wch: 15 }, // Amount
                { wch: 10 }, // Currency
                { wch: 12 }, // Date
                { wch: 30 }, // Description
                { wch: 20 }, // Receipt File
                { wch: 15 }, // Status
                { wch: 12 }  // Created On
            ];
            ws['!cols'] = colWidths;

            const fileName = `Expense_Records_${employee?.full_name || 'Employee'}_${new Date().toISOString().split('T')[0]}.xlsx`;
            XLSX.writeFile(wb, fileName);
        } else {
            const ws = XLSX.utils.json_to_sheet(dataToExport);
            const csv = XLSX.utils.sheet_to_csv(ws);
            
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            const fileName = `Expense_Records_${employee?.full_name || 'Employee'}_${new Date().toISOString().split('T')[0]}.csv`;
            link.setAttribute('download', fileName);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }

        setShowDownloadModal(false);
    };

    // Download Asset Data (currently visible records)
    const downloadAssetData = (format: 'xlsx' | 'csv') => {
        // Get the currently visible (paginated) asset records
        const dataToExport = paginatedAssets.map(asset => {
            const requestedDate = asset.requestedDate ? formatDate(asset.requestedDate) : '-';
            const expectedDate = asset.assetDetails.expectedDate ? formatDate(asset.assetDetails.expectedDate) : '-';
            const status = asset.status.replace(/_/g, ' ').toUpperCase();

            return {
                'Request ID': asset.requestId,
                'Asset Name': asset.assetDetails.assetName,
                'Asset Type': asset.assetDetails.assetType,
                'Quantity': asset.assetDetails.quantity || 1,
                'Priority': asset.assetDetails.priority,
                'Description': asset.assetDetails.justification || '-',
                'Requested Date': requestedDate,
                'Expected Date': expectedDate,
                'Status': status,
                'Created On': asset.createdAt ? formatDate(asset.createdAt) : '-'
            };
        });

        if (format === 'xlsx') {
            const ws = XLSX.utils.json_to_sheet(dataToExport);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Asset Records');
            
            // Auto-size columns
            const colWidths = [
                { wch: 15 }, // Request ID
                { wch: 20 }, // Asset Name
                { wch: 15 }, // Asset Type
                { wch: 10 }, // Quantity
                { wch: 12 }, // Priority
                { wch: 30 }, // Description
                { wch: 12 }, // Requested Date
                { wch: 12 }, // Expected Date
                { wch: 15 }, // Status
                { wch: 12 }  // Created On
            ];
            ws['!cols'] = colWidths;

            const fileName = `Asset_Records_${employee?.full_name || 'Employee'}_${new Date().toISOString().split('T')[0]}.xlsx`;
            XLSX.writeFile(wb, fileName);
        } else {
            const ws = XLSX.utils.json_to_sheet(dataToExport);
            const csv = XLSX.utils.sheet_to_csv(ws);
            
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            const fileName = `Asset_Records_${employee?.full_name || 'Employee'}_${new Date().toISOString().split('T')[0]}.csv`;
            link.setAttribute('download', fileName);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }

        setShowDownloadModal(false);
    };

    // Download Payslip Data (currently visible records)
    const downloadPayslipData = (format: 'xlsx' | 'csv') => {
        // Get the currently visible (paginated) payslip records
        const dataToExport = paginatedPayslips.map(payslip => {
            return {
                'Payslip ID': payslip.payslipId,
                'Employee Name': payslip.employee.name,
                'Employee ID': payslip.employee.empId,
                'Employee Email': payslip.employee.email,
                'Job Title': payslip.employee.jobTitle,
                'Department': payslip.department,
                'Month': payslip.month,
                'Pay Date': formatDate(payslip.payDate),
                'Gross Pay': formatCurrency(payslip.grossPay),
                'Net Pay': formatCurrency(payslip.netPay),
                'Status': payslip.status
            };
        });

        if (format === 'xlsx') {
            const ws = XLSX.utils.json_to_sheet(dataToExport);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Payslip Records');
            
            // Auto-size columns
            const colWidths = [
                { wch: 15 }, // Payslip ID
                { wch: 20 }, // Employee Name
                { wch: 15 }, // Employee ID
                { wch: 25 }, // Employee Email
                { wch: 18 }, // Job Title
                { wch: 15 }, // Department
                { wch: 12 }, // Month
                { wch: 12 }, // Pay Date
                { wch: 15 }, // Gross Pay
                { wch: 15 }, // Net Pay
                { wch: 18 }  // Status
            ];
            ws['!cols'] = colWidths;

            const fileName = `Payslip_Records_${employee?.full_name || 'Employee'}_${new Date().toISOString().split('T')[0]}.xlsx`;
            XLSX.writeFile(wb, fileName);
        } else {
            const ws = XLSX.utils.json_to_sheet(dataToExport);
            const csv = XLSX.utils.sheet_to_csv(ws);
            
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            const fileName = `Payslip_Records_${employee?.full_name || 'Employee'}_${new Date().toISOString().split('T')[0]}.csv`;
            link.setAttribute('download', fileName);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }

        setShowDownloadModal(false);
    };

    // Download Payslip Template
    const downloadPayslipTemplate = (format: 'xlsx' | 'csv') => {
        const templateData = [
            {
                // Employee Info
                'employeeCode': 'EMP001',
                'fullName': 'John Doe',
                'email': 'john.doe@example.com',
                'designation': 'Software Engineer',
                'dateOfJoining': '2024-01-15',
                'bankAccountNo': '1234567890',
                'uan': '123456789012',
                'department': 'Engineering',
                'panNumber': 'ABCDE1234F',
                'ifscCode': 'SBIN0001234',
                // Payslip Info
                'payPeriodStart': '2024-12-01',
                'payPeriodEnd': '2024-12-31',
                'payDate': '2024-01-31',
                // Earnings (JSON array format: [{"type":"Basic Salary","amount":50000}])
                'earnings': '[{"type":"Basic Salary","amount":50000}]',
                // Deductions (JSON array format: [{"type":"Total Deductions","amount":5000}])
                'deductions': '[{"type":"Total Deductions","amount":5000}]',
                // Additional Info
                'pfNumber': 'PF123456',
                'esiNumber': 'ESI123456',
                'remarks': 'Monthly salary'
            }
        ];

        if (format === 'xlsx') {
            const ws = XLSX.utils.json_to_sheet(templateData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Payslips Template');
            
            // Auto-size columns
            const colWidths = [
                { wch: 15 }, // employeeCode
                { wch: 20 }, // fullName
                { wch: 30 }, // email
                { wch: 20 }, // designation
                { wch: 15 }, // dateOfJoining
                { wch: 15 }, // bankAccountNo
                { wch: 15 }, // uan
                { wch: 15 }, // department
                { wch: 15 }, // panNumber
                { wch: 15 }, // ifscCode
                { wch: 15 }, // payPeriodStart
                { wch: 15 }, // payPeriodEnd
                { wch: 15 }, // payDate
                { wch: 40 }, // earnings
                { wch: 40 }, // deductions
                { wch: 15 }, // pfNumber
                { wch: 15 }, // esiNumber
                { wch: 30 }  // remarks
            ];
            ws['!cols'] = colWidths;

            XLSX.writeFile(wb, 'Payslips_Template.xlsx');
        } else {
            const ws = XLSX.utils.json_to_sheet(templateData);
            const csv = XLSX.utils.sheet_to_csv(ws);
            
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', 'Payslips_Template.csv');
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    // Handle Payslip File Upload - API based
    const handlePayslipFileUpload = async (file: File) => {
        if (!file) {
            setAlert({
                show: true,
                variant: 'error',
                title: 'No File Selected',
                message: 'Please select a file to upload.'
            });
            setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 3000);
            return;
        }

        // Validate file type
        const fileExtension = file.name.split('.').pop()?.toLowerCase();
        if (!fileExtension || !['xlsx', 'xls', 'csv'].includes(fileExtension)) {
            setAlert({
                show: true,
                variant: 'error',
                title: 'Invalid File Type',
                message: 'Please upload an Excel (.xlsx, .xls) or CSV (.csv) file.'
            });
            setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 3000);
            return;
        }

        setIsUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);

            const RAW_BASE_URL = process.env.NEXT_PUBLIC_API_URL;
            if (!RAW_BASE_URL) {
                throw new Error('NEXT_PUBLIC_API_URL environment variable is not set');
            }
            const BASE_URL = RAW_BASE_URL.replace(/\/+$/, '');

            // Get auth token from localStorage or sessionStorage
            const token = localStorage.getItem('token') || sessionStorage.getItem('token') || '';

            const response = await fetch(`${BASE_URL}/api/v1/ess-portal/payslips/upload`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'accept': 'application/json',
                },
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `Upload failed with status ${response.status}`);
            }

            const result = await response.json();
            
            setAlert({
                show: true,
                variant: 'success',
                title: 'Upload Successful',
                message: result.message || `Upload completed. Inserted: ${result.inserted || 0}, Updated: ${result.updated || 0}, Errors: ${result.errors || 0}`
            });
            setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 5000);

            // Refresh payslips after successful upload
            if (employee?.emp_id) {
                await fetchEmployeePayslips(employee.emp_id);
            }

            // Reset file input and close modal
            setShowUploadModal(false);
            setSelectedFile(null);
        } catch (error) {
            console.error('Error uploading payslip file:', error);
            setAlert({
                show: true,
                variant: 'error',
                title: 'Upload Failed',
                message: error instanceof Error ? error.message : 'Failed to upload file. Please try again.'
            });
            setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 5000);
        } finally {
            setIsUploading(false);
        }
    };

    // Handle Attendance File Upload and Parse
    const handleAttendanceFileUpload = async (file: File) => {
        setIsUploading(true);
        try {
            const fileExtension = file.name.split('.').pop()?.toLowerCase();
            
            if (!fileExtension || !['xlsx', 'xls', 'csv'].includes(fileExtension)) {
                throw new Error('Invalid file format. Please upload Excel or CSV files.');
            }

            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const data = e.target?.result;
                    let workbook: XLSX.WorkBook;
                    let sheetName: string;
                    let worksheet: XLSX.WorkSheet;

                    if (fileExtension === 'csv') {
                        const csvData = data as string;
                        workbook = XLSX.read(csvData, { type: 'string' });
                        sheetName = workbook.SheetNames[0];
                        worksheet = workbook.Sheets[sheetName];
                    } else {
                        workbook = XLSX.read(data, { type: 'binary' });
                        sheetName = workbook.SheetNames[0];
                        worksheet = workbook.Sheets[sheetName];
                    }

                    // Convert to JSON
                    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as unknown[][];
                    
                    if (jsonData.length < 2) {
                        throw new Error('File is empty or has no data rows.');
                    }

                    // Get headers (first row)
                    const headers = jsonData[0].map((h: unknown) => String(h).trim().toUpperCase());
                    
                    // Expected column names (case-insensitive)
                    const expectedColumns = [
                        'DATE', 'CLOCK IN', 'CLOCK OUT', 'TOTAL HOURS', 
                        'OVERTIME', 'STATUS', 'LATE BY', 'LOCATION', 'REMARKS'
                    ];
                    
                    // Map headers to indices
                    const columnMap: { [key: string]: number } = {};
                    expectedColumns.forEach(col => {
                        const index = headers.findIndex(h => h === col || h.replace(/\s+/g, ' ') === col);
                        if (index !== -1) {
                            columnMap[col] = index;
                        }
                    });

                    // Check if required columns are present
                    const requiredColumns = ['DATE', 'CLOCK IN', 'STATUS'];
                    const missingColumns = requiredColumns.filter(col => !columnMap[col]);
                    
                    if (missingColumns.length > 0) {
                        throw new Error(`Missing required columns: ${missingColumns.join(', ')}`);
                    }

                    // Parse data rows
                    const parsedAttendance: Attendance[] = [];
                    for (let i = 1; i < jsonData.length; i++) {
                        const row = jsonData[i];
                        if (!row || row.every(cell => !cell)) continue; // Skip empty rows

                        const date = String(row[columnMap['DATE']] || '').trim();
                        const clockIn = String(row[columnMap['CLOCK IN']] || '').trim();
                        
                        if (!date || !clockIn) continue; // Skip rows without required data

                        // Parse location string (e.g., "Noida, Uttar Pradesh, India")
                        const locationStr = String(row[columnMap['LOCATION']] || '').trim();
                        const locationParts = locationStr.split(',').map(s => s.trim());
                        
                        const attendance: Attendance = {
                            date: date,
                            clockIn: clockIn,
                            clockOut: String(row[columnMap['CLOCK OUT']] || '').trim() || null,
                            total_hours: parseFloat(String(row[columnMap['TOTAL HOURS']] || '0').replace(/[^\d.]/g, '')) || 0,
                            overtime_hours: parseFloat(String(row[columnMap['OVERTIME']] || '0').replace(/[^\d.]/g, '')) || 0,
                            status: String(row[columnMap['STATUS']] || '').trim() || 'Present',
                            late_by: String(row[columnMap['LATE BY']] || '').trim() || '',
                            location: locationStr ? {
                                address: locationStr,
                                latitude: undefined,
                                longitude: undefined,
                                is_remote: locationStr.toLowerCase().includes('remote')
                            } : undefined,
                            remarks: String(row[columnMap['REMARKS']] || '').trim() || '',
                            email: employee?.email || '',
                            clock_in: clockIn,
                            clock_out: String(row[columnMap['CLOCK OUT']] || '').trim() || undefined,
                            clockInLocation: locationStr ? {
                                city: locationParts[0] || '',
                                region: locationParts[1] || '',
                                country: locationParts[2] || locationParts[1] || ''
                            } : undefined
                        };

                        parsedAttendance.push(attendance);
                    }

                    if (parsedAttendance.length === 0) {
                        throw new Error('No valid attendance data found in the file.');
                    }

                    // Merge with existing attendance records (avoid duplicates based on date)
                    setAttendanceRecords(prev => {
                        const existingDates = new Set(prev.map(a => a.date));
                        const newRecords = parsedAttendance.filter(a => !existingDates.has(a.date));
                        return [...prev, ...newRecords];
                    });

                    setAlert({
                        show: true,
                        variant: 'success',
                        title: 'Upload Successful',
                        message: `Successfully imported ${parsedAttendance.length} attendance record(s).`
                    });
                    setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 3000);
                    
                    setShowUploadModal(false);
                    setSelectedFile(null);
                } catch (error) {
                    console.error('Error parsing file:', error);
                    setAlert({
                        show: true,
                        variant: 'error',
                        title: 'Upload Failed',
                        message: error instanceof Error ? error.message : 'Failed to parse the file. Please check the format.'
                    });
                    setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 3000);
                } finally {
                    setIsUploading(false);
                }
            };

            if (fileExtension === 'csv') {
                reader.readAsText(file);
            } else {
                reader.readAsBinaryString(file);
            }
        } catch (error) {
            console.error('Error uploading file:', error);
            setAlert({
                show: true,
                variant: 'error',
                title: 'Upload Failed',
                message: error instanceof Error ? error.message : 'Failed to upload the file.'
            });
            setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 3000);
            setIsUploading(false);
        }
    };

    // Handle Leave File Upload - API based
    const handleLeaveFileUpload = async (file: File) => {
        if (!file) {
            setAlert({
                show: true,
                variant: 'error',
                title: 'No File Selected',
                message: 'Please select a file to upload.'
            });
            setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 3000);
            return;
        }

        // Validate file type
        const fileExtension = file.name.split('.').pop()?.toLowerCase();
        if (!fileExtension || !['xlsx', 'xls', 'csv'].includes(fileExtension)) {
            setAlert({
                show: true,
                variant: 'error',
                title: 'Invalid File Type',
                message: 'Please upload an Excel (.xlsx, .xls) or CSV (.csv) file.'
            });
            setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 3000);
            return;
        }

        setIsUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);

            const RAW_BASE_URL = process.env.NEXT_PUBLIC_API_URL;
            if (!RAW_BASE_URL) {
                throw new Error('NEXT_PUBLIC_API_URL environment variable is not set');
            }
            const BASE_URL = RAW_BASE_URL.replace(/\/+$/, '');

            // Get auth token from localStorage or sessionStorage
            const token = localStorage.getItem('token') || sessionStorage.getItem('token') || '';

            const response = await fetch(`${BASE_URL}/api/v1/ess-portal/leave-applications/upload`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'accept': 'application/json',
                },
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `Upload failed with status ${response.status}`);
            }

            const result = await response.json();
            
            setAlert({
                show: true,
                variant: 'success',
                title: 'Upload Successful',
                message: result.message || `Upload completed. Inserted: ${result.inserted || 0}, Updated: ${result.updated || 0}, Errors: ${result.errors || 0}`
            });
            setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 5000);

            // Refresh leave applications after successful upload
            if (employee?.email) {
                await fetchEmployeeLeaves(employee.email);
            }

            // Reset file input and close modal
            setShowUploadModal(false);
            setSelectedFile(null);
        } catch (error) {
            console.error('Error uploading leave file:', error);
            setAlert({
                show: true,
                variant: 'error',
                title: 'Upload Failed',
                message: error instanceof Error ? error.message : 'Failed to upload file. Please try again.'
            });
            setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 5000);
        } finally {
            setIsUploading(false);
        }
    };

    // Handle Project File Upload and Parse
    const handleProjectFileUpload = async (file: File) => {
        setIsUploading(true);
        try {
            const fileExtension = file.name.split('.').pop()?.toLowerCase();
            
            if (!fileExtension || !['xlsx', 'xls', 'csv'].includes(fileExtension)) {
                throw new Error('Invalid file format. Please upload Excel or CSV files.');
            }

            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const data = e.target?.result;
                    let workbook: XLSX.WorkBook;
                    let sheetName: string;
                    let worksheet: XLSX.WorkSheet;

                    if (fileExtension === 'csv') {
                        const csvData = data as string;
                        workbook = XLSX.read(csvData, { type: 'string' });
                        sheetName = workbook.SheetNames[0];
                        worksheet = workbook.Sheets[sheetName];
                    } else {
                        workbook = XLSX.read(data, { type: 'binary' });
                        sheetName = workbook.SheetNames[0];
                        worksheet = workbook.Sheets[sheetName];
                    }

                    // Convert to JSON
                    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as unknown[][];
                    
                    if (jsonData.length < 2) {
                        throw new Error('File is empty or has no data rows.');
                    }

                    // Get headers (first row)
                    const headers = jsonData[0].map((h: unknown) => String(h).trim().toUpperCase());
                    
                    // Expected column names (case-insensitive)
                    const expectedColumns = [
                        'PROJECT NAME', 'CUSTOMER', 'STATUS', 'ROLE', 'PROGRESS', 'ACTIONS'
                    ];
                    
                    // Map headers to indices
                    const columnMap: { [key: string]: number } = {};
                    expectedColumns.forEach(col => {
                        const index = headers.findIndex(h => h === col || h.replace(/\s+/g, ' ') === col);
                        if (index !== -1) {
                            columnMap[col] = index;
                        }
                    });

                    // Check if required columns are present
                    const requiredColumns = ['PROJECT NAME', 'CUSTOMER', 'STATUS', 'ROLE'];
                    const missingColumns = requiredColumns.filter(col => !columnMap[col]);
                    
                    if (missingColumns.length > 0) {
                        throw new Error(`Missing required columns: ${missingColumns.join(', ')}`);
                    }

                    // Parse data rows
                    const parsedProjects: Project[] = [];
                    for (let i = 1; i < jsonData.length; i++) {
                        const row = jsonData[i];
                        if (!row || row.every(cell => !cell)) continue; // Skip empty rows

                        const projectName = String(row[columnMap['PROJECT NAME']] || '').trim();
                        const customerName = String(row[columnMap['CUSTOMER']] || '').trim();
                        const status = String(row[columnMap['STATUS']] || '').trim();
                        const role = String(row[columnMap['ROLE']] || '').trim();
                        
                        if (!projectName || !customerName || !status || !role) continue; // Skip rows without required data

                        // Parse progress (e.g., "75%" or "75")
                        const progressStr = String(row[columnMap['PROGRESS']] || '0').trim();
                        const progressMatch = progressStr.match(/(\d+)/);
                        const progressPercentage = progressMatch ? parseInt(progressMatch[1]) : 0;

                        // Determine employee role
                        const employeeRole: 'project_manager' | 'team_member' = 
                            role.toLowerCase().includes('manager') ? 'project_manager' : 'team_member';

                        // Map status to project status type
                        const statusLower = status.toLowerCase();
                        let projectStatus: Project['status'] = 'in_progress';
                        if (statusLower.includes('planning')) projectStatus = 'planning';
                        else if (statusLower.includes('progress')) projectStatus = 'in_progress';
                        else if (statusLower.includes('testing')) projectStatus = 'testing';
                        else if (statusLower.includes('completed') || statusLower.includes('complete')) projectStatus = 'completed';
                        else if (statusLower.includes('hold')) projectStatus = 'on_hold';
                        else if (statusLower.includes('cancel')) projectStatus = 'cancelled';

                        const project: Project = {
                            id: `PROJ-${Date.now()}-${i}`,
                            order_number: `ORD-${Date.now()}-${i}`,
                            customer_id: customerName.toLowerCase().replace(/\s+/g, '-'),
                            customer_name: customerName,
                            project_name: projectName,
                            project_type: 'custom_software',
                            status: projectStatus,
                            priority: 'medium',
                            description: '',
                            technologies: '',
                            start_date: new Date().toISOString(),
                            delivery_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                            budget: 0,
                            paid_amount: 0,
                            progress_percentage: progressPercentage,
                            team_members: '',
                            project_manager: employee?.email || '',
                            employee_role: employeeRole,
                            created_at: new Date().toISOString(),
                            updated_at: new Date().toISOString()
                        };

                        parsedProjects.push(project);
                    }

                    if (parsedProjects.length === 0) {
                        throw new Error('No valid project data found in the file.');
                    }

                    // Merge with existing projects (avoid duplicates based on project name and customer)
                    setProjects(prev => {
                        const existingKeys = new Set(prev.map(p => `${p.project_name}-${p.customer_name}`));
                        const newProjects = parsedProjects.filter(p => {
                            const key = `${p.project_name}-${p.customer_name}`;
                            return !existingKeys.has(key);
                        });
                        return [...prev, ...newProjects];
                    });

                    setAlert({
                        show: true,
                        variant: 'success',
                        title: 'Upload Successful',
                        message: `Successfully imported ${parsedProjects.length} project(s).`
                    });
                    setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 3000);
                    
                    setShowUploadModal(false);
                    setSelectedFile(null);
                } catch (error) {
                    console.error('Error parsing file:', error);
                    setAlert({
                        show: true,
                        variant: 'error',
                        title: 'Upload Failed',
                        message: error instanceof Error ? error.message : 'Failed to parse the file. Please check the format.'
                    });
                    setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 3000);
                } finally {
                    setIsUploading(false);
                }
            };

            if (fileExtension === 'csv') {
                reader.readAsText(file);
            } else {
                reader.readAsBinaryString(file);
            }
        } catch (error) {
            console.error('Error uploading file:', error);
            setAlert({
                show: true,
                variant: 'error',
                title: 'Upload Failed',
                message: error instanceof Error ? error.message : 'Failed to upload the file.'
            });
            setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 3000);
            setIsUploading(false);
        }
    };

    // Handle Expense File Upload and Parse
    const handleExpenseFileUpload = async (file: File) => {
        setIsUploading(true);
        try {
            const fileExtension = file.name.split('.').pop()?.toLowerCase();
            
            if (!fileExtension || !['xlsx', 'xls', 'csv'].includes(fileExtension)) {
                throw new Error('Invalid file format. Please upload Excel or CSV files.');
            }

            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const data = e.target?.result;
                    let workbook: XLSX.WorkBook;
                    let sheetName: string;
                    let worksheet: XLSX.WorkSheet;

                    if (fileExtension === 'csv') {
                        const csvData = data as string;
                        workbook = XLSX.read(csvData, { type: 'string' });
                        sheetName = workbook.SheetNames[0];
                        worksheet = workbook.Sheets[sheetName];
                    } else {
                        workbook = XLSX.read(data, { type: 'binary' });
                        sheetName = workbook.SheetNames[0];
                        worksheet = workbook.Sheets[sheetName];
                    }

                    // Convert to JSON
                    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as unknown[][];
                    
                    if (jsonData.length < 2) {
                        throw new Error('File is empty or has no data rows.');
                    }

                    // Get headers (first row)
                    const headers = jsonData[0].map((h: unknown) => String(h).trim().toUpperCase());
                    
                    // Expected column names (case-insensitive)
                    const expectedColumns = [
                        'EXPENSE ID', 'EMPLOYEE', 'TITLE', 'CATEGORY', 
                        'AMOUNT', 'DATE', 'STATUS', 'ACTIONS'
                    ];
                    
                    // Map headers to indices
                    const columnMap: { [key: string]: number } = {};
                    expectedColumns.forEach(col => {
                        const index = headers.findIndex(h => h === col || h.replace(/\s+/g, ' ') === col);
                        if (index !== -1) {
                            columnMap[col] = index;
                        }
                    });

                    // Check if required columns are present
                    const requiredColumns = ['EXPENSE ID', 'EMPLOYEE', 'TITLE', 'CATEGORY', 'AMOUNT', 'DATE', 'STATUS'];
                    const missingColumns = requiredColumns.filter(col => !columnMap[col]);
                    
                    if (missingColumns.length > 0) {
                        throw new Error(`Missing required columns: ${missingColumns.join(', ')}`);
                    }

                    // Parse data rows
                    const parsedExpenses: ExpenseApplication[] = [];
                    for (let i = 1; i < jsonData.length; i++) {
                        const row = jsonData[i];
                        if (!row || row.every(cell => !cell)) continue; // Skip empty rows

                        const expenseId = String(row[columnMap['EXPENSE ID']] || '').trim();
                        const employeeName = String(row[columnMap['EMPLOYEE']] || '').trim();
                        const title = String(row[columnMap['TITLE']] || '').trim();
                        const category = String(row[columnMap['CATEGORY']] || '').trim();
                        const amount = parseFloat(String(row[columnMap['AMOUNT']] || '0')) || 0;
                        const date = String(row[columnMap['DATE']] || '').trim();
                        const status = String(row[columnMap['STATUS']] || '').trim();
                        
                        if (!expenseId || !employeeName || !title || !category || !date || amount <= 0) continue; // Skip rows without required data

                        const expense: ExpenseApplication = {
                            id: expenseId,
                            expenseId: expenseId,
                            employeeInfo: {
                                employeeCode: employee?.emp_id || '',
                                fullName: employeeName,
                                department: employee?.department || '',
                                designation: '',
                                email: employee?.email || ''
                            },
                            expenseDetails: {
                                title: title,
                                category: category,
                                amount: amount,
                                currency: 'INR',
                                date: date,
                                description: ''
                            },
                            status: status || 'Pending',
                            createdAt: new Date().toISOString()
                        };

                        parsedExpenses.push(expense);
                    }

                    if (parsedExpenses.length === 0) {
                        throw new Error('No valid expense data found in the file.');
                    }

                    // Merge with existing expense applications (avoid duplicates based on expense ID)
                    setExpenseApplications(prev => {
                        const existingIds = new Set(prev.map(e => e.expenseId || e.id));
                        const newExpenses = parsedExpenses.filter(e => {
                            const id = e.expenseId || e.id;
                            return id && !existingIds.has(id);
                        });
                        return [...prev, ...newExpenses];
                    });

                    setAlert({
                        show: true,
                        variant: 'success',
                        title: 'Upload Successful',
                        message: `Successfully imported ${parsedExpenses.length} expense claim(s).`
                    });
                    setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 3000);
                    
                    setShowUploadModal(false);
                    setSelectedFile(null);
                } catch (error) {
                    console.error('Error parsing file:', error);
                    setAlert({
                        show: true,
                        variant: 'error',
                        title: 'Upload Failed',
                        message: error instanceof Error ? error.message : 'Failed to parse the file. Please check the format.'
                    });
                    setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 3000);
                } finally {
                    setIsUploading(false);
                }
            };

            if (fileExtension === 'csv') {
                reader.readAsText(file);
            } else {
                reader.readAsBinaryString(file);
            }
        } catch (error) {
            console.error('Error uploading file:', error);
            setAlert({
                show: true,
                variant: 'error',
                title: 'Upload Failed',
                message: error instanceof Error ? error.message : 'Failed to upload the file.'
            });
            setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 3000);
            setIsUploading(false);
        }
    };

    // Handle Asset File Upload - API based
    const handleAssetFileUpload = async (file: File) => {
        if (!file) {
            setAlert({
                show: true,
                variant: 'error',
                title: 'No File Selected',
                message: 'Please select a file to upload.'
            });
            setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 3000);
            return;
        }

        // Validate file type
        const fileExtension = file.name.split('.').pop()?.toLowerCase();
        if (!fileExtension || !['xlsx', 'xls', 'csv'].includes(fileExtension)) {
            setAlert({
                show: true,
                variant: 'error',
                title: 'Invalid File Type',
                message: 'Please upload an Excel (.xlsx, .xls) or CSV (.csv) file.'
            });
            setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 3000);
            return;
        }

        setIsUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);

            const RAW_BASE_URL = process.env.NEXT_PUBLIC_API_URL;
            if (!RAW_BASE_URL) {
                throw new Error('NEXT_PUBLIC_API_URL environment variable is not set');
            }
            const BASE_URL = RAW_BASE_URL.replace(/\/+$/, '');

            // Get auth token from localStorage or sessionStorage
            const token = localStorage.getItem('token') || sessionStorage.getItem('token') || '';

            const response = await fetch(`${BASE_URL}/api/v1/ess-portal/assets/upload`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'accept': 'application/json',
                },
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `Upload failed with status ${response.status}`);
            }

            const result = await response.json();
            
            setAlert({
                show: true,
                variant: 'success',
                title: 'Upload Successful',
                message: result.message || `Upload completed. Inserted: ${result.inserted || 0}, Updated: ${result.updated || 0}, Errors: ${result.errors || 0}`
            });
            setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 5000);

            // Refresh asset requests after successful upload
            if (employee?.email) {
                await fetchEmployeeAssets(employee.email);
            }

            // Reset file input and close modal
            setShowUploadModal(false);
            setSelectedFile(null);
        } catch (error) {
            console.error('Error uploading asset file:', error);
            setAlert({
                show: true,
                variant: 'error',
                title: 'Upload Failed',
                message: error instanceof Error ? error.message : 'Failed to upload file. Please try again.'
            });
            setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 5000);
        } finally {
            setIsUploading(false);
        }
    };

    const handleAddRecord = (type: 'salary' | 'attendance' | 'leave' | 'project' | 'expense' | 'asset') => {
        if (type === 'expense' || type === 'asset') {
            setAlert({
                show: true,
                variant: 'error',
                title: 'Feature Not Available',
                message: `${type.charAt(0).toUpperCase() + type.slice(1)} management is not yet implemented in the backend.`
            });
            setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 3000);
            return;
        }

        setRecordFormType(type);
        setEditingRecord(null);
        setShowRecordForm(true);
    };


    // Validation functions for Edit Profile
    const validateEmail = (email: string): boolean => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    const isValidPhoneNumber = (phone: string): boolean => {
        const digitsOnly = phone.replace(/[^\d]/g, '');
        return digitsOnly.length >= 7 && digitsOnly.length <= 15;
    };

    const validateEditProfileField = (fieldName: string, value: string): void => {
        const newErrors = { ...editProfileErrors };
        
        switch (fieldName) {
            case 'full_name':
                if (!value.trim()) {
                    newErrors.full_name = 'Full name is required';
                } else if (value.trim().length < 2) {
                    newErrors.full_name = 'Full name must be at least 2 characters';
                } else if (value.trim().length > 100) {
                    newErrors.full_name = 'Full name must be at most 100 characters';
                } else {
                    newErrors.full_name = '';
                }
                break;
            case 'email':
                if (!value.trim()) {
                    newErrors.email = 'Email is required';
                } else if (!validateEmail(value.trim())) {
                    newErrors.email = 'Please enter a valid email address';
                } else {
                    newErrors.email = '';
                }
                break;
            case 'department':
                if (!value.trim()) {
                    newErrors.department = 'Department is required';
                } else if (value.trim().length > 50) {
                    newErrors.department = 'Department must be at most 50 characters';
                } else {
                    newErrors.department = '';
                }
                break;
            case 'phone':
                const cleanMobile = '+' + mobile.replace(/[^\d]/g, '').replace(/^\+/, '');
                if (!mobile || !isValidPhoneNumber(cleanMobile)) {
                    newErrors.phone = 'Please enter a valid phone number';
                } else {
                    newErrors.phone = '';
                }
                break;
        }
        
        setEditProfileErrors(newErrors);
    };

    const validateAllEditProfileFields = (): boolean => {
        const errors = {
            emp_id: '',
            full_name: '',
            email: '',
            department: '',
            phone: '',
        };
        
        // Validate full_name
        if (!editProfileFormData.full_name.trim()) {
            errors.full_name = 'Full name is required';
        } else if (editProfileFormData.full_name.trim().length < 2) {
            errors.full_name = 'Full name must be at least 2 characters';
        } else if (editProfileFormData.full_name.trim().length > 100) {
            errors.full_name = 'Full name must be at most 100 characters';
        }
        
        // Validate email
        if (!editProfileFormData.email.trim()) {
            errors.email = 'Email is required';
        } else if (!validateEmail(editProfileFormData.email.trim())) {
            errors.email = 'Please enter a valid email address';
        }
        
        // Validate department
        if (!editProfileFormData.department.trim()) {
            errors.department = 'Department is required';
        } else if (editProfileFormData.department.trim().length > 50) {
            errors.department = 'Department must be at most 50 characters';
        }
        
        // Validate phone
        const cleanMobile = '+' + mobile.replace(/[^\d]/g, '').replace(/^\+/, '');
        if (!mobile || !isValidPhoneNumber(cleanMobile)) {
            errors.phone = 'Please enter a valid phone number';
        }
        
        // Update errors state
        setEditProfileErrors(errors);
        
        // Return true if no errors
        return !errors.full_name && !errors.email && !errors.department && !errors.phone;
    };

    const handleEditProfileChange = (field: string, value: string) => {
        setEditProfileFormData(prev => ({ ...prev, [field]: value }));
        if (editProfileTouched.has(field)) {
            validateEditProfileField(field, value);
        }
    };

    const handleEditProfileBlur = (fieldName: string) => {
        setEditProfileTouched(prev => new Set(prev).add(fieldName));
        validateEditProfileField(fieldName, editProfileFormData[fieldName as keyof typeof editProfileFormData] || '');
    };

    const handlePhoneChange = (phone: string, data?: { dialCode?: string }) => {
        setMobile(phone);
        try {
            const code = String(data?.dialCode || '').replace(/[^\d]/g, '') || dialCode;
            if (code) setDialCode(code);
        } catch {}
        
        if (editProfileTouched.has('phone')) {
            const cleanMobile = '+' + phone.replace(/[^\d]/g, '').replace(/^\+/, '');
            validateEditProfileField('phone', cleanMobile);
        }
    };

    const handleUpdateProfile = async () => {
        // Mark all fields as touched
        setEditProfileTouched(new Set(['emp_id', 'full_name', 'email', 'department', 'phone']));
        
        // Validate all fields
        if (!validateAllEditProfileFields()) {
            setAlert({
                show: true,
                variant: 'error',
                title: 'Validation Error',
                message: 'Please fix all validation errors before submitting'
            });
            setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 3000);
            return;
        }

        setIsUpdatingProfile(true);

        try {
            const RAW_BASE_URL = process.env.NEXT_PUBLIC_API_URL;
            if (!RAW_BASE_URL) {
                throw new Error('NEXT_PUBLIC_API_URL environment variable is not set');
            }
            const BASE_URL = RAW_BASE_URL.replace(/\/+$/, '');
            
            const cleanMobile = '+' + mobile.replace(/[^\d]/g, '').replace(/^\+/, '');
            
            const payload = {
                emp_id: editProfileFormData.emp_id,
                full_name: editProfileFormData.full_name.trim(),
                email: editProfileFormData.email.trim().toLowerCase(),
                department: editProfileFormData.department.trim(),
                phone: cleanMobile,
                ...(employee?.created_at && { created_at: employee.created_at }),
            };

            const response = await fetch(`${BASE_URL}/api/v1/employee/update`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'accept': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (response.ok) {
                setAlert({
                    show: true,
                    variant: 'success',
                    title: 'Success',
                    message: 'Profile updated successfully'
                });
                setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 3000);
                
                // Refresh employee data
                await fetchEmployeeDetails();
                
                // Close modal
                setShowEditProfileModal(false);
            } else {
                const errorData = await response.json().catch(() => ({ message: 'Failed to update profile' }));
                throw new Error(errorData.message || errorData.error || 'Failed to update profile');
            }
        } catch (error) {
            console.error('Error updating profile:', error);
            setAlert({
                show: true,
                variant: 'error',
                title: 'Update Failed',
                message: error instanceof Error ? error.message : 'Failed to update profile. Please try again.'
            });
            setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 3000);
        } finally {
            setIsUpdatingProfile(false);
        }
    };

    const isEditProfileFormValid = () => {
        const cleanMobile = '+' + mobile.replace(/[^\d]/g, '').replace(/^\+/, '');
        const digitsOnly = mobile.replace(/[^\d]/g, '');

        return (
            editProfileFormData.full_name.trim() !== '' &&
            editProfileFormData.full_name.length <= 100 &&
            validateEmail(editProfileFormData.email) &&
            editProfileFormData.department.trim() !== '' &&
            editProfileFormData.department.length <= 50 &&
            digitsOnly.length >= 7 &&
            digitsOnly.length <= 15 &&
            isValidPhoneNumber(cleanMobile) &&
            !editProfileErrors.full_name &&
            !editProfileErrors.email &&
            !editProfileErrors.department &&
            !editProfileErrors.phone
        );
    };

    const handleFormSubmit = async (formData: FormData) => {
        setIsFormLoading(true);
        try {
            const RAW_BASE_URL = process.env.NEXT_PUBLIC_API_URL;
            if (!RAW_BASE_URL) {
                throw new Error('NEXT_PUBLIC_API_URL environment variable is not set');
            }
            const BASE_URL = RAW_BASE_URL.replace(/\/+$/, '');

            if (recordFormType !== 'project') {
                setAlert({ 
                    show: true, 
                variant: 'error', 
                title: 'Feature Not Available', 
                message: `${recordFormType.charAt(0).toUpperCase() + recordFormType.slice(1)} management is not yet implemented in the backend.` 
                });
                setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 3000);
            return;
            }

            if (!employee) {
                throw new Error('Employee details not loaded yet.');
            }

            const customerEmail = String(formData.customer_email ?? '').trim();
            const projectName = String(formData.project_name ?? '').trim();

            if (!customerEmail || !projectName) {
                throw new Error('Customer email and project name are required.');
            }

            const payload = {
                employee_id: employee.emp_id,
                employee_name: employee.full_name,
                employee_email: employee.email,
                customer_email: customerEmail,
                project_name: projectName,
                project_type: formData.project_type && formData.project_type !== 'select_project_type'
                    ? String(formData.project_type)
                    : undefined,
                task: formData.task ? String(formData.task) : undefined,
                deadline: formData.deadline ? String(formData.deadline) : undefined,
                status: formData.status ? String(formData.status) : undefined,
                employee_role: formData.employee_role ? String(formData.employee_role) : undefined,
                notes: formData.notes ? String(formData.notes) : undefined,
            };

            const response = await fetch(`${BASE_URL}/api/v1/employee-project/`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'accept': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            const responseData = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(responseData.detail || responseData.message || 'Failed to save project assignment.');
            }

            setAlert({
                show: true,
                variant: 'success',
                title: 'Project Assignment Saved',
                message: responseData.message || 'Employee project assignment saved successfully.'
            });
            setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 3000);

            if (employee.email) {
                await fetchEmployeeProjects(employee.email, employee.emp_id);
            }
                
        } catch (error) {
            console.error('Error saving record:', error);
            setAlert({ 
                show: true, 
                variant: 'error', 
                title: 'Error', 
                message: error instanceof Error ? error.message : 'Failed to save record. Please try again.' 
            });
            setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 3000);
        } finally {
            setIsFormLoading(false);
        }
    };

    const confirmDeleteItem = async () => {
        if (showDeleteConfirm.item) {
            setIsDeleting(true);
            try {
                const RAW_BASE_URL = process.env.NEXT_PUBLIC_API_URL;
                if (!RAW_BASE_URL) {
                    throw new Error('NEXT_PUBLIC_API_URL environment variable is not set');
                }
                // const BASE_URL = RAW_BASE_URL.replace(/\/+$/, '');
                
                const deleteType = showDeleteConfirm.type;
                
                if (deleteType === 'project') {
                        // Projects are managed through customer orders, so we don't delete them here
                        // Just remove from local state
                        setProjects(prev => prev.filter(p => p.id !== showDeleteConfirm.item?.id));
                        setAlert({ 
                            show: true, 
                            variant: 'success', 
                            title: 'Project Removed', 
                            message: 'Project removed from employee view' 
                        });
                        setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 3000);
                        setShowDeleteConfirm({ show: false, type: 'salary', item: null });
                        return;
                } else {
                    // Other endpoints don't exist in the backend
                    setAlert({ 
                        show: true, 
                        variant: 'error', 
                        title: 'Feature Not Available', 
                        message: `${deleteType.charAt(0).toUpperCase() + deleteType.slice(1)} deletion is not yet implemented in the backend.` 
                    });
                    setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 3000);
                    setShowDeleteConfirm({ show: false, type: 'salary', item: null });
                    return;
                }

            } catch (error) {
                console.error('Error deleting item:', error);
                setAlert({ 
                    show: true, 
                    variant: 'error', 
                    title: 'Delete Failed', 
                    message: error instanceof Error ? error.message : 'Failed to delete item. Please try again.' 
                });
                setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 3000);
            } finally {
                setIsDeleting(false);
            }
        }
    };

    // Helper functions for styling
    const getStatusColor = (status: string) => {
        const normalizedStatus = status.toLowerCase();
        switch (normalizedStatus) {
            case 'paid': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
            case 'pending': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
            case 'cancelled': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
            case 'present': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
            case 'absent': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
            case 'late': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
            case 'half_day': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
            case 'approved': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
            case 'rejected': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
            case 'finance approved': case 'finance_approved':
                return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
            case 'finance rejected': case 'finance_rejected':
                return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
            case 'generated': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
            case 'manager_approved': case 'manager approved': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
            case 'hr_approved': case 'hr approved': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
            case 'manager_rejected': case 'manager rejected': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
            case 'hr_rejected': case 'hr rejected': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
            default: return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400';
        }
    };

    // Format currency for payslips
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 2
        }).format(amount);
    };

    // Format date for payslips
    const formatDate = (dateString: string) => {
        if (!dateString) return '-';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-GB', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
        } catch {
            return dateString;
        }
    };

    // Handle view payslip
    const handleViewPayslip = (payslip: Payslip) => {
        router.push(`/ess-portal/payslips/${payslip.id}`);
    };

    // Handle download payslip (PDF)
    const handleDownloadPayslip = async (payslip: Payslip) => {
        try {
            // Navigate to payslip view page which has download functionality
            router.push(`/ess-portal/payslips/${payslip.id}`);
        } catch (error) {
            console.error('Error downloading payslip:', error);
            setAlert({
                show: true,
                variant: 'error',
                title: 'Download Failed',
                message: 'Failed to download payslip. Please try again.'
            });
            setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 3000);
        }
    };

    // Handle view leave application
    const handleViewLeave = (leave: LeaveApplication) => {
        router.push(`/ess-portal/leave/view/${leave.id}`);
    };

    const handleViewExpense = (expense: ExpenseApplication) => {
        router.push(`/ess-portal/expenses/view?id=${expense.id}`);
    };

    const handleViewAsset = (asset: AssetRequest) => {
        router.push(`/ess-portal/assets/view?id=${asset.id}`);
    };

    const handleDownloadExpense = (expense: ExpenseApplication) => {
        try {
            const expenseId = expense.expenseId || expense.id.substring(0, 8).toUpperCase();
            const doc = new jsPDF();
            let yPosition = 20;

            doc.setFontSize(18);
            doc.text(`Expense Claim - ${expenseId}`, 20, yPosition);
            yPosition += 15;

            doc.setFontSize(14);
            doc.text('Employee Information', 20, yPosition);
            yPosition += 10;
            doc.setFontSize(12);
            doc.text(`Name: ${expense.employeeInfo.fullName}`, 20, yPosition);
            yPosition += 10;
            doc.text(`Employee Code: ${expense.employeeInfo.employeeCode}`, 20, yPosition);
            yPosition += 10;
            doc.text(`Email: ${expense.employeeInfo.email}`, 20, yPosition);
            yPosition += 10;
            doc.text(`Department: ${expense.employeeInfo.department}`, 20, yPosition);
            yPosition += 10;
            doc.text(`Designation: ${expense.employeeInfo.designation}`, 20, yPosition);
            yPosition += 15;

            doc.setFontSize(14);
            doc.text('Expense Details', 20, yPosition);
            yPosition += 10;
            doc.setFontSize(12);
            doc.text(`Title: ${expense.expenseDetails.title}`, 20, yPosition);
            yPosition += 10;
            doc.text(`Category: ${expense.expenseDetails.category}`, 20, yPosition);
            yPosition += 10;
            doc.text(`Amount: ${formatExpenseAmount(expense.expenseDetails.amount, expense.expenseDetails.currency)}`, 20, yPosition);
            yPosition += 10;
            doc.text(`Date: ${formatDate(expense.expenseDetails.date)}`, 20, yPosition);
            yPosition += 10;
            doc.text(`Status: ${expense.status.replace(/_/g, ' ').toUpperCase()}`, 20, yPosition);
            yPosition += 10;
            if (expense.expenseDetails.receiptFileName) {
                doc.text(`Receipt: ${expense.expenseDetails.receiptFileName}`, 20, yPosition);
                yPosition += 10;
            }
            yPosition += 5;

            if (expense.expenseDetails.description) {
            doc.setFontSize(14);
                doc.text('Description', 20, yPosition);
                yPosition += 10;
            doc.setFontSize(12);
                const descriptionText = expense.expenseDetails.description;
            const wrappedDescription = doc.splitTextToSize(descriptionText, 170);
                doc.text(wrappedDescription, 20, yPosition);
            }

            const now = new Date();
            const dateStr = now.toISOString().split('T')[0];
            const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
            const filename = `${expenseId}:${dateStr}:${timeStr}.pdf`;

            doc.save(filename);
        } catch (error) {
            console.error('Error downloading expense:', error);
            setAlert({
                show: true,
                variant: 'error',
                title: 'Download Failed',
                message: 'Unable to download expense details. Please try again.'
            });
            setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 3000);
        }
    };

    const handleDownloadAsset = (asset: AssetRequest) => {
        try {
            const assetId = asset.requestId || asset.id.substring(0, 8).toUpperCase();
            const doc = new jsPDF();

            doc.setFontSize(18);
            doc.text(`Asset Request - ${assetId}`, 20, 20);

            doc.setFontSize(14);
            doc.text('Employee Information', 20, 40);
            doc.setFontSize(12);
            doc.text(`Name: ${asset.employeeInfo.fullName}`, 20, 50);
            doc.text(`Employee Code: ${asset.employeeInfo.employeeCode}`, 20, 60);
            doc.text(`Email: ${asset.employeeInfo.email}`, 20, 70);
            doc.text(`Department: ${asset.employeeInfo.department}`, 20, 80);
            doc.text(`Designation: ${asset.employeeInfo.designation}`, 20, 90);

            doc.setFontSize(14);
            doc.text('Asset Details', 20, 110);
            doc.setFontSize(12);
            doc.text(`Asset Name: ${asset.assetDetails.assetName}`, 20, 120);
            doc.text(`Asset Type: ${asset.assetDetails.assetType}`, 20, 130);
            doc.text(`Quantity: ${asset.assetDetails.quantity}`, 20, 140);
            doc.text(`Priority: ${asset.assetDetails.priority}`, 20, 150);
            doc.text(`Requested Date: ${formatDate(asset.requestedDate || asset.createdAt || '')}`, 20, 160);
            doc.text(`Expected Date: ${formatDate(asset.assetDetails.expectedDate || asset.assetDetails.expectedDate || '')}`, 20, 170);
            doc.text(`Status: ${asset.status.replace('_', ' ').toUpperCase()}`, 20, 180);

            if (asset.assetDetails.justification) {
                doc.setFontSize(14);
                doc.text('Justification', 20, 200);
                doc.setFontSize(12);
                const justification = doc.splitTextToSize(asset.assetDetails.justification, 170);
                doc.text(justification, 20, 210);
            }

            const now = new Date();
            const dateStr = now.toISOString().split('T')[0];
            const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
            const filename = `${assetId}:${dateStr}:${timeStr}.pdf`;

            doc.save(filename);
        } catch (error) {
            console.error('Error downloading asset request:', error);
            setAlert({
                show: true,
                variant: 'error',
                title: 'Download Failed',
                message: 'Unable to download asset request. Please try again.'
            });
            setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 3000);
        }
    };

    const formatExpenseAmount = (amount: number, currency: string = 'INR') => {
        try {
            return new Intl.NumberFormat('en-IN', {
                style: 'currency',
                currency: currency || 'INR',
                minimumFractionDigits: 2
            }).format(amount);
        } catch {
            const curr = currency || 'INR';
            return curr === 'INR' ? `₹${amount.toFixed(2)}` : `${curr} ${amount.toFixed(2)}`;
        }
    };

    const handleDownloadLeave = (leave: LeaveApplication) => {
        try {
            const leaveId = leave.leaveId || leave.id.substring(0, 8).toUpperCase();
            const doc = new jsPDF();
            let yPosition = 20;

            doc.setFontSize(18);
            doc.text(`Leave Application - ${leaveId}`, 20, yPosition);
            yPosition += 15;

            doc.setFontSize(14);
            doc.text('Employee Information', 20, yPosition);
            yPosition += 10;
            doc.setFontSize(12);
            doc.text(`Name: ${leave.employeeInfo.fullName}`, 20, yPosition);
            yPosition += 10;
            doc.text(`Employee Code: ${leave.employeeInfo.employeeCode}`, 20, yPosition);
            yPosition += 10;
            doc.text(`Email: ${leave.employeeInfo.email}`, 20, yPosition);
            yPosition += 10;
            doc.text(`Department: ${leave.employeeInfo.department}`, 20, yPosition);
            yPosition += 10;
            doc.text(`Designation: ${leave.employeeInfo.designation}`, 20, yPosition);
            yPosition += 15;

            doc.setFontSize(14);
            doc.text('Leave Details', 20, yPosition);
            yPosition += 10;
            doc.setFontSize(12);
            doc.text(`Type: ${leave.leaveDetails.leaveType}`, 20, yPosition);
            yPosition += 10;
            doc.text(`From: ${formatDate(leave.leaveDetails.fromDate)}`, 20, yPosition);
            yPosition += 10;
            doc.text(`To: ${formatDate(leave.leaveDetails.toDate)}`, 20, yPosition);
            yPosition += 10;
            const duration = leave.requestedDays || calculateDuration(leave.leaveDetails.fromDate, leave.leaveDetails.toDate);
            doc.text(`Duration: ${duration} ${duration === 1 ? 'day' : 'days'}`, 20, yPosition);
            yPosition += 10;
            doc.text(`Available Days: ${leave.availableDays ?? 'N/A'}`, 20, yPosition);
            yPosition += 10;
            if (leave.insufficientBalance && leave.balanceWarning) {
                doc.setTextColor(255, 0, 0);
                doc.text(`Warning: ${leave.balanceWarning}`, 20, yPosition);
                doc.setTextColor(0, 0, 0);
                yPosition += 10;
            }
            doc.text(`Applied On: ${formatDate(leave.createdAt)}`, 20, yPosition);
            yPosition += 10;
            doc.text(`Status: ${leave.status.replace(/_/g, ' ').toUpperCase()}`, 20, yPosition);
            yPosition += 15;

            // Approval/Rejection Information
            if (leave.status.toLowerCase() === 'rejected' && leave.rejectedBy) {
            doc.setFontSize(14);
                doc.text('Rejection Details', 20, yPosition);
                yPosition += 10;
                doc.setFontSize(12);
                doc.text(`Rejected By: ${leave.rejectedBy}`, 20, yPosition);
                yPosition += 10;
                if (leave.rejectedAt) {
                    doc.text(`Rejected On: ${formatDate(leave.rejectedAt)}`, 20, yPosition);
                    yPosition += 10;
                }
                if (leave.rejectionReason) {
                    doc.text(`Reason: ${leave.rejectionReason}`, 20, yPosition);
                    yPosition += 10;
                }
                yPosition += 10;
            } else if (leave.manager_approved_by) {
                doc.setFontSize(14);
                doc.text('Approval Details', 20, yPosition);
                yPosition += 10;
                doc.setFontSize(12);
                doc.text(`Manager: ${leave.manager_approved_by}`, 20, yPosition);
                yPosition += 10;
                if (leave.manager_approved_at) {
                    doc.text(`Approved On: ${formatDate(leave.manager_approved_at)}`, 20, yPosition);
                    yPosition += 10;
                }
                if (leave.manager_comments) {
                    doc.text(`Comments: ${leave.manager_comments}`, 20, yPosition);
                    yPosition += 10;
                }
                if (leave.hrApprovedBy) {
                    doc.text(`HR Manager: ${leave.hrApprovedBy}`, 20, yPosition);
                    yPosition += 10;
                    if (leave.hrApprovedAt) {
                        doc.text(`HR Approved On: ${formatDate(leave.hrApprovedAt)}`, 20, yPosition);
                        yPosition += 10;
                    }
                    if (leave.hrApprovalComments) {
                        doc.text(`HR Comments: ${leave.hrApprovalComments}`, 20, yPosition);
                        yPosition += 10;
                    }
                }
                yPosition += 10;
            }

            doc.setFontSize(14);
            doc.text('Reason for Leave', 20, yPosition);
            yPosition += 10;
            doc.setFontSize(12);
            const reasonText = leave.leaveDetails.reasonForLeave || 'Not provided';
            const wrappedReason = doc.splitTextToSize(reasonText, 170);
            doc.text(wrappedReason, 20, yPosition);

            const now = new Date();
            const dateStr = now.toISOString().split('T')[0];
            const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
            const filename = `${leaveId}:${dateStr}:${timeStr}.pdf`;

            doc.save(filename);
        } catch (error) {
            console.error('Error downloading leave application:', error);
            setAlert({
                show: true,
                variant: 'error',
                title: 'Download Failed',
                message: 'Unable to download leave application. Please try again.'
            });
            setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 3000);
        }
    };

    // Calculate duration in days between two dates
    const calculateDuration = (fromDate: string, toDate: string): number => {
        try {
            const from = new Date(fromDate);
            const to = new Date(toDate);
            const diffTime = Math.abs(to.getTime() - from.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end days
            return diffDays;
        } catch {
            return 0;
        }
    };

    // Format period (from date to to date)
    const formatPeriod = (fromDate: string, toDate: string): string => {
        try {
            const from = formatDate(fromDate);
            const to = formatDate(toDate);
            return `${from} - ${to}`;
        } catch {
            return `${fromDate} - ${toDate}`;
        }
    };

    // Filter payslips based on search and status
    const filteredPayslips = payslips.filter(payslip => {
        const matchesSearch = searchQuery === '' || 
            payslip.payslipId.toLowerCase().includes(searchQuery.toLowerCase()) ||
            payslip.employee.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            payslip.employee.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
            payslip.department.toLowerCase().includes(searchQuery.toLowerCase());
        
        const matchesStatus = payslipStatusFilter === 'All Status' || payslip.status === payslipStatusFilter;
        
        return matchesSearch && matchesStatus;
    });

    // Paginate payslips
    const paginatedPayslips = filteredPayslips.slice(
        (payslipCurrentPage - 1) * payslipPageSize,
        payslipCurrentPage * payslipPageSize
    );

    // Reset to page 1 when filters change
    useEffect(() => {
        setPayslipCurrentPage(1);
    }, [searchQuery, payslipStatusFilter, payslipPageSize]);

    // Filter leave applications based on search and status
    const filteredLeaves = leaveApplications.filter(leave => {
        const matchesSearch = searchQuery === '' || 
            (leave.leaveId || leave.id).toLowerCase().includes(searchQuery.toLowerCase()) ||
            leave.employeeInfo.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            leave.employeeInfo.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
            leave.employeeInfo.employeeCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
            leave.leaveDetails.leaveType.toLowerCase().includes(searchQuery.toLowerCase());
        
        const normalizedStatus = leave.status.toLowerCase();
        const matchesStatus = leaveStatusFilter === 'All Status' || 
            (leaveStatusFilter === 'Pending' && (normalizedStatus === 'pending')) ||
            (leaveStatusFilter === 'Approved' && (normalizedStatus.includes('approved'))) ||
            (leaveStatusFilter === 'Rejected' && (normalizedStatus.includes('rejected')));
        
        return matchesSearch && matchesStatus;
    });

    // Paginate leave applications
    const paginatedLeaves = filteredLeaves.slice(
        (leaveCurrentPage - 1) * pageSize,
        leaveCurrentPage * pageSize
    );

    // Reset to page 1 when filters change
    useEffect(() => {
        if (currentView === 'leave') {
            setLeaveCurrentPage(1);
        }
    }, [searchQuery, leaveStatusFilter, pageSize, currentView]);

    const filteredExpenses = expenseApplications.filter(expense => {
        const matchesSearch = searchQuery === '' ||
            (expense.expenseId || expense.id).toLowerCase().includes(searchQuery.toLowerCase()) ||
            expense.employeeInfo.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (expense.employeeInfo.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            expense.employeeInfo.employeeCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
            expense.expenseDetails.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            expense.expenseDetails.category.toLowerCase().includes(searchQuery.toLowerCase());

        const normalizedStatus = expense.status?.toLowerCase() || '';
        const matchesStatus = expenseStatusFilter === 'All Status' ||
            (expenseStatusFilter === 'Pending' && normalizedStatus === 'pending') ||
            (expenseStatusFilter === 'Approved' && normalizedStatus.includes('approved')) ||
            (expenseStatusFilter === 'Rejected' && normalizedStatus.includes('rejected'));

        return matchesSearch && matchesStatus;
    });

    // Paginate expenses
    const paginatedExpenses = filteredExpenses.slice(
        (expenseCurrentPage - 1) * pageSize,
        expenseCurrentPage * pageSize
    );

    // Reset to page 1 when filters change
    useEffect(() => {
        if (currentView === 'expense') {
            setExpenseCurrentPage(1);
        }
    }, [searchQuery, expenseStatusFilter, pageSize, currentView]);

    const filteredAssets = assetRequests.filter(asset => {
        const matchesSearch = searchQuery === '' ||
            asset.requestId.toLowerCase().includes(searchQuery.toLowerCase()) ||
            asset.assetDetails.assetName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            asset.assetDetails.assetType.toLowerCase().includes(searchQuery.toLowerCase()) ||
            asset.assetDetails.priority.toLowerCase().includes(searchQuery.toLowerCase()) ||
            asset.status.toLowerCase().includes(searchQuery.toLowerCase());

        const normalizedStatus = asset.status?.toLowerCase() || '';
        const matchesStatus = assetStatusFilter === 'All Status' ||
            (assetStatusFilter === 'Pending' && normalizedStatus === 'pending') ||
            (assetStatusFilter === 'Approved' && normalizedStatus.includes('approved')) ||
            (assetStatusFilter === 'Rejected' && normalizedStatus.includes('rejected')) ||
            (assetStatusFilter === 'Issued' && normalizedStatus.includes('issued'));

        return matchesSearch && matchesStatus;
    });

    // Paginate assets
    const paginatedAssets = filteredAssets.slice(
        (assetCurrentPage - 1) * pageSize,
        assetCurrentPage * pageSize
    );

    // Reset to page 1 when filters change
    useEffect(() => {
        if (currentView === 'asset') {
            setAssetCurrentPage(1);
        }
    }, [searchQuery, assetStatusFilter, pageSize, currentView]);

    // Filter attendance records based on search query
    const filteredAttendance = attendanceRecords.filter(record => {
        if (searchQuery === '') return true;
        const query = searchQuery.toLowerCase();
        const dateStr = new Date(record.date).toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric'
        }).toLowerCase();
        const clockIn = (record.clockIn || record.clock_in || '').toLowerCase();
        const clockOut = (record.clockOut || record.clock_out || '').toLowerCase();
        const status = (record.clockInStatus || record.status || '').toLowerCase();
        const location = (() => {
            const loc = record.clockInLocation || record.location;
            if (!loc) return '';
            if ('city' in loc && loc.city) return `${loc.city}, ${loc.region || ''}, ${loc.country || ''}`.toLowerCase();
            if ('address' in loc && loc.address) return loc.address.toLowerCase();
            return '';
        })();
        const remarks = (record.remarks || record.notes || record.holidayName || '').toLowerCase();
        
        return dateStr.includes(query) || 
               clockIn.includes(query) || 
               clockOut.includes(query) || 
               status.includes(query) || 
               location.includes(query) || 
               remarks.includes(query);
    });

    // Paginate attendance records
    const paginatedAttendance = filteredAttendance.slice(
        (attendanceCurrentPage - 1) * pageSize,
        attendanceCurrentPage * pageSize
    );

    // Reset to page 1 when filters change
    useEffect(() => {
        if (currentView === 'attendance') {
            setAttendanceCurrentPage(1);
        }
    }, [searchQuery, pageSize, currentView]);

    // Filter projects (can add search/filter later if needed)
    const filteredProjects = projects;

    // Paginate projects
    const paginatedProjects = filteredProjects.slice(
        (projectCurrentPage - 1) * pageSize,
        projectCurrentPage * pageSize
    );

    // Reset to page 1 when filters change
    useEffect(() => {
        if (currentView === 'project') {
            setProjectCurrentPage(1);
        }
    }, [pageSize, currentView]);


    const getLeaveTypeColor = (type: string) => {
        const normalizedType = type.toLowerCase().trim();
        switch (normalizedType) {
            case 'sick': case 'sick leave': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
            case 'vacation': case 'annual': case 'annual leave': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
            case 'personal': case 'personal leave': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
            case 'maternity': case 'maternity leave': return 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400';
            case 'paternity': case 'paternity leave': return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400';
            case 'emergency': case 'emergency leave': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
            case 'casual': case 'casual leave': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
            default: return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400';
        }
    };

    const getProjectTypeIcon = (type: string) => {
        switch (type) {
            case 'web_development': return <FaCode className="w-4 h-4" />;
            case 'mobile_app': return <FaRocket className="w-4 h-4" />;
            case 'api_development': return <FaBuilding className="w-4 h-4" />;
            case 'maintenance': return <FaBug className="w-4 h-4" />;
            case 'consulting': return <FaUser className="w-4 h-4" />;
            case 'custom_software': return <FaCode className="w-4 h-4" />;
            default: return <FaCode className="w-4 h-4" />;
        }
    };

    return (
        <div className="h-full bg-white dark:bg-gray-900 rounded-lg shadow-2xl" style={{ height: '100vh', maxHeight: '100vh' }}>
            {/* Main Content Area */}
            <div className="flex-1 flex flex-col h-full">
                {/* Top Header Bar */}
                <div className="border-b bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between px-6 py-3">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={onBack}
                                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
                            >
                                <FaArrowLeft className="w-4 h-4" />
                            </button>
                            <div className="flex items-center gap-2">
                                <FaUser className="w-5 h-5 text-gray-400" />
                                <span className="text-lg font-semibold text-gray-900 dark:text-white">Employee Details</span>
                                <span className="px-2 py-1 text-xs rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">Private</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Page Title and View Controls */}
                <div className="px-6 py-4 bg-white dark:bg-gray-800">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <FaUser className="w-8 h-8 text-gray-400" />
                            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Employee Details</h1>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setShowUploadModal(true)}
                                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium flex items-center gap-2 shadow-lg hover:shadow-xl hover:shadow-blue-500/25 transition-all"
                            >
                                <FaUpload className="w-4 h-4" />
                                Upload
                            </button>
                            <div className="relative">
                                <button
                                    onClick={() => {
                                        if (currentView === 'attendance' && paginatedAttendance.length > 0) {
                                            setShowDownloadModal(true);
                                        } else if (currentView === 'salary' && paginatedPayslips.length > 0) {
                                            setShowDownloadModal(true);
                                        } else if (currentView === 'leave' && paginatedLeaves.length > 0) {
                                            setShowDownloadModal(true);
                                        } else if (currentView === 'project' && paginatedProjects.length > 0) {
                                            setShowDownloadModal(true);
                                        } else if (currentView === 'expense' && paginatedExpenses.length > 0) {
                                            setShowDownloadModal(true);
                                        } else if (currentView === 'asset' && paginatedAssets.length > 0) {
                                            setShowDownloadModal(true);
                                        } else {
                                            setAlert({
                                                show: true,
                                                variant: 'error',
                                                title: 'No Data',
                                                message: currentView === 'attendance' 
                                                    ? 'No attendance records available to download.'
                                                    : currentView === 'salary'
                                                    ? 'No payslip records available to download.'
                                                    : currentView === 'leave'
                                                    ? 'No leave records available to download.'
                                                    : currentView === 'project'
                                                    ? 'No project records available to download.'
                                                    : currentView === 'expense'
                                                    ? 'No expense records available to download.'
                                                    : currentView === 'asset'
                                                    ? 'No asset records available to download.'
                                                    : 'No records available to download.'
                                            });
                                            setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 3000);
                                        }
                                    }}
                                    className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-medium flex items-center gap-2 shadow-lg hover:shadow-xl hover:shadow-green-500/25 transition-all"
                                >
                                    <FaDownload className="w-4 h-4" />
                                    Download
                                </button>
                            </div>
                            <button
                                onClick={() => {
                                    if (employee) {
                                        setEditProfileFormData({
                                            emp_id: employee.emp_id || '',
                                            full_name: employee.full_name || '',
                                            email: employee.email || '',
                                            department: employee.department || '',
                                            phone: employee.phone || '',
                                        });
                                        // Set mobile - always use employee.phone if it exists, otherwise default to empty with India
                                        const phoneValue = employee.phone || '';
                                        if (phoneValue && phoneValue.trim() !== '') {
                                            // Normalize phone number - ensure it starts with + if it has country code
                                            let normalizedPhone = phoneValue.trim();
                                            // If it starts with digits but not +, check if it starts with country code
                                            if (!normalizedPhone.startsWith('+')) {
                                                // If it starts with 91 (India), add +
                                                if (normalizedPhone.startsWith('91') && normalizedPhone.length > 10) {
                                                    normalizedPhone = '+' + normalizedPhone;
                                                } else if (normalizedPhone.length <= 10) {
                                                    // If it's just a local number (10 digits or less), prepend +91
                                                    normalizedPhone = '+91' + normalizedPhone.replace(/^0+/, '');
                                                } else {
                                                    // For other cases, try to detect country code
                                                    normalizedPhone = '+' + normalizedPhone;
                                                }
                                            }
                                            setMobile(normalizedPhone);
                                            
                                            // Extract and set country code
                                            const match = normalizedPhone.match(/^\+(\d{1,3})/);
                                            if (match) {
                                                const countryCode = match[1];
                                                setDialCode(countryCode);
                                            } else {
                                                setDialCode('91');
                                            }
                                        } else {
                                            // If no phone number, default to empty with India
                                            setMobile('');
                                            setDialCode('91');
                                        }
                                        setEditProfileErrors({
                                            emp_id: '',
                                            full_name: '',
                                            email: '',
                                            department: '',
                                            phone: '',
                                        });
                                        setEditProfileTouched(new Set());
                                        setShowEditProfileModal(true);
                                    }
                                }}
                                className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-xl text-sm font-medium flex items-center gap-2 shadow-lg hover:shadow-xl hover:shadow-gray-500/25 transition-all"
                            >
                                <FaEdit className="w-4 h-4" />
                                Edit profile
                            </button>
                        </div>
                    </div>

                    {/* View Tabs */}
                    <div className="flex items-center gap-1 mb-4">
                        <button
                            onClick={() => setCurrentView('overview')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${
                                currentView === 'overview' 
                                    ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                        >
                            <FaUser className="w-4 h-4" />
                            Overview
                        </button>
                        <button
                            onClick={() => setCurrentView('salary')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${
                                currentView === 'salary' 
                                    ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                        >
                            <span className="text-base font-semibold">₹</span>
                            Salary
                        </button>
                        <button
                            onClick={() => setCurrentView('attendance')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${
                                currentView === 'attendance' 
                                    ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                        >
                            <FaClock className="w-4 h-4" />
                            Attendance
                        </button>
                        <button
                            onClick={() => setCurrentView('leave')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${
                                currentView === 'leave' 
                                    ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                        >
                            <FaCalendar className="w-4 h-4" />
                            Leave
                        </button>
                        <button
                            onClick={() => setCurrentView('project')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${
                                currentView === 'project' 
                                    ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                        >
                            <FaBuilding className="w-4 h-4" />
                            Projects
                        </button>
                        <button
                            onClick={() => setCurrentView('expense')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${
                                currentView === 'expense' 
                                    ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                        >
                            <FaReceipt className="w-4 h-4" />
                            Expense
                        </button>
                        <button
                            onClick={() => setCurrentView('asset')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${
                                currentView === 'asset' 
                                    ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                        >
                            <FaLaptop className="w-4 h-4" />
                            Asset
                        </button>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-16">
                            <div className="flex flex-col items-center gap-4">
                                <Loader />
                                <p className="text-gray-500 dark:text-gray-400">Loading employee details...</p>
                            </div>
                        </div>
                    ) : currentView === 'overview' ? (
                        <div className="p-6">
                            {employee ? (
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    {/* Employee Card */}
                                    <div className="lg:col-span-1">
                                        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                                            <div className="text-center">
                                                <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                                                    <span className="text-2xl font-semibold text-blue-600 dark:text-blue-400">
                                                        {employee.full_name.charAt(0).toUpperCase()}
                                                    </span>
                                                </div>
                                                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                                                    {employee.full_name}
                                                </h3>
                                                <p className="text-gray-600 dark:text-gray-400 mb-4">
                                                    {employee.emp_id} • {employee.department}
                                                </p>
                                                <div className="space-y-2">
                                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                                        <FaEnvelope className="w-4 h-4 inline mr-2" />
                                                        {employee.email}
                                                    </p>
                                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                                        <FaPhone className="w-4 h-4 inline mr-2" />
                                                        {employee.phone}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Stats Cards */}
                                    <div className="lg:col-span-2">
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                                                <div className="flex items-center">
                                                    <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                                                        <span className="text-2xl font-semibold text-green-600 dark:text-green-400">₹</span>
                                                    </div>
                                                    <div className="ml-4">
                                                        <p className="text-sm text-gray-500 dark:text-gray-400">Current Salary</p>
                                                        <p className="text-lg font-semibold text-gray-900 dark:text-white">
                                                            {employee.salary ? `₹${employee.salary.toLocaleString()}` : 'N/A'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                                                <div className="flex items-center">
                                                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                                                        <FaClock className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                                                    </div>
                                                    <div className="ml-4">
                                                        <p className="text-sm text-gray-500 dark:text-gray-400">Total Hours</p>
                                                        <p className="text-lg font-semibold text-gray-900 dark:text-white">
                                                            {timeTracking ? `${timeTracking.total_hours_worked}h` : '-'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                                                <div className="flex items-center">
                                                    <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                                                        <FaBuilding className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                                                    </div>
                                                    <div className="ml-4">
                                                        <p className="text-sm text-gray-500 dark:text-gray-400">Active Projects</p>
                                                        <p className="text-lg font-semibold text-gray-900 dark:text-white">
                                                            {projects.filter(p => p.status === 'in_progress' || p.status === 'planning').length}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Recent Activity */}
                                        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                                            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Activity</h4>
                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                                    <div className="flex items-center">
                                                        <span className="text-lg font-semibold text-green-600 mr-3">₹</span>
                                                        <span className="text-sm text-gray-900 dark:text-white">Salary processed for December 2024</span>
                                                    </div>
                                                    <span className="text-xs text-gray-500 dark:text-gray-400">2 days ago</span>
                                                </div>
                                                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                                    <div className="flex items-center">
                                                        <FaClock className="w-4 h-4 text-blue-600 mr-3" />
                                                        <span className="text-sm text-gray-900 dark:text-white">Checked in at 9:15 AM</span>
                                                    </div>
                                                    <span className="text-xs text-gray-500 dark:text-gray-400">Today</span>
                                                </div>
                                                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                                    <div className="flex items-center">
                                                        <FaBuilding className="w-4 h-4 text-purple-600 mr-3" />
                                                        <span className="text-sm text-gray-900 dark:text-white">Assigned to new project</span>
                                                    </div>
                                                    <span className="text-xs text-gray-500 dark:text-gray-400">3 days ago</span>
                                                </div>
                                                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                                    <div className="flex items-center">
                                                        <FaCalendar className="w-4 h-4 text-orange-600 mr-3" />
                                                        <span className="text-sm text-gray-900 dark:text-white">Leave request approved</span>
                                                    </div>
                                                    <span className="text-xs text-gray-500 dark:text-gray-400">1 week ago</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-16">
                                    <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 bg-gray-100 dark:bg-gray-700">
                                        <FaUser className="w-8 h-8 text-gray-400" />
                                    </div>
                                    <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">Employee not found</h3>
                                    <p className="text-gray-500 dark:text-gray-400">
                                        The employee details could not be loaded.
                                    </p>
                                </div>
                            )}
                        </div>
                    ) : currentView === 'salary' ? (
                        <div className="p-6">
                            {/* Search and Filter Bar - Only show when Salary tab is active */}
                            <div className="mb-4 flex items-center justify-between">
                                <div className="flex items-center gap-2 flex-1">
                                    <div className="relative flex-1 max-w-md">
                                        <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                        <input
                                            type="text"
                                            placeholder="Search payslips..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="pl-10 pr-4 py-2 rounded-lg text-sm border-0 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 w-full"
                                        />
                                    </div>
                                    <select
                                        value={payslipStatusFilter}
                                        onChange={(e) => setPayslipStatusFilter(e.target.value)}
                                        className="px-3 py-2 rounded-lg text-sm border-0 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white"
                                    >
                                        <option value="All Status">All Status</option>
                                        <option value="Pending">Pending</option>
                                        <option value="Finance Approved">Finance Approved</option>
                                        <option value="Finance Rejected">Finance Rejected</option>
                                        <option value="Generated">Generated</option>
                                    </select>
                                </div>
                                <div className="flex items-center gap-2">
                                    <select
                                        value={payslipPageSize}
                                        onChange={(e) => {
                                            setPayslipPageSize(Number(e.target.value));
                                            setPayslipCurrentPage(1);
                                        }}
                                        className="px-3 py-2 rounded-lg text-sm border-0 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white"
                                    >
                                        <option value={5}>5 per page</option>
                                        <option value={10}>10 per page</option>
                                        <option value={25}>25 per page</option>
                                        <option value={50}>50 per page</option>
                                    </select>
                                    <button 
                                        onClick={() => employee?.emp_id && fetchEmployeePayslips(employee.emp_id)}
                                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
                                        title="Refresh payslips"
                                    >
                                        <FaSync className={`w-4 h-4 ${isLoadingPayslips ? 'animate-spin' : ''}`} />
                                    </button>
                                </div>
                            </div>

                            {/* Payslips Table */}
                            <div className="rounded-lg border bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                                    <div className="grid grid-cols-12 gap-4 text-sm font-semibold">
                                        <div className="col-span-2">
                                            <span className="text-gray-600 dark:text-gray-300">PAYSLIP ID</span>
                                        </div>
                                        <div className="col-span-2">
                                            <span className="text-gray-600 dark:text-gray-300">EMPLOYEE</span>
                                        </div>
                                        <div className="col-span-1">
                                            <span className="text-gray-600 dark:text-gray-300">DEPARTMENT</span>
                                        </div>
                                        <div className="col-span-1">
                                            <span className="text-gray-600 dark:text-gray-300">MONTH</span>
                                        </div>
                                        <div className="col-span-1">
                                            <span className="text-gray-600 dark:text-gray-300">PAY DATE</span>
                                        </div>
                                        <div className="col-span-1">
                                            <span className="text-gray-600 dark:text-gray-300">GROSS PAY</span>
                                        </div>
                                        <div className="col-span-1">
                                            <span className="text-gray-600 dark:text-gray-300">NET PAY</span>
                                        </div>
                                        <div className="col-span-2">
                                            <span className="text-gray-600 dark:text-gray-300">STATUS</span>
                                        </div>
                                        <div className="col-span-1">
                                            <span className="text-gray-600 dark:text-gray-300">ACTIONS</span>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                                    {isLoadingPayslips ? (
                                        <div className="px-6 py-8 text-center">
                                            <Loader />
                                            <p className="text-gray-500 dark:text-gray-400 mt-2">Loading payslips...</p>
                                        </div>
                                    ) : filteredPayslips.length === 0 ? (
                                        <div className="px-6 py-8 text-center">
                                            <span className="text-4xl font-semibold text-gray-400 mx-auto mb-2 block">₹</span>
                                            <p className="text-gray-500 dark:text-gray-400">No payslip records found</p>
                                            {searchQuery || payslipStatusFilter !== 'All Status' ? (
                                                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                                                    No payslips match your current filters.
                                                </p>
                                            ) : (
                                                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                                                    Payslips will appear here once they are generated.
                                                </p>
                                            )}
                                        </div>
                                    ) : (
                                        paginatedPayslips.map((payslip) => (
                                            <div key={payslip.id} className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                                <div className="grid grid-cols-12 gap-4 items-center">
                                                    <div className="col-span-2">
                                                        <p className="font-medium text-gray-900 dark:text-white text-sm">
                                                            {payslip.payslipId}
                                                        </p>
                                                    </div>
                                                    <div className="col-span-2">
                                                        <div className="min-w-0">
                                                            <p className="font-medium text-gray-900 dark:text-white text-sm truncate">
                                                                {payslip.employee.name}
                                                            </p>
                                                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                                                {payslip.employee.email}
                                                        </p>
                                                    </div>
                                                    </div>
                                                    <div className="col-span-1">
                                                        <p className="text-sm text-gray-900 dark:text-white truncate">
                                                            {payslip.department}
                                                        </p>
                                                    </div>
                                                    <div className="col-span-1">
                                                        <p className="text-sm text-gray-900 dark:text-white">
                                                            {payslip.month}
                                                        </p>
                                                    </div>
                                                    <div className="col-span-1">
                                                        <p className="text-sm text-gray-900 dark:text-white">
                                                            {formatDate(payslip.payDate)}
                                                        </p>
                                                    </div>
                                                    <div className="col-span-1">
                                                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                                                            {formatCurrency(payslip.grossPay)}
                                                        </p>
                                                    </div>
                                                    <div className="col-span-1">
                                                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                                            {formatCurrency(payslip.netPay)}
                                                        </p>
                                                    </div>
                                                    <div className="col-span-2">
                                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(payslip.status)}`}>
                                                            {payslip.status}
                                                        </span>
                                                    </div>
                                                    <div className="col-span-1">
                                                        <div className="flex items-center gap-1">
                                                            <button
                                                                onClick={() => handleViewPayslip(payslip)}
                                                                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300"
                                                                title="View payslip"
                                                            >
                                                                <FaEye className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDownloadPayslip(payslip)}
                                                                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300"
                                                                title="Download payslip"
                                                            >
                                                                <FaDownload className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                                
                                {/* Pagination Controls */}
                                {filteredPayslips.length > 0 && (
                                    <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                                        <div className="text-sm text-gray-600 dark:text-gray-400">
                                            Showing {((payslipCurrentPage - 1) * payslipPageSize) + 1} to {Math.min(payslipCurrentPage * payslipPageSize, filteredPayslips.length)} of {filteredPayslips.length} payslips
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => setPayslipCurrentPage(prev => Math.max(1, prev - 1))}
                                                disabled={payslipCurrentPage === 1}
                                                className="px-3 py-1 rounded-lg text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                Previous
                                            </button>
                                            <span className="text-sm text-gray-600 dark:text-gray-400">
                                                Page {payslipCurrentPage} of {Math.ceil(filteredPayslips.length / payslipPageSize) || 1}
                                            </span>
                                            <button
                                                onClick={() => setPayslipCurrentPage(prev => Math.min(Math.ceil(filteredPayslips.length / payslipPageSize) || 1, prev + 1))}
                                                disabled={payslipCurrentPage >= (Math.ceil(filteredPayslips.length / payslipPageSize) || 1)}
                                                className="px-3 py-1 rounded-lg text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                Next
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : currentView === 'attendance' ? (
                        <div className="p-6">
                            {/* Search and Filter Bar - Only show when Attendance tab is active */}
                            <div className="mb-4 flex items-center justify-between">
                                <div className="flex items-center gap-2 flex-1">
                                    <div className="relative flex-1 max-w-md">
                                        <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                        <input
                                            type="text"
                                            placeholder="Search attendance records..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="pl-10 pr-4 py-2 rounded-lg text-sm border-0 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 w-full"
                                        />
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <select
                                        value={pageSize}
                                        onChange={(e) => {
                                            setPageSize(Number(e.target.value));
                                        }}
                                        className="px-3 py-2 rounded-lg text-sm border-0 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white"
                                    >
                                        <option value={5}>5 per page</option>
                                        <option value={10}>10 per page</option>
                                        <option value={25}>25 per page</option>
                                        <option value={50}>50 per page</option>
                                    </select>
                                        <button
                                    onClick={() => employee?.email && fetchEmployeeAttendance(employee.email)}
                                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
                                        title="Refresh attendance records"
                                        >
                                        <FaSync className={`w-4 h-4 ${isLoadingAttendance ? 'animate-spin' : ''}`} />
                                        </button>
                                </div>
                                    </div>

                            {isLoadingAttendance ? (
                                <div className="text-center py-12">
                                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                    <p className="mt-4 text-gray-500 dark:text-gray-400">Loading attendance records...</p>
                                </div>
                            ) : filteredAttendance.length === 0 ? (
                                <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                                    <FaClock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                    <p className="text-gray-500 dark:text-gray-400 text-lg">No attendance records found</p>
                                    {searchQuery ? (
                                        <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">No records match your search query</p>
                                    ) : (
                                    <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">Attendance records will appear here once the employee marks attendance</p>
                                    )}
                            </div>
                            ) : (
                                <>
                                <div className="rounded-lg border bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 overflow-hidden">
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                                                <tr>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Clock In</th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Clock Out</th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Hours</th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Overtime</th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Late By</th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Location</th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Remarks</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                                {paginatedAttendance.map((record) => {
                                                    const getStatusColor = (status?: string) => {
                                                        if (!status) return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
                                                        const s = status.toLowerCase();
                                                        if (s === 'present' || s === 'on-time') return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
                                                        if (s === 'absent') return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
                                                        if (s === 'late') return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
                                                        if (s === 'half day' || s === 'half_day') return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
                                                        if (s === 'over-time') return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
                                                        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
                                                    };

                                                    // Calculate total hours from clockIn and clockOut
                                                    const calculateTotalHours = () => {
                                                        const clockIn = record.clockIn || record.clock_in;
                                                        const clockOut = record.clockOut || record.clock_out;
                                                        if (!clockIn) return '-';
                                                        if (!clockOut) return 'In Progress';
                                                        
                                                        try {
                                                            const inTime = new Date(clockIn);
                                                            const outTime = new Date(clockOut);
                                                            const diffMs = outTime.getTime() - inTime.getTime();
                                                            const diffHours = diffMs / (1000 * 60 * 60);
                                                            const hours = Math.floor(diffHours);
                                                            const minutes = Math.floor((diffHours - hours) * 60);
                                                            return `${hours}h ${minutes}m`;
                                                        } catch {
                                                            return '-';
                                                        }
                                                    };

                                                    // Format time for display
                                                    const formatTime = (timeStr?: string | null) => {
                                                        if (!timeStr) return '-';
                                                        try {
                                                            const date = new Date(timeStr);
                                                            return date.toLocaleTimeString('en-US', { 
                                                                hour: '2-digit', 
                                                                minute: '2-digit',
                                                                hour12: true
                                                            });
                                                        } catch {
                                                            return timeStr;
                                                        }
                                                    };

                                                    // Get location string
                                                    const getLocationString = () => {
                                                        const location = record.clockInLocation || record.location;
                                                        if (!location) return '-';
                                                        // Type guard: check if location has city property (clockInLocation type)
                                                        if ('city' in location && location.city && 'region' in location && location.region && 'country' in location && location.country) {
                                                            return `${location.city}, ${location.region}, ${location.country}`;
                                                        }
                                                        // Check for latitude/longitude (both types can have these)
                                                        if ('latitude' in location && 'longitude' in location && location.latitude && location.longitude) {
                                                            return `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`;
                                                        }
                                                        // Check for address (legacy location type)
                                                        if ('address' in location && location.address) {
                                                            return location.address;
                                                        }
                                                        return '-';
                                                    };

                                                    // Get status display
                                                    const getStatusDisplay = () => {
                                                        if (record.clockInStatus) return record.clockInStatus;
                                                        if (record.clockOutStatus) return record.clockOutStatus;
                                                        if (record.status) return record.status;
                                                        if (record.clockIn && !record.clockOut) return 'In Progress';
                                                        return '-';
                                                    };

                                                    const recordId = record._id || record.id || `attendance-${record.date}`;

                                                    return (
                                                        <tr key={recordId} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                                                {new Date(record.date).toLocaleDateString('en-US', { 
                                                                    year: 'numeric', 
                                                                    month: 'short', 
                                                                    day: 'numeric',
                                                                    weekday: 'short'
                                                                })}
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                                                {formatTime(record.clockIn || record.clock_in)}
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                                                {formatTime(record.clockOut || record.clock_out)}
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                                                                {record.total_hours ? formatTotalHours(record.total_hours) : calculateTotalHours()}
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                                                {record.overTime || (record.overTimeMinutes ? `${record.overTimeMinutes} min` : null) || formatOvertimeHours(record.overtime_hours)}
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                <span className={`px-2 py-1 text-xs rounded-full font-medium ${getStatusColor(getStatusDisplay())}`}>
                                                                    {getStatusDisplay()}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                                                {record.lateBy || formatLateByTime(record.late_by) || '-'}
                                                            </td>
                                                            <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">
                                                                {getLocationString()}
                                                                {(record.clockInLocation || record.location) && (
                                                                    <span className="ml-2 px-2 py-0.5 text-xs bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 rounded">
                                                                        {record.isSpecialDay ? (record.specialDayType || 'Special') : 'Remote'}
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">
                                                                {record.remarks || record.notes || record.holidayName || '-'}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                        </div>
                                    </div>
                                    
                                    {/* Pagination Controls */}
                                    {filteredAttendance.length > 0 && (
                                        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                                            <div className="text-sm text-gray-600 dark:text-gray-400">
                                                Showing {((attendanceCurrentPage - 1) * pageSize) + 1} to {Math.min(attendanceCurrentPage * pageSize, filteredAttendance.length)} of {filteredAttendance.length} records
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => setAttendanceCurrentPage(prev => Math.max(1, prev - 1))}
                                                    disabled={attendanceCurrentPage === 1}
                                                    className="px-3 py-1 rounded-lg text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    Previous
                                                </button>
                                                <span className="text-sm text-gray-600 dark:text-gray-400">
                                                    Page {attendanceCurrentPage} of {Math.ceil(filteredAttendance.length / pageSize) || 1}
                                                </span>
                                                <button
                                                    onClick={() => setAttendanceCurrentPage(prev => Math.min(Math.ceil(filteredAttendance.length / pageSize) || 1, prev + 1))}
                                                    disabled={attendanceCurrentPage >= (Math.ceil(filteredAttendance.length / pageSize) || 1)}
                                                    className="px-3 py-1 rounded-lg text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    Next
                                                </button>
                                        </div>
                                        </div>
                                    )}
                                </>
                            )}
                                        </div>
                    ) : currentView === 'leave' ? (
                        <div className="p-6">
                            {/* Search and Filter Bar - Only show when Leave tab is active */}
                            <div className="mb-4 flex items-center justify-between">
                                <div className="flex items-center gap-2 flex-1">
                                    <div className="relative flex-1 max-w-md">
                                        <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                        <input
                                            type="text"
                                            placeholder="Search leave applications..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="pl-10 pr-4 py-2 rounded-lg text-sm border-0 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 w-full"
                                        />
                                        </div>
                                    <select
                                        value={leaveStatusFilter}
                                        onChange={(e) => setLeaveStatusFilter(e.target.value)}
                                        className="px-3 py-2 rounded-lg text-sm border-0 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white"
                                    >
                                        <option value="All Status">All Status</option>
                                        <option value="Pending">Pending</option>
                                        <option value="Approved">Approved</option>
                                        <option value="Rejected">Rejected</option>
                                    </select>
                                    </div>
                                <div className="flex items-center gap-2">
                                    <select
                                        value={pageSize}
                                        onChange={(e) => {
                                            setPageSize(Number(e.target.value));
                                        }}
                                        className="px-3 py-2 rounded-lg text-sm border-0 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white"
                                    >
                                        <option value={5}>5 per page</option>
                                        <option value={10}>10 per page</option>
                                        <option value={25}>25 per page</option>
                                        <option value={50}>50 per page</option>
                                    </select>
                                    <button 
                                        onClick={() => employee?.email && fetchEmployeeLeaves(employee.email)}
                                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
                                        title="Refresh leave applications"
                                    >
                                        <FaSync className={`w-4 h-4 ${isLoadingLeaves ? 'animate-spin' : ''}`} />
                                    </button>
                                </div>
                            </div>

                            {/* Leave Applications Table */}
                            <div className="rounded-lg border bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                                    <div className="grid grid-cols-12 gap-4 text-sm font-semibold">
                                        <div className="col-span-1">
                                            <span className="text-gray-600 dark:text-gray-300">LEAVE ID</span>
                                        </div>
                                        <div className="col-span-2">
                                            <span className="text-gray-600 dark:text-gray-300">EMPLOYEE</span>
                                        </div>
                                        <div className="col-span-2">
                                            <span className="text-gray-600 dark:text-gray-300">TYPE</span>
                                        </div>
                                        <div className="col-span-1">
                                            <span className="text-gray-600 dark:text-gray-300">DURATION</span>
                                        </div>
                                        <div className="col-span-2">
                                            <span className="text-gray-600 dark:text-gray-300">PERIOD</span>
                                        </div>
                                        <div className="col-span-2">
                                            <span className="text-gray-600 dark:text-gray-300">APPLIED ON</span>
                                        </div>
                                        <div className="col-span-1">
                                            <span className="text-gray-600 dark:text-gray-300">STATUS</span>
                                        </div>
                                        <div className="col-span-1">
                                            <span className="text-gray-600 dark:text-gray-300">ACTIONS</span>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                                    {isLoadingLeaves ? (
                                        <div className="px-6 py-8 text-center">
                                            <Loader />
                                            <p className="text-gray-500 dark:text-gray-400 mt-2">Loading leave applications...</p>
                                        </div>
                                    ) : filteredLeaves.length === 0 ? (
                                        <div className="px-6 py-8 text-center">
                                            <FaCalendar className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                                            <p className="text-gray-500 dark:text-gray-400">No leave records found</p>
                                            {searchQuery || leaveStatusFilter !== 'All Status' ? (
                                                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                                                    No leave applications match your current filters.
                                                </p>
                                            ) : (
                                                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                                                    Leave applications will appear here once they are submitted.
                                                </p>
                                            )}
                                        </div>
                                    ) : (
                                        paginatedLeaves.map((leave) => {
                                            const duration = leave.requestedDays || calculateDuration(leave.leaveDetails.fromDate, leave.leaveDetails.toDate);
                                            const period = formatPeriod(leave.leaveDetails.fromDate, leave.leaveDetails.toDate);
                                            const appliedOn = formatDate(leave.createdAt);
                                            const leaveId = leave.leaveId || leave.id.substring(0, 8).toUpperCase();
                                            
                                            return (
                                                <div key={leave.id} className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                                <div className="grid grid-cols-12 gap-4 items-center">
                                                        <div className="col-span-1">
                                                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                                                                {leaveId}
                                                        </p>
                                                    </div>
                                                    <div className="col-span-2">
                                                            <div className="min-w-0">
                                                                <p className="font-medium text-gray-900 dark:text-white text-sm truncate">
                                                                    {leave.employeeInfo.fullName}
                                                                </p>
                                                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                                                    {leave.employeeInfo.email}
                                                        </p>
                                                    </div>
                                                    </div>
                                                    <div className="col-span-2">
                                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getLeaveTypeColor(leave.leaveDetails.leaveType.toLowerCase())}`}>
                                                                {leave.leaveDetails.leaveType}
                                                            </span>
                                                    </div>
                                                    <div className="col-span-1">
                                                            <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                                                {duration} {duration === 1 ? 'day' : 'days'}
                                                            </p>
                                                </div>
                                        <div className="col-span-2">
                                                            <p className="text-sm text-gray-900 dark:text-white">
                                                                {period}
                                                        </p>
                                                    </div>
                                                    <div className="col-span-2">
                                                            <p className="text-sm text-gray-900 dark:text-white">
                                                                {appliedOn}
                                                        </p>
                                                    </div>
                                                    <div className="col-span-1">
                                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(leave.status)}`}>
                                                                {leave.status.replace(/_/g, ' ').toUpperCase()}
                                                        </span>
                                                    </div>
                                                    <div className="col-span-1">
                                                        <div className="flex items-center gap-1">
                                                            <button
                                                                    onClick={() => handleViewLeave(leave)}
                                                                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300"
                                                                    title="View leave application"
                                                            >
                                                                <FaEye className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                    onClick={() => handleDownloadLeave(leave)}
                                                                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300"
                                                                    title="Download leave application"
                                                                >
                                                                    <FaDownload className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            );
                                        })
                                    )}
                                </div>
                                
                                {/* Pagination Controls */}
                                {filteredLeaves.length > 0 && (
                                    <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                                        <div className="text-sm text-gray-600 dark:text-gray-400">
                                            Showing {((leaveCurrentPage - 1) * pageSize) + 1} to {Math.min(leaveCurrentPage * pageSize, filteredLeaves.length)} of {filteredLeaves.length} records
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => setLeaveCurrentPage(prev => Math.max(1, prev - 1))}
                                                disabled={leaveCurrentPage === 1}
                                                className="px-3 py-1 rounded-lg text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                Previous
                                            </button>
                                            <span className="text-sm text-gray-600 dark:text-gray-400">
                                                Page {leaveCurrentPage} of {Math.ceil(filteredLeaves.length / pageSize) || 1}
                                            </span>
                                            <button
                                                onClick={() => setLeaveCurrentPage(prev => Math.min(Math.ceil(filteredLeaves.length / pageSize) || 1, prev + 1))}
                                                disabled={leaveCurrentPage >= (Math.ceil(filteredLeaves.length / pageSize) || 1)}
                                                className="px-3 py-1 rounded-lg text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                Next
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : currentView === 'project' ? (
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div></div>
                                <div className="flex items-center gap-2">
                                    <select
                                        value={pageSize}
                                        onChange={(e) => {
                                            setPageSize(Number(e.target.value));
                                        }}
                                        className="px-3 py-2 rounded-lg text-sm border-0 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white"
                                    >
                                        <option value={5}>5 per page</option>
                                        <option value={10}>10 per page</option>
                                        <option value={25}>25 per page</option>
                                        <option value={50}>50 per page</option>
                                    </select>
                                <button
                                    onClick={() => handleAddRecord('project')}
                                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium flex items-center gap-2 shadow-lg hover:shadow-xl hover:shadow-blue-500/25 transition-all"
                                >
                                    <FaPlus className="w-4 h-4" />
                                    Add New
                                </button>
                                </div>
                            </div>
                            <div className="rounded-lg border bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                                    <div className="grid grid-cols-12 gap-4 text-sm font-semibold">
                                        <div className="col-span-3">
                                            <span className="text-gray-600 dark:text-gray-300">Project Name</span>
                                        </div>
                                        <div className="col-span-2">
                                            <span className="text-gray-600 dark:text-gray-300">Customer</span>
                                        </div>
                                        <div className="col-span-2">
                                            <span className="text-gray-600 dark:text-gray-300">Status</span>
                                        </div>
                                        <div className="col-span-2">
                                            <span className="text-gray-600 dark:text-gray-300">Role</span>
                                        </div>
                                        <div className="col-span-2">
                                            <span className="text-gray-600 dark:text-gray-300">Progress</span>
                                        </div>
                                        <div className="col-span-1">
                                            <span className="text-gray-600 dark:text-gray-300">Actions</span>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                                    {filteredProjects.length === 0 ? (
                                        <div className="px-6 py-8 text-center">
                                            <FaBuilding className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                                            <p className="text-gray-500 dark:text-gray-400">No projects found</p>
                                            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                                                This employee is not assigned to any projects yet.
                                            </p>
                                            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                                <p className="text-sm text-blue-700 dark:text-blue-300">
                                                    <strong>To assign projects to this employee:</strong>
                                                </p>
                                                <ol className="text-sm text-blue-600 dark:text-blue-400 mt-2 list-decimal list-inside space-y-1">
                                                    <li>Go to the Customer section</li>
                                                    <li>Open a customer&apos;s Order Details</li>
                                                    <li>Create or edit a project</li>
                                                    <li>Add this employee&apos;s email ({employee?.email}) as Project Manager or Team Member</li>
                                                </ol>
                                            </div>
                                        </div>
                                    ) : (
                                        paginatedProjects.map((project) => (
                                            <div key={project.id} className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                                <div className="grid grid-cols-12 gap-4 items-center">
                                                    <div className="col-span-3">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gray-100 dark:bg-gray-700">
                                                                {getProjectTypeIcon(project.project_type)}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="font-medium truncate text-gray-900 dark:text-white">
                                                                    {project.project_name}
                                                                </p>
                                                                <p className="text-sm truncate text-gray-500 dark:text-gray-400">
                                                                    {project.order_number}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="col-span-2">
                                                        <p className="text-sm text-gray-900 dark:text-white truncate" title={project.customer_name}>
                                                            {project.customer_name}
                                                        </p>
                                                    </div>
                                                    <div className="col-span-2">
                                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
                                                            {project.status.replace('_', ' ').toUpperCase()}
                                                        </span>
                                                    </div>
                                                    <div className="col-span-2">
                                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                            project.employee_role === 'project_manager' 
                                                                ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                                                                : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                                        }`}>
                                                            {project.employee_role === 'project_manager' ? 'Manager' : 'Member'}
                                                        </span>
                                                    </div>
                                                    <div className="col-span-2">
                                                        <div className="flex items-center gap-2">
                                                            <div className="flex-1 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                                                                <div 
                                                                    className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full transition-all duration-300"
                                                                    style={{ width: `${project.progress_percentage}%` }}
                                                                ></div>
                                                            </div>
                                                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                                                                {project.progress_percentage}%
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="col-span-1">
                                                        <div className="flex items-center gap-1">
                                                            <button
                                                                onClick={() => handleViewEmployee(employee!)}
                                                                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300"
                                                                title="View project details"
                                                            >
                                                                <FaEye className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                                
                                {/* Pagination Controls */}
                                {filteredProjects.length > 0 && (
                                    <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                                        <div className="text-sm text-gray-600 dark:text-gray-400">
                                            Showing {((projectCurrentPage - 1) * pageSize) + 1} to {Math.min(projectCurrentPage * pageSize, filteredProjects.length)} of {filteredProjects.length} records
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => setProjectCurrentPage(prev => Math.max(1, prev - 1))}
                                                disabled={projectCurrentPage === 1}
                                                className="px-3 py-1 rounded-lg text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                Previous
                                            </button>
                                            <span className="text-sm text-gray-600 dark:text-gray-400">
                                                Page {projectCurrentPage} of {Math.ceil(filteredProjects.length / pageSize) || 1}
                                            </span>
                                            <button
                                                onClick={() => setProjectCurrentPage(prev => Math.min(Math.ceil(filteredProjects.length / pageSize) || 1, prev + 1))}
                                                disabled={projectCurrentPage >= (Math.ceil(filteredProjects.length / pageSize) || 1)}
                                                className="px-3 py-1 rounded-lg text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                Next
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : currentView === 'expense' ? (
                        <div className="p-6">
                            <div className="mb-4 flex items-center justify-between">
                                <div className="flex items-center gap-2 flex-1">
                                    <div className="relative flex-1 max-w-md">
                                        <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                        <input
                                            type="text"
                                            placeholder="Search expense claims..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="pl-10 pr-4 py-2 rounded-lg text-sm border-0 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 w-full"
                                        />
                                    </div>
                                    <select
                                        value={expenseStatusFilter}
                                        onChange={(e) => setExpenseStatusFilter(e.target.value)}
                                        className="px-3 py-2 rounded-lg text-sm border-0 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white"
                                    >
                                        <option value="All Status">All Status</option>
                                        <option value="Pending">Pending</option>
                                        <option value="Approved">Approved</option>
                                        <option value="Rejected">Rejected</option>
                                    </select>
                                </div>
                                <div className="flex items-center gap-2">
                                    <select
                                        value={pageSize}
                                        onChange={(e) => {
                                            setPageSize(Number(e.target.value));
                                        }}
                                        className="px-3 py-2 rounded-lg text-sm border-0 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white"
                                    >
                                        <option value={5}>5 per page</option>
                                        <option value={10}>10 per page</option>
                                        <option value={25}>25 per page</option>
                                        <option value={50}>50 per page</option>
                                    </select>
                                    <button 
                                        onClick={() => employee?.email && fetchEmployeeExpenses(employee.email)}
                                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
                                        title="Refresh expense claims"
                                    >
                                        <FaSync className={`w-4 h-4 ${isLoadingExpenses ? 'animate-spin' : ''}`} />
                                    </button>
                                </div>
                            </div>

                            <div className="rounded-lg border bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                                    <div className="grid grid-cols-12 gap-4 text-sm font-semibold">
                                        <div className="col-span-2">
                                            <span className="text-gray-600 dark:text-gray-300">EXPENSE ID</span>
                                        </div>
                                        <div className="col-span-2">
                                            <span className="text-gray-600 dark:text-gray-300">EMPLOYEE</span>
                                        </div>
                                        <div className="col-span-2">
                                            <span className="text-gray-600 dark:text-gray-300">TITLE</span>
                                        </div>
                                        <div className="col-span-1">
                                            <span className="text-gray-600 dark:text-gray-300">CATEGORY</span>
                                        </div>
                                        <div className="col-span-2">
                                            <span className="text-gray-600 dark:text-gray-300">AMOUNT</span>
                                        </div>
                                        <div className="col-span-1">
                                            <span className="text-gray-600 dark:text-gray-300">DATE</span>
                                        </div>
                                        <div className="col-span-1">
                                            <span className="text-gray-600 dark:text-gray-300">STATUS</span>
                                        </div>
                                        <div className="col-span-1">
                                            <span className="text-gray-600 dark:text-gray-300">ACTIONS</span>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                                    {isLoadingExpenses ? (
                                        <div className="px-6 py-8 text-center">
                                            <Loader />
                                            <p className="text-gray-500 dark:text-gray-400 mt-2">Loading expense records...</p>
                                        </div>
                                    ) : filteredExpenses.length === 0 ? (
                                        <div className="px-6 py-8 text-center">
                                            <FaReceipt className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                                            <p className="text-gray-500 dark:text-gray-400">No expense records found</p>
                                            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                                                Expense records will appear here once they are added.
                                            </p>
                                        </div>
                                    ) : (
                                        paginatedExpenses.map((expense) => {
                                            const amount = formatExpenseAmount(expense.expenseDetails.amount, expense.expenseDetails.currency);
                                            const date = formatDate(expense.expenseDetails.date);
                                            const expenseId = expense.expenseId || expense.id.substring(0, 8).toUpperCase();

                                            return (
                                                <div key={expense.id} className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                                    <div className="grid grid-cols-12 gap-4 items-center">
                                                        <div className="col-span-2">
                                                            <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                                                {expenseId}
                                                            </p>
                                                        </div>
                                                        <div className="col-span-2">
                                                            <p className="font-medium text-gray-900 dark:text-white text-sm truncate">
                                                                {expense.employeeInfo.fullName}
                                                            </p>
                                                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                                                {expense.employeeInfo.email}
                                                            </p>
                                                        </div>
                                                        <div className="col-span-2">
                                                            <p className="text-sm text-gray-900 dark:text-white truncate">
                                                                {expense.expenseDetails.title}
                                                            </p>
                                                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                                                {expense.expenseDetails.description || 'No description'}
                                                            </p>
                                                        </div>
                                                        <div className="col-span-1">
                                                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                                                                {expense.expenseDetails.category}
                                                            </span>
                                                        </div>
                                                        <div className="col-span-2">
                                                            <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                                                {amount}
                                                            </p>
                                                        </div>
                                                        <div className="col-span-1">
                                                            <p className="text-sm text-gray-900 dark:text-white">
                                                                {date}
                                                            </p>
                                                        </div>
                                                        <div className="col-span-1">
                                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(expense.status)}`}>
                                                                {expense.status.replace(/_/g, ' ').toUpperCase()}
                                                            </span>
                                                        </div>
                                                        <div className="col-span-1">
                                                            <div className="flex items-center gap-1">
                                                                <button
                                                                    onClick={() => handleViewExpense(expense)}
                                                                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300"
                                                                    title="View expense details"
                                                                >
                                                                    <FaEye className="w-4 h-4" />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDownloadExpense(expense)}
                                                                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300"
                                                                    title="Download expense details"
                                                                >
                                                                    <FaDownload className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                                
                                {/* Pagination Controls */}
                                {filteredExpenses.length > 0 && (
                                    <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                                        <div className="text-sm text-gray-600 dark:text-gray-400">
                                            Showing {((expenseCurrentPage - 1) * pageSize) + 1} to {Math.min(expenseCurrentPage * pageSize, filteredExpenses.length)} of {filteredExpenses.length} records
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => setExpenseCurrentPage(prev => Math.max(1, prev - 1))}
                                                disabled={expenseCurrentPage === 1}
                                                className="px-3 py-1 rounded-lg text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                Previous
                                            </button>
                                            <span className="text-sm text-gray-600 dark:text-gray-400">
                                                Page {expenseCurrentPage} of {Math.ceil(filteredExpenses.length / pageSize) || 1}
                                            </span>
                                            <button
                                                onClick={() => setExpenseCurrentPage(prev => Math.min(Math.ceil(filteredExpenses.length / pageSize) || 1, prev + 1))}
                                                disabled={expenseCurrentPage >= (Math.ceil(filteredExpenses.length / pageSize) || 1)}
                                                className="px-3 py-1 rounded-lg text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                Next
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : currentView === 'asset' ? (
                        <div className="p-6 space-y-6">
                            <div className="rounded-lg border bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                    <div className="flex items-center gap-2 flex-1">
                                        <div className="relative flex-1 max-w-md">
                                            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                            <input
                                                type="text"
                                                placeholder="Search asset requests..."
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                className="pl-10 pr-4 py-2 rounded-lg text-sm border-0 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 w-full"
                                            />
                                        </div>
                                        <select
                                            value={assetStatusFilter}
                                            onChange={(e) => setAssetStatusFilter(e.target.value)}
                                            className="px-3 py-2 rounded-lg text-sm border-0 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white"
                                        >
                                            <option value="All Status">All Status</option>
                                            <option value="Pending">Pending</option>
                                            <option value="Approved">Approved</option>
                                            <option value="Rejected">Rejected</option>
                                            <option value="Issued">Issued</option>
                                        </select>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <select
                                            value={pageSize}
                                            onChange={(e) => {
                                                setPageSize(Number(e.target.value));
                                            }}
                                            className="px-3 py-2 rounded-lg text-sm border-0 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white"
                                        >
                                            <option value={5}>5 per page</option>
                                            <option value={10}>10 per page</option>
                                            <option value={25}>25 per page</option>
                                            <option value={50}>50 per page</option>
                                        </select>
                                        <button 
                                            onClick={() => employee?.email && fetchEmployeeAssets(employee.email)}
                                            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
                                            title="Refresh asset requests"
                                        >
                                            <FaSync className={`w-4 h-4 ${isLoadingAssets ? 'animate-spin' : ''}`} />
                                        </button>
                                    </div>
                                </div>
                                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                                    <div className="grid grid-cols-12 gap-4 text-sm font-semibold">
                                        <div className="col-span-2">
                                            <span className="text-gray-600 dark:text-gray-300">REQUEST ID</span>
                                        </div>
                                        <div className="col-span-3">
                                            <span className="text-gray-600 dark:text-gray-300">ASSET DETAILS</span>
                                        </div>
                                        <div className="col-span-1">
                                            <span className="text-gray-600 dark:text-gray-300">TYPE</span>
                                        </div>
                                        <div className="col-span-1">
                                            <span className="text-gray-600 dark:text-gray-300">QTY</span>
                                        </div>
                                        <div className="col-span-1">
                                            <span className="text-gray-600 dark:text-gray-300">PRIORITY</span>
                                        </div>
                                        <div className="col-span-1">
                                            <span className="text-gray-600 dark:text-gray-300">REQUESTED</span>
                                        </div>
                                        <div className="col-span-1">
                                            <span className="text-gray-600 dark:text-gray-300">EXPECTED</span>
                                        </div>
                                        <div className="col-span-1">
                                            <span className="text-gray-600 dark:text-gray-300">STATUS</span>
                                        </div>
                                        <div className="col-span-1">
                                            <span className="text-gray-600 dark:text-gray-300">ACTIONS</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                                    {isLoadingAssets ? (
                                        <div className="px-6 py-8 text-center">
                                            <Loader />
                                            <p className="text-gray-500 dark:text-gray-400 mt-2">Loading asset requests...</p>
                                        </div>
                                    ) : filteredAssets.length === 0 ? (
                                        <div className="px-6 py-8 text-center">
                                            <FaLaptop className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                                            <p className="text-gray-500 dark:text-gray-400">No asset requests found</p>
                                            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                                                Asset requests will appear here once submitted.
                                            </p>
                                        </div>
                                    ) : (
                                        paginatedAssets.map((asset) => (
                                            <div key={asset.id} className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                                <div className="grid grid-cols-12 gap-4 items-center">
                                                    <div className="col-span-2">
                                                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{asset.requestId}</p>
                                                    </div>
                                                    <div className="col-span-3">
                                                        <p className="text-sm font-medium text-gray-900 dark:text-white">{asset.assetDetails.assetName}</p>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{asset.assetDetails.justification || 'No justification provided'}</p>
                                                    </div>
                                                    <div className="col-span-1">
                                                        <p className="text-sm text-gray-900 dark:text-white">{asset.assetDetails.assetType}</p>
                                                    </div>
                                                    <div className="col-span-1">
                                                        <p className="text-sm text-gray-900 dark:text-white">{asset.assetDetails.quantity}</p>
                                                    </div>
                                                    <div className="col-span-1">
                                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                            asset.assetDetails.priority.toLowerCase() === 'high'
                                                                ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                                                : asset.assetDetails.priority.toLowerCase() === 'medium'
                                                                    ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                                                                    : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                                        }`}>
                                                            {asset.assetDetails.priority}
                                                        </span>
                                                    </div>
                                                    <div className="col-span-1">
                                                        <p className="text-sm text-gray-900 dark:text-white">{formatDate(asset.requestedDate || asset.createdAt || '')}</p>
                                                    </div>
                                                    <div className="col-span-1">
                                                        <p className="text-sm text-gray-900 dark:text-white">{formatDate(asset.assetDetails.expectedDate || '')}</p>
                                                    </div>
                                                    <div className="col-span-1">
                                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(asset.status)}`}>
                                                            {asset.status.replace('_', ' ').toUpperCase()}
                                                        </span>
                                                    </div>
                                                    <div className="col-span-1">
                                                        <div className="flex items-center gap-1">
                                                            <button
                                                                onClick={() => handleViewAsset(asset)}
                                                                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300"
                                                                title="View asset request"
                                                            >
                                                                <FaEye className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDownloadAsset(asset)}
                                                                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300"
                                                                title="Download asset request"
                                                            >
                                                                <FaDownload className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                                
                                {/* Pagination Controls */}
                                {filteredAssets.length > 0 && (
                                    <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                                        <div className="text-sm text-gray-600 dark:text-gray-400">
                                            Showing {((assetCurrentPage - 1) * pageSize) + 1} to {Math.min(assetCurrentPage * pageSize, filteredAssets.length)} of {filteredAssets.length} records
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => setAssetCurrentPage(prev => Math.max(1, prev - 1))}
                                                disabled={assetCurrentPage === 1}
                                                className="px-3 py-1 rounded-lg text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                Previous
                                            </button>
                                            <span className="text-sm text-gray-600 dark:text-gray-400">
                                                Page {assetCurrentPage} of {Math.ceil(filteredAssets.length / pageSize) || 1}
                                            </span>
                                            <button
                                                onClick={() => setAssetCurrentPage(prev => Math.min(Math.ceil(filteredAssets.length / pageSize) || 1, prev + 1))}
                                                disabled={assetCurrentPage >= (Math.ceil(filteredAssets.length / pageSize) || 1)}
                                                className="px-3 py-1 rounded-lg text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                Next
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                        </div>
                    ) : null}
                </div>
            </div>

            {/* Employee Details Modal */}
            <EmployeeDetailsModal
                employee={selectedEmployee}
                isOpen={showEmployeeModal}
                onClose={() => {
                    setShowEmployeeModal(false);
                    setSelectedEmployee(null);
                }}
            />

            {/* Delete Confirmation Modal */}
            <Modal isOpen={showDeleteConfirm.show} onClose={() => setShowDeleteConfirm({ show: false, type: 'salary', item: null })}>
                <div className="relative overflow-hidden max-w-md w-full">
                    <div className="absolute inset-0 bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 dark:from-red-900/20 dark:via-orange-900/20 dark:to-yellow-900/20"></div>
                    <div className="relative p-8">
                        <div className="text-center mb-8">
                            <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-red-500/25">
                                <FaTrash className="w-8 h-8 text-white" />
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Delete Record</h3>
                            <p className="text-gray-600 dark:text-gray-400">
                                Are you sure you want to delete this {showDeleteConfirm.type} record?
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                                This action cannot be undone.
                            </p>
                        </div>

                        <div className="flex justify-center gap-4">
                            <button
                                onClick={() => setShowDeleteConfirm({ show: false, type: 'salary', item: null })}
                                disabled={isDeleting}
                                className="px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDeleteItem}
                                disabled={isDeleting}
                                className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {isDeleting ? (
                                    <>
                                        <Loader />
                                        Deleting...
                                    </>
                                ) : (
                                    'Delete Record'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </Modal>

            {/* Employee Record Form */}
            <EmployeeRecordForm
                isOpen={showRecordForm}
                onClose={() => {
                    setShowRecordForm(false);
                    setEditingRecord(null);
                }}
                onSubmit={handleFormSubmit}
                recordType={recordFormType}
                employeeId={employeeId}
                employeeName={employeeName}
                isLoading={isFormLoading}
                existingRecord={editingRecord ? (editingRecord as unknown as Record<string, unknown>) : undefined}
            />

            {/* Alert */}
            {alert.show && (
                <Alert
                    variant={alert.variant}
                    title={alert.title}
                    message={alert.message}
                    showCloseButton={true}
                    onClose={() => setAlert(prev => ({ ...prev, show: false }))}
                />
            )}

            {/* Edit Profile Modal */}
            {showEditProfileModal && (
                <Modal
                    isOpen={showEditProfileModal}
                    onClose={() => setShowEditProfileModal(false)}
                    className="max-w-3xl"
                    showCloseButton={false}
                >
                    <div className="relative flex items-center justify-center px-4 bg-transparent">
                        <div className="w-full max-w-xs sm:max-w-md md:max-w-2xl lg:max-w-3xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl relative max-h-[85vh] flex flex-col overflow-hidden">
                            {/* Sticky Header */}
                            <div className="sticky top-0 z-10 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                                        Update Profile
                                    </h2>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                        Fields marked with <span className="text-blue-500">*</span> are required
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowEditProfileModal(false)}
                                    className="text-gray-400 dark:text-gray-500 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100 rounded-lg w-10 h-10 flex items-center justify-center transition-all shadow-sm hover:shadow"
                                    aria-label="Close dialog"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 14 14">
                                        <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6" />
                                    </svg>
                                </button>
                            </div>

                            {/* Scrollable Content */}
                            <div className="flex-1 overflow-y-auto px-6 py-6">
                                <form 
                                    className="space-y-6" 
                                    noValidate 
                                    onKeyDown={(e) => {
                                        if (e.key === 'Escape') {
                                            e.preventDefault();
                                            setShowEditProfileModal(false);
                                        }
                                    }}
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        handleUpdateProfile();
                                    }}
                                >
                                    {/* Basic Information Section */}
                                    <div className="space-y-4">
                                        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2 pb-2 border-b border-gray-200 dark:border-gray-700">
                                            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                            </svg>
                                            Basic Information
                                        </h3>

                                        {/* Employee ID (Readonly) */}
                                        <div>
                                            <label htmlFor="emp_id" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                                                Employee ID <span className="text-blue-500" aria-label="required">*</span>
                                            </label>
                                            <input
                                                id="emp_id"
                                                type="text"
                                                value={editProfileFormData.emp_id}
                                                disabled
                                                readOnly
                                                className="w-full h-11 px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                                            />
                                        </div>

                                        {/* First Row - Full Name and Email */}
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                            <div>
                                                <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                                                    Full Name <span className="text-blue-500" aria-label="required">*</span>
                                                </label>
                                                <input
                                                    id="full_name"
                                                    type="text"
                                                    name="full_name"
                                                    placeholder="Enter full name"
                                                    value={editProfileFormData.full_name}
                                                    onChange={(e) => handleEditProfileChange('full_name', e.target.value)}
                                                    onBlur={() => handleEditProfileBlur('full_name')}
                                                    required
                                                    maxLength={100}
                                                    aria-required="true"
                                                    aria-invalid={!!editProfileErrors.full_name && editProfileTouched.has('full_name')}
                                                    className={`w-full h-11 px-4 py-2.5 rounded-xl border ${editProfileErrors.full_name && editProfileTouched.has('full_name') ? 'border-blue-500 dark:border-blue-400' : 'border-gray-300 dark:border-gray-600'} bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition`}
                                                />
                                                {editProfileErrors.full_name && editProfileTouched.has('full_name') && (
                                                    <p className="flex items-start gap-1 mt-2 text-xs text-blue-600 dark:text-blue-400" role="alert">
                                                        <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                                        </svg>
                                                        {editProfileErrors.full_name}
                                                    </p>
                                                )}
                                            </div>

                                            <div>
                                                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                                                    Email <span className="text-blue-500" aria-label="required">*</span>
                                                </label>
                                                <input
                                                    id="email"
                                                    type="email"
                                                    name="email"
                                                    placeholder="name@company.com"
                                                    value={editProfileFormData.email}
                                                    onChange={(e) => handleEditProfileChange('email', e.target.value)}
                                                    onBlur={() => handleEditProfileBlur('email')}
                                                    required
                                                    autoCapitalize="none"
                                                    autoCorrect="off"
                                                    aria-required="true"
                                                    aria-invalid={!!editProfileErrors.email && editProfileTouched.has('email')}
                                                    className={`w-full h-11 px-4 py-2.5 rounded-xl border ${editProfileErrors.email && editProfileTouched.has('email') ? 'border-blue-500' : 'border-gray-300 dark:border-gray-600'} bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition`}
                                                />
                                                {editProfileErrors.email && editProfileTouched.has('email') && (
                                                    <p className="flex items-start gap-1 mt-2 text-xs text-blue-600 dark:text-blue-400" role="alert">
                                                        <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                                        </svg>
                                                        {editProfileErrors.email}
                                                    </p>
                                                )}
                                                {!editProfileErrors.email && (
                                                    <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                                                        We&apos;ll never share your email with anyone else
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Second Row - Department and Phone */}
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                            <div>
                                                <label htmlFor="department" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                                                    Department <span className="text-blue-500" aria-label="required">*</span>
                                                </label>
                                                <input
                                                    id="department"
                                                    type="text"
                                                    name="department"
                                                    placeholder="Enter department name"
                                                    value={editProfileFormData.department}
                                                    onChange={(e) => handleEditProfileChange('department', e.target.value)}
                                                    onBlur={() => handleEditProfileBlur('department')}
                                                    required
                                                    maxLength={50}
                                                    aria-required="true"
                                                    aria-invalid={!!editProfileErrors.department && editProfileTouched.has('department')}
                                                    className={`w-full h-11 px-4 py-2.5 rounded-xl border ${editProfileErrors.department && editProfileTouched.has('department') ? 'border-blue-500 dark:border-blue-400' : 'border-gray-300 dark:border-gray-600'} bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition`}
                                                />
                                                {editProfileErrors.department && editProfileTouched.has('department') && (
                                                    <p className="flex items-start gap-1 mt-2 text-xs text-blue-600 dark:text-blue-400" role="alert">
                                                        <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                                        </svg>
                                                        {editProfileErrors.department}
                                                    </p>
                                                )}
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                                                    Phone Number <span className="text-blue-500" aria-label="required">*</span>
                                                </label>
                                                <div className="w-full relative">
                                                    <PhoneInput2
                                                        key={`phone-input-${showEditProfileModal}-${mobile}`}
                                                        country="in"
                                                        value={mobile || ''}
                                                        onChange={handlePhoneChange}
                                                        inputProps={{
                                                            name: 'phone',
                                                            required: true,
                                                            'aria-required': 'true',
                                                            'aria-invalid': editProfileErrors.phone && editProfileTouched.has('phone'),
                                                            onBlur: () => {
                                                                setEditProfileTouched(prev => new Set(prev).add('phone'));
                                                                const cleanMobile = '+' + mobile.replace(/[^\d]/g, '').replace(/^\+/, '');
                                                                validateEditProfileField('phone', cleanMobile);
                                                            },
                                                            onFocus: () => {
                                                                setEditProfileErrors(prev => ({ ...prev, phone: '' }));
                                                            },
                                                        }}
                                                        inputClass={`px-4 py-2.5 rounded-xl border ${editProfileErrors.phone && editProfileTouched.has('phone') ? 'border-blue-500' : 'border-gray-300 dark:border-gray-600'} bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition w-full`}
                                                        containerClass="w-full"
                                                        dropdownClass="bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-700 z-50"
                                                        buttonClass={`bg-white dark:bg-gray-800 ${editProfileErrors.phone && editProfileTouched.has('phone') ? 'border-blue-500' : 'border-gray-300 dark:border-gray-600'} text-gray-900 dark:text-gray-100 border-r-0 rounded-l-xl`}
                                                        buttonStyle={{
                                                            backgroundColor: 'transparent',
                                                            borderColor: 'inherit',
                                                            color: 'inherit',
                                                            borderTopLeftRadius: '12px',
                                                            borderBottomLeftRadius: '12px',
                                                            borderTopRightRadius: '0px',
                                                            borderBottomRightRadius: '0px',
                                                            height: '44px',
                                                            borderRight: 'none'
                                                        }}
                                                        inputStyle={{
                                                            backgroundColor: 'transparent',
                                                            borderColor: 'inherit',
                                                            color: 'inherit',
                                                            borderTopLeftRadius: '0px',
                                                            borderBottomLeftRadius: '0px',
                                                            borderTopRightRadius: '12px',
                                                            borderBottomRightRadius: '12px',
                                                            width: '100%',
                                                            height: '44px',
                                                            borderLeft: 'none'
                                                        }}
                                                        enableSearch
                                                        searchPlaceholder="Search country..."
                                                        preferredCountries={['in']}
                                                        autoFormat={true}
                                                        disableSearchIcon={false}
                                                        searchNotFound="No country found"
                                                        enableAreaCodes={true}
                                                    />
                                                </div>
                                                {editProfileErrors.phone && editProfileTouched.has('phone') && (
                                                    <p className="flex items-start gap-1 mt-2 text-xs text-blue-600 dark:text-blue-400" role="alert">
                                                        <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                                        </svg>
                                                        {editProfileErrors.phone}
                                                    </p>
                                                )}
                                                {!editProfileErrors.phone && (
                                                    <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                                                        Enter mobile number with country code (e.g., +1 for US, +44 for UK, +91 for India)
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </form>
                            </div>

                            {/* Sticky Footer with Buttons */}
                            <div className="sticky bottom-0 z-10 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex flex-col sm:flex-row sm:justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowEditProfileModal(false)}
                                    className="h-11 px-6 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 transition font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleUpdateProfile}
                                    disabled={isUpdatingProfile || !isEditProfileFormValid()}
                                    className={`h-11 px-6 rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition ${isUpdatingProfile ? 'cursor-not-allowed' : ''} ${isEditProfileFormValid() && !isUpdatingProfile ? 'bg-gradient-to-r from-blue-600 to-blue-600 hover:from-blue-700 hover:to-blue-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5' : 'bg-blue-400 dark:bg-blue-600 opacity-70'}`}
                                    aria-busy={isUpdatingProfile}
                                >
                                    {isUpdatingProfile ? (
                                        <>
                                            <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                                            </svg>
                                            <span>Updating…</span>
                                        </>
                                    ) : (
                                        <span>Update Profile</span>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Upload Modal */}
            <Modal isOpen={showUploadModal} onClose={() => {
                setShowUploadModal(false);
                setSelectedFile(null);
            }}>
                <div className="p-2">
                    <div className="w-full max-w-sm sm:max-w-[560px] md:max-w-[800px] mx-auto bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden max-h-[90vh] flex flex-col">
                        {/* Header */}
                        <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 px-8 py-6 relative">
                            <div className="flex items-center justify-between">
                                <div className="flex-1">
                                    <h1 className="text-xl md:text-2xl font-semibold text-white mb-1">Employee Data Management</h1>
                                    <p className="text-blue-100 text-sm md:text-base">Download templates or upload employee data files</p>
                                </div>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-8">
                                {/* Download Template Section */}
                                <div className="flex flex-col">
                                    <div className="bg-gradient-to-br from-blue-50 via-blue-100 to-blue-200 dark:from-gray-800 dark:via-gray-800 dark:to-gray-900 rounded-xl p-6 h-full flex flex-col items-center justify-center text-center space-y-6">
                                        <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                                            <FaDownload className="text-white text-2xl" />
                                        </div>
                                        <div className="space-y-3">
                                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Download Master Template</h2>
                                            <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">Get the standardized template to ensure your employee data uploads are formatted correctly</p>
                                        </div>
                                        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md mx-auto">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (currentView === 'salary') {
                                                        downloadPayslipTemplate('xlsx');
                                                    } else if (currentView === 'attendance') {
                                                        downloadAttendanceTemplate('xlsx');
                                                    } else if (currentView === 'leave') {
                                                        downloadLeaveTemplate('xlsx');
                                                    } else if (currentView === 'project') {
                                                        downloadProjectTemplate('xlsx');
                                                    } else if (currentView === 'expense') {
                                                        downloadExpenseTemplate('xlsx');
                                                    } else if (currentView === 'asset') {
                                                        downloadAssetTemplate('xlsx');
                                                    }
                                                }}
                                                className="flex-1 inline-flex items-center justify-center font-medium gap-2 rounded-xl transition-all duration-300 bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 hover:from-blue-700 hover:via-blue-800 hover:to-blue-900 text-white font-semibold h-11 px-5 py-3 shadow-lg hover:shadow-xl hover:shadow-blue-500/25 focus:outline-none focus:ring-4 focus:ring-blue-400/50"
                                            >
                                                <FaDownload className="w-4 h-4" />
                                                <span className="text-sm">Excel</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (currentView === 'salary') {
                                                        downloadPayslipTemplate('csv');
                                                    } else if (currentView === 'attendance') {
                                                        downloadAttendanceTemplate('csv');
                                                    } else if (currentView === 'leave') {
                                                        downloadLeaveTemplate('csv');
                                                    } else if (currentView === 'project') {
                                                        downloadProjectTemplate('csv');
                                                    } else if (currentView === 'expense') {
                                                        downloadExpenseTemplate('csv');
                                                    } else if (currentView === 'asset') {
                                                        downloadAssetTemplate('csv');
                                                    }
                                                }}
                                                className="flex-1 inline-flex items-center justify-center font-medium gap-2 rounded-xl transition-all duration-300 bg-gradient-to-r from-green-600 via-green-700 to-green-800 hover:from-green-700 hover:via-green-800 hover:to-green-900 text-white font-semibold h-11 px-5 py-3 shadow-lg hover:shadow-xl hover:shadow-green-500/25 focus:outline-none focus:ring-4 focus:ring-green-400/50"
                                            >
                                                <FaDownload className="w-4 h-4" />
                                                <span className="text-sm">CSV</span>
                                            </button>
                                        </div>
                                        <div className="flex items-center justify-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                                            <div className="flex items-center gap-1.5">
                                                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                                                <span>Excel & CSV</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                                                <span>Pre-formatted</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Upload File Section */}
                                <div className="flex flex-col">
                                    <div className="bg-white dark:bg-gray-900 rounded-xl p-6 h-full flex flex-col">
                                        <div className="flex items-center gap-4 mb-6">
                                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                                                <FaUpload className="text-white text-xl" />
                                            </div>
                                            <div>
                                                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Upload File</h2>
                                                <p className="text-gray-600 dark:text-gray-400 text-sm">Upload your employee data file</p>
                                            </div>
                                        </div>
                                        <div className="flex-1 flex flex-col space-y-4">
                                            <label
                                                htmlFor="employee-file-upload"
                                                role="button"
                                                tabIndex={0}
                                                className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed transition-all duration-300 cursor-pointer group min-h-[200px] mx-auto w-full max-w-md border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                                                aria-label="Upload file by clicking or dragging and dropping"
                                            >
                                                <input
                                                    id="employee-file-upload"
                                                    accept=".xlsx,.xls,.csv"
                                                    className="hidden"
                                                    type="file"
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0];
                                                        if (file) {
                                                            setSelectedFile(file);
                                                        }
                                                    }}
                                                />
                                                <div className="text-center space-y-4 flex flex-col items-center justify-center w-full h-full">
                                                    <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center group-hover:from-blue-100 group-hover:to-blue-200 dark:group-hover:from-blue-900/30 dark:group-hover:to-blue-800/30 transition-colors mx-auto">
                                                        <FaUpload className="text-gray-400 group-hover:text-blue-500 text-2xl" />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <p className="text-base font-semibold text-gray-700 dark:text-gray-300">Drag & drop your file here</p>
                                                        <p className="text-sm text-gray-500 dark:text-gray-400">or <span className="text-blue-600 dark:text-blue-400 font-medium">click to browse</span></p>
                                                        <p className="text-xs text-gray-400 dark:text-gray-500">Supports Excel (.xlsx, .xls) and CSV (.csv) files</p>
                                                    </div>
                                                </div>
                                            </label>
                                            {selectedFile && (
                                                <div className="text-center">
                                                    <p className="text-sm text-gray-600 dark:text-gray-400">Selected: <span className="font-medium">{selectedFile.name}</span></p>
                                                </div>
                                            )}
                                            <div className="flex justify-center">
                                                <button
                                                    type="button"
                                                    disabled={!selectedFile || isUploading}
                                                    className={`inline-flex items-center justify-center font-medium gap-2 rounded-lg transition w-full max-w-md h-11 px-6 rounded-xl font-semibold text-base transition-all duration-300 flex items-center justify-center px-5 py-3.5 text-sm ${
                                                        selectedFile && !isUploading
                                                            ? 'bg-blue-600 text-white shadow-lg hover:bg-blue-700 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-blue-400/50'
                                                            : 'bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-700 dark:text-gray-400 opacity-50'
                                                    }`}
                                                    onClick={() => {
                                                        if (selectedFile) {
                                                            if (currentView === 'salary') {
                                                                handlePayslipFileUpload(selectedFile);
                                                            } else if (currentView === 'attendance') {
                                                                handleAttendanceFileUpload(selectedFile);
                                                            } else if (currentView === 'leave') {
                                                                handleLeaveFileUpload(selectedFile);
                                                            } else if (currentView === 'project') {
                                                                handleProjectFileUpload(selectedFile);
                                                            } else if (currentView === 'expense') {
                                                                handleExpenseFileUpload(selectedFile);
                                                            } else if (currentView === 'asset') {
                                                                handleAssetFileUpload(selectedFile);
                                                            }
                                                        }
                                                    }}
                                                >
                                                    {isUploading ? (
                                                        <>
                                                            <svg className="animate-spin h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24">
                                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                                                            </svg>
                                                            Uploading...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <FaUpload className="mr-2 text-base" />
                                                            Upload File
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-xs text-gray-500 dark:text-gray-400">Supported formats: <span className="font-medium">.xlsx</span>, <span className="font-medium">.xls</span>, <span className="font-medium">.csv</span></p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </Modal>

            {/* Download Modal - Salary */}
            {showDownloadModal && currentView === 'salary' && (
                <Modal
                    isOpen={showDownloadModal}
                    onClose={() => setShowDownloadModal(false)}
                >
                    <div className="w-full bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                        {/* Header */}
                        <div className="bg-gradient-to-r from-green-600 via-green-700 to-green-800 px-4 py-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                                        <FaDownload className="text-white text-base" />
                                    </div>
                                    <div>
                                        <h2 className="text-base font-semibold text-white">Download Payslip Records</h2>
                                        <p className="text-green-100 text-xs">Choose your preferred format</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowDownloadModal(false)}
                                    className="p-1.5 rounded-lg hover:bg-white/20 text-white transition"
                                >
                                    <FaTimesCircle className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Body */}
                        <div className="p-4">
                            {/* Note */}
                            <div className="mb-3 p-2.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                <p className="text-xs text-blue-800 dark:text-blue-200">
                                    <strong>Note:</strong> This will download {paginatedPayslips.length} record(s) currently visible.
                                </p>
                            </div>

                            {/* Buttons */}
                            <div className="space-y-2">
                                {/* Excel */}
                                <button
                                    onClick={() => downloadPayslipData('xlsx')}
                                    className="w-full flex items-center justify-between p-3 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-green-500 hover:bg-green-50 transition"
                                >
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                                            <FaDownload className="text-green-600 text-sm" />
                                        </div>
                                        <div className="text-left">
                                            <p className="font-semibold text-sm">Download as Excel</p>
                                            <p className="text-xs text-gray-500">.xlsx format</p>
                                        </div>
                                    </div>
                                    <span className="text-gray-400">→</span>
                                </button>

                                {/* CSV */}
                                <button
                                    onClick={() => downloadPayslipData('csv')}
                                    className="w-full flex items-center justify-between p-3 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-green-500 hover:bg-green-50 transition"
                                >
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                                            <FaDownload className="text-green-600 text-sm" />
                                        </div>
                                        <div className="text-left">
                                            <p className="font-semibold text-sm">Download as CSV</p>
                                            <p className="text-xs text-gray-500">.csv format</p>
                                        </div>
                                    </div>
                                    <span className="text-gray-400">→</span>
                                </button>
                            </div>

                            {/* Footer */}
                            <div className="mt-3 pt-2 border-t border-gray-200">
                                <button
                                    onClick={() => setShowDownloadModal(false)}
                                    className="w-full px-3 py-2 rounded-lg border text-sm font-medium hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Download Modal - Attendance */}
            {showDownloadModal && currentView === 'attendance' && (
                <Modal
                    isOpen={showDownloadModal}
                    onClose={() => setShowDownloadModal(false)}
                >
                    <div className="w-full bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                        {/* Header */}
                        <div className="bg-gradient-to-r from-green-600 via-green-700 to-green-800 px-4 py-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                                        <FaDownload className="text-white text-base" />
                                    </div>
                                    <div>
                                        <h2 className="text-base font-semibold text-white">Download Attendance Records</h2>
                                        <p className="text-green-100 text-xs">Choose your preferred format</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowDownloadModal(false)}
                                    className="p-1.5 rounded-lg hover:bg-white/20 text-white transition"
                                >
                                    <FaTimesCircle className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Body */}
                        <div className="p-4">
                            {/* Note */}
                            <div className="mb-3 p-2.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                <p className="text-xs text-blue-800 dark:text-blue-200">
                                    <strong>Note:</strong> This will download {paginatedAttendance.length} record(s) currently visible.
                                </p>
                            </div>

                            {/* Buttons */}
                            <div className="space-y-2">
                                {/* Excel */}
                                <button
                                    onClick={() => downloadAttendanceData('xlsx')}
                                    className="w-full flex items-center justify-between p-3 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-green-500 hover:bg-green-50 transition"
                                >
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                                            <FaDownload className="text-green-600 text-sm" />
                                        </div>
                                        <div className="text-left">
                                            <p className="font-semibold text-sm">Download as Excel</p>
                                            <p className="text-xs text-gray-500">.xlsx format</p>
                                        </div>
                                    </div>
                                    <span className="text-gray-400">→</span>
                                </button>

                                {/* CSV */}
                                <button
                                    onClick={() => downloadAttendanceData('csv')}
                                    className="w-full flex items-center justify-between p-3 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-green-500 hover:bg-green-50 transition"
                                >
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                                            <FaDownload className="text-green-600 text-sm" />
                                        </div>
                                        <div className="text-left">
                                            <p className="font-semibold text-sm">Download as CSV</p>
                                            <p className="text-xs text-gray-500">.csv format</p>
                                        </div>
                                    </div>
                                    <span className="text-gray-400">→</span>
                                </button>
                            </div>

                            {/* Footer */}
                            <div className="mt-3 pt-2 border-t border-gray-200">
                                <button
                                    onClick={() => setShowDownloadModal(false)}
                                    className="w-full px-3 py-2 rounded-lg border text-sm font-medium hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Download Modal - Leave */}
            {showDownloadModal && currentView === 'leave' && (
                <Modal
                    isOpen={showDownloadModal}
                    onClose={() => setShowDownloadModal(false)}
                >
                    <div className="w-full bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                        {/* Header */}
                        <div className="bg-gradient-to-r from-green-600 via-green-700 to-green-800 px-4 py-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                                        <FaDownload className="text-white text-base" />
                                    </div>
                                    <div>
                                        <h2 className="text-base font-semibold text-white">Download Leave Records</h2>
                                        <p className="text-green-100 text-xs">Choose your preferred format</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowDownloadModal(false)}
                                    className="p-1.5 rounded-lg hover:bg-white/20 text-white transition"
                                >
                                    <FaTimesCircle className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Body */}
                        <div className="p-4">
                            {/* Note */}
                            <div className="mb-3 p-2.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                <p className="text-xs text-blue-800 dark:text-blue-200">
                                    <strong>Note:</strong> This will download {paginatedLeaves.length} record(s) currently visible.
                                </p>
                            </div>

                            {/* Buttons */}
                            <div className="space-y-2">
                                {/* Excel */}
                                <button
                                    onClick={() => downloadLeaveData('xlsx')}
                                    className="w-full flex items-center justify-between p-3 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-green-500 hover:bg-green-50 transition"
                                >
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                                            <FaDownload className="text-green-600 text-sm" />
                                        </div>
                                        <div className="text-left">
                                            <p className="font-semibold text-sm">Download as Excel</p>
                                            <p className="text-xs text-gray-500">.xlsx format</p>
                                        </div>
                                    </div>
                                    <span className="text-gray-400">→</span>
                                </button>

                                {/* CSV */}
                                <button
                                    onClick={() => downloadLeaveData('csv')}
                                    className="w-full flex items-center justify-between p-3 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-green-500 hover:bg-green-50 transition"
                                >
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                                            <FaDownload className="text-green-600 text-sm" />
                                        </div>
                                        <div className="text-left">
                                            <p className="font-semibold text-sm">Download as CSV</p>
                                            <p className="text-xs text-gray-500">.csv format</p>
                                        </div>
                                    </div>
                                    <span className="text-gray-400">→</span>
                                </button>
                            </div>

                            {/* Footer */}
                            <div className="mt-3 pt-2 border-t border-gray-200">
                                <button
                                    onClick={() => setShowDownloadModal(false)}
                                    className="w-full px-3 py-2 rounded-lg border text-sm font-medium hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Download Modal - Projects */}
            {showDownloadModal && currentView === 'project' && (
                <Modal
                    isOpen={showDownloadModal}
                    onClose={() => setShowDownloadModal(false)}
                >
                    <div className="w-full bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                        {/* Header */}
                        <div className="bg-gradient-to-r from-green-600 via-green-700 to-green-800 px-4 py-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                                        <FaDownload className="text-white text-base" />
                                    </div>
                                    <div>
                                        <h2 className="text-base font-semibold text-white">Download Project Records</h2>
                                        <p className="text-green-100 text-xs">Choose your preferred format</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowDownloadModal(false)}
                                    className="p-1.5 rounded-lg hover:bg-white/20 text-white transition"
                                >
                                    <FaTimesCircle className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Body */}
                        <div className="p-4">
                            {/* Note */}
                            <div className="mb-3 p-2.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                <p className="text-xs text-blue-800 dark:text-blue-200">
                                    <strong>Note:</strong> This will download {paginatedProjects.length} record(s) currently visible.
                                </p>
                            </div>

                            {/* Buttons */}
                            <div className="space-y-2">
                                {/* Excel */}
                                <button
                                    onClick={() => downloadProjectData('xlsx')}
                                    className="w-full flex items-center justify-between p-3 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-green-500 hover:bg-green-50 transition"
                                >
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                                            <FaDownload className="text-green-600 text-sm" />
                                        </div>
                                        <div className="text-left">
                                            <p className="font-semibold text-sm">Download as Excel</p>
                                            <p className="text-xs text-gray-500">.xlsx format</p>
                                        </div>
                                    </div>
                                    <span className="text-gray-400">→</span>
                                </button>

                                {/* CSV */}
                                <button
                                    onClick={() => downloadProjectData('csv')}
                                    className="w-full flex items-center justify-between p-3 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-green-500 hover:bg-green-50 transition"
                                >
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                                            <FaDownload className="text-green-600 text-sm" />
                                        </div>
                                        <div className="text-left">
                                            <p className="font-semibold text-sm">Download as CSV</p>
                                            <p className="text-xs text-gray-500">.csv format</p>
                                        </div>
                                    </div>
                                    <span className="text-gray-400">→</span>
                                </button>
                            </div>

                            {/* Footer */}
                            <div className="mt-3 pt-2 border-t border-gray-200">
                                <button
                                    onClick={() => setShowDownloadModal(false)}
                                    className="w-full px-3 py-2 rounded-lg border text-sm font-medium hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Download Modal - Expense */}
            {showDownloadModal && currentView === 'expense' && (
                <Modal
                    isOpen={showDownloadModal}
                    onClose={() => setShowDownloadModal(false)}
                >
                    <div className="w-full bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                        {/* Header */}
                        <div className="bg-gradient-to-r from-green-600 via-green-700 to-green-800 px-4 py-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                                        <FaDownload className="text-white text-base" />
                                    </div>
                                    <div>
                                        <h2 className="text-base font-semibold text-white">Download Expense Records</h2>
                                        <p className="text-green-100 text-xs">Choose your preferred format</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowDownloadModal(false)}
                                    className="p-1.5 rounded-lg hover:bg-white/20 text-white transition"
                                >
                                    <FaTimesCircle className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Body */}
                        <div className="p-4">
                            {/* Note */}
                            <div className="mb-3 p-2.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                <p className="text-xs text-blue-800 dark:text-blue-200">
                                    <strong>Note:</strong> This will download {paginatedExpenses.length} record(s) currently visible.
                                </p>
                            </div>

                            {/* Buttons */}
                            <div className="space-y-2">
                                {/* Excel */}
                                <button
                                    onClick={() => downloadExpenseData('xlsx')}
                                    className="w-full flex items-center justify-between p-3 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-green-500 hover:bg-green-50 transition"
                                >
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                                            <FaDownload className="text-green-600 text-sm" />
                                        </div>
                                        <div className="text-left">
                                            <p className="font-semibold text-sm">Download as Excel</p>
                                            <p className="text-xs text-gray-500">.xlsx format</p>
                                        </div>
                                    </div>
                                    <span className="text-gray-400">→</span>
                                </button>

                                {/* CSV */}
                                <button
                                    onClick={() => downloadExpenseData('csv')}
                                    className="w-full flex items-center justify-between p-3 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-green-500 hover:bg-green-50 transition"
                                >
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                                            <FaDownload className="text-green-600 text-sm" />
                                        </div>
                                        <div className="text-left">
                                            <p className="font-semibold text-sm">Download as CSV</p>
                                            <p className="text-xs text-gray-500">.csv format</p>
                                        </div>
                                    </div>
                                    <span className="text-gray-400">→</span>
                                </button>
                            </div>

                            {/* Footer */}
                            <div className="mt-3 pt-2 border-t border-gray-200">
                                <button
                                    onClick={() => setShowDownloadModal(false)}
                                    className="w-full px-3 py-2 rounded-lg border text-sm font-medium hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Download Modal - Asset */}
            {showDownloadModal && currentView === 'asset' && (
                <Modal
                    isOpen={showDownloadModal}
                    onClose={() => setShowDownloadModal(false)}
                >
                    <div className="w-full bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                        {/* Header */}
                        <div className="bg-gradient-to-r from-green-600 via-green-700 to-green-800 px-4 py-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                                        <FaDownload className="text-white text-base" />
                                    </div>
                                    <div>
                                        <h2 className="text-base font-semibold text-white">Download Asset Records</h2>
                                        <p className="text-green-100 text-xs">Choose your preferred format</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowDownloadModal(false)}
                                    className="p-1.5 rounded-lg hover:bg-white/20 text-white transition"
                                >
                                    <FaTimesCircle className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Body */}
                        <div className="p-4">
                            {/* Note */}
                            <div className="mb-3 p-2.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                <p className="text-xs text-blue-800 dark:text-blue-200">
                                    <strong>Note:</strong> This will download {paginatedAssets.length} record(s) currently visible.
                                </p>
                            </div>

                            {/* Buttons */}
                            <div className="space-y-2">
                                {/* Excel */}
                                <button
                                    onClick={() => downloadAssetData('xlsx')}
                                    className="w-full flex items-center justify-between p-3 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-green-500 hover:bg-green-50 transition"
                                >
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                                            <FaDownload className="text-green-600 text-sm" />
                                        </div>
                                        <div className="text-left">
                                            <p className="font-semibold text-sm">Download as Excel</p>
                                            <p className="text-xs text-gray-500">.xlsx format</p>
                                        </div>
                                    </div>
                                    <span className="text-gray-400">→</span>
                                </button>

                                {/* CSV */}
                                <button
                                    onClick={() => downloadAssetData('csv')}
                                    className="w-full flex items-center justify-between p-3 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-green-500 hover:bg-green-50 transition"
                                >
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                                            <FaDownload className="text-green-600 text-sm" />
                                        </div>
                                        <div className="text-left">
                                            <p className="font-semibold text-sm">Download as CSV</p>
                                            <p className="text-xs text-gray-500">.csv format</p>
                                        </div>
                                    </div>
                                    <span className="text-gray-400">→</span>
                                </button>
                            </div>

                            {/* Footer */}
                            <div className="mt-3 pt-2 border-t border-gray-200">
                                <button
                                    onClick={() => setShowDownloadModal(false)}
                                    className="w-full px-3 py-2 rounded-lg border text-sm font-medium hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}
