"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Button from "@/components/ui/button/Button";
import Input from "@/components/form/input/InputField";
import Badge from "@/components/ui/badge/Badge";
import { Modal } from "@/components/ui/modal";
import TextArea from "@/components/form/input/TextArea";
import { toast, Toaster } from "react-hot-toast";
import { API_BASE_URL as API_BASE_FALLBACK } from "@/lib/api";
// Read API base URL from environment, fallback to shared lib if not provided
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || API_BASE_FALLBACK || "";
import { 
  Mail, 
  Settings, 
  TrendingUp, 
  Plus,
  RefreshCw,
  Edit2,
  Check,
  X,
  Server,
  Shield,
  CheckCircle,
  AlertCircle,
  HelpCircle,
  Activity,
  AlertTriangle,
  Clock,
  Trash2
} from "lucide-react";
import DashboardHeader from '@/components/header/DashboardHeader';

interface EmailModule {
  id: string;
  name: string;
  fromEmail: string;
  fromName: string;
  description: string;
  isActive: boolean;
}

interface SMTPConfig {
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_password: string;
  from_email: string;
  security: string;
}

// Backend payload shape
interface BackendModuleConfig {
  module: string;
  from_email?: string;
  from_name?: string;
  is_active?: boolean;
  icon?: string;
  color?: string;
  description?: string;
  name?: string;
}

// Shared module options and label formatter
const MODULE_OPTIONS: string[] = [
  "default",
  "admin",
  "ticketing",
  "leads",
  "customer_chat",
  "helpdesk",
  "system",
  "job",
  "project",
  "hr",
  "billing",
  "contacts",
  "rbac",
  "customer",
  "employee",
  "dashboard",
  "customer_service",
];

const formatModuleLabel = (value: string) =>
  value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

