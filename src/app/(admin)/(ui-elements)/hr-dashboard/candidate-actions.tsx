"use client"

import React from "react"
import { API_CONFIG, buildApiUrl } from '@/config/api'

// Types
interface Candidate {
  id: string
  applicant_id?: string
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
  job_specific_fit_score?: number
  role_suitability?: number
  ats_score?: number
}

// Component for handling presigned URL viewing for candidates
const CandidatePresignedViewLink = ({
  candidate,
  children,
  className,
  title
}: {
  candidate: Candidate
  children: React.ReactNode
  className?: string
  title?: string
}) => {
  const [viewUrl, setViewUrl] = React.useState<string>('')
  const [isLoading, setIsLoading] = React.useState(false)

  React.useEffect(() => {
    const fetchViewUrl = async () => {
      setIsLoading(true)
      try {
        // Always use the direct view endpoint for viewing files
        // This endpoint will handle Content-Disposition: inline properly
        if (candidate.resumeFilename) {
          // Add timestamp to prevent browser caching issues
          const timestamp = Date.now()
          // Properly encode the filename for URL path
          const encodedFilename = encodeURIComponent(candidate.resumeFilename)
          const url = buildApiUrl(API_CONFIG.ENDPOINTS.JOBS_VIEW(encodedFilename)) + `?t=${timestamp}`
          setViewUrl(url)
        } else {
          setViewUrl('')
        }
      } catch (error) {
        console.error('Failed to get view URL:', error)
        setViewUrl('')
      } finally {
        setIsLoading(false)
      }
    }

    fetchViewUrl()
  }, [candidate])

  const handleView = () => {
    if (viewUrl) {
      // For PDFs and other viewable files, open in new tab
      // The backend will set proper Content-Disposition: inline headers
      window.open(viewUrl, '_blank')
    }
  }

  if (isLoading) {
    return (
      <button className={`${className} opacity-50 cursor-not-allowed`} title="Loading..." disabled>
        {children}
      </button>
    )
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
  )
}

// Component for handling presigned URL downloads for candidates
const CandidatePresignedDownloadLink = ({
  candidate,
  children,
  className,
  title
}: {
  candidate: Candidate
  children: React.ReactNode
  className?: string
  title?: string
}) => {
  const [downloadUrl, setDownloadUrl] = React.useState<string>('')
  const [isLoading, setIsLoading] = React.useState(false)

  React.useEffect(() => {
    const fetchDownloadUrl = async () => {
      setIsLoading(true)
      try {
        // Always use the direct download endpoint for proper filename formatting
        if (candidate.resumeFilename) {
          const url = buildApiUrl(API_CONFIG.ENDPOINTS.JOBS_DOWNLOAD(candidate.resumeFilename))
          setDownloadUrl(url)
        } else {
          setDownloadUrl('')
        }
      } catch (error) {
        console.error('Failed to get download URL:', error)
        setDownloadUrl('')
      } finally {
        setIsLoading(false)
      }
    }

    fetchDownloadUrl()
  }, [candidate])

  if (isLoading) {
    return (
      <span className={`${className} opacity-50 cursor-not-allowed`} title="Loading...">
        {children}
      </span>
    )
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
          e.preventDefault()
        }
      }}
    >
      {children}
    </a>
  )
}

// Download Resume Analysis Report as PDF for candidates
const downloadCandidateAnalysis = async (candidate: Candidate) => {
  if (!candidate) {
    alert('No candidate data available')
    return
  }

  // Get applicant details - prioritize applicant_id over id for backend compatibility
  const applicantId = (candidate.applicant_id || candidate.id || 'N/A').toString()

  if (applicantId === 'N/A') {
    alert('Applicant ID not available. Cannot download report.')
    return
  }

  try {
    // Call backend API to generate PDF
    const reportUrl = buildApiUrl(API_CONFIG.ENDPOINTS.JOBS_RESUME_ANALYSIS_PDF(applicantId))
    console.log('[DEBUG] Downloading resume analysis PDF for applicant:', applicantId)
    console.log('[DEBUG] API URL:', reportUrl)
    const response = await fetch(reportUrl)

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('No analysis data found for this applicant.')
      } else {
        throw new Error(`Failed to generate resume analysis PDF: ${response.status} ${response.statusText}`)
      }
    }

    // Download the PDF blob
    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `Resume_Analysis_${applicantId}_${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.pdf`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)

  } catch (error) {
    console.error('Error downloading resume analysis PDF:', error)
    alert(error instanceof Error ? error.message : 'Failed to download resume analysis PDF. Please try again.')
  }
}

// Main Candidate Actions Component
export const CandidateActions = ({
  candidate,
  onViewAnalysis
}: {
  candidate: Candidate
  onViewAnalysis?: (candidate: Candidate) => void
}) => {
  return (
    <div className="flex items-center gap-2 justify-end">
      <CandidatePresignedViewLink
        candidate={candidate}
        className="p-2.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-xl transition-all duration-200 group border border-blue-200 dark:border-blue-800 hover:scale-105 hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700"
        title="View Resume"
      >
        <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </CandidatePresignedViewLink>

      <CandidatePresignedDownloadLink
        candidate={candidate}
        className="p-2.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-xl transition-all duration-200 group border border-blue-200 dark:border-blue-800 hover:scale-105 hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700"
        title="Download Resume"
      >
        <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
        </svg>
      </CandidatePresignedDownloadLink>

      {(candidate.ats_score || candidate.job_specific_fit_score || candidate.role_suitability) && (
        <button
          onClick={() => {
            if (onViewAnalysis) {
              onViewAnalysis(candidate)
            } else {
              // Fallback: download the analysis PDF
              downloadCandidateAnalysis(candidate)
            }
          }}
          className="p-2.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-xl transition-all duration-200 group border border-blue-200 dark:border-blue-800 hover:scale-105 hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700"
          title="Resume Analysis"
        >
          <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </button>
      )}
    </div>
  )
}

// Export individual components for flexibility
export { CandidatePresignedViewLink, CandidatePresignedDownloadLink, downloadCandidateAnalysis }
