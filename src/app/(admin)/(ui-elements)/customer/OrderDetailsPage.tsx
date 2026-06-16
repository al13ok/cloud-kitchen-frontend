"use client";
import React, { useState, useEffect, useCallback } from "react";
import { FaArrowLeft, FaSearch, FaDownload, FaPlus, FaEdit, FaTrash, FaEye, FaCode, FaBug, FaRocket, FaTimesCircle, FaUser, FaBuilding, FaTag, FaTable, FaTh, FaCalendar, FaSync, FaChevronLeft, FaChevronRight, FaUpload, FaFileExcel, FaDollarSign, FaCreditCard } from "react-icons/fa";
import { Modal } from "@/components/ui/modal";
import Loader from "@/components/Loader";
import Alert from '@/components/ui/alert/Alert';
import OrderForm from './OrderForm';
import * as XLSX from 'xlsx';
import { useSidebar } from "@/context/SidebarContext";
import { useAuth } from "@/hooks/useAuth";
import AppSidebar from "@/layout/AppSidebar";
import AppHeader from "@/layout/AppHeader";
import Backdrop from "@/layout/Backdrop";
import DashboardHeader from "@/components/header/DashboardHeader";
import BillingHistory from "@/components/project/BillingHistory";
import PaymentForm from "@/components/project/PaymentForm";
import PaymentDetailsForm from "@/components/project/PaymentDetailsForm";

// Payment History interface
interface PaymentHistory {
  _id?: string;
  payment_id: string;
  amount: number;
  currency: string;
  payment_method: string;
  payment_date: string;
  transaction_id?: string;
  invoice_number?: string;
  invoice_url?: string;
  receipt_url?: string;
  status: 'completed' | 'pending' | 'failed' | 'refunded';
  notes?: string;
  created_at?: string;
}

type ProjectStatus = 'planning' | 'in_progress' | 'testing' | 'completed' | 'on_hold' | 'cancelled';
type ProjectPriority = 'low' | 'medium' | 'high' | 'urgent';

const PROJECT_STATUS_ORDER: ProjectStatus[] = [
    'planning',
    'in_progress',
    'testing',
    'completed',
    'on_hold',
    'cancelled',
];

const PROJECT_PRIORITY_ORDER: ProjectPriority[] = ['urgent', 'high', 'medium', 'low'];

// Project interface for software development company
interface Project {
    id: string;
    project_number: string;
    customer_id: string;
    customer_name: string;
    project_name: string;
    project_type: 'web_development' | 'mobile_app' | 'api_development' | 'maintenance' | 'consulting' | 'custom_software';
    status: ProjectStatus;
    priority: ProjectPriority;
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

// API Response interface
interface ProjectsApiResponse {
    page: number;
    size: number;
    total_records: number;
    total_pages: number;
    data: ProjectApiData[];
}

// API Project data interface (matches the API response format)
interface ProjectApiData {
    project_number: string;
    project_name: string;
    project_type: string;
    status: string;
    priority: string;
    description: string;
    technologies: string;
    start_date: string;
    delivery_date: string;
    budget: number;
    paid_amount: number;
    progress_percentage: number;
    project_manager: string;
    team_members: string;
    requirements_documents: string;
    demo_link: string;
    repository_url: string;
    client_feedback: string;
    notes: string;
    created_at: string;
}

// Create Project API Response interface
interface CreateProjectApiResponse {
    message: string;
    project_id: string;
    data: ProjectApiData;
}

// Project Form Data interface
interface ProjectFormData {
    project_number?: string;
    project_name: string;
    project_type: Project['project_type'] | string;
    status: Project['status'] | string;
    priority: Project['priority'] | string;
    description: string;
    technologies: string[] | string;
    start_date: string | Date;
    delivery_date: string | Date;
    budget: number;
    paid_amount: number;
    progress_percentage: number;
    project_manager: string;
    team_members: string[] | string;
    requirements_documents?: string[] | string;
    demo_link?: string;
    repository_url?: string;
    client_feedback?: string;
    notes?: string;
    created_at?: string;
}

const EmbeddedAdminChrome = ({ children }: { children: React.ReactNode }) => {
    const { isExpanded, isHovered, isMobileOpen } = useSidebar();
    const { isLoading } = useAuth();

    const mainContentMargin = isMobileOpen
        ? "ml-0"
        : isExpanded || isHovered
            ? "lg:ml-[290px]"
            : "lg:ml-[90px]";

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-white dark:bg-gray-900">
                <div className="h-10 w-10 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen xl:flex bg-gray-50 dark:bg-gray-900">
            <AppSidebar />
            <Backdrop />
            <div
                className={`flex-1 transition-all duration-300 ease-in-out ${mainContentMargin} overflow-hidden`}
            >
                <AppHeader />
                <div className="min-h-screen pb-40 lg:pb-48">
                    {children}
                </div>
            </div>
        </div>
    );
};



// Convert API data to Project interface
function convertApiDataToProject(apiData: ProjectApiData, customerId: string, customerName: string): Project {
    return {
        id: apiData.project_number, // Use project_number as id
        project_number: apiData.project_number,
        customer_id: customerId,
        customer_name: customerName,
        project_name: apiData.project_name,
        project_type: apiData.project_type as Project['project_type'],
        status: apiData.status as Project['status'],
        priority: apiData.priority as Project['priority'],
        description: apiData.description,
        technologies: apiData.technologies ? apiData.technologies.split(',').map(tech => tech.trim()) : [],
        start_date: new Date(apiData.start_date).toISOString(),
        delivery_date: new Date(apiData.delivery_date).toISOString(),
        actual_delivery_date: undefined,
        budget: apiData.budget,
        paid_amount: apiData.paid_amount,
        remaining_amount: apiData.budget - apiData.paid_amount,
        progress_percentage: apiData.progress_percentage,
        team_members: apiData.team_members ? apiData.team_members.split(',').map(member => member.trim()) : [],
        project_manager: apiData.project_manager,
        created_at: new Date(apiData.created_at).toISOString(),
        updated_at: new Date(apiData.created_at).toISOString(),
        requirements_documents: apiData.requirements_documents ? apiData.requirements_documents.split(',').map(doc => doc.trim()) : [],
        demo_link: apiData.demo_link || undefined,
        repository_url: apiData.repository_url || undefined,
        client_feedback: apiData.client_feedback || undefined,
        notes: apiData.notes || undefined
    };
}