// Lightweight custom dropdown for module selection with scroll after ~4 items
function ModuleSelect({
  value,
  onChange,
  placeholder = "Select a module",
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const display = value || placeholder;
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full p-2 border border-input rounded-md bg-background text-left text-sm flex items-center justify-between"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span>{display}</span>
        <span className="ml-2 text-slate-500">▾</span>
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-white dark:bg-slate-800 shadow-lg">
          <ul className="max-h-32 overflow-y-auto py-1" role="listbox">
            <li
              className="px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
            >
              Select a module
            </li>
            {MODULE_OPTIONS.map((opt) => {
              const label = formatModuleLabel(opt);
              return (
                <li
                  key={opt}
                  className="px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                  onClick={() => {
                    onChange(label);
                    setOpen(false);
                  }}
                  role="option"
                  aria-selected={label === value}
                >
                  {label}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

// StatusToggleButton Component
interface StatusToggleButtonProps {
  isActive: boolean;
  onToggle: () => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

function StatusToggleButton({ isActive, onToggle, disabled = false, size = 'md' }: StatusToggleButtonProps) {
  const sizeClasses = {
    sm: 'h-7 w-12',
    md: 'h-8 w-14', 
    lg: 'h-9 w-16'
  };

  const dotSizeClasses = {
    sm: 'h-5 w-5',
    md: 'h-6 w-6', 
    lg: 'h-7 w-7'
  };

  const translateClasses = {
    sm: isActive ? 'translate-x-5' : 'translate-x-1',
    md: isActive ? 'translate-x-6' : 'translate-x-1',
    lg: isActive ? 'translate-x-7' : 'translate-x-1'
  };

  return (
    <div className="flex items-center justify-between min-w-[140px] max-w-[180px]">
      {/* Professional Status Indicator */}
      <div className="flex items-center gap-2">
        <div className={`
          w-2 h-2 rounded-full flex-shrink-0 transition-all duration-300
          ${isActive 
            ? 'bg-blue-500 shadow-lg shadow-blue-500/50' 
            : 'bg-slate-400 shadow-sm'
          }
        `} />
        <span className={`
          text-sm font-medium transition-colors duration-200
          ${isActive 
            ? 'text-blue-700 dark:text-blue-400' 
            : 'text-slate-500 dark:text-slate-400'
          }
        `}>
          {isActive ? 'Active' : 'Inactive'}
        </span>
      </div>
      
      {/* Professional Toggle Switch */}
      <button
        type="button"
        onClick={onToggle}
        disabled={disabled}
        className={`
          relative inline-flex shrink-0 cursor-pointer rounded-full p-0.5
          transition-all duration-300 ease-in-out focus:outline-none 
          focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
          disabled:opacity-50 disabled:cursor-not-allowed
          ${sizeClasses[size]}
          ${isActive 
            ? 'bg-gradient-to-r from-blue-500 to-blue-600 shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40 hover:from-blue-600 hover:to-blue-700' 
            : 'bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 shadow-inner'
          }
        `}
        role="switch"
        aria-checked={isActive}
        aria-label={`Toggle status ${isActive ? 'off' : 'on'}`}
      >
        <span className="sr-only">Toggle status</span>
        <div
          className={`
            ${dotSizeClasses[size]} ${translateClasses[size]}
            pointer-events-none inline-block rounded-full bg-white shadow-md
            transform ring-0 transition-all duration-300 ease-in-out
            items-center justify-center
            ${isActive 
              ? 'shadow-lg scale-105' 
              : 'shadow-sm scale-100'
            }
          `}
        >
          <div className={`
            w-2 h-2 rounded-full transition-all duration-300
            ${isActive 
              ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50' 
              : 'bg-slate-400'
            }
          `} />
        </div>
      </button>
    </div>
  );
}

// New: Module Table Component
function ModuleTable({
  modules,
  loading,
  onUpdate,
  onToggle,
  onTestEmail,
  onDelete,
  onEdit
}: {
  modules: EmailModule[];
  loading: boolean;
  onUpdate: (moduleId: string, fromEmail: string, fromName: string) => Promise<void>;
  onToggle: (moduleId: string) => void;
  onTestEmail: (moduleId: string, testEmail: string) => Promise<void>;
  onDelete: (moduleId: string) => Promise<void>;
  onEdit: (module: EmailModule) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [rowFromName, setRowFromName] = useState<string>("");
  const [rowFromEmail, setRowFromEmail] = useState<string>("");
  const [saving, setSaving] = useState<boolean>(false);
  const [testDialog, setTestDialog] = useState<{ open: boolean; moduleId: string | null }>({ open: false, moduleId: null });
  const [testEmailInput, setTestEmailInput] = useState<string>("");
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; moduleId: string | null; moduleName: string }>({ open: false, moduleId: null, moduleName: "" });

  // Removed unused startEdit function

  const cancelEdit = () => {
    setEditingId(null);
    setRowFromName("");
    setRowFromEmail("");
  };

  const saveEdit = async () => {
    if (!editingId) return;
    setSaving(true);
    try {
      await onUpdate(editingId, rowFromEmail, rowFromName);
      setEditingId(null);
    } finally {
      setSaving(false);
    }
  };

  // Removed unused handleTest function

  const submitTestFromDialog = async () => {
    if (!testDialog.moduleId || !testEmailInput) return;
    await onTestEmail(testDialog.moduleId, testEmailInput);
    setTestEmailInput("");
    setTestDialog({ open: false, moduleId: null });
  };

  return (
    <>
    <div className="w-full overflow-x-auto overflow-y-auto no-scrollbar max-h-80">
      <table className="min-w-[1000px] w-full border-collapse">
        <thead>
          <tr className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 text-left text-sm border-b border-slate-200 dark:border-slate-600">
            <th className="py-4 px-4 font-semibold text-slate-700 dark:text-slate-200 w-[22%]">Module</th>
            <th className="py-4 px-4 font-semibold text-slate-700 dark:text-slate-200 w-[18%]">From Name</th>
            <th className="py-4 px-4 font-semibold text-slate-700 dark:text-slate-200 w-[24%]">From Email</th>
            <th className="py-4 px-4 font-semibold text-slate-700 dark:text-slate-200 w-[22%]">Status</th>
            <th className="py-4 px-4 font-semibold text-slate-700 dark:text-slate-200 w-[14%]">Actions</th>
          </tr>
        </thead>
        <tbody>
          {loading && (
            <tr>
              <td className="py-4 px-3 text-sm text-muted-foreground" colSpan={6}>Loading modules...</td>
            </tr>
          )}
          {!loading && modules.length === 0 && (
            <tr>
              <td className="py-4 px-3 text-sm text-muted-foreground" colSpan={6}>No modules configured yet.</td>
            </tr>
          )}
          {!loading && modules.map((m) => (
            <tr key={m.id} className={`
              border-b border-slate-100 dark:border-slate-700 
              hover:bg-slate-50/50 dark:hover:bg-slate-800/50 
              transition-colors duration-200
              ${!m.isActive ? 'opacity-75' : ''}
            `}>
              <td className="py-4 px-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-sm">
                    <Mail className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-semibold text-slate-700 dark:text-slate-200">{m.name}</span>
                    {m.description ? (
                      <span className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">{m.description}</span>
                    ) : null}
                  </div>
                </div>
              </td>
              <td className="py-4 px-4 align-top">
                {editingId === m.id ? (
                  <Input
                    value={rowFromName}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRowFromName(e.target.value)}
                    placeholder="Display name"
                    className="h-9"
                  />
                ) : (
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-300">{m.fromName || '-'}</span>
                )}
              </td>
              <td className="py-4 px-4 align-top">
                {editingId === m.id ? (
                  <Input
                    type="email"
                    value={rowFromEmail}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRowFromEmail(e.target.value)}
                    placeholder="sender@example.com"
                    className="h-9"
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 bg-slate-100 dark:bg-slate-700 rounded flex items-center justify-center">
                      <Mail className="h-3 w-3 text-slate-500 dark:text-slate-400" />
                    </div>
                    <span className="text-sm font-mono text-slate-600 dark:text-slate-300">{m.fromEmail || '-'}</span>
                  </div>
                )}
              </td>
              <td className="py-4 px-4">
                <div className="flex items-center justify-start">
                  <StatusToggleButton
                    isActive={m.isActive}
                    onToggle={() => onToggle(m.id)}
                    size="sm"
                  />
                </div>
              </td>
              <td className="py-4 px-4">
                <div className="flex items-center gap-2">
                  {/* Test Email - first */}
                  <button
                    onClick={() => setTestDialog({ open: true, moduleId: m.id })}
                    disabled={!m.isActive}
                    className={`h-9 w-9 rounded-xl border border-gray-200 bg-white ${!m.isActive ? 'opacity-40 cursor-not-allowed' : 'hover:bg-blue-50'} flex items-center justify-center`}
                    aria-label="Send test email"
                  >
                    <Mail className="h-4 w-4 text-blue-500" />
                  </button>
                  {/* Edit - second */}
                  {editingId === m.id ? (
                    <>
                      <Button size="sm" onClick={saveEdit} disabled={saving} className="bg-gradient-primary text-primary-foreground hover:opacity-90">
                        <Check className="h-4 w-4 mr-1" /> Save
                      </Button>
                      <Button size="sm" variant="outline" onClick={cancelEdit} disabled={saving}>
                        <X className="h-4 w-4 mr-1" /> Cancel
                      </Button>
                    </>
                  ) : (
                    <button
                      onClick={() => onEdit(m)}
                      disabled={!m.isActive}
                      className={`h-9 w-9 rounded-xl border border-gray-200 bg-white ${!m.isActive ? 'opacity-40 cursor-not-allowed' : 'hover:bg-blue-50'} flex items-center justify-center`}
                      aria-label="Edit module"
                    >
                      <Edit2 className="h-4 w-4 text-blue-500" />
                    </button>
                  )}
                  {/* Delete - third with confirm */}
                  <button
                    onClick={() => setDeleteDialog({ open: true, moduleId: m.id, moduleName: m.name })}
                    className="h-9 w-9 rounded-xl border border-gray-200 bg-white hover:bg-blue-50 flex items-center justify-center"
                    aria-label="Delete module"
                  >
                    <Trash2 className="h-4 w-4 text-blue-500" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    {/* Test Email Modal */}
    <Modal isOpen={testDialog.open} onClose={() => setTestDialog({ open: false, moduleId: null })} className="w-full max-w-[95vw] sm:max-w-[420px]">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Mail className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Send Test Email</h2>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Recipient Email</label>
          <Input
            type="email"
            placeholder="test@example.com"
            value={testEmailInput}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTestEmailInput(e.target.value)}
            className="h-9"
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => setTestDialog({ open: false, moduleId: null })}>Cancel</Button>
          <Button onClick={submitTestFromDialog} disabled={!testEmailInput} className="bg-gradient-primary text-primary-foreground hover:opacity-90">Send</Button>
        </div>
      </div>
    </Modal>
    {/* Delete Confirmation Modal */}
    <Modal isOpen={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, moduleId: null, moduleName: "" })} className="w-full max-w-[95vw] sm:max-w-[420px]">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Trash2 className="h-5 w-5 text-red-500" />
          <h2 className="text-lg font-semibold">Delete Module</h2>
        </div>
        <p className="text-sm text-muted-foreground">Are you sure you want to delete <span className="font-semibold text-foreground">{deleteDialog.moduleName}</span>? This action cannot be undone.</p>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => setDeleteDialog({ open: false, moduleId: null, moduleName: "" })}>Cancel</Button>
          <Button onClick={async () => {
            if (!deleteDialog.moduleId) return;
            await onDelete(deleteDialog.moduleId);
            setDeleteDialog({ open: false, moduleId: null, moduleName: "" });
          }} className="bg-red-500 text-white hover:opacity-90">Delete</Button>
        </div>
      </div>
    </Modal>
    </>
  );
}

// SMTP Configuration Component
function SMTPConfiguration({ 
  onConfigUpdate 
}: {
  onConfigUpdate: (config: SMTPConfig) => void;
}) {
  const [config, setConfig] = useState<SMTPConfig>({
    smtp_host: process.env.NEXT_PUBLIC_DEFAULT_SMTP_HOST || "",
    smtp_port: Number(process.env.NEXT_PUBLIC_DEFAULT_SMTP_PORT || 587),
    smtp_user: "",
    smtp_password: "",
    from_email: "",
    security: "tls"
  });
  
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [portInput, setPortInput] = useState<string>("587");
  const [hostInput, setHostInput] = useState<string>("email-smtp.<region>.amazonaws.com");
  const [userInput, setUserInput] = useState<string>("");
  const [passInput, setPassInput] = useState<string>("");
  const [fromEmailInput, setFromEmailInput] = useState<string>("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const regexRules = {
    smtpHost: { regex: /^email-smtp\.[a-z0-9-]+\.(amazonaws\.com)$/, min: 10, max: 100 },
    port: { regex: /^(25|465|587)$/, min: 2, max: 3 },
    username: { regex: /^[A-Z0-9]{20}$/, min: 20, max: 20 },
    password: { regex: /^[A-Za-z0-9\/+=]{40,44}$/, min: 40, max: 44 },
    email: { regex: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[A-Za-z]{2,}$/, min: 5, max: 254 },
  } as const;

  const setFieldError = (field: string, message: string) => {
    setErrors(prev => ({ ...prev, [field]: message }));
  };

  const liveValidate = (field: keyof typeof regexRules, value: string) => {
    const rule = regexRules[field];
    if (!rule) return;
    if (value.length < rule.min) {
      setFieldError(field, `Must be at least ${rule.min} characters`);
      return;
    }
    // For port, don't show error while the user is still typing unless it's a full value
    if (field === "port") {
      // '25' is a valid 2-digit port; otherwise wait until 3 digits to validate
      if (value.length < rule.max && value !== "25") {
        setFieldError(field, "");
        return;
      }
    }
    if (!rule.regex.test(value)) {
      setFieldError(field, `Invalid ${field}`);
    } else {
      setFieldError(field, "");
    }
  };

  // Load existing AWS configuration when component mounts
  useEffect(() => {
    const loadAWSConfig = async () => {
      try {
        console.log('Loading AWS config from:', `${API_BASE_URL}/api/v1/aws-email-configuration`);
        const response = await fetch(`${API_BASE_URL}/api/v1/aws-email-configuration`);
        if (response.ok) {
          const awsConfig = await response.json();
          console.log('Loaded AWS config:', awsConfig);
          // Check if we have any configuration data (not just the configured flag)
          if (awsConfig.smtp_host || awsConfig.smtp_user || awsConfig.from_email) {
            setConfig({
              smtp_host: awsConfig.smtp_host || (process.env.NEXT_PUBLIC_DEFAULT_SMTP_HOST || ""),
              smtp_port: awsConfig.smtp_port || Number(process.env.NEXT_PUBLIC_DEFAULT_SMTP_PORT || 587),
              smtp_user: awsConfig.smtp_user || "",
              smtp_password: awsConfig.smtp_password || "", // Load password from backend
              from_email: awsConfig.from_email || "",
              security: "tls"
            });
            setHostInput(String(awsConfig.smtp_host || (process.env.NEXT_PUBLIC_DEFAULT_SMTP_HOST || "")));
            setPortInput(String(awsConfig.smtp_port || Number(process.env.NEXT_PUBLIC_DEFAULT_SMTP_PORT || 587)));
            setUserInput(String(awsConfig.smtp_user || ""));
            setFromEmailInput(awsConfig.from_email || "");
            // Load password from backend
            setPassInput(awsConfig.smtp_password || "");
            setIsConnected(awsConfig.is_active || false);
            // Notify parent component about the configuration
              onConfigUpdate({
              smtp_host: awsConfig.smtp_host || (process.env.NEXT_PUBLIC_DEFAULT_SMTP_HOST || ""),
              smtp_port: awsConfig.smtp_port || Number(process.env.NEXT_PUBLIC_DEFAULT_SMTP_PORT || 587),
                smtp_user: awsConfig.smtp_user || "",
              smtp_password: awsConfig.smtp_password || "",
              from_email: awsConfig.from_email || "",
                security: "tls"
              });
            }
        } else {
          console.log('Failed to load AWS config, status:', response.status);
        }
      } catch (error) {
        console.error('Failed to load AWS configuration:', error);
      }
    };

    loadAWSConfig();
  }, [onConfigUpdate]);

  const handleSave = async () => {
    // Validate all fields before saving
    const host = hostInput.trim();
    const port = portInput.trim();
    const user = userInput.trim().toUpperCase();
    const pass = passInput.trim();
    const email = fromEmailInput.trim();

    const validations: Array<[keyof typeof regexRules, string]> = [
      ["smtpHost", host],
      ["port", port],
      ["username", user],
      // Password can be empty if already configured on server; validate only if provided
      ...(pass ? [["password", pass] as [keyof typeof regexRules, string]] : []),
      ...(email ? [["email", email] as [keyof typeof regexRules, string]] : []),
    ];

    let valid = true;
    validations.forEach(([field, value]) => {
      const rule = regexRules[field];
      if (!rule.regex.test(value)) {
        valid = false;
        setFieldError(field, `Invalid ${field}`);
      } else {
        setFieldError(field, "");
      }
    });

    if (!valid) {
      toast.error("Please correct highlighted fields");
      return;
    }

    const parsedPort = parseInt(port, 10);
    setLoading(true);
    try {
      const payload = {
        smtp_host: host,
        smtp_port: parsedPort,
        smtp_user: user,
        smtp_password: pass, // backend may ignore empty, or reuse previous
        from_email: email || undefined,
        aws_region: "ap-south-1"
      };
      
      console.log('Saving SMTP config with payload:', payload);
      console.log('API_BASE_URL:', API_BASE_URL);
      
      if (!API_BASE_URL) {
        throw new Error('API base URL is not configured');
      }
      
      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch(`${API_BASE_URL}/api/v1/aws-email-configuration`, {
        method: "POST",
        headers: {
          "accept": "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      console.log('Save response status:', response.status);
      
      if (response.ok) {
        const responseData = await response.json().catch(() => ({}));
        console.log('Save response data:', responseData);
        
        setIsConnected(true);
        setConfig(prev => ({ ...prev, smtp_host: host, smtp_port: parsedPort, smtp_user: user, smtp_password: pass, from_email: email }));
        // Sync inputs to saved values so they persist visually
        setHostInput(host);
        setPortInput(String(parsedPort));
        setUserInput(user);
        setFromEmailInput(email);
        onConfigUpdate({ ...config, smtp_host: host, smtp_port: parsedPort, smtp_user: user, smtp_password: pass, from_email: email });
        toast.success("SMTP configuration saved successfully!");
      } else {
        const err = await response.json().catch(() => ({}));
        console.error('Save failed:', err);
        toast.error(err?.message || "Failed to save SMTP configuration");
      }
    } catch (error) {
      console.error('Save error:', error);
      if (error instanceof Error && error.name === 'AbortError') {
        toast.error('Request timeout. Please check your connection and try again.');
      } else {
        toast.error(`Network error: ${error instanceof Error ? error.message : 'Please check your connection.'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async () => {
    setLoading(true);
    try {
      // Test connection by sending a test email
      if (!API_BASE_URL) {
        throw new Error('API base URL is not configured');
      }
      
      const testPayload = {
        to: fromEmailInput || 'test@example.com',
        subject: 'SMTP Configuration Test',
        body: 'This is a test email to verify SMTP configuration.',
        is_html: false,
        module: 'system'
      };
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout for email
      
      const response = await fetch(`${API_BASE_URL}/api/v1/send-email`, {
        method: "POST",
        headers: {
          "accept": "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(testPayload),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
      setIsConnected(true);
      toast.success("SMTP connection test successful");
      } else {
        const err = await response.json().catch(() => ({}));
        toast.error(err?.message || "SMTP connection test failed");
      }
    } catch (error) {
      console.error('Test connection error:', error);
      if (error instanceof Error && error.name === 'AbortError') {
        toast.error('Connection test timeout. Please check your configuration.');
      } else {
        toast.error(`Failed to connect to SMTP server: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-gradient-card border-0 shadow-elegant">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Settings className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <CardTitle className="text-xl">SMTP Configuration</CardTitle>
              <p className="text-muted-foreground text-sm">Configure Amazon SES SMTP server for all email modules</p>
            </div>
          </div>
          <Badge variant={isConnected ? "solid" : "light"} color={isConnected ? "info" : "light"}>
            {isConnected ? (
              <>
                <CheckCircle className="h-3 w-3 mr-1" />
                Connected
              </>
            ) : (
              <>
                <AlertCircle className="h-3 w-3 mr-1" />
                Disconnected
              </>
            )}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Server Configuration */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Server className="h-4 w-4 text-primary" />
            <h3 className="font-semibold">Server Settings</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-1">
                SMTP Host
                <HelpCircle className="h-3 w-3 text-muted-foreground" />
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                  <Server className="h-4 w-4 text-slate-400" />
                </div>
                <Input
                  value={hostInput}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    const val = e.target.value;
                    const rule = regexRules.smtpHost;
                    if (val.length > rule.max) return;
                    setHostInput(val);
                    liveValidate("smtpHost", val);
                  }}
                  placeholder="email-smtp.<region>.amazonaws.com"
                  className="h-10 pl-9"
                />
              </div>
              {errors.smtpHost ? <p className="text-destructive text-red-500 text-xs">{errors.smtpHost}</p> : null}
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-1">
                Port
                <HelpCircle className="h-3 w-3 opacity-0" />
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                  <Shield className="h-4 w-4 text-slate-400" />
                </div>
                <Input
                  type="text"
                  value={portInput}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    const raw = e.target.value.replace(/[^0-9]/g, "");
                    const trimmed = raw.slice(0, regexRules.port.max);
                    setPortInput(trimmed);
                    liveValidate("port", trimmed);
                  }}
                  placeholder="587 for TLS, 465 for SSL"
                  className="h-10 pl-9"
                />
              </div>
              {errors.port ? <p className="text-destructive text-red-500 text-xs">{errors.port}</p> : null}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-1">
              <Shield className="h-3 w-3" />
              Security
            </label>
            <select 
              className="w-full p-2 border border-input rounded-md bg-background text-sm"
              value={config.security}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setConfig({...config, security: e.target.value})}
            >
              <option value="tls">STARTTLS (TLS)</option>
              <option value="ssl">TLS Wrapper (SSL)</option>
            </select>
          </div>
        </div>

        {/* Authentication */}
        <div className="space-y-4">
          <h3 className="font-semibold">Authentication</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Username</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                  <Settings className="h-4 w-4 text-slate-400" />
                </div>
                <Input
                  value={userInput}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    const val = e.target.value.toUpperCase();
                    const rule = regexRules.username;
                    if (val.length > rule.max) return;
                    setUserInput(val);
                    liveValidate("username", val);
                  }}
                  placeholder="SMTP Username (Access Key ID)"
                  className="pl-9"
                />
              </div>
              <p className="text-xs text-slate-500">Exactly 20 uppercase characters (AWS Access Key ID)</p>
              {errors.username ? <p className="text-destructive text-red-500 text-xs">{errors.username}</p> : null}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                  <Shield className="h-4 w-4 text-slate-400" />
                </div>
                <Input
                  type="password"
                  value={passInput}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    const val = e.target.value;
                    const rule = regexRules.password;
                    if (val.length > rule.max) return;
                    setPassInput(val);
                    if (val) liveValidate('password', val);
                  }}
                  placeholder="SMTP Password (Secret Access Key)"
                  className="pl-9"
                />
              </div>
              <p className="text-xs text-slate-500">40–44 chars. Only A–Z, a–z, 0–9, /, +, =</p>
              {errors.password ? <p className="text-destructive text-red-500 text-xs">{errors.password}</p> : null}
            </div>

            <div className="space-y-2 sm:col-span-2">
              <label className="text-sm font-medium">Default From Email</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-slate-400" />
                </div>
                <Input
                  type="email"
                  value={fromEmailInput}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    const val = e.target.value;
                    const rule = regexRules.email;
                    if (val.length > rule.max) return;
                    setFromEmailInput(val);
                    if (val) liveValidate("email", val);
                  }}
                  placeholder="verified@yourdomain.com"
                  className="pl-9"
                />
              </div>
              <p className="text-xs text-slate-500">Must be a verified sender in your SES account</p>
              {errors.email ? <p className="text-destructive text-red-500 text-xs">{errors.email}</p> : null}
            </div>
          </div>
        </div>

        {/* Sticky Action Bar */}
        <div className="sticky bottom-0 left-0 right-0 bg-white/80 dark:bg-slate-800/80 backdrop-blur border-t rounded-b-xl flex flex-col sm:flex-row gap-3 p-3 mt-4">
          <Button 
            onClick={handleSave}
            disabled={loading}
            className="bg-gradient-primary text-primary-foreground hover:opacity-90 w-full sm:w-auto"
          >
            {loading ? "Saving..." : "Save Configuration"}
          </Button>
          <Button 
            variant="outline" 
            onClick={testConnection}
            disabled={loading}
            className="w-full sm:w-auto"
          >
            {loading ? "Testing..." : "Test Connection"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Email Analytics Component
function EmailAnalytics({ 
  stats 
}: {
  stats: {
    totalModules: number;
    activeModules: number;
    inactiveModules: number;
    configuredSenders: number;
    activeRate: number;
  };
}) {
  return (
    <Card className="bg-gradient-card border-0 shadow-elegant">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Activity className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-xl">Email Analytics</CardTitle>
            <p className="text-muted-foreground text-sm">Overview based on your module configurations</p>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Total Modules</span>
            </div>
            <div className="text-2xl font-bold">{stats.totalModules}</div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-success" />
              <span className="text-sm font-medium">Active</span>
            </div>
            <div className="text-2xl font-bold text-success">{stats.activeModules}</div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <span className="text-sm font-medium">Inactive</span>
            </div>
            <div className="text-2xl font-bold text-destructive">{stats.inactiveModules}</div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-warning" />
              <span className="text-sm font-medium">Configured Senders</span>
            </div>
            <div className="text-2xl font-bold text-warning">{stats.configuredSenders}</div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-success" />
              <span className="text-sm font-medium">Active Rate</span>
            </div>
            <Badge variant="light" color="success">
              {stats.activeRate}%
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Add Module Dialog Component
function AddModuleDialog({ 
  onAddModule 
}: {
  onAddModule: (module: {
    name: string;
    fromEmail: string;
    fromName: string;
    description: string;
  }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    fromEmail: "",
    fromName: "",
    description: ""
  });

  const handleSubmit = () => {
    if (!formData.name || !formData.fromEmail || !formData.fromName) {
      return;
    }
    
    onAddModule(formData);
    setFormData({
      name: "",
      fromEmail: "",
      fromName: "",
      description: ""
    });
    setOpen(false);
  };

  return (
    <>
      <Button 
        onClick={() => setOpen(true)}
        size="sm"
        className="bg-gradient-primary text-primary-foreground hover:opacity-90 w-full sm:w-auto"
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Module
      </Button>
      
      <Modal isOpen={open} onClose={() => setOpen(false)} className="w-full max-w-[95vw] sm:max-w-[500px]">
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Mail className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Add New Email Module</h2>
          </div>
        
        <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Module Name</label>
              <ModuleSelect
                value={formData.name}
                onChange={(next: string) => setFormData({ ...formData, name: next })}
              />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <TextArea
              placeholder="Brief description of what this module handles"
              value={formData.description}
              onChange={(value: string) => setFormData({...formData, description: value})}
              className="h-20"
            />
          </div>


          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">From Name</label>
              <Input
                placeholder="e.g., Company Support"
                value={formData.fromName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, fromName: e.target.value})}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">From Email</label>
              <Input
                type="email"
                placeholder="support@company.com"
                value={formData.fromEmail}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, fromEmail: e.target.value})}
              />
            </div>
          </div>
        </div>

          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
            <Button 
              variant="outline" 
              onClick={() => setOpen(false)}
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 w-full sm:w-auto order-2 sm:order-1"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={!formData.name || !formData.fromEmail || !formData.fromName}
              className="bg-gradient-primary text-primary-foreground hover:opacity-90 px-4 py-2 rounded-md w-full sm:w-auto order-1 sm:order-2"
            >
              Add Module
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

