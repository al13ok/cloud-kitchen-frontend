"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import DatePicker from "@/components/form/date-picker";
import Alert from "@/components/ui/alert/Alert";
import { Modal } from "@/components/ui/modal";
import Badge from "@/components/ui/badge/Badge";
import Pagination from "@/components/tables/Pagination";
import Button from "@/components/ui/button/Button";
import { Dropdown } from "@/components/ui/dropdown/Dropdown";
import { DropdownItem } from "@/components/ui/dropdown/DropdownItem";
import DashboardHeader from '@/components/header/DashboardHeader';
import { Settings, Mail, Clock } from 'lucide-react';
const weekDays = [
  "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"
];
type DashboardSettingRow = {
  id?: string;
  email: string;
  dashboardType: string;
  frequency: string;
  time: string;
  schedule_value?: string;
  timezone?: string;
  timezone_offset?: string;
};
interface DateDropdownInputProps {
  value?: string;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
}
const DateDropdownInput = React.forwardRef<HTMLButtonElement, DateDropdownInputProps>(
  function DateDropdownInput(
    props: DateDropdownInputProps,
    ref: React.ForwardedRef<HTMLButtonElement>
  ) {
    const { value, onClick } = props;
    return (
      <button
        type="button"
        onClick={onClick}
        ref={ref}
        className="border border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 p-2 xs:p-3 rounded-lg w-full transition outline-none mt-1 text-left bg-white dark:bg-gray-800 flex items-center justify-between text-sm xs:text-base text-gray-900 dark:text-white"
      >
        <span>{value || "Select Date"}</span>
        <svg className="w-4 h-4 ml-2 text-gray-400 dark:text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
      </button>
    );
  }
);
DateDropdownInput.displayName = "DateDropdownInput";
function getEmailError(email: string) {
  if (!email) return "Email is required.";
  if (email.length > 250) return "Oops! That email's too long — the limit is 250 characters.";
  // No spaces allowed
  if (/\s/.test(email)) return "Email cannot contain spaces.";
  // Basic structure
  const parts = email.split("@");
  if (parts.length !== 2) return "Email must contain a single '@' symbol.";
  const [local, domain] = parts;
  // Local part checks
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._%+-]*[a-zA-Z0-9]$/.test(local) || local.length < 2)
    return "Local part must start and end with a letter or number and be at least 2 characters.";
  if (local.includes("..")) return "Local part cannot have consecutive dots.";
  if (local.startsWith(".") || local.endsWith(".")) return "Local part cannot start or end with a dot.";
  // Domain checks
  if (!/^[a-zA-Z0-9.-]+$/.test(domain)) return "Domain contains invalid characters.";
  if (domain.includes("..")) return "Domain cannot have consecutive dots.";
  if (!domain.includes(".")) return "Domain must contain a dot.";
  if (domain.startsWith("-") || domain.endsWith("-")) return "Domain cannot start or end with a hyphen.";
  if (domain.startsWith(".") || domain.endsWith(".")) return "Domain cannot start or end with a dot.";
  // TLD check
  const tld = domain.split(".").pop();
  if (!tld || tld.length < 2) return "Domain must end with a valid TLD (e.g., .com, .org).";
  // At least one letter in local and domain
  if (!/[a-zA-Z]/.test(local)) return "Local part must contain at least one letter.";
  if (!/[a-zA-Z]/.test(domain)) return "Domain must contain at least one letter.";
  // Gibberish check (optional)
  if (local.length > 8 && !/[aeiou]/i.test(local)) return "Email local part looks like gibberish.";
  // Regex for overall structure
  const emailRegex = /^[a-zA-Z0-9](?!.*?\.\.)[a-zA-Z0-9._%+-]{0,62}[a-zA-Z0-9]@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(email)) return "Please enter a valid email address.";
  // Common domain typo check for gmail
  const lowerEmail = email.toLowerCase();
  if (
    lowerEmail.endsWith("@gamil.com") ||
    lowerEmail.endsWith("@gmial.com") ||
    lowerEmail.endsWith("@gmal.com") ||
    lowerEmail.endsWith("@gmail.con") ||
    lowerEmail.endsWith("@gmail.co") ||
    lowerEmail.endsWith("@gmail.cmo")
  ) {
    return "Did you mean '@gmail.com'? Please check your email domain spelling.";
  }
  return "";
}
// Email validation utility function
function isValidEmail(email: string): boolean {
  if (email.length > 250) return false;
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
}
// Convert 24-hour time (HH:mm) to 12-hour format with AM/PM
function formatTimeWithAMPM(time24: string): string {
  if (!time24 || !time24.includes(':')) return time24;
  const [hours, minutes] = time24.split(':');
  const hour24 = parseInt(hours, 10);
  const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
  const ampm = hour24 >= 12 ? 'PM' : 'AM';
  return `${hour12.toString().padStart(2, '0')}:${minutes} ${ampm}`;
}
export default function DashboardSettingsPage() {
  const formRef = useRef<HTMLFormElement | null>(null);
  const [email, setEmail] = useState("");
  const [frequency, setFrequency] = useState("");
  const [hour, setHour] = useState("00");
  const [minute, setMinute] = useState("00");
  const [ampm, setAmpm] = useState("AM");
  const [, setTime] = useState("00:00");
  const [weekDay, setWeekDay] = useState(weekDays[0]);
  const [scheduleValue, setScheduleValue] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [calendarDate, setCalendarDate] = useState<Date | null>(null); // Used in monthly frequency selection
  const [intervalHours, setIntervalHours] = useState("0");
  const [intervalMinutes, setIntervalMinutes] = useState("0");
  const [timeError, setTimeError] = useState("");
  const [settings, setSettings] = useState<DashboardSettingRow[]>([]);
  const [emailError, setEmailError] = useState('');
  const [freqError, setFreqError] = useState('');
  const [dashboardType, setDashboardType] = useState("");
  
  // Add loading state to prevent double submissions
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sendingEmails, setSendingEmails] = useState<Set<string>>(new Set());
  
  // Toast state
  const [toast, setToast] = useState<{
    show: boolean;
    variant: "success" | "error" | "warning" | "info";
    title: string;
    message: string;
  }>({
    show: false,
    variant: "info",
    title: "",
    message: ""
  });
  // Delete confirmation modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [emailPendingDelete, setEmailPendingDelete] = useState<string | null>(null);
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  // Dropdown state
  const [isFrequencyOpen, setIsFrequencyOpen] = useState(false);
  const [isHourOpen, setIsHourOpen] = useState(false);
  const [isMinuteOpen, setIsMinuteOpen] = useState(false);
  const [isAmpmOpen, setIsAmpmOpen] = useState(false);
  const [isWeekDayOpen, setIsWeekDayOpen] = useState(false);
  const [isDashboardTypeOpen, setIsDashboardTypeOpen] = useState(false);
  const [isTimezoneOpen, setIsTimezoneOpen] = useState(false);
  const [isSettingTimezone, setIsSettingTimezone] = useState(false);
  const [timezoneSearchQuery, setTimezoneSearchQuery] = useState("");
  const dashboardTypes = React.useMemo(() => ([
    { value: "Overview", label: "Overview" },
    { value: "Chat", label: "Chat Dashboard" },
    { value: "Leads", label: "Leads Dashboard" },
    { value: "Job", label: "Job Dashboard" },
    { value: "Helpdesk", label: "Helpdesk Dashboard" },
    { value: "Employee", label: "Employee Dashboard" },
    { value: "Recruitment", label: "Recruitment Dashboard" }
  ]), []);
  const validFrequencies = ["daily", "weekly", "monthly", "hourly", "minutely", "interval"];
  // Timezone options fetched from backend endpoint
  type TimezoneOption = { value: string; label: string; offset?: string };
  const [timezones, setTimezones] = useState<TimezoneOption[]>([]);
  // Selected timezone value (matches backend expectation)
  const [timezone, setTimezone] = useState<string>("");
  // Map common IANA names to provided abbreviations when defaulting
  const ianaToAbbrevMap: Record<string, string> = {
    "Asia/Kolkata": "IST",
    "Europe/London": "GMT",
    "America/New_York": "EST",
    "America/Los_Angeles": "PST",
    "America/Chicago": "CST",
    "America/Denver": "MST",
    "Asia/Tokyo": "JST",
    "Europe/Berlin": "CET",
    "Europe/Bucharest": "EET"
  };
  // Fetch timezone options and default current timezone
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/dashboard/timezone-options`, {
          headers: { "accept": "application/json" }
        });
        const data = await res.json();
        if (Array.isArray(data?.timezones)) {
          setTimezones(data.timezones as TimezoneOption[]);
        }
        // Determine default timezone from current_timezone
        let detectedTz: string | undefined;
        const currentTz = data?.current_timezone;
        if (currentTz) {
          const fromIana = ianaToAbbrevMap[currentTz.timezone] || ianaToAbbrevMap[currentTz.timezone_name];
          if (fromIana) detectedTz = fromIana;
          if (!detectedTz && currentTz.offset && Array.isArray(data?.timezones)) {
            const matchByOffset = (data.timezones as TimezoneOption[]).find(t => t.offset === currentTz.offset);
            if (matchByOffset) detectedTz = matchByOffset.value;
          }
        }
        // Do not prefill timezone; keep placeholder until user selects
        setTimezone(prev => prev || "");
      } catch {
        // Silent fail; keep placeholder
        setTimezone(prev => prev || "");
      }
    })();
    // ianaToAbbrevMap is static; suppress exhaustive-deps for this effect
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // Filter timezones based on search query
  const filteredTimezones = React.useMemo(() => {
    if (!timezoneSearchQuery.trim()) {
      return timezones;
    }
    const query = timezoneSearchQuery.toLowerCase().trim();
    return timezones.filter(tz => 
      tz.label.toLowerCase().includes(query) ||
      tz.value.toLowerCase().includes(query) ||
      (tz.offset && tz.offset.includes(query))
    );
  }, [timezones, timezoneSearchQuery]);

  // Clear search when dropdown closes
  useEffect(() => {
    if (!isTimezoneOpen) {
      setTimezoneSearchQuery("");
    }
  }, [isTimezoneOpen]);

  // Handle timezone selection and persist to backend
  const handleTimezoneSelect = async (value: string) => {
    setTimezone(value);
    setIsTimezoneOpen(false);
    setTimezoneSearchQuery("");
    if (isSettingTimezone) return;
    setIsSettingTimezone(true);
    try {
      const selectedTz = (timezones as TimezoneOption[]).find(t => t.value === value);
      const payload: { timezone: string; timezone_offset?: string } = { timezone: value };
      if (selectedTz?.offset) payload.timezone_offset = selectedTz.offset;
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/dashboard/set-timezone`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify(payload)
      }).then(() => {}).catch(() => {});
    } finally {
      setIsSettingTimezone(false);
    }
  };
  // Day mapping for weekly frequency
  const dayMapping: { [key: string]: string } = {
    "Monday": "mon",
    "Tuesday": "tue", 
    "Wednesday": "wed",
    "Thursday": "thu",
    "Friday": "fri",
    "Saturday": "sat",
    "Sunday": "sun"
  };
  // Dashboard type -> Badge color mapping
  const getDashboardBadgeColor = (
    type: string
  ): "primary" | "success" | "error" | "warning" | "info" | "light" | "dark" => {
    const normalized = (type || "")
      .toLowerCase()
      .replace(/\s*dashboard\s*$/i, "")
      .trim();
    switch (normalized) {
      case "overview":
        return "primary"; // blue
      case "leads":
        return "warning"; // yellow
      case "job":
        return "error"; // red
      case "helpdesk":
        return "success"; // green
      case "chat":
        return "info"; // light blue
      case "employee":
        return "dark"; // distinct for employee
      default:
        return "light"; // neutral
    }
  };
  // Function to show toast
  const showToast = (variant: "success" | "error" | "warning" | "info", title: string, message: string) => {
    setToast({
      show: true,
      variant,
      title,
      message
    });
  };
  // Function to hide toast
  const hideToast = () => {
    setToast(prev => ({ ...prev, show: false }));
  };
  // Auto-hide toast after 3 seconds
  useEffect(() => {
    if (toast.show) {
      const timer = setTimeout(() => {
        hideToast();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toast.show]);

  // Delete modal helpers
  const openDeleteModal = (settingId: string) => {
    setEmailPendingDelete(settingId);
    setIsDeleteModalOpen(true);
  };
  const closeDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setEmailPendingDelete(null);
  };
  useEffect(() => {
    if (frequency === "weekly") setWeekDay(weekDays[0]);
    if (frequency === "monthly") setScheduleValue("");
    if (frequency === "interval") {
      setIntervalHours("0");
      setIntervalMinutes("0");
    }
    if (frequency !== "monthly") setCalendarDate(null);
    setFreqError("");
    setTimeError(""); // Clear time error when frequency changes
  }, [frequency]);
  const fetchSettings = useCallback(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/dashboard/dashboard-settings`)
      .then(res => res.json())
      .then(data => {
        const rows = Array.isArray(data.settings) ? data.settings : [];
        
        // Map MongoDB _id field to id for frontend compatibility
        const mappedRows = rows.map((row: Partial<DashboardSettingRow> & { _id?: string; id?: string }) => ({
          ...row,
          id: row._id || row.id // Map MongoDB _id to id
        }));
        
        // Show newest schedules first
        setSettings(mappedRows.slice().reverse());
        
        // DEBUG: Log the fetched data to see what dashboard types are available
        console.log('📥 Fetched Settings Data:', {
          totalSettings: mappedRows.length,
          settingsData: mappedRows,
          dashboardTypesFound: mappedRows.map((row: DashboardSettingRow) => ({
            id: row.id,
            email: row.email,
            dashboardType: row.dashboardType,
            dashboardTypeType: typeof row.dashboardType,
            dashboardTypeLabel: dashboardTypes.find(dt => dt.value === row.dashboardType)?.label
          }))
        });
      });
  }, [dashboardTypes]);
  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);
  useEffect(() => {
    const h = hour.padStart(2, '0');
    const m = minute.padStart(2, '0');
    setTime(`${h}:${m} ${ampm}`);
    setTimeError("");
  }, [hour, minute, ampm]);

  const handleSubmit = async (e: React.FormEvent | Event) => {
  if ('preventDefault' in e) {
    e.preventDefault();
  }
  
  // Prevent double submission
  if (isSubmitting) return;
  
  setIsSubmitting(true);
  setTimeError("");
  setEmailError("");
  setFreqError("");
  hideToast(); // Hide any existing toasts
  // Email validation
  const trimmedEmail = email.trim();
  const error = getEmailError(trimmedEmail);
  if (error) {
    setEmailError(error);
    setIsSubmitting(false);
    return;
  }
  setEmailError("");
  // Frequency-specific validation
  if (frequency === "weekly" && !weekDay) {
    setFreqError("Please select a day of the week.");
    setIsSubmitting(false);
    return;
  }
  if (frequency === "monthly" && !scheduleValue) {
    setFreqError("Please select a date for monthly frequency.");
    setIsSubmitting(false);
    return;
  }
  if (frequency === "interval" && (parseInt(intervalHours) === 0 && parseInt(intervalMinutes) === 0)) {
    setFreqError("Please set at least one hour or minute for interval frequency.");
    setIsSubmitting(false);
    return;
  }
  setFreqError("");
  if (["daily", "weekly", "monthly"].includes(frequency)) {
  }
  setTimeError("");
  try {
    // Convert 12-hour time to 24-hour format for backend
    let timeStr = "";
    if (["daily", "weekly", "monthly", "hourly"].includes(frequency)) {
      const hour24 = ampm === "PM" && hour !== "12" ? parseInt(hour) + 12 : 
                     ampm === "AM" && hour === "12" ? 0 : parseInt(hour);
      const minute24 = parseInt(minute);
      timeStr = `${hour24.toString().padStart(2, '0')}:${minute24.toString().padStart(2, '0')}`;
    }
    // Validate frequency against backend-accepted values
    if (!validFrequencies.includes(frequency)) {
      showToast("error", "Invalid Frequency", `Invalid frequency. Must be one of: ${validFrequencies.join(', ')}`);
      setIsSubmitting(false);
      return;
    }
    // Prepare scheduling parameters mapped to backend schema
    const scheduleParams: {
      to_email: string;
      dashboard_type: string;
      frequency: string;
      time_str?: string;
      day_of_week?: string;
      day_of_month?: number;
      interval_minutes?: number;
      interval_hours?: number;
      timezone?: string;
      [key: string]: string | number | undefined;
    } = {
      to_email: trimmedEmail,
      dashboard_type: dashboardType,
      frequency: frequency
    };
    // Add timing parameters only when required or when user has set them
    if (["daily", "weekly", "monthly", "hourly"].includes(frequency)) {
      scheduleParams.time_str = timeStr;
    } else if (frequency === "minutely") {
      // For minutely, no timing needed - backend handles it automatically
    } else if (frequency === "interval") {
      // For interval, only interval parameters are needed
      const intervalMins = parseInt(intervalMinutes) || 0;
      const intervalHrs = parseInt(intervalHours) || 0;
      if (intervalMins > 0) {
        scheduleParams.interval_minutes = intervalMins;
      }
      if (intervalHrs > 0) {
        scheduleParams.interval_hours = intervalHrs;
      }
    }
    if (frequency === "weekly") {
      scheduleParams.day_of_week = dayMapping[weekDay] || undefined;
    }
    if (frequency === "monthly" && scheduleValue) {
      const dayOfMonth = parseInt(scheduleValue.split('-')[2]);
      if (!isNaN(dayOfMonth)) {
        scheduleParams.day_of_month = dayOfMonth;
      }
    }
    // Always send timezone; backend may ignore or use it
    if (timezone) {
      scheduleParams.timezone = timezone;
      const selectedTz = (timezones as TimezoneOption[]).find(t => t.value === timezone);
      if (selectedTz?.offset) {
        scheduleParams.timezone_offset = selectedTz.offset;
      }
    }
    // Remove null/undefined values to avoid validation issues
    Object.keys(scheduleParams).forEach(key => {
      const value = (scheduleParams as Record<string, unknown>)[key];
      if (value === null || value === undefined) {
        delete (scheduleParams as Record<string, unknown>)[key];
      }
    });
    // Debug: Log the request payload
    console.log('Scheduling parameters:', scheduleParams);
    console.log('Time conversion:', { 
      original: `${hour}:${minute} ${ampm}`, 
      converted: timeStr,
      frequency: frequency 
    });
    console.log('Request body:', JSON.stringify(scheduleParams, null, 2));
    console.log('Request headers:', { "Content-Type": "application/json", "Accept": "application/json" });
    console.log('Frequency type:', frequency, 'Parameters count:', Object.keys(scheduleParams).length);
    
    // Validate request structure before sending
    if (!scheduleParams.to_email || !scheduleParams.dashboard_type || !scheduleParams.frequency) {
      console.error('Missing required fields:', { 
        to_email: !!scheduleParams.to_email, 
        dashboard_type: !!scheduleParams.dashboard_type, 
        frequency: !!scheduleParams.frequency 
      });
      showToast("error", "Validation Error", "Missing required fields: email, dashboard type, or frequency.");
      setIsSubmitting(false);
      return;
    }
    
    
    let scheduleRes: Response | undefined;
    try {
      scheduleRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/dashboard/schedule-email`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(scheduleParams),
      });
    } catch (networkError) {
      console.error('Network error:', networkError);
      showToast("error", "Network Error", "Failed to connect to the server. Please check if the backend is running.");
      setIsSubmitting(false);
      return;
    }
    console.log('Response status:', scheduleRes?.status, scheduleRes?.statusText);
    console.log('Response headers:', Object.fromEntries(scheduleRes?.headers.entries() || {}));
    let responseBodyText = "";
    let scheduleData: { message?: string; error?: string; detail?: string; id?: string } = {};
    
    // Try to get response as text first
    try {
      responseBodyText = await scheduleRes.text();
      console.log('Raw response text:', responseBodyText);
    } catch (textError) {
      console.error('Error reading response text:', textError);
      responseBodyText = "Failed to read response";
    }
    
    // Try to parse as JSON if possible
    try {
      if (responseBodyText && responseBodyText.trim()) {
        scheduleData = JSON.parse(responseBodyText);
        console.log('Parsed JSON response:', scheduleData);
      }
    } catch (parseError) {
      console.log('Response is not JSON:', responseBodyText);
      console.log('Parse error:', parseError);
      // Set scheduleData to empty object if parsing fails
      scheduleData = {};
    }
    if (!scheduleRes?.ok) {
      let detail = `Failed to schedule email. (Status: ${scheduleRes?.status} ${scheduleRes?.statusText})`;
      
      // Try to extract error details from different possible response formats
      if (scheduleData?.error) {
        detail = scheduleData.error;
      } else if (scheduleData?.detail) {
        detail = scheduleData.detail;
      } else if (scheduleData?.message) {
        detail = scheduleData.message;
      } else if (responseBodyText && responseBodyText.trim()) {
        detail = responseBodyText;
      }
      
      // Simple error logging without complex objects
      console.log(`Schedule failed: ${scheduleRes?.status} ${scheduleRes?.statusText}`);
      if (responseBodyText && responseBodyText.trim()) {
        console.log('Response:', responseBodyText);
      }
      
      // Show more specific error based on status code
      if (scheduleRes?.status === 422) {
        detail = detail || "Invalid request parameters. Please check your input.";
      } else if (scheduleRes?.status === 400) {
        detail = detail || "Invalid request format.";
      } else if (scheduleRes?.status === 500) {
        detail = detail || "Internal server error. Please try again later.";
      }
      
      // If backend rejects unknown field (e.g., timezone), retry once without it
      const shouldRetryWithoutTimezone =
        scheduleRes?.status === 422 &&
        (detail?.toLowerCase().includes("timezone") || responseBodyText?.toLowerCase().includes("timezone")) &&
        (scheduleParams as Record<string, unknown>)["timezone"] !== undefined;
      if (shouldRetryWithoutTimezone) {
        try {
          const retryParams: Record<string, unknown> = { ...scheduleParams };
          delete retryParams.timezone;
          const retryRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/dashboard/schedule-email`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Accept": "application/json"
            },
            body: JSON.stringify(retryParams),
          });
          if (retryRes.ok) {
            const retryText = await retryRes.text();
            try { JSON.parse(retryText); } catch {}
            showToast("success", "Success", "Your schedule has been saved successfully. Reports will be sent as configured.");
            fetchSettings();
            
            // Reset all form fields
            setEmail("");
            setFrequency("");
            setHour("00");
            setMinute("00");
            setAmpm("AM");
            setTime("00:00");
            setWeekDay(weekDays[0]);
            setScheduleValue("");
            setCalendarDate(null);
            setIntervalHours("0");
            setIntervalMinutes("0");
            setDashboardType("");
            setTimezone("");
            setEmailError("");
            setFreqError("");
            setTimeError("");
            
            // Close all dropdowns
            setIsFrequencyOpen(false);
            setIsHourOpen(false);
            setIsMinuteOpen(false);
            setIsAmpmOpen(false);
            setIsWeekDayOpen(false);
            setIsDashboardTypeOpen(false);
            setIsTimezoneOpen(false);
            
            // Reset form if formRef exists
            if (formRef.current) {
              formRef.current.reset();
            }
            
            setIsSubmitting(false);
            return;
          }
        } catch {}
      }
      showToast("error", "Error", "Error: Unable to save schedule. Please check your email configuration and try again.");
      setIsSubmitting(false);
      return;
    }
    if (scheduleData.error) {
      showToast("error", "Error", "Error: Unable to save schedule. Please check your email configuration and try again.");
        setIsSubmitting(false);
        return;
      }
    showToast("success", "Success", "Your schedule has been saved successfully. Reports will be sent as configured.");
    // Refresh the table after submit
    fetchSettings();
    
    // Reset all form fields
    setEmail("");
    setFrequency("");
    setHour("00");
    setMinute("00");
    setAmpm("AM");
    setTime("00:00");
    setWeekDay(weekDays[0]);
    setScheduleValue("");
    setCalendarDate(null);
    setIntervalHours("0");
    setIntervalMinutes("0");
    setDashboardType("");
    setTimezone("");
    setEmailError("");
    setFreqError("");
    setTimeError("");
    
    // Close all dropdowns
    setIsFrequencyOpen(false);
    setIsHourOpen(false);
    setIsMinuteOpen(false);
    setIsAmpmOpen(false);
    setIsWeekDayOpen(false);
    setIsDashboardTypeOpen(false);
    setIsTimezoneOpen(false);
    
    // Reset form if formRef exists
    if (formRef.current) {
      formRef.current.reset();
    }
    
    setIsSubmitting(false);
  } catch {
    showToast("error", "Error", "Error: Unable to save schedule. Please check your email configuration and try again.");
    setIsSubmitting(false);
  }
};
  // Helper for minute options: always show 00-59
  const getMinuteOptions = () => Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));
  // Real-time email validation
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    if (value.length >= 250) {
      setEmailError("Oops! That email's too long — the limit is 250 characters.");
    } else if (!isValidEmail(value)) {
      setEmailError('Please enter a valid email address.');
    } else {
      setEmailError('');
    }
  };
  // Validation state for disabling submit
  const isFormInvalid =
    !!emailError ||
    !!timeError ||
    !!freqError ||
    !isValidEmail(email.trim()) ||
    !dashboardType ||
    !frequency ||
    (frequency === 'monthly' && !scheduleValue) ||
    (frequency === 'weekly' && !weekDay) ||
    (frequency === 'interval' && (parseInt(intervalHours) === 0 && parseInt(intervalMinutes) === 0));
  const handleDelete = async (settingId: string) => {
    hideToast();
    
    // Debug: Log what we're about to delete
    console.log('🗑️ DELETE REQUEST:', {
      settingId: settingId,
      settingIdType: typeof settingId,
      settingIdLength: settingId?.length,
      isValidId: !!settingId && settingId.trim() !== '',
      endpoint: `${process.env.NEXT_PUBLIC_API_URL}/dashboard/dashboard-settings/${encodeURIComponent(settingId)}`
    });
    
    // Validate settingId before making request
    if (!settingId || settingId.trim() === '') {
      showToast("error", "Error", "Invalid setting ID. Cannot delete.");
      return;
    }
    
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/dashboard/dashboard-settings/${encodeURIComponent(settingId)}`, {
        method: 'DELETE',
        headers: { 'accept': 'application/json' },
      });
      let errorText = '';
      let data: { error?: string; message?: string; deleted_setting?: unknown; deleted_count?: number; jobs_removed?: number } = {};
      try {
        data = await res.json();
      } catch {
        errorText = await res.text();
      }
      if (!res.ok) {
        console.error('❌ DELETE FAILED:', {
          status: res.status,
          statusText: res.statusText,
          errorData: data,
          errorText: errorText,
          settingId: settingId
        });
        showToast("error", "Error", (data && data.error) || errorText || `Failed to delete setting. (Status: ${res.status})`);
        return;
      }
      // Show success message with details from API response
      const successMessage = data.message || "Successfully deleted dashboard setting and stopped scheduled email";
      showToast("success", "Success", successMessage);
      
      // Log the deletion details for debugging
      console.log('✅ DELETE SUCCESS:', {
        message: data.message,
        deleted_setting: data.deleted_setting,
        deleted_count: data.deleted_count,
        jobs_removed: data.jobs_removed,
        settingId: settingId
      });
      
      // Refresh the table
      fetchSettings();
    } catch (err: unknown) {
      console.error('💥 DELETE EXCEPTION:', {
        error: err,
        settingId: settingId,
        errorMessage: err instanceof Error ? err.message : 'Unknown error'
      });
      showToast("error", "Error", err instanceof Error ? err.message : 'An error occurred. Please try again later.');
    } finally {
      closeDeleteModal();
    }
  };

  // Edit functionality removed

  // Function to handle immediate mail sending
  const handleSendNow = async (row: DashboardSettingRow) => {
    hideToast();
    
    // Add unique row identifier to sending set to show loading state
    const uniqueRowId = `${row.email}_${row.dashboardType}_${row.frequency}_${row.time}_${row.schedule_value || 'default'}`;
    setSendingEmails(prev => new Set(prev).add(uniqueRowId));
    
    try {
      // Create a unique identifier for this specific row
      const uniqueRowId = `${row.email}_${row.dashboardType}_${row.frequency}_${row.time}_${row.schedule_value || 'default'}`;
      
      // Validate dashboard type before sending
      if (!row.dashboardType || row.dashboardType.trim() === '') {
        showToast("error", "Dashboard Type Error", "Dashboard type is missing for this row. Please check the data.");
        console.error('Dashboard type is missing:', row);
        return;
      }

      // CRITICAL DEBUG: Log the exact row data being processed
      console.log('🔍 CRITICAL DEBUG - Row Data Analysis:', {
        rowObject: row,
        dashboardTypeRaw: row.dashboardType,
        dashboardTypeTrimmed: row.dashboardType?.trim(),
        dashboardTypeLength: row.dashboardType?.length,
        dashboardTypeType: typeof row.dashboardType,
        allRowKeys: Object.keys(row),
        allRowValues: Object.values(row)
      });

      // Prepare the parameters for immediate sending
      const sendNowParams: Record<string, unknown> = {
        user_id: uniqueRowId, // Use unique combination as user_id for specific targeting
        to_email: row.email,
        dashboard_type: row.dashboardType.trim(), // Ensure clean value
        frequency: row.frequency,
        time_str: row.time,
        timezone: row.timezone,
        interval_minutes: 0,
        interval_hours: 0
      };

      // Add frequency-specific parameters
      if (row.frequency === 'weekly' && row.schedule_value) {
        (sendNowParams as Record<string, unknown>).day_of_week = row.schedule_value;
      }
      if (row.frequency === 'monthly' && row.schedule_value) {
        (sendNowParams as Record<string, unknown>).day_of_month = parseInt(row.schedule_value || '1');
      }
      if (row.frequency === 'interval' && row.schedule_value) {
        const [hours, minutes] = row.schedule_value.split(':');
        (sendNowParams as Record<string, unknown>).interval_hours = parseInt(hours || '0');
        (sendNowParams as Record<string, unknown>).interval_minutes = parseInt(minutes || '0');
      }

      console.log('Send Now Request:', sendNowParams);
      console.log('Row data being used:', {
        email: row.email,
        dashboardType: row.dashboardType,
        dashboardTypeValue: row.dashboardType,
        dashboardTypeLabel: dashboardTypes.find(dt => dt.value === row.dashboardType)?.label,
        frequency: row.frequency,
        time: row.time,
        timezone: row.timezone,
        schedule_value: row.schedule_value
      });
      console.log('Dashboard Type Debug:', {
        rawValue: row.dashboardType,
        typeOf: typeof row.dashboardType,
        isUndefined: row.dashboardType === undefined,
        isNull: row.dashboardType === null,
        isEmpty: row.dashboardType === '',
        dashboardTypes: dashboardTypes,
        foundMatch: dashboardTypes.find(dt => dt.value === row.dashboardType)
      });

      // FINAL VERIFICATION: Log exactly what will be sent to backend
      console.log('🚀 FINAL VERIFICATION - What will be sent to backend:', {
        finalDashboardType: sendNowParams.dashboard_type,
        finalDashboardTypeType: typeof sendNowParams.dashboard_type,
        finalDashboardTypeLength: String(sendNowParams.dashboard_type || '').length,
        completePayload: sendNowParams,
        payloadStringified: JSON.stringify(sendNowParams, null, 2)
      });

      // CRITICAL CHECK: Verify the data being sent matches what's displayed
      const tableRow = settings.find(r => r.email === row.email && r.dashboardType === row.dashboardType);
      console.log('🔍 CRITICAL CHECK - Table Row Verification:', {
        originalRow: row,
        foundInTable: tableRow,
        tableRowDashboardType: tableRow?.dashboardType,
        matches: tableRow?.dashboardType === row.dashboardType,
        allTableData: settings.map(r => ({ email: r.email, dashboardType: r.dashboardType }))
      });
      
      // Prefer ID-based endpoint when available
      const idBasedUrl = row.id ? `${process.env.NEXT_PUBLIC_API_URL}/dashboard/send-now/${encodeURIComponent(row.id)}` : null;
      const res = await fetch(idBasedUrl || `${process.env.NEXT_PUBLIC_API_URL}/dashboard/send-now`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        // If we have an id-based endpoint, backend already knows the setting; send minimal body
        body: idBasedUrl ? undefined : JSON.stringify(sendNowParams),
      });
      
      console.log('Send Now Response Status:', res.status, res.statusText);

      let errorText = '';
      let data: { 
        error?: string; 
        message?: string; 
        status?: string;
        unique_id?: string;
        to?: string;
        tracking?: {
          unique_id?: string;
          dashboard_data_snapshot?: unknown;
        };
      } = {};
      try {
        data = await res.json();
        console.log('Send Now Response Data:', data);
      } catch {
        errorText = await res.text();
        console.log('Send Now Response Text:', errorText);
      }

      if (!res.ok) {
        showToast("error", "Send Error", (data && data.error) || errorText || `Failed to send email immediately. (Status: ${res.status})`);
        return;
      }

      // Normalize backend message if needed (not displayed directly)
      (data.message || "").replace(/\(\s*ID\s*:[^)]+\)/gi, '').trim();
      
      // Log what was actually sent to backend
      console.log('✅ Email Sent Successfully:', {
        dashboard_type_requested: row.dashboardType,
        dashboard_type_sent_to_backend: sendNowParams.dashboard_type,
        email: row.email,
        backend_response: data
      });
      
      // Check if email was actually sent based on backend response
      if (data.status === 'sent' && data.to) {
        const dashboardTypeLabel = dashboardTypes.find(dt => dt.value === row.dashboardType)?.label || row.dashboardType;
        const message = `Email sent via ${dashboardTypeLabel}.`;
        showToast("success", "Email Sent", message);
        console.log('Email delivery confirmed by backend:', {
          status: data.status,
          to: data.to,
          dashboard_type_sent: row.dashboardType,
          dashboard_type_label: dashboardTypeLabel,
          unique_id: data.unique_id,
          tracking: data.tracking
        });
      } else {
        showToast("warning", "Email Status Unclear", "Backend responded but email delivery status is unclear. Check your email or contact support.");
        console.warn('Unclear email delivery status:', data);
      }
    } catch {
      showToast("error", "Error", 'An error occurred while sending the email. Please try again later.');
    } finally {
      // Remove unique row identifier from sending set
      const uniqueRowId = `${row.email}_${row.dashboardType}_${row.frequency}_${row.time}_${row.schedule_value || 'default'}`;
      setSendingEmails(prev => {
        const newSet = new Set(prev);
        newSet.delete(uniqueRowId);
        return newSet;
      });
    }
  };
  // Calculate pagination
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = settings.slice(startIndex, endIndex);
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

 

 

 

  const handlePageSizeChange = (newPageSize: number) => {
    setItemsPerPage(newPageSize);
    setCurrentPage(1); 
  };
  // Removed unused helper to satisfy linter (no-unused-vars)
  return (
    <>
      {/* Toast Notifications */}
      {toast.show && (
        <div className="fixed top-2 xs:top-4 right-2 xs:right-4 z-[999999] max-w-xs xs:max-w-sm" style={{zIndex: 999999}}>
          <div className="relative">
            <Alert
              variant={toast.variant}
              title={toast.title}
              message={toast.message}
            />
            <button
              onClick={hideToast}
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
      
      {/* Main Container */}
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md w-full p-2 xs:p-3 sm:p-4 md:p-6 lg:p-8 max-w-full mx-auto min-h-screen">
        {/* Delete Confirmation Modal */}
        <Modal isOpen={isDeleteModalOpen} onClose={closeDeleteModal} className="max-w-md sm:max-w-lg">
          <div className="p-6 sm:p-8">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Delete Dashboard Setting</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-1">Are you sure you want to delete this dashboard setting?</p>
            <p className="text-red-600 dark:text-red-400 text-sm mb-6">This action will permanently remove the setting and stop any scheduled emails.</p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={closeDeleteModal}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={() => emailPendingDelete && handleDelete(emailPendingDelete)}
                className="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        </Modal>
        <style jsx>{`
          .custom-scrollbar::-webkit-scrollbar {
            width: 6px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: #f1f5f9;
            border-radius: 4px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: #cbd5e1;
            border-radius: 4px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: #94a3b8;
          }
          .custom-scrollbar {
            scrollbar-width: thin;
            scrollbar-color: #cbd5e1 #f1f5f9;
          }
          
          /* Mobile-first responsive table */
          @media (max-width: 768px) {
            .mobile-table { display: block; }
            .desktop-table { display: none; }
          }
          
          @media (min-width: 769px) {
            .mobile-table { display: none; }
            .desktop-table { display: block; }
          }
        `}</style>
        {/* Professional Header */}
        <div className="px-6 py-8">
          <DashboardHeader
            variant="default"
            size="lg"
            title="Email Reports & Notification Settings"
            subtitle="Configure when and how admins receive automated reports and notifications by email"
            breadcrumbs={[
              { label: 'Home', href: '/' },
              { label: 'Controls Settings', href: '/controls-dashboard-settings' }
            ]}
            icon={() => (
              <div className="relative">
                <Settings className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full animate-ping"></div>
            </div>
              </div>
            )}
            actions={
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 bg-white/10 rounded-full text-white text-xs sm:text-sm">
                    <Mail className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">Scheduled Delivery</span>
                    <span className="sm:hidden">Scheduled</span>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 bg-white/10 rounded-full text-white text-xs sm:text-sm">
                    <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">Smart Automation</span>
                    <span className="sm:hidden">Automation</span>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 bg-emerald-500/20 rounded-full text-emerald-300 text-xs sm:text-sm">
                    <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-emerald-400 rounded-full"></div>
                    <span className="hidden sm:inline">Live</span>
                    <span className="sm:hidden">●</span>
                  </div>
                </div>
                </div>
            }
          />
              </div>
        
        {/* Responsive Form */}
        <form ref={formRef} onSubmit={handleSubmit} className="space-y-3 xs:space-y-4 sm:space-y-6 mb-4 xs:mb-6 sm:mb-8">
          {/* Required Fields Note */}
          <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">
            <span className="text-red-500"></span> 
          </div>
          
          {/* Form Fields Grid - Ultra Responsive */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4 lg:gap-6 items-end">
            
            {/* Email Field */}
            <div className="relative col-span-1 sm:col-span-2 lg:col-span-2 xl:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <span className="inline-flex items-center gap-1">
                  Recipient Email <span className="text-red-500">*</span>
                  <span title="Enter email addresses. Please ensure emails are valid." className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-gray-200 text-gray-600 cursor-help">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                      <path d="M9.09 9a3 3 0 115.82 1c0 2-3 2-3 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <circle cx="12" cy="17" r="1" fill="currentColor"/>
                    </svg>
                  </span>
                </span>
              </label>
              <input
                type="text"
                required
                value={email}
                maxLength={250}
                onChange={handleEmailChange}
                onBlur={e => {
                  const error = getEmailError(e.target.value.trim());
                  setEmailError(error);
                }}
                placeholder="Enter recipient email"
                className={`border ${emailError ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} focus:border-blue-500 focus:ring-2 focus:ring-blue-100 p-3 rounded-lg w-full transition outline-none text-sm h-12 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400`}
              />
              {emailError && (
                <span className="absolute left-0 top-full mt-1 text-red-500 text-xs bg-white dark:bg-gray-800 px-1 pointer-events-none z-10 max-w-full break-words">
                  {emailError}
                </span>
              )}
            </div>
            {/* Dashboard Type Field */}
            <div className="relative col-span-1 sm:col-span-1 lg:col-span-1 xl:col-span-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <span className="inline-flex items-center gap-1">
                  Dashboard <span className="text-red-500">*</span>
                  <span
                    title="Select a dashboard to view relevant data and insights."
                    className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-gray-200 text-gray-600 cursor-help"
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                      <path d="M9.09 9a3 3 0 115.82 1c0 2-3 2-3 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <circle cx="12" cy="17" r="1" fill="currentColor"/>
                    </svg>
                  </span>
                </span>
              </label>
              <button
                type="button"
                onClick={() => setIsDashboardTypeOpen(!isDashboardTypeOpen)}
                className="border border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 p-3 rounded-lg w-full transition outline-none bg-white dark:bg-gray-800 flex items-center justify-between text-sm h-12 text-gray-900 dark:text-white"
              >
                <span className="truncate text-left text-gray-500 dark:text-gray-400">
                  {dashboardTypes.find(dt => dt.value === dashboardType)?.label || "Select your dashboard"}
                </span>
                <svg className="w-4 h-4 ml-2 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <Dropdown
                isOpen={isDashboardTypeOpen}
                onClose={() => setIsDashboardTypeOpen(false)}
              >
                {dashboardTypes.map(dt => (
                  <DropdownItem key={dt.value} onClick={() => { setDashboardType(dt.value); setIsDashboardTypeOpen(false); }}>
                    {dt.label}
                  </DropdownItem>
                ))}
              </Dropdown>
            </div>
            {/* Frequency Field */}
            <div className="relative col-span-1 sm:col-span-1 lg:col-span-1 xl:col-span-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <span className="inline-flex items-center gap-1">
                  Schedule <span className="text-red-500">*</span>
                  <span title="Choose how often this report should be sent automatically." className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-gray-200 text-gray-600 cursor-help">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                      <path d="M9.09 9a3 3 0 115.82 1c0 2-3 2-3 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <circle cx="12" cy="17" r="1" fill="currentColor"/>
                    </svg>
                  </span>
                </span>
              </label>
              <button
                type="button"
                onClick={() => setIsFrequencyOpen(!isFrequencyOpen)}
                className="border border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 p-3 rounded-lg w-full transition outline-none bg-white dark:bg-gray-800 flex items-center justify-between text-sm h-12 text-gray-900 dark:text-white"
              >
                <span className="truncate text-gray-500 dark:text-gray-400">
                  {frequency ? (frequency.charAt(0).toUpperCase() + frequency.slice(1)) : 'Select your schedule'}
                </span>
                <svg className="w-4 h-4 ml-2 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <Dropdown
                isOpen={isFrequencyOpen}
                onClose={() => setIsFrequencyOpen(false)}
              >
                <DropdownItem onClick={() => { setFrequency("daily"); setIsFrequencyOpen(false); }}>Daily</DropdownItem>
                <DropdownItem onClick={() => { setFrequency("weekly"); setIsFrequencyOpen(false); }}>Weekly</DropdownItem>
                <DropdownItem onClick={() => { setFrequency("monthly"); setIsFrequencyOpen(false); }}>Monthly</DropdownItem>
                <DropdownItem onClick={() => { setFrequency("hourly"); setIsFrequencyOpen(false); }}>Hourly</DropdownItem>
                <DropdownItem onClick={() => { setFrequency("minutely"); setIsFrequencyOpen(false); }}>Minutely</DropdownItem>
                <DropdownItem onClick={() => { setFrequency("interval"); setIsFrequencyOpen(false); }}>Interval</DropdownItem>
              </Dropdown>
              {freqError && <span className="text-red-500 text-xs mt-1 block">{freqError}</span>}
            </div>
            
            {/* Time Field - Always visible but optional for all frequencies */}
            <div className="relative col-span-1 sm:col-span-1 lg:col-span-1 xl:col-span-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Time
              </label>
              <div className="flex gap-1 h-12">
                {/* Hour */}
                <div className="relative flex-1">
                  <button
                    type="button"
                    onClick={() => setIsHourOpen(!isHourOpen)}
                    className={`border ${timeError ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} focus:border-blue-500 focus:ring-2 focus:ring-blue-100 p-2 rounded-lg w-full transition outline-none bg-white dark:bg-gray-800 flex items-center justify-between text-sm h-full text-gray-900 dark:text-white`}
                  >
                    {hour.padStart(2, '0')}
                    <svg className="w-4 h-4 ml-1 text-gray-400 dark:text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  <Dropdown
                    isOpen={isHourOpen}
                    onClose={() => setIsHourOpen(false)}
                    className="max-h-32 xs:max-h-40 overflow-y-auto custom-scrollbar"
                  >
                    {Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0')).map(h => (
                      <DropdownItem key={h} onClick={() => { setHour(h); setIsHourOpen(false); }}>{h}</DropdownItem>
                    ))}
                  </Dropdown>
                </div>
                
                <span className="self-center text-gray-500 dark:text-gray-400 font-medium text-sm">:</span>
                
                {/* Minute */}
                <div className="relative flex-1">
                  <button
                    type="button"
                    onClick={() => setIsMinuteOpen(!isMinuteOpen)}
                    className={`border ${timeError ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} focus:border-blue-500 focus:ring-2 focus:ring-blue-100 p-2 rounded-lg w-full transition outline-none bg-white dark:bg-gray-800 flex items-center justify-between text-sm h-full text-gray-900 dark:text-white`}
                  >
                    {minute.padStart(2, '0')}
                    <svg className="w-4 h-4 ml-1 text-gray-400 dark:text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  <Dropdown
                    isOpen={isMinuteOpen}
                    onClose={() => setIsMinuteOpen(false)}
                    className="max-h-32 xs:max-h-40 overflow-y-auto custom-scrollbar"
                  >
                    {getMinuteOptions().map(m => (
                      <DropdownItem key={m} onClick={() => { setMinute(m); setIsMinuteOpen(false); }}>{m}</DropdownItem>
                    ))}
                  </Dropdown>
                </div>
                
                {/* AM/PM */}
                <div className="relative flex-1">
                  <button
                    type="button"
                    onClick={() => setIsAmpmOpen(!isAmpmOpen)}
                    className={`border ${timeError ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} focus:border-blue-500 focus:ring-2 focus:ring-blue-100 p-2 rounded-lg w-full transition outline-none bg-white dark:bg-gray-800 flex items-center justify-between text-sm h-full text-gray-900 dark:text-white`}
                  >
                    {ampm || 'Meridiem'}
                    <svg className="w-4 h-4 ml-1 text-gray-400 dark:text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  <Dropdown
                    isOpen={isAmpmOpen}
                    onClose={() => setIsAmpmOpen(false)}
                    className="max-h-32 xs:max-h-40 overflow-y-auto custom-scrollbar"
                  >
                    {["AM", "PM"].map(ap => (
                      <DropdownItem key={ap} onClick={() => { setAmpm(ap); setIsAmpmOpen(false); }}>{ap}</DropdownItem>
                    ))}
                  </Dropdown>
                </div>
              </div>
              {timeError && <span className="text-red-500 text-xs mt-1 block">{timeError}</span>}
            </div>
            {/* Timezone Field */}
            <div className="relative col-span-1 sm:col-span-1 lg:col-span-1 xl:col-span-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Timezone
              </label>
              <button
                type="button"
                onClick={() => setIsTimezoneOpen(!isTimezoneOpen)}
                className="border border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 p-3 rounded-lg w-full transition outline-none bg-white dark:bg-gray-800 flex items-center justify-between text-sm h-12 text-gray-900 dark:text-white"
                title="Select timezone used for scheduling"
              >
                <span className="truncate text-left text-gray-500 dark:text-gray-400">
                  {timezones.find(tz => tz.value === timezone)?.label || 'Select your timezone'}
                </span>
                <svg className="w-4 h-4 ml-2 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <Dropdown
                isOpen={isTimezoneOpen}
                onClose={() => setIsTimezoneOpen(false)}
                className="max-h-56 w-full left-0 !right-auto overflow-y-auto custom-scrollbar"
              >
                {/* Search Input */}
                <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-2">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg
                        className="h-4 w-4 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                        />
                      </svg>
                    </div>
                    <input
                      type="text"
                      value={timezoneSearchQuery}
                      onChange={(e) => setTimezoneSearchQuery(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                      placeholder="Search timezone..."
                      className="block w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      autoFocus
                    />
                  </div>
                </div>
                {/* Timezone List */}
                <div className="max-h-48 overflow-y-auto custom-scrollbar">
                  {filteredTimezones.length > 0 ? (
                    filteredTimezones.map(tz => (
                      <DropdownItem key={tz.value} onClick={() => handleTimezoneSelect(tz.value)}>
                        <div className="flex flex-col">
                          <span className="text-sm">{tz.label}</span>
                          {tz.offset && (
                            <span className="text-xs text-gray-500 dark:text-gray-400">{tz.offset}</span>
                          )}
                        </div>
                      </DropdownItem>
                    ))
                  ) : (
                    <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 text-center">
                      No timezone found
                    </div>
                  )}
                </div>
              </Dropdown>
            </div>
            
            {/* Save Button */}
            <div className="flex items-end col-span-1 sm:col-span-2 lg:col-span-1 xl:col-span-1">
              <Button
                onClick={() => handleSubmit(new Event('submit'))}
                disabled={isFormInvalid || isSubmitting}
                variant="primary"
                size="md"
                className="w-full px-6 py-3 text-sm font-medium h-12"
              >
                {isSubmitting ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
          {/* Conditional Fields for Weekly/Monthly/Interval */}
          {(frequency === "weekly" || frequency === "monthly" || frequency === "interval") && (
            <div className="flex flex-col sm:flex-row gap-4">
              {frequency === "weekly" && (
                <div className="w-full sm:w-48">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Day of Week
                  </label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsWeekDayOpen(!isWeekDayOpen)}
                      className={`border ${freqError ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} focus:border-blue-500 focus:ring-2 focus:ring-blue-100 p-3 rounded-lg w-full transition outline-none bg-white dark:bg-gray-800 flex items-center justify-between text-sm h-12 text-gray-900 dark:text-white`}
                    >
                      {weekDay}
                      <svg className="w-4 h-4 ml-2 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    <Dropdown
                      isOpen={isWeekDayOpen}
                      onClose={() => setIsWeekDayOpen(false)}
                    >
                      {weekDays.map(day => (
                        <DropdownItem key={day} onClick={() => { setWeekDay(day); setIsWeekDayOpen(false); }}>
                          {day}
                        </DropdownItem>
                      ))}
                    </Dropdown>
                  </div>
                  {freqError && <span className="text-red-500 text-xs mt-1">{freqError}</span>}
                </div>
              )}
              
              {frequency === "monthly" && (
                <div className="w-full sm:w-48">
                  <DatePicker
                    id="monthly-date"
                    label="Date"
                    placeholder="Select date"
                    mode="single"
                    onChange={(selectedDates) => {
                      if (selectedDates && selectedDates.length > 0) {
                        const date = selectedDates[0];
                        setCalendarDate(date);
                        setScheduleValue(date.toISOString().slice(0, 10));
                      }
                    }}
                  />
                  {freqError && <span className="text-red-500 text-xs mt-1">{freqError}</span>}
                </div>
              )}
              {frequency === "interval" && (
                <div className="flex flex-col gap-4">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Set custom interval for email delivery
                  </div>
                  <div className="flex gap-4">
                    <div className="w-full sm:w-24">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Hours
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="23"
                        value={intervalHours}
                        onChange={(e) => setIntervalHours(e.target.value)}
                        className="border border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 p-3 rounded-lg w-full transition outline-none text-sm h-12 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        placeholder="0"
                      />
                    </div>
                    <div className="w-full sm:w-24">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Minutes
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="59"
                        value={intervalMinutes}
                        onChange={(e) => setIntervalMinutes(e.target.value)}
                        className="border border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 p-3 rounded-lg w-full transition outline-none text-sm h-12 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </form>
        {/* Table Section Header */}
        <h2 className="text-xl sm:text-2xl font-sans text-gray-900 dark:text-white mt-6 sm:mt-8 mb-4 sm:mb-6">
          Saved Email Report & Notification Schedules
        </h2>
        
        {/* Desktop Table */}
        <div className="desktop-table overflow-x-auto rounded-2xl border border-gray-200 bg-white/70 backdrop-blur-sm shadow-sm dark:border-white/[0.06] dark:bg-white/[0.04]">
          <table className="min-w-full text-sm text-left text-gray-900 dark:text-white">
            <thead className="sticky top-0 z-10 border-b border-gray-100 dark:border-white/[0.06] bg-gray-50/80 backdrop-blur-sm dark:bg-gray-800/80">
              <tr>
                <th className="px-3 sm:px-4 py-3 font-semibold text-gray-600 dark:text-gray-300 text-xs sm:text-sm">Recipient Email</th>
                <th className="px-3 sm:px-4 py-3 font-semibold text-gray-600 dark:text-gray-300 text-xs sm:text-sm">Dashboard</th>
                <th className="px-3 sm:px-4 py-3 font-semibold text-gray-600 dark:text-gray-300 text-xs sm:text-sm">Schedule</th>
                <th className="px-3 sm:px-4 py-3 font-semibold text-gray-600 dark:text-gray-300 text-xs sm:text-sm">Time</th>
                <th className="px-3 sm:px-4 py-3 font-semibold text-gray-600 dark:text-gray-300 text-xs sm:text-sm">Timezone</th>
                <th className="px-3 sm:px-4 py-3 font-semibold text-gray-600 dark:text-gray-300 text-center text-xs sm:text-sm">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/[0.06]">
                  {currentData.length > 0 ? (
                    currentData.map((row, index) => (
                  <tr
                    key={row.id || index}
                    className="odd:bg-white even:bg-slate-50/40 dark:odd:bg-white/[0.02] dark:even:bg-white/[0.04] hover:bg-indigo-50/40 dark:hover:bg-indigo-900/10 transition-colors hover:shadow-sm"
                  >
                    <td className="px-3 sm:px-4 py-3 font-medium text-gray-900 dark:text-white break-all">
                      <span className="inline-flex items-center gap-2">
                        <span className="inline-flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 text-xs font-semibold">
                          {row.email?.charAt(0)?.toUpperCase()}
                        </span>
                        <span className="text-xs sm:text-sm">{row.email}</span>
                      </span>
                    </td>
                    <td className="px-3 sm:px-4 py-3 text-gray-700 dark:text-gray-300">
                      <Badge size="sm" color={getDashboardBadgeColor(row.dashboardType || "")}> 
                        <span className="text-xs">{dashboardTypes.find(dt => dt.value === row.dashboardType)?.label || row.dashboardType}</span>
                      </Badge>
                    </td>
                    <td className="px-3 sm:px-4 py-3 text-gray-700 dark:text-gray-300">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${row.frequency === 'daily' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300' : row.frequency === 'weekly' ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300' : row.frequency === 'monthly' ? 'bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300' : 'bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-300'}`}>
                        {row.frequency ? row.frequency.charAt(0).toUpperCase() + row.frequency.slice(1) : '-'}
                      </span>
                    </td>
                    <td className="px-3 sm:px-4 py-3 text-gray-700 dark:text-gray-300 font-mono">
                      <span className="inline-flex items-center gap-1">
                        <svg className="w-3 h-3 sm:w-4 sm:h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                        <span className="text-xs sm:text-sm">{formatTimeWithAMPM(row.time)}</span>
                      </span>
                    </td>
                    <td className="px-3 sm:px-4 py-3 text-gray-700 dark:text-gray-300">
                      {row.timezone ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                          {timezones.find(tz => tz.value === row.timezone)?.label || row.timezone}
                        </span>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500 text-xs sm:text-sm">Not set</span>
                      )}
                    </td>
                    <td className="px-3 sm:px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1 sm:gap-2 w-full">
                        {/* Edit actions removed */}
                        <button
                          onClick={() => {
                            console.log('🎯 BUTTON CLICKED - Row Data:', {
                              email: row.email,
                              dashboardType: row.dashboardType,
                              dashboardTypeLabel: dashboardTypes.find(dt => dt.value === row.dashboardType)?.label,
                              fullRow: row
                            });
                            handleSendNow(row);
                          }}
                          disabled={sendingEmails.has(`${row.email}_${row.dashboardType}_${row.frequency}_${row.time}_${row.schedule_value || 'default'}`)}
                          className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-lg border border-gray-200 bg-white hover:bg-green-50 shadow-sm transition group disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Send this report immediately."
                          aria-label="Send Now"
                        >
                          {sendingEmails.has(`${row.email}_${row.dashboardType}_${row.frequency}_${row.time}_${row.schedule_value || 'default'}`) ? (
                            <svg className="animate-spin h-4 w-4 sm:h-5 sm:w-5 text-green-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                          ) : (
                            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-green-500 group-hover:text-green-600 sm:w-5 sm:h-5">
                              <path fillRule="evenodd" clipRule="evenodd" d="M3.0415 7.06206V14.375C3.0415 14.6511 3.26536 14.875 3.5415 14.875H16.4582C16.7343 14.875 16.9582 14.6511 16.9582 14.375V7.06245L11.1441 11.1168C10.4568 11.5961 9.54348 11.5961 8.85614 11.1168L3.0415 7.06206ZM16.9582 5.19262C16.9582 5.19341 16.9582 5.1942 16.9582 5.19498V5.20026C16.957 5.22216 16.9458 5.24239 16.9277 5.25501L10.2861 9.88638C10.1143 10.0062 9.88596 10.0062 9.71412 9.88638L3.0723 5.25485C3.05318 5.24151 3.04178 5.21967 3.04177 5.19636C3.04176 5.15695 3.0737 5.125 3.1131 5.125H16.8869C16.925 5.125 16.9562 5.15494 16.9582 5.19262ZM18.4582 5.21428V14.375C18.4582 15.4796 17.5627 16.375 16.4582 16.375H3.5415C2.43693 16.375 1.5415 15.4796 1.5415 14.375V5.19498C1.5415 5.1852 1.54169 5.17546 1.54206 5.16577C1.55834 4.31209 2.25546 3.625 3.1131 3.625H16.8869C17.7546 3.625 18.4582 4.32843 18.4583 5.19622C18.4583 5.20225 18.4582 5.20826 18.4582 5.21428Z" fill="currentColor" />
                            </svg>
                          )}
                        </button>
                      <button
                            onClick={() => openDeleteModal(row.id || row.email)}
                        className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-lg border border-gray-200 bg-white hover:bg-red-50 shadow-sm transition group"
                        title="Remove this schedule permanently."
                      >
                        <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-red-500 group-hover:text-red-600 sm:w-5 sm:h-5">
                          <path fillRule="evenodd" clipRule="evenodd" d="M6.54142 3.7915C6.54142 2.54886 7.54878 1.5415 8.79142 1.5415H11.2081C12.4507 1.5415 13.4581 2.54886 13.4581 3.7915V4.0415H15.6252H16.666C17.0802 4.0415 17.416 4.37729 17.416 4.7915C17.416 5.20572 17.0802 5.5415 16.666 5.5415H16.3752V8.24638V13.2464V16.2082C16.3752 17.4508 15.3678 18.4582 14.1252 18.4582H5.87516C4.63252 18.4582 3.62516 17.4508 3.62516 16.2082V13.2464V8.24638V5.5415H3.3335C2.91928 5.5415 2.5835 5.20572 2.5835 4.7915C2.5835 4.37729 2.91928 4.0415 3.3335 4.0415H4.37516H6.54142V3.7915ZM14.8752 13.2464V8.24638V5.5415H13.4581H12.7081H7.29142H6.54142H5.12516V8.24638V13.2464V16.2082C5.12516 16.6224 5.46095 16.9582 5.87516 16.9582H14.1252C14.5394 16.9582 14.8752 16.6224 14.8752 16.2082V13.2464ZM8.04142 4.0415H11.9581V3.7915C11.9581 3.37729 11.6223 3.0415 11.2081 3.0415H8.79142C8.37721 3.0415 8.04142 3.37729 8.04142 3.7915V4.0415ZM8.3335 7.99984C8.74771 7.99984 9.0835 8.33562 9.0835 8.74984V13.7498C9.0835 14.1641 8.74771 14.4998 8.3335 14.4998C7.91928 14.4998 7.5835 14.1641 7.5835 13.7498V8.74984C7.5835 8.33562 7.91928 7.99984 8.3335 7.99984ZM12.4168 8.74984C12.4168 8.33562 12.081 7.99984 11.6668 7.99984C11.2526 7.99984 10.9168 8.33562 10.9168 8.74984V13.7498C10.9168 14.1641 11.2526 14.4998 11.6668 14.4998C12.081 14.4998 12.4168 14.1641 12.4168 13.7498V8.74984Z" fill="currentColor" />
                        </svg>
                      </button>
                      </div>
                    </td>
                  </tr>
                    ))
                  ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-gray-400 dark:text-gray-500">
                      <div className="flex flex-col items-center gap-2">
                        <svg className="w-12 h-12 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                        </svg>
                        <span className="text-sm">No dashboard settings found</span>
                        <span className="text-xs text-gray-300 dark:text-gray-600">Create your first email schedule above</span>
                      </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {/* Mobile Table */}
        <div className="mobile-table space-y-4">
          {currentData.length > 0 ? (
            currentData.map((row, index) => (
              <div key={row.id || index} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-4 shadow-sm">
                {/* Header with Avatar and Email */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center flex-shrink-0">
                    <span className="text-gray-600 dark:text-gray-300 font-semibold text-base">
                      {row.email.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 dark:text-white text-base break-all">
                      {row.email}
                    </p>
                  </div>
                </div>
                
                {/* Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400 text-sm">Dashboard Type:</span>
                    <div className="mt-1">
                      <Badge size="sm" color={getDashboardBadgeColor(row.dashboardType || "")}>
                        <span className="text-xs">
                          {dashboardTypes.find(dt => dt.value === row.dashboardType)?.label || row.dashboardType}
                        </span>
                      </Badge>
                    </div>
                  </div>
                  
                  <div>
                    <span className="text-gray-500 dark:text-gray-400 text-sm">Frequency:</span>
                    <div className="mt-1">
                      <Badge
                        size="sm"
                        color={
                          row.frequency === "daily"
                            ? "success"
                            : row.frequency === "weekly"
                            ? "warning"
                            : "error"
                        }
                      >
                        <span className="text-xs">
                          {row.frequency ? row.frequency.charAt(0).toUpperCase() + row.frequency.slice(1) : "-"}
                        </span>
                      </Badge>
                    </div>
                  </div>
                  
                  <div>
                    <span className="text-gray-500 dark:text-gray-400 text-sm">Time:</span>
                    <p className="mt-1 text-gray-800 dark:text-white font-mono text-sm">{formatTimeWithAMPM(row.time)}</p>
                  </div>
                  
                  <div>
                    <span className="text-gray-500 dark:text-gray-400 text-sm">Timezone:</span>
                    <div className="mt-1">
                      {row.timezone ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                          {timezones.find(tz => tz.value === row.timezone)?.label || row.timezone}
                        </span>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500 text-sm">Not set</span>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="pt-3 border-t border-gray-100 dark:border-gray-700">
                  <div className="flex gap-3">
                    <Button
                      onClick={() => handleSendNow(row)}
                      disabled={sendingEmails.has(`${row.email}_${row.dashboardType}_${row.frequency}_${row.time}_${row.schedule_value || 'default'}`)}
                      variant="primary"
                      size="sm"
                      className="flex-1 !bg-green-500 !hover:bg-green-600 !text-white !border-green-500 !hover:border-green-600 text-sm py-3 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {sendingEmails.has(`${row.email}_${row.dashboardType}_${row.frequency}_${row.time}_${row.schedule_value || 'default'}`) ? (
                        <div className="flex items-center gap-2">
                          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Sending...
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-2">
                          <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-white">
                            <path fillRule="evenodd" clipRule="evenodd" d="M3.0415 7.06206V14.375C3.0415 14.6511 3.26536 14.875 3.5415 14.875H16.4582C16.7343 14.875 16.9582 14.6511 16.9582 14.375V7.06245L11.1441 11.1168C10.4568 11.5961 9.54348 11.5961 8.85614 11.1168L3.0415 7.06206ZM16.9582 5.19262C16.9582 5.19341 16.9582 5.1942 16.9582 5.19498V5.20026C16.957 5.22216 16.9458 5.24239 16.9277 5.25501L10.2861 9.88638C10.1143 10.0062 9.88596 10.0062 9.71412 9.88638L3.0723 5.25485C3.05318 5.24151 3.04178 5.21967 3.04177 5.19636C3.04176 5.15695 3.0737 5.125 3.1131 5.125H16.8869C16.925 5.125 16.9562 5.15494 16.9582 5.19262ZM18.4582 5.21428V14.375C18.4582 15.4796 17.5627 16.375 16.4582 16.375H3.5415C2.43693 16.375 1.5415 15.4796 1.5415 14.375V5.19498C1.5415 5.1852 1.54169 5.17546 1.54206 5.16577C1.55834 4.31209 2.25546 3.625 3.1131 3.625H16.8869C17.7546 3.625 18.4582 4.32843 18.4583 5.19622C18.4583 5.20225 18.4582 5.20826 18.4582 5.21428Z" fill="currentColor" />
                          </svg>
                          Send Now
                        </div>
                      )}
                    </Button>
                    <Button
                      onClick={() => openDeleteModal(row.id || row.email)}
                      variant="primary"
                      size="sm"
                      className="flex-1 !bg-red-500 !hover:bg-red-600 !text-white !border-red-500 !hover:border-red-600 text-sm py-3"
                    >
                      <div className="flex items-center justify-center gap-2">
                        <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-white">
                          <path fillRule="evenodd" clipRule="evenodd" d="M6.54142 3.7915C6.54142 2.54886 7.54878 1.5415 8.79142 1.5415H11.2081C12.4507 1.5415 13.4581 2.54886 13.4581 3.7915V4.0415H15.6252H16.666C17.0802 4.0415 17.416 4.37729 17.416 4.7915C17.416 5.20572 17.0802 5.5415 16.666 5.5415H16.3752V8.24638V13.2464V16.2082C16.3752 17.4508 15.3678 18.4582 14.1252 18.4582H5.87516C4.63252 18.4582 3.62516 17.4508 3.62516 16.2082V13.2464V8.24638V5.5415H3.3335C2.91928 5.5415 2.5835 5.20572 2.5835 4.7915C2.5835 4.37729 2.91928 4.0415 3.3335 4.0415H4.37516H6.54142V3.7915ZM14.8752 13.2464V8.24638V5.5415H13.4581H12.7081H7.29142H6.54142H5.12516V8.24638V13.2464V16.2082C5.12516 16.6224 5.46095 16.9582 5.87516 16.9582H14.1252C14.5394 16.9582 14.8752 16.6224 14.8752 16.2082V13.2464ZM8.04142 4.0415H11.9581V3.7915C11.9581 3.37729 11.6223 3.0415 11.2081 3.0415H8.79142C8.37721 3.0415 8.04142 3.37729 8.04142 3.7915V4.0415ZM8.3335 7.99984C8.74771 7.99984 9.0835 8.33562 9.0835 8.74984V13.7498C9.0835 14.1641 8.74771 14.4998 8.3335 14.4998C7.91928 14.4998 7.5835 14.1641 7.5835 13.7498V8.74984C7.5835 8.33562 7.91928 7.99984 8.3335 7.99984ZM12.4168 8.74984C12.4168 8.33562 12.081 7.99984 11.6668 7.99984C11.2526 7.99984 10.9168 8.33562 10.9168 8.74984V13.7498C10.9168 14.1641 11.2526 14.4998 11.6668 14.4998C12.081 14.4998 12.4168 14.1641 12.4168 13.7498V8.74984Z" fill="currentColor" />
                        </svg>
                        Delete
                      </div>
                    </Button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-8 text-center">
              <div className="flex flex-col items-center gap-4">
                <svg className="w-16 h-16 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
                <div>
                  <p className="text-gray-400 dark:text-gray-300 text-lg font-medium">No dashboard settings found</p>
                  <p className="text-gray-300 dark:text-gray-500 text-base mt-1">Create your first email schedule using the form above</p>
                </div>
              </div>
            </div>
          )}
        </div>
        {/* Pagination */}
        {settings.length > 0 && (
          <div className="mt-6 sm:mt-8">
            <Pagination
              currentPage={currentPage}
              pageSize={itemsPerPage}
              totalItems={settings.length}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
              label="settings"
            />
          </div>
        )}
      </div>
    </>
  );
}
