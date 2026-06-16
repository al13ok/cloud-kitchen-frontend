"use client";
import React, { useEffect, useState, useRef } from "react";
import { Download, RefreshCw, Upload, X } from "lucide-react";
import flatpickr from "flatpickr";
import "flatpickr/dist/flatpickr.min.css";
// Inlined DateRangePicker component
type LocalDateRange = [Date | null, Date | null];
type DateRangePickerProps = {
  value?: LocalDateRange;
  onChange?: (dates: LocalDateRange) => void;
  onClose?: () => void;
};

// Helper function to format date in local timezone (YYYY-MM-DD)
const formatLocalDate = (date: Date | null): string => {
  if (!date || !(date instanceof Date)) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  value = [null, null],
  onChange,
  onClose,
}) => {
  const startInputRef = useRef<HTMLInputElement>(null);
  const endInputRef = useRef<HTMLInputElement>(null);
  const [startDate, setStartDate] = useState<Date | null>(value?.[0] || null);
  const [endDate, setEndDate] = useState<Date | null>(value?.[1] || null);
  useEffect(() => {
    if (!startInputRef.current || !endInputRef.current) return;
    const startPicker = flatpickr(startInputRef.current, {
      dateFormat: "Y-m-d",
      disableMobile: true,
      clickOpens: true,
      allowInput: false,
      appendTo: document.body,
      closeOnSelect: false,
      static: true,
      onReady: (_selectedDates, _dateStr, instance) => {
        if (instance?.calendarContainer) {
          (instance.calendarContainer as HTMLElement).style.zIndex = "99999";
        }
      },
      onChange: (selectedDates) => {
        const newStartDate = selectedDates[0] || null;
        setStartDate(newStartDate);
        if (onChange) onChange([newStartDate, endDate || null]);
      },
    });
    const endPicker = flatpickr(endInputRef.current, {
      dateFormat: "Y-m-d",
      disableMobile: true,
      clickOpens: true,
      allowInput: false,
      appendTo: document.body,
      closeOnSelect: false,
      static: true,
      onReady: (_selectedDates, _dateStr, instance) => {
        if (instance?.calendarContainer) {
          (instance.calendarContainer as HTMLElement).style.zIndex = "99999";
        }
      },
      onChange: (selectedDates) => {
        const newEndDate = selectedDates[0] || null;
        setEndDate(newEndDate);
        if (onChange) onChange([startDate || null, newEndDate]);
      },
    });
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
     
      // Don't close if clicking inside the date range picker container
      if (target.closest("#date-range-picker")) return;
     
      // Don't close if clicking on any flatpickr calendar elements
      if (target.closest(".flatpickr-calendar")) return;
     
      // Don't close if clicking on flatpickr specific elements
      if (
        target.closest(".flatpickr-day") ||
        target.closest(".flatpickr-month") ||
        target.closest(".flatpickr-weekday") ||
        target.closest(".flatpickr-current-month") ||
        target.closest(".flatpickr-months") ||
        target.closest(".flatpickr-prev-month") ||
        target.closest(".flatpickr-next-month") ||
        target.closest(".flatpickr-year") ||
        target.closest(".flatpickr-current-year") ||
        target.closest(".flatpickr-time") ||
        target.closest(".flatpickr-hour") ||
        target.closest(".flatpickr-minute") ||
        target.closest(".flatpickr-second") ||
        target.closest(".flatpickr-am-pm")
      ) return;
     
      // Don't close if clicking on select elements
      if (target.closest("select")) return;
     
      // Don't close if clicking on buttons or inputs
      if (target.closest("button") || target.closest("input")) return;
     
      // Close the popover
      if (onClose) onClose();
    };
    const timeoutId = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 200);
    return () => {
      clearTimeout(timeoutId);
      startPicker.destroy();
      endPicker.destroy();
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onChange, onClose, startDate, endDate]);
  useEffect(() => {
    setStartDate(value?.[0] || null);
    setEndDate(value?.[1] || null);
  }, [value]);
  return (
    <div id="date-range-picker" className="flex flex-col items-stretch gap-2 w-full">
      <div className="relative w-full">
        <div className="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
          <svg className="w-4 h-4 text-gray-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20">
            <path d="M20 4a2 2 0 0 0-2-2h-2V1a1 1 0 0 0-2 0v1h-3V1a1 1 0 0 0-2 0v1H6V1a1 1 0 0 0-2 0v1H2a2 2 0 0 0-2 2v2h20V4ZM0 18a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8H0v10Zm5-8h10a1 1 0 0 1 0 2H5a1 1 0 0 1 0-2Z" />
          </svg>
        </div>
        <input
          ref={startInputRef}
          type="text"
          value={formatLocalDate(startDate)}
          className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full ps-8 p-1.5 cursor-pointer"
          placeholder="Start date"
          readOnly
          aria-label="Start date"
        />
      </div>
      <span className="text-gray-500 text-sm text-center">to</span>
      <div className="relative w-full">
        <div className="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
          <svg className="w-4 h-4 text-gray-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20">
            <path d="M20 4a2 2 0 0 0-2-2h-2V1a1 1 0 0 0-2 0v1h-3V1a1 1 0 0 0-2 0v1H6V1a1 1 0 0 0-2 0v1H2a2 2 0 0 0-2 2v2h20V4ZM0 18a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8H0v10Zm5-8h10a1 1 0 0 1 0 2H5a1 1 0 0 1 0-2Z" />
          </svg>
        </div>
        <input
          ref={endInputRef}
          type="text"
          value={formatLocalDate(endDate)}
          className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full ps-8 p-1.5 cursor-pointer"
          placeholder="End date"
          readOnly
          aria-label="End date"
        />
      </div>
    </div>
  );
};

