"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import PageHeader from "@/components/common/PageHeader";
import { Users, PlusSquare, Clock, CheckCircle, Shield } from "lucide-react";
import * as XLSX from "xlsx";
import ActionBar from "@/components/header/actionbar";
import Pagination from "@/components/tables/Pagination";
import Alert from "@/components/ui/alert/Alert";
import { getAuthHeaders } from "@/utils/api";

// Types
type Lead = {
  id: number;
  name: string;
  email: string;
  phone: string;
  lead_metadata: string;
  source: string;
  score?: number;
  created_at: string;
  status: string;
  interest?: string;
  message?: string;
  agent_id?: number;
  region?: string;
  stage?: string;
  // Assignment fields (backend may provide in different shapes)
  assignment?: Record<string, unknown>;
  assignment_results?: Record<string, unknown>;
  assigned_to_name?: string;
  assigned_to?: string;
};

// API Configuration - Use environment variables
const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "https://py-mobiloitte.converiqo.ai";
const API_BASE = `${BACKEND_URL}/api/v1/leads-integration`;
const LEADS_LIST_URL = `${BACKEND_URL}/api/v1/leads/`;

// Helper function to capitalize names properly (handles multiple words)
const capitalizeName = (name: string | null | undefined): string => {
  if (!name || typeof name !== 'string') return name || '';
  // Handle special cases
  if (name === 'Unknown Agent' || name === 'Not Available' || name === '—') return name;
  // Split by spaces and capitalize each word
  return name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
    .trim();
};

// Lead Integration Form Component
interface LeadIntegrationFormProps {
  showAlertMessage: (message: string, type: 'success' | 'error') => void;
  onSuccess?: () => void;
}

