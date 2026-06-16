"use client";

import React from "react";

interface RadialBarChartData {
  label: string;
  value: number;
  color: string;
}

interface RadialBarChartProps {
  data: RadialBarChartData[];
  total: number;
  totalLabel?: string;
  height?: number;
  width?: number;
  strokeWidth?: number;
  gap?: number;
}

export const RadialBarChart: React.FC<RadialBarChartProps> = ({
  data,
  total,
  totalLabel = "Total",
  height = 350,
  width = 350,
  strokeWidth = 20,
  gap = 4,
}) => {
  const [isDarkMode, setIsDarkMode] = React.useState(false);

  React.useEffect(() => {
    const checkDarkMode = () => {
      const darkMode = document.documentElement.classList.contains("dark");
      setIsDarkMode(darkMode);
    };

    checkDarkMode();

    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  if (!data || data.length === 0 || total === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm md:text-base text-gray-600 dark:text-gray-300">
          No sentiment data available
        </p>
      </div>
    );
  }

  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) / 2 - strokeWidth / 2 - 30;

  const textColor = isDarkMode ? "#E5E7EB" : "#374151";
  const secondaryTextColor = isDarkMode ? "#9CA3AF" : "#6B7280";
  const bgColor = isDarkMode ? "#374151" : "#E5E7EB";

  // Calculate segments (concentric circles for radial bar chart)
  const segments = data.map((item) => {
    const percentage = total > 0 ? item.value / total : 0;
    return {
      ...item,
      percentage,
    };
  });

  return (
    <div className="flex flex-col items-center justify-center w-full">
      <svg width={width} height={height} className="overflow-visible">
        {/* Background circle */}
        <circle
          cx={centerX}
          cy={centerY}
          r={radius}
          fill="none"
          stroke={bgColor}
          strokeWidth={strokeWidth}
          opacity={0.3}
        />

        {/* Radial bars (concentric circles) */}
        {segments.map((segment, index) => {
          const segmentRadius = radius - (index * (strokeWidth + gap));
          const segmentCircumference = 2 * Math.PI * segmentRadius;
          const dashLength = segment.percentage * segmentCircumference;
          const gapLength = segmentCircumference - dashLength;
          const rotation = -90; // Start from top

          return (
            <g key={segment.label}>
              <circle
                cx={centerX}
                cy={centerY}
                r={segmentRadius}
                fill="none"
                stroke={segment.color}
                strokeWidth={strokeWidth}
                strokeDasharray={`${dashLength} ${gapLength}`}
                strokeDashoffset={0}
                strokeLinecap="round"
                transform={`rotate(${rotation} ${centerX} ${centerY})`}
                className="transition-all duration-500 ease-out"
              />
            </g>
          );
        })}

        {/* Center label */}
        <g>
          <text
            x={centerX}
            y={centerY - 10}
            textAnchor="middle"
            fill={secondaryTextColor}
            fontSize="14"
            fontWeight="500"
          >
            {totalLabel}
          </text>
          <text
            x={centerX}
            y={centerY + 15}
            textAnchor="middle"
            fill={textColor}
            fontSize="24"
            fontWeight="700"
          >
            {total}
          </text>
        </g>
      </svg>

      {/* Legend */}
      <div className="flex flex-col gap-3 mt-6 w-full">
        {segments.map((segment) => (
          <div
            key={segment.label}
            className="flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: segment.color }}
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {segment.label}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {segment.value}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                ({Math.round(segment.percentage * 100)}%)
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RadialBarChart;
