// "use client";
// // import PageBreadcrumb from "@/components/common/PageBreadCrumb";
// // Removed unused PageHeader import
// import React, { useEffect, useState, useRef, useCallback } from "react";
// import { VisualCalendar } from "../appointment/components/VisualCalendar";
// import DashboardHeader from '@/components/header/DashboardHeader';
// import { Users as UsersIcon } from 'lucide-react';
// import {
//   Table,
//   TableBody,
//   TableCell,
//   TableHeader,
//   TableRow,
// } from "@/components/ui/table";
// import Button from "@/components/ui/button/Button";
// import { Modal } from "@/components/ui/modal";
// import { FaUpload, FaSync, FaTrash, FaSearch, FaDownload, FaTimes, FaCalendarAlt, FaClock } from "react-icons/fa";
// import { ToastContainer } from 'react-toastify';
// import 'react-toastify/dist/ReactToastify.css';
// import EmployeeUploadModal from "./EmployeeUploadModal";
// import DownloadEmployeeTemplate from "@/components/popscreen/DownloadTemplate";
// import EmployeeDetailsForm from "./EmployeeDetailsForm";
// import { FaChevronDown } from 'react-icons/fa';
// import Alert from '@/components/ui/alert/Alert';
// import DateRangePicker from '@/components/DateRangePicker';
// // Add date-fns for date calculations
// import { startOfWeek, endOfWeek } from 'date-fns';
// import * as XLSX from 'xlsx';
// import EmployeePage from "../Employees/page";
// import { uploadFaqCsv } from "@/utils/api";
// import { fetchFaqFiles } from "@/utils/api";
// import { deleteFaqCsv } from "@/utils/api";
// import Pagination from "@/components/tables/Pagination";
// import Loader from "@/components/Loader";
// import { FaFileAlt } from "react-icons/fa";
// import EmployeeDetailsPage from "./EmployeeDetailsPage";

// interface Employee {
//   id: number;
//   emp_id: string;
//   full_name: string;
//   email: string;
//   phone: string;
//   department: string;
//   created_at: string;
//   appointment_count?: number;
//   appointment?: {
//     date: string;
//     time: string;
//     status: string;
//     notes?: string;
//   };
// }

// interface Appointment {
//   id: string;
//   date: string;
//   time: string;
//   status: string;
//   service_name: string;
//   employee_name: string;
//   employee_email: string;
//   message?: string;
//   created_at: string;
//   source?: string; // "employee", "customer", or "lead"
// }

// // Utility function to insert a line break after 30 characters
// function insertLineBreak(str: string, maxLen = 30) {
//   if (!str) return '';
//   if (str.length <= maxLen) return str;
//   // Insert a <br/> after every maxLen characters
//   const regex = new RegExp(".{1," + maxLen + "}", 'g');
//   return str.match(regex)?.join('<br/>') ?? str;
// }

// // Utility function to truncate email with ellipsis
// function truncateEmail(email: string, maxLen = 20) {
//   if (!email) return '';
//   if (email.length <= maxLen) return email;

//   // Find the @ symbol position
//   const atIndex = email.indexOf('@');
//   if (atIndex === -1) {
//     // If no @ symbol, just truncate normally
//     return email.substring(0, maxLen - 3) + '...';
//   }

//   // If @ is within the maxLen, truncate before @
//   if (atIndex <= maxLen - 3) {
//     return email.substring(0, maxLen - 3) + '...';
//   }

//   // If @ is beyond maxLen, truncate the local part
//   const localPart = email.substring(0, atIndex);
//   const domain = email.substring(atIndex);
//   const availableLength = maxLen - 3 - domain.length;

//   if (availableLength > 0) {
//     return localPart.substring(0, availableLength) + '...' + domain;
//   } else {
//     return '...' + domain;
//   }
// }

// export default function EmployeesPages() {
//   const RAW_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";
//   const BASE_URL = RAW_BASE_URL ? RAW_BASE_URL.replace(/\/+$/,'') : "";
//   const [activeTab, setActiveTab] = useState<'record' | 'knowledgebase' | 'faq'>('record');
//   const [employees, setEmployees] = useState<Employee[]>([]);
//   const [isLoading, setIsLoading] = useState(true);
//   const [selectedFile, setSelectedFile] = useState<File | null>(null);
//   const [showConfirmModal, setShowConfirmModal] = useState(false);
//   const [uploading, setUploading] = useState(false);
//   const fileInputRef = useRef<HTMLInputElement>(null);
//   const [activeFilters, setActiveFilters] = useState({
//     emp_id: "",
//     full_name: "",
//     email: "",
//     phone: "",
//     department: "",
//   });

//   const [showDeleteSingleModal, setShowDeleteSingleModal] = useState<{ open: boolean; emp_id: string | null }>({ open: false, emp_id: null });
//   const [deleting, setDeleting] = useState(false);
//   const [page, setPage] = useState(1);
//   const [size, setSize] = useState(10); // default 10
//   const [total, setTotal] = useState(0);

//   // Add Employee Modal State
//   const [showAddModal, setShowAddModal] = useState(false);

//   // Add filter type state
//   const [filterType, setFilterType] = useState<'emp_id' | 'full_name' | 'email' | 'phone' | 'department'>('emp_id');
//   const [showFilterPlaceholder, setShowFilterPlaceholder] = useState(false);
//   const [searchQuery, setSearchQuery] = useState('');

//   // Download Employee Template Modal State
//   const [showDownloadModal, setShowDownloadModal] = useState(false);
//   const [downloadForm, setDownloadForm] = useState({
//     fileFormat: "csv",
//     startDate: "",
//     endDate: "",
//     month: "",
//     specificDate: "",
//   });

//   // Upload Modal State
//   const [showUploadModal, setShowUploadModal] = useState(false);

//   // Success Alert State
//   const [alert, setAlert] = useState<{ show: boolean; variant: 'success' | 'error'; title: string; message: string }>({ show: false, variant: 'success', title: '', message: '' });

//   // Add at the top of EmployeesPages component:
//   const [showFilterDropdown, setShowFilterDropdown] = useState(false);
//   const [isFilterButtonClicked, setIsFilterButtonClicked] = useState(false);
//   const filterDropdownRef = useRef<HTMLDivElement>(null);

//   // Add responsive view state
//   const [isMobileView, setIsMobileView] = useState(false);
//   const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

//   // Employee details page state
//   const [showEmployeeDetails, setShowEmployeeDetails] = useState(false);
//   const [selectedEmployeeForDetails, setSelectedEmployeeForDetails] = useState<{ id: string; name: string } | null>(null);

//   // Appointment modal state
//   const [showAppointmentModal, setShowAppointmentModal] = useState(false);
//   const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
//   const [employeeAppointments, setEmployeeAppointments] = useState<Appointment[]>([]);
//   const [loadingAppointments, setLoadingAppointments] = useState(false);
//   // Employee booking modal (create) state
//   const [showEmployeeBookModal, setShowEmployeeBookModal] = useState(false);
//   const [bookingEmployee, setBookingEmployee] = useState<Employee | null>(null);
//   const [empServices, setEmpServices] = useState<Array<{ id:string; name:string }>>([]);
//   const [empServiceId, setEmpServiceId] = useState<string>("");
//   const [empServiceName, setEmpServiceName] = useState<string>("");
//   const [empRawSlots, setEmpRawSlots] = useState<Array<{ id:string; start_utc:string; end_utc:string; capacity:number; booked:number }>>([]);
//   const [empAvailableDates, setEmpAvailableDates] = useState<Array<{ date:string; status:'available'|'full'|'not_assigned'; slots?: number; capacity?: number }>>([]);
//   const [empSelectedDate, setEmpSelectedDate] = useState<string>("");
//   const [empDateSlots, setEmpDateSlots] = useState<Array<{ id:string; label:string; available:number }>>([]);
//   const [empSelectedSlotId, setEmpSelectedSlotId] = useState<string>("");
//   const [empShowDatePicker, setEmpShowDatePicker] = useState<boolean>(false);
//   const [empName, setEmpName] = useState<string>("");
//   const [empEmail, setEmpEmail] = useState<string>("");
//   const [empNotes, setEmpNotes] = useState<string>("");
//   const [empSubmitting, setEmpSubmitting] = useState<boolean>(false);

//   // Edit appointment state
//   const [showEditEmployeeAppointmentModal, setShowEditEmployeeAppointmentModal] = useState(false);
//   const [editingEmployeeAppointment, setEditingEmployeeAppointment] = useState<any>(null);
//   const [editEmpDate, setEditEmpDate] = useState<string>('');
//   const [editEmpShowDatePicker, setEditEmpShowDatePicker] = useState<boolean>(false);
//   const [editEmpAvailableDates, setEditEmpAvailableDates] = useState<Array<{ date:string; status:'available'|'full'|'not_assigned'; slots?: number; capacity?: number }>>([]);
//   const [editEmpDateSlots, setEditEmpDateSlots] = useState<Array<{ id:string; label:string; available:number }>>([]);
//   const [editEmpSelectedSlotId, setEditEmpSelectedSlotId] = useState<string>('');
//   const [editEmpNotes, setEditEmpNotes] = useState<string>('');
//   const [editEmpSubmitting, setEditEmpSubmitting] = useState<boolean>(false);
//   const [showEmpCancelReason, setShowEmpCancelReason] = useState<boolean>(false);
//   const [empCancelReason, setEmpCancelReason] = useState<string>('');
//   const [editEmpRawSlots, setEditEmpRawSlots] = useState<Array<{ id:string; start_utc:string; end_utc:string; capacity:number; booked:number }>>([]);

//   const openEmployeeBookModal = async (employee: Employee) => {
//     try {
//       setBookingEmployee(employee);
//       setShowEmployeeBookModal(true);
//       setEmpName(employee.full_name || "");
//       setEmpEmail(employee.email || "");
//       setEmpNotes("");
//       // Load services and filter to HR/IT
//       let current = empServices;
//       if (current.length === 0) {
//         const res = await fetch((process.env.NEXT_PUBLIC_API_URL || '') + '/appointment/admin/services');
//         if (res.ok) {
//           const data = await res.json();
//           current = (data || []).map((s: { id: string; name: string }) => ({ id: s.id, name: s.name }));
//           // Filter HR/IT
//           current = current.filter(s=> {
//             const n=(s.name||'').toLowerCase();
//             return n.includes('hr') || n.includes('it') || n.includes('human resources') || n.includes('information technology');
//           });
//           setEmpServices(current);
//         }
//       }
//       const def = current[0];
//       if (def) {
//         setEmpServiceId(def.id);
//         setEmpServiceName(def.name);
//         await loadEmployeeSlots(def.id);
//       } else {
//         setEmpServiceName('');
//       }
//     } catch (e) {
//       console.warn('Open employee book modal error', e);
//     }
//   };

//   const loadEmployeeSlots = async (serviceId: string) => {
//     try {
//       const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/appointment/availability/slots?service_id=${encodeURIComponent(serviceId)}`);
//       if (!res.ok) return;
//       const data = await res.json();
//       setEmpRawSlots(data);
//       const byDate: Record<string, { capacity: number; booked: number }> = {};
//       (data || []).forEach((slot: { start_utc?: string; capacity?: number; booked?: number }) => {
//         const d = (slot.start_utc || '').split('T')[0];
//         if(!d) return; if(!byDate[d]) byDate[d]={capacity:0, booked:0};
//         byDate[d].capacity += Number(slot.capacity||0);
//         byDate[d].booked += Number(slot.booked||0);
//       });
//       const av = Object.entries(byDate).map(([date, v]) => ({
//         date,
//         status: v.capacity <= 0 ? 'not_assigned' as const : (v.booked >= v.capacity ? 'full' as const : 'available' as const),
//         slots: v.capacity - v.booked,
//         capacity: v.capacity,
//       }));
//       setEmpAvailableDates(av);
//     } catch {}
//   };

//   const handleEmployeeDatePick = (date: string) => {
//     setEmpSelectedDate(date);
//     setEmpShowDatePicker(false);
//     const list = empRawSlots.filter((s: { start_utc?: string }) => (s.start_utc || '').startsWith(date)).map((s: { start_utc: string; end_utc: string; id: string; capacity?: number; booked?: number }) => {
//       const start = s.start_utc.split('T')[1].slice(0, 5);
//       const end = s.end_utc.split('T')[1].slice(0, 5);
//       const avail = Math.max(0, Number(s.capacity || 0) - Number(s.booked || 0));
//       return { id: s.id, label: `${start} - ${end} (${avail} available)`, available: avail };
//     }).filter((s: { available: number }) => s.available > 0);
//     setEmpDateSlots(list);
//     setEmpSelectedSlotId(list[0]?.id || '');
//   };

//   const submitEmployeeBooking = async () => {
//     if (empSubmitting) return;
//     if (!bookingEmployee || !empServiceId || !empSelectedSlotId) return;
//     const slot = empRawSlots.find(s=>s.id===empSelectedSlotId);
//     if (!slot) return;
//     const date = slot.start_utc.split('T')[0];
//     const time = slot.start_utc.split('T')[1].slice(0,5);
//     try {
//       setEmpSubmitting(true);
//       const payload = {
//         service_id: empServiceId,
//         service_name: empServiceName || 'HR/IT',
//         date,
//         time,
//         employee_name: empName || bookingEmployee.full_name,
//         employee_email: empEmail || bookingEmployee.email,
//         message: empNotes || 'Booked from Employees page',
//       } as Record<string, unknown>;
//       const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/appointment/employee/book`, {
//         method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
//       });
//       if (res.ok) {
//         setShowEmployeeBookModal(false);
//         setAlert({ show:true, variant:'success', title:'Booked', message:'Appointment booked and email will be sent.' });
//       } else {
//         let msg=''; try{ if(!res.bodyUsed) msg = await res.text(); }catch{}
//         setAlert({ show: true, variant: 'error', title: 'Booking failed', message: msg || `${res.status} ${res.statusText}` });
//       }
//       setTimeout(() => setAlert(a => ({ ...a, show: false })), 2500);
//     } catch (e: unknown) {
//       const errorMessage = e instanceof Error ? e.message : String(e)
//       setAlert({ show: true, variant: 'error', title: 'Booking failed', message: errorMessage });
//       setTimeout(()=> setAlert(a=> ({...a, show:false})), 2500);
//     } finally {
//       setEmpSubmitting(false);
//     }
//   };

//   // Edit appointment functions
//   const openEditEmployeeAppointmentModal = async (appointment: any) => {
//     try {
//       setEditingEmployeeAppointment(appointment);
//       // Normalize date to YYYY-MM-DD format (handle ISO strings)
//       const normalizedDate = appointment.date ? appointment.date.split('T')[0] : '';
//       setEditEmpDate(normalizedDate);
//       setEditEmpNotes(appointment.message || appointment.notes || '');
//       setShowEmpCancelReason(false);
//       setEmpCancelReason('');
//       setEditEmpSelectedSlotId('');
//       setEditEmpShowDatePicker(false);
//       setShowEditEmployeeAppointmentModal(true);

//       // Resolve service_id - try multiple ways
//       let serviceId = appointment.service_id;
//       if (!serviceId && appointment.service_name) {
//         const service = empServices.find(s => s.name === appointment.service_name);
//         if (service) {
//           serviceId = service.id;
//         } else {
//           try {
//             const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/appointment/admin/services`);
//             if (res.ok) {
//               const data = await res.json();
//               const fetchedServices = (data || []).map((s: any) => ({ id: s.id, name: s.name }));
//               setEmpServices(fetchedServices);
//               const matchedService = fetchedServices.find((s: any) => s.name === appointment.service_name);
//               if (matchedService) {
//                 serviceId = matchedService.id;
//               }
//             }
//           } catch (e) {
//             console.warn('Error fetching services:', e);
//           }
//         }
//       }

//       if (serviceId) {
//         await loadEditEmployeeSlots(serviceId, normalizedDate, appointment.time);
//       } else {
//         console.warn('Could not resolve service_id for appointment:', appointment);
//       }
//     } catch (e) {
//       console.warn('Open edit employee modal error', e);
//     }
//   };

//   const loadEditEmployeeSlots = async (serviceId: string, currentDate: string, currentTime: string) => {
//     try {
//       const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/appointment/availability/slots?service_id=${encodeURIComponent(serviceId)}`);
//       if (!res.ok) return;
//       const data = await res.json();
//       setEditEmpRawSlots(data);

//       const byDate: Record<string, { capacity: number; booked: number }> = {};
//       (data || []).forEach((slot: any) => {
//         const d = (slot.start_utc || '').split('T')[0];
//         if (!d) return;
//         if (!byDate[d]) byDate[d] = { capacity: 0, booked: 0 };
//         byDate[d].capacity += Number(slot.capacity || 0);
//         byDate[d].booked += Number(slot.booked || 0);
//       });
//       // USE EXACT SAME LOGIC AS loadEmployeeSlots - map ALL entries, no filter, no sort
//       const dates = Object.entries(byDate).map(([date, v]) => ({
//         date,
//         status: v.capacity <= 0 ? 'not_assigned' : (v.booked >= v.capacity ? 'full' : 'available') as any,
//         slots: v.capacity - v.booked,
//         capacity: v.capacity,
//       }));

//       // Normalize currentDate to YYYY-MM-DD format before comparison
//       const normalizedCurrentDate = currentDate ? currentDate.split('T')[0] : '';

//       // Always include current appointment date if not in dates, mark it as available
//       if (normalizedCurrentDate) {
//         const dateExists = dates.find(d => d.date === normalizedCurrentDate);
//         if (!dateExists) {
//           dates.push({
//             date: normalizedCurrentDate,
//             status: 'available' as any,
//             slots: 1,
//             capacity: 1,
//           });
//         }
//         setEditEmpDate(normalizedCurrentDate);
//         handleEditEmployeeDatePick(normalizedCurrentDate, currentTime);
//       }

//       setEditEmpAvailableDates(dates);
//     } catch (e) {
//       console.warn('Load edit employee slots error', e);
//     }
//   };

//   const handleEditEmployeeDatePick = (date: string, currentTime?: string) => {
//     setEditEmpDate(date);
//     setEditEmpShowDatePicker(false);
//     const slotsForDate = (editEmpRawSlots || []).filter((slot: any) => {
//       const slotDate = (slot.start_utc || '').split('T')[0];
//       return slotDate === date;
//     });
//     const formattedSlots = slotsForDate.map((slot: any) => {
//       const startUtc = slot.start_utc;
//       const endUtc = slot.end_utc;
//       const startTime = startUtc.split('T')[1]?.slice(0, 5) || '';
//       const endTime = endUtc.split('T')[1]?.slice(0, 5) || '';
//       const label = startTime === endTime ? startTime : `${startTime}-${endTime}`;
//       return {
//         id: slot.id,
//         label: `${label} (${slot.capacity - slot.booked}/${slot.capacity} available)`,
//         available: slot.capacity - slot.booked,
//         start_utc: startUtc,
//       };
//     }).filter((s: any) => s.available > 0 || currentTime).sort((a: any, b: any) => {
//       const aTime = a.start_utc.split('T')[1];
//       const bTime = b.start_utc.split('T')[1];
//       return (aTime || '').localeCompare(bTime || '');
//     });
//     setEditEmpDateSlots(formattedSlots);

//     if (currentTime && formattedSlots.length > 0) {
//       const matchingSlot = formattedSlots.find((s: any) => {
//         const slotTime = s.start_utc.split('T')[1]?.slice(0, 5);
//         return slotTime === currentTime;
//       });
//       if (matchingSlot) {
//         setEditEmpSelectedSlotId(matchingSlot.id);
//       } else {
//         setEditEmpSelectedSlotId(formattedSlots[0].id);
//       }
//     } else if (formattedSlots.length > 0) {
//       setEditEmpSelectedSlotId(formattedSlots[0].id);
//     }
//   };

//   const submitUpdateEmployeeAppointment = async () => {
//     if (editEmpSubmitting || !editingEmployeeAppointment || !editEmpDate || !editEmpSelectedSlotId) return;

//     const slot = editEmpRawSlots.find((s: any) => s.id === editEmpSelectedSlotId);
//     if (!slot) return;

//     const time = slot.start_utc.split('T')[1]?.slice(0, 5) || '';

//     try {
//       setEditEmpSubmitting(true);
//       const base = process.env.NEXT_PUBLIC_API_URL || '';
//       // Use employee-specific endpoint
//       const res = await fetch(`${base}/appointment/employee/appointments/${editingEmployeeAppointment.id}`, {
//         method: 'PUT',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({
//           date: editEmpDate,
//           time: time,
//           notes: editEmpNotes || editingEmployeeAppointment.message || editingEmployeeAppointment.notes || '',
//         }),
//       });

//       if (res.ok) {
//         setAlert({ show: true, variant: 'success', title: 'Updated', message: 'Appointment updated successfully.' });
//         setShowEditEmployeeAppointmentModal(false);
//         if (selectedEmployee) {
//           fetchEmployeeAppointments(selectedEmployee);
//         }
//       } else {
//         const msg = await res.text().catch(() => `${res.status} ${res.statusText}`);
//         setAlert({ show: true, variant: 'error', title: 'Update failed', message: msg });
//       }
//       setTimeout(() => setAlert(a => ({ ...a, show: false })), 2500);
//     } catch (e: any) {
//       setAlert({ show: true, variant: 'error', title: 'Update failed', message: e?.message || e });
//       setTimeout(() => setAlert(a => ({ ...a, show: false })), 2500);
//     } finally {
//       setEditEmpSubmitting(false);
//     }
//   };

//   const submitCancelEmployeeAppointment = async () => {
//     if (editEmpSubmitting || !editingEmployeeAppointment) return;
//     if (!empCancelReason.trim()) {
//       setAlert({ show: true, variant: 'error', title: 'Error', message: 'Please provide a reason for cancellation.' });
//       setTimeout(() => setAlert(a => ({ ...a, show: false })), 2500);
//       return;
//     }

//     try {
//       setEditEmpSubmitting(true);
//       const base = process.env.NEXT_PUBLIC_API_URL || '';
//       // Use employee-specific cancellation endpoint
//       const res = await fetch(`${base}/appointment/employee/appointments/${editingEmployeeAppointment.id}`, {
//         method: 'DELETE',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({
//           reason: empCancelReason,
//         }),
//       });

//       if (res.ok) {
//         setAlert({ show: true, variant: 'success', title: 'Cancelled', message: 'Appointment cancelled successfully.' });
//         setShowEditEmployeeAppointmentModal(false);
//         if (selectedEmployee) {
//           fetchEmployeeAppointments(selectedEmployee);
//         }
//       } else {
//         const msg = await res.text().catch(() => `${res.status} ${res.statusText}`);
//         setAlert({ show: true, variant: 'error', title: 'Cancellation failed', message: msg });
//       }
//       setTimeout(() => setAlert(a => ({ ...a, show: false })), 2500);
//     } catch (e: any) {
//       setAlert({ show: true, variant: 'error', title: 'Cancellation failed', message: e?.message || e });
//       setTimeout(() => setAlert(a => ({ ...a, show: false })), 2500);
//     } finally {
//       setEditEmpSubmitting(false);
//     }
//   };

//   // Click-away handler for filter dropdown
//   useEffect(() => {
//     if (!showFilterDropdown || isFilterButtonClicked) return;

//     function handleClickOutside(event: MouseEvent) {
//       const target = event.target as Element;

//       // Don't close if clicking on the filter button itself
//       if (target.closest('button[data-filter-button]')) {
//         return;
//       }

//       // Don't close if clicking inside the filter dropdown
//       if (filterDropdownRef.current && filterDropdownRef.current.contains(target)) {
//         return;
//       }

//       setShowFilterDropdown(false);
//     }

//     document.addEventListener('click', handleClickOutside);

//     return () => {
//       document.removeEventListener('click', handleClickOutside);
//     };
//   }, [showFilterDropdown, isFilterButtonClicked]);

//   // Add state for new filter options
//   const [timeFrame, setTimeFrame] = useState<'all' | 'today' | 'this_week' | 'custom'>('all');
//   const [customStartDate, setCustomStartDate] = useState<Date | null>(null);
//   const [customEndDate, setCustomEndDate] = useState<Date | null>(null);
//   const [sortOption, setSortOption] = useState<'created_at_desc' | 'created_at_asc' | 'full_name_asc' | 'full_name_desc' | 'email_asc' | 'email_desc'>('created_at_desc');

//   // Add allEmployees state
//   const [allEmployees, setAllEmployees] = useState<Employee[]>([]);

