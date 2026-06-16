"use client";
import React, { useState, useEffect } from "react";
import { CheckCircle, Save, RefreshCw, MessageSquare, FileText, Mail, Phone, User, Ticket, AlertCircle, Shield } from "lucide-react";
import Alert from "@/components/ui/alert/Alert";
import Button from "@/components/ui/button/Button";
import Label from "@/components/form/Label";

// Instagram API endpoints
const BASE_API_URL = (process.env.NEXT_PUBLIC_INSTAGRAM_BOT_API_URL || process.env.NEXT_PUBLIC_API_URL || "https://instabot-aiagent.mobiloitte.io").replace(/\/+$/, "");
const TICKET_MESSAGES_API = `${BASE_API_URL}/ticket/messages`;

type AlertInfo = {
  show: boolean;
  variant: 'success' | 'error';
  title: string;
  message: string;
};

type TicketMessages = {
  // Selection messages
  selection_customer_authenticated?: string;
  selection_employee_authenticated?: string;
  selection_guest?: string;
  selection_invalid?: string;
  
  // Customer login messages
  customer_login_required?: string;
  customer_guest_login_prompt?: string;
  
  // Customer prompts
  customer_auto_details?: string;
  customer_prompt_name?: string;
  customer_prompt_name_success?: string;
  customer_prompt_email?: string;
  customer_prompt_phone?: string;
  customer_prompt_issue_type?: string;
  customer_prompt_issue?: string;
  customer_prompt_message?: string;
  
  // Customer errors
  customer_error_invalid_name?: string;
  customer_error_invalid_email?: string;
  customer_error_invalid_phone?: string;
  customer_error_invalid_issue_type?: string;
  customer_error_invalid_issue?: string;
  customer_error_account_not_found?: string;
  customer_error_data_access?: string;
  
  // Customer confirmation
  customer_confirmation_prompt?: string;
  customer_restart_message?: string;
  customer_submission_failed?: string;
  
  // Employee prompts (we'll keep these but they're for employee form)
  employee_auto_details?: string;
  employee_prompt_name?: string;
  employee_prompt_name_success?: string;
  employee_prompt_email?: string;
  employee_prompt_issue_type?: string;
  employee_prompt_issue?: string;
  employee_prompt_message?: string;
  employee_error_invalid_name?: string;
  employee_error_invalid_email?: string;
  employee_error_invalid_issue_type?: string;
  employee_error_invalid_issue?: string;
  employee_error_account_not_found?: string;
  employee_error_data_access?: string;
  employee_confirmation_prompt?: string;
  employee_restart_message?: string;
  employee_submission_failed?: string;
  
  // Guest login messages
  employee_guest_login_prompt?: string;
  guest_login_session_expired?: string;
  guest_login_email_not_found?: string;
  guest_login_failed?: string;
  guest_login_error?: string;
  
  _id?: string;
  type?: string;
  created_at?: string;
  updated_at?: string;
};

