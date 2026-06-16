
"use client";
import { useState, useRef, useEffect } from "react";
import { CheckCircle, Save, MessageSquare, Eye, EyeOff, Info, MessageCircle } from "lucide-react";
import { FaUser, FaUsers } from "react-icons/fa";
import Alert from "@/components/ui/alert/Alert";
import Button from "@/components/ui/button/Button";
import Label from "@/components/form/Label";
import TelegramFeedbackModule from "./feedback/feedback";
import GreetingManagerPage from "./greeting-manager/page";
import JobFormManager from "./job-form/page";
import LeadFormManager from "./lead-form/page";
import CustomerTicketFormManager from "./ticket-form/customer/page";
import EmployeeTicketFormManager from "./ticket-form/employee/page";
import DashboardHeader from "@/components/header/DashboardHeader";

const BASE_API_URL = "https://telegram-aiagent.mobiloitte.io";
const API_PREFIX = `${BASE_API_URL}/api/telegram`;

type AlertInfo = {
  show: boolean;
  variant: 'success' | 'error';
  title: string;
  message: string;
};

type TabType = 'setup' | 'feedback' | 'greeting' | 'job-form' | 'lead-form' | 'customer-ticket' | 'employee-ticket';

export default function TelegramIntegrationPage() {
  const [activeTab, setActiveTab] = useState<TabType>('setup');
  const [credentials, setCredentials] = useState({
    botToken: "",
  });
  const [loading, setLoading] = useState(false);
  const [alertInfo, setAlertInfo] = useState<AlertInfo | null>(null);
  const [isCredentialsEditable, setIsCredentialsEditable] = useState(true);
  const firstInputRef = useRef<HTMLInputElement>(null);
  const [showBotToken, setShowBotToken] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  // Set client-side flag
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Fetch user ID and load credentials from API
  useEffect(() => {
    // Only run on client side
    if (!isClient || typeof window === 'undefined') return;

    const fetchCredentials = async () => {
      try {
        // Get user ID from AuthService with better error handling
        let currentUserId: string | null = null;
        try {
          const AuthService = (await import('@/services/AuthService')).default;
          const authState = AuthService.getInstance().getState();
          const user = authState?.user;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          currentUserId = (user as any)?.user_id || (user as any)?._id || (user as any)?.id || null;
          console.log("User object:", user);
          console.log("Extracted user_id:", currentUserId);
        } catch (authError) {
          console.warn("Could not get user from AuthService:", authError);
          // Continue without user ID - user can still use the form
        }
        
        if (currentUserId) {
          setUserId(currentUserId);
          
          // Try to fetch existing configuration
          try {
            const response = await fetch(`${API_PREFIX}/config/${currentUserId}`, {
              method: 'GET',
              headers: {
                'accept': 'application/json'
              }
            });

            if (response.ok) {
              const result = await response.json();
              if (result.success && result.data) {
                setCredentials({
                  botToken: result.data.bot_token || "",
                });
                setLastUpdatedAt(result.data.updated_at || null);
                setIsCredentialsEditable(false);
              }
            } else if (response.status === 404) {
              // No existing config found, that's okay
              console.log("No existing configuration found");
            }
          } catch (fetchError) {
            // API might not be available, continue with empty form
            console.warn("Could not fetch existing configuration:", fetchError);
          }
        }
      } catch (error) {
        console.error("Error in fetchCredentials:", error);
        // Don't block rendering if there's an error
      }
    };

    fetchCredentials();
  }, [isClient]);

  // Save credentials to localStorage on every change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem("telegramCredentials", JSON.stringify(credentials));
      } catch (error) {
        console.warn("Could not save to localStorage:", error);
      }
    }
  }, [credentials]);

  // Load audit trail metadata
  useEffect(() => {
    try {
      const meta = localStorage.getItem("telegramCredentialsMeta");
      if (meta) {
        const parsed = JSON.parse(meta);
        setLastUpdatedAt(parsed.lastUpdatedAt || null);
      }
    } catch {/* ignore */}
  }, []);

  useEffect(() => {
    if (isCredentialsEditable && firstInputRef.current) {
      firstInputRef.current.focus();
    }
  }, [isCredentialsEditable]);

  const handleCredentialChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCredentials({ ...credentials, [name]: value });
  };


  const handleSave = async () => {
    setLoading(true);
    setAlertInfo(null);

    if (!userId) {
      setAlertInfo({
        show: true,
        variant: 'error',
        title: 'Error',
        message: 'User ID not found. Please login again.'
      });
      setLoading(false);
      setTimeout(() => setAlertInfo(null), 4000);
      return;
    }

    const configData = {
      user_id: userId,
      bot_token: credentials.botToken,
      bot_username: "", // Send empty string as backend may require this field
    };

    // Validation: check for empty fields
    if (!credentials.botToken) {
      setAlertInfo({
        show: true,
        variant: 'error',
        title: 'Validation Error',
        message: 'Please fill in all required fields.'
      });
      setLoading(false);
      setTimeout(() => setAlertInfo(null), 4000);
      return;
    }

    console.log("Sending configData:", configData);

    try {
      // Check if updating existing config
      const isUpdate = lastUpdatedAt !== null;
      const url = isUpdate
        ? `${API_PREFIX}/config/${userId}`
        : `${API_PREFIX}/config`;

      const method = isUpdate ? "PUT" : "POST";
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "accept": "application/json"
        },
        body: JSON.stringify(configData),
      });

      const result = await response.json();
      console.log("API Response:", { status: response.status, result });
      
      if (response.ok && result.success) {
        setAlertInfo({
          show: true,
          variant: 'success',
          title: 'Success!',
          message: result.message || "Configuration saved successfully."
        });
        
        if (result.data) {
          setLastUpdatedAt(result.data.updated_at || null);
        }
        setIsCredentialsEditable(false);

        // Update audit trail
        try {
          const { user } = (await import('@/services/AuthService')).default.getInstance().getState();
          const by = user?.full_name || user?.email || 'Unknown user';
          localStorage.setItem("telegramCredentialsMeta", JSON.stringify({ lastUpdatedBy: by, lastUpdatedAt: result.data?.updated_at }));
        } catch {/* ignore */}
      } else {
        const errorDetail = result.detail || result.message || "Failed to save configuration.";
        console.error("API Error:", errorDetail);
        throw new Error(errorDetail);
      }
    } catch (error: unknown) {
      console.error("Save error:", error);
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
  const isFormValid = credentials.botToken;

  return (
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
          title="Telegram Integration"
          subtitle="Integrate your Telegram bot with the platform to enable seamless communication and automation"
          breadcrumbs={[
            { label: 'Home', href: '/' },
            { label: 'Telegram Integration', href: '/telegram-integration' }
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
                  <span>Configure Bot Token from BotFather for Telegram Bot API</span>
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
              aria-label="Telegram Integration Tabs"
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
                  onClick={() => setActiveTab(tab.key as TabType)}
                  onKeyDown={e => {
                    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                      e.preventDefault();
                      const tabs = ["setup", "feedback", "greeting", "job-form", "lead-form", "customer-ticket", "employee-ticket"];
                      const currentIdx = tabs.indexOf(activeTab);
                      const nextIdx =
                        e.key === "ArrowRight"
                          ? (currentIdx + 1) % tabs.length
                          : (currentIdx - 1 + tabs.length) % tabs.length;
                      setActiveTab(tabs[nextIdx] as TabType);
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

        {activeTab === "setup" && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200/60 dark:border-gray-700/60 p-8 mb-8">
            {/* Credentials Section */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Credentials</h2>
              </div>
              {!isCredentialsEditable && (
                <Button
                  onClick={() => setIsCredentialsEditable(true)}
                  variant="outline"
                  className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-700 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit
                </Button>
              )}
            </div>

            <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
              {/* Form Fields */}
              <div className="grid grid-cols-1 gap-6">
                {/* Bot Token */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-gray-700 dark:text-gray-300 font-medium">
                    Bot Token
                    <span className="text-red-500">*</span>
                    <button type="button" className="text-blue-500 hover:text-blue-600">
                      <Info className="w-4 h-4" />
                    </button>
                  </Label>
                  <div className="relative">
                    <input
                      id="botToken"
                      name="botToken"
                      type={showBotToken ? "text" : "password"}
                      placeholder="Enter Bot Token"
                      value={credentials.botToken}
                      onChange={handleCredentialChange}
                      disabled={!isCredentialsEditable}
                      ref={firstInputRef}
                      className="w-full pr-10 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed"
                    />
                    <button
                      type="button"
                      onClick={() => setShowBotToken(!showBotToken)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                    >
                      {showBotToken ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Alert Message */}
              {alertInfo && alertInfo.show && (
                <Alert
                  variant={alertInfo.variant}
                  title={alertInfo.title}
                  message={alertInfo.message}
                />
              )}

              {/* Save & Connect Button */}
              <div className="mt-6">
                <Button
                  onClick={handleSave}
                  disabled={loading || !isFormValid || !isCredentialsEditable}
                  className="px-8 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  startIcon={loading ? undefined : <Save className="w-5 h-5" />}
                >
                  {loading ? 'Saving...' : 'Save & Connect'}
                </Button>
              </div>
            </form>
          </div>
        )}

        {activeTab === "setup" && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200/60 dark:border-gray-700/60 p-8 mb-8">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <MessageSquare className="text-white w-5 h-5" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Webhook Setup</h2>
            </div>

            <div className="space-y-6">
              <div>
                <Label htmlFor="webhookUrl" className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 block">Webhook URL</Label>
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <input
                      id="webhookUrl"
                      defaultValue={`${BASE_API_URL}/webhook`}
                      disabled={true}
                      className="w-full bg-gray-50 dark:bg-gray-700 cursor-not-allowed text-sm font-mono font-medium break-all border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5"
                    />
                  </div>
                  <Button
                    variant="outline"
                    className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 flex-shrink-0"
                    startIcon={<Info className="w-4 h-4" />}
                  >
                    Copy
                  </Button>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-3 leading-relaxed">
                  Configure this webhook URL in your Telegram Bot settings for real-time message handling.
                </p>
              </div>

              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Info className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Integration Guide</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      Follow the official Telegram Bot documentation to complete your Telegram Bot integration.
                    </p>
                    <a
                      href="https://core.telegram.org/bots/webhooks"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium text-sm transition-colors duration-200"
                    >
                      View Telegram Integration Guide
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

        {activeTab === "feedback" && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200/60 dark:border-gray-700/60 p-8 mb-8">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
                <MessageCircle className="text-white w-5 h-5" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Feedback Management</h2>
            </div>
            <TelegramFeedbackModule />
          </div>
        )}

        {activeTab === "greeting" && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200/60 dark:border-gray-700/60 p-8 mb-8">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg">
                <MessageCircle className="text-white w-5 h-5" />
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
                <MessageCircle className="text-white w-5 h-5" />
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
                <MessageCircle className="text-white w-5 h-5" />
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
                <MessageCircle className="text-white w-5 h-5" />
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
                <MessageCircle className="text-white w-5 h-5" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Employee Ticket Form Manager</h2>
            </div>
            <EmployeeTicketFormManager />
          </div>
        )}

      </div>
    </div>
  );
}