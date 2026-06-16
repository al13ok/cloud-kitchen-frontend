"use client";
// import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import PageHeader from "@/components/common/PageHeader";
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
import { FaUpload, FaSync, FaTrash, FaSearch, FaDownload } from "react-icons/fa";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import ManagerUploadModal from "./ManagerUploadModal";
import DownloadEmployeeTemplate from "@/components/popscreen/DownloadTemplate";
import ManagerDetailsForm from "./ManagerDetailsForm";
import { FaChevronDown } from 'react-icons/fa';
import Alert from '@/components/ui/alert/Alert';
import DateRangePicker from '@/components/DateRangePicker';
// Add date-fns for date calculations
import { startOfWeek, endOfWeek } from 'date-fns';
import * as XLSX from 'xlsx';
import ManagerKnowledgeBase from "./ManagerKnowledgeBase";
import { uploadFaqCsv } from "@/utils/api";
import { fetchFaqFiles } from "@/utils/api";
import { deleteFaqCsv } from "@/utils/api";
import Pagination from "@/components/tables/Pagination";
import Loader from "@/components/Loader";
import { FaFileAlt } from "react-icons/fa";

interface Manager {
  id: number;
  manager_id: string;
  full_name: string;
  email: string;
  phone: string;
  department: string;
  created_at: string;
}

// Utility function to insert a line break after 30 characters
function insertLineBreak(str: string, maxLen = 30) {
  if (!str) return '';
  if (str.length <= maxLen) return str;
  // Insert a <br/> after every maxLen characters
  const regex = new RegExp(`.{1,${maxLen}}`, 'g');
  return str.match(regex)?.join('<br/>') ?? str;
}

