'use client';
import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { TrashBinIcon } from "../../../../icons";
import { Briefcase } from "lucide-react";
import Alert from "@/components/ui/alert/Alert";
import DashboardHeader from "@/components/header/DashboardHeader";
 
interface LeadOption {
  optionid: number;
  option_label: string;
  list_label: string;
}
interface LeadScore {
  _id?: string;
  id?: number;
  category: string;
  value: string;
  score: number;
  label?: string;
  score_name?: string;
  score_value?: string;
}

interface Category {
  id: number;
  name: string;
  options: string[];
  newOption: string;
}

// Local alert state using the shared Alert UI component
type AlertType = 'success' | 'error' | 'info' | 'warning';
interface LocalAlert {
  id: string;
  type: AlertType;
  message: string;
}

const CRMSettingsContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Tab state management
  const [activeTab, setActiveTab] = useState<'settings' | 'customize'>('settings');
  
  // Initialize tab based on URL params
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'customize') {
      setActiveTab('customize');
    } else {
      setActiveTab('settings');
    }
  }, [searchParams]);

  const handleTabChange = (tab: 'settings' | 'customize') => {
    setActiveTab(tab);
    if (tab === 'customize') {
      router.push('/crm-settings/customize');
    } else {
      router.push('/crm-settings');
    }
  };

  const [categories, setCategories] = useState<Category[]>([
    { id: 1, name: "Interest", options: [], newOption: "" },
    { id: 2, name: "Source", options: [], newOption: "" },
  ]);

  type EmailAlert = { email: string; type?: string; id?: string };
  const [emails, setEmails] = useState<EmailAlert[]>([]);
  const [newEmail, setNewEmail] = useState("");
  // Dropdown next to email shows Interest options
  const [selectedInterest, setSelectedInterest] = useState<string>("");
  const [userMessage, setUserMessage] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [userMessageError, setUserMessageError] = useState(""); // New: error for char limit
  const [scoreInput, setScoreInput] = useState("");
  const [selectedOption, setSelectedOption] = useState<{ category: string; value: string } | null>(null);
  // Update the state type
  const [leadScores, setLeadScores] = useState<LeadScore[]>([]);
  const [isLoadingEmails, setIsLoadingEmails] = useState(true);
  const [isLoadingLeadScores, setIsLoadingLeadScores] = useState(true);
  // Add state for email error
  const [emailError, setEmailError] = useState("");
  // Add state for dropdown visibility
  const [openDropdowns, setOpenDropdowns] = useState<{ [key: number]: boolean }>({});

  // Lightweight alert queue
  const [alerts, setAlerts] = useState<LocalAlert[]>([]);
  const showAlert = (message: string, type: AlertType = 'info') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setAlerts(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setAlerts(prev => prev.filter(a => a.id !== id));
    }, 5000);
  };

  // Add click outside handler for dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      
      // Close dropdowns when clicking outside
      if (!target.closest('.dropdown-container')) {
        setOpenDropdowns({});
      }
      
      // Clear email error when clicking outside email input
      if (!target.closest('input[type="email"]')) {
        setEmailError('');
      }
    };

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpenDropdowns({});
        setEmailError('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscapeKey);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, []);

 
  useEffect(() => {
    // Fetch options
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/leads/options`)
      .then((res) => res.json())
      .then((data: unknown) => {
        // The endpoint returns an array, so ensure type safety
        const optionsArray: LeadOption[] = Array.isArray(data) ? data as LeadOption[] : [];
        setCategories((prev) =>
          prev.map((cat) => {
            const options = optionsArray
              .filter((item: LeadOption) => item.optionid === cat.id)
              .map((item: LeadOption) => item.list_label);
            return { ...cat, options };
          })
        );
      })
      .catch((error) => {
        console.error('Failed to load options:', error);
        showAlert('Failed to load form options', 'error');
      });

    // Fetch email alerts
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/leads/email-alerts`)
      .then((res) => res.json())
      .then((data) => {
        const emailsArray = Array.isArray(data) ? data : [];
        setEmails(
          emailsArray.map((e: { email: string; type?: string; id?: string }) => ({
            email: e.email,
            type: e.type,
            id: e.id,
          }))
        );
      })
      .catch((error) => {
        console.error('Failed to load emails:', error);
        showAlert('Failed to load email alerts', 'error');
      })
      .finally(() => setIsLoadingEmails(false));

    // Fetch confirmation message
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/leads/confirmation-message`)
      .then((res) => res.json())
      .then((data) => {
        if (data?.message) setUserMessage(data.message);
      })
      .catch((error) => {
        console.error('Failed to load confirmation message:', error);
        showAlert('Failed to load confirmation message', 'error');
      });

    // Fetch lead scores from new endpoint
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/leads/wk-lead-scores`)
      .then((res) => res.json())
      .then((data) => {
        // Debug: Log the actual API response structure
        console.log('🔍 Lead scores API response:', data);
        const scoresArray = Array.isArray(data) ? data : [];
        console.log('📊 Processed lead scores:', scoresArray);
        if (scoresArray.length > 0) {
          console.log('🔑 First lead score object keys:', Object.keys(scoresArray[0]));
          console.log('🔑 First lead score object:', scoresArray[0]);
        }
        setLeadScores(scoresArray);
      })
      .catch((err) => {
        setLeadScores([]);
        showAlert('Failed to fetch lead scores from backend!', 'error');
        console.error('Failed to fetch lead scores', err);
      })
      .finally(() => setIsLoadingLeadScores(false));
  }, []);

 


 

  const handleAddOption = async (categoryId: number) => {
    const updated = [...categories];
    const index = updated.findIndex((cat) => cat.id === categoryId);
    const cat = updated[index];
    const newOpt = cat.newOption.trim();
    
    // Validation for minimum and maximum characters
    if (!newOpt) {
      showAlert('Please enter an option!', 'error');
      return;
    }
    
    if (newOpt.length < 2) {
      showAlert('Option must be at least 2 characters long!', 'error');
      return;
    }
    
    if (newOpt.length > 100) {
      showAlert('Option cannot exceed 100 characters!', 'error');
      return;
    }
    
    // Validation for letters, numbers, and spaces only (no special characters)
    if (!/^[a-zA-Z0-9 ]+$/.test(newOpt)) {
      showAlert('Option can only contain letters, numbers, and spaces (no special characters)!', 'error');
      return;
    }
    
    if (cat.options.includes(newOpt)) {
      showAlert('Option already exists!', 'error');
      return;
    }
    if (cat.options.length >= 20) {
      showAlert('Maximum 20 options allowed!', 'error');
      return;
    }

 

    try {
      const optionLabel = cat.name.toLowerCase();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/leads/options`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ option_label: optionLabel, list_label: newOpt }),
      });

 

      if (res.ok) {
        const newCat = { ...cat, options: [...cat.options, newOpt], newOption: "" };
        updated[index] = newCat;
        setCategories([...updated]);
        showAlert('Option added successfully!', 'success');
      } else {
        let errMsg = "Failed to add option";
        try {
          const err = await res.json();
          errMsg = err.error || errMsg;
        } catch {}
        showAlert(errMsg, 'error');
      }
    } catch (err: unknown) {
      console.error('Failed to add option', (err as Error)?.message || err);
      showAlert('Failed to add option', 'error');
    }
  };

 

  const handleInputChange = (id: number, value: string) => {
    // Allow all characters to be typed, but show validation message for special characters
    setCategories((prev) =>
      prev.map((cat) => (cat.id === id ? { ...cat, newOption: value } : cat))
    );
  };

 

  const removeOption = async (id: number, value: string) => {
    const cat = categories.find((cat) => cat.id === id);
    if (!cat) return;

 

    try {
      const optionLabel = cat.name.toLowerCase();
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/leads/options/${encodeURIComponent(optionLabel)}/${encodeURIComponent(value)}`,
        {
          method: "DELETE",
        }
      );

 

      if (response.ok) {
        setCategories((prev) =>
          prev.map((cat) =>
            cat.id === id
              ? { ...cat, options: cat.options.filter((o) => o !== value) }
              : cat
          )
        );
        showAlert('Option deleted successfully!', 'success');
      } else {
        let errMsg = "Failed to delete option from server";
        try {
          const err = await response.json();
          errMsg = err.detail || errMsg;
        } catch {}
        showAlert(errMsg, 'error');
      }
    } catch (err: unknown) {
      console.error('❌ Error deleting option:', (err as Error)?.message || err);
      showAlert('Failed to delete option', 'error');
    }
  };

 

  // Comprehensive email validation
  const validateEmail = (email: string): string | true => {
    // Check if email is empty
    if (!email.trim()) return "Email is required.";
    
    // Check maximum length (256 characters)
    if (email.length > 256) return "Email must be maximum 256 characters.";
    
    // Check for blank spaces
    if (email.includes(' ')) return "Email should not contain blank spaces.";
    
    // Check if starts with special character
    if (/^[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(email)) {
      return "Email should not start with a special character.";
    }
    
    // Check for exactly one @ symbol
    const atCount = (email.match(/@/g) || []).length;
    if (atCount === 0) return "Email must contain exactly one @ symbol.";
    if (atCount > 1) return "Email must contain exactly one @ symbol.";
    
    // Check domain format (must have at least one dot after @)
    const parts = email.split('@');
    if (parts.length !== 2) return "Invalid email format.";
    
    const domain = parts[1];
    if (!domain.includes('.') || domain.startsWith('.') || domain.endsWith('.')) {
      return "Invalid domain format.";
    }
    
    // Enhanced domain validation
    const domainParts = domain.split('.');
    if (domainParts.length < 2) return "Invalid domain format.";
    
    // Check each domain part
    for (let i = 0; i < domainParts.length; i++) {
      const part = domainParts[i];
      
      // Domain part cannot be empty
      if (!part || part.length === 0) return "Invalid domain format.";
      
      // Domain part cannot start or end with hyphen
      if (part.startsWith('-') || part.endsWith('-')) return "Domain parts cannot start or end with hyphen.";
      
      // Domain part can only contain letters, numbers, and hyphens
      if (!/^[a-zA-Z0-9-]+$/.test(part)) return "Domain can only contain letters, numbers, and hyphens.";
      
      // Domain part cannot be longer than 63 characters
      if (part.length > 63) return "Domain parts cannot exceed 63 characters.";
    }
    
    // Check TLD (top-level domain) - must be at least 2 characters
    const tld = domainParts[domainParts.length - 1];
    if (tld.length < 2) return "Top-level domain must be at least 2 characters.";
    
    // Check if TLD contains only letters
    if (!/^[a-zA-Z]+$/.test(tld)) return "Top-level domain must contain only letters.";
    
    // Check local part (before @)
    const localPart = parts[0];
    
    // Local part cannot be empty
    if (!localPart || localPart.length === 0) return "Local part cannot be empty.";
    
    // Local part cannot be longer than 64 characters
    if (localPart.length > 64) return "Local part cannot exceed 64 characters.";
    
    // Local part can contain letters, numbers, and specific special characters
    if (!/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+$/.test(localPart)) {
      return "Local part contains invalid characters.";
    }
    
    // Local part cannot start or end with dot
    if (localPart.startsWith('.') || localPart.endsWith('.')) {
      return "Local part cannot start or end with a dot.";
    }
    
    // Local part cannot have consecutive dots
    if (localPart.includes('..')) return "Local part cannot have consecutive dots.";
    
    return true;
  };

 

  const handleAddEmail = async () => {
    // Require selecting a Type first
    if (!selectedInterest) {
      showAlert('Please select a Type before adding an email.', 'error');
      return;
    }
    const email = newEmail.trim();
    const result = validateEmail(email);
    if (result !== true) {
      setEmailError(result as string);
      return;
    }
    if (!email) {
      setEmailError("Please enter an email address!");
      return;
    }
    if (emails.length >= 20) {
      showAlert('Maximum 20 emails allowed!', 'error');
      return;
    }

 

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/leads/email-alerts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, type: selectedInterest }),
      });

 

      if (res.ok) {
        let created: { email: string; type?: string; id?: string } | null = null;
        try {
          const json = await res.json();
          created = { email: json.email || email, type: json.type || selectedInterest || undefined, id: json.id };
        } catch {
          created = { email, type: selectedInterest || undefined };
        }
        setEmails([...emails, created!]);
        setNewEmail("");
        setSelectedInterest("");
        setEmailError(""); // Clear error on successful add
        showAlert('Email added successfully!', 'success');
      } else {
        const err = await res.json();
        showAlert(err.error || 'Failed to add email', 'error');
      }
    } catch {
      console.error('❌ Failed to add email');
      showAlert('Failed to add email', 'error');
    }
  };

 

  const removeEmail = async (email: string) => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/leads/email-alerts/${encodeURIComponent(email)}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        setEmails((prev) => prev.filter((e) => e.email !== email));
        showAlert('Email removed successfully!', 'success');
      } else {
        showAlert('Failed to remove email', 'error');
      }
    } catch (err) {
      console.error('❌ Failed to delete email', err);
      showAlert('Failed to delete email', 'error');
    }
  };

 

  const handleToggleEdit = async () => {
    if (isEditing) {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/leads/confirmation-message`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: userMessage }),
        });
        if (res.ok) {
          showAlert('Confirmation message saved successfully!', 'success');
        } else {
          showAlert('Failed to save confirmation message', 'error');
        }
      } catch {
        console.error('❌ Failed to update confirmation message');
        showAlert('Failed to update confirmation message', 'error');
      }
    }
    setIsEditing(!isEditing);
  };

 

  const handleUserMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value.length < 15) {
      setUserMessageError("Message must be at least 15 characters long");
    } else if (value.length > 250) {
      setUserMessageError("Character limit exceeded (250 characters max)");
    } else {
      setUserMessageError("");
    }
    setUserMessage(value.slice(0, 250));
  };

 

  return (
    <div className="w-full p-4 sm:p-6 lg:p-8 bg-gray-50 dark:bg-gray-900 min-h-screen">
      {/* Alerts from shared @alerts/ component */}
      <div className="fixed top-56 right-6 z-[2147483647] space-y-3 max-w-sm">
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

      {/* Professional Header */}
      <DashboardHeader
        variant="default"
        size="lg"
        title="CRM Settings"
        subtitle="Configure CRM settings, lead categories, and notification preferences with advanced customization options"
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'CRM Settings', href: '/crm-settings' }
        ]}
        icon={() => (
          <Briefcase className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
        )}
      />

      {/* Enhanced Tab Navigation */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 mb-8 overflow-hidden">
        <div className="flex">
          <button
            onClick={() => handleTabChange('settings')}
            className={`flex-1 flex items-center justify-center gap-3 px-6 py-4 font-semibold text-sm transition-all duration-300 ${
              activeTab === 'settings'
                ? 'text-blue-600 dark:text-blue-400 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <div className={`p-2 rounded-lg transition-colors duration-200 ${
              activeTab === 'settings' 
                ? 'bg-blue-100 dark:bg-blue-800/30' 
                : 'bg-gray-100 dark:bg-gray-700'
            }`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <span>Settings</span>
            {activeTab === 'settings' && (
              <div className="w-2 h-2 bg-blue-600 dark:bg-blue-400 rounded-full animate-pulse"></div>
            )}
          </button>
          <button
            onClick={() => handleTabChange('customize')}
            className={`flex-1 flex items-center justify-center gap-3 px-6 py-4 font-semibold text-sm transition-all duration-300 ${
              activeTab === 'customize'
                ? 'text-blue-600 dark:text-blue-400 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <div className={`p-2 rounded-lg transition-colors duration-200 ${
              activeTab === 'customize' 
                ? 'bg-blue-100 dark:bg-blue-800/30' 
                : 'bg-gray-100 dark:bg-gray-700'
            }`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z" />
              </svg>
            </div>
            <span>Customize Contact Us</span>
            {activeTab === 'customize' && (
              <div className="w-2 h-2 bg-blue-600 dark:bg-blue-400 rounded-full animate-pulse"></div>
            )}
          </button>
        </div>
      </div>
      
      {/* Tab Content */}
      <div className="space-y-8">
      
        {/* Lead Form Category */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-800/30 rounded-lg">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Lead Form Category</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">You can add/update categories for better lead organization.</p>
              </div>
            </div>
          </div>
          <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {categories.map((cat) => (
              <div key={cat.id} className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6 space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <div className={`w-3 h-3 rounded-full ${cat.name === "Interest" ? "bg-blue-400" : "bg-blue-400"}`}></div>
                  <label className="text-lg font-semibold text-gray-900 dark:text-white">
                    Options for &quot;{cat.name}&quot;
                  </label>
                </div>
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <input
                        value={cat.newOption}
                        onChange={(e) => handleInputChange(cat.id, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddOption(cat.id);
                          }
                        }}
                        placeholder={cat.name === "Interest" ? "Add new interest" : "Add new option"}
                        maxLength={100}
                        className="w-full px-4 py-3 border-2 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 border-gray-300 dark:border-gray-600 transition-all duration-200"
                      />
                      {/* Character count */}
                      <div className="flex justify-between items-center mt-2">
                        <div className={`text-xs font-medium ${cat.newOption.length > 90 ? "text-blue-500" : "text-gray-500"}`}>
                          {cat.newOption.length}/100 characters
                        </div>
                        {cat.options.length > 0 && (
                          <div className="text-xs text-gray-500">
                            {cat.options.length} options
                          </div>
                        )}
                      </div>
                      
                      {/* Validation alerts */}
                      {cat.newOption.length > 0 && cat.newOption.length < 2 && (
                        <div className="text-xs text-blue-500 mt-1 flex items-center gap-1">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          Option must be at least 2 characters long!
                        </div>
                      )}
                      {cat.newOption.length > 0 && !/^[a-zA-Z0-9 ]+$/.test(cat.newOption) && (
                        <div className="text-xs text-blue-500 mt-1 flex items-center gap-1">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          Only letters, numbers, and spaces allowed (no special characters)!
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAddOption(cat.id)}
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-xl font-semibold self-start hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                    >
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Add
                      </div>
                    </button>
                  </div>
                <div className="relative dropdown-container">
                  <div 
                    className="w-full px-4 py-3 border-2 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white cursor-pointer font-semibold flex items-center justify-between hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-200"
                    onClick={() => {
                      setOpenDropdowns(prev => ({
                        ...prev,
                        [cat.id]: !prev[cat.id]
                      }));
                    }}
                  >
                    <span className="text-gray-700 dark:text-gray-300">
                      {cat.name === "Interest" ? "Select interest" : `Select ${cat.name.toLowerCase()}`}
                    </span>
                    <svg 
                      className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${openDropdowns[cat.id] ? 'rotate-180' : ''}`} 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                  
                  {/* Dropdown content */}
                  {openDropdowns[cat.id] && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-600 rounded-xl shadow-2xl z-10 max-h-48 overflow-y-auto p-4">
                      {cat.options.length > 0 ? (
                        <div className="flex flex-wrap gap-3">
                          {cat.options.map((opt, idx) => (
                            <div
                              key={idx}
                              className={`px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-2 border-2 shadow-md transition-all duration-200 hover:shadow-lg cursor-pointer transform hover:-translate-y-0.5 ${
                                cat.name === "Interest" ? "bg-gradient-to-r from-blue-100 to-blue-100 text-blue-800 border-blue-300 hover:from-blue-200 hover:to-blue-200" : ""
                              } ${
                                cat.name === "Source" ? "bg-gradient-to-r from-blue-100 to-blue-100 text-blue-800 border-blue-300 hover:from-blue-200 hover:to-blue-200" : ""
                              }`}
                              onClick={() => {
                                console.log(`Selected ${cat.name}:`, opt);
                                // Close dropdown when selecting an option
                                setOpenDropdowns(prev => ({ ...prev, [cat.id]: false }));
                              }}
                            >
                              <span>{opt}</span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeOption(cat.id, opt);
                                }}
                                className={`hover:text-blue-500 transition-colors duration-200 font-bold p-1 rounded-full hover:bg-blue-100 ${
                                  cat.name === "Source" ? "text-blue-700" : "text-blue-700"
                                }`}
                                title="Remove"
                              >
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill="currentColor" fillRule="evenodd" d="M6.541 3.792a2.25 2.25 0 0 1 2.25-2.25h2.417a2.25 2.25 0 0 1 2.25 2.25v.25h3.208a.75.75 0 0 1 0 1.5h-.29v10.666a2.25 2.25 0 0 1-2.25 2.25h-8.25a2.25 2.25 0 0 1-2.25-2.25V5.541h-.292a.75.75 0 1 1 0-1.5H6.54zm8.334 9.454V5.541h-9.75v10.667c0 .414.336.75.75.75h8.25a.75.75 0 0 0 .75-.75zM8.041 4.041h3.917v-.25a.75.75 0 0 0-.75-.75H8.791a.75.75 0 0 0-.75.75zM8.334 8a.75.75 0 0 1 .75.75v5a.75.75 0 1 1-1.5 0v-5a.75.75 0 0 1 .75-.75m4.083.75a.75.75 0 0 0-1.5 0v5a.75.75 0 1 0 1.5 0z" clipRule="evenodd"></path></svg>
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="px-4 py-8 text-gray-500 text-center">
                          <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                          </svg>
                          <p className="text-sm font-medium">No options available</p>
                          <p className="text-xs text-gray-400 mt-1">Add some options to get started</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Email Notifications */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-50 to-blue-50 dark:from-blue-900/20 dark:to-blue-900/20 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-800/30 rounded-lg">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Email Notifications</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">Configure email alerts for different lead types and categories.</p>
              </div>
            </div>
          </div>
          <div className="p-6">
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
            {/* Dropdown populated with Interest values */}
            <div className="flex-1">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Notification Type</label>
              <select
                value={selectedInterest}
                onChange={e => setSelectedInterest(e.target.value)}
                className="w-full px-4 py-3 border-2 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 border-gray-300 dark:border-gray-600 transition-all duration-200"
              >
                <option value="">Select notification type</option>
                {categories
                  .filter(cat => cat.name === "Interest")
                  .flatMap(cat => cat.options)
                  .map((opt, idx) => (
                    <option key={`interest-${idx}`} value={opt}>{opt}</option>
                  ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Email Address</label>
              <input
                type="email"
                value={newEmail}
                placeholder="Enter email address"
                onChange={e => {
                  setNewEmail(e.target.value);
                  // Real-time validation
                  if (e.target.value.trim()) {
                    const result = validateEmail(e.target.value);
                    setEmailError(result === true ? '' : result);
                  } else {
                    setEmailError('');
                  }
                }}
                onBlur={e => {
                  const result = validateEmail(e.target.value);
                  setEmailError(result === true ? '' : result);
                }}
                onFocus={() => {
                  setEmailError('');
                }}
                onKeyDown={e => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddEmail();
                  }
                }}
                maxLength={256}
                autoCapitalize="none"
                autoCorrect="off"
                autoComplete="email"
                spellCheck="false"
                className={`w-full px-4 py-3 border-2 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 ${
                  emailError ? 'border-blue-500 focus:ring-blue-500' : 'border-gray-300 dark:border-gray-600 focus:border-blue-500'
                }`}
              />
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={handleAddEmail}
                disabled={!selectedInterest}
                className={`px-6 py-3 rounded-xl font-semibold text-white transition-all duration-200 shadow-lg ${
                  !selectedInterest
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-600 to-blue-600 hover:from-blue-700 hover:to-blue-700 hover:shadow-xl transform hover:-translate-y-0.5'
                }`}
              >
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Add Email
                </div>
              </button>
            </div>
          </div>
          {emailError && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-3 mb-4">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span className="text-sm text-blue-700 dark:text-blue-300 font-medium">{emailError}</span>
              </div>
            </div>
          )}
          <div className="space-y-4">
            {isLoadingEmails ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-500 text-sm">Loading emails...</span>
              </div>
            ) : (
              (() => {
                const grouped = emails.reduce((acc: Record<string, EmailAlert[]>, e) => {
                  const key = (e.type || 'general').toString();
                  if (!acc[key]) acc[key] = [];
                  acc[key].push(e);
                  return acc;
                }, {});
                const entries = Object.entries(grouped);
                if (entries.length === 0) {
                  return (
                    <div className="text-center py-8">
                      <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <p className="text-gray-500 text-sm font-medium">No emails added yet</p>
                      <p className="text-gray-400 text-xs mt-1">Add email addresses to receive notifications</p>
                    </div>
                  );
                }
                return entries.map(([type, list]) => (
                  <div key={type} className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                      <span className="font-semibold text-gray-900 dark:text-white capitalize">{type}</span>
                      <span className="text-xs text-gray-500 bg-gray-200 dark:bg-gray-600 px-2 py-1 rounded-full">{list.length} emails</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {list.map((item, idx) => (
                        <div key={item.email + idx} className="flex items-center gap-2 bg-white dark:bg-gray-800 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 shadow-sm">
                          <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          <span className="text-sm text-gray-900 dark:text-white font-medium">{item.email}</span>
                          <button
                            onClick={() => removeEmail(item.email)}
                            className="hover:text-blue-500 focus:outline-none p-1 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/20 transition-colors duration-200"
                            title="Remove email"
                          >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill="currentColor" fillRule="evenodd" d="M6.541 3.792a2.25 2.25 0 0 1 2.25-2.25h2.417a2.25 2.25 0 0 1 2.25 2.25v.25h3.208a.75.75 0 0 1 0 1.5h-.29v10.666a2.25 2.25 0 0 1-2.25 2.25h-8.25a2.25 2.25 0 0 1-2.25-2.25V5.541h-.292a.75.75 0 1 1 0-1.5H6.54zm8.334 9.454V5.541h-9.75v10.667c0 .414.336.75.75.75h8.25a.75.75 0 0 0 .75-.75zM8.041 4.041h3.917v-.25a.75.75 0 0 0-.75-.75H8.791a.75.75 0 0 0-.75.75zM8.334 8a.75.75 0 0 1 .75.75v5a.75.75 0 1 1-1.5 0v-5a.75.75 0 0 1 .75-.75m4.083.75a.75.75 0 0 0-1.5 0v5a.75.75 0 1 0 1.5 0z" clipRule="evenodd"></path></svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ));
              })()
            )}
          </div>
          </div>
        </div>

        {/* User Confirmation Message */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-50 to-blue-50 dark:from-blue-900/20 dark:to-blue-900/20 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-800/30 rounded-lg">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">User Confirmation Message</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">This message will be sent to users after submitting the lead form.</p>
              </div>
            </div>
          </div>
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className={`text-sm font-semibold px-3 py-1 rounded-full ${
                  userMessage.length < 15 || userMessage.length === 250 
                    ? "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300" 
                    : "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300"
                }`}>
                  {userMessage.length}/250 characters
                </span>
                {userMessage.length >= 15 && userMessage.length < 250 && (
                  <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">✓ Valid length</span>
                )}
              </div>
              <button
                onClick={handleToggleEdit}
                className={`px-6 py-3 rounded-xl font-semibold text-white transition-all duration-200 shadow-lg ${
                  isEditing
                    ? "bg-gradient-to-r from-blue-600 to-blue-600 hover:from-blue-700 hover:to-blue-700"
                    : "bg-gradient-to-r from-blue-600 to-blue-600 hover:from-blue-700 hover:to-blue-700"
                } hover:shadow-xl transform hover:-translate-y-0.5`}
              >
                <div className="flex items-center gap-2">
                  {isEditing ? (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Save Message
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Edit Message
                    </>
                  )}
                </div>
              </button>
            </div>
            <textarea
              rows={6}
              maxLength={250}
              value={userMessage}
              onChange={handleUserMessageChange}
              disabled={!isEditing}
              placeholder="Write a confirmation message to send to users (minimum 15 characters)"
              className={`w-full px-4 py-4 border-2 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 resize-none ${
                isEditing 
                  ? "border-gray-300 dark:border-gray-600" 
                  : "opacity-70 border-gray-200 dark:border-gray-700"
              }`}
            />
            {userMessageError && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-3 mt-4">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm text-blue-700 dark:text-blue-300 font-medium">{userMessageError}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      </div>

      {/* Lead Score Settings Block */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-50 to-blue-50 dark:from-blue-900/20 dark:to-blue-900/20 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-800/30 rounded-lg">
              <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Lead Score Settings</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">Assign a score to each lead source or interest for better lead prioritization.</p>
            </div>
          </div>
        </div>
        <div className="p-6 space-y-6">
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Add/Update Lead Score</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Select Source or Interest</label>
              <select
                value={selectedOption ? `${selectedOption.category}|${selectedOption.value}` : ""}
                onChange={e => {
                  const [category, value] = e.target.value.split("|");
                  const newSelectedOption = category && value ? { category, value } : null;
                  setSelectedOption(newSelectedOption);
                  
                  // Auto-populate score if this lead already exists
                  if (newSelectedOption) {
                    const existingLead = leadScores.find(
                      (ls) => ls.label === newSelectedOption.value || ls.value === newSelectedOption.value
                    );
                    
                    if (existingLead) {
                      console.log('🎯 Found existing lead:', existingLead.label || existingLead.value, 'with score:', existingLead.score);
                      setScoreInput(String(existingLead.score));
                    } else {
                      console.log('🆕 New lead selected, clearing score');
                      setScoreInput("");
                    }
                  } else {
                    setScoreInput("");
                  }
                }}
                className="w-full px-4 py-3 border-2 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 border-gray-300 dark:border-gray-600 transition-all duration-200"
              >
                <option value="">Select a source or interest</option>
                {categories
                  .filter(cat => cat.name === "Source" || cat.name === "Interest")
                  .flatMap(cat =>
                    cat.options.map((opt, idx) => (
                      <option key={cat.name + '-' + idx} value={`${cat.name}|${opt}`}>
                        {cat.name}: {opt}
                      </option>
                    ))
                  )}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Score Value</label>
              <select
                value={scoreInput}
                onChange={e => setScoreInput(e.target.value)}
                className="w-full px-4 py-3 border-2 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 border-gray-300 dark:border-gray-600 transition-all duration-200"
              >
                <option value="">Select score</option>
                {[10,20,30,40,50,60,70,80,90,100].map(val => (
                  <option key={val} value={val}>{val} points</option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={async () => {
              if (!selectedOption || !scoreInput) return;
              try {
                // Check if a lead with the same name already exists
                const existingLead = leadScores.find(
                  (ls) => ls.label === selectedOption.value || ls.value === selectedOption.value
                );
                
                if (existingLead) {
                  // Lead already exists, update it with new score
                  console.log('🔄 Updating existing lead:', existingLead.label || existingLead.value, 'with new score:', scoreInput);
                  console.log('🔍 Existing lead object:', existingLead);
                  
                  // Try different update approaches based on available ID
                  let updateSuccess = false;
                  
                  // Method 1: Try updating by ID if available
                  if (existingLead._id || existingLead.id) {
                    console.log('📝 Trying to update by ID:', existingLead._id || existingLead.id);
                    try {
                      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/leads/wk-lead-scores/${existingLead._id || existingLead.id}`, {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          label: existingLead.label || existingLead.value,
                          score: Number(scoreInput),
                        }),
                      });
                      
                      if (res.ok) {
                        updateSuccess = true;
                        console.log('✅ Updated successfully by ID');
                      } else {
                        console.log('❌ Update by ID failed, trying by name...');
                      }
                    } catch (err) {
                      console.log('❌ Update by ID error:', err);
                    }
                  }
                  
                  // Method 2: Try updating by name if ID method failed
                  if (!updateSuccess) {
                    console.log('📝 Trying to update by name:', existingLead.label || existingLead.value);
                    try {
                      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/leads/wk-lead-scores/name/${encodeURIComponent(existingLead.label || existingLead.value)}`, {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          score: Number(scoreInput),
                        }),
                      });
                      
                      if (res.ok) {
                        updateSuccess = true;
                        console.log('✅ Updated successfully by name');
                      } else {
                        console.log('❌ Update by name failed');
                        const errorText = await res.text();
                        console.log('❌ Error response:', errorText);
                      }
                    } catch (err) {
                      console.log('❌ Update by name error:', err);
                    }
                  }
                  
                  // Method 3: Delete and recreate if both methods failed
                  if (!updateSuccess) {
                    console.log('🔄 Trying delete and recreate approach...');
                    try {
                      // First delete the existing lead
                      const deleteRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/leads/wk-lead-scores/name/${encodeURIComponent(existingLead.label || existingLead.value)}`, {
                        method: "DELETE",
                        headers: { "Content-Type": "application/json" },
                      });
                      
                      if (deleteRes.ok) {
                        console.log('✅ Deleted existing lead, now creating new one...');
                        
                        // Then create new lead with updated score
                        const createRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/leads/wk-lead-scores`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            label: existingLead.label || existingLead.value,
                            score: Number(scoreInput),
                          }),
                        });
                        
                        if (createRes.ok) {
                          updateSuccess = true;
                          console.log('✅ Recreated lead successfully');
                        } else {
                          console.log('❌ Failed to recreate lead');
                        }
                      } else {
                        console.log('❌ Failed to delete existing lead');
                      }
                    } catch (err) {
                      console.log('❌ Delete and recreate error:', err);
                    }
                  }
                  
                  if (updateSuccess) {
                    showAlert(`Lead score updated successfully! ${existingLead.label || existingLead.value} score changed to ${scoreInput}`, 'success');
                  } else {
                    showAlert('Failed to update lead score. Please try again.', 'error');
                    return;
                  }
                } else {
                  // Lead doesn't exist, create new one
                  console.log('➕ Creating new lead:', selectedOption.value, 'with score:', scoreInput);
                  
                  const payload = {
                    label: selectedOption.value,
                    score: Number(scoreInput),
                  };
                  
                  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/leads/wk-lead-scores`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                  });
                  
                  if (!res.ok) {
                    let errMsg = 'Failed to add lead score.';
                    try {
                      const err = await res.json();
                      errMsg = err.error || errMsg;
                    } catch {}
                    showAlert(errMsg, 'error');
                    return;
                  }
                  showAlert(`Lead score added successfully! ${selectedOption.value} with score ${scoreInput}`, 'success');
                }
                
                // Refresh the scores list after add/update
                try {
                  const refreshRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/leads/wk-lead-scores`);
                  const data = await refreshRes.json();
                  setLeadScores(Array.isArray(data) ? data : []);
                  
                  // Clear the form after successful save
                  setSelectedOption(null);
                  setScoreInput("");
                } catch {
                  showAlert('Failed to refresh lead scores', 'error');
                }
              } catch {
                showAlert('Network error while saving lead score', 'error');
              }
            }}
                className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-600 hover:from-blue-700 hover:to-blue-700 text-white rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                <div className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Save Score
                </div>
              </button>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Current Lead Scores</h3>
          {isLoadingLeadScores ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-500 text-sm">Loading scores...</span>
            </div>
          ) : leadScores.length === 0 ? (
            <div className="text-center py-8">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <p className="text-gray-500 text-sm font-medium">No scores assigned yet</p>
              <p className="text-gray-400 text-xs mt-1">Add lead scores to prioritize your leads</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {leadScores.map((ls, idx) => (
                <div key={idx} className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-600 shadow-sm hover:shadow-md transition-all duration-200">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${ls.category === 'Source' ? 'bg-blue-400' : 'bg-blue-400'}`}></div>
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{ls.category || 'Interest/Source'}</span>
                    </div>
                    <button
                      onClick={async (e) => {
                      e.stopPropagation();
                      
                      console.log('🗑️ Attempting to delete lead score:', ls);
                      console.log('🔑 Available keys in object:', Object.keys(ls));
                      
                      // Removed confirmation popup for direct deletion
                      
                      try {
                        // Backend expects DELETE with name in URL path
                        const leadName = ls.label || ls.value;
                        
                        if (!leadName) {
                          showAlert('Cannot delete: Lead name is missing', 'error');
                          return;
                        }
                        
                        console.log('🌐 Sending DELETE request for name:', leadName);
                        
                        // Use the correct DELETE endpoint with name in URL path
                        console.log('🔄 Sending DELETE to /name/{name} endpoint...');
                        const deleteRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/leads/wk-lead-scores/name/${encodeURIComponent(leadName)}`, {
                          method: 'DELETE',
                          headers: {
                            'Content-Type': 'application/json',
                          },
                        });
                        
                        console.log('📡 DELETE response status:', deleteRes.status);
                        
                        if (!deleteRes.ok) {
                          let errMsg = 'Failed to delete lead score.';
                          try {
                            const err = await deleteRes.json();
                            errMsg = err.error || err.detail || err.message || errMsg;
                            console.error('❌ Delete error response:', err);
                          } catch (parseErr) {
                            console.error('❌ Failed to parse error response:', parseErr);
                          }
                          showAlert(errMsg, 'error');
                          return;
                        }
                        
                        // Check if the delete was actually successful by verifying the response
                        let deleteSuccess = false;
                        try {
                          const responseData = await deleteRes.json();
                          console.log('📋 Delete response data:', responseData);
                          
                          // Check if the response indicates success
                          if (responseData.success || responseData.message || responseData.deleted) {
                            deleteSuccess = true;
                          } else if (responseData.error) {
                            showAlert(responseData.error, 'error');
                            return;
                          } else {
                            // If no clear success/error indicator, assume success for 200 status
                            deleteSuccess = true;
                          }
                        } catch {
                          console.log('⚠️ Could not parse response, assuming success for 200 status');
                          deleteSuccess = true;
                        }
                        
                        if (deleteSuccess) {
                          showAlert('Lead score deleted successfully!', 'success');
                          
                          // Refresh the scores list after deletion
                          try {
                            const refreshRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/leads/wk-lead-scores`);
                            const data = await refreshRes.json();
                            setLeadScores(Array.isArray(data) ? data : []);
                          } catch (refreshErr) {
                            console.error('❌ Failed to refresh lead scores:', refreshErr);
                            showAlert('Lead score deleted but failed to refresh the list', 'warning');
                          }
                        } else {
                          showAlert('Delete request sent but may not have been processed correctly', 'warning');
                        }
                      } catch (deleteErr) {
                        console.error('❌ Network error while deleting:', deleteErr);
                        showAlert('Network error while deleting lead score', 'error');
                      }
                    }}
                    className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900/20 rounded-lg transition-all duration-200"
                    title="Delete lead score"
                  >
                    <TrashBinIcon className="w-4 h-4" />
                  </button>
                  </div>
                  <div className="mb-2">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {ls.value ? ls.value : (ls.label ? ls.label : '')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">{ls.score}</span>
                    <span className="text-xs text-gray-500">points</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        </div>
      </div>
    </div>
  );
};


const CRMSettings = () => {
  return (
    <Suspense fallback={<div className="p-6">Loading...</div>}>
      <CRMSettingsContent />
    </Suspense>
  );
};

export default CRMSettings;