//   // Employee FAQ states
//   const [faqFiles, setFaqFiles] = useState<Array<{ filename: string; directory: string; full_path: string; key: string; size_bytes: number; last_modified: string }>>([]);
//   const [faqListLoading, setFaqListLoading] = useState(false);
//   const [selectedFilenames, setSelectedFilenames] = useState<Set<string>>(new Set());
//   const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; filename?: string }>({ open: false });
//   const FAQ_DIRECTORY = 'Employee_faq';

//   const isAllSelected = faqFiles.length > 0 && faqFiles.every(f => selectedFilenames.has(f.filename));
//   const toggleSelectAll = () => {
//     setSelectedFilenames(prev => {
//       if (isAllSelected) return new Set(prev);
//       return new Set(faqFiles.map(f => f.filename));
//     });
//   };
//   const toggleSelectOne = (name: string) => {
//     setSelectedFilenames(prev => {
//       const next = new Set(prev);
//       if (next.has(name)) next.delete(name); else next.add(name);
//       return next;
//     });
//   };
//   function getFileTypeFromName(name: string) {
//     const dot = name.lastIndexOf('.');
//     if (dot >= 0) return name.substring(dot + 1).toUpperCase();
//     return 'FILE';
//   }

//   // Load Employee FAQ file when FAQ tab becomes active
//   useEffect(() => {
//     async function loadFaqFiles() {
//       if (activeTab !== 'faq') return;
//       try {
//         setFaqListLoading(true);
//         const { files } = await fetchFaqFiles(FAQ_DIRECTORY);
//         setFaqFiles(Array.isArray(files) ? files : []);
//       } catch (e) {
//         console.error('Failed to load Employee FAQ file', e);
//       } finally {
//         setFaqListLoading(false);
//       }
//     }
//     loadFaqFiles();
//   }, [activeTab]);

//   const refreshFaqFiles = async () => {
//     try {
//       setFaqListLoading(true);
//       const { files } = await fetchFaqFiles(FAQ_DIRECTORY);
//       setFaqFiles(Array.isArray(files) ? files : []);
//       setAlert({ show: true, variant: 'success', title: 'Refreshed', message: 'FAQ list refreshed.' });
//       setTimeout(() => setAlert(a => ({ ...a, show: false })), 2000);
//     } catch (e) {
//       const msg = e instanceof Error ? e.message : 'Failed to refresh FAQ file';
//       setAlert({ show: true, variant: 'error', title: 'Refresh Failed', message: msg });
//       setTimeout(() => setAlert(a => ({ ...a, show: false })), 3000);
//     } finally {
//       setFaqListLoading(false);
//     }
//   };

//   // Check screen size on mount and resize
//   useEffect(() => {
//     const checkScreenSize = () => {
//       setIsMobileView(window.innerWidth < 768);
//     };

//     checkScreenSize();
//     window.addEventListener('resize', checkScreenSize);

//     return () => window.removeEventListener('resize', checkScreenSize);
//   }, []);

//   // Toggle row expansion
//   const toggleRowExpansion = (empId: string) => {
//     setExpandedRows(prev => {
//       const newSet = new Set(prev);
//       if (newSet.has(empId)) {
//         newSet.delete(empId);
//       } else {
//         newSet.add(empId);
//       }
//       return newSet;
//     });
//   };

//       // Enhanced Mobile Card Component
//       const EmployeeCard = ({ employee }: { employee: Employee }) => {
//         const isExpanded = expandedRows.has(employee.emp_id);
//         const isSelected = selectedEmployeeIds.includes(employee.emp_id);

//         return (
//           <div className={`relative overflow-hidden rounded-2xl shadow-lg border transition-all duration-300 hover:shadow-xl group ${
//             isSelected 
//               ? 'ring-2 ring-blue-500 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-700' 
//               : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
//           }`}>
//             {/* Card Header */}
//             <div className="p-6 border-b border-gray-100 dark:border-gray-700">
//               <div className="flex items-center justify-between">
//                 <div className="flex items-center gap-4">
//                   <input
//                     type="checkbox"
//                     checked={isSelected}
//                     onChange={() => handleSelectOne(employee.emp_id)}
//                     className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
//                   />
//                   <div className="flex-1 min-w-0">
//                     <div className="flex items-center gap-3 mb-2">
//                       <div className="w-10 h-10 bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 rounded-full flex items-center justify-center">
//                         <span className="text-sm font-semibold text-green-700 dark:text-green-300">
//                           {employee.full_name.charAt(0).toUpperCase()}
//                         </span>
//                       </div>
//                       <div className="flex-1 min-w-0">
//                         <h3 
//                           className="text-lg font-semibold text-gray-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors cursor-pointer hover:underline"
//                           onClick={() => handleEmployeeDetailsClick(employee.emp_id, employee.full_name)}
//                           title="Click to view employee details"
//                         >
//                       {employee.full_name}
//                     </h3>
//                     <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
//                       ID: {employee.emp_id}
//                     </p>
//                       </div>
//                     </div>
//                     <div className="flex items-center gap-2 mt-2">
//                       <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
//                         {employee.department}
//                       </span>
//                     </div>
//                   </div>
//                 </div>
//                 <div className="flex items-center gap-2">
//                   <button
//                     className="inline-flex items-center justify-center px-3 py-2 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-300 dark:hover:border-blue-700 transition-all duration-200 shadow-sm hover:shadow-md rounded-md text-sm font-medium"
//                     onClick={() => setShowDeleteSingleModal({ open: true, emp_id: employee.emp_id })}
//                     title="Delete employee"
//                   >
//                     <FaTrash className="w-3 h-3" />
//                   </button>
//                   <button
//                     onClick={() => toggleRowExpansion(employee.emp_id)}
//                     className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
//                   >
//                     <svg
//                       className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
//                       fill="none"
//                       stroke="currentColor"
//                       viewBox="0 0 24 24"
//                     >
//                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
//                     </svg>
//                   </button>
//                 </div>
//               </div>
//             </div>

//             {/* Collapsible Content */}
//             {isExpanded && (
//               <div className="px-6 pb-6 space-y-4 animate-in slide-in-from-top-2 duration-200">
//                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
//                   <div className="space-y-1">
//                     <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Email</span>
//                     <p 
//                       className="text-sm text-gray-900 dark:text-white font-medium truncate cursor-help" 
//                       title={employee.email}
//                     >
//                       {truncateEmail(employee.email, 25)}
//                     </p>
//                   </div>
//                   <div className="space-y-1">
//                     <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Phone Number</span>
//                     <p className="text-sm text-gray-900 dark:text-white font-medium">{employee.phone}</p>
//                   </div>
//                 </div>

//                 {/* Appointment Info */}
//                 <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
//                   <div className="flex justify-between items-center">
//                     <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Appointment</span>
//                     {employee.appointment ? (
//                       <div className="flex items-center gap-2">
//                         <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
//                         </svg>
//                         <div className="text-right">
//                           <div className="text-sm font-semibold text-gray-900 dark:text-white">
//                             {new Date(employee.appointment.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
//                           </div>
//                           <div className="text-xs text-gray-500 dark:text-gray-400">{employee.appointment.time}</div>
//                         </div>
//                       </div>
//                     ) : (
//                       <span className="px-3 py-1 rounded-full text-xs font-semibold border shadow whitespace-nowrap bg-teal-100 text-teal-800 border-teal-300">N/A</span>
//                     )}
//                   </div>
//                 </div>
//                 <div className="space-y-1">
//                   <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Created</span>
//                   <p className="text-sm text-gray-900 dark:text-white font-medium">
//                     {new Date(employee.created_at).toLocaleDateString('en-US', {
//                       year: 'numeric',
//                       month: 'long',
//                       day: 'numeric'
//                     })}
//                   </p>
//                 </div>
//               </div>
//             )}
//           </div>
//         );
//       };

//   // Auto-apply filters on change (reset page to 1)
//   useEffect(() => {
//     setPage(1);
//     // You can add logic to update activeFilters or fetchEmployees if needed
//   }, [filterType, timeFrame, customStartDate, customEndDate, sortOption]);


//   // Move fetchEmployees to top-level with useCallback to prevent infinite loops
//   const fetchEmployees = useCallback(async (setAllEmployees: (data: Employee[]) => void, setTotal: (total: number) => void, setIsLoading: (loading: boolean) => void) => {
//     setIsLoading(true);
//     const params = new URLSearchParams();
//     params.append("page", "1");
//     params.append("size", "1000"); // fetch up to 1000 employees
//     try {
//       const response = await fetch(
//         BASE_URL + "/api/v1/employees/?" + params.toString(),
//         {
//           method: "GET",
//           headers: { accept: "application/json" },
//         },
//       );
//       if (response.ok) {
//         const data = await response.json();
//         const employeesData = data.data || [];

//         // Fetch appointment counts for all employees (only employee source)
//         const employeesWithCounts = await Promise.all(
//           employeesData.map(async (emp: Employee) => {
//             try {
//               const countResponse = await fetch(
//                 `${BASE_URL}/appointment/admin/appointments?source=employee&customer_email=${encodeURIComponent(emp.email)}`,
//                 {
//                   method: 'GET',
//                   headers: { accept: 'application/json' },
//                 }
//               );
//               if (countResponse.ok) {
//                 const appointments = await countResponse.json();
//                 const employeeAppointments = Array.isArray(appointments) 
//                   ? appointments.filter((apt: any) => apt.source === 'employee')
//                   : [];
//                 return { ...emp, appointment_count: employeeAppointments.length };
//               }
//             } catch (error) {
//               console.error(`Error fetching appointment count for ${emp.email}:`, error);
//             }
//             return { ...emp, appointment_count: emp.appointment_count || 0 };
//           })
//         );

//         setAllEmployees(employeesWithCounts);
//         setTotal(data.total_records || 0);
//       }
//     } finally {
//       setIsLoading(false);
//     }
//   }, [BASE_URL]);

//   // Add this wrapper for the new fetchEmployees
//   const fetchAllEmployees = useCallback(() => fetchEmployees(setAllEmployees, setTotal, setIsLoading), [fetchEmployees, setAllEmployees, setTotal, setIsLoading]);

//   // Replace useEffect for initial fetch and dependency updates
//   useEffect(() => {
//     fetchAllEmployees();
//   }, [fetchAllEmployees, activeFilters, page, size, timeFrame, customStartDate, customEndDate, sortOption]);

//   // Reset filter state on page load/reload
//   useEffect(() => {
//     setShowFilterDropdown(false);
//     setTimeFrame('all');
//     setCustomStartDate(null);
//     setCustomEndDate(null);
//     setSortOption('created_at_desc');
//     setIsFilterButtonClicked(false);
//     setShowFilterPlaceholder(false);
//     setSearchQuery('');
//     setFilterType('emp_id');
//     setPage(1);
//     setSize(10);
//     setSelectedEmployeeIds([]);
//   }, []);

//   // Update frontend filtering useEffect to include all filters and pagination
//   useEffect(() => {
//     let filtered = [...allEmployees];
//     // Filter By and search
//     if (searchQuery) {
//       if (filterType && showFilterPlaceholder) {
//         // Specific field search when filter is selected
//       filtered = filtered.filter(emp => {
//         const val = emp[filterType] ? String(emp[filterType]).toLowerCase() : '';
//         return val.includes(searchQuery.toLowerCase());
//       });
//       } else {
//         // Advanced global search across all fields when no specific filter is selected
//         filtered = filtered.filter(emp => {
//           const searchWords = searchQuery.toLowerCase().trim().split(/\s+/).filter(word => word.length > 0);

//           if (searchWords.length === 0) return true;

//           // Check if ANY word matches ANY field (solar search)
//           return searchWords.some(word => {
//             return (
//               (emp.emp_id && emp.emp_id.toLowerCase().includes(word)) ||
//               (emp.full_name && emp.full_name.toLowerCase().includes(word)) ||
//               (emp.email && emp.email.toLowerCase().includes(word)) ||
//               (emp.phone && emp.phone.toLowerCase().includes(word)) ||
//               (emp.department && emp.department.toLowerCase().includes(word))
//             );
//           });
//         });
//       }
//     }
//     // Time Frame filter
//     if (timeFrame === 'today') {
//       const today = new Date();
//       const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
//       const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
//       filtered = filtered.filter(emp => {
//         const created = new Date(emp.created_at);
//         return created >= startOfDay && created <= endOfDay;
//       });
//     } else if (timeFrame === 'this_week') {
//       const now = new Date();
//       const weekStart = startOfWeek(now, { weekStartsOn: 1 });
//       const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
//       filtered = filtered.filter(emp => {
//         const created = new Date(emp.created_at);
//         return created >= weekStart && created <= weekEnd;
//       });
//     } else if (timeFrame === 'custom' && customStartDate && customEndDate) {
//       filtered = filtered.filter(emp => {
//         const created = new Date(emp.created_at);
//         return created >= customStartDate && created <= customEndDate;
//       });
//     }
//     // Sort By
//     filtered.sort((a, b) => {
//       switch (sortOption) {
//         case 'created_at_desc':
//           return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
//         case 'created_at_asc':
//           return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
//         case 'full_name_asc':
//           return a.full_name.localeCompare(b.full_name);
//         case 'full_name_desc':
//           return b.full_name.localeCompare(a.full_name);
//         case 'email_asc':
//           return a.email.localeCompare(b.email);
//         case 'email_desc':
//           return b.email.localeCompare(a.email);
//         default:
//           return 0;
//       }
//     });
//     // Pagination
//     const start = (page - 1) * size;
//     const end = start + size;
//     setEmployees(filtered.slice(start, end));
//     setTotal(filtered.length);
//   }, [allEmployees, filterType, searchQuery, timeFrame, customStartDate, customEndDate, sortOption, page, size, showFilterPlaceholder]);

//   // File upload
//   const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
//     if (event.target.files && event.target.files.length > 0) {
//       const file = event.target.files[0];

//       // Validate file format
//       const allowedTypes = [
//         'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
//         'application/vnd.ms-excel', // .xls
//         'text/csv', // .csv
//         'application/csv' // .csv alternative
//       ];

//       const allowedExtensions = ['.xlsx', '.xls', '.csv'];
//       const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));

//       const isValidFormat = allowedTypes.includes(file.type) || allowedExtensions.includes(fileExtension);

//       if (!isValidFormat) {
//         setAlert({
//           show: true,
//           variant: 'error',
//           title: 'Invalid File Format',
//           message: 'Unsupported file format. Only CSV, XLS, and XLSX are allowed.'
//         });
//         setTimeout(() => setAlert(a => ({ ...a, show: false })), 3000);
//         if (fileInputRef.current) fileInputRef.current.value = "";
//         return;
//       }

//       setSelectedFile(file);
//       setShowConfirmModal(true);
//     }
//   };

//   // Update handleConfirmUpload to await fetchAllEmployees
//   const handleConfirmUpload = async () => {
//     if (selectedFile) {
//       setUploading(true);
//       const formData = new FormData();
//       formData.append("file", selectedFile);

//       try {
//         const response = await fetch(
//           BASE_URL + "/api/v1/upload-employees/",
//           {
//             method: "POST",
//             body: formData,
//           }
//         );

//         if (response.ok) {
//           await fetchAllEmployees();

//           // Show success message
//           setAlert({
//             show: true,
//             variant: 'success',
//             title: 'Upload Successful!',
//             message: "File uploaded: " + selectedFile.name
//           });
//           setTimeout(() => setAlert(a => ({ ...a, show: false })), 3000);
//         } else {
//           // Handle different error responses from backend
//           let errorMessage = "Failed to upload employee file. Please try again.";

//           try {
//             const errorData = await response.json();

//             // Check for specific error messages from backend
//             if (errorData.message) {
//               errorMessage = errorData.message;
//             } else if (errorData.detail) {
//               errorMessage = errorData.detail;
//             } else if (errorData.error) {
//               errorMessage = errorData.error;
//             }

//             // Handle specific error cases for employees
//             if (errorMessage.includes("Missing required columns") ||
//                 errorMessage.includes("department") ||
//                 errorMessage.includes("emp_id") ||
//                 errorMessage.includes("email") ||
//                 errorMessage.includes("full_name")) {
//               errorMessage = "Missing required columns: department, emp_id, email, full_name";
//             } else if (errorMessage.includes("Unsupported file format") ||
//                        errorMessage.includes("file format")) {
//               errorMessage = "Unsupported file format. Only CSV, XLS, and XLSX are allowed.";
//             }
//           } catch {
//             // If we can't parse the error response, use the status text
//             if (response.statusText) {
//               errorMessage = "Upload failed: " + response.statusText;
//             }
//           }

//           setAlert({
//             show: true,
//             variant: 'error',
//             title: 'Upload Failed',
//             message: errorMessage
//           });
//           setTimeout(() => setAlert(a => ({ ...a, show: false })), 3000);
//         }
//       } catch {
//         setAlert({
//           show: true,
//           variant: 'error',
//           title: 'Network Error',
//           message: 'Network error. Please check your connection and try again.'
//         });
//         setTimeout(() => setAlert(a => ({ ...a, show: false })), 3000);
//       } finally {
//         setUploading(false);
//         setShowConfirmModal(false);
//         setSelectedFile(null);
//       }
//     }
//   };

//   const handleCancelUpload = () => {
//     setShowConfirmModal(false);
//     setSelectedFile(null);
//     if (fileInputRef.current) fileInputRef.current.value = "";
//   };


//   // Optionally clear search input when filterType changes
//   useEffect(() => {
//     setSearchQuery('');
//   }, [filterType]);

//   // Only update activeFilters when searchQuery changes, NOT when filterType changes
//   useEffect(() => {
//     setActiveFilters(f => ({ ...f, [filterType]: searchQuery }));
//   }, [searchQuery, filterType]);

//   // Delete Single ---->
//   const handleDeleteSingle = async (emp_id: string) => {
//     setDeleting(true);
//     try {
//       const response = await fetch(BASE_URL + "/api/v1/employees/" + emp_id + "/", {
//         method: "DELETE",
//         headers: { "accept": "application/json" },
//       });
//       if (response.ok) {
//       fetchAllEmployees();
//         setAlert({ show: true, variant: 'success', title: 'Delete Successful!', message: 'Employee deleted successfully.' }); // Show success alert in Action column
//       } else {
//         setAlert({ show: true, variant: 'error', title: 'Delete Failed', message: 'Failed to delete employee.' }); // Show error alert in Action column
//       }
//       setTimeout(() => setAlert(a => ({ ...a, show: false })), 3000); // Hide alert after 3 seconds
//     } finally {
//       setDeleting(false);
//       setShowDeleteSingleModal({ open: false, emp_id: null });
//     }
//   };

//   const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
//   const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

//   // Select all handler
//   const allSelected = employees.length > 0 && employees.every(emp => selectedEmployeeIds.includes(emp.emp_id));
//   const handleSelectAll = () => {
//     if (allSelected) {
//       setSelectedEmployeeIds([]);
//     } else {
//       setSelectedEmployeeIds(employees.map(emp => emp.emp_id));
//     }
//   };
//   // Select single handler
//   const handleSelectOne = (emp_id: string) => {
//     setSelectedEmployeeIds(ids => ids.includes(emp_id) ? ids.filter(id => id !== emp_id) : [...ids, emp_id]);
//   };

//   // Handle employee details click
//   const handleEmployeeDetailsClick = (employeeId: string, employeeName: string) => {
//     setSelectedEmployeeForDetails({ id: employeeId, name: employeeName });
//     setShowEmployeeDetails(true);
//   };
//   // Bulk delete handler
//   const handleBulkDelete = async () => {
//     setShowBulkDeleteConfirm(false);
//     setDeleting(true);
//     try {
//       for (const emp_id of selectedEmployeeIds) {
//         await fetch(BASE_URL + "/api/v1/employees/" + emp_id + "/", {
//           method: "DELETE",
//           headers: { "accept": "application/json" },
//         });
//       }
//       fetchAllEmployees();
//       setSelectedEmployeeIds([]);
//       setAlert({ show: true, variant: 'success', title: 'Delete Successful!', message: 'Selected employees deleted.' });
//       setTimeout(() => setAlert(a => ({ ...a, show: false })), 3000);
//     } finally {
//       setDeleting(false);
//     }
//   };

//   // Download template handler
//   const handleDownload = async (e: React.FormEvent) => {
//     e.preventDefault();
//     if (!downloadForm.fileFormat) return;
//     const fileExt = downloadForm.fileFormat === 'csv' ? 'csv' : 'xlsx';
//       const now = new Date();
//       const pad = (n: number) => n.toString().padStart(2, '0');
//       const timestamp = pad(now.getDate()) + "-" + pad(now.getMonth() + 1) + "-" + now.getFullYear() + "_" + pad(now.getHours()) + "-" + pad(now.getMinutes()) + "-" + pad(now.getSeconds());
//       const fileName = "Employee_Records_" + timestamp + "." + fileExt;
//     // Use only selected employees if any, otherwise all filtered
//     const exportData = (selectedEmployeeIds.length > 0
//       ? employees.filter(emp => selectedEmployeeIds.includes(emp.emp_id))
//       : employees
//     ).map(({ id, emp_id, full_name, email, phone, department, created_at }) => ({ id, emp_id, full_name, email, phone, department, created_at }));
//     if (exportData.length === 0) {
//       setAlert({ show: true, variant: 'error', title: 'No Data', message: 'No data available to download.' });
//       setTimeout(() => setAlert(a => ({ ...a, show: false })), 3000);
//       return;
//     }
//     if (downloadForm.fileFormat === 'csv') {
//       const header = Object.keys(exportData[0] || {}).join(',');
//       const rows = exportData.map(row => Object.values(row).map(val => `"${String(val).replace(/"/g, '""')}"`).join(',')).join('\n');
//       const csvContent = header + "\n" + rows;
//       const blob = new Blob([csvContent], { type: 'text/csv' });
//       const link = document.createElement('a');
//       link.href = URL.createObjectURL(blob);
//       link.download = fileName;
//       document.body.appendChild(link);
//       link.click();
//       link.remove();
//       URL.revokeObjectURL(link.href);
//     } else {
//       const ws = XLSX.utils.json_to_sheet(exportData);
//       const wb = XLSX.utils.book_new();
//       XLSX.utils.book_append_sheet(wb, ws, 'Employees');
//       XLSX.writeFile(wb, fileName);
//     }
//       setShowDownloadModal(false);
//       setAlert({ show: true, variant: 'success', title: 'Download Successful!', message: "File downloaded: " + fileName });
//       setTimeout(() => setAlert(a => ({ ...a, show: false })), 3000);
//   };

//   // Appointment functions
//   const fetchEmployeeAppointments = async (employee: Employee) => {
//     setLoadingAppointments(true);
//     try {
//       // Fetch ONLY employee source appointments for this specific employee by email
//       const urlBase = process.env.NEXT_PUBLIC_API_URL || 'https://py-mobiloitte.converiqo.ai';
//       const response = await fetch(`${urlBase}/appointment/admin/appointments?source=employee&customer_email=${encodeURIComponent(employee.email)}`);
//       if (response.ok) {
//         const appointments = await response.json();
//         // Filter to ensure only employee source appointments are shown
//         const filteredAppointments = Array.isArray(appointments) 
//           ? appointments.filter((apt: Appointment) => apt.source === 'employee')
//           : [];
//         setEmployeeAppointments(filteredAppointments);
//       } else {
//         console.error('Failed to fetch appointments');
//         setEmployeeAppointments([]);
//       }
//     } catch (error) {
//       console.error('Error fetching appointments:', error);
//       setEmployeeAppointments([]);
//     } finally {
//       setLoadingAppointments(false);
//     }
//   };

//   const openAppointmentModal = (employee: Employee) => {
//     setSelectedEmployee(employee);
//     setShowAppointmentModal(true);
//     fetchEmployeeAppointments(employee);
//   };

//   const closeAppointmentModal = () => {
//     setShowAppointmentModal(false);
//     setSelectedEmployee(null);
//     setEmployeeAppointments([]);
//   };

//   return (
//     <div className="min-h-screen bg-white dark:bg-gray-900">
//       <div className="mx-4 md:mx-6 mt-6 mb-8">
//         <DashboardHeader
//           title="Employees"
//           subtitle="Enhance workforce productivity with employee management and knowledge-sharing tools. Track performance, manage records, and foster team collaboration."
//           icon={UsersIcon}
//           gradientFrom="from-blue-900"
//           gradientTo="to-indigo-800"
//           actions={null}
//         />
//       </div>

