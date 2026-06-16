'use client';

import React, { useState, useEffect, useCallback, useMemo, ChangeEvent, FormEvent } from 'react';
import DashboardHeader from '@/components/header/DashboardHeader';
import { Briefcase } from 'lucide-react';
import { Modal } from "@/components/ui/modal";

import { API_CONFIG, buildApiUrl } from '@/config/api';

type JobListing = {
  _id: string;
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
  is_active: boolean;
  status?: string;
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
};

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
};

type JobBoardIntegration = {
  linkedin_enabled: boolean;
  indeed_enabled: boolean;
  naukri_enabled: boolean;
  linkedin_access_token?: string;
  indeed_api_key?: string;
  naukri_api_key?: string;
  company_linkedin_id?: string;
  company_indeed_id?: string;
  company_naukri_id?: string;
};

type JobPostingRequest = {
  job_id: string;
  platforms: string[];
  auto_apply: boolean;
  posting_settings?: Record<string, unknown>;
};

type JobPostingStatus = {
  platform: string;
  status: string;
  posting_id?: string;
  error_message?: string;
  posted_at?: string;
};

export default function JobListingsPage() {
  const [jobListings, setJobListings] = useState<JobListing[]>([]);
  const [showAddJobPopup, setShowAddJobPopup] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showCreateJDModal, setShowCreateJDModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState<{ open: boolean; jobId: string | null }>({ open: false, jobId: null });
  const [deleting, setDeleting] = useState(false);
  const [editingJob, setEditingJob] = useState(false);
  const [creatingJD, setCreatingJD] = useState(false);
  const [selectedJob, setSelectedJob] = useState<JobListing | null>(null);
  const [editJobData, setEditJobData] = useState<JobListing>({
    _id: '',
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
    is_active: true,
    status: 'active',
    created_by: '',
    created_at: '',
    updated_at: '',
    application_count: 0
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [refreshingCounts, setRefreshingCounts] = useState(false);
  const [createJDData, setCreateJDData] = useState<JDGenerationRequest>({
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
    additional_requirements: ''
  });
  const [createJDErrors, setCreateJDErrors] = useState<JDValidationErrors>({});
  const [editJobErrors, setEditJobErrors] = useState<JDValidationErrors>({});

  // Status messages for form feedback instead of alerts
  const [uploadStatus, setUploadStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });
  const [createJDStatus, setCreateJDStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });
  const [editJobStatus, setEditJobStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });
  const [deleteJobStatus, setDeleteJobStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });
  const [testConnectionStatus, setTestConnectionStatus] = useState<{ type: 'success' | 'error' | null; message: string; platform?: string }>({ type: null, message: '' });
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [filterJobType, setFilterJobType] = useState('');
  const [filterExperience, setFilterExperience] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [allJobListings, setAllJobListings] = useState<JobListing[]>([]);

  // Job Board Integration States
  const [showIntegrationModal, setShowIntegrationModal] = useState(false);
  const [showPostingModal, setShowPostingModal] = useState(false);
  const [selectedJobForPosting, setSelectedJobForPosting] = useState<JobListing | null>(null);
  const [integrationSettings, setIntegrationSettings] = useState<JobBoardIntegration>({
    linkedin_enabled: false,
    indeed_enabled: false,
    naukri_enabled: false
  });
  const [postingPlatforms, setPostingPlatforms] = useState<string[]>([]);
  const [postingInProgress, setPostingInProgress] = useState(false);
  const [postingResults, setPostingResults] = useState<JobPostingStatus[]>([]);
  const [showPostingResults, setShowPostingResults] = useState(false);
  const [selectedIntegrationPlatform] = useState<'linkedin' | 'indeed' | 'naukri' | null>(null);
  const [integrationModalStep, setIntegrationModalStep] = useState<'select' | 'configure'>('select');

  // Dynamic computed values for cards - automatically update when allJobListings changes
  const cardMetrics = useMemo(() => {
    if (!allJobListings || allJobListings.length === 0) {
      return {
        totalJobs: 0,
        activeJobs: 0,
        inactiveJobs: 0,
        totalApplications: 0,
        avgApplications: 0
      };
    }

    const activeJobs = allJobListings.filter(job => {
      // Priority: Use status field if available, otherwise fall back to is_active
      if (job.status) {
        return job.status.toLowerCase() === 'active';
      }
      return job.is_active === true;
    }).length;

    const inactiveJobs = allJobListings.filter(job => {
      // Priority: Use status field if available, otherwise fall back to is_active
      if (job.status) {
        return job.status.toLowerCase() === 'inactive';
      }
      return job.is_active === false;
    }).length;

    const totalApplications = allJobListings.reduce((sum, job) => sum + (job.application_count || 0), 0);
    const avgApplications = allJobListings.length > 0 ? Math.round(totalApplications / allJobListings.length) : 0;

    return {
      totalJobs: allJobListings.length,
      activeJobs,
      inactiveJobs,
      totalApplications,
      avgApplications
    };
  }, [allJobListings]);

  // Enhanced JD Validation functions with updated global field rules
  const validateJDJobTitle = (title: string) => {
    if (!title || title.trim() === '') return 'Job title is required.';

    // Trim leading/trailing spaces
    const trimmedTitle = title.trim();

    // Check minimum length
    if (trimmedTitle.length < 2) return 'Job title must be at least 2 characters.';

    // Check maximum length
    if (trimmedTitle.length > 100) return 'Job title must be 100 characters or fewer.';

    // Check allowed characters: letters, numbers, spaces, and limited symbols (-, /, &, ,, .)
    const titleRegex = /^[A-Za-z0-9\s\-\/&,\.]+$/;
    if (!titleRegex.test(trimmedTitle)) return 'Only letters, numbers, spaces, and symbols (-, /, &, ,, .) are allowed.';

    return '';
  };

  const validateJDJobFunction = (jobFunction: string) => {
    if (!jobFunction || jobFunction.trim() === '') return 'Job function is required.';
    const trimmedFunction = jobFunction.trim();
    if (trimmedFunction.length < 2) return 'Job function must be at least 2 characters.';
    if (trimmedFunction.length > 250) return 'Job function must be less than 250 characters. Use a short action phrase.';
    return '';
  };

  const validateJDLocation = (location: string) => {
    if (!location || location.trim() === '') return 'Location is required.';

    // Trim leading/trailing spaces
    const trimmedLocation = location.trim();

    // Check minimum length
    if (trimmedLocation.length < 2) return 'Location must be at least 2 characters.';

    // Check maximum length
    if (trimmedLocation.length > 100) return 'Location must be 100 characters or fewer.';

    // Check allowed characters: letters, numbers, spaces, and limited symbols (, ., -, /, (, ))
    const locationRegex = /^[A-Za-z0-9\s,.\-\/()]+$/;
    if (!locationRegex.test(trimmedLocation)) return 'Only letters, numbers, spaces, and symbols (, ., -, /, (, )) are allowed.';

    // Check for repeated symbols like ,,, or ///
    if (/,,+/.test(trimmedLocation) || /\/\/+/.test(trimmedLocation)) {
      return 'No repeated symbols like ,,, or /// are allowed.';
    }

    return '';
  };

  const validateJDJobType = (jobType: string) => {
    if (!jobType || jobType.trim() === '') return 'Please select a job type.';
    const validTypes = ['full-time', 'part-time', 'contract', 'internship'];
    if (!validTypes.includes(jobType.trim())) {
      return 'Please select a valid job type.';
    }
    return '';
  };

  const validateJDExperienceLevel = (experienceLevel: string) => {
    if (!experienceLevel || experienceLevel.trim() === '') return 'Please select experience level.';
    const validLevels = ['entry', 'mid', 'senior', 'executive'];
    if (!validLevels.includes(experienceLevel.trim())) {
      return 'Please select a valid experience level.';
    }
    return '';
  };

  const validateJDDescription = (description: string) => {
    if (!description || description.trim() === '') return 'Job description is required.';
    const trimmedDescription = description.trim();
    if (trimmedDescription.length < 50) return 'Job description must be at least 50 characters.';
    if (trimmedDescription.length > 3000) return 'Job description must be at most 3000 characters.';
    return '';
  };

  const validateJDKeySkills = (skills: string) => {
    if (!skills || skills.trim() === '') return 'Key skills are required.';

    // Check maximum length (500 characters)
    if (skills.length > 500) return 'Key skills must not exceed 500 characters.';

    // Check for leading/trailing spaces
    if (skills !== skills.trim()) return 'Key skills should not have leading or trailing spaces.';

    // Check for leading or trailing commas
    if (skills.startsWith(',') || skills.endsWith(',')) return 'Key skills should not start or end with a comma.';

    // Check for multiple consecutive commas
    if (/,,+/.test(skills)) return 'Multiple consecutive commas are not allowed.';

    const trimmed = skills.trim();
    const skillArray = trimmed.split(',').map(s => s.trim()).filter(Boolean);

    if (skillArray.length === 0) return 'Please enter at least one valid skill in comma-separated format.';

    // Check minimum characters for each skill (2 characters minimum)
    if (skillArray.some(s => s.length < 2)) return 'Each skill must be at least 2 characters long.';

    // Check for empty skills between commas
    const originalSplit = skills.split(',');
    if (originalSplit.some(s => s.trim() === '')) return 'Empty skills between commas are not allowed.';

    // Check for duplicate skills
    const uniqueSkills = new Set(skillArray.map(s => s.toLowerCase()));
    if (uniqueSkills.size !== skillArray.length) return 'Duplicate skills are not allowed.';

    return '';
  };

  const validateJDEducationRequirements = (education: string) => {
    if (!education || education.trim() === '') return 'Education requirements are required.';

    // Trim leading/trailing spaces
    const trimmedEducation = education.trim();

    // Check minimum length
    if (trimmedEducation.length < 2) return 'Education requirements must be at least 2 characters.';

    // Check maximum length
    if (trimmedEducation.length > 250) return 'Education requirements must be 250 characters or fewer.';

    return '';
  };

  const validateJDCertifications = (certifications: string) => {
    // Optional field - if empty, no validation needed
    if (!certifications || certifications.trim() === '') return '';

    // Trim leading/trailing spaces
    const trimmedCertifications = certifications.trim();

    // Check maximum length (250 characters)
    if (trimmedCertifications.length > 250) return 'Certifications must not exceed 250 characters.';


    return '';
  };

  // Salary Range validation removed as it's not being used

  const validateJDStatus = (status: string) => {
    if (!status || status.trim() === '') return 'Please select a status.';
    const validStatuses = ['active', 'inactive', 'closed', 'draft'];
    if (!validStatuses.includes(status.trim())) {
      return 'Please select a valid status.';
    }
    return '';
  };

  const handleCreateJDChange = (field: keyof JDGenerationRequest, value: string) => {
    setCreateJDData(prev => ({ ...prev, [field]: value }));

    // Clear error when user starts typing
    if (createJDErrors[field as keyof JDValidationErrors]) {
      setCreateJDErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleCreateJDBlur = (field: keyof JDGenerationRequest, value: string) => {
    // Validate on blur using individual validation functions
    let error = '';
    switch (field) {
      case 'job_title':
        error = validateJDJobTitle(value);
        break;
      case 'job_function':
        error = validateJDJobFunction(value);
        break;
      case 'location':
        error = validateJDLocation(value);
        break;
      case 'job_type':
        error = validateJDJobType(value);
        break;
      case 'experience_level':
        error = validateJDExperienceLevel(value);
        break;
      case 'description':
        error = validateJDDescription(value);
        break;
      case 'key_skills':
        error = validateJDKeySkills(value);
        break;
      case 'education_requirements':
        error = validateJDEducationRequirements(value);
        break;
      case 'certifications':
        error = validateJDCertifications(value);
        break;
      case 'salary_range':
        error = '';
        break;
    }

    setCreateJDErrors(prev => ({ ...prev, [field]: error }));
  };

  const validateCreateJDForm = (): boolean => {
    const validationErrors = {
      job_title: validateJDJobTitle(createJDData.job_title),
      job_function: validateJDJobFunction(createJDData.job_function),
      location: validateJDLocation(createJDData.location),
      job_type: validateJDJobType(createJDData.job_type),
      experience_level: validateJDExperienceLevel(createJDData.experience_level),
      description: validateJDDescription(createJDData.description || ''),
      key_skills: validateJDKeySkills(createJDData.key_skills),
      education_requirements: validateJDEducationRequirements(createJDData.education_requirements),
      certifications: validateJDCertifications(createJDData.certifications || ''),
      salary_range: ''
    };

    setCreateJDErrors(validationErrors);

    // Check if any field has errors (ignore empty optional field errors)
    return !Object.values(validationErrors).some(error => error !== '');
  };

  // Edit Job Validation functions
  const handleEditJobChange = (field: keyof JobListing, value: string | string[]) => {
    setEditJobData(prev => ({ ...prev, [field]: value }));

    // Clear error when user starts typing
    if (editJobErrors[field as keyof JDValidationErrors]) {
      setEditJobErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleEditJobBlur = (field: keyof JobListing, value: string | string[]) => {
    // Validate on blur using individual validation functions
    let error = '';
    const stringValue = Array.isArray(value) ? value.join(', ') : value;
    switch (field) {
      case 'title':
        error = validateJDJobTitle(stringValue);
        break;
      case 'job_function':
        error = validateJDJobFunction(stringValue);
        break;
      case 'location':
        error = validateJDLocation(stringValue);
        break;
      case 'job_type':
        error = validateJDJobType(stringValue);
        break;
      case 'experience_level':
        error = validateJDExperienceLevel(stringValue);
        break;
      case 'description':
        error = validateJDDescription(stringValue);
        break;
      case 'key_skills':
        error = validateJDKeySkills(stringValue);
        break;
      case 'education_requirements':
        error = validateJDEducationRequirements(stringValue);
        break;
      case 'certifications':
        error = validateJDCertifications(stringValue);
        break;
      case 'salary_range':
        error = '';
        break;
      case 'status':
        error = validateJDStatus(stringValue);
        break;
    }

    setEditJobErrors(prev => ({ ...prev, [field]: error }));
  };

  const validateEditJobForm = (): boolean => {
    const validationErrors = {
      title: validateJDJobTitle(editJobData.title),
      job_function: validateJDJobFunction(editJobData.job_function),
      location: validateJDLocation(editJobData.location),
      job_type: validateJDJobType(editJobData.job_type),
      experience_level: validateJDExperienceLevel(editJobData.experience_level),
      description: validateJDDescription(editJobData.description),
      key_skills: validateJDKeySkills((editJobData.key_skills || []).join(', ')),
      education_requirements: validateJDEducationRequirements(editJobData.education_requirements),
      certifications: validateJDCertifications((editJobData.certifications || []).join(', ')),
      salary_range: '',
      status: validateJDStatus(editJobData.status || '')
    };

    setEditJobErrors(validationErrors);

    // Check if any field has errors (ignore empty optional field errors)
    return !Object.values(validationErrors).some(error => error !== '');
  };

  useEffect(() => {
    if (showIntegrationModal) {
      setIntegrationModalStep('select');
    }
  }, [showIntegrationModal]);

  // Apply client-side filtering and search
  const applyFiltersAndSearch = useCallback((jobs: JobListing[]) => {
    let filtered = jobs;

    // Apply search query (searches by title or location)
    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      filtered = filtered.filter(job => {
        const title = (job.title || '').toLowerCase();
        const location = (job.location || '').toLowerCase();

        // Check if title starts with the search query
        const startsWithQuery = title.startsWith(query);

        // Also check if any word in title or location starts with the query
        const titleWords = title.split(' ');
        const locationWords = location.split(' ');
        const anyWordStartsWith = [...titleWords, ...locationWords].some(word =>
          word.startsWith(query)
        );

        return startsWithQuery || anyWordStartsWith;
      });
    }

    // Apply status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(job => {
        if (filterStatus === 'active') return job.status === 'active';
        if (filterStatus === 'inactive') return job.status === 'inactive';
        return true;
      });
    }

    // Apply department filter
    if (filterDepartment.trim()) {
      const deptQuery = filterDepartment.trim().toLowerCase();
      filtered = filtered.filter(job =>
        (job.job_function || '').toLowerCase().includes(deptQuery)
      );
    }

    // Apply job type filter
    if (filterJobType.trim()) {
      filtered = filtered.filter(job => job.job_type === filterJobType);
    }

    // Apply experience filter
    if (filterExperience.trim()) {
      filtered = filtered.filter(job => job.experience_level === filterExperience);
    }

    setJobListings(filtered);
    setTotalPages(Math.ceil((filtered.length || 0) / rowsPerPage));
  }, [searchQuery, filterStatus, filterDepartment, filterJobType, filterExperience, rowsPerPage]);

  // Fetch job listings
  const fetchJobListings = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch all job listings without filters (backend filtering removed)
      const url = API_CONFIG.ENDPOINTS.JOB_LISTINGS;

      let data: unknown;
      try {
        const res = await fetch(buildApiUrl(url));
        data = await res.json();
      } catch {
        // Fallback to alternate jobs endpoint if job-listings is not available
        const fallbackUrl = API_CONFIG.ENDPOINTS.JOBS;
        const res2 = await fetch(buildApiUrl(fallbackUrl));
        data = await res2.json();
      }

      const d = data as unknown as { data?: unknown[]; jobs?: unknown[] } | unknown[];
      const items = Array.isArray(d)
        ? (d as JobListing[])
        : (((d as { data?: unknown[]; jobs?: unknown[] }).data || (d as { data?: unknown[]; jobs?: unknown[] }).jobs || []) as JobListing[]);

      setAllJobListings(items);
    } catch (err) {
      console.error('Failed to fetch job listings:', err);
      setAllJobListings([]);
      setJobListings([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshApplicationCounts = useCallback(async () => {
    setRefreshingCounts(true);
    try {
        const response = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.JOB_LISTINGS_REFRESH_COUNTS), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          console.log('Application counts refreshed successfully:', data.message);
          await fetchJobListings();
        } else {
          console.error('Failed to refresh application counts:', data.message || 'Unknown error');
        }
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        console.error(`Failed to refresh application counts (${response.status}):`, errorData.message || 'Server error');
      }
    } catch (error) {
      console.error('Error refreshing application counts:', error);
      if (error instanceof Error) {
        if (error.message.includes('fetch')) {
          console.error('Network error: Please check your connection and ensure the backend server is running');
        } else {
          console.error('Unexpected error:', error.message);
        }
      }
    } finally {
      setRefreshingCounts(false);
    }
  }, [fetchJobListings]);

  // Apply filters when they change (with debounce for search)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (allJobListings.length > 0) {
        applyFiltersAndSearch(allJobListings);
      }
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, filterStatus, filterDepartment, filterJobType, filterExperience, allJobListings, applyFiltersAndSearch]);

  // Apply filters when allJobListings changes
  useEffect(() => {
    if (allJobListings.length > 0) {
      applyFiltersAndSearch(allJobListings);
    }
  }, [allJobListings, applyFiltersAndSearch]);

  // Initial fetch
  useEffect(() => {
    fetchJobListings();
    fetchIntegrationSettings();
  }, [fetchJobListings]);

  // Recalculate total pages and keep current page in range when data or page size changes
  useEffect(() => {
    const total = Math.max(1, Math.ceil((jobListings?.length || 0) / rowsPerPage));
    setTotalPages(total);
    if (currentPage > total) {
      setCurrentPage(total);
    }
    if (currentPage < 1) {
      setCurrentPage(1);
    }
  }, [jobListings.length, rowsPerPage, currentPage]);

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!allowedTypes.includes(file.type)) {
        setUploadStatus({ type: 'error', message: 'Please select a valid file type: PDF, DOC, or DOCX' });
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        setUploadStatus({ type: 'error', message: 'File size must be less than 10MB' });
        return;
      }

      // Clear any previous status messages
      setUploadStatus({ type: null, message: '' });
      setSelectedFile(file);
      setUploadProgress(0);
    }
  };

  const handleUploadSubmit = async () => {
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append('file', selectedFile, selectedFile.name);

    setUploadProgress(10);
    setUploadStatus({ type: null, message: '' }); // Clear any previous status

    try {
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

        const res = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.JOB_LISTINGS_UPLOAD_JD), {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
        },
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!res.ok) {
        const errorText = await res.text();
        console.error('Upload error response:', errorText);
        throw new Error(`HTTP error! status: ${res.status} - ${errorText}`);
      }

      const responseData = await res.json();
      let successMessage = 'Job Description uploaded and processed successfully!';
      
      // Check if AI processing failed and fallback was used
      if (responseData.ai_processing_failed) {
        successMessage = 'Job Description uploaded successfully! (Note: AI processing failed, used text extraction fallback)';
      }
      
      setUploadStatus({ type: 'success', message: successMessage });

      // Auto-close modal after successful upload
      setTimeout(() => {
        setShowUploadModal(false);
        setSelectedFile(null);
        setUploadProgress(0);
        setUploadStatus({ type: null, message: '' });
        // Refresh job listings to update cards immediately
        fetchJobListings();
      }, 2000);
    } catch (err) {
      console.error('Error uploading JD:', err);
      let errorMessage = 'Failed to upload JD. Please try again.';

      if (err instanceof Error) {
        if (err.message.includes('404')) {
          errorMessage = 'Upload endpoint not found. Please check if the backend server is running.';
        } else if (err.message.includes('500')) {
          if (err.message.includes('AI processing service is currently unavailable')) {
            errorMessage = 'AI processing service is temporarily unavailable. The file was uploaded but processing failed. Please try again later.';
          } else if (err.message.includes('timeout')) {
            errorMessage = 'Upload timed out. The file might be too large. Please try with a smaller file or try again later.';
          } else if (err.message.includes('connection')) {
            errorMessage = 'Unable to connect to the processing service. Please check your internet connection and try again.';
          } else {
            errorMessage = 'Server error occurred. Please try again later.';
          }
        } else if (err.message.includes('NetworkError') || err.message.includes('fetch')) {
          errorMessage = 'Network error. Please check your internet connection.';
        } else {
          errorMessage = `Upload failed: ${err.message}`;
        }
      }

      setUploadStatus({ type: 'error', message: errorMessage });
      setUploadProgress(0);
    }
  };

  const handleCreateJDSubmit = async () => {
    // Validate form before submission
    if (!validateCreateJDForm()) {
      return; // Stop submission if validation fails
    }

    setCreatingJD(true);
    setCreateJDStatus({ type: null, message: '' }); // Clear previous status

    try {
      // Step 1: Generate JD using AI
        const generateResponse = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.JOB_LISTINGS_GENERATE_JD), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(createJDData),
      });

      if (!generateResponse.ok) {
        setCreateJDStatus({ type: 'error', message: 'Failed to generate Job Description. Please try again.' });
        return;
      }

      const generateData = await generateResponse.json();
      if (!generateData.success) {
        setCreateJDStatus({ type: 'error', message: 'Failed to generate Job Description. Please try again.' });
        return;
      }

      // Step 2: Create job listing with generated content
      const convertToArray = (value: unknown): string[] => {
        if (Array.isArray(value)) return value as string[];
        if (typeof value === 'string' && value.trim()) {
          return value
            .split(',')
            .map(item => item.trim())
            .filter(item => item.length > 0);
        }
        return [];
      };

      const jobListingData = {
        title: generateData.data.title || createJDData.job_title,
        job_function: generateData.data.job_function || createJDData.job_function,
        location: generateData.data.location || createJDData.location,
        job_type: generateData.data.job_type || createJDData.job_type,
        experience_level: generateData.data.experience_level || createJDData.experience_level,
        description: generateData.data.description,
        key_skills: convertToArray(generateData.data.key_skills || createJDData.key_skills),
        education_requirements: generateData.data.education_requirements || createJDData.education_requirements,
        certifications: convertToArray(generateData.data.certifications || createJDData.certifications),
        salary_range: generateData.data.salary_range || createJDData.salary_range,
        is_active: true,
        created_by: 'admin@company.com'
      };

        const createResponse = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.JOB_LISTINGS), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(jobListingData),
      });

      if (createResponse.ok) {
        const createData = await createResponse.json();
        if (createData.success) {
          setCreateJDStatus({ type: 'success', message: 'Job Description generated and saved successfully!' });
          // Auto-close modal after 2 seconds
          setTimeout(() => {
            setShowCreateJDModal(false);
            setCreateJDStatus({ type: null, message: '' });
          }, 2000);
          setCreateJDData({
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
            additional_requirements: ''
          });
          setCreateJDErrors({});
          fetchJobListings();
        } else {
          setCreateJDStatus({ type: 'error', message: 'Failed to save Job Description. Please try again.' });
        }
      } else {
        setCreateJDStatus({ type: 'error', message: 'Failed to save Job Description. Please try again.' });
      }
    } catch (err) {
      console.error('Error generating JD:', err);
      setCreateJDStatus({ type: 'error', message: 'Failed to generate Job Description. Please try again.' });
    } finally {
      setCreatingJD(false);
    }
  };

  const handleUpdateJob = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedJob) return;

    // Validate form before submission
    if (!validateEditJobForm()) {
      return; // Stop submission if validation fails
    }

    setEditingJob(true);
    setEditJobStatus({ type: null, message: '' }); // Clear previous status

    try {
        const response = await fetch(buildApiUrl(`/job-listings/${selectedJob._id}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editJobData),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setEditJobStatus({ type: 'success', message: 'Job listing updated successfully!' });
          // Auto-close modal after 2 seconds
          setTimeout(() => {
            setShowEditModal(false);
            setSelectedJob(null);
            setEditJobStatus({ type: null, message: '' });
            setEditJobErrors({});
          }, 2000);
          fetchJobListings();
        } else {
          setEditJobStatus({ type: 'error', message: data.message || 'Failed to update job listing. Please try again.' });
        }
      } else {
        const errorData = await response.json();
        setEditJobStatus({ type: 'error', message: errorData.message || 'Failed to update job listing. Please try again.' });
      }
    } catch (error) {
      console.error('Error updating job:', error);
      setEditJobStatus({ type: 'error', message: 'Network error. Please check your connection and try again.' });
    } finally {
      setEditingJob(false);
    }
  };

  const openEditModal = (job: JobListing) => {
    setSelectedJob(job);
    setEditJobData({
      _id: job._id,
      title: job.title,
      job_function: job.job_function,
      location: job.location,
      job_type: job.job_type || '',
      experience_level: job.experience_level || 'mid',
      description: job.description,
      key_skills: job.key_skills,
      education_requirements: job.education_requirements,
      certifications: job.certifications || [],
      salary_range: job.salary_range || '',
      is_active: job.is_active,
      status: job.status || getStatusFromIsActive(job.is_active),
      created_by: job.created_by || '',
      created_at: job.created_at,
      updated_at: job.updated_at,
      application_count: job.application_count || 0
    });
    setShowEditModal(true);
    // Clear validation errors and status when opening modal
    setEditJobErrors({});
    setEditJobStatus({ type: null, message: '' });
    setEditingJob(false);
  };

  const handleDeleteJob = async (jobId: string) => {
    setDeleting(true);
    try {
        const response = await fetch(buildApiUrl(`/job-listings/${jobId}`), {
        method: 'DELETE',
      });

      if (response.ok) {
        setDeleteJobStatus({ type: 'success', message: 'Job listing deleted successfully!' });
        fetchJobListings();
        // Auto-close delete confirmation after showing success message
        setTimeout(() => {
          setShowDeleteModal({ open: false, jobId: null });
          setDeleteJobStatus({ type: null, message: '' });
        }, 2000);
      } else {
        setDeleteJobStatus({ type: 'error', message: 'Failed to delete job listing. Please try again.' });
      }
    } catch (err) {
      console.error('Error deleting job:', err);
      setDeleteJobStatus({ type: 'error', message: 'Failed to delete job listing. Please try again.' });
    } finally {
      setDeleting(false);
      // Only close modal if there was no error - let user see the error message
      if (!deleteJobStatus.type || deleteJobStatus.type === 'success') {
        setTimeout(() => {
          setShowDeleteModal({ open: false, jobId: null });
          setDeleteJobStatus({ type: null, message: '' });
        }, 2000);
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'inactive': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusFromIsActive = (isActive: boolean) => {
    return isActive ? 'active' : 'inactive';
  };

  const getJobTypeColor = (type: string) => {
    switch (type) {
      case 'full-time': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'part-time': return 'bg-green-100 text-green-800 border-green-200';
      case 'contract': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'internship': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatJobType = (type: string) => {
    if (!type) return '';
    return type.charAt(0).toUpperCase() + type.slice(1).replace('-', ' ');
  };

  const formatExperienceLevel = (level: string) => {
    if (!level) return '';
    return level.charAt(0).toUpperCase() + level.slice(1);
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (filterStatus !== 'all') count++;
    if (filterDepartment) count++;
    if (filterJobType) count++;
    if (filterExperience) count++;
    if (searchQuery) count++;
    return count;
  };

  const clearAllFilters = () => {
    setFilterStatus('all');
    setFilterDepartment('');
    setFilterJobType('');
    setFilterExperience('');
    setSearchQuery('');
  };

  const hasActiveFilters = getActiveFilterCount() > 0;

  // Job Board Integration API Functions
  const fetchIntegrationSettings = async () => {
    try {
      let data: unknown;
      try {
        data = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.JOB_BOARD_INTEGRATION));
      } catch {
        // Fallback: default all disabled if endpoint not present
        setIntegrationSettings({ linkedin_enabled: false, indeed_enabled: false, naukri_enabled: false });
        return;
      }
      const d = data as unknown as { success?: boolean; data?: JobBoardIntegration } | JobBoardIntegration | null | undefined;
      if ((d as { success?: boolean; data?: JobBoardIntegration })?.success && (d as { success?: boolean; data?: JobBoardIntegration })?.data) {
        setIntegrationSettings((d as { success?: boolean; data?: JobBoardIntegration }).data as JobBoardIntegration);
      } else if (d && typeof d === 'object') {
        setIntegrationSettings(d as JobBoardIntegration);
      }
    } catch (error) {
      console.error('Error fetching integration settings:', error);
    }
  };

  const updateIntegrationSettings = async (settings: JobBoardIntegration) => {
    try {
        const response = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.JOB_BOARD_INTEGRATION), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });
      const data = await response.json();
      if (data.success) {
        setIntegrationSettings(data.data);
        setShowIntegrationModal(false);
      }
    } catch (error) {
      console.error('Error updating integration settings:', error);
    }
  };

  const postJobToJobBoards = async (jobId: string, platforms: string[]) => {
    setPostingInProgress(true);
    try {
      const postingRequest: JobPostingRequest = {
        job_id: jobId,
        platforms: platforms,
        auto_apply: false,
        posting_settings: {}
      };

        const response = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.JOB_LISTINGS_POST_TO_BOARDS(jobId)), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(postingRequest),
      });

      const data = await response.json();
      if (data.success) {
        setPostingResults(data.data.posting_results);
        setShowPostingResults(true);
        setShowPostingModal(false);
        // Refresh job listings to ensure card data is up-to-date
        await fetchJobListings();
      } else {
        console.error('Error posting job:', data.message);
      }
    } catch (error) {
      console.error('Error posting job to job boards:', error);
    } finally {
      setPostingInProgress(false);
    }
  };

  const testJobBoardConnection = async (platform: string) => {
    try {
        const response = await fetch(buildApiUrl(`${API_CONFIG.ENDPOINTS.JOB_BOARD_TEST_CONNECTION}?platform=${platform}`));
      const data = await response.json();
      if (data.success) {
        setTestConnectionStatus({
          type: 'success',
          message: `${platform} connection test: ${data.data.message}`,
          platform
        });
      } else {
        setTestConnectionStatus({
          type: 'error',
          message: `${platform} connection test failed: ${data.data.message}`,
          platform
        });
      }
      // Auto-clear the message after 5 seconds
      setTimeout(() => {
        setTestConnectionStatus({ type: null, message: '' });
      }, 5000);
    } catch (error) {
      console.error(`Error testing ${platform} connection:`, error);
      setTestConnectionStatus({
        type: 'error',
        message: `${platform} connection test failed`,
        platform
      });
      // Auto-clear the message after 5 seconds
      setTimeout(() => {
        setTestConnectionStatus({ type: null, message: '' });
      }, 5000);
    }
  };

  return (
    <div className="relative">
      <div className="space-y-6">
        <div className="mx-4 md:mx-6 mt-6 mb-8">
          <DashboardHeader
            variant="default"
            size="lg"
            title="Job Listings"
            subtitle="Manage and track job postings with filtering and AI-powered tools"
            breadcrumbs={[
              { label: 'Home', href: '/' },
              { label: 'Job Listings', href: '/job-listings' }
            ]}
            icon={() => (
              <Briefcase className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
            )}
            showHelp={showHelp}
            onHelpToggle={() => setShowHelp(!showHelp)}
            helpContent={
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 flex-shrink-0"></div>
                    <span className="text-white/90 text-sm">Use advanced filters to find specific job listings</span>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-green-400 rounded-full mt-2 flex-shrink-0"></div>
                    <span className="text-white/90 text-sm">Create new job postings with detailed requirements</span>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-purple-400 rounded-full mt-2 flex-shrink-0"></div>
                    <span className="text-white/90 text-sm">Upload job descriptions in bulk using the upload feature</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-orange-400 rounded-full mt-2 flex-shrink-0"></div>
                    <span className="text-white/90 text-sm">Use the search to find jobs by title, company, or location</span>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-pink-400 rounded-full mt-2 flex-shrink-0"></div>
                    <span className="text-white/90 text-sm">Manage job status (active/inactive) for better organization</span>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-cyan-400 rounded-full mt-2 flex-shrink-0"></div>
                    <span className="text-white/90 text-sm">Export job listings to CSV/Excel for reporting</span>
                  </div>
                </div>
              </div>
            }
          />
        </div>

        {/* Reimagined Interactive KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Job Listings */}
          <div className="group relative overflow-hidden bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-900/10 dark:via-indigo-900/10 dark:to-purple-900/10 rounded-3xl border border-blue-200/50 dark:border-blue-700/50 shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-500 ease-out cursor-pointer">
            {/* Animated Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="absolute top-4 right-4 w-16 h-16 bg-blue-500/10 rounded-full blur-xl group-hover:scale-150 transition-transform duration-700"></div>
            <div className="absolute bottom-4 left-4 w-12 h-12 bg-indigo-500/10 rounded-full blur-lg group-hover:scale-125 transition-transform duration-700"></div>
            
            <div className="relative p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6a2 2 0 01-2 2H8a2 2 0 01-2-2V8a2 2 0 012-2V6" />
                  </svg>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300">
                    {cardMetrics.totalJobs}
                  </div>
                  <div className="text-sm text-blue-600 dark:text-blue-400 font-medium">Total Jobs</div>
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Job Listings</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">All job postings in the system</p>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">Live Data</span>
                </div>
              </div>
            </div>
          </div>

          {/* Open Positions */}
          <div className="group relative overflow-hidden bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 dark:from-emerald-900/10 dark:via-green-900/10 dark:to-teal-900/10 rounded-3xl border border-emerald-200/50 dark:border-emerald-700/50 shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-500 ease-out cursor-pointer">
            {/* Animated Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-green-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="absolute top-4 right-4 w-16 h-16 bg-emerald-500/10 rounded-full blur-xl group-hover:scale-150 transition-transform duration-700"></div>
            <div className="absolute bottom-4 left-4 w-12 h-12 bg-green-500/10 rounded-full blur-lg group-hover:scale-125 transition-transform duration-700"></div>
            
            <div className="relative p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-gray-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors duration-300">
                    {cardMetrics.activeJobs}
                  </div>
                  <div className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">Active</div>
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Open Positions</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Currently hiring positions</p>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Live Data</span>
                </div>
              </div>
            </div>
          </div>

          {/* Avg Applications */}
          <div className="group relative overflow-hidden bg-gradient-to-br from-purple-50 via-violet-50 to-indigo-50 dark:from-purple-900/10 dark:via-violet-900/10 dark:to-indigo-900/10 rounded-3xl border border-purple-200/50 dark:border-purple-700/50 shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-500 ease-out cursor-pointer">
            {/* Animated Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-violet-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="absolute top-4 right-4 w-16 h-16 bg-purple-500/10 rounded-full blur-xl group-hover:scale-150 transition-transform duration-700"></div>
            <div className="absolute bottom-4 left-4 w-12 h-12 bg-violet-500/10 rounded-full blur-lg group-hover:scale-125 transition-transform duration-700"></div>
            
            <div className="relative p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-violet-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors duration-300">
                    {cardMetrics.avgApplications}
                  </div>
                  <div className="text-sm text-purple-600 dark:text-purple-400 font-medium">Average</div>
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Avg Applications</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Per job posting</p>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                  <span className="text-xs text-purple-600 dark:text-purple-400 font-medium">Live Data</span>
                </div>
              </div>
            </div>
          </div>

          {/* Total Applications */}
          <div className="group relative overflow-hidden bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 dark:from-amber-900/10 dark:via-orange-900/10 dark:to-red-900/10 rounded-3xl border border-amber-200/50 dark:border-amber-700/50 shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-500 ease-out cursor-pointer">
            {/* Animated Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-orange-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="absolute top-4 right-4 w-16 h-16 bg-amber-500/10 rounded-full blur-xl group-hover:scale-150 transition-transform duration-700"></div>
            <div className="absolute bottom-4 left-4 w-12 h-12 bg-orange-500/10 rounded-full blur-lg group-hover:scale-125 transition-transform duration-700"></div>
            
            <div className="relative p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-gray-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors duration-300">
                    {cardMetrics.totalApplications}
                  </div>
                  <div className="text-sm text-amber-600 dark:text-amber-400 font-medium">Total</div>
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Total Applications</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Unique applicants</p>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
                  <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">Live Data</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Control Bar */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 mb-8">
          <div className="flex flex-col lg:flex-row items-center gap-4">
            {/* Search Section */}
            <div className="flex-1 w-full lg:w-auto">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Search job listings..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Filter Button */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`group relative flex items-center space-x-2 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 ${
                  showFilters 
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg' 
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                <span>Filters</span>
                {hasActiveFilters && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                )}
              </button>

              {/* Clear Filters Button */}
              {hasActiveFilters && (
                <button
                  onClick={clearAllFilters}
                  className="flex items-center space-x-2 px-4 py-3 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-300"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span>Clear</span>
                </button>
              )}

              {/* Refresh Button */}
              <button
                onClick={async () => {
                  setRefreshingCounts(true);
                  await refreshApplicationCounts();
                  setRefreshingCounts(false);
                }}
                className="flex items-center space-x-2 px-4 py-3 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-300"
                disabled={refreshingCounts}
              >
                {refreshingCounts ? (
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                )}
                <span>Refresh</span>
              </button>

              {/* Integration Button */}
              <button
                onClick={() => setShowIntegrationModal(true)}
                className="flex items-center space-x-2 px-4 py-3 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>Integration</span>
              </button>

              {/* Add New Job Button */}
              <button
                onClick={() => setShowAddJobPopup(true)}
                className="group relative flex items-center space-x-2 px-6 py-3 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
              >
                <svg className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span>Add New Job</span>
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-400 to-indigo-500 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
              </button>
            </div>
          </div>
        </div>

        {/* Filter Content - Integrated with action bar */}
        {showFilters && (
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow mb-6">
            <div className="px-6 py-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Status Filter */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  >
                    <option value="all">All Status</option>
                    {['active', 'inactive'].map(status => (
                      <option key={status} value={status}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Job Type Filter */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Job Type</label>
                  <select
                    value={filterJobType}
                    onChange={(e) => setFilterJobType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  >
                    <option value="">All Job Types</option>
                    {['full-time', 'part-time', 'contract', 'internship'].map(type => (
                      <option key={type} value={type}>
                        {type.charAt(0).toUpperCase() + type.slice(1).replace('-', ' ')}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Experience Level Filter */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Experience Level</label>
                  <select
                    value={filterExperience}
                    onChange={(e) => setFilterExperience(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  >
                    <option value="">All Levels</option>
                    {['entry', 'mid', 'senior', 'executive'].map(level => (
                      <option key={level} value={level}>{level.charAt(0).toUpperCase() + level.slice(1)}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Active Filters Display */}
              {hasActiveFilters && (
                <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Active filters:</span>
                    {filterStatus !== 'all' && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        Status: {filterStatus}
                        <button
                          onClick={() => setFilterStatus('all')}
                          className="ml-1 hover:text-blue-600"
                        >
                          ×
                        </button>
                      </span>
                    )}
                    {filterDepartment && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        Job Function: {filterDepartment}
                        <button
                          onClick={() => setFilterDepartment('')}
                          className="ml-1 hover:text-purple-600"
                        >
                          ✕
                        </button>
                      </span>
                    )}
                    {filterJobType && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                        Type: {formatJobType(filterJobType)}
                        <button
                          onClick={() => setFilterJobType('')}
                          className="ml-1 hover:text-orange-600"
                        >
                          ×
                        </button>
                      </span>
                    )}
                    {filterExperience && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-pink-100 text-pink-800">
                        Experience: {filterExperience}
                        <button
                          onClick={() => setFilterExperience('')}
                          className="ml-1 hover:text-pink-600"
                        >
                          ×
                        </button>
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Advanced Table Design */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Table Header Section */}
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 px-6 py-4 border-b border-gray-200 dark:border-gray-600">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">Job Listings</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Manage and track all job postings</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span>Live Data</span>
                </div>
                <button
                  onClick={refreshApplicationCounts}
                  disabled={refreshingCounts}
                  className="p-2 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all duration-300"
                  title="Refresh application counts"
                >
                  <svg className={`w-4 h-4 ${refreshingCounts ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full table-auto">
              <thead className="sticky top-0 z-10 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    <div className="flex items-center space-x-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6a2 2 0 01-2 2H8a2 2 0 01-2-2V8a2 2 0 012-2V6" />
                      </svg>
                      <span>Job Details</span>
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    <div className="flex items-center space-x-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span>Location</span>
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    <div className="flex items-center space-x-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                      <span>Type</span>
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    <div className="flex items-center space-x-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Status</span>
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    <div className="flex items-center space-x-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      <span>Applications</span>
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    <div className="flex items-center space-x-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span>Created</span>
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    <div className="flex items-center space-x-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                      </svg>
                      <span>Actions</span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center justify-center space-y-4">
                        <div className="relative">
                          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                          </div>
                        </div>
                        <div className="text-center">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Loading Applications</h3>
                          <p className="text-gray-600 dark:text-gray-400">Please wait while we fetch your job listings...</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : jobListings.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center justify-center space-y-6">
                        <div className="relative">
                          <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 rounded-2xl flex items-center justify-center">
                            <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6a2 2 0 01-2 2H8a2 2 0 01-2-2V8a2 2 0 012-2V6" />
                            </svg>
                          </div>
                          <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </div>
                        </div>
                        <div className="text-center max-w-md">
                          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No Job Listings Found</h3>
                          <p className="text-gray-600 dark:text-gray-400 mb-6">
                            {hasActiveFilters 
                              ? "No job listings match your current filters. Try adjusting your search criteria."
                              : "Get started by creating your first job listing to begin managing your recruitment process."
                            }
                          </p>
                          <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            {hasActiveFilters ? (
                              <button
                                onClick={clearAllFilters}
                                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-xl hover:from-blue-700 hover:to-indigo-800 transition-all duration-300 font-medium"
                              >
                                Clear Filters
                              </button>
                            ) : (
                              <button
                                onClick={() => setShowAddJobPopup(true)}
                                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-xl hover:from-blue-700 hover:to-indigo-800 transition-all duration-300 font-medium"
                              >
                                Add First Job Listing
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  jobListings.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage).map((job) => (
                    <tr key={job._id} className="group hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-indigo-50/50 dark:hover:from-blue-900/10 dark:hover:to-indigo-900/10 transition-all duration-300 border-b border-gray-100 dark:border-gray-700">
                      <td className="px-6 py-6">
                        <div className="space-y-2">
                          <div className="flex items-start space-x-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
                              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6a2 2 0 01-2 2H8a2 2 0 01-2-2V8a2 2 0 012-2V6" />
                              </svg>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300">
                                {job.title}
                              </h4>
                              <div className="flex items-center space-x-2 mt-1">
                                <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                                  {formatExperienceLevel(job.experience_level)}
                                </span>
                                {job.salary_range && (
                                  <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                                    {job.salary_range}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-6">
                        <div className="flex items-center space-x-2">
                          <svg className="w-4 h-4 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span className="text-sm font-medium text-gray-900 dark:text-white">{job.location}</span>
                        </div>
                      </td>
                      <td className="px-6 py-6">
                        <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold ${getJobTypeColor(job.job_type)}`}>
                          {formatJobType(job.job_type)}
                        </span>
                      </td>
                      <td className="px-6 py-6">
                        <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold ${getStatusColor(job.status || getStatusFromIsActive(job.is_active))}`}>
                          <div className={`w-2 h-2 rounded-full mr-2 ${job.status === 'active' || job.is_active ? 'bg-green-400' : 'bg-gray-400'}`}></div>
                          {job.status ? job.status.charAt(0).toUpperCase() + job.status.slice(1) : (job.is_active ? 'Active' : 'Inactive')}
                        </span>
                      </td>
                      <td className="px-6 py-6">
                        <div className="flex items-center space-x-2">
                          <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-green-600 rounded-lg flex items-center justify-center">
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                          </div>
                          <div>
                            <div className="text-lg font-bold text-gray-900 dark:text-white">{job.application_count || 0}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">applications</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-6">
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {new Date(job.created_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </div>
                      </td>
                      <td className="px-6 py-6">
                        <div className="flex items-center space-x-2">
                          {/* Job Board Posting Button */}
                          <button
                            className="group relative p-2 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-all duration-300"
                            onClick={() => {
                              setSelectedJobForPosting(job);
                              setShowPostingModal(true);
                            }}
                            title="Post to Job Boards"
                          >
                            <svg className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                            <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                          </button>
                          
                          {/* Edit Button */}
                          <button
                            className="group relative p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all duration-300"
                            onClick={() => openEditModal(job)}
                            title="Edit Job"
                          >
                            <svg className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                          </button>
                          
                          {/* Delete Button */}
                          <button
                            className="group relative p-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all duration-300"
                            onClick={() => setShowDeleteModal({ open: true, jobId: job._id })}
                            title="Delete Job"
                          >
                            <svg className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>



        {/* Pagination controls */}
        {totalPages > 0 && (
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3 mt-4 sm:mt-6 px-3 sm:px-4 md:px-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
            <div className="text-center sm:text-left text-sm text-gray-600 dark:text-gray-400">
              Showing {(jobListings.length === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1)}-
              {Math.min(currentPage * rowsPerPage, jobListings.length)} of {jobListings.length}
            </div>
            <div className="flex flex-wrap items-center justify-center sm:justify-end">
              <div className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-2 py-2">
                <select
                  value={rowsPerPage}
                  onChange={(e) => {
                    setRowsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  {[10, 20, 50, 100].map((n) => (
                    <option key={n} value={n}>{n} / page</option>
                  ))}
                </select>
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 border rounded-lg text-sm font-medium bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Prev
                </button>
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100 tabular-nums px-3 py-1.5 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
                  {Math.min(currentPage, Math.max(1, totalPages))} / {Math.max(1, totalPages)}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 border rounded-lg text-sm font-medium bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Blur overlay for Add New Job modal */}
      {showAddJobPopup && (
        <div className="fixed inset-0 z-[99999] bg-black/10 backdrop-blur-[2px]" />
      )}
      {/* Add New Job Options Modal */}
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
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-6">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Add New Job</h2>
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
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 text-center">Upload JD</h3>
                  <p className="text-gray-600 dark:text-gray-400 text-xs text-center mb-4">
                    Upload an existing job description document (PDF, DOC, DOCX)
                  </p>
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                    <div className="w-6 h-6 border-2 border-blue-300 rounded-full group-hover:border-blue-500 transition-colors"></div>
                  </div>
                </div>

                {/* Option 2: Generate JD from AI */}
                <div
                  className="relative w-48 h-64 bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 rounded-2xl border-2 border-emerald-200 dark:border-emerald-700 transition-all duration-300 flex flex-col items-center justify-center p-4 group"
                >
                  <div className="w-16 h-16 bg-emerald-500 rounded-xl flex items-center justify-center mb-4 transition-transform duration-300">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 text-center">Generate JD from AI</h3>
                  <p className="text-gray-600 dark:text-gray-400 text-xs text-center mb-4">
                    Create a job description using AI assistance
                  </p>
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                    <div className="w-6 h-6 border-2 border-emerald-300 rounded-full"></div>
                  </div>
                  {/* Coming Soon Overlay */}
                  <div className="absolute inset-0 bg-black/20 dark:bg-black/40 rounded-2xl flex items-center justify-center">
                    <div className="bg-white dark:bg-gray-800 px-4 py-2 rounded-lg shadow-lg">
                      <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Coming Soon</span>
                    </div>
                  </div>
                </div>

                {/* Option 3: Create JD Manually */}
                <div
                  onClick={() => {
                    setShowAddJobPopup(false);
                    setShowCreateJDModal(true);
                  }}
                  className="relative w-48 h-64 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-2xl border-2 border-purple-200 dark:border-purple-700 hover:border-purple-400 dark:hover:border-purple-500 hover:shadow-xl cursor-pointer transition-all duration-300 flex flex-col items-center justify-center p-4 group"
                >
                  <div className="w-16 h-16 bg-purple-500 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 text-center">Create JD Manually</h3>
                  <p className="text-gray-600 dark:text-gray-400 text-xs text-center mb-4">
                    Fill out the job description form manually
                  </p>
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                    <div className="w-6 h-6 border-2 border-purple-300 rounded-full group-hover:border-purple-500 transition-colors"></div>
                  </div>
                </div>
              </div>

              <div className="text-center">
                <button
                  onClick={() => setShowAddJobPopup(false)}
                  className="px-8 py-3 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Blur overlay for Upload JD modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-[99999] bg-black/10 backdrop-blur-[2px]" />
      )}
      {/* Upload JD Modal */}
      {showUploadModal && (
        <div
          className="fixed inset-0 z-[100000] flex items-center justify-center"
          onClick={() => setShowUploadModal(false)}
        >
          <div
            className="relative w-full max-w-[500px] bg-transparent rounded-2xl outline-none focus:outline-none mx-4"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setShowUploadModal(false)}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-800 text-xl font-bold z-10"
              aria-label="Close"
            >
              &times;
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
                    <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Drop your file here</h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">or click to browse</p>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="file-upload"
                  />
                  <label
                    htmlFor="file-upload"
                    className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition cursor-pointer font-medium"
                  >
                    Choose File
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Supported formats: PDF, DOC, DOCX (Max 10MB)</p>
                </div>

                {/* Selected File Display */}
                {selectedFile && (
                  <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 rounded-xl p-4">
                    <div className="flex items-center space-x-3">
                      <svg className="w-6 h-6 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-emerald-900 dark:text-emerald-100">{selectedFile.name}</p>
                        <p className="text-xs text-emerald-600 dark:text-emerald-400">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                      <button
                        onClick={() => setSelectedFile(null)}
                        className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}

                {/* Upload Progress */}
                {uploadProgress > 0 && uploadProgress < 100 && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-700 dark:text-gray-300">Uploading...</span>
                      <span className="text-gray-700 dark:text-gray-300">{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                {/* Upload Status Message */}
                {uploadStatus.type && (
                  <div className={`p-4 rounded-lg ${uploadStatus.type === 'success'
                    ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 text-green-800 dark:text-green-200'
                    : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-800 dark:text-red-200'
                    }`}>
                    <div className="flex items-center gap-2">
                      {uploadStatus.type === 'success' ? (
                        <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                      <span className="text-sm font-medium">{uploadStatus.message}</span>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setShowUploadModal(false)}
                    className="px-6 py-3 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUploadSubmit}
                    disabled={!selectedFile || uploadProgress > 0}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    {uploadProgress > 0 ? 'Uploading...' : 'Upload & Process'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Blur overlay for Create JD modal */}
      {showCreateJDModal && (
        <div className="fixed inset-0 z-[99999] bg-black/10 backdrop-blur-[2px]" />
      )}
      {/* Create JD Modal */}
      {showCreateJDModal && (
        <div
          className="fixed inset-0 z-[100000] flex items-center justify-center"
          onClick={() => setShowCreateJDModal(false)}
        >
          <div
            className="relative w-full max-w-[600px] bg-transparent rounded-2xl outline-none focus:outline-none mx-4"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => {
                setShowCreateJDModal(false);
                setCreateJDErrors({});
              }}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-800 text-xl font-bold z-10"
              aria-label="Close"
            >
              &times;
            </button>
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-6 max-h-[85vh] overflow-y-auto">
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Create Job Description</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">Fill out the job description details</p>
              </div>

              <div className="space-y-4">
                {/* Job Title and Company */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Job Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={createJDData.job_title}
                      onChange={(e) => handleCreateJDChange('job_title', e.target.value)}
                      onBlur={(e) => handleCreateJDBlur('job_title', e.target.value)}
                      disabled={creatingJD}
                      className={`w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${createJDErrors.job_title ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-transparent'
                        }`}
                      placeholder="Enter job title"
                    />
                    {createJDErrors.job_title && (
                      <div className="text-red-600 text-sm mt-1 p-2 bg-red-50 border border-red-200 rounded">
                        {createJDErrors.job_title}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Job Function <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={createJDData.job_function}
                      onChange={(e) => handleCreateJDChange('job_function', e.target.value)}
                      onBlur={(e) => handleCreateJDBlur('job_function', e.target.value)}
                      disabled={creatingJD}
                      placeholder="Enter job function"
                      className={`w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${createJDErrors.job_function ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-transparent'
                        }`}
                    />
                    {createJDErrors.job_function && (
                      <div className="text-red-600 text-sm mt-1 p-2 bg-red-50 border border-red-200 rounded">
                        {createJDErrors.job_function}
                      </div>
                    )}
                  </div>
                </div>

                {/* Location */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Location <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={createJDData.location}
                    onChange={(e) => handleCreateJDChange('location', e.target.value)}
                    onBlur={(e) => handleCreateJDBlur('location', e.target.value)}
                    disabled={creatingJD}
                    className={`w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${createJDErrors.location ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-transparent'
                      }`}
                    placeholder="Enter location"
                  />
                  {createJDErrors.location && (
                    <div className="text-red-600 text-sm mt-1 p-2 bg-red-50 border border-red-200 rounded">
                      {createJDErrors.location}
                    </div>
                  )}
                </div>

                {/* Job Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Job Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={createJDData.description || ''}
                    onChange={(e) => handleCreateJDChange('description', e.target.value)}
                    onBlur={(e) => handleCreateJDBlur('description', e.target.value)}
                    disabled={creatingJD}
                    rows={4}
                    className={`w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 transition-colors resize-y disabled:opacity-50 disabled:cursor-not-allowed ${createJDErrors.description ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-transparent'
                      }`}
                    placeholder="Enter job description"
                  />
                  {createJDErrors.description && (
                    <div className="text-red-600 text-sm mt-1 p-2 bg-red-50 border border-red-200 rounded">
                      {createJDErrors.description}
                    </div>
                  )}
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Provide a comprehensive description of the role, responsibilities, and what the position entails.</p>
                </div>

                {/* Key Skills */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Key Skills <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={createJDData.key_skills || ''}
                    onChange={(e) => handleCreateJDChange('key_skills', e.target.value)}
                    onBlur={(e) => handleCreateJDBlur('key_skills', e.target.value)}
                    disabled={creatingJD}
                    rows={4}
                    className={`w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 transition-colors resize-y disabled:opacity-50 disabled:cursor-not-allowed ${createJDErrors.key_skills ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-transparent'
                      }`}
                    placeholder="Enter required skills"
                  />
                  {createJDErrors.key_skills && (
                    <div className="text-red-600 text-sm mt-1 p-2 bg-red-50 border border-red-200 rounded">
                      {createJDErrors.key_skills}
                    </div>
                  )}
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Enter the key skills required for this position. You can use commas, spaces, and any special characters as needed.</p>
                </div>

                {/* Education Requirements */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Education Requirements <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={createJDData.education_requirements}
                    onChange={(e) => handleCreateJDChange('education_requirements', e.target.value)}
                    onBlur={(e) => handleCreateJDBlur('education_requirements', e.target.value)}
                    disabled={creatingJD}
                    rows={3}
                    className={`w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 transition-colors resize-y disabled:opacity-50 disabled:cursor-not-allowed ${createJDErrors.education_requirements ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-transparent'
                      }`}
                    placeholder="Enter education details"
                  />
                  {createJDErrors.education_requirements && (
                    <div className="text-red-600 text-sm mt-1 p-2 bg-red-50 border border-red-200 rounded">
                      {createJDErrors.education_requirements}
                    </div>
                  )}
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Specify the minimum education level and field of study required for this position.</p>
                </div>

                {/* Certifications */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Certifications</label>
                  <textarea
                    value={createJDData.certifications || ''}
                    onChange={(e) => handleCreateJDChange('certifications', e.target.value)}
                    onBlur={(e) => handleCreateJDBlur('certifications', e.target.value)}
                    disabled={creatingJD}
                    rows={3}
                    className={`w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 transition-colors resize-y disabled:opacity-50 disabled:cursor-not-allowed ${createJDErrors.certifications ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-transparent'
                      }`}
                    placeholder="Enter certifications"
                  />
                  {createJDErrors.certifications && (
                    <div className="text-red-600 text-sm mt-1 p-2 bg-red-50 border border-red-200 rounded">
                      {createJDErrors.certifications}
                    </div>
                  )}
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Enter any certifications required for this position. You can use commas, spaces, and any special characters as needed.</p>
                </div>





                {/* Experience Level and Job Type */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Experience Level <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={createJDData.experience_level}
                      onChange={(e) => handleCreateJDChange('experience_level', e.target.value)}
                      onBlur={(e) => handleCreateJDBlur('experience_level', e.target.value)}
                      disabled={creatingJD}
                      className={`w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${createJDErrors.experience_level ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-transparent'
                        }`}
                    >
                      <option value="">Select experience level</option>
                      {['entry', 'mid', 'senior', 'executive'].map(level => (
                        <option key={level} value={level}>{level.charAt(0).toUpperCase() + level.slice(1)}</option>
                      ))}
                    </select>
                    {createJDErrors.experience_level && (
                      <div className="text-red-600 text-sm mt-1 p-2 bg-red-50 border border-red-200 rounded">
                        {createJDErrors.experience_level}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Job Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={createJDData.job_type}
                      onChange={(e) => handleCreateJDChange('job_type', e.target.value)}
                      onBlur={(e) => handleCreateJDBlur('job_type', e.target.value)}
                      disabled={creatingJD}
                      className={`w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${createJDErrors.job_type ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-transparent'
                        }`}
                    >
                      <option value="">Select Job Type</option>
                      {['full-time', 'part-time', 'contract', 'internship'].map(type => (
                        <option key={type} value={type}>
                          {type.charAt(0).toUpperCase() + type.slice(1).replace('-', ' ')}
                        </option>
                      ))}
                    </select>
                    {createJDErrors.job_type && (
                      <div className="text-red-600 text-sm mt-1 p-2 bg-red-50 border border-red-200 rounded">
                        {createJDErrors.job_type}
                      </div>
                    )}
                  </div>
                </div>

                {/* Salary Range */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Salary Range</label>
                  <input
                    type="text"
                    value={createJDData.salary_range}
                    onChange={(e) => handleCreateJDChange('salary_range', e.target.value)}
                    onBlur={(e) => handleCreateJDBlur('salary_range', e.target.value)}
                    disabled={creatingJD}
                    className={`w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${createJDErrors.salary_range ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-transparent'
                      }`}
                    placeholder="e.g., $50,000 - $70,000"
                  />
                  {createJDErrors.salary_range && (
                    <div className="text-red-600 text-sm mt-1 p-2 bg-red-50 border border-red-200 rounded">
                      {createJDErrors.salary_range}
                    </div>
                  )}
                </div>

                {/* Create JD Status Message */}
                {createJDStatus.type && (
                  <div className={`p-4 rounded-lg ${createJDStatus.type === 'success'
                    ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 text-green-800 dark:text-green-200'
                    : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-800 dark:text-red-200'
                    }`}>
                    <div className="flex items-center gap-2">
                      {createJDStatus.type === 'success' ? (
                        <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
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

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    onClick={() => {
                      setShowCreateJDModal(false);
                      setCreateJDErrors({});
                      setCreateJDStatus({ type: null, message: '' });
                      setCreatingJD(false);
                    }}
                    disabled={creatingJD}
                    className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateJDSubmit}
                    disabled={creatingJD || !createJDData.job_title || !createJDData.job_function || !createJDData.location || !createJDData.experience_level || !createJDData.description || !createJDData.key_skills || !createJDData.education_requirements}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    {creatingJD ? 'Creating...' : 'Create Job Description'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Blur overlay for Edit modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-[99999] bg-black/10 backdrop-blur-[2px]" />
      )}
      {/* Edit Job Modal */}
      {showEditModal && (
        <div
          className="fixed inset-0 z-[100000] flex items-center justify-center"
          onClick={() => setShowEditModal(false)}
        >
          <div
            className="relative w-full max-w-[600px] bg-transparent rounded-2xl outline-none focus:outline-none mx-4"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => {
                setShowEditModal(false);
                setEditJobErrors({});
              }}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-800 text-xl font-bold z-10"
              aria-label="Close"
            >
              &times;
            </button>
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-6 max-h-[85vh] overflow-y-auto">
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Edit Job Listing</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">Update the job listing details</p>
              </div>

              <form onSubmit={handleUpdateJob} className="space-y-4">
                {/* Job Title and Job Function */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Job Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={editJobData.title}
                      onChange={(e) => handleEditJobChange('title', e.target.value)}
                      onBlur={(e) => handleEditJobBlur('title', e.target.value)}
                      disabled={editingJob}
                      className={`w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${editJobErrors.title ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-transparent'
                        }`}
                      placeholder="Enter job title"
                      required
                    />
                    {editJobErrors.title && (
                      <div className="text-red-600 text-sm mt-1 p-2 bg-red-50 border border-red-200 rounded">
                        {editJobErrors.title}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Job Function <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={editJobData.job_function}
                      onChange={(e) => handleEditJobChange('job_function', e.target.value)}
                      onBlur={(e) => handleEditJobBlur('job_function', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 transition-colors ${editJobErrors.job_function ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-transparent'
                        }`}
                      placeholder="Enter job function"
                      required
                    />
                    {editJobErrors.job_function && (
                      <div className="text-red-600 text-sm mt-1 p-2 bg-red-50 border border-red-200 rounded">
                        {editJobErrors.job_function}
                      </div>
                    )}
                  </div>
                </div>

                {/* Location */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Location <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editJobData.location}
                    onChange={(e) => handleEditJobChange('location', e.target.value)}
                    onBlur={(e) => handleEditJobBlur('location', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 transition-colors ${editJobErrors.location ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-transparent'
                      }`}
                    placeholder="Enter location"
                    required
                  />
                  {editJobErrors.location && (
                    <div className="text-red-600 text-sm mt-1 p-2 bg-red-50 border border-red-200 rounded">
                      {editJobErrors.location}
                    </div>
                  )}
                </div>

                {/* Job Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Job Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={editJobData.description}
                    onChange={(e) => handleEditJobChange('description', e.target.value)}
                    onBlur={(e) => handleEditJobBlur('description', e.target.value)}
                    rows={4}
                    className={`w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 transition-colors resize-y ${editJobErrors.description ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-transparent'
                      }`}
                    placeholder="Enter detailed job description"
                    required
                  />
                  {editJobErrors.description && (
                    <div className="text-red-600 text-sm mt-1 p-2 bg-red-50 border border-red-200 rounded">
                      {editJobErrors.description}
                    </div>
                  )}
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Provide a comprehensive description of the role, responsibilities, and what the position entails.
                    </span>
                    <span className={`text-xs ${
                      editJobData.description.length < 50 ? 'text-red-500' : 
                      editJobData.description.length > 4500 ? 'text-yellow-500' : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      {editJobData.description.length}/5000
                    </span>
                  </div>
                </div>

                {/* Key Skills */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Key Skills <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={(editJobData.key_skills ?? []).join(', ')}
                    onChange={(e) => {
                      const skills = e.target.value.split(',').map(skill => skill.trim()).filter(skill => skill);
                      handleEditJobChange('key_skills', skills);
                    }}
                    onBlur={(e) => {
                      const skills = e.target.value.split(',').map(skill => skill.trim()).filter(skill => skill);
                      handleEditJobBlur('key_skills', skills);
                    }}
                    rows={4}
                    className={`w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 transition-colors resize-y ${editJobErrors.key_skills ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-transparent'
                      }`}
                    placeholder="Enter required skills"
                    required
                  />
                  {editJobErrors.key_skills && (
                    <div className="text-red-600 text-sm mt-1 p-2 bg-red-50 border border-red-200 rounded">
                      {editJobErrors.key_skills}
                    </div>
                  )}
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Enter the key skills required for this position. You can use commas, spaces, and any special characters as needed.</p>
                </div>

                {/* Education Requirements */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Education Requirements <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={editJobData.education_requirements}
                    onChange={(e) => handleEditJobChange('education_requirements', e.target.value)}
                    onBlur={(e) => handleEditJobBlur('education_requirements', e.target.value)}
                    rows={2}
                    className={`w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 transition-colors ${editJobErrors.education_requirements ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-transparent'
                      }`}
                    placeholder="Enter education details"
                    required
                  />
                  {editJobErrors.education_requirements && (
                    <div className="text-red-600 text-sm mt-1 p-2 bg-red-50 border border-red-200 rounded">
                      {editJobErrors.education_requirements}
                    </div>
                  )}
                </div>

                {/* Certifications */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Certifications</label>
                  <textarea
                    value={editJobData.certifications?.join(', ') || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      setEditJobData({ ...editJobData, certifications: value.split(',').map(cert => cert.trim()).filter(cert => cert) });
                      handleEditJobChange('certifications', value);
                    }}
                    onBlur={(e) => handleEditJobBlur('certifications', e.target.value)}
                    rows={3}
                    className={`w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 transition-colors resize-y ${editJobErrors.certifications ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-transparent'
                      }`}
                    placeholder="Enter certifications"
                  />
                  {editJobErrors.certifications && (
                    <div className="text-red-600 text-sm mt-1 p-2 bg-red-50 border border-red-200 rounded">
                      {editJobErrors.certifications}
                    </div>
                  )}
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Enter any certifications required for this position. You can use commas, spaces, and any special characters as needed.</p>
                </div>

                {/* Experience Level and Job Type */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Experience Level <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={editJobData.experience_level}
                      onChange={(e) => handleEditJobChange('experience_level', e.target.value)}
                      onBlur={(e) => handleEditJobBlur('experience_level', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 transition-colors ${editJobErrors.experience_level ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-transparent'
                        }`}
                      required
                    >
                      <option value="">Select Experience Level</option>
                      {['entry', 'mid', 'senior', 'executive'].map(level => (
                        <option key={level} value={level}>{level.charAt(0).toUpperCase() + level.slice(1)}</option>
                      ))}
                    </select>
                    {editJobErrors.experience_level && (
                      <div className="text-red-600 text-sm mt-1 p-2 bg-red-50 border border-red-200 rounded">
                        {editJobErrors.experience_level}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Job Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={editJobData.job_type}
                      onChange={(e) => handleEditJobChange('job_type', e.target.value)}
                      onBlur={(e) => handleEditJobBlur('job_type', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 transition-colors ${editJobErrors.job_type ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-transparent'
                        }`}
                      required
                    >
                      <option value="">Select Job Type</option>
                      {['full-time', 'part-time', 'contract', 'internship'].map(type => (
                        <option key={type} value={type}>
                          {type.charAt(0).toUpperCase() + type.slice(1).replace('-', ' ')}
                        </option>
                      ))}
                    </select>
                    {editJobErrors.job_type && (
                      <div className="text-red-600 text-sm mt-1 p-2 bg-red-50 border border-red-200 rounded">
                        {editJobErrors.job_type}
                      </div>
                    )}
                  </div>
                </div>

                {/* Salary Range and Status */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Salary Range</label>
                    <input
                      type="text"
                      value={editJobData.salary_range}
                      onChange={(e) => handleEditJobChange('salary_range', e.target.value)}
                      onBlur={(e) => handleEditJobBlur('salary_range', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 transition-colors ${editJobErrors.salary_range ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-transparent'
                        }`}
                      placeholder="e.g., $50,000 - $70,000"
                    />
                    {editJobErrors.salary_range && (
                      <div className="text-red-600 text-sm mt-1 p-2 bg-red-50 border border-red-200 rounded">
                        {editJobErrors.salary_range}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Status <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={editJobData.status || 'active'}
                      onChange={(e) => handleEditJobChange('status', e.target.value)}
                      onBlur={(e) => handleEditJobBlur('status', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 transition-colors ${editJobErrors.status ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-transparent'
                        }`}
                      required
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                    {editJobErrors.status && (
                      <div className="text-red-600 text-sm mt-1 p-2 bg-red-50 border border-red-200 rounded">
                        {editJobErrors.status}
                      </div>
                    )}
                  </div>
                </div>

                {/* Edit Job Status Message */}
                {editJobStatus.type && (
                  <div className={`p-4 rounded-lg ${editJobStatus.type === 'success'
                    ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 text-green-800 dark:text-green-200'
                    : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-800 dark:text-red-200'
                    }`}>
                    <div className="flex items-center gap-2">
                      {editJobStatus.type === 'success' ? (
                        <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                      <span className="text-sm font-medium">{editJobStatus.message}</span>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setEditJobErrors({});
                      setEditJobStatus({ type: null, message: '' });
                      setEditingJob(false);
                    }}
                    disabled={editingJob}
                    className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={editingJob || !editJobData.title || !editJobData.job_function || !editJobData.description || !editJobData.location || !editJobData.experience_level || editJobData.key_skills.length === 0 || !editJobData.education_requirements}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    {editingJob ? 'Updating...' : 'Update Job Listing'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal isOpen={showDeleteModal.open} onClose={() => setShowDeleteModal({ open: false, jobId: null })}>
        <div className="p-6 max-w-full w-[90vw] sm:w-[400px] flex flex-col gap-4">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Delete Job Listing</h3>
          <p className="text-gray-700 dark:text-gray-300">
            Are you sure you want to delete this job listing? <br />
            <span className="font-semibold text-red-600">This action cannot be undone.</span>
          </p>

          {/* Delete Job Status Message */}
          {deleteJobStatus.type && (
            <div className={`p-3 rounded-lg ${deleteJobStatus.type === 'success'
              ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 text-green-800 dark:text-green-200'
              : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-800 dark:text-red-200'
              }`}>
              <div className="flex items-center gap-2">
                {deleteJobStatus.type === 'success' ? (
                  <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
                <span className="text-sm font-medium">{deleteJobStatus.message}</span>
              </div>
            </div>
          )}
          <div className="flex justify-end gap-3 mt-4">
            <button
              onClick={() => setShowDeleteModal({ open: false, jobId: null })}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition font-medium border border-gray-300 dark:border-gray-600 rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={() => handleDeleteJob(showDeleteModal.jobId!)}
              disabled={deleting}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {deleting ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Blur overlay for Integration modal */}
      {showIntegrationModal && (
        <div className="fixed inset-0 z-[99999] bg-black/10 backdrop-blur-[2px]" />
      )}
      {/* Job Board Integration Settings Modal */}
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
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-6">
              {integrationModalStep === 'select' && (
                <>
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
                        <div className="bg-white dark:bg-gray-800 px-4 py-2 rounded-lg shadow-lg">
                          <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Coming Soon</span>
                        </div>
                      </div>
                    </div>

                    {/* Indeed */}
                    <div
                      className="relative w-48 h-64 bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/20 dark:to-indigo-800/20 rounded-2xl border-2 border-indigo-200 dark:border-indigo-700 transition-all duration-300 flex flex-col items-center justify-center p-4 group"
                    >
                      <div className="w-16 h-16 bg-[#003A9B] rounded-xl flex items-center justify-center mb-4 transition-transform duration-300">
                        <span className="text-white text-xs font-bold">indeed</span>
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 text-center">Indeed</h3>
                      <p className="text-gray-600 dark:text-gray-400 text-xs text-center mb-4">
                        Connect to Indeed job platform
                      </p>
                      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                        <div className="w-6 h-6 border-2 border-indigo-300 rounded-full"></div>
                      </div>
                      {/* Coming Soon Overlay */}
                      <div className="absolute inset-0 bg-black/20 dark:bg-black/40 rounded-2xl flex items-center justify-center">
                        <div className="bg-white dark:bg-gray-800 px-4 py-2 rounded-lg shadow-lg">
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
                        <div className="bg-white dark:bg-gray-800 px-4 py-2 rounded-lg shadow-lg">
                          <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Coming Soon</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="text-center">
                    <button
                      onClick={() => setShowIntegrationModal(false)}
                      className="px-8 py-3 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              )}

              {integrationModalStep === 'configure' && (
                <div className="max-h-[70vh] overflow-y-auto">
                  <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                      Configure {selectedIntegrationPlatform === 'linkedin' ? 'LinkedIn' : selectedIntegrationPlatform === 'indeed' ? 'Indeed' : 'Naukri'} Integration
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400 text-base">Set up your API credentials and connection settings</p>
                  </div>

                  {selectedIntegrationPlatform === 'linkedin' && (
                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 mb-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-[#0A66C2] rounded-lg flex items-center justify-center">
                            <span className="text-white text-xs font-black">in</span>
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">LinkedIn</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Post jobs to LinkedIn</p>
                          </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={integrationSettings.linkedin_enabled}
                            onChange={(e) => setIntegrationSettings({ ...integrationSettings, linkedin_enabled: e.target.checked })}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                      {integrationSettings.linkedin_enabled && (
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Access Token</label>
                            <input
                              type="password"
                              value={integrationSettings.linkedin_access_token || ''}
                              onChange={(e) => setIntegrationSettings({ ...integrationSettings, linkedin_access_token: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="Enter LinkedIn access token"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Company LinkedIn ID</label>
                            <input
                              type="text"
                              value={integrationSettings.company_linkedin_id || ''}
                              onChange={(e) => setIntegrationSettings({ ...integrationSettings, company_linkedin_id: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="Enter company LinkedIn ID"
                            />
                          </div>
                          <button
                            onClick={() => testJobBoardConnection('linkedin')}
                            className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
                          >
                            Test Connection
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {selectedIntegrationPlatform === 'indeed' && (
                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 mb-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-[#003A9B] rounded-lg flex items-center justify-center">
                            <span className="text-white text-[10px] font-bold">indeed</span>
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Indeed</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Post jobs to Indeed</p>
                          </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={integrationSettings.indeed_enabled}
                            onChange={(e) => setIntegrationSettings({ ...integrationSettings, indeed_enabled: e.target.checked })}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                      {integrationSettings.indeed_enabled && (
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">API Key</label>
                            <input
                              type="password"
                              value={integrationSettings.indeed_api_key || ''}
                              onChange={(e) => setIntegrationSettings({ ...integrationSettings, indeed_api_key: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="Enter Indeed API key"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Company Indeed ID</label>
                            <input
                              type="text"
                              value={integrationSettings.company_indeed_id || ''}
                              onChange={(e) => setIntegrationSettings({ ...integrationSettings, company_indeed_id: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="Enter company Indeed ID"
                            />
                          </div>
                          <button
                            onClick={() => testJobBoardConnection('indeed')}
                            className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
                          >
                            Test Connection
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {selectedIntegrationPlatform === 'naukri' && (
                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 mb-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-[#1F9D8D] rounded-lg flex items-center justify-center">
                            <span className="text-white text-[10px] font-bold">naukri</span>
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Naukri</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Post jobs to Naukri</p>
                          </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={integrationSettings.naukri_enabled}
                            onChange={(e) => setIntegrationSettings({ ...integrationSettings, naukri_enabled: e.target.checked })}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                      {integrationSettings.naukri_enabled && (
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">API Key</label>
                            <input
                              type="password"
                              value={integrationSettings.naukri_api_key || ''}
                              onChange={(e) => setIntegrationSettings({ ...integrationSettings, naukri_api_key: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="Enter Naukri API key"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Company Naukri ID</label>
                            <input
                              type="text"
                              value={integrationSettings.company_naukri_id || ''}
                              onChange={(e) => setIntegrationSettings({ ...integrationSettings, company_naukri_id: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="Enter company Naukri ID"
                            />
                          </div>
                          <button
                            onClick={() => testJobBoardConnection('naukri')}
                            className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
                          >
                            Test Connection
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Test Connection Status Message */}
                  {testConnectionStatus.type && (
                    <div className={`p-4 rounded-lg mb-4 ${testConnectionStatus.type === 'success'
                      ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 text-green-800 dark:text-green-200'
                      : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-800 dark:text-red-200'
                      }`}>
                      <div className="flex items-center gap-2">
                        {testConnectionStatus.type === 'success' ? (
                          <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        )}
                        <span className="text-sm font-medium">{testConnectionStatus.message}</span>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between sm:justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={() => setIntegrationModalStep('select')}
                      className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors font-medium"
                    >
                      Back
                    </button>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setShowIntegrationModal(false)}
                        className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors font-medium"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => updateIntegrationSettings(integrationSettings)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                      >
                        Save Settings
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Job Board Posting Modal */}
      {showPostingModal && selectedJobForPosting && (
        <>
          <div className="fixed inset-0 z-[99999] bg-black/10 backdrop-blur-[2px]" />
          <div
            className="fixed inset-0 z-[100000] flex items-center justify-center"
            onClick={() => setShowPostingModal(false)}
          >
            <div
              className="relative w-full max-w-[700px] bg-transparent rounded-2xl outline-none focus:outline-none mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setShowPostingModal(false)}
                className="absolute top-3 right-3 text-gray-500 hover:text-gray-800 text-xl font-bold z-10"
                aria-label="Close"
              >
                &times;
              </button>
              <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Post to Job Boards</h2>
                </div>

                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{selectedJobForPosting.title}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{selectedJobForPosting.job_function} • {selectedJobForPosting.location}</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Select Platforms</label>
                    <div className="space-y-2">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={postingPlatforms.includes('linkedin')}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setPostingPlatforms([...postingPlatforms, 'linkedin']);
                            } else {
                              setPostingPlatforms(postingPlatforms.filter(p => p !== 'linkedin'));
                            }
                          }}
                          disabled={!integrationSettings.linkedin_enabled}
                          className="mr-2"
                        />
                        <span className={`${!integrationSettings.linkedin_enabled ? 'text-gray-400' : 'text-gray-700 dark:text-gray-300'}`}>
                          LinkedIn {!integrationSettings.linkedin_enabled && '(Not configured)'}
                        </span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={postingPlatforms.includes('indeed')}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setPostingPlatforms([...postingPlatforms, 'indeed']);
                            } else {
                              setPostingPlatforms(postingPlatforms.filter(p => p !== 'indeed'));
                            }
                          }}
                          disabled={!integrationSettings.indeed_enabled}
                          className="mr-2"
                        />
                        <span className={`${!integrationSettings.indeed_enabled ? 'text-gray-400' : 'text-gray-700 dark:text-gray-300'}`}>
                          Indeed {!integrationSettings.indeed_enabled && '(Not configured)'}
                        </span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={postingPlatforms.includes('naukri')}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setPostingPlatforms([...postingPlatforms, 'naukri']);
                            } else {
                              setPostingPlatforms(postingPlatforms.filter(p => p !== 'naukri'));
                            }
                          }}
                          disabled={!integrationSettings.naukri_enabled}
                          className="mr-2"
                        />
                        <span className={`${!integrationSettings.naukri_enabled ? 'text-gray-400' : 'text-gray-700 dark:text-gray-300'}`}>
                          Naukri {!integrationSettings.naukri_enabled && '(Not configured)'}
                        </span>
                      </label>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <button
                      onClick={() => setShowPostingModal(false)}
                      className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => postJobToJobBoards(selectedJobForPosting._id, postingPlatforms)}
                      disabled={postingInProgress || postingPlatforms.length === 0}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                    >
                      {postingInProgress ? 'Posting...' : 'Post to Selected Platforms'}
                    </button>
                  </div>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  <button
                    onClick={() => setShowPostingModal(false)}
                    className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  {/* Post button remains as defined later in existing JSX */}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Posting Results Modal */}
      {showPostingResults && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center">
          <div className="fixed inset-0 z-[99999] bg-black/50" onClick={() => setShowPostingResults(false)}></div>
          <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-6 w-full max-w-lg mx-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Posting Results</h2>
              <button
                onClick={() => setShowPostingResults(false)}
                className="text-gray-500 hover:text-gray-800 text-xl font-bold"
              >
                &times;
              </button>
            </div>

            <div className="space-y-3">
              {postingResults.map((result, index) => (
                <div key={`${result.platform}-${result.posting_id || index}`} className={`p-3 rounded-lg border ${result.status === 'posted'
                    ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-700'
                    : 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-700'
                  }`}>
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-900 dark:text-white capitalize">{result.platform}</span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${result.status === 'posted'
                        ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-200'
                        : 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-200'
                      }`}>
                      {result.status}
                    </span>
                  </div>
                  {result.error_message && (
                    <p className="text-sm text-red-600 dark:text-red-400 mt-1">{result.error_message}</p>
                  )}
                  {result.posting_id && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">ID: {result.posting_id}</p>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-4">
              <button
                onClick={() => setShowPostingResults(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
