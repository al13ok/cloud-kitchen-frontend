"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import MultiStepController from "@/components/MultiStepController";
import EmojiRating from "@/components/survey/EmojiRating";
import SurveyQuestionCard from "@/components/survey/SurveyQuestionCard";
import { useEmailPrefill } from "@/hooks/useEmailPrefill";
import { submitSurveyFeedback, checkSurveyStatus, BACKEND_URL } from "@/utils/api";
import { RATING_SCALE, TEXT_MAX_LENGTH, TEXT_MIN_LENGTH } from "@/config/feedback";
import SurveyLayout from "@/components/survey/SurveyLayout";
import ThankYouPage from "@/components/survey/ThankYouPage";

type SurveyType = "nps" | "csat" | "ces";

interface SurveyQuestion {
  question_id: string;
  survey_id?: string;
  question_text: string;
  question_type: "text" | "mcq";
  options?: string[];
  created_at?: string;
}

interface SubmissionSuccess {
  success: boolean;
  id: string;
  submittedAt: string;
  summary: {
    email: string;
    rating: number | null; // Rating is optional
    answers: Array<{ questionId: string; answer: string }>;
  };
}

interface RenderProps {
  attemptedNext: boolean;
  getCharCounterProps: (fieldId: string, value: string, options: { max: number; min?: number }) => {
    counterId: string;
    counterText: string;
    ariaDescribedBy: string;
    isInvalid: boolean;
    exceeds: boolean;
    below: boolean;
  };
}

const sanitize = (value: string) => value?.trim?.() ?? "";

const mapRatingLabel = (value: number, scale: number) => {
  if (scale === 5) {
    if (value <= 2) return "Needs improvement";
    if (value === 3) return "Neutral";
    if (value === 4) return "Satisfied";
    return "Delighted";
  }

  if (scale !== 10 && scale > 5) {
    const ratio = value / scale;
    if (ratio <= 0.4) return "Challenging";
    if (ratio <= 0.7) return "Moderate";
    return "Effortless";
  }

  if (value <= 6) return "Detractor";
  if (value <= 8) return "Passive";
  return "Promoter";
};

const getRatingScale = (type: SurveyType) => {
  if (type === "csat") return 5;
  if (type === "ces") return 7;
  return RATING_SCALE;
};

