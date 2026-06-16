'use client';
import React, { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { FaUser, FaUsers, FaServer, FaCog } from "react-icons/fa";
import { Briefcase } from "lucide-react";
import ChatbotPreview from "@/components/chatbot-customization/ChatBotPreview";
import Alert from "@/components/ui/alert/Alert";
import DashboardHeader from "@/components/header/DashboardHeader";

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

const CustomizeEmployeePage = () => {
    const router = useRouter();
    const pathname = usePathname();
    const [botName] = useLocalStorage('chatbotName', 'Mobi.AI');

    const tabs = [
        { key: "customer", label: "Customer Ticket Setting", icon: <FaUser /> },
        { key: "employee", label: "Employee Ticket Setting", icon: <FaUsers /> },
        { key: "server", label: "Severity Table", icon: <FaServer /> },
        { key: "customize", label: "Customize Customer Ticket Form", icon: <FaCog /> },
        { key: "customize_employee", label: "Customize Employee Ticket Form", icon: <FaCog /> },
    ];

    const tabRoutes: Record<string, string> = {
        customer: "/helpdesk-settings",
        employee: "/helpdesk-settings?tab=employee",
        server: "/helpdesk-settings?tab=server",
        customize: "/helpdesk-settings/customize",
        customize_employee: "/helpdesk-settings/customize_employee",
    };

    const getActiveTab = React.useCallback(() => {
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

    const [activeTab, setActiveTab] = useState(getActiveTab());
    // Mobile view toggle between Customize (form) and Preview panels
    const [activeMobileTab, setActiveMobileTab] = useState<'customize' | 'preview'>(
        'customize'
    );

    // Loading and error states
    const [isLoading, setIsLoading] = useState(false);

    // Local floating alerts (toasts)
    type AlertType = 'success' | 'error' | 'info' | 'warning';
    interface LocalAlert { id: string; type: AlertType; message: string; }
    const [alerts, setAlerts] = useState<LocalAlert[]>([]);
    const showAlert = (message: string, type: AlertType = 'info') => {
        const id = `${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
        setAlerts(prev => [...prev, { id, type, message }]);
        setTimeout(() => setAlerts(prev => prev.filter(a => a.id !== id)), 5000);
    };

    useEffect(() => {
        setActiveTab(getActiveTab());
    }, [pathname, getActiveTab]);

    // Load employee ticket form configuration on component mount
    useEffect(() => {
        loadEmployeeTicketFormConfig();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const loadEmployeeTicketFormConfig = async () => {
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/customize/admin/customize-employee-ticket-form?widget_id=Model`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                const config = await response.json();
                // Merge with defaults to ensure all required fields exist
                const mergedConfig = {
                    title: config.title || "Employee Support Ticket",
                    fields: {
                        id: {
                            label: config.fields?.id?.label || "Employee ID",
                            placeholder: config.fields?.id?.placeholder || "Enter your employee ID",
                            required: config.fields?.id?.required || false
                        },
                        issueType: {
                            label: config.fields?.issueType?.label || "Issue Type",
                            required: config.fields?.issueType?.required || false,
                            options: config.fields?.issueType?.options || ["IT Support", "HR", "Facilities", "General"]
                        },
                        issue: {
                            label: config.fields?.issue?.label || "Issue",
                            required: config.fields?.issue?.required || false,
                            options: config.fields?.issue?.options || ["Computer Problem", "Access Request", "Equipment Issue", "Policy Question", "Other"]
                        },
                        message: {
                            label: config.fields?.message?.label || "Description",
                            placeholder: config.fields?.message?.placeholder || "Please describe your issue in detail...",
                            required: config.fields?.message?.required || false
                        }
                    },
                    submitButtonText: config.submitButtonText || "Submit Ticket",
                    successMessage: config.successMessage || "Your ticket has been submitted! IT support will contact you soon."
                };
                setEmployeeTicketFormConfig(mergedConfig);
                showAlert('Employee ticket form configuration loaded successfully.', 'success');
            } else if (response.status === 404) {
                console.log('No existing configuration found, using defaults');
                showAlert('No existing configuration found, using defaults', 'info');
            } else {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
        } catch (error) {
            console.error('Error loading configuration:', error);
            // Keep using default configuration
            showAlert('Failed to load configuration. Using defaults.', 'error');
        }
    };

    const saveEmployeeTicketFormConfig = async () => {
        setIsLoading(true);

        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/customize/admin/customize-employee-ticket-form?widget_id=Model`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(employeeTicketFormConfig),
            });

            if (response.ok) {
                const result = await response.json();
                showAlert(result.message || 'Configuration saved successfully!', 'success');
            } else {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Failed to save configuration');
            }
        } catch (error) {
            console.error('Error saving configuration:', error);
            showAlert(error instanceof Error ? error.message : 'Error saving configuration', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleTabChange = (tab: string) => {
        setActiveTab(tab);
        router.push(tabRoutes[tab]);
    };

    // Employee Ticket Form Configuration State
    const [employeeTicketFormConfig, setEmployeeTicketFormConfig] = useState({
        title: "Employee Support Ticket",
        fields: {
            id: { label: "Employee ID", placeholder: "Enter your employee ID", required: false },
            issueType: { label: "Issue Type", required: false, options: ["IT Support", "HR", "Facilities", "General"] },
            issue: { label: "Issue", required: false, options: ["Computer Problem", "Access Request", "Equipment Issue", "Policy Question", "Other"] },
            message: { label: "Description", placeholder: "Please describe your issue in detail...", required: false }
        },
        submitButtonText: "Submit Ticket",
        successMessage: "Your ticket has been submitted! IT support will contact you soon."
    });

    
    // Chatbot Preview Configuration
    // const botName = "Mobi.AI";
    // const selectedTheme = "theme-1";
    // Theme selection state
    const [selectedTheme] = useState(() => {
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

    const welcomeMessage = "Hello! I'm your AI assistant. How can I help you today?";

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

    const handleFieldChange = (fieldKey: string, property: string, value: string | boolean) => {
        setEmployeeTicketFormConfig(prev => ({
            ...prev,
            fields: {
                ...prev.fields,
                [fieldKey]: {
                    ...prev.fields[fieldKey as keyof typeof prev.fields],
                    [property]: value
                }
            }
        }));
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            {/* Professional Header */}
            <div className="p-4 sm:p-6 max-w-7xl mx-auto">
                <DashboardHeader
                    variant="default"
                    size="lg"
                    title="Customize Employee Ticket Form"
                    subtitle="Configure fields for the employee ticket form and preview the chatbot experience in real-time"
                    breadcrumbs={[
                        { label: 'Home', href: '/' },
                        { label: 'HelpDesk Settings', href: '/helpdesk-settings' },
                        { label: 'Customize Employee Ticket Form', href: '/helpdesk-settings/customize_employee' }
                    ]}
                    icon={() => (
                        <Briefcase className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                    )}
                />
            </div>
            <div className="p-4 sm:p-6 pb-20 max-w-7xl mx-auto">

                {/* Enhanced Tabs */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 mb-8 overflow-hidden">
                    <div className="flex">
                        {tabs.map(tab => (
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

                {/* Mobile toggle for Customize | Preview (hidden on xl+) */}
                <div className="-mt-2 mb-4 xl:hidden">
                    <div className="border-b border-gray-200 dark:border-gray-700">
                        <nav className="-mb-px flex space-x-6 overflow-x-auto" aria-label="View">
                            <button
                                type="button"
                                onClick={() => setActiveMobileTab('customize')}
                                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors duration-200 whitespace-nowrap ${
                                    activeMobileTab === 'customize'
                                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                                }`}
                            >
                                Customize
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveMobileTab('preview')}
                                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors duration-200 whitespace-nowrap ${
                                    activeMobileTab === 'preview'
                                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                                }`}
                            >
                                Preview
                            </button>
                        </nav>
                    </div>
                </div>

                {/* Floating Alerts */}
                <div className="fixed top-56 right-6 z-[2147483647] space-y-3 max-w-sm">
                    {alerts.map(a => (
                        <Alert
                            key={a.id}
                            variant={a.type}
                            title={a.type === 'success' ? 'Success' : a.type === 'error' ? 'Error' : a.type === 'warning' ? 'Warning' : 'Info'}
                            message={a.message}
                            showLink={false}
                        />
                    ))}
                </div>

                {/* Main Content */}
                <div className="flex flex-col xl:flex-row w-full gap-4 sm:gap-6">
                {/* Left Side - Form Configuration */}
                <div className={`${activeMobileTab === 'customize' ? 'block' : 'hidden'} xl:block w-full lg:w-full bg-white dark:bg-gray-900 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700`}>
                    <div className="flex items-center gap-2 mb-6">
                        <svg className="w-6 h-6 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                        </svg>
                            <h2 className="font-semibold text-lg md:text-xl text-gray-900 dark:text-white">Employee Ticket Form Configuration</h2>
                    </div>
                    <div className="space-y-6 max-h-[70vh] md:max-h-[600px] overflow-y-auto">
                        {/* Form Title */}
                        <div>
                            <label className="block font-medium mb-2 text-gray-800 dark:text-gray-200">
                                <span role="img" aria-label="title">📝</span> Form Title
                            </label>
                            <input 
                                type="text"
                                    value={employeeTicketFormConfig.title}
                                    onChange={(e) => setEmployeeTicketFormConfig(prev => ({ ...prev, title: e.target.value }))}
                                className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-4 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 dark:focus:border-blue-400 transition"
                                placeholder="Enter form title"
                                maxLength={30}
                            />
                            <span className="text-xs text-gray-500 dark:text-white-400 mt-1">Max 30 characters</span>
                        </div>

                            {/* Employee ID Field */}
                        <div>
                            <label className="block font-medium mb-2 text-gray-800 dark:text-gray-200">
                                    <span role="img" aria-label="id">🆔</span> Employee ID Field
                            </label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Label</label>
                                    <input
                                        type="text"
                                            value={employeeTicketFormConfig.fields.id.label}
                                            onChange={(e) => handleFieldChange('id', 'label', e.target.value)}
                                        className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        maxLength={20}
                                    />
                                    <span className="text-xs text-gray-500 dark:text-white-400 mt-1">Max 20 characters</span>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Placeholder</label>
                                    <input
                                        type="text"
                                            value={employeeTicketFormConfig.fields.id.placeholder}
                                            onChange={(e) => handleFieldChange('id', 'placeholder', e.target.value)}
                                        className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        maxLength={40}
                                    />
                                    <span className="text-xs text-gray-500 dark:text-white-400 mt-1">Max 40 characters</span>
                                    
                                </div>
                            </div>
                                <div className="mt-2 hidden">
                                <label className="flex items-center">
                                    <input
                                        type="checkbox"
                                            checked={employeeTicketFormConfig.fields.id.required}
                                            onChange={(e) => handleFieldChange('id', 'required', e.target.checked)}
                                        className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                    />
                                    <span className="text-sm text-gray-700 dark:text-gray-300">Required field</span>
                                </label>
                            </div>
                        </div>

                        {/* Issue Type Field */}
                        <div>
                            <label className="block font-medium mb-2 text-gray-800 dark:text-gray-200">
                                <span role="img" aria-label="issue-type">🏷️</span> Issue Type Field
                            </label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Label</label>
                                    <input
                                        type="text"
                                            value={employeeTicketFormConfig.fields.issueType.label}
                                        onChange={(e) => handleFieldChange('issueType', 'label', e.target.value)}
                                        className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        maxLength={20}
                                    />
                                    <span className="text-xs text-gray-500 dark:text-white-400 mt-1">Max 20 characters</span>
                                    
                                </div>
                                    <div className=" items-center hidden">
                                    <label className="flex items-center">
                                        <input
                                            type="checkbox"
                                                checked={employeeTicketFormConfig.fields.issueType.required}
                                            onChange={(e) => handleFieldChange('issueType', 'required', e.target.checked)}
                                            className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                        />
                                        <span className="text-sm text-gray-700 dark:text-gray-300">Required field</span>
                                    </label>
                                </div>
                            </div>
                            {/* <div className="mt-3">
                                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Options</label>
                                    {employeeTicketFormConfig.fields.issueType.options.map((option, index) => (
                                    <div key={index} className="flex items-center gap-2 mb-2">
                                        <input
                                            type="text"
                                            value={option}
                                            onChange={(e) => handleOptionChange('issueType', index, e.target.value)}
                                            className="flex-1 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                        
                                    </div>
                                ))}
                               
                            </div> */}
                        </div>

                        {/* Issue Field */}
                        <div>
                            <label className="block font-medium mb-2 text-gray-800 dark:text-gray-200">
                                <span role="img" aria-label="issue">🔧</span> Issue Field
                            </label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Label</label>
                                    <input
                                        type="text"
                                            value={employeeTicketFormConfig.fields.issue.label}
                                        onChange={(e) => handleFieldChange('issue', 'label', e.target.value)}
                                        className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        maxLength={20}
                                    />
                                    <span className="text-xs text-gray-500 dark:text-white-400 mt-1">Max 20 characters</span>
                                    
                                </div>
                                    <div className=" items-center hidden">
                                    <label className="flex items-center">
                                        <input
                                            type="checkbox"
                                                checked={employeeTicketFormConfig.fields.issue.required}
                                            onChange={(e) => handleFieldChange('issue', 'required', e.target.checked)}
                                            className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                        />
                                        <span className="text-sm text-gray-700 dark:text-gray-300">Required field</span>
                                    </label>
                                </div>
                            </div>
                            {/* <div className="mt-3">
                                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Options</label>
                                    {employeeTicketFormConfig.fields.issue.options.map((option, index) => (
                                    <div key={index} className="flex items-center gap-2 mb-2">
                                        <input
                                            type="text"
                                            value={option}
                                            onChange={(e) => handleOptionChange('issue', index, e.target.value)}
                                            className="flex-1 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                        
                                    </div>
                                ))}
                                
                            </div> */}
                        </div>

                        {/* Message Field */}
                        <div>
                            <label className="block font-medium mb-2 text-gray-800 dark:text-gray-200">
                                <span role="img" aria-label="message">💬</span> Message Field
                            </label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Label</label>
                                    <input
                                        type="text"
                                            value={employeeTicketFormConfig.fields.message.label}
                                        onChange={(e) => handleFieldChange('message', 'label', e.target.value)}
                                        className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        maxLength={20}
                                    />
                                    <span className="text-xs text-gray-500 dark:text-white-400 mt-1">Max 20 characters</span>
                                    
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Placeholder</label>
                                    <input
                                        type="text"
                                            value={employeeTicketFormConfig.fields.message.placeholder}
                                        onChange={(e) => handleFieldChange('message', 'placeholder', e.target.value)}
                                        className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        maxLength={40}
                                    />
                                    <span className="text-xs text-gray-500 dark:text-white-400 mt-1">Max 40 characters</span>
                                    
                                </div>
                            </div>
                                <div className="mt-2 hidden">
                                <label className="flex items-center">
                                    <input
                                        type="checkbox"
                                            checked={employeeTicketFormConfig.fields.message.required}
                                        onChange={(e) => handleFieldChange('message', 'required', e.target.checked)}
                                        className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                    />
                                    <span className="text-sm text-gray-700 dark:text-gray-300">Required field</span>
                                </label>
                            </div>
                        </div>

                        {/* Submit Button Text */}
                        <div>
                            <label className="block font-medium mb-2 text-gray-800 dark:text-gray-200">
                                <span role="img" aria-label="submit">🚀</span> Submit Button Text
                            </label>
                            <input
                                type="text"
                                    value={employeeTicketFormConfig.submitButtonText}
                                    onChange={(e) => setEmployeeTicketFormConfig(prev => ({ ...prev, submitButtonText: e.target.value }))}
                                className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-4 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 dark:focus:border-blue-400 transition"
                                placeholder="Enter submit button text"
                                maxLength={30}
                            />
                            <span className="text-xs text-gray-500 dark:text-white-400 mt-1">Max 30 characters</span>
                            
                        </div>

                        {/* Success Message */}
                        <div>
                            <label className="block font-medium mb-2 text-gray-800 dark:text-gray-200">
                                <span role="img" aria-label="success">✅</span> Success Message
                            </label>
                            <input
                                type="text"
                                    value={employeeTicketFormConfig.successMessage}
                                    onChange={(e) => setEmployeeTicketFormConfig(prev => ({ ...prev, successMessage: e.target.value }))}
                                className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-4 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 dark:focus:border-blue-400 transition"
                                placeholder="Enter success message"
                                maxLength={100}
                            />
                            <span className="text-xs text-gray-500 dark:text-white-400 mt-1">Max 100 characters</span>
                            
                        </div>

                        {/* Inline banners replaced by floating alerts */}

                        {/* Action Buttons */}
                        <div className="flex flex-col gap-3 pt-4">
                            <button 
                                type="button" 
                                onClick={saveEmployeeTicketFormConfig}
                                disabled={isLoading}
                                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-60 text-white rounded-lg py-3 font-semibold transition-all shadow-md hover:shadow-lg"
                            >
                                {isLoading ? 'Saving...' : 'Save Configuration'}
                            </button>
                            <button 
                                type="button" 
                                onClick={loadEmployeeTicketFormConfig}
                                className="w-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg py-3 font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-all shadow-sm hover:shadow"
                            >
                                Reset to Defaults
                            </button>
                        </div>
                    </div>
                </div>
                {/* Right Side - Chatbot Preview */}
                <div className={`${activeMobileTab === 'preview' ? 'block' : 'hidden'} xl:block w-full lg:w-full bg-white dark:bg-gray-900 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700`}>
                    <div className="flex items-center gap-2 mb-6">
                        <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                        </svg>
                        <h2 className="font-semibold text-lg md:text-xl text-gray-900 dark:text-white">Chatbot Preview</h2>
                    </div>
                    <div className="flex justify-center">
                        <div className="w-full max-w-md">
                        <ChatbotPreview
                            botName={botName}
                            selectedTheme={selectedTheme}
                            colorThemes={COLOR_THEMES}
                            welcomeMessage={welcomeMessage}
                                employeeTicketFormConfig={employeeTicketFormConfig}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
        </div>
  );
};

export default CustomizeEmployeePage;
