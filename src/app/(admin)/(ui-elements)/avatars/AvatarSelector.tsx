'use client';
import Avatar from "@/components/ui/avatar/Avatar";
import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { uploadAvatar, downloadAvatar } from "@/utils/api";


// Custom hook for localStorage initialization
const useLocalStorage = (key: string, defaultValue: string) => {
  const [value, setValue] = useState(defaultValue);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (isFirstRender.current) {
      const storedValue = window.localStorage.getItem(key);
      if (storedValue) {
        setValue(storedValue);
      }
      isFirstRender.current = false;
    }
  }, [key]);

  const updateValue = (newValue: string) => {
    setValue(newValue);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(key, newValue);
    }
  };

  return [value, updateValue] as const;
};

// Employee Ticket Form Configuration Interface
interface EmployeeTicketFormConfig {
  title: string;
  fields: {
    id: { label: string; placeholder: string; required: boolean };
    issueType: { label: string; required: boolean; options: string[] };
    issue: { label: string; required: boolean; options: string[] };
    message: { label: string; placeholder: string; required: boolean };
  };
  submitButtonText: string;
  successMessage: string;
}

const AvatarSelector = () => {
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showAvatarAlert, setShowAvatarAlert] = useState(false);
  const [showNameAlert, setShowNameAlert] = useState(false);
  const [selectedPath, setSelectedPath] = useState("");
  const [botName, setBotName] = useLocalStorage('chatbotName', 'Mobi.AI');
  const [activeTab, setActiveTab] = useState<'customize' | 'preview'>('customize');
  const [uploadedAvatarUrl, setUploadedAvatarUrl] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Responsive check for mobile
  // const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  useEffect(() => {
    // Auto-dismiss alerts after 3 seconds
    if (showAvatarAlert || showNameAlert) {
      const timer = setTimeout(() => {
        setShowAvatarAlert(false);
        setShowNameAlert(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showAvatarAlert, showNameAlert]);

  const handleAvatarSelect = async (avatarPath: string) => {
    setSelectedPath(avatarPath);
    setShowConfirmation(true);

    // Immediately update the preview
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('avatarChanged', {
        detail: { avatarPath: avatarPath }
      }));
    }

    // If it's a local avatar (Bot1, Bot2, Bot3), upload it to the server
    if (avatarPath.includes('/images/user/Bot')) {
      try {
        setIsUploading(true);
        setUploadError("");

        // Fetch the local image and convert it to a File object
        const response = await fetch(avatarPath);
        const blob = await response.blob();

        // Create a File object from the blob
        const fileName = avatarPath.split('/').pop() || 'avatar.png';
        const file = new File([blob], fileName, { type: blob.type });

        // Upload the file
        const uploadResponse = await uploadAvatar(file);
        console.log('Local avatar upload response:', uploadResponse);

        // Download the uploaded avatar URL
        const downloadResponse = await downloadAvatar();
        console.log('Download response:', downloadResponse);

        if (downloadResponse.image_url) {
          setUploadedAvatarUrl(downloadResponse.image_url);
          setSelectedPath(downloadResponse.image_url);

          // Update the preview with the uploaded avatar
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('avatarChanged', {
              detail: { avatarPath: downloadResponse.image_url }
            }));
          }
        }
      } catch (error) {
        console.error('Local avatar upload error:', error);
        setUploadError(error instanceof Error ? error.message : 'Local avatar upload failed');
      } finally {
        setIsUploading(false);
      }
    }
  };

  const confirmSelection = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('selectedChatbotAvatar', selectedPath);
      window.dispatchEvent(new CustomEvent('avatarChanged', { detail: { avatarPath: selectedPath } }));
    }
    setShowConfirmation(false);
    setShowAvatarAlert(true);
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBotName(e.target.value);
    // Dispatch custom event to notify SnippetActions of name change
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('nameChanged', {
        detail: { botName: e.target.value }
      }));
    }
  };


  // Avatar upload functions
  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('File size must be less than 5MB');
      return;
    }

    setIsUploading(true);
    setUploadError("");

    try {
      const response = await uploadAvatar(file);
      console.log('Upload response:', response);

      // After successful upload, download the avatar URL
      const downloadResponse = await downloadAvatar();
      console.log('Download response:', downloadResponse);

      if (downloadResponse.image_url) {
        setUploadedAvatarUrl(downloadResponse.image_url);
        setSelectedPath(downloadResponse.image_url);
        setShowConfirmation(true);
        setShowAvatarAlert(true);

        // Update the preview with the uploaded avatar
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('avatarChanged', {
            detail: { avatarPath: downloadResponse.image_url }
          }));
        }
      }
    } catch (error) {
      console.error('Upload error:', error);
      setUploadError(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  // Load uploaded avatar on component mount
  useEffect(() => {
    const loadUploadedAvatar = async () => {
      try {
        const response = await downloadAvatar();
        if (response.image_url) {
          setUploadedAvatarUrl(response.image_url);
        }
      } catch (error) {
        console.error('Failed to load uploaded avatar:', error);
      }
    };

    loadUploadedAvatar();
  }, []);

  const COLOR_THEMES = {
    "theme-1": {
      "color-1": "#000000",
      "color-2": "#1a1a1a",
      "color-3": "#404040",
      "color-4": "#cccccc",
      "color-5": "#ffffff"
    },
    "theme-2": {
      "color-1": "#ffffff",
      "color-2": "#f8f9fa",
      "color-3": "#e9ecef",
      "color-4": "#6c757d",
      "color-5": "#212529"

    },
    "theme-3": {
      "color-1": "#22223b",
      "color-2": "#4a4e69",
      "color-3": "#9a8c98",
      "color-4": "#c9ada7",
      "color-5": "#f2e9e4"
    },
    "theme-4": {
      "color-1": "#03045e",
      "color-2": "#0077b6",
      "color-3": "#00b4d8",
      "color-4": "#90e0ef",
      "color-5": "#caf0f8"
    },
    "theme-5": {
      "color-1": "#cad2c5",
      "color-2": "#84a98c",
      "color-3": "#52796f",
      "color-4": "#354f52",
      "color-5": "#2f3e46"
    },
    "theme-6": {
      "color-1": "#fefcfb",
      "color-2": "#1282a2",
      "color-3": "#034078",
      "color-4": "#001f54",
      "color-5": "#0a1128"
    },
    "theme-7": {
      "color-1": "#e0e1dd",
      "color-2": "#778da9",
      "color-3": "#415a77",
      "color-4": "#1b263b",
      "color-5": "#0d1b2a"
    },
    "theme-8": {
      "color-1": "#ecf39e",
      "color-2": "#90a955",
      "color-3": "#4f772d",
      "color-4": "#31572c",
      "color-5": "#132a13"
    },
    "theme-9": {
      "color-1": "#f6fff8",
      "color-2": "#eaf4f4",
      "color-3": "#cce3de",
      "color-4": "#a4c3b2",
      "color-5": "#6b9080"
    },
    "theme-10": {
      "color-1": "#e0b1cb",
      "color-2": "#be95c4",
      "color-3": "#9f86c0",
      "color-4": "#5e548e",
      "color-5": "#231942"
    },
    "theme-11": {
      "color-1": "#f7d1cd",
      "color-2": "#e8c2ca",
      "color-3": "#d1b3c4",
      "color-4": "#b392ac",
      "color-5": "#735d78"
    },
    "theme-12": {
      "color-1": "#f0ebd8",
      "color-2": "#748cab",
      "color-3": "#3e5c76",
      "color-4": "#1d2d44",
      "color-5": "#0d1321"
    },
    "theme-13": {
      "color-1": "#d6cfcb",
      "color-2": "#ccb7ae",
      "color-3": "#a6808c",
      "color-4": "#706677",
      "color-5": "#565264"
    },
    "theme-14": {
      "color-1": "#c9e4ca",
      "color-2": "#87bba2",
      "color-3": "#55828b",
      "color-4": "#3b6064",
      "color-5": "#364958"
    },
    "theme-15": {
      "color-1": "#cfe0c3",
      "color-2": "#9ec1a3",
      "color-3": "#70a9a1",
      "color-4": "#40798c",
      "color-5": "#1f363d"
    }
  };



  // Theme selection state
  const [selectedTheme, setSelectedTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('chatbotTheme') || 'theme-1';
    }
    return 'theme-1';
  });
  const [showThemeAlert, setShowThemeAlert] = useState(false);

  // Persist theme selection
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('chatbotTheme', selectedTheme);
    }
  }, [selectedTheme]);

  // Auto-dismiss theme alert
  useEffect(() => {
    if (showThemeAlert) {
      const timer = setTimeout(() => setShowThemeAlert(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showThemeAlert]);

  const handleThemeSelect = (themeKey: string) => {
    setSelectedTheme(themeKey);
    // Dispatch custom event to notify SnippetActions of theme change
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('themeChanged', {
        detail: { themeKey: themeKey }
      }));
    }
  };

  // Add state for hovered color preview
  const [hoveredColor, setHoveredColor] = useState<{ themeKey: string; colorKey: string } | null>(null);

  // Add welcome message customization
  const [welcomeMessage, setWelcomeMessage] = useLocalStorage('chatbotWelcomeMessage', "Hello! I'm your AI assistant. How can I help you today?");
  const [showWelcomeAlert, setShowWelcomeAlert] = useState(false);

  useEffect(() => {
    if (showWelcomeAlert) {
      const timer = setTimeout(() => setShowWelcomeAlert(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showWelcomeAlert]);



  // Add state for contact form customization
  interface ContactFormFieldConfig {
    label: string;
    placeholder: string;
    required: boolean;
  }
  // Update ContactFormFieldConfig and ContactFormConfig interfaces
  interface ContactFormDropdownConfig {
    label: string;
    placeholder: string;
    required: boolean;
    options: string[];
  }
  interface ContactFormConfig {
    title: string;
    fields: {
      name: ContactFormFieldConfig;
      email: ContactFormFieldConfig;
      phone?: ContactFormFieldConfig; // Make phone optional with ?
      dropdown1: ContactFormDropdownConfig;
      dropdown2: ContactFormDropdownConfig;
      message: ContactFormFieldConfig;
    };
    submitButtonText: string;
    successMessage: string;
  }

  const [contactFormConfig, setContactFormConfig] = useState<ContactFormConfig>({
    title: "Contact Us",
    fields: {
      name: { label: "Name", placeholder: "Your name", required: true },
      email: { label: "Email", placeholder: "your.email@example.com", required: true },
      dropdown1: { label: "Dropdown 1", placeholder: "Select an option", required: true, options: ["Option 1", "Option 2"] },
      dropdown2: { label: "Dropdown 2", placeholder: "Select an option", required: false, options: ["Option A", "Option B"] },
      message: { label: "Message", placeholder: "Your message...", required: true },
    },
    submitButtonText: "Send Message",
    successMessage: "Thank you for your message! We'll get back to you soon."
  });

  // Add LoginFormConfig interface
  interface LoginFormConfig {
    enabled: boolean;
    toggleOptions: string[];
    email: { label: string; placeholder: string; required: boolean };
    password: { label: string; placeholder: string; required: boolean };
    submitButtonText: string;
    successMessage: string;
  }

  const [loginFormConfig, setLoginFormConfig] = useState<LoginFormConfig>({
    enabled: true,
    toggleOptions: ["Customer", "Employee"],
    email: { label: "Email", placeholder: "Enter your email", required: true },
    password: { label: "Password", placeholder: "Enter your password", required: true },
    submitButtonText: "Login",
    successMessage: "Login successful!"
  });

  // Job Application Form Configuration
  interface JobApplicationFormConfig {
    title: string;
    fields: {
      name: { label: string; placeholder: string; required: boolean };
      email: { label: string; placeholder: string; required: boolean };
      phone: { label: string; placeholder: string; required: boolean };
      category: { label: string; required: boolean; options: string[] };
      experience: { label: string; required: boolean; options: string[] };
      resume: { label: string; required: boolean; maxSize: number };
    };
    submitButtonText: string;
    successMessage: string;
  }

  const [jobApplicationFormConfig, setJobApplicationFormConfig] = useState<JobApplicationFormConfig>({
    title: "Job Application",
    fields: {
      name: { label: "Full Name", placeholder: "Enter your full name", required: true },
      email: { label: "Email Address", placeholder: "your.email@example.com", required: true },
      phone: { label: "Phone Number", placeholder: "+1 (555) 123-4567", required: true },
      category: { label: "Job Category", required: true, options: ["Software Developer", "Designer", "Manager", "Analyst"] },
      experience: { label: "Experience Level", required: true, options: ["Entry Level", "Mid Level", "Senior", "Expert"] },
      resume: { label: "Resume/CV", required: true, maxSize: 5 }
    },
    submitButtonText: "Submit Application",
    successMessage: "Thank you for your application! We'll review it and get back to you soon."
  });

  // Customer Ticket Form Configuration
  interface CustomerTicketFormConfig {
    title: string;
    fields: {
      email: { label: string; placeholder: string; required: boolean };
      issueType: { label: string; required: boolean; options: string[] };
      issue: { label: string; required: boolean; options: string[] };
      message: { label: string; placeholder: string; required: boolean };
    };
    submitButtonText: string;
    successMessage: string;
  }

  const [customerTicketFormConfig, setCustomerTicketFormConfig] = useState<CustomerTicketFormConfig>({
    title: "Customer Support Ticket",
    fields: {
      email: { label: "Email Address", placeholder: "your.email@example.com", required: true },
      issueType: { label: "Issue Type", required: true, options: ["Technical", "Billing", "Account", "General"] },
      issue: { label: "Issue", required: true, options: ["Login Problem", "Payment Issue", "Feature Request", "Bug Report", "Other"] },
      message: { label: "Description", placeholder: "Please describe your issue in detail...", required: true }
    },
    submitButtonText: "Submit Ticket",
    successMessage: "Your ticket has been submitted! We'll get back to you within 24 hours."
  });

  const [employeeTicketFormConfig, setEmployeeTicketFormConfig] = useState<EmployeeTicketFormConfig>({
    title: "Employee Support Ticket",
    fields: {
      id: { label: "Employee ID", placeholder: "Enter your employee ID", required: true },
      issueType: { label: "Issue Type", required: true, options: ["IT Support", "HR", "Facilities", "General"] },
      issue: { label: "Issue", required: true, options: ["Computer Problem", "Access Request", "Equipment Issue", "Policy Question", "Other"] },
      message: { label: "Description", placeholder: "Please describe your issue in detail...", required: true }
    },
    submitButtonText: "Submit Ticket",
    successMessage: "Your ticket has been submitted! IT support will contact you soon."
  });

  const [expandedSection] = useState<string | null>("avatar");
  const [colorThemes] = useState<Record<string, Record<string, string>>>(COLOR_THEMES);
  const [isLoadingThemes] = useState(false);

  return (
    <div className="flex flex-col w-full gap-4 items-center">
      {/* Mobile Tab Bar */}
      <div className="w-full lg:hidden flex border-b-2 border-gray-200 dark:border-gray-700 rounded mb-6">
        <button
          className={`flex-1 py-3 text-center font-semibold transition-all duration-200 border-b-2 ${activeTab === 'customize' ? 'border-blue-600 text-blue-600 bg-gradient-to-t from-blue-50 to-transparent dark:from-blue-900/20' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
          onClick={() => setActiveTab('customize')}
        >
          <span className="flex items-center justify-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"></path>
            </svg>
            Customize
          </span>
        </button>
        <button
          className={`flex-1 py-3 text-center font-semibold transition-all duration-200 border-b-2 ${activeTab === 'preview' ? 'border-blue-600 text-blue-600 bg-gradient-to-t from-blue-50 to-transparent dark:from-blue-900/20' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
          onClick={() => setActiveTab('preview')}
        >
          <span className="flex items-center justify-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
            </svg>
            Preview
          </span>
        </button>
      </div>

      {/* Two-column responsive layout */}
      <div className="flex flex-col w-full">
        {/* Customization Controls (mobile: tab, desktop: full width) */}
        <div className={`w-full ${activeTab === 'customize' ? '' : 'hidden'} lg:flex flex-col gap-8`}>





          {/* Avatar Selection Section */}
          <div className="w-full bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-b border-gray-200 dark:border-gray-700">
              <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">Choose AI Agent Avatar</h3>
            </div>
            <div className="p-6">
              <div className="w-full">
                <div className="grid grid-cols-3 gap-4 mb-8">
                  {["Bot1", "Bot2", "Bot3"].map((bot, index) => (
                    <div
                      key={index}
                      onClick={async () => await handleAvatarSelect(`/images/user/${bot}.png`)}
                      className={`group relative cursor-pointer rounded-xl p-4 transition-all duration-200 flex flex-col items-center gap-3 min-h-[120px] ${selectedPath === `/images/user/${bot}.png`
                        ? "bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 ring-2 ring-blue-500 dark:ring-blue-400 shadow-lg scale-105"
                        : "bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 hover:shadow-md hover:scale-102 border border-gray-200 dark:border-gray-600"
                        }`}
                    >
                      <div className="relative">
                        <Avatar
                          src={`/images/user/${bot}.png`}
                          size="large"
                        />
                        {selectedPath === `/images/user/${bot}.png` && (
                          <div className="absolute -top-2 -right-2 bg-blue-600 dark:bg-blue-500 rounded-full p-1.5 shadow-lg animate-in zoom-in-50 duration-200">
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
                            </svg>
                          </div>
                        )}
                      </div>
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{bot}</span>
                    </div>
                  ))}

                  {/* Uploaded Avatar Display */}
                  {uploadedAvatarUrl && (
                    <div
                      onClick={async () => await handleAvatarSelect(uploadedAvatarUrl)}
                      className={`group relative cursor-pointer rounded-xl p-4 transition-all duration-200 flex flex-col items-center gap-3 min-h-[120px] ${selectedPath === uploadedAvatarUrl
                        ? "bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 ring-2 ring-blue-500 dark:ring-blue-400 shadow-lg scale-105"
                        : "bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 hover:shadow-md hover:scale-102 border border-gray-200 dark:border-gray-600"
                        }`}
                    >
                      <div className="relative">
                        <Avatar
                          src={uploadedAvatarUrl}
                          size="large"
                        />
                        <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full shadow-md">
                          Custom
                        </div>
                        {selectedPath === uploadedAvatarUrl && (
                          <div className="absolute -bottom-2 -right-2 bg-blue-600 dark:bg-blue-500 rounded-full p-1.5 shadow-lg animate-in zoom-in-50 duration-200">
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
                            </svg>
                          </div>
                        )}
                      </div>
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Custom</span>
                    </div>
                  )}

                  {/* Custom Upload Option */}
                  {!uploadedAvatarUrl && (
                    <div
                      onClick={handleFileSelect}
                      className="group relative cursor-pointer rounded-xl p-4 transition-all duration-200 flex flex-col items-center gap-3 border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 hover:shadow-md min-h-[120px]"
                    >
                      <div className="relative w-16 h-16 flex items-center justify-center">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                          <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                          </svg>
                        </div>
                      </div>
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300 text-center">Upload Custom</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Upload Error Display */}
              {uploadError && (
                <div className="w-full text-red-500 text-sm text-center">
                  {uploadError}
                </div>
              )}

              {/* Hidden File Input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />

              {/* Avatar Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 mt-4">
                <button
                  onClick={handleFileSelect}
                  disabled={isUploading}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-medium rounded-lg shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {isUploading ? (
                    <>
                      <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                      </svg>
                      <span>Uploading...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                      </svg>
                      <span>Upload Custom Avatar</span>
                    </>
                  )}
                </button>
                <button
                  onClick={confirmSelection}
                  disabled={!showConfirmation}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-medium rounded-lg shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                  <span>Save</span>
                </button>
              </div>
            </div>
            {/* )} */}
          </div>

          {/* Bot Name & Welcome Message Section */}
          <div className="w-full bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-b border-gray-200 dark:border-gray-700">
              <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
              </svg>
              <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">Bot Name & Welcome Message</h3>
            </div>
            <div className="p-6 space-y-6">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                    </svg>
                    Bot Name
                  </span>
                </label>
                <input
                  type="text"
                  value={botName}
                  onChange={handleNameChange}
                  className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 focus:border-transparent transition-all"
                  placeholder="Enter bot name"
                  maxLength={100}
                />
              </div>
              {/* Welcome Message Customization */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path>
                    </svg>
                    Welcome Message
                  </span>
                </label>
                <textarea
                  value={welcomeMessage}
                  onChange={e => {
                    setWelcomeMessage(e.target.value);
                    if (typeof window !== 'undefined') {
                      window.dispatchEvent(new CustomEvent('welcomeMessageChanged', {
                        detail: { welcomeMessage: e.target.value }
                      }));
                    }
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && event.shiftKey) {
                      return;
                    }
                  }}
                  className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 focus:border-transparent resize-vertical min-h-[80px] max-h-[200px] transition-all"
                  placeholder="Enter your bot's first welcome message... (Shift+Enter for new line)"
                  maxLength={256}
                  rows={3}
                  style={{
                    overflow: 'auto',
                    lineHeight: '1.6',
                    fontFamily: 'inherit'
                  }}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  {welcomeMessage.length}/{256} characters
                </p>
              </div>
              {showWelcomeAlert && (
                <div className="fixed top-30 right-4 bg-white rounded-lg shadow-lg p-4 w-full max-w-sm z-50 animate-fade-in">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 flex items-center justify-center bg-blue-100 rounded-full">
                      <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-md font-semibold text-gray-800">Welcome Message Updated</h3>
                      <p className="text-sm text-gray-600">Your AI Agent welcome message has been changed!</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
            {/* )} */}
          </div>

          {/* <div
            className="border-2 rounded flex items-center justify-between cursor-pointer p-4 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-t w-full"
            onClick={() => setExpandedSection(expandedSection === "contact" ? null : "contact")}
          >
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Customize Contact Form</h3>
            <span className="text-black dark:text-white">{expandedSection === "contact" ? "-" : "+"}</span>
          </div> */}
          {expandedSection === "contact" && (
            <div className="p-4 pt-0">
              <div className="flex flex-col gap-4 h-[300px] overflow-y-auto">
                <div>
                  <label className="block text-sm font-medium mb-1">Form Title</label>
                  <input
                    type="text"
                    value={contactFormConfig.title}
                    onChange={e => setContactFormConfig(cfg => ({ ...cfg, title: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    maxLength={40}
                  />
                </div>
                {(Object.entries(contactFormConfig.fields) as [keyof typeof contactFormConfig.fields, ContactFormFieldConfig][]).map(([fieldKey, field]) => (
                  <div key={fieldKey} className="border rounded p-3 mb-2">
                    <h4 className="font-semibold text-gray-700 mb-2 capitalize">{fieldKey} Field</h4>
                    <div className="flex flex-col sm:flex-row gap-2 mb-2">
                      <div className="flex-1">
                        <label className="block text-xs font-medium mb-1">Label</label>
                        <input
                          type="text"
                          value={field.label}
                          onChange={e => setContactFormConfig(cfg => ({
                            ...cfg,
                            fields: { ...cfg.fields, [fieldKey]: { ...cfg.fields[fieldKey], label: e.target.value } }
                          }))}
                          className="w-full px-2 py-1 border border-gray-300 rounded"
                          maxLength={20}
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs font-medium mb-1">Placeholder</label>
                        <input
                          type="text"
                          value={field.placeholder}
                          onChange={e => setContactFormConfig(cfg => ({
                            ...cfg,
                            fields: { ...cfg.fields, [fieldKey]: { ...cfg.fields[fieldKey], placeholder: e.target.value } }
                          }))}
                          className="w-full px-2 py-1 border border-gray-300 rounded"
                          maxLength={40}
                        />
                      </div>
                      <div className="flex items-center mt-4 sm:mt-0">
                        <label className="text-xs font-medium mr-2">Required</label>
                        <input
                          type="checkbox"
                          checked={field.required}
                          onChange={e => setContactFormConfig(cfg => ({
                            ...cfg,
                            fields: { ...cfg.fields, [fieldKey]: { ...cfg.fields[fieldKey], required: e.target.checked } }
                          }))}
                          className="h-4 w-4"
                        />
                      </div>
                    </div>
                  </div>
                ))}
                {(['dropdown1', 'dropdown2'] as const).map((dropdownKey) => {
                  const dropdown = contactFormConfig.fields[dropdownKey];
                  return (
                    <div key={dropdownKey} className="border rounded p-3 mb-2">
                      <h4 className="font-semibold text-gray-700 mb-2 capitalize">{dropdownKey === 'dropdown1' ? 'Dropdown 1' : 'Dropdown 2'}</h4>
                      <div className="flex flex-col sm:flex-row gap-2 mb-2">
                        <div className="flex-1">
                          <label className="block text-xs font-medium mb-1">Label</label>
                          <input
                            type="text"
                            value={dropdown.label}
                            onChange={e => setContactFormConfig(cfg => ({
                              ...cfg,
                              fields: { ...cfg.fields, [dropdownKey]: { ...cfg.fields[dropdownKey], label: e.target.value } }
                            }))}
                            className="w-full px-2 py-1 border border-gray-300 rounded"
                            maxLength={20}
                          />
                        </div>
                        <div className="flex items-center mt-4 sm:mt-0">
                          <label className="text-xs font-medium mr-2">Required</label>
                          <input
                            type="checkbox"
                            checked={dropdown.required}
                            onChange={e => setContactFormConfig(cfg => ({
                              ...cfg,
                              fields: { ...cfg.fields, [dropdownKey]: { ...cfg.fields[dropdownKey], required: e.target.checked } }
                            }))}
                            className="h-4 w-4"
                          />
                        </div>
                      </div>
                      <div className="mb-2">
                        <label className="block text-xs font-medium mb-1">Options</label>
                        {dropdown.options.map((option, idx) => (
                          <div key={idx} className="flex items-center gap-2 mb-1">
                            <input
                              type="text"
                              value={option}
                              onChange={e => setContactFormConfig(cfg => {
                                const newOptions = [...cfg.fields[dropdownKey].options];
                                newOptions[idx] = e.target.value;
                                return {
                                  ...cfg,
                                  fields: { ...cfg.fields, [dropdownKey]: { ...cfg.fields[dropdownKey], options: newOptions } }
                                };
                              })}
                              className="px-2 py-1 border border-gray-300 rounded flex-1"
                              maxLength={30}
                            />
                            <button
                              type="button"
                              onClick={() => setContactFormConfig(cfg => {
                                const newOptions = cfg.fields[dropdownKey].options.filter((_, i) => i !== idx);
                                return {
                                  ...cfg,
                                  fields: { ...cfg.fields, [dropdownKey]: { ...cfg.fields[dropdownKey], options: newOptions } }
                                };
                              })}
                              className="px-2 py-1 bg-red-100 text-red-600 rounded hover:bg-red-200"
                              disabled={dropdown.options.length <= 1}
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => setContactFormConfig(cfg => ({
                            ...cfg,
                            fields: { ...cfg.fields, [dropdownKey]: { ...cfg.fields[dropdownKey], options: [...cfg.fields[dropdownKey].options, ""] } }
                          }))}
                          className="mt-1 px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                        >
                          Add Option
                        </button>
                      </div>
                    </div>
                  );
                })}
                <div>
                  <label className="block text-sm font-medium mb-1">Submit Button Text</label>
                  <input
                    type="text"
                    value={contactFormConfig.submitButtonText}
                    onChange={e => setContactFormConfig(cfg => ({ ...cfg, submitButtonText: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    maxLength={30}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Success Message</label>
                  <input
                    type="text"
                    value={contactFormConfig.successMessage}
                    onChange={e => setContactFormConfig(cfg => ({ ...cfg, successMessage: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    maxLength={80}
                  />
                </div>
              </div>
            </div>
          )}


          {/* <div
            className="border-2 rounded flex items-center justify-between cursor-pointer p-4 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-t w-full"
            onClick={() => setExpandedSection(expandedSection === "login" ? null : "login")}
          >
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Customize Login Form</h3>
            <span className="text-black dark:text-white">{expandedSection === "login" ? "-" : "+"}</span>
          </div> */}
          {expandedSection === "login" && (
            <div className="p-4 pt-0">
              <div className="flex items-center mb-4">
                <label className="text-sm font-medium mr-2">Enable Login Form</label>
                <input
                  type="checkbox"
                  checked={loginFormConfig.enabled}
                  onChange={e => setLoginFormConfig(cfg => ({ ...cfg, enabled: e.target.checked }))}
                  className="h-4 w-4"
                />
              </div>
              <div className="mb-4">
                <label className="block text-xs font-medium mb-1">Login Types (Toggle Options)</label>
                {loginFormConfig.toggleOptions.map((option, idx) => (
                  <div key={idx} className="flex items-center gap-2 mb-1">
                    <input
                      type="text"
                      value={option}
                      onChange={e => setLoginFormConfig(cfg => {
                        const newOptions = [...cfg.toggleOptions];
                        newOptions[idx] = e.target.value;
                        return { ...cfg, toggleOptions: newOptions };
                      })}
                      className="px-2 py-1 border border-gray-300 rounded flex-1"
                      maxLength={20}
                    />
                    <button
                      type="button"
                      onClick={() => setLoginFormConfig(cfg => {
                        const newOptions = cfg.toggleOptions.filter((_, i) => i !== idx);
                        return { ...cfg, toggleOptions: newOptions };
                      })}
                      className="px-2 py-1 bg-red-100 text-red-600 rounded hover:bg-red-200"
                      disabled={loginFormConfig.toggleOptions.length <= 2}
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setLoginFormConfig(cfg => ({ ...cfg, toggleOptions: [...cfg.toggleOptions, ""] }))}
                  className="mt-1 px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                >
                  Add Option
                </button>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 mb-4">
                <div className="flex-1">
                  <label className="block text-xs font-medium mb-1">Email Label</label>
                  <input
                    type="text"
                    value={loginFormConfig.email.label}
                    onChange={e => setLoginFormConfig(cfg => ({ ...cfg, email: { ...cfg.email, label: e.target.value } }))}
                    className="w-full px-2 py-1 border border-gray-300 rounded"
                    maxLength={20}
                  />
                  <label className="block text-xs font-medium mb-1 mt-2">Email Placeholder</label>
                  <input
                    type="text"
                    value={loginFormConfig.email.placeholder}
                    onChange={e => setLoginFormConfig(cfg => ({ ...cfg, email: { ...cfg.email, placeholder: e.target.value } }))}
                    className="w-full px-2 py-1 border border-gray-300 rounded"
                    maxLength={40}
                  />
                  <div className="flex items-center mt-2">
                    <label className="text-xs font-medium mr-2">Required</label>
                    <input
                      type="checkbox"
                      checked={loginFormConfig.email.required}
                      onChange={e => setLoginFormConfig(cfg => ({ ...cfg, email: { ...cfg.email, required: e.target.checked } }))}
                      className="h-4 w-4"
                    />
                  </div>
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium mb-1">Password Label</label>
                  <input
                    type="text"
                    value={loginFormConfig.password.label}
                    onChange={e => setLoginFormConfig(cfg => ({ ...cfg, password: { ...cfg.password, label: e.target.value } }))}
                    className="w-full px-2 py-1 border border-gray-300 rounded"
                    maxLength={20}
                  />
                  <label className="block text-xs font-medium mb-1 mt-2">Password Placeholder</label>
                  <input
                    type="text"
                    value={loginFormConfig.password.placeholder}
                    onChange={e => setLoginFormConfig(cfg => ({ ...cfg, password: { ...cfg.password, placeholder: e.target.value } }))}
                    className="w-full px-2 py-1 border border-gray-300 rounded"
                    maxLength={40}
                  />
                  <div className="flex items-center mt-2">
                    <label className="text-xs font-medium mr-2">Required</label>
                    <input
                      type="checkbox"
                      checked={loginFormConfig.password.required}
                      onChange={e => setLoginFormConfig(cfg => ({ ...cfg, password: { ...cfg.password, required: e.target.checked } }))}
                      className="h-4 w-4"
                    />
                  </div>
                </div>
              </div>
              <div className="mb-2">
                <label className="block text-sm font-medium mb-1">Submit Button Text</label>
                <input
                  type="text"
                  value={loginFormConfig.submitButtonText}
                  onChange={e => setLoginFormConfig(cfg => ({ ...cfg, submitButtonText: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  maxLength={30}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Success Message</label>
                <input
                  type="text"
                  value={loginFormConfig.successMessage}
                  onChange={e => setLoginFormConfig(cfg => ({ ...cfg, successMessage: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  maxLength={80}
                />
              </div>
            </div>
          )}

          {/* Job Application Form Section */}
          {/* <div
            className="border-2 rounded mb-2 flex items-center justify-between cursor-pointer p-4 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-t w-full"
            onClick={() => setExpandedSection(expandedSection === "jobApplication" ? null : "jobApplication")}
          >
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Customize Job Application Form</h3>
            <span className="text-black dark:text-white">{expandedSection === "jobApplication" ? "-" : "+"}</span>
          </div> */}
          {expandedSection === "jobApplication" && (
            <div className="p-4 pt-0">
              <div className="flex flex-col gap-4 h-[400px] overflow-y-auto">
                <div>
                  <label className="block text-sm font-medium mb-1">Form Title</label>
                  <input
                    type="text"
                    value={jobApplicationFormConfig.title}
                    onChange={e => setJobApplicationFormConfig(cfg => ({ ...cfg, title: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    maxLength={40}
                  />
                </div>

                {/* Name Field Configuration */}
                <div className="border rounded p-3 mb-2">
                  <h4 className="font-semibold text-gray-700 mb-2">Name Field</h4>
                  <div className="flex flex-col sm:flex-row gap-2 mb-2">
                    <div className="flex-1">
                      <label className="block text-xs font-medium mb-1">Label</label>
                      <input
                        type="text"
                        value={jobApplicationFormConfig.fields.name.label}
                        onChange={e => setJobApplicationFormConfig(cfg => ({
                          ...cfg,
                          fields: { ...cfg.fields, name: { ...cfg.fields.name, label: e.target.value } }
                        }))}
                        className="w-full px-2 py-1 border border-gray-300 rounded"
                        maxLength={20}
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-medium mb-1">Placeholder</label>
                      <input
                        type="text"
                        value={jobApplicationFormConfig.fields.name.placeholder}
                        onChange={e => setJobApplicationFormConfig(cfg => ({
                          ...cfg,
                          fields: { ...cfg.fields, name: { ...cfg.fields.name, placeholder: e.target.value } }
                        }))}
                        className="w-full px-2 py-1 border border-gray-300 rounded"
                        maxLength={40}
                      />
                    </div>
                    <div className="flex items-center mt-4 sm:mt-0">
                      <label className="text-xs font-medium mr-2">Required</label>
                      <input
                        type="checkbox"
                        checked={jobApplicationFormConfig.fields.name.required}
                        onChange={e => setJobApplicationFormConfig(cfg => ({
                          ...cfg,
                          fields: { ...cfg.fields, name: { ...cfg.fields.name, required: e.target.checked } }
                        }))}
                        className="h-4 w-4"
                      />
                    </div>
                  </div>
                </div>

                {/* Email Field Configuration */}
                <div className="border rounded p-3 mb-2">
                  <h4 className="font-semibold text-gray-700 mb-2">Email Field</h4>
                  <div className="flex flex-col sm:flex-row gap-2 mb-2">
                    <div className="flex-1">
                      <label className="block text-xs font-medium mb-1">Label</label>
                      <input
                        type="text"
                        value={jobApplicationFormConfig.fields.email.label}
                        onChange={e => setJobApplicationFormConfig(cfg => ({
                          ...cfg,
                          fields: { ...cfg.fields, email: { ...cfg.fields.email, label: e.target.value } }
                        }))}
                        className="w-full px-2 py-1 border border-gray-300 rounded"
                        maxLength={20}
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-medium mb-1">Placeholder</label>
                      <input
                        type="text"
                        value={jobApplicationFormConfig.fields.email.placeholder}
                        onChange={e => setJobApplicationFormConfig(cfg => ({
                          ...cfg,
                          fields: { ...cfg.fields, email: { ...cfg.fields.email, placeholder: e.target.value } }
                        }))}
                        className="w-full px-2 py-1 border border-gray-300 rounded"
                        maxLength={40}
                      />
                    </div>
                    <div className="flex items-center mt-4 sm:mt-0">
                      <label className="text-xs font-medium mr-2">Required</label>
                      <input
                        type="checkbox"
                        checked={jobApplicationFormConfig.fields.email.required}
                        onChange={e => setJobApplicationFormConfig(cfg => ({
                          ...cfg,
                          fields: { ...cfg.fields, email: { ...cfg.fields.email, required: e.target.checked } }
                        }))}
                        className="h-4 w-4"
                      />
                    </div>
                  </div>
                </div>

                {/* Phone Field Configuration */}
                <div className="border rounded p-3 mb-2">
                  <h4 className="font-semibold text-gray-700 mb-2">Phone Field</h4>
                  <div className="flex flex-col sm:flex-row gap-2 mb-2">
                    <div className="flex-1">
                      <label className="block text-xs font-medium mb-1">Label</label>
                      <input
                        type="text"
                        value={jobApplicationFormConfig.fields.phone.label}
                        onChange={e => setJobApplicationFormConfig(cfg => ({
                          ...cfg,
                          fields: { ...cfg.fields, phone: { ...cfg.fields.phone, label: e.target.value } }
                        }))}
                        className="w-full px-2 py-1 border border-gray-300 rounded"
                        maxLength={20}
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-medium mb-1">Placeholder</label>
                      <input
                        type="text"
                        value={jobApplicationFormConfig.fields.phone.placeholder}
                        onChange={e => setJobApplicationFormConfig(cfg => ({
                          ...cfg,
                          fields: { ...cfg.fields, phone: { ...cfg.fields.phone, placeholder: e.target.value } }
                        }))}
                        className="w-full px-2 py-1 border border-gray-300 rounded"
                        maxLength={40}
                      />
                    </div>
                    <div className="flex items-center mt-4 sm:mt-0">
                      <label className="text-xs font-medium mr-2">Required</label>
                      <input
                        type="checkbox"
                        checked={jobApplicationFormConfig.fields.phone.required}
                        onChange={e => setJobApplicationFormConfig(cfg => ({
                          ...cfg,
                          fields: { ...cfg.fields, phone: { ...cfg.fields.phone, required: e.target.checked } }
                        }))}
                        className="h-4 w-4"
                      />
                    </div>
                  </div>
                </div>

                {/* Category Options Configuration */}
                <div className="border rounded p-3 mb-2">
                  <h4 className="font-semibold text-gray-700 mb-2">Category Options</h4>
                  <div className="flex flex-col sm:flex-row gap-2 mb-2">
                    <div className="flex-1">
                      <label className="block text-xs font-medium mb-1">Label</label>
                      <input
                        type="text"
                        value={jobApplicationFormConfig.fields.category.label}
                        onChange={e => setJobApplicationFormConfig(cfg => ({
                          ...cfg,
                          fields: { ...cfg.fields, category: { ...cfg.fields.category, label: e.target.value } }
                        }))}
                        className="w-full px-2 py-1 border border-gray-300 rounded"
                        maxLength={20}
                      />
                    </div>
                    <div className="flex items-center mt-4 sm:mt-0">
                      <label className="text-xs font-medium mr-2">Required</label>
                      <input
                        type="checkbox"
                        checked={jobApplicationFormConfig.fields.category.required}
                        onChange={e => setJobApplicationFormConfig(cfg => ({
                          ...cfg,
                          fields: { ...cfg.fields, category: { ...cfg.fields.category, required: e.target.checked } }
                        }))}
                        className="h-4 w-4"
                      />
                    </div>
                  </div>
                  <div className="mb-2">
                    <label className="block text-xs font-medium mb-1">Options</label>
                    {jobApplicationFormConfig.fields.category.options.map((option, idx) => (
                      <div key={idx} className="flex items-center gap-2 mb-1">
                        <input
                          type="text"
                          value={option}
                          onChange={e => setJobApplicationFormConfig(cfg => {
                            const newOptions = [...cfg.fields.category.options];
                            newOptions[idx] = e.target.value;
                            return {
                              ...cfg,
                              fields: { ...cfg.fields, category: { ...cfg.fields.category, options: newOptions } }
                            };
                          })}
                          className="px-2 py-1 border border-gray-300 rounded flex-1"
                          maxLength={30}
                        />
                        <button
                          type="button"
                          onClick={() => setJobApplicationFormConfig(cfg => {
                            const newOptions = cfg.fields.category.options.filter((_, i) => i !== idx);
                            return {
                              ...cfg,
                              fields: { ...cfg.fields, category: { ...cfg.fields.category, options: newOptions } }
                            };
                          })}
                          className="px-2 py-1 bg-red-100 text-red-600 rounded hover:bg-red-200"
                          disabled={jobApplicationFormConfig.fields.category.options.length <= 1}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => setJobApplicationFormConfig(cfg => ({
                        ...cfg,
                        fields: { ...cfg.fields, category: { ...cfg.fields.category, options: [...cfg.fields.category.options, ""] } }
                      }))}
                      className="mt-1 px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                    >
                      Add Option
                    </button>
                  </div>
                </div>

                {/* Experience Options Configuration */}
                <div className="border rounded p-3 mb-2">
                  <h4 className="font-semibold text-gray-700 mb-2">Experience Options</h4>
                  <div className="flex flex-col sm:flex-row gap-2 mb-2">
                    <div className="flex-1">
                      <label className="block text-xs font-medium mb-1">Label</label>
                      <input
                        type="text"
                        value={jobApplicationFormConfig.fields.experience.label}
                        onChange={e => setJobApplicationFormConfig(cfg => ({
                          ...cfg,
                          fields: { ...cfg.fields, experience: { ...cfg.fields.experience, label: e.target.value } }
                        }))}
                        className="w-full px-2 py-1 border border-gray-300 rounded"
                        maxLength={20}
                      />
                    </div>
                    <div className="flex items-center mt-4 sm:mt-0">
                      <label className="text-xs font-medium mr-2">Required</label>
                      <input
                        type="checkbox"
                        checked={jobApplicationFormConfig.fields.experience.required}
                        onChange={e => setJobApplicationFormConfig(cfg => ({
                          ...cfg,
                          fields: { ...cfg.fields, experience: { ...cfg.fields.experience, required: e.target.checked } }
                        }))}
                        className="h-4 w-4"
                      />
                    </div>
                  </div>
                  <div className="mb-2">
                    <label className="block text-xs font-medium mb-1">Options</label>
                    {jobApplicationFormConfig.fields.experience.options.map((option, idx) => (
                      <div key={idx} className="flex items-center gap-2 mb-1">
                        <input
                          type="text"
                          value={option}
                          onChange={e => setJobApplicationFormConfig(cfg => {
                            const newOptions = [...cfg.fields.experience.options];
                            newOptions[idx] = e.target.value;
                            return {
                              ...cfg,
                              fields: { ...cfg.fields, experience: { ...cfg.fields.experience, options: newOptions } }
                            };
                          })}
                          className="px-2 py-1 border border-gray-300 rounded flex-1"
                          maxLength={30}
                        />
                        <button
                          type="button"
                          onClick={() => setJobApplicationFormConfig(cfg => {
                            const newOptions = cfg.fields.experience.options.filter((_, i) => i !== idx);
                            return {
                              ...cfg,
                              fields: { ...cfg.fields, experience: { ...cfg.fields.experience, options: newOptions } }
                            };
                          })}
                          className="px-2 py-1 bg-red-100 text-red-600 rounded hover:bg-red-200"
                          disabled={jobApplicationFormConfig.fields.experience.options.length <= 1}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => setJobApplicationFormConfig(cfg => ({
                        ...cfg,
                        fields: { ...cfg.fields, experience: { ...cfg.fields.experience, options: [...cfg.fields.experience.options, ""] } }
                      }))}
                      className="mt-1 px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                    >
                      Add Option
                    </button>
                  </div>
                </div>

                {/* Resume Upload Configuration */}
                <div className="border rounded p-3 mb-2">
                  <h4 className="font-semibold text-gray-700 mb-2">Resume Upload</h4>
                  <div className="flex flex-col sm:flex-row gap-2 mb-2">
                    <div className="flex-1">
                      <label className="block text-xs font-medium mb-1">Label</label>
                      <input
                        type="text"
                        value={jobApplicationFormConfig.fields.resume.label}
                        onChange={e => setJobApplicationFormConfig(cfg => ({
                          ...cfg,
                          fields: { ...cfg.fields, resume: { ...cfg.fields.resume, label: e.target.value } }
                        }))}
                        className="w-full px-2 py-1 border border-gray-300 rounded"
                        maxLength={20}
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-medium mb-1">Max Size (MB)</label>
                      <input
                        type="number"
                        value={jobApplicationFormConfig.fields.resume.maxSize}
                        onChange={e => setJobApplicationFormConfig(cfg => ({
                          ...cfg,
                          fields: { ...cfg.fields, resume: { ...cfg.fields.resume, maxSize: parseInt(e.target.value) || 5 } }
                        }))}
                        className="w-full px-2 py-1 border border-gray-300 rounded"
                        min="1"
                        max="10"
                      />
                    </div>
                    <div className="flex items-center mt-4 sm:mt-0">
                      <label className="text-xs font-medium mr-2">Required</label>
                      <input
                        type="checkbox"
                        checked={jobApplicationFormConfig.fields.resume.required}
                        onChange={e => setJobApplicationFormConfig(cfg => ({
                          ...cfg,
                          fields: { ...cfg.fields, resume: { ...cfg.fields.resume, required: e.target.checked } }
                        }))}
                        className="h-4 w-4"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Submit Button Text</label>
                  <input
                    type="text"
                    value={jobApplicationFormConfig.submitButtonText}
                    onChange={e => setJobApplicationFormConfig(cfg => ({ ...cfg, submitButtonText: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    maxLength={30}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Success Message</label>
                  <input
                    type="text"
                    value={jobApplicationFormConfig.successMessage}
                    onChange={e => setJobApplicationFormConfig(cfg => ({ ...cfg, successMessage: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    maxLength={100}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Customer Ticket Form Section */}
          {/* <div
            className="border-2 rounded mb-2 flex items-center justify-between cursor-pointer p-4 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-t w-full"
            onClick={() => setExpandedSection(expandedSection === "customerTicket" ? null : "customerTicket")}
          >
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Customize Customer Ticket Form</h3>
            <span className="text-black dark:text-white">{expandedSection === "customerTicket" ? "-" : "+"}</span>
          </div> */}
          {expandedSection === "customerTicket" && (
            <div className="p-4 pt-0">
              <div className="flex flex-col gap-4 h-[400px] overflow-y-auto">
                <div>
                  <label className="block text-sm font-medium mb-1">Form Title</label>
                  <input
                    type="text"
                    value={customerTicketFormConfig.title}
                    onChange={e => setCustomerTicketFormConfig(cfg => ({ ...cfg, title: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    maxLength={40}
                  />
                </div>

                {/* Email Field Configuration */}
                <div className="border rounded p-3 mb-2">
                  <h4 className="font-semibold text-gray-700 mb-2">Email Field</h4>
                  <div className="flex flex-col sm:flex-row gap-2 mb-2">
                    <div className="flex-1">
                      <label className="block text-xs font-medium mb-1">Label</label>
                      <input
                        type="text"
                        value={customerTicketFormConfig.fields.email.label}
                        onChange={e => setCustomerTicketFormConfig(cfg => ({
                          ...cfg,
                          fields: { ...cfg.fields, email: { ...cfg.fields.email, label: e.target.value } }
                        }))}
                        className="w-full px-2 py-1 border border-gray-300 rounded"
                        maxLength={20}
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-medium mb-1">Placeholder</label>
                      <input
                        type="text"
                        value={customerTicketFormConfig.fields.email.placeholder}
                        onChange={e => setCustomerTicketFormConfig(cfg => ({
                          ...cfg,
                          fields: { ...cfg.fields, email: { ...cfg.fields.email, placeholder: e.target.value } }
                        }))}
                        className="w-full px-2 py-1 border border-gray-300 rounded"
                        maxLength={40}
                      />
                    </div>
                    <div className="flex items-center mt-4 sm:mt-0">
                      <label className="text-xs font-medium mr-2">Required</label>
                      <input
                        type="checkbox"
                        checked={customerTicketFormConfig.fields.email.required}
                        onChange={e => setCustomerTicketFormConfig(cfg => ({
                          ...cfg,
                          fields: { ...cfg.fields, email: { ...cfg.fields.email, required: e.target.checked } }
                        }))}
                        className="h-4 w-4"
                      />
                    </div>
                  </div>
                </div>

                {/* Issue Type Options Configuration */}
                <div className="border rounded p-3 mb-2">
                  <h4 className="font-semibold text-gray-700 mb-2">Issue Type Options</h4>
                  <div className="flex flex-col sm:flex-row gap-2 mb-2">
                    <div className="flex-1">
                      <label className="block text-xs font-medium mb-1">Label</label>
                      <input
                        type="text"
                        value={customerTicketFormConfig.fields.issueType.label}
                        onChange={e => setCustomerTicketFormConfig(cfg => ({
                          ...cfg,
                          fields: { ...cfg.fields, issueType: { ...cfg.fields.issueType, label: e.target.value } }
                        }))}
                        className="w-full px-2 py-1 border border-gray-300 rounded"
                        maxLength={20}
                      />
                    </div>
                    <div className="flex items-center mt-4 sm:mt-0">
                      <label className="text-xs font-medium mr-2">Required</label>
                      <input
                        type="checkbox"
                        checked={customerTicketFormConfig.fields.issueType.required}
                        onChange={e => setCustomerTicketFormConfig(cfg => ({
                          ...cfg,
                          fields: { ...cfg.fields, issueType: { ...cfg.fields.issueType, required: e.target.checked } }
                        }))}
                        className="h-4 w-4"
                      />
                    </div>
                  </div>
                  <div className="mb-2">
                    <label className="block text-xs font-medium mb-1">Options</label>
                    {customerTicketFormConfig.fields.issueType.options.map((option, idx) => (
                      <div key={idx} className="flex items-center gap-2 mb-1">
                        <input
                          type="text"
                          value={option}
                          onChange={e => setCustomerTicketFormConfig(cfg => {
                            const newOptions = [...cfg.fields.issueType.options];
                            newOptions[idx] = e.target.value;
                            return {
                              ...cfg,
                              fields: { ...cfg.fields, issueType: { ...cfg.fields.issueType, options: newOptions } }
                            };
                          })}
                          className="px-2 py-1 border border-gray-300 rounded flex-1"
                          maxLength={30}
                        />
                        <button
                          type="button"
                          onClick={() => setCustomerTicketFormConfig(cfg => {
                            const newOptions = cfg.fields.issueType.options.filter((_, i) => i !== idx);
                            return {
                              ...cfg,
                              fields: { ...cfg.fields, issueType: { ...cfg.fields.issueType, options: newOptions } }
                            };
                          })}
                          className="px-2 py-1 bg-red-100 text-red-600 rounded hover:bg-red-200"
                          disabled={customerTicketFormConfig.fields.issueType.options.length <= 1}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => setCustomerTicketFormConfig(cfg => ({
                        ...cfg,
                        fields: { ...cfg.fields, issueType: { ...cfg.fields.issueType, options: [...cfg.fields.issueType.options, ""] } }
                      }))}
                      className="mt-1 px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                    >
                      Add Option
                    </button>
                  </div>
                </div>

                {/* Issue Options Configuration */}
                <div className="border rounded p-3 mb-2">
                  <h4 className="font-semibold text-gray-700 mb-2">Issue Options</h4>
                  <div className="flex flex-col sm:flex-row gap-2 mb-2">
                    <div className="flex-1">
                      <label className="block text-xs font-medium mb-1">Label</label>
                      <input
                        type="text"
                        value={customerTicketFormConfig.fields.issue.label}
                        onChange={e => setCustomerTicketFormConfig(cfg => ({
                          ...cfg,
                          fields: { ...cfg.fields, issue: { ...cfg.fields.issue, label: e.target.value } }
                        }))}
                        className="w-full px-2 py-1 border border-gray-300 rounded"
                        maxLength={20}
                      />
                    </div>
                    <div className="flex items-center mt-4 sm:mt-0">
                      <label className="text-xs font-medium mr-2">Required</label>
                      <input
                        type="checkbox"
                        checked={customerTicketFormConfig.fields.issue.required}
                        onChange={e => setCustomerTicketFormConfig(cfg => ({
                          ...cfg,
                          fields: { ...cfg.fields, issue: { ...cfg.fields.issue, required: e.target.checked } }
                        }))}
                        className="h-4 w-4"
                      />
                    </div>
                  </div>
                  <div className="mb-2">
                    <label className="block text-xs font-medium mb-1">Options</label>
                    {customerTicketFormConfig.fields.issue.options.map((option, idx) => (
                      <div key={idx} className="flex items-center gap-2 mb-1">
                        <input
                          type="text"
                          value={option}
                          onChange={e => setCustomerTicketFormConfig(cfg => {
                            const newOptions = [...cfg.fields.issue.options];
                            newOptions[idx] = e.target.value;
                            return {
                              ...cfg,
                              fields: { ...cfg.fields, issue: { ...cfg.fields.issue, options: newOptions } }
                            };
                          })}
                          className="px-2 py-1 border border-gray-300 rounded flex-1"
                          maxLength={30}
                        />
                        <button
                          type="button"
                          onClick={() => setCustomerTicketFormConfig(cfg => {
                            const newOptions = cfg.fields.issue.options.filter((_, i) => i !== idx);
                            return {
                              ...cfg,
                              fields: { ...cfg.fields, issue: { ...cfg.fields.issue, options: newOptions } }
                            };
                          })}
                          className="px-2 py-1 bg-red-100 text-red-600 rounded hover:bg-red-200"
                          disabled={customerTicketFormConfig.fields.issue.options.length <= 1}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => setCustomerTicketFormConfig(cfg => ({
                        ...cfg,
                        fields: { ...cfg.fields, issue: { ...cfg.fields.issue, options: [...cfg.fields.issue.options, ""] } }
                      }))}
                      className="mt-1 px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                    >
                      Add Option
                    </button>
                  </div>
                </div>

                {/* Message Field Configuration */}
                <div className="border rounded p-3 mb-2">
                  <h4 className="font-semibold text-gray-700 mb-2">Message Field</h4>
                  <div className="flex flex-col sm:flex-row gap-2 mb-2">
                    <div className="flex-1">
                      <label className="block text-xs font-medium mb-1">Label</label>
                      <input
                        type="text"
                        value={customerTicketFormConfig.fields.message.label}
                        onChange={e => setCustomerTicketFormConfig(cfg => ({
                          ...cfg,
                          fields: { ...cfg.fields, message: { ...cfg.fields.message, label: e.target.value } }
                        }))}
                        className="w-full px-2 py-1 border border-gray-300 rounded"
                        maxLength={20}
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-medium mb-1">Placeholder</label>
                      <input
                        type="text"
                        value={customerTicketFormConfig.fields.message.placeholder}
                        onChange={e => setCustomerTicketFormConfig(cfg => ({
                          ...cfg,
                          fields: { ...cfg.fields, message: { ...cfg.fields.message, placeholder: e.target.value } }
                        }))}
                        className="w-full px-2 py-1 border border-gray-300 rounded"
                        maxLength={40}
                      />
                    </div>
                    <div className="flex items-center mt-4 sm:mt-0">
                      <label className="text-xs font-medium mr-2">Required</label>
                      <input
                        type="checkbox"
                        checked={customerTicketFormConfig.fields.message.required}
                        onChange={e => setCustomerTicketFormConfig(cfg => ({
                          ...cfg,
                          fields: { ...cfg.fields, message: { ...cfg.fields.message, required: e.target.checked } }
                        }))}
                        className="h-4 w-4"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Submit Button Text</label>
                  <input
                    type="text"
                    value={customerTicketFormConfig.submitButtonText}
                    onChange={e => setCustomerTicketFormConfig(cfg => ({ ...cfg, submitButtonText: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    maxLength={30}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Success Message</label>
                  <input
                    type="text"
                    value={customerTicketFormConfig.successMessage}
                    onChange={e => setCustomerTicketFormConfig(cfg => ({ ...cfg, successMessage: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    maxLength={100}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Employee Ticket Form Section */}
          {/* <div
            className="border-2 rounded mb-2 flex items-center justify-between cursor-pointer p-4 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-t w-full"
            onClick={() => setExpandedSection(expandedSection === "employeeTicket" ? null : "employeeTicket")}
          >
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Customize Employee Ticket Form</h3>
            <span className="text-black dark:text-white">{expandedSection === "employeeTicket" ? "-" : "+"}</span>
          </div> */}
          {expandedSection === "employeeTicket" && (
            <div className="p-4 pt-0">
              <div className="flex flex-col gap-4 h-[400px] overflow-y-auto">
                <div>
                  <label className="block text-sm font-medium mb-1">Form Title</label>
                  <input
                    type="text"
                    value={employeeTicketFormConfig.title}
                    onChange={e => setEmployeeTicketFormConfig(cfg => ({ ...cfg, title: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    maxLength={40}
                  />
                </div>

                {/* Employee ID Field Configuration */}
                <div className="border rounded p-3 mb-2">
                  <h4 className="font-semibold text-gray-700 mb-2">Employee ID Field</h4>
                  <div className="flex flex-col sm:flex-row gap-2 mb-2">
                    <div className="flex-1">
                      <label className="block text-xs font-medium mb-1">Label</label>
                      <input
                        type="text"
                        value={employeeTicketFormConfig.fields.id.label}
                        onChange={e => setEmployeeTicketFormConfig(cfg => ({
                          ...cfg,
                          fields: { ...cfg.fields, id: { ...cfg.fields.id, label: e.target.value } }
                        }))}
                        className="w-full px-2 py-1 border border-gray-300 rounded"
                        maxLength={20}
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-medium mb-1">Placeholder</label>
                      <input
                        type="text"
                        value={employeeTicketFormConfig.fields.id.placeholder}
                        onChange={e => setEmployeeTicketFormConfig(cfg => ({
                          ...cfg,
                          fields: { ...cfg.fields, id: { ...cfg.fields.id, placeholder: e.target.value } }
                        }))}
                        className="w-full px-2 py-1 border border-gray-300 rounded"
                        maxLength={40}
                      />
                    </div>
                    <div className="flex items-center mt-4 sm:mt-0">
                      <label className="text-xs font-medium mr-2">Required</label>
                      <input
                        type="checkbox"
                        checked={employeeTicketFormConfig.fields.id.required}
                        onChange={e => setEmployeeTicketFormConfig(cfg => ({
                          ...cfg,
                          fields: { ...cfg.fields, id: { ...cfg.fields.id, required: e.target.checked } }
                        }))}
                        className="h-4 w-4"
                      />
                    </div>
                  </div>
                </div>

                {/* Issue Type Options Configuration */}
                <div className="border rounded p-3 mb-2">
                  <h4 className="font-semibold text-gray-700 mb-2">Issue Type Options</h4>
                  <div className="flex flex-col sm:flex-row gap-2 mb-2">
                    <div className="flex-1">
                      <label className="block text-xs font-medium mb-1">Label</label>
                      <input
                        type="text"
                        value={employeeTicketFormConfig.fields.issueType.label}
                        onChange={e => setEmployeeTicketFormConfig(cfg => ({
                          ...cfg,
                          fields: { ...cfg.fields, issueType: { ...cfg.fields.issueType, label: e.target.value } }
                        }))}
                        className="w-full px-2 py-1 border border-gray-300 rounded"
                        maxLength={20}
                      />
                    </div>
                    <div className="flex items-center mt-4 sm:mt-0">
                      <label className="text-xs font-medium mr-2">Required</label>
                      <input
                        type="checkbox"
                        checked={employeeTicketFormConfig.fields.issueType.required}
                        onChange={e => setEmployeeTicketFormConfig(cfg => ({
                          ...cfg,
                          fields: { ...cfg.fields, issueType: { ...cfg.fields.issueType, required: e.target.checked } }
                        }))}
                        className="h-4 w-4"
                      />
                    </div>
                  </div>
                  <div className="mb-2">
                    <label className="block text-xs font-medium mb-1">Options</label>
                    {employeeTicketFormConfig.fields.issueType.options.map((option, idx) => (
                      <div key={idx} className="flex items-center gap-2 mb-1">
                        <input
                          type="text"
                          value={option}
                          onChange={e => setEmployeeTicketFormConfig(cfg => {
                            const newOptions = [...cfg.fields.issueType.options];
                            newOptions[idx] = e.target.value;
                            return {
                              ...cfg,
                              fields: { ...cfg.fields, issueType: { ...cfg.fields.issueType, options: newOptions } }
                            };
                          })}
                          className="px-2 py-1 border border-gray-300 rounded flex-1"
                          maxLength={30}
                        />
                        <button
                          type="button"
                          onClick={() => setEmployeeTicketFormConfig(cfg => {
                            const newOptions = cfg.fields.issueType.options.filter((_, i) => i !== idx);
                            return {
                              ...cfg,
                              fields: { ...cfg.fields, issueType: { ...cfg.fields.issueType, options: newOptions } }
                            };
                          })}
                          className="px-2 py-1 bg-red-100 text-red-600 rounded hover:bg-red-200"
                          disabled={employeeTicketFormConfig.fields.issueType.options.length <= 1}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => setEmployeeTicketFormConfig(cfg => ({
                        ...cfg,
                        fields: { ...cfg.fields, issueType: { ...cfg.fields.issueType, options: [...cfg.fields.issueType.options, ""] } }
                      }))}
                      className="mt-1 px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                    >
                      Add Option
                    </button>
                  </div>
                </div>

                {/* Issue Options Configuration */}
                <div className="border rounded p-3 mb-2">
                  <h4 className="font-semibold text-gray-700 mb-2">Issue Options</h4>
                  <div className="flex flex-col sm:flex-row gap-2 mb-2">
                    <div className="flex-1">
                      <label className="block text-xs font-medium mb-1">Label</label>
                      <input
                        type="text"
                        value={employeeTicketFormConfig.fields.issue.label}
                        onChange={e => setEmployeeTicketFormConfig(cfg => ({
                          ...cfg,
                          fields: { ...cfg.fields, issue: { ...cfg.fields.issue, label: e.target.value } }
                        }))}
                        className="w-full px-2 py-1 border border-gray-300 rounded"
                        maxLength={20}
                      />
                    </div>
                    <div className="flex items-center mt-4 sm:mt-0">
                      <label className="text-xs font-medium mr-2">Required</label>
                      <input
                        type="checkbox"
                        checked={employeeTicketFormConfig.fields.issue.required}
                        onChange={e => setEmployeeTicketFormConfig(cfg => ({
                          ...cfg,
                          fields: { ...cfg.fields, issue: { ...cfg.fields.issue, required: e.target.checked } }
                        }))}
                        className="h-4 w-4"
                      />
                    </div>
                  </div>
                  <div className="mb-2">
                    <label className="block text-xs font-medium mb-1">Options</label>
                    {employeeTicketFormConfig.fields.issue.options.map((option, idx) => (
                      <div key={idx} className="flex items-center gap-2 mb-1">
                        <input
                          type="text"
                          value={option}
                          onChange={e => setEmployeeTicketFormConfig(cfg => {
                            const newOptions = [...cfg.fields.issue.options];
                            newOptions[idx] = e.target.value;
                            return {
                              ...cfg,
                              fields: { ...cfg.fields, issue: { ...cfg.fields.issue, options: newOptions } }
                            };
                          })}
                          className="px-2 py-1 border border-gray-300 rounded flex-1"
                          maxLength={30}
                        />
                        <button
                          type="button"
                          onClick={() => setEmployeeTicketFormConfig(cfg => {
                            const newOptions = cfg.fields.issue.options.filter((_, i) => i !== idx);
                            return {
                              ...cfg,
                              fields: { ...cfg.fields, issue: { ...cfg.fields.issue, options: newOptions } }
                            };
                          })}
                          className="px-2 py-1 bg-red-100 text-red-600 rounded hover:bg-red-200"
                          disabled={employeeTicketFormConfig.fields.issue.options.length <= 1}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => setEmployeeTicketFormConfig(cfg => ({
                        ...cfg,
                        fields: { ...cfg.fields, issue: { ...cfg.fields.issue, options: [...cfg.fields.issue.options, ""] } }
                      }))}
                      className="mt-1 px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                    >
                      Add Option
                    </button>
                  </div>
                </div>

                {/* Message Field Configuration */}
                <div className="border rounded p-3 mb-2">
                  <h4 className="font-semibold text-gray-700 mb-2">Message Field</h4>
                  <div className="flex flex-col sm:flex-row gap-2 mb-2">
                    <div className="flex-1">
                      <label className="block text-xs font-medium mb-1">Label</label>
                      <input
                        type="text"
                        value={employeeTicketFormConfig.fields.message.label}
                        onChange={e => setEmployeeTicketFormConfig(cfg => ({
                          ...cfg,
                          fields: { ...cfg.fields, message: { ...cfg.fields.message, label: e.target.value } }
                        }))}
                        className="w-full px-2 py-1 border border-gray-300 rounded"
                        maxLength={20}
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-medium mb-1">Placeholder</label>
                      <input
                        type="text"
                        value={employeeTicketFormConfig.fields.message.placeholder}
                        onChange={e => setEmployeeTicketFormConfig(cfg => ({
                          ...cfg,
                          fields: { ...cfg.fields, message: { ...cfg.fields.message, placeholder: e.target.value } }
                        }))}
                        className="w-full px-2 py-1 border border-gray-300 rounded"
                        maxLength={40}
                      />
                    </div>
                    <div className="flex items-center mt-4 sm:mt-0">
                      <label className="text-xs font-medium mr-2">Required</label>
                      <input
                        type="checkbox"
                        checked={employeeTicketFormConfig.fields.message.required}
                        onChange={e => setEmployeeTicketFormConfig(cfg => ({
                          ...cfg,
                          fields: { ...cfg.fields, message: { ...cfg.fields.message, required: e.target.checked } }
                        }))}
                        className="h-4 w-4"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Submit Button Text</label>
                  <input
                    type="text"
                    value={employeeTicketFormConfig.submitButtonText}
                    onChange={e => setEmployeeTicketFormConfig(cfg => ({ ...cfg, submitButtonText: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    maxLength={30}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Success Message</label>
                  <input
                    type="text"
                    value={employeeTicketFormConfig.successMessage}
                    onChange={e => setEmployeeTicketFormConfig(cfg => ({ ...cfg, successMessage: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    maxLength={100}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Theme Selection Section */}
          <div className="w-full bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-green-50 to-teal-50 dark:from-green-900/20 dark:to-teal-900/20 border-b border-gray-200 dark:border-gray-700">
              <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"></path>
              </svg>
              <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">Bot Color Theme</h3>
            </div>
            <div className="p-6">
              <div className="flex flex-col gap-6">
                {isLoadingThemes ? (
                  <div className="flex justify-center items-center h-[300px]">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    <span className="ml-2 text-gray-600">Loading themes from API...</span>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-4 justify-center overflow-y-auto h-[300px] py-4">
                    {Object.entries(colorThemes).map(([themeKey, theme]) => {
                      const isSelected = selectedTheme === themeKey;
                      return (
                        <div
                          key={themeKey}
                          className={`relative flex items-center gap-1 p-2 rounded-xl border-2 cursor-pointer shadow-md dark:shadow-lg transition-all duration-200 bg-white dark:bg-gray-800
                          ${isSelected ? 'border-blue-500 ring-2 ring-blue-200 dark:ring-blue-900 scale-110 ' : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-400 hover:scale-105'}
                          focus:outline-none focus:ring-2 focus:ring-blue-300 dark:focus:ring-blue-800
                        `}
                          onClick={() => handleThemeSelect(themeKey)}
                          tabIndex={0}
                          aria-label={`Select ${themeKey}`}
                          style={{ minWidth: 120 }}
                        >
                          {Object.entries(theme).map(([colorKey, color], idx) => (
                            <span
                              key={color}
                              className="w-8 h-8 rounded-full border-2 shadow-sm dark:shadow dark:border-gray-300 dark:border-opacity-30 transition-all duration-100 relative"
                              style={{ background: color, borderColor: color, marginLeft: idx === 0 ? 0 : 8 }}
                              onMouseEnter={() => setHoveredColor({ themeKey, colorKey })}
                              onMouseLeave={() => setHoveredColor(null)}
                              onFocus={() => setHoveredColor({ themeKey, colorKey })}
                              onBlur={() => setHoveredColor(null)}
                              tabIndex={0}
                            >
                              {hoveredColor && hoveredColor.themeKey === themeKey && hoveredColor.colorKey === colorKey && (
                                <span className="absolute flex-col  left-1/2 -top-3 -translate-x-1/2 -translate-y-full z-20 px-6 py-4 rounded-2xl shadow-2xl dark:shadow-lg bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 text-lg font-mono border border-gray-200 dark:border-gray-700 opacity-0 animate-fade-in-fast pointer-events-none flex items-center gap-4" style={{ transition: 'opacity 0.15s', opacity: 1, minWidth: 180 }}>
                                  <span className="inline-block w-20 h-20 rounded-lg border-2" style={{ background: color, borderColor: color }}></span>
                                  <span className="font-semibold text-sm">{color}</span>
                                </span>
                              )}
                            </span>
                          ))}
                          {isSelected && (
                            <span className="absolute -top-2 -right-2 bg-blue-500 text-white rounded-full p-1 shadow-lg dark:shadow dark:bg-blue-700">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                              </svg>
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
                {showThemeAlert && (
                  <div className="fixed top-32 right-4 bg-white dark:bg-gray-900 rounded-lg shadow-lg dark:shadow p-4 w-full max-w-sm z-50 animate-fade-in">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 flex items-center justify-center bg-blue-100 dark:bg-blue-900 rounded-full">
                        <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-md font-semibold text-gray-800 dark:text-gray-100">Theme Updated</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-300">Your AI Agent theme has been changed!</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>


          {/* Avatar Confirmation Alert */}
          {showAvatarAlert && (
            <div className="fixed top-30 right-4 bg-white rounded-lg shadow-lg p-4 w-full max-w-sm z-50 animate-fade-in">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 relative rounded-full overflow-hidden">
                  <Image
                    src={selectedPath}
                    alt="Selected Avatar"
                    fill
                    style={{ objectFit: 'cover' }}
                  />
                </div>
                <div>
                  <h3 className="text-md font-semibold text-gray-800">Avatar Updated</h3>
                  <p className="text-sm text-gray-600">Your AI Agent avatar has been successfully changed!</p>
                </div>
              </div>
            </div>
          )}

          {/* Name Confirmation Alert */}
          {showNameAlert && (
            <div className="fixed top-30 right-4 bg-white rounded-lg shadow-lg p-4 w-full max-w-sm z-50 animate-fade-in">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 flex items-center justify-center bg-blue-100 rounded-full">
                  <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                </div>
                <div>
                  <h3 className="text-md font-semibold text-gray-800">Name Updated</h3>
                  <p className="text-sm text-gray-600">Your AI Agent name has been changed to {botName}!</p>
                </div>
              </div>

            </div>

          )}
        </div>

      </div>
    </div>
  );
};

export default AvatarSelector;

// To enable the color preview fade-in animation, add the following to your global CSS (e.g., globals.css):
//
// @layer utilities {
//   .animate-fade-in-fast {
//     animation: fadeInFast 0.15s ease-in;
//   }
//   @keyframes fadeInFast {
//     from { opacity: 0; transform: translateY(8px); }
//     to { opacity: 1; transform: translateY(0); }
//   }
// }