//       {/* Enhanced Tab Navigation */}
//       <div className="relative mb-8 mx-4 md:mx-6">
//         <div className="bg-white dark:bg-gray-800 rounded-2xl p-2 shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden relative">
//           <div className="relative z-10 inline-flex rounded-xl bg-white dark:bg-gray-800 border border-stroke dark:border-gray-700 p-1 shadow">
//             <button
//               type="button"
//               onClick={() => setActiveTab('record')}
//               className={`px-6 py-3 text-sm font-semibold rounded-lg transition-all duration-300 flex items-center gap-2 ${activeTab === 'record' 
//                 ? 'bg-blue-600 text-white shadow-lg transform scale-105' 
//                 : 'text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20'}`}
//             >
//               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
//               </svg>
//               Employee Records
//               <span className="ml-2 px-2 py-1 text-xs bg-white/20 text-white rounded-full">
//                 {employees.length}
//               </span>
//             </button>
//             <button
//               type="button"
//               onClick={() => setActiveTab('knowledgebase')}
//               className={`px-6 py-3 text-sm font-semibold rounded-lg transition-all duration-300 flex items-center gap-2 ${activeTab === 'knowledgebase' 
//                 ? 'bg-blue-600 text-white shadow-lg transform scale-105' 
//                 : 'text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20'}`}
//             >
//               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
//               </svg>
//               Knowledge Base
//               <span className="ml-2 px-2 py-1 text-xs bg-white/20 text-white rounded-full">
//                 Docs
//               </span>
//             </button>
//             <button
//               type="button"
//               onClick={() => setActiveTab('faq')}
//               className={`px-6 py-3 text-sm font-semibold rounded-lg transition-all duration-300 flex items-center gap-2 ${activeTab === 'faq' 
//                 ? 'bg-blue-600 text-white shadow-lg transform scale-105' 
//                 : 'text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20'}`}
//             >
//               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
//               </svg>
//               FAQ
//               <span className="ml-2 px-2 py-1 text-xs bg-white/20 text-white rounded-full">
//                 {faqFiles.length}
//               </span>
//             </button>
//           </div>
//         </div>
//       </div>
//       {/* Tab Content */}
//       {activeTab === 'record' && (
//         <React.Fragment>
//           <div className="pb-8">
//               {/* Enhanced Control Bar */}
//               <div className="mb-8 mx-4 md:mx-6">
//                 <div className="bg-gradient-to-br from-white via-white to-gray-50/30 dark:from-gray-800 dark:via-gray-800 dark:to-gray-900/50 rounded-2xl p-6 shadow-xl border-0 overflow-hidden backdrop-blur-sm relative">
//                   <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 rounded-full -translate-y-16 translate-x-16"></div>
//                   <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-full translate-y-12 -translate-x-12"></div>
//                   <div className="relative z-10">
//                   <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
//                     {/* Search Section */}
//                     <div className="flex-1 max-w-md">
//                       <div className="relative group">
//                         <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
//                           <FaSearch className="h-4 w-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
//                         </div>
//                         <input
//                           type="text"
//                           value={searchQuery}
//                           onChange={e => setSearchQuery(e.target.value)}
//                           placeholder={
//                             showFilterPlaceholder ? (
//                               filterType === 'emp_id' ? 'Search by Employee ID' :
//                               filterType === 'full_name' ? 'Search by Name' :
//                               filterType === 'email' ? 'Search by Email' :
//                               filterType === 'phone' ? 'Search by Mobile No' :
//                               filterType === 'department' ? 'Search by Department' :
//                               'Search by'
//                             ) : 'Search by employee ID, name, email, or phone number'
//                           }
//                           className="w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-sm"
//                         />
//                         {searchQuery && (
//                           <button
//                             onClick={() => setSearchQuery("")}
//                             className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
//                           >
//                             <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
//                             </svg>
//                           </button>
//                         )}
//                       </div>
//                     </div>

//                     {/* Actions Section */}
//                     <div className="flex flex-wrap items-center gap-3">
//                       {/* Filter Button */}
//                         <button
//                         onClick={() => {
//                           setIsFilterButtonClicked(true);
//                           setShowFilterDropdown(v => !v);
//                           setTimeout(() => setIsFilterButtonClicked(false), 100);
//                         }}
//                           className={`group relative overflow-hidden flex items-center gap-2 px-6 py-3 rounded-xl shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-300 hover:-translate-y-1 ${
//                             showFilterDropdown 
//                               ? 'bg-blue-600 text-white shadow-blue-500/25' 
//                               : 'bg-blue-600 hover:bg-blue-700 text-white'
//                           }`}
//                           data-filter-button
//                         >
//                           <div className="absolute inset-0 bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
//                           <svg className="h-4 w-4 relative z-10 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.382a1 1 0 01-.293.707l-6.414 6.414A1 1 0 0014 14.414V19a1 1 0 01-1.447.894l-2-1A1 1 0 0110 18v-3.586a1 1 0 00-.293-.707L3.293 7.09A1 1 0 013 6.382V4z" />
//                         </svg>
//                           <span className="font-medium relative z-10">Filters</span>
//                           <FaChevronDown className={`ml-1 relative z-10 transition-transform ${showFilterDropdown ? 'rotate-180' : ''}`} />
//                         </button>

//                       {/* View Toggle */}
//                         <button
//                         onClick={() => setIsMobileView(!isMobileView)}
//                           className="group relative overflow-hidden flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white rounded-xl shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all duration-300 hover:-translate-y-1"
//                       >
//                           <div className="absolute inset-0 bg-gradient-to-r from-gray-400 to-gray-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
//                           <svg className="w-4 h-4 relative z-10 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                           {isMobileView ? (
//                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
//                           ) : (
//                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
//                           )}
//                         </svg>
//                           <span className="font-medium relative z-10">{isMobileView ? 'Table View' : 'Card View'}</span>
//                         </button>

//                       {/* Add Employee Button */}
//                         <button 
//                           className="group relative overflow-hidden flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg hover:shadow-xl hover:shadow-blue-500/25 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-300 hover:-translate-y-1 transform hover:scale-105" 
//                           onClick={() => setShowAddModal(true)}
//                         >
//                           <div className="absolute inset-0 bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
//                           <svg className="w-4 h-4 relative z-10 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
//                           </svg>
//                           <span className="font-medium relative z-10">Add Employee</span>
//                         </button>

//                       {/* Upload Button */}
//                         <button
//                           className="group relative overflow-hidden flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg hover:shadow-xl hover:shadow-blue-500/25 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-300 hover:-translate-y-1 transform hover:scale-105" 
//                           onClick={() => setShowUploadModal(true)}
//                         >
//                           <div className="absolute inset-0 bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
//                           <FaUpload className="w-4 h-4 relative z-10 group-hover:scale-110 transition-transform" />
//                           <span className="font-medium relative z-10">Upload</span>
//                         </button>
//                       <input
//                         type="file"
//                         ref={fileInputRef}
//                         onChange={handleFileChange}
//                         className="hidden"
//                         accept=".xlsx,.xls,.csv"
//                       />

//                       {/* Bulk Delete Button */}
//                       {selectedEmployeeIds.length > 0 && (
//                           <button
//                             className="group relative overflow-hidden flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl shadow-lg hover:shadow-xl hover:shadow-red-500/25 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-all duration-300 hover:-translate-y-1 disabled:opacity-50"
//                           onClick={() => setShowBulkDeleteConfirm(true)}
//                           disabled={deleting}
//                         >
//                             <div className="absolute inset-0 bg-gradient-to-r from-red-400 to-red-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
//                             <FaTrash className="w-4 h-4 relative z-10 group-hover:scale-110 transition-transform" />
//                             <span className="font-medium relative z-10">Delete Selected</span>
//                           </button>
//                         )}
//                       </div>
//                     </div>
//                   </div>
//                 </div>
//               </div>
//           </div>
//           {/* Enhanced Filter Dropdown */}
//           {showFilterDropdown && (
//             <div ref={filterDropdownRef} className="relative z-30 mb-6 animate-in slide-in-from-top-2 duration-300">
//               <div className="absolute inset-0 bg-gradient-to-br from-white/95 via-blue-50/80 to-indigo-50/80 dark:from-gray-800/95 dark:via-blue-900/20 dark:to-indigo-900/20 backdrop-blur-md rounded-2xl shadow-2xl border border-gray-200/60 dark:border-gray-700/60"></div>
//               <div className="relative z-10 p-8">
//                 <div className="flex items-center gap-3 mb-6">
//                   <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
//                     <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.382a1 1 0 01-.293.707l-6.414 6.414A1 1 0 0014 14.414V19a1 1 0 01-1.447.894l-2-1A1 1 0 0110 18v-3.586a1 1 0 00-.293-.707L3.293 7.09A1 1 0 013 6.382V4z" />
//                     </svg>
//                   </div>
//                   <div>
//                     <h3 className="text-xl font-bold text-gray-900 dark:text-white">Advanced Filters</h3>
//                     <p className="text-sm text-gray-500 dark:text-gray-400">Refine your search with multiple criteria</p>
//                   </div>
//                 </div>

//                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
//                   {/* Search By */}
//                   <div className="space-y-2">
//                     <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Search By</label>
//                     <select
//                       className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-sm hover:shadow-md"
//                       value={filterType}
//                       onChange={e => {
//                         setFilterType(e.target.value as typeof filterType);
//                         setShowFilterPlaceholder(true);
//                       }}
//                     >
//                       <option value="emp_id">Employee ID</option>
//                       <option value="full_name">Name</option>
//                       <option value="email">Email</option>
//                       <option value="phone">Mobile No</option>
//                       <option value="department">Department</option>
//                     </select>
//                   </div>

//                   {/* Time Frame */}
//                   <div className="space-y-2">
//                     <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Time Frame</label>
//                     <select
//                       className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-sm hover:shadow-md"
//                       value={timeFrame}
//                       onChange={e => setTimeFrame(e.target.value as typeof timeFrame)}
//                     >
//                       <option value="all">All Time</option>
//                       <option value="today">Today</option>
//                       <option value="this_week">This Week</option>
//                       <option value="custom">Custom Range</option>
//                     </select>
//                     {timeFrame === 'custom' && (
//                       <div className="mt-3 p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
//                         <DateRangePicker
//                           value={[customStartDate, customEndDate]}
//                           onChange={(dates) => {
//                             setCustomStartDate(dates[0]);
//                             setCustomEndDate(dates[1]);
//                           }}
//                         />
//                       </div>
//                     )}
//                   </div>

//                   {/* Sort By */}
//                   <div className="space-y-2">
//                     <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Sort By</label>
//                     <select
//                       className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-sm hover:shadow-md"
//                       value={sortOption}
//                       onChange={e => setSortOption(e.target.value as typeof sortOption)}
//                     >
//                       <option value="created_at_desc">Newest First</option>
//                       <option value="created_at_asc">Oldest First</option>
//                       <option value="full_name_asc">Name (A-Z)</option>
//                       <option value="full_name_desc">Name (Z-A)</option>
//                       <option value="email_asc">Email (A-Z)</option>
//                       <option value="email_desc">Email (Z-A)</option>
//                     </select>
//                   </div>
//                 </div>

//                 {/* Filter Actions */}
//                 <div className="flex items-center justify-between gap-4 mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
//                   <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
//                     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
//                     </svg>
//                     <span>Use filters to narrow down your search results</span>
//                   </div>
//                   <div className="flex items-center gap-3">
//                     <Button
//                       variant="outline"
//                       className="px-6 py-3 rounded-xl border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 shadow-sm hover:shadow-md font-medium"
//                       onClick={() => {
//                         setShowFilterDropdown(false);
//                         setTimeFrame('all');
//                         setCustomStartDate(null);
//                         setCustomEndDate(null);
//                         setSortOption('created_at_desc');
//                         setFilterType('emp_id');
//                         setSearchQuery('');
//                         setShowFilterPlaceholder(false);
//                       }}
//                     >
//                       <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
//                       </svg>
//                       Clear All
//                     </Button>
//                     <Button
//                       className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white transition-all duration-200 shadow-lg hover:shadow-xl font-medium"
//                       onClick={() => setShowFilterDropdown(false)}
//                     >
//                       <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
//                       </svg>
//                       Apply Filters
//                     </Button>
//                   </div>
//                 </div>
//               </div>
//             </div>
//           )}
//           {isLoading ? (
//             <div className="text-center mt-10">
//               <Loader />
//             </div>
//           ) : (
//             <div className="mt-4">
//               {/* Mobile Card View */}
//               {isMobileView ? (
//                 <div className="mx-4 md:mx-6">
//                   <div className="space-y-4">
//                   {employees.length === 0 ? (
//                       <div className="text-center py-20">
//                       <div className="flex flex-col items-center justify-center">
//                           <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
//                             <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
//                             </svg>
//                           </div>
//                           <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No employees found</h3>
//                           <p className="text-gray-500 dark:text-gray-400 mb-6">No data matches your current search criteria. Try adjusting your filters or search terms to find what you&apos;re looking for</p>
//                           <button 
//                             onClick={() => setShowAddModal(true)}
//                             className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
//                           >
//                             <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
//                             </svg>
//                             Add Employee
//                           </button>
//                       </div>
//                     </div>
//                   ) : (
//                                           employees.map((employee, idx) => (
//                         <div key={`${employee.emp_id || 'emp'}-${idx}`} className="animate-in slide-in-from-bottom-2 duration-300">
//                           <EmployeeCard employee={employee} />
//                         </div>
//                       ))
//                   )}
//                   </div>
//                 </div>
//                   ) : (
//                     /* Enhanced Desktop Table View */
//                     <div className="mx-4 md:mx-6">
//                       <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
//                         <div className="overflow-x-auto">
//                           <Table className="min-w-full">
//                             <TableHeader>
//                               <TableRow className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 border-b border-gray-200 dark:border-gray-600">
//                                 <TableCell isHeader className="px-6 py-4 text-left">
//                                   <input 
//                                     type="checkbox" 
//                                     aria-label="Select all" 
//                                     checked={allSelected} 
//                                     onChange={handleSelectAll}
//                                     className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
//                                   />
//                                 </TableCell>
//                                 <TableCell isHeader className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">
//                                   <div className="flex items-center gap-2">
//                                     <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
//                                     </svg>
//                                     Employee ID
//                                   </div>
//                                 </TableCell>
//                                 <TableCell isHeader className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">
//                                   <div className="flex items-center gap-2">
//                                     <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
//                                     </svg>
//                                     Name
//                                   </div>
//                                 </TableCell>
//                                 <TableCell isHeader className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">
//                                   <div className="flex items-center gap-2">
//                                     <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
//                                     </svg>
//                                     Email
//                                   </div>
//                                 </TableCell>
//                                 <TableCell isHeader className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">
//                                   <div className="flex items-center gap-2">
//                                     <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
//                                     </svg>
//                                     Appointment
//                                   </div>
//                                 </TableCell>
//                                 <TableCell isHeader className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">
//                                   <div className="flex items-center gap-2">
//                                     <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
//                                     </svg>
//                                     Phone Number
//                                   </div>
//                                 </TableCell>
//                                 <TableCell isHeader className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">
//                                   <div className="flex items-center gap-2">
//                                     <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
//                                     </svg>
//                                     Department
//                                   </div>
//                                 </TableCell>
//                                 <TableCell isHeader className="px-6 py-4 text-center text-sm font-semibold text-gray-900 dark:text-white">
//                                   <div className="flex items-center justify-center gap-2">
//                                     <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
//                                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
//                                     </svg>
//                                     Actions
//                                   </div>
//                                 </TableCell>
//                               </TableRow>
//                             </TableHeader>
//                             <TableBody>
//                               {employees.length === 0 ? (
//                                 <TableRow>
//                                   <TableCell colSpan={6} className="px-6 py-20 text-center">
//                                     <div className="flex flex-col items-center justify-center">
//                                       <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
//                                         <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
//                                         </svg>
//                                       </div>
//                                       <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No employees found</h3>
//                                       <p className="text-gray-500 dark:text-gray-400 mb-6">No data matches your current search criteria. Try adjusting your filters or search terms to find what you&apos;re looking for</p>
//                                       <button 
//                                         onClick={() => setShowAddModal(true)}
//                                         className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
//                                       >
//                                         <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
//                                         </svg>
//                                         Add Employee
//                                       </button>
//                                     </div>
//                                   </TableCell>
//                                 </TableRow>
//                               ) : (
//                                 employees.map((employee, index) => (
//                                   <TableRow 
//                                     key={`${employee.emp_id || 'emp'}-${index}`} 
//                                     className={`group hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-200 ${
//                                       index % 2 === 0 ? "bg-white dark:bg-gray-800" : "bg-gray-50/50 dark:bg-gray-700/30"
//                                     }`}
//                                   >
//                                     <TableCell className="px-6 py-4">
//                                       <input 
//                                         type="checkbox" 
//                                         aria-label={"Select " + employee.full_name} 
//                                         checked={selectedEmployeeIds.includes(employee.emp_id)} 
//                                         onChange={() => handleSelectOne(employee.emp_id)}
//                                         className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
//                                       />
//                                     </TableCell>
//                                     <TableCell className="px-6 py-4">
//                                       <div className="flex items-center gap-3">
//                                         <div className="flex-shrink-0">
//                                         <div className="w-8 h-8 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-lg flex items-center justify-center">
//                                           <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
//                                           </svg>
//                                         </div>
//                                         </div>
//                                         <div className="min-w-0 flex-1">
//                                           <span className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium text-sm truncate block">
//                                           {employee.emp_id}
//                                         </span>
//                                         </div>
//                                       </div>
//                                     </TableCell>
//                                     <TableCell className="px-6 py-4">
//                                       <div className="flex items-center gap-3">
//                                         <div className="flex-shrink-0">
//                                         <div className="w-8 h-8 bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 rounded-full flex items-center justify-center">
//                                           <span className="text-sm font-semibold text-green-700 dark:text-green-300">
//                                             {employee.full_name.charAt(0).toUpperCase()}
//                                           </span>
//                                         </div>
//                                         </div>
//                                         <div className="min-w-0 flex-1">
//                                           <span 
//                                             className="text-gray-900 dark:text-white font-medium text-sm truncate block cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 hover:underline transition-colors" 
//                                             dangerouslySetInnerHTML={{ __html: insertLineBreak(employee.full_name) }}
//                                             onClick={() => handleEmployeeDetailsClick(employee.emp_id, employee.full_name)}
//                                             title="Click to view employee details"
//                                           />
//                                         </div>
//                                       </div>
//                                     </TableCell>
//                                     <TableCell className="px-6 py-4">
//                                       <div className="flex items-center gap-2">
//                                         <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
//                                         </svg>
//                                         <span 
//                                           className="text-gray-600 dark:text-gray-300 text-sm block truncate max-w-[200px] cursor-help" 
//                                           title={employee.email}
//                                         >
//                                           {truncateEmail(employee.email, 20)}
//                                         </span>
//                                       </div>
//                                     </TableCell>
//                                     <TableCell className="px-6 py-4">
//                                       <button
//                                         onClick={() => openAppointmentModal(employee)}
//                                         className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border shadow whitespace-nowrap bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-200 transition-colors cursor-pointer"
//                                       >
//                                         <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
//                                         </svg>
//                                         {employee.appointment_count || 0} Appointments
//                                       </button>
//                                     </TableCell>
//                                     <TableCell className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
//                                       <div className="flex items-center gap-2">
//                                         <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
//                                         </svg>
//                                           {employee.phone}
//                                       </div>
//                                     </TableCell>
//                                     <TableCell className="px-6 py-4">
//                                       <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
//                                         {employee.department}
//                                       </span>
//                                     </TableCell>
//                                     <TableCell className="px-6 py-4 text-center">
//                                       <div className="flex items-center gap-2 justify-center">
//                                         <button
//                                           onClick={() => openEmployeeBookModal(employee)}
//                                           className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/20 transition-all duration-200 hover:scale-110"
//                                           title="Book appointment"
//                                         >
//                                           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
//                                           </svg>
//                                         </button>
//                                         <button
//                                         className="inline-flex items-center justify-center px-3 py-2 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-300 dark:hover:border-blue-700 transition-all duration-200 shadow-sm hover:shadow-md rounded-md text-sm font-medium"
//                                           onClick={() => setShowDeleteSingleModal({ open: true, emp_id: employee.emp_id })}
//                                           title="Delete employee"
//                                         >
//                                           <FaTrash className="w-3 h-3" />
//                                         </button>
//                                       </div>
//                                     </TableCell>
//                                   </TableRow>
//                                 ))
//                               )}
//                             </TableBody>
//                           </Table>
//                         </div>
//                       </div>
//                     </div>
//                   )}
//               <div className="h-4"></div>
//               <div className="mt-6 pb-8 mb-8">
//                   <Pagination
//                     currentPage={page}
//                     pageSize={size}
//                     totalItems={total}
//                     pageSizeOptions={[10, 30, 50, 100]}
//                     onPageChange={(newPage) => setPage(newPage)}
//                     onPageSizeChange={(newSize) => {
//                       setSize(newSize);
//                       setPage(1);
//                     }}
//                     label="employees"
//                   />
//                 </div>
//               </div>
//             )}
//           </React.Fragment>
//         )}
//       {activeTab === 'knowledgebase' && (
//         <div className="space-y-6">

//           {/* Enhanced Knowledge Base Content */}
//           <div className="relative overflow-hidden">
//             <div className="absolute inset-0 bg-gradient-to-r from-white/80 via-green-50/30 to-emerald-50/30 dark:from-gray-800/80 dark:via-green-900/10 dark:to-emerald-900/10 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-700/50"></div>
//             <div className="relative z-10 p-6">
//               <EmployeePage />
//             </div>
//           </div>
//         </div>
//       )}
//           {activeTab === 'faq' && (
//             <div className="space-y-6">
//               {/* Enhanced FAQ Control Bar */}
//               <div className="relative overflow-hidden">
//                 <div className="absolute inset-0 bg-gradient-to-r from-white/80 via-blue-50/50 to-indigo-50/80 dark:from-gray-800/80 dark:via-blue-900/20 dark:to-indigo-900/20 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-700/50"></div>
//                 <div className="relative z-10 p-6">
//                   <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
//                     <div className="flex items-center gap-3">
//                       <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
//                         <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
//                         </svg>
//                       </div>
//                       <div>
//                         <h3 className="text-lg font-semibold text-gray-900 dark:text-white">FAQ Management</h3>
//                         <p className="text-sm text-gray-500 dark:text-gray-400">
//                           {faqFiles.length} FAQ file{faqFiles.length !== 1 ? 's' : ''} found
//                         </p>
//                       </div>
//                     </div>

//                     <div className="flex flex-wrap gap-3">
//                       <Button 
//                         className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-200" 
//                         onClick={() => {
//                           const input = document.createElement('input');
//                           input.type = 'file';
//                           input.accept = '.csv,text/csv';
//                           input.onchange = async (e) => {
//                             const file = (e.target as HTMLInputElement).files?.[0];
//                             if (!file) return;

//                             const allowedTypes = ['text/csv', 'application/csv'];
//                             const allowedExtensions = ['.csv'];
//                             const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));

//                             const isValidFormat = allowedTypes.includes(file.type) || allowedExtensions.includes(fileExtension);

//                             if (!isValidFormat) {
//                               setAlert({
//                                 show: true,
//                                 variant: 'error',
//                                 title: 'Invalid File Format',
//                                 message: 'Only CSV files are allowed for FAQ uploads.'
//                               });
//                               setTimeout(() => setAlert(a => ({ ...a, show: false })), 3000);
//                               return;
//                             }

//                             try {
//                               const res = await uploadFaqCsv(file, FAQ_DIRECTORY);
//                               setAlert({ show: true, variant: 'success', title: 'FAQ CSV Uploaded', message: (res?.message || 'Uploaded') + (res?.key ? ' (' + res.key + ')' : '') });
//                               setTimeout(() => setAlert(a => ({ ...a, show: false })), 3000);
//                               await refreshFaqFiles();
//                             } catch (err) {
//                               const msg = err instanceof Error ? err.message : 'Upload failed';
//                               setAlert({ show: true, variant: 'error', title: 'Upload Failed', message: msg });
//                               setTimeout(() => setAlert(a => ({ ...a, show: false })), 2000);
//                             }
//                           };
//                           input.click();
//                         }}
//                       >
//                         <FaUpload className="w-4 h-4" />
//                         Upload FAQ CSV
//                       </Button>

