'use client'

import React, { useEffect, useState, useRef, useCallback } from "react";

// import PageBreadcrumb from "@/components/common/PageBreadCrumb";

import {

Table,

TableBody,

TableHeader,

TableRow,

} from "@/components/ui/table";


import { ArrowDown, ArrowUp, Briefcase } from "lucide-react";
import DashboardHeader from '@/components/header/DashboardHeader';

import { ActionBar } from "@/components/header/actionbar";

import * as XLSX from "xlsx";

// import DatePicker from "react-datepicker";

// import "react-datepicker/dist/react-datepicker.css";

import 'react-phone-input-2/lib/style.css';

import { useRouter, useSearchParams } from "next/navigation";

import { Suspense } from "react";

import Pagination from "@/components/tables/Pagination";

import Loader from "@/components/Loader";

import Alert from "@/components/ui/alert/Alert";

 

type Ticket = {

id?: string;

_id?: string;

name: string;

email: string;

phone: string | null;

issue_type: string;

issue: string;

status: string;

message: string;

device: string;

severity?: string;

created_at: string;

assigned_to?: string | null;

score?: number;

ticket_id?: string;

display_id?: string;

};

type CustomerRecord = {
  customer_id?: string | number;
  id?: string;
  _id?: string;
  full_name?: string;
  fullName?: string;
  name?: string;
  email?: string;
  phone?: string | null;
  mobile?: string | null;
};

 

