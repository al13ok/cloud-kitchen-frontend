"use client"

import { useState } from "react"
import type { ChangeEvent } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Label from "@/components/form/Label"
import Badge from "@/components/ui/badge/Badge"
import { Save, Shield, Database, Globe, CheckCircle2, XCircle, Briefcase, Edit, Settings } from "lucide-react"
import { API_CONFIG, buildApiUrl } from '@/config/api'
import { JobSettingsManagement } from "./job-settings-management"
import { JobCustomize } from "./job-customize"

// Local Tabs implementation aligned with page.tsx
import React, { useContext, createContext } from "react"
const TabsContext = createContext<{ activeTab: string; setActiveTab: (tab: string) => void } | null>(null)
const Tabs: React.FC<{ defaultValue: string; className?: string; children: React.ReactNode }> = ({ defaultValue, className, children }) => {
  const [activeTab, setActiveTab] = useState(defaultValue)
  return (
    <div className={className}>
      <TabsContext.Provider value={{ activeTab, setActiveTab }}>
        {children}
      </TabsContext.Provider>
    </div>
  )
}
const TabsList: React.FC<{ className?: string; children: React.ReactNode }> = ({ className, children }) => (
  <div className={`${className} flex flex-wrap gap-1 sm:gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg overflow-x-auto`}>{children}</div>
)
const TabsTrigger: React.FC<{ value: string; className?: string; children: React.ReactNode }> = ({ value, className, children }) => {
  const ctx = useContext(TabsContext)
  const isActive = ctx?.activeTab === value
  return (
    <button 
      type="button" 
      onClick={() => ctx?.setActiveTab(value)} 
      data-state={isActive ? "active" : "inactive"}
      className={`${className} ${
        isActive
          ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
          : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
      } transition-all duration-200 whitespace-nowrap min-w-0 flex-shrink-0`}
    >
      {children}
    </button>
  )
}
const TabsContent: React.FC<{ value: string; className?: string; children: React.ReactNode }> = ({ value, className, children }) => {
  const ctx = useContext(TabsContext)
  if (ctx?.activeTab !== value) return null
  return <div className={className}>{children}</div>
}

// Simple separator replacement
const Separator: React.FC = () => <div className="h-px bg-gray-200 dark:bg-gray-700" />

