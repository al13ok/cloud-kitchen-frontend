"use client"

import React, { useState, useEffect, useMemo, useCallback } from "react"
import Image from "next/image"
import { useForm } from "react-hook-form"
import { API_CONFIG, buildApiUrl } from '@/config/api'

import Label from "@/components/form/Label"
import Badge from "@/components/ui/badge/Badge"
import { Save, Trash2, CheckCircle2, XCircle, AlertTriangle, X, Edit, RotateCcw } from "lucide-react"

// Type Definitions
type OptionItem = {
  id: string
  name: string
  label?: string
  description?: string
}

type PriorityItem = {
  id: string
  parameter: string
  description: string
  value: string
}

type FitScoreSetting = {
  id: string
  category: "skill" | "experience" | "education"
  name: string
  weight: number
  job_id?: string
}

type AlertState = {
  show: boolean
  variant: "success" | "error" | "warning" | "info"
  title: string
  message: string
}

type BrandingConfig = {
  company_name: string
  company_email: string
  company_website?: string
  email_signature: string
  primary_color: string
  secondary_color: string
  header_title?: string
  header_subtitle?: string
  footer_powered_by_text?: string
  footer_powered_by_url?: string
  footer_privacy_policy_url?: string
  footer_copyright_text?: string
}

type JobOption = {
  _id: string
  job_id: string
  title: string
  job_function: string
  location: string
  experience_level: string
  education_requirements?: string
  key_skills?: string[]
  status: string
}

interface FieldBase {
  label: string
  required: boolean
}

interface TextFieldConfig extends FieldBase {
  placeholder: string
}

interface SelectFieldConfig extends FieldBase {
  options: string[]
}

interface ResumeFieldConfig extends FieldBase {
  maxSize: number
  disabled: boolean
}

interface JobApplicationFormConfig {
  widget_id: string
  title: string
  fields: {
    name: TextFieldConfig
    email: TextFieldConfig
    phone: TextFieldConfig
    category: SelectFieldConfig
    experience: SelectFieldConfig
    resume: ResumeFieldConfig
  }
  submitButtonText: string
  successMessage: string
}

// Simple separator (unused - kept for potential future use)
// const Separator: React.FC = () => <div className="h-px bg-gray-200 dark:bg-gray-700 my-4" />