export default function ManagerPages() {
  const BASE_URL = (process.env.NEXT_PUBLIC_BACKEND_URL || 'https://py-mobiloitte.converiqo.ai').replace(/\/+$/, '');
  const [activeTab, setActiveTab] = useState<'record' | 'knowledgebase' | 'faq'>('record');
  const [managers, setManagers] = useState<Manager[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeFilters, setActiveFilters] = useState({
    manager_id: "",
    full_name: "",
    email: "",
    phone: "",
    department: "",
  });

  const [showDeleteSingleModal, setShowDeleteSingleModal] = useState<{ open: boolean; manager_id: string | null }>({ open: false, manager_id: null });
  const [deleting, setDeleting] = useState(false);
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10); // default 10
  const [total, setTotal] = useState(0);

  // Add Manager Modal State
  const [showAddModal, setShowAddModal] = useState(false);

  // Add filter type state
  const [filterType, setFilterType] = useState<'manager_id' | 'full_name' | 'email' | 'phone' | 'department'>('manager_id');
  const [showFilterPlaceholder, setShowFilterPlaceholder] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Download Manager Template Modal State
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [downloadForm, setDownloadForm] = useState({
    fileFormat: "csv",
    startDate: "",
    endDate: "",
    month: "",
    specificDate: "",
  });

  // Upload Modal State
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Success Alert State
  const [alert, setAlert] = useState<{ show: boolean; variant: 'success' | 'error'; title: string; message: string }>({ show: false, variant: 'success', title: '', message: '' });

  // Add at the top of ManagerPages component:
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [isFilterButtonClicked, setIsFilterButtonClicked] = useState(false);
  const filterDropdownRef = useRef<HTMLDivElement>(null);

  // Add responsive view state
  const [isMobileView, setIsMobileView] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Click-away handler for filter dropdown
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

  // Add state for new filter options
  const [timeFrame, setTimeFrame] = useState<'all' | 'today' | 'this_week' | 'custom'>('all');
  const [customStartDate, setCustomStartDate] = useState<Date | null>(null);
  const [customEndDate, setCustomEndDate] = useState<Date | null>(null);
  const [sortOption, setSortOption] = useState<'created_at_desc' | 'created_at_asc' | 'full_name_asc' | 'full_name_desc' | 'email_asc' | 'email_desc'>('created_at_desc');

  // Add allManagers state
  const [allManagers, setAllManagers] = useState<Manager[]>([]);

  // Manager FAQ states
  const [faqFiles, setFaqFiles] = useState<Array<{ filename: string; directory: string; full_path: string; key: string; size_bytes: number; last_modified: string }>>([]);
  const [faqListLoading, setFaqListLoading] = useState(false);
  const [selectedFilenames, setSelectedFilenames] = useState<Set<string>>(new Set());
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; filename?: string }>({ open: false });
  const FAQ_DIRECTORY = 'Manager_faq';

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
  function getFileTypeFromName(name: string) {
    const dot = name.lastIndexOf('.');
    if (dot >= 0) return name.substring(dot + 1).toUpperCase();
    return 'FILE';
  }

  // Load Manager FAQ files when FAQ tab becomes active
  useEffect(() => {
    async function loadFaqFiles() {
      if (activeTab !== 'faq') return;
      try {
        setFaqListLoading(true);
        const { files } = await fetchFaqFiles(FAQ_DIRECTORY);
        setFaqFiles(Array.isArray(files) ? files : []);
      } catch (e) {
        console.error('Failed to load Manager FAQ files', e);
      } finally {
        setFaqListLoading(false);
      }
    }
    loadFaqFiles();
  }, [activeTab]);

  const refreshFaqFiles = async () => {
    try {
      setFaqListLoading(true);
      const { files } = await fetchFaqFiles(FAQ_DIRECTORY);
      setFaqFiles(Array.isArray(files) ? files : []);
      setAlert({ show: true, variant: 'success', title: 'Refreshed', message: 'FAQ list refreshed.' });
      setTimeout(() => setAlert(a => ({ ...a, show: false })), 2000);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to refresh FAQ files';
      setAlert({ show: true, variant: 'error', title: 'Refresh Failed', message: msg });
      setTimeout(() => setAlert(a => ({ ...a, show: false })), 3000);
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
  const toggleRowExpansion = (hrId: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(hrId)) {
        newSet.delete(hrId);
      } else {
        newSet.add(hrId);
      }
      return newSet;
    });
  };

  // Mobile Card Component
  const ManagerCard = ({ manager }: { manager: Manager }) => {
    const isExpanded = expandedRows.has(manager.manager_id);
    const isSelected = selectedManagerIds.includes(manager.manager_id);

    return (
      <div className={`bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg mb-3 overflow-hidden transition-all duration-200 ${isSelected ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20' : ''
        }`}>
        {/* Card Header */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => handleSelectOne(manager.manager_id)}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
              />
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                  {manager.full_name}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  ID: {manager.manager_id}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="border-red-500 text-red-500 hover:bg-red-50 hover:border-red-600 px-2 py-1"
                onClick={() => setShowDeleteSingleModal({ open: true, manager_id: manager.manager_id })}
              >
                <FaTrash className="text-red-500 w-3 h-3" />
              </Button>
              <button
                onClick={() => toggleRowExpansion(manager.manager_id)}
                className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
              >
                <svg
                  className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
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
          <div className="px-4 pb-4 space-y-2">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="font-medium text-gray-600 dark:text-gray-400">Email:</span>
                <p className="text-gray-900 dark:text-white break-all">{manager.email}</p>
              </div>
              <div>
                <span className="font-medium text-gray-600 dark:text-gray-400">Phone:</span>
                <p className="text-gray-900 dark:text-white">{manager.phone}</p>
              </div>
            </div>
            <div>
              <span className="font-medium text-gray-600 dark:text-gray-400">Department:</span>
              <p className="text-gray-900 dark:text-white">{manager.department}</p>
            </div>
            <div>
              <span className="font-medium text-gray-600 dark:text-gray-400">Created:</span>
              <p className="text-gray-900 dark:text-white">
                {new Date(manager.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Auto-apply filters on change (reset page to 1)
  useEffect(() => {
    setPage(1);
    // You can add logic to update activeFilters or fetchManagers if needed
  }, [filterType, timeFrame, customStartDate, customEndDate, sortOption]);


  // Move fetchManagers to top-level with useCallback
  const fetchManagers = useCallback(async (setAllManagers: (data: Manager[]) => void, setTotal: (total: number) => void, setIsLoading: (loading: boolean) => void) => {
    setIsLoading(true);
    const params = new URLSearchParams();
    params.append("page", "1");
    params.append("size", "1000"); // fetch up to 1000 Managers
    try {
      const response = await fetch(
        `${BASE_URL}/api/v1/manager/?${params.toString()}`,
        {
          method: "GET",
          headers: { accept: "application/json" },
        },
      );
      if (response.ok) {
        const data = await response.json();
        setAllManagers(data.data || []);
        setTotal(data.total_records || 0);
      }
    } finally {
      setIsLoading(false);
    }
  }, [BASE_URL]);

  // Add this wrapper for the new fetchManagers
  const fetchAllManagers = useCallback(() => fetchManagers(setAllManagers, setTotal, setIsLoading), [fetchManagers]);

  // Replace useEffect for initial fetch and dependency updates
  useEffect(() => {
    fetchAllManagers();
  }, [fetchAllManagers, activeFilters, page, size, timeFrame, customStartDate, customEndDate, sortOption]);

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
    setFilterType('manager_id');
    setPage(1);
    setSize(10);
    setSelectedManagerIds([]);
  }, []);

  // Update frontend filtering useEffect to include all filters and pagination
  useEffect(() => {
    let filtered = [...allManagers];
    // Filter By and search
    if (searchQuery) {
      if (filterType && showFilterPlaceholder) {
        // Specific field search when filter is selected
        filtered = filtered.filter(manager => {
          const val = manager[filterType] ? String(manager[filterType]).toLowerCase() : '';
          return val.includes(searchQuery.toLowerCase());
        });
      } else {
        // Advanced global search across all fields when no specific filter is selected
        filtered = filtered.filter(manager => {
          const searchWords = searchQuery.toLowerCase().trim().split(/\s+/).filter(word => word.length > 0);

          if (searchWords.length === 0) return true;

          // Check if ANY word matches ANY field (solar search)
          return searchWords.some(word => {
            return (
              (manager.manager_id && manager.manager_id.toLowerCase().includes(word)) ||
              (manager.full_name && manager.full_name.toLowerCase().includes(word)) ||
              (manager.email && manager.email.toLowerCase().includes(word)) ||
              (manager.phone && manager.phone.toLowerCase().includes(word)) ||
              (manager.department && manager.department.toLowerCase().includes(word))
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
      filtered = filtered.filter(manager => {
        const created = new Date(manager.created_at);
        return created >= startOfDay && created <= endOfDay;
      });
    } else if (timeFrame === 'this_week') {
      const now = new Date();
      const weekStart = startOfWeek(now, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
      filtered = filtered.filter(manager => {
        const created = new Date(manager.created_at);
        return created >= weekStart && created <= weekEnd;
      });
    } else if (timeFrame === 'custom' && customStartDate && customEndDate) {
      filtered = filtered.filter(manager => {
        const created = new Date(manager.created_at);
        return created >= customStartDate && created <= customEndDate;
      });
    }
    // Sort By
    filtered.sort((a, b) => {
      switch (sortOption) {
        case 'created_at_desc':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'created_at_asc':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'full_name_asc':
          return a.full_name.localeCompare(b.full_name);
        case 'full_name_desc':
          return b.full_name.localeCompare(a.full_name);
        case 'email_asc':
          return a.email.localeCompare(b.email);
        case 'email_desc':
          return b.email.localeCompare(a.email);
        default:
          return 0;
      }
    });
    // Pagination
    const start = (page - 1) * size;
    const end = start + size;
    setManagers(filtered.slice(start, end));
    setTotal(filtered.length);
  }, [allManagers, filterType, searchQuery, timeFrame, customStartDate, customEndDate, sortOption, page, size, showFilterPlaceholder]);

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
        setTimeout(() => setAlert(a => ({ ...a, show: false })), 3000);
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }

      setSelectedFile(file);
      setShowConfirmModal(true);
    }
  };

  // Update handleConfirmUpload to await fetchAllManagers
  const handleConfirmUpload = async () => {
    if (selectedFile) {
      setUploading(true);
      const formData = new FormData();
      formData.append("file", selectedFile);

      try {
        const response = await fetch(
          `${BASE_URL}/api/v1/upload-manager/`,
          {
            method: "POST",
            body: formData,
          }
        );

        if (response.ok) {
          await fetchAllManagers();

          // Show success message
          setAlert({
            show: true,
            variant: 'success',
            title: 'Upload Successful!',
            message: `File uploaded: ${selectedFile.name}`
          });
          setTimeout(() => setAlert(a => ({ ...a, show: false })), 3000);
        } else {
          // Handle different error responses from backend
          let errorMessage = "Failed to upload Manager file. Please try again.";

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

            // Handle specific error cases for Manager
            if (errorMessage.includes("Missing required columns") ||
              errorMessage.includes("department") ||
              errorMessage.includes("manager_id") ||
              errorMessage.includes("email") ||
              errorMessage.includes("full_name")) {
              errorMessage = "Missing required columns: department, manager_id, email, full_name";
            } else if (errorMessage.includes("Unsupported file format") ||
              errorMessage.includes("file format")) {
              errorMessage = "Unsupported file format. Only CSV, XLS, and XLSX are allowed.";
            }
          } catch {
            // If we can't parse the error response, use the status text
            if (response.statusText) {
              errorMessage = `Upload failed: ${response.statusText}`;
            }
          }

          setAlert({
            show: true,
            variant: 'error',
            title: 'Upload Failed',
            message: errorMessage
          });
          setTimeout(() => setAlert(a => ({ ...a, show: false })), 3000);
        }
      } catch {
        setAlert({
          show: true,
          variant: 'error',
          title: 'Network Error',
          message: 'Network error. Please check your connection and try again.'
        });
        setTimeout(() => setAlert(a => ({ ...a, show: false })), 3000);
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

  // Refresh handler to clear search and filters
  const handleRefresh = () => {
    setPage(1);
    setSearchQuery('');
    setFilterType('manager_id');
    setShowFilterPlaceholder(false);
    setActiveFilters({ manager_id: '', full_name: '', email: '', phone: '', department: '' });

    // Reset filter section state
    setShowFilterDropdown(false);
    setTimeFrame('all');
    setCustomStartDate(null);
    setCustomEndDate(null);
    setSortOption('created_at_desc');
    setIsFilterButtonClicked(false);

    // Clear selected Managers
    setSelectedManagerIds([]);
  };

  // Optionally clear search input when filterType changes
  useEffect(() => {
    setSearchQuery('');
  }, [filterType]);

  // Only update activeFilters when searchQuery changes, NOT when filterType changes
  useEffect(() => {
    setActiveFilters(f => ({ ...f, [filterType]: searchQuery }));
  }, [searchQuery, filterType]);

  // Delete Single ---->
  const handleDeleteSingle = async (manager_id: string) => {
    setDeleting(true);
    try {
      const response = await fetch(`${BASE_URL}/api/v1/manager/${manager_id}/`, {
        method: "DELETE",
        headers: { "accept": "application/json" },
      });
      if (response.ok) {
        fetchAllManagers();
        setAlert({ show: true, variant: 'success', title: 'Delete Successful!', message: 'Manager deleted successfully.' }); // Show success alert in Action column
      } else {
        setAlert({ show: true, variant: 'error', title: 'Delete Failed', message: 'Failed to delete Manager.' }); // Show error alert in Action column
      }
      setTimeout(() => setAlert(a => ({ ...a, show: false })), 3000); // Hide alert after 3 seconds
    } finally {
      setDeleting(false);
      setShowDeleteSingleModal({ open: false, manager_id: null });
    }
  };

  const [selectedManagerIds, setSelectedManagerIds] = useState<string[]>([]);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

  // Select all handler
  const allSelected = managers.length > 0 && managers.every(manager => selectedManagerIds.includes(manager.manager_id));
  const handleSelectAll = () => {
    if (allSelected) {
      setSelectedManagerIds([]);
    } else {
      setSelectedManagerIds(managers.map(manager => manager.manager_id));
    }
  };
  // Select single handler
  const handleSelectOne = (manager_id: string) => {
    setSelectedManagerIds(ids => ids.includes(manager_id) ? ids.filter(id => id !== manager_id) : [...ids, manager_id]);
  };
  // Bulk delete handler
  const handleBulkDelete = async () => {
    setShowBulkDeleteConfirm(false);
    setDeleting(true);
    try {
      for (const manager_id of selectedManagerIds) {
        await fetch(`${BASE_URL}/api/v1/manager/${manager_id}/`, {
          method: "DELETE",
          headers: { "accept": "application/json" },
        });
      }
      fetchAllManagers();
      setSelectedManagerIds([]);
      setAlert({ show: true, variant: 'success', title: 'Delete Successful!', message: 'Selected Managers deleted.' });
      setTimeout(() => setAlert(a => ({ ...a, show: false })), 3000);
    } finally {
      setDeleting(false);
    }
  };

  // Download template handler
  const handleDownload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!downloadForm.fileFormat) return;
    const fileExt = downloadForm.fileFormat === 'csv' ? 'csv' : 'xlsx';
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const timestamp = `${pad(now.getDate())}-${pad(now.getMonth() + 1)}-${now.getFullYear()}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
    const fileName = `Manager_Records_${timestamp}.${fileExt}`;
    // Use only selected Managers if any, otherwise all filtered
    const exportData = (selectedManagerIds.length > 0
      ? managers.filter(manager => selectedManagerIds.includes(manager.manager_id))
      : managers
    ).map(({ id, manager_id, full_name, email, phone, department, created_at }) => ({ id, manager_id, full_name, email, phone, department, created_at }));
    if (exportData.length === 0) {
      setAlert({ show: true, variant: 'error', title: 'No Data', message: 'No data available to download.' });
      setTimeout(() => setAlert(a => ({ ...a, show: false })), 3000);
      return;
    }
    if (downloadForm.fileFormat === 'csv') {
      const header = Object.keys(exportData[0] || {}).join(',');
      const rows = exportData.map(row => Object.values(row).map(val => `"${String(val).replace(/"/g, '""')}"`).join(',')).join('\n');
      const csvContent = `${header}\n${rows}`;
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
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Managers');
      XLSX.writeFile(wb, fileName);
    }
    setShowDownloadModal(false);
    setAlert({ show: true, variant: 'success', title: 'Download Successful!', message: `File downloaded: ${fileName}` });
    setTimeout(() => setAlert(a => ({ ...a, show: false })), 3000);
  };



  return (
    <div className="pb-20">
      <PageHeader
        title="Manager"
        description="Manage Manager records, knowledge base, and FAQs."
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Manager" }]}
      />
      {/* <PageBreadcrumb pageTitle="Manager" /> */}
      {/* Tab Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-4">
        <ul className="flex flex-nowrap overflow-x-auto whitespace-nowrap -mb-px text-sm font-medium text-center text-gray-500 dark:text-gray-400 scrollbar-hide">
          <li className="me-2">
            <button
              className={`inline-flex items-center justify-center p-4 border-b-2 rounded-t-lg group ${activeTab === 'record'
                ? 'text-blue-600 border-blue-600 active dark:text-blue-500 dark:border-blue-500'
                : 'border-transparent hover:text-gray-600 hover:border-gray-300 dark:hover:text-gray-300'
                }`}
              onClick={() => setActiveTab('record')}
            >
              <svg className="w-4 h-4 me-2" fill="currentColor" viewBox="0 0 18 18">
                <path d="M6.143 0H1.857A1.857 1.857 0 0 0 0 1.857v4.286C0 7.169.831 8 1.857 8h4.286A1.857 1.857 0 0 0 8 6.143V1.857A1.857 1.857 0 0 0 6.143 0Zm10 0h-4.286A1.857 1.857 0 0 0 10 1.857v4.286C10 7.169 10.831 8 11.857 8h4.286A1.857 1.857 0 0 0 18 6.143V1.857A1.857 1.857 0 0 0 16.143 0Zm-10 10H1.857A1.857 1.857 0 0 0 0 11.857v4.286C0 17.169.831 18 1.857 18h4.286A1.857 1.857 0 0 0 8 16.143v-4.286A1.857 1.857 0 0 0 6.143 10Zm10 0h-4.286A1.857 1.857 0 0 0 10 11.857v4.286c0 1.026.831 1.857 1.857 1.857h4.286A1.857 1.857 0 0 0 18 16.143v-4.286A1.857 1.857 0 0 0 16.143 10Z" />
              </svg>
              Manager Records
            </button>
          </li>
          <li className="me-2">
            <button
              className={`inline-flex items-center justify-center p-4 border-b-2 rounded-t-lg group ${activeTab === 'knowledgebase'
                ? 'text-blue-600 border-blue-600 active dark:text-blue-500 dark:border-blue-500'
                : 'border-transparent hover:text-gray-600 hover:border-gray-300 dark:hover:text-gray-300'
                }`}
              onClick={() => setActiveTab('knowledgebase')}
            >
              <svg className="w-4 h-4 me-2" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 0a10 10 0 1 0 10 10A10.011 10.011 0 0 0 10 0Zm0 5a3 3 0 1 1 0 6 3 3 0 0 1 0-6Zm0 13a8.949 8.949 0 0 1-4.951-1.488A3.987 3.987 0 0 1 9 13h2a3.987 3.987 0 0 1 3.951 3.512A8.949 8.949 0 0 1 10 18Z" />
              </svg>
              Manager knowledge base
              <span className="relative group ml-2 inline-flex items-center">
                <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true"
                  onMouseEnter={() => window.scrollBy({ top: -100, behavior: 'smooth' })}
                >
                  <path fillRule="evenodd" d="M18 10A8 8 0 1 1 2 10a8 8 0 0 1 16 0ZM9 7a1 1 0 1 0 2 0 1 1 0 0 0-2 0Zm1 3a1 1 0 0 0-1 1v3a1 1 0 1 0 2 0v-3a1 1 0 0 0-1-1Z" clipRule="evenodd" />
                </svg>
                <span className="pointer-events-none absolute top-1/2 -translate-y-1/2 left-full ml-2 z-10 whitespace-nowrap rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-xs font-medium text-black dark:text-white opacity-0 group-hover:opacity-100 shadow-lg">
                  Knowledge Base: Detailed internal policies, manuals, and procedural guides.
                </span>
              </span>
            </button>
          </li>
          <li className="me-2">
            <button
              className={`inline-flex items-center justify-center p-4 border-b-2 rounded-t-lg group ${activeTab === 'faq'
                ? 'text-blue-600 border-blue-600 active dark:text-blue-500 dark:border-blue-500'
                : 'border-transparent hover:text-gray-600 hover:border-gray-300 dark:hover:text-gray-300'
                }`}
              onClick={() => setActiveTab('faq')}
            >
              <svg className="w-4 h-4 me-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z" />
              </svg>
              FAQ
              <span className="relative group ml-2 inline-flex items-center">
                <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true"
                  onMouseEnter={() => window.scrollBy({ top: -100, behavior: 'smooth' })}
                >
                  <path fillRule="evenodd" d="M18 10A8 8 0 1 1 2 10a8 8 0 0 1 16 0ZM9 7a1 1 0 1 0 2 0 1 1 0 0 0-2 0Zm1 3a1 1 0 0 0-1 1v3a1 1 0 1 0 2 0v-3a1 1 0 0 0-1-1Z" clipRule="evenodd" />
                </svg>
                <span className="pointer-events-none absolute top-1/2 -translate-y-1/2 left-full ml-2 z-10 whitespace-nowrap rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-xs font-medium text-black dark:text-white opacity-0 group-hover:opacity-100 shadow-lg">
                  FAQs: Quick answers to common workplace and system-related questions.
                </span>
              </span>
            </button>
          </li>
        </ul>
      </div>
      {/* Tab Content */}
      {activeTab === 'record' && (
        <React.Fragment>
          <div className="pb-8">
            <div className="mb-6 rounded-lg border border-stroke px-6 py-6 flex flex-col gap-4 bg-[#F2F4F7] dark:bg-[#131d2b]">
              {/* Responsive filter and action bar */}
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                {/* Filters: stack vertically on mobile, horizontally on md+ */}
                <div className="flex flex-col sm:flex-row sm:gap-4 flex-1">
                  {/* Search Section */}
                  <div className="flex flex-row flex-1 min-w-[220px] sm:basis-[70%] max-w-[400px] items-center">
                    <div className="relative w-full">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                        <FaSearch />
                      </span>
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder={
                          showFilterPlaceholder ? (
                            filterType === 'manager_id' ? 'Search by Manager ID' :
                              filterType === 'full_name' ? 'Search by Name' :
                                filterType === 'email' ? 'Search by Email' :
                                  filterType === 'phone' ? 'Search by Mobile No' :
                                    filterType === 'department' ? 'Search by Department' :
                                      'Search by'
                          ) : 'Search by'
                        }
                        className="pl-10 pr-3 py-2 bg-white border border-gray-300 rounded-[5px] font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-500 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white w-full transition-all duration-200 hover:bg-indigo-50 active:bg-indigo-100"
                        style={{ width: '100%' }}
                      />
                    </div>
                  </div>
                </div>
                {/* Actions: wrap and space on mobile, row on md+ */}
                <div className="flex flex-row flex-wrap gap-2 sm:gap-3 justify-start md:justify-end mt-2 md:mt-0">
                  {/* View Toggle Button */}
                  <Button
                    variant="outline"
                    className="flex items-center gap-2 w-auto"
                    onClick={() => setIsMobileView(!isMobileView)}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      {isMobileView ? (
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                      )}
                    </svg>
                    <span className="hidden sm:inline">
                      {isMobileView ? '' : ''}   {/* table view or card */}
                    </span>
                  </Button>
                  {/* Filter button is now the first in the actions bar */}
                  <Button
                    variant="outline"
                    className={`flex items-center gap-2 w-auto ${showFilterDropdown ? 'border-blue-500 bg-blue-50 text-blue-700' : ''}`}
                    data-filter-button
                    onClick={() => {
                      setIsFilterButtonClicked(true);
                      setShowFilterDropdown(v => !v);
                      // Reset the flag after a short delay to allow click-away to work
                      setTimeout(() => setIsFilterButtonClicked(false), 100);
                    }}
                  >
                    <span className="inline-flex items-center">
                      <svg width="25" height="25" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" ><path d="M3 4a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v2.382a1 1 0 0 1-.293.707l-6.414 6.414A1 1 0 0 0 14 14.414V19a1 1 0 0 1-1.447.894l-2-1A1 1 0 0 1 10 18v-3.586a1 1 0 0 0-.293-.707L3.293 7.09A1 1 0 0 1 3 6.382V4z" fill="currentColor"></path></svg>
                    </span>
                    <span className="hidden sm:inline">Filter</span>
                    <FaChevronDown className={`ml-auto text-gray-500 transition-transform ${showFilterDropdown ? 'rotate-180' : ''}`} />
                  </Button>
                  <Button
                    variant="outline"
                    className="flex items-center gap-2 w-auto"
                    onClick={() => setShowAddModal(true)}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                    <span className="hidden sm:inline">Add</span>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleRefresh}
                    className="flex items-center gap-2 w-auto"
                    disabled={isLoading}
                  >
                    {isLoading ? <Loader /> : <FaSync />}
                    <span className="hidden sm:inline">Refresh</span>
                  </Button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    accept=".xlsx,.xls,.csv"
                  />
                  <Button
                    variant="outline"
                    className="flex items-center gap-2 w-auto"
                    onClick={() => {
                      setDownloadForm(f => ({ ...f, fileFormat: "" }));
                      setShowDownloadModal(true);
                    }}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 4v12" /></svg>
                    <span className="hidden sm:inline">Download</span>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowUploadModal(true)}
                    className="flex items-center gap-2 w-auto"
                  >
                    <FaUpload />
                    <span className="hidden sm:inline">Upload</span>
                  </Button>
                  {selectedManagerIds.length > 0 && (
                    <Button
                      variant="outline"
                      className="flex items-center gap-2 border-red-500 text-red-500 hover:bg-red-50 hover:border-red-600 w-auto"
                      onClick={() => setShowBulkDeleteConfirm(true)}
                      disabled={deleting}
                    >
                      <FaTrash />
                      <span className="hidden sm:inline">Delete Selected</span>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
          {showFilterDropdown && (
            <div ref={filterDropdownRef} className="z-30 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 sm:p-6 flex flex-col gap-2 sm:gap-4 mb-4">
              <div className="flex flex-col md:flex-row gap-2 sm:gap-4">
                {/* Filter By */}
                <div className="flex-1 min-w-[140px]">
                  <label className="text-xs sm:text-sm font-semibold mb-1 block">Search By</label>
                  <select
                    className="w-full border border-gray-300 rounded-[5px] px-2 py-1 sm:px-3 sm:py-2 text-xs sm:text-sm dark:bg-gray-700 dark:text-white"
                    value={filterType}
                    onChange={e => {
                      setFilterType(e.target.value as typeof filterType);
                      setShowFilterPlaceholder(true);
                    }}
                  >
                    <option value="manager_id">Manager ID</option>
                    <option value="full_name">Name</option>
                    <option value="email">Email</option>
                    <option value="phone">Mobile No</option>
                    <option value="department">Department</option>
                  </select>
                </div>
                {/* Time Frame */}
                <div className="flex-1 min-w-[140px]">
                  <label className="text-xs sm:text-sm font-semibold mb-1 block">Time Frame</label>
                  <select
                    className="w-full border border-gray-300 rounded-[5px] px-2 py-1 sm:px-3 sm:py-2 text-xs sm:text-sm dark:bg-gray-700 dark:text-white"
                    value={timeFrame}
                    onChange={e => setTimeFrame(e.target.value as typeof timeFrame)}
                  >
                    <option value="all">All Time</option>
                    <option value="today">Today</option>
                    <option value="this_week">This Week</option>
                    <option value="custom">Custom Range</option>
                  </select>
                  {timeFrame === 'custom' && (
                    <div className="mt-2">
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
                {/* Sort By (combined) */}
                <div className="flex-1 min-w-[140px]">
                  <label className="text-xs sm:text-sm font-semibold mb-1 block">Sort By</label>
                  <select
                    className="w-full border border-gray-300 rounded-[5px] px-2 py-1 sm:px-3 sm:py-2 text-xs sm:text-sm dark:bg-gray-700 dark:text-white"
                    value={sortOption}
                    onChange={e => setSortOption(e.target.value as typeof sortOption)}
                  >
                    <option value="created_at_desc">Newest First</option>
                    <option value="created_at_asc">Oldest First</option>
                    <option value="full_name_asc">Name (A-Z)</option>
                    <option value="full_name_desc">Name (Z-A)</option>
                    <option value="email_asc">Email (A-Z)</option>
                    <option value="email_desc">Email (Z-A)</option>
                  </select>
                </div>
              </div>

            </div>
          )}
          {isLoading ? (
            <div className="text-center mt-10">
              <Loader />
            </div>
          ) : (
            <div className="mt-4">
              {/* Mobile Card View */}
              {isMobileView ? (
                <div className="space-y-3">
                  {managers.length === 0 ? (
                    <div className="text-center py-16">
                      <div className="flex flex-col items-center justify-center">
                        <span className="mt-2 text-xl font-semibold text-gray-500 dark:text-gray-400">
                          No data found matching your criteria.
                        </span>
                        <span className="text-sm text-gray-400 mt-1">
                          Try adjusting your filters or search terms.
                        </span>
                      </div>
                    </div>
                  ) : (
                    managers.map((manager) => (
                      <ManagerCard key={manager.manager_id} manager={manager} />
                    ))
                  )}
                </div>
              ) : (
                /* Desktop Table View */
                <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:bg-gray-900">
                  <div className="min-w-[700px]">
                    <Table className="border-collapse bg-white dark:bg-gray-900">
                      <TableHeader>
                        <TableRow className="bg-gray-100 dark:bg-gray-800">
                          <TableCell isHeader className="px-3 py-3 text-center">
                            <input type="checkbox" checked={allSelected} onChange={handleSelectAll} />
                          </TableCell>
                          <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 dark:text-gray-300 text-start text-theme-xs">Manager ID</TableCell>
                          <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 dark:text-gray-300 text-start text-theme-xs">Name</TableCell>
                          <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 dark:text-gray-300 text-start text-theme-xs">Email</TableCell>
                          <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 dark:text-gray-300 text-start text-theme-xs">Phone</TableCell>
                          <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 dark:text-gray-300 text-start text-theme-xs">Department</TableCell>
                          <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 dark:text-gray-300 text-start text-theme-xs">Action</TableCell>
                        </TableRow>
                      </TableHeader>
                      <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                        {managers.length === 0 ? (
                          <TableRow>
                            <TableCell className="py-16 text-center text-[1.1rem]" colSpan={7}>
                              <div className="flex flex-col items-center justify-center">
                                <span className="mt-2 text-xl font-semibold text-gray-500 dark:text-gray-400">
                                  No data found matching your criteria.
                                </span>
                                <span className="text-sm text-gray-400 mt-1">
                                  Try adjusting your filters or search terms.
                                </span>
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : (
                          managers.map((manager) => (
                            <React.Fragment key={manager.manager_id}>
                              <TableRow className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                <TableCell className="px-3 py-4 text-center">
                                  <input type="checkbox" checked={selectedManagerIds.includes(manager.manager_id)} onChange={() => handleSelectOne(manager.manager_id)} />
                                </TableCell>
                                <TableCell className="px-5 py-4 text-gray-500 text-start text-theme-sm dark:text-gray-400">{manager.manager_id}</TableCell>
                                <TableCell className="px-5 py-4 text-start">
                                  <span className="font-medium text-gray-800 text-theme-sm dark:text-white/90" dangerouslySetInnerHTML={{ __html: insertLineBreak(manager.full_name) }} />
                                </TableCell>
                                <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                                  <span dangerouslySetInnerHTML={{ __html: insertLineBreak(manager.email, 25) }} />
                                </TableCell>
                                <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">{manager.phone}</TableCell>
                                <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">{manager.department}</TableCell>
                                <TableCell className="px-4 py-3 text-start">
                                  <div className="flex items-center gap-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="border-red-500 text-red-500 hover:bg-red-50 hover:border-red-600"
                                      onClick={() => setShowDeleteSingleModal({ open: true, manager_id: manager.manager_id })}
                                    >
                                      <FaTrash className="text-red-500" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>

                            </React.Fragment>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
              <div className="h-4"></div>
              <div className="mt-6 pb-8 mb-8">
                <Pagination
                  currentPage={page}
                  pageSize={size}
                  totalItems={total}
                  pageSizeOptions={[10, 30, 50, 100]}
                  onPageChange={(newPage) => setPage(newPage)}
                  onPageSizeChange={(newSize) => {
                    setSize(newSize);
                    setPage(1);
                  }}
                  label="Managers"
                />
              </div>
            </div>
          )}
        </React.Fragment>
      )}
      {activeTab === 'knowledgebase' && (
        <div className="p-8 text-center">
          <ManagerKnowledgeBase />
        </div>
      )}
      {activeTab === 'faq' && (
        <div className="p-8 text-center">
          <div className="mb-6 rounded-lg border border-stroke px-6 py-6 flex flex-col gap-4 bg-[#F2F4F7] dark:bg-[#131d2b]">
            <div className="flex flex-wrap justify-end gap-3">
              <div className="flex items-center space-x-2 mr-auto">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {faqFiles.length} FAQ file{faqFiles.length !== 1 ? 's' : ''} found
                </span>
              </div>
              <Button className="flex items-center gap-2 bg-[#3641F5] text-white" variant="primary" onClick={() => {
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
                    setTimeout(() => setAlert(a => ({ ...a, show: false })), 3000);
                    return;
                  }

                  try {
                    const res = await uploadFaqCsv(file, FAQ_DIRECTORY);
                    setAlert({ show: true, variant: 'success', title: 'FAQ CSV Uploaded', message: `${res?.message || 'Uploaded'}${res?.key ? ` (${res.key})` : ''}` });
                    setTimeout(() => setAlert(a => ({ ...a, show: false })), 3000);
                    await refreshFaqFiles();
                  } catch (err) {
                    const msg = err instanceof Error ? err.message : 'Upload failed';
                    setAlert({ show: true, variant: 'error', title: 'Upload Failed', message: msg });
                    setTimeout(() => setAlert(a => ({ ...a, show: false })), 2000);
                  }
                };
                input.click();
              }}>
                Upload FAQ CSV <FaUpload />
              </Button>
              <Button
                className="flex items-center gap-2 dark:bg-[#24303F]"
                variant="outline"
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
                  link.download = 'hr_faq_template.csv';
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                  URL.revokeObjectURL(url);
                }}
              >
                Download Template <FaDownload />
              </Button>
              <Button
                className="flex items-center gap-2 dark:bg-[#24303F]"
                variant="outline"
                onClick={refreshFaqFiles}
                disabled={faqListLoading}
              >
                {faqListLoading ? 'Refreshing...' : 'Refresh'} <FaSync />
              </Button>
            </div>

            {/* Manager FAQ Files List (inside the same container) */}
            <div className="text-left">
              <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:bg-gray-900 shadow-lg dark:border-gray-700">
                <Table className="border-collapse">
                  <TableHeader>
                    <TableRow className="bg-gray-100 dark:bg-gray-800">
                      <TableCell isHeader className="px-3 py-3 font-bold text-start border-b border-gray-200 dark:border-gray-700">
                        <input type="checkbox" aria-label="Select all" checked={isAllSelected} onChange={toggleSelectAll} />
                      </TableCell>
                      <TableCell isHeader className="px-5 py-3 font-bold text-gray-700 dark:text-gray-200 text-start border-b border-gray-200 dark:border-gray-700">Name</TableCell>
                      <TableCell isHeader className="px-5 py-3 font-bold text-gray-700 dark:text-gray-200 text-start border-b border-gray-200 dark:border-gray-700">Type</TableCell>
                      <TableCell isHeader className="px-5 py-3 font-bold text-gray-700 dark:text-gray-200 text-start border-b border-gray-200 dark:border-gray-700">Size</TableCell>
                      <TableCell isHeader className="px-5 py-3 font-bold text-gray-700 dark:text-gray-200 text-start border-b border-gray-200 dark:border-gray-700">Uploaded At</TableCell>
                      <TableCell isHeader className="px-4 py-3 font-bold text-gray-700 dark:text-gray-200 text-start border-b border-gray-200 dark:border-gray-700">Actions</TableCell>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {faqListLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="px-5 py-8 text-center">
                          <div className="flex flex-col items-center">
                            <Loader />
                            <span className="text-gray-500 dark:text-gray-400 mt-2">Loading FAQ files...</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : faqFiles.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="px-5 py-8 text-center">
                          <div className="flex flex-col items-center">
                            <FaFileAlt className="text-gray-400 mb-2" size={32} />
                            <span className="text-gray-500 dark:text-gray-400">No FAQ files found in {FAQ_DIRECTORY}.</span>
                            <span className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                              Upload some FAQ files to get started
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      faqFiles.map((f, idx) => (
                        <TableRow key={f.key} className={idx % 2 === 0 ? "bg-white dark:bg-gray-800" : "bg-gray-50 dark:bg-gray-700"}>
                          <TableCell className="px-3 py-4 text-start border-b border-gray-100 dark:border-gray-700">
                            <input
                              type="checkbox"
                              aria-label={`Select ${f.filename}`}
                              checked={selectedFilenames.has(f.filename)}
                              onChange={() => toggleSelectOne(f.filename)}
                            />
                          </TableCell>
                          <TableCell className="px-5 py-4 text-start border-b border-gray-100 dark:border-gray-700">
                            <div className="flex items-center gap-3">
                              <span className="text-blue-600 dark:text-blue-400 break-all">{f.filename}</span>
                            </div>
                          </TableCell>
                          <TableCell className="px-5 py-4 text-start border-b border-gray-100 dark:border-gray-700">{getFileTypeFromName(f.filename)}</TableCell>
                          <TableCell className="px-5 py-4 text-start border-b border-gray-100 dark:border-gray-700">{`${(f.size_bytes / 1024).toFixed(1)} KB`}</TableCell>
                          <TableCell className="px-5 py-4 text-start border-b border-gray-100 dark:border-gray-700">{new Date(f.last_modified).toLocaleString()}</TableCell>
                          <TableCell className="px-4 py-3 text-start border-b border-gray-100 dark:border-gray-700">
                            <Button
                              variant="outline"
                              className="border-red-500 text-red-500 hover:bg-red-50 hover:border-red-600 ml-2"
                              onClick={() => setDeleteConfirm({ open: true, filename: f.filename })}
                            >
                              <FaTrash className="text-red-500" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              {/* Removed under-table loader; loading is shown in a table row */}
            </div>
          </div>
        </div>
      )}
      <Modal isOpen={showConfirmModal} onClose={handleCancelUpload}>
        <div className="p-4 max-w-full w-[90vw] sm:w-[400px]">
          <h3 className="text-lg font-semibold mb-4">Confirm Upload</h3>
          <p>Are you sure you want to upload this file? {selectedFile?.name}</p>
          <div className="flex justify-end gap-3 mt-4">
            <Button onClick={handleCancelUpload} variant="outline">
              Cancel
            </Button>
            <Button onClick={handleConfirmUpload} disabled={uploading}>
              {uploading ? "Uploading..." : "Upload"}
            </Button>
          </div>
        </div>
      </Modal>
      {/* Delete Single Modal */}
      <Modal isOpen={showDeleteSingleModal.open} onClose={() => setShowDeleteSingleModal({ open: false, manager_id: null })}>
        <div className="p-6 max-w-full w-[90vw] sm:w-[400px] flex flex-col gap-4">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Delete Manager</h3>
          <p className="text-gray-700 dark:text-gray-300">Are you sure you want to delete this Manager? <br /> <span className="font-semibold text-red-600">This action cannot be undone.</span></p>
          <div className="flex justify-end gap-3 mt-4">
            <Button onClick={() => setShowDeleteSingleModal({ open: false, manager_id: null })} variant="outline">Cancel</Button>
            <Button
              onClick={() => handleDeleteSingle(showDeleteSingleModal.manager_id!)}
              disabled={deleting}
              className="bg-red-500 text-white"
            >
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </div>
      </Modal>
      {/* Add Manager Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)}>
        <ManagerDetailsForm onSuccess={async () => {
          setShowAddModal(false);
          await fetchAllManagers();
          setAlert({ show: true, variant: 'success', title: 'Success!', message: 'Manager data added successfully!' });
          setTimeout(() => setAlert(a => ({ ...a, show: false })), 3000);
        }} />
      </Modal>
      {alert.show && (
        <Alert
          variant={alert.variant}
          title={alert.title}
          message={alert.message}
          showCloseButton={true}
          onClose={() => setAlert({ ...alert, show: false })}
        />
      )}
      <Modal isOpen={showDownloadModal} onClose={() => setShowDownloadModal(false)}>
        <DownloadEmployeeTemplate
          form={downloadForm}
          setForm={setDownloadForm}
          onSubmit={handleDownload}
          loading={false}
        />
      </Modal>
      {/* Delete FAQ file confirmation */}
      <Modal isOpen={deleteConfirm.open} onClose={() => setDeleteConfirm({ open: false, filename: undefined })}>
        <div className="p-6 max-w-full w-[90vw] sm:w-[400px] flex flex-col gap-4">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Delete File</h3>
          <p className="text-gray-700 dark:text-gray-300">Are you sure you want to delete <span className="font-semibold">{deleteConfirm.filename}</span>? This action cannot be undone.</p>
          <div className="flex justify-end gap-3 mt-4">
            <Button onClick={() => setDeleteConfirm({ open: false, filename: undefined })} variant="outline">Cancel</Button>
            <Button
              className="bg-red-500 text-white"
              onClick={async () => {
                if (!deleteConfirm.filename) return;
                try {
                  await deleteFaqCsv(deleteConfirm.filename, FAQ_DIRECTORY);
                  const next = new Set(selectedFilenames);
                  next.delete(deleteConfirm.filename);
                  setSelectedFilenames(next);
                  await refreshFaqFiles();
                  setAlert({ show: true, variant: 'success', title: 'Deleted', message: `${deleteConfirm.filename} removed.` });
                  setTimeout(() => setAlert(a => ({ ...a, show: false })), 2000);
                } catch (err) {
                  const msg = err instanceof Error ? err.message : 'Delete failed';
                  setAlert({ show: true, variant: 'error', title: 'Delete Failed', message: msg });
                  setTimeout(() => setAlert(a => ({ ...a, show: false })), 3000);
                } finally {
                  setDeleteConfirm({ open: false, filename: undefined });
                }
              }}
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>
      <ManagerUploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onUploadSuccess={async (msg) => {
          setShowUploadModal(false);
          if (msg && msg.startsWith('File downloaded:')) {
            setAlert({ show: true, variant: 'success', title: 'Download Successful!', message: msg });
            setTimeout(() => setAlert(a => ({ ...a, show: false })), 3000);
          } else if (msg && msg.includes('uploaded')) {
            setAlert({ show: true, variant: 'success', title: 'Upload Successful!', message: msg });
            await fetchAllManagers();
            setTimeout(() => setAlert(a => ({ ...a, show: false })), 3000);
          }
        }}
        onError={(msg) => {
          setShowUploadModal(false);
          setAlert({ show: true, variant: 'error', title: 'Failed', message: msg });
          setTimeout(() => setAlert(a => ({ ...a, show: false })), 3000);
        }}
      />
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} newestOnTop closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover style={{ zIndex: 9999, top: 78 }} />
      {/* Bulk delete confirmation modal */}
      <Modal isOpen={showBulkDeleteConfirm} onClose={() => setShowBulkDeleteConfirm(false)}>
        <div className="p-6">
          <h2 className="text-lg font-bold mb-4">Confirm Delete</h2>
          <p>Are you sure you want to delete the selected Managers?</p>
          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={() => setShowBulkDeleteConfirm(false)}>Cancel</Button>
            <Button variant="outline" className="border-red-500 text-red-500" onClick={handleBulkDelete} disabled={deleting}>Delete</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}