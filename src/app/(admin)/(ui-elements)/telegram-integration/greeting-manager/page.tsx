"use client";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import type { JSX } from "react";
import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Alert from "@/components/ui/alert/Alert";
import { Plus, RefreshCw, Eye, Trash2, Edit3, Check, X, ShieldAlert } from "lucide-react";

type GreetingMessage = {
  message_type: string;
  title: string;
  content: string;
  description?: string;
  status?: "active" | "inactive";
  created_at?: number | string;
  updated_at?: number | string;
  is_core?: boolean;
};

type StatsSummary = {
  total: number;
  active: number;
  inactive: number;
  active_percentage: number; // 0-100
  message_types?: string[];
};

type TriggerIntent = "greet" | "about";

// API response types
type ApiMessageResponse = {
  message_type?: string;
  title?: string;
  content?: string;
  description?: string;
  is_active?: boolean;
  created_at?: number | string;
  updated_at?: number | string;
  is_core?: boolean;
};

type ApiPreviewResponse = {
  content?: string;
} | null;

const CORE_TYPES = new Set(["first_greeting", "about_message"]);

const BASE_API_URL = "https://telegram-aiagent.mobiloitte.io";
const API_PREFIX = `${BASE_API_URL}/api/telegram`;
const ADMIN_PREFIX = `${API_PREFIX}/admin/greetings`;

const sectionClass = "bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 md:p-8 border border-gray-100 dark:border-gray-700";

function toArrayContent(raw: string): string[] {
  return raw
    .split("\n")
    .map(s => s.trim())
    .filter(Boolean);
}

function sanitizeText(s: string): string {
  return s.replace(/[<>]/g, "");
}

