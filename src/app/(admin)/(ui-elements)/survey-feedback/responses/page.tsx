"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SurveyIcons } from "@/components/icons/SurveyIcons";
import { Filter, ChevronUp, Download, ClipboardList } from "lucide-react";
import { getAllSurveyFeedback, deleteSurveyFeedback, getSurveyAnswersByEmail, getSurveyAnswersBySurveyIdAndEmail, getSurveyQuestions } from "@/utils/api";
import flatpickr from "flatpickr";
import "flatpickr/dist/flatpickr.css";
import DateRangePicker from "@/components/DateRangePicker";
import jsPDF from "jspdf";
import DashboardHeader from "@/components/header/DashboardHeader";

interface Response {
  feedback_id?: string;
  email: string;
  survey_id?: string;
  rating: number;
  comment: string;
  submitted_date: string;
  department?: string;
  answers?: AnswerItem[];
}

// Hover timing constants
const HOVER_ENTER_DELAY_MS = 180;
const HOVER_LEAVE_DELAY_MS = 120;

// Q/A popover truncation constants
const ANSWER_PREVIEW_LIMIT = 20;    // characters per answer before "..."
const POPUP_TOTAL_LIMIT = 50;       // total popup text length before overall "..."
const POPUP_DISPLAY_RATIO = 0.7;    // show 70% of POPUP_TOTAL_LIMIT when exceeding

// View modal constant
const VIEW_MODAL_TITLE = "View Survey Response";

// Helper: Get first word from text
const getFirstWord = (text: string): string => {
  if (!text || !text.trim()) return '';
  const firstWord = text.trim().split(/\s+/)[0];
  return firstWord.length > 10 ? firstWord.substring(0, 10) + '...' : firstWord + '...';
};

// Helper: Truncate text at word boundary if possible, otherwise at limit
// Used for per-answer preview truncation
const truncateAtWordBoundary = (text: string, limit: number): string => {
  if (!text || text.length <= limit) return text;

  // Try to find the last space before the limit
  const truncated = text.substring(0, limit);
  const lastSpace = truncated.lastIndexOf(' ');

  if (lastSpace > limit * 0.7) {
    // If we found a space reasonably close to the limit, use it
    return text.substring(0, lastSpace) + '...';
  }

  // Otherwise, truncate at limit
  return truncated + '...';
};

// Helper: Safe truncation for overall popup text with 70% rule
// Shows 70% of POPUP_TOTAL_LIMIT when exceeding, preferring word boundaries
// Algorithm: Compute displayLimit = floor(limit * 0.7), take substring,
// attempt to trim to last whitespace if > 50% of displayLimit, else use as-is
const safeTruncate = (text: string, limit: number, preferWordBoundary: boolean = true): string => {
  if (!text || text.length <= limit) return text;

  // Compute display limit: 70% of the limit (rounded down)
  const displayLimit = Math.floor(limit * POPUP_DISPLAY_RATIO);

  // Take substring candidate
  let candidate = text.substring(0, displayLimit);

  if (preferWordBoundary) {
    // Attempt to trim to last whitespace inside candidate
    // Find last whitespace character (space, tab, newline) in candidate
    const lastSpace = candidate.lastIndexOf(' ');
    const lastTab = candidate.lastIndexOf('\t');
    const lastNewline = candidate.lastIndexOf('\n');
    const lastWhitespace = Math.max(lastSpace, lastTab, lastNewline);

    // Only use word boundary if it's > 50% of displayLimit (to avoid too aggressive trimming)
    if (lastWhitespace > displayLimit * 0.5) {
      candidate = text.substring(0, lastWhitespace);
    }
  }

  // Remove trailing non-printable whitespace
  candidate = candidate.trimEnd();

  // Append ellipsis
  return candidate + '...';
};

// Parse multiple Q/A pairs from comment text
interface QAPair {
  question: string;
  answer: string;
}

interface AnswerItem {
  answer_id?: string;
  question_id?: string;
  question_text?: string;
  answer_text?: string;
  answer?: string;
  survey_id?: string;
  user_email?: string;
  submitted_at?: string;
  question_order?: string;
}

interface QAItem {
  question?: string;
  Question?: string;
  q?: string;
  answer?: string;
  Answer?: string;
  a?: string;
}

interface ResponseWithAny {
  answers?: AnswerItem[];
  qas?: QAItem[];
  comment?: string;
  details?: string;
  [key: string]: unknown;
}

interface QuestionItem {
  question_id: string;
  question_text: string;
  question_type?: string;
  question_order?: string;
}

interface QuestionsResponse {
  questions?: QuestionItem[];
  data?: QuestionItem[];
}

interface ViewResponseDetails {
  answers?: AnswerItem[];
  questions?: QuestionItem[];
  [key: string]: unknown;
}

// Helper: Get Q/A pairs from response object (supports answers API, structured arrays, and text parsing)
// Priority: 1) response.answers (from API), 2) response.qas array, 3) parse from comment text
const getQaPairs = (response: ResponseWithAny): QAPair[] => {
  if (!response) return [];

  // Priority 1: If response has answers array from API, use it
  if (Array.isArray(response.answers) && response.answers.length > 0) {
    return response.answers.map((ans: AnswerItem) => ({
      question: ans.question_text || `Question ${ans.question_id || ''}`.trim() || 'Question',
      answer: ans.answer_text || ans.answer || ''
    })); // Removed filter to show all answers including "Not Answered"
  }

  // Priority 2: If response has structured qas array, use it
  if (Array.isArray(response.qas) && response.qas.length > 0) {
    return response.qas.map((qa: QAItem) => ({
      question: qa.question || qa.Question || qa.q || '',
      answer: qa.answer || qa.Answer || qa.a || ''
    })).filter((pair: QAPair) => pair.question || pair.answer);
  }

  // Priority 3: Parse from comment text
  // Try both the full comment and the comment field
  const comment = response.comment || response.details || '';
  if (!comment || !comment.trim()) return [];

  // Try parsing from full comment first (in case General Comment extraction removed Q/A)
  const pairsFromFull = parseMultipleQAPairs(comment);
  if (pairsFromFull.length > 0) {
    return pairsFromFull;
  }

  // If no Q/A found, try parsing from comment without General Comment extraction
  // This handles cases where Q/A might be mixed with General Comment
  const hasQAMarkers = /(?:Question|Answer|Q|A)[:\-]?/i.test(comment);
  if (hasQAMarkers) {
    // Try a more aggressive parse that doesn't remove General Comment first
    return parseMultipleQAPairs(comment);
  }

  return [];
};

const parseMultipleQAPairs = (comment: string): QAPair[] => {
  if (!comment || !comment.trim()) return [];

  const trimmedComment = comment.trim();
  const pairs: QAPair[] = [];

  // Extract Q/A section - everything after General Comment if present
  let qaSection = trimmedComment;
  const generalCommentMatch = trimmedComment.match(/General\s+Comment[:\-]?\s*([^|]*?)(?:\s*\||\s*Question:|$)/i);
  if (generalCommentMatch) {
    const generalCommentEnd = generalCommentMatch.index! + generalCommentMatch[0].length;
    qaSection = trimmedComment.substring(generalCommentEnd).trim();
  }

  // If no Q/A markers found, return empty
  if (!qaSection.match(/Question:|Answer:|Q:|A:/i)) {
    return [];
  }

  // Normalize separators: replace | with newline for easier parsing
  qaSection = qaSection.replace(/\s*\|\s*/g, '\n');

  // Method 1: Use regex to find all Question/Answer pairs in order
  // Pattern: Question: ... (Answer: ... or end of text/next Question)
  const questionRegex = /Question[:\-]?\s*([\s\S]*?)(?=\s*(?:Answer:|Question:|$))/gi;
  let questionMatch;
  const questionPositions: Array<{ index: number; text: string; endIndex: number }> = [];

  while ((questionMatch = questionRegex.exec(qaSection)) !== null) {
    questionPositions.push({
      index: questionMatch.index,
      text: questionMatch[1].trim(),
      endIndex: questionMatch.index + questionMatch[0].length
    });
  }

  // For each question, find its corresponding answer
  for (let i = 0; i < questionPositions.length; i++) {
    const qPos = questionPositions[i];
    const nextQPos = questionPositions[i + 1];
    const afterQuestion = qaSection.substring(qPos.endIndex);

    // Find Answer after this question (before next question or end)
    const answerMatch = afterQuestion.match(/Answer[:\-]?\s*([\s\S]*?)(?=\s*(?:Question:|$))/i);
    let answerText = '';

    if (answerMatch) {
      answerText = answerMatch[1].trim();
      // If there's a next question, limit answer to before it
      if (nextQPos && answerMatch.index !== undefined) {
        const answerEndPos = qPos.endIndex + answerMatch.index + answerMatch[0].length;
        if (answerEndPos > nextQPos.index) {
          answerText = afterQuestion.substring(answerMatch.index + answerMatch[0].length, nextQPos.index - qPos.endIndex).trim();
        }
      }
    }

    pairs.push({
      question: qPos.text,
      answer: answerText
    });
  }

  // Method 2: If regex method didn't work, try line-by-line parsing
  if (pairs.length === 0) {
    const lines = qaSection.split(/\n+/);
    let currentQuestion = '';
    let currentAnswer = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Check for Question: marker (case-insensitive, supports Q: as well)
      const questionMatch = line.match(/(?:Question|Q)[:\-]?\s*(.*)/i);
      if (questionMatch) {
        // If we have a previous pair, save it
        if (currentQuestion || currentAnswer) {
          pairs.push({
            question: currentQuestion,
            answer: currentAnswer
          });
        }
        // Start new pair
        currentQuestion = questionMatch[1].trim();
        currentAnswer = '';
        continue;
      }

      // Check for Answer: marker (case-insensitive, supports A: as well)
      const answerMatch = line.match(/(?:Answer|A)[:\-]?\s*(.*)/i);
      if (answerMatch) {
        currentAnswer = answerMatch[1].trim();
        continue;
      }

      // If we're in a question context and no answer yet, append to question
      if (currentQuestion && !currentAnswer && line) {
        currentQuestion += ' ' + line;
        currentQuestion = currentQuestion.trim();
      }
      // If we're in an answer context, append to answer
      else if (currentAnswer && line) {
        currentAnswer += ' ' + line;
        currentAnswer = currentAnswer.trim();
      }
    }

    // Add the last pair if exists
    if (currentQuestion || currentAnswer) {
      pairs.push({
        question: currentQuestion,
        answer: currentAnswer
      });
    }
  }

  // Method 3: Final fallback - simple pattern matching for single Q/A
  if (pairs.length === 0) {
    const questionMatch = qaSection.match(/(?:Question|Q)[:\-]?\s*([^|]*?)(?:\s*\||\s*(?:Answer|A):|$)/i);
    const answerMatch = qaSection.match(/(?:Answer|A)[:\-]?\s*([^|]*?)(?:\s*\||$)/i);

    if (questionMatch || answerMatch) {
      pairs.push({
        question: questionMatch ? questionMatch[1].trim() : '',
        answer: answerMatch ? answerMatch[1].trim() : ''
      });
    }
  }

  // Method 4: Very lenient - try to find any pattern that looks like Q/A
  // This handles cases like "01: qqqq" or "Q1: ... A1: ..."
  if (pairs.length === 0) {
    // Look for patterns like "01:", "Q1:", "1:", etc. followed by text, then "Answer" or "A"
    const lenientPattern = /(?:Q|Question|^\d+)[:\-]?\s*([^\n|]*?)(?:\s*\||\s*(?:A|Answer)[:\-]?\s*([^\n|]*?)(?:\s*\||$)|$)/gi;
    let lenientMatch;
    while ((lenientMatch = lenientPattern.exec(qaSection)) !== null && pairs.length < 10) {
      const questionText = lenientMatch[1]?.trim();
      const answerText = lenientMatch[2]?.trim();
      if (questionText || answerText) {
        pairs.push({
          question: questionText || '',
          answer: answerText || ''
        });
      }
    }
  }

  return pairs;
};

