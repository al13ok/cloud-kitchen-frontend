'use client';
import React, { useState, useEffect } from "react";
import ChatbotPreview from "@/components/chatbot-customization/ChatBotPreview";
import type { CustomerTicketFormConfig as PreviewCustomerTicketFormConfig } from "@/components/chatbot-customization/ChatBotPreview";

const CustomizeCustomerTicketForm = () => {
    const [activeMobileTab, setActiveMobileTab] = useState<'customize' | 'preview'>('customize');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    useEffect(() => {
        loadCustomerTicketFormConfig();
    }, []);

    const loadCustomerTicketFormConfig = async () => {
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/customize/admin/customize-customer-ticket-form?widget_id=Model`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                const config = await response.json();
                const mergedConfig = {
                    title: config.title || "Customer Support Ticket",
                    fields: {
                        id: {
                            label: config.fields?.id?.label || "Email Address",
                            placeholder: config.fields?.id?.placeholder || "your.email@example.com"
                        },
                        phone: {
                            label: config.fields?.phone?.label || "Phone Number",
                            placeholder: config.fields?.phone?.placeholder || "1234567890"
                        },
                        issueType: {
                            label: config.fields?.issueType?.label || "Issue Type",
                            options: config.fields?.issueType?.options || ["Technical", "Billing", "Account", "General"]
                        },
                        issue: {
                            label: config.fields?.issue?.label || "Issue",
                            options: config.fields?.issue?.options || ["Login Problem", "Payment Issue", "Feature Request", "Bug Report", "Other"]
                        },
                        message: {
                            label: config.fields?.message?.label || "Description",
                            placeholder: config.fields?.message?.placeholder || "Please describe your issue in detail..."
                        }
                    },
                    submitButtonText: config.submitButtonText || "Submit Ticket",
                    successMessage: config.successMessage || "Your ticket has been submitted! We'll get back to you within 24 hours."
                };
                setCustomerTicketFormConfig(mergedConfig);
            } else if (response.status === 404) {
                console.log('No existing configuration found, using defaults');
            } else {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
        } catch (error) {
            console.error('Error loading configuration:', error);
        }
    };

    const saveCustomerTicketFormConfig = async () => {
        setIsLoading(true);
        setError(null);
        setSuccessMessage(null);

        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/customize/admin/customize-customer-ticket-form?widget_id=Model`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(customerTicketFormConfig),
            });

            if (response.ok) {
                const result = await response.json();
                setSuccessMessage(result.message || 'Configuration saved successfully!');
                setTimeout(() => setSuccessMessage(null), 3000);
            } else {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Failed to save configuration');
            }
        } catch (error) {
            console.error('Error saving configuration:', error);
            setError(error instanceof Error ? error.message : 'Error saving configuration');
            setTimeout(() => setError(null), 5000);
        } finally {
            setIsLoading(false);
        }
    };

    const [customerTicketFormConfig, setCustomerTicketFormConfig] = useState({
        title: "Customer Support Ticket",
        fields: {
            id: { label: "Email Address", placeholder: "your.email@example.com" },
            phone: { label: "Phone Number", placeholder: "1234567890" },
            issueType: { label: "Issue Type", options: ["Technical", "Billing", "Account", "General"] },
            issue: { label: "Issue", options: ["Login Problem", "Payment Issue", "Feature Request", "Bug Report", "Other"] },
            message: { label: "Description", placeholder: "Please describe your issue in detail..." }
        },
        submitButtonText: "Submit Ticket",
        successMessage: "Your ticket has been submitted! We'll get back to you within 24 hours."
    });

    const botName = "Mobi.AI";
    const selectedTheme = "theme-1";
    const welcomeMessage = "Hello! I'm your AI assistant. How can I help you today?";

    const COLOR_THEMES = {
        "theme-1": {
            "color-1": "#6d6875",
            "color-2": "#b5838d",
            "color-3": "#e5989b",
            "color-4": "#ffb4a2",
            "color-5": "#ffcdb2"
        },
        "theme-2": {
            "color-1": "#dad7cd",
            "color-2": "#a3b18a",
            "color-3": "#588157",
            "color-4": "#3a5a40",
            "color-5": "#344e41"
        },
        "theme-3": {
            "color-1": "#22223b",
            "color-2": "#4a4e69",
            "color-3": "#9a8c98",
            "color-4": "#c9ada7",
            "color-5": "#f2e9e4"
        }
    };

    const handleFieldChange = (fieldKey: string, property: string, value: string | boolean) => {
        setCustomerTicketFormConfig(prev => ({
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

    const handleOptionChange = (fieldKey: string, index: number, value: string) => {
        setCustomerTicketFormConfig(prev => {
            const field = prev.fields[fieldKey as keyof typeof prev.fields] as { options: string[] };
            const newOptions = [...field.options];
            newOptions[index] = value;
            return {
                ...prev,
                fields: {
                    ...prev.fields,
                    [fieldKey]: {
                        ...field,
                        options: newOptions
                    }
                }
            };
        });
    };

    const addOption = (fieldKey: string) => {
        setCustomerTicketFormConfig(prev => {
            const field = prev.fields[fieldKey as keyof typeof prev.fields] as { options: string[] };
            return {
                ...prev,
                fields: {
                    ...prev.fields,
                    [fieldKey]: {
                        ...field,
                        options: [...field.options, ""]
                    }
                }
            };
        });
    };

    const removeOption = (fieldKey: string, index: number) => {
        setCustomerTicketFormConfig(prev => {
            const field = prev.fields[fieldKey as keyof typeof prev.fields] as { options: string[] };
            const newOptions = field.options.filter((_: string, i: number) => i !== index);
            return {
                ...prev,
                fields: {
                    ...prev.fields,
                    [fieldKey]: {
                        ...field,
                        options: newOptions
                    }
                }
            };
        });
    };

    const previewCustomerTicketConfig: PreviewCustomerTicketFormConfig = {
        title: customerTicketFormConfig.title,
        fields: {
            email: {
                label: customerTicketFormConfig.fields.id.label,
                placeholder: customerTicketFormConfig.fields.id.placeholder,
                required: true
            },
            phone: {
                label: customerTicketFormConfig.fields.phone.label,
                placeholder: customerTicketFormConfig.fields.phone.placeholder,
                required: true
            },
            issueType: {
                label: customerTicketFormConfig.fields.issueType.label,
                required: true,
                options: customerTicketFormConfig.fields.issueType.options
            },
            issue: {
                label: customerTicketFormConfig.fields.issue.label,
                required: true,
                options: customerTicketFormConfig.fields.issue.options
            },
            message: {
                label: customerTicketFormConfig.fields.message.label,
                placeholder: customerTicketFormConfig.fields.message.placeholder,
                required: true
            }
        },
        submitButtonText: customerTicketFormConfig.submitButtonText,
        successMessage: customerTicketFormConfig.successMessage
    };

    return (
        <>
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
            <div className="flex flex-col xl:flex-row w-full gap-4 sm:gap-6">
                <div className={`${activeMobileTab === 'customize' ? 'block' : 'hidden'} xl:block w-full lg:w-full bg-white dark:bg-gray-900 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700`}>
                    <div className="flex items-center gap-2 mb-6">
                        <svg className="w-6 h-6 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                        </svg>
                        <h2 className="font-semibold text-lg md:text-xl text-gray-900 dark:text-white">Customer Ticket Form Configuration</h2>
                    </div>
                    <div className="space-y-6 max-h-[70vh] md:max-h-[600px] overflow-y-auto">
                        <div>
                            <label className="block font-medium mb-2 text-gray-800 dark:text-gray-200">
                                <span role="img" aria-label="title">📝</span> Form Title
                            </label>
                            <input
                                type="text"
                                value={customerTicketFormConfig.title}
                                onChange={(e) => setCustomerTicketFormConfig(prev => ({ ...prev, title: e.target.value }))}
                                className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-4 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 dark:focus:border-blue-400 transition"
                                placeholder="Enter form title"
                            />
                        </div>
                        <div>
                            <label className="block font-medium mb-2 text-gray-800 dark:text-gray-200">
                                <span role="img" aria-label="email">📧</span> Email Field
                            </label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Label</label>
                                    <input
                                        type="text"
                                        value={customerTicketFormConfig.fields.id.label}
                                        onChange={(e) => handleFieldChange('id', 'label', e.target.value)}
                                        className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Placeholder</label>
                                    <input
                                        type="text"
                                        value={customerTicketFormConfig.fields.id.placeholder}
                                        onChange={(e) => handleFieldChange('id', 'placeholder', e.target.value)}
                                        className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>
                        </div>
                        <div>
                            <label className="block font-medium mb-2 text-gray-800 dark:text-gray-200">
                                <span role="img" aria-label="phone">📞</span> Phone Field
                            </label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Label</label>
                                    <input
                                        type="text"
                                        value={customerTicketFormConfig.fields.phone.label}
                                        onChange={(e) => handleFieldChange('phone', 'label', e.target.value)}
                                        className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Placeholder</label>
                                    <input
                                        type="text"
                                        value={customerTicketFormConfig.fields.phone.placeholder}
                                        onChange={(e) => handleFieldChange('phone', 'placeholder', e.target.value)}
                                        className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>
                            <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                                Phone numbers should accept 7-12 digits (numbers only)
                            </div>
                        </div>
                        <div>
                            <label className="block font-medium mb-2 text-gray-800 dark:text-gray-200">
                                <span role="img" aria-label="issue-type">🏷️</span> Issue Type Field
                            </label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Label</label>
                                    <input
                                        type="text"
                                        value={customerTicketFormConfig.fields.issueType.label}
                                        onChange={(e) => handleFieldChange('issueType', 'label', e.target.value)}
                                        className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>
                            <div className="mt-3">
                                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Options</label>
                                {customerTicketFormConfig.fields.issueType.options.map((option, index) => (
                                    <div key={index} className="flex items-center gap-2 mb-2">
                                        <input
                                            type="text"
                                            value={option}
                                            onChange={(e) => handleOptionChange('issueType', index, e.target.value)}
                                            className="flex-1 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                        <button
                                            onClick={() => removeOption('issueType', index)}
                                            disabled={customerTicketFormConfig.fields.issueType.options.length <= 1}
                                            className="px-3 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                ))}
                                <button
                                    onClick={() => addOption('issueType')}
                                    className="mt-2 px-4 py-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                >
                                    + Add Option
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className="block font-medium mb-2 text-gray-800 dark:text-gray-200">
                                <span role="img" aria-label="issue">🔧</span> Issue Field
                            </label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Label</label>
                                    <input
                                        type="text"
                                        value={customerTicketFormConfig.fields.issue.label}
                                        onChange={(e) => handleFieldChange('issue', 'label', e.target.value)}
                                        className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>
                            <div className="mt-3">
                                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Options</label>
                                {customerTicketFormConfig.fields.issue.options.map((option, index) => (
                                    <div key={index} className="flex items-center gap-2 mb-2">
                                        <input
                                            type="text"
                                            value={option}
                                            onChange={(e) => handleOptionChange('issue', index, e.target.value)}
                                            className="flex-1 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                        <button
                                            onClick={() => removeOption('issue', index)}
                                            disabled={customerTicketFormConfig.fields.issue.options.length <= 1}
                                            className="px-3 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                ))}
                                <button
                                    onClick={() => addOption('issue')}
                                    className="mt-2 px-4 py-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                >
                                    + Add Option
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className="block font-medium mb-2 text-gray-800 dark:text-gray-200">
                                <span role="img" aria-label="message">💬</span> Message Field
                            </label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Label</label>
                                    <input
                                        type="text"
                                        value={customerTicketFormConfig.fields.message.label}
                                        onChange={(e) => handleFieldChange('message', 'label', e.target.value)}
                                        className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Placeholder</label>
                                    <input
                                        type="text"
                                        value={customerTicketFormConfig.fields.message.placeholder}
                                        onChange={(e) => handleFieldChange('message', 'placeholder', e.target.value)}
                                        className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>
                        </div>
                        <div>
                            <label className="block font-medium mb-2 text-gray-800 dark:text-gray-200">
                                <span role="img" aria-label="submit">🚀</span> Submit Button Text
                            </label>
                            <input
                                type="text"
                                value={customerTicketFormConfig.submitButtonText}
                                onChange={(e) => setCustomerTicketFormConfig(prev => ({ ...prev, submitButtonText: e.target.value }))}
                                className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-4 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 dark:focus:border-blue-400 transition"
                                placeholder="Enter submit button text"
                            />
                        </div>
                        <div>
                            <label className="block font-medium mb-2 text-gray-800 dark:text-gray-200">
                                <span role="img" aria-label="success">✅</span> Success Message
                            </label>
                            <input
                                type="text"
                                value={customerTicketFormConfig.successMessage}
                                onChange={(e) => setCustomerTicketFormConfig(prev => ({ ...prev, successMessage: e.target.value }))}
                                className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-4 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 dark:focus:border-blue-400 transition"
                                placeholder="Enter success message"
                            />
                        </div>
                        {error && (
                            <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
                                {error}
                            </div>
                        )}
                        {successMessage && (
                            <div className="mt-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded-lg">
                                {successMessage}
                            </div>
                        )}
                        <div className="flex flex-col gap-3 pt-4">
                            <button
                                type="button"
                                onClick={saveCustomerTicketFormConfig}
                                disabled={isLoading}
                                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg py-3 font-semibold transition-colors duration-200"
                            >
                                {isLoading ? 'Saving...' : 'Save Configuration'}
                            </button>
                            <button
                                type="button"
                                onClick={loadCustomerTicketFormConfig}
                                className="w-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg py-3 font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors duration-200"
                            >
                                Reset to Defaults
                            </button>
                        </div>
                    </div>
                </div>
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
                                customerTicketFormConfig={previewCustomerTicketConfig}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default CustomizeCustomerTicketForm;