// Upload Modal Component
type UploadModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (file: File) => void;
  onDownloadTemplate: () => void;
};

const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  onUpload,
  onDownloadTemplate,
}) => {
  const inputUniqueId = React.useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      // Auto-upload immediately on selection
      try {
        if (onUpload) onUpload(file);
      } finally {
        // Close the modal after starting upload
        onClose();
        // Reset input so same file can be selected again later
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    }
  };

  const handleDownloadTemplate = () => {
    if (onDownloadTemplate) {
      onDownloadTemplate();
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-gray-300 bg-opacity-50 flex items-center justify-center z-[10000]"
      onClick={handleBackdropClick}
    >
      <div className="p-6">
        <div className="w-full max-w-2xl mx-auto bg-white dark:bg-[#181E2A] rounded-2xl flex flex-col md:flex-row overflow-hidden max-h-[90vh] md:max-h-[80vh] relative">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors z-10"
            aria-label="Close modal"
          >
            <X className="w-4 h-4 text-gray-600" />
          </button>
          
          {/* Download Master Template Section */}
          <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 bg-gradient-to-b from-blue-50/60 to-white dark:from-blue-900/30 dark:to-[#181E2A] min-h-[180px]">
            <div className="flex flex-col items-center w-full h-full justify-between">
              <div className="flex items-center justify-center w-14 h-14 rounded-full bg-blue-100 dark:bg-blue-900 mb-4">
                <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 512 512" className="text-blue-500 text-3xl" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                  <path d="M216 0h80c13.3 0 24 10.7 24 24v168h87.7c17.8 0 26.7 21.5 14.1 34.1L269.7 378.3c-7.5 7.5-19.8 7.5-27.3 0L90.1 226.1c-12.6-12.6-3.7-34.1 14.1-34.1H192V24c0-13.3 10.7-24 24-24zm296 376v112c0 13.3-10.7 24-24 24H24c-13.3 0-24-10.7-24-24V376c0-13.3 10.7-24 24-24h146.7l49 49c20.1 20.1 52.5 20.1 72.6 0l49-49H488c13.3 0 24 10.7 24 24zm-124 88c0-11-9-20-20-20s-20 9-20 20 9 20 20 20 20-9 20-20zm64 0c0-11-9-20-20-20s-20 9-20 20 9 20 20 20 20-9 20-20z"></path>
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2 text-center">Download Master Template</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 text-center">Use this template to upload customer data to the CRM.</p>
              <button 
                onClick={handleDownloadTemplate}
                className="inline-flex items-center justify-center font-medium gap-2 rounded-lg transition w-full max-w-[240px] rounded-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-6 transition mb-0 px-5 py-3.5 text-sm bg-brand-500 text-white shadow-theme-xs hover:bg-brand-600 disabled:bg-brand-300"
              >
                <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 512 512" className="mr-2" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                  <path d="M216 0h80c13.3 0 24 10.7 24 24v168h87.7c17.8 0 26.7 21.5 14.1 34.1L269.7 378.3c-7.5 7.5-19.8 7.5-27.3 0L90.1 226.1c-12.6-12.6-3.7-34.1 14.1-34.1H192V24c0-13.3 10.7-24 24-24zm296 376v112c0 13.3-10.7 24-24 24H24c-13.3 0-24-10.7-24-24V376c0-13.3 10.7-24 24-24h146.7l49 49c20.1 20.1 52.5 20.1 72.6 0l49-49H488c13.3 0 24 10.7 24 24zm-124 88c0-11-9-20-20-20s-20 9-20 20 9 20 20 20 20-9 20-20zm64 0c0-11-9-20-20-20s-20 9-20 20 9 20 20 20 20-9 20-20z"></path>
                </svg> 
                Download Template
              </button>
            </div>
          </div>
          
          {/* Upload File Section */}
          <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 bg-white dark:bg-[#181E2A] border-t md:border-t-0 md:border-l border-gray-100 dark:border-gray-800 min-h-[180px]">
            <div className="flex flex-col items-center w-full">
              <div className="flex items-center justify-center w-14 h-14 rounded-full bg-blue-100 dark:bg-blue-900 mb-4">
                <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 512 512" className="text-blue-500 text-3xl" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                  <path d="M296 384h-80c-13.3 0-24-10.7-24-24V192h-87.7c-17.8 0-26.7-21.5-14.1-34.1L242.3 5.7c7.5-7.5 19.8-7.5 27.3 0l152.2 152.2c12.6 12.6 3.7 34.1-14.1 34.1H320v168c0 13.3-10.7 24-24 24zm216-8v112c0 13.3-10.7 24-24 24H24c-13.3 0-24-10.7-24-24V376c0-13.3 10.7-24 24-24h136v8c0 30.9 25.1 56 56 56h80c30.9 0 56-25.1 56-56v-8h136c13.3 0 24 10.7 24 24zm-124 88c0-11-9-20-20-20s-20 9-20 20 9 20 20 20 20-9 20-20zm64 0c0-11-9-20-20-20s-20 9-20 20 9 20 20 20 20-9 20-20z"></path>
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 text-center">Upload File</h2>
              <label 
                htmlFor={inputUniqueId} 
                className="w-full flex flex-col items-center justify-center border-2 border-dashed border-blue-200 dark:border-blue-700 rounded-lg p-4 cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 transition mb-4"
                onClick={() => fileInputRef.current?.click()}
              >
                <input 
                  ref={fileInputRef}
                  id={inputUniqueId} 
                  accept=".xlsx,.xls,.csv" 
                  className="hidden" 
                  type="file"
                  onChange={handleFileSelect}
                />
                <span className="text-gray-500 dark:text-gray-400 text-sm mb-1 max-w-full truncate" title={selectedFile?.name || "No file chosen"}>
                  {selectedFile?.name || "Choose file to upload"}
                </span>
                <span className="text-blue-500 dark:text-blue-400 text-xs">Choose Excel (.xlsx, .xls) or CSV (.csv) file</span>
              </label>
              {/* Upload button is no longer required, so keep hidden for now */}
              <button 
                onClick={() => {}}
                disabled={true}
                className="hidden"
              >
                Upload File
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

type ActionBarProps = {
  filterQuery: string;
  setFilterQuery: (v: string) => void;
 
  showFilterField: boolean;
  setShowFilterField: (v: boolean) => void;

 

 

 

 

 

 

 

  filterField: string;
  setFilterField: (v: string) => void;

 

 

 

 

 

 

 

  timelineFilter: string;
  setTimelineFilter: (v: string) => void;

 

 

 

 

 

 

 

  pendingCustomRange: [Date | null, Date | null];
  setPendingCustomRange: (v: [Date | null, Date | null]) => void;

 

 

 

 

 

 

 

  showCustomPopover: boolean;
  setShowCustomPopover: (v: boolean) => void;

 

 

 

 

 

 

 

  downloadMenuOpen: boolean;
  setDownloadMenuOpen: (v: boolean) => void;
  downloadMenuRef: React.RefObject<HTMLDivElement | null>;
  mobileDownloadMenuOpen: boolean;
  setMobileDownloadMenuOpen: (v: boolean) => void;
  mobileDownloadMenuRef: React.RefObject<HTMLDivElement | null>;
  customPopoverRef: React.RefObject<HTMLDivElement | null>;

 

 

 

 

 

 

 

  handleExport: (type?: "excel" | "csv") => void;
  onRefresh: () => void;
  onCreate: () => void;
  onUpload?: (file: File) => void;
  onDownloadTemplate?: () => void;
  searchPlaceholder?: string;
  filterOptions?: { value: string; label: string }[];

 

 

 

 

 

 

 

  // Visibility flags (default true)
  showSearchInput?: boolean;
  showFilterToggle?: boolean;
  showFilterSelector?: boolean; // "Filter by Name" selector
  showTimelineSelector?: boolean; // timeline select & custom date
  showDownloadButton?: boolean;
  showRefreshButton?: boolean;
  showCreateButton?: boolean;
  showUploadButton?: boolean;
};
export const ActionBar: React.FC<ActionBarProps> = ({
  filterQuery,
  setFilterQuery,
  showFilterField,
  setShowFilterField,
  filterField,
  setFilterField,
  timelineFilter,
  setTimelineFilter,
  pendingCustomRange,
  setPendingCustomRange,
  showCustomPopover,
  setShowCustomPopover,
  downloadMenuOpen,
  setDownloadMenuOpen,
  downloadMenuRef,
  mobileDownloadMenuOpen,
  setMobileDownloadMenuOpen,
  mobileDownloadMenuRef,
  customPopoverRef,
  handleExport,
  onRefresh,
  onCreate,
  onUpload,
  onDownloadTemplate,
  searchPlaceholder = "Search",
  filterOptions = [
    { value: "name", label: "Filter by Name" },
    { value: "email", label: "Filter by Email" },
    { value: "phone", label: "Filter by Phone" },
  ],
  showSearchInput = true,
  showFilterToggle = true,
  showFilterSelector = true,
  showTimelineSelector = true,
  showDownloadButton = true,
  showRefreshButton = true,
  showCreateButton = true,
  showUploadButton = true,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  
  const filtersActive = Boolean(
    (filterQuery && filterQuery.trim() !== "") ||
    (timelineFilter && timelineFilter !== "" && timelineFilter !== "all") ||
    (pendingCustomRange && (pendingCustomRange[0] || pendingCustomRange[1]))
  );

 

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && onUpload) {
      onUpload(file);
    }
    // Reset the input value so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUploadButtonClick = () => {
    if (onUpload) {
      setUploadModalOpen(true);
    } else {
      // Fallback to direct file input if no onUpload handler
      fileInputRef.current?.click();
    }
  };
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow p-3 sm:p-4 mb-6">
      {/* Mobile */}
      <div className="block sm:hidden">
        {showSearchInput && (
        <input
          type="text"
          placeholder={searchPlaceholder}
          value={filterQuery}
          onChange={(e) => setFilterQuery(e.target.value)}
          className="w-full border px-3 py-2 rounded-md text-sm dark:bg-gray-800 dark:text-white dark:border-gray-700 mb-4"
            aria-label="Search"
        />
        )}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {showFilterToggle && (
          <button
              className="flex items-center justify-center h-[44px] px-3 border rounded-md text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors w-full"
            type="button"
            onClick={() => {
              if (filtersActive) {
                setFilterQuery("");
                setTimelineFilter("");
                setPendingCustomRange([null, null]);
                setShowCustomPopover(false);
                setShowFilterField(false);
                if (filterOptions && filterOptions.length > 0) setFilterField(filterOptions[0].value);
              } else {
                setShowFilterField(!showFilterField);
              }
            }}
            title="Filters"
              aria-expanded={showFilterField}
              aria-label="Toggle filters"
          >
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className={`w-5 h-5 ${filtersActive ? 'text-black' : ''}`}><path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 0 1 1-1h16a1 1 0 0 1 .8 1.6l-5.6 7.47A2 2 0 0 0 15 14.13V19a1 1 0 0 1-1.45.89l-4-2A1 1 0 0 1 9 17v-2.87a2 2 0 0 0-.2-.93L3.2 5.6A1 1 0 0 1 3 4z" /></svg>
          </button>
          )}
          {/* Upload button on mobile */}
          {showUploadButton && (
            <div className="relative">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileUpload}
                className="hidden"
                id="mobile-file-upload"
              />
              <button
                onClick={handleUploadButtonClick}
                className="flex items-center justify-center h-[44px] px-2 border rounded-md text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors w-full"
                title="Upload Excel/CSV"
                aria-label="Upload Excel/CSV"
              >
                <Upload className="w-5 h-5" />
              </button>
            </div>
          )}
          {/* Inline timeline select next to filter button on mobile */}
          {showFilterField && showTimelineSelector && (
            <select
             className="flex-1 min-w-[160px] border px-3 py-2 rounded-md text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-white col-span-2"
              value={timelineFilter}
              onChange={(e) => {
                const val = e.target.value;
                setTimelineFilter(val);
                setShowCustomPopover(val === "custom");
              }}
              aria-label="Select timeline"
            >
              <option value="">Select Timeline</option>
              <option value="all">All</option>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              {/* <option value="last12">Last 12 hours</option> */}
              <option value="thisweek">This week</option>
              <option value="thismonth">This month</option>
              {/* <option value="lastweek">Last week</option> */}
              {/* <option value="lastmonth">Last month</option> */}
              <option value="last30">Last 30 days</option>
              <option value="custom">Custom</option>
            </select>
          )}
          <div className="relative" ref={mobileDownloadMenuRef}>
            {showDownloadButton && (
            <button
              title="Export Data"
              onClick={() => setMobileDownloadMenuOpen(!mobileDownloadMenuOpen)}
                className="flex items-center justify-center h-[44px] px-2 border rounded-md text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors w-full"
                aria-haspopup="menu"
                aria-expanded={mobileDownloadMenuOpen}
            >
              <Download className="w-5 h-5" />
            </button>
            )}
            {mobileDownloadMenuOpen && (
              <div className="absolute right-0 mt-2 w-44 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-[9999]">
                <button onClick={() => handleExport("excel")} className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded-t-md">Download as Excel</button>
                <button onClick={() => handleExport("csv")} className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded-b-md">Download as CSV</button>
              </div>
            )}
          </div>
          {showRefreshButton && (
          <button
            onClick={onRefresh}
              className="flex items-center justify-center h-[44px] px-3 border rounded-md text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors w-full"
            title="Refresh"
              aria-label="Refresh"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          )}
          {showCreateButton && (
          <button
            onClick={onCreate}
              className="flex items-center justify-center h-[44px] px-4 rounded-md text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors col-span-4"
            title="Create"
              aria-label="Create"
          >
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
          </button>
          )}
        </div>

 

 

 

 

 

 

 

 

 

 

 

 

 

 

 

        {showFilterField && (
          <div className="mt-4 space-y-3">
            {showFilterSelector && (
            <select
              value={filterField}
              onChange={(e) => setFilterField(e.target.value)}
              className="w-full border px-3 py-2 rounded-md text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-white focus:outline-none"
            >
              {filterOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            )}
            {showTimelineSelector && (
              <>
            <select
              className="hidden w-full border px-3 py-2 rounded-md text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-white"
              value={timelineFilter}
              onChange={(e) => {
                const val = e.target.value;
                setTimelineFilter(val);
                setShowCustomPopover(val === "custom");
              }}
            >
              <option value="">Select Timeline</option>
              <option value="all">All</option>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              {/* <option value="last12">Last 12 hours</option> */}
              <option value="thisweek">This week</option>
              <option value="thismonth">This month</option>
              {/* <option value="lastweek">Last week</option> */}
              {/* <option value="lastmonth">Last month</option> */}
              <option value="last30">Last 30 days</option>
              <option value="custom">Custom</option>
            </select>
            {(timelineFilter === "custom") && (
              <div ref={customPopoverRef} className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded shadow-xl p-4">
                <DateRangePicker
                  value={pendingCustomRange}
                  onChange={setPendingCustomRange}
                  onClose={() => setShowCustomPopover(false)}
                />
                <div className="mt-3 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    className="px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200"
                    onClick={() => {
                      setPendingCustomRange([null, null]);
                      setTimelineFilter("");
                      setShowCustomPopover(false);
                    }}
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    onClick={() => {
                      if (pendingCustomRange && pendingCustomRange[0] && pendingCustomRange[1]) {
                        // Ensure timeline reflects custom selection
                        if (timelineFilter !== "custom") setTimelineFilter("custom");
                        setShowCustomPopover(false);
                      }
                    }}
                  >
                    Apply
                  </button>
                </div>
              </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
     {/* Desktop & tablet */}
      <div className="hidden sm:flex flex-col xl:flex-row flex-wrap items-start xl:items-center gap-3 md:gap-4">
        <div className="flex items-center w-full xl:flex-1 min-w-[200px] max-w-full">
          {showSearchInput && (
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            className="border px-4 py-2 rounded-md text-sm w-full dark:bg-gray-800 dark:text-white"
              aria-label="Search"
          />
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-start xl:justify-end w-full xl:flex-1 min-w-[260px]" style={{ position: "relative" }}>
          {showFilterToggle && (
          <button className="flex items-center gap-1 border px-3 py-1.5 rounded-md text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-white" type="button" onClick={() => {
              if (filtersActive && timelineFilter !== 'custom') {
              setFilterQuery("");
              setTimelineFilter("");
              setPendingCustomRange([null, null]);
              setShowCustomPopover(false);
              setShowFilterField(false);
              if (filterOptions && filterOptions.length > 0) setFilterField(filterOptions[0].value);
            } else {
              setShowFilterField(!showFilterField);
            }
            }} aria-expanded={showFilterField} aria-label="Toggle filters">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className={`w-4 h-4 ${filtersActive ? 'text-black' : ''}`}><path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 0 1 1-1h16a1 1 0 0 1 .8 1.6l-5.6 7.47A2 2 0 0 0 15 14.13V19a1 1 0 0 1-1.45.89l-4-2A1 1 0 0 1 9 17v-2.87a2 2 0 0 0-.2-.93L3.2 5.6A1 1 0 0 1 3 4z" /></svg>
            Filters
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
          </button>
          )}
          {showFilterField && (
            <>
              {showFilterSelector && (
              <select
                value={filterField}
                onChange={(e) => setFilterField(e.target.value)}
                className="border px-3 py-1.5 rounded-md text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-white focus:outline-none"
                style={{ marginRight: "8px" }}
              >
                {filterOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              )}
              {showTimelineSelector && (
                <>
              <select
                className="border px-3 py-1.5 rounded-md text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-white min-w-[140px]"
                value={timelineFilter}
                onChange={(e) => {
                  const val = e.target.value;
                  setTimelineFilter(val);
                  setShowCustomPopover(val === "custom");
                }}
                style={{ marginRight: "8px" }}
              >
                <option value="">Select Timeline</option>
                <option value="all">All</option>
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                {/* <option value="last12">Last 12 hours</option> */}
                <option value="thisweek">This week</option>
                <option value="thismonth">This month</option>
                {/* <option value="lastweek">Last week</option> */}
                {/* <option value="lastmonth">Last month</option> */}
                <option value="last30">Last 30 days</option>
                <option value="custom">Custom</option>
              </select>
              {showCustomPopover && (
                <div ref={customPopoverRef} className="absolute left-0 top-full z-[9999] mt-2 w-auto max-w-[90vw] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded shadow-xl p-4">
                  <div className="absolute -top-2 left-8 w-4 h-4 bg-white dark:bg-gray-900 border-l border-t border-gray-200 dark:border-gray-700 rotate-45 z-0"></div>
                  <DateRangePicker
                    value={pendingCustomRange}
                    onChange={setPendingCustomRange}
                    onClose={() => setShowCustomPopover(false)}
                  />
                  <div className="mt-3 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      className="px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200"
                      onClick={() => {
                        setPendingCustomRange([null, null]);
                        setTimelineFilter("");
                        setShowCustomPopover(false);
                      }}
                    >
                      Clear
                    </button>
                    <button
                      type="button"
                      className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700"
                      onClick={() => {
                        if (pendingCustomRange && pendingCustomRange[0] && pendingCustomRange[1]) {
                          if (timelineFilter !== "custom") setTimelineFilter("custom");
                          setShowCustomPopover(false);
                        }
                      }}
                    >
                      Apply
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
            </>
          )}
          {/* Upload button on desktop */}
          {showUploadButton && (
            <div className="relative">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileUpload}
                className="hidden"
                id="desktop-file-upload"
              />
              <button
                onClick={handleUploadButtonClick}
                className="flex items-center gap-1 border px-3 py-1.5 rounded-md text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                title="Upload Excel/CSV"
                aria-label="Upload Excel/CSV"
              >
                <Upload className="w-4 h-4" />
                Upload
              </button>
            </div>
          )}
          {showDownloadButton && (
          <div className="relative" ref={downloadMenuRef}>
              <button title="Export Data" onClick={() => setDownloadMenuOpen(!downloadMenuOpen)} className="flex items-center justify-center border px-3 py-1.5 rounded-md text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-white" aria-haspopup="menu" aria-expanded={downloadMenuOpen}>
              <Download className="w-5 h-5" />
              Download
              <svg className="ml-1 w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
            </button>
            {downloadMenuOpen && (
              <div className="absolute right-0 mt-2 w-44 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-[9999]">
                <button onClick={() => handleExport("excel")} className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded-t-md">Download as Excel</button>
                <button onClick={() => handleExport("csv")} className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded-b-md">Download as CSV</button>
              </div>
            )}
          </div>
          )}
          {showRefreshButton && (
            <button onClick={onRefresh} className="flex items-center gap-1 border px-3 py-1.5 rounded-md text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-white" aria-label="Refresh">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          )}
          {showCreateButton && (
            <button onClick={onCreate} className="flex items-center gap-1 px-6 py-2 rounded-md text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 transition" aria-label="Create">
            Create
          </button>
          )}
        </div>
      </div>
      
      {/* Upload Modal */}
      <UploadModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onUpload={onUpload || (() => {})}
        onDownloadTemplate={onDownloadTemplate || (() => {})}
      />
    </div>
  );
};
export default ActionBar;