// Format Q/A pairs for popover display with truncation rules
// Algorithm:
// 1. Parse ordered Q/A pairs from comment (existing regex logic)
// 2. For each pair: Keep Question text fully, create Answer preview (first ANSWER_PREVIEW_LIMIT chars)
// 3. Format block: "Question: ${question}\nAnswer: ${answerPreview}"
// 4. Join blocks with \n\n (double newline) into fullPopupText
// 5. If fullPopupText.length <= POPUP_TOTAL_LIMIT, render as-is
// 6. If fullPopupText.length > POPUP_TOTAL_LIMIT, apply 70% rule with word boundary preference
const formatQAPairsForPopover = (pairs: QAPair[]): string => {
  if (pairs.length === 0) {
    return 'No Q/A available';
  }

  const blocks: string[] = [];

  for (const pair of pairs) {
    const questionText = pair.question || '';
    let answerText = pair.answer || '';

    // Create Answer preview: first ANSWER_PREVIEW_LIMIT characters; if clipped, append "..."
    if (answerText.length > ANSWER_PREVIEW_LIMIT) {
      answerText = truncateAtWordBoundary(answerText, ANSWER_PREVIEW_LIMIT);
    } else if (!answerText) {
      // If answer is missing, show "—"
      answerText = '—';
    }

    // Build block: "Question: <full question>\nAnswer: <preview>"
    const block = `Question: ${questionText}\nAnswer: ${answerText}`;
    blocks.push(block);
  }

  // Join blocks with double newline into fullPopupText
  let fullPopupText = blocks.join('\n\n');

  // Apply overall truncation if total length exceeds POPUP_TOTAL_LIMIT
  // Use 70% rule: show 70% of POPUP_TOTAL_LIMIT, preferring word boundaries
  if (fullPopupText.length > POPUP_TOTAL_LIMIT) {
    fullPopupText = safeTruncate(fullPopupText, POPUP_TOTAL_LIMIT, true);
  }

  return fullPopupText;
};

// Parse comment to extract General Comment and Q/A separately
const parseComment = (comment: string): { generalComment: string; question: string; answer: string } => {
  if (!comment) return { generalComment: '', question: '', answer: '' };

  const trimmedComment = comment.trim();

  // Extract General Comment (handles "General Comment:" or "General Comment" variations)
  const generalCommentMatch = trimmedComment.match(/General\s+Comment[:\-]?\s*([^|]*?)(?:\s*\||\s*Question:|$)/i);
  let generalComment = generalCommentMatch ? generalCommentMatch[1].trim() : '';

  // Extract Q/A section - everything after General Comment
  let qaSection = trimmedComment;

  // If General Comment found, remove it from qaSection
  if (generalCommentMatch) {
    const generalCommentEnd = generalCommentMatch.index! + generalCommentMatch[0].length;
    qaSection = trimmedComment.substring(generalCommentEnd).trim();
  }

  // If no General Comment marker found but has Q/A markers, treat everything as Q/A
  if (!generalComment && (trimmedComment.match(/Question:|Answer:/i))) {
    generalComment = '';
    qaSection = trimmedComment;
  }

  // If no Q/A markers and no General Comment marker, treat entire as General Comment
  if (!generalComment && !trimmedComment.match(/Question:|Answer:/i)) {
    generalComment = trimmedComment;
    qaSection = '';
  }

  // Extract Question and Answer from Q/A section
  let question = '';
  let answer = '';

  if (qaSection) {
    // Try to extract Question: ... | Answer: ... pattern
    const questionMatch = qaSection.match(/Question[:\-]?\s*([^|]*?)(?:\s*\||\s*Answer:|$)/i);
    const answerMatch = qaSection.match(/Answer[:\-]?\s*([^|]*?)(?:\s*\||$)/i);

    if (questionMatch) {
      question = questionMatch[1].trim();
    }

    if (answerMatch) {
      answer = answerMatch[1].trim();
    }

    // Fallback: try variations like "Q:" or "A:"
    if (!question && !answer) {
      const qMatch = qaSection.match(/(?:Q|Question)[:\-]?\s*([^|]*?)(?:\s*\||\s*(?:A|Answer)|$)/i);
      const aMatch = qaSection.match(/(?:A|Answer)[:\-]?\s*([^|]*?)(?:\s*\||$)/i);

      if (qMatch) question = qMatch[1].trim();
      if (aMatch) answer = aMatch[1].trim();
    }
  }

  return {
    generalComment: generalComment || '',
    question: question || '',
    answer: answer || ''
  };
};