export function JobSettingsManagement({ jobId }: { jobId?: string }) {
  // State Management
  const [jobCategories, setJobCategories] = useState<OptionItem[]>([])
  const [experienceLevels, setExperienceLevels] = useState<OptionItem[]>([])
  const [jobTypes, setJobTypes] = useState<OptionItem[]>([])
  const [jobTypeInput, setJobTypeInput] = useState("")
  const [jobTypeError, setJobTypeError] = useState<string | null>(null)
  const [adminEmails, setAdminEmails] = useState<string[]>([])
  const [priorityItems, setPriorityItems] = useState<PriorityItem[]>([])
  const [fitScores, setFitScores] = useState<FitScoreSetting[]>([])
  const [availableJobs, setAvailableJobs] = useState<JobOption[]>([])
  const [selectedJobIdForFit, setSelectedJobIdForFit] = useState<string | undefined>(jobId || undefined)
  const [selectedJobIdForScreening, setSelectedJobIdForScreening] = useState<string | undefined>(jobId || undefined)
  // Derived state for selected jobs
  const selectedFitJob = availableJobs.find(j => j.job_id === selectedJobIdForFit) || null
  const selectedScreeningJob = availableJobs.find(j => j.job_id === selectedJobIdForScreening) || null
  const [loading, setLoading] = useState(true)
  const [backendConnected, setBackendConnected] = useState<boolean | null>(null)
  const [alert, setAlert] = useState<AlertState>({
    show: false,
    variant: "info",
    title: "",
    message: "",
  })

  // Form Configuration State
  const [formConfig, setFormConfig] = useState<JobApplicationFormConfig | null>(null)

  // Applicant Message State
  const [draftApplicantMessage, setDraftApplicantMessage] = useState("Dear {name},\n\nThank you for your application for the position of {job_position}.\n\nApplication Details:\n• Application ID: {applicant_id}\n• Position: {job_position}\n\nWe have received your resume and will review it carefully. You will be contacted soon regarding the next steps in the hiring process.\n\nBest regards,\nRecruitment Team")
  const [applicantMsgPlaceholders] = useState<string[]>([
    "[name]",
    "[applicant_id]",
    "[job_category]",
    "[job_position]",
  ])
  const [isEditingApplicantMessage, setIsEditingApplicantMessage] = useState(false)

  // Priority Settings State
  const [selectedPriorityCategory, setSelectedPriorityCategory] = useState<string | null>(null)
  const [priority, setPriority] = useState<number | "">("")
  const [priorityError, setPriorityError] = useState<string | null>(null)
  const [priorityCategoryError, setPriorityCategoryError] = useState<string | null>(null)

  // Fit Score Settings State
  const [newFitCategory, setNewFitCategory] = useState<"skill" | "experience" | "education" | "Select Category">(
    "Select Category",
  )
  const [newFitName, setNewFitName] = useState("")
  const [isCustomFitName, setIsCustomFitName] = useState(false) // New state for custom input toggle
  const [newFitWeight, setNewFitWeight] = useState<number | "">(20)
  const [editingFitScore, setEditingFitScore] = useState<FitScoreSetting | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [fitCategoryError, setFitCategoryError] = useState<string | null>(null)
  const [newFitNameError, setNewFitNameError] = useState<string | null>(null)
  const [newFitWeightError, setNewFitWeightError] = useState<string | null>(null)

  // Application Screening Score State
  const [screeningScore, setScreeningScore] = useState<number | "">(70)
  const [screeningScoreError, setScreeningScoreError] = useState<string | null>(null)
  const [screeningEnabled, setScreeningEnabled] = useState(false)
  const [screeningScoreLoading, setScreeningScoreLoading] = useState(false)
  const [showScreeningExplanation, setShowScreeningExplanation] = useState(false)


  // Logo Management State
  const [currentLogoUrl, setCurrentLogoUrl] = useState<string | null>(null)
  const [logoUploading, setLogoUploading] = useState(false)
  const [logoDeleting, setLogoDeleting] = useState(false)
  const [showDeleteLogoModal, setShowDeleteLogoModal] = useState(false)

  // Dropdown State - All dropdowns start closed
  const [openDropdowns, setOpenDropdowns] = useState<{
    category: boolean
    experience: boolean
    jobType: boolean
    jobSelection: boolean
    screeningJob: boolean
  }>({
    category: false,
    experience: false,
    jobType: false,
    jobSelection: false,
    screeningJob: false,
  })

  // Function to toggle dropdown
  const toggleDropdown = (type: 'category' | 'experience' | 'jobType' | 'jobSelection') => {
    setOpenDropdowns((prev) => ({
      ...prev,
      [type]: !prev[type],
      // Close other dropdowns when opening one
      ...(type === 'category' ? { experience: false, jobType: false, jobSelection: false } : {}),
      ...(type === 'experience' ? { category: false, jobType: false, jobSelection: false } : {}),
      ...(type === 'jobType' ? { category: false, experience: false, jobSelection: false } : {}),
      ...(type === 'jobSelection' ? { category: false, experience: false, jobType: false } : {}),
    }))
  }

  // Refs for dropdown containers
  const categoryDropdownRef = React.useRef<HTMLDivElement>(null)
  const experienceDropdownRef = React.useRef<HTMLDivElement>(null)
  const jobTypeDropdownRef = React.useRef<HTMLDivElement>(null)
  const jobSelectionDropdownRef = React.useRef<HTMLDivElement>(null)
  const screeningJobDropdownRef = React.useRef<HTMLDivElement>(null)

  // Click outside handler for dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement

      // Close category dropdown if clicking outside
      if (openDropdowns.category) {
        const isClickInsideDropdown = categoryDropdownRef.current?.contains(target)
        const isClickOnToggle = target.closest('[data-category-toggle]')

        if (!isClickInsideDropdown && !isClickOnToggle) {
          setOpenDropdowns((prev) => ({ ...prev, category: false }))
        }
      }

      // Close experience dropdown if clicking outside
      if (openDropdowns.experience) {
        const isClickInsideDropdown = experienceDropdownRef.current?.contains(target)
        const isClickOnToggle = target.closest('[data-experience-toggle]')

        if (!isClickInsideDropdown && !isClickOnToggle) {
          setOpenDropdowns((prev) => ({ ...prev, experience: false }))
        }
      }

      // Close job type dropdown if clicking outside
      if (openDropdowns.jobType) {
        const isClickInsideDropdown = jobTypeDropdownRef.current?.contains(target)
        const isClickOnToggle = target.closest('[data-jobtype-toggle]')

        if (!isClickInsideDropdown && !isClickOnToggle) {
          setOpenDropdowns((prev) => ({ ...prev, jobType: false }))
        }
      }

      // Close job selection dropdown if clicking outside
      if (openDropdowns.jobSelection) {
        const isClickInsideDropdown = jobSelectionDropdownRef.current?.contains(target)
        const isClickOnToggle = target.closest('[data-job-selection-toggle]')

        if (!isClickInsideDropdown && !isClickOnToggle) {
          setOpenDropdowns((prev) => ({ ...prev, jobSelection: false }))
        }
      }

      // Close screening job dropdown if clicking outside
      if (openDropdowns.screeningJob) {
        const isClickInsideDropdown = screeningJobDropdownRef.current?.contains(target)
        const isClickOnToggle = target.closest('[data-screening-job-toggle]')

        if (!isClickInsideDropdown && !isClickOnToggle) {
          setOpenDropdowns((prev) => ({ ...prev, screeningJob: false }))
        }
      }
    }

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpenDropdowns({
          category: false,
          experience: false,
          jobType: false,
          jobSelection: false,
          screeningJob: false,
        })
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscapeKey)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscapeKey)
    }
  }, [openDropdowns])

  // Email Branding State
  const [branding, setBranding] = useState<BrandingConfig>({
    company_name: "",
    company_email: "",
    company_website: "",
    email_signature: "",
    primary_color: "#1976d2",
    secondary_color: "#3498db",
    header_title: "Welcome to Mobiloitte",
    header_subtitle: "Your employee account has been created",
    footer_powered_by_text: "Powered by Converiqo.ai",
    footer_powered_by_url: "https://converiqo.ai",
    footer_privacy_policy_url: "https://converiqo.ai/privacy-policy",
    footer_copyright_text: "All rights reserved.",
  })
  const [brandingLoading, setBrandingLoading] = useState(false)

  // Utility Functions
  const showAlert = (variant: "success" | "error" | "warning" | "info", title: string, message: string) => {
    setAlert({ show: true, variant, title, message })
    setTimeout(() => {
      setAlert(prev => ({ ...prev, show: false }))
      // Clear the alert completely after animation
      setTimeout(() => setAlert({ show: false, variant: "info", title: "", message: "" }), 300)
    }, 4000)
  }

  const normalizeExperienceName = (raw: string): string => {
    const base = (raw || "").toLowerCase().trim().replace(/\s+/g, " ")
    return base
      .split(" ")
      .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w))
      .join(" ")
  }

  const isValidExperienceForAdd = (value: string): boolean => {
    if (!value) return false
    const trimmed = value.trim()
    if (/^\d+$/.test(trimmed)) {
      const years = Number.parseInt(trimmed, 10)
      return years >= 0 && years <= 75
    }
    // For non-numeric experience levels, length validation is handled by form validation (1-50 chars)
    return trimmed.length >= 1 && trimmed.length <= 50
  }

  // Computed Values
  const isApplicantMsgValid = useMemo(() => (draftApplicantMessage || "").trim().length >= 30, [draftApplicantMessage])

  // Helper: placeholder by category for Fit Score Name
  const getFitPlaceholder = (
    category: "skill" | "experience" | "education" | "Select Category",
  ): string => {
    switch (category) {
      case "skill":
        return "e.g., React, Excellent Communication, Python"
      case "experience":
        return "e.g., Entry Level, Senior Level, 4 months"
      case "education":
        return "e.g., BTech, BBA, Masters"
      default:
        return "e.g., React, Senior Level, BTech"
    }
  }

  // React Hook Form for Job Category
  const {
    register: registerCategory,
    handleSubmit: handleSubmitCategory,
    formState: { errors: categoryErrors },
    reset: resetCategory,
    setValue: setCategoryValue,
  } = useForm<{ jobCategory: string }>({
    mode: "onChange",
    defaultValues: { jobCategory: "" },
  })

  // React Hook Form for Experience
  const {
    register: registerExperience,
    handleSubmit: handleSubmitExperience,
    formState: { errors: experienceErrors },
    reset: resetExperience,
    setValue: setExperienceValue,
  } = useForm<{ experience: string }>({
    mode: "onChange",
    defaultValues: { experience: "" },
  })

  // React Hook Form for Email
  const {
    register: registerEmail,
    handleSubmit: handleSubmitEmail,
    formState: { errors: emailFormErrors },
    reset: resetEmail,
    setValue: setEmailValue,
  } = useForm<{ notificationEmail: string }>({
    mode: "onChange",
    defaultValues: { notificationEmail: "" },
  })

  // API Fetch Functions
  const checkBackendHealth = async () => {
    // Skip health check if API base URL is not configured
    if (!API_CONFIG.BASE_URL) {
      return false
    }

    try {
      const healthUrl = buildApiUrl('/health')

      // Use AbortController for timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 3000) // Reduced to 3 seconds

      try {
        const res = await fetch(healthUrl, {
          method: 'GET',
          signal: controller.signal,
          headers: {
            'Accept': 'application/json',
          }
        })

        clearTimeout(timeoutId)
        return res.ok
      } catch (fetchError) {
        clearTimeout(timeoutId)
        // Silently handle abort errors (timeouts) and network errors
        if (fetchError instanceof Error) {
          if (fetchError.name === 'AbortError') {
            // Timeout - backend may be unavailable, return false silently
            return false
          }
          // For other network errors, return false silently
          return false
        }
        return false
      }
    } catch {
      // Silently handle any unexpected errors
      return false
    }
  }


  const fetchFormConfig = async () => {
    try {
      const [formRes, categoriesRes, experiencesRes, jobTypesRes] = await Promise.allSettled([
        fetch(buildApiUrl('/customize/admin/customize-job-application-form?widget_id=Model'), {
          method: "GET",
          headers: { "Content-Type": "application/json" }
        }),
        fetch(buildApiUrl(API_CONFIG.ENDPOINTS.HR_JOB_CATEGORIES)),
        fetch(buildApiUrl(API_CONFIG.ENDPOINTS.HR_JOB_EXPERIENCES)),
        fetch(buildApiUrl(API_CONFIG.ENDPOINTS.HR_JOB_TYPES))
      ])

      if (formRes.status === 'fulfilled' && formRes.value.ok) {
        const formData = await formRes.value.json()
        setFormConfig(formData)
      }

      if (categoriesRes.status === 'fulfilled' && categoriesRes.value.ok) {
        const dbCategories = await categoriesRes.value.json()
        setJobCategories(dbCategories)
      }

      if (experiencesRes.status === 'fulfilled' && experiencesRes.value.ok) {
        const dbExperiences = await experiencesRes.value.json()
        setExperienceLevels(dbExperiences)
      }

      if (jobTypesRes.status === 'fulfilled' && jobTypesRes.value.ok) {
        const dbJobTypes = await jobTypesRes.value.json()
        setJobTypes(dbJobTypes)
      }
    } catch (error) {
      console.error("Error fetching form configuration:", error)
    }
  }

  const fetchApplicantMessage = async () => {
    // This function should never throw an error - it's designed to be completely safe
    console.log("[DEBUG] Attempting to fetch applicant message from backend...")

    // Use a simple fetch with minimal configuration to avoid any potential issues
    try {
      const url = buildApiUrl(API_CONFIG.ENDPOINTS.HR_JOB_APPLICANT_MESSAGE)
      console.log(`[DEBUG] API Base URL: ${API_CONFIG.BASE_URL}`)
      console.log(`[DEBUG] Endpoint: ${API_CONFIG.ENDPOINTS.HR_JOB_APPLICANT_MESSAGE}`)
      console.log(`[DEBUG] Fetching from URL: ${url}`)

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        console.log("[DEBUG] Successfully received applicant message data:", data)
        if (data.message) {
          setDraftApplicantMessage(data.message)
          console.log("[INFO] Using custom applicant message from backend")
        } else {
          console.log("[INFO] No custom message found, keeping default")
        }
      } else {
        console.log(`[INFO] Backend returned ${response.status}, keeping default message`)
      }
    } catch (error) {
      console.log("[INFO] Could not fetch applicant message from backend, using default:", error instanceof Error ? error.message : String(error))
      // The default message is already set in the initial state, so we don't need to do anything
    }
  }

  const fetchPriorities = async () => {
    try {
      const res = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.HR_JOB_PRIORITIES))
      if (!res.ok) return
      const data = await res.json()
      if (Array.isArray(data)) {
        setPriorityItems(data)
      } else if (Array.isArray(data.data)) {
        setPriorityItems(data.data)
      } else {
        setPriorityItems([])
      }
    } catch (e) {
      console.error("Error fetching priorities", e)
      setPriorityItems([])
    }
  }

  const fetchAvailableJobs = useCallback(async () => {
    try {
      const res = await fetch(buildApiUrl("/job-listings"))
      if (!res.ok) return

      const responseData = await res.json()

      // Handle response structure { success: true, data: [...] }
      const jobsList = responseData.data || (Array.isArray(responseData) ? responseData : [])

      // Filter for active jobs only (status must be exactly "Active")
      // Filter for active jobs only (status must be exactly "Active")
      // And remove duplicates based on job_id to prevent "multiple job position" issues
      const activeJobsMap = new Map();

      if (Array.isArray(jobsList)) {
        jobsList.forEach((job: JobOption) => {
          if (job.status === "Active") {
            // Use job_id as key to ensure uniqueness. 
            // If duplicate exists, keep the first one or overwrite? unique IDs usually implies same data.
            if (!activeJobsMap.has(job.job_id)) {
              activeJobsMap.set(job.job_id, job);
            }
          }
        });
      }

      const activeJobs = Array.from(activeJobsMap.values());

      setAvailableJobs(activeJobs)

      // If jobId was passed as prop, find and set the selected job
      if (jobId && Array.isArray(activeJobs)) {
        const job = activeJobs.find((j: JobOption) => j.job_id === jobId)
        if (job) {
          setSelectedJobIdForFit(job.job_id)
          setSelectedJobIdForScreening(job.job_id)
        }
      }
    } catch (e) {
      console.error("Failed to fetch available jobs", e)
    }
  }, [jobId])

  const fetchFitScores = useCallback(async (category?: "skill" | "experience" | "education", jobIdOverride?: string | null) => {
    try {
      let url = API_CONFIG.ENDPOINTS.HR_JOB_FIT_SCORES

      // Use override if provided, otherwise check state
      // If jobIdOverride is null/undefined, we use selectedJobIdForFit (current state)
      // If jobIdOverride is "", it means global (no job_id)
      const targetJobId = jobIdOverride !== undefined ? jobIdOverride : selectedJobIdForFit;

      // If targetJobId is set, use job-specific endpoint
      if (targetJobId) {
        url = API_CONFIG.ENDPOINTS.JOBS_JOB_SPECIFIC_FIT_SCORES(targetJobId)
      }

      const params = new URLSearchParams()
      if (category) {
        params.append('category', category)
      }

      // Append params if any exist (works for both global and job-specific)
      if (params.toString()) {
        url += (url.includes('?') ? '&' : '?') + params.toString();
      }

      const fullUrl = buildApiUrl(url);
      console.log("[DEBUG] fetchFitScores - targetJobId:", targetJobId, "Generated URL:", fullUrl);

      if (!fullUrl) {
        console.warn("[DEBUG] fetchFitScores - Empty URL generated, skipping fetch");
        return;
      }

      const res = await fetch(fullUrl)
      if (!res.ok) {
        console.error(`[DEBUG] fetchFitScores - Fetch failed with status: ${res.status}`);
        return;
      }
      const data = await res.json()
      setFitScores(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error("Failed to fetch fit scores", e)
    }
  }, [selectedJobIdForFit])

  const fetchScreeningScore = useCallback(async () => {
    try {
      // Use selectedJobId for job-specific settings
      // If selectedJobId is undefined, fall back to jobId prop (for backward compatibility)
      // If selectedJobId is empty string, use global settings (no job_id parameter)
      let targetJobId: string | null = null;

      if (selectedJobIdForScreening !== undefined) {
        // User has made a selection in the dropdown
        targetJobId = selectedJobIdForScreening === "" ? null : selectedJobIdForScreening;
      } else if (jobId) {
        // Fall back to component prop for backward compatibility
        targetJobId = jobId;
      } else {
        // Default to global settings
        targetJobId = null;
      }

      console.log("[DEBUG] fetchScreeningScore - selectedJobIdForScreening:", selectedJobIdForScreening, "jobId:", jobId, "targetJobId:", targetJobId);

      const url = targetJobId
        ? `${API_CONFIG.ENDPOINTS.HR_JOB_SCREENING_SCORE}?job_id=${targetJobId}`
        : API_CONFIG.ENDPOINTS.HR_JOB_SCREENING_SCORE

      console.log("[DEBUG] fetchScreeningScore - URL:", url);

      const res = await fetch(buildApiUrl(url))
      if (!res.ok) {
        console.error("[DEBUG] fetchScreeningScore - Request failed:", res.status, res.statusText);
        return
      }
      const data = await res.json()
      console.log("[DEBUG] fetchScreeningScore - Response data:", data);

      if (data && typeof data.score === 'number') {
        setScreeningScore(data.score)
        setScreeningEnabled(data.enabled || false)
        console.log("[DEBUG] fetchScreeningScore - Updated state: score =", data.score, "enabled =", data.enabled);
      }
    } catch (e) {
      console.error("Failed to fetch screening score", e)
    }
  }, [selectedJobIdForScreening, jobId])

  const saveScreeningScore = async () => {
    if (screeningScore === "" || Number(screeningScore) < 0 || Number(screeningScore) > 100) {
      setScreeningScoreError("Screening score must be between 0-100")
      return false
    }

    setScreeningScoreLoading(true)
    try {
      // Use selectedJobId for job-specific settings
      // If selectedJobId is undefined, fall back to jobId prop (for backward compatibility)
      // If selectedJobId is empty string, use global settings (no job_id parameter)
      let targetJobId: string | null = null;

      if (selectedJobIdForScreening !== undefined) {
        // User has made a selection in the dropdown
        targetJobId = selectedJobIdForScreening === "" ? null : selectedJobIdForScreening;
      } else if (jobId) {
        // Fall back to component prop for backward compatibility
        targetJobId = jobId;
      } else {
        // Default to global settings
        targetJobId = null;
      }

      const url = targetJobId
        ? `${API_CONFIG.ENDPOINTS.HR_JOB_SCREENING_SCORE}?job_id=${targetJobId}`
        : API_CONFIG.ENDPOINTS.HR_JOB_SCREENING_SCORE

      const res = await fetch(buildApiUrl(url), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          score: Number(screeningScore),
          enabled: screeningEnabled,
        }),
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        showAlert("error", "Failed", errorData.detail || "Could not save screening score.")
        return false
      }

      showAlert("success", "Saved", "Application screening score saved successfully.")
      return true
    } catch (e) {
      console.error("Failed to save screening score", e)
      showAlert("error", "Failed", "Could not save screening score.")
      return false
    } finally {
      setScreeningScoreLoading(false)
    }
  }

  const fetchAdminEmails = async () => {
    try {
      const ts = Date.now()
      const res = await fetch(buildApiUrl(`${API_CONFIG.ENDPOINTS.HR_JOB_NOTIFICATION_EMAILS}?t=${ts}`), {
        cache: "no-store" as RequestCache,
      })
      const data = await res.json()
      const emails: string[] = Array.isArray(data?.emails)
        ? (data.emails as unknown[])
          .filter((val: unknown): val is string => typeof val === "string")
          .map((email) => email.trim().toLowerCase())
        : []
      setAdminEmails(emails)
    } catch {
      console.error("Failed to load admin emails")
    }
  }

  const fetchEmailBranding = async () => {
    try {
      setBrandingLoading(true)
      const res = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.HR_JOB_EMAIL_BRANDING))
      const data = await res.json().catch(() => ({}))
      if (res.ok && data && data.success && data.config) {
        setBranding((prev) => ({ ...prev, ...data.config }))
      }
    } catch {
      console.error("Failed to fetch email branding")
    } finally {
      setBrandingLoading(false)
    }
  }

  const fetchLogo = useCallback(async () => {
    try {
      const timestamp = new Date().getTime()

      // Use AbortController for better compatibility
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000)

      try {
        const res = await fetch(buildApiUrl(`${API_CONFIG.ENDPOINTS.HR_JOB_LOGO}?t=${timestamp}`), {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal
        })

        clearTimeout(timeoutId)

        if (!res.ok) {
          setCurrentLogoUrl(null)
          return
        }

        const data = await res.json()
        setCurrentLogoUrl(data.logo_url || null)
      } catch (fetchError) {
        clearTimeout(timeoutId)
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          // Timeout is handled gracefully - log as warning instead of error
          console.warn("Logo fetch timed out - server may be slow or unreachable")
          setCurrentLogoUrl(null)
        } else {
          throw fetchError
        }
      }
    } catch (e) {
      console.error("Error fetching logo:", e)
      setCurrentLogoUrl(null)
    }
  }, [])

  // useEffect for initial data loading
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const fetchAll = async () => {
      try {
        // Check backend health with timeout handling
        let isBackendHealthy = false
        try {
          isBackendHealthy = await checkBackendHealth()
        } catch {
          // Silently handle health check errors
          isBackendHealthy = false
        }

        if (!cancelled) {
          setBackendConnected(isBackendHealthy)
        }

        if (!isBackendHealthy) {
          // Backend unavailable - still try to load data, but don't block UI
          if (!cancelled) setLoading(false)
          // Continue with data fetching even if health check fails
        }

        // Execute all fetch functions with error handling
        const results = await Promise.allSettled([
          fetchFormConfig(),
          fetchAdminEmails(),
          fetchEmailBranding(),
          fetchApplicantMessage(),
          fetchPriorities(),
          fetchAvailableJobs(),
          fetchFitScores(),
          fetchScreeningScore(),
          fetchLogo(),
        ])

        // Log warnings only for debugging, not as errors
        results.forEach((result, index) => {
          const functionNames = ['fetchFormConfig', 'fetchAdminEmails', 'fetchEmailBranding', 'fetchApplicantMessage', 'fetchPriorities', 'fetchAvailableJobs', 'fetchFitScores', 'fetchScreeningScore', 'fetchLogo']
          if (result.status === 'rejected') {
            // Use console.log instead of console.warn to avoid triggering error handlers
            console.log(`[INFO] ${functionNames[index]} failed (non-critical):`, result.reason instanceof Error ? result.reason.message : String(result.reason))
          }
        })

        if (!cancelled) setLoading(false)
      } catch (error) {
        console.error('Unexpected error in fetchAll:', error)
        setBackendConnected(false)
        if (!cancelled) setLoading(false)
      }
    }
    fetchAll()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // WebSocket connection for real-time updates
  // Re-fetch screening score when jobId changes
  useEffect(() => {
    fetchScreeningScore()
  }, [jobId, fetchScreeningScore])

  // Re-fetch screening score when selectedJobIdForScreening changes (for screening score section)
  useEffect(() => {
    fetchScreeningScore()
  }, [selectedJobIdForScreening, fetchScreeningScore])

  // Sync selectedJobIdForFit and selectedJobIdForScreening with jobId prop when it changes (only if user hasn't made a selection yet)
  useEffect(() => {
    if (jobId && selectedJobIdForFit === undefined) {
      console.log("[DEBUG] Syncing selectedJobIdForFit with jobId prop:", jobId);
      setSelectedJobIdForFit(jobId)
      setSelectedJobIdForFit(jobId)
    }
  }, [jobId, availableJobs, selectedJobIdForFit])

  useEffect(() => {
    if (jobId && selectedJobIdForScreening === undefined) {
      console.log("[DEBUG] Syncing selectedJobIdForScreening with jobId prop:", jobId);
      setSelectedJobIdForScreening(jobId)
    }
  }, [jobId, availableJobs, selectedJobIdForScreening])

  // Handler Functions
  const handleAddJobType = async () => {
    try {
      const value = (jobTypeInput || "").trim()
      if (!value) {
        setJobTypeError("Job type is required")
        showAlert("error", "Validation", "Job type is required.")
        return
      }
      if (value.length < 2 || value.length > 50) {
        if (value.length < 2) {
          setJobTypeError("Minimum 2 characters required")
        } else {
          setJobTypeError("Maximum 50 characters allowed")
        }
        showAlert("error", "Validation", value.length < 2 ? "Minimum 2 characters required." : "Maximum 50 characters allowed.")
        return
      }
      const exists = jobTypes.some((t) => t.name.toLowerCase() === value.toLowerCase())
      if (exists) {
        setJobTypeError(`Job type "${value}" already exists`)
        showAlert("error", "Duplicate", `Job type "${value}" already exists.`)
        return
      }
      const res = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.HR_JOB_TYPES), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: value })
      })
      if (!res.ok) {
        await res.json().catch(() => ({}))
        showAlert("error", "Failed", "Could not add job type.")
        return
      }
      setJobTypeInput("")
      setJobTypeError(null)
      showAlert("success", "Added", `Job type "${value}" added.`)
      await fetchFormConfig()
    } catch (e) {
      console.error("Add job type error", e)
      showAlert("error", "Failed", "Could not add job type.")
    }
  }

  const handleDeleteJobType = async (id: string) => {
    try {
      const res = await fetch(buildApiUrl(`${API_CONFIG.ENDPOINTS.HR_JOB_TYPES}/${id}`), { method: "DELETE" })
      if (!res.ok) {
        showAlert("error", "Failed", "Could not delete job type.")
        return
      }
      showAlert("success", "Removed", "Job type deleted.")
      await fetchFormConfig()
    } catch (e) {
      console.error("Delete job type error", e)
    }
  }

  const onAddCategory = async (data: { jobCategory: string }): Promise<void> => {
    try {
      if (!data.jobCategory.trim()) {
        showAlert("error", "Validation", "Category name cannot be blank.")
        return
      }
      if (data.jobCategory.length < 2 || data.jobCategory.length > 50) {
        showAlert("error", "Validation", "Category name must be 2-50 characters.")
        return
      }

      const trimmedCategory: string = data.jobCategory.trim()
      const existingCategory = jobCategories.find(
        (cat) => cat.name.toLowerCase() === trimmedCategory.toLowerCase()
      )
      if (existingCategory) {
        showAlert("error", "Duplicate", `Job category "${trimmedCategory}" already exists.`)
        return
      }

      const categoryRes = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.HR_JOB_CATEGORIES), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmedCategory }),
      })

      if (!categoryRes.ok) {
        showAlert("error", "Failed", "Could not add job category.")
        return
      }

      if (formConfig) {
        const updatedCategories = [
          ...(formConfig.fields?.category?.options || []),
          trimmedCategory
        ]

        const formUpdatePayload = {
          ...formConfig,
          fields: {
            ...formConfig.fields,
            category: {
              ...formConfig.fields?.category,
              options: updatedCategories
            }
          }
        }

        await fetch(buildApiUrl('/customize/admin/customize-job-application-form?widget_id=Model'), {
          method: "PUT",
          headers: {
            "accept": "application/json",
            "Content-Type": "application/json"
          },
          body: JSON.stringify(formUpdatePayload),
        })
      }

      resetCategory()
      setCategoryValue("jobCategory", "")
      await fetchFormConfig()
      showAlert("success", "Added", `Job category "${trimmedCategory}" added.`)
    } catch (error: unknown) {
      console.error("Failed to add job category", error)
      showAlert("error", "Failed", "Could not add job category.")
    }
  }

  const onAddExperience = async (data: { experience: string }) => {
    try {
      const trimmedExp = data.experience.trim()
      if (!trimmedExp) {
        showAlert("error", "Validation", "Experience level is required.")
        return
      }
      if (trimmedExp.length < 1 || trimmedExp.length > 50) {
        showAlert("error", "Validation", trimmedExp.length < 1 ? "Minimum 1 character required." : "Maximum 50 characters allowed.")
        return
      }
      if (!isValidExperienceForAdd(trimmedExp)) {
        showAlert("error", "Validation", "Invalid experience. Enter 1–50 years or a level name.")
        return
      }

      const trimmedExperience = data.experience.trim()
      const candidateName = /^\d+$/.test(trimmedExperience)
        ? trimmedExperience
        : normalizeExperienceName(trimmedExperience)
      const existingExperience = experienceLevels.find((exp) => exp.name.toLowerCase() === candidateName.toLowerCase())
      if (existingExperience) {
        showAlert("error", "Duplicate", `Experience level "${candidateName}" already exists.`)
        return
      }

      const res = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.HR_JOB_EXPERIENCES), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: candidateName }),
      })

      if (!res.ok) {
        showAlert("error", "Failed", "Could not add experience level.")
        return
      }

      if (formConfig) {
        const updatedExperiences = [
          ...(formConfig.fields?.experience?.options || []),
          candidateName
        ]

        const formUpdatePayload = {
          ...formConfig,
          fields: {
            ...formConfig.fields,
            experience: {
              ...formConfig.fields?.experience,
              options: updatedExperiences
            }
          }
        }

        await fetch(buildApiUrl('/customize/admin/customize-job-application-form?widget_id=Model'), {
          method: "PUT",
          headers: {
            "accept": "application/json",
            "Content-Type": "application/json"
          },
          body: JSON.stringify(formUpdatePayload),
        })
      }

      resetExperience()
      setExperienceValue("experience", "")
      await fetchFormConfig()
      showAlert("success", "Added", `Experience level "${candidateName}" added.`)
    } catch (error) {
      console.error("Failed to add experience level:", error)
      showAlert("error", "Failed", "Could not add experience level.")
    }
  }

  const handleDeleteCategory = async (id: string): Promise<void> => {
    try {
      const categoryToDelete = jobCategories.find((cat) => cat.id === id)
      const categoryNameToRemove = categoryToDelete?.name || ""

      if (!categoryNameToRemove) {
        showAlert("error", "Failed", "Category not found.")
        return
      }

      const deleteRes = await fetch(buildApiUrl(`${API_CONFIG.ENDPOINTS.HR_JOB_CATEGORIES}/${id}`), {
        method: "DELETE",
      })

      if (!deleteRes.ok) {
        showAlert("error", "Failed", "Could not delete job category.")
        return
      }

      if (formConfig) {
        const updatedCategories = (formConfig.fields?.category?.options || []).filter(
          (option: string) => option !== categoryNameToRemove,
        )

        const formUpdatePayload = {
          ...formConfig,
          fields: {
            ...formConfig.fields,
            category: {
              ...formConfig.fields?.category,
              options: updatedCategories,
            },
          },
        }

        await fetch(buildApiUrl('/customize/admin/customize-job-application-form?widget_id=Model'), {
          method: "PUT",
          headers: {
            "accept": "application/json",
            "Content-Type": "application/json"
          },
          body: JSON.stringify(formUpdatePayload),
        })
      }

      await fetchFormConfig()
      showAlert("success", "Deleted", "Job category removed.")
    } catch (error: unknown) {
      console.error("Failed to delete job category", error)
      showAlert("error", "Failed", "Could not delete job category.")
    }
  }

  const handleDeleteExperience = async (id: string) => {
    try {
      const experienceToDelete = experienceLevels.find((exp) => exp.id === id)
      const experienceNameToRemove = experienceToDelete?.name || ""

      if (!experienceNameToRemove) {
        showAlert("error", "Failed", "Experience not found.")
        return
      }

      const res = await fetch(buildApiUrl(`${API_CONFIG.ENDPOINTS.HR_JOB_EXPERIENCES}/${id}`), {
        method: "DELETE",
      })
      if (!res.ok) {
        showAlert("error", "Failed", "Could not delete experience level.")
        return
      }

      if (formConfig) {
        const updatedExperiences = (formConfig.fields?.experience?.options || [])
          .filter((option: string) => option !== experienceNameToRemove)

        const formUpdatePayload = {
          ...formConfig,
          fields: {
            ...formConfig.fields,
            experience: {
              ...formConfig.fields?.experience,
              options: updatedExperiences
            }
          }
        }

        await fetch(buildApiUrl('/customize/admin/customize-job-application-form?widget_id=Model'), {
          method: "PUT",
          headers: {
            "accept": "application/json",
            "Content-Type": "application/json"
          },
          body: JSON.stringify(formUpdatePayload),
        })
      }

      await fetchFormConfig()
      showAlert("success", "Deleted", "Experience level removed.")
    } catch {
      console.error("Failed to delete experience level")
      showAlert("error", "Failed", "Could not delete experience level.")
    }
  }

  const handleSavePriority = async () => {
    if (!selectedPriorityCategory) {
      setPriorityCategoryError("Please select a category or experience level")
      showAlert("error", "Validation", "Select a category or experience level.")
      return
    }
    if (priority === "") {
      setPriorityError("Priority score is required")
      showAlert("error", "Validation", "Select a score.")
      return
    }
    if (typeof priority === "number" && (priority < 1 || priority > 100)) {
      if (priority < 1) {
        setPriorityError("Minimum value is 1")
      } else {
        setPriorityError("Maximum value is 100")
      }
      showAlert("error", "Validation", "Priority score must be between 1-100.")
      return
    }

    const [type, id] = selectedPriorityCategory.split("-")
    let parameter = ""
    let description = ""

    if (type === "cat") {
      const cat = jobCategories.find((c) => String(c.id) === id)
      if (!cat) {
        showAlert("error", "Invalid", "Selected category not found.")
        return
      }
      parameter = `category_${cat.id}`
      description = `Category priority: ${cat.name}`
    } else if (type === "exp") {
      const exp = experienceLevels.find((e) => String(e.id) === id)
      if (!exp) {
        showAlert("error", "Invalid", "Selected experience not found.")
        return
      }
      parameter = `experience_${exp.id}`
      description = `Experience priority: ${exp.name}`
    }

    try {
      const res = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.HR_JOB_PRIORITIES), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parameter,
          description,
          value: String(priority),
        }),
      })

      if (!res.ok) {
        showAlert("error", "Failed", "Could not save priority setting.")
        return
      }

      setSelectedPriorityCategory(null)
      setPriority("")
      setPriorityError(null)
      await fetchPriorities()
      showAlert("success", "Saved", "Priority setting saved.")
    } catch (err) {
      console.error("Failed to save priority setting: " + err)
      showAlert("error", "Failed", "Could not save priority setting.")
    }
  }

  const handleDeletePriority = async (id: string) => {
    try {
      const res = await fetch(buildApiUrl(`${API_CONFIG.ENDPOINTS.HR_JOB_PRIORITIES}/${id}`), {
        method: "DELETE",
      })

      if (!res.ok) {
        showAlert("error", "Failed", "Could not delete priority setting.")
        return
      }

      await fetchPriorities()
      showAlert("success", "Deleted", "Priority setting removed.")
    } catch (err) {
      console.error("Failed to delete priority setting: " + err)
      showAlert("error", "Failed", "Could not delete priority setting.")
    }
  }

  const addFitScore = async () => {
    if (newFitCategory === "Select Category") {
      setFitCategoryError("Please select a category")
      showAlert("error", "Validation", "Select a category.")
      return
    }
    if (!newFitName.trim() || newFitName.trim().length < 1 || newFitName.trim().length > 100) {
      if (!newFitName.trim() || newFitName.trim().length < 1) {
        setNewFitNameError("Minimum 1 character required")
      } else {
        setNewFitNameError("Maximum 100 characters allowed")
      }
      showAlert("error", "Validation", "Name must be 1–100 characters.")
      return
    }
    if (newFitWeight === "" || Number(newFitWeight) < 1 || Number(newFitWeight) > 100) {
      if (newFitWeight === "") {
        setNewFitWeightError("Weight is required")
      } else if (Number(newFitWeight) < 1) {
        setNewFitWeightError("Minimum value is 1")
      } else {
        setNewFitWeightError("Maximum value is 100")
      }
      showAlert("error", "Validation", "Weight must be 1-100.")
      return
    }

    const nameToAdd = newFitName.trim()
    const categoryToAdd = newFitCategory
    const weightToAdd = Number(newFitWeight)

    const existsLocal = fitScores.some(
      (s) => s.category === categoryToAdd && s.name.toLowerCase() === nameToAdd.toLowerCase(),
    )
    if (existsLocal) {
      showAlert("error", "Duplicate", `"${nameToAdd}" already exists for ${categoryToAdd}.`)
      return
    }

    try {
      const res = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.HR_JOB_FIT_SCORES), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: categoryToAdd,
          name: nameToAdd,
          weight: weightToAdd,
          ...(selectedJobIdForFit && { job_id: selectedJobIdForFit }),
        }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        const detail = (data && (data.detail || data.message)) || "Failed to add fit score setting"
        showAlert("error", "Failed", typeof detail === "string" ? detail : "Could not add fit score setting.")
        return
      }

      const newItem = {
        id: data.id || Date.now().toString(),
        category: categoryToAdd,
        name: nameToAdd,
        weight: weightToAdd,
      }
      setFitScores((prev) => [...prev, newItem])

      setNewFitName("")
      setNewFitWeight(20)
      setNewFitCategory("Select Category")
      setFitCategoryError(null)

      showAlert("success", "Added", `Fit score setting "${nameToAdd}" added.`)
    } catch {
      showAlert("error", "Failed", "Could not add fit score setting.")
    }
  }

  const deleteFitScore = async (id: string) => {
    try {
      const res = await fetch(buildApiUrl(`${API_CONFIG.ENDPOINTS.HR_JOB_FIT_SCORES}/${id}`), {
        method: "DELETE",
      })
      if (!res.ok) {
        showAlert("error", "Failed", "Could not delete fit score setting.")
        return
      }
      setFitScores((prev) => prev.filter((item) => item.id !== id))
      showAlert("success", "Deleted", "Fit score setting removed.")
    } catch {
      showAlert("error", "Failed", "Could not delete fit score setting.")
    }
  }

  const startEditing = (item: FitScoreSetting) => {
    setEditingFitScore(item)
    setNewFitCategory(item.category)
    setNewFitName(item.name)
    setNewFitWeight(item.weight)
    setIsEditing(true)
  }

  const cancelEditing = () => {
    setEditingFitScore(null)
    setNewFitCategory("Select Category")
    setNewFitName("")
    setNewFitWeight(20)
    setIsEditing(false)
  }

  const handleUpdateFitScore = async () => {
    if (!editingFitScore) return
    if (newFitCategory === "Select Category") {
      showAlert("error", "Validation", "Select a category.")
      setFitCategoryError("Please select a category")
      return
    }
    if (!newFitName.trim() || newFitName.trim().length < 1 || newFitName.trim().length > 100) {
      showAlert("error", "Validation", "Name must be 1–100 characters.")
      return
    }
    if (newFitWeight === "" || Number(newFitWeight) < 1 || Number(newFitWeight) > 100) {
      showAlert("error", "Validation", "Weight must be 1-100.")
      return
    }

    try {
      const res = await fetch(buildApiUrl(`${API_CONFIG.ENDPOINTS.HR_JOB_FIT_SCORES}/${editingFitScore.id}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: newFitCategory,
          name: newFitName.trim(),
          weight: Number(newFitWeight),
          ...(selectedJobIdForFit && { job_id: selectedJobIdForFit }),
        }),
      })

      if (!res.ok) {
        showAlert("error", "Failed", "Could not update fit score setting.")
        return
      }

      setFitScores((prev) =>
        prev.map((item) =>
          item.id === editingFitScore.id
            ? { ...item, category: newFitCategory, name: newFitName.trim(), weight: Number(newFitWeight) }
            : item,
        ),
      )

      cancelEditing()
      showAlert("success", "Updated", `Fit score setting "${newFitName.trim()}" updated.`)
    } catch {
      showAlert("error", "Failed", "Could not update fit score setting.")
    }
  }

  const onAddAdminEmail = async (data: { notificationEmail: string }) => {
    const emailTrimmed = data.notificationEmail.trim().toLowerCase()
    if (!emailTrimmed) {
      showAlert("error", "Validation", "Email address is required.")
      return
    }
    if (emailTrimmed.length < 5 || emailTrimmed.length > 254) {
      showAlert("error", "Validation", emailTrimmed.length < 5 ? "Minimum 5 characters required." : "Maximum 254 characters allowed.")
      return
    }
    if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(emailTrimmed)) {
      showAlert("error", "Validation", "Invalid email address format.")
      return
    }
    if (adminEmails.length >= 5) {
      showAlert("error", "Limit Exceeded", "Maximum 5 notification emails allowed.")
      return
    }

    const existsLocal = adminEmails.some((e) => e.toLowerCase() === emailTrimmed.toLowerCase())
    if (existsLocal) {
      showAlert("error", "Duplicate", `Email "${emailTrimmed}" already exists.`)
      return
    }

    try {
      const res = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.HR_JOB_NOTIFICATION_EMAILS), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailTrimmed }),
      })

      if (!res.ok) {
        let detail = ""
        try {
          const parsed: unknown = await res.json()
          detail = (parsed as { detail?: string })?.detail || ""
        } catch { }
        if (detail && /exists/i.test(detail)) {
          showAlert("error", "Duplicate", `Email "${emailTrimmed}" already exists.`)
          return
        }
        showAlert("error", "Failed", detail || "Could not add notification email.")
        return
      }

      resetEmail()
      setEmailValue("notificationEmail", "")
      setAdminEmails((prev) => (prev.includes(emailTrimmed) ? prev : [...prev, emailTrimmed]))
      await fetchAdminEmails()
      showAlert("success", "Added", "Notification email added.")
    } catch {
      showAlert("error", "Failed", "Could not add notification email.")
    }
  }

  const deleteAdminEmail = async (email: string) => {
    try {
      const res = await fetch(buildApiUrl(`${API_CONFIG.ENDPOINTS.HR_JOB_NOTIFICATION_EMAILS}/${encodeURIComponent(email)}`), {
        method: "DELETE",
      })
      if (!res.ok) {
        showAlert("error", "Failed", "Could not delete admin email.")
        return
      }
      await fetchAdminEmails()
      showAlert("success", "Deleted", "Admin email removed successfully.")
    } catch {
      showAlert("error", "Failed", "Could not delete admin email.")
    }
  }

  const handleJobSelectionChange = (jobId: string) => {
    setSelectedJobIdForFit(jobId)
    // Refetch fit scores for the selected job, ensuring we use the new ID
    fetchFitScores(undefined, jobId)
  }

  const updateApplicantMessage = async () => {
    try {
      const payload = {
        message: (draftApplicantMessage || "").trim(),
      }
      if (!payload.message || payload.message.length < 30) {
        showAlert("error", "Validation", "Message must be at least 30 characters.")
        return
      }

      console.log("[DEBUG] Saving applicant message to backend...")

      // Use AbortController for better compatibility
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15000)

      try {
        const res = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.HR_JOB_APPLICANT_MESSAGE), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: controller.signal
        })

        clearTimeout(timeoutId)

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}))
          console.error(`[ERROR] Failed to save applicant message: ${res.status} ${res.statusText}`, errorData)
          showAlert("error", "Failed", `Could not save message: ${errorData.detail || res.statusText}`)
          return
        }

        const responseData = await res.json()
        console.log("[DEBUG] Applicant message saved successfully:", responseData)
        showAlert("success", "Updated", "Applicant message saved successfully.")

        // Refresh the message from backend to confirm it was saved
        await fetchApplicantMessage()
      } catch (fetchError) {
        clearTimeout(timeoutId)
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          console.error("[ERROR] Request timed out while saving applicant message")
          showAlert("error", "Timeout", "Request timed out. Please try again.")
        } else {
          throw fetchError
        }
      }
    } catch (error) {
      console.error("[ERROR] Failed to update applicant message:", error)
      showAlert("error", "Failed", "Network error: Could not update applicant message.")
    }
  }

  const resetApplicantMessage = async () => {
    try {
      console.log("[DEBUG] Resetting applicant message to default...")

      // Use AbortController for better compatibility
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15000)

      try {
        const res = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.HR_JOB_APPLICANT_MESSAGE), {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal
        })

        clearTimeout(timeoutId)

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}))
          console.error(`[ERROR] Failed to reset applicant message: ${res.status} ${res.statusText}`, errorData)
          showAlert("error", "Failed", `Could not reset message: ${errorData.detail || res.statusText}`)
          return
        }

        const responseData = await res.json()
        console.log("[DEBUG] Applicant message reset successfully:", responseData)

        // Refresh the message from backend
        await fetchApplicantMessage()
        showAlert("success", "Reset", "Applicant message reset to default.")
      } catch (fetchError) {
        clearTimeout(timeoutId)
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          console.error("[ERROR] Request timed out while resetting applicant message")
          showAlert("error", "Timeout", "Request timed out. Please try again.")
        } else {
          throw fetchError
        }
      }
    } catch (error) {
      console.error("[ERROR] Failed to reset applicant message:", error)
      showAlert("error", "Failed", "Network error while resetting message.")
    }
  }

  const saveEmailBranding = async (): Promise<boolean> => {
    try {
      if (!branding.company_name.trim() || !branding.company_email.trim() || !branding.email_signature.trim()) {
        showAlert("error", "Validation", "Fill required branding fields.")
        return false
      }
      const res = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.HR_JOB_EMAIL_BRANDING), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(branding),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        const detail = data?.detail || data?.message || "Failed to save branding"
        showAlert("error", "Failed", String(detail))
        return false
      }
      showAlert("success", "Saved", "Email branding updated.")
      return true
    } catch {
      showAlert("error", "Failed", "Could not save branding.")
      return false
    }
  }

  const resetEmailBranding = async () => {
    try {
      const res = await fetch(buildApiUrl(`${API_CONFIG.ENDPOINTS.HR_JOB_EMAIL_BRANDING}/reset`))
      const data = await res.json().catch(() => ({}))
      if (res.ok && data?.config) {
        setBranding((prev) => ({ ...prev, ...data.config }))
        showAlert("success", "Reset", "Branding reset to defaults.")
      } else {
        showAlert("error", "Failed", "Could not reset branding.")
      }
    } catch {
      showAlert("error", "Failed", "Network error while resetting branding.")
    }
  }

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate size (<= 5MB)
    const MAX_BYTES = 5 * 1024 * 1024
    if (file.size > MAX_BYTES) {
      showAlert("error", "Invalid Logo", "Maximum size is 5MB.")
      event.target.value = ""
      return
    }

    // Validate format
    const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/gif"]
    const ext = (file.name.split(".").pop() || "").toLowerCase()
    const allowedExts = ["png", "jpg", "jpeg", "gif"]
    if (!allowedTypes.includes(file.type) || !allowedExts.includes(ext)) {
      showAlert("error", "Invalid Logo", "Allowed formats: PNG, JPG, JPEG, GIF.")
      event.target.value = ""
      return
    }

    // Validate dimensions (300x100)
    const objectUrl = URL.createObjectURL(file)
    try {
      const img = new window.Image()
      const dimensionOk: boolean = await new Promise((resolve) => {
        img.onload = () => {
          const ok = img.width === 300 && img.height === 100
          resolve(ok)
        }
        img.onerror = () => resolve(false)
        img.src = objectUrl
      })
      if (!dimensionOk) {
        showAlert("error", "Invalid Logo", "Size must be exactly 300x100px.")
        URL.revokeObjectURL(objectUrl)
        event.target.value = ""
        return
      }
    } catch {
      URL.revokeObjectURL(objectUrl)
      showAlert("error", "Invalid Logo", "Could not read image dimensions.")
      event.target.value = ""
      return
    } finally {
      URL.revokeObjectURL(objectUrl)
    }

    const formData = new FormData()
    formData.append("file", file)

    setLogoUploading(true)

    try {
      const res = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.HR_JOB_UPLOAD_LOGO), {
        method: "POST",
        body: formData,
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        showAlert("error", "Failed", errorData.detail || "Could not upload logo.")
        return
      }

      showAlert("success", "Uploaded", "Logo uploaded successfully.")

      setTimeout(async () => {
        await fetchLogo()
      }, 500)
    } catch {
      showAlert("error", "Failed", "Network error: Could not upload logo.")
    } finally {
      setLogoUploading(false)
      event.target.value = ""
    }
  }

  const handleDeleteLogo = async () => {
    if (!currentLogoUrl) return
    setLogoDeleting(true)
    try {
      const res = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.HR_JOB_LOGO), {
        method: "DELETE",
      })

      if (!res.ok) {
        showAlert("error", "Failed", "Could not delete logo.")
        return
      }

      showAlert("success", "Removed", "Logo removed successfully.")
      setCurrentLogoUrl(null)
      setShowDeleteLogoModal(false)
    } catch (e) {
      console.error("Error deleting logo:", e)
      showAlert("error", "Failed", "Network error: Could not delete logo.")
      setShowDeleteLogoModal(false)
    } finally {
      setLogoDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading job settings...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-8">

        {/* Toggle-Style Notification */}
        {alert.show && (
          <div className={`fixed top-4 right-4 z-50 transition-all duration-300 ease-in-out ${alert.show ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full'
            }`}>
            <div className={`flex items-center gap-3 p-4 rounded-lg shadow-lg border max-w-sm backdrop-blur-sm ${alert.variant === 'success' ? 'bg-green-50/95 border-green-200 dark:bg-green-900/30 dark:border-green-800' :
              alert.variant === 'error' ? 'bg-red-50/95 border-red-200 dark:bg-red-900/30 dark:border-red-800' :
                alert.variant === 'warning' ? 'bg-yellow-50/95 border-yellow-200 dark:bg-yellow-900/30 dark:border-yellow-800' :
                  'bg-blue-50/95 border-blue-200 dark:bg-blue-900/30 dark:border-blue-800'
              }`}>
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-sm ${alert.variant === 'success' ? 'bg-green-500' :
                alert.variant === 'error' ? 'bg-red-500' :
                  alert.variant === 'warning' ? 'bg-yellow-500' :
                    'bg-blue-500'
                }`}>
                {alert.variant === 'success' && <CheckCircle2 className="h-5 w-5 text-white" />}
                {alert.variant === 'error' && <XCircle className="h-5 w-5 text-white" />}
                {alert.variant === 'warning' && <AlertTriangle className="h-5 w-5 text-white" />}
                {alert.variant === 'info' && <CheckCircle2 className="h-5 w-5 text-white" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold ${alert.variant === 'success' ? 'text-green-800 dark:text-green-200' :
                  alert.variant === 'error' ? 'text-red-800 dark:text-red-200' :
                    alert.variant === 'warning' ? 'text-yellow-800 dark:text-yellow-200' :
                      'text-blue-800 dark:text-blue-200'
                  }`}>
                  {alert.title}
                </p>
                <p className={`text-xs mt-1 ${alert.variant === 'success' ? 'text-green-700 dark:text-green-300' :
                  alert.variant === 'error' ? 'text-red-700 dark:text-red-300' :
                    alert.variant === 'warning' ? 'text-yellow-700 dark:text-yellow-300' :
                      'text-blue-700 dark:text-blue-300'
                  }`}>
                  {alert.message}
                </p>
              </div>
              <button
                onClick={() => setAlert({ show: false, variant: "info", title: "", message: "" })}
                className="flex-shrink-0 ml-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors duration-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Backend Connection Status */}
        {backendConnected === false && (
          <div className="p-4 rounded-lg border bg-yellow-50 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                Backend is not available. Some features may not work properly.
              </p>
            </div>
          </div>
        )}



        {/* Applicant Response Message */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-50 to-blue-50 dark:from-blue-900/20 dark:to-blue-900/20 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">Applicant Response Message</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Customize the automated response message sent to applicants.</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {!isEditingApplicantMessage ? (
                  <button
                    onClick={() => setIsEditingApplicantMessage(true)}
                    className="px-4 py-2 text-sm font-semibold rounded-xl bg-gradient-to-r from-blue-600 to-blue-600 hover:from-blue-700 hover:to-blue-700 text-white transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 w-full sm:w-auto"
                    type="button"
                    aria-label="Edit applicant response message"
                  >
                    <div className="flex items-center gap-2 justify-center">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Edit Message
                    </div>
                  </button>
                ) : (
                  <button
                    onClick={() => setIsEditingApplicantMessage(false)}
                    className="px-4 py-2 text-sm font-semibold rounded-xl bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105 w-full sm:w-auto"
                    type="button"
                    aria-label="Close edit mode"
                  >
                    <div className="flex items-center gap-2 justify-center">
                      <X className="w-4 h-4" />
                      Close
                    </div>
                  </button>
                )}
              </div>
            </div>
          </div>
          <div className="p-6 lg:p-8">
            {isEditingApplicantMessage ? (
              <div className="space-y-6">
                {/* Email Logo Section */}
                <div className="space-y-4">
                  <div>
                    <h3 className="text-base font-medium text-gray-900 dark:text-white mb-1">Email Logo</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Will appear at the top of response emails</p>
                  </div>

                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    {currentLogoUrl ? (
                      <div className="flex items-center space-x-2">
                        <Image
                          src={currentLogoUrl}
                          alt="Current Logo"
                          width={80}
                          height={48}
                          className="w-16 h-8 sm:w-20 sm:h-12 object-contain border-2 border-gray-200 dark:border-gray-600 rounded-lg shadow-sm"
                          onError={() => {
                            console.log("Logo image failed to load, refreshing...")
                            fetchLogo()
                          }}
                          unoptimized
                        />
                        <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">✓ Active</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <div className="w-16 h-8 sm:w-20 sm:h-12 bg-gray-100 dark:bg-gray-700 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex items-center justify-center">
                          <span className="text-xs text-gray-400 dark:text-gray-500">No logo</span>
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">Not set</span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <button
                      onClick={() => document.getElementById("logo-upload")?.click()}
                      disabled={logoUploading || logoDeleting}
                      className="px-3 sm:px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 disabled:cursor-not-allowed shadow-sm hover:shadow-md w-full sm:w-auto flex items-center justify-center gap-2"
                      type="button"
                      aria-label="Upload logo"
                    >
                      {logoUploading ? (
                        <span className="flex items-center justify-center space-x-2">
                          <svg className="animate-spin h-3 w-3 sm:h-4 sm:w-4" viewBox="0 0 24 24">
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                              fill="none"
                            />
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            />
                          </svg>
                          <span>Uploading...</span>
                        </span>
                      ) : (
                        <span className="flex items-center justify-center space-x-2">
                          <svg
                            className="w-3 h-3 sm:w-4 sm:h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                            />
                          </svg>
                          <span>Upload Logo</span>
                        </span>
                      )}
                    </button>
                    {currentLogoUrl && (
                      <button
                        onClick={() => setShowDeleteLogoModal(true)}
                        disabled={logoUploading || logoDeleting}
                        className="px-3 sm:px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 disabled:cursor-not-allowed shadow-sm hover:shadow-md w-full sm:w-auto flex items-center justify-center gap-2"
                        type="button"
                        aria-label="Remove logo"
                      >
                        {logoDeleting ? (
                          <span className="flex items-center justify-center space-x-2">
                            <svg className="animate-spin h-3 w-3 sm:h-4 sm:w-4" viewBox="0 0 24 24">
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                                fill="none"
                              />
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                              />
                            </svg>
                            <span>Removing...</span>
                          </span>
                        ) : (
                          <span className="flex items-center justify-center space-x-2">
                            <svg
                              className="w-3 h-3 sm:w-4 sm:h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                            <span>Remove</span>
                          </span>
                        )}
                      </button>
                    )}
                  </div>
                  <input id="logo-upload" type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />

                  <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-700">
                    <span className="flex items-center gap-1">
                      <span>Formats: PNG, JPG, JPEG, GIF</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3 text-green-600" />
                      Max: 5MB
                    </span>
                    <span className="flex items-center gap-1">
                      <span>Size: 300x100px</span>
                    </span>
                    <span className="ml-auto text-gray-400 dark:text-gray-500">
                      Logo will be automatically inserted at the top of all applicant response emails.
                    </span>
                  </div>
                </div>

                {/* Email Branding Section */}
                <div className="space-y-4 border-t border-gray-200 dark:border-gray-700 pt-6">
                  <div>
                    <h3 className="text-base font-medium text-gray-900 dark:text-white mb-1">Email Branding</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">These settings are required for applicant confirmation emails.</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">Company Name</label>
                      <input
                        value={branding.company_name}
                        onChange={(e) => setBranding({ ...branding, company_name: e.target.value })}
                        className="w-full px-3 sm:px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm sm:text-base focus:outline-none focus:ring-1 focus:ring-gray-400 dark:focus:ring-gray-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">Company Email</label>
                      <input
                        type="email"
                        value={branding.company_email}
                        onChange={(e) => setBranding({ ...branding, company_email: e.target.value })}
                        className="w-full px-3 sm:px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm sm:text-base focus:outline-none focus:ring-1 focus:ring-gray-400 dark:focus:ring-gray-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">Website (optional)</label>
                      <input
                        value={branding.company_website || ""}
                        onChange={(e) => setBranding({ ...branding, company_website: e.target.value })}
                        className="w-full px-3 sm:px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm sm:text-base focus:outline-none focus:ring-1 focus:ring-gray-400 dark:focus:ring-gray-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">Email Signature</label>
                      <textarea
                        rows={3}
                        value={branding.email_signature}
                        onChange={(e) => setBranding({ ...branding, email_signature: e.target.value })}
                        className="w-full px-3 sm:px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm sm:text-base resize-none focus:outline-none focus:ring-1 focus:ring-gray-400 dark:focus:ring-gray-500"
                      />
                    </div>
                  </div>

                  {/* Advanced Email Settings - Collapsible */}
                  <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-4">
                    <details className="group">
                      <summary className="cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
                        Advanced Email Settings
                      </summary>
                      <div className="mt-4 space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">Primary Color</label>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={branding.primary_color}
                                onChange={(e) => setBranding({ ...branding, primary_color: e.target.value })}
                                className="w-12 h-10 border border-gray-300 dark:border-gray-600 rounded cursor-pointer"
                              />
                              <input
                                type="text"
                                value={branding.primary_color}
                                onChange={(e) => setBranding({ ...branding, primary_color: e.target.value })}
                                className="flex-1 px-3 sm:px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm sm:text-base focus:outline-none focus:ring-1 focus:ring-gray-400 dark:focus:ring-gray-500"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">Secondary Color</label>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={branding.secondary_color}
                                onChange={(e) => setBranding({ ...branding, secondary_color: e.target.value })}
                                className="w-12 h-10 border border-gray-300 dark:border-gray-600 rounded cursor-pointer"
                              />
                              <input
                                type="text"
                                value={branding.secondary_color}
                                onChange={(e) => setBranding({ ...branding, secondary_color: e.target.value })}
                                className="flex-1 px-3 sm:px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm sm:text-base focus:outline-none focus:ring-1 focus:ring-gray-400 dark:focus:ring-gray-500"
                              />
                            </div>
                          </div>
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">Header Title</label>
                          <input
                            value={branding.header_title || ""}
                            onChange={(e) => setBranding({ ...branding, header_title: e.target.value })}
                            placeholder="Welcome to Mobiloitte"
                            className="w-full px-3 sm:px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm sm:text-base focus:outline-none focus:ring-1 focus:ring-gray-400 dark:focus:ring-gray-500"
                          />
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">This will appear in the email header section</p>
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">Header Subtitle</label>
                          <input
                            value={branding.header_subtitle || ""}
                            onChange={(e) => setBranding({ ...branding, header_subtitle: e.target.value })}
                            placeholder="Your employee account has been created"
                            className="w-full px-3 sm:px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm sm:text-base focus:outline-none focus:ring-1 focus:ring-gray-400 dark:focus:ring-gray-500"
                          />
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">This will appear below the header title</p>
                        </div>

                        {/* Footer Section */}
                        <div className="sm:col-span-2 border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
                          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Email Footer Settings</h4>
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">Powered By Text</label>
                          <input
                            value={branding.footer_powered_by_text || ""}
                            onChange={(e) => setBranding({ ...branding, footer_powered_by_text: e.target.value })}
                            placeholder="Powered by Converiqo.ai"
                            className="w-full px-3 sm:px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm sm:text-base focus:outline-none focus:ring-1 focus:ring-gray-400 dark:focus:ring-gray-500"
                          />
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Text that appears before the powered by link</p>
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">Powered By URL</label>
                          <input
                            value={branding.footer_powered_by_url || ""}
                            onChange={(e) => setBranding({ ...branding, footer_powered_by_url: e.target.value })}
                            placeholder="https://converiqo.ai"
                            className="w-full px-3 sm:px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm sm:text-base focus:outline-none focus:ring-1 focus:ring-gray-400 dark:focus:ring-gray-500"
                          />
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">URL for the powered by link</p>
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">Privacy Policy URL</label>
                          <input
                            value={branding.footer_privacy_policy_url || ""}
                            onChange={(e) => setBranding({ ...branding, footer_privacy_policy_url: e.target.value })}
                            placeholder="https://converiqo.ai/privacy-policy"
                            className="w-full px-3 sm:px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm sm:text-base focus:outline-none focus:ring-1 focus:ring-gray-400 dark:focus:ring-gray-500"
                          />
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">URL for the Privacy Policy link in footer</p>
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">Copyright Text</label>
                          <input
                            value={branding.footer_copyright_text || ""}
                            onChange={(e) => setBranding({ ...branding, footer_copyright_text: e.target.value })}
                            placeholder="All rights reserved."
                            className="w-full px-3 sm:px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm sm:text-base focus:outline-none focus:ring-1 focus:ring-gray-400 dark:focus:ring-gray-500"
                          />
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Text that appears after © Year Company Name (e.g., &quot;All rights reserved.&quot;)</p>
                        </div>
                      </div>
                    </details>
                  </div>

                  <div className="flex flex-wrap gap-2 mt-6">
                    <button
                      onClick={saveEmailBranding}
                      disabled={brandingLoading}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg text-sm font-medium transition-all duration-200 disabled:cursor-not-allowed"
                      type="button"
                      aria-label="Save branding"
                    >
                      Save Branding
                    </button>
                    <button
                      onClick={resetEmailBranding}
                      disabled={brandingLoading}
                      className="px-4 py-2 border border-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-all duration-200 disabled:cursor-not-allowed"
                      type="button"
                      aria-label="Reset branding"
                    >
                      Reset
                    </button>
                  </div>
                </div>

                {/* Response Message Content Section */}
                <div className="space-y-4 border-t border-gray-200 dark:border-gray-700 pt-6">
                  <div>
                    <h3 className="text-base font-medium text-gray-900 dark:text-white">Response Message Content</h3>
                  </div>

                  <div className="space-y-2">
                    <textarea
                      rows={6}
                      value={draftApplicantMessage}
                      onChange={(e) => setDraftApplicantMessage(e.target.value)}
                      placeholder="Thank you for your application to for the position of [job_position].&#10;Application Details:&#10;• Application ID: [applicant_id]&#10;• Position: [job_position]&#10;• Company:"
                      className="w-full px-3 sm:px-4 py-2 border rounded-md bg-white dark:bg-gray-800 text-black dark:text-white border-gray-300 dark:border-gray-600 text-sm sm:text-base resize-none"
                    />
                    <div className="flex justify-between items-center">
                      <div className="flex gap-2 flex-wrap">
                        {applicantMsgPlaceholders.map((ph) => (
                          <span key={ph} className="text-xs">
                            <Badge variant="light" color="info">
                              {ph}
                            </Badge>
                          </span>
                        ))}
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {draftApplicantMessage.length} Chars
                      </span>
                    </div>
                  </div>

                  <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                    <p className="text-xs text-blue-800 dark:text-blue-200">
                      <strong>Tip:</strong> Supported placeholders: [name], [applicant_id], [job_category], [job_position].
                      Example: Dear [name], your application (ID: [applicant_id]) for [job_category].
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={async () => {
                        // Save branding first to ensure backend config is complete for sending emails with logo
                        const brandingOk = await saveEmailBranding()
                        if (!brandingOk) return
                        await updateApplicantMessage()
                        setIsEditingApplicantMessage(false)
                      }}
                      disabled={!isApplicantMsgValid}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg text-sm font-medium transition-all duration-200 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
                      type="button"
                      aria-label="Save changes"
                    >
                      Save Changes
                    </button>
                    <button
                      onClick={resetApplicantMessage}
                      className="px-4 py-2 border border-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 focus:ring-2 focus:ring-gray-500 focus:outline-none"
                      type="button"
                      aria-label="Reset to default"
                    >
                      <RotateCcw className="h-4 w-4" aria-hidden="true" />
                      Reset to Default
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {/* Job Form Categories */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50">
          <div className="bg-gradient-to-r from-blue-50 to-blue-50 dark:from-blue-900/20 dark:to-blue-900/20 px-6 py-4 border-b border-gray-200 dark:border-gray-700 overflow-hidden rounded-t-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Job Form Categories</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">Add and manage job categories, experience levels, and job types.</p>
              </div>
            </div>
          </div>
          <div className="p-6 lg:p-8 overflow-visible">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 lg:gap-8">
              {/* Job Categories */}
              <div className="bg-gradient-to-br from-blue-50 to-blue-50 dark:from-blue-900/10 dark:to-blue-900/10 rounded-xl p-6 border border-blue-200/50 dark:border-blue-700/50 overflow-visible">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                  </div>
                  <label className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                    Job Categories
                  </label>
                </div>

                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3">
                    <input
                      {...registerCategory("jobCategory", {
                        required: "Category name is required",
                        minLength: { value: 2, message: "Minimum 2 characters required" },
                        maxLength: { value: 50, message: "Maximum 50 characters allowed" },
                      })}
                      maxLength={50}
                      minLength={2}
                      placeholder="Add new job category"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault()
                          handleSubmitCategory(onAddCategory)()
                        }
                      }}
                      className={`w-full sm:flex-1 sm:min-w-0 px-4 py-3 text-sm border rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${categoryErrors.jobCategory
                        ? "border-blue-400 bg-blue-50 dark:bg-blue-900/20"
                        : "border-gray-300 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500"
                        }`}
                    />
                    <button
                      type="button"
                      onClick={() => handleSubmitCategory(onAddCategory)()}
                      className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-600 hover:from-blue-700 hover:to-blue-700 text-white rounded-xl font-semibold text-sm whitespace-nowrap shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 w-full sm:w-auto sm:flex-shrink-0"
                    >
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Add
                      </div>
                    </button>
                  </div>

                  {categoryErrors.jobCategory && typeof categoryErrors.jobCategory.message === "string" && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg px-4 py-3">
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-blue-700 dark:text-blue-400 text-sm font-medium">
                          {categoryErrors.jobCategory.message}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="relative">
                    <div
                      data-category-toggle
                      className="w-full px-4 py-3 border rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white cursor-pointer font-medium flex items-center justify-between text-sm hover:border-blue-300 dark:hover:border-blue-500 transition-all duration-200"
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleDropdown('category')
                      }}
                    >
                      <span className="text-gray-600 dark:text-gray-400 truncate">Select job category</span>
                      <svg
                        className={`w-5 h-5 text-gray-400 transition-transform duration-200 flex-shrink-0 ${openDropdowns.category ? "rotate-180" : ""}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>

                    {openDropdowns.category && (
                      <div
                        ref={categoryDropdownRef}
                        className="absolute z-[100] top-full left-0 mt-2 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl shadow-2xl max-h-48 overflow-y-auto custom-scrollbar"
                        onClick={(e) => {
                          e.stopPropagation()
                        }}
                      >
                        {jobCategories.length > 0 ? (
                          <div className="p-4">
                            <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wide">
                              Available Categories ({jobCategories.length})
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {jobCategories.map((cat) => (
                                <div
                                  key={cat.id}
                                  className="group px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 border shadow-sm transition-all duration-200 hover:shadow-md cursor-pointer bg-gradient-to-r from-blue-50 to-blue-50 dark:from-blue-900/20 dark:to-blue-900/20 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-700 hover:from-blue-100 hover:to-blue-100 dark:hover:from-blue-900/30 dark:hover:to-blue-900/30 min-w-fit select-none"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    // Keep dropdown open to allow interaction
                                  }}
                                >
                                  <span className="truncate max-w-32" title={cat.name}>
                                    {cat.name}
                                  </span>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleDeleteCategory(cat.id)
                                    }}
                                    className="opacity-0 group-hover:opacity-100 hover:text-blue-500 transition-all duration-200 font-bold text-blue-600 dark:text-blue-300 flex-shrink-0 p-1 rounded hover:bg-blue-100 dark:hover:bg-blue-900/20"
                                    title="Remove category"
                                    type="button"
                                  >
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="px-6 py-8 text-center">
                            <svg className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                            </svg>
                            <p className="text-gray-500 dark:text-gray-400 text-sm">
                              No job categories available
                            </p>
                            <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
                              Add your first category above
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Experience Levels */}
              <div className="bg-gradient-to-br from-blue-50 to-blue-50 dark:from-blue-900/10 dark:to-blue-900/10 rounded-xl p-6 border border-blue-200/50 dark:border-blue-700/50 overflow-visible">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                    </svg>
                  </div>
                  <label className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                    Experience Levels
                  </label>
                </div>

                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3">
                    <input
                      type="text"
                      maxLength={20}
                      placeholder="Add new experience level"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault()
                          handleSubmitExperience(onAddExperience)()
                        }
                      }}
                      {...registerExperience("experience", {
                        required: "Experience level cannot be blank",
                        validate: {
                          validExperience: (value) => {
                            if (!value) return "Experience level cannot be blank"
                            if (!isValidExperienceForAdd(value.trim())) {
                              return "Invalid experience. Enter 1–75 years or a level name (e.g., Entry, Senior)."
                            }
                            return true
                          },
                        },
                        minLength: { value: 1, message: "Experience must be at least 1 character" },
                        maxLength: { value: 20, message: "Experience must be less than 20 characters" },
                      })}
                      className={`w-full sm:flex-1 sm:min-w-0 px-4 py-3 text-sm border rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${experienceErrors.experience
                        ? "border-blue-400 bg-blue-50 dark:bg-blue-900/20"
                        : "border-gray-300 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500"
                        }`}
                    />
                    <button
                      type="button"
                      onClick={() => handleSubmitExperience(onAddExperience)()}
                      className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-600 hover:from-blue-700 hover:to-blue-700 text-white rounded-xl font-semibold text-sm whitespace-nowrap shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 w-full sm:w-auto sm:flex-shrink-0"
                    >
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Add
                      </div>
                    </button>
                  </div>

                  {experienceErrors.experience && typeof experienceErrors.experience.message === "string" && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg px-4 py-3">
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-blue-700 dark:text-blue-400 text-sm font-medium">
                          {experienceErrors.experience.message}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="relative">
                    <div
                      data-experience-toggle
                      className="w-full px-4 py-3 border rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white cursor-pointer font-medium flex items-center justify-between text-sm hover:border-blue-300 dark:hover:border-blue-500 transition-all duration-200"
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleDropdown('experience')
                      }}
                    >
                      <span className="text-gray-600 dark:text-gray-400 truncate">Select experience level</span>
                      <svg
                        className={`w-5 h-5 text-gray-400 transition-transform duration-200 flex-shrink-0 ${openDropdowns.experience ? "rotate-180" : ""}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>

                    {openDropdowns.experience && (
                      <div
                        ref={experienceDropdownRef}
                        className="absolute z-[100] top-full left-0 mt-2 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl shadow-2xl max-h-48 overflow-y-auto custom-scrollbar"
                        onClick={(e) => {
                          e.stopPropagation()
                        }}
                      >
                        {experienceLevels.length > 0 ? (
                          <div className="p-4">
                            <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wide">
                              Available Levels ({experienceLevels.length})
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {experienceLevels.map((exp) => (
                                <div
                                  key={exp.id}
                                  className="group px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 border shadow-sm transition-all duration-200 hover:shadow-md cursor-pointer bg-gradient-to-r from-blue-50 to-blue-50 dark:from-blue-900/20 dark:to-blue-900/20 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-700 hover:from-blue-100 hover:to-blue-100 dark:hover:from-blue-900/30 dark:hover:to-blue-900/30 min-w-fit select-none"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    // Keep dropdown open to allow interaction
                                  }}
                                >
                                  <span className="truncate max-w-32" title={exp.name}>
                                    {exp.name}
                                  </span>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleDeleteExperience(exp.id)
                                    }}
                                    className="opacity-0 group-hover:opacity-100 hover:text-blue-500 transition-all duration-200 font-bold text-blue-600 dark:text-blue-300 flex-shrink-0 p-1 rounded hover:bg-blue-100 dark:hover:bg-blue-900/20"
                                    title="Remove experience level"
                                    type="button"
                                  >
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="px-6 py-8 text-center">
                            <svg className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                            </svg>
                            <p className="text-gray-500 dark:text-gray-400 text-sm">
                              No experience levels available
                            </p>
                            <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
                              Add your first level above
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Options for Job Type */}
              <div className="bg-gradient-to-br from-blue-50 to-blue-50 dark:from-blue-900/10 dark:to-blue-900/10 rounded-xl p-6 border border-blue-200/50 dark:border-blue-700/50 overflow-visible">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <label className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                    Options for Job Type
                  </label>
                </div>

                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3">
                    <input
                      type="text"
                      value={jobTypeInput}
                      maxLength={50}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        const value = e.target.value
                        setJobTypeInput(value)
                        if (jobTypeError) {
                          setJobTypeError(null)
                        }
                        if (value.trim() && value.trim().length > 0 && value.trim().length < 2) {
                          setJobTypeError("Minimum 2 characters required")
                        } else {
                          setJobTypeError(null)
                        }
                      }}
                      onBlur={(e: React.FocusEvent<HTMLInputElement>) => {
                        const value = e.target.value.trim()
                        if (value && value.length < 2) {
                          setJobTypeError("Minimum 2 characters required")
                        } else if (value) {
                          const exists = jobTypes.some((t) => t.name.toLowerCase() === value.toLowerCase())
                          if (exists) {
                            setJobTypeError(`Job type "${value}" already exists`)
                          } else {
                            setJobTypeError(null)
                          }
                        } else {
                          setJobTypeError(null)
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault()
                          handleAddJobType()
                        }
                      }}
                      placeholder="Add new job type"
                      className={`w-full sm:flex-1 sm:min-w-0 px-4 py-3 text-sm border rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${jobTypeError
                        ? "border-blue-400 bg-blue-50 dark:bg-blue-900/20"
                        : "border-gray-300 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500"
                        }`}
                    />
                    <button
                      type="button"
                      onClick={handleAddJobType}
                      className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-600 hover:from-blue-700 hover:to-blue-700 text-white rounded-xl font-semibold text-sm whitespace-nowrap shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 w-full sm:w-auto sm:flex-shrink-0"
                    >
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Add
                      </div>
                    </button>
                  </div>

                  {jobTypeError && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg px-4 py-3">
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-blue-700 dark:text-blue-400 text-sm font-medium">
                          {jobTypeError}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="relative">
                    <div
                      data-jobtype-toggle
                      className="w-full px-4 py-3 border rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white cursor-pointer font-medium flex items-center justify-between text-sm hover:border-blue-300 dark:hover:border-blue-500 transition-all duration-200"
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleDropdown('jobType')
                      }}
                    >
                      <span className="text-gray-600 dark:text-gray-400 truncate">Select job type</span>
                      <svg
                        className={`w-5 h-5 text-gray-400 transition-transform duration-200 flex-shrink-0 ${openDropdowns.jobType ? "rotate-180" : ""}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>

                    {openDropdowns.jobType && (
                      <div
                        ref={jobTypeDropdownRef}
                        className="absolute z-[100] top-full left-0 mt-2 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl shadow-2xl max-h-48 overflow-y-auto custom-scrollbar"
                        onClick={(e) => {
                          e.stopPropagation()
                        }}
                      >
                        {jobTypes.length > 0 ? (
                          <div className="p-4">
                            <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wide">
                              Available Types ({jobTypes.length})
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {jobTypes.map((type) => (
                                <div
                                  key={type.id}
                                  className="group px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 border shadow-sm transition-all duration-200 hover:shadow-md cursor-pointer bg-gradient-to-r from-blue-50 to-blue-50 dark:from-blue-900/20 dark:to-blue-900/20 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-700 hover:from-blue-100 hover:to-blue-100 dark:hover:from-blue-900/30 dark:hover:to-blue-900/30 min-w-fit select-none"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    // Keep dropdown open to allow interaction
                                  }}
                                >
                                  <span className="truncate max-w-32" title={type.name}>
                                    {type.name}
                                  </span>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleDeleteJobType(type.id)
                                    }}
                                    className="opacity-0 group-hover:opacity-100 hover:text-blue-500 transition-all duration-200 font-bold text-blue-600 dark:text-blue-300 flex-shrink-0 p-1 rounded hover:bg-blue-100 dark:hover:bg-blue-900/20"
                                    title="Remove job type"
                                    type="button"
                                  >
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="px-6 py-8 text-center">
                            <svg className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <p className="text-gray-500 dark:text-gray-400 text-sm">
                              No job types available
                            </p>
                            <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
                              Add your first type above
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Email Notifications */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-50 to-blue-50 dark:from-blue-900/20 dark:to-blue-900/20 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Email Notifications</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">Add up to 5 email addresses to receive job application alerts.</p>
              </div>
            </div>
          </div>
          <div className="p-6 lg:p-8">
            <div className="flex flex-wrap gap-2 items-start">
              <div className="flex-1">
                <input
                  {...registerEmail("notificationEmail", {
                    required: "Email address is required",
                    minLength: { value: 5, message: "Minimum 5 characters required" },
                    maxLength: { value: 254, message: "Maximum 254 characters allowed" },
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: "Invalid email address format",
                    },
                  })}
                  type="email"
                  maxLength={254}
                  minLength={5}
                  placeholder="Enter email address"
                  className={`h-11 w-full rounded-xl border px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-400 transition-all duration-200 dark:bg-gray-700 dark:text-gray-200 ${emailFormErrors.notificationEmail
                    ? 'border-red-500 focus:border-red-500'
                    : 'border-gray-300 dark:border-gray-600'
                    }`}
                />
                {emailFormErrors.notificationEmail && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1 px-1">
                    {emailFormErrors.notificationEmail.message}
                  </p>
                )}
              </div>
              <button
                onClick={handleSubmitEmail(onAddAdminEmail)}
                disabled={adminEmails.length >= 5}
                type="button"
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-600 hover:from-blue-700 hover:to-blue-700 disabled:from-blue-400 disabled:to-blue-400 text-white rounded-xl font-semibold text-sm whitespace-nowrap shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:transform-none disabled:hover:scale-100 disabled:cursor-not-allowed"
              >
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Add Email
                </div>
              </button>
            </div>
            <div className="max-h-48 overflow-y-auto space-y-2 pr-2 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-gray-100 dark:scrollbar-track-gray-800">
              {adminEmails.map((email) => (
                <div key={email} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <span className="text-sm text-gray-700 dark:text-gray-300">{email}</span>
                  <button
                    onClick={() => deleteAdminEmail(email)}
                    type="button"
                    className="p-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 flex items-center justify-center focus:ring-2 focus:ring-indigo-500 focus:outline-none min-w-[40px] min-h-[40px]"
                    aria-label="Delete email"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>
            {adminEmails.length > 2 && (
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-2">
                Scroll to see more emails
              </p>
            )}
            {adminEmails.length === 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                No notification emails added yet
              </p>
            )}
          </div>
        </div>

        {/* Job Priority Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-50 to-blue-50 dark:from-blue-900/20 dark:to-blue-900/20 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Job Priority Settings</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">Configure priority scores for job categories and experience levels.</p>
              </div>
            </div>
          </div>
          <div className="p-6 lg:p-8 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Select Category/Experience</Label>
                <select
                  className="h-11 w-full rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500"
                  value={selectedPriorityCategory || ""}
                  onChange={(e) => {
                    setSelectedPriorityCategory(e.target.value || null)
                    setPriorityCategoryError(null)
                  }}
                >
                  <option value="">Select Category</option>
                  <optgroup label="Job Categories">
                    {jobCategories.map((cat) => (
                      <option key={`cat-${cat.id}`} value={`cat-${cat.id}`}>
                        {cat.name}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Experience Levels">
                    {experienceLevels.map((exp) => (
                      <option key={`exp-${exp.id}`} value={`exp-${exp.id}`}>
                        {exp.name}
                      </option>
                    ))}
                  </optgroup>
                </select>
                {priorityCategoryError && (
                  <p className="text-xs text-red-600 dark:text-red-400">{priorityCategoryError}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Priority Score</Label>
                <div className="flex flex-wrap gap-2 items-start">
                  <div className="flex-1">
                    <input
                      type="number"
                      min="1"
                      max="100"
                      step="1"
                      maxLength={3}
                      value={priority}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        const value = e.target.value
                        setPriorityError(null)

                        if (value === "") {
                          setPriority("")
                          return
                        }

                        const numValue = Number(value)
                        if (isNaN(numValue)) {
                          setPriorityError("Please enter a valid number")
                          return
                        }

                        if (numValue < 1 || numValue > 100) {
                          if (numValue < 1) {
                            setPriorityError("Minimum value is 1")
                          } else {
                            setPriorityError("Maximum value is 100")
                          }
                          return
                        }

                        setPriority(numValue)
                      }}
                      placeholder="1-100"
                      className={`h-11 w-full rounded-xl border px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-400 transition-all duration-200 dark:bg-gray-700 dark:text-gray-200 ${priorityError
                        ? 'border-red-500 focus:border-red-500'
                        : 'border-gray-300 dark:border-gray-600'
                        }`}
                    />
                    {priorityError && (
                      <p className="text-xs text-red-600 dark:text-red-400 mt-1 px-1">
                        {priorityError}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={handleSavePriority}
                    type="button"
                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-600 hover:from-blue-700 hover:to-blue-700 text-white rounded-xl font-semibold text-sm whitespace-nowrap shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                  >
                    <div className="flex items-center gap-2">
                      <Save className="h-4 w-4" />
                      Save Priority
                    </div>
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-base font-medium">Current Priorities</Label>
              {priorityItems.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                  No priority settings configured
                </p>
              ) : (
                <>
                  <div className="max-h-48 overflow-y-auto space-y-2 pr-2 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-gray-100 dark:scrollbar-track-gray-800">
                    {priorityItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg"
                      >
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {item.description}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Score: {item.value}
                          </p>
                        </div>
                        <button
                          onClick={() => handleDeletePriority(item.id)}
                          type="button"
                          className="p-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 flex items-center justify-center focus:ring-2 focus:ring-indigo-500 focus:outline-none min-w-[40px] min-h-[40px]"
                          aria-label="Delete priority"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>
                    ))}
                  </div>
                  {priorityItems.length > 2 && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-2">
                      Scroll to see more priorities
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Unified Job & Fit Score Configuration Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden mb-6">

          {/* Section 1: Job Selection */}
          <div className="border-b border-gray-200 dark:border-gray-700">
            <div className="bg-gradient-to-r from-green-50 to-green-50 dark:from-green-900/20 dark:to-green-900/20 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m8 0V8a2 2 0 01-2 2H8a2 2 0 01-2-2V6m8 0H8" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    Job & Fit Score Configuration
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Select a job to configure specific fit scores using its requirements, or leave unselected for global settings.
                  </p>
                </div>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-2">
                <Label className="text-base font-medium">Select Job or Global Settings</Label>
                {/* Dropdown View - Always show dropdown */}
                <div className="relative">
                  <div
                    data-job-selection-toggle
                    className="w-full px-4 py-3 border rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white cursor-pointer font-medium flex items-center justify-between text-sm hover:border-green-400 dark:hover:border-green-500 transition-all duration-200 border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500"
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleDropdown('jobSelection')
                    }}
                  >
                    <div className="flex-1 truncate mr-2">
                      {selectedJobIdForFit === "" || selectedJobIdForFit === undefined ? (
                        <span className="text-gray-900 dark:text-white">Global Settings (All Jobs)</span>
                      ) : selectedFitJob ? (
                        <span className="text-gray-900 dark:text-white">
                          {selectedFitJob.title} <span className="text-gray-500 font-normal">- {selectedFitJob.job_function} ({selectedFitJob.location})</span>
                        </span>
                      ) : (
                        <span className="text-gray-400">Select a job...</span>
                      )}
                    </div>
                    <svg
                      className={`w-5 h-5 text-gray-400 transition-transform duration-200 flex-shrink-0 ${openDropdowns.jobSelection ? "rotate-180" : ""}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>

                  {openDropdowns.jobSelection && (
                    <div
                      ref={jobSelectionDropdownRef}
                      className="absolute z-[100] top-full left-0 mt-2 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl shadow-2xl max-h-60 overflow-y-auto custom-scrollbar"
                      onClick={(e) => {
                        e.stopPropagation()
                      }}
                    >
                      <div className="p-2 space-y-1">
                        {/* Global Option */}
                        <div
                          className={`px-3 py-2.5 rounded-lg text-sm font-medium flex items-center cursor-pointer transition-colors ${selectedJobIdForFit === "" || selectedJobIdForFit === undefined
                            ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300"
                            : "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200"
                            }`}
                          onClick={() => {
                            handleJobSelectionChange("");
                            setNewFitName("");
                            setIsCustomFitName(false);
                            setNewFitNameError(null);
                            toggleDropdown('jobSelection');
                          }}
                        >
                          <span className="truncate">Global Settings (All Jobs)</span>
                          {selectedJobIdForFit === "" || selectedJobIdForFit === undefined && (
                            <CheckCircle2 className="h-4 w-4 ml-auto text-green-600" />
                          )}
                        </div>

                        <div className="h-px bg-gray-100 dark:bg-gray-700 my-1" />

                        {/* Available Jobs */}
                        {availableJobs.map((job) => (
                          <div
                            key={job.job_id}
                            className={`px-3 py-2.5 rounded-lg text-sm font-medium flex items-center cursor-pointer transition-colors ${selectedJobIdForFit === job.job_id
                              ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300"
                              : "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200"
                              }`}
                            onClick={() => {
                              handleJobSelectionChange(job.job_id);
                              setNewFitName("");
                              setIsCustomFitName(false);
                              setNewFitNameError(null);
                              toggleDropdown('jobSelection');
                            }}
                          >
                            <div className="flex flex-col truncate">
                              <span className="truncate">{job.title}</span>
                              <span className="text-xs text-gray-500 font-normal truncate">
                                {job.job_function} • {job.location}
                              </span>
                            </div>
                            {selectedJobIdForFit === job.job_id && (
                              <CheckCircle2 className="h-4 w-4 ml-auto text-green-600 flex-shrink-0" />
                            )}
                          </div>
                        ))}

                        {availableJobs.length === 0 && (
                          <div className="px-3 py-4 text-center text-sm text-gray-500">
                            No active jobs found
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                {/* Selected Job Info */}
                {selectedFitJob && (
                  <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700">
                    <p className="text-sm text-green-800 dark:text-green-200">
                      <strong>Selected:</strong> {selectedFitJob.title}
                    </p>
                    <p className="text-xs text-green-600 dark:text-green-300 mt-1">
                      {selectedFitJob.job_function} • {selectedFitJob.location} • {selectedFitJob.experience_level}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section 2: Fit Score Settings Form */}
          <div>
            <div className="p-6 lg:p-8">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <select
                    className="h-11 w-full rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500"
                    value={newFitCategory}
                    onChange={(e) => {
                      setNewFitCategory(e.target.value as typeof newFitCategory)
                      setFitCategoryError(null)
                      // Reset name when category changes to allow picking from new list
                      setNewFitName("")
                    }}
                  >
                    <option value="Select Category">Select Category</option>
                    <option value="skill">Skill</option>
                    <option value="experience">Experience</option>
                    <option value="education">Education</option>
                  </select>
                  {fitCategoryError && (
                    <p className="text-xs text-red-600 dark:text-red-400">{fitCategoryError}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Name</Label>
                  {selectedFitJob && newFitCategory !== 'Select Category' && !isCustomFitName ? (
                    // Smart Dropdown for Job Specific Settings
                    <div className="relative">
                      <select
                        value={newFitName}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === 'custom_entry') {
                            setIsCustomFitName(true);
                            setNewFitName("");
                          } else {
                            setNewFitName(val);
                            setNewFitNameError(null);
                          }
                        }}
                        className={`h-11 w-full rounded-xl border px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 app-appearance-none dark:bg-gray-700 dark:text-gray-200 ${newFitNameError
                          ? 'border-red-500 focus:border-red-500'
                          : 'border-gray-300 dark:border-gray-600'
                          }`}
                      >
                        <option value="">Select {newFitCategory} from Job</option>
                        {newFitCategory === 'skill' && selectedFitJob.key_skills?.map((skill, idx) => (
                          <option key={idx} value={skill}>{skill}</option>
                        ))}
                        {newFitCategory === 'education' && selectedFitJob.education_requirements && (
                          <option value={selectedFitJob.education_requirements}>
                            {selectedFitJob.education_requirements.substring(0, 50) + (selectedFitJob.education_requirements.length > 50 ? '...' : '')}
                          </option>
                        )}
                        {newFitCategory === 'experience' && selectedFitJob.experience_level && (
                          <option value={selectedFitJob.experience_level}>{selectedFitJob.experience_level}</option>
                        )}
                        <option value="custom_entry">Enter Custom Value...</option>
                      </select>
                    </div>
                  ) : (
                    // Text Input (Custom Entry mode or Global Settings)
                    <div className="relative">
                      <input
                        type="text"
                        value={newFitName}
                        autoFocus={isCustomFitName}
                        maxLength={100}
                        minLength={1}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          const value = e.target.value
                          setNewFitName(value)
                          setNewFitNameError(null)
                        }}
                        onBlur={(e: React.FocusEvent<HTMLInputElement>) => {
                          const value = e.target.value.trim()
                          if (value && value.length < 1) {
                            setNewFitNameError("Minimum 1 character required")
                          } else if (value && value.length > 100) {
                            setNewFitNameError("Maximum 100 characters allowed")
                          } else {
                            setNewFitNameError(null)
                          }
                        }}
                        placeholder={isCustomFitName ? "Type custom value..." : getFitPlaceholder(newFitCategory)}
                        className={`h-11 w-full rounded-xl border px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-400 transition-all duration-200 dark:bg-gray-700 dark:text-gray-200 ${newFitNameError
                          ? 'border-red-500 focus:border-red-500'
                          : 'border-gray-300 dark:border-gray-600'
                          } ${isCustomFitName ? 'pr-20' : ''}`}
                      />
                      {isCustomFitName && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsCustomFitName(false);
                            setNewFitName("");
                            setNewFitNameError(null);
                          }}
                          className="absolute right-2 top-2 px-2 py-1 text-xs text-blue-600 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200"
                        >
                          Back to List
                        </button>
                      )}
                    </div>
                  )}
                  {newFitNameError && (
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1 px-1">
                      {newFitNameError}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Weight (1-100)</Label>
                  <div className="flex gap-2 items-start">
                    <div className="flex-1">
                      <input
                        type="number"
                        min="1"
                        max="100"
                        step="1"
                        maxLength={3}
                        value={newFitWeight}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          const value = e.target.value
                          setNewFitWeightError(null)

                          if (value === "") {
                            setNewFitWeight("")
                            return
                          }

                          const numValue = Number(value)
                          if (isNaN(numValue)) {
                            setNewFitWeightError("Please enter a valid number")
                            return
                          }

                          if (numValue < 1 || numValue > 100) {
                            if (numValue < 1) {
                              setNewFitWeightError("Minimum value is 1")
                            } else {
                              setNewFitWeightError("Maximum value is 100")
                            }
                            return
                          }

                          setNewFitWeight(numValue)
                        }}
                        placeholder="20"
                        className={`h-11 w-full rounded-xl border px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-400 transition-all duration-200 dark:bg-gray-700 dark:text-gray-200 ${newFitWeightError
                          ? 'border-red-500 focus:border-red-500'
                          : 'border-gray-300 dark:border-gray-600'
                          }`}
                      />
                      {newFitWeightError && (
                        <p className="text-xs text-red-600 dark:text-red-400 mt-1 px-1">
                          {newFitWeightError}
                        </p>
                      )}
                    </div>
                    {isEditing ? (
                      <>
                        <button
                          onClick={handleUpdateFitScore}
                          type="button"
                          className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-600 hover:from-blue-700 hover:to-blue-700 text-white rounded-xl font-semibold text-sm whitespace-nowrap shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                        >
                          <div className="flex items-center gap-2">
                            <Save className="h-4 w-4" />
                            Update
                          </div>
                        </button>
                        <button
                          onClick={cancelEditing}
                          type="button"
                          className="px-4 py-2 border border-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-all duration-200"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={addFitScore}
                        type="button"
                        className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-600 hover:from-blue-700 hover:to-blue-700 text-white rounded-xl font-semibold text-sm whitespace-nowrap shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                      >
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                          Add Fit Score
                        </div>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-base font-medium">
                  Current Fit Scores
                  {(jobId || selectedJobIdForFit) && (
                    <span className="ml-2 text-sm font-normal text-blue-600 dark:text-blue-400">
                      ({selectedFitJob ? selectedFitJob.title : 'Job-Specific'})
                    </span>
                  )}
                  {!jobId && !selectedJobIdForFit && (
                    <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
                      (Global Settings)
                    </span>
                  )}
                </Label>
                {fitScores.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                    {(jobId || selectedJobIdForFit)
                      ? `No fit score settings configured for ${selectedFitJob ? selectedFitJob.title : 'this job'}`
                      : "No global fit score settings configured"
                    }
                  </p>
                ) : (
                  <>
                    <div className="max-h-48 overflow-y-auto space-y-2 pr-2 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-gray-100 dark:scrollbar-track-gray-800">
                      {fitScores.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs">
                                <Badge
                                  variant="light"
                                  color={
                                    item.category === 'skill' ? 'info' :
                                      item.category === 'experience' ? 'success' :
                                        'warning'
                                  }
                                >
                                  {item.category.charAt(0).toUpperCase() + item.category.slice(1)}
                                </Badge>
                              </span>
                              <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {item.name}
                              </p>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              Weight: {item.weight}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => startEditing(item)}
                              type="button"
                              className="p-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 flex items-center justify-center focus:ring-2 focus:ring-indigo-500 focus:outline-none min-w-[40px] min-h-[40px]"
                              aria-label="Edit fit score"
                            >
                              <Edit className="h-4 w-4" aria-hidden="true" />
                            </button>
                            <button
                              onClick={() => deleteFitScore(item.id)}
                              type="button"
                              className="p-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 flex items-center justify-center focus:ring-2 focus:ring-indigo-500 focus:outline-none min-w-[40px] min-h-[40px]"
                              aria-label="Delete fit score"
                            >
                              <Trash2 className="h-4 w-4" aria-hidden="true" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    {fitScores.length > 2 && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-2">
                        Scroll to see more fit scores
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Application Screening Score */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden mb-6">

          {/* Section 1: Job Selection for Screening Score */}
          <div className="border-b border-gray-200 dark:border-gray-700">
            <div className="bg-gradient-to-r from-green-50 to-green-50 dark:from-green-900/20 dark:to-green-900/20 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    Application Screening Score Configuration
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Select a job to configure specific screening scores using its requirements, or leave unselected for global settings.
                  </p>
                </div>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-2">
                <Label className="text-base font-medium">Select Job Position for Screening</Label>
                {/* Dropdown View - Always show dropdown */}
                <div className="relative">
                  <div
                    data-screening-job-toggle
                    className="w-full px-4 py-3 border rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white cursor-pointer font-medium flex items-center justify-between text-sm hover:border-green-400 dark:hover:border-green-500 transition-all duration-200 border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500"
                    onClick={() => {
                      console.log("[DEBUG] Toggling screening job dropdown");
                      setOpenDropdowns(prev => ({ ...prev, screeningJob: !prev.screeningJob }))
                    }}
                  >
                    <div className="flex-1 truncate mr-2">
                      {selectedJobIdForScreening === "" || selectedJobIdForScreening === undefined ? (
                        <span className="text-gray-900 dark:text-white">Global Settings (All Jobs)</span>
                      ) : selectedScreeningJob ? (
                        <span className="text-gray-900 dark:text-white">
                          {selectedScreeningJob.title} <span className="text-gray-500 font-normal">- {selectedScreeningJob.job_function} ({selectedScreeningJob.location})</span>
                        </span>
                      ) : (
                        <span className="text-gray-400">Select a job...</span>
                      )}
                    </div>
                    <svg
                      className={`w-5 h-5 text-gray-400 transition-transform duration-200 flex-shrink-0 ${openDropdowns.screeningJob ? "rotate-180" : ""}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>

                  {openDropdowns.screeningJob && (
                    <div
                      ref={screeningJobDropdownRef}
                      className="absolute z-[100] top-full left-0 mt-2 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl shadow-2xl max-h-60 overflow-y-auto custom-scrollbar"
                      onClick={(e) => {
                        e.stopPropagation()
                      }}
                    >
                      <div className="p-2 space-y-1">
                        {/* Global Option */}
                        <div
                          className={`px-3 py-2.5 rounded-lg text-sm font-medium flex items-center cursor-pointer transition-colors ${selectedJobIdForScreening === "" || selectedJobIdForScreening === undefined
                            ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300"
                            : "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200"
                            }`}
                          onClick={() => {
                            console.log("[DEBUG] Selecting global settings for screening");
                            setSelectedJobIdForScreening("");
                            fetchScreeningScore();
                            setOpenDropdowns(prev => ({ ...prev, screeningJob: false }));
                          }}
                        >
                          <span className="truncate">Global Settings (All Jobs)</span>
                          {selectedJobIdForScreening === "" || selectedJobIdForScreening === undefined && (
                            <CheckCircle2 className="h-4 w-4 ml-auto text-green-600" />
                          )}
                        </div>

                        <div className="h-px bg-gray-100 dark:bg-gray-700 my-1" />

                        {/* Available Jobs */}
                        {availableJobs.map((job) => (
                          <div
                            key={job.job_id}
                            className={`px-3 py-2.5 rounded-lg text-sm font-medium flex items-center cursor-pointer transition-colors ${selectedJobIdForScreening === job.job_id
                              ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300"
                              : "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200"
                              }`}
                            onClick={() => {
                              console.log("[DEBUG] Selecting job:", job.job_id, job.title);
                              setSelectedJobIdForScreening(job.job_id);
                              fetchScreeningScore();
                              setOpenDropdowns(prev => ({ ...prev, screeningJob: false }));
                            }}
                          >
                            <div className="flex flex-col truncate">
                              <span className="truncate">{job.title}</span>
                              <span className="text-xs text-gray-500 font-normal truncate">
                                {job.job_function} • {job.location}
                              </span>
                            </div>
                            {selectedJobIdForScreening === job.job_id && (
                              <CheckCircle2 className="h-4 w-4 ml-auto text-green-600 flex-shrink-0" />
                            )}
                          </div>
                        ))}

                        {availableJobs.length === 0 && (
                          <div className="px-3 py-4 text-center text-sm text-gray-500">
                            No active jobs found
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                {/* Selected Job Info */}
                {selectedScreeningJob && (
                  <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700">
                    <p className="text-sm text-green-800 dark:text-green-200">
                      <strong>Selected:</strong> {selectedScreeningJob.title}
                    </p>
                    <p className="text-xs text-green-600 dark:text-green-300 mt-1">
                      {selectedScreeningJob.job_function} • {selectedScreeningJob.location} • {selectedScreeningJob.experience_level}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section 2: Screening Score Settings */}

          <div className="p-6 lg:p-8">
            <div className="space-y-6">
              {/* Enable/Disable Toggle */}
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div>
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white">Enable Automatic Screening</h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    When enabled, candidates will be automatically filtered based on their fit score
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={screeningEnabled}
                    onChange={(e) => setScreeningEnabled(e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 dark:peer-focus:ring-green-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-600"></div>
                </label>
              </div>

              {/* Score Threshold Input */}
              <div className="space-y-4">
                <div>
                  <Label className="text-base font-medium">Minimum Screening Score Threshold</Label>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Candidates with fit scores below this threshold will be automatically rejected. Candidates above this threshold will move to screening.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Score Threshold (0-100)</Label>
                    <div className="flex gap-2 items-start">
                      <div className="flex-1">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="1"
                          value={screeningScore}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                            const value = e.target.value
                            setScreeningScoreError(null)

                            if (value === "") {
                              setScreeningScore("")
                              return
                            }

                            const numValue = Number(value)
                            if (isNaN(numValue)) {
                              setScreeningScoreError("Please enter a valid number")
                              return
                            }

                            if (numValue < 0 || numValue > 100) {
                              if (numValue < 0) {
                                setScreeningScoreError("Minimum value is 0")
                              } else {
                                setScreeningScoreError("Maximum value is 100")
                              }
                              return
                            }

                            setScreeningScore(numValue)
                          }}
                          placeholder="70"
                          className={`h-11 w-full rounded-xl border px-4 py-2.5 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 dark:focus:border-green-400 transition-all duration-200 dark:bg-gray-700 dark:text-gray-200 ${screeningScoreError
                            ? 'border-red-500 focus:border-red-500'
                            : 'border-gray-300 dark:border-gray-600'
                            }`}
                        />
                        {screeningScoreError && (
                          <p className="text-xs text-red-600 dark:text-red-400 mt-1 px-1">
                            {screeningScoreError}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={saveScreeningScore}
                        disabled={screeningScoreLoading}
                        type="button"
                        className="px-6 py-3 bg-gradient-to-r from-green-600 to-green-600 hover:from-green-700 hover:to-green-700 text-white rounded-xl font-semibold text-sm whitespace-nowrap shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:transform-none disabled:hover:scale-100 disabled:cursor-not-allowed"
                      >
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          {screeningScoreLoading ? 'Saving...' : 'Save Settings'}
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Score Visualization */}
                  <div className="space-y-2">
                    <Label>Score Range Visualization</Label>
                    <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 mb-2">
                        <span>Rejected</span>
                        <span className="font-medium text-green-600 dark:text-green-400">
                          Screening Threshold: {screeningScore || 0}
                        </span>
                        <span>Screening</span>
                      </div>
                      <div className="relative h-6 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                        {/* Rejected area */}
                        <div
                          className="absolute left-0 top-0 h-full bg-red-500 transition-all duration-300"
                          style={{ width: `${(Number(screeningScore) || 0)}%` }}
                        ></div>
                        {/* Screening area */}
                        <div
                          className="absolute right-0 top-0 h-full bg-green-500 transition-all duration-300"
                          style={{ width: `${100 - (Number(screeningScore) || 0)}%` }}
                        ></div>
                        {/* Threshold line */}
                        <div
                          className="absolute top-0 h-full w-1 bg-white shadow-md z-10"
                          style={{ left: `${(Number(screeningScore) || 0)}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                        <span>0</span>
                        <span>{screeningScore || 0}</span>
                        <span>100</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* How Automatic Screening Works - Clickable Header */}
              <div className="border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden">
                <button
                  onClick={() => setShowScreeningExplanation(!showScreeningExplanation)}
                  className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-600/50 transition-colors duration-200 text-left"
                  type="button"
                  aria-expanded={showScreeningExplanation}
                  aria-controls="screening-explanation"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">How Automatic Screening Works</h3>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Click to learn how the ATS score threshold affects candidate status</p>
                    </div>
                  </div>
                  <svg
                    className={`w-5 h-5 text-gray-400 transition-transform duration-200 flex-shrink-0 ${showScreeningExplanation ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {showScreeningExplanation && (
                  <div id="screening-explanation" className="px-4 pb-4 bg-white dark:bg-gray-800">
                    <div className="border-t border-gray-200 dark:border-gray-600 pt-4">
                      <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                        <li className="flex items-start gap-2">
                          <span className="text-red-500 mt-1">•</span>
                          <span>Candidates with ATS scores <strong className="text-red-600 dark:text-red-400">below {screeningScore || 70}</strong> are automatically moved to <strong>&quot;Rejected&quot;</strong> status</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-green-500 mt-1">•</span>
                          <span>Candidates with ATS scores <strong className="text-green-600 dark:text-green-400">above {screeningScore || 70}</strong> are moved to <strong>&quot;Screening&quot;</strong> status</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-blue-500 mt-1">•</span>
                          <span>This filtering happens automatically when new applications are received</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-purple-500 mt-1">•</span>
                          <span>You can manually override any automatic status changes</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Delete Logo Modal */}
        {showDeleteLogoModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Delete Logo
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Are you sure you want to delete the company logo? This action cannot be undone.
              </p>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowDeleteLogoModal(false)}
                  disabled={logoDeleting}
                  type="button"
                  className="px-6 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 font-medium text-sm flex items-center justify-center focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteLogo}
                  disabled={logoDeleting}
                  type="button"
                  className="px-6 py-2.5 rounded-xl border border-red-300 dark:border-red-600 text-red-600 dark:text-red-400 bg-white dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200 font-medium text-sm flex items-center justify-center focus:ring-2 focus:ring-red-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {logoDeleting ? (
                    <span className="flex items-center">
                      <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24">
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                          fill="none"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Deleting...
                    </span>
                  ) : (
                    "Delete"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
