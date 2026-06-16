"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";

// import PageBreadcrumb from "@/components/common/PageBreadCrumb";

import {

  Table,

  TableBody,

  TableHeader,

  TableRow,

} from "@/components/ui/table";

import ComponentCard from "@/components/common/ComponentCard";


import { ArrowDown, ArrowUp, Briefcase, ChevronDown } from "lucide-react";
import DashboardHeader from '@/components/header/DashboardHeader';

import { ActionBar } from "@/components/header/actionbar";

import * as XLSX from "xlsx";

// import DatePicker from "react-datepicker";

// import "react-datepicker/dist/react-datepicker.css";



import { useRouter } from "next/navigation";

// import Link from "next/link";

import Pagination from "@/components/tables/Pagination";

import Loader from "@/components/Loader";

import Alert from "@/components/ui/alert/Alert";
import { getEmployeeTickets } from "@/utils/api";



type Ticket = {

  id?: string;

  _id?: string;

  name: string;

  email: string;

  phone: string;

  issue_type?: string;

  issueType?: string;

  issue: string;

  status: string;

  message: string;

  device: string;

  severity: string;

  score?: number;

  created_at: string;

  ticket_id?: string;

  display_id?: string;

  assign_to?: string;

  assigned_to?: string | null;

};

type EmployeeRecord = {
  emp_id?: string;
  full_name?: string;
  fullName?: string;
  name?: string;
  email?: string;
  phone?: string;
  mobile?: string;
};

// Utility function to extract name from email address
const extractNameFromEmail = (email: string): string => {
  if (!email || typeof email !== 'string') return 'Employee';

  try {
    // Extract username part before @ symbol
    const username = email.split('@')[0];

    // Split by dots, underscores, or hyphens
    const parts = username.split(/[._-]/);

    // Capitalize each part and join with spaces
    const formattedName = parts
      .map(part => {
        if (!part) return '';
        return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
      })
      .filter(Boolean)
      .join(' ');

    return formattedName || 'Employee';
  } catch (error) {
    console.error('Error extracting name from email:', error);
    return 'Employee';
  }
};



