//                       <Button
//                         className="flex items-center gap-2 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 shadow-sm hover:shadow-md"
//                         variant="outline"
//                         onClick={() => {
//                           const headers = ['question', 'answer'];
//                           const exampleRows = [
//                             ['What are your business hours?', 'We are open 9am-6pm Mon-Fri.'],
//                             ['How can I contact support?', 'Email support@example.com or call +1-555-0100.'],
//                           ];
//                           const csvContent = [headers, ...exampleRows]
//                             .map(row => row
//                               .map(field => `"${String(field).replace(/"/g, '""')}"`)
//                               .join(','))
//                             .join('\n');
//                           const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
//                           const url = URL.createObjectURL(blob);
//                           const link = document.createElement('a');
//                           link.href = url;
//                           link.download = 'employee_faq_template.csv';
//                           document.body.appendChild(link);
//                           link.click();
//                           document.body.removeChild(link);
//                           URL.revokeObjectURL(url);
//                         }}
//                       >
//                         <FaDownload className="w-4 h-4" />
//                         Download Template
//                       </Button>

//                       <Button
//                         className="flex items-center gap-2 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 shadow-sm hover:shadow-md"
//                         variant="outline"
//                         onClick={refreshFaqFiles}
//                         disabled={faqListLoading}
//                       >
//                         {faqListLoading ? <Loader /> : <FaSync className="w-4 h-4" />}
//                         {faqListLoading ? 'Refreshing...' : 'Refresh'}
//                       </Button>
//                     </div>
//                   </div>
//                 </div>
//               </div>

//               {/* Enhanced FAQ File Table */}
//               <div className="relative overflow-hidden">
//                 <div className="absolute inset-0 bg-gradient-to-r from-white/80 via-blue-50/30 to-indigo-50/30 dark:from-gray-800/80 dark:via-blue-900/10 dark:to-indigo-900/10 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-700/50"></div>
//                 <div className="relative z-10 overflow-x-auto">
//                   <Table className="border-collapse bg-transparent">
//                     <TableHeader>
//                       <TableRow className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 border-b-2 border-gray-200 dark:border-gray-600">
//                         <TableCell isHeader className="px-6 py-4 text-center">
//                           <input 
//                             type="checkbox" 
//                             aria-label="Select all" 
//                             checked={isAllSelected} 
//                             onChange={toggleSelectAll}
//                             className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
//                           />
//                         </TableCell>
//                         <TableCell isHeader className="px-6 py-4 font-semibold text-gray-700 dark:text-gray-200 text-start text-sm">Name</TableCell>
//                         <TableCell isHeader className="px-6 py-4 font-semibold text-gray-700 dark:text-gray-200 text-start text-sm">Type</TableCell>
//                         <TableCell isHeader className="px-6 py-4 font-semibold text-gray-700 dark:text-gray-200 text-start text-sm">Size</TableCell>
//                         <TableCell isHeader className="px-6 py-4 font-semibold text-gray-700 dark:text-gray-200 text-start text-sm">Uploaded At</TableCell>
//                         <TableCell isHeader className="px-6 py-4 font-semibold text-gray-700 dark:text-gray-200 text-start text-sm">Actions</TableCell>
//                       </TableRow>
//                     </TableHeader>
//                     <TableBody className="divide-y divide-gray-100 dark:divide-gray-700">
//                       {faqListLoading ? (
//                         <TableRow>
//                           <TableCell colSpan={7} className="px-6 py-12 text-center">
//                             <div className="flex flex-col items-center">
//                               <Loader />
//                               <span className="text-gray-500 dark:text-gray-400 mt-3 text-sm">Loading FAQ file...</span>
//                             </div>
//                           </TableCell>
//                         </TableRow>
//                       ) : faqFiles.length === 0 ? (
//                         <TableRow>
//                           <TableCell colSpan={7} className="px-6 py-12 text-center">
//                             <div className="flex flex-col items-center">
//                               <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mb-4">
//                                 <FaFileAlt className="text-purple-500 dark:text-purple-400" size={32} />
//                               </div>
//                               <span className="text-lg font-semibold text-gray-500 dark:text-gray-400 mb-2">
//                                 No FAQ file found
//                               </span>
//                               <span className="text-sm text-gray-400 dark:text-gray-500">
//                                 Upload some FAQ file to get started
//                               </span>
//                             </div>
//                           </TableCell>
//                         </TableRow>
//                       ) : (
//                         faqFiles.map((f, idx) => (
//                           <TableRow 
//                             key={`${f.key || f.filename || 'faq'}-${idx}`} 
//                             className={`hover:bg-blue-50/50 dark:hover:bg-gray-700/50 transition-all duration-200 ${
//                               idx % 2 === 0 ? 'bg-white/50 dark:bg-gray-800/50' : 'bg-gray-50/30 dark:bg-gray-700/30'
//                             }`}
//                           >
//                             <TableCell className="px-6 py-4 text-center">
//                               <input
//                                 type="checkbox"
//                                 aria-label={"Select " + f.filename}
//                                 checked={selectedFilenames.has(f.filename)}
//                                 onChange={() => toggleSelectOne(f.filename)}
//                                 className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500 dark:focus:ring-purple-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
//                               />
//                             </TableCell>
//                             <TableCell className="px-6 py-4 text-start">
//                               <div className="flex items-center gap-3">
//                                 <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
//                                   <FaFileAlt className="text-blue-600 dark:text-blue-400 w-4 h-4" />
//                                 </div>
//                                 <span className="text-blue-600 dark:text-blue-400 break-all font-medium">{f.filename}</span>
//                               </div>
//                             </TableCell>
//                             <TableCell className="px-6 py-4 text-start">
//                               <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
//                                 {getFileTypeFromName(f.filename)}
//                               </span>
//                             </TableCell>
//                             <TableCell className="px-6 py-4 text-gray-600 dark:text-gray-300 text-start text-sm">
//                               {`${(f.size_bytes / 1024).toFixed(1)} KB`}
//                             </TableCell>
//                             <TableCell className="px-6 py-4 text-gray-600 dark:text-gray-300 text-start text-sm">
//                               {new Date(f.last_modified).toLocaleDateString('en-US', {
//                                 year: 'numeric',
//                                 month: 'short',
//                                 day: 'numeric',
//                                 hour: '2-digit',
//                                 minute: '2-digit'
//                               })}
//                             </TableCell>
//                             <TableCell className="px-6 py-4 text-start">
//                               <Button
//                                 variant="outline"
//                                 className="border-red-300 dark:border-red-600 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-400 dark:hover:border-red-500 transition-all duration-200 shadow-sm hover:shadow-md"
//                                 onClick={() => setDeleteConfirm({ open: true, filename: f.filename })}
//                               >
//                                 <FaTrash className="w-3 h-3" />
//                               </Button>
//                             </TableCell>
//                           </TableRow>
//                         ))
//                       )}
//                     </TableBody>
//                   </Table>
//                 </div>
//               </div>
//             </div>
//           )}
//       {/* Enhanced Upload Confirmation Modal */}
//       <Modal isOpen={showConfirmModal} onClose={handleCancelUpload}>
//         <div className="relative overflow-hidden bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 max-w-md w-full mx-4">
//           <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 rounded-full -translate-y-16 translate-x-16"></div>
//           <div className="relative z-10 p-8">
//             <div className="flex items-center gap-4 mb-6">
//               <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
//                 <FaUpload className="w-6 h-6 text-white" />
//               </div>
//               <div>
//                 <h3 className="text-xl font-bold text-gray-900 dark:text-white">Confirm Upload</h3>
//                 <p className="text-sm text-gray-500 dark:text-gray-400">Ready to upload your file</p>
//             </div>
//             </div>
//             <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 mb-6">
//               <div className="flex items-center gap-3">
//                 <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
//                   <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
//                   </svg>
//                 </div>
//                 <div className="flex-1 min-w-0">
//                   <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{selectedFile?.name}</p>
//                   <p className="text-xs text-gray-500 dark:text-gray-400">
//                     {selectedFile ? `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB` : ''}
//                   </p>
//                 </div>
//               </div>
//             </div>
//             <p className="text-gray-600 dark:text-gray-300 text-sm mb-6">
//               This will upload the file and process the employee data. Make sure the file contains the required columns: Employee ID, Name, Email, Phone, and Department.
//             </p>
//             <div className="flex gap-3">
//               <button 
//                 onClick={handleCancelUpload} 
//                 className="flex-1 px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 font-medium"
//               >
//                 Cancel
//               </button>
//               <button 
//                 onClick={handleConfirmUpload} 
//                 disabled={uploading}
//                 className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
//               >
//                 {uploading ? (
//                   <div className="flex items-center justify-center gap-2">
//                     <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
//                     Uploading...
//                   </div>
//                 ) : (
//                   'Upload File'
//                 )}
//               </button>
//             </div>
//           </div>
//         </div>
//       </Modal>

//       {/* Enhanced Delete Single Modal */}
//       <Modal isOpen={showDeleteSingleModal.open} onClose={() => setShowDeleteSingleModal({ open: false, emp_id: null })}>
//         <div className="relative overflow-hidden bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 max-w-md w-full mx-4">
//           <div className="relative z-10 p-8">
//             <div className="flex items-center gap-4 mb-6">
//               <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg">
//                 <FaTrash className="w-6 h-6 text-white" />
//               </div>
//               <div>
//                 <h3 className="text-xl font-bold text-gray-900 dark:text-white">Delete Employee</h3>
//                 <p className="text-sm text-gray-500 dark:text-gray-400">This action cannot be undone</p>
//             </div>
//             </div>
//             <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 mb-6 border border-blue-200 dark:border-blue-800">
//               <div className="flex items-start gap-3">
//                 <div className="w-5 h-5 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
//                   <svg className="w-3 h-3 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
//                   </svg>
//                 </div>
//                 <div>
//                   <p className="text-sm font-medium text-blue-800 dark:text-blue-200">Warning</p>
//                   <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
//                     Are you sure you want to delete this employee? This action cannot be undone and will permanently remove all associated data.
//                   </p>
//                 </div>
//               </div>
//             </div>
//             <div className="flex gap-3">
//               <button 
//                 onClick={() => setShowDeleteSingleModal({ open: false, emp_id: null })} 
//                 className="flex-1 px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 font-medium"
//               >
//                 Cancel
//               </button>
//               <button
//                 onClick={() => handleDeleteSingle(showDeleteSingleModal.emp_id!)}
//                 disabled={deleting}
//                 className="flex-1 px-4 py-3 rounded-xl bg-blue-500 hover:bg-blue-600 text-white shadow-lg hover:shadow-xl transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
//               >
//                 {deleting ? (
//                   <div className="flex items-center justify-center gap-2">
//                     <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
//                     Deleting...
//                   </div>
//                 ) : (
//                   'Delete Employee'
//                 )}
//               </button>
//             </div>
//           </div>
//         </div>
//       </Modal>

//       {/* Enhanced Add Employee Modal */}
//       <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)}>
//         <div className="relative overflow-hidden">
//           <div className="absolute inset-0 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-gray-800 dark:to-gray-900"></div>
//           <div className="relative z-10">
//             <EmployeeDetailsForm onSuccess={async () => {
//               setShowAddModal(false);
//               await fetchAllEmployees();
//               setAlert({ show: true, variant: 'success', title: 'Success!', message: 'Employee data added successfully!' });
//               setTimeout(() => setAlert(a => ({ ...a, show: false })), 3000);
//             }} />
//           </div>
//         </div>
//       </Modal>
//       {alert.show && (
//         <Alert
//           variant={alert.variant}
//           title={alert.title}
//           message={alert.message}
//           showCloseButton={true}
//           onClose={() => setAlert({ ...alert, show: false })}
//         />
//       )}
//       {/* Enhanced Download Modal */}
//       <Modal isOpen={showDownloadModal} onClose={() => setShowDownloadModal(false)}>
//         <div className="relative overflow-hidden">
//           <div className="absolute inset-0 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-gray-800 dark:to-gray-900"></div>
//           <div className="relative z-10">
//             <DownloadEmployeeTemplate
//               form={downloadForm}
//               setForm={setDownloadForm}
//               onSubmit={handleDownload}
//               loading={false}
//             />
//           </div>
//         </div>
//       </Modal>

//       {/* Enhanced Delete FAQ File Modal */}
//       <Modal isOpen={deleteConfirm.open} onClose={() => setDeleteConfirm({ open: false, filename: undefined })}>
//         <div className="relative overflow-hidden">
//           <div className="absolute inset-0 bg-gradient-to-br from-red-50 to-pink-50 dark:from-gray-800 dark:to-gray-900"></div>
//           <div className="relative z-10 p-6 max-w-full w-[90vw] sm:w-[400px]">
//             <div className="flex items-center gap-3 mb-4">
//               <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-pink-600 rounded-xl flex items-center justify-center">
//                 <FaTrash className="w-5 h-5 text-white" />
//               </div>
//               <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Delete File</h3>
//             </div>
//             <p className="text-gray-700 dark:text-gray-300 mb-6">
//               Are you sure you want to delete 
//               <span className="font-semibold text-red-600 dark:text-red-400"> {deleteConfirm.filename}</span>? 
//               <br/>
//               <span className="text-sm text-gray-500 dark:text-gray-400">This action cannot be undone.</span>
//             </p>
//             <div className="flex justify-end gap-3">
//               <Button 
//                 onClick={() => setDeleteConfirm({ open: false, filename: undefined })} 
//                 variant="outline"
//                 className="px-4 py-2 rounded-xl border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200"
//               >
//                 Cancel
//               </Button>
//               <Button
//                 className="px-4 py-2 rounded-xl bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
//                 onClick={async () => {
//                   if (!deleteConfirm.filename) return;
//                   try {
//                     await deleteFaqCsv(deleteConfirm.filename, FAQ_DIRECTORY);
//                     const next = new Set(selectedFilenames);
//                     next.delete(deleteConfirm.filename);
//                     setSelectedFilenames(next);
//                     await refreshFaqFiles();
//                     setAlert({ show: true, variant: 'success', title: 'Deleted', message: `${deleteConfirm.filename} removed.` });
//                     setTimeout(() => setAlert(a => ({ ...a, show: false })), 2000);
//                   } catch (err) {
//                     const msg = err instanceof Error ? err.message : 'Delete failed';
//                     setAlert({ show: true, variant: 'error', title: 'Delete Failed', message: msg });
//                     setTimeout(() => setAlert(a => ({ ...a, show: false })), 3000);
//                   } finally {
//                     setDeleteConfirm({ open: false, filename: undefined });
//                   }
//                 }}
//               >
//                 Delete
//               </Button>
//             </div>
//           </div>
//         </div>
//       </Modal>
//       <EmployeeUploadModal
//         isOpen={showUploadModal}
//         onClose={() => setShowUploadModal(false)}
//         onUploadSuccess={async (msg) => {
//           setShowUploadModal(false);
//           if (msg && msg.startsWith('File downloaded:')) {
//             setAlert({ show: true, variant: 'success', title: 'Download Successful!', message: msg });
//             setTimeout(() => setAlert(a => ({ ...a, show: false })), 3000);
//           } else if (msg && msg.includes('uploaded')) {
//             setAlert({ show: true, variant: 'success', title: 'Upload Successful!', message: msg });
//             await fetchAllEmployees();
//             setTimeout(() => setAlert(a => ({ ...a, show: false })), 3000);
//           }
//         }}
//         onError={(msg) => {
//           setShowUploadModal(false);
//           setAlert({ show: true, variant: 'error', title: 'Failed', message: msg });
//           setTimeout(() => setAlert(a => ({ ...a, show: false })), 3000);
//         }}
//       />
//       <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} newestOnTop closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover style={{ zIndex: 9999, top: 78 }} />
//           {/* Enhanced Bulk Delete Confirmation Modal */}
//           <Modal isOpen={showBulkDeleteConfirm} onClose={() => setShowBulkDeleteConfirm(false)}>
//             <div className="relative overflow-hidden">
//               <div className="absolute inset-0 bg-gradient-to-br from-red-50 to-pink-50 dark:from-gray-800 dark:to-gray-900"></div>
//               <div className="relative z-10 p-6 max-w-full w-[90vw] sm:w-[400px]">
//                 <div className="flex items-center gap-3 mb-4">
//                   <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-pink-600 rounded-xl flex items-center justify-center">
//                     <FaTrash className="w-5 h-5 text-white" />
//                   </div>
//                   <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Confirm Bulk Delete</h2>
//                 </div>
//                 <p className="text-gray-700 dark:text-gray-300 mb-6">
//                   Are you sure you want to delete 
//                   <span className="font-semibold text-red-600 dark:text-red-400"> {selectedEmployeeIds.length}</span> 
//                   selected employee{selectedEmployeeIds.length !== 1 ? 's' : ''}?
//                   <br/>
//                   <span className="text-sm text-gray-500 dark:text-gray-400">This action cannot be undone.</span>
//                 </p>
//                 <div className="flex justify-end gap-3">
//                   <Button 
//                     variant="outline" 
//                     onClick={() => setShowBulkDeleteConfirm(false)}
//                     className="px-4 py-2 rounded-xl border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200"
//                   >
//                     Cancel
//                   </Button>
//                   <Button 
//                     variant="outline" 
//                     className="px-4 py-2 rounded-xl border-red-300 dark:border-red-600 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-400 dark:hover:border-red-500 transition-all duration-200 shadow-sm hover:shadow-md" 
//                     onClick={handleBulkDelete} 
//                     disabled={deleting}
//                   >
//                     {deleting ? "Deleting..." : "Delete"}
//                   </Button>
//                 </div>
//               </div>
//             </div>
//           </Modal>

//           {/* Employee Details Page Modal */}
//           {showEmployeeDetails && selectedEmployeeForDetails && (
//             <div
//               className="fixed inset-0 z-50 flex items-center justify-center"
//               style={{
//                 position: 'fixed',
//                 top: 0,
//                 left: 0,
//                 right: 0,
//                 bottom: 0,
//                 overflow: 'hidden'
//               }}
//             >
//               <div 
//                 className="absolute inset-0 bg-black/50 backdrop-blur-sm" 
//                 onClick={() => {
//                   setShowEmployeeDetails(false);
//                   setSelectedEmployeeForDetails(null);
//                 }}
//               />
//               <div 
//                 className="relative z-10 h-full w-full overflow-hidden"
//                 onClick={(e) => e.stopPropagation()}
//               >
//                 <EmployeeDetailsPage
//                   employeeId={selectedEmployeeForDetails.id}
//                   employeeName={selectedEmployeeForDetails.name}
//                   onBack={() => {
//                     setShowEmployeeDetails(false);
//                     setSelectedEmployeeForDetails(null);
//                   }}
//                 />
//               </div>
//             </div>
//           )}

//           {/* Appointment Modal */}
//           {showAppointmentModal && selectedEmployee && (
//             <div className="fixed inset-0 bg-black/10 backdrop-blur-[2px] flex items-center justify-center z-50 p-4">
//               <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
//                 {/* Modal Header */}
//                 <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
//                   <div className="flex items-center gap-3">
//                     <FaCalendarAlt className="w-6 h-6 text-blue-600" />
//                     <div>
//                       <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
//                         Appointments for {selectedEmployee.full_name}
//                       </h2>
//                       <p className="text-sm text-gray-500 dark:text-gray-400">
//                         {selectedEmployee.email}
//                       </p>
//                     </div>
//                   </div>
//                   <button
//                     onClick={closeAppointmentModal}
//                     className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
//                   >
//                     <FaTimes className="w-5 h-5" />
//                   </button>
//                 </div>

//                 {/* Modal Content */}
//                 <div className="p-6 overflow-y-auto max-h-[60vh]">
//                   {loadingAppointments ? (
//                     <div className="flex items-center justify-center py-8">
//                       <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
//                       <span className="ml-3 text-gray-600 dark:text-gray-400">Loading appointments...</span>
//                     </div>
//                   ) : employeeAppointments.length > 0 ? (
//                     <div className="space-y-4">
//                       {employeeAppointments.map((appointment) => (
//                         <div key={appointment.id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
//                           <div className="flex items-start justify-between">
//                             <div className="flex-1">
//                               <div className="flex items-center gap-3 mb-2">
//                                 <FaCalendarAlt className="w-4 h-4 text-blue-600" />
//                                 <span className="font-semibold text-gray-900 dark:text-white">
//                                   {new Date(appointment.date).toLocaleDateString('en-GB', { 
//                                     day: '2-digit', 
//                                     month: 'short', 
//                                     year: 'numeric' 
//                                   })}
//                                 </span>
//                                 <FaClock className="w-4 h-4 text-gray-500" />
//                                 <span className="text-gray-600 dark:text-gray-300">
//                                   {appointment.time}
//                                 </span>
//                               </div>
//                               <div className="flex items-center gap-2 mb-2">
//                                 <span className="text-sm text-gray-600 dark:text-gray-400">Service:</span>
//                                 <span className="text-sm font-medium text-gray-900 dark:text-white">
//                                   {appointment.service_name}
//                                 </span>
//                               </div>
//                               {appointment.message && (
//                                 <div className="flex items-start gap-2">
//                                   <span className="text-sm text-gray-600 dark:text-gray-400">Reason:</span>
//                                   <span className="text-sm text-gray-900 dark:text-white">
//                                     {appointment.message}
//                                   </span>
//                                 </div>
//                               )}
//                             </div>
//                             <div className="flex items-center gap-2">
//                               <button
//                                 onClick={() => openEditEmployeeAppointmentModal(appointment)}
//                                 className="p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/20 transition-all duration-200"
//                                 title="Edit appointment"
//                               >
//                                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
//                                 </svg>
//                               </button>
//                               <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
//                                 appointment.status === 'confirmed' 
//                                   ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
//                                   : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
//                               }`}>
//                                 {appointment.status}
//                               </span>
//                               <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
//                                 appointment.source === 'customer'
//                                   ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
//                                   : appointment.source === 'lead'
//                                   ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
//                                   : appointment.source === 'employee'
//                                   ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
//                                   : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
//                               }`}>
//                                 {appointment.source}
//                               </span>
//                             </div>
//                           </div>
//                         </div>
//                       ))}
//                     </div>
//                   ) : (
//                     <div className="text-center py-8">
//                       <FaCalendarAlt className="w-12 h-12 text-gray-400 mx-auto mb-4" />
//                       <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
//                         No appointments found
//                       </h3>
//                       <p className="text-gray-500 dark:text-gray-400">
//                         This employee doesn&apos;t have any appointments yet.
//                       </p>
//                     </div>
//                   )}
//                 </div>

//                 {/* Modal Footer */}
//                 <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
//                   <button
//                     onClick={closeAppointmentModal}
//                     className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
//                   >
//                     Close
//                   </button>
//                 </div>
//               </div>
//             </div>
//           )}

//           {/* Book Employee Appointment Modal */}
//           {showEmployeeBookModal && bookingEmployee && (
//             <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
//               <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-auto">
//                 <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
//                   <div className="flex items-center gap-3">
//                     <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
//                     <div>
//                       <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Book employee appointment</h3>
//                       <p className="text-xs text-gray-500">Employee: {bookingEmployee.full_name} • {bookingEmployee.email}</p>
//                     </div>
//                   </div>
//                   <button onClick={() => setShowEmployeeBookModal(false)} className="p-2 text-gray-400 hover:text-gray-600">
//                     <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
//                   </button>
//                 </div>

//                 <div className="p-5 grid grid-cols-1 gap-6">
//                   <div className="space-y-3">
//                     <label className="text-sm text-gray-600">Service</label>
//                     <select
//                       value={empServiceId}
//                       onChange={async (e)=>{ setEmpServiceId(e.target.value); const picked=empServices.find(s=>s.id===e.target.value); setEmpServiceName(picked?.name||''); await loadEmployeeSlots(e.target.value); setEmpSelectedDate(''); setEmpSelectedSlotId(''); setEmpDateSlots([]); }}
//                       className="w-full border rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
//                     >
//                       {empServices.map(s=> (<option key={s.id} value={s.id}>{s.name}</option>))}
//                     </select>

//                     <label className="text-sm text-gray-600">Select date</label>
//                     <input
//                       readOnly
//                       value={empSelectedDate || ''}
//                       placeholder="Click to select date"
//                       onClick={()=>setEmpShowDatePicker(!empShowDatePicker)}
//                       className="w-full border rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white cursor-pointer"
//                     />
//                     {empShowDatePicker && (
//                       <div className="mt-2">
//                         <VisualCalendar
//                           onDateSelect={handleEmployeeDatePick}
//                           availableDates={empAvailableDates}
//                           selectedDate={empSelectedDate}
//                           serviceName={empServiceName}
//                           compact={true}
//                         />
//                       </div>
//                     )}
//                   </div>
//                   <div className="space-y-4">
//                     <div>
//                       <label className="text-sm text-gray-600">Available time slots</label>
//                       <select
//                         value={empSelectedSlotId}
//                         onChange={(e)=>setEmpSelectedSlotId(e.target.value)}
//                         className="w-full border rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
//                       >
//                         <option value="" disabled>{empSelectedDate ? 'Select a time slot' : 'Please select a date first'}</option>
//                         {empDateSlots.map(s=> (<option key={s.id} value={s.id}>{s.label}</option>))}
//                       </select>
//                     </div>

