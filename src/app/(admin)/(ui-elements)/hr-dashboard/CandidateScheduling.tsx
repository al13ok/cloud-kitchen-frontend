"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Button from "@/components/ui/button/Button"
import Input from "@/components/form/input/InputField"
import Label from "@/components/form/Label"
import Textarea from "@/components/form/input/TextArea"
import Badge from "@/components/ui/badge/Badge"
import { Calendar, Clock, User, MapPin, Phone, Mail, CheckCircle } from "lucide-react"

interface CandidateSchedulingProps {
  linkId: string
  recruiterSlug: string
  candidateId: string
  position: string
}

// Mock data - in real app, this would be fetched from API based on linkId
const mockInterviewData = {
  recruiter: {
    name: "Sarah Johnson",
    title: "Senior Technical Recruiter",
    email: "sarah.johnson@company.com",
    phone: "+1 (555) 123-4567",
    avatar: "SJ",
    company: "Tech Solutions Inc.",
  },
  interview: {
    title: "Technical Interview",
    position: "Software Engineer",
    duration: 60,
    type: "Video Call",
    description:
      "Technical assessment and coding interview to evaluate your programming skills and problem-solving abilities.",
    location: "Google Meet (link will be provided)",
  },
  candidate: {
    name: "Tushar Baranwal",
    email: "tushar.baranwal@mobilitgroup.com",
  },
  availableSlots: [
    { date: "2025-01-20", time: "09:00", available: true },
    { date: "2025-01-20", time: "10:30", available: true },
    { date: "2025-01-20", time: "14:00", available: false },
    { date: "2025-01-20", time: "15:30", available: true },
    { date: "2025-01-21", time: "09:00", available: true },
    { date: "2025-01-21", time: "10:30", available: true },
    { date: "2025-01-21", time: "13:00", available: true },
    { date: "2025-01-21", time: "15:00", available: false },
    { date: "2025-01-22", time: "09:30", available: true },
    { date: "2025-01-22", time: "11:00", available: true },
    { date: "2025-01-22", time: "14:30", available: true },
    { date: "2025-01-22", time: "16:00", available: true },
  ],
}

