"use client";
import React, { useState, useRef, useEffect, JSX } from "react";
import { CheckCircle, Copy, Share2, Save, TestTube } from "lucide-react";
import Alert from "@/components/ui/alert/Alert";
import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import EyeIcon from "@/icons/eye.svg";
import EyeCloseIcon from "@/icons/eye-close.svg";
import FeedbackModule from "./feedback";
import { FaUser, FaUsers } from "react-icons/fa";
import GreetingManagerPage from "./greeting-manager/page";
import JobFormManager from "./job-form/page";
import LeadFormManager from "./lead-form/page";
import CustomerTicketFormManager from "./ticket-form/customer/page";
import EmployeeTicketFormManager from "./ticket-form/employee/page";
import DashboardHeader from "@/components/header/DashboardHeader";
// Inline tooltips (using title attribute) to avoid external dependency
// WhatsApp credentials API base URL from environment variables
const RAW_BASE_API_URL = process.env.NEXT_PUBLIC_WHATSAPP_BOT_API_URL || process.env.NEXT_PUBLIC_API_URL || "https://wa-mobiloitte.converiqo.ai";
const BASE_API_URL = RAW_BASE_API_URL ? RAW_BASE_API_URL.replace(/\/+$/, "") : "https://wa-mobiloitte.converiqo.ai";
const API_PREFIX = `${BASE_API_URL}/credentials`;
const WEBHOOK_URL = `${BASE_API_URL}/webhook/webhook`;


type AlertInfo = {
  show: boolean;
  variant: 'success' | 'error';
  title: string;
  message: string;
};
type Credential = {
  id?: string;
  _id?: string;
  whatsapp_business_account_id?: string;
  phone_number_id?: string;
  app_id?: string;
  app_secret?: string;
  access_token?: string;
  webhook_verify_token?: string;
  [key: string]: unknown;
};

