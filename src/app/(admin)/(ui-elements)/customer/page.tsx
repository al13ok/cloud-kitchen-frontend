"use client";
// import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import React, { useEffect, useState, useRef, useCallback } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import { FaUpload, FaSync, FaTrash, FaSearch, FaDownload, FaFilter, FaEdit, FaFolder, FaCloud, FaUsers, FaDatabase, FaPlus, FaCog, FaBell } from "react-icons/fa";
import DashboardHeader from '@/components/header/DashboardHeader';
import CustomerUploadModal from "./CustomerUploadModal";
import DownloadEmployeeTemplate from "@/components/popscreen/DownloadTemplate";
import CustomerDetailsForm from "./CustomerDetailsForm";
import { FaChevronDown } from 'react-icons/fa';
import Alert from '@/components/ui/alert/Alert';
import DateRangePicker from '@/components/DateRangePicker';
import * as XLSX from 'xlsx';
import CustomerPage from "../Customers/page";
import { ToastContainer } from 'react-toastify';
import { uploadFaqCsv } from "@/utils/api";
import { fetchFaqFiles } from "@/utils/api";
import { deleteFaqCsv } from "@/utils/api";
import Pagination from "@/components/tables/Pagination";
import Loader from "@/components/Loader";
import OrderDetailsPage from "./OrderDetailsPage";
import { FaTimes, FaCalendarAlt, FaClock } from 'react-icons/fa';
import { VisualCalendar } from "../appointment/components/VisualCalendar";
import { API_URLS } from "../appointment/config/api";

interface Customer {
    id: string;
    customer_id: string;
    full_name: string;
    email: string;
    phone: string;
    company?: string;
    industry?: string;
    status?: string;
    account_manager?: string;
    country?: string;
    projects?: number;
    appointment_count?: number;
    mrr?: number;
    last_order: string | null;
    tier?: string;
    created_at: string;
    last_contact?: string;
    appointment?: {
        date: string;
        time: string;
        status: string;
        notes?: string;
    };
}

interface Appointment {
    id: string;
    date: string;
    time: string;
    status: string;
    service_name: string;
    service_id?: string;
    reason?: string;
    notes?: string;
    created_at: string;
    source: string;
    display_name: string;
}

interface Service {
    id: string;
    name: string;
}

interface AvailabilitySlot {
    id: string;
    start_utc: string;
    end_utc: string;
    capacity?: number;
    booked?: number;
    available?: number;
}

interface FormattedSlot {
    id: string;
    label: string;
    start_utc: string;
    available: number;
}

// Helper function to get display value or fallback
function getDisplayValue(value: string | number | null | undefined, fallback: string = 'N/A'): string {
    if (value === null || value === undefined || value === '') {
        return fallback;
    }
    return String(value);
}

// Utility function to insert a line break after a given number of characters
function insertLineBreak(str: string, maxLen = 30) {
    if (!str) return '';
    if (str.length <= maxLen) return str;
    const regex = new RegExp(".{1," + maxLen + "}", 'g');
    return str.match(regex)?.join('<br/>') ?? str;
}

// Utility function to truncate email with ellipsis
function truncateEmail(email: string, maxLen = 20) {
    if (!email) return '';
    if (email.length <= maxLen) return email;

    // Find the @ symbol position
    const atIndex = email.indexOf('@');
    if (atIndex === -1) {
        // If no @ symbol, just truncate normally
        return email.substring(0, maxLen - 3) + '...';
    }

    // If @ is within the maxLen, truncate before @
    if (atIndex <= maxLen - 3) {
        return email.substring(0, maxLen - 3) + '...';
    }

    // If @ is beyond maxLen, truncate the local part
    const localPart = email.substring(0, atIndex);
    const domain = email.substring(atIndex);
    const availableLength = maxLen - 3 - domain.length;

    if (availableLength > 0) {
        return localPart.substring(0, availableLength) + '...' + domain;
    } else {
        return '...' + domain;
    }
}

