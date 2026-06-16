"use client";
import React, { useState, useEffect } from "react";
import { CheckCircle, Save, RefreshCw, Edit, FileText, Mail, Phone, Briefcase, User, Trash2, Plus, Ticket } from "lucide-react";
import Alert from "@/components/ui/alert/Alert";
import Button from "@/components/ui/button/Button";
import Input from "@/components/form/input/InputField";

const BASE_API_URL = (process.env.NEXT_PUBLIC_WHATSAPP_BOT_API_URL || process.env.NEXT_PUBLIC_API_URL || "https://wa-mobiloitte.converiqo.ai").replace(/\/+$/, "");
const EMPLOYEE_FORM_API = `${BASE_API_URL}/admin/ticket-form/employee`;
const UI_TEXTS_API = `${BASE_API_URL}/admin/ticket-form/ui-texts`;
const GREETINGS_API = `${BASE_API_URL}/admin/ticket-form/greetings`;

type AlertInfo = {
  show: boolean;
  variant: 'success' | 'error';
  title: string;
  message: string;
};

type EmployeeFormData = {
  fields: string[];
  prompts: string[];
  updated_at?: number;
  source?: string;
};

type UITextsData = {
  employee_issue_type: {
    header: string;
    body: string;
    footer: string;
  };
  employee_issue: {
    header: string;
    body: string;
    footer: string;
  };
  updated_at?: number;
  source?: string;
};

type GreetingsData = {
  employee: string[];
  updated_at?: number;
  source?: string;
};

type FieldPromptPair = {
  field: string;
  prompt: string;
};

const getFieldIcon = (fieldName: string) => {
  const field = fieldName.toLowerCase();
  if (field.includes('employee') || field.includes('id')) return <User className="w-4 h-4" />;
  if (field.includes('email')) return <Mail className="w-4 h-4" />;
  if (field.includes('mobile') || field.includes('phone')) return <Phone className="w-4 h-4" />;
  if (field.includes('issue')) return <Ticket className="w-4 h-4" />;
  if (field.includes('device')) return <Briefcase className="w-4 h-4" />;
  if (field.includes('message') || field.includes('additional')) return <FileText className="w-4 h-4" />;
  return <FileText className="w-4 h-4" />;
};