export default function WatsappIntegrationPage(): JSX.Element {
  const [activeTab, setActiveTab] = useState<"setup" | "feedback" | "greeting" | "job-form" | "lead-form" | "customer-ticket" | "employee-ticket">("setup");
  const [showHelp, setShowHelp] = useState(false);

  const getInitialCredentials = () => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("whatsappCredentials");
      if (saved) {
        try {
          return {
            businessAccountId: "",
            phoneNumberId: "",
            appId: "",
            appSecret: "",
            accessToken: "",
            webhookVerifyToken: "",
            ...JSON.parse(saved),
          };
        } catch { }
      }
    }
    return {
      businessAccountId: "",
      phoneNumberId: "",
      appId: "",
      appSecret: "",
      accessToken: "",
      webhookVerifyToken: "",
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
  const [showAccessToken, setShowAccessToken] = useState(false);
  const [showAppSecret, setShowAppSecret] = useState(false);
  const [showWebhookVerifyToken, setShowWebhookVerifyToken] = useState(false);
  const [showBusinessAccountId, setShowBusinessAccountId] = useState(false);
  const [showPhoneNumberId, setShowPhoneNumberId] = useState(false);
  const [showAppId, setShowAppId] = useState(false);
  const [lastUpdatedBy, setLastUpdatedBy] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [testingConnection, setTestingConnection] = useState(false);

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
      case 'businessAccountId':
        return {
          required: true,
          inputMode: 'numeric' as const,
          pattern: '\\d{15,20}',
          minLength: 15,
          maxLength: 20,
          title: 'Must be 15–20 digits',
          autoComplete: 'off',
        };
      case 'phoneNumberId':
        return {
          required: true,
          inputMode: 'numeric' as const,
          pattern: '\\d{10,20}',
          minLength: 10,
          maxLength: 20,
          title: 'Must be 10–20 digits',
          autoComplete: 'off',
        };
      case 'appId':
        return {
          required: true,
          inputMode: 'numeric' as const,
          pattern: '\\d{8,20}',
          minLength: 8,
          maxLength: 20,
          title: 'Must be 8–20 digits',
          autoComplete: 'off',
        };
      case 'appSecret':
        return {
          required: true,
          pattern: '[A-Za-z0-9-_]{32,256}',
          minLength: 32,
          maxLength: 256,
          title: '32–256 characters: letters, numbers, - or _',
          autoComplete: 'new-password',
        };
      case 'accessToken':
        return {
          required: true,
          pattern: '[A-Za-z0-9-_|]{90,300}',
          minLength: 90,
          maxLength: 300,
          title: '90–300 characters: letters, numbers, -, _ or |',
          autoComplete: 'off',
        };
      case 'webhookVerifyToken':
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
    businessAccountId: 'Must be a valid numeric ID from Meta Business Manager.',
    phoneNumberId: 'Must be the numeric ID linked to your registered WhatsApp phone number.',
    appId: 'Enter the App ID from your Meta Developer App settings.',
    appSecret: 'Enter the App Secret from your Meta Developer App settings.',
    accessToken: 'Use a valid long-lived access token from Meta Graph API.',
    webhookVerifyToken: 'This is your custom token for webhook verification (must match Meta App dashboard).',
  };

  const regexByField: Record<string, RegExp> = {
    businessAccountId: /^\d{15,20}$/,
    phoneNumberId: /^\d{10,20}$/,
    appId: /^\d{8,20}$/,
    appSecret: /^[A-Za-z0-9-_]{32,256}$/,
    accessToken: /^[A-Za-z0-9-_|]{90,300}$/,
    webhookVerifyToken: /^[A-Za-z0-9-_]{6,64}$/,
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
  // Lead Application Modal State
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
  const [leadForm, setLeadForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    interest: '',
    source: '',
  });
  const [leadSuccess, setLeadSuccess] = useState<string | null>(null);
  // Save credentials to localStorage on every change
  useEffect(() => {
    localStorage.setItem("whatsappCredentials", JSON.stringify(credentials));
  }, [credentials]);
  // Load audit trail metadata
  useEffect(() => {
    try {
      const meta = localStorage.getItem("whatsappCredentialsMeta");
      if (meta) {
        const parsed = JSON.parse(meta);
        setLastUpdatedBy(parsed.lastUpdatedBy || null);
        setLastUpdatedAt(parsed.lastUpdatedAt || null);
      }
    } catch { }
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
    try { validateField(name, value); } catch { }
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
      whatsapp_business_account_id: credentials.businessAccountId,
      phone_number_id: credentials.phoneNumberId,
      app_id: credentials.appId,
      app_secret: credentials.appSecret,
      access_token: credentials.accessToken,
      webhook_verify_token: credentials.webhookVerifyToken,
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
    const wabaIdRegex = /^\d{15,20}$/;
    const phoneIdRegex = /^\d{10,20}$/;
    const appIdRegex = /^\d{8,20}$/;
    const appSecretRegex = /^[A-Za-z0-9-_]{32,256}$/;
    const accessTokenRegex = /^[A-Za-z0-9-_|]{90,300}$/
    const webhookTokenRegex = /^[A-Za-z0-9-_]{6,64}$/;

    if (!wabaIdRegex.test(credentials.businessAccountId)) {
      setAlertInfo({
        show: true,
        variant: 'error',
        title: 'Validation Error',
        message: 'WhatsApp Business Account ID must be 15–20 digits.'
      });
      setLoading(false);
      setTimeout(() => setAlertInfo(null), 4000);
      return;
    }
    if (!phoneIdRegex.test(credentials.phoneNumberId)) {
      setAlertInfo({
        show: true,
        variant: 'error',
        title: 'Validation Error',
        message: 'Phone Number ID must be 10–20 digits.'
      });
      setLoading(false);
      setTimeout(() => setAlertInfo(null), 4000);
      return;
    }
    if (!appIdRegex.test(credentials.appId)) {
      setAlertInfo({
        show: true,
        variant: 'error',
        title: 'Validation Error',
        message: 'App ID must be 8–20 digits.'
      });
      setLoading(false);
      setTimeout(() => setAlertInfo(null), 4000);
      return;
    }
    if (!appSecretRegex.test(credentials.appSecret)) {
      setAlertInfo({
        show: true,
        variant: 'error',
        title: 'Validation Error',
        message: 'App Secret must be 32–64 chars (letters, numbers, - or _).'
      });
      setLoading(false);
      setTimeout(() => setAlertInfo(null), 4000);
      return;
    }
    if (!accessTokenRegex.test(credentials.accessToken)) {
      setAlertInfo({
        show: true,
        variant: 'error',
        title: 'Validation Error',
        message: 'Access Token must be 90–300 chars (letters, numbers, -, _ or |).'
      });
      setLoading(false);
      setTimeout(() => setAlertInfo(null), 4000);
      return;
    }
    if (!webhookTokenRegex.test(credentials.webhookVerifyToken)) {
      setAlertInfo({
        show: true,
        variant: 'error',
        title: 'Validation Error',
        message: 'Webhook Verify Token must be 6–64 chars (letters, numbers, - or _).'
      });
      setLoading(false);
      setTimeout(() => setAlertInfo(null), 4000);
      return;
    }
    // Check for no changes compared to last saved credentials
    const isUnchanged =
      credentials.businessAccountId === lastSavedCredentials.businessAccountId &&
      credentials.phoneNumberId === lastSavedCredentials.phoneNumberId &&
      credentials.appId === lastSavedCredentials.appId &&
      credentials.appSecret === lastSavedCredentials.appSecret &&
      credentials.accessToken === lastSavedCredentials.accessToken &&
      credentials.webhookVerifyToken === lastSavedCredentials.webhookVerifyToken;

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
        ? `${API_PREFIX}/${editingId}`
        : `${API_PREFIX}`;


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
        // Store the ID for future editing (handle both id and _id from API)
        const credentialId = result.id || result._id;
        if (credentialId) {
          setCurrentId(credentialId);
          setEditingId(credentialId);
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
          localStorage.setItem("whatsappCredentialsMeta", JSON.stringify({ lastUpdatedBy: by, lastUpdatedAt: at }));
        } catch { }
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

  // Test Connection Handler
  const handleTestConnection = async () => {
    setTestingConnection(true);
    setAlertInfo(null);

    // Validate required fields
    if (!credentials.businessAccountId || !credentials.phoneNumberId ||
      !credentials.appId || !credentials.appSecret || !credentials.accessToken ||
      !credentials.webhookVerifyToken) {
      setAlertInfo({
        show: true,
        variant: 'error',
        title: 'Validation Error',
        message: 'Please fill in all required fields before testing the connection.'
      });
      setTestingConnection(false);
      setTimeout(() => setAlertInfo(null), 4000);
      return;
    }

    try {
      const testData = {
        business_account_id: credentials.businessAccountId,
        phone_number_id: credentials.phoneNumberId,
        app_id: credentials.appId,
        app_secret: credentials.appSecret,
        access_token: credentials.accessToken,
        webhook_verify_token: credentials.webhookVerifyToken,
      };

      const response = await fetch(`${BASE_API_URL}/api/whatsapp/test-connection`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'accept': 'application/json'
        },
        body: JSON.stringify(testData),
      });

      const result = await response.json();

      if (response.ok) {
        setAlertInfo({
          show: true,
          variant: 'success',
          title: 'Connection Test Successful!',
          message: result.message || 'WhatsApp integration connected successfully. Your business account is now linked.'
        });
      } else {
        throw new Error(result.message || result.detail || 'Connection test failed.');
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred while testing the connection.';
      setAlertInfo({
        show: true,
        variant: 'error',
        title: 'Connection Test Failed',
        message: errorMessage
      });
    } finally {
      setTestingConnection(false);
      setTimeout(() => setAlertInfo(null), 5000);
    }
  };


  // Derived validation state for enabling Save/Test buttons
  const isFormValid = (() => {
    const wabaIdRegex = /^\d{15,20}$/;
    const phoneIdRegex = /^\d{10,20}$/;
    const appIdRegex = /^\d{8,20}$/;
    const appSecretRegex = /^[A-Za-z0-9-_]{32,256}$/
    const accessTokenRegex = /^[A-Za-z0-9-_|]{90,300}$/
    const webhookTokenRegex = /^[A-Za-z0-9-_]{6,64}$/;
    if (!wabaIdRegex.test(credentials.businessAccountId)) return false;
    if (!phoneIdRegex.test(credentials.phoneNumberId)) return false;
    if (!appIdRegex.test(credentials.appId)) return false;
    if (!appSecretRegex.test(credentials.appSecret)) return false;
    if (!accessTokenRegex.test(credentials.accessToken)) return false;
    if (!webhookTokenRegex.test(credentials.webhookVerifyToken)) return false;
    return true;
  })();

  const handleLeadChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLeadForm({ ...leadForm, [e.target.name]: e.target.value });
  };

  const handleLeadReset = () => {
    setLeadForm({ fullName: '', email: '', phone: '', interest: '', source: '' });
    setLeadSuccess(null);
  };

  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLeadSuccess(null);
    const prompts = [
      leadForm.fullName,
      leadForm.email,
      leadForm.phone,
      leadForm.interest,
      leadForm.source,
    ];
    try {
      const response = await fetch(`${API_PREFIX}/leads/lead-prompts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prompts),
      });
      if (!response.ok) throw new Error("Failed to save prompts");
      setLeadSuccess("Prompts saved successfully!");
      setTimeout(() => setLeadSuccess(null), 3000);
    } catch {
      setLeadSuccess("Failed to save prompts. Please try again.");
      setTimeout(() => setLeadSuccess(null), 3000);
    }
  };

  const fetchAllCredentials = async () => {
    try {
      const response = await fetch(`${API_PREFIX}`, {
        headers: {
          "accept": "application/json"
        }
      });
      if (response.ok) {
        const data = await response.json();
        // Handle response format: { credentials: [...] }
        const credentialsList = data.credentials || [];
        // Normalize _id to id for consistency
        const normalizedCredentials = credentialsList.map((cred: Credential) => ({
          ...cred,
          id: cred.id || cred._id || ''
        }));
        setAllCredentials(normalizedCredentials);
      }
    } catch (error) {
      console.error("Failed to fetch credentials:", error);
    }
  };

  type CredentialField = {
    id: string;
    label: string;
    placeholder: string;
    tooltip: string;
    type?: string;
  };

  const credentialFields: CredentialField[] = [
    {
      id: "businessAccountId",
      label: "WhatsApp Business Account ID",
      placeholder: "Enter WhatsApp Business Account ID",
      tooltip: "Your unique business account ID from Meta Business Manager. Required for all API calls.",
    },
    {
      id: "phoneNumberId",
      label: "Phone Number ID",
      placeholder: "Enter Phone Number ID",
      tooltip: "The ID of the WhatsApp-enabled phone number in your Meta account.",
    },
    {
      id: "appId",
      label: "App ID",
      placeholder: "Enter App ID",
      tooltip: "The application ID assigned to your Meta Developer app.",
    },
    {
      id: "appSecret",
      label: "App Secret",
      type: "password",
      placeholder: "Enter App Secret",
      tooltip: "The secret key generated in your Meta Developer app. Keep this confidential.",
    },
    {
      id: "accessToken",
      label: "Access Token",
      type: "password",
      placeholder: "Enter Access Token",
      tooltip: "Your long-lived access token generated in Meta Developer Portal. Required for authentication.",
    },
    {
      id: "webhookVerifyToken",
      label: "Webhook Verify Token",
      type: "password",
      placeholder: "Enter Webhook Verify Token",
      tooltip: "Custom string you define to verify ownership of the webhook during setup.",
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

      {/* Lead Application Modal */}
      {isLeadModalOpen && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-white/10 backdrop-blur-[1px]" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99999, pointerEvents: 'auto' }}>
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-blue-500 rounded-2xl shadow-2xl p-4 sm:p-8 w-full max-w-md mx-2 relative animate-[slideIn_0.3s_ease]">
            <h2 className="text-2xl font-bold text-center mb-6 text-gray-900 dark:text-white">Customize WhatsApp Bot Prompts</h2>
            <form onSubmit={handleLeadSubmit}>
              <div className="mb-4">
                <Label htmlFor="fullName"><span role="img" aria-label="user">👤</span> Full Name Prompt</Label>
                <Input name="fullName" defaultValue={leadForm.fullName} onChange={handleLeadChange} placeholder="What's your full name?" />
              </div>
              <div className="mb-4">
                <Label htmlFor="email"><span role="img" aria-label="email">📧</span> Email Prompt</Label>
                <Input name="email" type="email" defaultValue={leadForm.email} onChange={handleLeadChange} placeholder="What's your email address?" />
              </div>
              <div className="mb-4">
                <Label htmlFor="phone"><span role="img" aria-label="phone">📱</span> Phone Prompt</Label>
                <Input name="phone" defaultValue={leadForm.phone} onChange={handleLeadChange} placeholder="What's your phone number?" />
              </div>
              <div className="mb-4">
                <Label htmlFor="interest"><span role="img" aria-label="interest">💡</span> Interest Prompt</Label>
                <Input name="interest" defaultValue={leadForm.interest} onChange={handleLeadChange} placeholder="What is your interest? (e.g., Mobile App Development)" />
              </div>
              <div className="mb-6">
                <Label htmlFor="source"><span role="img" aria-label="source">🌐</span> Source Prompt</Label>
                <Input name="source" defaultValue={leadForm.source} onChange={handleLeadChange} placeholder="Where did you hear about us? (e.g., WhatsApp Chatbot)" />
              </div>
              {leadSuccess && <div className="mb-4 text-blue-600 dark:text-blue-400 text-center font-medium">{leadSuccess}</div>}
              <div className="flex flex-col gap-3">
                <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2 font-semibold transition">Save Prompts</button>
                <Button variant="outline" onClick={handleLeadReset} className="w-full">Reset to Defaults</Button>
                <button type="button" onClick={() => setIsLeadModalOpen(false)} className="absolute top-3 right-4 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-2xl font-bold bg-transparent border-none">×</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Professional Header */}
      <div className="mx-6 mt-6 mb-8">
        <DashboardHeader
          variant="default"
          size="lg"
          title="WhatsApp Integration"
          subtitle="Integrate your WhatsApp Business account with Meta's Developer Platform to enable ticketing, notifications, and automation"
          breadcrumbs={[
            { label: 'Home', href: '/' },
            { label: 'WhatsApp Integration', href: '/WhatsApp-Integration' }
          ]}
          icon={() => (
            <svg className="w-6 h-6 sm:w-8 sm:h-8 text-white" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          )}
          showHelp={showHelp}
          onHelpToggle={() => setShowHelp(!showHelp)}
          helpContent={
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-blue-300 rounded-full mt-2 flex-shrink-0"></div>
                  <span>Configure Meta Developer credentials for WhatsApp Business API</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-blue-300 rounded-full mt-2 flex-shrink-0"></div>
                  <span>Set up webhook URL for real-time message handling</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-purple-300 rounded-full mt-2 flex-shrink-0"></div>
                  <span>Manage message templates and automated responses</span>
                </li>
              </ul>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-orange-300 rounded-full mt-2 flex-shrink-0"></div>
                  <span>Track customer feedback and engagement metrics</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-pink-300 rounded-full mt-2 flex-shrink-0"></div>
                  <span>Customize greeting messages and job application forms</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-cyan-300 rounded-full mt-2 flex-shrink-0"></div>
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
              aria-label="WhatsApp Integration Tabs"
            >
              {[
                { key: "setup", label: "SetUp", icon: <FaUser className="inline-block mr-2 mb-0.5" size={16} /> },
                { key: "feedback", label: "Feedback", icon: <FaUsers className="inline-block mr-2 mb-0.5" size={16} /> },
                { key: "greeting", label: "Greeting Manager", icon: <FaUsers className="inline-block mr-2 mb-0.5" size={16} /> },
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
                      : "text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20"
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
                      <span className="font-mono text-sm break-all bg-blue-50 text-blue-800 dark:bg-blue-900/20 dark:text-blue-200 px-3 py-1.5 rounded border">
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
                  {allCredentials.map((cred) => {
                    const credId = cred.id || cred._id || '';
                    return (
                      <div key={credId} className="text-xs text-gray-800 dark:text-gray-200 mb-1">
                        <span className="font-mono bg-gray-200 dark:bg-gray-700 px-1 rounded">{credId}</span>
                        {cred.phone_number_id && (
                          <span className="ml-2 text-gray-500">(Phone: {cred.phone_number_id})</span>
                        )}
                      </div>
                    );
                  })}
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
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md px-4 py-2 text-sm shadow"
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
                    const response = await fetch(`${API_PREFIX}/${userIdInput.trim()}`, {
                      headers: {
                        "accept": "application/json"
                      }
                    });
                    if (!response.ok) {
                      const errorData = await response.json().catch(() => ({}));
                      throw new Error(errorData.detail || errorData.message || "Invalid ID or not found");
                    }

                    const data = await response.json();
                    const newCreds = {
                      businessAccountId: data.whatsapp_business_account_id || "",
                      phoneNumberId: data.phone_number_id || "",
                      appId: data.app_id || "",
                      appSecret: data.app_secret || "",
                      accessToken: data.access_token || "",
                      webhookVerifyToken: data.webhook_verify_token || "",
                    };
                    setCredentials(newCreds);
                    setLastSavedCredentials(newCreds);
                    // Handle both id and _id from API response
                    const credentialId = data.id || data._id;
                    setEditingId(credentialId);
                    setCurrentId(credentialId);
                    setIsEditModalOpen(false);
                    setIsCredentialsEditable(true);
                    setCanEdit(false);
                    // Update localStorage with backend data
                    localStorage.setItem("whatsappCredentials", JSON.stringify(newCreds));
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
            <form id="waCredsForm" noValidate onSubmit={(e) => { e.preventDefault(); if (isFormValid) handleSave(); }}>
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
                        <span aria-hidden="true" className="ml-0.5 text-red-600" title="Required">*</span>
                        <TooltipInline content={tooltip} placement={'right'} />
                      </div>
                      <div className="relative">
                        <Input
                          id={id}
                          name={id}
                          type={
                            id === "businessAccountId"
                              ? (showBusinessAccountId ? "text" : "password")
                              : id === "phoneNumberId"
                                ? (showPhoneNumberId ? "text" : "password")
                                : id === "appId"
                                  ? (showAppId ? "text" : "password")
                                  : id === "accessToken"
                                    ? (showAccessToken ? "text" : "password")
                                    : id === "appSecret"
                                      ? (showAppSecret ? "text" : "password")
                                      : id === "webhookVerifyToken"
                                        ? (showWebhookVerifyToken ? "text" : "password")
                                        : baseType
                          }
                          defaultValue={credentials[id as keyof typeof credentials]}
                          onChange={handleCredentialChange}
                          placeholder={placeholder || `Enter ${label}`}
                          disabled={!isCredentialsEditable}
                          className={`${idx === 0 ? "focus:ring-2 focus:ring-blue-500" : ""} ${errors[id] ? 'border-red-500 focus:ring-red-500' : ''}`}
                          {...getFieldValidation(id)}
                        />
                        {errors[id] && (
                          <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors[id]}</p>
                        )}
                        {id === "businessAccountId" && (
                          <button
                            type="button"
                            onClick={() => setShowBusinessAccountId((prev) => !prev)}
                            className="absolute inset-y-0 right-0 flex items-center pr-3 bg-transparent border-none outline-none cursor-pointer"
                            tabIndex={-1}
                          >
                            {showBusinessAccountId ? <EyeCloseIcon /> : <EyeIcon />}
                          </button>
                        )}
                        {id === "phoneNumberId" && (
                          <button
                            type="button"
                            onClick={() => setShowPhoneNumberId((prev) => !prev)}
                            className="absolute inset-y-0 right-0 flex items-center pr-3 bg-transparent border-none outline-none cursor-pointer"
                            tabIndex={-1}
                          >
                            {showPhoneNumberId ? <EyeCloseIcon /> : <EyeIcon />}
                          </button>
                        )}
                        {id === "appId" && (
                          <button
                            type="button"
                            onClick={() => setShowAppId((prev) => !prev)}
                            className="absolute inset-y-0 right-0 flex items-center pr-3 bg-transparent border-none outline-none cursor-pointer"
                            tabIndex={-1}
                          >
                            {showAppId ? <EyeCloseIcon /> : <EyeIcon />}
                          </button>
                        )}
                        {id === "accessToken" && (
                          <button
                            type="button"
                            onClick={() => setShowAccessToken((prev) => !prev)}
                            className="absolute inset-y-0 right-0 flex items-center pr-3 bg-transparent border-none outline-none cursor-pointer"
                            tabIndex={-1}
                          >
                            {showAccessToken ? <EyeCloseIcon /> : <EyeIcon />}
                          </button>
                        )}
                        {id === "appSecret" && (
                          <button
                            type="button"
                            onClick={() => setShowAppSecret((prev) => !prev)}
                            className="absolute inset-y-0 right-0 flex items-center pr-3 bg-transparent border-none outline-none cursor-pointer"
                            tabIndex={-1}
                          >
                            {showAppSecret ? <EyeCloseIcon /> : <EyeIcon />}
                          </button>
                        )}
                        {id === "webhookVerifyToken" && (
                          <button
                            type="button"
                            onClick={() => setShowWebhookVerifyToken((prev) => !prev)}
                            className="absolute inset-y-0 right-0 flex items-center pr-3 bg-transparent border-none outline-none cursor-pointer"
                            tabIndex={-1}
                          >
                            {showWebhookVerifyToken ? <EyeCloseIcon /> : <EyeIcon />}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
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
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-300 flex-shrink-0 hover:scale-105 shadow-lg"
                    aria-label="Copy webhook URL"
                  >
                    <Copy className="w-4 h-4" />
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-3 leading-relaxed">
                  Copy the Webhook URL and configure it in your Meta Developer Portal under Webhooks. Set the verify token above.
                </p>
              </div>

              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Integration Guide</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      Follow the official Meta Developer documentation to complete your WhatsApp Business API integration.
                    </p>
                    <a
                      href={`https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/payload-examples/`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium text-sm transition-colors duration-200"
                    >
                      View WhatsApp Integration Guide
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
            <div className="flex items-center gap-3">
              <div title={!isFormValid ? 'Fill in all required fields to enable WhatsApp integration.' : undefined}>
                <Button
                  onClick={() => {
                    const formEl = document.getElementById('waCredsForm') as HTMLFormElement | null;
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
              <Button
                onClick={handleTestConnection}
                disabled={testingConnection || !isFormValid}
                startIcon={testingConnection ? undefined : <TestTube className="w-4 h-4" />}
                variant="outline"
                className="px-6 py-3 border-2 border-green-500 dark:border-green-600 text-green-600 dark:text-green-400 font-semibold rounded-xl hover:bg-green-50 dark:hover:bg-green-900/20 transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {testingConnection ? 'Testing...' : 'Test Connection'}
              </Button>
            </div>
            {/* New Configuration Button */}
            {!isCredentialsEditable && (
              <Button
                variant="outline"
                onClick={() => {
                  setCredentials({
                    businessAccountId: "",
                    phoneNumberId: "",
                    appId: "",
                    appSecret: "",
                    accessToken: "",
                    webhookVerifyToken: "",
                  });
                  setLastSavedCredentials({
                    businessAccountId: "",
                    phoneNumberId: "",
                    appId: "",
                    appSecret: "",
                    accessToken: "",
                    webhookVerifyToken: "",
                  });
                  setIsCredentialsEditable(true);
                  setEditingId(null);
                  setCurrentId(null);
                  setCanEdit(false);
                  // Clear localStorage when starting new config
                  localStorage.removeItem("whatsappCredentials");
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
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200/60 dark:border-gray-700/60 p-8 mb-8">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
                <FaUsers className="text-white w-5 h-5" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Feedback Management</h2>
            </div>
            <FeedbackModule />
          </div>
        )}

        {activeTab === "greeting" && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200/60 dark:border-gray-700/60 p-8 mb-8">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg">
                <FaUsers className="text-white w-5 h-5" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Greeting Manager</h2>
            </div>
            <GreetingManagerPage />
          </div>
        )}

        {activeTab === "job-form" && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200/60 dark:border-gray-700/60 p-8 mb-8">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
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
