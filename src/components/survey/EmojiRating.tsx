"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RATING_SCALE } from "@/config/feedback";

const EMOJI_MAP: Record<number, { emoji: string; label: string; description: string }> = {
  1: { emoji: "😡", label: "Very Angry", description: "Extremely dissatisfied" },
  2: { emoji: "😠", label: "Angry", description: "Very dissatisfied" },
  3: { emoji: "😞", label: "Sad", description: "Dissatisfied" },
  4: { emoji: "😕", label: "Disappointed", description: "Somewhat dissatisfied" },
  5: { emoji: "😐", label: "Neutral", description: "Neither satisfied nor dissatisfied" },
  6: { emoji: "🙂", label: "Satisfied", description: "Somewhat satisfied" },
  7: { emoji: "😊", label: "Happy", description: "Satisfied" },
  8: { emoji: "😃", label: "Very Happy", description: "Very satisfied" },
  9: { emoji: "😄", label: "Delighted", description: "Extremely satisfied" },
  10: { emoji: "🤩", label: "Ecstatic", description: "Beyond satisfied" },
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

interface EmojiRatingProps {
  scale?: number;
  value?: number;
  onChange?: (value: number) => void;
  getLabel?: (value: number, scale: number) => string;
  idPrefix?: string;
  showHappyMeter?: boolean;
}

export const EmojiRating: React.FC<EmojiRatingProps> = ({
  scale = RATING_SCALE,
  value,
  onChange,
  getLabel,
  idPrefix = "emoji-rating",
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  showHappyMeter: _showHappyMeter = true, // retained for compatibility; meter visuals removed
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [announcement, setAnnouncement] = useState("");
  const [hoveredValue, setHoveredValue] = useState<number | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);

  const segments = useMemo(() => {
    // Always use 1-10 emoji scale for consistency
    // For scales < 10, we'll still show all emojis but map them appropriately
    const maxValue = Math.min(scale, 10);
    return Array.from({ length: maxValue }, (_, index) => ({
      value: index + 1,
      ...EMOJI_MAP[index + 1],
    }));
  }, [scale]);

  const defaultGetLabel = (val: number, scl: number) => {
    if (scl === 5) {
      if (val <= 2) return "Needs improvement";
      if (val === 3) return "Neutral";
      if (val === 4) return "Satisfied";
      return "Delighted";
    }
    if (scl !== 10 && scl > 5) {
      const ratio = val / scl;
      if (ratio <= 0.4) return "Challenging";
      if (ratio <= 0.7) return "Moderate";
      return "Effortless";
    }
    if (val <= 6) return "Detractor";
    if (val <= 8) return "Passive";
    return "Promoter";
  };

  const labelFunction = getLabel || defaultGetLabel;

  useEffect(() => {
    if (typeof value !== "number") return;
    const label = labelFunction(value, scale);
    const emojiData = EMOJI_MAP[value];
    setAnnouncement(`Rating ${value} (${emojiData?.label || ""}). ${label}`);
  }, [value, scale, labelFunction]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (typeof value !== "number") return;
      const { key } = event;
      let delta = 0;

      if (key === "ArrowRight" || key === "ArrowDown") delta = 1;
      if (key === "ArrowLeft" || key === "ArrowUp") delta = -1;
      if (key === "Home") delta = -Infinity;
      if (key === "End") delta = Infinity;

      if (delta === 0) return;

      event.preventDefault();
      const values = segments.map((segment) => segment.value);
      const min = Math.min(...values);
      const max = Math.max(...values);
      let next = value;

      if (delta === -Infinity) next = min;
      else if (delta === Infinity) next = max;
      else next = clamp(value + delta, min, max);

      if (next !== value) onChange?.(next);
    },
    [value, segments, onChange]
  );

  const handleSegmentClick = (segmentValue: number) => {
    onChange?.(segmentValue);
  };

  const handleMouseEnter = (segmentValue: number, event: React.MouseEvent<HTMLButtonElement>) => {
    setHoveredValue(segmentValue);
    const rect = event.currentTarget.getBoundingClientRect();
    setTooltipPosition({
      x: rect.left + rect.width / 2, // Use viewport coordinates for fixed positioning
      y: rect.top, // Use viewport coordinates for fixed positioning
    });
  };

  const handleMouseLeave = () => {
    setHoveredValue(null);
    setTooltipPosition(null);
  };

  const getEmojiStyle = (segmentValue: number, isActive: boolean, isHovered: boolean) => {
    const baseStyle =
      "relative flex items-center justify-center rounded-xl border-2 transition-all duration-300 ease-out cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500";

    // Size
    const sizeClass = "w-14 h-14 sm:w-16 sm:h-16";

    // Colors based on rating value
    let colorClass = "";
    if (isActive) {
      if (segmentValue <= 3) {
        colorClass = "bg-red-50 border-red-400 shadow-lg shadow-red-200/50 scale-110";
      } else if (segmentValue <= 5) {
        colorClass = "bg-amber-50 border-amber-400 shadow-lg shadow-amber-200/50 scale-110";
      } else if (segmentValue <= 7) {
        colorClass = "bg-blue-50 border-blue-400 shadow-lg shadow-blue-200/50 scale-110";
      } else {
        colorClass = "bg-emerald-50 border-emerald-400 shadow-lg shadow-emerald-200/50 scale-110";
      }
    } else if (isHovered) {
      colorClass = "bg-gray-50 border-gray-300 shadow-md scale-105";
    } else {
      colorClass = "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600";
    }

    return `${baseStyle} ${sizeClass} ${colorClass}`;
  };

  const selectedEmoji = value ? EMOJI_MAP[value] : null;

  return (
    <div className="space-y-6 overflow-visible">
      {/* Emoji Rating Buttons */}
      <div className="space-y-4 overflow-visible">
        <div className="flex items-center justify-center">
          <span className="text-base font-semibold text-gray-900 dark:text-gray-100">Satisfaction Level</span>
        </div>
        <div
          ref={containerRef}
          role="radiogroup"
          aria-label="Select rating using emoji"
          className="flex flex-wrap gap-3 sm:gap-4 justify-center items-center relative overflow-visible pt-2 pb-2"
        >
          {segments.map((segment, index) => {
            const isActive = value === segment.value;
            const isHovered = hoveredValue === segment.value;
            const isFirst = index === 0;
            const shouldTab = isActive || (typeof value !== "number" && isFirst);

            return (
              <div key={segment.value} className="relative group" style={{ overflow: 'visible' }}>
                <button
                  type="button"
                  role="radio"
                  aria-checked={isActive}
                  aria-label={`Rating ${segment.value}: ${segment.label}`}
                  data-rating-value={segment.value}
                  onClick={() => handleSegmentClick(segment.value)}
                  onKeyDown={handleKeyDown}
                  onMouseEnter={(e) => handleMouseEnter(segment.value, e)}
                  onMouseLeave={handleMouseLeave}
                  tabIndex={shouldTab ? 0 : -1}
                  className={getEmojiStyle(segment.value, isActive, isHovered)}
                  style={{ overflow: 'visible' }}
                >
                  <span
                    className={`text-2xl sm:text-3xl transition-transform duration-300 ${isActive ? "scale-125 animate-pulse" : isHovered ? "scale-110" : "scale-100"
                      }`}
                  >
                    {segment.emoji}
                  </span>
                  {isActive && (
                    <span className="pointer-events-none absolute left-1/2 top-full -translate-x-1/2 mt-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                      {segment.value}
                    </span>
                  )}
                </button>

                {/* Tooltip on hover */}
                {isHovered && tooltipPosition && (
                  <div
                    className="fixed z-[9999] px-3 py-1.5 bg-gray-900 dark:bg-gray-800 text-white text-xs font-medium rounded-lg shadow-lg pointer-events-none whitespace-nowrap"
                    style={{
                      left: `${tooltipPosition.x}px`,
                      top: `${tooltipPosition.y - 10}px`,
                      transform: "translate(-50%, -100%)",
                    }}
                  >
                    <div className="font-semibold">{segment.label}</div>
                    <div className="text-gray-300 text-[10px]">{segment.description}</div>
                    <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full">
                      <div className="border-4 border-transparent border-t-gray-900 dark:border-t-gray-800" />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Selected Rating Label */}
        <div
          className="text-center min-h-[1.5rem] transition-all duration-300"
          aria-live="polite"
        >
          {typeof value === "number" ? (
            <div className="flex items-center justify-center gap-2">
              <span className="text-2xl">{selectedEmoji?.emoji}</span>
              <span className="text-base font-semibold text-gray-900 dark:text-white">
                {selectedEmoji?.label}
              </span>
            </div>
          ) : (
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Select your rating above
            </p>
          )}
        </div>
      </div>

      {/* Screen reader announcement */}
      <span
        id={`${idPrefix}-live-region`}
        role="status"
        aria-live="polite"
        className="sr-only"
      >
        {announcement}
      </span>
    </div>
  );
};

export default EmojiRating;