export default function GreetingManagerPage(): JSX.Element {
  const [stats, setStats] = useState<StatsSummary | null>(null);
  const [messages, setMessages] = useState<GreetingMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorAlert, setErrorAlert] = useState<string | null>(null);
  const [successAlert, setSuccessAlert] = useState<string | null>(null);

  // Create/Edit modal state
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editIsNew, setEditIsNew] = useState(true);
  const [editOriginalType, setEditOriginalType] = useState<string | null>(null);
  const [showCustomTypeInput, setShowCustomTypeInput] = useState(false);
  const [form, setForm] = useState<{
    message_type: string;
    title: string;
    content: string; // textarea; supports multi-line for arrays
    description?: string;
    status: "active" | "inactive";
    isArray: boolean;
  }>({ message_type: "", title: "", content: "", description: "", status: "active", isArray: false });
  const [formErrors, setFormErrors] = useState<Record<string, string | null>>({});

  // Preview modal
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewFor, setPreviewFor] = useState<GreetingMessage | null>(null);

  // Delete confirm
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteFor, setDeleteFor] = useState<GreetingMessage | null>(null);

  // Triggers
  const [greetTriggers, setGreetTriggers] = useState<string[]>([]);
  const [aboutTriggers, setAboutTriggers] = useState<string[]>([]);
  const [newTrigger, setNewTrigger] = useState<{ intent: TriggerIntent; value: string }>({ intent: "greet", value: "" });
  // Menu triggers
  const [menuTriggers, setMenuTriggers] = useState<string[]>([]);
  const [newMenuWord, setNewMenuWord] = useState<string>("");

  const activePercentage = useMemo(() => {
    if (!stats) return 0;
    return Math.round(stats.active_percentage);
  }, [stats]);

  const showError = useCallback((msg: string) => {
    setErrorAlert(msg);
    setTimeout(() => setErrorAlert(null), 4500);
  }, []);

  const showSuccess = useCallback((msg: string) => {
    setSuccessAlert(msg);
    setTimeout(() => setSuccessAlert(null), 3000);
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`${ADMIN_PREFIX}/stats/summary`, { headers: { accept: "application/json" } });
      if (!res.ok) throw new Error("Failed to load stats");
      const data = await res.json();
      const total = data.total_messages ?? data.total ?? 0;
      const active = data.active_messages ?? data.active ?? 0;
      const inactive = data.inactive_messages ?? data.inactive ?? Math.max(0, total - active);
      const activePct = data.active_percentage ?? (total ? Math.round((active / total) * 100) : 0);
      const message_types: string[] | undefined = data.message_types ?? data.types ?? undefined;
      setStats({ total, active, inactive, active_percentage: activePct, message_types });
    } catch (e) {
      showError(e instanceof Error ? e.message : "Failed to load stats");
    }
  }, [showError]);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(`${ADMIN_PREFIX}`);
      if (!res.ok) throw new Error("Failed to load messages");
      const data = await res.json();
      const list = Array.isArray(data) ? data : (data.messages ?? []);
      const mapped: GreetingMessage[] = list.map((it: ApiMessageResponse) => ({
        message_type: String(it.message_type ?? ""),
        title: String(it.title ?? ""),
        content: String(it.content ?? ""),
        description: it.description ?? undefined,
        status: (it.is_active ?? true) ? "active" : "inactive",
        created_at: it.created_at,
        updated_at: it.updated_at,
        is_core: Boolean(it.is_core),
      }));
      setMessages(mapped);
    } catch (e) {
      showError(e instanceof Error ? e.message : "Failed to load messages");
    }
  }, [showError]);

  const fetchTriggers = useCallback(async (intent: TriggerIntent) => {
    try {
      const res = await fetch(`${ADMIN_PREFIX}/triggers/${intent}`);
      if (!res.ok) throw new Error("Failed to load triggers");
      const data = await res.json();
      const list = Array.isArray(data) ? data : (data.words ?? data.triggers ?? []);
      if (intent === "greet") setGreetTriggers(list);
      if (intent === "about") setAboutTriggers(list);
    } catch (e) {
      showError(e instanceof Error ? e.message : "Failed to load triggers");
    }
  }, [showError]);

  const fetchMenuTriggers = useCallback(async () => {
    try {
      const res = await fetch(`${API_PREFIX}/admin/menu-triggers`);
      if (!res.ok) throw new Error("Failed to load menu triggers");
      const data = await res.json();
      const list: string[] = Array.isArray(data) ? data : (data.words ?? []);
      setMenuTriggers(list);
    } catch (e) {
      showError(e instanceof Error ? e.message : "Failed to load menu triggers");
    }
  }, [showError]);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([
      fetchStats(),
      fetchMessages(),
      fetchTriggers("greet"),
      fetchTriggers("about"),
      fetchMenuTriggers(),
    ]);
    setLoading(false);
  }, [fetchStats, fetchMessages, fetchTriggers, fetchMenuTriggers]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  // Validation
  function validateForm(): boolean {
    const errs: Record<string, string | null> = {};
    if (!form.message_type.trim()) errs.message_type = "Required";
    if (!form.title.trim()) errs.title = "Required";
    if (!form.content.trim()) errs.content = "Required";
    // Unique message_type for create
    if (editIsNew) {
      const dup = messages.some(m => m.message_type === form.message_type.trim());
      if (dup) errs.message_type = "message_type must be unique";
    }
    setFormErrors(errs);
    return Object.values(errs).every(v => !v);
  }

  function openCreate() {
    setEditIsNew(true);
    setEditOriginalType(null);
    setForm({ message_type: "", title: "", content: "", description: "", status: "active", isArray: false });
    setFormErrors({});
    setShowCustomTypeInput(false);
    setIsEditOpen(true);
  }

  function openEdit(msg: GreetingMessage) {
    setEditIsNew(false);
    setEditOriginalType(msg.message_type);
    const isArray = typeof msg.content === "string" && msg.content.includes("\n");
    setForm({
      message_type: msg.message_type,
      title: msg.title,
      description: msg.description ?? "",
      status: (msg.status ?? "active") as "active" | "inactive",
      isArray,
      content: String(msg.content ?? ""),
    });
    setFormErrors({});
    setShowCustomTypeInput(false);
    setIsEditOpen(true);
  }

  async function saveForm() {
    if (!validateForm()) return;
    const payload = {
      message_type: sanitizeText(form.message_type.trim()),
      title: sanitizeText(form.title.trim()),
      description: form.description?.trim() ? sanitizeText(form.description.trim()) : undefined,
      is_active: form.status === "active",
      content: sanitizeText(form.isArray ? toArrayContent(form.content).join("\n") : form.content.trim()),
    };

    try {
      const url = `${ADMIN_PREFIX}${editIsNew ? "" : "/" + encodeURIComponent(editOriginalType || form.message_type)}`;
      const method = editIsNew ? "POST" : "PUT";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json", accept: "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || data.detail || "Failed to save message");
      }
      showSuccess(editIsNew ? "Created successfully" : "Updated successfully");
      setIsEditOpen(false);
      await refreshAll();
    } catch (e) {
      showError(e instanceof Error ? e.message : "Failed to save message");
    }
  }

  async function toggleStatus(msg: GreetingMessage) {
    try {
      const res = await fetch(`${ADMIN_PREFIX}/${encodeURIComponent(msg.message_type)}/toggle`, { method: "PATCH" });
      if (!res.ok) throw new Error("Failed to toggle status");
      await refreshAll();
    } catch (e) {
      showError(e instanceof Error ? e.message : "Failed to toggle status");
    }
  }

  function confirmDelete(msg: GreetingMessage) {
    if (msg.is_core || CORE_TYPES.has(msg.message_type)) {
      showError("Core messages cannot be deleted");
      return;
    }
    setDeleteFor(msg);
    setDeleteOpen(true);
  }

  async function doDelete() {
    if (!deleteFor) return;
    try {
      const res = await fetch(`${ADMIN_PREFIX}/${encodeURIComponent(deleteFor.message_type)}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete message");
      setDeleteOpen(false);
      setDeleteFor(null);
      await refreshAll();
    } catch (e) {
      showError(e instanceof Error ? e.message : "Failed to delete");
    }
  }

  async function openPreview(msg: GreetingMessage) {
    try {
      const res = await fetch(`${ADMIN_PREFIX}/${encodeURIComponent(msg.message_type)}/preview`);
      // If preview endpoint not implemented, fallback to current content
      let data: ApiPreviewResponse = null;
      if (res.ok) data = await res.json().catch(() => null);
      const preview: GreetingMessage = {
        ...msg,
        content: data?.content ?? msg.content,
      };
      setPreviewFor(preview);
      setPreviewOpen(true);
    } catch {
      setPreviewFor(msg);
      setPreviewOpen(true);
    }
  }

  // Triggers management
  async function addTrigger() {
    const value = newTrigger.value.trim();
    if (!value) return;
    try {
      const res = await fetch(`${ADMIN_PREFIX}/triggers/${newTrigger.intent}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ word: value }) });
      if (!res.ok) throw new Error("Failed to add trigger");
      setNewTrigger({ ...newTrigger, value: "" });
      await fetchTriggers(newTrigger.intent);
    } catch (e) {
      showError(e instanceof Error ? e.message : "Failed to add trigger");
    }
  }

  async function removeTrigger(intent: TriggerIntent, value: string) {
    try {
      const res = await fetch(`${ADMIN_PREFIX}/triggers/${intent}?word=${encodeURIComponent(value)}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to remove trigger");
      await fetchTriggers(intent);
    } catch (e) {
      showError(e instanceof Error ? e.message : "Failed to remove trigger");
    }
  }

  // Menu triggers management (handled via `fetchMenuTriggers` useCallback above)

  async function addMenuTrigger() {
    const value = newMenuWord.trim();
    if (!value) return;
    try {
      const res = await fetch(`${API_PREFIX}/admin/menu-triggers`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ word: value }) });
      if (!res.ok) throw new Error("Failed to add menu trigger");
      setNewMenuWord("");
      await fetchMenuTriggers();
    } catch (e) {
      showError(e instanceof Error ? e.message : "Failed to add menu trigger");
    }
  }

  async function removeMenuTrigger(value: string) {
    try {
      // optimistic update
      setMenuTriggers(prev => prev.filter(w => w !== value));
      const res = await fetch(`${API_PREFIX}/admin/menu-triggers?word=${encodeURIComponent(value)}`, { method: "DELETE", headers: { accept: "application/json" } });
      if (!res.ok) {
        // revert on failure
        await fetchMenuTriggers();
        throw new Error("Failed to remove menu trigger");
      }
      // some servers return 204; ensure we sync state
      await fetchMenuTriggers();
      showSuccess("Menu trigger removed");
    } catch (e) {
      showError(e instanceof Error ? e.message : "Failed to remove menu trigger");
    }
  }

  async function replaceMenuTriggers(words: string[]) {
    try {
      const unique = Array.from(new Set(words.map(w => w.trim()).filter(Boolean)));
      const res = await fetch(`${API_PREFIX}/admin/menu-triggers`, { method: "PUT", headers: { "Content-Type": "application/json", accept: "application/json" }, body: JSON.stringify({ words: unique }) });
      if (!res.ok) throw new Error("Failed to update menu triggers");
      await fetchMenuTriggers();
      showSuccess("Menu triggers updated");
    } catch (e) {
      showError(e instanceof Error ? e.message : "Failed to update menu triggers");
    }
  }

  async function resetDefaults() {
    try {
      const res = await fetch(`${ADMIN_PREFIX}/initialize`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to reset defaults");
      showSuccess("Default messages restored");
      await refreshAll();
    } catch (e) {
      showError(e instanceof Error ? e.message : "Failed to reset defaults");
    }
  }

  return (
    <div className="w-full min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6 lg:p-8">
      {errorAlert && (
        <div style={{ position: "fixed", top: 90, right: 24, zIndex: 9999, width: 350 }}>
          <Alert variant="error" title="Error" message={errorAlert} />
        </div>
      )}
      {successAlert && (
        <div style={{ position: "fixed", top: 90, right: 24, zIndex: 9999, width: 350 }}>
          <Alert variant="success" title="Success" message={successAlert} />
        </div>
      )}

      <div className="w-full h-full">
        {/* Header Actions */}
        <div className="mt-6 flex flex-col md:flex-row items-start md:items-center gap-3 md:gap-4">
          <div className="flex gap-3">
            <Button startIcon={<Plus className="w-4 h-4" />} onClick={openCreate}>Create Message</Button>
            <Button variant="outline" startIcon={<RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />} onClick={refreshAll}>Refresh</Button>
            <Button variant="outline" startIcon={<ShieldAlert className="w-4 h-4" />} onClick={resetDefaults}>Reset Defaults</Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          <div className={sectionClass}>
            <p className="text-xs text-gray-500">Total Messages</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.total ?? 0}</p>
          </div>
          <div className={sectionClass}>
            <p className="text-xs text-gray-500">Active</p>
            <p className="text-2xl font-bold text-emerald-600">{stats?.active ?? 0}</p>
          </div>
          <div className={sectionClass}>
            <p className="text-xs text-gray-500">Inactive</p>
            <p className="text-2xl font-bold text-amber-600">{stats?.inactive ?? 0}</p>
          </div>
          <div className={sectionClass}>
            <p className="text-xs text-gray-500">Active %</p>
            <p className="text-2xl font-bold text-blue-600">{activePercentage}%</p>
          </div>
        </div>

        {/* Messages Grid */}
        <div className="mt-8">
          <h2 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-white mb-3">Messages</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {messages.map((m) => {
              const isArray = typeof m.content === "string" && m.content.includes("\n");
              const statusIsActive = (m.status ?? "active") === "active";
              return (
                <div key={m.message_type} className={sectionClass}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 border">{m.message_type}</span>
                        {isArray && <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 dark:text-white border border-purple-200">Array</span>}
                        {CORE_TYPES.has(m.message_type) && <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:text-white border border-blue-200">Core</span>}
                      </div>
                      <h3 className="mt-2 text-base font-bold text-gray-900 dark:text-white">{m.title}</h3>
                      <p className="mt-1 text-xs text-gray-500">{m.description}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border dark:text-white ${statusIsActive ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}>
                        {statusIsActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 max-h-32 overflow-auto text-sm bg-gray-50 dark:bg-gray-900 rounded p-2 border border-gray-200 dark:border-gray-700">
                    {isArray ? (
                      <ul className="list-disc pl-4 text-gray-700 dark:text-gray-100">
                        {m.content.split("\n").map((line, idx) => (
                          <li key={idx} className="truncate" title={line}>{line}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="whitespace-pre-wrap break-words text-gray-700 dark:text-gray-100">{String(m.content ?? "")}</p>
                    )}
                  </div>
                  <div className="mt-3 text-[11px] text-gray-500 flex items-center gap-2">
                    {m.created_at && <span>Created: {new Date(m.created_at).toLocaleString()}</span>}
                    {m.updated_at && <span>· Updated: {new Date(m.updated_at).toLocaleString()}</span>}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" startIcon={<Eye className="w-4 h-4" />} onClick={() => openPreview(m)}>Preview</Button>
                    <Button variant="outline" size="sm" startIcon={<Edit3 className="w-4 h-4" />} onClick={() => openEdit(m)} disabled={false}>Edit</Button>
                    <Button variant="outline" size="sm" startIcon={statusIsActive ? <X className="w-4 h-4" /> : <Check className="w-4 h-4" />} onClick={() => toggleStatus(m)}>
                      {statusIsActive ? "Deactivate" : "Activate"}
                    </Button>
                    <Button variant="outline" size="sm" startIcon={<Trash2 className="w-4 h-4" />} onClick={() => confirmDelete(m)} disabled={CORE_TYPES.has(m.message_type)}>
                      Delete
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Triggers */}
        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-4">
          {(["greet", "about"] as TriggerIntent[]).map((intent) => (
            <div key={intent} className={sectionClass}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-semibold text-gray-900 dark:text-white capitalize">{intent} Triggers</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {(intent === "greet" ? greetTriggers : aboutTriggers).map((t) => (
                  <span key={t} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100 border">
                    {t}
                    <button className="text-gray-500 hover:text-red-600" onClick={() => removeTrigger(intent, t)} aria-label="Remove">×</button>
                  </span>
                ))}
              </div>
              <div className="mt-3 flex gap-2">
                <Input placeholder={`Add ${intent} trigger`} value={newTrigger.intent === intent ? newTrigger.value : ""} onChange={(e) => setNewTrigger({ intent, value: e.target.value })} />
                <Button onClick={addTrigger}>Add</Button>
              </div>
            </div>
          ))}
        </div>

        {/* Menu Triggers */}
        <div className="mt-6">
          <div className={sectionClass}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">Menu Triggers</h3>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => fetchMenuTriggers()} startIcon={<RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />}>Refresh</Button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {menuTriggers.map((t) => (
                <span key={t} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100 border">
                  {t}
                  <button className="text-gray-500 hover:text-red-600" onClick={() => removeMenuTrigger(t)} aria-label="Remove">×</button>
                </span>
              ))}
            </div>
            <div className="mt-3 flex flex-col sm:flex-row gap-2">
              <Input placeholder="Add menu trigger (e.g., menu)" value={newMenuWord} onChange={(e) => setNewMenuWord(e.target.value)} />
              <Button onClick={addMenuTrigger}>Add</Button>
            </div>
            <div className="mt-4">
              <Label htmlFor="menu_bulk">Replace All (comma separated)</Label>
              <textarea id="menu_bulk" rows={3} className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100" placeholder="menu, menus" onBlur={(e) => {
                const words = e.target.value.split(",");
                if (words.filter(w => w.trim()).length) {
                  replaceMenuTriggers(words);
                  e.target.value = "";
                }
              }} />
              <p className="text-[11px] text-gray-500 mt-1">Tip: Click outside the box to apply replace.</p>
            </div>
          </div>
        </div>

      </div>

      {/* Create/Edit Modal */}
      <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)}>
        <div className="p-2 sm:p-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{editIsNew ? "Create" : "Edit"} Message</h3>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <Label htmlFor="message_type">Message Type</Label>
              {editIsNew ? (
                <>
                  <select
                    id="message_type_select"
                    className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
                    value={showCustomTypeInput ? "__custom__" : (form.message_type || "")}
                    onChange={(e) => {
                      if (e.target.value === "__custom__") {
                        setShowCustomTypeInput(true);
                        setForm({ ...form, message_type: "" });
                      } else {
                        setShowCustomTypeInput(false);
                        setForm({ ...form, message_type: e.target.value });
                      }
                    }}
                  >
                    <option value="" disabled>Select message type</option>
                    {(stats?.message_types ?? []).filter((t) => !!t).map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                    <option value="__custom__">Custom...</option>
                  </select>
                  {showCustomTypeInput && (
                    <div className="mt-2">
                      <Input id="message_type" className="text-gray-900 dark:text-gray-100" value={form.message_type} onChange={(e) => setForm({ ...form, message_type: e.target.value })} placeholder="unique_key (e.g., welcome_message)" />
                    </div>
                  )}
                </>
              ) : (
                <Input id="message_type" className="text-gray-900 dark:text-gray-100" value={form.message_type} disabled onChange={() => { }} />
              )}
              {formErrors.message_type && <p className="text-xs text-red-600 mt-1">{formErrors.message_type}</p>}
            </div>
            <div>
              <Label htmlFor="title">Title</Label>
              <Input id="title" className="text-gray-900 dark:text-gray-100" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Human readable title" />
              {formErrors.title && <p className="text-xs text-red-600 mt-1">{formErrors.title}</p>}
            </div>
            <div>
              <Label htmlFor="description">Description (optional)</Label>
              <Input id="description" className="text-gray-900 dark:text-gray-100" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Short description" />
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-gray-900 dark:text-gray-100"><input type="checkbox" checked={form.isArray} onChange={(e) => setForm({ ...form, isArray: e.target.checked })} /> Array message</label>
              <label className="flex items-center gap-2 text-sm text-gray-900 dark:text-gray-100"><input type="checkbox" checked={form.status === "active"} onChange={(e) => setForm({ ...form, status: e.target.checked ? "active" : "inactive" })} /> Active</label>
            </div>
            <div>
              <Label htmlFor="content">{form.isArray ? "Content (one line per greeting)" : "Content"}</Label>
              <textarea id="content" rows={8} className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder={form.isArray ? "Hi there!\nHello!\nWelcome!" : "Hello and welcome to our service!"} />
              {formErrors.content && <p className="text-xs text-red-600 mt-1">{formErrors.content}</p>}
            </div>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
            <Button onClick={saveForm}>{editIsNew ? "Create" : "Save"}</Button>
          </div>
        </div>
      </Modal>

      {/* Preview Modal */}
      <Modal isOpen={previewOpen} onClose={() => setPreviewOpen(false)}>
        <div className="p-2 sm:p-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Preview: {previewFor?.title}</h3>
          <div className="text-xs text-gray-500 mb-2">Type: <span className="font-mono">{previewFor?.message_type}</span></div>
          <div className="max-h-64 overflow-auto bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded p-3 text-sm text-gray-700 dark:text-gray-100">
            {Array.isArray(previewFor?.content) ? (
              <ul className="list-disc pl-4">
                {(previewFor?.content as string[]).map((c, idx) => (
                  <li key={idx}>{c}</li>
                ))}
              </ul>
            ) : (
              <p className="whitespace-pre-wrap">{String(previewFor?.content ?? "")}</p>
            )}
          </div>
          <div className="mt-4 flex justify-end"><Button variant="outline" onClick={() => setPreviewOpen(false)}>Close</Button></div>
        </div>
      </Modal>

      {/* Delete Confirm */}
      <Modal isOpen={deleteOpen} onClose={() => setDeleteOpen(false)}>
        <div className="p-2 sm:p-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Delete Message</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300">Are you sure you want to delete <span className="font-mono">{deleteFor?.message_type}</span>? This action cannot be undone.</p>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button onClick={doDelete} startIcon={<Trash2 className="w-4 h-4" />}>Delete</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
