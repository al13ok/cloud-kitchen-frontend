"use client";
import React, { useState, useEffect } from "react";
import { FaRocket, FaCode, FaBuilding, FaBug, FaUser, FaSave, FaSpinner } from "react-icons/fa";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Modal } from "@/components/ui/modal";
import Alert from '@/components/ui/alert/Alert';
import { FaTimes, FaCalendarAlt } from "react-icons/fa";
import DatePicker from "@/components/ui/DatePicker";

// Employee interface for API response
interface Employee {
    emp_id: string;
    full_name: string;
    email: string;
    phone: string;
    department: string;
    created_at: string;
    id: string;
    number_of_orders: number;
}

// Project interface for software development company
interface Project {
    id: string;
    project_number: string;
    customer_id: string;
    customer_name: string;
    project_name: string;
    project_type: 'web_development' | 'mobile_app' | 'api_development' | 'maintenance' | 'consulting' | 'custom_software';
    status: 'planning' | 'in_progress' | 'testing' | 'completed' | 'on_hold' | 'cancelled';
    priority: 'low' | 'medium' | 'high' | 'urgent';
    description: string;
    technologies: string[];
    start_date: string;
    delivery_date: string;
    actual_delivery_date?: string;
    budget: number;
    paid_amount: number;
    remaining_amount: number;
    progress_percentage: number;
    team_members: string[];
    project_manager: string;
    created_at: string;
    updated_at: string;
    requirements_documents?: string[];
    demo_link?: string;
    repository_url?: string;
    client_feedback?: string;
    notes?: string;
}