// Enhanced Mobile Card Component
const CustomerCard = ({ customer, isExpanded, isSelected, onSelectOne, onDelete, onToggleExpansion, onProjectsClick }: {
    customer: Customer;
    isExpanded: boolean;
    isSelected: boolean;
    onSelectOne: (customerId: string) => void;
    onDelete: (customerId: string) => void;
    onToggleExpansion: (customerId: string) => void;
    onProjectsClick: (customerId: string, customerName: string, customerEmail: string, projectCount: number) => void;
}) => {
    return (
        <div className={`bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group ${isSelected ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'hover:border-gray-300 dark:hover:border-gray-600'
            }`}>
            {/* Card Header */}
            <div className="p-6 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => onSelectOne(customer.customer_id)}
                            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                        />
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-full flex items-center justify-center">
                            <span className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                                {customer.full_name.charAt(0).toUpperCase()}
                            </span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                                {customer.full_name}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">
                                ID: {customer.customer_id}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            size="sm"
                            variant="outline"
                            className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20 dark:hover:border-red-700 px-3 py-2 transition-all duration-200"
                            onClick={() => onDelete(customer.customer_id)}
                        >
                            <FaTrash className="w-3 h-3" />
                        </Button>
                        <button
                            onClick={() => onToggleExpansion(customer.customer_id)}
                            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                        >
                            <svg
                                className={`w-5 h-5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>

            {/* Collapsible Content */}
            {isExpanded && (
                <div className="px-6 pb-6 space-y-4 animate-in slide-in-from-top-2 duration-200">
                    {/* Basic Information */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Email</span>
                            <p
                                className="text-sm text-gray-900 dark:text-white font-medium truncate cursor-help"
                                title={customer.email}
                            >
                                {truncateEmail(customer.email, 25)}
                            </p>
                        </div>
                        <div className="space-y-1">
                            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Phone Number</span>
                            <p className="text-sm text-gray-900 dark:text-white font-mono font-medium">{customer.phone}</p>
                        </div>
                    </div>

                    {/* Appointment Info */}
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Appointment</span>
                            {customer.appointment ? (
                                <div className="flex items-center gap-2">
                                    <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <div className="text-right">
                                        <div className="text-sm font-semibold text-gray-900 dark:text-white">
                                            {new Date(customer.appointment.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                        </div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">{customer.appointment.time}</div>
                                    </div>
                                </div>
                            ) : (
                                <span className="px-3 py-1 rounded-full text-xs font-semibold border shadow whitespace-nowrap bg-teal-100 text-teal-800 border-teal-300">N/A</span>
                            )}
                        </div>
                    </div>


                    {/* Customer Details */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Tier</span>
                            <p className="text-sm text-gray-900 dark:text-white font-medium">
                                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${(customer.tier || '') === 'enterprise' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' :
                                    (customer.tier || '') === 'premium' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                                        (customer.tier || '') === 'pro' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                            (customer.tier || '') === 'basic' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                                'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
                                    }`}>
                                    {customer.tier || 'trial'}
                                </span>
                            </p>
                        </div>
                        <div className="space-y-1">
                            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Status</span>
                            <p className="text-sm">
                                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${(customer.status || '') === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                    (customer.status || '') === 'inactive' ? 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400' :
                                        (customer.status || '') === 'suspended' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                            (customer.status || '') === 'prospect' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                                'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
                                    }`}>
                                    {getDisplayValue(customer.status, 'Unknown')}
                                </span>
                            </p>
                        </div>
                    </div>

                    {/* Company Information */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Company</span>
                            <p className="text-sm text-gray-900 dark:text-white font-medium">{getDisplayValue(customer.company)}</p>
                        </div>
                        <div className="space-y-1">
                            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Industry</span>
                            <p className="text-sm text-gray-900 dark:text-white font-medium">{getDisplayValue(customer.industry)}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Account Manager</span>
                            <p className="text-sm text-gray-900 dark:text-white font-medium">{getDisplayValue(customer.account_manager)}</p>
                        </div>
                        <div className="space-y-1">
                            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Country</span>
                            <p className="text-sm text-gray-900 dark:text-white font-medium">{getDisplayValue(customer.country)}</p>
                        </div>
                    </div>


                    {/* Business Metrics */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Projects</span>
                            <button
                                onClick={() => {
                                    onProjectsClick(customer.customer_id, customer.full_name, customer.email, customer.projects || 0);
                                }}
                                className="w-full text-sm text-blue-600 dark:text-blue-400 font-semibold text-center bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:text-blue-800 dark:hover:text-blue-300 px-3 py-2 rounded-lg transition-all duration-200 cursor-pointer hover:shadow-md"
                                title="Click to view project details"
                            >
                                {customer.projects || 0}
                            </button>
                        </div>
                        <div className="space-y-1">
                            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">MRR ($)</span>
                            <p className="text-sm text-emerald-600 dark:text-emerald-400 font-semibold text-center bg-emerald-50 dark:bg-emerald-900/20 px-3 py-2 rounded-lg">
                                {(customer.mrr || 0).toLocaleString()}
                            </p>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Last Order</span>
                        <p className="text-sm text-gray-900 dark:text-white font-medium">
                            {customer.last_order && customer.last_order !== null ? new Date(customer.last_order).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                            }) : 'No orders'}
                        </p>
                    </div>

                    {/* Timestamps */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Created</span>
                            <p className="text-sm text-gray-900 dark:text-white font-medium">
                                {customer.created_at ? new Date(customer.created_at).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric'
                                }) : 'N/A'}
                            </p>
                        </div>
                        <div className="space-y-1">
                            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Last Contact</span>
                            <p className="text-sm text-gray-900 dark:text-white font-medium">
                                {customer.last_contact ? new Date(customer.last_contact).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric'
                                }) : 'Never'}
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default function CustomersPagess() {
    const RAW_BASE_URL = process.env.NEXT_PUBLIC_API_URL;
    if (!RAW_BASE_URL) {
        throw new Error('NEXT_PUBLIC_API_URL environment variable is not set');
    }
    const BASE_URL = RAW_BASE_URL.replace(/\/+$/, '');
    const [activeTab, setActiveTab] = useState<'record' | 'knowledgebase' | 'faq'>('record');
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [showDeleteSingleModal, setShowDeleteSingleModal] = useState<{ open: boolean; customer_id: string | null }>({ open: false, customer_id: null });
    const [deleting, setDeleting] = useState(false);
    const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);
    const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

    // Add pagination state
    const [page, setPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [totalRecords, setTotalRecords] = useState(0);

    // Add filter type state
    const [filterType, setFilterType] = useState<'customer_id' | 'full_name' | 'email' | 'phone' | 'company' | 'industry' | 'status' | 'account_manager' | 'country'>('customer_id');
    const [showFilterPlaceholder, setShowFilterPlaceholder] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Add Customer Modal State
    const [showAddModal, setShowAddModal] = useState(false);

    const [showDownloadModal, setShowDownloadModal] = useState(false);
    const [downloadForm, setDownloadForm] = useState({
        fileFormat: "csv",
        startDate: "",
        endDate: "",
        month: "",
        specificDate: "",
    });

    const [showCustomerUploadModal, setShowCustomerUploadModal] = useState(false);
    // FAQ CSV upload state
    const [faqUploading, setFaqUploading] = useState(false);

    // Success Alert State
    const [alert, setAlert] = useState<{ show: boolean; variant: 'success' | 'error'; title: string; message: string }>({ show: false, variant: 'success', title: '', message: '' });

    // Filter dropdown state
    const [showFilterDropdown, setShowFilterDropdown] = useState(false);
    const [isFilterButtonClicked, setIsFilterButtonClicked] = useState(false);
    const filterDropdownRef = useRef<HTMLDivElement>(null);

    // Add responsive view state
    const [isMobileView, setIsMobileView] = useState(false);
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

    // State for OrderDetailsPage
    const [showOrderDetails, setShowOrderDetails] = useState<{
        show: boolean;
        customerId: string;
        customerName: string;
        projectCount: number;
    }>({ show: false, customerId: '', customerName: '', projectCount: 0 });

    // Add state for new filter options
    const [timeFrame, setTimeFrame] = useState<'all' | 'today' | 'this_week' | 'custom'>('all');
    // Change customStartDate/customEndDate to Date type for react-datepicker
    const [customStartDate, setCustomStartDate] = useState<Date | null>(null);
    const [customEndDate, setCustomEndDate] = useState<Date | null>(null);
    // Remove old sortBy and sortOrder state, add new combined sort option
    const [sortOption, setSortOption] = useState<'created_at_desc' | 'created_at_asc' | 'full_name_asc' | 'full_name_desc' | 'email_asc' | 'email_desc' | 'company_asc' | 'company_desc' | 'industry_asc' | 'industry_desc' | 'status_asc' | 'status_desc'>('created_at_desc');

    // Add allCustomers state
    const [allCustomers, setAllCustomers] = useState<Customer[]>([]);

    // Add below existing states
    const [faqFiles, setFaqFiles] = useState<Array<{ filename: string; directory: string; full_path: string; key: string; size_bytes: number; last_modified: string }>>([]);
    const [faqListLoading, setFaqListLoading] = useState(false);
    const FAQ_DIRECTORY = 'tech_customer';
    const [selectedFilenames, setSelectedFilenames] = useState<Set<string>>(new Set());
    const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; filename?: string }>({ open: false });

    // Order details page state - removed duplicate, using the one from line 400

    // Appointment modal state
    const [showAppointmentModal, setShowAppointmentModal] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [customerAppointments, setCustomerAppointments] = useState<Appointment[]>([]);
    const [loadingAppointments, setLoadingAppointments] = useState(false);

    // Booking modal state (minimal)
    const [showCustomerBookModal, setShowCustomerBookModal] = useState(false);
    const [bookingCustomer, setBookingCustomer] = useState<Customer | null>(null);
    const [customerServices, setCustomerServices] = useState<Array<{ id: string; name: string }>>([]);
    const [customerServiceId, setCustomerServiceId] = useState<string>('');
    const [customerServiceName, setCustomerServiceName] = useState<string>('');
    const [custRawSlots, setCustRawSlots] = useState<Array<{ id: string; start_utc: string; end_utc: string; capacity: number; booked: number }>>([]);
    const [custAvailableDates, setCustAvailableDates] = useState<Array<{ date: string; status: 'available' | 'full' | 'not_assigned'; slots?: number; capacity?: number }>>([]);
    const [custSelectedDate, setCustSelectedDate] = useState<string>('');
    const [custDateSlots, setCustDateSlots] = useState<Array<{ id: string; label: string; available: number }>>([]);
    const [custSelectedSlotId, setCustSelectedSlotId] = useState<string>('');
    const [showCustDatePicker, setShowCustDatePicker] = useState<boolean>(false);
    const [custName, setCustName] = useState<string>('');
    const [custEmail, setCustEmail] = useState<string>('');
    const [custPhone, setCustPhone] = useState<string>('');
    const [custNotes, setCustNotes] = useState<string>('');
    const [custSubmitting, setCustSubmitting] = useState<boolean>(false);

    // Edit appointment state (minimal)
    const [showEditCustomerAppointmentModal, setShowEditCustomerAppointmentModal] = useState(false);
    const [editingCustomerAppointment, setEditingCustomerAppointment] = useState<Appointment | null>(null);
    const [editCustDate, setEditCustDate] = useState<string>('');
    const [editCustShowDatePicker, setEditCustShowDatePicker] = useState<boolean>(false);
    const [editCustAvailableDates, setEditCustAvailableDates] = useState<Array<{ date: string; status: 'available' | 'full' | 'not_assigned'; slots?: number; capacity?: number }>>([]);
    const [editCustDateSlots, setEditCustDateSlots] = useState<Array<FormattedSlot>>([]);
    const [editCustSelectedSlotId, setEditCustSelectedSlotId] = useState<string>('');
    const [editCustNotes, setEditCustNotes] = useState<string>('');
    const [editCustSubmitting, setEditCustSubmitting] = useState<boolean>(false);
    const [showCustCancelReason, setShowCustCancelReason] = useState<boolean>(false);
    const [custCancelReason, setCustCancelReason] = useState<string>('');
    const [editCustRawSlots, setEditCustRawSlots] = useState<Array<{ id: string; start_utc: string; end_utc: string; capacity: number; booked: number }>>([]);
    // Function to fetch customer appointments
    const fetchCustomerAppointments = async (customerEmail: string) => {
        setLoadingAppointments(true);
        try {
            // First, try to fetch only customer-source appointments
            const urlBase = process.env.NEXT_PUBLIC_API_BASE || process.env.NEXT_PUBLIC_API_URL || '';
            const respCustomer = await fetch(`${urlBase}/appointment/admin/appointments?source=customer&customer_email=${encodeURIComponent(customerEmail)}`);
            if (respCustomer.ok) {
                const appts = await respCustomer.json();
                if (Array.isArray(appts) && appts.length > 0) {
                    setCustomerAppointments(appts);
                } else {
                    // Fallback: fetch all and then strictly filter to customer or unknown source
                    const respAll = await fetch(`${urlBase}/appointment/admin/appointments?customer_email=${encodeURIComponent(customerEmail)}`);
                    if (respAll.ok) {
                        const allAppts = await respAll.json();
                        const filtered = (Array.isArray(allAppts) ? allAppts : []).filter((a: Appointment) => {
                            const s = (a && typeof a.source === 'string') ? a.source.toLowerCase() : '';
                            return s === 'customer' || s === '' || s === undefined || s === null;
                        });
                        setCustomerAppointments(filtered);
                    } else {
                        setCustomerAppointments([]);
                    }
                }
            } else {
                setCustomerAppointments([]);
            }
        } catch (error) {
            console.error('Error fetching appointments:', error);
            setCustomerAppointments([]);
        } finally {
            setLoadingAppointments(false);
        }
    };

    // Function to open appointment modal
    const openAppointmentModal = (customer: Customer) => {
        setSelectedCustomer(customer);
        setShowAppointmentModal(true);
        fetchCustomerAppointments(customer.email);
    };

    // Booking: open book modal and preload services
    const openCustomerBookModal = async (customer: Customer) => {
        try {
            setBookingCustomer(customer);
            setShowCustomerBookModal(true);
            setCustName(customer.full_name || '');
            setCustEmail(customer.email || '');
            setCustPhone(customer.phone || '');
            setCustNotes('');
            let current = customerServices;
            if (current.length === 0) {
                const res = await fetch(API_URLS.ADMIN_SERVICES);
                if (res.ok) {
                    const data = await res.json();
                    current = (data || []).map((s: { id: string; name: string }) => ({ id: s.id, name: s.name }));
                    setCustomerServices(current);
                }
            }
            const def = current.find((s: { name?: string }) => (s.name || '').toLowerCase() === 'sales') || current[0];
            if (def) {
                setCustomerServiceId(def.id);
                setCustomerServiceName(def.name);
                await loadCustomerSlots(def.id);
            } else {
                setCustomerServiceName('');
            }
        } catch {
            // Silently handle error
        }
    };

    const loadCustomerSlots = async (serviceId: string) => {
        try {
            const res = await fetch(`${API_URLS.AVAILABILITY_SLOTS}?service_id=${encodeURIComponent(serviceId)}`);
            if (!res.ok) return;
            const data = await res.json();
            setCustRawSlots(data);
            const byDate: Record<string, { capacity: number; booked: number }> = {};
            (data || []).forEach((slot: { start_utc?: string; capacity?: number; booked?: number }) => {
                const d = (slot.start_utc || '').split('T')[0];
                if (!d) return; if (!byDate[d]) byDate[d] = { capacity: 0, booked: 0 };
                byDate[d].capacity += Number(slot.capacity || 0);
                byDate[d].booked += Number(slot.booked || 0);
            });
            const av = Object.entries(byDate).map(([date, v]) => ({
                date,
                status: v.capacity <= 0 ? 'not_assigned' as const : (v.booked >= v.capacity ? 'full' as const : 'available' as const),
                slots: v.capacity - v.booked,
                capacity: v.capacity,
            })).sort((a, b) => a.date.localeCompare(b.date));
            setCustAvailableDates(av);
            setCustSelectedDate('');
            setCustDateSlots([]);
            setCustSelectedSlotId('');
        } catch { }
    };

    const handleCustomerDatePick = (date: string) => {
        setCustSelectedDate(date);
        setShowCustDatePicker(false);
        const list = custRawSlots.filter((s: { start_utc?: string }) => (s.start_utc || '').startsWith(date)).map((s: { start_utc: string; end_utc: string; id: string; capacity?: number; booked?: number }) => {
            const start = s.start_utc.split('T')[1].slice(0, 5);
            const end = s.end_utc.split('T')[1].slice(0, 5);
            const avail = Math.max(0, Number(s.capacity || 0) - Number(s.booked || 0));
            return { id: s.id, label: `${start} - ${end} (${avail} available)`, available: avail };
        }).filter((s: { available: number }) => s.available > 0);
        setCustDateSlots(list);
        setCustSelectedSlotId(list[0]?.id || '');
    };

    const submitCustomerBooking = async () => {
        if (custSubmitting) return;
        if (!bookingCustomer || !customerServiceId || !custSelectedSlotId) return;
        const slot = custRawSlots.find(s => s.id === custSelectedSlotId);
        if (!slot) return;
        const date = slot.start_utc.split('T')[0];
        const time = slot.start_utc.split('T')[1].slice(0, 5);
        try {
            setCustSubmitting(true);
            const payload = {
                service_name: customerServiceName || 'Sales',
                date,
                time,
                customer_name: custName || bookingCustomer.full_name,
                customer_email: custEmail || bookingCustomer.email,
                message: custNotes || 'Booked from Customers page',
            };
            // Use customer-specific booking endpoint - IMPORTANT: Use /appointment/customer/book NOT /appointment/appointments
            const endpoint = API_URLS.CUSTOMER_BOOK;
            console.log('🔍 Customer booking - endpoint:', endpoint, 'payload:', payload); // Debug log
            if (!endpoint || endpoint.includes('/appointments') && !endpoint.includes('/customer/book')) {
                console.error('❌ Wrong endpoint detected! Using:', endpoint);
                throw new Error('Invalid endpoint configuration');
            }
            const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            if (res.ok) {
                setShowCustomerBookModal(false);
                setAlert({ show: true, variant: 'success', title: 'Booked', message: 'Appointment booked and email will be sent.' });
                // Refresh appointments list after successful booking
                if (bookingCustomer && bookingCustomer.email) {
                    await fetchCustomerAppointments(bookingCustomer.email);
                }
            } else {
                let msg = ''; try { if (!res.bodyUsed) msg = await res.text(); } catch { }
                setAlert({ show: true, variant: 'error', title: 'Booking failed', message: msg || `${res.status} ${res.statusText}` });
            }
        } finally {
            setCustSubmitting(false);
        }
    };

    // Edit appointment minimal helpers
    const openEditCustomerAppointmentModal = async (appointment: Appointment) => {
        try {
            setEditingCustomerAppointment(appointment);
            const normalizedDate = appointment.date ? appointment.date.split('T')[0] : '';
            setEditCustDate(normalizedDate);
            setEditCustNotes(appointment.reason || appointment.notes || '');
            setShowCustCancelReason(false);
            setCustCancelReason('');
            setEditCustSelectedSlotId('');
            setEditCustShowDatePicker(false);
            setShowEditCustomerAppointmentModal(true);
            let serviceId = appointment.service_id;
            if (!serviceId && appointment.service_name) {
                const res = await fetch(API_URLS.ADMIN_SERVICES);
                if (res.ok) {
                    const data = await res.json();
                    const fetchedServices = (data || []).map((s: Service) => ({ id: s.id, name: s.name }));
                    const matched = fetchedServices.find((s: Service) => s.name === appointment.service_name);
                    if (matched) serviceId = matched.id;
                }
            }
            if (serviceId) await loadEditCustomerSlots(serviceId, normalizedDate, appointment.time);
        } catch { }
    };

    const loadEditCustomerSlots = async (serviceId: string, currentDate: string, currentTime: string) => {
        try {
            const res = await fetch(`${API_URLS.AVAILABILITY_SLOTS}?service_id=${encodeURIComponent(serviceId)}`);
            if (!res.ok) return;
            const data = await res.json();
            setEditCustRawSlots(data);
            const byDate: Record<string, { capacity: number; booked: number }> = {};
            (data || []).forEach((slot: AvailabilitySlot) => {
                const date = (slot.start_utc || '').split('T')[0];
                if (!date) return; if (!byDate[date]) byDate[date] = { capacity: 0, booked: 0 };
                byDate[date].capacity += Number(slot.capacity || 0);
                byDate[date].booked += Number(slot.booked || 0);
            });
            const dates = Object.entries(byDate).map(([date, v]) => ({
                date,
                status: v.capacity - v.booked > 0 ? 'available' as const : 'full' as const,
                slots: v.capacity - v.booked,
                capacity: v.capacity,
            })).sort((a, b) => a.date.localeCompare(b.date));
            const normalizedCurrentDate = currentDate ? currentDate.split('T')[0] : '';
            if (normalizedCurrentDate) {
                const exists = dates.find(d => d.date === normalizedCurrentDate);
                if (!exists) { dates.push({ date: normalizedCurrentDate, status: 'available' as const, slots: 1, capacity: 1 }); dates.sort((a, b) => a.date.localeCompare(b.date)); }
                setEditCustDate(normalizedCurrentDate);
                handleEditCustomerDatePick(normalizedCurrentDate, currentTime);
            }
            setEditCustAvailableDates(dates);
        } catch { }
    };

    const handleEditCustomerDatePick = (date: string, currentTime?: string) => {
        setEditCustDate(date);
        setEditCustShowDatePicker(false);
        const slotsForDate = (editCustRawSlots || []).filter((slot: AvailabilitySlot) => (slot.start_utc || '').split('T')[0] === date);
        const formatted: FormattedSlot[] = slotsForDate.map((slot: AvailabilitySlot) => {
            const startTime = slot.start_utc.split('T')[1]?.slice(0, 5) || '';
            const endTime = slot.end_utc.split('T')[1]?.slice(0, 5) || '';
            const label = startTime === endTime ? startTime : `${startTime}-${endTime}`;
            const capacity = slot.capacity ?? 0;
            const booked = slot.booked ?? 0;
            return { id: slot.id, label: `${label} (${capacity - booked}/${capacity} available)`, available: capacity - booked, start_utc: slot.start_utc };
        }).filter((s: FormattedSlot) => s.available > 0 || currentTime).sort((a: FormattedSlot, b: FormattedSlot) => (a.start_utc.split('T')[1] || '').localeCompare(b.start_utc.split('T')[1] || ''));
        setEditCustDateSlots(formatted);
        if (currentTime && formatted.length > 0) {
            const match = formatted.find((s: FormattedSlot) => (s.start_utc.split('T')[1] || '').slice(0, 5) === currentTime);
            setEditCustSelectedSlotId(match ? match.id : formatted[0].id);
        } else if (formatted.length > 0) {
            setEditCustSelectedSlotId(formatted[0].id);
        }
    };

    const submitUpdateCustomerAppointment = async () => {
        if (editCustSubmitting || !editingCustomerAppointment || !editCustDate || !editCustSelectedSlotId) return;
        const slot = editCustRawSlots.find((s: AvailabilitySlot) => s.id === editCustSelectedSlotId);
        if (!slot) return;
        const time = slot.start_utc.split('T')[1]?.slice(0, 5) || '';
        try {
            setEditCustSubmitting(true);
            // Use API_URLS.LEAD_RESCHEDULE with user_type=customer query param
            const endpoint = `${API_URLS.LEAD_RESCHEDULE}/${editingCustomerAppointment.id}/reschedule?user_type=customer`;
            console.log('🔍 Customer reschedule - endpoint:', endpoint); // Debug log
            const res = await fetch(endpoint, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ new_date: editCustDate, new_time: time, reason: editCustNotes || editingCustomerAppointment.reason || 'Rescheduled by admin' }) });
            if (res.ok) {
                setShowEditCustomerAppointmentModal(false);
                if (selectedCustomer) fetchCustomerAppointments(selectedCustomer.email);
            } else {
                // no-op minimal
            }
        } finally {
            setEditCustSubmitting(false);
        }
    };

    const submitCancelCustomerAppointment = async () => {
        if (editCustSubmitting || !editingCustomerAppointment) return;
        if (!custCancelReason.trim()) return;
        try {
            setEditCustSubmitting(true);
            // Use API_URLS.LEAD_CANCEL with user_type=customer query param
            const endpoint = `${API_URLS.LEAD_CANCEL}/${editingCustomerAppointment.id}?user_type=customer`;
            console.log('🔍 Customer cancel - endpoint:', endpoint); // Debug log
            const res = await fetch(endpoint, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason: custCancelReason }) });
            if (res.ok) {
                setShowEditCustomerAppointmentModal(false);
                if (selectedCustomer) fetchCustomerAppointments(selectedCustomer.email);
            }
        } finally {
            setEditCustSubmitting(false);
        }
    };

    // Function to close appointment modal
    const closeAppointmentModal = () => {
        setShowAppointmentModal(false);
        setSelectedCustomer(null);
        setCustomerAppointments([]);
    };

    // Prevent body scroll when order details is open
    useEffect(() => {
        if (showOrderDetails.show) {
            // Store the current scroll position
            const scrollY = window.scrollY;
            document.body.style.position = 'fixed';
            document.body.style.top = `-${scrollY}px`;
            document.body.style.width = '100%';
            document.body.style.overflow = 'hidden';
        } else {
            // Restore scroll position
            const scrollY = document.body.style.top;
            document.body.style.position = '';
            document.body.style.top = '';
            document.body.style.width = '';
            document.body.style.overflow = '';
            if (scrollY) {
                window.scrollTo(0, parseInt(scrollY || '0') * -1);
            }
        }

        // Cleanup on unmount
        return () => {
            document.body.style.position = '';
            document.body.style.top = '';
            document.body.style.width = '';
            document.body.style.overflow = '';
        };
    }, [showOrderDetails.show]);

    // Handle escape key to close order details
    useEffect(() => {
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && showOrderDetails.show) {
                setShowOrderDetails({ show: false, customerId: '', customerName: '', projectCount: 0 });
            }
        };

        if (showOrderDetails.show) {
            document.addEventListener('keydown', handleEscape);
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
        };
    }, [showOrderDetails.show]);

    const isAllSelected = faqFiles.length > 0 && faqFiles.every(f => selectedFilenames.has(f.filename));
    const toggleSelectAll = () => {
        setSelectedFilenames(prev => {
            if (isAllSelected) return new Set(prev);
            return new Set(faqFiles.map(f => f.filename));
        });
    };
    const toggleSelectOne = (name: string) => {
        setSelectedFilenames(prev => {
            const next = new Set(prev);
            if (next.has(name)) next.delete(name); else next.add(name);
            return next;
        });
    };

    // Handle projects click to show project details
    const handleProjectsClick = (customerId: string, customerName: string, customerEmail: string, projectCount: number) => {
        setShowOrderDetails({ show: true, customerId, customerName: customerEmail, projectCount });
    };

    function getFileTypeFromName(name: string) {
        const dot = name.lastIndexOf('.');
        if (dot >= 0) return name.substring(dot + 1).toUpperCase();
        return 'FILE';
    }

    // Load FAQ file when FAQ tab is active
    useEffect(() => {
        async function loadFaqFiles() {
            if (activeTab !== 'faq') return;
            try {
                setFaqListLoading(true);
                const { files } = await fetchFaqFiles(FAQ_DIRECTORY);
                setFaqFiles(Array.isArray(files) ? files : []);
            } catch (e) {
                console.error('Failed to load FAQ file', e);
            } finally {
                setFaqListLoading(false);
            }
        }
        loadFaqFiles();
    }, [activeTab]);

    // Helper to manually refresh FAQ file
    const refreshFaqFiles = async () => {
        try {
            setFaqListLoading(true);
            const { files } = await fetchFaqFiles(FAQ_DIRECTORY);
            setFaqFiles(Array.isArray(files) ? files : []);
            setAlert({ show: true, variant: 'success', title: 'Refreshed', message: 'FAQ list refreshed.' });
            setTimeout(() => setAlert((a: typeof alert) => ({ ...a, show: false })), 2000);
        } catch (e) {
            const msg = e instanceof Error ? e.message : 'Failed to refresh FAQ file';
            setAlert({ show: true, variant: 'error', title: 'Refresh Failed', message: msg });
            setTimeout(() => setAlert((a: typeof alert) => ({ ...a, show: false })), 3000);
        } finally {
            setFaqListLoading(false);
        }
    };

    // Check screen size on mount and resize
    useEffect(() => {
        const checkScreenSize = () => {
            setIsMobileView(window.innerWidth < 768);
        };

        checkScreenSize();
        window.addEventListener('resize', checkScreenSize);

        return () => window.removeEventListener('resize', checkScreenSize);
    }, []);

    // Toggle row expansion
    const toggleRowExpansion = (customerId: string) => {
        setExpandedRows(prev => {
            const newSet = new Set(prev);
            if (newSet.has(customerId)) {
                newSet.delete(customerId);
            } else {
                newSet.add(customerId);
            }
            return newSet;
        });
    };


    useEffect(() => {
        if (!showFilterDropdown || isFilterButtonClicked) return;

        function handleClickOutside(event: MouseEvent) {
            const target = event.target as Element;

            // Don't close if clicking on the filter button itself
            if (target.closest('button[data-filter-button]')) {
                return;
            }

            // Don't close if clicking inside the filter dropdown
            if (filterDropdownRef.current && filterDropdownRef.current.contains(target)) {
                return;
            }

            setShowFilterDropdown(false);
        }

        document.addEventListener('click', handleClickOutside);

        return () => {
            document.removeEventListener('click', handleClickOutside);
        };
    }, [showFilterDropdown, isFilterButtonClicked]);

    // Utility to get all filtered (not paginated) customers
    const getFilteredCustomers = (): Customer[] => {
        let filtered = [...allCustomers];
        if (searchQuery) {
            if (filterType && showFilterPlaceholder) {
                // Specific field search when filter is selected
                filtered = filtered.filter(cust => {
                    const val = cust[filterType as keyof Customer] ? String(cust[filterType as keyof Customer]).toLowerCase() : '';
                    return val.includes(searchQuery.toLowerCase());
                });
            } else {
                // Advanced global search across all fields when no specific filter is selected
                filtered = filtered.filter(cust => {
                    const searchWords = searchQuery.toLowerCase().trim().split(/\s+/).filter(word => word.length > 0);

                    if (searchWords.length === 0) return true;

                    // Check if ANY word matches ANY field
                    return searchWords.some(word => {
                        return (
                            (cust.customer_id && cust.customer_id.toLowerCase().includes(word)) ||
                            (cust.full_name && cust.full_name.toLowerCase().includes(word)) ||
                            (cust.email && cust.email.toLowerCase().includes(word)) ||
                            (cust.phone && cust.phone.toLowerCase().includes(word)) ||
                            (cust.company && cust.company.toLowerCase().includes(word)) ||
                            (cust.industry && cust.industry.toLowerCase().includes(word)) ||
                            (cust.status && cust.status.toLowerCase().includes(word)) ||
                            (cust.account_manager && cust.account_manager.toLowerCase().includes(word)) ||
                            (cust.country && cust.country.toLowerCase().includes(word))
                        );
                    });
                });
            }
        }
        if (timeFrame === 'today') {
            const today = new Date();
            const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
            filtered = filtered.filter(cust => {
                if (!cust.created_at) return false;
                const created = new Date(cust.created_at);
                return created >= startOfDay && created <= endOfDay;
            });
        } else if (timeFrame === 'this_week') {
            const now = new Date();
            const weekStart = new Date(now.setDate(now.getDate() - now.getDay() + 1));
            const weekEnd = new Date(now.setDate(now.getDate() - now.getDay() + 7));
            filtered = filtered.filter(cust => {
                if (!cust.created_at) return false;
                const created = new Date(cust.created_at);
                return created >= weekStart && created <= weekEnd;
            });
        } else if (timeFrame === 'custom' && customStartDate && customEndDate) {
            filtered = filtered.filter(cust => {
                if (!cust.created_at) return false;
                const created = new Date(cust.created_at);
                return created >= customStartDate && created <= customEndDate;
            });
        }
        filtered.sort((a, b) => {
            switch (sortOption) {
                case 'created_at_desc':
                    return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
                case 'created_at_asc':
                    return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
                case 'full_name_asc':
                    return (a.full_name || '').localeCompare(b.full_name || '');
                case 'full_name_desc':
                    return (b.full_name || '').localeCompare(a.full_name || '');
                case 'email_asc':
                    return (a.email || '').localeCompare(b.email || '');
                case 'email_desc':
                    return (b.email || '').localeCompare(a.email || '');
                case 'company_asc':
                    return (a.company || '').localeCompare(b.company || '');
                case 'company_desc':
                    return (b.company || '').localeCompare(a.company || '');
                case 'industry_asc':
                    return (a.industry || '').localeCompare(b.industry || '');
                case 'industry_desc':
                    return (b.industry || '').localeCompare(a.industry || '');
                case 'status_asc':
                    return (a.status || '').localeCompare(b.status || '');
                case 'status_desc':
                    return (b.status || '').localeCompare(a.status || '');
                default:
                    return 0;
            }
        });

        // Return filtered data as-is since API now provides all fields
        return filtered;
    };

    // Removed unused handleDownloadTemplate to satisfy linter

    const handleDownload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!downloadForm.fileFormat) {
            setAlert({ show: true, variant: 'error', title: 'Missing Format', message: 'Please select a file format.' });
            setTimeout(() => setAlert((a: typeof alert) => ({ ...a, show: false })), 3000);
            return;
        }
        const fileExt = downloadForm.fileFormat === 'csv' ? 'csv' : 'xlsx';
        const now = new Date();
        const pad = (n: number) => n.toString().padStart(2, '0');
        const timestamp = pad(now.getDate()) + "-" + pad(now.getMonth() + 1) + "-" + now.getFullYear() + "_" + pad(now.getHours()) + "-" + pad(now.getMinutes()) + "-" + pad(now.getSeconds());
        const fileName = "Customer_Records_" + timestamp + "." + fileExt;
        const exportData = getFilteredCustomers();
        if (exportData.length === 0) {
            setAlert({ show: true, variant: 'error', title: 'No Data', message: 'No data available to download.' });
            setTimeout(() => setAlert((a: typeof alert) => ({ ...a, show: false })), 3000);
            return;
        }
        if (downloadForm.fileFormat === 'csv') {
            const header = Object.keys(exportData[0] || {}).join(',');
            const rows = exportData.map(row => Object.values(row).map(val => `"${String(val).replace(/"/g, '""')}"`).join(',')).join('\n');
            const csvContent = header + "\n" + rows;
            const blob = new Blob([csvContent], { type: 'text/csv' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(link.href);
        } else {
            const ws = XLSX.utils.json_to_sheet(exportData);

            // Set column widths to accommodate full field names
            const columnWidths = [
                { wch: 15 }, // customer_id
                { wch: 20 }, // full_name
                { wch: 25 }, // email
                { wch: 15 }, // phone
                { wch: 15 }, // department
                { wch: 12 }, // tier
                { wch: 20 }, // company
                { wch: 15 }, // industry
                { wch: 12 }, // status
                { wch: 18 }, // account_manager
                { wch: 10 }, // country
                { wch: 8 },  // mrr
                { wch: 20 }, // last_order
                { wch: 20 }, // created_at
                { wch: 20 }  // last_contact
            ];
            ws['!cols'] = columnWidths;

            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Customers');
            XLSX.writeFile(wb, fileName);
        }
        setShowDownloadModal(false);
        setAlert({ show: true, variant: 'success', title: 'Download Successful!', message: "File downloaded: " + fileName });
        setTimeout(() => setAlert((a: typeof alert) => ({ ...a, show: false })), 3000);
    };

    // Download current list view data - matches template format for easy re-upload
    const handleDownloadListData = () => {
        if (customers.length === 0) {
            setAlert({ show: true, variant: 'error', title: 'No Data', message: 'No data available to download.' });
            setTimeout(() => setAlert((a: typeof alert) => ({ ...a, show: false })), 3000);
            return;
        }

        const now = new Date();
        const pad = (n: number) => n.toString().padStart(2, '0');
        const timestamp = pad(now.getDate()) + "-" + pad(now.getMonth() + 1) + "-" + now.getFullYear() + "_" + pad(now.getHours()) + "-" + pad(now.getMinutes()) + "-" + pad(now.getSeconds());
        const fileName = "Customer_List_" + timestamp + ".xlsx";

        // Prepare data for export - use same column names as template (snake_case) for easy re-upload
        // Order matches template: customer_id, full_name, email, phone, department, tier, company, industry, status, account_manager, country, mrr, last_order, created_at, last_contact
        const exportData = customers.map(({ customer_id, full_name, email, phone, tier, company, industry, status, account_manager, country, mrr, last_order, created_at, last_contact }) => ({
            customer_id: customer_id || '',
            full_name: full_name || '',
            email: email || '',
            phone: phone || '',
            department: '', // Not in Customer interface, but in template
            tier: tier || '',
            company: company || '',
            industry: industry || '',
            status: status || '',
            account_manager: account_manager || '',
            country: country || '',
            mrr: mrr || 0,
            last_order: last_order || '',
            created_at: created_at || '',
            last_contact: last_contact || ''
        }));

        // Create Excel file
        const ws = XLSX.utils.json_to_sheet(exportData);

        // Set column widths to match template format
        const columnWidths = [
            { wch: 15 }, // customer_id
            { wch: 20 }, // full_name
            { wch: 25 }, // email
            { wch: 15 }, // phone
            { wch: 15 }, // department
            { wch: 12 }, // tier
            { wch: 20 }, // company
            { wch: 15 }, // industry
            { wch: 12 }, // status
            { wch: 18 }, // account_manager
            { wch: 10 }, // country
            { wch: 8 },  // mrr
            { wch: 20 }, // last_order
            { wch: 20 }, // created_at
            { wch: 20 }  // last_contact
        ];
        ws['!cols'] = columnWidths;

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Customers');
        XLSX.writeFile(wb, fileName);

        setAlert({ show: true, variant: 'success', title: 'Download Successful!', message: "File downloaded: " + fileName });
        setTimeout(() => setAlert((a: typeof alert) => ({ ...a, show: false })), 3000);
    };

    // Refresh handler to clear search and filters and refetch data
    const handleRefresh = async () => {
        setIsLoading(true);
        setPage(1);
        setSearchQuery('');
        setFilterType('customer_id');
        setShowFilterPlaceholder(false);
        setTimeFrame('all');
        setCustomStartDate(null);
        setCustomEndDate(null);
        setSortOption('created_at_desc');
        setSelectedCustomerIds([]);

        // Reset filter section state
        setShowFilterDropdown(false);
        setIsFilterButtonClicked(false);

        // Refetch all customers from backend
        const params = new URLSearchParams();
        params.append("page", String(page));
        params.append("size", String(rowsPerPage));
        try {
            const response = await fetch(
                BASE_URL + "/api/v1/customers/?" + params.toString(),
                {
                    method: "GET",
                    headers: { accept: "application/json" },
                },
            );
            if (response.ok) {
                const data = await response.json();
                // New API returns pagination metadata and data array
                setAllCustomers(Array.isArray(data.data) ? data.data : []);
                if (typeof data.total_records === 'number') {
                    setTotalRecords(data.total_records || 0);
                }
            }
        } catch (error) {
            console.error('Error refreshing data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Move fetchAllCustomers to top level so it can be reused
    const fetchAllCustomers = useCallback(async () => {
        setIsLoading(true);
        const params = new URLSearchParams();
        params.append("page", String(page));
        params.append("size", String(rowsPerPage));
        try {
            const response = await fetch(
                BASE_URL + "/api/v1/customers/?" + params.toString(),
                { method: "GET", headers: { accept: "application/json" } }
            );
            if (response.ok) {
                const data = await response.json();
                setAllCustomers(Array.isArray(data.data) ? data.data : []);
                if (typeof data.total_records === 'number') {
                    setTotalRecords(data.total_records || 0);
                }
            }
        } finally {
            setIsLoading(false);
        }
    }, [BASE_URL, page, rowsPerPage]); // Depend on pagination inputs



    // Fetch customers when pagination changes
    useEffect(() => {
        fetchAllCustomers();
    }, [fetchAllCustomers]);

    // Reset filter state on page load/reload
    useEffect(() => {
        setShowFilterDropdown(false);
        setTimeFrame('all');
        setCustomStartDate(null);
        setCustomEndDate(null);
        setSortOption('created_at_desc');
        setIsFilterButtonClicked(false);
        setShowFilterPlaceholder(false);
        setSearchQuery('');
        setFilterType('customer_id');
        setPage(1);
        setRowsPerPage(10);
        setSelectedCustomerIds([]);
    }, []);

    // Frontend filtering, sorting, and pagination
    useEffect(() => {
        let filtered = [...allCustomers];
        // Filter By and search
        if (searchQuery) {
            if (filterType && showFilterPlaceholder) {
                // Specific field search when filter is selected
                filtered = filtered.filter(cust => {
                    const val = cust[filterType as keyof Customer] ? String(cust[filterType as keyof Customer]).toLowerCase() : '';
                    return val.includes(searchQuery.toLowerCase());
                });
            } else {
                // Advanced global search across all fields when no specific filter is selected
                filtered = filtered.filter(cust => {
                    const searchWords = searchQuery.toLowerCase().trim().split(/\s+/).filter(word => word.length > 0);

                    if (searchWords.length === 0) return true;

                    // Check if ANY word matches ANY field
                    return searchWords.some(word => {
                        return (
                            (cust.customer_id && cust.customer_id.toLowerCase().includes(word)) ||
                            (cust.full_name && cust.full_name.toLowerCase().includes(word)) ||
                            (cust.email && cust.email.toLowerCase().includes(word)) ||
                            (cust.phone && cust.phone.toLowerCase().includes(word)) ||
                            (cust.company && cust.company.toLowerCase().includes(word)) ||
                            (cust.industry && cust.industry.toLowerCase().includes(word)) ||
                            (cust.status && cust.status.toLowerCase().includes(word)) ||
                            (cust.account_manager && cust.account_manager.toLowerCase().includes(word)) ||
                            (cust.country && cust.country.toLowerCase().includes(word))
                        );
                    });
                });
            }
        }
        // Time Frame filter
        if (timeFrame === 'today') {
            const today = new Date();
            const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
            filtered = filtered.filter(cust => {
                if (!cust.created_at) return false;
                const created = new Date(cust.created_at);
                return created >= startOfDay && created <= endOfDay;
            });
        } else if (timeFrame === 'this_week') {
            const now = new Date();
            const weekStart = new Date(now.setDate(now.getDate() - now.getDay() + 1));
            const weekEnd = new Date(now.setDate(now.getDate() - now.getDay() + 7));
            filtered = filtered.filter(cust => {
                if (!cust.created_at) return false;
                const created = new Date(cust.created_at);
                return created >= weekStart && created <= weekEnd;
            });
        } else if (timeFrame === 'custom' && customStartDate && customEndDate) {
            filtered = filtered.filter(cust => {
                if (!cust.created_at) return false;
                const created = new Date(cust.created_at);
                return created >= customStartDate && created <= customEndDate;
            });
        }
        // Sort By
        filtered.sort((a, b) => {
            switch (sortOption) {
                case 'created_at_desc':
                    return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
                case 'created_at_asc':
                    return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
                case 'full_name_asc':
                    return (a.full_name || '').localeCompare(b.full_name || '');
                case 'full_name_desc':
                    return (b.full_name || '').localeCompare(a.full_name || '');
                case 'email_asc':
                    return (a.email || '').localeCompare(b.email || '');
                case 'email_desc':
                    return (b.email || '').localeCompare(a.email || '');
                case 'company_asc':
                    return (a.company || '').localeCompare(b.company || '');
                case 'company_desc':
                    return (b.company || '').localeCompare(a.company || '');
                case 'industry_asc':
                    return (a.industry || '').localeCompare(b.industry || '');
                case 'industry_desc':
                    return (b.industry || '').localeCompare(a.industry || '');
                case 'status_asc':
                    return (a.status || '').localeCompare(b.status || '');
                case 'status_desc':
                    return (b.status || '').localeCompare(a.status || '');
                default:
                    return 0;
            }
        });
        // Pagination
        const start = (page - 1) * rowsPerPage;
        const end = start + rowsPerPage;
        setCustomers(filtered.slice(start, end));
    }, [allCustomers, filterType, searchQuery, timeFrame, customStartDate, customEndDate, sortOption, page, rowsPerPage, showFilterPlaceholder]);

    // Calculate total pages from filtered customers (unused - commented out)
    // const getFilteredCustomersCount = useCallback(() => {
    //     let filtered = [...allCustomers];
    //     if (searchQuery) {
    //         if (filterType && showFilterPlaceholder) {
    //             filtered = filtered.filter(cust => {
    //                 const val = cust[filterType as keyof Customer] ? String(cust[filterType as keyof Customer]).toLowerCase() : '';
    //                 return val.includes(searchQuery.toLowerCase());
    //             });
    //         } else {
    //             const searchWords = searchQuery.toLowerCase().trim().split(/\s+/).filter(word => word.length > 0);
    //             if (searchWords.length > 0) {
    //                 filtered = filtered.filter(cust => {
    //                     return searchWords.some(word => {
    //                         return (
    //                             (cust.customer_id && cust.customer_id.toLowerCase().includes(word)) ||
    //                             (cust.full_name && cust.full_name.toLowerCase().includes(word)) ||
    //                             (cust.email && cust.email.toLowerCase().includes(word)) ||
    //                             (cust.phone && cust.phone.toLowerCase().includes(word)) ||
    //                             (cust.company && cust.company.toLowerCase().includes(word)) ||
    //                             (cust.industry && cust.industry.toLowerCase().includes(word)) ||
    //                             (cust.status && cust.status.toLowerCase().includes(word)) ||
    //                             (cust.account_manager && cust.account_manager.toLowerCase().includes(word)) ||
    //                             (cust.country && cust.country.toLowerCase().includes(word))
    //                         );
    //                     });
    //                 });
    //             }
    //         }
    //     }
    //     if (timeFrame === 'today') {
    //         const today = new Date();
    //         const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    //         const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
    //         filtered = filtered.filter(cust => {
    //             if (!cust.created_at) return false;
    //             const created = new Date(cust.created_at);
    //             return created >= startOfDay && created <= endOfDay;
    //         });
    //     } else if (timeFrame === 'this_week') {
    //         const now = new Date();
    //         const weekStart = new Date(now.setDate(now.getDate() - now.getDay() + 1));
    //         const weekEnd = new Date(now.setDate(now.getDate() - now.getDay() + 7));
    //         filtered = filtered.filter(cust => {
    //             if (!cust.created_at) return false;
    //             const created = new Date(cust.created_at);
    //             return created >= weekStart && created <= weekEnd;
    //         });
    //     } else if (timeFrame === 'custom' && customStartDate && customEndDate) {
    //         filtered = filtered.filter(cust => {
    //             if (!cust.created_at) return false;
    //             const created = new Date(cust.created_at);
    //             return created >= customStartDate && created <= customEndDate;
    //         });
    //     }
    //     return filtered.length;
    // }, [allCustomers, filterType, searchQuery, timeFrame, customStartDate, customEndDate, showFilterPlaceholder]);

    // const filteredCustomersCount = getFilteredCustomersCount(); // filteredCustomersCount unused
    // const totalPages = Math.ceil(filteredCustomersCount / rowsPerPage); // Unused variable

    // File upload
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files.length > 0) {
            const file = event.target.files[0];

            // Validate file format
            const allowedTypes = [
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
                'application/vnd.ms-excel', // .xls
                'text/csv', // .csv
                'application/csv' // .csv alternative
            ];

            const allowedExtensions = ['.xlsx', '.xls', '.csv'];
            const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));

            const isValidFormat = allowedTypes.includes(file.type) || allowedExtensions.includes(fileExtension);

            if (!isValidFormat) {
                setAlert({
                    show: true,
                    variant: 'error',
                    title: 'Invalid File Format',
                    message: 'Unsupported file format. Only CSV, XLS, and XLSX are allowed.'
                });
                setTimeout(() => setAlert((a: typeof alert) => ({ ...a, show: false })), 3000);
                if (fileInputRef.current) fileInputRef.current.value = "";
                return;
            }

            setSelectedFile(file);
            setShowConfirmModal(true);
        }
    };

    const handleConfirmUpload = async () => {
        if (selectedFile) {
            setUploading(true);
            const formData = new FormData();
            formData.append("file", selectedFile);

            try {
                const response = await fetch(
                    BASE_URL + "/api/v1/upload-customers/",
                    {
                        method: "POST",
                        body: formData,
                    }
                );

                if (response.ok) {
                    // After successful upload, refetch all customers to update the frontend table
                    await fetchAllCustomers();

                    // Show success message
                    setAlert({
                        show: true,
                        variant: 'success',
                        title: 'Upload Successful!',
                        message: "File uploaded: " + selectedFile.name
                    });
                    setTimeout(() => setAlert((a: typeof alert) => ({ ...a, show: false })), 3000);
                } else {
                    // Handle different error responses from backend
                    let errorMessage = "Failed to upload customer file. Please try again.";

                    try {
                        const errorData = await response.json();

                        // Check for specific error messages from backend
                        if (errorData.message) {
                            errorMessage = errorData.message;
                        } else if (errorData.detail) {
                            errorMessage = errorData.detail;
                        } else if (errorData.error) {
                            errorMessage = errorData.error;
                        }

                        // Handle specific error cases
                        if (errorMessage.includes("Missing required columns") ||
                            errorMessage.includes("customer_id") ||
                            errorMessage.includes("full_name") ||
                            errorMessage.includes("email")) {
                            errorMessage = "Missing required columns: customer_id, full_name, email";
                        } else if (errorMessage.includes("Unsupported file format") ||
                            errorMessage.includes("file format")) {
                            errorMessage = "Unsupported file format. Only CSV, XLS, and XLSX are allowed.";
                        }
                    } catch {
                        // If we can't parse the error response, use the status text
                        if (response.statusText) {
                            errorMessage = "Upload failed: " + response.statusText;
                        }
                    }

                    setAlert({
                        show: true,
                        variant: 'error',
                        title: 'Upload Failed',
                        message: errorMessage
                    });
                    setTimeout(() => setAlert((a: typeof alert) => ({ ...a, show: false })), 3000);
                }
            } catch {
                setAlert({
                    show: true,
                    variant: 'error',
                    title: 'Network Error',
                    message: 'Network error. Please check your connection and try again.'
                });
                setTimeout(() => setAlert((a: typeof alert) => ({ ...a, show: false })), 3000);
            } finally {
                setUploading(false);
                setShowConfirmModal(false);
                setSelectedFile(null);
            }
        }
    };

    const handleCancelUpload = () => {
        setShowConfirmModal(false);
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    // Delete Single by id ---->
    const handleDeleteSingle = async (customer_id: string) => {
        setDeleting(true);
        try {
            const response = await fetch(BASE_URL + "/api/v1/customers/" + customer_id, {
                method: "DELETE",
                headers: { "accept": "application/json" },
            });
            if (response.ok) {
                // After successful deletion, refetch all customers to update the frontend table
                await fetchAllCustomers();
                setAlert({ show: true, variant: 'success', title: 'Delete Successful!', message: 'Customer deleted successfully.' });
            } else {
                setAlert({ show: true, variant: 'error', title: 'Delete Failed', message: 'Failed to delete customer.' });
            }
            setTimeout(() => setAlert((a: typeof alert) => ({ ...a, show: false })), 3000);
        } finally {
            setDeleting(false);
            setShowDeleteSingleModal({ open: false, customer_id: null });
        }
    };

    // Select all handler
    const allSelected = customers.length > 0 && customers.every(cust => selectedCustomerIds.includes(cust.customer_id));
    const handleSelectAll = () => {
        if (allSelected) {
            setSelectedCustomerIds([]);
        } else {
            setSelectedCustomerIds(customers.map(cust => cust.customer_id));
        }
    };
    // Select single handler
    const handleSelectOne = (customer_id: string) => {
        setSelectedCustomerIds(ids => ids.includes(customer_id) ? ids.filter(cid => cid !== customer_id) : [...ids, customer_id]);
    };

    // Bulk delete handler
    const handleBulkDelete = async () => {
        setShowBulkDeleteConfirm(false);
        setDeleting(true);
        try {
            for (const customer_id of selectedCustomerIds) {
                await fetch(BASE_URL + "/api/v1/customers/" + customer_id, {
                    method: "DELETE",
                    headers: { "accept": "application/json" },
                });
            }
            // After deletion, refetch all customers
            await fetchAllCustomers();
            setSelectedCustomerIds([]);
            setAlert({ show: true, variant: 'success', title: 'Delete Successful!', message: 'Selected customers deleted.' });
            setTimeout(() => setAlert((a: typeof alert) => ({ ...a, show: false })), 3000);
        } finally {
            setDeleting(false);
        }
    };

    // Handler for customer card deletion
    // const handleCardDelete = (customer_id: string) => {
    //     setShowDeleteSingleModal({ open: true, customer_id });
    // }; // Unused function

    // Handler for customer card toggle expansion
    // const handleCardToggleExpansion = (customer_id: string) => {
    //     toggleRowExpansion(customer_id);
    // }; // Unused function

    return (
        <div className="min-h-screen bg-white dark:bg-gray-900">
            <div className="mx-4 md:mx-6 mt-6 mb-8">
                <DashboardHeader
                    variant="default"
                    size="lg"
                    title="Customers"
                    subtitle="Streamline customer relationships with intelligent data management and automated workflows. Manage interactions, contacts, and growth with actionable insights."
                    breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Customers' }]}
                    icon={() => (
                        <svg className="w-6 h-6 sm:w-8 sm:h-8 text-white" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 12a4 4 0 100-8 4 4 0 000 8zm-8 7v-1c0-3.33 4.69-5 8-5s8 1.67 8 5v1H4z" /></svg>
                    )}
                />
            </div>

            {/* Enhanced Tab Navigation */}
            <div className="relative mb-8 mx-4 md:mx-6">
                <div className="rounded-2xl p-2 shadow-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                    <div className="inline-flex rounded-xl bg-white dark:bg-gray-800 p-1">
                        <button
                            type="button"
                            onClick={() => setActiveTab('record')}
                            className={`px-6 py-3 text-sm font-semibold rounded-lg transition-all duration-200 flex items-center gap-2 ${activeTab === 'record'
                                ? 'bg-blue-600 text-white'
                                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                        >
                            <FaUsers className="w-4 h-4" />
                            Customer Records
                            <span className="ml-2 px-2 py-1 text-xs bg-white/20 text-white rounded-full">
                                {customers.length}
                            </span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('knowledgebase')}
                            className={`px-6 py-3 text-sm font-semibold rounded-lg transition-all duration-200 flex items-center gap-2 ${activeTab === 'knowledgebase'
                                ? 'bg-blue-600 text-white'
                                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                        >
                            <FaFolder className="w-4 h-4" />
                            Knowledge Base
                            <span className="ml-2 px-2 py-1 text-xs bg-white/20 text-white rounded-full">
                                Docs
                            </span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('faq')}
                            className={`px-6 py-3 text-sm font-semibold rounded-lg transition-all duration-200 flex items-center gap-2 ${activeTab === 'faq'
                                ? 'bg-blue-600 text-white'
                                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                        >
                            <FaEdit className="w-4 h-4" />
                            FAQ
                            <span className="ml-2 px-2 py-1 text-xs bg-white/20 text-white rounded-full">
                                {faqFiles.length}
                            </span>
                        </button>
                    </div>
                </div>
            </div>
            {/* Tab Content */}
            {activeTab === 'record' && (
                <div className="pb-8">
                    {/* Enhanced Control Bar */}
                    <div className="mb-8 mx-4 md:mx-6">
                        <div className="rounded-2xl p-6 shadow-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                            <div>
                                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                                    {/* Search Section */}
                                    <div className="flex-1 max-w-md">
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                <FaSearch className="h-4 w-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                                            </div>
                                            <input
                                                type="text"
                                                value={searchQuery}
                                                onChange={e => setSearchQuery(e.target.value)}
                                                placeholder={
                                                    showFilterPlaceholder ? (
                                                        filterType === 'customer_id' ? 'Search by Customer ID' :
                                                            filterType === 'full_name' ? 'Search by Name' :
                                                                filterType === 'email' ? 'Search by Email' :
                                                                    filterType === 'phone' ? 'Search by Mobile No' :
                                                                        filterType === 'company' ? 'Search by Company' :
                                                                            filterType === 'industry' ? 'Search by Industry' :
                                                                                filterType === 'status' ? 'Search by Status' :
                                                                                    filterType === 'account_manager' ? 'Search by Account Manager' :
                                                                                        filterType === 'country' ? 'Search by Country' :
                                                                                            'Search by'
                                                    ) : 'Search by customer ID, name, email, phone, company, industry, status, account manager, or country'
                                                }
                                                className="w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-sm"
                                            />
                                            {searchQuery && (
                                                <button
                                                    onClick={() => setSearchQuery("")}
                                                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                                >
                                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Actions Section */}
                                    <div className="flex flex-wrap items-center gap-3">
                                        {/* Filter Button */}
                                        <button
                                            onClick={() => {
                                                setIsFilterButtonClicked(true);
                                                setShowFilterDropdown(v => !v);
                                                setTimeout(() => setIsFilterButtonClicked(false), 100);
                                            }}
                                            data-filter-button
                                            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm transition-all duration-200"
                                        >
                                            <FaFilter className="h-4 w-4" />
                                            <span className="font-medium">Filters</span>
                                            <FaChevronDown className={`ml-1 transition-transform ${showFilterDropdown ? 'rotate-180' : ''}`} />
                                        </button>

                                        {/* View Toggle */}
                                        <button
                                            onClick={() => setIsMobileView(!isMobileView)}
                                            className="flex items-center gap-2 px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-xl shadow-sm transition-all duration-200"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                {isMobileView ? (
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                                                ) : (
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                                                )}
                                            </svg>
                                            <span className="font-medium">{isMobileView ? 'Table View' : 'Card View'}</span>
                                        </button>

                                        {/* Add Customer Button */}
                                        <button
                                            onClick={() => setShowAddModal(true)}
                                            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm transition-all duration-200"
                                        >
                                            <FaPlus className="h-4 w-4" />
                                            <span className="font-medium">Add Customer</span>
                                        </button>

                                        {/* Upload Button */}
                                        <button
                                            onClick={() => setShowCustomerUploadModal(true)}
                                            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm transition-all duration-200"
                                        >
                                            <FaUpload className="h-4 w-4" />
                                            <span className="font-medium">Upload</span>
                                        </button>
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            onChange={handleFileChange}
                                            className="hidden"
                                            accept=".xlsx,.xls,.csv"
                                        />

                                        {/* Download Button */}
                                        <button
                                            onClick={handleDownloadListData}
                                            disabled={customers.length === 0}
                                            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <FaDownload className="h-4 w-4" />
                                            <span className="font-medium">Download</span>
                                        </button>

                                        {/* Refresh Button */}
                                        <button
                                            onClick={handleRefresh}
                                            disabled={isLoading}
                                            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm transition-all duration-200 disabled:opacity-50"
                                        >
                                            <FaSync className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                                            <span className="font-medium">Refresh</span>
                                        </button>

                                        {/* Bulk Delete Button */}
                                        {selectedCustomerIds.length > 0 && (
                                            <button
                                                onClick={() => setShowBulkDeleteConfirm(true)}
                                                disabled={deleting}
                                                className="group relative overflow-hidden flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl shadow-lg hover:shadow-xl hover:shadow-red-500/25 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-all duration-300 hover:-translate-y-1 disabled:opacity-50"
                                            >
                                                <div className="absolute inset-0 bg-gradient-to-r from-red-400 to-red-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                                <FaTrash className="h-4 w-4 relative z-10 group-hover:scale-110 transition-transform" />
                                                <span className="font-medium relative z-10">Delete ({selectedCustomerIds.length})</span>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    {/* Enhanced Filter Dropdown */}
                    {showFilterDropdown && (
                        <div className="mb-8 mx-4 md:mx-6">
                            <div className="bg-gradient-to-br from-white via-white to-gray-50/30 dark:from-gray-800 dark:via-gray-800 dark:to-gray-900/50 rounded-2xl p-6 shadow-xl border-0 overflow-hidden backdrop-blur-sm relative">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-full -translate-y-16 translate-x-16"></div>
                                <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 rounded-full translate-y-12 -translate-x-12"></div>
                                <div className="relative z-10">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="w-10 h-10 bg-gradient-to-br from-purple-100 to-indigo-100 dark:from-purple-900/30 dark:to-indigo-900/30 rounded-xl flex items-center justify-center">
                                            <FaFilter className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Advanced Filters</h3>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">Refine your customer search with powerful filtering options</p>
                                        </div>
                                    </div>

                                    <div ref={filterDropdownRef} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        {/* Search By */}
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Search By</label>
                                            <div className="relative">
                                                <select
                                                    className="w-full pl-3 pr-10 py-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-sm appearance-none cursor-pointer"
                                                    value={filterType}
                                                    onChange={e => {
                                                        setFilterType(e.target.value as typeof filterType);
                                                        setShowFilterPlaceholder(true);
                                                    }}
                                                >
                                                    <option value="customer_id">Customer ID</option>
                                                    <option value="full_name">Name</option>
                                                    <option value="email">Email</option>
                                                    <option value="phone">Mobile No</option>
                                                    <option value="company">Company</option>
                                                    <option value="industry">Industry</option>
                                                    <option value="status">Status</option>
                                                    <option value="account_manager">Account Manager</option>
                                                    <option value="country">Country</option>
                                                </select>
                                                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                                    <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                    </svg>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Time Frame */}
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Time Frame</label>
                                            <div className="relative">
                                                <select
                                                    className="w-full pl-3 pr-10 py-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-sm appearance-none cursor-pointer"
                                                    value={timeFrame}
                                                    onChange={e => setTimeFrame(e.target.value as typeof timeFrame)}
                                                >
                                                    <option value="all">All Time</option>
                                                    <option value="today">Today</option>
                                                    <option value="this_week">This Week</option>
                                                    <option value="custom">Custom Range</option>
                                                </select>
                                                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                                    <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                    </svg>
                                                </div>
                                            </div>
                                            {timeFrame === 'custom' && (
                                                <div className="mt-3">
                                                    <DateRangePicker
                                                        value={[customStartDate, customEndDate]}
                                                        onChange={(dates) => {
                                                            setCustomStartDate(dates[0]);
                                                            setCustomEndDate(dates[1]);
                                                        }}
                                                    />
                                                </div>
                                            )}
                                        </div>

                                        {/* Sort By */}
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Sort By</label>
                                            <div className="relative">
                                                <select
                                                    className="w-full pl-3 pr-10 py-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-sm appearance-none cursor-pointer"
                                                    value={sortOption}
                                                    onChange={e => setSortOption(e.target.value as typeof sortOption)}
                                                >
                                                    <option value="created_at_desc">Newest First</option>
                                                    <option value="created_at_asc">Oldest First</option>
                                                    <option value="full_name_asc">Name (A-Z)</option>
                                                    <option value="full_name_desc">Name (Z-A)</option>
                                                    <option value="email_asc">Email (A-Z)</option>
                                                    <option value="email_desc">Email (Z-A)</option>
                                                    <option value="company_asc">Company (A-Z)</option>
                                                    <option value="company_desc">Company (Z-A)</option>
                                                    <option value="industry_asc">Industry (A-Z)</option>
                                                    <option value="industry_desc">Industry (Z-A)</option>
                                                    <option value="status_asc">Status (A-Z)</option>
                                                    <option value="status_desc">Status (Z-A)</option>
                                                </select>
                                                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                                    <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                    </svg>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    {/* Content Area */}
                    <div className="mx-4 md:mx-6">
                        <div className="bg-gradient-to-br from-white via-white to-gray-50/30 dark:from-gray-800 dark:via-gray-800 dark:to-gray-900/50 rounded-2xl shadow-xl border-0 overflow-hidden backdrop-blur-sm relative">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 rounded-full -translate-y-16 translate-x-16"></div>
                            <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-full translate-y-12 -translate-x-12"></div>
                            <div className="relative z-10">
                                {isLoading ? (
                                    <div className="flex items-center justify-center py-16">
                                        <div className="flex flex-col items-center gap-4">
                                            <Loader />
                                            <p className="text-gray-500 dark:text-gray-400">Loading customers...</p>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        {/* Mobile Card View */}
                                        {isMobileView ? (
                                            <div className="p-6">
                                                {customers.length === 0 ? (
                                                    <div className="text-center py-16">
                                                        <div className="flex flex-col items-center justify-center">
                                                            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
                                                                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                                                </svg>
                                                            </div>
                                                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No customers found</h3>
                                                            <p className="text-gray-500 dark:text-gray-400 mb-4">
                                                                No data found matching your criteria. Try adjusting your filters or search terms.
                                                            </p>
                                                            <Button
                                                                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
                                                                onClick={() => setShowAddModal(true)}
                                                            >
                                                                Add Customer
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-4">
                                                        {customers.map((customer) => (
                                                            <CustomerCard
                                                                key={customer.id}
                                                                customer={customer}
                                                                isExpanded={expandedRows.has(customer.customer_id)}
                                                                isSelected={selectedCustomerIds.includes(customer.customer_id)}
                                                                onSelectOne={handleSelectOne}
                                                                onDelete={(customerId) => setShowDeleteSingleModal({ open: true, customer_id: customerId })}
                                                                onToggleExpansion={toggleRowExpansion}
                                                                onProjectsClick={handleProjectsClick}
                                                            />
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            /* Desktop Table View */
                                            <div className="overflow-x-auto">
                                                <div className="min-w-[1400px]">
                                                    <Table className="border-collapse">
                                                        <TableHeader>
                                                            <TableRow className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                                                                <TableCell isHeader className="px-6 py-4 text-center">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={allSelected}
                                                                        onChange={handleSelectAll}
                                                                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                                                                    />
                                                                </TableCell>
                                                                <TableCell isHeader className="px-6 py-4 font-bold text-gray-800 dark:text-gray-200 text-start">
                                                                    <div className="flex items-center gap-2">
                                                                        <FaUsers className="w-4 h-4 text-blue-600" />
                                                                        Customer ID
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell isHeader className="px-6 py-4 font-bold text-gray-800 dark:text-gray-200 text-start">
                                                                    <div className="flex items-center gap-2">
                                                                        <FaEdit className="w-4 h-4 text-blue-600" />
                                                                        Name
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell isHeader className="px-6 py-4 font-bold text-gray-800 dark:text-gray-200 text-start">
                                                                    <div className="flex items-center gap-2">
                                                                        <FaCloud className="w-4 h-4 text-blue-600" />
                                                                        Email
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell isHeader className="px-6 py-4 font-bold text-gray-800 dark:text-gray-200 text-start">
                                                                    <div className="flex items-center gap-2">
                                                                        <FaClock className="w-4 h-4 text-blue-600" />
                                                                        Appointment
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell isHeader className="px-6 py-4 font-bold text-gray-800 dark:text-gray-200 text-start">
                                                                    <div className="flex items-center gap-2">
                                                                        <FaBell className="w-4 h-4 text-blue-600" />
                                                                        Phone Number
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell isHeader className="px-6 py-4 font-bold text-gray-800 dark:text-gray-200 text-start">Company</TableCell>
                                                                <TableCell isHeader className="px-6 py-4 font-bold text-gray-800 dark:text-gray-200 text-start">Industry</TableCell>
                                                                <TableCell isHeader className="px-6 py-4 font-bold text-gray-800 dark:text-gray-200 text-center">Projects</TableCell>
                                                                <TableCell isHeader className="px-6 py-4 font-bold text-gray-800 dark:text-gray-200 text-end">MRR ($)</TableCell>
                                                                <TableCell isHeader className="px-6 py-4 font-bold text-gray-800 dark:text-gray-200 text-center">Status</TableCell>
                                                                <TableCell isHeader className="px-6 py-4 font-bold text-gray-800 dark:text-gray-200 text-start">Account Manager</TableCell>
                                                                <TableCell isHeader className="px-6 py-4 font-bold text-gray-800 dark:text-gray-200 text-start">Last Order</TableCell>
                                                                <TableCell isHeader className="px-6 py-4 font-bold text-gray-800 dark:text-gray-200 text-start">Country</TableCell>
                                                                <TableCell isHeader className="px-6 py-4 font-bold text-gray-800 dark:text-gray-200 text-center">
                                                                    <div className="flex items-center gap-2 justify-center">
                                                                        <FaCog className="w-4 h-4 text-gray-600" />
                                                                        Actions
                                                                    </div>
                                                                </TableCell>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody className="divide-y divide-gray-100 dark:divide-gray-700">
                                                            {customers.length === 0 ? (
                                                                <TableRow>
                                                                    <TableCell colSpan={14} className="py-16 text-center">
                                                                        <div className="flex flex-col items-center justify-center">
                                                                            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
                                                                                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                                                                </svg>
                                                                            </div>
                                                                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No customers found</h3>
                                                                            <p className="text-gray-500 dark:text-gray-400 mb-4">
                                                                                No data found matching your criteria. Try adjusting your filters or search terms.
                                                                            </p>
                                                                            <Button
                                                                                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
                                                                                onClick={() => setShowAddModal(true)}
                                                                            >
                                                                                Add Customer
                                                                            </Button>
                                                                        </div>
                                                                    </TableCell>
                                                                </TableRow>
                                                            ) : (
                                                                customers.map((customer, index) => (
                                                                    <TableRow
                                                                        key={customer.id}
                                                                        className={`group hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 dark:hover:from-gray-800 dark:hover:to-gray-700 transition-all duration-300 ${index % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50/50 dark:bg-gray-800/50'
                                                                            }`}
                                                                    >
                                                                        <TableCell className="px-6 py-4 text-center">
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={selectedCustomerIds.includes(customer.customer_id)}
                                                                                onChange={() => handleSelectOne(customer.customer_id)}
                                                                                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                                                                            />
                                                                        </TableCell>
                                                                        <TableCell className="px-6 py-4">
                                                                            <div className="flex items-center gap-3">
                                                                                <div className="w-8 h-8 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-lg flex items-center justify-center">
                                                                                    <FaUsers className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                                                                </div>
                                                                                <span className="font-mono text-sm font-semibold text-gray-800 dark:text-gray-200">
                                                                                    {customer.customer_id}
                                                                                </span>
                                                                            </div>
                                                                        </TableCell>
                                                                        <TableCell className="px-6 py-4">
                                                                            <div className="flex items-center gap-3">
                                                                                <div className="w-10 h-10 bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 rounded-full flex items-center justify-center">
                                                                                    <span className="text-sm font-bold text-green-600 dark:text-green-400">
                                                                                        {customer.full_name.charAt(0).toUpperCase()}
                                                                                    </span>
                                                                                </div>
                                                                                <div className="flex-1 min-w-0">
                                                                                    <span className="font-semibold text-gray-900 dark:text-white block truncate" dangerouslySetInnerHTML={{ __html: insertLineBreak(customer.full_name) }} />
                                                                                    <span className="text-xs text-gray-500 dark:text-gray-400">Customer</span>
                                                                                </div>
                                                                            </div>
                                                                        </TableCell>
                                                                        <TableCell className="px-6 py-4">
                                                                            <div className="flex items-center gap-3">
                                                                                <div className="hidden" />
                                                                                <div className="flex-1 min-w-0">
                                                                                    <span
                                                                                        className="block truncate max-w-[200px] cursor-help font-medium text-gray-800 dark:text-gray-200"
                                                                                        title={customer.email}
                                                                                    >
                                                                                        {truncateEmail(customer.email, 20)}
                                                                                    </span>
                                                                                    <span className="text-xs text-gray-500 dark:text-gray-400">Email</span>
                                                                                </div>
                                                                            </div>
                                                                        </TableCell>
                                                                        <TableCell className="px-6 py-4">
                                                                            <button
                                                                                onClick={() => openAppointmentModal(customer)}
                                                                                className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border shadow whitespace-nowrap bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-200 transition-colors cursor-pointer"
                                                                                title={`Click to view ${customer.appointment_count || 0} appointment(s)`}
                                                                            >
                                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                                                </svg>
                                                                                {(customer.appointment_count || 0)} Appointments
                                                                            </button>
                                                                        </TableCell>
                                                                        <TableCell className="px-6 py-4">
                                                                            <div className="flex items-center gap-3">
                                                                                <div className="hidden" />
                                                                                <div className="flex-1 min-w-0">
                                                                                    <span className="font-mono text-sm font-semibold text-gray-800 dark:text-gray-200">
                                                                                        {customer.phone}
                                                                                    </span>

                                                                                </div>
                                                                            </div>
                                                                        </TableCell>
                                                                        <TableCell className="px-6 py-4"><span className="text-sm font-medium text-gray-800 dark:text-gray-200">{getDisplayValue(customer.company)}</span></TableCell>
                                                                        <TableCell className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{getDisplayValue(customer.industry)}</TableCell>
                                                                        <TableCell className="px-6 py-4 text-center">
                                                                            <button
                                                                                onClick={() => handleProjectsClick(
                                                                                    customer.customer_id,
                                                                                    customer.full_name,
                                                                                    customer.email,
                                                                                    customer.projects || 0
                                                                                )}
                                                                                className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline transition-colors duration-200 cursor-pointer px-2 py-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                                                                title="Click to view project details"
                                                                            >
                                                                                {customer.projects || 0}
                                                                            </button>
                                                                        </TableCell>
                                                                        <TableCell className="px-6 py-4 text-end text-sm font-semibold text-emerald-600 dark:text-emerald-400">{(customer.mrr || 0).toLocaleString()}</TableCell>
                                                                        <TableCell className="px-6 py-4 text-center">
                                                                            <span className={`${(customer.status || '') === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                                                                (customer.status || '') === 'inactive' ? 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400' :
                                                                                    (customer.status || '') === 'suspended' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                                                                        (customer.status || '') === 'prospect' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                                                                            'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
                                                                                } px-2 py-1 rounded-full text-xs font-semibold`}>{getDisplayValue(customer.status)}</span>
                                                                        </TableCell>
                                                                        <TableCell className="px-6 py-4 text-sm text-gray-800 dark:text-gray-200">{getDisplayValue(customer.account_manager)}</TableCell>
                                                                        <TableCell className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                                                                            {customer.last_order && customer.last_order !== null ? new Date(customer.last_order).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'No orders'}
                                                                        </TableCell>
                                                                        <TableCell className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{getDisplayValue(customer.country)}                                                                            </TableCell>
                                                                        <TableCell className="px-6 py-4 text-center">
                                                                            <div className="flex items-center justify-center gap-2">
                                                                                <button
                                                                                    title="Book appointment"
                                                                                    onClick={() => openCustomerBookModal(customer)}
                                                                                    className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/20 transition-all duration-200 hover:scale-110"
                                                                                >
                                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                                                    </svg>
                                                                                </button>
                                                                                <button
                                                                                    onClick={() => setShowDeleteSingleModal({ open: true, customer_id: customer.customer_id })}
                                                                                    className="group/btn relative overflow-hidden flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-lg shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
                                                                                >
                                                                                    <div className="absolute inset-0 bg-gradient-to-r from-red-400 to-red-500 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300"></div>
                                                                                    <FaTrash className="w-3 h-3 relative z-10 group-hover/btn:scale-110 transition-transform" />
                                                                                    <span className="text-xs font-medium relative z-10">Delete</span>
                                                                                </button>
                                                                            </div>
                                                                        </TableCell>
                                                                    </TableRow>
                                                                ))
                                                            )}
                                                        </TableBody>
                                                    </Table>
                                                </div>
                                            </div>
                                        )}

                                        {/* Pagination */}
                                        {customers.length > 0 && (
                                            <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-6 py-4">
                                                <Pagination
                                                    currentPage={page}
                                                    pageSize={rowsPerPage}
                                                    totalItems={totalRecords}
                                                    pageSizeOptions={[10, 30, 50, 100]}
                                                    onPageChange={(newPage) => setPage(newPage)}
                                                    onPageSizeChange={(newSize) => {
                                                        setRowsPerPage(newSize);
                                                        setPage(1);
                                                    }}
                                                    label="customers"
                                                />
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {(activeTab as string) === 'knowledgebase' && (
                <div className="p-8 text-center">
                    <CustomerPage />
                </div>
            )}
            {(activeTab as string) === 'faq' && (
                <div className="space-y-8 mx-4 md:mx-6">
                    {/* Enhanced FAQ Control Bar */}
                    <div className="bg-gradient-to-br from-white via-white to-gray-50/30 dark:from-gray-800 dark:via-gray-800 dark:to-gray-900/50 rounded-2xl p-6 shadow-xl border-0 overflow-hidden backdrop-blur-sm relative">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-full -translate-y-16 translate-x-16"></div>
                        <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 rounded-full translate-y-12 -translate-x-12"></div>
                        <div className="relative z-10">
                            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                                {/* FAQ Stats */}
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                                            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">FAQ Management</h3>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                                {faqFiles.length} FAQ file{faqFiles.length !== 1 ? 's' : ''} available
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* FAQ Actions */}
                                <div className="flex flex-wrap items-center gap-3">
                                    {/* Upload FAQ CSV */}
                                    <button
                                        className="group relative overflow-hidden flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-xl shadow-lg hover:shadow-xl hover:shadow-purple-500/25 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-all duration-300 hover:-translate-y-1"
                                        onClick={() => {
                                            const input = document.createElement('input');
                                            input.type = 'file';
                                            input.accept = '.csv,text/csv';
                                            input.onchange = async (e) => {
                                                const file = (e.target as HTMLInputElement).files?.[0];
                                                if (!file) return;

                                                // Validate file format for FAQ upload
                                                const allowedTypes = ['text/csv', 'application/csv'];
                                                const allowedExtensions = ['.csv'];
                                                const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));

                                                const isValidFormat = allowedTypes.includes(file.type) || allowedExtensions.includes(fileExtension);

                                                if (!isValidFormat) {
                                                    setAlert({
                                                        show: true,
                                                        variant: 'error',
                                                        title: 'Invalid File Format',
                                                        message: 'Only CSV files are allowed for FAQ uploads.'
                                                    });
                                                    setTimeout(() => setAlert((a: typeof alert) => ({ ...a, show: false })), 3000);
                                                    return;
                                                }

                                                try {
                                                    setFaqUploading(true);
                                                    const res = await uploadFaqCsv(file, FAQ_DIRECTORY, true);
                                                    setAlert({ show: true, variant: 'success', title: 'FAQ CSV Uploaded', message: (res?.message || 'Uploaded') + (res?.key ? ' (' + res.key + ')' : '') });
                                                    setTimeout(() => setAlert((a: typeof alert) => ({ ...a, show: false })), 3000);
                                                    await refreshFaqFiles();
                                                } catch (err) {
                                                    const msg = err instanceof Error ? err.message : 'Upload failed';
                                                    setAlert({ show: true, variant: 'error', title: 'Upload Failed', message: msg });
                                                    setTimeout(() => setAlert((a: typeof alert) => ({ ...a, show: false })), 3000);
                                                } finally {
                                                    setFaqUploading(false);
                                                }
                                            };
                                            input.click();
                                        }}
                                        disabled={faqUploading}
                                    >
                                        <div className="hidden"></div>
                                        {faqUploading ? <Loader /> : <FaUpload className="h-4 w-4 relative z-10 group-hover:scale-110 transition-transform" />}
                                        <span className="font-medium relative z-10">{faqUploading ? 'Uploading...' : 'Upload FAQ CSV'}</span>
                                    </button>

                                    {/* Download Template */}
                                    <button
                                        className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm transition-all duration-200"
                                        onClick={() => {
                                            const headers = ['question', 'answer'];
                                            const exampleRows = [
                                                ['What are your business hours?', 'We are open 9am-6pm Mon-Fri.'],
                                                ['How can I contact support?', 'Email support@example.com or call +1-555-0100.'],
                                            ];
                                            const csvContent = [headers, ...exampleRows]
                                                .map(row => row
                                                    .map(field => `"${String(field).replace(/"/g, '""')}"`)
                                                    .join(','))
                                                .join('\n');
                                            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                                            const url = URL.createObjectURL(blob);
                                            const link = document.createElement('a');
                                            link.href = url;
                                            link.download = 'customer_faq_template.csv';
                                            document.body.appendChild(link);
                                            link.click();
                                            document.body.removeChild(link);
                                            URL.revokeObjectURL(url);
                                        }}
                                    >
                                        <FaDownload className="h-4 w-4" />
                                        <span className="font-medium">Download Template</span>
                                    </button>

                                    {/* Refresh */}
                                    <button
                                        className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm transition-all duration-200"
                                        onClick={refreshFaqFiles}
                                        disabled={faqListLoading}
                                    >
                                        {faqListLoading ? <Loader /> : <FaSync className="h-4 w-4" />}
                                        <span className="font-medium">Refresh</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Enhanced FAQ File List */}
                    <div className="rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                        <div>
                            <div className="overflow-x-auto">
                                <div className="min-w-[700px]">
                                    <Table className="border-collapse">
                                        <TableHeader>
                                            <TableRow className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                                                <TableCell isHeader className="px-6 py-4 text-center">
                                                    <input
                                                        type="checkbox"
                                                        aria-label="Select all"
                                                        checked={isAllSelected}
                                                        onChange={toggleSelectAll}
                                                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                                                    />
                                                </TableCell>
                                                <TableCell isHeader className="px-6 py-4 font-bold text-gray-800 dark:text-gray-200 text-start">
                                                    <div className="flex items-center gap-2">
                                                        <FaEdit className="w-4 h-4 text-blue-600" />
                                                        Name
                                                    </div>
                                                </TableCell>
                                                <TableCell isHeader className="px-6 py-4 font-bold text-gray-800 dark:text-gray-200 text-start">
                                                    <div className="flex items-center gap-2">
                                                        <FaCog className="w-4 h-4 text-blue-600" />
                                                        Type
                                                    </div>
                                                </TableCell>
                                                <TableCell isHeader className="px-6 py-4 font-bold text-gray-800 dark:text-gray-200 text-start">
                                                    <div className="flex items-center gap-2">
                                                        <FaDatabase className="w-4 h-4 text-blue-600" />
                                                        Size
                                                    </div>
                                                </TableCell>
                                                <TableCell isHeader className="px-6 py-4 font-bold text-gray-800 dark:text-gray-200 text-start">
                                                    <div className="flex items-center gap-2">
                                                        <FaClock className="w-4 h-4 text-blue-600" />
                                                        Uploaded At
                                                    </div>
                                                </TableCell>
                                                <TableCell isHeader className="px-6 py-4 font-bold text-gray-800 dark:text-gray-200 text-center">
                                                    <div className="flex items-center gap-2 justify-center">
                                                        <FaCog className="w-4 h-4 text-gray-600" />
                                                        Actions
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody className="divide-y divide-gray-100 dark:divide-gray-700">
                                            {faqListLoading ? (
                                                <TableRow>
                                                    <TableCell colSpan={6} className="px-6 py-16 text-center">
                                                        <div className="flex flex-col items-center gap-4">
                                                            <Loader />
                                                            <p className="text-gray-500 dark:text-gray-400">Loading FAQ file...</p>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ) : faqFiles.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={6} className="px-6 py-16 text-center">
                                                        <div className="flex flex-col items-center justify-center">
                                                            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
                                                                <FaEdit className="text-gray-400" size={32} />
                                                            </div>
                                                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No FAQ file found</h3>
                                                            <p className="text-gray-500 dark:text-gray-400 mb-4">
                                                                No FAQ file found in {FAQ_DIRECTORY}. Upload some FAQ file to get started.
                                                            </p>
                                                            <button
                                                                className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm transition-all duration-200"
                                                                onClick={() => {
                                                                    const input = document.createElement('input');
                                                                    input.type = 'file';
                                                                    input.accept = '.csv,text/csv';
                                                                    input.click();
                                                                }}
                                                            >
                                                                <FaUpload className="h-4 w-4" />
                                                                <span className="font-medium">Upload FAQ CSV</span>
                                                            </button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                faqFiles.map((f, idx) => (
                                                    <TableRow
                                                        key={f.key}
                                                        className={`group hover:bg-gradient-to-r hover:from-purple-50 hover:to-indigo-50 dark:hover:from-gray-800 dark:hover:to-gray-700 transition-all duration-300 ${idx % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50/50 dark:bg-gray-800/50'
                                                            }`}
                                                    >
                                                        <TableCell className="px-6 py-4 text-center">
                                                            <input
                                                                type="checkbox"
                                                                aria-label={"Select " + f.filename}
                                                                checked={selectedFilenames.has(f.filename)}
                                                                onChange={() => toggleSelectOne(f.filename)}
                                                                className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500 dark:focus:ring-purple-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                                                            />
                                                        </TableCell>
                                                        <TableCell className="px-6 py-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                                                                    <FaEdit className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                                                </div>
                                                                <span className="text-blue-600 dark:text-blue-400 break-all font-medium">{f.filename}</span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="px-6 py-4">
                                                            <span className="px-2 py-1 text-xs font-semibold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full">
                                                                {getFileTypeFromName(f.filename)}
                                                            </span>
                                                        </TableCell>
                                                        <TableCell className="px-6 py-4 text-gray-600 dark:text-gray-400 font-mono text-sm">
                                                            {`${((f.size_bytes || 0) / 1024).toFixed(1)} KB`}
                                                        </TableCell>
                                                        <TableCell className="px-6 py-4 text-gray-600 dark:text-gray-400 text-sm">
                                                            {f.last_modified ? new Date(f.last_modified).toLocaleDateString('en-US', {
                                                                year: 'numeric',
                                                                month: 'short',
                                                                day: 'numeric',
                                                                hour: '2-digit',
                                                                minute: '2-digit'
                                                            }) : 'N/A'}
                                                        </TableCell>
                                                        <TableCell className="px-6 py-4 text-center">
                                                            <button
                                                                className="group/btn relative overflow-hidden flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-lg shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
                                                                onClick={() => setDeleteConfirm({ open: true, filename: f.filename })}
                                                            >
                                                                <div className="absolute inset-0 bg-gradient-to-r from-red-400 to-red-500 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300"></div>
                                                                <FaTrash className="w-3 h-3 relative z-10 group-hover/btn:scale-110 transition-transform" />
                                                                <span className="text-xs font-medium relative z-10">Delete</span>
                                                            </button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Enhanced Upload Confirmation Modal */}
            <Modal isOpen={showConfirmModal} onClose={handleCancelUpload}>
                <div className="relative overflow-hidden">
                    {/* Animated Background */}
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-900/20 dark:via-indigo-900/20 dark:to-purple-900/20"></div>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-400/20 to-indigo-400/20 dark:from-blue-500/20 dark:to-indigo-500/20 rounded-full blur-3xl"></div>
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-purple-400/20 to-pink-400/20 dark:from-purple-500/20 dark:to-pink-500/20 rounded-full blur-2xl"></div>

                    <div className="relative p-8 max-w-full w-[90vw] sm:w-[500px]">
                        {/* Header Section */}
                        <div className="text-center mb-8">
                            <div className="relative inline-block">
                                <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/25">
                                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                    </svg>
                                </div>
                                <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                </div>
                            </div>
                            <h3 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent mb-3">
                                Confirm Upload
                            </h3>
                            <p className="text-gray-600 dark:text-gray-400 text-lg">Ready to upload your file to the system?</p>
                        </div>

                        {/* File Preview Card */}
                        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-white/20 dark:border-gray-700/50 rounded-2xl p-6 mb-8 shadow-xl">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 rounded-xl flex items-center justify-center shadow-lg">
                                    <svg className="w-7 h-7 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-gray-900 dark:text-white text-lg truncate">{selectedFile?.name}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-sm text-gray-500 dark:text-gray-400">
                                            {selectedFile && selectedFile.size ? `${(selectedFile.size / 1024).toFixed(1)} KB` : ''}
                                        </span>
                                        <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-1 rounded-full font-medium">
                                            Ready
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex justify-center gap-4">
                            <button
                                onClick={handleCancelUpload}
                                className="group relative overflow-hidden flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white rounded-2xl shadow-lg hover:shadow-xl hover:shadow-gray-500/25 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all duration-300 hover:-translate-y-1"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-gray-400 to-gray-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                <svg className="w-5 h-5 relative z-10 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                <span className="font-semibold relative z-10">Cancel</span>
                            </button>
                            <button
                                onClick={handleConfirmUpload}
                                disabled={uploading}
                                className="group relative overflow-hidden flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-2xl shadow-lg hover:shadow-xl hover:shadow-blue-500/25 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-300 hover:-translate-y-1 disabled:transform-none disabled:opacity-50"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                {uploading ? (
                                    <>
                                        <Loader />
                                        <span className="font-semibold relative z-10">Uploading...</span>
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-5 h-5 relative z-10 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                        </svg>
                                        <span className="font-semibold relative z-10">Upload File</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </Modal>

            {/* Enhanced Delete Confirmation Modal */}
            <Modal isOpen={showDeleteSingleModal.open} onClose={() => setShowDeleteSingleModal({ open: false, customer_id: null })}>
                <div className="relative overflow-hidden">
                    {/* Animated Background */}
                    <div className="absolute inset-0 bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 dark:from-red-900/20 dark:via-orange-900/20 dark:to-yellow-900/20"></div>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-red-400/20 to-orange-400/20 dark:from-red-500/20 dark:to-orange-500/20 rounded-full blur-3xl"></div>
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-yellow-400/20 to-red-400/20 dark:from-yellow-500/20 dark:to-red-500/20 rounded-full blur-2xl"></div>

                    <div className="relative p-8 max-w-full w-[90vw] sm:w-[500px]">
                        {/* Header Section */}
                        <div className="text-center mb-8">
                            <div className="relative inline-block">
                                <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-red-500/25">
                                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </div>
                                <div className="absolute -top-1 -right-1 w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center animate-pulse">
                                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                </div>
                            </div>
                            <h3 className="text-3xl font-bold bg-gradient-to-r from-red-600 to-orange-600 dark:from-red-400 dark:to-orange-400 bg-clip-text text-transparent mb-3">
                                Delete Customer
                            </h3>
                            <p className="text-gray-600 dark:text-gray-400 text-lg">This action cannot be undone</p>
                        </div>

                        {/* Warning Card */}
                        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-red-200/50 dark:border-red-700/50 rounded-2xl p-6 mb-8 shadow-xl">
                            <div className="flex items-start gap-4">
                                <div className="w-14 h-14 bg-gradient-to-br from-red-100 to-orange-100 dark:from-red-900/30 dark:to-orange-900/30 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                                    <svg className="w-7 h-7 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
                                    </svg>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-semibold text-gray-900 dark:text-white text-lg mb-2">Permanent Deletion</h4>
                                    <p className="text-gray-600 dark:text-gray-400 mb-3">
                                        This customer and all associated data will be permanently removed from the system.
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 px-3 py-1 rounded-full font-medium">
                                            Irreversible
                                        </span>
                                        <span className="text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 px-3 py-1 rounded-full font-medium">
                                            No Recovery
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex justify-center gap-4">
                            <button
                                onClick={() => setShowDeleteSingleModal({ open: false, customer_id: null })}
                                className="group relative overflow-hidden flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white rounded-2xl shadow-lg hover:shadow-xl hover:shadow-gray-500/25 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all duration-300 hover:-translate-y-1"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-gray-400 to-gray-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                <svg className="w-5 h-5 relative z-10 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                <span className="font-semibold relative z-10">Cancel</span>
                            </button>
                            <button
                                onClick={() => handleDeleteSingle(showDeleteSingleModal.customer_id!)}
                                disabled={deleting}
                                className="group relative overflow-hidden flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-red-500 to-orange-600 hover:from-red-600 hover:to-orange-700 text-white rounded-2xl shadow-lg hover:shadow-xl hover:shadow-red-500/25 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-all duration-300 hover:-translate-y-1 disabled:transform-none disabled:opacity-50"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-red-400 to-orange-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                {deleting ? (
                                    <>
                                        <Loader />
                                        <span className="font-semibold relative z-10">Deleting...</span>
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-5 h-5 relative z-10 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                        <span className="font-semibold relative z-10">Delete Customer</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </Modal>
            <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)}>
                <CustomerDetailsForm
                    onSuccess={async () => {
                        setShowAddModal(false);
                        setAlert({ show: true, variant: 'success', title: 'Success!', message: 'Customer data added successfully!' });
                        await fetchAllCustomers(); // Refresh data after add
                        setTimeout(() => setAlert((a: typeof alert) => ({ ...a, show: false })), 3000);
                    }}
                    onError={(msg) => {
                        setAlert({ show: true, variant: 'error', title: 'Failed', message: msg });
                        setTimeout(() => setAlert((a: typeof alert) => ({ ...a, show: false })), 3000);
                    }}
                />
            </Modal>
            <Modal isOpen={showDownloadModal} onClose={() => setShowDownloadModal(false)}>
                <div className="relative overflow-hidden">
                    {/* Animated Background */}
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-900/20 dark:via-indigo-900/20 dark:to-purple-900/20"></div>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-400/20 to-indigo-400/20 dark:from-blue-500/20 dark:to-indigo-500/20 rounded-full blur-3xl"></div>
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-purple-400/20 to-pink-400/20 dark:from-purple-500/20 dark:to-pink-500/20 rounded-full blur-2xl"></div>

                    <div className="relative">
                        <DownloadEmployeeTemplate
                            form={downloadForm}
                            setForm={setDownloadForm}
                            onSubmit={handleDownload}
                            loading={isLoading}
                            title="Download Customers Data"
                        />
                    </div>
                </div>
            </Modal>
            <CustomerUploadModal
                isOpen={showCustomerUploadModal}
                onClose={() => setShowCustomerUploadModal(false)}
                onUploadSuccess={async (msg) => {
                    setShowCustomerUploadModal(false);
                    if (msg && msg.startsWith('File downloaded:')) {
                        setAlert({ show: true, variant: 'success', title: 'Download Successful!', message: msg });
                        setTimeout(() => setAlert((a: typeof alert) => ({ ...a, show: false })), 3000);
                    } else if (msg && msg.includes('uploaded')) {
                        setAlert({ show: true, variant: 'success', title: 'Upload Successful!', message: msg });
                        await fetchAllCustomers(); // Refresh data after upload
                        setTimeout(() => setAlert((a: typeof alert) => ({ ...a, show: false })), 3000);
                    }
                }}
                onError={(msg) => {
                    setShowCustomerUploadModal(false);
                    setAlert({ show: true, variant: 'error', title: 'Failed', message: msg });
                    setTimeout(() => setAlert((a: typeof alert) => ({ ...a, show: false })), 3000);
                }}
            />
            <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} newestOnTop closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover style={{ zIndex: 9999, top: 78 }} />
            {alert.show && (
                <Alert
                    variant={alert.variant}
                    title={alert.title}
                    message={alert.message}
                    showCloseButton={true}
                    onClose={() => setAlert(prev => ({ ...prev, show: false }))}
                />
            )}
            {/* Enhanced Bulk Delete Confirmation Modal */}
            <Modal isOpen={showBulkDeleteConfirm} onClose={() => setShowBulkDeleteConfirm(false)}>
                <div className="relative overflow-hidden">
                    {/* Animated Background */}
                    <div className="absolute inset-0 bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 dark:from-red-900/20 dark:via-orange-900/20 dark:to-yellow-900/20"></div>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-red-400/20 to-orange-400/20 dark:from-red-500/20 dark:to-orange-500/20 rounded-full blur-3xl"></div>
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-yellow-400/20 to-red-400/20 dark:from-yellow-500/20 dark:to-red-500/20 rounded-full blur-2xl"></div>

                    <div className="relative p-8 max-w-full w-[90vw] sm:w-[500px]">
                        {/* Header Section */}
                        <div className="text-center mb-8">
                            <div className="relative inline-block">
                                <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-red-500/25">
                                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </div>
                                <div className="absolute -top-1 -right-1 w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center animate-pulse">
                                    <span className="text-white font-bold text-xs">{selectedCustomerIds.length}</span>
                                </div>
                            </div>
                            <h3 className="text-3xl font-bold bg-gradient-to-r from-red-600 to-orange-600 dark:from-red-400 dark:to-orange-400 bg-clip-text text-transparent mb-3">
                                Bulk Delete
                            </h3>
                            <p className="text-gray-600 dark:text-gray-400 text-lg">
                                {selectedCustomerIds.length} customer{selectedCustomerIds.length !== 1 ? 's' : ''} selected for deletion
                            </p>
                        </div>

                        {/* Warning Card */}
                        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-red-200/50 dark:border-red-700/50 rounded-2xl p-6 mb-8 shadow-xl">
                            <div className="flex items-start gap-4">
                                <div className="w-14 h-14 bg-gradient-to-br from-red-100 to-orange-100 dark:from-red-900/30 dark:to-orange-900/30 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                                    <svg className="w-7 h-7 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
                                    </svg>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-semibold text-gray-900 dark:text-white text-lg mb-2">Mass Deletion Warning</h4>
                                    <p className="text-gray-600 dark:text-gray-400 mb-3">
                                        All {selectedCustomerIds.length} selected customers and their associated data will be permanently removed from the system.
                                    </p>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 px-3 py-1 rounded-full font-medium">
                                            {selectedCustomerIds.length} Items
                                        </span>
                                        <span className="text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 px-3 py-1 rounded-full font-medium">
                                            Irreversible
                                        </span>
                                        <span className="text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 px-3 py-1 rounded-full font-medium">
                                            No Recovery
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex justify-center gap-4">
                            <button
                                onClick={() => setShowBulkDeleteConfirm(false)}
                                className="group relative overflow-hidden flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white rounded-2xl shadow-lg hover:shadow-xl hover:shadow-gray-500/25 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all duration-300 hover:-translate-y-1"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-gray-400 to-gray-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                <svg className="w-5 h-5 relative z-10 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                <span className="font-semibold relative z-10">Cancel</span>
                            </button>
                            <button
                                onClick={handleBulkDelete}
                                disabled={deleting}
                                className="group relative overflow-hidden flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-red-500 to-orange-600 hover:from-red-600 hover:to-orange-700 text-white rounded-2xl shadow-lg hover:shadow-xl hover:shadow-red-500/25 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-all duration-300 hover:-translate-y-1 disabled:transform-none disabled:opacity-50"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-red-400 to-orange-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                {deleting ? (
                                    <>
                                        <Loader />
                                        <span className="font-semibold relative z-10">Deleting...</span>
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-5 h-5 relative z-10 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                        <span className="font-semibold relative z-10">
                                            Delete {selectedCustomerIds.length} Customer{selectedCustomerIds.length !== 1 ? 's' : ''}
                                        </span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </Modal>

            {/* Enhanced FAQ Delete Confirmation Modal */}
            <Modal isOpen={deleteConfirm.open} onClose={() => setDeleteConfirm({ open: false, filename: undefined })}>
                <div className="relative overflow-hidden">
                    {/* Animated Background */}
                    <div className="absolute inset-0 bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 dark:from-red-900/20 dark:via-orange-900/20 dark:to-yellow-900/20"></div>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-red-400/20 to-orange-400/20 dark:from-red-500/20 dark:to-orange-500/20 rounded-full blur-3xl"></div>
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-yellow-400/20 to-red-400/20 dark:from-yellow-500/20 dark:to-red-500/20 rounded-full blur-2xl"></div>

                    <div className="relative p-8 max-w-full w-[90vw] sm:w-[500px]">
                        {/* Header Section */}
                        <div className="text-center mb-8">
                            <div className="relative inline-block">
                                <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-red-500/25">
                                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </div>
                                <div className="absolute -top-1 -right-1 w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center animate-pulse">
                                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                </div>
                            </div>
                            <h3 className="text-3xl font-bold bg-gradient-to-r from-red-600 to-orange-600 dark:from-red-400 dark:to-orange-400 bg-clip-text text-transparent mb-3">
                                Delete FAQ File
                            </h3>
                            <p className="text-gray-600 dark:text-gray-400 text-lg">This action cannot be undone</p>
                        </div>

                        {/* File Preview Card */}
                        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-red-200/50 dark:border-red-700/50 rounded-2xl p-6 mb-8 shadow-xl">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 bg-gradient-to-br from-red-100 to-orange-100 dark:from-red-900/30 dark:to-orange-900/30 rounded-xl flex items-center justify-center shadow-lg">
                                    <svg className="w-7 h-7 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-semibold text-gray-900 dark:text-white text-lg mb-1 truncate">{deleteConfirm.filename}</h4>
                                    <p className="text-gray-600 dark:text-gray-400 mb-2">FAQ file will be permanently deleted</p>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 px-3 py-1 rounded-full font-medium">
                                            CSV File
                                        </span>
                                        <span className="text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 px-3 py-1 rounded-full font-medium">
                                            FAQ Data
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex justify-center gap-4">
                            <button
                                onClick={() => setDeleteConfirm({ open: false, filename: undefined })}
                                className="group relative overflow-hidden flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white rounded-2xl shadow-lg hover:shadow-xl hover:shadow-gray-500/25 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all duration-300 hover:-translate-y-1"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-gray-400 to-gray-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                <svg className="w-5 h-5 relative z-10 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                <span className="font-semibold relative z-10">Cancel</span>
                            </button>
                            <button
                                className="group relative overflow-hidden flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-red-500 to-orange-600 hover:from-red-600 hover:to-orange-700 text-white rounded-2xl shadow-lg hover:shadow-xl hover:shadow-red-500/25 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-all duration-300 hover:-translate-y-1"
                                onClick={async () => {
                                    if (!deleteConfirm.filename) return;
                                    try {
                                        await deleteFaqCsv(deleteConfirm.filename, FAQ_DIRECTORY);
                                        const next = new Set(selectedFilenames);
                                        next.delete(deleteConfirm.filename);
                                        setSelectedFilenames(next);
                                        await refreshFaqFiles();
                                        setAlert({ show: true, variant: 'success', title: 'Deleted', message: `${deleteConfirm.filename} removed.` });
                                        setTimeout(() => setAlert((a: typeof alert) => ({ ...a, show: false })), 2000);
                                    } catch (err) {
                                        const msg = err instanceof Error ? err.message : 'Delete failed';
                                        setAlert({ show: true, variant: 'error', title: 'Delete Failed', message: msg });
                                        setTimeout(() => setAlert((a: typeof alert) => ({ ...a, show: false })), 3000);
                                    } finally {
                                        setDeleteConfirm({ open: false, filename: undefined });
                                    }
                                }}
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-red-400 to-orange-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                <FaTrash className="h-5 w-5 relative z-10 group-hover:scale-110 transition-transform" />
                                <span className="font-semibold relative z-10">Delete File</span>
                            </button>
                        </div>
                    </div>
                </div>
            </Modal>

            {/* Order Details Page */}
            {showOrderDetails.show && (
                <div
                    className="fixed inset-0 z-50 overflow-hidden bg-white dark:bg-gray-900"
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        overflow: 'hidden'
                    }}
                >
                    <div
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                        onClick={() => {
                            setShowOrderDetails({ show: false, customerId: '', customerName: '', projectCount: 0 });
                        }}
                    />
                    <div
                        className="relative z-10 h-full w-full overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <OrderDetailsPage
                            customerId={showOrderDetails.customerId}
                            customerName={showOrderDetails.customerName}
                            projectCount={showOrderDetails.projectCount}
                            onBack={() => {
                                setShowOrderDetails({ show: false, customerId: '', customerName: '', projectCount: 0 });
                            }}
                        />
                    </div>
                </div>
            )}

            {/* Appointment Modal */}
            {showAppointmentModal && selectedCustomer && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                            <div className="flex items-center gap-3">
                                <FaCalendarAlt className="w-6 h-6 text-blue-600" />
                                <div>
                                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                                        Appointments for {selectedCustomer.full_name}
                                    </h2>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        {selectedCustomer.email}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={closeAppointmentModal}
                                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                            >
                                <FaTimes className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="p-6 overflow-y-auto max-h-[60vh]">
                            {loadingAppointments ? (
                                <div className="flex items-center justify-center py-8">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                    <span className="ml-3 text-gray-600 dark:text-gray-400">Loading appointments...</span>
                                </div>
                            ) : customerAppointments.length > 0 ? (
                                <div className="space-y-4">
                                    {customerAppointments.map((appointment) => (
                                        <div key={appointment.id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <FaCalendarAlt className="w-4 h-4 text-blue-600" />
                                                        <span className="font-semibold text-gray-900 dark:text-white">
                                                            {new Date(appointment.date).toLocaleDateString('en-GB', {
                                                                day: '2-digit',
                                                                month: 'short',
                                                                year: 'numeric'
                                                            })}
                                                        </span>
                                                        <FaClock className="w-4 h-4 text-gray-500" />
                                                        <span className="text-gray-600 dark:text-gray-300">
                                                            {appointment.time}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <span className="text-sm text-gray-600 dark:text-gray-400">Service:</span>
                                                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                                                            {appointment.service_name}
                                                        </span>
                                                    </div>
                                                    {appointment.reason && (
                                                        <div className="flex items-start gap-2">
                                                            <span className="text-sm text-gray-600 dark:text-gray-400">Reason:</span>
                                                            <span className="text-sm text-gray-900 dark:text-white">
                                                                {appointment.reason}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => openEditCustomerAppointmentModal(appointment)}
                                                        className="p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/20 transition-all duration-200"
                                                        title="Edit appointment"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                        </svg>
                                                    </button>
                                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${appointment.status === 'confirmed'
                                                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                                        : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                                        }`}>
                                                        {appointment.status}
                                                    </span>
                                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${appointment.source === 'customer'
                                                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                                                        : appointment.source === 'lead'
                                                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
                                                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                                                        }`}>
                                                        {appointment.source}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <FaCalendarAlt className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                                        No appointments found
                                    </h3>
                                    <p className="text-gray-500 dark:text-gray-400">
                                        This customer doesn&apos;t have any appointments yet.
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
                            <button
                                onClick={closeAppointmentModal}
                                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Book Appointment Modal */}
            {showCustomerBookModal && bookingCustomer && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-auto">
                        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
                            <div className="flex items-center gap-3">
                                <FaCalendarAlt className="w-5 h-5 text-blue-600" />
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Book appointment</h3>
                                    <p className="text-xs text-gray-500">Customer: {bookingCustomer.full_name} • {bookingCustomer.email}</p>
                                </div>
                            </div>
                            <button onClick={() => setShowCustomerBookModal(false)} className="p-2 text-gray-400 hover:text-gray-600"><FaTimes className="w-5 h-5" /></button>
                        </div>

                        <div className="p-5 grid grid-cols-1 gap-6">
                            <div className="space-y-3">
                                <label className="text-sm text-gray-600">Service</label>
                                <div className="w-full border rounded-lg px-3 py-2 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white">
                                    {customerServiceName || customerServices.find(s => s.id === customerServiceId)?.name || 'Loading...'}
                                </div>

                                <label className="text-sm text-gray-600">Select date</label>
                                <input
                                    readOnly
                                    value={custSelectedDate || ''}
                                    placeholder="Click to select date"
                                    onClick={() => setShowCustDatePicker(!showCustDatePicker)}
                                    className="w-full border rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white cursor-pointer"
                                />
                                {showCustDatePicker && (
                                    <div className="mt-2">
                                        <VisualCalendar
                                            onDateSelect={handleCustomerDatePick}
                                            availableDates={custAvailableDates}
                                            selectedDate={custSelectedDate}
                                            serviceName={customerServiceName || customerServices.find(s => s.id === customerServiceId)?.name}
                                            compact={true}
                                        />
                                    </div>
                                )}
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-sm text-gray-600">Available time slots</label>
                                    <select
                                        value={custSelectedSlotId}
                                        onChange={(e) => setCustSelectedSlotId(e.target.value)}
                                        className="w-full border rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    >
                                        <option value="" disabled>{custSelectedDate ? 'Select a time slot' : 'Please select a date first'}</option>
                                        {custDateSlots.map(s => (
                                            <option key={s.id} value={s.id}>{s.label}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Contact form fields */}
                                <div className="space-y-3 pt-2">
                                    <div>
                                        <label className="text-sm text-gray-600">Name *</label>
                                        <div className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white">
                                            {custName || bookingCustomer?.full_name || '-'}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-sm text-gray-600">Email *</label>
                                        <div className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white">
                                            {custEmail || bookingCustomer?.email || '-'}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-sm text-gray-600">Phone *</label>
                                        <div className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white">
                                            {custPhone || bookingCustomer?.phone || '-'}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-sm text-gray-600">Additional Notes</label>
                                        <textarea value={custNotes} onChange={(e) => setCustNotes(e.target.value)} rows={3} className="w-full border rounded-lg px-3 py-2 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white" placeholder="Any specific requirements or questions..." />
                                    </div>
                                </div>

                                <div className="flex gap-2 pt-1">
                                    <button
                                        onClick={submitCustomerBooking}
                                        disabled={!custSelectedSlotId || custSubmitting}
                                        className={`flex-1 px-4 py-3 rounded-lg text-white font-semibold disabled:opacity-50 ${custSubmitting ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'}`}
                                    >
                                        {custSubmitting ? 'Booking…' : 'Book Appointment'}
                                    </button>
                                    <button
                                        onClick={() => setShowCustomerBookModal(false)}
                                        className="px-4 py-3 rounded-lg bg-gray-200 text-gray-700 font-semibold"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Appointment Modal */}
            {showEditCustomerAppointmentModal && editingCustomerAppointment && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-auto">
                        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
                            <div className="flex items-center gap-3">
                                <FaCalendarAlt className="w-5 h-5 text-blue-600" />
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Edit appointment</h3>
                                    <p className="text-xs text-gray-500">Service: {editingCustomerAppointment.service_name}</p>
                                </div>
                            </div>
                            <button onClick={() => setShowEditCustomerAppointmentModal(false)} className="p-2 text-gray-400 hover:text-gray-600"><FaTimes className="w-5 h-5" /></button>
                        </div>

                        <div className="p-5 grid grid-cols-1 gap-6">
                            <div className="space-y-3">
                                <label className="text-sm text-gray-600">Service</label>
                                <div className="w-full border rounded-lg px-3 py-2 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white">
                                    {editingCustomerAppointment.service_name || 'N/A'}
                                </div>

                                <label className="text-sm text-gray-600">Select date</label>
                                <input
                                    readOnly
                                    value={editCustDate || ''}
                                    placeholder="Click to select date"
                                    onClick={() => !showCustCancelReason && setEditCustShowDatePicker(!editCustShowDatePicker)}
                                    disabled={showCustCancelReason}
                                    className={`w-full border rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${showCustCancelReason ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                                />
                                {editCustShowDatePicker && !showCustCancelReason && (
                                    <div className="mt-2">
                                        <VisualCalendar
                                            onDateSelect={handleEditCustomerDatePick}
                                            availableDates={editCustAvailableDates}
                                            selectedDate={editCustDate}
                                            serviceName={editingCustomerAppointment.service_name}
                                            compact={true}
                                        />
                                    </div>
                                )}
                            </div>
                            <div className="space-y-4">
                                {!showCustCancelReason && (
                                    <>
                                        <div>
                                            <label className="text-sm text-gray-600">Available time slots</label>
                                            <select
                                                value={editCustSelectedSlotId}
                                                onChange={(e) => setEditCustSelectedSlotId(e.target.value)}
                                                className="w-full border rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                            >
                                                <option value="" disabled>{editCustDate ? 'Select a time slot' : 'Please select a date first'}</option>
                                                {editCustDateSlots.map((s: FormattedSlot) => (
                                                    <option key={s.id} value={s.id}>{s.label}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="text-sm text-gray-600">Message/Notes</label>
                                            <textarea
                                                value={editCustNotes}
                                                onChange={(e) => setEditCustNotes(e.target.value)}
                                                rows={3}
                                                className="w-full border rounded-lg px-3 py-2 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                                                placeholder="Any additional notes..."
                                            />
                                        </div>
                                    </>
                                )}

                                {showCustCancelReason && (
                                    <div>
                                        <label className="text-sm text-gray-600">Cancellation Reason *</label>
                                        <textarea
                                            value={custCancelReason}
                                            onChange={(e) => setCustCancelReason(e.target.value)}
                                            rows={3}
                                            className="w-full border rounded-lg px-3 py-2 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                                            placeholder="Please provide a reason for cancellation..."
                                            required
                                        />
                                    </div>
                                )}

                                <div className="flex gap-2 pt-1">
                                    {!showCustCancelReason ? (
                                        <>
                                            <button
                                                onClick={submitUpdateCustomerAppointment}
                                                disabled={!editCustDate || !editCustSelectedSlotId || editCustSubmitting}
                                                className={`flex-1 px-4 py-3 rounded-lg text-white font-semibold disabled:opacity-50 ${editCustSubmitting ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'}`}
                                            >
                                                {editCustSubmitting ? 'Updating…' : 'Update Appointment'}
                                            </button>
                                            <button
                                                onClick={() => { setShowCustCancelReason(true); setEditCustShowDatePicker(false); }}
                                                className="px-4 py-3 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold"
                                            >
                                                Cancel Appointment
                                            </button>
                                            <button
                                                onClick={() => setShowEditCustomerAppointmentModal(false)}
                                                className="px-4 py-3 rounded-lg bg-gray-200 text-gray-700 font-semibold"
                                            >
                                                Close
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <button
                                                onClick={submitCancelCustomerAppointment}
                                                disabled={!custCancelReason.trim() || editCustSubmitting}
                                                className={`flex-1 px-4 py-3 rounded-lg text-white font-semibold disabled:opacity-50 ${editCustSubmitting ? 'bg-red-400' : 'bg-red-600 hover:bg-red-700'}`}
                                            >
                                                {editCustSubmitting ? 'Cancelling…' : 'Confirm Cancellation'}
                                            </button>
                                            <button
                                                onClick={() => { setShowCustCancelReason(false); setCustCancelReason(''); }}
                                                className="px-4 py-3 rounded-lg bg-gray-200 text-gray-700 font-semibold"
                                            >
                                                Back
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
