"use client";
import React from "react";

 

import { ApexOptions } from "apexcharts";

 

import dynamic from "next/dynamic";
// Dynamically import the ReactApexChart component
const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

 

// Accept data prop: array of { duration, timestamp }
interface LineChartOneProps {
  data?: { duration: number; timestamp: string }[];
  series?: { name: string; data: number[] }[];
  colors?: string[];
}

 

export default function LineChartOne({ data, series, colors }: LineChartOneProps) {
  // Fallback test data for debugging
  const fallbackData = [
    { duration: 15, timestamp: 'Jul 1' },
    { duration: 30, timestamp: 'Jul 2' },
    { duration: 20, timestamp: 'Jul 3' },
    { duration: 50, timestamp: 'Jul 4' },
    { duration: 15, timestamp: 'Jul 5' },
    { duration: 25, timestamp: 'Jul 6' },
    { duration: 40, timestamp: 'Jul 7' },
    { duration: 10, timestamp: 'Jul 8' },
    { duration: 35, timestamp: 'Jul 9' },
    { duration: 22, timestamp: 'Jul 10' },
  ];
  const chartData = (data && data.length > 0) ? data : fallbackData;

 

  const chartSeries = series && series.length > 0
    ? series
    : [
        {
          name: 'Chat Volume',
          data: chartData.map((d) => d.duration),
        },
      ];

 

  const chartColors = colors && colors.length > 0 ? colors : ['#2563EB'];

 

  const options: ApexOptions = {
    legend: {
      show: false, // Hide legend
      position: "top",
      horizontalAlign: "left",
    },
    colors: chartColors,
    chart: {
      fontFamily: "Outfit, sans-serif",
      height: 310,
      type: "line", // Set the chart type to 'line'
      toolbar: {
        show: false, // Hide chart toolbar
      },
    },
    stroke: {
      curve: "smooth", // Smooth line
      width: [4], // Bold but not too thick
    },
    fill: {
      type: "solid",
    },
    markers: {
      size: 5,
      strokeColors: "#2563EB",
      strokeWidth: 3,
      hover: {
        size: 8, // Marker size on hover
      },
    },
    grid: {
      xaxis: {
        lines: {
          show: false, // Hide grid lines on x-axis
        },
      },
      yaxis: {
        lines: {
          show: true, // Show grid lines on y-axis
        },
      },
    },
    dataLabels: {
      enabled: false, // Disable data labels
    },
    tooltip: {
      enabled: true, // Enable tooltip
      x: {
        format: undefined, // No date formatting
      },
    },
    xaxis: {
      type: "category", // Category-based x-axis
      categories: series && series.length > 0
        ? (series[0].data.length ===  chartData.length ? chartData.map((d) => d.timestamp) : undefined)
        : chartData.map((d) => d.timestamp),
      axisBorder: {
        show: false, // Hide x-axis border
      },
      axisTicks: {
        show: false, // Hide x-axis ticks
      },
      tooltip: {
        enabled: false, // Disable tooltip for x-axis points
      },
    },
    yaxis: {
      labels: {
        style: {
          fontSize: "12px", // Adjust font size for y-axis labels
          colors: ["#6B7280"], // Color of the labels
        },
      },
      title: {
        text: "", // Remove y-axis title
        style: {
          fontSize: "0px",
        },
      },
    },
  };

 

  return (
    <div className="max-w-full overflow-x-auto custom-scrollbar">
      <div id="chartEight" className="min-w-[1000px]">
        <ReactApexChart
          options={options}
          series={chartSeries}
          type="line" // Use line type
          height={310}
        />
      </div>
    </div>
  );
}