// Edit Module Dialog Component
function EditModuleDialog({ 
  editingModule,
  onEditModule,
  onClose
}: {
  editingModule: EmailModule | null;
  onEditModule: (module: {
    id: string;
    name: string;
    fromEmail: string;
    fromName: string;
    description: string;
  }) => void;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState({
    name: "",
    fromEmail: "",
    fromName: "",
    description: ""
  });

  // Update form data when editing module changes
  useEffect(() => {
    if (editingModule) {
      setFormData({
        name: editingModule.name,
        fromEmail: editingModule.fromEmail,
        fromName: editingModule.fromName,
        description: editingModule.description
      });
    }
  }, [editingModule]);

  const handleSubmit = () => {
    if (!formData.name || !formData.fromEmail || !formData.fromName) {
      return;
    }
    
    if (editingModule) {
      onEditModule({
        id: editingModule.id,
        ...formData
      });
    }
    
    setFormData({
      name: "",
      fromEmail: "",
      fromName: "",
      description: ""
    });
    onClose();
  };

  if (!editingModule) return null;

  return (
    <Modal isOpen={true} onClose={onClose} className="w-full max-w-[95vw] sm:max-w-[500px]">
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Mail className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Edit Email Module</h2>
        </div>
      
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Module Name</label>
            <ModuleSelect
              value={formData.name}
              onChange={(next: string) => setFormData({ ...formData, name: next })}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <TextArea
              placeholder="Brief description of what this module handles"
              value={formData.description}
              onChange={(value: string) => setFormData({...formData, description: value})}
              className="h-20"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">From Name</label>
              <Input
                placeholder="e.g., Company Support"
                value={formData.fromName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, fromName: e.target.value})}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">From Email</label>
              <Input
                placeholder="support@company.com"
                value={formData.fromEmail}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, fromEmail: e.target.value})}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
          <Button 
            variant="outline" 
            onClick={onClose}
            className="w-full sm:w-auto order-2 sm:order-1"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={!formData.name || !formData.fromEmail || !formData.fromName}
            className="bg-gradient-primary text-primary-foreground hover:opacity-90 px-4 py-2 rounded-md w-full sm:w-auto order-1 sm:order-2"
          >
            Update Module
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// Main Email Management Component
export default function EmailManagement() {
  const [modules, setModules] = useState<EmailModule[]>([]);
  const [loadingModules, setLoadingModules] = useState(true);
  const [editingModule, setEditingModule] = useState<EmailModule | null>(null);

  // No hardcoded templates; rely solely on backend

  // Load existing AWS configuration when component mounts
  useEffect(() => {
    const loadAWSConfig = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/v1/aws-email-configuration`);
        if (response.ok) {
          // AWS configuration loaded successfully
          // Configuration status is handled by the SMTP configuration component
        }
      } catch (error) {
        console.error('Failed to load AWS configuration:', error);
      }
    };

    loadAWSConfig();
  }, []);

  // Load module configurations dynamically
  useEffect(() => {
    const toTitle = (id: string) => id.replace(/[_-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    const loadModuleConfigs = async () => {
      setLoadingModules(true);
      try {
        const response = await fetch(`${API_BASE_URL}/api/v1/email-configurations`);
        if (response.ok) {
          const data = await response.json();
          const backendModules: EmailModule[] = (data?.configurations || []).map((cfg: BackendModuleConfig) => ({
            id: cfg.module,
            name: cfg.name || toTitle(cfg.module),
            fromEmail: cfg.from_email ?? '',
            fromName: cfg.from_name ?? '',
            description: cfg.description ?? '',
            isActive: cfg.is_active !== undefined ? cfg.is_active : true,
          }));
          setModules(backendModules);
        } else {
          setModules([]);
        }
      } catch (error) {
        console.error('Failed to load module configurations:', error);
        setModules([]);
      } finally {
        setLoadingModules(false);
      }
    };

    loadModuleConfigs();
  }, []);

  // Derived analytics from current modules
  const analytics = {
    totalModules: modules.length,
    activeModules: modules.filter(m => m.isActive).length,
    inactiveModules: modules.filter(m => !m.isActive).length,
    configuredSenders: modules.filter(m => (m.fromEmail?.trim() || "") !== "" && (m.fromName?.trim() || "") !== "").length,
    activeRate: modules.length ? Math.round((modules.filter(m => m.isActive).length / modules.length) * 100) : 0,
  };

  const handleModuleUpdate = async (moduleId: string, fromEmail: string, fromName: string) => {
    try {
      const existing = modules.find(m => m.id === moduleId);
      const putPayload: Record<string, unknown> = {
        module: moduleId,
        from_email: fromEmail,
        from_name: fromName,
      };
      if (existing?.description) putPayload.description = existing.description;
      if (typeof existing?.isActive === 'boolean') putPayload.is_active = existing.isActive;

      const putRes = await fetch(`${API_BASE_URL}/api/v1/email-configurations/${moduleId}`, {
        method: "PUT",
        headers: {
          "accept": "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(putPayload),
      });

      if (putRes.ok) {
        setModules(prev => prev.map(module => 
          module.id === moduleId 
            ? { ...module, fromEmail, fromName }
            : module
        ));
        
        toast.success(`${modules.find(m => m.id === moduleId)?.name} email configuration updated successfully`);
      } else if (putRes.status === 404) {
        const createPayload: Record<string, unknown> = {
          module: moduleId,
          from_email: fromEmail,
          from_name: fromName,
        };
        if (existing?.description) createPayload.description = existing.description;

        const postRes = await fetch(`${API_BASE_URL}/api/v1/email-configurations`, {
          method: "POST",
          headers: {
            "accept": "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(createPayload),
        });
        if (!postRes.ok) {
          const reason = await postRes.text().catch(() => "");
          throw new Error(`Failed to create module configuration (${postRes.status}). ${reason}`);
        }
        setModules(prev => prev.map(module => 
          module.id === moduleId 
            ? { ...module, fromEmail, fromName, isActive: true }
            : module
        ));
        toast.success(`${modules.find(m => m.id === moduleId)?.name} email configuration created successfully`);
      } else {
        const errText = await putRes.text().catch(() => "");
        throw new Error(errText || "Failed to update module configuration");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update module configuration");
      throw error;
    } finally {
    }
  };

  const handleModuleToggle = async (moduleId: string) => {
    const found = modules.find(m => m.id === moduleId);
    if (!found) return;
    const nextActive = !found.isActive;
    // Optimistic update
    setModules(prev => prev.map(m => m.id === moduleId ? { ...m, isActive: nextActive } : m));
    try {
      const payload: Record<string, unknown> = {
        module: moduleId,
        from_email: found.fromEmail,
        from_name: found.fromName,
        is_active: nextActive,
      };
      if (found.description) payload.description = found.description;
      const res = await fetch(`${API_BASE_URL}/api/v1/email-configurations/${moduleId}`, {
        method: 'PUT',
        headers: { 'accept': 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        throw new Error(`Failed to update module state (${res.status})`);
      }
    } catch (e) {
      // Revert on failure
      setModules(prev => prev.map(m => m.id === moduleId ? { ...m, isActive: !nextActive } : m));
      console.error('Failed to update module status', e);
      toast.error('Failed to update module status');
    }
  };

  const handleTestEmail = async (moduleId: string, testEmail: string) => {
    try {
      const foundModule = modules.find(m => m.id === moduleId);
      if (!foundModule) throw new Error("Module not found");

      const url = `${API_BASE_URL}/api/v1/send-email`;
      console.log('Sending test email to URL:', url);
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "accept": "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          module: moduleId,
          to: testEmail,
          subject: `Test Email from ${foundModule.name}`,
          body: `This is a test email from the ${foundModule.name} module using the configured email settings.`,
          is_html: false,
        }),
      });

      if (response.ok) {
        toast.success(`Test email sent successfully from ${foundModule.name} to ${testEmail}`);
      } else {
        const err = await response.json().catch(() => ({}));
        const errorMsg = err?.detail || err?.message || `Failed to send test email (Status: ${response.status})`;
        throw new Error(errorMsg);
      }
    } catch (error) {
      console.error('Test email error:', error);
      const errorMsg = error instanceof Error ? error.message : "Failed to send test email";
      
      // Provide more specific guidance based on the error
      if (errorMsg.includes('SMTP credentials not configured')) {
        if (errorMsg.includes('AWS SES configuration exists but may not be properly applied')) {
          toast.error(`${errorMsg} Try saving the module configuration again or re-save the AWS SES settings.`);
        } else {
          toast.error(`${errorMsg} Please configure AWS SES settings in the SMTP Configuration section first.`);
        }
      } else {
        toast.error(errorMsg);
      }
      
      throw error;
    } finally {
    }
  };



  const handleAddModule = async (moduleData: {
    name: string;
    fromEmail: string;
    fromName: string;
    description: string;
  }) => {
    const id = moduleData.name.toLowerCase().replace(/\s+/g, '_');
    const res = await fetch(`${API_BASE_URL}/api/v1/email-configurations`, {
      method: "POST",
      headers: { "Content-Type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        module: id,
        from_email: moduleData.fromEmail,
        from_name: moduleData.fromName,
        description: moduleData.description,
        is_active: true,
      }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(body?.message || "Failed to create module");
      return;
    }
    setModules(prev => [...prev, { ...moduleData, id, isActive: true }]);
    toast.success(`${moduleData.name} module added successfully`);
  };

  const handleEditModule = async (moduleData: {
    id: string;
    name: string;
    fromEmail: string;
    fromName: string;
    description: string;
  }) => {
    console.log('[DEBUG] Updating module:', moduleData);
    const res = await fetch(`${API_BASE_URL}/api/v1/email-configurations/${moduleData.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        module: moduleData.id,  // Include module field in request body
        name: moduleData.name,  // Include name field for module display name
        from_email: moduleData.fromEmail,
        from_name: moduleData.fromName,
        description: moduleData.description,
        is_active: true,
      }),
    });
    const body = await res.json().catch(() => ({}));
    console.log('[DEBUG] Update response:', res.status, body);
    if (!res.ok) {
      console.error('[DEBUG] Update failed:', body);
      toast.error(body?.message || "Failed to update module");
      return;
    }
    setModules(prev => prev.map(m => m.id === moduleData.id ? { ...m, ...moduleData } : m));
    setEditingModule(null);
    toast.success(`${moduleData.name} module updated successfully`);
  };

  const handleSMTPConfigUpdate = () => {
    // SMTP configuration updated - this is handled by the SMTP component itself
  };

  // Removed unused refreshStats function

  const refreshModuleConfigs = async () => {
    setLoadingModules(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/email-configurations`);
      if (!response.ok) throw new Error('Failed');
      const data = await response.json();
      const toTitle = (id: string) => id.replace(/[_-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      const backendModules: EmailModule[] = (data?.configurations || []).map((cfg: BackendModuleConfig) => ({
        id: cfg.module,
        name: cfg.name || toTitle(cfg.module),
        fromEmail: cfg.from_email ?? '',
        fromName: cfg.from_name ?? '',
        description: cfg.description ?? '',
        isActive: cfg.is_active !== undefined ? cfg.is_active : true,
      }));
      setModules(backendModules);
      toast.success("Module configurations refreshed successfully");
    } catch {
      toast.error("Failed to refresh module configurations");
    } finally {
      setLoadingModules(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 p-3 sm:p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6 md:space-y-8">
        {/* Professional Header */}
        <DashboardHeader
          variant="default"
          size="lg"
          title="Email Management"
          subtitle="Streamline your transactional and marketing emails with centralized AWS SES SMTP configuration. Manage module-wise senders and test delivery in one place."
          breadcrumbs={[
            { label: 'Home', href: '/' },
            { label: 'Email Settings', href: '/Email-Setting' }
          ]}
          icon={() => (
            <Mail className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
          )}
        />

        {/* Stats and SMTP Config */}
        <div className="grid grid-cols-1 gap-4 sm:gap-6">
          <SMTPConfiguration onConfigUpdate={handleSMTPConfigUpdate} />
        </div>

        {/* Module Configuration */}
        <Card className="bg-gradient-card border-0 shadow-elegant overflow-hidden">
          <CardHeader>
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Settings className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-xl">Module Email Configuration</CardTitle>
                  <p className="text-muted-foreground text-sm">
                    Configure sender information for each email module
                  </p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <Badge variant="light" color="primary">
                  {modules.filter(m => m.isActive).length} Active
                </Badge>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  {/* Unified single refresh action */}
                  <Button variant="outline" size="sm" onClick={refreshModuleConfigs} className="flex items-center gap-2 flex-shrink-0">
                    <RefreshCw className="h-4 w-4" />
                    <span className="hidden sm:inline text-sm">Refresh Modules</span>
                  </Button>
                  <div className="flex-1 sm:flex-none">
                    <AddModuleDialog onAddModule={handleAddModule} />
                  </div>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <ModuleTable
              modules={modules}
              loading={loadingModules}
              onUpdate={handleModuleUpdate}
              onToggle={handleModuleToggle}
              onTestEmail={handleTestEmail}
              onEdit={setEditingModule}
              onDelete={async (moduleId: string) => {
                try {
                  const res = await fetch(`${API_BASE_URL}/api/v1/email-configurations/${moduleId}`, { method: 'DELETE', headers: { accept: 'application/json' } });
                  if (!res.ok) throw new Error('Failed');
                  setModules(prev => prev.filter(m => m.id !== moduleId));
                  toast.success('Module deleted');
                } catch {
                  toast.error('Failed to delete module');
                }
              }}
            />
          </CardContent>
        </Card>

        {/* Email Analytics moved to bottom */}
        <EmailAnalytics stats={analytics} />
              </div>
              
      {/* Edit Module Dialog */}
      <EditModuleDialog 
        editingModule={editingModule}
        onEditModule={handleEditModule}
        onClose={() => setEditingModule(null)}
      />

      {/* Toast Notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#10B981',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            fontSize: '14px',
            fontWeight: '500',
            padding: '12px 16px',
          },
          success: {
            style: {
              background: '#10B981',
              color: '#fff',
            },
            iconTheme: {
              primary: '#fff',
              secondary: '#10B981',
            },
          },
          error: {
            style: {
              background: '#EF4444',
              color: '#fff',
            },
            iconTheme: {
              primary: '#fff',
              secondary: '#EF4444',
            },
          },
        }}
      />
    </div>
  );
}
