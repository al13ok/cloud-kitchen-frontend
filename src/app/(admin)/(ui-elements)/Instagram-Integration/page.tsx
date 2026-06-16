"use client";
import React, { useState, useRef, useEffect, JSX } from "react";
import { CheckCircle, Copy, Share2, Save, Star, TrendingUp, Users, MessageSquare, Filter, RefreshCw } from "lucide-react";
import Alert from "@/components/ui/alert/Alert";
import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import EyeIcon from "@/icons/eye.svg";
import EyeCloseIcon from "@/icons/eye-close.svg";
import { FaUser, FaUsers } from "react-icons/fa";
import DashboardHeader from "@/components/header/DashboardHeader";
import { getInstagramFeedback, getInstagramFeedbackStats } from "@/utils/api";
import JobFormManager from "./job-form/page";
import LeadFormManager from "./lead-form/page";
import CustomerTicketFormManager from "./ticket-form/customer/page";
import EmployeeTicketFormManager from "./ticket-form/employee/page";

// Inline tooltips (using title attribute) to avoid external dependency
const API_PREFIX = `https://instabot-aiagent.mobiloitte.io/instagram`;
const WEBHOOK_URL = `https://instabot-aiagent.mobiloitte.io/webhook`;

type AlertInfo = {
  show: boolean;
  variant: 'success' | 'error';
  title: string;
  message: string;
};

type Credential = {
  id: string;
  insta_token?: string;
  insta_app_id?: string;
  insta_app_secret?: string;
  verify_token?: string;
  [key: string]: unknown;
};

type FeedbackItem = {
  _id: string;
  user_id: string;
  feedback_type: 'customer' | 'employee' | 'guest';
  rating: number;
  comment: string;
  platform: string;
  timestamp: string;
  metadata: Record<string, unknown>;
};

type FeedbackStats = {
  total_feedback: number;
  average_rating: number;
  rating_distribution: Record<string, number>;
  type_distribution: Record<string, number>;
};

