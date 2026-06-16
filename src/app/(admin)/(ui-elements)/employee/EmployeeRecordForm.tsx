"use client";
import React, { useCallback, useEffect, useState } from "react";
import { FaSave, FaSpinner, FaDollarSign, FaClock, FaCalendar, FaUser } from "react-icons/fa";
import { useForm, type Resolver } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Modal } from "@/components/ui/modal";
import Alert from '@/components/ui/alert/Alert';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Form types
type RecordType = 'salary' | 'attendance' | 'leave' | 'project';

// Salary form schema
const salarySchema = z.object({
  basic_salary: z.number().min(0, "Basic salary must be positive"),
  allowances: z.number().min(0, "Allowances must be positive"),
  deductions: z.number().min(0, "Deductions must be positive"),
  month: z.string().min(1, "Month is required"),
  year: z.number().min(2020, "Year must be 2020 or later").max(2030, "Year must be 2030 or earlier"),
  status: z.enum(['pending', 'paid', 'cancelled']),
  payment_date: z.string().optional(),
});

// Attendance form schema
const attendanceSchema = z.object({
  date: z.string().min(1, "Date is required"),
  check_in: z.string().min(1, "Check-in time is required"),
  check_out: z.string().optional(),
  status: z.enum(['present', 'absent', 'late', 'half_day', 'leave']),
  notes: z.string().optional(),
});

// Leave form schema
const leaveSchema = z.object({
  leave_type: z.enum(['sick', 'vacation', 'personal', 'maternity', 'paternity', 'emergency']),
  start_date: z.string().min(1, "Start date is required"),
  end_date: z.string().min(1, "End date is required"),
  reason: z.string().min(1, "Reason is required"),
  status: z.enum(['pending', 'approved', 'rejected']),
});

// Project form schema (trimmed fields for add-new flow)
const projectSchema = z.object({
  project_name: z.string().min(1, "Project name is required"),
  customer_email: z.string().email("Valid customer email is required"),
  project_type: z.enum(['web_development', 'mobile_app', 'api_development', 'maintenance', 'consulting', 'custom_software']),
  employee_role: z.enum(['project_manager', 'team_member']),
  task: z.string().min(1, "Task name is required"),
  deadline: z.string().min(1, "Deadline is required"),
  status: z.enum(['PENDING', 'DELAY', 'COMPLETED']),
});


interface EmployeeRecordFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Record<string, unknown>) => void;
  recordType: RecordType;
  employeeId: string;
  employeeName: string;
  isLoading?: boolean;
  existingRecord?: Record<string, unknown> | null | undefined;
}

