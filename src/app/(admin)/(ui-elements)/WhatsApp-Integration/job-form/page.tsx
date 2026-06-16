"use client";
import React, { useState, useEffect } from "react";
import { CheckCircle, Save, RefreshCw, Edit, FileText, Mail, Phone, Briefcase, GraduationCap, Folder, Trash2 } from "lucide-react";
import Alert from "@/components/ui/alert/Alert";
import Button from "@/components/ui/button/Button";
import Input from "@/components/form/input/InputField";

const BASE_API_URL = ('https://wa-mobiloitte.converiqo.ai').replace(/\/+$/, "");
const JOB_FORM_API = `${BASE_API_URL}/admin/job-form`;
const UI_TEXTS_API = `${BASE_API_URL}/admin/job-form/ui-texts`;
const JOB_FAREWELL_API = `${BASE_API_URL}/admin/job-form/job-farewell`;
const BASIC_TEXTS_API = `${BASE_API_URL}/admin/job-form/texts`;
const JOB_TRIGGERS_API = `${BASE_API_URL}/admin/job-triggers`;

type AlertInfo = {
  show: boolean;
  variant: 'success' | 'error';
  title: string;
  message: string;
};

type JobFormData = {
  job_fields: string[];
  job_prompts: string[];
  updated_at?: number;
  source?: string;
};

type UITextsData = {
  job_role: {
    body: string;
    footer: string;
  };
  experience: {
    body: string;
    footer: string;
  };
  updated_at?: number;
  source?: string;
};

type FarewellMessage = {
  type: string;
  content: string;
};

type FarewellData = {
  contact: { email: string; phone: string };
  messages: FarewellMessage[];
  updated_at?: number;
  source?: string;
};

type BasicTexts = {
  job_start_text: string;
  updated_at?: number;
  source?: string;
};

type FieldPromptPair = {
  field: string;
  prompt: string;
};

const getFieldIcon = (fieldName: string) => {
  const field = fieldName.toLowerCase();
  if (field.includes('name')) return <FileText className="w-4 h-4" />;
  if (field.includes('email')) return <Mail className="w-4 h-4" />;
  if (field.includes('mobile') || field.includes('phone')) return <Phone className="w-4 h-4" />;
  if (field.includes('category') || field.includes('role')) return <Briefcase className="w-4 h-4" />;
  if (field.includes('experience')) return <GraduationCap className="w-4 h-4" />;
  if (field.includes('resume')) return <Folder className="w-4 h-4" />;
  return <FileText className="w-4 h-4" />;
};