// Project Details Modal Component
const ProjectDetailsModal = ({ project, isOpen, onClose }: { project: Project | null; isOpen: boolean; onClose: () => void }) => {
    const [showBillingHistory, setShowBillingHistory] = useState(false);
    const [showPaymentForm, setShowPaymentForm] = useState(false);
    const [showPaymentDetailsForm, setShowPaymentDetailsForm] = useState(false);
    const [selectedPayment, setSelectedPayment] = useState<PaymentHistory | null>(null);
    const [refreshBilling, setRefreshBilling] = useState(0);

    if (!project) return null;

    const handleAddPayment = () => {
        setSelectedPayment(null);
        setShowPaymentForm(true);
    };

    const handleEditPayment = (payment: PaymentHistory) => {
        setSelectedPayment(payment);
        setShowPaymentForm(true);
    };

    const handlePaymentSuccess = () => {
        setRefreshBilling(prev => prev + 1);
        setShowPaymentForm(false);
        setSelectedPayment(null);
    };

    const handlePaymentDetailsSuccess = () => {
        setShowPaymentDetailsForm(false);
    };

    return (
        <>
        <Modal isOpen={isOpen} onClose={onClose}>
            <div className="relative overflow-hidden w-full max-w-7xl mx-2 sm:mx-4 max-h-[95vh] overflow-y-auto bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-2xl p-4 sm:p-6 lg:p-8 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-gray-100 dark:scrollbar-track-gray-800 hover:scrollbar-thumb-gray-400 dark:hover:scrollbar-thumb-gray-500" style={{ scrollbarWidth: 'thin', scrollbarColor: '#d1d5db #f3f4f6' }}>
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-6 sm:mb-8 gap-4">
                        <div className="min-w-0 flex-1">
                            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mb-2 break-words leading-tight">
                                {project.project_name}
                            </h2>
                            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 break-words">
                                {project.project_number}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 flex-shrink-0 self-start sm:self-auto"
                        >
                            <FaTimesCircle className="w-5 h-5 sm:w-6 sm:h-6" />
                        </button>
                    </div>

                    {/* Order Details Grid */}
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
                        {/* Left Column */}
                        <div className="space-y-4 sm:space-y-6">
                            {/* Project Information */}
                            <div className="border border-gray-200 dark:border-gray-600 rounded-2xl p-4 sm:p-6 shadow-sm">
                                <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">Project Information</h3>
                                <div className="space-y-3">
                                    <div>
                                        <span className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">Description</span>
                                        <p className="text-sm sm:text-base text-gray-900 dark:text-white mt-1 break-words leading-relaxed">
                                            {project.description}
                                        </p>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                        <div>
                                            <span className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">Type</span>
                                            <p className="text-sm sm:text-base text-gray-900 dark:text-white break-words">
                                                {project.project_type.replace('_', ' ').toUpperCase()}
                                            </p>
                                        </div>
                                        <div>
                                            <span className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">Priority</span>
                                            <p className="text-sm sm:text-base text-gray-900 dark:text-white break-words">
                                                {project.priority.toUpperCase()}
                                            </p>
                                        </div>
                                    </div>
                                    <div>
                                        <span className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">Technology Stack</span>
                                        <div className="flex flex-wrap gap-2 mt-1">
                                            {project.technologies.map((tech, index) => (
                                                <span key={index} className="px-2 py-1 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 text-blue-700 dark:text-blue-400 text-xs font-medium rounded-full border border-blue-200 dark:border-blue-800">
                                                    {tech}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Team Information */}
                            <div className="border border-gray-200 dark:border-gray-600 rounded-2xl p-4 sm:p-6 shadow-sm">
                                <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">Team Information</h3>
                                <div className="space-y-3">
                                    <div>
                                        <span className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">Project Manager</span>
                                        <p className="text-sm sm:text-base text-gray-900 dark:text-white break-words">
                                            {project.project_manager}
                                        </p>
                                    </div>
                                    <div>
                                        <span className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">Team Members</span>
                                        <div className="flex flex-wrap gap-2 mt-1">
                                            {project.team_members.map((member, index) => (
                                                <span key={index} className="px-2 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 text-xs font-medium rounded-full break-words">
                                                    {member}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Column */}
                        <div className="space-y-4 sm:space-y-6">
                            {/* Financial Information */}
                            <div className="border border-gray-200 dark:border-gray-600 rounded-2xl p-4 sm:p-6 shadow-sm">
                                <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">Financial Information</h3>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">Total Budget</span>
                                        <span className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white break-words">
                                            ${project.budget.toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">Paid Amount</span>
                                        <span className="text-base sm:text-lg font-semibold text-green-600 dark:text-green-400 break-words">
                                            ${project.paid_amount.toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">Remaining</span>
                                        <span className="text-base sm:text-lg font-semibold text-orange-600 dark:text-orange-400 break-words">
                                            ${project.remaining_amount.toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Timeline */}
                            <div className="border border-gray-200 dark:border-gray-600 rounded-2xl p-4 sm:p-6 shadow-sm">
                                <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">Timeline</h3>
                                <div className="space-y-3">
                                    <div>
                                        <span className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">Start Date</span>
                                        <p className="text-sm sm:text-base text-gray-900 dark:text-white break-words">
                                            {new Date(project.start_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                                        </p>
                                    </div>
                                    <div>
                                        <span className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">Expected Delivery</span>
                                        <p className="text-sm sm:text-base text-gray-900 dark:text-white break-words">
                                            {new Date(project.delivery_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                                        </p>
                                    </div>
                                    {project.actual_delivery_date && (
                                        <div>
                                            <span className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">Actual Delivery</span>
                                            <p className="text-sm sm:text-base text-gray-900 dark:text-white break-words">
                                                {new Date(project.actual_delivery_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Links */}
                            <div className="border border-gray-200 dark:border-gray-600 rounded-2xl p-4 sm:p-6 shadow-sm">
                                <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">Project Links</h3>
                                <div className="space-y-3">
                                    {project.demo_link && (
                                        <div>
                                            <span className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">Demo Link</span>
                                            <a 
                                                href={project.demo_link} 
                                                target="_blank" 
                                                rel="noopener noreferrer" 
                                                className="text-blue-600 dark:text-blue-400 hover:underline block mt-1 text-sm sm:text-base break-all"
                                            >
                                                {project.demo_link}
                                            </a>
                                        </div>
                                    )}
                                    {project.repository_url && (
                                        <div>
                                            <span className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">Repository</span>
                                            <a 
                                                href={project.repository_url} 
                                                target="_blank" 
                                                rel="noopener noreferrer" 
                                                className="text-blue-600 dark:text-blue-400 hover:underline block mt-1 text-sm sm:text-base break-all"
                                            >
                                                {project.repository_url}
                                            </a>
                                        </div>
                                    )}
                                    {project.requirements_documents && project.requirements_documents.length > 0 && (
                                        <div>
                                            <span className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">Requirements Documents</span>
                                            <div className="mt-1 space-y-1">
                                                {project.requirements_documents.map((doc, index) => (
                                                    <a 
                                                        key={index}
                                                        href={doc} 
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-blue-600 dark:text-blue-400 hover:underline block text-sm sm:text-base break-all"
                                                    >
                                                        {doc.length > 60 ? `${doc.substring(0, 60)}...` : doc}
                                                    </a>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Client Feedback */}
                    {project.client_feedback && (
                        <div className="mt-6 sm:mt-8 border border-gray-200 dark:border-gray-600 rounded-2xl p-4 sm:p-6 shadow-sm">
                            <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">Client Feedback</h3>
                    <p className="text-sm sm:text-base text-gray-900 dark:text-white italic break-words leading-relaxed">
                                {project.client_feedback}
                            </p>
                        </div>
                    )}

                    {/* Billing History Section */}
                    <div className="mt-6 sm:mt-8 border border-gray-200 dark:border-gray-600 rounded-2xl p-4 sm:p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <FaDollarSign className="w-5 h-5 text-blue-600" />
                                <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                                    Billing History
                                </h3>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setShowPaymentDetailsForm(true)}
                                    className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                                >
                                    <FaCreditCard className="w-4 h-4" />
                                    Payment Details
                                </button>
                                <button
                                    onClick={() => setShowBillingHistory(!showBillingHistory)}
                                    className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                                >
                                    {showBillingHistory ? 'Hide' : 'View'} History
                                </button>
                            </div>
                        </div>

                        {showBillingHistory && (
                            <div className="mt-4">
                                <BillingHistory
                                    key={refreshBilling}
                                    projectId={project.id}
                                    projectNumber={project.project_number}
                                    customerId={project.customer_id}
                                    customerName={project.customer_name}
                                    onAddPayment={handleAddPayment}
                                    onEditPayment={handleEditPayment}
                                />
                            </div>
                        )}
                    </div>
            </div>
        </Modal>

        {/* Payment Form Modal */}
        <PaymentForm
            isOpen={showPaymentForm}
            onClose={() => {
                setShowPaymentForm(false);
                setSelectedPayment(null);
            }}
            projectId={project.id}
            projectNumber={project.project_number}
            customerId={project.customer_id}
            customerName={project.customer_name}
            customerEmail={project.customer_name} // Pass customer email (customer_name is actually the email)
            payment={selectedPayment}
            onSuccess={handlePaymentSuccess}
        />

        {/* Payment Details Form Modal */}
        <PaymentDetailsForm
            isOpen={showPaymentDetailsForm}
            onClose={() => setShowPaymentDetailsForm(false)}
            projectId={project.id}
            projectNumber={project.project_number}
            customerId={project.customer_id}
            customerName={project.customer_name}
            onSuccess={handlePaymentDetailsSuccess}
        />
        </>
    );
};

// Main Project Details Page Component
interface ProjectDetailsPageProps {
    customerId: string;
    customerName: string;
    projectCount: number;
    onBack: () => void;
}

export default function ProjectDetailsPage({ customerId, customerName, projectCount, onBack }: ProjectDetailsPageProps) {
    const [projects, setProjects] = useState<Project[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<Project['status'] | 'all'>('all');
    const [priorityFilter, setPriorityFilter] = useState<Project['priority'] | 'all'>('all');
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const [showProjectModal, setShowProjectModal] = useState(false);
    const [showProjectForm, setShowProjectForm] = useState(false);
    const [editingProject, setEditingProject] = useState<Project | null>(null);
    const [isFormLoading, setIsFormLoading] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<{ show: boolean; project: Project | null }>({ show: false, project: null });
    const [isDeleting, setIsDeleting] = useState(false);
    const [showProgressUpdate, setShowProgressUpdate] = useState<{ show: boolean; project: Project | null }>({ show: false, project: null });
    const [newProgress, setNewProgress] = useState(0);
    const [alert, setAlert] = useState<{ show: boolean; variant: 'success' | 'error'; title: string; message: string }>({ show: false, variant: 'success', title: '', message: '' });
    const [currentView, setCurrentView] = useState<'table' | 'kanban' | 'priority' | 'timeline'>('table');
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [draggedProject, setDraggedProject] = useState<Project | null>(null);
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
    const [dragOverStatus, setDragOverStatus] = useState<ProjectStatus | null>(null);
    const [isUpdatingPriority, setIsUpdatingPriority] = useState(false);
    const [dragOverPriority, setDragOverPriority] = useState<ProjectPriority | null>(null);
    
    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalRecords, setTotalRecords] = useState(0);
    const [totalPages, setTotalPages] = useState(0);

    // prevent unused prop warning
    void projectCount;

    // Fetch projects from API
    const fetchProjects = useCallback(async (page: number = 1, size: number = 10) => {
        setIsLoading(true);
        try {
            // customerName is now actually the customer email
            const customerEmail = customerName;
            
            const RAW_BASE_URL = process.env.NEXT_PUBLIC_API_URL;
            if (!RAW_BASE_URL) {
                throw new Error('NEXT_PUBLIC_API_URL environment variable is not set');
            }
            const BASE_URL = RAW_BASE_URL.replace(/\/+$/, '');
            const response = await fetch(`${BASE_URL}/api/v1/projects/?customer_email=${encodeURIComponent(customerEmail)}&page=${page}&size=${size}`, {
                method: 'GET',
                headers: {
                    'accept': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const apiResponse: ProjectsApiResponse = await response.json();
            
            // Convert API data to Project interface
            const convertedProjects = apiResponse.data.map(apiData => 
                convertApiDataToProject(apiData, customerId, customerName)
            );
            
            setProjects(convertedProjects);
            setTotalRecords(apiResponse.total_records);
            setTotalPages(apiResponse.total_pages);
            setCurrentPage(apiResponse.page);
            
        } catch (error) {
            console.error('Error fetching projects:', error);
            // On error, do not show an alert or fallback data; just indicate no projects
            setProjects([]);
            setTotalRecords(0);
            setTotalPages(0);
            setCurrentPage(1);
        } finally {
            setIsLoading(false);
        }
    }, [customerId, customerName]);

    // Fetch projects on component mount and when page changes
    useEffect(() => {
        fetchProjects(currentPage, pageSize);
    }, [fetchProjects, currentPage, pageSize]);

    // Add global scrollbar styling for the page
    useEffect(() => {
        const styleId = 'project-details-global-scrollbar';
        if (document.getElementById(styleId)) return;
        
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            /* Global scrollbar for Project Details page */
            .project-details-page-container {
                scrollbar-width: thin !important;
                scrollbar-color: #d1d5db #f3f4f6 !important;
                overflow-y: auto !important;
            }
            .project-details-page-container::-webkit-scrollbar {
                width: 10px !important;
                display: block !important;
            }
            .project-details-page-container::-webkit-scrollbar-track {
                background: #f3f4f6 !important;
            }
            .project-details-page-container::-webkit-scrollbar-thumb {
                background-color: #d1d5db !important;
                border-radius: 5px !important;
            }
            .project-details-page-container::-webkit-scrollbar-thumb:hover {
                background-color: #9ca3af !important;
            }
            /* Dark mode scrollbar */
            .dark .project-details-page-container {
                scrollbar-color: #4b5563 #1f2937 !important;
            }
            .dark .project-details-page-container::-webkit-scrollbar-track {
                background: #1f2937 !important;
            }
            .dark .project-details-page-container::-webkit-scrollbar-thumb {
                background-color: #4b5563 !important;
            }
            .dark .project-details-page-container::-webkit-scrollbar-thumb:hover {
                background-color: #6b7280 !important;
            }
        `;
        document.head.appendChild(style);
        
        return () => {
            const existingStyle = document.getElementById(styleId);
            if (existingStyle) {
                existingStyle.remove();
            }
        };
    }, []);

    // Filter projects based on search and filters
    const filteredProjects = projects.filter(project => {
        const matchesSearch = searchQuery === '' || 
            project.project_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            project.project_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
            project.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
            project.technologies.some(tech => tech.toLowerCase().includes(searchQuery.toLowerCase()));
        
        const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
        const matchesPriority = priorityFilter === 'all' || project.priority === priorityFilter;
        
        return matchesSearch && matchesStatus && matchesPriority;
    });

    const buildProjectPayload = (project: Project) => ({
        project_number: project.project_number,
        project_name: project.project_name,
        project_type: project.project_type,
        status: project.status,
        priority: project.priority,
        description: project.description,
        technologies: project.technologies.join(', '),
        start_date: project.start_date,
        delivery_date: project.delivery_date,
        budget: project.budget,
        paid_amount: project.paid_amount,
        progress_percentage: project.progress_percentage,
        project_manager: project.project_manager,
        team_members: project.team_members.join(', '),
        requirements_documents: project.requirements_documents?.join(', ') || '',
        demo_link: project.demo_link || '',
        repository_url: project.repository_url || '',
        client_feedback: project.client_feedback || '',
        notes: project.notes || '',
        created_at: project.created_at,
    });

    const syncProjectToServer = async (project: Project) => {
        const customerEmail = customerName;
        const RAW_BASE_URL = process.env.NEXT_PUBLIC_API_URL;
        if (!RAW_BASE_URL) {
            throw new Error('NEXT_PUBLIC_API_URL environment variable is not set');
        }
        const BASE_URL = RAW_BASE_URL.replace(/\/+$/, '');
        const payload = buildProjectPayload(project);

        const resp = await fetch(`${BASE_URL}/api/v1/projects/?customer_email=${encodeURIComponent(customerEmail)}`, {
            method: 'PUT',
            headers: {
                'accept': 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ projects: [payload] }),
        });

        if (!resp.ok) {
            throw new Error(`HTTP error! status: ${resp.status}`);
        }
    };

    const handleViewProject = (project: Project) => {
        setSelectedProject(project);
        setShowProjectModal(true);
    };


    const handleDeleteProject = (project: Project) => {
        setShowDeleteConfirm({ show: true, project });
    };

    const confirmDeleteProject = async () => {
        if (showDeleteConfirm.project) {
            setIsDeleting(true);
            try {
                const customerEmail = customerName;
                
                const RAW_BASE_URL_DEL = process.env.NEXT_PUBLIC_API_URL;
                if (!RAW_BASE_URL_DEL) {
                    throw new Error('NEXT_PUBLIC_API_URL environment variable is not set');
                }
                const BASE_URL_DEL = RAW_BASE_URL_DEL.replace(/\/+$/, '');
                const response = await fetch(`${BASE_URL_DEL}/api/v1/projects/${showDeleteConfirm.project.project_number}/?customer_email=${encodeURIComponent(customerEmail)}`, {
                    method: 'DELETE',
                    headers: {
                        'accept': 'application/json',
                    },
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const result = await response.json();
                
                if (result.message) {
                    // Remove project from local state
                    setProjects(prev => prev.filter(p => p.id !== showDeleteConfirm.project!.id));
                    setAlert({ 
                        show: true, 
                        variant: 'success', 
                        title: 'Project Deleted', 
                        message: result.message 
                    });
                    setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 3000);
                    setShowDeleteConfirm({ show: false, project: null });
                } else {
                    throw new Error('Invalid response format from server');
                }
            } catch (error) {
                console.error('Error deleting project:', error);
                setAlert({ 
                    show: true, 
                    variant: 'error', 
                    title: 'Delete Failed', 
                    message: error instanceof Error ? error.message : 'Failed to delete project. Please try again.' 
                });
                setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 3000);
            } finally {
                setIsDeleting(false);
            }
        }
    };

    const handleAddProject = () => {
        setEditingProject(null);
        setShowProjectForm(true);
    };

    // Handle drag and drop status update
    const handleStatusUpdate = async (project: Project, newStatus: Project['status']) => {
        if (project.status === newStatus) return; // No change needed
        
        setIsUpdatingStatus(true);
        const updatedProject: Project = {
            ...project,
            status: newStatus,
        };

        setProjects(prev =>
            prev.map(p =>
                p.id === project.id ? updatedProject : p
            )
        );

        try {
            await syncProjectToServer(updatedProject);
            setAlert({ 
                show: true, 
                variant: 'success', 
                title: 'Status Updated', 
                message: `Project status updated to ${newStatus.replace('_', ' ')}`
            });
            setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 3000);
        } catch (error) {
            console.error('Error updating project status:', error);
            setAlert({ 
                show: true, 
                variant: 'error', 
                title: 'Update Failed', 
                message: error instanceof Error ? error.message : 'Failed to update project status. Please try again.' 
            });
            setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 3000);
            fetchProjects(currentPage, pageSize);
        } finally {
            setIsUpdatingStatus(false);
        }
    };

    // Handle drag and drop priority update
    const handlePriorityUpdate = async (project: Project, newPriority: Project['priority']) => {
        if (project.priority === newPriority) return; // No change needed
        
        setIsUpdatingPriority(true);
        const updatedProject: Project = {
            ...project,
            priority: newPriority,
        };

        setProjects(prev =>
            prev.map(p =>
                p.id === project.id ? updatedProject : p
            )
        );

        try {
            await syncProjectToServer(updatedProject);
            setAlert({ 
                show: true, 
                variant: 'success', 
                title: 'Priority Updated', 
                message: `Project priority updated to ${newPriority.charAt(0).toUpperCase() + newPriority.slice(1)}`
            });
            setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 3000);
        } catch (error) {
            console.error('Error updating project priority:', error);
            setAlert({ 
                show: true, 
                variant: 'error', 
                title: 'Update Failed', 
                message: error instanceof Error ? error.message : 'Failed to update project priority. Please try again.' 
            });
            setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 3000);
            fetchProjects(currentPage, pageSize);
        } finally {
            setIsUpdatingPriority(false);
        }
    };

    const handleEditProject = (project: Project) => {
        setEditingProject(project);
        setShowProjectForm(true);
    };

    const handleFormSubmit = async (formData: ProjectFormData) => {
        setIsFormLoading(true);
        try {
            if (editingProject) {
                // Update existing project via PUT endpoint
                const customerEmail = customerName;

                const updatedProjectPayload = {
                    project_number: editingProject.project_number, // keep original identifier
                    project_name: formData.project_name,
                    project_type: formData.project_type,
                    status: formData.status,
                    priority: formData.priority,
                    description: formData.description,
                    technologies: Array.isArray(formData.technologies) ? formData.technologies.join(', ') : (formData.technologies || ''),
                    start_date: new Date(formData.start_date).toISOString(),
                    delivery_date: new Date(formData.delivery_date).toISOString(),
                    budget: formData.budget,
                    paid_amount: formData.paid_amount,
                    progress_percentage: formData.progress_percentage,
                    project_manager: formData.project_manager,
                    team_members: Array.isArray(formData.team_members) ? formData.team_members.join(', ') : (formData.team_members || ''),
                    requirements_documents: Array.isArray(formData.requirements_documents) ? formData.requirements_documents.join(', ') : (formData.requirements_documents || ''),
                    demo_link: formData.demo_link || '',
                    repository_url: formData.repository_url || '',
                    client_feedback: formData.client_feedback || '',
                    notes: formData.notes || '',
                    created_at: editingProject.created_at || new Date().toISOString()
                };

                const RAW_BASE_URL = process.env.NEXT_PUBLIC_API_URL;
                if (!RAW_BASE_URL) {
                    throw new Error('NEXT_PUBLIC_API_URL environment variable is not set');
                }
                const BASE_URL = RAW_BASE_URL.replace(/\/+$/, '');
                const putResponse = await fetch(`${BASE_URL}/api/v1/projects/?customer_email=${encodeURIComponent(customerEmail)}`, {
                    method: 'PUT',
                    headers: {
                        'accept': 'application/json',
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ projects: [updatedProjectPayload] })
                });

                if (!putResponse.ok) {
                    throw new Error(`HTTP error! status: ${putResponse.status}`);
                }

                const putResult = await putResponse.json();

                // Refresh list from server to reflect canonical data
                await fetchProjects(currentPage, pageSize);

                setAlert({ show: true, variant: 'success', title: 'Success!', message: putResult.message || 'Project updated successfully!' });
            } else {
                // Create new project via API
                const customerEmail = customerName;
                
                // Prepare API payload
                const apiPayload = {
                    project_number: formData.project_number || `PROJ-${customerId}-${String(projects.length + 1).padStart(3, '0')}`,
                    project_name: formData.project_name,
                    project_type: formData.project_type,
                    status: formData.status,
                    priority: formData.priority,
                    description: formData.description,
                    technologies: Array.isArray(formData.technologies) ? formData.technologies.join(', ') : (formData.technologies || ''),
                    start_date: new Date(formData.start_date).toISOString(),
                    delivery_date: new Date(formData.delivery_date).toISOString(),
                    budget: formData.budget,
                    paid_amount: formData.paid_amount,
                    progress_percentage: formData.progress_percentage,
                    project_manager: formData.project_manager,
                    team_members: Array.isArray(formData.team_members) ? formData.team_members.join(', ') : (formData.team_members || ''),
                    requirements_documents: Array.isArray(formData.requirements_documents) ? formData.requirements_documents.join(', ') : (formData.requirements_documents || ''),
                    demo_link: formData.demo_link || '',
                    repository_url: formData.repository_url || '',
                    client_feedback: formData.client_feedback || '',
                    notes: formData.notes || '',
                    created_at: new Date().toISOString()
                };

                const RAW_BASE_URL2 = process.env.NEXT_PUBLIC_API_URL;
                if (!RAW_BASE_URL2) {
                    throw new Error('NEXT_PUBLIC_API_URL environment variable is not set');
                }
                const BASE_URL2 = RAW_BASE_URL2.replace(/\/+$/, '');
                const response = await fetch(`${BASE_URL2}/api/v1/create-project/?customer_email=${encodeURIComponent(customerEmail)}`, {
                    method: 'POST',
                    headers: {
                        'accept': 'application/json',
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(apiPayload)
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const result: CreateProjectApiResponse = await response.json();
                
                if (result.message && result.data) {
                    // Convert API response to Project interface
                    const newProject = convertApiDataToProject(result.data, customerId, customerName);
                    newProject.id = result.project_id; // Use the project_id from API response
                    
                    // Add to local state
                    setProjects(prev => [newProject, ...prev]);
                    setAlert({ 
                        show: true, 
                        variant: 'success', 
                        title: 'Success!', 
                        message: result.message 
                    });
                } else {
                    throw new Error('Invalid response format from server');
                }
            }
            
            setShowProjectForm(false);
            setEditingProject(null);
        } catch (error) {
            console.error('Error saving project:', error);
            setAlert({ 
                show: true, 
                variant: 'error', 
                title: 'Error', 
                message: error instanceof Error ? error.message : 'Failed to save project. Please try again.' 
            });
        } finally {
            setIsFormLoading(false);
        }
    };

    const handleFormClose = () => {
        setShowProjectForm(false);
        setEditingProject(null);
    };

 

    const confirmProgressUpdate = () => {
        if (showProgressUpdate.project) {
            setProjects(prev => prev.map(project => 
                project.id === showProgressUpdate.project!.id 
                    ? { 
                        ...project, 
                        progress_percentage: newProgress,
                        updated_at: new Date().toISOString()
                    }
                    : project
            ));
            setAlert({ show: true, variant: 'success', title: 'Progress Updated', message: `Progress updated to ${newProgress}% for ${showProgressUpdate.project.project_name}` });
            setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 3000);
            setShowProgressUpdate({ show: false, project: null });
        }
    };

    // Download template function
    const downloadTemplate = () => {
        const templateData = [
            {
                'Project Number': 'PROJ-001-001',
                'Project Name': 'E-commerce Platform',
                'Project Type': 'web_development',
                'Status': 'in_progress',
                'Priority': 'high',
                'Description': 'Comprehensive e-commerce solution with modern UI/UX',
                'Technologies': 'React, Node.js, MongoDB',
                'Start Date': '2024-01-15',
                'Delivery Date': '2024-04-15',
                'Budget': 50000,
                'Paid Amount': 15000,
                'Progress Percentage': 30,
                'Project Manager': 'john.smith@company.com',
                'Team Members': 'alice.johnson@company.com, bob.wilson@company.com',
                'Requirements Documents': 'https://docs.company.com/requirements_001.pdf,https://docs.company.com/specs_001.pdf',
                'Demo Link': 'https://demo.example.com',
                'Repository URL': 'https://github.com/company/project-001',
                'Client Feedback': 'Great progress so far!',
                'Notes': 'High priority project - focus on performance'
            }
        ];

        const ws = XLSX.utils.json_to_sheet(templateData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Projects Template');
        
        // Auto-size columns
        const colWidths = [
            { wch: 15 }, // Project Number
            { wch: 20 }, // Customer Name
            { wch: 20 }, // Customer Email
            { wch: 25 }, // Project Name
            { wch: 20 }, // Project Type
            { wch: 15 }, // Status
            { wch: 10 }, // Priority
            { wch: 40 }, // Description
            { wch: 30 }, // Technologies
            { wch: 12 }, // Start Date
            { wch: 12 }, // Delivery Date
            { wch: 12 }, // Budget
            { wch: 12 }, // Paid Amount
            { wch: 15 }, // Progress Percentage
            { wch: 20 }, // Project Manager
            { wch: 30 }, // Team Members
            { wch: 25 }, // Requirements Document
            { wch: 30 }, // Demo Link
            { wch: 30 }, // Repository URL
            { wch: 40 }, // Client Feedback
            { wch: 40 }  // Notes
        ];
        ws['!cols'] = colWidths;

        XLSX.writeFile(wb, `Projects_Template_${customerName.replace(/\s+/g, '_')}.xlsx`);
    };

    // Download CSV template function (removed - not used)
    // const downloadCSVTemplate = () => {
    //     const templateData = [
    //         {
    //             'Project Number': 'PROJ-001-001',
    //             'Project Name': 'E-commerce Platform',
    //             'Project Type': 'web_development',
    //             'Status': 'in_progress',
    //             'Priority': 'high',
    //             'Description': 'Comprehensive e-commerce solution with modern UI/UX',
    //             'Technologies': 'React, Node.js, MongoDB',
    //             'Start Date': '2024-01-15',
    //             'Delivery Date': '2024-04-15',
    //             'Budget': 50000,
    //             'Paid Amount': 15000,
    //             'Progress Percentage': 30,
    //             'Project Manager': 'john.smith@company.com',
    //             'Team Members': 'alice.johnson@company.com, bob.wilson@company.com',
    //             'Requirements Documents': 'https://docs.company.com/requirements_001.pdf,https://docs.company.com/specs_001.pdf',
    //             'Demo Link': 'https://demo.example.com',
    //             'Repository URL': 'https://github.com/company/project-001',
    //             'Client Feedback': 'Great progress so far!',
    //             'Notes': 'High priority project - focus on performance'
    //         }
    //     ];

    //     const ws = XLSX.utils.json_to_sheet(templateData);
    //     const csv = XLSX.utils.sheet_to_csv(ws);
        
        //     // Create and download CSV file
        //     const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        //     const link = document.createElement('a');
        //     const url = URL.createObjectURL(blob);
        //     link.setAttribute('href', url);
        //     link.setAttribute('download', `Projects_Template_${customerName.replace(/\s+/g, '_')}.csv`);
        //     link.style.visibility = 'hidden';
        //     document.body.appendChild(link);
        //     link.click();
        //     document.body.removeChild(link);
    // };

    // Handle file upload
    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
            setAlert({ show: true, variant: 'error', title: 'Invalid File', message: 'Please upload an Excel or CSV file (.xlsx, .xls, or .csv)' });
            return;
        }

        setIsUploading(true);
        try {
            // Create FormData for multipart/form-data upload
            const formData = new FormData();
            formData.append('file', file);

            // Get customer email from customerName (assuming it's an email)
            // If customerName is not an email, you might need to get it from props or context
            const customerEmail = customerName.includes('@') ? customerName : `${customerName.toLowerCase().replace(/\s+/g, '.')}@mobiloitte.com`;

            // Make API call to upload projects
            const RAW_BASE_URL3 = process.env.NEXT_PUBLIC_API_URL;
            if (!RAW_BASE_URL3) {
                throw new Error('NEXT_PUBLIC_API_URL environment variable is not set');
            }
            const BASE_URL3 = RAW_BASE_URL3.replace(/\/+$/, '');
            const response = await fetch(`${BASE_URL3}/api/v1/upload-projects/?customer_email=${encodeURIComponent(customerEmail)}`, {
                method: 'POST',
                headers: {
                    'accept': 'application/json',
                },
                body: formData
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            
            // Handle successful response
            if (result.message && result.inserted !== undefined) {
                setAlert({ 
                    show: true, 
                    variant: 'success', 
                    title: 'Upload Successful', 
                    message: `${result.message} ${result.inserted} projects inserted, ${result.updated} projects updated.` 
                });
                
                // Refresh projects list from API
                await fetchProjects(currentPage, pageSize);
                
                setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 5000);
                setShowUploadModal(false);
            } else {
                throw new Error('Invalid response format from server');
            }

        } catch (error) {
            console.error('Error uploading file:', error);
            setAlert({ 
                show: true, 
                variant: 'error', 
                title: 'Upload Failed', 
                message: error instanceof Error ? error.message : 'Failed to upload the file. Please check your connection and try again.' 
            });
        } finally {
            setIsUploading(false);
        }
    };

    // Helper functions for styling
    const getStatusColor = (status: Project['status']) => {
        switch (status) {
            case 'planning': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
            case 'in_progress': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
            case 'testing': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
            case 'completed': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
            case 'on_hold': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
            case 'cancelled': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
            default: return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400';
        }
    };

    const getPriorityColor = (priority: Project['priority']) => {
        switch (priority) {
            case 'low': return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400';
            case 'medium': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
            case 'high': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
            case 'urgent': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
            default: return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400';
        }
    };

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

    const headerActions = (
        <div className="flex flex-wrap gap-2">
            <button
                onClick={onBack}
                className="px-4 py-2 rounded-lg border border-white/40 text-white/90 hover:bg-white/10 text-sm font-semibold flex items-center gap-2 transition-colors"
            >
                <FaArrowLeft className="w-4 h-4" />
                Back
            </button>
            <button
                onClick={() => setShowUploadModal(true)}
                className="px-4 py-2 bg-white/90 hover:bg-white text-blue-600 rounded-lg text-sm font-semibold flex items-center gap-2"
            >
                <FaUpload className="w-4 h-4" />
                Upload
            </button>
            <button
                onClick={handleAddProject}
                className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-sm font-semibold flex items-center gap-2 shadow-lg shadow-blue-900/30"
            >
                <FaPlus className="w-4 h-4" />
                New Project
            </button>
        </div>
    );

    return (
        <EmbeddedAdminChrome>
        <div className="h-screen bg-white dark:bg-gray-900 pb-96 lg:pb-[32rem] mb-96 lg:mb-[32rem] project-details-page-container overflow-y-auto overflow-x-hidden">
            {/* Enhanced Header */}
            <div className="mx-4 md:mx-6 mt-6 mb-8">
                <DashboardHeader
                    title="Project Details"
                    subtitle={customerName ? `Engagement overview for ${customerName}` : 'Comprehensive project insights'}
                    icon={FaCode}
                    breadcrumbs={[
                        { label: 'Customers', href: '/customer' },
                        ...(customerName ? [{ label: customerName }] : []),
                        { label: 'Project Details' },
                    ]}
                    actions={headerActions}
                    variant="hero"
                    size="md"
                    className="shadow-xl"
                />
            </div>

            {/* Enhanced View Controls */}
            <div className="mx-4 md:mx-6 mb-6">
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-2 shadow-xl border border-gray-200/60 dark:border-gray-700/60 overflow-hidden relative">
                    <div className="relative z-10 inline-flex rounded-xl bg-white dark:bg-gray-800 border border-stroke dark:border-gray-700 p-1 shadow">
                        <button
                            onClick={() => setCurrentView('table')}
                            className={`px-6 py-3 text-sm font-semibold rounded-lg transition-all duration-300 flex items-center gap-2 ${
                                currentView === 'table' 
                                    ? 'bg-blue-600 text-white shadow-lg transform scale-105' 
                                    : 'text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                            }`}
                        >
                            <FaTable className="w-4 h-4" />
                            All Projects
                            {currentView === 'table' && (
                                <span className="ml-2 px-2 py-1 text-xs bg-white/20 text-white rounded-full">
                                    {filteredProjects.length}
                                </span>
                            )}
                        </button>
                        <button
                            onClick={() => setCurrentView('kanban')}
                            className={`px-6 py-3 text-sm font-semibold rounded-lg transition-all duration-300 flex items-center gap-2 ${
                                currentView === 'kanban' 
                                    ? 'bg-blue-600 text-white shadow-lg transform scale-105' 
                                    : 'text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                            }`}
                        >
                            <FaTh className="w-4 h-4" />
                            By Status
                        </button>
                        <button
                            onClick={() => setCurrentView('priority')}
                            className={`px-6 py-3 text-sm font-semibold rounded-lg transition-all duration-300 flex items-center gap-2 ${
                                currentView === 'priority' 
                                    ? 'bg-blue-600 text-white shadow-lg transform scale-105' 
                                    : 'text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                            }`}
                        >
                            <FaTag className="w-4 h-4" />
                            By Priority
                        </button>
                        <button
                            onClick={() => setCurrentView('timeline')}
                            className={`px-6 py-3 text-sm font-semibold rounded-lg transition-all duration-300 flex items-center gap-2 ${
                                currentView === 'timeline' 
                                    ? 'bg-blue-600 text-white shadow-lg transform scale-105' 
                                    : 'text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                            }`}
                        >
                            <FaCalendar className="w-4 h-4" />
                            Timeline
                        </button>
                    </div>
                </div>
            </div>

            {/* Enhanced Action Bar */}
            <div className="mx-4 md:mx-6 mb-6">
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-xl border border-gray-200/60 dark:border-gray-700/60">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                            <div className="relative flex-1 sm:flex-initial min-w-[200px]">
                                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                <input
                                    type="text"
                                    placeholder="Search projects..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 rounded-lg text-sm border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                                />
                            </div>
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value as Project['status'] | 'all')}
                                className="px-3 py-2 rounded-lg text-sm border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            >
                                <option value="all">All Status</option>
                                <option value="planning">Planning</option>
                                <option value="in_progress">In Progress</option>
                                <option value="testing">Testing</option>
                                <option value="completed">Completed</option>
                                <option value="on_hold">On Hold</option>
                                <option value="cancelled">Cancelled</option>
                            </select>
                            <select
                                value={priorityFilter}
                                onChange={(e) => setPriorityFilter(e.target.value as Project['priority'] | 'all')}
                                className="px-3 py-2 rounded-lg text-sm border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            >
                                <option value="all">All Priority</option>
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                                <option value="urgent">Urgent</option>
                            </select>
                        </div>
                        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                            <select
                                value={pageSize}
                                onChange={(e) => {
                                    setPageSize(Number(e.target.value));
                                    setCurrentPage(1);
                                }}
                                className="px-3 py-2 rounded-lg text-sm border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            >
                                <option value={5}>5 per page</option>
                                <option value={10}>10 per page</option>
                                <option value={25}>25 per page</option>
                                <option value={50}>50 per page</option>
                            </select>
                            <button 
                                onClick={() => fetchProjects(currentPage, pageSize)}
                                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 transition-colors"
                                title="Refresh projects"
                            >
                                <FaSync className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Area with Scrollbar */}
            <div className="mx-4 md:mx-6 pb-16 mb-12">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-16">
                            <div className="flex flex-col items-center gap-4">
                                <Loader />
                                <p className="text-gray-500 dark:text-gray-400">Loading projects...</p>
                            </div>
                        </div>
                    ) : currentView === 'table' ? (
                        <div>
                            {filteredProjects.length === 0 ? (
                                <div className="text-center py-16">
                                    <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 bg-gray-100 dark:bg-gray-700">
                                        <FaCode className="w-8 h-8 text-gray-400" />
                                    </div>
                                    <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">No projects found</h3>
                                    <p className="mb-4 text-gray-500 dark:text-gray-400">
                                        {searchQuery || statusFilter !== 'all' || priorityFilter !== 'all' 
                                            ? 'No projects match your current filters.' 
                                            : 'No projects available for this customer.'}
                                    </p>
                                    <button
                                        onClick={handleAddProject}
                                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors duration-200"
                                    >
                                        Add First Project
                                    </button>
                                </div>
                            ) : (
                                <div className="rounded-lg border bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                                    {/* Table Header */}
                                    <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                                        <div className="grid grid-cols-12 gap-4 text-sm font-semibold">
                                            <div className="col-span-3">
                                                <span className="text-gray-600 dark:text-gray-300">Project Name</span>
                                            </div>
                                            <div className="col-span-2">
                                                <span className="text-gray-600 dark:text-gray-300">Status</span>
                                            </div>
                                            <div className="col-span-2">
                                                <span className="text-gray-600 dark:text-gray-300">Priority</span>
                                            </div>
                                            <div className="col-span-2">
                                                <span className="text-gray-600 dark:text-gray-300">Progress</span>
                                            </div>
                                            <div className="col-span-2">
                                                <span className="text-gray-600 dark:text-gray-300">Budget</span>
                                            </div>
                                            <div className="col-span-1">
                                                <span className="text-gray-600 dark:text-gray-300">Actions</span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Table Body */}
                                    <div className="divide-y divide-gray-200 dark:divide-gray-700">
                                        {filteredProjects.map((project) => (
                                            <div key={project.id} className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                                <div className="grid grid-cols-12 gap-4 items-center">
                                                    <div className="col-span-3">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gray-100 dark:bg-gray-700">
                                                                {getProjectTypeIcon(project.project_type)}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="font-medium truncate text-gray-900 dark:text-white">
                                                                    {project.project_name}
                                                                </p>
                                                                <p className="text-sm truncate text-gray-500 dark:text-gray-400">
                                                                    {project.project_number}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="col-span-2">
                                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
                                                            {project.status.replace('_', ' ').toUpperCase()}
                                                        </span>
                                                    </div>
                                                    <div className="col-span-2">
                                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(project.priority)}`}>
                                                            {project.priority.toUpperCase()}
                                                        </span>
                                                    </div>
                                                    <div className="col-span-2">
                                                        <div className="flex items-center gap-2">
                                                            <div className="flex-1 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                                                                <div 
                                                                    className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full transition-all duration-300"
                                                                    style={{ width: `${project.progress_percentage}%` }}
                                                                ></div>
                                                            </div>
                                                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                                                                {project.progress_percentage}%
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="col-span-2">
                                                        <div className="space-y-1">
                                                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                                                                ${project.budget.toLocaleString()}
                                                            </p>
                                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                                Paid: ${project.paid_amount.toLocaleString()}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="col-span-1">
                                                        <div className="flex items-center gap-1">
                                                            <button
                                                                onClick={() => handleViewProject(project)}
                                                                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300"
                                                            >
                                                                <FaEye className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleEditProject(project)}
                                                                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300"
                                                            >
                                                                <FaEdit className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteProject(project)}
                                                                disabled={isDeleting}
                                                                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                                                title="Delete project"
                                                            >
                                                                <FaTrash className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            
                            {/* Pagination Controls */}
                            {filteredProjects.length > 0 && (
                                <div className="mt-6 flex items-center justify-between">
                                    <div className="text-sm text-gray-500 dark:text-gray-400">
                                        Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalRecords)} of {totalRecords} projects
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                            disabled={currentPage === 1}
                                            className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700"
                                        >
                                            Previous
                                        </button>
                                        <div className="flex items-center gap-1">
                                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                                const pageNum = i + 1;
                                                return (
                                                    <button
                                                        key={pageNum}
                                                        onClick={() => setCurrentPage(pageNum)}
                                                        className={`px-3 py-2 text-sm font-medium rounded-lg ${
                                                            currentPage === pageNum
                                                                ? 'bg-blue-600 text-white'
                                                                : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700'
                                                        }`}
                                                    >
                                                        {pageNum}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        <button
                                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                            disabled={currentPage === totalPages}
                                            className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700"
                                        >
                                            Next
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : currentView === 'kanban' ? (
                        <div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-4">
                                {PROJECT_STATUS_ORDER.map((status) => {
                                    const statusProjects = filteredProjects.filter(project => project.status === status);
                                    const isDraggingOver = dragOverStatus === status && draggedProject && draggedProject.status !== status;
                                    return (
                                        <div 
                                            key={status} 
                                            className={`rounded-lg border bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 transition-all ${
                                                isDraggingOver ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-lg' : ''
                                            }`}
                                            onDragEnter={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                if (draggedProject && draggedProject.status !== status) {
                                                    setDragOverStatus(status);
                                                }
                                            }}
                                            onDragLeave={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                // Only clear if we're leaving the column entirely
                                                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                                const x = e.clientX;
                                                const y = e.clientY;
                                                if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
                                                    setDragOverStatus(null);
                                                }
                                            }}
                                            onDragOver={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                if (draggedProject && draggedProject.status !== status) {
                                                    setDragOverStatus(status);
                                                }
                                            }}
                                            onDrop={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                if (draggedProject && draggedProject.status !== status) {
                                                    handleStatusUpdate(draggedProject, status);
                                                }
                                                setDraggedProject(null);
                                                setDragOverStatus(null);
                                            }}
                                        >
                                            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                                                <div className="flex items-center justify-between">
                                                    <h3 className="font-semibold capitalize text-gray-900 dark:text-white">
                                                        {status.replace('_', ' ')}
                                                    </h3>
                                                    <span className="px-2 py-1 text-xs rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                                                        {statusProjects.length}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="p-4 space-y-3 min-h-[100px]">
                                                {statusProjects.length === 0 ? (
                                                    <div className={`text-center py-8 text-gray-500 dark:text-gray-400 ${isDraggingOver ? 'border-2 border-dashed border-blue-400 rounded-lg' : ''}`}>
                                                        <FaCode className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                                        <p className="text-sm">No projects</p>
                                                        {isDraggingOver && (
                                                            <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">Drop here</p>
                                                        )}
                                                    </div>
                                                ) : (
                                                    statusProjects.map((project) => (
                                                        <div 
                                                            key={project.id} 
                                                            draggable={!isUpdatingStatus}
                                                            onDragStart={(e) => {
                                                                setDraggedProject(project);
                                                                e.dataTransfer.effectAllowed = 'move';
                                                                e.dataTransfer.setData('text/plain', project.id);
                                                            }}
                                                            onDragEnd={() => {
                                                                setDraggedProject(null);
                                                                setDragOverStatus(null);
                                                            }}
                                                            className={`p-3 rounded-lg border bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 hover:shadow-md transition-all ${
                                                                draggedProject?.id === project.id ? 'opacity-50 scale-95' : ''
                                                            } ${isUpdatingStatus ? 'cursor-wait' : 'cursor-grab active:cursor-grabbing'}`}
                                                        >
                                                            <div className="flex items-start justify-between mb-2">
                                                                <h4 className="font-medium text-sm text-gray-900 dark:text-white">
                                                                    {project.project_name}
                                                                </h4>
                                                                <span className={`px-2 py-1 rounded-full text-xs ${getPriorityColor(project.priority)}`}>
                                                                    {project.priority.toUpperCase()}
                                                                </span>
                                                            </div>
                                                            <p className="text-xs mb-3 text-gray-500 dark:text-gray-400">
                                                                {project.project_number}
                                                            </p>
                                                            <div className="space-y-2">
                                                                <div className="flex justify-between text-xs">
                                                                    <span className="text-gray-500 dark:text-gray-400">Progress</span>
                                                                    <span className="text-gray-900 dark:text-white">{project.progress_percentage}%</span>
                                                                </div>
                                                                <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1">
                                                                    <div 
                                                                        className="bg-gradient-to-r from-blue-500 to-indigo-600 h-1 rounded-full transition-all duration-300"
                                                                        style={{ width: `${project.progress_percentage}%` }}
                                                                    ></div>
                                                                </div>
                                                                <div className="flex justify-between text-xs">
                                                                    <span className="text-gray-500 dark:text-gray-400">Budget</span>
                                                                    <span className="text-gray-900 dark:text-white">${project.budget.toLocaleString()}</span>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-1 mt-3">
                                                            <button
                                                                onClick={() => handleViewProject(project)}
                                                                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300"
                                                            >
                                                                <FaEye className="w-3 h-3" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleEditProject(project)}
                                                                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300"
                                                            >
                                                                <FaEdit className="w-3 h-3" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteProject(project)}
                                                                disabled={isDeleting}
                                                                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                                                title="Delete project"
                                                            >
                                                                <FaTrash className="w-3 h-3" />
                                                            </button>
                                                            </div>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : currentView === 'priority' ? (
                        <div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-4">
                                {PROJECT_PRIORITY_ORDER.map((priority) => {
                                    const priorityProjects = filteredProjects.filter(project => project.priority === priority);
                                    const priorityColors = {
                                        urgent: 'border-red-500 bg-red-50 dark:bg-red-900/20',
                                        high: 'border-orange-500 bg-orange-50 dark:bg-orange-900/20',
                                        medium: 'border-blue-500 bg-blue-50 dark:bg-blue-900/20',
                                        low: 'border-gray-500 bg-gray-50 dark:bg-gray-900/20'
                                    };
                                    const priorityLabels = {
                                        urgent: 'Urgent',
                                        high: 'High',
                                        medium: 'Medium',
                                        low: 'Low'
                                    };
                                    const isDraggingOver = dragOverPriority === priority && draggedProject && draggedProject.priority !== priority;
                                    return (
                                        <div 
                                            key={priority} 
                                            className={`rounded-lg border-2 ${priorityColors[priority as keyof typeof priorityColors]} bg-white dark:bg-gray-800 transition-all ${
                                                isDraggingOver ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-lg' : ''
                                            }`}
                                            onDragEnter={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                if (draggedProject && draggedProject.priority !== priority) {
                                                    setDragOverPriority(priority);
                                                }
                                            }}
                                            onDragLeave={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                                const x = e.clientX;
                                                const y = e.clientY;
                                                if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
                                                    setDragOverPriority(null);
                                                }
                                            }}
                                            onDragOver={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                if (draggedProject && draggedProject.priority !== priority) {
                                                    setDragOverPriority(priority);
                                                }
                                            }}
                                            onDrop={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                if (draggedProject && draggedProject.priority !== priority) {
                                                    handlePriorityUpdate(draggedProject, priority);
                                                }
                                                setDraggedProject(null);
                                                setDragOverPriority(null);
                                            }}
                                        >
                                            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                                                <div className="flex items-center justify-between">
                                                    <h3 className="font-semibold capitalize text-gray-900 dark:text-white">
                                                        {priorityLabels[priority as keyof typeof priorityLabels]}
                                                    </h3>
                                                    <span className="px-2 py-1 text-xs rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                                                        {priorityProjects.length}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="p-4 space-y-3 max-h-[600px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-gray-100 dark:scrollbar-track-gray-800 hover:scrollbar-thumb-gray-400 dark:hover:scrollbar-thumb-gray-500" style={{ scrollbarWidth: 'thin', scrollbarColor: '#d1d5db #f3f4f6' }}>
                                                {priorityProjects.length === 0 ? (
                                                    <div className={`text-center py-8 text-gray-500 dark:text-gray-400 ${isDraggingOver ? 'border-2 border-dashed border-blue-400 rounded-lg' : ''}`}>
                                                        <FaTag className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                                        <p className="text-sm">No projects</p>
                                                        {isDraggingOver && (
                                                            <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">Drop here</p>
                                                        )}
                                                    </div>
                                                ) : (
                                                    priorityProjects.map((project) => (
                                                        <div 
                                                            key={project.id} 
                                                            draggable={!isUpdatingPriority}
                                                            onDragStart={(e) => {
                                                                setDraggedProject(project);
                                                                e.dataTransfer.effectAllowed = 'move';
                                                                e.dataTransfer.setData('text/plain', project.id);
                                                            }}
                                                            onDragEnd={() => {
                                                                setDraggedProject(null);
                                                                setDragOverPriority(null);
                                                            }}
                                                            className={`p-3 rounded-lg border bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 hover:shadow-md transition-all ${
                                                                draggedProject?.id === project.id ? 'opacity-50 scale-95' : ''
                                                            } ${isUpdatingPriority ? 'cursor-wait' : 'cursor-grab active:cursor-grabbing'}`}
                                                        >
                                                            <div className="flex items-start justify-between mb-2">
                                                                <h4 className="font-medium text-sm text-gray-900 dark:text-white">
                                                                    {project.project_name}
                                                                </h4>
                                                                <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(project.status)}`}>
                                                                    {project.status.replace('_', ' ').toUpperCase()}
                                                                </span>
                                                            </div>
                                                            <p className="text-xs mb-3 text-gray-500 dark:text-gray-400">
                                                                {project.project_number}
                                                            </p>
                                                            <div className="space-y-2">
                                                                <div className="flex justify-between text-xs">
                                                                    <span className="text-gray-500 dark:text-gray-400">Progress</span>
                                                                    <span className="text-gray-900 dark:text-white">{project.progress_percentage}%</span>
                                                                </div>
                                                                <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1">
                                                                    <div 
                                                                        className="bg-gradient-to-r from-blue-500 to-indigo-600 h-1 rounded-full transition-all duration-300"
                                                                        style={{ width: `${project.progress_percentage}%` }}
                                                                    ></div>
                                                                </div>
                                                                <div className="flex justify-between text-xs">
                                                                    <span className="text-gray-500 dark:text-gray-400">Budget</span>
                                                                    <span className="text-gray-900 dark:text-white">${project.budget.toLocaleString()}</span>
                                                                </div>
                                                                <div className="flex justify-between text-xs">
                                                                    <span className="text-gray-500 dark:text-gray-400">Type</span>
                                                                    <span className="text-gray-900 dark:text-white">{project.project_type.replace('_', ' ').toUpperCase()}</span>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-1 mt-3">
                                                                <button
                                                                    onClick={() => handleViewProject(project)}
                                                                    className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300"
                                                                >
                                                                    <FaEye className="w-3 h-3" />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleEditProject(project)}
                                                                    className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300"
                                                                >
                                                                    <FaEdit className="w-3 h-3" />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDeleteProject(project)}
                                                                    disabled={isDeleting}
                                                                    className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                                                    title="Delete project"
                                                                >
                                                                    <FaTrash className="w-3 h-3" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : currentView === 'timeline' ? (
                        <div>
                            <div className="rounded-lg border bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Timeline View</h3>
                                        <div className="flex items-center gap-2">
                                            <button className="px-3 py-1 rounded text-sm bg-blue-100 dark:bg-blue-700 text-blue-600 dark:text-blue-300">
                                                Month
                                            </button>
                                            <button className="px-3 py-1 rounded text-sm bg-blue-100 dark:bg-blue-700 text-blue-600 dark:text-blue-300">
                                                <FaChevronLeft className="w-4 h-4" />
                                            </button>
                                            <span className="px-3 py-1 text-sm text-gray-900 dark:text-white">Today</span>
                                            <button className="px-3 py-1 rounded text-sm bg-blue-100 dark:bg-blue-700 text-blue-600 dark:text-blue-300">
                                                <FaChevronRight className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-6">
                                    <div className="space-y-4">
                                        {filteredProjects.map((project) => (
                                            <div key={project.id} className="p-4 rounded-lg border bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600">
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-3 h-3 rounded-full ${getStatusColor(project.status).split(' ')[0]}`}></div>
                                                        <h4 className="font-medium text-gray-900 dark:text-white">
                                                            {project.project_name}
                                                        </h4>
                                                    </div>
                                                    <span className={`px-2 py-1 rounded-full text-xs ${getPriorityColor(project.priority)}`}>
                                                        {project.priority.toUpperCase()}
                                                    </span>
                                                </div>
                                                <p className="text-sm mb-2 text-gray-500 dark:text-gray-400">
                                                    {project.project_number} • ${project.budget.toLocaleString()}
                                                </p>
                                                <div className="flex items-center gap-4 text-xs">
                                                    <span className="text-gray-500 dark:text-gray-400">
                                                        Start: {new Date(project.start_date).toLocaleDateString()}
                                                    </span>
                                                    <span className="text-gray-500 dark:text-gray-400">
                                                        Due: {new Date(project.delivery_date).toLocaleDateString()}
                                                    </span>
                                                    <span className="text-gray-500 dark:text-gray-400">
                                                        Progress: {project.progress_percentage}%
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : null}
            </div>

            {/* Project Details Modal */}
            <ProjectDetailsModal
                project={selectedProject}
                isOpen={showProjectModal}
                onClose={() => {
                    setShowProjectModal(false);
                    setSelectedProject(null);
                }}
            />

            {/* Project Form Modal */}
            <OrderForm
                isOpen={showProjectForm}
                onClose={handleFormClose}
                onSubmit={handleFormSubmit}
                order={editingProject}
                customerId={customerId}
                customerName={customerName}
                isLoading={isFormLoading}
                existingOrderNumbers={projects.map(p => p.project_number)}
            />

            {/* Delete Confirmation Modal */}
            <Modal isOpen={showDeleteConfirm.show} onClose={() => setShowDeleteConfirm({ show: false, project: null })}>
                <div className="relative overflow-hidden max-w-md w-full">
                    <div className="absolute inset-0 bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 dark:from-red-900/20 dark:via-orange-900/20 dark:to-yellow-900/20"></div>
                    <div className="relative p-8">
                        <div className="text-center mb-8">
                            <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-red-500/25">
                                <FaTrash className="w-8 h-8 text-white" />
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Delete Project</h3>
                            <p className="text-gray-600 dark:text-gray-400">
                                Are you sure you want to delete <strong>{showDeleteConfirm.project?.project_name}</strong>?
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                                This action cannot be undone.
                            </p>
                        </div>

                        <div className="flex justify-center gap-4">
                            <button
                                onClick={() => setShowDeleteConfirm({ show: false, project: null })}
                                disabled={isDeleting}
                                className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDeleteProject}
                                disabled={isDeleting}
                                className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {isDeleting ? (
                                    <>
                                        <Loader />
                                        Deleting...
                                    </>
                                ) : (
                                    'Delete Project'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </Modal>

            {/* Progress Update Modal */}
            <Modal isOpen={showProgressUpdate.show} onClose={() => setShowProgressUpdate({ show: false, project: null })}>
                <div className="relative overflow-hidden max-w-md w-full">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-900/20 dark:via-indigo-900/20 dark:to-purple-900/20"></div>
                    <div className="relative p-8">
                        <div className="text-center mb-8">
                            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/25">
                                <FaEdit className="w-8 h-8 text-white" />
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Update Progress</h3>
                            <p className="text-gray-600 dark:text-gray-400">
                                Update progress for <strong>{showProgressUpdate.project?.project_name}</strong>
                            </p>
                        </div>

                        <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Progress Percentage
                            </label>
                            <div className="relative">
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="1"
                                    value={newProgress}
                                    onChange={(e) => setNewProgress(Math.min(Math.max(parseInt(e.target.value) || 0, 0), 100))}
                                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                    <span className="text-gray-500 dark:text-gray-400 text-sm">%</span>
                                </div>
                            </div>
                        </div>

                        {/* Progress Bar Visual */}
                        <div className="space-y-2">
                            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                                <span>0%</span>
                                <span className="font-medium">{newProgress}%</span>
                                <span>100%</span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                                <div 
                                    className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-300 ease-out"
                                    style={{ width: `${newProgress}%` }}
                                ></div>
                            </div>
                        </div>
                    </div>

                        <div className="flex justify-center gap-4 mt-8">
                            <button
                                onClick={() => setShowProgressUpdate({ show: false, project: null })}
                                className="px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors duration-200"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmProgressUpdate}
                                className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors duration-200"
                            >
                                Update Progress
                            </button>
                        </div>
                    </div>
                </div>
            </Modal>

            {/* Upload Modal */}
            <Modal 
                isOpen={showUploadModal} 
                onClose={() => setShowUploadModal(false)}
                className="max-w-6xl w-full bg-transparent dark:bg-transparent"
                showCloseButton={false}
            >
                <div className="relative overflow-hidden w-full max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-2xl p-4 sm:p-6 lg:p-8 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-gray-100 dark:scrollbar-track-gray-800 hover:scrollbar-thumb-gray-400 dark:hover:scrollbar-thumb-gray-500" style={{ scrollbarWidth: 'thin', scrollbarColor: '#d1d5db #f3f4f6' }}>
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 sm:mb-8 gap-4">
                        <div className="min-w-0 flex-1">
                            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2 break-words">Project Data Management</h2>
                            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 break-words">Download templates or upload project data files</p>
                        </div>
                        <button
                            onClick={() => setShowUploadModal(false)}
                            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 flex-shrink-0 self-start sm:self-auto"
                        >
                            <FaTimesCircle className="w-5 h-5 sm:w-6 sm:h-6" />
                        </button>
                    </div>

                    {/* Content Grid */}
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
                        {/* Download Template Section */}
                        <div className="border border-gray-200 dark:border-gray-600 rounded-2xl p-4 sm:p-6 lg:p-8 shadow-sm">
                            <div className="text-center">
                                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-lg shadow-blue-500/25">
                                    <FaDownload className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                                </div>
                                <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-3">Download Master Template</h3>
                                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-4 sm:mb-6 leading-relaxed">
                                    Get the standardized template to ensure your project data uploads are formatted correctly
                                </p>
                                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                                    <button
                                        onClick={downloadTemplate}
                                        className="flex-1 px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25"
                                    >
                                        <FaDownload className="w-4 h-4" />
                                        <span className="text-sm sm:text-base">Excel</span>
                                    </button>
                                </div>
                                <div className="mt-3 sm:mt-4 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                                    <div className="flex items-center gap-1">
                                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                        <span>API Compatible</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Upload File Section */}
                        <div className="border border-gray-200 dark:border-gray-600 rounded-2xl p-4 sm:p-6 lg:p-8 shadow-sm">
                            <div className="text-center">
                                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-lg shadow-green-500/25">
                                    <FaUpload className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                                </div>
                                <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-3">Upload File</h3>
                                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-4 sm:mb-6">
                                    Upload your project data file
                                </p>
                                
                                {/* File Upload Area */}
                                <div className="relative border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 sm:p-6 lg:p-8 mb-4 sm:mb-6 hover:border-blue-400 dark:hover:border-blue-500 transition-colors">
                                    <FaFileExcel className="w-8 h-8 sm:w-12 sm:h-12 text-green-500 mx-auto mb-3 sm:mb-4" />
                                    <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-1 sm:mb-2">Drag & drop your file here</p>
                                    <p className="text-xs sm:text-sm text-blue-500 dark:text-blue-400">or click to browse</p>
                                    <input
                                        type="file"
                                        accept=".xlsx,.xls,.csv"
                                        onChange={handleFileUpload}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        disabled={isUploading}
                                    />
                                </div>

                                <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-3 sm:mb-4">
                                    Supports Excel (.xlsx, .xls) and CSV (.csv) files
                                </div>

                                {isUploading && (
                                    <div className="flex items-center justify-center gap-2 text-blue-600 dark:text-blue-400">
                                        <Loader />
                                        <span className="text-sm sm:text-base">Processing file...</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Instructions */}
                    <div className="mt-6 sm:mt-8 border border-gray-200 dark:border-gray-600 rounded-2xl p-4 sm:p-6 shadow-sm">
                        <h4 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">Upload Instructions</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                            <div>
                                <h5 className="font-medium text-gray-900 dark:text-white mb-2">Required Fields:</h5>
                                <ul className="space-y-1">
                                    <li>• Project Name</li>
                                    <li>• Project Type</li>
                                    <li>• Status</li>
                                    <li>• Priority</li>
                                    <li>• Budget</li>
                                </ul>
                            </div>
                            <div>
                                <h5 className="font-medium text-gray-900 dark:text-white mb-2">Optional Fields:</h5>
                                <ul className="space-y-1">
                                    <li>• Description</li>
                                    <li>• Technologies</li>
                                    <li>• Team Members</li>
                                    <li>• Demo Link</li>
                                    <li>• Client Feedback</li>
                                </ul>
                            </div>
                        </div>
                    </div>
            </div>
        </Modal>

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
        </EmbeddedAdminChrome>
    );
}
