"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { motion } from "framer-motion"
import Button from "@/components/ui/button/Button"
import Label from "@/components/form/Label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Badge from "@/components/ui/badge/Badge"
import Avatar from "@/components/ui/avatar/Avatar"
import { BACKEND_URL } from "@/utils/api"
import Link from "next/link"
import Image from "next/image"
import { getCurrentVersion } from "@/utils/version"
import { useAuth } from "@/hooks/useAuth"
const APP_VERSION = getCurrentVersion().version
import {
  User,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Building,
  Calendar,
  Clock,
  Zap,
  PieChart,
  Camera,
  Home,
} from "lucide-react"

// Simple Separator component
const Separator = () => <div className="h-px bg-gray-200 dark:bg-gray-700" />

interface UserProfile {
  id?: string
  firstName: string
  lastName: string
  email: string
  phone: string
  position: string
  department: string
  location: string
  bio: string
  avatar?: string
  dateJoined?: string
  lastLogin?: string
  isActive: boolean
  website?: string
  instagram?: string
  timezone?: string
  language?: string
  theme?: string
  background?: string
}

export default function ProfilePage() {
  const { user, getToken } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const backgroundInputRef = useRef<HTMLInputElement>(null)

  const [profile, setProfile] = useState<UserProfile>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    position: "",
    department: "",
    location: "",
    bio: "",
    isActive: false,
    website: "",
    instagram: "",
    timezone: "",
    language: "",
    theme: "system",
    dateJoined: undefined,
    lastLogin: undefined,
  })

  // UI state
  const [error, setError] = useState("")
  const [avatarPreview, setAvatarPreview] = useState<string>("")
  const [backgroundPreview, setBackgroundPreview] = useState<string>("")
  

  // types for external users api
  type ExternalUser = {
    id: string
    fullName: string
    email: string
    mobile: string
    userRoles?: string
    loginFlag?: string
    status?: boolean
    presence?: string
    lastLogin?: string
    createdAt?: string
  }

  // Load current logged-in user's info
  useEffect(() => {
    let isMounted = true
    const loadCurrentUser = async () => {
      // Prefill from auth state immediately
      if (isMounted && user) {
        const [first, ...rest] = (user.full_name || "").trim().split(" ")
        setProfile((prev) => ({
          ...prev,
          firstName: first || prev.firstName,
          lastName: rest.join(" ") || prev.lastName,
          email: user.email || prev.email,
          position: prev.position,
          department: user.login_flag || prev.department,
        }))
      }
      // Try enrich from users directory by email
      try {
        const res = await fetch(`${BACKEND_URL}/api/v1/users`, {
          headers: { accept: "application/json" },
          cache: "no-store",
        })
        if (!res.ok) return
        const data: ExternalUser[] = await res.json()
        const me = data.find((u) => (user?.email && u.email?.toLowerCase() === user.email.toLowerCase()))
        if (me && isMounted) {
          const [first, ...rest] = (me.fullName || user?.full_name || "").trim().split(" ")
          setProfile((prev) => ({
            ...prev,
            firstName: first || prev.firstName,
            lastName: rest.join(" ") || prev.lastName,
            email: me.email || prev.email,
            phone: me.mobile || prev.phone,
            position: me.userRoles || prev.position,
            department: me.loginFlag || prev.department,
            isActive: !!me.status,
            dateJoined: me.createdAt || prev.dateJoined,
            lastLogin: me.lastLogin || prev.lastLogin,
          }))
        }
      } catch {}
    }

    // Load saved social links
    const loadSocialLinks = async () => {
      try {
        const token = getToken()
        const headers: HeadersInit = { accept: "application/json" }
        if (token) headers["Authorization"] = `Bearer ${token}`
        if (user?.user_id) headers["X-User-Id"] = user.user_id
        if (user?.email) headers["X-User-Email"] = user.email
        const res = await fetch(`${BACKEND_URL}/profile/social-links`, {
          headers,
        })
        if (!res.ok) return
        const data = await res.json()
        if (isMounted && data) {
          setProfile((prev) => ({
            ...prev,
            position: data.position ?? prev.position,
            instagram: data.instagram ?? prev.instagram,
            website: data.website ?? prev.website,
          }))
        }
      } catch {}
    }

    loadCurrentUser()
    loadSocialLinks()
    return () => { isMounted = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const validTypes = ["image/jpeg", "image/jpg", "image/png"]
      if (!validTypes.includes(file.type)) {
        setError("Please select a valid image file (JPG, JPEG, or PNG)")
        return
      }

      if (file.size > 5 * 1024 * 1024) {
        setError("Avatar file size must be less than 5MB")
        return
      }

      const reader = new FileReader()
      reader.onload = (e) => {
        setAvatarPreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleBackgroundChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const validTypes = ["image/jpeg", "image/jpg", "image/png"]
      if (!validTypes.includes(file.type)) {
        setError("Please select a valid image file (JPG, JPEG, or PNG)")
        return
      }

      if (file.size > 10 * 1024 * 1024) {
        setError("Background image file size must be less than 10MB")
        return
      }

      const reader = new FileReader()
      reader.onload = (e) => {
        setBackgroundPreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleBackgroundContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement
    if (target.closest('a')) return
    backgroundInputRef.current?.click()
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Not available"
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    } catch {
      return "Invalid date"
    }
  }

  

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Background Header */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} className="relative h-64 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 overflow-hidden" onClick={handleBackgroundContainerClick}>
        {/* Top-left Home button */}
        <Link href="/" className="absolute top-3 left-3 z-20">
          <Button
            variant="outline"
            size="sm"
            className="bg-white/20 hover:bg-white/30 text-white border-white/30 backdrop-blur px-3"
          >
            <Home className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Home</span>
          </Button>
        </Link>
        {backgroundPreview && (
          <Image
            src={backgroundPreview || "/placeholder.svg"}
            alt="Background"
            fill
            sizes="100vw"
            className="absolute inset-0 object-cover"
            priority
          />
        )}
        <div className="absolute inset-0 bg-black/20" />

        

        <input
          ref={backgroundInputRef}
          type="file"
          accept="image/*"
          onChange={handleBackgroundChange}
          className="hidden"
        />
      </motion.div>

      <div className="container mx-auto px-4 -mt-32 relative z-10">
        <div className="max-w-4xl mx-auto">
          {/* Profile Header Card */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
            <Card className="mb-8 shadow-xl border-0 backdrop-blur-sm transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-2xl bg-gradient-to-r from-indigo-50 via-purple-50 to-indigo-50 dark:from-white/10 dark:via-white/5 dark:to-white/10">
              <CardContent className="pt-8">
              <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                {/* Avatar Section */}
                <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                  <div className="w-32 h-32 border-4 border-white shadow-lg rounded-full overflow-hidden transition-transform duration-300 ease-out group-hover:scale-105 group-hover:shadow-2xl">
                    {(() => {
                      const safeAvatarSrc: string = (avatarPreview && avatarPreview.trim().length > 0)
                        ? avatarPreview
                        : (profile.avatar ?? "");
                      return (
                        <Avatar
                          src={safeAvatarSrc}
                      alt={`${profile.firstName} ${profile.lastName}`}
                      size="xxlarge"
                        />
                      );
                    })()}
                  </div>
                  {/* Hover overlay */}
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="absolute inset-0 rounded-full bg-black/20" />
                    <Camera className="w-6 h-6 text-white" />
                  </div>

                  

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                </div>

                {/* Profile Info */}
                <div className="flex-1 text-center md:text-left">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
                    <div>
                      <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        {(profile.firstName || profile.lastName) ? (
                          <>
                        {profile.firstName} {profile.lastName}
                          </>
                        ) : (
                          "-"
                        )}
                      </h1>
                      <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-3">
                        {profile.position && (
                          <Badge variant="light" color="info" startIcon={<Briefcase className="w-3 h-3" />}>
                          {profile.position}
                        </Badge>
                        )}
                        {profile.department && (
                          <Badge variant="light" color="light" startIcon={<Building className="w-3 h-3" />}>
                          {profile.department}
                        </Badge>
                        )}
                        {profile.isActive && <Badge variant="light" color="success">Active</Badge>}
                      </div>
                    </div>

                    
                  </div>

                  {/* Quick Info */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                    <div className="flex items-center justify-center md:justify-start">
                      <Mail className="w-4 h-4 mr-2 text-blue-500" />
                      {profile.email || "-"}
                    </div>
                    <div className="flex items-center justify-center md:justify-start">
                      <Phone className="w-4 h-4 mr-2 text-green-500" />
                      {profile.phone || "-"}
                    </div>
                    <div className="flex items-center justify-center md:justify-start">
                      <MapPin className="w-4 h-4 mr-2 text-red-500" />
                      {profile.location || "-"}
                    </div>
                  </div>
                </div>
              </div>
              </CardContent>
            </Card>
          </motion.div>

          {error && <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">{error}</div>}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Profile Information */}
            <div className="lg:col-span-2 space-y-6">
              {/* Personal Information */}
              <Card className="transition-shadow duration-200 hover:shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <User className="w-5 h-5 mr-2 text-blue-600" />
                    Profile Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName">First Name</Label>
                      <p className="mt-1 text-sm text-gray-900">{profile.firstName || "-"}</p>
                    </div>

                    <div>
                      <Label>Last Name</Label>
                      <p className="mt-1 text-sm text-gray-900">{profile.lastName || "-"}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Email</Label>
                      <p className="mt-1 text-sm text-gray-900">{profile.email || "-"}</p>
                    </div>

                    <div>
                      <Label>Phone</Label>
                      <p className="mt-1 text-sm text-gray-900">{profile.phone || "-"}</p>
                    </div>
                  </div>

                  
                </CardContent>
              </Card>

              {/* Professional Information */}
              <Card className="transition-shadow duration-200 hover:shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Briefcase className="w-5 h-5 mr-2 text-purple-600" />
                    Professional Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Position</Label>
                      <p className="mt-1 text-sm text-gray-900">{profile.position}</p>
                    </div>

                    <div>
                      <Label>Department</Label>
                      <p className="mt-1 text-sm text-gray-900">{profile.department}</p>
                    </div>
                  </div>

                  <div>
                    <Label>Location</Label>
                    <p className="mt-1 text-sm text-gray-900">{profile.location}</p>
                  </div>
                </CardContent>
              </Card>

              

              
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Account Status */}
              <Card className="transition-shadow duration-200 hover:shadow-lg">
                <CardHeader>
                  <CardTitle className="text-lg">Account Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Status</span>
                    <Badge variant="light" color={profile.isActive ? "success" : "error"}>
                      {profile.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <div className="flex items-center text-sm">
                      <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                      <span className="text-gray-600">Joined:</span>
                      <span className="ml-auto font-medium">{formatDate(profile.dateJoined)}</span>
                    </div>

                    <div className="flex items-center text-sm">
                      <Clock className="w-4 h-4 mr-2 text-gray-400" />
                      <span className="text-gray-600">Last Login:</span>
                      <span className="ml-auto font-medium">{formatDate(profile.lastLogin)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card className="transition-shadow duration-200 hover:shadow-lg">
                <CardHeader>
                  <CardTitle className="text-lg">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 sm:space-y-3">
                  <Link href="/dashboard" className="block">
                    <Button
                      variant="outline"
                      className="w-full justify-start bg-transparent hover:bg-gray-50 dark:hover:bg-white/5 gap-2 sm:gap-3 min-h-11 sm:min-h-12 transition-colors"
                    >
                      <PieChart className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                      <span className="text-sm sm:text-base">Dashboard</span>
                  </Button>
                  </Link>

                  <Link href="/Version" className="block">
                    <Button
                      variant="outline"
                      className="w-full justify-start bg-transparent hover:bg-gray-50 dark:hover:bg-white/5 gap-2 sm:gap-3 min-h-11 sm:min-h-12 transition-colors"
                    >
                      <Zap className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                      <span className="text-sm sm:text-base">Version: {APP_VERSION}</span>
                  </Button>
                  </Link>
                </CardContent>
              </Card>

              
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
