/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps */
"use client";



import { useState, useEffect, ChangeEvent, FormEvent, useRef } from 'react';

// import Link from 'next/link';

import 'react-date-range/dist/styles.css';

import 'react-date-range/dist/theme/default.css';

// import DatePicker from 'react-datepicker';

import 'react-datepicker/dist/react-datepicker.css';

// import { GridIcon, UserIcon } from '../../../../../src/icons';

// import AuthService from '../../../../../src/services/AuthService';

import FaqSection from './faq';
import dynamic from 'next/dynamic';
import HelpFilter from './filter';
import HelpTable from './table';
import HelpPagination from './pagination';
// import DashboardHeader from '../../../../components/header/DashboardHeader';
// import InfoIcon from '../../../../icons/info.svg';

const CreateTicketForm = dynamic(() => import('./form'), { ssr: false });

function to12HourFormat(dateString: string) {

const date = new Date(dateString);

const month = date.toLocaleString('default', { month: 'long' });

const day = date.getDate();

const year = date.getFullYear();

let hours = date.getHours();

const minutes = date.getMinutes();

const ampm = hours >= 12 ? 'PM' : 'AM';

hours = hours % 12;

hours = hours ? hours : 12;

const minutesStr = minutes < 10 ? '0' + minutes : minutes;

return `${month} ${day}, ${year}, ${hours}:${minutesStr} ${ampm}`;

}
function validateEmail(email: string): string[] {

const errors: string[] = [];

if (!email) errors.push("Please enter your email.");

if (email.length > 254) errors.push("Email is too long.");

const atIndex = email.indexOf("@");

if (atIndex === -1 || atIndex !== email.lastIndexOf("@")) {

errors.push("Email must have one @ symbol.");

}

const [local, domain] = email.split("@");

if (!local || !domain) errors.push("Email must have text before and after @.");

if (local && local.length > 64) errors.push("The part before @ is too long.");

if (local && !/^[a-zA-Z0-9._+-]+$/.test(local)) {

errors.push("The part before @ has invalid characters.");

}

if (local && (local.startsWith(".") || local.endsWith("."))) {

errors.push("The part before @ can't start or end with a dot.");

}

if (local && local.includes("..")) {

errors.push("The part before @ can't have two dots in a row.");

}

if (domain && domain.length > 255) errors.push("The part after @ is too long.");

if (domain && !/^[a-zA-Z0-9.-]+$/.test(domain)) {

errors.push("The part after @ has invalid characters.");

}

if (domain && (domain.startsWith("-") || domain.endsWith("-"))) {

errors.push("The part after @ can't start or end with a hyphen.");

}

if (domain && (domain.startsWith(".") || domain.endsWith("."))) {

errors.push("The part after @ can't start or end with a dot.");

}

if (domain && domain.includes("..")) {

errors.push("The part after @ can't have two dots in a row.");

}

if (domain && !/\.[a-zA-Z]{2,}$/.test(domain)) {

errors.push("Email must end with something like .com or .org.");

}

return errors;

}
const stripHtml = (input: string) => input.replace(/<[^>]*>?/gm, '');
export default function JobListPage() {
type Job = any;

type UserData = {
 business_info?: {
   full_name?: string;
   business_email?: string;
   business_id?: string;
   company_name?: string;
 };
 email?: string;
 full_name?: string;
};

const [jobs, setJobs] = useState<Job[]>([]);

const [error, setError] = useState('');

const [form, setForm] = useState({

name: '',

email: '',

subject: '',

message: '',

business_id: '',

business_name: '',

});

const [issueType, setIssueType] = useState('');

const [otherIssueDescription, setOtherIssueDescription] = useState('');

const [success, setSuccess] = useState('');

const [currentPage, setCurrentPage] = useState(1);

const [rowsPerPage, setRowsPerPage] = useState(10);

const [filterField, setFilterField] = useState<'name' | 'email' | 'subject' | 'message' | 'date'>('name');

const [filterDate, setFilterDate] = useState('');

const [filterQuery, setFilterQuery] = useState('');

const [nameError, setNameError] = useState('');

const [emailError, setEmailError] = useState<string[]>([]);

const [subjectError, setSubjectError] = useState('');

const [messageError, setMessageError] = useState('');

const [openFaq, setOpenFaq] = useState<number | null>(null);

const [selected, setSelected] = useState<string[]>([]);

const [showFilters, setShowFilters] = useState(false);

const [showForm, setShowForm] = useState(false);

const [timelineFilter, setTimelineFilter] = useState('all');

const [customRange, setCustomRange] = useState<{ start: Date | null; end: Date | null }>({ start: null, end: null });

const [activeTab, setActiveTab] = useState<'records' | 'knowledge'>('records');

const [showQuickTips, setShowQuickTips] = useState(false);

const [loadingJobs, setLoadingJobs] = useState(false);

const [loadingBusinessInfo, setLoadingBusinessInfo] = useState(false);

const customDateRef = useRef<HTMLDivElement>(null);

// Prevent body scroll when modal is open

useEffect(() => {

if (showForm) {

  document.body.style.overflow = 'hidden';

} else {

  document.body.style.overflow = 'unset';

}
// Cleanup function to restore scroll when component unmounts

return () => {

  document.body.style.overflow = 'unset';

};

}, [showForm]);

useEffect(() => {

// Check for a tab parameter in the URL and set the active tab

const urlParams = new URLSearchParams(window.location.search);

const tab = urlParams.get('tab');

if (tab === 'records') {

 setActiveTab('records');

}

}, []);

// Function to populate form with user information

const populateFormWithUserInfo = async () => {

 let userData: UserData = {};

 let name = '';

 let email = '';

 let business_id = '';

 let business_name = '';
 
 setLoadingBusinessInfo(true);
 
 if (typeof window !== 'undefined') {

   try {

     // Get user data from localStorage (this contains the login response)

     userData = JSON.parse(localStorage.getItem('userData') || '{}');
     
     if (userData && userData.business_info) {

       name = userData.business_info.full_name || '';

       email = userData.business_info.business_email || userData.email || '';

       business_id = userData.business_info.business_id || '';

       business_name = userData.business_info.company_name || '';

     } else if (userData && userData.email) {

       email = userData.email;

       name = userData.full_name || userData.email.split('@')[0] || '';

       // If we have email but no business info, fetch it from API
       if (email && !business_id) {
         try {
           const encodedEmail = encodeURIComponent(email);
           const response = await fetch(`https://py-business.converiqo.ai/api/v1/business/by-email?email=${encodedEmail}`, {
             method: 'GET',
             headers: {
               'accept': 'application/json',
               'Content-Type': 'application/json',
             },
           });
           
           if (response.ok) {
             const businessData = await response.json();
             if (businessData.success) {
               business_id = businessData.business_id;
               business_name = businessData.business_name;
             }
           }
         } catch (error) {
           console.error('Error fetching business info:', error);
         }
       }

     }

   } catch (error) {

     console.error('Error parsing user data from localStorage:', error);

 }
 
 }
 setForm(prev => ({

   ...prev,

   name,

   email,

   business_id,

   business_name,

 }));

 
 
 // Add a small delay to show the loading state

 setTimeout(() => {

   setLoadingBusinessInfo(false);

 }, 500);

};



// Listen for userDataUpdated event to auto-fill form after login

useEffect(() => {

 const handler = () => {

   populateFormWithUserInfo();

 };

 window.addEventListener('userDataUpdated', handler);

 return () => window.removeEventListener('userDataUpdated', handler);

}, []);



// Load user information and tickets when component mounts (handled in the auto-load useEffect below)



// Populate form when it opens

useEffect(() => {

if (showForm) {

 const populateForm = async () => {

   await populateFormWithUserInfo();

 };

 populateForm();

}

}, [showForm]);



// Add a function to format the custom range for the dropdown

function formatCustomRangeLabel(range: { start: Date | null; end: Date | null }) {

if (range.start && range.end) {

 const start = range.start.toISOString().slice(0, 10);

 const end = range.end.toISOString().slice(0, 10);

 return `${start} to ${end}`;

} else if (range.start) {

 return range.start.toISOString().slice(0, 10);

} else {

 return 'Custom';

}

}



// Fetch jobs

const fetchJobs = async () => {

setLoadingJobs(true);

setError('');

// Always clear existing jobs to show fresh data when reloading
setJobs([]);



try {
 // Get business_id from form, localStorage, or fetch from API
 let businessId = form.business_id || '';
 
 // If not in form, try to get from localStorage
 if (!businessId && typeof window !== 'undefined') {
   try {
     const userData = JSON.parse(localStorage.getItem('userData') || '{}');
     if (userData?.business_info?.business_id) {
       businessId = userData.business_info.business_id;
       // Update form with business_id for future use
       if (!form.business_id) {
         setForm(prev => ({ 
           ...prev, 
           business_id: businessId, 
           business_name: userData.business_info.company_name || '' 
         }));
       }
     } else if (userData?.email && !businessId) {
       // Try to fetch business_id from API if we have email
       try {
         const encodedEmail = encodeURIComponent(userData.email);
         const response = await fetch(`https://py-business.converiqo.ai/api/v1/business/by-email?email=${encodedEmail}`, {
           method: 'GET',
           headers: {
             'accept': 'application/json',
             'Content-Type': 'application/json',
           },
         });
         
         if (response.ok) {
           const businessData = await response.json();
           if (businessData.success && businessData.business_id) {
             businessId = businessData.business_id;
             // Update form with business_id for future use
             setForm(prev => ({ 
               ...prev, 
               business_id: businessData.business_id, 
               business_name: businessData.business_name || '' 
             }));
           }
         }
       } catch (error) {
         // Silently fail if API call fails
       }
     }
   } catch (error) {
     // Silently fail if localStorage parsing fails
   }
 }
 
 if (!businessId) {
   setError('Business ID is required to fetch tickets');
   setLoadingJobs(false);
   return;
 }
 
 // Fetch tickets with a reasonable limit (API may reject very high limits)
 const url = `https://py-business.converiqo.ai/api/v1/tickets?business_id=${businessId}&limit=100&skip=0`;
 
 const res = await fetch(url);

 if (!res.ok) {
   // If 422 error, try with a smaller limit
   if (res.status === 422) {
     const smallerLimitUrl = `https://py-business.converiqo.ai/api/v1/tickets?business_id=${businessId}&limit=50&skip=0`;
     const retryRes = await fetch(smallerLimitUrl);
     if (!retryRes.ok) {
       setLoadingJobs(false);
       throw new Error('Failed to fetch jobs');
     }
     const retryResponse = await retryRes.json();
     if (retryResponse.success && retryResponse.data && retryResponse.data.tickets) {
       setJobs(retryResponse.data.tickets);
       setLoadingJobs(false);
       return;
     } else {
       setJobs([]);
       setLoadingJobs(false);
       return;
     }
   }
   setLoadingJobs(false);
   throw new Error('Failed to fetch jobs');
 }

 const response = await res.json();

 // Handle the new API response structure
 if (response.success && response.data && response.data.tickets) {
   setJobs(response.data.tickets);
 } else {
   setJobs([]);
 }

} catch (err: unknown) {

 if (err instanceof Error) {

   setError(err.message);

 } else {

   setError('Error fetching jobs');

 }

} finally {

 setLoadingJobs(false);

}

};



// Auto-load tickets on page load/refresh - always reload on mount
useEffect(() => {
  const loadData = async () => {
    // First populate form with user info
    await populateFormWithUserInfo();
    // Small delay to ensure form state is updated
    await new Promise(resolve => setTimeout(resolve, 200));
    // Then fetch all tickets (will also try to get business_id from localStorage/API if needed)
    // Always reload tickets on page open/refresh
    await fetchJobs();
  };
  // Always load on mount/refresh
  loadData();
}, []);

// Also fetch jobs when business_id becomes available in form (as backup if initial load didn't get business_id)
useEffect(() => {
  // Fetch if business_id exists, not currently loading, and we don't have jobs yet
  if (form.business_id && !loadingJobs && jobs.length === 0) {
    fetchJobs();
  }
}, [form.business_id]);



useEffect(() => {

if (timelineFilter !== 'custom') return;

function handleClickOutside(event: MouseEvent) {
  const target = event.target as Element;
  if (
    (target.closest && (
      target.closest('#date-range-picker') ||
      target.closest('.flatpickr-calendar') ||
      target.closest('.flatpickr-day') ||
      target.closest('.flatpickr-month') ||
      target.closest('.flatpickr-weekday') ||
      target.closest('.flatpickr-current-month') ||
      target.closest('.flatpickr-months') ||
      target.closest('.flatpickr-prev-month') ||
      target.closest('.flatpickr-next-month')
    ))
  ) {
    return;
  }
 if (customDateRef.current && !customDateRef.current.contains(event.target as Node)) {
   if (customRange.start && customRange.end) {
     setTimelineFilter('custom-selected');
   } else {
     setTimelineFilter('all');
   }
 }
}

document.addEventListener('mousedown', handleClickOutside);

return () => {

 document.removeEventListener('mousedown', handleClickOutside);

};

}, [timelineFilter, customRange]);



// Form handlers

const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {

const { name, value } = e.target;

setForm({ ...form, [name]: value });



// Clear error for the field as soon as user types

if (name === "name") setNameError("");

if (name === "email") setEmailError([]); // Clear all errors

if (name === "subject") setSubjectError("");

if (name === "message") setMessageError("");

};



const handleNameBlur = () => {

const name = form.name.trim();

if (!name) {

 setNameError('Name is required.');

} else if (name.length < 2) {

 setNameError('Name must be at least 2 characters.');

} else if (name.length > 120) {

 setNameError('Name must be at most 120 characters.');

} else {

 setNameError('');

}

};



const handleEmailBlur = () => {

const email = form.email.trim();

const errors = validateEmail(email);

setEmailError(errors);

};



const handleSubjectBlur = () => {

const subject = form.subject.trim();

if (!subject) {

 setSubjectError('Subject is required.');

} else if (subject.length < 2) {

 setSubjectError('Subject must be at least 2 characters.');

} else if (subject.length > 250) {

 setSubjectError('Subject must be at most 250 characters.');

} else {

 setSubjectError('');

}

};



const handleMessageBlur = () => {

let message = form.message.trim();

message = stripHtml(message); // Remove HTML tags



if (!message) {

 setMessageError('Message is required.');

} else if (message.length < 10) {

 setMessageError('Message must be at least 10 characters.');

} else if (message.length > 2000) {

 setMessageError('Message must be at most 2000 characters.');

} else {

 setMessageError('');

}

};



const handleSubmit = async (e: FormEvent) => {

e.preventDefault();

setError('');

setSuccess('');



// Name validation

const name = form.name.trim();

if (!name) {

 setError('Name is required.');

 return;

}

if (name.length < 2) {

 setError('Name must be at least 2 characters.');

 return;

}

if (name.length > 120) {

 setError('Name must be at most 120 characters.');

 return;

}



if (!form.email.trim()) {

 setError('Email is required.');

 return;

}

if (!form.email.includes('@')) {

 setEmailError(['Email must contain @.']);

 return;

}



if (!form.subject.trim()) {

 setError('Subject is required.');

 return;

}



if (!form.message.trim()) {

 setError('Message is required.');

 return;

}

if (form.message.length > 2000) {

 setError('Message must be at most 2000 characters.');

 return;

}



// Issue type validation

if (!issueType.trim()) {

 setError('Issue type is required.');

 return;

}



// If "Other" is selected, require description

if (issueType === 'Other' && !otherIssueDescription.trim()) {

 setError('Please specify the issue type when selecting "Other".');

 return;

}



if (nameError || emailError.length > 0) {

 setError(nameError || emailError.join(' '));

 return;

}



if (subjectError) {

 setError(subjectError);

 return;

}



if (messageError) {

 setError(messageError);

 return;

}



// Prepare form data

// Use the exact dropdown selection - no mapping or transformation
// issueType should be the exact value from dropdown like "Login or Access Issue", "Bug or Error", etc.
const finalIssueType = issueType === 'Other' ? otherIssueDescription : issueType;

// Create payload with ONLY the 7 required fields - NO category, NO priority
const payload = {
  business_id: form.business_id,
  business_name: form.business_name,
  customer_email: form.email,
  customer_name: form.name,
  description: form.message,
  issue_type: finalIssueType, // Exact dropdown value: "Login or Access Issue", "Bug or Error", etc.
  title: form.subject
};

// Ensure payload doesn't have category or priority
if ('category' in payload || 'priority' in payload) {
  delete (payload as any).category;
  delete (payload as any).priority;
}

 try {

 const res = await fetch('https://py-business.converiqo.ai/api/v1/tickets/create', {

   method: 'POST',

   headers: {

     'Content-Type': 'application/json'

   },

   body: JSON.stringify(payload),

 });
 
 if (res.ok) {

   // Get the response data to extract ticket ID

   let ticketData;

   try {

     ticketData = await res.json();

   } catch (e) {

     ticketData = {};

   }

   
   
   setSuccess('Application submitted!');

   setForm({ name: '', email: '', subject: '', message: '', business_id: '', business_name: '' });

   setIssueType('');

   setOtherIssueDescription('');

   setNameError('');

   setEmailError([]);

   setSubjectError('');

   setMessageError('');

   
   
   // Wait a moment for server to process, then refresh the data

   await new Promise(resolve => setTimeout(resolve, 500));

   await fetchJobs();

   
   
   // Force a re-render by updating the current page

   setCurrentPage(1);

   
   
   setShowForm(false); // Close the modal after successful submit



   // Send email notification with complete ticket details

   const finalIssueType = issueType === 'Other' ? otherIssueDescription : issueType;

   const userEmail = localStorage.getItem('userEmail') || '';

   const ticketId = ticketData.ticket_id || ticketData.id || ticketData._id || 'N/A';

   const currentTime = new Date().toLocaleString();

   
   
   // Email notification removed - no longer using send-email endpoint

 } else {

   let errMsg = 'Failed to submit';
   let errorDetails = null;

   try {

     const err = await res.json();
     errorDetails = err;

     // Check for duplicate key error specifically
     if (err.errmsg && err.errmsg.includes('duplicate key error') && err.errmsg.includes('ticket_id')) {
       errMsg = 'A ticket with this ID already exists. Please try again or contact support.';
     } else {
     errMsg = err.error || err.detail || err.message || JSON.stringify(err);
     }

   } catch (parseError) {

     errMsg = 'Failed to submit ticket';

   }

   throw new Error(errMsg);

 }

} catch (err: unknown) {

 if (err instanceof Error) {

   setError(err.message);

 } else if (typeof err === 'string') {

   setError(err);

 } else {

   setError('Error submitting application');

 }

}

};



// Filtering and pagination logic

const MIN_SEARCH_LENGTH = 2;

const normalizedJobs = jobs.map(job => {

// Create normalized object without issue_time - permanently excluded
const normalized: any = {

 id: job.ticket_id || job._id || job.id || '',

 name: job.customer_name || job.name || '',

 email: job.customer_email || job.email || '',

 subject: job.title || job.subject || '',

 message: job.description || job.message || '',

 status: job.status,

 created_at: job.created_at,

 resumeFilename: job.resumeFilename,

 issue_type: job.issue_type || 'General Inquiry',

 business_id: job.business_id || '',

 business_name: job.business_name || '',

 created_at_date: job.created_at ? job.created_at.split('T')[0] : '',

 // New fields from the API response
 priority: job.priority,
 category: job.category,
 assigned_agent_name: job.assigned_agent_name,
 updated_at: job.updated_at,
 age_hours: job.age_hours,
 is_overdue: job.is_overdue

};

// Explicitly exclude issue_time if it exists in the API response
delete (normalized as any).issue_time;
delete (normalized as any).issueTime;

return normalized;

});

const normalizedQuery = filterQuery.replace(/\s+/g, ' ').trim().toLowerCase();

const queryWords = normalizedQuery.split(' ').filter(Boolean);

let filteredJobs = normalizedJobs;

let searchValidation = '';

// Timeline filter logic

if (timelineFilter !== 'all' && timelineFilter !== 'custom') {

const now = new Date();

let start = null, end = null;

if (timelineFilter === 'today') {

 start = new Date(now.getFullYear(), now.getMonth(), now.getDate());

 end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

} else if (timelineFilter === 'yesterday') {

 start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);

 end = new Date(now.getFullYear(), now.getMonth(), now.getDate());

} else if (timelineFilter === 'last12hours') {

 start = new Date(now.getTime() - 12 * 60 * 60 * 1000);

 end = now;

} else if (timelineFilter === 'thisweek') {

 const day = now.getDay() || 7;

 start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day + 1);

 end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

} else if (timelineFilter === 'thismonth') {

 start = new Date(now.getFullYear(), now.getMonth(), 1);

 end = new Date(now.getFullYear(), now.getMonth() + 1, 1);

} else if (timelineFilter === 'lastweek') {

 const day = now.getDay() || 7;

 end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day + 1);

 start = new Date(end.getFullYear(), end.getMonth(), end.getDate() - 7);

} else if (timelineFilter === 'lastmonth') {

 start = new Date(now.getFullYear(), now.getMonth() - 1, 1);

 end = new Date(now.getFullYear(), now.getMonth(), 1);

} else if (timelineFilter === 'last30days') {

 start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

 end = now;

}

