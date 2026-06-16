"use client"

import { useEffect, useState, useCallback } from "react"
import Button from "@/components/ui/button/Button"
import Input from "@/components/form/input/InputField"
import Label from "@/components/form/Label"
import Textarea from "@/components/form/input/TextArea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Badge from "@/components/ui/badge/Badge"
import { Calendar, Mail, Send, ExternalLink, User, X, CheckCircle2, XCircle, AlertTriangle, Info, ChevronDown, Check } from "lucide-react"
import { BACKEND_URL } from "@/utils/api"
import { API_CONFIG, buildApiUrl } from '@/config/api'

interface Candidate {
  id: string
  name: string
  email: string
  position: string
  status: string
  aiScore: string
  applied: string
  source: string
  avatar: string
}

interface InterviewInvitationProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedCandidates: Candidate[]
}

type RecruiterSettings = {
  recruiterName: string
  recruiterEmail: string
  recruiterPhone: string
  calendarLink: string
  emailSignature: string
  interviewReminderLeadTime: string
  followUpReminder: string
}

type AlertState = {
  show: boolean
  variant: "success" | "error" | "warning" | "info"
  title: string
  message: string
}

type InterviewTemplate = { id: string; name: string; duration: number; description: string; type: string }
type BackendTemplate = { id?: string; slug: string; name: string; category?: string; subject: string; body: string; tokens?: string[] }
type UserRecord = {
  id?: string
  fullName?: string
  name?: string
  email?: string
  mobile?: string
  phone?: string
  userRoles?: string | string[]
}

// Local default in case backend has none or fails
const FALLBACK_TEMPLATES: InterviewTemplate[] = [
  { id: "interview-invitation", name: "Interview Invitation", duration: 60, description: "Standard interview invitation with tokens", type: "Video Call" },
  { id: "technical-interview", name: "Technical Interview", duration: 60, description: "Technical assessment and coding interview", type: "Video Call" },
  { id: "general-meeting", name: "General Meeting", duration: 30, description: "General meeting discussion template", type: "Video Call" },
  { id: "custom", name: "Custom", duration: 60, description: "Start from a blank message and customize", type: "Hybrid" },
]