export default function JobFormManager(): React.JSX.Element {
  const [jobFormData, setJobFormData] = useState<JobFormData>({
    job_fields: [],
    job_prompts: []
  });
  const [uiTextsData, setUITextsData] = useState<UITextsData>({
    job_role: { body: "", footer: "" },
    experience: { body: "", footer: "" }
  });
  const [farewellData, setFarewellData] = useState<FarewellData>({
    contact: { email: "", phone: "" },
    messages: []
  });
  const [basicTexts, setBasicTexts] = useState<BasicTexts>({ job_start_text: "" });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uiTextsLoading, setUITextsLoading] = useState(false);
  const [uiTextsSaving, setUITextsSaving] = useState(false);
  const [farewellLoading, setFarewellLoading] = useState(false);
  const [farewellSaving, setFarewellSaving] = useState(false);
  const [basicTextsLoading, setBasicTextsLoading] = useState(false);
  const [basicTextsSaving, setBasicTextsSaving] = useState(false);
  const [alertInfo, setAlertInfo] = useState<AlertInfo | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingField, setEditingField] = useState("");
  const [editingPrompt, setEditingPrompt] = useState("");

  // Job Triggers state
  const [jobTriggerWords, setJobTriggerWords] = useState<string[]>([]);
  const [newTriggerWord, setNewTriggerWord] = useState("");
  const [bulkWordsText, setBulkWordsText] = useState("");
  const [triggersLoading, setTriggersLoading] = useState(false);
  const [triggerAdding, setTriggerAdding] = useState(false);
  const [triggersBulkSaving, setTriggersBulkSaving] = useState(false);
  const [deletingWord, setDeletingWord] = useState<string | null>(null);

  // Load job form data on component mount
  useEffect(() => {
    fetchJobFormData();
    fetchUITextsData();
    fetchFarewellData();
    fetchBasicTexts();
    fetchJobTriggers();
  }, []);

  const fetchJobFormData = async () => {
    setLoading(true);
    try {
      const response = await fetch(JOB_FORM_API, {
        method: 'GET',
        headers: {
          'accept': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setJobFormData(data);
        setAlertInfo({
          show: true,
          variant: 'success',
          title: 'Data Loaded',
          message: 'Job form data loaded successfully from server.'
        });
      } else {
        throw new Error('Failed to fetch job form data');
      }
    } catch (error) {
      console.error('Error fetching job form data:', error);
      setAlertInfo({
        show: true,
        variant: 'error',
        title: 'Error',
        message: 'Failed to load job form data. Please try again.'
      });
    } finally {
      setLoading(false);
      setTimeout(() => setAlertInfo(null), 4000);
    }
  };

  const saveJobFormData = async () => {
    setSaving(true);
    try {
      const response = await fetch(JOB_FORM_API, {
        method: 'PUT',
        headers: {
          'accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          job_fields: jobFormData.job_fields,
          job_prompts: jobFormData.job_prompts
        })
      });

      if (response.ok) {
        const result = await response.json();
        setAlertInfo({
          show: true,
          variant: 'success',
          title: 'Success!',
          message: `Job form updated successfully. Updated at: ${new Date(result.updated_at * 1000).toLocaleString()}`
        });
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to save job form data');
      }
    } catch (error) {
      console.error('Error saving job form data:', error);
      setAlertInfo({
        show: true,
        variant: 'error',
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to save job form data. Please try again.'
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
          job_role: uiTextsData.job_role,
          experience: uiTextsData.experience
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
      const response = await fetch(JOB_FAREWELL_API, {
        method: 'GET',
        headers: { 'accept': 'application/json' }
      });
      if (response.ok) {
        const data = await response.json();
        // Backend returns { config_name, contact, messages, ... }
        setFarewellData({
          contact: data.contact || { email: '', phone: '' },
          messages: Array.isArray(data.messages) ? data.messages : [],
          updated_at: data.updated_at,
          source: data.source,
        });
      } else {
        throw new Error('Failed to fetch job farewell data');
      }
    } catch (error) {
      console.error('Error fetching job farewell data:', error);
      setAlertInfo({
        show: true,
        variant: 'error',
        title: 'Error',
        message: 'Failed to load job farewell data. Please try again.'
      });
    } finally {
      setFarewellLoading(false);
      setTimeout(() => setAlertInfo(null), 4000);
    }
  };

  const saveFarewellData = async () => {
    setFarewellSaving(true);
    try {
      const response = await fetch(JOB_FAREWELL_API, {
        method: 'PUT',
        headers: {
          'accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contact: farewellData.contact,
          messages: farewellData.messages
        })
      });
      if (response.ok) {
        const result = await response.json();
        setAlertInfo({
          show: true,
          variant: 'success',
          title: 'Success!',
          message: `Job farewell updated successfully. Updated at: ${new Date(result.updated_at * 1000).toLocaleString()}`
        });
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to save job farewell data');
      }
    } catch (error) {
      console.error('Error saving job farewell data:', error);
      setAlertInfo({
        show: true,
        variant: 'error',
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to save job farewell data. Please try again.'
      });
    } finally {
      setFarewellSaving(false);
      setTimeout(() => setAlertInfo(null), 5000);
    }
  };

  const fetchBasicTexts = async () => {
    setBasicTextsLoading(true);
    try {
      const response = await fetch(BASIC_TEXTS_API, {
        method: 'GET',
        headers: { 'accept': 'application/json' }
      });
      if (response.ok) {
        const data = await response.json();
        setBasicTexts({ job_start_text: data.job_start_text || '', updated_at: data.updated_at, source: data.source });
      } else {
        throw new Error('Failed to fetch basic texts');
      }
    } catch (error) {
      console.error('Error fetching basic texts:', error);
      setAlertInfo({ show: true, variant: 'error', title: 'Error', message: 'Failed to load start text.' });
    } finally {
      setBasicTextsLoading(false);
      setTimeout(() => setAlertInfo(null), 4000);
    }
  };

  const saveBasicTexts = async () => {
    setBasicTextsSaving(true);
    try {
      const response = await fetch(BASIC_TEXTS_API, {
        method: 'PUT',
        headers: { 'accept': 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_start_text: basicTexts.job_start_text })
      });
      if (response.ok) {
        const result = await response.json();
        setAlertInfo({ show: true, variant: 'success', title: 'Success!', message: `Start text updated. ${new Date(result.updated_at * 1000).toLocaleString()}` });
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to save start text');
      }
    } catch (error) {
      console.error('Error saving start text:', error);
      setAlertInfo({ show: true, variant: 'error', title: 'Error', message: error instanceof Error ? error.message : 'Failed to save start text.' });
    } finally {
      setBasicTextsSaving(false);
      setTimeout(() => setAlertInfo(null), 5000);
    }
  };

  const updateFarewellContact = (key: 'email' | 'phone', value: string) => {
    setFarewellData(prev => ({
      ...prev,
      contact: { ...prev.contact, [key]: value }
    }));
  };

  const updateFarewellMessage = (index: number, key: 'type' | 'content', value: string) => {
    setFarewellData(prev => ({
      ...prev,
      messages: prev.messages.map((m, i) => i === index ? { ...m, [key]: value } : m)
    }));
  };

  const addFarewellMessage = () => {
    setFarewellData(prev => ({
      ...prev,
      messages: [...prev.messages, { type: 'text', content: '' }]
    }));
  };

  const removeFarewellMessage = (index: number) => {
    setFarewellData(prev => ({
      ...prev,
      messages: prev.messages.filter((_, i) => i !== index)
    }));
  };

  const getFieldPromptPairs = (): FieldPromptPair[] => {
    const pairs: FieldPromptPair[] = [];
    const maxLength = Math.max(jobFormData.job_fields.length, jobFormData.job_prompts.length);

    for (let i = 0; i < maxLength; i++) {
      pairs.push({
        field: jobFormData.job_fields[i] || '',
        prompt: jobFormData.job_prompts[i] || ''
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
      setJobFormData(prev => {
        const newPrompts = [...prev.job_prompts];
        newPrompts[editingIndex] = editingPrompt.trim();

        return {
          ...prev,
          job_prompts: newPrompts
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

  // Job Triggers CRUD
  const fetchJobTriggers = async () => {
    setTriggersLoading(true);
    try {
      const response = await fetch(JOB_TRIGGERS_API, {
        method: 'GET',
        headers: { 'accept': 'application/json' }
      });
      if (!response.ok) throw new Error('Failed to fetch job triggers');
      const data = await response.json();
      setJobTriggerWords(Array.isArray(data.words) ? data.words : []);
    } catch (error) {
      console.error('Error fetching job triggers:', error);
      setAlertInfo({ show: true, variant: 'error', title: 'Error', message: 'Failed to load job triggers.' });
    } finally {
      setTriggersLoading(false);
      setTimeout(() => setAlertInfo(null), 4000);
    }
  };

  const addJobTrigger = async () => {
    const word = newTriggerWord.trim();
    if (!word) return;
    setTriggerAdding(true);
    try {
      const response = await fetch(JOB_TRIGGERS_API, {
        method: 'POST',
        headers: { 'accept': 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ word })
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to add trigger');
      }
      const result = await response.json();
      // Refresh the list from server to ensure consistency
      await fetchJobTriggers();
      setNewTriggerWord("");
      setAlertInfo({ show: true, variant: 'success', title: 'Added', message: `Trigger "${result.word || word}" added successfully.` });
    } catch (error) {
      console.error('Error adding job trigger:', error);
      setAlertInfo({ show: true, variant: 'error', title: 'Error', message: error instanceof Error ? error.message : 'Failed to add trigger.' });
    } finally {
      setTriggerAdding(false);
      setTimeout(() => setAlertInfo(null), 4000);
    }
  };

  const saveBulkJobTriggers = async () => {
    // Parse words separated by commas or new lines
    const words = bulkWordsText
      .split(/[\n,]/)
      .map(w => w.trim())
      .filter(w => w.length > 0);
    setTriggersBulkSaving(true);
    try {
      const response = await fetch(JOB_TRIGGERS_API, {
        method: 'PUT',
        headers: { 'accept': 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ intent: 'job', words })
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to save triggers');
      }
      const result = await response.json();
      setJobTriggerWords(words);
      setBulkWordsText('');
      setAlertInfo({ show: true, variant: 'success', title: 'Saved', message: `Job triggers updated successfully. ${result.count || words.length} words saved.` });
    } catch (error) {
      console.error('Error saving job triggers:', error);
      setAlertInfo({ show: true, variant: 'error', title: 'Error', message: error instanceof Error ? error.message : 'Failed to save triggers.' });
    } finally {
      setTriggersBulkSaving(false);
      setTimeout(() => setAlertInfo(null), 4000);
    }
  };

  const deleteJobTrigger = async (word: string) => {
    setDeletingWord(word);
    try {
      const url = `${JOB_TRIGGERS_API}?word=${encodeURIComponent(word)}`;
      const response = await fetch(url, { method: 'DELETE', headers: { 'accept': 'application/json' } });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to delete trigger');
      }
      const result = await response.json();
      // Refresh the list from server to ensure consistency
      await fetchJobTriggers();
      setAlertInfo({ show: true, variant: 'success', title: 'Deleted', message: `Trigger "${result.word || word}" removed successfully.` });
    } catch (error) {
      console.error('Error deleting job trigger:', error);
      setAlertInfo({ show: true, variant: 'error', title: 'Error', message: error instanceof Error ? error.message : 'Failed to delete trigger.' });
    } finally {
      setDeletingWord(null);
      setTimeout(() => setAlertInfo(null), 4000);
    }
  };


  const isFormValid = jobFormData.job_fields.length > 0 && jobFormData.job_prompts.length > 0;

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
                      {editingField}
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
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{pair.field}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">{pair.prompt}</div>
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
              onClick={fetchJobFormData}
              disabled={loading}
              startIcon={<RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />}
              className="w-full sm:w-auto"
            >
              Refresh
            </Button>
            <Button
              onClick={saveJobFormData}
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
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Job Application UI Texts</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Job Role Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-blue-600" />
                <h3 className="text-md font-medium text-gray-900 dark:text-white">Job Role</h3>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Body Text
                  </label>
                  <Input
                    value={uiTextsData.job_role.body}
                    onChange={(e) => setUITextsData(prev => ({
                      ...prev,
                      job_role: { ...prev.job_role, body: e.target.value }
                    }))}
                    placeholder="Choose the role you're applying for:"
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Footer Text
                  </label>
                  <Input
                    value={uiTextsData.job_role.footer}
                    onChange={(e) => setUITextsData(prev => ({
                      ...prev,
                      job_role: { ...prev.job_role, footer: e.target.value }
                    }))}
                    placeholder="Select your preferred role"
                    className="w-full"
                  />
                </div>
              </div>
            </div>

            {/* Experience Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-green-600" />
                <h3 className="text-md font-medium text-gray-900 dark:text-white">Experience</h3>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Body Text
                  </label>
                  <Input
                    value={uiTextsData.experience.body}
                    onChange={(e) => setUITextsData(prev => ({
                      ...prev,
                      experience: { ...prev.experience, body: e.target.value }
                    }))}
                    placeholder="Choose your experience level:"
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Footer Text
                  </label>
                  <Input
                    value={uiTextsData.experience.footer}
                    onChange={(e) => setUITextsData(prev => ({
                      ...prev,
                      experience: { ...prev.experience, footer: e.target.value }
                    }))}
                    placeholder="Select your experience range"
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
              UI Texts Configuration • Job Role & Experience
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

      {/* Job Farewell Section */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 mb-8 border border-gray-100 dark:border-gray-700">
        {/* Header */}
        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A4 4 0 107 12.001h1.5" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 100-6 3 3 0 000 6z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Job Farewell</h1>
        </div>

        {/* Contact Card */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Mail className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Contact</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
              <Input value={farewellData.contact.email} onChange={(e) => updateFarewellContact('email', e.target.value)} placeholder="careers@Mobiloitte.com" className="w-full text-xs md:text-sm placeholder:text-xs md:placeholder:text-sm placeholder:text-center md:placeholder:text-left" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label>
              <Input value={farewellData.contact.phone} onChange={(e) => updateFarewellContact('phone', e.target.value)} placeholder="1800-569-1801" className="w-full text-xs md:text-sm placeholder:text-xs md:placeholder:text-sm placeholder:text-center md:placeholder:text-left" />
            </div>
          </div>
        </div>

        {/* Messages Card */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Messages</h2>
            </div>
            <div className="flex gap-2 w-full sm:w-auto justify-center">
              <Button variant="outline" onClick={addFarewellMessage} className="px-3 py-1.5 w-full sm:w-auto">
                + Add Message
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            {farewellData.messages.map((msg, index) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-3 rounded-xl shadow-sm">
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Type</label>
                  <Input value={msg.type} onChange={(e) => updateFarewellMessage(index, 'type', e.target.value)} placeholder="text | job_id" className="w-full text-xs md:text-sm placeholder:text-xs md:placeholder:text-sm placeholder:text-center md:placeholder:text-left" />
                </div>
                <div className="md:col-span-9">
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Content</label>
                  <Input value={msg.content} onChange={(e) => updateFarewellMessage(index, 'content', e.target.value)} placeholder="Message content..." className="w-full text-xs md:text-sm placeholder:text-xs md:placeholder:text-sm placeholder:text-center md:placeholder:text-left" />
                </div>
                <div className="md:col-span-1 flex justify-center md:justify-end items-start">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removeFarewellMessage(index)}
                    aria-label="Remove message"
                    className="text-red-600 dark:text-red-400 p-2 w-9 md:w-auto justify-center"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
            {farewellData.messages.length === 0 && (
              <div className="text-sm text-gray-500 dark:text-gray-400">No messages. Click &quot;Add Message&quot; to create one.</div>
            )}
          </div>
        </div>

        {/* Farewell Status Bar */}
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-center sm:justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {farewellData.messages.length} messages • Contact set
            </span>
          </div>
          <div className="flex gap-2 w-full sm:w-auto justify-center sm:justify-end">
            <Button variant="outline" onClick={fetchFarewellData} disabled={farewellLoading} startIcon={<RefreshCw className={`w-4 h-4 ${farewellLoading ? 'animate-spin' : ''}`} />} className="w-full sm:w-auto">Refresh</Button>
            <Button onClick={saveFarewellData} disabled={farewellSaving} className="bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto" startIcon={<Save className="w-4 h-4" />}>{farewellSaving ? 'Saving...' : 'Save Farewell'}</Button>
          </div>
        </div>
      </div>

      {/* Start Text Section */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 mb-8 border border-gray-100 dark:border-gray-700">
        {/* Header */}
        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 bg-amber-100 dark:bg-amber-900 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c.637 0 1.149-.492 1.149-1.1 0-.607-.512-1.1-1.149-1.1-.636 0-1.149.493-1.149 1.1 0 .608.513 1.1 1.149 1.1zM11 10h2v6h-2z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Start Text</h1>
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Job Start Text</label>
          <Input
            value={basicTexts.job_start_text}
            onChange={(e) => setBasicTexts(prev => ({ ...prev, job_start_text: e.target.value }))}
            placeholder="🚀 Let's apply for a job at Mobiloitte!"
            className="w-full text-xs md:text-sm placeholder:text-xs md:placeholder:text-sm placeholder:text-center md:placeholder:text-left"
          />
        </div>

        <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-center sm:justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">Job Start Text</span>
          </div>
          <div className="flex gap-2 w-full sm:w-auto justify-center sm:justify-end">
            <Button variant="outline" onClick={fetchBasicTexts} disabled={basicTextsLoading} startIcon={<RefreshCw className={`w-4 h-4 ${basicTextsLoading ? 'animate-spin' : ''}`} />} className="w-full sm:w-auto">Refresh</Button>
            <Button onClick={saveBasicTexts} disabled={basicTextsSaving} className="bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto" startIcon={<Save className="w-4 h-4" />}>{basicTextsSaving ? 'Saving...' : 'Save Start Text'}</Button>
          </div>
        </div>
      </div>

      {/* Job Triggers Section */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 mb-8 border border-gray-100 dark:border-gray-700">
        {/* Header */}
        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 bg-cyan-100 dark:bg-cyan-900 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-cyan-600 dark:text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h6m-6 4h10" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Job Triggers</h1>
        </div>

        {/* Triggers Card */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Trigger Words</h2>
            </div>
            <div className="flex gap-2 w-full sm:w-auto justify-center">
              <Button variant="outline" onClick={fetchJobTriggers} disabled={triggersLoading} startIcon={<RefreshCw className={`w-4 h-4 ${triggersLoading ? 'animate-spin' : ''}`} />} className="px-3 py-1.5 w-full sm:w-auto">Refresh</Button>
            </div>
          </div>

          {/* Add single trigger */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start mb-4">
            <div className="md:col-span-9">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Add Single Word</label>
              <Input value={newTriggerWord} onChange={(e) => setNewTriggerWord(e.target.value)} placeholder="e.g., Opening" className="w-full text-xs md:text-sm placeholder:text-xs md:placeholder:text-sm placeholder:text-center md:placeholder:text-left" />
            </div>
            <div className="md:col-span-3 flex items-end">
              <Button onClick={addJobTrigger} disabled={triggerAdding || !newTriggerWord.trim()} className="bg-green-600 hover:bg-green-700 text-white w-full" startIcon={<Save className="w-4 h-4" />}>{triggerAdding ? 'Adding...' : 'Add Word'}</Button>
            </div>
          </div>

          {/* Bulk overwrite */}
          <div className="space-y-2 mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Bulk Overwrite (comma or newline separated)</label>
            <textarea
              value={bulkWordsText}
              onChange={(e) => setBulkWordsText(e.target.value)}
              placeholder="job\njobs\ncareer, openings"
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100 p-3 focus:outline-none"
              rows={4}
            />
            <div className="flex justify-end">
              <Button onClick={saveBulkJobTriggers} disabled={triggersBulkSaving} className="bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto" startIcon={<Save className="w-4 h-4" />}>{triggersBulkSaving ? 'Saving...' : 'Save All'}</Button>
            </div>
          </div>

          {/* Word list */}
          <div className="flex flex-wrap gap-2">
            {jobTriggerWords.length === 0 && (
              <span className="text-sm text-gray-500 dark:text-gray-400">No trigger words configured.</span>
            )}
            {jobTriggerWords.map((word) => (
              <div key={word} className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-full border border-gray-200 dark:border-gray-600">
                <span className="text-sm">{word}</span>
                <button
                  type="button"
                  onClick={() => deleteJobTrigger(word)}
                  disabled={deletingWord === word}
                  className="text-red-600 dark:text-red-400 hover:text-red-700"
                  aria-label={`Remove ${word}`}
                >
                  <Trash2 className={`w-4 h-4 ${deletingWord === word ? 'opacity-50' : ''}`} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Triggers Status Bar */}
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-center sm:justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {jobTriggerWords.length} trigger words
            </span>
          </div>
          <div className="flex gap-2 w-full sm:w-auto justify-center sm:justify-end">
            <Button variant="outline" onClick={fetchJobTriggers} disabled={triggersLoading} startIcon={<RefreshCw className={`w-4 h-4 ${triggersLoading ? 'animate-spin' : ''}`} />} className="w-full sm:w-auto">Refresh</Button>
            <Button onClick={saveBulkJobTriggers} disabled={triggersBulkSaving} className="bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto" startIcon={<Save className="w-4 h-4" />}>{triggersBulkSaving ? 'Saving...' : 'Save All'}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
