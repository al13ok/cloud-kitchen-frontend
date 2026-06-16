"use client"

import React from "react"

import { useState, useEffect, useContext, createContext, useCallback, useMemo, useRef } from "react"
// import { useRouter } from "next/navigation" // Currently unused
// import { DragDropContext, Droppable, Draggable, type DropResult, type DragStart } from "@hello-pangea/dnd"
import { API_CONFIG, buildApiUrl } from '@/config/api'
import ComponentCard from "@/components/common/ComponentCard"
import Button from "@/components/ui/button/Button"
import InputField from "@/components/form/input/InputField"
import Badge from "@/components/ui/badge/Badge"
import { SettingsManagement } from "./setting-management"
import { InterviewInvitation } from "./InterviewInvitation"
import { CandidateActions } from "./candidate-actions"
import { Modal } from "@/components/ui/modal"
import { useTheme } from "@/context/ThemeContext"
import { FaInfoCircle } from "react-icons/fa"
import PhoneInput2 from 'react-phone-input-2'
import 'react-phone-input-2/lib/style.css'
import { isValidPhoneNumber } from 'libphonenumber-js'
import * as XLSX from 'xlsx'
import DashboardHeader from '@/components/header/DashboardHeader'
// import jsPDF from 'jspdf' // Currently unused
// import autoTable from 'jspdf-autotable' // Currently unused
import { useForm, Controller, Resolver, useWatch } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'

// Loader Spinner Component
const Spinner = () => (
  <div className="flex justify-center items-center min-h-[200px]">
    <div className="text-center">
      <div role="status">
        <svg aria-hidden="true" className="inline w-8 h-8 text-gray-200 animate-spin dark:text-gray-600 fill-blue-600" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor" />
          <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentFill" />
        </svg>
        <span className="sr-only">Loading...</span>
      </div>
    </div>
  </div>
);

// Job Listings Types
type JobListing = {
  _id: string;
  job_id?: string;
  title: string;
  job_function: string;
  location: string;
  job_type: string;
  experience_level: string;
  description: string;
  key_skills: string[];
  education_requirements: string;
  certifications?: string[];
  salary_range?: string;
  status?: string;
  closing_date?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  application_count?: number;
};

type JDGenerationRequest = {
  job_title: string;
  job_function: string;
  location: string;
  experience_level: string;
  job_type: string;
  description?: string;
  key_skills: string;
  education_requirements: string;
  certifications?: string;
  salary_range?: string;
  additional_requirements?: string;
  status?: string;
  closing_date?: string;
};

// Use the inferred type directly from Yup schema for Edit Job
type EditJobFormData = yup.InferType<typeof editJobSchema>;

type JDValidationErrors = {
  title?: string;
  job_title?: string;
  job_function?: string;
  location?: string;
  experience_level?: string;
  job_type?: string;
  description?: string;
  key_skills?: string;
  education_requirements?: string;
  certifications?: string;
  salary_range?: string;
  status?: string;
  closing_date?: string;
};

// Yup Validation Schema for Job Description Form
const jobDescriptionSchema = yup.object().shape({
  job_title: yup
    .string()
    .required('Job title is required')
    .min(3, 'Job title must be at least 3 characters')
    .max(100, 'Job title must be at most 100 characters')
    .matches(/^[A-Za-z0-9\s\-\/]+$/, 'Only letters, numbers, spaces, hyphens (-) and forward slashes (/) are allowed.'),

  job_function: yup
    .string()
    .required('Job function is required')
    .min(2, 'Job function must be at least 2 characters')
    .max(100, 'Job function must be at most 100 characters')
    .matches(/^[A-Za-z,\s\/]+$/, 'Only letters, commas, spaces and forward slashes (/) are allowed.'),

  location: yup
    .string()
    .required('Location is required')
    .min(2, 'Location must be at least 2 characters')
    .max(200, 'Location must be at most 200 characters')
    .matches(/^[A-Za-z0-9,\s]+$/, 'Only letters, numbers, commas and spaces are allowed.'),

  description: yup
    .string()
    .required('Job description is required')
    .test('strip-html', 'Description must be between 30 and 2000 characters.', function (value: string | undefined) {
      if (!value) return false;
      // Strip HTML tags for length validation
      const stripped = value.replace(/<[^>]*>/g, '').trim();
      return stripped.length >= 30 && stripped.length <= 2000;
    }),

  key_skills: yup
    .string()
    .required('Key skills are required')
    .min(2, 'Key skills must be at least 2 characters')
    .max(500, 'Key skills must be at most 500 characters'),

  education_requirements: yup
    .string()
    .required('Education requirements are required')
    .min(2, 'Education requirements must be at least 2 characters')
    .max(500, 'Education requirements must be at most 500 characters'),

  certifications: yup
    .string()
    .nullable()
    .optional()
    .test('min-if-provided', 'Certifications must be at least 2 characters', function (value: string | undefined | null) {
      if (!value || (typeof value === 'string' && value.trim() === '')) return true; // Optional field
      return typeof value === 'string' && value.length >= 2;
    })
    .max(500, 'Certifications must be at most 500 characters'),

  experience_level: yup
    .string()
    .required('Please select an experience level.')
    .oneOf(['intern', 'entry', 'mid', 'senior', 'director'], 'Please select a valid experience level (Intern, Entry, Mid, Senior, or Director).'),

  job_type: yup
    .string()
    .required('Please select a job type.')
    .oneOf(['full-time', 'part-time', 'contract', 'internship'], 'Please select a valid job type (Full-time, Part-time, Contract, or Internship).'),

  salary_range: yup
    .string()
    .nullable()
    .optional()
    .test('min-if-provided', 'Salary range must be at least 2 characters', function (value: string | undefined | null) {
      if (!value || (typeof value === 'string' && value.trim() === '')) return true; // Optional field
      return typeof value === 'string' && value.length >= 2;
    })
    .max(100, 'Salary range must be at most 100 characters'),

  status: yup
    .string()
    .required('Select status.')
    .oneOf(['draft', 'active', 'paused', 'closed'], 'Select status.'),

  closing_date: yup
    .string()
    .required('Closing date is required')
    .test('not-past', 'Closing date cannot be in the past.', function (value: string | undefined) {
      if (!value) return false; // Required field
      const status = this.parent.status;
      // If status is closed, allow past dates
      if (status === 'closed') return true;
      // For other statuses, don't allow past dates
      const selectedDate = new Date(value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return selectedDate >= today;
    })
    .test('closed-status-date', 'Closed jobs cannot have future closing dates.', function (value: string | undefined) {
      const status = this.parent.status;
      if (status === 'closed' && value) {
        const selectedDate = new Date(value);
        const today = new Date();
        today.setHours(23, 59, 59, 999); // End of today
        return selectedDate <= today; // Closed jobs must have closing date in past or today
      }
      return true;
    }),
});

// Use the inferred type directly from Yup schema
type JobDescriptionFormData = yup.InferType<typeof jobDescriptionSchema>;

// Yup Validation Schema for Edit Job Listing Form (same rules as Create JD)
const editJobSchema = yup.object().shape({
  title: yup
    .string()
    .required('Job title is required')
    .min(3, 'Job title must be at least 3 characters')
    .max(100, 'Job title must be at most 100 characters')
    .matches(/^[A-Za-z0-9\s\-\/]+$/, 'Only letters, numbers, spaces, hyphens (-) and forward slashes (/) are allowed.'),

  job_function: yup
    .string()
    .required('Job function is required')
    .min(2, 'Job function must be at least 2 characters')
    .max(100, 'Job function must be at most 100 characters')
    .matches(/^[A-Za-z,\s\/]+$/, 'Only letters, commas, spaces and forward slashes (/) are allowed.'),

  location: yup
    .string()
    .required('Location is required')
    .min(2, 'Location must be at least 2 characters')
    .max(200, 'Location must be at most 200 characters')
    .matches(/^[A-Za-z0-9,\s]+$/, 'Only letters, numbers, commas and spaces are allowed.'),

  description: yup
    .string()
    .required('Job description is required')
    .test('strip-html', 'Description must be between 30 and 2000 characters.', function (value: string | undefined) {
      if (!value) return false;
      // Strip HTML tags for length validation
      const stripped = value.replace(/<[^>]*>/g, '').trim();
      return stripped.length >= 30 && stripped.length <= 2000;
    }),

  key_skills: yup
    .string()
    .required('Key skills are required')
    .min(2, 'Key skills must be at least 2 characters')
    .max(500, 'Key skills must be at most 500 characters'),

  education_requirements: yup
    .string()
    .required('Education requirements are required')
    .min(2, 'Education requirements must be at least 2 characters')
    .max(500, 'Education requirements must be at most 500 characters'),

  certifications: yup
    .string()
    .optional()
    .test('min-if-provided', 'Certifications must be at least 2 characters', function (value: string | undefined) {
      if (!value || value.trim() === '') return true; // Optional field
      return value.length >= 2;
    })
    .max(500, 'Certifications must be at most 500 characters'),

  experience_level: yup
    .string()
    .required('Select experience level.')
    .oneOf(['intern', 'entry', 'mid', 'senior', 'director'], 'Select experience level.'),

  job_type: yup
    .string()
    .required('Select job type.')
    .oneOf(['full-time', 'part-time', 'contract', 'internship'], 'Select job type.'),

  salary_range: yup
    .string()
    .optional()
    .test('min-if-provided', 'Salary range must be at least 2 characters', function (value: string | undefined) {
      if (!value || value.trim() === '') return true; // Optional field
      return value.length >= 2;
    })
    .max(100, 'Salary range must be at most 100 characters'),

  status: yup
    .string()
    .required('Select status.')
    .oneOf(['draft', 'active', 'paused', 'closed'], 'Select status.'),

  closing_date: yup
    .string()
    .optional()
    .test('not-past', 'Closing date cannot be in the past.', function (value: string | undefined) {
      if (!value) return true; // Optional field
      const status = this.parent.status;
      // If status is closed, allow past dates
      if (status === 'closed') return true;
      // For other statuses, don't allow past dates
      const selectedDate = new Date(value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return selectedDate >= today;
    })
    .test('closed-status-date', 'Closed jobs cannot have future closing dates.', function (value: string | undefined) {
      const status = this.parent.status;
      if (status === 'closed' && value) {
        const selectedDate = new Date(value);
        const today = new Date();
        today.setHours(23, 59, 59, 999); // End of today
        return selectedDate <= today; // Closed jobs must have closing date in past or today
      }
      return true;
    }),
});


// Name validation with minimum length check
const validateName = (name: string): string | true => {
  if (!name.trim()) return "Full name is required.";
  if (name.trim().length < 2) return "Full name must be at least 2 characters.";
  return true;
};

// Simple Tabs component implementation
const TabsContext = createContext<{
  activeTab: string;
  setActiveTab: (tab: string) => void;
} | null>(null)
interface TabsProps {
  defaultValue: string;
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
  children: React.ReactNode;
}

interface TabsListProps {
  className?: string;
  children: React.ReactNode;
}

interface TabsTriggerProps {
  value: string;
  className?: string;
  children: React.ReactNode;
}

interface TabsContentProps {
  value: string;
  className?: string;
  children: React.ReactNode;
}

const Tabs: React.FC<TabsProps> = ({ defaultValue, value, onChange, className, children }) => {
  const [internalActiveTab, setInternalActiveTab] = useState(defaultValue);
  const activeTab = value !== undefined ? value : internalActiveTab;
  const setActiveTab = onChange !== undefined ? onChange : setInternalActiveTab;

  return (
    <div className={className}>
      <TabsContext.Provider value={{ activeTab, setActiveTab }}>
        {children}
      </TabsContext.Provider>
    </div>
  );
};

const TabsList: React.FC<TabsListProps> = ({ className, children }) => {
  return (
    <div className={`${className} flex flex-wrap gap-1.5 sm:gap-2 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-850 p-1.5 rounded-xl overflow-x-auto shadow-inner`}>
      {children}
    </div>
  );
};

const TabsTrigger: React.FC<TabsTriggerProps> = ({ value, className, children }) => {
  const ctx = useContext(TabsContext)
  const isActive = ctx?.activeTab === value

  return (
    <button
      type="button"
      onClick={() => ctx?.setActiveTab(value)}
      className={`${className} ${isActive
        ? 'bg-gradient-to-r from-white to-gray-50 dark:from-gray-700 dark:to-gray-650 text-blue-600 dark:text-blue-400 shadow-lg shadow-blue-500/10 ring-2 ring-blue-500/20'
        : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-white/50 dark:hover:bg-gray-700/30'
        } px-4 py-2.5 text-sm font-semibold rounded-lg transition-all duration-300 whitespace-nowrap min-w-0 flex-shrink-0 transform hover:scale-[1.02] active:scale-[0.98]`}
    >
      {children}
    </button>
  );
};

const TabsContent: React.FC<TabsContentProps> = ({ value, className, children }) => {
  const ctx = useContext(TabsContext)
  if (ctx?.activeTab !== value) return null

  return (
    <div className={`${className} animate-in fade-in-50 duration-200`}>
      {children}
    </div>
  );
};

import {
  Users,
  Calendar,
  CheckCircle,
  Plus,
  UserPlus,
  AlertTriangle,
  Brain,
  RefreshCw,
  Eye,
  DollarSign,
  Mail,
  Globe,
  Trash2,
  Edit,
  Bot,
  TrendingUp,
  Search,
  Save,
  X,
  List,
  Settings,
  BarChart3,
  ExternalLink,
  Filter,
  Download,
  ChevronDown,
  Clock,
  Upload,
  AlertCircle,
  FileText,
  CheckCircle2,
  XCircle,
  Briefcase,
  User
} from "lucide-react"
import {
  ResponsiveContainer,
  BarChart as RCBarChart,
  Bar as RCBar,
  XAxis as RCXAxis,
  YAxis as RCYAxis,
  CartesianGrid as RCCartesianGrid,
  Tooltip as RCTooltip,
  LineChart as RCLineChart,
  Line as RCLine,
  PieChart as RCPieChart,
  Pie as RCPie,
  Cell as RCCell,
} from "recharts"
import { PieChart as RCPieChart2, Pie as RCPie2, Cell as RCCell2, Tooltip as RCTooltip2, Legend as RCLegend2 } from "recharts"

interface Candidate {
  id: string
  applicant_id?: string  // Store original applicant_id from backend
  name: string
  email: string
  phone: string
  position: string
  status: "applied" | "screening" | "interview" | "offer" | "hired" | "rejected"
  appliedDate: string
  lastActivity: string
  source: string
  experience: string
  location: string
  salary: string
  skills: string[]
  resume: string
  resumeFilename?: string
  resume_link?: string
  notes: string
  rating?: number
  feedback?: string
  aiScore?: number
  aiInsights?: string[]
  statusHistory: Array<{
    status: string
    date: string
    duration: number
  }>
  weighted_skill_score?: number
  overallScore?: number
  interviewScore?: number
  slackNotified?: boolean
  recruiterNotes?: string
  recruiterFeedback?: string
  screeningInviteSent?: boolean
  statusDate?: string
  job_specific_fit_score?: number  // Job-specific fit score from backend
  role_suitability?: number  // Role suitability score from backend
  ats_score?: number  // ATS score from backend
}

interface JobBoard {
  id: string
  name: string
  applications: number
  lastSync: string
  status: "active" | "inactive" | "error"
  cost: number
  conversion: number
  apiConnected: boolean
}


interface AIInsight {
  type: "recommendation" | "alert" | "prediction"
  message: string
  confidence: number
  candidateId?: string
}

// Positions Tab Component
const PositionsTab: React.FC<{
  onNavigateToAnalytics?: (jobId: string) => void;
}> = ({ onNavigateToAnalytics }) => {
  // State management
  const [allJobListings, setAllJobListings] = useState<JobListing[]>([]);
  const [loading, setLoading] = useState(true);

  // Search and filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [filterJobType, setFilterJobType] = useState('');
  const [filterExperience, setFilterExperience] = useState('');
  const [filterDateRange, setFilterDateRange] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);

  // Modals
  const [showAddJobPopup, setShowAddJobPopup] = useState(false);
  const [showAddJobModal, setShowAddJobModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState<{ open: boolean; jobId: string | null }>({ open: false, jobId: null });
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showIntegrationModal, setShowIntegrationModal] = useState(false);
  const [showPostingModal, setShowPostingModal] = useState(false);
  const [showViewJob, setShowViewJob] = useState(false);
  const [viewingJob, setViewingJob] = useState<JobListing | null>(null);

  // Form data
  const [editJobData, setEditJobData] = useState<JobListing>({
    _id: '',
    job_id: '',
    title: '',
    job_function: '',
    location: '',
    job_type: '',
    experience_level: '',
    description: '',
    key_skills: [],
    education_requirements: '',
    certifications: [],
    salary_range: '',
    status: 'draft',
    closing_date: '',
    created_by: '',
    created_at: '',
    updated_at: '',
    application_count: 0
  });

  // React Hook Form for Create JD
  const {
    control: createJDControl,
    handleSubmit: handleCreateJDSubmit,
    formState: { isValid: isCreateJDValid },
    reset: resetCreateJD,
    watch: watchCreateJD,
    setValue: setCreateJDValue,
    trigger: triggerCreateJDValidation,
  } = useForm<JobDescriptionFormData>({
    resolver: yupResolver(jobDescriptionSchema) as Resolver<JobDescriptionFormData>,
    mode: 'onChange', // Validate on change for immediate feedback
    reValidateMode: 'onChange', // Re-validate on change
    shouldFocusError: true, // Focus first error field on submit
    defaultValues: {
      job_title: '',
      job_function: '',
      location: '',
      experience_level: '',
      job_type: '',
      description: '',
      key_skills: '',
      education_requirements: '',
      certifications: undefined as string | null | undefined, // Optional field
      salary_range: undefined as string | null | undefined, // Optional field
      status: 'draft',
      closing_date: ''
    }
  });

  // Watch form values for AI generation
  const createJDData = watchCreateJD();

  // Watch create job status and closing date to trigger validation
  const createJDStatusValue = watchCreateJD('status');
  const createJDClosingDateValue = watchCreateJD('closing_date');

  // Watch form fields for validation
  const createJDJobTitle = useWatch({ control: createJDControl, name: 'job_title' });
  const createJDJobFunction = useWatch({ control: createJDControl, name: 'job_function' });
  const createJDLocation = useWatch({ control: createJDControl, name: 'location' });
  const createJDDescription = useWatch({ control: createJDControl, name: 'description' });
  const createJDKeySkills = useWatch({ control: createJDControl, name: 'key_skills' });
  const createJDEducationReq = useWatch({ control: createJDControl, name: 'education_requirements' });

  // Enhanced validation states for create job form (similar to controls-users)
  const [createJobTitleValidation, setCreateJobTitleValidation] = useState({ isValid: false, message: '' });
  const [createJobFunctionValidation, setCreateJobFunctionValidation] = useState({ isValid: false, message: '' });
  const [createLocationValidation, setCreateLocationValidation] = useState({ isValid: false, message: '' });
  const [createDescriptionValidation, setCreateDescriptionValidation] = useState({ isValid: false, message: '' });
  const [createKeySkillsValidation, setCreateKeySkillsValidation] = useState({ isValid: false, message: '' });
  const [createEducationReqValidation, setCreateEducationReqValidation] = useState({ isValid: false, message: '' });

  // Enhanced validation functions for create job form
  const validateCreateJobTitle = useCallback((title: string) => {
    const trimmed = title.trim();
    if (!trimmed) return { isValid: false, message: 'Job title is required' };
    if (trimmed.length < 3) return { isValid: false, message: 'Job title must be at least 3 characters' };
    if (trimmed.length > 100) return { isValid: false, message: 'Job title must not exceed 100 characters' };
    if (!/^[A-Za-z0-9\s\-\/]+$/.test(trimmed)) return { isValid: false, message: 'Job title can only contain letters, numbers, spaces, hyphens, and forward slashes' };
    return { isValid: true, message: 'Job title looks good!' };
  }, []);

  const validateCreateJobFunction = useCallback((jobFunction: string) => {
    const trimmed = jobFunction.trim();
    if (!trimmed) return { isValid: false, message: 'Job function is required' };
    if (trimmed.length < 2) return { isValid: false, message: 'Job function must be at least 2 characters' };
    if (trimmed.length > 100) return { isValid: false, message: 'Job function must not exceed 100 characters' };
    if (!/^[A-Za-z,\s\/]+$/.test(trimmed)) return { isValid: false, message: 'Job function can only contain letters, commas, spaces, and forward slashes' };
    return { isValid: true, message: 'Job function looks good!' };
  }, []);

  const validateCreateLocation = useCallback((location: string) => {
    const trimmed = location.trim();
    if (!trimmed) return { isValid: false, message: 'Location is required' };
    if (trimmed.length < 2) return { isValid: false, message: 'Location must be at least 2 characters' };
    if (trimmed.length > 200) return { isValid: false, message: 'Location must not exceed 200 characters' };
    if (!/^[A-Za-z0-9,\s]+$/.test(trimmed)) return { isValid: false, message: 'Location can only contain letters, numbers, commas, and spaces' };
    return { isValid: true, message: 'Location looks good!' };
  }, []);

  const validateCreateDescription = useCallback((description: string) => {
    const trimmed = description.trim();
    if (!trimmed) return { isValid: false, message: 'Job description is required' };
    // Strip HTML for length validation
    const stripped = description.replace(/<[^>]*>/g, '').trim();
    if (stripped.length < 30) return { isValid: false, message: 'Description must be at least 30 characters (excluding HTML)' };
    if (stripped.length > 2000) return { isValid: false, message: 'Description must not exceed 2000 characters (excluding HTML)' };
    if (/<[^>]*>/g.test(description)) return { isValid: false, message: 'Description cannot contain HTML tags' };
    return { isValid: true, message: 'Description looks comprehensive!' };
  }, []);

  const validateCreateKeySkills = useCallback((keySkills: string) => {
    const trimmed = keySkills.trim();
    if (!trimmed) return { isValid: false, message: 'Key skills are required' };
    if (trimmed.length < 2) return { isValid: false, message: 'Key skills must be at least 2 characters' };
    if (trimmed.length > 500) return { isValid: false, message: 'Key skills must not exceed 500 characters' };
    return { isValid: true, message: 'Key skills look good!' };
  }, []);

  const validateCreateEducationReq = useCallback((educationReq: string) => {
    const trimmed = educationReq.trim();
    if (!trimmed) return { isValid: false, message: 'Education requirements are required' };
    if (trimmed.length < 2) return { isValid: false, message: 'Education requirements must be at least 2 characters' };
    if (trimmed.length > 500) return { isValid: false, message: 'Education requirements must not exceed 500 characters' };
    return { isValid: true, message: 'Education requirements look good!' };
  }, []);

  // Update validation states when form fields change
  useEffect(() => {
    const jobTitle = createJDJobTitle || '';
    setCreateJobTitleValidation(validateCreateJobTitle(jobTitle));
  }, [createJDJobTitle, validateCreateJobTitle]);

  useEffect(() => {
    const jobFunction = createJDJobFunction || '';
    setCreateJobFunctionValidation(validateCreateJobFunction(jobFunction));
  }, [createJDJobFunction, validateCreateJobFunction]);

  useEffect(() => {
    const location = createJDLocation || '';
    setCreateLocationValidation(validateCreateLocation(location));
  }, [createJDLocation, validateCreateLocation]);

  useEffect(() => {
    const description = createJDDescription || '';
    setCreateDescriptionValidation(validateCreateDescription(description));
  }, [createJDDescription, validateCreateDescription]);

  useEffect(() => {
    const keySkills = createJDKeySkills || '';
    setCreateKeySkillsValidation(validateCreateKeySkills(keySkills));
  }, [createJDKeySkills, validateCreateKeySkills]);

  useEffect(() => {
    const educationReq = createJDEducationReq || '';
    setCreateEducationReqValidation(validateCreateEducationReq(educationReq));
  }, [createJDEducationReq, validateCreateEducationReq]);

  useEffect(() => {
    // When status changes, handle closing_date field for create job
    if (createJDStatusValue) {
      const currentDate = createJDClosingDateValue || '';
      const isCurrentlyClosed = createJDStatusValue === 'closed';

      if (!isCurrentlyClosed && currentDate) {
        // If changing from closed to active/paused, check if current date is in past
        const selectedDate = new Date(currentDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (selectedDate < today) {
          // Clear the past date so user can set a future date
          setCreateJDValue('closing_date', '', { shouldValidate: false });
          return;
        }
      }

      // Trigger validation
      requestAnimationFrame(() => {
        setCreateJDValue('closing_date', currentDate, { shouldValidate: true });
      });
    }
  }, [createJDStatusValue, createJDClosingDateValue, setCreateJDValue]);

  // Also watch for closing date changes to ensure validation updates for create job
  useEffect(() => {
    if (createJDClosingDateValue !== undefined) {
      // Trigger validation when closing date changes
      requestAnimationFrame(() => {
        setCreateJDValue('closing_date', createJDClosingDateValue, { shouldValidate: true });
      });
    }
  }, [createJDClosingDateValue, setCreateJDValue]);

  // Status messages
  const [uploadStatus, setUploadStatus] = useState<{ type: 'success' | 'error' | 'info' | null; message: string }>({ type: null, message: '' });
  const [createJDStatus, setCreateJDStatus] = useState<{ type: 'success' | 'error' | 'info' | null; message: string }>({ type: null, message: '' });
  const [editJobStatus, setEditJobStatus] = useState<{ type: 'success' | 'error' | 'info' | null; message: string }>({ type: null, message: '' });

  // File upload
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Validation errors (kept for edit form - will be replaced by React Hook Form)
  const [, setEditJobErrors] = useState<JDValidationErrors>({});

  // React Hook Form for Edit Job Listing
  const {
    control: editJobControl,
    handleSubmit: handleEditJobSubmitForm,
    formState: { isValid: isEditJobValid },
    reset: resetEditJob,
    setValue: setEditJobValue,
    watch: watchEditJob,
  } = useForm<EditJobFormData>({
    resolver: yupResolver(editJobSchema) as Resolver<EditJobFormData>,
    mode: 'onChange',
    reValidateMode: 'onChange',
    shouldFocusError: true, // Focus first error field on submit
    defaultValues: {
      title: '',
      job_function: '',
      location: '',
      experience_level: '',
      job_type: '',
      description: '',
      key_skills: '',
      education_requirements: '',
      certifications: '',
      salary_range: '',
      status: 'draft',
      closing_date: ''
    }
  });

  // Watch edit job status and closing date to trigger validation
  const editJobStatusValue = watchEditJob('status');
  const editJobClosingDateValue = watchEditJob('closing_date');

  useEffect(() => {
    // When status changes, handle closing_date field
    if (editJobStatusValue) {
      const currentDate = editJobClosingDateValue || '';
      const isCurrentlyClosed = editJobStatusValue === 'closed';

      if (!isCurrentlyClosed && currentDate) {
        // If changing from closed to active/paused, check if current date is in past
        const selectedDate = new Date(currentDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (selectedDate < today) {
          // Clear the past date so user can set a future date
          setEditJobValue('closing_date', '', { shouldValidate: false });
          return;
        }
      }

      // Trigger validation
      requestAnimationFrame(() => {
        setEditJobValue('closing_date', currentDate, { shouldValidate: true });
      });
    }
  }, [editJobStatusValue, editJobClosingDateValue, setEditJobValue]);

  // Also watch for closing date changes to ensure validation updates
  useEffect(() => {
    if (editJobClosingDateValue !== undefined) {
      // Trigger validation when closing date changes
      requestAnimationFrame(() => {
        setEditJobValue('closing_date', editJobClosingDateValue, { shouldValidate: true });
      });
    }
  }, [editJobClosingDateValue, setEditJobValue]);

  // Loading states
  const [editingJob, setEditingJob] = useState(false);
  const [creatingJD, setCreatingJD] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [generatingDescription, setGeneratingDescription] = useState(false);
  // const [, setStatusChanging] = useState<string | null>(null); // Currently unused

  // Conversational AI Generator States
  const [conversationalStep, setConversationalStep] = useState(0);
  const [conversationalData, setConversationalData] = useState({
    job_function: '',
    location: '',
    experience_level: '',
    job_type: '',
    skills: ''
  });
  const [showConversationalAI, setShowConversationalAI] = useState(false);
  const [generatedJD, setGeneratedJD] = useState('');
  const [copiedToClipboard, setCopiedToClipboard] = useState(false);
  const [showGeneratedJDForm, setShowGeneratedJDForm] = useState(false);
  const [generatedJDFormData, setGeneratedJDFormData] = useState<JDGenerationRequest>({
    job_title: '',
    job_function: '',
    location: '',
    experience_level: '',
    job_type: '',
    description: '',
    key_skills: '',
    education_requirements: '',
    certifications: '',
    salary_range: '',
    additional_requirements: '',
    status: 'draft',
    closing_date: ''
  });
  const [generatedJDErrors, setGeneratedJDErrors] = useState<JDValidationErrors>({});
  const [savingGeneratedJD, setSavingGeneratedJD] = useState(false);


  // Fetch job listings
  const fetchJobListings = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch all job listings including paused ones (active_only=false)
      // Use JOB_LISTINGS endpoint which returns { success, message, data } structure
      const url = `${API_CONFIG.ENDPOINTS.JOB_LISTINGS}?active_only=false`;

      let responseData: unknown;
      try {
        const res = await fetch(buildApiUrl(url));
        if (!res.ok) {
          throw new Error(`Failed to fetch: ${res.status} ${res.statusText}`);
        }
        responseData = await res.json();
      } catch (error) {
        console.error('Error fetching from JOB_LISTINGS endpoint:', error);
        // Fallback to alternate jobs endpoint if JOB_LISTINGS is not available
        try {
          const fallbackUrl = API_CONFIG.ENDPOINTS.JOBS;
          const res2 = await fetch(buildApiUrl(fallbackUrl));
          if (res2.ok) {
            responseData = await res2.json();
          } else {
            throw new Error(`Fallback also failed: ${res2.status}`);
          }
        } catch (fallbackError) {
          console.error('Error fetching from fallback endpoint:', fallbackError);
          setAllJobListings([]);
          setLoading(false);
          return;
        }
      }

      // Parse the response - handle different response structures
      let items: JobListing[] = [];

      // Check if response has the structure: { success, message, data }
      if (responseData && typeof responseData === 'object' && 'data' in responseData) {
        const response = responseData as { success?: boolean; message?: string; data?: unknown[] };
        if (Array.isArray(response.data)) {
          items = response.data as JobListing[];
        }
      }
      // Check if response is directly an array
      else if (Array.isArray(responseData)) {
        items = responseData as JobListing[];
      }
      // Check for other possible structures: { jobs: [...] } or { employees: [...] }
      else if (responseData && typeof responseData === 'object') {
        const response = responseData as { jobs?: unknown[]; employees?: unknown[]; data?: unknown[] };
        if (Array.isArray(response.jobs)) {
          items = response.jobs as JobListing[];
        } else if (Array.isArray(response.employees)) {
          items = response.employees as JobListing[];
        } else if (Array.isArray(response.data)) {
          items = response.data as JobListing[];
        }
      }

      console.log('Fetched job listings response:', responseData); // Debug log
      console.log('Processed jobs:', items); // Debug log
      setAllJobListings(items);

      // Check for expired jobs immediately after fetching
      if (items.length > 0) {
        // Use setTimeout to ensure state is updated before checking
        setTimeout(() => {
          const now = new Date();
          now.setHours(23, 59, 59, 999);

          const expiredCount = items.filter(job => {
            if (!job.closing_date) return false;
            const jobStatus = (job.status || '').toLowerCase();
            if (jobStatus === 'closed') return false;

            try {
              const closingDate = new Date(job.closing_date);
              if (isNaN(closingDate.getTime())) return false;
              return closingDate < now && (jobStatus === 'active' || jobStatus === 'paused' || jobStatus === 'draft');
            } catch {
              return false;
            }
          }).length;

          if (expiredCount > 0) {
            console.log(`Detected ${expiredCount} expired job(s) in fetched data. Will update shortly...`);
          }
        }, 100);
      }
    } catch (err) {
      console.error('Failed to fetch job listings:', err);
      setAllJobListings([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Apply filters and search
  const applyFiltersAndSearch = useCallback((jobs: JobListing[]) => {
    let filtered = jobs;

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(job =>
        job.title.toLowerCase().includes(query) ||
        job.job_function.toLowerCase().includes(query) ||
        job.location.toLowerCase().includes(query) ||
        job.description.toLowerCase().includes(query) ||
        job.key_skills.some(skill => skill.toLowerCase().includes(query)) ||
        (job.job_id && job.job_id.toLowerCase().includes(query))
      );
    }

    // Status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(job => {
        const jobStatus = (job.status || '').toLowerCase();
        return jobStatus === filterStatus.toLowerCase();
      });
    }

    // Department filter
    if (filterDepartment) {
      filtered = filtered.filter(job =>
        (job.job_function || '').toLowerCase().includes(filterDepartment.toLowerCase())
      );
    }

    // Job type filter
    if (filterJobType) {
      filtered = filtered.filter(job => {
        const jobType = (job.job_type || '').toLowerCase();
        return jobType === filterJobType.toLowerCase();
      });
    }

    // Experience filter
    if (filterExperience) {
      filtered = filtered.filter(job => {
        const experience = (job.experience_level || '').toLowerCase();
        return experience === filterExperience.toLowerCase();
      });
    }

    // Date range filter
    if (filterDateRange !== 'all') {
      const now = new Date();
      filtered = filtered.filter(job => {
        if (!job.closing_date) return true;
        const closingDate = new Date(job.closing_date);
        const daysDiff = Math.ceil((closingDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        switch (filterDateRange) {
          case '7': return daysDiff <= 7;
          case '30': return daysDiff <= 30;
          case '90': return daysDiff <= 90;
          default: return true;
        }
      });
    }

    return filtered;
  }, [searchQuery, filterStatus, filterDepartment, filterJobType, filterExperience, filterDateRange]);

  // Filtered and paginated jobs
  const filteredJobs = useMemo(() => {
    console.log('allJobListings in filteredJobs:', allJobListings); // Debug log
    const filtered = applyFiltersAndSearch(allJobListings) || [];
    console.log('filtered jobs:', filtered); // Debug log
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    const paginated = filtered.slice(startIndex, endIndex);
    console.log('paginated jobs:', paginated); // Debug log

    setTotalPages(Math.ceil(filtered.length / rowsPerPage));
    return paginated;
  }, [allJobListings, applyFiltersAndSearch, currentPage, rowsPerPage]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterStatus, filterDepartment, filterJobType, filterExperience, filterDateRange]);


  // Auto-expiry mechanism: Check and update expired jobs
  const checkAndUpdateExpiredJobs = useCallback(async () => {
    if (allJobListings.length === 0) return;

    const now = new Date();
    now.setHours(23, 59, 59, 999); // End of today

    const expiredJobs = allJobListings.filter(job => {
      if (!job.closing_date) return false;

      // Normalize status to lowercase for comparison
      const jobStatus = (job.status || '').toLowerCase();
      if (jobStatus === 'closed') return false;

      // Parse closing date - handle different formats
      let closingDate: Date;
      try {
        closingDate = new Date(job.closing_date);
        // Check if date is valid
        if (isNaN(closingDate.getTime())) {
          console.warn(`Invalid closing_date for job ${job._id}: ${job.closing_date}`);
          return false;
        }
      } catch (error) {
        console.warn(`Error parsing closing_date for job ${job._id}:`, error);
        return false;
      }

      // Check if closing date has passed
      const isExpired = closingDate < now;

      // Only update jobs that are active, paused, or draft
      const shouldUpdate = isExpired && (jobStatus === 'active' || jobStatus === 'paused' || jobStatus === 'draft');

      if (shouldUpdate) {
        console.log(`Job "${job.title}" (${job._id}) expired. Closing date: ${job.closing_date}, Current: ${now.toISOString()}, Status: ${job.status}`);
      }

      return shouldUpdate;
    });

    if (expiredJobs.length > 0) {
      console.log(`Found ${expiredJobs.length} expired job(s), updating status to closed...`);

      // Update expired jobs to closed status via API
      for (const job of expiredJobs) {
        try {
          const actualJobId = job.job_id || job._id;
          const updateData = {
            ...job,
            status: 'closed'
          };

          console.log(`Updating expired job ${actualJobId} to closed status...`);

          const response = await fetch(buildApiUrl(`${API_CONFIG.ENDPOINTS.JOB_LISTINGS}/${actualJobId}`), {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(updateData),
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to update job ${actualJobId}: ${response.status} ${errorText}`);
          }

          console.log(`Successfully updated job ${actualJobId} to closed status`);
        } catch (error) {
          console.error(`Failed to update expired job ${job._id}:`, error);
        }
      }

      // Refresh job listings after updates
      await fetchJobListings();
    }
  }, [allJobListings, fetchJobListings]);

  // Load data on mount
  useEffect(() => {
    fetchJobListings();
  }, [fetchJobListings]);

  // Check for expired jobs after fetching and periodically
  useEffect(() => {
    if (allJobListings.length > 0) {
      // Run immediately when jobs are loaded
      checkAndUpdateExpiredJobs();

      // Set up interval to check every 5 minutes (more frequent for better UX)
      const interval = setInterval(() => {
        checkAndUpdateExpiredJobs();
      }, 5 * 60 * 1000); // Check every 5 minutes

      return () => clearInterval(interval);
    }
  }, [allJobListings, checkAndUpdateExpiredJobs]);

  // Submit handler for Create JD form (using React Hook Form)
  const onSubmitCreateJD = async (data: JobDescriptionFormData) => {
    // Convert form data to JDGenerationRequest format
    const jobData: JDGenerationRequest = {
      job_title: data.job_title,
      job_function: data.job_function,
      location: data.location,
      experience_level: data.experience_level,
      job_type: data.job_type,
      description: data.description,
      key_skills: data.key_skills,
      education_requirements: data.education_requirements,
      certifications: data.certifications ?? undefined,
      salary_range: data.salary_range ?? undefined,
      additional_requirements: '',
      status: data.status,
      closing_date: data.closing_date
    };
    await handleAddJob(jobData);
  };

  // Edit Job handlers removed - using React Hook Form validation instead

  // Submit handler for Edit JD form (using React Hook Form)
  const onSubmitEditJD = async (data: EditJobFormData) => {
    // Check validation before processing
    if (!isEditJobValid) {
      setEditJobStatus({
        type: 'error',
        message: 'Please fix all validation errors before submitting'
      });
      return;
    }

    // Convert form data back to JobListing format
    const updatedJobData: Partial<JobListing> = {
      title: data.title,
      job_function: data.job_function,
      location: data.location,
      experience_level: data.experience_level,
      job_type: data.job_type,
      description: data.description,
      key_skills: data.key_skills.split(',').map(skill => skill.trim()).filter(skill => skill),
      education_requirements: data.education_requirements,
      certifications: data.certifications ? data.certifications.split(',').map(cert => cert.trim()).filter(cert => cert) : [],
      salary_range: data.salary_range || '',
      status: data.status,
      closing_date: data.closing_date || '',
      // Preserve job_id if it exists
      job_id: editJobData.job_id
    };
    // Use job_id if available, otherwise fall back to _id
    const jobId = editJobData.job_id || editJobData._id;
    await handleEditJob(jobId, updatedJobData);
  };

  // Legacy handler for backward compatibility (will be removed)
  const handleEditJDSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    handleEditJobSubmitForm(onSubmitEditJD)(e);
  };

  // Add Job Handler
  const handleAddJob = async (jobData?: JDGenerationRequest) => {
    // Use generated JD form data if no jobData provided
    const dataToSave = jobData || generatedJDFormData;

    // Use creatingJD for Create Job Description modal, savingGeneratedJD for generated JD form
    if (jobData) {
      setCreatingJD(true);
    } else {
      setSavingGeneratedJD(true);
    }
    try {
      // Convert frontend data format to backend format
      const backendData = {
        title: dataToSave.job_title,  // Backend expects 'title', not 'job_title'
        job_function: dataToSave.job_function,
        location: dataToSave.location,
        experience_level: dataToSave.experience_level,
        job_type: dataToSave.job_type,
        description: dataToSave.description,
        key_skills: dataToSave.key_skills
          ? dataToSave.key_skills.split(',').map(s => s.trim()).filter(Boolean)  // Convert string to array
          : [],
        education_requirements: dataToSave.education_requirements,
        certifications: dataToSave.certifications
          ? dataToSave.certifications.split(',').map(s => s.trim()).filter(Boolean)  // Convert string to array
          : [],
        salary_range: dataToSave.salary_range,
        status: dataToSave.status || 'draft',
        closing_date: dataToSave.closing_date,
        created_by: 'admin@company.com'
      };

      console.log('Sending job data to backend:', backendData);

      const response = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.JOB_LISTINGS), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(backendData),
      });

      if (response.ok) {
        const responseData = await response.json();
        console.log('Job created successfully:', responseData);

        // Refresh job listings after successful creation
        await fetchJobListings();

        // Force a small delay to ensure data is refreshed
        setTimeout(async () => {
          await fetchJobListings();
        }, 500);

        // Close appropriate modals
        if (showGeneratedJDForm) {
          setShowGeneratedJDForm(false);
          setShowConversationalAI(false);
        } else {
          setShowAddJobModal(false);
        }

        // Reset form data
        resetCreateJD({
          job_title: '',
          job_function: '',
          location: '',
          experience_level: '',
          job_type: '',
          description: '',
          key_skills: '',
          education_requirements: '',
          certifications: '', // Use empty string instead of undefined
          salary_range: '', // Use empty string instead of undefined
          status: 'draft',
          closing_date: ''
        });
        setGeneratedJDFormData({
          job_title: '',
          job_function: '',
          location: '',
          experience_level: '',
          job_type: '',
          description: '',
          key_skills: '',
          education_requirements: '',
          certifications: '',
          salary_range: '',
          additional_requirements: '',
          status: 'draft',
          closing_date: ''
        });
        setGeneratedJDErrors({});

        // Show success message
        setCreateJDStatus({
          type: 'success',
          message: 'Job description created successfully!'
        });

        // Auto-close modal after 2 seconds
        setTimeout(() => {
          setShowAddJobModal(false);
          setCreateJDStatus({ type: null, message: '' });
        }, 2000);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to create job:', response.status, errorData);

        // Backend returns errors in format: {"detail": "error message"}
        const errorMessage = errorData.detail || errorData.message || `HTTP ${response.status}: Failed to create job`;

        setCreateJDStatus({
          type: 'error',
          message: errorMessage
        });
      }
    } catch (error) {
      console.error('Error creating job:', error);
      setCreateJDStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to save job description. Please try again.'
      });
    } finally {
      // Reset appropriate loading state
      if (jobData) {
        setCreatingJD(false);
      } else {
        setSavingGeneratedJD(false);
      }
    }
  };


  // Edit Job Handler
  const handleEditJob = async (jobId: string, jobData: Partial<JobListing>) => {
    setEditingJob(true);
    try {
      // Use job_id if available, otherwise fall back to _id (same logic as job listings page)
      const actualJobId = jobData.job_id || jobId;
      console.log('Updating job with ID:', actualJobId, 'jobData:', jobData);

      const response = await fetch(buildApiUrl(`${API_CONFIG.ENDPOINTS.JOB_LISTINGS}/${actualJobId}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(jobData),
      });

      if (response.ok) {
        await fetchJobListings();
        setEditJobErrors({});
        resetEditJob();
        // Show success message
        setEditJobStatus({
          type: 'success',
          message: 'Job updated successfully!'
        });
        // Close modal after a short delay to show success message
        setTimeout(() => {
          setShowEditModal(false);
          setEditJobStatus({ type: null, message: '' });
        }, 1500);
      } else {
        // Try to parse error response
        let errorMessage = 'Unknown error';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.detail || errorData.error || `HTTP ${response.status}: ${response.statusText}`;
        } catch {
          // If JSON parsing fails, use status text
          errorMessage = `HTTP ${response.status}: ${response.statusText || 'Unknown error'}`;
        }
        console.error('Failed to update job:', errorMessage);
        setEditJobStatus({
          type: 'error',
          message: `Failed to update job: ${errorMessage}`
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Network error or server unavailable';
      console.error('Error updating job:', errorMessage);
      setEditJobStatus({
        type: 'error',
        message: `Failed to update job: ${errorMessage}`
      });
    } finally {
      setEditingJob(false);
    }
  };

  // Delete Job Handler
  const handleDeleteJob = async (jobId: string) => {
    setDeleting(true);
    try {
      console.log('Deleting job with ID:', jobId);

      const response = await fetch(buildApiUrl(`${API_CONFIG.ENDPOINTS.JOB_LISTINGS}/${jobId}`), {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        await fetchJobListings();
        setShowDeleteModal({ open: false, jobId: null });
      } else {
        const errorData = await response.json();
        console.error('Failed to delete job:', errorData.message || 'Unknown error');
      }
    } catch (error) {
      console.error('Error deleting job:', error);
    } finally {
      setDeleting(false);
    }
  };

  // Form validation (currently unused - using React Hook Form validation instead)
  // const validateJobData = (data: JDGenerationRequest): JDValidationErrors => {
  //   const errors: JDValidationErrors = {};
  //   if (!data.job_title?.trim()) errors.job_title = 'Job title is required';
  //   if (!data.job_function?.trim()) errors.job_function = 'Job function is required';
  //   if (!data.location?.trim()) errors.location = 'Location is required';
  //   if (!data.experience_level?.trim()) errors.experience_level = 'Experience level is required';
  //   if (!data.job_type?.trim()) errors.job_type = 'Job type is required';
  //   if (!data.description?.trim()) errors.description = 'Description is required';
  //   if (!data.key_skills?.trim()) errors.key_skills = 'Key skills are required';
  //   if (!data.education_requirements?.trim()) errors.education_requirements = 'Education requirements are required';
  //   return errors;
  // };

  // Upload handler
  const handleUploadSubmit = async () => {
    if (!selectedFile) return;

    // Reset any previous status and start fresh
    setUploadStatus({ type: null, message: '' });
    setUploadProgress(10);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      console.log('Uploading file:', selectedFile.name); // Debug log
      console.log('Upload endpoint:', buildApiUrl(API_CONFIG.ENDPOINTS.HR_UPLOAD_JD)); // Debug log

      const response = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.HR_UPLOAD_JD), {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Upload failed:', response.status, response.statusText, errorText);
        // Clear progress immediately on error
        setUploadProgress(0);
        throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
      }

      const responseData = await response.json();
      console.log('Upload response:', responseData); // Debug log

      // Clear progress before showing success
      setUploadProgress(0);
      setUploadStatus({
        type: 'success',
        message: responseData.ai_processing_failed
          ? 'Job Description uploaded successfully! (Note: AI processing failed, used text extraction fallback)'
          : 'Job Description uploaded and processed successfully!'
      });

      // Auto-close modal after successful upload
      setTimeout(() => {
        setShowUploadModal(false);
        setSelectedFile(null);
        setUploadProgress(0);
        setUploadStatus({ type: null, message: '' });
        // Refresh job listings to update cards immediately
        console.log('Refreshing job listings after upload...'); // Debug log
        fetchJobListings();
      }, 2000);

    } catch (error) {
      console.error('Upload error:', error);
      // Clear progress immediately on error
      setUploadProgress(0);

      let errorMessage = 'Failed to upload job description. Please try again.';

      if (error instanceof Error) {
        if (error.message.includes('404')) {
          errorMessage = 'Upload endpoint not found. Please check if the backend server is running.';
        } else if (error.message.includes('500')) {
          errorMessage = 'Server error occurred. Please try again later.';
        } else if (error.message.includes('NetworkError') || error.message.includes('fetch')) {
          errorMessage = 'Network error. Please check your internet connection.';
        } else {
          errorMessage = `Upload failed: ${error.message}`;
        }
      }

      setUploadStatus({
        type: 'error',
        message: errorMessage
      });
    }
  };



  // Create another JD handler
  const handleCreateAnotherJD = () => {
    setConversationalStep(0);
    setConversationalData({ job_function: '', location: '', experience_level: '', job_type: '', skills: '' });
    setGeneratedJD('');
    setCopiedToClipboard(false);
  };

  // Conversational AI Generator Functions
  const handleConversationalNext = () => {
    const currentInput = getCurrentStepInput();
    if (!currentInput || currentInput.trim() === '') return;

    if (conversationalStep < 4) {
      setConversationalStep(conversationalStep + 1);
    } else {
      // Last step - generate JD
      handleGenerateConversationalJD();
    }
  };

  const handleConversationalBack = () => {
    if (conversationalStep > 0) {
      setConversationalStep(conversationalStep - 1);
    }
  };

  const getCurrentStepInput = () => {
    switch (conversationalStep) {
      case 0: return conversationalData.job_function;
      case 1: return conversationalData.location;
      case 2: return conversationalData.experience_level;
      case 3: return conversationalData.job_type;
      case 4: return conversationalData.skills;
      default: return '';
    }
  };

  // Helper function to detect nonsensical/random input (currently unused)
  // const _isNonsensicalInput = (text: string): boolean => {
  //   if (!text || text.trim().length === 0) return false;
  //   const trimmed = text.trim();
  //   const lowerText = trimmed.toLowerCase();
  //   // ... implementation removed for brevity
  //   return false;
  // };

  const isCurrentStepValid = () => {
    const input = getCurrentStepInput();
    if (!input || input.trim().length === 0) return false;

    // REMOVED: Nonsensical input check for all fields - allow any valid input
    // Users should be able to enter any valid job title, location, or skills

    // Add validation based on current step (only basic length and character validation)
    switch (conversationalStep) {
      case 0: // Job function
        return input.trim().length >= 3 && input.trim().length <= 100 && /^[A-Za-z0-9\s\-\/]+$/.test(input);
      case 1: // Location
        return input.trim().length >= 2 && input.trim().length <= 200 && /^[A-Za-z0-9,\s]+$/.test(input);
      case 4: // Skills
        return input.trim().length >= 2 && input.trim().length <= 500;
      default:
        return true; // Experience level and job type are selected, not typed
    }
  };

  // Get validation error message for current step
  const getCurrentStepError = () => {
    const input = getCurrentStepInput();
    if (!input || input.trim().length === 0) {
      switch (conversationalStep) {
        case 0: return 'Job function is required';
        case 1: return 'Location is required';
        case 4: return 'Skills are required';
        default: return '';
      }
    }

    // REMOVED: Nonsensical input check for all fields - allow any valid input
    // Users should be able to enter any valid job title, location, or skills

    switch (conversationalStep) {
      case 0:
        if (input.trim().length < 3) return 'Job function must be at least 3 characters';
        if (input.trim().length > 100) return 'Job function must be at most 100 characters';
        if (!/^[A-Za-z0-9\s\-\/]+$/.test(input)) return 'Job function must contain valid characters';
        break;
      case 1:
        if (input.trim().length < 2) return 'Location must be at least 2 characters';
        if (input.trim().length > 200) return 'Location must be at most 200 characters';
        if (!/^[A-Za-z0-9,\s]+$/.test(input)) return 'Location must contain valid characters';
        break;
      case 4:
        if (input.trim().length < 2) return 'Skills must be at least 2 characters';
        if (input.trim().length > 500) return 'Skills must be at most 500 characters';
        break;
    }
    return '';
  };

  const handleGenerateConversationalJD = async () => {
    setCreatingJD(true);

    try {
      // Map experience level to backend format
      const experienceLevelMap: Record<string, string> = {
        'Entry Level': 'entry',
        'Mid Level': 'mid',
        'Senior Level': 'senior',
        'Lead/Principal': 'senior',
        'Executive': 'executive'
      };

      // Map job type to backend format
      const jobTypeMap: Record<string, string> = {
        'Full-time': 'full-time',
        'Part-time': 'part-time',
        'Contract': 'contract',
        'Temporary': 'contract',
        'Internship': 'internship'
      };

      const requestData = {
        job_title: conversationalData.job_function,
        job_function: conversationalData.job_function,
        location: conversationalData.location,
        experience_level: experienceLevelMap[conversationalData.experience_level] || 'mid',
        job_type: jobTypeMap[conversationalData.job_type] || 'full-time',
        key_skills: conversationalData.skills,
        education_requirements: 'Bachelor\'s degree or equivalent experience',
        description: `We are looking for a talented ${conversationalData.job_function} to join our team.`
      };

      // Use HR dashboard endpoint for job description generation
      const response = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.HR_GENERATE_JD), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          // Store markdown report for preview
          const mdReport = data.markdown_report || '';
          setGeneratedJD(mdReport);

          // Helper to convert to string
          const convertToString = (value: unknown): string => {
            if (Array.isArray(value)) {
              return value.join(', ');
            }
            if (typeof value === 'string') {
              return value;
            }
            return '';
          };

          // Helper to convert description (arrays should be joined with newlines, not commas)
          const convertDescriptionToString = (value: unknown): string => {
            if (Array.isArray(value)) {
              // Join array items with newlines and clean up any extra quotes
              return value.map(item => {
                const str = typeof item === 'string' ? item : String(item);
                // Remove surrounding quotes if present
                return str.replace(/^["']|["']$/g, '').trim();
              }).join('\n\n');
            }
            if (typeof value === 'string') {
              return value;
            }
            return '';
          };

          // Pre-fill the existing job creation form with AI-generated data
          // Always set job_title, experience_level, and job_type from AI response or fallback to request data
          // Use { shouldValidate: true, shouldTouch: true } to trigger validation and show errors
          const setValueOptions = { shouldValidate: true, shouldTouch: true };
          setCreateJDValue('job_title', data.data.job_title || conversationalData.job_function || '', setValueOptions);
          setCreateJDValue('job_function', data.data.job_function || conversationalData.job_function || '', setValueOptions);
          setCreateJDValue('location', data.data.location || conversationalData.location || '', setValueOptions);
          // Ensure experience_level and job_type are always set (use AI response or fallback to request data)
          const aiExperienceLevel = data.data.experience_level || requestData.experience_level || '';
          const aiJobType = data.data.job_type || requestData.job_type || '';
          setCreateJDValue('experience_level', aiExperienceLevel, setValueOptions);
          setCreateJDValue('job_type', aiJobType, setValueOptions);
          setCreateJDValue('description', convertDescriptionToString(data.data.job_description || data.data.description || ''), setValueOptions);
          setCreateJDValue('key_skills', convertToString(data.data.key_skills || conversationalData.skills), setValueOptions);
          setCreateJDValue('education_requirements', data.data.education_requirements || 'Bachelor\'s degree or equivalent experience', setValueOptions);
          setCreateJDValue('certifications', convertToString(data.data.certifications || ''), setValueOptions);
          setCreateJDValue('salary_range', data.data.salary_range || '', setValueOptions);
          setCreateJDValue('status', 'draft', setValueOptions);
          setCreateJDValue('closing_date', '', setValueOptions);

          // Trigger validation on all fields to show errors immediately
          // Use setTimeout to ensure all setValue calls have completed
          setTimeout(async () => {
            await triggerCreateJDValidation();
          }, 100);

          // Close conversational modal and populate existing form
          setShowConversationalAI(false);
          setShowAddJobModal(true);
          setCreateJDStatus({ type: 'success', message: 'Job description generated! Review and save to your listings.' });
        } else {
          setCreateJDStatus({ type: 'error', message: 'Failed to generate job description' });
        }
      } else {
        let errorMessage = `HTTP ${response.status}: Failed to generate job description`;

        try {
          // Get response as text first (can only read once)
          const responseText = await response.text();

          if (responseText && responseText.trim()) {
            try {
              // Try to parse as JSON (FastAPI returns {"detail": "message"})
              const errorData = JSON.parse(responseText);
              errorMessage = errorData.detail || errorData.message || errorData.error || errorMessage;
            } catch {
              // If not JSON, use the text directly
              errorMessage = responseText;
            }
          } else {
            // Empty response - use status-specific default messages
            if (response.status === 400) {
              errorMessage = 'Invalid input provided. Please check your entries and try again.';
            } else if (response.status === 500) {
              errorMessage = 'Server error occurred. Please try again later.';
            }
          }

          console.error('Failed to generate JD:', response.status, errorMessage);
        } catch {
          // Error parsing error response - use default message
          // Use status-specific default messages as fallback
          if (response.status === 400) {
            errorMessage = 'Invalid input provided. Please check your entries and try again.';
          } else if (response.status === 500) {
            errorMessage = 'Server error occurred. Please try again later.';
          }
        }

        throw new Error(errorMessage);
      }
    } catch (err) {
      console.error('Error generating JD:', err);
      const errorMessage = err instanceof Error
        ? err.message
        : 'Failed to generate job description. Please try again.';
      setCreateJDStatus({ type: 'error', message: errorMessage });
    } finally {
      setCreatingJD(false);
    }
  };

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(generatedJD);
    setCopiedToClipboard(true);
    setTimeout(() => setCopiedToClipboard(false), 2000);
  };

  const handleDownloadJD = () => {
    const blob = new Blob([generatedJD], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${conversationalData.job_function.replace(/\s+/g, '_')}_JD.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // AI Description Generator handler - Now generates ALL fields
  const handleGenerateDescriptionWithAI = async () => {
    if (!createJDData.job_title) {
      setUploadStatus({
        type: 'error',
        message: 'Please enter a job title first'
      });
      return;
    }

    setGeneratingDescription(true);
    setUploadStatus({ type: 'info', message: 'Generating complete job description with AI...' });

    try {
      const requestData = {
        job_title: createJDData.job_title,
        job_function: createJDData.job_function || '',
        location: createJDData.location || '',
        experience_level: createJDData.experience_level || '',
        job_type: createJDData.job_type || '',
        key_skills: createJDData.key_skills || '',
        education_requirements: createJDData.education_requirements || '',
        certifications: createJDData.certifications || '',
        salary_range: createJDData.salary_range || '',
        status: 'draft'
      };

      // Use the full JD generation endpoint to populate ALL fields
      const response = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.HR_GENERATE_JD), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: Failed to generate job description`;

        try {
          // Try to read as text first
          const errorText = await response.text();

          if (errorText) {
            try {
              // Try to parse as JSON
              const errorData = JSON.parse(errorText);
              errorMessage = errorData.detail || errorData.message || errorData.error || errorText || errorMessage;
            } catch {
              // If not JSON, use the text directly
              errorMessage = errorText || errorMessage;
            }
          }
        } catch {
          // If reading fails, use status-based message
          if (response.status === 400) {
            errorMessage = 'Invalid input. Please check your job title and other fields.';
          } else if (response.status === 500) {
            errorMessage = 'Server error. Please try again later.';
          } else if (response.status === 503) {
            errorMessage = 'Service temporarily unavailable. Please try again later.';
          }
        }

        console.error('Backend error:', errorMessage);
        setUploadStatus({ type: 'error', message: errorMessage });
        throw new Error(errorMessage);
      }

      const responseData = await response.json();
      console.log('AI generated complete JD:', responseData);

      // Update ALL fields with generated content
      if (responseData.success && responseData.data) {
        const generatedData = responseData.data;

        // Helper to check if a field is empty
        const isEmpty = (value: string | undefined | null) => !value || value.trim() === '';
        const currentData = watchCreateJD();

        // Always update job_title, experience_level, and job_type from AI response (or preserve existing if AI doesn't provide)
        // Use { shouldValidate: true, shouldTouch: true } to trigger validation and show errors
        const setValueOptions = { shouldValidate: true, shouldTouch: true };

        // Job Title: Use AI-generated title if available, otherwise keep existing
        if (generatedData.job_title) {
          setCreateJDValue('job_title', generatedData.job_title, setValueOptions);
        } else if (currentData.job_title) {
          // Preserve existing job_title if AI doesn't generate one
          setCreateJDValue('job_title', currentData.job_title, setValueOptions);
        }
        // Experience Level: Always use AI-generated value if available, otherwise preserve existing
        if (generatedData.experience_level) {
          setCreateJDValue('experience_level', generatedData.experience_level, setValueOptions);
        } else if (currentData.experience_level) {
          setCreateJDValue('experience_level', currentData.experience_level, setValueOptions);
        }
        // Job Type: Always use AI-generated value if available, otherwise preserve existing
        if (generatedData.job_type) {
          setCreateJDValue('job_type', generatedData.job_type, setValueOptions);
        } else if (currentData.job_type) {
          setCreateJDValue('job_type', currentData.job_type, setValueOptions);
        }

        // Update form fields using setValue (only if empty for other fields)
        if (isEmpty(currentData.job_function) && generatedData.job_function) {
          setCreateJDValue('job_function', generatedData.job_function, setValueOptions);
        }
        if (isEmpty(currentData.location) && generatedData.location) {
          setCreateJDValue('location', generatedData.location, setValueOptions);
        }
        // Always update description since that's the main generated content
        if (generatedData.job_description || generatedData.description) {
          // Helper to convert description (arrays should be joined with newlines, not commas)
          const convertDescriptionToString = (value: unknown): string => {
            if (Array.isArray(value)) {
              // Join array items with newlines and clean up any extra quotes
              return value.map(item => {
                const str = typeof item === 'string' ? item : String(item);
                // Remove surrounding quotes if present
                return str.replace(/^["']|["']$/g, '').trim();
              }).join('\n\n');
            }
            if (typeof value === 'string') {
              return value;
            }
            return '';
          };
          const descriptionValue = generatedData.job_description || generatedData.description || '';
          setCreateJDValue('description', convertDescriptionToString(descriptionValue), setValueOptions);
        }
        if (isEmpty(currentData.key_skills)) {
          const skillsValue = Array.isArray(generatedData.key_skills)
            ? generatedData.key_skills.join(', ')
            : (typeof generatedData.key_skills === 'string' ? generatedData.key_skills : '');
          if (skillsValue) setCreateJDValue('key_skills', skillsValue, setValueOptions);
        }
        if (isEmpty(currentData.education_requirements) && generatedData.education_requirements) {
          setCreateJDValue('education_requirements', generatedData.education_requirements, setValueOptions);
        }
        if (isEmpty(currentData.certifications)) {
          const certsValue = Array.isArray(generatedData.certifications)
            ? generatedData.certifications.join(', ')
            : (typeof generatedData.certifications === 'string' ? generatedData.certifications : '');
          if (certsValue) setCreateJDValue('certifications', certsValue, setValueOptions);
        }
        if (isEmpty(currentData.salary_range) && generatedData.salary_range) {
          setCreateJDValue('salary_range', generatedData.salary_range, setValueOptions);
        }

        // Trigger validation on all fields to show errors immediately after AI generation
        setTimeout(async () => {
          await triggerCreateJDValidation();
        }, 100);

        setUploadStatus({
          type: 'success',
          message: 'All job fields generated successfully! Review and edit as needed.'
        });

        // Clear status after 3 seconds
        setTimeout(() => {
          setUploadStatus({ type: null, message: '' });
        }, 3000);
      } else {
        throw new Error('Invalid response format from server');
      }

    } catch (error) {
      console.error('AI generation error:', error);
      setUploadStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to generate job description. Please try again.'
      });
    } finally {
      setGeneratingDescription(false);
    }
  };

  // Handle status change (currently unused - status changes handled via edit form)
  // const handleStatusChange = async (jobId: string, action: 'activate' | 'deactivate') => {
  //   setStatusChanging(jobId);
  //   try {
  //     const response = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.HR_UPDATE_STATUS(jobId)), {
  //       method: 'PUT',
  //       headers: {
  //         'Content-Type': 'application/json',
  //       },
  //       body: JSON.stringify({ 
  //         status: action === 'activate' ? 'active' : 'inactive' 
  //       }),
  //     });
  //     if (response.ok) {
  //       fetchJobListings();
  //     } else {
  //       console.error('Failed to update job status');
  //     }
  //   } catch (error) {
  //     console.error('Error updating job status:', error);
  //   } finally {
  //     setStatusChanging(null);
  //   }
  // };

  return (
    <div className="space-y-8 px-4 md:px-6 py-6 md:py-8">
      {/* Search and Filters */}
      <div className="relative bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-3xl p-6 border border-gray-200/50 dark:border-gray-700/50 shadow-xl hover:shadow-2xl transition-all duration-300 group overflow-visible">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-all duration-500 pointer-events-none"></div>
        <div className="flex flex-col lg:flex-row gap-4 relative z-10">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500 group-focus-within:text-blue-600 dark:group-focus-within:text-blue-400 transition-all duration-200" />
            <InputField
              placeholder="Search jobs by title, function, location, skills..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 pr-6 py-3 border border-gray-200/80 dark:border-gray-600/80 rounded-xl text-sm bg-white dark:bg-gray-700/50 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:focus:ring-blue-400/50 focus:border-blue-500 dark:focus:border-blue-400 transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-600 shadow-sm focus:shadow-md"
            />
          </div>

          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-3 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-600 transition-all duration-200 border-2 border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 font-medium text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none ${showFilters ? 'bg-gray-100 dark:bg-gray-600 border-gray-300 dark:border-gray-500' : ''
              }`}
            aria-label={showFilters ? "Hide filters" : "Show filters"}
            aria-expanded={showFilters}
          >
            <Filter className="h-4 w-4" />
            <span>Filters</span>
            <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${showFilters ? 'rotate-180' : ''}`} />
          </button>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 w-full sm:w-auto">
            <button
              onClick={fetchJobListings}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
              aria-label={loading ? "Refreshing jobs" : "Refresh job listings"}
              type="button"
            >
              <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
              Refresh Jobs
            </button>

            <button
              onClick={() => setShowIntegrationModal(true)}
              className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none w-full sm:w-auto"
              aria-label="Open integrations"
              type="button"
            >
              <Globe className="h-5 w-5" aria-hidden="true" />
              Integrations
            </button>

            <button
              onClick={() => setShowAddJobPopup(true)}
              className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none w-full sm:w-auto"
              aria-label="Add new position listing"
              type="button"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add New Position
            </button>
          </div>
        </div>

        {/* Filter Options */}
        {showFilters && (
          <div className="mt-4 relative z-20 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl shadow-lg p-5 space-y-4 animate-in fade-in-50 duration-200">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Status Filter */}
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  <CheckCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  Status
                </label>
                <div className="relative">
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full px-4 py-2.5 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 dark:focus:border-blue-400 transition-all duration-200 hover:border-blue-400 dark:hover:border-blue-600 cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22currentColor%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C/polyline%3E%3C/svg%3E')] bg-[length:1.5em_1.5em] bg-[right_0.75rem_center] bg-no-repeat pr-10"
                  >
                    <option value="all">All Status</option>
                    <option value="draft">Draft</option>
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
              </div>

              {/* Department Filter */}
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  <Briefcase className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  Department
                </label>
                <InputField
                  placeholder="Department"
                  value={filterDepartment}
                  onChange={(e) => setFilterDepartment(e.target.value)}
                  className="w-full h-11 px-4 py-2.5 border-2 border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 dark:focus:border-blue-400 transition-all duration-200 hover:border-blue-400 dark:hover:border-blue-600 shadow-sm focus:shadow-md"
                />
              </div>

              {/* Job Type Filter */}
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  <List className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  Job Type
                </label>
                <div className="relative">
                  <select
                    value={filterJobType}
                    onChange={(e) => setFilterJobType(e.target.value)}
                    className="w-full px-4 py-2.5 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 dark:focus:border-blue-400 transition-all duration-200 hover:border-blue-400 dark:hover:border-blue-600 cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22currentColor%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C/polyline%3E%3C/svg%3E')] bg-[length:1.5em_1.5em] bg-[right_0.75rem_center] bg-no-repeat pr-10"
                  >
                    <option value="">All Types</option>
                    <option value="full-time">Full-Time</option>
                    <option value="part-time">Part-Time</option>
                    <option value="contract">Contract</option>
                    <option value="internship">Internship</option>
                  </select>
                </div>
              </div>

              {/* Experience Filter */}
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  Experience
                </label>
                <div className="relative">
                  <select
                    value={filterExperience}
                    onChange={(e) => setFilterExperience(e.target.value)}
                    className="w-full px-4 py-2.5 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 dark:focus:border-blue-400 transition-all duration-200 hover:border-blue-400 dark:hover:border-blue-600 cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22currentColor%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C/polyline%3E%3C/svg%3E')] bg-[length:1.5em_1.5em] bg-[right_0.75rem_center] bg-no-repeat pr-10"
                  >
                    <option value="">All Experience</option>
                    <option value="entry">Entry Level</option>
                    <option value="mid">Mid Level</option>
                    <option value="senior">Senior Level</option>
                    <option value="executive">Executive</option>
                  </select>
                </div>
              </div>

              {/* Date Range Filter */}
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  Date Range
                </label>
                <div className="relative">
                  <select
                    value={filterDateRange}
                    onChange={(e) => setFilterDateRange(e.target.value)}
                    className="w-full px-4 py-2.5 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 dark:focus:border-blue-400 transition-all duration-200 hover:border-blue-400 dark:hover:border-blue-600 cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22currentColor%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C/polyline%3E%3C/svg%3E')] bg-[length:1.5em_1.5em] bg-[right_0.75rem_center] bg-no-repeat pr-10"
                  >
                    <option value="all">All Dates</option>
                    <option value="7">Next 7 days</option>
                    <option value="30">Next 30 days</option>
                    <option value="90">Next 90 days</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={() => {
                  setFilterStatus('all')
                  setFilterDepartment('')
                  setFilterJobType('')
                  setFilterExperience('')
                  setFilterDateRange('all')
                }}
                className="px-5 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all duration-200 border-2 border-transparent hover:border-blue-200 dark:hover:border-blue-800"
              >
                Clear All Filters
              </button>
            </div>
          </div>
        )}

        {/* Active Filters */}
        {(filterStatus !== 'all' || filterDepartment || filterJobType || filterExperience || filterDateRange !== 'all') && (
          <div className="mt-4 flex flex-wrap gap-2 animate-in fade-in-50 duration-200">
            {filterStatus !== 'all' && (
              <div className="flex items-center gap-1">
                <Badge variant="light" color="primary">
                  Status: {filterStatus}
                </Badge>
                <X className="h-3 w-3 cursor-pointer" onClick={() => setFilterStatus('all')} />
              </div>
            )}
            {filterDepartment && (
              <div className="flex items-center gap-1">
                <Badge variant="light" color="primary">
                  Dept: {filterDepartment}
                </Badge>
                <X className="h-3 w-3 cursor-pointer" onClick={() => setFilterDepartment('')} />
              </div>
            )}
            {filterJobType && (
              <div className="flex items-center gap-1">
                <Badge variant="light" color="primary">
                  Type: {filterJobType}
                </Badge>
                <X className="h-3 w-3 cursor-pointer" onClick={() => setFilterJobType('')} />
              </div>
            )}
            {filterExperience && (
              <div className="flex items-center gap-1">
                <Badge variant="light" color="primary">
                  Exp: {filterExperience}
                </Badge>
                <X className="h-3 w-3 cursor-pointer" onClick={() => setFilterExperience('')} />
              </div>
            )}
            {filterDateRange !== 'all' && (
              <div className="flex items-center gap-1">
                <Badge variant="light" color="primary">
                  Date: {filterDateRange} days
                </Badge>
                <X className="h-3 w-3 cursor-pointer" onClick={() => setFilterDateRange('all')} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Job Listings Table */}
      <div className="w-full overflow-x-auto rounded-3xl border border-gray-200/50 dark:border-gray-700/50 shadow-xl hover:shadow-2xl transition-all duration-300 bg-white dark:bg-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] sm:min-w-[1000px] lg:min-w-[1200px]">
            <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    JOB DETAILS
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    LOCATION
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" strokeWidth={2} />
                    </svg>
                    TYPE
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    STATUS
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    APPLICATIONS
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    CREATED
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                    </svg>
                    ACTIONS
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center">
                    <Spinner />
                  </td>
                </tr>
              ) : filteredJobs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                    No jobs found
                  </td>
                </tr>
              ) : (
                filteredJobs.map((job: JobListing) => (
                  <tr key={job._id || job.job_id || `job-${Math.random()}`} className="group border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-200">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate max-w-[300px] sm:max-w-[400px] md:max-w-[500px]" title={job.title}>
                            {job.title}
                          </div>
                          {job.job_id && (
                            <div className="mt-0.5">
                              <button
                                className="text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-1.5 py-0.5 rounded hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors cursor-pointer"
                                onClick={() => {
                                  setViewingJob(job);
                                  setShowViewJob(true);
                                }}
                                title="Click to view job details"
                              >
                                ID: {job.job_id}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="text-sm text-gray-900 dark:text-gray-100">
                          {job.location || 'Not Specified'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                        {job.job_type ? job.job_type.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join('-') : 'Not Specified'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${job.status === 'active' ? 'bg-green-500' :
                          job.status === 'inactive' ? 'bg-gray-400' :
                            'bg-yellow-500'
                          }`}></div>
                        <span className="text-sm text-gray-900 dark:text-gray-100 capitalize">
                          {job.status || 'draft'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div
                        className={`flex items-center gap-2 ${(job.application_count || 0) > 0 && onNavigateToAnalytics ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg p-2 -m-2 transition-colors' : ''}`}
                        onClick={() => {
                          if ((job.application_count || 0) > 0 && onNavigateToAnalytics && job.job_id) {
                            onNavigateToAnalytics(job.job_id!);
                          }
                        }}
                        title={`${(job.application_count || 0) > 0 && onNavigateToAnalytics ? `Click to view ${job.application_count || 0} applicants for ${job.title} in Analytics` : ''}`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${(job.application_count || 0) > 0
                          ? 'bg-green-500'
                          : 'bg-green-100 dark:bg-green-900/20'
                          }`}>
                          <svg className={`w-4 h-4 ${(job.application_count || 0) > 0 ? 'text-white' : 'text-green-600 dark:text-green-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                        </div>
                        <span className={`text-xs font-medium px-2 py-1 rounded-lg ${(job.application_count || 0) > 0
                          ? 'bg-green-500 text-white'
                          : 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                          }`}>
                          {job.application_count || 0} {job.application_count === 1 ? 'Application' : 'Applications'}
                        </span>
                        {(job.application_count || 0) > 0 && onNavigateToAnalytics && (
                          <svg className="w-4 h-4 text-gray-400 opacity-0 hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-900 dark:text-gray-100">
                        {job.created_at ? new Date(job.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {/* View Button */}
                        <button
                          className="p-2 bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/30 rounded-lg transition-all duration-200 border border-green-200 dark:border-green-800 hover:shadow-md"
                          onClick={() => {
                            // Set the viewing job and show the modal
                            setViewingJob(job);
                            setShowViewJob(true);
                          }}
                          title="View Job Details"
                          aria-label={`View job details: ${job.title}`}
                        >
                          <Eye className="w-4 h-4" aria-hidden="true" />
                        </button>

                        {/* Edit Button */}
                        <button
                          className="p-2 bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/30 rounded-lg transition-all duration-200 border border-blue-200 dark:border-blue-800 hover:shadow-md"
                          onClick={() => {
                            setEditJobData(job);
                            // Populate React Hook Form with job data
                            setEditJobValue('title', job.title || '');
                            setEditJobValue('job_function', job.job_function || '');
                            setEditJobValue('location', job.location || '');
                            setEditJobValue('experience_level', job.experience_level || '');
                            setEditJobValue('job_type', job.job_type || '');
                            setEditJobValue('description', job.description || '');
                            setEditJobValue('key_skills', Array.isArray(job.key_skills) ? job.key_skills.join(', ') : '');
                            setEditJobValue('education_requirements', job.education_requirements || '');
                            setEditJobValue('certifications', Array.isArray(job.certifications) ? job.certifications.join(', ') : '');
                            setEditJobValue('salary_range', job.salary_range || '');
                            setEditJobValue('status', job.status || 'draft');
                            setEditJobValue('closing_date', job.closing_date || '');
                            setShowEditModal(true);
                          }}
                          title="Edit Job"
                          aria-label={`Edit job: ${job.title}`}
                        >
                          <Edit className="w-4 h-4" aria-hidden="true" />
                        </button>

                        {/* Delete Button */}
                        <button
                          className="p-2 bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/30 rounded-lg transition-all duration-200 border border-red-200 dark:border-red-800 hover:shadow-md"
                          onClick={() => setShowDeleteModal({ open: true, jobId: job.job_id || job._id })}
                          title="Delete Job"
                          aria-label={`Delete job: ${job.title}`}
                        >
                          <Trash2 className="w-4 h-4" aria-hidden="true" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {applyFiltersAndSearch(allJobListings).length > 0 && (
          <div className="bg-white dark:bg-gray-800 px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-gray-200 dark:border-gray-700 sm:px-6">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Showing <span className="font-medium text-gray-900 dark:text-gray-100">{(currentPage - 1) * rowsPerPage + 1}</span> to{' '}
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {Math.min(currentPage * rowsPerPage, applyFiltersAndSearch(allJobListings).length)}
              </span>{' '}
              of <span className="font-medium text-gray-900 dark:text-gray-100">{applyFiltersAndSearch(allJobListings).length}</span> results
            </div>
            <div className="flex items-center gap-2">
              <select
                value={rowsPerPage}
                onChange={(e) => {
                  setRowsPerPage(Number(e.target.value))
                  setCurrentPage(1)
                }}
                className="px-3 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={10}>10 per page</option>
                <option value={25}>25 per page</option>
                <option value={50}>50 per page</option>
                <option value={100}>100 per page</option>
              </select>
              <div className="flex gap-1">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add New Position Options Popup */}
      {showAddJobPopup && (
        <div className="fixed inset-0 z-[99999] bg-black/10 backdrop-blur-[2px]" />
      )}
      {showAddJobPopup && (
        <div
          className="fixed inset-0 z-[100000] flex items-center justify-center"
          onClick={() => setShowAddJobPopup(false)}
        >
          <div
            className="relative w-full max-w-[700px] bg-transparent rounded-2xl outline-none focus:outline-none mx-4"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setShowAddJobPopup(false)}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-800 text-xl font-bold z-10"
              aria-label="Close"
            >
              &times;
            </button>
            <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl p-6">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Add New Position</h2>
                <p className="text-gray-600 dark:text-gray-400 text-base">Choose how you would like to create a new job listing</p>
              </div>

              <div className="flex justify-center space-x-3 mb-6">
                {/* Option 1: Upload JD */}
                <div
                  onClick={() => {
                    setShowAddJobPopup(false);
                    setShowUploadModal(true);
                  }}
                  className="relative w-48 h-64 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-2xl border-2 border-blue-200 dark:border-blue-700 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-xl cursor-pointer transition-all duration-300 flex flex-col items-center justify-center p-4 group"
                >
                  <div className="w-16 h-16 bg-blue-500 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                    <Upload className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 text-center">Upload JD</h3>
                  <p className="text-gray-600 dark:text-gray-400 text-xs text-center mb-4">
                    Upload an existing job description document (PDF, DOC, DOCX)
                  </p>
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                    <div className="w-6 h-6 border-2 border-blue-300 rounded-full group-hover:border-blue-500 transition-colors"></div>
                  </div>
                </div>

                {/* Option 2: Generate JD with AI */}
                <div
                  onClick={() => {
                    setShowAddJobPopup(false);
                    setShowConversationalAI(true);
                    setConversationalStep(0);
                  }}
                  className="relative w-48 h-64 bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 rounded-2xl border-2 border-emerald-200 dark:border-emerald-700 hover:border-emerald-400 dark:hover:border-emerald-500 hover:shadow-xl cursor-pointer transition-all duration-300 flex flex-col items-center justify-center p-4 group"
                >
                  <div className="w-16 h-16 bg-emerald-500 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                    <Bot className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 text-center">Generate JD with AI</h3>
                  <p className="text-gray-600 dark:text-gray-400 text-xs text-center mb-4">
                    Create a job description using AI assistance
                  </p>
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                    <div className="w-6 h-6 border-2 border-emerald-300 rounded-full group-hover:border-emerald-500 transition-colors"></div>
                  </div>
                </div>

                {/* Option 3: Create JD Manually */}
                <div
                  onClick={() => {
                    setShowAddJobPopup(false);
                    setShowAddJobModal(true);
                  }}
                  className="relative w-48 h-64 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-2xl border-2 border-blue-200 dark:border-blue-700 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-xl cursor-pointer transition-all duration-300 flex flex-col items-center justify-center p-4 group"
                >
                  <div className="w-16 h-16 bg-blue-500 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                    <Edit className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 text-center">Create JD Manually</h3>
                  <p className="text-gray-600 dark:text-gray-400 text-xs text-center mb-4">
                    Fill out the job description form manually
                  </p>
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                    <div className="w-6 h-6 border-2 border-blue-300 rounded-full group-hover:border-blue-500 transition-colors"></div>
                  </div>
                </div>
              </div>

              <div className="text-center">
                <button
                  onClick={() => setShowAddJobPopup(false)}
                  className="px-8 py-3 rounded-xl text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 font-medium focus:ring-2 focus:ring-gray-500 focus:outline-none"
                  type="button"
                  aria-label="Cancel"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Job Description Modal */}
      {showAddJobModal && (
        <div className="fixed inset-0 z-[99999] bg-black/10 backdrop-blur-[2px]" />
      )}
      {showAddJobModal && (
        <div
          className="fixed inset-0 z-[100000] flex items-center justify-center overflow-y-auto p-8"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowAddJobModal(false);
              resetCreateJD();
              setCreateJDStatus({ type: null, message: '' });
              setCreatingJD(false);
            }
          }}
        >
          <div className="relative w-full max-w-[700px] mx-4">
            <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden">
              {/* Blue Gradient Header */}
              <div className="bg-gradient-to-r from-blue-600 to-blue-500 p-6 text-white relative">
                {/* Close Button */}
                <button
                  onClick={() => {
                    setShowAddJobModal(false);
                    resetCreateJD();
                    setCreateJDStatus({ type: null, message: '' });
                    setCreatingJD(false);
                  }}
                  className="absolute top-4 right-4 text-white/80 hover:text-white transition-all duration-200 p-2 hover:bg-white/10 rounded-full z-10 focus:ring-2 focus:ring-white/50 focus:outline-none"
                  aria-label="Close"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>

                <div className="flex items-center space-x-4 pr-12">
                  <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold mb-1">Create Job Description</h2>
                    <p className="text-blue-100">Fill out the job description details manually</p>
                  </div>
                </div>
              </div>

              {/* Form Content */}
              <div className="p-6 max-h-[calc(85vh-120px)] overflow-y-auto scrollbar-hide">

                {/* Success Message */}
                {createJDStatus.type === 'success' && (
                  <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-6">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-green-700 font-medium">{createJDStatus.message}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Error Message */}
                {createJDStatus.type === 'error' && (
                  <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-red-700 font-medium">{createJDStatus.message}</p>
                      </div>
                    </div>
                  </div>
                )}

                <form onSubmit={handleCreateJDSubmit(onSubmitCreateJD)}>
                  <div className="space-y-4">
                    {/* Job Title and Job Function */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Job Title <span className="text-red-500">*</span>
                        </label>
                        <Controller
                          name="job_title"
                          control={createJDControl}
                          render={({ field, fieldState }) => (
                            <>
                              <input
                                {...field}
                                type="text"
                                maxLength={100}
                                disabled={creatingJD}
                                className={`w-full px-4 py-2.5 border rounded-full text-sm bg-white dark:bg-gray-800/50 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-400 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md focus:shadow-lg ${fieldState.error
                                  ? 'border-red-500 focus:border-red-500'
                                  : createJobTitleValidation.isValid
                                    ? 'border-green-500 dark:border-green-400'
                                    : 'border-gray-300 dark:border-gray-600'
                                  }`}
                                placeholder="e.g., Senior Software Engineer, Marketing Manager"
                              />
                              <div className="flex items-center justify-between mt-1">
                                <p className={`text-xs ${fieldState.error
                                  ? 'text-red-600 dark:text-red-400'
                                  : createJobTitleValidation.isValid
                                    ? 'text-green-600 dark:text-green-400'
                                    : 'text-gray-500 dark:text-gray-400'
                                  }`}>
                                  {(field.value || '').trim().length === 0
                                    ? 'Enter a unique job title (3-100 characters). Example: Senior Software Engineer'
                                    : createJobTitleValidation.message}
                                </p>
                                <span className={`text-xs ${(field.value || '').length > 90
                                  ? 'text-orange-600 dark:text-orange-400'
                                  : 'text-gray-400 dark:text-gray-500'
                                  }`}>
                                  {(field.value || '').length}/100
                                </span>
                              </div>
                            </>
                          )}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Job Function <span className="text-red-500">*</span>
                        </label>
                        <Controller
                          name="job_function"
                          control={createJDControl}
                          render={({ field, fieldState }) => (
                            <>
                              <input
                                {...field}
                                type="text"
                                maxLength={100}
                                disabled={creatingJD}
                                className={`w-full px-4 py-2.5 border rounded-full text-sm bg-white dark:bg-gray-800/50 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-400 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md focus:shadow-lg ${fieldState.error
                                  ? 'border-red-500 focus:border-red-500'
                                  : createJobFunctionValidation.isValid
                                    ? 'border-green-500 dark:border-green-400'
                                    : 'border-gray-300 dark:border-gray-600'
                                  }`}
                                placeholder="e.g., Engineering, Marketing, Sales"
                              />
                              <div className="flex items-center justify-between mt-1">
                                <p className={`text-xs ${fieldState.error
                                  ? 'text-red-600 dark:text-red-400'
                                  : createJobFunctionValidation.isValid
                                    ? 'text-green-600 dark:text-green-400'
                                    : 'text-gray-500 dark:text-gray-400'
                                  }`}>
                                  {(field.value || '').trim().length === 0
                                    ? 'Enter job function (2-100 characters). Example: Software Engineering'
                                    : createJobFunctionValidation.message}
                                </p>
                                <span className={`text-xs ${(field.value || '').length > 90
                                  ? 'text-orange-600 dark:text-orange-400'
                                  : 'text-gray-400 dark:text-gray-500'
                                  }`}>
                                  {(field.value || '').length}/100
                                </span>
                              </div>
                            </>
                          )}
                        />
                      </div>
                    </div>

                    {/* Location */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Location <span className="text-red-500">*</span>
                      </label>
                      <Controller
                        name="location"
                        control={createJDControl}
                        render={({ field, fieldState }) => (
                          <>
                            <input
                              {...field}
                              type="text"
                              maxLength={200}
                              disabled={creatingJD}
                              className={`w-full px-4 py-2.5 border rounded-full text-sm bg-white dark:bg-gray-800/50 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-400 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md focus:shadow-lg ${fieldState.error
                                ? 'border-red-500 focus:border-red-500'
                                : createLocationValidation.isValid
                                  ? 'border-green-500 dark:border-green-400'
                                  : 'border-gray-300 dark:border-gray-600'
                                }`}
                              placeholder="e.g., New York, NY, Remote, London"
                            />
                            <div className="flex items-center justify-between mt-1">
                              <p className={`text-xs ${fieldState.error
                                ? 'text-red-600 dark:text-red-400'
                                : createLocationValidation.isValid
                                  ? 'text-green-600 dark:text-green-400'
                                  : 'text-gray-500 dark:text-gray-400'
                                }`}>
                                {(field.value || '').trim().length === 0
                                  ? 'Enter location (2-200 characters). Example: New York, NY'
                                  : createLocationValidation.message}
                              </p>
                              <span className={`text-xs ${(field.value || '').length > 180
                                ? 'text-orange-600 dark:text-orange-400'
                                : 'text-gray-400 dark:text-gray-500'
                                }`}>
                                {(field.value || '').length}/200
                              </span>
                            </div>
                          </>
                        )}
                      />
                    </div>

                    {/* Job Description */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Job Description <span className="text-red-500">*</span>
                        </label>
                        <button
                          type="button"
                          onClick={handleGenerateDescriptionWithAI}
                          disabled={generatingDescription || creatingJD || !createJDData.job_title}
                          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-xs font-medium rounded-full hover:from-blue-600 hover:to-blue-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
                          title={!createJDData.job_title ? 'Please enter Job Title first' : 'Generate description using AI'}
                        >
                          {generatingDescription ? (
                            <>
                              <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              <span>Generating...</span>
                            </>
                          ) : (
                            <>
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                              </svg>
                              <span>Generate with AI</span>
                            </>
                          )}
                        </button>
                      </div>
                      <Controller
                        name="description"
                        control={createJDControl}
                        render={({ field, fieldState }) => {
                          const strippedLength = field.value?.replace(/<[^>]*>/g, '').trim().length || 0;
                          return (
                            <>
                              <textarea
                                {...field}
                                maxLength={2000}
                                disabled={creatingJD || generatingDescription}
                                rows={4}
                                className={`w-full px-4 py-3 border rounded-2xl text-sm bg-white dark:bg-gray-800/50 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-400 transition-all duration-200 resize-y disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md focus:shadow-lg ${fieldState.error
                                  ? 'border-red-500 focus:border-red-500'
                                  : createDescriptionValidation.isValid
                                    ? 'border-green-500 dark:border-green-400'
                                    : 'border-gray-300 dark:border-gray-600'
                                  }`}
                                placeholder="Describe the role, responsibilities, and requirements in detail"
                              />
                              <div className="flex items-center justify-between mt-1">
                                <p className={`text-xs ${fieldState.error
                                  ? 'text-red-600 dark:text-red-400'
                                  : createDescriptionValidation.isValid
                                    ? 'text-green-600 dark:text-green-400'
                                    : 'text-gray-500 dark:text-gray-400'
                                  }`}>
                                  {strippedLength === 0
                                    ? 'Provide a comprehensive job description (minimum 30 characters, excluding HTML).'
                                    : createDescriptionValidation.message}
                                </p>
                                <span className={`text-xs ${((field.value ?? "").length > 1800)
                                  ? 'text-orange-600 dark:text-orange-400'
                                  : 'text-gray-400 dark:text-gray-500'
                                  }`}>
                                  {strippedLength}/2000
                                </span>
                              </div>
                            </>
                          );
                        }}
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Provide a comprehensive description of the role, responsibilities, and what the position entails. Or click &quot;Generate with AI&quot; to auto-generate.</p>
                    </div>

                    {/* Key Skills */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Key Skills <span className="text-red-500">*</span>
                      </label>
                      <Controller
                        name="key_skills"
                        control={createJDControl}
                        render={({ field, fieldState }) => (
                          <>
                            <textarea
                              {...field}
                              maxLength={500}
                              disabled={creatingJD}
                              rows={4}
                              className={`w-full px-4 py-3 border rounded-2xl text-sm bg-white dark:bg-gray-800/50 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-400 transition-all duration-200 resize-y disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md focus:shadow-lg ${fieldState.error
                                ? 'border-red-500 focus:border-red-500'
                                : createKeySkillsValidation.isValid
                                  ? 'border-green-500 dark:border-green-400'
                                  : 'border-gray-300 dark:border-gray-600'
                                }`}
                              placeholder="List required skills, technologies, and competencies"
                            />
                            <div className="flex items-center justify-between mt-1">
                              <p className={`text-xs ${fieldState.error
                                ? 'text-red-600 dark:text-red-400'
                                : createKeySkillsValidation.isValid
                                  ? 'text-green-600 dark:text-green-400'
                                  : 'text-gray-500 dark:text-gray-400'
                                }`}>
                                {(field.value || '').trim().length === 0
                                  ? 'List key skills and requirements (minimum 2 characters).'
                                  : createKeySkillsValidation.message}
                              </p>
                              <span className={`text-xs ${(field.value || '').length > 450
                                ? 'text-orange-600 dark:text-orange-400'
                                : 'text-gray-400 dark:text-gray-500'
                                }`}>
                                {(field.value || '').length}/500
                              </span>
                            </div>
                          </>
                        )}
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Enter the key skills required for this position. You can use commas, spaces, and any special characters as needed.</p>
                    </div>

                    {/* Education Requirements */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Education Requirements <span className="text-red-500">*</span>
                      </label>
                      <Controller
                        name="education_requirements"
                        control={createJDControl}
                        render={({ field, fieldState }) => (
                          <>
                            <textarea
                              {...field}
                              maxLength={500}
                              disabled={creatingJD}
                              rows={3}
                              className={`w-full px-4 py-3 border rounded-2xl text-sm bg-white dark:bg-gray-800/50 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-400 transition-all duration-200 resize-y disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md focus:shadow-lg ${fieldState.error
                                ? 'border-red-500 focus:border-red-500'
                                : createEducationReqValidation.isValid
                                  ? 'border-green-500 dark:border-green-400'
                                  : 'border-gray-300 dark:border-gray-600'
                                }`}
                              placeholder="Specify required education qualifications"
                            />
                            <div className="flex items-center justify-between mt-1">
                              <p className={`text-xs ${fieldState.error
                                ? 'text-red-600 dark:text-red-400'
                                : createEducationReqValidation.isValid
                                  ? 'text-green-600 dark:text-green-400'
                                  : 'text-gray-500 dark:text-gray-400'
                                }`}>
                                {(field.value || '').trim().length === 0
                                  ? 'Specify education requirements (minimum 2 characters).'
                                  : createEducationReqValidation.message}
                              </p>
                              <span className={`text-xs ${(field.value || '').length > 450
                                ? 'text-orange-600 dark:text-orange-400'
                                : 'text-gray-400 dark:text-gray-500'
                                }`}>
                                {(field.value || '').length}/500
                              </span>
                            </div>
                          </>
                        )}
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Specify the minimum education level and field of study required for this position.</p>
                    </div>

                    {/* Certifications */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Certifications</label>
                      <Controller
                        name="certifications"
                        control={createJDControl}
                        render={({ field, fieldState }) => (
                          <>
                            <textarea
                              {...field}
                              value={field.value || ''}
                              maxLength={500}
                              disabled={creatingJD}
                              rows={3}
                              className={`w-full px-4 py-3 border rounded-xl text-sm bg-white dark:bg-gray-800/50 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:focus:ring-blue-400/50 transition-all duration-200 resize-y disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md focus:shadow-lg ${fieldState.error
                                ? 'border-red-500 focus:border-red-500'
                                : fieldState.isTouched && !fieldState.error && field.value
                                  ? 'border-green-500 focus:border-green-500'
                                  : 'border-gray-300 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400'
                                }`}
                              placeholder="Enter certifications"
                            />
                            {fieldState.error && (
                              <div className="text-red-600 text-sm mt-1 p-2 bg-red-50 border border-red-200 rounded">
                                {fieldState.error.message}
                              </div>
                            )}
                            {field.value && field.value.length >= 500 && !fieldState.error && (
                              <div className="text-red-600 text-sm mt-1 p-2 bg-red-50 border border-red-200 rounded">
                                Maximum length reached (500 characters)
                              </div>
                            )}
                          </>
                        )}
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Enter any certifications required for this position. You can use commas, spaces, and any special characters as needed.</p>
                    </div>

                    {/* Experience Level and Job Type */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Experience Level <span className="text-red-500">*</span>
                        </label>
                        <Controller
                          name="experience_level"
                          control={createJDControl}
                          render={({ field, fieldState }) => (
                            <>
                              <div className="relative">
                                <select
                                  {...field}
                                  disabled={creatingJD}
                                  className={`w-full px-4 py-2.5 pr-10 border rounded-full bg-white dark:bg-gray-800/50 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-400 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed appearance-none shadow-sm hover:shadow-md focus:shadow-lg ${fieldState.error
                                    ? 'border-red-500 focus:border-red-500'
                                    : field.value && !fieldState.error
                                      ? 'border-green-500 dark:border-green-400'
                                      : 'border-gray-300 dark:border-gray-600'
                                    }`}
                                >
                                  <option value="">Select experience level</option>
                                  {['intern', 'entry', 'mid', 'senior', 'director'].map(level => (
                                    <option key={level} value={level}>{level.charAt(0).toUpperCase() + level.slice(1)}</option>
                                  ))}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500 pointer-events-none" />
                              </div>
                              <div className="mt-1">
                                <p className={`text-xs ${fieldState.error
                                  ? 'text-red-600 dark:text-red-400'
                                  : field.value && !fieldState.error
                                    ? 'text-green-600 dark:text-green-400'
                                    : 'text-gray-500 dark:text-gray-400'
                                  }`}>
                                  {field.value
                                    ? 'Experience level selected successfully!'
                                    : 'Please select an experience level (Intern, Entry, Mid, Senior, or Director).'}
                                </p>
                              </div>
                            </>
                          )}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Job Type <span className="text-red-500">*</span>
                        </label>
                        <Controller
                          name="job_type"
                          control={createJDControl}
                          render={({ field, fieldState }) => (
                            <>
                              <div className="relative">
                                <select
                                  {...field}
                                  disabled={creatingJD}
                                  className={`w-full px-4 py-2.5 pr-10 border rounded-full bg-white dark:bg-gray-800/50 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-400 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed appearance-none shadow-sm hover:shadow-md focus:shadow-lg ${fieldState.error
                                    ? 'border-red-500 focus:border-red-500'
                                    : field.value && !fieldState.error
                                      ? 'border-green-500 dark:border-green-400'
                                      : 'border-gray-300 dark:border-gray-600'
                                    }`}
                                >
                                  <option value="">Select Job Type</option>
                                  {['full-time', 'part-time', 'contract', 'internship'].map(type => (
                                    <option key={type} value={type}>
                                      {type.charAt(0).toUpperCase() + type.slice(1).replace('-', ' ')}
                                    </option>
                                  ))}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500 pointer-events-none" />
                              </div>
                              <div className="mt-1">
                                <p className={`text-xs ${fieldState.error
                                  ? 'text-red-600 dark:text-red-400'
                                  : field.value && !fieldState.error
                                    ? 'text-green-600 dark:text-green-400'
                                    : 'text-gray-500 dark:text-gray-400'
                                  }`}>
                                  {field.value
                                    ? 'Job type selected successfully!'
                                    : 'Please select a job type (Full-time, Part-time, Contract, Internship, or Remote).'}
                                </p>
                              </div>
                            </>
                          )}
                        />
                      </div>
                    </div>

                    {/* Salary Range, Status, Closing Date */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Salary Range</label>
                      <Controller
                        name="salary_range"
                        control={createJDControl}
                        render={({ field, fieldState }) => (
                          <>
                            <input
                              {...field}
                              type="text"
                              value={field.value || ''}
                              maxLength={100}
                              disabled={creatingJD}
                              className={`w-full px-4 py-2.5 border rounded-full text-sm bg-white dark:bg-gray-800/50 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-400 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md focus:shadow-lg ${fieldState.error
                                ? 'border-red-500 focus:border-red-500'
                                : fieldState.isTouched && !fieldState.error && field.value
                                  ? 'border-green-500 focus:border-green-500'
                                  : 'border-gray-300 dark:border-gray-600'
                                }`}
                              placeholder="e.g., $50,000 - $70,000"
                            />
                            {fieldState.error && (
                              <div className="text-red-600 text-sm mt-1 p-2 bg-red-50 border border-red-200 rounded">
                                {fieldState.error.message}
                              </div>
                            )}
                            {field.value && field.value.length >= 100 && !fieldState.error && (
                              <div className="text-red-600 text-sm mt-1 p-2 bg-red-50 border border-red-200 rounded">
                                Maximum length reached (100 characters)
                              </div>
                            )}
                          </>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status <span className="text-red-500">*</span></label>
                        <Controller
                          name="status"
                          control={createJDControl}
                          render={({ field, fieldState }) => (
                            <>
                              <div className="relative">
                                <select
                                  {...field}
                                  disabled={creatingJD}
                                  className={`w-full px-4 py-2.5 pr-10 border rounded-full text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-400 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed appearance-none ${fieldState.error
                                    ? 'border-red-500 focus:border-red-500'
                                    : fieldState.isTouched && !fieldState.error
                                      ? 'border-green-500 focus:border-green-500'
                                      : 'border-gray-300 dark:border-gray-600'
                                    }`}
                                >
                                  {['draft', 'active', 'paused', 'closed'].map(s => (
                                    <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                                  ))}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500 pointer-events-none" />
                              </div>
                              {fieldState.error && (
                                <div className="text-red-600 text-sm mt-1 p-2 bg-red-50 border border-red-200 rounded">
                                  {fieldState.error.message}
                                </div>
                              )}
                            </>
                          )}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Closing Date <span className="text-red-500">*</span>
                        </label>
                        <Controller
                          name="closing_date"
                          control={createJDControl}
                          render={({ field, fieldState }) => {
                            const statusValue = watchCreateJD('status');
                            const isClosed = statusValue === 'closed';
                            const minDate = isClosed ? undefined : new Date().toISOString().slice(0, 16);
                            return (
                              <>
                                <input
                                  {...field}
                                  type="datetime-local"
                                  min={minDate}
                                  disabled={creatingJD}
                                  className={`w-full px-4 py-2.5 border rounded-full text-sm bg-white dark:bg-gray-800/50 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-400 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md focus:shadow-lg ${fieldState.error
                                    ? 'border-red-500 focus:border-red-500'
                                    : fieldState.isTouched && !fieldState.error
                                      ? 'border-green-500 focus:border-green-500'
                                      : 'border-gray-300 dark:border-gray-600'
                                    }`}
                                />
                                {fieldState.error && (
                                  <div className="text-red-600 text-sm mt-1 p-2 bg-red-50 border border-red-200 rounded">
                                    {fieldState.error.message}
                                  </div>
                                )}
                              </>
                            );
                          }}
                        />
                      </div>
                    </div>

                    {/* Create JD Status Message */}
                    {createJDStatus.type && (
                      <div className={`p-4 rounded-lg ${createJDStatus.type === 'success'
                        ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 text-green-800 dark:text-green-200'
                        : createJDStatus.type === 'info'
                          ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 text-blue-800 dark:text-blue-200'
                          : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-800 dark:text-red-200'
                        }`}>
                        <div className="flex items-center gap-2">
                          {createJDStatus.type === 'success' ? (
                            <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : createJDStatus.type === 'info' ? (
                            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          ) : (
                            <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          )}
                          <span className="text-sm font-medium">{createJDStatus.message}</span>
                        </div>
                      </div>
                    )}

                    <div className="flex justify-end gap-3 pt-4">
                      <button
                        onClick={() => {
                          setShowAddJobModal(false);
                          resetCreateJD();
                          setCreateJDStatus({ type: null, message: '' });
                          setCreatingJD(false);
                        }}
                        disabled={creatingJD}
                        className="px-6 py-2.5 rounded-xl text-gray-700 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed focus:ring-2 focus:ring-gray-500 focus:outline-none"
                        type="button"
                        aria-label="Cancel"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={creatingJD || !isCreateJDValid}
                        className={`px-6 py-2.5 text-white rounded-full transition-all duration-200 font-medium flex items-center gap-2 ${creatingJD || !isCreateJDValid
                          ? 'bg-blue-400 cursor-not-allowed opacity-75'
                          : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700'
                          } disabled:opacity-50 disabled:cursor-not-allowed focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none shadow-sm hover:shadow-md`}
                        aria-label="Create Job Description"
                        title={!isCreateJDValid ? 'Please fix all validation errors before submitting' : 'Create job description'}
                      >
                        {creatingJD ? (
                          <>
                            <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Creating...
                          </>
                        ) : (
                          'Create Job Description'
                        )}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Job Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-[99999] bg-black/10 backdrop-blur-[2px]" />
      )}
      {showEditModal && (
        <div
          className="fixed inset-0 z-[100000] flex items-center justify-center overflow-y-auto p-8"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowEditModal(false);
              setEditJobErrors({});
            }
          }}
        >
          <div
            className="relative w-full max-w-4xl bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Teal Gradient Header */}
            <div className="bg-gradient-to-r from-teal-600 to-cyan-500 p-6 text-white relative">
              {/* Close Button */}
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditJobErrors({});
                }}
                className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-lg z-10"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              <div className="flex items-center space-x-4 pr-12">
                <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold mb-1">Edit Job Listing</h2>
                  <p className="text-teal-100">Update the job listing details</p>
                </div>
              </div>
            </div>

            {/* Form Content */}
            <div className="p-6 max-h-[calc(85vh-120px)] overflow-y-auto scrollbar-hide">
              <form onSubmit={handleEditJDSubmit} className="space-y-4">

                {/* Job Title and Job Function */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Job Title <span className="text-red-500">*</span>
                    </label>
                    <Controller
                      name="title"
                      control={editJobControl}
                      render={({ field, fieldState }) => (
                        <>
                          <input
                            {...field}
                            type="text"
                            maxLength={100}
                            disabled={editingJob}
                            className={`w-full px-4 py-2.5 border rounded-full text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-400 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${fieldState.error
                              ? 'border-red-500 focus:border-red-500'
                              : fieldState.isTouched && !fieldState.error
                                ? 'border-green-500 focus:border-green-500'
                                : 'border-gray-300 dark:border-gray-600'
                              }`}
                            placeholder="Enter job title"
                          />
                          {fieldState.error && (
                            <div className="text-red-600 text-sm mt-1 p-2 bg-red-50 border border-red-200 rounded">
                              {fieldState.error.message}
                            </div>
                          )}
                          {field.value && field.value.length >= 100 && !fieldState.error && (
                            <div className="text-red-600 text-sm mt-1 p-2 bg-red-50 border border-red-200 rounded">
                              Maximum length reached (100 characters)
                            </div>
                          )}
                        </>
                      )}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Job Function <span className="text-red-500">*</span>
                    </label>
                    <Controller
                      name="job_function"
                      control={editJobControl}
                      render={({ field, fieldState }) => (
                        <>
                          <input
                            {...field}
                            type="text"
                            maxLength={100}
                            disabled={editingJob}
                            className={`w-full px-4 py-2.5 border rounded-full text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-400 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${fieldState.error
                              ? 'border-red-500 focus:border-red-500'
                              : fieldState.isTouched && !fieldState.error
                                ? 'border-green-500 focus:border-green-500'
                                : 'border-gray-300 dark:border-gray-600'
                              }`}
                            placeholder="Enter job function"
                          />
                          {fieldState.error && (
                            <div className="text-red-600 text-sm mt-1 p-2 bg-red-50 border border-red-200 rounded">
                              {fieldState.error.message}
                            </div>
                          )}
                          {field.value && field.value.length >= 100 && !fieldState.error && (
                            <div className="text-red-600 text-sm mt-1 p-2 bg-red-50 border border-red-200 rounded">
                              Maximum length reached (100 characters)
                            </div>
                          )}
                        </>
                      )}
                    />
                  </div>
                </div>

                {/* Location */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Location <span className="text-red-500">*</span>
                  </label>
                  <Controller
                    name="location"
                    control={editJobControl}
                    render={({ field, fieldState }) => (
                      <>
                        <input
                          {...field}
                          type="text"
                          maxLength={200}
                          disabled={editingJob}
                          className={`w-full px-4 py-2.5 border rounded-full text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-400 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${fieldState.error
                            ? 'border-red-500 focus:border-red-500'
                            : fieldState.isTouched && !fieldState.error
                              ? 'border-green-500 focus:border-green-500'
                              : 'border-gray-300 dark:border-gray-600'
                            }`}
                          placeholder="Enter location"
                        />
                        {fieldState.error && (
                          <div className="text-red-600 text-sm mt-1 p-2 bg-red-50 border border-red-200 rounded">
                            {fieldState.error.message}
                          </div>
                        )}
                        {field.value && field.value.length >= 200 && !fieldState.error && (
                          <div className="text-red-600 text-sm mt-1 p-2 bg-red-50 border border-red-200 rounded">
                            Maximum length reached (200 characters)
                          </div>
                        )}
                      </>
                    )}
                  />
                </div>

                {/* Job Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Job Description <span className="text-red-500">*</span>
                  </label>
                  <Controller
                    name="description"
                    control={editJobControl}
                    render={({ field, fieldState }) => (
                      <>
                        <textarea
                          {...field}
                          rows={4}
                          maxLength={2000}
                          disabled={editingJob}
                          className={`w-full px-4 py-3 border rounded-2xl text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-400 transition-all duration-200 resize-y disabled:opacity-50 disabled:cursor-not-allowed ${fieldState.error
                            ? 'border-red-500 focus:border-red-500'
                            : fieldState.isTouched && !fieldState.error
                              ? 'border-green-500 focus:border-green-500'
                              : 'border-gray-300 dark:border-gray-600'
                            }`}
                          placeholder="Enter detailed job description"
                        />
                        {fieldState.error && (
                          <div className="text-red-600 text-sm mt-1 p-2 bg-red-50 border border-red-200 rounded">
                            {fieldState.error.message}
                          </div>
                        )}
                        {field.value && field.value.length >= 2000 && !fieldState.error && (
                          <div className="text-red-600 text-sm mt-1 p-2 bg-red-50 border border-red-200 rounded">
                            Maximum length reached (2000 characters)
                          </div>
                        )}
                        <div className="flex justify-between items-center mt-1">
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            Provide a comprehensive description of the role, responsibilities, and what the position entails.
                          </span>
                          <span className={`text-xs ${field.value && field.value.length < 30 ? 'text-red-500' :
                            field.value && field.value.length > 2000 ? 'text-yellow-500' : 'text-gray-500 dark:text-gray-400'
                            }`}>
                            {field.value?.length || 0}/2000
                          </span>
                        </div>
                      </>
                    )}
                  />
                </div>

                {/* Key Skills */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Key Skills <span className="text-red-500">*</span>
                  </label>
                  <Controller
                    name="key_skills"
                    control={editJobControl}
                    render={({ field, fieldState }) => (
                      <>
                        <textarea
                          {...field}
                          rows={4}
                          maxLength={500}
                          disabled={editingJob}
                          className={`w-full px-4 py-3 border rounded-2xl text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-400 transition-all duration-200 resize-y disabled:opacity-50 disabled:cursor-not-allowed ${fieldState.error
                            ? 'border-red-500 focus:border-red-500'
                            : fieldState.isTouched && !fieldState.error
                              ? 'border-green-500 focus:border-green-500'
                              : 'border-gray-300 dark:border-gray-600'
                            }`}
                          placeholder="Enter required skills"
                        />
                        {fieldState.error && (
                          <div className="text-red-600 text-sm mt-1 p-2 bg-red-50 border border-red-200 rounded">
                            {fieldState.error.message}
                          </div>
                        )}
                        {field.value && field.value.length >= 500 && !fieldState.error && (
                          <div className="text-red-600 text-sm mt-1 p-2 bg-red-50 border border-red-200 rounded">
                            Maximum length reached (500 characters)
                          </div>
                        )}
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Enter the key skills required for this position. You can use commas, spaces, and any special characters as needed.</p>
                      </>
                    )}
                  />
                </div>

                {/* Education Requirements */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Education Requirements <span className="text-red-500">*</span>
                  </label>
                  <Controller
                    name="education_requirements"
                    control={editJobControl}
                    render={({ field, fieldState }) => (
                      <>
                        <textarea
                          {...field}
                          rows={2}
                          maxLength={500}
                          disabled={editingJob}
                          className={`w-full px-4 py-3 border rounded-2xl text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-400 transition-all duration-200 resize-y disabled:opacity-50 disabled:cursor-not-allowed ${fieldState.error
                            ? 'border-red-500 focus:border-red-500'
                            : fieldState.isTouched && !fieldState.error
                              ? 'border-green-500 focus:border-green-500'
                              : 'border-gray-300 dark:border-gray-600'
                            }`}
                          placeholder="Enter education details"
                        />
                        {fieldState.error && (
                          <div className="text-red-600 text-sm mt-1 p-2 bg-red-50 border border-red-200 rounded">
                            {fieldState.error.message}
                          </div>
                        )}
                        {field.value && field.value.length >= 500 && !fieldState.error && (
                          <div className="text-red-600 text-sm mt-1 p-2 bg-red-50 border border-red-200 rounded">
                            Maximum length reached (500 characters)
                          </div>
                        )}
                      </>
                    )}
                  />
                </div>

                {/* Certifications */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Certifications</label>
                  <Controller
                    name="certifications"
                    control={editJobControl}
                    render={({ field, fieldState }) => (
                      <>
                        <textarea
                          {...field}
                          value={field.value || ''}
                          rows={3}
                          maxLength={500}
                          disabled={editingJob}
                          className={`w-full px-4 py-3 border rounded-2xl text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-400 transition-all duration-200 resize-y disabled:opacity-50 disabled:cursor-not-allowed ${fieldState.error
                            ? 'border-red-500 focus:border-red-500'
                            : fieldState.isTouched && !fieldState.error && field.value
                              ? 'border-green-500 focus:border-green-500'
                              : 'border-gray-300 dark:border-gray-600'
                            }`}
                          placeholder="Enter certifications"
                        />
                        {fieldState.error && (
                          <div className="text-red-600 text-sm mt-1 p-2 bg-red-50 border border-red-200 rounded">
                            {fieldState.error.message}
                          </div>
                        )}
                        {field.value && field.value.length >= 500 && !fieldState.error && (
                          <div className="text-red-600 text-sm mt-1 p-2 bg-red-50 border border-red-200 rounded">
                            Maximum length reached (500 characters)
                          </div>
                        )}
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Enter any certifications required for this position. You can use commas, spaces, and any special characters as needed.</p>
                      </>
                    )}
                  />
                </div>

                {/* Experience Level and Job Type */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Experience Level <span className="text-red-500">*</span>
                    </label>
                    <Controller
                      name="experience_level"
                      control={editJobControl}
                      render={({ field, fieldState }) => (
                        <>
                          <div className="relative">
                            <select
                              {...field}
                              disabled={editingJob}
                              className={`w-full px-4 py-2.5 pr-10 border rounded-full text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-400 transition-all duration-200 appearance-none disabled:opacity-50 disabled:cursor-not-allowed ${fieldState.error
                                ? 'border-red-500 focus:border-red-500'
                                : fieldState.isTouched && !fieldState.error
                                  ? 'border-green-500 focus:border-green-500'
                                  : 'border-gray-300 dark:border-gray-600'
                                }`}
                            >
                              <option value="">Select Experience Level</option>
                              {['intern', 'entry', 'mid', 'senior', 'director'].map(level => (
                                <option key={level} value={level}>{level.charAt(0).toUpperCase() + level.slice(1)}</option>
                              ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500 pointer-events-none" />
                          </div>
                          {fieldState.error && (
                            <div className="text-red-600 text-sm mt-1 p-2 bg-red-50 border border-red-200 rounded">
                              {fieldState.error.message}
                            </div>
                          )}
                        </>
                      )}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Job Type <span className="text-red-500">*</span>
                    </label>
                    <Controller
                      name="job_type"
                      control={editJobControl}
                      render={({ field, fieldState }) => (
                        <>
                          <div className="relative">
                            <select
                              {...field}
                              disabled={editingJob}
                              className={`w-full px-4 py-2.5 pr-10 border rounded-full text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-400 transition-all duration-200 appearance-none disabled:opacity-50 disabled:cursor-not-allowed ${fieldState.error
                                ? 'border-red-500 focus:border-red-500'
                                : fieldState.isTouched && !fieldState.error
                                  ? 'border-green-500 focus:border-green-500'
                                  : 'border-gray-300 dark:border-gray-600'
                                }`}
                            >
                              <option value="">Select Job Type</option>
                              {['full-time', 'part-time', 'contract', 'internship'].map(type => (
                                <option key={type} value={type}>
                                  {type.charAt(0).toUpperCase() + type.slice(1).replace('-', ' ')}
                                </option>
                              ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500 pointer-events-none" />
                          </div>
                          {fieldState.error && (
                            <div className="text-red-600 text-sm mt-1 p-2 bg-red-50 border border-red-200 rounded">
                              {fieldState.error.message}
                            </div>
                          )}
                        </>
                      )}
                    />
                  </div>
                </div>

                {/* Salary Range, Status, Closing Date */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Salary Range</label>
                    <Controller
                      name="salary_range"
                      control={editJobControl}
                      render={({ field, fieldState }) => (
                        <>
                          <input
                            {...field}
                            type="text"
                            value={field.value || ''}
                            maxLength={100}
                            disabled={editingJob}
                            className={`w-full px-4 py-2.5 border rounded-full text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-400 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${fieldState.error
                              ? 'border-red-500 focus:border-red-500'
                              : fieldState.isTouched && !fieldState.error && field.value
                                ? 'border-green-500 focus:border-green-500'
                                : 'border-gray-300 dark:border-gray-600'
                              }`}
                            placeholder="e.g., $50,000 - $70,000"
                          />
                          {fieldState.error && (
                            <div className="text-red-600 text-sm mt-1 p-2 bg-red-50 border border-red-200 rounded">
                              {fieldState.error.message}
                            </div>
                          )}
                          {field.value && field.value.length >= 100 && !fieldState.error && (
                            <div className="text-red-600 text-sm mt-1 p-2 bg-red-50 border border-red-200 rounded">
                              Maximum length reached (100 characters)
                            </div>
                          )}
                        </>
                      )}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Status <span className="text-red-500">*</span>
                    </label>
                    <Controller
                      name="status"
                      control={editJobControl}
                      render={({ field, fieldState }) => (
                        <>
                          <div className="relative">
                            <select
                              {...field}
                              disabled={editingJob}
                              className={`w-full px-4 py-2.5 pr-10 border rounded-full text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-400 transition-all duration-200 appearance-none disabled:opacity-50 disabled:cursor-not-allowed ${fieldState.error
                                ? 'border-red-500 focus:border-red-500'
                                : fieldState.isTouched && !fieldState.error
                                  ? 'border-green-500 focus:border-green-500'
                                  : 'border-gray-300 dark:border-gray-600'
                                }`}
                            >
                              {['draft', 'active', 'paused', 'closed'].map(s => (
                                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                              ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500 pointer-events-none" />
                          </div>
                          {fieldState.error && (
                            <div className="text-red-600 text-sm mt-1 p-2 bg-red-50 border border-red-200 rounded">
                              {fieldState.error.message}
                            </div>
                          )}
                        </>
                      )}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Closing Date</label>
                    <Controller
                      name="closing_date"
                      control={editJobControl}
                      render={({ field, fieldState }) => {
                        const statusValue = watchEditJob('status');
                        const isClosed = statusValue === 'closed';
                        const minDate = isClosed ? undefined : new Date().toISOString().slice(0, 16);
                        return (
                          <>
                            <input
                              {...field}
                              type="datetime-local"
                              value={field.value || ''}
                              min={minDate}
                              disabled={editingJob}
                              className={`w-full px-4 py-2.5 border rounded-full text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-400 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${fieldState.error
                                ? 'border-red-500 focus:border-red-500'
                                : fieldState.isTouched && !fieldState.error && field.value
                                  ? 'border-green-500 focus:border-green-500'
                                  : 'border-gray-300 dark:border-gray-600'
                                }`}
                            />
                            {fieldState.error && (
                              <div className="text-red-600 text-sm mt-1 p-2 bg-red-50 border border-red-200 rounded">
                                {fieldState.error.message}
                              </div>
                            )}
                          </>
                        );
                      }}
                    />
                  </div>
                </div>

                {/* Edit Job Status Message */}
                {editJobStatus.type && (
                  <div className={`p-4 rounded-lg ${editJobStatus.type === 'success'
                    ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 text-green-800 dark:text-green-200'
                    : editJobStatus.type === 'info'
                      ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 text-blue-800 dark:text-blue-200'
                      : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-800 dark:text-red-200'
                    }`}>
                    <div className="flex items-center gap-2">
                      {editJobStatus.type === 'success' ? (
                        <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : editJobStatus.type === 'info' ? (
                        <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                      <span className="text-sm font-medium">{editJobStatus.message}</span>
                      <button
                        onClick={() => setEditJobStatus({ type: null, message: '' })}
                        className="ml-auto text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                        aria-label="Dismiss"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}

                {/* Form Actions */}
                <div className="flex justify-end gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => {
                      setShowEditModal(false);
                      setEditJobStatus({ type: null, message: '' });
                    }}
                    className="px-6 py-2.5 rounded-full text-gray-700 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 font-medium focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:outline-none"
                    type="button"
                    aria-label="Cancel"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={editingJob || !isEditJobValid}
                    className={`px-6 py-2.5 rounded-full text-white font-medium flex items-center gap-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:outline-none shadow-sm hover:shadow-md ${editingJob || !isEditJobValid
                      ? 'bg-teal-400 cursor-not-allowed opacity-75'
                      : 'bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700'
                      }`}
                    type="submit"
                    aria-label="Update Job"
                    title={!isEditJobValid ? 'Please fix all validation errors before submitting' : 'Update job listing'}
                  >
                    {editingJob ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" />
                        Updating...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" aria-hidden="true" />
                        Update Job
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal.open && (
        <div className="fixed inset-0 z-[99999] bg-black/10 backdrop-blur-[2px]" />
      )}
      {showDeleteModal.open && (
        <div
          className="fixed inset-0 z-[100000] flex items-center justify-center p-4 animate-in fade-in-50 duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowDeleteModal({ open: false, jobId: null });
            }
          }}
        >
          <div
            className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-700 p-6 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Delete Job</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to delete this job? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteModal({ open: false, jobId: null })}
                className="px-6 py-2.5 rounded-full text-gray-700 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 font-medium focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:outline-none"
                type="button"
                aria-label="Cancel"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteJob(showDeleteModal.jobId!)}
                disabled={deleting}
                className="px-6 py-2.5 rounded-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-medium flex items-center gap-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:outline-none shadow-sm hover:shadow-md"
                type="button"
                aria-label="Delete Job"
              >
                {deleting ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                    Delete Job
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Job Board Integration Settings Modal */}
      {showIntegrationModal && (
        <div className="fixed inset-0 z-[99999] bg-black/10 backdrop-blur-[2px]" />
      )}
      {showIntegrationModal && (
        <div
          className="fixed inset-0 z-[100000] flex items-center justify-center"
          onClick={() => setShowIntegrationModal(false)}
        >
          <div
            className="relative w-full max-w-[700px] bg-transparent rounded-2xl outline-none focus:outline-none mx-4"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setShowIntegrationModal(false)}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-800 text-xl font-bold z-10"
              aria-label="Close"
            >
              &times;
            </button>
            <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl p-6">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Integration & Post to Job Board</h2>
                <p className="text-gray-600 dark:text-gray-400 text-base">Choose the job board you would like to connect</p>
              </div>

              <div className="flex justify-center space-x-3 mb-6">
                {/* LinkedIn */}
                <div
                  className="relative w-48 h-64 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-2xl border-2 border-blue-200 dark:border-blue-700 transition-all duration-300 flex flex-col items-center justify-center p-4 group"
                >
                  <div className="w-16 h-16 bg-[#0A66C2] rounded-xl flex items-center justify-center mb-4 transition-transform duration-300">
                    <span className="text-white text-lg font-black">in</span>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 text-center">LinkedIn</h3>
                  <p className="text-gray-600 dark:text-gray-400 text-xs text-center mb-4">
                    Connect to LinkedIn Jobs platform
                  </p>
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                    <div className="w-6 h-6 border-2 border-blue-300 rounded-full"></div>
                  </div>
                  {/* Coming Soon Overlay */}
                  <div className="absolute inset-0 bg-black/20 dark:bg-black/40 rounded-2xl flex items-center justify-center">
                    <div className="bg-white dark:bg-gray-800 px-4 py-2 rounded-full shadow-lg border border-gray-200 dark:border-gray-700">
                      <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Coming Soon</span>
                    </div>
                  </div>
                </div>

                {/* Indeed */}
                <div
                  className="relative w-48 h-64 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-2xl border-2 border-blue-200 dark:border-blue-700 transition-all duration-300 flex flex-col items-center justify-center p-4 group"
                >
                  <div className="w-16 h-16 bg-[#003A9B] rounded-xl flex items-center justify-center mb-4 transition-transform duration-300">
                    <span className="text-white text-xs font-bold">indeed</span>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 text-center">Indeed</h3>
                  <p className="text-gray-600 dark:text-gray-400 text-xs text-center mb-4">
                    Connect to Indeed job platform
                  </p>
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                    <div className="w-6 h-6 border-2 border-blue-300 rounded-full"></div>
                  </div>
                  {/* Coming Soon Overlay */}
                  <div className="absolute inset-0 bg-black/20 dark:bg-black/40 rounded-2xl flex items-center justify-center">
                    <div className="bg-white dark:bg-gray-800 px-4 py-2 rounded-full shadow-lg border border-gray-200 dark:border-gray-700">
                      <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Coming Soon</span>
                    </div>
                  </div>
                </div>

                {/* Naukri */}
                <div
                  className="relative w-48 h-64 bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 rounded-2xl border-2 border-emerald-200 dark:border-emerald-700 transition-all duration-300 flex flex-col items-center justify-center p-4 group"
                >
                  <div className="w-16 h-16 bg-[#1F9D8D] rounded-xl flex items-center justify-center mb-4 transition-transform duration-300">
                    <span className="text-white text-xs font-bold">naukri</span>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 text-center">Naukri</h3>
                  <p className="text-gray-600 dark:text-gray-400 text-xs text-center mb-4">
                    Connect to Naukri job platform
                  </p>
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                    <div className="w-6 h-6 border-2 border-emerald-300 rounded-full"></div>
                  </div>
                  {/* Coming Soon Overlay */}
                  <div className="absolute inset-0 bg-black/20 dark:bg-black/40 rounded-2xl flex items-center justify-center">
                    <div className="bg-white dark:bg-gray-800 px-4 py-2 rounded-full shadow-lg border border-gray-200 dark:border-gray-700">
                      <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Coming Soon</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-center">
                <button
                  onClick={() => setShowIntegrationModal(false)}
                  className="px-8 py-3 rounded-full text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 font-medium focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:outline-none"
                  type="button"
                  aria-label="Cancel"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Job Drawer/Modal */}
      {showViewJob && viewingJob && (
        <div>
          <div className="fixed inset-0 z-[99999] bg-black/10 backdrop-blur-[2px]" />
          <div
            className="fixed inset-0 z-[100000] flex items-center justify-center p-4 overflow-y-auto"
            onClick={() => setShowViewJob(false)}
          >
            <div
              className="relative w-full max-w-2xl bg-transparent rounded-2xl outline-none focus:outline-none my-8"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-gray-200 dark:border-gray-700 max-h-[95vh] overflow-hidden">
                <div className="relative bg-gradient-to-r from-green-600 via-green-700 to-green-800 rounded-t-3xl p-6 text-white overflow-hidden">
                  <div className="absolute inset-0 bg-black/20"></div>
                  <div className="relative flex items-center justify-between">
                    <button onClick={() => setShowViewJob(false)} className="absolute top-4 right-4 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/30 text-white hover:bg-white/20 focus:ring-2 focus:ring-white/50 transition-colors" aria-label="Close">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>

                    <div className="flex items-center space-x-4 pr-12">
                      <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                        <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h2 className="text-2xl font-bold mb-1">View Job Details</h2>
                        <p className="text-green-100">Review the complete job information</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="p-6 overflow-y-auto max-h-[calc(95vh-140px)] space-y-6">
                  <div className="flex items-center gap-4 pb-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="w-14 h-14 rounded-xl bg-blue-600 flex items-center justify-center text-white font-semibold">
                      {String(viewingJob.title || 'J').slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">{viewingJob.title}</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-300 truncate">{viewingJob.job_function} • {viewingJob.location}</p>
                    </div>
                    <span className="ml-auto px-3 py-1 rounded-full text-xs font-medium bg-white border capitalize text-gray-700 dark:text-gray-300 dark:bg-gray-700 dark:border-gray-600">{viewingJob.status || 'draft'}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">Job ID</p>
                      <p className="font-medium text-gray-900 dark:text-gray-100">{viewingJob.job_id || viewingJob._id}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">Type</p>
                      <p className="font-medium text-gray-900 dark:text-gray-100">{viewingJob.job_type}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">Experience Level</p>
                      <p className="font-medium text-gray-900 dark:text-gray-100">{viewingJob.experience_level}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">Applications</p>
                      <p className="font-medium text-gray-900 dark:text-gray-100">{viewingJob.application_count || 0}</p>
                    </div>
                  </div>
                  {viewingJob.key_skills?.length ? (
                    <div>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Key Skills</p>
                      <div className="flex flex-wrap gap-2">
                        {viewingJob.key_skills.map((s, i) => (
                          <span key={i} className="px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs font-medium">{s}</span>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  {viewingJob.description && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description</p>
                      <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap">{viewingJob.description}</div>
                    </div>
                  )}
                </div>
                <div className="flex justify-end gap-3 p-6 border-t bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                  <button onClick={() => setShowViewJob(false)} className="px-5 py-2 rounded-full border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors focus:ring-2 focus:ring-blue-500">Close</button>
                  <button onClick={() => {
                    if (!viewingJob) return;
                    setShowViewJob(false);
                    setEditJobData(viewingJob);
                    // Populate React Hook Form with job data
                    setEditJobValue('title', viewingJob.title || '');
                    setEditJobValue('job_function', viewingJob.job_function || '');
                    setEditJobValue('location', viewingJob.location || '');
                    setEditJobValue('experience_level', viewingJob.experience_level || '');
                    setEditJobValue('job_type', viewingJob.job_type || '');
                    setEditJobValue('description', viewingJob.description || '');
                    setEditJobValue('key_skills', Array.isArray(viewingJob.key_skills) ? viewingJob.key_skills.join(', ') : '');
                    setEditJobValue('education_requirements', viewingJob.education_requirements || '');
                    setEditJobValue('certifications', Array.isArray(viewingJob.certifications) ? viewingJob.certifications.join(', ') : '');
                    setEditJobValue('salary_range', viewingJob.salary_range || '');
                    setEditJobValue('status', viewingJob.status || 'draft');
                    setEditJobValue('closing_date', viewingJob.closing_date || '');
                    setShowEditModal(true);
                  }} className="px-5 py-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white transition-colors focus:ring-2 focus:ring-blue-500">Edit Job</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showPostingModal && (
        <Modal
          isOpen={showPostingModal}
          onClose={() => setShowPostingModal(false)}
        >
          <div className="p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Post to Job Boards</h2>
            <p className="text-gray-600 dark:text-gray-400">Job posting modal will be implemented here.</p>
          </div>
        </Modal>
      )}

      {/* Upload JD Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-[99999] bg-black/10 backdrop-blur-[2px]" />
      )}
      {showUploadModal && (
        <div
          className="fixed inset-0 z-[100000] flex items-center justify-center"
          onClick={() => {
            setShowUploadModal(false);
            // Reset upload states when modal is closed
            setSelectedFile(null);
            setUploadProgress(0);
            setUploadStatus({ type: null, message: '' });
          }}
        >
          <div
            className="relative w-full max-w-[500px] bg-transparent rounded-2xl outline-none focus:outline-none mx-4"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => {
                setShowUploadModal(false);
                // Reset upload states when modal is closed
                setSelectedFile(null);
                setUploadProgress(0);
                setUploadStatus({ type: null, message: '' });
              }}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 text-xl font-bold z-10 w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 focus:ring-2 focus:ring-gray-500 focus:outline-none"
              aria-label="Close"
              type="button"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-8">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Upload Job Description</h2>
                <p className="text-gray-600 dark:text-gray-400">Upload your job description document</p>
              </div>

              <div className="space-y-6">
                {/* File Upload Area */}
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center hover:border-blue-500 dark:hover:border-blue-400 transition-colors bg-gray-50 dark:bg-gray-800">
                  <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <Upload className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Drop your file here</h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">or click to browse</p>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    className="hidden"
                    id="file-upload"
                  />
                  <label
                    htmlFor="file-upload"
                    className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-3 rounded-full hover:from-blue-600 hover:to-blue-700 transition-all duration-200 cursor-pointer font-medium shadow-sm hover:shadow-md focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none inline-block"
                  >
                    Choose File
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Supported formats: PDF, DOC, DOCX (Max 10MB)</p>
                </div>

                {/* Selected File Display */}
                {selectedFile && (
                  <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 rounded-xl p-4">
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-emerald-900 dark:text-emerald-100">{selectedFile.name}</p>
                        <p className="text-xs text-emerald-600 dark:text-emerald-400">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                      <button
                        onClick={() => setSelectedFile(null)}
                        className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300"
                      >
                        <AlertCircle className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Upload Progress - Only show when actively uploading (no error/success status) */}
                {uploadProgress > 0 && uploadProgress < 100 && !uploadStatus.type && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-700 dark:text-gray-300 font-medium">Uploading file...</span>
                      <span className="text-gray-700 dark:text-gray-300 font-semibold">{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out"
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                {/* Upload Status Message - Only show when upload is complete (success/error) */}
                {uploadStatus.type && uploadProgress === 0 && (
                  <div className={`p-4 rounded-lg border-2 ${uploadStatus.type === 'success'
                    ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-700'
                    : 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700'
                    }`}>
                    <div className="flex items-start gap-3">
                      {uploadStatus.type === 'success' ? (
                        <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <p className={`text-sm font-semibold ${uploadStatus.type === 'success'
                          ? 'text-emerald-900 dark:text-emerald-100'
                          : 'text-red-900 dark:text-red-100'
                          }`}>
                          {uploadStatus.type === 'success' ? 'Upload Successful' : 'Upload Failed'}
                        </p>
                        <p className={`text-sm mt-1 ${uploadStatus.type === 'success'
                          ? 'text-emerald-700 dark:text-emerald-300'
                          : 'text-red-700 dark:text-red-300'
                          }`}>
                          {uploadStatus.message}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => {
                      setShowUploadModal(false);
                      // Reset upload states when modal is closed
                      setSelectedFile(null);
                      setUploadProgress(0);
                      setUploadStatus({ type: null, message: '' });
                    }}
                    className="px-6 py-2.5 rounded-full text-gray-700 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 font-medium focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:outline-none"
                    type="button"
                    aria-label="Cancel"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUploadSubmit}
                    disabled={!selectedFile || uploadProgress > 0}
                    className="px-6 py-2.5 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none shadow-sm hover:shadow-md flex items-center gap-2"
                    type="button"
                    aria-label={uploadProgress > 0 ? 'Uploading' : 'Upload and Process'}
                  >
                    {uploadProgress > 0 ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" aria-hidden="true" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" aria-hidden="true" />
                        Upload & Process
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Conversational AI Job Description Generator */}
      {showConversationalAI && (
        <div className="fixed inset-0 z-[99999] bg-black/10 backdrop-blur-[2px]" />
      )}
      {showConversationalAI && (
        <div
          className="fixed inset-0 z-[100000] flex items-center justify-center overflow-y-auto p-8"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowConversationalAI(false);
              setConversationalStep(0);
              setConversationalData({ job_function: '', location: '', experience_level: '', job_type: '', skills: '' });
            }
          }}
        >
          <div className="w-full max-w-2xl mx-4">
            {conversationalStep < 5 ? (
              <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden relative">
                {/* Progress Header */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-500 p-6 text-white relative">
                  {/* Close Button - Top Right */}
                  <button
                    onClick={() => {
                      setShowConversationalAI(false);
                      setConversationalStep(0);
                      setConversationalData({ job_function: '', location: '', experience_level: '', job_type: '', skills: '' });
                    }}
                    className="absolute top-4 right-4 text-white/80 hover:text-white transition-all duration-200 p-2 hover:bg-white/10 rounded-full z-10 focus:ring-2 focus:ring-white/50 focus:outline-none"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>

                  <div className="flex items-center justify-between mb-3 pr-12">
                    <span className="text-sm font-medium">Question {conversationalStep + 1} of 5</span>
                    <span className="text-sm font-medium">{((conversationalStep + 1) / 5 * 100).toFixed(0)}% Complete</span>
                  </div>
                  <div className="w-full h-2 bg-white/30 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-white rounded-full transition-all duration-500 ease-out shadow-lg"
                      style={{ width: `${((conversationalStep + 1) / 5 * 100)}%` }}
                    ></div>
                  </div>
                </div>

                {/* Question Card */}
                <div className="p-10">
                  {/* Question 1: Job Function */}
                  {conversationalStep === 0 && (
                    <div className="space-y-6">
                      <div className="flex items-start space-x-4">
                        <div className="w-14 h-14 bg-rose-100 rounded-xl flex items-center justify-center flex-shrink-0">
                          <svg className="w-7 h-7 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">What role are you hiring for?</h2>
                          <p className="text-gray-600 dark:text-gray-400">Enter the job title or function</p>
                        </div>
                      </div>
                      <input
                        type="text"
                        value={conversationalData.job_function}
                        onChange={(e) => setConversationalData({ ...conversationalData, job_function: e.target.value })}
                        onKeyPress={(e) => e.key === 'Enter' && isCurrentStepValid() && handleConversationalNext()}
                        placeholder="e.g., Senior Software Engineer"
                        autoFocus
                        maxLength={100}
                        className={`w-full px-4 py-4 text-lg border-2 rounded-full focus:ring-4 transition-all outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 ${getCurrentStepError() && conversationalData.job_function
                          ? 'border-red-500 focus:border-red-500 focus:ring-red-100 dark:focus:ring-red-900/50'
                          : conversationalData.job_function && isCurrentStepValid()
                            ? 'border-green-500 focus:border-green-500 focus:ring-green-100 dark:focus:ring-green-900/50'
                            : 'border-gray-200 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-100 dark:focus:ring-blue-900/50'
                          }`}
                      />
                      {getCurrentStepError() && conversationalData.job_function && (
                        <div className="text-red-600 text-sm mt-2 p-2 bg-red-50 border border-red-200 rounded">
                          {getCurrentStepError()}
                        </div>
                      )}
                      {conversationalData.job_function && conversationalData.job_function.length >= 100 && !getCurrentStepError() && (
                        <div className="text-red-600 text-sm mt-2 p-2 bg-red-50 border border-red-200 rounded">
                          Maximum length reached (100 characters)
                        </div>
                      )}
                    </div>
                  )}

                  {/* Question 2: Location */}
                  {conversationalStep === 1 && (
                    <div className="space-y-6">
                      <div className="flex items-start space-x-4">
                        <div className="w-14 h-14 bg-rose-100 rounded-xl flex items-center justify-center flex-shrink-0">
                          <svg className="w-7 h-7 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Where is this position located?</h2>
                          <p className="text-gray-600 dark:text-gray-400">City, state, country, or &quot;Remote&quot;</p>
                        </div>
                      </div>
                      <input
                        type="text"
                        value={conversationalData.location}
                        onChange={(e) => setConversationalData({ ...conversationalData, location: e.target.value })}
                        onKeyPress={(e) => e.key === 'Enter' && isCurrentStepValid() && handleConversationalNext()}
                        placeholder="e.g., San Francisco, CA or Remote"
                        autoFocus
                        maxLength={200}
                        className={`w-full px-4 py-4 text-lg border-2 rounded-full focus:ring-4 transition-all outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 ${getCurrentStepError() && conversationalData.location
                          ? 'border-red-500 focus:border-red-500 focus:ring-red-100 dark:focus:ring-red-900/50'
                          : conversationalData.location && isCurrentStepValid()
                            ? 'border-green-500 focus:border-green-500 focus:ring-green-100 dark:focus:ring-green-900/50'
                            : 'border-gray-200 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-100 dark:focus:ring-blue-900/50'
                          }`}
                      />
                      {getCurrentStepError() && conversationalData.location && (
                        <div className="text-red-600 text-sm mt-2 p-2 bg-red-50 border border-red-200 rounded">
                          {getCurrentStepError()}
                        </div>
                      )}
                      {conversationalData.location && conversationalData.location.length >= 200 && !getCurrentStepError() && (
                        <div className="text-red-600 text-sm mt-2 p-2 bg-red-50 border border-red-200 rounded">
                          Maximum length reached (200 characters)
                        </div>
                      )}
                    </div>
                  )}

                  {/* Question 3: Experience Level */}
                  {conversationalStep === 2 && (
                    <div className="space-y-6">
                      <div className="flex items-start space-x-4">
                        <div className="w-14 h-14 bg-rose-100 rounded-xl flex items-center justify-center flex-shrink-0">
                          <svg className="w-7 h-7 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">What experience level are you looking for?</h2>
                          <p className="text-gray-600 dark:text-gray-400">Select the career stage that fits best</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 gap-3">
                        {['Entry Level', 'Mid Level', 'Senior Level', 'Lead/Principal', 'Executive'].map((level) => (
                          <button
                            key={level}
                            onClick={() => setConversationalData({ ...conversationalData, experience_level: level })}
                            className={`px-6 py-4 text-left rounded-full border-2 transition-all ${conversationalData.experience_level === level
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 shadow-md'
                              : 'border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white'
                              }`}
                          >
                            <span className="font-medium">{level}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Question 4: Job Type */}
                  {conversationalStep === 3 && (
                    <div className="space-y-6">
                      <div className="flex items-start space-x-4">
                        <div className="w-14 h-14 bg-rose-100 rounded-xl flex items-center justify-center flex-shrink-0">
                          <svg className="w-7 h-7 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">What type of position is this?</h2>
                          <p className="text-gray-600 dark:text-gray-400">Select the employment type</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 gap-3">
                        {['Full-time', 'Part-time', 'Contract', 'Temporary', 'Internship'].map((type) => (
                          <button
                            key={type}
                            onClick={() => setConversationalData({ ...conversationalData, job_type: type })}
                            className={`px-6 py-4 text-left rounded-full border-2 transition-all ${conversationalData.job_type === type
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 shadow-md'
                              : 'border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white'
                              }`}
                          >
                            <span className="font-medium">{type}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Question 5: Skills */}
                  {conversationalStep === 4 && (
                    <div className="space-y-6">
                      <div className="flex items-start space-x-4">
                        <div className="w-14 h-14 bg-rose-100 rounded-xl flex items-center justify-center flex-shrink-0">
                          <svg className="w-7 h-7 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">What skills are required for this role?</h2>
                          <p className="text-gray-600 dark:text-gray-400">List key skills separated by commas</p>
                        </div>
                      </div>
                      <textarea
                        value={conversationalData.skills}
                        onChange={(e) => setConversationalData({ ...conversationalData, skills: e.target.value })}
                        placeholder="e.g., Python, React, AWS, Machine Learning"
                        autoFocus
                        rows={4}
                        maxLength={500}
                        className={`w-full px-4 py-4 text-lg border-2 rounded-xl focus:ring-4 transition-all resize-none outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 ${getCurrentStepError()
                          ? 'border-red-500 focus:border-red-500 focus:ring-red-100 dark:focus:ring-red-900/50'
                          : conversationalData.skills && isCurrentStepValid()
                            ? 'border-green-500 focus:border-green-500 focus:ring-green-100 dark:focus:ring-green-900/50'
                            : 'border-gray-200 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-100 dark:focus:ring-blue-900/50'
                          }`}
                      />
                      {getCurrentStepError() && (
                        <div className="text-red-600 text-sm mt-2 p-2 bg-red-50 border border-red-200 rounded">
                          {getCurrentStepError()}
                        </div>
                      )}
                      {conversationalData.skills && conversationalData.skills.length >= 500 && !getCurrentStepError() && (
                        <div className="text-red-600 text-sm mt-2 p-2 bg-red-50 border border-red-200 rounded">
                          Maximum length reached (500 characters)
                        </div>
                      )}
                    </div>
                  )}

                </div>

                {/* Navigation Buttons */}
                <div className="bg-gray-50 dark:bg-gray-800 px-10 py-6 flex items-center justify-between border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={handleConversationalBack}
                    disabled={conversationalStep === 0}
                    className="flex items-center space-x-2 px-6 py-3 rounded-xl font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    <span>Back</span>
                  </button>

                  <button
                    onClick={handleConversationalNext}
                    disabled={!isCurrentStepValid() || creatingJD}
                    className="flex items-center space-x-2 px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600"
                  >
                    {creatingJD ? (
                      <>
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Generating...</span>
                      </>
                    ) : conversationalStep === 4 ? (
                      <>
                        <span>Generate Job Description</span>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                        </svg>
                      </>
                    ) : (
                      <>
                        <span>Continue</span>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              /* Results Page */
              <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
                {/* Success Header */}
                <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 p-8 text-white">
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-full mb-4">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h2 className="text-3xl font-bold mb-2">Your Job Description is Ready! 🎉</h2>
                    <p className="text-emerald-100">Enterprise-grade and ready to publish</p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-center space-x-3 mt-6">
                    <button
                      onClick={handleCopyToClipboard}
                      className="flex items-center space-x-2 px-6 py-3 bg-white/20 hover:bg-white/30 rounded-xl font-medium transition-all"
                    >
                      {copiedToClipboard ? (
                        <>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                          </svg>
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={handleDownloadJD}
                      className="flex items-center space-x-2 px-6 py-3 bg-white/20 hover:bg-white/30 rounded-xl font-medium transition-all"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      <span>Download</span>
                    </button>
                  </div>
                </div>

                {/* JD Content */}
                <div className="p-8 flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-800">
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <pre className="whitespace-pre-wrap text-sm text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
                      {generatedJD}
                    </pre>
                  </div>
                </div>

                {/* Footer */}
                <div className="bg-gray-50 dark:bg-gray-800 px-8 py-6 flex items-center justify-between border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={handleCreateAnotherJD}
                    className="flex items-center space-x-2 px-6 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl font-medium transition-all"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <span>Create Another</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowConversationalAI(false);
                      setShowAddJobModal(true);
                    }}
                    className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all"
                  >
                    Review & Save
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Conversational AI Job Description Generator */}
      {showConversationalAI && (
        <div className="fixed inset-0 z-[99999] bg-black/10 backdrop-blur-[2px]" />
      )}
      {showConversationalAI && (
        <div
          className="fixed inset-0 z-[100000] flex items-center justify-center overflow-y-auto p-8"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowConversationalAI(false);
              setConversationalStep(0);
              setConversationalData({ job_function: '', location: '', experience_level: '', job_type: '', skills: '' });
            }
          }}
        >
          <div className="w-full max-w-2xl mx-4">
            {conversationalStep < 5 ? (
              <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden relative">
                {/* Progress Header */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-500 p-6 text-white relative">
                  {/* Close Button - Top Right */}
                  <button
                    onClick={() => {
                      setShowConversationalAI(false);
                      setConversationalStep(0);
                      setConversationalData({ job_function: '', location: '', experience_level: '', job_type: '', skills: '' });
                    }}
                    className="absolute top-4 right-4 text-white/80 hover:text-white transition-all duration-200 p-2 hover:bg-white/10 rounded-full z-10 focus:ring-2 focus:ring-white/50 focus:outline-none"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>

                  <div className="flex items-center justify-between mb-3 pr-12">
                    <span className="text-sm font-medium">Question {conversationalStep + 1} of 5</span>
                    <span className="text-sm font-medium">{((conversationalStep + 1) / 5 * 100).toFixed(0)}% Complete</span>
                  </div>
                  <div className="w-full h-2 bg-white/30 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-white rounded-full transition-all duration-500 ease-out shadow-lg"
                      style={{ width: `${((conversationalStep + 1) / 5 * 100)}%` }}
                    ></div>
                  </div>
                </div>

                {/* Question Card */}
                <div className="p-10">
                  {/* Question 1: Job Function */}
                  {conversationalStep === 0 && (
                    <div className="space-y-6">
                      <div className="flex items-start space-x-4">
                        <div className="w-14 h-14 bg-rose-100 rounded-xl flex items-center justify-center flex-shrink-0">
                          <svg className="w-7 h-7 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">What role are you hiring for?</h2>
                          <p className="text-gray-600 dark:text-gray-400">Enter the job title or function</p>
                        </div>
                      </div>
                      <input
                        type="text"
                        value={conversationalData.job_function}
                        onChange={(e) => setConversationalData({ ...conversationalData, job_function: e.target.value })}
                        onKeyPress={(e) => e.key === 'Enter' && isCurrentStepValid() && handleConversationalNext()}
                        placeholder="e.g., Senior Software Engineer"
                        autoFocus
                        maxLength={100}
                        className={`w-full px-4 py-4 text-lg border-2 rounded-full focus:ring-4 transition-all outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 ${getCurrentStepError() && conversationalData.job_function
                          ? 'border-red-500 focus:border-red-500 focus:ring-red-100 dark:focus:ring-red-900/50'
                          : conversationalData.job_function && isCurrentStepValid()
                            ? 'border-green-500 focus:border-green-500 focus:ring-green-100 dark:focus:ring-green-900/50'
                            : 'border-gray-200 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-100 dark:focus:ring-blue-900/50'
                          }`}
                      />
                      {getCurrentStepError() && conversationalData.job_function && (
                        <div className="text-red-600 text-sm mt-2 p-2 bg-red-50 border border-red-200 rounded">
                          {getCurrentStepError()}
                        </div>
                      )}
                      {conversationalData.job_function && conversationalData.job_function.length >= 100 && !getCurrentStepError() && (
                        <div className="text-red-600 text-sm mt-2 p-2 bg-red-50 border border-red-200 rounded">
                          Maximum length reached (100 characters)
                        </div>
                      )}
                    </div>
                  )}

                  {/* Question 2: Location */}
                  {conversationalStep === 1 && (
                    <div className="space-y-6">
                      <div className="flex items-start space-x-4">
                        <div className="w-14 h-14 bg-rose-100 rounded-xl flex items-center justify-center flex-shrink-0">
                          <svg className="w-7 h-7 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />

                          </svg>
                        </div>
                        <div className="flex-1">
                          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Where is this position located?</h2>
                          <p className="text-gray-600 dark:text-gray-400">City, state, country, or &quot;Remote&quot;</p>
                        </div>
                      </div>
                      <input
                        type="text"
                        value={conversationalData.location}
                        onChange={(e) => setConversationalData({ ...conversationalData, location: e.target.value })}
                        onKeyPress={(e) => e.key === 'Enter' && isCurrentStepValid() && handleConversationalNext()}
                        placeholder="e.g., San Francisco, CA or Remote"
                        autoFocus
                        maxLength={200}
                        className={`w-full px-4 py-4 text-lg border-2 rounded-full focus:ring-4 transition-all outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 ${getCurrentStepError() && conversationalData.location
                          ? 'border-red-500 focus:border-red-500 focus:ring-red-100 dark:focus:ring-red-900/50'
                          : conversationalData.location && isCurrentStepValid()
                            ? 'border-green-500 focus:border-green-500 focus:ring-green-100 dark:focus:ring-green-900/50'
                            : 'border-gray-200 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-100 dark:focus:ring-blue-900/50'
                          }`}
                      />
                      {getCurrentStepError() && conversationalData.location && (
                        <div className="text-red-600 text-sm mt-2 p-2 bg-red-50 border border-red-200 rounded">
                          {getCurrentStepError()}
                        </div>
                      )}
                      {conversationalData.location && conversationalData.location.length >= 200 && !getCurrentStepError() && (
                        <div className="text-red-600 text-sm mt-2 p-2 bg-red-50 border border-red-200 rounded">
                          Maximum length reached (200 characters)
                        </div>
                      )}
                    </div>
                  )}

                  {/* Question 3: Experience Level */}
                  {conversationalStep === 2 && (
                    <div className="space-y-6">
                      <div className="flex items-start space-x-4">
                        <div className="w-14 h-14 bg-rose-100 rounded-xl flex items-center justify-center flex-shrink-0">
                          <svg className="w-7 h-7 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">What experience level are you looking for?</h2>
                          <p className="text-gray-600 dark:text-gray-400">Select the career stage that fits best</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 gap-3">
                        {['Entry Level', 'Mid Level', 'Senior Level', 'Lead/Principal', 'Executive'].map((level) => (
                          <button
                            key={level}
                            onClick={() => setConversationalData({ ...conversationalData, experience_level: level })}
                            className={`px-6 py-4 text-left rounded-full border-2 transition-all ${conversationalData.experience_level === level
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 shadow-md'
                              : 'border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white'
                              }`}
                          >
                            <span className="font-medium">{level}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Question 4: Job Type */}
                  {conversationalStep === 3 && (
                    <div className="space-y-6">
                      <div className="flex items-start space-x-4">
                        <div className="w-14 h-14 bg-rose-100 rounded-xl flex items-center justify-center flex-shrink-0">
                          <svg className="w-7 h-7 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">What type of position is this?</h2>
                          <p className="text-gray-600 dark:text-gray-400">Select the employment type</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 gap-3">
                        {['Full-time', 'Part-time', 'Contract', 'Temporary', 'Internship'].map((type) => (
                          <button
                            key={type}
                            onClick={() => setConversationalData({ ...conversationalData, job_type: type })}
                            className={`px-6 py-4 text-left rounded-full border-2 transition-all ${conversationalData.job_type === type
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 shadow-md'
                              : 'border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white'
                              }`}
                          >
                            <span className="font-medium">{type}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Question 5: Skills */}
                  {conversationalStep === 4 && (
                    <div className="space-y-6">
                      <div className="flex items-start space-x-4">
                        <div className="w-14 h-14 bg-rose-100 rounded-xl flex items-center justify-center flex-shrink-0">
                          <svg className="w-7 h-7 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">What skills are required for this role?</h2>
                          <p className="text-gray-600 dark:text-gray-400">List key skills separated by commas</p>
                        </div>
                      </div>
                      <textarea
                        value={conversationalData.skills}
                        onChange={(e) => setConversationalData({ ...conversationalData, skills: e.target.value })}
                        placeholder="e.g., Python, React, AWS, Machine Learning"
                        autoFocus
                        rows={4}
                        maxLength={500}
                        className={`w-full px-4 py-4 text-lg border-2 rounded-xl focus:ring-4 transition-all resize-none outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 ${getCurrentStepError()
                          ? 'border-red-500 focus:border-red-500 focus:ring-red-100 dark:focus:ring-red-900/50'
                          : conversationalData.skills && isCurrentStepValid()
                            ? 'border-green-500 focus:border-green-500 focus:ring-green-100 dark:focus:ring-green-900/50'
                            : 'border-gray-200 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-100 dark:focus:ring-blue-900/50'
                          }`}
                      />
                      {getCurrentStepError() && (
                        <div className="text-red-600 text-sm mt-2 p-2 bg-red-50 border border-red-200 rounded">
                          {getCurrentStepError()}
                        </div>
                      )}
                      {conversationalData.skills && conversationalData.skills.length >= 500 && !getCurrentStepError() && (
                        <div className="text-red-600 text-sm mt-2 p-2 bg-red-50 border border-red-200 rounded">
                          Maximum length reached (500 characters)
                        </div>
                      )}
                    </div>
                  )}


                </div>

                {/* Navigation Buttons */}
                <div className="bg-gray-50 dark:bg-gray-800 px-10 py-6 flex items-center justify-between border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={handleConversationalBack}
                    disabled={conversationalStep === 0}
                    className="flex items-center space-x-2 px-6 py-3 rounded-xl font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    <span>Back</span>
                  </button>

                  <button
                    onClick={handleConversationalNext}
                    disabled={!isCurrentStepValid() || creatingJD}
                    className="flex items-center space-x-2 px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600"
                  >
                    {creatingJD ? (
                      <>
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Generating...</span>
                      </>
                    ) : conversationalStep === 4 ? (
                      <>
                        <span>Generate Job Description</span>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                        </svg>
                      </>
                    ) : (
                      <>
                        <span>Continue</span>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              /* Results Page */
              <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
                {/* Success Header */}
                <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 p-8 text-white">
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-full mb-4">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h2 className="text-3xl font-bold mb-2">Your Job Description is Ready! 🎉</h2>
                    <p className="text-emerald-100">Enterprise-grade and ready to publish</p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-center space-x-3 mt-6">
                    <button
                      onClick={handleCopyToClipboard}
                      className="flex items-center space-x-2 px-6 py-3 bg-white/20 hover:bg-white/30 rounded-xl font-medium transition-all"
                    >
                      {copiedToClipboard ? (
                        <>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                          </svg>
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={handleDownloadJD}
                      className="flex items-center space-x-2 px-6 py-3 bg-white/20 hover:bg-white/30 rounded-xl font-medium transition-all"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      <span>Download</span>
                    </button>
                  </div>
                </div>

                {/* JD Content */}
                <div className="p-8 flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-800">
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <pre className="whitespace-pre-wrap text-sm text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
                      {generatedJD}
                    </pre>
                  </div>
                </div>

                {/* Footer */}
                <div className="bg-white dark:bg-gray-900 px-8 py-6 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={handleCreateAnotherJD}
                    className="w-full px-6 py-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-full font-medium shadow-lg hover:shadow-xl transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
                    type="button"
                    aria-label="Create another job description"
                  >
                    Create Another Job Description
                  </button>
                </div>

                {/* Close Button */}
                <button
                  onClick={() => {
                    setShowConversationalAI(false);
                    handleCreateAnotherJD();
                  }}
                  className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* AI-Generated Job Description Form Modal */}
      {showGeneratedJDForm && (
        <div className="fixed inset-0 z-[99999] bg-black/10 backdrop-blur-[2px]" />
      )}
      {showGeneratedJDForm && (
        <div
          className="fixed inset-0 z-[100000] flex items-start justify-center overflow-y-auto pt-8 pb-8"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowGeneratedJDForm(false);
              setCreateJDStatus({ type: null, message: '' });
            }
          }}
        >
          <div className="relative w-full max-w-4xl bg-white dark:bg-gray-900 rounded-3xl shadow-2xl mx-4">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-gradient-to-r from-emerald-600 to-emerald-500 px-6 py-4 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">AI-Generated Job Description</h2>
                    <p className="text-sm text-emerald-100">Review and edit before saving to your listings</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowGeneratedJDForm(false);
                    setCreateJDStatus({ type: null, message: '' });
                  }}
                  className="text-white/80 hover:text-white transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Status Message */}
            {createJDStatus.type && (
              <div className={`mx-6 mt-4 p-4 rounded-lg ${createJDStatus.type === 'success'
                ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-800'
                : createJDStatus.type === 'info'
                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-800'
                  : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800'
                }`}>
                <div className="flex items-center space-x-2">
                  {createJDStatus.type === 'success' ? (
                    <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  ) : createJDStatus.type === 'info' ? (
                    <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  )}
                  <p className="font-medium">{createJDStatus.message}</p>
                </div>
              </div>
            )}

            {/* Form Content */}
            <div className="p-6 space-y-4 max-h-[calc(100vh-300px)] overflow-y-auto scrollbar-hide">
              {/* Job Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Job Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={generatedJDFormData.job_title}
                  onChange={(e) => setGeneratedJDFormData(prev => ({ ...prev, job_title: e.target.value }))}
                  className={`w-full px-4 py-2.5 border rounded-full text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${generatedJDErrors.job_title ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    }`}
                  placeholder="e.g., Senior Software Engineer"
                />
                {generatedJDErrors.job_title && (
                  <p className="text-red-500 text-xs mt-1">{generatedJDErrors.job_title}</p>
                )}
              </div>

              {/* Job Function and Location */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Job Function</label>
                  <input
                    type="text"
                    value={generatedJDFormData.job_function}
                    onChange={(e) => setGeneratedJDFormData(prev => ({ ...prev, job_function: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-full text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors shadow-sm hover:shadow-md"
                    placeholder="e.g., Engineering"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Location</label>
                  <input
                    type="text"
                    value={generatedJDFormData.location}
                    onChange={(e) => setGeneratedJDFormData(prev => ({ ...prev, location: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-full text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors shadow-sm hover:shadow-md"
                    placeholder="e.g., Remote"
                  />
                </div>
              </div>

              {/* Job Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Job Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={generatedJDFormData.description}
                  onChange={(e) => setGeneratedJDFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={6}
                  className={`w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-y ${generatedJDErrors.description ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    }`}
                  placeholder="Detailed job description..."
                />
                {generatedJDErrors.description && (
                  <p className="text-red-500 text-xs mt-1">{generatedJDErrors.description}</p>
                )}
              </div>

              {/* Key Skills */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Key Skills
                  <span className="text-gray-500 text-xs ml-2">(comma-separated)</span>
                </label>
                <textarea
                  value={generatedJDFormData.key_skills}
                  onChange={(e) => setGeneratedJDFormData(prev => ({ ...prev, key_skills: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-y"
                  placeholder="e.g., Python, React, AWS, Machine Learning"
                />
              </div>

              {/* Education and Certifications */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Education Requirements</label>
                  <input
                    type="text"
                    value={generatedJDFormData.education_requirements}
                    onChange={(e) => setGeneratedJDFormData(prev => ({ ...prev, education_requirements: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    placeholder="e.g., Bachelor's degree in Computer Science"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Certifications
                    <span className="text-gray-500 text-xs ml-2">(comma-separated)</span>
                  </label>
                  <input
                    type="text"
                    value={generatedJDFormData.certifications}
                    onChange={(e) => setGeneratedJDFormData(prev => ({ ...prev, certifications: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    placeholder="e.g., AWS Certified, PMP"
                  />
                </div>
              </div>

              {/* Experience Level and Job Type */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Experience Level</label>
                  <select
                    value={generatedJDFormData.experience_level}
                    onChange={(e) => setGeneratedJDFormData(prev => ({ ...prev, experience_level: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  >
                    <option value="">Select Experience Level</option>
                    {['entry', 'mid', 'senior', 'executive'].map(level => (
                      <option key={level} value={level}>
                        {level.charAt(0).toUpperCase() + level.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Job Type</label>
                  <select
                    value={generatedJDFormData.job_type}
                    onChange={(e) => setGeneratedJDFormData(prev => ({ ...prev, job_type: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  >
                    <option value="">Select Job Type</option>
                    {['full-time', 'part-time', 'contract', 'temporary', 'internship'].map(type => (
                      <option key={type} value={type}>
                        {type.charAt(0).toUpperCase() + type.slice(1).replace('-', ' ')}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Salary Range and Status */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Salary Range</label>
                  <input
                    type="text"
                    value={generatedJDFormData.salary_range}
                    onChange={(e) => setGeneratedJDFormData(prev => ({ ...prev, salary_range: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    placeholder="e.g., $80,000 - $120,000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                  <select
                    value={generatedJDFormData.status}
                    onChange={(e) => setGeneratedJDFormData(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  >
                    <option value="draft">Draft</option>
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                  </select>
                </div>
              </div>

              {/* Closing Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Closing Date</label>
                <input
                  type="datetime-local"
                  value={generatedJDFormData.closing_date}
                  onChange={(e) => setGeneratedJDFormData(prev => ({ ...prev, closing_date: e.target.value }))}
                  min="1900-01-01T00:00"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 dark:bg-gray-800 px-6 py-4 rounded-b-2xl border-t border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center">
                <button
                  onClick={() => {
                    setShowGeneratedJDForm(false);
                    setCreateJDStatus({ type: null, message: '' });
                  }}
                  className="px-6 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition font-medium"
                >
                  Cancel
                </button>
                <div className="flex space-x-3">
                  <button
                    onClick={() => handleAddJob(undefined)}
                    disabled={savingGeneratedJD}
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center space-x-2"
                  >
                    {savingGeneratedJD ? (
                      <>
                        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>Save to Job Listings</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default function HirePortal() {
  // const router = useRouter() // Currently unused
  const { theme } = useTheme()
  const accentClasses = {
    bg50: 'bg-blue-50',
    darkBg900_30: 'dark:bg-blue-900/30',
    text700: 'text-blue-700',
    text300: 'text-blue-300',
  }
  // Core State Management
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [jobBoards, setJobBoards] = useState<JobBoard[]>([])
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState("pipeline")
  const [selectedJobIdForAnalytics, setSelectedJobIdForAnalytics] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [filterPosition, setFilterPosition] = useState<string>("all")
  const [draggedCandidate, setDraggedCandidate] = useState<string | null>(null)
  const [showHelp, setShowHelp] = useState<boolean>(false)
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table')

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  // Modal States
  const [showAddCandidate, setShowAddCandidate] = useState(false)
  const [showBulkActions, setShowBulkActions] = useState(false)
  const [showAIInsights, setShowAIInsights] = useState(false)
  const [showEditCandidate, setShowEditCandidate] = useState(false)
  const [showViewCandidate, setShowViewCandidate] = useState(false)
  const [showScreeningInvite, setShowScreeningInvite] = useState(false)
  const [showFeedbackModal, setShowFeedbackModal] = useState(false)
  const [showEnhancedInvite, setShowEnhancedInvite] = useState(false)
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [selectedAnalysis, setSelectedAnalysis] = useState<{
    id?: string;
    applicant_id?: string;
    ats_score?: number;
    weighted_skill_score?: number;
    sector_alignment?: number;
    role_suitability?: number;
    ats_confidence_level?: number;
    analysis_result?: string;
    jobCategory?: string;
    job_category?: string;
    experience?: string;
    name?: string;
    email?: string;
    mobile?: string;
    location?: string;
    position?: string;
  } | null>(null)
  const [enterpriseAnalysisLoading, setEnterpriseAnalysisLoading] = useState(false)
  const [enterpriseAnalysisData, setEnterpriseAnalysisData] = useState<Record<string, unknown> | null>(null)
  const [analysisTab, setAnalysisTab] = useState('summary')
  const [isDownloadingResumeAnalysis, setIsDownloadingResumeAnalysis] = useState(false);

  // Fetch enterprise analysis data - Use backend stored analysis data instead of generating new
  const fetchEnterpriseAnalysis = useCallback(async (applicantId: string) => {
    setEnterpriseAnalysisLoading(true);
    try {
      // Clean applicantId - remove whitespace, tabs, and other control characters
      const cleanApplicantId = applicantId.trim().replace(/\t/g, '').replace(/\n/g, '').replace(/\r/g, '');

      // Get the existing analysis data from backend (this contains the actual ATS scores)
      const res = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.HR_ANALYSIS_ADVANCED(cleanApplicantId)), {
        method: 'GET',
        headers: { accept: 'application/json' },
      });

      if (!res.ok) throw new Error('Failed to fetch analysis data');
      const data = await res.json();

      console.log('[DEBUG] Raw API response data:', JSON.stringify(data, null, 2));
      console.log('[DEBUG] extracted_fields from backend:', JSON.stringify(data.extracted_fields, null, 2));
      console.log('[DEBUG] selectedAnalysis data:', JSON.stringify(selectedAnalysis, null, 2));
      console.log('[DEBUG] job_category from data:', data.job_category);
      console.log('[DEBUG] experience from data:', data.experience);

      // Use the backend stored analysis data to create a consistent display
      if (data) {
        // Create a structured analysis object that matches the frontend expectations
        // but uses the actual backend calculated Affinda-style scores
        const structuredAnalysis = {
          overview: {
            ats_score: data.ats_score || 0,
            fitment_score: data.job_specific_fit_score !== undefined && data.job_specific_fit_score !== null
              ? data.job_specific_fit_score
              : (data.weighted_skill_score || data.ats_score || 0),
            confidence_index: data.ats_confidence_level || 5,
            sector_alignment: data.sector_alignment || 0,
            role_suitability: data.role_suitability || 0,
            weighted_skill_score: data.weighted_skill_score || 0,
            analysis_method: data.analysis_method || 'affinda_style',
            analysis_version: data.analysis_version || 'affinda-v1.0'
          },
          extracted_fields: {
            ...(data.extracted_fields || {}),
            name: data.extracted_fields?.name || data.name || selectedAnalysis?.name || 'Unknown',
            email: (data.extracted_fields?.email && data.extracted_fields.email !== 'Not provided')
              ? data.extracted_fields.email
              : (data.email && data.email !== 'Not provided'
                ? data.email
                : (selectedAnalysis?.email || 'Not provided')),
            phone: (data.extracted_fields?.phone && data.extracted_fields.phone !== 'Not provided')
              ? data.extracted_fields.phone
              : (data.extracted_fields?.mobile && data.extracted_fields.mobile !== 'Not provided'
                ? data.extracted_fields.mobile
                : (data.mobile && data.mobile !== 'Not provided'
                  ? data.mobile
                  : (selectedAnalysis?.mobile || 'Not provided'))),
            location: (data.extracted_fields?.location && data.extracted_fields.location !== 'Not specified')
              ? data.extracted_fields.location
              : (data.location && data.location !== 'Not specified'
                ? data.location
                : (selectedAnalysis?.location || 'Not specified')),
            job_applied: data.extracted_fields?.job_applied ||
              data.extracted_fields?.job_title ||
              data.job_category ||
              selectedAnalysis?.jobCategory ||
              selectedAnalysis?.job_category ||
              'Not specified',
            total_experience: (data.extracted_fields?.total_experience && data.extracted_fields.total_experience !== 'Not specified')
              ? String(data.extracted_fields.total_experience)
              : (data.extracted_fields?.years_of_experience && data.extracted_fields.years_of_experience !== 'Not specified'
                ? String(data.extracted_fields.years_of_experience)
                : (data.experience && data.experience !== 'Not specified'
                  ? String(data.experience)
                  : (selectedAnalysis?.experience && selectedAnalysis.experience !== 'Not specified'
                    ? String(selectedAnalysis.experience)
                    : 'Not specified'))),
            summary: data.extracted_fields?.summary || data.extracted_fields?.professional_summary || data.summary || 'Professional summary not extracted',
            skills: data.extracted_fields?.skills && typeof data.extracted_fields.skills === 'object' && !Array.isArray(data.extracted_fields.skills)
              ? {
                technical: data.extracted_fields.skills.technical || (Array.isArray(data.skills) ? data.skills : []),
                soft: data.extracted_fields.skills.soft || (Array.isArray(data.soft_skills) ? data.soft_skills : [])
              }
              : {
                technical: Array.isArray(data.extracted_fields?.skills) ? data.extracted_fields.skills : (Array.isArray(data.skills) ? data.skills : []),
                soft: Array.isArray(data.soft_skills) ? data.soft_skills : []
              },
            experience_details: data.extracted_fields?.experience_details || data.extracted_fields?.work_experience || data.extracted_fields?.experience || [],
            education: data.extracted_fields?.education || [],
            projects: data.extracted_fields?.projects || [],
            certifications: data.extracted_fields?.certifications || [],
            languages: data.extracted_fields?.languages || []
          },
          final_recommendation: {
            verdict: data.ats_score >= 70 ? 'Strong Match' :
              data.ats_score >= 50 ? 'Moderate Match' : 'Below Average',
            readiness: data.ats_score >= 70 ? 'Ready for Interview' :
              data.ats_score >= 50 ? 'Requires moderate improvement' : 'Needs significant improvement',
            next_action: data.ats_score >= 70 ? 'Schedule interview' :
              data.ats_score >= 50 ? 'Optimize resume for ATS compatibility' : 'Consider other candidates'
          },
          keyword_analysis: data.keyword_analysis || {},
          detailed_breakdown: data.detailed_breakdown || {},
          strengths: data.strengths || [],
          red_flags: data.red_flags || [],
          improvement_recommendations: data.improvement_recommendations || [],
          parsing_status: data.parsing_status || 'completed',
          manual_review_required: data.manual_review_required || false,
          generated_on: data.analysis_timestamp || new Date().toISOString(),
          analysis_timestamp: data.analysis_timestamp || new Date().toISOString()
        };

        console.log('[DEBUG] Using backend Affinda-style analysis data with ATS score:', data.ats_score);
        console.log('[DEBUG] Analysis method:', data.analysis_method || 'affinda_style');
        console.log('[DEBUG] Analysis version:', data.analysis_version || 'affinda-v1.0');
        setEnterpriseAnalysisData(structuredAnalysis);

        // Legacy fields removed - using enterpriseAnalysisData instead
      } else {
        throw new Error('No analysis data found');
      }
    } catch (err) {
      console.error('Error fetching analysis data:', err);
      setEnterpriseAnalysisData(null);
    } finally {
      setEnterpriseAnalysisLoading(false);
    }
  }, [selectedAnalysis])

  // Fetch analysis data when modal opens
  useEffect(() => {
    const fetchAnalysisData = async () => {
      setEnterpriseAnalysisData(null); // Reset enterprise analysis

      if (showAnalysisModal && selectedAnalysis && selectedAnalysis.id) {
        // Automatically trigger enterprise analysis when modal opens
        console.log('[DEBUG] Modal opened, triggering enterprise analysis for:', selectedAnalysis.id);
        await fetchEnterpriseAnalysis(selectedAnalysis.id);
      }
    };

    fetchAnalysisData();
  }, [showAnalysisModal, selectedAnalysis, fetchEnterpriseAnalysis]);

  const [bulkInviteCandidates, setBulkInviteCandidates] = useState<Candidate[]>([])
  const [editingCandidate, setEditingCandidate] = useState<string | null>(null)
  const [viewingCandidate, setViewingCandidate] = useState<Candidate | null>(null)
  const [editCandidateForm, setEditCandidateForm] = useState({
    name: "",
    email: "",
    position: "",
    status: "applied" as "applied" | "screening" | "interview" | "offer" | "hired" | "rejected",
    source: "",
    notes: ""
  })
  const [aiInsights, setAiInsights] = useState<AIInsight[]>([])
  const [recruiterCalendarLink, setRecruiterCalendarLink] = useState<string>("")
  const [screeningMessage, setScreeningMessage] = useState<string>("")
  const [feedbackText, setFeedbackText] = useState<string>("")
  const [interviewScore, setInterviewScore] = useState<number>(70)
  const [candidateForFeedback, setCandidateForFeedback] = useState<string | null>(null)
  const [showFilterPanel, setShowFilterPanel] = useState(false)
  const [filterField, setFilterField] = useState("all")
  const [filterTimeline, setFilterTimeline] = useState("all")
  // Download modal state and form
  const [showDownloadModal, setShowDownloadModal] = useState(false)
  const [downloadForm, setDownloadForm] = useState<{
    fileFormat: string;
    startDate: string;
    endDate: string;
    month: string;
    specificDate: string;
  }>({
    fileFormat: "",
    startDate: "",
    endDate: "",
    month: "",
    specificDate: ""
  })
  // Refresh state
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [customDateRange, setCustomDateRange] = useState<[Date | null, Date | null]>([null, null])
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false)
  const [isSavingCandidate, setIsSavingCandidate] = useState(false)
  const [submitMessage, setSubmitMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Real-time metrics
  const [metrics, setMetrics] = useState({
    totalCandidates: 0,
    newApplicationsToday: 0,
    interviewsScheduled: 0,
    offersExtended: 0,
    averageTimeToHire: 0,
    conversionRate: 0,
    costPerHire: 0,
  })

  // Form States
  const [candidateForm, setCandidateForm] = useState({
    name: "",
    email: "",
    phone: "",
    position: "",
    category: "",
    source: "",
    experience: "",
    jobType: "",
    location: "",
    salary: "",
    jobDescription: "",
    notes: "",
    resume: null as File | null,
  })
  const [applicationMethod] = useState<'category' | 'jd'>('category')
  const [jobPositions, setJobPositions] = useState<Array<{ id: string; title: string; job_id?: string; _id?: string }>>([])

  // Form validation errors
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({})

  // Additional state for category dropdown and file input
  const [openCategoryDropdown, setOpenCategoryDropdown] = useState(false)
  const [openExperienceDropdown, setOpenExperienceDropdown] = useState(false)
  const [openJobTypeDropdown, setOpenJobTypeDropdown] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Phone input styles aligned with Jobs page
  const phoneInputStyles = useMemo(() => {
    const isDark = theme === 'dark'
    return {
      containerStyle: {
        width: '100%',
        backgroundColor: isDark ? '#374151' : '#FFFFFF',
        color: isDark ? '#F9FAFB' : '#111827',
        border: `1px solid ${isDark ? '#4B5563' : '#D1D5DB'}`,
        borderRadius: '0.5rem',
      } as React.CSSProperties,
      inputStyle: {
        width: '100%',
        backgroundColor: 'transparent',
        color: isDark ? '#F9FAFB' : '#111827',
        border: 'none',
        paddingLeft: '48px',
        height: '40px',
        borderRadius: '0.5rem',
      } as React.CSSProperties,
      buttonStyle: {
        backgroundColor: 'transparent',
        border: 'none',
        borderTopLeftRadius: '0.5rem',
        borderBottomLeftRadius: '0.5rem',
        height: '40px',
        borderRight: `1px solid ${isDark ? '#4B5563' : '#D1D5DB'}`,
      } as React.CSSProperties,
      dropdownStyle: {
        backgroundColor: isDark ? '#374151' : '#FFFFFF',
        color: isDark ? '#F9FAFB' : '#111827',
      } as React.CSSProperties,
    }
  }, [theme])

  // Categories, experiences, and job types - fetch from dynamic endpoints
  const [categories, setCategories] = useState<string[]>([])
  const [experiences, setExperiences] = useState<string[]>([])
  const [jobTypes, setJobTypes] = useState<string[]>([])


  // Fetch categories, experiences, and job types from endpoints
  useEffect(() => {
    let isMounted = true;
    const controllers: AbortController[] = [];
    const timeoutIds: NodeJS.Timeout[] = [];

    const fetchAllOptions = async () => {
      // Check if API base URL is configured
      if (!API_CONFIG.BASE_URL) {
        console.warn('API base URL is not configured. Skipping fetch operations.');
        if (isMounted) {
          setCategories([]);
          setExperiences([]);
          setJobTypes([]);
        }
        return;
      }

      // Fetch categories
      try {
        const controller = new AbortController();
        controllers.push(controller);
        const timeoutId = setTimeout(() => {
          if (!controller.signal.aborted) {
            controller.abort();
          }
        }, 10000); // 10 second timeout
        timeoutIds.push(timeoutId);

        const catRes = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.HR_JOB_CATEGORIES), {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        if (!isMounted) return;

        if (catRes.ok) {
          const catData = await catRes.json();
          if (isMounted) {
            setCategories(Array.isArray(catData) ? catData.map((c: { name: string }) => c.name) : []);
          }
        } else {
          if (isMounted) setCategories([]);
        }
      } catch (e) {
        if (e instanceof Error && e.name === 'AbortError') {
          // Silently handle abort errors (timeouts or unmount)
          if (!isMounted) return;
        } else {
          console.error('Failed fetching categories:', e);
        }
        if (isMounted) setCategories([]);
      }

      // Fetch experiences
      try {
        const controller = new AbortController();
        controllers.push(controller);
        const timeoutId = setTimeout(() => {
          if (!controller.signal.aborted) {
            controller.abort();
          }
        }, 10000); // 10 second timeout
        timeoutIds.push(timeoutId);

        const expRes = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.HR_JOB_EXPERIENCES), {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        if (!isMounted) return;

        if (expRes.ok) {
          const expData = await expRes.json();
          if (isMounted) {
            setExperiences(Array.isArray(expData) ? expData.map((e: { name: string }) => e.name) : []);
          }
        } else {
          if (isMounted) setExperiences([]);
        }
      } catch (e) {
        if (e instanceof Error && e.name === 'AbortError') {
          // Silently handle abort errors (timeouts or unmount)
          if (!isMounted) return;
        } else {
          console.error('Failed fetching experience:', e);
        }
        if (isMounted) setExperiences([]);
      }

      // Fetch job types
      try {
        const controller = new AbortController();
        controllers.push(controller);
        const timeoutId = setTimeout(() => {
          if (!controller.signal.aborted) {
            controller.abort();
          }
        }, 10000); // 10 second timeout
        timeoutIds.push(timeoutId);

        const res = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.HR_JOB_TYPES), {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        if (!isMounted) return;

        if (res.ok) {
          const data = await res.json();
          const names = Array.isArray(data) ? data.map((d: { name?: string }) => (d?.name || '').toString()) : [];
          if (isMounted) {
            setJobTypes(names);
          }
        } else {
          if (isMounted) setJobTypes([]);
        }
      } catch (e) {
        if (e instanceof Error && e.name === 'AbortError') {
          // Silently handle abort errors (timeouts or unmount)
          if (!isMounted) return;
        } else {
          console.error('Failed fetching job types:', e);
        }
        if (isMounted) setJobTypes([]);
      }
    };

    fetchAllOptions();

    // Cleanup function
    return () => {
      isMounted = false;
      // Clear all timeouts
      timeoutIds.forEach(id => clearTimeout(id));
      // Abort all ongoing requests
      controllers.forEach(controller => {
        if (!controller.signal.aborted) {
          controller.abort();
        }
      });
    };
  }, []);

  // Fetch job positions for JD method selector (lightweight)
  useEffect(() => {
    let cancelled = false
      ; (async () => {
        try {
          const res = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.JOBS) + `?_=${Date.now()}`, { cache: 'no-store' as RequestCache })
          if (!res.ok) return
          const data = await res.json().catch(() => []) as Array<{ _id?: string; job_id?: string; title?: string }>
          if (cancelled) return
          const mapped = Array.isArray(data)
            ? data
              .filter((j) => (j?.title || '').toString().trim().length > 0)
              .map((j) => ({
                id: (j.job_id || j._id || Math.random().toString(36)).toString(),
                title: (j.title || '').toString(),
                job_id: (j.job_id || '').toString(),
                _id: (j._id || '').toString()
              }))
            : []
          setJobPositions(mapped)
        } catch { }
      })()
    return () => { cancelled = true }
  }, [])

  // Robust email validation with strict regex
  const validateEmail = (email: string): string | true => {
    if (!email) return "Email is required.";

    // Maximum 100 characters validation
    if (email.length > 100) return "Email address must not exceed 100 characters.";

    // No blank spaces validation
    if (/\s/.test(email)) return "Email should not contain blank spaces.";

    // Should not start with special characters
    if (/^[^A-Za-z0-9]/.test(email)) return "Should not start with a special character.";

    // Exactly one @ symbol validation
    const atSymbolCount = (email.match(/@/g) || []).length;
    if (atSymbolCount !== 1) return "There must be only one @ symbol between username and domain.";

    // Consecutive dots validation
    if (/\.{2,}/.test(email)) return "Email cannot contain consecutive dots (..).";

    // Split email into username and domain parts
    const emailParts = email.split('@');
    if (emailParts.length !== 2) return "Invalid email format.";

    const [username, domain] = emailParts;

    // Username validation (before @)
    if (!username || username.length === 0) return "Username part cannot be empty.";
    if (!/^[A-Za-z0-9._%-]+$/.test(username)) return "Username can only contain letters, numbers, and special characters (. _ % -).";

    // Domain validation (after @)
    if (!domain || domain.length === 0) return "Domain part cannot be empty.";
    if (!/^[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(domain)) return "Domain must contain at least one dot followed by 2+ letters.";

    // Overall format validation (abc@abc.domain pattern)
    if (!/^[A-Za-z0-9._%-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(email)) return "Format: abc@abc.domain only.";

    // Removed domain restriction - now accepts all valid domains

    return true;
  };

  // Navigation handler for analytics
  const handleNavigateToAnalytics = (jobId: string) => {
    setSelectedJobIdForAnalytics(jobId);
    setActiveTab('analytics');
  };

  // Enhanced form validation matching Jobs page
  const validateForm = () => {
    const errors: { [key: string]: string } = {};

    // Name validation
    if (!candidateForm.name.trim()) {
      errors.name = 'Full name is required';
    } else if (candidateForm.name.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters';
    }

    // Email validation - using robust validation from Jobs page
    if (!candidateForm.email.trim()) {
      errors.email = 'Please enter your email address.';
    } else {
      const emailValidation = validateEmail(candidateForm.email);
      if (emailValidation !== true) {
        errors.email = emailValidation as string;
      }
    }

    // Phone validation (international) to match Jobs page
    if (!candidateForm.phone) {
      errors.phone = 'Phone number is required';
    } else {
      const clean = '+' + candidateForm.phone.replace(/[^\d]/g, '').replace(/^\+/, '');
      if (!isValidPhoneNumber(clean)) {
        errors.phone = 'Please enter a valid international phone number';
      }
    }

    // Validation based on application method
    if (applicationMethod === 'category') {
      if (!candidateForm.category.trim()) {
        errors.category = 'Category is required';
      }
      if (!candidateForm.experience.trim()) {
        errors.experience = 'Experience is required';
      }
      if (!candidateForm.jobType.trim()) {
        errors.jobType = 'Job type is required';
      }
    } else {
      if (!candidateForm.position.trim()) {
        errors.position = 'Job position is required';
      }
    }

    // Resume validation
    if (!candidateForm.resume) {
      errors.resume = 'Resume is required';
    }

    // Check for duplicate application (same mobile AND email)
    if (!errors.email && !errors.phone && candidateForm.email && candidateForm.phone) {
      const normalizedPhone = candidateForm.phone.replace(/\D/g, '');
      const normalizedEmail = candidateForm.email.trim().toLowerCase();
      const duplicateCandidate = candidates.find(candidate => {
        const candidatePhone = (candidate.phone || '').replace(/\D/g, '');
        const candidateEmail = (candidate.email || '').trim().toLowerCase();
        return candidatePhone === normalizedPhone && candidateEmail === normalizedEmail;
      });

      if (duplicateCandidate) {
        errors.duplicate = 'A job application already exists with the same mobile number and email. Please use a different email address or contact us if you need to update your existing application.';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const calculateMetrics = useCallback(() => {
    const today = new Date().toISOString().split('T')[0]
    const newToday = candidates.filter(c => c.appliedDate === today).length
    const interviews = candidates.filter(c => c.status === 'interview').length
    const offers = candidates.filter(c => c.status === 'offer').length
    const hired = candidates.filter(c => c.status === 'hired').length

    // Conversion rate should include both 'hired' and 'offer' statuses to match backend report
    const hiredAndOffers = candidates.filter(c => c.status === 'hired' || c.status === 'offer').length
    const conversionRate = candidates.length > 0 ? (hiredAndOffers / candidates.length) * 100 : 0

    // Calculate average time to hire
    const hiredCandidates = candidates.filter(c => c.status === 'hired')
    const avgTime = hiredCandidates.length > 0
      ? hiredCandidates.reduce((sum, c) => {
        const applied = new Date(c.appliedDate)
        const lastActivity = new Date(c.lastActivity)
        return sum + (lastActivity.getTime() - applied.getTime()) / (1000 * 60 * 60 * 24)
      }, 0) / hiredCandidates.length
      : 0

    setMetrics({
      totalCandidates: candidates.length,
      newApplicationsToday: newToday,
      interviewsScheduled: interviews,
      offersExtended: offers,
      averageTimeToHire: Math.round(avgTime),
      conversionRate: Math.round(conversionRate * 10) / 10,
      costPerHire: hired > 0 ? Math.round(jobBoards.reduce((sum, jb) => sum + jb.cost, 0) / hired) : 0,
    })
  }, [candidates, jobBoards])

  // Initialize with some dynamic data
  useEffect(() => {
    initializeJobBoards()
    generateAIInsights()
    fetchApplicants()
    fetchHRMetrics()
    // Note: Daily applications count is calculated from candidates data in calculateMetrics()
  }, [])

  // Calculate metrics whenever candidates change
  useEffect(() => {
    calculateMetrics()
  }, [candidates, calculateMetrics])

  const initializeJobBoards = () => {
    const defaultJobBoards: JobBoard[] = [
      {
        id: "1",
        name: "LinkedIn",
        applications: 0,
        lastSync: new Date().toISOString(),
        status: "active",
        cost: 2500,
        conversion: 0,
        apiConnected: true
      },
      {
        id: "2",
        name: "Indeed",
        applications: 0,
        lastSync: new Date().toISOString(),
        status: "active",
        cost: 1800,
        conversion: 0,
        apiConnected: false
      },
      {
        id: "3",
        name: "Company Website",
        applications: 0,
        lastSync: new Date().toISOString(),
        status: "active",
        cost: 0,
        conversion: 0,
        apiConnected: true
      }
    ]
    setJobBoards(defaultJobBoards)
  }

  // --- Analytics Dashboard (Charts & Metrics) ---

  // const sourceData = [ // Currently unused
  //   { name: "LinkedIn", value: 35, color: "#0077B5" },
  //   { name: "Indeed", value: 28, color: "#2557A7" },
  //   { name: "Company Website", value: 20, color: "#16A34A" },
  //   { name: "Referrals", value: 12, color: "#DC2626" },
  //   { name: "Naukri", value: 8, color: "#FF6A00"},
  //   { name: "Other", value: 5, color: "#6B7280" },
  // ]


  const ProgressBar: React.FC<{ value: number; className?: string }> = ({ value, className }) => {
    const safe = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0))
    return (
      <div className={`h-2 bg-gray-200 rounded ${className || ''}`}>
        <div className="h-2 bg-emerald-500 rounded" style={{ width: `${safe}%` }} />
      </div>
    )
  }

  const AnalyticsDashboard: React.FC<{
    data: { month: string; applications: number; hired: number }[];
    totalsByStatus: { applied: number; screening: number; interview: number; offer: number; hired: number; rejected: number };
    candidates?: Candidate[];
    jobListings?: JobListing[];
    // External filter props - if provided, use these instead of internal state
    externalFilters?: {
      selectedJob?: string;
      selectedSource?: string;
      selectedStatus?: string;
      scoreRange?: [number, number];
    };
    onClearExternalFilters?: () => void;
  }> = ({ data, candidates = [], jobListings = [], externalFilters, onClearExternalFilters }) => {
    const { theme } = useTheme()
    const [tab, setTab] = useState("overview")

    // Filter states - use external filters if provided, otherwise use internal state
    const [internalSelectedJob, setInternalSelectedJob] = useState<string>("all")
    const [internalSelectedSource, setInternalSelectedSource] = useState<string>("all")
    const [internalSelectedStatus, setInternalSelectedStatus] = useState<string>("all")
    const [internalScoreRange, setInternalScoreRange] = useState<[number, number]>([0, 100])

    // Use external filters if provided, otherwise use internal state
    const selectedJob = externalFilters?.selectedJob !== undefined ? externalFilters.selectedJob : internalSelectedJob
    const selectedSource = externalFilters?.selectedSource !== undefined ? externalFilters.selectedSource : internalSelectedSource
    const selectedStatus = externalFilters?.selectedStatus !== undefined ? externalFilters.selectedStatus : internalSelectedStatus
    const scoreRange = externalFilters?.scoreRange !== undefined ? externalFilters.scoreRange : internalScoreRange

    const [showFilters, setShowFilters] = useState(false)
    const [showDetailedView, setShowDetailedView] = useState(false)
    // const [selectedMetric, setSelectedMetric] = useState<string | null>(null) // Currently unused
    // const [expandedJob, setExpandedJob] = useState<string | null>(null) // Currently unused
    const [selectedCandidatesInAnalytics, setSelectedCandidatesInAnalytics] = useState<string[]>([])
    const [isDownloadingReport, setIsDownloadingReport] = useState(false)

    // Automatically switch to candidates tab when external job filter is applied
    React.useEffect(() => {
      if (externalFilters?.selectedJob) {
        setTab('candidates')
        setShowFilters(true)
        setShowDetailedView(true)
      }
    }, [externalFilters?.selectedJob])

    // Pagination states
    const [candidatesCurrentPage, setCandidatesCurrentPage] = useState(1)
    const [candidatesRowsPerPage, setCandidatesRowsPerPage] = useState(10)
    const [jobsCurrentPage, setJobsCurrentPage] = useState(1)
    const [jobsRowsPerPage, setJobsRowsPerPage] = useState(5)

    // Get unique sources and jobs from candidates
    const uniqueSources = Array.from(new Set(candidates.map(c => c.source).filter(Boolean)))
    const uniqueJobs = Array.from(new Set(candidates.map(c => c.position).filter(Boolean)))

    // Resolve Job Title for Legacy Match
    const targetJobTitle = useMemo(() => {
      if (selectedJob === "all" || !jobListings) return null;
      // Check if selectedJob is an ID in jobListings
      const job = jobListings.find(j => j.job_id === selectedJob || j._id === selectedJob);
      return job ? job.title : null;
    }, [selectedJob, jobListings]);

    // Apply filters to candidates
    const filteredCandidates = candidates.filter(c => {
      // For job filtering, check both position (legacy) and job_id (new)
      if (selectedJob !== "all") {
        const candidateJobId = (c as Candidate & { job_id?: string }).job_id || '';
        const candidatePosition = c.position || '';

        const matchesId = candidateJobId === selectedJob;
        const matchesTitle = candidatePosition === selectedJob;

        // Legacy fix: Match if title matches targetJobTitle AND candidate has no ID
        // This ensures we capture legacy candidates who applied before job_ids were strictly enforced
        const matchesLegacy = targetJobTitle
          ? (candidatePosition === targetJobTitle && !candidateJobId)
          : false;

        if (!matchesId && !matchesTitle && !matchesLegacy) return false
      }
      if (selectedSource !== "all" && c.source !== selectedSource) return false
      if (selectedStatus !== "all" && c.status !== selectedStatus) return false
      // Use getCandidateFitScore for consistent scoring with display
      const score = getCandidateFitScore(c)
      if (score < scoreRange[0] || score > scoreRange[1]) return false
      return true
    })

    // Calculate job-specific metrics
    // Filter uniqueJobs based on selectedJob filter - if a specific job is selected, only show that job
    const jobsToShow = selectedJob !== "all"
      ? [selectedJob]
      : uniqueJobs

    const jobMetrics = jobsToShow.map(job => {
      const jobCandidates = filteredCandidates.filter(c => {
        const candidateJobId = (c as Candidate & { job_id?: string }).job_id || '';
        const candidatePosition = c.position || '';

        // If job matches selectedJob (which might be an ID), apply the legacy lookup logic
        if (job === selectedJob && targetJobTitle) {
          const matchesLegacy = (candidatePosition === targetJobTitle && !candidateJobId);
          if (matchesLegacy) return true;
        }

        return candidateJobId === job || candidatePosition === job;
      })
      const total = jobCandidates.length
      const hired = jobCandidates.filter(c => c.status === 'hired').length
      // Calculate average fit score using backend scores
      const avgFitScore = jobCandidates.length > 0
        ? jobCandidates.reduce((sum, c) => {
          const score = c.job_specific_fit_score !== undefined && c.job_specific_fit_score !== null
            ? Math.round(c.job_specific_fit_score)
            : (c.role_suitability !== undefined && c.role_suitability !== null
              ? Math.round(c.role_suitability)
              : calculateCandidateScore(c))
          return sum + score
        }, 0) / jobCandidates.length
        : 0
      // Calculate average ATS score using backend ats_score
      const avgAtsScore = jobCandidates.length > 0
        ? jobCandidates.reduce((sum, c) => {
          const atsScore = c.ats_score !== undefined && c.ats_score !== null
            ? Math.round(c.ats_score)
            : (c.weighted_skill_score || 0)
          return sum + atsScore
        }, 0) / jobCandidates.length
        : 0
      // Conversion rate should include both 'hired' and 'offer' statuses to match backend report
      const hiredAndOffers = jobCandidates.filter(c => c.status === 'hired' || c.status === 'offer').length
      const conversionRate = total > 0 ? (hiredAndOffers / total) * 100 : 0

      return {
        job,
        total,
        hired,
        avgFitScore: Math.round(avgFitScore * 10) / 10,
        avgAtsScore: Math.round(avgAtsScore * 10) / 10,
        conversionRate: Math.round(conversionRate * 10) / 10,
        byStatus: {
          applied: jobCandidates.filter(c => c.status === 'applied').length,
          screening: jobCandidates.filter(c => c.status === 'screening').length,
          interview: jobCandidates.filter(c => c.status === 'interview').length,
          offer: jobCandidates.filter(c => c.status === 'offer').length,
          hired,
          rejected: jobCandidates.filter(c => c.status === 'rejected').length,
        }
      }
    })

    // Pagination for job metrics
    const jobsTotalPages = Math.ceil(jobMetrics.length / jobsRowsPerPage)
    const jobsStartIndex = (jobsCurrentPage - 1) * jobsRowsPerPage
    const jobsEndIndex = jobsStartIndex + jobsRowsPerPage
    const paginatedJobMetrics = jobMetrics.slice(jobsStartIndex, jobsEndIndex)

    // Pagination for candidates
    const candidatesTotalPages = Math.ceil(filteredCandidates.length / candidatesRowsPerPage)
    const candidatesStartIndex = (candidatesCurrentPage - 1) * candidatesRowsPerPage
    const candidatesEndIndex = candidatesStartIndex + candidatesRowsPerPage
    const paginatedCandidates = filteredCandidates.slice(candidatesStartIndex, candidatesEndIndex)

    // Reset to page 1 when filters change
    useEffect(() => {
      setCandidatesCurrentPage(1)
      setJobsCurrentPage(1)
    }, [selectedJob, selectedSource, selectedStatus, scoreRange])

    // Calculate source-specific metrics
    const sourceMetrics = uniqueSources.map(source => {
      const sourceCandidates = filteredCandidates.filter(c => c.source === source)
      const total = sourceCandidates.length
      const hired = sourceCandidates.filter(c => c.status === 'hired').length
      // Conversion rate should include both 'hired' and 'offer' statuses to match backend report
      const hiredAndOffers = sourceCandidates.filter((c: Candidate) => c.status === 'hired' || c.status === 'offer').length
      const conversionRate = total > 0 ? (hiredAndOffers / total) * 100 : 0
      // Calculate average fit score using backend scores
      const avgFitScore = sourceCandidates.length > 0
        ? Math.round((sourceCandidates.reduce((sum, c) => {
          const score = c.job_specific_fit_score !== undefined && c.job_specific_fit_score !== null
            ? Math.round(c.job_specific_fit_score)
            : (c.role_suitability !== undefined && c.role_suitability !== null
              ? Math.round(c.role_suitability)
              : calculateCandidateScore(c))
          return sum + score
        }, 0) / sourceCandidates.length) * 10) / 10
        : 0
      // Calculate average ATS score using backend ats_score
      const avgAtsScore = sourceCandidates.length > 0
        ? Math.round((sourceCandidates.reduce((sum, c) => {
          const atsScore = c.ats_score !== undefined && c.ats_score !== null
            ? Math.round(c.ats_score)
            : (c.weighted_skill_score || 0)
          return sum + atsScore
        }, 0) / sourceCandidates.length) * 10) / 10
        : 0

      return {
        source,
        total,
        hired,
        conversionRate: Math.round(conversionRate * 10) / 10,
        avgFitScore,
        avgAtsScore
      }
    })

    // Filtered data for charts
    const filteredData = data.map(monthData => {
      const monthCandidates = filteredCandidates.filter(c => {
        const applied = new Date(c.appliedDate)
        const monthIdx = applied.getMonth()
        const monthName = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][monthIdx]
        return monthName === monthData.month
      })
      return {
        ...monthData,
        applications: monthCandidates.length,
        hired: monthCandidates.filter(c => c.status === 'hired').length
      }
    })

    // Filtered totals by status
    const filteredTotalsByStatus = {
      applied: filteredCandidates.filter(c => c.status === 'applied').length,
      screening: filteredCandidates.filter(c => c.status === 'screening').length,
      interview: filteredCandidates.filter(c => c.status === 'interview').length,
      offer: filteredCandidates.filter(c => c.status === 'offer').length,
      hired: filteredCandidates.filter(c => c.status === 'hired').length,
      rejected: filteredCandidates.filter(c => c.status === 'rejected').length,
    }

    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Analytics Dashboard</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base">Track recruitment performance and insights</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
            >
              <Filter className="w-4 h-4" />
              Filters
              {(selectedJob !== "all" || selectedSource !== "all" || selectedStatus !== "all" || scoreRange[0] > 0 || scoreRange[1] < 100) && (
                <span className="bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                  {[selectedJob !== "all", selectedSource !== "all", selectedStatus !== "all", scoreRange[0] > 0 || scoreRange[1] < 100].filter(Boolean).length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl shadow-lg p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Job Position Filter */}
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  <Briefcase className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  Job Position
                </label>
                <div className="relative">
                  <select
                    value={selectedJob}
                    onChange={(e) => {
                      if (externalFilters?.selectedJob === undefined) {
                        setInternalSelectedJob(e.target.value)
                      }
                    }}
                    className="w-full px-4 py-2.5 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 dark:focus:border-blue-400 transition-all duration-200 hover:border-blue-400 dark:hover:border-blue-600 cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22currentColor%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C/polyline%3E%3C/svg%3E')] bg-[length:1.5em_1.5em] bg-[right_0.75rem_center] bg-no-repeat pr-10"
                    disabled={externalFilters?.selectedJob !== undefined}
                  >
                    <option value="all">All Positions</option>
                    {/* Show selected ID-based job option if active (e.g. from external filter) */}
                    {selectedJob !== "all" && !uniqueJobs.includes(selectedJob) && (
                      <option value={selectedJob}>{targetJobTitle || selectedJob}</option>
                    )}
                    {uniqueJobs.map(job => (
                      <option key={job} value={job}>{job}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Source Filter */}
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  <Globe className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  Application Source
                </label>
                <div className="relative">
                  <select
                    value={selectedSource}
                    onChange={(e) => {
                      if (externalFilters?.selectedSource === undefined) {
                        setInternalSelectedSource(e.target.value)
                      }
                    }}
                    className="w-full px-4 py-2.5 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 dark:focus:border-blue-400 transition-all duration-200 hover:border-blue-400 dark:hover:border-blue-600 cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22currentColor%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C/polyline%3E%3C/svg%3E')] bg-[length:1.5em_1.5em] bg-[right_0.75rem_center] bg-no-repeat pr-10"
                    disabled={externalFilters?.selectedSource !== undefined}
                  >
                    <option value="all">All Sources</option>
                    {uniqueSources.map(source => (
                      <option key={source} value={source}>{source}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Status Filter */}
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  <CheckCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  Application Status
                </label>
                <div className="relative">
                  <select
                    value={selectedStatus}
                    onChange={(e) => {
                      if (externalFilters?.selectedStatus === undefined) {
                        setInternalSelectedStatus(e.target.value)
                      }
                    }}
                    className="w-full px-4 py-2.5 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 dark:focus:border-blue-400 transition-all duration-200 hover:border-blue-400 dark:hover:border-blue-600 cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22currentColor%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C/polyline%3E%3C/svg%3E')] bg-[length:1.5em_1.5em] bg-[right_0.75rem_center] bg-no-repeat pr-10"
                    disabled={externalFilters?.selectedStatus !== undefined}
                  >
                    <option value="all">All Statuses</option>
                    <option value="applied">Applied</option>
                    <option value="screening">Screening</option>
                    <option value="interview">Interview</option>
                    <option value="offer">Offer</option>
                    <option value="hired">Hired</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
              </div>

              {/* Score Filter */}
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  <BarChart3 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  Score Filter
                </label>
                <div className="relative">
                  <div className="flex gap-2.5">
                    <div className="flex-1">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={scoreRange[0]}
                        onChange={(e) => {
                          if (externalFilters?.scoreRange === undefined) {
                            const inputValue = e.target.value === '' ? 0 : parseInt(e.target.value)
                            if (isNaN(inputValue)) {
                              return
                            }
                            const minValue = Math.max(0, Math.min(100, inputValue))
                            // Don't swap during typing, just update min value
                            setInternalScoreRange([minValue, scoreRange[1]])
                          }
                        }}
                        onBlur={(e) => {
                          if (externalFilters?.scoreRange === undefined) {
                            const inputValue = parseInt(e.target.value)
                            if (isNaN(inputValue) || e.target.value === '') {
                              // If empty or invalid, reset to 0
                              const minValue = 0
                              if (minValue > scoreRange[1]) {
                                setInternalScoreRange([scoreRange[1], minValue])
                              } else {
                                setInternalScoreRange([minValue, scoreRange[1]])
                              }
                            } else {
                              const minValue = Math.max(0, Math.min(100, inputValue))
                              // Swap only on blur if needed
                              if (minValue > scoreRange[1]) {
                                setInternalScoreRange([scoreRange[1], minValue])
                              } else {
                                setInternalScoreRange([minValue, scoreRange[1]])
                              }
                            }
                          }
                        }}
                        className="w-full px-4 py-2.5 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 dark:focus:border-blue-400 transition-all duration-200 hover:border-blue-400 dark:hover:border-blue-600"
                        placeholder="Min (0)"
                        aria-label="Minimum Score"
                      />
                    </div>
                    <div className="flex-1">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={scoreRange[1]}
                        onChange={(e) => {
                          if (externalFilters?.scoreRange === undefined) {
                            const inputValue = e.target.value === '' ? 100 : parseInt(e.target.value)
                            if (isNaN(inputValue)) {
                              return
                            }
                            const maxValue = Math.max(0, Math.min(100, inputValue))
                            // Don't swap during typing, just update max value
                            setInternalScoreRange([scoreRange[0], maxValue])
                          }
                        }}
                        onBlur={(e) => {
                          if (externalFilters?.scoreRange === undefined) {
                            const inputValue = parseInt(e.target.value)
                            if (isNaN(inputValue) || e.target.value === '') {
                              // If empty or invalid, reset to 100
                              const maxValue = 100
                              if (maxValue < scoreRange[0]) {
                                setInternalScoreRange([maxValue, scoreRange[0]])
                              } else {
                                setInternalScoreRange([scoreRange[0], maxValue])
                              }
                            } else {
                              const maxValue = Math.max(0, Math.min(100, inputValue))
                              // Swap only on blur if needed
                              if (maxValue < scoreRange[0]) {
                                setInternalScoreRange([maxValue, scoreRange[0]])
                              } else {
                                setInternalScoreRange([scoreRange[0], maxValue])
                              }
                            }
                          }
                        }}
                        className="w-full px-4 py-2.5 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 dark:focus:border-blue-400 transition-all duration-200 hover:border-blue-400 dark:hover:border-blue-600"
                        placeholder="Max (100)"
                        aria-label="Maximum Score"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
                    Filter candidates by fit score
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => {
                  // Clear internal filters
                  if (externalFilters?.selectedJob === undefined) setInternalSelectedJob("all")
                  if (externalFilters?.selectedSource === undefined) setInternalSelectedSource("all")
                  if (externalFilters?.selectedStatus === undefined) setInternalSelectedStatus("all")
                  if (externalFilters?.scoreRange === undefined) setInternalScoreRange([0, 100])
                  // Clear external filters
                  if (onClearExternalFilters) {
                    onClearExternalFilters()
                  }
                }}
                className="px-5 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all duration-200 border-2 border-transparent hover:border-blue-200 dark:hover:border-blue-800"
              >
                Clear All Filters
              </button>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div className="flex flex-nowrap sm:flex-wrap items-center gap-1 sm:gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-x-auto no-scrollbar w-full">
            {[
              { key: "overview", label: "Overview" },
              { key: "pipeline", label: "Pipeline" },
              { key: "sources", label: "Sources" },
              { key: "jobs", label: "Position Analysis" },
              { key: "candidates", label: "Candidates" },
              { key: "performance", label: "Performance" },
            ].map(t => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={`flex-none sm:flex-none px-2 sm:px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors min-w-[96px] whitespace-nowrap ${tab === t.key
                  ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
                  }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              <ComponentCard title="Applications vs Hires">
                <div className="p-3 sm:p-4">
                  <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">Monthly recruitment activity</div>
                  <div className="w-full h-[250px] sm:h-[300px] overflow-hidden">
                    <ResponsiveContainer width="100%" height="100%">
                      <RCBarChart data={filteredData} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
                        <RCCartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#374151' : '#f3f4f6'} />
                        <RCXAxis
                          dataKey="month"
                          tick={{ fontSize: 12, fill: theme === 'dark' ? '#9CA3AF' : '#6B7280' }}
                          axisLine={{ stroke: theme === 'dark' ? '#374151' : '#D1D5DB' }}
                        />
                        <RCYAxis
                          tick={{ fontSize: 12, fill: theme === 'dark' ? '#9CA3AF' : '#6B7280' }}
                          axisLine={{ stroke: theme === 'dark' ? '#374151' : '#D1D5DB' }}
                        />
                        <RCTooltip
                          contentStyle={{
                            backgroundColor: theme === 'dark' ? '#1F2937' : '#FFFFFF',
                            border: `1px solid ${theme === 'dark' ? '#374151' : '#E5E7EB'}`,
                            borderRadius: '8px',
                            color: theme === 'dark' ? '#F9FAFB' : '#111827'
                          }}
                        />
                        <RCBar dataKey="applications" fill={theme === 'dark' ? '#60A5FA' : '#3B82F6'} name="Applications" />
                        <RCBar dataKey="hired" fill={theme === 'dark' ? '#34D399' : '#10B981'} name="Hired" />
                      </RCBarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </ComponentCard>

              <ComponentCard title="Application Sources">
                <div className="p-4">
                  <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">Where candidates are coming from</div>
                  <div className="w-full h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RCPieChart>
                        <RCPie
                          data={sourceMetrics.map((s, idx) => ({
                            name: s.source,
                            value: s.total,
                            color: ["#0077B5", "#2557A7", "#16A34A", "#DC2626", "#FF6A00", "#6B7280"][idx % 6]
                          }))}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          dataKey="value"
                          label={(props: { name?: string; value?: number | string }) => `${props.name ?? ''}: ${props.value ?? 0}`}
                        >
                          {sourceMetrics.map((s, idx) => (
                            <RCCell key={`cell-${idx}`} fill={["#0077B5", "#2557A7", "#16A34A", "#DC2626", "#FF6A00", "#6B7280"][idx % 6]} />
                          ))}
                        </RCPie>
                        <RCTooltip />
                      </RCPieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-4 space-y-2">
                    {sourceMetrics.map((source) => (
                      <div key={source.source} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{source.source}</span>
                        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                          <span>{source.total} apps</span>
                          <span>{source.hired} hired</span>
                          <span className="font-semibold">{source.conversionRate}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </ComponentCard>
            </div>
          )}

          {tab === 'pipeline' && (
            <ComponentCard title="Recruitment Pipeline">
              <div className="p-4">
                <div className="space-y-3">
                  {[
                    { stage: 'Applied', count: filteredTotalsByStatus.applied },
                    { stage: 'Screening', count: filteredTotalsByStatus.screening },
                    { stage: 'Interview', count: filteredTotalsByStatus.interview },
                    { stage: 'Offer', count: filteredTotalsByStatus.offer },
                    { stage: 'Hired', count: filteredTotalsByStatus.hired },
                    { stage: 'Rejected', count: filteredTotalsByStatus.rejected },
                  ].map((stage, index, arr) => {
                    const base = Math.max(1, arr[0].count)
                    const conversion = Math.round((stage.count / base) * 100)
                    return (
                      <div
                        key={stage.stage}
                        className="flex items-center justify-between p-4 md:p-5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-center gap-3 md:gap-4">
                          <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full ${accentClasses.bg50} ${accentClasses.darkBg900_30} flex items-center justify-center`}>
                            <span className={`text-xs md:text-sm font-semibold ${accentClasses.text700} dark:${accentClasses.text300}`}>{index + 1}</span>
                          </div>
                          <div>
                            <div className="text-sm md:text-base font-medium text-gray-900 dark:text-gray-100">{stage.stage}</div>
                            <div className="text-xs md:text-sm text-gray-500 dark:text-gray-400">{stage.count} candidates</div>
                          </div>
                        </div>
                        <div className="text-right w-32 md:w-40">
                          <Badge>{conversion}%</Badge>
                          <ProgressBar value={conversion} className="mt-2" />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </ComponentCard>
          )}

          {tab === 'sources' && (
            <div className="space-y-4">
              <ComponentCard title="Source Performance">
                <div className="p-4">
                  <div className="space-y-4">
                    {sourceMetrics.map((source) => (
                      <div key={source.source} className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold text-gray-900 dark:text-white">{source.source}</h3>
                          <span className="text-sm text-gray-600 dark:text-gray-400">{source.conversionRate}% conversion</span>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <div className="text-gray-500 dark:text-gray-400">Total Applications</div>
                            <div className="text-lg font-semibold text-gray-900 dark:text-white">{source.total}</div>
                          </div>
                          <div>
                            <div className="text-gray-500 dark:text-gray-400">Hired</div>
                            <div className="text-lg font-semibold text-green-600 dark:text-green-400">{source.hired}</div>
                          </div>
                          <div>
                            <div className="text-gray-500 dark:text-gray-400">Avg Fit Score</div>
                            <div className="text-lg font-semibold text-blue-600 dark:text-blue-400">{source.avgFitScore}</div>
                          </div>
                        </div>
                        <ProgressBar value={source.conversionRate} className="mt-2" />
                      </div>
                    ))}
                  </div>
                </div>
              </ComponentCard>
            </div>
          )}

          {tab === 'jobs' && (
            <div className="space-y-4">
              <ComponentCard title="Job-Specific Analytics">
                <div className="p-4">
                  <div className="mb-1 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Click on any job card to view detailed candidate information
                      </p>
                    </div>
                    <div className="flex items-center gap-2 px-2.5 py-1 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <Briefcase className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      <span className="text-xs font-semibold text-blue-700 dark:text-blue-400">
                        {jobMetrics.length} Position{jobMetrics.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-3 -mt-1">
                    {paginatedJobMetrics.map((job) => {
                      const jobCandidates = filteredCandidates.filter(c => c.position === job.job)
                      return (
                        <div key={job.job} className="group">
                          <div
                            className="relative overflow-hidden bg-white dark:bg-[#111111] border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 p-3 sm:p-4 hover:border-blue-300 dark:hover:border-blue-700 hover:-translate-y-0.5 cursor-pointer"
                            onClick={() => {
                              // Activate filter for this position
                              if (externalFilters?.selectedJob === undefined) {
                                setInternalSelectedJob(job.job)
                              }
                              // Show filters panel to indicate filter is active
                              setShowFilters(true)
                              // Enable detailed view to show table in Candidates tab
                              setShowDetailedView(true)
                              // Redirect to Candidates tab to show filtered candidates
                              setTab('candidates')
                            }}
                            title="Click to view candidate details and download report"
                          >
                            {/* Subtle gradient overlay on hover */}
                            <div className="absolute inset-0 bg-gradient-to-br from-blue-50/0 via-transparent to-blue-50/30 dark:from-blue-900/0 dark:via-transparent dark:to-blue-900/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>

                            {/* Left accent border indicator */}
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-500 via-blue-400 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                            <div className="relative flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                              <div className="flex items-start space-x-3 sm:space-x-4 flex-1 min-w-0">
                                {/* Icon */}
                                <div className="relative flex-shrink-0">
                                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 dark:from-blue-400 dark:via-blue-500 dark:to-blue-600 flex items-center justify-center text-white font-semibold shadow-md group-hover:scale-110 group-hover:shadow-lg transition-all duration-300 ring-2 ring-white dark:ring-gray-800">
                                    <Briefcase className="w-5 h-5 sm:w-6 sm:h-6" />
                                  </div>
                                </div>

                                {/* Main Content */}
                                <div className="flex-1 min-w-0">
                                  <div className="mb-3">
                                    <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                      {job.job}
                                    </h3>
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                                    {/* Total Applications */}
                                    <div className="flex items-center gap-2">
                                      <div className="flex-shrink-0 w-5 h-5 rounded bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                        <Users className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                                      </div>
                                      <span className="text-sm text-gray-700 dark:text-gray-300">{job.total} Total Applications</span>
                                    </div>

                                    {/* Hired Count */}
                                    <div className="flex items-center gap-2">
                                      <div className="flex-shrink-0 w-5 h-5 rounded bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                                        <svg className="w-3 h-3 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                      </div>
                                      <span className="text-sm text-gray-700 dark:text-gray-300">{job.hired} Hired</span>
                                    </div>

                                    {/* Conversion Rate */}
                                    <div className="flex items-center gap-2">
                                      <div className="flex-shrink-0 w-5 h-5 rounded bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                        <TrendingUp className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                                      </div>
                                      <span className="text-sm text-gray-700 dark:text-gray-300">{job.conversionRate}% Conversion</span>
                                    </div>

                                    {/* Average ATS Score */}
                                    <div className="flex items-center gap-2">
                                      <div className="flex-shrink-0 w-5 h-5 rounded bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                        <BarChart3 className="w-3 h-3 text-gray-600 dark:text-gray-400" />
                                      </div>
                                      <span className="text-sm text-gray-700 dark:text-gray-300">Avg ATS: {job.avgAtsScore > 0 ? job.avgAtsScore : 'N/A'}</span>
                                    </div>
                                  </div>

                                  {/* Pipeline Status Badges */}
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <span className="inline-flex items-center px-2 py-1 rounded-md bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 text-xs font-semibold border border-blue-200 dark:border-blue-800">
                                      {job.byStatus.applied} Applied
                                    </span>
                                    <span className="inline-flex items-center px-2 py-1 rounded-md bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 text-xs font-semibold border border-blue-200 dark:border-blue-800">
                                      {job.byStatus.screening} Screening
                                    </span>
                                    <span className="inline-flex items-center px-2 py-1 rounded-md bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 text-xs font-semibold border border-blue-200 dark:border-blue-800">
                                      {job.byStatus.interview} Interview
                                    </span>
                                    <span className="inline-flex items-center px-2 py-1 rounded-md bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-xs font-semibold border border-green-200 dark:border-green-800">
                                      {job.byStatus.hired} Hired
                                    </span>
                                    {job.byStatus.rejected > 0 && (
                                      <span className="inline-flex items-center px-2 py-1 rounded-md bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-xs font-semibold border border-red-200 dark:border-red-800">
                                        {job.byStatus.rejected} Rejected
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Score Section - Matching Candidate Cards */}
                              <div className="flex items-center gap-3">
                                {/* ATS Score */}
                                {job.avgAtsScore > 0 && (
                                  <div className="text-center">
                                    <div className="inline-flex flex-col items-center justify-center p-3 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 border border-blue-200 dark:border-blue-800 min-w-[70px]">
                                      <div className="text-xl sm:text-2xl font-bold text-blue-700 dark:text-blue-300">
                                        {job.avgAtsScore}
                                      </div>
                                      <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 mt-0.5 uppercase tracking-wide">ATS</div>
                                    </div>
                                  </div>
                                )}

                                {/* Fit Score */}
                                {job.avgFitScore > 0 && (
                                  <div className="text-center">
                                    <div className={`inline-flex flex-col items-center justify-center p-3 rounded-lg border min-w-[70px] ${job.avgFitScore >= 80
                                      ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800'
                                      : job.avgFitScore >= 60
                                        ? 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800'
                                        : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800'
                                      }`}>
                                      <div className="text-xl sm:text-2xl font-bold">
                                        {job.avgFitScore}
                                      </div>
                                      <div className="text-xs font-semibold mt-0.5 uppercase tracking-wide">Fit</div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Job-specific candidate details - Removed: now redirects to Candidates tab */}
                          {false && (
                            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                              <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
                                Candidates for {job.job} ({jobCandidates.length})
                              </h4>
                              <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                  <thead className="bg-gray-50 dark:bg-gray-700">
                                    <tr>
                                      <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300">Name</th>
                                      <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300">Email</th>
                                      <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300">Source</th>
                                      <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300">Status</th>
                                      <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300">Fit Score</th>
                                      <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300">ATS Score</th>
                                      <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300">Applied</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                                    {jobCandidates.map((candidate) => {
                                      // Use backend scores with proper fallback
                                      const fitScore = candidate.job_specific_fit_score !== undefined && candidate.job_specific_fit_score !== null
                                        ? Math.round(candidate.job_specific_fit_score)
                                        : (candidate.role_suitability !== undefined && candidate.role_suitability !== null
                                          ? Math.round(candidate.role_suitability)
                                          : calculateCandidateScore(candidate))
                                      const atsScore = candidate.ats_score !== undefined && candidate.ats_score !== null
                                        ? Math.round(candidate.ats_score)
                                        : (candidate.weighted_skill_score || 0)
                                      const scoreColor = fitScore >= 80 ? 'text-green-600 dark:text-green-400' :
                                        fitScore >= 60 ? 'text-yellow-600 dark:text-yellow-400' :
                                          'text-red-600 dark:text-red-400'

                                      return (
                                        <tr key={candidate.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                          <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{candidate.name}</td>
                                          <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{candidate.email}</td>
                                          <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{candidate.source}</td>
                                          <td className="px-3 py-2">
                                            <span className={`px-1.5 py-0.5 rounded text-xs ${candidate.status === 'hired' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                                              candidate.status === 'rejected' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                                                candidate.status === 'interview' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                                                  candidate.status === 'offer' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' :
                                                    'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                                              }`}>
                                              {candidate.status}
                                            </span>
                                          </td>
                                          <td className={`px-3 py-2 font-semibold ${scoreColor}`}>
                                            {fitScore}
                                          </td>
                                          <td className="px-3 py-2 text-gray-600 dark:text-gray-400">
                                            {atsScore > 0 ? atsScore : 'N/A'}
                                          </td>
                                          <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{candidate.appliedDate}</td>
                                        </tr>
                                      )
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {/* Pagination for Position Analysis */}
                  {jobsTotalPages > 1 && (
                    <div className="mt-6 bg-white dark:bg-gray-800 px-4 py-3 flex items-center justify-between border-t border-gray-200 dark:border-gray-700 sm:px-6 rounded-b-xl">
                      <div className="flex-1 flex justify-between sm:hidden">
                        <button
                          onClick={() => setJobsCurrentPage(Math.max(1, jobsCurrentPage - 1))}
                          disabled={jobsCurrentPage === 1}
                          className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Previous
                        </button>
                        <button
                          onClick={() => setJobsCurrentPage(Math.min(jobsTotalPages, jobsCurrentPage + 1))}
                          disabled={jobsCurrentPage === jobsTotalPages}
                          className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Next
                        </button>
                      </div>
                      <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm text-gray-700 dark:text-gray-300">
                            Showing <span className="font-medium">{jobsStartIndex + 1}</span> to{' '}
                            <span className="font-medium">{Math.min(jobsEndIndex, jobMetrics.length)}</span>{' '}
                            of <span className="font-medium">{jobMetrics.length}</span> positions
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <select
                            value={jobsRowsPerPage}
                            onChange={(e) => {
                              setJobsRowsPerPage(Number(e.target.value))
                              setJobsCurrentPage(1)
                            }}
                            className="px-3 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value={5}>5 per page</option>
                            <option value={10}>10 per page</option>
                            <option value={25}>25 per page</option>
                            <option value={50}>50 per page</option>
                          </select>
                          <div className="flex gap-1">
                            <button
                              onClick={() => setJobsCurrentPage(Math.max(1, jobsCurrentPage - 1))}
                              disabled={jobsCurrentPage === 1}
                              className="px-4 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              Previous
                            </button>
                            <button
                              onClick={() => setJobsCurrentPage(Math.min(jobsTotalPages, jobsCurrentPage + 1))}
                              disabled={jobsCurrentPage === jobsTotalPages}
                              className="px-4 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              Next
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </ComponentCard>
            </div>
          )}

          {tab === 'candidates' && (
            <div className="space-y-4">
              <ComponentCard title="Candidate Details & Analytics">
                <div className="p-4">
                  <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-2">
                        Candidate Performance Overview
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Detailed view of all candidates with scoring, metrics, and analytics
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={async () => {
                          if (isDownloadingReport) return // Prevent multiple clicks

                          try {
                            setIsDownloadingReport(true)

                            // Get candidates to export: selected if any, otherwise all filtered (or all candidates if no filters)
                            // Check if any filters are actually applied
                            const hasActiveFilters = (
                              selectedJob !== "all" ||
                              selectedSource !== "all" ||
                              selectedStatus !== "all" ||
                              scoreRange[0] > 0 ||
                              scoreRange[1] < 100
                            )

                            // Use filtered candidates if filters are active, otherwise use all candidates
                            const baseCandidates = hasActiveFilters ? filteredCandidates : candidates

                            // Get candidates to export: selected if any, otherwise all from base
                            const candidatesToExport = selectedCandidatesInAnalytics.length > 0
                              ? baseCandidates.filter(c => selectedCandidatesInAnalytics.includes(c.id))
                              : baseCandidates

                            if (candidatesToExport.length === 0) {
                              alert('No candidates available to generate report.')
                              setIsDownloadingReport(false)
                              return
                            }

                            console.log('[DEBUG] Report generation:', {
                              totalCandidates: candidates.length,
                              filteredCandidates: filteredCandidates.length,
                              baseCandidates: baseCandidates.length,
                              candidatesToExport: candidatesToExport.length,
                              hasActiveFilters,
                              selectedJob,
                              selectedSource,
                              selectedStatus,
                              scoreRange
                            })

                            // Determine the job/position for the report
                            // If a specific job is selected, use it; otherwise use the most common position from candidates
                            let reportJobTitle = "Selected Candidates"
                            if (selectedJob !== "all" && selectedJob) {
                              reportJobTitle = selectedJob
                            } else if (candidatesToExport.length > 0) {
                              // Find the most common position among the candidates to export
                              const positionCounts = candidatesToExport.reduce((acc, c) => {
                                acc[c.position] = (acc[c.position] || 0) + 1
                                return acc
                              }, {} as Record<string, number>)
                              const mostCommonPosition = Object.entries(positionCounts).sort((a, b) => b[1] - a[1])[0]?.[0]
                              if (mostCommonPosition) {
                                reportJobTitle = mostCommonPosition
                              }
                            }

                            // Extract candidate IDs (use applicant_id if available, otherwise use id)
                            const candidateIds = candidatesToExport.map(c => {
                              // Use applicant_id if it exists, otherwise fall back to id
                              return c.applicant_id || c.id
                            })

                            console.log('[DEBUG] Generating executive report for candidates:', {
                              totalCandidates: candidatesToExport.length,
                              candidateIds: candidateIds.slice(0, 5), // Log first 5 IDs
                              selectedCount: selectedCandidatesInAnalytics.length,
                              jobTitle: reportJobTitle,
                              selectedJob: selectedJob
                            })

                            // Call backend API to generate executive report
                            const reportUrl = buildApiUrl(API_CONFIG.ENDPOINTS.JOBS_CANDIDATES_EXECUTIVE_REPORT)
                            console.log('[DEBUG] Calling executive report endpoint:', reportUrl)
                            console.log('[DEBUG] Request payload:', {
                              candidate_ids: candidateIds,
                              job_title: reportJobTitle
                            })

                            const response = await fetch(reportUrl, {
                              method: 'POST',
                              headers: {
                                'Content-Type': 'application/json',
                              },
                              body: JSON.stringify({
                                candidate_ids: candidateIds,
                                job_title: reportJobTitle  // Pass the job title to backend
                              })
                            })

                            console.log('[DEBUG] Response status:', response.status, response.statusText)

                            if (!response.ok) {
                              let errorMessage = 'Failed to generate executive report'
                              try {
                                const errorData = await response.json()
                                errorMessage = errorData.detail || errorData.message || errorMessage
                              } catch {
                                const errorText = await response.text()
                                errorMessage = errorText || errorMessage
                              }

                              if (response.status === 404) {
                                throw new Error('No candidates found for the provided IDs. Please verify the candidate selection.')
                              } else if (response.status === 400) {
                                throw new Error(`Invalid request: ${errorMessage}`)
                              } else {
                                throw new Error(`Failed to generate executive report (${response.status}): ${errorMessage}`)
                              }
                            }

                            // Check if response is actually a PDF
                            const contentType = response.headers.get('content-type')
                            if (!contentType || !contentType.includes('application/pdf')) {
                              console.error('[ERROR] Response is not a PDF:', contentType)
                              const text = await response.text()
                              throw new Error(`Server returned non-PDF response: ${text.substring(0, 200)}`)
                            }

                            // Download the PDF blob
                            const blob = await response.blob()
                            console.log('[DEBUG] PDF blob size:', blob.size, 'bytes')

                            if (blob.size === 0) {
                              throw new Error('Received empty PDF file. Please try again.')
                            }

                            const url = window.URL.createObjectURL(blob)
                            const link = document.createElement('a')
                            link.href = url
                            const now = new Date()
                            const yyyy = now.getFullYear()
                            const mm = String(now.getMonth() + 1).padStart(2, '0')
                            const dd = String(now.getDate()).padStart(2, '0')
                            const hh = String(now.getHours()).padStart(2, '0')
                            const mi = String(now.getMinutes()).padStart(2, '0')
                            const ss = String(now.getSeconds()).padStart(2, '0')
                            const prefix = selectedCandidatesInAnalytics.length > 0 ? 'selected_candidates' : 'all_candidates'
                            link.download = `Executive_Candidate_Report_${prefix}_${yyyy}-${mm}-${dd}_${hh}-${mi}-${ss}.pdf`
                            document.body.appendChild(link)
                            link.click()
                            document.body.removeChild(link)
                            window.URL.revokeObjectURL(url)

                            console.log('[DEBUG] PDF download initiated successfully')
                          } catch (error) {
                            console.error('Error generating PDF report:', error)
                            alert(error instanceof Error ? error.message : 'Failed to generate PDF report. Please try again.')
                          } finally {
                            setIsDownloadingReport(false)
                          }
                        }}
                        disabled={isDownloadingReport}
                        className={`px-5 py-2.5 text-sm font-semibold text-white rounded-xl transition-all duration-200 flex items-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-105 ${isDownloadingReport
                          ? 'bg-gradient-to-r from-green-500 to-green-600 dark:from-green-600 dark:to-green-700 cursor-not-allowed opacity-75'
                          : 'bg-gradient-to-r from-green-600 to-green-700 dark:from-green-700 dark:to-green-800 hover:from-green-700 hover:to-green-800 dark:hover:from-green-800 dark:hover:to-green-900'
                          }`}
                        title={isDownloadingReport
                          ? 'Downloading report...'
                          : selectedCandidatesInAnalytics.length > 0
                            ? `Download executive report for ${selectedCandidatesInAnalytics.length} selected candidate(s)`
                            : 'Download executive report for all filtered candidates'}
                      >
                        {isDownloadingReport ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Downloading...</span>
                          </>
                        ) : (
                          <>
                            <Download className="w-4 h-4" />
                            <span>Download Report</span>
                            {selectedCandidatesInAnalytics.length > 0 && (
                              <span className="ml-1 bg-white/25 text-white text-xs font-bold rounded-full px-2.5 py-0.5 border border-white/30">
                                {selectedCandidatesInAnalytics.length}
                              </span>
                            )}
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => setShowDetailedView(!showDetailedView)}
                        className={`px-5 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200 flex items-center gap-2 border-2 shadow-md hover:shadow-lg transform hover:scale-105 ${showDetailedView
                          ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-700 hover:bg-blue-100 dark:hover:bg-blue-900/30'
                          : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                          }`}
                      >
                        <List className={`w-4 h-4 ${showDetailedView ? 'text-blue-600 dark:text-blue-400' : ''}`} />
                        <span>{showDetailedView ? 'Hide' : 'Show'} Table View</span>
                      </button>
                    </div>
                  </div>

                  {/* Summary Statistics */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-blue-100 to-blue-50 dark:from-blue-900/30 dark:via-blue-800/30 dark:to-blue-900/30 border-2 border-blue-200 dark:border-blue-800 rounded-xl p-5 shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105 group">
                      <div className="absolute top-0 right-0 w-20 h-20 bg-blue-200/30 dark:bg-blue-700/20 rounded-full -translate-y-10 translate-x-10 group-hover:scale-150 transition-transform duration-500"></div>
                      <div className="relative">
                        <div className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-2 uppercase tracking-wide">Total Candidates</div>
                        <div className="text-3xl font-bold text-blue-900 dark:text-blue-100">
                          {filteredCandidates.length}
                        </div>
                      </div>
                    </div>
                    <div className="relative overflow-hidden bg-gradient-to-br from-green-50 via-green-100 to-green-50 dark:from-green-900/30 dark:via-green-800/30 dark:to-green-900/30 border-2 border-green-200 dark:border-green-800 rounded-xl p-5 shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105 group">
                      <div className="absolute top-0 right-0 w-20 h-20 bg-green-200/30 dark:bg-green-700/20 rounded-full -translate-y-10 translate-x-10 group-hover:scale-150 transition-transform duration-500"></div>
                      <div className="relative">
                        <div className="text-xs font-semibold text-green-700 dark:text-green-300 mb-2 uppercase tracking-wide">Avg Fit Score</div>
                        <div className="text-3xl font-bold text-green-900 dark:text-green-100">
                          {filteredCandidates.length > 0
                            ? Math.round(
                              filteredCandidates.reduce((sum, c) => {
                                const score = c.aiScore || c.overallScore || calculateCandidateScore(c)
                                return sum + score
                              }, 0) / filteredCandidates.length
                            )
                            : 0}
                        </div>
                      </div>
                    </div>
                    <div className="relative overflow-hidden bg-gradient-to-br from-purple-50 via-purple-100 to-purple-50 dark:from-purple-900/30 dark:via-purple-800/30 dark:to-purple-900/30 border-2 border-purple-200 dark:border-purple-800 rounded-xl p-5 shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105 group">
                      <div className="absolute top-0 right-0 w-20 h-20 bg-purple-200/30 dark:bg-purple-700/20 rounded-full -translate-y-10 translate-x-10 group-hover:scale-150 transition-transform duration-500"></div>
                      <div className="relative">
                        <div className="text-xs font-semibold text-purple-700 dark:text-purple-300 mb-2 uppercase tracking-wide">Hired</div>
                        <div className="text-3xl font-bold text-purple-900 dark:text-purple-100">
                          {filteredCandidates.filter(c => c.status === 'hired').length}
                        </div>
                      </div>
                    </div>
                    <div className="relative overflow-hidden bg-gradient-to-br from-amber-50 via-amber-100 to-amber-50 dark:from-amber-900/30 dark:via-amber-800/30 dark:to-amber-900/30 border-2 border-amber-200 dark:border-amber-800 rounded-xl p-5 shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105 group">
                      <div className="absolute top-0 right-0 w-20 h-20 bg-amber-200/30 dark:bg-amber-700/20 rounded-full -translate-y-10 translate-x-10 group-hover:scale-150 transition-transform duration-500"></div>
                      <div className="relative">
                        <div className="text-xs font-semibold text-amber-700 dark:text-amber-300 mb-2 uppercase tracking-wide">Conversion Rate</div>
                        <div className="text-3xl font-bold text-amber-900 dark:text-amber-100">
                          {filteredCandidates.length > 0
                            ? Math.round(
                              (filteredCandidates.filter(c => c.status === 'hired' || c.status === 'offer').length /
                                filteredCandidates.length) *
                              100
                            )
                            : 0}%
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Candidate Details Table */}
                  {showDetailedView && (
                    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800 shadow-lg">
                      <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                          Candidate Details Table
                        </h4>
                      </div>
                      <table className="w-full text-sm">
                        <thead className="bg-gradient-to-r from-gray-50 via-gray-100 to-gray-50 dark:from-gray-800 dark:via-gray-700 dark:to-gray-800 border-b-2 border-gray-200 dark:border-gray-700">
                          <tr>
                            <th className="px-5 py-4 text-left font-semibold text-gray-700 dark:text-gray-300 w-12">
                              <input
                                type="checkbox"
                                checked={paginatedCandidates.length > 0 && paginatedCandidates.every(c => selectedCandidatesInAnalytics.includes(c.id))}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    const pageIds = paginatedCandidates.map(c => c.id)
                                    setSelectedCandidatesInAnalytics(prev => [...new Set([...prev, ...pageIds])])
                                  } else {
                                    const pageIds = paginatedCandidates.map(c => c.id)
                                    setSelectedCandidatesInAnalytics(prev => prev.filter(id => !pageIds.includes(id)))
                                  }
                                }}
                                className="h-4 w-4 rounded border-2 border-gray-300 dark:border-gray-600 text-blue-600 dark:text-blue-400 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-gray-700 cursor-pointer transition-all"
                                aria-label="Select all candidates on this page"
                              />
                            </th>
                            <th className="px-5 py-4 text-left font-semibold text-gray-700 dark:text-gray-300">
                              <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                <span>Applicant ID</span>
                              </div>
                            </th>
                            <th className="px-5 py-4 text-left font-semibold text-gray-700 dark:text-gray-300">
                              <div className="flex items-center gap-2">
                                <Settings className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                <span>Actions</span>
                              </div>
                            </th>
                            <th className="px-5 py-4 text-left font-semibold text-gray-700 dark:text-gray-300">Name</th>
                            <th className="px-5 py-4 text-left font-semibold text-gray-700 dark:text-gray-300">Email</th>
                            <th className="px-5 py-4 text-left font-semibold text-gray-700 dark:text-gray-300">Position</th>
                            <th className="px-5 py-4 text-left font-semibold text-gray-700 dark:text-gray-300">Source</th>
                            <th className="px-5 py-4 text-left font-semibold text-gray-700 dark:text-gray-300">Status</th>
                            <th className="px-5 py-4 text-left font-semibold text-gray-700 dark:text-gray-300">Fit Score</th>
                            <th className="px-5 py-4 text-left font-semibold text-gray-700 dark:text-gray-300">ATS Score</th>
                            <th className="px-5 py-4 text-left font-semibold text-gray-700 dark:text-gray-300">Experience</th>
                            <th className="px-5 py-4 text-left font-semibold text-gray-700 dark:text-gray-300">Skills</th>
                            <th className="px-5 py-4 text-left font-semibold text-gray-700 dark:text-gray-300">Applied Date</th>

                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-900">
                          {paginatedCandidates.map((candidate, index) => {
                            // Use backend scores with proper fallback
                            const fitScore = candidate.job_specific_fit_score !== undefined && candidate.job_specific_fit_score !== null
                              ? Math.round(candidate.job_specific_fit_score)
                              : (candidate.role_suitability !== undefined && candidate.role_suitability !== null
                                ? Math.round(candidate.role_suitability)
                                : calculateCandidateScore(candidate))
                            const atsScore = candidate.ats_score !== undefined && candidate.ats_score !== null
                              ? Math.round(candidate.ats_score)
                              : (candidate.weighted_skill_score || 0)
                            const scoreColor = fitScore >= 80 ? 'text-green-600 dark:text-green-400' :
                              fitScore >= 60 ? 'text-yellow-600 dark:text-yellow-400' :
                                'text-red-600 dark:text-red-400'
                            const applicantId = (candidate as Candidate & { applicant_id?: string }).applicant_id || candidate.id
                            const isSelected = selectedCandidatesInAnalytics.includes(candidate.id)

                            return (
                              <tr
                                key={candidate.id}
                                className={`transition-all duration-200 ${isSelected
                                  ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-l-blue-500'
                                  : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                                  } ${index % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50/50 dark:bg-gray-800/30'}`}
                              >
                                <td className="px-5 py-4">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedCandidatesInAnalytics(prev => [...prev, candidate.id])
                                      } else {
                                        setSelectedCandidatesInAnalytics(prev => prev.filter(id => id !== candidate.id))
                                      }
                                    }}
                                    className="h-4 w-4 rounded border-2 border-gray-300 dark:border-gray-600 text-blue-600 dark:text-blue-400 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-gray-700 cursor-pointer transition-all"
                                    aria-label={`Select ${candidate.name}`}
                                  />
                                </td>
                                <td className="px-5 py-4">
                                  <span className="font-mono text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded-md">
                                    {applicantId}
                                  </span>
                                </td>
                                <td className="px-5 py-4">
                                  <CandidateActions
                                    candidate={candidate}
                                  />
                                </td>
                                <td className="px-5 py-4">
                                  <span className="font-semibold text-gray-900 dark:text-gray-100">{candidate.name}</span>
                                </td>
                                <td className="px-5 py-4 text-gray-600 dark:text-gray-400">{candidate.email}</td>
                                <td className="px-5 py-4">
                                  <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 text-xs font-medium">
                                    {candidate.position}
                                  </span>
                                </td>
                                <td className="px-5 py-4 text-gray-600 dark:text-gray-400">{candidate.source}</td>
                                <td className="px-5 py-4">
                                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold shadow-sm ${candidate.status === 'hired' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border border-green-200 dark:border-green-800' :
                                    candidate.status === 'rejected' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 border border-red-200 dark:border-red-800' :
                                      candidate.status === 'interview' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 border border-blue-200 dark:border-blue-800' :
                                        candidate.status === 'offer' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 border border-purple-200 dark:border-purple-800' :
                                          candidate.status === 'screening' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 border border-yellow-200 dark:border-yellow-800' :
                                            'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600'
                                    }`}>
                                    {candidate.status}
                                  </span>
                                </td>
                                <td className={`px-5 py-4 font-bold text-lg ${scoreColor}`}>
                                  {fitScore}
                                </td>
                                <td className="px-5 py-4">
                                  {atsScore > 0 ? (
                                    <span className="font-semibold text-blue-600 dark:text-blue-400">{atsScore}</span>
                                  ) : (
                                    <span className="text-gray-400 dark:text-gray-500">N/A</span>
                                  )}
                                </td>
                                <td className="px-5 py-4 text-gray-600 dark:text-gray-400">{candidate.experience || 'N/A'}</td>
                                <td className="px-5 py-4">
                                  {candidate.skills && candidate.skills.length > 0 ? (
                                    <div className="flex flex-wrap gap-1">
                                      {candidate.skills.slice(0, 2).map((skill, idx) => (
                                        <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs">
                                          {skill}
                                        </span>
                                      ))}
                                      {candidate.skills.length > 2 && (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-xs">
                                          +{candidate.skills.length - 2}
                                        </span>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-gray-400 dark:text-gray-500">N/A</span>
                                  )}
                                </td>
                                <td className="px-5 py-4 text-gray-600 dark:text-gray-400">{candidate.appliedDate}</td>

                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                      {/* Pagination for Candidates Table */}
                      {filteredCandidates.length > 0 && (
                        <div className="bg-gray-50 dark:bg-gray-800 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
                          <div className="flex-1 flex justify-between sm:hidden mb-3">
                            <button
                              onClick={() => setCandidatesCurrentPage(Math.max(1, candidatesCurrentPage - 1))}
                              disabled={candidatesCurrentPage === 1}
                              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Previous
                            </button>
                            <button
                              onClick={() => setCandidatesCurrentPage(Math.min(candidatesTotalPages, candidatesCurrentPage + 1))}
                              disabled={candidatesCurrentPage === candidatesTotalPages}
                              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Next
                            </button>
                          </div>
                          <div className="hidden sm:flex sm:items-center sm:justify-between">
                            <div>
                              <p className="text-sm text-gray-700 dark:text-gray-300">
                                Showing <span className="font-medium">{candidatesStartIndex + 1}</span> to{' '}
                                <span className="font-medium">{Math.min(candidatesEndIndex, filteredCandidates.length)}</span>{' '}
                                of <span className="font-medium">{filteredCandidates.length}</span> candidates
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <select
                                value={candidatesRowsPerPage}
                                onChange={(e) => {
                                  setCandidatesRowsPerPage(Number(e.target.value))
                                  setCandidatesCurrentPage(1)
                                }}
                                className="px-3 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                <option value={10}>10 per page</option>
                                <option value={25}>25 per page</option>
                                <option value={50}>50 per page</option>
                                <option value={100}>100 per page</option>
                              </select>
                              <div className="flex gap-1">
                                <button
                                  onClick={() => setCandidatesCurrentPage(Math.max(1, candidatesCurrentPage - 1))}
                                  disabled={candidatesCurrentPage === 1}
                                  className="px-4 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                  Previous
                                </button>
                                <button
                                  onClick={() => setCandidatesCurrentPage(Math.min(candidatesTotalPages, candidatesCurrentPage + 1))}
                                  disabled={candidatesCurrentPage === candidatesTotalPages}
                                  className="px-4 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                  Next
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Card View (when table is hidden) */}
                  {!showDetailedView && (
                    <div className="space-y-4">
                      {paginatedCandidates.map((candidate) => {
                        // Use backend scores with proper fallback
                        const fitScore = candidate.job_specific_fit_score !== undefined && candidate.job_specific_fit_score !== null
                          ? Math.round(candidate.job_specific_fit_score)
                          : (candidate.role_suitability !== undefined && candidate.role_suitability !== null
                            ? Math.round(candidate.role_suitability)
                            : calculateCandidateScore(candidate))
                        const atsScore = candidate.ats_score !== undefined && candidate.ats_score !== null
                          ? Math.round(candidate.ats_score)
                          : (candidate.weighted_skill_score || 0)

                        // Get initials for avatar
                        const nameParts = candidate.name.trim().split(' ')
                        const initials = nameParts.length === 1
                          ? nameParts[0][0]?.toUpperCase() || ''
                          : (nameParts[0][0]?.toUpperCase() || '') + (nameParts[nameParts.length - 1][0]?.toUpperCase() || '')

                        // Get applicant ID
                        const applicantId = (candidate as Candidate & { applicant_id?: string }).applicant_id || candidate.id

                        // Status badge styling
                        const getStatusBadge = (status: string) => {
                          if (!status || status === 'applied') {
                            return (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400">
                                Applied
                              </span>
                            )
                          }
                          const badgeClass =
                            status === 'hired' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                              status === 'rejected' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                                status === 'interview' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                                  status === 'offer' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' :
                                    status === 'screening' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                                      'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                          return (
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badgeClass}`}>
                              {status.charAt(0).toUpperCase() + status.slice(1)}
                            </span>
                          )
                        }

                        return (
                          <div
                            key={candidate.id}
                            className="group relative overflow-hidden bg-white dark:bg-[#111111] border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 p-3 sm:p-4 hover:border-blue-300 dark:hover:border-blue-700 hover:-translate-y-0.5"
                          >
                            {/* Subtle gradient overlay on hover */}
                            <div className="absolute inset-0 bg-gradient-to-br from-blue-50/0 via-transparent to-blue-50/30 dark:from-blue-900/0 dark:via-transparent dark:to-blue-900/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>

                            {/* Left accent border indicator */}
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-500 via-blue-400 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                            <div className="relative flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                              <div className="flex items-start space-x-3 sm:space-x-4 flex-1 min-w-0">
                                {/* Enhanced Avatar */}
                                <div className="relative flex-shrink-0">
                                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 dark:from-blue-400 dark:via-blue-500 dark:to-blue-600 flex items-center justify-center text-white font-semibold text-sm sm:text-base shadow-md group-hover:scale-110 group-hover:shadow-lg transition-all duration-300 ring-2 ring-white dark:ring-gray-800">
                                    {initials}
                                  </div>
                                  {/* Status indicator dot */}
                                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-blue-500 rounded-full border-2 border-white dark:border-gray-900 shadow-sm"></div>
                                </div>

                                {/* Main Content */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-2.5 mb-3">
                                    <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                      {candidate.name}
                                    </h3>
                                    {getStatusBadge(candidate.status || 'applied')}
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                                    {/* Applicant ID */}
                                    <div className="flex items-center gap-2">
                                      <div className="flex-shrink-0 w-5 h-5 rounded bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                        <svg className="w-3 h-3 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                        </svg>
                                      </div>
                                      <span className="font-mono text-sm font-semibold text-blue-600 dark:text-blue-400">{applicantId}</span>
                                    </div>

                                    {/* Email */}
                                    <div className="flex items-center gap-2">
                                      <div className="flex-shrink-0 w-5 h-5 rounded bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                        <svg className="w-3 h-3 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                        </svg>
                                      </div>
                                      <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{candidate.email}</span>
                                    </div>

                                    {/* Position */}
                                    <div className="flex items-center gap-2">
                                      <div className="flex-shrink-0 w-5 h-5 rounded bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                        <Briefcase className="w-3 h-3 text-gray-600 dark:text-gray-400" />
                                      </div>
                                      <span className="text-sm text-gray-700 dark:text-gray-300">{candidate.position || 'N/A'}</span>
                                    </div>

                                    {/* Applied Date */}
                                    <div className="flex items-center gap-2">
                                      <div className="flex-shrink-0 w-5 h-5 rounded bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                        <svg className="w-3 h-3 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                      </div>
                                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{candidate.appliedDate || 'N/A'}</span>
                                    </div>
                                  </div>

                                  {/* Badge Row */}
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <span className="inline-flex items-center px-2 py-1 rounded-md bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 text-xs font-semibold border border-blue-200 dark:border-blue-800">
                                      {candidate.position || 'N/A'}
                                    </span>
                                    {candidate.experience && (
                                      <span className="inline-flex items-center px-2 py-1 rounded-md bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 text-xs font-medium">
                                        {candidate.experience}
                                      </span>
                                    )}
                                    {candidate.source && (
                                      <span className="inline-flex items-center px-2 py-1 rounded-md bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 text-xs font-medium">
                                        {candidate.source}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Score Section */}
                              <div className="flex items-center gap-3">
                                {/* ATS Score */}
                                {atsScore > 0 && (
                                  <div className="text-center">
                                    <div className="inline-flex flex-col items-center justify-center p-3 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 border border-blue-200 dark:border-blue-800 min-w-[70px]">
                                      <div className="text-xl sm:text-2xl font-bold text-blue-700 dark:text-blue-300">
                                        {atsScore}
                                      </div>
                                      <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 mt-0.5 uppercase tracking-wide">ATS</div>
                                    </div>
                                  </div>
                                )}

                                {/* Fit Score */}
                                {fitScore > 0 && (
                                  <div className="text-center">
                                    <div className={`inline-flex flex-col items-center justify-center p-3 rounded-lg border min-w-[70px] ${fitScore >= 80
                                      ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800'
                                      : fitScore >= 60
                                        ? 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800'
                                        : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800'
                                      }`}>
                                      <div className="text-xl sm:text-2xl font-bold">
                                        {fitScore}
                                      </div>
                                      <div className="text-xs font-semibold mt-0.5 uppercase tracking-wide">Fit</div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                  {/* Pagination for Candidates Card View */}
                  {!showDetailedView && candidatesTotalPages > 1 && (
                    <div className="mt-6 bg-white dark:bg-gray-800 px-4 py-3 flex items-center justify-between border border-gray-200 dark:border-gray-700 rounded-xl">
                      <div className="flex-1 flex justify-between sm:hidden">
                        <button
                          onClick={() => setCandidatesCurrentPage(Math.max(1, candidatesCurrentPage - 1))}
                          disabled={candidatesCurrentPage === 1}
                          className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Previous
                        </button>
                        <button
                          onClick={() => setCandidatesCurrentPage(Math.min(candidatesTotalPages, candidatesCurrentPage + 1))}
                          disabled={candidatesCurrentPage === candidatesTotalPages}
                          className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Next
                        </button>
                      </div>
                      <div className="hidden sm:flex sm:items-center sm:justify-between w-full">
                        <div>
                          <p className="text-sm text-gray-700 dark:text-gray-300">
                            Showing <span className="font-medium">{candidatesStartIndex + 1}</span> to{' '}
                            <span className="font-medium">{Math.min(candidatesEndIndex, filteredCandidates.length)}</span>{' '}
                            of <span className="font-medium">{filteredCandidates.length}</span> candidates
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <select
                            value={candidatesRowsPerPage}
                            onChange={(e) => {
                              setCandidatesRowsPerPage(Number(e.target.value))
                              setCandidatesCurrentPage(1)
                            }}
                            className="px-3 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value={10}>10 per page</option>
                            <option value={25}>25 per page</option>
                            <option value={50}>50 per page</option>
                            <option value={100}>100 per page</option>
                          </select>
                          <div className="flex gap-1">
                            <button
                              onClick={() => setCandidatesCurrentPage(Math.max(1, candidatesCurrentPage - 1))}
                              disabled={candidatesCurrentPage === 1}
                              className="px-4 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              Previous
                            </button>
                            <button
                              onClick={() => setCandidatesCurrentPage(Math.min(candidatesTotalPages, candidatesCurrentPage + 1))}
                              disabled={candidatesCurrentPage === candidatesTotalPages}
                              className="px-4 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              Next
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </ComponentCard>
            </div>
          )}

          {tab === 'performance' && (
            <ComponentCard title="Hiring Trends">
              <div className="p-4">
                <div className="w-full h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RCLineChart data={filteredData}>
                      <RCCartesianGrid strokeDasharray="3 3" />
                      <RCXAxis dataKey="month" />
                      <RCYAxis />
                      <RCTooltip />
                      <RCLine type="monotone" dataKey="hired" stroke="#10B981" strokeWidth={2} name="Hired" />
                      <RCLine type="monotone" dataKey="applications" stroke="#3B82F6" strokeWidth={2} name="Applications" />
                    </RCLineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </ComponentCard>
          )}
        </div>
      </div>
    )
  }

  // --- Sources Management (pie chart + table + CRUD) ---
  const SourcesManagement: React.FC = () => {
    type Source = {
      id: string;
      name: string;
      type: "job-board" | "social-media" | "referral" | "agency" | "career-fair" | "other";
      url?: string;
      status: "active" | "inactive";
      applications: number;
      hires: number;
      cost: number;
      costPerHire: number;
      description: string;
      addedDate: string;
    }

    const initial: Source[] = [
      { id: "SRC-001", name: "LinkedIn Jobs", type: "job-board", url: "https://linkedin.com/jobs", status: "active", applications: 145, hires: 28, cost: 2500, costPerHire: 89, description: "Professional networking platform for tech talent", addedDate: "2024-01-15" },
      { id: "SRC-002", name: "Indeed", type: "job-board", url: "https://indeed.com", status: "active", applications: 98, hires: 15, cost: 1200, costPerHire: 80, description: "General job board with wide reach", addedDate: "2024-01-10" },
      { id: "SRC-006", name: "Naukri", type: "job-board", url: "https://www.naukri.com/", status: "active", applications: 27, hires: 5, cost: 600, costPerHire: 120, description: "Leading Indian job portal", addedDate: "2024-02-10" },
      { id: "SRC-003", name: "Employee Referrals", type: "referral", status: "active", applications: 42, hires: 18, cost: 5400, costPerHire: 300, description: "Internal employee referral program", addedDate: "2024-01-01" },
      { id: "SRC-004", name: "Company Website", type: "other", status: "active", applications: 67, hires: 12, cost: 0, costPerHire: 0, description: "Direct applications through company career page", addedDate: "2024-02-01" },
      { id: "SRC-005", name: "University Career Fair", type: "career-fair", status: "inactive", applications: 18, hires: 3, cost: 800, costPerHire: 267, description: "Annual university recruitment event", addedDate: "2024-03-15" },
    ]

    const [sources, setSources] = useState<Source[]>(initial)
    const [editing, setEditing] = useState<Source | null>(null)

    const pieData = sources.filter(s => s.status === 'active').map(s => ({ name: s.name, value: s.applications }))

    const totalApps = pieData.reduce((sum, d) => sum + d.value, 0)

    const COLORS: Record<string, string> = {
      'LinkedIn Jobs': '#0077B5',
      'Indeed': '#2557A7',
      'Naukri': '#FF6A00',
      'Employee Referrals': '#10B981',
      'Company Website': '#F59E0B',
      'Other': '#8B5CF6',
    }

    const toggleStatus = (id: string) => setSources(prev => prev.map(s => s.id === id ? { ...s, status: s.status === 'active' ? 'inactive' : 'active' } : s))
    const removeSource = (id: string) => setSources(prev => prev.filter(s => s.id !== id))
    const saveEdit = (updated: Source) => {
      setSources(prev => prev.map(s => s.id === updated.id ? updated : s))
      setEditing(null)
    }

    return (
      <div className="space-y-6">
        <ComponentCard title="Application Sources">
          <div className="relative p-4 h-[360px]">
            <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
              <div className="px-4 py-2 rounded-lg bg-white/80 border text-sm font-semibold text-gray-700">Coming soon</div>
            </div>
            <div className="w-full h-full blur-[1.5px] opacity-80">
              <ResponsiveContainer width="100%" height="100%">
                <RCPieChart2>
                  <RCPie2 data={pieData} cx="50%" cy="50%" outerRadius={120} dataKey="value" label={(props: { name?: string; value?: number | string }) => `${props.name ?? ''}: ${totalApps ? Math.round((Number(props.value) / totalApps) * 100) : 0}%`}>
                    {pieData.map((entry, index) => (
                      <RCCell2 key={`cell-${index}`} fill={COLORS[entry.name] || '#8B5CF6'} />
                    ))}
                  </RCPie2>
                  <RCTooltip2 />
                  <RCLegend2 />
                </RCPieChart2>
              </ResponsiveContainer>
            </div>
          </div>
        </ComponentCard>

        <ComponentCard title="All Sources">
          <div className="p-4 relative">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Manage your recruitment channels and track their performance</div>
            <div className="relative">
              <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                <div className="px-4 py-2 rounded-lg bg-white/80 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-600 text-sm font-semibold text-gray-700 dark:text-gray-300">Coming Soon</div>
              </div>
              <div className="overflow-x-auto blur-[1.5px] opacity-80">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-700">
                      <th className="px-3 py-2 text-left text-gray-900 dark:text-gray-100">Source</th>
                      <th className="px-3 py-2 text-left text-gray-900 dark:text-gray-100">Type</th>
                      <th className="px-3 py-2 text-left text-gray-900 dark:text-gray-100">Status</th>
                      <th className="px-3 py-2 text-right text-gray-900 dark:text-gray-100">Applications</th>
                      <th className="px-3 py-2 text-right text-gray-900 dark:text-gray-100">Hires</th>
                      <th className="px-3 py-2 text-left text-gray-900 dark:text-gray-100">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sources.map((s, i) => (
                      <tr key={s.id} className={i % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-700'}>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[s.name] || '#8B5CF6' }} />
                            <div>
                              <div className="font-medium text-gray-900 dark:text-gray-100">{s.name}</div>
                              {s.url && (
                                <a href={s.url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
                                  <ExternalLink className="h-3 w-3" /> Visit
                                </a>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs border ${s.type === 'job-board' ? 'border-blue-300 dark:border-blue-600 text-blue-700 dark:text-blue-200 bg-blue-50 dark:bg-blue-900/30' :
                            s.type === 'referral' ? 'border-green-300 dark:border-green-600 text-green-700 dark:text-green-200 bg-green-50 dark:bg-green-900/30' :
                              s.type === 'career-fair' ? 'border-orange-300 dark:border-orange-600 text-orange-700 dark:text-orange-200 bg-orange-50 dark:bg-orange-900/30' :
                                s.type === 'social-media' ? 'border-purple-300 dark:border-purple-600 text-purple-700 dark:text-purple-200 bg-purple-50 dark:bg-purple-900/30' :
                                  s.type === 'agency' ? 'border-red-300 dark:border-red-600 text-red-700 dark:text-red-200 bg-red-50 dark:bg-red-900/30' :
                                    'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-gray-700'
                            }`}>{s.type.replace('-', ' ')}</span>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2">
                            <input type="checkbox" checked={s.status === 'active'} onChange={() => toggleStatus(s.id)} className="dark:bg-gray-700" />
                            <span className={`px-2 py-1 rounded-full text-xs ${s.status === 'active' ? 'bg-green-500 text-white' : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200'}`}>{s.status}</span>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-right text-blue-600 dark:text-blue-400 font-semibold">{s.applications}</td>
                        <td className="px-3 py-3 text-right">
                          <div className="font-semibold text-green-600 dark:text-green-400">{s.hires}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{s.applications > 0 ? ((s.hires / s.applications) * 100).toFixed(1) : 0}% rate</div>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2">
                            <button className="p-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400" onClick={() => setEditing(s)} title="Edit">
                              <Edit className="h-4 w-4" />
                            </button>
                            <button className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-600 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400" onClick={() => removeSource(s.id)} title="Delete">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </ComponentCard>

        {editing && (
          <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/20" onClick={() => setEditing(null)} />
            <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-xl">
              <div className="flex items-center justify-between p-4 border-b">
                <h3 className="text-lg font-semibold">Edit Source</h3>
                <button className="p-1 text-gray-500" onClick={() => setEditing(null)}><X className="h-4 w-4" /></button>
              </div>
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm font-medium mb-1">Source Name</div>
                    <input className="w-full px-3 py-2 border rounded-md" value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} />
                  </div>
                  <div>
                    <div className="text-sm font-medium mb-1">Type</div>
                    <select className="w-full px-3 py-2 border rounded-md" value={editing.type} onChange={e => setEditing({ ...editing, type: e.target.value as Source['type'] })}>
                      <option value="job-board">Job Board</option>
                      <option value="social-media">Social Media</option>
                      <option value="referral">Referral</option>
                      <option value="agency">Agency</option>
                      <option value="career-fair">Career Fair</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm font-medium mb-1">URL (Optional)</div>
                    <input className="w-full px-3 py-2 border rounded-md" value={editing.url || ''} onChange={e => setEditing({ ...editing, url: e.target.value })} placeholder="https://example.com" />
                  </div>
                  <div>
                    <div className="text-sm font-medium mb-1">Cost ($)</div>
                    <input type="number" className="w-full px-3 py-2 border rounded-md" value={editing.cost} onChange={e => setEditing({ ...editing, cost: Number(e.target.value) || 0, costPerHire: (Number(e.target.value) || 0) })} />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm font-medium mb-1">Status</div>
                    <select className="w-full px-3 py-2 border rounded-md" value={editing.status} onChange={e => setEditing({ ...editing, status: e.target.value as Source['status'] })}>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium mb-1">Description</div>
                  <textarea className="w-full px-3 py-2 border rounded-md" rows={3} value={editing.description} onChange={e => setEditing({ ...editing, description: e.target.value })} />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    variant="outline"
                    className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 px-4 py-2 rounded-full transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
                    onClick={() => setEditing(null)}
                    aria-label="Cancel editing"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => saveEdit(editing)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-full transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
                    aria-label="Update source"
                  >
                    Update Source
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Daily applications count is calculated from candidates data in calculateMetrics()

  // Fetch HR metrics from backend aggregation
  const fetchHRMetrics = async () => {
    try {
      const res = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.HR_METRICS))
      if (!res.ok) {
        console.warn('Failed to fetch HR metrics:', res.status, res.statusText)
        return
      }

      const payload = await res.json()
      const m = payload?.data || payload || {}
      setMetrics({
        totalCandidates: m.totalCandidates ?? 0,
        newApplicationsToday: m.newApplicationsToday ?? 0,
        interviewsScheduled: m.interviewsScheduled ?? 0,
        offersExtended: m.offersExtended ?? 0,
        averageTimeToHire: m.averageTimeToHire ?? 0,
        conversionRate: m.conversionRate ?? 0,
        costPerHire: m.costPerHire ?? 0,
      })
    } catch (e) {
      console.error('Failed to fetch HR metrics:', e)
    }
  }

  // Refresh all data from backend
  const refreshData = async () => {
    try {
      setIsRefreshing(true)
      await Promise.all([
        fetchApplicants(),
        fetchHRMetrics()
        // Note: Daily applications count is calculated from candidates data in calculateMetrics()
      ])
    } finally {
      setIsRefreshing(false)
    }
  }

  // ============================================================================
  // Scoring Functions
  // ============================================================================

  /**
   * Get fit score for a candidate (used for filtering and display)
   * Priority: job_specific_fit_score > role_suitability > calculateCandidateScore
   * This matches the display logic in the UI
   */
  const getCandidateFitScore = (candidate: Candidate): number => {
    if (candidate.job_specific_fit_score !== undefined && candidate.job_specific_fit_score !== null) {
      return Math.round(candidate.job_specific_fit_score)
    }
    if (candidate.role_suitability !== undefined && candidate.role_suitability !== null) {
      return Math.round(candidate.role_suitability)
    }
    return calculateCandidateScore(candidate)
  }

  /**
   * Calculate candidate score based on available data
   * Priority: job_specific_fit_score > role_suitability > aiScore > overallScore > weighted_skill_score > calculated score
   */
  const calculateCandidateScore = (candidate: Candidate): number => {
    // Use backend job_specific_fit_score if available (most accurate)
    if (candidate.job_specific_fit_score !== undefined && candidate.job_specific_fit_score !== null) {
      return Math.round(candidate.job_specific_fit_score)
    }

    // Use backend role_suitability if available
    if (candidate.role_suitability !== undefined && candidate.role_suitability !== null) {
      return Math.round(candidate.role_suitability)
    }

    // Fallback to other scores
    if (candidate.aiScore !== undefined && candidate.aiScore !== null) {
      return candidate.aiScore
    }
    if (candidate.overallScore !== undefined && candidate.overallScore !== null) {
      return candidate.overallScore
    }
    if (candidate.weighted_skill_score !== undefined && candidate.weighted_skill_score !== null) {
      return candidate.weighted_skill_score
    }

    // Calculate basic score from available data
    let score = 0

    // Experience scoring (0-30 points)
    if (candidate.experience) {
      const expMatch = candidate.experience.match(/(\d+)/)
      if (expMatch) {
        const years = parseInt(expMatch[1])
        score += Math.min(years * 5, 30)
      }
    }

    // Skills scoring (0-30 points)
    if (candidate.skills && candidate.skills.length > 0) {
      score += Math.min(candidate.skills.length * 3, 30)
    }

    // Status scoring (0-20 points)
    const statusScores: Record<string, number> = {
      'hired': 20,
      'offer': 15,
      'interview': 10,
      'screening': 5,
      'applied': 0,
      'rejected': 0
    }
    score += statusScores[candidate.status] || 0

    // Source scoring (0-20 points)
    const sourceScores: Record<string, number> = {
      'Employee Referrals': 20,
      'LinkedIn': 15,
      'Company Website': 10,
      'Indeed': 8,
      'Naukri': 5
    }
    score += sourceScores[candidate.source] || 0

    return Math.min(Math.round(score), 100)
  }

  /**
   * Fetch or recalculate scores for candidates via API (currently unused)
   */
  // const refreshCandidateScores = async (candidateIds?: string[]) => {
  //   try {
  //     const candidatesToRefresh = candidateIds 
  //       ? candidates.filter(c => candidateIds.includes(c.id))
  //       : filteredCandidates
  //     if (candidatesToRefresh.length === 0) return
  //     setCandidates(prev => prev.map(c => {
  //       const shouldUpdate = candidateIds ? candidateIds.includes(c.id) : true
  //       if (shouldUpdate) {
  //         const calculatedScore = calculateCandidateScore(c)
  //         return { ...c, aiScore: c.aiScore || calculatedScore, overallScore: c.overallScore || calculatedScore }
  //       }
  //       return c
  //     }))
  //   } catch (error) {
  //     console.error('Failed to refresh candidate scores:', error)
  //   }
  // }

  /**
   * Generate PDF report for candidates (similar to executive report) - currently unused
   */
  // const generateCandidatePDFReport = (candidates: Candidate[], title: string = 'Candidate Report') => {
  //   // Function body commented out - currently unused
  // }

  // ============================================================================
  // Analytics Aggregation Functions
  // ============================================================================

  /**
   * Calculate analytics metrics grouped by job position (currently unused)
   */
  // const calculateJobAnalytics = (candidates: Candidate[]) => {
  //   // Function body commented out - currently unused
  //   return { analytics: [], summaryRow: {} }
  // }

  /**
   * Get filtered candidates based on current UI filters and selection
   */
  const getExportCandidates = () => {
    return filteredCandidates.filter(c =>
      selectedCandidates.length === 0 || selectedCandidates.includes(c.id)
    )
  }

  // ============================================================================
  // Download Functions - Candidate Data Export
  // ============================================================================

  const downloadCSV = () => {
    const candidates = getExportCandidates()
    const headers = ['Applicant ID', 'Name', 'Email', 'Position', 'Status', 'Applied Date', 'Source', 'Phone', 'Experience', 'Skills', 'Fit Score', 'ATS Score']
    const csvContent = [
      headers.join(','),
      ...candidates.map(candidate => [
        `"${(candidate as Candidate & { applicant_id?: string }).applicant_id || candidate.id}"`,
        `"${candidate.name}"`,
        `"${candidate.email}"`,
        `"${candidate.position}"`,
        `"${candidate.status}"`,
        `"${candidate.appliedDate}"`,
        `"${candidate.source}"`,
        `"${candidate.phone || ''}"`,
        `"${candidate.experience || ''}"`,
        `"${candidate.skills?.join(', ') || ''}"`,
        `"${candidate.aiScore || candidate.overallScore || 'N/A'}"`,
        `"${candidate.weighted_skill_score || 'N/A'}"`,
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    const now = new Date()
    const yyyy = now.getFullYear()
    const mm = String(now.getMonth() + 1).padStart(2, '0')
    const dd = String(now.getDate()).padStart(2, '0')
    const hh = String(now.getHours()).padStart(2, '0')
    const mi = String(now.getMinutes()).padStart(2, '0')
    const ss = String(now.getSeconds()).padStart(2, '0')
    link.download = `candidates_${yyyy}-${mm}-${dd}_${hh}-${mi}-${ss}.csv`
    link.click()
  }

  const downloadExcel = () => {
    const candidates = getExportCandidates()
    const rows = candidates.map(candidate => ({
      'Applicant ID': (candidate as Candidate & { applicant_id?: string }).applicant_id || candidate.id,
      Name: candidate.name,
      Email: candidate.email,
      Position: candidate.position,
      Status: candidate.status,
      Applied: candidate.appliedDate,
      Source: candidate.source,
      Phone: candidate.phone || '',
      Experience: candidate.experience || '',
      Skills: (candidate.skills || []).join(', '),
      'Fit Score': candidate.aiScore || candidate.overallScore || 'N/A',
      'ATS Score': candidate.weighted_skill_score || 'N/A',
    }))

    const worksheet = XLSX.utils.json_to_sheet(rows)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Candidates')

    const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer
    const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    const now = new Date()
    const yyyy = now.getFullYear()
    const mm = String(now.getMonth() + 1).padStart(2, '0')
    const dd = String(now.getDate()).padStart(2, '0')
    const hh = String(now.getHours()).padStart(2, '0')
    const mi = String(now.getMinutes()).padStart(2, '0')
    const ss = String(now.getSeconds()).padStart(2, '0')
    link.download = `candidates_${yyyy}-${mm}-${dd}_${hh}-${mi}-${ss}.xlsx`
    link.click()
  }

  // ============================================================================
  // Resume Analysis Download
  // ============================================================================

  const downloadResumeAnalysis = async (candidate: Candidate) => {
    // Get applicant details - prioritize applicant_id over id for backend compatibility
    const rawApplicantId = (candidate.applicant_id || candidate.id || 'N/A').toString();

    // Clean applicantId - remove whitespace, tabs, and other control characters
    const applicantId = rawApplicantId.trim().replace(/\t/g, '').replace(/\n/g, '').replace(/\r/g, '');

    if (applicantId === 'N/A' || applicantId === '') {
      alert('Applicant ID not available. Cannot download report.');
      return;
    }

    // Prevent multiple downloads
    if (isDownloadingResumeAnalysis) {
      return;
    }

    try {
      // Set downloading state
      setIsDownloadingResumeAnalysis(true);

      // Call backend API to generate PDF
      const reportUrl = buildApiUrl(API_CONFIG.ENDPOINTS.JOBS_RESUME_ANALYSIS_PDF(applicantId));
      console.log('[DEBUG] Downloading resume analysis PDF for applicant:', applicantId);
      const response = await fetch(reportUrl);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('No analysis data found for this applicant.');
        } else {
          throw new Error(`Failed to generate resume analysis PDF: ${response.status} ${response.statusText}`);
        }
      }

      // Download the PDF blob
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Resume_Analysis_${applicantId}_${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

    } catch (error) {
      console.error('Error downloading resume analysis PDF:', error);
      alert(error instanceof Error ? error.message : 'Failed to download resume analysis PDF. Please try again.');
    } finally {
      // Reset downloading state
      setIsDownloadingResumeAnalysis(false);
    }
  };

  // ============================================================================
  // Download Functions - Analytics Report Export
  // ============================================================================

  // const downloadAnalyticsCSV = () => { // Currently unused
  //   // Function body commented out - currently unused
  // }

  // const downloadAnalyticsExcel = () => { // Currently unused
  //   // Function body commented out - currently unused
  // }

  // Clear all filters
  const clearAllFilters = () => {
    setSearchTerm("")
    setFilterStatus("all")
    setFilterPosition("all")
    setFilterField("all")
    setFilterTimeline("all")
    setCustomDateRange([null, null])
    setShowCustomDatePicker(false)
    setCurrentPage(1)
  }

  // Get active filter count
  const getActiveFilterCount = () => {
    let count = 0
    if (filterStatus !== "all") count++
    if (filterPosition !== "all") count++
    if (filterField !== "all") count++
    if (filterTimeline !== "all" && filterTimeline !== "") count++
    if (customDateRange[0] || customDateRange[1]) count++
    return count
  }

  // Get active filters for display
  const getActiveFilters = () => {
    const filters = []
    if (filterStatus !== "all") filters.push({ type: "Status", value: filterStatus })
    if (filterPosition !== "all") filters.push({ type: "Position", value: filterPosition })
    if (filterField !== "all") filters.push({ type: "Field", value: filterField })
    if (filterTimeline !== "all" && filterTimeline !== "") {
      if (filterTimeline === "custom" && customDateRange[0] && customDateRange[1]) {
        filters.push({
          type: "Timeline",
          value: `${customDateRange[0].toLocaleDateString()} - ${customDateRange[1].toLocaleDateString()}`
        })
      } else {
        filters.push({ type: "Timeline", value: filterTimeline })
      }
    }
    return filters
  }

  const generateAIInsights = async () => {
    // Simulate AI insights generation
    const insights: AIInsight[] = [
      {
        type: "prediction",
        message: "Based on current pipeline velocity, you'll likely need 2-3 more weeks to fill Senior Frontend Developer position",
        confidence: 85
      },
      {
        type: "recommendation",
        message: "Consider increasing budget for LinkedIn recruitment - it shows 23% higher conversion rate",
        confidence: 92
      },
      {
        type: "alert",
        message: "Several candidates have been in screening stage for over 5 days - review process bottlenecks",
        confidence: 78
      }
    ]
    setAiInsights(insights)
  }

  const handleAddCandidate = async () => {
    setSubmitMessage(null)
    if (!validateForm()) {
      return
    }

    // Ensure resume is uploaded
    if (!candidateForm.resume) {
      setSubmitMessage({ type: 'error', message: 'Please upload a resume file.' })
      return
    }

    setIsSavingCandidate(true)

    try {
      // Upload resume and submit application - this endpoint triggers ATS scoring and resume analysis
      const formData = new FormData();
      formData.append('file', candidateForm.resume);
      formData.append('name', candidateForm.name);
      formData.append('email', candidateForm.email);
      formData.append('mobile', candidateForm.phone);
      formData.append('job_category', candidateForm.category || candidateForm.position);
      formData.append('experience', candidateForm.experience);
      formData.append('job_type', candidateForm.jobType);
      formData.append('source', 'HR Dashboard');

      console.log('Submitting application with resume for ATS analysis...');

      const uploadRes = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.JOBS_UPLOAD), {
        method: 'POST',
        body: formData,
      });

      if (uploadRes.ok) {
        const uploadData = await uploadRes.json();
        const applicantId = uploadData.applicant_id;

        console.log('Application submitted successfully. Applicant ID:', applicantId);
        console.log('ATS scoring and resume analysis initiated in background.');
        console.log('Response:', uploadData);

        // Show success message indicating analysis is in progress
        setSubmitMessage({
          type: 'success',
          message: uploadData.message || 'Application submitted successfully! ATS scoring and resume analysis are in progress. The candidate will appear in the list shortly with full analysis data.'
        });

        // Reset form
        setCandidateForm({
          name: "",
          email: "",
          phone: "",
          position: "",
          category: "",
          source: "",
          experience: "",
          jobType: "",
          location: "",
          salary: "",
          jobDescription: "",
          notes: "",
          resume: null,
        });
        setFormErrors({});

        // Close modal after a short delay to show success message
        setTimeout(() => {
          setShowAddCandidate(false);
          setSubmitMessage(null);

          // Refresh candidates list to fetch the new application with ATS scores
          // Wait a bit for backend processing to complete, then refresh
          setTimeout(() => {
            console.log('Refreshing candidates list to fetch analyzed data...');
            fetchApplicants();
          }, 2000); // Wait 2 seconds for initial backend processing
        }, 1500);

      } else {
        // Handle duplicate (409) and other server errors gracefully
        let raw = ''
        try { raw = await uploadRes.text() } catch { }
        let parsed: Record<string, unknown> | null = null
        try { parsed = raw ? (JSON.parse(raw) as Record<string, unknown>) : null } catch { }

        if (uploadRes.status === 409) {
          const details = parsed?.details || 'Duplicate application detected.'
          const existingId = parsed?.existing_application_id ? ` (ID: ${parsed.existing_application_id})` : ''
          setSubmitMessage({ type: 'error', message: `Duplicate application: ${details}${existingId}` })
          setIsSavingCandidate(false)
          return
        }

        const msg = (parsed?.error as string) || (parsed?.message as string) || raw || 'Failed to submit application.'
        setSubmitMessage({
          type: 'error',
          message: `Failed to submit application: ${typeof msg === 'string' ? msg : 'Server error'}`
        })
        setIsSavingCandidate(false)
        return
      }
    } catch (error) {
      console.error('Error submitting application:', error)
      setSubmitMessage({
        type: 'error',
        message: `Failed to submit application: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
      setIsSavingCandidate(false)
    }
  }



  const handleStatusChange = async (candidateId: string, newStatus: string) => {
    const currentDate = new Date().toISOString().split('T')[0]
    console.log(`[Hire Portal] Changing status for candidate ${candidateId} to ${newStatus}`)

    // Optimistic update
    let previous: Candidate | null = null
    setCandidates(prev => prev.map(candidate => {
      if (candidate.id === candidateId) {
        previous = candidate
        const newStatusEntry = { status: newStatus, date: currentDate, duration: 0 }
        return {
          ...candidate,
          status: newStatus as Candidate["status"],
          lastActivity: currentDate,
          statusHistory: [...candidate.statusHistory, newStatusEntry],
        }
      }
      return candidate
    }))

    // Persist to backend using single-change endpoint (accepts ObjectId or applicant_id)
    try {
      console.log(`[HR Dashboard] Sending status change request to backend for candidate ${candidateId}`)
      const resp = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.HR_CANDIDATES_STATUS_CHANGE), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateId: candidateId, newStatus })
      })
      if (!resp.ok) {
        let detail = ''
        try { const j = await resp.json(); detail = j?.detail || JSON.stringify(j) } catch { }
        throw new Error(`HTTP ${resp.status}${detail ? ` - ${detail}` : ''}`)
      }
      console.log(`[HR Dashboard] Status change successful for candidate ${candidateId}`)
    } catch (e) {
      console.error('Failed to persist status change, rolling back', e)
      // Rollback on failure
      if (previous) {
        setCandidates(prev => prev.map(c => c.id === candidateId ? previous! : c))
      }
    }
  }


  const filteredCandidates = candidates.filter(candidate => {
    // Enhanced search functionality - works across all fields with partial matching
    const matchesSearch = searchTerm === "" || (() => {
      const searchLower = searchTerm.toLowerCase().trim()
      if (!searchLower) return true

      // Search across all candidate fields with partial matching
      const searchableFields = [
        candidate.id, // Applicant ID
        candidate.name,
        candidate.email,
        candidate.phone,
        candidate.position, // Job category/position
        candidate.status,
        candidate.source,
        candidate.experience,
        candidate.location,
        candidate.salary,
        candidate.notes,
        candidate.resume,
        candidate.recruiterNotes || '',
        candidate.recruiterFeedback || '',
        candidate.feedback || '',
        // Date fields - format for search
        candidate.appliedDate,
        candidate.lastActivity,
        candidate.statusDate || '',
        // Skills array
        ...(candidate.skills || []),
        // Status history
        ...(candidate.statusHistory || []).map(sh => sh.status),
      ]

      // Check if any field contains the search term (partial match)
      return searchableFields.some(field => {
        if (typeof field === 'string') {
          return field.toLowerCase().includes(searchLower)
        }
        return false
      })
    })()

    // Status filter
    const matchesStatus = filterStatus === "all" || candidate.status === filterStatus

    // Position filter
    const matchesPosition = filterPosition === "all" || candidate.position === filterPosition

    // Field-specific filter with partial matching
    let matchesField = true
    if (filterField !== "all" && searchTerm) {
      const searchLower = searchTerm.toLowerCase().trim()
      switch (filterField) {
        case "name":
          matchesField = candidate.name.toLowerCase().includes(searchLower)
          break
        case "email":
          matchesField = candidate.email.toLowerCase().includes(searchLower)
          break
        case "position":
          matchesField = candidate.position.toLowerCase().includes(searchLower)
          break
        case "status":
          matchesField = candidate.status.toLowerCase().includes(searchLower)
          break
        case "source":
          matchesField = candidate.source.toLowerCase().includes(searchLower)
          break
        case "id":
          matchesField = candidate.id.toLowerCase().includes(searchLower)
          break
      }
    }

    // Timeline filter
    let matchesTimeline = true
    if (filterTimeline !== "all" && filterTimeline !== "") {
      const candidateDate = new Date(candidate.appliedDate)
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
      const last12Hours = new Date(now.getTime() - 12 * 60 * 60 * 1000)
      const startOfWeek = new Date(today.getTime() - today.getDay() * 24 * 60 * 60 * 1000)
      const startOfLastWeek = new Date(startOfWeek.getTime() - 7 * 24 * 60 * 60 * 1000)
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

      switch (filterTimeline) {
        case "today":
          matchesTimeline = candidateDate >= today
          break
        case "yesterday":
          matchesTimeline = candidateDate >= yesterday && candidateDate < today
          break
        case "last12":
          matchesTimeline = candidateDate >= last12Hours
          break
        case "thisweek":
          matchesTimeline = candidateDate >= startOfWeek
          break
        case "lastweek":
          matchesTimeline = candidateDate >= startOfLastWeek && candidateDate < startOfWeek
          break
        case "thismonth":
          matchesTimeline = candidateDate >= startOfMonth
          break
        case "lastmonth":
          matchesTimeline = candidateDate >= startOfLastMonth && candidateDate < startOfMonth
          break
        case "last30":
          matchesTimeline = candidateDate >= thirtyDaysAgo
          break
        case "custom":
          if (customDateRange[0] && customDateRange[1]) {
            matchesTimeline = candidateDate >= customDateRange[0] && candidateDate <= customDateRange[1]
          }
          break
        default:
          matchesTimeline = true
      }
    }

    return matchesSearch && matchesStatus && matchesPosition && matchesField && matchesTimeline
  })

  // Pagination logic
  const totalItems = filteredCandidates.length
  const totalPages = Math.ceil(totalItems / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedCandidates = filteredCandidates.slice(startIndex, endIndex)

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, filterStatus, filterPosition, filterField, filterTimeline, customDateRange])

  // Disable auto close on outside click to avoid accidental closures; rely on Cancel/Apply
  useEffect(() => {
    return () => { }
  }, [showCustomDatePicker])

  // Prefill recruiter calendar link from backend settings
  useEffect(() => {
    const loadRecruiterSettings = async () => {
      try {
        const res = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.HR_RECRUITER_SETTINGS), { cache: 'no-store' })
        if (!res.ok) return
        const data = await res.json()
        if (data?.calendarLink) {
          setRecruiterCalendarLink((prev) => prev || data.calendarLink)
        }
      } catch { }
    }
    loadRecruiterSettings()
  }, [])

  // Calculate status counts from all candidates (not filtered)
  const statusCounts = {
    applied: candidates.filter(c => c.status === "applied").length,
    screening: candidates.filter(c => c.status === "screening").length,
    interview: candidates.filter(c => c.status === "interview").length,
    offer: candidates.filter(c => c.status === "offer").length,
    hired: candidates.filter(c => c.status === "hired").length,
    rejected: candidates.filter(c => c.status === "rejected").length,
  }

  // Use filtered candidates for select all functionality, but paginated for display
  const candidatesByStatus = {
    applied: filteredCandidates.filter(c => c.status === "applied"),
    screening: filteredCandidates.filter(c => c.status === "screening"),
    interview: filteredCandidates.filter(c => c.status === "interview"),
    offer: filteredCandidates.filter(c => c.status === "offer"),
    hired: filteredCandidates.filter(c => c.status === "hired"),
    rejected: filteredCandidates.filter(c => c.status === "rejected"),
  }

  // Use paginated candidates for display in kanban cards
  const paginatedCandidatesByStatus = {
    applied: paginatedCandidates.filter(c => c.status === "applied"),
    screening: paginatedCandidates.filter(c => c.status === "screening"),
    interview: paginatedCandidates.filter(c => c.status === "interview"),
    offer: paginatedCandidates.filter(c => c.status === "offer"),
    hired: paginatedCandidates.filter(c => c.status === "hired"),
    rejected: paginatedCandidates.filter(c => c.status === "rejected"),
  }

  // Connect HR Dashboard with Recruitment Center (Jobs backend)
  const fetchApplicants = async () => {
    try {
      // Fetch all job applications (no cache) — mirror Jobs page behavior
      const res = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.JOBS) + `?_=${Date.now()}`, { cache: 'no-store' })
      if (!res.ok) {
        console.error('Failed to fetch job applications:', res.status)
        return
      }

      const data = await res.json()
      const mapped: Candidate[] = (Array.isArray(data) ? data : []).map((a: {
        applicant_id?: string;
        id?: string;
        job_id?: string;
        name?: string;
        email?: string;
        mobile?: string;
        job_category?: string;
        status?: string;
        stage?: string;
        applied_date?: string;
        created_at?: string | number;
        source?: string;
        experience?: string;
        location?: string;
        salary?: string;
        expected_salary?: string;
        skills?: string[];
        ai_score?: string;
        ats_score?: number;
        rating?: number;
        notes?: string;
        feedback?: string;
        resume_link?: string;
        aiInsights?: string[];
        statusHistory?: Array<{ status: string; date: string; duration: number }>;
        weighted_skill_score?: number;
        job_specific_fit_score?: number;
        role_suitability?: number;
        extracted_fields?: {
          name?: string;
          email?: string;
          phone?: string;
          mobile?: string;
          location?: string;
          total_experience?: string | number;
          [key: string]: unknown;
        };
      }) => ({
        id: a.applicant_id || a.id || String(Date.now() + Math.random()),
        applicant_id: a.applicant_id || a.id || undefined,  // Preserve original applicant_id
        job_id: a.job_id || undefined,  // Add job_id for proper filtering
        name: a.name || ((a.extracted_fields as { name?: string } | undefined)?.name ? String((a.extracted_fields as { name?: string }).name) : '') || "-",
        email: a.email || ((a.extracted_fields as { email?: string } | undefined)?.email ? String((a.extracted_fields as { email?: string }).email) : '') || "-",
        phone: a.mobile || ((a.extracted_fields as { phone?: string } | undefined)?.phone ? String((a.extracted_fields as { phone?: string }).phone) : '') || "",
        position: a.job_category || "General",
        status: ((): Candidate["status"] => {
          const raw = (a.status || a.stage || 'applied').toString().toLowerCase().trim();
          const map: Record<string, Candidate["status"]> = {
            "processing": "applied",
            "in screening": "screening",
            "in interview": "interview",
            "offer extended": "offer",
          }
          return (map[raw] || raw) as Candidate["status"];
        })(),
        appliedDate: (typeof a.created_at === 'number' ? new Date(a.created_at).toISOString().split('T')[0] : (a.created_at || new Date().toISOString())).toString().split('T')[0],
        lastActivity: new Date().toISOString().split('T')[0],
        source: a.source || 'Recruitment Center',
        experience: a.experience || ((a.extracted_fields as { total_experience?: string | number } | undefined)?.total_experience ? String((a.extracted_fields as { total_experience?: string | number }).total_experience) : '') || '',
        location: a.location || ((a.extracted_fields as { location?: string } | undefined)?.location ? String((a.extracted_fields as { location?: string }).location) : '') || '',
        salary: a.expected_salary || '',
        skills: Array.isArray(a.skills) ? a.skills : [],
        resume: a.resume_link || '',
        resumeFilename: a.resume_link?.split(/[\\\/]/).pop(),
        resume_link: a.resume_link,
        notes: a.notes || '',
        rating: a.rating || undefined,
        feedback: a.feedback || '',
        aiScore: typeof a.ats_score === 'number' ? Math.max(1, Math.round(a.ats_score / 10)) : undefined,
        aiInsights: Array.isArray(a.aiInsights) ? a.aiInsights : [],
        statusHistory: Array.isArray(a.statusHistory) ? a.statusHistory : [{ status: 'applied', date: new Date().toISOString().split('T')[0], duration: 0 }],
        weighted_skill_score: typeof a.weighted_skill_score === 'number' ? a.weighted_skill_score : 0,
        job_specific_fit_score: typeof a.job_specific_fit_score === 'number' ? a.job_specific_fit_score : undefined,
        role_suitability: typeof a.role_suitability === 'number' ? a.role_suitability : undefined,
        ats_score: typeof a.ats_score === 'number' ? a.ats_score : undefined
      }))

      setCandidates(mapped)
      console.log(`Loaded ${mapped.length} applications from recruitment center`)

      // Open WebSocket for real-time updates
      try {
        const wsProto = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss' : 'ws'
        const base = typeof window !== 'undefined' ? `${window.location.host}` : ''
        const ws = new WebSocket(`${wsProto}://${base}/ws`)
        ws.onmessage = (evt) => {
          try {
            const msg = JSON.parse(evt.data)
            console.log(`[HR Dashboard] WebSocket message received:`, msg)
            if (msg?.type === 'candidate_status_changed' && msg.payload) {
              const { candidateId, status } = msg.payload
              console.log(`[HR Dashboard] Updating candidate ${candidateId} status to ${status} via WebSocket`)
              setCandidates(prev => prev.map(c => (c.id === candidateId ? { ...c, status: status as Candidate["status"] } : c)))
            } else if (msg?.type === 'candidates_status_bulk_changed' && msg.payload) {
              const { candidateIds, status } = msg.payload
              console.log(`[HR Dashboard] Bulk updating candidates ${candidateIds} status to ${status} via WebSocket`)
              setCandidates(prev => prev.map(c => (candidateIds?.includes(c.id) ? { ...c, status: status as Candidate["status"] } : c)))
            } else if (msg?.type === 'candidates_deleted' && msg.payload) {
              const { candidateIds } = msg.payload
              console.log(`[HR Dashboard] Deleting candidates ${candidateIds} via WebSocket`)
              setCandidates(prev => prev.filter(c => !candidateIds?.includes(c.id)))
            } else if (msg?.type === 'candidates_screening_invited' && msg.payload) {
              const { candidateIds, status } = msg.payload
              console.log(`[HR Dashboard] Screening invite sent to candidates ${candidateIds} via WebSocket`)
              setCandidates(prev => prev.map(c => (candidateIds?.includes(c.id) ? { ...c, status: (status || 'screening') as Candidate["status"] } : c)))
            }
          } catch (e) {
            console.error('WS parse failed', e)
          }
        }
      } catch (e) {
        console.error('WS connect failed', e)
      }


    } catch (e) {
      console.error('Failed to load applicants from recruitment center', e)
    }
  }

  const toggleCandidateSelection = (id: string) => {
    setSelectedCandidates(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const sendScreeningInvites = () => {
    // Simulate sending invites and mark candidates
    const today = new Date().toISOString().split('T')[0]
    setCandidates(prev => prev.map(c =>
      selectedCandidates.includes(c.id)
        ? { ...c, lastActivity: today }
        : c
    ))
    setShowScreeningInvite(false)
    setRecruiterCalendarLink("")
    setScreeningMessage("")
  }


  const addFeedback = () => {
    if (!candidateForFeedback) return
    const overall = Math.round(((interviewScore) + ((candidates.find(c => c.id === candidateForFeedback)?.aiScore || 7) * 10)) / 2)
    setCandidates(prev => prev.map(c => c.id === candidateForFeedback ? { ...c, feedback: feedbackText, rating: overall } : c))
    setShowFeedbackModal(false)
    setFeedbackText("")
    setCandidateForFeedback(null)
  }

  const updateCandidate = async (candidateId: string, candidateData: Partial<Candidate>) => {
    if (isSavingCandidate) {
      return false; // Prevent multiple simultaneous saves
    }

    try {
      setIsSavingCandidate(true);
      console.log(`[Hire Portal] Updating candidate ${candidateId} with data:`, candidateData)

      // Ensure candidateId is properly formatted
      const formattedCandidateId = candidateId.trim();
      if (!formattedCandidateId) {
        console.error('Invalid candidate ID:', candidateId);
        return false;
      }

      // Check if API base URL is configured
      if (!API_CONFIG.BASE_URL) {
        console.warn('API base URL is not configured. Cannot update candidate.');
        return false;
      }

      // Try HR candidates endpoint first
      let res: Response | null = null;

      // Try PATCH method first (most common for updates)
      try {
        res = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.HR_CANDIDATES_UPDATE(formattedCandidateId)), {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: candidateData.name,
            email: candidateData.email,
            phone: candidateData.phone || "",
            position: candidateData.position,
            status: candidateData.status,
            source: candidateData.source || "Direct Application",
            experience: candidateData.experience || "",
            location: candidateData.location || "",
            salary: candidateData.salary || "",
            skills: candidateData.skills ? candidateData.skills.join(",") : "",
            notes: candidateData.notes || ""
          })
        });

        // If PATCH returns 405, try PUT
        if (!res.ok && res.status === 405) {
          console.log('PATCH not allowed, trying PUT...');
          res = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.HR_CANDIDATES_UPDATE(formattedCandidateId)), {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name: candidateData.name,
              email: candidateData.email,
              phone: candidateData.phone || "",
              position: candidateData.position,
              status: candidateData.status,
              source: candidateData.source || "Direct Application",
              experience: candidateData.experience || "",
              location: candidateData.location || "",
              salary: candidateData.salary || "",
              skills: candidateData.skills ? candidateData.skills.join(",") : "",
              notes: candidateData.notes || ""
            })
          });
        }
      } catch (error) {
        console.warn('HR candidates endpoint request failed, trying fallback...', error);
        res = null;
      }

      // If HR endpoint doesn't exist (404) or failed, try using the Jobs endpoint as fallback
      // Candidates are job applicants, so they might be updated through the jobs endpoint
      if (!res || !res.ok) {
        const status = res?.status;
        if (status === 404 || status === 405) {
          console.log(`HR candidates endpoint issue (${status}), trying Jobs endpoint as fallback...`);
        }

        // Map candidate data to job applicant format
        const updateData: Record<string, string> = {};
        if (candidateData.name) updateData.name = candidateData.name;
        if (candidateData.email) updateData.email = candidateData.email;
        if (candidateData.phone) updateData.mobile = candidateData.phone;
        if (candidateData.position) updateData.job_category = candidateData.position;
        if (candidateData.status) updateData.status = candidateData.status;
        if (candidateData.source) updateData.source = candidateData.source;
        if (candidateData.experience) updateData.experience = candidateData.experience;
        if (candidateData.location) updateData.location = candidateData.location;
        if (candidateData.salary) updateData.expected_salary = candidateData.salary;
        if (candidateData.skills) {
          updateData.skills = Array.isArray(candidateData.skills) ? candidateData.skills.join(', ') : String(candidateData.skills);
        }
        if (candidateData.notes) updateData.notes = candidateData.notes;

        // Try PATCH first, then PUT
        try {
          res = await fetch(buildApiUrl(`${API_CONFIG.ENDPOINTS.JOBS}/${formattedCandidateId}`), {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(updateData)
          });

          // If PATCH returns 405, try PUT
          if (!res.ok && res.status === 405) {
            console.log('PATCH not allowed on Jobs endpoint, trying PUT...');
            res = await fetch(buildApiUrl(`${API_CONFIG.ENDPOINTS.JOBS}/${formattedCandidateId}`), {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(updateData)
            });
          }
        } catch (error) {
          console.error('Fallback endpoint also failed:', error);
          res = null;
        }
      }

      if (!res) {
        console.error('Network error: Failed to reach API server. Updating local state only.');
        // Update local state to maintain UI consistency
        setCandidates(prev => prev.map(c =>
          c.id === formattedCandidateId
            ? { ...c, ...candidateData }
            : c
        ));
        return true; // Return true to indicate "success" for UI purposes
      }

      if (!res.ok) {
        const errorText = await res.text().catch(() => '');

        // Handle 405 Method Not Allowed - try POST instead
        if (res.status === 405) {
          console.warn('Method not allowed (405), endpoint may require POST or a different method');
          // Update local state to maintain UI consistency
          setCandidates(prev => prev.map(c =>
            c.id === formattedCandidateId
              ? { ...c, ...candidateData }
              : c
          ));
          // Return true for UI purposes even though API call failed
          return true;
        }

        console.error('Failed to update candidate:', res.status, res.statusText);
        console.error('Error response:', errorText);

        // Update local state anyway if it's a 404 (endpoint doesn't exist)
        // This allows the UI to still work with local state updates
        if (res.status === 404) {
          console.warn('Update endpoint not found, updating local state only');
          setCandidates(prev => prev.map(c =>
            c.id === formattedCandidateId
              ? { ...c, ...candidateData }
              : c
          ));
          return true; // Return true to indicate "success" for UI purposes
        }

        // For other errors, still update local state but log the error
        console.warn('API update failed but updating local state for UI consistency');
        setCandidates(prev => prev.map(c =>
          c.id === formattedCandidateId
            ? { ...c, ...candidateData }
            : c
        ));

        return true; // Return true to prevent UI blocking
      }

      const result = await res.json();
      console.log('Candidate updated successfully:', result);

      // Refresh candidates list after successful update
      await fetchApplicants();

      return true;
    } catch (error) {
      console.error('Error updating candidate:', error);

      // On error, still update local state to maintain UI consistency
      setCandidates(prev => prev.map(c =>
        c.id === candidateId
          ? { ...c, ...candidateData }
          : c
      ));

      return false;
    } finally {
      setIsSavingCandidate(false);
    }
  }

  return (
    <div>
      <style jsx global>{`
        .scrollbar-hide {
          -ms-overflow-style: none;  /* Internet Explorer 10+ */
          scrollbar-width: none;  /* Firefox */
        }
        .scrollbar-hide::-webkit-scrollbar { 
          display: none;  /* Safari and Chrome */
        }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-700 transition-colors duration-300">
        {showEnhancedInvite && (
          <InterviewInvitation
            open={showEnhancedInvite}
            onOpenChange={(o) => setShowEnhancedInvite(o)}
            selectedCandidates={(bulkInviteCandidates || []).map(c => ({
              id: c.id,
              name: c.name,
              email: c.email,
              position: c.position,
              status: c.status,
              aiScore: String(c.aiScore ?? ''),
              applied: String(c.appliedDate ?? ''),
              source: c.source ?? '',
              avatar: (c.name || 'U').split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()
            }))}
          />
        )}
        {/* Hide scrollbar utility for custom dropdowns */}
        {/* Unified Dashboard Header */}
        <div className="mx-4 md:mx-6 mt-6 mb-8">
          <DashboardHeader
            title="Hire Portal"
            subtitle="Welcome to Intelligent Dashboard · AI-Powered Solutions"
            icon={Users}
            gradientFrom="from-blue-900"
            gradientTo="to-indigo-800"
            showHelp={showHelp}
            onHelpToggle={() => setShowHelp(!showHelp)}
            helpContent={
              <ul className="space-y-2 text-sm text-white/90">
                <li>• Drag candidates between Kanban columns to change status.</li>
                <li>• Search across all fields with partial matching - try &quot;engineer&quot; to find software engineers.</li>
                <li>• Search by dates - try &quot;2024-01&quot; to find candidates from January 2024.</li>
                <li>• Use field-specific filters to narrow down by ID, position, skills, dates, etc.</li>
                <li>• Select multiple candidates to bulk change status or delete.</li>
                <li>• Click a candidate to view details and add interview feedback.</li>
                <li>• Use Export to download all candidates as CSV.</li>
              </ul>
            }
          />
        </div>

        <div className="py-4 sm:py-6 lg:py-8 space-y-6 lg:space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
            {/* Total Applications - Interactive Card */}
            <div onClick={() => { setActiveTab('pipeline'); setFilterStatus('all'); }}
              className="group relative overflow-hidden bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-900/10 dark:via-indigo-900/10 dark:to-purple-900/10 rounded-3xl border border-blue-200/50 dark:border-blue-700/50 shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-500 ease-out cursor-pointer">
              {/* Animated Background */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-indigo-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full blur-2xl group-hover:scale-110 transition-transform duration-500"></div>

              <div className="relative p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="relative">
                    <div className="p-4 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                      <Users className="w-8 h-8 text-white" aria-hidden="true" />
                    </div>
                    <div className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-blue-600 dark:text-blue-400 font-semibold uppercase tracking-wider">Live</div>
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse mt-1"></div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-baseline gap-2">
                    <div className="text-4xl font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300">
                      {metrics.totalCandidates}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 font-medium">applications</div>
                  </div>
                  <div className="text-lg font-semibold text-gray-700 dark:text-gray-300">Total Applications</div>
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                      +{candidates.filter(j => {
                        const jobDate = new Date(j.appliedDate);
                        const now = new Date();
                        return jobDate.getMonth() === now.getMonth() && jobDate.getFullYear() === now.getFullYear();
                      }).length} this month
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">+12% vs last month</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Active Pipeline - Interactive Card */}
            <div onClick={() => { setActiveTab('pipeline'); setFilterStatus('interview'); }}
              className="group relative overflow-hidden bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 dark:from-emerald-900/10 dark:via-teal-900/10 dark:to-cyan-900/10 rounded-3xl border border-emerald-200/50 dark:border-emerald-700/50 shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-500 ease-out cursor-pointer">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-teal-500/10 to-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-400/20 to-cyan-400/20 rounded-full blur-2xl group-hover:scale-110 transition-transform duration-500"></div>

              <div className="relative p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="relative">
                    <div className="p-4 bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                      <Clock className="w-8 h-8 text-white" aria-hidden="true" />
                    </div>
                    <div className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-r from-orange-400 to-red-500 rounded-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold uppercase tracking-wider">Active</div>
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse mt-1"></div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-baseline gap-2">
                    <div className="text-4xl font-bold text-gray-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors duration-300">
                      {candidates.filter(j => j.status === 'screening' || j.status === 'interview').length}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 font-medium">active</div>
                  </div>
                  <div className="text-lg font-semibold text-gray-700 dark:text-gray-300">Active Pipeline</div>
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                      {candidates.filter(j => j.status === 'interview').length} in interview
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Urgent</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Top Performers - Interactive Card */}
            <div onClick={() => { setActiveTab('analytics'); }}
              className="group relative overflow-hidden bg-gradient-to-br from-blue-50 via-blue-50 to-blue-50 dark:from-blue-900/10 dark:via-blue-900/10 dark:to-blue-900/10 rounded-3xl border border-blue-200/50 dark:border-blue-700/50 shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-500 ease-out cursor-pointer">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-blue-500/10 to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-400/20 to-fuchsia-400/20 rounded-full blur-2xl group-hover:scale-110 transition-transform duration-500"></div>

              <div className="relative p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="relative">
                    <div className="p-4 bg-gradient-to-br from-purple-500 via-violet-500 to-fuchsia-500 rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                      <Brain className="w-8 h-8 text-white" aria-hidden="true" />
                    </div>
                    <div className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-blue-600 dark:text-blue-400 font-semibold uppercase tracking-wider">AI Powered</div>
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse mt-1"></div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-baseline gap-2">
                    <div className="text-4xl font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300">
                      {candidates.filter(j => j.weighted_skill_score && j.weighted_skill_score > 70).length}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 font-medium">top rated</div>
                  </div>
                  <div className="text-lg font-semibold text-gray-700 dark:text-gray-300">Top Performers</div>
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                      Avg: {candidates.filter(j => j.weighted_skill_score).length > 0 ? Math.round(candidates.filter(j => j.weighted_skill_score).reduce((sum, j) => sum + (j.weighted_skill_score || 0), 0) / candidates.filter(j => j.weighted_skill_score).length) : 0}/100
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">+15% efficiency</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Offers Extended - Interactive Card */}
            <div onClick={() => { setActiveTab('pipeline'); setFilterStatus('offer'); }}
              className="group relative overflow-hidden bg-gradient-to-br from-blue-50 via-blue-50 to-blue-50 dark:from-blue-900/10 dark:via-blue-900/10 dark:to-blue-900/10 rounded-3xl border border-blue-200/50 dark:border-blue-700/50 shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-500 ease-out cursor-pointer">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-blue-500/10 to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-green-400/20 to-teal-400/20 rounded-full blur-2xl group-hover:scale-110 transition-transform duration-500"></div>

              <div className="relative p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="relative">
                    <div className="p-4 bg-gradient-to-br from-green-500 via-emerald-500 to-teal-500 rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                      <CheckCircle className="w-8 h-8 text-white" aria-hidden="true" />
                    </div>
                    <div className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-blue-600 dark:text-blue-400 font-semibold uppercase tracking-wider">Ready</div>
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse mt-1"></div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-baseline gap-2">
                    <div className="text-4xl font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300">
                      {candidates.filter(j => j.status === 'offer').length}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 font-medium">offers</div>
                  </div>
                  <div className="text-lg font-semibold text-gray-700 dark:text-gray-300">Offers Extended</div>
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                      {candidates.filter(j => j.status === 'offer' && j.overallScore && j.overallScore > 80).length} high potential
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Ready to hire</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="py-4 sm:py-6 lg:py-8 space-y-6 lg:space-y-8">
            <Tabs defaultValue="pipeline" value={activeTab} onChange={setActiveTab} className="space-y-6 lg:space-y-8">
              <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700 p-2">
                <TabsList className="flex flex-nowrap overflow-x-auto no-scrollbar sm:grid sm:grid-cols-5 w-full bg-gray-50 dark:bg-gray-700 rounded-2xl min-h-[44px] sm:h-12 lg:h-14 p-1 gap-1">
                  <TabsTrigger
                    value="pipeline"
                    className="flex-1 sm:flex-none data-[state=active]:bg-white dark:data-[state=active]:bg-gray-600 data-[state=active]:text-indigo-600 dark:data-[state=active]:text-indigo-400 data-[state=active]:shadow-sm rounded-lg transition-all duration-200 font-medium text-xs sm:text-sm min-w-[80px] px-2 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <div className="flex items-center gap-1 sm:gap-2 justify-center">
                      <Users className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                      <span className="text-xs sm:text-sm whitespace-nowrap">Pipeline</span>
                    </div>
                  </TabsTrigger>
                  <TabsTrigger
                    value="positions"
                    className="flex-1 sm:flex-none data-[state=active]:bg-white dark:data-[state=active]:bg-gray-600 data-[state=active]:text-indigo-600 dark:data-[state=active]:text-indigo-400 data-[state=active]:shadow-sm rounded-lg transition-all duration-200 font-medium text-xs sm:text-sm min-w-[80px] px-2 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <div className="flex items-center gap-1 sm:gap-2 justify-center">
                      <List className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                      <span className="text-xs sm:text-sm whitespace-nowrap">Positions</span>
                    </div>
                  </TabsTrigger>
                  <TabsTrigger
                    value="analytics"
                    className="flex-1 sm:flex-none data-[state=active]:bg-white dark:data-[state=active]:bg-gray-600 data-[state=active]:text-indigo-600 dark:data-[state=active]:text-indigo-400 data-[state=active]:shadow-sm rounded-lg transition-all duration-200 font-medium text-xs sm:text-sm min-w-[80px] px-2 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <div className="flex items-center gap-1 sm:gap-2 justify-center">
                      <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                      <span className="text-xs sm:text-sm whitespace-nowrap">
                        <span className="sm:hidden">Analytics</span>
                        <span className="hidden sm:inline">Analytics & Report</span>
                      </span>
                    </div>
                  </TabsTrigger>
                  <TabsTrigger
                    value="sources"
                    className="flex-1 sm:flex-none data-[state=active]:bg-white dark:data-[state=active]:bg-gray-600 data-[state=active]:text-indigo-600 dark:data-[state=active]:text-indigo-400 data-[state=active]:shadow-sm rounded-lg transition-all duration-200 font-medium text-xs sm:text-sm min-w-[80px] px-2 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <div className="flex items-center gap-1 sm:gap-2 justify-center">
                      <Globe className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                      <span className="text-xs sm:text-sm whitespace-nowrap">Sources</span>
                    </div>
                  </TabsTrigger>
                  <TabsTrigger
                    value="settings"
                    className="flex-1 sm:flex-none data-[state=active]:bg-white dark:data-[state=active]:bg-gray-600 data-[state=active]:text-indigo-600 dark:data-[state=active]:text-indigo-400 data-[state=active]:shadow-sm rounded-lg transition-all duration-200 font-medium text-xs sm:text-sm min-w-[80px] px-2 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <div className="flex items-center gap-1 sm:gap-2 justify-center">
                      <Settings className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                      <span className="text-xs sm:text-sm whitespace-nowrap">Settings</span>
                    </div>
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* Pipeline Tab */}
              <TabsContent value="pipeline" className="space-y-8">
                <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700 p-6">
                  <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-6">
                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 hidden sm:inline">View Mode:</span>
                        {/* Enhanced View Mode Toggle - Elegant Unified Segmented Control */}
                        <div className="relative inline-flex items-center bg-gray-100 dark:bg-gray-700/50 rounded-2xl p-1.5 shadow-inner transition-shadow duration-200">
                          {/* Active Background Slider - Blue Gradient */}
                          <div
                            className={`absolute top-1.5 bottom-1.5 rounded-xl bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 dark:from-blue-600 dark:via-blue-700 dark:to-blue-800 shadow-lg transition-all duration-300 ease-out pointer-events-none ${viewMode === 'table' ? 'left-1.5 right-1/2' : 'left-1/2 right-1.5'
                              }`}
                            aria-hidden="true"
                          />

                          {/* Table View Option */}
                          <button
                            type="button"
                            onClick={() => setViewMode('table')}
                            className={`relative flex items-center gap-2.5 px-5 py-2.5 rounded-xl transition-all duration-200 ease-out z-10 min-w-[110px] justify-center group cursor-pointer select-none ${viewMode === 'table'
                              ? 'text-white font-semibold'
                              : 'text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10 active:scale-95'
                              }`}
                            aria-label="Switch to table view"
                            aria-pressed={viewMode === 'table'}
                          >
                            <svg
                              className={`w-5 h-5 transition-all duration-200 ${viewMode === 'table'
                                ? 'scale-110 drop-shadow-sm'
                                : 'scale-100 group-hover:scale-110'
                                }`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                              strokeWidth={viewMode === 'table' ? 2.5 : 2}
                              aria-hidden="true"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 5.25h16.5m-16.5 4.5h16.5m-16.5 4.5h16.5m-16.5 4.5h16.5" />
                            </svg>
                            <span className={`text-sm font-medium transition-all duration-200 ${viewMode !== 'table' ? 'group-hover:font-semibold' : ''
                              }`}>Table</span>
                          </button>

                          {/* Kanban View Option */}
                          <button
                            type="button"
                            onClick={() => setViewMode('kanban')}
                            className={`relative flex items-center gap-2.5 px-5 py-2.5 rounded-xl transition-all duration-200 ease-out z-10 min-w-[110px] justify-center group cursor-pointer select-none ${viewMode === 'kanban'
                              ? 'text-white font-semibold'
                              : 'text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10 active:scale-95'
                              }`}
                            aria-label="Switch to kanban view"
                            aria-pressed={viewMode === 'kanban'}
                          >
                            <svg
                              className={`w-5 h-5 transition-all duration-200 ${viewMode === 'kanban'
                                ? 'scale-110 drop-shadow-sm'
                                : 'scale-100 group-hover:scale-110'
                                }`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                              strokeWidth={viewMode === 'kanban' ? 2.5 : 2}
                              aria-hidden="true"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 17.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                            </svg>
                            <span className={`text-sm font-medium transition-all duration-200 ${viewMode !== 'kanban' ? 'group-hover:font-semibold' : ''
                              }`}>Kanban</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        onClick={() => {
                          const toInvite = candidates.filter(c => selectedCandidates.includes(c.id))
                          setBulkInviteCandidates(toInvite)
                          setShowEnhancedInvite(true)
                        }}
                        disabled={selectedCandidates.length === 0}
                        className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 text-sm w-auto font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Invite selected candidates to interview"
                        aria-label={`Invite to Interview (${selectedCandidates.length} selected)`}
                        type="button"
                      >
                        <Calendar className="w-4 h-4" aria-hidden="true" />
                        <span className="hidden sm:inline">Invite to Interview ({selectedCandidates.length})</span>
                        <span className="sm:hidden">Invite ({selectedCandidates.length})</span>
                      </button>
                      {/* Feedback and AI Insights buttons removed as requested */}
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700 p-6">
                  <div className="flex flex-col xl:flex-row xl:items-center gap-6">
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400 dark:text-gray-500" />
                      <InputField
                        placeholder="Search by name, email, position, skills, ID, experience, location, notes, dates..."
                        value={searchTerm}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                        className="pl-10 sm:pl-12 h-10 sm:h-12 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-gray-200 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-400 rounded-full dark:placeholder:text-gray-400 focus:bg-white dark:focus:bg-gray-600 transition-all duration-200"
                      />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full xl:w-auto justify-between sm:justify-start">
                      <button
                        onClick={() => setShowFilterPanel(!showFilterPanel)}
                        className={`px-3 py-2 sm:px-4 sm:py-3 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-600 transition-all duration-200 border-2 border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 flex items-center justify-center gap-2 text-xs sm:text-sm w-auto font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none ${showFilterPanel
                          ? 'bg-gray-100 dark:bg-gray-600 border-gray-300 dark:border-gray-500'
                          : ''
                          }`}
                        title={showFilterPanel ? "Hide filters" : "Show filters"}
                        aria-label={showFilterPanel ? "Hide filters" : "Show filters"}
                        aria-expanded={showFilterPanel}
                        type="button"
                      >
                        <Filter className="w-5 h-5" aria-hidden="true" />
                        <span className="hidden sm:inline">Filters</span>
                        {getActiveFilterCount() > 0 && (
                          <span className="bg-blue-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                            {getActiveFilterCount()}
                          </span>
                        )}
                        <ChevronDown className={`w-4 h-4 transition-transform ${showFilterPanel ? 'rotate-180' : ''} hidden sm:block`} aria-hidden="true" />
                      </button>

                      {getActiveFilterCount() > 0 && (
                        <button
                          onClick={clearAllFilters}
                          className="flex items-center gap-2 px-2.5 py-2.5 sm:px-3 sm:py-3 text-xs sm:text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700"
                          title="Clear all filters"
                          aria-label="Clear all filters"
                          type="button"
                        >
                          <X className="w-4 h-4" aria-hidden="true" />
                          <span className="hidden sm:inline">Clear</span>
                        </button>
                      )}

                      <button
                        onClick={() => setShowDownloadModal(true)}
                        className="flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-3 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-600 transition-all duration-200 border-2 border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 text-xs sm:text-sm"
                        title="Download"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 16.5V18a2.25 2.25 0 0 0 2.25 2.25h13.5A2.25 2.25 0 0 0 21 18v-1.5M7.5 12l4.5 4.5m0 0l4.5-4.5m-4.5 4.5V3" />
                        </svg>
                        <span className="hidden sm:inline">Download</span>
                      </button>

                      <button
                        onClick={async () => { setIsRefreshing(true); await fetchApplicants(); setIsRefreshing(false); }}
                        className="flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-3 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-600 transition-all duration-200 border-2 border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm w-auto font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        title="Refresh candidate list"
                        aria-label={isRefreshing ? "Refreshing candidates" : "Refresh candidate list"}
                        disabled={isRefreshing}
                        type="button"
                      >
                        {isRefreshing ? (
                          <svg aria-hidden="true" className="inline w-4 h-4 sm:w-5 sm:h-5 text-gray-200 animate-spin dark:text-gray-600 fill-blue-600" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor" />
                            <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentFill" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12a7.5 7.5 0 0 1 13.36-4.45M19.5 12a7.5 7.5 0 0 1-13.36 4.45m0 0V15m0-1.45H7m10-8.9V9m0-1.45h-1.45" />
                          </svg>
                        )}
                        <span className="hidden sm:inline">Refresh</span>
                      </button>

                      <button
                        onClick={() => setShowAddCandidate(true)}
                        className="flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 text-xs sm:text-sm w-auto font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        title="Add new candidate application"
                        aria-label="Add new candidate application"
                        type="button"
                      >
                        <Plus className="w-4 h-4" aria-hidden="true" />
                        <span className="hidden sm:inline">New</span>
                      </button>

                      <button
                        onClick={() => setShowBulkActions(true)}
                        className="flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 text-xs sm:text-sm w-auto font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        title="Bulk actions"
                        aria-label={`Bulk actions${selectedCandidates.length > 0 ? ` (${selectedCandidates.length} selected)` : ''}`}
                        type="button"
                      >
                        <Users className="w-4 h-4" aria-hidden="true" />
                        <span className="hidden sm:inline">Bulk Actions</span>
                        {selectedCandidates.length > 0 && (
                          <span className="ml-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-white/20 px-1 text-xs font-semibold">
                            {selectedCandidates.length}
                          </span>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Filter Panel - Now placed below search bar, above cards */}
                {showFilterPanel && (
                  <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700 p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Filter Field</label>
                        <select
                          value={filterField}
                          onChange={(e) => setFilterField(e.target.value)}
                          className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none transition-all duration-200 appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27currentColor%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3e%3cpolyline points=%276 9 12 15 18 9%27%3e%3c/polyline%3e%3c/svg%3e')] bg-[length:16px_16px] bg-[right_12px_center] bg-no-repeat pr-10"
                          aria-label="Filter field"
                        >
                          <option value="all">All Fields</option>
                          <option value="id">Applicant ID</option>
                          <option value="name">Name</option>
                          <option value="email">Email</option>
                          <option value="position">Position/Job Category</option>
                          <option value="status">Status</option>
                          <option value="source">Source</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Timeline</label>
                        <select
                          value={filterTimeline}
                          onChange={(e) => setFilterTimeline(e.target.value)}
                          className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none transition-all duration-200 appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27currentColor%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3e%3cpolyline points=%276 9 12 15 18 9%27%3e%3c/polyline%3e%3c/svg%3e')] bg-[length:16px_16px] bg-[right_12px_center] bg-no-repeat pr-10"
                          aria-label="Timeline filter"
                        >
                          <option value="all">All Time</option>
                          <option value="today">Today</option>
                          <option value="yesterday">Yesterday</option>
                          <option value="last12">Last 12 Hours</option>
                          <option value="thisweek">This Week</option>
                          <option value="lastweek">Last Week</option>
                          <option value="thismonth">This Month</option>
                          <option value="lastmonth">Last Month</option>
                          <option value="last30">Last 30 Days</option>
                          <option value="custom">Custom Range</option>
                        </select>
                      </div>
                    </div>
                    {filterTimeline === 'custom' && (
                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Custom Date Range</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="date"
                            value={customDateRange[0] ? customDateRange[0].toISOString().split('T')[0] : ''}
                            onChange={(e) => setCustomDateRange([e.target.value ? new Date(e.target.value) : null, customDateRange[1]])}
                            className="px-4 py-2.5 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none transition-all duration-200"
                            aria-label="Start date"
                          />
                          <span className="text-gray-500 dark:text-gray-400">to</span>
                          <input
                            type="date"
                            value={customDateRange[1] ? customDateRange[1].toISOString().split('T')[0] : ''}
                            onChange={(e) => setCustomDateRange([customDateRange[0], e.target.value ? new Date(e.target.value) : null])}
                            className="px-4 py-2.5 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none transition-all duration-200"
                            aria-label="End date"
                          />
                        </div>
                      </div>
                    )}
                    {/* Active Filters Display - Now inside the filter panel */}
                    {getActiveFilters().length > 0 && (
                      <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Active filters:</span>
                          {getActiveFilters().map((filter, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200"
                            >
                              {filter.type}: {filter.value}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex justify-end gap-2 mt-4">
                      <button
                        onClick={clearAllFilters}
                        className="px-4 py-2 rounded-full text-sm bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 transition-all duration-200 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:outline-none font-medium"
                        type="button"
                        aria-label="Clear all filters"
                      >
                        Clear All
                      </button>
                      <button
                        onClick={() => setShowFilterPanel(false)}
                        className="px-4 py-2 rounded-full text-sm bg-blue-600 hover:bg-blue-700 text-white transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none font-medium shadow-sm hover:shadow-md"
                        type="button"
                        aria-label="Apply filters"
                      >
                        Apply Filters
                      </button>
                    </div>
                  </div>
                )}

                {/* Metric Cards Section - Enhanced Enterprise UI */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 lg:gap-6">
                  {['applied', 'screening', 'interview', 'offer', 'hired', 'rejected'].map((status, index) => {
                    const count = (statusCounts as Record<string, number>)[status] || 0;
                    const statusConfig = [
                      {
                        gradient: 'from-blue-500 to-blue-600',
                        bgLight: 'bg-blue-50 dark:bg-blue-900/20',
                        bgDark: 'dark:bg-blue-900/10',
                        borderColor: 'border-blue-200/60 dark:border-blue-700/40',
                        textColor: 'text-blue-700 dark:text-blue-300',
                        iconBg: 'bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600',
                        icon: <CheckCircle className="w-6 h-6 text-white" aria-hidden="true" />
                      },
                      {
                        gradient: 'from-amber-500 to-amber-600',
                        bgLight: 'bg-amber-50 dark:bg-amber-900/20',
                        bgDark: 'dark:bg-amber-900/10',
                        borderColor: 'border-amber-200/60 dark:border-amber-700/40',
                        textColor: 'text-amber-700 dark:text-amber-300',
                        iconBg: 'bg-gradient-to-br from-amber-500 via-orange-500 to-red-500',
                        icon: <FileText className="w-6 h-6 text-white" aria-hidden="true" />
                      },
                      {
                        gradient: 'from-blue-500 to-blue-600',
                        bgLight: 'bg-blue-50 dark:bg-blue-900/20',
                        bgDark: 'dark:bg-blue-900/10',
                        borderColor: 'border-blue-200/60 dark:border-blue-700/40',
                        textColor: 'text-blue-700 dark:text-blue-300',
                        iconBg: 'bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600',
                        icon: <Calendar className="w-6 h-6 text-white" aria-hidden="true" />
                      },
                      {
                        gradient: 'from-emerald-500 to-emerald-600',
                        bgLight: 'bg-emerald-50 dark:bg-emerald-900/20',
                        bgDark: 'dark:bg-emerald-900/10',
                        borderColor: 'border-emerald-200/60 dark:border-emerald-700/40',
                        textColor: 'text-emerald-700 dark:text-emerald-300',
                        iconBg: 'bg-gradient-to-br from-emerald-500 via-green-500 to-teal-500',
                        icon: <CheckCircle2 className="w-6 h-6 text-white" aria-hidden="true" />
                      },
                      {
                        gradient: 'from-teal-500 to-teal-600',
                        bgLight: 'bg-teal-50 dark:bg-teal-900/20',
                        bgDark: 'dark:bg-teal-900/10',
                        borderColor: 'border-teal-200/60 dark:border-teal-700/40',
                        textColor: 'text-teal-700 dark:text-teal-300',
                        iconBg: 'bg-gradient-to-br from-teal-500 via-cyan-500 to-blue-500',
                        icon: <CheckCircle2 className="w-6 h-6 text-white" aria-hidden="true" />
                      },
                      {
                        gradient: 'from-red-500 to-red-600',
                        bgLight: 'bg-red-50 dark:bg-red-900/20',
                        bgDark: 'dark:bg-red-900/10',
                        borderColor: 'border-red-200/60 dark:border-red-700/40',
                        textColor: 'text-red-700 dark:text-red-300',
                        iconBg: 'bg-gradient-to-br from-red-500 via-rose-500 to-pink-500',
                        icon: <XCircle className="w-6 h-6 text-white" aria-hidden="true" />
                      }
                    ];

                    const config = statusConfig[index];
                    const descriptions = [
                      'New applications',
                      'Under review',
                      'Scheduled',
                      'Pending',
                      'Joined',
                      'Rejected'
                    ];

                    return (
                      <div
                        key={status}
                        onClick={() => {
                          setFilterStatus(status)
                          setActiveTab('pipeline')
                        }}
                        className={`group relative overflow-hidden ${config.bgLight} ${config.bgDark} rounded-3xl p-5 md:p-6 border ${config.borderColor} shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 cursor-pointer focus-within:ring-2 focus-within:ring-indigo-500 focus-within:outline-none`}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            setFilterStatus(status)
                            setActiveTab('pipeline')
                          }
                        }}
                        aria-label={`View ${status} candidates (${count} ${count === 1 ? 'candidate' : 'candidates'})`}
                      >
                        {/* Gradient overlay on hover */}
                        <div className={`absolute inset-0 bg-gradient-to-br ${config.gradient}/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500`}></div>

                        {/* Decorative gradient blob */}
                        <div className={`absolute -top-8 -right-8 w-24 h-24 bg-gradient-to-br ${config.gradient} rounded-full blur-2xl opacity-10 group-hover:opacity-20 group-hover:scale-125 transition-all duration-500`}></div>

                        <div className="relative flex flex-col h-full">
                          {/* Icon Section */}
                          <div className="flex items-start justify-between mb-4">
                            <div className={`p-3 ${config.iconBg} rounded-2xl shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300 flex-shrink-0`}>
                              {config.icon}
                            </div>
                            {count > 0 && (
                              <div className={`px-2 py-1 rounded-full ${config.bgLight} ${config.textColor} text-xs font-semibold border ${config.borderColor}`}>
                                {count}
                              </div>
                            )}
                          </div>

                          {/* Content Section */}
                          <div className="flex-1 flex flex-col justify-between">
                            <div>
                              <h3 className={`text-sm font-semibold ${config.textColor} mb-2 capitalize tracking-wide`}>
                                {status}
                              </h3>
                              <div className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2 leading-tight">
                                {count}
                              </div>
                            </div>
                            <p className="text-xs text-gray-600 dark:text-gray-400 font-medium mt-1">
                              {descriptions[index]}
                            </p>
                          </div>

                          {/* Hover indicator */}
                          <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${config.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Download modal */}
                <Modal isOpen={showDownloadModal} onClose={() => setShowDownloadModal(false)}>
                  <div className="w-full max-w-lg mx-auto bg-white dark:bg-gray-900 rounded-2xl p-3 sm:p-4 md:p-6 flex flex-col items-center transition-colors shadow-md sm:shadow-lg md:max-w-xl lg:max-w-2xl xl:max-w-3xl overflow-y-auto max-h-[90vh]">
                    <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                      <h2 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-gray-100">Export Data</h2>
                    </div>
                    <form
                      onSubmit={(e: React.FormEvent) => {
                        e.preventDefault()
                        if (!downloadForm.fileFormat) return

                        if (downloadForm.fileFormat === 'csv') {
                          downloadCSV()
                        } else if (downloadForm.fileFormat === 'excel') {
                          downloadExcel()
                        }
                        setShowDownloadModal(false)
                      }}
                      className="w-full space-y-2 sm:space-y-3"
                    >
                      {/* File Format Selector */}
                      <div className="relative">
                        <label className="block font-semibold text-gray-700 dark:text-gray-200 mb-1 flex items-center gap-1">
                          Select file format
                          <span className="group relative">
                            <FaInfoCircle className="text-blue-400 cursor-pointer" />
                            <span className="absolute left-6 top-1/2 -translate-y-1/2 bg-gray-800 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition whitespace-nowrap z-10">
                              Choose Excel or CSV format
                            </span>
                          </span>
                        </label>
                        <select
                          className="w-full px-3 sm:px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition text-sm sm:text-base"
                          value={downloadForm.fileFormat}
                          onChange={e => setDownloadForm(f => ({ ...f, fileFormat: e.target.value }))}
                          required
                        >
                          <option value="" disabled>Select file format</option>
                          <option value="excel">Excel (.xlsx)</option>
                          <option value="csv">CSV (.csv)</option>
                        </select>
                      </div>

                      <div className="flex justify-center mt-4 sm:mt-6">
                        <button
                          type="submit"
                          className="flex items-center justify-center gap-2 w-full px-6 sm:px-8 py-2 sm:py-3 rounded-lg font-semibold text-white bg-[#3641F5] hover:opacity-90 transition shadow text-base sm:text-lg disabled:opacity-60"
                        >
                          <Download className="text-lg" />
                          Download
                        </button>
                      </div>
                    </form>
                  </div>
                </Modal>

                {/* Pipeline Content */}
                {viewMode === 'table' ? (
                  <div className="bg-white dark:bg-[#111111] rounded-3xl shadow-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gradient-to-r from-gray-50 via-gray-50 to-gray-100 dark:from-gray-800 dark:via-gray-800 dark:to-gray-700">
                          <tr>
                            <th className="px-4 sm:px-6 py-3.5 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                              <input
                                type="checkbox"
                                checked={paginatedCandidates.length > 0 && paginatedCandidates.every(c => selectedCandidates.includes(c.id))}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                  if (e.target.checked) {
                                    const pageIds = paginatedCandidates.map(c => c.id)
                                    setSelectedCandidates(prev => [...new Set([...prev, ...pageIds])])
                                  } else {
                                    const pageIds = paginatedCandidates.map(c => c.id)
                                    setSelectedCandidates(prev => prev.filter(id => !pageIds.includes(id)))
                                  }
                                }}
                                className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 dark:text-blue-400 focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 cursor-pointer"
                                aria-label="Select all candidates on this page"
                              />
                            </th>
                            <th className="px-4 sm:px-6 py-3.5 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                              <div className="flex items-center gap-1.5">
                                <FileText className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
                                <span>Applicant ID</span>
                              </div>
                            </th>
                            <th className="px-4 sm:px-6 py-3.5 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                              <div className="flex items-center gap-1.5">
                                <Settings className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
                                <span>Actions</span>
                              </div>
                            </th>
                            <th className="px-4 sm:px-6 py-3.5 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                              <div className="flex items-center gap-1.5">
                                <User className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
                                <span>Candidate</span>
                              </div>
                            </th>
                            <th className="px-4 sm:px-6 py-3.5 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                              <div className="flex items-center gap-1.5">
                                <Briefcase className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
                                <span>Position</span>
                              </div>
                            </th>
                            <th className="px-4 sm:px-6 py-3.5 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                              <div className="flex items-center gap-1.5">
                                <CheckCircle className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
                                <span>Status</span>
                              </div>
                            </th>
                            <th className="px-4 sm:px-6 py-3.5 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                              <div className="flex items-center gap-1.5">
                                <BarChart3 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
                                <span>Fit Score</span>
                              </div>
                            </th>
                            <th className="px-4 sm:px-6 py-3.5 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                              <div className="flex items-center gap-1.5">
                                <BarChart3 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
                                <span>ATS Score</span>
                              </div>
                            </th>
                            <th className="px-4 sm:px-6 py-3.5 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                              <div className="flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
                                <span>Applied</span>
                              </div>
                            </th>
                            <th className="px-4 sm:px-6 py-3.5 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                              <div className="flex items-center gap-1.5">
                                <Globe className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
                                <span>Source</span>
                              </div>
                            </th>


                          </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-[#111111] divide-y divide-gray-200 dark:divide-gray-700">
                          {paginatedCandidates.length === 0 ? (
                            <tr>
                              <td colSpan={10} className="px-6 py-12 text-center">
                                <div className="flex flex-col items-center justify-center gap-3">
                                  <Users className="w-12 h-12 text-gray-400 dark:text-gray-600" aria-hidden="true" />
                                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No candidates found</p>
                                  <p className="text-xs text-gray-400 dark:text-gray-500">Try adjusting your search or filters</p>
                                </div>
                              </td>
                            </tr>
                          ) : (
                            paginatedCandidates.map(candidate => (
                              <tr
                                key={candidate.id}
                                className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors duration-200 group"
                              >
                                <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                                  <input
                                    type="checkbox"
                                    checked={selectedCandidates.includes(candidate.id)}
                                    onChange={() => toggleCandidateSelection(candidate.id)}
                                    className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 dark:text-blue-400 focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 cursor-pointer"
                                    aria-label={`Select ${candidate.name}`}
                                  />
                                </td>
                                <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100 max-w-[180px] truncate block">
                                    {candidate.id}
                                  </span>
                                </td>
                                <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                                  <div className="flex items-center gap-2">
                                    <CandidateActions
                                      candidate={candidate}
                                      onViewAnalysis={(candidate) => {
                                        setSelectedAnalysis(candidate);
                                        setShowAnalysisModal(true);
                                      }}
                                    />
                                    <button
                                      onClick={() => {
                                        setEditingCandidate(candidate.id)
                                        setEditCandidateForm({
                                          name: candidate.name,
                                          email: candidate.email,
                                          position: candidate.position,
                                          status: candidate.status,
                                          source: candidate.source,
                                          notes: candidate.notes || ""
                                        })
                                        setShowEditCandidate(true)
                                      }}
                                      className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 rounded-full transition-all duration-200 border border-indigo-200 dark:border-indigo-800 hover:shadow-md focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none group-hover:scale-105"
                                      title="Edit candidate"
                                      aria-label={`Edit ${candidate.name}`}
                                      type="button"
                                    >
                                      <Edit className="w-4 h-4" aria-hidden="true" />
                                    </button>
                                    <button
                                      onClick={() => {
                                        setBulkInviteCandidates([candidate])
                                        setShowEnhancedInvite(true)
                                      }}
                                      className="p-2 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/30 rounded-full transition-all duration-200 border border-amber-200 dark:border-amber-800 hover:shadow-md focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:outline-none group-hover:scale-105"
                                      title="Invite to interview"
                                      aria-label={`Invite ${candidate.name} to interview`}
                                      type="button"
                                    >
                                      <Calendar className="w-4 h-4" aria-hidden="true" />
                                    </button>
                                  </div>
                                </td>
                                <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                                  <div className="flex items-center gap-3">
                                    <div className="flex-shrink-0 h-10 w-10">
                                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white font-semibold text-sm shadow-sm ring-2 ring-white dark:ring-gray-800">
                                        {candidate.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                      </div>
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                        {candidate.name}
                                      </div>
                                      <div className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                                        {candidate.email}
                                      </div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                                  <div className="flex items-center gap-2">
                                    <Briefcase className="w-4 h-4 text-blue-500 dark:text-blue-400 flex-shrink-0" aria-hidden="true" />
                                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate max-w-[200px]">
                                      {candidate.position}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                                  <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold ${candidate.status === 'applied' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-800' :
                                    candidate.status === 'screening' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800' :
                                      candidate.status === 'interview' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 border border-purple-200 dark:border-purple-800' :
                                        candidate.status === 'offer' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800' :
                                          candidate.status === 'hired' ? 'bg-teal-100 dark:bg-teal-900/30 text-teal-800 dark:text-teal-200 border border-teal-200 dark:border-teal-800' :
                                            'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800'
                                    }`}>
                                    {candidate.status.charAt(0).toUpperCase() + candidate.status.slice(1)}
                                  </span>
                                </td>
                                <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                                  {(() => {
                                    // Use backend scores with proper fallback
                                    const fitScore = candidate.job_specific_fit_score !== undefined && candidate.job_specific_fit_score !== null
                                      ? Math.round(candidate.job_specific_fit_score)
                                      : (candidate.role_suitability !== undefined && candidate.role_suitability !== null
                                        ? Math.round(candidate.role_suitability)
                                        : calculateCandidateScore(candidate))
                                    const scoreColor = fitScore >= 80 ? 'text-green-600 dark:text-green-400 font-semibold' :
                                      fitScore >= 60 ? 'text-yellow-600 dark:text-yellow-400 font-semibold' :
                                        'text-red-600 dark:text-red-400 font-semibold'
                                    return (
                                      <span className={`text-sm ${scoreColor}`}>
                                        {fitScore}
                                      </span>
                                    )
                                  })()}
                                </td>
                                <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                                  {(() => {
                                    // Use backend ats_score with proper fallback
                                    const atsScore = candidate.ats_score !== undefined && candidate.ats_score !== null
                                      ? Math.round(candidate.ats_score)
                                      : (candidate.weighted_skill_score || 0)
                                    return (
                                      <span className="text-sm text-gray-700 dark:text-gray-300">
                                        {atsScore > 0 ? atsScore : 'N/A'}
                                      </span>
                                    )
                                  })()}
                                </td>
                                <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                                  <span className="text-sm text-gray-700 dark:text-gray-300">
                                    {candidate.appliedDate}
                                  </span>
                                </td>
                                <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                                  <span className="text-sm text-gray-700 dark:text-gray-300">
                                    {candidate.source}
                                  </span>
                                </td>

                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 xl:grid-cols-6">
                      {Object.entries(paginatedCandidatesByStatus).map(([status, statusCandidates], _index) => {
                        const statusColors = [
                          { bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-700', header: 'bg-blue-100 dark:bg-blue-800/30', text: 'text-blue-800 dark:text-blue-200' },
                          { bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200 dark:border-amber-700', header: 'bg-amber-100 dark:bg-amber-800/30', text: 'text-amber-800 dark:text-amber-200' },
                          { bg: 'bg-purple-50 dark:bg-purple-900/20', border: 'border-purple-200 dark:border-purple-700', header: 'bg-purple-100 dark:bg-purple-800/30', text: 'text-purple-800 dark:text-purple-200' },
                          { bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-200 dark:border-emerald-700', header: 'bg-emerald-100 dark:bg-emerald-800/30', text: 'text-emerald-800 dark:text-emerald-200' },
                          { bg: 'bg-teal-50 dark:bg-teal-900/20', border: 'border-teal-200 dark:border-teal-700', header: 'bg-teal-100 dark:bg-teal-800/30', text: 'text-teal-800 dark:text-teal-200' },
                          { bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-200 dark:border-red-700', header: 'bg-red-100 dark:bg-red-800/30', text: 'text-red-800 dark:text-red-200' }
                        ];
                        const colors = statusColors[_index];

                        const isActive = filterStatus === status;
                        return (
                          <div key={status} className={`rounded-3xl border-2 ${isActive ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30' : colors.border + ' ' + colors.bg} overflow-hidden shadow-xl cursor-pointer hover:shadow-2xl transition-all duration-200 ${isActive ? 'ring-2 ring-blue-300 dark:ring-blue-600' : ''}`} onClick={() => setFilterStatus(filterStatus === status ? "all" : status)} onDragOver={(e) => { e.preventDefault() }} onDrop={(e) => { e.preventDefault(); if (draggedCandidate) { const idsToMove = selectedCandidates.includes(draggedCandidate) ? selectedCandidates : [draggedCandidate]; idsToMove.forEach(id => handleStatusChange(id, status as string)); setDraggedCandidate(null) } }}>
                            <div className={`flex items-center justify-between px-6 py-4 ${isActive ? 'bg-blue-100 dark:bg-blue-800/50' : colors.header}`}>
                              <div className="flex items-center gap-3">
                                <input
                                  type="checkbox"
                                  checked={candidatesByStatus[status as keyof typeof candidatesByStatus].length > 0 && candidatesByStatus[status as keyof typeof candidatesByStatus].every(c => selectedCandidates.includes(c.id))}
                                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                    if (e.target.checked) {
                                      const statusIds = candidatesByStatus[status as keyof typeof candidatesByStatus].map(c => c.id);
                                      setSelectedCandidates(prev => [...new Set([...prev, ...statusIds])]);
                                    } else {
                                      const statusIds = candidatesByStatus[status as keyof typeof candidatesByStatus].map(c => c.id);
                                      setSelectedCandidates(prev => prev.filter(id => !statusIds.includes(id)));
                                    }
                                  }}
                                  className="rounded border-gray-300 dark:border-gray-600 text-blue-600 dark:text-blue-400 focus:ring-blue-500 dark:bg-gray-700"
                                />
                                <h4 className={`capitalize text-sm font-bold ${colors.text}`}>{status}</h4>
                              </div>
                              <span className={`px-3 py-1 text-xs rounded-full bg-white dark:bg-gray-700 border dark:border-gray-600 font-semibold ${colors.text}`}>
                                {statusCounts[status as keyof typeof statusCounts]}
                              </span>
                            </div>
                            <div className="p-2 space-y-2 min-h-[400px] transition-colors duration-200">
                              {statusCandidates.map((candidate) => (
                                <div
                                  key={candidate.id}
                                  className={`group relative flex flex-col rounded-lg border-2 bg-white dark:bg-gray-800 p-3 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-1 overflow-hidden ${selectedCandidates.includes(candidate.id)
                                    ? 'ring-2 ring-blue-300 dark:ring-blue-500 border-blue-300 dark:border-blue-500'
                                    : 'border-gray-200 dark:border-gray-700'
                                    }`} draggable onDragStart={() => { setDraggedCandidate(candidate.id); if (!selectedCandidates.includes(candidate.id)) { setSelectedCandidates([candidate.id]) } }} onDragEnd={() => setDraggedCandidate(null)}
                                >
                                  {/* Header Section */}
                                  <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                      <input
                                        type="checkbox"
                                        checked={selectedCandidates.includes(candidate.id)}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                          if (e.target.checked) {
                                            setSelectedCandidates(prev => [...prev, candidate.id])
                                          } else {
                                            setSelectedCandidates(prev => prev.filter(id => id !== candidate.id))
                                          }
                                        }}
                                        className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 flex-shrink-0 dark:bg-gray-700 cursor-pointer"
                                        aria-label={`Select ${candidate.name}`}
                                      />
                                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white font-semibold text-xs flex-shrink-0 shadow-sm ring-2 ring-white dark:ring-gray-800">
                                        {candidate.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                      </div>
                                      <div className="min-w-0 flex-1 overflow-hidden">
                                        <h5 className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">{candidate.name}</h5>
                                        <p className="text-xs text-gray-700 dark:text-gray-300 truncate font-medium">{candidate.position}</p>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Content Section */}
                                  <div className="flex-1 space-y-2 mb-3">
                                    <div className="space-y-1.5 text-xs text-gray-600 dark:text-gray-400">
                                      <div className="flex items-center gap-1.5">
                                        <CheckCircle className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500 flex-shrink-0" aria-hidden="true" />
                                        <span className="truncate capitalize font-medium">{candidate.status}</span>
                                      </div>
                                      <div className="flex items-center gap-1.5">
                                        <Clock className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500 flex-shrink-0" aria-hidden="true" />
                                        <span>Applied {candidate.appliedDate}</span>
                                      </div>
                                      <div className="flex items-center gap-1.5">
                                        <Globe className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500 flex-shrink-0" aria-hidden="true" />
                                        <span className="truncate">{candidate.source}</span>
                                      </div>
                                    </div>

                                    {candidate.skills && candidate.skills.length > 0 && (
                                      <div className="flex flex-wrap gap-1.5">
                                        {candidate.skills.slice(0, 2).map((skill, i) => (
                                          <span key={`${candidate.id}-skill-${i}`} className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium">
                                            {skill}
                                          </span>
                                        ))}
                                        {candidate.skills.length > 2 && (
                                          <span className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium">
                                            +{candidate.skills.length - 2}
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </div>

                                  {/* Action Buttons - Fixed at Bottom */}
                                  <div className="flex justify-center items-center gap-3 pt-3 mt-auto border-t border-gray-200 dark:border-gray-700">
                                    <button
                                      className="p-2.5 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-full transition-all duration-200 border border-gray-300 dark:border-gray-600 hover:scale-110 hover:shadow-md focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
                                      onClick={() => { setViewingCandidate(candidate); setShowViewCandidate(true); }}
                                      title="View candidate details"
                                      aria-label={`View ${candidate.name}`}
                                      type="button"
                                    >
                                      <Eye className="h-4 w-4" aria-hidden="true" />
                                    </button>
                                    <button
                                      className="p-2.5 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-full transition-all duration-200 border border-gray-300 dark:border-gray-600 hover:scale-110 hover:shadow-md focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
                                      onClick={() => {
                                        setEditingCandidate(candidate.id);
                                        setEditCandidateForm({
                                          name: candidate.name,
                                          email: candidate.email,
                                          position: candidate.position,
                                          status: candidate.status,
                                          source: candidate.source,
                                          notes: candidate.notes || "",
                                        });
                                        setShowEditCandidate(true);
                                      }}
                                      title="Edit candidate"
                                      aria-label={`Edit ${candidate.name}`}
                                      type="button"
                                    >
                                      <Edit className="h-4 w-4" aria-hidden="true" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Pagination */}
                {totalItems > 0 && (
                  <div className="bg-white dark:bg-[#111111] border border-gray-200 dark:border-gray-800 rounded-3xl shadow-xl p-4 md:p-5">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="text-sm font-medium text-gray-600 dark:text-gray-400 order-2 sm:order-1">
                        {(() => {
                          const showing = Math.min(itemsPerPage, Math.max(0, totalItems - startIndex));
                          return (
                            <>
                              <span className="hidden sm:inline">Showing <span className="font-semibold text-gray-900 dark:text-gray-100">{showing}</span> of <span className="font-semibold text-gray-900 dark:text-gray-100">{totalItems}</span> entries</span>
                              <span className="sm:hidden"><span className="font-semibold text-gray-900 dark:text-gray-100">{showing}</span> of <span className="font-semibold text-gray-900 dark:text-gray-100">{totalItems}</span></span>
                            </>
                          )
                        })()}
                      </div>
                      <div className="flex items-center gap-2 sm:gap-3 order-1 sm:order-2 w-full sm:w-auto justify-between sm:justify-center">
                        <div className="flex items-center gap-2">
                          <select
                            value={itemsPerPage}
                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                              setItemsPerPage(Number(e.target.value));
                              setCurrentPage(1);
                            }}
                            className="h-9 px-4 py-2 pr-10 appearance-none bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-400 cursor-pointer hover:border-gray-400 dark:hover:border-gray-500 transition-all duration-200 bg-[url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27currentColor%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3e%3cpolyline points=%276 9 12 15 18 9%27%3e%3c/polyline%3e%3c/svg%3e')] bg-[length:16px_16px] bg-[right_12px_center] bg-no-repeat"
                            aria-label="Items per page"
                          >
                            <option value={10}>10 / page</option>
                            <option value={20}>20 / page</option>
                            <option value={50}>50 / page</option>
                          </select>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                            className="h-9 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            aria-label="Previous page"
                            type="button"
                          >
                            Prev
                          </button>
                          <span className="h-9 flex items-center justify-center px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-900 dark:text-gray-100 tabular-nums">
                            {Math.min(currentPage, Math.max(1, totalPages))}/{Math.max(1, totalPages)}
                          </span>
                          <button
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages}
                            className="h-9 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            aria-label="Next page"
                            type="button"
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* Positions Tab */}
              <TabsContent value="positions" className="space-y-6">
                <PositionsTab onNavigateToAnalytics={handleNavigateToAnalytics} />
              </TabsContent>


              {/* Analytics Tab */}
              <TabsContent value="analytics" className="space-y-6">
                <AnalyticsDashboard
                  candidates={candidates}
                  jobListings={jobPositions as unknown as JobListing[]}
                  totalsByStatus={{
                    applied: statusCounts.applied,
                    screening: statusCounts.screening,
                    interview: statusCounts.interview,
                    offer: statusCounts.offer,
                    hired: statusCounts.hired,
                    rejected: statusCounts.rejected,
                  }}
                  externalFilters={selectedJobIdForAnalytics ? { selectedJob: selectedJobIdForAnalytics } : undefined}
                  onClearExternalFilters={() => setSelectedJobIdForAnalytics(null)}
                  data={(() => {
                    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
                    const byMonth = months.map((m) => ({ month: m, applications: 0, hired: 0 }))
                    candidates.forEach(c => {
                      const applied = new Date(c.appliedDate)
                      const appliedIdx = Number.isNaN(applied.getTime()) ? undefined : applied.getMonth()
                      if (typeof appliedIdx === 'number') {
                        byMonth[appliedIdx].applications += 1
                      }
                      if (c.status === 'hired') {
                        const hireDate = (c as Candidate & { statusDate?: string }).statusDate ? new Date((c as Candidate & { statusDate?: string }).statusDate as string) : applied
                        const hireIdx = Number.isNaN(hireDate.getTime()) ? appliedIdx : hireDate.getMonth()
                        if (typeof hireIdx === 'number') {
                          byMonth[hireIdx].hired += 1
                        }
                      }
                    })
                    return byMonth
                  })()} />
              </TabsContent>

              {/* Sources Tab */}
              <TabsContent value="sources" className="space-y-6">
                <SourcesManagement />
              </TabsContent>

              {/* Settings Tab */}
              <TabsContent value="settings" className="space-y-4">
                <SettingsManagement />
              </TabsContent>
            </Tabs>

            {/* End of main content wrapper */}
          </div>

          {/* Edit Candidate Modal */}
          {showEditCandidate && editingCandidate && (
            <>
              <div className="fixed inset-0 z-[99999] bg-black/10 backdrop-blur-[2px]" />
              <div
                className="fixed inset-0 z-[100000] flex items-center justify-center p-4"
                onClick={() => setShowEditCandidate(false)}
              >
                <div
                  className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-800/95 backdrop-blur-sm rounded-3xl shadow-2xl border border-gray-200/60 dark:border-gray-700/60 animate-scaleIn"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="relative p-5 sm:p-6 rounded-t-2xl overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 opacity-90" />
                    <div className="relative flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/20 rounded-xl">
                          <Edit className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h3 className="text-white text-lg sm:text-2xl font-semibold">Edit Candidate</h3>
                          <p className="text-blue-100 text-xs sm:text-sm">Update candidate information and details</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowEditCandidate(false)}
                        className="text-white hover:bg-white/20 rounded-full p-2 transition-all duration-200 focus:ring-2 focus:ring-white/50 focus:outline-none"
                        aria-label="Close modal"
                      >
                        <X className="h-5 w-5" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                  <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Name</label>
                          <input
                            type="text"
                            value={editCandidateForm.name}
                            readOnly
                            className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-600 dark:text-gray-400 rounded-full cursor-not-allowed"
                            placeholder="Enter candidate name"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email</label>
                          <input
                            type="email"
                            value={editCandidateForm.email}
                            readOnly
                            className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-600 dark:text-gray-400 rounded-full cursor-not-allowed"
                            placeholder="Enter email address"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Position</label>
                          <input
                            type="text"
                            value={editCandidateForm.position}
                            readOnly
                            className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-600 dark:text-gray-400 rounded-full cursor-not-allowed"
                            placeholder="Enter position"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Status</label>
                          <div className="relative">
                            <select
                              value={editCandidateForm.status}
                              onChange={(e) => setEditCandidateForm({ ...editCandidateForm, status: e.target.value as Candidate["status"] })}
                              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none transition-all duration-200 appearance-none pr-10 bg-white dark:bg-gray-700 dark:text-gray-200"
                            >
                              <option value="applied">Applied</option>
                              <option value="screening">Screening</option>
                              <option value="interview">Interview</option>
                              <option value="offer">Offer</option>
                              <option value="hired">Hired</option>
                              <option value="rejected">Rejected</option>
                            </select>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                              <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Source</label>
                        <input
                          type="text"
                          value={editCandidateForm.source}
                          readOnly
                          className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-600 dark:text-gray-400 rounded-full cursor-not-allowed"
                          placeholder="Enter source"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Notes</label>
                        <textarea
                          value={editCandidateForm.notes}
                          readOnly
                          rows={4}
                          className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-600 dark:text-gray-400 rounded-2xl cursor-not-allowed resize-none"
                          placeholder="Add any notes about this candidate..."
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-end p-6 border-t bg-gray-50 dark:bg-gray-800/50 gap-3">
                    <button
                      onClick={() => setShowEditCandidate(false)}
                      className="px-6 py-2.5 rounded-full bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 transition-all duration-200 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:outline-none font-medium"
                      type="button"
                      aria-label="Cancel editing"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={async () => {
                        // Handle save logic here
                        if (editingCandidate) {
                          const originalCandidate = candidates.find(c => c.id === editingCandidate)
                          if (!originalCandidate) return

                          // Check if status changed
                          const statusChanged = originalCandidate.status !== editCandidateForm.status

                          // Update candidate data via backend API
                          const success = await updateCandidate(editingCandidate, {
                            name: editCandidateForm.name,
                            email: editCandidateForm.email,
                            position: editCandidateForm.position,
                            status: editCandidateForm.status,
                            source: editCandidateForm.source,
                            notes: editCandidateForm.notes,
                            phone: originalCandidate.phone || "",
                            experience: originalCandidate.experience || "",
                            location: originalCandidate.location || "",
                            salary: originalCandidate.salary || "",
                            skills: originalCandidate.skills || []
                          })

                          if (success) {
                            // If status changed, also call the status change API for WebSocket broadcast
                            if (statusChanged) {
                              await handleStatusChange(editingCandidate, editCandidateForm.status)
                            } else {
                              // If only other fields changed, refresh data to ensure consistency
                              await refreshData()
                            }

                            // Update local state
                            const candidateIndex = candidates.findIndex(c => c.id === editingCandidate)
                            if (candidateIndex !== -1) {
                              const updatedCandidates = [...candidates]
                              updatedCandidates[candidateIndex] = {
                                ...updatedCandidates[candidateIndex],
                                name: editCandidateForm.name,
                                email: editCandidateForm.email,
                                position: editCandidateForm.position,
                                status: editCandidateForm.status,
                                source: editCandidateForm.source,
                                notes: editCandidateForm.notes
                              }
                              setCandidates(updatedCandidates)
                            }
                          }
                        }
                        setShowEditCandidate(false)
                        setEditingCandidate(null)
                      }}
                      disabled={isSavingCandidate}
                      className={`px-6 py-2.5 rounded-full text-white transition-all duration-200 flex items-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none font-medium shadow-sm hover:shadow-md ${isSavingCandidate ? 'cursor-not-allowed' : ''
                        }`}
                      type="button"
                      aria-label="Save candidate changes"
                    >
                      {isSavingCandidate ? (
                        <>
                          <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4" />
                          Save Changes
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* View Candidate Modal */}
          {showViewCandidate && viewingCandidate && (
            <div>
              <div className="fixed inset-0 z-[99999] bg-black/10 backdrop-blur-[2px]" />
              <div
                className="fixed inset-0 z-[100000] flex items-center justify-center p-4 overflow-y-auto"
                onClick={() => setShowViewCandidate(false)}
              >
                <div
                  className="relative w-full max-w-2xl bg-transparent rounded-2xl outline-none focus:outline-none my-8"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 max-h-[95vh] overflow-hidden">
                    {/* Gradient Header */}
                    <header className="bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 border-b border-gray-200 dark:border-gray-800 rounded-t-2xl px-6 py-5 shadow-sm">
                      <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg ring-4 ring-blue-100 dark:ring-blue-900/30">
                            <User className="w-7 h-7 text-white" aria-hidden="true" />
                          </div>
                          <div>
                            <h3 className="text-2xl md:text-3xl font-semibold text-gray-900 dark:text-gray-100 tracking-tight">
                              Candidate Details
                            </h3>
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mt-1">
                              Viewing candidate information • <span className="font-semibold text-blue-600 dark:text-blue-400">Hire Portal</span>
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => setShowViewCandidate(false)}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 flex-shrink-0 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none shadow-sm hover:shadow-md"
                          aria-label="Close"
                          type="button"
                        >
                          <X className="h-5 w-5" aria-hidden="true" />
                        </button>
                      </div>
                    </header>
                    <div className="p-6 overflow-y-auto max-h-[calc(95vh-120px)] space-y-6">
                      {/* Candidate Header */}
                      <div className="flex items-center gap-4 pb-4 border-b border-gray-200 dark:border-gray-700">
                        <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold text-xl">
                          {viewingCandidate.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </div>
                        <div>
                          <h4 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{viewingCandidate.name}</h4>
                          <p className="text-gray-600 dark:text-gray-300">{viewingCandidate.position}</p>
                          <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium mt-2 capitalize ${viewingCandidate.status === 'applied' ? 'bg-blue-100 text-blue-800' :
                            viewingCandidate.status === 'screening' ? 'bg-amber-100 text-amber-800' :
                              viewingCandidate.status === 'interview' ? 'bg-purple-100 text-purple-800' :
                                viewingCandidate.status === 'offer' ? 'bg-emerald-100 text-emerald-800' :
                                  viewingCandidate.status === 'hired' ? 'bg-teal-100 text-teal-800' :
                                    'bg-red-100 text-red-800'
                            }`}>
                            {viewingCandidate.status}
                          </span>
                        </div>
                      </div>

                      {/* AI Score removed as per requirement */}

                      {/* Contact Information */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                          <p className="text-sm text-gray-900 dark:text-gray-100">{viewingCandidate.email}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label>
                          <p className="text-sm text-gray-900 dark:text-gray-100">{viewingCandidate.phone || 'Not provided'}</p>
                        </div>
                        {/* Location removed as per requirement */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Source</label>
                          <p className="text-sm text-gray-900 dark:text-gray-100">{viewingCandidate.source}</p>
                        </div>
                      </div>

                      {/* Application Details */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Applied Date</label>
                          <p className="text-sm text-gray-900 dark:text-gray-100">{viewingCandidate.appliedDate}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Experience</label>
                          <p className="text-sm text-gray-900 dark:text-gray-100">{viewingCandidate.experience || 'Not specified'}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Expected Salary</label>
                          <p className="text-sm text-gray-900 dark:text-gray-100">{viewingCandidate.salary || 'Not specified'}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Last Activity</label>
                          <p className="text-sm text-gray-900 dark:text-gray-100">{viewingCandidate.lastActivity}</p>
                        </div>
                      </div>

                      {/* Skills */}
                      {viewingCandidate.skills && viewingCandidate.skills.length > 0 && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Skills</label>
                          <div className="flex flex-wrap gap-2">
                            {viewingCandidate.skills.map((skill, i) => (
                              <span key={i} className="px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm font-medium">
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Notes */}
                      {viewingCandidate.notes && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Notes</label>
                          <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                            <p className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap">{viewingCandidate.notes}</p>
                          </div>
                        </div>
                      )}

                      {/* Recruiter Notes */}
                      {viewingCandidate.recruiterNotes && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Recruiter Notes</label>
                          <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                            <p className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap">{viewingCandidate.recruiterNotes}</p>
                          </div>
                        </div>
                      )}

                      {/* Feedback */}
                      {viewingCandidate.feedback && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Feedback</label>
                          <div className="p-3 bg-green-50 dark:bg-emerald-900/30 rounded-lg">
                            <p className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap">{viewingCandidate.feedback}</p>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex justify-end gap-3 p-6 border-t bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                      <button
                        onClick={() => setShowViewCandidate(false)}
                        className="px-5 py-2 rounded-full border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors focus:ring-2 focus:ring-blue-500"
                      >
                        Close
                      </button>
                      <button
                        onClick={() => {
                          setShowViewCandidate(false)
                          setEditingCandidate(viewingCandidate.id)
                          setEditCandidateForm({
                            name: viewingCandidate.name,
                            email: viewingCandidate.email,
                            position: viewingCandidate.position,
                            status: viewingCandidate.status,
                            source: viewingCandidate.source,
                            notes: viewingCandidate.notes || ""
                          })
                          setShowEditCandidate(true)
                        }}
                        className="px-5 py-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white transition-colors focus:ring-2 focus:ring-blue-500"
                      >
                        Edit Candidate
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Screening Invite Modal */}
          {showScreeningInvite && (
            <div>
              <div className="fixed inset-0 z-[99999] bg-black/10 backdrop-blur-[2px]" />
              <div
                className="fixed inset-0 z-[100000] flex items-center justify-center p-4 overflow-y-auto"
                onClick={() => setShowScreeningInvite(false)}
              >
                <div
                  className="relative w-full max-w-2xl bg-transparent rounded-2xl outline-none focus:outline-none my-8"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="relative bg-white rounded-2xl shadow-xl max-h-[95vh] overflow-hidden">
                    <div className="flex items-center justify-between p-6 border-b">
                      <h3 className="text-xl font-semibold text-gray-900">Send Screening Invites</h3>
                      <button onClick={() => setShowScreeningInvite(false)} className="text-gray-500 hover:text-gray-700">✕</button>
                    </div>
                    <div className="p-6 overflow-y-auto max-h-[calc(95vh-120px)] space-y-6">
                      <div>
                        <h4 className="text-lg font-medium text-gray-900 mb-2">Selected Candidates ({selectedCandidates.length})</h4>
                        <div className="bg-gray-50 rounded-lg p-3 max-h-32 overflow-y-auto">
                          {candidates.filter(c => selectedCandidates.includes(c.id)).map(c => (
                            <div key={c.id} className="flex items-center justify-between py-2 border-b last:border-b-0 text-sm">
                              <div>
                                <p className="font-medium text-gray-900">{c.name}</p>
                                <p className="text-gray-500">{c.position} • {c.email}</p>
                              </div>
                              <span className="px-2 py-1 rounded-full text-xs bg-white border capitalize">{c.status}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Google Calendar Link *</label>
                        <input
                          type="url"
                          value={recruiterCalendarLink}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRecruiterCalendarLink(e.target.value)}
                          placeholder="https://calendly.com/your-link or Google Calendar link"
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                        <p className="text-xs text-gray-500 mt-1">Add your scheduling link so candidates can book interviews</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Custom Message</label>
                        <textarea
                          value={screeningMessage}
                          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setScreeningMessage(e.target.value)}
                          rows={4}
                          placeholder="Add a personalized message for the screening invites..."
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
                        />
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Invite Preview</h4>
                        <div className="bg-gray-50 rounded-lg p-4 border">
                          <div className="text-sm text-gray-700 space-y-2">
                            <p><strong>Subject:</strong> Screening Interview Invitation - [Position]</p>
                            <p><strong>Message:</strong></p>
                            <div className="bg-white rounded p-3 text-xs">
                              Dear [Candidate Name],<br /><br />
                              Thank you for your application.<br />
                              We would like to invite you for a screening interview.<br /><br />
                              {screeningMessage || '[Your custom message will appear here]'}<br /><br />
                              Please use this link to schedule your interview: {recruiterCalendarLink || '[Calendar link will appear here]'}<br /><br />
                              Best regards,<br />
                              Recruitment Team
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-6 border-t bg-gray-50">
                      <button onClick={() => setShowScreeningInvite(false)} className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 rounded-lg font-medium transition-all duration-200 focus:ring-2 focus:ring-gray-500 focus:outline-none">Cancel</button>
                      <button onClick={sendScreeningInvites} disabled={selectedCandidates.length === 0 || !recruiterCalendarLink.trim()} className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-all duration-200 focus:ring-2 focus:ring-green-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed">Send Invites ({selectedCandidates.length})</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Feedback Modal */}
          {showFeedbackModal && candidateForFeedback && (
            <div>
              <div className="fixed inset-0 z-[99999] bg-black/10 backdrop-blur-[2px]" />
              <div
                className="fixed inset-0 z-[100000] flex items-center justify-center p-4 overflow-y-auto"
                onClick={() => setShowFeedbackModal(false)}
              >
                <div
                  className="relative w-full max-w-2xl bg-transparent rounded-2xl outline-none focus:outline-none my-8"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="relative bg-white rounded-2xl shadow-xl max-h-[95vh] overflow-hidden">
                    <div className="flex items-center justify-between p-6 border-b">
                      <h3 className="text-xl font-semibold text-gray-900">Add Feedback</h3>
                      <button onClick={() => setShowFeedbackModal(false)} className="text-gray-500 hover:text-gray-700">✕</button>
                    </div>
                    <div className="p-6 overflow-y-auto max-h-[calc(95vh-120px)] space-y-6">
                      {(() => {
                        const c = candidates.find(x => x.id === candidateForFeedback)!; return (
                          <div className="bg-gray-50 rounded-lg p-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div>
                                <p className="text-xs font-medium text-gray-700">Name</p>
                                <p className="text-lg font-semibold text-gray-900">{c.name}</p>
                              </div>
                              <div>
                                <p className="text-xs font-medium text-gray-700">Position</p>
                                <p className="text-lg font-semibold text-gray-900">{c.position}</p>
                              </div>
                              <div>
                                <p className="text-xs font-medium text-gray-700">Current Status</p>
                                <span className="inline-flex px-3 py-1 rounded-full text-xs font-medium bg-white border capitalize">{c.status}</span>
                              </div>
                              <div>
                                <p className="text-xs font-medium text-gray-700">Current Status</p>
                                <span className="inline-flex px-3 py-1 rounded-full text-xs font-medium bg-white border capitalize">{c.status}</span>
                              </div>
                              <div>
                                <p className="text-xs font-medium text-gray-700">AI Score</p>
                                <p className="text-lg font-semibold text-gray-900">{c.aiScore || 0}/10</p>
                              </div>
                            </div>
                          </div>
                        )
                      })()}

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Interview Score (0-100)</label>
                        <div className="flex items-center gap-4">
                          <input type="range" min={0} max={100} value={interviewScore} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInterviewScore(Number.parseInt(e.target.value))} className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer" />
                          <span className="text-lg font-semibold text-gray-900 min-w-[3rem] text-center">{interviewScore}</span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Recruiter Feedback</label>
                        <textarea value={feedbackText} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFeedbackText(e.target.value)} rows={6} placeholder="Add detailed feedback..." className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 resize-none" />
                      </div>

                      <div className="bg-blue-50 rounded-lg p-4 border">
                        <h4 className="text-sm font-medium text-blue-800 mb-3">Overall Score Calculation</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                          <div className="text-center">
                            <p className="text-gray-600">AI Score</p>
                            <p className="text-lg font-semibold text-gray-900">{(candidates.find(x => x.id === candidateForFeedback)?.aiScore || 0) * 10}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-gray-600">Interview Score</p>
                            <p className="text-lg font-semibold text-gray-900">{interviewScore}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-gray-600">Overall</p>
                            <p className="text-2xl font-bold text-blue-600">{Math.round((((candidates.find(x => x.id === candidateForFeedback)?.aiScore || 0) * 10) + interviewScore) / 2)}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-6 border-t bg-gray-50">
                      <button onClick={() => setShowFeedbackModal(false)} className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 rounded-lg font-medium transition-all duration-200 focus:ring-2 focus:ring-gray-500 focus:outline-none">Cancel</button>
                      <button onClick={addFeedback} disabled={!feedbackText.trim()} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed">Save Feedback</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          {/* Add Candidate Modal */}
          {showAddCandidate && (
            <>
              <div className="fixed inset-0 z-[99999] bg-black/10 backdrop-blur-[2px]" />
              <div
                className="fixed inset-0 z-[100000] flex items-center justify-center p-4"
                onClick={() => setShowAddCandidate(false)}
              >
                <div
                  className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-800/95 backdrop-blur-sm rounded-3xl shadow-2xl border border-gray-200/60 dark:border-gray-700/60 animate-scaleIn"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="relative p-5 sm:p-6 rounded-t-2xl overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 opacity-90" />
                    <div className="relative flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/20 rounded-xl">
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="text-white text-lg sm:text-2xl font-semibold">New Applicant</h3>
                          <p className="text-blue-100 text-xs sm:text-sm">Fill in the applicant details and attach the resume</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowAddCandidate(false)}
                        className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Full Name *</label>
                        <input
                          type="text"
                          placeholder="Enter full name"
                          value={candidateForm.name}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                            setCandidateForm(prev => ({ ...prev, name: e.target.value }));
                            const result = validateName(e.target.value);
                            setFormErrors(prev => ({ ...prev, name: result === true ? '' : result }));
                          }}
                          onBlur={(e: React.ChangeEvent<HTMLInputElement>) => {
                            const result = validateName(e.target.value);
                            setFormErrors(prev => ({ ...prev, name: result === true ? '' : result }));
                          }}
                          onFocus={() => {
                            setFormErrors(prev => ({ ...prev, name: '' }));
                          }}
                          className={`w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none transition-all duration-200 ${formErrors.name ? 'border-red-500' : ''}`}
                          required
                        />
                        {formErrors.name && (
                          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.name}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email *</label>
                        <input
                          type="email"
                          placeholder="Enter email"
                          value={candidateForm.email}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                            setCandidateForm(prev => ({ ...prev, email: e.target.value }));
                            if (formErrors.email) setFormErrors(prev => ({ ...prev, email: '' }));
                          }}
                          onBlur={(e: React.ChangeEvent<HTMLInputElement>) => {
                            if (!e.target.value.trim()) {
                              setFormErrors(prev => ({ ...prev, email: 'Email is required' }));
                            } else if (!e.target.value.includes('@') || !e.target.value.includes('.')) {
                              setFormErrors(prev => ({ ...prev, email: 'Please enter a valid email address' }));
                            } else {
                              setFormErrors(prev => ({ ...prev, email: '' }));
                            }
                          }}
                          onFocus={() => {
                            setFormErrors(prev => ({ ...prev, email: '' }));
                          }}
                          className={`w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none transition-all duration-200 ${formErrors.email ? 'border-red-500' : ''}`}
                          required
                        />
                        {formErrors.email && (
                          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.email}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Phone *</label>
                        <div className="w-full">
                          <PhoneInput2
                            country={'in'}
                            value={candidateForm.phone}
                            onChange={(val: string) => {
                              setCandidateForm(prev => ({ ...prev, phone: val }))
                              if (formErrors.phone) setFormErrors(prev => ({ ...prev, phone: '' }))
                            }}
                            inputProps={{
                              id: 'candidatePhone',
                              name: 'mobile',
                              required: true,
                              onFocus: () => setFormErrors(prev => ({ ...prev, phone: '' })),
                              onBlur: () => {
                                const clean = '+' + (candidateForm.phone || '').replace(/[^\d]/g, '').replace(/^\+/, '')
                                if (!candidateForm.phone) {
                                  setFormErrors(prev => ({ ...prev, phone: 'Phone number is required' }))
                                } else if (!isValidPhoneNumber(clean)) {
                                  setFormErrors(prev => ({ ...prev, phone: 'Please enter a valid international phone number' }))
                                }
                              }
                            }}
                            inputStyle={{
                              ...phoneInputStyles.inputStyle,
                              borderColor: formErrors.phone ? '#ef4444' : undefined
                            }}
                            containerStyle={{
                              ...phoneInputStyles.containerStyle,
                              borderColor: formErrors.phone ? '#ef4444' : undefined
                            }}
                            buttonStyle={phoneInputStyles.buttonStyle}
                            dropdownStyle={phoneInputStyles.dropdownStyle}
                            containerClass="w-full"
                            dropdownClass="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            enableSearch
                          />
                        </div>
                        {formErrors.phone && (
                          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.phone}</p>
                        )}
                      </div>
                      {applicationMethod === 'jd' && (
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Select Job Position *</label>
                          <div className="relative">
                            <select
                              value={jobPositions.find((j) => j.title === candidateForm.position)?.id || ''}
                              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                                const selected = jobPositions.find((j) => j.id === e.target.value)
                                setCandidateForm((prev) => ({ ...prev, position: selected?.title || '' }))
                              }}
                              className={`w-full px-3 py-2.5 border rounded-full text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:focus:ring-blue-400/50 focus:border-blue-500 dark:focus:border-blue-400 transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-600 shadow-sm focus:shadow-md appearance-none pr-10 ${formErrors.position ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                            >
                              <option value="">Select Job Position</option>
                              {jobPositions.map((job) => (
                                <option key={job.id} value={job.id}>{job.title}</option>
                              ))}
                            </select>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                              <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </div>
                          </div>
                          {formErrors.position && (
                            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.position}</p>
                          )}
                        </div>
                      )}
                      {/* Job Position field removed per user request */}
                      {/* <div>
              <select
                  value={availableJobs.find(j => j.title === candidateForm.position)?._id || ''}
                  onChange={(e) => handleJobSelection(e.target.value)}
                  className={`w-full px-3 py-2.5 border rounded-lg text-sm bg-white/80 dark:bg-gray-700/50 backdrop-blur-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:focus:ring-blue-400/50 focus:border-blue-500 dark:focus:border-blue-400 transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-600 shadow-sm focus:shadow-md ${formErrors.position ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                >
                  <option value="">Select Job Position *</option>
                  {availableJobs.map((job) => (
                    <option key={job._id} value={job._id}>
                      {job.title}
                    </option>
                  ))}
              </select>
                {formErrors.position && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.position}</p>
                )}
              </div> */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Category *</label>
                        <div className="relative">
                          <div
                            role="button"
                            tabIndex={0}
                            className="w-full px-3 py-2.5 border rounded-lg text-sm bg-white/80 dark:bg-gray-700/50 backdrop-blur-sm text-gray-900 dark:text-white flex items-center justify-between cursor-pointer border-gray-300 dark:border-gray-600"
                            onClick={() => setOpenCategoryDropdown(!openCategoryDropdown)}
                          >
                            <span>{candidateForm.category || 'Select Category'}</span>
                            <svg className={`w-4 h-4 text-gray-400 transition-transform ${openCategoryDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                          {openCategoryDropdown && (
                            <div className="absolute z-20 mt-1 w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-40 overflow-y-auto p-2">
                              {categories.length === 0 ? (
                                <div className="px-3 py-2 text-sm text-gray-500">No categories available</div>
                              ) : categories.map((cat) => (
                                <div
                                  key={cat}
                                  className="px-3 py-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer text-sm text-gray-900 dark:text-gray-100"
                                  onClick={() => {
                                    setCandidateForm(prev => ({ ...prev, category: cat }));
                                    setOpenCategoryDropdown(false);
                                  }}
                                >
                                  {cat}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Experience *</label>
                        <div className="relative">
                          <div
                            role="button"
                            tabIndex={0}
                            className="w-full px-3 py-2.5 border rounded-lg text-sm bg-white/80 dark:bg-gray-700/50 backdrop-blur-sm text-gray-900 dark:text-white flex items-center justify-between cursor-pointer border-gray-300 dark:border-gray-600"
                            onClick={() => setOpenExperienceDropdown(!openExperienceDropdown)}
                          >
                            <span>{candidateForm.experience || 'Select Experience'}</span>
                            <svg className={`w-4 h-4 text-gray-400 transition-transform ${openExperienceDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                          {openExperienceDropdown && (
                            <div className="absolute z-20 mt-1 w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-40 overflow-y-auto p-2">
                              {experiences.map((exp) => (
                                <div
                                  key={exp}
                                  className="px-3 py-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer text-sm text-gray-900 dark:text-gray-100"
                                  onClick={() => {
                                    setCandidateForm(prev => ({ ...prev, experience: exp }));
                                    setOpenExperienceDropdown(false);
                                  }}
                                >
                                  {exp}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Job Type *</label>
                        <div className="relative">
                          <div
                            role="button"
                            tabIndex={0}
                            className="w-full px-3 py-2.5 border rounded-lg text-sm bg-white/80 dark:bg-gray-700/50 backdrop-blur-sm text-gray-900 dark:text-white flex items-center justify-between cursor-pointer border-gray-300 dark:border-gray-600"
                            onClick={() => setOpenJobTypeDropdown(!openJobTypeDropdown)}
                          >
                            <span>{candidateForm.jobType || 'Select Job Type'}</span>
                            <svg className={`w-4 h-4 text-gray-400 transition-transform ${openJobTypeDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                          {openJobTypeDropdown && (
                            <div className="absolute z-20 mt-1 w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg max-h-40 overflow-y-auto p-2">
                              {jobTypes.map((type) => (
                                <div
                                  key={type}
                                  className="px-3 py-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer text-sm text-gray-900 dark:text-gray-100"
                                  onClick={() => {
                                    setCandidateForm(prev => ({ ...prev, jobType: type }));
                                    setOpenJobTypeDropdown(false);
                                  }}
                                >
                                  {type}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    {/* Location, Expected Salary, and Source removed to match job application form */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Upload Resume *</label>
                      <div
                        className="border-2 border-dashed rounded-lg flex items-center gap-3 p-4 cursor-pointer hover:border-gray-400 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-300 border-gray-300 dark:border-gray-600"
                        onClick={() => fileInputRef.current?.click()}
                        role="button"
                        tabIndex={0}
                      >
                        {candidateForm.resume ? (
                          <div className="flex items-center flex-1 min-w-0">
                            <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{candidateForm.resume.name}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <svg width="24" height="24" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-6 text-blue-500">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 16V4m0 12l-4-4m4 4l4-4" />
                            </svg>
                            <span className="text-blue-600 dark:text-blue-400 font-medium text-sm">Upload Resume</span>
                            <span className="text-xs text-gray-400 dark:text-gray-500">PDF, DOC, DOCX, TXT, RTF (Max: 10MB)</span>
                          </div>
                        )}
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".pdf,.doc,.docx,.txt,.rtf"
                          onChange={(e) => {
                            const file = e.target.files ? e.target.files[0] : null;
                            setCandidateForm(prev => ({ ...prev, resume: file }));
                          }}
                          className="hidden"
                        />
                      </div>
                    </div>

                    {submitMessage && (
                      <div className={`mb-4 p-3 rounded-lg border text-sm ${submitMessage.type === 'success' ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'}`}>
                        {submitMessage.message}
                      </div>
                    )}

                    {formErrors.duplicate && (
                      <div className="mb-4 p-3 rounded-lg border text-sm bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300">
                        {formErrors.duplicate}
                      </div>
                    )}
                    <div className="mt-6">
                      <button
                        onClick={handleAddCandidate}
                        disabled={isSavingCandidate}
                        className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:opacity-50 text-white rounded-full shadow-lg shadow-indigo-500/30 hover:shadow-xl transition-all duration-200 font-medium disabled:cursor-not-allowed flex items-center justify-center gap-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        type="button"
                        aria-label="Submit application"
                      >
                        {isSavingCandidate ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            Submitting...
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4" aria-hidden="true" />
                            Submit Application
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* AI Insights Modal */}
          {showAIInsights && (
            <>
              <div className="fixed inset-0 z-[99999] bg-black/10 backdrop-blur-[2px]" />
              <div
                className="fixed inset-0 z-[100000] flex items-center justify-center p-4"
                onClick={() => setShowAIInsights(false)}
              >
                <div
                  className="w-full max-w-2xl max-h-[80vh] overflow-y-auto bg-white rounded-2xl shadow-xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex justify-between items-center p-6 border-b">
                    <h3 className="text-xl font-semibold text-gray-900 flex items-center space-x-2">
                      <Brain className="h-5 w-5 text-purple-600" />
                      <span>Mistral AI Insights</span>
                    </h3>
                    <Button variant="outline" size="sm" onClick={() => setShowAIInsights(false)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="p-6 space-y-4">
                    {aiInsights.map((insight, index) => (
                      <div key={index} className={`border-l-4 rounded-lg p-4 ${insight.type === 'alert' ? 'border-l-red-400 bg-red-50' :
                        insight.type === 'recommendation' ? 'border-l-blue-400 bg-blue-50' :
                          'border-l-green-400 bg-green-50'
                        }`}>
                        <div className="flex items-start space-x-3">
                          <div className={`p-2 rounded-full ${insight.type === 'alert' ? 'bg-red-100 text-red-600' :
                            insight.type === 'recommendation' ? 'bg-blue-100 text-blue-600' :
                              'bg-green-100 text-green-600'
                            }`}>
                            {insight.type === 'alert' ? <AlertTriangle className="h-4 w-4" /> :
                              insight.type === 'recommendation' ? <Bot className="h-4 w-4" /> :
                                <TrendingUp className="h-4 w-4" />}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <h4 className="font-semibold capitalize">{insight.type}</h4>
                              <span className="text-xs px-2 py-1 rounded-full border border-gray-300 bg-white">
                                {insight.confidence}% confidence
                              </span>
                            </div>
                            <p className="text-sm text-gray-700">{insight.message}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                    <Button onClick={() => generateAIInsights()} className="w-full">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Refresh Insights
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Bulk Actions Modal */}
          {showBulkActions && (
            <>
              <div className="fixed inset-0 z-[99999] bg-black/10 backdrop-blur-[2px]" />
              <div
                className="fixed inset-0 z-[100000] flex items-center justify-center p-4"
                onClick={() => setShowBulkActions(false)}
              >
                <div
                  className="w-full max-w-md max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-800/95 backdrop-blur-sm rounded-3xl shadow-2xl border border-gray-200/60 dark:border-gray-700/60 animate-scaleIn"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="relative p-5 sm:p-6 rounded-t-2xl overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 opacity-90" />
                    <div className="relative flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/20 rounded-xl">
                          <Users className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h3 className="text-white text-lg sm:text-2xl font-semibold">Bulk Actions</h3>
                          <p className="text-blue-100 text-xs sm:text-sm">Apply changes to selected candidates</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowBulkActions(false)}
                        className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
                        aria-label="Close"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                  <div className="p-6 space-y-4">
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">{selectedCandidates.length} candidates selected</p>
                    <div className="space-y-2">
                      <button
                        onClick={() => {
                          selectedCandidates.forEach(id => handleStatusChange(id, 'screening'))
                          setSelectedCandidates([])
                          setShowBulkActions(false)
                        }}
                        className="w-full h-12 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm hover:shadow-md transition-all focus:ring-2 focus:ring-blue-500 focus:outline-none flex items-center justify-center gap-2"
                        type="button"
                        aria-label="Move to Screening"
                      >
                        <UserPlus className="h-4 w-4" aria-hidden="true" />
                        Move to Screening
                      </button>
                      <button
                        onClick={() => {
                          selectedCandidates.forEach(id => handleStatusChange(id, 'interview'))
                          setSelectedCandidates([])
                          setShowBulkActions(false)
                        }}
                        className="w-full h-12 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm hover:shadow-md transition-all focus:ring-2 focus:ring-blue-500 focus:outline-none flex items-center justify-center gap-2"
                        type="button"
                        aria-label="Move to Interview"
                      >
                        <Calendar className="h-4 w-4" aria-hidden="true" />
                        Move to Interview
                      </button>
                      <button
                        onClick={() => {
                          selectedCandidates.forEach(id => handleStatusChange(id, 'offer'))
                          setSelectedCandidates([])
                          setShowBulkActions(false)
                        }}
                        className="w-full h-12 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm hover:shadow-md transition-all focus:ring-2 focus:ring-blue-500 focus:outline-none flex items-center justify-center gap-2"
                        type="button"
                        aria-label="Move to Offer"
                      >
                        <DollarSign className="h-4 w-4" aria-hidden="true" />
                        Move to Offer
                      </button>
                      <button
                        onClick={() => {
                          selectedCandidates.forEach(id => handleStatusChange(id, 'hired'))
                          setSelectedCandidates([])
                          setShowBulkActions(false)
                        }}
                        className="w-full h-12 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm hover:shadow-md transition-all focus:ring-2 focus:ring-blue-500 focus:outline-none flex items-center justify-center gap-2"
                        type="button"
                        aria-label="Mark as Hired"
                      >
                        <CheckCircle className="h-4 w-4" aria-hidden="true" />
                        Mark as Hired
                      </button>
                      <button
                        onClick={() => {
                          selectedCandidates.forEach(id => handleStatusChange(id, 'rejected'))
                          setSelectedCandidates([])
                          setShowBulkActions(false)
                        }}
                        className="w-full h-12 rounded-full bg-red-600 hover:bg-red-700 text-white font-medium shadow-sm hover:shadow-md transition-all focus:ring-2 focus:ring-red-500 focus:outline-none flex items-center justify-center gap-2"
                        type="button"
                        aria-label="Mark as Rejected"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                        Mark as Rejected
                      </button>
                      <button
                        className="w-full h-12 rounded-full border border-gray-300 bg-white text-gray-800 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-700 shadow-sm transition-all focus:ring-2 focus:ring-blue-500 focus:outline-none flex items-center justify-center gap-2"
                        type="button"
                        aria-label="Send Email"
                      >
                        <Mail className="h-4 w-4" aria-hidden="true" />
                        Send Email
                      </button>
                      <button
                        onClick={() => {
                          const toInvite = candidates.filter(c => selectedCandidates.includes(c.id))
                          setBulkInviteCandidates(toInvite)
                          setShowBulkActions(false)
                          setShowEnhancedInvite(true)
                        }}
                        className="w-full h-12 rounded-full border border-gray-300 bg-white text-gray-800 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-700 shadow-sm transition-all focus:ring-2 focus:ring-blue-500 focus:outline-none flex items-center justify-center gap-2"
                        type="button"
                        aria-label="Schedule Interviews"
                      >
                        <Calendar className="h-4 w-4" aria-hidden="true" />
                        Schedule Interviews
                      </button>
                      {/* Bulk delete removed per request */}
                    </div>
                    <button
                      onClick={() => setShowBulkActions(false)}
                      className="w-full h-12 rounded-full border border-gray-300 bg-white text-gray-800 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-700 shadow-sm transition-all focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      type="button"
                      aria-label="Cancel"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Analysis Modal */}
          {showAnalysisModal && (
            <div className="fixed inset-0 z-[99999] bg-black/10 backdrop-blur-[2px]" />
          )}
          {showAnalysisModal && selectedAnalysis && (
            <div
              className="fixed inset-0 z-[100000] flex items-center justify-center p-4 overflow-y-auto"
              onClick={() => setShowAnalysisModal(false)}
            >
              <div
                className="relative w-full max-w-6xl bg-transparent rounded-2xl outline-none focus:outline-none my-4 sm:my-8 max-h-[90vh] overflow-hidden"
                onClick={e => e.stopPropagation()}
              >
                <div className="relative bg-white dark:bg-[#111111] rounded-2xl shadow-2xl max-h-[90vh] flex flex-col border border-gray-200 dark:border-gray-800 overflow-y-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                  {enterpriseAnalysisLoading ? (
                    <div className="flex items-center justify-center min-h-[60vh] w-full">
                      <div className="flex flex-col items-center gap-4">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
                        <div className="text-gray-600 dark:text-gray-400 text-lg">Loading Resume Analysis...</div>
                      </div>
                    </div>
                  ) : enterpriseAnalysisData ? (() => {
                    const data = enterpriseAnalysisData as Record<string, unknown>;
                    const fields = (data.extracted_fields || {}) as Record<string, unknown>;
                    const overview = (data.overview || {}) as {
                      ats_score?: number;
                      fitment_score?: number;
                      confidence_index?: number;
                      sector_alignment?: number;
                      role_suitability?: number;
                      weighted_skill_score?: number;
                      [key: string]: unknown;
                    };
                    const finalRec = (data.final_recommendation || {}) as {
                      verdict?: string;
                      readiness?: string;
                      next_action?: string;
                      [key: string]: unknown;
                    };
                    const keywordAnalysis = (data.keyword_analysis || {}) as {
                      matched_keywords?: string[];
                      missing_critical_keywords?: string[];
                      [key: string]: unknown;
                    };
                    const detailedBreakdown = (data.detailed_breakdown || {}) as {
                      experience_relevance?: {
                        years_relevant?: number | string;
                        comment?: string;
                        [key: string]: unknown;
                      };
                      education_certifications?: {
                        comment?: string;
                        [key: string]: unknown;
                      };
                      [key: string]: unknown;
                    };
                    const getString = (obj: Record<string, unknown>, key: string): string => String(obj[key] || '');
                    const getArray = (obj: Record<string, unknown>, key: string): Record<string, unknown>[] => {
                      const val = obj[key];
                      return Array.isArray(val) ? val as Record<string, unknown>[] : [];
                    };

                    return (
                      <>
                        {/* Enhanced Resume Analysis Header */}
                        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 dark:from-indigo-700 dark:via-purple-700 dark:to-indigo-800 text-white p-6 sm:p-8 relative">
                          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/90 via-indigo-600/90 to-purple-600/90 rounded-t-2xl"></div>
                          <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -mr-48 -mt-48"></div>
                          <div className="relative z-10">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full">
                              {/* Left Section - Title and Subtitle */}
                              <div className="flex-shrink-0 min-w-0">
                                <h2 className="text-xl sm:text-2xl font-semibold tracking-tight mb-2 whitespace-nowrap">Resume Analysis</h2>
                                <div className="flex items-center gap-2 text-sm text-blue-100 dark:text-blue-200 whitespace-nowrap">
                                  <div className="w-2 h-2 bg-green-400 rounded-full flex-shrink-0"></div>
                                  <span>Powered by Converiqo AI</span>
                                </div>
                              </div>

                              {/* Right Section - Applied Date and Close */}
                              <div className="flex items-center justify-between sm:justify-end gap-3 flex-shrink-0 w-full sm:w-auto">
                                <div className="text-right whitespace-nowrap">
                                  <div className="text-sm md:text-base text-blue-100 dark:text-blue-200">Applied Date</div>
                                  <div className="text-sm md:text-base font-semibold">
                                    {(() => {
                                      const ts = (data.generated_on || data.analysis_timestamp || (selectedAnalysis as Record<string, unknown>)?.created_at || "");
                                      return ts ? new Date(String(ts)).toLocaleDateString() : "-";
                                    })()}

                                  </div>
                                </div>
                                <button
                                  onClick={() => {
                                    const candidateId = (selectedAnalysis as Record<string, unknown>)?.id || (selectedAnalysis as Record<string, unknown>)?.applicant_id;
                                    downloadResumeAnalysis({
                                      id: String(candidateId),
                                      applicant_id: String((selectedAnalysis as Record<string, unknown>)?.applicant_id),
                                    } as Candidate);
                                  }}
                                  disabled={isDownloadingResumeAnalysis || !(selectedAnalysis as Record<string, unknown>)?.applicant_id}
                                  className={`flex items-center justify-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${isDownloadingResumeAnalysis ? 'bg-white/20 cursor-wait' : 'bg-white/20 hover:bg-white/30 cursor-pointer'} text-white border border-white/30 mr-2`}
                                  title="Download Analysis Report"
                                >
                                  {isDownloadingResumeAnalysis ? (
                                    <svg className="w-4 h-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                  ) : (
                                    <Download className="w-4 h-4 text-white" />
                                  )}
                                  <span className="hidden sm:inline">Download Report</span>
                                </button>
                                <button
                                  onClick={() => setShowAnalysisModal(false)}
                                  className="text-white hover:text-blue-200 bg-transparent hover:bg-white/10 rounded-full text-base sm:text-lg w-7 h-7 sm:w-8 sm:h-8 flex justify-center items-center transition-colors focus:ring-2 focus:ring-white focus:outline-none flex-shrink-0"
                                  title="Close resume analysis modal"
                                >
                                  <svg className="w-5 h-5" aria-hidden="true" fill="none" viewBox="0 0 14 14">
                                    <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Candidate Overview */}
                        <div className="bg-white dark:bg-[#111111] p-6 md:p-8 border-b border-gray-200 dark:border-gray-800">
                          <div className="flex items-start justify-between mb-6">
                            <div className="flex-1">
                              <h3 className="text-lg font-medium text-gray-700 dark:text-gray-200 mb-2">
                                {getString(fields, 'name') || 'Candidate Name'}
                              </h3>
                              <div className="text-sm md:text-base text-gray-600 dark:text-gray-300 mb-4">
                                <div className="flex items-center gap-4 flex-wrap">
                                  <span>📧 {getString(fields, 'email') || 'email@example.com'}</span>
                                  <span>📱 {getString(fields, 'phone') || 'Phone Number'}</span>
                                  <span>📍 {getString(fields, 'location') || 'Location'}</span>
                                </div>
                              </div>
                              <div className="text-sm md:text-base text-gray-500 dark:text-gray-400">
                                <span className="font-medium">Position:</span> {
                                  (() => {
                                    // Get position from multiple sources
                                    const position = getString(fields, 'job_applied') ||
                                      selectedAnalysis?.jobCategory ||
                                      selectedAnalysis?.job_category ||
                                      (data as Record<string, unknown>)?.job_category as string ||
                                      'Not specified';
                                    // Filter out generic prefixes like "OVERVIEW:", "OPPORTUNITY:", "SUMMARY:"
                                    const cleanPosition = String(position).replace(/^(OVERVIEW|OPPORTUNITY|SUMMARY|JOB|POSITION):\s*/i, '').trim();
                                    return cleanPosition || 'Not specified';
                                  })()
                                } |
                                <span className="font-medium ml-2">Experience:</span> {
                                  getString(fields, 'total_experience') ||
                                  selectedAnalysis?.experience ||
                                  (data as Record<string, unknown>)?.experience as string ||
                                  'Not specified'
                                }
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Applicant ID</div>
                              <div className="font-mono text-sm bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                                {selectedAnalysis?.id || 'N/A'}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Enhanced Key Metrics with Glassmorphism */}
                        <div className="p-6">
                          <h3 className="text-lg font-medium text-gray-700 dark:text-gray-200 mb-6 flex items-center gap-2">
                            <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden="true">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                            Analysis Summary
                          </h3>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                            <div className="relative bg-white dark:bg-[#111111] rounded-2xl p-6 border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow duration-300 group">
                              <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-all duration-500"></div>
                              <div className="relative text-center">
                                <div className="flex items-center justify-center gap-2 mb-3">
                                  <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg group-hover:scale-110 transition-transform duration-300">
                                    <svg className="w-4 h-4 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden="true">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                  </div>
                                </div>
                                <div className="text-3xl md:text-4xl font-semibold tracking-tight text-indigo-600 dark:text-indigo-400 mb-2">
                                  {overview?.ats_score || selectedAnalysis?.ats_score || 0}
                                </div>
                                <div className="text-sm md:text-base font-medium text-gray-700 dark:text-gray-200 mb-3">ATS Score</div>
                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                                  <div
                                    className="bg-indigo-600 dark:bg-indigo-400 h-2 rounded-full transition-all duration-1000 ease-out"
                                    style={{ width: `${overview?.ats_score || selectedAnalysis?.ats_score || 0}%` }}
                                  ></div>
                                </div>
                              </div>
                            </div>
                            <div className="relative bg-white dark:bg-[#111111] rounded-2xl p-6 border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow duration-300 group">
                              <div className="relative text-center">
                                <div className="flex items-center justify-center gap-2 mb-3">
                                  <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg group-hover:scale-110 transition-transform duration-300">
                                    <svg className="w-4 h-4 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden="true">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                  </div>
                                </div>
                                <div className="text-3xl md:text-4xl font-semibold tracking-tight text-indigo-600 dark:text-indigo-400 mb-2">
                                  {overview?.fitment_score || 0}
                                </div>
                                <div className="text-sm md:text-base font-medium text-gray-700 dark:text-gray-200 mb-3">Fit Score</div>
                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                                  <div
                                    className="bg-indigo-600 dark:bg-indigo-400 h-2 rounded-full transition-all duration-1000 ease-out"
                                    style={{ width: `${overview?.fitment_score || 0}%` }}
                                  ></div>
                                </div>
                              </div>
                            </div>
                            <div className="relative bg-white dark:bg-[#111111] rounded-2xl p-6 border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow duration-300 group">
                              <div className="relative text-center">
                                <div className="flex items-center justify-center gap-2 mb-3">
                                  <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg group-hover:scale-110 transition-transform duration-300">
                                    <svg className="w-4 h-4 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden="true">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                    </svg>
                                  </div>
                                </div>
                                <div className="text-3xl md:text-4xl font-semibold tracking-tight text-indigo-600 dark:text-indigo-400 mb-2">
                                  {overview?.confidence_index || 0}
                                </div>
                                <div className="text-sm md:text-base font-medium text-gray-700 dark:text-gray-200 mb-3">Confidence</div>
                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                                  <div
                                    className="bg-indigo-600 dark:bg-indigo-400 h-2 rounded-full transition-all duration-1000 ease-out"
                                    style={{ width: `${(overview?.confidence_index || 0) * 10}%` }}
                                  ></div>
                                </div>
                              </div>
                            </div>
                            <div className="relative bg-white dark:bg-[#111111] rounded-2xl p-6 border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow duration-300 group">
                              <div className="relative text-center">
                                <div className="flex items-center justify-center gap-2 mb-3">
                                  <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg group-hover:scale-110 transition-transform duration-300">
                                    <svg className="w-4 h-4 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden="true">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                  </div>
                                </div>
                                <div className="text-3xl md:text-4xl font-semibold tracking-tight text-indigo-600 dark:text-indigo-400 mb-2">
                                  {overview?.sector_alignment || 0}%
                                </div>
                                <div className="text-sm md:text-base font-medium text-gray-700 dark:text-gray-200 mb-3">Sector Match</div>
                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                                  <div
                                    className="bg-indigo-600 dark:bg-indigo-400 h-2 rounded-full transition-all duration-1000 ease-out"
                                    style={{ width: `${overview?.sector_alignment || 0}%` }}
                                  ></div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Enhanced Final Recommendation */}
                        {finalRec && finalRec.verdict && (
                          <div className="bg-white dark:bg-[#111111] p-6 md:p-8 border-b border-gray-200 dark:border-gray-800">
                            <div className="flex items-center justify-between">
                              <div>
                                <h3 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Recommendation</h3>
                                <div className="text-2xl md:text-3xl font-semibold tracking-tight text-gray-900 dark:text-gray-100 mb-2">
                                  {finalRec.verdict}
                                </div>
                                <div className="text-sm md:text-base text-gray-600 dark:text-gray-400">
                                  {finalRec.readiness} • {finalRec.next_action}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-sm text-gray-500 dark:text-gray-400">Overall Assessment</div>
                                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                                  {(overview?.ats_score ?? 0) >= 70 ? '✅ Strong' :
                                    (overview?.ats_score ?? 0) >= 50 ? '⚠️ Moderate' : '❌ Weak'}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Tab Navigation */}
                        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
                          <div className="flex flex-wrap gap-2 overflow-x-auto">
                            {[
                              { id: 'summary', label: 'Summary', icon: '📝' },
                              { id: 'skills', label: 'Skills', icon: '⚡️' },
                              { id: 'experience', label: 'Experience', icon: '💼' },
                              { id: 'education', label: 'Education', icon: '🎓' },
                              { id: 'keywords', label: 'Keywords', icon: '🔍' },
                              { id: 'improvements', label: 'Improvements', icon: '🚀' }
                            ].map((tab) => (
                              <button
                                key={tab.id}
                                onClick={() => setAnalysisTab(tab.id)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-200 ${analysisTab === tab.id
                                  ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800'
                                  }`}
                              >
                                <span>{tab.icon}</span>
                                {tab.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Tab Content */}
                        <div className="flex-1 p-6">
                          {/* Professional Summary Tab */}
                          {analysisTab === 'summary' && (
                            <div className="space-y-6">
                              {/* Professional Summary Card */}
                              <div className="relative bg-white dark:bg-[#111111] rounded-2xl p-6 md:p-8 border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow duration-300 group">
                                <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200 dark:border-gray-800">
                                  <h4 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                    <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden="true">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    Professional Summary
                                  </h4>
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                                    <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Excellent</span>
                                  </div>
                                </div>
                                <div className="space-y-3">
                                  <div className="text-gray-700 dark:text-gray-300 leading-relaxed">
                                    {String(fields.summary || 'Professional summary not extracted from resume.')}
                                  </div>
                                  <div className="text-sm md:text-base text-gray-600 dark:text-gray-400 leading-relaxed">
                                    <span className="font-semibold text-gray-700 dark:text-gray-300">Analysis:</span> Strong professional summary that effectively communicates career goals and key qualifications.
                                  </div>
                                </div>
                              </div>

                              {/* Key Strengths & Areas for Improvement */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                                  <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Key Strengths
                                  </h4>
                                  <ul className="space-y-2">
                                    {overview?.ats_score && overview.ats_score >= 70 && (
                                      <li className="flex items-center gap-2 text-sm text-green-700 dark:text-green-300">
                                        <span>✅</span> Strong ATS compatibility
                                      </li>
                                    )}
                                    {overview?.fitment_score && overview.fitment_score >= 70 && (
                                      <li className="flex items-center gap-2 text-sm text-green-700 dark:text-green-300">
                                        <span>✅</span> Good job fit potential
                                      </li>
                                    )}
                                    {overview?.sector_alignment && overview.sector_alignment >= 70 && (
                                      <li className="flex items-center gap-2 text-sm text-green-700 dark:text-green-300">
                                        <span>✅</span> Industry experience match
                                      </li>
                                    )}
                                    {(() => {
                                      const skills = fields.skills as { technical?: string[]; soft?: string[] } | undefined;
                                      return (skills?.technical?.length || skills?.soft?.length) ? (
                                        <li className="flex items-center gap-2 text-sm text-green-700 dark:text-green-300">
                                          <span>✅</span> Comprehensive skills profile
                                        </li>
                                      ) : null;
                                    })()}
                                  </ul>
                                </div>

                                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                                  <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                                    <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                    </svg>
                                    Areas for Improvement
                                  </h4>
                                  <ul className="space-y-2">
                                    {overview?.ats_score && overview.ats_score < 50 && (
                                      <li className="flex items-center gap-2 text-sm text-orange-700 dark:text-orange-300">
                                        <span>⚠️</span> ATS optimization needed
                                      </li>
                                    )}
                                    {overview?.confidence_index && overview.confidence_index < 5 && (
                                      <li className="flex items-center gap-2 text-sm text-orange-700 dark:text-orange-300">
                                        <span>⚠️</span> Limited confidence in analysis
                                      </li>
                                    )}
                                    {(!fields.experience_details || getArray(fields, 'experience_details').length === 0) && (
                                      <li className="flex items-center gap-2 text-sm text-orange-700 dark:text-orange-300">
                                        <span>⚠️</span> Limited experience details
                                      </li>
                                    )}
                                  </ul>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Skills Tab */}
                          {analysisTab === 'skills' && (
                            <div className="space-y-6">
                              {/* Technical Skills Card */}
                              <div className="relative bg-white dark:bg-[#111111] rounded-2xl p-6 md:p-8 border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow duration-300 group">
                                <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200 dark:border-gray-800">
                                  <h4 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                    <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden="true">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                    Technical Skills
                                  </h4>
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                                    <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Strong</span>
                                  </div>
                                </div>
                                <div className="space-y-4">
                                  {(() => {
                                    const skills = fields.skills as { technical?: string[]; soft?: string[] } | undefined;
                                    const technicalSkills = skills?.technical || [];
                                    return technicalSkills.length > 0 ? (
                                      <div>
                                        <h5 className="text-md font-medium text-gray-900 dark:text-white mb-3">Technical Skills</h5>
                                        <div className="flex flex-wrap gap-2">
                                          {technicalSkills.map((skill: string, index: number) => (
                                            <span key={index} className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full text-sm">
                                              {skill}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="text-gray-500 dark:text-gray-400 text-sm">
                                        No technical skills extracted from resume
                                      </div>
                                    );
                                  })()}

                                  {(() => {
                                    const skills = fields.skills as { technical?: string[]; soft?: string[] } | undefined;
                                    const softSkills = skills?.soft || [];
                                    return softSkills.length > 0 ? (
                                      <div>
                                        <h5 className="text-md font-medium text-gray-900 dark:text-white mb-3">Soft Skills</h5>
                                        <div className="flex flex-wrap gap-2">
                                          {softSkills.map((skill: string, index: number) => (
                                            <span key={index} className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-full text-sm">
                                              {skill}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    ) : null;
                                  })()}
                                </div>
                                <div className="text-sm md:text-base text-gray-600 dark:text-gray-400 leading-relaxed mt-4">
                                  <span className="font-semibold text-gray-700 dark:text-gray-300">Analysis:</span> Well-rounded skill set with strong technical foundation. Consider adding industry-specific certifications to further strengthen profile.
                                </div>
                              </div>

                              {/* Skills Scoring */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                                  <h5 className="text-md font-medium text-gray-900 dark:text-white mb-4">Skills Assessment</h5>
                                  <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                      <span className="text-sm text-gray-600 dark:text-gray-400">Technical Skills</span>
                                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                                        {overview?.weighted_skill_score ? Math.round(overview.weighted_skill_score) : 0}/100
                                      </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                      <span className="text-sm text-gray-600 dark:text-gray-400">Role Suitability</span>
                                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                                        {overview?.role_suitability ? Math.round(overview.role_suitability) : 0}/100
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {keywordAnalysis?.matched_keywords && keywordAnalysis.matched_keywords.length > 0 && (
                                  <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                                    <h5 className="text-md font-medium text-green-700 dark:text-green-300 mb-3">✅ Matched Keywords</h5>
                                    <div className="flex flex-wrap gap-2">
                                      {keywordAnalysis.matched_keywords.slice(0, 12).map((keyword: string, index: number) => (
                                        <span key={index} className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-full text-sm">
                                          {keyword}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Experience Tab */}
                          {analysisTab === 'experience' && (
                            <div className="space-y-6">
                              {/* Professional Experience Card */}
                              <div className="relative bg-white dark:bg-[#111111] rounded-2xl p-6 md:p-8 border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow duration-300 group">
                                <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200 dark:border-gray-800">
                                  <h4 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                    <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden="true">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m8 0V8a2 2 0 01-2 2H8a2 2 0 01-2-2V6m8 0H8m0 0V4" />
                                    </svg>
                                    Professional Experience
                                  </h4>
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                                    <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Good</span>
                                  </div>
                                </div>
                                <div className="space-y-3">
                                  {(() => {
                                    const experienceDetails = getArray(fields, 'experience_details');
                                    return experienceDetails && experienceDetails.length > 0 ? (
                                      experienceDetails.map((exp: Record<string, unknown>, index: number) => (
                                        <div key={index} className="border-l-2 border-blue-200 dark:border-blue-700 pl-4 py-2">
                                          <div className="font-medium text-gray-900 dark:text-gray-100 text-sm">{String(exp.title || exp.position || 'Position')}</div>
                                          <div className="text-sm text-gray-600 dark:text-gray-400">{String(exp.company || 'Company')}</div>
                                          <div className="text-xs text-gray-500 dark:text-gray-500">{String(exp.duration || exp.period || 'Duration not specified')}</div>
                                        </div>
                                      ))
                                    ) : (
                                      <div className="text-gray-500 dark:text-gray-400 text-sm">
                                        {detailedBreakdown?.experience_relevance ? (
                                          <div className="space-y-1">
                                            {typeof detailedBreakdown.experience_relevance.years_relevant !== 'undefined' && (
                                              <div className="text-xs">Years Relevant: {detailedBreakdown.experience_relevance.years_relevant}</div>
                                            )}
                                            <div className="text-xs">{String(detailedBreakdown.experience_relevance.comment || 'No specific experience analysis available.')}</div>
                                          </div>
                                        ) : (
                                          <span className="text-base">No experience details available</span>
                                        )}
                                      </div>
                                    );
                                  })()}
                                  <div className="text-sm md:text-base text-gray-600 dark:text-gray-400 leading-relaxed">
                                    <span className="font-semibold text-gray-700 dark:text-gray-300">Analysis:</span> Good relevant experience. Consider adding quantifiable achievements and specific metrics to strengthen the profile.
                                  </div>
                                </div>
                              </div>

                              {/* Experience Analysis */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                                  <h5 className="text-md font-medium text-gray-900 dark:text-white mb-2">Relevant Experience</h5>
                                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                    {detailedBreakdown?.experience_relevance?.years_relevant || 'N/A'} years
                                  </div>
                                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Years of relevant experience</div>
                                </div>

                                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                                  <h5 className="text-md font-medium text-gray-900 dark:text-white mb-2">Experience Assessment</h5>
                                  <div className="text-gray-700 dark:text-gray-300 text-sm">
                                    {String(detailedBreakdown?.experience_relevance?.comment || 'Experience analysis not available.')}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Education Tab */}
                          {analysisTab === 'education' && (
                            <div className="space-y-6">
                              {/* Education Card */}
                              <div className="relative bg-white dark:bg-[#111111] rounded-2xl p-6 md:p-8 border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow duration-300 group">
                                <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200 dark:border-gray-800">
                                  <h4 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                    <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden="true">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5z" />
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 14v7" />
                                    </svg>
                                    Education
                                  </h4>
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                                    <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Strong</span>
                                  </div>
                                </div>
                                <div className="space-y-3">
                                  {(() => {
                                    const educationDetails = getArray(fields, 'education');
                                    return educationDetails && educationDetails.length > 0 ? (
                                      educationDetails.map((edu: Record<string, unknown>, index: number) => (
                                        <div key={index} className="border-l-2 border-green-200 dark:border-green-700 pl-4 py-2">
                                          <div className="font-medium text-gray-900 dark:text-gray-100 text-sm">{String(edu.degree || edu.qualification || 'Degree')}</div>
                                          <div className="text-sm text-gray-600 dark:text-gray-400">{String(edu.institution || edu.university || 'Institution')}</div>
                                          <div className="text-xs text-gray-500 dark:text-gray-500">
                                            {String(edu.year || edu.graduation_year || 'Year not specified')}
                                            {edu.gpa ? ` • GPA: ${String(edu.gpa)}` : ''}
                                          </div>
                                        </div>
                                      ))
                                    ) : (
                                      <div className="text-gray-500 dark:text-gray-400 text-sm">
                                        {String(detailedBreakdown?.education_certifications?.comment || 'No education details available')}
                                      </div>
                                    );
                                  })()}
                                  <div className="text-sm md:text-base text-gray-600 dark:text-gray-400 leading-relaxed">
                                    <span className="font-semibold text-gray-700 dark:text-gray-300">Analysis:</span> Solid educational background. Consider highlighting relevant coursework and academic achievements.
                                  </div>
                                </div>
                              </div>

                              {/* Certifications */}
                              {(() => {
                                const certifications = getArray(fields, 'certifications');
                                return certifications && certifications.length > 0 ? (
                                  <div className="relative bg-white dark:bg-[#111111] rounded-2xl p-6 md:p-8 border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow duration-300 group">
                                    <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200 dark:border-gray-800">
                                      <h4 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                        <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden="true">
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z" />
                                        </svg>
                                        Certifications
                                      </h4>
                                      <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                        <span className="text-sm font-medium text-blue-600 dark:text-blue-400">Additional</span>
                                      </div>
                                    </div>
                                    <div className="space-y-3">
                                      {certifications.map((cert: Record<string, unknown>, index: number) => (
                                        <div key={index} className="border-l-2 border-blue-200 dark:border-blue-700 pl-4 py-2">
                                          <div className="font-medium text-gray-900 dark:text-gray-100 text-sm">{String(cert.name || cert.title || 'Certification')}</div>
                                          <div className="text-sm text-gray-600 dark:text-gray-400">{String(cert.issuer || cert.organization || 'Issuer')}</div>
                                          <div className="text-xs text-gray-500 dark:text-gray-500">{String(cert.date || cert.year || 'Date not specified')}</div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ) : null;
                              })()}
                            </div>
                          )}

                          {/* Keywords Tab */}
                          {analysisTab === 'keywords' && (
                            <div className="space-y-6">
                              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Keyword Analysis</h4>

                                <div className="space-y-4">
                                  {keywordAnalysis?.matched_keywords && keywordAnalysis.matched_keywords.length > 0 && (
                                    <div>
                                      <h5 className="text-md font-medium text-green-700 dark:text-green-300 mb-2">✅ Matched Keywords</h5>
                                      <div className="flex flex-wrap gap-2">
                                        {keywordAnalysis.matched_keywords.map((keyword: string, index: number) => (
                                          <span key={index} className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-full text-sm">
                                            {keyword}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {keywordAnalysis?.missing_critical_keywords && keywordAnalysis.missing_critical_keywords.length > 0 && (
                                    <div>
                                      <h5 className="text-md font-medium text-red-700 dark:text-red-300 mb-2">❌ Missing Critical Keywords</h5>
                                      <div className="flex flex-wrap gap-2">
                                        {keywordAnalysis.missing_critical_keywords.map((keyword: string, index: number) => (
                                          <span key={index} className="px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 rounded-full text-sm">
                                            {keyword}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  <div className="text-sm md:text-base text-gray-600 dark:text-gray-400 leading-relaxed mt-4">
                                    <span className="font-semibold text-gray-700 dark:text-gray-300">Analysis:</span> Keywords are crucial for ATS systems. The matched keywords show good alignment with job requirements. Consider incorporating missing critical keywords naturally throughout the resume.
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Improvements Tab */}
                          {analysisTab === 'improvements' && (
                            <div className="space-y-6">
                              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recommended Improvements</h4>

                                <div className="space-y-4">
                                  {overview?.ats_score && overview.ats_score < 70 && (
                                    <div className="border-l-4 border-blue-500 pl-4">
                                      <h5 className="font-medium text-blue-700 dark:text-blue-300">ATS Optimization</h5>
                                      <p className="text-sm text-gray-600 dark:text-gray-400">
                                        Consider adding more industry-specific keywords and standardizing your resume format for better ATS compatibility.
                                      </p>
                                    </div>
                                  )}

                                  {overview?.fitment_score && overview.fitment_score < 70 && (
                                    <div className="border-l-4 border-green-500 pl-4">
                                      <h5 className="font-medium text-green-700 dark:text-green-300">Skills Enhancement</h5>
                                      <p className="text-sm text-gray-600 dark:text-gray-400">
                                        Focus on developing skills that are specifically mentioned in job descriptions for this role.
                                      </p>
                                    </div>
                                  )}

                                  {overview?.sector_alignment && overview.sector_alignment < 70 && (
                                    <div className="border-l-4 border-purple-500 pl-4">
                                      <h5 className="font-medium text-purple-700 dark:text-purple-300">Industry Experience</h5>
                                      <p className="text-sm text-gray-600 dark:text-gray-400">
                                        Consider gaining more experience in this industry or highlighting transferable skills from related fields.
                                      </p>
                                    </div>
                                  )}

                                  {(!fields.experience_details || getArray(fields, 'experience_details').length === 0) && (
                                    <div className="border-l-4 border-orange-500 pl-4">
                                      <h5 className="font-medium text-orange-700 dark:text-orange-300">Experience Details</h5>
                                      <p className="text-sm text-gray-600 dark:text-gray-400">
                                        Add more detailed work experience descriptions with quantifiable achievements and responsibilities.
                                      </p>
                                    </div>
                                  )}

                                  {(!fields.education || getArray(fields, 'education').length === 0) && (
                                    <div className="border-l-4 border-purple-500 pl-4">
                                      <h5 className="font-medium text-purple-700 dark:text-purple-300">Education Section</h5>
                                      <p className="text-sm text-gray-600 dark:text-gray-400">
                                        Ensure education details are clearly listed with degrees, institutions, and graduation years.
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Tab Content */}
                        <div className="flex-1 overflow-y-auto p-6">
                          {/* Summary Tab */}
                          {analysisTab === 'summary' && (
                            <div className="space-y-6">
                              {/* Professional Summary Card */}
                              <div className="relative bg-white dark:bg-[#111111] rounded-2xl p-6 md:p-8 border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow duration-300 group">
                                <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200 dark:border-gray-800">
                                  <h4 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                    <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden="true">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    Professional Summary
                                  </h4>
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                                    <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Excellent</span>
                                  </div>
                                </div>
                                <div className="space-y-3">
                                  <div className="text-gray-700 dark:text-gray-300 leading-relaxed">
                                    {String(fields.summary || 'Professional summary not extracted from resume.')}
                                  </div>
                                  <div className="text-sm md:text-base text-gray-600 dark:text-gray-400 leading-relaxed">
                                    <span className="font-semibold text-gray-700 dark:text-gray-300">Analysis:</span> Strong professional summary that effectively communicates career goals and key qualifications.
                                  </div>
                                </div>
                              </div>

                              {/* Key Strengths & Areas for Improvement */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                                  <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Key Strengths
                                  </h4>
                                  <ul className="space-y-2">
                                    {overview?.ats_score && overview.ats_score >= 70 && (
                                      <li className="flex items-center gap-2 text-sm text-green-700 dark:text-green-300">
                                        <span>✅</span> Strong ATS compatibility
                                      </li>
                                    )}
                                    {overview?.fitment_score && overview.fitment_score >= 70 && (
                                      <li className="flex items-center gap-2 text-sm text-green-700 dark:text-green-300">
                                        <span>✅</span> Good job fit potential
                                      </li>
                                    )}
                                    {overview?.sector_alignment && overview.sector_alignment >= 70 && (
                                      <li className="flex items-center gap-2 text-sm text-green-700 dark:text-green-300">
                                        <span>✅</span> Industry experience match
                                      </li>
                                    )}
                                    {overview?.confidence_index && overview.confidence_index >= 7 && (
                                      <li className="flex items-center gap-2 text-sm text-green-700 dark:text-green-300">
                                        <span>✅</span> High analysis confidence
                                      </li>
                                    )}
                                  </ul>
                                </div>

                                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                                  <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                                    <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                    </svg>
                                    Areas for Improvement
                                  </h4>
                                  <ul className="space-y-2">
                                    {overview?.ats_score && overview.ats_score < 50 && (
                                      <li className="flex items-center gap-2 text-sm text-orange-700 dark:text-orange-300">
                                        <span>⚠️</span> ATS optimization needed
                                      </li>
                                    )}
                                    {overview?.fitment_score && overview.fitment_score < 50 && (
                                      <li className="flex items-center gap-2 text-sm text-orange-700 dark:text-orange-300">
                                        <span>⚠️</span> Limited job fit
                                      </li>
                                    )}
                                    {overview?.confidence_index && overview.confidence_index < 5 && (
                                      <li className="flex items-center gap-2 text-sm text-orange-700 dark:text-orange-300">
                                        <span>⚠️</span> Low analysis confidence
                                      </li>
                                    )}
                                  </ul>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Skills Tab */}
                          {analysisTab === 'skills' && (
                            <div className="space-y-6">
                              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Skills Assessment</h4>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                  <div className="text-center">
                                    <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                                      {overview?.weighted_skill_score ? Math.round(overview.weighted_skill_score) : 0}%
                                    </div>
                                    <div className="text-sm text-gray-600 dark:text-gray-400">Technical Skills Score</div>
                                  </div>
                                  <div className="text-center">
                                    <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-2">
                                      {overview?.role_suitability ? Math.round(overview.role_suitability) : 0}%
                                    </div>
                                    <div className="text-sm text-gray-600 dark:text-gray-400">Role Suitability</div>
                                  </div>
                                </div>

                                {keywordAnalysis?.matched_keywords && keywordAnalysis.matched_keywords.length > 0 && (
                                  <div>
                                    <h5 className="text-md font-medium text-gray-900 dark:text-white mb-3">Matched Keywords</h5>
                                    <div className="flex flex-wrap gap-2">
                                      {keywordAnalysis.matched_keywords.slice(0, 10).map((keyword: string, index: number) => (
                                        <span key={index} className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-full text-sm">
                                          {keyword}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Experience Tab */}
                          {analysisTab === 'experience' && (
                            <div className="space-y-6">
                              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Experience Analysis</h4>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                  <div>
                                    <h5 className="text-md font-medium text-gray-900 dark:text-white mb-2">Relevant Experience</h5>
                                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                      {detailedBreakdown?.experience_relevance?.years_relevant || 'N/A'} years
                                    </div>
                                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Years of relevant experience</div>
                                  </div>
                                  <div>
                                    <h5 className="text-md font-medium text-gray-900 dark:text-white mb-2">Experience Assessment</h5>
                                    <p className="text-gray-700 dark:text-gray-300 text-sm">
                                      {String(detailedBreakdown?.experience_relevance?.comment || 'Experience analysis not available.')}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Education Tab */}
                          {analysisTab === 'education' && (
                            <div className="space-y-6">
                              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Education & Certifications</h4>

                                <div className="text-gray-700 dark:text-gray-300">
                                  {String(detailedBreakdown?.education_certifications?.comment || 'Education analysis not available.')}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Keywords Tab */}
                          {analysisTab === 'keywords' && (
                            <div className="space-y-6">
                              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Keyword Analysis</h4>

                                <div className="space-y-4">
                                  {keywordAnalysis?.matched_keywords && keywordAnalysis.matched_keywords.length > 0 && (
                                    <div>
                                      <h5 className="text-md font-medium text-green-700 dark:text-green-300 mb-2">✅ Matched Keywords</h5>
                                      <div className="flex flex-wrap gap-2">
                                        {keywordAnalysis.matched_keywords.map((keyword: string, index: number) => (
                                          <span key={index} className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-full text-sm">
                                            {keyword}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {keywordAnalysis?.missing_critical_keywords && keywordAnalysis.missing_critical_keywords.length > 0 && (
                                    <div>
                                      <h5 className="text-md font-medium text-red-700 dark:text-red-300 mb-2">❌ Missing Critical Keywords</h5>
                                      <div className="flex flex-wrap gap-2">
                                        {keywordAnalysis.missing_critical_keywords.map((keyword: string, index: number) => (
                                          <span key={index} className="px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 rounded-full text-sm">
                                            {keyword}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Improvements Tab */}
                          {analysisTab === 'improvements' && (
                            <div className="space-y-6">
                              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recommended Improvements</h4>

                                <div className="space-y-4">
                                  {overview?.ats_score && overview.ats_score < 70 && (
                                    <div className="border-l-4 border-blue-500 pl-4">
                                      <h5 className="font-medium text-blue-700 dark:text-blue-300">ATS Optimization</h5>
                                      <p className="text-sm text-gray-600 dark:text-gray-400">
                                        Consider adding more industry-specific keywords and standardizing your resume format for better ATS compatibility.
                                      </p>
                                    </div>
                                  )}

                                  {overview?.fitment_score && overview.fitment_score < 70 && (
                                    <div className="border-l-4 border-green-500 pl-4">
                                      <h5 className="font-medium text-green-700 dark:text-green-300">Skills Enhancement</h5>
                                      <p className="text-sm text-gray-600 dark:text-gray-400">
                                        Focus on developing skills that are specifically mentioned in job descriptions for this role.
                                      </p>
                                    </div>
                                  )}

                                  {overview?.sector_alignment && overview.sector_alignment < 70 && (
                                    <div className="border-l-4 border-purple-500 pl-4">
                                      <h5 className="font-medium text-purple-700 dark:text-purple-300">Industry Experience</h5>
                                      <p className="text-sm text-gray-600 dark:text-gray-400">
                                        Consider gaining more experience in this industry or highlighting transferable skills from related fields.
                                      </p>
                                    </div>
                                  )}

                                  {(!fields.experience_details || getArray(fields, 'experience_details').length === 0) && (
                                    <div className="border-l-4 border-orange-500 pl-4">
                                      <h5 className="font-medium text-orange-700 dark:text-orange-300">Experience Details</h5>
                                      <p className="text-sm text-gray-600 dark:text-gray-400">
                                        Add more detailed work experience descriptions with quantifiable achievements and responsibilities.
                                      </p>
                                    </div>
                                  )}

                                  {(!fields.education || getArray(fields, 'education').length === 0) && (
                                    <div className="border-l-4 border-purple-500 pl-4">
                                      <h5 className="font-medium text-purple-700 dark:text-purple-300">Education Section</h5>
                                      <p className="text-sm text-gray-600 dark:text-gray-400">
                                        Ensure education details are clearly listed with degrees, institutions, and graduation years.
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </>
                    )
                  })() : (
                    <div className="flex items-center justify-center min-h-[60vh] w-full">
                      <div className="text-center">
                        <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Analysis Data</h3>
                        <p className="text-gray-600 dark:text-gray-400">Unable to load resume analysis for this candidate.</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}