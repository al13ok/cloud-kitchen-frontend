'use client';
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import ChatbotPreview, { ContactFormConfig as PreviewContactFormConfig } from "@/components/chatbot-customization/ChatBotPreview";
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

interface FormField {
    label: string;
    placeholder: string;
    required: boolean;
    options?: string[];
}

interface LocalContactFormConfig {
    title: string;
    fields: {
        name: FormField;
        email: FormField;
        phone: FormField;
        interest: FormField & { options: string[] };
        source: FormField & { options: string[] };
        property_area: FormField;
        lead_type: FormField & { options: string[] };
        price_range: FormField;
        preferred_area_city: FormField;
        message: FormField;
    };
    submitButtonText: string;
    successMessage: string;
    widget_id: string;
}

// Ensure loaded contact form config always has all expected fields
const withContactDefaults = (incoming: LocalContactFormConfig): LocalContactFormConfig => {
    const defaults: LocalContactFormConfig = {
        title: incoming?.title || 'Contact Us',
        fields: {
            name: incoming?.fields?.name || { label: 'Name', placeholder: 'Your name', required: true },
            email: incoming?.fields?.email || { label: 'Email', placeholder: 'your.email@example.com', required: true },
            phone: incoming?.fields?.phone || { label: 'Phone', placeholder: 'Your phone number', required: true },
            interest: incoming?.fields?.interest || { label: 'Interest', placeholder: 'Select your interest', required: false, options: ['java', 'HR', 'sss', 'hr'] },
            source: incoming?.fields?.source || { label: 'Source', placeholder: 'Select source', required: false, options: ['naukri', 'Whatsapp', 'Instagram', 'Facebook', 'Twitter', 'insta'] },
            property_area: incoming?.fields?.property_area || { label: 'Property Area', placeholder: 'e.g., 1200 sq ft', required: false },
            lead_type: incoming?.fields?.lead_type || { label: 'Lead Type', placeholder: 'Select lead type', required: false, options: ['New'] },
            price_range: incoming?.fields?.price_range || { label: 'Price Range', placeholder: 'e.g., 50L-1Cr', required: false },
            preferred_area_city: incoming?.fields?.preferred_area_city || { label: 'Preferred Area/City', placeholder: 'e.g., Mumbai, Andheri East', required: false },
            message: incoming?.fields?.message || { label: 'message', placeholder: 'Your message...', required: false }
        },
        submitButtonText: incoming?.submitButtonText || 'Send Message',
        successMessage: incoming?.successMessage || "Thank you for your message! We'll get back to you soon.",
        widget_id: incoming?.widget_id || "Model"
    };
    return defaults;
};

// Convert LocalContactFormConfig to PreviewContactFormConfig for ChatbotPreview
const convertToPreviewConfig = (config: LocalContactFormConfig): PreviewContactFormConfig => {
    return {
        title: config.title,
        fields: {
            name: config.fields.name,
            email: config.fields.email,
            phone: config.fields.phone,
            dropdown1: {
                label: config.fields.interest.label,
                placeholder: config.fields.interest.placeholder,
                required: config.fields.interest.required,
                options: config.fields.interest.options
            },
            dropdown2: {
                label: config.fields.source.label,
                placeholder: config.fields.source.placeholder,
                required: config.fields.source.required,
                options: config.fields.source.options
            },
            message: config.fields.message
        },
        submitButtonText: config.submitButtonText,
        successMessage: config.successMessage
    };
};

