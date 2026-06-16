"use client";
import React, { useState, useEffect } from "react";
import { CheckCircle, Save, RefreshCw, Edit, FileText, Mail, Phone, Briefcase, Globe, User, Trash2, Plus } from "lucide-react";
import Alert from "@/components/ui/alert/Alert";
import Button from "@/components/ui/button/Button";
import Input from "@/components/form/input/InputField";

const BASE_API_URL = (process.env.NEXT_PUBLIC_WHATSAPP_BOT_API_URL || process.env.NEXT_PUBLIC_API_URL || "https://wa-mobiloitte.converiqo.ai").replace(/\/+$/, "");
const LEAD_FORM_API = `${BASE_API_URL}/admin/lead-form`;
const UI_TEXTS_API = `${BASE_API_URL}/admin/lead-form/ui-texts`;
const LEAD_TEXTS_API = `${BASE_API_URL}/admin/lead-form/texts`;
const FAREWELLS_API = `${BASE_API_URL}/admin/lead-form/farewells`;

type AlertInfo = {
  show: boolean;
  variant: 'success' | 'error';
  title: string;
  message: string;
};

type LeadFormData = {
  lead_fields: string[];
  lead_prompts: string[];
  updated_at?: number;
  source?: string;
};

type UITextsData = {
  interest: {
    body: string;
    footer: string;
  };
  source: {
    body: string;
    footer: string;
  };
  updated_at?: number;
  source_meta?: string;
};

type FarewellMessage = {
  type: string;
  content: string;
};

type FarewellData = {
  greetings: FarewellMessage[];
  updated_at?: number;
  source?: string;
};

type LeadTexts = {
  config_name?: string;
  lead_start_text: string;
  lead_start_prompts: string[];
  updated_at?: number;
  source?: string;
};

type FieldPromptPair = {
  field: string;
  prompt: string;
};

const getFieldIcon = (fieldName: string) => {
  const field = fieldName.toLowerCase();
  if (field.includes('name')) return <User className="w-4 h-4" />;
  if (field.includes('email')) return <Mail className="w-4 h-4" />;
  if (field.includes('mobile') || field.includes('phone')) return <Phone className="w-4 h-4" />;
  if (field.includes('interest')) return <Briefcase className="w-4 h-4" />;
  if (field.includes('source')) return <Globe className="w-4 h-4" />;
  if (field.includes('additional') || field.includes('info')) return <FileText className="w-4 h-4" />;
  return <FileText className="w-4 h-4" />;
};