function TicketsPageInner() {

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

const router = useRouter();

const searchParams = useSearchParams();

const [selectedIds, setSelectedIds] = useState<string[]>([]);

const [updatingTicketId, setUpdatingTicketId] = useState<string | null>(null);

const [forceUpdate, setForceUpdate] = useState(0);

const [clickedTicketId, setClickedTicketId] = useState<string | null>(null);

const [showEditModal, setShowEditModal] = useState(false);

const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

const [users, setUsers] = useState<Array<{ id: string; fullName: string; email: string }>>([]);

const [assignSearchQuery, setAssignSearchQuery] = useState("");

const [showAssignSuggestions, setShowAssignSuggestions] = useState(false);

const assignInputRef = useRef<HTMLInputElement>(null);

const assignSuggestionsRef = useRef<HTMLDivElement>(null);

// Persist first-seen timestamps to avoid immediate overdue on new tickets

const firstSeenRef = useRef<Record<string, number>>({});

useEffect(() => {

try {

const saved = localStorage.getItem('customerTicketFirstSeen');

if (saved) {

 const parsed = JSON.parse(saved) as Record<string, number>;

 if (parsed && typeof parsed === 'object') {

   firstSeenRef.current = parsed;

 }

}

} catch {}

}, []);

 

// Real-time timer for dynamic SLA updates - updates every 9 seconds to avoid excessive re-renders

const [now, setNow] = useState<number>(Date.now());

useEffect(() => {

const intervalId = setInterval(() => {

setNow(Date.now());

}, 90000); // Changed from 1000ms to 9000ms (9 seconds)

return () => clearInterval(intervalId);

}, []);

 

 

// --- ALERT STATE ---

const [alertMessage, setAlertMessage] = useState("");

const [alertType, setAlertType] = useState<'success' | 'error' | ''>("");

const [showAlert, setShowAlert] = useState(false);

// Auto-hide alert after 5 seconds

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

// Function to pass to form

 

// Remove DUMMY_TICKETS and related logic

// const DUMMY_TICKETS = useMemo(() => ([ ... ]), []);

 

// Update fetchTickets to not use DUMMY_TICKETS

const fetchTickets = useCallback(() => {

setLoading(true);

setError("");

 fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/helpdesk/tickets`)

.then((res) => res.json())

.then((data) => {

 let tickets = [];

 if (Array.isArray(data) && data.length > 0) {

   tickets = data.map(ticket => ({ ...ticket }));

 } else {

   tickets = [];

 }

 console.log('Tickets API response:', data);

 const sortedTickets = (tickets as Ticket[]).sort(

   (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()

 );

 console.log('Sorted tickets:', sortedTickets.map(t => ({ id: t.id, name: t.name, status: t.status })));

 

 setTicketsData(sortedTickets);

 setFilteredTickets(sortedTickets);

 setCurrentPage(1);

})

.catch(() => {

 setTicketsData([]);

 setFilteredTickets([]);

 setError("");

})

.finally(() => setLoading(false));

}, []);

 

useEffect(() => {

fetchTickets();

}, [fetchTickets]);

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
    } catch {
      // silent fail for suggestions
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

 

// Force refresh if coming from detail page with ?refresh=1

useEffect(() => {

if (searchParams.get('refresh') === '1') {

fetchTickets();

// Remove the param from the URL

const url = new URL(window.location.href);

url.searchParams.delete('refresh');

window.history.replaceState({}, '', url.pathname);

}

}, [searchParams, fetchTickets]);

 

// Combined filtering and sorting effect for text search and timeline filtering

useEffect(() => {

let filtered = [...ticketsData];

 

// Apply text filtering

if (filterQuery.trim() !== "") {

const query = filterQuery.toLowerCase();

filtered = filtered.filter((ticket) => {

  // Handle special filter fields
  if (filterField === "agent") {
    const agentValue = ticket.assigned_to || "";
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

 

// Apply timeline filtering

if (timelineFilter && timelineFilter !== "" && timelineFilter !== "all") {

const now = new Date();

 

filtered = filtered.filter((ticket) => {

  const ticketDate = new Date(ticket.created_at);

 

  switch (timelineFilter) {

    case 'today':

      const today = new Date();

      today.setHours(0, 0, 0, 0);

      const endOfToday = new Date();

      endOfToday.setHours(23, 59, 59, 999);

      return ticketDate >= today && ticketDate <= endOfToday;

     

    case 'yesterday':

      const yesterday = new Date();

      yesterday.setDate(yesterday.getDate() - 1);

      yesterday.setHours(0, 0, 0, 0);

      const endOfYesterday = new Date();

      endOfYesterday.setDate(endOfYesterday.getDate() - 1);

      endOfYesterday.setHours(23, 59, 59, 999);

      return ticketDate >= yesterday && ticketDate <= endOfYesterday;

     

    case 'last12':

      const last12Hours = new Date(now.getTime() - 12 * 60 * 60 * 1000);

      return ticketDate >= last12Hours;

     

    case 'thisweek':

      const startOfWeek = new Date(now);

      startOfWeek.setDate(now.getDate() - now.getDay());

      startOfWeek.setHours(0, 0, 0, 0);

      return ticketDate >= startOfWeek;

     

    case 'thismonth':

      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      startOfMonth.setHours(0, 0, 0, 0);

      return ticketDate >= startOfMonth;

     

    case 'lastweek':

      const startOfLastWeek = new Date(now);

      startOfLastWeek.setDate(now.getDate() - now.getDay() - 7);

      startOfLastWeek.setHours(0, 0, 0, 0);

      const endOfLastWeek = new Date(now);

      endOfLastWeek.setDate(now.getDate() - now.getDay() - 1);

      endOfLastWeek.setHours(23, 59, 59, 999);

      return ticketDate >= startOfLastWeek && ticketDate <= endOfLastWeek;

     

    case 'lastmonth':

      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

      startOfLastMonth.setHours(0, 0, 0, 0);

      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

      endOfLastMonth.setHours(23, 59, 59, 999);

      return ticketDate >= startOfLastMonth && ticketDate <= endOfLastMonth;

     

    case 'last30':

      const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      return ticketDate >= last30Days;

     

    case 'custom':

      if (pendingCustomRange[0] && pendingCustomRange[1]) {

        const startDate = new Date(pendingCustomRange[0]);

        startDate.setHours(0, 0, 0, 0);

        const endDate = new Date(pendingCustomRange[1]);

        endDate.setHours(23, 59, 59, 999);

        return ticketDate >= startDate && ticketDate <= endDate;

      }

      return true;

     

    default:

      return true;

  }

});

}

 

// Apply sorting to filtered results

const newestFirst = filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

 

setFilteredTickets(newestFirst);

setCurrentPage(1);

}, [filterQuery, filterField, ticketsData, timelineFilter, pendingCustomRange]);

 

// Helper to get a unique key for ticket identification

function getTicketKey(ticket: Ticket): string {

 return String(ticket._id || ticket.id || ticket.ticket_id || ticket.display_id || '');

}

 

// Helper to check if a ticket is a duplicate

function isDuplicateTicket(ticket: Ticket, allTickets: Ticket[]) {

const sameTickets = allTickets.filter(t =>

t.name === ticket.name &&

t.email === ticket.email &&

t.issue_type === ticket.issue_type &&

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

 

// Initialize first-seen timestamps for new tickets (separate from filtering/sorting)

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

 localStorage.setItem('customerTicketFirstSeen', JSON.stringify(map));

}

} catch {}

}, [ticketsData]); // Only depend on ticketsData

 

// Sort tickets by priority (overdue New tickets first, then by creation date)

useEffect(() => {

// Only sort if we have tickets data

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

 localStorage.setItem('customerTicketFirstSeen', JSON.stringify(map));

}

} catch {}

 

const sortedTickets = [...ticketsData].sort((a, b) => {

const priorityA = getPriorityScore(a);

const priorityB = getPriorityScore(b);

 

if (priorityA !== priorityB) {

 return priorityB - priorityA; // Higher priority first

}

 

// If same priority, sort by creation date (newest first)

return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();

});

 

setFilteredTickets(sortedTickets);

}, [ticketsData, now, getPriorityScore]); // Now depends on real-time updates

 

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

Phone: ticket.phone,

Issue: ticket.issue,

Severity: ticket.severity,

"Date": `${new Date(ticket.created_at).toLocaleDateString("en-GB", {

 day: "numeric",

 month: "short",

 year: "2-digit"

})}`

}));

// Add timestamp to filename

const now = new Date();

const pad = (n: number) => n.toString().padStart(2, '0');

const timestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;

if (type === 'csv') {

exportToCSV(dataToExport, `tickets_${timestamp}.csv`);

} else {

const worksheet = XLSX.utils.json_to_sheet(dataToExport);

const workbook = XLSX.utils.book_new();

XLSX.utils.book_append_sheet(workbook, worksheet, "Tickets");

XLSX.writeFile(workbook, `tickets_${timestamp}.xlsx`);

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

 const target = event.target as Element;

 

 // NEVER close if clicking on ANY calendar-related elements

 if (

   target.closest(".flatpickr-calendar") ||

   target.closest(".flatpickr-day") ||

   target.closest(".flatpickr-month") ||

   target.closest(".flatpickr-weekday") ||

   target.closest(".flatpickr-current-month") ||

   target.closest(".flatpickr-months") ||

   target.closest(".flatpickr-prev-month") ||

   target.closest(".flatpickr-next-month") ||

   target.closest(".flatpickr-time") ||

   target.closest(".flatpickr-hour") ||

   target.closest(".flatpickr-minute") ||

   target.closest(".flatpickr-am-pm") ||

   target.closest(".flatpickr-wrapper") ||

   target.closest(".flatpickr-rContainer") ||

   target.closest(".flatpickr-innerContainer") ||

   target.closest(".flatpickr-weekdays") ||

   target.closest(".flatpickr-days") ||

   target.closest(".dayContainer") ||

   target.closest("#date-range-picker") ||

   target.closest("[data-flatpickr]") ||

   target.closest("[data-custom-popover]") ||

   target.hasAttribute('data-flatpickr') ||

   target.classList.contains('flatpickr-input') ||

   // Additional calendar elements

   target.closest('.flatpickr') ||

   target.closest('[data-flatpickr-calendar]') ||

   target.closest('.flatpickr-calendar.open') ||

   target.closest('.flatpickr-calendar.arrowTop') ||

   target.closest('.flatpickr-calendar.arrowBottom') ||

   // Check if target is inside any calendar container

   document.querySelector('.flatpickr-calendar.open')?.contains(target)

 ) {

   return; // Don't close the popover if clicking on calendar

 }

 

 // Don't close if clicking on timeline select dropdown

 if (target.closest("select")) {

   return;

 }

 

 // Only close if clicking completely outside ActionBar and calendar

 if (!target.closest(".ActionBar") && !document.querySelector('.flatpickr-calendar.open')) {

   setShowCustomPopover(false);

 }

}

}

if (showCustomPopover) {

// Much longer delay to prevent immediate closure when opening

const timer = setTimeout(() => {

 document.addEventListener("mousedown", handleClickOutside);

}, 1000); // Increased to 1 second to give more time for calendar interaction

return () => {

 clearTimeout(timer);

 document.removeEventListener("mousedown", handleClickOutside);

};

} else {

document.removeEventListener("mousedown", handleClickOutside);

}

return () => {

document.removeEventListener("mousedown", handleClickOutside);

};

}, [showCustomPopover, pendingCustomRange]);

 

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

 fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/helpdesk/customer/options`)
.then(res => res.json())
 .then((data: unknown) => {
   if (Array.isArray(data) && data.length > 0 && (data[0] as Record<string, unknown>).type === "parent") {
     const parents = (data as Array<{ label?: string; children?: Array<{ label?: string } | string> }>);
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

 

// 3. Remove static ISSUE_TYPE_OPTIONS and ISSUE_OPTIONS

// 4. Pass options as props to TicketForm

// 5. Update TicketForm to accept and use these props

const TicketForm = ({ onClose, onSuccess, issueTypeOptions = [], issueOptions = [], optionsLoading = false, optionsError = "", typeToIssues = {} }: {

onClose: () => void,

onSuccess: () => void,

issueTypeOptions?: string[],

issueOptions?: string[],

optionsLoading?: boolean,

optionsError?: string,

typeToIssues?: Record<string, string[]>

}) => {

// 1. Form state

const [form, setForm] = React.useState({

email: "",

issue_type: "",

issue: "",

message: ""

});

const [emailError, setEmailError] = React.useState("");

const [customerDetails, setCustomerDetails] = React.useState<{

name: string;

email: string;

phone: string;

} | null>(null);

const [fetchingCustomer, setFetchingCustomer] = React.useState(false);

const [messageError, setMessageError] = React.useState("");

const [loading, setLoading] = React.useState(false);

const [error, setError] = React.useState("");

const [issueTypeError, setIssueTypeError] = React.useState("");

const [issueError, setIssueError] = React.useState("");

  const [allCustomers, setAllCustomers] = React.useState<CustomerRecord[]>([]);
 
  const [loadingCustomers, setLoadingCustomers] = React.useState(false);

  const [customerFetchError, setCustomerFetchError] = React.useState("");

  const [customerSearchQuery, setCustomerSearchQuery] = React.useState("");

  const [showCustomerSuggestions, setShowCustomerSuggestions] = React.useState(false);

  const customerInputWrapperRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {

    let isMounted = true;

    const loadCustomers = async () => {

      setLoadingCustomers(true);

      setCustomerFetchError("");

      try {

        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/customers/?page=1&size=1000`);

        if (!response.ok) {

          throw new Error("Failed to fetch customers");

        }

        const payload: unknown = await response.json();

        let customers: CustomerRecord[] = [];

        if (

          payload &&

          typeof payload === 'object' &&

          Array.isArray((payload as { data?: CustomerRecord[] }).data)

        ) {

          customers = (payload as { data: CustomerRecord[] }).data;

        } else if (Array.isArray(payload)) {

          customers = payload as CustomerRecord[];

        }

        if (isMounted) {

          setAllCustomers(customers);

        }

      } catch {

        if (isMounted) {

          setCustomerFetchError("Unable to load customers list");

        }

      } finally {

        if (isMounted) {

          setLoadingCustomers(false);

        }

      }

    };

    loadCustomers();

    return () => {

      isMounted = false;

    };

  }, []);

  React.useEffect(() => {

    function handleClickOutside(event: MouseEvent) {

      if (customerInputWrapperRef.current && !customerInputWrapperRef.current.contains(event.target as Node)) {

        setShowCustomerSuggestions(false);

      }

    }

    if (showCustomerSuggestions) {

      document.addEventListener('mousedown', handleClickOutside);

    }

    return () => {

      document.removeEventListener('mousedown', handleClickOutside);

    };

  }, [showCustomerSuggestions]);

  const filteredCustomerSuggestions = React.useMemo(() => {

    if (customerSearchQuery.trim().length < 2) return [];

    const query = customerSearchQuery.trim().toLowerCase();

    return allCustomers

      .filter((customer) => {

        const email = (customer.email || "").toLowerCase().trim();

        const name = (customer.full_name || customer.fullName || customer.name || "").toLowerCase().trim();

        // Match if query appears in email OR name
        const emailMatch = email.includes(query);

        const nameMatch = name.includes(query);

        return emailMatch || nameMatch;

      })

      .slice(0, 6);

  }, [customerSearchQuery, allCustomers]);

  const mapCustomerRecordToDetails = (customer: CustomerRecord) => ({

    name: customer.full_name || customer.fullName || customer.name || '',

    email: customer.email || '',

    phone: customer.phone || customer.mobile || '',

  });

 

const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {

const { name, value } = e.target;

setForm({ ...form, [name]: value, ...(name === "issue_type" ? { issue: "" } : {}) });

 

 // Real-time message validation as user types

 if (name === "message") {

   const messageValidationError = validateMessage(value);

   setMessageError(messageValidationError);

 }

};

const handleEmailInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {

const value = e.target.value;

setForm(prev => ({ ...prev, email: value }));

setCustomerSearchQuery(value);

const emailValidationError = validateEmail(value);

setEmailError(emailValidationError);

setCustomerDetails(null);

if (!value.trim()) {

  setShowCustomerSuggestions(false);

  return;

}

if (value.trim().length >= 2) {

  setShowCustomerSuggestions(true);

} else {

  setShowCustomerSuggestions(false);

}

};

const handleCustomerSuggestionSelect = (customer: CustomerRecord) => {

const details = mapCustomerRecordToDetails(customer);

const identifier = customer.email || "";

setForm(prev => ({ ...prev, email: identifier }));

setCustomerSearchQuery(identifier);

setCustomerDetails(details);

setEmailError("");

setShowCustomerSuggestions(false);

};

 

// Fetch customer details by email

const fetchCustomerDetails = async (email: string) => {

if (!email.trim()) {

 setCustomerDetails(null);

 return;

}

setFetchingCustomer(true);

try {

 const normalizedEmail = email.trim().toLowerCase();

 const localMatch = allCustomers.find((cust) => (cust.email || '').toLowerCase() === normalizedEmail);

 if (localMatch) {

   setCustomerDetails(mapCustomerRecordToDetails(localMatch));

   setEmailError("");

   setFetchingCustomer(false);

   return;

 }

 if (allCustomers.length > 0) {

   setCustomerDetails(null);

   setEmailError("Customer does not exist with this mail id");

   setFetchingCustomer(false);

   return;

 }

 const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/customers/?page=1&size=1000`);

 if (response.ok) {

   const payload: unknown = await response.json();

   const customers = Array.isArray((payload as { data?: CustomerRecord[] })?.data)

     ? (payload as { data: CustomerRecord[] }).data

     : Array.isArray(payload)

       ? (payload as CustomerRecord[])

       : [];

   if (allCustomers.length === 0) {

     setAllCustomers(customers);

   }

   const found = customers.find((cust) => (cust.email || '').toLowerCase() === normalizedEmail);

   if (found) {

     setCustomerDetails(mapCustomerRecordToDetails(found));

     setEmailError("");

   } else {

     setCustomerDetails(null);

     setEmailError("Customer does not exist with this mail id");

   }

 } else {

   setCustomerDetails(null);

   setEmailError("Failed to fetch customer details");

 }

} catch {

 setCustomerDetails(null);

 setEmailError("Failed to fetch customer details");

} finally {

 setFetchingCustomer(false);

}

};

 

// Email validation regex pattern

const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

 

const validateEmail = (email: string): string => {

 if (!email.trim()) {

   return "Email is required.";

 }

 

 // Check for basic format

 if (!email.includes("@")) {

   return "Email must contain @ symbol";

 }

 

 // Check for multiple @ symbols

 if (email.split("@").length > 2) {

   return "Email cannot contain multiple @ symbols";

 }

 

 // Check for proper email format using regex

 if (!emailRegex.test(email)) {

   return "Please enter a valid email address (e.g., user@example.com)";

 }

 

 // Check for common invalid patterns

 if (email.startsWith(".") || email.endsWith(".")) {

   return "Email cannot start or end with a dot";

 }

 

 if (email.includes("..")) {

   return "Email cannot contain consecutive dots";

 }

 

 if (email.includes("@.") || email.includes(".@")) {

   return "Invalid email format around @ symbol";

 }

 

 // Check domain part

 const [, domain] = email.split("@");

 if (!domain || domain.length < 3) {

   return "Invalid domain in email address";

 }

 

 if (!domain.includes(".")) {

   return "Email domain must contain a dot";

 }

 

 // Check for valid characters

 const validEmailChars = /^[a-zA-Z0-9._%+-@]+$/;

 if (!validEmailChars.test(email)) {

   return "Email contains invalid characters";

 }

 

 return ""; // No error

};

 

const handleEmailBlur = () => {

 // Delay closing dropdown to allow click events to register first
 setTimeout(() => {
   setShowCustomerSuggestions(false);

   const emailValidationError = validateEmail(form.email);

   if (emailValidationError) {

     setEmailError(emailValidationError);

     setCustomerDetails(null);

     return;

   }

   fetchCustomerDetails(form.email);
 }, 200);

};

 

const handleIssueTypeBlur = () => {

setIssueTypeError(form.issue_type ? "" : "Issue Type is required.");

};

const handleIssueBlur = () => {

setIssueError(form.issue ? "" : "Issue is required.");

};

// Character count validation function

const validateMessage = (message: string): string => {

 if (!message.trim()) {

   return "Message is required.";

 }

 

 // Count characters (excluding leading/trailing whitespace)

 const charCount = message.trim().length;

 

 if (charCount < 10) {

   return "Message must be at least 10 characters.";

 }

 

 if (charCount > 100) {

   return "Message cannot exceed 100 characters.";

 }

 

 return ""; // No error

};

 

// Helper function to count characters in a message

const getCharCount = (message: string): number => {

 return message.trim().length;

};

 

const handleMessageBlur = () => {

 const messageValidationError = validateMessage(form.message);

 setMessageError(messageValidationError);

};

const isFormValid = form.email && customerDetails && form.message && !emailError && !messageError && form.issue_type && form.issue && validateEmail(form.email) === "" && validateMessage(form.message) === "";

const handleSubmit = async (e: React.FormEvent) => {

e.preventDefault();

setLoading(true);

setError("");

 

// Validate email before submission

const emailValidationError = validateEmail(form.email);

if (emailValidationError) {

 setEmailError(emailValidationError);

 setLoading(false);

 return;

}

 

// Validate message before submission

const messageValidationError = validateMessage(form.message);

if (messageValidationError) {

 setMessageError(messageValidationError);

 setLoading(false);

 return;

}

 

if (!customerDetails) {

 setEmailError("Customer does not exist with this mail id");

 setLoading(false);

 return;

}

if (!form.issue_type) {

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

 const ticketData = {

   name: customerDetails.name,

   email: customerDetails.email,

   phone: customerDetails.phone,

   issue_type: form.issue_type,

   issue: form.issue,

   device: '',

   severity: '',

   message: form.message,

   status: "New"

 };

 const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/helpdesk/tickets`, {

   method: "POST",

   headers: { "Content-Type": "application/json" },

   body: JSON.stringify(ticketData),

 });

 if (!response.ok) throw new Error("Failed to submit ticket");

 

 const responseData = await response.json();

 // Optimistically insert the new ticket at the top for immediate visibility
 try {
   const normalizedId = String(
     (responseData?._id && typeof responseData._id === 'object' && (responseData._id as { $oid?: string }).$oid)
       ? (responseData._id as { $oid?: string }).$oid
       : responseData?._id || responseData?.id || responseData?.ticket_id || responseData?.display_id || ''
   );
   const createdAt = responseData?.created_at || new Date().toISOString();
   const optimisticTicket: Ticket = {
     name: ticketData.name,
     email: ticketData.email,
     phone: ticketData.phone,
     issue_type: ticketData.issue_type,
     issue: ticketData.issue,
     device: ticketData.device,
     severity: ticketData.severity,
     message: ticketData.message,
     status: 'New',
     created_at: createdAt,
     id: typeof responseData?.id === 'string' ? responseData.id : undefined,
     _id: typeof responseData?._id === 'string' ? responseData._id : (normalizedId || undefined),
     ticket_id: responseData?.ticket_id,
     display_id: responseData?.display_id,
   } as Ticket;

   setTicketsData(prev => [optimisticTicket, ...prev]);
   setFilteredTickets(prev => [optimisticTicket, ...prev]);
   setCurrentPage(1);

   // Record grace period locally so it doesn't turn red immediately
   if (normalizedId) {
     try {
       const map = { ...firstSeenRef.current };
       map[normalizedId] = Date.now();
       firstSeenRef.current = map;
       localStorage.setItem('customerTicketFirstSeen', JSON.stringify(map));
     } catch {}
   }
 } catch {}

 // Record grace period locally so it doesn't turn red immediately (safety)
 try {
   const newKey = String(responseData?._id?.$oid || responseData?._id || responseData?.id || responseData?.ticket_id || responseData?.display_id || '');
   if (newKey) {
     const map = { ...firstSeenRef.current };
     map[newKey] = Date.now();
     firstSeenRef.current = map;
     localStorage.setItem('customerTicketFirstSeen', JSON.stringify(map));
   }
 } catch {}

 // Send confirmation email in background (no await, no error shown to user)

 (async () => {

   try {

     // Fetch confirmation message from API

     let confirmationMessage = '';

   

     try {

       const confirmationRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/helpdesk/confirmation-message/coustomer`);

       const confirmationData = await confirmationRes.json();

       if (confirmationData?.message) {

         confirmationMessage = `Dear ${customerDetails.name},\n\n${confirmationData.message}`;

       }

     } catch {

       // API failed, no message will be sent

     }

   

     // Send confirmation email

     const emailPayload = {

       to_email: customerDetails.email,

       subject: 'Thank you for your ticket submission',

       body: confirmationMessage || `Dear ${customerDetails.name},\n\nThank you for submitting your ticket. We have received your inquiry and will get back to you soon.\n\nBest regards,\nYour Support Team`

     };

   

     await fetch(`${process.env.NEXT_PUBLIC_API_URL}/send-email`, {

       method: 'POST',

       headers: { 'Content-Type': 'application/json' },

       body: JSON.stringify(emailPayload),

     });

   } catch {

     // Silently ignore mail errors

   }

 })();

 

 setLoading(false);

 onSuccess();

 onClose();

 // Show success alert

 setAlertMessage("Customer ticket created successfully!");

 setAlertType("success");

 setShowAlert(true);

 

 // Refresh the tickets data to ensure it's updated from backend

 await fetchTickets();

 // Ensure we are on the first page and scrolled to top
 try {
   setCurrentPage(1);
   const container = document.querySelector('.min-w-[1200px]');
   if (container && 'scrollTo' in container) {
     (container as HTMLElement).scrollTo({ left: 0, top: 0, behavior: 'smooth' });
   } else {
     window.scrollTo({ top: 0, behavior: 'smooth' });
   }
 } catch {}

} catch {

 setLoading(false);

 setError("Failed to submit ticket. Try again.");

}

};

return (

<div className="relative flex items-center justify-center px-4 bg-transparent">

 <div className="w-full max-w-md bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-2xl relative">

   <button

     onClick={onClose}

     className="absolute top-2 right-2 text-gray-500 hover:text-gray-800 text-2xl font-bold"

     aria-label="Close"

   >

     &times;

   </button>

   <h2 className="text-center text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6">

     Create Ticket

   </h2>

   <form onSubmit={handleSubmit} className="space-y-4">

     <div>

       <label className="block text-gray-700 dark:text-gray-200 mb-1 font-medium">

         Email <span className="text-blue-500">*</span>

       </label>

       <div className="relative" ref={customerInputWrapperRef}>

       <input

         type="email"

         name="email"

         placeholder="Enter your email address"

           autoComplete="off"

         value={form.email}

           onChange={handleEmailInputChange}

         onBlur={handleEmailBlur}

           onFocus={() => {

             if (form.email.trim().length >= 2) {

               setShowCustomerSuggestions(true);

             }

           }}

         required

         className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"

       />

         {showCustomerSuggestions && (

           <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg max-h-60 overflow-y-auto">

             {loadingCustomers ? (

               <div className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400">Loading customers...</div>

             ) : filteredCustomerSuggestions.length === 0 ? (

               <div className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400">No matching customers</div>

             ) : (

               filteredCustomerSuggestions.map((customer, index) => (

                 <button

                   key={`${customer.email || customer.customer_id || index}`}

                   type="button"

                   onMouseDown={(e) => {
                     e.preventDefault();
                     handleCustomerSuggestionSelect(customer);
                   }}

                   onClick={(e) => {
                     e.preventDefault();
                     handleCustomerSuggestionSelect(customer);
                   }}

                   className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition border-b border-gray-200 dark:border-gray-700 last:border-b-0 cursor-pointer"

                 >

                   <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">

                     {customer.full_name || customer.fullName || customer.name || 'Unknown'}

                   </div>

                   <div className="text-xs text-gray-500 dark:text-gray-400">

                     {customer.email || 'No email'}

                   </div>

                 </button>

               ))

             )}

           </div>

         )}

       </div>

       {emailError && (

         <div className="text-blue-500 text-sm mt-1">{emailError}</div>

       )}

       {customerFetchError && !emailError && (

         <div className="text-blue-500 text-sm mt-1">{customerFetchError}</div>

       )}

       {fetchingCustomer && (

         <div className="bg-blue-50 border border-blue-200 text-blue-600 rounded px-4 py-2 text-sm font-medium mt-1">

           Fetching customer details...

         </div>

       )}

     </div>

     <div>

       <label className="block text-gray-700 dark:text-gray-200 mb-1 font-medium">

         Issue Type <span className="text-blue-500">*</span>

       </label>

       <select

         name="issue_type"

         value={form.issue_type}

         onChange={handleChange}

         onBlur={handleIssueTypeBlur}

         required

         className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"

         disabled={optionsLoading || !!optionsError}

       >

         <option value="">{optionsLoading ? "Loading..." : optionsError ? "Failed to load" : "Select Issue Type"}</option>

         {issueTypeOptions.map((opt, i) => (

           <option key={i} value={opt}>{opt}</option>

         ))}

       </select>

       {issueTypeError && (

         <div className="bg-blue-50 border border-blue-200 text-blue-600 rounded px-4 py-2 text-sm font-medium mt-1">{issueTypeError}</div>

       )}

     </div>

     <div>

       <label className="block text-gray-700 dark:text-gray-200 mb-1 font-medium">

         Issue <span className="text-blue-500">*</span>

       </label>

       <select

         name="issue"

         value={form.issue}

         onChange={handleChange}

         onBlur={handleIssueBlur}

         required

         className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"

         disabled={optionsLoading || !!optionsError}

       >

         <option value="">{optionsLoading ? "Loading..." : optionsError ? "Failed to load" : "Select Issue"}</option>

        {(form.issue_type && typeToIssues[form.issue_type] ? typeToIssues[form.issue_type] : issueOptions).map((opt, i) => (

          <option key={i} value={opt}>{opt}</option>

        ))}

       </select>

       {issueError && (

         <div className="bg-blue-50 border border-blue-200 text-blue-600 rounded px-4 py-2 text-sm font-medium mt-1">{issueError}</div>

       )}

     </div>

     <div>

       <label className="block text-gray-700 dark:text-gray-200 mb-1 font-medium">

         Message <span className="text-blue-500">*</span>

       </label>

       <div className="relative">

         <textarea

           name="message"

           placeholder=""

           value={form.message}

           onChange={handleChange}

           onBlur={handleMessageBlur}

           required

           rows={4}

           className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"

         />

         <div className="absolute bottom-2 right-2 text-xs text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 px-2 py-1 rounded">

           {getCharCount(form.message)}/100 characters

         </div>

       </div>

       {messageError && (

         <div className="text-blue-500 text-sm mt-1">{messageError}</div>

       )}

     </div>

     <button

       type="submit"

       className={`w-full bg-blue-600 text-white py-2 rounded-lg flex items-center justify-center transition ${loading ? 'cursor-not-allowed' : ''} ${isFormValid && !loading ? 'hover:bg-blue-700' : 'opacity-50'}`}

       disabled={loading || !isFormValid}

     >

               {loading ? null : null}

       {loading ? 'Submitting...' : 'Submit'}

     </button>

     {error && <div className="text-blue-500 mb-2">{error}</div>}

   </form>

 </div>

</div>

);

};