export default function CustomerTicketFormManager(): React.JSX.Element {
  const [messages, setMessages] = useState<TicketMessages>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [alertInfo, setAlertInfo] = useState<AlertInfo | null>(null);

  // Load data on component mount
  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const response = await fetch(TICKET_MESSAGES_API, {
        method: 'GET',
        headers: {
          'accept': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        // API returns data directly: { _id, type, selection_customer_authenticated, ... }
        setMessages(data);
        // Only show success if we actually got data
        if (data && Object.keys(data).length > 0) {
          setAlertInfo({
            show: true,
            variant: 'success',
            title: 'Data Loaded',
            message: 'Customer ticket messages loaded successfully.'
          });
          setTimeout(() => setAlertInfo(null), 3000);
        }
      } else if (response.status === 404) {
        // 404 means no data exists yet - this is not an error, just empty state
        console.log('No ticket messages found yet. Starting with empty form.');
        // Don't show error for 404 - just use empty defaults
      } else {
        const errorData = await response.json().catch(() => ({}));
        // Only show error for non-404 errors
        setAlertInfo({
          show: true,
          variant: 'error',
          title: 'Error',
          message: errorData.detail || errorData.message || `Failed to fetch ticket messages (${response.status})`
        });
        setTimeout(() => setAlertInfo(null), 5000);
      }
    } catch (error) {
      // Only show error if it's a network error and we can't reach the server
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      // Don't show error for network issues on initial load - just log it
      if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
        console.warn('Network error fetching ticket messages. Using default values.');
      } else {
        console.error('Error fetching ticket messages:', error);
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

  const saveMessages = async () => {
    setSaving(true);
    try {
      // Prepare the payload with all fields, preserving _id and type if they exist
      const payload: TicketMessages = {
        ...messages,
        type: messages.type || 'ticket_messages'
      };
      
      const response = await fetch(TICKET_MESSAGES_API, {
        method: 'PUT',
        headers: {
          'accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const result = await response.json();
        // API returns: { success: true, message: "...", data: {...} }
        setAlertInfo({
          show: true,
          variant: 'success',
          title: 'Success!',
          message: result.message || result.detail || 'Customer ticket messages updated successfully.'
        });
        // Update local state with saved data from response
        if (result.data) {
          setMessages(prev => ({ ...prev, ...result.data }));
        } else {
          // Refresh data after save to ensure UI is in sync
          await fetchMessages();
        }
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
      setSaving(false);
      setTimeout(() => setAlertInfo(null), 5000);
    }
  };

  const updateMessage = (key: keyof TicketMessages, value: string) => {
    setMessages(prev => ({ ...prev, [key]: value }));
  };

  // Customer-specific fields only
  const customerFields = [
    { key: 'selection_customer_authenticated' as keyof TicketMessages, label: 'Selection (Customer Authenticated)', icon: <Shield className="w-4 h-4" />, placeholder: 'Customer Support Ticket...' },
    { key: 'selection_guest' as keyof TicketMessages, label: 'Selection (Guest)', icon: <User className="w-4 h-4" />, placeholder: 'Support Ticket Options...' },
    { key: 'selection_invalid' as keyof TicketMessages, label: 'Selection Invalid', icon: <AlertCircle className="w-4 h-4" />, placeholder: 'Please select a valid option...' },
    { key: 'customer_login_required' as keyof TicketMessages, label: 'Customer Login Required', icon: <Shield className="w-4 h-4" />, placeholder: 'Customer Login Required...' },
    { key: 'customer_guest_login_prompt' as keyof TicketMessages, label: 'Customer Guest Login Prompt', icon: <Mail className="w-4 h-4" />, placeholder: 'Customer Login Required...' },
    { key: 'customer_auto_details' as keyof TicketMessages, label: 'Customer Auto Details', icon: <User className="w-4 h-4" />, placeholder: 'Auto-filled your details...' },
    { key: 'customer_prompt_name' as keyof TicketMessages, label: 'Prompt: Name', icon: <User className="w-4 h-4" />, placeholder: 'What\'s your full name?' },
    { key: 'customer_prompt_name_success' as keyof TicketMessages, label: 'Prompt: Name Success', icon: <CheckCircle className="w-4 h-4" />, placeholder: 'Got it, {name}! What\'s your email address?' },
    { key: 'customer_prompt_email' as keyof TicketMessages, label: 'Prompt: Email', icon: <Mail className="w-4 h-4" />, placeholder: 'Email saved: {email}. What\'s your phone number?' },
    { key: 'customer_prompt_phone' as keyof TicketMessages, label: 'Prompt: Phone', icon: <Phone className="w-4 h-4" />, placeholder: 'Phone saved: {phone}. What type of issue are you experiencing?' },
    { key: 'customer_prompt_issue_type' as keyof TicketMessages, label: 'Prompt: Issue Type', icon: <Ticket className="w-4 h-4" />, placeholder: 'Issue type saved: {issue_type}. Please provide a brief description...' },
    { key: 'customer_prompt_issue' as keyof TicketMessages, label: 'Prompt: Issue', icon: <FileText className="w-4 h-4" />, placeholder: 'Issue description saved: {issue}. Please provide any additional details...' },
    { key: 'customer_prompt_message' as keyof TicketMessages, label: 'Prompt: Message/Summary', icon: <MessageSquare className="w-4 h-4" />, placeholder: 'Additional details saved. Support Ticket Summary...' },
    { key: 'customer_error_invalid_name' as keyof TicketMessages, label: 'Error: Invalid Name', icon: <AlertCircle className="w-4 h-4" />, placeholder: 'Invalid Name. Please enter your full name...' },
    { key: 'customer_error_invalid_email' as keyof TicketMessages, label: 'Error: Invalid Email', icon: <AlertCircle className="w-4 h-4" />, placeholder: 'Invalid Email Format. Please enter a valid email address...' },
    { key: 'customer_error_invalid_phone' as keyof TicketMessages, label: 'Error: Invalid Phone', icon: <AlertCircle className="w-4 h-4" />, placeholder: 'Invalid Phone Number. Please enter a valid phone number...' },
    { key: 'customer_error_invalid_issue_type' as keyof TicketMessages, label: 'Error: Invalid Issue Type', icon: <AlertCircle className="w-4 h-4" />, placeholder: 'Invalid Issue Type. Please enter an issue type...' },
    { key: 'customer_error_invalid_issue' as keyof TicketMessages, label: 'Error: Invalid Issue', icon: <AlertCircle className="w-4 h-4" />, placeholder: 'Invalid Issue Description. Please provide a more detailed description...' },
    { key: 'customer_error_account_not_found' as keyof TicketMessages, label: 'Error: Account Not Found', icon: <AlertCircle className="w-4 h-4" />, placeholder: 'Customer Account Not Found. Your account ({email}) was not found...' },
    { key: 'customer_error_data_access' as keyof TicketMessages, label: 'Error: Data Access', icon: <AlertCircle className="w-4 h-4" />, placeholder: 'Unable to Access Customer Data. There was an error retrieving...' },
    { key: 'customer_confirmation_prompt' as keyof TicketMessages, label: 'Confirmation Prompt', icon: <CheckCircle className="w-4 h-4" />, placeholder: 'Please Confirm. Type \'yes\' to submit your support ticket...' },
    { key: 'customer_restart_message' as keyof TicketMessages, label: 'Restart Message', icon: <RefreshCw className="w-4 h-4" />, placeholder: 'Let\'s Start Over. I\'ll help you update your information...' },
    { key: 'customer_submission_failed' as keyof TicketMessages, label: 'Submission Failed', icon: <AlertCircle className="w-4 h-4" />, placeholder: 'Ticket Submission Failed. There was a technical issue...' },
  ];

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

      {/* Customer Ticket Messages Section */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 border border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
            <Ticket className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Customer Ticket Messages</h1>
        </div>

        <div className="space-y-6">
          {/* Selection Messages */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-600" />
              Selection & Login Messages
            </h2>
            <div className="space-y-4">
              {customerFields.filter(f => f.key.includes('selection') || f.key.includes('login')).map((field) => (
                <div key={field.key}>
                  <Label htmlFor={field.key} className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                    {field.icon}
                    {field.label}
                  </Label>
                  <textarea
                    id={field.key}
                    value={messages[field.key] || ''}
                    onChange={(e) => updateMessage(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100 p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]"
                    rows={3}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Main Prompts */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-green-600" />
              Customer Prompts
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {customerFields.filter(f => f.key.startsWith('customer_prompt') && !f.key.includes('error')).map((field) => (
                <div key={field.key}>
                  <Label htmlFor={field.key} className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                    {field.icon}
                    {field.label}
                  </Label>
                  <textarea
                    id={field.key}
                    value={messages[field.key] || ''}
                    onChange={(e) => updateMessage(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100 p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]"
                    rows={3}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Error Messages */}
          <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              Error Messages
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {customerFields.filter(f => f.key.includes('error')).map((field) => (
                <div key={field.key}>
                  <Label htmlFor={field.key} className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                    {field.icon}
                    {field.label}
                  </Label>
                  <textarea
                    id={field.key}
                    value={messages[field.key] || ''}
                    onChange={(e) => updateMessage(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100 p-3 focus:outline-none focus:ring-2 focus:ring-red-500 min-h-[80px]"
                    rows={3}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Confirmation & Other Messages */}
          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-purple-600" />
              Confirmation & Other Messages
            </h2>
            <div className="space-y-4">
              {customerFields.filter(f => f.key.includes('confirmation') || f.key.includes('restart') || f.key.includes('submission') || f.key.includes('auto_details')).map((field) => (
                <div key={field.key}>
                  <Label htmlFor={field.key} className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                    {field.icon}
                    {field.label}
                  </Label>
                  <textarea
                    id={field.key}
                    value={messages[field.key] || ''}
                    onChange={(e) => updateMessage(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100 p-3 focus:outline-none focus:ring-2 focus:ring-purple-500 min-h-[100px]"
                    rows={4}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-center sm:justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg mt-6">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              Customer Ticket Messages Configuration
            </span>
          </div>
          <div className="flex gap-2 w-full sm:w-auto justify-center sm:justify-end">
            <Button
              variant="outline"
              onClick={fetchMessages}
              disabled={loading}
              startIcon={<RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />}
              className="w-full sm:w-auto"
            >
              Refresh
            </Button>
            <Button
              onClick={saveMessages}
              disabled={saving}
              className="bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto"
              startIcon={<Save className="w-4 h-4" />}
            >
              {saving ? 'Saving...' : 'Save Messages'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
