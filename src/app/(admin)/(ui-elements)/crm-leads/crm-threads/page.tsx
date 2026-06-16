

"use client";

// import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import DashboardHeader from "@/components/header/DashboardHeader";
import ActionBar from "@/components/header/actionbar";

import React, { useEffect, useState, useRef } from "react";

import { useRouter } from "next/navigation";

import {

  Table,

  TableBody,

  TableHeader,

  TableRow,

} from "@/components/ui/table";

import { ArrowDown, ArrowUp } from "lucide-react";
import { FaTimes, FaCalendarAlt, FaClock } from 'react-icons/fa';

import * as XLSX from "xlsx";

import PhoneInput2 from 'react-phone-input-2';

import 'react-phone-input-2/lib/style.css';

// import DatePicker from "@/components/form/date-picker";

import { isValidPhoneNumber } from 'libphonenumber-js';


import Loader from "@/components/Loader";

import Alert from "@/components/ui/alert/Alert";
import { fetchIPGeolocation } from "@/GPS/gps";
import { API_URLS } from "@/app/(admin)/(ui-elements)/appointment/config/api";
import { VisualCalendar } from "@/app/(admin)/(ui-elements)/appointment/components/VisualCalendar";
import { getAuthHeaders } from '@/utils/api';
import AuthService from '@/services/AuthService';
import { getUserRole, UserRole } from '@/utils/roleUtils';

// UserWithRoles type for type assertions
interface UserWithRoles {
  role_id?: string | number;
  role_name?: string;
  role?: string;
  userRoles?: string;
  roles?: Array<string | { role_name?: string }>;
  [key: string]: unknown;
}

