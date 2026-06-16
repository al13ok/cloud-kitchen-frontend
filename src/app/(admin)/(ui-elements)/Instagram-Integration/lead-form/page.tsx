"use client";
import React, { useState, useEffect } from "react";
import { CheckCircle, Save, RefreshCw, MessageSquare, FileText, Mail, Phone, Briefcase, User, AlertCircle } from "lucide-react";
import Alert from "@/components/ui/alert/Alert";
import Button from "@/components/ui/button/Button";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";

// Instagram API endpoints - Update base URL as needed
const BASE_API_URL = (process.env.NEXT_PUBLIC_INSTAGRAM_BOT_API_URL || process.env.NEXT_PUBLIC_API_URL || "https://instabot-aiagent.mobiloitte.io").replace(/\/+$/, "");
const LEAD_MESSAGES_API = `${BASE_API_URL}/lead/messages`;
const LEAD_PROMPTS_API = `${BASE_API_URL}/lead/prompts`;
const LEAD_ALL_API = `${BASE_API_URL}/admin/lead/all`;

type AlertInfo = {
  show: boolean;
  variant: 'success' | 'error';
  title: string;
  message: string;
};

type LeadMessages = {
  message_line_1: string;
  message_line_2: string;
  message_line_3: string;
  _id?: string;
  type?: string;
  created_at?: string;
  updated_at?: string;
};

type LeadPrompts = {
  prompt_name: string;
  prompt_name_success: string;
  prompt_email: string;
  prompt_phone: string;
  prompt_interest: string;
  error_invalid_name: string;
  error_invalid_email: string;
  error_invalid_phone: string;
  error_invalid_interest: string;
  summary_title: string;
  summary_intro: string;
  summary_confirm: string;
  confirmation_prompt: string;
  restart_message: string;
  _id?: string;
  type?: string;
  created_at?: string;
  updated_at?: string;
};