if (start && end) {

 filteredJobs = filteredJobs.filter(job => {

   const created = new Date(job.created_at);

   return created >= start && created < end;

 });

}

}

// Custom range filter (works for both picker open and closed)

if ((timelineFilter === 'custom' || timelineFilter === 'custom-selected') && customRange.start instanceof Date && customRange.end instanceof Date) {

const start = new Date(customRange.start);

start.setHours(0, 0, 0, 0);

const end = new Date(customRange.end);

end.setHours(23, 59, 59, 999);

filteredJobs = filteredJobs.filter(job => {

 const created = new Date(job.created_at);

 return created >= start && created <= end;

});

}

// Date range filter

if (filterField === 'date' && filterDate) {

filteredJobs = filteredJobs.filter(job => job.created_at_date === filterDate);

} else if (filterQuery && filterQuery.length < MIN_SEARCH_LENGTH) {

searchValidation = `Please enter at least ${MIN_SEARCH_LENGTH} characters to search.`;

filteredJobs = [];

} else if (filterQuery) {

const searchWords = normalizedQuery.split(' ').filter(Boolean);

filteredJobs = filteredJobs.filter(job => {

 let value = '';

 if (filterField === 'date') {

   value = job.created_at_date ? job.created_at_date.toLowerCase() : '';

 } else if (

   filterField === 'name' ||

   filterField === 'email' ||

   filterField === 'subject' ||

   filterField === 'message'

 ) {

   value = job[filterField] ? job[filterField].toLowerCase() : '';

 }

 return searchWords.every(word => value.includes(word));

});

}