//                     <div className="space-y-3 pt-2">
//                       <div>
//                         <label className="text-sm text-gray-600">Name *</label>
//                         <input value={empName} onChange={(e)=>setEmpName(e.target.value)} className="w-full border rounded-lg px-3 py-2 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white" placeholder="Employee name" />
//                       </div>
//                       <div>
//                         <label className="text-sm text-gray-600">Email *</label>
//                         <input type="email" value={empEmail} onChange={(e)=>setEmpEmail(e.target.value)} className="w-full border rounded-lg px-3 py-2 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white" placeholder="email@example.com" />
//                       </div>
//                       <div>
//                         <label className="text-sm text-gray-600">Additional Notes</label>
//                         <textarea value={empNotes} onChange={(e)=>setEmpNotes(e.target.value)} rows={3} className="w-full border rounded-lg px-3 py-2 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white" placeholder="Any specific requirements or questions..." />
//                       </div>
//                     </div>

//                     <div className="flex gap-2 pt-1">
//                       <button onClick={submitEmployeeBooking} disabled={!empSelectedSlotId || empSubmitting} className={`flex-1 px-4 py-3 rounded-lg text-white font-semibold disabled:opacity-50 ${empSubmitting ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'}`}>{empSubmitting ? 'Booking…' : 'Book Appointment'}</button>
//                       <button onClick={()=>setShowEmployeeBookModal(false)} className="px-4 py-3 rounded-lg bg-gray-200 text-gray-700 font-semibold">Cancel</button>
//                     </div>
//                   </div>
//                 </div>
//               </div>
//             </div>
//           )}

//           {/* Edit Employee Appointment Modal */}
//           {showEditEmployeeAppointmentModal && editingEmployeeAppointment && (
//             <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
//               <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-auto">
//                 <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
//                   <div className="flex items-center gap-3">
//                     <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
//                     </svg>
//                     <div>
//                       <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Edit appointment</h3>
//                       <p className="text-xs text-gray-500">Service: {editingEmployeeAppointment.service_name}</p>
//                     </div>
//                   </div>
//                   <button onClick={() => setShowEditEmployeeAppointmentModal(false)} className="p-2 text-gray-400 hover:text-gray-600">
//                     <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
//                     </svg>
//                   </button>
//                 </div>

//                 <div className="p-5 grid grid-cols-1 gap-6">
//                   <div className="space-y-3">
//                     <label className="text-sm text-gray-600">Service</label>
//                     <div className="w-full border rounded-lg px-3 py-2 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white">
//                       {editingEmployeeAppointment.service_name || 'N/A'}
//                     </div>

//                     <label className="text-sm text-gray-600">Select date</label>
//                     <input
//                       readOnly
//                       value={editEmpDate || ''}
//                       placeholder="Click to select date"
//                       onClick={() => !showEmpCancelReason && setEditEmpShowDatePicker(!editEmpShowDatePicker)}
//                       disabled={showEmpCancelReason}
//                       className={`w-full border rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${showEmpCancelReason ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
//                     />
//                     {editEmpShowDatePicker && !showEmpCancelReason && (
//                       <div className="mt-2">
//                         <VisualCalendar
//                           onDateSelect={handleEditEmployeeDatePick}
//                           availableDates={editEmpAvailableDates}
//                           selectedDate={editEmpDate}
//                           serviceName={editingEmployeeAppointment.service_name}
//                           compact={true}
//                         />
//                       </div>
//                     )}
//                   </div>
//                   <div className="space-y-4">
//                     {!showEmpCancelReason && (
//                       <>
//                         <div>
//                           <label className="text-sm text-gray-600">Available time slots</label>
//                           <select
//                             value={editEmpSelectedSlotId}
//                             onChange={(e) => setEditEmpSelectedSlotId(e.target.value)}
//                             className="w-full border rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
//                           >
//                             <option value="" disabled>{editEmpDate ? 'Select a time slot' : 'Please select a date first'}</option>
//                             {editEmpDateSlots.map((s: any) => (
//                               <option key={s.id} value={s.id}>{s.label}</option>
//                             ))}
//                           </select>
//                         </div>

//                         <div>
//                           <label className="text-sm text-gray-600">Message/Notes</label>
//                           <textarea 
//                             value={editEmpNotes} 
//                             onChange={(e) => setEditEmpNotes(e.target.value)} 
//                             rows={3} 
//                             className="w-full border rounded-lg px-3 py-2 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white" 
//                             placeholder="Any additional notes..." 
//                           />
//                         </div>
//                       </>
//                     )}

//                     {showEmpCancelReason && (
//                       <div>
//                         <label className="text-sm text-gray-600">Cancellation Reason *</label>
//                         <textarea 
//                           value={empCancelReason} 
//                           onChange={(e) => setEmpCancelReason(e.target.value)} 
//                           rows={3} 
//                           className="w-full border rounded-lg px-3 py-2 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white" 
//                           placeholder="Please provide a reason for cancellation..." 
//                           required
//                         />
//                       </div>
//                     )}

//                     <div className="flex gap-2 pt-1">
//                       {!showEmpCancelReason ? (
//                         <>
//                           <button
//                             onClick={submitUpdateEmployeeAppointment}
//                             disabled={!editEmpDate || !editEmpSelectedSlotId || editEmpSubmitting}
//                             className={`flex-1 px-4 py-3 rounded-lg text-white font-semibold disabled:opacity-50 ${editEmpSubmitting ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'}`}
//                           >
//                             {editEmpSubmitting ? 'Updating…' : 'Update Appointment'}
//                           </button>
//                           <button
//                             onClick={() => {
//                               setShowEmpCancelReason(true);
//                               setEditEmpShowDatePicker(false);
//                             }}
//                             className="px-4 py-3 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold"
//                           >
//                             Cancel Appointment
//                           </button>
//                           <button
//                             onClick={() => setShowEditEmployeeAppointmentModal(false)}
//                             className="px-4 py-3 rounded-lg bg-gray-200 text-gray-700 font-semibold"
//                           >
//                             Close
//                           </button>
//                         </>
//                       ) : (
//                         <>
//                           <button
//                             onClick={submitCancelEmployeeAppointment}
//                             disabled={!empCancelReason.trim() || editEmpSubmitting}
//                             className={`flex-1 px-4 py-3 rounded-lg text-white font-semibold disabled:opacity-50 ${editEmpSubmitting ? 'bg-red-400' : 'bg-red-600 hover:bg-red-700'}`}
//                           >
//                             {editEmpSubmitting ? 'Cancelling…' : 'Confirm Cancellation'}
//                           </button>
//                           <button
//                             onClick={() => { setShowEmpCancelReason(false); setEmpCancelReason(''); }}
//                             className="px-4 py-3 rounded-lg bg-gray-200 text-gray-700 font-semibold"
//                           >
//                             Back
//                           </button>
//                         </>
//                       )}
//                     </div>
//                   </div>
//                 </div>
//               </div>            </div>
//           )}
//     </div>
//   );
// }

"use client";
// import PageBreadcrumb from "@/components/common/PageBreadCrumb";
// Removed unused PageHeader import
import React, { useEffect, useState, useRef, useCallback } from "react";
import { VisualCalendar } from "../appointment/components/VisualCalendar";
import DashboardHeader from '@/components/header/DashboardHeader';
import { Users as UsersIcon } from 'lucide-react';
import { useSidebar } from "@/context/SidebarContext";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import { FaUpload, FaSync, FaTrash, FaSearch, FaDownload, FaTimes, FaCalendarAlt, FaClock, FaSpinner } from "react-icons/fa";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import EmployeeUploadModal from "./EmployeeUploadModal";
import DownloadEmployeeTemplate from "@/components/popscreen/DownloadTemplate";
import EmployeeDetailsForm from "./EmployeeDetailsForm";
import { FaChevronDown } from 'react-icons/fa';
import Alert from '@/components/ui/alert/Alert';
import DateRangePicker from '@/components/DateRangePicker';
// Add date-fns for date calculations
import { startOfWeek, endOfWeek } from 'date-fns';
import * as XLSX from 'xlsx';
import EmployeePage from "../Employees/page";
import { uploadFaqCsv } from "@/utils/api";
import { fetchFaqFiles } from "@/utils/api";
import { deleteFaqCsv } from "@/utils/api";
import Pagination from "@/components/tables/Pagination";
import Loader from "@/components/Loader";
import { FaFileAlt } from "react-icons/fa";
import EmployeeDetailsPage from "./EmployeeDetailsPage";

interface Employee {
  id: number;
  emp_id: string;
  full_name: string;
  email: string;
  phone: string;
  department: string;
  created_at: string;
  appointment_count?: number;
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
  employee_name: string;
  employee_email: string;
  message?: string;
  notes?: string;
  created_at: string;
  source?: string; // "employee", "customer", or "lead"
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

interface Agent {
  id: string;
  agent_id: string;
  email: string;
  name: string;
  phone: string;
  status: string;
  role: string;
  department: string;
  max_concurrent_sessions: number;
  active_sessions: number;
  metadata: Record<string, unknown>;
  created_at: number;
  updated_at: number;
  last_login_at: number | null;
}

// Utility function to insert a line break after 30 characters
function insertLineBreak(str: string, maxLen = 30) {
  if (!str) return '';
  if (str.length <= maxLen) return str;
  // Insert a <br/> after every maxLen characters
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

export default function EmployeesPages() {
  const RAW_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";
  const BASE_URL = RAW_BASE_URL ? RAW_BASE_URL.replace(/\/+$/, '') : "";
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();
  const [activeTab, setActiveTab] = useState<'record' | 'knowledgebase' | 'faq' | 'agent'>('record');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeFilters, setActiveFilters] = useState({
    emp_id: "",
    full_name: "",
    email: "",
    phone: "",
    department: "",
  });

  const [showDeleteSingleModal, setShowDeleteSingleModal] = useState<{ open: boolean; emp_id: string | null }>({ open: false, emp_id: null });
  const [deleting, setDeleting] = useState(false);
  const [resendingEmail, setResendingEmail] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10); // default 10
  const [total, setTotal] = useState(0);

  // Add Employee Modal State
  const [showAddModal, setShowAddModal] = useState(false);

  // Add filter type state
  const [filterType, setFilterType] = useState<'emp_id' | 'full_name' | 'email' | 'phone' | 'department'>('emp_id');
  const [showFilterPlaceholder, setShowFilterPlaceholder] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Download Employee Template Modal State
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

  // Add at the top of EmployeesPages component:
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [isFilterButtonClicked, setIsFilterButtonClicked] = useState(false);
  const filterDropdownRef = useRef<HTMLDivElement>(null);

  // Add responsive view state
  const [isMobileView, setIsMobileView] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Employee details page state
  const [showEmployeeDetails, setShowEmployeeDetails] = useState(false);
  const [selectedEmployeeForDetails, setSelectedEmployeeForDetails] = useState<{ id: string; name: string } | null>(null);

  // Appointment modal state
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [employeeAppointments, setEmployeeAppointments] = useState<Appointment[]>([]);
  const [loadingAppointments, setLoadingAppointments] = useState(false);
  // Employee booking modal (create) state
  const [showEmployeeBookModal, setShowEmployeeBookModal] = useState(false);
  const [bookingEmployee, setBookingEmployee] = useState<Employee | null>(null);
  const [empServices, setEmpServices] = useState<Array<{ id: string; name: string }>>([]);
  const [empServiceId, setEmpServiceId] = useState<string>("");
  const [empServiceName, setEmpServiceName] = useState<string>("");
  const [empRawSlots, setEmpRawSlots] = useState<Array<{ id: string; start_utc: string; end_utc: string; capacity: number; booked: number }>>([]);
  const [empAvailableDates, setEmpAvailableDates] = useState<Array<{ date: string; status: 'available' | 'full' | 'not_assigned'; slots?: number; capacity?: number }>>([]);
  const [empSelectedDate, setEmpSelectedDate] = useState<string>("");
  const [empDateSlots, setEmpDateSlots] = useState<Array<{ id: string; label: string; available: number }>>([]);
  const [empSelectedSlotId, setEmpSelectedSlotId] = useState<string>("");
  const [empShowDatePicker, setEmpShowDatePicker] = useState<boolean>(false);
  const [empName, setEmpName] = useState<string>("");
  const [empEmail, setEmpEmail] = useState<string>("");
  const [empNotes, setEmpNotes] = useState<string>("");
  const [empSubmitting, setEmpSubmitting] = useState<boolean>(false);

  // Edit appointment state
  const [showEditEmployeeAppointmentModal, setShowEditEmployeeAppointmentModal] = useState(false);
  const [editingEmployeeAppointment, setEditingEmployeeAppointment] = useState<Appointment | null>(null);
  const [editEmpDate, setEditEmpDate] = useState<string>('');
  const [editEmpShowDatePicker, setEditEmpShowDatePicker] = useState<boolean>(false);
  const [editEmpAvailableDates, setEditEmpAvailableDates] = useState<Array<{ date: string; status: 'available' | 'full' | 'not_assigned'; slots?: number; capacity?: number }>>([]);
  const [editEmpDateSlots, setEditEmpDateSlots] = useState<Array<FormattedSlot>>([]);
  const [editEmpSelectedSlotId, setEditEmpSelectedSlotId] = useState<string>('');
  const [editEmpNotes, setEditEmpNotes] = useState<string>('');
  const [editEmpSubmitting, setEditEmpSubmitting] = useState<boolean>(false);
  const [showEmpCancelReason, setShowEmpCancelReason] = useState<boolean>(false);
  const [empCancelReason, setEmpCancelReason] = useState<string>('');
  const [editEmpRawSlots, setEditEmpRawSlots] = useState<Array<AvailabilitySlot>>([]);

  const openEmployeeBookModal = async (employee: Employee) => {
    try {
      setBookingEmployee(employee);
      setShowEmployeeBookModal(true);
      setEmpName(employee.full_name || "");
      setEmpEmail(employee.email || "");
      setEmpNotes("");
      // Load services and filter to HR/IT
      let current = empServices;
      if (current.length === 0) {
        const res = await fetch((process.env.NEXT_PUBLIC_API_URL || '') + '/appointment/admin/services');
        if (res.ok) {
          const data = await res.json();
          current = (data || []).map((s: { id: string; name: string }) => ({ id: s.id, name: s.name }));
          // Filter HR/IT
          current = current.filter(s => {
            const n = (s.name || '').toLowerCase();
            return n.includes('hr') || n.includes('it') || n.includes('human resources') || n.includes('information technology');
          });
          setEmpServices(current);
        }
      }
      const def = current[0];
      if (def) {
        setEmpServiceId(def.id);
        setEmpServiceName(def.name);
        await loadEmployeeSlots(def.id);
      } else {
        setEmpServiceName('');
      }
    } catch (e) {
      console.warn('Open employee book modal error', e);
    }
  };