export default function LeadFormManager(): React.JSX.Element {
  const [messages, setMessages] = useState<LeadMessages>({
    message_line_1: "",
    message_line_2: "",
    message_line_3: ""
  });
  const [prompts, setPrompts] = useState<LeadPrompts>({
    prompt_name: "",
    prompt_name_success: "",
    prompt_email: "",
    prompt_phone: "",
    prompt_interest: "",
    error_invalid_name: "",
    error_invalid_email: "",
    error_invalid_phone: "",
    error_invalid_interest: "",
    summary_title: "",
    summary_intro: "",
    summary_confirm: "",
    confirmation_prompt: "",
    restart_message: ""
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesSaving, setMessagesSaving] = useState(false);
  const [promptsLoading, setPromptsLoading] = useState(false);
  const [promptsSaving, setPromptsSaving] = useState(false);
  const [alertInfo, setAlertInfo] = useState<AlertInfo | null>(null);

  // Load all data on component mount
  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const response = await fetch(LEAD_ALL_API, {
        method: 'GET',
        headers: {
          'accept': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        // Handle response structure: { success: true, messages: {...}, prompts: {...} }
        if (data.success) {
          if (data.messages) {
            setMessages({
              message_line_1: data.messages.message_line_1 || "",
              message_line_2: data.messages.message_line_2 || "",
              message_line_3: data.messages.message_line_3 || ""
            });
          }
          if (data.prompts) {
            setPrompts({
              prompt_name: data.prompts.prompt_name || "",
              prompt_name_success: data.prompts.prompt_name_success || "",
              prompt_email: data.prompts.prompt_email || "",
              prompt_phone: data.prompts.prompt_phone || "",
              prompt_interest: data.prompts.prompt_interest || "",
              error_invalid_name: data.prompts.error_invalid_name || "",
              error_invalid_email: data.prompts.error_invalid_email || "",
              error_invalid_phone: data.prompts.error_invalid_phone || "",
              error_invalid_interest: data.prompts.error_invalid_interest || "",
              summary_title: data.prompts.summary_title || "",
              summary_intro: data.prompts.summary_intro || "",
              summary_confirm: data.prompts.summary_confirm || "",
              confirmation_prompt: data.prompts.confirmation_prompt || "",
              restart_message: data.prompts.restart_message || ""
            });
          }
        }
        // Only show success message if data was actually loaded
        if (data.success && (data.messages || data.prompts)) {
          setAlertInfo({
            show: true,
            variant: 'success',
            title: 'Data Loaded',
            message: 'Lead form data loaded successfully from server.'
          });
          setTimeout(() => setAlertInfo(null), 3000);
        }
      } else if (response.status === 404) {
        // 404 means no data exists yet - this is not an error, just empty state
        console.log('No lead form data found yet. Starting with empty form.');
        // Don't show error for 404 - just use empty defaults
      } else {
        const errorData = await response.json().catch(() => ({}));
        // Only show error for non-404 errors
        setAlertInfo({
          show: true,
          variant: 'error',
          title: 'Error',
          message: errorData.detail || errorData.message || `Failed to fetch lead form data (${response.status})`
        });
        setTimeout(() => setAlertInfo(null), 5000);
      }
    } catch (error) {
      // Only show error if it's a network error and we can't reach the server
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      // Don't show error for network issues on initial load - just log it
      if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
        console.warn('Network error fetching lead form data. Using default values.');
      } else {
        console.error('Error fetching lead form data:', error);
        setAlertInfo({
          show: true,
          variant: 'error',
          title: 'Error',
          message: errorMessage
        });
        setTimeout(() => setAlertInfo(null), 5000);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    setMessagesLoading(true);
    try {
      const response = await fetch(LEAD_MESSAGES_API, {
        method: 'GET',
        headers: {
          'accept': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        // API returns data directly: { message_line_1, message_line_2, message_line_3, ... }
        setMessages({
          message_line_1: data.message_line_1 || "",
          message_line_2: data.message_line_2 || "",
          message_line_3: data.message_line_3 || ""
        });
        setAlertInfo({
          show: true,
          variant: 'success',
          title: 'Messages Loaded',
          message: 'Welcome messages loaded successfully.'
        });
        setTimeout(() => setAlertInfo(null), 3000);
      } else if (response.status === 404) {
        console.log('No messages found yet.');
        // Don't show error for 404
      } else {
        const errorData = await response.json().catch(() => ({}));
        setAlertInfo({
          show: true,
          variant: 'error',
          title: 'Error',
          message: errorData.detail || errorData.message || `Failed to fetch messages (${response.status})`
        });
        setTimeout(() => setAlertInfo(null), 5000);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
        console.warn('Network error fetching messages.');
      } else {
        console.error('Error fetching messages:', error);
        setAlertInfo({
          show: true,
          variant: 'error',
          title: 'Error',
          message: errorMessage
        });
        setTimeout(() => setAlertInfo(null), 5000);
      }
    } finally {
      setMessagesLoading(false);
    }
  };

  const saveMessages = async () => {
    setMessagesSaving(true);
    try {
      const response = await fetch(LEAD_MESSAGES_API, {
        method: 'PUT',
        headers: {
          'accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message_line_1: messages.message_line_1,
          message_line_2: messages.message_line_2,
          message_line_3: messages.message_line_3
        })
      });

      if (response.ok) {
        const result = await response.json();
        // API returns: { success: true, message: "...", data: {...} }
        setAlertInfo({
          show: true,
          variant: 'success',
          title: 'Success!',
          message: result.message || result.detail || 'Welcome messages updated successfully.'
        });
        // Refresh data after save to ensure UI is in sync
        await fetchMessages();
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || errorData.message || `Failed to save messages (${response.status})`);
      }
    } catch (error) {
      console.error('Error saving messages:', error);
      setAlertInfo({
        show: true,
        variant: 'error',
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to save messages. Please try again.'
      });
    } finally {
      setMessagesSaving(false);
      setTimeout(() => setAlertInfo(null), 5000);
    }
  };

  const fetchPrompts = async () => {
    setPromptsLoading(true);
    try {
      const response = await fetch(LEAD_PROMPTS_API, {
        method: 'GET',
        headers: {
          'accept': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        // API returns data directly: { prompt_name, prompt_name_success, ... }
        setPrompts({
          prompt_name: data.prompt_name || "",
          prompt_name_success: data.prompt_name_success || "",
          prompt_email: data.prompt_email || "",
          prompt_phone: data.prompt_phone || "",
          prompt_interest: data.prompt_interest || "",
          error_invalid_name: data.error_invalid_name || "",
          error_invalid_email: data.error_invalid_email || "",
          error_invalid_phone: data.error_invalid_phone || "",
          error_invalid_interest: data.error_invalid_interest || "",
          summary_title: data.summary_title || "",
          summary_intro: data.summary_intro || "",
          summary_confirm: data.summary_confirm || "",
          confirmation_prompt: data.confirmation_prompt || "",
          restart_message: data.restart_message || ""
        });
        setAlertInfo({
          show: true,
          variant: 'success',
          title: 'Prompts Loaded',
          message: 'Lead prompts loaded successfully.'
        });
        setTimeout(() => setAlertInfo(null), 3000);
      } else if (response.status === 404) {
        console.log('No prompts found yet.');
        // Don't show error for 404
      } else {
        const errorData = await response.json().catch(() => ({}));
        setAlertInfo({
          show: true,
          variant: 'error',
          title: 'Error',
          message: errorData.detail || errorData.message || `Failed to fetch prompts (${response.status})`
        });
        setTimeout(() => setAlertInfo(null), 5000);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
        console.warn('Network error fetching prompts.');
      } else {
        console.error('Error fetching prompts:', error);
        setAlertInfo({
          show: true,
          variant: 'error',
          title: 'Error',
          message: errorMessage
        });
        setTimeout(() => setAlertInfo(null), 5000);
      }
    } finally {
      setPromptsLoading(false);
    }
  };

  const savePrompts = async () => {
    setPromptsSaving(true);
    try {
      const response = await fetch(LEAD_PROMPTS_API, {
        method: 'PUT',
        headers: {
          'accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt_name: prompts.prompt_name,
          prompt_name_success: prompts.prompt_name_success,
          prompt_email: prompts.prompt_email,
          prompt_phone: prompts.prompt_phone,
          prompt_interest: prompts.prompt_interest,
          error_invalid_name: prompts.error_invalid_name,
          error_invalid_email: prompts.error_invalid_email,
          error_invalid_phone: prompts.error_invalid_phone,
          error_invalid_interest: prompts.error_invalid_interest,
          summary_title: prompts.summary_title,
          summary_intro: prompts.summary_intro,
          summary_confirm: prompts.summary_confirm,
          confirmation_prompt: prompts.confirmation_prompt,
          restart_message: prompts.restart_message
        })
      });

      if (response.ok) {
        const result = await response.json();
        // API returns: { success: true, message: "...", data: {...} }
        setAlertInfo({
          show: true,
          variant: 'success',
          title: 'Success!',
          message: result.message || result.detail || 'Lead prompts updated successfully.'
        });
        // Refresh data after save to ensure UI is in sync
        await fetchPrompts();
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || errorData.message || `Failed to save prompts (${response.status})`);
      }
    } catch (error) {
      console.error('Error saving prompts:', error);
      setAlertInfo({
        show: true,
        variant: 'error',
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to save prompts. Please try again.'
      });
    } finally {
      setPromptsSaving(false);
      setTimeout(() => setAlertInfo(null), 5000);
    }
  };

  const saveAll = async () => {
    setSaving(true);
    try {
      const response = await fetch(LEAD_ALL_API, {
        method: 'PUT',
        headers: {
          'accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages: {
            message_line_1: messages.message_line_1,
            message_line_2: messages.message_line_2,
            message_line_3: messages.message_line_3
          },
          prompts: {
            prompt_name: prompts.prompt_name,
            prompt_name_success: prompts.prompt_name_success,
            prompt_email: prompts.prompt_email,
            prompt_phone: prompts.prompt_phone,
            prompt_interest: prompts.prompt_interest,
            error_invalid_name: prompts.error_invalid_name,
            error_invalid_email: prompts.error_invalid_email,
            error_invalid_phone: prompts.error_invalid_phone,
            error_invalid_interest: prompts.error_invalid_interest,
            summary_title: prompts.summary_title,
            summary_intro: prompts.summary_intro,
            summary_confirm: prompts.summary_confirm,
            confirmation_prompt: prompts.confirmation_prompt,
            restart_message: prompts.restart_message
          }
        })
      });

      if (response.ok) {
        const result = await response.json();
        setAlertInfo({
          show: true,
          variant: 'success',
          title: 'Success!',
          message: result.message || result.detail || 'All lead content updated successfully.'
        });
        // Refresh data after save to ensure UI is in sync
        await fetchAllData();
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || errorData.message || `Failed to save all data (${response.status})`);
      }
    } catch (error) {
      console.error('Error saving all data:', error);
      setAlertInfo({
        show: true,
        variant: 'error',
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to save all data. Please try again.'
      });
    } finally {
      setSaving(false);
      setTimeout(() => setAlertInfo(null), 5000);
    }
  };

  return (
    <div className="w-full space-y-8">
      {alertInfo && alertInfo.show && (
        <div className="mb-6">
          <Alert
            variant={alertInfo.variant}
            title={alertInfo.title}
            message={alertInfo.message}
          />
        </div>
      )}

      {/* Welcome Messages Section */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 border border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Welcome Messages</h1>
        </div>

        <div className="space-y-4 mb-6">
          <div>
            <Label htmlFor="message_line_1" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Message Line 1
            </Label>
            <Input
              id="message_line_1"
              value={messages.message_line_1}
              onChange={(e) => setMessages(prev => ({ ...prev, message_line_1: e.target.value }))}
              placeholder="Welcome to Mobiloitte's lead generation system! I'll help you get in touch with our team."
              className="w-full"
            />
          </div>

          <div>
            <Label htmlFor="message_line_2" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Message Line 2
            </Label>
            <Input
              id="message_line_2"
              value={messages.message_line_2}
              onChange={(e) => setMessages(prev => ({ ...prev, message_line_2: e.target.value }))}
              placeholder="Mobiloitte - AI & Blockchain-Led Digital Transformation"
              className="w-full"
            />
          </div>

          <div>
            <Label htmlFor="message_line_3" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Message Line 3
            </Label>
            <Input
              id="message_line_3"
              value={messages.message_line_3}
              onChange={(e) => setMessages(prev => ({ ...prev, message_line_3: e.target.value }))}
              placeholder="Let's start with your basic information:"
              className="w-full"
            />
          </div>
        </div>

        <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-center sm:justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              Welcome Messages Configuration
            </span>
          </div>
          <div className="flex gap-2 w-full sm:w-auto justify-center sm:justify-end">
            <Button
              variant="outline"
              onClick={fetchMessages}
              disabled={messagesLoading}
              startIcon={<RefreshCw className={`w-4 h-4 ${messagesLoading ? 'animate-spin' : ''}`} />}
              className="w-full sm:w-auto"
            >
              Refresh
            </Button>
            <Button
              onClick={saveMessages}
              disabled={messagesSaving}
              className="bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto"
              startIcon={<Save className="w-4 h-4" />}
            >
              {messagesSaving ? 'Saving...' : 'Save Messages'}
            </Button>
          </div>
        </div>
      </div>

      {/* Lead Prompts Section */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 border border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
            <FileText className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Lead Prompts</h1>
        </div>

        <div className="space-y-6">
          {/* Main Prompts */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-blue-600" />
              Main Prompts
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="prompt_name" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Name Prompt
                </Label>
                <Input
                  id="prompt_name"
                  value={prompts.prompt_name}
                  onChange={(e) => setPrompts(prev => ({ ...prev, prompt_name: e.target.value }))}
                  placeholder="What's your full name?"
                  className="w-full"
                />
              </div>

              <div>
                <Label htmlFor="prompt_name_success" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Name Success Prompt
                </Label>
                <Input
                  id="prompt_name_success"
                  value={prompts.prompt_name_success}
                  onChange={(e) => setPrompts(prev => ({ ...prev, prompt_name_success: e.target.value }))}
                  placeholder="Got it, {name}! What's your email address?"
                  className="w-full"
                />
              </div>

              <div>
                <Label htmlFor="prompt_email" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Email Prompt
                </Label>
                <Input
                  id="prompt_email"
                  value={prompts.prompt_email}
                  onChange={(e) => setPrompts(prev => ({ ...prev, prompt_email: e.target.value }))}
                  placeholder="Email saved: {email}. What's your phone number?"
                  className="w-full"
                />
              </div>

              <div>
                <Label htmlFor="prompt_phone" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Phone Prompt
                </Label>
                <Input
                  id="prompt_phone"
                  value={prompts.prompt_phone}
                  onChange={(e) => setPrompts(prev => ({ ...prev, prompt_phone: e.target.value }))}
                  placeholder="Phone saved: {phone}. What are you interested in?"
                  className="w-full"
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="prompt_interest" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                  <Briefcase className="w-4 h-4" />
                  Interest Prompt
                </Label>
                <Input
                  id="prompt_interest"
                  value={prompts.prompt_interest}
                  onChange={(e) => setPrompts(prev => ({ ...prev, prompt_interest: e.target.value }))}
                  placeholder="Interest saved: {interest}. Please provide any additional details or questions you have:"
                  className="w-full"
                />
              </div>
            </div>
          </div>

          {/* Error Messages */}
          <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              Error Messages
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="error_invalid_name" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Invalid Name Error
                </Label>
                <Input
                  id="error_invalid_name"
                  value={prompts.error_invalid_name}
                  onChange={(e) => setPrompts(prev => ({ ...prev, error_invalid_name: e.target.value }))}
                  placeholder="Invalid Name. Please enter your full name (at least 2 characters):"
                  className="w-full"
                />
              </div>

              <div>
                <Label htmlFor="error_invalid_email" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Invalid Email Error
                </Label>
                <Input
                  id="error_invalid_email"
                  value={prompts.error_invalid_email}
                  onChange={(e) => setPrompts(prev => ({ ...prev, error_invalid_email: e.target.value }))}
                  placeholder="Invalid Email Format. Please enter a valid email address:"
                  className="w-full"
                />
              </div>

              <div>
                <Label htmlFor="error_invalid_phone" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Invalid Phone Error
                </Label>
                <Input
                  id="error_invalid_phone"
                  value={prompts.error_invalid_phone}
                  onChange={(e) => setPrompts(prev => ({ ...prev, error_invalid_phone: e.target.value }))}
                  placeholder="Invalid Phone Number. Please enter a valid phone number (7-15 digits):"
                  className="w-full"
                />
              </div>

              <div>
                <Label htmlFor="error_invalid_interest" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Invalid Interest Error
                </Label>
                <Input
                  id="error_invalid_interest"
                  value={prompts.error_invalid_interest}
                  onChange={(e) => setPrompts(prev => ({ ...prev, error_invalid_interest: e.target.value }))}
                  placeholder="Invalid Interest. Please enter what you're interested in (at least 2 characters):"
                  className="w-full"
                />
              </div>
            </div>
          </div>

          {/* Summary & Confirmation */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              Summary & Confirmation
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="summary_title" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Summary Title
                </Label>
                <Input
                  id="summary_title"
                  value={prompts.summary_title}
                  onChange={(e) => setPrompts(prev => ({ ...prev, summary_title: e.target.value }))}
                  placeholder="Lead Information Summary"
                  className="w-full"
                />
              </div>

              <div>
                <Label htmlFor="summary_intro" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Summary Introduction
                </Label>
                <Input
                  id="summary_intro"
                  value={prompts.summary_intro}
                  onChange={(e) => setPrompts(prev => ({ ...prev, summary_intro: e.target.value }))}
                  placeholder="Please review your information:"
                  className="w-full"
                />
              </div>

              <div>
                <Label htmlFor="summary_confirm" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Summary Confirmation
                </Label>
                <Input
                  id="summary_confirm"
                  value={prompts.summary_confirm}
                  onChange={(e) => setPrompts(prev => ({ ...prev, summary_confirm: e.target.value }))}
                  placeholder="Ready to submit? Type 'yes' to submit your information or 'no' to make changes."
                  className="w-full"
                />
              </div>

              <div>
                <Label htmlFor="confirmation_prompt" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Confirmation Prompt
                </Label>
                <Input
                  id="confirmation_prompt"
                  value={prompts.confirmation_prompt}
                  onChange={(e) => setPrompts(prev => ({ ...prev, confirmation_prompt: e.target.value }))}
                  placeholder="Please Confirm. Type 'yes' to submit your information or 'no' to make changes."
                  className="w-full"
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="restart_message" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Restart Message
                </Label>
                <Input
                  id="restart_message"
                  value={prompts.restart_message}
                  onChange={(e) => setPrompts(prev => ({ ...prev, restart_message: e.target.value }))}
                  placeholder="Let's Start Over. I'll help you update your information. Let's begin again:"
                  className="w-full"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-center sm:justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg mt-6">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              Lead Prompts Configuration
            </span>
          </div>
          <div className="flex gap-2 w-full sm:w-auto justify-center sm:justify-end">
            <Button
              variant="outline"
              onClick={fetchPrompts}
              disabled={promptsLoading}
              startIcon={<RefreshCw className={`w-4 h-4 ${promptsLoading ? 'animate-spin' : ''}`} />}
              className="w-full sm:w-auto"
            >
              Refresh
            </Button>
            <Button
              onClick={savePrompts}
              disabled={promptsSaving}
              className="bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto"
              startIcon={<Save className="w-4 h-4" />}
            >
              {promptsSaving ? 'Saving...' : 'Save Prompts'}
            </Button>
          </div>
        </div>
      </div>

      {/* Save All Section */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl shadow-lg p-8 border border-blue-200 dark:border-blue-800">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Save className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Save All Changes</h1>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Save both welcome messages and all prompts at once using the bulk update endpoint.
        </p>
        <div className="flex justify-end">
          <Button
            onClick={saveAll}
            disabled={saving || loading}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 py-3"
            startIcon={<Save className="w-5 h-5" />}
          >
            {saving ? 'Saving All...' : 'Save All Changes'}
          </Button>
        </div>
      </div>

      {/* Refresh All Section */}
      <div className="flex justify-center">
        <Button
          variant="outline"
          onClick={fetchAllData}
          disabled={loading}
          startIcon={<RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />}
          className="px-6 py-2"
        >
          {loading ? 'Loading...' : 'Refresh All Data'}
        </Button>
      </div>
    </div>
  );
}
