'use client';
import React, { useState, useEffect, useCallback } from "react";
// import { useRouter } from "next/navigation";
import ChatbotPreview from "@/components/chatbot-customization/ChatBotPreview";

import { buildApiUrl } from '@/config/api';

const CustomizePage = () => {
    // const router = useRouter();

    

    // Mobile view toggle between Customize (form) and Preview panels
    const [activeMobileTab, setActiveMobileTab] = useState<'customize' | 'preview'>('customize');

    // Loading and error states
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // API data states - removed categories and experiences from external APIs
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

    // (moved below after function declarations)

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
            console.log('Loading job application form configuration...');
            const response = await fetch(buildApiUrl('/customize/admin/customize-job-application-form?widget_id=Model'), {
                method: 'GET',
                headers: {
                    'accept': 'application/json',
                },
            });

            if (response.ok) {
                const config = await response.json();
                console.log('Received configuration:', config);
                
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
    }, [loadJobApplicationFormConfig]); // Added loadJobApplicationFormConfig to dependency array

    const saveJobApplicationFormConfig = async () => {
        setIsLoading(true);
        setError(null);
        setSuccessMessage(null);

        try {
            // Validate the configuration before sending
            if (!jobApplicationFormConfig.title || jobApplicationFormConfig.title.trim() === '') {
                throw new Error('Form title is required');
            }
            
            // Clean up the data before sending - ensure options are arrays of strings
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
            
            console.log('Sending form configuration:', cleanConfig);
            
            // Make the API request
            const response = await fetch(buildApiUrl('/customize/admin/customize-job-application-form?widget_id=Model'), {
                method: 'PUT',
                headers: {
                    'accept': 'application/json',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(cleanConfig),
            });
            
            console.log('Response status:', response.status);

            if (response.ok) {
                const result = await response.json();
                console.log('Success response:', result);
                setSuccessMessage(result.message || 'Configuration saved successfully!');
                setTimeout(() => setSuccessMessage(null), 3000);
            } else {
                let errorMessage = 'Failed to save configuration';
                try {
                    const errorData = await response.json();
                    console.log('Error response:', errorData);
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
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <div className="p-4 sm:p-6 pb-20 max-w-7xl mx-auto">
                
                

                {/* Mobile toggle for Customize | Preview (hidden on xl+) */}
                <div className="-mt-2 mb-4 xl:hidden">
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
                                <div className="flex items-center gap-2">
                                    <span>Customize</span>
                                </div>
                            </button>
                            <button
                                onClick={() => setActiveMobileTab('preview')}
                                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors duration-200 whitespace-nowrap ${
                                    activeMobileTab === 'preview'
                                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                                }`}
                            >
                                <div className="flex items-center gap-2">
                                    <span>Preview</span>
                                </div>
                            </button>
                        </nav>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex flex-col xl:flex-row w-full gap-4 sm:gap-6">

                {/* Left Side - Job Application Form Configuration */}
                <div className={`${activeMobileTab === 'customize' ? 'block' : 'hidden'} xl:block w-full lg:w-full bg-white dark:bg-gray-900 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700`}>
                    <div className="flex items-center gap-2 mb-6">
                        <svg className="w-6 h-6 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                        </svg>
                        <h2 className="font-semibold text-lg md:text-xl text-gray-900 dark:text-white">Job Application Form Configuration</h2>
                    </div>

                    <div className="space-y-6 max-h-[600px] overflow-y-auto">
                        {/* Form Title */}
                        <div>
                            <label className="block font-medium mb-2 text-gray-800 dark:text-gray-200">
                                <span role="img" aria-label="title">📝</span> Form Title
                            </label>
                            <input
                                type="text"
                                value={jobApplicationFormConfig.title}
                                onChange={e => setJobApplicationFormConfig(cfg => ({ ...cfg, title: e.target.value }))}
                                className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-4 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 dark:focus:border-blue-400 transition"
                                maxLength={40}
                            />
                        </div>

                        {/* Name Field */}
                        <div className="border rounded p-3 mb-2">
                            <h4 className="font-semibold text-gray-700 mb-2">Name Field</h4>
                            <div className="flex flex-col sm:flex-row gap-2 mb-2">
                                <input
                                    type="text"
                                    value={jobApplicationFormConfig.fields.name.label}
                                    onChange={e => handleJobFieldChange('name', 'label', e.target.value)}
                                    className="flex-1 px-2 py-1 border border-gray-300 rounded"
                                    maxLength={20}
                                    placeholder="Label"
                                />
                                <input
                                    type="text"
                                    value={jobApplicationFormConfig.fields.name.placeholder}
                                    onChange={e => handleJobFieldChange('name', 'placeholder', e.target.value)}
                                    className="flex-1 px-2 py-1 border border-gray-300 rounded"
                                    maxLength={40}
                                    placeholder="Placeholder"
                                />
                                <label className="items-center hidden">
                                    <input
                                        type="checkbox"
                                        checked={jobApplicationFormConfig.fields.name.required}
                                        onChange={e => handleJobFieldChange('name', 'required', e.target.checked)}
                                        className="h-4 w-4 ml-2"
                                    />
                                    <span className="ml-1 text-xs">Required</span>
                                </label>
                            </div>
                        </div>

                        {/* Email Field */}
                        <div className="border rounded p-3 mb-2">
                            <h4 className="font-semibold text-gray-700 mb-2">Email Field</h4>
                            <div className="flex flex-col sm:flex-row gap-2 mb-2">
                                <input
                                    type="text"
                                    value={jobApplicationFormConfig.fields.email.label}
                                    onChange={e => handleJobFieldChange('email', 'label', e.target.value)}
                                    className="flex-1 px-2 py-1 border border-gray-300 rounded"
                                    maxLength={20}
                                    placeholder="Label"
                                />
                                <input
                                    type="text"
                                    value={jobApplicationFormConfig.fields.email.placeholder}
                                    onChange={e => handleJobFieldChange('email', 'placeholder', e.target.value)}
                                    className="flex-1 px-2 py-1 border border-gray-300 rounded"
                                    maxLength={40}
                                    placeholder="Placeholder"
                                />
                                <label className=" items-center hidden">
                                    <input
                                        type="checkbox"
                                        checked={jobApplicationFormConfig.fields.email.required}
                                        onChange={e => handleJobFieldChange('email', 'required', e.target.checked)}
                                        className="h-4 w-4 ml-2"
                                    />
                                    <span className="ml-1 text-xs">Required</span>
                                </label>
                            </div>
                        </div>

                        {/* Phone Field */}
                        <div className="border rounded p-3 mb-2">
                            <h4 className="font-semibold text-gray-700 mb-2">Phone Field</h4>
                            <div className="flex flex-col sm:flex-row gap-2 mb-2">
                                <input
                                    type="text"
                                    value={jobApplicationFormConfig.fields.phone.label}
                                    onChange={e => handleJobFieldChange('phone', 'label', e.target.value)}
                                    className="flex-1 px-2 py-1 border border-gray-300 rounded"
                                    maxLength={20}
                                    placeholder="Label"
                                />
                                <input
                                    type="text"
                                    value={jobApplicationFormConfig.fields.phone.placeholder}
                                    onChange={e => handleJobFieldChange('phone', 'placeholder', e.target.value)}
                                    className="flex-1 px-2 py-1 border border-gray-300 rounded"
                                    maxLength={40}
                                    placeholder="Placeholder"
                                />
                                <label className=" items-center hidden">
                                    <input
                                        type="checkbox"
                                        checked={jobApplicationFormConfig.fields.phone.required}
                                        onChange={e => handleJobFieldChange('phone', 'required', e.target.checked)}
                                        className="h-4 w-4 ml-2"
                                    />
                                    <span className="ml-1 text-xs">Required</span>
                                </label>
                            </div>
                        </div>

                        {/* Category Options Configuration */}
                        <div className="border rounded p-3 mb-2">
                            <h4 className="font-semibold text-gray-700 mb-2">Category Options</h4>
                            <div className="flex flex-col sm:flex-row gap-2 mb-2">
                                <input
                                    type="text"
                                    value={jobApplicationFormConfig.fields.category.label}
                                    onChange={e => handleJobFieldChange('category', 'label', e.target.value)}
                                    className="flex-1 px-2 py-1 border border-gray-300 rounded"
                                    maxLength={20}
                                    placeholder="Label"
                                />
                                <label className=" items-center hidden">
                                    <input
                                        type="checkbox"
                                        checked={jobApplicationFormConfig.fields.category.required}
                                        onChange={e => handleJobFieldChange('category', 'required', e.target.checked)}
                                        className="h-4 w-4 ml-2"
                                    />
                                    <span className="ml-1 text-xs">Required</span>
                                </label>
                            </div>
                            <div className="mb-2">
                                <label className="block text-xs font-medium mb-1">Options</label>
                                {isLoadingOptions ? (
                                    <div className="text-sm text-gray-500">Loading categories...</div>
                                ) : (
                                    <>
                                        {jobApplicationFormConfig.fields.category.options.map((option, idx) => (
                                            <div key={idx} className="flex items-center gap-2 mb-1">
                                                <input
                                                    type="text"
                                                    value={option}
                                                    onChange={e => handleJobOptionChange('category', idx, e.target.value)}
                                                    className="flex-1 px-2 py-1 border border-gray-300 rounded"
                                                    maxLength={50}
                                                    placeholder="Enter category name"
                                                />
                                                {jobApplicationFormConfig.fields.category.options.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => removeOption('category', idx)}
                                                        className="px-2 py-1 text-red-600 hover:text-red-800"
                                                    >
                                                        ✕
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                        <button
                                            type="button"
                                            onClick={() => addNewOption('category')}
                                            className="text-sm text-blue-600 hover:text-blue-800"
                                        >
                                            + Add Category
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Experience Options Configuration */}
                        <div className="border rounded p-3 mb-2">
                            <h4 className="font-semibold text-gray-700 mb-2">Experience Options</h4>
                            <div className="flex flex-col sm:flex-row gap-2 mb-2">
                                <input
                                    type="text"
                                    value={jobApplicationFormConfig.fields.experience.label}
                                    onChange={e => handleJobFieldChange('experience', 'label', e.target.value)}
                                    className="flex-1 px-2 py-1 border border-gray-300 rounded"
                                    maxLength={20}
                                    placeholder="Label"
                                />
                                <label className=" items-center hidden">
                                    <input
                                        type="checkbox"
                                        checked={jobApplicationFormConfig.fields.experience.required}
                                        onChange={e => handleJobFieldChange('experience', 'required', e.target.checked)}
                                        className="h-4 w-4 ml-2"
                                    />
                                    <span className="ml-1 text-xs">Required</span>
                                </label>
                            </div>
                            <div className="mb-2">
                                <label className="block text-xs font-medium mb-1">Options</label>
                                {isLoadingOptions ? (
                                    <div className="text-sm text-gray-500">Loading experiences...</div>
                                ) : (
                                    <>
                                        {jobApplicationFormConfig.fields.experience.options.map((option, idx) => (
                                            <div key={idx} className="flex items-center gap-2 mb-1">
                                                <input
                                                    type="text"
                                                    value={option}
                                                    onChange={e => handleJobOptionChange('experience', idx, e.target.value)}
                                                    className="flex-1 px-2 py-1 border border-gray-300 rounded"
                                                    maxLength={50}
                                                    placeholder="Enter experience level"
                                                />
                                                {jobApplicationFormConfig.fields.experience.options.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => removeOption('experience', idx)}
                                                        className="px-2 py-1 text-red-600 hover:text-red-800"
                                                    >
                                                        ✕
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                        <button
                                            type="button"
                                            onClick={() => addNewOption('experience')}
                                            className="text-sm text-blue-600 hover:text-blue-800"
                                        >
                                            + Add Experience Level
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Resume Upload Configuration */}
                        <div className="border rounded p-3 mb-2">
                            <h4 className="font-semibold text-gray-700 mb-2">Resume Upload</h4>
                            <div className="flex flex-col sm:flex-row gap-2 mb-2">
                                <input
                                    type="text"
                                    value={jobApplicationFormConfig.fields.resume.label}
                                    onChange={e => handleJobFieldChange('resume', 'label', e.target.value)}
                                    className="flex-1 px-2 py-1 border border-gray-300 rounded"
                                    maxLength={20}
                                    placeholder="Label"
                                />
                                <label className="items-center hidden">
                                    <input
                                        type="checkbox"
                                        checked={jobApplicationFormConfig.fields.resume.required}
                                        onChange={e => handleJobFieldChange('resume', 'required', e.target.checked)}
                                        className="h-4 w-4 ml-2"
                                    />
                                    <span className="ml-1 text-xs">Required</span>
                                </label>
                                <input
                                    type="number"
                                    value={jobApplicationFormConfig.fields.resume.maxSize}
                                    onChange={e => handleJobFieldChange('resume', 'maxSize', Number(e.target.value))}
                                    className="w-24 px-2 py-1 border border-gray-300 rounded"
                                    min={1}
                                    max={20}
                                    placeholder="Max MB"
                                />
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    Resume upload is currently disabled in the preview.
                                </p>
                            </div>
                        </div>

                        {/* Submit Button Text */}
                        <div>
                            <label className="block font-medium mb-2 text-gray-800 dark:text-gray-200">
                                <span role="img" aria-label="submit">🚀</span> Submit Button Text
                            </label>
                            <input
                                type="text"
                                value={jobApplicationFormConfig.submitButtonText}
                                onChange={e => setJobApplicationFormConfig(cfg => ({ ...cfg, submitButtonText: e.target.value }))}
                                className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-4 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 dark:focus:border-blue-400 transition"
                                maxLength={30}
                            />
                        </div>
                        {/* Success Message */}
                        <div>
                            <label className="block font-medium mb-2 text-gray-800 dark:text-gray-200">
                                <span role="img" aria-label="success">✅</span> Success Message
                            </label>
                            <input
                                type="text"
                                value={jobApplicationFormConfig.successMessage}
                                onChange={e => setJobApplicationFormConfig(cfg => ({ ...cfg, successMessage: e.target.value }))}
                                className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-4 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 dark:focus:border-blue-400 transition"
                                maxLength={100}
                            />
                        </div>
                        {/* Error and Success Messages */}
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

                        {/* Action Buttons */}
                        <div className="flex flex-col gap-3 pt-4">  
                            <button
                                type="button"
                                onClick={saveJobApplicationFormConfig}
                                disabled={isLoading}
                                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg py-3 font-semibold transition-colors duration-200"
                            >
                                {isLoading ? 'Saving...' : 'Save Configuration'}
                            </button>
                            <button
                                type="button"
                                onClick={loadJobApplicationFormConfig}
                                className="w-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg py-3 font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors duration-200"
                            >
                                Reset to Defaults
                            </button>
                        </div>
                    </div>
                </div>


                {/* Right Side - Chatbot Preview with Job Application Form */}
                <div className={`${activeMobileTab === 'preview' ? 'block' : 'hidden'} xl:block w-full lg:w-full bg-white dark:bg-gray-900 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700`}>
                    <div className="flex items-center gap-2 mb-6">
                        <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                        </svg>
                        <h2 className="font-semibold text-lg md:text-xl text-gray-900 dark:text-white">Chatbot Preview</h2>
                    </div>

                    {/* Chatbot Preview Component */}
                    <div className="flex justify-center">
                        <ChatbotPreview
                            botName={botName}
                            selectedTheme={selectedTheme}
                            colorThemes={COLOR_THEMES}
                            welcomeMessage={welcomeMessage}
                            jobApplicationFormConfig={previewConfig}
                        />
                    </div>
                </div>
            </div>
        </div>
      </div>
    // </div>
  );
};

export default CustomizePage;