const LeadIntegrationForm = ({ showAlertMessage, onSuccess }: LeadIntegrationFormProps) => {
  const [formData, setFormData] = React.useState({
    name: '',
    email: '',
    phone: '',
    interest: '',
    source: '',
    message: '',
    company_name: '',
  });
  const [loading, setLoading] = React.useState(false);
  const [formKey, setFormKey] = React.useState(0);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  // Dropdown options: mirror CRM Leads options
  const [interestOptions, setInterestOptions] = React.useState<string[]>([]);
  const [sourceOptions, setSourceOptions] = React.useState<string[]>([]);

  // Form validation
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^[\+]?[1-9][\d]{0,15}$/.test(formData.phone.replace(/[\s\-\(\)]/g, ''))) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    if (!formData.company_name.trim()) {
      newErrors.company_name = 'Company name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setErrors({});

    // Get visitor tracking data
    interface TrackingData {
      visitorId?: string;
      sessionId?: string;
      [key: string]: unknown;
    }
    interface WindowWithTracking {
      getTrackingData?: () => TrackingData | null | undefined;
    }
    const getTrackingDataFn = typeof window !== 'undefined' ? (window as WindowWithTracking).getTrackingData : undefined;
    const trackingData: TrackingData | null = getTrackingDataFn ? (getTrackingDataFn() || null) : null;

    const payload = {
      name: formData.name.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim(),
      lead_metadata: {
        interest: formData.interest.trim(),
        message: formData.message.trim(),
        source: formData.source
      },
      source: formData.source,
      interest: formData.interest.trim(),
      message: formData.message.trim(),
      company_name: formData.company_name.trim(),
      // Add visitor tracking data
      visitor_id: trackingData?.visitorId || null,
      session_id: trackingData?.sessionId || null
    };

    try {
      const leadRes = await fetch(`${API_BASE}/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      interface LeadResponseData {
        error?: string;
        [key: string]: unknown;
      }
      let leadResData: LeadResponseData = {};
      try { leadResData = await leadRes.json() as LeadResponseData; } catch { }

      if (!leadRes.ok) {
        setLoading(false);
        showAlertMessage('Lead save failed: ' + ((leadResData as { error?: string }).error || leadRes.statusText), 'error');
        return;
      }

      // Handle non-created statuses returned by backend (e.g., spam or validation_failed)
      const status = (leadResData && typeof leadResData === 'object') ? (leadResData.status as string) : undefined;
      if (status && status !== 'created') {
        setLoading(false);
        const spamScore = typeof leadResData?.spam_score === 'number' ? leadResData.spam_score : 'N/A';
        const errorMessage = typeof leadResData?.message === 'string' ? leadResData.message : 'Lead creation did not complete.';
        const msg = status === 'spam'
          ? `Lead flagged as spam (score: ${spamScore}).`
          : errorMessage;
        showAlertMessage(String(msg), 'error');
        return;
      }

      setLoading(false);
      showAlertMessage('Lead submitted successfully!', 'success');
      setFormData({ name: '', email: '', phone: '', interest: '', source: '', message: '', company_name: '' });
      setFormKey(k => k + 1);
      if (onSuccess) onSuccess();

    } catch (error) {
      setLoading(false);
      showAlertMessage('Network error: ' + (error as Error).message, 'error');
    }
  };

  // Load Source and Interest options exactly like CRM Leads
  React.useEffect(() => {
    const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "https://py-mobiloitte.converiqo.ai";
    interface OptionItem {
      optionid: number;
      list_label: string;
    }
    fetch(`${BACKEND_URL}/api/v1/leads/options`)
      .then((res) => res.json())
      .then((data: unknown) => {
        const optionsArray = Array.isArray(data) ? data as OptionItem[] : [];
        const interests = optionsArray
          .filter((item: OptionItem) => item.optionid === 1)
          .map((item: OptionItem) => item.list_label);
        const sources = optionsArray
          .filter((item: OptionItem) => item.optionid === 2)
          .map((item: OptionItem) => item.list_label);
        setInterestOptions(interests);
        setSourceOptions(sources);
      })
      .catch((err) => console.error('❌ Dropdown load error:', err));
  }, []);

  return (
    <div className="space-y-6">
      {/* Form Header */}
      <div className="text-center bg-gradient-to-r from-blue-50/30 to-indigo-50/30 dark:from-gray-800/20 dark:to-gray-700/20 rounded-xl p-6 border border-blue-100/30 dark:border-gray-700/30">
        <div className="mx-auto w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900 dark:to-blue-800 rounded-full flex items-center justify-center mb-4 shadow-lg">
          <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Create New Lead</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">Fill in the details below to create a new lead</p>
      </div>

      <form onSubmit={handleSubmit} key={formKey} className="space-y-6">
        {/* Basic Information Section */}
        <div className="bg-gradient-to-r from-blue-50/50 to-indigo-50/50 dark:from-gray-800/30 dark:to-gray-700/30 rounded-xl p-6 border border-blue-100/50 dark:border-gray-700/50">
          <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            Basic Information
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Full Name *
              </label>
              <div className="relative">
                <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A8 8 0 1118.879 6.196 8 8 0 015.12 17.804z" />
                </svg>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({ ...formData, name: e.target.value });
                    if (errors.name) setErrors({ ...errors, name: '' });
                  }}
                  className={`w-full pl-9 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-colors ${errors.name
                    ? 'border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/20'
                    : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                    }`}
                  placeholder="Enter full name"
                />
              </div>
              {errors.name && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email Address *
              </label>
              <div className="relative">
                <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => {
                    setFormData({ ...formData, email: e.target.value });
                    if (errors.email) setErrors({ ...errors, email: '' });
                  }}
                  className={`w-full pl-9 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-colors ${errors.email
                    ? 'border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/20'
                    : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                    }`}
                  placeholder="Enter email address"
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.email}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Phone Number *
              </label>
              <div className="relative">
                <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => {
                    setFormData({ ...formData, phone: e.target.value });
                    if (errors.phone) setErrors({ ...errors, phone: '' });
                  }}
                  className={`w-full pl-9 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-colors ${errors.phone
                    ? 'border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/20'
                    : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                    }`}
                  placeholder="Enter phone number"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Include country code, e.g., +91 1234567890</p>
              {errors.phone && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.phone}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Company Name *
              </label>
              <div className="relative">
                <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7l9-4 9 4-9 4-9-4zm0 8l9 4 9-4M3 7v8m18-8v8" />
                </svg>
                <input
                  type="text"
                  value={formData.company_name}
                  onChange={(e) => {
                    setFormData({ ...formData, company_name: e.target.value });
                    if (errors.company_name) setErrors({ ...errors, company_name: '' });
                  }}
                  className={`w-full pl-9 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-colors ${errors.company_name
                    ? 'border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/20'
                    : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                    }`}
                  placeholder="Enter company name"
                />
              </div>
              {errors.company_name && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.company_name}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Lead Source
              </label>
              <div className="relative">
                <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
                <select
                  value={formData.source}
                  onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                  className="w-full pl-9 pr-8 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white hover:border-gray-400 dark:hover:border-gray-500 transition-colors appearance-none"
                >
                  <option value="">Select lead source</option>
                  {sourceOptions.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Information Section */}
        <div className="bg-gradient-to-r from-green-50/50 to-emerald-50/50 dark:from-gray-800/30 dark:to-gray-700/30 rounded-xl p-6 border border-green-100/50 dark:border-gray-700/50">
          <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            Additional Information
          </h4>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Area of Interest
              </label>
              <div className="relative">
                <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
                <select
                  value={formData.interest}
                  onChange={(e) => setFormData({ ...formData, interest: e.target.value })}
                  className="w-full pl-9 pr-8 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white hover:border-gray-400 dark:hover:border-gray-500 transition-colors appearance-none"
                >
                  <option value="">Select interest</option>
                  {interestOptions.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Additional Notes
              </label>
              <textarea
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white hover:border-gray-400 dark:hover:border-gray-500 transition-colors resize-none"
                rows={4}
                placeholder="Any additional information, requirements, or notes about this lead..."
              />
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={() => {
              setFormData({ name: '', email: '', phone: '', interest: '', source: '', message: '', company_name: '' });
              setErrors({});
            }}
            className="px-6 py-3 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium"
          >
            Clear Form
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium flex items-center gap-2 shadow-lg hover:shadow-xl"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Creating Lead...
              </>
            ) : (
              <>
                <Users className="w-4 h-4" />
                Create Lead
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

// Main Lead Integration Page Component
export default function LeadIntegrationPage() {
  const router = useRouter();
  const [leadsData, setLeadsData] = useState<Lead[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterField, setFilterField] = useState("name");
  const [filterQuery, setFilterQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [leadsPerPage, setLeadsPerPage] = useState(10);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  interface SpamLead {
    lead_id?: string | number;
    id?: string | number;
    name?: string;
    email?: string;
    phone?: string;
    company?: string;
    source?: string;
    interest?: string;
    message?: string;
    spam_score?: number;
    spam_reasons?: string[];
    detected_at?: string;
    confidence?: number;
    [key: string]: unknown;
  }
  const [spamLeads, setSpamLeads] = useState<SpamLead[]>([]);
  const [showSpamLeads, setShowSpamLeads] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [downloadMenuOpen, setDownloadMenuOpen] = useState(false);
  const downloadMenuRef = useRef<HTMLDivElement>(null);
  const [mobileDownloadMenuOpen, setMobileDownloadMenuOpen] = useState(false);
  const mobileDownloadMenuRef = useRef<HTMLDivElement>(null);
  const [timelineFilter, setTimelineFilter] = useState('');
  const [pendingCustomRange, setPendingCustomRange] = useState<[Date | null, Date | null]>([null, null]);
  const [showFilterField, setShowFilterField] = useState(false);
  const [showCustomPopover, setShowCustomPopover] = useState(false);
  const customPopoverRef = useRef<HTMLDivElement>(null);

  // Dashboard data states
  const [scoreCache, setScoreCache] = useState<Record<string, number>>({});
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState<'success' | 'error' | 'warning' | 'info'>('info');
  const [showAlert, setShowAlert] = useState(false);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isCreateModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isCreateModalOpen]);

  useEffect(() => {
    if (!showAlert) return;
    const timer = setTimeout(() => setShowAlert(false), 5000);
    return () => clearTimeout(timer);
  }, [showAlert]);

  const showAlertMessage = (message: string, type: 'success' | 'error' | 'warning' | 'info') => {
    setAlertMessage(message);
    setAlertType(type);
    setShowAlert(true);
  };

  // Fetch leads data
  const fetchLeads = async () => {
    setLoading(true);
    try {
      const response = await fetch(LEADS_LIST_URL, {
        headers: { accept: "application/json" }
      });

      if (!response.ok) throw new Error("Failed to fetch leads");

      const data = await response.json();
      interface LeadWithScores extends Lead {
        lead_score?: number;
        ats_score?: number;
        [key: string]: unknown;
      }
      const leadData = (Array.isArray(data) ? data : []).map((l: unknown) => {
        const lead = l as LeadWithScores;
        return {
          ...lead,
          score: typeof lead?.lead_score === 'number' ? lead.lead_score :
            typeof lead?.ats_score === 'number' ? lead.ats_score :
              typeof lead?.score === 'number' ? lead.score : undefined,
        } as Lead;
      });
      setLeadsData(leadData);
      setFilteredLeads(leadData);

      // Load cached scores from localStorage
      if (typeof window !== 'undefined') {
        try {
          const cached = localStorage.getItem('leadIntegrationScoreCache');
          if (cached) setScoreCache(JSON.parse(cached));
        } catch { }
      }
    } catch (error) {
      console.error("Error fetching leads:", error);
      showAlertMessage('Failed to fetch leads: ' + (error as Error).message, 'error');
      setLeadsData([]);
      setFilteredLeads([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch spam leads
  const fetchSpamLeads = async () => {
    try {
      const response = await fetch(`${API_BASE}/spam`, {
        headers: getAuthHeaders()
      });

      if (response.ok) {
        const data = await response.json();
        interface OriginalLeadData {
          name?: string;
          email?: string;
          phone?: string;
          company?: string;
          source?: string;
          interest?: string;
          message?: string;
          [key: string]: unknown;
        }
        interface SpamLeadData {
          original_lead_data?: OriginalLeadData;
          spam_score?: number;
          spam_reasons?: string[];
          detected_at?: string;
          confidence?: number;
          _id?: string;
          id?: string | number;
          [key: string]: unknown;
        }
        const flattenedSpamLeads = (Array.isArray(data.spam_leads) ? data.spam_leads : []).map((spamLead: SpamLeadData) => {
          const original = spamLead.original_lead_data || {};
          return {
            ...spamLead,
            name: typeof original.name === 'string' ? original.name : 'N/A',
            email: typeof original.email === 'string' ? original.email : 'N/A',
            phone: typeof original.phone === 'string' ? original.phone : 'N/A',
            company: typeof original.company === 'string' ? original.company : 'N/A',
            source: typeof original.source === 'string' ? original.source : 'N/A',
            interest: typeof original.interest === 'string' ? original.interest : 'N/A',
            message: typeof original.message === 'string' ? original.message : 'N/A',
            spam_score: typeof spamLead.spam_score === 'number' ? spamLead.spam_score : undefined,
            spam_reasons: Array.isArray(spamLead.spam_reasons) ? spamLead.spam_reasons : [],
            detected_at: typeof spamLead.detected_at === 'string' ? spamLead.detected_at : undefined,
            confidence: typeof spamLead.confidence === 'number' ? spamLead.confidence : undefined,
            lead_id: spamLead._id || spamLead.id || 'N/A'
          };
        });
        setSpamLeads(flattenedSpamLeads);
        setShowSpamLeads(true);
      } else {
        console.error('Failed to fetch spam leads');
      }
    } catch (error) {
      console.error('Error fetching spam leads:', error);
    }
  };

  // Filter and search functionality
  useEffect(() => {
    let filtered = leadsData;

    // Apply text search filter
    if (filterQuery) {
      filtered = filtered.filter(lead => {
        const value = lead[filterField as keyof Lead];
        const matches = String(value).toLowerCase().includes(filterQuery.toLowerCase());
        return matches;
      });
    }

    // Apply timeline filter
    if (timelineFilter && timelineFilter !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      filtered = filtered.filter(lead => {
        const leadDate = new Date(lead.created_at);
        const leadDateOnly = new Date(leadDate.getFullYear(), leadDate.getMonth(), leadDate.getDate());

        switch (timelineFilter) {
          case 'today':
            return leadDateOnly.getTime() === today.getTime();
          case 'yesterday':
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            return leadDateOnly.getTime() === yesterday.getTime();
          case 'this_week':
            const weekStart = new Date(today);
            weekStart.setDate(today.getDate() - today.getDay());
            return leadDateOnly >= weekStart;
          case 'this_month':
            return leadDate.getMonth() === now.getMonth() && leadDate.getFullYear() === now.getFullYear();
          case 'last_month':
            const lastMonth = new Date(now);
            lastMonth.setMonth(lastMonth.getMonth() - 1);
            return leadDate.getMonth() === lastMonth.getMonth() && leadDate.getFullYear() === lastMonth.getFullYear();
          case 'custom':
            // Handle custom date range
            if (pendingCustomRange[0] && pendingCustomRange[1]) {
              const startDate = new Date(pendingCustomRange[0]);
              const endDate = new Date(pendingCustomRange[1]);
              startDate.setHours(0, 0, 0, 0);
              endDate.setHours(23, 59, 59, 999);
              return leadDate >= startDate && leadDate <= endDate;
            }
            return true;
          default:
            return true;
        }
      });
    }

    setFilteredLeads(filtered);
    setCurrentPage(1);
  }, [leadsData, filterQuery, filterField, timelineFilter, pendingCustomRange]);

  // Pagination
  const totalPages = Math.ceil(filteredLeads.length / leadsPerPage);
  const startIndex = (currentPage - 1) * leadsPerPage;
  const endIndex = startIndex + leadsPerPage;
  const currentLeads = filteredLeads.slice(startIndex, endIndex);

  // Background fetch scores for visible leads that lack them
  useEffect(() => {
    const controller = new AbortController();
    const fetchScores = async () => {
      interface LeadWithId {
        id?: number | string;
        _id?: string;
        lead_id?: string | number;
        leadId?: string | number;
        score?: number;
        [key: string]: unknown;
      }
      const toFetch = currentLeads.filter((l: LeadWithId) => {
        const id = (l?.id ?? l?._id ?? l?.lead_id ?? l?.leadId);
        const key = String(id ?? '');
        return !l?.score && key && scoreCache[key] === undefined;
      });
      for (const l of toFetch) {
        const leadWithId = l as LeadWithId;
        const id = (leadWithId?.id ?? leadWithId?._id ?? leadWithId?.lead_id ?? leadWithId?.leadId);
        const key = String(id);
        try {
          const res = await fetch(`${API_BASE}/${encodeURIComponent(key)}/score`, { headers: getAuthHeaders(), signal: controller.signal });
          if (!res.ok) continue;
          const data = await res.json();
          // Skip if lead not found or has error
          if (data.not_found || data.error) continue;
          // Handle both array and object response formats
          interface ScoreItem {
            label?: string;
            category?: string;
            score?: number;
          }
          const arr = Array.isArray(data) ? data as ScoreItem[] : [];
          const overall = arr.find((s: ScoreItem) => s?.label === 'overall' || s?.category === 'overall' || typeof s?.score === 'number');
          // Also check if data has lead_score directly
          const value = typeof overall?.score === 'number' ? overall.score : (typeof data?.lead_score === 'number' ? data.lead_score : undefined);
          if (typeof value === 'number') {
            setScoreCache(prev => {
              const next = { ...prev, [key]: value };
              if (typeof window !== 'undefined') localStorage.setItem('leadIntegrationScoreCache', JSON.stringify(next));
              return next;
            });
          }
        } catch {
          // Silently ignore fetch errors for missing leads
        }
      }
    };
    if (currentLeads.length > 0) fetchScores();
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentLeads, API_BASE]);

  // Sort functionality removed - using filter buttons instead


  // Export functionality
  const handleExport = (format?: 'csv' | 'excel') => {
    const exportFormat = format || 'csv';
    const dataToExport = selectedIds.length > 0
      ? leadsData.filter(lead => selectedIds.includes(lead.id))
      : filteredLeads;

    if (exportFormat === 'excel') {
      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Leads');
      XLSX.writeFile(wb, 'lead-integration-leads.xlsx');
    } else {
      const csv = XLSX.utils.sheet_to_csv(XLSX.utils.json_to_sheet(dataToExport));
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'lead-integration-leads.csv';
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  // Resolve id from various shapes
  interface LeadForId {
    id?: number | string;
    _id?: string;
    lead_id?: string | number;
    leadId?: string | number;
    name?: string;
    email?: string;
    phone?: string;
    source?: string;
    status?: string;
    created_at?: string;
    assignment?: {
      assigned_to?: string;
      assigned_to_name?: string;
      [key: string]: unknown;
    };
    assignment_results?: {
      assigned_agent?: {
        name?: string;
        agent_id?: string;
        [key: string]: unknown;
      };
      [key: string]: unknown;
    };
    assigned_to_name?: string;
    [key: string]: unknown;
  }
  const resolveLeadId = (lead: LeadForId): string => {
    const raw = lead?.id ?? lead?._id ?? lead?.lead_id ?? lead?.leadId;
    return encodeURIComponent(String(raw ?? ''));
  };

  // Navigate to lead details
  const handleLeadClick = (lead: LeadForId) => {
    const id = resolveLeadId(lead);
    if (!id) {
      showAlertMessage('This lead has no id to open details.', 'warning');
      return;
    }
    router.push(`/lead-integration/${id}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <PageHeader
          title="Lead Integration"
          description="Manage and track integrated leads with comprehensive filtering and analysis tools."
          breadcrumbs={[{ label: "Home", href: "/" }, { label: "Lead Integration" }]}
          tips={[
            "Use filters to find specific leads",
            "Select multiple leads for bulk actions",
            "Click on leads to view detailed information",
            "Use the search to find leads by name, email, phone, or score",
            "Export selected or all leads to CSV/Excel",
          ]}
        />

        <div className="space-y-6 px-4 sm:px-6 lg:px-8">
          {/* Skeleton Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-lg p-6 animate-pulse">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gray-300 dark:bg-gray-600 rounded-xl"></div>
                  <div className="flex-1">
                    <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded mb-2"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Skeleton Spam Detection */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-lg p-6 animate-pulse">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-gray-300 dark:bg-gray-600 rounded-xl"></div>
              <div className="flex-1">
                <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded mb-2 w-1/3"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
              </div>
              <div className="h-10 bg-gray-300 dark:bg-gray-600 rounded-xl w-32"></div>
            </div>
          </div>

          {/* Skeleton Action Bar */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow p-4 mb-6 animate-pulse">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="h-10 bg-gray-300 dark:bg-gray-600 rounded-lg flex-1"></div>
              <div className="flex gap-2">
                <div className="h-10 bg-gray-300 dark:bg-gray-600 rounded-lg w-24"></div>
                <div className="h-10 bg-gray-300 dark:bg-gray-600 rounded-lg w-24"></div>
                <div className="h-10 bg-gray-300 dark:bg-gray-600 rounded-lg w-24"></div>
              </div>
            </div>
          </div>

          {/* Skeleton Table */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-lg overflow-hidden animate-pulse">
            <div className="bg-gradient-to-r from-gray-50 to-gray-100/50 dark:from-gray-700 dark:to-gray-600/50 px-6 py-4 border-b border-gray-200 dark:border-gray-700/50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gray-300 dark:bg-gray-600 rounded-lg"></div>
                <div>
                  <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded mb-1 w-48"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center gap-4 py-4 border-b border-gray-100 dark:border-gray-700/50">
                    <div className="w-4 h-4 bg-gray-300 dark:bg-gray-600 rounded"></div>
                    <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-24"></div>
                    <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-32"></div>
                    <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-28"></div>
                    <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-20"></div>
                    <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-16"></div>
                    <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-12"></div>
                    <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-20"></div>
                    <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-24"></div>
                    <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-20"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <PageHeader
        title="Lead Integration"
        description="Manage and track integrated leads with comprehensive filtering and analysis tools."
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Lead Integration" }]}
        tips={[
          "Use filters to find specific leads",
          "Select multiple leads for bulk actions",
          "Click on leads to view detailed information",
          "Use the search to find leads by name, email, phone, or score",
          "Export selected or all leads to CSV/Excel",
        ]}
      />

      {showAlert && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-right-5 duration-300">
          <Alert
            variant={alertType}
            title="Notification"
            message={alertMessage}
            onClose={() => setShowAlert(false)}
          />
        </div>
      )}

      <div className="space-y-6 px-4 sm:px-6 lg:px-8">
        {/* Lead Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-6">
          {/* Total Leads */}
          <div
            className="group relative overflow-hidden bg-gradient-to-br from-white to-blue-50/50 dark:from-gray-800 dark:to-blue-900/20 border border-blue-200/50 dark:border-blue-700/50 rounded-2xl shadow-lg hover:shadow-xl hover:shadow-blue-500/10 p-6 transition-all duration-500 cursor-pointer hover:-translate-y-2"
            title={`Total Leads: ${leadsData.length} leads in the system`}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative flex items-center gap-4">
              <div className="relative" title="Total Leads Icon">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-400 rounded-full animate-pulse" title="Active indicator"></div>
              </div>
              <div className="flex-1">
                <div className="text-3xl font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300" title={`${leadsData.length} total leads`}>
                  {leadsData.length}
                </div>
                <div className="text-sm font-medium text-gray-600 dark:text-gray-400 group-hover:text-blue-500 dark:group-hover:text-blue-300 transition-colors duration-300" title="Total number of leads">
                  Total Leads
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-500 mt-1" title="All leads across all time">
                  All time
                </div>
              </div>
            </div>
          </div>

          {/* New Leads */}
          <div
            className="group relative overflow-hidden bg-gradient-to-br from-white to-purple-50/50 dark:from-gray-800 dark:to-purple-900/20 border border-purple-200/50 dark:border-purple-700/50 rounded-2xl shadow-lg hover:shadow-xl hover:shadow-purple-500/10 p-6 transition-all duration-500 cursor-pointer hover:-translate-y-2"
            title={`New Leads Today: ${leadsData.filter(lead => {
              const today = new Date();
              const leadDate = new Date(lead.created_at);
              return leadDate.toDateString() === today.toDateString();
            }).length} leads created today`}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative flex items-center gap-4">
              <div className="relative" title="New Leads Icon">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <PlusSquare className="w-6 h-6 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-purple-400 rounded-full animate-bounce" title="New indicator"></div>
              </div>
              <div className="flex-1">
                <div className="text-3xl font-bold text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors duration-300" title={`${leadsData.filter(lead => {
                  const today = new Date();
                  const leadDate = new Date(lead.created_at);
                  return leadDate.toDateString() === today.toDateString();
                }).length} new leads today`}>
                  {leadsData.filter(lead => {
                    const today = new Date();
                    const leadDate = new Date(lead.created_at);
                    return leadDate.toDateString() === today.toDateString();
                  }).length}
                </div>
                <div className="text-sm font-medium text-gray-600 dark:text-gray-400 group-hover:text-purple-500 dark:group-hover:text-purple-300 transition-colors duration-300" title="Leads created today">
                  New Today
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-500 mt-1" title="Fresh leads that need attention">
                  Fresh leads
                </div>
              </div>
            </div>
          </div>

          {/* Pending Leads */}
          <div
            className="group relative overflow-hidden bg-gradient-to-br from-white to-orange-50/50 dark:from-gray-800 dark:to-orange-900/20 border border-orange-200/50 dark:border-orange-700/50 rounded-2xl shadow-lg hover:shadow-xl hover:shadow-orange-500/10 p-6 transition-all duration-500 cursor-pointer hover:-translate-y-2"
            title={`Pending Leads: ${leadsData.filter(lead => lead.status === 'pending').length} leads awaiting action`}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative flex items-center gap-4">
              <div className="relative" title="Pending Leads Icon">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <Clock className="w-6 h-6 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-orange-400 rounded-full animate-pulse" title="Pending indicator"></div>
              </div>
              <div className="flex-1">
                <div className="text-3xl font-bold text-gray-900 dark:text-white group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors duration-300" title={`${leadsData.filter(lead => lead.status === 'pending').length} pending leads`}>
                  {leadsData.filter(lead => lead.status === 'pending').length}
                </div>
                <div className="text-sm font-medium text-gray-600 dark:text-gray-400 group-hover:text-orange-500 dark:group-hover:text-orange-300 transition-colors duration-300" title="Leads that need attention">
                  Pending
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-500 mt-1" title="Leads awaiting action or response">
                  Awaiting action
                </div>
              </div>
            </div>
          </div>

          {/* Converted Leads */}
          <div
            className="group relative overflow-hidden bg-gradient-to-br from-white to-green-50/50 dark:from-gray-800 dark:to-green-900/20 border border-green-200/50 dark:border-green-700/50 rounded-2xl shadow-lg hover:shadow-xl hover:shadow-green-500/10 p-6 transition-all duration-500 cursor-pointer hover:-translate-y-2"
            title={`Converted Leads: ${leadsData.filter(lead => lead.status === 'converted').length} successfully converted leads`}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative flex items-center gap-4">
              <div className="relative" title="Converted Leads Icon">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <CheckCircle className="w-6 h-6 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full animate-pulse" title="Success indicator"></div>
              </div>
              <div className="flex-1">
                <div className="text-3xl font-bold text-gray-900 dark:text-white group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors duration-300" title={`${leadsData.filter(lead => lead.status === 'converted').length} converted leads`}>
                  {leadsData.filter(lead => lead.status === 'converted').length}
                </div>
                <div className="text-sm font-medium text-gray-600 dark:text-gray-400 group-hover:text-green-500 dark:group-hover:text-green-300 transition-colors duration-300" title="Successfully converted leads">
                  Converted
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-500 mt-1" title="Conversion success rate">
                  Success rate
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Spam Leads Section */}
        <div className="bg-gradient-to-br from-white to-red-50/30 dark:from-gray-800 dark:to-red-900/20 border border-red-200/50 dark:border-red-700/50 rounded-2xl shadow-lg p-6">
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-lg">
                  <Shield className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">Spam Detection System</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Advanced AI-powered spam detection and management
                  </p>
                </div>
              </div>
              <button
                onClick={fetchSpamLeads}
                className="group relative overflow-hidden bg-gradient-to-r from-red-500 to-red-600 text-white px-6 py-3 rounded-xl hover:from-red-600 hover:to-red-700 transition-all duration-300 flex items-center gap-2 shadow-lg hover:shadow-xl hover:shadow-red-500/25 hover:-translate-y-0.5"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <Shield className="h-4 w-4 group-hover:scale-110 transition-transform duration-300" />
                <span className="font-medium">Scan for Spam</span>
              </button>
            </div>

            {spamLeads.length > 0 ? (
              <div className="space-y-6">
                <div className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border border-red-200/50 dark:border-red-700/50 rounded-xl p-4 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-800 flex items-center justify-center">
                      <span className="text-red-600 dark:text-red-400 text-lg">⚠️</span>
                    </div>
                    <div>
                      <p className="text-red-800 dark:text-red-200 font-semibold">
                        Spam Detection Alert
                      </p>
                      <p className="text-red-700 dark:text-red-300 text-sm">
                        Found {spamLeads.length} suspicious leads requiring review
                      </p>
                    </div>
                  </div>
                </div>
                <div className="grid gap-4 max-h-96 overflow-y-auto">
                  {spamLeads.map((spamLead, index) => (
                    <div key={index} className="group bg-gradient-to-br from-red-50/50 to-orange-50/50 dark:from-red-900/10 dark:to-orange-900/10 border border-red-200/50 dark:border-red-700/50 rounded-xl p-5 hover:shadow-lg hover:shadow-red-500/10 transition-all duration-300">
                      <div className="flex justify-between items-start">
                        <div className="space-y-4 flex-1">
                          <div className="flex items-center gap-3 flex-wrap">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-gray-900 dark:text-white text-sm">
                                Lead #{String(spamLead.lead_id || spamLead.id || 'N/A')}
                              </span>
                              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                            </div>
                            <span className="bg-gradient-to-r from-red-500 to-red-600 text-white px-3 py-1 rounded-full text-xs font-semibold shadow-sm">
                              Score: {typeof spamLead.spam_score === 'number' ? spamLead.spam_score.toFixed(2) : 'N/A'}
                            </span>
                            {typeof spamLead.confidence === 'number' && (
                              <span className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-3 py-1 rounded-full text-xs font-semibold shadow-sm">
                                Confidence: {(spamLead.confidence * 100).toFixed(0)}%
                              </span>
                            )}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                            <div className="space-y-1">
                              <p className="text-gray-600 dark:text-gray-400">
                                <strong className="text-gray-800 dark:text-gray-200">Name:</strong>
                                <span className="ml-2">{String(spamLead.name || 'N/A')}</span>
                              </p>
                              <p className="text-gray-600 dark:text-gray-400">
                                <strong className="text-gray-800 dark:text-gray-200">Email:</strong>
                                <span className="ml-2 break-all">{String(spamLead.email || 'N/A')}</span>
                              </p>
                              <p className="text-gray-600 dark:text-gray-400">
                                <strong className="text-gray-800 dark:text-gray-200">Phone:</strong>
                                <span className="ml-2">{String(spamLead.phone || 'N/A')}</span>
                              </p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-gray-600 dark:text-gray-400">
                                <strong className="text-gray-800 dark:text-gray-200">Company:</strong>
                                <span className="ml-2">{String(spamLead.company || 'N/A')}</span>
                              </p>
                              <p className="text-gray-600 dark:text-gray-400">
                                <strong className="text-gray-800 dark:text-gray-200">Source:</strong>
                                <span className="ml-2">{String(spamLead.source || 'N/A')}</span>
                              </p>
                              <p className="text-gray-600 dark:text-gray-400">
                                <strong className="text-gray-800 dark:text-gray-200">Interest:</strong>
                                <span className="ml-2">{String(spamLead.interest || 'N/A')}</span>
                              </p>
                            </div>
                          </div>

                          {spamLead.message && typeof spamLead.message === 'string' && spamLead.message !== 'N/A' && (
                            <div className="mt-2">
                              <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Message:</p>
                              <p className="text-sm text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 p-2 rounded border">
                                {spamLead.message}
                              </p>
                            </div>
                          )}

                          {Array.isArray(spamLead.spam_reasons) && spamLead.spam_reasons.length > 0 && (
                            <div className="mt-3">
                              <p className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">Spam Detection Reasons:</p>
                              <div className="flex flex-wrap gap-1">
                                {spamLead.spam_reasons.map((reason: unknown, reasonIndex: number) => (
                                  <span key={reasonIndex} className="bg-red-200 dark:bg-red-700 text-red-800 dark:text-red-200 px-2 py-1 rounded text-xs">
                                    {String(reason || '')}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {spamLead.detected_at && typeof spamLead.detected_at === 'string' && (
                            <div className="mt-3 pt-2 border-t border-red-200 dark:border-red-700">
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                <strong>Detected:</strong> {new Date(spamLead.detected_at).toLocaleString()}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : showSpamLeads ? (
              <div className="text-center py-8 text-gray-500">
                <Shield className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2">No spam leads found</p>
                <p className="text-sm mt-1">All leads appear to be legitimate</p>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Shield className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2">Click &quot;Load Spam Leads&quot; to view detected spam</p>
              </div>
            )}
          </div>
        </div>


        {/* Action Bar */}
        <ActionBar
          filterField={filterField}
          setFilterField={setFilterField}
          filterQuery={filterQuery}
          setFilterQuery={setFilterQuery}
          showFilterField={showFilterField}
          setShowFilterField={setShowFilterField}
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
          filterOptions={[
            { value: "name", label: "Filter by Name" },
            { value: "email", label: "Filter by Email" },
            { value: "phone", label: "Filter by Phone" },
            { value: "source", label: "Filter by Source" },
            { value: "status", label: "Filter by Status" },
            { value: "interest", label: "Filter by Interest" },
            { value: "assigned_to_name", label: "Filter by Assigned Agent" },
          ]}
        />

        {/* Leads Table */}
        <div className="bg-gradient-to-br from-white to-blue-50/30 dark:from-gray-800 dark:to-blue-900/20 border border-blue-200/50 dark:border-blue-700/50 rounded-2xl shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 px-6 py-4 border-b border-blue-200/50 dark:border-blue-700/50">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                <Users className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Lead Integration List</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Manage and track all integrated leads</p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-gray-100 dark:scrollbar-track-gray-800">
            <Table className="min-w-full">
              <caption className="sr-only">Lead Integration List - Table showing all integrated leads with their details, status, and assignment information</caption>
              <TableHeader>
                <TableRow className="bg-gradient-to-r from-gray-50 to-gray-100/50 dark:from-gray-700 dark:to-gray-600/50">
                  <th className="px-6 py-4 text-left">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedIds.length === currentLeads.length && currentLeads.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedIds(currentLeads.map(lead => lead.id));
                          } else {
                            setSelectedIds([]);
                          }
                        }}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-2"
                        aria-label="Select all leads"
                      />
                      {/* <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Select</span> */}
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left w-64 min-w-[16rem]">
                    <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider" title="Lead's full name">Name</span>
                  </th>
                  <th className="px-6 py-4 text-left">
                    <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider" title="Lead's email address">Email</span>
                  </th>
                  <th className="px-6 py-4 text-left">
                    <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider" title="Lead's phone number">Phone</span>
                  </th>
                  <th className="px-6 py-4 text-left w-40 min-w-[10rem]">
                    <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider" title="Source where the lead came from">Source</span>
                  </th>
                  <th className="px-6 py-4 text-left">
                    <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider" title="Current status of the lead">Status</span>
                  </th>
                  <th className="px-6 py-4 text-left">
                    <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider" title="Lead quality score (0-100)">Score</span>
                  </th>
                  <th className="px-6 py-4 text-left">
                    <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider" title="Date and time when lead was created">Created</span>
                  </th>
                  <th className="px-6 py-4 text-left w-48 min-w-[12rem]">
                    <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider" title="Agent assigned to handle this lead">Assign Agent</span>
                  </th>
                  <th className="px-6 py-4 text-left w-36 min-w-[9rem]">
                    <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider" title="Assignment status of the lead">Assign Status</span>
                  </th>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentLeads.map((lead: LeadForId, index: number) => (
                  <TableRow
                    key={lead.id ?? lead._id ?? lead.lead_id ?? lead.leadId ?? `lead-${index}`}
                    className="group hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-indigo-50/50 dark:hover:from-blue-900/20 dark:hover:to-indigo-900/20 cursor-pointer transition-all duration-300 border-b border-gray-100 dark:border-gray-700/50 hover:scale-[1.02] hover:shadow-lg hover:shadow-blue-500/10"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={typeof lead.id === 'number' && selectedIds.includes(lead.id)}
                          onChange={(e) => {
                            e.stopPropagation();
                            if (typeof lead.id === 'number') {
                              if (e.target.checked) {
                                setSelectedIds([...selectedIds, lead.id]);
                              } else {
                                setSelectedIds(selectedIds.filter(id => id !== lead.id));
                              }
                            }
                          }}
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-2 group-hover:scale-110 transition-transform duration-200"
                          aria-label={`Select lead ${lead.name || 'Unknown'}`}
                        />
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        className="group/btn flex items-center gap-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium hover:underline transition-all duration-200 hover:scale-105"
                        onClick={(e) => { e.stopPropagation(); handleLeadClick(lead); }}
                        aria-label={`View details for lead ${lead.name || 'Unknown'}`}
                      >
                        <span className="text-left" title={lead.name || 'Lead Name'}>
                          {lead.name && typeof lead.name === 'string'
                            ? lead.name
                              .split(' ')
                              .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                              .join(' ')
                            : 'Unknown Lead'}
                        </span>
                        <svg className="w-3 h-3 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 hover:scale-105 transition-transform duration-200">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        <span className="text-gray-600 dark:text-gray-400 text-sm text-left">{lead.email || 'N/A'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 hover:scale-105 transition-transform duration-200">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        <span className="text-gray-600 dark:text-gray-400 text-sm text-left">{lead.phone || 'N/A'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 hover:scale-105 transition-transform duration-200">
                        {lead.source || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold hover:scale-105 transition-transform duration-200 ${lead.status === 'converted' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                        lead.status === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                          lead.status === 'assigned' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                            'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                        }`}>
                        {lead.status || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 hover:scale-105 transition-transform duration-200">
                        {(() => {
                          interface LeadWithScore extends LeadForId {
                            score?: number;
                          }
                          const leadWithScore = lead as LeadWithScore;
                          const key = String(leadWithScore?.id ?? leadWithScore?._id ?? leadWithScore?.lead_id ?? leadWithScore?.leadId ?? '');
                          const val = leadWithScore?.score ?? (scoreCache && key ? scoreCache[key] : undefined);
                          const score = typeof val === 'number' ? val : null;

                          if (score !== null) {
                            return (
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold hover:scale-110 transition-transform duration-200">
                                {Math.round(score)}
                              </div>
                            );
                          }
                          return <span className="text-gray-400 dark:text-gray-500 text-sm">—</span>;
                        })()}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 hover:scale-105 transition-transform duration-200">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="text-gray-600 dark:text-gray-400 text-sm text-left">{lead.created_at ? new Date(lead.created_at).toLocaleDateString() : 'N/A'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 hover:scale-105 transition-transform duration-200">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span className="text-gray-900 dark:text-gray-200 text-sm font-medium text-left">
                          {(() => {
                            const name = lead?.assignment?.assigned_to_name
                              || lead?.assignment_results?.assigned_agent?.name
                              || lead?.assigned_to_name
                              || lead?.assignment?.assigned_to
                              || lead?.assignment_results?.assigned_agent?.agent_id
                              || '—';
                            return capitalizeName(name) || '—';
                          })()}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {(() => {
                        const isAssigned = !!(
                          lead?.assignment?.assigned_to
                          || lead?.assignment_results?.assigned_agent
                        );
                        const label = isAssigned ? 'Assigned' : 'Unassigned';
                        return (
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold hover:scale-105 transition-transform duration-200 ${isAssigned
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                            }`}>
                            {label}
                          </span>
                        );
                      })()}
                    </td>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {currentLeads.length === 0 && (
            <div className="text-center py-16">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center">
                <Users className="h-10 w-10 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No leads found</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6">Try adjusting your filters or create a new lead</p>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium shadow-lg hover:shadow-xl"
              >
                <PlusSquare className="w-4 h-4" />
                Create New Lead
              </button>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-gradient-to-r from-gray-50 to-gray-100/50 dark:from-gray-700 dark:to-gray-600/50 px-6 py-4 border-t border-gray-200 dark:border-gray-700/50">
              <Pagination
                currentPage={currentPage}
                pageSize={leadsPerPage}
                onPageChange={setCurrentPage}
                onPageSizeChange={setLeadsPerPage}
                totalItems={filteredLeads.length}
                label="leads"
              />
            </div>
          )}
        </div>
      </div>

      {/* Create Lead Modal - Full Screen */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-[9999] bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 animate-in fade-in duration-300">
          <div className="w-full h-full overflow-y-auto">
            {/* Full Screen Header */}
            <div className="sticky top-0 bg-gradient-to-r from-white/95 to-blue-50/95 dark:from-gray-800/95 dark:to-gray-700/95 backdrop-blur-md border-b border-blue-100/50 dark:border-gray-700/50 px-8 py-6 shadow-lg">
              <div className="flex justify-between items-center max-w-6xl mx-auto">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-xl">
                    <Users className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Create New Lead</h1>
                    <p className="text-gray-600 dark:text-gray-400 text-lg">Add a new lead to your pipeline</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="group p-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-2xl transition-all duration-300 hover:scale-110"
                >
                  <svg className="w-6 h-6 group-hover:rotate-90 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Full Screen Content */}
            <div className="px-8 py-8 max-w-6xl mx-auto">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <LeadIntegrationForm
                  showAlertMessage={showAlertMessage}
                  onSuccess={() => {
                    setIsCreateModalOpen(false);
                    fetchLeads(); // Refresh the leads list after successful creation
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}