"use client";



import React, { useMemo, useState } from "react";
import Button from "@/components/ui/button/Button";
import FeedbackTable from "./FeedbackTable";
import FeedbackStatsDashboard from "./FeedbackStatsDashboard";



const BASE_API_URL = "https://wa-mobiloitte.converiqo.ai";



export default function FeedbackModule() {
  const [showDashboard, setShowDashboard] = useState(false);
  const [currentFilters] = useState<Record<string, string | undefined>>({});



  const effectiveFilters = useMemo(() => currentFilters, [currentFilters]);



  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-lg md:text-xl text-gray-900 dark:text-white">Feedback</h2>
        <Button onClick={() => setShowDashboard((v) => !v)}>
          {showDashboard ? "Hide Stats Dashboard" : "View Stats Dashboard"}
        </Button>
      </div>



      {!showDashboard && (
        <FeedbackTable
          apiBaseUrl={BASE_API_URL}
        />
      )}



      {showDashboard && (
        <FeedbackStatsDashboard
          apiBaseUrl={BASE_API_URL}
          filters={effectiveFilters}
          onClose={() => setShowDashboard(false)}
        />
      )}
    </div>
  );
}