export function InterviewInvitation({ open, onOpenChange, selectedCandidates }: InterviewInvitationProps) {
  // Template helpers adapted from provided approach
  const buildTemplates = () => ({
    interview: {
      id: 'interview',
      name: 'Interview Invitation',
      subject: 'Interview Invitation - {position} Role',
      message: `Dear {name},\n\nThank you for your interest in the {position} role at {companyName}. We were impressed with your application and would like to invite you for an interview.\n\nInterview Details:\n📅 Date: {date}\n🕐 Time: {time}\n⏱️ Duration: {duration}\n📍 Location: {location}\n\nYou can also book a convenient time slot using my calendar link: {calendarLink}\n\nPlease confirm your availability by replying to this email or booking directly through the calendar link.\n\nBest,\n{recruiterName}\n{recruiterTitle}\n{recruiterEmail}`,
    },
    assessment: {
      id: 'assessment',
      name: 'Technical Interview',
      subject: 'Technical Interview - {position} Role',
      message: `Dear {name},\n\nAs part of our selection process for the {position} role at {companyName}, we would like you to complete a technical assessment.\n\nAssessment Details:\n⏱️ Duration: 2 hours\n📅 Deadline: {date}\n💻 Platform: Online Assessment Portal\n\nYou will receive a separate email with the assessment link and instructions.\n\nIf you have any questions, please don't hesitate to reach out.\n\nBest,\n{recruiterName}\n{recruiterTitle}\n{recruiterEmail}`,
    },
    meeting: {
      id: 'meeting',
      name: 'General Meeting',
      subject: 'Meeting Invitation - {position} Discussion',
      message: `Dear {name},\n\nI hope this email finds you well. I would like to schedule a meeting to discuss the {position} opportunity at {companyName} in more detail.\n\nMeeting Details:\n📅 Date: {date}\n🕐 Time: {time}\n⏱️ Duration: {duration}\n🔗 Meeting Link: {meetingLink}\n\nAlternatively, you can book a time that works best for you: {calendarLink}\n\nLooking forward to our conversation.\n\nBest,\n{recruiterName}\n{recruiterTitle}\n{recruiterEmail}`,
    },
  })

  const replaceTokens = (template: string, candidate: { name: string; position: string }, context: Record<string, string | undefined>) => {
    // Ensure we work with a fresh copy of the template to avoid mutations
    const result = String(template)
    return result
      .replace(/\{name\}/g, candidate.name || '')
      .replace(/\{position\}/g, candidate.position || '')
      .replace(/\{date\}/g, context.date || '[Date to be confirmed]')
      .replace(/\{time\}/g, context.time || '[Time to be confirmed]')
      .replace(/\{duration\}/g, context.duration || '1 hour')
      .replace(/\{location\}/g, context.location || '[Location to be confirmed]')
      .replace(/\{meetingLink\}/g, context.meetingLink || '[Meeting Link]')
      .replace(/\{calendarLink\}/g, context.calendarLink || '[Calendar Link]')
      .replace(/\{recruiterName\}/g, context.recruiterName || 'Recruiter')
      .replace(/\{recruiterEmail\}/g, context.recruiterEmail || 'recruiter@company.com')
      .replace(/\{recruiterTitle\}/g, context.recruiterTitle || 'HR')
      .replace(/\{companyName\}/g, context.companyName || 'Our Company')
      .replace(/\{meetingType\}/g, context.meetingType || 'Video Call')
  }
  // Tabs: lift active tab state to parent so it does not reset on re-renders
  const [activeTab, setActiveTab] = useState<string>('details')
  const [settings, setSettings] = useState<RecruiterSettings | null>(null)
  const [emailModuleConfig, setEmailModuleConfig] = useState<{ from_email?: string; from_name?: string } | null>(null)
  const [serverTemplates, setServerTemplates] = useState<BackendTemplate[]>([])
  const [templatesLoading, setTemplatesLoading] = useState<boolean>(false)
  const [templatesError, setTemplatesError] = useState<string | null>(null)
  const [alert, setAlert] = useState<AlertState>({
    show: false,
    variant: "info",
    title: "",
    message: "",
  })
  const [invitationData, setInvitationData] = useState({
    meetingTitle: `Interview`,
    meetingType: "Video Call",
    date: "",
    time: "",
    duration: "60",
    location: "Conference Room / Video Call",
    recruiterName: "",
    interviewers: "",
    description: `Interview session with ${selectedCandidates.length} candidate${selectedCandidates.length > 1 ? "s" : ""}.`,
    template: "",
    customMessage: "",
    includeCalendarLink: true,
    sendReminder: true,
    reminderDays: "1",
    emailTemplateId: "",
  })

  // Validation state
  const [validationErrors, setValidationErrors] = useState({
    template: "",
    meetingType: "",
    duration: "",
  })

  // Email content state (moved here to be available for functions)
  const [generatedLinks, setGeneratedLinks] = useState<Record<string, string>>({})
  const [emailPreviews, setEmailPreviews] = useState<Record<string, string>>({})
  const [isSending, setIsSending] = useState(false)
  // Email content (subject & message) like the shared template UI
  const [emailSubject, setEmailSubject] = useState<string>("")
  const [emailBody, setEmailBody] = useState<string>("")
  // Store the original template with tokens (before rendering)
  const [, setOriginalEmailSubject] = useState<string>("")
  const [originalEmailBody, setOriginalEmailBody] = useState<string>("")

  // Validation function
  const validateBasicFields = () => {
    const errors = {
      template: "",
      meetingType: "",
      duration: "",
    }

    if (!invitationData.template || invitationData.template.trim() === "") {
      errors.template = "Please select an interview template"
    }

    if (!invitationData.meetingType || invitationData.meetingType.trim() === "") {
      errors.meetingType = "Please select a meeting type"
    }

    if (!invitationData.duration || invitationData.duration.trim() === "") {
      errors.duration = "Please select interview duration"
    }

    setValidationErrors(errors)

    // Return true if no errors
    return !errors.template && !errors.meetingType && !errors.duration
  }

  // Check if form is valid for submission
  const isFormValid = () => {
    return invitationData.template && invitationData.template.trim() !== "" &&
           invitationData.meetingType && invitationData.meetingType.trim() !== "" &&
           invitationData.duration && invitationData.duration.trim() !== ""
  }

  // Step navigation handlers with validation
  const handleContinueToPersonalization = () => {
    if (validateBasicFields()) {
      setActiveTab('personalization')
    }
  }

  const handleContinueToPreview = () => {
    setActiveTab('preview')
  }

  const handleBackToDetails = () => {
    setActiveTab('details')
  }

  const handleBackToPersonalization = () => {
    setActiveTab('personalization')
  }

  // Handle submit button click - always show validation if form is invalid
  const handleSubmitClick = () => {
    if (!isFormValid()) {
      validateBasicFields()
      return
    }
    sendInvitations()
  }

  // Generate email content for a candidate
  const generateEmailContent = useCallback((candidate: Candidate, schedulingLink: string) => {
    const recruiterName = settings?.recruiterName || 'Recruiter' 

    // Use original template with tokens if available, otherwise use current emailBody
    // This ensures each candidate gets their own name replaced correctly
    const templateBody = originalEmailBody || emailBody || ""

    const ctx = {
      date: invitationData.date || undefined,
      time: invitationData.time || undefined,
      duration: `${invitationData.duration} minutes`,
      location: invitationData.location,
      meetingLink: schedulingLink,
      calendarLink: settings?.calendarLink,
      recruiterName,
      recruiterEmail: settings?.recruiterEmail,
      recruiterTitle: undefined,
      companyName: 'Our Company',
    } as Record<string, string | undefined>

    // Always use the original template with tokens to replace with candidate-specific data
    if (templateBody) {
      return replaceTokens(templateBody, { name: candidate.name, position: candidate.position }, ctx)
    } else {
      // Fallback: Use the default interview invitation template
      const fallbackTemplate = buildTemplates().interview
      return replaceTokens(fallbackTemplate.message, { name: candidate.name, position: candidate.position }, ctx)
    }
  }, [settings, originalEmailBody, emailBody, invitationData])

  // Generate email preview for a candidate
  const generateEmailPreview = useCallback((candidate: Candidate, schedulingLink: string) => {
    // Use from_name from email module config, or fallback to recruiter name
    const senderName = emailModuleConfig?.from_name || settings?.recruiterName || invitationData.recruiterName || 'Recruiter'
    const emailBodyText = generateEmailContent(candidate, schedulingLink)
    const emailSubjectText = emailSubject || "Interview Invitation"

    // Use the actual from_email from email module configuration (hr_interview module)
    // This is the email that will actually be used when sending via the backend
    // Fallback order: email module config -> default contactus email
    const senderEmail = emailModuleConfig?.from_email || 'contactus@mobiloitte.com'
    const senderEmailEsc = senderEmail.replace(/</g, '&lt;').replace(/>/g, '&gt;')
    const recipientEmailEsc = (candidate.email || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    return `<div style="font-family: Arial, sans-serif; font-size: 12px; line-height: 1.4;">
<div style="border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; margin-bottom: 12px;">
<div style="margin-bottom: 4px;"><strong>From:</strong> ${senderName} &lt;${senderEmailEsc}&gt;</div>
<div style="margin-bottom: 4px;"><strong>To:</strong> ${candidate.name} &lt;${recipientEmailEsc}&gt;</div>
<div><strong>Subject:</strong> ${emailSubjectText}</div>
</div>
<div style="line-height: 1.5; white-space: pre-line;">
${emailBodyText}
</div>
</div>`
  }, [emailModuleConfig, settings, invitationData.recruiterName, emailSubject, generateEmailContent])

  // Generate personalized links for all selected candidates
  const generatePersonalizedLinks = useCallback(() => {
    const links: Record<string, string> = {}
    const previews: Record<string, string> = {}

    selectedCandidates.forEach((candidate) => {
      const directCalendar = settings?.calendarLink?.trim()
      if (invitationData.includeCalendarLink && directCalendar) {
        links[candidate.id] = directCalendar
      } else {
        const linkId = Math.random().toString(36).substring(2, 15)
        const recruiterSlug = (settings?.recruiterName || 'recruiter').toLowerCase().replace(/\s+/g, "-")
        links[candidate.id] = `https://interview.company.com/schedule/${linkId}?recruiter=${recruiterSlug}&candidate=${candidate.id}&position=${encodeURIComponent(candidate.position)}`
      }

      previews[candidate.id] = generateEmailPreview(candidate, links[candidate.id])
    })

    setGeneratedLinks(links)
    setEmailPreviews(previews)
    // Stay on preview tab to show generated links
    setActiveTab('preview')
  }, [selectedCandidates, settings, invitationData.includeCalendarLink, generateEmailPreview, setGeneratedLinks, setEmailPreviews, setActiveTab])

  // Automatically generate personalized links when entering preview step
  useEffect(() => {
    if (activeTab === 'preview' && selectedCandidates.length > 0) {
      // Generate links and previews automatically when entering preview step
      generatePersonalizedLinks()
    }
  }, [activeTab, selectedCandidates.length, generatePersonalizedLinks])

  // Load email module configuration to get the actual sender email
  useEffect(() => {
    const loadEmailConfig = async () => {
      try {
        // Try to get hr_interview module config first (used for interview invitations)
        let res = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.EMAIL_CONFIGURATION('hr_interview')), {
          cache: 'no-store',
          headers: { 'Content-Type': 'application/json' }
        })
        
        if (res.ok) {
          const config = await res.json()
          setEmailModuleConfig({ from_email: config.from_email, from_name: config.from_name })
          console.log('Loaded hr_interview email config:', config)
          return
        }
        
        // Fallback to jobs module (used for applicant messages)
        res = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.EMAIL_CONFIGURATION('jobs')), {
          cache: 'no-store',
          headers: { 'Content-Type': 'application/json' }
        })
        
        if (res.ok) {
          const config = await res.json()
          setEmailModuleConfig({ from_email: config.from_email, from_name: config.from_name })
          console.log('Loaded jobs email config:', config)
          return
        }
        
        // Fallback to default module
        res = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.EMAIL_CONFIGURATION('default')), {
          cache: 'no-store',
          headers: { 'Content-Type': 'application/json' }
        })
        
        if (res.ok) {
          const config = await res.json()
          setEmailModuleConfig({ from_email: config.from_email, from_name: config.from_name })
          console.log('Loaded default email config:', config)
        }
      } catch (error) {
        console.error('Error loading email module configuration:', error)
      }
    }
    loadEmailConfig()
  }, [])

  // Load recruiter settings from backend
  useEffect(() => {
    const load = async () => {
      try {
        console.log('Loading recruiter settings from:', buildApiUrl(API_CONFIG.ENDPOINTS.HR_RECRUITER_SETTINGS))
        const res = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.HR_RECRUITER_SETTINGS), { 
          cache: 'no-store',
          headers: {
            'Content-Type': 'application/json',
          }
        })
        
        if (!res.ok) {
          console.warn('Recruiter settings fetch failed:', res.status)
          return
        }
        
        const data: RecruiterSettings = await res.json()
        console.log('Loaded recruiter settings:', data)
        setSettings(data)
        setInvitationData(prev => ({
          ...prev,
          recruiterName: data.recruiterName || prev.recruiterName,
          interviewers: data.recruiterEmail || prev.interviewers,
          // Map reminder lead time like "1-day" → "1"
          reminderDays: (data.followUpReminder?.split('-')[0] || prev.reminderDays)
        }))
      } catch (error) {
        console.error('Error loading recruiter settings:', error)
      }
    }
    load()
  }, [])

  // Fetch HR users and populate recruiter info if available
  useEffect(() => {
    const loadHrRecruiter = async () => {
      try {
        const res = await fetch(buildApiUrl('/users/all'), {
          headers: { accept: 'application/json' },
          cache: 'no-store',
        })
        if (!res.ok) {
          console.warn('HR users fetch failed:', res.status)
          return
        }
        const data = await res.json()
        const users: UserRecord[] = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : []
        const hrUser = users.find(u => {
          if (!u?.userRoles) return false
          const roles = Array.isArray(u.userRoles) ? u.userRoles : String(u.userRoles).split(',').map(r => r.trim())
          return roles.some(r => r.toLowerCase() === 'hr')
        })
        if (!hrUser) return

        const hrName = hrUser.fullName || hrUser.name || ''
        const hrEmail = hrUser.email || ''
        const hrPhone = hrUser.mobile || hrUser.phone || ''

        setSettings(prev => ({
          recruiterName: hrName || prev?.recruiterName || '',
          recruiterEmail: hrEmail || prev?.recruiterEmail || '',
          recruiterPhone: hrPhone || prev?.recruiterPhone || '',
          calendarLink: prev?.calendarLink || '',
          emailSignature: prev?.emailSignature || '',
          interviewReminderLeadTime: prev?.interviewReminderLeadTime || '1-hour',
          followUpReminder: prev?.followUpReminder || '3-days',
        }))

        setInvitationData(prev => ({
          ...prev,
          recruiterName: hrName || prev.recruiterName,
          interviewers: hrEmail || prev.interviewers,
        }))
      } catch (error) {
        console.error('Error loading HR recruiter:', error)
      }
    }

    loadHrRecruiter()
  }, [])

  // Load email templates from backend
  const fetchTemplates = async () => {
    try {
      setTemplatesLoading(true)
      setTemplatesError(null)
      console.log('Fetching templates from:', `${BACKEND_URL}/api/v1/email-templates`)
      
      const res = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.HR_EMAIL_TEMPLATES), { 
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
        }
      })
      
      if (!res.ok) {
        const errorText = await res.text()
        console.error('Template fetch error:', res.status, errorText)
        throw new Error(`HTTP ${res.status}: ${errorText}`)
      }
      
      const data: BackendTemplate[] = await res.json()
      console.log('Fetched templates:', data)
      setServerTemplates(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error fetching templates:', error)
      setTemplatesError(error instanceof Error ? error.message : 'Failed to fetch templates')
      setServerTemplates([])
    } finally {
      setTemplatesLoading(false)
    }
  }

  useEffect(() => {
    fetchTemplates()
  }, [])

  // Refresh templates when modal opens
  useEffect(() => {
    if (open) {
      fetchTemplates()
    }
  }, [open])

  // Force update templates from backend (currently unused but kept for future use)
  // const updateTemplatesFromBackend = async () => {
  //   try {
  //     const updateRes = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.HR_EMAIL_TEMPLATES_UPDATE), {
  //       method: 'POST',
  //       headers: { 'Content-Type': 'application/json' }
  //     })
  //     
  //     if (updateRes.ok) {
  //       console.log('Templates updated successfully on backend')
  //     } else {
  //       const errorText = await updateRes.text()
  //       console.warn(`Backend update failed: ${updateRes.status} ${errorText}`)
  //     }
  //   } catch (updateError) {
  //     console.warn('Backend update failed, continuing with fetch:', updateError)
  //   }
  //   
  //   await fetchTemplates()
  // }

  const accentClasses = {
    text600: 'text-blue-600',
    text400: 'text-blue-400',
    bg600: 'bg-blue-600',
    bg50: 'bg-blue-50',
    hoverBg700: 'hover:bg-blue-700',
    border500: 'border-blue-500',
    text900: 'text-blue-900',
    text700: 'text-blue-700',
  }
  
  const showAlert = (variant: "success" | "error" | "warning" | "info", title: string, message: string) => {
    setAlert({ show: true, variant, title, message })
    setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 4000)
  }
  
  const saveCurrentTemplate = async () => {
    try {
      let slug = invitationData.emailTemplateId
      if (!slug) {
        // Generate a slug from the subject or use a default
        slug = emailSubject 
          ? emailSubject.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '-').substring(0, 50)
          : 'custom-interview-template'
        console.log('Generated slug for template:', slug)
      }
      
      const payload = {
        slug,
        name: (serverTemplates.find(t => t.slug === slug)?.name) || slug.replace(/-/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase()),
        category: 'interview',
        subject: emailSubject || 'Interview Invitation',
        body: emailBody || '',
        tokens: ["name","position","date","time","duration","location","meetingLink","calendarLink","recruiterName","recruiterEmail","recruiterTitle","companyName"]
      }
      
      console.log('Saving template:', payload)
      
      // Try to update existing template first
      const updateRes = await fetch(buildApiUrl(`${API_CONFIG.ENDPOINTS.HR_EMAIL_TEMPLATES}/${slug}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      
      if (updateRes.ok) {
        console.log('Template updated successfully')
        showAlert('success', 'Saved', 'Template saved successfully!')
        // Refresh templates to get updated data
        await fetchTemplates()
      } else if (updateRes.status === 404) {
        // If not found, create it
        console.log('Template not found, creating new one')
        const createRes = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.HR_EMAIL_TEMPLATES), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
        
        if (createRes.ok) {
          console.log('Template created successfully')
          showAlert('success', 'Saved', 'Template saved successfully!')
          // Refresh templates to get new data
          await fetchTemplates()
        } else {
          const errorText = await createRes.text()
          console.error('Failed to create template:', createRes.status, errorText)
          showAlert('error', 'Failed', 'Failed to save template. Please try again.')
        }
      } else {
        const errorText = await updateRes.text()
        console.error('Failed to update template:', updateRes.status, errorText)
        showAlert('error', 'Failed', 'Failed to save template. Please try again.')
      }
    } catch (error) {
      console.error('Error saving template:', error)
      showAlert('error', 'Failed', 'Failed to save template. Please try again.')
    }
  }

  const saveRecruiterSettings = async (newSettings: Partial<RecruiterSettings>) => {
    try {
      // Merge new settings with existing settings to ensure all required fields are included
      const payload: RecruiterSettings = {
        recruiterName: newSettings.recruiterName || settings?.recruiterName || '',
        recruiterEmail: newSettings.recruiterEmail || settings?.recruiterEmail || '',
        recruiterPhone: newSettings.recruiterPhone || settings?.recruiterPhone || '',
        calendarLink: newSettings.calendarLink || settings?.calendarLink || '',
        emailSignature: newSettings.emailSignature || settings?.emailSignature || '',
        interviewReminderLeadTime: newSettings.interviewReminderLeadTime || settings?.interviewReminderLeadTime || '1-hour',
        followUpReminder: newSettings.followUpReminder || settings?.followUpReminder || '3-days',
      }
      
      console.log('Saving recruiter settings:', payload)
      const res = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.HR_RECRUITER_SETTINGS), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      
      if (!res.ok) {
        const errorText = await res.text()
        console.error('Failed to save recruiter settings:', res.status, errorText)
        throw new Error(`Failed to save settings: ${res.status}`)
      }
      
      const saveResult = await res.json()
      console.log('Recruiter settings saved:', saveResult)
      
      // Update local state
      setSettings(prev => prev ? { ...prev, ...newSettings } : null)
      showAlert('success', 'Saved', 'Calendar link saved successfully!')
      return saveResult
    } catch (error) {
      console.error('Error saving recruiter settings:', error)
      showAlert('error', 'Failed', 'Failed to save calendar link. Please try again.')
      throw error
    }
  }

  // Unused function - kept for potential future use
  // const handleTemplateSelect = async (templateId: string) => {
  //   const backend = serverTemplates.find(t => t.slug === templateId)
  //   const template: InterviewTemplate | undefined = backend
  //     ? { id: backend.slug, name: (backend.name && backend.name.toLowerCase() !== 'string') ? backend.name : 'Custom', duration: 60, description: backend.category || 'Template', type: 'Video Call' }
  //     : FALLBACK_TEMPLATES.find((t: InterviewTemplate) => t.id === templateId)
  //   if (!template) return
  //   
  //   const emailTemplateId = backend ? backend.slug : templateId
  //   setInvitationData((prev) => ({
  //     ...prev,
  //     template: templateId,
  //     meetingTitle: template.name,
  //     duration: template.duration.toString(),
  //     meetingType: template.type,
  //     description: template.description,
  //     emailTemplateId: emailTemplateId,
  //     customMessage: templateId === 'custom' ? prev.customMessage : '',
  //   }))
  //   
  //   try {
  //     if (backend) {
  //       const firstCandidate = selectedCandidates[0]
  //       const contextData = {
  //         candidateName: firstCandidate?.name,
  //         name: firstCandidate?.name,
  //         position: firstCandidate?.position,
  //         date: invitationData.date || '[Date to be confirmed]',
  //         time: invitationData.time || '[Time to be confirmed]',
  //         duration: `${invitationData.duration} minutes`,
  //         location: invitationData.location || '[Location to be confirmed]',
  //         meetingLink: '[Meeting Link]',
  //         calendarLink: settings?.calendarLink || '[Calendar Link]',
  //         recruiterName: settings?.recruiterName || 'Recruiter',
  //         recruiterEmail: settings?.recruiterEmail || 'recruiter@company.com',
  //         recruiterTitle: 'HR',
  //         companyName: 'Our Company',
  //       }
  //       
  //       const renderRes = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.HR_EMAIL_TEMPLATES_RENDER), {
  //         method: 'POST',
  //         headers: { 'Content-Type': 'application/json' },
  //         body: JSON.stringify({
  //           slug: backend.slug,
  //           data: contextData
  //         })
  //       })
  //       
  //       if (renderRes.ok) {
  //         const rendered = await renderRes.json() as { subject: string; body: string }
  //         setEmailSubject(rendered.subject || backend.subject || '')
  //         setEmailBody(rendered.body || backend.body || '')
  //         setOriginalEmailSubject(backend.subject || '')
  //         setOriginalEmailBody(backend.body || '')
  //       } else {
  //         setEmailSubject(backend.subject || '')
  //         setEmailBody(backend.body || '')
  //         setOriginalEmailSubject(backend.subject || '')
  //         setOriginalEmailBody(backend.body || '')
  //       }
  //     } else if (templateId === 'custom') {
  //       setEmailSubject("")
  //       setEmailBody("")
  //       setOriginalEmailSubject("")
  //       setOriginalEmailBody("")
  //     } else {
  //       const templateMap: Record<string, string> = {
  //         'interview-invitation': 'interview',
  //         'technical-interview': 'assessment', 
  //         'general-meeting': 'meeting'
  //       }
  //       const templateKey = templateMap[emailTemplateId || ''] || emailTemplateId
  //       const templates = buildTemplates()
  //       const t = templates[templateKey as keyof typeof templates]
  //       if (t) {
  //         setEmailSubject(t.subject)
  //         setEmailBody(t.message)
  //         setOriginalEmailSubject(t.subject)
  //         setOriginalEmailBody(t.message)
  //       }
  //     }
  //   } catch (error) {
  //     console.error('Error in template selection:', error)
  //   }
  //   
  //   setActiveTab('personalization')
  // }

  // Handler for template selection from dropdown (stays on current tab)
  const handleTemplateSelectFromDropdown = async (templateId: string) => {
    // Try to map to backend template by slug, else find in fallback list
    const backend = serverTemplates.find(t => t.slug === templateId)
    const template: InterviewTemplate | undefined = backend
      ? { id: backend.slug, name: (backend.name && backend.name.toLowerCase() !== 'string') ? backend.name : 'Custom', duration: 60, description: backend.category || 'Template', type: 'Video Call' }
      : FALLBACK_TEMPLATES.find((t: InterviewTemplate) => t.id === templateId)
    if (!template) return
    
    // Map template to emailTemplateId used by personalization/preview (slug if from backend)
    const emailTemplateId = backend ? backend.slug : templateId
    
    setInvitationData((prev) => ({
      ...prev,
      template: templateId,
      meetingTitle: template.name,
      duration: template.duration.toString(),
      meetingType: template.type,
      description: template.description,
      emailTemplateId: emailTemplateId,
      // clear custom message when switching to a predefined template
      customMessage: templateId === 'custom' ? prev.customMessage : '',
    }))
    
    // Seed subject/body via backend render if available, otherwise fallback client tokens
    try {
      if (backend) {
        console.log('Using backend template:', backend.slug)
        const firstCandidate = selectedCandidates[0]
        
        // Create context with current settings and invitation data
        const contextData = {
          candidateName: firstCandidate?.name,
          name: firstCandidate?.name,
          position: firstCandidate?.position,
          date: invitationData.date || '[Date to be confirmed]',
          time: invitationData.time || '[Time to be confirmed]',
          duration: `${invitationData.duration} minutes`,
          location: invitationData.location || '[Location to be confirmed]',
          meetingLink: '[Meeting Link]',
          calendarLink: settings?.calendarLink || '[Calendar Link]',
          recruiterName: settings?.recruiterName || 'Recruiter',
          recruiterEmail: settings?.recruiterEmail || 'recruiter@company.com',
          recruiterTitle: 'HR',
          companyName: 'Our Company',
        }
        
        const renderRes = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.HR_EMAIL_TEMPLATES_RENDER), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            slug: backend.slug,
            data: contextData
          })
        })
        
        if (renderRes.ok) {
          const rendered = await renderRes.json() as { subject: string; body: string }
          console.log('Rendered template:', rendered)
          // Store the rendered version for display, but also store original template with tokens
          setEmailSubject(rendered.subject || backend.subject || '')
          setEmailBody(rendered.body || backend.body || '')
          // Store original template with tokens for generating personalized content
          setOriginalEmailSubject(backend.subject || '')
          setOriginalEmailBody(backend.body || '')
        } else {
          console.log('Render failed, using raw template')
          // fallback to raw server template tokens
          setEmailSubject(backend.subject || '')
          setEmailBody(backend.body || '')
          // Store original template with tokens
          setOriginalEmailSubject(backend.subject || '')
          setOriginalEmailBody(backend.body || '')
        }
      } else if (templateId === 'custom') {
        console.log('Using custom template')
        setEmailSubject("")
        setEmailBody("")
        setOriginalEmailSubject("")
        setOriginalEmailBody("")
      } else {
        console.log('Using fallback template:', templateId)
        // Map fallback template IDs to buildTemplates keys
        const templateMap: Record<string, string> = {
          'interview-invitation': 'interview',
          'technical-interview': 'assessment', 
          'general-meeting': 'meeting'
        }
        const templateKey = templateMap[emailTemplateId || ''] || emailTemplateId
        const templates = buildTemplates()
        const t = templates[templateKey as keyof typeof templates]
        if (t) {
          setEmailSubject(t.subject)
          setEmailBody(t.message)
          // Store original template with tokens
          setOriginalEmailSubject(t.subject)
          setOriginalEmailBody(t.message)
        }
      }
    } catch (error) {
      console.error('Error in template selection:', error)
      // graceful: leave previously set values
    }
    // Don't switch tabs when selecting from dropdown
  }



  const sendInvitations = async () => {
    if (isSending) return

    // Validate required fields before sending
    if (!validateBasicFields()) {
      return
    }

    setIsSending(true)

    try {
      // Generate links if not already generated
    if (Object.keys(generatedLinks).length === 0) {
      generatePersonalizedLinks()
    }

    const invitationPayload = {
      candidates: selectedCandidates.map((candidate) => ({
        ...candidate,
        schedulingLink: generatedLinks[candidate.id],
          emailContent: generateEmailContent(candidate, generatedLinks[candidate.id]),
      })),
      invitationData,
      recruiterInfo: settings,
      timestamp: new Date().toISOString(),
    }

    console.log("Sending enhanced invitations:", invitationPayload)
      
    // If date/time provided, attempt to create Google Calendar events via backend
      if (settings && invitationData.date && invitationData.time) {
        // Build start/end timestamps; default duration minutes
        const startDateTime = new Date(`${invitationData.date}T${invitationData.time}:00`)
        const durationMin = parseInt(invitationData.duration || '60', 10)
        const endDateTime = new Date(startDateTime.getTime() + durationMin * 60000)

        const invites = selectedCandidates.map((c) => ({
          attendee: { email: c.email, name: c.name },
          summary: invitationData.meetingTitle,
          description: invitationData.customMessage || invitationData.description,
          location: invitationData.location,
          start: { dateTime: startDateTime.toISOString(), timeZone: 'UTC' },
          end: { dateTime: endDateTime.toISOString(), timeZone: 'UTC' },
          includeMeet: true,
        }))

        const res = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.HR_INTERVIEW_INVITES), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ invites }),
        })
        
        // 501 means server not configured; proceed without blocking
        if (res.ok) {
          const data = await res.json()
          console.log('Calendar events created:', data)
          showAlert('success', 'Sent', `Successfully sent ${selectedCandidates.length} interview invitation(s)!`)
        } else if (res.status !== 501) {
          console.warn('Calendar invite API error:', await res.text())
          showAlert('warning', 'Partial Success', 'Calendar events could not be created, but invitations were sent.')
        } else {
          showAlert('success', 'Sent', `Successfully sent ${selectedCandidates.length} interview invitation(s)!`)
        }
      } else {
        // No date/time: send booking emails with recruiter calendarLink using preview content
        const candidatesForEmail = selectedCandidates.map((c) => ({
          email: c.email,
          name: c.name,
          position: c.position,
          subject: `${emailSubject || invitationData.meetingTitle}`,
          emailContent: generateEmailContent(c, generatedLinks[c.id])
        }))

        const emailRes = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.HR_INTERVIEW_BOOKING_EMAILS), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            candidates: candidatesForEmail,
            calendarLink: settings?.calendarLink || undefined,
            message: invitationData.customMessage || undefined,
            subject: invitationData.meetingTitle,
          })
        })
        
        if (emailRes.ok) {
          const data = await emailRes.json()
          console.log('Booking emails result:', data)
          showAlert('success', 'Sent', `Successfully sent ${selectedCandidates.length} interview invitation(s)!`)
        } else {
          console.warn('Booking email API error:', await emailRes.text())
          showAlert('error', 'Failed', 'Failed to send some invitations. Please check your settings and try again.')
        }
      }
    } catch (e) {
      console.error('Error sending invitations:', e)
      showAlert('error', 'Failed', 'Failed to send invitations. Please try again.')
    } finally {
    setIsSending(false)
      onOpenChange(false)
    }
  }


  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-[99999] bg-black/10 backdrop-blur-[2px]" onClick={() => onOpenChange(false)} />
      <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 overflow-y-auto" onClick={() => onOpenChange(false)}>
        <div 
          className="w-full max-w-7xl max-h-[90vh] overflow-y-auto no-scrollbar bg-white dark:bg-gray-800/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-gray-200/60 dark:border-gray-700/60 animate-scaleIn"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Gradient Header */}
          <header className="relative p-5 sm:p-6 rounded-t-2xl overflow-hidden mb-6">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 opacity-90" />
            <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-xl">
                  <Calendar className="w-5 h-5 text-white" aria-hidden="true" />
                </div>
                <div>
                  <h2 className="text-white text-lg sm:text-2xl font-semibold tracking-tight">
                    Interview Invitation
                  </h2>
                  <p className="text-blue-100 text-xs sm:text-sm mt-1">
                    {selectedCandidates.length} Candidate{selectedCandidates.length > 1 ? "s" : ""} selected • <span className="font-semibold">Hire Portal</span>
                  </p>
                </div>
              </div>
              <button
                aria-label="Close modal"
                onClick={() => onOpenChange(false)}
                className="text-white hover:bg-white/20 rounded-full p-2 transition-all duration-200 focus:ring-2 focus:ring-white/50 focus:outline-none flex-shrink-0"
                type="button"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          </header>

          {/* Progress Indicator */}
          <div className="px-6 pb-6">
            <div className="relative">
              {/* Progress Bar Line */}
              <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-200 dark:bg-gray-700">
                <div 
                  className="h-full bg-blue-600 dark:bg-blue-500 transition-all duration-500 ease-in-out"
                  style={{
                    width: activeTab === 'details' ? '0%' : activeTab === 'personalization' ? '50%' : '100%'
                  }}
                />
              </div>
              
              {/* Steps */}
              <div className="relative flex justify-between items-start">
                {/* Step 1: Interview Details */}
                <button
                  type="button"
                  onClick={() => setActiveTab('details')}
                  className="flex flex-col items-center group cursor-pointer flex-1"
                  aria-label="Interview Details"
                >
                  <div className={`
                    relative z-10 w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all duration-300
                    ${activeTab === 'details' 
                      ? 'bg-white dark:bg-gray-800 border-blue-600 dark:border-blue-500 shadow-lg ring-4 ring-blue-100 dark:ring-blue-900/50' 
                      : activeTab === 'personalization' || activeTab === 'preview'
                      ? 'bg-blue-600 dark:bg-blue-500 border-blue-600 dark:border-blue-500'
                      : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 group-hover:border-blue-400 dark:group-hover:border-blue-500'
                    }
                  `}>
                    {activeTab === 'personalization' || activeTab === 'preview' ? (
                      <Check className="w-5 h-5 text-white" strokeWidth={3} />
                    ) : (
                      <div className={`w-3 h-3 rounded-full ${activeTab === 'details' ? 'bg-blue-600 dark:bg-blue-500' : 'bg-gray-400 dark:bg-gray-500'}`} />
                    )}
                  </div>
                  <span className={`
                    mt-2 text-xs font-medium text-center transition-colors duration-200 max-w-[100px]
                    ${activeTab === 'details' 
                      ? 'text-blue-600 dark:text-blue-400 font-semibold' 
                      : activeTab === 'personalization' || activeTab === 'preview'
                      ? 'text-gray-600 dark:text-gray-400'
                      : 'text-gray-500 dark:text-gray-500 group-hover:text-gray-700 dark:group-hover:text-gray-300'
                    }
                  `}>
                    Interview Details
                  </span>
                </button>

                {/* Step 2: Personalization */}
                <button
                  type="button"
                  onClick={() => setActiveTab('personalization')}
                  className="flex flex-col items-center group cursor-pointer flex-1"
                  aria-label="Personalization"
                >
                  <div className={`
                    relative z-10 w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all duration-300
                    ${activeTab === 'personalization' 
                      ? 'bg-white dark:bg-gray-800 border-blue-600 dark:border-blue-500 shadow-lg ring-4 ring-blue-100 dark:ring-blue-900/50' 
                      : activeTab === 'preview'
                      ? 'bg-blue-600 dark:bg-blue-500 border-blue-600 dark:border-blue-500'
                      : activeTab === 'details'
                      ? 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600'
                      : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 group-hover:border-blue-400 dark:group-hover:border-blue-500'
                    }
                  `}>
                    {activeTab === 'preview' ? (
                      <Check className="w-5 h-5 text-white" strokeWidth={3} />
                    ) : activeTab === 'details' ? (
                      <div className="w-3 h-3 rounded-full bg-gray-400 dark:bg-gray-500" />
                    ) : (
                      <div className={`w-3 h-3 rounded-full ${activeTab === 'personalization' ? 'bg-blue-600 dark:bg-blue-500' : 'bg-gray-400 dark:bg-gray-500'}`} />
                    )}
                  </div>
                  <span className={`
                    mt-2 text-xs font-medium text-center transition-colors duration-200 max-w-[100px]
                    ${activeTab === 'personalization' 
                      ? 'text-blue-600 dark:text-blue-400 font-semibold' 
                      : activeTab === 'preview'
                      ? 'text-gray-600 dark:text-gray-400'
                      : 'text-gray-500 dark:text-gray-500 group-hover:text-gray-700 dark:group-hover:text-gray-300'
                    }
                  `}>
                    Personalization
                  </span>
                </button>

                {/* Step 3: Preview & Send */}
                <button
                  type="button"
                  onClick={() => setActiveTab('preview')}
                  className="flex flex-col items-center group cursor-pointer flex-1"
                  aria-label="Preview & Send"
                >
                  <div className={`
                    relative z-10 w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all duration-300
                    ${activeTab === 'preview' 
                      ? 'bg-white dark:bg-gray-800 border-blue-600 dark:border-blue-500 shadow-lg ring-4 ring-blue-100 dark:ring-blue-900/50' 
                      : activeTab === 'details' || activeTab === 'personalization'
                      ? 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600'
                      : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 group-hover:border-blue-400 dark:group-hover:border-blue-500'
                    }
                  `}>
                    {activeTab === 'details' || activeTab === 'personalization' ? (
                      <div className="w-3 h-3 rounded-full bg-gray-400 dark:bg-gray-500" />
                    ) : (
                      <div className={`w-3 h-3 rounded-full ${activeTab === 'preview' ? 'bg-blue-600 dark:bg-blue-500' : 'bg-gray-400 dark:bg-gray-500'}`} />
                    )}
                  </div>
                  <span className={`
                    mt-2 text-xs font-medium text-center transition-colors duration-200 max-w-[100px]
                    ${activeTab === 'preview' 
                      ? 'text-blue-600 dark:text-blue-400 font-semibold' 
                      : 'text-gray-500 dark:text-gray-500 group-hover:text-gray-700 dark:group-hover:text-gray-300'
                    }
                  `}>
                    Preview & Send
                  </span>
                </button>
              </div>
            </div>
          </div>

          <div className="px-6 pb-6">
          {activeTab === 'details' && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <User className="w-4 h-4" aria-hidden="true" />
                  Inviting {selectedCandidates.length} candidate(s)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-h-40 overflow-y-auto no-scrollbar pr-1">
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-2">
                  {selectedCandidates.map((candidate) => (
                    <div key={candidate.id} className="flex items-center gap-2 p-2 border rounded-lg bg-white shadow-sm hover:shadow-md transition-all">
                      <div className={`w-6 h-6 ${accentClasses.bg600} rounded-full flex items-center justify-center text-white text-[11px]`}>
                        {candidate.avatar}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-xs truncate">{candidate.name}</p>
                        <p className="text-[11px] text-gray-400 truncate">{candidate.email}</p>
                        <Badge variant="light" color="primary" size="sm" >
                          {candidate.position}
                        </Badge>
                      </div>
                    </div>
                  ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 gap-3">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2 font-semibold">
                    <Calendar className="w-5 h-5" aria-hidden="true" />
                    Basic Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2.5">
                  <div>
                    <Label htmlFor="select-template">Select Interview Template <span className="text-red-500">*</span></Label>
                    <div className="relative">
                      <select
                        id="select-template"
                        className={`w-full border rounded-full px-4 py-2.5 pr-10 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all duration-200 appearance-none ${
                          validationErrors.template
                            ? 'border-red-500 dark:border-red-500 bg-red-50 dark:bg-red-900/20'
                            : 'border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200'
                        }`}
                        value={invitationData.template || ''}
                        onChange={(e) => {
                          const templateId = e.target.value
                          if (templateId) {
                            handleTemplateSelectFromDropdown(templateId)
                            // Clear validation error
                            setValidationErrors(prev => ({ ...prev, template: "" }))
                          } else {
                            setInvitationData((prev) => ({ ...prev, template: "" }))
                          }
                        }}
                        aria-label="Select Interview Template"
                      >
                        <option value="">Select a template...</option>
                        {FALLBACK_TEMPLATES.map((template) => (
                          <option key={template.id} value={template.id}>
                            {template.name}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500 pointer-events-none" aria-hidden="true" />
                    </div>
                    {validationErrors.template && (
                      <p className="text-xs text-red-500 mt-1">{validationErrors.template}</p>
                    )}
                    {templatesLoading && (
                      <p className="text-xs text-gray-500 mt-1">Loading templates...</p>
                    )}
                    {templatesError && (
                      <p className="text-xs text-red-500 mt-1">Error loading templates: {templatesError}</p>
                    )}
                  </div>

                  <div className="mt-1">
                    <Label htmlFor="meeting-type">Meeting Type <span className="text-red-500">*</span></Label>
                    <div className="relative">
                      <select
                        id="meeting-type"
                        className={`w-full border rounded-full px-4 py-2.5 pr-10 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all duration-200 appearance-none ${
                          validationErrors.meetingType
                            ? 'border-red-500 dark:border-red-500 bg-red-50 dark:bg-red-900/20'
                            : 'border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200'
                        }`}
                        value={invitationData.meetingType}
                        onChange={(e) => {
                          setInvitationData((prev) => ({ ...prev, meetingType: e.target.value }))
                          // Clear validation error
                          setValidationErrors(prev => ({ ...prev, meetingType: "" }))
                        }}
                        aria-label="Meeting type"
                      >
                        <option value="">Select meeting type...</option>
                        <option value="Video Call">Video Call</option>
                        <option value="Phone Call">Phone Call</option>
                        <option value="In-Person">In-Person</option>
                        <option value="Hybrid">Hybrid</option>
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500 pointer-events-none" aria-hidden="true" />
                    </div>
                    {validationErrors.meetingType && (
                      <p className="text-xs text-red-500 mt-1">{validationErrors.meetingType}</p>
                    )}
                  </div>

                  <div className="mt-1">
                    <Label htmlFor="duration">Duration (minutes) <span className="text-red-500">*</span></Label>
                    <div className="relative">
                      <select
                        id="duration"
                        className={`w-full border rounded-full px-4 py-2.5 pr-10 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all duration-200 appearance-none ${
                          validationErrors.duration
                            ? 'border-red-500 dark:border-red-500 bg-red-50 dark:bg-red-900/20'
                            : 'border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200'
                        }`}
                        value={invitationData.duration}
                        onChange={(e) => {
                          setInvitationData((prev) => ({ ...prev, duration: e.target.value }))
                          // Clear validation error
                          setValidationErrors(prev => ({ ...prev, duration: "" }))
                        }}
                        aria-label="Duration"
                      >
                        <option value="">Select duration...</option>
                        <option value="30">30 minutes</option>
                        <option value="45">45 minutes</option>
                        <option value="60">1 hour</option>
                        <option value="90">1.5 hours</option>
                        <option value="120">2 hours</option>
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500 pointer-events-none" aria-hidden="true" />
                    </div>
                    {validationErrors.duration && (
                      <p className="text-xs text-red-500 mt-1">{validationErrors.duration}</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Scheduling Options removed as requested */}
                  </div>

              <Card>
                <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">Interviewers</CardTitle>
                </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label htmlFor="recruiter-name">Recruiter Name</Label>
                  <Input
                    id="recruiter-name"
                    value={invitationData.recruiterName}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInvitationData((prev) => ({ ...prev, recruiterName: e.target.value }))}
                    className="rounded-full mt-1"
                    placeholder={settings?.recruiterName || "Enter recruiter name"}
                  />
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Label htmlFor="interviewers">Interviewer Email</Label>
                    <Input
                      id="interviewers"
                      value={invitationData.interviewers}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInvitationData((prev) => ({ ...prev, interviewers: e.target.value }))}
                      className="rounded-full mt-1"
                      placeholder={settings?.recruiterEmail || "Enter interviewer email"}
                    />
                  </div>
                  <button
                    type="button"
                    className="px-4 py-2 rounded-full text-sm bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 transition-all duration-200 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none font-medium self-end mb-0.5"
                    aria-label="Add interviewer"
                  >
                    Add
                  </button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">Interview Description</CardTitle>
              </CardHeader>
              <CardContent>
              <Textarea
                  rows={2}
                value={invitationData.description}
                onChange={(value: string) => setInvitationData((prev) => ({ ...prev, description: value }))}
                className="text-gray-900 placeholder-gray-500 rounded-2xl"
              />
              </CardContent>
            </Card>
          </div>
          )}

          {activeTab === 'personalization' && (
          <div className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-2">
                  <Mail className="w-4 h-4" aria-hidden="true" />
                  <span>Email Personalization</span>
                  {invitationData.emailTemplateId && (
                    <div className="ml-auto">
                      <Button variant="outline" size="sm" onClick={saveCurrentTemplate}>Save Template</Button>
                    </div>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <Label>Subject</Label>
                    <Input id="subject-input" value={emailSubject} onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      const value = e.target.value
                      setEmailSubject(value)
                      // Also update original template if it contains tokens
                      if (value.includes('{name}') || value.includes('{position}')) {
                        setOriginalEmailSubject(value)
                      }
                    }} placeholder="Interview Invitation - {position} Role" />
                    <div className="flex flex-wrap gap-2 mt-2 text-xs">
                      {['{position}','{name}','{companyName}'].map(t => (
                        <button key={t} className="px-2 py-1 rounded border focus:ring-2 focus:ring-indigo-500" onClick={(e) => { e.preventDefault(); setEmailSubject(s => `${s}${s ? ' ' : ''}${t}`) }}>{`+ ${t}`}</button>
                      ))}
                    </div>
                  </div>
                <div>
                    <Label>Message</Label>
                  <Textarea
                      rows={8} 
                      value={emailBody} 
                      onChange={(v: string) => {
                        setEmailBody(v)
                        // Also update original template if it contains tokens (for multi-candidate support)
                        // If user edits and removes tokens, that's their choice, but we preserve template if tokens exist
                        if (v.includes('{name}') || v.includes('{position}')) {
                          setOriginalEmailBody(v)
                        }
                      }} 
                      placeholder="Write your invitation with tokens like {name}, {position}, {date}, {time}, {duration}, {location}, {meetingLink}, {calendarLink}, {recruiterName}, {recruiterEmail}."
                      className="text-gray-900 placeholder-gray-500"
                    />
                    <div className="flex flex-wrap gap-2 mt-2 text-xs">
                      {[ '{name}','{position}','{date}','{time}','{duration}','{location}','{meetingLink}','{calendarLink}','{recruiterName}','{recruiterEmail}','{recruiterTitle}','{companyName}' ].map(t => (
                        <button key={t} className="px-2 py-1 rounded border focus:ring-2 focus:ring-indigo-500" onClick={(e) => { e.preventDefault(); setEmailBody(m => `${m}${m ? ' ' : ''}${t}`) }}>{`+ ${t}`}</button>
                      ))}
                    </div>
                  </div>
                </div>
                {/* Custom Message removed as requested */}

                <div className={`p-4 ${accentClasses.bg50} rounded-lg border border-gray-200 dark:border-gray-700`}>
                  <h4 className={`font-medium ${accentClasses.text900} mb-3 flex items-center gap-2`}>
                    <User className="w-4 h-4" />
                    Recruiter Information
                  </h4>

                  {/* Current Recruiter Info */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-3 mb-4 border border-gray-200 dark:border-gray-600">
                    <div className="grid grid-cols-1 gap-2 text-sm">
                      <div className="flex justify-between items-center py-1">
                        <span className="font-medium text-gray-600 dark:text-gray-400">Name:</span>
                        <span className={`${accentClasses.text900}`}>{settings?.recruiterName || 'Recruiter'}</span>
                      </div>
                      <div className="flex justify-between items-center py-1">
                        <span className="font-medium text-gray-600 dark:text-gray-400">Email:</span>
                        <span className={`${accentClasses.text900}`}>{settings?.recruiterEmail || '-'}</span>
                      </div>
                      <div className="flex justify-between items-center py-1">
                        <span className="font-medium text-gray-600 dark:text-gray-400">Phone:</span>
                        <span className={`${accentClasses.text900}`}>{settings?.recruiterPhone || '-'}</span>
                      </div>
                      {invitationData.includeCalendarLink && (
                        <div className="flex justify-between items-center py-1">
                          <span className="font-medium text-gray-600 dark:text-gray-400">Calendar:</span>
                          <span className={`${accentClasses.text900} truncate max-w-[200px]`} title={settings?.calendarLink || '-'}>
                            {settings?.calendarLink ? 'Linked' : '-'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Update Calendar Link Section */}
                  <div className="space-y-3">
                    <h5 className={`font-medium ${accentClasses.text900} flex items-center gap-2`}>
                      <ExternalLink className="w-4 h-4" />
                      Update Calendar Link
                    </h5>

                    <div className="space-y-3">
                      <div className="relative">
                        <Input
                          placeholder="https://calendly.com/your-name or https://calendar.google.com/..."
                          value={settings?.calendarLink || ''}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                            const newCalendarLink = e.target.value
                            setSettings(prev => prev ? { ...prev, calendarLink: newCalendarLink } : null)
                          }}
                          className="w-full pr-12 rounded-full border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-200"
                        />
                        {settings?.calendarLink && (
                          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                            <div className="w-2 h-2 bg-green-500 rounded-full" title="Calendar link saved"></div>
                          </div>
                        )}
                      </div>

                      <div className="flex justify-end">
                        <Button
                          onClick={async () => {
                            if (settings?.calendarLink) {
                              try {
                                await saveRecruiterSettings({ calendarLink: settings.calendarLink })
                                showAlert('success', 'Saved', 'Calendar link updated successfully!')
                              } catch {
                                showAlert('error', 'Failed', 'Failed to save calendar link. Please try again.')
                              }
                            }
                          }}
                          disabled={!settings?.calendarLink?.trim()}
                          className={`px-6 py-2 rounded-full font-medium transition-all duration-200 ${
                            settings?.calendarLink?.trim()
                              ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md'
                              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          }`}
                        >
                          <Check className="w-4 h-4 mr-2" />
                          Save Link
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          )}

          {activeTab === 'preview' && (
          <div className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ExternalLink className="w-4 h-4" aria-hidden="true" />
                  Personalized Interview Links & Email Previews
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {selectedCandidates.map((candidate) => (
                    <div key={candidate.id} className="border rounded-lg p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`w-8 h-8 ${accentClasses.bg600} rounded-full flex items-center justify-center text-white text-xs`}>
                          {candidate.avatar}
                        </div>
                        <div>
                          <p className="font-medium">{candidate.name}</p>
                          <p className="text-sm text-gray-500">{candidate.email}</p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <Label className="text-xs text-gray-500">Email Preview:</Label>
                          <div
                            className="bg-white border rounded-lg p-4 mt-1 text-xs max-h-60 overflow-y-auto"
                            dangerouslySetInnerHTML={{
                              __html: emailPreviews[candidate.id] ||
                                generateEmailPreview(candidate, generatedLinks[candidate.id])
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
          )}
          </div>

          {/* Sticky Footer Navigation */}
          <div className="sticky bottom-0 border-t bg-white dark:bg-gray-900 px-6 py-4 rounded-b-2xl shadow-lg">
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-500">
                <span>
                  ✅ {selectedCandidates.length} candidate{selectedCandidates.length > 1 ? "s" : ""} selected for invitation
                </span>
              </div>

              <div className="flex gap-3">
                {/* Step-specific navigation buttons */}
                {activeTab === 'details' && (
                  <>
                    {/* Cancel button */}
                    <button
                      onClick={() => onOpenChange(false)}
                      className="px-6 py-2.5 rounded-full text-sm bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 transition-all duration-200 focus:ring-2 focus:ring-gray-500 focus:outline-none font-medium"
                      type="button"
                      aria-label="Cancel invitation"
                    >
                      Cancel
                    </button>

                    {/* Continue to Personalization */}
                    <button
                      onClick={handleContinueToPersonalization}
                      className={`px-6 py-2.5 rounded-full text-sm ${accentClasses.bg600} ${accentClasses.hoverBg700} text-white transition-all duration-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none font-medium shadow-sm hover:shadow-md flex items-center gap-2`}
                      type="button"
                      aria-label="Continue to personalization"
                    >
                      Continue
                      <ChevronDown className="w-4 h-4 rotate-[-90deg]" />
                    </button>
                  </>
                )}

                {activeTab === 'personalization' && (
                  <>
                    {/* Back to Details */}
                    <button
                      onClick={handleBackToDetails}
                      className="px-6 py-2.5 rounded-full text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-200 focus:ring-2 focus:ring-gray-500 focus:outline-none font-medium flex items-center gap-2"
                      type="button"
                      aria-label="Back to interview details"
                    >
                      <ChevronDown className="w-4 h-4 rotate-90" />
                      Back
                    </button>

                    {/* Continue to Preview */}
                    <button
                      onClick={handleContinueToPreview}
                      className={`px-6 py-2.5 rounded-full text-sm ${accentClasses.bg600} ${accentClasses.hoverBg700} text-white transition-all duration-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none font-medium shadow-sm hover:shadow-md flex items-center gap-2`}
                      type="button"
                      aria-label="Continue to preview"
                    >
                      Continue
                      <ChevronDown className="w-4 h-4 rotate-[-90deg]" />
                    </button>
                  </>
                )}

                {activeTab === 'preview' && (
                  <>
                    {/* Back to Personalization */}
                    <button
                      onClick={handleBackToPersonalization}
                      className="px-6 py-2.5 rounded-full text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-200 focus:ring-2 focus:ring-gray-500 focus:outline-none font-medium flex items-center gap-2"
                      type="button"
                      aria-label="Back to personalization"
                    >
                      <ChevronDown className="w-4 h-4 rotate-90" />
                      Back
                    </button>

                    {/* Send Invitation */}
                    <div
                      onClick={handleSubmitClick}
                      className="inline-block"
                      title={!isFormValid() ? "Click to see validation errors" : ""}
                    >
                      <button
                        className={`px-6 py-2.5 rounded-full text-sm transition-all duration-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none font-medium shadow-sm hover:shadow-md flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                          !isFormValid()
                            ? 'bg-gray-400 hover:bg-gray-500 text-gray-200 cursor-pointer border border-gray-300'
                            : `${accentClasses.bg600} ${accentClasses.hoverBg700} text-white`
                        }`}
                        disabled={isSending}
                        type="button"
                        aria-label={`Send ${selectedCandidates.length} invitation${selectedCandidates.length > 1 ? 's' : ''}`}
                      >
                        <Send className="w-4 h-4" aria-hidden="true" />
                        {isSending ? 'Sending…' : !isFormValid() ? 'Complete Required Fields' : `Send ${selectedCandidates.length} Invitation${selectedCandidates.length > 1 ? 's' : ''}`}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
      </div>
      </div>
    
    {/* Toast Notification */}
    {alert.show && (
      <div className={`fixed top-4 right-4 z-50 transition-all duration-300 ease-in-out ${
        alert.show ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full'
      }`}>
        <div className={`flex items-center gap-3 p-4 rounded-lg shadow-lg border max-w-sm backdrop-blur-sm ${
          alert.variant === 'success' ? 'bg-green-50/95 border-green-200 dark:bg-green-900/30 dark:border-green-800' :
          alert.variant === 'error' ? 'bg-red-50/95 border-red-200 dark:bg-red-900/30 dark:border-red-800' :
          alert.variant === 'warning' ? 'bg-yellow-50/95 border-yellow-200 dark:bg-yellow-900/30 dark:border-yellow-800' :
          'bg-blue-50/95 border-blue-200 dark:bg-blue-900/30 dark:border-blue-800'
        }`}>
          <div className="flex-shrink-0">
            {alert.variant === 'success' && <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />}
            {alert.variant === 'error' && <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />}
            {alert.variant === 'warning' && <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />}
            {alert.variant === 'info' && <Info className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-medium ${
              alert.variant === 'success' ? 'text-green-800 dark:text-green-200' :
              alert.variant === 'error' ? 'text-red-800 dark:text-red-200' :
              alert.variant === 'warning' ? 'text-yellow-800 dark:text-yellow-200' :
              'text-blue-800 dark:text-blue-200'
            }`}>
              {alert.title}
            </p>
            <p className={`text-sm ${
              alert.variant === 'success' ? 'text-green-700 dark:text-green-300' :
              alert.variant === 'error' ? 'text-red-700 dark:text-red-300' :
              alert.variant === 'warning' ? 'text-yellow-700 dark:text-yellow-300' :
              'text-blue-700 dark:text-blue-300'
            }`}>
              {alert.message}
            </p>
          </div>
          <button
            onClick={() => setAlert(prev => ({ ...prev, show: false }))}
            className={`flex-shrink-0 p-1 rounded-md ${
              alert.variant === 'success' ? 'hover:bg-green-100 dark:hover:bg-green-800' :
              alert.variant === 'error' ? 'hover:bg-red-100 dark:hover:bg-red-800' :
              alert.variant === 'warning' ? 'hover:bg-yellow-100 dark:hover:bg-yellow-800' :
              'hover:bg-blue-100 dark:hover:bg-blue-800'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    )}
    </>
  )
}