const formatFieldName = (fieldName: string): string => {
  return fieldName
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

export default function EmployeeTicketFormManager(): React.JSX.Element {
  const [employeeFormData, setEmployeeFormData] = useState<EmployeeFormData>({
    fields: [],
    prompts: []
  });
  const [uiTextsData, setUITextsData] = useState<UITextsData>({
    employee_issue_type: { header: "", body: "", footer: "" },
    employee_issue: { header: "", body: "", footer: "" }
  });
  const [greetingsData, setGreetingsData] = useState<GreetingsData>({
    employee: []
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uiTextsLoading, setUITextsLoading] = useState(false);
  const [uiTextsSaving, setUITextsSaving] = useState(false);
  const [greetingsLoading, setGreetingsLoading] = useState(false);
  const [greetingsSaving, setGreetingsSaving] = useState(false);
  const [alertInfo, setAlertInfo] = useState<AlertInfo | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingField, setEditingField] = useState("");
  const [editingPrompt, setEditingPrompt] = useState("");
  const [newGreeting, setNewGreeting] = useState("");
  const [editingGreetingIndex, setEditingGreetingIndex] = useState<number | null>(null);
  const [editingGreetingValue, setEditingGreetingValue] = useState("");

  // Load all data on component mount
  useEffect(() => {
    fetchEmployeeFormData();
    fetchUITextsData();
    fetchGreetingsData();
  }, []);

  const fetchEmployeeFormData = async () => {
    setLoading(true);
    try {
      const response = await fetch(EMPLOYEE_FORM_API, {
        method: 'GET',
        headers: {
          'accept': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setEmployeeFormData(data);
        setAlertInfo({
          show: true,
          variant: 'success',
          title: 'Data Loaded',
          message: 'Employee ticket form data loaded successfully from server.'
        });
      } else {
        throw new Error('Failed to fetch employee ticket form data');
      }
    } catch (error) {
      console.error('Error fetching employee ticket form data:', error);
      setAlertInfo({
        show: true,
        variant: 'error',
        title: 'Error',
        message: 'Failed to load employee ticket form data. Please try again.'
      });
    } finally {
      setLoading(false);
      setTimeout(() => setAlertInfo(null), 4000);
    }
  };

  const saveEmployeeFormData = async () => {
    setSaving(true);
    try {
      const response = await fetch(EMPLOYEE_FORM_API, {
        method: 'PUT',
        headers: {
          'accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fields: employeeFormData.fields,
          prompts: employeeFormData.prompts
        })
      });

      if (response.ok) {
        const result = await response.json();
        setAlertInfo({
          show: true,
          variant: 'success',
          title: 'Success!',
          message: `Employee ticket form updated successfully. Updated at: ${new Date(result.updated_at * 1000).toLocaleString()}`
        });
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to save employee ticket form data');
      }
    } catch (error) {
      console.error('Error saving employee ticket form data:', error);
      setAlertInfo({
        show: true,
        variant: 'error',
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to save employee ticket form data. Please try again.'
      });
    } finally {
      setSaving(false);
      setTimeout(() => setAlertInfo(null), 5000);
    }
  };

  const fetchUITextsData = async () => {
    setUITextsLoading(true);
    try {
      const response = await fetch(UI_TEXTS_API, {
        method: 'GET',
        headers: {
          'accept': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUITextsData({
          employee_issue_type: data.employee_issue_type || { header: "", body: "", footer: "" },
          employee_issue: data.employee_issue || { header: "", body: "", footer: "" }
        });
      } else {
        throw new Error('Failed to fetch UI texts data');
      }
    } catch (error) {
      console.error('Error fetching UI texts data:', error);
      setAlertInfo({
        show: true,
        variant: 'error',
        title: 'Error',
        message: 'Failed to load UI texts data. Please try again.'
      });
    } finally {
      setUITextsLoading(false);
      setTimeout(() => setAlertInfo(null), 4000);
    }
  };

  const saveUITextsData = async () => {
    setUITextsSaving(true);
    try {
      // First fetch current data to preserve customer fields
      const currentResponse = await fetch(UI_TEXTS_API, {
        method: 'GET',
        headers: { 'accept': 'application/json' }
      });
      const currentData = currentResponse.ok ? await currentResponse.json() : {};

      const response = await fetch(UI_TEXTS_API, {
        method: 'PUT',
        headers: {
          'accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          employee_issue_type: uiTextsData.employee_issue_type,
          employee_issue: uiTextsData.employee_issue,
          customer_issue_type: currentData.customer_issue_type || { header: "", body: "", footer: "" },
          customer_issue: currentData.customer_issue || { header: "", body: "", footer: "" }
        })
      });

      if (response.ok) {
        const result = await response.json();
        setAlertInfo({
          show: true,
          variant: 'success',
          title: 'Success!',
          message: `UI texts updated successfully. Updated at: ${new Date(result.updated_at * 1000).toLocaleString()}`
        });
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to save UI texts data');
      }
    } catch (error) {
      console.error('Error saving UI texts data:', error);
      setAlertInfo({
        show: true,
        variant: 'error',
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to save UI texts data. Please try again.'
      });
    } finally {
      setUITextsSaving(false);
      setTimeout(() => setAlertInfo(null), 5000);
    }
  };

  const fetchGreetingsData = async () => {
    setGreetingsLoading(true);
    try {
      const response = await fetch(GREETINGS_API, {
        method: 'GET',
        headers: { 'accept': 'application/json' }
      });
      if (response.ok) {
        const data = await response.json();
        setGreetingsData({
          employee: Array.isArray(data.employee) ? data.employee : [],
          updated_at: data.updated_at,
          source: data.source,
        });
      } else {
        throw new Error('Failed to fetch greetings data');
      }
    } catch (error) {
      console.error('Error fetching greetings data:', error);
      setAlertInfo({
        show: true,
        variant: 'error',
        title: 'Error',
        message: 'Failed to load greetings data. Please try again.'
      });
    } finally {
      setGreetingsLoading(false);
      setTimeout(() => setAlertInfo(null), 4000);
    }
  };

  const saveGreetingsData = async () => {
    setGreetingsSaving(true);
    try {
      // First fetch current data to preserve customer greetings
      const currentResponse = await fetch(GREETINGS_API, {
        method: 'GET',
        headers: { 'accept': 'application/json' }
      });
      const currentData = currentResponse.ok ? await currentResponse.json() : {};

      const response = await fetch(GREETINGS_API, {
        method: 'PUT',
        headers: {
          'accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          employee: greetingsData.employee,
          customer: Array.isArray(currentData.customer) ? currentData.customer : []
        })
      });
      if (response.ok) {
        const result = await response.json();
        setAlertInfo({
          show: true,
          variant: 'success',
          title: 'Success!',
          message: `Greetings updated successfully. Updated at: ${new Date(result.updated_at * 1000).toLocaleString()}`
        });
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to save greetings data');
      }
    } catch (error) {
      console.error('Error saving greetings data:', error);
      setAlertInfo({
        show: true,
        variant: 'error',
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to save greetings data. Please try again.'
      });
    } finally {
      setGreetingsSaving(false);
      setTimeout(() => setAlertInfo(null), 5000);
    }
  };

  const getFieldPromptPairs = (): FieldPromptPair[] => {
    const pairs: FieldPromptPair[] = [];
    const maxLength = Math.max(employeeFormData.fields.length, employeeFormData.prompts.length);

    for (let i = 0; i < maxLength; i++) {
      pairs.push({
        field: employeeFormData.fields[i] || '',
        prompt: employeeFormData.prompts[i] || ''
      });
    }

    return pairs;
  };

  const startEditing = (index: number) => {
    const pairs = getFieldPromptPairs();
    if (pairs[index]) {
      setEditingIndex(index);
      setEditingField(pairs[index].field);
      setEditingPrompt(pairs[index].prompt);
    }
  };

  const saveEditing = () => {
    if (editingIndex !== null && editingPrompt.trim()) {
      setEmployeeFormData(prev => {
        const newPrompts = [...prev.prompts];
        newPrompts[editingIndex] = editingPrompt.trim();

        return {
          ...prev,
          prompts: newPrompts
        };
      });

      setEditingIndex(null);
      setEditingField("");
      setEditingPrompt("");
    }
  };

  const cancelEditing = () => {
    setEditingIndex(null);
    setEditingField("");
    setEditingPrompt("");
  };

  const addGreeting = () => {
    if (newGreeting.trim()) {
      setGreetingsData(prev => ({
        ...prev,
        employee: [...prev.employee, newGreeting.trim()]
      }));
      setNewGreeting("");
    }
  };

  const removeGreeting = (index: number) => {
    setGreetingsData(prev => ({
      ...prev,
      employee: prev.employee.filter((_, i) => i !== index)
    }));
  };

  const startEditingGreeting = (index: number) => {
    setEditingGreetingIndex(index);
    setEditingGreetingValue(greetingsData.employee[index] || "");
  };

  const saveEditingGreeting = () => {
    if (editingGreetingIndex !== null && editingGreetingValue.trim()) {
      setGreetingsData(prev => ({
        ...prev,
        employee: prev.employee.map((g, i) => i === editingGreetingIndex ? editingGreetingValue.trim() : g)
      }));
      setEditingGreetingIndex(null);
      setEditingGreetingValue("");
    }
  };

  const cancelEditingGreeting = () => {
    setEditingGreetingIndex(null);
    setEditingGreetingValue("");
  };

  const isFormValid = employeeFormData.fields.length > 0 && employeeFormData.prompts.length > 0;

  return (
    <div className="w-full">
      {alertInfo && alertInfo.show && (
        <div className="mb-6">
          <Alert
            variant={alertInfo.variant}
            title={alertInfo.title}
            message={alertInfo.message}
          />
        </div>
      )}

      {/* Fields with Prompts Section */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 mb-8 border border-gray-100 dark:border-gray-700">
        {/* Header */}
        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
            <Ticket className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Employee Ticket Form - Fields with Prompts</h1>
        </div>

        {/* Fields with Prompts Card */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Field-Prompt Pairs</h2>
          </div>

          <div className="space-y-3">
            {getFieldPromptPairs().map((pair, index) => (
              <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex-shrink-0 text-gray-600 dark:text-gray-400">
                  {getFieldIcon(pair.field)}
                </div>

                {editingIndex === index ? (
                  <div className="flex-1 flex gap-2">
                    <div className="flex-1 bg-gray-100 dark:bg-gray-600 px-3 py-2 rounded border text-sm font-medium text-gray-700 dark:text-gray-300">
                      {formatFieldName(editingField)}
                    </div>
                    <Input
                      value={editingPrompt}
                      onChange={(e) => setEditingPrompt(e.target.value)}
                      placeholder="Prompt text"
                      className="flex-1"
                    />
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        onClick={saveEditing}
                        className="bg-green-600 hover:bg-green-700 text-white px-2 py-1"
                      >
                        ✓
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={cancelEditing}
                        className="px-2 py-1"
                      >
                        ✕
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                          {formatFieldName(pair.field)}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {pair.prompt || <span className="text-gray-400 italic">No prompt set</span>}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => startEditing(index)}
                        className="p-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>

        </div>

        {/* Fields with Prompts Status Bar */}
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-center sm:justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div className="flex items-center gap-2 text-center">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {getFieldPromptPairs().length} field-prompt pairs • {isFormValid ? 'Ready to Save' : 'Incomplete'}
            </span>
          </div>

          <div className="flex gap-2 w-full sm:w-auto justify-center sm:justify-end">
            <Button
              variant="outline"
              onClick={fetchEmployeeFormData}
              disabled={loading}
              startIcon={<RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />}
              className="w-full sm:w-auto"
            >
              Refresh
            </Button>
            <Button
              onClick={saveEmployeeFormData}
              disabled={saving || !isFormValid}
              className="bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto"
              startIcon={<Save className="w-4 h-4" />}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </div>

      {/* UI Texts Configuration Section */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 mb-8 border border-gray-100 dark:border-gray-700">
        {/* Header */}
        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">UI Texts Configuration</h1>
        </div>

        {/* UI Texts Card */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Ticket className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Employee Ticket UI Texts</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Issue Type Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Ticket className="w-4 h-4 text-blue-600" />
                <h3 className="text-md font-medium text-gray-900 dark:text-white">Issue Type</h3>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Header Text
                  </label>
                  <Input
                    value={uiTextsData.employee_issue_type.header}
                    onChange={(e) => setUITextsData(prev => ({
                      ...prev,
                      employee_issue_type: { ...prev.employee_issue_type, header: e.target.value }
                    }))}
                    placeholder="Please select the issue category."
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Body Text
                  </label>
                  <Input
                    value={uiTextsData.employee_issue_type.body}
                    onChange={(e) => setUITextsData(prev => ({
                      ...prev,
                      employee_issue_type: { ...prev.employee_issue_type, body: e.target.value }
                    }))}
                    placeholder="Choose the category that best describes your IT issue:"
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Footer Text
                  </label>
                  <Input
                    value={uiTextsData.employee_issue_type.footer}
                    onChange={(e) => setUITextsData(prev => ({
                      ...prev,
                      employee_issue_type: { ...prev.employee_issue_type, footer: e.target.value }
                    }))}
                    placeholder="Our IT team will assist you promptly!"
                    className="w-full"
                  />
                </div>
              </div>
            </div>

            {/* Issue Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-green-600" />
                <h3 className="text-md font-medium text-gray-900 dark:text-white">Issue</h3>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Header Text
                  </label>
                  <Input
                    value={uiTextsData.employee_issue.header}
                    onChange={(e) => setUITextsData(prev => ({
                      ...prev,
                      employee_issue: { ...prev.employee_issue, header: e.target.value }
                    }))}
                    placeholder="Please choose the specific issue."
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Body Text
                  </label>
                  <Input
                    value={uiTextsData.employee_issue.body}
                    onChange={(e) => setUITextsData(prev => ({
                      ...prev,
                      employee_issue: { ...prev.employee_issue, body: e.target.value }
                    }))}
                    placeholder="Choose the issue that best matches your problem:"
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Footer Text
                  </label>
                  <Input
                    value={uiTextsData.employee_issue.footer}
                    onChange={(e) => setUITextsData(prev => ({
                      ...prev,
                      employee_issue: { ...prev.employee_issue, footer: e.target.value }
                    }))}
                    placeholder="You can add details next"
                    className="w-full"
                  />
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* UI Texts Status Bar */}
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-center sm:justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div className="flex items-center gap-2 text-center">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              UI Texts Configuration • Issue Type & Issue
            </span>
          </div>

          <div className="flex gap-2 w-full sm:w-auto justify-center sm:justify-end">
            <Button
              variant="outline"
              onClick={fetchUITextsData}
              disabled={uiTextsLoading}
              startIcon={<RefreshCw className={`w-4 h-4 ${uiTextsLoading ? 'animate-spin' : ''}`} />}
              className="w-full sm:w-auto"
            >
              Refresh
            </Button>
            <Button
              onClick={saveUITextsData}
              disabled={uiTextsSaving}
              className="bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto"
              startIcon={<Save className="w-4 h-4" />}
            >
              {uiTextsSaving ? 'Saving...' : 'Save UI Texts'}
            </Button>
          </div>
        </div>
      </div>

      {/* Greetings Section */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 mb-8 border border-gray-100 dark:border-gray-700">
        {/* Header */}
        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A4 4 0 107 12.001h1.5" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 100-6 3 3 0 000 6z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Greetings Messages</h1>
        </div>

        {/* Messages Card */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Employee Greetings</h2>
            </div>
          </div>

          <div className="space-y-3">
            {greetingsData.employee.map((greeting, index) => (
              <div key={index} className="flex items-start gap-3 p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 rounded-xl border border-gray-200 dark:border-gray-600 shadow-sm hover:shadow-md transition-shadow">
                {editingGreetingIndex === index ? (
                  <div className="flex-1 flex gap-2">
                    <Input
                      value={editingGreetingValue}
                      onChange={(e) => setEditingGreetingValue(e.target.value)}
                      placeholder="Enter greeting message... (Use {{ticket_id}} for ticket ID placeholder)"
                      className="flex-1"
                    />
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        onClick={saveEditingGreeting}
                        className="bg-green-600 hover:bg-green-700 text-white px-2 py-1"
                      >
                        ✓
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={cancelEditingGreeting}
                        className="px-2 py-1"
                      >
                        ✕
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex-1 min-w-0">
                      <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wide">Message Content</label>
                      <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                        {greeting || <span className="text-gray-400 italic">No greeting set</span>}
                      </div>
                      <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400 italic">
                        💡 Tip: Use {"{{ticket_id}}"} placeholder for dynamic ticket ID
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => startEditingGreeting(index)}
                        className="p-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeGreeting(index)}
                        aria-label="Remove greeting"
                        className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 p-2"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))}

            {/* Add New Greeting Form */}
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-xl shadow-sm">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide">Add New Greeting</label>
                  <Input
                    value={newGreeting}
                    onChange={(e) => setNewGreeting(e.target.value)}
                    placeholder="Enter greeting message... (Use {{ticket_id}} for ticket ID placeholder)"
                    className="w-full"
                  />
                  <p className="mt-1.5 text-xs text-blue-600 dark:text-blue-400 italic">
                    💡 Tip: Use {"{{ticket_id}}"} placeholder for dynamic ticket ID
                  </p>
                </div>
                <div className="flex-shrink-0 flex items-start gap-2 pt-7">
                  <Button
                    size="sm"
                    onClick={addGreeting}
                    disabled={!newGreeting.trim()}
                    className="bg-green-600 hover:bg-green-700 text-white px-4"
                    startIcon={<Plus className="w-4 h-4" />}
                  >
                    Add
                  </Button>
                </div>
              </div>
            </div>

            {greetingsData.employee.length === 0 && (
              <div className="text-center py-8 text-sm text-gray-500 dark:text-gray-400">
                <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400 dark:text-gray-500" />
                <p>No greetings configured.</p>
                <p className="text-xs mt-1">Add a greeting message above.</p>
              </div>
            )}
          </div>
        </div>

        {/* Greetings Status Bar */}
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-center sm:justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {greetingsData.employee.length} greeting messages
            </span>
          </div>
          <div className="flex gap-2 w-full sm:w-auto justify-center sm:justify-end">
            <Button variant="outline" onClick={fetchGreetingsData} disabled={greetingsLoading} startIcon={<RefreshCw className={`w-4 h-4 ${greetingsLoading ? 'animate-spin' : ''}`} />} className="w-full sm:w-auto">Refresh</Button>
            <Button onClick={saveGreetingsData} disabled={greetingsSaving} className="bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto" startIcon={<Save className="w-4 h-4" />}>{greetingsSaving ? 'Saving...' : 'Save Greetings'}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

