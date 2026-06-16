'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
// import { useRouter } from 'next/navigation'; // Currently unused
import { Filter, ChevronDown, X, Upload, CheckCircle2 } from 'lucide-react';
import DashboardHeader from '@/components/header/DashboardHeader';
import { Briefcase } from 'lucide-react';
import PhoneInput2 from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import NotificationContainer from '../../../../components/ui/notification/NotificationContainer';
import 'react-datepicker/dist/react-datepicker.css';
import DateRangePicker from '../../../../components/DateRangePicker';
import * as XLSX from 'xlsx';
import { Modal } from "@/components/ui/modal";
import DownloadEmployeeTemplate from "@/components/popscreen/DownloadTemplate";
import { isValidPhoneNumber } from 'libphonenumber-js';
import { useTheme } from '../../../../context/ThemeContext';
import { API_CONFIG, buildApiUrl } from '@/config/api';



type Job = {
  id: string;
  applicant_id?: string;
  name: string;
  email: string;
  mobile: string;
  jobCategory: string;
  experience: string;
  job_type?: string;
  subject: string;
  date: string;
  status: string;
  priority?: number;
  resumeFilename?: string;
  resume_link?: string;
  job_category?: string;
  created_at?: string | number;
  analysis_result?: string;
  ats_score?: number;
  weighted_skill_score?: number;
  sector_alignment?: number;
  role_suitability?: number;
  ats_confidence_level?: number;
  source?: string;
  skills?: string[];
  job_id?: string;
  location?: string;
  appointment?: {
    date: string;
    time: string;
    status: string;
    notes?: string;
  };
};

// Removed unused FitCategory type

type CandidateFit = {
  applicant_id?: string | number;
  fit_score?: number;
};

type JobFitScoreResults = {
  success?: boolean;
  total_candidates?: number;
  job_title?: string;
  candidates?: CandidateFit[];
  fit_score_summary?: { excellent_matches?: number; good_matches?: number };
};

const badgeColor: Record<string, string> = {
  High: 'bg-blue-100 text-blue-600',
  Medium: 'bg-blue-100 text-blue-800',
  Low: 'bg-blue-100 text-blue-600',
  Pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  Solved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  processing: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  applied: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  Applied: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  Shortlisted: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  Rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  Hired: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  Interview: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  New: 'bg-blue-500 text-white',
  new: 'bg-blue-500 text-white',
};

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