// Comment Cell with Popover Component
const CommentCellWithPopover: React.FC<{
  text: string;
  cellId: string;
}> = ({ text, cellId }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<'above' | 'below'>('below');
  const cellRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const enterTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const leaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate popover position
  useEffect(() => {
    if (isOpen && cellRef.current && popoverRef.current) {
      const cellRect = cellRef.current.getBoundingClientRect();
      const popoverHeight = popoverRef.current.offsetHeight || 150;
      const spaceBelow = window.innerHeight - cellRect.bottom;
      const spaceAbove = cellRect.top;

      if (spaceBelow < popoverHeight && spaceAbove > spaceBelow) {
        setPosition('above');
      } else {
        setPosition('below');
      }
    }
  }, [isOpen]);

  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen]);

  const handleMouseEnter = () => {
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
      leaveTimeoutRef.current = null;
    }
    enterTimeoutRef.current = setTimeout(() => {
      setIsOpen(true);
    }, HOVER_ENTER_DELAY_MS);
  };

  const handleMouseLeave = () => {
    if (enterTimeoutRef.current) {
      clearTimeout(enterTimeoutRef.current);
      enterTimeoutRef.current = null;
    }
    leaveTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, HOVER_LEAVE_DELAY_MS);
  };

  const handleFocus = () => {
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
    }
    setIsOpen(true);
  };

  const handleBlur = () => {
    leaveTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, HOVER_LEAVE_DELAY_MS);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsOpen(!isOpen);
    }
  };

  if (!text || text.trim() === '') {
    return (
      <div className="text-sm text-gray-400 dark:text-gray-500">
        <span className="text-xs">—</span>
      </div>
    );
  }

  const previewText = getFirstWord(text);

  return (
    <div
      ref={cellRef}
      className="relative inline-block w-full"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
    >
      <div
        tabIndex={0}
        onKeyDown={handleKeyDown}
        className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 rounded px-1"
        role="button"
        aria-label="View full comment"
        aria-describedby={isOpen ? `popover-${cellId}` : undefined}
      >
        {previewText}
      </div>

      <AnimatePresence>
        {isOpen && text && (
          <motion.div
            ref={popoverRef}
            id={`popover-${cellId}`}
            role="tooltip"
            initial={{ opacity: 0, scale: 0.95, y: position === 'above' ? 10 : -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: position === 'above' ? 10 : -10 }}
            transition={{ duration: 0.12, ease: "easeOut" }}
            className={`absolute z-50 ${position === 'above' ? 'bottom-full mb-2' : 'top-full mt-2'} left-0 w-[320px] bg-white dark:bg-gray-800 rounded-lg shadow-lg shadow-gray-200 dark:shadow-gray-900 border border-gray-200 dark:border-gray-700 p-3`}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <div className="space-y-2">
              <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                General Comment
              </div>
              <div className="text-sm text-gray-900 dark:text-white whitespace-pre-line break-words">
                {text}
              </div>
            </div>
            {/* Arrow */}
            <div
              className={`absolute left-4 w-0 h-0 ${position === 'above'
                ? 'top-full border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-200 dark:border-t-gray-700'
                : 'bottom-full border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-200 dark:border-b-gray-700'
                }`}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Enterprise Date Picker Component - Reserved for future use (currently unused)
/* eslint-disable @typescript-eslint/no-unused-vars */
interface EnterpriseDatePickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const EnterpriseDatePicker: React.FC<EnterpriseDatePickerProps> = ({
  value,
  onChange,
  placeholder = "Select date"
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const flatpickrInstanceRef = useRef<flatpickr.Instance | null>(null);

  useEffect(() => {
    if (!inputRef.current) return;

    const inputElement = inputRef.current;
    const uniqueId = `date-picker-${Math.random().toString(36).substr(2, 9)}`;
    inputElement.id = uniqueId;

    // Initialize flatpickr
    const fpInstance: flatpickr.Instance | flatpickr.Instance[] = flatpickr(`#${uniqueId}`, {
      dateFormat: "Y-m-d",
      defaultDate: value || undefined,
      allowInput: true,
      clickOpens: true,
      static: false,
      appendTo: document.body,
      enableTime: false,
      monthSelectorType: "static",
      animate: true,
      locale: {
        firstDayOfWeek: 1, // Monday
      },
      onReady: (_selectedDates, _dateStr, instance) => {
        if (instance?.calendarContainer) {
          const calendarEl = instance.calendarContainer as HTMLElement;
          calendarEl.style.zIndex = "99999";
          calendarEl.style.position = "fixed";
        }
      },
      onChange: (selectedDates, dateStr) => {
        onChange(dateStr);
      },
      onOpen: (_selectedDates, _dateStr, instance) => {
        // Manually position the calendar relative to the input field
        const positionCalendar = () => {
          if (instance?.calendarContainer && inputElement) {
            const calendarEl = instance.calendarContainer as HTMLElement;
            const inputRect = inputElement.getBoundingClientRect();

            // Force calendar to be visible and positioned to get accurate dimensions
            calendarEl.style.visibility = "visible";
            calendarEl.style.display = "block";
            calendarEl.style.position = "fixed";
            calendarEl.style.top = "0px";
            calendarEl.style.left = "0px";

            // Force a reflow to ensure dimensions are calculated
            void calendarEl.offsetHeight;

            // Get actual calendar dimensions after it's rendered
            // Use getBoundingClientRect for more accurate dimensions
            const calendarRect = calendarEl.getBoundingClientRect();
            const calendarHeight = calendarRect.height || calendarEl.offsetHeight || calendarEl.scrollHeight || 350;
            const calendarWidth = calendarRect.width || calendarEl.offsetWidth || calendarEl.scrollWidth || 300;
            const viewportHeight = window.innerHeight;
            const viewportWidth = window.innerWidth;

            // Calculate available space below and above the input
            const spaceBelow = viewportHeight - inputRect.bottom;
            const spaceAbove = inputRect.top;

            // Position horizontally - align with input left edge, but keep within viewport
            let left = inputRect.left;
            if (left + calendarWidth > viewportWidth - 10) {
              left = viewportWidth - calendarWidth - 10; // 10px margin from right edge
            }
            if (left < 10) {
              left = 10; // 10px margin from left edge
            }

            // Position vertically - prefer below, but use above if not enough space
            let top: number;
            const minSpace = 10; // Minimum margin from viewport edges

            if (spaceBelow >= calendarHeight + minSpace) {
              // Enough space below - position below the input
              top = inputRect.bottom + 5;
            } else if (spaceAbove >= calendarHeight + minSpace) {
              // Not enough space below, but enough above - position above
              top = inputRect.top - calendarHeight - 5;
            } else {
              // Not enough space either way - position where there's more space
              if (spaceBelow > spaceAbove) {
                // More space below, position at bottom of viewport
                top = viewportHeight - calendarHeight - minSpace;
              } else {
                // More space above, position at top of viewport
                top = minSpace;
              }
            }

            // Final bounds check - ensure calendar is fully within viewport
            if (top < minSpace) {
              top = minSpace;
            }
            if (top + calendarHeight > viewportHeight - minSpace) {
              top = viewportHeight - calendarHeight - minSpace;
            }
            if (left < minSpace) {
              left = minSpace;
            }
            if (left + calendarWidth > viewportWidth - minSpace) {
              left = viewportWidth - calendarWidth - minSpace;
            }

            // Force fixed positioning and set coordinates
            calendarEl.style.position = "fixed";
            calendarEl.style.top = `${top}px`;
            calendarEl.style.left = `${left}px`;
            calendarEl.style.zIndex = "99999";
            calendarEl.style.margin = "0";
            calendarEl.style.transform = "none";
            calendarEl.style.visibility = "visible";
            calendarEl.style.overflow = "visible";
            calendarEl.style.maxHeight = "none";
            calendarEl.style.maxWidth = "none";
          }
        };

        // Use requestAnimationFrame to ensure calendar is rendered first
        requestAnimationFrame(() => {
          // Wait for calendar to be fully rendered
          const checkAndPosition = () => {
            if (instance?.calendarContainer) {
              const calendarEl = instance.calendarContainer as HTMLElement;
              // Check if calendar has valid dimensions
              const hasDimensions = calendarEl.offsetHeight > 0 && calendarEl.offsetWidth > 0;

              if (hasDimensions) {
                positionCalendar();
              } else {
                // If dimensions aren't ready, try again
                setTimeout(checkAndPosition, 10);
              }
            }
          };

          // Start checking
          checkAndPosition();

          // Also try after delays as fallback
          setTimeout(() => {
            positionCalendar();
          }, 100);

          setTimeout(() => {
            positionCalendar();
          }, 200);
        });
      },
      onClose: () => {
        // Calendar closed
      },
    });

    // Handle flatpickr return type (can be Instance or Instance[])
    if (Array.isArray(fpInstance)) {
      flatpickrInstanceRef.current = fpInstance[0];
    } else {
      flatpickrInstanceRef.current = fpInstance;
    }

    // Update flatpickr when value changes externally
    if (value && flatpickrInstanceRef.current) {
      flatpickrInstanceRef.current.setDate(value, false);
    }

    return () => {
      if (flatpickrInstanceRef.current) {
        flatpickrInstanceRef.current.destroy();
        flatpickrInstanceRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update flatpickr when value prop changes
  useEffect(() => {
    if (flatpickrInstanceRef.current && value !== flatpickrInstanceRef.current.input.value) {
      if (value) {
        flatpickrInstanceRef.current.setDate(value, false);
      } else {
        flatpickrInstanceRef.current.clear();
      }
    }
  }, [value]);

  // Format display value
  const formatDisplayDate = (dateStr: string): string => {
    if (!dateStr) return "";
    try {
      const date = new Date(dateStr + "T00:00:00");
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
    if (flatpickrInstanceRef.current) {
      flatpickrInstanceRef.current.clear();
    }
  };

  return (
    <div className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          readOnly
          value={value ? formatDisplayDate(value) : ""}
          placeholder={placeholder}
          className="w-full py-2.5 pl-10 pr-8 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-all cursor-pointer"
        />
        {/* Calendar Icon */}
        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
          <svg
            className="w-5 h-5 text-gray-400 dark:text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </div>
        {/* Clear Button */}
        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors focus:outline-none"
            aria-label="Clear date"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Custom Flatpickr Styling */}
      <style jsx global>{`
        .flatpickr-calendar {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
          font-family: inherit;
          padding: 0.5rem;
          position: fixed !important;
          z-index: 99999 !important;
          overflow: visible !important;
          max-height: none !important;
          max-width: none !important;
          clip: auto !important;
          clip-path: none !important;
        }
        
        .flatpickr-calendar.open {
          display: block !important;
          visibility: visible !important;
        }
        
        .flatpickr-calendar.flatpickr-calendar.open {
          overflow: visible !important;
        }
        
        .flatpickr-wrapper {
          overflow: visible !important;
        }
        
        body > .flatpickr-calendar {
          overflow: visible !important;
          max-height: none !important;
        }
       
        .dark .flatpickr-calendar {
          background: #1f2937;
          border-color: #374151;
          color: #f9fafb;
        }
       
        .flatpickr-months {
          margin-bottom: 0.5rem;
        }
       
        .flatpickr-month {
          color: #111827;
          fill: #111827;
          height: 2.5rem;
          line-height: 2.5rem;
        }
       
        .dark .flatpickr-month {
          color: #f9fafb;
          fill: #f9fafb;
        }
       
        .flatpickr-prev-month,
        .flatpickr-next-month {
          padding: 0.5rem;
          border-radius: 0.375rem;
          transition: background-color 0.2s;
        }
       
        .flatpickr-prev-month:hover,
        .flatpickr-next-month:hover {
          background-color: #f3f4f6;
        }
       
        .dark .flatpickr-prev-month:hover,
        .dark .flatpickr-next-month:hover {
          background-color: #374151;
        }
       
        .flatpickr-current-month {
          font-size: 0.875rem;
          font-weight: 600;
          padding: 0.5rem 0;
        }
       
        .flatpickr-weekdays {
          background: transparent;
          border-bottom: 1px solid #e5e7eb;
          margin-bottom: 0.5rem;
        }
       
        .dark .flatpickr-weekdays {
          border-bottom-color: #374151;
        }
       
        .flatpickr-weekday {
          color: #6b7280;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          padding: 0.5rem 0;
        }
       
        .dark .flatpickr-weekday {
          color: #9ca3af;
        }
       
        .flatpickr-days {
          padding: 0.25rem 0;
        }
       
        .flatpickr-day {
          border-radius: 0.375rem;
          color: #111827;
          font-size: 0.875rem;
          height: 2rem;
          line-height: 2rem;
          margin: 0.125rem;
          transition: all 0.2s;
        }
       
        .dark .flatpickr-day {
          color: #f9fafb;
        }
       
        .flatpickr-day:hover {
          background: #f3f4f6;
          border-color: #f3f4f6;
        }
       
        .dark .flatpickr-day:hover {
          background: #374151;
          border-color: #374151;
        }
       
        .flatpickr-day.selected,
        .flatpickr-day.startRange,
        .flatpickr-day.endRange {
          background: #3b82f6;
          border-color: #3b82f6;
          color: white;
          font-weight: 600;
        }
       
        .flatpickr-day.selected:hover,
        .flatpickr-day.startRange:hover,
        .flatpickr-day.endRange:hover {
          background: #2563eb;
          border-color: #2563eb;
        }
       
        .flatpickr-day.today {
          border-color: #3b82f6;
          font-weight: 600;
        }
       
        .flatpickr-day.today:hover {
          background: #dbeafe;
        }
       
        .dark .flatpickr-day.today:hover {
          background: #1e3a8a;
        }
       
        .flatpickr-day.flatpickr-disabled,
        .flatpickr-day.prevMonthDay,
        .flatpickr-day.nextMonthDay {
          color: #d1d5db;
          opacity: 0.5;
        }
       
        .dark .flatpickr-day.flatpickr-disabled,
        .dark .flatpickr-day.prevMonthDay,
        .dark .flatpickr-day.nextMonthDay {
          color: #6b7280;
        }
       
        .flatpickr-day.flatpickr-disabled:hover {
          background: transparent;
        }
      `}</style>
    </div>
  );
};
/* eslint-enable @typescript-eslint/no-unused-vars */

// Q/A Cell with Popover Component
const QACellWithPopover: React.FC<{
  response: Response;
  cellId: string;
}> = ({ response, cellId }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<'above' | 'below'>('below');
  const cellRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const enterTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const leaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Get Q/A pairs from response (prioritizes answers API, then qas array, then comment parsing)
  const qaPairs = getQaPairs(response as unknown as ResponseWithAny);
  const hasQA = qaPairs.length > 0;

  // Format popover content
  const popoverContent = formatQAPairsForPopover(qaPairs);

  // Get preview text for cell display
  // Show at least 5 characters for all responses
  const getPreviewText = (): string => {
    if (!hasQA || qaPairs.length === 0) {
      return 'Q/A...';
    }

    const firstPair = qaPairs[0];
    let content = '';

    // Prefer question, fallback to answer
    if (firstPair.question) {
      content = firstPair.question;
    } else if (firstPair.answer) {
      content = firstPair.answer;
    }

    if (!content) {
      return 'Q/A...';
    }

    // Show at least 5 characters, then "..."
    const trimmed = content.trim();
    if (trimmed.length <= 5) {
      return trimmed;
    }

    // Show first 5 characters + "..."
    return trimmed.substring(0, 5) + '...';
  };

  const previewText = getPreviewText();

  // Calculate popover position
  useEffect(() => {
    if (isOpen && cellRef.current && popoverRef.current) {
      const cellRect = cellRef.current.getBoundingClientRect();
      const popoverHeight = popoverRef.current.offsetHeight || 150;
      const spaceBelow = window.innerHeight - cellRect.bottom;
      const spaceAbove = cellRect.top;

      if (spaceBelow < popoverHeight && spaceAbove > spaceBelow) {
        setPosition('above');
      } else {
        setPosition('below');
      }
    }
  }, [isOpen]);

  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen]);

  const handleMouseEnter = () => {
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
      leaveTimeoutRef.current = null;
    }
    enterTimeoutRef.current = setTimeout(() => {
      setIsOpen(true);
    }, HOVER_ENTER_DELAY_MS);
  };

  const handleMouseLeave = () => {
    if (enterTimeoutRef.current) {
      clearTimeout(enterTimeoutRef.current);
      enterTimeoutRef.current = null;
    }
    leaveTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, HOVER_LEAVE_DELAY_MS);
  };

  const handleFocus = () => {
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
    }
    setIsOpen(true);
  };

  const handleBlur = () => {
    leaveTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, HOVER_LEAVE_DELAY_MS);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsOpen(!isOpen);
    }
  };

  // Show dash if no Q/A found
  if (!hasQA) {
    return (
      <div className="text-sm text-gray-400 dark:text-gray-500">
        <span className="text-xs">—</span>
      </div>
    );
  }

  return (
    <div
      ref={cellRef}
      className="relative inline-block w-full"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
    >
      <div
        tabIndex={0}
        onKeyDown={handleKeyDown}
        className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 rounded px-1 italic"
        role="button"
        aria-label="View Q/A"
        aria-describedby={isOpen ? `qa-popover-${cellId}` : undefined}
      >
        {previewText}
      </div>

      <AnimatePresence>
        {isOpen && hasQA && (
          <motion.div
            ref={popoverRef}
            id={`qa-popover-${cellId}`}
            role="tooltip"
            initial={{ opacity: 0, scale: 0.95, y: position === 'above' ? 10 : -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: position === 'above' ? 10 : -10 }}
            transition={{ duration: 0.12, ease: "easeOut" }}
            className={`absolute z-50 ${position === 'above' ? 'bottom-full mb-2' : 'top-full mt-2'} left-0 w-[320px] bg-white dark:bg-gray-800 rounded-lg shadow-lg shadow-gray-200 dark:shadow-gray-900 border border-gray-200 dark:border-gray-700 p-3`}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <div className="text-sm text-gray-900 dark:text-white whitespace-pre-line break-words">
              {popoverContent}
            </div>
            {/* Arrow */}
            <div
              className={`absolute left-4 w-0 h-0 ${position === 'above'
                ? 'top-full border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-200 dark:border-t-gray-700'
                : 'bottom-full border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-200 dark:border-b-gray-700'
                }`}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const ResponsesPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [scoreFilter, setScoreFilter] = useState("");
  const [timelineFilter, setTimelineFilter] = useState("");
  const [customDateRange, setCustomDateRange] = useState<[Date | null, Date | null]>([null, null]);
  const [showFilters, setShowFilters] = useState(false);
  const [responses, setResponses] = useState<Response[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const [viewResponse, setViewResponse] = useState<Response | null>(null);
  const [viewResponseDetails, setViewResponseDetails] = useState<ViewResponseDetails | null>(null);
  const [viewResponseLoading, setViewResponseLoading] = useState(false);
  const [viewResponseError, setViewResponseError] = useState<string | null>(null);
  const lastFocusedElementRef = useRef<HTMLElement | null>(null);
  const [, setQuestionsMap] = useState<Record<string, string>>({});
  const [allQuestions, setAllQuestions] = useState<Array<{
    question_id: string;
    question_text: string;
    question_type?: string;
    question_order?: string;
  }>>([]);

  // Handle delete feedback
  const handleDelete = async (feedbackId: string) => {
    try {
      setDeleteLoading(feedbackId);
      console.log('🗑️ Deleting feedback:', feedbackId);
      await deleteSurveyFeedback(feedbackId);

      // Remove from local state after successful deletion
      setResponses(prev => prev.filter(r => r.feedback_id !== feedbackId));
      setDeleteConfirm(null);
      console.log('✅ Feedback deleted successfully');
    } catch (err) {
      console.error('❌ Error deleting feedback:', err);
      alert('Failed to delete feedback. Please try again.');
    } finally {
      setDeleteLoading(null);
    }
  };

  // Fetch data from API
  useEffect(() => {
    const fetchResponses = async () => {
      try {
        setLoading(true);
        console.log('📋 Fetching survey responses...');

        // Fetch questions first to create a map and store all questions
        const questionsMap: Record<string, string> = {};
        let questions: QuestionItem[] = [];
        const questionOrderMap: Record<string, string> = {};

        try {
          const questionsData = await getSurveyQuestions() as unknown as QuestionsResponse | QuestionItem[];
          // Handle different response formats
          if (Array.isArray(questionsData)) {
            questions = questionsData;
          } else if (questionsData?.questions && Array.isArray(questionsData.questions)) {
            questions = questionsData.questions;
          } else if (questionsData?.data && Array.isArray(questionsData.data)) {
            questions = questionsData.data;
          }

          // Sort questions by question_order if available
          questions.sort((a: QuestionItem, b: QuestionItem) => {
            const orderA = parseInt(a.question_order || '0', 10);
            const orderB = parseInt(b.question_order || '0', 10);
            return orderA - orderB;
          });

          // Create maps for question text and question order
          questions.forEach((q: QuestionItem) => {
            if (q.question_id) {
              questionsMap[q.question_id] = q.question_text || '';
              questionOrderMap[q.question_id] = q.question_order || '0';
            }
          });
          setQuestionsMap(questionsMap);
          setAllQuestions(questions);
          console.log('📋 Questions map created:', questionsMap);
          console.log('📋 Question order map created:', questionOrderMap);
          console.log('📋 All questions stored:', questions);
        } catch (err) {
          console.warn('⚠️ Failed to fetch questions:', err);
        }

        const response = await getAllSurveyFeedback();
        console.log('📋 Responses data received:', response);

        const data = response.feedbacks || [];
        console.log('📋 Processed data:', data);
        console.log('📋 Data length:', data.length);

        // Fetch answers for each response using survey_id
        const responsesWithAnswers = await Promise.all(
          data.map(async (resp: Response) => {
            try {
              // Use survey_id if available, otherwise fallback to email only
              let answersData: { answers: AnswerItem[] } = { answers: [] };
              let answersFetched = false;

              if (resp.survey_id) {
                try {
                  const allAnswersBySurvey = await getSurveyAnswersBySurveyIdAndEmail(resp.survey_id, resp.email);
                  console.log(`📋 Fetched answers by survey_id for ${resp.email} (survey: ${resp.survey_id}):`, allAnswersBySurvey);

                  // Filter answers to match this response's submission date
                  // This ensures each response shows only its own answers, not answers from other submissions
                  if (allAnswersBySurvey.answers && allAnswersBySurvey.answers.length > 0) {
                    const responseDate = new Date(resp.submitted_date);
                    const filteredAnswers = allAnswersBySurvey.answers.filter((ans: AnswerItem) => {
                      if (!ans.submitted_at) return false;
                      const answerDate = new Date(ans.submitted_at);
                      // Match if submitted within 1 minute of response date (to handle slight time differences)
                      const timeDiff = Math.abs(responseDate.getTime() - answerDate.getTime());
                      return timeDiff < 60000; // 1 minute tolerance
                    });

                    if (filteredAnswers.length > 0) {
                      answersData = {
                        ...allAnswersBySurvey,
                        answers: filteredAnswers
                      };
                      console.log(`📋 Filtered ${filteredAnswers.length} answers matching submission date for ${resp.email}`);
                      answersFetched = true;
                    } else {
                      console.log(`⚠️ No answers found matching submission date for ${resp.email}`);
                    }
                  }
                } catch (surveyErr) {
                  console.warn(`⚠️ Failed to fetch by survey_id for ${resp.email}:`, surveyErr);
                }
              }

              // If survey_id method didn't work or returned empty, try email only
              // IMPORTANT: Filter answers by submitted_date to match this specific response
              if (!answersFetched) {
                try {
                  const allAnswersData = await getSurveyAnswersByEmail(resp.email);
                  console.log(`📋 Fetched all answers by email for ${resp.email}:`, allAnswersData);

                  // Filter answers to match this response's submission date
                  // Match answers that were submitted on the same date/time as this response
                  if (allAnswersData.answers && allAnswersData.answers.length > 0) {
                    const responseDate = new Date(resp.submitted_date);
                    const filteredAnswers = allAnswersData.answers.filter((ans: AnswerItem) => {
                      if (!ans.submitted_at) return false;
                      const answerDate = new Date(ans.submitted_at);
                      // Match if submitted within 1 minute of response date (to handle slight time differences)
                      const timeDiff = Math.abs(responseDate.getTime() - answerDate.getTime());
                      return timeDiff < 60000; // 1 minute tolerance
                    });

                    if (filteredAnswers.length > 0) {
                      answersData = {
                        ...allAnswersData,
                        answers: filteredAnswers
                      };
                      console.log(`📋 Filtered ${filteredAnswers.length} answers matching submission date for ${resp.email}`);
                      answersFetched = true;
                    } else {
                      console.log(`⚠️ No answers found matching submission date for ${resp.email}`);
                    }
                  }
                } catch (emailErr) {
                  console.warn(`⚠️ Failed to fetch by email for ${resp.email}:`, emailErr);
                }
              }

              // If still no answers, try to extract from comment field as fallback
              const answersFromComment: AnswerItem[] = [];
              if (!answersFetched && resp.comment) {
                // Try to parse answers from comment (format: "question text: answer text" or "question text | answer")
                const comment = resp.comment;
                console.log(`📋 Trying to extract answers from comment for ${resp.email}:`, comment);

                questions.forEach((q: QuestionItem) => {
                  if (q.question_text) {
                    const questionText = q.question_text.trim();
                    // Escape special regex characters in question text
                    const escapedQuestion = questionText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

                    // Try multiple patterns:
                    // 1. "question text: answer" or "question text | answer"
                    // 2. "question text answer" (without separator, but followed by | or end)
                    const patterns = [
                      new RegExp(`${escapedQuestion}\\s*[:|]\\s*([^|]+?)(?=\\s*\\||\\s*[A-Z][a-z]+\\s*:|$)`, 'i'),
                      new RegExp(`${escapedQuestion}\\s+([^|]+?)(?=\\s*\\||\\s*[A-Z][a-z]+\\s*:|$)`, 'i')
                    ];

                    for (const regex of patterns) {
                      const match = comment.match(regex);
                      if (match && match[1]) {
                        const answerText = match[1].trim();
                        // Skip if answer is empty or just whitespace
                        if (answerText && answerText.length > 0) {
                          answersFromComment.push({
                            question_id: q.question_id,
                            answer_text: answerText,
                            survey_id: resp.survey_id || '',
                            user_email: resp.email,
                            question_order: q.question_order || '0'
                          });
                          console.log(`📋 Extracted answer for question "${questionText}": "${answerText}"`);
                          break; // Found answer, move to next question
                        }
                      }
                    }
                  }
                });

                if (answersFromComment.length > 0) {
                  console.log(`📋 Extracted ${answersFromComment.length} answers from comment for ${resp.email}`);
                  answersData.answers = answersFromComment;
                  answersFetched = true;
                } else {
                  console.log(`⚠️ Could not extract answers from comment for ${resp.email}`);
                }
              }

              // Map answers with question text from questionsMap and sort by question_order
              const answersWithQuestions = (answersData.answers || []).map((ans: AnswerItem) => ({
                ...ans,
                question_text: questionsMap[ans.question_id || ''] || `Question ${ans.question_id || ''}`.trim() || 'Question',
                // Get question_order from the questionOrderMap we created
                question_order: questionOrderMap[ans.question_id || ''] || ans.question_order || '0'
              }));

              // Sort answers by question_order to match question sequence
              answersWithQuestions.sort((a: AnswerItem, b: AnswerItem) => {
                const orderA = parseInt(a.question_order || '0', 10);
                const orderB = parseInt(b.question_order || '0', 10);
                return orderA - orderB;
              });

              console.log(`📋 Final answers for ${resp.email} (${answersWithQuestions.length} answers):`, answersWithQuestions);

              return {
                ...resp,
                answers: answersWithQuestions
              };
            } catch (err) {
              console.error(`❌ Error fetching answers for ${resp.email}:`, err);
              return {
                ...resp,
                answers: []
              };
            }
          })
        );

        setResponses(responsesWithAnswers);
        setError(null);
      } catch (err: unknown) {
        console.error('Error fetching survey responses:', err);
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
        setError(`Failed to fetch responses: ${errorMessage}`);
      } finally {
        setLoading(false);
      }
    };

    fetchResponses();
  }, []);

  const getScoreColor = (score: number) => {
    if (score >= 9) return "text-green-600 bg-green-100 dark:bg-green-900/20 dark:text-green-400";
    if (score >= 7) return "text-blue-600 bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400";
    if (score >= 5) return "text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20 dark:text-yellow-400";
    return "text-red-600 bg-red-100 dark:bg-red-900/20 dark:text-red-400";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 9) return "NPS";
    if (score >= 7) return "CSAT";
    if (score >= 5) return "CES";
    return "CSAT";
  };

  const getDepartment = (response: Response) => {
    // If department field exists, use it
    if (response.department) {
      return response.department.charAt(0).toUpperCase() + response.department.slice(1);
    }

    // Check email patterns for department identification
    const email = response.email.toLowerCase();

    if (email.includes('employee') || email.includes('@employee') ||
      email.includes('staff') || email.includes('@staff') ||
      email.includes('hr') || email.includes('@hr') ||
      email.includes('admin') || email.includes('@admin')) {
      return 'Employee';
    }

    if (email.includes('customer') || email.includes('@customer') ||
      email.includes('client') || email.includes('@client')) {
      return 'Customer';
    }

    // Default to Customer if no clear indicators
    return 'Customer';
  };

  const getDepartmentColor = (department: string) => {
    switch (department.toLowerCase()) {
      case 'employee':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400';
      case 'customer':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  // Helper function to get date range based on timeline filter
  const getDateRange = (timeline: string): [Date | null, Date | null] => {
    const now = new Date();
    let start: Date | null = null;
    let end: Date | null = null;

    switch (timeline) {
      case "today":
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        start.setHours(0, 0, 0, 0);
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        end.setHours(23, 59, 59, 999);
        break;
      case "yesterday":
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
        start.setHours(0, 0, 0, 0);
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
        end.setHours(23, 59, 59, 999);
        break;
      case "last12hours":
        start = new Date(now.getTime() - 12 * 60 * 60 * 1000);
        end = new Date(now);
        break;
      case "thisweek":
        const dayOfWeek = now.getDay();
        const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        start = new Date(now.getFullYear(), now.getMonth(), diff);
        start.setHours(0, 0, 0, 0);
        end = new Date(now.getFullYear(), now.getMonth(), diff + 7);
        end.setHours(23, 59, 59, 999);
        break;
      case "lastweek":
        const lastWeekDayOfWeek = now.getDay();
        const lastWeekDiff = now.getDate() - lastWeekDayOfWeek - 6;
        start = new Date(now.getFullYear(), now.getMonth(), lastWeekDiff);
        start.setHours(0, 0, 0, 0);
        end = new Date(now.getFullYear(), now.getMonth(), lastWeekDiff + 7);
        end.setHours(23, 59, 59, 999);
        break;
      case "thismonth":
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        start.setHours(0, 0, 0, 0);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case "lastmonth":
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        start.setHours(0, 0, 0, 0);
        end = new Date(now.getFullYear(), now.getMonth(), 0);
        end.setHours(23, 59, 59, 999);
        break;
      case "last30days":
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        start.setHours(0, 0, 0, 0);
        end = new Date(now);
        end.setHours(23, 59, 59, 999);
        break;
      case "custom":
        if (customDateRange[0] && customDateRange[1]) {
          start = new Date(customDateRange[0]);
          start.setHours(0, 0, 0, 0);
          end = new Date(customDateRange[1]);
          end.setHours(23, 59, 59, 999);
        }
        return [start, end];
      default:
        return [null, null];
    }

    return [start, end];
  };

  const filteredResponses = responses.filter(response => {
    // Search filter - enhanced to search in multiple fields
    const department = getDepartment(response);
    const searchLower = searchTerm.toLowerCase().trim();
    const matchesSearch = !searchLower ||
      response.email.toLowerCase().includes(searchLower) ||
      response.comment.toLowerCase().includes(searchLower) ||
      department.toLowerCase().includes(searchLower) ||
      (response.feedback_id && response.feedback_id.toLowerCase().includes(searchLower)) ||
      (response.survey_id && response.survey_id.toLowerCase().includes(searchLower));

    // Score filter - enhanced with better range checking
    const matchesScore = !scoreFilter ||
      (scoreFilter === "high" && response.rating >= 8 && response.rating <= 10) ||
      (scoreFilter === "medium" && response.rating >= 5 && response.rating < 8) ||
      (scoreFilter === "low" && response.rating >= 0 && response.rating < 5);

    // Timeline filter logic - enhanced with better date handling
    let matchesDate = true;
    if (timelineFilter && timelineFilter !== "all" && timelineFilter !== "") {
      const [startDate, endDate] = getDateRange(timelineFilter);

      if (startDate && endDate) {
        if (response.submitted_date) {
          try {
            // Parse the submitted_date - handle different formats
            let responseDate: Date;
            const dateStr = response.submitted_date.toString();

            if (dateStr.includes('T')) {
              responseDate = new Date(dateStr);
            } else if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
              // Format: YYYY-MM-DD
              responseDate = new Date(dateStr + 'T00:00:00');
            } else {
              // Try parsing as is
              responseDate = new Date(dateStr);
            }

            // Check if date is valid
            if (isNaN(responseDate.getTime())) {
              matchesDate = false;
            } else {
              // For last12hours, use exact datetime comparison
              if (timelineFilter === "last12hours") {
                matchesDate = responseDate >= startDate && responseDate <= endDate;
              } else {
                // For other filters, compare dates (ignore time)
                const normalizedResponse = new Date(responseDate);
                normalizedResponse.setHours(0, 0, 0, 0);

                matchesDate = normalizedResponse >= startDate && normalizedResponse <= endDate;
              }
            }
          } catch (error) {
            console.error('Error parsing date:', response.submitted_date, error);
            matchesDate = false;
          }
        } else {
          // If no date available, exclude from results when date filter is active
          matchesDate = false;
        }
      } else if (timelineFilter === "custom" && (!customDateRange[0] || !customDateRange[1])) {
        // If custom range is selected but dates are not set, show all
        matchesDate = true;
      }
    }

    return matchesSearch && matchesScore && matchesDate;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredResponses.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const displayedResponses = filteredResponses.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, scoreFilter, timelineFilter, customDateRange]);

  // Clear all filters
  const clearAllFilters = () => {
    setSearchTerm("");
    setScoreFilter("");
    setTimelineFilter("");
    setCustomDateRange([null, null]);
  };

  // Check if any filters are active
  const hasActiveFilters = searchTerm || scoreFilter || timelineFilter || (customDateRange[0] && customDateRange[1]);

  // Download PDF function
  const handleDownloadPDF = () => {
    if (filteredResponses.length === 0) {
      alert("No responses to download");
      return;
    }

    const doc = new jsPDF();

    // Add title
    doc.setFontSize(20);
    doc.text("Survey Responses Report", 20, 20);

    // Add date
    doc.setFontSize(10);
    const currentDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    doc.text(`Generated on: ${currentDate}`, 20, 30);

    // Add filter information if any
    let yPos = 40;
    if (hasActiveFilters) {
      doc.setFontSize(12);
      doc.text("Applied Filters:", 20, yPos);
      yPos += 8;
      doc.setFontSize(10);

      if (searchTerm) {
        doc.text(`Search: ${searchTerm}`, 20, yPos);
        yPos += 6;
      }
      if (scoreFilter) {
        doc.text(`Score: ${scoreFilter}`, 20, yPos);
        yPos += 6;
      }
      if (timelineFilter && timelineFilter !== "all") {
        const timelineLabels: Record<string, string> = {
          "today": "Today",
          "yesterday": "Yesterday",
          "last12hours": "Last 12 Hours",
          "thisweek": "This Week",
          "lastweek": "Last Week",
          "thismonth": "This Month",
          "lastmonth": "Last Month",
          "last30days": "Last 30 Days",
          "custom": "Custom Range"
        };
        doc.text(`Timeline: ${timelineLabels[timelineFilter] || timelineFilter}`, 20, yPos);
        yPos += 6;
      }
      yPos += 5;
    }

    // Table headers
    yPos += 5;
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    const headers = ["#", "User", "Department", "Score", "Date", "Comment"];
    const colWidths = [10, 50, 35, 20, 30, 45];
    let xPos = 20;

    headers.forEach((header, index) => {
      doc.text(header, xPos, yPos);
      xPos += colWidths[index];
    });

    yPos += 8;
    doc.setFontSize(10);
    doc.setDrawColor(200, 200, 200);
    doc.line(20, yPos - 2, 190, yPos - 2);

    // Add response data
    filteredResponses.forEach((response, index) => {
      // Check if we need a new page
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;

        // Redraw headers on new page
        doc.setFontSize(11);
        xPos = 20;
        headers.forEach((header, idx) => {
          doc.text(header, xPos, yPos);
          xPos += colWidths[idx];
        });
        yPos += 8;
        doc.setFontSize(10);
        doc.line(20, yPos - 2, 190, yPos - 2);
      }

      const department = getDepartment(response);
      const date = response.submitted_date
        ? new Date(response.submitted_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : 'N/A';
      const comment = response.comment ? (response.comment.length > 40 ? response.comment.substring(0, 40) + '...' : response.comment) : '—';

      xPos = 20;
      doc.text(String(index + 1), xPos, yPos);
      xPos += colWidths[0];

      // User email (truncate if too long)
      const userEmail = response.email.length > 30 ? response.email.substring(0, 30) + '...' : response.email;
      doc.text(userEmail, xPos, yPos);
      xPos += colWidths[1];

      doc.text(department, xPos, yPos);
      xPos += colWidths[2];

      doc.text(`${response.rating} (${getScoreLabel(response.rating)})`, xPos, yPos);
      xPos += colWidths[3];

      doc.text(date, xPos, yPos);
      xPos += colWidths[4];

      // Comment (truncate if too long)
      const commentLines = doc.splitTextToSize(comment, colWidths[5]);
      doc.text(commentLines, xPos, yPos);

      yPos += Math.max(6, commentLines.length * 6);
    });

    // Add summary
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.text(
        `Page ${i} of ${totalPages} | Total Responses: ${filteredResponses.length}`,
        20,
        285
      );
    }

    // Generate filename
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
    const filename = `Survey_Responses_${dateStr}_${timeStr}.pdf`;

    // Save the PDF
    doc.save(filename);
  };

  // Fetch additional details for view modal if needed
  useEffect(() => {
    if (viewResponse && viewResponse.feedback_id) {
      // Check if we need to fetch additional details
      // For now, use the response object directly; add fallback fetch if needed
      setViewResponseDetails(null);
      setViewResponseError(null);

      // If allQuestions is empty, fetch questions again
      if (allQuestions.length === 0) {
        const fetchQuestionsForModal = async () => {
          try {
            setViewResponseLoading(true);
            const questionsData = await getSurveyQuestions() as unknown as QuestionsResponse | QuestionItem[];
            let questions: QuestionItem[] = [];
            if (Array.isArray(questionsData)) {
              questions = questionsData;
            } else if (questionsData?.questions && Array.isArray(questionsData.questions)) {
              questions = questionsData.questions;
            } else if (questionsData?.data && Array.isArray(questionsData.data)) {
              questions = questionsData.data;
            }

            // Sort questions by question_order if available
            questions.sort((a: QuestionItem, b: QuestionItem) => {
              const orderA = parseInt(a.question_order || '0', 10);
              const orderB = parseInt(b.question_order || '0', 10);
              return orderA - orderB;
            });

            setAllQuestions(questions);
          } catch (err) {
            console.error('Error fetching questions for modal:', err);
            setViewResponseError('Unable to load questions. Showing available data.');
          } finally {
            setViewResponseLoading(false);
          }
        };
        fetchQuestionsForModal();
      }
    }
  }, [viewResponse, allQuestions.length]);

  // Handle Esc key and focus trap for View modal
  useEffect(() => {
    if (viewResponse) {
      // Store the element that had focus before modal opened
      lastFocusedElementRef.current = document.activeElement as HTMLElement;

      // Handle Esc key
      const handleEsc = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setViewResponse(null);
        }
      };

      document.addEventListener('keydown', handleEsc);

      // Focus trap: focus the modal container
      const modalContainer = document.querySelector('[role="dialog"][aria-modal="true"]') as HTMLElement;
      if (modalContainer) {
        modalContainer.focus();
      }

      return () => {
        document.removeEventListener('keydown', handleEsc);
        // Restore focus to the button that opened the modal
        if (lastFocusedElementRef.current) {
          lastFocusedElementRef.current.focus();
        }
        // Cleanup
        setViewResponseDetails(null);
        setViewResponseError(null);
      };
    }
  }, [viewResponse]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <>
      <style jsx>{`
        /* Custom Scrollbar Styles */
        .scrollbar-thin::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
       
        .scrollbar-thin::-webkit-scrollbar-track {
          background: #f3f4f6;
          border-radius: 3px;
        }
       
        .scrollbar-thin::-webkit-scrollbar-thumb {
          background: #d1d5db;
          border-radius: 3px;
          transition: background 0.2s ease;
        }
       
        .scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background: #9ca3af;
        }
       
        .dark .scrollbar-thin::-webkit-scrollbar-track {
          background: #374151;
        }
       
        .dark .scrollbar-thin::-webkit-scrollbar-thumb {
          background: #6b7280;
        }
       
        .dark .scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background: #9ca3af;
        }
       
        /* Smooth scrolling */
        .scrollbar-thin {
          scroll-behavior: smooth;
        }
      `}</style>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Dashboard Header */}
          <DashboardHeader
            title="Survey Responses"
            subtitle="Analyze and manage survey responses in real-time"
            icon={ClipboardList}
            iconColor="text-white"
            hideTenantPrefix={true}
            breadcrumbs={[
              { label: 'Home', href: '/' },
              { label: 'Survey & Feedback', href: '/survey-feedback' },
              { label: 'Responses' }
            ]}
          />

          <div className="space-y-6 mt-8">
            <div className={`${deleteConfirm || viewResponse ? 'blur-sm' : ''}`}>
              {/* Filters & Search Row - Below banner, matching Image-1 */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border border-gray-200 dark:border-gray-700">
                <div className="flex flex-col md:flex-row gap-4 items-center">
                  {/* Search - Larger width to fit page */}
                  <div className="w-full md:flex-1">
                    <div className="relative">
                      <SurveyIcons.SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search by Name or Email..."
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-all"
                      />
                    </div>
                  </div>

                  {/* Filter Button */}
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 transition-all duration-200 font-medium text-sm whitespace-nowrap ${showFilters
                      ? 'bg-gray-100 dark:bg-gray-600 border-blue-500 dark:border-blue-400 text-gray-900 dark:text-white'
                      : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                      }`}
                    aria-label={showFilters ? "Hide filters" : "Show filters"}
                    aria-expanded={showFilters}
                    type="button"
                  >
                    <Filter className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    <span>Filters</span>
                    <ChevronUp className={`w-4 h-4 transition-transform duration-200 ${showFilters ? 'rotate-0' : 'rotate-180'}`} />
                  </button>

                  {/* Download Button */}
                  <button
                    onClick={handleDownloadPDF}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 border-blue-300 dark:border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-all duration-200 font-medium text-sm whitespace-nowrap"
                    aria-label="Download responses as PDF"
                    type="button"
                  >
                    <Download className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    <span>Download</span>
                  </button>
                </div>

                {/* Filter Options - Shown when showFilters is true */}
                <AnimatePresence>
                  {showFilters && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                        {/* Filters Row - Timeline and Score in one line */}
                        <div className="flex flex-col md:flex-row gap-4 mb-4">
                          {/* Timeline Filter */}
                          <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Timeline
                            </label>
                            <div className="relative">
                              <select
                                value={timelineFilter}
                                onChange={(e) => setTimelineFilter(e.target.value)}
                                className="w-full py-2.5 px-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none transition-all appearance-none"
                              >
                                <option value="">Select Timeline</option>
                                <option value="all">All Time</option>
                                <option value="today">Today</option>
                                <option value="yesterday">Yesterday</option>
                                <option value="last12hours">Last 12 Hours</option>
                                <option value="thisweek">This Week</option>
                                <option value="lastweek">Last Week</option>
                                <option value="thismonth">This Month</option>
                                <option value="lastmonth">Last Month</option>
                                <option value="last30days">Last 30 Days</option>
                                <option value="custom">Custom Range</option>
                              </select>
                              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </div>
                            </div>
                          </div>

                          {/* Score Filter */}
                          <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Score
                            </label>
                            <select
                              value={scoreFilter}
                              onChange={(e) => setScoreFilter(e.target.value)}
                              className="w-full py-2.5 px-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-all appearance-none"
                            >
                              <option value="">All Scores</option>
                              <option value="high">High (8-10)</option>
                              <option value="medium">Medium (5-7)</option>
                              <option value="low">Low (0-4)</option>
                            </select>
                          </div>
                        </div>

                        {/* Custom Date Range - Shown when Custom Range is selected */}
                        {timelineFilter === "custom" && (
                          <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Custom Range
                            </label>
                            <DateRangePicker
                              value={customDateRange}
                              onChange={setCustomDateRange}
                            />
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex items-center justify-end gap-3 pt-2">
                          <button
                            onClick={clearAllFilters}
                            className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition-all font-medium text-sm"
                          >
                            Clear All
                          </button>
                          <button
                            onClick={() => setShowFilters(false)}
                            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all font-medium text-sm"
                          >
                            Apply Filters
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Loading State */}
              {loading && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-12 text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600 dark:text-gray-400">Loading responses...</p>
                </div>
              )}

              {/* Error State */}
              {error && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-12 text-center">
                  <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
                  <button
                    onClick={() => window.location.reload()}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                  >
                    Try Again
                  </button>
                </div>
              )}

              {/* Main Card Container - Matching Image-1 */}
              {!loading && !error && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
                  {/* Card Title and Totals Row */}
                  <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Survey Responses
                      </h2>
                      <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                        <span>Total: {responses.length}</span>
                        <span>Filtered: {filteredResponses.length}</span>
                      </div>
                    </div>
                  </div>

                  {/* Table Container */}
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 dark:bg-gray-700/50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            User
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Department
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Score
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Comment
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Q/A
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Date
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {displayedResponses.map((response, index) => {
                          const { generalComment } = parseComment(response.comment);

                          // Debug: Log first response's Q/A data
                          if (index === 0) {
                            const qaPairs = getQaPairs(response as unknown as ResponseWithAny);
                            console.log('🔍 First Response Debug:', {
                              email: response.email,
                              fullComment: response.comment,
                              answersFromAPI: response.answers,
                              parsedQAPairs: qaPairs,
                              hasQA: qaPairs.length > 0,
                              previewText: qaPairs.length > 0 ? (qaPairs[0].question || qaPairs[0].answer || 'N/A') : 'No Q/A'
                            });
                          }

                          return (
                            <tr key={response.feedback_id || index} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                              <td className="px-6 py-5">
                                <div className="flex items-center">
                                  <div className="flex-shrink-0 h-10 w-10">
                                    <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                                      <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                                        {response.email.charAt(0).toUpperCase()}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="ml-3">
                                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                                      {response.email}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-5 whitespace-nowrap">
                                <span className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full ${getDepartmentColor(getDepartment(response))}`}>
                                  {getDepartment(response)}
                                </span>
                              </td>
                              <td className="px-6 py-5 whitespace-nowrap">
                                <span className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full ${getScoreColor(response.rating)}`}>
                                  {response.rating} ({getScoreLabel(response.rating)})
                                </span>
                              </td>
                              <td className="px-6 py-5">
                                <CommentCellWithPopover
                                  text={generalComment}
                                  cellId={`comment-${response.feedback_id || index}`}
                                />
                              </td>
                              <td className="px-6 py-5">
                                <QACellWithPopover
                                  response={response}
                                  cellId={`qa-${response.feedback_id || index}`}
                                />
                              </td>
                              <td className="px-6 py-5 whitespace-nowrap">
                                <div className="text-sm text-gray-900 dark:text-white">
                                  {response.submitted_date ? (() => {
                                    const date = new Date(response.submitted_date);
                                    const day = date.getDate();
                                    const month = date.toLocaleString('default', { month: 'short' });
                                    const year = date.getFullYear();
                                    return `${day} ${month} ${year}`;
                                  })() : 'N/A'}
                                </div>
                              </td>
                              <td className="px-6 py-5 whitespace-nowrap text-sm font-medium">
                                <div className="flex items-center space-x-2">
                                  <button
                                    onClick={(e) => {
                                      lastFocusedElementRef.current = e.currentTarget;
                                      setViewResponse(response);
                                    }}
                                    className="inline-flex items-center justify-center w-8 h-8 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                                    aria-label="View details"
                                  >
                                    <SurveyIcons.EyeIcon className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => setDeleteConfirm(response.feedback_id || '')}
                                    disabled={deleteLoading === response.feedback_id}
                                    className="inline-flex items-center justify-center w-8 h-8 border border-red-300 dark:border-red-700 shadow-sm text-sm font-medium rounded-md text-red-700 dark:text-red-400 bg-white dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-900/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    aria-label="Delete"
                                  >
                                    {deleteLoading === response.feedback_id ? (
                                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                                    ) : (
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                      </svg>
                                    )}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination and Summary */}
                  <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    {/* Summary */}
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Showing {startIndex + 1}-{Math.min(endIndex, filteredResponses.length)} of {filteredResponses.length} Survey responses
                    </div>

                    {/* Pagination Controls */}
                    {totalPages > 0 && (
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handlePageChange(currentPage - 1)}
                          disabled={currentPage === 1}
                          className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          &lt; Previous
                        </button>

                        {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => i + 1).map((page) => (
                          <button
                            key={page}
                            onClick={() => handlePageChange(page)}
                            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${currentPage === page
                              ? 'bg-blue-600 text-white'
                              : 'text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                              }`}
                          >
                            {page}
                          </button>
                        ))}

                        <button
                          onClick={() => handlePageChange(currentPage + 1)}
                          disabled={currentPage === totalPages}
                          className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          Next &gt;
                        </button>
                      </div>
                    )}
                  </div>

                  {filteredResponses.length === 0 && (
                    <div className="text-center py-12">
                      <div className="text-gray-500 dark:text-gray-400">
                        <SurveyIcons.UserIcon className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                        <p className="text-lg font-medium">No responses found</p>
                        <p className="text-sm">Try adjusting your filters or search terms</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* View Response Details Modal - Reusing Delete modal UI structure */}
            {viewResponse && (
              <div
                className="fixed inset-0 flex items-center justify-center z-50"
                onClick={() => setViewResponse(null)}
                role="dialog"
                aria-modal="true"
                aria-labelledby="view-modal-title"
                aria-describedby="view-modal-description"
                tabIndex={-1}
              >
                <div
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Gradient Header */}
                  <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-t-lg p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-full bg-white/20 backdrop-blur-sm">
                          <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </div>
                        <div>
                          <h3 id="view-modal-title" className="text-xl font-bold text-white">
                            {VIEW_MODAL_TITLE}
                          </h3>
                          <p id="view-modal-description" className="text-sm text-white/90 mt-1">
                            Response by {viewResponse.email || 'Unknown'}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => setViewResponse(null)}
                        className="text-white/80 hover:text-white transition-colors p-1 rounded-full hover:bg-white/20"
                        aria-label="Close modal"
                      >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Content Area */}
                  <div className="p-6 overflow-y-auto flex-1">

                    {/* Error message if fallback fetch failed */}
                    {viewResponseError && (
                      <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                        <p className="text-sm text-yellow-800 dark:text-yellow-200">
                          {viewResponseError}
                        </p>
                      </div>
                    )}

                    {/* Loading state */}
                    {viewResponseLoading && (
                      <div className="mb-4 text-center py-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Loading additional details...</p>
                      </div>
                    )}

                    {/* Content - Two column layout */}
                    <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                      {/* Left Column: User/Meta Info */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        {/* User Avatar & Email */}
                        <div className="flex items-center space-x-3">
                          <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0">
                            <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                              {viewResponse.email?.charAt(0).toUpperCase() || '?'}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {viewResponse.email || '—'}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {getDepartment(viewResponse)}
                            </p>
                          </div>
                        </div>

                        {/* Score */}
                        <div>
                          <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                            Score
                          </label>
                          <div className="mt-1">
                            <span className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full ${getScoreColor(viewResponse.rating)}`}>
                              {viewResponse.rating ?? '—'} ({getScoreLabel(viewResponse.rating)})
                            </span>
                          </div>
                        </div>

                        {/* Department */}
                        <div>
                          <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                            Department
                          </label>
                          <div className="mt-1">
                            <span className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full ${getDepartmentColor(getDepartment(viewResponse))}`}>
                              {getDepartment(viewResponse)}
                            </span>
                          </div>
                        </div>

                        {/* Submitted Date */}
                        <div>
                          <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                            Submitted Date
                          </label>
                          <p className="mt-1 text-sm text-gray-900 dark:text-white">
                            {viewResponse.submitted_date ? (() => {
                              const date = new Date(viewResponse.submitted_date);
                              const day = date.getDate();
                              const month = date.toLocaleString('default', { month: 'short' });
                              const year = date.getFullYear();
                              const hours = date.getHours();
                              const minutes = date.getMinutes();
                              const ampm = hours >= 12 ? 'PM' : 'AM';
                              const displayHours = hours % 12 || 12;
                              return `${day} ${month} ${year}, ${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
                            })() : '—'}
                          </p>
                        </div>
                      </div>

                      {/* Right Column: Detailed Fields */}
                      <div className="space-y-4">
                        {/* General Comment and Q/A */}
                        {(() => {
                          // Use response details if available, otherwise use viewResponse
                          const responseData = viewResponseDetails || viewResponse;
                          const commentText = typeof responseData?.comment === 'string' ? responseData.comment : '';
                          const { generalComment } = parseComment(commentText);

                          return (
                            <>
                              {generalComment && (
                                <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
                                  <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 block">
                                    General Comment
                                  </label>
                                  <div className="mt-1 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                    <p className="text-sm text-gray-900 dark:text-white whitespace-pre-line">
                                      {generalComment}
                                    </p>
                                  </div>
                                </div>
                              )}

                              {/* Q/A Pairs - Show ALL questions with answers or NA */}
                              <div className={generalComment ? "border-b border-gray-200 dark:border-gray-700 pb-4" : ""}>
                                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 block">
                                  Question & Answer
                                </label>
                                <div className="mt-1 space-y-4">
                                  {allQuestions.length > 0 ? (
                                    allQuestions.map((question, idx) => {
                                      // Match answers by sequence (index) first, then by question_id
                                      // Since answers are sorted by question_order, we can match by index position
                                      let answerData;

                                      // First try to match by index position (sequence-based matching)
                                      // This works because both questions and answers are sorted by question_order
                                      if (responseData?.answers && responseData.answers.length > idx) {
                                        const answerByIndex = responseData.answers[idx];
                                        // Verify it matches the question_id
                                        const questionIdStr = String(question.question_id || '').trim();
                                        const answerQuestionIdStr = String(answerByIndex?.question_id || '').trim();

                                        if (answerByIndex && answerQuestionIdStr === questionIdStr) {
                                          answerData = answerByIndex;
                                        }
                                      }

                                      // If not found by index, try by question_id directly (with string conversion for type safety)
                                      if (!answerData) {
                                        const questionIdStr = String(question.question_id || '').trim();
                                        answerData = responseData?.answers?.find((ans: AnswerItem) => {
                                          const ansQuestionIdStr = String(ans.question_id || '').trim();
                                          return ansQuestionIdStr === questionIdStr;
                                        });
                                      }

                                      const answerText = answerData?.answer_text || answerData?.answer || '';

                                      // Debug for first question
                                      if (idx === 0) {
                                        console.log('🔍 Answer Matching Debug:', {
                                          question: {
                                            id: question.question_id,
                                            order: question.question_order,
                                            text: question.question_text
                                          },
                                          allAnswers: responseData?.answers?.map((a: AnswerItem) => ({
                                            question_id: a.question_id,
                                            answer_text: a.answer_text,
                                            question_order: a.question_order
                                          })),
                                          matchedAnswer: answerData,
                                          answerText
                                        });
                                      }

                                      return (
                                        <div key={question.question_id || idx} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                          <div className="mb-2">
                                            <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                                              Question:
                                            </p>
                                            <p className="text-sm text-gray-900 dark:text-white whitespace-pre-line">
                                              {question.question_text || 'Question'}
                                            </p>
                                          </div>
                                          <div className="pt-2 border-t border-gray-200 dark:border-gray-600">
                                            <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                                              Answer:
                                            </p>
                                            <p className={`text-sm whitespace-pre-line ${answerText
                                              ? 'text-gray-900 dark:text-white'
                                              : 'text-gray-500 dark:text-gray-400'
                                              }`}>
                                              {answerText || 'NA'}
                                            </p>
                                          </div>
                                        </div>
                                      );
                                    })
                                  ) : (
                                    <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                      <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                                        {viewResponseLoading ? 'Loading questions...' : 'No questions available'}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Fallback: Show full comment if no parsing worked and no general comment and no questions */}
                              {!generalComment && allQuestions.length === 0 && responseData?.comment && (
                                <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
                                  <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 block">
                                    Comment
                                  </label>
                                  <div className="mt-1 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                    <p className="text-sm text-gray-900 dark:text-white whitespace-pre-line">
                                      {typeof responseData.comment === 'string' ? responseData.comment : ''}
                                    </p>
                                  </div>
                                </div>
                              )}

                              {/* No details available */}
                              {!generalComment && allQuestions.length === 0 && !responseData?.comment && (
                                <div className="text-center py-4">
                                  <p className="text-sm text-gray-500 dark:text-gray-400">
                                    No further details available for this response.
                                  </p>
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Footer - matching Delete modal button style */}
                    <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
                      <button
                        onClick={() => setViewResponse(null)}
                        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteConfirm && (
              <div className="fixed inset-0 flex items-center justify-center z-50">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-md w-full mx-4">
                  <div className="p-6">
                    <div className="flex items-center mb-4">
                      <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/20">
                        <svg className="h-6 w-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      </div>
                    </div>
                    <div className="text-center">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                        Delete Survey Response
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                        Are you sure you want to delete this survey response? This action cannot be undone.
                      </p>
                      <div className="flex justify-end space-x-3">
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleDelete(deleteConfirm)}
                          disabled={deleteLoading === deleteConfirm}
                          className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {deleteLoading === deleteConfirm ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default ResponsesPage;