export function SettingsManagement() {
  const [settings, setSettings] = useState({
    // Recruiter Profile (merged)
    recruiterName: "Sarah Johnson",
    recruiterEmail: "sarah.johnson@company.com",
    recruiterPhone: "+1 (555) 123-4567",
    calendarLink: "https://calendly.com/sarah-johnson",
    emailSignature: `Best regards,\nSarah Johnson\nSenior Recruiter\nRecruitment Center\nsarah.johnson@company.com\n+1 (555) 123-4567`,

    // Notification Settings
    emailNotifications: true,
    browserNotifications: true,
    slackIntegration: false,
    notifyOnApplication: true,
    notifyOnStatusChange: true,
    notifyOnInterview: true,
    interviewReminderLeadTime: "1-hour",
    followUpReminder: "3-days",

    // Workflow Settings
    autoScreening: true,
    aiScoring: true,
    requireApproval: false,
    autoReject: false,
    interviewReminders: true,

    // Privacy Settings
    dataRetention: "2-years",
    anonymizeData: true,
    gdprCompliance: true,

    // Integration Settings
    linkedinIntegration: true,
    indeedIntegration: false,
    googleCalendar: true,

    // Appearance
    theme: "light",
    primaryColor: "#3B82F6",
    companyLogo: "",
  })

  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<null | { ok: boolean; message: string }>(null)

  // Validation error states
  const [errors, setErrors] = useState<{
    recruiterName?: string
    recruiterEmail?: string
    recruiterPhone?: string
    calendarLink?: string
    emailSignature?: string
  }>({})

  // Load recruiter settings from backend
  React.useEffect(() => {
    const loadSettings = async () => {
      try {
        setIsLoading(true)
        const res = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.HR_RECRUITER_SETTINGS), { cache: 'no-store' })
        if (!res.ok) return
        const data = await res.json()
        setSettings(prev => ({
          ...prev,
          recruiterName: data.recruiterName ?? prev.recruiterName,
          recruiterEmail: data.recruiterEmail ?? prev.recruiterEmail,
          recruiterPhone: data.recruiterPhone ?? prev.recruiterPhone,
          calendarLink: data.calendarLink ?? prev.calendarLink,
          emailSignature: data.emailSignature ?? prev.emailSignature,
          interviewReminderLeadTime: data.interviewReminderLeadTime ?? prev.interviewReminderLeadTime,
          followUpReminder: data.followUpReminder ?? prev.followUpReminder,
        }))
      } catch (e) {
        console.error('Failed to load recruiter settings', e)
      } finally {
        setIsLoading(false)
      }
    }
    loadSettings()
  }, [])

  const handleSave = async () => {
    // Validate all fields before saving
    if (!validateAllFields()) {
      setSaveStatus({ ok: false, message: 'Please fix validation errors before saving' })
      return
    }

    try {
      setIsSaving(true)
      setSaveStatus(null)
      const payload = {
        recruiterName: settings.recruiterName,
        recruiterEmail: settings.recruiterEmail,
        recruiterPhone: settings.recruiterPhone,
        calendarLink: settings.calendarLink,
        emailSignature: settings.emailSignature,
        interviewReminderLeadTime: settings.interviewReminderLeadTime,
        followUpReminder: settings.followUpReminder,
      }
      const res = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.HR_RECRUITER_SETTINGS), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const text = await res.text()
      const data = (() => { try { return JSON.parse(text) } catch { return {} as Record<string, unknown> } })()
      if (!res.ok) {
        setSaveStatus({ ok: false, message: data?.message || `Save failed (${res.status})` })
        console.error('Failed to save recruiter settings', text)
        return
      }
      setSaveStatus({ ok: true, message: data?.message || 'Saved' })
      // Refresh from backend to ensure UI reflects persisted data
      try {
        const getRes = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.HR_RECRUITER_SETTINGS), { cache: 'no-store' })
        if (getRes.ok) {
          const latest = await getRes.json()
          setSettings(prev => ({
            ...prev,
            recruiterName: latest.recruiterName ?? prev.recruiterName,
            recruiterEmail: latest.recruiterEmail ?? prev.recruiterEmail,
            recruiterPhone: latest.recruiterPhone ?? prev.recruiterPhone,
            calendarLink: latest.calendarLink ?? prev.calendarLink,
            emailSignature: latest.emailSignature ?? prev.emailSignature,
            interviewReminderLeadTime: latest.interviewReminderLeadTime ?? prev.interviewReminderLeadTime,
            followUpReminder: latest.followUpReminder ?? prev.followUpReminder,
          }))
        }
      } catch {}
    } catch (e) {
      console.error('Failed to save recruiter settings', e)
      setSaveStatus({ ok: false, message: 'Network error' })
    } finally {
      setIsSaving(false)
    }
  }

  const updateSetting = (key: string, value: string | number | boolean) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
    // Clear error when user starts typing
    if (errors[key as keyof typeof errors]) {
      setErrors((prev) => ({ ...prev, [key]: undefined }))
    }
  }

  const validateField = (key: string, value: string): string | undefined => {
    switch (key) {
      case 'recruiterName':
        if (!value.trim()) return 'Full name is required'
        if (value.trim().length < 2) return 'Minimum 2 characters required'
        if (value.trim().length > 100) return 'Maximum 100 characters allowed'
        return undefined
      case 'recruiterEmail':
        if (!value.trim()) return 'Email address is required'
        if (value.trim().length < 5) return 'Minimum 5 characters required'
        if (value.trim().length > 254) return 'Maximum 254 characters allowed'
        if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(value.trim())) return 'Invalid email address format'
        return undefined
      case 'recruiterPhone':
        if (!value.trim()) return 'Phone number is required'
        // Allow various phone formats (with +, -, spaces, parentheses)
        const phoneRegex = /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$/
        if (!phoneRegex.test(value.trim())) return 'Invalid phone number format'
        if (value.trim().length < 7) return 'Minimum 7 characters required'
        if (value.trim().length > 20) return 'Maximum 20 characters allowed'
        return undefined
      case 'calendarLink':
        if (!value.trim()) return 'Calendar booking link is required'
        if (value.trim().length < 10) return 'Minimum 10 characters required'
        try {
          new URL(value.trim())
        } catch {
          return 'Invalid URL format'
        }
        if (value.trim().length > 500) return 'Maximum 500 characters allowed'
        return undefined
      case 'emailSignature':
        if (!value.trim()) return 'Email signature is required'
        if (value.trim().length < 5) return 'Minimum 5 characters required'
        if (value.trim().length > 1000) return 'Maximum 1000 characters allowed'
        return undefined
      default:
        return undefined
    }
  }

  const validateAllFields = (): boolean => {
    const newErrors: typeof errors = {}
    let isValid = true

    const fieldsToValidate = [
      'recruiterName',
      'recruiterEmail',
      'recruiterPhone',
      'calendarLink',
      'emailSignature'
    ] as const

    fieldsToValidate.forEach((key) => {
      const error = validateField(key, String(settings[key]))
      if (error) {
        newErrors[key] = error
        isValid = false
      }
    })

    setErrors(newErrors)
    return isValid
  }

  return (
    <div className="px-6 md:px-10 py-6 md:py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">Settings</h1>
          <p className="text-sm md:text-base text-gray-600 dark:text-gray-300 mt-2">Configure your recruitment system preferences</p>
        </div>
        <button 
          onClick={handleSave} 
          disabled={isSaving || isLoading}
          type="button"
          className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-600 hover:from-blue-700 hover:to-blue-700 text-white font-semibold rounded-xl transition-all duration-300 focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-105 disabled:transform-none disabled:hover:scale-100 flex items-center justify-center gap-2 text-sm whitespace-nowrap"
        >
          <Save className="h-4 w-4" aria-hidden="true" />
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
      {saveStatus && (
        <div className={`p-4 rounded-lg border ${saveStatus.ok ? 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800'}`}>
          <div className="flex items-center gap-2">
            {saveStatus.ok ? <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" /> : <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />}
            <span className={`text-sm font-medium ${saveStatus.ok ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'}`}>
              {saveStatus.message}
            </span>
          </div>
        </div>
      )}

      <Tabs defaultValue="general" className="space-y-8">
        <div className="bg-white dark:bg-[#111111] rounded-3xl shadow-xl border border-gray-200 dark:border-gray-800 p-2">
          <TabsList className="flex flex-wrap sm:grid sm:grid-cols-4 w-full bg-gray-50 dark:bg-[#1A1A1A] rounded-2xl min-h-[44px] sm:h-12 lg:h-14 p-1 gap-1">
            <TabsTrigger 
              value="general" 
              className="flex-1 sm:flex-none data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 data-[state=active]:shadow-sm rounded-lg transition-all duration-200 font-medium text-xs sm:text-sm min-w-[80px] px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <div className="flex items-center gap-2 justify-center">
                <Globe className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                <span className="text-xs sm:text-sm whitespace-nowrap">General</span>
              </div>
            </TabsTrigger>
            
            <TabsTrigger 
              value="privacy" 
              className="flex-1 sm:flex-none data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 data-[state=active]:shadow-sm rounded-lg transition-all duration-200 font-medium text-xs sm:text-sm min-w-[80px] px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <div className="flex items-center gap-2 justify-center">
                <Shield className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                <span className="text-xs sm:text-sm whitespace-nowrap">Privacy</span>
              </div>
            </TabsTrigger>
            <TabsTrigger 
              value="integrations" 
              className="flex-1 sm:flex-none data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 data-[state=active]:shadow-sm rounded-lg transition-all duration-200 font-medium text-xs sm:text-sm min-w-[80px] px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <div className="flex items-center gap-2 justify-center">
                <Database className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                <span className="text-xs sm:text-sm whitespace-nowrap">Integrations</span>
              </div>
            </TabsTrigger>
            <TabsTrigger 
              value="job-settings" 
              className="flex-1 sm:flex-none data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 data-[state=active]:shadow-sm rounded-lg transition-all duration-200 font-medium text-xs sm:text-sm min-w-[80px] px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <div className="flex items-center gap-2 justify-center">
                <Briefcase className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                <span className="text-xs sm:text-sm whitespace-nowrap">Job Settings</span>
              </div>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="general" className="space-y-8">
          {/* Recruiter Profile */}
          <Card className="bg-white dark:bg-[#111111] rounded-3xl border border-gray-200 dark:border-gray-800 shadow-xl">
            <CardHeader className="p-6 md:p-8">
              <CardTitle className="text-lg font-medium text-gray-800 dark:text-gray-200">Recruiter Profile</CardTitle>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">Your personal recruiter information</p>
            </CardHeader>
            <CardContent className="space-y-4 p-6 md:p-8 pt-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="recruiterName">Full Name</Label>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {settings.recruiterName.length}/100
                    </span>
                  </div>
                  <input
                    id="recruiterName"
                    type="text"
                    value={settings.recruiterName}
                    maxLength={100}
                    minLength={2}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => {
                      updateSetting("recruiterName", e.target.value)
                      const error = validateField("recruiterName", e.target.value)
                      setErrors((prev) => ({ ...prev, recruiterName: error }))
                    }}
                    onBlur={(e: ChangeEvent<HTMLInputElement>) => {
                      const error = validateField("recruiterName", e.target.value)
                      setErrors((prev) => ({ ...prev, recruiterName: error }))
                    }}
                    className={`h-11 w-full rounded-xl border px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-400 transition-all duration-200 dark:bg-gray-700 dark:text-gray-200 ${
                      errors.recruiterName 
                        ? 'border-red-500 focus:border-red-500' 
                        : 'border-gray-300 dark:border-gray-600'
                    }`}
                    placeholder="Enter your full name (2-100 characters)"
                  />
                  {errors.recruiterName && (
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1 px-1">
                      {errors.recruiterName}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="recruiterEmail">Email Address</Label>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {settings.recruiterEmail.length}/254
                    </span>
                  </div>
                  <input
                    id="recruiterEmail"
                    type="email"
                    value={settings.recruiterEmail}
                    maxLength={254}
                    minLength={5}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => {
                      updateSetting("recruiterEmail", e.target.value)
                      const error = validateField("recruiterEmail", e.target.value)
                      setErrors((prev) => ({ ...prev, recruiterEmail: error }))
                    }}
                    onBlur={(e: ChangeEvent<HTMLInputElement>) => {
                      const error = validateField("recruiterEmail", e.target.value)
                      setErrors((prev) => ({ ...prev, recruiterEmail: error }))
                    }}
                    className={`h-11 w-full rounded-xl border px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-400 transition-all duration-200 dark:bg-gray-700 dark:text-gray-200 ${
                      errors.recruiterEmail 
                        ? 'border-red-500 focus:border-red-500' 
                        : 'border-gray-300 dark:border-gray-600'
                    }`}
                    placeholder="Enter your email address (5-254 characters)"
                  />
                  {errors.recruiterEmail && (
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1 px-1">
                      {errors.recruiterEmail}
                    </p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="recruiterPhone">Phone Number</Label>
                  <input
                    id="recruiterPhone"
                    type="tel"
                    value={settings.recruiterPhone}
                    maxLength={20}
                    minLength={7}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => {
                      updateSetting("recruiterPhone", e.target.value)
                      const error = validateField("recruiterPhone", e.target.value)
                      setErrors((prev) => ({ ...prev, recruiterPhone: error }))
                    }}
                    onBlur={(e: ChangeEvent<HTMLInputElement>) => {
                      const error = validateField("recruiterPhone", e.target.value)
                      setErrors((prev) => ({ ...prev, recruiterPhone: error }))
                    }}
                    className={`h-11 w-full rounded-xl border px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-400 transition-all duration-200 dark:bg-gray-700 dark:text-gray-200 ${
                      errors.recruiterPhone 
                        ? 'border-red-500 focus:border-red-500' 
                        : 'border-gray-300 dark:border-gray-600'
                    }`}
                  />
                  {errors.recruiterPhone && (
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1 px-1">
                      {errors.recruiterPhone}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="calendarLink">Calendar Booking Link</Label>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {settings.calendarLink.length}/500
                    </span>
                  </div>
                  <input
                    id="calendarLink"
                    type="url"
                    value={settings.calendarLink}
                    maxLength={500}
                    minLength={10}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => {
                      updateSetting("calendarLink", e.target.value)
                      const error = validateField("calendarLink", e.target.value)
                      setErrors((prev) => ({ ...prev, calendarLink: error }))
                    }}
                    onBlur={(e: ChangeEvent<HTMLInputElement>) => {
                      const error = validateField("calendarLink", e.target.value)
                      setErrors((prev) => ({ ...prev, calendarLink: error }))
                    }}
                    className={`h-11 w-full rounded-xl border px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-400 transition-all duration-200 dark:bg-gray-700 dark:text-gray-200 ${
                      errors.calendarLink 
                        ? 'border-red-500 focus:border-red-500' 
                        : 'border-gray-300 dark:border-gray-600'
                    }`}
                    placeholder="Enter calendar booking link (10-500 characters)"
                  />
                  {errors.calendarLink && (
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1 px-1">
                      {errors.calendarLink}
                    </p>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="emailSignature">Email Signature</Label>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {settings.emailSignature.length}/1000
                  </span>
                </div>
                <textarea
                  id="emailSignature"
                  rows={6}
                  value={settings.emailSignature}
                  maxLength={1000}
                  minLength={5}
                  onChange={(e: ChangeEvent<HTMLTextAreaElement>) => {
                    updateSetting("emailSignature", e.target.value)
                    const error = validateField("emailSignature", e.target.value)
                    setErrors((prev) => ({ ...prev, emailSignature: error }))
                  }}
                  onBlur={(e: ChangeEvent<HTMLTextAreaElement>) => {
                    const error = validateField("emailSignature", e.target.value)
                    setErrors((prev) => ({ ...prev, emailSignature: error }))
                  }}
                  className={`w-full rounded-2xl border px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-400 transition-all duration-200 dark:bg-gray-700 dark:text-gray-200 resize-y ${
                    errors.emailSignature 
                      ? 'border-red-500 focus:border-red-500' 
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                  placeholder="Enter your email signature (5-1000 characters)"
                />
                {errors.emailSignature && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1 px-1">
                    {errors.emailSignature}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        

        <TabsContent value="privacy" className="space-y-8">
          <Card className="bg-white dark:bg-[#111111] rounded-3xl border border-gray-200 dark:border-gray-800 shadow-xl">
            <CardHeader className="p-6 md:p-8">
              <CardTitle className="text-lg font-medium text-gray-800 dark:text-gray-200">Privacy & Compliance</CardTitle>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">Data protection and compliance settings</p>
            </CardHeader>
            <CardContent className="space-y-6 p-6 md:p-8 pt-0">
              <div className="space-y-2">
                <Label>Data Retention Period</Label>
                <select
                  className="h-11 w-full rounded-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-400 transition-all duration-200 appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27currentColor%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3e%3cpolyline points=%276 9 12 15 18 9%27%3e%3c/polyline%3e%3c/svg%3e')] bg-[length:16px_16px] bg-[right_12px_center] bg-no-repeat pr-10"
                  value={settings.dataRetention}
                  onChange={(e) => updateSetting("dataRetention", e.target.value)}
                >
                  <option value="6-months">6 Months</option>
                  <option value="1-year">1 Year</option>
                  <option value="2-years">2 Years</option>
                  <option value="5-years">5 Years</option>
                  <option value="indefinite">Indefinite</option>
                </select>
              </div>

              <Separator />

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0">
                <div className="space-y-0.5">
                  <Label>Anonymize Data</Label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Remove personal identifiers from old records</p>
                </div>
                <input type="checkbox" checked={settings.anonymizeData} onChange={(e) => updateSetting("anonymizeData", e.target.checked)} className="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 dark:bg-gray-700" />
              </div>

              <Separator />

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0">
                <div className="space-y-0.5">
                  <Label>GDPR Compliance</Label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Enable GDPR compliance features</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="light" color="success">Required</Badge>
                  <input type="checkbox" checked={settings.gdprCompliance} onChange={(e) => updateSetting("gdprCompliance", e.target.checked)} className="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 dark:bg-gray-700" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations" className="space-y-8">
          <Card className="bg-white dark:bg-[#111111] rounded-3xl border border-gray-200 dark:border-gray-800 shadow-xl">
            <CardHeader className="p-6 md:p-8">
              <CardTitle className="text-lg font-medium text-gray-800 dark:text-gray-200">Third-party Integrations</CardTitle>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">Connect with external services and platforms</p>
            </CardHeader>
            <CardContent className="space-y-6 p-6 md:p-8 pt-0">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0">
                <div className="space-y-0.5">
                  <Label>LinkedIn Integration</Label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Post jobs and import candidate profiles</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="light" color="success">Connected</Badge>
                  <input type="checkbox" checked={settings.linkedinIntegration} onChange={(e) => updateSetting("linkedinIntegration", e.target.checked)} className="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 dark:bg-gray-700" />
                </div>
              </div>

              <Separator />

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0">
                <div className="space-y-0.5">
                  <Label>Indeed Integration</Label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Sync job postings with Indeed</p>
                </div>
                <input type="checkbox" checked={settings.indeedIntegration} onChange={(e) => updateSetting("indeedIntegration", e.target.checked)} className="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 dark:bg-gray-700" />
              </div>

              <Separator />

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0">
                <div className="space-y-0.5">
                  <Label>Google Calendar</Label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Schedule interviews and sync events</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="light" color="success">Connected</Badge>
                  <input type="checkbox" checked={settings.googleCalendar} onChange={(e) => updateSetting("googleCalendar", e.target.checked)} className="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 dark:bg-gray-700" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="job-settings" className="space-y-4">
          <Tabs defaultValue="job-config" className="space-y-6">
            <TabsList className="w-full bg-gray-100 dark:bg-gray-800 p-1.5 rounded-lg overflow-x-auto border border-gray-200 dark:border-gray-700">
              <TabsTrigger 
                value="job-config" 
                className="flex-1 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 data-[state=active]:shadow-sm data-[state=active]:border-b-2 data-[state=active]:border-blue-600 dark:data-[state=active]:border-blue-400 rounded-md transition-all duration-200 font-medium text-sm px-6 py-3 whitespace-nowrap min-w-0 flex-shrink-0 data-[state=inactive]:text-gray-600 dark:data-[state=inactive]:text-gray-300 data-[state=inactive]:hover:text-gray-900 dark:data-[state=inactive]:hover:text-gray-100 data-[state=inactive]:hover:bg-gray-50 dark:data-[state=inactive]:hover:bg-gray-750 flex items-center justify-center gap-2"
              >
                <Settings className="w-4 h-4" />
                Job Setting
              </TabsTrigger>
              <TabsTrigger 
                value="job-customize" 
                className="flex-1 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 data-[state=active]:shadow-sm data-[state=active]:border-b-2 data-[state=active]:border-blue-600 dark:data-[state=active]:border-blue-400 rounded-md transition-all duration-200 font-medium text-sm px-6 py-3 whitespace-nowrap min-w-0 flex-shrink-0 data-[state=inactive]:text-gray-600 dark:data-[state=inactive]:text-gray-300 data-[state=inactive]:hover:text-gray-900 dark:data-[state=inactive]:hover:text-gray-100 data-[state=inactive]:hover:bg-gray-50 dark:data-[state=inactive]:hover:bg-gray-750 flex items-center justify-center gap-2"
              >
                <Edit className="w-4 h-4" />
                Customize Job Form
              </TabsTrigger>
            </TabsList>

            <TabsContent value="job-config">
              <JobSettingsManagement />
            </TabsContent>

            <TabsContent value="job-customize">
              <JobCustomize />
            </TabsContent>
          </Tabs>
        </TabsContent>

        
      </Tabs>
    </div>
  )
}

