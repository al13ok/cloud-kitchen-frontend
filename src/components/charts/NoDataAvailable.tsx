import React from "react";

export default function NoDataAvailable({ message = "No Data Available", subtext = "No leads found matching your current filters." }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[180px] py-6">
      <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="10" y="10" width="60" height="60" rx="6" fill="#F3F4F6" stroke="#111" strokeWidth="2" />
        <rect x="22" y="48" width="6" height="12" rx="2" fill="#22c55e" />
        <rect x="34" y="38" width="6" height="22" rx="2" fill="#3b82f6" />
        <rect x="46" y="44" width="6" height="16" rx="2" fill="#ef4444" />
        <rect x="58" y="28" width="6" height="32" rx="2" fill="#2563eb" />
      </svg>
      <div className="mt-4 text-xl font-bold text-gray-800 dark:text-white text-center">{message}</div>
      <div className="mt-1 text-gray-500 dark:text-gray-400 text-center text-sm">{subtext}</div>
    </div>
  );
}