// --- End TicketForm ---

 

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

const typeScore = severityScores.find(s => s.score_name === `Type: ${ticket.issue_type}`);

if (typeScore) score = Number(typeScore.score_value) || 0;

}

// Return numeric-only result in label

if (score > 0) return { label: String(score), color: '' };

return { label: '-', color: '' };

}

 

 

 

 

 

// Function to update ticket status to "Open" when clicked

const updateTicketStatusToOpen = async (ticket: Ticket) => {

const ticketId = ticket._id || ticket.id;

if (!ticketId) return;

 

// Set loading state for clicked ticket

setClickedTicketId(ticketId);

 

try {

// Only update if status is "New" or "new"

if (ticket.status && (ticket.status.toLowerCase() === 'new' || ticket.status.toLowerCase() === 'pending')) {

  const targetKey = getTicketKey(ticket);

 console.log('Updating ticket status to Open:', {

   ticketId,

   currentStatus: ticket.status,

   ticketObject: ticket

 });

 

 if (ticketId) {

    // Set loading state for this specific ticket

    setUpdatingTicketId(targetKey || String(ticketId));

 

   const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/helpdesk/tickets/${ticketId}/status`, {

     method: 'PUT',

     headers: { 'Content-Type': 'application/json' },

     body: JSON.stringify({

       status: 'Open',

       ticket_status: 'Open',  // Try alternative field name

       data: {

         status: 'Open'

       }

     }),

   });

 

   if (response.ok) {

     // Response data available but not used in current implementation

     await response.json();

   

      // Immediately update the local state for instant visual feedback

      setTicketsData(prevTickets => {

        const updated = prevTickets.map(t => {

          const matches = getTicketKey(t) === targetKey;

          return matches ? { ...t, status: 'Open' } : t;

        });

        return updated;

      });

   

      setFilteredTickets(prevTickets => {

        const updated = prevTickets.map(t => {

          const matches = getTicketKey(t) === targetKey;

          return matches ? { ...t, status: 'Open' } : t;

        });

        return updated;

      });

   

     // Force immediate re-render

     setForceUpdate(prev => prev + 1);

   

     // Add a status change message to the thread

     const statusChangeMessage = {

       ticket_id: String(ticketId),

       sender_id: "99",

       sender_type: "Admin",

       message: `Status automatically changed from ${ticket.status} to Open`,

       status: 'Open',

     };

   

     // Add the status change message to thread

     const threadRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/helpdesk/customer/thread`, {

       method: 'POST',

       headers: { 'Content-Type': 'application/json' },

       body: JSON.stringify(statusChangeMessage),

     });

   

     if (threadRes.ok) {

       // Status change message added to thread

     }

   

     // Show success alert

     setAlertMessage("Ticket status updated to Open");

     setAlertType("success");

     setShowAlert(true);

   

     // Force component re-render

     setForceUpdate(prev => prev + 1);

   

     // Alternative approach: Update state directly

     setTimeout(() => {

        setTicketsData(currentTickets => {

          const newTickets = currentTickets.map(t => {

            if (getTicketKey(t) === targetKey) {

             return { ...t, status: 'Open' };

           }

           return t;

         });

         return newTickets;

       });

     

        setFilteredTickets(currentFiltered => {

          const newFiltered = currentFiltered.map(t => {

            if (getTicketKey(t) === targetKey) {

             return { ...t, status: 'Open' };

           }

           return t;

         });

         return newFiltered;

       });

     }, 50);

   

     // Final refresh after alternative update

     setTimeout(() => {

       fetchTickets();

     }, 200);

   } else {

     console.error('Failed to update status:', response.status, response.statusText);

   

     // Show error alert

     setAlertMessage("Failed to update ticket status");

     setAlertType("error");

     setShowAlert(true);

   }

 }

} else {

 // Ticket status not updated - current status is not new/pending

}

} catch (error) {

console.error('Failed to update ticket status:', error);

} finally {

// Clear loading state

setUpdatingTicketId(null);

setClickedTicketId(null);

}

};

 