export default function PublicSurveyPage() {
  const params = useParams();
  const surveyId = Array.isArray(params?.id) ? params.id[0] : (params?.id as string);
  const searchParams = useSearchParams();

  const emailPrefill = useEmailPrefill(searchParams);

  const [surveyType, setSurveyType] = useState<SurveyType>("nps");
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [questions, setQuestions] = useState<SurveyQuestion[]>([]);
  const [questionAnswers, setQuestionAnswers] = useState<Record<string, string>>({});
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(true);
  const [questionError, setQuestionError] = useState("");
  const [submissionError, setSubmissionError] = useState("");
  const [submissionErrorDetails, setSubmissionErrorDetails] = useState<
    Array<{ loc: string[]; msg: string }>
  >([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionDetails, setSubmissionDetails] = useState<SubmissionSuccess | null>(null);
  const [surveyStatus, setSurveyStatus] = useState<{
    can_submit: boolean;
    message: string;
    survey_status: string;
  } | null>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [touched, setTouched] = useState<{
    email: boolean;
    rating: boolean;
    comment: boolean;
    questions: Record<string, boolean>;
  }>({
    email: false,
    rating: false,
    comment: false,
    questions: {},
  });

  const markEmailTouched = useCallback(() => {
    setTouched((prev) => (prev.email ? prev : { ...prev, email: true }));
  }, []);

  const markRatingTouched = useCallback(() => {
    setTouched((prev) => (prev.rating ? prev : { ...prev, rating: true }));
  }, []);

  const markCommentTouched = useCallback(() => {
    setTouched((prev) => (prev.comment ? prev : { ...prev, comment: true }));
  }, []);

  const markQuestionTouched = useCallback((questionId: string) => {
    setTouched((prev) => {
      if (prev.questions[questionId]) return prev;
      return {
        ...prev,
        questions: {
          ...prev.questions,
          [questionId]: true,
        },
      };
    });
  }, []);

  const ratingScale = useMemo(() => getRatingScale(surveyType), [surveyType]);

  useEffect(() => {
    try {
      const type = (searchParams?.get("type") ?? "").toLowerCase() as SurveyType;
      if (type && ["nps", "csat", "ces"].includes(type)) {
        setSurveyType(type);
      }
    } catch {
      setSurveyType("nps");
    }
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;

  const fetchQuestions = async () => {
    setIsLoadingQuestions(true);
      setQuestionError("");

    try {
      const url = `${BACKEND_URL}/api/v1/survey/questions/`;
      const res = await fetch(url, {
          method: "GET",
        headers: {
            "Content-Type": "application/json",
            accept: "application/json",
        },
      });
      
      if (!res.ok) {
        const errorText = await res.text();
          throw new Error(errorText || `Failed to fetch survey questions: ${res.status}`);
      }
      
      const data = await res.json();
      let questionsArray: SurveyQuestion[] = [];
      
      if (Array.isArray(data)) {
        questionsArray = data;
        } else if (Array.isArray(data?.questions)) {
        questionsArray = data.questions;
        } else if (Array.isArray(data?.data)) {
        questionsArray = data.data;
      }
      
        if (!cancelled) {
      setQuestions(questionsArray);
        }
      } catch (error) {
        console.error("Error fetching survey questions", error);
        if (!cancelled) {
          setQuestionError("We couldn't load additional questions. You can still submit your feedback.");
      setQuestions([]);
        }
    } finally {
        if (!cancelled) setIsLoadingQuestions(false);
      }
    };

    fetchQuestions();

    return () => {
      cancelled = true;
    };
  }, []);

  // Check survey status when email is available
  useEffect(() => {
    let cancelled = false;

    const checkStatus = async () => {
      // Only check if we have a valid email
      if (!emailPrefill.isValidEmail || !surveyId) return;

      setIsCheckingStatus(true);
      try {
        const status = await checkSurveyStatus(surveyId, emailPrefill.email);
        if (!cancelled) {
          setSurveyStatus({
            can_submit: status.can_submit,
            message: status.message,
            survey_status: status.survey_status,
          });
          
          // If already submitted, set submission details to show success message
          if (!status.can_submit && status.message.includes("already submitted")) {
            setSubmissionDetails({
              success: true,
              id: "",
              submittedAt: new Date().toISOString(),
              summary: {
                email: emailPrefill.email,
                rating: 0,
                answers: [],
              },
            });
          }
        }
      } catch (error) {
        console.error("Error checking survey status:", error);
        // Don't block the form if status check fails
        if (!cancelled) {
          setSurveyStatus({
            can_submit: true,
            message: "Survey is ready for your feedback.",
            survey_status: "active",
          });
        }
      } finally {
        if (!cancelled) {
          setIsCheckingStatus(false);
        }
      }
    };

    checkStatus();

    return () => {
      cancelled = true;
    };
  }, [surveyId, emailPrefill.isValidEmail, emailPrefill.email]);

  const reviewAnswers = useMemo(() => {
    const entries: Array<{ label: string; answer: string }> = [];

    const trimmedComment = sanitize(comment);
    if (trimmedComment) {
      entries.push({ label: "General comment", answer: trimmedComment });
    }

      questions.forEach((question) => {
      const raw = questionAnswers[question.question_id];
      if (!raw) return;
      entries.push({
        label: question.question_text,
        answer: sanitize(raw),
      });
    });

    return entries;
  }, [comment, questions, questionAnswers]);

  const steps = useMemo(() => {
    const contactStep = {
      id: "contact",
      title: "How was your experience?",
      description: "",
      render: ({ attemptedNext }: RenderProps) => {
        // Hide email error if email is from URL
        const showEmailError = !emailPrefill.emailFromUrl && (attemptedNext || touched.email) && !emailPrefill.isValidEmail;

        return (
          <div className="space-y-4 overflow-visible">
            {/* Email Field Card */}
            {!emailPrefill.emailFromUrl && (
              <SurveyQuestionCard
                title="Your Email Address"
                description="We'll use this to send you updates about your feedback"
                error={showEmailError ? (emailPrefill.warning || "Please enter a valid email address.") : undefined}
                required
              >
                <input
                  type="email"
                  value={emailPrefill.email}
                  onChange={(event) => emailPrefill.setEmail(event.target.value)}
                  onBlur={markEmailTouched}
                  autoComplete="email"
                  data-email-input
                  className={`w-full rounded-xl border-2 px-4 py-3.5 text-base font-medium text-gray-900 dark:text-white bg-white dark:bg-gray-800 transition-all duration-200 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500 ${
                    showEmailError
                      ? "border-red-400 dark:border-red-600 focus-visible:border-red-500 focus-visible:ring-red-500"
                      : "border-gray-300 dark:border-gray-600 focus-visible:border-indigo-500 dark:focus-visible:border-indigo-400 hover:border-gray-400 dark:hover:border-gray-500"
                  }`}
                  placeholder="Enter your email address"
                  aria-invalid={showEmailError}
                />
                {emailPrefill.warning && !showEmailError && (
                  <p className="mt-2 text-sm text-amber-600 dark:text-amber-400" role="alert">
                    {emailPrefill.warning}
                  </p>
                )}
              </SurveyQuestionCard>
            )}
            {/* Hidden input to ensure email is submitted even when field is hidden */}
            {emailPrefill.emailFromUrl && (
              <input type="email" value={emailPrefill.email} readOnly hidden name="email" />
            )}

            {/* Rating Card */}
            <div onBlurCapture={markRatingTouched} className="overflow-visible">
              <EmojiRating
                scale={ratingScale}
                value={typeof rating === "number" ? rating : undefined}
                onChange={(value: number) => {
                  setRating(value);
                  markRatingTouched();
                }}
                getLabel={mapRatingLabel}
                showHappyMeter={true}
              />
            </div>
          </div>
        );
      },
      validate: () => {
        const errors: string[] = [];
        // Only email is required, everything else is optional
        if (!emailPrefill.emailFromUrl && !emailPrefill.isValidEmail) {
          const errorMsg = emailPrefill.emailError || emailPrefill.warning || "Enter a valid email address.";
          errors.push(errorMsg);
        }
        // Rating is optional - no error if not selected
        return { valid: errors.length === 0, errors };
      },
      isComplete: () => emailPrefill.emailFromUrl || emailPrefill.isValidEmail, // Only email required
    };
 
    const commentStep = {
      id: "comment",
      title: "Tell us more about your experience",
      description: "",
      render: ({ getCharCounterProps, attemptedNext }: RenderProps) => {
        const trimmed = sanitize(comment);
        const counter = getCharCounterProps("general-comment", comment, {
          max: TEXT_MAX_LENGTH,
          min: trimmed ? TEXT_MIN_LENGTH : 0,
        });
        const showError =
          (attemptedNext || touched.comment) && trimmed.length > 0 && trimmed.length < TEXT_MIN_LENGTH;
        const textareaId = "general-comment-input";

        return (
          <div className="space-y-3">
            <div className="relative">
              <textarea
                id={textareaId}
                value={comment}
                onChange={(event) => setComment(event.target.value.slice(0, TEXT_MAX_LENGTH))}
                onBlur={markCommentTouched}
                rows={6}
                maxLength={TEXT_MAX_LENGTH}
                className={`w-full rounded-xl border-2 px-4 py-3.5 pr-20 text-base font-medium text-gray-900 dark:text-white bg-white dark:bg-gray-800 transition-all duration-200 placeholder:text-gray-400 dark:placeholder:text-gray-500 resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500 ${
                  showError
                    ? "border-red-400 dark:border-red-600 focus-visible:border-red-500 focus-visible:ring-red-500"
                    : "border-gray-300 dark:border-gray-600 focus-visible:border-indigo-500 dark:focus-visible:border-indigo-400 hover:border-gray-400 dark:hover:border-gray-500"
                }`}
                placeholder="Share your thoughts, feedback, or suggestions here..."
                aria-describedby={counter.counterId}
              />
              <div
                id={counter.counterId}
                className={`absolute bottom-3 right-3 text-xs font-medium ${
                  counter.isInvalid ? "text-red-600 dark:text-red-400" : "text-gray-400 dark:text-gray-500"
                }`}
              >
                {counter.counterText}
              </div>
            </div>
            {showError && (
              <div
                className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
                role="alert"
              >
                <p className="text-sm text-red-700 dark:text-red-300">
                  Comment must be at least {TEXT_MIN_LENGTH} characters.
                </p>
              </div>
            )}
          </div>
        );
      },
      validate: () => {
        // Comment step is optional - always allow navigation
        return { valid: true, errors: [] };
      },
      isComplete: () => {
        // Comment step is optional - always allow navigation
        return true;
      },
    };

    const questionSteps = questions.map((question) => {
      if (question.question_type === "mcq") {
        return {
          id: question.question_id,
          title: question.question_text,
          description: "",
          render: ({ attemptedNext }: RenderProps) => {
            const selected = questionAnswers[question.question_id] || "";
            const questionTouched = touched.questions[question.question_id] ?? false;
            const showError = (attemptedNext || questionTouched) && !selected;

            return (
              <SurveyQuestionCard
                error={showError ? "Please select an option to continue." : undefined}
              >
                <div
                  className="space-y-3"
                  onBlurCapture={() => markQuestionTouched(question.question_id)}
                >
                  <div
                    role="radiogroup"
                    aria-label={question.question_text}
                    className="space-y-3"
                  >
                    {(question.options ?? []).map((option) => (
                      <label
                        key={option}
                        className={`flex cursor-pointer items-center justify-between rounded-xl border-2 px-4 py-3.5 text-base font-medium transition-all duration-200 ${
                          selected === option
                            ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-100 shadow-md shadow-indigo-200/50"
                            : "border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:border-gray-400 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700"
                        }`}
                      >
                        <span>{option}</span>
                        <input
                          type="radio"
                          name={`question-${question.question_id}`}
                          value={option}
                          checked={selected === option}
                          onChange={(event) => {
                            // Only set if an option is actually selected
                            if (event.target.value) {
                              setQuestionAnswers((prev) => ({
                                ...prev,
                                [question.question_id]: event.target.value,
                              }));
                            }
                          }}
                          className="h-5 w-5 text-indigo-600 focus:ring-2 focus:ring-indigo-500"
                        />
                      </label>
                    ))}
                  </div>
                </div>
              </SurveyQuestionCard>
            );
          },
          validate: () => {
            // MCQ questions are optional - always allow navigation
            return { valid: true, errors: [] };
          },
          isComplete: () => {
            // MCQ questions are optional - always allow navigation
            return true;
          },
        };
      }

      return {
        id: question.question_id,
        title: question.question_text,
        description: "",
        render: ({ getCharCounterProps, attemptedNext }: RenderProps) => {
          const answer = questionAnswers[question.question_id] ?? "";
          const trimmed = sanitize(answer);
          const counter = getCharCounterProps(question.question_id, answer, {
            max: TEXT_MAX_LENGTH,
            min: TEXT_MIN_LENGTH,
          });
          const questionTouched = touched.questions[question.question_id] ?? false;
          const showError =
            (attemptedNext || questionTouched) &&
            (trimmed.length < TEXT_MIN_LENGTH || trimmed.length > TEXT_MAX_LENGTH);
          const textareaId = `${question.question_id}-input`;

          return (
            <div className="space-y-3">
              <div className="relative">
                <textarea
                  id={textareaId}
                  value={answer}
                  onChange={(event) => {
                    const newValue = event.target.value.slice(0, TEXT_MAX_LENGTH);
                    // If value is empty or only whitespace, remove it from state completely
                    if (!newValue || newValue.trim() === "") {
                      setQuestionAnswers((prev) => {
                        const updated = { ...prev };
                        delete updated[question.question_id];
                        return updated;
                      });
                    } else {
                      setQuestionAnswers((prev) => ({
                        ...prev,
                        [question.question_id]: newValue,
                      }));
                    }
                  }}
                  onBlur={() => markQuestionTouched(question.question_id)}
                  rows={6}
                  maxLength={TEXT_MAX_LENGTH}
                  aria-describedby={counter.counterId}
                  className={`w-full rounded-xl border-2 px-4 py-3.5 pr-20 text-base font-medium text-gray-900 dark:text-white bg-white dark:bg-gray-800 transition-all duration-200 placeholder:text-gray-400 dark:placeholder:text-gray-500 resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500 ${
                    showError
                      ? "border-red-400 dark:border-red-600 focus-visible:border-red-500 focus-visible:ring-red-500"
                      : "border-gray-300 dark:border-gray-600 focus-visible:border-indigo-500 dark:focus-visible:border-indigo-400 hover:border-gray-400 dark:hover:border-gray-500"
                  }`}
                  placeholder="Type your answer here..."
                />
                <div
                  id={counter.counterId}
                  className={`absolute bottom-3 right-3 text-xs font-medium ${
                    counter.isInvalid ? "text-red-600 dark:text-red-400" : "text-gray-400 dark:text-gray-500"
                  }`}
                >
                  {counter.counterText}
                </div>
              </div>
              {showError && (
                <div
                  className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
                  role="alert"
                >
                  <p className="text-sm text-red-700 dark:text-red-300">
                    Answer must be at least {TEXT_MIN_LENGTH} characters.
                  </p>
                </div>
              )}
            </div>
          );
        },
        validate: () => {
          // Text questions are optional - always allow navigation
          return { valid: true, errors: [] };
        },
        isComplete: () => {
          // Text questions are optional - always allow navigation
          return true;
        },
      };
    });

    const reviewStep = {
      id: "review",
      title: "Review & submit",
      description: "Confirm everything looks good, then submit.",
      render: () => (
        <div className="space-y-6">
          {submissionError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-700 dark:bg-red-900/30 dark:text-red-200">
              <p className="font-semibold">{submissionError}</p>
              {submissionErrorDetails.length > 0 && (
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {submissionErrorDetails.map((detail, index) => (
                    <li key={`${detail.loc?.join("-") ?? "error"}-${index}`}>{detail.msg}</li>
                  ))}
                </ul>
                    )}
                </div>
                )}

          <section className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">
              Contact details
            </h3>
            <dl className="mt-3 space-y-2 text-sm text-gray-700 dark:text-gray-300">
              <div className="flex justify-between">
                <dt>Email</dt>
                <dd>{emailPrefill.email}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Rating</dt>
                <dd>
                  {typeof rating === "number"
                    ? `${rating} • ${mapRatingLabel(rating, ratingScale)}`
                    : "Not selected"}
                </dd>
                </div>
            </dl>
          </section>

          <section className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">
              Answers
                    </h3>
            {reviewAnswers.length === 0 ? (
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                No additional answers provided.
              </p>
            ) : (
              <ul className="mt-3 space-y-3">
                {reviewAnswers.map((entry, index) => (
                  <li key={`${entry.label}-${index}`} className="rounded-md bg-white p-3 shadow-sm dark:bg-gray-900/40">
                    <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500">
                      {entry.label}
                    </p>
                    <p className="mt-1 text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                      {entry.answer}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      ),
      validate: () => ({ valid: true, errors: [] }),
      isComplete: () => emailPrefill.emailFromUrl || emailPrefill.isValidEmail, // Only email required
    };

    return [contactStep, commentStep, ...questionSteps, reviewStep];
  }, [
    comment,
    emailPrefill,
    questionAnswers,
    questions,
    rating,
    ratingScale,
    reviewAnswers,
    submissionError,
    submissionErrorDetails,
    markCommentTouched,
    markEmailTouched,
    markQuestionTouched,
    markRatingTouched,
    touched.comment,
    touched.email,
    touched.questions,
  ]);

  const handleSubmit = async () => {
    // Only email is required, rating and everything else is optional
    if (!emailPrefill.isValidEmail) return;
    
    // Wait for status check to complete if it's still in progress
    if (isCheckingStatus) {
      setSubmissionError("Please wait while we check your submission status...");
      return;
    }
    
    // Prevent submission if already submitted
    if (surveyStatus && !surveyStatus.can_submit) {
      setSubmissionError(surveyStatus.message || "You've already submitted your feedback.");
      // Show success message for already submitted
      setSubmissionDetails({
        success: true,
        id: "",
        submittedAt: new Date().toISOString(),
        summary: {
          email: emailPrefill.email,
          rating: rating ?? null,
          answers: [],
        },
      });
      return;
    }

    setSubmissionError("");
    setSubmissionErrorDetails([]);
    setIsSubmitting(true);

    try {
      const trimmedComment = sanitize(comment);
      
      // Build answers payload - include ALL questions
      // If question is not answered, send "Not Answered" (13 chars - meets backend min 10 char requirement)
      // If question is answered, send the actual answer
      const answersPayload = questions
        .map((question) => {
          const raw = questionAnswers[question.question_id];
          
          if (question.question_type === "mcq") {
            // For MCQ: if no answer selected, send "Not Answered"
            if (!raw || raw.trim() === "") {
              return { questionId: question.question_id, answer: "Not Answered" };
            }
            return { questionId: question.question_id, answer: raw.trim() };
          }
          
          // For text questions: if empty or whitespace, send "Not Answered"
          const cleaned = sanitize(raw ?? "");
          if (!cleaned || cleaned.length === 0) {
            return { questionId: question.question_id, answer: "Not Answered" };
          }
          return { questionId: question.question_id, answer: cleaned };
        })
        .filter((entry) => {
          // Explicitly filter out any "general-comment" entries (shouldn't exist, but safety check)
          return entry.questionId !== "general-comment";
        });

      // Ensure comment is only sent if it has actual content (not empty, not just email)
      const finalComment = trimmedComment && trimmedComment.length > 0 && trimmedComment !== emailPrefill.email
        ? trimmedComment
        : null;

      const payload = {
        email: emailPrefill.email,
        rating: rating ?? null, // Send null if rating not selected (optional)
        comment: finalComment, // Send null if empty or if it's accidentally the email
        answers: answersPayload, // All questions included, unanswered ones have "NA"
      };

      console.log("📤 Final payload before submission:", JSON.stringify(payload, null, 2));

      const response = await submitSurveyFeedback(surveyId, payload) as unknown;
      
      console.log("📤 Response received:", response);
      console.log("📤 Response type:", typeof response);
      console.log("📤 Response keys:", response ? Object.keys(response) : "null/undefined");

      // Handle different response formats from backend
      // Format 1: { success: true, id, submittedAt, summary }
      // Format 2: { message: "...", feedback_id: "...", submitted_date: "..." }
      // Format 3: Empty response or any successful response (treat as success)
      
      // PRIORITY 1: Check for the actual format being returned: { message, feedback_id, submitted_date }
      if (response && typeof response === 'object' && 'message' in response && ('feedback_id' in response || 'id' in response)) {
        console.log("📤 Detected message + feedback_id format");
        // Cast to unknown first, then to a type-safe record to access properties
        const responseObj = response as unknown as Record<string, unknown>;
        const feedbackId = responseObj.feedback_id ? String(responseObj.feedback_id) : undefined;
        const id = responseObj.id ? String(responseObj.id) : undefined;
        const submittedDate = responseObj.submitted_date ? String(responseObj.submitted_date) : undefined;
        setSubmissionDetails({
          success: true,
          id: feedbackId || id || "",
          submittedAt: submittedDate || new Date().toISOString(),
          summary: {
            email: emailPrefill.email,
            rating: rating ?? null,
            answers: answersPayload,
          },
        });
        return;
      }
      
      // PRIORITY 2: Standard format with success field
      if (response && typeof response === 'object' && 'success' in response) {
        if (response.success === true) {
          console.log("📤 Detected success: true format");
          setSubmissionDetails(response as SubmissionSuccess);
          return;
        }
        if (response.success === false) {
          const errorResponse = response as unknown as Record<string, unknown>;
          const errorMessage = errorResponse.error ? String(errorResponse.error) : 
                              errorResponse.message ? String(errorResponse.message) : 
                              "Submission failed.";
          throw new Error(errorMessage);
        }
      }
      
      // PRIORITY 3: Has ID field (any format with ID)
      if (response && typeof response === 'object' && ('id' in response || 'feedback_id' in response)) {
        console.log("📤 Detected ID format");
        const responseObj = response as unknown as Record<string, unknown>;
        const id = responseObj.id ? String(responseObj.id) : 
                   responseObj.feedback_id ? String(responseObj.feedback_id) : "";
        const submittedAt = responseObj.submittedAt ? String(responseObj.submittedAt) :
                           responseObj.submitted_date ? String(responseObj.submitted_date) :
                           new Date().toISOString();
        setSubmissionDetails({
          success: true,
          id: id,
          submittedAt: submittedAt,
          summary: responseObj.summary as SubmissionSuccess['summary'] || {
            email: emailPrefill.email,
            rating: rating,
            answers: answersPayload,
          },
        });
        return;
      }
      
      // PRIORITY 4: Has message field (could be success or error)
      if (response && typeof response === 'object' && 'message' in response) {
        const responseObj = response as unknown as Record<string, unknown>;
        // If message contains "success" or "submitted", treat as success
        const msg = responseObj.message ? String(responseObj.message).toLowerCase() : '';
        if (msg.includes('success') || msg.includes('submitted') || msg.includes('thank')) {
          console.log("📤 Detected success message format");
          const feedbackId = responseObj.feedback_id ? String(responseObj.feedback_id) : undefined;
          const id = responseObj.id ? String(responseObj.id) : undefined;
          const submittedDate = responseObj.submitted_date ? String(responseObj.submitted_date) : undefined;
          setSubmissionDetails({
            success: true,
            id: feedbackId || id || "",
            submittedAt: submittedDate || new Date().toISOString(),
            summary: {
              email: emailPrefill.email,
              rating: rating ?? null,
              answers: answersPayload,
            },
          });
          return;
        }
        // Otherwise it's an error message
        const errorMsg = responseObj.message ? String(responseObj.message) : "Submission failed.";
        throw new Error(errorMsg);
      }
      
      // PRIORITY 5: Any response object (treat as success if we got here without error)
      if (response && typeof response === 'object') {
        console.log("📤 Treating any response object as success");
        const responseObj = response as unknown as Record<string, unknown>;
        const feedbackId = responseObj.feedback_id ? String(responseObj.feedback_id) : undefined;
        const id = responseObj.id ? String(responseObj.id) : undefined;
        const submittedDate = responseObj.submitted_date ? String(responseObj.submitted_date) :
                             responseObj.submittedAt ? String(responseObj.submittedAt) :
                             undefined;
        setSubmissionDetails({
          success: true,
          id: feedbackId || id || "",
          submittedAt: submittedDate || new Date().toISOString(),
          summary: (responseObj.summary as SubmissionSuccess['summary']) || {
            email: emailPrefill.email,
            rating: rating ?? null,
            answers: answersPayload,
          },
        });
        return;
      }
      
      // PRIORITY 6: Empty/null response (treat as success - backend accepted it)
      console.log("📤 Empty response, treating as success");
      setSubmissionDetails({
        success: true,
        id: "",
        submittedAt: new Date().toISOString(),
        summary: {
          email: emailPrefill.email,
          rating: rating ?? null,
          answers: answersPayload,
        },
      });
    } catch (error: unknown) {
      console.error("Failed to submit feedback", error);
      
      // Extract error message - check multiple possible formats
      let errorMessage = "Failed to submit feedback. Please try again.";
      
      if (error instanceof Error && error.message) {
        errorMessage = error.message;
      } else if (error && typeof error === 'object' && 'detail' in error && typeof error.detail === 'string') {
        errorMessage = error.detail;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      // Check if it's a duplicate submission error
      if (errorMessage.toLowerCase().includes("already submitted") || 
          errorMessage.toLowerCase().includes("duplicate")) {
        // For duplicate submissions, show success message instead of error
        setSubmissionDetails({
          success: true,
          id: "",
          submittedAt: new Date().toISOString(),
          summary: {
            email: emailPrefill.email,
            rating: rating ?? null,
            answers: [],
          },
        });
        return; // Exit early, don't show error
      }
      
      setSubmissionError(errorMessage);
      if (error && typeof error === 'object') {
        const errorObj = error as Record<string, unknown>;
        if ('details' in errorObj && Array.isArray(errorObj.details)) {
          setSubmissionErrorDetails(errorObj.details as Array<{ loc: string[]; msg: string }>);
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submissionDetails) {
    return <ThankYouPage />;
  }

  return (
    <SurveyLayout>
      <div className="space-y-3 flex-1 flex flex-col overflow-hidden">
        {isCheckingStatus && (
          <div className="flex items-center justify-center py-4 text-sm text-gray-600 dark:text-gray-400">
            <span className="mr-3 inline-block h-4 w-4 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
            Checking survey status…
          </div>
        )}

        {surveyStatus && !surveyStatus.can_submit && !isCheckingStatus && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800 dark:border-blue-500/40 dark:bg-blue-500/10 dark:text-blue-200">
            <div className="flex items-start">
              <div className="text-lg mr-2">ℹ️</div>
              <div>
                <p className="font-medium mb-1">Feedback Already Submitted</p>
                <p>{surveyStatus.message}</p>
              </div>
            </div>
          </div>
        )}

        {submissionError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-200">
            {submissionError}
          </div>
        )}

        {questionError && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
            {questionError}
                    </div>
        )}

        {isLoadingQuestions ? (
          <div className="flex items-center justify-center py-12 text-sm text-gray-600 dark:text-gray-400">
            <span className="mr-3 inline-block h-5 w-5 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
            Loading questions…
          </div>
        ) : surveyStatus && !surveyStatus.can_submit ? (
          <div className="text-center py-8">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {surveyStatus.message}
            </p>
          </div>
        ) : (
          <MultiStepController
            steps={steps}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting || (surveyStatus !== null && !surveyStatus.can_submit)}
            submitLabel="Submit response"
            autoAdvance={false}
          />
        )}
      </div>
    </SurveyLayout>
  );
}
