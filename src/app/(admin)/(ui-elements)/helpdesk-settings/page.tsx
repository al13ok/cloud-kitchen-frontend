"use client";

 

import React, { useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { FaUser, FaUsers, FaServer, FaCog } from "react-icons/fa";
import { toast } from "react-hot-toast";

import { Briefcase } from "lucide-react";
import DashboardHeader from '@/components/header/DashboardHeader';
import Alert from "@/components/ui/alert/Alert";

 

interface Option {
  id: number;
  value: string;
  parentType?: string;
}

 

interface Email {
  id: number;
  email: string;
  type?: string;
}

 

// Strongly-typed tab definitions
type TabKey = 'customer' | 'employee' | 'server' | 'customize' | 'customize_employee';
interface Tab { key: TabKey; label: string; icon: React.ReactNode }

 

export default function HelpdeskSettings() {
  const router = useRouter();
  const pathname = usePathname();

 

  // Customer Section State
  const [typeOptions, setTypeOptions] = useState<Option[]>([]);
  const [issueOptions, setIssueOptions] = useState<Option[]>([]);
  const [newType, setNewType] = useState("");
  const [newIssue, setNewIssue] = useState("");
  const [emails, setEmails] = useState<Email[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [selectedEmailType, setSelectedEmailType] = useState<string>("");

  const [confirmationMsg, setConfirmationMsg] = useState("");
  const [isEditingMsg, setIsEditingMsg] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [loadingEmails, setLoadingEmails] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState(false);
  const [typeError, setTypeError] = useState("");

 

  // Employee Section State
  const [empTypeOptions, setEmpTypeOptions] = useState<Option[]>([]);
  const [empIssueOptions, setEmpIssueOptions] = useState<Option[]>([]);
  const [empNewType, setEmpNewType] = useState("");
  const [empNewIssue, setEmpNewIssue] = useState("");
  const [empEmails, setEmpEmails] = useState<Email[]>([]);
  const [empNewEmail, setEmpNewEmail] = useState("");
  const [empEmailError, setEmpEmailError] = useState("");
  const [empSelectedEmailType, setEmpSelectedEmailType] = useState<string>("");

  const [empConfirmationMsg, setEmpConfirmationMsg] = useState("");
  const [empIsEditingMsg, setEmpIsEditingMsg] = useState(false);
  const [empLoadingOptions, setEmpLoadingOptions] = useState(false);
  const [empLoadingEmails, setEmpLoadingEmails] = useState(false);
  const [empLoadingMsg, setEmpLoadingMsg] = useState(false);
  const [empTypeError, setEmpTypeError] = useState("");

  // New error states for input validation
  const [newTypeError, setNewTypeError] = useState("");
  const [newIssueError, setNewIssueError] = useState("");
  const [empNewTypeError, setEmpNewTypeError] = useState("");
  const [empNewIssueError, setEmpNewIssueError] = useState("");

 

  // Dropdown state for Type
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [selectedType, setSelectedType] = useState<string | null>(null);

 

  // Dropdown state for Issue
  const [showIssueDropdown, setShowIssueDropdown] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<string | null>(null);

 

  // Employee Dropdown state for Type
  const [showEmpTypeDropdown, setShowEmpTypeDropdown] = useState(false);
  const [selectedEmpType, setSelectedEmpType] = useState<string | null>(null);

 

  // Employee Dropdown state for Issue
  const [showEmpIssueDropdown, setShowEmpIssueDropdown] = useState(false);
  const [selectedEmpIssue, setSelectedEmpIssue] = useState<string | null>(null);

 

  // Email validation function
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Check if email contains exactly one @ symbol
  const hasValidAtSymbol = (email: string): boolean => {
    const atCount = (email.match(/@/g) || []).length;
    return atCount === 1;
  };

  // Get specific email validation error message
  const getEmailValidationError = (email: string): string => {
    if (email.includes(' ')) {
      return "Email cannot contain spaces";
    }
    if (!hasValidAtSymbol(email)) {
      return "Email must contain one @ symbol";
    }
    // Check for invalid special characters (excluding allowed ones)
    const allowedSpecialChars = /^[a-zA-Z0-9._+-@]+$/;
    if (!allowedSpecialChars.test(email)) {
      return "Email contains invalid special characters";
    }
    if (!email.includes('.')) {
      return "Email must contain a domain (e.g., .com, .org)";
    }
    if (!validateEmail(email)) {
      return "Please enter a valid email address (Format: user@domain.com)";
    }
    return "";
  };

  // Validate Type input (2-50 chars, alphanumeric only, cannot be only numbers)
  const validateTypeInput = (input: string): string => {
    const trimmed = input.trim();
    if (trimmed.length < 2) {
      return "Type must be at least 2 characters long";
    }
    if (trimmed.length > 50) {
      return "Type cannot exceed 50 characters";
    }
    // Only allow letters and numbers (no special characters)
    const alphanumericRegex = /^[a-zA-Z0-9\s]+$/;
    if (!alphanumericRegex.test(trimmed)) {
      return "Type can only contain letters and numbers";
    }
    // Check if input contains only numbers (not allowed)
    const onlyNumbersRegex = /^[0-9\s]+$/;
    if (onlyNumbersRegex.test(trimmed)) {
      return "Type cannot contain only numbers";
    }
    return "";
  };

  // Validate Issue input (2-120 chars, alphanumeric only, cannot be only numbers)
  const validateIssueInput = (input: string): string => {
    const trimmed = input.trim();
    if (trimmed.length < 2) {
      return "Issue must be at least 2 characters long";
    }
    if (trimmed.length > 120) {
      return "Issue cannot exceed 120 characters";
    }
    // Only allow letters and numbers (no special characters)
    const alphanumericRegex = /^[a-zA-Z0-9\s]+$/;
    if (!alphanumericRegex.test(trimmed)) {
      return "Issue can only contain letters and numbers";
    }
    // Check if input contains only numbers (not allowed)
    const onlyNumbersRegex = /^[0-9\s]+$/;
    if (onlyNumbersRegex.test(trimmed)) {
      return "Issue cannot contain only numbers";
    }
    return "";
  };

  // Generate a unique pastel color for each type (unlimited unique colors)
  function stringToHslColor(str: string, s = 70, l = 85) {
    // Stable hash-based color for each type string
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = Math.abs(hash) % 360;
    return `hsl(${h}, ${s}%, ${l}%)`;
  }
  function getTextColor(bgHsl: string) {
    // Simple luminance check for text color
    const l = parseInt(bgHsl.split(',')[2]);
    return l > 80 ? 'text-gray-800' : 'text-white';
  }
  const typeColorMap: Record<string, { bg: string; text: string; border: string; hsl: string }> = {};
  // Assign color based on type value (stable, never changes for same type)
  typeOptions.forEach((opt) => {
    const hsl = stringToHslColor(opt.value);
    typeColorMap[opt.value] = {
      bg: '',
      text: getTextColor(hsl),
      border: '',
      hsl,
    };
  });

 

  // Toggle tab state
  const tabRoutes: Record<TabKey, string> = {
    customer: "/helpdesk-settings",
    employee: "/helpdesk-settings?tab=employee",
    server: "/helpdesk-settings?tab=server",
    customize: "/helpdesk-settings/customize",
    customize_employee: "/helpdesk-settings/customize_employee",
  };

 

  const getActiveTab = useCallback((): TabKey => {
    if (pathname === "/helpdesk-settings/customize") return "customize";
    if (pathname === "/helpdesk-settings/customize_employee") return "customize_employee";
    if (pathname === "/helpdesk-settings") {
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        const tab = params.get("tab");
        if (tab === "employee" || tab === "server") return tab;
      }
      return "customer";
    }
    return "customer";
  }, [pathname]);

 

  const [activeTab, setActiveTab] = useState<TabKey>(getActiveTab());

 

  useEffect(() => {
    setActiveTab(getActiveTab());
  }, [getActiveTab]);

 

  const handleTabChange = (tab: TabKey) => {
    setActiveTab(tab);
    router.push(tabRoutes[tab]);
  };

 

  // Add state for severity scores
  const [severityScores, setSeverityScores] = useState<{ id: string; score_name: string; score_value: number; description?: string }[]>([]);
 

 

  // Alert state
  const [alerts, setAlerts] = useState<Array<{ id: string; type: 'success' | 'error' | 'info' | 'warning'; message: string }>>([]);

 

  const showAlert = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    const id = Date.now().toString();
    setAlerts(prev => [...prev, { id, type, message }]);

 

    // Auto remove after 5 seconds
    setTimeout(() => {
      hideAlert(id);
    }, 5000);
  };

 

  const hideAlert = (id: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== id));
  };


 

  // Add state for selected score and option
  // Change selectedScoreOption to object type
  const [selectedScoreOption, setSelectedScoreOption] = useState<{ category: string; value: string } | null>(null);
  const [selectedScoreValue, setSelectedScoreValue] = useState("");

 

  // Fetch Type/Issue options
  useEffect(() => {
    const fetchOptions = async () => {
      setLoadingOptions(true);
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/helpdesk/customer/options`);
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0 && (data[0] as Record<string, unknown>).type === "parent") {
          const parents = data as Array<{ label?: string; children?: Array<{ label?: string } | string> }>;
          const types = parents.map((p, idx) => ({ id: idx + 1, value: String(p.label || "").trim() })).filter((t) => !!t.value);
          const issues = parents.flatMap((p, pIdx) => (Array.isArray(p.children) ? p.children : []).map((c, cIdx) => ({ id: (pIdx + 1) * 1000 + cIdx + 1, value: (typeof c === 'string' ? c : String(c.label || "")).trim(), parentType: String(p.label || "").trim() }))).filter((i) => !!i.value);
          setTypeOptions(types);
          setIssueOptions(issues);
        } else if (Array.isArray(data)) {
          const typeArr = data.filter((o: unknown) => (o as { option_label?: string }).option_label?.toLowerCase() === "type");
          setTypeOptions(typeArr.map((o: unknown, idx: number) => {
            const obj = o as { _id?: unknown; id?: unknown; list_label: string };
            const idFromId = Number(obj.id);
            const idFromUnderscore = Number(obj._id);
            const id: number = Number.isFinite(idFromId) ? idFromId : Number.isFinite(idFromUnderscore) ? idFromUnderscore : (idx + 1);
            return { id, value: obj.list_label };
          }));
          const issueArr = data.filter((o: unknown) => (o as { option_label?: string }).option_label?.toLowerCase() === "issue");
          setIssueOptions(issueArr.map((o: unknown, idx: number) => {
            const obj = o as { _id?: unknown; id?: unknown; list_label: string; parentType?: string };
            const idFromId = Number(obj.id);
            const idFromUnderscore = Number(obj._id);
            const id: number = Number.isFinite(idFromId) ? idFromId : Number.isFinite(idFromUnderscore) ? idFromUnderscore : (1000 + idx + 1);
            return { id, value: obj.list_label, parentType: obj.parentType || "" };
          }));
        } else {
          throw new Error("Unexpected options response");
        }
      } catch {
        setTypeOptions([]);
        setIssueOptions([]);
      } finally {
        setLoadingOptions(false);
      }
    };
    fetchOptions();
  }, []);

 

  // Add Type option
  const handleAddType = async () => {
    if (!newType.trim()) {
      setNewTypeError("Type is required");
      showAlert("Type is required", "error");
      return;
    }
   
    const validationError = validateTypeInput(newType);
    if (validationError) {
      setNewTypeError(validationError);
      showAlert(validationError, "error");
      return;
    }
   
    setNewTypeError(""); // Clear any previous errors
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/helpdesk/customer/options`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: "type", value: newType.trim() }),
      });
      if (response.ok) {
        setNewType("");
        setNewTypeError(""); // Clear error when successful
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/helpdesk/customer/options`);
        const data = await res.json();
        setTypeOptions(data.filter((o: unknown) => (o as { option_label?: string }).option_label?.toLowerCase() === "type").map((o: unknown) => ({ id: (o as { _id?: string; id?: number; list_label: string })._id || (o as { _id?: string; id?: number; list_label: string }).id, value: (o as { list_label: string }).list_label })));
        showAlert("Type added successfully!", "success");
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.detail || errorData.message || "Failed to add type";
        setNewTypeError(errorMessage);
        showAlert(errorMessage, "error");
      }
    } catch (error) {
      console.error('Error adding type:', error);
      setNewTypeError("Network error: Failed to add type");
      showAlert("Network error: Failed to add type", "error");
    }
  };
  // Add Issue option
  const handleAddIssue = async () => {
    if (!selectedType) {
      setTypeError("Please select Type First");
      showAlert("Please select Type First", "error");
      // Auto clear error after 5 seconds
      setTimeout(() => setTypeError(""), 5000);
      return;
    }
    setTypeError(""); // Clear error when type is selected
   
    if (!newIssue.trim()) {
      setNewIssueError("Issue is required");
      showAlert("Issue is required", "error");
      return;
    }
   
    const validationError = validateIssueInput(newIssue);
    if (validationError) {
      setNewIssueError(validationError);
      showAlert(validationError, "error");
      return;
    }
   
    setNewIssueError(""); // Clear any previous errors
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/helpdesk/customer/issue-type/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ Issue: selectedType, Issue_Type: newIssue.trim() }),
      });
      if (response.ok) {
        setNewIssue("");
        setNewIssueError(""); // Clear error when successful
        // Refresh both type and issue options from server to reflect the new pair
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/helpdesk/customer/options`);
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0 && (data[0] as Record<string, unknown>).type === "parent") {
          const parents = data as Array<{ label?: string; children?: Array<{ label?: string } | string> }>;
          const types = parents.map((p, idx) => ({ id: idx + 1, value: String(p.label || "").trim() })).filter((t) => !!t.value);
          const issues = parents.flatMap((p, pIdx) => (Array.isArray(p.children) ? p.children : []).map((c, cIdx) => ({ id: (pIdx + 1) * 1000 + cIdx + 1, value: (typeof c === 'string' ? c : String((c as { label?: string }).label || "")).trim(), parentType: String(p.label || "").trim() }))).filter((i) => !!i.value);
          setTypeOptions(types);
          setIssueOptions(issues);
        } else if (Array.isArray(data)) {
          const typeArr = data.filter((o: unknown) => (o as { option_label?: string }).option_label?.toLowerCase() === "type");
          setTypeOptions(typeArr.map((o: unknown, idx: number) => {
            const obj = o as { _id?: unknown; id?: unknown; list_label: string };
            const idFromId = Number(obj.id);
            const idFromUnderscore = Number(obj._id);
            const id: number = Number.isFinite(idFromId) ? idFromId : Number.isFinite(idFromUnderscore) ? idFromUnderscore : (idx + 1);
            return { id, value: obj.list_label };
          }));
          const issueArr = data.filter((o: unknown) => (o as { option_label?: string }).option_label?.toLowerCase() === "issue");
          setIssueOptions(issueArr.map((o: unknown, idx: number) => {
            const obj = o as { _id?: unknown; id?: unknown; list_label: string; parentType?: string };
            const idFromId = Number(obj.id);
            const idFromUnderscore = Number(obj._id);
            const id: number = Number.isFinite(idFromId) ? idFromId : Number.isFinite(idFromUnderscore) ? idFromUnderscore : (1000 + idx + 1);
            return { id, value: obj.list_label, parentType: obj.parentType || "" };
          }));
        }
        showAlert("Issue added successfully!", "success");
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.detail || errorData.message || "Failed to add issue";
        setNewIssueError(errorMessage);
        showAlert(errorMessage, "error");
      }
    } catch (error) {
      console.error('Error adding issue:', error);
      setNewIssueError("Network error: Failed to add issue");
      showAlert("Network error: Failed to add issue", "error");
    }
  };
  // Delete Type option
  const handleDeleteType = async (id: number) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/helpdesk/customer/options/${id}`, { method: "DELETE" });
      if (response.ok) {
        setTypeOptions(typeOptions.filter((o) => o.id !== id));
        showAlert("Type deleted successfully!", "success");
      } else {
        showAlert("Failed to delete type", "error");
      }
    } catch {
      showAlert("Failed to delete type", "error");
    }
  };
  // Delete Issue option
  const handleDeleteIssue = async (id: number) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/helpdesk/customer/options/${id}`, { method: "DELETE" });
      if (response.ok) {
        setIssueOptions(issueOptions.filter((o) => o.id !== id));
        showAlert("Issue deleted successfully!", "success");
      } else {
        showAlert("Failed to delete issue", "error");
      }
    } catch {
      showAlert("Failed to delete issue", "error");
    }
  };

 

  // Fetch emails
  useEffect(() => {
    const fetchEmails = async () => {
      setLoadingEmails(true);
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/helpdesk/email-notifications?module=customer`);
        const data = await res.json();
        setEmails(Array.isArray(data) ? data : []);
      } catch {
        setEmails([]);
      } finally {
        setLoadingEmails(false);
      }
    };
    fetchEmails();
  }, []);
  // Add email
  const handleAddEmail = async () => {
    if (!selectedEmailType) {
      setEmailError("Please select Type first");
      showAlert("Please select Type first", "error");
      return;
    }
    if (!newEmail.trim()) {
      setEmailError("Email is required");
      showAlert("Email is required", "error");
      return;
    }
   
    const validationError = getEmailValidationError(newEmail.trim());
    if (validationError) {
      setEmailError(validationError);
      showAlert(validationError, "error");
      return;
    }
   
    if (emails.length >= 20) {
      setEmailError("");
      showAlert("Maximum 20 emails allowed", "warning");
      return;
    }
   
    // Duplicate emails are allowed for customer module
   
    setEmailError(""); // Clear any previous errors
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/helpdesk/email-notifications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newEmail.trim(), module: "customer", type: selectedEmailType }),
      });
      if (response.ok) {
        setNewEmail("");
        setSelectedEmailType("");
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/helpdesk/email-notifications?module=customer`);
        const data = await res.json();
        setEmails(Array.isArray(data) ? data : []);
        showAlert("Email added successfully!", "success");
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.detail || errorData.message || "Failed to add email";
        setEmailError(errorMessage);
        showAlert(errorMessage, "error");
      }
    } catch (error) {
      console.error('Error adding email:', error);
      setEmailError("Network error: Failed to add email");
      showAlert("Network error: Failed to add email", "error");
    }
  };
  // Delete email
  const handleDeleteEmail = async (id: number) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/helpdesk/email-notifications/${id}`, { method: "DELETE" });
      if (response.ok) {
        setEmails(emails.filter((e) => e.id !== id));
        showAlert("Email deleted successfully!", "success");
      } else {
        showAlert("Failed to delete email", "error");
      }
    } catch {
      showAlert("Failed to delete email", "error");
    }
  };

 

  // Fetch confirmation message
  useEffect(() => {
    const fetchMsg = async () => {
      setLoadingMsg(true);
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/helpdesk/confirmation-message/coustomer`);
        const data = await res.json();
        setConfirmationMsg(data?.message || "");
      } catch {
        setConfirmationMsg("");
      } finally {
        setLoadingMsg(false);
      }
    };
    fetchMsg();
  }, []);
  // Save confirmation message
  const handleEditMsg = async () => {
    if (isEditingMsg) {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/helpdesk/confirmation-message`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ module: "coustomer", message: confirmationMsg }),
        });
        if (response.ok) {
          showAlert("Confirmation message saved successfully!", "success");
        } else {
          showAlert("Failed to save confirmation message", "error");
        }
      } catch {
        showAlert("Failed to save confirmation message", "error");
      }
    }
    setIsEditingMsg((v) => !v);
  };
  const handleMsgChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => setConfirmationMsg(e.target.value);

 

  // Fetch Employee Type/Issue options
  useEffect(() => {
    const fetchEmpOptions = async () => {
      setEmpLoadingOptions(true);
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/helpdesk/employee/options`);
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0 && (data[0] as Record<string, unknown>).type === "parent") {
          const parents = data as Array<{ label?: string; children?: Array<{ label?: string } | string> }>;
          const types = parents.map((p, idx) => ({ id: idx + 1, value: String(p.label || "").trim() })).filter((t) => !!t.value);
          const issues = parents.flatMap((p, pIdx) => (Array.isArray(p.children) ? p.children : []).map((c, cIdx) => ({ id: (pIdx + 1) * 1000 + cIdx + 1, value: (typeof c === 'string' ? c : String(c.label || "")).trim() }))).filter((i) => !!i.value);
          setEmpTypeOptions(types);
          setEmpIssueOptions(issues);
        } else if (Array.isArray(data)) {
          setEmpTypeOptions(data.filter((o: unknown) => (o as { option_label?: string }).option_label?.toLowerCase() === "type").map((o: unknown, idx: number) => {
            const obj = o as { id?: unknown; list_label: string };
            const idNum = Number(obj.id);
            const id = Number.isFinite(idNum) ? idNum : (idx + 1);
            return { id, value: obj.list_label };
          }));
          setEmpIssueOptions(data.filter((o: unknown) => (o as { option_label?: string }).option_label?.toLowerCase() === "issue").map((o: unknown, idx: number) => {
            const obj = o as { id?: unknown; list_label: string };
            const idNum = Number(obj.id);
            const id = Number.isFinite(idNum) ? idNum : (1000 + idx + 1);
            return { id, value: obj.list_label };
          }));
        } else {
          throw new Error("Unexpected options response");
        }
      } catch {
        setEmpTypeOptions([]);
        setEmpIssueOptions([]);
      } finally {
        setEmpLoadingOptions(false);
      }
    };
    fetchEmpOptions();
  }, []);

 

  // Add Employee Type option
  const handleEmpAddType = async () => {
    if (!empNewType.trim()) {
      setEmpNewTypeError("Type is required");
      showAlert("Type is required", "error");
      return;
    }
   
    const validationError = validateTypeInput(empNewType);
    if (validationError) {
      setEmpNewTypeError(validationError);
      showAlert(validationError, "error");
      return;
    }
   
    setEmpNewTypeError(""); // Clear any previous errors
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/helpdesk/employee/options`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: "type", value: empNewType.trim() }),
      });
      if (response.ok) {
        setEmpNewType("");
        setEmpNewTypeError(""); // Clear error when successful
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/helpdesk/employee/options`);
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0 && (data[0] as Record<string, unknown>).type === "parent") {
          const parents = data as Array<{ label?: string; children?: Array<{ label?: string } | string> }>;
          const types = parents
            .map((p, idx) => ({ id: idx + 1, value: String(p.label || "").trim() }))
            .filter((t) => !!t.value);
          setEmpTypeOptions(types);
        } else if (Array.isArray(data)) {
          setEmpTypeOptions(data.filter((o: unknown) => (o as { option_label?: string }).option_label?.toLowerCase() === "type").map((o: unknown) => ({ id: (o as { id: number; list_label: string }).id, value: (o as { list_label: string }).list_label })));
        }
        showAlert("Employee type added successfully!", "success");
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.detail || errorData.message || "Failed to add employee type";
        setEmpNewTypeError(errorMessage);
        showAlert(errorMessage, "error");
      }
    } catch (error) {
      console.error('Error adding employee type:', error);
      setEmpNewTypeError("Network error: Failed to add employee type");
      showAlert("Network error: Failed to add employee type", "error");
    }
  };
  // Add Employee Issue option
  const handleEmpAddIssue = async () => {
    if (!selectedEmpType) {
      setEmpTypeError("Please select Type First");
      showAlert("Please select Type First", "error");
      // Auto clear error after 5 seconds
      setTimeout(() => setEmpTypeError(""), 5000);
      return;
    }
    setEmpTypeError(""); // Clear error when type is selected
   
    if (!empNewIssue.trim()) {
      setEmpNewIssueError("Issue is required");
      showAlert("Issue is required", "error");
      return;
    }
   
    const validationError = validateIssueInput(empNewIssue);
    if (validationError) {
      setEmpNewIssueError(validationError);
      showAlert(validationError, "error");
      return;
    }
   
    setEmpNewIssueError(""); // Clear any previous errors
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/helpdesk/employee/issue-type/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ Issue: selectedEmpType, Issue_Type: empNewIssue.trim() }),
      });
      if (response.ok) {
        setEmpNewIssue("");
        setEmpNewIssueError(""); // Clear error when successful
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/helpdesk/employee/options`);
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0 && (data[0] as Record<string, unknown>).type === "parent") {
          const parents = data as Array<{ label?: string; children?: Array<{ label?: string } | string> }>;
          const issues = parents
            .flatMap((p, pIdx) => (Array.isArray(p.children) ? p.children : [])
              .map((c, cIdx) => ({ id: (pIdx + 1) * 1000 + cIdx + 1, value: (typeof c === 'string' ? c : String((c as { label?: string }).label || "")).trim() })))
            .filter((i) => !!i.value);
          setEmpIssueOptions(issues);
        } else if (Array.isArray(data)) {
          setEmpIssueOptions(data.filter((o: unknown) => (o as { option_label?: string }).option_label?.toLowerCase() === "issue").map((o: unknown) => ({ id: (o as { id: number; list_label: string }).id, value: (o as { list_label: string }).list_label })));
        }
        showAlert("Employee issue added successfully!", "success");
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.detail || errorData.message || "Failed to add employee issue";
        setEmpNewIssueError(errorMessage);
        showAlert(errorMessage, "error");
      }
    } catch (error) {
      console.error('Error adding employee issue:', error);
      setEmpNewIssueError("Network error: Failed to add employee issue");
      showAlert("Network error: Failed to add employee issue", "error");
    }
  };
  // Delete Employee Type option
  const handleEmpDeleteType = async (id: number, value: string) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/helpdesk/employee/options?category=type&value=${encodeURIComponent(value)}`, { method: "DELETE" });
      if (response.ok) {
        setEmpTypeOptions(empTypeOptions.filter((o) => o.id !== id));
        showAlert("Employee type deleted successfully!", "success");
      } else {
        showAlert("Failed to delete employee type", "error");
      }
    } catch {
      showAlert("Failed to delete employee type", "error");
    }
  };
  // Delete Employee Issue option
  const handleEmpDeleteIssue = async (id: number, value: string) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/helpdesk/employee/options?category=issue&value=${encodeURIComponent(value)}`, { method: "DELETE" });
      if (response.ok) {
        setEmpIssueOptions(empIssueOptions.filter((o) => o.id !== id));
        showAlert("Employee issue deleted successfully!", "success");
      } else {
        showAlert("Failed to delete employee issue", "error");
      }
    } catch {
      showAlert("Failed to delete employee issue", "error");
    }
  };

 

  // Fetch Employee emails
  useEffect(() => {
    const fetchEmpEmails = async () => {
      setEmpLoadingEmails(true);
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/helpdesk/employee/emails`);
        const data = await res.json();
        setEmpEmails(Array.isArray(data) ? data : []);
      } catch {
        setEmpEmails([]);
      } finally {
        setEmpLoadingEmails(false);
      }
    };
    fetchEmpEmails();
  }, []);
  // Add Employee email
  const handleEmpAddEmail = async () => {
    if (!empSelectedEmailType) {
      setEmpEmailError("Please select Type first");
      showAlert("Please select Type first", "error");
      return;
    }
    if (!empNewEmail.trim()) {
      setEmpEmailError("Email is required");
      showAlert("Email is required", "error");
      return;
    }
   
    const validationError = getEmailValidationError(empNewEmail.trim());
    if (validationError) {
      setEmpEmailError(validationError);
      showAlert(validationError, "error");
      return;
    }
   
    if (empEmails.length >= 20) {
      setEmpEmailError("");
      showAlert("Maximum 20 emails allowed", "warning");
      return;
    }
   
    // Duplicate emails are allowed for employee module
   
    setEmpEmailError(""); // Clear any previous errors
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/helpdesk/employee/emails`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: empNewEmail.trim(), module: "employee", type: empSelectedEmailType }),
      });
      if (response.ok) {
        setEmpNewEmail("");
        setEmpSelectedEmailType("");
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/helpdesk/employee/emails`);
        const data = await res.json();
        setEmpEmails(Array.isArray(data) ? data : []);
        showAlert("Employee email added successfully!", "success");
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.detail || errorData.message || "Failed to add employee email";
        setEmpEmailError(errorMessage);
        showAlert(errorMessage, "error");
      }
    } catch (error) {
      console.error('Error adding employee email:', error);
      setEmpEmailError("Network error: Failed to add employee email");
      showAlert("Network error: Failed to add employee email", "error");
    }
  };
  // Delete Employee email
  const handleEmpDeleteEmail = async (id: number) => {
    try {
      const emailObj = empEmails.find((e) => e.id === id);
      if (!emailObj) {
        showAlert("Email not found", "error");
        return;
      }
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/helpdesk/employee/emails/${encodeURIComponent(emailObj.email)}`,
        { method: "DELETE" }
      );
      if (response.ok) {
        setEmpEmails(empEmails.filter((e) => e.id !== id));
        showAlert("Employee email deleted successfully!", "success");
      } else {
        showAlert("Failed to delete employee email", "error");
      }
    } catch {
      showAlert("Failed to delete employee email", "error");
    }
  };

 

  // Fetch Employee confirmation message
  useEffect(() => {
    const fetchEmpMsg = async () => {
      setEmpLoadingMsg(true);
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/helpdesk/employee/confirmation-message`);
        const data = await res.json();
        setEmpConfirmationMsg(data?.message || "");
      } catch {
        setEmpConfirmationMsg("");
      } finally {
        setEmpLoadingMsg(false);
      }
    };
    fetchEmpMsg();
  }, []);
  // Save Employee confirmation message
  const handleEmpEditMsg = async () => {
    if (empIsEditingMsg) {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/helpdesk/employee/confirmation-message`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ module: "employee", message: empConfirmationMsg }),
        });
        if (response.ok) {
          showAlert("Employee message saved successfully!", "success");
        } else {
          showAlert("Failed to save employee message", "error");
        }
      } catch {
        showAlert("Failed to save employee message", "error");
      }
    }
    setEmpIsEditingMsg((v) => !v);
  };
  const handleEmpMsgChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => setEmpConfirmationMsg(e.target.value);

 

  // Fetch all scores on tab open
  useEffect(() => {
    if (activeTab !== 'server') return;
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/helpdesk/severity`)
      .then(res => res.json())
      .then(data => setSeverityScores(Array.isArray(data) ? data : []));
  }, [activeTab]);

 

  // Add this useEffect after the state for selectedScoreOption, selectedScoreValue, and severityScores
  useEffect(() => {
    if (selectedScoreOption) {
      const { category, value } = selectedScoreOption;
      const score_name = (category.includes("Type") ? "Type: " : "Issue: ") + value;
      const found = severityScores.find((ls) => ls.score_name === score_name);
      setSelectedScoreValue(found ? String(found.score_value) : "");
    } else {
      setSelectedScoreValue("");
    }
  }, [selectedScoreOption, severityScores]);

 

  // Ensure tabs is defined before use:
  const tabs: Tab[] = [
    { key: "customer", label: "Customer Ticket Setting", icon: <FaUser /> },
    { key: "employee", label: "Employee Ticket Setting", icon: <FaUsers /> },
    { key: "server", label: "Severity Table", icon: <FaServer /> },
    { key: "customize", label: "Customize Customer Ticket Form", icon: <FaCog /> },
    { key: "customize_employee", label: "Customize Employee Ticket Form", icon: <FaCog /> },
  ];

 

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        <DashboardHeader
          title="HelpDesk Settings"
          subtitle="Configure helpdesk settings, ticket categories, notification emails, confirmation messages, and severity scoring."
          icon={Briefcase}
          gradientFrom="from-blue-900"
          gradientTo="to-indigo-800"
          actions={null}
        />
      </div>

      <div className="p-4 sm:p-0 pb-20 max-w-7xl mx-auto">
        {/* Alerts from shared @alerts/ component */}
        {alerts.length > 0 && (
          <div className="mt-8 ml-auto max-w-sm space-y-2 relative z-[2147483647]">
            {alerts.map((a) => (
              <Alert
                key={a.id}
                variant={a.type}
                title={a.type === 'success' ? 'Success' : a.type === 'error' ? 'Error' : a.type === 'warning' ? 'Warning' : 'Info'}
                message={a.message}
                showLink={false}
              />
            ))}
          </div>
        )}
       

 

        {/* Enhanced Tab Navigation */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 mb-8 overflow-hidden">
          <div className="flex">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => handleTabChange(tab.key)}
                className={`flex-1 flex items-center justify-center gap-3 px-6 py-4 font-semibold text-sm transition-all duration-300 ${
                  activeTab === tab.key
                    ? 'text-blue-600 dark:text-blue-400 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-b-2 border-blue-600 dark:border-blue-400'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <div className={`p-2 rounded-lg transition-colors duration-200 ${
                  activeTab === tab.key ? 'bg-blue-100 dark:bg-blue-800/30' : 'bg-gray-100 dark:bg-gray-700'
                }`}>
                  {tab.icon}
                </div>
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">
                  {tab.key === 'customer' ? 'Customer' :
                    tab.key === 'employee' ? 'Employee' :
                      tab.key === 'server' ? 'Severity' :
                        tab.key === 'customize' ? 'Customize' : tab.label}
                </span>
                {activeTab === tab.key && (
                  <div className="w-2 h-2 bg-blue-600 dark:bg-blue-400 rounded-full animate-pulse"></div>
                )}
              </button>
            ))}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 space-y-10 shadow-lg border border-gray-200 dark:border-gray-700">
          {activeTab === 'customer' && (
            <>
              {/* Customer Section */}
              <div>
                <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">Customer Ticket Form Category</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">You can add/update categories.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Type */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Type</label>
                    {/* Only show the dropdown button. When open, show all types (with delete/cross) and at the bottom, the add new type input/button. */}
                    {/* Move the add new type input/button above the dropdown, outside the dropdown box */}
                    <div className="flex gap-2 mb-2">
                      <input
                        className={`w-full px-4 py-2 border rounded-md bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400 ${
                          newTypeError ? 'border-red-500 focus:ring-red-500' : 'focus:ring-blue-500'
                        }`}
                        placeholder="Add new type"
                        value={newType}
                        onChange={(e) => {
                          const value = e.target.value;
                          setNewType(value);
                         
                          // Real-time validation as user types
                          if (value.trim() === '') {
                            setNewTypeError("");
                          } else {
                            const errorMessage = validateTypeInput(value);
                            setNewTypeError(errorMessage);
                          }
                        }}
                      />
                  <button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-4 py-2 rounded-md font-semibold self-start shadow-md hover:shadow-lg transition-all" onClick={handleAddType} disabled={loadingOptions || !!newTypeError}>Add</button>
                    </div>
                    {newTypeError && (
                      <div className="text-red-500 text-sm mt-1">{newTypeError}</div>
                    )}
                    {typeError && (
                      <div className="text-red-500 text-sm mt-1">{typeError}</div>
                    )}
                    <div className="relative w-full">
                      <button type="button" className="w-full border rounded-md px-4 py-2 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white text-left flex justify-between items-center" onClick={() => setShowTypeDropdown(v => !v)}>
                        {selectedType ? selectedType : "Select type"}
                        <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                      </button>
                      {showTypeDropdown && (
                        <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-700 border rounded-md shadow-lg max-h-60 overflow-y-auto p-2 flex flex-wrap gap-2 dark:border-gray-600">
                          {typeOptions.length === 0 ? (
                            <div className="w-full text-center  text-gray-500 dark:text-gray-400 text-sm">
                              No type found
                            </div>
                          ) : (
                            typeOptions.map((opt) => (
                              <div
                                key={opt.id}
                                style={{ background: stringToHslColor(opt.value) }}
                                className={`flex items-center gap-2 px-3 py-2 rounded-full border font-medium cursor-pointer text-gray-800 min-w-[120px] ${selectedType === opt.value ? 'ring-2 ring-blue-300' : ''}`}
                                onClick={() => { setSelectedType(opt.value); setShowTypeDropdown(false); setTypeError(""); }}
                              >
                                <span className="text-xs flex-1 text-center">{opt.value}</span>
                                <button type="button" className="ml-1 text-lg leading-none hover:text-red-500 flex-shrink-0" onClick={e => { e.stopPropagation(); handleDeleteType(opt.id); }}>
                                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M6.541 3.792a2.25 2.25 0 0 1 2.25-2.25h2.417a2.25 2.25 0 0 1 2.25 2.25v.25h3.208a.75.75 0 0 1 0 1.5h-.29v10.666a2.25 2.25 0 0 1-2.25 2.25h-8.25a2.25 2.25 0 0 1-2.25-2.25V5.541h-.292a.75.75 0 1 1 0-1.5H6.54zm8.334 9.454V5.541h-9.75v10.667c0 .414.336.75.75.75h8.25a.75.75 0 0 0 .75-.75zM8.041 4.041h3.917v-.25a.75.75 0 0 0-.75-.75H8.791a.75.75 0 0 0-.75.75zM8.334 8a.75.75 0 0 1 .75.75v5a.75.75 0 1 1-1.5 0v-5a.75.75 0 0 1 .75-.75m4.083.75a.75.75 0 0 0-1.5 0v5a.75.75 0 1 0 1.5 0z" clipRule="evenodd" />
                                  </svg>
                                </button>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Issue */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Issue</label>
                    <div className="flex gap-2 mb-2">
                      <input
                        className={`w-full px-4 py-2 border rounded-md bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400 ${
                          newIssueError ? 'border-red-500 focus:ring-red-500' : 'focus:ring-blue-500'
                        }`}
                        placeholder="Add new option"
                        value={newIssue}
                        onChange={(e) => {
                          const value = e.target.value;
                          setNewIssue(value);
                         
                          // Real-time validation as user types
                          if (value.trim() === '') {
                            setNewIssueError("");
                          } else {
                            const errorMessage = validateIssueInput(value);
                            setNewIssueError(errorMessage);
                          }
                        }}
                      />
                      <button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-4 py-2 rounded-md font-semibold self-start shadow-md hover:shadow-lg transition-all" onClick={handleAddIssue} disabled={loadingOptions || !!newIssueError}>Add</button>
                    </div>
                    {newIssueError && (
                      <div className="text-red-500 text-sm mt-1">{newIssueError}</div>
                    )}
                    <div className="relative w-full">
                      <button type="button" className="w-full border rounded-md px-4 py-2 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white text-left flex justify-between items-center" onClick={() => setShowIssueDropdown(v => !v)}>
                        {selectedIssue ? selectedIssue : "Select issue"}
                        <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                      </button>
                      {showIssueDropdown && (
                        <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-700 border rounded-md shadow-lg max-h-60 overflow-y-auto p-2 flex flex-wrap gap-2 dark:border-gray-600">
                          {issueOptions.length === 0 ? (
                            <div className="w-full text-center text-gray-500 dark:text-gray-400 text-sm">
                              No issue found
                            </div>
                          ) : (
                            issueOptions
                              .map((opt) => {
                                return (
                                  <div
                                    key={opt.id}
                                    style={{ background: stringToHslColor(opt.parentType ? opt.parentType : opt.value) }}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-full border font-medium cursor-pointer text-gray-800 min-w-[120px] ${selectedIssue === opt.value ? 'ring-2 ring-blue-300' : ''}`}
                                    onClick={() => { setSelectedIssue(opt.value); setShowIssueDropdown(false); }}
                                  >
                                    <span className="text-xs flex-1 text-center">{opt.value}</span>
                                    <span className="text-xs font-semibold opacity-70 flex-shrink-0">{opt.parentType ? `(${opt.parentType})` : ''}</span>
                                    <button type="button" className="ml-1 text-lg leading-none hover:text-red-500 flex-shrink-0" onClick={e => { e.stopPropagation(); handleDeleteIssue(opt.id); }}>
                                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M6.541 3.792a2.25 2.25 0 0 1 2.25-2.25h2.417a2.25 2.25 0 0 1 2.25 2.25v.25h3.208a.75.75 0 0 1 0 1.5h-.29v10.666a2.25 2.25 0 0 1-2.25 2.25h-8.25a2.25 2.25 0 0 1-2.25-2.25V5.541h-.292a.75.75 0 1 1 0-1.5H6.54zm8.334 9.454V5.541h-9.75v10.667c0 .414.336.75.75.75h8.25a.75.75 0 0 0 .75-.75zM8.041 4.041h3.917v-.25a.75.75 0 0 0-.75-.75H8.791a.75.75 0 0 0-.75.75zM8.334 8a.75.75 0 0 1 .75.75v5a.75.75 0 1 1-1.5 0v-5a.75.75 0 0 1 .75-.75m4.083.75a.75.75 0 0 0-1.5 0v5a.75.75 0 1 0 1.5 0z" clipRule="evenodd" />
                                      </svg>
                                    </button>
                                  </div>
                                );
                              })
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              {/* Email Notifications */}
              <div>
                <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">Email Notifications</h2>
                <div className="flex items-start gap-2 mb-4">
                  {/* Type dropdown (customer) */}
                  <div>
                    <select
                      value={selectedEmailType}
                      onChange={(e) => setSelectedEmailType(e.target.value)}
                      className="min-w-[120px] px-3 py-2 border rounded-md bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    >
                      <option value="">Type</option>
                      {typeOptions.map((t) => (
                        <option key={t.id} value={t.value}>{t.value}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex-1 relative">
                    <input
                      className={`w-full px-4 py-2 border rounded-md bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400 ${
                        emailError ? 'border-red-500 focus:ring-red-500' : 'focus:ring-blue-500'
                      }`}
                      placeholder="Enter email (e.g., example@domain.com)"
                      value={newEmail}
                      onChange={(e) => {
                        const value = e.target.value;
                        setNewEmail(value);
                       
                        // Real-time validation as user types
                        if (value.trim() === '') {
                          setEmailError("");
                        } else {
                          const errorMessage = getEmailValidationError(value.trim());
                          setEmailError(errorMessage);
                        }
                      }}
                      onFocus={() => {
                        // Show tooltip if there's an error when focusing
                      }}
                      onBlur={() => {
                        // Hide tooltip when leaving field
                      }}
                    />
                   
                    {/* Error message below input */}
                    {emailError && (
                      <div className="text-red-500 text-sm mt-1">
                        {emailError}
                      </div>
                    )}
                  </div>
                  <button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-4 py-2 rounded-md font-semibold shadow-md hover:shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed" onClick={handleAddEmail} disabled={loadingEmails || emails.length >= 20 || !!emailError || !selectedEmailType}>Add</button>
                </div>
                {/* Grouped by type list (customer) */}
                <div className="space-y-2">
                  {(() => {
                    if (emails.length === 0) return <div className="text-gray-500 text-sm">No emails added yet.</div>;
                    const grouped = emails.reduce((acc: Record<string, Email[]>, e) => {
                      const key = (e.type || 'general');
                      if (!acc[key]) acc[key] = [];
                      acc[key].push(e);
                      return acc;
                    }, {});
                    return Object.entries(grouped).map(([type, list]) => (
                      <div key={type} className="flex flex-wrap items-center gap-1 text-sm">
                        <span className="font-semibold text-gray-700 dark:text-gray-300 mr-1 capitalize">{type} :</span>
                        {list.map((item, idx) => (
                          <span key={item.id + '-' + idx} className="flex items-center gap-1">
                            <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-300">{item.email}</span>
                            <button onClick={() => handleDeleteEmail(item.id)} className="hover:text-red-500" title="Remove">
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M6.541 3.792a2.25 2.25 0 0 1 2.25-2.25h2.417a2.25 2.25 0 0 1 2.25 2.25v.25h3.208a.75.75 0 0 1 0 1.5h-.29v10.666a2.25 2.25 0 0 1-2.25 2.25h-8.25a2.25 2.25 0 0 1-2.25-2.25V5.541h-.292a.75.75 0 1 1 0-1.5H6.54zm8.334 9.454V5.541h-9.75v10.667c0 .414.336.75.75.75h8.25a.75.75 0 0 0 .75-.75zM8.041 4.041h3.917v-.25a.75.75 0 0 0-.75-.75H8.791a.75.75 0 0 0-.75.75zM8.334 8a.75.75 0 0 1 .75.75v5a.75.75 0 1 1-1.5 0v-5a.75.75 0 0 1 .75-.75m4.083.75a.75.75 0 0 0-1.5 0v5a.75.75 0 1 0 1.5 0z" clipRule="evenodd"></path></svg>
                            </button>
                            {idx < list.length - 1 && <span className="text-gray-400 mx-1">|</span>}
                          </span>
                        ))}
                      </div>
                    ));
                  })()}
                </div>
              </div>
              {/* Customer Confirmation Message */}
              <div>
                <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">User Confirmation Message</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">This message will be sent to users after submitting the lead form.</p>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs text-gray-400">{confirmationMsg.length}/256</span>
                  <button className={`px-3 py-1 text-sm rounded-md font-semibold ${isEditingMsg ? "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700" : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"} text-white shadow-md hover:shadow-lg transition-all`} onClick={handleEditMsg} disabled={loadingMsg}>{isEditingMsg ? "Save" : "Edit"}</button>
                </div>
                <textarea rows={4} className="w-full px-4 py-2 border rounded-md bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400" value={confirmationMsg} onChange={handleMsgChange} disabled={!isEditingMsg || loadingMsg} placeholder="Write a confirmation message to send to users" maxLength={256} />
              </div>
            </>
          )}
          {/* Employee Section only visible when Employee Records tab is selected */}
          {activeTab === 'employee' && (
            <>
              <div>
                <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">Employee Ticket Form Category</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">You can add/update categories.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Type */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Type</label>
                    <div className="flex gap-2 mb-2">
                      <input
                        className={`w-full px-4 py-2 border rounded-md bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400 ${
                          empNewTypeError ? 'border-red-500 focus:ring-red-500' : 'focus:ring-blue-500'
                        }`}
                        placeholder="Add new type"
                        value={empNewType}
                        onChange={(e) => {
                          const value = e.target.value;
                          setEmpNewType(value);
                         
                          // Real-time validation as user types
                          if (value.trim() === '') {
                            setEmpNewTypeError("");
                          } else {
                            const errorMessage = validateTypeInput(value);
                            setEmpNewTypeError(errorMessage);
                          }
                        }}
                      />
                      <button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-4 py-2 rounded-md font-semibold self-start shadow-md hover:shadow-lg transition-all" onClick={handleEmpAddType} disabled={empLoadingOptions || !!empNewTypeError}>Add</button>
                    </div>
                    {empNewTypeError && (
                      <div className="text-red-500 text-sm mt-1">{empNewTypeError}</div>
                    )}
                    {empTypeError && (
                      <div className="text-red-500 text-sm mt-1">{empTypeError}</div>
                    )}
                    <div className="relative w-full">
                      <button type="button" className="w-full border rounded-md px-4 py-2 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white text-left flex justify-between items-center" onClick={() => setShowEmpTypeDropdown(v => !v)}>
                        {selectedEmpType ? selectedEmpType : "Select type"}
                        <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                      </button>
                      {showEmpTypeDropdown && (
                        <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-700 border rounded-md shadow-lg max-h-60 overflow-y-auto p-2 flex flex-wrap gap-2 dark:border-gray-600">
                          {empTypeOptions.length === 0 ? (
                            <div className="w-full text-center text-gray-500 dark:text-gray-400 text-sm">
                              No type found
                            </div>
                          ) : (
                            empTypeOptions.map((opt) => (
                              <div
                                key={opt.id}
                                style={{ background: stringToHslColor(opt.value) }}
                                className={`flex items-center gap-2 px-3 py-2 rounded-full border font-medium cursor-pointer text-gray-800 min-w-[120px] ${selectedEmpType === opt.value ? 'ring-2 ring-blue-300' : ''}`}
                                onClick={() => { setSelectedEmpType(opt.value); setShowEmpTypeDropdown(false); setEmpTypeError(""); }}
                              >
                                <span className="text-xs flex-1 text-center">{opt.value}</span>
                                <button type="button" className="ml-1 text-lg leading-none hover:text-red-500 flex-shrink-0" onClick={e => { e.stopPropagation(); handleEmpDeleteType(opt.id, opt.value); }}>
                                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M6.541 3.792a2.25 2.25 0 0 1 2.25-2.25h2.417a2.25 2.25 0 0 1 2.25 2.25v.25h3.208a.75.75 0 0 1 0 1.5h-.29v10.666a2.25 2.25 0 0 1-2.25 2.25h-8.25a2.25 2.25 0 0 1-2.25-2.25V5.541h-.292a.75.75 0 1 1 0-1.5H6.54zm8.334 9.454V5.541h-9.75v10.667c0 .414.336.75.75.75h8.25a.75.75 0 0 0 .75-.75zM8.041 4.041h3.917v-.25a.75.75 0 0 0-.75-.75H8.791a.75.75 0 0 0-.75.75zM8.334 8a.75.75 0 0 1 .75.75v5a.75.75 0 1 1-1.5 0v-5a.75.75 0 0 1 .75-.75m4.083.75a.75.75 0 0 0-1.5 0v5a.75.75 0 1 0 1.5 0z" clipRule="evenodd" />
                                  </svg>
                                </button>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Issue */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Issue</label>
                    <div className="flex gap-2 mb-2">
                      <input
                        className={`w-full px-4 py-2 border rounded-md bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400 ${
                          empNewIssueError ? 'border-red-500 focus:ring-red-500' : 'focus:ring-blue-500'
                        }`}
                        placeholder="Add new option"
                        value={empNewIssue}
                        onChange={(e) => {
                          const value = e.target.value;
                          setEmpNewIssue(value);
                         
                          // Real-time validation as user types
                          if (value.trim() === '') {
                            setEmpNewIssueError("");
                          } else {
                            const errorMessage = validateIssueInput(value);
                            setEmpNewIssueError(errorMessage);
                          }
                        }}
                      />
                      <button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-4 py-2 rounded-md font-semibold self-start shadow-md hover:shadow-lg transition-all" onClick={handleEmpAddIssue} disabled={empLoadingOptions || !!empNewIssueError}>Add</button>
                    </div>
                    {empNewIssueError && (
                      <div className="text-red-500 text-sm mt-1">{empNewIssueError}</div>
                    )}
                    <div className="relative w-full">
                      <button type="button" className="w-full border rounded-md px-4 py-2 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white text-left flex justify-between items-center" onClick={() => setShowEmpIssueDropdown(v => !v)}>
                        {selectedEmpIssue ? selectedEmpIssue : "Select issue"}
                        <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                      </button>
                      {showEmpIssueDropdown && (
                        <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-700 border rounded-md shadow-lg max-h-60 overflow-y-auto p-2 flex flex-wrap gap-2 dark:border-gray-600">
                          {empIssueOptions.length === 0 ? (
                            <div className="w-full text-center text-gray-500 dark:text-gray-400 text-sm">
                              No issue found
                            </div>
                          ) : (
                            empIssueOptions.map((opt) => (
                              <div
                                key={opt.id}
                                style={{ background: stringToHslColor(opt.value) }}
                                className={`flex items-center gap-2 px-3 py-2 rounded-full border font-medium cursor-pointer text-gray-800 min-w-[120px] ${selectedEmpIssue === opt.value ? 'ring-2 ring-blue-300' : ''}`}
                                onClick={() => { setSelectedEmpIssue(opt.value); setShowEmpIssueDropdown(false); }}
                              >
                                <span className="text-xs flex-1 text-center">{opt.value}</span>
                                <button type="button" className="ml-1 text-lg leading-none hover:text-red-500 flex-shrink-0" onClick={e => { e.stopPropagation(); handleEmpDeleteIssue(opt.id, opt.value); }}>
                                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M6.541 3.792a2.25 2.25 0 0 1 2.25-2.25h2.417a2.25 2.25 0 0 1 2.25 2.25v.25h3.208a.75.75 0 0 1 0 1.5h-.29v10.666a2.25 2.25 0 0 1-2.25 2.25h-8.25a2.25 2.25 0 0 1-2.25-2.25V5.541h-.292a.75.75 0 1 1 0-1.5H6.54zm8.334 9.454V5.541h-9.75v10.667c0 .414.336.75.75.75h8.25a.75.75 0 0 0 .75-.75zM8.041 4.041h3.917v-.25a.75.75 0 0 0-.75-.75H8.791a.75.75 0 0 0-.75.75zM8.334 8a.75.75 0 0 1 .75.75v5a.75.75 0 1 1-1.5 0v-5a.75.75 0 0 1 .75-.75m4.083.75a.75.75 0 0 0-1.5 0v5a.75.75 0 1 0 1.5 0z" clipRule="evenodd" />
                                  </svg>
                                </button>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              {/* Employee Email Notifications */}
              <div>
                <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">Employee Email Notifications</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Add up to 20 email addresses to receive lead alerts.</p>
                <div className="flex items-start gap-2 mb-4">
                  {/* Type dropdown (employee) */}
                  <div>
                    <select
                      value={empSelectedEmailType}
                      onChange={(e) => setEmpSelectedEmailType(e.target.value)}
                      className="min-w-[120px] px-3 py-2 border rounded-md bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    >
                      <option value="">Type</option>
                      {empTypeOptions.map((t) => (
                        <option key={t.id} value={t.value}>{t.value}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex-1 relative">
                    <input
                      className={`w-full px-4 py-2 border rounded-md bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400 ${
                        empEmailError ? 'border-red-500 focus:ring-red-500' : 'focus:ring-blue-500'
                      }`}
                      placeholder="Enter email (e.g., example@domain.com)"
                      value={empNewEmail}
                      onChange={(e) => {
                        const value = e.target.value;
                        setEmpNewEmail(value);
                       
                        // Real-time validation as user types
                        if (value.trim() === '') {
                          setEmpEmailError("");
                        } else {
                          const errorMessage = getEmailValidationError(value.trim());
                          setEmpEmailError(errorMessage);
                        }
                      }}
                      onFocus={() => {
                        // Show tooltip if there's an error when focusing
                      }}
                      onBlur={() => {
                        // Hide tooltip when leaving field
                      }}
                    />
                   
                    {/* Error message below input */}
                    {empEmailError && (
                      <div className="text-red-500 text-sm mt-1">
                        {empEmailError}
                      </div>
                    )}
                  </div>
                  <button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-4 py-2 rounded-md font-semibold shadow-md hover:shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed" onClick={handleEmpAddEmail} disabled={empLoadingEmails || empEmails.length >= 20 || !!empEmailError || !empSelectedEmailType}>Add</button>
                </div>
                {/* Grouped by type list (employee) */}
                <div className="space-y-2">
                  {(() => {
                    if (empEmails.length === 0) return <div className="text-gray-500 text-sm">No emails added yet.</div>;
                    const grouped = empEmails.reduce((acc: Record<string, Email[]>, e) => {
                      const key = (e.type || 'general');
                      if (!acc[key]) acc[key] = [];
                      acc[key].push(e);
                      return acc;
                    }, {});
                    return Object.entries(grouped).map(([type, list]) => (
                      <div key={type} className="flex flex-wrap items-center gap-1 text-sm">
                        <span className="font-semibold text-gray-700 dark:text-gray-300 mr-1 capitalize">{type} :</span>
                        {list.map((item, idx) => (
                          <span key={item.id + '-' + idx} className="flex items-center gap-1">
                            <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-300">{item.email}</span>
                            <button onClick={() => handleEmpDeleteEmail(item.id)} className="hover:text-red-500" title="Remove">
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M6.541 3.792a2.25 2.25 0 0 1 2.25-2.25h2.417a2.25 2.25 0 0 1 2.25 2.25v.25h3.208a.75.75 0 0 1 0 1.5h-.29v10.666a2.25 2.25 0 0 1-2.25 2.25h-8.25a2.25 2.25 0 0 1-2.25-2.25V5.541h-.292a.75.75 0 1 1 0-1.5H6.54zm8.334 9.454V5.541h-9.75v10.667c0 .414.336.75.75.75h8.25a.75.75 0 0 0 .75-.75zM8.041 4.041h3.917v-.25a.75.75 0 0 0-.75-.75H8.791a.75.75 0 0 0-.75.75zM8.334 8a.75.75 0 0 1 .75.75v5a.75.75 0 1 1-1.5 0v-5a.75.75 0 0 1 .75-.75m4.083.75a.75.75 0 0 0-1.5 0v5a.75.75 0 1 0 1.5 0z" clipRule="evenodd"></path></svg>
                            </button>
                            {idx < list.length - 1 && <span className="text-gray-400 mx-1">|</span>}
                          </span>
                        ))}
                      </div>
                    ));
                  })()}
                </div>
              </div>
              {/* Employee Confirmation Message */}
              <div>
                <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">Employee Confirmation Message</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">This message will be sent to users after submitting the lead form.</p>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs text-gray-400">{empConfirmationMsg.length}/256</span>
                  <button className={`px-3 py-1 text-sm rounded-md font-semibold ${empIsEditingMsg ? "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700" : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"} text-white shadow-md hover:shadow-lg transition-all`} onClick={handleEmpEditMsg} disabled={empLoadingMsg}>{empIsEditingMsg ? "Save" : "Edit"}</button>
                </div>
                <textarea rows={4} className="w-full px-4 py-2 border rounded-md bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400" value={empConfirmationMsg} onChange={handleEmpMsgChange} disabled={!empIsEditingMsg || empLoadingMsg} placeholder="Write a confirmation message to send to users" maxLength={256} />
              </div>
            </>
          )}
          {activeTab === 'server' && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Severity Score Settings</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Assign a score to each issue type or issue (Customer & Employee).</p>
              <div className="flex flex-col md:flex-row md:items-end gap-4 mb-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Select Category</label>
                  <select
                    value={selectedScoreOption ? `${selectedScoreOption.category}|${selectedScoreOption.value}` : ""}
                    onChange={e => {
                      const [category, value] = e.target.value.split("|");
                      setSelectedScoreOption(category && value ? { category, value } : null);
                    }}
                    className="w-full px-4 py-2 border rounded-md bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    <option value="">Select a category and value</option>
                    {[{ name: 'Customer Type', options: typeOptions.map(o => o.value) }, { name: 'Customer Issue', options: issueOptions.map(o => o.value) }, { name: 'Employee Type', options: empTypeOptions.map(o => o.value) }, { name: 'Employee Issue', options: empIssueOptions.map(o => o.value) }].flatMap(cat =>
                      cat.options.map((opt, idx) => (
                        <option key={cat.name + '-' + idx} value={`${cat.name}|${opt}`}>{cat.name}: {opt}</option>
                      ))
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Score</label>
                  <select
                    value={selectedScoreValue}
                    onChange={e => setSelectedScoreValue(e.target.value)}
                    className="w-full px-4 py-2 border rounded-md bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    <option value="">Select score</option>
                    {[10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map(val => (
                      <option key={val} value={val}>{val}</option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={async () => {
                    if (!selectedScoreOption || !selectedScoreValue) return;
                    const { category, value } = selectedScoreOption;
                    const score_name = (category.includes("Type") ? "Type: " : "Issue: ") + value;
                    const score_value = Number(selectedScoreValue);
                    const description = "Updated via UI";
                    try {
                      // Find if editing an existing score
                      const editingScore = severityScores.find(
                        (ls) => ls.score_name === score_name
                      );
                      if (editingScore && (editingScore.id || editingScore.id)) {
                        // Update existing score
                        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/helpdesk/severity/${editingScore.id}`, {
                          method: "PUT",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ score_name, score_value, description }),
                        });
                        if (!res.ok) {
                          let errMsg = 'Failed to update severity score.';
                          try {
                            const err = await res.json();
                            errMsg = err.error || errMsg;
                          } catch { }
                          toast.error(errMsg);
                          return;
                        }
                        toast.success('Severity score updated successfully!');
                      } else {
                        // Add new score
                        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/helpdesk/severity`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ score_name, score_value, description }),
                        });
                        if (!res.ok) {
                          let errMsg = 'Failed to add severity score.';
                          try {
                            const err = await res.json();
                            errMsg = err.error || errMsg;
                          } catch { }
                          toast.error(errMsg);
                          return;
                        }
                        toast.success('Severity score added successfully!');
                      }
                      // Refresh the scores list after add/update
                      const refreshed = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/helpdesk/severity`);
                      const data = await refreshed.json();
                      setSeverityScores(Array.isArray(data) ? data : []);
                    } catch {
                      toast.error('Network error while saving severity score');
                    }
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white rounded-md text-sm font-semibold shadow-md hover:shadow-lg transition-all"
                >
                  Save
                </button>
              </div>
             
              {/* Display Current Severity Scores */}
              <div className="mt-8">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Current Severity Scores</h3>
                {severityScores.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400 text-sm">No severity scores configured yet.</p>
                ) : (
                  <div className="space-y-2">
                    {severityScores.map((score) => {
                      return (
                        <div key={score.id} className="bg-gray-100 dark:bg-gray-600 rounded-lg p-3 flex items-center justify-between shadow-sm">
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {score.score_name}
                          </span>
                          <div className="flex items-center gap-3">
                            <span className="text-lg font-bold text-gray-900 dark:text-white">
                              {score.score_value}
                            </span>
                            <button
                              onClick={async () => {
                                try {
                                  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/helpdesk/severity/${score.id}`, {
                                    method: "DELETE",
                                  });
                                  if (res.ok) {
                                    toast.success('Severity score deleted successfully!');
                                    // Refresh the scores list
                                    const refreshed = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/helpdesk/severity`);
                                    const data = await refreshed.json();
                                    setSeverityScores(Array.isArray(data) ? data : []);
                                  } else {
                                    toast.error('Failed to delete severity score');
                                  }
                                } catch {
                                  toast.error('Network error while deleting severity score');
                                }
                              }}
                              className="text-red-500 hover:text-red-700 text-sm p-1"
                            >
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M6.541 3.792a2.25 2.25 0 0 1 2.25-2.25h2.417a2.25 2.25 0 0 1 2.25 2.25v.25h3.208a.75.75 0 0 1 0 1.5h-.29v10.666a2.25 2.25 0 0 1-2.25 2.25h-8.25a2.25 2.25 0 0 1-2.25-2.25V5.541h-.292a.75.75 0 1 1 0-1.5H6.54zm8.334 9.454V5.541h-9.75v10.667c0 .414.336.75.75.75h8.25a.75.75 0 0 0 .75-.75zM8.041 4.041h3.917v-.25a.75.75 0 0 0-.75-.75H8.791a.75.75 0 0 0-.75.75zM8.334 8a.75.75 0 0 1 .75.75v5a.75.75 0 1 1-1.5 0v-5a.75.75 0 0 1 .75-.75m4.083.75a.75.75 0 0 0-1.5 0v5a.75.75 0 1 0 1.5 0z" clipRule="evenodd" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
                )}
              </div>
        {/* Standalone legend visible only on Severity Table tab */}
        {activeTab === 'server' && (
          <div className="w-full flex justify-center my-4">
            <div className="w-full max-w-xl rounded-full border border-gray-300 dark:border-gray-600 bg-white/60 dark:bg-gray-800/60 backdrop-blur px-3 py-1 shadow-inner">
              <div className="flex items-center justify-center gap-6">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] sm:text-xs font-medium text-gray-900 dark:text-white">100-90</span>
                  <span className="inline-block px-2 py-0.5 bg-red-100 border border-red-300 rounded-full text-[10px] sm:text-xs font-medium text-red-800">high</span>
            </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] sm:text-xs font-medium text-gray-900 dark:text-white">80-60</span>
                  <span className="inline-block px-2 py-0.5 bg-yellow-100 border border-yellow-300 rounded-full text-[10px] sm:text-xs font-medium text-yellow-800">medium</span>
        </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] sm:text-xs font-medium text-gray-900 dark:text-white">50-10</span>
                  <span className="inline-block px-2 py-0.5 bg-green-100 border border-green-300 rounded-full text-[10px] sm:text-xs font-medium text-green-800">low</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