// Auto-refresh to update urgent status and re-sort tickets

useEffect(() => {

const interval = setInterval(() => {

// Skip auto-refresh while create-ticket modal OR custom date popover is open to avoid closing the picker

if (showForm || showCustomPopover) return;

 

// Force re-render to check urgent status

setForceUpdate(prev => prev + 1);

 

 

}, 2000); // check every 2 seconds for more responsive urgency updates

 

return () => clearInterval(interval);

}, [showForm, showCustomPopover]);

 

return (
  <div className="relative min-h-screen bg-gray-50 dark:bg-gray-900">
    <div className="mx-4 md:mx-6 mt-6 mb-8">
      <DashboardHeader
        title="HelpDesk - Customer Tickets"
        subtitle="Manage and track customer helpdesk tickets with comprehensive filtering and analysis tools."
        icon={Briefcase}
        gradientFrom="from-blue-900"
        gradientTo="to-indigo-800"
        actions={null}
      />
    </div>

{/* Inline alerts below header */}
{showAlert && (
  <div className="mt-6 ml-auto max-w-sm relative z-[2147483647]">
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
         <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
         <circle cx="9" cy="7" r="4"/>
         <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
         <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
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
             <div className="relative bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-700 ease-out shadow-sm" style={{width: '100%'}}>
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
                   <rect x="4" y="4" width="16" height="16" rx="2"/>
                   <path d="M12 8v4l2 2"/>
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
             <div className="relative bg-gradient-to-r from-blue-500 to-blue-500 h-3 rounded-full transition-all duration-700 ease-out shadow-sm" style={{width: ticketsData.length > 0 ? `${(ticketsData.filter(t => t.status && t.status.toLowerCase() === 'pending').length / ticketsData.length) * 100}%` : '0%'}}>
               <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent rounded-full animate-pulse"></div>
             </div>
           </div>
           
           {/* Additional info */}
           <div className="mt-3 flex items-center justify-between text-xs text-gray-400 dark:text-gray-500">
             <span>Awaiting response</span>
             <span className="font-medium">{ticketsData.length > 0 ? `${Math.round((ticketsData.filter(t => t.status && t.status.toLowerCase() === 'pending').length / ticketsData.length) * 100)}%` : '0%'}</span>
           </div>
         </div>
   </div>

       {/* Closed Tickets */}
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
                   <rect x="4" y="4" width="16" height="16" rx="2"/>
                   <path d="M9 12l2 2l4-4"/>
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
                 <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                   </svg>
                   <span className="text-sm font-medium">Resolved</span>
                 </div>
               </div>
               <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Closed tickets</p>
             </div>
           </div>
           
           {/* Enhanced progress bar */}
           <div className="relative w-full bg-gray-100 dark:bg-gray-700 rounded-full h-3 mt-4 overflow-hidden">
             <div className="absolute inset-0 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-full"></div>
             <div className="relative bg-gradient-to-r from-blue-500 to-blue-500 h-3 rounded-full transition-all duration-700 ease-out shadow-sm" style={{width: ticketsData.length > 0 ? `${(ticketsData.filter(t => t.status && t.status.toLowerCase() === 'close').length / ticketsData.length) * 100}%` : '0%'}}>
               <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent rounded-full animate-pulse"></div>
             </div>
   </div>

           {/* Additional info */}
           <div className="mt-3 flex items-center justify-between text-xs text-gray-400 dark:text-gray-500">
             <span>Successfully resolved</span>
             <span className="font-medium">{ticketsData.length > 0 ? `${Math.round((ticketsData.filter(t => t.status && t.status.toLowerCase() === 'close').length / ticketsData.length) * 100)}%` : '0%'}</span>
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
                   <rect x="4" y="4" width="16" height="16" rx="2"/>
                   <path d="M8 12h8M12 8v8"/>
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
                 <div className="flex items-center gap-1 text-violet-600 dark:text-violet-400">
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
             <div className="relative bg-gradient-to-r from-blue-500 to-blue-500 h-3 rounded-full transition-all duration-700 ease-out shadow-sm" style={{width: ticketsData.length > 0 ? `${(ticketsData.filter(t => t.status && t.status.toLowerCase() === 'new').length / ticketsData.length) * 100}%` : '0%'}}>
               <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent rounded-full animate-pulse"></div>
             </div>
</div>

           {/* Additional info */}
           <div className="mt-3 flex items-center justify-between text-xs text-gray-400 dark:text-gray-500">
             <span>Recently created</span>
             <span className="font-medium">{ticketsData.length > 0 ? `${Math.round((ticketsData.filter(t => t.status && t.status.toLowerCase() === 'new').length / ticketsData.length) * 100)}%` : '0%'}</span>
           </div>
         </div>
       </div>    </div>
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
   setTimelineFilter={setTimelineFilter}
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
     { value: "phone", label: "Filter by Phone" },
     { value: "agent", label: "Filter by Agent" },
     { value: "ticket_id", label: "Filter by Ticket ID" },
     { value: "status", label: "Filter by Status" },
     { value: "issue", label: "Filter by Issue" },
     { value: "severity", label: "Filter by Severity" }
        ]}
      />

      {/* Enhanced Tickets Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="px-3 py-4 border-b border-gray-200 dark:border-gray-700">
          
        </div>

   {/* Mobile view - Individual ticket containers */}
        <div className="block sm:hidden space-y-4 p-4">

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
         const isUrgent = isOverdueNewTicket(ticket);

         return (
                <div key={`${ticket.id}-${ticket._id}-${ticket.status}-${forceUpdate}`} className={`${isUrgent ? 'ring-2 ring-blue-500/50' : ''} bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group`}>

             <div className="flex items-start justify-between mb-4">

               <div className="flex items-center gap-3">

                 <input

                   type="checkbox"

                   checked={selectedIds.includes(ticket.id || ticket._id || '')}

                   onChange={handleSelectOne(ticket.id || ticket._id || '')}

                   className="mt-1"

                 />

                 <div

                   className={`font-bold ${clickedTicketId === (ticket._id || ticket.id) ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:opacity-80'} underline text-sm transition-opacity ${isUrgent ? 'text-blue-600 dark:text-blue-400 animate-pulse' : 'text-blue-600 dark:text-blue-400'} ${isDuplicate ? 'relative group' : ''}`}

                     onClick={clickedTicketId === (ticket._id || ticket.id) ? undefined : async () => {

                       // Update status to Open first

                       await updateTicketStatusToOpen(ticket);

                     

                       // Extract the actual database ID from the _id.$oid field

                       let ticketId = null;

                     

                       if (ticket._id && typeof ticket._id === 'object' && (ticket._id as { $oid?: string }).$oid) {

                         ticketId = (ticket._id as { $oid?: string }).$oid;

                       } else if (ticket._id && typeof ticket._id === 'string') {

                         ticketId = ticket._id;

                       } else if (ticket.id && typeof ticket.id === 'string' && ticket.id.length === 24) {

                         ticketId = ticket.id;

                       }

                     

                       if (ticketId) {

                         router.push(`/helpdesk-customer-ticket/${ticketId}`);

                       } else {

                         console.error('No valid database ID found for navigation');

                       }

                     }}

                     title={clickedTicketId === (ticket._id || ticket.id) ? "Opening ticket..." : "Click to view ticket details"}

                   >

                     <div className="flex items-center gap-1">

                       {isDuplicate ? (

                         <span className={`inline-flex items-center gap-1 ${isUrgent ? 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-200 dark:border-blue-800' : 'bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-900/20 dark:text-blue-100 dark:border-blue-700'} border rounded-full px-2 py-1 text-xs font-semibold`}>

                           <span>{ticket.ticket_id || ticket.display_id || ticket.id}</span>

                           {clickedTicketId === (ticket._id || ticket.id) ? (

                             <svg className="w-3 h-3 text-blue-500 animate-spin inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor">

                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 0020 14c0 1.657-.66 3.18-1.724 4.256M4 12a8.001 0 0015.356 2A8.001 8.001 0 004 10c0-1.657.66-3.18 1.724-4.256" />

                             </svg>

                           ) : (

                             <svg className="w-3 h-3 text-gray-600 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">

                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />

                             </svg>

                           )}

                         </span>

                       ) : (

                         <span className={`inline-flex items-center gap-1 ${isUrgent ? 'text-blue-600 dark:text-blue-400 animate-pulse' : 'text-blue-600 dark:text-blue-400'}`}>

                           <span>{ticket.ticket_id || ticket.display_id || ticket.id}</span>

                           {clickedTicketId === (ticket._id || ticket.id) ? (

                             <svg className="w-3 h-3 text-blue-500 animate-spin inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor">

                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 0020 14c0 1.657-.66 3.18-1.724 4.256M4 12a8.001 0 0015.356 2A8.001 8.001 0 004 10c0-1.657.66-3.18 1.724-4.256" />

                             </svg>

                           ) : (

                             <svg className="w-3 h-3 text-gray-400 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">

                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />

                             </svg>

                           )}

                         </span>

                       )}

                     </div>

                     {/* Tooltip centered between Ticket ID and Name (mobile) */}

                     {isDuplicate && (

                       <div
                         className="absolute z-50 hidden group-hover:block pointer-events-none"
                         style={{ left: 'calc(100% + 8px)', top: '50%', transform: 'translateY(-50%)' }}
                       >
                         <div className="bg-gray-800 dark:bg-gray-900 text-white text-xs font-semibold px-3 py-2 rounded-lg shadow-lg whitespace-nowrap">
                           Duplicate
                         </div>
                       </div>

                     )}

                 </div>

               </div>

               <div className="flex items-center gap-2">

                 {isUrgent && (

                   <span className="inline-block px-2 py-1 rounded-full font-semibold text-xs bg-blue-600 text-white border border-blue-700 animate-pulse">

                     URGENT

                   </span>

                 )}

 

                                     <span className={`inline-block px-3 py-1 rounded-full font-semibold text-xs ${severity.color}`}>

                   {severity.label}

                 </span>

               </div>

             </div>

           

             <div className="space-y-4">

               <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">

                 <span className="text-gray-500 dark:text-gray-400 text-sm font-medium w-16">Name:</span>

                 <span className="text-gray-900 dark:text-white text-sm font-medium">{ticket.name || 'No name'}</span>

               </div>

               <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">

                 <span className="text-gray-500 dark:text-gray-400 text-sm font-medium w-16">Email:</span>

                 <span className="text-gray-900 dark:text-white text-sm font-medium truncate">{ticket.email || 'No email'}</span>

               </div>

               <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">

                 <span className="text-gray-500 dark:text-gray-400 text-sm font-medium w-16">Mobile:</span>

                 <span className="text-gray-900 dark:text-white text-sm font-medium">{ticket.phone || '-'}</span>

               </div>

               <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">

                 <span className="text-gray-500 dark:text-gray-400 text-sm font-medium w-16">Issue Type:</span>

                 <span className="text-gray-900 dark:text-white text-sm font-medium">

                   {ticket.issue_type || '-'}

                 </span>

               </div>

               <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">

                 <span className="text-gray-500 dark:text-gray-400 text-sm font-medium w-16 mt-0.5">Issue:</span>

                 <span className="text-gray-900 dark:text-white text-sm font-medium flex-1">

                   {ticket.issue || '-'}

                 </span>

               </div>

               <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">

                 <span className="text-gray-500 dark:text-gray-400 text-sm font-medium w-16">Status:</span>

                 {updatingTicketId === (ticket._id || ticket.id) ? (

                   <span className="inline-flex items-center px-3 py-1 rounded-full font-semibold text-xs bg-gray-100 text-gray-700 border border-gray-300">

                     <svg className="animate-spin -ml-1 mr-2 h-3 w-3 text-gray-500 inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">

                       <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>

                       <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>

                     </svg>

                     Updating...

                   </span>

                 ) : (

                   <span className={`inline-flex items-center px-3 py-1 rounded-full font-semibold text-xs ${

                     ticket.status?.toLowerCase() === 'pending'

                       ? 'bg-blue-100 text-blue-700 border border-blue-300'

                       : ticket.status?.toLowerCase() === 'close'

                       ? 'bg-blue-100 text-blue-700 border border-blue-300'

                       : ticket.status?.toLowerCase() === 'open'

                       ? 'bg-blue-100 text-blue-700 border border-blue-300'

                       : ticket.status?.toLowerCase() === 'in process'

                       ? 'bg-blue-100 text-blue-700 border border-blue-300'

                       : ticket.status?.toLowerCase() === 'new'

                       ? 'bg-blue-100 text-blue-700 border border-blue-300'

                       : 'bg-gray-100 text-gray-700 border border-gray-300'

                   }`}>

                     {ticket.status || 'Open'}

                   </span>

                 )}

               </div>

 

               <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">

                 <span className="text-gray-500 dark:text-gray-400 text-sm font-medium w-16">Date:</span>

                 <span className="text-gray-900 dark:text-white text-sm font-medium">

                   {new Date(ticket.created_at).toLocaleDateString("en-GB", {

                     day: "numeric",

                     month: "short",

                     year: "2-digit"

                   })}

                 </span>

               </div>

 

             </div>

           </div>

         );

       })

     )}

   </div>

 

   {/* Desktop view - Table */}

   <div className="hidden sm:block w-full">

     <div className="w-full overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-gray-100 dark:scrollbar-track-gray-800">

       <div className="min-w-[1200px]">

         <Table className="w-full">

           <TableHeader className="bg-gray-50 dark:bg-gray-700/50">

             <TableRow className="hover:bg-transparent">

               <th className="px-3 py-4 text-left font-semibold text-gray-700 dark:text-gray-300 w-12">

                 <input

                   type="checkbox"

                   checked={allSelected}

                   onChange={handleSelectAll}

                   className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"

                 />

               </th>

               <th className="px-3 py-4 text-left font-semibold text-gray-700 dark:text-gray-300 w-20">Ticket ID</th>

               <th className="px-3 py-4 text-left font-semibold text-gray-700 dark:text-gray-300 w-28">Name</th>

               <th className="px-3 py-4 text-left font-semibold text-gray-700 dark:text-gray-300 w-36">Email</th>

               <th className="px-3 py-4 text-left font-semibold text-gray-700 dark:text-gray-300 w-28">Mobile</th>

               <th className="px-3 py-4 text-left font-semibold text-gray-700 dark:text-gray-300 w-24">Issue Type</th>

               <th className="px-3 py-4 text-left font-semibold text-gray-700 dark:text-gray-300 w-24">Issue</th>

               <th className="px-3 py-4 text-left font-semibold text-gray-700 dark:text-gray-300 w-20">Severity</th>

               <th className="px-3 py-4 text-left font-semibold text-gray-700 dark:text-gray-300 w-20">Status</th>

               <th onClick={handleSortDate} className="px-3 py-4 text-left font-semibold text-gray-700 dark:text-gray-300 cursor-pointer w-24 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-200">
                 
                 Date {sortAsc ? <ArrowUp className="inline w-4 h-4 ml-1" /> : <ArrowDown className="inline w-4 h-4 ml-1" />}
                 
               </th>
               
               <th className="px-3 py-4 text-left font-semibold text-gray-700 dark:text-gray-300 w-24">Action</th>
               
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

                 const isUrgent = isOverdueNewTicket(ticket);

               

                 return (

                 <TableRow key={`${ticket.id}-${ticket._id}-${ticket.status}-${forceUpdate}`} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-violet-50/50 dark:hover:from-blue-900/10 dark:hover:to-violet-900/10 transition-all duration-200 group">

                   <td className="px-3 py-4">

                     <input

                       type="checkbox"

                       checked={selectedIds.includes(ticket.id || ticket._id || '')}

                       onChange={handleSelectOne(ticket.id || ticket._id || '')}

                       className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"

                     />

                   </td>

                                             <td

                                               className={`px-5 py-0.5 font-bold ${clickedTicketId === (ticket._id || ticket.id) ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:opacity-80'} underline whitespace-nowrap transition-opacity ${isUrgent ? 'text-blue-600 dark:text-blue-400 animate-pulse' : 'text-blue-600 dark:text-blue-400'} ${isDuplicate ? 'relative pr-16 group' : ''}`}

                                               onClick={clickedTicketId === (ticket._id || ticket.id) ? undefined : async () => {

                                                 // Update status to Open first

                                                 await updateTicketStatusToOpen(ticket);

                                               

                                                 // Extract the actual database ID from the _id.$oid field

                                                 let ticketId = null;

                                               

                                                 if (ticket._id && typeof ticket._id === 'object' && (ticket._id as { $oid?: string }).$oid) {

                                                   ticketId = (ticket._id as { $oid?: string }).$oid;

                                                 } else if (ticket._id && typeof ticket._id === 'string') {

                                                   ticketId = ticket._id;

                                                 } else if (ticket.id && typeof ticket.id === 'string' && ticket.id.length === 24) {

                                                   ticketId = ticket.id;

                                                 }

                                               

                                                 if (ticketId) {

                                                   router.push(`/helpdesk-customer-ticket/${ticketId}`);

                                                 } else {

                                                   console.error('No valid database ID found for navigation');

                                                 }

                                               }}

                                               title={clickedTicketId === (ticket._id || ticket.id) ? "Opening ticket..." : "Click to view ticket details"}

                                             >

                     <div className="flex items-center gap-1">

                       {isDuplicate ? (

                         <span className={`inline-flex items-center gap-1 ${isUrgent ? 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-200 dark:border-blue-800' : 'bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-900/20 dark:text-blue-100 dark:border-blue-700'} border rounded-full px-2 py-1 text-xs font-semibold`}>

                           <span>{ticket.ticket_id || ticket.display_id || ticket.id}</span>

                           {clickedTicketId === (ticket._id || ticket.id) ? (

                             <svg className="w-3 h-3 text-blue-500 animate-spin inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor">

                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 0020 14c0 1.657-.66 3.18-1.724 4.256M4 12a8.001 0 0015.356 2A8.001 8.001 0 004 10c0-1.657.66-3.18 1.724-4.256" />

                             </svg>

                           ) : (

                             <svg className="w-3 h-3 text-gray-600 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">

                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />

                             </svg>

                           )}

                         </span>

                       ) : (

                         <span className={`inline-flex items-center gap-1 ${isUrgent ? 'text-blue-600 dark:text-blue-400 animate-pulse' : 'text-blue-600 dark:text-blue-400'}`}>

                           <span>{ticket.ticket_id || ticket.display_id || ticket.id}</span>

                           {clickedTicketId === (ticket._id || ticket.id) ? (

                             <svg className="w-3 h-3 text-blue-500 animate-spin inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor">

                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 0020 14c0 1.657-.66 3.18-1.724 4.256M4 12a8.001 0 0015.356 2A8.001 8.001 0 004 10c0-1.657.66-3.18 1.724-4.256" />

                             </svg>

                           ) : (

                             <svg className="w-3 h-3 text-gray-400 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">

                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />

                             </svg>

                           )}

                         </span>

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

                   <td className="px-3 py-4 text-gray-900 dark:text-white">

                     <div className="font-medium text-gray-900 dark:text-white truncate" title={ticket.name}>

                       {ticket.name || 'No name'}

                     </div>

                   </td>

                   <td className="px-3 py-4 text-gray-900 dark:text-white">

                     <div className="font-medium text-gray-900 dark:text-white truncate" title={ticket.email}>

                       {ticket.email || 'No email'}

                     </div>

                   </td>

                   <td className="px-3 py-4 text-gray-900 dark:text-white">{ticket.phone || '-'}</td>

                   <td className="px-3 py-4 text-gray-900 dark:text-white">

                     {ticket.issue_type || '-'}

                   </td>

                   <td className="px-3 py-4 text-gray-900 dark:text-white">

                     {ticket.issue || '-'}

                   </td>

                   <td className="px-3 py-4 text-sm whitespace-nowrap">

                     {(() => {

                       const severity = getSeverityScore(ticket);

                       return (

                         <span className={`inline-block px-3 py-1 rounded-full font-semibold text-xs ${severity.color}`}>{severity.label}</span>

                       );

                     })()}

                   </td>

                   <td className="px-3 py-4 text-sm whitespace-nowrap">

                     {updatingTicketId === (ticket._id || ticket.id) ? (

                       <span className="inline-block px-3 py-1 rounded-full font-semibold text-xs bg-gray-100 text-gray-700 border border-gray-300">

                         <svg className="animate-spin -ml-1 mr-2 h-3 w-3 text-gray-500 inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">

                           <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>

                           <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>

                         </svg>

                         Updating...

                       </span>

                     ) : (

                       <span className={`inline-block px-3 py-1 rounded-full font-semibold text-xs ${

                         ticket.status?.toLowerCase() === 'pending'

                           ? 'bg-blue-100 text-blue-700 border border-blue-300'

                           : ticket.status?.toLowerCase() === 'close'

                           ? 'bg-blue-100 text-blue-700 border border-blue-300'

                           : ticket.status?.toLowerCase() === 'open'

                           ? 'bg-blue-100 text-blue-700 border border-blue-300'

                           : ticket.status?.toLowerCase() === 'in process'

                           ? 'bg-blue-100 text-blue-700 border border-blue-300'

                           : ticket.status?.toLowerCase() === 'new'

                           ? 'bg-blue-100 text-blue-700 border border-blue-300'

                           : 'bg-gray-100 text-gray-700 border border-gray-300'

                       }`}>

                         {ticket.status || 'Open'}

                       </span>

                     )}

                   </td>

 

 

                   <td className="px-3 py-4 text-gray-900 dark:text-white text-sm whitespace-nowrap">
                     
                     {new Date(ticket.created_at).toLocaleDateString("en-GB", {
                       
                       day: "numeric",
                       
                       month: "short",
                       
                       year: "2-digit"
                       
                     })}
                     
                   </td>
                   
                   <td className="px-3 py-4 text-gray-900 dark:text-white">
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
    </div>
</div>

{showForm && (
<>
<div className="fixed inset-0 z-40 bg-black/10 backdrop-blur-[2px]" onClick={() => setShowForm(false)} />
<div
className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto"
onClick={() => setShowForm(false)}
>
<div
 className="relative w-full max-w-md bg-transparent rounded-2xl outline-none focus:outline-none"
 onClick={e => e.stopPropagation()}
>
 <TicketForm
   onClose={() => setShowForm(false)}
   onSuccess={fetchTickets}
   issueTypeOptions={issueTypeOptions}
   issueOptions={issueOptions}
   optionsLoading={optionsLoading}
    optionsError={optionsError}
    typeToIssues={typeToIssues}
 />
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

        {/* Form Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <form
            id="update-ticket-form"
            className="space-y-6"
            onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const ticketId = selectedTicket._id && typeof selectedTicket._id === 'object' && (selectedTicket._id as { $oid?: string }).$oid
                ? (selectedTicket._id as { $oid?: string }).$oid
                : selectedTicket._id || selectedTicket.id;
              
              if (!ticketId) return;

              try {
                const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/helpdesk/tickets/${ticketId}`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    name: formData.get('name'),
                    email: formData.get('email'),
                    phone: formData.get('phone'),
                    issue_type: formData.get('issue_type'),
                    issue: formData.get('issue'),
                    message: formData.get('message'),
                    status: formData.get('status'),
                    assigned_to: assignSearchQuery || null,
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
                    defaultValue={selectedTicket.phone || ''}
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
                    defaultValue={selectedTicket.issue_type || ''}
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
);
}

export default function TicketsPage() {
return (
<Suspense fallback={<div>Loading...</div>}>
<TicketsPageInner />
</Suspense>
);
}