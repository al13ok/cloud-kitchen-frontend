"use client";

import React, { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, X, ClipboardList } from "lucide-react";
import { EnvelopeIcon, ChatIcon } from "@/icons";
import Link from "next/link";
import { SurveyIcons } from "@/components/icons/SurveyIcons";
import { createSurvey, createSurveyQuestion, getSurveyQuestions, deleteSurveyQuestion, getAllSurveyEmailTracking } from "@/utils/api";
import { CreateSurveyRequest, CreateSurveyResponse } from "@/types";
import EmailConfigModal from "@/components/EmailConfigModal";
import DashboardHeader from "@/components/header/DashboardHeader";

const SurveyFeedbackHome: React.FC = () => {
  console.log("SurveyFeedbackHome rendering");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<"creation" | "distribution">("creation");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [createdSurvey, setCreatedSurvey] = useState<CreateSurveyResponse | null>(null);

  // Email modal state
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);

  // Toast notification state
  const [showToast, setShowToast] = useState(false);
  // type QuestionType = "text" | "textarea" | "rating-0-10" | "rating-1-5" | "rating-1-7";
  // legacy type kept commented to avoid unused-var lint
  // type Question = {
  //   text: string;
  //   type: QuestionType;
  //   locked?: boolean;
  //   showIf?: { dependsOnIndex: number; operator: "<" | "<=" | ">" | ">="; value: number } | null;
  // };

  const [title, setTitle] = useState("");
  // Removed branding/template legacy state

  // Inline per-card survey states
  // const [npsScore, setNpsScore] = useState<number | null>(null); // 0-10
  // const [csatStars, setCsatStars] = useState<number | null>(null); // 1-5
  // const [cesScore, setCesScore] = useState<number | null>(null); // 1-7
  // const [activeSurvey, setActiveSurvey] = useState<"nps" | "csat" | "ces" | null>(null);

  // Simple builder: ability to add text questions
  type CustomQuestion = { id: number; text: string; type: "text" };
  type ApiQuestion = { question_id: string; question_text: string; question_type: "text" | "mcq"; options?: string[] };

  const [customQuestions, setCustomQuestions] = useState<CustomQuestion[]>([]);
  const [apiQuestions, setApiQuestions] = useState<ApiQuestion[]>([]);
  const [showSaveButton, setShowSaveButton] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);

  // Email tracking state
  type TrackingRecord = {
    tracking_id: string;
    survey_id: string;
    survey_title: string;
    recipient_email: string;
    send_count: number;
    sent_date: string;
  };
  const [trackingRecords, setTrackingRecords] = useState<TrackingRecord[]>([]);
  const [isLoadingTracking, setIsLoadingTracking] = useState(false);

  const addCustomQuestion = () => {
    const newId = Date.now();
    setCustomQuestions(prev => [
      ...prev,
      {
        id: newId,
        text: "",
        type: "text",
      },
    ]);
    // Show Save button when Add Question is clicked
    setShowSaveButton(true);
  };

  // Show Save button if there are any questions
  useEffect(() => {
    const hasQuestions = customQuestions.length > 0;
    setShowSaveButton(hasQuestions);
  }, [customQuestions]);
  const updateCustomQuestion = (id: number, patch: Partial<CustomQuestion>) => {
    setCustomQuestions(prev => prev.map(q => (q.id === id ? { ...q, ...patch } : q)));
  };
  const removeCustomQuestion = (id: number) => {
    setCustomQuestions(prev => {
      const filtered = prev.filter(q => q.id !== id);
      // Hide Save button if no local questions left
      if (filtered.length === 0) {
        setShowSaveButton(false);
      }
      return filtered;
    });
  };

  // Save questions to API
  const handleSaveQuestions = async () => {
    setIsSaving(true);
    setErrorMessage("");

    try {
      // Validate questions before saving
      const invalidQuestions = customQuestions.filter(q => {
        const trimmedText = q.text.trim();
        return trimmedText.length > 0 && (trimmedText.length < 5 || trimmedText.length > 100);
      });

      if (invalidQuestions.length > 0) {
        setErrorMessage("Questions must be between 5 and 100 characters. Please fix the invalid questions before saving.");
        setIsSaving(false);
        return;
      }

      // Get questions that have text (not empty) and meet length requirements
      const questionsToSave = customQuestions.filter(q => {
        const trimmedText = q.text.trim();
        return trimmedText.length >= 5 && trimmedText.length <= 100;
      });

      if (questionsToSave.length === 0) {
        setErrorMessage("Please add at least one question with text (5-100 characters) before saving.");
        setIsSaving(false);
        return;
      }

      // POST each question to the API with format: { "question": "text" }
      const savePromises = questionsToSave.map(q =>
        createSurveyQuestion(q.text.trim())
      );

      await Promise.all(savePromises);

      // Immediately fetch questions after saving
      await fetchQuestions();

      // Clear local questions after successful save
      setCustomQuestions([]);
      setShowSaveButton(false);

    } catch (error) {
      console.error("Error saving questions:", error);
      setErrorMessage(error instanceof Error ? error.message : "Failed to save questions. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  // Fetch questions from API
  const fetchQuestions = async () => {
    setIsLoadingQuestions(true);
    try {
      const response = await getSurveyQuestions();
      setApiQuestions(response.questions || []);
    } catch (error) {
      console.error("Error fetching questions:", error);
      // Don't show error for initial load, just log it
    } finally {
      setIsLoadingQuestions(false);
    }
  };

  // Delete question from API
  const handleDeleteQuestion = async (questionId: string) => {
    try {
      await deleteSurveyQuestion(questionId);
      // Refresh questions after deletion
      await fetchQuestions();
    } catch (error) {
      console.error("Error deleting question:", error);
      setErrorMessage(error instanceof Error ? error.message : "Failed to delete question. Please try again.");
    }
  };

  // Fetch tracking records
  const fetchTrackingRecords = async () => {
    setIsLoadingTracking(true);
    try {
      const response = await getAllSurveyEmailTracking();
      setTrackingRecords(response.tracking_records || []);
    } catch (error) {
      console.error("Error fetching tracking records:", error);
      setTrackingRecords([]);
    } finally {
      setIsLoadingTracking(false);
    }
  };

  // Fetch questions on component mount - only fetch from DB, no hardcoded questions
  useEffect(() => {
    // Reset local state to empty
    setCustomQuestions([]);
    setShowSaveButton(false);
    // Fetch questions from database only
    fetchQuestions();
    // Fetch tracking records
    fetchTrackingRecords();
  }, []);

  // const templates = [
  //   {
  //     id: "nps" as const,
  //     title: "Net Promoter Score (NPS)",
  //     subtitle: "Measure customer loyalty and satisfaction",
  //     samples: [
  //       "On a scale of 0 to 10, how likely are you to recommend our company to a friend or colleague?",
  //       "What is the primary reason for your score?",
  //     ],
  //     accent: "bg-blue-500",
  //   },
  //   {
  //     id: "csat" as const,
  //     title: "Customer Satisfaction (CSAT)",
  //     subtitle: "Measure satisfaction with specific interactions",
  //     samples: [
  //       "On a scale of 1–5, how satisfied are you with your recent experience with our service?",
  //       "What did you like the most about your experience?",
  //     ],
  //     accent: "bg-green-500",
  //   },
  //   {
  //     id: "ces" as const,
  //     title: "Customer Effort Score (CES)",
  //     subtitle: "Measure how easy it is to interact with your company",
  //     samples: [
  //       "On a scale of 1–7, how easy was it to resolve your issue with us?",
  //       "What was the biggest challenge you faced while resolving your issue?",
  //     ],
  //     accent: "bg-purple-500",
  //   },
  // ];

  const distributionChannels = [
    {
      id: "email",
      title: "Email",
      subtitle: "Send surveys via email campaigns",
      icon: <EnvelopeIcon />,
      features: [
        "Automated scheduling",
        "Response tracking",
        "Unique tokens",
      ],
      cta: "Configure Email",
    },
    {
      id: "whatsapp",
      title: "WhatsApp",
      subtitle: "Distribute through WhatsApp messaging",
      icon: <ChatIcon />,
      features: [
        "Direct messaging",
        "Rich media support",
        "Real-time delivery",
      ],
      cta: "Configure WhatsApp",
    },
    {
      id: "chat-widget",
      title: "Chat Widget",
      subtitle: "Embed surveys in your website",
      icon: <ChatIcon />,
      features: [
        "Contextual triggers",
        "Seamless integration",
        "Custom styling",
      ],
      cta: "Configure Chat Widget",
    },
    {
      id: "ivr",
      title: "IVR",
      subtitle: "Voice-based survey collection",
      icon: <ChatIcon />,
      features: [
        "Phone surveys",
        "Voice recognition",
        "Multi-language support",
      ],
      cta: "Configure IVR",
    },
  ];

  const quickActions = useMemo(() => [
    {
      title: "View Responses",
      description: "Analyze and manage survey responses in real-time",
      icon: <SurveyIcons.TableIcon />,
      href: "/survey-feedback/responses",
      color: "bg-green-500",
    },
    {
      title: "Created Survey",
      description: "View and track all created surveys and email tracking",
      icon: <EnvelopeIcon />,
      href: "/survey-feedback/created-surveys",
      color: "bg-purple-500",
    },
  ], []);

  const openCreateModal = () => {
    setIsCreateOpen(true);
    setActiveTab("creation");
    // setActiveSurvey('nps'); 
    setErrorMessage("");
    setCreatedSurvey(null);
    setTitle("");
    // Reset to empty on open
    setCustomQuestions([]);
    setShowSaveButton(false);
  };
  const closeCreateModal = () => {
    setIsCreateOpen(false);
    // setActiveSurvey(null); 
    setErrorMessage("");
    setCreatedSurvey(null);
    setTitle("");
  };

  const openEmailModal = () => {
    if (!createdSurvey) {
      setErrorMessage("Please create a survey first before sending emails");
      return;
    }
    console.log('Opening email modal with survey:', createdSurvey);
    setIsEmailModalOpen(true);
  };

  const closeEmailModal = () => {
    setIsEmailModalOpen(false);
    // Also close the create modal to go back to main page
    setIsCreateOpen(false);
    setActiveTab("creation");
    // setActiveSurvey(null);
    setCreatedSurvey(null);
    setTitle("");
  };

  // Lock background scroll when modal is open
  useEffect(() => {
    if (isCreateOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev || "";
      };
    }
  }, [isCreateOpen]);

  // Removed legacy builder helpers

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");

    try {
      // Validate required fields
      if (!title.trim()) {
        setErrorMessage("Survey title is required");
        setIsSubmitting(false);
        return;
      }

      // Validate character length
      const titleLength = title.trim().length;
      if (titleLength < 3) {
        setErrorMessage("Survey title must be at least 3 characters long");
        setIsSubmitting(false);
        return;
      }
      if (titleLength > 50) {
        setErrorMessage("Survey title must not exceed 50 characters");
        setIsSubmitting(false);
        return;
      }

      // Prepare survey data - backend only accepts title and description
      const surveyData: CreateSurveyRequest = {
        title: title.trim(),
      };

      // Call the API
      const response = await createSurvey(surveyData);
      console.log('Survey created successfully:', response);

      // Store the created survey data
      setCreatedSurvey(response);

      // Show toast notification
      setShowToast(true);
      setTimeout(() => {
        setShowToast(false);
      }, 1000);

      // After publishing, jump to Distribution tab and keep modal open
      // setActiveSurvey(null);
      setActiveTab("distribution");

    } catch (error) {
      console.error("Error creating survey:", error);
      setErrorMessage(error instanceof Error ? error.message : "Failed to create survey. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Dashboard Header */}
        <DashboardHeader
          title="Survey & Feedback"
          subtitle="Create, manage, and analyze surveys to gather valuable feedback from your audience."
          icon={ClipboardList}
          iconColor="text-white"
          hideTenantPrefix={true}
          breadcrumbs={[
            { label: 'Home', href: '/' },
            { label: 'Survey & Feedback' }
          ]}
        />

        <div className="space-y-8 mt-8">

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Create Survey - embedded card (no sidebar route) */}
            <button
              onClick={openCreateModal}
              className="text-left group bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 hover:shadow-lg transition-all ease-in-out border border-gray-200 dark:border-gray-700"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg bg-blue-500 text-white`}>
                  <SurveyIcons.PlusIcon />
                </div>
                <SurveyIcons.ArrowRightIcon className="w-5 h-5 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Create New Survey
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Start building your survey with our easy-to-use form builder
              </p>
            </button>
            {quickActions.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="group bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 hover:shadow-lg transition-all ease-in-out border border-gray-200 dark:border-gray-700 min-h-[180px] flex flex-col"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-lg ${action.color} text-white flex-shrink-0`}>
                    {action.icon}
                  </div>
                  <SurveyIcons.ArrowRightIcon className="w-5 h-5 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors flex-shrink-0" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {action.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm flex-grow">
                  {action.description}
                </p>
              </Link>
            ))}
          </div>

          {/* Create Survey Modal */}
          <AnimatePresence>
            {isCreateOpen && (
              <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                {/* Backdrop with blur */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="absolute inset-0 backdrop-blur-xl bg-black/30"
                  onClick={closeCreateModal}
                />

                {/* Main Modal Card */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.92, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.92, y: 20 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="relative z-[10000] w-full max-w-4xl max-h-[90vh] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col"
                >
                  {/* Header Strip with Gradient */}
                  <div className="w-full h-20 bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500 px-6 flex items-center justify-between">
                    <h2 className="text-white text-2xl font-bold tracking-wide">
                      Create Survey
                    </h2>
                    <button
                      onClick={closeCreateModal}
                      className="text-white text-3xl font-light hover:opacity-70 transition-opacity"
                      aria-label="Close"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>

                  {/* Body */}
                  <div className="flex-1 overflow-y-auto p-8 space-y-10">
                    {/* Tabs */}
                    <div className="flex gap-6 border-b border-gray-200 pb-2">
                      <button
                        type="button"
                        onClick={() => setActiveTab("creation")}
                        className={`px-4 py-2 font-semibold transition-colors border-b-2 ${activeTab === "creation"
                          ? "text-indigo-600 border-indigo-600"
                          : "text-gray-500 border-transparent hover:text-indigo-600"
                          }`}
                      >
                        Survey Creation
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab("distribution")}
                        className={`px-4 py-2 font-semibold transition-colors border-b-2 ${activeTab === "distribution"
                          ? "text-indigo-600 border-indigo-600"
                          : "text-gray-500 border-transparent hover:text-indigo-600"
                          }`}
                      >
                        Distribution
                      </button>
                    </div>

                    {/* Error Messages */}
                    <AnimatePresence>
                      {errorMessage && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="p-4 bg-red-50 border border-red-200 rounded-xl"
                        >
                          <div className="flex items-center">
                            <div className="flex-shrink-0">
                              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                              </svg>
                            </div>
                            <div className="ml-3">
                              <p className="text-sm font-medium text-red-800">{errorMessage}</p>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <form id="survey-form" onSubmit={handleSubmit} className="space-y-6">
                      {/* Simplified Survey Creation Form */}
                      {activeTab === "creation" && (
                        <div className="space-y-8">
                          {/* Survey Details */}
                          <div>
                            <h3 className="font-semibold text-gray-800 text-lg mb-4">Survey Details</h3>
                            <div className="border rounded-2xl p-6 bg-gray-50">
                              <label className="block font-medium text-gray-700 mb-3">
                                Survey Title <span className="text-red-500">*</span>
                              </label>
                              <input
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Enter survey title..."
                                maxLength={50}
                                className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-400 bg-white transition-all"
                              />
                              <div className="mt-2 flex items-center justify-between">
                                <div>
                                  {title.length < 3 && title.length > 0 && (
                                    <p className="text-xs text-red-500">Minimum 3 characters required</p>
                                  )}
                                  {title.length >= 50 && (
                                    <p className="text-xs text-red-500">Maximum 50 characters reached</p>
                                  )}
                                  {title.length >= 45 && title.length < 50 && (
                                    <p className="text-xs text-yellow-600">Approaching character limit ({50 - title.length} remaining)</p>
                                  )}
                                </div>
                                <p className={`text-xs ${title.length >= 45 ? 'text-yellow-600' : title.length >= 50 ? 'text-red-500' : 'text-gray-500'}`}>
                                  {title.length}/50
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Questions Builder */}
                          <div>
                            <div className="flex items-center justify-between mb-6">
                              <h3 className="font-semibold text-gray-800 text-lg">Questions</h3>
                              <button
                                type="button"
                                onClick={addCustomQuestion}
                                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition shadow-lg hover:shadow-xl"
                              >
                                <Plus size={16} />
                                Add Question
                              </button>
                            </div>

                            <div className="space-y-5">
                              {/* Show local questions being edited */}
                              {customQuestions.map((q, idx) => (
                                <motion.div
                                  key={q.id}
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: idx * 0.05 }}
                                  className="border rounded-2xl p-5 flex justify-between items-start bg-white shadow-sm hover:shadow-md transition"
                                >
                                  <div className="flex gap-4 flex-1">
                                    <div className="w-8 h-8 flex items-center justify-center bg-indigo-600 text-white rounded-full font-semibold text-sm flex-shrink-0">
                                      {apiQuestions.length + idx + 1}
                                    </div>
                                    <div className="flex-1 space-y-3">
                                      <input
                                        value={q.text}
                                        onChange={e => updateCustomQuestion(q.id, { text: e.target.value })}
                                        placeholder="Enter question..."
                                        maxLength={100}
                                        className="w-full p-2.5 rounded-xl border border-gray-300 outline-none focus:ring-2 focus:ring-indigo-400 bg-white text-gray-900 transition-all"
                                      />
                                      <div className="flex items-center justify-between">
                                        <div>
                                          {q.text.length > 0 && q.text.length < 5 && (
                                            <p className="text-xs text-red-500">Minimum 5 characters required</p>
                                          )}
                                          {q.text.length >= 100 && (
                                            <p className="text-xs text-red-500">Maximum 100 characters reached</p>
                                          )}
                                          {q.text.length >= 95 && q.text.length < 100 && (
                                            <p className="text-xs text-yellow-600">Approaching character limit ({100 - q.text.length} remaining)</p>
                                          )}
                                        </div>
                                        <p className={`text-xs ${q.text.length >= 95 ? 'text-yellow-600' : q.text.length >= 100 ? 'text-red-500' : 'text-gray-500'}`}>
                                          {q.text.length}/100
                                        </p>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-700 font-medium">
                                          TEXT
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => removeCustomQuestion(q.id)}
                                    className="text-red-500 hover:text-red-600 transition-colors ml-4 flex-shrink-0"
                                    aria-label="Remove question"
                                  >
                                    <Trash2 size={20} />
                                  </button>
                                </motion.div>
                              ))}

                              {/* Show questions from API (Database) */}
                              {isLoadingQuestions ? (
                                <div className="text-center py-8 text-gray-500">
                                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
                                  <p className="mt-2">Loading questions...</p>
                                </div>
                              ) : (
                                apiQuestions.map((q, idx) => (
                                  <motion.div
                                    key={q.question_id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: (customQuestions.length + idx) * 0.05 }}
                                    className="border rounded-2xl p-5 flex justify-between items-start bg-white shadow-sm hover:shadow-md transition"
                                  >
                                    <div className="flex gap-4 flex-1">
                                      <div className="w-8 h-8 flex items-center justify-center bg-indigo-600 text-white rounded-full font-semibold text-sm flex-shrink-0">
                                        {customQuestions.length + idx + 1}
                                      </div>
                                      <div className="flex-1">
                                        <p className="text-gray-700 font-medium mb-2">{q.question_text}</p>
                                        <span className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-700 font-medium">
                                          {q.question_type.toUpperCase()}
                                        </span>
                                      </div>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteQuestion(q.question_id)}
                                      className="text-red-500 hover:text-red-600 transition-colors ml-4 flex-shrink-0"
                                      aria-label="Delete question"
                                    >
                                      <Trash2 size={20} />
                                    </button>
                                  </motion.div>
                                ))
                              )}
                            </div>

                            {/* Save button */}
                            {showSaveButton && customQuestions.length > 0 && (
                              <div className="mt-6">
                                <button
                                  type="button"
                                  onClick={handleSaveQuestions}
                                  disabled={isSaving}
                                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-60 disabled:cursor-not-allowed transition-colors shadow-lg font-medium"
                                >
                                  {isSaving ? "Saving..." : "Save Questions"}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {activeTab === "distribution" && (
                        <div>
                          <h4 className="text-lg font-semibold text-gray-800 mb-2">Survey Distribution</h4>
                          <p className="text-sm text-gray-600 mb-6">Choose how to reach your audience across multiple channels</p>

                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {distributionChannels.map((ch) => (
                              <motion.div
                                key={ch.id}
                                whileHover={{ scale: 1.02 }}
                                className="rounded-2xl border border-gray-200 p-6 bg-white shadow-sm hover:shadow-md transition"
                              >
                                <div className="flex items-start gap-3 mb-4">
                                  <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600">
                                    {ch.icon}
                                  </span>
                                  <div>
                                    <div className="text-base font-semibold text-gray-900">{ch.title}</div>
                                    <div className="text-xs text-gray-500 mt-1">{ch.subtitle}</div>
                                  </div>
                                </div>
                                <div className="mb-4">
                                  <div className="text-xs font-semibold text-gray-700 mb-2">Features:</div>
                                  <ul className="list-disc pl-5 text-sm text-gray-600 space-y-1">
                                    {ch.features.map((f, i) => (
                                      <li key={i}>{f}</li>
                                    ))}
                                  </ul>
                                </div>
                                <button
                                  type="button"
                                  onClick={ch.id === "email" ? openEmailModal : undefined}
                                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 transition font-medium"
                                >
                                  {ch.cta}
                                </button>
                              </motion.div>
                            ))}
                          </div>
                        </div>
                      )}

                    </form>
                  </div>

                  {/* Footer */}
                  {activeTab === "creation" && (
                    <div className="px-8 py-5 border-t bg-gray-50 flex justify-end">
                      <button
                        type="submit"
                        form="survey-form"
                        disabled={isSubmitting}
                        className="px-8 py-3 bg-indigo-600 text-white rounded-xl shadow-lg hover:bg-indigo-700 transition text-lg font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                        onClick={(e) => {
                          e.preventDefault();
                          handleSubmit(e as React.FormEvent);
                        }}
                      >
                        {isSubmitting ? 'Publishing...' : 'Publish Survey'}
                      </button>
                    </div>
                  )}
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* Recent Surveys - Email Tracking */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Recent Surveys
              </h2>
              <Link
                href="/survey-feedback/created-surveys"
                className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
              >
                View All
              </Link>
            </div>

            {isLoadingTracking ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-600 dark:text-gray-400">Loading tracking data...</span>
              </div>
            ) : trackingRecords.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 dark:text-gray-400">No survey tracking records found.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {trackingRecords.slice(0, 3).map((record) => (
                  <div
                    key={record.tracking_id}
                    className="group flex items-center justify-between p-5 bg-gradient-to-r from-gray-50 to-white dark:from-gray-700 dark:to-gray-800 rounded-xl border border-gray-200 dark:border-gray-600 hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-200"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-1">
                          <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                            <EnvelopeIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 dark:text-white text-lg mb-2 truncate">
                            {record.survey_title || "Untitled Survey"}
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Email:</span>
                              <span className="text-sm text-gray-700 dark:text-gray-300 truncate" title={record.recipient_email}>
                                {record.recipient_email}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Sent:</span>
                              <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                                {record.send_count} {record.send_count === 1 ? 'time' : 'times'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Date:</span>
                              <span className="text-sm text-gray-700 dark:text-gray-300">
                                {formatDate(record.sent_date)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 ml-4">
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                        <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                        <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
                          Tracked
                        </span>
                      </div>
                      <button className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors opacity-0 group-hover:opacity-100">
                        <SurveyIcons.ArrowRightIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Email Configuration Modal */}
          {createdSurvey && (
            <EmailConfigModal
              isOpen={isEmailModalOpen}
              onClose={closeEmailModal}
              surveyId={createdSurvey.survey_id}
              surveyTitle={title}
              publicLink={createdSurvey.public_link}
            />
          )}

          {/* Toast Notification */}
          {showToast && (
            <div className="fixed top-4 right-4 z-[10001] animate-fade-in">
              <div className="bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center space-x-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="font-medium">Survey created successfully!</span>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default SurveyFeedbackHome;
