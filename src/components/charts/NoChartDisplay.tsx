import React from "react";

export default function NoChartDisplay({ message = "No Charts to Display", subtext = "Charts will appear when data is available." }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[180px] py-6">
      <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="10" y="10" width="60" height="60" rx="6" fill="#F3F4F6" stroke="#CBD5E1" strokeWidth="2" />
        <polyline points="20,60 35,40 50,50 60,30" fill="none" stroke="#EF4444" strokeWidth="3" />
        <circle cx="20" cy="60" r="2.5" fill="#EF4444" />
        <circle cx="35" cy="40" r="2.5" fill="#EF4444" />
        <circle cx="50" cy="50" r="2.5" fill="#EF4444" />
        <circle cx="60" cy="30" r="2.5" fill="#EF4444" />
      </svg>
      <div className="mt-4 text-xl font-bold text-gray-800 dark:text-white text-center">{message}</div>
      <div className="mt-1 text-gray-500 dark:text-gray-400 text-center text-sm">{subtext}</div>
    </div>
  );
}