const formatFieldName = (fieldName: string): string => {
  return fieldName
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

export default function LeadFormManager(): React.JSX.Element {
  const [leadFormData, setLeadFormData] = useState<LeadFormData>({
    lead_fields: [],
    lead_prompts: []
  });
  const [uiTextsData, setUITextsData] = useState<UITextsData>({
    interest: { body: "", footer: "" },
    source: { body: "", footer: "" }
  });
  const [farewellData, setFarewellData] = useState<FarewellData>({
    greetings: []
  });
  const [leadTexts, setLeadTexts] = useState<LeadTexts>({
    lead_start_text: "",
    lead_start_prompts: []
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uiTextsLoading, setUITextsLoading] = useState(false);
  const [uiTextsSaving, setUITextsSaving] = useState(false);
  const [farewellLoading, setFarewellLoading] = useState(false);
  const [farewellSaving, setFarewellSaving] = useState(false);
  const [leadTextsLoading, setLeadTextsLoading] = useState(false);
  const [leadTextsSaving, setLeadTextsSaving] = useState(false);
  const [alertInfo, setAlertInfo] = useState<AlertInfo | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingField, setEditingField] = useState("");
  const [editingPrompt, setEditingPrompt] = useState("");
  const [newPrompt, setNewPrompt] = useState("");
  const [addingNewMessage, setAddingNewMessage] = useState(false);
  const [newMessageType, setNewMessageType] = useState<'text' | 'job_id'>('text');
  const [newMessageContent, setNewMessageContent] = useState("");

  // Load all data on component mount
  useEffect(() => {
    fetchLeadFormData();
    fetchUITextsData();
    fetchFarewellData();
    fetchLeadTexts();
  }, []);

  const fetchLeadFormData = async () => {
    setLoading(true);
    try {
      const response = await fetch(LEAD_FORM_API, {
        method: 'GET',
        headers: {
          'accept': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setLeadFormData(data);
        setAlertInfo({
          show: true,
          variant: 'success',
          title: 'Data Loaded',
          message: 'Lead form data loaded successfully from server.'
        });
      } else {
        throw new Error('Failed to fetch lead form data');
      }
    } catch (error) {
      console.error('Error fetching lead form data:', error);
      setAlertInfo({
        show: true,
        variant: 'error',
        title: 'Error',
        message: 'Failed to load lead form data. Please try again.'
      });
    } finally {
      setLoading(false);
      setTimeout(() => setAlertInfo(null), 4000);
    }
  };

  const saveLeadFormData = async () => {
    setSaving(true);
    try {
      const response = await fetch(LEAD_FORM_API, {
        method: 'PUT',
        headers: {
          'accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          lead_fields: leadFormData.lead_fields,
          lead_prompts: leadFormData.lead_prompts
        })
      });

      if (response.ok) {
        const result = await response.json();
        setAlertInfo({
          show: true,
          variant: 'success',
          title: 'Success!',
          message: `Lead form updated successfully. Updated at: ${new Date(result.updated_at * 1000).toLocaleString()}`
        });
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to save lead form data');
      }
    } catch (error) {
      console.error('Error saving lead form data:', error);
      setAlertInfo({
        show: true,
        variant: 'error',
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to save lead form data. Please try again.'
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
        setUITextsData(data);
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
      const response = await fetch(UI_TEXTS_API, {
        method: 'PUT',
        headers: {
          'accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          interest: uiTextsData.interest,
          source: uiTextsData.source
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

  const fetchFarewellData = async () => {
    setFarewellLoading(true);
    try {
      const response = await fetch(FAREWELLS_API, {
        method: 'GET',
        headers: { 'accept': 'application/json' }
      });
      if (response.ok) {
        const data = await response.json();
        setFarewellData({
          greetings: Array.isArray(data.greetings) ? data.greetings : [],
          updated_at: data.updated_at,
          source: data.source,
        });
      } else {
        throw new Error('Failed to fetch farewell data');
      }
    } catch (error) {
      console.error('Error fetching farewell data:', error);
      setAlertInfo({
        show: true,
        variant: 'error',
        title: 'Error',
        message: 'Failed to load farewell data. Please try again.'
      });
    } finally {
      setFarewellLoading(false);
      setTimeout(() => setAlertInfo(null), 4000);
    }
  };

  const saveFarewellData = async () => {
    setFarewellSaving(true);
    try {
      const response = await fetch(FAREWELLS_API, {
        method: 'PUT',
        headers: {
          'accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          greetings: farewellData.greetings
        })
      });
      if (response.ok) {
        const result = await response.json();
        setAlertInfo({
          show: true,
          variant: 'success',
          title: 'Success!',
          message: `Farewell messages updated successfully. Updated at: ${new Date(result.updated_at * 1000).toLocaleString()}`
        });
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to save farewell data');
      }
    } catch (error) {
      console.error('Error saving farewell data:', error);
      setAlertInfo({
        show: true,
        variant: 'error',
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to save farewell data. Please try again.'
      });
    } finally {
      setFarewellSaving(false);
      setTimeout(() => setAlertInfo(null), 5000);
    }
  };

  const fetchLeadTexts = async () => {
    setLeadTextsLoading(true);
    try {
      const response = await fetch(LEAD_TEXTS_API, {
        method: 'GET',
        headers: { 'accept': 'application/json' }
      });
      if (response.ok) {
        const data = await response.json();
        setLeadTexts({
          config_name: data.config_name,
          lead_start_text: data.lead_start_text || '',
          lead_start_prompts: Array.isArray(data.lead_start_prompts) ? data.lead_start_prompts : [],
          updated_at: data.updated_at,
          source: data.source
        });
      } else {
        throw new Error('Failed to fetch lead texts');
      }
    } catch (error) {
      console.error('Error fetching lead texts:', error);
      setAlertInfo({ show: true, variant: 'error', title: 'Error', message: 'Failed to load lead texts.' });
    } finally {
      setLeadTextsLoading(false);
      setTimeout(() => setAlertInfo(null), 4000);
    }
  };

  const saveLeadTexts = async () => {
    setLeadTextsSaving(true);
    try {
      const response = await fetch(LEAD_TEXTS_API, {
        method: 'PUT',
        headers: { 'accept': 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config_name: leadTexts.config_name || "lead_flow_texts",
          lead_start_text: leadTexts.lead_start_text,
          lead_start_prompts: leadTexts.lead_start_prompts
        })
      });
      if (response.ok) {
        const result = await response.json();
        setAlertInfo({ show: true, variant: 'success', title: 'Success!', message: `Lead texts updated. ${new Date(result.updated_at * 1000).toLocaleString()}` });
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to save lead texts');
      }
    } catch (error) {
      console.error('Error saving lead texts:', error);
      setAlertInfo({ show: true, variant: 'error', title: 'Error', message: error instanceof Error ? error.message : 'Failed to save lead texts.' });
    } finally {
      setLeadTextsSaving(false);
      setTimeout(() => setAlertInfo(null), 5000);
    }
  };

  const updateFarewellMessage = (index: number, key: 'type' | 'content', value: string) => {
    setFarewellData(prev => ({
      ...prev,
      greetings: prev.greetings.map((m, i) => i === index ? { ...m, [key]: value } : m)
    }));
  };

  const addFarewellMessage = () => {
    setAddingNewMessage(true);
    setNewMessageType('text');
    setNewMessageContent("");
  };

  const saveNewFarewellMessage = () => {
    if (newMessageContent.trim()) {
      setFarewellData(prev => ({
        ...prev,
        greetings: [...prev.greetings, { type: newMessageType, content: newMessageContent.trim() }]
      }));
      setAddingNewMessage(false);
      setNewMessageType('text');
      setNewMessageContent("");
    }
  };

  const cancelNewFarewellMessage = () => {
    setAddingNewMessage(false);
    setNewMessageType('text');
    setNewMessageContent("");
  };

  const removeFarewellMessage = (index: number) => {
    setFarewellData(prev => ({
      ...prev,
      greetings: prev.greetings.filter((_, i) => i !== index)
    }));
  };

  const addLeadStartPrompt = () => {
    if (newPrompt.trim()) {
      setLeadTexts(prev => ({
        ...prev,
        lead_start_prompts: [...prev.lead_start_prompts, newPrompt.trim()]
      }));
      setNewPrompt("");
    }
  };

  const removeLeadStartPrompt = (index: number) => {
    setLeadTexts(prev => ({
      ...prev,
      lead_start_prompts: prev.lead_start_prompts.filter((_, i) => i !== index)
    }));
  };

  const getFieldPromptPairs = (): FieldPromptPair[] => {
    const pairs: FieldPromptPair[] = [];
    const maxLength = Math.max(leadFormData.lead_fields.length, leadFormData.lead_prompts.length);

    for (let i = 0; i < maxLength; i++) {
      pairs.push({
        field: leadFormData.lead_fields[i] || '',
        prompt: leadFormData.lead_prompts[i] || ''
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
      setLeadFormData(prev => {
        const newPrompts = [...prev.lead_prompts];
        newPrompts[editingIndex] = editingPrompt.trim();

        return {
          ...prev,
          lead_prompts: newPrompts
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

  const isFormValid = leadFormData.lead_fields.length > 0 && leadFormData.lead_prompts.length > 0;

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
            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Fields with Prompts</h1>
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
              onClick={fetchLeadFormData}
              disabled={loading}
              startIcon={<RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />}
              className="w-full sm:w-auto"
            >
              Refresh
            </Button>
            <Button
              onClick={saveLeadFormData}
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
            <Briefcase className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Lead Form UI Texts</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Interest Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-blue-600" />
                <h3 className="text-md font-medium text-gray-900 dark:text-white">Interest</h3>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Body Text
                  </label>
                  <Input
                    value={uiTextsData.interest.body}
                    onChange={(e) => setUITextsData(prev => ({
                      ...prev,
                      interest: { ...prev.interest, body: e.target.value }
                    }))}
                    placeholder="Please choose your area of interest."
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Footer Text
                  </label>
                  <Input
                    value={uiTextsData.interest.footer}
                    onChange={(e) => setUITextsData(prev => ({
                      ...prev,
                      interest: { ...prev.interest, footer: e.target.value }
                    }))}
                    placeholder="Select your area of interest"
                    className="w-full"
                  />
                </div>
              </div>
            </div>

            {/* Source Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-green-600" />
                <h3 className="text-md font-medium text-gray-900 dark:text-white">Source</h3>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Body Text
                  </label>
                  <Input
                    value={uiTextsData.source.body}
                    onChange={(e) => setUITextsData(prev => ({
                      ...prev,
                      source: { ...prev.source, body: e.target.value }
                    }))}
                    placeholder="Please select how you came across us."
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Footer Text
                  </label>
                  <Input
                    value={uiTextsData.source.footer}
                    onChange={(e) => setUITextsData(prev => ({
                      ...prev,
                      source: { ...prev.source, footer: e.target.value }
                    }))}
                    placeholder="Select your referral source"
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
              UI Texts Configuration • Interest & Source
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

      {/* Lead Flow Texts Section */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 mb-8 border border-gray-100 dark:border-gray-700">
        {/* Header */}
        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 bg-amber-100 dark:bg-amber-900 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c.637 0 1.149-.492 1.149-1.1 0-.607-.512-1.1-1.149-1.1-.636 0-1.149.493-1.149 1.1 0 .608.513 1.1 1.149 1.1zM11 10h2v6h-2z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Lead Flow Texts</h1>
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 mb-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Lead Start Text</label>
              <Input
                value={leadTexts.lead_start_text}
                onChange={(e) => setLeadTexts(prev => ({ ...prev, lead_start_text: e.target.value }))}
                placeholder="Let's understand your requirement."
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Lead Start Prompts</label>
              <div className="space-y-2">
                {leadTexts.lead_start_prompts.map((prompt, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      value={prompt}
                      onChange={(e) => {
                        const newPrompts = [...leadTexts.lead_start_prompts];
                        newPrompts[index] = e.target.value;
                        setLeadTexts(prev => ({ ...prev, lead_start_prompts: newPrompts }));
                      }}
                      placeholder="Enter prompt text"
                      className="flex-1"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeLeadStartPrompt(index)}
                      className="text-red-600 dark:text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                <div className="flex items-center gap-2">
                  <Input
                    value={newPrompt}
                    onChange={(e) => setNewPrompt(e.target.value)}
                    placeholder="Add new prompt..."
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={addLeadStartPrompt}
                    disabled={!newPrompt.trim()}
                    className="text-green-600 dark:text-green-400"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-center sm:justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              Lead Start Text • {leadTexts.lead_start_prompts.length} prompts
            </span>
          </div>
          <div className="flex gap-2 w-full sm:w-auto justify-center sm:justify-end">
            <Button variant="outline" onClick={fetchLeadTexts} disabled={leadTextsLoading} startIcon={<RefreshCw className={`w-4 h-4 ${leadTextsLoading ? 'animate-spin' : ''}`} />} className="w-full sm:w-auto">Refresh</Button>
            <Button onClick={saveLeadTexts} disabled={leadTextsSaving} className="bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto" startIcon={<Save className="w-4 h-4" />}>{leadTextsSaving ? 'Saving...' : 'Save Lead Texts'}</Button>
          </div>
        </div>
      </div>

      {/* Farewell Messages Section */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 mb-8 border border-gray-100 dark:border-gray-700">
        {/* Header */}
        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A4 4 0 107 12.001h1.5" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 100-6 3 3 0 000 6z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Farewell Messages</h1>
        </div>

        {/* Messages Card */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Greetings</h2>
            </div>
            <div className="flex gap-2 w-full sm:w-auto justify-center">
              <Button
                variant="outline"
                onClick={addFarewellMessage}
                disabled={addingNewMessage}
                className="px-3 py-1.5 w-full sm:w-auto"
                startIcon={<Plus className="w-4 h-4" />}
              >
                {addingNewMessage ? 'Adding...' : 'Add Message'}
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            {farewellData.greetings.map((msg, index) => (
              <div key={index} className="flex items-start gap-3 p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 rounded-xl border border-gray-200 dark:border-gray-600 shadow-sm hover:shadow-md transition-shadow">
                {/* Type Badge */}
                <div className="flex-shrink-0">
                  <div className="flex flex-col items-center gap-2">
                    <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold ${msg.type === 'job_id'
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                        : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      }`}>
                      {msg.type === 'job_id' ? 'Job ID' : 'Text'}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wide">Message Content</label>
                  <Input
                    value={msg.content}
                    onChange={(e) => updateFarewellMessage(index, 'content', e.target.value)}
                    placeholder="Enter message content... (Use {id} for job ID placeholder)"
                    className="w-full"
                  />
                  {msg.type === 'job_id' && (
                    <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400 italic">
                      💡 Tip: Use {"{id}"} placeholder for dynamic job ID
                    </p>
                  )}
                </div>

                {/* Delete Button */}
                <div className="flex-shrink-0 flex items-start pt-7">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removeFarewellMessage(index)}
                    aria-label="Remove message"
                    className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 p-2"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}

            {/* Add New Message Form */}
            {addingNewMessage && (
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-xl shadow-sm">
                <div className="flex items-start gap-3">
                  {/* Type Selector */}
                  <div className="flex-shrink-0">
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide">Type</label>
                    <select
                      value={newMessageType}
                      onChange={(e) => setNewMessageType(e.target.value as 'text' | 'job_id')}
                      className="h-10 w-32 appearance-none rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="text">Text</option>
                      <option value="job_id">Job ID</option>
                    </select>
                  </div>

                  {/* Content Input */}
                  <div className="flex-1 min-w-0">
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide">Content</label>
                    <Input
                      value={newMessageContent}
                      onChange={(e) => setNewMessageContent(e.target.value)}
                      placeholder="Enter message content..."
                      className="w-full"
                    />
                    {newMessageType === 'job_id' && (
                      <p className="mt-1.5 text-xs text-blue-600 dark:text-blue-400 italic">
                        💡 Tip: Use {"{id}"} placeholder for dynamic job ID
                      </p>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex-shrink-0 flex items-start gap-2 pt-7">
                    <Button
                      size="sm"
                      onClick={saveNewFarewellMessage}
                      disabled={!newMessageContent.trim()}
                      className="bg-green-600 hover:bg-green-700 text-white px-4"
                      startIcon={<Save className="w-4 h-4" />}
                    >
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={cancelNewFarewellMessage}
                      className="px-4"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {farewellData.greetings.length === 0 && !addingNewMessage && (
              <div className="text-center py-8 text-sm text-gray-500 dark:text-gray-400">
                <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400 dark:text-gray-500" />
                <p>No farewell messages configured.</p>
                <p className="text-xs mt-1">Click &quot;Add Message&quot; to create one.</p>
              </div>
            )}
          </div>
        </div>

        {/* Farewell Status Bar */}
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-center sm:justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {farewellData.greetings.length} farewell messages
            </span>
          </div>
          <div className="flex gap-2 w-full sm:w-auto justify-center sm:justify-end">
            <Button variant="outline" onClick={fetchFarewellData} disabled={farewellLoading} startIcon={<RefreshCw className={`w-4 h-4 ${farewellLoading ? 'animate-spin' : ''}`} />} className="w-full sm:w-auto">Refresh</Button>
            <Button onClick={saveFarewellData} disabled={farewellSaving} className="bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto" startIcon={<Save className="w-4 h-4" />}>{farewellSaving ? 'Saving...' : 'Save Farewell'}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