const EmployeeRecordForm: React.FC<EmployeeRecordFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  recordType,
  employeeId,
  employeeName,
  isLoading = false,
  existingRecord
}) => {
  const [alert, setAlert] = useState<{ show: boolean; variant: 'success' | 'error'; title: string; message: string }>({ 
    show: false, 
    variant: 'success', 
    title: '', 
    message: '' 
  });

  const isEditMode = !!existingRecord;


  // Get the appropriate schema based on record type
  const getSchema = () => {
    switch (recordType) {
      case 'salary': return salarySchema;
      case 'attendance': return attendanceSchema;
      case 'leave': return leaveSchema;
      case 'project': return projectSchema;
      default: return salarySchema;
    }
  };

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    watch,
    setValue
  } = useForm<Record<string, unknown>>({
    resolver: zodResolver(getSchema()) as unknown as Resolver<Record<string, unknown>>, 
    mode: "onChange",
    defaultValues: getDefaultValues()
  });

  // Customer email suggestion state (requires watch/setValue from useForm)
  const [customerEmails, setCustomerEmails] = useState<string[]>([]);
  const [customerSuggestions, setCustomerSuggestions] = useState<string[]>([]);
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);
  const [customerFetchError, setCustomerFetchError] = useState<string | null>(null);
  const watchedCustomerEmail = String(watch('customer_email') ?? '');
  const watchedProjectName = String(watch('project_name') ?? '');
  const [projectNames, setProjectNames] = useState<string[]>([]);
  const [projectNameSuggestions, setProjectNameSuggestions] = useState<string[]>([]);
  const [showProjectNameSuggestions, setShowProjectNameSuggestions] = useState(false);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [projectFetchMessage, setProjectFetchMessage] = useState<string | null>(null);
  const [lastFetchedCustomerEmail, setLastFetchedCustomerEmail] = useState<string | null>(null);

  const filterCustomerSuggestions = useCallback((value: string, emails: string[]) => {
    if (!value) {
      return emails.slice(0, 8);
    }
    const lowerValue = value.toLowerCase();
    return emails.filter((email) => email.toLowerCase().includes(lowerValue)).slice(0, 8);
  }, []);

  const fetchCustomerEmails = useCallback(async () => {
    try {
      const RAW_BASE_URL = process.env.NEXT_PUBLIC_API_URL;
      if (!RAW_BASE_URL) {
        throw new Error('NEXT_PUBLIC_API_URL environment variable is not set');
      }
      const BASE_URL = RAW_BASE_URL.replace(/\/+$/, '');
      setIsLoadingCustomers(true);
      setCustomerFetchError(null);

      const collected = new Set<string>();
      const size = 100;
      let page = 1;
      let totalPages = 1;

      do {
        const response = await fetch(`${BASE_URL}/api/v1/customers/?page=${page}&size=${size}`, {
          method: 'GET',
          headers: { accept: 'application/json' },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch customers');
        }

        const data = await response.json();
        const customers = Array.isArray(data.data) ? data.data : [];
        customers.forEach((customer: Record<string, unknown>) => {
          const email = (customer.email ?? '').toString().trim();
          if (email) collected.add(email);
        });

        totalPages = Number(data.total_pages) || 1;
        page += 1;
      } while (page <= totalPages);

      setCustomerEmails(Array.from(collected).sort());
    } catch (error) {
      console.error('Error fetching customer emails:', error);
      setCustomerFetchError('Unable to load customer list. Please try again later.');
    } finally {
      setIsLoadingCustomers(false);
    }
  }, []);

  const handleCustomerEmailInput = useCallback((value: string) => {
    if (customerEmails.length === 0) {
      setCustomerSuggestions([]);
      setShowCustomerSuggestions(false);
      return;
    }
    const filtered = filterCustomerSuggestions(value, customerEmails);
    setCustomerSuggestions(filtered);
    setShowCustomerSuggestions(filtered.length > 0);
  }, [customerEmails, filterCustomerSuggestions]);

  const selectCustomerSuggestion = useCallback((email: string) => {
    setValue('customer_email', email, { shouldDirty: true, shouldValidate: true });
    setShowCustomerSuggestions(false);
  }, [setValue]);

  const handleProjectNameInput = useCallback((value: string) => {
    if (projectNames.length === 0) {
      setProjectNameSuggestions([]);
      setShowProjectNameSuggestions(false);
      return;
    }
    const normalized = value ? value.toLowerCase() : '';
    const filtered = projectNames
      .filter((name) => name.toLowerCase().includes(normalized))
      .slice(0, 8);
    setProjectNameSuggestions(filtered);
    setShowProjectNameSuggestions(filtered.length > 0);
  }, [projectNames]);

  const selectProjectNameSuggestion = useCallback((name: string) => {
    setValue('project_name', name, { shouldDirty: true, shouldValidate: true });
    setShowProjectNameSuggestions(false);
  }, [setValue]);

  const fetchProjectsForCustomer = useCallback(async (email: string) => {
    try {
      const RAW_BASE_URL = process.env.NEXT_PUBLIC_API_URL;
      if (!RAW_BASE_URL) {
        throw new Error('NEXT_PUBLIC_API_URL environment variable is not set');
      }
      const BASE_URL = RAW_BASE_URL.replace(/\/+$/, '');
      setIsLoadingProjects(true);
      setProjectFetchMessage(null);

      const response = await fetch(`${BASE_URL}/api/v1/projects/?customer_email=${encodeURIComponent(email)}&page=1&size=1000`, {
        method: 'GET',
        headers: { accept: 'application/json' },
      });

      if (!response.ok) {
        if (response.status === 404) {
          setProjectNames([]);
          setProjectFetchMessage('No projects found for this customer.');
        } else {
          throw new Error('Failed to fetch projects');
        }
        setLastFetchedCustomerEmail(email.toLowerCase());
        return;
      }

      const data = await response.json();
      const projects = Array.isArray(data.data) ? data.data : [];
      if (projects.length === 0) {
        setProjectNames([]);
        setProjectFetchMessage('No projects found for this customer.');
      } else {
        const names = projects
          .map((project: Record<string, unknown>) => (project.project_name ?? '').toString().trim())
          .filter((name: string) => name.length > 0);
        setProjectNames(names);
        setProjectFetchMessage(null);
      }
      setLastFetchedCustomerEmail(email.toLowerCase());
    } catch (error) {
      console.error('Error fetching customer projects:', error);
      setProjectNames([]);
      setProjectFetchMessage('Unable to load projects for this customer.');
      setLastFetchedCustomerEmail(email.toLowerCase());
    } finally {
      setIsLoadingProjects(false);
    }
  }, []);

  useEffect(() => {
    if (recordType === 'project' && customerEmails.length === 0 && !isLoadingCustomers) {
      fetchCustomerEmails();
    }
  }, [recordType, fetchCustomerEmails, customerEmails.length, isLoadingCustomers]);

  useEffect(() => {
    if (recordType === 'project') {
      return;
    }
    setProjectNames([]);
    setProjectNameSuggestions([]);
    setShowProjectNameSuggestions(false);
    setProjectFetchMessage(null);
    setIsLoadingProjects(false);
    setLastFetchedCustomerEmail(null);
  }, [recordType]);

  useEffect(() => {
    if (recordType !== 'project') {
      return;
    }

    const trimmedEmail = watchedCustomerEmail.trim();

    if (!trimmedEmail) {
      setProjectNames([]);
      setProjectNameSuggestions([]);
      setShowProjectNameSuggestions(false);
      setProjectFetchMessage(null);
      setIsLoadingProjects(false);
      setLastFetchedCustomerEmail(null);
      return;
    }

    if (!EMAIL_REGEX.test(trimmedEmail)) {
      setProjectNames([]);
      setProjectNameSuggestions([]);
      setShowProjectNameSuggestions(false);
      setProjectFetchMessage('Enter a valid customer email to view projects.');
      setIsLoadingProjects(false);
      setLastFetchedCustomerEmail(null);
      return;
    }

    const matchedEmail = customerEmails.find(
      (email) => email.toLowerCase() === trimmedEmail.toLowerCase()
    );

    if (!matchedEmail) {
      setProjectNames([]);
      setProjectNameSuggestions([]);
      setShowProjectNameSuggestions(false);
      setProjectFetchMessage('No customer found with this email.');
      setIsLoadingProjects(false);
      setLastFetchedCustomerEmail(null);
      return;
    }

    if (lastFetchedCustomerEmail === matchedEmail.toLowerCase()) {
      return;
    }

    fetchProjectsForCustomer(matchedEmail);
  }, [
    recordType,
    watchedCustomerEmail,
    customerEmails,
    lastFetchedCustomerEmail,
    fetchProjectsForCustomer,
  ]);

  useEffect(() => {
    if (recordType !== 'project') {
      return;
    }
    if (projectNames.length === 0) {
      setProjectNameSuggestions([]);
      setShowProjectNameSuggestions(false);
      return;
    }
    handleProjectNameInput(watchedProjectName);
  }, [recordType, projectNames, watchedProjectName, handleProjectNameInput]);

  function getDefaultValues() {
    if (existingRecord) {
      type ExistingRecord = Record<string, unknown> & {
        basic_salary?: number;
        allowances?: number;
        deductions?: number;
        month?: string;
        year?: number;
        status?: string;
        payment_date?: string;
        date?: string;
        check_in?: string;
        check_out?: string;
        notes?: string;
        leave_type?: string;
        start_date?: string;
        end_date?: string;
        reason?: string;
      };
      const rec = existingRecord as ExistingRecord;
      switch (recordType) {
        case 'salary':
          return {
            basic_salary: rec.basic_salary || 0,
            allowances: rec.allowances || 0,
            deductions: rec.deductions || 0,
            month: rec.month || '',
            year: rec.year || new Date().getFullYear(),
            status: rec.status || 'pending',
            payment_date: rec.payment_date || '',
          };
        case 'attendance':
          return {
            date: rec.date ? String(rec.date).split('T')[0] : '',
            check_in: rec.check_in || '',
            check_out: rec.check_out || '',
            status: rec.status || 'present',
            notes: rec.notes || '',
          };
        case 'leave':
          return {
            leave_type: rec.leave_type || 'personal',
            start_date: rec.start_date ? String(rec.start_date).split('T')[0] : '',
            end_date: rec.end_date ? String(rec.end_date).split('T')[0] : '',
            reason: rec.reason || '',
            status: rec.status || 'pending',
          };
        default:
          return {};
      }
    }

    // Default values for new records
    switch (recordType) {
      case 'salary':
        return {
          basic_salary: 0,
          allowances: 0,
          deductions: 0,
          month: new Date().toLocaleString('default', { month: 'long' }),
          year: new Date().getFullYear(),
          status: 'pending',
          payment_date: '',
        };
      case 'attendance':
        return {
          date: new Date().toISOString().split('T')[0],
          check_in: '09:00',
          check_out: '',
          status: 'present',
          notes: '',
        };
      case 'leave':
        return {
          leave_type: 'personal',
          start_date: new Date().toISOString().split('T')[0],
          end_date: new Date().toISOString().split('T')[0],
          reason: '',
          status: 'pending',
        };
      default:
        return {};
    }
  }

  // Calculate net salary for salary form
  const watchedBasicSalary = Number(watch('basic_salary') ?? 0);
  const watchedAllowances = Number(watch('allowances') ?? 0);
  const watchedDeductions = Number(watch('deductions') ?? 0);
  const netSalary = watchedBasicSalary + watchedAllowances - watchedDeductions;

  // Calculate leave days for leave form
  const watchedStartDate = watch('start_date');
  const watchedEndDate = watch('end_date');
  const leaveDays = watchedStartDate && watchedEndDate ? 
    Math.ceil((new Date(String(watchedEndDate)).getTime() - new Date(String(watchedStartDate)).getTime()) / (1000 * 60 * 60 * 24)) + 1 : 0;

  const handleFormSubmit = async (data: Record<string, unknown>) => {
    try {
      // Add calculated fields
      if (recordType === 'salary') {
        data.net_salary = netSalary;
      } else if (recordType === 'leave') {
        data.days = leaveDays;
      }

      await onSubmit(data);
      reset();
      onClose();
    } catch (error) {
      setAlert({
        show: true,
        variant: 'error',
        title: 'Error',
        message: error instanceof Error ? error.message : 'An error occurred'
      });
      setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 3000);
    }
  };

  const getTitle = () => {
    const action = isEditMode ? 'Edit' : 'Add';
    switch (recordType) {
      case 'salary': return `${action} Salary Record`;
      case 'attendance': return `${action} Attendance Record`;
      case 'leave': return `${action} Leave Record`;
      default: return `${action} Record`;
    }
  };

  const getIcon = () => {
    switch (recordType) {
      case 'salary': return <FaDollarSign className="w-6 h-6" />;
      case 'attendance': return <FaClock className="w-6 h-6" />;
      case 'leave': return <FaCalendar className="w-6 h-6" />;
      default: return <FaUser className="w-6 h-6" />;
    }
  };

  const renderSalaryForm = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Basic Salary ($)
          </label>
          <input
            {...register('basic_salary', { valueAsNumber: true })}
            type="number"
            min="0"
            step="0.01"
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter basic salary"
          />
          {errors.basic_salary && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{String(errors.basic_salary?.message ?? '')}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Allowances ($)
          </label>
          <input
            {...register('allowances', { valueAsNumber: true })}
            type="number"
            min="0"
            step="0.01"
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter allowances"
          />
          {errors.allowances && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{String(errors.allowances?.message ?? '')}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Deductions ($)
          </label>
          <input
            {...register('deductions', { valueAsNumber: true })}
            type="number"
            min="0"
            step="0.01"
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter deductions"
          />
          {errors.deductions && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{String(errors.deductions?.message ?? '')}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Net Salary ($)
          </label>
          <input
            type="text"
            value={netSalary.toFixed(2)}
            readOnly
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-600 text-gray-900 dark:text-white"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Month
          </label>
          <select
            {...register('month')}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="January">January</option>
            <option value="February">February</option>
            <option value="March">March</option>
            <option value="April">April</option>
            <option value="May">May</option>
            <option value="June">June</option>
            <option value="July">July</option>
            <option value="August">August</option>
            <option value="September">September</option>
            <option value="October">October</option>
            <option value="November">November</option>
            <option value="December">December</option>
          </select>
          {errors.month && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{String(errors.month?.message ?? '')}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Year
          </label>
          <input
            {...register('year', { valueAsNumber: true })}
            type="number"
            min="2020"
            max="2030"
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter year"
          />
          {errors.year && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{String(errors.year?.message ?? '')}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Status
          </label>
          <select
            {...register('status')}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="cancelled">Cancelled</option>
          </select>
          {errors.status && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{String(errors.status?.message ?? '')}</p>
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Payment Date
        </label>
        <input
          {...register('payment_date')}
          type="date"
          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {errors.payment_date && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{String(errors.payment_date?.message ?? '')}</p>
        )}
      </div>
    </div>
  );

  const renderAttendanceForm = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Date
          </label>
          <input
            {...register('date')}
            type="date"
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {errors.date && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{String(errors.date?.message ?? '')}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Status
          </label>
          <select
            {...register('status')}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="present">Present</option>
            <option value="absent">Absent</option>
            <option value="late">Late</option>
            <option value="half_day">Half Day</option>
            <option value="leave">Leave</option>
          </select>
          {errors.status && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{String(errors.status?.message ?? '')}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Check In Time
          </label>
          <input
            {...register('check_in')}
            type="time"
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {errors.check_in && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{String(errors.check_in?.message ?? '')}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Check Out Time
          </label>
          <input
            {...register('check_out')}
            type="time"
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {errors.check_out && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{String(errors.check_out?.message ?? '')}</p>
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Notes
        </label>
        <textarea
          {...register('notes')}
          rows={3}
          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter any additional notes..."
        />
        {errors.notes && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{String(errors.notes?.message ?? '')}</p>
        )}
      </div>
    </div>
  );

  const renderLeaveForm = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Leave Type
          </label>
          <select
            {...register('leave_type')}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="sick">Sick Leave</option>
            <option value="vacation">Vacation</option>
            <option value="personal">Personal</option>
            <option value="maternity">Maternity</option>
            <option value="paternity">Paternity</option>
            <option value="emergency">Emergency</option>
          </select>
          {errors.leave_type && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{String(errors.leave_type?.message ?? '')}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Status
          </label>
          <select
            {...register('status')}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
          {errors.status && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{String(errors.status?.message ?? '')}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Start Date
          </label>
          <input
            {...register('start_date')}
            type="date"
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {errors.start_date && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{String(errors.start_date?.message ?? '')}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            End Date
          </label>
          <input
            {...register('end_date')}
            type="date"
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {errors.end_date && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{String(errors.end_date?.message ?? '')}</p>
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Total Days: {leaveDays}
        </label>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Reason
        </label>
        <textarea
          {...register('reason')}
          rows={3}
          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter reason for leave..."
        />
        {errors.reason && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{String(errors.reason?.message ?? '')}</p>
        )}
      </div>
    </div>
  );

  const renderProjectForm = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Customer Email
          </label>
          <div className="relative">
            <input
              {...register('customer_email', {
                onChange: (event) => handleCustomerEmailInput(event.target.value),
              })}
              type="email"
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Search customer email (e.g., customer@example.com)"
              autoComplete="off"
              onFocus={() => {
                if (customerEmails.length > 0) {
                  handleCustomerEmailInput(watchedCustomerEmail);
                }
              }}
              onBlur={() => {
                setTimeout(() => setShowCustomerSuggestions(false), 150);
              }}
            />
            {isLoadingCustomers && (
              <div className="absolute inset-y-0 right-3 flex items-center text-xs text-gray-500">
                Loading...
              </div>
            )}
            {showCustomerSuggestions && customerSuggestions.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {customerSuggestions.map((email) => (
                  <div
                    key={email}
                    className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-sm text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      selectCustomerSuggestion(email);
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
                      </svg>
                      <span className="truncate">{email}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          {errors.customer_email && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{String(errors.customer_email?.message ?? '')}</p>
          )}
          {!errors.customer_email && watchedCustomerEmail && !EMAIL_REGEX.test(watchedCustomerEmail) && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">Please enter a valid email address</p>
          )}
          {customerFetchError && (
            <p className="mt-1 text-sm text-yellow-600 dark:text-yellow-400">{customerFetchError}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Project Name
          </label>
          <div className="relative">
            <input
              {...register('project_name', {
                onChange: (event) => handleProjectNameInput(event.target.value),
              })}
              type="text"
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter project name"
              autoComplete="off"
              onFocus={() => {
                if (projectNames.length > 0) {
                  handleProjectNameInput(watchedProjectName);
                }
              }}
              onBlur={() => {
                setTimeout(() => setShowProjectNameSuggestions(false), 150);
              }}
            />
            {isLoadingProjects && (
              <div className="absolute inset-y-0 right-3 flex items-center text-xs text-gray-500">
                Loading...
              </div>
            )}
            {showProjectNameSuggestions && projectNameSuggestions.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {projectNameSuggestions.map((name: string) => (
                  <div
                    key={name}
                    className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-sm text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      selectProjectNameSuggestion(name);
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h10" />
                      </svg>
                      <span className="truncate">{name}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        {errors.project_name && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{String(errors.project_name?.message ?? '')}</p>
          )}
        {!errors.project_name && !isLoadingProjects && projectFetchMessage && (
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{projectFetchMessage}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Project Type
          </label>
          <select
            {...register('project_type')}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="select_project_type">Select Project Type</option>
            <option value="web_development">Web Development</option>
            <option value="mobile_app">Mobile App</option>
            <option value="api_development">API Development</option>
            <option value="maintenance">Maintenance</option>
            <option value="consulting">Consulting</option>
            <option value="custom_software">Custom Software</option>
          </select>
        {errors.project_type && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{String(errors.project_type?.message ?? '')}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Task
          </label>
          <input
            {...register('task')}
            type="text"
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter task name"
          />
        {errors.task && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{String(errors.task?.message ?? '')}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Deadline
          </label>
          <input
            {...register('deadline')}
            type="date"
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        {errors.deadline && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{String(errors.deadline?.message ?? '')}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Status
          </label>
          <select
            {...register('status')}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="PENDING">PENDING</option>
            <option value="DELAY">DELAY</option>
            <option value="COMPLETED">COMPLETED</option>
          </select>
        {errors.status && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{String(errors.status?.message ?? '')}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Employee Role
          </label>
          <select
            {...register('employee_role')}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="team_member">Team Member</option>
            <option value="project_manager">Project Manager</option>
          </select>
        {errors.employee_role && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{String(errors.employee_role?.message ?? '')}</p>
          )}
        </div>

        <div className="md:col-span-2">
          <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800">
            <p className="text-sm text-blue-700 dark:text-blue-200">
              Project status, timeline, and delivery tracking are now managed directly from the customer&apos;s order details. 
              Use this form to quickly associate the employee as a manager or team member for a project.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderForm = () => {
    switch (recordType) {
      case 'salary': return renderSalaryForm();
      case 'attendance': return renderAttendanceForm();
      case 'leave': return renderLeaveForm();
      case 'project': return renderProjectForm();
      default: return null;
    }
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose}>
        <div className="relative overflow-hidden max-w-4xl w-full max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-2xl">

          <div className="relative p-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-500 rounded-2xl flex items-center justify-center shadow-lg">
                  {getIcon()}
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
                    {getTitle()}
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400">
                    {employeeName} - {employeeId}
                  </p>
                </div>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-8">
              <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border border-gray-200 dark:border-gray-600 rounded-2xl p-6 shadow-lg">
                {renderForm()}
              </div>

              {/* Action Buttons */}
              <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border border-gray-200 dark:border-gray-600 rounded-2xl p-6 shadow-lg">
                <div className="flex justify-end gap-4">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-8 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || isLoading}
                    className="px-8 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isSubmitting || isLoading ? (
                      <>
                        <FaSpinner className="w-4 h-4 animate-spin" />
                        {isEditMode ? 'Updating...' : 'Creating...'}
                      </>
                    ) : (
                      <>
                        <FaSave className="w-4 h-4" />
                        {isEditMode ? 'Update Record' : 'Create Record'}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>

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
          </div>
        </div>
      </Modal>
    </>
  );
};

export default EmployeeRecordForm;
