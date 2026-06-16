// API Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || '';

export const API_CONFIG = {
  BASE_URL: API_BASE_URL,
  ENDPOINTS: {
    // Job Listings
    JOB_LISTINGS: '/job-listings',
    JOB_LISTINGS_GENERATE_JD: '/job-listings/generate-jd',
    JOB_LISTINGS_GENERATE_DESCRIPTION: '/job-listings/generate-description',
    JOB_LISTINGS_UPLOAD_JD: '/job-listings/upload-jd',
    JOB_LISTINGS_REFRESH_COUNTS: '/job-listings/refresh-all-application-counts',
    JOB_LISTINGS_POST_TO_BOARDS: (jobId: string) => `/job-listings/${jobId}/post-to-job-boards`,
    JOB_LISTINGS_REFRESH_COUNT: (jobId: string) => `/job-listings/${jobId}/refresh-application-count`,
    JOB_LISTINGS_JOB_FUNCTIONS: '/job-listings/job-functions',
    JOB_LISTINGS_STATS: '/job-listings/stats',
    JOB_LISTINGS_UPDATE_STATUS: (jobId: string) => `/job-listings/${jobId}/status`,
    JOB_LISTINGS_POSTING_HISTORY: (jobId: string) => `/job-listings/${jobId}/posting-history`,
    
    // Job Board Integration
    JOB_BOARD_INTEGRATION: '/job-board-integration',
    JOB_BOARD_TEST_CONNECTION: '/job-board-integration/test-connection',
    
    // Jobs (Applications)
    JOBS: '/api/v1/jobs',
    JOBS_UPLOAD: '/api/v1/jobs/upload',
    JOBS_UPLOAD_BULK: '/api/v1/jobs/upload-bulk',
    JOBS_CATEGORIES: '/api/v1/jobs/categories',
    JOBS_EXPERIENCES: '/api/v1/jobs/experiences',
    JOBS_JOB_TYPES: '/api/v1/jobs/job-types',
    JOBS_PRIORITIES: '/api/v1/jobs/priorities',
    JOBS_FIT_SCORES: '/api/v1/jobs/fit-scores',
    JOBS_JOB_SPECIFIC_FIT_SCORES: (jobId: string) => `/api/v1/jobs/${jobId}/fit-scores`,
    JOBS_EMAIL_BRANDING: '/api/v1/jobs/email-branding',
    JOBS_NOTIFICATION_EMAILS: '/api/v1/jobs/notification-emails',
    JOBS_APPLICANT_MESSAGE: '/api/v1/jobs/applicant-message',
    JOBS_ANALYSIS: (applicantId: string) => `/api/v1/jobs/analysis/${applicantId}`,
    JOBS_ANALYSIS_ADVANCED: (applicantId: string) => `/api/v1/jobs/analysis-advanced/${applicantId}`,
    JOBS_CALCULATE_FIT_SCORES: (jobId: string) => `/api/v1/jobs/fit-scores/calculate/${jobId}`,
    JOBS_RESUME_ANALYSIS_PDF: (applicantId: string) => `/api/v1/jobs/resume-analysis/${applicantId}/pdf`,
    JOBS_DASHBOARD_STATS: '/api/v1/jobs/dashboard-stats',
    JOBS_DAILY_APPLICATIONS: '/api/v1/jobs/daily-applications',
    JOBS_AVAILABLE_JOBS: '/api/v1/jobs/available-jobs',
    JOBS_UPLOAD_LOGO: '/api/v1/jobs/upload-logo',
    JOBS_LOGO: '/api/v1/jobs/logo',
    JOBS_DOWNLOAD: (filename: string) => `/api/v1/jobs/download/${filename}`,
    JOBS_VIEW: (filename: string) => `/api/v1/jobs/view/${filename}`,
    
    // HR Dashboard
    HR_DASHBOARD: '/api/v1/',
    HR_CANDIDATES: '/api/v1/candidates',
    HR_METRICS: '/api/v1/metrics',
    HR_STATUS_COUNTS: '/api/v1/status-counts',
    HR_AI_INSIGHTS: '/api/v1/ai-insights',
    HR_POSITIONS: '/api/v1/positions',
    HR_ANALYTICS_PIPELINE: '/api/v1/analytics/pipeline',
    HR_DAILY_APPLICATIONS: '/api/v1/daily-applications',
    HR_CANDIDATES_STATUS_CHANGE: '/api/v1/candidates/status-change',
    HR_CANDIDATES_BULK_STATUS_CHANGE: '/api/v1/candidates/bulk-status-change',
    HR_CANDIDATES_BULK_DELETE: '/api/v1/candidates/bulk-delete',
    HR_CANDIDATES_FEEDBACK: '/api/v1/candidates/feedback',
    HR_SCREENING_INVITES: '/api/v1/screening-invites',
    HR_CALENDAR_CREATE_EVENT: '/api/v1/calendar/create-event',
    HR_INTERVIEW_INVITES: '/api/v1/interview-invites',
    HR_INTERVIEW_BOOKING_EMAILS: '/api/v1/interview-booking-emails',
    HR_JOB_BOARDS: '/api/v1/job-boards',
    HR_APPLICANTS_COUNT: '/api/v1/applicants/count',
    HR_EXPORT_CSV: '/api/v1/export/csv',
    HR_RECRUITER_SETTINGS: '/api/v1/recruiter/settings',
    HR_REFRESH_DATA: '/api/v1/refresh-data',
    HR_EMAIL_TEMPLATES: '/api/v1/email-templates',
    HR_EMAIL_TEMPLATES_UPDATE: '/api/v1/email-templates/update',
    HR_EMAIL_TEMPLATES_RENDER: '/api/v1/email-templates/render',
    HR_EMAIL_TEMPLATES_SEND: '/api/v1/email-templates/send',
    EMAIL_CONFIGURATION: (module: string) => `/api/v1/email-configurations/${module}`,
    HR_UPLOAD_JD: '/job-listings/upload-jd',
    HR_GENERATE_JD: '/job-listings/generate-jd',
    HR_UPDATE_STATUS: (jobId: string) => `/api/v1/positions/${jobId}/status`,
    HR_CANDIDATES_UPDATE: (candidateId: string) => `/api/v1/candidates/${candidateId}`,
    HR_ANALYSIS_ADVANCED: (applicantId: string) => `/api/v1/jobs/analysis-advanced/${applicantId}`,
    JOBS_EXECUTIVE_REPORT: (jobId: string) => `/api/v1/jobs/${jobId}/executive-report`,
    JOBS_CANDIDATES_EXECUTIVE_REPORT: '/api/v1/jobs/candidates/executive-report',
    
    // HR Job Settings (aliases for JOBS_* endpoints)
    HR_JOB_CATEGORIES: '/api/v1/jobs/categories',
    HR_JOB_EXPERIENCES: '/api/v1/jobs/experiences',
    HR_JOB_TYPES: '/api/v1/jobs/job-types',
    HR_JOB_APPLICANT_MESSAGE: '/api/v1/jobs/applicant-message',
    HR_JOB_PRIORITIES: '/api/v1/jobs/priorities',
    HR_JOB_FIT_SCORES: '/api/v1/jobs/fit-scores',
    HR_JOB_NOTIFICATION_EMAILS: '/api/v1/jobs/notification-emails',
    HR_JOB_EMAIL_BRANDING: '/api/v1/jobs/email-branding',
    HR_JOB_SCREENING_SCORE: '/api/v1/jobs/screening-score',
    HR_JOB_LOGO: '/api/v1/jobs/logo',
    HR_JOB_UPLOAD_LOGO: '/api/v1/jobs/upload-logo',
  }
};

// Helper function to build full API URLs
export const buildApiUrl = (endpoint: string): string => {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
};

export default API_CONFIG;
