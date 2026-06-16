"use client";

import React, { useState, useEffect, useMemo } from "react";

interface HappyMeterGaugeProps {
  value: number; // Value from 0 to 100 (will be mapped to 0-100 for positive only)
  emojiRating?: number; // Emoji rating 1-10 to display
  width?: number;
  height?: number;
  showValue?: boolean;
}

export const HappyMeterGauge: React.FC<HappyMeterGaugeProps> = ({
  value,
  emojiRating,
  width = 500,
  height = 280,
  showValue = true,
}) => {
  const [animatedPercent, setAnimatedPercent] = useState(0);
  const [animatedDisplayValue, setAnimatedDisplayValue] = useState(0);

  useEffect(() => {
    // Map value from 0-100 to 0-100 range (positive only)
    // For emoji ratings 1-10, value will be 10-100, which maps to 0-100 on gauge
    // Gauge percent: 0-100 maps to 0-1 (where 0 = 0, 50 = 0.5, 100 = 1)
    const targetPercent = value / 100; // Convert 0-100 to 0-1
    const targetDisplayValue = Math.round(value); // Display 0-100 (or 10-100 for emojis 1-10)

    // Smooth animation over 1.5 seconds
    const duration = 1500; // milliseconds
    const startPercent = animatedPercent;
    const startDisplayValue = animatedDisplayValue;
    const startTime = Date.now();

    let animationFrameId: number;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function for smooth animation (ease-out)
      const easeOut = 1 - Math.pow(1 - progress, 3);
      
      const currentPercent = startPercent + (targetPercent - startPercent) * easeOut;
      const currentDisplayValue = Math.round(
        startDisplayValue + (targetDisplayValue - startDisplayValue) * easeOut
      );

      setAnimatedPercent(currentPercent);
      setAnimatedDisplayValue(currentDisplayValue);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(animate);
      } else {
        setAnimatedPercent(targetPercent);
        setAnimatedDisplayValue(targetDisplayValue);
      }
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const normalizedPercent = useMemo(
    () => Math.min(Math.max(animatedPercent, 0), 1),
    [animatedPercent],
  );

  const {
    backgroundPath,
    progressPath,
    needleAngle,
    svgWidth,
    svgHeight,
    centerX,
    centerY,
    radius,
  } = useMemo(() => {
    const radius = 120;
    const strokeWidth = 20;
    const svgWidthValue = (radius + strokeWidth) * 2;
    const svgHeightValue = radius + strokeWidth * 2;
    const center = svgWidthValue / 2;
    const baseLine = svgHeightValue - strokeWidth;

    const describeArc = (startAngle: number, endAngle: number) => {
      const polarToCartesian = (angle: number) => {
        const radians = (angle * Math.PI) / 180;
        return {
          x: center + radius * Math.cos(radians),
          y: baseLine - radius * Math.sin(radians),
        };
      };

      const start = polarToCartesian(startAngle);
      const end = polarToCartesian(endAngle);
      const largeArcFlag = endAngle - startAngle <= -180 ? 1 : 0;

      return [
        "M",
        start.x,
        start.y,
        "A",
        radius,
        radius,
        0,
        largeArcFlag,
        0,
        end.x,
        end.y,
      ].join(" ");
    };

    const percentAngle = 180 - normalizedPercent * 180;
    return {
      backgroundPath: describeArc(180, 0),
      progressPath: describeArc(180, percentAngle),
      needleAngle: -90 + normalizedPercent * 180,
      svgWidth: svgWidthValue,
      svgHeight: svgHeightValue,
      centerX: center,
      centerY: baseLine,
      radius,
    };
  }, [normalizedPercent]);

  return (
    <div className="w-full flex flex-col items-center justify-center py-2 overflow-visible">
      <div
        className="relative flex items-center justify-center w-full"
        style={{ 
          maxWidth: `${width}px`,
          width: '100%',
          aspectRatio: `${width} / ${height}`
        }}
      >
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-full"
          style={{ 
            width: '100%',
            height: '100%',
            maxWidth: '100%'
          }}
          role="img"
          aria-label={`Happiness meter at ${animatedDisplayValue}%`}
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#F0AD4E" />
              <stop offset="100%" stopColor="#5CB85C" />
            </linearGradient>
          </defs>
          <path
            d={backgroundPath}
            fill="transparent"
            stroke="#E5E7EB"
            strokeWidth={20}
            strokeLinecap="round"
          />
          <path
            d={progressPath}
            fill="transparent"
            stroke="url(#gaugeGradient)"
            strokeWidth={20}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 0.3s ease-out" }}
          />
          <g
            style={{
              transformOrigin: `${centerX}px ${centerY}px`,
              transform: `rotate(${needleAngle}deg)`,
              transition: "transform 0.4s ease-out",
            }}
          >
            <line
              x1={centerX}
              y1={centerY}
              x2={centerX}
              y2={centerY - radius}
              stroke="#616161"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <circle cx={centerX} cy={centerY} r="8" fill="#616161" />
          </g>
          <text
            x="50%"
            y="95%"
            textAnchor="middle"
            className="fill-gray-800 dark:fill-gray-100 text-3xl font-semibold"
          >
            {animatedDisplayValue}
          </text>
        </svg>
      </div>

      {showValue && (
        <p className="text-3xl font-semibold mt-3 text-gray-800 dark:text-gray-200 transition-all duration-300">
          {emojiRating || Math.round(animatedDisplayValue / 10)}
        </p>
      )}
    </div>
  );
};