// Sort filtered jobs by creation date in descending order (newest first)

filteredJobs.sort((a, b) => {

const dateA = new Date(a.created_at);

const dateB = new Date(b.created_at);

return dateB.getTime() - dateA.getTime(); // Descending order - newest first

});



const totalPages = Math.ceil(filteredJobs.length / rowsPerPage);

const currentJobs = filteredJobs.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);



// Reset page on filter change

useEffect(() => {

setCurrentPage(1);

}, [filterQuery, filterField, rowsPerPage]);



// Checkbox handlers

const handleCheckboxChange = (id: string) => {

setSelected((prev) =>

 prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id]

);

};



const handleSelectAll = () => {

setSelected(

 selected.length === currentJobs.length

   ? []

   : currentJobs.map((job) => job.id)

);

};



const handleDownload = () => {

if (selected.length === 0) {

 alert("Please select at least one row to download.");

 return;

}

// Filter normalizedJobs to find selected ones

const selectedJobs = normalizedJobs.filter(job => selected.includes(job.id));



const headers = ["ID", "Business ID", "Business Name", "Customer Name", "Customer Email", "Title", "Category", "Priority", "Status", "Assigned Agent", "Created At", "Updated At", "Age (Hours)", "Overdue"];

const csvRows = [

 headers.join(','), // Header row

 ...selectedJobs.map(job => {

   const row = [

     job.id,

     job.business_id || 'N/A',

     job.business_name || 'N/A',

     job.name,

     job.email,

     job.subject,

     job.issue_type || 'N/A',

     job.priority || 'N/A',

     job.status,

     job.assigned_agent_name || 'N/A',

     job.created_at,

     job.updated_at || 'N/A',

     job.age_hours || 'N/A',

     job.is_overdue ? 'Yes' : 'No'

   ];

   return row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(",");

 })

];



const csvContent = csvRows.join("\r\n");

const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });

const url = URL.createObjectURL(blob);

const link = document.createElement("a");

link.href = url;

link.setAttribute("download", "tickets.csv");

document.body.appendChild(link);

link.click();

document.body.removeChild(link);

};



return (

<>

 <div className="min-h-screen bg-white dark:bg-gray-900 relative overflow-hidden">
   {/* Background Pattern */}
   <div className="absolute inset-0 opacity-5" style={{backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%233366CC' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='4'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`}}></div>
   
   <div className="relative z-10 p-4 sm:p-6 lg:p-8">

   {/* Simple Header */}
   <div className="mb-6">
     <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Help Center</h1>
     <p className="text-gray-600 dark:text-gray-400">Advanced ticket management & support system</p>
   </div>


   {/* Toggle Tabs - Professional Design */}
   <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl mb-6 sm:mb-8">
     <div className="flex flex-row">
       <button
         onClick={() => setActiveTab('knowledge')}
         className={`flex items-center justify-center gap-2 px-4 py-3 sm:px-6 sm:py-4 font-semibold text-xs sm:text-sm lg:text-base transition-all duration-200 ${
           activeTab === 'knowledge'
             ? 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-800/30 border-b-2 sm:border-b-0 sm:border-r-2 border-blue-600 dark:border-blue-400 shadow-lg'
             : 'text-blue-700 dark:text-blue-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20'
         }`}
         style={{ background: 'none', border: 'none', cursor: 'pointer' }}
       >
         <svg className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
         </svg>
         <span className="hidden xs:inline">FAQs</span>
         <span className="xs:hidden">FAQs</span>
       </button>
       <button
         onClick={() => setActiveTab('records')}
         className={`flex items-center justify-center gap-2 px-4 py-3 sm:px-6 sm:py-4 font-semibold text-xs sm:text-sm lg:text-base transition-all duration-200 ${
           activeTab === 'records'
             ? 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-800/30 border-b-2 sm:border-b-0 sm:border-r-2 border-blue-600 dark:border-blue-400 shadow-lg'
             : 'text-blue-700 dark:text-blue-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20'
         }`}
         style={{ background: 'none', border: 'none', cursor: 'pointer' }}
       >
         <svg className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
         </svg>
         <span className="hidden xs:inline">Tickets</span>
         <span className="xs:hidden">Tickets</span>
       </button>
     </div>
   </div>

   {/* Tab Content */}

   {activeTab === 'records' && (

     <>

                   {/* Ticket Creation Form Modal */}

        {showForm && (
        <CreateTicketForm
          show={showForm}
          onClose={() => setShowForm(false)}
          onSubmitted={async () => {
            await fetchJobs();
            setCurrentPage(1);
          }}
        />
       )}

       {/* Filter Section */}

       <HelpFilter
         filterField={filterField}
         setFilterField={setFilterField as any}
         filterQuery={filterQuery}
         setFilterQuery={setFilterQuery}
         showFilters={showFilters}
         setShowFilters={(updater) => setShowFilters((prev) => (typeof updater === 'function' ? (updater as any)(prev) : updater))}
         handleDownload={handleDownload}
         fetchJobs={fetchJobs}
         loadingJobs={loadingJobs}
         showForm={showForm}
         setShowForm={setShowForm}
         setSuccess={setSuccess}
         setError={setError}
         populateFormWithUserInfo={populateFormWithUserInfo}
         timelineFilter={timelineFilter}
         setTimelineFilter={setTimelineFilter}
         customRange={customRange}
         setCustomRange={(updater) => setCustomRange((r) => (updater as any)(r))}
         customDateRef={customDateRef}
         formatCustomRangeLabel={formatCustomRangeLabel}
       />

       {/* Table */}

      <HelpTable
        loading={loadingJobs}
        currentJobs={currentJobs}
        selected={selected}
        handleCheckboxChange={handleCheckboxChange}
        to12HourFormat={to12HourFormat as any}
        handleSelectAll={handleSelectAll}
      />



      {/* Pagination */}

      <HelpPagination
        currentJobsCount={currentJobs.length}
        totalFilteredCount={filteredJobs.length}
        rowsPerPage={rowsPerPage}
        setRowsPerPage={(n) => { setRowsPerPage(n); setCurrentPage(1); }}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        totalPages={totalPages}
      />

       {filterQuery && !searchValidation && filteredJobs.length === 0 && (
         <div className="text-gray-500 text-center mt-4">No results found for &quot;{filterQuery}&quot;.</div>
       )}

     </>

   )}

   {activeTab === 'knowledge' && (
     <FaqSection openFaq={openFaq} setOpenFaq={setOpenFaq} />
   )}

   </div>

 </div>

</>

);

}