// Form validation schema
const orderFormSchema = z.object({
    order_number: z.string()
        .min(1, "Project number is required")
        .max(50, "Project number must be less than 50 characters")
        .regex(/^[A-Z0-9\-_]+$/, "Project number can only contain uppercase letters, numbers, hyphens, and underscores"),
    project_name: z.string()
        .min(1, "Project name is required")
        .max(100, "Project name must be less than 100 characters")
        .regex(/^[a-zA-Z0-9\s\-_.,()]+$/, "Project name contains invalid characters"),
    project_type: z.enum(['web_development', 'mobile_app', 'api_development', 'maintenance', 'consulting', 'custom_software']),
    status: z.enum(['planning', 'in_progress', 'testing', 'completed', 'on_hold', 'cancelled']),
    priority: z.enum(['low', 'medium', 'high', 'urgent']),
    description: z.string()
        .min(10, "Description must be at least 10 characters")
        .max(1000, "Description must be less than 1000 characters")
        .regex(/^[a-zA-Z0-9\s\-_.,()!?@#$%&*+=<>:;'"\\/\[\]{}|`~]*$/, "Description contains invalid characters"),
    technologies: z.array(z.string()
        .min(1, "Technology name cannot be empty")
        .max(50, "Technology name must be less than 50 characters")
        .regex(/^[a-zA-Z0-9\s\-_.+#]+$/, "Technology name contains invalid characters")
    ).min(1, "At least one technology is required").max(20, "Maximum 20 technologies allowed"),
    start_date: z.string().min(1, "Start date is required"),
    delivery_date: z.string().min(1, "Delivery date is required"),
    budget: z.number()
        .min(1000, "Budget must be at least $1,000")
        .max(10000000, "Budget must be less than $10,000,000")
        .multipleOf(1, "Budget must be a whole number"),
    paid_amount: z.number()
        .min(0, "Paid amount cannot be negative")
        .max(10000000, "Paid amount must be less than $10,000,000")
        .multipleOf(0.01, "Paid amount must have at most 2 decimal places"),
    progress_percentage: z.number()
        .min(0, "Progress cannot be negative")
        .max(100, "Progress cannot exceed 100%")
        .multipleOf(0.1, "Progress must be in increments of 0.1%"),
    project_manager: z.string()
        .min(1, "Project manager email is required")
        .max(100, "Project manager email must be less than 100 characters")
        .email("Please enter a valid email address for project manager"),
    team_members: z.array(z.string()
        .min(1, "Team member email cannot be empty")
        .max(100, "Team member email must be less than 100 characters")
        .email("Please enter a valid email address for team member")
    ).min(1, "At least one team member is required").max(50, "Maximum 50 team members allowed"),
    requirements_documents: z.array(z.string()
        .url("Must be a valid URL")
        .max(500, "Document link must be less than 500 characters")
    ).max(10, "Maximum 10 document links allowed").optional(),
    demo_link: z.string()
        .url("Must be a valid URL")
        .max(500, "Demo link must be less than 500 characters")
        .optional()
        .or(z.literal("")),
    repository_url: z.string()
        .url("Must be a valid URL")
        .max(500, "Repository URL must be less than 500 characters")
        .optional()
        .or(z.literal("")),
    client_feedback: z.string()
        .max(2000, "Client feedback must be less than 2000 characters")
        .optional(),
    notes: z.string()
        .max(2000, "Notes must be less than 2000 characters")
        .optional()
});

type OrderFormType = z.infer<typeof orderFormSchema>;

interface OrderFormProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: OrderFormType) => void;
    order?: Project | null;
    customerId: string;
    customerName: string;
    isLoading?: boolean;
    existingOrderNumbers: string[];
}

const OrderForm: React.FC<OrderFormProps> = ({
    isOpen,
    onClose,
    onSubmit,
    order,
    customerId,
    customerName,
    isLoading = false,
    existingOrderNumbers
}) => {
    const [alert, setAlert] = useState<{ show: boolean; variant: 'success' | 'error'; title: string; message: string }>({ show: false, variant: 'success', title: '', message: '' });
    const [newTechnology, setNewTechnology] = useState('');
    const [newTeamMember, setNewTeamMember] = useState('');
    const [newDocumentLink, setNewDocumentLink] = useState('');
    const [orderNumberValue, setOrderNumberValue] = useState('');
    const [isStartDatePickerOpen, setIsStartDatePickerOpen] = useState(false);
    const [isDeliveryDatePickerOpen, setIsDeliveryDatePickerOpen] = useState(false);
    const [employeeEmails, setEmployeeEmails] = useState<string[]>([]);
    const [projectManagerSuggestions, setProjectManagerSuggestions] = useState<string[]>([]);
    const [teamMemberSuggestions, setTeamMemberSuggestions] = useState<string[]>([]);
    const [showProjectManagerSuggestions, setShowProjectManagerSuggestions] = useState(false);
    const [showTeamMemberSuggestions, setShowTeamMemberSuggestions] = useState(false);

    const isEditMode = !!order;

    // Fetch employee emails on component mount
    useEffect(() => {
        const fetchEmployeeEmails = async () => {
            try {
                const RAW_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";
                const BASE_URL = RAW_BASE_URL ? RAW_BASE_URL.replace(/\/+$/, '') : "";
                
                // First, get the total count to determine how many pages we need
                const initialResponse = await fetch(`${BASE_URL}/api/v1/employees/?page=1&size=10`);
                if (!initialResponse.ok) {
                    console.error('Failed to fetch initial employee data:', initialResponse.status, initialResponse.statusText);
                    return;
                }
                
                const initialData = await initialResponse.json();
                const totalRecords = initialData.total_records || 0;
                console.log('Total employees:', totalRecords);
                
                if (totalRecords === 0) {
                    console.log('No employees found');
                    return;
                }
                
                // Calculate how many pages we need to fetch all employees
                const recordsPerPage = 100; // Use a reasonable page size
                const totalPages = Math.ceil(totalRecords / recordsPerPage);
                
                let allEmails: string[] = [];
                
                // Fetch all pages
                for (let page = 1; page <= totalPages; page++) {
                    const response = await fetch(`${BASE_URL}/api/v1/employees/?page=${page}&size=${recordsPerPage}`);
                    if (response.ok) {
                        const data = await response.json();
                        const pageEmails = data.data?.map((emp: Employee) => emp.email).filter(Boolean) || [];
                        allEmails = [...allEmails, ...pageEmails];
                        console.log(`Fetched page ${page}/${totalPages}:`, pageEmails.length, 'emails');
                    } else {
                        console.error(`Failed to fetch page ${page}:`, response.status, response.statusText);
                    }
                }
                
                // Remove duplicates
                const uniqueEmails = [...new Set(allEmails)];
                console.log('All unique employee emails:', uniqueEmails);
                setEmployeeEmails(uniqueEmails);
                
            } catch (error) {
                console.error('Failed to fetch employee emails:', error);
            }
        };
        
        if (isOpen) {
            fetchEmployeeEmails();
        }
    }, [isOpen]);

    // Filter suggestions based on input
    const filterSuggestions = (input: string, suggestions: string[]) => {
        if (!input.trim()) return [];
        
        return suggestions
            .filter(email => email.toLowerCase().includes(input.toLowerCase()))
            .slice(0, 5); // Limit to 5 suggestions
    };

    // Handle project manager input change
    const handleProjectManagerChange = (value: string) => {
        console.log('Project manager change:', value);
        console.log('Available emails:', employeeEmails);
        setValue("project_manager", value);
        const filtered = filterSuggestions(value, employeeEmails);
        console.log('Filtered suggestions:', filtered);
        setProjectManagerSuggestions(filtered);
        setShowProjectManagerSuggestions(filtered.length > 0 && value.length > 0);
    };

    // Handle team member input change
    const handleTeamMemberChange = (value: string) => {
        setNewTeamMember(value);
        const filtered = filterSuggestions(value, employeeEmails);
        setTeamMemberSuggestions(filtered);
        setShowTeamMemberSuggestions(filtered.length > 0 && value.length > 0);
    };

    // Select suggestion
    const selectProjectManagerSuggestion = (email: string) => {
        setValue("project_manager", email);
        setShowProjectManagerSuggestions(false);
    };

    const selectTeamMemberSuggestion = (email: string) => {
        setNewTeamMember(email);
        setShowTeamMemberSuggestions(false);
    };

    // Close suggestions when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Element;
            if (!target.closest('.suggestion-dropdown')) {
                setShowProjectManagerSuggestions(false);
                setShowTeamMemberSuggestions(false);
            }
        };

        if (showProjectManagerSuggestions || showTeamMemberSuggestions) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showProjectManagerSuggestions, showTeamMemberSuggestions]);

    // Custom validation function for order number
    const validateOrderNumber = (value: string) => {
        if (!value) return true; // Let required validation handle empty values

        // Check if order number already exists (excluding current order when editing)
        const isDuplicate = existingOrderNumbers.some(existingNumber =>
            existingNumber.toLowerCase() === value.toLowerCase() &&
            (!isEditMode || existingNumber !== order?.project_number)
        );

        return !isDuplicate || "This order number is already in use. Please choose a different one.";
    };

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
        reset,
        setValue,
        watch,
        setError,
        clearErrors
    } = useForm<OrderFormType>({
        resolver: zodResolver(orderFormSchema),
        mode: "onChange",
        defaultValues: {
            order_number: "",
            project_name: "",
            project_type: "web_development",
            status: "planning",
            priority: "medium",
            description: "",
            technologies: [],
            start_date: "",
            delivery_date: "",
            budget: 10000,
            paid_amount: 0,
            progress_percentage: 0,
            project_manager: "",
            team_members: [],
            requirements_documents: [],
            demo_link: "",
            repository_url: "",
            client_feedback: "",
            notes: ""
        }
    });

    const watchedTechnologies = watch("technologies");
    const watchedTeamMembers = watch("team_members");
    const watchedDocumentLinks = watch("requirements_documents");
    const watchedStartDate = watch("start_date");
    const watchedDeliveryDate = watch("delivery_date");

    // Reset form when order changes or modal opens/closes
    useEffect(() => {
        if (isOpen) {
            if (order) {
                // Edit mode - populate form with existing data
                setOrderNumberValue(order.project_number);
                reset({
                    order_number: order.project_number,
                    project_name: order.project_name,
                    project_type: order.project_type,
                    status: order.status,
                    priority: order.priority,
                    description: order.description,
                    technologies: order.technologies,
                    start_date: order.start_date.split('T')[0], // Convert to YYYY-MM-DD format
                    delivery_date: order.delivery_date.split('T')[0],
                    budget: order.budget,
                    paid_amount: order.paid_amount,
                    progress_percentage: order.progress_percentage,
                    project_manager: order.project_manager,
                    team_members: order.team_members,
                    requirements_documents: order.requirements_documents || [],
                    demo_link: order.demo_link || "",
                    repository_url: order.repository_url || "",
                    client_feedback: order.client_feedback || "",
                    notes: order.notes || ""
                });
            } else {
                // Add mode - reset to defaults
                setOrderNumberValue("");
                reset({
                    order_number: "",
                    project_name: "",
                    project_type: "web_development",
                    status: "planning",
                    priority: "medium",
                    description: "",
                    technologies: [],
                    start_date: new Date().toISOString().split('T')[0],
                    delivery_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
                    budget: 10000,
                    paid_amount: 0,
                    progress_percentage: 0,
                    project_manager: "",
                    team_members: [],
                    requirements_documents: [],
                    demo_link: "",
                    repository_url: "",
                    client_feedback: "",
                    notes: ""
                });
            }
        }
    }, [isOpen, order, reset]);

    // Validate delivery date when start date changes
    useEffect(() => {
        if (watchedStartDate && watchedDeliveryDate) {
            if (new Date(watchedDeliveryDate) <= new Date(watchedStartDate)) {
                setError("delivery_date", { message: "Delivery date must be after start date" });
            } else {
                clearErrors("delivery_date");
            }
        }
    }, [watchedStartDate, watchedDeliveryDate, setError, clearErrors]);

    const getProjectTypeIcon = (type: Project['project_type']) => {
        switch (type) {
            case 'web_development': return <FaCode className="w-4 h-4" />;
            case 'mobile_app': return <FaRocket className="w-4 h-4" />;
            case 'api_development': return <FaBuilding className="w-4 h-4" />;
            case 'maintenance': return <FaBug className="w-4 h-4" />;
            case 'consulting': return <FaUser className="w-4 h-4" />;
            case 'custom_software': return <FaCode className="w-4 h-4" />;
            default: return <FaCode className="w-4 h-4" />;
        }
    };

    const addTechnology = () => {
        if (newTechnology.trim() && !watchedTechnologies.includes(newTechnology.trim())) {
            setValue("technologies", [...watchedTechnologies, newTechnology.trim()]);
            setNewTechnology('');
        }
    };

    const removeTechnology = (tech: string) => {
        setValue("technologies", watchedTechnologies.filter(t => t !== tech));
    };

    const addTeamMember = () => {
        const trimmedEmail = newTeamMember.trim();
        if (trimmedEmail && !watchedTeamMembers.includes(trimmedEmail)) {
            // Validate email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (emailRegex.test(trimmedEmail)) {
                setValue("team_members", [...watchedTeamMembers, trimmedEmail]);
                setNewTeamMember('');
            } else {
                setAlert({
                    show: true,
                    variant: 'error',
                    title: 'Invalid Email',
                    message: 'Please enter a valid email address for the team member.'
                });
                setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 3000);
            }
        }
    };

    const removeTeamMember = (member: string) => {
        setValue("team_members", watchedTeamMembers.filter(m => m !== member));
    };

    const addDocumentLink = () => {
        const trimmedLink = newDocumentLink.trim();
        if (trimmedLink && !watchedDocumentLinks?.includes(trimmedLink)) {
            // Validate URL format
            const urlRegex = /^https?:\/\/.+/;
            if (urlRegex.test(trimmedLink)) {
                setValue("requirements_documents", [...(watchedDocumentLinks || []), trimmedLink]);
                setNewDocumentLink('');
            } else {
                setAlert({
                    show: true,
                    variant: 'error',
                    title: 'Invalid URL',
                    message: 'Please enter a valid document URL (must start with http:// or https://).'
                });
                setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 3000);
            }
        }
    };

    const removeDocumentLink = (link: string) => {
        setValue("requirements_documents", watchedDocumentLinks?.filter(l => l !== link) || []);
    };

    const handleStartDateSelect = (date: string) => {
        setValue("start_date", date);
        // Removed automatic close - now only closes when Done button is clicked
    };

    const handleDeliveryDateSelect = (date: string) => {
        setValue("delivery_date", date);
        // Removed automatic close - now only closes when Done button is clicked
    };


    const formatDate = (dateString: string) => {
        if (!dateString) return "";
        const date = new Date(dateString);
        return date.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    };

    const handleFormSubmit = async (data: OrderFormType) => {
        try {
            // Clear any existing errors
            clearErrors();

            // Validate paid amount doesn't exceed budget
            if (data.paid_amount > data.budget) {
                setError("paid_amount", { message: "Paid amount cannot exceed budget" });
                return;
            }

            // Validate delivery date is after start date
            if (data.start_date && data.delivery_date && new Date(data.delivery_date) <= new Date(data.start_date)) {
                setError("delivery_date", { message: "Delivery date must be after start date" });
                return;
            }

            // Note: Removed past date validation for start date to allow selecting any date

            await onSubmit(data);
        } catch (error) {
            setAlert({ show: true, variant: 'error', title: 'Error', message: error instanceof Error ? error.message : 'An error occurred' });
            setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 3000);
        }
    };

    return (
        <>
            <Modal isOpen={isOpen} onClose={onClose}>
                <div className="relative overflow-hidden max-w-4xl w-full max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-2xl">
                    <div className="p-0">
                        {/* Header */}
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/25">
                                    {getProjectTypeIcon(watch("project_type"))}
                                </div>
                                <div>
                                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
                                        {isEditMode ? 'Edit Project' : 'Add New Project'}
                                    </h2>
                                    <p className="text-gray-600 dark:text-gray-400">
                                        {customerName} - {isEditMode ? order?.project_number : 'New Project'}
                                    </p>
                                </div>
                            </div>

                        </div>

                        {/* Form */}
                        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-8">
                            {/* Basic Information */}
                            <div className="border border-gray-200 dark:border-gray-600 rounded-2xl p-1 shadow-sm">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Basic Information</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Project Number *
                                        </label>
                                        <div className="relative">
                                            <input
                                                {...register("order_number", {
                                                    validate: validateOrderNumber
                                                })}
                                                value={orderNumberValue}
                                                onChange={(e) => {
                                                    setOrderNumberValue(e.target.value);
                                                    // Trigger validation on change
                                                    register("order_number", {
                                                        validate: validateOrderNumber
                                                    }).onChange(e);
                                                }}
                                                maxLength={50}
                                                className={`w-full px-4 py-3 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 shadow-sm ${orderNumberValue && validateOrderNumber(orderNumberValue) === true
                                                    ? 'border-green-300 dark:border-green-600 focus:ring-green-500'
                                                    : orderNumberValue && validateOrderNumber(orderNumberValue) !== true
                                                        ? 'border-red-300 dark:border-red-600 focus:ring-red-500'
                                                        : 'border-gray-400 dark:border-gray-500 focus:ring-blue-500'
                                                    }`}
                                                placeholder={`Enter project number (e.g., PROJ-${customerId || '001'}-001)`}
                                            />
                                            {orderNumberValue && validateOrderNumber(orderNumberValue) === true && (
                                                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                                                    <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                    </svg>
                                                </div>
                                            )}
                                            {orderNumberValue && validateOrderNumber(orderNumberValue) !== true && (
                                                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                                                    <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                                    </svg>
                                                </div>
                                            )}
                                        </div>
                                        {errors.order_number && (
                                            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.order_number.message}</p>
                                        )}
                                        {orderNumberValue && validateOrderNumber(orderNumberValue) === true && (
                                            <p className="mt-1 text-sm text-green-600 dark:text-green-400">✓ Project number is available</p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Project Name *
                                        </label>
                                        <input
                                            {...register("project_name")}
                                            maxLength={100}
                                            className="w-full px-4 py-3 border border-gray-400 dark:border-gray-500 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                                            placeholder="Enter project name (max 100 characters)"
                                        />
                                        {errors.project_name && (
                                            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.project_name.message}</p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Project Type *
                                        </label>
                                        <select
                                            {...register("project_type")}
                                            className="w-full px-4 py-3 border border-gray-400 dark:border-gray-500 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                                        >
                                            <option value="web_development">Web Development</option>
                                            <option value="mobile_app">Mobile App</option>
                                            <option value="api_development">API Development</option>
                                            <option value="maintenance">Maintenance</option>
                                            <option value="consulting">Consulting</option>
                                            <option value="custom_software">Custom Software</option>
                                        </select>
                                        {errors.project_type && (
                                            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.project_type.message}</p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Status *
                                        </label>
                                        <select
                                            {...register("status")}
                                            className="w-full px-4 py-3 border border-gray-400 dark:border-gray-500 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                                        >
                                            <option value="planning">Planning</option>
                                            <option value="in_progress">In Progress</option>
                                            <option value="testing">Testing</option>
                                            <option value="completed">Completed</option>
                                            <option value="on_hold">On Hold</option>
                                            <option value="cancelled">Cancelled</option>
                                        </select>
                                        {errors.status && (
                                            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.status.message}</p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Priority *
                                        </label>
                                        <select
                                            {...register("priority")}
                                            className="w-full px-4 py-3 border border-gray-400 dark:border-gray-500 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                                        >
                                            <option value="low">Low</option>
                                            <option value="medium">Medium</option>
                                            <option value="high">High</option>
                                            <option value="urgent">Urgent</option>
                                        </select>
                                        {errors.priority && (
                                            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.priority.message}</p>
                                        )}
                                    </div>
                                </div>

                                <div className="mt-6">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Description *
                                    </label>
                                    <div className="relative">
                                        <textarea
                                            {...register("description")}
                                            rows={4}
                                            maxLength={1000}
                                            className="w-full px-4 py-3 border border-gray-400 dark:border-gray-500 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                                            placeholder="Describe the project requirements and scope... (max 1000 characters)"
                                        />
                                        <div className="absolute bottom-2 right-2 text-xs text-gray-500 dark:text-gray-400">
                                            {watch("description")?.length || 0}/1000
                                        </div>
                                    </div>
                                    {errors.description && (
                                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.description.message}</p>
                                    )}
                                </div>
                            </div>

                            {/* Timeline */}
                            <div className="border border-gray-200 dark:border-gray-600 rounded-2xl p-1 shadow-sm">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Timeline</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Start Date *
                                        </label>
                                        <div
                                            className="flex items-center justify-between w-full px-4 py-3 border border-gray-400 dark:border-gray-500 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm cursor-pointer"
                                            onClick={() => setIsStartDatePickerOpen(true)}
                                        >
                                            <span className={watch("start_date") ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-gray-400"}>
                                                {watch("start_date") ? formatDate(watch("start_date")) : "Select start date"}
                                            </span>
                                            <FaCalendarAlt className="w-4 h-4 text-gray-400" />
                                        </div>
                                        {errors.start_date && (
                                            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.start_date.message}</p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Delivery Date *
                                        </label>
                                        <div
                                            className="flex items-center justify-between w-full px-4 py-3 border border-gray-400 dark:border-gray-500 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm cursor-pointer"
                                            onClick={() => setIsDeliveryDatePickerOpen(true)}
                                        >
                                            <span className={watch("delivery_date") ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-gray-400"}>
                                                {watch("delivery_date") ? formatDate(watch("delivery_date")) : "Select delivery date"}
                                            </span>
                                            <FaCalendarAlt className="w-4 h-4 text-gray-400" />
                                        </div>
                                        {errors.delivery_date && (
                                            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.delivery_date.message}</p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Financial Information */}
                            <div className="border border-gray-200 dark:border-gray-600 rounded-2xl p-1 shadow-sm">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Financial Information</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Budget ($) *
                                        </label>
                                        <input
                                            {...register("budget", { valueAsNumber: true })}
                                            type="number"
                                            min="1000"
                                            max="10000000"
                                            step="1"
                                            className="w-full px-4 py-3 border border-gray-400 dark:border-gray-500 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                                            placeholder="10000"
                                        />
                                        {errors.budget && (
                                            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.budget.message}</p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Paid Amount ($)
                                        </label>
                                        <input
                                            {...register("paid_amount", { valueAsNumber: true })}
                                            type="number"
                                            min="0"
                                            max="10000000"
                                            step="0.01"
                                            className="w-full px-4 py-3 border border-gray-400 dark:border-gray-500 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                                            placeholder="0"
                                        />
                                        {errors.paid_amount && (
                                            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.paid_amount.message}</p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Progress(%)
                                        </label>
                                        <div className="relative">
                                            <input
                                                {...register("progress_percentage", { valueAsNumber: true })}
                                                type="number"
                                                min="0"
                                                max="100"
                                                step="0.1"
                                                className="w-full px-4 py-3 border border-gray-400 dark:border-gray-500 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                                                placeholder="0"
                                            />
                                            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                                <span className="text-gray-500 dark:text-gray-400 text-sm">%</span>
                                            </div>
                                        </div>
                                        {errors.progress_percentage && (
                                            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.progress_percentage.message}</p>
                                        )}
                                        {/* Progress Bar Visual Indicator */}
                                        <div className="mt-2">
                                            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                                                <span>0%</span>
                                                <span className="font-medium">{watch("progress_percentage") || 0}%</span>
                                                <span>100%</span>
                                            </div>
                                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                                <div
                                                    className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all duration-300 ease-out"
                                                    style={{ width: `${Math.min(Math.max(watch("progress_percentage") || 0, 0), 100)}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Team Information */}
                            <div className="border border-gray-200 dark:border-gray-600 rounded-2xl p-1 shadow-sm">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Team Information</h3>
                                <div className="space-y-6">
                                    <div className="relative">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Project Manager Email *
                                        </label>
                                        <input
                                            type="email"
                                            maxLength={100}
                                            value={watch("project_manager") || ""}
                                            onChange={(e) => handleProjectManagerChange(e.target.value)}
                                            onFocus={() => {
                                                const value = watch("project_manager") || "";
                                                if (value) {
                                                    const filtered = filterSuggestions(value, employeeEmails);
                                                    setProjectManagerSuggestions(filtered);
                                                    setShowProjectManagerSuggestions(filtered.length > 0);
                                                }
                                            }}
                                            onBlur={() => {
                                                // Delay hiding suggestions to allow clicking on them
                                                setTimeout(() => setShowProjectManagerSuggestions(false), 200);
                                            }}
                                            className="w-full px-4 py-3 border border-gray-400 dark:border-gray-500 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                                            placeholder="Enter project manager email (e.g., john.doe@company.com)"
                                        />
                                        
                                        {/* Debug info */}
                                        {process.env.NODE_ENV === 'development' && (
                                            <div className="text-xs text-gray-500 mt-1">
                                                Debug: {employeeEmails.length} emails loaded, {projectManagerSuggestions.length} suggestions, show: {showProjectManagerSuggestions ? 'yes' : 'no'}
                                                {employeeEmails.length > 0 && (
                                                    <div className="mt-1">
                                                        Sample emails: {employeeEmails.slice(0, 3).join(', ')}
                                                        {employeeEmails.length > 3 && '...'}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        
                                        {/* Project Manager Suggestions Dropdown */}
                                        {showProjectManagerSuggestions && projectManagerSuggestions.length > 0 && (
                                            <div className="suggestion-dropdown absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                                {projectManagerSuggestions.map((email, index) => (
                                                    <div
                                                        key={index}
                                                        className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-sm text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                                                        onClick={() => selectProjectManagerSuggestion(email)}
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                                            </svg>
                                                            <span className="truncate">{email}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        
                                        {errors.project_manager && (
                                            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.project_manager.message}</p>
                                        )}
                                        {!errors.project_manager && watch("project_manager") && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(watch("project_manager")) && (
                                            <p className="mt-1 text-sm text-red-600 dark:text-red-400">Please enter a valid email address</p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Team Member Emails *
                                        </label>
                                        <div className="space-y-3">
                                            <div className="flex gap-2 w-full relative">
                                                <div className="flex-1 min-w-0 relative">
                                                    <input
                                                        value={newTeamMember}
                                                        onChange={(e) => handleTeamMemberChange(e.target.value)}
                                                        type="email"
                                                        maxLength={100}
                                                        onFocus={() => {
                                                            if (newTeamMember) {
                                                                const filtered = filterSuggestions(newTeamMember, employeeEmails);
                                                                setTeamMemberSuggestions(filtered);
                                                                setShowTeamMemberSuggestions(filtered.length > 0);
                                                            }
                                                        }}
                                                        onBlur={() => {
                                                            // Delay hiding suggestions to allow clicking on them
                                                            setTimeout(() => setShowTeamMemberSuggestions(false), 200);
                                                        }}
                                                        className={`w-full px-4 py-3 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm ${newTeamMember && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newTeamMember)
                                                            ? 'border-red-500 dark:border-red-500'
                                                            : 'border-gray-400 dark:border-gray-500'
                                                            }`}
                                                        placeholder="Add team member email (e.g., jane.smith@company.com)"
                                                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTeamMember())}
                                                    />
                                                    
                                                    {/* Team Member Suggestions Dropdown */}
                                                    {showTeamMemberSuggestions && teamMemberSuggestions.length > 0 && (
                                                        <div className="suggestion-dropdown absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                                            {teamMemberSuggestions.map((email, index) => (
                                                                <div
                                                                    key={index}
                                                                    className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-sm text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                                                                    onClick={() => selectTeamMemberSuggestion(email)}
                                                                >
                                                                    <div className="flex items-center gap-2">
                                                                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                                                        </svg>
                                                                        <span className="truncate">{email}</span>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={addTeamMember}
                                                    className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors flex-shrink-0"
                                                >
                                                    Add
                                                </button>
                                            </div>
                                            {newTeamMember && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newTeamMember) && (
                                                <p className="text-xs text-red-600 dark:text-red-400">
                                                    Please enter a valid email address
                                                </p>
                                            )}
                                            <div className="flex flex-wrap gap-2 w-full">
                                                {watchedTeamMembers.map((member, index) => (
                                                    <span
                                                        key={index}
                                                        className="inline-flex items-center gap-2 px-3 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-sm rounded-lg max-w-full"
                                                    >
                                                        <span className="truncate max-w-48" title={member}>
                                                            {member}
                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={() => removeTeamMember(member)}
                                                            className="text-blue-500 hover:text-blue-700 flex-shrink-0 ml-1"
                                                            title="Remove team member"
                                                        >
                                                            ×
                                                        </button>
                                                    </span>
                                                ))}
                                            </div>
                                            {errors.team_members && (
                                                <p className="text-sm text-red-600 dark:text-red-400">{errors.team_members.message}</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Technologies */}
                            <div className="border border-gray-200 dark:border-gray-600 rounded-2xl p-1 shadow-sm">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Technologies</h3>
                                <div className="space-y-4">
                                    <div className="flex gap-2">
                                        <input
                                            value={newTechnology}
                                            onChange={(e) => setNewTechnology(e.target.value)}
                                            maxLength={50}
                                            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            placeholder="Add technology (max 50 characters)"
                                            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTechnology())}
                                        />
                                        <button
                                            type="button"
                                            onClick={addTechnology}
                                            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                                        >
                                            Add
                                        </button>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {watchedTechnologies.map((tech, index) => (
                                            <span
                                                key={index}
                                                className="inline-flex items-center gap-2 px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-sm rounded-full"
                                            >
                                                {tech}
                                                <button
                                                    type="button"
                                                    onClick={() => removeTechnology(tech)}
                                                    className="text-green-500 hover:text-green-700"
                                                >
                                                    ×
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                    {errors.technologies && (
                                        <p className="text-sm text-red-600 dark:text-red-400">{errors.technologies.message}</p>
                                    )}
                                </div>
                            </div>

                            {/* Additional Information */}
                            <div className="border border-gray-200 dark:border-gray-600 rounded-2xl p-1 shadow-sm">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Additional Information</h3>
                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Demo Link
                                        </label>
                                        <input
                                            {...register("demo_link")}
                                            type="url"
                                            className="w-full px-4 py-3 border border-gray-400 dark:border-gray-500 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                                            placeholder="https://demo.example.com"
                                        />
                                        {errors.demo_link && (
                                            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.demo_link.message}</p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Repository URL
                                        </label>
                                        <input
                                            {...register("repository_url")}
                                            type="url"
                                            className="w-full px-4 py-3 border border-gray-400 dark:border-gray-500 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                                            placeholder="https://github.com/company/project"
                                        />
                                        {errors.repository_url && (
                                            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.repository_url.message}</p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Requirements Documents
                                        </label>
                                        <div className="space-y-2">
                                            <div className="flex gap-2">
                                                <input
                                                    value={newDocumentLink}
                                                    onChange={(e) => setNewDocumentLink(e.target.value)}
                                                    type="url"
                                                    maxLength={500}
                                                    className={`flex-1 px-4 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${newDocumentLink && !/^https?:\/\/.+/.test(newDocumentLink)
                                                        ? 'border-red-500 dark:border-red-500'
                                                        : 'border-gray-300 dark:border-gray-600'
                                                        }`}
                                                    placeholder="Add document link (e.g., https://docs.company.com/requirements.pdf)"
                                                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addDocumentLink())}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={addDocumentLink}
                                                    className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors"
                                                >
                                                    Add
                                                </button>
                                            </div>
                                            {newDocumentLink && !/^https?:\/\/.+/.test(newDocumentLink) && (
                                                <p className="text-xs text-red-600 dark:text-red-400">
                                                    Please enter a valid URL (must start with http:// or https://)
                                                </p>
                                            )}
                                            <div className="flex flex-wrap gap-2">
                                                {watchedDocumentLinks?.map((link, index) => (
                                                    <span
                                                        key={index}
                                                        className="inline-flex items-center gap-2 px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 text-sm rounded-full"
                                                    >
                                                        <a
                                                            href={link}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="hover:underline truncate max-w-48"
                                                            title={link}
                                                        >
                                                            {link.length > 50 ? `${link.substring(0, 50)}...` : link}
                                                        </a>
                                                        <button
                                                            type="button"
                                                            onClick={() => removeDocumentLink(link)}
                                                            className="text-purple-500 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300"
                                                        >
                                                            <FaTimes className="w-3 h-3" />
                                                        </button>
                                                    </span>
                                                ))}
                                            </div>
                                            {errors.requirements_documents && (
                                                <p className="text-sm text-red-600 dark:text-red-400">{errors.requirements_documents.message}</p>
                                            )}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Client Feedback
                                        </label>
                                        <textarea
                                            {...register("client_feedback")}
                                            rows={3}
                                            maxLength={2000}
                                            className="w-full px-4 py-3 border border-gray-400 dark:border-gray-500 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                                            placeholder="Client feedback and comments... (max 2000 characters)"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Notes
                                        </label>
                                        <textarea
                                            {...register("notes")}
                                            rows={3}
                                            maxLength={2000}
                                            className="w-full px-4 py-3 border border-gray-400 dark:border-gray-500 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                                            placeholder="Internal notes and observations... (max 2000 characters)"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="border border-gray-200 dark:border-gray-600 rounded-2xl p-1 shadow-sm">
                                <div className="flex justify-end gap-4">
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="px-8 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors duration-200"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting || isLoading}
                                        className="px-8 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                    >
                                        {isSubmitting || isLoading ? (
                                            <>
                                                <FaSpinner className="w-4 h-4 animate-spin" />
                                                {isEditMode ? 'Updating...' : 'Creating...'}
                                            </>
                                        ) : (
                                            <>
                                                <FaSave className="w-4 h-4" />
                                                {isEditMode ? 'Update Project' : 'Create Project'}
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </form>

                        {/* Alert */}
                        {alert.show && (
                            <Alert
                                variant={alert.variant}
                                title={alert.title}
                                message={alert.message}
                                showCloseButton={true}
                                onClose={() => setAlert(prev => ({ ...prev, show: false }))}
                            />
                        )}
                    </div>
                </div>

                {/* Date Picker Components */}
                <DatePicker
                    isOpen={isStartDatePickerOpen}
                    onClose={() => setIsStartDatePickerOpen(false)}
                    onDateSelect={handleStartDateSelect}
                    selectedDate={watch("start_date")}
                    title="Select Start Date"
                />

                <DatePicker
                    isOpen={isDeliveryDatePickerOpen}
                    onClose={() => setIsDeliveryDatePickerOpen(false)}
                    onDateSelect={handleDeliveryDateSelect}
                    selectedDate={watch("delivery_date")}
                    minDate={watch("start_date") || new Date().toISOString().split('T')[0]}
                    title="Select Delivery Date"
                />
            </Modal>
        </>
    );
};

export default OrderForm;