  const loadEmployeeSlots = async (serviceId: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/appointment/availability/slots?service_id=${encodeURIComponent(serviceId)}`);
      if (!res.ok) return;
      const data = await res.json();
      setEmpRawSlots(data);
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
      }));
      setEmpAvailableDates(av);
    } catch { }
  };

  const handleEmployeeDatePick = (date: string) => {
    setEmpSelectedDate(date);
    setEmpShowDatePicker(false);
    const list = empRawSlots.filter((s: { start_utc?: string }) => (s.start_utc || '').startsWith(date)).map((s: { start_utc: string; end_utc: string; id: string; capacity?: number; booked?: number }) => {
      const start = s.start_utc.split('T')[1].slice(0, 5);
      const end = s.end_utc.split('T')[1].slice(0, 5);
      const avail = Math.max(0, Number(s.capacity || 0) - Number(s.booked || 0));
      return { id: s.id, label: `${start} - ${end} (${avail} available)`, available: avail };
    }).filter((s: { available: number }) => s.available > 0);
    setEmpDateSlots(list);
    setEmpSelectedSlotId(list[0]?.id || '');
  };

  const submitEmployeeBooking = async () => {
    if (empSubmitting) return;
    if (!bookingEmployee || !empServiceId || !empSelectedSlotId) return;
    const slot = empRawSlots.find(s => s.id === empSelectedSlotId);
    if (!slot) return;
    const date = slot.start_utc.split('T')[0];
    const time = slot.start_utc.split('T')[1].slice(0, 5);
    try {
      setEmpSubmitting(true);
      const payload = {
        service_id: empServiceId,
        service_name: empServiceName || 'HR/IT',
        date,
        time,
        employee_name: empName || bookingEmployee.full_name,
        employee_email: empEmail || bookingEmployee.email,
        message: empNotes || 'Booked from Employees page',
      } as Record<string, unknown>;
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/appointment/employee/book`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      if (res.ok) {
        setShowEmployeeBookModal(false);
        setAlert({ show: true, variant: 'success', title: 'Booked', message: 'Appointment booked and email will be sent.' });
      } else {
        let msg = ''; try { if (!res.bodyUsed) msg = await res.text(); } catch { }
        setAlert({ show: true, variant: 'error', title: 'Booking failed', message: msg || `${res.status} ${res.statusText}` });
      }
      setTimeout(() => setAlert(a => ({ ...a, show: false })), 2500);
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e)
      setAlert({ show: true, variant: 'error', title: 'Booking failed', message: errorMessage });
      setTimeout(() => setAlert(a => ({ ...a, show: false })), 2500);
    } finally {
      setEmpSubmitting(false);
    }
  };

  // Edit appointment functions
  const openEditEmployeeAppointmentModal = async (appointment: Appointment) => {
    try {
      setEditingEmployeeAppointment(appointment);
      // Normalize date to YYYY-MM-DD format (handle ISO strings)
      const normalizedDate = appointment.date ? appointment.date.split('T')[0] : '';
      setEditEmpDate(normalizedDate);
      setEditEmpNotes(appointment.message || appointment.notes || '');
      setShowEmpCancelReason(false);
      setEmpCancelReason('');
      setEditEmpSelectedSlotId('');
      setEditEmpShowDatePicker(false);
      setShowEditEmployeeAppointmentModal(true);

      // Resolve service_id - try multiple ways
      let serviceId = appointment.service_id;
      if (!serviceId && appointment.service_name) {
        const service = empServices.find(s => s.name === appointment.service_name);
        if (service) {
          serviceId = service.id;
        } else {
          try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/appointment/admin/services`);
            if (res.ok) {
              const data = await res.json();
              const fetchedServices = (data || []).map((s: Service) => ({ id: s.id, name: s.name }));
              setEmpServices(fetchedServices);
              const matchedService = fetchedServices.find((s: Service) => s.name === appointment.service_name);
              if (matchedService) {
                serviceId = matchedService.id;
              }
            }
          } catch (e) {
            console.warn('Error fetching services:', e);
          }
        }
      }

      if (serviceId) {
        await loadEditEmployeeSlots(serviceId, normalizedDate, appointment.time);
      } else {
        console.warn('Could not resolve service_id for appointment:', appointment);
      }
    } catch (e) {
      console.warn('Open edit employee modal error', e);
    }
  };

  const loadEditEmployeeSlots = async (serviceId: string, currentDate: string, currentTime: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/appointment/availability/slots?service_id=${encodeURIComponent(serviceId)}`);
      if (!res.ok) return;
      const data = await res.json();
      setEditEmpRawSlots(data);

      const byDate: Record<string, { capacity: number; booked: number }> = {};
      (data || []).forEach((slot: AvailabilitySlot) => {
        const d = (slot.start_utc || '').split('T')[0];
        if (!d) return;
        if (!byDate[d]) byDate[d] = { capacity: 0, booked: 0 };
        byDate[d].capacity += Number(slot.capacity || 0);
        byDate[d].booked += Number(slot.booked || 0);
      });
      // USE EXACT SAME LOGIC AS loadEmployeeSlots - map ALL entries, no filter, no sort
      const dates = Object.entries(byDate).map(([date, v]) => ({
        date,
        status: v.capacity <= 0 ? 'not_assigned' as const : (v.booked >= v.capacity ? 'full' as const : 'available' as const),
        slots: v.capacity - v.booked,
        capacity: v.capacity,
      }));

      // Normalize currentDate to YYYY-MM-DD format before comparison
      const normalizedCurrentDate = currentDate ? currentDate.split('T')[0] : '';

      // Always include current appointment date if not in dates, mark it as available
      if (normalizedCurrentDate) {
        const dateExists = dates.find(d => d.date === normalizedCurrentDate);
        if (!dateExists) {
          dates.push({
            date: normalizedCurrentDate,
            status: 'available' as const,
            slots: 1,
            capacity: 1,
          });
        }
        setEditEmpDate(normalizedCurrentDate);
        handleEditEmployeeDatePick(normalizedCurrentDate, currentTime);
      }

      setEditEmpAvailableDates(dates);
    } catch (e) {
      console.warn('Load edit employee slots error', e);
    }
  };

  const handleEditEmployeeDatePick = (date: string, currentTime?: string) => {
    setEditEmpDate(date);
    setEditEmpShowDatePicker(false);
    const slotsForDate = (editEmpRawSlots || []).filter((slot: AvailabilitySlot) => {
      const slotDate = (slot.start_utc || '').split('T')[0];
      return slotDate === date;
    });
    const formattedSlots: FormattedSlot[] = slotsForDate.map((slot: AvailabilitySlot) => {
      const startUtc = slot.start_utc;
      const endUtc = slot.end_utc;
      const startTime = startUtc.split('T')[1]?.slice(0, 5) || '';
      const endTime = endUtc.split('T')[1]?.slice(0, 5) || '';
      const label = startTime === endTime ? startTime : `${startTime}-${endTime}`;
      const capacity = slot.capacity ?? 0;
      const booked = slot.booked ?? 0;
      return {
        id: slot.id,
        label: `${label} (${capacity - booked}/${capacity} available)`,
        available: capacity - booked,
        start_utc: startUtc,
      };
    }).filter((s: FormattedSlot) => s.available > 0 || currentTime).sort((a: FormattedSlot, b: FormattedSlot) => {
      const aTime = a.start_utc.split('T')[1];
      const bTime = b.start_utc.split('T')[1];
      return (aTime || '').localeCompare(bTime || '');
    });
    setEditEmpDateSlots(formattedSlots);

    if (currentTime && formattedSlots.length > 0) {
      const matchingSlot = formattedSlots.find((s: FormattedSlot) => {
        const slotTime = s.start_utc.split('T')[1]?.slice(0, 5);
        return slotTime === currentTime;
      });
      if (matchingSlot) {
        setEditEmpSelectedSlotId(matchingSlot.id);
      } else {
        setEditEmpSelectedSlotId(formattedSlots[0].id);
      }
    } else if (formattedSlots.length > 0) {
      setEditEmpSelectedSlotId(formattedSlots[0].id);
    }
  };

  const submitUpdateEmployeeAppointment = async () => {
    if (editEmpSubmitting || !editingEmployeeAppointment || !editEmpDate || !editEmpSelectedSlotId) return;

    const slot = editEmpRawSlots.find((s: AvailabilitySlot) => s.id === editEmpSelectedSlotId);
    if (!slot) return;

    const time = slot.start_utc.split('T')[1]?.slice(0, 5) || '';

    try {
      setEditEmpSubmitting(true);
      const base = process.env.NEXT_PUBLIC_API_URL || '';
      // Use employee-specific endpoint
      const res = await fetch(`${base}/appointment/employee/appointments/${editingEmployeeAppointment.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: editEmpDate,
          time: time,
          notes: editEmpNotes || editingEmployeeAppointment.message || editingEmployeeAppointment.notes || '',
        }),
      });

      if (res.ok) {
        setAlert({ show: true, variant: 'success', title: 'Updated', message: 'Appointment updated successfully.' });
        setShowEditEmployeeAppointmentModal(false);
        if (selectedEmployee) {
          fetchEmployeeAppointments(selectedEmployee);
        }
      } else {
        const msg = await res.text().catch(() => `${res.status} ${res.statusText}`);
        setAlert({ show: true, variant: 'error', title: 'Update failed', message: msg });
      }
      setTimeout(() => setAlert(a => ({ ...a, show: false })), 2500);
    } catch (e: unknown) {
      const error = e as Error;
      setAlert({ show: true, variant: 'error', title: 'Update failed', message: error?.message || String(e) });
      setTimeout(() => setAlert(a => ({ ...a, show: false })), 2500);
    } finally {
      setEditEmpSubmitting(false);
    }
  };

  const submitCancelEmployeeAppointment = async () => {
    if (editEmpSubmitting || !editingEmployeeAppointment) return;
    if (!empCancelReason.trim()) {
      setAlert({ show: true, variant: 'error', title: 'Error', message: 'Please provide a reason for cancellation.' });
      setTimeout(() => setAlert(a => ({ ...a, show: false })), 2500);
      return;
    }

    try {
      setEditEmpSubmitting(true);
      const base = process.env.NEXT_PUBLIC_API_URL || '';
      // Use employee-specific cancellation endpoint
      const res = await fetch(`${base}/appointment/employee/appointments/${editingEmployeeAppointment.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: empCancelReason,
        }),
      });

      if (res.ok) {
        setAlert({ show: true, variant: 'success', title: 'Cancelled', message: 'Appointment cancelled successfully.' });
        setShowEditEmployeeAppointmentModal(false);
        if (selectedEmployee) {
          fetchEmployeeAppointments(selectedEmployee);
        }
      } else {
        const msg = await res.text().catch(() => `${res.status} ${res.statusText}`);
        setAlert({ show: true, variant: 'error', title: 'Cancellation failed', message: msg });
      }
      setTimeout(() => setAlert(a => ({ ...a, show: false })), 2500);
    } catch (e: unknown) {
      const error = e as Error;
      setAlert({ show: true, variant: 'error', title: 'Cancellation failed', message: error?.message || String(e) });
      setTimeout(() => setAlert(a => ({ ...a, show: false })), 2500);
    } finally {
      setEditEmpSubmitting(false);
    }
  };

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

  // Add allEmployees state
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);

  // Employee FAQ states
  const [faqFiles, setFaqFiles] = useState<Array<{ filename: string; directory: string; full_path: string; key: string; size_bytes: number; last_modified: string }>>([]);
  const [faqListLoading, setFaqListLoading] = useState(false);
  const [selectedFilenames, setSelectedFilenames] = useState<Set<string>>(new Set());
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; filename?: string }>({ open: false });
  const FAQ_DIRECTORY = 'Employee_faq';

  // Agent states
  const [agents, setAgents] = useState<Agent[]>([]);
  const [allAgents, setAllAgents] = useState<Agent[]>([]);
  const [agentsLoading, setAgentsLoading] = useState(false);
  const [showAddAgentModal, setShowAddAgentModal] = useState(false);
  const [agentSearchQuery, setAgentSearchQuery] = useState('');
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([]);
  const [showDeleteAgentModal, setShowDeleteAgentModal] = useState<{ open: boolean; agentId: string | null }>({ open: false, agentId: null });
  const [showBulkDeleteAgentModal, setShowBulkDeleteAgentModal] = useState(false);
  const [deletingAgent, setDeletingAgent] = useState(false);
  const [agentFormData, setAgentFormData] = useState({
    email: '',
    name: '',
    phone: '',
    role: 'agent',
    department: '',
    max_concurrent_sessions: 5,
    metadata: {} as Record<string, unknown>,
  });

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

  // Load Employee FAQ file when FAQ tab becomes active
  useEffect(() => {
    async function loadFaqFiles() {
      if (activeTab !== 'faq') return;
      try {
        setFaqListLoading(true);
        const { files } = await fetchFaqFiles(FAQ_DIRECTORY);
        setFaqFiles(Array.isArray(files) ? files : []);
      } catch (e) {
        console.error('Failed to load Employee FAQ file', e);
      } finally {
        setFaqListLoading(false);
      }
    }
    loadFaqFiles();
  }, [activeTab]);

  // Fetch Agents function
  const fetchAgents = useCallback(async () => {
    setAgentsLoading(true);
    try {
      // Use WhatsApp Bot API URL from environment
      const AGENT_API_URL = process.env.NEXT_PUBLIC_WHATSAPP_BOT_API_URL || 'https://wa-mobiloitte.converiqo.ai';
      const url = `${AGENT_API_URL}/agents?limit=100&skip=0&sort_by=created_at&sort_order=desc`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'accept': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        const agentsData = data.agents || [];
        setAllAgents(agentsData);
        setAgents(agentsData);
      } else {
        console.error('Failed to fetch agents:', response.status);
        setAlert({ show: true, variant: 'error', title: 'Error', message: 'Failed to fetch agents.' });
        setTimeout(() => setAlert(a => ({ ...a, show: false })), 3000);
      }
    } catch (error) {
      console.error('Error fetching agents:', error);
      setAlert({ show: true, variant: 'error', title: 'Error', message: 'Failed to fetch agents.' });
      setTimeout(() => setAlert(a => ({ ...a, show: false })), 3000);
    } finally {
      setAgentsLoading(false);
    }
  }, []);

  // Load agents when Agent tab becomes active
  useEffect(() => {
    if (activeTab === 'agent') {
      fetchAgents();
    }
  }, [activeTab, fetchAgents]);

  // Filter agents based on search query
  useEffect(() => {
    if (!agentSearchQuery.trim()) {
      setAgents(allAgents);
      return;
    }

    const query = agentSearchQuery.toLowerCase();
    const filtered = allAgents.filter(agent =>
      agent.agent_id.toLowerCase().includes(query) ||
      agent.name.toLowerCase().includes(query) ||
      agent.email.toLowerCase().includes(query) ||
      agent.phone.toLowerCase().includes(query)
    );
    setAgents(filtered);

    // Clear selections that are no longer visible
    setSelectedAgentIds(prev => prev.filter(id =>
      filtered.some(agent => agent.agent_id === id)
    ));
  }, [agentSearchQuery, allAgents]);

  // Create Agent function
  const createAgent = async () => {
    try {
      setAgentsLoading(true);
      const AGENT_API_URL = process.env.NEXT_PUBLIC_WHATSAPP_BOT_API_URL || 'https://wa-mobiloitte.converiqo.ai';
      const url = `${AGENT_API_URL}/agents`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(agentFormData),
      });

      if (response.ok) {
        await response.json();
        setAlert({ show: true, variant: 'success', title: 'Success', message: 'Agent created successfully!' });
        setTimeout(() => setAlert(a => ({ ...a, show: false })), 3000);
        setShowAddAgentModal(false);
        setAgentFormData({
          email: '',
          name: '',
          phone: '',
          role: 'agent',
          department: '',
          max_concurrent_sessions: 5,
          metadata: {},
        });
        await fetchAgents();
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || errorData.detail || 'Failed to create agent';
        setAlert({ show: true, variant: 'error', title: 'Error', message: errorMessage });
        setTimeout(() => setAlert(a => ({ ...a, show: false })), 3000);
      }
    } catch (error) {
      console.error('Error creating agent:', error);
      setAlert({ show: true, variant: 'error', title: 'Error', message: 'Failed to create agent.' });
      setTimeout(() => setAlert(a => ({ ...a, show: false })), 3000);
    } finally {
      setAgentsLoading(false);
    }
  };

  // Delete Agent function (single)
  const deleteAgent = async (agentId: string) => {
    try {
      setDeletingAgent(true);
      const AGENT_API_URL = process.env.NEXT_PUBLIC_WHATSAPP_BOT_API_URL || 'https://wa-mobiloitte.converiqo.ai';
      const url = `${AGENT_API_URL}/agents/${agentId}`;

      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'accept': '*/*',
        },
      });

      if (response.ok || response.status === 204) {
        setAlert({ show: true, variant: 'success', title: 'Success', message: 'Agent deleted successfully!' });
        setTimeout(() => setAlert(a => ({ ...a, show: false })), 3000);
        setShowDeleteAgentModal({ open: false, agentId: null });
        await fetchAgents();
        // Remove from selected if it was selected
        setSelectedAgentIds(prev => prev.filter(id => id !== agentId));
      } else {
        setAlert({ show: true, variant: 'error', title: 'Error', message: 'Failed to delete agent.' });
        setTimeout(() => setAlert(a => ({ ...a, show: false })), 3000);
      }
    } catch (error) {
      console.error('Error deleting agent:', error);
      setAlert({ show: true, variant: 'error', title: 'Error', message: 'Failed to delete agent.' });
      setTimeout(() => setAlert(a => ({ ...a, show: false })), 3000);
    } finally {
      setDeletingAgent(false);
    }
  };

  // Delete Agents function (bulk)
  const deleteAgentsBulk = async () => {
    if (selectedAgentIds.length === 0) return;

    try {
      setDeletingAgent(true);
      const AGENT_API_URL = process.env.NEXT_PUBLIC_WHATSAPP_BOT_API_URL || 'https://wa-mobiloitte.converiqo.ai';

      // Delete all selected agents
      for (const agentId of selectedAgentIds) {
        const url = `${AGENT_API_URL}/agents/${agentId}`;
        await fetch(url, {
          method: 'DELETE',
          headers: {
            'accept': '*/*',
          },
        });
      }

      setAlert({ show: true, variant: 'success', title: 'Success', message: `${selectedAgentIds.length} agent(s) deleted successfully!` });
      setTimeout(() => setAlert(a => ({ ...a, show: false })), 3000);
      setShowBulkDeleteAgentModal(false);
      setSelectedAgentIds([]);
      await fetchAgents();
    } catch (error) {
      console.error('Error deleting agents:', error);
      setAlert({ show: true, variant: 'error', title: 'Error', message: 'Failed to delete agents.' });
      setTimeout(() => setAlert(a => ({ ...a, show: false })), 3000);
    } finally {
      setDeletingAgent(false);
    }
  };

  // Agent selection handlers
  const allAgentsSelected = agents.length > 0 && agents.every(agent => selectedAgentIds.includes(agent.agent_id));
  const handleSelectAllAgents = () => {
    if (allAgentsSelected) {
      setSelectedAgentIds([]);
    } else {
      setSelectedAgentIds(agents.map(agent => agent.agent_id));
    }
  };

  const handleSelectOneAgent = (agentId: string) => {
    setSelectedAgentIds(prev =>
      prev.includes(agentId)
        ? prev.filter(id => id !== agentId)
        : [...prev, agentId]
    );
  };

  const refreshFaqFiles = async () => {
    try {
      setFaqListLoading(true);
      const { files } = await fetchFaqFiles(FAQ_DIRECTORY);
      setFaqFiles(Array.isArray(files) ? files : []);
      setAlert({ show: true, variant: 'success', title: 'Refreshed', message: 'FAQ list refreshed.' });
      setTimeout(() => setAlert(a => ({ ...a, show: false })), 2000);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to refresh FAQ file';
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
  const toggleRowExpansion = (empId: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(empId)) {
        newSet.delete(empId);
      } else {
        newSet.add(empId);
      }
      return newSet;
    });
  };

  // Enhanced Mobile Card Component
  const EmployeeCard = ({ employee }: { employee: Employee }) => {
    const isExpanded = expandedRows.has(employee.emp_id);
    const isSelected = selectedEmployeeIds.includes(employee.emp_id);

    return (
      <div className={`relative overflow-hidden rounded-2xl shadow-lg border transition-all duration-300 hover:shadow-xl group ${isSelected
        ? 'ring-2 ring-blue-500 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-700'
        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
        }`}>
        {/* Card Header */}
        <div className="p-6 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => handleSelectOne(employee.emp_id)}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 rounded-full flex items-center justify-center">
                    <span className="text-sm font-semibold text-green-700 dark:text-green-300">
                      {employee.full_name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3
                      className="text-lg font-semibold text-gray-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors cursor-pointer hover:underline"
                      onClick={() => handleEmployeeDetailsClick(employee.emp_id, employee.full_name)}
                      title="Click to view employee details"
                    >
                      {employee.full_name}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                      ID: {employee.emp_id}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                    {employee.department}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="inline-flex items-center justify-center px-3 py-2 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-300 dark:hover:border-blue-700 transition-all duration-200 shadow-sm hover:shadow-md rounded-md text-sm font-medium"
                onClick={() => setShowDeleteSingleModal({ open: true, emp_id: employee.emp_id })}
                title="Delete employee"
              >
                <FaTrash className="w-3 h-3" />
              </button>
              <button
                onClick={() => toggleRowExpansion(employee.emp_id)}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <svg
                  className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Email</span>
                <p
                  className="text-sm text-gray-900 dark:text-white font-medium truncate cursor-help"
                  title={employee.email}
                >
                  {truncateEmail(employee.email, 25)}
                </p>
              </div>
              <div className="space-y-1">
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Phone Number</span>
                <p className="text-sm text-gray-900 dark:text-white font-medium">{employee.phone}</p>
              </div>
            </div>

            {/* Appointment Info */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Appointment</span>
                {employee.appointment ? (
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-gray-900 dark:text-white">
                        {new Date(employee.appointment.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{employee.appointment.time}</div>
                    </div>
                  </div>
                ) : (
                  <span className="px-3 py-1 rounded-full text-xs font-semibold border shadow whitespace-nowrap bg-teal-100 text-teal-800 border-teal-300">N/A</span>
                )}
              </div>
            </div>
            <div className="space-y-1">
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Created</span>
              <p className="text-sm text-gray-900 dark:text-white font-medium">
                {new Date(employee.created_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
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
    // You can add logic to update activeFilters or fetchEmployees if needed
  }, [filterType, timeFrame, customStartDate, customEndDate, sortOption]);


  // Move fetchEmployees to top-level with useCallback to prevent infinite loops
  const fetchEmployees = useCallback(async (setAllEmployees: (data: Employee[]) => void, setTotal: (total: number) => void, setIsLoading: (loading: boolean) => void) => {
    setIsLoading(true);
    const params = new URLSearchParams();
    params.append("page", "1");
    params.append("size", "1000"); // fetch up to 1000 employees
    try {
      const response = await fetch(
        BASE_URL + "/api/v1/employees/?" + params.toString(),
        {
          method: "GET",
          headers: { accept: "application/json" },
        },
      );
      if (response.ok) {
        const data = await response.json();
        const employeesData = data.data || [];

        // Fetch appointment counts for all employees (only employee source)
        const employeesWithCounts = await Promise.all(
          employeesData.map(async (emp: Employee) => {
            try {
              const countResponse = await fetch(
                `${BASE_URL}/appointment/admin/appointments?source=employee&customer_email=${encodeURIComponent(emp.email)}`,
                {
                  method: 'GET',
                  headers: { accept: 'application/json' },
                }
              );
              if (countResponse.ok) {
                const appointments = await countResponse.json();
                const employeeAppointments = Array.isArray(appointments)
                  ? appointments.filter((apt: Appointment) => apt.source === 'employee')
                  : [];
                return { ...emp, appointment_count: employeeAppointments.length };
              }
            } catch (error) {
              console.error(`Error fetching appointment count for ${emp.email}:`, error);
            }
            return { ...emp, appointment_count: emp.appointment_count || 0 };
          })
        );

        setAllEmployees(employeesWithCounts);
        setTotal(data.total_records || 0);
      }
    } finally {
      setIsLoading(false);
    }
  }, [BASE_URL]);

  // Add this wrapper for the new fetchEmployees
  const fetchAllEmployees = useCallback(() => fetchEmployees(setAllEmployees, setTotal, setIsLoading), [fetchEmployees, setAllEmployees, setTotal, setIsLoading]);

  // Replace useEffect for initial fetch and dependency updates
  useEffect(() => {
    fetchAllEmployees();
  }, [fetchAllEmployees, activeFilters, page, size, timeFrame, customStartDate, customEndDate, sortOption]);

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
    setFilterType('emp_id');
    setPage(1);
    setSize(10);
    setSelectedEmployeeIds([]);
  }, []);

  // Update frontend filtering useEffect to include all filters and pagination
  useEffect(() => {
    let filtered = [...allEmployees];
    // Filter By and search
    if (searchQuery) {
      if (filterType && showFilterPlaceholder) {
        // Specific field search when filter is selected
        filtered = filtered.filter(emp => {
          const val = emp[filterType] ? String(emp[filterType]).toLowerCase() : '';
          return val.includes(searchQuery.toLowerCase());
        });
      } else {
        // Advanced global search across all fields when no specific filter is selected
        filtered = filtered.filter(emp => {
          const searchWords = searchQuery.toLowerCase().trim().split(/\s+/).filter(word => word.length > 0);

          if (searchWords.length === 0) return true;

          // Check if ANY word matches ANY field (solar search)
          return searchWords.some(word => {
            return (
              (emp.emp_id && emp.emp_id.toLowerCase().includes(word)) ||
              (emp.full_name && emp.full_name.toLowerCase().includes(word)) ||
              (emp.email && emp.email.toLowerCase().includes(word)) ||
              (emp.phone && emp.phone.toLowerCase().includes(word)) ||
              (emp.department && emp.department.toLowerCase().includes(word))
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
      filtered = filtered.filter(emp => {
        const created = new Date(emp.created_at);
        return created >= startOfDay && created <= endOfDay;
      });
    } else if (timeFrame === 'this_week') {
      const now = new Date();
      const weekStart = startOfWeek(now, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
      filtered = filtered.filter(emp => {
        const created = new Date(emp.created_at);
        return created >= weekStart && created <= weekEnd;
      });
    } else if (timeFrame === 'custom' && customStartDate && customEndDate) {
      filtered = filtered.filter(emp => {
        const created = new Date(emp.created_at);
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
    setEmployees(filtered.slice(start, end));
    setTotal(filtered.length);
  }, [allEmployees, filterType, searchQuery, timeFrame, customStartDate, customEndDate, sortOption, page, size, showFilterPlaceholder]);

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

  // Update handleConfirmUpload to await fetchAllEmployees
  const handleConfirmUpload = async () => {
    if (selectedFile) {
      setUploading(true);
      const formData = new FormData();
      formData.append("file", selectedFile);

      try {
        const response = await fetch(
          BASE_URL + "/api/v1/upload-employees/",
          {
            method: "POST",
            body: formData,
          }
        );

        if (response.ok) {
          await fetchAllEmployees();

          // Show success message
          setAlert({
            show: true,
            variant: 'success',
            title: 'Upload Successful!',
            message: "File uploaded: " + selectedFile.name
          });
          setTimeout(() => setAlert(a => ({ ...a, show: false })), 3000);
        } else {
          // Handle different error responses from backend
          let errorMessage = "Failed to upload employee file. Please try again.";

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

            // Handle specific error cases for employees
            if (errorMessage.includes("Missing required columns") ||
              errorMessage.includes("department") ||
              errorMessage.includes("emp_id") ||
              errorMessage.includes("email") ||
              errorMessage.includes("full_name")) {
              errorMessage = "Missing required columns: department, emp_id, email, full_name";
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


  // Optionally clear search input when filterType changes
  useEffect(() => {
    setSearchQuery('');
  }, [filterType]);

  // Only update activeFilters when searchQuery changes, NOT when filterType changes
  useEffect(() => {
    setActiveFilters(f => ({ ...f, [filterType]: searchQuery }));
  }, [searchQuery, filterType]);

  // Delete Single ---->
  const handleDeleteSingle = async (emp_id: string) => {
    setDeleting(true);
    try {
      const response = await fetch(BASE_URL + "/api/v1/employees/" + emp_id + "/", {
        method: "DELETE",
        headers: { "accept": "application/json" },
      });
      if (response.ok) {
        fetchAllEmployees();
        setAlert({ show: true, variant: 'success', title: 'Delete Successful!', message: 'Employee deleted successfully.' }); // Show success alert in Action column
      } else {
        setAlert({ show: true, variant: 'error', title: 'Delete Failed', message: 'Failed to delete employee.' }); // Show error alert in Action column
      }
      setTimeout(() => setAlert(a => ({ ...a, show: false })), 3000); // Hide alert after 3 seconds
    } finally {
      setDeleting(false);
      setShowDeleteSingleModal({ open: false, emp_id: null });
    }
  };

  // Resend Credentials ---->
  const handleResendCredentials = async (email: string) => {
    if (resendingEmail) return; // Prevent multiple clicks
    setResendingEmail(email);
    try {
      const response = await fetch(`${BASE_URL}/api/v1/employees/resend-credentials`, {
        method: "POST",
        headers: {
          "accept": "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });
      if (response.ok) {
        const data = await response.json();
        setAlert({
          show: true,
          variant: 'success',
          title: 'Success',
          message: data.message || 'Credentials sent successfully'
        });
      } else {
        const errorData = await response.json().catch(() => ({}));
        setAlert({
          show: true,
          variant: 'error',
          title: 'Failed',
          message: errorData.message || 'Failed to send credentials'
        });
      }
      setTimeout(() => setAlert(a => ({ ...a, show: false })), 3000);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred while sending credentials';
      setAlert({
        show: true,
        variant: 'error',
        title: 'Error',
        message: errorMessage
      });
      setTimeout(() => setAlert(a => ({ ...a, show: false })), 3000);
    } finally {
      setResendingEmail(null);
    }
  };

  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

  // Select all handler
  const allSelected = employees.length > 0 && employees.every(emp => selectedEmployeeIds.includes(emp.emp_id));
  const handleSelectAll = () => {
    if (allSelected) {
      setSelectedEmployeeIds([]);
    } else {
      setSelectedEmployeeIds(employees.map(emp => emp.emp_id));
    }
  };
  // Select single handler
  const handleSelectOne = (emp_id: string) => {
    setSelectedEmployeeIds(ids => ids.includes(emp_id) ? ids.filter(id => id !== emp_id) : [...ids, emp_id]);
  };

  // Handle employee details click
  const handleEmployeeDetailsClick = (employeeId: string, employeeName: string) => {
    setSelectedEmployeeForDetails({ id: employeeId, name: employeeName });
    setShowEmployeeDetails(true);
  };
  // Bulk delete handler
  const handleBulkDelete = async () => {
    setShowBulkDeleteConfirm(false);
    setDeleting(true);
    try {
      for (const emp_id of selectedEmployeeIds) {
        await fetch(BASE_URL + "/api/v1/employees/" + emp_id + "/", {
          method: "DELETE",
          headers: { "accept": "application/json" },
        });
      }
      fetchAllEmployees();
      setSelectedEmployeeIds([]);
      setAlert({ show: true, variant: 'success', title: 'Delete Successful!', message: 'Selected employees deleted.' });
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
    const timestamp = pad(now.getDate()) + "-" + pad(now.getMonth() + 1) + "-" + now.getFullYear() + "_" + pad(now.getHours()) + "-" + pad(now.getMinutes()) + "-" + pad(now.getSeconds());
    const fileName = "Employee_Records_" + timestamp + "." + fileExt;
    // Use only selected employees if any, otherwise all filtered
    const exportData = (selectedEmployeeIds.length > 0
      ? employees.filter(emp => selectedEmployeeIds.includes(emp.emp_id))
      : employees
    ).map(({ id, emp_id, full_name, email, phone, department, created_at }) => ({ id, emp_id, full_name, email, phone, department, created_at }));
    if (exportData.length === 0) {
      setAlert({ show: true, variant: 'error', title: 'No Data', message: 'No data available to download.' });
      setTimeout(() => setAlert(a => ({ ...a, show: false })), 3000);
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
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Employees');
      XLSX.writeFile(wb, fileName);
    }
    setShowDownloadModal(false);
    setAlert({ show: true, variant: 'success', title: 'Download Successful!', message: "File downloaded: " + fileName });
    setTimeout(() => setAlert(a => ({ ...a, show: false })), 3000);
  };

  // Download current list view data - matches template format for easy re-upload
  const handleDownloadListData = () => {
    if (employees.length === 0) {
      setAlert({ show: true, variant: 'error', title: 'No Data', message: 'No data available to download.' });
      setTimeout(() => setAlert(a => ({ ...a, show: false })), 3000);
      return;
    }

    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const timestamp = pad(now.getDate()) + "-" + pad(now.getMonth() + 1) + "-" + now.getFullYear() + "_" + pad(now.getHours()) + "-" + pad(now.getMinutes()) + "-" + pad(now.getSeconds());
    const fileName = "Employee_List_" + timestamp + ".xlsx";

    // Prepare data for export - use same column names as template (snake_case) for easy re-upload
    // Order matches template: emp_id, full_name, email, phone, department
    const exportData = employees.map(({ emp_id, full_name, email, phone, department, created_at }) => ({
      emp_id: emp_id || '',
      full_name: full_name || '',
      email: email || '',
      phone: phone || '',
      department: department || '',
      created_at: created_at || ''
    }));

    // Create Excel file
    const ws = XLSX.utils.json_to_sheet(exportData);

    // Set column widths to match template format
    const columnWidths = [
      { wch: 15 }, // emp_id
      { wch: 20 }, // full_name
      { wch: 25 }, // email
      { wch: 15 }, // phone
      { wch: 15 }, // department
      { wch: 20 }  // created_at
    ];
    ws['!cols'] = columnWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Employees');
    XLSX.writeFile(wb, fileName);

    setAlert({ show: true, variant: 'success', title: 'Download Successful!', message: "File downloaded: " + fileName });
    setTimeout(() => setAlert(a => ({ ...a, show: false })), 3000);
  };

  // Refresh handler to clear search and filters and refetch data
  const handleRefresh = async () => {
    setIsLoading(true);
    setPage(1);
    setSearchQuery('');
    setFilterType('emp_id');
    setShowFilterPlaceholder(false);
    setTimeFrame('all');
    setCustomStartDate(null);
    setCustomEndDate(null);
    setSortOption('created_at_desc');
    setSelectedEmployeeIds([]);
    setActiveFilters({
      emp_id: "",
      full_name: "",
      email: "",
      phone: "",
      department: "",
    });

    // Reset filter section state
    setShowFilterDropdown(false);
    setIsFilterButtonClicked(false);

    // Refetch all employees
    await fetchAllEmployees();
  };

  // Appointment functions
  const fetchEmployeeAppointments = async (employee: Employee) => {
    setLoadingAppointments(true);
    try {
      // Fetch ONLY employee source appointments for this specific employee by email
      const urlBase = process.env.NEXT_PUBLIC_API_BASE || process.env.NEXT_PUBLIC_API_URL || '';
      const response = await fetch(`${urlBase}/appointment/admin/appointments?source=employee&customer_email=${encodeURIComponent(employee.email)}`);
      if (response.ok) {
        const appointments = await response.json();
        // Filter to ensure only employee source appointments are shown
        const filteredAppointments = Array.isArray(appointments)
          ? appointments.filter((apt: Appointment) => apt.source === 'employee')
          : [];
        setEmployeeAppointments(filteredAppointments);
      } else {
        console.error('Failed to fetch appointments');
        setEmployeeAppointments([]);
      }
    } catch (error) {
      console.error('Error fetching appointments:', error);
      setEmployeeAppointments([]);
    } finally {
      setLoadingAppointments(false);
    }
  };

  const openAppointmentModal = (employee: Employee) => {
    setSelectedEmployee(employee);
    setShowAppointmentModal(true);
    fetchEmployeeAppointments(employee);
  };

  const closeAppointmentModal = () => {
    setShowAppointmentModal(false);
    setSelectedEmployee(null);
    setEmployeeAppointments([]);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <div className="mx-4 md:mx-6 mt-6 mb-8">
        <DashboardHeader
          title="Employees"
          subtitle="Enhance workforce productivity with employee management and knowledge-sharing tools. Track performance, manage records, and foster team collaboration."
          icon={UsersIcon}
          gradientFrom="from-blue-900"
          gradientTo="to-indigo-800"
          actions={null}
        />
      </div>

      {/* Enhanced Tab Navigation */}
      <div className="relative mb-8 mx-4 md:mx-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-2 shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden relative">
          <div className="relative z-10 inline-flex rounded-xl bg-white dark:bg-gray-800 border border-stroke dark:border-gray-700 p-1 shadow">
            <button
              type="button"
              onClick={() => setActiveTab('record')}
              className={`px-6 py-3 text-sm font-semibold rounded-lg transition-all duration-300 flex items-center gap-2 ${activeTab === 'record'
                ? 'bg-blue-600 text-white shadow-lg transform scale-105'
                : 'text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20'}`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Employee Records
              <span className="ml-2 px-2 py-1 text-xs bg-white/20 text-white rounded-full">
                {employees.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('knowledgebase')}
              className={`px-6 py-3 text-sm font-semibold rounded-lg transition-all duration-300 flex items-center gap-2 ${activeTab === 'knowledgebase'
                ? 'bg-blue-600 text-white shadow-lg transform scale-105'
                : 'text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20'}`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              Knowledge Base
              <span className="ml-2 px-2 py-1 text-xs bg-white/20 text-white rounded-full">
                Docs
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('faq')}
              className={`px-6 py-3 text-sm font-semibold rounded-lg transition-all duration-300 flex items-center gap-2 ${activeTab === 'faq'
                ? 'bg-blue-600 text-white shadow-lg transform scale-105'
                : 'text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20'}`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              FAQ
              <span className="ml-2 px-2 py-1 text-xs bg-white/20 text-white rounded-full">
                {faqFiles.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('agent')}
              className={`px-6 py-3 text-sm font-semibold rounded-lg transition-all duration-300 flex items-center gap-2 ${activeTab === 'agent'
                ? 'bg-blue-600 text-white shadow-lg transform scale-105'
                : 'text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20'}`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Agent
              <span className="ml-2 px-2 py-1 text-xs bg-white/20 text-white rounded-full">
                {allAgents.length}
              </span>
            </button>
          </div>
        </div>
      </div>
      {/* Tab Content */}
      {activeTab === 'record' && (
        <React.Fragment>
          <div className="pb-8">
            {/* Enhanced Control Bar */}
            <div className="mb-8 mx-4 md:mx-6">
              <div className="bg-gradient-to-br from-white via-white to-gray-50/30 dark:from-gray-800 dark:via-gray-800 dark:to-gray-900/50 rounded-2xl p-6 shadow-xl border-0 overflow-hidden backdrop-blur-sm relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 rounded-full -translate-y-16 translate-x-16"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-full translate-y-12 -translate-x-12"></div>
                <div className="relative z-10">
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
                              filterType === 'emp_id' ? 'Search by Employee ID' :
                                filterType === 'full_name' ? 'Search by Name' :
                                  filterType === 'email' ? 'Search by Email' :
                                    filterType === 'phone' ? 'Search by Mobile No' :
                                      filterType === 'department' ? 'Search by Department' :
                                        'Search by'
                            ) : 'Search by employee ID, name, email, or phone number'
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
                        className={`group relative overflow-hidden flex items-center gap-2 px-6 py-3 rounded-xl shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-300 hover:-translate-y-1 ${showFilterDropdown
                          ? 'bg-blue-600 text-white shadow-blue-500/25'
                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                          }`}
                        data-filter-button
                      >
                        <div className="absolute inset-0 bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        <svg className="h-4 w-4 relative z-10 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.382a1 1 0 01-.293.707l-6.414 6.414A1 1 0 0014 14.414V19a1 1 0 01-1.447.894l-2-1A1 1 0 0110 18v-3.586a1 1 0 00-.293-.707L3.293 7.09A1 1 0 013 6.382V4z" />
                        </svg>
                        <span className="font-medium relative z-10">Filters</span>
                        <FaChevronDown className={`ml-1 relative z-10 transition-transform ${showFilterDropdown ? 'rotate-180' : ''}`} />
                      </button>

                      {/* View Toggle */}
                      <button
                        onClick={() => setIsMobileView(!isMobileView)}
                        className="group relative overflow-hidden flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white rounded-xl shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all duration-300 hover:-translate-y-1"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-gray-400 to-gray-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        <svg className="w-4 h-4 relative z-10 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          {isMobileView ? (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                          ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                          )}
                        </svg>
                        <span className="font-medium relative z-10">{isMobileView ? 'Table View' : 'Card View'}</span>
                      </button>

                      {/* Add Employee Button */}
                      <button
                        className="group relative overflow-hidden flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg hover:shadow-xl hover:shadow-blue-500/25 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-300 hover:-translate-y-1 transform hover:scale-105"
                        onClick={() => setShowAddModal(true)}
                      >
                        <div className="absolute inset-0 bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        <svg className="w-4 h-4 relative z-10 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        <span className="font-medium relative z-10">Add Employee</span>
                      </button>

                      {/* Upload Button */}
                      <button
                        className="group relative overflow-hidden flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg hover:shadow-xl hover:shadow-blue-500/25 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-300 hover:-translate-y-1 transform hover:scale-105"
                        onClick={() => setShowUploadModal(true)}
                      >
                        <div className="absolute inset-0 bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        <FaUpload className="w-4 h-4 relative z-10 group-hover:scale-110 transition-transform" />
                        <span className="font-medium relative z-10">Upload</span>
                      </button>

                      {/* Download Button */}
                      <button
                        className="group relative overflow-hidden flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg hover:shadow-xl hover:shadow-blue-500/25 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-300 hover:-translate-y-1 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:scale-100"
                        onClick={handleDownloadListData}
                        disabled={employees.length === 0}
                      >
                        <div className="absolute inset-0 bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        <FaDownload className="w-4 h-4 relative z-10 group-hover:scale-110 transition-transform" />
                        <span className="font-medium relative z-10">Download</span>
                      </button>

                      {/* Refresh Button */}
                      <button
                        className="group relative overflow-hidden flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg hover:shadow-xl hover:shadow-blue-500/25 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-300 hover:-translate-y-1 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:scale-100"
                        onClick={handleRefresh}
                        disabled={isLoading}
                      >
                        <div className="absolute inset-0 bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        <FaSync className={`w-4 h-4 relative z-10 group-hover:scale-110 transition-transform ${isLoading ? 'animate-spin' : ''}`} />
                        <span className="font-medium relative z-10">Refresh</span>
                      </button>
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className="hidden"
                        accept=".xlsx,.xls,.csv"
                      />

                      {/* Bulk Delete Button */}
                      {selectedEmployeeIds.length > 0 && (
                        <button
                          className="group relative overflow-hidden flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl shadow-lg hover:shadow-xl hover:shadow-red-500/25 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-all duration-300 hover:-translate-y-1 disabled:opacity-50"
                          onClick={() => setShowBulkDeleteConfirm(true)}
                          disabled={deleting}
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-red-400 to-red-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                          <FaTrash className="w-4 h-4 relative z-10 group-hover:scale-110 transition-transform" />
                          <span className="font-medium relative z-10">Delete Selected</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* Enhanced Filter Dropdown */}
          {showFilterDropdown && (
            <div ref={filterDropdownRef} className="relative z-30 mb-6 animate-in slide-in-from-top-2 duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-white/95 via-blue-50/80 to-indigo-50/80 dark:from-gray-800/95 dark:via-blue-900/20 dark:to-indigo-900/20 backdrop-blur-md rounded-2xl shadow-2xl border border-gray-200/60 dark:border-gray-700/60"></div>
              <div className="relative z-10 p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.382a1 1 0 01-.293.707l-6.414 6.414A1 1 0 0014 14.414V19a1 1 0 01-1.447.894l-2-1A1 1 0 0110 18v-3.586a1 1 0 00-.293-.707L3.293 7.09A1 1 0 013 6.382V4z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">Advanced Filters</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Refine your search with multiple criteria</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Search By */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Search By</label>
                    <select
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-sm hover:shadow-md"
                      value={filterType}
                      onChange={e => {
                        setFilterType(e.target.value as typeof filterType);
                        setShowFilterPlaceholder(true);
                      }}
                    >
                      <option value="emp_id">Employee ID</option>
                      <option value="full_name">Name</option>
                      <option value="email">Email</option>
                      <option value="phone">Mobile No</option>
                      <option value="department">Department</option>
                    </select>
                  </div>

                  {/* Time Frame */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Time Frame</label>
                    <select
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-sm hover:shadow-md"
                      value={timeFrame}
                      onChange={e => setTimeFrame(e.target.value as typeof timeFrame)}
                    >
                      <option value="all">All Time</option>
                      <option value="today">Today</option>
                      <option value="this_week">This Week</option>
                      <option value="custom">Custom Range</option>
                    </select>
                    {timeFrame === 'custom' && (
                      <div className="mt-3 p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
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
                    <select
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-sm hover:shadow-md"
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

                {/* Filter Actions */}
                <div className="flex items-center justify-between gap-4 mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Use filters to narrow down your search results</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      className="px-6 py-3 rounded-xl border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 shadow-sm hover:shadow-md font-medium"
                      onClick={() => {
                        setShowFilterDropdown(false);
                        setTimeFrame('all');
                        setCustomStartDate(null);
                        setCustomEndDate(null);
                        setSortOption('created_at_desc');
                        setFilterType('emp_id');
                        setSearchQuery('');
                        setShowFilterPlaceholder(false);
                      }}
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Clear All
                    </Button>
                    <Button
                      className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white transition-all duration-200 shadow-lg hover:shadow-xl font-medium"
                      onClick={() => setShowFilterDropdown(false)}
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Apply Filters
                    </Button>
                  </div>
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
                <div className="mx-4 md:mx-6">
                  <div className="space-y-4">
                    {employees.length === 0 ? (
                      <div className="text-center py-20">
                        <div className="flex flex-col items-center justify-center">
                          <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
                            <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No employees found</h3>
                          <p className="text-gray-500 dark:text-gray-400 mb-6">No data matches your current search criteria. Try adjusting your filters or search terms to find what you&apos;re looking for</p>
                          <button
                            onClick={() => setShowAddModal(true)}
                            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
                          >
                            <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Add Employee
                          </button>
                        </div>
                      </div>
                    ) : (
                      employees.map((employee, idx) => (
                        <div key={`${employee.emp_id || 'emp'}-${idx}`} className="animate-in slide-in-from-bottom-2 duration-300">
                          <EmployeeCard employee={employee} />
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ) : (
                /* Enhanced Desktop Table View */
                <div className="mx-4 md:mx-6">
                  <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
                    <div className="overflow-x-auto">
                      <Table className="min-w-full">
                        <TableHeader>
                          <TableRow className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 border-b border-gray-200 dark:border-gray-600">
                            <TableCell isHeader className="px-6 py-4 text-left">
                              <input
                                type="checkbox"
                                aria-label="Select all"
                                checked={allSelected}
                                onChange={handleSelectAll}
                                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                              />
                            </TableCell>
                            <TableCell isHeader className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">
                              <div className="flex items-center gap-2">
                                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                </svg>
                                Employee ID
                              </div>
                            </TableCell>
                            <TableCell isHeader className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">
                              <div className="flex items-center gap-2">
                                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                Name
                              </div>
                            </TableCell>
                            <TableCell isHeader className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">
                              <div className="flex items-center gap-2">
                                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                Email
                              </div>
                            </TableCell>
                            <TableCell isHeader className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">
                              <div className="flex items-center gap-2">
                                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Appointment
                              </div>
                            </TableCell>
                            <TableCell isHeader className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">
                              <div className="flex items-center gap-2">
                                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                </svg>
                                Phone Number
                              </div>
                            </TableCell>
                            <TableCell isHeader className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">
                              <div className="flex items-center gap-2">
                                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                                Department
                              </div>
                            </TableCell>
                            <TableCell isHeader className="px-6 py-4 text-center text-sm font-semibold text-gray-900 dark:text-white">
                              <div className="flex items-center justify-center gap-2">
                                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                Actions
                              </div>
                            </TableCell>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {employees.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={6} className="px-6 py-20 text-center">
                                <div className="flex flex-col items-center justify-center">
                                  <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
                                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                  </div>
                                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No employees found</h3>
                                  <p className="text-gray-500 dark:text-gray-400 mb-6">No data matches your current search criteria. Try adjusting your filters or search terms to find what you&apos;re looking for</p>
                                  <button
                                    onClick={() => setShowAddModal(true)}
                                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
                                  >
                                    <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                    Add Employee
                                  </button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ) : (
                            employees.map((employee, index) => (
                              <TableRow
                                key={`${employee.emp_id || 'emp'}-${index}`}
                                className={`group hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-200 ${index % 2 === 0 ? "bg-white dark:bg-gray-800" : "bg-gray-50/50 dark:bg-gray-700/30"
                                  }`}
                              >
                                <TableCell className="px-6 py-4">
                                  <input
                                    type="checkbox"
                                    aria-label={"Select " + employee.full_name}
                                    checked={selectedEmployeeIds.includes(employee.emp_id)}
                                    onChange={() => handleSelectOne(employee.emp_id)}
                                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                                  />
                                </TableCell>
                                <TableCell className="px-6 py-4">
                                  <div className="flex items-center gap-3">
                                    <div className="flex-shrink-0">
                                      <div className="w-8 h-8 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-lg flex items-center justify-center">
                                        <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                        </svg>
                                      </div>
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <span 
                                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium text-sm truncate block cursor-pointer hover:underline transition-colors"
                                        onClick={() => handleEmployeeDetailsClick(employee.emp_id, employee.full_name)}
                                        title="Click to view employee details"
                                      >
                                        {employee.emp_id}
                                      </span>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell className="px-6 py-4">
                                  <div className="flex items-center gap-3">
                                    <div className="flex-shrink-0">
                                      <div className="w-8 h-8 bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 rounded-full flex items-center justify-center">
                                        <span className="text-sm font-semibold text-green-700 dark:text-green-300">
                                          {employee.full_name.charAt(0).toUpperCase()}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <span
                                        className="text-gray-900 dark:text-white font-medium text-sm truncate block"
                                        dangerouslySetInnerHTML={{ __html: insertLineBreak(employee.full_name) }}
                                      />
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell className="px-6 py-4">
                                  <div className="flex items-center gap-2">
                                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                    <span
                                      className="text-gray-600 dark:text-gray-300 text-sm block truncate max-w-[200px] cursor-help"
                                      title={employee.email}
                                    >
                                      {truncateEmail(employee.email, 20)}
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell className="px-6 py-4">
                                  <button
                                    onClick={() => openAppointmentModal(employee)}
                                    className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border shadow whitespace-nowrap bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-200 transition-colors cursor-pointer"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    {employee.appointment_count || 0} Appointments
                                  </button>
                                </TableCell>
                                <TableCell className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                                  <div className="flex items-center gap-2">
                                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                    </svg>
                                    {employee.phone}
                                  </div>
                                </TableCell>
                                <TableCell className="px-6 py-4">
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                                    {employee.department}
                                  </span>
                                </TableCell>
                                <TableCell className="px-6 py-4 text-center">
                                  <div className="flex items-center gap-2 justify-center">
                                    <button
                                      onClick={() => openEmployeeBookModal(employee)}
                                      className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/20 transition-all duration-200 hover:scale-110"
                                      title="Book appointment"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                      </svg>
                                    </button>
                                    <button
                                      title="Send email"
                                      className="p-1 sm:p-1.5 lg:p-2 rounded-full text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/20 transition-colors min-h-[32px] min-w-[32px] flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                                      onClick={() => handleResendCredentials(employee.email)}
                                      disabled={resendingEmail === employee.email}
                                    >
                                      {resendingEmail === employee.email ? (
                                        <FaSpinner className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 animate-spin" />
                                      ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-mail w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5" aria-hidden="true">
                                          <path d="m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7"></path>
                                          <rect x="2" y="4" width="20" height="16" rx="2"></rect>
                                        </svg>
                                      )}
                                    </button>
                                    <button
                                      className="inline-flex items-center justify-center px-3 py-2 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-300 dark:hover:border-blue-700 transition-all duration-200 shadow-sm hover:shadow-md rounded-md text-sm font-medium"
                                      onClick={() => setShowDeleteSingleModal({ open: true, emp_id: employee.emp_id })}
                                      title="Delete employee"
                                    >
                                      <FaTrash className="w-3 h-3" />
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
                  label="employees"
                />
              </div>
            </div>
          )}
        </React.Fragment>
      )}
      {activeTab === 'knowledgebase' && (
        <div className="space-y-6">

          {/* Enhanced Knowledge Base Content */}
          <div className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-white/80 via-green-50/30 to-emerald-50/30 dark:from-gray-800/80 dark:via-green-900/10 dark:to-emerald-900/10 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-700/50"></div>
            <div className="relative z-10 p-6">
              <EmployeePage />
            </div>
          </div>
        </div>
      )}
      {activeTab === 'faq' && (
        <div className="space-y-6">
          {/* Enhanced FAQ Control Bar */}
          <div className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-white/80 via-blue-50/50 to-indigo-50/80 dark:from-gray-800/80 dark:via-blue-900/20 dark:to-indigo-900/20 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-700/50"></div>
            <div className="relative z-10 p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">FAQ Management</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {faqFiles.length} FAQ file{faqFiles.length !== 1 ? 's' : ''} found
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = '.csv,text/csv';
                      input.onchange = async (e) => {
                        const file = (e.target as HTMLInputElement).files?.[0];
                        if (!file) return;

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
                          setAlert({ show: true, variant: 'success', title: 'FAQ CSV Uploaded', message: (res?.message || 'Uploaded') + (res?.key ? ' (' + res.key + ')' : '') });
                          setTimeout(() => setAlert(a => ({ ...a, show: false })), 3000);
                          await refreshFaqFiles();
                        } catch (err) {
                          const msg = err instanceof Error ? err.message : 'Upload failed';
                          setAlert({ show: true, variant: 'error', title: 'Upload Failed', message: msg });
                          setTimeout(() => setAlert(a => ({ ...a, show: false })), 2000);
                        }
                      };
                      input.click();
                    }}
                  >
                    <FaUpload className="w-4 h-4" />
                    Upload FAQ CSV
                  </Button>

                  <Button
                    className="flex items-center gap-2 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 shadow-sm hover:shadow-md"
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
                      link.download = 'employee_faq_template.csv';
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      URL.revokeObjectURL(url);
                    }}
                  >
                    <FaDownload className="w-4 h-4" />
                    Download Template
                  </Button>

                  <Button
                    className="flex items-center gap-2 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 shadow-sm hover:shadow-md"
                    variant="outline"
                    onClick={refreshFaqFiles}
                    disabled={faqListLoading}
                  >
                    {faqListLoading ? <Loader /> : <FaSync className="w-4 h-4" />}
                    {faqListLoading ? 'Refreshing...' : 'Refresh'}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced FAQ File Table */}
          <div className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-white/80 via-blue-50/30 to-indigo-50/30 dark:from-gray-800/80 dark:via-blue-900/10 dark:to-indigo-900/10 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-700/50"></div>
            <div className="relative z-10 overflow-x-auto">
              <Table className="border-collapse bg-transparent">
                <TableHeader>
                  <TableRow className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 border-b-2 border-gray-200 dark:border-gray-600">
                    <TableCell isHeader className="px-6 py-4 text-center">
                      <input
                        type="checkbox"
                        aria-label="Select all"
                        checked={isAllSelected}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                      />
                    </TableCell>
                    <TableCell isHeader className="px-6 py-4 font-semibold text-gray-700 dark:text-gray-200 text-start text-sm">Name</TableCell>
                    <TableCell isHeader className="px-6 py-4 font-semibold text-gray-700 dark:text-gray-200 text-start text-sm">Type</TableCell>
                    <TableCell isHeader className="px-6 py-4 font-semibold text-gray-700 dark:text-gray-200 text-start text-sm">Size</TableCell>
                    <TableCell isHeader className="px-6 py-4 font-semibold text-gray-700 dark:text-gray-200 text-start text-sm">Uploaded At</TableCell>
                    <TableCell isHeader className="px-6 py-4 font-semibold text-gray-700 dark:text-gray-200 text-start text-sm">Actions</TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {faqListLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center">
                          <Loader />
                          <span className="text-gray-500 dark:text-gray-400 mt-3 text-sm">Loading FAQ file...</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : faqFiles.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center">
                          <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mb-4">
                            <FaFileAlt className="text-purple-500 dark:text-purple-400" size={32} />
                          </div>
                          <span className="text-lg font-semibold text-gray-500 dark:text-gray-400 mb-2">
                            No FAQ file found
                          </span>
                          <span className="text-sm text-gray-400 dark:text-gray-500">
                            Upload some FAQ file to get started
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    faqFiles.map((f, idx) => (
                      <TableRow
                        key={`${f.key || f.filename || 'faq'}-${idx}`}
                        className={`hover:bg-blue-50/50 dark:hover:bg-gray-700/50 transition-all duration-200 ${idx % 2 === 0 ? 'bg-white/50 dark:bg-gray-800/50' : 'bg-gray-50/30 dark:bg-gray-700/30'
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
                        <TableCell className="px-6 py-4 text-start">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                              <FaFileAlt className="text-blue-600 dark:text-blue-400 w-4 h-4" />
                            </div>
                            <span className="text-blue-600 dark:text-blue-400 break-all font-medium">{f.filename}</span>
                          </div>
                        </TableCell>
                        <TableCell className="px-6 py-4 text-start">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                            {getFileTypeFromName(f.filename)}
                          </span>
                        </TableCell>
                        <TableCell className="px-6 py-4 text-gray-600 dark:text-gray-300 text-start text-sm">
                          {`${(f.size_bytes / 1024).toFixed(1)} KB`}
                        </TableCell>
                        <TableCell className="px-6 py-4 text-gray-600 dark:text-gray-300 text-start text-sm">
                          {new Date(f.last_modified).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </TableCell>
                        <TableCell className="px-6 py-4 text-start">
                          <Button
                            variant="outline"
                            className="border-red-300 dark:border-red-600 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-400 dark:hover:border-red-500 transition-all duration-200 shadow-sm hover:shadow-md"
                            onClick={() => setDeleteConfirm({ open: true, filename: f.filename })}
                          >
                            <FaTrash className="w-3 h-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'agent' && (
        <div className="space-y-6">
          {/* Agent Tab Content */}
          <div className="pb-8">
            {/* Enhanced Control Bar */}
            <div className="mb-8 mx-4 md:mx-6">
              <div className="bg-gradient-to-br from-white via-white to-gray-50/30 dark:from-gray-800 dark:via-gray-800 dark:to-gray-900/50 rounded-2xl p-6 shadow-xl border-0 overflow-hidden backdrop-blur-sm relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-full -translate-y-16 translate-x-16"></div>
                <div className="relative z-10">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                    {/* Search Section */}
                    <div className="flex-1 max-w-md">
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <FaSearch className="h-4 w-4 text-gray-400 group-focus-within:text-purple-500 transition-colors" />
                        </div>
                        <input
                          type="text"
                          value={agentSearchQuery}
                          onChange={(e) => setAgentSearchQuery(e.target.value)}
                          placeholder="Search by agent ID, name, email, or phone"
                          className="w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 shadow-sm"
                        />
                        {agentSearchQuery && (
                          <button
                            onClick={() => setAgentSearchQuery("")}
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
                      {/* Add Agent Button */}
                      <button
                        className="group relative overflow-hidden flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-lg hover:shadow-xl hover:shadow-purple-500/25 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-all duration-300 hover:-translate-y-1 transform hover:scale-105"
                        onClick={() => setShowAddAgentModal(true)}
                      >
                        <div className="absolute inset-0 bg-purple-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        <svg className="w-4 h-4 relative z-10 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        <span className="font-medium relative z-10">Add Agent</span>
                      </button>

                      {/* Refresh Button */}
                      <button
                        className="group relative overflow-hidden flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-lg hover:shadow-xl hover:shadow-purple-500/25 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-all duration-300 hover:-translate-y-1 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:scale-100"
                        onClick={fetchAgents}
                        disabled={agentsLoading}
                      >
                        <div className="absolute inset-0 bg-purple-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        <FaSync className={`w-4 h-4 relative z-10 group-hover:scale-110 transition-transform ${agentsLoading ? 'animate-spin' : ''}`} />
                        <span className="font-medium relative z-10">Refresh</span>
                      </button>

                      {/* Bulk Delete Button */}
                      {selectedAgentIds.length > 0 && (
                        <button
                          className="group relative overflow-hidden flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl shadow-lg hover:shadow-xl hover:shadow-red-500/25 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-all duration-300 hover:-translate-y-1 disabled:opacity-50"
                          onClick={() => setShowBulkDeleteAgentModal(true)}
                          disabled={deletingAgent}
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-red-400 to-red-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                          <FaTrash className="w-4 h-4 relative z-10 group-hover:scale-110 transition-transform" />
                          <span className="font-medium relative z-10">Delete Selected ({selectedAgentIds.length})</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Agents Table */}
            <div className="mx-4 md:mx-6">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                {agentsLoading ? (
                  <div className="p-12 text-center">
                    <Loader />
                    <p className="mt-4 text-gray-500 dark:text-gray-400">Loading agents...</p>
                  </div>
                ) : agents.length === 0 ? (
                  <div className="p-12 text-center">
                    <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <p className="text-gray-500 dark:text-gray-400">No agents found</p>
                    <button
                      onClick={() => setShowAddAgentModal(true)}
                      className="mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                    >
                      Add Your First Agent
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table className="min-w-full">
                      <TableHeader>
                        <TableRow className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 border-b border-gray-200 dark:border-gray-600">
                          <TableCell isHeader className="px-6 py-4 text-center">
                            <input
                              type="checkbox"
                              checked={allAgentsSelected}
                              onChange={handleSelectAllAgents}
                              className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500 dark:focus:ring-purple-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                            />
                          </TableCell>
                          <TableCell isHeader className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">
                            Agent ID
                          </TableCell>
                          <TableCell isHeader className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">
                            Name
                          </TableCell>
                          <TableCell isHeader className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">
                            Email
                          </TableCell>
                          <TableCell isHeader className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">
                            Phone
                          </TableCell>
                          <TableCell isHeader className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">
                            Department
                          </TableCell>
                          <TableCell isHeader className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">
                            Status
                          </TableCell>
                          <TableCell isHeader className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">
                            Active Sessions
                          </TableCell>
                          <TableCell isHeader className="px-6 py-4 text-center text-sm font-semibold text-gray-900 dark:text-white">
                            Actions
                          </TableCell>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {agents.map((agent) => (
                          <TableRow key={agent.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                            <TableCell className="px-6 py-4 text-center">
                              <input
                                type="checkbox"
                                checked={selectedAgentIds.includes(agent.agent_id)}
                                onChange={() => handleSelectOneAgent(agent.agent_id)}
                                className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500 dark:focus:ring-purple-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                              />
                            </TableCell>
                            <TableCell className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                              {agent.agent_id}
                            </TableCell>
                            <TableCell className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                                  {agent.name.charAt(0).toUpperCase()}
                                </div>
                                <span className="font-medium text-gray-900 dark:text-white">{agent.name}</span>
                              </div>
                            </TableCell>
                            <TableCell className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                              {truncateEmail(agent.email)}
                            </TableCell>
                            <TableCell className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                              {agent.phone}
                            </TableCell>
                            <TableCell className="px-6 py-4">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
                                {agent.department}
                              </span>
                            </TableCell>
                            <TableCell className="px-6 py-4">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${agent.status === 'active'
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
                                }`}>
                                {agent.status}
                              </span>
                            </TableCell>
                            <TableCell className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                              {agent.active_sessions} / {agent.max_concurrent_sessions}
                            </TableCell>
                            <TableCell className="px-6 py-4 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                  title="Edit"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => setShowDeleteAgentModal({ open: true, agentId: agent.agent_id })}
                                  className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                  title="Delete"
                                >
                                  <FaTrash className="w-4 h-4" />
                                </button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Add Agent Modal */}
          <Modal isOpen={showAddAgentModal} onClose={() => setShowAddAgentModal(false)}>
            <div className="relative overflow-hidden bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 max-w-2xl w-full mx-4">
              <div className="relative z-10 p-8">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">Add New Agent</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Create a new agent account</p>
                  </div>
                </div>

                <form onSubmit={(e) => { e.preventDefault(); createAgent(); }} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={agentFormData.name}
                      onChange={(e) => setAgentFormData({ ...agentFormData, name: e.target.value })}
                      className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="Enter agent name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={agentFormData.email}
                      onChange={(e) => setAgentFormData({ ...agentFormData, email: e.target.value })}
                      className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="Enter agent email"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Phone <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      value={agentFormData.phone}
                      onChange={(e) => setAgentFormData({ ...agentFormData, phone: e.target.value })}
                      className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="Enter phone number"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Department <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={agentFormData.department}
                      onChange={(e) => setAgentFormData({ ...agentFormData, department: e.target.value })}
                      className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="Enter department"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Max Concurrent Sessions
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={agentFormData.max_concurrent_sessions}
                      onChange={(e) => setAgentFormData({ ...agentFormData, max_concurrent_sessions: parseInt(e.target.value) || 5 })}
                      className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="Enter max concurrent sessions"
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowAddAgentModal(false)}
                      className="flex-1 px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={agentsLoading}
                      className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {agentsLoading ? (
                        <div className="flex items-center justify-center gap-2">
                          <FaSpinner className="w-4 h-4 animate-spin" />
                          Creating...
                        </div>
                      ) : (
                        'Create Agent'
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </Modal>

          {/* Delete Agent Confirmation Modal */}
          <Modal isOpen={showDeleteAgentModal.open} onClose={() => setShowDeleteAgentModal({ open: false, agentId: null })}>
            <div className="relative overflow-hidden bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 max-w-md w-full mx-4">
              <div className="relative z-10 p-8">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg">
                    <FaTrash className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">Delete Agent</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">This action cannot be undone</p>
                  </div>
                </div>
                <p className="text-gray-600 dark:text-gray-300 mb-6">
                  Are you sure you want to delete agent <span className="font-semibold text-red-600 dark:text-red-400">{showDeleteAgentModal.agentId}</span>?
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDeleteAgentModal({ open: false, agentId: null })}
                    className="flex-1 px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => showDeleteAgentModal.agentId && deleteAgent(showDeleteAgentModal.agentId)}
                    disabled={deletingAgent}
                    className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white shadow-lg hover:shadow-xl transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {deletingAgent ? (
                      <div className="flex items-center justify-center gap-2">
                        <FaSpinner className="w-4 h-4 animate-spin" />
                        Deleting...
                      </div>
                    ) : (
                      'Delete'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </Modal>

          {/* Bulk Delete Agents Confirmation Modal */}
          <Modal isOpen={showBulkDeleteAgentModal} onClose={() => setShowBulkDeleteAgentModal(false)}>
            <div className="relative overflow-hidden bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 max-w-md w-full mx-4">
              <div className="relative z-10 p-8">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg">
                    <FaTrash className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">Delete Agents</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">This action cannot be undone</p>
                  </div>
                </div>
                <p className="text-gray-600 dark:text-gray-300 mb-6">
                  Are you sure you want to delete <span className="font-semibold text-red-600 dark:text-red-400">{selectedAgentIds.length}</span> selected agent{selectedAgentIds.length !== 1 ? 's' : ''}?
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowBulkDeleteAgentModal(false)}
                    className="flex-1 px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={deleteAgentsBulk}
                    disabled={deletingAgent}
                    className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white shadow-lg hover:shadow-xl transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {deletingAgent ? (
                      <div className="flex items-center justify-center gap-2">
                        <FaSpinner className="w-4 h-4 animate-spin" />
                        Deleting...
                      </div>
                    ) : (
                      `Delete ${selectedAgentIds.length} Agent${selectedAgentIds.length !== 1 ? 's' : ''}`
                    )}
                  </button>
                </div>
              </div>
            </div>
          </Modal>
        </div>
      )}

      {/* Enhanced Upload Confirmation Modal */}
      <Modal isOpen={showConfirmModal} onClose={handleCancelUpload}>
        <div className="relative overflow-hidden bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 max-w-md w-full mx-4">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 rounded-full -translate-y-16 translate-x-16"></div>
          <div className="relative z-10 p-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <FaUpload className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Confirm Upload</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Ready to upload your file</p>
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{selectedFile?.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {selectedFile ? `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB` : ''}
                  </p>
                </div>
              </div>
            </div>
            <p className="text-gray-600 dark:text-gray-300 text-sm mb-6">
              This will upload the file and process the employee data. Make sure the file contains the required columns: Employee ID, Name, Email, Phone, and Department.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleCancelUpload}
                className="flex-1 px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmUpload}
                disabled={uploading}
                className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Uploading...
                  </div>
                ) : (
                  'Upload File'
                )}
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Enhanced Delete Single Modal */}
      <Modal isOpen={showDeleteSingleModal.open} onClose={() => setShowDeleteSingleModal({ open: false, emp_id: null })}>
        <div className="relative overflow-hidden bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 max-w-md w-full mx-4">
          <div className="relative z-10 p-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg">
                <FaTrash className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Delete Employee</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">This action cannot be undone</p>
              </div>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 mb-6 border border-blue-200 dark:border-blue-800">
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-3 h-3 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-blue-800 dark:text-blue-200">Warning</p>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                    Are you sure you want to delete this employee? This action cannot be undone and will permanently remove all associated data.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteSingleModal({ open: false, emp_id: null })}
                className="flex-1 px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteSingle(showDeleteSingleModal.emp_id!)}
                disabled={deleting}
                className="flex-1 px-4 py-3 rounded-xl bg-blue-500 hover:bg-blue-600 text-white shadow-lg hover:shadow-xl transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleting ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Deleting...
                  </div>
                ) : (
                  'Delete Employee'
                )}
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Enhanced Add Employee Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)}>
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-gray-800 dark:to-gray-900"></div>
          <div className="relative z-10">
            <EmployeeDetailsForm onSuccess={async () => {
              setShowAddModal(false);
              await fetchAllEmployees();
              setAlert({ show: true, variant: 'success', title: 'Success!', message: 'Employee data added successfully!' });
              setTimeout(() => setAlert(a => ({ ...a, show: false })), 3000);
            }} />
          </div>
        </div>
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
      {/* Enhanced Download Modal */}
      <Modal isOpen={showDownloadModal} onClose={() => setShowDownloadModal(false)}>
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-gray-800 dark:to-gray-900"></div>
          <div className="relative z-10">
            <DownloadEmployeeTemplate
              form={downloadForm}
              setForm={setDownloadForm}
              onSubmit={handleDownload}
              loading={false}
            />
          </div>
        </div>
      </Modal>

      {/* Enhanced Delete FAQ File Modal */}
      <Modal isOpen={deleteConfirm.open} onClose={() => setDeleteConfirm({ open: false, filename: undefined })}>
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-red-50 to-pink-50 dark:from-gray-800 dark:to-gray-900"></div>
          <div className="relative z-10 p-6 max-w-full w-[90vw] sm:w-[400px]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-pink-600 rounded-xl flex items-center justify-center">
                <FaTrash className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Delete File</h3>
            </div>
            <p className="text-gray-700 dark:text-gray-300 mb-6">
              Are you sure you want to delete
              <span className="font-semibold text-red-600 dark:text-red-400"> {deleteConfirm.filename}</span>?
              <br />
              <span className="text-sm text-gray-500 dark:text-gray-400">This action cannot be undone.</span>
            </p>
            <div className="flex justify-end gap-3">
              <Button
                onClick={() => setDeleteConfirm({ open: false, filename: undefined })}
                variant="outline"
                className="px-4 py-2 rounded-xl border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200"
              >
                Cancel
              </Button>
              <Button
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
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
        </div>
      </Modal>
      <EmployeeUploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onUploadSuccess={async (msg) => {
          setShowUploadModal(false);
          if (msg && msg.startsWith('File downloaded:')) {
            setAlert({ show: true, variant: 'success', title: 'Download Successful!', message: msg });
            setTimeout(() => setAlert(a => ({ ...a, show: false })), 3000);
          } else if (msg && msg.includes('uploaded')) {
            setAlert({ show: true, variant: 'success', title: 'Upload Successful!', message: msg });
            await fetchAllEmployees();
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
      {/* Enhanced Bulk Delete Confirmation Modal */}
      <Modal isOpen={showBulkDeleteConfirm} onClose={() => setShowBulkDeleteConfirm(false)}>
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-red-50 to-pink-50 dark:from-gray-800 dark:to-gray-900"></div>
          <div className="relative z-10 p-6 max-w-full w-[90vw] sm:w-[400px]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-pink-600 rounded-xl flex items-center justify-center">
                <FaTrash className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Confirm Bulk Delete</h2>
            </div>
            <p className="text-gray-700 dark:text-gray-300 mb-6">
              Are you sure you want to delete
              <span className="font-semibold text-red-600 dark:text-red-400"> {selectedEmployeeIds.length}</span>
              selected employee{selectedEmployeeIds.length !== 1 ? 's' : ''}?
              <br />
              <span className="text-sm text-gray-500 dark:text-gray-400">This action cannot be undone.</span>
            </p>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setShowBulkDeleteConfirm(false)}
                className="px-4 py-2 rounded-xl border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200"
              >
                Cancel
              </Button>
              <Button
                variant="outline"
                className="px-4 py-2 rounded-xl border-red-300 dark:border-red-600 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-400 dark:hover:border-red-500 transition-all duration-200 shadow-sm hover:shadow-md"
                onClick={handleBulkDelete}
                disabled={deleting}
              >
                {deleting ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Employee Details Page Modal */}
      {showEmployeeDetails && selectedEmployeeForDetails && (
        <div
          className="fixed z-50 flex items-center justify-center"
          style={{
            position: 'fixed',
            top: 0,
            // Account for sidebar width: 290px when expanded/hovered, 90px when collapsed, 0 on mobile
            left: isMobileOpen ? '0' : (isExpanded || isHovered ? '290px' : '90px'),
            right: 0,
            bottom: 0,
            overflow: 'hidden'
          }}
        >
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => {
              setShowEmployeeDetails(false);
              setSelectedEmployeeForDetails(null);
            }}
          />
          <div
            className="relative z-10 h-full w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <EmployeeDetailsPage
              employeeId={selectedEmployeeForDetails.id}
              employeeName={selectedEmployeeForDetails.name}
              onBack={() => {
                setShowEmployeeDetails(false);
                setSelectedEmployeeForDetails(null);
              }}
            />
          </div>
        </div>
      )}

      {/* Appointment Modal */}
      {showAppointmentModal && selectedEmployee && (
        <div className="fixed inset-0 bg-black/10 backdrop-blur-[2px] flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <FaCalendarAlt className="w-6 h-6 text-blue-600" />
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Appointments for {selectedEmployee.full_name}
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {selectedEmployee.email}
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
              ) : employeeAppointments.length > 0 ? (
                <div className="space-y-4">
                  {employeeAppointments.map((appointment) => (
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
                          {appointment.message && (
                            <div className="flex items-start gap-2">
                              <span className="text-sm text-gray-600 dark:text-gray-400">Reason:</span>
                              <span className="text-sm text-gray-900 dark:text-white">
                                {appointment.message}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEditEmployeeAppointmentModal(appointment)}
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
                              : appointment.source === 'employee'
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
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
                    This employee doesn&apos;t have any appointments yet.
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

      {/* Book Employee Appointment Modal */}
      {showEmployeeBookModal && bookingEmployee && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Book employee appointment</h3>
                  <p className="text-xs text-gray-500">Employee: {bookingEmployee.full_name} • {bookingEmployee.email}</p>
                </div>
              </div>
              <button onClick={() => setShowEmployeeBookModal(false)} className="p-2 text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="p-5 grid grid-cols-1 gap-6">
              <div className="space-y-3">
                <label className="text-sm text-gray-600">Service</label>
                <select
                  value={empServiceId}
                  onChange={async (e) => { setEmpServiceId(e.target.value); const picked = empServices.find(s => s.id === e.target.value); setEmpServiceName(picked?.name || ''); await loadEmployeeSlots(e.target.value); setEmpSelectedDate(''); setEmpSelectedSlotId(''); setEmpDateSlots([]); }}
                  className="w-full border rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  {empServices.map(s => (<option key={s.id} value={s.id}>{s.name}</option>))}
                </select>

                <label className="text-sm text-gray-600">Select date</label>
                <input
                  readOnly
                  value={empSelectedDate || ''}
                  placeholder="Click to select date"
                  onClick={() => setEmpShowDatePicker(!empShowDatePicker)}
                  className="w-full border rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white cursor-pointer"
                />
                {empShowDatePicker && (
                  <div className="mt-2">
                    <VisualCalendar
                      onDateSelect={handleEmployeeDatePick}
                      availableDates={empAvailableDates}
                      selectedDate={empSelectedDate}
                      serviceName={empServiceName}
                      compact={true}
                    />
                  </div>
                )}
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-600">Available time slots</label>
                  <select
                    value={empSelectedSlotId}
                    onChange={(e) => setEmpSelectedSlotId(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="" disabled>{empSelectedDate ? 'Select a time slot' : 'Please select a date first'}</option>
                    {empDateSlots.map(s => (<option key={s.id} value={s.id}>{s.label}</option>))}
                  </select>
                </div>

                <div className="space-y-3 pt-2">
                  <div>
                    <label className="text-sm text-gray-600">Name *</label>
                    <div className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white">
                      {empName || bookingEmployee?.full_name || '-'}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Email *</label>
                    <div className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white">
                      {empEmail || bookingEmployee?.email || '-'}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Additional Notes</label>
                    <textarea value={empNotes} onChange={(e) => setEmpNotes(e.target.value)} rows={3} className="w-full border rounded-lg px-3 py-2 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white" placeholder="Any specific requirements or questions..." />
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <button onClick={submitEmployeeBooking} disabled={!empSelectedSlotId || empSubmitting} className={`flex-1 px-4 py-3 rounded-lg text-white font-semibold disabled:opacity-50 ${empSubmitting ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'}`}>{empSubmitting ? 'Booking…' : 'Book Appointment'}</button>
                  <button onClick={() => setShowEmployeeBookModal(false)} className="px-4 py-3 rounded-lg bg-gray-200 text-gray-700 font-semibold">Cancel</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Employee Appointment Modal */}
      {showEditEmployeeAppointmentModal && editingEmployeeAppointment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Edit appointment</h3>
                  <p className="text-xs text-gray-500">Service: {editingEmployeeAppointment.service_name}</p>
                </div>
              </div>
              <button onClick={() => setShowEditEmployeeAppointmentModal(false)} className="p-2 text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-5 grid grid-cols-1 gap-6">
              <div className="space-y-3">
                <label className="text-sm text-gray-600">Service</label>
                <div className="w-full border rounded-lg px-3 py-2 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white">
                  {editingEmployeeAppointment.service_name || 'N/A'}
                </div>

                <label className="text-sm text-gray-600">Select date</label>
                <input
                  readOnly
                  value={editEmpDate || ''}
                  placeholder="Click to select date"
                  onClick={() => !showEmpCancelReason && setEditEmpShowDatePicker(!editEmpShowDatePicker)}
                  disabled={showEmpCancelReason}
                  className={`w-full border rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${showEmpCancelReason ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                />
                {editEmpShowDatePicker && !showEmpCancelReason && (
                  <div className="mt-2">
                    <VisualCalendar
                      onDateSelect={handleEditEmployeeDatePick}
                      availableDates={editEmpAvailableDates}
                      selectedDate={editEmpDate}
                      serviceName={editingEmployeeAppointment.service_name}
                      compact={true}
                    />
                  </div>
                )}
              </div>
              <div className="space-y-4">
                {!showEmpCancelReason && (
                  <>
                    <div>
                      <label className="text-sm text-gray-600">Available time slots</label>
                      <select
                        value={editEmpSelectedSlotId}
                        onChange={(e) => setEditEmpSelectedSlotId(e.target.value)}
                        className="w-full border rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option value="" disabled>{editEmpDate ? 'Select a time slot' : 'Please select a date first'}</option>
                        {editEmpDateSlots.map((s: FormattedSlot) => (
                          <option key={s.id} value={s.id}>{s.label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-sm text-gray-600">Message/Notes</label>
                      <textarea
                        value={editEmpNotes}
                        onChange={(e) => setEditEmpNotes(e.target.value)}
                        rows={3}
                        className="w-full border rounded-lg px-3 py-2 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="Any additional notes..."
                      />
                    </div>
                  </>
                )}

                {showEmpCancelReason && (
                  <div>
                    <label className="text-sm text-gray-600">Cancellation Reason *</label>
                    <textarea
                      value={empCancelReason}
                      onChange={(e) => setEmpCancelReason(e.target.value)}
                      rows={3}
                      className="w-full border rounded-lg px-3 py-2 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="Please provide a reason for cancellation..."
                      required
                    />
                  </div>
                )}

                <div className="flex gap-2 pt-1">
                  {!showEmpCancelReason ? (
                    <>
                      <button
                        onClick={submitUpdateEmployeeAppointment}
                        disabled={!editEmpDate || !editEmpSelectedSlotId || editEmpSubmitting}
                        className={`flex-1 px-4 py-3 rounded-lg text-white font-semibold disabled:opacity-50 ${editEmpSubmitting ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'}`}
                      >
                        {editEmpSubmitting ? 'Updating…' : 'Update Appointment'}
                      </button>
                      <button
                        onClick={() => {
                          setShowEmpCancelReason(true);
                          setEditEmpShowDatePicker(false);
                        }}
                        className="px-4 py-3 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold"
                      >
                        Cancel Appointment
                      </button>
                      <button
                        onClick={() => setShowEditEmployeeAppointmentModal(false)}
                        className="px-4 py-3 rounded-lg bg-gray-200 text-gray-700 font-semibold"
                      >
                        Close
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={submitCancelEmployeeAppointment}
                        disabled={!empCancelReason.trim() || editEmpSubmitting}
                        className={`flex-1 px-4 py-3 rounded-lg text-white font-semibold disabled:opacity-50 ${editEmpSubmitting ? 'bg-red-400' : 'bg-red-600 hover:bg-red-700'}`}
                      >
                        {editEmpSubmitting ? 'Cancelling…' : 'Confirm Cancellation'}
                      </button>
                      <button
                        onClick={() => { setShowEmpCancelReason(false); setEmpCancelReason(''); }}
                        className="px-4 py-3 rounded-lg bg-gray-200 text-gray-700 font-semibold"
                      >
                        Back
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>            </div>
      )}
    </div>
  );
}

