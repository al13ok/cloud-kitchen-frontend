"use client";
/*
  Applicants Dashboard Page
  - Fetches applicants, categories and daily application stats from API
  - Provides timeline filtering via shared ActionBar and renders:
    - KPI cards (totals and averages)
    - Bar chart by job category
    - Pie chart by years of experience
    - Line chart of daily application volume
    - Donut chart of priority levels
  - Keep edits scoped to this file; do not change shared components from here
*/
import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import BarChartOne from "@/components/charts/bar/BarChartOne";
import DashboardHeader from "@/components/header/DashboardHeader";
import Loader from "@/components/Loader";
import Link from "next/link";
import { ActionBar } from "@/components/header/actionbar";
const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });
const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL;
if (!BACKEND_URL) {
  throw new Error('NEXT_PUBLIC_API_URL environment variable is not set');
}
const APPLICANTS_URL = BACKEND_URL + "/api/v1/jobs";
const CATEGORIES_URL = BACKEND_URL + "/api/v1/jobs/categories";
const DAILY_APPLICATIONS_URL = BACKEND_URL + "/api/v1/jobs/daily-applications";
type Applicant = {
  experience?: number | string;
  priority?: number;
  ats_score?: number;
  job_category?: string;
  date?: string;
  created_at?: string; // Added this field for proper date handling
  name?: string;
  email?: string;
  phone?: string;
};
type Category = { name: string };
export default function ApplicantsDashboard() {
  // const router = useRouter();
  const [allApplicants, setAllApplicants] = useState<Applicant[]>([]); // Store all applicants
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [todayApplicants, setTodayApplicants] = useState<number | null>(null);

  // Filters
  const [timelineFilter, setTimelineFilter] = useState('');
  const [showFilterField, setShowFilterField] = useState(false);
  const [filterQuery, setFilterQuery] = useState("");
  const [filterField, setFilterField] = useState("name");
  const [pendingCustomRange, setPendingCustomRange] = useState<[Date | null, Date | null]>([null, null]);
  const [showCustomPopover, setShowCustomPopover] = useState(false);
  const [downloadMenuOpen, setDownloadMenuOpen] = useState(false);
  const [mobileDownloadMenuOpen, setMobileDownloadMenuOpen] = useState(false);
  const downloadMenuRef = React.useRef<HTMLDivElement>(null);
  const mobileDownloadMenuRef = React.useRef<HTMLDivElement>(null);
  const customPopoverRef = React.useRef<HTMLDivElement>(null);

  // Improved filtering logic
  function filterApplicants(applicants: Applicant[], timeline: string, customRange: [Date | null, Date | null]) {
    let filtered = [...applicants];
    
    // Filter by name, email, or phone if filterQuery is present
    if (filterQuery && filterQuery.trim() !== "") {
      const query = filterQuery.toLowerCase();
      filtered = filtered.filter(applicant => 
        (applicant.name && applicant.name.toLowerCase().includes(query)) ||
        (applicant.email && applicant.email.toLowerCase().includes(query)) ||
        (applicant.phone && applicant.phone.toLowerCase().includes(query))
      );
    }

    // Timeline filter
    if (timeline && timeline !== 'all' && timeline !== '') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      filtered = filtered.filter(applicant => {
        // Try both date fields
        const dateStr = applicant.created_at || applicant.date;
        if (!dateStr) return false;

        const appDate = new Date(dateStr);
        // Validate date
        if (isNaN(appDate.getTime())) return false;

        switch (timeline.toLowerCase()) {
          case 'today':
            const todayEnd = new Date(today);
            todayEnd.setHours(23, 59, 59, 999);
            return appDate >= today && appDate <= todayEnd;
            
          case 'yesterday':
            const yesterday = new Date(today);
            yesterday.setDate(today.getDate() - 1);
            const yesterdayEnd = new Date(yesterday);
            yesterdayEnd.setHours(23, 59, 59, 999);
            return appDate >= yesterday && appDate <= yesterdayEnd;
            
          case 'thisweek':
            const weekStart = new Date(today);
            weekStart.setDate(today.getDate() - today.getDay());
            weekStart.setHours(0, 0, 0, 0);
            const weekEnd = new Date(today);
            weekEnd.setHours(23, 59, 59, 999);
            return appDate >= weekStart && appDate <= weekEnd;
            
          case 'thismonth':
            const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
            monthStart.setHours(0, 0, 0, 0);
            const monthEnd = new Date(today);
            monthEnd.setHours(23, 59, 59, 999);
            return appDate >= monthStart && appDate <= monthEnd;
          
          case 'last30': // Added last 30 days filter
            const last30Days = new Date(today);
            last30Days.setDate(today.getDate() - 30);
            last30Days.setHours(0, 0, 0, 0);
            const last30DaysEnd = new Date(today);
            last30DaysEnd.setHours(23, 59, 59, 999);
            return appDate >= last30Days && appDate <= last30DaysEnd;
            
          case 'custom':
            if (customRange[0] && customRange[1]) {
              const startDate = new Date(customRange[0]);
              startDate.setHours(0, 0, 0, 0);
              const endDate = new Date(customRange[1]);
              endDate.setHours(23, 59, 59, 999);
              return appDate >= startDate && appDate <= endDate;
            }
            return true;
            
          default:
            return true;
        }
      });
    }
    return filtered;
  }
  // Apply filtering
  const filteredApplicants = filterApplicants(allApplicants, timelineFilter, pendingCustomRange);

  // Fetch all data function - reusable for refresh
  const fetchAllData = async () => {
    setLoading(true);
    try {
      // Always fetch all data initially
      const [applicantsResponse, categoriesResponse, dailyResponse] = await Promise.all([
        fetch(APPLICANTS_URL),
        fetch(CATEGORIES_URL),
        fetch(DAILY_APPLICATIONS_URL),
      ]);

      const applicantsData = await applicantsResponse.json();
      const categoriesData = await categoriesResponse.json();
      const dailyData = await dailyResponse.json();

      setAllApplicants(Array.isArray(applicantsData) ? applicantsData : []);
      setCategories(Array.isArray(categoriesData) ? categoriesData : []);
      setTodayApplicants(typeof dailyData.count === 'number' ? dailyData.count : null);
      setError(null);
    } catch (err: unknown) {
      console.error('Fetch error:', err);
      const message = err instanceof Error ? err.message : String(err);
      setError("Failed to fetch data: " + message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch data on component mount
  useEffect(() => {
    fetchAllData();
  }, []); // Only run once on mount


  // --- SUMMARY CARDS DATA ---
  const totalApplications = filteredApplicants.length;


  const highPriority = filteredApplicants.filter(a => typeof a.priority === 'number' && a.priority > 5).length;

  // Calculate average ATS score, only using numeric values
  const atsScoreValues = filteredApplicants
    .map(a => typeof a.ats_score === 'string' ? parseFloat(a.ats_score as string) : a.ats_score)
    .filter((score): score is number => typeof score === 'number' && !isNaN(score));

  const avgAtsScore = atsScoreValues.length > 0
    ? (atsScoreValues.reduce((sum, val) => sum + val, 0) / atsScoreValues.length).toFixed(1)
    : '0';




  // --- BAR CHART: Applications by Job Category ---
  const barData = categories.map((cat, index) => {
    const catName = cat.name;
    // Count applicants where job_category matches category name (case-insensitive)
    const value = filteredApplicants.filter(a =>
      typeof a.job_category === 'string' &&
      a.job_category.trim().toLowerCase() === catName.trim().toLowerCase()
    ).length;
    
    // Color palette for different job categories
    const colorPalette = [
      "#2563EB", "#059669", "#CA8A04", "#DC2626", "#7C3AED", 
      "#0891B2", "#EA580C", "#BE185D", "#0F766E", "#92400E",
      "#1E40AF", "#B45309", "#BE123C", "#7F1D1D", "#059669"
    ];
    
    // Assign color based on category name or index
    let color;
    switch (catName.toLowerCase()) {
      case "software developer":
      case "developer":
        color = "#2563EB"; break;
      case "hr":
      case "human resources":
        color = "#059669"; break;
      case "designer":
      case "ui/ux designer":
        color = "#CA8A04"; break;
      case "manager":
      case "project manager":
        color = "#DC2626"; break;
      case "analyst":
      case "data analyst":
        color = "#7C3AED"; break;
      case "engineer":
      case "software engineer":
        color = "#0891B2"; break;
      case "marketing":
      case "marketing specialist":
        color = "#EA580C"; break;
      case "sales":
      case "sales representative":
        color = "#BE185D"; break;
      case "admin":
      case "administrator":
        color = "#0F766E"; break;
      case "consultant":
        color = "#92400E"; break;
      default:
        color = colorPalette[index % colorPalette.length];
    }
    
    return { label: catName, value, color };
  });
  // --- PIE CHART: Distribution by Years of Experience ---
  const expBuckets = [
    { label: "0–1", range: [0, 1] },
    { label: "2–3", range: [2, 3] },
    { label: "4–5", range: [4, 5] },
    { label: "6+", range: [6, 100] },
  ];
  const pieLabels = expBuckets.map(b => b.label);
  const pieSeries = expBuckets.map(b => filteredApplicants.filter(a => {
    let exp = typeof a.experience === 'string' ? parseFloat(a.experience) : a.experience;
    exp = typeof exp === 'number' && !isNaN(exp) ? exp : 0;
    return exp >= b.range[0] && exp <= b.range[1];
  }).length);



  // --- DONUT CHART: Priority levels ---
  const priorityBuckets = [
    { label: "0–3", range: [0, 3] },
    { label: "4–7", range: [4, 7] },
    { label: "8–10", range: [8, 10] },
  ];
  const donutLabels = priorityBuckets.map(b => b.label);
  const donutSeries = priorityBuckets.map(b => 
    filteredApplicants.filter(a => (a.priority || 0) >= b.range[0] && (a.priority || 0) <= b.range[1]).length
  );

  if (loading) {
    return (
      <div className="max-w-screen-xl mx-auto px-4 py-8">
        <div className="text-center py-10">
          <Loader />
        </div>
      </div>
    );
  }
  if (error) {
    return <div className="max-w-screen-xl mx-auto px-4 py-8 text-center text-red-600">{error}</div>;
  }
  return (
    <div className="relative min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="mx-4 md:mx-6 mt-6">
        <DashboardHeader
          variant="default"
          size="lg"
          title="Applicants Dashboard"
          subtitle="Visualize and manage applications with filters, insights, and fit scores"
          icon={() => (
            <svg className="w-6 h-6 sm:w-8 sm:h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M14 6V4h-4v2H5v14h14V6h-5zm-4 0h4v2h-4V6zm10-2h-3V2h-2v2H9V2H7v2H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2z"/>
          </svg>
          )}
          breadcrumbs={[
            { label: 'Home', href: '/' },
            { label: 'Applicants Dashboard', href: '/applicants-dashboard' }
          ]}
        />
      </div>

      {/* Spacing between header and content */}
      <div className="mt-8 mb-4"></div>

      <div className="w-full min-h-screen flex flex-col">
        <div className="w-full px-4 md:px-6 flex-1">
      {/* Action Bar with Timeline Filter Only */}
      <ActionBar
        filterQuery={filterQuery}
        setFilterQuery={setFilterQuery}
        showFilterField={showFilterField}
        setShowFilterField={setShowFilterField}
        filterField={filterField}
        setFilterField={setFilterField}
        timelineFilter={timelineFilter}
        setTimelineFilter={setTimelineFilter}
        pendingCustomRange={pendingCustomRange}
        setPendingCustomRange={setPendingCustomRange}
        showCustomPopover={showCustomPopover}
        setShowCustomPopover={setShowCustomPopover}
        downloadMenuOpen={downloadMenuOpen}
        setDownloadMenuOpen={setDownloadMenuOpen}
        downloadMenuRef={downloadMenuRef}
        mobileDownloadMenuOpen={mobileDownloadMenuOpen}
        setMobileDownloadMenuOpen={setMobileDownloadMenuOpen}
        mobileDownloadMenuRef={mobileDownloadMenuRef}
        customPopoverRef={customPopoverRef}
        handleExport={() => {}}
        onRefresh={fetchAllData}
        onCreate={() => {}}
        searchPlaceholder="Search applicants..."
        showSearchInput={false}
        showFilterToggle={true}
        showFilterSelector={false}
        showTimelineSelector={true}
        showDownloadButton={false}
        showRefreshButton={true}
        showCreateButton={false}
        showUploadButton={false}
      />
      {/* Enhanced Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full mb-8">
        <Link href="/Jobs" className="block group">
          <div className="group relative overflow-hidden bg-white dark:bg-gray-800 border border-gray-200/60 dark:border-gray-700/60 rounded-3xl p-6 shadow-lg hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-500 hover:-translate-y-2 cursor-pointer min-h-[160px]">
            {/* Professional gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-900/10 dark:to-indigo-900/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            
            {/* Animated background pattern */}
            <div className="absolute inset-0 opacity-5 group-hover:opacity-10 transition-opacity duration-500">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-400/20 to-indigo-400/20 rounded-3xl"></div>
            </div>
            
            {/* Card content */}
            <div className="relative z-10 flex flex-col items-center justify-center text-center h-full">
              <div className="relative mb-4">
                <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/25 group-hover:scale-110 transition-all duration-300">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M14 6V4h-4v2H5v14h14V6h-5zm-4 0h4v2h-4V6zm10-2h-3V2h-2v2H9V2H7v2H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2z"/>
                  </svg>
                </div>
              </div>
              
              <div className="text-3xl font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300 mb-2">
                {totalApplications}
              </div>
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors duration-300">
                Total Applicants
              </div>
            </div>
          </div>
        </Link>

        <Link href="/Jobs" className="block group">
          <div className="group relative overflow-hidden bg-white dark:bg-gray-800 border border-gray-200/60 dark:border-gray-700/60 rounded-3xl p-6 shadow-lg hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-500 hover:-translate-y-2 cursor-pointer min-h-[160px]">
            {/* Card content */}
            <div className="relative z-10 flex flex-col items-center justify-center text-center h-full">
              <div className="relative mb-4">
                <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/25 group-hover:scale-110 transition-all duration-300">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M4 10h16v2H4zm0 4h16v2H4zM4 6h16v2H4z"/>
                  </svg>
                </div>
              </div>
              
              <div className="text-3xl font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300 mb-2">
                {todayApplicants !== null ? todayApplicants : '-'}
              </div>
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors duration-300">
                Today&apos;s Applicants
              </div>
            </div>
          </div>
        </Link>

        <Link href="/Jobs" className="block group">
          <div className="group relative overflow-hidden bg-white dark:bg-gray-800 border border-gray-200/60 dark:border-gray-700/60 rounded-3xl p-6 shadow-lg hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-500 hover:-translate-y-2 cursor-pointer min-h-[160px]">
            {/* Card content */}
            <div className="relative z-10 flex flex-col items-center justify-center text-center h-full">
              <div className="relative mb-4">
                <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/25 group-hover:scale-110 transition-all duration-300">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                  </svg>
                </div>
              </div>
              
              <div className="text-3xl font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300 mb-2">
                {highPriority}
              </div>
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors duration-300">
                High Priority Applicants
              </div>
            </div>
          </div>
        </Link>

        <Link href="/Jobs" className="block group">
          <div className="group relative overflow-hidden bg-white dark:bg-gray-800 border border-gray-200/60 dark:border-gray-700/60 rounded-3xl p-6 shadow-lg hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-500 hover:-translate-y-2 cursor-pointer min-h-[160px]">
            {/* Card content */}
            <div className="relative z-10 flex flex-col items-center justify-center text-center h-full">
              <div className="relative mb-4">
                <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/25 group-hover:scale-110 transition-all duration-300">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
                  </svg>
                </div>
              </div>
              
              <div className="text-3xl font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300 mb-2">
                {avgAtsScore}
              </div>
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors duration-300">
                Average Score
              </div>
            </div>
          </div>
        </Link>
      </div>
      {/* Enhanced Charts Section */}
      {/* Bar chart full width */}
      <div className="mb-6 w-full">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200/60 dark:border-gray-700/60 p-8 overflow-hidden relative">
          {/* Enhanced Header */}
          <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/>
                </svg>
              </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Applications by Job Category</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Distribution of applications across different job categories</p>
            </div>
            </div>
          {barData.length > 0 && barData.some(item => item.value > 0) ? (
            <BarChartOne data={barData} />
          ) : (
            <div className="flex items-center justify-center h-48 sm:h-64 text-gray-500">
              <div className="text-center">
                <svg className="mx-auto h-8 w-8 sm:h-12 sm:w-12 text-gray-400" fill="currentColor" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2z" />
                </svg>
                <p className="mt-2 text-sm">No data available</p>
                <p className="text-xs text-gray-400">No applications found for the selected criteria</p>
              </div>
            </div>
          )}
          </div>
        </div>
      {/* Enhanced Pie and Donut charts side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200/60 dark:border-gray-700/60 p-8 overflow-hidden relative">
          {/* Enhanced Header */}
          <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
                </svg>
              </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Priority Wise Applicants</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Distribution by priority levels</p>
            </div>
            </div>
          <div className="w-full flex justify-center">
            <div className="w-full max-w-xs sm:max-w-[320px] h-64 sm:h-80">
              {donutSeries.some(value => value > 0) ? (
                <ReactApexChart
                  options={{
                    labels: donutLabels,
                    legend: { position: "bottom" },
                    chart: { type: "donut", toolbar: { show: false }, height: 300 },
                    dataLabels: {
                      enabled: true,
                      style: { fontSize: '10px', fontWeight: '500' },
                      dropShadow: { enabled: false },
                      formatter: (val: number) => (val < 3 ? '' : val.toFixed(1) + '%'),
                    },
                    responsive: [{ 
                      breakpoint: 480, 
                      options: { 
                        chart: { width: '100%', height: 250 }, 
                        legend: { position: "bottom" } 
                      } 
                    }],
                    tooltip: { enabled: true },
                  }}
                  series={donutSeries}
                  type="donut"
                  width="100%"
                  height={300}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <div className="text-center">
                    <svg className="mx-auto h-8 w-8 sm:h-12 sm:w-12 text-gray-400" fill="currentColor" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2z" />
                    </svg>
                    <p className="mt-2 text-sm">No data available</p>
                    <p className="text-xs text-gray-400">No priority data found</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200/60 dark:border-gray-700/60 p-8 overflow-hidden relative">
          {/* Enhanced Header */}
          <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
                </svg>
              </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Applicants Experience</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Distribution by years of experience</p>
            </div>
            </div>
          <div className="w-full flex justify-center">
            <div className="w-full max-w-xs sm:max-w-[320px] h-64 sm:h-80">
              {pieSeries.some(value => value > 0) ? (
                <ReactApexChart
                  options={{
                    labels: pieLabels,
                    legend: { position: "bottom" },
                    chart: { type: "pie", toolbar: { show: false }, height: 300 },
                    dataLabels: {
                      enabled: true,
                      style: { fontSize: '10px', fontWeight: '500' },
                      dropShadow: { enabled: false },
                      formatter: (val: number) => (val < 3 ? '' : val.toFixed(1) + '%'),
                    },
                    responsive: [{ 
                      breakpoint: 480, 
                      options: { 
                        chart: { width: '100%', height: 250 }, 
                        legend: { position: "bottom" } 
                      } 
                    }],
                    tooltip: { enabled: true },
                  }}
                  series={pieSeries}
                  type="pie"
                  width="100%"
                  height={300}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <div className="text-center">
                    <svg className="mx-auto h-8 w-8 sm:h-12 sm:w-12 text-gray-400" fill="currentColor" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2z" />
                    </svg>
                    <p className="mt-2 text-sm">No data available</p>
                    <p className="text-xs text-gray-400">No experience data found</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
        </div>
      </div>
    </div>
  );
}