const CustomizePage = () => {
    const router = useRouter();
    const pathname = usePathname();

    // Loading and error states
    const [isLoading, setIsLoading] = useState(false);
    const [saveLoading, setSaveLoading] = useState(false);

    // Local floating alerts (toasts)
    type AlertType = 'success' | 'error' | 'info' | 'warning';
    interface LocalAlert { id: string; type: AlertType; message: string; }
    const [alerts, setAlerts] = useState<LocalAlert[]>([]);
    const showAlert = useCallback((message: string, type: AlertType = 'info') => {
        const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        setAlerts(prev => [...prev, { id, type, message }]);
        setTimeout(() => {
            setAlerts(prev => prev.filter(a => a.id !== id));
        }, 5000);
    }, []);
    const [botName] = useLocalStorage('chatbotName', 'Mobi.AI');
    // Mobile view tab: toggle between Customize (form) and Preview
    const [activeMobileTab, setActiveMobileTab] = useState<'customize' | 'preview'>('customize');

    const handleTabChange = (tab: 'settings' | 'customize') => {
        if (tab === 'customize') {
            router.push('/crm-settings/customize');
        } else {
            router.push('/crm-settings');
        }
    };

    // Contact Form Configuration State with default values through withContactDefaults
    const [contactFormConfig, setContactFormConfig] = useState<LocalContactFormConfig>(() =>
        withContactDefaults({
            title: "Contact Us",
            fields: {
                name: { label: "Name", placeholder: "Your name", required: true },
                email: { label: "Email", placeholder: "your.email@example.com", required: true },
                phone: { label: "Phone", placeholder: "Your phone number", required: true },
                interest: { label: "Interest", placeholder: "Select your interest", required: false, options: ["java", "HR", "sss", "hr"] },
                source: { label: "Source", placeholder: "Select source", required: false, options: ["naukri", "Whatsapp", "Instagram", "Facebook", "Twitter", "insta"] },
                property_area: { label: "Property Area", placeholder: "e.g., 1200 sq ft", required: false },
                lead_type: { label: "Lead Type", placeholder: "Select lead type", required: false, options: ["New"] },
                price_range: { label: "Price Range", placeholder: "e.g., 50L-1Cr", required: false },
                preferred_area_city: { label: "Preferred Area/City", placeholder: "e.g., Mumbai, Andheri East", required: false },
                message: { label: "message", placeholder: "Your message...", required: false }
            },
            submitButtonText: "Send Message",
            successMessage: "Thank you for your message! We'll get back to you soon.",
            widget_id: "Model"
        })
    );

    // Load configuration from API with proper error handling and defaults
    const loadContactFormConfig = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`https://py-mobiloitte.converiqo.ai/customize/admin/customize-contact-form?widget_id=Model`, {
                method: 'GET',
                headers: {
                    'accept': 'application/json',
                },
            });

            if (response.ok) {
                const data = await response.json();
                if (data) {
                    const formattedData = withContactDefaults({
                        ...data,
                        fields: {
                            name: data.fields?.name || { label: "Name", placeholder: "Your name", required: true },
                            email: data.fields?.email || { label: "Email", placeholder: "your.email@example.com", required: true },
                            phone: data.fields?.phone || { label: "Phone", placeholder: "Your phone number", required: true },
                            interest: data.fields?.interest || { label: "Interest", placeholder: "Select your interest", required: false, options: ["java", "HR", "sss", "hr"] },
                            source: data.fields?.source || { label: "Source", placeholder: "Select source", required: false, options: ["naukri", "Whatsapp", "Instagram", "Facebook", "Twitter", "insta"] },
                            property_area: data.fields?.property_area || { label: "Property Area", placeholder: "e.g., 1200 sq ft", required: false },
                            lead_type: data.fields?.lead_type || { label: "Lead Type", placeholder: "Select lead type", required: false, options: ["New"] },
                            price_range: data.fields?.price_range || { label: "Price Range", placeholder: "e.g., 50L-1Cr", required: false },
                            preferred_area_city: data.fields?.preferred_area_city || { label: "Preferred Area/City", placeholder: "e.g., Mumbai, Andheri East", required: false },
                            message: data.fields?.message || { label: "message", placeholder: "Your message...", required: false }
                        }
                    });
                    setContactFormConfig(formattedData);
                    showAlert('Contact form configuration loaded successfully.', 'success');
                }
            } else if (response.status === 404) {
                // Set default configuration if not found
                const defaultConfig = withContactDefaults({
                    title: "Contact Us",
                    fields: {
                        name: { label: "Name", placeholder: "Your name", required: true },
                        email: { label: "Email", placeholder: "your.email@example.com", required: true },
                        phone: { label: "Phone", placeholder: "Your phone number", required: true },
                        interest: { label: "Interest", placeholder: "Select your interest", required: false, options: ["java", "HR", "sss", "hr"] },
                        source: { label: "Source", placeholder: "Select source", required: false, options: ["naukri", "Whatsapp", "Instagram", "Facebook", "Twitter", "insta"] },
                        property_area: { label: "Property Area", placeholder: "e.g., 1200 sq ft", required: false },
                        lead_type: { label: "Lead Type", placeholder: "Select lead type", required: false, options: ["New"] },
                        price_range: { label: "Price Range", placeholder: "e.g., 50L-1Cr", required: false },
                        preferred_area_city: { label: "Preferred Area/City", placeholder: "e.g., Mumbai, Andheri East", required: false },
                        message: { label: "message", placeholder: "Your message...", required: false }
                    },
                    submitButtonText: "Send Message",
                    successMessage: "Thank you for your message! We'll get back to you soon.",
                    widget_id: "Model"
                });
                setContactFormConfig(defaultConfig);
                console.log('No existing configuration found, using defaults');
                showAlert('No existing configuration found, using defaults', 'info');
            } else {
                throw new Error('Failed to load configuration');
            }
        } catch (err) {
            console.error('Error loading configuration:', err);
            // Set default configuration on error
            const defaultConfig = withContactDefaults({
                title: "Contact Us",
                fields: {
                    name: { label: "Name", placeholder: "Your name", required: true },
                    email: { label: "Email", placeholder: "your.email@example.com", required: true },
                    phone: { label: "Phone", placeholder: "Your phone number", required: true },
                    interest: { label: "Interest", placeholder: "Select your interest", required: false, options: ["java", "HR", "sss", "hr"] },
                    source: { label: "Source", placeholder: "Select source", required: false, options: ["naukri", "Whatsapp", "Instagram", "Facebook", "Twitter", "insta"] },
                    property_area: { label: "Property Area", placeholder: "e.g., 1200 sq ft", required: false },
                    lead_type: { label: "Lead Type", placeholder: "Select lead type", required: false, options: ["New"] },
                    price_range: { label: "Price Range", placeholder: "e.g., 50L-1Cr", required: false },
                    preferred_area_city: { label: "Preferred Area/City", placeholder: "e.g., Mumbai, Andheri East", required: false },
                    message: { label: "message", placeholder: "Your message...", required: false }
                },
                submitButtonText: "Send Message",
                successMessage: "Thank you for your message! We'll get back to you soon.",
                widget_id: "Model"
            });
            setContactFormConfig(defaultConfig);
            showAlert('Failed to load configuration. Using default values.', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [showAlert]);

    // Save configuration to API
    const saveContactFormConfig = async () => {
        setSaveLoading(true);

        try {
            const requestBody = {
                ...contactFormConfig,
                widget_id: "Model",
                fields: {
                    name: contactFormConfig.fields.name,
                    email: contactFormConfig.fields.email,
                    phone: contactFormConfig.fields.phone,
                    interest: contactFormConfig.fields.interest,
                    source: contactFormConfig.fields.source,
                    property_area: contactFormConfig.fields.property_area,
                    lead_type: contactFormConfig.fields.lead_type,
                    price_range: contactFormConfig.fields.price_range,
                    preferred_area_city: contactFormConfig.fields.preferred_area_city,
                    message: contactFormConfig.fields.message
                }
            };

            const response = await fetch(`https://py-mobiloitte.converiqo.ai/customize/admin/customize-contact-form?widget_id=Model`, {
                method: 'PUT',
                headers: {
                    'accept': 'application/json',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
            });

            if (response.ok) {
                const data = await response.json();
                showAlert(data.message || 'Configuration saved successfully!', 'success');
            } else {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Failed to save configuration');
            }
        } catch (err) {
            console.error('Error saving configuration:', err);
            showAlert(err instanceof Error ? err.message : 'Failed to save configuration', 'error');
        } finally {
            setSaveLoading(false);
        }
    };

    // Load configuration on component mount
    useEffect(() => {
        loadContactFormConfig();
    }, [loadContactFormConfig]);

    // Chatbot Preview Configuration
    // const botName = "Mobi.AI";
    // const selectedTheme = "theme-1";
    // Theme selection state using custom hook for consistent hydration
    const [selectedTheme] = useLocalStorage('chatbotTheme', 'theme-1');
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

    // Helpers to update field config

    const handleTextFieldChange = (
        fieldKey: keyof LocalContactFormConfig["fields"],
        property: "label" | "placeholder" | "required",
        value: string | boolean
    ) => {
        setContactFormConfig(prev => ({
            ...prev,
            fields: {
                ...prev.fields,
                [fieldKey]: {
                    ...prev.fields[fieldKey],
                    [property]: value
                }
            }
        }));
    };

    const handleDropdownMetaChange = (
        dropdownKey: Extract<keyof LocalContactFormConfig["fields"], "interest" | "source" | "lead_type">,
        property: "label" | "placeholder" | "required",
        value: string | boolean
    ) => {
        setContactFormConfig(prev => ({
            ...prev,
            fields: {
                ...prev.fields,
                [dropdownKey]: {
                    ...prev.fields[dropdownKey],
                    [property]: value
                }
            }
        }));
    };

    const handleContactSubmit = (data: { name: string; email: string; phone: string; dropdown1: string; dropdown2: string; message: string; }) => {
        // Convert the preview form data back to our local format
        const localData = {
            name: data.name,
            email: data.email,
            phone: data.phone,
            interest: data.dropdown1,
            source: data.dropdown2,
            property_area: '', // These fields are not in the preview form
            lead_type: '',
            price_range: '',
            preferred_area_city: '',
            message: data.message
        };
        // Integrate your API here
        console.log('Contact form submitted:', localData);
    };

    // (removed duplicate load effect to avoid multiple alerts)

    // Reset to defaults
    const resetToDefaults = () => {
        setContactFormConfig({
            title: "Contact Us",
            fields: {
                name: { label: "Name", placeholder: "Your name", required: true },
                email: { label: "Email", placeholder: "your.email@example.com", required: true },
                phone: { label: "Phone", placeholder: "Your phone number", required: true },
                interest: { label: "Interest", placeholder: "Select your interest", required: false, options: ["java", "HR", "sss", "hr"] },
                source: { label: "Source", placeholder: "Select source", required: false, options: ["naukri", "Whatsapp", "Instagram", "Facebook", "Twitter", "insta"] },
                property_area: { label: "Property Area", placeholder: "e.g., 1200 sq ft", required: false },
                lead_type: { label: "Lead Type", placeholder: "Select lead type", required: false, options: ["New"] },
                price_range: { label: "Price Range", placeholder: "e.g., 50L-1Cr", required: false },
                preferred_area_city: { label: "Preferred Area/City", placeholder: "e.g., Mumbai, Andheri East", required: false },
                message: { label: "message", placeholder: "Your message...", required: false }
            },
            submitButtonText: "Send Message",
            successMessage: "Thank you for your message! We'll get back to you soon.",
            widget_id: "Model"
        });
        showAlert('Configuration reset to defaults!', 'success');
    };

    // Ensure we have data before rendering
    const [isInitialized, setIsInitialized] = useState(false);

    useEffect(() => {
        if (!isInitialized) {
            loadContactFormConfig().then(() => {
                setIsInitialized(true);
            });
        }
    }, [isInitialized, loadContactFormConfig]);

    if (isLoading || !isInitialized) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600 dark:text-gray-400">Loading configuration...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <div className="p-4 sm:p-6 pb-20 max-w-7xl mx-auto">
                {/* Professional Header */}
                <DashboardHeader
                    variant="default"
                    size="lg"
                    title="Customize Contact Us"
                    subtitle="Configure your contact form fields and preview the chatbot experience in real-time"
                    breadcrumbs={[
                        { label: 'Home', href: '/' },
                        { label: 'CRM Settings', href: '/crm-settings' },
                        { label: 'Customize Contact Us', href: '/crm-settings/customize' }
                    ]}
                    icon={() => (
                        <svg className="w-6 h-6 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z" />
                        </svg>
                    )}
                />

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

                {/* Enhanced Tabs */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 mb-8 overflow-hidden">
                    <div className="flex">
                        <button
                            onClick={() => handleTabChange('settings')}
                            className={`flex-1 flex items-center justify-center gap-3 px-6 py-4 font-semibold text-sm transition-all duration-300 ${pathname === '/crm-settings'
                                ? 'text-blue-600 dark:text-blue-400 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-b-2 border-blue-600 dark:border-blue-400'
                                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700'
                                }`}
                        >
                            <div className={`p-2 rounded-lg transition-colors duration-200 ${pathname === '/crm-settings' ? 'bg-blue-100 dark:bg-blue-800/30' : 'bg-gray-100 dark:bg-gray-700'
                                }`}>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                            </div>
                            <span>Settings</span>
                            {pathname === '/crm-settings' && (
                                <div className="w-2 h-2 bg-blue-600 dark:bg-blue-400 rounded-full animate-pulse"></div>
                            )}
                        </button>
                        <button
                            onClick={() => handleTabChange('customize')}
                            className={`flex-1 flex items-center justify-center gap-3 px-6 py-4 font-semibold text-sm transition-all duration-300 ${pathname === '/crm-settings/customize'
                                ? 'text-blue-600 dark:text-blue-400 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-b-2 border-blue-600 dark:border-blue-400'
                                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700'
                                }`}
                        >
                            <div className={`p-2 rounded-lg transition-colors duration-200 ${pathname === '/crm-settings/customize' ? 'bg-blue-100 dark:bg-blue-800/30' : 'bg-gray-100 dark:bg-gray-700'
                                }`}>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z" />
                                </svg>
                            </div>
                            <span>Customize Contact Us</span>
                            {pathname === '/crm-settings/customize' && (
                                <div className="w-2 h-2 bg-blue-600 dark:bg-blue-400 rounded-full animate-pulse"></div>
                            )}
                        </button>
                    </div>
                </div>

                {/* Mobile Toggle for Customize | Preview (xl and below hidden on desktop) */}
                <div className="px-4 sm:px-6 -mt-2 mb-4 xl:hidden">
                    <div className="border-b border-gray-200 dark:border-gray-700">
                        <nav className="-mb-px flex space-x-6 overflow-x-auto" aria-label="View">
                            <button
                                type="button"
                                onClick={() => setActiveMobileTab('customize')}
                                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors duration-200 whitespace-nowrap ${activeMobileTab === 'customize'
                                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                                    }`}
                            >
                                Customize
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveMobileTab('preview')}
                                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors duration-200 whitespace-nowrap ${activeMobileTab === 'preview'
                                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                                    }`}
                            >
                                Preview
                            </button>
                        </nav>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex flex-col xl:flex-row w-full gap-4 sm:gap-6">
                    {/* Left Side - Form Configuration */}
                    <div className={`${activeMobileTab === 'customize' ? 'block' : 'hidden'} xl:block w-full xl:w-1/2 bg-white dark:bg-gray-800 rounded-lg p-4 sm:p-6 shadow-sm border border-gray-200 dark:border-gray-700`}>
                        <div className="flex items-center gap-2 mb-4 sm:mb-6">
                            <svg className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                            </svg>
                            <h2 className="font-semibold text-base sm:text-lg md:text-xl text-gray-900 dark:text-white">Contact Form Configuration</h2>
                        </div>

                        <div className="space-y-4 sm:space-y-6 max-h-[70vh] md:max-h-[600px] overflow-y-auto pr-2">
                            {/* Form Title */}
                            <div>
                                <label className="block font-medium mb-2 text-gray-800 dark:text-gray-200">
                                    <span role="img" aria-label="title">📝</span> Form Title
                                </label>
                                <input
                                    type="text"
                                    value={contactFormConfig.title}
                                    onChange={(e) => setContactFormConfig(prev => ({ ...prev, title: e.target.value }))}
                                    className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 sm:px-4 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 dark:focus:border-blue-400 transition"
                                    placeholder="Enter form title"
                                    maxLength={30}
                                />
                                <span className="text-xs text-gray-500 dark:text-white-400 mt-1">Max 30 characters</span>

                            </div>

                            {/* Name Field */}
                            <div>
                                <label className="block font-medium mb-2 text-gray-800 dark:text-gray-200">
                                    <span role="img" aria-label="name">👤</span> Name Field
                                </label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Label</label>
                                        <input
                                            type="text"
                                            value={contactFormConfig.fields.name.label}
                                            onChange={(e) => handleTextFieldChange('name', 'label', e.target.value)}
                                            className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            maxLength={20}
                                        />
                                        <span className="text-xs text-gray-500 dark:text-white-400 mt-1">Max 20 characters</span>

                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Placeholder</label>
                                        <input
                                            type="text"
                                            value={contactFormConfig.fields.name.placeholder}
                                            onChange={(e) => handleTextFieldChange('name', 'placeholder', e.target.value)}
                                            className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            maxLength={40}
                                        />
                                        <span className="text-xs text-gray-500 dark:text-white-400 mt-1">Max 40 characters</span>
                                    </div>
                                </div>
                                <div className="mt-2 hidden">
                                    <label className="flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={contactFormConfig.fields.name.required}
                                            onChange={(e) => handleTextFieldChange('name', 'required', e.target.checked)}
                                            className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                                        />
                                        <span className="text-sm text-gray-700 dark:text-gray-300">Required field</span>
                                    </label>
                                </div>
                            </div>

                            {/* Email Field */}
                            <div>
                                <label className="block font-medium mb-2 text-gray-800 dark:text-gray-200">
                                    <span role="img" aria-label="email">📧</span> Email Field
                                </label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Label</label>
                                        <input
                                            type="text"
                                            value={contactFormConfig.fields.email.label}
                                            onChange={(e) => handleTextFieldChange('email', 'label', e.target.value)}
                                            className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            maxLength={20}
                                        />
                                        <span className="text-xs text-gray-500 dark:text-white-400 mt-1">Max 20 characters</span>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Placeholder</label>
                                        <input
                                            type="text"
                                            value={contactFormConfig.fields.email.placeholder}
                                            onChange={(e) => handleTextFieldChange('email', 'placeholder', e.target.value)}
                                            className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            maxLength={40}
                                        />
                                        <span className="text-xs text-gray-500 dark:text-white-400 mt-1">Max 40 characters</span>
                                    </div>
                                </div>
                                <div className="mt-2 hidden">
                                    <label className="flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={contactFormConfig.fields.email.required}
                                            onChange={(e) => handleTextFieldChange('email', 'required', e.target.checked)}
                                            className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                                        />
                                        <span className="text-sm text-gray-700 dark:text-gray-300">Required field</span>
                                    </label>
                                </div>
                            </div>

                            {/* Phone Field */}
                            <div>
                                <label className="block font-medium mb-2 text-gray-800 dark:text-gray-200">
                                    <span role="img" aria-label="phone">📞</span> Phone Field
                                </label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Label</label>
                                        <input
                                            type="text"
                                            value={contactFormConfig.fields.phone?.label || "Phone"}
                                            onChange={(e) => handleTextFieldChange('phone', 'label', e.target.value)}
                                            className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            maxLength={20}
                                        />
                                        <span className="text-xs text-gray-500 dark:text-white-400 mt-1">Max 20 characters</span>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Placeholder</label>
                                        <input
                                            type="text"
                                            value={contactFormConfig.fields.phone?.placeholder || "Your phone number"}
                                            onChange={(e) => handleTextFieldChange('phone', 'placeholder', e.target.value)}
                                            className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            maxLength={40}
                                        />
                                        <span className="text-xs text-gray-500 dark:text-white-400 mt-1">Max 40 characters</span>
                                    </div>
                                </div>
                                <div className="mt-2 hidden">
                                    <label className="flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={contactFormConfig.fields.phone?.required || false}
                                            onChange={(e) => handleTextFieldChange('phone', 'required', e.target.checked)}
                                            className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                                        />
                                        <span className="text-sm text-gray-700 dark:text-gray-300">Required field</span>
                                    </label>
                                </div>
                            </div>

                            {/* Interest Field */}
                            <div>
                                <label className="block font-medium mb-2 text-gray-800 dark:text-gray-200">
                                    <span role="img" aria-label="interest">📂</span> Interest
                                </label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                                    <div className="sm:col-span-1">
                                        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Label</label>
                                        <input
                                            type="text"
                                            value={contactFormConfig.fields.interest.label}
                                            onChange={(e) => handleDropdownMetaChange('interest', 'label', e.target.value)}
                                            className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            maxLength={20}
                                        />
                                        <span className="text-xs text-gray-500 dark:text-white-400 mt-1">Max 20 characters</span>
                                    </div>
                                    <div className="sm:col-span-1">
                                        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Placeholder</label>
                                        <input
                                            type="text"
                                            value={contactFormConfig.fields.interest.placeholder}
                                            onChange={(e) => handleDropdownMetaChange('interest', 'placeholder', e.target.value)}
                                            className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            maxLength={40}
                                        />
                                        <span className="text-xs text-gray-500 dark:text-white-400 mt-1">Max 40 characters</span>
                                    </div>
                                    <div className="sm:col-span-1  items-end hidden">
                                        <label className="flex items-center w-full">
                                            <input
                                                type="checkbox"
                                                checked={contactFormConfig.fields.interest.required}
                                                onChange={(e) => handleDropdownMetaChange('interest', 'required', e.target.checked)}
                                                className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                                            />
                                            <span className="text-sm text-gray-700 dark:text-gray-300">Required</span>
                                        </label>
                                    </div>
                                </div>
                                {/* <div className="mt-3">
                                    <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Options</label>
                                    {contactFormConfig.fields.dropdown1.options.map((option, index) => (
                                        <div key={index} className="flex items-center gap-2 mb-2">
                                            <input
                                                type="text"
                                                value={option}
                                                onChange={(e) => handleDropdownOptionChange('dropdown1', index, e.target.value)}
                                                className="flex-1 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                            
                                        </div>
                                    ))}
                                    
                                </div> */}
                            </div>

                            {/* Source Field */}
                            <div>
                                <label className="block font-medium mb-2 text-gray-800 dark:text-gray-200">
                                    <span role="img" aria-label="source">🧩</span> Source
                                </label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                                    <div className="sm:col-span-1">
                                        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Label</label>
                                        <input
                                            type="text"
                                            value={contactFormConfig.fields.source.label}
                                            onChange={(e) => handleDropdownMetaChange('source', 'label', e.target.value)}
                                            className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            maxLength={20}
                                        />
                                        <span className="text-xs text-gray-500 dark:text-white-400 mt-1">Max 20 characters</span>
                                    </div>
                                    <div className="sm:col-span-1">
                                        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Placeholder</label>
                                        <input
                                            type="text"
                                            value={contactFormConfig.fields.source.placeholder}
                                            onChange={(e) => handleDropdownMetaChange('source', 'placeholder', e.target.value)}
                                            className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            maxLength={40}
                                        />
                                        <span className="text-xs text-gray-500 dark:text-white-400 mt-1">Max 40 characters</span>
                                    </div>
                                    <div className="sm:col-span-1  items-end hidden">
                                        <label className="flex items-center w-full">
                                            <input
                                                type="checkbox"
                                                checked={contactFormConfig.fields.source.required}
                                                onChange={(e) => handleDropdownMetaChange('source', 'required', e.target.checked)}
                                                className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                                            />
                                            <span className="text-sm text-gray-700 dark:text-gray-300">Required</span>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            {/* Lead Type Field */}
                            <div>
                                <label className="block font-medium mb-2 text-gray-800 dark:text-gray-200">
                                    <span role="img" aria-label="lead-type">🎯</span> Lead Type
                                </label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                                    <div className="sm:col-span-1">
                                        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Label</label>
                                        <input
                                            type="text"
                                            value={contactFormConfig.fields.lead_type.label}
                                            onChange={(e) => handleDropdownMetaChange('lead_type', 'label', e.target.value)}
                                            className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            maxLength={20}
                                        />
                                        <span className="text-xs text-gray-500 dark:text-white-400 mt-1">Max 20 characters</span>
                                    </div>
                                    <div className="sm:col-span-1">
                                        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Placeholder</label>
                                        <input
                                            type="text"
                                            value={contactFormConfig.fields.lead_type.placeholder}
                                            onChange={(e) => handleDropdownMetaChange('lead_type', 'placeholder', e.target.value)}
                                            className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            maxLength={40}
                                        />
                                        <span className="text-xs text-gray-500 dark:text-white-400 mt-1">Max 40 characters</span>
                                    </div>
                                    <div className="sm:col-span-1 items-end hidden">
                                        <label className="flex items-center w-full">
                                            <input
                                                type="checkbox"
                                                checked={contactFormConfig.fields.lead_type.required}
                                                onChange={(e) => handleDropdownMetaChange('lead_type', 'required', e.target.checked)}
                                                className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                                            />
                                            <span className="text-sm text-gray-700 dark:text-gray-300">Required</span>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            {/* Property Area Field */}
                            <div>
                                <label className="block font-medium mb-2 text-gray-800 dark:text-gray-200">
                                    <span role="img" aria-label="property-area">📐</span> Property Area
                                </label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Label</label>
                                        <input
                                            type="text"
                                            value={contactFormConfig.fields.property_area.label}
                                            onChange={(e) => handleTextFieldChange('property_area', 'label', e.target.value)}
                                            className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            maxLength={20}
                                        />
                                        <span className="text-xs text-gray-500 dark:text-white-400 mt-1">Max 20 characters</span>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Placeholder</label>
                                        <input
                                            type="text"
                                            value={contactFormConfig.fields.property_area.placeholder}
                                            onChange={(e) => handleTextFieldChange('property_area', 'placeholder', e.target.value)}
                                            className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            maxLength={40}
                                        />
                                        <span className="text-xs text-gray-500 dark:text-white-400 mt-1">Max 40 characters</span>
                                    </div>
                                </div>
                            </div>

                            {/* Price Range Field */}
                            <div>
                                <label className="block font-medium mb-2 text-gray-800 dark:text-gray-200">
                                    <span role="img" aria-label="price-range">💰</span> Price Range
                                </label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Label</label>
                                        <input
                                            type="text"
                                            value={contactFormConfig.fields.price_range.label}
                                            onChange={(e) => handleTextFieldChange('price_range', 'label', e.target.value)}
                                            className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            maxLength={20}
                                        />
                                        <span className="text-xs text-gray-500 dark:text-white-400 mt-1">Max 20 characters</span>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Placeholder</label>
                                        <input
                                            type="text"
                                            value={contactFormConfig.fields.price_range.placeholder}
                                            onChange={(e) => handleTextFieldChange('price_range', 'placeholder', e.target.value)}
                                            className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            maxLength={40}
                                        />
                                        <span className="text-xs text-gray-500 dark:text-white-400 mt-1">Max 40 characters</span>
                                    </div>
                                </div>
                            </div>

                            {/* Preferred Area/City Field */}
                            <div>
                                <label className="block font-medium mb-2 text-gray-800 dark:text-gray-200">
                                    <span role="img" aria-label="preferred-area">📍</span> Preferred Area/City
                                </label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Label</label>
                                        <input
                                            type="text"
                                            value={contactFormConfig.fields.preferred_area_city.label}
                                            onChange={(e) => handleTextFieldChange('preferred_area_city', 'label', e.target.value)}
                                            className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            maxLength={30}
                                        />
                                        <span className="text-xs text-gray-500 dark:text-white-400 mt-1">Max 30 characters</span>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Placeholder</label>
                                        <input
                                            type="text"
                                            value={contactFormConfig.fields.preferred_area_city.placeholder}
                                            onChange={(e) => handleTextFieldChange('preferred_area_city', 'placeholder', e.target.value)}
                                            className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            maxLength={60}
                                        />
                                        <span className="text-xs text-gray-500 dark:text-white-400 mt-1">Max 60 characters</span>
                                    </div>
                                </div>
                            </div>

                            {/* message Field */}
                            <div>
                                <label className="block font-medium mb-2 text-gray-800 dark:text-gray-200">
                                    <span role="img" aria-label="message">💬</span> message Field
                                </label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Label</label>
                                        <input
                                            type="text"
                                            value={contactFormConfig.fields.message.label}
                                            onChange={(e) => handleTextFieldChange('message', 'label', e.target.value)}
                                            className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            maxLength={20}
                                        />
                                        <span className="text-xs text-gray-500 dark:text-white-400 mt-1">Max 20 characters</span>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Placeholder</label>
                                        <input
                                            type="text"
                                            value={contactFormConfig.fields.message.placeholder}
                                            onChange={(e) => handleTextFieldChange('message', 'placeholder', e.target.value)}
                                            className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            maxLength={40}
                                        />
                                        <span className="text-xs text-gray-500 dark:text-white-400 mt-1">Max 40 characters</span>
                                    </div>
                                </div>
                                <div className="mt-2 hidden">
                                    <label className="flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={contactFormConfig.fields.message.required}
                                            onChange={(e) => handleTextFieldChange('message', 'required', e.target.checked)}
                                            className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
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
                                    value={contactFormConfig.submitButtonText}
                                    onChange={(e) => setContactFormConfig(prev => ({ ...prev, submitButtonText: e.target.value }))}
                                    className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 sm:px-4 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 dark:focus:border-blue-400 transition"
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
                                    value={contactFormConfig.successMessage}
                                    onChange={(e) => setContactFormConfig(prev => ({ ...prev, successMessage: e.target.value }))}
                                    className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 sm:px-4 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 dark:focus:border-blue-400 transition"
                                    placeholder="Enter success message"
                                    maxLength={100}
                                />
                                <span className="text-xs text-gray-500 dark:text-white-400 mt-1">Max 100 characters</span>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex flex-col gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={saveContactFormConfig}
                                    disabled={saveLoading}
                                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg py-3 font-semibold transition-colors duration-200 flex items-center justify-center"
                                >
                                    {saveLoading ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                            Saving...
                                        </>
                                    ) : (
                                        'Save Configuration'
                                    )}
                                </button>
                                <button
                                    type="button"
                                    onClick={resetToDefaults}
                                    className="w-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg py-3 font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors duration-200"
                                >
                                    Reset to Defaults
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Right Side - Chatbot Preview */}
                    <div className={`${activeMobileTab === 'preview' ? 'block' : 'hidden'} xl:block w-full xl:w-1/2 bg-white dark:bg-gray-800 rounded-lg p-4 sm:p-6 shadow-sm border border-gray-200 dark:border-gray-700`}>
                        <div className="flex items-center gap-2 mb-4 sm:mb-6">
                            <svg className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                            </svg>
                            <h2 className="font-semibold text-base sm:text-lg md:text-xl text-gray-900 dark:text-white">Chatbot Preview</h2>
                        </div>

                        {/* Chatbot Preview Component */}
                        <div className="flex justify-center">
                            <div className="w-full max-w-md">
                                <ChatbotPreview
                                    botName={botName}
                                    selectedTheme={selectedTheme}
                                    colorThemes={COLOR_THEMES}
                                    welcomeMessage={welcomeMessage}
                                    contactFormConfig={convertToPreviewConfig(contactFormConfig)}
                                    onContactFormSubmit={handleContactSubmit}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CustomizePage;