type Lead = {

  id: number | string;

  name: string;

  email: string;

  phone: string;

  company_name?: string; // <-- User-provided company name from form (same as L_S_A)

  lead_metadata: string;

  source: string;

  channel?: string;

  score?: number;

  created_at: string;

  status: string; // <-- add status

  interest?: string; // <-- add interest field

  message?: string; // <-- add message field

  appointment_count?: number; // <-- add appointment count field

  agent?: string; // <-- add agent field

  appointment?: {
    date: string;
    time: string;
    status: string;
    notes?: string;
  }; // <-- add appointment field

  assigned_agent_name?: string; // <-- add assigned agent name (same as L_S_A)
  _id?: string; // <-- MongoDB ID (same as L_S_A)

  // Assignment-related fields (to mirror Lead Integration page rendering)
  assignment?: {
    assigned_to?: string;
    assigned_to_name?: string;
    assigned_agent_id?: string;
    [key: string]: unknown;
  };
  assignment_results?: {
    assigned_agent?: {
      agent_id?: string;
      name?: string;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  originalId?: string | number;
  originalLeadId?: string | number;
  lead_id?: string | number;
  leadId?: string | number;
  agent_id?: string;
  stage?: string;
  createdAt?: string;
  created_date?: string;
  createdDate?: string;
  createdOn?: string;
  created?: string;
  assignment_id?: string;
  // Response time and metrics fields
  response_time?: number | string;
  avg_response_time?: number | string;
  average_response_time?: number | string;
  first_response_time?: number | string;
  first_response_at?: string | Date;
  first_response_timestamp?: string | number;
  metrics?: Record<string, unknown>;
  analytics?: Record<string, unknown>;
  communication_metrics?: Record<string, unknown>;
  performance?: Record<string, unknown>;
  response?: Record<string, unknown>;
  timeline?: unknown[];
  communication?: Record<string, unknown>;
  lead_score?: number;
  ats_score?: number;
  assigned_to?: string;
  assigned_to_name?: string;

};

// Add Appointment interface for modal
interface Appointment {
  id: string;
  date: string;
  time: string;
  status: string;
  service_name: string;
  reason?: string;
  created_at: string;
  source: string;
  display_name: string;
  [key: string]: unknown;
}

// FormattedSlot interface for appointment slots
interface FormattedSlot {
  id: string;
  label: string;
  available: number;
  start_utc: string;
}

// LeadWithAgentInfo interface for type assertions
interface LeadWithAgentInfo {
  assigned_agent_id?: string;
  assigned_agent_name?: string;
  assignment?: {
    assigned_to?: string;
    assigned_agent_id?: string;
    [key: string]: unknown;
  };
  assignment_results?: {
    assigned_agent?: {
      agent_id?: string;
      name?: string;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

// Add LeadScore interface

interface LeadScore {

  _id?: string;

  id?: number;

  category: string;

  value: string;

  score: number;

  label?: string;

}

// Add Employee interface

interface Employee {

  emp_id: string;

  full_name: string;

  email: string;

  phone: string;

  department: string;

  created_at: string;

  id: string;

}

// --- Embedded LeadsForm component start ---

// Removed unused LeadOption interface

type LeadsFormProps = {
  showAlertMessage: (message: string, type: 'success' | 'error') => void;
  onSuccess?: () => void;
  onClose?: () => void;
  editingLead?: Lead | null;
  onSubmitStart?: () => void; // optional: trigger parent loading/close before submit
};

const CHANNEL_FALLBACK_OPTIONS = ['Email', 'Phone', 'Chat', 'Website', 'Social Media', 'Referral'];

const LeadsForm = ({ showAlertMessage, onSuccess, onClose, editingLead, onSubmitStart }: LeadsFormProps): React.JSX.Element => {

  const [formData, setFormData] = React.useState({

    name: '',

    email: '',

    phone: '',

    interest: '',

    source: '',

    channel: '',

    message: '',

    company_name: '', // Added to match L_S_A

    agent: '',

  });

  // Prevent double-submit on the lead form
  const submitLockRef = React.useRef(false);

  const [messageError, setMessageError] = React.useState('');

  const [interestOptions, setInterestOptions] = React.useState<string[]>([]);

  const [sourceOptions, setSourceOptions] = React.useState<string[]>([]);

  const [channelOptions, setChannelOptions] = React.useState<string[]>(CHANNEL_FALLBACK_OPTIONS);


  const [loading, setLoading] = React.useState(false);

  const [formKey, setFormKey] = React.useState(0);

  const [mobile, setMobile] = React.useState("");

  const [dialCode, setDialCode] = React.useState<string>('91');

  const [emailError, setEmailError] = React.useState('');

  const [emailTouched, setEmailTouched] = React.useState(false);

  const [showEmailExample, setShowEmailExample] = React.useState(false);

  const [phoneError, setPhoneError] = React.useState('');

  const [phoneTouched, setPhoneTouched] = React.useState(false);


  const [nameError, setNameError] = React.useState('');

  // Employee suggestions state

  const [employees, setEmployees] = React.useState<Employee[]>([]);

  // Created lead information state
  const [createdLead, setCreatedLead] = React.useState<{
    lead_id: string;
    status: string;
    note?: string;
    validation_results?: unknown;
    processing_stage?: string;
    processing_started_at?: string;
    processing_completed_at?: string;
  } | null>(null);

  // Status polling state
  const [pollingStatus, setPollingStatus] = React.useState(false);

  // Loading step state for better UX
  const [loadingStep, setLoadingStep] = React.useState<string>('');

  // Removed unused state variables: showAgentSuggestions, agentSuggestions, loadingEmployees

  // Function to fetch employees

  const fetchEmployees = React.useCallback(async () => {

    if (employees.length > 0) return; // Don't fetch if already loaded

    try {

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/employees/?page=1&size=100`);

      const data = await response.json();

      if (data.data && Array.isArray(data.data)) {

        setEmployees(data.data);

      }

    } catch (error) {

      console.error('Error fetching employees:', error);

    }

  }, [employees.length]);

  // Function to handle agent input changes
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _handleAgentChange = (e: React.ChangeEvent<HTMLInputElement>) => {

    const value = e.target.value;

    setFormData({ ...formData, agent: value });

    if (value.length > 0) {
      // Filter employees based on input
      // Removed unused filtered variable and related functionality
    }

  };

  // Function to select an agent suggestion
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _selectAgent = (employee: Employee) => {

    setFormData({ ...formData, agent: employee.email });

  };

  // Alert states

  // Auto-hide alert after 5 seconds

  React.useEffect(() => {

    if (showEmailExample) {

      const timer = setTimeout(() => {

        setShowEmailExample(false);

      }, 5000);

      return () => clearTimeout(timer);

    }

  }, [showEmailExample]);

  React.useEffect(() => {

    if (phoneError) {

      const timer = setTimeout(() => {

        setPhoneError('');

      }, 5000);

      return () => clearTimeout(timer);

    }

  }, [phoneError]);

  // Prefill when editing
  React.useEffect(() => {
    if (editingLead) {
      // Extract phone number and country code
      const phoneValue = editingLead.phone || '';
      let phoneNumber = phoneValue;
      let countryCode = '91'; // Default to India

      // Try to extract country code from phone (format: +91XXXXXXXXXX)
      if (phoneValue.startsWith('+')) {
        const match = phoneValue.match(/^\+(\d{1,3})(.+)$/);
        if (match) {
          countryCode = match[1];
          phoneNumber = match[2];
        }
      }

      // Parse lead_metadata if it's a string
      interface LeadMetadata {
        interest?: string;
        source?: string;
        message?: string;
        company_name?: string;
        agent?: string;
        channel?: string;
        [key: string]: unknown;
      }
      let metadata: LeadMetadata = {};
      if (editingLead.lead_metadata) {
        try {
          metadata = typeof editingLead.lead_metadata === 'string'
            ? JSON.parse(editingLead.lead_metadata)
            : editingLead.lead_metadata;
        } catch (e) {
          console.error('Error parsing lead_metadata:', e);
        }
      }

      // Get agent from various possible fields
      const agentValue =
        editingLead?.assigned_agent_name ||
        editingLead?.assignment?.assigned_to_name ||
        editingLead?.assignment_results?.assigned_agent?.name ||
        metadata?.agent ||
        editingLead.agent ||
        '';

      const metadataChannel = typeof metadata?.channel === 'string' ? metadata.channel : '';

      setFormData({
        name: editingLead.name || '',
        email: editingLead.email || '',
        phone: phoneValue || phoneNumber,
        interest: editingLead.interest || metadata?.interest || '',
        source: editingLead.source || metadata?.source || '',
        channel: editingLead.channel || metadataChannel || '',
        message: metadata?.message || editingLead.message || '',
        company_name: editingLead.company_name || metadata?.company_name || '',
        agent: agentValue,
      });

      setMobile(phoneValue || phoneNumber);
      setDialCode(countryCode);
    } else {
      // Reset form when not editing
      setFormData({
        name: '',
        email: '',
        phone: '',
        interest: '',
        source: '',
        channel: '',
        message: '',
        company_name: '',
        agent: '',
      });
      setMobile('');
      setDialCode('91');
      setFormKey(k => k + 1);
    }
  }, [editingLead]);

  // After options load, ensure prefilled values are present in options

  React.useEffect(() => {
    const valuesToEnsure = {
      interest: formData.interest,
      source: formData.source,
      channel: formData.channel,
    };

    if (valuesToEnsure.interest && !interestOptions.includes(valuesToEnsure.interest)) {
      setInterestOptions(prev => [valuesToEnsure.interest, ...prev]);
    }

    if (valuesToEnsure.source && !sourceOptions.includes(valuesToEnsure.source)) {
      setSourceOptions(prev => [valuesToEnsure.source, ...prev]);
    }

    if (valuesToEnsure.channel && !channelOptions.includes(valuesToEnsure.channel)) {
      setChannelOptions(prev => [valuesToEnsure.channel, ...prev]);
    }
  }, [interestOptions, sourceOptions, channelOptions, formData.interest, formData.source, formData.channel]);

  // Removed lead-related useEffect to match L_S_A (no edit functionality)

  React.useEffect(() => {

    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/leads/options`)

      .then(async (res) => {

        if (!res.ok) {

          const text = await res.text().catch(() => '');

          throw new Error(`Options fetch failed ${res.status}: ${text}`);

        }

        return res.json();

      })

      .then((data: unknown) => {

        type LeadOptionItem = { optionid?: number; option_label?: string; list_label?: string };

        const arr: LeadOptionItem[] = Array.isArray(data) ? (data as LeadOptionItem[]) : [];

        const getId = (item: LeadOptionItem) => Number(item?.optionid);

        const getLabel = (item: LeadOptionItem) => String(item?.option_label || '').toLowerCase();

        const getValue = (item: LeadOptionItem) => String(item?.list_label ?? '').trim();

        const interests = arr

          .filter((item: LeadOptionItem) => getValue(item) && (getLabel(item) === 'interest' || getId(item) === 1))

          .map((item: LeadOptionItem) => getValue(item));

        const sources = arr
          .filter((item: LeadOptionItem) => getValue(item) && (getLabel(item) === 'source' || getId(item) === 2))
          .map((item: LeadOptionItem) => getValue(item));

        const channels = arr
          .filter((item: LeadOptionItem) => getValue(item) && getLabel(item) === 'channel')
          .map((item: LeadOptionItem) => getValue(item));

        const withEnsured = <T extends string>(opts: T[], v?: string) =>
          v && v.trim() ? Array.from(new Set([v, ...opts])) as T[] : opts;

        const ensuredInterests = withEnsured(interests, undefined);
        const ensuredSources = withEnsured(sources, undefined);
        const ensuredChannels = withEnsured(channels.length ? channels : CHANNEL_FALLBACK_OPTIONS, undefined);

        setInterestOptions(ensuredInterests);
        setSourceOptions(ensuredSources);
        setChannelOptions(ensuredChannels);
      })

      .catch((err) => console.error('â Œ Dropdown load error:', err));
  }, []);

  // Fetch employees on component mount

  React.useEffect(() => {

    fetchEmployees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {

    setFormData({ ...formData, [e.target.name]: e.target.value });

    // Validate message field if it's being changed
    if (e.target.name === 'message') {
      const messageValue = e.target.value;
      if (messageValue.trim() && messageValue.trim().length < 5) {
        setMessageError('Message must be at least 5 characters long');
      } else {
        setMessageError('');
      }
    }

    // Enforce max 30 digits and validate price_range (both create and edit forms)

    if (false) {

      const raw = e.target.value;

      const digitsOnly = raw.replace(/[^\d]/g, '');

      // If more than 30 digits, trim extra digits while keeping non-digits

      if (digitsOnly.length > 30) {

        let digitCount = 0;

        const trimmed = raw

          .split('')

          .filter((ch) => {

            if (/\d/.test(ch)) {

              if (digitCount < 30) {

                digitCount += 1;

                return true;

              }

              return false;

            }

            return true;

          })

          .join('');

        setFormData(prev => ({ ...prev, price_range: trimmed }));

      }

      const effectiveDigitsLen = Math.min(digitsOnly.length, 30);

      if (raw.trim() && effectiveDigitsLen < 3) {

        // setPriceError('Price must contain at least 3 digits');

      } else {

        // setPriceError('');

      }

    }

    // Validate listing URL if it's being changed

    if (false) {

      const urlValidationResult = validateUrl(e.target.value);

      if (urlValidationResult !== true) {

        // setListingUrlError(urlValidationResult);

      } else {

        // setListingUrlError('');

      }

    }

  };

  const validateEmail = (email: string): string | true => {

    // Allow empty email (optional field)

    if (!email.trim()) return true;

    // Check maximum length (256 characters)

    if (email.length > 256) return "Email must be maximum 256 characters.";

    // Check for blank spaces

    if (email.includes(' ')) return "Email should not contain blank spaces.";

    // Check if starts with special character

    if (/^[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(email)) {

      return "Email should not start with a special character.";

    }

    // Check for exactly one @ symbol

    const atCount = (email.match(/@/g) || []).length;

    if (atCount === 0) return "Email must contain exactly one @ symbol.";

    if (atCount > 1) return "Email must contain exactly one @ symbol.";

    // Check domain format (must have at least one dot after @)

    const parts = email.split('@');

    if (parts.length !== 2) return "Invalid email format.";

    const domain = parts[1];

    if (!domain.includes('.') || domain.startsWith('.') || domain.endsWith('.')) {

      return "Invalid domain format.";

    }

    // Enhanced domain validation

    const domainParts = domain.split('.');

    if (domainParts.length < 2) return "Invalid domain format.";

    // Check each domain part

    for (let i = 0; i < domainParts.length; i++) {

      const part = domainParts[i];



      // Domain part cannot be empty

      if (!part || part.length === 0) return "Invalid domain format.";



      // Domain part cannot start or end with hyphen

      if (part.startsWith('-') || part.endsWith('-')) return "Domain parts cannot start or end with hyphen.";



      // Domain part can only contain letters, numbers, and hyphens

      if (!/^[a-zA-Z0-9-]+$/.test(part)) return "Domain can only contain letters, numbers, and hyphens.";



      // Domain part cannot be longer than 63 characters

      if (part.length > 63) return "Domain parts cannot exceed 63 characters.";

    }

    // Check TLD (top-level domain) - must be at least 2 characters

    const tld = domainParts[domainParts.length - 1];

    if (tld.length < 2) return "Top-level domain must be at least 2 characters.";

    // Check if TLD contains only letters

    if (!/^[a-zA-Z]+$/.test(tld)) return "Top-level domain must contain only letters.";

    // Check local part (before @)

    const localPart = parts[0];

    // Local part cannot be empty

    if (!localPart || localPart.length === 0) return "Local part cannot be empty.";

    // Local part cannot be longer than 64 characters

    if (localPart.length > 64) return "Local part cannot exceed 64 characters.";

    // Local part can contain letters, numbers, and specific special characters

    if (!/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+$/.test(localPart)) {

      return "Local part contains invalid characters.";

    }

    // Local part cannot start or end with dot

    if (localPart.startsWith('.') || localPart.endsWith('.')) {

      return "Local part cannot start or end with a dot.";

    }

    // Local part cannot have consecutive dots

    if (localPart.includes('..')) return "Local part cannot have consecutive dots.";

    return true;

  };

  const validateUrl = (url: string): string | true => {

    // Check if URL is empty (optional field)

    if (!url.trim()) return true;

    // Basic URL pattern validation

    const urlPattern = /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/;

    if (!urlPattern.test(url)) {

      return "Please enter a valid URL";

    }

    return true;

  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (submitLockRef.current) return; // guard against rapid double-clicks
    submitLockRef.current = true;

    // Clear all previous errors
    setNameError('');
    setEmailError('');
    setPhoneError('');
    setMessageError('');
    // setPriceError('');
    // setListingUrlError('');

    if (!formData.name.trim()) {
      setNameError('Name is required');
      showAlertMessage('Name is required', 'error');
      return;
    }

    if (formData.name.length > 50) {
      setNameError('Name must be 50 characters or less');
      showAlertMessage('Name is too long (max 50 characters)', 'error');
      return;
    }

    if (!formData.email.trim()) {
      setEmailError('Email is required');
      showAlertMessage('Email is required', 'error');
      return;
    }

    setLoading(true);
    setLoadingStep('Validating and preparing data...');

    // Clean and validate mobile

    // Clean and validate mobile for global numbers
    const cleanMobile = '+' + mobile.replace(/[^\d]/g, '').replace(/^\+/, '');

    // Basic validation: Check if we have at least a country code and some digits
    const digitsOnly = mobile.replace(/[^\d]/g, '');
    const hasPhoneDigits = digitsOnly.length > 0;

    if (hasPhoneDigits) {
      if (digitsOnly.length < 7) {
        setPhoneError('Mobile number is too short');
        showAlertMessage('Mobile number is too short', 'error');
        setLoading(false);
        return;
      }

      if (digitsOnly.length > 15) {
        setPhoneError('Mobile number is too long (max 15 digits)');
        showAlertMessage('Mobile number is too long (max 15 digits)', 'error');
        setLoading(false);
        return;
      }

      // Use international phone library validation
      if (!isValidPhoneNumber(cleanMobile)) {
        setPhoneError('Please enter a valid mobile number with country code');
        showAlertMessage('Please enter a valid mobile number with country code', 'error');
        setLoading(false);
        return;
      }
    }

    const normalizedPhone = hasPhoneDigits ? cleanMobile : '';

    const emailValidationResult = formData.email.trim() ? validateEmail(formData.email) : true;
    if (emailValidationResult !== true) {
      setEmailError(typeof emailValidationResult === 'string' ? emailValidationResult : 'Invalid email address');
      showAlertMessage('Invalid email address. Please check the format and try again.', 'error');
      setLoading(false);
      return;
    }

    // Validate message if provided

    if (formData.message.trim() && formData.message.trim().length < 5) {

      setMessageError('Message must be at least 5 characters long');

      showAlertMessage('Message must be at least 5 characters long', 'error');

      setLoading(false);

      return;

    }

    // Validate price if provided

    if (false) {

      const priceDigitsLen = ''.replace(/[^\d]/g, '').length;

      if (priceDigitsLen < 3) {

        // setPriceError('Price must contain at least 3 digits');

        showAlertMessage('Price must contain at least 3 digits', 'error');

        setLoading(false);

        return;

      }

      if (priceDigitsLen > 30) {

        // setPriceError('Price must not exceed 30 digits');

        showAlertMessage('Price must not exceed 30 digits', 'error');

        setLoading(false);

        return;

      }

    }

    // Validate listing URL if provided


    // Fetch client IP geolocation and include in metadata
    let ipGeo = null as Awaited<ReturnType<typeof fetchIPGeolocation>>;
    try { ipGeo = await fetchIPGeolocation(); } catch { ipGeo = null; }

    // Match L_S_A format exactly - use JSON.stringify for lead_metadata and include company_name
    const payload = {
      name: formData.name,
      email: formData.email,
      phone: normalizedPhone,
      source: formData.source,
      channel: formData.channel,
      interest: formData.interest,
      message: formData.message,
      company_name: formData.company_name, // Added to match L_S_A
      // Match lead-integration API: send stringified metadata (same as L_S_A)
      lead_metadata: JSON.stringify({
        interest: formData.interest,
        message: formData.message,
        source: formData.source,
        channel: formData.channel,
        company_name: formData.company_name,
        agent: formData.agent,
        ip_information: ipGeo ? {
          ip: ipGeo.ip,
          country: ipGeo.country,
          city: ipGeo.city,
          region: ipGeo.region || ipGeo.state,
          state: ipGeo.state || ipGeo.region,
          timezone: ipGeo.timezone,
          isp: ipGeo.isp,
          organization: ipGeo.organization,
          country_code: ipGeo.country_code,
          latitude: ipGeo.latitude,
          longitude: ipGeo.longitude,
        } : null,
      }),
    };

    try {
      // Determine if we're editing or creating
      const isEditing = editingLead && editingLead.id;
      const leadId = editingLead?.id || editingLead?._id;

      // Use PUT for editing, POST for creating
      const url = isEditing && leadId
        ? `${process.env.NEXT_PUBLIC_API_URL}/api/v1/leads/${leadId}`
        : `${process.env.NEXT_PUBLIC_API_URL}/api/v1/leads-integration/`;

      const method = isEditing ? 'PUT' : 'POST';

      // Save lead to backend (create or update)
      const leadRes = await fetch(url, {
        method: method,
        headers: {
          'accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
      });

      let leadResData: unknown = {};

      try { leadResData = await leadRes.json(); } catch { }

      if (!leadRes.ok) {
        setLoading(false);
        setLoadingStep('');
        showAlertMessage('Lead save failed: ' + ((leadResData as { error?: string }).error || leadRes.statusText), 'error');
        return;
      }

      // Show success with lead ID and processing status
      setLoading(false);
      setLoadingStep('');
      const responseLeadId = (leadResData as { lead_id?: string })?.lead_id;
      const processingNote = (leadResData as { note?: string })?.note;
      const validationResults = (leadResData as { validation_results?: unknown })?.validation_results;

      if (isEditing) {
        showAlertMessage('Lead updated successfully!', 'success');
      } else {
        // Set created lead information for display
        setCreatedLead({
          lead_id: responseLeadId || 'Unknown',
          status: (leadResData as { status?: string })?.status || 'processing',
          note: processingNote,
          validation_results: validationResults
        });

        showAlertMessage(
          `Lead created successfully! Lead ID: ${responseLeadId || 'Unknown'}. ${processingNote || 'Processing in background...'}`,
          'success'
        );
      }

      // Notify parent/listeners to refresh leads
      try { window.dispatchEvent(new Event('leads-updated')); } catch { }

      // Reset form only when creating (not editing) and no created lead to display
      if (!isEditing && !createdLead) {
        setFormData({
          name: '',
          email: '',
          phone: '',
          interest: '',
          source: '',
          channel: '',
          message: '',
          company_name: '', // Added to match L_S_A
          agent: '',
        });
        setMobile('');
        setFormKey(k => k + 1);
        setLoadingStep('');
      }

      // Send emails in background only for new leads (same as L_S_A)
      if (!isEditing) {
        (async () => {
          try {
            // Extract lead data from response (same as L_S_A)
            const responseData = leadResData as { lead?: Lead; message?: string };
            const createdLead = responseData.lead;

            // Check if agent was assigned (same as L_S_A)
            const assignmentStatus = (createdLead as Lead & { assigned_agent_name?: string })?.assigned_agent_name ? 'assign' : 'not assign';
            const assignedAgentName = (createdLead as Lead & { assigned_agent_name?: string })?.assigned_agent_name || null;

            // Fetch confirmation message from API (same as L_S_A)
            let confirmationMessage = '';
            try {
              const confirmationRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/leads/confirmation-message`);
              const confirmationData = await confirmationRes.json();
              if (confirmationData?.message) {
                confirmationMessage = `Dear ${formData.name},\n\n${confirmationData.message}`;
              }
            } catch { }

            // User confirmation email (same as L_S_A)
            const emailPayload = {
              to_email: formData.email,
              subject: 'Thank you for your inquiry',
              body: confirmationMessage
            };
            await fetch(`${process.env.NEXT_PUBLIC_API_URL}/send-email`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(emailPayload),
            });

            // Alert emails to subscribers (same as L_S_A)
            const alertsRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/leads/email-alerts`);
            const alertsData = await alertsRes.json();
            const alertEmails = Array.isArray(alertsData) ? alertsData.map(e => e.email) : [];
            const leadScore = (leadResData as { score?: string | number }).score ?? '—';
            const interest = payload.interest || '';
            const alertBody = `🚀 New Lead Submitted:\n\nName: ${payload.name}\nEmail: ${payload.email}\nPhone: ${payload.phone}\nSource: ${payload.source}\nInterest: ${interest}\nLead Score: ${leadScore}`;

            for (const to_email of alertEmails) {
              await fetch(`${process.env.NEXT_PUBLIC_API_URL}/send-email`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  to_email,
                  subject: '🚀 New Lead Submitted',
                  body: alertBody,
                }),
              });
            }

            // Send assignment email if agent was assigned (same logic as L_S_A)
            if (assignmentStatus === 'assign' && assignedAgentName && formData.agent?.trim()) {
              const assignedAgentEmail = formData.agent.trim();
              const isValidAssignedAgent = assignedAgentEmail && validateEmail(assignedAgentEmail) === true;

              if (isValidAssignedAgent) {
                // Try to find agent name from employees list
                const matchedEmployee = employees.find(emp => emp.email?.toLowerCase() === assignedAgentEmail.toLowerCase());
                const agentName = matchedEmployee?.full_name || assignedAgentEmail;

                // Get lead ID from response (same as L_S_A)
                const leadId = String((leadResData as { lead_id?: string; id?: string })?.lead_id || (leadResData as { id?: string })?.id || createdLead?.id || (createdLead as Lead & { _id?: string })?._id || '—');

                const leadName = payload.name || '—';

                const leadPhone = payload.phone || '—';

                const leadEmail = payload.email || '—';

                const leadInterest = payload.interest || ((payload.lead_metadata as unknown as Record<string, unknown>)?.['interest'] as string) || '—';


                const remarks = (formData.message && formData.message.trim()) ? formData.message.trim() : '—';

                const subject = `New Lead Assigned — Lead ID: ${leadId}`;

                const body = [

                  `Dear ${agentName},`,

                  '',

                  'A new lead has been assigned to you. Please find the details below:',

                  '',

                  `Lead ID: ${leadId}`,

                  '',

                  `Name: ${leadName}`,

                  `Contact: ${leadPhone} | ${leadEmail}`,

                  `Interest: ${leadInterest}`,

                  `Preferred Area: ${'—'}`,

                  `Remarks: ${remarks}`,

                  '',

                  'Kindly reach out to the lead at the earliest and update the system with the progress.',

                  '',

                  'If you face any issues, please connect with me directly.',

                  '',

                  'Best regards,',

                  'Admin — Lead Management Team'

                ].join('\n');

                await fetch(`${process.env.NEXT_PUBLIC_API_URL}/send-email`, {

                  method: 'POST',

                  headers: { 'Content-Type': 'application/json' },

                  body: JSON.stringify({

                    to_email: assignedAgentEmail,

                    subject,

                    body,

                    is_html: false,

                  }),

                });

              }
            }
          } catch {
            // Silent fail for email
          }
        })();
      }

      if (onSuccess) onSuccess();

    } catch {

      setLoading(false);

      showAlertMessage('Server error. Please try again later.', 'error');

    }

    // Always release the submit lock
    submitLockRef.current = false;

  };

  const isFormValid = () => {
    const cleanMobile = '+' + mobile.replace(/[^\d]/g, '').replace(/^\+/, '');
    const digitsOnly = mobile.replace(/[^\d]/g, '');
    const hasPhoneDigits = digitsOnly.length > 0;
    const phoneValid = !hasPhoneDigits || (isValidPhoneNumber(cleanMobile) && !phoneError);
    const emailValid = formData.email.trim() ? validateEmail(formData.email) === true : false; // Email now required
    const messageValid = !formData.message.trim() || formData.message.trim().length >= 5;


    return (
      formData.name.trim().length > 0 && // Name now required (not empty)
      formData.name.length <= 50 &&
      formData.email.trim().length > 0 && // Email now required (not empty)
      emailValid &&
      phoneValid &&
      messageValid
    );
  };

  return (

    <div className="relative flex items-center justify-center px-4 bg-transparent">

      <div className="w-full max-w-xs sm:max-w-md md:max-w-2xl lg:max-w-3xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl relative max-h-[85vh] flex flex-col overflow-hidden">

        {/* Sticky Header */}
        <div className="sticky top-0 z-10 bg-linear-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {editingLead ? 'Edit Lead' : 'Create Lead'}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Name and email are required. Other fields are optional.
            </p>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 dark:text-gray-500 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100 rounded-lg w-10 h-10 flex items-center justify-center transition-all shadow-sm hover:shadow"
              aria-label="Close dialog"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 14 14">
                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6" />
              </svg>
            </button>
          )}
        </div>



        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">

          {/* Created Lead Success Banner */}
          {createdLead && (
            <div className="mb-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3 flex-1">
                  <h3 className="text-sm font-medium text-green-800 dark:text-green-200">
                    Lead Created Successfully!
                  </h3>
                  <div className="mt-2 text-sm text-green-700 dark:text-green-300">
                    <div className="font-medium">Lead ID: <span className="font-mono bg-green-100 dark:bg-green-800 px-2 py-1 rounded text-xs">{createdLead.lead_id}</span></div>
                    <div className="mt-1">Status: <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${createdLead.status === 'processing' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                      createdLead.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                        'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      }`}>
                      {createdLead.status === 'processing' ? 'Processing in Background' :
                        createdLead.status === 'completed' ? 'Processing Complete' :
                          'Processing Failed'}
                    </span></div>
                    {createdLead.note && (
                      <div className="mt-1 text-xs opacity-75">{createdLead.note}</div>
                    )}
                    {createdLead.processing_stage && (
                      <div className="mt-1 text-xs">Stage: {createdLead.processing_stage}</div>
                    )}
                    {createdLead.processing_started_at && (
                      <div className="mt-1 text-xs">
                        Started: {new Date(createdLead.processing_started_at).toLocaleTimeString()}
                      </div>
                    )}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setCreatedLead(null);
                        setLoadingStep('');
                      }}
                      className="text-xs bg-green-100 hover:bg-green-200 dark:bg-green-800 dark:hover:bg-green-700 text-green-800 dark:text-green-200 px-3 py-1 rounded-md transition-colors"
                    >
                      Create Another Lead
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        // Copy lead ID to clipboard
                        navigator.clipboard.writeText(createdLead.lead_id);
                        showAlertMessage('Lead ID copied to clipboard!', 'success');
                      }}
                      className="text-xs bg-blue-100 hover:bg-blue-200 dark:bg-blue-800 dark:hover:bg-blue-700 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-md transition-colors"
                    >
                      Copy Lead ID
                    </button>
                    {createdLead.status === 'processing' && (
                      <button
                        type="button"
                        onClick={async () => {
                          if (pollingStatus) return;
                          setPollingStatus(true);
                          try {
                            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/leads/${createdLead.lead_id}`);
                            if (response.ok) {
                              const leadData = await response.json();
                              if (leadData && leadData.data) {
                                const lead = leadData.data;
                                setCreatedLead(prev => prev ? {
                                  ...prev,
                                  status: lead.processing_status || prev.status,
                                  processing_stage: lead.processing_stage,
                                  processing_started_at: lead.processing_started_at,
                                  processing_completed_at: lead.processing_completed_at
                                } : null);
                              }
                            }
                          } catch (error) {
                            console.error('Failed to poll lead status:', error);
                          } finally {
                            setPollingStatus(false);
                          }
                        }}
                        disabled={pollingStatus}
                        className="text-xs bg-yellow-100 hover:bg-yellow-200 disabled:opacity-50 dark:bg-yellow-800 dark:hover:bg-yellow-700 text-yellow-800 dark:text-yellow-200 px-3 py-1 rounded-md transition-colors flex items-center"
                      >
                        {pollingStatus ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-1 h-3 w-3" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Checking...
                          </>
                        ) : (
                          'Check Status'
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          <form id={`lead-form-${formKey}`} key={formKey} onSubmit={handleSubmit} className="space-y-6" noValidate onKeyDown={(e) => {
            if (e.key === 'Escape' && onClose) {
              e.preventDefault();
              onClose();
            }
          }}>

            {/* Basic Info Section */}
            <div className="space-y-4">
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2 pb-2 border-b border-gray-200 dark:border-gray-700">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Basic Information
              </h3>

              {/* First Row - Name and Email */}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                <div>

                  <label htmlFor="lead-name" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                    Name <span className="text-red-500">*</span>
                  </label>

                  <input

                    id="lead-name"
                    type="text"

                    name="name"

                    placeholder="Enter full name"

                    value={formData.name}

                    onChange={handleChange}

                    maxLength={50}
                    autoFocus
                    aria-invalid={formData.name.trim() === '' && emailTouched}

                    onFocus={() => {

                      setEmailError('');

                      setShowEmailExample(false);

                    }}

                    className={`w-full h-11 px-4 py-2.5 rounded-xl border ${nameError ? 'border-blue-500 dark:border-blue-400' : 'border-gray-300 dark:border-gray-600'} bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 ${nameError ? 'focus:ring-blue-500' : 'focus:ring-blue-500'} focus:border-transparent transition`}

                  />

                  {/* Name error message */}
                  {nameError && (
                    <p className="flex items-start gap-1 mt-2 text-xs text-blue-600 dark:text-blue-400" role="alert">
                      <svg className="w-4 h-4 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      {nameError}
                    </p>
                  )}

                  {formData.name.length > 50 && (

                    <p className="flex items-start gap-1 mt-2 text-xs text-blue-600 dark:text-blue-400" role="alert">
                      <svg className="w-4 h-4 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      Name cannot exceed 50 characters

                    </p>

                  )}

                </div>

                <div>

                  <label htmlFor="lead-email" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                    Email <span className="text-red-500">*</span>
                  </label>

                  <input

                    id="lead-email"
                    type="email"

                    name="email"

                    placeholder="name@company.com"

                    value={formData.email}

                    onChange={e => {

                      {

                        handleChange(e);

                        // Real-time validation

                        if (e.target.value.trim()) {

                          const result = validateEmail(e.target.value);

                          setEmailError(result === true ? '' : result);

                        } else {

                          setEmailError('');

                        }

                      }

                    }}

                    onBlur={e => {

                      {

                        setEmailTouched(true);

                        const result = validateEmail(e.target.value);

                        setEmailError(result === true ? '' : result);

                      }

                    }}

                    onFocus={() => {

                      setEmailError('');

                      setShowEmailExample(false);

                    }}

                    autoCapitalize="none"

                    autoCorrect="off"
                    aria-invalid={!!emailError}
                    aria-describedby={emailError ? 'email-error' : undefined}

                    className={`w-full h-11 px-4 py-2.5 rounded-xl border ${emailError ? 'border-blue-500' : 'border-gray-300 dark:border-gray-600'} bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition`}

                  />

                  {emailError && (

                    <p id="email-error" className="flex items-start gap-1 mt-2 text-xs text-blue-600 dark:text-blue-400" role="alert">
                      <svg className="w-4 h-4 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      {emailError}
                    </p>

                  )}

                  {!emailError && (

                    <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">

                      We&apos;ll never share your email with anyone else

                    </p>

                  )}

                </div>

              </div>

              {/* Second Row - Mobile and Interest */}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                <div>

                  <label htmlFor="lead-mobile" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">

                    Mobile Number

                  </label>

                  <div className="w-full relative">

                    <PhoneInput2

                      country={'in'}

                      value={mobile}

                      onChange={(phone: string, data?: { dialCode?: string }) => {

                        {

                          setMobile(phone);

                          try {

                            const code = String(data?.dialCode || '').replace(/[^\d]/g, '') || dialCode;

                            if (code) setDialCode(code);

                          } catch { }

                          const digitsOnly = phone.replace(/[^\d]/g, '');

                          // Use the immediate dial code from the event when available to avoid stale state

                          const currentDial = (data && String(data.dialCode || '').replace(/[^\d]/g, '')) || dialCode;

                          const national = digitsOnly.startsWith(currentDial) ? digitsOnly.slice(currentDial.length) : digitsOnly;

                          if (national.length > 0 && /^0/.test(national)) {

                            setPhoneError('Invalid');

                            setPhoneTouched(true);

                          } else if (/([0-9])\1{4,}/.test(national)) {

                            // any digit repeated 5+ times consecutively is invalid

                            setPhoneError('Invalid');

                            setPhoneTouched(true);

                          } else if ((currentDial === '91') && national.length > 0 && !/^[6-9]/.test(national)) {

                            // For Indian numbers, national part must start with 6-9

                            setPhoneError('Invalid');

                            setPhoneTouched(true);

                          } else {

                            // Suppress generic message; only leading-zero shows error

                            setPhoneError('');

                          }

                        }

                      }}


                      inputProps={{

                        name: 'mobile',

                        autoFocus: false,

                        placeholder: '+91 98765 43210',
                        'aria-invalid': phoneError && phoneTouched,

                        onBlur: () => setPhoneTouched(true),

                        onFocus: () => {

                          setPhoneTouched(false);

                          setPhoneError('');

                        },

                      }}

                      inputClass={`px-4 py-2.5 rounded-xl border ${phoneError && phoneTouched ? 'border-blue-500' : 'border-gray-300 dark:border-gray-600'} bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition w-full`}

                      containerClass="w-full"

                      dropdownClass="bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-700 z-50"

                      buttonClass={`bg-white dark:bg-gray-800 ${phoneError && phoneTouched ? 'border-blue-500' : 'border-gray-300 dark:border-gray-600'} text-gray-900 dark:text-gray-100 border-r-0 rounded-l-xl`}

                      buttonStyle={{

                        backgroundColor: 'transparent',

                        borderColor: 'inherit',

                        color: 'inherit',

                        borderTopLeftRadius: '12px',

                        borderBottomLeftRadius: '12px',

                        borderTopRightRadius: '0px',

                        borderBottomRightRadius: '0px',

                        height: '44px',

                        borderRight: 'none'

                      }}

                      inputStyle={{

                        backgroundColor: 'transparent',

                        borderColor: 'inherit',

                        color: 'inherit',

                        borderTopLeftRadius: '0px',

                        borderBottomLeftRadius: '0px',

                        borderTopRightRadius: '12px',

                        borderBottomRightRadius: '12px',

                        width: '100%',

                        height: '44px',

                        borderLeft: 'none'

                      }}

                      enableSearch

                      searchPlaceholder="Search country..."

                      preferredCountries={['in', 'us', 'gb']}

                      autoFormat={true}

                      disableSearchIcon={false}

                      searchNotFound="No country found"

                      enableAreaCodes={true}

                    />

                  </div>

                  {(phoneError && phoneTouched) && (

                    <p className="flex items-start gap-1 mt-2 text-xs text-blue-600 dark:text-blue-400" role="alert">
                      <svg className="w-4 h-4 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      {phoneError}
                    </p>

                  )}

                  {!phoneError && (

                    <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                      Enter mobile number with country code (e.g., +1 for US, +44 for UK, +91 for India)
                    </p>

                  )}

                </div>

                {/* Company Name Field - Added to match L_S_A format */}
                <div>
                  <label htmlFor="lead-company-name" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                    Company Name
                  </label>
                  <input
                    id="lead-company-name"
                    type="text"
                    name="company_name"
                    placeholder="Enter company name"
                    value={formData.company_name}
                    onChange={handleChange}
                    className="w-full h-11 px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  />
                </div>

              </div>

              {/* Third Row - Interest, Source, Channel */}

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

                <div>

                  <label htmlFor="lead-interest" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">

                    Interest

                  </label>

                  <select

                    id="lead-interest"
                    name="interest"

                    value={formData.interest}

                    onChange={handleChange}

                    onFocus={() => {

                      setEmailError('');

                      setShowEmailExample(false);

                    }}

                    className={`w-full h-11 px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition cursor-pointer`}

                  >

                    <option value="" disabled>Select Interest</option>

                    {interestOptions.map((opt, i) => (

                      <option key={i} value={opt}>{opt}</option>

                    ))}

                  </select>

                </div>

                <div>

                  <label htmlFor="lead-source" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">

                    Source

                  </label>

                  <select

                    id="lead-source"
                    name="source"

                    value={formData.source}

                    onChange={handleChange}

                    onFocus={() => {

                      setEmailError('');

                      setShowEmailExample(false);

                    }}

                    className={`w-full h-11 px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition cursor-pointer`}

                  >

                    <option value="" disabled>Select Source</option>

                    {sourceOptions.map((opt, i) => (

                      <option key={i} value={opt}>{opt}</option>

                    ))}

                  </select>

                </div>

                <div>
                  <label htmlFor="lead-channel" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                    Channel
                  </label>
                  <select
                    id="lead-channel"
                    name="channel"
                    value={formData.channel}
                    onChange={handleChange}
                    className="w-full h-11 px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition cursor-pointer"
                  >
                    <option value="" disabled>Select Channel</option>
                    {channelOptions.map((opt, i) => (
                      <option key={i} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>

              </div>

              {/* Additional Info Section */}
              <div className="space-y-4 pt-6">
                <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2 pb-2 border-b border-gray-200 dark:border-gray-700">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Additional Information
                </h3>



                {/* Message Field */}

                <div>

                  <label htmlFor="lead-message" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">

                    Message

                  </label>

                  <textarea

                    id="lead-message"
                    name="message"

                    placeholder="Enter any additional notes or comments here..."

                    value={formData.message}

                    onChange={handleChange}

                    maxLength={250}

                    rows={4}

                    className={`w-full px-4 py-2.5 rounded-xl border ${messageError ? 'border-blue-500' : 'border-gray-300 dark:border-gray-600'} bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition resize-none`}

                  />

                  {messageError && (

                    <p className="flex items-start gap-1 mt-2 text-xs text-blue-600 dark:text-blue-400" role="alert">
                      <svg className="w-4 h-4 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      {messageError}
                    </p>

                  )}
                  {!messageError && (
                    <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400 text-right">
                      {formData.message.length}/250 characters
                    </p>
                  )}

                </div>

              </div>
            </div>

          </form>
        </div>

        {/* Sticky Footer with Buttons */}
        <div className="sticky bottom-0 z-10 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex flex-col sm:flex-row sm:justify-end gap-3">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="h-11 px-6 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 transition font-medium"
            >
              Cancel
            </button>
          )}
          <button
            type="button"
            onClick={async () => {
              if (!loading && isFormValid()) {
                if (onSubmitStart) onSubmitStart();
                await handleSubmit();
              }
            }}
            className={`h-11 px-6 rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition ${loading ? 'cursor-not-allowed' : ''} ${isFormValid() && !loading ? 'bg-linear-to-r from-blue-600 to-blue-600 hover:from-blue-700 hover:to-blue-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5' : 'bg-blue-400 dark:bg-blue-600 opacity-70'}`}
            disabled={loading || !isFormValid()}
            aria-busy={loading}
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                </svg>
                <span>{loadingStep || (editingLead ? 'Updating…' : 'Submitting…')}</span>
              </>
            ) : (
              <span>{editingLead ? 'Update Lead' : 'Submit Lead'}</span>
            )}
          </button>
        </div>

      </div>

    </div>

  );

};

// --- Embedded LeadsForm component end ---

export default function LeadsPage() {

  const router = useRouter();

  const [leadsData, setLeadsData] = useState<Lead[]>([]);

  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([]);

  const [loading, setLoading] = useState(true);

  const [filterQuery, setFilterQuery] = useState("");
  const [filterField, setFilterField] = useState("name");
  const [timelineFilter, setTimelineFilter] = useState("");
  const [pendingCustomRange, setPendingCustomRange] = useState<[Date | null, Date | null]>([null, null]);
  const [showFilterField, setShowFilterField] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all"); // "all", "new", "open" - shows all leads by default

  const [currentPage, setCurrentPage] = useState(1);

  const [sortAsc, setSortAsc] = useState(false);

  const [leadsPerPage, setLeadsPerPage] = useState(10);

  const [selectedIds, setSelectedIds] = useState<(string | number)[]>([]);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const [downloadMenuOpen, setDownloadMenuOpen] = useState(false);

  const downloadMenuRef = useRef<HTMLDivElement>(null);

  const [mobileDownloadMenuOpen, setMobileDownloadMenuOpen] = useState(false);

  const mobileDownloadMenuRef = useRef<HTMLDivElement>(null);


  // Add showCustomPopover state

  const [showCustomPopover, setShowCustomPopover] = useState(false);

  const customPopoverRef = useRef<HTMLDivElement>(null);

  // Removed unused showHelp state

  // Removed temporary unknown status banner and related state

  // NEW: editing lead state

  const [editingLead, setEditingLead] = useState<Lead | null>(null);

  const [editingLeadLoading, setEditingLeadLoading] = useState<boolean>(false);

  // Alert state for showing messages

  const [alertMessage, setAlertMessage] = useState('');

  // Appointment modal state
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [leadAppointments, setLeadAppointments] = useState<Appointment[]>([]);
  const [loadingAppointments, setLoadingAppointments] = useState(false);

  const [alertType, setAlertType] = useState<'success' | 'error' | 'warning' | 'info'>('info');

  const [showAlert, setShowAlert] = useState(false);

  // Booking modal state (ported)
  const [showBookModal, setShowBookModal] = useState(false);
  const [bookingLead, setBookingLead] = useState<Lead | null>(null);
  const [services, setServices] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [rawSlots, setRawSlots] = useState<Array<{ id: string; start_utc: string; end_utc: string; capacity: number; booked: number }>>([]);
  const [availableDates, setAvailableDates] = useState<Array<{ date: string; status: 'available' | 'full' | 'not_assigned'; slots?: number; capacity?: number }>>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [dateSlots, setDateSlots] = useState<Array<{ id: string; label: string; available: number }>>([]);
  const [selectedSlotId, setSelectedSlotId] = useState<string>('');
  const [selectedServiceName, setSelectedServiceName] = useState<string>('');
  const [bookingSubmitting, setBookingSubmitting] = useState<boolean>(false);
  // booking form fields
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [bookName, setBookName] = useState<string>('');
  const [bookEmail, setBookEmail] = useState<string>('');
  const [bookPhone, setBookPhone] = useState<string>('');
  const [bookNotes, setBookNotes] = useState<string>('');
  const [leadScores, setLeadScores] = useState<LeadScore[]>([]);
  const [scoreCache, setScoreCache] = useState<Record<string, number>>({});

  // Edit appointment state (ported)
  const [showEditAppointmentModal, setShowEditAppointmentModal] = useState(false);
  interface EditingAppointment {
    id?: string;
    date?: string;
    time?: string;
    service_name?: string;
    reason?: string;
    notes?: string;
    [key: string]: unknown;
  }
  const [editingAppointment, setEditingAppointment] = useState<EditingAppointment | null>(null);
  const [editDate, setEditDate] = useState<string>('');
  const [editShowDatePicker, setEditShowDatePicker] = useState<boolean>(false);
  const [editAvailableDates, setEditAvailableDates] = useState<Array<{ date: string; status: 'available' | 'full' | 'not_assigned'; slots?: number; capacity?: number }>>([]);
  const [editDateSlots, setEditDateSlots] = useState<FormattedSlot[]>([]);
  const [editSelectedSlotId, setEditSelectedSlotId] = useState<string>('');
  const [editNotes, setEditNotes] = useState<string>('');
  const [editSubmitting, setEditSubmitting] = useState<boolean>(false);
  const [showCancelReason, setShowCancelReason] = useState<boolean>(false);
  const [cancelReason, setCancelReason] = useState<string>('');
  const [editRawSlots, setEditRawSlots] = useState<Array<{ id: string; start_utc: string; end_utc: string; capacity: number; booked: number }>>([]);

  // Assignment modal state
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assigningLead, setAssigningLead] = useState<Lead | null>(null);
  const [availableAgents, setAvailableAgents] = useState<Array<{ agent_id: string; agent_name: string; agent_email: string; current_workload: number; max_concurrent_leads: number }>>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [loadingAgents, setLoadingAgents] = useState(false);
  const [assigning, setAssigning] = useState(false);
  // Reassignment reason modal state (for Sales role)
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [reassignmentReason, setReassignmentReason] = useState('');
  const [pendingAssignment, setPendingAssignment] = useState<{ leadId: string, agentId: string, agentName: string } | null>(null);
  // Agent dropdown UI state
  const [agentDropdownOpen, setAgentDropdownOpen] = useState<boolean>(false);
  const [agentSearch, setAgentSearch] = useState<string>('');
  const [agentHighlight, setAgentHighlight] = useState<number>(-1);

  // Auto-hide alert after 5 seconds

  useEffect(() => {

    if (showAlert) {

      const timer = setTimeout(() => {

        setShowAlert(false);

        setAlertMessage('');

        setAlertType('info');

      }, 5000);

      return () => clearTimeout(timer);

    }

  }, [showAlert]);

  // Function to show alert messages

  const showAlertMessage = (message: string, type: 'success' | 'error') => {

    setAlertMessage(message);

    setAlertType(type);

    setShowAlert(true);

  };

  // Function to fetch lead appointments
  const fetchLeadAppointments = async (lead: Lead) => {
    setLoadingAppointments(true);
    try {
      // Fetch appointments for this specific lead by email
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://py-mobiloitte.converiqo.ai'}/appointment/admin/appointments?source=lead&customer_email=${encodeURIComponent(lead.email)}`);
      if (response.ok) {
        const appointments = await response.json();
        setLeadAppointments(appointments);
      } else {
        console.error('Failed to fetch appointments');
        setLeadAppointments([]);
      }
    } catch (error) {
      console.error('Error fetching appointments:', error);
      setLeadAppointments([]);
    } finally {
      setLoadingAppointments(false);
    }
  };

  // Function to open appointment modal
  const openAppointmentModal = (lead: Lead) => {
    setSelectedLead(lead);
    setShowAppointmentModal(true);
    fetchLeadAppointments(lead);
  };

  // Function to close appointment modal
  const closeAppointmentModal = () => {
    setShowAppointmentModal(false);
    setSelectedLead(null);
    setLeadAppointments([]);
  };

  // Booking: open modal and preload services and lead info
  const openBookModal = async (lead: Lead) => {
    try {
      setBookingLead(lead);
      setShowBookModal(true);
      setBookName(lead.name || '');
      setBookEmail(lead.email || '');
      setBookPhone(lead.phone || '');
      setBookNotes('');
      let currentServices = services;
      if (currentServices.length === 0) {
        const res = await fetch(API_URLS.ADMIN_SERVICES);
        if (res.ok) {
          const data = await res.json();
          currentServices = (data || []).map((s: { id: string; name: string }) => ({ id: s.id, name: s.name }));
          setServices(currentServices);
        }
      }
      const defSvc = currentServices.find((s: { name?: string }) => (s.name || '').toLowerCase() === 'sales') || currentServices[0];
      if (defSvc) {
        setSelectedServiceId(defSvc.id);
        setSelectedServiceName(defSvc.name);
        await loadSlotsForService(defSvc.id);
      } else {
        setSelectedServiceName('');
      }
    } catch (e) {
      console.warn('Open book modal error', e);
    }
  };

  const loadSlotsForService = async (serviceId: string) => {
    try {
      const res = await fetch(`${API_URLS.AVAILABILITY_SLOTS}?service_id=${encodeURIComponent(serviceId)}`);
      if (!res.ok) return;
      const data = await res.json();
      setRawSlots(data);
      const byDate: Record<string, { capacity: number; booked: number }> = {};
      (data || []).forEach((slot: { start_utc?: string; capacity?: number; booked?: number }) => {
        const date = (slot.start_utc || '').split('T')[0];
        if (!date) return;
        if (!byDate[date]) byDate[date] = { capacity: 0, booked: 0 };
        byDate[date].capacity += Number(slot.capacity || 0);
        byDate[date].booked += Number(slot.booked || 0);
      });
      const dates = Object.entries(byDate).map(([date, v]) => ({
        date,
        status: v.capacity - v.booked > 0 ? 'available' as const : 'full' as const,
        slots: v.capacity - v.booked,
        capacity: v.capacity,
      })).sort((a, b) => a.date.localeCompare(b.date));
      setAvailableDates(dates);
      setSelectedDate('');
      setDateSlots([]);
      setSelectedSlotId('');
    } catch (e) {
      console.warn('Load slots error', e);
    }
  };

  const handleDatePick = (date: string) => {
    setSelectedDate(date);
    setShowDatePicker(false);
    const list = rawSlots.filter((s: { start_utc?: string }) => (s.start_utc || '').startsWith(date)).map((s: { start_utc?: string; end_utc?: string; id: string; capacity?: number; booked?: number }) => {
      const startUtc = s.start_utc || '';
      const endUtc = s.end_utc || '';
      const start = startUtc.split('T')[1]?.slice(0, 5) || '';
      const end = endUtc.split('T')[1]?.slice(0, 5) || '';
      const avail = Math.max(0, Number(s.capacity || 0) - Number(s.booked || 0));
      return { id: s.id, label: `${start} - ${end} (${avail} available)`, available: avail };
    }).filter((s: { available: number }) => s.available > 0);
    setDateSlots(list);
    setSelectedSlotId(list[0]?.id || '');
  };

  const submitLeadBooking = async () => {
    if (bookingSubmitting) return;
    if (!bookingLead || !selectedServiceId || !selectedSlotId) return;
    const slot = rawSlots.find(s => s.id === selectedSlotId);
    if (!slot || !slot.start_utc) return;
    const date = slot.start_utc.split('T')[0];
    const time = slot.start_utc.split('T')[1]?.slice(0, 5) || '';
    try {
      setBookingSubmitting(true);
      const leadIdStr = String(bookingLead.id || '');
      const appointmentReason = bookNotes || `Appointment booked from Leads page for ${selectedServiceName || 'Sales'}`;
      const payload = {
        lead_id: leadIdStr,
        date,
        time,
        notes: appointmentReason,
        status: 'confirmed',
        booked_by: 'leads',
        source_id: leadIdStr,
        source_name: bookingLead.name || 'Lead',
        service_id: selectedServiceId,
        service_name: selectedServiceName || 'Sales',
        customer_name: bookName || bookingLead.name,
        customer_email: bookEmail || bookingLead.email,
        customer_phone: bookPhone || bookingLead.phone,
        type: 'create',
        reason: appointmentReason,
      } as Record<string, unknown>;
      const res = await fetch(`${API_URLS.APPOINTMENTS}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setShowBookModal(false);
        setShowAlert(true); setAlertType('success'); setAlertMessage('Appointment booked successfully and notification sent.');
      } else {
        let msg = '';
        try { if (!res.bodyUsed) msg = await res.text(); } catch { }
        if (!msg) msg = `${res.status} ${res.statusText}`;
        setShowAlert(true); setAlertType('error'); setAlertMessage(`Booking failed: ${msg}`);
      }
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      setShowAlert(true); setAlertType('error'); setAlertMessage(`Booking failed: ${errorMessage}`);
    } finally {
      setBookingSubmitting(false);
    }
  };

  // Edit appointment helpers (ported)
  interface AppointmentForEdit {
    date?: string;
    reason?: string;
    notes?: string;
    id?: string;
    [key: string]: unknown;
  }
  interface SlotData {
    start_utc?: string;
    end_utc?: string;
    capacity?: number;
    booked?: number;
    [key: string]: unknown;
  }
  const openEditAppointmentModal = async (appointment: AppointmentForEdit) => {
    try {
      setEditingAppointment(appointment);
      const normalizedDate = appointment.date ? appointment.date.split('T')[0] : '';
      setEditDate(normalizedDate);
      setEditNotes(appointment.reason || appointment.notes || '');
      setShowCancelReason(false);
      setCancelReason('');
      setEditSelectedSlotId('');
      setEditShowDatePicker(false);
      setShowEditAppointmentModal(true);

      let serviceId: string | undefined = undefined;
      if (appointment.service_id !== undefined && appointment.service_id !== null) {
        serviceId = String(appointment.service_id);
      }
      if (!serviceId && appointment.service_name) {
        const res = await fetch(API_URLS.ADMIN_SERVICES);
        if (res.ok) {
          const data = await res.json();
          interface Service {
            id: string | number;
            name: string;
          }
          const fetchedServices = (data || []).map((s: Service) => ({ id: s.id, name: s.name }));
          const matchedService = fetchedServices.find((s: Service) => s.name === appointment.service_name);
          if (matchedService) serviceId = String(matchedService.id);
        }
      }
      if (serviceId) {
        const appointmentTime = appointment.time !== undefined && appointment.time !== null
          ? String(appointment.time)
          : '';
        await loadEditSlotsForService(serviceId, normalizedDate, appointmentTime);
      }
    } catch (e) {
      console.warn('Open edit modal error', e);
    }
  };

  const loadEditSlotsForService = async (serviceId: string, currentDate: string, currentTime: string) => {
    try {
      const res = await fetch(`${API_URLS.AVAILABILITY_SLOTS}?service_id=${encodeURIComponent(serviceId)}`);
      if (!res.ok) return;
      const data = await res.json();
      setEditRawSlots(data);
      const byDate: Record<string, { capacity: number; booked: number }> = {};
      (data || []).forEach((slot: SlotData) => {
        const date = (slot.start_utc || '').split('T')[0];
        if (!date) return;
        if (!byDate[date]) byDate[date] = { capacity: 0, booked: 0 };
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
        const dateExists = dates.find(d => d.date === normalizedCurrentDate);
        if (!dateExists) {
          dates.push({ date: normalizedCurrentDate, status: 'available' as const, slots: 1, capacity: 1 });
          dates.sort((a, b) => a.date.localeCompare(b.date));
        }
        setEditDate(normalizedCurrentDate);
        handleEditDatePick(normalizedCurrentDate, currentTime);
      }
      setEditAvailableDates(dates);
    } catch (e) {
      console.warn('Load edit slots error', e);
    }
  };

  const handleEditDatePick = (date: string, currentTime?: string) => {
    setEditDate(date);
    setEditShowDatePicker(false);
    const slotsForDate = (editRawSlots || []).filter((slot: SlotData) => {
      const slotDate = (slot.start_utc || '').split('T')[0];
      return slotDate === date;
    });
    const formattedSlots = slotsForDate.map((slot: SlotData): FormattedSlot => {
      const startUtc = slot.start_utc || '';
      const endUtc = slot.end_utc || '';
      const startTime = startUtc.split('T')[1]?.slice(0, 5) || '';
      const endTime = endUtc.split('T')[1]?.slice(0, 5) || '';
      const label = startTime === endTime ? startTime : `${startTime}-${endTime}`;
      const capacity = slot.capacity || 0;
      const booked = slot.booked || 0;
      const slotId = typeof slot.id === 'string' ? slot.id : String(slot.id || '');
      return {
        id: slotId,
        label: `${label} (${capacity - booked}/${capacity} available)`,
        available: capacity - booked,
        start_utc: startUtc,
      };
    }).filter((s: FormattedSlot) => s.available > 0 || currentTime).sort((a: FormattedSlot, b: FormattedSlot) => {
      const aTime = a.start_utc.split('T')[1];
      const bTime = b.start_utc.split('T')[1];
      return (aTime || '').localeCompare(bTime || '');
    });
    setEditDateSlots(formattedSlots);
    if (currentTime && formattedSlots.length > 0) {
      const matchingSlot = formattedSlots.find((s: FormattedSlot) => {
        const slotTime = s.start_utc.split('T')[1]?.slice(0, 5);
        return slotTime === currentTime;
      });
      setEditSelectedSlotId(matchingSlot ? matchingSlot.id : formattedSlots[0].id);
    } else if (formattedSlots.length > 0) {
      setEditSelectedSlotId(formattedSlots[0].id);
    }
  };

  const submitUpdateAppointment = async () => {
    if (editSubmitting || !editingAppointment || !editDate || !editSelectedSlotId) return;
    const slot = editRawSlots.find((s: SlotData & { id?: string }) => s.id === editSelectedSlotId);
    if (!slot || !slot.start_utc) return;
    const time = slot.start_utc.split('T')[1]?.slice(0, 5) || '';
    try {
      setEditSubmitting(true);
      const res = await fetch(`${API_URLS.APPOINTMENTS.replace('/appointments', '')}/lead/appointments/${editingAppointment.id}/reschedule`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_date: editDate, new_time: time, reason: editNotes || editingAppointment.reason || 'Rescheduled by admin' }),
      });
      if (res.ok) {
        setShowAlert(true); setAlertType('success'); setAlertMessage('Appointment updated successfully.');
        setShowEditAppointmentModal(false);
        if (selectedLead) fetchLeadAppointments(selectedLead);
      } else {
        const msg = await res.text().catch(() => `${res.status} ${res.statusText}`);
        setShowAlert(true); setAlertType('error'); setAlertMessage(`Update failed: ${msg}`);
      }
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      setShowAlert(true); setAlertType('error'); setAlertMessage(`Update failed: ${errorMessage}`);
    } finally {
      setEditSubmitting(false);
    }
  };

  const submitCancelAppointment = async () => {
    if (editSubmitting || !editingAppointment) return;
    if (!cancelReason.trim()) { setShowAlert(true); setAlertType('error'); setAlertMessage('Please provide a reason for cancellation.'); return; }
    try {
      setEditSubmitting(true);
      const res = await fetch(`${API_URLS.APPOINTMENTS.replace('/appointments', '')}/lead/appointments/${editingAppointment.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: cancelReason }),
      });
      if (res.ok) {
        setShowAlert(true); setAlertType('success'); setAlertMessage('Appointment cancelled successfully.');
        setShowEditAppointmentModal(false);
        if (selectedLead) fetchLeadAppointments(selectedLead);
      } else {
        const msg = await res.text().catch(() => `${res.status} ${res.statusText}`);
        setShowAlert(true); setAlertType('error'); setAlertMessage(`Cancellation failed: ${msg}`);
      }
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      setShowAlert(true); setAlertType('error'); setAlertMessage(`Cancellation failed: ${errorMessage}`);
    } finally {
      setEditSubmitting(false);
    }
  };

  // Helper function to get proper Lead ID (not MongoDB _id)
  const getLeadId = (lead: Lead): string => {
    // Helper function to check if a string is MongoDB ObjectId
    const isMongoObjectId = (str: string): boolean => {
      return str.length === 24 && /^[0-9a-fA-F]{24}$/i.test(str);
    };

    // Priority 1: Check if id exists and is NOT a MongoDB ObjectId
    // This is the most common case - database has id: "LD-32"
    if (lead.id !== undefined && lead.id !== null) {
      const idStr = String(lead.id).trim();
      // NEVER return MongoDB ObjectId from lead.id
      if (!isMongoObjectId(idStr) && idStr.length > 0) {
        return idStr;
      }
    }

    // Priority 2: Check lead_id field (if exists) - sometimes API uses this field name
    if (lead.lead_id !== undefined && lead.lead_id !== null) {
      const idStr = String(lead.lead_id).trim();
      if (!isMongoObjectId(idStr) && idStr.length > 0) {
        return idStr;
      }
    }

    // Priority 3: Check _id ONLY if it's in LD- format (custom ID format)
    // NEVER return MongoDB ObjectId from _id
    if (lead._id !== undefined && lead._id !== null) {
      const idStr = String(lead._id).trim();
      // Only return _id if it starts with "LD-" (custom format)
      if (idStr.startsWith('LD-')) {
        return idStr;
      }
      // If _id is MongoDB ObjectId, skip it completely
    }

    // If nothing matches, return empty string
    return '';
  };

  // Assignment functions
  const fetchAgents = async () => {
    setLoadingAgents(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/lead-assignment/agent-profiles`);
      if (response.ok) {
        const agents = await response.json();
        setAvailableAgents(agents || []);
      } else {
        console.error('Failed to fetch agents');
        setAvailableAgents([]);
        showAlertMessage('Failed to load agents. Please try again.', 'error');
      }
    } catch (error) {
      console.error('Error fetching agents:', error);
      setAvailableAgents([]);
      showAlertMessage('Error loading agents. Please try again.', 'error');
    } finally {
      setLoadingAgents(false);
    }
  };

  const openAssignModal = async (lead: Lead) => {
    setAssigningLead(lead);
    // Check if lead is already assigned
    const currentAgentId = lead?.assignment?.assigned_agent_id ||
      lead?.assignment?.assigned_to ||
      lead?.assignment_results?.assigned_agent?.agent_id;
    setSelectedAgentId(currentAgentId || '');
    setShowAssignModal(true);
    await fetchAgents();
  };

  const closeAssignModal = () => {
    setShowAssignModal(false);
    setAssigningLead(null);
    setSelectedAgentId('');
    setAvailableAgents([]);
  };

  const updateAssignmentInState = (leadIdentifier: string, agentId: string, agentName: string) => {
    if (!leadIdentifier) return;

    const updateLeadEntry = (lead: Lead) => {
      const leadKey = getLeadId(lead) || (lead.id ? String(lead.id) : '');
      if (!leadKey) return lead;
      if (leadKey !== leadIdentifier) return lead;

      const updatedAssignment = {
        ...(lead.assignment || {}),
        assigned_agent_id: agentId,
        assigned_to: agentId,
        assigned_to_name: agentName,
      };

      const existingAssignmentResults = lead.assignment_results || {};
      const updatedAssignmentResults = {
        ...existingAssignmentResults,
        assigned_agent: {
          ...(existingAssignmentResults?.assigned_agent || {}),
          agent_id: agentId,
          name: agentName,
        },
      };

      return {
        ...lead,
        assignment: updatedAssignment,
        assignment_results: updatedAssignmentResults,
        assigned_to_name: agentName,
        assigned_to: agentId,
        agent: agentName,
      };
    };

    setLeadsData((prev) => prev.map(updateLeadEntry));
    setFilteredLeads((prev) => prev.map(updateLeadEntry));
  };

  // Handler for Sales role reassignment confirmation
  const handleConfirmReassignment = async () => {
    if (!reassignmentReason.trim() || reassignmentReason.trim().length < 10) {
      showAlertMessage('Please provide a reason for reassignment (minimum 10 characters).', 'error');
      return;
    }

    if (!pendingAssignment) {
      showAlertMessage('Pending assignment data not found', 'error');
      return;
    }

    // Use Sales-specific reassign endpoint
    setAssigning(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/leads-integration/reassign`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lead_id: pendingAssignment.leadId,
          to_agent_id: pendingAssignment.agentId,
          reason: reassignmentReason.trim()
        }),
      });

      if (response.ok) {
        await response.json(); // Response not used
        showAlertMessage('Lead reassigned successfully and Sales Head notified!', 'success');
        setShowReasonModal(false);
        setReassignmentReason('');
        setPendingAssignment(null);
        const reassignedAgentName = availableAgents.find(a => a.agent_id === pendingAssignment.agentId)?.agent_name;
        updateAssignmentInState(pendingAssignment.leadId, pendingAssignment.agentId, reassignedAgentName || 'Agent');
        setTimeout(() => {
          fetchLeads();
        }, 500);
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        showAlertMessage(`Reassignment failed: ${errorData.error || errorData.detail || 'Unknown error'}`, 'error');
      }
    } catch (error) {
      console.error('Error reassigning lead:', error);
      showAlertMessage('Error reassigning lead. Please try again.', 'error');
    } finally {
      setAssigning(false);
    }
  };

  const handleAssignLead = async () => {
    if (!assigningLead || !selectedAgentId) {
      showAlertMessage('Please select an agent to assign.', 'error');
      return;
    }

    // Check if trying to reassign to the same agent - check ALL possible fields
    const currentAgentId = assigningLead?.assignment?.assigned_agent_id ||
      assigningLead?.assignment?.assigned_to ||
      assigningLead?.assignment_results?.assigned_agent?.agent_id ||
      (assigningLead as { assigned_to?: string })?.assigned_to ||
      assigningLead?.agent_id;
    if (currentAgentId && currentAgentId === selectedAgentId) {
      showAlertMessage('This lead is already assigned to the selected agent. Please choose a different agent.', 'error');
      return;
    }

    const leadId = getLeadId(assigningLead);
    if (!leadId) {
      showAlertMessage('Lead ID not found. Cannot assign.', 'error');
      return;
    }

    // Get current user and determine their role - DO THIS EARLY
    const currentUser = AuthService.getInstance().getCurrentUser();
    interface UserWithNestedRoles {
      roles?: unknown[];
      user?: {
        roles?: unknown[];
        role_id?: string;
        role_name?: string;
      };
      role_id?: string;
      role_name?: string;
    }
    const currentUserWithRoles = currentUser as UserWithNestedRoles;

    // Try to get roles from multiple sources:
    // 1. currentUser.roles
    // 2. currentUser.user.roles  
    // 3. localStorage loginResponse
    // 4. user_roles cookie
    let userRolesArray: unknown[] = (currentUserWithRoles?.roles || currentUserWithRoles?.user?.roles || []) as unknown[];

    // Check localStorage for loginResponse (backend stores roles there)
    if (userRolesArray.length === 0 && typeof window !== 'undefined') {
      try {
        const loginResponse = localStorage.getItem('loginResponse');
        if (loginResponse) {
          const parsed = JSON.parse(loginResponse);
          if (parsed.roles && Array.isArray(parsed.roles)) {
            userRolesArray = parsed.roles;
            console.log('✅ Found roles in localStorage loginResponse:', userRolesArray);
          }
        }
      } catch (e) {
        console.warn('Could not parse loginResponse from localStorage:', e);
      }

      // Check user_roles cookie (backend sets this)
      if (userRolesArray.length === 0) {
        const cookies = document.cookie.split(';');
        const userRolesCookie = cookies.find(c => c.trim().startsWith('user_roles='));
        if (userRolesCookie) {
          const rolesValue = userRolesCookie.split('=')[1];
          if (rolesValue) {
            userRolesArray = rolesValue.split(',').map(r => r.trim());
            console.log('✅ Found roles in user_roles cookie:', userRolesArray);
          }
        }
      }
    }

    const userRoleId = currentUser?.role_id || currentUserWithRoles?.user?.role_id;
    const userRoleName = currentUser?.role_name || currentUserWithRoles?.user?.role_name;

    console.log('🔍 [EARLY CHECK] Current user object:', {
      currentUser,
      user: currentUserWithRoles?.user,
      roles: userRolesArray,
      role_id: userRoleId,
      role_name: userRoleName,
      'currentUser.roles': currentUserWithRoles?.roles,
      'currentUser.user.roles': currentUserWithRoles?.user?.roles
    });

    // PRIORITY: Check roles array FIRST (backend sends: ['Sales'] or ['sales'])
    // This is the most reliable method since backend explicitly sends this
    let isSalesInRolesArray = false;
    if (Array.isArray(userRolesArray) && userRolesArray.length > 0) {
      interface Role {
        role_name?: string;
        name?: string;
        [key: string]: unknown;
      }
      isSalesInRolesArray = userRolesArray.some((r: unknown) => {
        const role = r as Role | string;
        const roleStr = typeof role === 'string' ? role : (role?.role_name || role?.name || String(role));
        const roleLower = roleStr.toLowerCase().trim();
        // Check for exact match or contains 'sales'
        const isSales = roleLower === 'sales' ||
          roleLower === 'sales manager' ||
          roleLower === 'sales_agent' ||
          roleLower === 'salesagent' ||
          roleLower.includes('sales') ||
          roleLower === '4';
        if (isSales) {
          console.log('✅ Found Sales role in roles array:', roleStr, '→ normalized:', roleLower);
        }
        return isSales;
      });
    }

    // Method 2: Use getUserRole function - try both currentUser and currentUser.user
    let userRole = getUserRole(currentUser as UserWithRoles | null);
    let isSalesByGetUserRole = userRole === UserRole.SALES;

    // If getUserRole didn't detect Sales, try with nested user object  
    if (!isSalesByGetUserRole && currentUserWithRoles?.user) {
      userRole = getUserRole(currentUserWithRoles.user as UserWithRoles);
      isSalesByGetUserRole = userRole === UserRole.SALES;
      if (isSalesByGetUserRole) {
        console.log('✅ Found Sales role via getUserRole with nested user object');
      }
    }

    // Method 3: Check role_id (common: "4" is Sales, but also check MongoDB ObjectId)
    // Note: role_id might be a MongoDB ObjectId, so we need to check the actual role from backend
    const roleId = String(userRoleId || '').trim();
    const isSalesByRoleId = roleId === '4' ||
      roleId.toLowerCase().includes('sales') ||
      roleId === 'sales' ||
      roleId === 'sales_agent';

    // Method 4: Check role_name
    const roleName = String(userRoleName || '').toLowerCase().trim();
    const isSalesByRoleName = roleName === 'sales' ||
      roleName.includes('sales') ||
      roleName.includes('sales_manager') ||
      roleName.includes('sales_agent') ||
      roleName.includes('salesagent');

    // Method 5: Fallback - check entire user object as string (last resort)
    let isSalesByStringSearch = false;
    if (currentUser) {
      try {
        const userString = JSON.stringify(currentUser).toLowerCase();
        isSalesByStringSearch = userString.includes('"sales"') ||
          userString.includes('"sales_agent"') ||
          userString.includes('"salesagent"') ||
          (userString.includes('sales') && userString.includes('agent'));
        if (isSalesByStringSearch) {
          console.log('✅ Found Sales role via string search on user object');
        }
      } catch (e) {
        console.warn('Could not stringify user object for role check:', e);
      }
    }

    // FINAL: If ANY method detects Sales, consider it Sales role
    // Prioritize roles array check since backend explicitly sends this
    const isSalesUser = isSalesInRolesArray ||
      isSalesByGetUserRole ||
      isSalesByRoleId ||
      isSalesByRoleName ||
      isSalesByStringSearch;

    console.log('🔍 User role check:', {
      userRole,
      isSalesUser,
      isSalesByGetUserRole,
      isSalesInRolesArray,
      isSalesByRoleId,
      isSalesByRoleName,
      isSalesByStringSearch,
      role_id: userRoleId,
      role_name: userRoleName,
      roles: userRolesArray,
      'currentUser.roles': currentUserWithRoles?.roles,
      'currentUser.user.roles': currentUserWithRoles?.user?.roles,
      fullUserObject: currentUser
    });

    // Check if this is a reassignment
    // Normalize both IDs to strings for reliable comparison
    const currentAgentIdNormalized = currentAgentId ? String(currentAgentId).trim().toLowerCase() : '';
    const selectedAgentIdNormalized = selectedAgentId ? String(selectedAgentId).trim().toLowerCase() : '';

    // A reassignment is when:
    // 1. There's a current agent assigned (currentAgentIdNormalized exists)
    // 2. A different agent is selected (selectedAgentIdNormalized exists and is different)
    const isReassignment = currentAgentIdNormalized.length > 0 &&
      selectedAgentIdNormalized.length > 0 &&
      currentAgentIdNormalized !== selectedAgentIdNormalized;

    console.log('🔍 Reassignment check:', {
      currentAgentId,
      currentAgentIdNormalized,
      selectedAgentId,
      selectedAgentIdNormalized,
      isReassignment
    });

    // IMPORTANT: Show reason modal ONLY for Sales users when reassigning
    // All other users (Admin, Super Admin, etc.) should directly reassign without modal
    const shouldShowReasonModal = isSalesUser && isReassignment;

    console.log('🔍 Should show reason modal?', {
      shouldShowReasonModal,
      isSalesUser,
      isReassignment,
      userRole,
      currentAgentId,
      selectedAgentId,
      breakdown: {
        'isSalesUser': isSalesUser,
        'isReassignment': isReassignment,
        'currentAgentIdExists': !!currentAgentId,
        'selectedAgentIdExists': !!selectedAgentId,
        'agentsAreDifferent': currentAgentId !== selectedAgentId
      }
    });

    // If Sales user is reassigning, show reason modal
    if (shouldShowReasonModal) {
      console.log('✅✅✅ Sales user reassigning - showing reason modal');
      console.log('✅✅✅ Modal will be shown - stopping execution here');

      try {
        const selectedAgent = availableAgents.find(a => a.agent_id === selectedAgentId);
        setPendingAssignment({
          leadId: leadId,
          agentId: selectedAgentId,
          agentName: selectedAgent?.agent_name || 'Unknown Agent'
        });
        console.log('✅✅✅ Pending assignment set:', { leadId, agentId: selectedAgentId });

        // Close the assignment modal first, then show reason modal
        setShowAssignModal(false);
        console.log('✅✅✅ Assignment modal closed');

        // Use setTimeout to ensure assignment modal closes before reason modal opens
        setTimeout(() => {
          setShowReasonModal(true);
          console.log('✅✅✅ Reason modal state set to TRUE - modal should now be visible');
        }, 100);

        // CRITICAL: Return here to prevent API call
        return;
      } catch (error) {
        console.error('❌ Error showing reason modal:', error);
        // Fall through to direct assignment if modal setup fails
      }
    } else {
      console.log('ℹ️ NOT showing reason modal. Proceeding with direct assignment:', {
        isSalesUser,
        isReassignment,
        userRole,
        currentAgentId,
        selectedAgentId,
        reason: !isSalesUser ? 'Not a Sales user' :
          !isReassignment ? 'Not a reassignment' : 'Unknown'
      });
    }

    // For Admin/Super Admin or non-reassignment: Proceed with original endpoint
    setAssigning(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/lead-assignment/assign-lead`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lead_id: leadId,
          target_agent_id: selectedAgentId,
          assigned_by: 'Super Admin',
          override_rules: true
        }),
      });

      if (response.ok) {
        await response.json(); // Response not used
        const currentAgentId = assigningLead?.assignment?.assigned_agent_id ||
          assigningLead?.assignment?.assigned_to ||
          assigningLead?.assignment_results?.assigned_agent?.agent_id;
        const isReassignment = currentAgentId && currentAgentId !== selectedAgentId;

        showAlertMessage(
          isReassignment
            ? `Lead successfully reassigned to new agent!`
            : `Lead successfully assigned to agent!`,
          'success'
        );
        const assignedAgentName = availableAgents.find(a => a.agent_id === selectedAgentId)?.agent_name;
        updateAssignmentInState(leadId, selectedAgentId, assignedAgentName || 'Agent');
        closeAssignModal();
        // Wait a moment for backend to process, then refresh leads data
        setTimeout(() => {
          fetchLeads();
        }, 500);
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        showAlertMessage(`Assignment failed: ${errorData.error || errorData.detail || 'Unknown error'}`, 'error');
      }
    } catch (error) {
      console.error('Error assigning lead:', error);
      showAlertMessage('Error assigning lead. Please try again.', 'error');
    } finally {
      setAssigning(false);
    }
  };

  // Restore fetchLeads function

  const fetchLeads = () => {
    setLoading(true);

    // Add cache-busting timestamp to ensure fresh data
    const timestamp = Date.now();
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/leads-integration/?t=${timestamp}`, {
      headers: {
        ...getAuthHeaders(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      },
      // credentials: 'include', // Removed to fix CORS error - using Bearer token auth instead

      cache: 'no-store'
    })
      .then((res) => res.json())
      .then(async (data) => {
        // Debug: Log the raw API response to see what backend is sending
        if (process.env.NODE_ENV === 'development' && Array.isArray(data) && data.length > 0) {
          console.log('📋 Raw API Response (first lead):', data[0]);
          console.log('📋 All fields in first lead:', Object.keys(data[0]));
          console.log('📋 Full first lead object:', JSON.stringify(data[0], null, 2));

          // Check if custom ID exists in any field
          const firstLead = data[0];
          const hasLdId = Object.values(firstLead).some((val: unknown) => {
            if (typeof val === 'string') {
              return val.startsWith('LD-');
            }
            return false;
          });
          console.log('📋 Has LD- format ID anywhere?', hasLdId);

          // Verify status field is present
          console.log('📋 Status field in first lead:', firstLead.status);
          console.log('📋 Stage field in first lead:', firstLead.stage);
          if (firstLead.status && firstLead.stage && firstLead.status !== firstLead.stage) {
            console.warn('⚠ Status and stage mismatch:', { status: firstLead.status, stage: firstLead.stage });
          }
        }

        if (Array.isArray(data) && data.length > 0) {
          // Helper to derive numeric sequence from Lead ID (LD-###)
          const getLeadSequenceNumber = (lead: Lead): number => {
            const leadId = getLeadId(lead) || lead?.id || lead?._id;
            if (typeof leadId !== 'string') {
              return 0;
            }
            const match = leadId.trim().match(/^LD-(\d+)$/i);
            if (!match) {
              return 0;
            }
            return parseInt(match[1], 10) || 0;
          };

          const getLeadCreatedTimestamp = (lead: Lead): number => {
            const candidates = [
              lead?.created_at,
              lead?.createdAt,
              lead?.created_date,
              lead?.createdDate,
              lead?.createdOn,
              lead?.created,
            ];
            for (const candidate of candidates) {
              if (!candidate) continue;
              const date = new Date(candidate);
              if (!Number.isNaN(date.getTime())) {
                return date.getTime();
              }
            }
            return 0;
          };

          // Backend now returns custom IDs (LD-XXX format) directly in the 'id' field
          // No need to make individual API calls - this eliminates N+1 query problem
          // The clean_id function in backend now preserves custom IDs
          // Normalize lead IDs - ensure id field contains Lead ID, not MongoDB _id
          // Use same logic as lead-integration page for consistency
          const normalizedLeads = data.map((lead: Lead) => {
            // Store original values for debugging
            const originalId = lead.id;
            const originalLeadId = lead.lead_id;
            const originalMongoId = lead._id;

            // Helper function to check if a string is MongoDB ObjectId
            const isMongoObjectId = (str: string): boolean => {
              return str.length === 24 && /^[0-9a-fA-F]{24}$/i.test(str);
            };

            // Simple logic: Use lead.id if it exists and is NOT a MongoDB ObjectId
            // This matches the lead-integration page logic: leadData.id || leadData._id
            let finalId = '';

            // Priority 1: Use lead.id if it exists and is NOT a MongoDB ObjectId
            if (lead.id !== undefined && lead.id !== null) {
              const idStr = String(lead.id).trim();
              // If it's NOT a MongoDB ObjectId, use it (whether it's LD-XX or any other format)
              if (!isMongoObjectId(idStr) && idStr.length > 0) {
                finalId = idStr;
              }
            }

            // Priority 2: Check lead_id field (if lead.id was MongoDB ObjectId or empty)
            if (!finalId && lead.lead_id !== undefined && lead.lead_id !== null) {
              const idStr = String(lead.lead_id).trim();
              if (!isMongoObjectId(idStr) && idStr.length > 0) {
                finalId = idStr;
              }
            }

            // Priority 3: Check ALL string fields for "LD-" format (custom ID)
            // Sometimes the custom ID might be in a different field or nested
            if (!finalId) {
              // Recursive function to search for LD- format in nested objects
              interface ObjectWithId {
                [key: string]: unknown;
              }
              const findLdId = (obj: ObjectWithId, depth = 0): string => {
                if (depth > 3) return ''; // Prevent infinite recursion

                for (const [, value] of Object.entries(obj)) {
                  if (value === null || value === undefined) continue;

                  if (typeof value === 'string') {
                    const strValue = value.trim();
                    if (strValue.startsWith('LD-') && !isMongoObjectId(strValue)) {
                      return strValue;
                    }
                  } else if (typeof value === 'object' && !Array.isArray(value) && value !== null && Object.keys(value).length > 0) {
                    const found = findLdId(value as ObjectWithId, depth + 1);
                    if (found) return found;
                  } else if (Array.isArray(value)) {
                    // Check array items
                    for (const item of value) {
                      if (typeof item === 'string') {
                        const strValue = item.trim();
                        if (strValue.startsWith('LD-') && !isMongoObjectId(strValue)) {
                          return strValue;
                        }
                      } else if (typeof item === 'object') {
                        const found = findLdId(item, depth + 1);
                        if (found) return found;
                      }
                    }
                  }
                }
                return '';
              };

              finalId = findLdId(lead);
            }

            // Priority 4: Check _id ONLY if it's in LD- format (custom ID format)
            // NEVER use _id if it's a MongoDB ObjectId
            if (!finalId && lead._id !== undefined && lead._id !== null) {
              const idStr = String(lead._id).trim();
              // Only use _id if it starts with "LD-" (custom format), never use MongoDB ObjectId
              if (idStr.startsWith('LD-')) {
                finalId = idStr;
              }
            }

            // Also map potential backend score fields to unified score
            const scoreVal = lead?.lead_score ?? lead?.ats_score ?? lead?.score;

            // Preserve the original _id (MongoDB ObjectId) separately but NEVER use it as id
            const normalizedLead = {
              ...lead,
              id: finalId || '', // Set ONLY the custom Lead ID (LD-XX), NEVER MongoDB _id
              originalId: originalId, // Keep original for reference
              originalLeadId: originalLeadId, // Keep original lead_id for reference
              _id: lead._id, // Keep MongoDB _id for reference (but don't display it)
              score: scoreVal
            };

            // Log for debugging (always log in development to see what's happening)
            if (process.env.NODE_ENV === 'development') {
              if (!finalId) {
                console.warn('⚠ No Lead ID found for lead:', {
                  name: lead.name,
                  originalId: originalId,
                  originalLeadId: originalLeadId,
                  _id: originalMongoId,
                  isOriginalIdMongo: originalId ? isMongoObjectId(String(originalId)) : false,
                  allFields: Object.keys(lead)
                });
              } else {
                console.log('✅ Lead ID normalized:', { name: lead.name, originalId, finalId });
              }
            }

            return normalizedLead;
          });

          const sortedLeads = normalizedLeads.sort((a: Lead, b: Lead) => {
            const seqA = getLeadSequenceNumber(a);
            const seqB = getLeadSequenceNumber(b);
            if (seqA !== seqB) {
              return seqB - seqA; // primary: highest lead ID first
            }

            const timeA = getLeadCreatedTimestamp(a);
            const timeB = getLeadCreatedTimestamp(b);
            return timeB - timeA;
          });
          setLeadsData(sortedLeads);
          setFilteredLeads(sortedLeads);
        } else {
          // Fallback sample data for testing
          const sampleData: Lead[] = [
            {
              id: 1,
              name: "John Smith",
              email: "john.smith@example.com",
              phone: "+1-555-0123",
              lead_metadata: "Premium Package interest",
              source: "Website",
              score: 85,
              status: "Open",
              interest: "Premium Package",
              // lead_type: "Hot Lead",
              agent: "Sarah Johnson",
              created_at: new Date().toISOString()
            },
            {
              id: 2,
              name: "Emily Davis",
              email: "emily.davis@example.com",
              phone: "+1-555-0124",
              lead_metadata: "Basic Package interest",
              source: "Referral",
              score: 65,
              status: "New",
              interest: "Basic Package",
              // lead_type: "Warm Lead",
              agent: "Mike Wilson",
              created_at: new Date(Date.now() - 86400000).toISOString()
            },
            {
              id: 3,
              name: "Robert Brown",
              email: "robert.brown@example.com",
              phone: "+1-555-0125",
              lead_metadata: "Enterprise Package interest",
              source: "Cold Call",
              score: 45,
              status: "Closed",
              interest: "Enterprise Package",
              // lead_type: "Cold Lead",
              agent: "Sarah Johnson",
              created_at: new Date(Date.now() - 172800000).toISOString()
            }
          ];
          setLeadsData(sampleData);
          setFilteredLeads(sampleData);
        }
      })
      .catch((error) => {
        console.error('Error fetching leads:', error);
        // Use sample data on error
        const sampleData: Lead[] = [
          {
            id: 1,
            name: "John Smith",
            email: "john.smith@example.com",
            phone: "+1-555-0123",
            lead_metadata: "Premium Package interest",
            source: "Website",
            score: 85,
            status: "Open",
            interest: "Premium Package",
            // lead_type: "Hot Lead",
            agent: "Sarah Johnson",
            created_at: new Date().toISOString()
          },
          {
            id: 2,
            name: "Emily Davis",
            email: "emily.davis@example.com",
            phone: "+1-555-0124",
            lead_metadata: "Basic Package interest",
            source: "Referral",
            score: 65,
            status: "New",
            interest: "Basic Package",
            // lead_type: "Warm Lead",
            agent: "Mike Wilson",
            created_at: new Date(Date.now() - 86400000).toISOString()
          },
          {
            id: 3,
            name: "Robert Brown",
            email: "robert.brown@example.com",
            phone: "+1-555-0125",
            lead_metadata: "Enterprise Package interest",
            source: "Cold Call",
            score: 45,
            status: "Closed",
            interest: "Enterprise Package",
            // lead_type: "Cold Lead",
            agent: "Sarah Johnson",
            created_at: new Date(Date.now() - 172800000).toISOString()
          }
        ];
        setLeadsData(sampleData);
        setFilteredLeads(sampleData);
      })
      .finally(() => setLoading(false));

  };

  // Click-away listener for custom popover

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        showCustomPopover &&
        customPopoverRef.current &&
        !customPopoverRef.current.contains(event.target as Node)
      ) {
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


  // Helper to calculate lead score
  const getLeadScore = React.useCallback((lead: Lead): number | string => {
    // If lead already has a score property, use it
    if (lead.score !== undefined && lead.score !== null) {
      return lead.score;
    }

    // Check alternative score fields commonly used by backend
    const anyLead = lead as unknown as Record<string, unknown>;
    const altScore = (anyLead?.lead_score as number) ?? (anyLead?.ats_score as number) ?? undefined;
    if (typeof altScore === 'number') return altScore;

    // Try cached per-lead score (same key as Lead Integration)
    try {
      const key = String(
        getLeadId(lead) ||
        lead.id ||
        lead?.originalId ||
        lead?.originalLeadId ||
        lead?.lead_id ||
        lead?.leadId ||
        ''
      );
      if (key && scoreCache && typeof scoreCache[key] === 'number') {
        return scoreCache[key];
      }
    } catch { }

    // Try to get interest from lead object first, then from metadata
    let interest = lead.interest || '';

    if (!interest) {
      try {
        const meta = typeof lead.lead_metadata === 'string' ? JSON.parse(lead.lead_metadata) : lead.lead_metadata;
        interest = meta?.interest || '';
      } catch { }
    }

    // Try to find score for interest
    if (interest && leadScores.length > 0) {
      const scoreInterest = leadScores.find(
        (ls) => ls.label && ls.label.trim().toLowerCase() === interest.trim().toLowerCase()
      );
      if (scoreInterest) return scoreInterest.score;
    }

    // Try to find score for source
    if (lead.source && leadScores.length > 0) {
      const scoreSource = leadScores.find(
        (ls) => ls.label && ls.label.trim().toLowerCase() === lead.source.trim().toLowerCase()
      );
      if (scoreSource) return scoreSource.score;
    }

    // Fallback
    return '—';
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadScores]);

  // Advanced filtering logic (field filter + timeline filter + status filter)
  useEffect(() => {
    let filtered = [...leadsData];

    // Apply status filter first
    if (statusFilter && statusFilter !== 'all') {
      filtered = filtered.filter((lead) => {
        const leadStatus = lead.status?.toLowerCase() || 'new';
        if (statusFilter === 'new') {
          return leadStatus === 'new';
        } else if (statusFilter === 'open') {
          // Consider leads as "open" if they are in progress or assigned
          return leadStatus === 'open' || leadStatus === 'in process' || leadStatus === 'assigned';
        }
        return true;
      });
    }

    if (timelineFilter && timelineFilter !== 'all') {
      const now = new Date();
      let start: Date | null = null;
      let end: Date | null = null;

      switch (timelineFilter) {
        case 'today':
          start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
          break;
        case 'yesterday':
          start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
          end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'last12':
          start = new Date(now.getTime() - 12 * 60 * 60 * 1000);
          end = now;
          break;
        case 'last30':
          start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          end = now;
          break;
        case 'thisweek': {
          const day = now.getDay();
          start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day);
          end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
          break;
        }
        case 'lastweek': {
          const day = now.getDay();
          start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day - 7);
          end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day);
          break;
        }
        case 'thismonth':
          start = new Date(now.getFullYear(), now.getMonth(), 1);
          end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
          break;
        case 'lastmonth':
          start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          end = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'custom': {
          const [customStart, customEnd] = pendingCustomRange;
          if (customStart && customEnd) {
            start = new Date(customStart);
            start.setHours(0, 0, 0, 0);
            end = new Date(customEnd);
            end.setHours(23, 59, 59, 999);
          }
          break;
        }
        default:
          break;
      }

      if (start && end) {
        filtered = filtered.filter((lead) => {
          const rawCreated = (
            lead.created_at ??
            (lead as Record<string, unknown>).createdAt ??
            (lead as Record<string, unknown>).created_date ??
            (lead as Record<string, unknown>).createdDate ??
            (lead as Record<string, unknown>).createdOn ??
            (lead as Record<string, unknown>).created ??
            null
          ) as string | number | Date | null;

          const createdDate = rawCreated
            ? new Date(rawCreated as string | number | Date)
            : new Date('');

          if (Number.isNaN(createdDate.getTime())) return false;
          return createdDate >= start! && createdDate < end!;
        });
      }
    }

    if (filterQuery.trim()) {
      const q = filterQuery.trim().toLowerCase();
      filtered = filtered.filter((lead) => {
        const name = lead.name?.toLowerCase() || '';
        const email = lead.email?.toLowerCase() || '';
        const phone = lead.phone?.toLowerCase() || '';
        const source = lead.source?.toLowerCase() || '';
        const channel = lead.channel?.toLowerCase() || '';
        const leadId = (getLeadId(lead) || '').toLowerCase();

        if (filterField === 'name') {
          return name.includes(q);
        } else if (filterField === 'email') {
          return email.includes(q);
        } else if (filterField === 'phone') {
          return phone.includes(q);
        } else if (filterField === 'source') {
          return source.includes(q);
        } else if (filterField === 'channel') {
          return channel.includes(q);
        } else if (filterField === 'interest') {
          let interest = '';
          try {
            const meta = typeof lead.lead_metadata === 'string' ? JSON.parse(lead.lead_metadata) : lead.lead_metadata;
            interest = meta?.interest || '';
          } catch {
            interest = '';
          }
          return interest.toLowerCase().includes(q);
        } else if (filterField === 'score') {
          const calculatedScore = getLeadScore(lead);
          return String(calculatedScore).toLowerCase().includes(q);
        } else if (filterField === 'lead') {
          return leadId.includes(q);
        } else if (filterField === 'agent') {
          let rawAgent = '';
          try {
            const meta = typeof lead.lead_metadata === 'string' ? JSON.parse(lead.lead_metadata) : lead.lead_metadata;
            rawAgent = (lead.agent && lead.agent.trim()) ? lead.agent : (meta?.agent || '');
          } catch {
            rawAgent = (lead.agent && lead.agent.trim()) ? lead.agent : '';
          }
          const rawMatch = rawAgent.toLowerCase().includes(q);
          let displayName = rawAgent;
          if (displayName && displayName.includes('@')) {
            const local = displayName.split('@')[0];
            displayName = local
              .replace(/[._-]+/g, ' ')
              .trim()
              .split(' ')
              .filter(Boolean)
              .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
              .join(' ');
          }
          const displayMatch = displayName ? displayName.toLowerCase().includes(q) : false;
          return rawMatch || displayMatch;
        }

        // Default fallback: search across primary identifiers
        return (
          name.includes(q) ||
          email.includes(q) ||
          phone.includes(q) ||
          source.includes(q) ||
          leadId.includes(q)
        );
      });
    }

    setFilteredLeads(filtered);
  }, [leadsData, filterQuery, filterField, timelineFilter, pendingCustomRange, statusFilter, getLeadScore]);

  // CSV export helper

  const exportToCSV = (data: Record<string, unknown>[], filename: string) => {

    try {

      if (!data || data.length === 0) {

        throw new Error('No data to export');

      }

      const replacer = (key: string, value: unknown) => value === null ? '' : value;

      const header = Object.keys(data[0]);

      const csv = [

        header.join(','),

        ...data.map((row: Record<string, unknown>) => header.map(fieldName => JSON.stringify(row[fieldName], replacer)).join(','))

      ].join('\r\n');

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });

      const link = document.createElement('a');

      // Create object URL

      const url = URL.createObjectURL(blob);

      link.href = url;

      link.download = filename;

      link.style.display = 'none';

      // Append to body, click, and cleanup

      document.body.appendChild(link);

      link.click();

      // Cleanup

      setTimeout(() => {

        document.body.removeChild(link);

        URL.revokeObjectURL(url);

      }, 100);

    } catch (error) {

      console.error('CSV export error:', error);

      throw error;

    }

  };

  // Handle file upload

  const handleFileUpload = async (file: File) => {

    try {

      // Validate file type (Excel and CSV)

      const allowedTypes = [

        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx

        'application/vnd.ms-excel', // .xls

        'text/csv', // .csv

        'application/csv', // .csv (alternative MIME type)

      ];



      if (!allowedTypes.includes(file.type) && !file.name.toLowerCase().endsWith('.csv')) {

        showAlertMessage('Please upload a valid Excel (.xlsx, .xls) or CSV (.csv) file.', 'error');

        return;

      }

      // Validate file size (max 10MB)

      const maxSize = 10 * 1024 * 1024; // 10MB

      if (file.size > maxSize) {

        showAlertMessage('File size must be less than 10MB.', 'error');

        return;

      }

      showAlertMessage('Uploading file...', 'success');



      // Create FormData

      const formData = new FormData();

      formData.append('file', file);

      // Upload file to backend

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/leads-integration/upload-excel`, {

        method: 'POST',

        body: formData,

      });

      if (!response.ok) {

        const errorData = await response.json().catch(() => ({}));

        throw new Error(errorData.detail || `Upload failed: ${response.statusText}`);

      }

      const result = await response.json();

      const uploadedCount = (typeof result.inserted_leads === 'number')

        ? result.inserted_leads

        : (typeof result.valid_leads === 'number')

          ? result.valid_leads

          : (typeof result.total_rows === 'number')

            ? result.total_rows

            : 0;

      showAlertMessage(`Successfully uploaded ${uploadedCount} leads from file!`, 'success');



      // Refresh leads data

      fetchLeads();



    } catch (error) {

      console.error('Upload error:', error);

      showAlertMessage(

        error instanceof Error ? error.message : 'Failed to upload file. Please try again.',

        'error'

      );

    }

  };

  const handleDownloadTemplate = () => {

    try {

      // Simplified headers for easier CSV upload

      const headers = [

        'Name',

        'Email',

        'Company',

        'Mobile',

        'Interest',

        'Source',

        'Channel',

      ];

      const sampleRow = [

        'John Doe', // Name

        'john.doe@example.com', // Email

        'ABC Corporation', // Company

        '+1234567890', // Mobile

        'Python Developer', // Interest

        'LinkedIn', // Source

        'Phone', // Channel

      ];

      const worksheet = XLSX.utils.aoa_to_sheet([headers, sampleRow]);

      const columnWidths = [

        { wch: 20 }, // Name

        { wch: 25 }, // Email

        { wch: 22 }, // Company

        { wch: 18 }, // Mobile

        { wch: 18 }, // Interest

        { wch: 12 }, // Source

        { wch: 12 }, // Channel

      ];

      (worksheet as unknown as Record<string, unknown>)['!cols'] = columnWidths;

      const workbook = XLSX.utils.book_new();

      XLSX.utils.book_append_sheet(workbook, worksheet, "CRM Leads Template");

      const now = new Date();

      const dateStr = now.toISOString().split('T')[0];

      const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');

      const fileName = `CRM_Leads_Template_${dateStr}_${timeStr}.xlsx`;

      XLSX.writeFile(workbook, fileName);

      showAlertMessage(`Template downloaded successfully! File: ${fileName}`, 'success');

    } catch (error) {

      console.error('Template download error:', error);

      showAlertMessage('Failed to download template. Please try again.', 'error');

    }

  };

  const handleExport = (type = 'excel') => {

    try {

      // If any rows are selected, export only those; otherwise export all currentLeads

      const leadsToExport = selectedIds.length > 0

        ? currentLeads.filter(lead => selectedIds.includes(lead.id))

        : currentLeads;

      if (leadsToExport.length === 0) {

        showAlertMessage('No data to export. Please select some leads or ensure there are leads to export.', 'error');

        setDownloadMenuOpen(false);

        setMobileDownloadMenuOpen(false);

        return;

      }

      // Formatter for 24-hour time HH:mm:ss

      const formatTime = (date: Date) => {

        const rawH = date.getHours();

        const h12 = rawH % 12 === 0 ? 12 : rawH % 12; // convert to 12-hour, 12 instead of 0

        const hh = String(h12).padStart(2, '0');

        const mm = String(date.getMinutes()).padStart(2, '0');

        const ss = String(date.getSeconds()).padStart(2, '0');

        return `${hh}:${mm}:${ss}`;

      };

      const dataToExport = leadsToExport.map((lead, index) => ({

        '#': index + 1,

        'Lead ID': lead.id,

        Name: lead.name,

        Email: lead.email,

        Phone: lead.phone,

        Interest: (() => {

          try {

            const meta = typeof lead.lead_metadata === "string" ? JSON.parse(lead.lead_metadata) : lead.lead_metadata;

            return meta?.interest || "—";

          } catch {

            return "—";

          }

        })(),

        Source: lead.source,

        Channel: lead.channel || "—",

        "Lead Score": lead.score ?? "—",

        "Date": `${new Date(lead.created_at).toLocaleDateString("en-GB", {

          day: "numeric",

          month: "short",

          year: "2-digit"

        })}`,

        "Time": `${formatTime(new Date(lead.created_at))}`,

        "File Type": type === 'csv' ? 'CSV' : 'Excel'

      }));

      // Compose file name with date and time

      const now = new Date();

      const yyyy = String(now.getFullYear());

      const mm = String(now.getMonth() + 1).padStart(2, '0');

      const dd = String(now.getDate()).padStart(2, '0');

      const dateStr = `${dd}-${mm}-${yyyy}`;

      const timeStr = formatTime(now); // HH:mm:ss

      const fileExt = type === 'csv' ? 'csv' : 'xlsx';

      const fileName = `leads_${yyyy}-${mm}-${dd}_${dateStr.replace(/-/g, '')}_${timeStr.replace(/:/g, '')}.${fileExt}`;

      if (type === 'csv') {

        exportToCSV(dataToExport, fileName);

        showAlertMessage(`Exported ${leadsToExport.length} leads • File: ${fileName} • Type: ${fileExt.toUpperCase()} • Date: ${dateStr} • Time: ${timeStr}`, 'success');

      } else {

        const worksheet = XLSX.utils.json_to_sheet(dataToExport);

        const workbook = XLSX.utils.book_new();

        XLSX.utils.book_append_sheet(workbook, worksheet, "Leads");

        XLSX.writeFile(workbook, fileName);

        showAlertMessage(`Exported ${leadsToExport.length} leads • File: ${fileName} • Type: ${fileExt.toUpperCase()} • Date: ${dateStr} • Time: ${timeStr}`, 'success');

      }

    } catch (error) {

      console.error('Export error:', error);

      showAlertMessage('Failed to export data. Please try again.', 'error');

    } finally {

      setDownloadMenuOpen(false);

      setMobileDownloadMenuOpen(false);

    }

  };

  const handleSortDate = () => {

    const sorted = [...filteredLeads].sort((a, b) => {

      const dateA = new Date(a.created_at).getTime();

      const dateB = new Date(b.created_at).getTime();

      return sortAsc ? dateA - dateB : dateB - dateA;

    });

    setFilteredLeads(sorted);

    setSortAsc(!sortAsc);

  };

  const handleSortChannel = () => {

    const sorted = [...filteredLeads].sort((a, b) => {

      const channelA = (a.channel || '').toLowerCase();

      const channelB = (b.channel || '').toLowerCase();

      if (channelA === channelB) return 0;

      return sortAsc ? (channelA < channelB ? -1 : 1) : (channelA > channelB ? -1 : 1);

    });

    setFilteredLeads(sorted);

    setSortAsc(!sortAsc);

  };

  // total pages is computed inside Pagination; keep page slicing only

  const currentLeads = filteredLeads.slice(

    (currentPage - 1) * leadsPerPage,

    currentPage * leadsPerPage

  );


  // Helper to get IDs for current page

  const currentPageIds = currentLeads.map(lead => lead.id);

  const allSelected = currentPageIds.length > 0 && currentPageIds.every(id => selectedIds.includes(id));

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {

    if (e.target.checked) {

      setSelectedIds(prev => Array.from(new Set([...prev, ...currentPageIds])));

    } else {

      setSelectedIds(prev => prev.filter(id => !currentPageIds.includes(id)));

    }

  };

  const handleSelectOne = (id: string | number) => (e: React.ChangeEvent<HTMLInputElement>) => {

    if (e.target.checked) {

      setSelectedIds(prev => [...prev, id]);

    } else {

      setSelectedIds(prev => prev.filter(selectedId => selectedId !== id));

    }

  };

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

  // Prevent background scrolling when modal is open

  useEffect(() => {

    if (isCreateModalOpen) {

      // Save current scroll position

      const scrollY = window.scrollY;

      // Prevent scrolling on body

      document.body.style.overflow = 'hidden';

      document.body.style.position = 'fixed';

      document.body.style.top = `-${scrollY}px`;

      document.body.style.width = '100%';

      return () => {

        // Restore scrolling when modal closes

        document.body.style.overflow = '';

        document.body.style.position = '';

        document.body.style.top = '';

        document.body.style.width = '';



        // Restore scroll position

        window.scrollTo(0, scrollY);

      };

    }

  }, [isCreateModalOpen]);

  // Handle Escape key to close help panel

  useEffect(() => {

    const handleEscape = () => {

      // No-op: help overlay removed

    };

    document.addEventListener('keydown', handleEscape);

    return () => document.removeEventListener('keydown', handleEscape);

  }, []);

  // Render Toast using portal above the bell

  // useEffect(() => {

  //   if (error) setError(error);

  // }, [error]);

  // Move the useEffect that closes the modal after error outside of the JSX return, to the top level of the LeadsPage component.

  // useEffect(() => {

  //   if (isCreateModalOpen) {

  //     const timer = setTimeout(() => setIsCreateModalOpen(false), 1200);

  //     return () => clearTimeout(timer);

  //   }

  // }, [isCreateModalOpen]);

  useEffect(() => {

    const handleCloseForm = () => setIsCreateModalOpen(false);

    window.addEventListener("close-lead-form", handleCloseForm);

    // Auto-refresh leads when a lead is added/updated elsewhere in the app

    const handleLeadsUpdated = () => fetchLeads();

    window.addEventListener('leads-updated', handleLeadsUpdated);

    return () => {

      window.removeEventListener("close-lead-form", handleCloseForm);

      window.removeEventListener('leads-updated', handleLeadsUpdated);

    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  // Fetch leads on initial mount
  useEffect(() => {
    fetchLeads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refresh leads when window gains focus (user returns to tab/page)
  useEffect(() => {
    const handleFocus = () => {
      // Only refresh if we're on the CRM-Leads page and not currently loading
      if (!loading && window.location.pathname.includes('/crm-leads')) {
        console.log('🔄 Window focused - refreshing leads data...');
        fetchLeads();
      }
    };

    const handleVisibilityChange = () => {
      // Refresh when tab becomes visible
      if (document.visibilityState === 'visible' && !loading && window.location.pathname.includes('/crm-leads')) {
        console.log('🔄 Tab visible - refreshing leads data...');
        fetchLeads();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  // Duplicate detection helpers

  const emailCount: Record<string, number> = {};

  const phoneCount: Record<string, number> = {};

  const nameCount: Record<string, number> = {};

  const duplicateGroups: Record<string, string[]> = {};

  leadsData.forEach(lead => {

    if (lead.email) emailCount[lead.email] = (emailCount[lead.email] || 0) + 1;

    if (lead.phone) phoneCount[lead.phone] = (phoneCount[lead.phone] || 0) + 1;

    if (lead.name) nameCount[lead.name] = (nameCount[lead.name] || 0) + 1;

    // Create a unique key for name+email+mobile combination

    const duplicateKey = `${lead.name?.toLowerCase().trim()}-${lead.email?.toLowerCase().trim()}-${lead.phone?.trim()}`;

    if (!duplicateGroups[duplicateKey]) {

      duplicateGroups[duplicateKey] = [];

    }

    duplicateGroups[duplicateKey].push(lead.id.toString());

  });

  // helpers kept for reference; not used in current UI

  // const isEmailDuplicate = (lead: Lead) => lead.email && emailCount[lead.email] > 1;

  // const isPhoneDuplicate = (lead: Lead) => lead.phone && phoneCount[lead.phone] > 1;

  // const isNameDuplicate = (lead: Lead) => lead.name && nameCount[lead.name] > 1;

  // New function to check if lead is a true duplicate (name, email, AND mobile all match)

  const isTrueDuplicate = (lead: Lead) => {

    const duplicateKey = `${lead.name?.toLowerCase().trim()}-${lead.email?.toLowerCase().trim()}-${lead.phone?.trim()}`;

    return duplicateGroups[duplicateKey] && duplicateGroups[duplicateKey].length > 1;

  };

  // Modal state for showing last lead detail

  const [modalLead, setModalLead] = useState<Lead | null>(null);

  const [modalType, setModalType] = useState<'email' | 'phone' | null>(null);

  // const handleCellClick = (type: 'email' | 'phone', value: string) => {

  //   // Find the last (most recent) lead with this email/phone

  //   const filtered = leadsData.filter(l => (type === 'email' ? l.email === value : l.phone === value));

  //   if (filtered.length > 0) {

  //     // Sort by created_at descending

  //     const sorted = filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  //     setModalLead(sorted[0]);

  //     setModalType(type);

  //   }

  // };

  const closeModal = () => {

    setModalLead(null);

    setModalType(null);

  };

  // Calculate total count for modalType

  const modalCount = modalLead && modalType === 'email'

    ? leadsData.filter(l => l.email === modalLead.email).length

    : modalLead && modalType === 'phone'

      ? leadsData.filter(l => l.phone === modalLead.phone).length

      : 0;

  // Fetch lead scores on mount

  useEffect(() => {
    const fetchLeadScores = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/leads/wk-lead-scores`, {
          method: 'GET',
          headers: {
            'accept': 'application/json',
          },
        });

        if (!response.ok) {
          console.error('Failed to fetch lead scores:', response.status, response.statusText);
          setLeadScores([]);
          return;
        }

        const data = await response.json();
        setLeadScores(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Error fetching lead scores:', error);
        setLeadScores([]);
      }
    };

    fetchLeadScores();
    // Load scores persisted by Lead Integration page (if available)
    try {
      if (typeof window !== 'undefined') {
        const cached = localStorage.getItem('leadIntegrationScoreCache');
        if (cached) setScoreCache(JSON.parse(cached));
      }
    } catch { }
  }, []);

  // Dynamic status summary computation - Stable calculation to prevent fluctuations
  const statusCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};

    if (!Array.isArray(leadsData) || leadsData.length === 0) {
      return counts;
    }

    // Use a Set to track unique lead IDs to prevent double counting
    const processedIds = new Set<string>();

    try {
      for (const lead of leadsData) {
        // Skip if lead is null/undefined
        if (!lead) continue;

        // Get unique identifier to prevent duplicate counting
        const leadId = String(getLeadId(lead) || lead?._id || lead?.id || '');
        if (!leadId || processedIds.has(leadId)) {
          continue; // Skip duplicates
        }
        processedIds.add(leadId);

        const raw = (lead?.status || '').toString().trim();
        if (!raw) continue;

        const key = raw.toLowerCase();
        counts[key] = (counts[key] || 0) + 1;
      }
    } catch (error) {
      console.error('Error calculating status counts:', error);
    }

    return counts;
  }, [leadsData]);

  // Stable Open Leads count calculation to prevent fluctuations
  const openLeadsCount = React.useMemo(() => {
    if (!Array.isArray(leadsData) || leadsData.length === 0) return 0;

    const openStatusSet = new Set(['open', 'in process', 'pending', 'active', 'follow up', 'in-progress', 'new', 'qualified', 'prospect', 'engaged', 'hot']);
    const closedStatusSet = new Set(['closed', 'close', 'closed won', 'closed lost', 'won', 'lost', 'converted', 'junk', 'cancelled']);

    const processedIds = new Set<string>();
    let openCount = 0;

    for (const lead of leadsData) {
      if (!lead) continue;

      const leadId = getLeadId(lead) || lead?._id || lead?.id || '';
      const leadIdStr = String(leadId || '');
      if (!leadIdStr || processedIds.has(leadIdStr)) continue;
      processedIds.add(leadIdStr);

      const status = typeof lead?.status === 'string' ? lead.status.trim().toLowerCase() : '';
      const stage = typeof lead?.stage === 'string' ? lead.stage.trim().toLowerCase() : '';

      const isOpen = openStatusSet.has(status) || openStatusSet.has(stage);
      const isClosed = closedStatusSet.has(status) || closedStatusSet.has(stage);

      if (isOpen && !isClosed) {
        openCount++;
      }
    }

    return openCount;
  }, [leadsData]);


  const leadMetrics = React.useMemo(() => {
    const baseMetrics = {
      totalLeads: leadsData.length,
      totalTrend: 0,
      totalTrendLabel: leadsData.length ? '+0%' : '0%',
      conversionRate: 0,
      conversionProgress: 0,
      convertedCount: 0,
      avgResponseHours: 0,
      avgResponseLabel: 'N/A',
      responseProgress: 0,
      newLeadsToday: 0,
      growthRate: 0,
      growthLabel: '0%',
      growthPositive: true,
      growthProgress: 0,
    };

    if (!Array.isArray(leadsData) || leadsData.length === 0) {
      const fallbackCount = statusCounts['new'] || 0;
      return {
        ...baseMetrics,
        newLeadsToday: fallbackCount,
      };
    }

    const now = new Date();
    const dayMs = 24 * 60 * 60 * 1000;
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfYesterday = new Date(startOfToday.getTime() - dayMs);
    const startOfCurrentWindow = new Date(startOfToday.getTime() - 7 * dayMs);
    const startOfPreviousWindow = new Date(startOfCurrentWindow.getTime() - 7 * dayMs);

    const convertedStatuses = new Set([
      'converted',
      'closed won',
      'won',
      'successful',
      'closed',
      'sale',
      'completed',
    ]);

    const responseTimes: number[] = [];
    let convertedCount = 0;
    let newToday = 0;
    let yesterday = 0;
    let currentWindowCount = 0;
    let previousWindowCount = 0;

    const parseDate = (input: unknown): Date | null => {
      if (!input || (typeof input === 'object' && Object.keys(input).length === 0)) return null;
      if (typeof input !== 'string' && typeof input !== 'number' && !(input instanceof Date)) return null;
      const date = new Date(input as string | number | Date);
      if (!Number.isNaN(date.getTime())) {
        return date;
      }
      if (typeof input === 'number') {
        const numericDate = new Date(input);
        return Number.isNaN(numericDate.getTime()) ? null : numericDate;
      }
      return null;
    };

    const openStatuses = new Set([
      'open',
      'in process',
      'pending',
      'active',
      'follow up',
      'in-progress',
      'new',
      'qualified',
      'prospect',
      'engaged',
      'hot',
    ]);

    const closedStatuses = new Set([
      'closed',
      'close',
      'closed won',
      'closed lost',
      'won',
      'lost',
      'converted',
      'junk',
      'cancelled',
      'cancelled',
    ]);

    const extractResponseHours = (lead: Lead, createdAt: Date | null): number | null => {
      const numericCandidates = [
        lead?.response_time,
        lead?.avg_response_time,
        lead?.average_response_time,
        lead?.first_response_time,
        (lead?.metrics && typeof lead.metrics === 'object' && !Array.isArray(lead.metrics) ? (lead.metrics as Record<string, unknown>)?.avg_response_time : undefined),
        (lead?.metrics && typeof lead.metrics === 'object' && !Array.isArray(lead.metrics) ? (lead.metrics as Record<string, unknown>)?.average_response_time : undefined),
        (lead?.analytics && typeof lead.analytics === 'object' && !Array.isArray(lead.analytics) ? (lead.analytics as Record<string, unknown>)?.avg_response_time : undefined),
        (lead?.analytics && typeof lead.analytics === 'object' && !Array.isArray(lead.analytics) ? (lead.analytics as Record<string, unknown>)?.average_response_time : undefined),
        (lead?.communication_metrics && typeof lead.communication_metrics === 'object' && !Array.isArray(lead.communication_metrics) ? (lead.communication_metrics as Record<string, unknown>)?.average_response_time : undefined),
        lead?.performance?.avg_response_time,
      ];

      for (const candidate of numericCandidates) {
        if (candidate === undefined || candidate === null) continue;
        const numericValue = typeof candidate === 'string' ? parseFloat(candidate) : Number(candidate);
        if (!Number.isFinite(numericValue) || numericValue <= 0) continue;
        if (numericValue > 48) {
          // Assume value is seconds if unusually large
          return numericValue / 3600;
        }
        return numericValue;
      }

      const responseTimestampCandidates = [
        lead?.first_response_at,
        lead?.first_response_timestamp,
        lead?.response?.first_response_at,
        (lead?.timeline && Array.isArray(lead.timeline) ? undefined : (lead?.timeline as unknown as Record<string, unknown>)?.first_response_at),
        lead?.communication?.first_response_at,
      ];

      for (const candidate of responseTimestampCandidates) {
        const responseDate = parseDate(candidate);
        if (!responseDate || !createdAt) continue;
        const diff = responseDate.getTime() - createdAt.getTime();
        if (diff > 0) {
          return diff / (1000 * 60 * 60);
        }
      }

      return null;
    };

    leadsData.forEach((lead) => {
      const status = typeof lead?.status === 'string' ? lead.status.trim().toLowerCase() : '';
      const stage = typeof lead?.stage === 'string' ? lead.stage.trim().toLowerCase() : '';
      if (convertedStatuses.has(status) || convertedStatuses.has(stage)) {
        convertedCount += 1;
      }

      const createdAt = parseDate(
        lead?.created_at ||
        lead?.createdAt ||
        lead?.created_date ||
        lead?.createdDate ||
        lead?.createdOn ||
        lead?.created
      );

      if (createdAt) {
        const timestamp = createdAt.getTime();
        if (timestamp >= startOfToday.getTime()) {
          newToday += 1;
        } else if (timestamp >= startOfYesterday.getTime()) {
          yesterday += 1;
        }

        if (timestamp >= startOfCurrentWindow.getTime()) {
          currentWindowCount += 1;
        } else if (timestamp >= startOfPreviousWindow.getTime()) {
          previousWindowCount += 1;
        }
      }

      // Only calculate response time for open/active leads, not closed ones
      const isOpen = openStatuses.has(status) || openStatuses.has(stage);
      const isClosed = closedStatuses.has(status) || closedStatuses.has(stage);

      if (isOpen && !isClosed && createdAt) {
        const responseHours = extractResponseHours(lead, createdAt);
        if (responseHours && Number.isFinite(responseHours) && responseHours > 0) {
          responseTimes.push(responseHours);
        } else if (createdAt) {
          // For open leads without recorded response time, calculate time since creation
          const diffHours = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
          if (Number.isFinite(diffHours) && diffHours > 0) {
            responseTimes.push(diffHours);
          }
        }
      }
    });

    const metrics = { ...baseMetrics };
    metrics.convertedCount = convertedCount;

    const conversionRate = leadsData.length > 0 ? (convertedCount / leadsData.length) * 100 : 0;
    const conversionClamped = Number.isFinite(conversionRate) ? Math.max(0, Math.min(100, conversionRate)) : 0;
    metrics.conversionRate = Number(conversionClamped.toFixed(1));
    metrics.conversionProgress = conversionClamped > 0 ? Math.max(6, conversionClamped) : 0;

    const totalTrend = previousWindowCount > 0
      ? ((currentWindowCount - previousWindowCount) / previousWindowCount) * 100
      : (currentWindowCount > 0 ? 100 : 0);

    metrics.totalTrend = Number.isFinite(totalTrend) ? totalTrend : 0;
    metrics.totalTrendLabel = `${metrics.totalTrend >= 0 ? '+' : ''}${Math.abs(metrics.totalTrend).toFixed(0)}%`;

    const averageResponseHours = responseTimes.length > 0
      ? responseTimes.reduce((sum, value) => sum + value, 0) / responseTimes.length
      : 0;

    metrics.avgResponseHours = averageResponseHours;
    if (averageResponseHours > 0) {
      if (averageResponseHours < 1) {
        metrics.avgResponseLabel = `${Math.max(1, Math.round(averageResponseHours * 60))} min`;
      } else {
        metrics.avgResponseLabel = `${averageResponseHours.toFixed(1)} h`;
      }
      const responseTarget = 8; // Target response window in hours
      const efficiency = Math.max(responseTarget - averageResponseHours, 0);
      metrics.responseProgress = Math.max(6, Math.min(100, (efficiency / responseTarget) * 100));
    }

    metrics.newLeadsToday = newToday || statusCounts['new'] || 0;

    const growthRate = yesterday > 0
      ? ((newToday - yesterday) / yesterday) * 100
      : (newToday > 0 ? 100 : 0);

    metrics.growthRate = Number.isFinite(growthRate) ? growthRate : 0;
    metrics.growthPositive = metrics.growthRate >= 0;
    metrics.growthLabel = `${metrics.growthRate >= 0 ? '+' : ''}${Math.abs(metrics.growthRate).toFixed(0)}%`;
    metrics.growthProgress = Math.max(0, Math.min(100, Math.abs(metrics.growthRate)));

    return metrics;
  }, [leadsData, statusCounts]);


  const getStatusCardClasses = (status: string) => {
    // Handle undefined or null status
    if (!status) {
      return { badgeBg: 'bg-gray-700', ring: 'hover:ring-2 hover:ring-gray-400 dark:hover:ring-gray-500' };
    }

    const s = status.toLowerCase();

    if (s === 'in process') return { badgeBg: 'bg-blue-700', ring: 'hover:ring-2 hover:ring-blue-400 dark:hover:ring-blue-500' };

    if (s === 'open') return { badgeBg: 'bg-blue-700', ring: 'hover:ring-2 hover:ring-blue-400 dark:hover:ring-blue-500' };

    if (s === 'pending') return { badgeBg: 'bg-blue-700', ring: 'hover:ring-2 hover:ring-blue-400 dark:hover:ring-blue-500' };

    if (s === 'new') return { badgeBg: 'bg-blue-700', ring: 'hover:ring-2 hover:ring-blue-400 dark:hover:ring-blue-500' };

    if (s === 'won') return { badgeBg: 'bg-blue-700', ring: 'hover:ring-2 hover:ring-blue-400 dark:hover:ring-blue-500' };

    if (s === 'lost') return { badgeBg: 'bg-blue-700', ring: 'hover:ring-2 hover:ring-blue-400 dark:hover:ring-blue-500' };

    if (s === 'junk') return { badgeBg: 'bg-gray-700', ring: 'hover:ring-2 hover:ring-gray-400 dark:hover:ring-gray-500' };

    if (s === 'under contract' || s === 'contract') return { badgeBg: 'bg-blue-700', ring: 'hover:ring-2 hover:ring-blue-400 dark:hover:ring-blue-500' };

    if (s === 'hot') return { badgeBg: 'bg-blue-700', ring: 'hover:ring-2 hover:ring-blue-400 dark:hover:ring-blue-500' };

    if (s === 'engaged') return { badgeBg: 'bg-blue-700', ring: 'hover:ring-2 hover:ring-blue-400 dark:hover:ring-blue-500' };

    if (s === 'prospect') return { badgeBg: 'bg-blue-700', ring: 'hover:ring-2 hover:ring-blue-400 dark:hover:ring-blue-500' };

    if (s === 'qualified') return { badgeBg: 'bg-blue-700', ring: 'hover:ring-2 hover:ring-blue-400 dark:hover:ring-blue-500' };

    if (s === 'closed' || s === 'close') return { badgeBg: 'bg-blue-700', ring: 'hover:ring-2 hover:ring-blue-400 dark:hover:ring-blue-500' };

    return { badgeBg: 'bg-gray-700', ring: 'hover:ring-2 hover:ring-gray-400 dark:hover:ring-gray-500' };

  };

  return (

    <div className="relative min-h-screen bg-gray-50 dark:bg-gray-900">

      {/* Professional Header */}
      <DashboardHeader
        variant="default"
        size="lg"
        title="Leads Management"
        subtitle="Streamline your sales pipeline with advanced lead tracking, intelligent analytics, and smart automation"
        hideTenantPrefix={true}
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Leads Management', href: '/crm-leads' }
        ]}
        icon={() => (
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 sm:w-8 sm:h-8 text-white" aria-hidden="true">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
          </svg>
        )}
      />

      <div className="px-4 py-6 sm:px-6 sm:py-8 lg:px-12 space-y-6 sm:space-y-8">

        {/* Professional Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">

          {/* Total Leads Card */}
          <div
            onClick={() => setStatusFilter('all')}
            className={`group relative overflow-hidden bg-white dark:bg-gray-800 border rounded-3xl p-6 lg:p-8 cursor-pointer hover:-translate-y-2 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-500 ${statusFilter === 'all'
              ? 'border-blue-500 shadow-lg shadow-blue-500/20 bg-blue-50/50 dark:bg-blue-900/10'
              : 'border-gray-200/60 dark:border-gray-700/60'
              }`}
          >
            {/* Professional gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-blue-50/50 dark:from-blue-900/10 dark:to-blue-900/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

            {/* Card content */}
            <div className="relative z-10">
              <div className="flex items-start justify-between mb-6">
                <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/25">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300">
                  {leadMetrics.totalLeads.toLocaleString()}
                </div>
                <div className="text-gray-600 dark:text-gray-400 font-semibold text-lg">Total Leads</div>
                <div className="text-sm text-gray-500 dark:text-gray-500">Total leads in the system</div>
              </div>

              {/* Progress indicator */}
              <div className="mt-6">
                <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
                  <span>Conversion Rate</span>
                  <span className="font-semibold">{`${Number.isFinite(leadMetrics.conversionRate) ? leadMetrics.conversionRate.toFixed(1) : '0.0'}%`}</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full" style={{ width: `${Math.max(0, Math.min(100, leadMetrics.conversionProgress))}%` }}></div>
                </div>
              </div>
            </div>

          </div>

          {/* Open Leads Card */}
          <div
            onClick={() => setStatusFilter('open')}
            className={`group relative overflow-hidden bg-white dark:bg-gray-800 border rounded-3xl p-6 lg:p-8 cursor-pointer hover:-translate-y-2 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-500 ${statusFilter === 'open'
              ? 'border-blue-500 shadow-lg shadow-blue-500/20 bg-blue-50/50 dark:bg-blue-900/10'
              : 'border-gray-200/60 dark:border-gray-700/60'
              }`}
          >
            {/* Professional gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-blue-50/50 dark:from-blue-900/10 dark:to-blue-900/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

            {/* Card content */}
            <div className="relative z-10">
              <div className="flex items-start justify-between mb-6">
                <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/25">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm font-medium">Active</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300">
                  {openLeadsCount}
                </div>
                <div className="text-gray-600 dark:text-gray-400 font-semibold text-lg">Open Leads</div>
                <div className="text-sm text-gray-500 dark:text-gray-500">Leads in progress</div>
              </div>

              {/* Progress indicator */}
              <div className="mt-6">
                <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
                  <span>Response Time</span>
                  <span className="font-semibold">{leadMetrics.avgResponseLabel}</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full" style={{ width: `${Math.max(0, Math.min(100, leadMetrics.responseProgress))}%` }}></div>
                </div>
              </div>
            </div>

          </div>

          {/* New Leads Card */}
          <div
            onClick={() => setStatusFilter('new')}
            className={`group relative overflow-hidden bg-white dark:bg-gray-800 border rounded-3xl p-6 lg:p-8 cursor-pointer hover:-translate-y-2 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-500 ${statusFilter === 'new'
              ? 'border-blue-500 shadow-lg shadow-blue-500/20 bg-blue-50/50 dark:bg-blue-900/10'
              : 'border-gray-200/60 dark:border-gray-700/60'
              }`}
          >
            {/* Professional gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-blue-50/50 dark:from-blue-900/10 dark:to-blue-900/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

            {/* Card content */}
            <div className="relative z-10">
              <div className="flex items-start justify-between mb-6">
                <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/25">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div className={`flex items-center gap-1 ${leadMetrics.growthPositive ? 'text-blue-600 dark:text-blue-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <span className="text-sm font-medium">{leadMetrics.growthLabel}</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300">
                  {leadMetrics.newLeadsToday.toLocaleString()}
                </div>
                <div className="text-gray-600 dark:text-gray-400 font-semibold text-lg">New Leads</div>
                <div className="text-sm text-gray-500 dark:text-gray-500">New opportunities</div>
              </div>

              {/* Progress indicator */}
              <div className="mt-6">
                <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
                  <span>Growth Rate</span>
                  <span className={`font-semibold ${leadMetrics.growthPositive ? 'text-blue-600 dark:text-blue-400' : 'text-rose-600 dark:text-rose-400'}`}>{leadMetrics.growthLabel}</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full bg-gradient-to-r ${leadMetrics.growthPositive ? 'from-blue-500 to-blue-600' : 'from-rose-500 to-rose-600'}`}
                    style={{ width: `${Math.max(0, Math.min(100, leadMetrics.growthProgress))}%` }}
                  ></div>
                </div>
              </div>
            </div>

          </div>

        </div>

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
          onRefresh={fetchLeads}
          onCreate={() => setIsCreateModalOpen(true)}
          onUpload={handleFileUpload}
          onDownloadTemplate={handleDownloadTemplate}
          searchPlaceholder="Search leads by name, email, phone number, or score..."
          filterOptions={[
            { value: "name", label: "Filter by Name" },
            { value: "email", label: "Filter by Email" },
            { value: "phone", label: "Filter by Phone" },
            { value: "source", label: "Filter by Source" },
            { value: "channel", label: "Filter by Channel" },
            { value: "interest", label: "Filter by Interest" },
            { value: "score", label: "Filter by Score" },
            { value: "lead", label: "Filter by Lead ID" },
            { value: "agent", label: "Filter by Agent" },
          ]}
        />


        {/* Alert Messages */}

        {showAlert && (

          <div className="fixed top-24 right-6 z-99999 w-96 max-w-sm">

            <Alert

              variant={alertType}

              title={alertType === 'success' ? 'Success' : alertType === 'error' ? 'Error' : 'Info'}

              message={alertMessage}

              showLink={false}

            />

          </div>

        )}

        {/* Enhanced Leads Table */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="px-3 py-4 border-b border-gray-200 dark:border-gray-700">

          </div>

          {/* Desktop Table View */}
          <div className="hidden lg:block w-full">
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
                      <th className="px-3 py-4 text-left font-semibold text-gray-700 dark:text-gray-300 w-16">ID</th>
                      <th className="px-3 py-4 text-left font-semibold text-gray-700 dark:text-gray-300 w-28">Name</th>
                      <th className="px-3 py-4 text-left font-semibold text-gray-700 dark:text-gray-300 w-36">Email</th>
                      <th className="px-3 py-4 text-left font-semibold text-gray-700 dark:text-gray-300 w-32">Company</th>
                      <th className="px-3 py-4 text-left font-semibold text-gray-700 dark:text-gray-300 w-32">Appointment</th>
                      <th className="px-3 py-4 text-left font-semibold text-gray-700 dark:text-gray-300 w-28">Mobile</th>
                      <th className="px-3 py-4 text-left font-semibold text-gray-700 dark:text-gray-300 w-24">Agent</th>
                      <th className="px-3 py-4 text-left font-semibold text-gray-700 dark:text-gray-300 w-28">Assign Status</th>
                      <th className="px-3 py-4 text-left font-semibold text-gray-700 dark:text-gray-300 w-24">Interest</th>
                      <th className="px-3 py-4 text-left font-semibold text-gray-700 dark:text-gray-300 w-24">Source</th>
                      <th onClick={handleSortChannel} className="px-3 py-4 text-left font-semibold text-gray-700 dark:text-gray-300 cursor-pointer w-24 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-200">
                        Channel {sortAsc ? <ArrowUp className="inline w-4 h-4 ml-1" /> : <ArrowDown className="inline w-4 h-4 ml-1" />}
                      </th>
                      <th className="px-3 py-4 text-left font-semibold text-gray-700 dark:text-gray-300 w-20">Score</th>
                      <th className="px-3 py-4 text-left font-semibold text-gray-700 dark:text-gray-300 w-20">Status</th>
                      <th onClick={handleSortDate} className="px-3 py-4 text-left font-semibold text-gray-700 dark:text-gray-300 cursor-pointer w-24 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-200">
                        Date {sortAsc ? <ArrowUp className="inline w-4 h-4 ml-1" /> : <ArrowDown className="inline w-4 h-4 ml-1" />}
                      </th>
                      <th className="px-3 py-4 text-left font-semibold text-gray-700 dark:text-gray-300 w-20">Actions</th>
                    </TableRow>
                  </TableHeader>

                  <TableBody>

                    {loading ? (
                      // Enhanced Loading State with Skeleton
                      Array.from({ length: 5 }).map((_, index) => (
                        <TableRow key={`skeleton-${index}`} className="border-b border-gray-200 dark:border-gray-700">
                          <td className="px-3 py-4">
                            <div className="w-4 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                          </td>
                          <td className="px-3 py-4">
                            <div className="w-16 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                          </td>
                          <td className="px-3 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
                              <div className="w-24 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                            </div>
                          </td>
                          <td className="px-3 py-4">
                            <div className="w-32 h-6 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
                          </td>
                          <td className="px-3 py-4">
                            <div className="w-28 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                          </td>
                          <td className="px-3 py-4">
                            <div className="w-28 h-8 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
                          </td>
                          <td className="px-3 py-4">
                            <div className="w-24 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                          </td>
                          <td className="px-3 py-4">
                            <div className="w-20 h-6 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
                          </td>
                          <td className="px-3 py-4">
                            <div className="w-24 h-6 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
                          </td>
                          <td className="px-3 py-4">
                            <div className="w-20 h-6 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
                          </td>
                          <td className="px-3 py-4">
                            <div className="w-24 h-6 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
                          </td>
                          <td className="px-3 py-4">
                            <div className="w-16 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                          </td>
                          <td className="px-3 py-4">
                            <div className="w-16 h-6 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
                          </td>
                          <td className="px-3 py-4">
                            <div className="w-16 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                          </td>
                          <td className="px-3 py-4">
                            <div className="flex gap-1">
                              <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
                              <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
                              <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
                            </div>
                          </td>
                        </TableRow>
                      ))
                    ) : (
                      currentLeads.length === 0 ? (
                        <TableRow>
                          <td colSpan={15} className="px-6 py-12 text-center">
                            <div className="flex flex-col items-center gap-4">
                              <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                                <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                              </div>
                              <div>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No leads found</h3>
                                <p className="text-gray-500 dark:text-gray-400 mb-4">Get started by creating your first lead or importing existing ones.</p>
                                <button
                                  onClick={() => setIsCreateModalOpen(true)}
                                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors duration-200"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                  </svg>
                                  Create Lead
                                </button>
                              </div>
                            </div>
                          </td>
                        </TableRow>

                      ) : (

                        currentLeads.map((lead, index) => {

                          // Generate unique key for React - use ONLY custom id, never MongoDB _id
                          const uniqueKey = lead.id || lead?.originalId || lead?.originalLeadId || `lead-${index}-${lead.email || lead.name || Date.now()}`;

                          return (
                            <TableRow
                              key={uniqueKey}
                              className="border-b border-gray-200 dark:border-gray-700 hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-blue-50/50 dark:hover:from-blue-900/10 dark:hover:to-blue-900/10 transition-all duration-200 group"
                            >

                              <td className="px-3 py-4">
                                <input
                                  type="checkbox"
                                  checked={selectedIds.includes(lead.id)}
                                  onChange={handleSelectOne(lead.id)}
                                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                                />
                              </td>

                              <td className="px-3 py-4 font-semibold whitespace-nowrap">

                                <button

                                  onClick={async () => {

                                    // Update status to "Open" when clicking on Lead ID

                                    if (lead.status !== 'Open') {

                                      try {
                                        // Use ONLY custom id, never MongoDB _id
                                        const leadId = getLeadId(lead) || lead.id || lead?.originalId || lead?.originalLeadId;
                                        if (!leadId) {
                                          showAlertMessage('Lead ID not found. Cannot update status.', 'error');
                                          return;
                                        }

                                        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/leads/${leadId}/status`, {

                                          method: 'PUT',

                                          headers: {

                                            'accept': 'application/json',

                                            'Content-Type': 'application/json',

                                          },

                                          body: JSON.stringify({

                                            status: 'Open',

                                            updated_by: 'Admin',

                                            notes: 'Status automatically changed to Open when viewing chat',

                                            timestamp: new Date().toISOString(),

                                          }),

                                        });



                                        if (response.ok) {

                                          // Update local state

                                          setLeadsData(prevLeads =>

                                            prevLeads.map(l =>

                                              l.id === lead.id ? { ...l, status: 'Open' } : l

                                            )

                                          );

                                          setFilteredLeads(prevLeads =>

                                            prevLeads.map(l =>

                                              l.id === lead.id ? { ...l, status: 'Open' } : l

                                            )

                                          );

                                        }

                                      } catch (error) {

                                        console.error('Error updating status to Open:', error);

                                      }

                                    }



                                    // Navigate to lead-integration detail page - use ONLY custom id, never MongoDB _id
                                    const leadId = getLeadId(lead) || lead.id || lead?.originalId || lead?.originalLeadId;
                                    if (leadId && leadId !== 'undefined' && leadId !== 'null' && String(leadId).trim() !== '') {
                                      router.push(`/lead-integration/${encodeURIComponent(leadId)}`);
                                    } else {
                                      console.error('Lead ID not found for navigation:', { lead, leadId });
                                      showAlertMessage('Lead ID not found. Cannot navigate to lead integration.', 'error');
                                    }

                                  }}

                                  className={`inline-flex items-center gap-2 font-semibold transition-all duration-200 ${isTrueDuplicate(lead)
                                    ? 'bg-blue-100 dark:bg-blue-900/20 border border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 rounded-full px-3 py-1 text-sm hover:bg-blue-200 dark:hover:bg-blue-900/30 hover:scale-105'
                                    : 'text-blue-600 hover:text-blue-700 hover:underline hover:scale-105'
                                    }`}

                                >

                                  <span className="inline-flex items-center gap-1">

                                    <span>{getLeadId(lead) || lead.id || lead?.lead_id || '—'}</span>

                                    <svg className="w-3 h-3 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">

                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />

                                    </svg>

                                  </span>

                                </button>

                              </td>

                              <td className="px-3 py-4">
                                <div className="flex items-center gap-3 group">
                                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                                    {lead.name?.charAt(0)?.toUpperCase() || '?'}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <span className="inline-flex items-center gap-2 font-medium text-gray-700 dark:text-gray-300 truncate text-sm" title={lead.name || 'No name'}>
                                      <span className="truncate max-w-[220px]">{lead.name || 'No name'}</span>
                                    </span>
                                  </div>
                                </div>
                              </td>

                              <td className="px-3 py-4">
                                <div className="flex items-center gap-2">
                                  <span className="inline-block px-3 py-1 rounded-full text-sm font-medium border shadow whitespace-nowrap max-w-full overflow-hidden text-ellipsis bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-900/20 dark:text-sky-300 dark:border-sky-700" title={lead.email}>
                                    {lead.email}
                                  </span>
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(lead.email);
                                      // You could add a toast notification here
                                    }}
                                    className="p-1 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200"
                                    title="Copy email"
                                  >
                                    <svg className="w-4 h-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                  </button>
                                </div>
                              </td>

                              <td className="px-3 py-4">
                                <div className="text-gray-900 dark:text-white font-medium truncate max-w-[200px]" title={lead.company_name || 'No company'}>
                                  {lead.company_name || '—'}
                                </div>
                              </td>

                              <td className="px-3 py-4">
                                <button
                                  onClick={() => openAppointmentModal(lead)}
                                  className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border shadow whitespace-nowrap bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-200 transition-colors cursor-pointer"
                                  title={`Click to view ${(lead.appointment_count || 0)} appointment(s)`}
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                  {(lead.appointment_count || 0)} Appointments
                                </button>
                              </td>

                              <td className="px-3 py-4" style={{ whiteSpace: 'nowrap', wordBreak: 'keep-all' }}>
                                <div className="text-gray-900 dark:text-white font-medium" title={lead.phone}>
                                  {lead.phone}
                                </div>
                              </td>

                              <td className="px-3 py-3 text-gray-800 dark:text-white text-sm whitespace-nowrap">

                                {(() => {

                                  try {

                                    const metadata = typeof lead.lead_metadata === "string" ? JSON.parse(lead.lead_metadata) : lead.lead_metadata;
                                    // Check multiple sources for assigned agent name (priority order)
                                    const rawAgentCandidate =
                                      lead?.assigned_agent_name ||  // Direct field from assignment
                                      lead?.assignment?.assigned_to_name ||
                                      lead?.assignment_results?.assigned_agent?.name ||
                                      (lead as { assigned_to_name?: string })?.assigned_to_name ||
                                      lead?.assignment?.assigned_to ||
                                      lead?.assignment_results?.assigned_agent?.agent_id ||
                                      (lead.agent && lead.agent.trim() ? lead.agent : (metadata?.agent || "—"));

                                    let displayName = rawAgentCandidate;

                                    if (typeof displayName === 'string' && displayName !== '—') {
                                      if (displayName.includes('@')) {
                                        // Handle email format
                                        const local = displayName.split('@')[0];
                                        displayName = local
                                          .replace(/[._-]+/g, ' ')
                                          .trim()
                                          .split(' ')
                                          .filter(Boolean)
                                          .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
                                          .join(' ');
                                        if (!displayName) displayName = '—';
                                      } else {
                                        // Capitalize first letter of regular names (e.g., "mayank" -> "Mayank", "arjun" -> "Arjun")
                                        displayName = displayName.trim();
                                        if (displayName.length > 0) {
                                          displayName = displayName.charAt(0).toUpperCase() + displayName.slice(1).toLowerCase();
                                        }
                                      }
                                    }

                                    return (

                                      <span className="px-4 py-1 rounded-full text-sm font-semibold border shadow whitespace-nowrap max-w-[160px] overflow-hidden text-ellipsis bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-700">{displayName}</span>

                                    );

                                  } catch {

                                    return (

                                      <span className="px-4 py-1 rounded-full text-sm font-semibold border shadow whitespace-nowrap max-w-[160px] overflow-hidden text-ellipsis bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-700">—</span>

                                    );

                                  }

                                })()}

                              </td>

                              {/* Assign Status */}
                              <td className="px-3 py-3 text-gray-800 dark:text-white text-sm whitespace-nowrap">
                                {(() => {
                                  // Check multiple sources for assignment status (priority order)
                                  const isAssigned = !!(
                                    lead?.assignment?.assigned_agent_id ||  // Direct field from assignment
                                    lead?.assigned_agent_name ||
                                    lead?.assignment?.assigned_to ||
                                    lead?.assignment_results?.assigned_agent ||
                                    lead?.assignment_id
                                  );
                                  const label = isAssigned ? 'Assigned' : 'Unassigned';
                                  const classes = 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-700';
                                  return (
                                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border shadow whitespace-nowrap ${classes}`}>
                                      {label}
                                    </span>
                                  );
                                })()}
                              </td>

                              <td className="px-3 py-3 text-gray-800 dark:text-white text-sm whitespace-nowrap">

                                {(() => {

                                  try {

                                    // First try to get interest from lead_metadata

                                    const metadata = typeof lead.lead_metadata === "string" ? JSON.parse(lead.lead_metadata) : lead.lead_metadata;

                                    let interestValue = metadata?.interest || "—";



                                    // If not found in metadata, try top-level interest field

                                    if (interestValue === "—" && lead.interest) {

                                      interestValue = lead.interest;

                                    }



                                    return (

                                      <span className="px-4 py-1 rounded-full text-sm font-semibold border shadow whitespace-nowrap max-w-[160px] overflow-hidden text-ellipsis bg-blue-100 text-blue-800 border-blue-300">{interestValue}</span>

                                    );

                                  } catch {

                                    return "—";

                                  }

                                })()}

                              </td>


                              <td className="px-3 py-3 text-gray-800 dark:text-white text-sm whitespace-nowrap">

                                {(() => {

                                  try {

                                    const sourceValue = lead.source;

                                    return (

                                      <span className="px-4 py-1 rounded-full text-sm font-semibold border shadow whitespace-nowrap max-w-[160px] overflow-hidden text-ellipsis bg-blue-100 text-blue-800 border-blue-300">{sourceValue}</span>

                                    );

                                  } catch {

                                    return "—";

                                  }

                                })()}

                              </td>

                              <td className="px-3 py-3 text-gray-800 dark:text-white text-sm whitespace-nowrap">
                                {(() => {
                                  try {
                                    const channelValue = lead.channel;
                                    if (!channelValue || channelValue.trim() === '') {
                                      return (
                                        <span className="px-3 py-1 rounded-full text-sm font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600">
                                          —
                                        </span>
                                      );
                                    }
                                    return (
                                      <span className="px-3 py-1 rounded-full text-sm font-semibold border shadow whitespace-nowrap max-w-[160px] overflow-hidden text-ellipsis bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-900 dark:text-purple-200 dark:border-purple-700">
                                        {channelValue}
                                      </span>
                                    );
                                  } catch {
                                    return (
                                      <span className="px-3 py-1 rounded-full text-sm font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600">
                                        —
                                      </span>
                                    );
                                  }
                                })()}
                              </td>

                              <td className="px-3 py-4">
                                {(() => {
                                  const score = getLeadScore(lead);
                                  const numericScore = typeof score === 'number' ? score : parseInt(score.toString()) || 0;
                                  const percentage = Math.min(Math.max(numericScore, 0), 100);

                                  return (
                                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                      {percentage}%
                                    </span>
                                  );
                                })()}
                              </td>

                              <td className="px-3 py-3 text-gray-800 dark:text-white text-sm whitespace-nowrap capitalize">

                                {(() => {

                                  // Don't show "assigned" as status - preserve original status
                                  let status = lead.status || 'new';
                                  const statusLower = status.toLowerCase();

                                  // If status is "assigned", try to get original status from metadata or default to "new"
                                  if (statusLower === 'assigned') {
                                    try {
                                      const metadata = typeof lead.lead_metadata === "string" ? JSON.parse(lead.lead_metadata) : lead.lead_metadata;
                                      status = metadata?.original_status || metadata?.status || 'new';
                                    } catch {
                                      status = 'new';
                                    }
                                  }

                                  const finalStatusLower = status.toLowerCase();



                                  // Define status colors based on the image

                                  let statusClasses = '';

                                  if (finalStatusLower === 'in process') {

                                    statusClasses = 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-700';

                                  } else if (finalStatusLower === 'open') {

                                    statusClasses = 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-700';


                                  } else if (finalStatusLower === 'new') {

                                    statusClasses = 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-700';

                                  } else if (finalStatusLower === 'won') {

                                    statusClasses = 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-700';

                                  } else if (finalStatusLower === 'lost') {

                                    statusClasses = 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-700';

                                  } else if (finalStatusLower === 'prospect') {

                                    statusClasses = 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-700';

                                  } else if (finalStatusLower === 'qualified') {

                                    statusClasses = 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-700';

                                  } else {

                                    // Default color for unknown statuses

                                    statusClasses = 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-900/20 dark:text-gray-300 dark:border-gray-700';

                                  }



                                  return (

                                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border shadow whitespace-nowrap ${statusClasses}`}>

                                      {status}

                                    </span>

                                  );

                                })()}

                              </td>

                              <td className="px-3 py-4 text-gray-900 dark:text-white text-sm" style={{ whiteSpace: 'nowrap', wordBreak: 'keep-all' }}>
                                <div className="whitespace-nowrap">
                                  {new Date(lead.created_at).toLocaleDateString("en-GB", {
                                    day: "numeric",
                                    month: "short",
                                    year: "2-digit"
                                  })}
                                </div>
                              </td>

                              <td className="px-3 py-4">
                                <div className="flex items-center gap-1">
                                  <button
                                    title="Book appointment"
                                    className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/20 transition-all duration-200 hover:scale-110"
                                    onClick={() => openBookModal(lead)}
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                  </button>
                                  {(() => {
                                    const isAssigned = !!(
                                      lead?.assignment?.assigned_agent_id ||
                                      lead?.assignment?.assigned_to ||
                                      lead?.assignment_results?.assigned_agent
                                    );
                                    return (
                                      <button
                                        title={isAssigned ? "Change agent" : "Assign to agent"}
                                        className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/20 transition-all duration-200 hover:scale-110"
                                        onClick={() => openAssignModal(lead)}
                                      >
                                        {isAssigned ? (
                                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                          </svg>
                                        ) : (
                                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                                          </svg>
                                        )}
                                      </button>
                                    );
                                  })()}
                                  <button
                                    title="Edit lead"
                                    className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/20 transition-all duration-200 hover:scale-110"
                                    onClick={async (e) => {
                                      e.preventDefault();
                                      setIsCreateModalOpen(true);
                                      setEditingLead(null);
                                      setEditingLeadLoading(true);
                                      try {
                                        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/leads/`);
                                        const list = await res.json();
                                        const fresh = Array.isArray(list) ? list.find((l: Lead) => l.id === lead.id) : null;
                                        setEditingLead(fresh || lead);
                                      } catch (err) {
                                        console.error('Failed to fetch lead for edit:', err);
                                        setEditingLead(lead);
                                        showAlertMessage('Failed to fetch fresh lead data. Using cached values.', 'error');
                                      } finally {
                                        setEditingLeadLoading(false);
                                      }
                                    }}
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                  </button>
                                </div>
                              </td>

                            </TableRow>
                          );
                        })

                      )

                    )}

                  </TableBody>

                </Table>
              </div>
            </div>

          </div>

          {/* Tablet View */}
          <div className="hidden md:block lg:hidden">
            <div className="w-full overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-gray-100 dark:scrollbar-track-gray-800">
              <div className="min-w-[800px]">
                <Table className="w-full">
                  <TableHeader className="bg-gray-50 dark:bg-gray-700/50">
                    <TableRow className="hover:bg-transparent">
                      <th className="px-2 py-3 text-left font-semibold text-gray-700 dark:text-gray-300 w-12">
                        <input
                          type="checkbox"
                          checked={allSelected}
                          onChange={handleSelectAll}
                          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                        />
                      </th>
                      <th className="px-2 py-3 text-left font-semibold text-gray-700 dark:text-gray-300 w-16">ID</th>
                      <th className="px-2 py-3 text-left font-semibold text-gray-700 dark:text-gray-300 w-24">Name</th>
                      <th className="px-2 py-3 text-left font-semibold text-gray-700 dark:text-gray-300 w-32">Email</th>
                      <th className="px-2 py-3 text-left font-semibold text-gray-700 dark:text-gray-300 w-28">Appointment</th>
                      <th className="px-2 py-3 text-left font-semibold text-gray-700 dark:text-gray-300 w-24">Mobile</th>
                      <th className="px-2 py-3 text-left font-semibold text-gray-700 dark:text-gray-300 w-24">Source</th>
                      <th onClick={handleSortChannel} className="px-2 py-3 text-left font-semibold text-gray-700 dark:text-gray-300 cursor-pointer w-24 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-200">
                        Channel {sortAsc ? <ArrowUp className="inline w-4 h-4 ml-1" /> : <ArrowDown className="inline w-4 h-4 ml-1" />}
                      </th>
                      <th className="px-2 py-3 text-left font-semibold text-gray-700 dark:text-gray-300 w-20">Score</th>
                      <th className="px-2 py-3 text-left font-semibold text-gray-700 dark:text-gray-300 w-24">Assign Status</th>
                      <th className="px-2 py-3 text-left font-semibold text-gray-700 dark:text-gray-300 w-20">Status</th>
                      <th onClick={handleSortDate} className="px-2 py-3 text-left font-semibold text-gray-700 dark:text-gray-300 cursor-pointer w-24 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-200">
                        Date {sortAsc ? <ArrowUp className="inline w-4 h-4 ml-1" /> : <ArrowDown className="inline w-4 h-4 ml-1" />}
                      </th>
                      <th className="px-2 py-3 text-left font-semibold text-gray-700 dark:text-gray-300 w-20">Actions</th>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      Array.from({ length: 5 }).map((_, index) => (
                        <TableRow key={`tablet-skeleton-${index}`} className="border-b border-gray-200 dark:border-gray-700">
                          <td className="px-2 py-3">
                            <div className="w-4 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                          </td>
                          <td className="px-2 py-3">
                            <div className="w-16 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                          </td>
                          <td className="px-2 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
                              <div className="w-20 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                            </div>
                          </td>
                          <td className="px-2 py-3">
                            <div className="w-32 h-6 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
                          </td>
                          <td className="px-2 py-3">
                            <div className="w-24 h-8 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
                          </td>
                          <td className="px-2 py-3">
                            <div className="w-24 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                          </td>
                          <td className="px-2 py-3">
                            <div className="w-20 h-6 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
                          </td>
                          <td className="px-2 py-3">
                            <div className="w-16 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                          </td>
                          <td className="px-2 py-3">
                            <div className="w-16 h-6 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
                          </td>
                          <td className="px-2 py-3">
                            <div className="w-16 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                          </td>
                          <td className="px-2 py-3">
                            <div className="flex gap-1">
                              <div className="w-6 h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                              <div className="w-6 h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                              <div className="w-6 h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                            </div>
                          </td>
                        </TableRow>
                      ))
                    ) : currentLeads.length === 0 ? (
                      <TableRow>
                        <td colSpan={11} className="px-4 py-12 text-center">
                          <div className="flex flex-col items-center gap-4">
                            <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                              <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                              </svg>
                            </div>
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No leads found</h3>
                              <p className="text-gray-500 dark:text-gray-400 mb-4">Get started by creating your first lead.</p>
                              <button
                                onClick={() => setIsCreateModalOpen(true)}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors duration-200"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                Create Lead
                              </button>
                            </div>
                          </div>
                        </td>
                      </TableRow>
                    ) : (
                      currentLeads.map((lead, index) => {
                        // Generate unique key for React - use id if available, otherwise use _id or index
                        // Generate unique key - use ONLY custom id, never MongoDB _id
                        const uniqueKey = lead.id || lead?.originalId || lead?.originalLeadId || `lead-mobile-${index}-${lead.email || lead.name || Date.now()}`;

                        return (
                          <TableRow
                            key={uniqueKey}
                            className="border-b border-gray-200 dark:border-gray-700 hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-blue-50/50 dark:hover:from-blue-900/10 dark:hover:to-blue-900/10 transition-all duration-200 group"
                          >
                            <td className="px-2 py-3">
                              <input
                                type="checkbox"
                                checked={selectedIds.includes(lead.id)}
                                onChange={handleSelectOne(lead.id)}
                                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                              />
                            </td>
                            <td className="px-2 py-3 font-semibold whitespace-nowrap">
                              <button
                                onClick={async () => {
                                  if (lead.status !== 'Open') {
                                    try {
                                      // Use ONLY custom id, never MongoDB _id
                                      const leadId = getLeadId(lead) || lead.id || lead?.originalId || lead?.originalLeadId;
                                      if (!leadId) {
                                        showAlertMessage('Lead ID not found. Cannot update status.', 'error');
                                        return;
                                      }

                                      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/leads/${leadId}/status`, {
                                        method: 'PUT',
                                        headers: {
                                          'accept': 'application/json',
                                          'Content-Type': 'application/json',
                                        },
                                        body: JSON.stringify({
                                          status: 'Open',
                                          updated_by: 'Admin',
                                          notes: 'Status automatically changed to Open when viewing chat',
                                          timestamp: new Date().toISOString(),
                                        }),
                                      });

                                      if (response.ok) {
                                        setLeadsData(prevLeads =>
                                          prevLeads.map(l =>
                                            l.id === lead.id ? { ...l, status: 'Open' } : l
                                          )
                                        );
                                        setFilteredLeads(prevLeads =>
                                          prevLeads.map(l =>
                                            l.id === lead.id ? { ...l, status: 'Open' } : l
                                          )
                                        );
                                      }
                                    } catch (error) {
                                      console.error('Error updating status to Open:', error);
                                    }
                                  }
                                  // Navigate to lead-integration detail page - use ONLY custom id, never MongoDB _id
                                  const leadId = getLeadId(lead) || lead.id || lead?.originalId || lead?.originalLeadId;
                                  if (leadId && leadId !== 'undefined' && leadId !== 'null' && String(leadId).trim() !== '') {
                                    router.push(`/lead-integration/${encodeURIComponent(leadId)}`);
                                  } else {
                                    console.error('Lead ID not found for navigation:', { lead, leadId });
                                    showAlertMessage('Lead ID not found. Cannot navigate to lead integration.', 'error');
                                  }
                                }}
                                className={`inline-flex items-center gap-1 font-semibold transition-all duration-200 cursor-pointer ${isTrueDuplicate(lead)
                                  ? 'bg-blue-100 dark:bg-blue-900/20 border border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 rounded-full px-2 py-1 text-xs hover:bg-blue-200 dark:hover:bg-blue-900/30 hover:scale-105'
                                  : 'text-blue-600 hover:text-blue-700 hover:underline hover:scale-105'
                                  }`}
                              >
                                <span>{getLeadId(lead) || lead.id || lead?.lead_id || '—'}</span>
                                <svg className="w-3 h-3 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                              </button>
                            </td>
                            <td className="px-2 py-3">
                              <div className="flex items-center gap-2 group">
                                <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-xs">
                                  {lead.name?.charAt(0)?.toUpperCase() || '?'}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <span className="inline-flex items-center gap-2 font-medium text-gray-700 dark:text-gray-300 truncate text-sm" title={lead.name || 'No name'}>
                                    <span className="truncate max-w-[160px]">{lead.name || 'No name'}</span>
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="px-2 py-3">
                              <div className="flex items-center gap-1">
                                <span className="inline-block px-2 py-1 rounded-full text-xs font-medium border shadow whitespace-nowrap max-w-full overflow-hidden text-ellipsis bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-900/20 dark:text-sky-300 dark:border-sky-700" title={lead.email}>
                                  {lead.email}
                                </span>
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(lead.email);
                                  }}
                                  className="p-1 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200"
                                  title="Copy email"
                                >
                                  <svg className="w-3 h-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                  </svg>
                                </button>
                              </div>
                            </td>
                            <td className="px-2 py-3">
                              <div className="text-gray-900 dark:text-white font-medium text-sm truncate max-w-[150px]" title={lead.company_name || 'No company'}>
                                {lead.company_name || '—'}
                              </div>
                            </td>
                            <td className="px-2 py-3">
                              <button
                                onClick={() => openAppointmentModal(lead)}
                                className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border shadow whitespace-nowrap bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-200 transition-colors cursor-pointer"
                                title={`Click to view ${(lead.appointment_count || 0)} appointment(s)`}
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                {(lead.appointment_count || 0)} Appointments
                              </button>
                            </td>
                            <td className="px-2 py-3" style={{ whiteSpace: 'nowrap', wordBreak: 'keep-all' }}>
                              <div className="text-gray-900 dark:text-white font-medium text-sm" title={lead.phone}>
                                {lead.phone}
                              </div>
                            </td>
                            <td className="px-2 py-3">
                              <span className="inline-block px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-300 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-700">
                                {lead.source}
                              </span>
                            </td>
                            <td className="px-2 py-3">
                              {(() => {
                                try {
                                  const channelValue = lead.channel;
                                  if (!channelValue || channelValue.trim() === '') {
                                    return (
                                      <span className="inline-block px-2 py-1 rounded-full text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600">
                                        —
                                      </span>
                                    );
                                  }
                                  return (
                                    <span className="inline-block px-2 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-300 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-700">
                                      {channelValue}
                                    </span>
                                  );
                                } catch {
                                  return (
                                    <span className="inline-block px-2 py-1 rounded-full text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600">
                                      —
                                    </span>
                                  );
                                }
                              })()}
                            </td>
                            <td className="px-2 py-3">
                              {(() => {
                                const score = getLeadScore(lead);
                                const numericScore = typeof score === 'number' ? score : parseInt(score.toString()) || 0;
                                const percentage = Math.min(Math.max(numericScore, 0), 100);

                                return (
                                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                                    {percentage}%
                                  </span>
                                );
                              })()}
                            </td>
                            {/* Assign Status (Tablet) */}
                            <td className="px-2 py-3">
                              {(() => {
                                // Check multiple sources for assignment status (priority order)
                                const isAssigned = !!(
                                  lead?.assignment?.assigned_agent_id ||  // Direct field from assignment
                                  lead?.assigned_agent_name ||
                                  lead?.assignment?.assigned_to ||
                                  lead?.assignment_results?.assigned_agent ||
                                  lead?.assignment_id
                                );
                                const label = isAssigned ? 'Assigned' : 'Unassigned';
                                const classes = 'bg-blue-100 text-blue-800 border border-blue-300 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-700';
                                return (
                                  <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${classes}`}>
                                    {label}
                                  </span>
                                );
                              })()}
                            </td>
                            <td className="px-2 py-3">
                              {(() => {
                                // Don't show "assigned" as status - preserve original status
                                let status = lead.status || 'new';
                                if (status.toLowerCase() === 'assigned') {
                                  try {
                                    const metadata = typeof lead.lead_metadata === "string" ? JSON.parse(lead.lead_metadata) : lead.lead_metadata;
                                    status = metadata?.original_status || metadata?.status || 'new';
                                  } catch {
                                    status = 'new';
                                  }
                                }
                                return (
                                  <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusCardClasses(status)}`}>
                                    {(status === 'New') ? 'New Lead' : (status || 'Unknown')}
                                  </span>
                                );
                              })()}
                            </td>
                            <td className="px-2 py-3 text-gray-900 dark:text-white text-xs" style={{ whiteSpace: 'nowrap', wordBreak: 'keep-all' }}>
                              <div className="whitespace-nowrap">
                                {new Date(lead.created_at).toLocaleDateString("en-GB", {
                                  day: "numeric",
                                  month: "short",
                                  year: "2-digit"
                                })}
                              </div>
                            </td>
                            <td className="px-2 py-3">
                              <div className="flex items-center gap-1">
                                <button
                                  title="Edit lead"
                                  className="p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/20 transition-all duration-200 hover:scale-110"
                                  onClick={async (e) => {
                                    e.preventDefault();
                                    setIsCreateModalOpen(true);
                                    setEditingLead(null);
                                    setEditingLeadLoading(true);
                                    try {
                                      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/leads/`);
                                      const list = await res.json();
                                      const fresh = Array.isArray(list) ? list.find((l: Lead) => l.id === lead.id) : null;
                                      setEditingLead(fresh || lead);
                                    } catch (err) {
                                      console.error('Failed to fetch lead for edit:', err);
                                      setEditingLead(lead);
                                      showAlertMessage('Failed to fetch fresh lead data. Using cached values.', 'error');
                                    } finally {
                                      setEditingLeadLoading(false);
                                    }
                                  }}
                                >
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>

                              </div>
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

          {/* Mobile Card View */}

          <div className="md:hidden">

            {loading ? (
              // Mobile Loading State with Skeleton Cards
              <div className="p-4 space-y-4">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={`mobile-skeleton-${index}`} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-4 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                      <div className="w-16 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
                        <div className="w-32 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                      </div>
                      <div className="w-48 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                      <div className="w-36 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                      <div className="flex gap-2">
                        <div className="w-20 h-6 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
                        <div className="w-24 h-6 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : currentLeads.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                    <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No leads found</h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-4">Get started by creating your first lead.</p>
                    <button
                      onClick={() => setIsCreateModalOpen(true)}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors duration-200"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Create Lead
                    </button>
                  </div>
                </div>
              </div>
            ) : (

              <div className="p-4 space-y-4">

                {currentLeads.map((lead, index) => {
                  // Generate unique key for React - use id if available, otherwise use _id or index
                  // Generate unique key - use ONLY custom id, never MongoDB _id
                  const uniqueKey = lead.id || lead?.originalId || lead?.originalLeadId || `lead-mobile-card-${index}-${lead.email || lead.name || Date.now()}`;

                  return (
                    <div key={uniqueKey} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 shadow-sm hover:shadow-md transition-shadow duration-200">

                      {/* Card Header with Checkbox and ID */}

                      <div className="flex items-center justify-between mb-4">

                        <div className="flex items-center gap-3">

                          <input

                            type="checkbox"

                            checked={selectedIds.includes(lead.id)}

                            onChange={handleSelectOne(lead.id)}

                            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"

                          />

                          <button

                            onClick={async () => {

                              // Update status to "Open" when clicking on Lead ID

                              if (lead.status !== 'Open') {

                                try {
                                  // Use ONLY custom id, never MongoDB _id
                                  const leadId = getLeadId(lead) || lead.id || lead?.originalId || lead?.originalLeadId;
                                  if (!leadId) {
                                    showAlertMessage('Lead ID not found. Cannot update status.', 'error');
                                    return;
                                  }

                                  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/leads/${leadId}/status`, {

                                    method: 'PUT',

                                    headers: {

                                      'accept': 'application/json',

                                      'Content-Type': 'application/json',

                                    },

                                    body: JSON.stringify({

                                      status: 'Open',

                                      updated_by: 'Admin',

                                      notes: 'Status automatically changed to Open when viewing chat',

                                      timestamp: new Date().toISOString(),

                                    }),

                                  });



                                  if (response.ok) {

                                    // Update local state

                                    setLeadsData(prevLeads =>

                                      prevLeads.map(l =>

                                        l.id === lead.id ? { ...l, status: 'Open' } : l

                                      )

                                    );

                                    setFilteredLeads(prevLeads =>

                                      prevLeads.map(l =>

                                        l.id === lead.id ? { ...l, status: 'Open' } : l

                                      )

                                    );

                                  }

                                } catch (error) {

                                  console.error('Error updating status to Open:', error);

                                }

                              }





                              // Navigate to chat page - use ONLY custom id, never MongoDB _id
                              const leadId = getLeadId(lead) || lead.id || lead?.originalId || lead?.originalLeadId;
                              if (leadId && leadId !== 'undefined' && leadId !== 'null' && String(leadId).trim() !== '') {
                                router.push(`/crm-leads/crm-threads/${leadId}`);
                              } else {
                                console.error('Lead ID not found for navigation:', { lead, leadId });
                                showAlertMessage('Lead ID not found. Cannot navigate to chat.', 'error');
                              }

                            }}

                            className={`text-sm font-medium transition-colors ${isTrueDuplicate(lead)

                              ? 'bg-blue-100 dark:bg-blue-900/20 border border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 rounded-full px-3 py-1 hover:bg-blue-200 dark:hover:bg-blue-900/30'

                              : 'text-blue-600 hover:text-blue-700 hover:underline'

                              }`}

                          >

                            <span className="inline-flex items-center gap-1">

                              <span>Lead ID: {getLeadId(lead) || lead.id || lead?.lead_id || '—'}</span>

                              <svg className="w-3 h-3 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">

                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />

                              </svg>

                            </span>

                          </button>

                        </div>

                        <button className="w-6 h-6 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-700"

                          onClick={async (e) => {

                            e.preventDefault();

                            setIsCreateModalOpen(true);

                            setEditingLead(null);

                            setEditingLeadLoading(true);

                            try {

                              const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/leads/`);

                              const list = await res.json();

                              const fresh = Array.isArray(list) ? list.find((l: Lead) => l.id === lead.id) : null;

                              setEditingLead(fresh || lead);

                            } catch (err) {

                              console.error('Failed to fetch lead for edit:', err);

                              setEditingLead(lead);

                              showAlertMessage('Failed to fetch fresh lead data. Using cached values.', 'error');

                            } finally {

                              setEditingLeadLoading(false);

                            }

                          }}

                        >

                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">

                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4" />

                          </svg>

                        </button>

                      </div>

                      {/* Lead Information */}

                      <div className="space-y-4">

                        {/* Name and Avatar */}
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                            {lead.name?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">{lead.name || 'No name'}</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Lead ID: {getLeadId(lead) || lead.id || ((lead as Lead & { lead_id?: string | number })?.lead_id) || '—'}</p>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusCardClasses(lead.status)}`}>
                              {(lead.status === 'New') ? 'New Lead' : (lead.status || 'Unknown')}
                            </span>
                          </div>
                        </div>

                        {/* Contact Information */}
                        {/* Email */}
                        <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Email</span>
                            <div className="flex items-center gap-2">
                              <span className="inline-block px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-300 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-700 truncate max-w-[200px] sm:max-w-none" title={lead.email}>
                                {lead.email}
                              </span>
                              <button
                                onClick={() => navigator.clipboard.writeText(lead.email)}
                                className="p-1 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200 flex-shrink-0"
                                title="Copy email"
                              >
                                <svg className="w-3 h-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Phone */}
                        <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Phone</span>
                            <span className="inline-block px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-300 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-700 whitespace-nowrap">
                              {lead.phone}
                            </span>
                          </div>
                        </div>

                        {/* Company */}
                        <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Company</span>
                            <span className="inline-block px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-300 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-700 truncate max-w-[200px] sm:max-w-none" title={lead.company_name || 'No company'}>
                              {lead.company_name || '—'}
                            </span>
                          </div>
                        </div>

                        {/* Appointment Info */}
                        <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Appointment</span>
                            {lead.appointment ? (
                              <div className="flex items-center gap-2">
                                <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <div className="text-right">
                                  <div className="text-sm font-semibold text-gray-900 dark:text-white">
                                    {new Date(lead.appointment.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                  </div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400">{lead.appointment.time}</div>
                                </div>
                              </div>
                            ) : (
                              <span className="px-3 py-1 rounded-full text-xs font-semibold border shadow whitespace-nowrap bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-700">N/A</span>
                            )}
                          </div>
                        </div>

                        {/* Lead Details */}
                        {/* Source */}
                        <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Source</span>
                            <span className="inline-block px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-300 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-700 whitespace-nowrap">
                              {lead.source}
                            </span>
                          </div>
                        </div>

                        {/* Lead Score */}
                        <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Lead Score</span>
                            {(() => {
                              const score = getLeadScore(lead);
                              const numericScore = typeof score === 'number' ? score : parseInt(score.toString()) || 0;
                              const percentage = Math.min(Math.max(numericScore, 0), 100);

                              return (
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2 max-w-[100px] sm:max-w-[150px]">
                                    <div
                                      className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-300"
                                      style={{ width: `${percentage}%` }}
                                    ></div>
                                  </div>
                                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 min-w-8 text-right whitespace-nowrap">
                                    {percentage}%
                                  </span>
                                </div>
                              );
                            })()}
                          </div>
                        </div>

                        {/* Additional Info */}
                        {/* Interest */}
                        {lead.interest && (
                          <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Interest</span>
                              <span className="inline-block px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-300 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-700 whitespace-nowrap">
                                {lead.interest}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Agent */}
                        {(() => {
                          try {
                            const metadata = typeof lead.lead_metadata === "string" ? JSON.parse(lead.lead_metadata) : lead.lead_metadata;
                            const rawAgentCandidate =
                              lead?.assigned_agent_name ||
                              lead?.assignment?.assigned_to_name ||
                              lead?.assignment_results?.assigned_agent?.name ||
                              lead?.assigned_to_name ||
                              lead?.assignment?.assigned_to ||
                              lead?.assignment_results?.assigned_agent?.agent_id ||
                              (lead.agent && lead.agent.trim() ? lead.agent : (metadata?.agent || "—"));
                            let displayName = rawAgentCandidate;
                            if (typeof displayName === 'string' && displayName !== '—') {
                              if (displayName.includes('@')) {
                                // Handle email format
                                const local = displayName.split('@')[0];
                                displayName = local
                                  .replace(/[._-]+/g, ' ')
                                  .trim()
                                  .split(' ')
                                  .filter(Boolean)
                                  .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
                                  .join(' ');
                                if (!displayName) displayName = '—';
                              } else {
                                // Capitalize first letter of regular names (e.g., "mayank" -> "Mayank", "arjun" -> "Arjun")
                                displayName = displayName.trim();
                                if (displayName.length > 0) {
                                  displayName = displayName.charAt(0).toUpperCase() + displayName.slice(1).toLowerCase();
                                }
                              }
                            }
                            return (
                              <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                                <div className="flex justify-between items-center">
                                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Agent</span>
                                  <span className="inline-block px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-300 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-700 whitespace-nowrap">
                                    {displayName}
                                  </span>
                                </div>
                              </div>
                            );
                          } catch {
                            return (
                              <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                                <div className="flex justify-between items-center">
                                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Agent</span>
                                  <span className="inline-block px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-300 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-700 whitespace-nowrap">
                                    —
                                  </span>
                                </div>
                              </div>
                            );
                          }
                        })()}

                        {/* Assign Status */}
                        <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Assign Status</span>
                            {(() => {
                              const isAssigned = !!(
                                lead?.assignment?.assigned_agent_id ||
                                lead?.assigned_agent_name ||
                                lead?.assignment?.assigned_to ||
                                lead?.assignment_results?.assigned_agent ||
                                lead?.assignment_id
                              );
                              const label = isAssigned ? 'Assigned' : 'Unassigned';
                              return (
                                <span className="inline-block px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-300 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-700">
                                  {label}
                                </span>
                              );
                            })()}
                          </div>
                        </div>

                        {/* Date */}
                        <div className="flex justify-between items-center pt-2 border-t border-gray-200 dark:border-gray-700">
                          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Created</span>
                          <span className="text-sm text-gray-900 dark:text-white font-medium">
                            {lead.created_at ? new Date(lead.created_at).toLocaleDateString("en-GB", {
                              day: "numeric",
                              month: "short",
                              year: "2-digit"
                            }) : '—'}
                          </span>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-200 dark:border-gray-700">
                          {(() => {
                            const isAssigned = !!(
                              lead?.assignment?.assigned_agent_id ||
                              lead?.assignment?.assigned_to ||
                              lead?.assignment_results?.assigned_agent
                            );
                            return (
                              <button
                                title={isAssigned ? "Change agent" : "Assign to agent"}
                                className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/20 transition-all duration-200 hover:scale-110"
                                onClick={() => openAssignModal(lead)}
                              >
                                {isAssigned ? (
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                  </svg>
                                ) : (
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                                  </svg>
                                )}
                              </button>
                            );
                          })()}
                          <button
                            title="Edit lead"
                            className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/20 transition-all duration-200 hover:scale-110"
                            onClick={async (e) => {
                              e.preventDefault();
                              setIsCreateModalOpen(true);
                              setEditingLead(null);
                              setEditingLeadLoading(true);
                              try {
                                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/leads/`);
                                const list = await res.json();
                                const fresh = Array.isArray(list) ? list.find((l: Lead) => l.id === lead.id) : null;
                                setEditingLead(fresh || lead);
                              } catch (err) {
                                console.error('Failed to fetch lead for edit:', err);
                                setEditingLead(lead);
                                showAlertMessage('Failed to fetch fresh lead data. Using cached values.', 'error');
                              } finally {
                                setEditingLeadLoading(false);
                              }
                            }}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                        </div>

                        {/* Status */}

                        <div className="flex justify-between items-start">

                          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Status:</span>

                          <div className="text-right">

                            {(() => {

                              // Don't show "assigned" as status - preserve original status
                              let status = lead.status || 'new';
                              const statusLower = status.toLowerCase();

                              // If status is "assigned", try to get original status from metadata or default to "new"
                              if (statusLower === 'assigned') {
                                try {
                                  const metadata = typeof lead.lead_metadata === "string" ? JSON.parse(lead.lead_metadata) : lead.lead_metadata;
                                  status = metadata?.original_status || metadata?.status || 'new';
                                } catch {
                                  status = 'new';
                                }
                              }

                              const finalStatusLower = status.toLowerCase();



                              // Define status colors based on the image

                              let statusClasses = '';

                              if (finalStatusLower === 'in process') {

                                statusClasses = 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-700';

                              } else if (finalStatusLower === 'open') {

                                statusClasses = 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-700';


                              } else if (finalStatusLower === 'new') {

                                statusClasses = 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-700';

                              } else if (finalStatusLower === 'won') {

                                statusClasses = 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-700';

                              } else if (finalStatusLower === 'lost') {

                                statusClasses = 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-700';

                              } else if (finalStatusLower === 'prospect') {

                                statusClasses = 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-700';

                              } else if (finalStatusLower === 'qualified') {

                                statusClasses = 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-700';

                              } else {

                                // Default color for unknown statuses

                                statusClasses = 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-900/20 dark:text-gray-300 dark:border-gray-700';

                              }



                              return (

                                <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border shadow whitespace-nowrap ${statusClasses}`}>

                                  {status}

                                </span>

                              );

                            })()}

                          </div>

                        </div>

                        {/* Date - Hidden on mobile */}
                        <div className="hidden sm:flex justify-between items-start">

                          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Date:</span>

                          <span className="text-sm text-gray-900 dark:text-white">

                            {new Date(lead.created_at).toLocaleDateString("en-GB", {

                              day: "numeric",

                              month: "short",

                              year: "2-digit"

                            })}

                          </span>

                        </div>

                      </div>

                    </div>
                  );
                })}

              </div>

            )}

          </div>

          {/* Enhanced Pagination */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
              <div className="flex items-center gap-2 sm:gap-4">
                <div className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">
                  <span className="hidden sm:inline">Showing </span>
                  <span className="font-semibold">{(currentPage - 1) * leadsPerPage + 1}</span>
                  <span className="hidden sm:inline"> to </span>
                  <span className="sm:hidden">-</span>
                  <span className="font-semibold">
                    {Math.min(currentPage * leadsPerPage, filteredLeads.length)}
                  </span>
                  <span className="hidden sm:inline"> of </span>
                  <span className="sm:hidden">/</span>
                  <span className="font-semibold">{filteredLeads.length}</span>
                  <span className="hidden sm:inline"> results</span>
                </div>
                <div className="flex items-center gap-1 sm:gap-2">
                  <label className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">
                    <span className="hidden sm:inline">Rows per page:</span>
                    <span className="sm:hidden">Rows:</span>
                  </label>
                  <select
                    value={leadsPerPage}
                    onChange={(e) => {
                      setLeadsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="px-2 sm:px-3 py-1 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-xs sm:text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-1 sm:gap-2">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="px-2 sm:px-3 py-2 rounded-lg text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  <span className="hidden sm:inline">First</span>
                  <span className="sm:hidden">«</span>
                </button>
                <button
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-2 sm:px-3 py-2 rounded-lg text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  <span className="hidden sm:inline">Previous</span>
                  <span className="sm:hidden">‹</span>
                </button>

                {/* Page Numbers */}
                {Array.from({ length: Math.ceil(filteredLeads.length / leadsPerPage) }, (_, i) => i + 1)
                  .filter(page => {
                    const totalPages = Math.ceil(filteredLeads.length / leadsPerPage);
                    return page === 1 || page === totalPages || Math.abs(page - currentPage) <= 2;
                  })
                  .map((page, index, array) => (
                    <React.Fragment key={page}>
                      {index > 0 && array[index - 1] !== page - 1 && (
                        <span className="px-2 text-gray-400">...</span>
                      )}
                      <button
                        onClick={() => setCurrentPage(page)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${currentPage === page
                          ? 'bg-blue-500 text-white shadow-lg'
                          : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                          }`}
                      >
                        {page}
                      </button>
                    </React.Fragment>
                  ))}

                <button
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage >= Math.ceil(filteredLeads.length / leadsPerPage)}
                  className="px-2 sm:px-3 py-2 rounded-lg text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  <span className="hidden sm:inline">Next</span>
                  <span className="sm:hidden">›</span>
                </button>
                <button
                  onClick={() => setCurrentPage(Math.ceil(filteredLeads.length / leadsPerPage))}
                  disabled={currentPage >= Math.ceil(filteredLeads.length / leadsPerPage)}
                  className="px-2 sm:px-3 py-2 rounded-lg text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  <span className="hidden sm:inline">Last</span>
                  <span className="sm:hidden">»</span>
                </button>
              </div>
            </div>
          </div>


          {/* Blur overlay for modal */}

          {isCreateModalOpen && (

            <div className="fixed inset-0 z-40 bg-black/10 backdrop-blur-[2px]" />

          )}

          {/* Modal */}

          {isCreateModalOpen && (

            <div

              className="fixed inset-0 z-50 flex items-start justify-center p-2 sm:p-4 pt-12 sm:pt-16 lg:pt-24 overflow-y-auto"

              onClick={() => { setIsCreateModalOpen(false); setEditingLead(null); setEditingLeadLoading(false); }}

            >

              <div

                className="relative w-full max-w-xs sm:max-w-md md:max-w-2xl lg:max-w-3xl bg-transparent rounded-2xl outline-none focus:outline-none mt-2 sm:mt-4 mb-4 sm:mb-6"

                onClick={e => e.stopPropagation()}

              >

                {/* Alert messages now handled by the main Alert component above */}

                {editingLeadLoading ? (

                  <div className="w-full bg-white dark:bg-gray-900 pt-6 sm:pt-10 pb-8 sm:pb-12 rounded-2xl flex items-center justify-center">

                    <Loader />

                  </div>

                ) : (

                  <LeadsForm

                    showAlertMessage={showAlertMessage}

                    onSubmitStart={() => {
                      // Close modal immediately and show table loading while data refreshes
                      setIsCreateModalOpen(false);
                      setEditingLead(null);
                      setEditingLeadLoading(false);
                      setLoading(true);
                    }}

                    onSuccess={() => {

                      setIsCreateModalOpen(false);

                      setEditingLead(null);

                      setEditingLeadLoading(false);

                      // Show table loading while refetching leads
                      setLoading(true);

                      fetchLeads();

                    }}

                    onClose={() => { setIsCreateModalOpen(false); setEditingLead(null); setEditingLeadLoading(false); }}

                    editingLead={editingLead}

                  />

                )}

              </div>

            </div>

          )}

          {/* Modal for last lead detail */}

          {modalLead && (

            <div className="fixed inset-0 z-99999 flex items-center justify-center bg-black/30">

              <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl p-8  max-w-md w-full relative">

                <button

                  onClick={closeModal}

                  className="absolute top-3 right-3 text-gray-500 hover:text-gray-800 text-xl font-bold"

                  aria-label="Close"

                >

                  &times;

                </button>

                <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-100">Last Lead Details</h2>

                <div className="space-y-2 text-gray-700 dark:text-gray-200">

                  {modalType === 'email' && (

                    <div><b>Total Leads with this Email:</b> {modalCount}</div>

                  )}

                  {modalType === 'phone' && (

                    <div><b>Total Leads with this Phone:</b> {modalCount}</div>

                  )}

                  <div><b>Name:</b> {modalLead?.name}</div>

                  <div><b>Email:</b> {modalLead?.email}</div>

                  <div><b>Phone:</b> {modalLead?.phone}</div>

                  <div><b>Interest:</b> {(() => { try { const meta = typeof modalLead?.lead_metadata === 'string' ? JSON.parse(modalLead.lead_metadata) : modalLead?.lead_metadata; return meta?.interest || '—'; } catch { return '—'; } })()}</div>

                  <div><b>Source:</b> {modalLead?.source}</div>

                  <div><b>Lead Score:</b> {modalLead?.score ?? '—'}</div>

                  <div>

                    <b>Last Lead Date:</b> {modalLead?.created_at ? new Date(modalLead.created_at).toLocaleDateString('en-GB', {

                      day: '2-digit',

                      month: 'short',

                      year: 'numeric'

                    }) : '—'}

                  </div>

                </div>

              </div>

            </div>

          )}

          {/* Appointment Modal */}
          {showAppointmentModal && selectedLead && (
            <div className="fixed inset-0 bg-black/10 backdrop-blur-[2px] flex items-center justify-center z-50 p-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
                {/* Modal Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-3">
                    <FaCalendarAlt className="w-6 h-6 text-blue-600" />
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                        Appointments for {selectedLead.name}
                      </h2>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Lead ID: {getLeadId(selectedLead) || '—'}
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
                  ) : leadAppointments.length > 0 ? (
                    <div className="space-y-4">
                      {leadAppointments.map((appointment) => (
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
                                onClick={() => openEditAppointmentModal(appointment)}
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
                        This lead doesn&apos;t have any appointments yet.
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
          {showBookModal && bookingLead && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-auto">
                <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-3">
                    <FaCalendarAlt className="w-5 h-5 text-blue-600" />
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Book appointment</h3>
                      <p className="text-xs text-gray-500">Lead: {bookingLead.name} • {bookingLead.email}</p>
                    </div>
                  </div>
                  <button onClick={() => setShowBookModal(false)} className="p-2 text-gray-400 hover:text-gray-600"><FaTimes className="w-5 h-5" /></button>
                </div>

                <div className="p-5 grid grid-cols-1 gap-6">
                  <div className="space-y-3">
                    <label className="text-sm text-gray-600">Service</label>
                    <div className="w-full border rounded-lg px-3 py-2 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white">
                      {selectedServiceName || services.find(s => s.id === selectedServiceId)?.name || 'Loading...'}
                    </div>

                    <label className="text-sm text-gray-600">Select date</label>
                    <input
                      readOnly
                      value={selectedDate || ''}
                      placeholder="Click to select date"
                      onClick={() => setShowDatePicker(!showDatePicker)}
                      className="w-full border rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white cursor-pointer"
                    />
                    {showDatePicker && (
                      <div className="mt-2">
                        <VisualCalendar
                          onDateSelect={handleDatePick}
                          availableDates={availableDates}
                          selectedDate={selectedDate}
                          serviceName={selectedServiceName || services.find(s => s.id === selectedServiceId)?.name}
                          compact={true}
                        />
                      </div>
                    )}
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm text-gray-600">Available time slots</label>
                      <select
                        value={selectedSlotId}
                        onChange={(e) => setSelectedSlotId(e.target.value)}
                        className="w-full border rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option value="" disabled>{selectedDate ? 'Select a time slot' : 'Please select a date first'}</option>
                        {dateSlots.map(s => (
                          <option key={s.id} value={s.id}>{s.label}</option>
                        ))}
                      </select>
                    </div>

                    {/* Contact form fields */}
                    <div className="space-y-3 pt-2">
                      <div>
                        <label className="text-sm text-gray-600">Name *</label>
                        <input value={bookName} onChange={(e) => setBookName(e.target.value)} className="w-full border rounded-lg px-3 py-2 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white" placeholder="Customer name" />
                      </div>
                      <div>
                        <label className="text-sm text-gray-600">Email *</label>
                        <input type="email" value={bookEmail} onChange={(e) => setBookEmail(e.target.value)} className="w-full border rounded-lg px-3 py-2 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white" placeholder="name@example.com" />
                      </div>
                      <div>
                        <label className="text-sm text-gray-600">Phone *</label>
                        <input value={bookPhone} onChange={(e) => setBookPhone(e.target.value)} className="w-full border rounded-lg px-3 py-2 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white" placeholder="+91 98765 43210" />
                      </div>
                      <div>
                        <label className="text-sm text-gray-600">Additional Notes</label>
                        <textarea value={bookNotes} onChange={(e) => setBookNotes(e.target.value)} rows={3} className="w-full border rounded-lg px-3 py-2 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white" placeholder="Any specific requirements or questions..." />
                      </div>
                    </div>

                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={submitLeadBooking}
                        disabled={!selectedSlotId || bookingSubmitting}
                        className={`flex-1 px-4 py-3 rounded-lg text-white font-semibold disabled:opacity-50 ${bookingSubmitting ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'}`}
                      >
                        {bookingSubmitting ? 'Booking…' : 'Book Appointment'}
                      </button>
                      <button
                        onClick={() => setShowBookModal(false)}
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
          {showEditAppointmentModal && editingAppointment && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-auto">
                <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-3">
                    <FaCalendarAlt className="w-5 h-5 text-blue-600" />
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Edit appointment</h3>
                      <p className="text-xs text-gray-500">Service: {editingAppointment.service_name}</p>
                    </div>
                  </div>
                  <button onClick={() => setShowEditAppointmentModal(false)} className="p-2 text-gray-400 hover:text-gray-600"><FaTimes className="w-5 h-5" /></button>
                </div>

                <div className="p-5 grid grid-cols-1 gap-6">
                  <div className="space-y-3">
                    <label className="text-sm text-gray-600">Service</label>
                    <div className="w-full border rounded-lg px-3 py-2 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white">
                      {editingAppointment.service_name || 'N/A'}
                    </div>

                    <label className="text-sm text-gray-600">Select date</label>
                    <input
                      readOnly
                      value={editDate || ''}
                      placeholder="Click to select date"
                      onClick={() => !showCancelReason && setEditShowDatePicker(!editShowDatePicker)}
                      disabled={showCancelReason}
                      className={`w-full border rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${showCancelReason ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                    />
                    {editShowDatePicker && !showCancelReason && (
                      <div className="mt-2">
                        <VisualCalendar
                          onDateSelect={handleEditDatePick}
                          availableDates={editAvailableDates}
                          selectedDate={editDate}
                          serviceName={editingAppointment.service_name}
                          compact={true}
                        />
                      </div>
                    )}
                  </div>
                  <div className="space-y-4">
                    {!showCancelReason && (
                      <>
                        <div>
                          <label className="text-sm text-gray-600">Available time slots</label>
                          <select
                            value={editSelectedSlotId}
                            onChange={(e) => setEditSelectedSlotId(e.target.value)}
                            className="w-full border rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          >
                            <option value="" disabled>{editDate ? 'Select a time slot' : 'Please select a date first'}</option>
                            {editDateSlots.map((s: FormattedSlot) => (
                              <option key={s.id} value={s.id}>{s.label}</option>
                            ))}
                          </select>
                        </div>
                      </>
                    )}
                  </div>

                  {showCancelReason && (
                    <div>
                      <label className="text-sm text-gray-600">Cancellation Reason *</label>
                      <textarea
                        value={cancelReason}
                        onChange={(e) => setCancelReason(e.target.value)}
                        rows={3}
                        className="w-full border rounded-lg px-3 py-2 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="Please provide a reason for cancellation..."
                        required
                      />
                    </div>
                  )}

                  <div className="flex gap-2 pt-1">
                    {!showCancelReason ? (
                      <>
                        <button
                          onClick={submitUpdateAppointment}
                          disabled={!editDate || !editSelectedSlotId || editSubmitting}
                          className={`flex-1 px-4 py-3 rounded-lg text-white font-semibold disabled:opacity-50 ${editSubmitting ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'}`}
                        >
                          {editSubmitting ? 'Updating…' : 'Update Appointment'}
                        </button>
                        <button
                          onClick={() => { setShowCancelReason(true); setEditShowDatePicker(false); }}
                          className="px-4 py-3 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold"
                        >
                          Cancel Appointment
                        </button>
                        <button
                          onClick={() => setShowEditAppointmentModal(false)}
                          className="px-4 py-3 rounded-lg bg-gray-200 text-gray-700 font-semibold"
                        >
                          Close
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={submitCancelAppointment}
                          disabled={!cancelReason.trim() || editSubmitting}
                          className={`flex-1 px-4 py-3 rounded-lg text-white font-semibold disabled:opacity-50 ${editSubmitting ? 'bg-red-400' : 'bg-red-600 hover:bg-red-700'}`}
                        >
                          {editSubmitting ? 'Cancelling…' : 'Confirm Cancellation'}
                        </button>
                        <button
                          onClick={() => { setShowCancelReason(false); setCancelReason(''); }}
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
          )}

          {/* Assignment Modal */}
          {showAssignModal && assigningLead && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
                {/* Modal Header */}
                <div className="flex justify-between items-center px-6 py-5 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-750">
                  {(() => {
                    const isAssigned = !!(
                      assigningLead?.assignment?.assigned_agent_id ||
                      assigningLead?.assignment?.assigned_to ||
                      assigningLead?.assignment_results?.assigned_agent
                    );
                    return (
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                        {isAssigned ? 'Change Agent Assignment' : 'Assign Lead to Agent'}
                      </h3>
                    );
                  })()}
                  <button
                    onClick={closeAssignModal}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                    aria-label="Close modal"
                  >
                    <FaTimes className="w-5 h-5" />
                  </button>
                </div>

                {/* Modal Body - Scrollable */}
                <div className="flex-1 overflow-y-auto px-6 py-6">
                  {/* Lead Information Section */}
                  <div className="mb-6 space-y-3">
                    <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                      <div className="space-y-2.5">
                        <div className="flex items-start gap-3">
                          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider min-w-[180px] flex-shrink-0">Lead:</span>
                          <span className="text-sm font-medium text-gray-900 dark:text-white flex-1">
                            {assigningLead.name} <span className="text-gray-500 dark:text-gray-400">({getLeadId(assigningLead) || assigningLead.id})</span>
                          </span>
                        </div>
                        <div className="flex items-start gap-3 pt-2 border-t border-gray-200 dark:border-gray-700">
                          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider min-w-[180px] flex-shrink-0">Email:</span>
                          <span className="text-sm text-gray-900 dark:text-white flex-1">{assigningLead.email}</span>
                        </div>
                        {(() => {
                          const currentAgentName = assigningLead?.assigned_agent_name ||
                            assigningLead?.assignment?.assigned_to_name ||
                            assigningLead?.assignment_results?.assigned_agent?.name;
                          const currentAgentId = assigningLead?.assignment?.assigned_agent_id ||
                            assigningLead?.assignment?.assigned_to ||
                            assigningLead?.assignment_results?.assigned_agent?.agent_id;
                          if (currentAgentName || currentAgentId) {
                            // Capitalize agent name properly
                            const agentDisplayName = currentAgentName || currentAgentId || 'Unknown Agent';
                            const capitalizedName = typeof agentDisplayName === 'string' && agentDisplayName !== 'Unknown Agent'
                              ? agentDisplayName
                                .split(' ')
                                .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                                .join(' ')
                              : agentDisplayName;

                            return (
                              <div className="flex items-start gap-3 pt-2 border-t border-gray-200 dark:border-gray-700">
                                <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider min-w-[180px] flex-shrink-0">Currently Assigned to:</span>
                                <span className="text-sm font-semibold text-amber-600 dark:text-amber-400 flex-1">
                                  {capitalizedName}
                                </span>
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    </div>
                  </div>

                  {/* Agent Selection Section - Extra spacing to prevent overlay */}
                  <div className="mb-6">
                    <div className="relative mb-8">
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
                        Select Agent
                      </label>
                      {loadingAgents ? (
                        <div className="flex items-center justify-center py-12">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        </div>
                      ) : (
                        <div className="relative z-[70] mt-1">
                          <div
                            className="w-full px-4 py-3.5 border-2 border-gray-300 dark:border-gray-600 rounded-xl focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 dark:bg-gray-700 dark:text-white bg-white text-gray-900 font-medium shadow-sm hover:border-gray-400 dark:hover:border-gray-500 transition-all cursor-pointer"
                            onMouseDown={(e) => { e.preventDefault(); setAgentDropdownOpen((o) => !o); }}
                            onClick={(e) => { e.preventDefault(); }}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="truncate">
                                {(() => {
                                  const selected = availableAgents.find(a => a.agent_id === selectedAgentId);
                                  const label = selected?.agent_name
                                    ? selected.agent_name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
                                    : (selectedAgentId || '');
                                  return selected
                                    ? `${label} (${selected.agent_email})`
                                    : 'Choose an agent...';
                                })()}
                              </div>
                              <svg className={`w-5 h-5 text-gray-500 transition-transform ${agentDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </div>
                          </div>

                          {agentDropdownOpen && (
                            <div className="absolute left-0 right-0 mt-2 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl overflow-hidden will-change-transform">
                              <div className="p-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40">
                                <input
                                  autoFocus
                                  value={agentSearch}
                                  onChange={(e) => { setAgentSearch(e.target.value); setAgentHighlight(-1); }}
                                  onKeyDown={(e) => {
                                    const filtered = availableAgents.filter(a => {
                                      const name = (a.agent_name || '').toLowerCase();
                                      const email = (a.agent_email || '').toLowerCase();
                                      const q = agentSearch.toLowerCase();
                                      return name.includes(q) || email.includes(q);
                                    });
                                    if (e.key === 'ArrowDown') {
                                      e.preventDefault();
                                      setAgentHighlight((h) => Math.min(h + 1, filtered.length - 1));
                                    } else if (e.key === 'ArrowUp') {
                                      e.preventDefault();
                                      setAgentHighlight((h) => Math.max(h - 1, 0));
                                    } else if (e.key === 'Enter') {
                                      e.preventDefault();
                                      const sel = filtered[agentHighlight] || filtered[0];
                                      if (sel) {
                                        setSelectedAgentId(sel.agent_id);
                                        setAgentDropdownOpen(false);
                                      }
                                    } else if (e.key === 'Escape') {
                                      setAgentDropdownOpen(false);
                                    }
                                  }}
                                  placeholder="Search agent by name or email..."
                                  className="w-full px-3 py-2 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500"
                                />
                              </div>
                              <ul className="max-h-64 overflow-auto py-1">
                                {availableAgents
                                  .filter(a => {
                                    const name = (a.agent_name || '').toLowerCase();
                                    const email = (a.agent_email || '').toLowerCase();
                                    const q = agentSearch.toLowerCase();
                                    return name.includes(q) || email.includes(q);
                                  })
                                  .map((agent, idx) => {
                                    const agentDisplayName = agent.agent_name
                                      ? agent.agent_name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
                                      : agent.agent_id;
                                    const active = idx === agentHighlight || agent.agent_id === selectedAgentId;
                                    return (
                                      <li
                                        key={agent.agent_id}
                                        onMouseEnter={() => setAgentHighlight(idx)}
                                        onMouseDown={(e) => { e.preventDefault(); setSelectedAgentId(agent.agent_id); setAgentDropdownOpen(false); }}
                                        className={`px-4 py-2 cursor-pointer flex items-center justify-between ${active ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-200' : 'text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}
                                      >
                                        <span className="truncate">{agentDisplayName} ({agent.agent_email})</span>
                                        {agent.agent_id === selectedAgentId && (
                                          <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                          </svg>
                                        )}
                                      </li>
                                    );
                                  })}
                                {availableAgents.filter(a => {
                                  const name = (a.agent_name || '').toLowerCase();
                                  const email = (a.agent_email || '').toLowerCase();
                                  const q = agentSearch.toLowerCase();
                                  return name.includes(q) || email.includes(q);
                                }).length === 0 && (
                                    <li className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">No agents found</li>
                                  )}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                      {availableAgents.length === 0 && !loadingAgents && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-3 px-4 py-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
                          No agents available. Please create agent profiles first.
                        </p>
                      )}
                    </div>

                    {/* Confirmation Message - Positioned with margin to avoid dropdown overlap */}
                    {selectedAgentId && (() => {
                      const currentAgentId = assigningLead?.assignment?.assigned_agent_id ||
                        assigningLead?.assignment?.assigned_to ||
                        assigningLead?.assignment_results?.assigned_agent?.agent_id;
                      const isReassignment = currentAgentId && currentAgentId !== selectedAgentId;
                      const selectedAgent = availableAgents.find(a => a.agent_id === selectedAgentId);

                      return (
                        <div className={`${isReassignment ? 'bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-300 dark:border-amber-700' : 'bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-300 dark:border-blue-700'} rounded-xl p-4 shadow-sm mt-4`}>
                          <div className="flex items-start gap-3">
                            <div className={`flex-shrink-0 w-5 h-5 rounded-full ${isReassignment ? 'bg-amber-500' : 'bg-blue-500'} flex items-center justify-center mt-0.5`}>
                              {isReassignment ? (
                                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                </svg>
                              ) : (
                                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </div>
                            <p className={`text-sm font-medium leading-relaxed ${isReassignment ? 'text-amber-800 dark:text-amber-200' : 'text-blue-800 dark:text-blue-200'}`}>
                              {isReassignment ? (
                                <>
                                  This lead will be reassigned from the current agent to <strong className="font-bold">
                                    {selectedAgent?.agent_name
                                      ? selectedAgent.agent_name.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')
                                      : selectedAgentId}
                                  </strong>.
                                  The previous agent&apos;s workload will decrease and the new agent&apos;s workload will increase.
                                  The new agent will receive a notification email.
                                </>
                              ) : (
                                <>
                                  This lead will be assigned to <strong className="font-bold">
                                    {selectedAgent?.agent_name
                                      ? selectedAgent.agent_name.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')
                                      : selectedAgentId}
                                  </strong>.
                                  The agent will receive a notification email.
                                </>
                              )}
                            </p>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-5 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                  <button
                    onClick={closeAssignModal}
                    className="px-6 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-600 hover:border-gray-400 dark:hover:border-gray-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                    disabled={assigning}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAssignLead}
                    disabled={!selectedAgentId || assigning || loadingAgents}
                    className="px-6 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98]"
                  >
                    {assigning ? (
                      <span className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                        {(() => {
                          const currentAgentId = (assigningLead as LeadWithAgentInfo)?.assigned_agent_id ||
                            (assigningLead as LeadWithAgentInfo)?.assignment?.assigned_to ||
                            ((assigningLead as LeadWithAgentInfo)?.assignment_results as { assigned_agent?: { agent_id?: string } })?.assigned_agent?.agent_id;
                          const isReassignment = currentAgentId && currentAgentId !== selectedAgentId;
                          return isReassignment ? 'Reassigning...' : 'Assigning...';
                        })()}
                      </span>
                    ) : (
                      (() => {
                        const currentAgentId = (assigningLead as LeadWithAgentInfo)?.assigned_agent_id ||
                          (assigningLead as LeadWithAgentInfo)?.assignment?.assigned_to ||
                          ((assigningLead as LeadWithAgentInfo)?.assignment_results as { assigned_agent?: { agent_id?: string } })?.assigned_agent?.agent_id;
                        const isReassignment = currentAgentId && currentAgentId !== selectedAgentId;
                        return isReassignment ? 'Change Agent' : 'Assign Lead';
                      })()
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Reassignment Reason Modal - Only for Sales Role */}
          {showReasonModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-50" style={{ zIndex: 9999 }}>
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-lg mx-4 shadow-2xl">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <span className="text-amber-500">⚠</span>
                    Reason for Reassignment Required
                  </h3>
                  <button
                    onClick={() => {
                      setShowReasonModal(false);
                      setReassignmentReason('');
                      setPendingAssignment(null);
                    }}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <FaTimes className="w-6 h-6" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                    <p className="text-sm text-amber-800 dark:text-amber-200">
                      As a Sales Agent, you are required to provide a reason when reassigning a lead.
                      This reason will be sent to the Sales Head for review.
                    </p>
                  </div>

                  {pendingAssignment && assigningLead && (
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        <strong>Reassigning to:</strong> {pendingAssignment.agentName}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        <strong>Lead:</strong> {assigningLead.name || 'Unknown'} ({pendingAssignment.leadId})
                      </p>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Reason for Reassignment <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={reassignmentReason}
                      onChange={(e) => setReassignmentReason(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      rows={5}
                      placeholder="Please provide a detailed reason for reassigning this lead..."
                      required
                    />
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Minimum 10 characters required
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 justify-end mt-6">
                  <button
                    onClick={() => {
                      setShowReasonModal(false);
                      setReassignmentReason('');
                      setPendingAssignment(null);
                    }}
                    className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmReassignment}
                    disabled={!reassignmentReason.trim() || reassignmentReason.trim().length < 10 || assigning}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                  >
                    {assigning ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                        Reassigning...
                      </>
                    ) : (
                      'Confirm Reassignment'
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

      </div>

    </div>

  );

}