export default function InstagramIntegrationPage(): JSX.Element {
  const [activeTab, setActiveTab] = useState<"setup" | "feedback" | "greeting" | "job-form" | "lead-form" | "customer-ticket" | "employee-ticket">("setup");
  const [showHelp, setShowHelp] = useState(false);
  
  const getInitialCredentials = () => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("instagramCredentials");
      if (saved) {
        try {
          return {
            instaToken: "",
            instaAppId: "",
            instaAppSecret: "",
            verifyToken: "",
            ...JSON.parse(saved),
          };
        } catch {}
      }
    }
    return {
      instaToken: "",
      instaAppId: "",
      instaAppSecret: "",
      verifyToken: "",
    };
  };

  const [credentials, setCredentials] = useState(getInitialCredentials);
  const [lastSavedCredentials, setLastSavedCredentials] = useState(getInitialCredentials);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [alertInfo, setAlertInfo] = useState<AlertInfo | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [userIdInput, setUserIdInput] = useState("");
  const [isCredentialsEditable, setIsCredentialsEditable] = useState(true);
  const [canEdit, setCanEdit] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [allCredentials, setAllCredentials] = useState<Credential[]>([]);
  const [showAllCredentials, setShowAllCredentials] = useState(false);
  const firstInputRef = useRef<HTMLInputElement>(null);
  const [showInstaToken, setShowInstaToken] = useState(false);
  const [showAppSecret, setShowAppSecret] = useState(false);
  const [showVerifyToken, setShowVerifyToken] = useState(false);
  const [showAppId, setShowAppId] = useState(false);
  const [lastUpdatedBy, setLastUpdatedBy] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  
  // Feedback state
  const [feedbackData, setFeedbackData] = useState<FeedbackItem[]>([]);
  const [feedbackStats, setFeedbackStats] = useState<FeedbackStats | null>(null);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackFilter, setFeedbackFilter] = useState<'all' | 'customer' | 'employee' | 'guest'>('all');
  const [ratingFilter, setRatingFilter] = useState<'all' | '1' | '2' | '3' | '4' | '5'>('all');

  // Inline tooltip helper (light/dark aware) – supports placement
  const TooltipInline = ({ content, placement = "top" }: { content: string; placement?: "top" | "right" | "bottom" | "left" }) => (
    <span className="relative inline-flex group">
      <span
        className="inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold rounded-full bg-blue-600 text-white cursor-help outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
        tabIndex={0}
        role="img"
        aria-label="info"
      >
        i
      </span>
      <span
        role="tooltip"
        className={`pointer-events-none invisible opacity-0 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100 transition-opacity duration-150 absolute z-[9999] px-3 py-1.5 text-xs font-medium whitespace-nowrap rounded-lg shadow-lg border bg-white text-gray-900 border-gray-200 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700
        ${placement === 'top' ? '-top-2 left-1/2 -translate-x-1/2 -translate-y-full' : ''}
        ${placement === 'bottom' ? '-bottom-2 left-1/2 -translate-x-1/2 translate-y-full' : ''}
        ${placement === 'right' ? 'top-1/2 left-full -translate-y-1/2 ml-2' : ''}
        ${placement === 'left' ? 'top-1/2 right-full -translate-y-1/2 mr-2' : ''}
        `}
      >
        {content}
        <span
          className={`absolute w-2 h-2 rotate-45 bg-white border border-gray-200 dark:bg-gray-800 dark:border-gray-700
          ${placement === 'top' ? 'left-1/2 -translate-x-1/2 -bottom-1 border-t-0 border-l-0 dark:border-t-0 dark:border-l-0' : ''}
          ${placement === 'bottom' ? 'left-1/2 -translate-x-1/2 -top-1 border-b-0 border-r-0 dark:border-b-0 dark:border-r-0' : ''}
          ${placement === 'right' ? '-left-1 top-1/2 -translate-y-1/2 border-r-0 border-t-0 dark:border-r-0 dark:border-t-0' : ''}
          ${placement === 'left' ? '-right-1 top-1/2 -translate-y-1/2 border-l-0 border-b-0 dark:border-l-0 dark:border-b-0' : ''}
          `}
          aria-hidden="true"
        />
      </span>
    </span>
  );

  // Form-level validation helpers
  const getFieldValidation = (fieldId: string) => {
    switch (fieldId) {
      case 'instaAppId':
        return {
          required: true,
          inputMode: 'text' as const,
          pattern: '[A-Za-z0-9-_]{8,64}',
          minLength: 8,
          maxLength: 64,
          title: 'Must be 8–64 characters: letters, numbers, - or _',
          autoComplete: 'off',
        };
      case 'instaAppSecret':
        return {
          required: true,
          pattern: '[A-Za-z0-9-_]{16,128}',
          minLength: 16,
          maxLength: 128,
          title: '16–128 characters: letters, numbers, - or _',
          autoComplete: 'new-password',
        };
      case 'instaToken':
        return {
          required: true,
          pattern: '[A-Za-z0-9-_|]{50,200}',
          minLength: 50,
          maxLength: 200,
          title: '50–200 characters: letters, numbers, -, _ or |',
          autoComplete: 'off',
        };
      case 'verifyToken':
        return {
          required: true,
          pattern: '[A-Za-z0-9-_]{6,64}',
          minLength: 6,
          maxLength: 64,
          title: '6–64 characters: letters, numbers, - or _',
          autoComplete: 'off',
        };
      default:
        return { required: true };
    }
  };

  const validationMessages: Record<string, string> = {
    instaAppId: 'Enter the App ID from your Instagram Basic Display API app.',
    instaAppSecret: 'Enter the App Secret from your Instagram Basic Display API app.',
    instaToken: 'Use a valid long-lived access token from Instagram Graph API.',
    verifyToken: 'This is your custom token for webhook verification (must match Instagram App dashboard).',
  };

  const regexByField: Record<string, RegExp> = {
    instaAppId: /^[A-Za-z0-9-_]{8,64}$/,
    instaAppSecret: /^[A-Za-z0-9-_]{16,128}$/,
    instaToken: /^[A-Za-z0-9-_|]{50,200}$/,
    verifyToken: /^[A-Za-z0-9-_]{6,64}$/,
  };

  const validateField = (id: string, value: string) => {
    const trimmed = (value ?? '').toString();
    const regex = regexByField[id];
    let error: string | null = null;
    if (!trimmed) {
      error = validationMessages[id] || 'Required';
    } else if (regex && !regex.test(trimmed)) {
      error = validationMessages[id] || 'Invalid value';
    }
    setErrors(prev => ({ ...prev, [id]: error }));
    return !error;
  };

  // Save credentials to localStorage on every change
  useEffect(() => {
    localStorage.setItem("instagramCredentials", JSON.stringify(credentials));
  }, [credentials]);

  // Load audit trail metadata
  useEffect(() => {
    try {
      const meta = localStorage.getItem("instagramCredentialsMeta");
      if (meta) {
        const parsed = JSON.parse(meta);
        setLastUpdatedBy(parsed.lastUpdatedBy || null);
        setLastUpdatedAt(parsed.lastUpdatedAt || null);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (isCredentialsEditable && !editingId && firstInputRef.current) {
      firstInputRef.current.focus();
    }
  }, [isCredentialsEditable, editingId]);

  const handleCredentialChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCredentials({ ...credentials, [name]: value });
    // live-validate per field
    try { validateField(name, value); } catch {}
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(WEBHOOK_URL);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleSave = async () => {
    setLoading(true);
    setAlertInfo(null);
    const configData = {
      insta_token: credentials.instaToken,
      insta_app_id: credentials.instaAppId,
      insta_app_secret: credentials.instaAppSecret,
      verify_token: credentials.verifyToken,
    };

    // Validation: check for empty fields
    const emptyField = Object.entries(configData).find(([, value]) => !value || value.trim() === "");
    if (emptyField) {
      setAlertInfo({
        show: true,
        variant: 'error',
        title: 'Validation Error',
        message: `Please fill in all fields. Missing: ${emptyField[0]}`
      });
      setLoading(false);
      setTimeout(() => setAlertInfo(null), 4000);
      return;
    }

    // Limit validations
    const appIdRegex = /^[A-Za-z0-9-_]{8,64}$/;
    const appSecretRegex = /^[A-Za-z0-9-_]{16,128}$/;
    const tokenRegex = /^[A-Za-z0-9-_|]{50,200}$/;
    const verifyTokenRegex = /^[A-Za-z0-9-_]{6,64}$/;

    if (!appIdRegex.test(credentials.instaAppId)) {
      setAlertInfo({
        show: true,
        variant: 'error',
        title: 'Validation Error',
        message: 'Instagram App ID must be 8–64 characters (letters, numbers, - or _).'
      });
      setLoading(false);
      setTimeout(() => setAlertInfo(null), 4000);
      return;
    }
    if (!appSecretRegex.test(credentials.instaAppSecret)) {
      setAlertInfo({
        show: true,
        variant: 'error',
        title: 'Validation Error',
        message: 'Instagram App Secret must be 16–128 characters (letters, numbers, - or _).'
      });
      setLoading(false);
      setTimeout(() => setAlertInfo(null), 4000);
      return;
    }
    if (!tokenRegex.test(credentials.instaToken)) {
      setAlertInfo({
        show: true,
        variant: 'error',
        title: 'Validation Error',
        message: 'Instagram Token must be 50–200 characters (letters, numbers, -, _ or |).'
      });
      setLoading(false);
      setTimeout(() => setAlertInfo(null), 4000);
      return;
    }
    if (!verifyTokenRegex.test(credentials.verifyToken)) {
      setAlertInfo({
        show: true,
        variant: 'error',
        title: 'Validation Error',
        message: 'Verify Token must be 6–64 characters (letters, numbers, - or _).'
      });
      setLoading(false);
      setTimeout(() => setAlertInfo(null), 4000);
      return;
    }

    // Check for no changes compared to last saved credentials
    const isUnchanged =
      credentials.instaToken === lastSavedCredentials.instaToken &&
      credentials.instaAppId === lastSavedCredentials.instaAppId &&
      credentials.instaAppSecret === lastSavedCredentials.instaAppSecret &&
      credentials.verifyToken === lastSavedCredentials.verifyToken;

    if (isUnchanged) {
      setAlertInfo({
        show: true,
        variant: 'success',
        title: 'No changes detected',
        message: 'No changes detected. Your form is already up to date.'
      });
      setLoading(false);
      setTimeout(() => setAlertInfo(null), 4000);
      return;
    }

    console.log("Sending configData:", configData);

    try {
      const url = editingId
        ? `${API_PREFIX}/credentials/${editingId}`
        : `${API_PREFIX}/credentials`;

      const method = editingId ? "PUT" : "POST";
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "accept": "application/json"
        },
        body: JSON.stringify(configData),
      });

      const result = await response.json();
      if (response.ok) {
        setAlertInfo({
          show: true,
          variant: 'success',
          title: 'Success!',
          message: result.message || "Configuration saved successfully."
        });
        // Snapshot current values as last saved
        setLastSavedCredentials({ ...credentials });
        // Store the ID for future editing
        if (result.id) {
          setCurrentId(result.id);
          setEditingId(result.id);
        }
        setCanEdit(true);
        setIsCredentialsEditable(false);

        // Update audit trail
        try {
          const { user } = (await import('@/services/AuthService')).default.getInstance().getState();
          const by = user?.full_name || user?.email || 'Unknown user';
          const at = new Date().toISOString();
          setLastUpdatedBy(by);
          setLastUpdatedAt(at);
          localStorage.setItem("instagramCredentialsMeta", JSON.stringify({ lastUpdatedBy: by, lastUpdatedAt: at }));
        } catch {}
      } else {
        throw new Error(result.message || "Failed to save configuration.");
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      setAlertInfo({
        show: true,
        variant: 'error',
        title: 'Error',
        message: errorMessage
      });
    } finally {
      setLoading(false);
      setTimeout(() => setAlertInfo(null), 5000);
    }
  };

  // Derived validation state for enabling Save/Test buttons
  const isFormValid = (() => {
    const appIdRegex = /^[A-Za-z0-9-_]{8,64}$/;
    const appSecretRegex = /^[A-Za-z0-9-_]{16,128}$/;
    const tokenRegex = /^[A-Za-z0-9-_|]{50,200}$/;
    const verifyTokenRegex = /^[A-Za-z0-9-_]{6,64}$/;
    if (!appIdRegex.test(credentials.instaAppId)) return false;
    if (!appSecretRegex.test(credentials.instaAppSecret)) return false;
    if (!tokenRegex.test(credentials.instaToken)) return false;
    if (!verifyTokenRegex.test(credentials.verifyToken)) return false;
    return true;
  })();

  const fetchAllCredentials = async () => {
    try {
      const response = await fetch(`${API_PREFIX}/credentials`);
      if (response.ok) {
        const data = await response.json();
        setAllCredentials(data.credentials || []);
      }
    } catch (error) {
      console.error("Failed to fetch credentials:", error);
    }
  };

  // Feedback API functions
  const fetchFeedbackData = async () => {
    setFeedbackLoading(true);
    try {
      const [feedbackResponse, statsResponse] = await Promise.all([
        getInstagramFeedback(50),
        getInstagramFeedbackStats()
      ]);
      
      setFeedbackData(feedbackResponse.feedback || []);
      setFeedbackStats(statsResponse);
    } catch (error) {
      console.error("Failed to fetch feedback data:", error);
      setAlertInfo({
        show: true,
        variant: 'error',
        title: 'Error',
        message: 'Failed to load feedback data. Please try again.'
      });
    } finally {
      setFeedbackLoading(false);
    }
  };

  // Load feedback data when feedback tab is active
  useEffect(() => {
    if (activeTab === 'feedback' && feedbackData.length === 0) {
      fetchFeedbackData();
    }
  }, [activeTab, feedbackData.length]);

  // Filter feedback data
  const filteredFeedback = feedbackData.filter(item => {
    const typeMatch = feedbackFilter === 'all' || item.feedback_type === feedbackFilter;
    const ratingMatch = ratingFilter === 'all' || item.rating.toString() === ratingFilter;
    return typeMatch && ratingMatch;
  });

  type CredentialField = {
    id: string;
    label: string;
    placeholder: string;
    tooltip: string;
    type?: string;
  };

  const credentialFields: CredentialField[] = [
    {
      id: "instaAppId",
      label: "Instagram App ID",
      placeholder: "Enter Instagram App ID",
      tooltip: "Your Instagram Basic Display API App ID from Meta Developer Console.",
    },
    {
      id: "instaAppSecret",
      label: "Instagram App Secret",
      placeholder: "Enter Instagram App Secret",
      tooltip: "The secret key generated in your Instagram Basic Display API app. Keep this confidential.",
      type: "password",
    },
    {
      id: "instaToken",
      label: "Instagram Access Token",
      placeholder: "Enter Instagram Access Token",
      tooltip: "Your long-lived access token generated in Instagram Graph API. Required for authentication.",
      type: "password",
    },
    {
      id: "verifyToken",
      label: "Webhook Verify Token",
      placeholder: "Enter Webhook Verify Token",
      tooltip: "Custom string you define to verify ownership of the webhook during setup.",
      type: "password",
    },
  ];

  const pageContent = (
    <div className="relative min-h-screen bg-gray-50 dark:bg-gray-900">
      {alertInfo && alertInfo.show && (
        <div style={{ position: 'fixed', top: 90, right: 24, zIndex: 9999, width: 350 }}>
          <Alert
            variant={alertInfo.variant}
            title={alertInfo.title}
            message={alertInfo.message}
          />
        </div>
      )}

      {/* Professional Header */}
      <div className="mx-6 mt-6 mb-8">
        <DashboardHeader
          variant="default"
          size="lg"
          title="Instagram Integration"
          subtitle="Integrate your Instagram account with Meta's Developer Platform to enable content management, messaging, and automation"
          breadcrumbs={[
            { label: 'Home', href: '/' },
            { label: 'Instagram Integration', href: '/Instagram-Integration' }
          ]}
          icon={() => (
            <svg className="w-6 h-6 sm:w-8 sm:h-8 text-white" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
            </svg>
          )}
          showHelp={showHelp}
          onHelpToggle={() => setShowHelp(!showHelp)}
          helpContent={
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-gradient-to-r from-blue-400 to-blue-400 rounded-full mt-2 flex-shrink-0"></div>
                  <span>Configure Instagram Basic Display API credentials</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-gradient-to-r from-blue-400 to-blue-400 rounded-full mt-2 flex-shrink-0"></div>
                  <span>Set up webhook URL for real-time content handling</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-gradient-to-r from-blue-400 to-blue-400 rounded-full mt-2 flex-shrink-0"></div>
                  <span>Manage Instagram content and messaging automation</span>
                </li>
              </ul>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-gradient-to-r from-blue-400 to-blue-400 rounded-full mt-2 flex-shrink-0"></div>
                  <span>Track engagement metrics and user interactions</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-gradient-to-r from-blue-400 to-blue-400 rounded-full mt-2 flex-shrink-0"></div>
                  <span>Customize automated responses and content management</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-gradient-to-r from-blue-400 to-blue-400 rounded-full mt-2 flex-shrink-0"></div>
                  <span>Monitor integration health and performance</span>
                </li>
              </ul>
            </div>
          }
        />
      </div>

      {/* Spacing between header and content */}
      <div className="mt-8 mb-4"></div>

      <div className="px-6">

        {/* Enhanced Tab Navigation */}
        <div className="mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200/60 dark:border-gray-700/60 p-2">
            <nav
              className="flex items-center gap-1"
              role="tablist"
              aria-label="Instagram Integration Tabs"
            >
              {[ 
                { key: "setup", label: "SetUp", icon: <FaUser className="inline-block mr-2 mb-0.5" size={16} /> },
                { key: "feedback", label: "Feedback", icon: <FaUsers className="inline-block mr-2 mb-0.5" size={16} /> },
                { key: "greeting", label: "Content Manager", icon: <FaUsers className="inline-block mr-2 mb-0.5" size={16} /> },
                { key: "job-form", label: "Job Form", icon: <FaUsers className="inline-block mr-2 mb-0.5" size={16} /> },
                { key: "lead-form", label: "Lead Form", icon: <FaUsers className="inline-block mr-2 mb-0.5" size={16} /> },
                { key: "customer-ticket", label: "Customer Ticket", icon: <FaUsers className="inline-block mr-2 mb-0.5" size={16} /> },
                { key: "employee-ticket", label: "Employee Ticket", icon: <FaUsers className="inline-block mr-2 mb-0.5" size={16} /> },
              ].map((tab) => (
                <button
                  key={tab.key}
                  role="tab"
                  aria-selected={activeTab === tab.key}
                  aria-controls={`tabpanel-${tab.key}`}
                  id={`tab-${tab.key}`}
                  tabIndex={activeTab === tab.key ? 0 : -1}
                  onClick={() => setActiveTab(tab.key as "setup" | "feedback" | "greeting" | "job-form" | "lead-form" | "customer-ticket" | "employee-ticket")}
                  onKeyDown={e => {
                    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                      e.preventDefault();
                      const tabs = ["setup", "feedback", "greeting", "job-form", "lead-form", "customer-ticket", "employee-ticket"];
                      const currentIdx = tabs.indexOf(activeTab);
                      const nextIdx =
                        e.key === "ArrowRight"
                          ? (currentIdx + 1) % tabs.length
                          : (currentIdx - 1 + tabs.length) % tabs.length;
                      setActiveTab(tabs[nextIdx] as "setup" | "feedback" | "greeting" | "job-form" | "lead-form" | "customer-ticket" | "employee-ticket");
                    }
                  }}
                  className={`group flex items-center px-6 py-3 text-sm font-semibold rounded-xl transition-all duration-300 min-w-[160px] justify-center
                  ${activeTab === tab.key
                    ? "text-white bg-gradient-to-r from-blue-500 to-blue-600 shadow-lg shadow-blue-500/25"
                    : "text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gradient-to-r hover:from-blue-50 hover:to-blue-50 dark:hover:from-blue-900/20 dark:hover:to-blue-900/20"
                  }
                  focus:outline-none focus:ring-2 focus:ring-blue-500/50`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)}>
          <div className="flex flex-col items-center gap-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Edit Credentials</h3>
            
            {/* Show current ID if available */}
            {currentId && (
              <div className="w-full p-4 bg-gradient-to-r from-blue-50 to-blue-50 dark:from-blue-900/30 dark:to-blue-900/30 border-2 border-blue-300 dark:border-blue-600 rounded-xl shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                      Current Configuration ID
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-sm break-all bg-gradient-to-r from-blue-50 to-blue-50 text-blue-800 dark:bg-gradient-to-r dark:from-blue-900/20 dark:to-blue-900/20 dark:text-blue-200 px-3 py-1.5 rounded border">
                        {currentId}
                      </span>
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(currentId);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 1500);
                      }}
                      startIcon={<Copy className="w-4 h-4" />}
                      className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      {copied ? 'Copied!' : 'Copy'}
                    </Button>
                  </div>
                </div>
              </div>
            )}
            
            <div className="w-full">
              <Label htmlFor="userIdInput">
                Enter User ID to Edit Credentials
              </Label>
              <Input
                id="userIdInput"
                type="text"
                placeholder="Enter the ID to edit"
                defaultValue={userIdInput}
                onChange={e => setUserIdInput(e.target.value)}
              />
            </div>
            
            {/* Show available IDs */}
            <div className="w-full">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  fetchAllCredentials();
                  setShowAllCredentials(!showAllCredentials);
                }}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline p-0 border-none bg-transparent"
              >
                {showAllCredentials ? 'Hide' : 'Show'} Available IDs
              </Button>
              
              {showAllCredentials && allCredentials.length > 0 && (
                <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg max-h-32 overflow-y-auto">
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">Available IDs:</p>
                  {allCredentials.map((cred) => (
                    <div key={cred.id} className="text-xs text-gray-800 dark:text-gray-200 mb-1">
                      <span className="font-mono bg-gray-200 dark:bg-gray-700 px-1 rounded">{cred.id}</span>
                      {cred.insta_app_id && (
                        <span className="ml-2 text-gray-500">(App: {cred.insta_app_id})</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
              
              {showAllCredentials && allCredentials.length === 0 && (
                <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg">
                  <p className="text-xs text-gray-600 dark:text-gray-400">No credentials found</p>
                </div>
              )}
            </div>
            
            <div className="flex gap-2 w-full">
              <Button
                className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-purple-700 hover:via-pink-700 hover:to-orange-700 text-white font-medium rounded-md px-4 py-2 text-sm shadow"
                onClick={async () => {
                  if (!userIdInput.trim()) {
                    setAlertInfo({
                      show: true,
                      variant: "error",
                      title: "Error",
                      message: "Please enter an ID",
                    });
                    return;
                  }
                  try {
                    const response = await fetch(`${API_PREFIX}/credentials/${userIdInput.trim()}`);
                    if (!response.ok) {
                      const errorData = await response.json().catch(() => ({}));
                      throw new Error(errorData.detail || "Invalid ID or not found");
                    }

                    const data = await response.json();
                    const newCreds = {
                      instaToken: data.insta_token || "",
                      instaAppId: data.insta_app_id || "",
                      instaAppSecret: data.insta_app_secret || "",
                      verifyToken: data.verify_token || "",
                    };
                    setCredentials(newCreds);
                    setLastSavedCredentials(newCreds);
                    setEditingId(data.id);
                    setCurrentId(data.id);
                    setIsEditModalOpen(false);
                    setIsCredentialsEditable(true);
                    setCanEdit(false);
                    // Update localStorage with backend data
                    localStorage.setItem("instagramCredentials", JSON.stringify(newCreds));
                  } catch (err: unknown) {
                    setAlertInfo({
                      show: true,
                      variant: "error",
                      title: "Error",
                      message: err instanceof Error ? err.message : "Invalid ID or user not found",
                    });
                  }
                }}
              >
                Load Credentials
              </Button>
              <Button
                className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 font-medium rounded-md text-sm shadow"
                onClick={() => setIsEditModalOpen(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </Modal>

        {activeTab === "setup" && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200/60 dark:border-gray-700/60 p-8 mb-8" style={{ position: 'relative', filter: isEditModalOpen ? 'blur(4px)' : 'none', pointerEvents: isEditModalOpen ? 'none' : 'auto', userSelect: isEditModalOpen ? 'none' : 'auto' }}>
            <div style={{ position: 'absolute', top: 32, right: 32, zIndex: 2 }}>
              <Button
                className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl shadow-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:bg-gray-400 disabled:cursor-not-allowed hover:scale-105"
                startIcon={<Save className="w-4 h-4" />}
                onClick={() => {
                  setIsEditModalOpen(true);
                  setCanEdit(false);
                }}
                disabled={!canEdit}
              >
                Edit
              </Button>
            </div>
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                <CheckCircle className="text-white w-5 h-5" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Credentials</h2>
            </div>
            <form id="instaCredsForm" noValidate onSubmit={(e) => { e.preventDefault(); if (isFormValid) handleSave(); }}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-8">
                {credentialFields.map((field, idx) => {
                  const id = field.id;
                  const label = field.label;
                  const placeholder = field.placeholder;
                  const tooltip = field.tooltip;
                  const baseType = field.type ?? "text";
                  return (
                    <div key={id} className="relative">
                      <div className="flex items-center gap-1.5">
                        <Label htmlFor={id}>{label}</Label>
                        <span aria-hidden="true" className="ml-0.5 text-blue-600" title="Required">*</span>
                        <TooltipInline content={tooltip} placement={'right'} />
                      </div>
                      <div className="relative">
                        <Input
                          id={id}
                          name={id}
                          type={
                            id === "instaAppId"
                              ? (showAppId ? "text" : "password")
                              : id === "instaAppSecret"
                              ? (showAppSecret ? "text" : "password")
                              : id === "instaToken"
                              ? (showInstaToken ? "text" : "password")
                              : id === "verifyToken"
                              ? (showVerifyToken ? "text" : "password")
                              : baseType
                          }
                          defaultValue={credentials[id as keyof typeof credentials]}
                          onChange={handleCredentialChange}
                          placeholder={placeholder || `Enter ${label}`}
                          disabled={!isCredentialsEditable}
                          className={`${idx === 0 ? "focus:ring-2 focus:ring-blue-500" : ""} ${errors[id] ? 'border-blue-500 focus:ring-blue-500' : ''}`}
                          {...getFieldValidation(id)}
                        />
                        {errors[id] && (
                          <p className="mt-1 text-xs text-blue-600 dark:text-blue-400">{errors[id]}</p>
                        )}
                        {id === "instaAppId" && (
                          <button
                            type="button"
                            onClick={() => setShowAppId((prev) => !prev)}
                            className="absolute inset-y-0 right-0 flex items-center pr-3 bg-transparent border-none outline-none cursor-pointer"
                            tabIndex={-1}
                          >
                            {showAppId ? <EyeCloseIcon /> : <EyeIcon />}
                          </button>
                        )}
                        {id === "instaAppSecret" && (
                          <button
                            type="button"
                            onClick={() => setShowAppSecret((prev) => !prev)}
                            className="absolute inset-y-0 right-0 flex items-center pr-3 bg-transparent border-none outline-none cursor-pointer"
                            tabIndex={-1}
                          >
                            {showAppSecret ? <EyeCloseIcon /> : <EyeIcon />}
                          </button>
                        )}
                        {id === "instaToken" && (
                          <button
                            type="button"
                            onClick={() => setShowInstaToken((prev) => !prev)}
                            className="absolute inset-y-0 right-0 flex items-center pr-3 bg-transparent border-none outline-none cursor-pointer"
                            tabIndex={-1}
                          >
                            {showInstaToken ? <EyeCloseIcon /> : <EyeIcon />}
                          </button>
                        )}
                        {id === "verifyToken" && (
                          <button
                            type="button"
                            onClick={() => setShowVerifyToken((prev) => !prev)}
                            className="absolute inset-y-0 right-0 flex items-center pr-3 bg-transparent border-none outline-none cursor-pointer"
                            tabIndex={-1}
                          >
                            {showVerifyToken ? <EyeCloseIcon /> : <EyeIcon />}
                          </button>
                        )}
                      </div>
                    </div>
                  );})}
              </div>

              {/* Audit trail */}
              {(lastUpdatedBy || lastUpdatedAt) && (
                <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
                  <span>Last Updated By: {lastUpdatedBy || '—'}</span>
                  <span className="mx-2">|</span>
                  <span>Date: {lastUpdatedAt ? new Date(lastUpdatedAt).toLocaleString() : '—'}</span>
                </div>
              )}
            </form>
          </div>
        )}

        {activeTab === "setup" && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200/60 dark:border-gray-700/60 p-8 mb-8">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <Share2 className="text-white w-5 h-5" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Webhook Setup</h2>
            </div>
            
            <div className="space-y-6">
              <div>
                <Label htmlFor="webhookUrl" className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 block">Webhook URL</Label>
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <Input
                      id="webhookUrl"
                      defaultValue={WEBHOOK_URL}
                      disabled={true}
                      className="bg-gray-50 dark:bg-gray-700 cursor-not-allowed text-sm font-mono font-medium break-all border-gray-200 dark:border-gray-600 rounded-xl"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-300 flex-shrink-0 hover:scale-105 shadow-lg"
                    aria-label="Copy webhook URL"
                  >
                    <Copy className="w-4 h-4" />
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-3 leading-relaxed">
                  Copy the Webhook URL and configure it in your Instagram Basic Display API settings. Set the verify token above.
                </p>
              </div>
              
              <div className="bg-gradient-to-r from-blue-50 to-blue-50 dark:from-blue-900/20 dark:to-blue-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Integration Guide</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      Follow the official Instagram Basic Display API documentation to complete your Instagram integration.
                    </p>
                    <a
                      href={`https://developers.facebook.com/docs/instagram-basic-display-api/`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-purple-700 dark:hover:text-blue-300 font-medium text-sm transition-colors duration-200"
                    >
                      View Instagram Integration Guide
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "setup" && (
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-8 mb-8">
            <div title={!isFormValid ? 'Fill in all required fields to enable Instagram integration.' : undefined}>
              <Button
                onClick={() => {
                  const formEl = document.getElementById('instaCredsForm') as HTMLFormElement | null;
                  if (formEl && formEl.reportValidity()) {
                    handleSave();
                  }
                }}
                disabled={loading || isCredentialsEditable === false || !isFormValid}
                startIcon={loading ? undefined : <Save className="w-5 h-5" />}
                className="px-8 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {loading ? 'Saving...' : 'Save & Connect'}
              </Button>
            </div>
            {/* New Configuration Button */}
            {!isCredentialsEditable && (
              <Button
                variant="outline"
                onClick={() => {
                  setCredentials({
                    instaToken: "",
                    instaAppId: "",
                    instaAppSecret: "",
                    verifyToken: "",
                  });
                  setLastSavedCredentials({
                    instaToken: "",
                    instaAppId: "",
                    instaAppSecret: "",
                    verifyToken: "",
                  });
                  setIsCredentialsEditable(true);
                  setEditingId(null);
                  setCurrentId(null);
                  setCanEdit(false);
                  // Clear localStorage when starting new config
                  localStorage.removeItem("instagramCredentials");
                  localStorage.removeItem("currentConfigurationId");
                }}
                startIcon={<span>🆕</span>}
                className="px-6 py-3 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-300 hover:scale-105"
              >
                New Configuration
              </Button>
            )}
          </div>
        )}

        {activeTab === "feedback" && (
          <div className="space-y-8">
            {/* Feedback Stats Dashboard */}
            {feedbackStats && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200/60 dark:border-gray-700/60 p-8">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                      <TrendingUp className="text-white w-5 h-5" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Feedback Analytics</h2>
                  </div>
                  <Button
                    onClick={fetchFeedbackData}
                    disabled={feedbackLoading}
                    startIcon={<RefreshCw className={`w-4 h-4 ${feedbackLoading ? 'animate-spin' : ''}`} />}
                    variant="outline"
                    size="sm"
                  >
                    {feedbackLoading ? 'Loading...' : 'Refresh'}
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {/* Total Feedback */}
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                        <MessageSquare className="text-white w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Total Feedback</p>
                        <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{feedbackStats.total_feedback}</p>
                      </div>
                    </div>
                  </div>

                  {/* Average Rating */}
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                        <Star className="text-white w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Average Rating</p>
                        <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{feedbackStats.average_rating.toFixed(1)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Rating Distribution */}
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                        <Users className="text-white w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-blue-600 dark:text-blue-400">5-Star Ratings</p>
                        <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{feedbackStats.rating_distribution['5'] || 0}</p>
                      </div>
                    </div>
                  </div>

                  {/* Customer Feedback */}
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                        <Users className="text-white w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Customer Feedback</p>
                        <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{feedbackStats.type_distribution.customer || 0}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Rating Distribution Chart */}
                <div className="mt-8">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Rating Distribution</h3>
                  <div className="grid grid-cols-5 gap-4">
                    {[1, 2, 3, 4, 5].map(rating => (
                      <div key={rating} className="text-center">
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 mb-2">
                          <div 
                            className="bg-gradient-to-r from-blue-500 to-blue-500 h-4 rounded-full transition-all duration-300"
                            style={{ 
                              width: `${((feedbackStats.rating_distribution[rating.toString()] || 0) / feedbackStats.total_feedback) * 100}%` 
                            }}
                          />
                        </div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{rating} Star</p>
                        <p className="text-xs text-gray-500 dark:text-gray-500">{feedbackStats.rating_distribution[rating.toString()] || 0}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Feedback List */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200/60 dark:border-gray-700/60 p-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                    <MessageSquare className="text-white w-5 h-5" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Feedback List</h2>
                </div>
                
                {/* Filters */}
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-gray-500" />
                    <select
                      value={feedbackFilter}
                      onChange={(e) => setFeedbackFilter(e.target.value as 'all' | 'customer' | 'employee' | 'guest')}
                      className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                    >
                      <option value="all">All Types</option>
                      <option value="customer">Customer</option>
                      <option value="employee">Employee</option>
                      <option value="guest">Guest</option>
                    </select>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-gray-500" />
                    <select
                      value={ratingFilter}
                      onChange={(e) => setRatingFilter(e.target.value as 'all' | '1' | '2' | '3' | '4' | '5')}
                      className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                    >
                      <option value="all">All Ratings</option>
                      <option value="5">5 Stars</option>
                      <option value="4">4 Stars</option>
                      <option value="3">3 Stars</option>
                      <option value="2">2 Stars</option>
                      <option value="1">1 Star</option>
                    </select>
                  </div>
                </div>
              </div>

              {feedbackLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                  <span className="ml-3 text-gray-600 dark:text-gray-400">Loading feedback...</span>
                </div>
              ) : filteredFeedback.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-100 via-pink-100 to-orange-100 dark:from-blue-900/30 dark:to-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                    <MessageSquare className="text-blue-600 dark:text-blue-400 w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Feedback Found</h3>
                  <p className="text-gray-600 dark:text-gray-400">No feedback matches your current filters.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredFeedback.map((item) => (
                    <div key={item._id} className="border border-gray-200 dark:border-gray-700 rounded-xl p-6 hover:shadow-lg transition-shadow duration-200">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            item.feedback_type === 'customer' ? 'bg-blue-100 dark:bg-blue-900/30' :
                            item.feedback_type === 'employee' ? 'bg-blue-100 dark:bg-blue-900/30' :
                            'bg-gray-100 dark:bg-gray-700'
                          }`}>
                            <Users className={`w-4 h-4 ${
                              item.feedback_type === 'customer' ? 'text-blue-600 dark:text-blue-400' :
                              item.feedback_type === 'employee' ? 'text-blue-600 dark:text-blue-400' :
                              'text-gray-600 dark:text-gray-400'
                            }`} />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 dark:text-white capitalize">{item.feedback_type}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">User ID: {item.user_id}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`w-4 h-4 ${
                                  star <= item.rating
                                    ? 'text-yellow-400 fill-current'
                                    : 'text-gray-300 dark:text-gray-600'
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{item.rating}/5</span>
                        </div>
                      </div>
                      
                      <p className="text-gray-700 dark:text-gray-300 mb-4">{item.comment}</p>
                      
                      <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                        <span>Platform: {item.platform}</span>
                        <span>{new Date(item.timestamp).toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "greeting" && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200/60 dark:border-gray-700/60 p-8 mb-8">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                <FaUsers className="text-white w-5 h-5" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Content Manager</h2>
            </div>
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-100 via-pink-100 to-orange-100 dark:from-blue-900/30 dark:to-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <FaUsers className="text-blue-600 dark:text-blue-400 w-8 h-8" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Instagram Content Management</h3>
              <p className="text-gray-600 dark:text-gray-400">Manage your Instagram content, posts, and automated responses.</p>
            </div>
          </div>
        )}

        {activeTab === "job-form" && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200/60 dark:border-gray-700/60 p-8 mb-8">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg">
                <FaUsers className="text-white w-5 h-5" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Job Form Manager</h2>
            </div>
            <JobFormManager />
          </div>
        )}

        {activeTab === "lead-form" && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200/60 dark:border-gray-700/60 p-8 mb-8">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg">
                <FaUsers className="text-white w-5 h-5" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Lead Form Manager</h2>
            </div>
            <LeadFormManager />
          </div>
        )}

        {activeTab === "customer-ticket" && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200/60 dark:border-gray-700/60 p-8 mb-8">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <FaUsers className="text-white w-5 h-5" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Customer Ticket Form Manager</h2>
            </div>
            <CustomerTicketFormManager />
          </div>
        )}

        {activeTab === "employee-ticket" && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200/60 dark:border-gray-700/60 p-8 mb-8">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                <FaUsers className="text-white w-5 h-5" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Employee Ticket Form Manager</h2>
            </div>
            <EmployeeTicketFormManager />
          </div>
        )}
        
      </div>
    </div>
  );

  return pageContent;
}