export default function JobListPage() {
  // const router = useRouter(); // Currently unused
  const { theme } = useTheme();

  // States for jobs and filters
  const [jobs, setJobs] = useState<Job[]>([]);
  const [allJobs, setAllJobs] = useState<Job[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [experiences, setExperiences] = useState<string[]>([]);
  const [jobTypes, setJobTypes] = useState<string[]>([]);
  const [filterField, setFilterField] = useState<'all' | 'applicant_id' | 'name' | 'email' | 'mobile' | 'jobCategory' | 'job_id' | 'experience' | 'job_type' | 'priority' | 'date' | 'status' | 'ats_score'>('all');
  // Removed: legacy basic search input now superseded by advancedSearch.globalSearch
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [timelineFilter, setTimelineFilter] = useState('');
  const [customDateRange, setCustomDateRange] = useState<[Date | null, Date | null]>([null, null]);
  // const [showCustomDatePicker, setShowCustomDatePicker] = useState(false); // Currently unused
  const [dateSort, setDateSort] = useState<'none' | 'asc' | 'desc'>('none');

  // View State
  const [currentView, setCurrentView] = useState<'table' | 'list'>('table');

  // Advanced Search State
  const [advancedSearch, setAdvancedSearch] = useState({
    globalSearch: '',
    name: '',
    jobId: '',
    applicantId: '',
    skills: '',
    status: 'all',
    statusMulti: [] as string[],
    jobCategory: 'all',
    atsScoreMin: '',
    atsScoreMax: '',
    dateFrom: '',
    dateTo: '',
    sortBy: 'date',
    sortOrder: 'desc'
  });
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [advancedDateRange, setAdvancedDateRange] = useState<[Date | null, Date | null]>([null, null]);
  const [showAdvancedDatePicker, setShowAdvancedDatePicker] = useState(false);

  // Debounced search state
  const [debouncedSearch, setDebouncedSearch] = useState(advancedSearch.globalSearch);

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(advancedSearch.globalSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [advancedSearch.globalSearch]);

  // Error handling state (currently unused)
  // const [searchError, setSearchError] = useState<string | null>(null);

  // Pagination and selection state
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

  // UI State
  const [showFilters, setShowFilters] = useState(false);
  const [showJobAppModal, setShowJobAppModal] = useState(false);
  const [loading, setLoading] = useState(true);

  // Removed unused sort menu state (sorting handled elsewhere)

  // Upload Chat Popup state
  const [showUploadPopup, setShowUploadPopup] = useState(false);
  const uploadAssistantInputRef = useRef<HTMLInputElement>(null);
  const [selectedBulkJobId, setSelectedBulkJobId] = useState("");
  const [isBulkJobDropdownOpen, setIsBulkJobDropdownOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadingBulk, setUploadingBulk] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatusMsg, setUploadStatusMsg] = useState("");
  // Bulk Upload Email Config
  const [sendEmailToCandidate, setSendEmailToCandidate] = useState(false);

  // Download modal state
  const [showDownloadModal, setShowDownloadModal] = useState(false);

  // ===================================
  // BULK UPLOAD HANDLER
  // ===================================
  const handleBulkUpload = async () => {
    if (selectedFiles.length === 0) return;

    // Validate job selection
    if (!selectedBulkJobId) {
      setUploadStatusMsg("Please select a job to apply for.");
      // Clear message after 3 seconds
      setTimeout(() => setUploadStatusMsg(""), 3000);
      return;
    }

    setUploadingBulk(true);
    setUploadProgress(0);
    setUploadStatusMsg(`Starting upload of ${selectedFiles.length} resumes...`);

    const BATCH_SIZE = 10;
    const totalBatches = Math.ceil(selectedFiles.length / BATCH_SIZE);
    let queuedCount = 0;
    let completedBatches = 0;

    try {
      const uploadPromises = [];

      for (let i = 0; i < totalBatches; i++) {
        const batch = selectedFiles.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE);
        const batchNum = i + 1;

        const formData = new FormData();
        batch.forEach(file => formData.append("files", file));
        if (selectedBulkJobId) {
          formData.append("job_id", selectedBulkJobId);
        }
        formData.append("send_email", String(sendEmailToCandidate));

        const endpoint = API_CONFIG.ENDPOINTS.JOBS_UPLOAD_BULK || '/api/v1/jobs/upload-bulk';
        const url = buildApiUrl(endpoint);

        const uploadTask = fetch(url, {
          method: "POST",
          body: formData,
        })
          .then(async (response) => {
            if (response.ok) {
              const data = await response.json();
              queuedCount += (data.processed_count || data.processed || batch.length);
            } else {
              console.error(`Batch ${batchNum} upload failed`, response.status);
            }
          })
          .catch((error) => {
            console.error(`Batch ${batchNum} error:`, error);
          })
          .finally(() => {
            completedBatches++;
            const percent = Math.round((completedBatches / totalBatches) * 100);
            setUploadProgress(percent);
            setUploadStatusMsg(`Uploading... ${percent}% completed`);
          });

        uploadPromises.push(uploadTask);
      }

      // Wait for all uploads to finish concurrently
      await Promise.all(uploadPromises);

      setUploadStatusMsg(`Upload Complete! ${queuedCount} resumes queued.`);

      // Fast auto-close
      setTimeout(() => {
        setShowUploadPopup(false);
        setSelectedFiles([]);
        setUploadProgress(0);
        fetchJobs();
        setUploadingBulk(false);
        setUploadStatusMsg("");
      }, 1000);

    } catch (error) {
      console.error("Bulk upload connection error:", error);
      setUploadStatusMsg("Network error occurred.");
      setUploadingBulk(false);
    }
  };
  const [downloadForm, setDownloadForm] = useState({ fileFormat: "", startDate: "", endDate: "", month: "", specificDate: "" });
  const [isDownloadingResumeAnalysis, setIsDownloadingResumeAnalysis] = useState(false);

  // Top 2 job roles by applications (case-insensitive aggregation)
  const mostAppliedJobs = useMemo(() => {
    type RoleAgg = { label: string; count: number };
    const roleToAgg = new Map<string, RoleAgg>();
    for (const j of jobs) {
      const raw = ((j.jobCategory || j.job_category || '') as string).trim();
      if (!raw) continue;
      const key = raw.toLowerCase();
      const displayLabel = raw.charAt(0).toUpperCase() + raw.slice(1);
      const agg = roleToAgg.get(key);
      if (agg) {
        agg.count += 1;
      } else {
        roleToAgg.set(key, { label: displayLabel, count: 1 });
      }
    }
    return Array.from(roleToAgg.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 2);
  }, [jobs]);

  // Aggregate helpers for the Most Applied card
  const mostAppliedTotal = useMemo(() => {
    return mostAppliedJobs.reduce((sum, item) => sum + (item?.count || 0), 0);
  }, [mostAppliedJobs]);

  const mostAppliedLine = useMemo(() => {
    if (!mostAppliedJobs || mostAppliedJobs.length === 0) return '';
    return mostAppliedJobs.map(j => `${j.label} (${j.count})`).join(', ');
  }, [mostAppliedJobs]);

  // Modal form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [resume, setResume] = useState<File | null>(null);
  const [category, setCategory] = useState('');
  const [experience, setExperience] = useState('');
  const [jobType, setJobType] = useState('');

  // JD-based application states
  const [applicationMethod, setApplicationMethod] = useState<'category' | 'jd'>('category');
  const [selectedJobIdForApplication, setSelectedJobIdForApplication] = useState('');
  const [availableJobsForApplication, setAvailableJobsForApplication] = useState<{
    job_id?: string;
    is_active: boolean;
    status: string;
    deleted: boolean;
    source?: string;
    title?: string;
    description?: string;
    experience_level?: string;
    job_type?: string;
    location?: string;
    key_skills?: string[];
    salary_range?: string;
    education_requirements?: string;
    certifications?: string[];
    [key: string]: unknown;
  }[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(false);

  // Validation states - each field validates independently
  const [emailError, setEmailError] = useState('');
  const [showEmailExample, setShowEmailExample] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const [nameError, setNameError] = useState('');
  const [showNameExample, setShowNameExample] = useState(false);
  const [categoryError, setCategoryError] = useState('');
  const [experienceError, setExperienceError] = useState('');
  const [jobTypeError, setJobTypeError] = useState('');
  const [resumeError, setResumeError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Drag & drop state for resume upload
  const [isDragActive, setIsDragActive] = useState(false);
  // Allowed resume constraints
  const allowedResumeTypes = useRef<string[]>(['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']);
  const maxResumeSizeMB = 5; // 5 MB

  const validateAndSetResume = (file: File | null) => {
    if (!file) {
      setResume(null);
      setResumeError('');
      return;
    }
    if (!allowedResumeTypes.current.includes(file.type)) {
      setResume(null);
      setResumeError('Unsupported file type. Please upload PDF, DOC, or DOCX.');
      return;
    }
    if (file.size > maxResumeSizeMB * 1024 * 1024) {
      setResume(null);
      setResumeError(`File is too large. Max ${maxResumeSizeMB}MB allowed.`);
      return;
    }
    setResume(file);
    setResumeError('');
  };
  const phoneInputStyles = useMemo(() => {
    const isDark = theme === 'dark';
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
    };
  }, [theme]);
  const [submitMessage, setSubmitMessage] = useState<{
    type: 'success' | 'error';
    message: string;
    details?: {
      reason?: string;
      applicant_id?: string;
      classification_details?: {
        stages_completed?: string[];
        processing_time_ms?: number;
      };
      requirements?: {
        file_formats?: string;
        content_type?: string;
        required_sections?: string;
        text_content?: string;
      };
      next_steps?: string[];
    };
  } | null>(null);

  // Analysis modal state
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
  } | null>(null);
  const [enterpriseAnalysisData, setEnterpriseAnalysisData] = useState<Record<string, unknown> | null>(null);
  const [enterpriseAnalysisLoading, setEnterpriseAnalysisLoading] = useState(false);
  // Legacy state variables removed - using enterpriseAnalysisData instead
  // const [analysisText, setAnalysisText] = useState('');
  // const [analysisAtsScore, setAnalysisAtsScore] = useState<number | undefined>(undefined);
  // const [analysisWeightedSkillScore, setAnalysisWeightedSkillScore] = useState<number | undefined>(undefined);

  // Help panel state
  const [showHelp] = useState(false);


  // Removed unused quick guide state

  // Job-specific fit score calculation state
  const [availableJobs, setAvailableJobs] = useState<Array<{ id: string; job_id: string; title: string; location: string; experience_level: string }>>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [showJobSelectionModal, setShowJobSelectionModal] = useState(false);
  const [calculatingJobFitScores, setCalculatingJobFitScores] = useState(false);
  const [jobFitScoreResults, setJobFitScoreResults] = useState<JobFitScoreResults | null>(null);
  const [loadingAvailableJobs, setLoadingAvailableJobs] = useState(false);
  // Job-specific fit score map and active job context
  const [fitScoreByApplicant, setFitScoreByApplicant] = useState<Record<string, number>>({});
  const [activeFitJobId, setActiveFitJobId] = useState<string | null>(null);

  // Request de-duplication and caching for resume analysis


  // Fetch available jobs for fit score calculation
  const fetchAvailableJobs = async () => {
    try {
      setLoadingAvailableJobs(true);
      const url = buildApiUrl(API_CONFIG.ENDPOINTS.JOBS_AVAILABLE_JOBS);
      const response = await fetch(url);

      if (response.ok) {
        const data = await response.json();
        console.log('[AVAILABLE JOBS] Response data:', data);

        if (data.success && data.jobs) {
          console.log('[AVAILABLE JOBS] Setting jobs:', data.jobs);
          setAvailableJobs(data.jobs);
        } else {
          console.log('[AVAILABLE JOBS] No jobs found in response');
          setAvailableJobs([]);
        }
      } else {
        const errorText = await response.text();
        console.error(`Failed to fetch available jobs (${response.status}):`, errorText);
        setAvailableJobs([]);
      }
    } catch (error) {
      console.error('Error fetching available jobs:', error);
      setAvailableJobs([]);
    } finally {
      setLoadingAvailableJobs(false);
    }
  };

  // Fetch job listings for JD-based applications
  const fetchJobListings = async () => {
    try {
      setLoadingJobs(true);
      // Try JOB_LISTINGS endpoint first, fallback to HR_POSITIONS if needed
      let url = buildApiUrl(API_CONFIG.ENDPOINTS.JOB_LISTINGS);
      console.log('[DEBUG] Fetching job listings from:', url);
      let response = await fetch(url);

      // If 404, try the HR_POSITIONS endpoint as fallback
      if (!response.ok && response.status === 404) {
        console.log('[DEBUG] JOB_LISTINGS endpoint not found, trying HR_POSITIONS...');
        url = buildApiUrl(API_CONFIG.ENDPOINTS.HR_POSITIONS);
        response = await fetch(url);
      }

      if (response.ok) {
        const data = await response.json();
        console.log('[DEBUG] Job listings response:', data);

        // Handle different response formats
        let jobsData = [];
        if (Array.isArray(data)) {
          // If response is directly an array
          jobsData = data;
        } else if (data.success && data.data) {
          // If response has success flag and data property
          jobsData = Array.isArray(data.data) ? data.data : [];
        } else if (data.data) {
          // If response has data property (could be array or object)
          jobsData = Array.isArray(data.data) ? data.data : [];
        } else if (data.jobs) {
          // If response has jobs property
          jobsData = Array.isArray(data.jobs) ? data.jobs : [];
        }

        // Filter for active jobs only (if status field exists)
        const activeJobs = jobsData.filter((job: { is_active?: boolean; status?: string; deleted?: boolean }) => {
          // If is_active field exists, use it
          if (job.is_active !== undefined) {
            return job.is_active === true;
          }
          // If status field exists, check for active status
          if (job.status) {
            const status = String(job.status).toLowerCase();
            return status === 'active' || status === 'open' || status === 'published';
          }
          // If deleted field exists, exclude deleted
          if (job.deleted !== undefined) {
            return job.deleted === false;
          }
          // If no status fields, include all
          return true;
        });

        // Deduplicate jobs based on job_id to prevent duplicates in dropdown
        const activeJobsMap = new Map();
        activeJobs.forEach((job: { job_id?: string; _id?: string;[key: string]: unknown }) => {
          // Use job_id if available, otherwise fallback to _id or another unique identifier
          const uniqueId = job.job_id || job._id;
          if (uniqueId && !activeJobsMap.has(uniqueId)) {
            activeJobsMap.set(uniqueId, job);
          }
        });

        const uniqueActiveJobs = Array.from(activeJobsMap.values());

        console.log('[DEBUG] Active jobs found:', uniqueActiveJobs.length, uniqueActiveJobs);
        setAvailableJobsForApplication(uniqueActiveJobs);
      } else {
        console.error('Failed to fetch job listings:', response.status, response.statusText);
        setAvailableJobsForApplication([]);
      }
    } catch (error) {
      console.error('Error fetching job listings:', error);
      setAvailableJobsForApplication([]);
    } finally {
      setLoadingJobs(false);
    }
  };

  // Calculate job-specific fit scores for all candidates
  const calculateJobSpecificFitScores = async (jobId: string) => {
    try {
      setCalculatingJobFitScores(true);
      console.log('[JOB FIT SCORE] Starting calculation for job ID:', jobId);
      console.log('[JOB FIT SCORE] Job ID type:', typeof jobId);
      console.log('[JOB FIT SCORE] Job ID length:', jobId?.length);

      // Validate job ID format
      if (!jobId || typeof jobId !== 'string' || jobId.trim() === '') {
        throw new Error('Invalid job ID: job ID is empty or invalid');
      }

      const url = buildApiUrl(API_CONFIG.ENDPOINTS.JOBS_CALCULATE_FIT_SCORES(jobId)) + '?recompute=true';
      console.log('[JOB FIT SCORE] Request URL:', url);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('Response status:', response.status, 'Response ok:', response.ok);

      if (response.ok) {
        const data = await response.json();
        setJobFitScoreResults(data);
        // Job-specific fit scores calculated successfully
        // Build quick lookup by applicant_id for rendering in main table
        const map: Record<string, number> = {};
        if (data && Array.isArray(data.candidates)) {
          data.candidates.forEach((c: CandidateFit) => {
            if (c && c.applicant_id !== undefined && c.fit_score !== undefined) {
              map[String(c.applicant_id)] = Number(c.fit_score);
            }
          });
        }
        setFitScoreByApplicant(map);
        setActiveFitJobId(jobId);
        // Keep modal open so the success summary is visible
        // setShowJobSelectionModal(false);

        // Show success message
        if (data.success) {
          // You can add a toast notification here if you have a toast system
          console.info(`Fit scores calculated successfully for ${data.total_candidates} candidates against "${data.job_title}"`);
        }
      } else {
        let errorMessage = 'Unknown error';
        try {
          const errorData = await response.json();
          console.error('Failed to calculate fit scores:', errorData);
          errorMessage = errorData.detail || errorData.message || 'Unknown error';
        } catch (parseError) {
          console.error('Failed to parse error response:', parseError);
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        alert(`Failed to calculate fit scores: ${errorMessage}`);
      }
    } catch (error) {
      console.error('Error calculating job-specific fit scores:', error);
      alert('Error calculating fit scores. Please try again.');
    } finally {
      setCalculatingJobFitScores(false);
    }
  };

  // Clear job-specific fit scores and revert to original state
  const clearJobSpecificFitScores = () => {
    setActiveFitJobId(null);
    setFitScoreByApplicant({});
    setJobFitScoreResults(null);
    setSelectedJobId('');
    // Job-specific fit scores cleared, table reverted to original state
  };



  // Find duplicates by email and mobile (first occurrence is not duplicate, all subsequent are)
  // Find duplicates by BOTH email AND mobile (both must match for duplicate detection)
  const duplicateMap = useMemo(() => {
    const map = new Map();
    const seen = new Set();

    // Sort jobs by created_at in ascending order (oldest first) to ensure proper duplicate detection
    const sortedJobs = [...jobs].sort((a, b) => {
      const aDate = new Date(a.created_at || a.date || 0).getTime();
      const bDate = new Date(b.created_at || b.date || 0).getTime();
      return aDate - bDate;
    });

    sortedJobs.forEach((job) => {
      if (!job.email || !job.mobile) return;

      // Create a composite key from both email and mobile
      const emailKey = job.email.toLowerCase();
      const mobileKey = job.mobile.replace(/\D/g, '');
      const compositeKey = `${emailKey}|${mobileKey}`;

      if (seen.has(compositeKey)) {
        // This is a duplicate (not the first occurrence)
        if (!map.has(compositeKey)) map.set(compositeKey, []);
        map.get(compositeKey).push(job);
      } else {
        // This is the first occurrence, don't mark as duplicate
        seen.add(compositeKey);
      }
    });
    return map;
  }, [jobs]);

  // State for duplicate details popup
  const [showDuplicateDetails, setShowDuplicateDetails] = useState(false);
  const [selectedDuplicateJob, setSelectedDuplicateJob] = useState<Job | null>(null);
  const [duplicateJobs, setDuplicateJobs] = useState<Job[]>([]);
  const [hoveredDuplicateJobId, setHoveredDuplicateJobId] = useState<string | null>(null);
  const [isShowingDuplicates, setIsShowingDuplicates] = useState(false);
  const [duplicateCompositeKey, setDuplicateCompositeKey] = useState<string | null>(null);

  // Handle duplicate click
  const handleDuplicateClick = (job: Job) => {
    if (!job.email || !job.mobile) return;

    const emailKey = job.email.toLowerCase();
    const mobileKey = job.mobile.replace(/\D/g, '');
    const compositeKey = `${emailKey}|${mobileKey}`;

    // If we're already showing duplicates for this composite key, toggle back to normal view
    if (isShowingDuplicates && duplicateCompositeKey === compositeKey) {
      setIsShowingDuplicates(false);
      setDuplicateCompositeKey(null);
      setDuplicateJobs([]);
      setSelectedDuplicateJob(null);
      setCurrentPage(1); // Reset to first page
      return;
    }

    // Build the full list from all jobs to avoid duplicate ids in the list
    const allForKey = jobs.filter((j) => (
      j.email && j.mobile && j.email.toLowerCase() === emailKey && j.mobile.replace(/\D/g, '') === mobileKey
    ));
    if (allForKey.length > 1) {
      const sorted = [...allForKey].sort((a: Job, b: Job) => {
        const aDate = new Date(a.created_at || a.date || 0).getTime();
        const bDate = new Date(b.created_at || b.date || 0).getTime();
        return aDate - bDate;
      });
      setDuplicateJobs(sorted);
      setSelectedDuplicateJob(job);
      setIsShowingDuplicates(true);
      setDuplicateCompositeKey(compositeKey);
      setCurrentPage(1); // Reset to first page when showing duplicates
    }
  };

  // Check if a job is a duplicate
  const isDuplicate = (job: Job) => {
    if (!job.email || !job.mobile) return false;

    const emailKey = job.email.toLowerCase();
    const mobileKey = job.mobile.replace(/\D/g, '');
    const compositeKey = `${emailKey}|${mobileKey}`;

    return duplicateMap.has(compositeKey);
  };

  // Note: Inline duplicate details don't use outside-click auto-close.

  // Auto-hide alerts after 5 seconds
  React.useEffect(() => {
    if (showEmailExample) {
      const timer = setTimeout(() => {
        setShowEmailExample(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showEmailExample]);

  // Prevent background scrolling when actual modals are open (not inline duplicate details)
  React.useEffect(() => {
    if (showJobAppModal || showAnalysisModal || showJobSelectionModal) {
      // Save current scroll position
      const scrollY = window.scrollY;

      // Prevent scrolling on body
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';

      return () => {
        // Restore scrolling when modal closes
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';

        // Restore scroll position
        window.scrollTo(0, scrollY);
      };
    }
  }, [showJobAppModal, showAnalysisModal, showJobSelectionModal]);

  React.useEffect(() => {
    if (phoneError) {
      const timer = setTimeout(() => {
        setPhoneError('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [phoneError]);

  React.useEffect(() => {
    if (showNameExample) {
      const timer = setTimeout(() => {
        setShowNameExample(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showNameExample]);

  // Auto-hide alerts after 5 seconds
  React.useEffect(() => {
    if (showEmailExample) {
      const timer = setTimeout(() => {
        setShowEmailExample(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showEmailExample]);

  // Allowed email domains (dynamic ready)
  const DEFAULT_ALLOWED_DOMAINS = [
    'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com',
    'zoho.com', 'protonmail.com', 'mail.com', 'aol.com', 'gmx.com',
    'mobiloitte.com', 'mobiloitte.in', 'mobiloitte.org', "mobiloittegroup.com"
  ];
  const [, setAllowedDomains] = useState<string[]>(DEFAULT_ALLOWED_DOMAINS);

  useEffect(() => {
    // 1) Env override: NEXT_PUBLIC_ALLOWED_EMAIL_DOMAINS="gmail.com,yahoo.com"
    const envDomains = process.env.NEXT_PUBLIC_ALLOWED_EMAIL_DOMAINS;
    if (envDomains) {
      const parsed = envDomains
        .split(',')
        .map((d) => d.trim().toLowerCase())
        .filter(Boolean);
      if (parsed.length > 0) {
        setAllowedDomains(parsed);
        return;
      }
    }
  }, []);

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

  // Name validation with minimum length check
  const validateName = (name: string): string | true => {
    if (!name.trim()) return "Full name is required.";
    if (name.trim().length < 2) return "Full name must be at least 2 characters.";
    return true;
  };


  // Safe fetch wrapper to handle network errors
  const safeFetch = async (url: string, options: RequestInit = {}) => {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return response;
    } catch (error) {
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        throw new Error('Network error: Unable to connect to the server. Please check your internet connection and ensure the backend is running.');
      }
      throw error;
    }
  };

  // Apply client-side filtering for all search types (partial and full-text across all columns)
  const applySearchFilter = useCallback((jobs: Job[]) => {
    const globalQ = (advancedSearch.globalSearch || '').trim();
    if (!globalQ) {
      setJobs(jobs);
      return;
    }

    const query = globalQ.toLowerCase();

    // Determine which fields to search based on filter selection
    let allowApplicantId = false,
      allowName = false,
      allowEmail = false,
      allowMobile = false,
      allowJobCategory = false,
      allowJobId = false,
      allowExperience = false,
      allowJobType = false,
      allowPriority = false,
      allowDate = false,
      allowStatus = false,
      allowAtsScore = false;
    const allowSkills = false;

    if (filterField === 'all') {
      // Fast path: behave like job listings search - partial match across all relevant columns
      const filtered = jobs.filter((j) => {
        const applicantId = String(j.applicant_id || j.id || '').toLowerCase();
        const name = (j.name || '').toLowerCase();
        const email = (j.email || '').toLowerCase();
        const mobileDigits = (j.mobile || '').toLowerCase();
        const mobile = (j.mobile || '').replace(/\D/g, '');
        const jobCategory = (j.jobCategory || j.job_category || '').toLowerCase();
        const experience = (j.experience || '').toLowerCase();
        const jobType = (j.job_type || '').toLowerCase();
        const status = (j.status || '').toLowerCase();
        const priorityStr = String(j.priority ?? '').toLowerCase();
        const atsScoreStr = j.ats_score !== undefined && j.ats_score !== null ? String(j.ats_score) : '';
        const dateStr = new Date(j.created_at || j.date || '').toLocaleDateString().toLowerCase();

        const fields = [
          applicantId,
          name,
          email,
          mobileDigits,
          mobile,
          jobCategory,
          (j.job_id || '').toLowerCase(),
          (j.skills || []).join(' ').toLowerCase(),
          experience,
          jobType,
          status,
          priorityStr,
          atsScoreStr,
          dateStr
        ];

        return fields.some((f) => (f || '').includes(query));
      });

      setJobs(filtered);
      return;
    } else {
      // When specific filter is selected, only search that field
      allowApplicantId = filterField === 'applicant_id';
      allowName = filterField === 'name';
      allowEmail = filterField === 'email';
      allowMobile = filterField === 'mobile';
      allowJobCategory = filterField === 'jobCategory';
      allowJobId = filterField === 'job_id';

      allowExperience = filterField === 'experience';
      allowJobType = filterField === 'job_type';
      allowPriority = filterField === 'priority';
      allowDate = filterField === 'date';
      allowStatus = filterField === 'status';
      allowAtsScore = filterField === 'ats_score';
    }

    // Special handling for single-letter queries: prefer prefix matches and sort alphabetically
    if (query.length === 1) {
      if (allowName) {
        const namePrefixMatches = jobs.filter(j => (j.name || '').toLowerCase().startsWith(query));
        if (namePrefixMatches.length > 0) {
          namePrefixMatches.sort((a, b) => (a.name || '').toLowerCase().localeCompare((b.name || '').toLowerCase()));
          setJobs(namePrefixMatches);
          return;
        }
      }
      if (allowEmail) {
        const emailPrefixMatches = jobs.filter(j => (j.email || '').toLowerCase().startsWith(query));
        if (emailPrefixMatches.length > 0) {
          emailPrefixMatches.sort((a, b) => (a.name || '').toLowerCase().localeCompare((b.name || '').toLowerCase()));
          setJobs(emailPrefixMatches);
          return;
        }
      }
      if (allowMobile) {
        const mobilePrefixMatches = jobs.filter(j => (j.mobile || '').replace(/\D/g, '').startsWith(query));
        if (mobilePrefixMatches.length > 0) {
          mobilePrefixMatches.sort((a, b) => (a.name || '').toLowerCase().localeCompare((b.name || '').toLowerCase()));
          setJobs(mobilePrefixMatches);
          return;
        }
      }
      if (allowJobCategory) {
        const jobCategoryPrefixMatches = jobs.filter(j => (j.jobCategory || j.job_category || '').toLowerCase().startsWith(query));
        if (jobCategoryPrefixMatches.length > 0) {
          jobCategoryPrefixMatches.sort((a, b) => (a.name || '').toLowerCase().localeCompare((b.name || '').toLowerCase()));
          setJobs(jobCategoryPrefixMatches);
          return;
        }
      }
      if (allowExperience) {
        const experiencePrefixMatches = jobs.filter(j => (j.experience || '').toLowerCase().startsWith(query));
        if (experiencePrefixMatches.length > 0) {
          experiencePrefixMatches.sort((a, b) => (a.name || '').toLowerCase().localeCompare((b.name || '').toLowerCase()));
          setJobs(experiencePrefixMatches);
          return;
        }
      }
      // Fall back to general logic below if still nothing
    }

    const scored: Array<{ job: Job; score: number }> = [];

    for (const job of jobs) {
      const applicantId = String(job.applicant_id || job.id || '').toLowerCase();
      const name = (job.name || '').toLowerCase();
      const email = (job.email || '').toLowerCase();
      const mobile = (job.mobile || '').replace(/\D/g, ''); // Remove non-digits for mobile search
      const jobCategory = (job.jobCategory || job.job_category || '').toLowerCase();
      const experience = (job.experience || '').toLowerCase();
      const jobType = (job.job_type || '').toLowerCase();
      const priorityStr = String(job.priority ?? '').toLowerCase();
      const dateStr = new Date(job.created_at || job.date || '').toLocaleString().toLowerCase();
      const status = (job.status || '').toLowerCase();
      const atsScoreStr = job.ats_score !== undefined && job.ats_score !== null ? String(job.ats_score) : '';

      let score = -1; // no match

      if (allowApplicantId) {
        if (applicantId.startsWith(query)) score = Math.max(score, 520);
        if (applicantId.includes(query)) score = Math.max(score, 260);
      }

      if (allowName) {
        if (name.startsWith(query)) score = Math.max(score, 500); // highest: name prefix
        if (name.includes(query)) score = Math.max(score, 250);   // name substring
      }
      if (allowEmail) {
        if (email.startsWith(query)) score = Math.max(score, 400); // email prefix
        if (email.includes(query)) score = Math.max(score, 200);   // email substring
      }
      if (allowMobile) {
        // For mobile, check both with and without country codes
        const queryDigits = query.replace(/\D/g, '');
        if (mobile.includes(queryDigits)) {
          if (mobile.startsWith(queryDigits)) {
            score = Math.max(score, 350); // mobile prefix match
          } else {
            score = Math.max(score, 175); // mobile substring match
          }
        }
        // Also check if the original mobile string contains the query (for formatted searches)
        if ((job.mobile || '').toLowerCase().includes(query)) {
          score = Math.max(score, 150);
        }
      }
      if (allowJobCategory) {
        if (jobCategory.startsWith(query)) score = Math.max(score, 300); // job category prefix
        if (jobCategory.includes(query)) score = Math.max(score, 150);   // job category substring
      }
      if (allowJobId) {
        const jobId = (job.job_id || '').toLowerCase();
        if (jobId.startsWith(query)) score = Math.max(score, 350); // job ID prefix
        if (jobId.includes(query)) score = Math.max(score, 200);   // job ID substring
      }
      if (allowSkills) {
        const skills = (job.skills || []).join(' ').toLowerCase();
        if (skills.includes(query)) score = Math.max(score, 250); // skills match
      }
      if (allowExperience) {
        if (experience.startsWith(query)) score = Math.max(score, 275); // experience prefix
        if (experience.includes(query)) score = Math.max(score, 125);   // experience substring
      }
      if (allowJobType) {
        if (jobType.startsWith(query)) score = Math.max(score, 260);
        if (jobType.includes(query)) score = Math.max(score, 120);
      }
      if (allowPriority) {
        if (priorityStr.startsWith(query)) score = Math.max(score, 240);
        if (priorityStr.includes(query)) score = Math.max(score, 110);
      }
      if (allowDate) {
        if (dateStr.includes(query)) score = Math.max(score, 100);
      }
      if (allowStatus) {
        if (status.startsWith(query)) score = Math.max(score, 300);
        if (status.includes(query)) score = Math.max(score, 140);
      }
      if (allowAtsScore) {
        if (atsScoreStr.startsWith(query)) score = Math.max(score, 280);
        if (atsScoreStr.includes(query)) score = Math.max(score, 130);
      }

      if (score >= 0) scored.push({ job, score });
    }

    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score; // higher score first
      const aName = (a.job.name || '').toLowerCase();
      const bName = (b.job.name || '').toLowerCase();
      return aName.localeCompare(bName); // alphabetical tie-breaker
    });

    setJobs(scored.map((s) => s.job));
  }, [advancedSearch.globalSearch, filterField]);

  // Fetch jobs from backend
  const fetchJobs = async () => {
    try {
      const url = buildApiUrl(API_CONFIG.ENDPOINTS.JOBS);
      console.log('[DEBUG] Fetching jobs from URL:', url);

      const res = await safeFetch(url, {
        method: 'GET',
      });

      console.log('[DEBUG] Response status:', res.status);
      console.log('[DEBUG] Response ok:', res.ok);

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status} - ${res.statusText}`);
      }

      const jobsArray = await res.json();
      console.log('[DEBUG] Fetched jobs data:', jobsArray);
      console.log('[DEBUG] First job sample:', jobsArray[0]);
      if (!Array.isArray(jobsArray)) {
        console.error('[ERROR] API response is not an array:', jobsArray);
        throw new Error('API response is not an array');
      }

      // Raw jobs data retrieved from backend

      // Persist duplicate view on refresh by recomputing list instead of clearing
      if (isShowingDuplicates && duplicateCompositeKey) {
        try {
          const [emailKey, mobileKey] = duplicateCompositeKey.split('|');
          const allForKey = jobsArray
            .map((job: Job) => ({
              id: job.id?.toString() || '',
              applicant_id: job.applicant_id,
              name: job.name || 'Unknown',
              email: job.email || 'N/A',
              mobile: job.mobile || 'N/A',
              jobCategory: job.job_category || '',
              experience: job.experience || '',
              job_type: job.job_type || '',
              subject: '-',
              date: new Date(job.created_at || Date.now()).toISOString(),
              status: job.status || 'Pending',
              priority: job.priority || 0,
              resumeFilename: job.resume_link?.split(/[\\\/]/).pop(),
              resume_link: job.resume_link,
              job_category: job.job_category,
              created_at: job.created_at,
              analysis_result: job.analysis_result,
              ats_score: job.ats_score,
              weighted_skill_score: job.weighted_skill_score !== undefined && job.weighted_skill_score !== null
                ? job.weighted_skill_score
                : (job.ats_score ? Math.round(job.ats_score * 0.8) : 0),
            }))
            .filter((j: Job) => (
              j.email && j.mobile &&
              j.email.toLowerCase() === emailKey &&
              j.mobile.replace(/\D/g, '') === mobileKey
            ));

          const sorted = allForKey.sort((a: Job, b: Job) => {
            const aDate = new Date(a.created_at || a.date || 0).getTime();
            const bDate = new Date(b.created_at || b.date || 0).getTime();
            return aDate - bDate;
          });

          setDuplicateJobs(sorted);
          if (!selectedDuplicateJob || !sorted.some(j => j.id === selectedDuplicateJob?.id)) {
            setSelectedDuplicateJob(sorted[0] || null);
          }
          setCurrentPage(1);
        } catch {
          // keep current state if recompute fails
        }
      }

      // First create mapped jobs with basic data
      const mappedJobs = jobsArray.map((job: Job) => {
        const filename = job.resume_link?.split(/[\\/]/).pop();
        return {
          id: job.id?.toString() || '',
          applicant_id: job.applicant_id,
          name: job.name || 'Unknown',
          email: job.email || 'N/A',
          mobile: job.mobile || 'N/A',
          jobCategory: job.job_category || job.jobCategory || '',
          experience: job.experience || '',
          job_type: job.job_type || '',
          subject: '-',
          // Fix: Store date as ISO string to avoid "Invalid Date" issues during re-parsing
          date: new Date(job.created_at || job.date || Date.now()).toISOString(),
          status: job.status || 'Pending',
          priority: job.priority || 0,
          resumeFilename: filename,
          resume_link: job.resume_link,
          job_category: job.job_category || job.jobCategory,
          created_at: job.created_at || job.date,
          analysis_result: job.analysis_result,
          ats_score: job.ats_score,
          weighted_skill_score: job.weighted_skill_score !== undefined && job.weighted_skill_score !== null
            ? job.weighted_skill_score
            : (job.ats_score ? Math.round(job.ats_score * 0.8) : 0),
          sector_alignment: job.sector_alignment,
          role_suitability: job.role_suitability,
          ats_confidence_level: job.ats_confidence_level,
          source: job.source,
          skills: job.skills || [],
          job_id: job.job_id,
        };
      });

      // Set all jobs data
      setAllJobs(mappedJobs);

      // Apply search filtering
      applySearchFilter(mappedJobs);



    } catch (err) {
      console.error('Failed to fetch jobs:', err);
    }
  };

  // Fetch categories and experiences
  useEffect(() => {
    let cancelled = false;
    async function fetchAllData() {
      setLoading(true);
      await fetchJobs();

      try {
        const catRes = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.JOBS_CATEGORIES));
        if (catRes.ok) {
          const catData = await catRes.json();
          setCategories(Array.isArray(catData) ? catData.map((c: { name: string }) => c.name) : []);
        }
      } catch (e) {
        console.error('Failed fetching categories:', e);
        setCategories([]);
      }

      try {
        const expRes = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.JOBS_EXPERIENCES));
        if (expRes.ok) {
          const expData = await expRes.json();
          setExperiences(Array.isArray(expData) ? expData.map((e: { name: string }) => e.name) : []);
        }
      } catch (e) {
        console.error('Failed fetching experience:', e);
        setExperiences([]);
      }



      // Fetch job types from Job-Setting backend
      try {
        const res = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.JOBS_JOB_TYPES));
        if (res.ok) {
          const data = await res.json();
          const names = Array.isArray(data) ? data.map((d: { name?: string }) => (d?.name || '').toString()) : [];
          setJobTypes(names);
        } else {
          setJobTypes([]);
        }
      } catch (e) {
        console.error('Failed fetching job types:', e);
        setJobTypes([]);
      }

      // Fetch available jobs for fit score calculation
      await fetchAvailableJobs();

      // Fetch job listings for applications (Bulk Upload)
      await fetchJobListings();

      if (!cancelled) setLoading(false);
    }
    fetchAllData();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);







  // Advanced search filtering function
  const applyAdvancedSearch = useCallback((jobs: Job[]) => {
    try {
      return jobs.filter((job) => {
        // Global search across all fields (using debounced search)
        if (debouncedSearch) {
          const searchTerm = debouncedSearch.toLowerCase();
          const searchableFields = [
            job.applicant_id || '',
            job.name || '',
            job.email || '',
            job.mobile || '',
            job.jobCategory || '',
            job.experience || '',
            job.job_type || '',
            job.status || '',
            job.ats_score?.toString() || '',
            job.job_id || '',
            (job.skills || []).join(' ')
          ];
          const matchesGlobal = searchableFields.some(field =>
            field.toLowerCase().includes(searchTerm)
          );
          if (!matchesGlobal) return false;
        }

        // Applicant Name filter (multi-token; supports word-prefix matching)
        if (advancedSearch.name) {
          const name = (job.name || '').toLowerCase().normalize('NFKD');
          const nameWords = name.split(/\s+/).filter(Boolean);
          const tokens = advancedSearch.name
            .toLowerCase()
            .normalize('NFKD')
            .split(/[\,\s]+/)
            .map(t => t.trim())
            .filter(Boolean);
          const tokenMatches = (t: string) => name.includes(t) || nameWords.some(w => w.startsWith(t));
          const allTokensMatch = tokens.every(tokenMatches);
          if (!allTokensMatch) return false;
        }

        // Job ID filter (format tolerant + incremental typing friendly)
        if (advancedSearch.jobId) {
          const normalize = (s: string) => (s || '').toLowerCase();
          const stripNonAlnum = (s: string) => normalize(s).replace(/[^a-z0-9]/g, '');
          const toTokens = (s: string) => normalize(s).split(/[^a-z0-9]+/).filter(Boolean);

          const idStr = job.job_id || '';
          const idTokens = toTokens(idStr);
          const idFlat = stripNonAlnum(idStr);

          const searchStr = advancedSearch.jobId;
          const searchTokens = toTokens(searchStr);
          const searchFlat = stripNonAlnum(searchStr);

          // Fast path: flat contains check allows partial incremental typing
          if (searchFlat && !idFlat.includes(searchFlat)) {
            // fallback to tokenized substring match: each token must be contained in some id token
            const allContained = searchTokens.every(t => idTokens.some(tok => tok.includes(t)));
            if (!allContained) return false;
          }
        }

        // Application ID filter (format tolerant + incremental typing friendly)
        if (advancedSearch.applicantId) {
          const normalize = (s: string) => (s || '').toLowerCase();
          const stripNonAlnum = (s: string) => normalize(s).replace(/[^a-z0-9]/g, '');
          const toTokens = (s: string) => normalize(s).split(/[^a-z0-9]+/).filter(Boolean);

          const appIdStr = String(job.applicant_id || job.id || '');
          const appIdTokens = toTokens(appIdStr);
          const appIdFlat = stripNonAlnum(appIdStr);

          const searchStr = advancedSearch.applicantId;
          const searchTokens = toTokens(searchStr);
          const searchFlat = stripNonAlnum(searchStr);

          // Fast path: flat contains check allows partial incremental typing
          if (searchFlat && !appIdFlat.includes(searchFlat)) {
            // fallback to tokenized substring match: each token must be contained in some id token
            const allContained = searchTokens.every(t => appIdTokens.some(tok => tok.includes(t)));
            if (!allContained) return false;
          }
        }

        // Skills filter (supports multiple comma/space-separated skills; require all)
        if (advancedSearch.skills) {
          const jobSkillsStr = (job.skills || []).join(' ').toLowerCase();
          const wanted = advancedSearch.skills
            .toLowerCase()
            .split(/[,\s]+/)
            .map(s => s.trim())
            .filter(Boolean);
          const allSkillsMatch = wanted.every(s => jobSkillsStr.includes(s));
          if (!allSkillsMatch) return false;
        }

        // Status filter (supports multiple)
        if (advancedSearch.statusMulti && advancedSearch.statusMulti.length > 0) {
          if (!advancedSearch.statusMulti.includes(job.status || '')) return false;
        } else if (advancedSearch.status !== 'all') {
          if ((job.status || '') !== advancedSearch.status) return false;
        }

        // Job Category filter
        if (advancedSearch.jobCategory !== 'all') {
          if (job.jobCategory !== advancedSearch.jobCategory) {
            return false;
          }
        }

        // ATS Score range filter
        if (advancedSearch.atsScoreMin || advancedSearch.atsScoreMax) {
          const atsScore = job.ats_score || 0;
          const minScore = advancedSearch.atsScoreMin ? parseFloat(advancedSearch.atsScoreMin) : 0;
          const maxScore = advancedSearch.atsScoreMax ? parseFloat(advancedSearch.atsScoreMax) : 100;
          if (atsScore < minScore || atsScore > maxScore) {
            return false;
          }
        }

        // Date range filter (DateRangePicker)
        if (advancedDateRange[0] || advancedDateRange[1]) {
          const jobDate = new Date(job.created_at || job.date);
          if (advancedDateRange[0] && jobDate < advancedDateRange[0]!) return false;
          if (advancedDateRange[1]) {
            const to = new Date(advancedDateRange[1]!);
            to.setHours(23, 59, 59, 999);
            if (jobDate > to) return false;
          }
        }

        return true;
      });
    } catch (error) {
      console.error('Error in advanced search:', error);
      return jobs; // Return original jobs on error
    }
  }, [debouncedSearch, advancedSearch.name, advancedSearch.jobId, advancedSearch.applicantId, advancedSearch.skills, advancedSearch.status, advancedSearch.statusMulti, advancedSearch.jobCategory, advancedSearch.atsScoreMin, advancedSearch.atsScoreMax, advancedDateRange]);

  // Clear duplicate view when search changes
  // Note: isShowingDuplicates is intentionally NOT in dependency array to prevent infinite loop
  useEffect(() => {
    if (isShowingDuplicates) {
      setIsShowingDuplicates(false);
      setDuplicateCompositeKey(null);
      setDuplicateJobs([]);
      setSelectedDuplicateJob(null);
      setCurrentPage(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [advancedSearch.globalSearch, filterField, priorityFilter, timelineFilter]);

  // Apply search filtering when search query changes (with debounce)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (allJobs.length > 0) {
        applySearchFilter(allJobs);
      }
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [advancedSearch.globalSearch, allJobs, applySearchFilter]);

  // Clear duplicate view when custom date range changes
  useEffect(() => {
    if (isShowingDuplicates && (customDateRange[0] || customDateRange[1])) {
      setIsShowingDuplicates(false);
      setDuplicateCompositeKey(null);
      setDuplicateJobs([]);
      setSelectedDuplicateJob(null);
      setCurrentPage(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customDateRange]);

  // Clear duplicate view when date sort changes
  useEffect(() => {
    if (isShowingDuplicates) {
      setIsShowingDuplicates(false);
      setDuplicateCompositeKey(null);
      setDuplicateJobs([]);
      setSelectedDuplicateJob(null);
      setCurrentPage(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateSort]);

  // Clear duplicate view when rows per page changes
  useEffect(() => {
    if (isShowingDuplicates) {
      setIsShowingDuplicates(false);
      setDuplicateCompositeKey(null);
      setDuplicateJobs([]);
      setSelectedDuplicateJob(null);
      setCurrentPage(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rowsPerPage]);

  // Filter jobs based on filters
  const isJobSpecificFitActive = !!(activeFitJobId && Object.keys(fitScoreByApplicant).length > 0 && jobFitScoreResults?.candidates);
  const baseJobs = isJobSpecificFitActive
    ? jobs.filter((job) => {
      const id = job.applicant_id ? String(job.applicant_id) : '';
      return id && Object.prototype.hasOwnProperty.call(fitScoreByApplicant, id);
    })
    : jobs;

  // Jobs are already filtered by name/email in applyNameEmailFilter
  const filteredJobs = baseJobs
    .filter((job) => {
      if (priorityFilter === 'all') return true;
      const [min, max] = priorityFilter.split('-').map(Number);
      const priority = job.priority ?? 0;
      return priority >= min && priority <= max;
    })
    .filter((job) => {
      if (!timelineFilter || timelineFilter === 'all') return true;
      const jobDate = new Date(job.created_at || job.date);
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      const last12Hours = new Date(now.getTime() - 12 * 60 * 60 * 1000);
      const startOfWeek = new Date(today);
      const dayOfWeek = today.getDay();
      const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      startOfWeek.setDate(today.getDate() - daysToSubtract);
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfLastWeek = new Date(startOfWeek.getTime() - 7 * 24 * 60 * 60 * 1000);
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      switch (timelineFilter) {
        case 'today':
          return jobDate >= today;
        case 'yesterday':
          return jobDate >= yesterday && jobDate < today;
        case 'last12':
          return jobDate >= last12Hours;
        case 'thisweek':
          return jobDate >= startOfWeek;
        case 'thismonth':
          return jobDate >= startOfMonth;
        case 'lastweek':
          return jobDate >= startOfLastWeek && jobDate < startOfWeek;
        case 'lastmonth':
          return jobDate >= startOfLastMonth && jobDate < startOfMonth;
        case 'last30':
          return jobDate >= thirtyDaysAgo;
        case 'custom':
          if (customDateRange[0] && customDateRange[1]) {
            return jobDate >= customDateRange[0] && jobDate <= customDateRange[1];
          }
          return true;
        default:
          return true;
      }
    });

  // Apply advanced search filters with memoization
  const advancedFilteredJobs = useMemo(() => {
    return applyAdvancedSearch(filteredJobs);
  }, [filteredJobs, applyAdvancedSearch]);

  // Advanced sorting function
  const applyAdvancedSorting = useCallback((jobs: Job[]) => {
    return [...jobs].sort((a, b) => {
      let aValue: string | number, bValue: string | number;

      switch (advancedSearch.sortBy) {
        case 'name':
          aValue = (a.name || '').toLowerCase();
          bValue = (b.name || '').toLowerCase();
          break;
        case 'email':
          aValue = (a.email || '').toLowerCase();
          bValue = (b.email || '').toLowerCase();
          break;
        case 'ats_score':
          aValue = a.ats_score || 0;
          bValue = b.ats_score || 0;
          break;
        case 'priority':
          aValue = a.priority || 0;
          bValue = b.priority || 0;
          break;
        case 'status':
          aValue = (a.status || '').toLowerCase();
          bValue = (b.status || '').toLowerCase();
          break;
        case 'date':
        default:
          aValue = new Date(a.created_at || a.date || 0).getTime();
          bValue = new Date(b.created_at || b.date || 0).getTime();
          break;
      }

      if (aValue < bValue) return advancedSearch.sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return advancedSearch.sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [advancedSearch.sortBy, advancedSearch.sortOrder]);

  // Sorting by date (most recent first). If dates are equal/missing, fall back to Applicant ID numeric (highest first)
  // Use advanced sorting if advanced search is active, otherwise use legacy sorting
  const sortedJobs = useMemo(() => {
    // If advanced search has sort settings, use them
    if (advancedSearch.sortBy && showAdvancedSearch) {
      return applyAdvancedSorting(advancedFilteredJobs);
    }

    // Otherwise use legacy date sorting
    const sorted = [...advancedFilteredJobs];
    sorted.sort((a, b) => {
      const aDate = new Date(a.created_at || a.date || 0).getTime();
      const bDate = new Date(b.created_at || b.date || 0).getTime();

      // Respect explicit dateSort if user set it; otherwise default to newest first
      if (dateSort !== 'none') {
        return dateSort === 'asc' ? aDate - bDate : bDate - aDate;
      }

      if (aDate !== bDate) {
        return bDate - aDate; // Default: newest first
      }

      // Tie-breaker: use numeric portion of applicant_id/id (highest first)
      const extractNumeric = (val?: string) => {
        const match = String(val || '').match(/(\d+)/g);
        if (!match || match.length === 0) return -Infinity;
        return Number.parseInt(match[match.length - 1], 10);
      };

      const aNum = extractNumeric(a.applicant_id || a.id);
      const bNum = extractNumeric(b.applicant_id || b.id);
      if (aNum !== bNum) return bNum - aNum;

      // Final fallback: higher weighted score first to keep results stable
      const aScore = a.weighted_skill_score || 0;
      const bScore = b.weighted_skill_score || 0;
      return bScore - aScore;
    });
    return sorted;
  }, [advancedFilteredJobs, advancedSearch.sortBy, showAdvancedSearch, dateSort, applyAdvancedSorting]);

  // Pagination
  const totalPages = Math.ceil((isShowingDuplicates ? duplicateJobs : sortedJobs).length / rowsPerPage);
  const currentJobs = (isShowingDuplicates ? duplicateJobs : sortedJobs).slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  // Keep current page in range whenever filters, data, or rowsPerPage change
  useEffect(() => {
    const totalItems = (isShowingDuplicates ? duplicateJobs : sortedJobs).length;
    const pages = Math.max(1, Math.ceil(totalItems / rowsPerPage));
    if (currentPage > pages) {
      setCurrentPage(pages);
    } else if (currentPage < 1) {
      setCurrentPage(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rowsPerPage, duplicateJobs.length, filteredJobs.length, sortedJobs.length, currentPage, isShowingDuplicates]);

  // --- Job Summary Counts ---
  const totalJobs = jobs.length;
  // const newJobs = jobs.filter(j => j.status?.toLowerCase() === 'new').length;
  // const pendingJobs = jobs.filter(j => j.status?.toLowerCase() === 'pending').length;
  // const closedJobs = jobs.filter(j => j.status?.toLowerCase() === 'closed' || j.status?.toLowerCase() === 'close').length;

  // Filter helper functions
  const hasActiveFilters = filterField !== 'all' || priorityFilter !== 'all' || (timelineFilter && timelineFilter !== '') ||
    advancedSearch.globalSearch || advancedSearch.name || advancedSearch.jobId || advancedSearch.applicantId ||
    advancedSearch.skills || (advancedSearch.status !== 'all') || (advancedSearch.statusMulti && advancedSearch.statusMulti.length > 0) ||
    (advancedSearch.jobCategory !== 'all') || advancedSearch.atsScoreMin || advancedSearch.atsScoreMax ||
    advancedDateRange[0] || advancedDateRange[1];

  const getActiveFilterCount = () => {
    let count = 0;
    // const active: string[] = []; // Currently unused
    if (filterField !== 'all') count++;
    if (priorityFilter !== 'all') count++;
    if (timelineFilter && timelineFilter !== '') count++;
    if (advancedSearch.globalSearch) count++;
    if (advancedSearch.name) count++;
    if (advancedSearch.jobId) count++;
    if (advancedSearch.applicantId) count++;
    if (advancedSearch.skills) count++;
    if ((advancedSearch.statusMulti && advancedSearch.statusMulti.length > 0) || (advancedSearch.status && advancedSearch.status !== 'all')) count++;
    if (advancedSearch.jobCategory && advancedSearch.jobCategory !== 'all') count++;
    if (advancedSearch.atsScoreMin || advancedSearch.atsScoreMax) count++;
    if (advancedDateRange[0] || advancedDateRange[1]) count++;
    return count;
  };

  const clearAllFilters = () => {
    setFilterField('all');
    setPriorityFilter('all');
    setTimelineFilter('');
    setCustomDateRange([null, null]);
    setAdvancedSearch({
      globalSearch: '',
      name: '',
      jobId: '',
      applicantId: '',
      skills: '',
      status: 'all',
      statusMulti: [],
      jobCategory: 'all',
      atsScoreMin: '',
      atsScoreMax: '',
      dateFrom: '',
      dateTo: '',
      sortBy: 'date',
      sortOrder: 'desc'
    });
    setAdvancedDateRange([null, null]);
    setShowAdvancedDatePicker(false);
    // Also clear duplicate view when filters are cleared
    if (isShowingDuplicates) {
      setIsShowingDuplicates(false);
      setDuplicateCompositeKey(null);
      setDuplicateJobs([]);
      setSelectedDuplicateJob(null);
      setCurrentPage(1);
    }
  };

  // Checkbox refs and handlers for "Select All"
  const selectAllRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = selectedRows.size > 0 && selectedRows.size < currentJobs.length;
    }
  }, [selectedRows, currentJobs]);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const allIds = currentJobs.map((job) => job.id);
      setSelectedRows(new Set(allIds));
    } else {
      setSelectedRows(new Set());
    }
  };

  const handleSelectRow = (e: React.ChangeEvent<HTMLInputElement>, id: string) => {
    const newSelectedRows = new Set(selectedRows);
    if (e.target.checked) {
      newSelectedRows.add(id);
    } else {
      newSelectedRows.delete(id);
    }
    setSelectedRows(newSelectedRows);
  };

  // Export functions to CSV and Excel
  const exportToCSV = () => {
    const dataToExport = isShowingDuplicates ? duplicateJobs : sortedJobs;
    const rowsToExport = selectedRows.size > 0 ? dataToExport.filter((job) => selectedRows.has(job.id)) : dataToExport;
    if (rowsToExport.length === 0) {
      alert('No data to export');
      return;
    }
    const headers = ['Applicant ID', 'Name', 'Email', 'Mobile', 'Job Category', 'Experience', 'Job Type', 'Priority', 'Date', 'Status'];
    const rows = rowsToExport.map((job) => [
      job.applicant_id || job.id,
      job.name,
      job.email,
      job.mobile,
      job.jobCategory,
      job.experience,
      job.job_type || '-',
      job.priority,
      job.date,
      (!job.status || job.status === 'Pending') ? 'Submitted' : job.status,
    ]);
    const csvContent =
      headers.join(',') +
      '\n' +
      rows.map((e) => e.map((val) => `"${(val ?? '').toString().replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const timestamp = `${pad(now.getDate())}-${pad(now.getMonth() + 1)}-${now.getFullYear()}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
    a.download = `jobs_export_${timestamp}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportToExcel = () => {
    const dataToExport = isShowingDuplicates ? duplicateJobs : sortedJobs;
    const rowsToExport = selectedRows.size > 0 ? dataToExport.filter((job) => selectedRows.has(job.id)) : dataToExport;
    if (rowsToExport.length === 0) {
      alert('No data to export');
      return;
    }
    const headers = ['Applicant ID', 'Name', 'Email', 'Mobile', 'Job Category', 'Experience', 'Job Type', 'Priority', 'Date', 'Status'];
    const rows = rowsToExport.map((job) => [
      job.applicant_id || job.id,
      job.name,
      job.email,
      job.mobile,
      job.jobCategory,
      job.experience,
      job.job_type || '-',
      job.priority,
      job.date,
      (!job.status || job.status === 'Pending') ? 'Submitted' : job.status,
    ]);
    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Jobs');
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const timestamp = `${pad(now.getDate())}-${pad(now.getMonth() + 1)}-${now.getFullYear()}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
    XLSX.writeFile(workbook, `jobs_export_${timestamp}.xlsx`);
  };

  // Resume view/download URLs

  const getViewUrl = async (job: Job): Promise<string> => {
    try {
      // Always use the direct view endpoint for viewing files
      // This endpoint will handle Content-Disposition: inline properly
      if (job.resumeFilename) {
        // Add timestamp to prevent browser caching issues
        const timestamp = Date.now();
        // Properly encode the filename for URL path
        const encodedFilename = encodeURIComponent(job.resumeFilename);
        return buildApiUrl(API_CONFIG.ENDPOINTS.JOBS_VIEW(encodedFilename)) + `?t=${timestamp}`;
      }

      // If no filename, try resume_link as fallback
      if (job.resume_link && job.resume_link.startsWith('https://')) {
        return job.resume_link;
      }

      return '';
    } catch (error) {
      console.error('Failed to get view URL:', error);
      return '';
    }
  };
  // const getDownloadUrl = (job: Job): string => { // Currently unused
  //   if (job.resume_link && job.resume_link.startsWith('https://')) {
  //     return job.resume_link;
  //   }
  //   return job.resumeFilename ? buildApiUrl(API_CONFIG.ENDPOINTS.JOBS_DOWNLOAD(job.resumeFilename)) : '';
  // };

  // Component for handling presigned URL viewing
  const PresignedViewLink = ({ job, children, className, title }: {
    job: Job;
    children: React.ReactNode;
    className?: string;
    title?: string;
  }) => {
    const [viewUrl, setViewUrl] = React.useState<string>('');
    const [isLoading, setIsLoading] = React.useState(false);

    React.useEffect(() => {
      const fetchViewUrl = async () => {
        setIsLoading(true);
        try {
          const url = await getViewUrl(job);
          setViewUrl(url);
        } catch (error) {
          console.error('Failed to get view URL:', error);
          setViewUrl('');
        } finally {
          setIsLoading(false);
        }
      };

      fetchViewUrl();
      // Use stable identifiers instead of entire job object to prevent infinite loops
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [job.id, job.applicant_id, job.resumeFilename, job.resume_link]);

    const handleView = () => {
      if (viewUrl) {
        // For PDFs and other viewable files, open in new tab
        // The backend will set proper Content-Disposition: inline headers
        window.open(viewUrl, '_blank');
      }
    };

    if (isLoading) {
      return (
        <button className={`${className} opacity-50 cursor-not-allowed`} title="Loading..." disabled>
          {children}
        </button>
      );
    }

    return (
      <button
        onClick={handleView}
        className={className}
        title={title}
        disabled={!viewUrl}
      >
        {children}
      </button>
    );
  };

  // Component for handling presigned URL downloads
  const PresignedDownloadLink = ({ job, children, className, title }: {
    job: Job;
    children: React.ReactNode;
    className?: string;
    title?: string;
  }) => {
    const [downloadUrl, setDownloadUrl] = React.useState<string>('');
    const [isLoading, setIsLoading] = React.useState(false);

    React.useEffect(() => {
      const fetchDownloadUrl = async () => {
        setIsLoading(true);
        try {
          // Always use the direct download endpoint for proper filename formatting
          if (job.resumeFilename) {
            const url = buildApiUrl(API_CONFIG.ENDPOINTS.JOBS_DOWNLOAD(job.resumeFilename));
            setDownloadUrl(url);
          } else {
            setDownloadUrl('');
          }
        } catch (error) {
          console.error('Failed to get download URL:', error);
          setDownloadUrl('');
        } finally {
          setIsLoading(false);
        }
      };

      fetchDownloadUrl();
      // Use stable identifiers instead of entire job object to prevent infinite loops
      // Use stable identifiers instead of entire job object to prevent infinite loops
    }, [job.id, job.applicant_id, job.resumeFilename]);

    if (isLoading) {
      return (
        <span className={`${className} opacity-50 cursor-not-allowed`} title="Loading...">
          {children}
        </span>
      );
    }

    return (
      <a
        href={downloadUrl}
        download
        target="_blank"
        rel="noopener noreferrer"
        className={className}
        title={title}
        onClick={(e) => {
          if (!downloadUrl) {
            e.preventDefault();
          }
        }}
      >
        {children}
      </a>
    );
  };

  // Download modal submit handler
  const handleDownload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!downloadForm.fileFormat) {
      alert('Please select a file format');
      return;
    }
    if (downloadForm.fileFormat === 'csv') {
      exportToCSV();
    } else {
      exportToExcel();
    }
    setShowDownloadModal(false);
  };

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
            name: data.extracted_fields?.name || data.name || (selectedAnalysis as Record<string, unknown>)?.name || 'Unknown',
            email: (data.extracted_fields?.email && data.extracted_fields.email !== 'Not provided')
              ? data.extracted_fields.email
              : (data.email && data.email !== 'Not provided'
                ? data.email
                : ((selectedAnalysis as Record<string, unknown>)?.email || 'Not provided')),
            phone: (data.extracted_fields?.phone && data.extracted_fields.phone !== 'Not provided')
              ? data.extracted_fields.phone
              : (data.extracted_fields?.mobile && data.extracted_fields.mobile !== 'Not provided'
                ? data.extracted_fields.mobile
                : (data.mobile && data.mobile !== 'Not provided'
                  ? data.mobile
                  : ((selectedAnalysis as Record<string, unknown>)?.mobile || 'Not provided'))),
            location: (data.extracted_fields?.location && data.extracted_fields.location !== 'Not specified')
              ? data.extracted_fields.location
              : (data.location && data.location !== 'Not specified'
                ? data.location
                : ((selectedAnalysis as Record<string, unknown>)?.location || 'Not specified')),
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
  }, [selectedAnalysis]);

  // Download Resume Analysis Report as PDF
  const downloadResumeAnalysis = async (analysis: { id?: string; applicant_id?: string;[key: string]: unknown }, fields: { name?: string;[key: string]: unknown }) => {
    if (!analysis || !fields) {
      alert('No analysis data available to download');
      return;
    }

    // Prevent multiple downloads
    if (isDownloadingResumeAnalysis) {
      return;
    }

    // Get applicant details - prioritize applicant_id over id for backend compatibility
    // The analysis.id might contain applicant_id (from setSelectedAnalysis logic), but check applicant_id first
    const applicantId = (analysis.applicant_id || analysis.id || 'N/A').toString();

    if (applicantId === 'N/A') {
      alert('Applicant ID not available. Cannot download report.');
      return;
    }

    try {
      // Set downloading state
      setIsDownloadingResumeAnalysis(true);

      // Call backend API to generate PDF
      const reportUrl = buildApiUrl(API_CONFIG.ENDPOINTS.JOBS_RESUME_ANALYSIS_PDF(applicantId));
      console.log('[DEBUG] Downloading resume analysis PDF for applicant:', applicantId);
      console.log('[DEBUG] API URL:', reportUrl);
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

  // Modal form submit handler - each field validates independently
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prevent multiple submissions
    if (isSubmitting) {
      return;
    }

    // Clear any previous messages
    setSubmitMessage(null);

    // Validate each field independently and set individual error states
    let hasErrors = false;

    // Name validation
    const nameValidation = validateName(name);
    if (nameValidation !== true) {
      setNameError(nameValidation as string);
      hasErrors = true;
    } else {
      setNameError('');
    }

    // Email validation
    if (!email.trim()) {
      setEmailError('Please enter your email address.');
      hasErrors = true;
    } else {
      const emailValidation = validateEmail(email);
      if (emailValidation !== true) {
        setEmailError(emailValidation as string);
        hasErrors = true;
      } else {
        setEmailError('');
      }
    }

    // Phone validation
    if (!phone) {
      setPhoneError('Please enter your phone number.');
      hasErrors = true;
    } else {
      const cleanPhone = '+' + phone.replace(/[^\d]/g, '').replace(/^\+/, '');
      if (!isValidPhoneNumber(cleanPhone)) {
        setPhoneError('Please enter a valid international phone number.');
        hasErrors = true;
      } else {
        setPhoneError('');
      }
    }

    // Resume validation
    if (!resume) {
      setResumeError('Please upload your resume.');
      hasErrors = true;
    } else {
      setResumeError('');
    }

    // Category-based validation
    if (applicationMethod === 'category') {
      if (!category) {
        setCategoryError('Please select a category.');
        hasErrors = true;
      } else {
        setCategoryError('');
      }

      // Experience validation
      if (!experience) {
        setExperienceError('Please select your experience level.');
        hasErrors = true;
      } else {
        setExperienceError('');
      }

      // Job Type validation
      if (!jobType) {
        setJobTypeError('Please select a job type.');
        hasErrors = true;
      } else {
        setJobTypeError('');
      }
    } else {
      // JD-based validation
      if (!selectedJobIdForApplication) {
        setCategoryError('Please select a job listing.');
        hasErrors = true;
      } else {
        setCategoryError('');
      }
    }

    // If any field has errors, don't submit
    if (hasErrors) {
      return;
    }

    // Set submitting state to prevent multiple submissions
    setIsSubmitting(true);

    const formData = new FormData();
    formData.append('name', name);
    formData.append('email', email);
    formData.append('mobile', phone);

    if (applicationMethod === 'category') {
      formData.append('job_category', category);
      formData.append('experience', experience);
      formData.append('job_type', jobType);
    } else {
      // For JD-based applications, get job details from selected job
      const selectedJob = availableJobsForApplication.find(job => job.job_id === selectedJobIdForApplication);
      if (selectedJob) {
        formData.append('job_category', selectedJob.title || category || '');
        formData.append('experience', selectedJob.experience_level || experience || '');
        formData.append('job_type', selectedJob.job_type || jobType || '');
        formData.append('job_id', selectedJob.job_id || '');
      }
    }

    if (resume) {
      formData.append('file', resume as File);
    }

    try {
      const res = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.JOBS_UPLOAD), {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        setSubmitMessage({ type: 'success', message: 'Application submitted successfully! We will review your application and get back to you soon.' });

        // Clear form after successful submission
        setTimeout(() => {
          setShowJobAppModal(false);
          fetchJobs();
          setName('');
          setEmail('');
          setPhone('');
          setResume(null);
          setCategory('');
          setExperience('');
          setJobType('');
          setApplicationMethod('category');
          setSelectedJobIdForApplication('');
          setNameError('');
          setEmailError('');
          setPhoneError('');
          setCategoryError('');
          setExperienceError('');
          setJobTypeError('');
          setResumeError('');
          setSubmitMessage(null);
          setIsSubmitting(false);
        }, 2000); // Show success message for 2 seconds before closing
      } else {
        // Handle different error status codes
        let errorData;
        try {
          errorData = await res.json();
        } catch {
          errorData = null;
        }

        if (res.status === 422 && errorData) {
          // Handle 3-stage resume classification rejection
          const { message, applicant_id, classification_details, requirements, next_steps } = errorData;

          setSubmitMessage({
            type: 'error',
            message: `The uploaded document does not appear to be a valid Resume or CV`,
            details: {
              reason: message,
              // Note: applicant_id is null for rejected applications (no valid application created)
              applicant_id: applicant_id || null,
              classification_details: classification_details,
              requirements: requirements,
              next_steps: next_steps
            }
          });
        } else if (res.status >= 500) {
          setSubmitMessage({ type: 'error', message: 'Server error occurred. Please try again later.' });
        } else {
          setSubmitMessage({ type: 'error', message: errorData?.message || 'Failed to submit application. Please try again.' });
        }
        setIsSubmitting(false);
      }
    } catch {
      setSubmitMessage({ type: 'error', message: 'Error submitting application. Please check your connection and try again.' });
      setIsSubmitting(false);
    }
  };

  // Handle Escape key to close modals
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowJobAppModal(false);
        setShowAnalysisModal(false);
        setShowJobSelectionModal(false);
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  const openJobAppModal = () => {
    setShowJobAppModal(true);
    setSubmitMessage(null); // Clear any previous messages
    fetchJobListings(); // Fetch job listings when modal opens
    // Clear all individual field errors
    setNameError('');
    setEmailError('');
    setPhoneError('');
    setCategoryError('');
    setExperienceError('');
    setJobTypeError('');
    setResumeError('');
  };

  const closeJobAppModal = () => {
    setShowJobAppModal(false);
    setSubmitMessage(null); // Clear any previous messages
    setIsSubmitting(false); // Reset submission state
  };

  // Dropdown toggles for applicant form inputs
  const [openCategoryDropdown, setOpenCategoryDropdown] = useState(false);
  const [openExperienceDropdown, setOpenExperienceDropdown] = useState(false);
  const [openJobTypeDropdown, setOpenJobTypeDropdown] = useState(false);
  const [openJobDropdown, setOpenJobDropdown] = useState(false);

  return (
    <>
      <div className="w-full min-h-screen p-0 m-0 font-sans bg-gray-50 dark:bg-gray-900">
        {/* Unified Dashboard Header (uses imported DashboardHeader to resolve lint) */}
        <div className="mx-4 md:mx-6 mt-6 mb-8">
          <DashboardHeader
            title="Jobs"
            subtitle="Manage and track job applications with comprehensive filtering and AI-powered analysis."
            icon={Briefcase}
            gradientFrom="from-blue-900"
            gradientTo="to-indigo-800"
            actions={undefined}
          />
        </div>
        {/* Reimagined Hero Header */}
        <header className="relative overflow-hidden bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 rounded-3xl shadow-2xl mb-8">
          {/* Animated Background */}
          <div className="absolute inset-0">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 via-purple-500/20 to-pink-500/20"></div>
            <div className="absolute top-0 left-0 w-full h-full">
              <svg className="w-full h-full opacity-20" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                    <path d="M 10 0 L 0 0 0 10" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-white/30" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />
              </svg>
            </div>

            {/* Floating Geometric Shapes */}
            <div className="absolute top-10 right-10 w-32 h-32 bg-gradient-to-br from-blue-400/30 to-purple-400/30 rounded-full blur-xl animate-pulse"></div>
            <div className="absolute bottom-10 left-10 w-24 h-24 bg-gradient-to-br from-pink-400/30 to-orange-400/30 rounded-full blur-lg animate-pulse delay-1000"></div>
            <div className="absolute top-1/2 right-1/4 w-16 h-16 bg-gradient-to-br from-green-400/20 to-blue-400/20 rounded-full blur-md animate-pulse delay-500"></div>
          </div>



          {/* Help Panel */}
          {showHelp && (
            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
              <div className="text-sm text-blue-800 dark:text-blue-200">
                <h3 className="font-semibold mb-2">Quick Tips:</h3>
                <ul className="space-y-1">
                  <li>• Use filters to find specific job applications</li>
                  <li>• Select multiple jobs for bulk actions</li>
                  <li>• Click on resume links to view or download files</li>
                  <li>• Use the search to find jobs by name, email, or mobile</li>
                  <li>• Export selected or all jobs to CSV/Excel</li>
                </ul>
              </div>
            </div>
          )}
        </header>

        {/* Reimagined Interactive KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
          {/* Total Applications - Interactive Card */}
          <div className="group relative overflow-hidden bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-900/10 dark:via-indigo-900/10 dark:to-purple-900/10 rounded-3xl border border-blue-200/50 dark:border-blue-700/50 shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-500 ease-out cursor-pointer">
            {/* Animated Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-indigo-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full blur-2xl group-hover:scale-110 transition-transform duration-500"></div>

            <div className="relative p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="relative">
                  <div className="p-4 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="m22 21-2-2" />
                      <path d="M16 16h6" />
                    </svg>
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
                    {totalJobs}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 font-medium">applications</div>
                </div>
                <div className="text-lg font-semibold text-gray-700 dark:text-gray-300">Total Applications</div>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                    {jobs.filter(j => {
                      const jobDate = new Date(j.date);
                      const now = new Date();
                      return jobDate.getMonth() === now.getMonth() && jobDate.getFullYear() === now.getFullYear();
                    }).length} this month
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">+12% vs last month</div>
                </div>
              </div>
            </div>
          </div>

          {/* Most Applied Jobs - Interactive Card */}
          <div className="group relative overflow-hidden bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 dark:from-emerald-900/10 dark:via-teal-900/10 dark:to-cyan-900/10 rounded-3xl border border-emerald-200/50 dark:border-emerald-700/50 shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-500 ease-out cursor-pointer">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-teal-500/10 to-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-400/20 to-cyan-400/20 rounded-full blur-2xl group-hover:scale-110 transition-transform duration-500"></div>

            <div className="relative p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="relative">
                  <div className="p-4 bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3v18h18" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 15v3M11 10v8M15 12v6M19 7v11" />
                    </svg>
                  </div>
                  <div className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-r from-orange-400 to-red-500 rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold uppercase tracking-wider">Trending</div>
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse mt-1"></div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-baseline gap-2">
                  <div className="text-4xl font-bold text-gray-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors duration-300">
                    {mostAppliedTotal}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 font-medium">jobs</div>
                </div>
                <div className="text-lg font-semibold text-gray-700 dark:text-gray-300">Most Applied Jobs</div>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-emerald-600 dark:text-emerald-400 font-medium truncate max-w-32" title={mostAppliedLine}>
                    {mostAppliedJobs.length > 0 ? mostAppliedLine : 'No data available'}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">+8% vs last week</div>
                </div>
              </div>
            </div>
          </div>

          {/* ATS Analysis Status - Interactive Card */}
          <div className="group relative overflow-hidden bg-gradient-to-br from-blue-50 via-blue-50 to-blue-50 dark:from-blue-900/10 dark:via-blue-900/10 dark:to-blue-900/10 rounded-3xl border border-blue-200/50 dark:border-blue-700/50 shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-500 ease-out cursor-pointer">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-blue-500/10 to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-400/20 to-fuchsia-400/20 rounded-full blur-2xl group-hover:scale-110 transition-transform duration-500"></div>

            <div className="relative p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="relative">
                  <div className="p-4 bg-gradient-to-br from-purple-500 via-violet-500 to-fuchsia-500 rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
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
                    {jobs.filter(j => j.ats_score).length}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 font-medium">analyzed</div>
                </div>
                <div className="text-lg font-semibold text-gray-700 dark:text-gray-300">ATS Analyzed</div>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                    Avg: {jobs.filter(j => j.ats_score).length > 0
                      ? Math.round(jobs.filter(j => j.ats_score).reduce((sum, j) => sum + (j.ats_score || 0), 0) / jobs.filter(j => j.ats_score).length)
                      : 0
                    }%
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">+15% efficiency</div>
                </div>
              </div>
            </div>
          </div>

          {/* Active Job Openings - Interactive Card */}
          <div className="group relative overflow-hidden bg-gradient-to-br from-blue-50 via-blue-50 to-blue-50 dark:from-blue-900/10 dark:via-blue-900/10 dark:to-blue-900/10 rounded-3xl border border-blue-200/50 dark:border-blue-700/50 shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-500 ease-out cursor-pointer">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-blue-500/10 to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-green-400/20 to-teal-400/20 rounded-full blur-2xl group-hover:scale-110 transition-transform duration-500"></div>

            <div className="relative p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="relative">
                  <div className="p-4 bg-gradient-to-br from-green-500 via-emerald-500 to-teal-500 rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-blue-600 dark:text-blue-400 font-semibold uppercase tracking-wider">Active</div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse mt-1"></div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-baseline gap-2">
                  <div className="text-4xl font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300">
                    {availableJobs?.filter(job => job.title && job.title.trim() !== '').length || 0}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 font-medium">openings</div>
                </div>
                <div className="text-lg font-semibold text-gray-700 dark:text-gray-300">Active Job Openings</div>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                    {availableJobs?.filter(job => job.title && job.title.trim() !== '').length > 0 ? 'Currently hiring' : 'No openings available'}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">+3 new this week</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Control Bar */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 mb-8">
          <NotificationContainer />

          {/* Main Control Row */}
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
            {/* Search Section */}
            <div className="flex-1 w-full lg:w-auto">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder={filterField === 'all' ? 'Search by Name or Email...' : `Search by ${filterField === 'jobCategory' ? 'Job Category' : filterField === 'mobile' ? 'Mobile' : filterField.charAt(0).toUpperCase() + filterField.slice(1)}...`}
                  value={advancedSearch.globalSearch}
                  onChange={(e) => setAdvancedSearch(prev => ({ ...prev, globalSearch: e.target.value }))}
                  className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3 items-center">
              {/* Filters Button */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`px-4 py-3 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-600 transition-all duration-200 border-2 border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 flex items-center justify-center gap-2 text-sm w-auto font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none ${showFilters
                  ? 'bg-gray-100 dark:bg-gray-600 border-gray-300 dark:border-gray-500'
                  : ''
                  }`}
                title={showFilters ? "Hide filters" : "Show filters"}
                aria-label={showFilters ? "Hide filters" : "Show filters"}
                aria-expanded={showFilters}
                type="button"
              >
                <Filter className="w-5 h-5" aria-hidden="true" />
                <span className="hidden sm:inline">Filters</span>
                {getActiveFilterCount() > 0 && (
                  <span className="bg-blue-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {getActiveFilterCount()}
                  </span>
                )}
                <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''} hidden sm:block`} aria-hidden="true" />
              </button>

              {/* Clear Filters Button */}
              {hasActiveFilters && (
                <button
                  onClick={clearAllFilters}
                  className="flex items-center gap-2 px-3 py-3 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <X className="w-4 h-4" />
                  <span className="hidden sm:inline">Clear</span>
                </button>
              )}

              {/* Download Button */}
              <button
                onClick={() => setShowDownloadModal(true)}
                className="flex items-center gap-2 px-4 py-3 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-600 transition-all duration-200 border-2 border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500"
                title="Download"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 16.5V18a2.25 2.25 0 0 0 2.25 2.25h13.5A2.25 2.25 0 0 0 21 18v-1.5M7.5 12l4.5 4.5m0 0l4.5-4.5m-4.5 4.5V3" />
                </svg>
                <span className="hidden sm:inline">Download</span>
              </button>

              {/* Refresh Button */}
              <button
                onClick={async () => {
                  setLoading(true);
                  await fetchJobs();
                  setLoading(false);
                }}
                className="flex items-center gap-2 px-4 py-3 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-600 transition-all duration-200 border-2 border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Refresh"
                disabled={loading}
              >
                {loading ? (
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.5 12a7.5 7.5 0 0 1 13.36-4.45M19.5 12a7.5 7.5 0 0 1-13.36 4.45m0 0V15m0-1.45H7m10-8.9V9m0-1.45h-1.45" />
                  </svg>
                )}
                <span className="hidden sm:inline">Refresh</span>
              </button>



              {/* Upload Button */}
              <button
                onClick={() => setShowUploadPopup(true)}
                className="flex items-center gap-2 px-4 py-3 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-600 transition-all duration-200 border-2 border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 shadow-sm hover:shadow-md"
                title="AI Upload Assistant"
              >
                <Upload className="w-5 h-5" />
                <span className="hidden sm:inline">Upload</span>
              </button>

              {/* New Button */}
              <button
                onClick={openJobAppModal}
                className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                title="Add New Application"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                <span className="hidden sm:inline">New</span>
              </button>

              {/* View Mode Toggle - Elegant Unified Segmented Control */}
              <div className="relative inline-flex items-center bg-gray-100 dark:bg-gray-700/50 rounded-2xl p-1.5 shadow-inner transition-shadow duration-200">
                {/* Active Background Slider - Blue Gradient */}
                <div
                  className={`absolute top-1.5 bottom-1.5 rounded-xl bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 dark:from-blue-600 dark:via-blue-700 dark:to-blue-800 shadow-lg transition-all duration-300 ease-out pointer-events-none ${currentView === 'list' ? 'left-1.5 right-1/2' : 'left-1/2 right-1.5'
                    }`}
                  aria-hidden="true"
                />

                {/* List View Option */}
                <button
                  type="button"
                  onClick={() => setCurrentView('list')}
                  className={`relative flex items-center gap-2.5 px-5 py-2.5 rounded-xl transition-all duration-200 ease-out z-10 min-w-[110px] justify-center group cursor-pointer select-none ${currentView === 'list'
                    ? 'text-white font-semibold'
                    : 'text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10 active:scale-95'
                    }`}
                  aria-label="Switch to list view"
                  aria-pressed={currentView === 'list'}
                >
                  <svg
                    className={`w-5 h-5 transition-all duration-200 ${currentView === 'list'
                      ? 'scale-110 drop-shadow-sm'
                      : 'scale-100 group-hover:scale-110'
                      }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth={currentView === 'list' ? 2.5 : 2}
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 17.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                  </svg>
                  <span className={`text-sm font-medium transition-all duration-200 ${currentView !== 'list' ? 'group-hover:font-semibold' : ''
                    }`}>List</span>
                </button>

                {/* Table View Option */}
                <button
                  type="button"
                  onClick={() => setCurrentView('table')}
                  className={`relative flex items-center gap-2.5 px-5 py-2.5 rounded-xl transition-all duration-200 ease-out z-10 min-w-[110px] justify-center group cursor-pointer select-none ${currentView === 'table'
                    ? 'text-white font-semibold'
                    : 'text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10 active:scale-95'
                    }`}
                  aria-label="Switch to table view"
                  aria-pressed={currentView === 'table'}
                >
                  <svg
                    className={`w-5 h-5 transition-all duration-200 ${currentView === 'table'
                      ? 'scale-110 drop-shadow-sm'
                      : 'scale-100 group-hover:scale-110'
                      }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth={currentView === 'table' ? 2.5 : 2}
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 5.25h16.5m-16.5 4.5h16.5m-16.5 4.5h16.5m-16.5 4.5h16.5" />
                  </svg>
                  <span className={`text-sm font-medium transition-all duration-200 ${currentView !== 'table' ? 'group-hover:font-semibold' : ''
                    }`}>Table</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Panel - Now placed below search bar, above cards */}
        {showFilters && (
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700 p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Filter Field</label>
                <select
                  value={filterField}
                  onChange={(e) => setFilterField(e.target.value as 'all' | 'applicant_id' | 'name' | 'email' | 'mobile' | 'jobCategory' | 'job_id' | 'experience' | 'job_type' | 'priority' | 'date' | 'status' | 'ats_score')}
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none transition-all duration-200 appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27currentColor%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3e%3cpolyline points=%276 9 12 15 18 9%27%3e%3c/polyline%3e%3c/svg%3e')] bg-[length:16px_16px] bg-[right_12px_center] bg-no-repeat pr-10"
                  aria-label="Filter field"
                >
                  <option value="all">Select Field</option>
                  <option value="applicant_id">Application ID</option>
                  <option value="name">Name</option>
                  <option value="email">Email</option>
                  <option value="mobile">Mobile</option>
                  <option value="jobCategory">Job Category</option>
                  <option value="job_id">Job ID</option>
                  <option value="experience">Experience</option>
                  <option value="job_type">Job Type</option>
                  <option value="priority">Priority</option>
                  <option value="date">Date</option>
                  <option value="status">Status</option>
                  <option value="ats_score">ATS Score</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Priority</label>
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none transition-all duration-200 appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27currentColor%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3e%3cpolyline points=%276 9 12 15 18 9%27%3e%3c/polyline%3e%3c/svg%3e')] bg-[length:16px_16px] bg-[right_12px_center] bg-no-repeat pr-10"
                  aria-label="Priority filter"
                >
                  <option value="all">All Priorities</option>
                  <option value="0-20">0-20</option>
                  <option value="21-40">21-40</option>
                  <option value="41-60">41-60</option>
                  <option value="61-80">61-80</option>
                  <option value="81-100">81-100</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Timeline</label>
                <div className="relative">
                  <select
                    className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none transition-all duration-200 appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27currentColor%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3e%3cpolyline points=%276 9 12 15 18 9%27%3e%3c/polyline%3e%3c/svg%3e')] bg-[length:16px_16px] bg-[right_12px_center] bg-no-repeat pr-10"
                    value={timelineFilter}
                    onChange={(e) => {
                      const val = e.target.value;
                      setTimelineFilter(val);
                      if (val !== 'custom') {
                        setCustomDateRange([null, null]);
                      }
                    }}
                    aria-label="Timeline filter"
                  >
                    <option value="">Select Timeline</option>
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
                {timelineFilter === 'custom' && (
                  <div className="mt-3">
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <div
                          className="absolute inset-y-0 left-0 flex items-center pl-3 z-10 cursor-pointer"
                          onClick={(e) => {
                            const input = e.currentTarget.nextElementSibling as HTMLInputElement;
                            if (input) {
                              input.focus();
                              input.click();
                              // Try to open the date picker if supported
                              if (input.showPicker && typeof input.showPicker === 'function') {
                                try {
                                  input.showPicker();
                                } catch {
                                  // Fallback: just focus and click
                                  input.focus();
                                }
                              }
                            }
                          }}
                        >
                          <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M20 4a2 2 0 0 0-2-2h-2V1a1 1 0 0 0-2 0v1h-3V1a1 1 0 0 0-2 0v1H6V1a1 1 0 0 0-2 0v1H2a2 2 0 0 0-2 2v2h20V4ZM0 18a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8H0v10Zm5-8h10a1 1 0 0 1 0 2H5a1 1 0 0 1 0-2Z" />
                          </svg>
                        </div>
                        <input
                          type="date"
                          id="start-date-input"
                          value={customDateRange[0] ? customDateRange[0].toISOString().split('T')[0] : ''}
                          onChange={(e) => setCustomDateRange([e.target.value ? new Date(e.target.value) : null, customDateRange[1]])}
                          onClick={(e) => {
                            // Ensure the date picker opens when clicking anywhere on the input
                            const input = e.currentTarget;
                            if (input.showPicker && typeof input.showPicker === 'function') {
                              try {
                                input.showPicker();
                              } catch {
                                // Browser doesn't support showPicker, native date picker will open on click
                              }
                            }
                          }}
                          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none transition-all duration-200 text-sm cursor-pointer"
                          aria-label="Start date"
                        />
                      </div>
                      <span className="text-gray-500 dark:text-gray-400 text-sm">to</span>
                      <div className="relative flex-1">
                        <div
                          className="absolute inset-y-0 left-0 flex items-center pl-3 z-10 cursor-pointer"
                          onClick={(e) => {
                            const input = e.currentTarget.nextElementSibling as HTMLInputElement;
                            if (input) {
                              input.focus();
                              input.click();
                              // Try to open the date picker if supported
                              if (input.showPicker && typeof input.showPicker === 'function') {
                                try {
                                  input.showPicker();
                                } catch {
                                  // Fallback: just focus and click
                                  input.focus();
                                }
                              }
                            }
                          }}
                        >
                          <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M20 4a2 2 0 0 0-2-2h-2V1a1 1 0 0 0-2 0v1h-3V1a1 1 0 0 0-2 0v1H6V1a1 1 0 0 0-2 0v1H2a2 2 0 0 0-2 2v2h20V4ZM0 18a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8H0v10Zm5-8h10a1 1 0 0 1 0 2H5a1 1 0 0 1 0-2Z" />
                          </svg>
                        </div>
                        <input
                          type="date"
                          id="end-date-input"
                          value={customDateRange[1] ? customDateRange[1].toISOString().split('T')[0] : ''}
                          onChange={(e) => setCustomDateRange([customDateRange[0], e.target.value ? new Date(e.target.value) : null])}
                          onClick={(e) => {
                            // Ensure the date picker opens when clicking anywhere on the input
                            const input = e.currentTarget;
                            if (input.showPicker && typeof input.showPicker === 'function') {
                              try {
                                input.showPicker();
                              } catch {
                                // Browser doesn't support showPicker, native date picker will open on click
                              }
                            }
                          }}
                          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none transition-all duration-200 text-sm cursor-pointer"
                          aria-label="End date"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            {/* Active Filters Display - Now inside the filter panel */}
            {getActiveFilterCount() > 0 && (
              <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Active filters:</span>
                  {filterField !== 'all' && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200">
                      Filter Field: {filterField === 'jobCategory' ? 'Job Category' : filterField === 'job_id' ? 'Job ID' : filterField === 'applicant_id' ? 'Application ID' : filterField === 'job_type' ? 'Job Type' : filterField === 'ats_score' ? 'ATS Score' : filterField.charAt(0).toUpperCase() + filterField.slice(1)}
                    </span>
                  )}
                  {priorityFilter !== 'all' && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200">
                      Priority: {priorityFilter}
                    </span>
                  )}
                  {timelineFilter && timelineFilter !== '' && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200">
                      Timeline: {timelineFilter === 'last12' ? 'Last 12 Hours' : timelineFilter === 'thisweek' ? 'This Week' : timelineFilter === 'lastweek' ? 'Last Week' : timelineFilter === 'thismonth' ? 'This Month' : timelineFilter === 'lastmonth' ? 'Last Month' : timelineFilter === 'last30' ? 'Last 30 Days' : timelineFilter.charAt(0).toUpperCase() + timelineFilter.slice(1)}
                    </span>
                  )}
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
                onClick={() => setShowFilters(false)}
                className="px-4 py-2 rounded-full text-sm bg-blue-600 hover:bg-blue-700 text-white transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none font-medium shadow-sm hover:shadow-md"
                type="button"
                aria-label="Apply filters"
              >
                Apply Filters
              </button>
            </div>
          </div>
        )}

        {/* Advanced Search Panel */}
        {showAdvancedSearch && (
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow mb-6 hover:shadow-lg transition-all duration-300 ease-in-out">
            <div className="px-3 sm:px-4 lg:px-6 py-4 sm:py-6">
              <div className="grid grid-cols-12 gap-3 sm:gap-4">
                {/* Job ID */}
                <div className="space-y-2 col-span-12 sm:col-span-6 lg:col-span-4 xl:col-span-3">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Job ID</label>
                  <input
                    type="text"
                    placeholder="e.g. JOB-2025-001"
                    value={advancedSearch.jobId}
                    onChange={(e) => setAdvancedSearch(prev => ({ ...prev, jobId: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>

                {/* Application ID */}
                <div className="space-y-2 col-span-12 sm:col-span-6 lg:col-span-4 xl:col-span-3">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Application ID</label>
                  <input
                    type="text"
                    placeholder="e.g. JOB-APP-001"
                    value={advancedSearch.applicantId}
                    onChange={(e) => setAdvancedSearch(prev => ({ ...prev, applicantId: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>

                {/* Applicant Name */}
                <div className="space-y-2 col-span-12 sm:col-span-6 lg:col-span-4 xl:col-span-3">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Applicant Name</label>
                  <input
                    type="text"
                    placeholder="Enter name"
                    value={advancedSearch.name}
                    onChange={(e) => setAdvancedSearch(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>

                {/* Skills */}
                <div className="space-y-2 col-span-12 sm:col-span-6 lg:col-span-4 xl:col-span-3">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Skills</label>
                  <input
                    type="text"
                    placeholder="e.g. React, Python, JavaScript"
                    value={advancedSearch.skills}
                    onChange={(e) => setAdvancedSearch(prev => ({ ...prev, skills: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>

                {/* Status (checkbox list) */}
                <div className="space-y-2 col-span-12 sm:col-span-6 lg:col-span-4 xl:col-span-3">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
                  <div className="flex flex-wrap items-center gap-4 p-2 border border-gray-300 dark:border-gray-600 rounded-lg">
                    {Array.from(new Set(allJobs.map(j => j.status).filter(Boolean))).map((s) => {
                      const label = s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
                      const checked = advancedSearch.statusMulti.includes(s || '');
                      return (
                        <label key={s} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              const next = new Set(advancedSearch.statusMulti);
                              if (e.target.checked) next.add(s || ''); else next.delete(s || '');
                              setAdvancedSearch(prev => ({ ...prev, statusMulti: Array.from(next) }));
                            }}
                          />
                          {label}
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Job Category */}
                <div className="space-y-2 col-span-12 sm:col-span-6 lg:col-span-4 xl:col-span-3">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Job Category</label>
                  <select
                    value={advancedSearch.jobCategory}
                    onChange={(e) => setAdvancedSearch(prev => ({ ...prev, jobCategory: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  >
                    <option value="all">All Categories</option>
                    {Array.from(new Set(allJobs.map(j => j.jobCategory || j.job_category).filter(Boolean))).map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>

                {/* ATS Score Range */}
                <div className="space-y-2 col-span-12 sm:col-span-6 lg:col-span-4 xl:col-span-3">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">ATS Score Range</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      placeholder="Min"
                      min="0"
                      max="100"
                      value={advancedSearch.atsScoreMin}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '' || (Number(val) >= 0 && Number(val) <= 100)) {
                          setAdvancedSearch(prev => ({ ...prev, atsScoreMin: val }));
                        }
                      }}
                      className="w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                    <span className="text-gray-400">-</span>
                    <input
                      type="number"
                      placeholder="Max"
                      min="0"
                      max="100"
                      value={advancedSearch.atsScoreMax}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '' || (Number(val) >= 0 && Number(val) <= 100)) {
                          setAdvancedSearch(prev => ({ ...prev, atsScoreMax: val }));
                        }
                      }}
                      className="w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                {/* Date Range (DateRangePicker) */}
                <div className="space-y-2 col-span-12 sm:col-span-6 lg:col-span-4 xl:col-span-3">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Date Range</label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowAdvancedDatePicker(v => !v)}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-left text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <span className="absolute inset-y-0 left-3 flex items-center text-gray-400">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </span>
                      {advancedDateRange[0] && advancedDateRange[1]
                        ? `${advancedDateRange[0]?.toLocaleDateString()} - ${advancedDateRange[1]?.toLocaleDateString()}`
                        : 'Select date range'}
                    </button>
                    {showAdvancedDatePicker && (
                      <div className="absolute left-0 right-0 top-full mt-2 z-50 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
                        <DateRangePicker
                          value={advancedDateRange}
                          onChange={(dates) => setAdvancedDateRange(dates)}
                          onClose={() => setShowAdvancedDatePicker(false)}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Sort By */}
                <div className="space-y-2 col-span-12 sm:col-span-6 lg:col-span-4 xl:col-span-3">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Sort By</label>
                  <select
                    value={advancedSearch.sortBy}
                    onChange={(e) => setAdvancedSearch(prev => ({ ...prev, sortBy: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  >
                    <option value="date">Date</option>
                    <option value="name">Name</option>
                    <option value="email">Email</option>
                    <option value="ats_score">ATS Score</option>
                    <option value="priority">Priority</option>
                    <option value="status">Status</option>
                  </select>
                </div>

                {/* Sort Order */}
                <div className="space-y-2 col-span-12 sm:col-span-6 lg:col-span-4 xl:col-span-3">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Order</label>
                  <select
                    value={advancedSearch.sortOrder}
                    onChange={(e) => setAdvancedSearch(prev => ({ ...prev, sortOrder: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  >
                    <option value="desc">Descending</option>
                    <option value="asc">Ascending</option>
                  </select>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <div className="text-sm text-gray-600 dark:text-gray-400">Showing {sortedJobs.length} of {allJobs.length} results</div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowAdvancedSearch(false)}
                    className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                  >
                    Apply Filters
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* JOB LIST: Table on sm+ and cards on mobile */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-2 sm:p-6 space-y-6 sm:space-y-10 shadow w-full mx-auto mb-4">


          {/* Duplicate View Header - Desktop/Tablet */}
          {isShowingDuplicates && (
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-blue-600 dark:text-blue-400 text-lg">🔍</span>
                  <div>
                    <h4 className="font-semibold text-blue-800 dark:text-blue-200">
                      Showing Duplicate Applications
                    </h4>
                    <p className="text-sm text-blue-600 dark:text-blue-300">
                      {duplicateJobs.length} applications found with same email and phone
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setIsShowingDuplicates(false);
                    setDuplicateCompositeKey(null);
                    setDuplicateJobs([]);
                    setSelectedDuplicateJob(null);
                    setCurrentPage(1);
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  ← Back to All Applications
                </button>
              </div>
            </div>
          )}



          {/* Enhanced Table Header */}
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 px-6 py-4 border-b border-gray-200 dark:border-gray-600">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  {isShowingDuplicates ? 'Duplicate Applications' : 'Job Applications'}
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                    {isShowingDuplicates ? duplicateJobs.length : filteredJobs.length}
                  </span>
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                  {isShowingDuplicates ? 'Showing all applications with same email and phone' : 'Manage job applications and their details'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                <span className="text-xs text-gray-500 dark:text-gray-400">Live Data</span>
              </div>
            </div>
          </div>

          {/* Table View - World Class Professional Design */}
          {currentView === 'table' && (
            <div className="block w-full overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm bg-white dark:bg-gray-900">
              <div className="min-w-full">
                <table className="w-full table-auto divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 sticky top-0 z-10 border-b border-gray-200 dark:border-gray-600">
                    <tr>
                      <th className="px-6 py-5 text-left">
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            ref={selectAllRef}
                            onChange={handleSelectAll}
                            checked={currentJobs.length > 0 && currentJobs.every((job) => selectedRows.has(job.id))}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded cursor-pointer"
                          />
                        </div>
                      </th>
                      <th className="px-6 py-5 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-blue-500 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                          </svg>
                          Applicant ID
                        </div>
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          Actions
                        </div>
                      </th>
                      <th className="px-6 py-5 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          Name
                        </div>
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          Email
                        </div>
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          Mobile
                        </div>
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                          </svg>
                          Job Category
                        </div>
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                          </svg>
                          Experience
                        </div>
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6a2 2 0 01-2 2H8a2 2 0 01-2-2V8a2 2 0 012-2V6" />
                          </svg>
                          Job Type
                        </div>
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                          Priority
                        </div>
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                          ATS Score
                        </div>
                      </th>
                      {activeFitJobId && (
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          <div className="flex items-center gap-2">
                            <span className="text-blue-500">★</span>
                            Fit Score
                          </div>
                        </th>
                      )}
                      <th
                        className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        onClick={() => setDateSort(dateSort === 'none' ? 'desc' : dateSort === 'desc' ? 'asc' : 'none')}
                      >
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          Date
                          {dateSort !== 'none' && (
                            <svg
                              className={`w-3 h-3 transition-transform ${dateSort === 'asc' ? 'rotate-180' : ''}`}
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                            </svg>
                          )}
                        </div>
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Status
                        </div>
                      </th>

                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                    {loading ? (
                      <tr>
                        <td colSpan={13} className="px-6 py-20 text-center">
                          <div className="flex flex-col items-center justify-center space-y-4">
                            <div className="relative">
                              <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                              <div className="absolute inset-0 flex items-center justify-center">
                                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                              </div>
                            </div>
                            <div className="text-center">
                              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Loading Applications</h3>
                              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Please wait while we fetch the latest data...</p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ) : (isShowingDuplicates ? duplicateJobs : sortedJobs).length === 0 ? (
                      <tr>
                        <td colSpan={13} className="px-6 py-16 text-center">
                          <div className="flex flex-col items-center justify-center space-y-6">
                            <div className="relative">
                              <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 rounded-full flex items-center justify-center">
                                <svg className="w-12 h-12 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  {isShowingDuplicates ? (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                  ) : (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  )}
                                </svg>
                              </div>
                              <div className="absolute -top-2 -right-2 w-6 h-6 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                                <svg className="w-3 h-3 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </div>
                            </div>
                            <div className="text-center max-w-md">
                              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                                {isShowingDuplicates ? 'No Duplicates Found' : 'No Applications Found'}
                              </h3>
                              <p className="text-gray-500 dark:text-gray-400 mb-4">
                                {isShowingDuplicates
                                  ? 'No duplicate applications were found for the selected criteria.'
                                  : 'No job applications match your current search and filter criteria.'
                                }
                              </p>
                              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                                {!isShowingDuplicates && (
                                  <button
                                    onClick={openJobAppModal}
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.5v15m7.5-7.5h-15" />
                                    </svg>
                                    Add First Application
                                  </button>
                                )}
                                <button
                                  onClick={clearAllFilters}
                                  className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                  </svg>
                                  Clear Filters
                                </button>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      currentJobs.map((job) => {
                        const nameParts = job.name.trim().split(' ');
                        const initials =
                          nameParts.length === 1
                            ? nameParts[0][0]?.toUpperCase() || ''
                            : (nameParts[0][0]?.toUpperCase() || '') + (nameParts[nameParts.length - 1][0]?.toUpperCase() || '');
                        // const downloadUrl = getDownloadUrl(job); // Currently unused
                        return (
                          <React.Fragment key={job.id}>
                            <tr className="hover:bg-blue-50/30 dark:hover:bg-gray-800/50 transition-colors duration-150 border-b border-gray-100 dark:border-gray-800/50">
                              <td className="px-4 sm:px-6 py-5 whitespace-nowrap">
                                <input
                                  type="checkbox"
                                  checked={selectedRows.has(job.id)}
                                  onChange={(e) => handleSelectRow(e, job.id)}
                                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded cursor-pointer"
                                />
                              </td>
                              <td className="px-4 sm:px-6 py-5 whitespace-nowrap text-xs sm:text-sm relative">
                                <div className="relative inline-block">
                                  <span
                                    className={
                                      isDuplicate(job)
                                        ? 'font-semibold text-blue-600 dark:text-blue-400 cursor-pointer hover:text-blue-700 dark:hover:text-blue-300 hover:underline transition-colors'
                                        : 'font-semibold text-blue-600 dark:text-blue-400'
                                    }
                                    onMouseEnter={() => isDuplicate(job) && setHoveredDuplicateJobId(job.id)}
                                    onMouseLeave={() => setHoveredDuplicateJobId(null)}
                                    onClick={() => isDuplicate(job) && handleDuplicateClick(job)}
                                  >
                                    {job.applicant_id ?? '-'}
                                    {isShowingDuplicates && duplicateCompositeKey && isDuplicate(job) && (
                                      <span className="ml-1 text-xs text-blue-600">✓</span>
                                    )}
                                  </span>
                                  {hoveredDuplicateJobId === job.id && isDuplicate(job) && !isShowingDuplicates && (
                                    <div className="absolute z-50 mt-2 left-0 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-md p-3 text-xs text-gray-700 dark:text-gray-200">
                                      <div className="font-semibold mb-1">Duplicate found</div>
                                      <div>Applicant ID: <span className="font-mono">{job.applicant_id ?? '-'}</span></div>
                                      <div className="text-[10px] text-gray-500 mt-1">Click to view all duplicates</div>
                                    </div>
                                  )}
                                  {/* Inline details are rendered as an expanded row below */}
                                </div>
                              </td>
                              <td className="px-4 py-5 whitespace-nowrap text-right">
                                <div className="flex items-center gap-2 justify-start">
                                  <PresignedViewLink
                                    job={job}
                                    className="p-2.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-xl transition-all duration-200 group border border-blue-200 dark:border-blue-800 hover:scale-105 hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700"
                                    title="View Resume"
                                  >
                                    <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                  </PresignedViewLink>
                                  <PresignedDownloadLink
                                    job={job}
                                    className="p-2.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-xl transition-all duration-200 group border border-blue-200 dark:border-blue-800 hover:scale-105 hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700"
                                    title="Download Resume"
                                  >
                                    <svg className="w-4 h-4 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                                    </svg>
                                  </PresignedDownloadLink>
                                  {job.analysis_result && (
                                    <button
                                      onClick={() => {
                                        const cleanId = (job.applicant_id || job.id || '').toString().trim().replace(/\t/g, '').replace(/\n/g, '').replace(/\r/g, '');
                                        setSelectedAnalysis({
                                          id: cleanId, // Use applicant_id if available, fallback to id
                                          applicant_id: cleanId, // Store applicant_id separately for backend API
                                          ats_score: job.ats_score,
                                          weighted_skill_score: job.weighted_skill_score,
                                          sector_alignment: job.sector_alignment,
                                          role_suitability: job.role_suitability,
                                          ats_confidence_level: job.ats_confidence_level,
                                          analysis_result: job.analysis_result,
                                          jobCategory: job.jobCategory,
                                          job_category: job.job_category,
                                          experience: job.experience,
                                          name: job.name,
                                          email: job.email,
                                          mobile: job.mobile,
                                          location: job.location
                                        });
                                        setShowAnalysisModal(true);
                                      }}
                                      className="p-2.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-xl transition-all duration-200 group border border-blue-200 dark:border-blue-800 hover:scale-105 hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700"
                                      title="Resume Analysis"
                                    >
                                      <svg className="w-4 h-4 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                      </svg>
                                    </button>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 sm:px-6 py-5 whitespace-nowrap">
                                <div className="flex items-center">
                                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-400 dark:to-blue-500 flex items-center justify-center text-xs sm:text-sm font-semibold text-white shadow-sm">
                                    {initials}
                                  </div>
                                  <span className="ml-3 sm:ml-4 text-gray-900 dark:text-gray-100 text-sm font-medium">{job.name}</span>
                                </div>
                              </td>
                              <td className="px-4 sm:px-6 py-5 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                                <span className="truncate max-w-[200px] block">{job.email}</span>
                              </td>
                              <td className="px-4 sm:px-6 py-5 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300 font-mono">
                                {job.mobile ? (job.mobile.startsWith('+') ? job.mobile : `+${job.mobile}`) : '-'}
                              </td>
                              <td className="px-4 sm:px-6 py-5 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                                <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 font-medium text-xs">
                                  {job.jobCategory}
                                </span>
                              </td>
                              <td className="px-4 sm:px-6 py-5 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{job.experience}</td>
                              <td className="px-4 sm:px-6 py-5 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{job.job_type || '-'}</td>
                              <td className="px-4 sm:px-6 py-5 whitespace-nowrap text-sm">
                                {job.priority !== null && job.priority !== undefined ? (
                                  <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 font-medium text-xs">
                                    {job.priority}
                                  </span>
                                ) : (
                                  <span className="text-gray-400 dark:text-gray-500">-</span>
                                )}
                              </td>
                              <td className="px-4 sm:px-6 py-5 whitespace-nowrap text-sm">
                                {job.ats_score !== null && job.ats_score !== undefined ? (
                                  <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 text-blue-700 dark:text-blue-300 font-semibold">
                                    {job.ats_score}
                                  </span>
                                ) : (
                                  <span className="text-gray-400 dark:text-gray-500">-</span>
                                )}
                              </td>
                              {activeFitJobId && (
                                <td className="px-4 sm:px-6 py-5 whitespace-nowrap text-sm">
                                  {(() => {
                                    const score = fitScoreByApplicant[job.applicant_id || ''];
                                    if (score === undefined) return <span className="text-gray-400 dark:text-gray-500">-</span>;
                                    const badgeClass = score >= 80
                                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                      : score >= 60
                                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                        : score >= 40
                                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                          : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
                                    return <span className={`inline-flex items-center px-3 py-1.5 rounded-lg font-semibold text-sm ${badgeClass}`}>{score.toFixed(1)}%</span>;
                                  })()}
                                </td>
                              )}
                              <td className="px-4 sm:px-6 py-5 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300 font-medium">{new Date(job.date).toLocaleDateString()}</td>
                              <td className="px-4 sm:px-6 py-5 whitespace-nowrap">
                                {!job.status || job.status === 'Pending' ? (
                                  <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                                    <svg
                                      width="14"
                                      height="14"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                      strokeWidth="2.5"
                                      stroke="currentColor"
                                      className="w-3.5 h-3.5 mr-1.5"
                                      aria-hidden="true"
                                    >
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                    Submitted
                                  </span>
                                ) : (
                                  <span
                                    className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold border ${badgeColor[job.status] || 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700'
                                      }`}
                                  >
                                    {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                                  </span>
                                )}
                              </td>

                            </tr>
                            {showDuplicateDetails && selectedDuplicateJob && selectedDuplicateJob.id === job.id && isDuplicate(job) ? (
                              <tr>
                                <td colSpan={12} className="p-0">
                                  <div className="mt-2 mx-4 sm:mx-6 mb-4 border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden">
                                    <div className="flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-700">
                                      <div className="font-semibold text-xs sm:text-sm text-gray-800 dark:text-gray-200">Duplicate Applications for Applicant ID: <span className="font-mono">{selectedDuplicateJob?.applicant_id ?? '-'}</span></div>
                                      <button onClick={() => setShowDuplicateDetails(false)} className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">Close</button>
                                    </div>
                                    <div className="overflow-x-auto overflow-y-auto max-h-80 w-full bg-white dark:bg-gray-800">
                                      <table className="w-full min-w-[900px] text-xs">
                                        <thead>
                                          <tr className="border-b border-gray-200 dark:border-gray-600">
                                            <th className="text-left py-2 px-3">Applicant ID</th>
                                            <th className="text-left py-2 px-3">Actions</th>
                                            <th className="text-left py-2 px-3">Name</th>
                                            <th className="text-left py-2 px-3">Email</th>
                                            <th className="text-left py-2 px-3">Mobile</th>
                                            <th className="text-left py-2 px-3">Job Category</th>
                                            <th className="text-left py-2 px-3">Experience</th>
                                            <th className="text-left py-2 px-3">Date</th>
                                            <th className="text-left py-2 px-3">Status</th>

                                          </tr>
                                        </thead>
                                        <tbody>
                                          {duplicateJobs.map((dupJob) => (
                                            <tr key={`${dupJob.applicant_id ?? dupJob.id}-${dupJob.date}-${dupJob.status}`} className="border-b border-gray-100 dark:border-gray-700">
                                              <td className="py-2 px-3 font-mono">{dupJob.applicant_id ?? '-'}</td>
                                              <td className="py-2 px-3">
                                                <div className="flex items-center gap-2">
                                                  <PresignedViewLink
                                                    job={dupJob}
                                                    className="p-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-all duration-200 group border border-blue-200 dark:border-blue-800 hover:scale-110"
                                                    title="View Resume"
                                                  >
                                                    <svg className="w-3 h-3 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    </svg>
                                                  </PresignedViewLink>
                                                  <PresignedDownloadLink
                                                    job={dupJob}
                                                    className="p-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-all duration-200 group border border-blue-200 dark:border-blue-800 hover:scale-110"
                                                    title="Download Resume"
                                                  >
                                                    <svg className="w-3 h-3 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                                                    </svg>
                                                  </PresignedDownloadLink>
                                                </div>
                                              </td>
                                              <td className="py-2 px-3">{dupJob.name}</td>
                                              <td className="py-2 px-3">{dupJob.email}</td>
                                              <td className="py-2 px-3">{dupJob.mobile ? (dupJob.mobile.startsWith('+') ? dupJob.mobile : `+${dupJob.mobile}`) : ''}</td>
                                              <td className="py-2 px-3">{dupJob.jobCategory}</td>
                                              <td className="py-2 px-3">{dupJob.experience}</td>
                                              <td className="py-2 px-3">{dupJob.date}</td>
                                              <td className="py-2 px-3">
                                                {!dupJob.status || dupJob.status === 'Pending' ? (
                                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 text-blue-700">
                                                    Submitted
                                                  </span>
                                                ) : (
                                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${badgeColor[dupJob.status] || 'bg-gray-200 text-gray-700'}`}>
                                                    {dupJob.status}
                                                  </span>
                                                )}
                                              </td>

                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            ) : null}
                          </React.Fragment>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* List View */}
          {currentView === ('list' as 'table' | 'list') && (
            <div className="hidden sm:block space-y-4">
              {loading ? (
                <div className="flex justify-center items-center py-12">
                  <Spinner />
                </div>
              ) : (isShowingDuplicates ? duplicateJobs : sortedJobs).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <span className="text-4xl text-gray-300 dark:text-gray-600 mb-4">
                    {isShowingDuplicates ? '🔍' : '📄'}
                  </span>
                  <p className="text-gray-500 dark:text-gray-400 font-medium text-lg">
                    {isShowingDuplicates ? 'No duplicate applications found' : 'No job applications found'}
                  </p>
                  <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">
                    {isShowingDuplicates ? 'Try clicking on a different duplicate job ID' : 'Try adjusting your search or filters'}
                  </p>
                </div>
              ) : (
                currentJobs.map((job) => {
                  const nameParts = job.name.trim().split(' ');
                  const initials = nameParts.length === 1
                    ? nameParts[0][0]?.toUpperCase() || ''
                    : (nameParts[0][0]?.toUpperCase() || '') + (nameParts[nameParts.length - 1][0]?.toUpperCase() || '');

                  const getStatusBadge = (status: string) => {
                    if (!status || status === 'Pending') {
                      return (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400">
                          <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                          New
                        </span>
                      );
                    }
                    const badgeClass = badgeColor[status] || 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
                    return (
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badgeClass}`}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </span>
                    );
                  };

                  return (
                    <div key={job.id || job.applicant_id || `job-${Math.random()}`} className="group relative overflow-hidden bg-white dark:bg-[#111111] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 p-5 sm:p-6 hover:border-blue-300 dark:hover:border-blue-700 hover:-translate-y-0.5">
                      {/* Subtle gradient overlay on hover */}
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/0 via-transparent to-blue-50/30 dark:from-blue-900/0 dark:via-transparent dark:to-blue-900/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>

                      {/* Left accent border indicator */}
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-500 via-blue-400 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                      <div className="relative flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
                        <div className="flex items-start space-x-4 sm:space-x-5 flex-1 min-w-0">
                          {/* Enhanced Avatar */}
                          <div className="relative flex-shrink-0">
                            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 dark:from-blue-400 dark:via-blue-500 dark:to-blue-600 flex items-center justify-center text-white font-semibold text-base sm:text-lg shadow-md group-hover:scale-110 group-hover:shadow-lg transition-all duration-300 ring-2 ring-white dark:ring-gray-800">
                              {initials}
                            </div>
                            {/* Status indicator dot */}
                            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-blue-500 rounded-full border-2 border-white dark:border-gray-900 shadow-sm"></div>
                          </div>

                          {/* Main Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3 mb-4">
                              <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                {job.name}
                              </h3>
                              {getStatusBadge(job.status || 'New')}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                              {/* Applicant ID */}
                              <div className="flex items-center gap-2">
                                <div className="flex-shrink-0 w-5 h-5 rounded bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                  <svg className="w-3 h-3 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                  </svg>
                                </div>
                                <span className="font-mono text-sm font-semibold text-blue-600 dark:text-blue-400">{job.applicant_id ?? '-'}</span>
                              </div>

                              {/* Email */}
                              <div className="flex items-center gap-2">
                                <div className="flex-shrink-0 w-5 h-5 rounded bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                  <svg className="w-3 h-3 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                  </svg>
                                </div>
                                <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{job.email}</span>
                              </div>

                              {/* Mobile */}
                              <div className="flex items-center gap-2">
                                <div className="flex-shrink-0 w-5 h-5 rounded bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                  <svg className="w-3 h-3 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                  </svg>
                                </div>
                                <span className="text-sm font-mono text-gray-700 dark:text-gray-300">{job.mobile || '-'}</span>
                              </div>

                              {/* Applied Date */}
                              <div className="flex items-center gap-2">
                                <div className="flex-shrink-0 w-5 h-5 rounded bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                  <svg className="w-3 h-3 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                </div>
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{new Date(job.date).toLocaleDateString()}</span>
                              </div>
                            </div>

                            {/* Badge Row */}
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 text-xs font-semibold border border-blue-200 dark:border-blue-800">
                                {job.jobCategory}
                              </span>
                              <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 text-xs font-medium">
                                {job.experience}
                              </span>
                              {job.job_type && (
                                <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 text-xs font-medium">
                                  {job.job_type}
                                </span>
                              )}
                              {job.priority !== null && job.priority !== undefined && (
                                <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 text-xs font-semibold">
                                  Priority: {job.priority}
                                </span>
                              )}
                              {job.job_id && (
                                <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 text-xs font-mono font-medium">
                                  Job: {job.job_id}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Score and Actions */}
                        <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between lg:justify-start gap-4 lg:space-y-4">
                          {/* Scores Section */}
                          <div className="flex items-center lg:flex-col gap-4">
                            {/* ATS Score */}
                            {job.ats_score && (
                              <div className="text-center">
                                <div className="inline-flex flex-col items-center justify-center p-4 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 border border-blue-200 dark:border-blue-800 min-w-[80px]">
                                  <div className="text-2xl sm:text-3xl font-bold text-blue-700 dark:text-blue-300">
                                    {job.ats_score}
                                  </div>
                                  <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 mt-1 uppercase tracking-wide">ATS</div>
                                </div>
                              </div>
                            )}

                            {/* Fit Score - Only show when job-specific fit scores are active */}
                            {activeFitJobId && (() => {
                              const score = fitScoreByApplicant[job.applicant_id || ''];

                              if (score === undefined || score === null) return null;

                              const badgeClass = score >= 80
                                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800'
                                : score >= 60
                                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800'
                                  : score >= 40
                                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800'
                                    : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800';

                              return (
                                <div className="text-center">
                                  <div className={`inline-flex flex-col items-center justify-center p-4 rounded-xl border min-w-[80px] ${badgeClass}`}>
                                    <div className="text-2xl sm:text-3xl font-bold">
                                      {score.toFixed(1)}%
                                    </div>
                                    <div className="text-xs font-semibold mt-1 uppercase tracking-wide">Fit</div>
                                  </div>
                                </div>
                              );
                            })()}
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2">
                            <PresignedViewLink
                              job={job}
                              className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-xl transition-all duration-200 group border border-blue-200 dark:border-blue-800 hover:scale-105 hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-700"
                              title="View Resume"
                            >
                              <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                            </PresignedViewLink>
                            <PresignedDownloadLink
                              job={job}
                              className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-xl transition-all duration-200 group border border-blue-200 dark:border-blue-800 hover:scale-105 hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-700"
                              title="Download Resume"
                            >
                              <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                              </svg>
                            </PresignedDownloadLink>
                            {job.analysis_result && (
                              <button
                                onClick={() => {
                                  const cleanId = (job.applicant_id || job.id || '').toString().trim().replace(/\t/g, '').replace(/\n/g, '').replace(/\r/g, '');
                                  setSelectedAnalysis({
                                    id: cleanId, // Use applicant_id if available, fallback to id
                                    ats_score: job.ats_score,
                                    weighted_skill_score: job.weighted_skill_score,
                                    sector_alignment: job.sector_alignment,
                                    role_suitability: job.role_suitability,
                                    ats_confidence_level: job.ats_confidence_level,
                                    analysis_result: job.analysis_result,
                                    jobCategory: job.jobCategory,
                                    job_category: job.job_category,
                                    experience: job.experience,
                                    name: job.name,
                                    email: job.email,
                                    mobile: job.mobile,
                                    location: job.location
                                  });
                                  setShowAnalysisModal(true);
                                }}
                                className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-xl transition-all duration-200 group border border-blue-200 dark:border-blue-800 hover:scale-105 hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-700"
                                title="Resume Analysis"
                              >
                                <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Mobile cards */}
          {currentView === 'list' && <div className="block sm:hidden">
            {/* Duplicate View Header - Mobile */}
            {isShowingDuplicates && (
              <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-blue-600 dark:text-blue-400 text-lg">🔍</span>
                    <div>
                      <h4 className="font-semibold text-blue-800 dark:text-blue-200 text-sm">
                        Showing Duplicate Applications
                      </h4>
                      <p className="text-xs text-blue-600 dark:text-blue-300">
                        {duplicateJobs.length} applications found with same email and phone
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setIsShowingDuplicates(false);
                      setDuplicateCompositeKey(null);
                      setDuplicateJobs([]);
                      setSelectedDuplicateJob(null);
                      setCurrentPage(1);
                    }}
                    className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    ← Back to All Applications
                  </button>
                </div>
              </div>
            )}

            {(isShowingDuplicates ? duplicateJobs : currentJobs).length === 0 ? (
              <div className="px-4 py-12 text-center">
                <div className="flex flex-col items-center justify-center">
                  <span className="text-3xl text-gray-300 mb-2">
                    {isShowingDuplicates ? '🔍' : '📄'}
                  </span>
                  <p className="text-gray-500 font-medium text-sm">
                    {isShowingDuplicates ? 'No duplicate applications found' : 'No job applications found'}
                  </p>
                  <p className="text-gray-400 text-xs mt-1">
                    {isShowingDuplicates ? 'Try clicking on a different duplicate job ID' : 'Try adjusting your search or filters'}
                  </p>
                </div>
              </div>
            ) : (
              (isShowingDuplicates ? duplicateJobs : currentJobs).map((job) => {
                const nameParts = job.name.trim().split(' ');
                const initials =
                  nameParts.length === 1
                    ? nameParts[0][0]?.toUpperCase() || ''
                    : (nameParts[0][0]?.toUpperCase() || '') + (nameParts[nameParts.length - 1][0]?.toUpperCase() || '');
                // const downloadUrl = getDownloadUrl(job); // Currently unused
                return (
                  <div key={job.id} className="border-b border-gray-200 dark:border-gray-700 p-4 hover:bg-gray-50 dark:hover:bg-gray-700">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <input type="checkbox" checked={selectedRows.has(job.id)} onChange={(e) => handleSelectRow(e, job.id)} />
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-xs font-medium text-white">
                          {initials}
                        </div>
                        <span className="text-gray-900 dark:text-gray-100 text-sm font-medium">{job.name}</span>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                      <p>
                        <span className="font-medium">Applicant ID:</span> <span className="font-bold text-blue-600 dark:text-blue-400">{job.applicant_id ?? '-'}</span>
                      </p>
                      <p className="hidden sm:block">
                        <span className="font-medium">ID:</span> {job.id}
                      </p>
                      <p>
                        <span className="font-medium">Email:</span> {job.email}
                      </p>
                      <p>
                        <span className="font-medium">Mobile:</span>{' '}
                        {job.mobile ? (job.mobile.startsWith('+') ? job.mobile : `+${job.mobile}`) : ''}
                      </p>
                      <p>
                        <span className="font-medium">Job Category:</span> {job.jobCategory}
                      </p>
                      <p>
                        <span className="font-medium">Experience:</span> {job.experience}
                      </p>
                      <p>
                        <span className="font-medium">Job Type:</span> {job.job_type || '-'}
                      </p>
                      <p>
                        <span className="font-medium">Priority:</span> {job.priority ?? '-'}
                      </p>
                      <p>
                        <span className="font-medium">ATS Score:</span> {job.ats_score ?? '-'}
                      </p>
                      <p>
                        <span className="font-medium">Date:</span> {new Date(job.date).toLocaleDateString()}
                      </p>
                      <p>
                        <span className="font-medium">Status:</span>{' '}
                        {!job.status || job.status === 'Pending' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 ml-1">
                            <svg
                              width="12"
                              height="12"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth="2"
                              stroke="currentColor"
                              className="w-3 h-3 mr-1"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                            Submitted
                          </span>
                        ) : (
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badgeColor[job.status] || 'bg-gray-200 text-gray-700'
                              } ml-1`}
                          >
                            {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-3">
                      <PresignedViewLink
                        job={job}
                        className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-all duration-200 group border border-blue-200 dark:border-blue-800 hover:scale-110 hover:shadow-md"
                        title="View Resume"
                      >
                        <svg className="w-4 h-4 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </PresignedViewLink>
                      <PresignedDownloadLink
                        job={job}
                        className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-all duration-200 group border border-blue-200 dark:border-blue-800 hover:scale-110 hover:shadow-md"
                        title="Download Resume"
                      >
                        <svg className="w-4 h-4 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                        </svg>
                      </PresignedDownloadLink>
                      {job.analysis_result && (
                        <button
                          onClick={() => {
                            setSelectedAnalysis({
                              id: job.applicant_id || job.id, // Use applicant_id if available, fallback to id
                              ats_score: job.ats_score,
                              weighted_skill_score: job.weighted_skill_score,
                              sector_alignment: job.sector_alignment,
                              role_suitability: job.role_suitability,
                              ats_confidence_level: job.ats_confidence_level,
                              analysis_result: job.analysis_result
                            });
                            setShowAnalysisModal(true);
                          }}
                          className="p-2 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-lg transition-all duration-200 group border border-green-200 dark:border-green-800 hover:scale-110 hover:shadow-md"
                          title="Resume Analysis"
                        >
                          <svg className="w-4 h-4 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>}

          {/* Pagination controls */}
          {totalPages > 0 && (
            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 mt-4 sm:mt-6 px-3 sm:px-4 md:px-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
              <div className="text-center sm:text-left text-sm text-gray-600 dark:text-gray-400">
                Showing {currentJobs.length} of {isShowingDuplicates ? duplicateJobs.length : filteredJobs.length} entries
              </div>
              <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2">
                <select
                  value={rowsPerPage}
                  onChange={(e) => {
                    setRowsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 min-h-[44px] sm:min-h-[36px]"
                >
                  {[10, 25, 50].map((n) => (
                    <option key={n} value={n}>
                      {n} / page
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-2 border rounded-lg text-sm font-medium bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] min-w-[44px] sm:min-h-[36px]"
                  aria-label="Previous page"
                >
                  Prev
                </button>
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100 tabular-nums px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
                  {Math.min(currentPage, Math.max(1, totalPages))} / {Math.max(1, totalPages)}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-2 border rounded-lg text-sm font-medium bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] min-w-[44px] sm:min-h-[36px]"
                  aria-label="Next page"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Blur overlay for job application modal */}
        {showJobAppModal && (
          <div className="fixed inset-0 z-[99999] bg-black/10 backdrop-blur-[2px]" />
        )}
        {/* Job Application Modal */}
        {showJobAppModal && (
          <div
            className="fixed inset-0 z-[100000] flex items-center justify-center p-1 sm:p-2 md:p-4"
            onClick={closeJobAppModal}
          >
            <div
              className="relative w-full max-w-[360px] sm:max-w-sm md:max-w-md lg:max-w-lg xl:max-w-xl bg-transparent rounded-2xl outline-none focus:outline-none my-1 sm:my-2 md:my-4 lg:my-8"
              onClick={e => e.stopPropagation()}
            >
              <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700">
                <div className="relative p-2 sm:p-3 md:p-4 lg:p-5 xl:p-6 rounded-t-2xl overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 opacity-90" />
                  <div className="relative flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                      <div className="p-1 sm:p-1.5 lg:p-2 bg-white/20 rounded-lg sm:rounded-xl flex-shrink-0">
                        <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-5 lg:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-white text-sm sm:text-base lg:text-lg xl:text-xl font-semibold truncate">Job Application</h3>
                        <p className="text-blue-100 text-xs hidden sm:block">Fill in your details and attach your resume to apply</p>
                        <p className="text-blue-100 text-xs sm:hidden">Apply for this position</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={closeJobAppModal}
                      className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-lg w-8 h-8 sm:w-9 sm:h-9 lg:w-10 lg:h-10 flex justify-center items-center flex-shrink-0 touch-manipulation"
                    >
                      <svg className="w-4 h-4 sm:w-4.5 sm:h-4.5 lg:w-5 lg:h-5" aria-hidden="true" fill="none" viewBox="0 0 14 14">
                        <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6" />
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="p-2 sm:p-3 md:p-4 lg:p-5 xl:p-6 max-h-[75vh] sm:max-h-[70vh] overflow-y-auto">
                  {/* <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <span className="text-blue-500 font-semibold">*</span> All fields are required
              </p>
            </div> */}
                  <form onSubmit={handleSubmit} className="space-y-2.5 sm:space-y-3 md:space-y-4 lg:space-y-5">
                    {/* Application Method Selection */}
                    <div>
                      <label className="block font-semibold text-gray-800 dark:text-gray-200 mb-1.5 sm:mb-2 text-sm sm:text-base">
                        Application Method <span className="text-blue-500">*</span>
                      </label>
                      <div className="flex gap-1.5 sm:gap-2 md:gap-3 p-1 bg-gray-100 dark:bg-gray-700 rounded-lg">
                        <button
                          type="button"
                          onClick={() => {
                            setApplicationMethod('category');
                            setCategoryError('');
                          }}
                          className={`flex-1 px-2 sm:px-3 md:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-all min-h-[36px] touch-manipulation ${applicationMethod === 'category'
                            ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                            : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
                            }`}
                        >
                          <span className="hidden sm:inline">Category-Based</span>
                          <span className="sm:hidden">Category</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setApplicationMethod('jd');
                            setCategoryError('');
                            if (!selectedJobIdForApplication) {
                              fetchJobListings();
                            }
                          }}
                          className={`flex-1 px-2 sm:px-3 md:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-all min-h-[36px] touch-manipulation ${applicationMethod === 'jd'
                            ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                            : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
                            }`}
                        >
                          <span className="hidden sm:inline">Job Description</span>
                          <span className="sm:hidden">JD-Based</span>
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-1.5 sm:gap-2 md:gap-2.5 lg:gap-4">
                      <div className="flex-1">
                        <label htmlFor="name" className="block font-semibold text-gray-800 dark:text-gray-200 mb-1 text-sm sm:text-base">
                          Full Name <span className="text-blue-500">*</span>
                        </label>
                        <input
                          id="name"
                          type="text"
                          value={name}
                          onChange={(e) => {
                            setName(e.target.value);
                            const result = validateName(e.target.value);
                            setNameError(result === true ? '' : result);
                            if (e.target.value && result === true) {
                              setNameError('');
                              // Clear email error when name becomes valid
                              setEmailError('');
                            }
                          }}
                          onBlur={(e) => {
                            const result = validateName(e.target.value);
                            setNameError(result === true ? '' : result);
                          }}
                          onFocus={() => {
                            setNameError('');
                            setShowNameExample(false);
                          }}
                          required
                          placeholder="Enter your name"
                          className={`border rounded-lg p-3 sm:p-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 transition text-sm sm:text-base bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 min-h-[44px] touch-manipulation ${nameError ? 'border-blue-500' : 'border-gray-300 dark:border-gray-600'
                            }`}
                        />
                        {nameError && (
                          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 rounded px-4 py-2 text-sm font-medium mt-1">{nameError}</div>
                        )}
                        {showNameExample && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Example: <span className="font-mono">John Doe</span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <label htmlFor="email" className="block font-semibold text-gray-800 dark:text-gray-200 mb-1 text-sm sm:text-base">
                          Email <span className="text-blue-500">*</span>
                        </label>
                        <input
                          id="email"
                          type="email"
                          value={email}
                          onChange={(e) => {
                            setEmail(e.target.value);
                            const result = validateEmail(e.target.value);
                            setEmailError(result === true ? '' : result);
                          }}
                          onBlur={(e) => {
                            const result = validateEmail(e.target.value);
                            setEmailError(result === true ? '' : result);
                          }}
                          onFocus={() => {
                            // Clear duplicate error only, keep validation errors
                            if (emailError && emailError.includes('already exists')) {
                              setEmailError('');
                            }
                            setShowEmailExample(false);
                          }}
                          required
                          autoCapitalize="none"
                          autoCorrect="off"
                          placeholder="Enter your email"
                          className={`border rounded-lg p-3 sm:p-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 transition text-sm sm:text-base bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 min-h-[44px] touch-manipulation ${emailError ? 'border-blue-500' : 'border-gray-300 dark:border-gray-600'
                            }`}
                        />
                        {emailError && (
                          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 rounded px-4 py-2 text-sm font-medium mt-1">{emailError}</div>
                        )}
                        {showEmailExample && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Example: <span className="font-mono">example@domain.com</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <label htmlFor="phone" className="block font-semibold text-gray-800 dark:text-gray-200 mb-1 text-sm sm:text-base">
                        Mobile <span className="text-blue-500">*</span>
                      </label>
                      <div className="w-full">
                        <PhoneInput2
                          country={'in'}
                          value={phone}
                          onChange={(val: string) => {
                            setPhone(val);
                            if (phoneError) setPhoneError('');
                            if (val) {
                              // Clear error if phone number is entered
                              setPhoneError('');
                            } else {
                              // Show error if field is empty
                              setPhoneError('Phone number is required');
                            }
                          }}
                          inputProps={{
                            id: 'phone',
                            name: 'mobile',
                            required: true,
                            autoFocus: false,
                            onFocus: () => {
                              setPhoneError('');
                              // setShowPhoneExample(false);
                            },
                            onBlur: () => {
                              if (!phone) {
                                setPhoneError('Phone number is required');
                              } else {
                                const cleanMobile = '+' + (phone || '').replace(/[^\d]/g, '').replace(/^\+/, '');
                                if (!isValidPhoneNumber(cleanMobile)) {
                                  setPhoneError('Please enter a valid international phone number');
                                } else {
                                  setPhoneError('');
                                }
                              }
                            },
                          }}
                          inputStyle={{
                            ...phoneInputStyles.inputStyle,
                            borderColor: phoneError ? '#ef4444' : undefined
                          }}
                          containerStyle={{
                            ...phoneInputStyles.containerStyle,
                            borderColor: phoneError ? '#ef4444' : undefined
                          }}
                          buttonStyle={phoneInputStyles.buttonStyle}
                          dropdownStyle={phoneInputStyles.dropdownStyle}
                          containerClass="w-full"
                          dropdownClass="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          enableSearch
                        />
                      </div>
                      {phoneError && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 rounded px-4 py-2 text-sm font-medium mt-1">{phoneError}</div>
                      )}

                    </div>

                    {/* Conditional Rendering Based on Application Method */}
                    {applicationMethod === 'category' ? (
                      <>
                        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                          <div className="flex-1">
                            <label htmlFor="category" className="block font-semibold text-gray-800 dark:text-gray-200 mb-1.5 text-sm sm:text-base">
                              Category <span className="text-blue-500">*</span>
                            </label>
                            <div className="relative">
                              <div
                                id="category"
                                role="button"
                                tabIndex={0}
                                className={`w-full px-3 py-3 sm:py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm sm:text-base flex items-center justify-between cursor-pointer transition-colors min-h-[44px] touch-manipulation ${categoryError ? 'border-blue-500 dark:border-blue-400' : 'border-gray-300 dark:border-gray-600'}`}
                                onClick={() => setOpenCategoryDropdown((v) => !v)}
                              >
                                <span className={`truncate ${categoryError ? 'text-gray-400 dark:text-gray-500' : ''}`}>{category || 'Select Category'}</span>
                                <svg className={`w-4 h-4 text-gray-400 transition-transform ${openCategoryDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </div>
                              {categoryError && (
                                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 rounded px-4 py-2 text-sm font-medium mt-1">{categoryError}</div>
                              )}
                              {openCategoryDropdown && (
                                <div className="absolute z-20 mt-1 w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-40 overflow-y-auto p-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                                  {categories.length === 0 ? (
                                    <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-300">No options</div>
                                  ) : (
                                    categories.map((cat) => (
                                      <div
                                        key={cat}
                                        className="px-3 py-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer text-sm text-gray-900 dark:text-gray-100"
                                        onClick={() => {
                                          setCategory(cat);
                                          setCategoryError('');
                                          setOpenCategoryDropdown(false);
                                        }}
                                      >
                                        {cat}
                                      </div>
                                    ))
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex-1">
                            <label htmlFor="experience" className="block font-semibold text-gray-800 dark:text-gray-200 mb-1.5 text-sm sm:text-base">
                              Experience <span className="text-blue-500">*</span>
                            </label>
                            <div className="relative">
                              <div
                                id="experience"
                                role="button"
                                tabIndex={0}
                                className={`w-full px-3 py-3 sm:py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm sm:text-base flex items-center justify-between cursor-pointer transition-colors min-h-[44px] touch-manipulation ${experienceError ? 'border-blue-500 dark:border-blue-400' : 'border-gray-300 dark:border-gray-600'}`}
                                onClick={() => setOpenExperienceDropdown((v) => !v)}
                              >
                                <span className={`truncate ${experienceError ? 'text-gray-400 dark:text-gray-500' : ''}`}>{experience || 'Select Experience'}</span>
                                <svg className={`w-4 h-4 text-gray-400 transition-transform ${openExperienceDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </div>
                              {experienceError && (
                                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 rounded px-4 py-2 text-sm font-medium mt-1">{experienceError}</div>
                              )}
                              {openExperienceDropdown && (
                                <div className="absolute z-20 mt-1 w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-40 overflow-y-auto p-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                                  {experiences.length === 0 ? (
                                    <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-300">No options</div>
                                  ) : (
                                    experiences.map((exp) => (
                                      <div
                                        key={exp}
                                        className="px-3 py-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer text-sm text-gray-900 dark:text-gray-100"
                                        onClick={() => {
                                          setExperience(exp);
                                          setExperienceError('');
                                          setOpenExperienceDropdown(false);
                                        }}
                                      >
                                        {exp}
                                      </div>
                                    ))
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <div>
                          <label htmlFor="jobType" className="block font-semibold text-gray-800 dark:text-gray-200 mb-1.5 text-sm sm:text-base">
                            Job Type <span className="text-blue-500">*</span>
                          </label>
                          <div className="relative">
                            <div
                              id="jobType"
                              role="button"
                              tabIndex={0}
                              className={`w-full px-3 py-3 sm:py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm sm:text-base flex items-center justify-between cursor-pointer transition-colors min-h-[44px] touch-manipulation ${jobTypeError ? 'border-blue-500 dark:border-blue-400' : 'border-gray-300 dark:border-gray-600'}`}
                              onClick={() => setOpenJobTypeDropdown((v) => !v)}
                            >
                              <span className={`truncate ${jobTypeError ? 'text-gray-400 dark:text-gray-500' : ''}`}>{jobType || 'Select Job Type'}</span>
                              <svg className={`w-4 h-4 text-gray-400 transition-transform ${openJobTypeDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </div>
                            {jobTypeError && (
                              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 rounded px-4 py-2 text-sm font-medium mt-1">{jobTypeError}</div>
                            )}
                            {openJobTypeDropdown && (
                              <div className="absolute z-20 mt-1 w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-40 overflow-y-auto p-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                                {jobTypes.length === 0 ? (
                                  <div className="px-3 py-1.5 text-xs text-gray-500 dark:text-gray-400">No job types configured. Add job types in Job-Setting.</div>
                                ) : jobTypes.map((type) => (
                                  <div
                                    key={type}
                                    className="px-3 py-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer text-sm text-gray-900 dark:text-gray-100"
                                    onClick={() => {
                                      setJobType(type);
                                      setJobTypeError('');
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
                      </>
                    ) : (
                      <div>
                        <label htmlFor="jobListing" className="block font-semibold text-gray-800 dark:text-gray-200 mb-1.5 text-sm sm:text-base">
                          Select Job Listing <span className="text-blue-500">*</span>
                        </label>
                        {loadingJobs ? (
                          <div className="flex items-center justify-center py-4">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                            <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">Loading job listings...</span>
                          </div>
                        ) : (
                          <select
                            id="jobListing"
                            value={selectedJobIdForApplication}
                            onChange={(e) => {
                              setSelectedJobIdForApplication(e.target.value);
                              setCategoryError('');
                            }}
                            className={`w-full px-3 py-3 sm:py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500 transition min-h-[44px] touch-manipulation ${categoryError ? 'border-blue-500 dark:border-blue-400' : 'border-gray-300 dark:border-gray-600'}`}
                          >
                            <option value="">Select a job listing</option>
                            {availableJobsForApplication.map((job) => (
                              <option key={job.job_id || ''} value={job.job_id || ''}>
                                {job.title || 'Untitled'} {job.location ? `- ${job.location}` : ''}
                              </option>
                            ))}
                          </select>
                        )}
                        {categoryError && (
                          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 rounded px-4 py-2 text-sm font-medium mt-1">{categoryError}</div>
                        )}
                        {selectedJobIdForApplication && (
                          <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
                            {(() => {
                              const selectedJob = availableJobsForApplication.find(j => j.job_id === selectedJobIdForApplication);
                              return selectedJob ? (
                                <div className="text-sm">
                                  <div className="font-medium text-blue-900 dark:text-blue-200 mb-1">{selectedJob.title}</div>
                                  {selectedJob.description && (
                                    <div className="text-blue-700 dark:text-blue-300 text-xs line-clamp-2">{selectedJob.description}</div>
                                  )}
                                </div>
                              ) : null;
                            })()}
                          </div>
                        )}
                      </div>
                    )}
                    <div>
                      <label htmlFor="resume" className="block font-semibold text-gray-800 dark:text-gray-200 mb-1 text-sm sm:text-base">
                        Upload Resume <span className="text-blue-500">*</span>
                      </label>
                      <div
                        className={`border-2 border-dashed rounded-lg flex items-center gap-3 p-3 sm:p-4 cursor-pointer transition-all duration-300 ease-in-out ${resumeError ? 'border-blue-500 dark:border-blue-400' : isDragActive ? 'border-blue-500 ring-2 ring-blue-200 dark:ring-blue-900/40' : 'border-gray-300 dark:border-gray-600'} hover:border-gray-400 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800`}
                        onClick={() => fileInputRef.current?.click()}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            fileInputRef.current?.click();
                          }
                        }}
                        aria-label="Upload Resume"
                        onDragOver={(e) => {
                          e.preventDefault();
                          setIsDragActive(true);
                        }}
                        onDragLeave={() => setIsDragActive(false)}
                        onDrop={(e) => {
                          e.preventDefault();
                          setIsDragActive(false);
                          const droppedFile = e.dataTransfer?.files?.[0];
                          if (droppedFile) {
                            validateAndSetResume(droppedFile);
                          }
                        }}
                      >
                        {resume ? (
                          <div className="flex items-center flex-1 min-w-0">
                            <span className="text-sm sm:text-base text-gray-700 dark:text-gray-300 truncate" title={resume.name}>
                              {resume.name}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                            <svg width="24" height="24" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 text-blue-500 flex-shrink-0">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 16V4m0 12l-4-4m4 4l4-4" />
                            </svg>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-0 sm:gap-2 flex-1 min-w-0">
                              <span className="text-blue-600 dark:text-blue-400 font-medium text-sm sm:text-base flex-shrink-0">
                                Upload Resume
                              </span>
                              <span className="text-xs text-gray-400 dark:text-gray-500 sm:flex-shrink-0">PDF, DOC, DOCX • Max {maxResumeSizeMB}MB</span>
                            </div>
                          </div>
                        )}
                        <input
                          id="resume"
                          ref={fileInputRef}
                          type="file"
                          accept=".pdf,.doc,.docx"
                          onChange={(e) => validateAndSetResume(e.target.files ? e.target.files[0] : null)}
                          required
                          className="hidden"
                        />
                      </div>
                      {resumeError && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 rounded px-4 py-2 text-sm font-medium mt-1" aria-live="assertive">{resumeError}</div>
                      )}
                    </div>

                    {/* Submission Status Messages */}
                    {submitMessage && (
                      <div className={`p-4 rounded-lg border ${submitMessage.type === 'success'
                        ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300'
                        : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-blue-700 dark:text-blue-300'
                        }`}>
                        <div className="flex items-start gap-3">
                          {submitMessage.type === 'success' ? (
                            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                            </svg>
                          ) : (
                            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                            </svg>
                          )}
                          <div className="flex-1">
                            <div className="font-medium mb-2">{submitMessage.message}</div>

                            {/* Enhanced error details for resume classification */}
                            {submitMessage.type === 'error' && submitMessage.details && (
                              <div className="space-y-3">
                                {/* Main error reason */}
                                {submitMessage.details.reason && (
                                  <div className="bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700 rounded-lg p-3">
                                    <div className="font-medium text-blue-800 dark:text-blue-200 mb-1">Issue Detected:</div>
                                    <div className="text-sm text-blue-700 dark:text-blue-300">{submitMessage.details.reason}</div>
                                    {submitMessage.details.applicant_id ? (
                                      <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                                        Application ID: {submitMessage.details.applicant_id}
                                      </div>
                                    ) : (
                                      <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                                        No application ID generated (document rejected during validation)
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* Requirements */}
                                {submitMessage.details.requirements && (
                                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-3">
                                    <div className="font-medium text-blue-800 dark:text-blue-200 mb-2">Resume Requirements:</div>
                                    <div className="text-sm space-y-1">
                                      <div className="flex justify-between">
                                        <span className="text-blue-700 dark:text-blue-300">File Formats:</span>
                                        <span className="text-blue-600 dark:text-blue-400 font-mono">{submitMessage.details.requirements.file_formats}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-blue-700 dark:text-blue-300">Content Type:</span>
                                        <span className="text-blue-600 dark:text-blue-400">{submitMessage.details.requirements.content_type}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-blue-700 dark:text-blue-300">Required Sections:</span>
                                        <span className="text-blue-600 dark:text-blue-400">{submitMessage.details.requirements.required_sections}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-blue-700 dark:text-blue-300">Text Content:</span>
                                        <span className="text-blue-600 dark:text-blue-400">{submitMessage.details.requirements.text_content}</span>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {/* Next steps */}
                                {submitMessage.details.next_steps && submitMessage.details.next_steps.length > 0 && (
                                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-3">
                                    <div className="font-medium text-yellow-800 dark:text-yellow-200 mb-2">Next Steps:</div>
                                    <ol className="text-sm text-yellow-700 dark:text-yellow-300 list-decimal list-inside space-y-1">
                                      {submitMessage.details.next_steps.map((step, index) => (
                                        <li key={index}>{step}</li>
                                      ))}
                                    </ol>
                                  </div>
                                )}

                                {/* Classification details (for debugging/transparency) */}
                                {submitMessage.details.classification_details && (
                                  <div className="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                                    <div className="font-medium text-gray-800 dark:text-gray-200 mb-2">Technical Details:</div>
                                    <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                                      {submitMessage.details.classification_details.stages_completed && (
                                        <div>Stages completed: {submitMessage.details.classification_details.stages_completed.join(', ')}</div>
                                      )}
                                      {submitMessage.details.classification_details.processing_time_ms && (
                                        <div>Processing time: {submitMessage.details.classification_details.processing_time_ms}ms</div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    <button
                      type="submit"
                      className="w-full py-3 sm:py-3 px-4 bg-blue-600 text-white rounded-lg text-base sm:text-lg font-semibold shadow hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-400 touch-manipulation"
                      disabled={
                        isSubmitting ||
                        !name ||
                        nameError !== '' ||
                        !email ||
                        emailError !== '' ||
                        !phone ||
                        phoneError !== '' ||
                        !resume ||
                        resumeError !== '' ||
                        (applicationMethod === 'category' ? (!category || categoryError !== '' || !experience || experienceError !== '' || !jobType || jobTypeError !== '') : (!selectedJobIdForApplication || categoryError !== ''))
                      }
                      onClick={() => {
                        // Form validation state checked
                      }}
                    >
                      {isSubmitting ? (
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Submitting...
                        </div>
                      ) : (!name || !email || !phone || !resume || !category || !experience) ? (
                        'Submit'
                      ) : (
                        'Submit'
                      )}
                    </button>
                    {/* <div className="text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Submit button will be enabled when all required fields are filled
                </p>
              </div> */}
                  </form>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Blur overlay for analysis modal */}
        {showAnalysisModal && (
          <div className="fixed inset-0 z-[99999] bg-black/10 backdrop-blur-[2px]" />
        )}
        {/* Analysis Modal - Enterprise View */}
        {showAnalysisModal && selectedAnalysis && (
          <div
            className="fixed inset-0 z-[100000] flex items-center justify-center p-4 overflow-y-auto"
            onClick={() => setShowAnalysisModal(false)}
          >
            <div
              className="relative w-full max-w-6xl bg-transparent rounded-2xl outline-none focus:outline-none my-4 sm:my-8 h-[90vh] overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="relative bg-white dark:bg-[#111111] rounded-2xl shadow-2xl h-[90vh] flex flex-col border border-gray-200 dark:border-gray-800 overflow-y-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
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

                            {/* Right Section - Applied Date, Download, Close */}
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
                                type="button"
                                onClick={() => downloadResumeAnalysis(selectedAnalysis, fields)}
                                disabled={isDownloadingResumeAnalysis}
                                className={`download-btn text-white hover:text-white bg-white/10 hover:bg-white/20 active:scale-95 rounded-full px-3 py-1.5 sm:px-4 sm:py-2 flex items-center gap-1.5 sm:gap-2 transition-all duration-200 border border-white/20 hover:border-white/30 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-white focus:outline-none whitespace-nowrap flex-shrink-0 ${isDownloadingResumeAnalysis ? 'opacity-50 cursor-not-allowed' : ''
                                  }`}
                                title={isDownloadingResumeAnalysis ? "Downloading..." : "Download Resume Analysis"}
                                aria-label={isDownloadingResumeAnalysis ? "Downloading resume analysis" : "Download resume analysis report"}
                                data-applicant-id={selectedAnalysis?.id || 'N/A'}
                              >
                                {isDownloadingResumeAnalysis ? (
                                  <>
                                    <svg className="w-4 h-4 animate-spin flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                    <span>Downloading...</span>
                                  </>
                                ) : (
                                  <>
                                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    <span>Download</span>
                                  </>
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => setShowAnalysisModal(false)}
                                className="text-white hover:text-blue-200 bg-transparent hover:bg-white/10 rounded-full text-base sm:text-lg w-7 h-7 sm:w-8 sm:h-8 flex justify-center items-center transition-colors focus:ring-2 focus:ring-white focus:outline-none flex-shrink-0"
                                aria-label="Close resume analysis modal"
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
                                {((overview?.sector_alignment || 0) * 1).toFixed(2)}%
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
                            { id: 'projects', label: 'Projects', icon: '🚀' },
                            { id: 'certifications', label: 'Certifications', icon: '🏆' },
                            { id: 'languages', label: 'Languages', icon: '🌐' },
                            { id: 'job-match', label: 'Job Match', icon: '✅' },
                            { id: 'disclaimer', label: 'Disclaimer', icon: '⚠️' }
                          ].map((tab) => (
                            <button
                              key={tab.id}
                              onClick={() => {
                                const element = document.getElementById(tab.id);
                                element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                              }}
                              className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105 flex items-center gap-2 border border-gray-300 dark:border-gray-700 hover:border-indigo-500 dark:hover:border-indigo-400 bg-white dark:bg-[#111111] hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 shadow-sm hover:shadow-md focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                              aria-label={`View ${tab.label} section`}
                            >
                              <span>{tab.icon}</span>
                              <span>{tab.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Detailed Analysis - Glassmorphism Cards */}
                      <div className="space-y-4 p-6">
                        {/* Professional Summary Card */}
                        <div id="summary" className="relative bg-white dark:bg-[#111111] rounded-2xl p-6 md:p-8 border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow duration-300 group">
                          <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200 dark:border-gray-800">
                            <h4 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-gray-100">Professional Summary</h4>
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                              <span className="text-sm font-medium text-orange-600 dark:text-orange-400">Needs Improvement</span>
                            </div>
                          </div>
                          <div className="bg-gray-50 dark:bg-[#1A1A1A] p-4 rounded-lg mb-4">
                            <p className="text-sm md:text-base text-gray-700 dark:text-gray-300 leading-relaxed">
                              {getString(fields, 'summary') || 'Professional summary not available'}
                            </p>
                          </div>
                          <div className="text-sm md:text-base text-gray-600 dark:text-gray-400 leading-relaxed">
                            <span className="font-semibold text-gray-700 dark:text-gray-300">Analysis:</span> Summary could be more tailored to highlight specific skills and achievements relevant to the target role.
                          </div>
                        </div>

                        {/* Skills Card */}
                        <div id="skills" className="relative bg-white dark:bg-[#111111] rounded-2xl p-6 md:p-8 border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow duration-300 group">
                          <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200 dark:border-gray-800">
                            <h4 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                              <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                              </svg>
                              Skills
                            </h4>
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                              <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Strong</span>
                            </div>
                          </div>
                          <div className="space-y-4">
                            {(() => {
                              const skillsObj = fields.skills as { technical?: string[], soft?: string[] } | undefined;
                              const technicalSkills = skillsObj?.technical || [];
                              const softSkills = skillsObj?.soft || [];
                              const hasTechnicalSkills = technicalSkills.length > 0;
                              const hasSoftSkills = softSkills.length > 0;

                              return (hasTechnicalSkills || hasSoftSkills) ? (
                                <div className="space-y-4">
                                  {/* Technical Skills */}
                                  {hasTechnicalSkills && (
                                    <div>
                                      <div className="text-sm md:text-base font-medium text-gray-700 dark:text-gray-200 mb-3">Technical Skills</div>
                                      <div className="flex flex-wrap gap-2">
                                        {technicalSkills.map((skill: string, index: number) => (
                                          <span key={`tech-${index}`} className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 rounded-full text-sm font-medium">
                                            {skill}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Soft Skills */}
                                  {hasSoftSkills && (
                                    <div>
                                      <div className="text-sm md:text-base font-medium text-gray-700 dark:text-gray-200 mb-3">Soft Skills</div>
                                      <div className="flex flex-wrap gap-2">
                                        {softSkills.map((skill: string, index: number) => (
                                          <span key={`soft-${index}`} className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 rounded-full text-sm font-medium">
                                            {skill}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="text-gray-500 dark:text-gray-400 text-base">No skills identified</div>
                              );
                            })()}

                            {/* Keyword analysis from LLM/engine */}
                            {(keywordAnalysis?.matched_keywords?.length || keywordAnalysis?.missing_critical_keywords?.length) && (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {keywordAnalysis?.matched_keywords && keywordAnalysis.matched_keywords.length > 0 && (
                                  <div>
                                    <div className="text-xs font-semibold text-green-600 dark:text-green-400 mb-2">Matched Skills/Keywords</div>
                                    <div className="flex flex-wrap gap-2">
                                      {keywordAnalysis.matched_keywords.map((kw: string, i: number) => (
                                        <span key={i} className="px-2 py-1 rounded-md bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 text-xs">{kw}</span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {keywordAnalysis?.missing_critical_keywords && keywordAnalysis.missing_critical_keywords.length > 0 && (
                                  <div>
                                    <div className="text-xs font-semibold text-red-600 dark:text-red-400 mb-2">Missing Critical Skills</div>
                                    <div className="flex flex-wrap gap-2">
                                      {keywordAnalysis.missing_critical_keywords.map((kw: string, i: number) => (
                                        <span key={i} className="px-2 py-1 rounded-md bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-xs">{kw}</span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                            <div className="text-sm md:text-base text-gray-600 dark:text-gray-400 leading-relaxed">
                              <span className="font-semibold text-gray-700 dark:text-gray-300">Analysis:</span> Good range of technical and soft skills. Consider adding proficiency levels and years of experience for each skill.
                            </div>
                          </div>
                        </div>

                        {/* Professional Experience Card */}
                        <div id="experience" className="relative bg-white dark:bg-[#111111] rounded-2xl p-6 md:p-8 border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow duration-300 group">
                          <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200 dark:border-gray-800">
                            <h4 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                              <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
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
                                    <div className="font-medium text-gray-900 dark:text-gray-100 text-sm">{String(exp.title)}</div>
                                    <div className="text-sm text-gray-600 dark:text-gray-400">{String(exp.company)}</div>
                                    <div className="text-xs text-gray-500 dark:text-gray-500">{String(exp.duration)}</div>
                                  </div>
                                ))
                              ) : (
                                <div className="text-gray-500 dark:text-gray-400 text-sm">
                                  {detailedBreakdown?.experience_relevance ? (
                                    <div className="space-y-1">
                                      {typeof detailedBreakdown.experience_relevance.years_relevant !== 'undefined' && (
                                        <div className="text-xs">Years Relevant: {detailedBreakdown.experience_relevance.years_relevant}</div>
                                      )}
                                      <div className="text-xs">{detailedBreakdown.experience_relevance.comment}</div>
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

                        {/* Education Card */}
                        <div id="education" className="relative bg-white dark:bg-[#111111] rounded-2xl p-6 md:p-8 border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow duration-300 group">
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
                                    <div className="font-medium text-gray-900 dark:text-gray-100 text-sm">{String(edu.degree)}</div>
                                    <div className="text-sm text-gray-600 dark:text-gray-400">{String(edu.institution)}</div>
                                    <div className="text-xs text-gray-500 dark:text-gray-500">
                                      {String(edu.year)}{edu.gpa ? ` • GPA: ${String(edu.gpa)}` : ''}
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <div className="text-gray-500 dark:text-gray-400 text-sm">
                                  {detailedBreakdown?.education_certifications?.comment || 'No education details available'}
                                </div>
                              );
                            })()}
                            <div className="text-sm md:text-base text-gray-600 dark:text-gray-400 leading-relaxed">
                              <span className="font-semibold text-gray-700 dark:text-gray-300">Analysis:</span> Solid educational background. Consider highlighting relevant coursework and academic achievements.
                            </div>
                          </div>
                        </div>

                        {/* Projects Card */}
                        <div id="projects" className="relative bg-white dark:bg-[#111111] rounded-2xl p-6 md:p-8 border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow duration-300 group">
                          <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200 dark:border-gray-800">
                            <h4 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                              <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                              </svg>
                              Projects
                            </h4>
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                              <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Excellent</span>
                            </div>
                          </div>
                          <div className="space-y-3">
                            {(() => {
                              const projectDetails = getArray(fields, 'projects');
                              // Filter out projects with "Not specified" or empty titles
                              const validProjects = projectDetails && projectDetails.length > 0
                                ? projectDetails.filter((p: Record<string, unknown>) => {
                                  const title = String(p?.title || '').trim().toLowerCase();
                                  const desc = String(p?.description || '').trim().toLowerCase();
                                  return title &&
                                    title !== 'not specified' &&
                                    title !== 'n/a' &&
                                    title !== 'none' &&
                                    title !== '' &&
                                    (desc !== 'not specified' || title.length > 0);
                                })
                                : [];

                              return validProjects && validProjects.length > 0 ? (
                                validProjects.map((project: Record<string, unknown>, index: number) => {
                                  const title = String(project.title || project.name || 'Untitled Project').trim();
                                  const description = String(project.description || '').trim();
                                  const technologies = String(project.technologies || project.tech || '').trim();

                                  // Additional validation: Check if title/description look like invalid content
                                  const combinedText = `${title} ${description}`.toLowerCase();
                                  const invalidKeywords = ['professional summary', 'results-driven', 'years of experience', 'sales executive'];
                                  const isInvalid = invalidKeywords.some(kw => combinedText.includes(kw)) &&
                                    !['application', 'app', 'system', 'platform', 'project', 'built', 'developed'].some(kw => combinedText.includes(kw));

                                  if (isInvalid) {
                                    return null; // Skip invalid projects
                                  }

                                  return (
                                    <div key={index} className="border-l-2 border-green-200 dark:border-green-700 pl-4 py-2">
                                      <div className="font-medium text-gray-900 dark:text-gray-100 text-sm">{title}</div>
                                      {description && description !== 'Not specified' && description.length > 0 && (
                                        <div className="text-sm text-gray-700 dark:text-gray-300 mt-1">{description}</div>
                                      )}
                                      {technologies && technologies !== 'Not specified' && technologies.length > 0 && (
                                        <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">Technologies: {technologies}</div>
                                      )}
                                    </div>
                                  );
                                }).filter(Boolean) // Remove null entries
                              ) : (
                                <div className="text-gray-500 dark:text-gray-400 text-sm">Not Defined</div>
                              );
                            })()}
                            <div className="text-sm md:text-base text-gray-600 dark:text-gray-400 leading-relaxed">
                              <span className="font-semibold text-gray-700 dark:text-gray-300">Analysis:</span> Strong project portfolio. Consider adding metrics and quantifiable results to demonstrate impact.
                            </div>
                          </div>
                        </div>

                        {/* Certifications Card */}
                        <div id="certifications" className="relative bg-white dark:bg-[#111111] rounded-2xl p-6 md:p-8 border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow duration-300 group">
                          <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200 dark:border-gray-800">
                            <h4 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                              <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                              </svg>
                              Certifications
                            </h4>
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                              <span className="text-sm font-medium text-amber-600 dark:text-amber-400">Moderate</span>
                            </div>
                          </div>
                          <div className="space-y-2">
                            {(() => {
                              const certificationDetails = getArray(fields, 'certifications');
                              return certificationDetails && certificationDetails.length > 0 ? (
                                certificationDetails
                                  .filter((c: Record<string, unknown>) => ((c?.name as string) || '').toLowerCase() !== 'not specified')
                                  .map((cert: Record<string, unknown>, index: number) => (
                                    <div key={index} className="border-l-2 border-yellow-200 dark:border-yellow-700 pl-4 py-2">
                                      <div className="font-medium text-gray-900 dark:text-gray-100 text-sm">{String(cert.name)}</div>
                                      <div className="text-sm text-gray-600 dark:text-gray-400">{String(cert.issuer)}</div>
                                      <div className="text-xs text-gray-500 dark:text-gray-500">{String(cert.date)}</div>
                                    </div>
                                  ))
                              ) : (
                                <div className="text-gray-500 dark:text-gray-400 text-base">No certifications listed</div>
                              );
                            })()}
                            <div className="text-sm md:text-base text-gray-600 dark:text-gray-400 leading-relaxed">
                              <span className="font-semibold text-gray-700 dark:text-gray-300">Analysis:</span> Good certifications. Consider adding more industry-specific technical certifications relevant to the target role.
                            </div>
                          </div>
                        </div>

                        {/* Languages Card */}
                        <div id="languages" className="relative bg-white dark:bg-[#111111] rounded-2xl p-6 md:p-8 border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow duration-300 group">
                          <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200 dark:border-gray-800">
                            <h4 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                              <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                              </svg>
                              Languages
                            </h4>
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                              <span className="text-sm font-medium text-blue-600 dark:text-blue-400">Good</span>
                            </div>
                          </div>
                          <div className="space-y-3">
                            {(() => {
                              const languagesDetails = getArray(fields, 'languages');
                              return languagesDetails && languagesDetails.length > 0 ? (
                                languagesDetails.map((lang: Record<string, unknown>, index: number) => {
                                  const languageName = String(lang.name || lang.language || lang || 'Not specified');
                                  const proficiency = lang.proficiency ? String(lang.proficiency) : '';
                                  return (
                                    <div key={index} className="text-sm text-gray-700 dark:text-gray-300">
                                      {languageName}{proficiency ? ` - ${proficiency}` : ''}
                                    </div>
                                  );
                                })
                              ) : (
                                <div className="space-y-2">
                                  <div className="text-sm text-gray-600 dark:text-gray-400">Not specified</div>
                                  <div className="text-sm text-gray-600 dark:text-gray-400">Not specified</div>
                                </div>
                              );
                            })()}
                            <div className="text-sm md:text-base text-gray-600 dark:text-gray-400 leading-relaxed">
                              <span className="font-semibold text-gray-700 dark:text-gray-300">Analysis:</span> Good language skills. Consider adding language certifications to strengthen the profile.
                            </div>
                          </div>
                        </div>

                        {/* Job Match Analysis Card */}
                        <div id="job-match" className="relative bg-white dark:bg-[#111111] rounded-2xl p-6 md:p-8 border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow duration-300 group">
                          <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200 dark:border-gray-800">
                            <h4 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                              <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                              </svg>
                              Job Match Analysis
                            </h4>
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              <span className="text-sm font-medium text-green-600 dark:text-green-400">Good Match</span>
                            </div>
                          </div>
                          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                            <p className="text-sm md:text-base text-gray-700 dark:text-gray-300 leading-relaxed">
                              {(() => {
                                const jobMatch = data.job_match_analysis || data.match_analysis || finalRec.verdict;
                                if (typeof jobMatch === 'string') return jobMatch;
                                if (typeof jobMatch === 'object' && jobMatch !== null) {
                                  return String((jobMatch as Record<string, unknown>).summary || (jobMatch as Record<string, unknown>).analysis || '');
                                }
                                return "The candidate's profile aligns well with the position in terms of technical skills, project experience, and educational background. The experience in developing projects, knowledge of relevant technologies, and training demonstrate a good fit for the role. To further enhance the match, the candidate could emphasize more on the technical aspects of their experience and achievements related to the specific job requirements.";
                              })()}
                            </p>
                          </div>
                        </div>

                        {/* Disclaimer Card */}
                        <div id="disclaimer" className="relative bg-white dark:bg-[#111111] rounded-2xl p-6 md:p-8 border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow duration-300 group">
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0">
                              <svg className="w-6 h-6 text-amber-500 dark:text-amber-400" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                              </svg>
                            </div>
                            <div className="flex-1">
                              <h4 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Affinda-style AI-Generated Analysis Report</h4>
                              <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 leading-relaxed">
                                This analysis is generated using Affinda-style AI technology and is intended for HR assistance only. Please review all findings and make decisions based on your professional judgment and company policies.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  );
                })() : (
                  <div className="p-6">
                    <div className="text-center text-gray-600 dark:text-gray-400">
                      <div className="text-sm">No analysis data available.</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}



        {/* Job Selection Modal for Fit Score Calculation */}
        {showJobSelectionModal && (
          <>
            <div className="fixed inset-0 z-[99999] bg-black/10 backdrop-blur-[2px]" />
            <div
              className="fixed inset-0 z-[100000] flex items-center justify-center p-4"
              onClick={() => setShowJobSelectionModal(false)}
            >
              <div
                className="relative w-full max-w-4xl bg-transparent rounded-2xl outline-none focus:outline-none my-8"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl">
                  <div className="flex items-center justify-between p-4 sm:p-6 border-b rounded-t-2xl border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg sm:text-2xl font-semibold text-gray-900 dark:text-gray-100">Calculate Job-Specific Fit Scores</h3>
                    <button
                      type="button"
                      onClick={() => setShowJobSelectionModal(false)}
                      className="text-gray-400 dark:text-gray-500 bg-transparent hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100 rounded-lg text-lg sm:text-xl w-8 h-8 flex justify-center items-center"
                      aria-label="Close"
                    >
                      <svg className="w-4 sm:w-5 h-4 sm:h-5" aria-hidden="true" fill="none" viewBox="0 0 14 14">
                        <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6" />
                      </svg>
                    </button>
                  </div>
                  <div className="p-4 sm:p-6">
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Select Job Description</label>
                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        {activeFitJobId ? (
                          <>
                            <span className="text-orange-600 dark:text-orange-400 font-medium">⚠ Job-specific fit scores are currently active.</span>
                            <br />
                            Choose a different job to recalculate, or use the Clear Fit Scores button to revert to the original table view.
                          </>
                        ) : (
                          'Choose a job to calculate fit scores for all candidates. This will analyze how well each candidate matches the specific job requirements.'
                        )}
                      </div>
                      <div className="relative">
                        <div
                          role="button"
                          tabIndex={0}
                          className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm sm:text-base flex items-center justify-between cursor-pointer border-gray-300 dark:border-gray-600 ${loadingAvailableJobs ? 'opacity-50 cursor-not-allowed' : ''}`}
                          onClick={() => {
                            if (!loadingAvailableJobs) setOpenJobDropdown((v: boolean) => !v);
                          }}
                        >
                          <span className="truncate">
                            {selectedJobId
                              ? (() => {
                                const selected = availableJobs.find((j) => j.id === selectedJobId);
                                return selected
                                  ? `${selected.title} - ${selected.location} (${selected.experience_level})`
                                  : 'Choose a job...';
                              })()
                              : loadingAvailableJobs
                                ? 'Loading jobs...'
                                : 'Choose a job...'}
                          </span>
                          <svg className={`w-4 h-4 text-gray-400 transition-transform ${openJobDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                        {openJobDropdown && (
                          <div className="absolute z-20 mt-1 w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-16 overflow-y-auto p-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                            {loadingAvailableJobs ? (
                              <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-300">Loading jobs...</div>
                            ) : availableJobs.length === 0 ? (
                              <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-300">No jobs available</div>
                            ) : (
                              availableJobs.map((job) => (
                                <div
                                  key={job.id}
                                  className="px-3 py-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer text-sm text-gray-900 dark:text-gray-100"
                                  onClick={() => {
                                    setSelectedJobId(job.id);
                                    setOpenJobDropdown(false);
                                  }}
                                >
                                  {job.title} - {job.location} ({job.experience_level})
                                </div>
                              ))
                            )}
                          </div>
                        )}
                        {loadingAvailableJobs && (
                          <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">Loading available jobs...</p>
                        )}
                        {availableJobs.length === 0 && !loadingAvailableJobs && (
                          <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">No active job listings found. Please create some job listings first.</p>
                        )}
                      </div>
                    </div>

                    {jobFitScoreResults && (
                      <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg">
                        <h4 className="font-semibold text-green-800 dark:text-green-200 mb-2">✅ Fit Scores Calculated Successfully</h4>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="font-medium">Job Title:</span> {jobFitScoreResults.job_title}
                          </div>
                          <div>
                            <span className="font-medium">Total Candidates:</span> {jobFitScoreResults.total_candidates}
                          </div>
                          <div>
                            <span className="font-medium">Excellent Matches (80+):</span> {jobFitScoreResults.fit_score_summary?.excellent_matches || 0}
                          </div>
                          <div>
                            <span className="font-medium">Good Matches (60-79):</span> {jobFitScoreResults.fit_score_summary?.good_matches || 0}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex justify-end gap-3">
                      <button
                        onClick={() => setShowJobSelectionModal(false)}
                        className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                      {activeFitJobId && (
                        <button
                          onClick={() => {
                            clearJobSpecificFitScores();
                            setShowJobSelectionModal(false);
                          }}
                          className="px-4 py-2 text-blue-700 dark:text-blue-300 bg-red-100 dark:bg-red-900/20 hover:bg-red-200 dark:hover:bg-red-800/30 rounded-lg transition-colors flex items-center gap-2"
                        >
                          <svg width={16} height={16} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          Clear Fit Scores
                        </button>
                      )}
                      <button
                        onClick={() => {
                          if (selectedJobId) {
                            calculateJobSpecificFitScores(selectedJobId);
                          } else {
                            alert('Please select a job first');
                          }
                        }}
                        disabled={!selectedJobId || calculatingJobFitScores}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                      >
                        {calculatingJobFitScores ? (
                          <>
                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 2.647z" />
                            </svg>
                            Calculating...
                          </>
                        ) : (
                          'Calculate Fit Scores'
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Candidates Table with Fit Scores */}
        {false && ((jobFitScoreResults?.candidates?.length ?? 0) > 0) && (
          <div />
        )}
      </div>

      {/* Global styles for phone input */}
      <style jsx global>{`
  .react-tel-input { width: 100% !important; }
  .react-tel-input .form-control {
    width: 100% !important;
    @apply text-xs sm:text-base;
  }
  .react-tel-input .country-list {
    @apply max-w-full sm:max-w-xs text-xs sm:text-sm;
  }
 /* Light mode uses library defaults; dark-mode overrides below only */
 /* Dark mode readability */
 .dark .react-tel-input .country-list {
   background-color: #374151 !important; /* gray-700 */
   color: #f3f4f6 !important; /* gray-100 */
   border-color: #4b5563 !important; /* gray-600 */
 }
 /* Country rows */
 .dark .react-tel-input .country-list .country {
   background-color: #374151 !important; /* base bg */
   color: #f3f4f6 !important; /* text */
 }
 .dark .react-tel-input .country-list .country .country-name,
 .dark .react-tel-input .country-list .country .dial-code { color: #f3f4f6 !important; }
 .dark .react-tel-input .country-list .country:hover,
 .dark .react-tel-input .country-list .country.highlight { background-color: #4b5563 !important; }
 .dark .react-tel-input .country.highlight { background-color: #4b5563 !important; }
 .dark .react-tel-input .country-list .search,
 .dark .react-tel-input .country-list .search input,
 .dark .react-tel-input .country-list .search-box,
 .dark .react-tel-input .country-list .search-box input {
   background-color: #374151 !important;
   color: #f3f4f6 !important;
   border-color: #4b5563 !important;
   caret-color: #f3f4f6 !important;
 }
 .dark .react-tel-input .country-list .search input::placeholder,
 .dark .react-tel-input .country-list .search-box input::placeholder {
   color: #d1d5db !important; /* gray-300 */
   opacity: 0.8;
 }
 .dark .react-tel-input .flag-dropdown,
 .dark .react-tel-input .flag-dropdown .selected-flag {
   background-color: #374151 !important;
   border-color: #4b5563 !important;
   color: #f3f4f6 !important;
 }

 /* Flatpickr dark mode (calendar + month/year dropdowns) */
 .dark .flatpickr-calendar {
   background-color: #111827 !important; /* gray-900 */
   color: #f3f4f6 !important; /* gray-100 */
   border-color: #374151 !important; /* gray-700 */
 }
 .dark .flatpickr-months,
 .dark .flatpickr-current-month,
 .dark .flatpickr-weekdays { color: #f3f4f6 !important; }
 .dark .flatpickr-weekday { color: #d1d5db !important; }
 .dark .flatpickr-day { color: #e5e7eb !important; }
 .dark .flatpickr-day:hover { background-color: #374151 !important; color: #f3f4f6 !important; }
 .dark .flatpickr-day.selected,
 .dark .flatpickr-day.startRange,
 .dark .flatpickr-day.endRange,
 .dark .flatpickr-day.inRange { background-color: #2563eb !important; color: #ffffff !important; border-color: transparent !important; }

 /* Month/Year read view */
 .dark .flatpickr-current-month .cur-month,
 .dark .flatpickr-current-month .numInputWrapper input { color: #f3f4f6 !important; background: transparent !important; }

 /* Month dropdown list */
 .dark .flatpickr-monthDropdown-months,
 .dark .flatpickr-yearDropdown-years { background-color: #1f2937 !important; color: #f3f4f6 !important; border-color: #374151 !important; }
 .dark .flatpickr-monthDropdown-months option,
 .dark .flatpickr-yearDropdown-years option { background-color: #1f2937 !important; color: #f3f4f6 !important; }
 .dark .flatpickr-monthDropdown-months option:hover,
 .dark .flatpickr-yearDropdown-years option:hover,
 .dark .flatpickr-monthDropdown-months option:checked,
 .dark .flatpickr-yearDropdown-years option:checked { background-color: #4b5563 !important; color: #ffffff !important; }
`}</style>

      <Modal isOpen={showDownloadModal} onClose={() => setShowDownloadModal(false)}>
        <DownloadEmployeeTemplate
          form={downloadForm}
          setForm={setDownloadForm}
          onSubmit={handleDownload}
          loading={loading}
          title="Download Candidates Data"
        />
      </Modal>

      {/* ChatGPT-style Upload Popup */}
      {showUploadPopup && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-700 flex flex-col max-h-[80vh] animate-in fade-in zoom-in-95 duration-200">
            {/* Minimal Header */}
            <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-white dark:bg-gray-900">
              <h3 className="font-semibold text-gray-900 dark:text-white text-lg">Bulk Resume Upload</h3>
              <button
                onClick={() => setShowUploadPopup(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-gray-500 dark:text-gray-400 transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto flex-1 bg-gray-50 dark:bg-gray-900/50 space-y-6">

              {/* Job Selector */}
              {/* Job Selector with Custom Dropdown */}
              <div className="px-0 relative">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select Job to Apply For
                </label>

                <div className="relative">
                  <div
                    onClick={() => setIsBulkJobDropdownOpen(!isBulkJobDropdownOpen)}
                    className="w-full px-4 py-3 border rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white cursor-pointer font-medium flex items-center justify-between text-sm hover:border-blue-400 dark:hover:border-blue-500 transition-all duration-200 border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <div className="flex-1 truncate mr-2">
                      {selectedBulkJobId === "" || !selectedBulkJobId ? (
                        <span className="text-gray-400">Select a job...</span>
                      ) : (
                        (() => {
                          const selectedJob = availableJobsForApplication.find(j => j.job_id === selectedBulkJobId);
                          return selectedJob ? (
                            <span className="text-gray-900 dark:text-white font-medium">
                              {selectedJob.title}
                            </span>
                          ) : (
                            <span className="text-gray-400">Select a job...</span>
                          );
                        })()
                      )}
                    </div>
                    <ChevronDown
                      className={`w-5 h-5 text-gray-400 transition-transform duration-200 flex-shrink-0 ${isBulkJobDropdownOpen ? "rotate-180" : ""}`}
                    />
                  </div>

                  {isBulkJobDropdownOpen && (
                    <div className="absolute z-[100] top-full left-0 mt-2 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl shadow-2xl max-h-60 overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-100">
                      <div className="p-2 space-y-1">
                        {/* Available Jobs */}
                        {availableJobsForApplication.map((job) => (
                          <div
                            key={job.job_id}
                            className={`px-3 py-2.5 rounded-lg text-sm font-medium flex items-center cursor-pointer transition-colors ${selectedBulkJobId === job.job_id
                              ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                              : "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200"
                              }`}
                            onClick={() => {
                              setSelectedBulkJobId(job.job_id || "");
                              setIsBulkJobDropdownOpen(false);
                            }}
                          >
                            <div className="flex flex-col truncate flex-1">
                              <span className="truncate font-medium">{job.title}</span>
                              <div className="flex items-center gap-2 text-xs text-gray-500 font-normal truncate mt-0.5">
                                <span className="bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-gray-600 dark:text-gray-300">
                                  {job.job_type || 'Full-time'}
                                </span>
                                <span>•</span>
                                <span>{job.location || 'Remote'}</span>
                              </div>
                            </div>
                            {selectedBulkJobId === job.job_id && (
                              <CheckCircle2 className="h-4 w-4 ml-2 text-blue-600 flex-shrink-0" />
                            )}
                          </div>
                        ))}

                        {availableJobsForApplication.length === 0 && (
                          <div className="px-3 py-4 text-center text-sm text-gray-500">
                            No active jobs found for application
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="text-xs text-gray-500 mt-2 flex items-center gap-1.5">
                  <div className="w-1 h-1 rounded-full bg-gray-400"></div>
                  <span>Resumes will be applied specifically to this position.</span>
                </div>
                {!selectedBulkJobId && uploadStatusMsg && uploadStatusMsg.includes("Select a job") && (
                  <p className="text-xs text-red-500 mt-1 font-medium">{uploadStatusMsg}</p>
                )}

                {/* Email Notification Checkbox */}
                <div className="mt-4 flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="sendEmailCheckbox"
                    checked={sendEmailToCandidate}
                    onChange={(e) => setSendEmailToCandidate(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                  />
                  <label htmlFor="sendEmailCheckbox" className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer select-none">
                    Send Email to Candidate
                  </label>
                </div>
              </div>

              {/* Upload Zone */}
              <input
                type="file"
                ref={uploadAssistantInputRef}
                className="hidden"
                accept=".pdf,.doc,.docx,.txt"
                multiple
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    setSelectedFiles(Array.from(e.target.files));
                  }
                }}
              />
              {selectedFiles.length === 0 ? (
                <div
                  className="border-2 border-dashed border-blue-300 dark:border-blue-700 rounded-xl p-8 flex flex-col items-center justify-center text-center bg-blue-50 dark:bg-blue-900/20 cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors group"
                  onClick={() => uploadAssistantInputRef.current?.click()}
                >
                  <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-800/50 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Upload className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                  </div>
                  {uploadingBulk ? (
                    <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-1 animate-pulse">{uploadStatusMsg}</h4>
                  ) : (
                    <>
                      <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">Click to Upload Resumes</h4>
                      <p className="text-sm text-blue-600 dark:text-blue-300">Bulk upload supported (50-100+ files)</p>
                    </>
                  )}
                  <p className="text-xs text-blue-400 dark:text-blue-500 mt-2">PDF, DOCX</p>
                </div>
              ) : (
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                        <span className="font-bold text-green-600 dark:text-green-400">{selectedFiles.length}</span>
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900 dark:text-white text-sm">Resumes Selected</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Ready to process</p>
                      </div>
                    </div>
                    {!uploadingBulk && (
                      <button onClick={() => setSelectedFiles([])} className="text-gray-400 hover:text-red-500">
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {uploadingBulk ? (
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-semibold text-blue-600 dark:text-blue-400">
                        <span>{uploadStatusMsg}</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                        <div className="bg-blue-600 h-2 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => setSelectedFiles([])}
                        className="py-2 px-3 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleBulkUpload}
                        className="py-2 px-3 rounded-lg bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all active:scale-95"
                      >
                        Start Upload
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>


          </div>
        </div>
      )}
    </>
  );
}
