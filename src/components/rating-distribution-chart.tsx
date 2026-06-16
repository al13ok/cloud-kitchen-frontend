"use client";

import React from "react";

interface RatingDistributionData {
  rating: number;
  count: number;
}

interface RatingDistributionChartProps {
  data: RatingDistributionData[];
  title?: string;
  width?: number;
  height?: number;
}

export const RatingDistributionChart: React.FC<RatingDistributionChartProps> = ({
  data,
  title,
  width = 1000,
  height = 500,
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

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 w-full">
        <p className="text-sm md:text-base text-gray-600 dark:text-gray-300">
          No rating data available
        </p>
      </div>
    );
  }

  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const padding = { top: 40, right: 40, bottom: 60, left: 60 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const barWidth = chartWidth / data.length * 0.7;
  const gap = chartWidth / data.length * 0.3;

  const textColor = isDarkMode ? "#E5E7EB" : "#374151";
  const axisColor = isDarkMode ? "#6B7280" : "#9CA3AF";
  const gridColor = isDarkMode ? "#374151" : "#E5E7EB";

  // Generate color based on rating (0-10 scale)
  const getRatingColor = (rating: number): string => {
    if (rating <= 6) return "#ef4444"; // red for detractors
    if (rating <= 8) return "#f59e0b"; // amber for passives
    return "#10b981"; // green for promoters
  };

  return (
    <div className="w-full overflow-x-auto">
      <div className="min-w-full">
        {title && (
          <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-6">
            {title}
          </h3>
        )}
        <svg
          width={width}
          height={height}
          className="w-full"
          viewBox={`0 0 ${width} ${height}`}
        >
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = padding.top + chartHeight - ratio * chartHeight;
            return (
              <g key={ratio}>
                <line
                  x1={padding.left}
                  x2={width - padding.right}
                  y1={y}
                  y2={y}
                  stroke={gridColor}
                  strokeWidth={1}
                  strokeDasharray="4 4"
                  opacity={0.5}
                />
                <text
                  x={padding.left - 10}
                  y={y}
                  textAnchor="end"
                  dominantBaseline="central"
                  fill={axisColor}
                  fontSize="12"
                  fontWeight="500"
                >
                  {Math.round(maxCount * ratio)}
                </text>
              </g>
            );
          })}

          {/* Bars */}
          {data.map((item, index) => {
            const barHeight = (item.count / maxCount) * chartHeight;
            const x = padding.left + index * (barWidth + gap);
            const y = padding.top + chartHeight - barHeight;
            const color = getRatingColor(item.rating);

            return (
              <g key={item.rating}>
                {/* Bar */}
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  fill={color}
                  rx={4}
                  className="transition-all duration-300 hover:opacity-80"
                />
                {/* Count label on bar */}
                {barHeight > 20 && (
                  <text
                    x={x + barWidth / 2}
                    y={y - 5}
                    textAnchor="middle"
                    fill={textColor}
                    fontSize="12"
                    fontWeight="600"
                  >
                    {item.count}
                  </text>
                )}
                {/* Rating label below bar */}
                <text
                  x={x + barWidth / 2}
                  y={height - padding.bottom + 20}
                  textAnchor="middle"
                  fill={axisColor}
                  fontSize="13"
                  fontWeight="600"
                >
                  {item.rating}
                </text>
              </g>
            );
          })}

          {/* Y-axis label */}
          <text
            x={20}
            y={height / 2}
            textAnchor="middle"
            fill={axisColor}
            fontSize="12"
            fontWeight="500"
            transform={`rotate(-90, 20, ${height / 2})`}
          >
            Number of Responses
          </text>

          {/* X-axis label */}
          <text
            x={width / 2}
            y={height - 10}
            textAnchor="middle"
            fill={axisColor}
            fontSize="12"
            fontWeight="500"
          >
            Rating
          </text>
        </svg>
      </div>
    </div>
  );
};

export default RatingDistributionChart;
