"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SurveyIcons } from "@/components/icons/SurveyIcons";
import { Download } from "lucide-react";
import { getAllSurveyEmailTracking } from "@/utils/api";
import DateRangePicker from "@/components/DateRangePicker";
import jsPDF from "jspdf";

interface TrackingRecord {
  tracking_id: string;
  survey_id: string;
  survey_title: string;
  recipient_email: string;
  send_count: number;
  sent_date: string;
}

const CreatedSurveysPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [timelineFilter, setTimelineFilter] = useState("");
  const [customDateRange, setCustomDateRange] = useState<[Date | null, Date | null]>([null, null]);
  const [trackingRecords, setTrackingRecords] = useState<TrackingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 8;

  // Fetch data from API
  useEffect(() => {
    const fetchTrackingRecords = async () => {
      try {
        setLoading(true);
        console.log('📊 Fetching survey email tracking...');
        const response = await getAllSurveyEmailTracking();
        console.log('📊 Tracking data received:', response);
        
        const data = response.tracking_records || [];
        console.log('📊 Processed data:', data);
        console.log('📊 Data length:', data.length);
        
        setTrackingRecords(data);
        setError(null);
      } catch (err: unknown) {
        console.error('Error fetching tracking records:', err);
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
        setError(`Failed to fetch tracking records: ${errorMessage}`);
      } finally {
        setLoading(false);
      }
    };

    fetchTrackingRecords();
  }, []);

  // Helper function to get date range based on timeline filter
  const getDateRange = (timeline: string): [Date | null, Date | null] => {
    const now = new Date();
    let start: Date | null = null;
    let end: Date | null = null;

    switch (timeline) {
      case "today":
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        start.setHours(0, 0, 0, 0);
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        end.setHours(23, 59, 59, 999);
        break;
      case "yesterday":
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
        start.setHours(0, 0, 0, 0);
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
        end.setHours(23, 59, 59, 999);
        break;
      case "last12hours":
        start = new Date(now.getTime() - 12 * 60 * 60 * 1000);
        end = new Date(now);
        break;
      case "thisweek":
        const dayOfWeek = now.getDay();
        const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        start = new Date(now.getFullYear(), now.getMonth(), diff);
        start.setHours(0, 0, 0, 0);
        end = new Date(now.getFullYear(), now.getMonth(), diff + 7);
        end.setHours(23, 59, 59, 999);
        break;
      case "lastweek":
        const lastWeekDayOfWeek = now.getDay();
        const lastWeekDiff = now.getDate() - lastWeekDayOfWeek - 6;
        start = new Date(now.getFullYear(), now.getMonth(), lastWeekDiff);
        start.setHours(0, 0, 0, 0);
        end = new Date(now.getFullYear(), now.getMonth(), lastWeekDiff + 7);
        end.setHours(23, 59, 59, 999);
        break;
      case "thismonth":
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        start.setHours(0, 0, 0, 0);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case "lastmonth":
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        start.setHours(0, 0, 0, 0);
        end = new Date(now.getFullYear(), now.getMonth(), 0);
        end.setHours(23, 59, 59, 999);
        break;
      case "last30days":
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        start.setHours(0, 0, 0, 0);
        end = new Date(now);
        end.setHours(23, 59, 59, 999);
        break;
      case "custom":
        if (customDateRange[0] && customDateRange[1]) {
          start = new Date(customDateRange[0]);
          start.setHours(0, 0, 0, 0);
          end = new Date(customDateRange[1]);
          end.setHours(23, 59, 59, 999);
        }
        return [start, end];
      default:
        return [null, null];
    }

    return [start, end];
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  // Filter records - enhanced with timeline filter
  const filteredRecords = trackingRecords.filter((record) => {
    // Search filter - enhanced to search in multiple fields
    const searchLower = searchTerm.toLowerCase().trim();
    const matchesSearch = !searchLower ||
                         record.survey_title.toLowerCase().includes(searchLower) ||
                         record.recipient_email.toLowerCase().includes(searchLower) ||
                         (record.survey_id && record.survey_id.toLowerCase().includes(searchLower)) ||
                         (record.tracking_id && record.tracking_id.toLowerCase().includes(searchLower));
    
    // Timeline filter logic - enhanced with better date handling
    let matchesDate = true;
    if (timelineFilter && timelineFilter !== "all" && timelineFilter !== "") {
      const [startDate, endDate] = getDateRange(timelineFilter);
      
      if (startDate && endDate) {
        if (record.sent_date) {
          try {
            // Parse the sent_date - handle different formats
            let responseDate: Date;
            const dateStr = record.sent_date.toString();
            
            if (dateStr.includes('T')) {
              responseDate = new Date(dateStr);
            } else if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
              // Format: YYYY-MM-DD
              responseDate = new Date(dateStr + 'T00:00:00');
            } else {
              // Try parsing as is
              responseDate = new Date(dateStr);
            }
            
            // Check if date is valid
            if (isNaN(responseDate.getTime())) {
              matchesDate = false;
            } else {
              // For last12hours, use exact datetime comparison
              if (timelineFilter === "last12hours") {
                matchesDate = responseDate >= startDate && responseDate <= endDate;
              } else {
                // For other filters, compare dates (ignore time)
                const normalizedResponse = new Date(responseDate);
                normalizedResponse.setHours(0, 0, 0, 0);
                
                matchesDate = normalizedResponse >= startDate && normalizedResponse <= endDate;
              }
            }
          } catch (error) {
            console.error('Error parsing date:', record.sent_date, error);
            matchesDate = false;
          }
        } else {
          // If no date available, exclude from results when date filter is active
          matchesDate = false;
        }
      } else if (timelineFilter === "custom" && (!customDateRange[0] || !customDateRange[1])) {
        // If custom range is selected but dates are not set, show all
        matchesDate = true;
      }
    }
    
    return matchesSearch && matchesDate;
  });

  // Get initials for avatar
  const getInitials = (email: string) => {
    const name = email.split('@')[0];
    return name.charAt(0).toUpperCase();
  };

  // Get color for avatar based on email
  const getAvatarColor = (email: string) => {
    const colors = [
      'bg-blue-500',
      'bg-green-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-indigo-500',
      'bg-yellow-500',
      'bg-red-500',
      'bg-teal-500',
    ];
    const index = email.charCodeAt(0) % colors.length;
    return colors[index];
  };

  // Pagination calculations
  const totalRecords = filteredRecords.length;
  const totalPages = Math.ceil(totalRecords / recordsPerPage);
  const startIndex = (currentPage - 1) * recordsPerPage;
  const endIndex = startIndex + recordsPerPage;
  const displayedRecords = filteredRecords.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, timelineFilter, customDateRange]);

  // Clear all filters
  const clearAllFilters = () => {
    setSearchTerm("");
    setTimelineFilter("");
    setCustomDateRange([null, null]);
  };

  // Check if any filters are active
  const hasActiveFilters = searchTerm || timelineFilter || (customDateRange[0] && customDateRange[1]);

  // Download PDF function
  const handleDownloadPDF = () => {
    if (filteredRecords.length === 0) {
      alert("No records to download");
      return;
    }

    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(20);
    doc.text("Created Surveys Report", 20, 20);
    
    // Add date
    doc.setFontSize(10);
    const currentDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    doc.text(`Generated on: ${currentDate}`, 20, 30);
    
    // Add filter information if any
    let yPos = 40;
    if (hasActiveFilters) {
      doc.setFontSize(12);
      doc.text("Applied Filters:", 20, yPos);
      yPos += 8;
      doc.setFontSize(10);
      
      if (searchTerm) {
        doc.text(`Search: ${searchTerm}`, 20, yPos);
        yPos += 6;
      }
      if (timelineFilter && timelineFilter !== "all") {
        const timelineLabels: Record<string, string> = {
          "today": "Today",
          "yesterday": "Yesterday",
          "last12hours": "Last 12 Hours",
          "thisweek": "This Week",
          "lastweek": "Last Week",
          "thismonth": "This Month",
          "lastmonth": "Last Month",
          "last30days": "Last 30 Days",
          "custom": "Custom Range"
        };
        doc.text(`Timeline: ${timelineLabels[timelineFilter] || timelineFilter}`, 20, yPos);
        yPos += 6;
      }
      yPos += 5;
    }
    
    // Table headers
    yPos += 5;
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    const headers = ["#", "Survey Title", "Recipient Email", "Send Count", "Sent Date"];
    const colWidths = [10, 60, 70, 30, 40];
    let xPos = 20;
    
    headers.forEach((header, index) => {
      doc.text(header, xPos, yPos);
      xPos += colWidths[index];
    });
    
    yPos += 8;
    doc.setFontSize(10);
    doc.setDrawColor(200, 200, 200);
    doc.line(20, yPos - 2, 200, yPos - 2);
    
    // Add record data
    filteredRecords.forEach((record, index) => {
      // Check if we need a new page
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
        
        // Redraw headers on new page
        doc.setFontSize(11);
        xPos = 20;
        headers.forEach((header, idx) => {
          doc.text(header, xPos, yPos);
          xPos += colWidths[idx];
        });
        yPos += 8;
        doc.setFontSize(10);
        doc.line(20, yPos - 2, 200, yPos - 2);
      }
      
      const date = formatDate(record.sent_date);
      const title = record.survey_title.length > 35 ? record.survey_title.substring(0, 35) + '...' : record.survey_title;
      const email = record.recipient_email.length > 40 ? record.recipient_email.substring(0, 40) + '...' : record.recipient_email;
      
      xPos = 20;
      doc.text(String(index + 1), xPos, yPos);
      xPos += colWidths[0];
      
      const titleLines = doc.splitTextToSize(title, colWidths[1]);
      doc.text(titleLines, xPos, yPos);
      xPos += colWidths[1];
      
      const emailLines = doc.splitTextToSize(email, colWidths[2]);
      doc.text(emailLines, xPos, yPos);
      xPos += colWidths[2];
      
      doc.text(`${record.send_count} ${record.send_count === 1 ? 'time' : 'times'}`, xPos, yPos);
      xPos += colWidths[3];
      
      const dateLines = doc.splitTextToSize(date, colWidths[4]);
      doc.text(dateLines, xPos, yPos);
      
      yPos += Math.max(6, Math.max(titleLines.length, Math.max(emailLines.length, dateLines.length)) * 6);
    });
    
    // Add summary
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.text(
        `Page ${i} of ${totalPages} | Total Records: ${filteredRecords.length}`,
        20,
        285
      );
    }
    
    // Generate filename
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
    const filename = `Created_Surveys_${dateStr}_${timeStr}.pdf`;
    
    // Save the PDF
    doc.save(filename);
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      // Scroll to top of table
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="space-y-8 pt-20">
      <style jsx>{`
        .scrollbar-thin::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        
        .scrollbar-thin::-webkit-scrollbar-track {
          background: #f3f4f6;
          border-radius: 3px;
        }
        
        .scrollbar-thin::-webkit-scrollbar-thumb {
          background: #d1d5db;
          border-radius: 3px;
          transition: background 0.2s ease;
        }
        
        .scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background: #9ca3af;
        }
        
        .dark .scrollbar-thin::-webkit-scrollbar-track {
          background: #374151;
        }
        
        .dark .scrollbar-thin::-webkit-scrollbar-thumb {
          background: #6b7280;
        }
        
        .dark .scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background: #9ca3af;
        }
        
        .scrollbar-thin {
          scroll-behavior: smooth;
        }
      `}</style>

      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl shadow-md p-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Created Surveys
          </h1>
          <p className="text-white/90">
            View and track all created surveys and email tracking records
          </p>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Tracking Records ({filteredRecords.length})
          </h2>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Total: {trackingRecords.length} Filtered: {filteredRecords.length}
          </div>
        </div>
      </div>

      {/* Filters & Search Row - Matching Responses page */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex flex-col md:flex-row gap-4 items-start">
          {/* Search - Larger width to fit page */}
          <div className="w-full md:flex-1">
            <div className="relative">
              <SurveyIcons.SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by Name or Email..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-all"
              />
            </div>
          </div>

          {/* Timeline Filter Container - Includes Custom Range below */}
          <div className="w-full md:w-64 flex flex-col gap-3">
            <div className="relative">
              <select
                value={timelineFilter}
                onChange={(e) => setTimelineFilter(e.target.value)}
                className="w-full py-2.5 px-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none transition-all appearance-none"
              >
                <option value="">Select Timeline</option>
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="last12hours">Last 12 Hours</option>
                <option value="thisweek">This Week</option>
                <option value="lastweek">Last Week</option>
                <option value="thismonth">This Month</option>
                <option value="lastmonth">Last Month</option>
                <option value="last30days">Last 30 Days</option>
                <option value="custom">Custom Range</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            {/* Custom Date Range - Directly below Timeline dropdown */}
            {timelineFilter === "custom" && (
              <AnimatePresence>
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Custom Range
                    </label>
                    <DateRangePicker
                      value={customDateRange}
                      onChange={setCustomDateRange}
                    />
                  </div>
                </motion.div>
              </AnimatePresence>
            )}
          </div>

          {/* Download Button */}
          <button
            onClick={handleDownloadPDF}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 border-blue-300 dark:border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-all duration-200 font-medium text-sm whitespace-nowrap self-start"
            aria-label="Download records as PDF"
            type="button"
          >
            <Download className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <span>Download</span>
          </button>
        </div>

        {/* Action Buttons - Show when custom range is selected or filters are active */}
        {(timelineFilter === "custom" || hasActiveFilters) && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
            <button
              onClick={clearAllFilters}
              className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition-all font-medium text-sm"
            >
              Clear All
            </button>
            {timelineFilter === "custom" && (
              <button
                onClick={() => {
                  // Just clear the custom range if dates are not set
                  if (!customDateRange[0] || !customDateRange[1]) {
                    setTimelineFilter("");
                  }
                }}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all font-medium text-sm"
              >
                Apply Filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Created Surveys
              </h2>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600 dark:text-gray-400">Loading tracking data...</span>
          </div>
        ) : error ? (
          <div className="p-6 text-center">
            <p className="text-red-600 dark:text-red-400">{error}</p>
          </div>
        ) : displayedRecords.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-gray-500 dark:text-gray-400">No tracking records found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Survey Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Recipient Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Send Count
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Sent Date
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {displayedRecords.map((record) => (
                  <tr key={record.tracking_id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mr-3">
                          <span className="text-blue-600 dark:text-blue-400 font-semibold text-sm">
                            {record.survey_title.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {record.survey_title || "Untitled Survey"}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className={`flex-shrink-0 h-8 w-8 rounded-full ${getAvatarColor(record.recipient_email)} flex items-center justify-center mr-3`}>
                          <span className="text-white font-semibold text-xs">
                            {getInitials(record.recipient_email)}
                          </span>
                        </div>
                        <div className="text-sm text-gray-900 dark:text-white">
                          {record.recipient_email}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                        {record.send_count} {record.send_count === 1 ? 'time' : 'times'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-900 dark:text-white">
                        <SurveyIcons.CalendarIcon className="w-4 h-4 mr-2 text-gray-400" />
                        {formatDate(record.sent_date)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex items-center gap-2">
                {/* Previous Button */}
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    currentPage === 1
                      ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                      : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                  }`}
                >
                  Previous
                </button>

                {/* Page Numbers */}
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                    // Show first page, last page, current page, and pages around current
                    if (
                      page === 1 ||
                      page === totalPages ||
                      (page >= currentPage - 1 && page <= currentPage + 1)
                    ) {
                      return (
                        <button
                          key={page}
                          onClick={() => handlePageChange(page)}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            currentPage === page
                              ? 'bg-blue-600 text-white'
                              : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                          }`}
                        >
                          {page}
                        </button>
                      );
                    } else if (
                      page === currentPage - 2 ||
                      page === currentPage + 2
                    ) {
                      return (
                        <span key={page} className="px-2 text-gray-400 dark:text-gray-500">
                          ...
                        </span>
                      );
                    }
                    return null;
                  })}
                </div>

                {/* Next Button */}
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    currentPage === totalPages
                      ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                      : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                  }`}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Custom Flatpickr Styling - Compact Calendar */}
      <style jsx global>{`
        .flatpickr-calendar {
          background: white !important;
          border: 1px solid #e5e7eb !important;
          border-radius: 0.5rem !important;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05) !important;
          font-family: inherit !important;
          padding: 0.25rem !important;
          position: fixed !important;
          z-index: 99999 !important;
          overflow: visible !important;
          max-height: none !important;
          max-width: none !important;
          clip: auto !important;
          clip-path: none !important;
          width: auto !important;
          font-size: 0.875rem !important;
        }
        
        .flatpickr-calendar.open {
          display: block !important;
          visibility: visible !important;
        }
        
        .flatpickr-calendar.flatpickr-calendar.open {
          overflow: visible !important;
        }
        
        .flatpickr-wrapper {
          overflow: visible !important;
        }
        
        body > .flatpickr-calendar {
          overflow: visible !important;
          max-height: none !important;
        }
       
        .dark .flatpickr-calendar {
          background: #1f2937 !important;
          border-color: #374151 !important;
          color: #f9fafb !important;
        }
        
        .flatpickr-months {
          margin-bottom: 0.25rem !important;
          padding: 0.25rem 0.5rem !important;
        }
        
        .flatpickr-month {
          color: #111827 !important;
          font-size: 0.875rem !important;
          height: 28px !important;
          line-height: 28px !important;
        }
        
        .dark .flatpickr-month {
          color: #f9fafb !important;
        }
        
        .flatpickr-weekdays {
          margin-bottom: 0.25rem !important;
          padding: 0 0.5rem !important;
        }
        
        .flatpickr-weekday {
          font-size: 0.75rem !important;
          font-weight: 500 !important;
          height: 24px !important;
          line-height: 24px !important;
        }
        
        .flatpickr-days {
          padding: 0.25rem 0.5rem !important;
        }
        
        .flatpickr-day {
          border-radius: 0.25rem !important;
          height: 28px !important;
          width: 28px !important;
          line-height: 28px !important;
          font-size: 0.75rem !important;
          margin: 2px !important;
        }
        
        .flatpickr-day.selected,
        .flatpickr-day.startRange,
        .flatpickr-day.endRange {
          background: #3b82f6 !important;
          border-color: #3b82f6 !important;
          color: white !important;
        }
        
        .flatpickr-day.selected:hover,
        .flatpickr-day.startRange:hover,
        .flatpickr-day.endRange:hover {
          background: #2563eb !important;
          border-color: #2563eb !important;
        }
        
        .flatpickr-day.inRange {
          background: #dbeafe !important;
          border-color: #93c5fd !important;
          color: #1e40af !important;
        }
        
        .dark .flatpickr-day.inRange {
          background: #1e3a8a !important;
          border-color: #3b82f6 !important;
          color: #dbeafe !important;
        }
        
        .flatpickr-day:hover {
          background: #e5e7eb !important;
          color: #111827 !important;
        }
        
        .dark .flatpickr-day:hover {
          background: #374151 !important;
          color: #f9fafb !important;
        }
        
        .flatpickr-prev-month,
        .flatpickr-next-month {
          height: 28px !important;
          width: 28px !important;
          padding: 0 !important;
        }
        
        .flatpickr-prev-month svg,
        .flatpickr-next-month svg {
          width: 12px !important;
          height: 12px !important;
        }
        
        .flatpickr-current-month {
          font-size: 0.875rem !important;
          padding: 0.25rem 0 !important;
        }
        
        .flatpickr-time {
          padding: 0.25rem 0.5rem !important;
        }
      `}</style>
    </div>
  );
};

export default CreatedSurveysPage;

