'use client';
import React, { useState, useEffect, useCallback } from "react";
import ChatbotPreview from "@/components/chatbot-customization/ChatBotPreview";
import { buildApiUrl } from '@/config/api';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Input from "@/components/form/input/InputField"
import Label from "@/components/form/Label"
import { Save, RefreshCw, CheckCircle2, XCircle, Plus } from "lucide-react"

export function JobCustomize() {
    // Mobile view toggle between Customize (form) and Preview panels
    const [activeMobileTab, setActiveMobileTab] = useState<'customize' | 'preview'>('customize');

    // Loading and error states
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // API data states
    const [isLoadingOptions, setIsLoadingOptions] = useState(false);

    // Job Application Form Configuration State
    const [jobApplicationFormConfig, setJobApplicationFormConfig] = useState({
        title: "Job Application",
        fields: {
            name: { label: "Full Name", placeholder: "Enter your full name", required: false },
            email: { label: "Email Address", placeholder: "your.email@example.com", required: false },
            phone: { label: "Phone Number", placeholder: "+1 (555) 123-4567", required: false },
            category: { label: "Job Category", required: false, options: [''] as string[] },
            experience: { label: "Experience Level", required: false, options: [''] as string[] },
            resume: { label: "Resume/CV", required: false, maxSize: 5, disabled: true }
        },
        submitButtonText: "Submit Application",
        successMessage: "Thank you for your application! We'll review it and get back to you soon."
    });

    // Chatbot Preview Configuration
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

    // Map options for preview component
    const previewConfig = React.useMemo(() => ({
        ...jobApplicationFormConfig,
        fields: {
            ...jobApplicationFormConfig.fields,
            category: {
                ...jobApplicationFormConfig.fields.category,
                options: jobApplicationFormConfig.fields.category.options
            },
            experience: {
                ...jobApplicationFormConfig.fields.experience,
                options: jobApplicationFormConfig.fields.experience.options
            }
        }
    }), [jobApplicationFormConfig]);

    const loadJobApplicationFormConfig = useCallback(async () => {
        setIsLoadingOptions(true);
        try {
            const response = await fetch(buildApiUrl('/customize/admin/customize-job-application-form?widget_id=Model'), {
                method: 'GET',
                headers: {
                    'accept': 'application/json',
                },
            });

            if (response.ok) {
                const config = await response.json();
                
                // Set the configuration exactly as received from the API
                setJobApplicationFormConfig({
                    title: config.title || "Job Application",
                    fields: {
                        name: {
                            label: config.fields?.name?.label || "Full Name",
                            placeholder: config.fields?.name?.placeholder || "Enter your full name",
                            required: config.fields?.name?.required || false
                        },
                        email: {
                            label: config.fields?.email?.label || "Email Address",
                            placeholder: config.fields?.email?.placeholder || "your.email@example.com",
                            required: config.fields?.email?.required || false
                        },
                        phone: {
                            label: config.fields?.phone?.label || "Phone Number",
                            placeholder: config.fields?.phone?.placeholder || "+1 (555) 123-4567",
                            required: config.fields?.phone?.required || false
                        },
                        category: {
                            label: config.fields?.category?.label || "Job Category",
                            required: config.fields?.category?.required || false,
                            options: config.fields?.category?.options?.length > 0 ? config.fields.category.options : ['']
                        },
                        experience: {
                            label: config.fields?.experience?.label || "Experience Level",
                            required: config.fields?.experience?.required || false,
                            options: config.fields?.experience?.options?.length > 0 ? config.fields.experience.options : ['']
                        },
                        resume: {
                            label: config.fields?.resume?.label || "Resume/CV",
                            required: config.fields?.resume?.required || false,
                            maxSize: config.fields?.resume?.maxSize || 5,
                            disabled: config.fields?.resume?.disabled !== undefined ? config.fields?.resume?.disabled : true
                        }
                    },
                    submitButtonText: config.submitButtonText || "Submit Application",
                    successMessage: config.successMessage || "Thank you for your application! We'll review it and get back to you soon."
                });
            } else if (response.status === 404) {
                console.log('No existing configuration found, using defaults');
            } else {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
        } catch (error) {
            console.error('Error loading configuration:', error);
            setError('Failed to load form configuration');
        } finally {
            setIsLoadingOptions(false);
        }
    }, []);

    // Load job application form configuration on component mount
    useEffect(() => {
        loadJobApplicationFormConfig();
    }, [loadJobApplicationFormConfig]);

    const saveJobApplicationFormConfig = async () => {
        setIsLoading(true);
        setError(null);
        setSuccessMessage(null);

        try {
            // Validate the configuration before sending
            if (!jobApplicationFormConfig.title || jobApplicationFormConfig.title.trim() === '') {
                throw new Error('Form title is required');
            }
            
            // Clean up the data before sending
            const cleanConfig = {
                title: jobApplicationFormConfig.title.trim(),
                fields: {
                    name: {
                        label: jobApplicationFormConfig.fields.name.label.trim(),
                        placeholder: jobApplicationFormConfig.fields.name.placeholder.trim(),
                        required: jobApplicationFormConfig.fields.name.required
                    },
                    email: {
                        label: jobApplicationFormConfig.fields.email.label.trim(),
                        placeholder: jobApplicationFormConfig.fields.email.placeholder.trim(),
                        required: jobApplicationFormConfig.fields.email.required
                    },
                    phone: {
                        label: jobApplicationFormConfig.fields.phone.label.trim(),
                        placeholder: jobApplicationFormConfig.fields.phone.placeholder.trim(),
                        required: jobApplicationFormConfig.fields.phone.required
                    },
                    category: {
                        label: jobApplicationFormConfig.fields.category.label.trim(),
                        required: jobApplicationFormConfig.fields.category.required,
                        options: jobApplicationFormConfig.fields.category.options.filter(opt => opt && opt.trim() !== '')
                    },
                    experience: {
                        label: jobApplicationFormConfig.fields.experience.label.trim(),
                        required: jobApplicationFormConfig.fields.experience.required,
                        options: jobApplicationFormConfig.fields.experience.options.filter(opt => opt && opt.trim() !== '')
                    },
                    resume: {
                        label: jobApplicationFormConfig.fields.resume.label.trim(),
                        required: jobApplicationFormConfig.fields.resume.required,
                        maxSize: jobApplicationFormConfig.fields.resume.maxSize,
                        disabled: jobApplicationFormConfig.fields.resume.disabled
                    }
                },
                submitButtonText: jobApplicationFormConfig.submitButtonText.trim(),
                successMessage: jobApplicationFormConfig.successMessage.trim()
            };
            
            // Make the API request
            const response = await fetch(buildApiUrl('/customize/admin/customize-job-application-form?widget_id=Model'), {
                method: 'PUT',
                headers: {
                    'accept': 'application/json',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(cleanConfig),
            });

            if (response.ok) {
                const result = await response.json();
                setSuccessMessage(result.message || 'Configuration saved successfully!');
                setTimeout(() => setSuccessMessage(null), 3000);
            } else {
                let errorMessage = 'Failed to save configuration';
                try {
                    const errorData = await response.json();
                    if (errorData.detail) {
                        errorMessage += `: ${errorData.detail}`;
                    }
                } catch (parseError) {
                    console.error('Could not parse error response:', parseError);
                }
                throw new Error(errorMessage);
            }
        } catch (error) {
            console.error('Error saving configuration:', error);
            setError(error instanceof Error ? error.message : 'Error saving configuration');
            setTimeout(() => setError(null), 5000);
        } finally {
            setIsLoading(false);
        }
    };

    // Handlers for job application form fields
    const handleJobFieldChange = (fieldKey: string, property: string, value: string | boolean | number) => {
        setJobApplicationFormConfig(prev => ({
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

    const handleJobOptionChange = (fieldKey: "category" | "experience", index: number, value: string) => {
        setJobApplicationFormConfig(prev => {
            const field = prev.fields[fieldKey];
            const newOptions = [...field.options];
            newOptions[index] = value;
            
            // Remove the option if it's empty and not the last one
            if (value.trim() === '' && newOptions.length > 1) {
                newOptions.splice(index, 1);
            }
            
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

    const addNewOption = (fieldKey: "category" | "experience") => {
        setJobApplicationFormConfig(prev => {
            const field = prev.fields[fieldKey];
            return {
                ...prev,
                fields: {
                    ...prev.fields,
                    [fieldKey]: {
                        ...field,
                        options: [...field.options, '']
                    }
                }
            };
        });
    };

    const removeOption = (fieldKey: "category" | "experience", index: number) => {
        setJobApplicationFormConfig(prev => {
            const field = prev.fields[fieldKey];
            const newOptions = [...field.options];
            newOptions.splice(index, 1);
            
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

    return (
        <div className="space-y-4 sm:space-y-6">
            {/* Error and Success Messages */}
            {error && (
                <div className="p-4 rounded-lg border bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800">
                    <div className="flex items-center gap-2">
                        <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                        <span className="text-sm font-medium text-red-800 dark:text-red-200">{error}</span>
                    </div>
                </div>
            )}
            {successMessage && (
                <div className="p-4 rounded-lg border bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                        <span className="text-sm font-medium text-green-800 dark:text-green-200">{successMessage}</span>
                    </div>
                </div>
            )}

            {/* Mobile toggle for Customize | Preview */}
            <div className="xl:hidden">
                <div className="border-b border-gray-200 dark:border-gray-700">
                    <nav className="-mb-px flex space-x-4 sm:space-x-8 overflow-x-auto" aria-label="Mobile Tabs">
                        <button
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

            {/* Main Content */}
            <div className="flex flex-col xl:flex-row w-full gap-4 sm:gap-6">
                {/* Left Side - Job Application Form Configuration */}
                <div className={`${activeMobileTab === 'customize' ? 'block' : 'hidden'} xl:block w-full xl:w-1/2`}>
                    <Card>
                        <CardHeader>
                            <CardTitle>Job Application Form Configuration</CardTitle>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Customize your job application form fields and labels
                            </p>
                        </CardHeader>
                        <CardContent className="space-y-6 max-h-[600px] overflow-y-auto">
                            {/* Form Title */}
                            <div className="space-y-2">
                                <Label>Form Title</Label>
                                <Input
                                    value={jobApplicationFormConfig.title}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setJobApplicationFormConfig(cfg => ({ ...cfg, title: e.target.value }))}
                                    maxLength={40}
                                />
                            </div>

                            {/* Name Field */}
                            <div className="border rounded-lg p-4 space-y-3">
                                <h4 className="font-semibold text-gray-700 dark:text-gray-300">Name Field</h4>
                                <div className="space-y-2">
                                    <Label>Label</Label>
                                    <Input
                                        value={jobApplicationFormConfig.fields.name.label}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleJobFieldChange('name', 'label', e.target.value)}
                                        maxLength={20}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Placeholder</Label>
                                    <Input
                                        value={jobApplicationFormConfig.fields.name.placeholder}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleJobFieldChange('name', 'placeholder', e.target.value)}
                                        maxLength={40}
                                    />
                                </div>
                            </div>

                            {/* Email Field */}
                            <div className="border rounded-lg p-4 space-y-3">
                                <h4 className="font-semibold text-gray-700 dark:text-gray-300">Email Field</h4>
                                <div className="space-y-2">
                                    <Label>Label</Label>
                                    <Input
                                        value={jobApplicationFormConfig.fields.email.label}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleJobFieldChange('email', 'label', e.target.value)}
                                        maxLength={20}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Placeholder</Label>
                                    <Input
                                        value={jobApplicationFormConfig.fields.email.placeholder}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleJobFieldChange('email', 'placeholder', e.target.value)}
                                        maxLength={40}
                                    />
                                </div>
                            </div>

                            {/* Phone Field */}
                            <div className="border rounded-lg p-4 space-y-3">
                                <h4 className="font-semibold text-gray-700 dark:text-gray-300">Phone Field</h4>
                                <div className="space-y-2">
                                    <Label>Label</Label>
                                    <Input
                                        value={jobApplicationFormConfig.fields.phone.label}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleJobFieldChange('phone', 'label', e.target.value)}
                                        maxLength={20}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Placeholder</Label>
                                    <Input
                                        value={jobApplicationFormConfig.fields.phone.placeholder}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleJobFieldChange('phone', 'placeholder', e.target.value)}
                                        maxLength={40}
                                    />
                                </div>
                            </div>

                            {/* Category Options */}
                            <div className="border rounded-lg p-4 space-y-3">
                                <h4 className="font-semibold text-gray-700 dark:text-gray-300">Category Options</h4>
                                <div className="space-y-2">
                                    <Label>Label</Label>
                                    <Input
                                        value={jobApplicationFormConfig.fields.category.label}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleJobFieldChange('category', 'label', e.target.value)}
                                        maxLength={20}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Options</Label>
                                    {isLoadingOptions ? (
                                        <div className="text-sm text-gray-500 dark:text-gray-400">Loading categories...</div>
                                    ) : (
                                        <>
                                            {jobApplicationFormConfig.fields.category.options.map((option, idx) => (
                                                <div key={idx} className="flex items-center gap-2">
                                                    <Input
                                                        value={option}
                                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleJobOptionChange('category', idx, e.target.value)}
                                                        maxLength={50}
                                                        placeholder="Enter category name"
                                                    />
                                                    {jobApplicationFormConfig.fields.category.options.length > 1 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => removeOption('category', idx)}
                                                            className="px-2 py-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                                                        >
                                                            ✕
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                            <button
                                                type="button"
                                                onClick={() => addNewOption('category')}
                                                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full text-sm font-medium transition-all duration-200 shadow-sm hover:shadow-md flex items-center justify-center gap-1.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                                aria-label="Add category"
                                            >
                                                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                                                Add Category
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Experience Options */}
                            <div className="border rounded-lg p-4 space-y-3">
                                <h4 className="font-semibold text-gray-700 dark:text-gray-300">Experience Options</h4>
                                <div className="space-y-2">
                                    <Label>Label</Label>
                                    <Input
                                        value={jobApplicationFormConfig.fields.experience.label}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleJobFieldChange('experience', 'label', e.target.value)}
                                        maxLength={20}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Options</Label>
                                    {isLoadingOptions ? (
                                        <div className="text-sm text-gray-500 dark:text-gray-400">Loading experiences...</div>
                                    ) : (
                                        <>
                                            {jobApplicationFormConfig.fields.experience.options.map((option, idx) => (
                                                <div key={idx} className="flex items-center gap-2">
                                                    <Input
                                                        value={option}
                                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleJobOptionChange('experience', idx, e.target.value)}
                                                        maxLength={50}
                                                        placeholder="Enter experience level"
                                                    />
                                                    {jobApplicationFormConfig.fields.experience.options.length > 1 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => removeOption('experience', idx)}
                                                            className="px-2 py-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                                                        >
                                                            ✕
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                            <button
                                                type="button"
                                                onClick={() => addNewOption('experience')}
                                                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full text-sm font-medium transition-all duration-200 shadow-sm hover:shadow-md flex items-center justify-center gap-1.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                                aria-label="Add experience level"
                                            >
                                                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                                                Add Experience Level
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Resume Upload */}
                            <div className="border rounded-lg p-4 space-y-3">
                                <h4 className="font-semibold text-gray-700 dark:text-gray-300">Resume Upload</h4>
                                <div className="space-y-2">
                                    <Label>Label</Label>
                                    <Input
                                        value={jobApplicationFormConfig.fields.resume.label}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleJobFieldChange('resume', 'label', e.target.value)}
                                        maxLength={20}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Max Size (MB)</Label>
                                    <Input
                                        type="number"
                                        value={jobApplicationFormConfig.fields.resume.maxSize}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleJobFieldChange('resume', 'maxSize', Number(e.target.value))}
                                        min="1"
                                        max="20"
                                    />
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    Resume upload is currently disabled in the preview.
                                </p>
                            </div>

                            {/* Submit Button Text */}
                            <div className="space-y-2">
                                <Label>Submit Button Text</Label>
                                <Input
                                    value={jobApplicationFormConfig.submitButtonText}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setJobApplicationFormConfig(cfg => ({ ...cfg, submitButtonText: e.target.value }))}
                                    maxLength={30}
                                />
                            </div>

                            {/* Success Message */}
                            <div className="space-y-2">
                                <Label>Success Message</Label>
                                <Input
                                    value={jobApplicationFormConfig.successMessage}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setJobApplicationFormConfig(cfg => ({ ...cfg, successMessage: e.target.value }))}
                                    maxLength={100}
                                />
                            </div>

                            {/* Action Buttons */}
                            <div className="flex flex-col gap-3 pt-4">
                                <button
                                    onClick={saveJobApplicationFormConfig}
                                    disabled={isLoading}
                                    className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-full text-sm font-medium transition-all duration-200 disabled:cursor-not-allowed shadow-sm hover:shadow-md flex items-center justify-center gap-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                    type="button"
                                    aria-label="Save configuration"
                                >
                                    <Save className="h-4 w-4" aria-hidden="true" />
                                    {isLoading ? 'Saving...' : 'Save Configuration'}
                                </button>
                                <button
                                    onClick={loadJobApplicationFormConfig}
                                    className="w-full px-4 py-2 border border-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-sm font-medium transition-all duration-200 shadow-sm hover:shadow-md flex items-center justify-center gap-2 focus:ring-2 focus:ring-gray-500 focus:outline-none"
                                    type="button"
                                    aria-label="Reset to defaults"
                                >
                                    <RefreshCw className="h-4 w-4" aria-hidden="true" />
                                    Reset to Defaults
                                </button>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Side - Chatbot Preview */}
                <div className={`${activeMobileTab === 'preview' ? 'block' : 'hidden'} xl:block w-full xl:w-1/2`}>
                    <Card>
                        <CardHeader>
                            <CardTitle>Chatbot Preview</CardTitle>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                See how your job application form will appear in the chatbot
                            </p>
                        </CardHeader>
                        <CardContent>
                            <div className="flex justify-center">
                                <ChatbotPreview
                                    botName={botName}
                                    selectedTheme={selectedTheme}
                                    colorThemes={COLOR_THEMES}
                                    welcomeMessage={welcomeMessage}
                                    jobApplicationFormConfig={previewConfig}
                                />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

export default JobCustomize;