export default function TicketsPage() {

  const [ticketsData, setTicketsData] = useState<Ticket[]>([]);

  const [filteredTickets, setFilteredTickets] = useState<Ticket[]>([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [filterField, setFilterField] = useState("name");

  const [filterQuery, setFilterQuery] = useState("");

  const [currentPage, setCurrentPage] = useState(1);

  const [sortAsc, setSortAsc] = useState(false);

  const [ticketsPerPage, setTicketsPerPage] = useState(10);

  const [downloadMenuOpen, setDownloadMenuOpen] = useState(false);

  const downloadMenuRef = useRef<HTMLDivElement>(null);

  const [mobileDownloadMenuOpen, setMobileDownloadMenuOpen] = useState(false);

  const mobileDownloadMenuRef = useRef<HTMLDivElement>(null);

  const [timelineFilter, setTimelineFilter] = useState('');

  const [pendingCustomRange, setPendingCustomRange] = useState<[Date | null, Date | null]>([null, null]);

  const [showFilterField, setShowFilterField] = useState(false);

  const [showCustomPopover, setShowCustomPopover] = useState(false);

  const customPopoverRef = useRef<HTMLDivElement | null>(null);

  const [showForm, setShowForm] = useState(false);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const router = useRouter();

  const [showEditModal, setShowEditModal] = useState(false);

  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  const [clickedTicketId, setClickedTicketId] = useState<string | null>(null);

  const [users, setUsers] = useState<Array<{ id: string; fullName: string; email: string }>>([]);

  const [assignSearchQuery, setAssignSearchQuery] = useState("");

  const [showAssignSuggestions, setShowAssignSuggestions] = useState(false);

  const assignInputRef = useRef<HTMLInputElement>(null);

  const assignSuggestionsRef = useRef<HTMLDivElement>(null);









  // Persist first-seen timestamps to avoid immediate overdue on new tickets

  const firstSeenRef = useRef<Record<string, number>>({});

  useEffect(() => {

    try {

      const saved = localStorage.getItem('employeeTicketFirstSeen');

      if (saved) {

        const parsed = JSON.parse(saved) as Record<string, number>;

        if (parsed && typeof parsed === 'object') {

          firstSeenRef.current = parsed;

        }

      }

    } catch { }

  }, []);









  // Real-time timer for dynamic SLA updates - updates every 5 seconds to avoid excessive re-renders

  const [now, setNow] = useState<number>(Date.now());

  useEffect(() => {

    const intervalId = setInterval(() => {

      setNow(Date.now());

    }, 600000); // Changed from 1000ms to 600000ms (10 minutes)

    return () => clearInterval(intervalId);

  }, []);









  // --- ALERT STATE ---

  const [alertMessage, setAlertMessage] = useState("");

  const [alertType, setAlertType] = useState<'success' | 'error' | ''>("");

  const [showAlert, setShowAlert] = useState(false);

  useEffect(() => {

    if (showAlert) {

      const timer = setTimeout(() => {

        setShowAlert(false);

        setAlertMessage("");

        setAlertType("");

      }, 5000);

      return () => clearTimeout(timer);

    }

  }, [showAlert]);









  const fetchTickets = async () => {
    setLoading(true);
    setError("");

    try {
      // Backend already filters tickets by user role
      const tickets = await getEmployeeTickets();

      console.log('🎫 Fetched tickets from backend (already filtered by role):', tickets);
      console.log('🎫 Tickets type:', typeof tickets, 'Is array:', Array.isArray(tickets));

      // Ensure tickets is an array
      const typedTickets = Array.isArray(tickets) ? (tickets as Ticket[]) : [];

      console.log('🎫 Processed tickets count:', typedTickets.length);

      // Process tickets to extract names from emails if needed
      const processedTickets = typedTickets.map((ticket: Ticket) => {
        // If name is "Employee" or empty, extract from email
        if (!ticket.name || ticket.name.trim() === '' || ticket.name.toLowerCase() === 'employee') {
          return {
            ...ticket,
            name: extractNameFromEmail(ticket.email)
          };
        }
        return ticket;
      });

      if (processedTickets.length > 0) {
        console.log('🎫 Sample processed tickets:', processedTickets.slice(0, 3).map((t: Ticket) => ({
          id: t.id || t._id,
          ticket_id: t.ticket_id,
          name: t.name,
          email: t.email,
          issue_type: t.issue_type || t.issueType,
          status: t.status
        })));
      }

      // Sort tickets by created_at (newest first) - only if we have tickets
      const sortedTickets = processedTickets.length > 0
        ? [...processedTickets].sort(
          (a, b) => {
            const dateA = new Date(a.created_at).getTime();
            const dateB = new Date(b.created_at).getTime();
            return dateB - dateA; // Newest first
          }
        )
        : [];

      console.log('🎫 Setting tickets data, count:', sortedTickets.length);
      setTicketsData(sortedTickets);
      setFilteredTickets(sortedTickets);

      // Reset to first page if we have tickets
      if (sortedTickets.length > 0) {
        setCurrentPage(1);
      }
    } catch (error) {
      console.error('🎫 Error fetching tickets:', error);
      setTicketsData([]);
      setFilteredTickets([]);
      setError(error instanceof Error ? error.message : "Failed to fetch tickets. Please try again.");
    } finally {
      setLoading(false);
    }
  };









  useEffect(() => {

    fetchTickets();

  }, []);

  // Fetch users for autocomplete
  const fetchUsers = useCallback(async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/users?online_only=false&include_offline=true`, {
        headers: {
          'accept': 'application/json',
        },
      });
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          setUsers(
            data.map((user: { id: string; fullName?: string; full_name?: string; email?: string }) => ({
              id: String(user.id),
              fullName: String(user.fullName || user.full_name || ''),
              email: String(user.email || ''),
            }))
          );
        }
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  }, []);

  // Fetch users when edit modal opens
  useEffect(() => {
    if (showEditModal) {
      fetchUsers();
      setAssignSearchQuery('');
      setShowAssignSuggestions(false);
    }
  }, [showEditModal, fetchUsers]);

  // Filter users based on search query
  const filteredUsers = assignSearchQuery.trim() === ''
    ? []
    : users.filter(user =>
      user.fullName.toLowerCase().includes(assignSearchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(assignSearchQuery.toLowerCase())
    ).slice(0, 5); // Limit to 5 suggestions

  // Click outside handler for suggestions
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        assignInputRef.current &&
        !assignInputRef.current.contains(event.target as Node) &&
        assignSuggestionsRef.current &&
        !assignSuggestionsRef.current.contains(event.target as Node)
      ) {
        setShowAssignSuggestions(false);
      }
    }

    if (showAssignSuggestions) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showAssignSuggestions]);









  // Severity scores are now fetched from backend ticket data

  // Keeping this for fallback calculation if needed

  const [severityScores] = useState<{ score_name: string; score_value: string }[]>([]);









  // Helper to get severity for a ticket

  function getSeverityScore(ticket: Ticket) {

    // Use backend severity if available

    if (ticket.severity && ticket.severity !== '') {

      // Return severity with proper colors

      switch (ticket.severity.toLowerCase()) {

        case 'high':

          return { label: ticket.severity, color: 'bg-blue-100 text-blue-700 border border-blue-300' };

        case 'medium':

          return { label: ticket.severity, color: 'bg-blue-100 text-blue-700 border border-blue-300' };

        case 'low':

          return { label: ticket.severity, color: 'bg-blue-100 text-blue-700 border border-blue-300' };

        default:

          return { label: ticket.severity, color: 'bg-gray-100 text-gray-700 border border-gray-300' };

      }

    }









    // Fallback to score if severity is not available

    if (ticket.score !== undefined && ticket.score !== null) {

      return { label: String(ticket.score), color: '' };

    }









    // Final fallback calculation if neither severity nor score is available

    let score = 0;

    // Prefer Issue score

    const issueScore = severityScores.find(s => s.score_name === `Issue: ${ticket.issue}`);

    if (issueScore) {

      score = Number(issueScore.score_value) || 0;

    } else {

      // Fallback to Type score

      const typeScore = severityScores.find(s => s.score_name === `Type: ${ticket.issue_type ?? ticket.issueType}`);

      if (typeScore) score = Number(typeScore.score_value) || 0;

    }

    // Return numeric-only result in label

    if (score > 0) return { label: String(score), color: '' };

    return { label: '-', color: '' };

  }



















  // Helper to check if a ticket is a duplicate

  function isDuplicateTicket(ticket: Ticket, allTickets: Ticket[]) {

    const sameTickets = allTickets.filter(t =>

      t.name === ticket.name &&

      t.email === ticket.email &&

      (t.issue_type ?? t.issueType) === (ticket.issue_type ?? ticket.issueType) &&

      t.issue === ticket.issue

    );

    return sameTickets.length > 1;

  }









  // Helper to check if a ticket is overdue (New status + 2 minutes past appearance/creation)

  const isOverdueNewTicket = useCallback((ticket: Ticket): boolean => {

    const statusLower = (ticket.status || '').toLowerCase();

    // SLA applies for both New and Open statuses

    if (!(statusLower === 'new' || statusLower === 'open')) return false;









    const createdAtMs = Date.parse(ticket.created_at);

    const id = String(ticket._id || ticket.id || ticket.ticket_id || '');

    const firstSeen = firstSeenRef.current[id];

    const base = Number.isFinite(createdAtMs) ? createdAtMs : now;

    // Use the later of created_at and firstSeen (if present) to avoid immediate overdue

    const effectiveStart = Math.min(now, Math.max(base, firstSeen ?? base));

    const ageMs = Math.max(0, now - effectiveStart);

    return ageMs >= 2 * 60 * 1000; // 2 minutes

  }, [now]);









  // Helper to get priority score for sorting (overdue New tickets get highest priority)

  const getPriorityScore = useCallback((ticket: Ticket): number => {

    if (isOverdueNewTicket(ticket)) return 1000; // Highest priority

    if ((ticket.status || '').toLowerCase() === 'new') return 100; // High priority

    if ((ticket.status || '').toLowerCase() === 'pending') return 50; // Medium priority

    return 0; // Low priority

  }, [isOverdueNewTicket]);



  // Helper to filter tickets by timeline

  const filterTicketsByTimeline = (tickets: Ticket[], timeline: string, customRange: [Date | null, Date | null]) => {

    if (!timeline || timeline === 'all') return tickets;



    const now = new Date();

    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());



    return tickets.filter(ticket => {

      const ticketDate = new Date(ticket.created_at);

      const ticketDateOnly = new Date(ticketDate.getFullYear(), ticketDate.getMonth(), ticketDate.getDate());



      switch (timeline) {

        case 'today':

          return ticketDateOnly.getTime() === today.getTime();

        case 'yesterday':

          const yesterday = new Date(today);

          yesterday.setDate(yesterday.getDate() - 1);

          return ticketDateOnly.getTime() === yesterday.getTime();

        case 'last12':

          const last12Hours = new Date(now.getTime() - 12 * 60 * 60 * 1000);

          return ticketDate >= last12Hours;

        case 'thisweek':

          const startOfWeek = new Date(today);

          startOfWeek.setDate(today.getDate() - today.getDay());

          return ticketDateOnly >= startOfWeek;

        case 'thismonth':

          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

          return ticketDateOnly >= startOfMonth;

        case 'lastweek':

          const lastWeekStart = new Date(today);

          lastWeekStart.setDate(today.getDate() - today.getDay() - 7);

          const lastWeekEnd = new Date(today);

          lastWeekEnd.setDate(today.getDate() - today.getDay() - 1);

          return ticketDateOnly >= lastWeekStart && ticketDateOnly <= lastWeekEnd;

        case 'lastmonth':

          const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

          const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

          return ticketDateOnly >= lastMonthStart && ticketDateOnly <= lastMonthEnd;

        case 'last30':

          const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

          return ticketDate >= last30Days;

        case 'custom':

          if (customRange && (customRange[0] || customRange[1])) {

            if (customRange[0] && customRange[1]) {

              return ticketDate >= customRange[0] && ticketDate <= customRange[1];

            } else if (customRange[0]) {

              return ticketDate >= customRange[0];

            } else if (customRange[1]) {

              return ticketDate <= customRange[1];

            }

          }

          return true;

        default:

          return true;

      }

    });

  };



  useEffect(() => {

    // Only process if we have tickets data
    if (ticketsData.length === 0) {
      setFilteredTickets([]);
      return;
    }

    let filtered = [...ticketsData]; // Start with a copy of ticketsData

    // Apply text filter
    if (filterQuery.trim() !== "") {
      const query = filterQuery.toLowerCase();
      filtered = filtered.filter((ticket) => {
        // Handle special filter fields
        if (filterField === "agent") {
          const agentValue = ticket.assigned_to || ticket.assign_to || "";
          return String(agentValue).toLowerCase().includes(query);
        }

        if (filterField === "ticket_id") {
          const ticketId = ticket.ticket_id || ticket.display_id || ticket.id || ticket._id || "";
          return String(ticketId).toLowerCase().includes(query);
        }

        if (filterField === "status") {
          const statusValue = ticket.status || "";
          return String(statusValue).toLowerCase().includes(query);
        }

        if (filterField === "issue") {
          const issueValue = ticket.issue || "";
          return String(issueValue).toLowerCase().includes(query);
        }

        // Default: use the filterField directly
        const value = ticket[filterField as keyof Ticket];
        return typeof value === "string" && value.toLowerCase().includes(query);
      });
    }

    // Apply timeline filter (including custom date range)
    if (timelineFilter) {
      filtered = filterTicketsByTimeline(filtered, timelineFilter, pendingCustomRange);
    }

    // Sort by priority (overdue New tickets first, then by creation date)
    const sortedFiltered = filtered.sort((a, b) => {
      const priorityA = getPriorityScore(a);
      const priorityB = getPriorityScore(b);

      if (priorityA !== priorityB) {
        return priorityB - priorityA; // Higher priority first
      }

      // If same priority, sort by creation date (newest first)
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    setFilteredTickets(sortedFiltered);

  }, [filterQuery, filterField, ticketsData, timelineFilter, pendingCustomRange, getPriorityScore]);









  // Track first-seen timestamps for SLA calculation (separate from filtering/sorting)
  useEffect(() => {
    // Only process if we have tickets data
    if (ticketsData.length === 0) return;

    // Capture first-seen for new IDs, persist for stability across renders
    try {
      let mutated = false;
      const map = { ...firstSeenRef.current };

      ticketsData.forEach(t => {
        const id = String(t._id || t.id || t.ticket_id || '');
        if (!id) return;

        if (map[id] == null) {
          map[id] = Date.now();
          mutated = true;
        }
      });

      if (mutated) {
        firstSeenRef.current = map;
        localStorage.setItem('employeeTicketFirstSeen', JSON.stringify(map));
      }
    } catch { }
  }, [ticketsData]);









  // Prevent background scrolling when modal is open

  useEffect(() => {

    if (showForm || showEditModal) {

      document.body.style.overflow = 'hidden';

    } else {

      document.body.style.overflow = 'unset';

    }









    // Cleanup function to ensure overflow is restored when component unmounts

    return () => {

      document.body.style.overflow = 'unset';

    };

  }, [showForm, showEditModal]);









  const exportToCSV = (data: Record<string, unknown>[], filename: string) => {

    const replacer = (key: string, value: unknown) => value === null ? '' : value;

    const header = Object.keys(data[0]);

    const csv = [

      header.join(','),

      ...data.map((row: Record<string, unknown>) => header.map(fieldName => JSON.stringify(row[fieldName], replacer)).join(','))

    ].join('\r\n');

    const blob = new Blob([csv], { type: 'text/csv' });

    const link = document.createElement('a');

    link.href = URL.createObjectURL(blob);

    link.download = filename;

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

  };









  const handleExport = (type = 'excel') => {

    const ticketsToExport = filteredTickets.slice(

      (currentPage - 1) * ticketsPerPage,

      currentPage * ticketsPerPage

    );

    const dataToExport = ticketsToExport.map((ticket, index) => ({

      '#': (currentPage - 1) * ticketsPerPage + index + 1,

      Name: ticket.name,

      Email: ticket.email,









      Issue: ticket.issue,

      Severity: ticket.severity,

      "Date": new Date(ticket.created_at).toLocaleDateString("en-GB", {

        day: "numeric",

        month: "short",

        year: "2-digit"

      })

    }));

    // Add timestamp to filename

    const now = new Date();

    const pad = (n: number) => n.toString().padStart(2, '0');

    const timestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;

    if (type === 'csv') {

      exportToCSV(dataToExport, `employee-tickets_${timestamp}.csv`);

    } else {

      const worksheet = XLSX.utils.json_to_sheet(dataToExport);

      const workbook = XLSX.utils.book_new();

      XLSX.utils.book_append_sheet(workbook, worksheet, "Tickets");

      XLSX.writeFile(workbook, `employee-tickets_${timestamp}.xlsx`);

    }

    setDownloadMenuOpen(false);

    setMobileDownloadMenuOpen(false);

  };









  const handleSortDate = () => {

    const sorted = [...filteredTickets].sort((a, b) => {

      const dateA = new Date(a.created_at).getTime();

      const dateB = new Date(b.created_at).getTime();

      return sortAsc ? dateA - dateB : dateB - dateA;

    });

    setFilteredTickets(sorted);

    setSortAsc(!sortAsc);

  };









  // const totalPages = Math.ceil(filteredTickets.length / ticketsPerPage);

  const currentTickets = filteredTickets.slice(

    (currentPage - 1) * ticketsPerPage,

    currentPage * ticketsPerPage

  );









  // Add click outside to close download menu

  useEffect(() => {

    function handleClickOutside(event: MouseEvent) {

      if (downloadMenuRef.current && !downloadMenuRef.current.contains(event.target as Node)) {

        setDownloadMenuOpen(false);

      }

      if (mobileDownloadMenuRef.current && !mobileDownloadMenuRef.current.contains(event.target as Node)) {

        setMobileDownloadMenuOpen(false);

      }

    }

    if (downloadMenuOpen || mobileDownloadMenuOpen) {

      document.addEventListener("mousedown", handleClickOutside);

    } else {

      document.removeEventListener("mousedown", handleClickOutside);

    }

    return () => {

      document.removeEventListener("mousedown", handleClickOutside);

    };

  }, [downloadMenuOpen, mobileDownloadMenuOpen]);









  // Add click outside to close custom popover

  useEffect(() => {

    function handleClickOutside(event: MouseEvent) {

      if (showCustomPopover && customPopoverRef.current && !customPopoverRef.current.contains(event.target as Node)) {

        setShowCustomPopover(false);

      }

    }

    if (showCustomPopover) {

      document.addEventListener("mousedown", handleClickOutside);

    } else {

      document.removeEventListener("mousedown", handleClickOutside);

    }

    return () => {

      document.removeEventListener("mousedown", handleClickOutside);

    };

  }, [showCustomPopover]);









  // Handler for # click

  // const handleTicketClick = (ticket: Ticket) => {

  //   setSelectedTicket(ticket);

  //   setShowDetailModal(true);

  // };









  const currentPageIds = currentTickets.map(ticket => ticket.id || ticket._id || '').filter(id => id !== '');

  const allSelected = currentPageIds.length > 0 && currentPageIds.every(id => selectedIds.includes(id));

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {

    if (e.target.checked) {

      setSelectedIds(prev => Array.from(new Set([...prev, ...currentPageIds])));

    } else {

      setSelectedIds(prev => prev.filter(id => !currentPageIds.includes(id)));

    }

  };

  const handleSelectOne = (id: string) => (e: React.ChangeEvent<HTMLInputElement>) => {

    if (e.target.checked) {

      setSelectedIds(prev => [...prev, id]);

    } else {

      setSelectedIds(prev => prev.filter(selectedId => selectedId !== id));

    }

  };









  // --- TicketForm component (CRM-style modal form) ---

  // 1. Add state for options in the parent component

  const [issueTypeOptions, setIssueTypeOptions] = useState<string[]>([]);

  const [issueOptions, setIssueOptions] = useState<string[]>([]);

  const [typeToIssues, setTypeToIssues] = useState<Record<string, string[]>>({});

  const [optionsLoading, setOptionsLoading] = useState(false);

  const [optionsError, setOptionsError] = useState("");









  // 2. Fetch options from API on mount

  useEffect(() => {

    setOptionsLoading(true);

    setOptionsError("");

    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/helpdesk/employee/options`)
      .then(res => res.json())
      .then((data: unknown) => {
        if (Array.isArray(data) && data.length > 0 && (data[0] as Record<string, unknown>).type === "parent") {
          const parents = data as Array<{ label?: string; children?: Array<{ label?: string } | string> }>;
          const typeOpts = parents.map((p) => String(p.label || "").trim()).filter(Boolean);
          const map: Record<string, string[]> = {};
          parents.forEach((p) => {
            const label = String(p.label || "").trim();
            const children = Array.isArray(p.children)
              ? p.children
                .map((c) => typeof c === 'string' ? c : String((c as { label?: string }).label || ""))
                .map((s) => String(s || "").trim())
                .filter(Boolean)
              : [];
            if (label) map[label] = children;
          });
          const issueOpts = Object.values(map).flat();
          setIssueTypeOptions(typeOpts);
          setIssueOptions(issueOpts);
          setTypeToIssues(map);
        } else if (Array.isArray(data)) {
          const flat = data as { option_label?: string; list_label: string }[];
          const typeOpts = flat.filter((o) => o.option_label?.toLowerCase() === "type").map((o) => o.list_label);
          const issueOpts = flat.filter((o) => o.option_label?.toLowerCase() === "issue").map((o) => o.list_label);
          setIssueTypeOptions(typeOpts);
          setIssueOptions(issueOpts);
          setTypeToIssues({});
        } else {
          throw new Error("Unexpected options response");
        }
      })

      .catch(() => setOptionsError("Failed to load options"))

      .finally(() => setOptionsLoading(false));

  }, []);









  // Remove static ISSUE_TYPE_OPTIONS and ISSUE_OPTIONS

  const TicketForm = ({ onClose, onSuccess }: { onClose: () => void, onSuccess: () => void }) => {

    const [form, setForm] = React.useState({

      employeeId: "",

      issueType: "",

      issue: "",

      message: ""

    });

    const [employeeIdError, setEmployeeIdError] = React.useState("");

    const [messageError, setMessageError] = React.useState("");

    const [loading, setLoading] = React.useState(false);

    const [error, setError] = React.useState("");

    const [issueTypeError, setIssueTypeError] = React.useState("");

    const [issueError, setIssueError] = React.useState("");

    const [employeeDetails, setEmployeeDetails] = React.useState<{

      name: string;

      email: string;

      phone: string;

    } | null>(null);

    const [fetchingEmployee, setFetchingEmployee] = React.useState(false);

    const [allEmployees, setAllEmployees] = React.useState<EmployeeRecord[]>([]);

    const [loadingEmployees, setLoadingEmployees] = React.useState(false);

    const [employeeFetchError, setEmployeeFetchError] = React.useState("");

    const [employeeSearchQuery, setEmployeeSearchQuery] = React.useState("");

    const [showEmployeeSuggestions, setShowEmployeeSuggestions] = React.useState(false);









    // Add state for custom dropdowns

    const [showIssueTypeDropdown, setShowIssueTypeDropdown] = React.useState(false);

    const [showIssueDropdown, setShowIssueDropdown] = React.useState(false);

    const issueTypeDropdownRef = React.useRef<HTMLDivElement>(null);

    const issueDropdownRef = React.useRef<HTMLDivElement>(null);

    const employeeInputWrapperRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {

      let isMounted = true;

      const loadEmployees = async () => {

        setLoadingEmployees(true);

        setEmployeeFetchError("");

        try {

          const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/employees/?page=1&size=1000`);

          if (!response.ok) {

            throw new Error("Failed to fetch employees");

          }

          const payload: unknown = await response.json();

          let employees: EmployeeRecord[] = [];

          if (

            payload &&

            typeof payload === 'object' &&

            Array.isArray((payload as { data?: EmployeeRecord[] }).data)

          ) {

            employees = (payload as { data: EmployeeRecord[] }).data;

          } else if (Array.isArray(payload)) {

            employees = payload as EmployeeRecord[];

          }

          if (isMounted) {

            setAllEmployees(employees);

          }

        } catch {

          if (isMounted) {

            setEmployeeFetchError("Unable to load employees list");

          }

        } finally {

          if (isMounted) {

            setLoadingEmployees(false);

          }

        }

      };

      loadEmployees();

      return () => {

        isMounted = false;

      };

    }, []);

    React.useEffect(() => {

      function handleClickOutsideSuggestions(event: MouseEvent) {

        if (employeeInputWrapperRef.current && !employeeInputWrapperRef.current.contains(event.target as Node)) {

          setShowEmployeeSuggestions(false);

        }

      }

      if (showEmployeeSuggestions) {

        document.addEventListener('mousedown', handleClickOutsideSuggestions);

      }

      return () => {

        document.removeEventListener('mousedown', handleClickOutsideSuggestions);

      };

    }, [showEmployeeSuggestions]);

    const filteredEmployeeSuggestions = React.useMemo(() => {

      if (employeeSearchQuery.trim().length < 2) return [];

      const query = employeeSearchQuery.trim().toLowerCase();

      return allEmployees

        .filter((emp) => {

          const idMatch = emp.emp_id && String(emp.emp_id).toLowerCase().includes(query);

          const emailMatch = emp.email && emp.email.toLowerCase().includes(query);

          return Boolean(idMatch || emailMatch);

        })

        .slice(0, 6);

    }, [employeeSearchQuery, allEmployees]);

    const mapEmployeeRecordToDetails = (employee: EmployeeRecord) => ({

      name: employee.full_name || employee.fullName || employee.name || '',

      email: employee.email || '',

      phone: employee.mobile || employee.phone || '',

    });

    const handleEmployeeIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {

      const value = e.target.value;

      setForm((prev) => ({ ...prev, employeeId: value }));

      setEmployeeSearchQuery(value);

      setEmployeeIdError("");

      setEmployeeDetails(null);

      if (!value.trim()) {

        setShowEmployeeSuggestions(false);

        return;

      }

      if (value.trim().length >= 2) {

        setShowEmployeeSuggestions(true);

      } else {

        setShowEmployeeSuggestions(false);

      }

    };

    const handleEmployeeSuggestionSelect = (employee: EmployeeRecord) => {

      const identifier = employee.emp_id ? String(employee.emp_id) : (employee.email || "");

      const details = mapEmployeeRecordToDetails(employee);

      setForm((prev) => ({ ...prev, employeeId: identifier }));

      setEmployeeSearchQuery(identifier);

      setEmployeeDetails(details);

      setEmployeeIdError("");

      setShowEmployeeSuggestions(false);

    };



    // Click outside handler for dropdowns

    React.useEffect(() => {

      function handleClickOutside(event: MouseEvent) {

        if (issueTypeDropdownRef.current && !issueTypeDropdownRef.current.contains(event.target as Node)) {

          setShowIssueTypeDropdown(false);

        }

        if (issueDropdownRef.current && !issueDropdownRef.current.contains(event.target as Node)) {

          setShowIssueDropdown(false);

        }

      }



      document.addEventListener('mousedown', handleClickOutside);

      return () => {

        document.removeEventListener('mousedown', handleClickOutside);

      };

    }, []);



    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {

      setForm({ ...form, [e.target.name]: e.target.value });

    };









    // Function to fetch employee details by ID (fixed to use correct endpoint)

    const fetchEmployeeDetails = async (employeeId: string) => {

      if (!employeeId.trim()) {

        setEmployeeDetails(null);

        return;

      }

      setFetchingEmployee(true);

      const normalizedValue = employeeId.trim().toLowerCase();

      const localMatch = allEmployees.find((emp) => {

        const id = emp.emp_id ? String(emp.emp_id).toLowerCase() : "";

        const email = emp.email ? emp.email.toLowerCase() : "";

        return id === normalizedValue || email === normalizedValue;

      });

      if (localMatch) {

        setEmployeeDetails(mapEmployeeRecordToDetails(localMatch));

        setEmployeeIdError("");

        setFetchingEmployee(false);

        return;

      }

      if (allEmployees.length > 0) {

        setEmployeeDetails(null);

        setEmployeeIdError("Employee not found with this ID or email");

        setFetchingEmployee(false);

        return;

      }

      try {

        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/employees/?page=1&size=1000`);

        if (!response.ok) {

          throw new Error("Failed to fetch employee details");

        }

        const payload: unknown = await response.json();

        let employees: EmployeeRecord[] = [];

        if (

          payload &&

          typeof payload === 'object' &&

          Array.isArray((payload as { data?: EmployeeRecord[] }).data)

        ) {

          employees = (payload as { data: EmployeeRecord[] }).data;

        } else if (Array.isArray(payload)) {

          employees = payload as EmployeeRecord[];

        }

        if (allEmployees.length === 0) {

          setAllEmployees(employees);

        }

        const remoteMatch = employees.find((emp: EmployeeRecord) => {

          const id = emp.emp_id ? String(emp.emp_id).toLowerCase() : "";

          const email = emp.email ? emp.email.toLowerCase() : "";

          return id === normalizedValue || email === normalizedValue;

        });

        if (remoteMatch) {

          setEmployeeDetails(mapEmployeeRecordToDetails(remoteMatch));

          setEmployeeIdError("");

        } else {

          setEmployeeDetails(null);

          setEmployeeIdError("Employee not found with this ID or email");

        }

      } catch {

        setEmployeeDetails(null);

        setEmployeeIdError("Failed to fetch employee details");

      } finally {

        setFetchingEmployee(false);

      }

    };



    const handleEmployeeIdBlur = () => {

      setEmployeeIdError(form.employeeId.trim() === "" ? "Employee ID or email is required." : "");

      if (form.employeeId.trim()) {

        fetchEmployeeDetails(form.employeeId);

      }

    };



    const handleMessageBlur = () => {

      setMessageError(form.message.trim() === "" ? "Message is required." : "");

    };

    const handleSubmit = async (e: React.FormEvent) => {

      e.preventDefault();

      setLoading(true);

      setError("");



      if (!employeeDetails) {

        setEmployeeIdError("Please enter a valid Employee ID or email");

        setLoading(false);

        return;

      }

      if (!form.issueType) {

        setIssueTypeError("Issue Type is required.");

        setLoading(false);

        return;

      }

      if (!form.issue) {

        setIssueError("Issue is required.");

        setLoading(false);

        return;

      }

      try {

        console.log('Submitting ticket with data:', {

          name: employeeDetails.name,

          email: employeeDetails.email,

          phone: employeeDetails.phone,

          issue_type: form.issueType,

          issue: form.issue,

          device: '',

          severity: '',

          message: form.message

        });

        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/helpdesk/employee/tickets`, {

          method: "POST",

          headers: { "Content-Type": "application/json" },

          body: JSON.stringify({

            name: employeeDetails.name,

            email: employeeDetails.email,

            phone: employeeDetails.phone,

            issue_type: form.issueType,

            issue: form.issue,

            device: '',

            severity: '',

            message: form.message

          }),

        });

        console.log('Ticket creation response:', response.status);

        const responseData = await response.json();

        console.log('Ticket creation response data:', responseData);

        setLoading(false);

        onSuccess();

        onClose();



        // Show success alert

        setAlertMessage("Employee ticket created successfully!");

        setAlertType("success");

        setShowAlert(true);

      } catch {

        setLoading(false);

        setError("Failed to submit ticket. Try again.");

      }

    };

    const isFormValid = form.employeeId && employeeDetails && form.message && !employeeIdError && !messageError && form.issueType && form.issue;

    return (

      <div className="relative flex items-center justify-center px-1 sm:px-4 bg-transparent min-h-screen py-2">

        <div className="w-full max-w-[92vw] sm:max-w-md bg-white dark:bg-gray-900 p-3 sm:p-6 rounded-xl shadow-2xl relative max-h-[88vh] overflow-hidden">

          <button

            onClick={onClose}

            className="absolute top-1 right-1 text-gray-500 hover:text-gray-800 text-xl font-bold z-10 w-6 h-6 flex items-center justify-center"

            aria-label="Close"

          >

            &times;

          </button>

          <h2 className="text-center text-lg sm:text-2xl font-bold text-gray-800 dark:text-gray-100 mb-3 sm:mb-6 pr-6">

            Create Ticket

          </h2>

          <div className="max-h-[70vh] overflow-y-auto pr-1">

            <form onSubmit={handleSubmit} className="space-y-2 sm:space-y-4">

              <div>

                <label className="block text-gray-700 dark:text-gray-200 mb-1 font-medium text-sm">

                  Employee ID <span className="text-blue-500">*</span>

                </label>

                <div className="relative" ref={employeeInputWrapperRef}>

                  <input

                    type="text"

                    name="employeeId"

                    placeholder="Search by Employee ID or Email"

                    autoComplete="off"

                    value={form.employeeId}

                    onChange={handleEmployeeIdChange}

                    onBlur={handleEmployeeIdBlur}

                    onFocus={() => {

                      if (form.employeeId.trim().length >= 2) {

                        setShowEmployeeSuggestions(true);

                      }

                    }}

                    required

                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"

                  />

                  {showEmployeeSuggestions && (

                    <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl shadow-lg max-h-60 overflow-y-auto">

                      {loadingEmployees ? (

                        <div className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">

                          Loading employees...

                        </div>

                      ) : filteredEmployeeSuggestions.length === 0 ? (

                        <div className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">

                          No matching employees

                        </div>

                      ) : (

                        filteredEmployeeSuggestions.map((employee, index) => (

                          <button

                            key={`${employee.emp_id || employee.email || index}`}

                            type="button"

                            onClick={() => handleEmployeeSuggestionSelect(employee)}

                            className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition border-b border-gray-200 dark:border-gray-700 last:border-b-0"

                          >

                            <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">

                              {employee.full_name || employee.fullName || employee.name || 'Unknown'}

                            </div>

                            <div className="text-xs text-gray-500 dark:text-gray-400">

                              {(employee.emp_id || 'No ID') + ' - ' + (employee.email || 'No email')}

                            </div>

                          </button>

                        ))

                      )}

                    </div>

                  )}

                </div>

                {employeeFetchError && (

                  <div className="text-blue-500 text-xs mt-1">{employeeFetchError}</div>

                )}

                {employeeIdError && (

                  <div className="text-blue-500 text-xs mt-1">{employeeIdError}</div>

                )}

                {fetchingEmployee && (

                  <div className="bg-blue-50 border border-blue-200 text-blue-600 rounded px-3 py-1 text-xs font-medium mt-1">

                    Fetching employee details...

                  </div>

                )}

              </div>



              {/* Employee Details Display */}

              <div>

                <label className="block text-gray-700 dark:text-gray-200 mb-1 font-medium text-sm">

                  Issue Type <span className="text-blue-500">*</span>

                </label>

                <div className="relative" ref={issueTypeDropdownRef}>

                  <button

                    type="button"

                    onClick={() => {

                      setShowIssueTypeDropdown(!showIssueTypeDropdown);

                      setShowIssueDropdown(false);

                    }}

                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition text-left flex justify-between items-center"

                    disabled={optionsLoading || !!optionsError}

                  >

                    <span className={form.issueType ? "text-gray-900 dark:text-gray-100" : "text-gray-500 dark:text-gray-400"}>

                      {optionsLoading ? "Loading..." : optionsError ? "Failed to load" : form.issueType || "Select Issue Type"}

                    </span>

                    <ChevronDown className={`w-4 h-4 transition-transform ${showIssueTypeDropdown ? 'rotate-180' : ''}`} />

                  </button>



                  {showIssueTypeDropdown && (

                    <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-32 overflow-y-auto">

                      {issueTypeOptions.length === 0 ? (

                        <div className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400 text-center">

                          No issue types found

                        </div>

                      ) : (

                        issueTypeOptions.map((opt, i) => (

                          <button

                            key={i}

                            type="button"

                            className="w-full px-3 py-2 text-left text-xs hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100 transition"

                            onClick={() => {

                              setForm({ ...form, issueType: opt, issue: "" });

                              setShowIssueTypeDropdown(false);

                              setIssueTypeError("");

                            }}

                          >

                            {opt}

                          </button>

                        ))

                      )}

                    </div>

                  )}

                </div>

                {issueTypeError && (

                  <div className="text-blue-500 text-xs mt-1">{issueTypeError}</div>

                )}

              </div>

              <div>

                <label className="block text-gray-700 dark:text-gray-200 mb-1 font-medium text-sm">

                  Issue <span className="text-blue-500">*</span>

                </label>

                <div className="relative" ref={issueDropdownRef}>

                  <button

                    type="button"

                    onClick={() => {

                      setShowIssueDropdown(!showIssueDropdown);

                      setShowIssueTypeDropdown(false);

                    }}

                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition text-left flex justify-between items-center"

                    disabled={optionsLoading || !!optionsError}

                  >

                    <span className={form.issue ? "text-gray-900 dark:text-gray-100" : "text-gray-500 dark:text-gray-400"}>

                      {optionsLoading ? "Loading..." : optionsError ? "Failed to load" : form.issue || "Select Issue"}

                    </span>

                    <ChevronDown className={`w-4 h-4 transition-transform ${showIssueDropdown ? 'rotate-180' : ''}`} />

                  </button>



                  {showIssueDropdown && (

                    <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-32 overflow-y-auto">

                      {(form.issueType && typeToIssues[form.issueType] ? typeToIssues[form.issueType] : issueOptions).length === 0 ? (

                        <div className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400 text-center">

                          No issues found

                        </div>

                      ) : (

                        (form.issueType && typeToIssues[form.issueType] ? typeToIssues[form.issueType] : issueOptions).map((opt, i) => (

                          <button

                            key={i}

                            type="button"

                            className="w-full px-3 py-2 text-left text-xs hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100 transition"

                            onClick={() => {

                              setForm({ ...form, issue: opt });

                              setShowIssueDropdown(false);

                              setIssueError("");

                            }}

                          >

                            {opt}

                          </button>

                        ))

                      )}

                    </div>

                  )}

                </div>

                {issueError && (

                  <div className="text-blue-500 text-xs mt-1">{issueError}</div>

                )}

              </div>

              <div>

                <label className="block text-gray-700 dark:text-gray-200 mb-1 font-medium text-sm">

                  Message <span className="text-blue-500">*</span>

                </label>

                <textarea

                  name="message"

                  placeholder="Message"

                  value={form.message}

                  onChange={handleChange}

                  onBlur={handleMessageBlur}

                  required

                  rows={3}

                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition resize-none"

                />

                {messageError && (

                  <div className="text-blue-500 text-xs mt-1">{messageError}</div>

                )}

              </div>

              <button

                type="submit"

                className={`w-full bg-blue-600 text-white py-2 text-sm rounded-lg flex items-center justify-center transition font-medium ${loading ? 'cursor-not-allowed' : ''} ${isFormValid && !loading ? 'hover:bg-blue-700' : 'opacity-50'}`}

                disabled={loading || !isFormValid}

              >

                {loading ? 'Submitting...' : 'Submit'}

              </button>

              {error && <div className="text-blue-500 text-xs mt-1">{error}</div>}

            </form>

          </div>

        </div>

      </div>

    );

  };



  // Handle Escape key to close modals

  useEffect(() => {

    const handleEscape = (e: KeyboardEvent) => {

      if (e.key === 'Escape') {

        setShowForm(false);

      }

    };

    document.addEventListener('keydown', handleEscape);

    return () => document.removeEventListener('keydown', handleEscape);

  }, []);



  // Function to update ticket status to "Open" when clicked and navigate to detail page

  const updateTicketStatusToOpen = async (ticket: Ticket) => {

    const ticketId = ticket._id || ticket.id;

    if (!ticketId) return;

    // Set loading state

    setClickedTicketId(ticketId);

    try {

      // Only update if status is "New" or "Pending"

      if (ticket.status && (ticket.status.toLowerCase() === 'new' || ticket.status.toLowerCase() === 'pending')) {

        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/helpdesk/employee/tickets/${ticketId}/status`, {

          method: 'PUT',

          headers: { 'Content-Type': 'application/json' },

          body: JSON.stringify({

            status: 'Open',

            ticket_status: 'Open',

            data: {

              status: 'Open'

            }

          }),

        });

        if (response.ok) {

          setTicketsData(prevTickets => prevTickets.map(t => (t._id === ticket._id || t.id === ticket.id) ? { ...t, status: 'Open' } : t));

          setFilteredTickets(prevTickets => prevTickets.map(t => (t._id === ticket._id || t.id === ticket.id) ? { ...t, status: 'Open' } : t));

        }

      }



      // Navigate to ticket detail page

      router.push(`/helpdesk-employee-ticket/${ticketId}`);

    } catch {

      // Optionally, show an error alert

      setAlertMessage('Failed to update ticket status.');

      setAlertType('error');

      setShowAlert(true);

    } finally {

      // Clear loading state

      setClickedTicketId(null);

    }

  };



  // no-op: removed firstSeen tracking to avoid resetting other tickets' SLA state on re-render



  return (

    <div className="relative min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="mx-4 md:mx-6 mt-6 mb-8">
        <DashboardHeader
          title="Employee HelpDesk"
          subtitle="Manage and track employee support tickets"
          icon={Briefcase}
          gradientFrom="from-blue-900"
          gradientTo="to-indigo-800"
          actions={null}
        />
      </div>


      {/* Header ended; continue with page content */}




      {/* Tips Section removed */}

      {/* Inline alerts below header */}

      {showAlert && (

        <div className="mt-6 ml-auto max-w-sm relative z-[2147403647]">

          <Alert

            variant={alertType === 'success' ? 'success' : 'error'}

            title={alertType === 'success' ? 'Success' : 'Error'}

            message={alertMessage}

            showLink={false}

          />

        </div>

      )}

      {/* Spacing between header and cards */}

      <div className="mt-8 mb-4"></div>



      <div>

        {/* Ticket Summary Widget */}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 mb-8">

          {/* Total Tickets */}

          <div className="group relative overflow-hidden bg-white dark:bg-gray-800 border border-gray-200/60 dark:border-gray-700/60 rounded-3xl p-6 lg:p-8 cursor-pointer hover:-translate-y-2 hover:shadow-2xl hover:shadow-blue-500/20 transition-all duration-500">

            {/* Professional gradient overlay */}

            <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-900/10 dark:to-indigo-900/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>



            {/* Animated background pattern */}

            <div className="absolute inset-0 opacity-5 group-hover:opacity-10 transition-opacity duration-500">

              <div className="absolute inset-0 bg-gradient-to-br from-blue-400/20 to-indigo-400/20 rounded-3xl"></div>

            </div>



            {/* Card content */}

            <div className="relative z-10">

              <div className="flex items-start justify-between mb-6">

                <div className="relative">

                  <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/25 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">

                    <svg width="28" height="28" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-7 h-7 text-white">

                      <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />

                      <circle cx="9" cy="7" r="4" />

                      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />

                      <path d="M16 3.13a4 4 0 0 1 0 7.75" />

                    </svg>

                  </div>

                  {/* Glow effect */}

                  <div className="absolute inset-0 bg-gradient-to-br from-blue-400/30 to-indigo-500/30 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10"></div>

                </div>



                <div className="text-right">

                  <div className="flex items-center gap-2 mb-1">

                    <span className="text-4xl font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300">

                      {ticketsData.length.toLocaleString()}

                    </span>

                    <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400">

                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">

                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />

                      </svg>

                      <span className="text-sm font-medium">+12%</span>

                    </div>

                  </div>

                  <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Total tickets</p>

                </div>

              </div>



              {/* Enhanced progress bar */}

              <div className="relative w-full bg-gray-100 dark:bg-gray-700 rounded-full h-3 mt-4 overflow-hidden">

                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-indigo-500/20 rounded-full"></div>

                <div className="relative bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-700 ease-out shadow-sm" style={{ width: '100%' }}>

                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent rounded-full animate-pulse"></div>

                </div>

              </div>



              {/* Additional info */}

              <div className="mt-3 flex items-center justify-between text-xs text-gray-400 dark:text-gray-500">

                <span>All tickets</span>

                <span className="font-medium">100%</span>

              </div>

            </div>

          </div>

          {/* Pending Tickets */}

          <div className="group relative overflow-hidden bg-white dark:bg-gray-800 border border-gray-200/60 dark:border-gray-700/60 rounded-3xl p-6 lg:p-8 cursor-pointer hover:-translate-y-2 hover:shadow-2xl hover:shadow-blue-500/20 transition-all duration-500">

            {/* Professional gradient overlay */}

            <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-blue-50/50 dark:from-blue-900/10 dark:to-blue-900/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>



            {/* Animated background pattern */}

            <div className="absolute inset-0 opacity-5 group-hover:opacity-10 transition-opacity duration-500">

              <div className="absolute inset-0 bg-gradient-to-br from-blue-400/20 to-blue-400/20 rounded-3xl"></div>

            </div>



            {/* Card content */}

            <div className="relative z-10">

              <div className="flex items-start justify-between mb-6">

                <div className="relative">

                  <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-500 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/25 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">

                    <svg width="28" height="28" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-7 h-7 text-white">

                      <rect x="4" y="4" width="16" height="16" rx="2" />

                      <path d="M12 8v4l2 2" />

                    </svg>

                  </div>

                  {/* Glow effect */}

                  <div className="absolute inset-0 bg-gradient-to-br from-blue-400/30 to-blue-500/30 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10"></div>

                </div>



                <div className="text-right">

                  <div className="flex items-center gap-2 mb-1">

                    <span className="text-4xl font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300">

                      {ticketsData.filter(t => t.status && t.status.toLowerCase() === 'pending').length.toLocaleString()}

                    </span>

                    <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400">

                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">

                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />

                      </svg>

                      <span className="text-sm font-medium">Waiting</span>

                    </div>

                  </div>

                  <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Pending tickets</p>

                </div>

              </div>



              {/* Enhanced progress bar */}

              <div className="relative w-full bg-gray-100 dark:bg-gray-700 rounded-full h-3 mt-4 overflow-hidden">

                <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-full"></div>

                <div className="relative bg-gradient-to-r from-blue-500 to-blue-500 h-3 rounded-full transition-all duration-700 ease-out shadow-sm" style={{ width: `${(ticketsData.filter(t => t.status && t.status.toLowerCase() === 'pending').length / ticketsData.length) * 100}%` }}>

                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent rounded-full animate-pulse"></div>

                </div>

              </div>



              {/* Additional info */}

              <div className="mt-3 flex items-center justify-between text-xs text-gray-400 dark:text-gray-500">

                <span>In progress</span>

                <span className="font-medium">{Math.round((ticketsData.filter(t => t.status && t.status.toLowerCase() === 'pending').length / ticketsData.length) * 100)}%</span>

              </div>

            </div>

          </div>

          {/* Solved Tickets */}

          <div className="group relative overflow-hidden bg-white dark:bg-gray-800 border border-gray-200/60 dark:border-gray-700/60 rounded-3xl p-6 lg:p-8 cursor-pointer hover:-translate-y-2 hover:shadow-2xl hover:shadow-blue-500/20 transition-all duration-500">

            {/* Professional gradient overlay */}

            <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-blue-50/50 dark:from-blue-900/10 dark:to-blue-900/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>



            {/* Animated background pattern */}

            <div className="absolute inset-0 opacity-5 group-hover:opacity-10 transition-opacity duration-500">

              <div className="absolute inset-0 bg-gradient-to-br from-blue-400/20 to-blue-400/20 rounded-3xl"></div>

            </div>



            {/* Card content */}

            <div className="relative z-10">

              <div className="flex items-start justify-between mb-6">

                <div className="relative">

                  <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-500 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/25 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">

                    <svg width="28" height="28" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-7 h-7 text-white">

                      <rect x="4" y="4" width="16" height="16" rx="2" />

                      <path d="M9 12l2 2l4-4" />

                    </svg>

                  </div>

                  {/* Glow effect */}

                  <div className="absolute inset-0 bg-gradient-to-br from-blue-400/30 to-blue-500/30 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10"></div>

                </div>



                <div className="text-right">

                  <div className="flex items-center gap-2 mb-1">

                    <span className="text-4xl font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300">

                      {ticketsData.filter(t => t.status && t.status.toLowerCase() === 'close').length.toLocaleString()}

                    </span>

                    <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400">

                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">

                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2l4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />

                      </svg>

                      <span className="text-sm font-medium">Resolved</span>

                    </div>

                  </div>

                  <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Solved tickets</p>

                </div>

              </div>



              {/* Enhanced progress bar */}

              <div className="relative w-full bg-gray-100 dark:bg-gray-700 rounded-full h-3 mt-4 overflow-hidden">

                <div className="absolute inset-0 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-full"></div>

                <div className="relative bg-gradient-to-r from-blue-500 to-blue-500 h-3 rounded-full transition-all duration-700 ease-out shadow-sm" style={{ width: `${(ticketsData.filter(t => t.status && t.status.toLowerCase() === 'close').length / ticketsData.length) * 100}%` }}>

                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent rounded-full animate-pulse"></div>

                </div>

              </div>



              {/* Additional info */}

              <div className="mt-3 flex items-center justify-between text-xs text-gray-400 dark:text-gray-500">

                <span>Completed</span>

                <span className="font-medium">{Math.round((ticketsData.filter(t => t.status && t.status.toLowerCase() === 'close').length / ticketsData.length) * 100)}%</span>

              </div>

            </div>

          </div>

          {/* New Tickets */}

          <div className="group relative overflow-hidden bg-white dark:bg-gray-800 border border-gray-200/60 dark:border-gray-700/60 rounded-3xl p-6 lg:p-8 cursor-pointer hover:-translate-y-2 hover:shadow-2xl hover:shadow-blue-500/20 transition-all duration-500">

            {/* Professional gradient overlay */}

            <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-blue-50/50 dark:from-blue-900/10 dark:to-blue-900/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>



            {/* Animated background pattern */}

            <div className="absolute inset-0 opacity-5 group-hover:opacity-10 transition-opacity duration-500">

              <div className="absolute inset-0 bg-gradient-to-br from-blue-400/20 to-blue-400/20 rounded-3xl"></div>

            </div>



            {/* Card content */}

            <div className="relative z-10">

              <div className="flex items-start justify-between mb-6">

                <div className="relative">

                  <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-500 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/25 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">

                    <svg width="28" height="28" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-7 h-7 text-white">

                      <rect x="4" y="4" width="16" height="16" rx="2" />

                      <path d="M8 12h8M12 8v8" />

                    </svg>

                  </div>

                  {/* Glow effect */}

                  <div className="absolute inset-0 bg-gradient-to-br from-blue-400/30 to-blue-500/30 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10"></div>

                </div>



                <div className="text-right">

                  <div className="flex items-center gap-2 mb-1">

                    <span className="text-4xl font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300">

                      {ticketsData.filter(t => t.status && t.status.toLowerCase() === 'new').length.toLocaleString()}

                    </span>

                    <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400">

                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">

                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />

                      </svg>

                      <span className="text-sm font-medium">Fresh</span>

                    </div>

                  </div>

                  <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">New tickets</p>

                </div>

              </div>



              {/* Enhanced progress bar */}

              <div className="relative w-full bg-gray-100 dark:bg-gray-700 rounded-full h-3 mt-4 overflow-hidden">

                <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-violet-500/20 rounded-full"></div>

                <div className="relative bg-gradient-to-r from-blue-500 to-blue-500 h-3 rounded-full transition-all duration-700 ease-out shadow-sm" style={{ width: `${(ticketsData.filter(t => t.status && t.status.toLowerCase() === 'new').length / ticketsData.length) * 100}%` }}>

                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent rounded-full animate-pulse"></div>

                </div>

              </div>



              {/* Additional info */}

              <div className="mt-3 flex items-center justify-between text-xs text-gray-400 dark:text-gray-500">

                <span>Just arrived</span>

                <span className="font-medium">{Math.round((ticketsData.filter(t => t.status && t.status.toLowerCase() === 'new').length / ticketsData.length) * 100)}%</span>

              </div>

            </div>

          </div>

        </div>

        {/* End Ticket Summary Widget */}

        <div className="space-y-6">

          {/* Action Bar */}

          <ActionBar

            filterQuery={filterQuery}

            setFilterQuery={setFilterQuery}

            showFilterField={showFilterField}

            setShowFilterField={setShowFilterField}

            filterField={filterField}

            setFilterField={setFilterField}

            timelineFilter={timelineFilter}

            setTimelineFilter={(v: string) => {

              setTimelineFilter(v);

              // Always show custom popover when custom is selected, even if already selected

              if (v === "custom") {

                setShowCustomPopover(true);

              } else {

                setShowCustomPopover(false);

              }

            }}

            pendingCustomRange={pendingCustomRange}

            setPendingCustomRange={setPendingCustomRange}

            showCustomPopover={showCustomPopover}

            setShowCustomPopover={setShowCustomPopover}

            downloadMenuOpen={downloadMenuOpen}

            setDownloadMenuOpen={setDownloadMenuOpen}

            downloadMenuRef={downloadMenuRef}

            mobileDownloadMenuOpen={mobileDownloadMenuOpen}

            setMobileDownloadMenuOpen={setMobileDownloadMenuOpen}

            mobileDownloadMenuRef={mobileDownloadMenuRef}

            customPopoverRef={customPopoverRef}

            handleExport={handleExport}

            onRefresh={fetchTickets}

            onCreate={() => setShowForm(true)}

            searchPlaceholder="Search Ticket"

            filterOptions={[

              { value: "name", label: "Filter by Name" },

              { value: "email", label: "Filter by Email" },

              { value: "agent", label: "Filter by Agent" },

              { value: "ticket_id", label: "Filter by Ticket ID" },

              { value: "status", label: "Filter by Status" },

              { value: "issue", label: "Filter by Issue" },

              { value: "severity", label: "Filter by Severity" }

            ]}

          />









          <ComponentCard title="">









            {/* Mobile view - Individual ticket containers */}

            <div className="block sm:hidden space-y-4">

              {loading ? (

                <div className="py-10 text-center">

                  <Loader />

                </div>

              ) : error ? (

                <div className="px-5 py-6 text-center text-blue-500">{error}</div>

              ) : currentTickets.length === 0 ? (

                <div className="px-5 py-6 text-center text-gray-500 dark:text-gray-400">No Tickets.</div>

              ) : (

                currentTickets.map((ticket) => {

                  const severity = getSeverityScore(ticket);

                  const isDuplicate = isDuplicateTicket(ticket, ticketsData);

                  return (

                    <div

                      key={ticket.id || ticket._id || ticket.ticket_id || `ticket-${Math.random()}`}

                      className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group"

                    >

                      <div className="flex items-start justify-between mb-3">

                        <div className="flex items-center gap-2">

                          <input

                            type="checkbox"

                            checked={selectedIds.includes(ticket.id || ticket._id || '')}

                            onChange={handleSelectOne(ticket.id || ticket._id || '')}

                            className="rounded border-gray-300"

                          />

                          <span

                            className={`font-bold underline text-sm ${clickedTicketId === (ticket._id || ticket.id) ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:opacity-80'} transition-opacity ${isDuplicate ? 'bg-blue-100 dark:bg-blue-900/20 border border-blue-300 dark:border-blue-700 text-blue-900 dark:text-blue-100 rounded-full px-2 py-1 text-xs' : 'text-blue-600 dark:text-blue-400'} ${isOverdueNewTicket(ticket) ? 'text-blue-600 dark:text-blue-400 animate-pulse' : ''}`}

                            onClick={clickedTicketId === (ticket._id || ticket.id) ? undefined : async () => {

                              await updateTicketStatusToOpen(ticket);

                            }}

                            title={clickedTicketId === (ticket._id || ticket.id) ? "Opening ticket..." : "Click to view ticket details"}

                          >

                            <div className="inline-flex items-center gap-1">

                              <span>{ticket.ticket_id || ticket.display_id || ticket.id}</span>

                              {clickedTicketId === (ticket._id || ticket.id) ? (

                                <svg className="w-3 h-3 text-blue-500 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">

                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />

                                </svg>

                              ) : (

                                <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">

                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />

                                </svg>

                              )}

                            </div>

                          </span>

                        </div>

                        <span className={`inline-block px-2 py-1 rounded-full font-semibold text-xs ${severity.color}`}>

                          {severity.label}

                        </span>

                      </div>



                      <div className="space-y-3">

                        <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">

                          <span className="font-semibold text-gray-700 dark:text-gray-300 text-sm">Name:</span>

                          <div className="mt-1 text-gray-900 dark:text-white font-medium">{ticket.name}</div>

                        </div>

                        <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">

                          <span className="font-semibold text-gray-700 dark:text-gray-300 text-sm">Email:</span>

                          <div className="mt-1 text-gray-900 dark:text-white break-all">{ticket.email}</div>

                        </div>

                        <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">

                          <span className="font-semibold text-gray-700 dark:text-gray-300 text-sm">Issue Type:</span>

                          <div className="mt-1 text-gray-900 dark:text-white">

                            {ticket.issue_type ?? ticket.issueType ?? '-'}

                          </div>

                        </div>

                        <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">

                          <span className="font-semibold text-gray-700 dark:text-gray-300 text-sm">Issue:</span>

                          <div className="mt-1 text-gray-900 dark:text-white">

                            {ticket.issue || '-'}

                          </div>

                        </div>

                        <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">

                          <span className="font-semibold text-gray-700 dark:text-gray-300 text-sm">Status:</span>

                          <div className="mt-2">

                            <span className={`inline-block px-3 py-1 rounded-full font-semibold text-xs ${ticket.status?.toLowerCase() === 'pending'

                              ? 'bg-blue-100 text-blue-700 border border-blue-300'

                              : ticket.status?.toLowerCase() === 'close'

                                ? 'bg-gray-200 text-gray-700 border border-gray-300'

                                : ticket.status?.toLowerCase() === 'open'

                                  ? 'bg-blue-100 text-blue-700 border border-blue-300'

                                  : ticket.status?.toLowerCase() === 'in process'

                                    ? 'bg-blue-100 text-blue-700 border border-blue-300'

                                    : ticket.status?.toLowerCase() === 'new'

                                      ? 'bg-blue-100 text-blue-700 border border-blue-300'

                                      : 'bg-gray-100 text-gray-700 border border-gray-300'

                              }`}>

                              {(ticket.status?.toLowerCase() === 'close' ? 'Closed' : ticket.status) || 'Open'}

                            </span>

                          </div>

                        </div>

                        {/* Countdown timer for New tickets - Hidden on mobile */}

                        {ticket.status?.toLowerCase() === 'new' && (

                          <div className="hidden sm:block">

                            <span className="font-medium text-gray-600 dark:text-gray-400">SLA Countdown:</span>

                            <span className={`ml-2 inline-block px-3 py-1 rounded-full font-semibold text-xs ${isOverdueNewTicket(ticket)

                              ? 'bg-blue-100 text-blue-700 border border-blue-300 animate-pulse'

                              : 'bg-blue-100 text-blue-700 border border-blue-300'

                              }`}>

                              SLA Timer

                            </span>

                          </div>

                        )}

                        <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">

                          <span className="font-semibold text-gray-700 dark:text-gray-300 text-sm">Date:</span>

                          <div className="mt-1 text-gray-900 dark:text-white">

                            {new Date(ticket.created_at).toLocaleDateString("en-GB", {

                              day: "numeric",

                              month: "short",

                              year: "2-digit"

                            })}

                          </div>

                        </div>

                      </div>

                    </div>

                  );

                })

              )}

            </div>









            {/* Desktop view - Table */}

            <div className="hidden sm:block overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">

              <div className="w-full overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-gray-100 dark:scrollbar-track-800">

                <div className="min-w-[1200px]">

                  <Table className="w-full">

                    <TableHeader className="bg-gray-50 dark:bg-gray-700/50">

                      <TableRow className="hover:bg-transparent">

                        <th className="px-3 py-4 text-left font-semibold text-gray-700 dark:text-gray-300 text-sm w-12">

                          <input type="checkbox" checked={allSelected} onChange={handleSelectAll} />

                        </th>

                        <th className="px-5 py-4 text-left font-semibold text-gray-700 dark:text-gray-300 text-sm w-32">Ticket ID</th>

                        <th className="px-5 py-4 text-left font-semibold text-gray-700 dark:text-gray-300 text-sm w-48">Name</th>

                        <th className="px-5 py-4 text-left font-semibold text-gray-700 dark:text-gray-300 text-sm w-64">Email</th>

                        <th className="px-5 py-4 text-left font-semibold text-gray-700 dark:text-gray-300 text-sm w-40">Assign To</th>

                        <th className="px-5 py-4 text-left font-semibold text-gray-700 dark:text-gray-300 text-sm w-40">Issue Type</th>

                        <th className="px-5 py-4 text-left font-semibold text-gray-700 dark:text-gray-300 text-sm w-40">Issue</th>

                        <th className="px-5 py-4 text-left font-semibold text-gray-700 dark:text-gray-300 text-sm w-32">Severity</th>

                        <th className="px-5 py-4 text-left font-semibold text-gray-700 dark:text-gray-300 text-sm w-32">Status</th>

                        <th onClick={handleSortDate} className="px-5 py-4 text-left font-semibold text-gray-700 dark:text-gray-300 text-sm w-32 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors">

                          Date {sortAsc ? <ArrowUp className="inline w-4 h-4 ml-1" /> : <ArrowDown className="inline w-4 h-4 ml-1" />}

                        </th>

                        <th className="px-5 py-4 text-left font-semibold text-gray-700 dark:text-gray-300 text-sm w-24">Action</th>

                      </TableRow>

                    </TableHeader>

                    <TableBody>

                      {loading ? (

                        <TableRow>

                          <td colSpan={11} className="py-10 text-center">

                            <Loader />

                          </td>

                        </TableRow>

                      ) : error ? (

                        <TableRow>

                          <td colSpan={11} className="px-5 py-6 text-center text-blue-500">{error}</td>

                        </TableRow>

                      ) : currentTickets.length === 0 ? (

                        <TableRow>

                          <td colSpan={11} className="px-5 py-6 text-center text-gray-500 dark:text-gray-400">No Tickets.</td>

                        </TableRow>

                      ) : (

                        currentTickets.map((ticket) => {

                          const isDuplicate = isDuplicateTicket(ticket, ticketsData);

                          return (

                            <TableRow

                              key={ticket.id || ticket._id || Math.random()}

                              className="border-b border-gray-200 dark:border-gray-700 hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-violet-50/50 dark:hover:from-blue-900/10 dark:hover:to-violet-900/10 transition-all duration-200 group"

                            >

                              <td className="px-3 py-4 text-gray-800 dark:text-white">

                                <input type="checkbox" checked={selectedIds.includes(ticket.id || ticket._id || '')} onChange={handleSelectOne(ticket.id || ticket._id || '')} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />

                              </td>

                              <td

                                className={`px-5 py-4 font-bold ${clickedTicketId === (ticket._id || ticket.id) ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'} underline whitespace-nowrap transition-opacity ${isOverdueNewTicket(ticket) ? 'text-blue-600 dark:text-blue-400 animate-pulse' : 'text-blue-600 dark:text-blue-400'} ${isDuplicate ? 'relative pr-16 group' : ''}`}
                                onClick={clickedTicketId === (ticket._id || ticket.id) ? undefined : async () => {
                                  await updateTicketStatusToOpen(ticket);
                                }}
                                title={clickedTicketId === (ticket._id || ticket.id) ? "Opening ticket..." : "Click to view ticket details"}
                              >
                                <div className="flex items-center gap-1">
                                  {isDuplicate ? (
                                    <span className={`inline-flex items-center gap-1 ${isOverdueNewTicket(ticket) ? 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-200 dark:border-blue-800' : 'bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-900/20 dark:text-blue-100 dark:border-blue-700'} border rounded-full px-2 py-1 text-xs font-semibold`}>
                                      <span>{ticket.ticket_id || ticket.display_id || ticket.id}</span>
                                      {clickedTicketId === (ticket._id || ticket.id) ? (
                                        <svg className="w-3 h-3 text-blue-500 animate-spin inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 0020 14c0 1.657-.66 3.18-1.724 4.256M4 12a8.001 8.001 0 0015.356 2A8.001 8.001 0 004 10c0-1.657.66-3.18 1.724-4.256" />
                                        </svg>
                                      ) : (
                                        <svg className="w-3 h-3 text-gray-600 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                        </svg>
                                      )}
                                    </span>
                                  ) : (
                                    <span className={`${isOverdueNewTicket(ticket) ? 'text-blue-600 dark:text-blue-400 animate-pulse' : 'text-blue-600 dark:text-blue-400'} inline-flex items-center gap-1`}>
                                      {ticket.ticket_id || ticket.display_id || ticket.id}
                                      <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                      </svg>
                                    </span>
                                  )}
                                  {clickedTicketId === (ticket._id || ticket.id) && (
                                    <svg className="w-3 h-3 text-blue-500 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                  )}
                                </div>
                                {/* Tooltip aligned at the right edge of Ticket ID cell so it sits between columns */}
                                {isDuplicate && (
                                  <div className="absolute z-50 hidden group-hover:block pointer-events-none" style={{ right: '8px', left: 'auto', top: '50%', transform: 'translateY(-50%)' }}>
                                    <div className="bg-gray-800 dark:bg-gray-900 text-white text-xs font-semibold px-3 py-2 rounded-lg shadow-lg whitespace-nowrap">
                                      Duplicate
                                    </div>
                                  </div>
                                )}
                              </td>
                              <td className="px-5 py-4 text-gray-800 dark:text-white max-w-[220px] font-medium overflow-hidden whitespace-nowrap text-ellipsis" title={ticket.name}>
                                {ticket.name}
                              </td>
                              <td className="px-5 py-4 text-gray-600 dark:text-gray-300 max-w-[260px] overflow-hidden whitespace-nowrap text-ellipsis" title={ticket.email}>
                                {ticket.email}
                              </td>
                              <td className="px-5 py-4 text-gray-800 dark:text-white max-w-[220px] overflow-hidden whitespace-nowrap text-ellipsis" title={ticket.assigned_to || ticket.assign_to || 'Not assigned'}>
                                {(() => {
                                  const assignedValue = ticket.assigned_to || ticket.assign_to;
                                  if (!assignedValue || assignedValue === null || assignedValue === 'null' || (typeof assignedValue === 'string' && assignedValue.trim() === '')) {
                                    return <span className="italic text-gray-500 dark:text-gray-400">Not assigned</span>;
                                  }
                                  // Extract name if format is "Name <email>", otherwise show the value as is
                                  const nameMatch = String(assignedValue).match(/^(.+?)\s*<[^>]+>$/);
                                  return nameMatch ? nameMatch[1].trim() : assignedValue;
                                })()}
                              </td>
                              <td className="px-5 py-4 text-gray-800 dark:text-white">
                                <span className="block">
                                  {ticket.issue_type ?? ticket.issueType ?? '-'}
                                </span>
                              </td>
                              <td className="px-5 py-4 text-gray-800 dark:text-white">
                                <span className="block">
                                  {ticket.issue ?? '-'}
                                </span>
                              </td>
                              <td className="px-5 py-4 text-sm whitespace-nowrap">
                                {(() => {
                                  const severity = getSeverityScore(ticket);
                                  return (
                                    <span className={`inline-block px-4 py-1 rounded-full font-semibold text-xs ${severity.color}`}>{severity.label}</span>
                                  );
                                })()}
                              </td>
                              <td className="px-5 py-4 text-gray-800 dark:text-white text-sm whitespace-nowrap">
                                <span className={`inline-block px-3 py-1 rounded-full font-semibold text-xs ${ticket.status?.toLowerCase() === 'pending'
                                  ? 'bg-blue-100 text-blue-700 border border-blue-300'
                                  : ticket.status?.toLowerCase() === 'close'
                                    ? 'bg-gray-200 text-gray-700 border border-gray-300'
                                    : ticket.status?.toLowerCase() === 'open'
                                      ? 'bg-blue-100 text-blue-700 border border-blue-300'
                                      : ticket.status?.toLowerCase() === 'in process'
                                        ? 'bg-blue-100 text-blue-700 border border-blue-300'
                                        : ticket.status?.toLowerCase() === 'new'
                                          ? 'bg-blue-100 text-blue-700 border border-blue-300'
                                          : 'bg-gray-100 text-gray-700 border border-gray-300'
                                  }`}>
                                  {(ticket.status?.toLowerCase() === 'close' ? 'Closed' : ticket.status) || 'Open'}
                                </span>
                              </td>
                              <td className="px-5 py-4 text-gray-800 dark:text-white text-sm whitespace-nowrap">
                                {new Date(ticket.created_at).toLocaleDateString("en-GB", {
                                  day: "numeric",
                                  month: "short",
                                  year: "2-digit"
                                })}
                              </td>
                              <td className="px-5 py-4 text-gray-800 dark:text-white">
                                <button
                                  onClick={() => {
                                    setSelectedTicket(ticket);
                                    setShowEditModal(true);
                                  }}
                                  className="inline-flex items-center justify-center p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors duration-200"
                                  title="Edit ticket"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5" aria-hidden="true">
                                    <path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                    <path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z"></path>
                                  </svg>
                                </button>
                              </td>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>


            <Pagination

              currentPage={currentPage}

              pageSize={ticketsPerPage}

              totalItems={filteredTickets.length}

              onPageChange={(page) => setCurrentPage(page)}

              onPageSizeChange={(size) => {

                setTicketsPerPage(size);

                setCurrentPage(1);

              }}

              label="tickets"

              className="px-4 py-3 border-t border-gray-200 dark:border-gray-700"

            />



          </ComponentCard>

        </div>

        {/* Modals and detail modal logic can be added here, matching customer tickets page */}

        {showForm && (

          <>

            <div className="fixed inset-0 z-40 bg-black/10 backdrop-blur-[2px]" onClick={() => setShowForm(false)} />

            <div

              className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden p-1 sm:p-4"

              onClick={() => setShowForm(false)}

            >

              <div

                className="relative w-full max-w-[92vw] sm:max-w-md bg-transparent rounded-xl outline-none focus:outline-none overflow-hidden"

                onClick={e => e.stopPropagation()}

              >

                <TicketForm onClose={() => setShowForm(false)} onSuccess={fetchTickets} />

              </div>

            </div>

          </>

        )}

        {/* Edit Ticket Modal */}
        {showEditModal && selectedTicket && (
          <>
            <div className="fixed inset-0 z-40 bg-black/10 backdrop-blur-[2px]" onClick={() => {
              setShowEditModal(false);
              setSelectedTicket(null);
              setAssignSearchQuery('');
              setShowAssignSuggestions(false);
            }} />
            <div
              className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4"
              onClick={() => {
                setShowEditModal(false);
                setSelectedTicket(null);
                setAssignSearchQuery('');
                setShowAssignSuggestions(false);
              }}
            >
              <div
                className="relative w-full max-w-xs sm:max-w-md md:max-w-2xl lg:max-w-3xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl relative max-h-[85vh] flex flex-col overflow-hidden"
                onClick={e => e.stopPropagation()}
              >
                {/* Header */}
                <div className="sticky top-0 z-10 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Update Ticket</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Fields marked with <span className="text-blue-500">*</span> are required</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        try {
                          const userName = localStorage.getItem('userName') || '';
                          const userEmail = localStorage.getItem('userEmail') || '';
                          const displayName = userName || (userEmail ? userEmail.split('@')[0] : '');
                          if (userEmail) {
                            setAssignSearchQuery(`${displayName} <${userEmail}>`);
                            setShowAssignSuggestions(false);
                          }
                        } catch { }
                      }}
                      className="h-10 px-4 rounded-lg font-semibold text-white bg-blue-600 hover:bg-blue-700 transition shadow-sm"
                    >
                      Assign Me
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowEditModal(false);
                        setSelectedTicket(null);
                        setAssignSearchQuery('');
                        setShowAssignSuggestions(false);
                      }}
                      className="text-gray-400 dark:text-gray-500 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100 rounded-lg w-10 h-10 flex items-center justify-center transition-all shadow-sm hover:shadow"
                      aria-label="Close dialog"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 14 14">
                        <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"></path>
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Form Content */}
                <div className="flex-1 overflow-y-auto px-6 py-6">
                  <form
                    id="update-ticket-form"
                    className="space-y-6"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const formData = new FormData(e.currentTarget);
                      const ticketId = selectedTicket.ticket_id || selectedTicket.display_id || selectedTicket._id || selectedTicket.id;

                      if (!ticketId) return;

                      try {
                        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/helpdesk/employee/tickets/${ticketId}`, {
                          method: 'PUT',
                          headers: {
                            'accept': 'application/json',
                            'Content-Type': 'application/json'
                          },
                          body: JSON.stringify({
                            name: formData.get('name') || selectedTicket.name,
                            email: formData.get('email') || selectedTicket.email,
                            issue_type: formData.get('issue_type') || selectedTicket.issue_type || selectedTicket.issueType || '',
                            issue: formData.get('issue') || selectedTicket.issue,
                            severity: selectedTicket.severity || '',
                            message: formData.get('message') || selectedTicket.message || '',
                            assign_to: assignSearchQuery || '',
                          }),
                        });

                        if (response.ok) {
                          setAlertMessage("Ticket updated successfully!");
                          setAlertType("success");
                          setShowAlert(true);
                          setShowEditModal(false);
                          setSelectedTicket(null);
                          setAssignSearchQuery('');
                          setShowAssignSuggestions(false);
                          fetchTickets();
                        } else {
                          setAlertMessage("Failed to update ticket");
                          setAlertType("error");
                          setShowAlert(true);
                        }
                      } catch {
                        setAlertMessage("Failed to update ticket");
                        setAlertType("error");
                        setShowAlert(true);
                      }
                    }}
                  >
                    {/* Basic Information */}
                    <div className="space-y-4">
                      <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2 pb-2 border-b border-gray-200 dark:border-gray-700">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                        </svg>
                        Basic Information
                      </h3>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="edit-name" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                            Name <span className="text-blue-500">*</span>
                          </label>
                          <input
                            id="edit-name"
                            name="name"
                            type="text"
                            required
                            defaultValue={selectedTicket.name}
                            disabled
                            className="w-full h-11 px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 opacity-50 cursor-not-allowed"
                            placeholder="Enter full name"
                          />
                        </div>
                        <div>
                          <label htmlFor="edit-email" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                            Email <span className="text-blue-500">*</span>
                          </label>
                          <input
                            id="edit-email"
                            name="email"
                            type="email"
                            required
                            defaultValue={selectedTicket.email}
                            disabled
                            className="w-full h-11 px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 opacity-50 cursor-not-allowed"
                            placeholder="name@company.com"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="edit-phone" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                            Phone <span className="text-blue-500">*</span>
                          </label>
                          <input
                            id="edit-phone"
                            name="phone"
                            type="tel"
                            required
                            defaultValue={selectedTicket.phone}
                            disabled
                            className="w-full h-11 px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 opacity-50 cursor-not-allowed"
                            placeholder="+91 98765 43210"
                          />
                        </div>
                        <div>
                          <label htmlFor="edit-status" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                            Status <span className="text-blue-500">*</span>
                          </label>
                          <select
                            id="edit-status"
                            name="status"
                            required
                            defaultValue={selectedTicket.status}
                            disabled
                            className="w-full h-11 px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 opacity-50 cursor-not-allowed"
                          >
                            <option value="New">New</option>
                            <option value="Open">Open</option>
                            <option value="Pending">Pending</option>
                            <option value="In Process">In Process</option>
                            <option value="Close">Close</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Ticket Details */}
                    <div className="space-y-4 pt-6">
                      <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2 pb-2 border-b border-gray-200 dark:border-gray-700">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                        </svg>
                        Ticket Details
                      </h3>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="edit-issue-type" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                            Issue Type <span className="text-blue-500">*</span>
                          </label>
                          <input
                            id="edit-issue-type"
                            name="issue_type"
                            type="text"
                            required
                            defaultValue={selectedTicket.issue_type || selectedTicket.issueType || ''}
                            disabled
                            className="w-full h-11 px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 opacity-50 cursor-not-allowed"
                            placeholder="Enter issue type"
                          />
                        </div>
                        <div>
                          <label htmlFor="edit-issue" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                            Issue <span className="text-blue-500">*</span>
                          </label>
                          <input
                            id="edit-issue"
                            name="issue"
                            type="text"
                            required
                            defaultValue={selectedTicket.issue}
                            disabled
                            className="w-full h-11 px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 opacity-50 cursor-not-allowed"
                            placeholder="Enter issue"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Additional Information */}
                    <div className="space-y-4 pt-6">
                      <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2 pb-2 border-b border-gray-200 dark:border-gray-700">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        Additional Information
                      </h3>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div className="relative" ref={assignInputRef}>
                          <label htmlFor="edit-assigned" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                            Assign To
                          </label>
                          <input
                            id="edit-assigned"
                            name="assigned_to"
                            type="text"
                            value={assignSearchQuery}
                            onChange={(e) => {
                              setAssignSearchQuery(e.target.value);
                              setShowAssignSuggestions(e.target.value.trim().length > 0);
                            }}
                            onFocus={() => {
                              if (assignSearchQuery.trim().length > 0) {
                                setShowAssignSuggestions(true);
                              }
                            }}
                            className="w-full h-11 px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                            placeholder="Search agent by name or email"
                          />
                          {showAssignSuggestions && filteredUsers.length > 0 && (
                            <div
                              ref={assignSuggestionsRef}
                              className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl shadow-lg max-h-60 overflow-y-auto"
                            >
                              {filteredUsers.map((user) => (
                                <button
                                  key={user.id}
                                  type="button"
                                  onClick={() => {
                                    setAssignSearchQuery(`${user.fullName} <${user.email}>`);
                                    setShowAssignSuggestions(false);
                                  }}
                                  className="w-full px-4 py-3 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border-b border-gray-200 dark:border-gray-700 last:border-b-0"
                                >
                                  <div className="flex flex-col">
                                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                      {user.fullName}
                                    </span>
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                      {user.email}
                                    </span>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        <div>
                          <label htmlFor="edit-message" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                            Message
                          </label>
                          <textarea
                            id="edit-message"
                            name="message"
                            rows={4}
                            maxLength={250}
                            defaultValue={selectedTicket.message}
                            disabled
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 opacity-50 cursor-not-allowed resize-none"
                            placeholder="Enter any additional notes or comments here..."
                          />
                        </div>
                      </div>
                    </div>
                  </form>
                </div>

                {/* Footer */}
                <div className="sticky bottom-0 z-10 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex flex-col sm:flex-row sm:justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setSelectedTicket(null);
                      setAssignSearchQuery('');
                      setShowAssignSuggestions(false);
                    }}
                    className="h-11 px-6 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 transition font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    form="update-ticket-form"
                    className="h-11 px-6 rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition bg-blue-600 dark:bg-blue-600 hover:bg-blue-700 dark:hover:bg-blue-700"
                  >
                    <span>Update Ticket</span>
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

      </div>

    </div>

  );

}