export function CandidateScheduling({ linkId, recruiterSlug, candidateId }: CandidateSchedulingProps) {
  const [selectedSlot, setSelectedSlot] = useState<{ date: string; time: string } | null>(null)
  const [candidateInfo, setCandidateInfo] = useState({
    name: mockInterviewData.candidate.name,
    email: mockInterviewData.candidate.email,
    phone: "",
    timezone: "America/New_York",
    notes: "",
  })
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const slotsByDate = mockInterviewData.availableSlots.reduce(
    (acc, slot) => {
      if (!acc[slot.date]) {
        acc[slot.date] = []
      }
      acc[slot.date].push(slot)
      return acc
    },
    {} as Record<string, typeof mockInterviewData.availableSlots>,
  )

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    })
  }

  const formatTime = (timeStr: string) => {
    return new Date(`2000-01-01T${timeStr}`).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
  }

  const handleSubmit = async () => {
    if (!selectedSlot) return

    setIsLoading(true)

    await new Promise((resolve) => setTimeout(resolve, 2000))

    console.log("Interview scheduled:", {
      linkId,
      candidateId,
      recruiterSlug,
      selectedSlot,
      candidateInfo,
      interviewDetails: mockInterviewData.interview,
    })

    setIsLoading(false)
    setIsSubmitted(true)
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4 transition-colors duration-300">
        <Card className="max-w-2xl w-full">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Interview Scheduled Successfully!</h1>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Your interview has been confirmed for{" "}
              <strong>
                {formatDate(selectedSlot!.date)} at {formatTime(selectedSlot!.time)}
              </strong>
            </p>

            <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg mb-6">
              <h3 className="font-medium text-blue-900 dark:text-blue-200 mb-2">What happens next?</h3>
              <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1 text-left">
                <li>• You&apos;ll receive a confirmation email with meeting details</li>
                <li>• A calendar invitation will be sent to your email</li>
                <li>• You&apos;ll get a reminder 24 hours before the interview</li>
                <li>• The meeting link will be provided in the calendar invite</li>
              </ul>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <h3 className="font-medium mb-3 text-gray-900 dark:text-white">Interview Details</h3>
              <div className="text-sm text-gray-600 dark:text-gray-300 space-y-2">
                <div className="flex items-center justify-between">
                  <span>Position:</span>
                  <span className="font-medium">{mockInterviewData.interview.position}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Duration:</span>
                  <span className="font-medium">{mockInterviewData.interview.duration} minutes</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Type:</span>
                  <span className="font-medium">{mockInterviewData.interview.type}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Interviewer:</span>
                  <span className="font-medium">{mockInterviewData.recruiter.name}</span>
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Need to reschedule or have questions? Contact{" "}
                <a href={`mailto:${mockInterviewData.recruiter.email}`} className="text-blue-600 dark:text-blue-400 hover:underline">
                  {mockInterviewData.recruiter.email}
                </a>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 transition-colors duration-300">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-blue-600 dark:bg-blue-500 rounded-full flex items-center justify-center text-white font-medium flex-shrink-0">
              {mockInterviewData.recruiter.avatar}
            </div>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white break-words">Schedule Your Interview</h1>
              <p className="text-gray-600 dark:text-gray-300 text-sm sm:text-base">
                with {mockInterviewData.recruiter.name} at {mockInterviewData.recruiter.company}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Interview Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-medium text-lg">{mockInterviewData.interview.title}</h3>
                  <Badge variant="light" color="primary">
                    {mockInterviewData.interview.position}
                  </Badge>
                </div>

                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    <span className="text-gray-700 dark:text-gray-300">{mockInterviewData.interview.duration} minutes</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    <span className="text-gray-700 dark:text-gray-300">{mockInterviewData.interview.type}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    <span className="text-gray-700 dark:text-gray-300">{mockInterviewData.recruiter.name}</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-sm text-gray-600 dark:text-gray-300">{mockInterviewData.interview.description}</p>
                </div>

                <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                  <h4 className="font-medium mb-2 text-gray-900 dark:text-white">Contact Information</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                      <a href={`mailto:${mockInterviewData.recruiter.email}`} className="text-blue-600 dark:text-blue-400 hover:underline">
                        {mockInterviewData.recruiter.email}
                      </a>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                      <span className="text-gray-700 dark:text-gray-300">{mockInterviewData.recruiter.phone}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Select Your Preferred Time
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label className="text-base font-medium">Available Time Slots</Label>
                  <div className="mt-3 space-y-4">
                    {Object.entries(slotsByDate).map(([date, slots]) => (
                      <div key={date}>
                        <h4 className="font-medium text-gray-900 dark:text-white mb-2">{formatDate(date)}</h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                          {slots.map((slot) => (
                            <Button
                              key={`${slot.date}-${slot.time}`}
                              variant={selectedSlot?.date === slot.date && selectedSlot?.time === slot.time ? "primary" : "outline"}
                              size="sm"
                              disabled={!slot.available}
                              onClick={() => setSelectedSlot({ date: slot.date, time: slot.time })}
                              className="justify-center"
                            >
                              {formatTime(slot.time)}
                            </Button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {selectedSlot && (
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                    <h4 className="font-medium text-blue-900 dark:text-blue-200 mb-1">Selected Time Slot</h4>
                    <p className="text-blue-700 dark:text-blue-300">
                      {formatDate(selectedSlot.date)} at {formatTime(selectedSlot.time)}
                    </p>
                  </div>
                )}

                <div className="space-y-4">
                  <Label className="text-base font-medium text-gray-900 dark:text-white">Your Information</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name" className="text-gray-700 dark:text-gray-300">Full Name</Label>
                      <Input
                        id="name"
                        value={candidateInfo.name}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCandidateInfo((prev) => ({ ...prev, name: e.target.value }))}
                        className="dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
                      />
                    </div>
                    <div>
                      <Label htmlFor="email" className="text-gray-700 dark:text-gray-300">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        value={candidateInfo.email}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCandidateInfo((prev) => ({ ...prev, email: e.target.value }))}
                        className="dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone" className="text-gray-700 dark:text-gray-300">Phone Number</Label>
                      <Input
                        id="phone"
                        value={candidateInfo.phone}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCandidateInfo((prev) => ({ ...prev, phone: e.target.value }))}
                        placeholder="+1 (555) 123-4567"
                        className="dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
                      />
                    </div>
                    <div>
                      <Label htmlFor="timezone" className="text-gray-700 dark:text-gray-300">Timezone</Label>
                      <Input
                        id="timezone"
                        value={candidateInfo.timezone}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCandidateInfo((prev) => ({ ...prev, timezone: e.target.value }))}
                        className="dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="notes" className="text-gray-700 dark:text-gray-300">Additional Notes (Optional)</Label>
                    <Textarea
                      rows={3}
                      placeholder="Any questions, special requirements, or additional information you&apos;d like to share..."
                      value={candidateInfo.notes}
                      onChange={(value: string) => setCandidateInfo((prev) => ({ ...prev, notes: value }))}
                      className="dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
                  <Button
                    onClick={handleSubmit}
                    disabled={!selectedSlot || isLoading}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {isLoading ? "Scheduling..." : "Confirm Interview"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>
            This is a secure scheduling link for {mockInterviewData.candidate.name}. If you&apos;re not the intended
            recipient, please contact{" "}
            <a href={`mailto:${mockInterviewData.recruiter.email}`} className="text-blue-600 dark:text-blue-400 hover:underline">
              {mockInterviewData.recruiter.email}
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}

