"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  LayoutGrid,
  TrendingUp,
  FileText,
  ArrowUp,
  ClipboardList
} from "lucide-react";
import { getAllSurveyFeedback, getAllSurveyEmailTracking } from "@/utils/api";
import { useTenant } from "@/context/TenantContext";
import { EnvelopeIcon } from "@/icons";
import Link from "next/link";
import { RatingDistributionChart } from "@/components/rating-distribution-chart";
import { RadialBarChart } from "@/components/radial-bar-chart";
import DashboardHeader from "@/components/header/DashboardHeader";

interface FeedbackData {
  feedback_id: string;
  email: string;
  rating: number;
  comment: string;
  submitted_date: string;
}

interface AnalyticsData {
  totalResponses: number;
  avgRating: number;
  npsScore: number;
  csatScore: number;
  sentimentBreakdown: {
    positive: number;
    neutral: number;
    negative: number;
  };
  trendData: Array<{ date: string; responses: number; avgRating: number }>;
  ratingDistribution: Array<{ rating: number; count: number }>;
}

const DashboardPage: React.FC = () => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);
  const [clickedDataPoint, setClickedDataPoint] = useState<number | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [surveyCount, setSurveyCount] = useState<number>(0);
  const tenant = useTenant();

  // Hydration guard
  useEffect(() => {
    setHydrated(true);
  }, []);

  const calculateAnalytics = (data: FeedbackData[]): AnalyticsData => {
    if (data.length === 0) {
      return {
        totalResponses: 0,
        avgRating: 0,
        npsScore: 0,
        csatScore: 0,
        sentimentBreakdown: { positive: 0, neutral: 0, negative: 0 },
        trendData: [],
        ratingDistribution: [],
      };
    }

    // Calculate average rating
    const avgRating = data.reduce((sum, item) => sum + item.rating, 0) / data.length;

    // Calculate NPS Score (ratings 9-10 are promoters, 7-8 are passives, 0-6 are detractors)
    const promoters = data.filter(item => item.rating >= 9).length;
    const detractors = data.filter(item => item.rating <= 6).length;
    const npsScore = ((promoters - detractors) / data.length) * 100;

    // Calculate CSAT (percentage of ratings 4-5 out of 5, scaled from 10)
    const satisfied = data.filter(item => item.rating >= 8).length;
    const csatScore = (satisfied / data.length) * 100;

    // Sentiment breakdown based on rating
    const positive = data.filter(item => item.rating >= 8).length;
    const neutral = data.filter(item => item.rating >= 5 && item.rating < 8).length;
    const negative = data.filter(item => item.rating < 5).length;

    // Trend data (group by date)
    const trendMap = new Map<string, { total: number; sum: number }>();
    data.forEach(item => {
      const date = new Date(item.submitted_date).toISOString().split('T')[0];
      const existing = trendMap.get(date) || { total: 0, sum: 0 };
      trendMap.set(date, {
        total: existing.total + 1,
        sum: existing.sum + item.rating,
      });
    });

    const trendData = Array.from(trendMap.entries())
      .map(([date, { total, sum }]) => ({
        date,
        responses: total,
        avgRating: Number((sum / total).toFixed(1)),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Rating distribution
    const ratingMap = new Map<number, number>();
    data.forEach(item => {
      const rating = Math.floor(item.rating);
      ratingMap.set(rating, (ratingMap.get(rating) || 0) + 1);
    });

    const ratingDistribution = Array.from(ratingMap.entries())
      .map(([rating, count]) => ({ rating, count }))
      .sort((a, b) => a.rating - b.rating);

    return {
      totalResponses: data.length,
      avgRating: Number(avgRating.toFixed(1)),
      npsScore: Number(npsScore.toFixed(1)),
      csatScore: Number(csatScore.toFixed(1)),
      sentimentBreakdown: { positive, neutral, negative },
      trendData,
      ratingDistribution,
    };
  };

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      console.log('📊 Fetching dashboard data...');
      const response = await getAllSurveyFeedback();
      console.log('📊 Dashboard data received:', response);

      const data = response.feedbacks || [];

      // Calculate analytics
      const analyticsData = calculateAnalytics(data);
      setAnalytics(analyticsData);
      setError(null);
    } catch (err: unknown) {
      console.error('Error fetching dashboard data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSurveyCount = useCallback(async () => {
    try {
      console.log('📊 Fetching survey count...');
      const response = await getAllSurveyEmailTracking();
      console.log('📊 Survey tracking data received:', response);

      const trackingRecords = response.tracking_records || [];
      // Get unique survey IDs
      const uniqueSurveyIds = new Set(trackingRecords.map(record => record.survey_id));
      const count = uniqueSurveyIds.size;

      console.log('📊 Total unique surveys:', count);
      setSurveyCount(count);
    } catch (err: unknown) {
      console.error('Error fetching survey count:', err);
      // Don't set error, just keep count at 0
      setSurveyCount(0);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
    fetchSurveyCount();
  }, [fetchDashboardData, fetchSurveyCount]);


  const kpiData = analytics ? [
    {
      title: "Total Responses",
      value: analytics.totalResponses.toString(),
      change: "+" + Math.floor(analytics.totalResponses * 0.1),
      changeType: "positive" as const,
      icon: LayoutGrid,
      color: "blue",
      bgColor: "bg-blue-100 dark:bg-blue-900/20",
      iconColor: "text-blue-600 dark:text-blue-400",
      href: undefined,
    },
    {
      title: "Avg Rating",
      value: analytics.avgRating.toFixed(1),
      change: "+0.3",
      changeType: "positive" as const,
      icon: TrendingUp,
      color: "green",
      bgColor: "bg-green-100 dark:bg-green-900/20",
      iconColor: "text-green-600 dark:text-green-400",
      href: undefined,
    },
    {
      title: "Created Survey",
      value: surveyCount.toString(),
      change: "",
      changeType: "positive" as const,
      icon: EnvelopeIcon,
      color: "purple",
      bgColor: "bg-purple-100 dark:bg-purple-900/20",
      iconColor: "text-purple-600 dark:text-purple-400",
      href: "/survey-feedback/created-surveys",
    },
    {
      title: "CSAT Score",
      value: analytics.csatScore.toFixed(0) + "%",
      change: "+3%",
      changeType: "positive" as const,
      icon: FileText,
      color: "orange",
      bgColor: "bg-orange-100 dark:bg-orange-900/20",
      iconColor: "text-orange-600 dark:text-orange-400",
      href: undefined,
    },
  ] : [
    {
      title: "Created Survey",
      value: surveyCount.toString(),
      change: "",
      changeType: "positive" as const,
      icon: EnvelopeIcon,
      color: "purple",
      bgColor: "bg-purple-100 dark:bg-purple-900/20",
      iconColor: "text-purple-600 dark:text-purple-400",
      href: "/survey-feedback/created-surveys",
    },
  ];

  if (!hydrated) {
    return (
      <div className="flex h-screen items-center justify-center bg-white dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-sm md:text-base text-gray-600 dark:text-gray-300">
            Loading interface…
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] bg-white dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-sm md:text-base text-gray-600 dark:text-gray-300">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] bg-white dark:bg-gray-900">
        <div className="text-center">
          <p className="text-sm md:text-base text-red-600 dark:text-red-400 mb-4">{error}</p>
          <button
            onClick={fetchDashboardData}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-full px-5 py-2 transition-all focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            aria-label="Retry loading dashboard"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Dashboard Header */}
        <DashboardHeader
          title="Survey Dashboard"
          subtitle={`Welcome to ${tenant.tenant.name} Intelligent Dashboard - Overview of your survey performance and key metrics`}
          icon={ClipboardList}
          iconColor="text-white"
          hideTenantPrefix={true}
          breadcrumbs={[
            { label: 'Home', href: '/' },
            { label: 'Survey & Feedback', href: '/survey-feedback' },
            { label: 'Dashboard' }
          ]}
        />

        <div className="space-y-8 mt-8">

          {/* KPI Cards - Enterprise design */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {kpiData.map((kpi, index) => {
              const IconComponent = kpi.icon;
              const cardContent = (
                <div
                  className={`bg-white dark:bg-gray-800 rounded-2xl shadow-sm hover:shadow-xl hover:scale-[1.02] transition-all duration-300 border border-gray-200 dark:border-gray-700 p-6 md:p-8 space-y-4 ${kpi.href ? 'cursor-pointer' : ''}`}
                  role="region"
                  aria-label={`${kpi.title} metric card`}
                >
                  <div className="flex items-start justify-between">
                    <div className={`${kpi.bgColor} p-3 rounded-lg flex items-center justify-center`}>
                      {kpi.title === "Created Survey" ? (
                        <EnvelopeIcon className={`h-6 w-6 ${kpi.iconColor}`} />
                      ) : (
                        <IconComponent
                          className={`h-6 w-6 ${kpi.iconColor}`}
                          aria-hidden="true"
                        />
                      )}
                    </div>

                    {kpi.change && (
                      <div className={`flex items-center gap-1 ${kpi.iconColor}`}>
                        <ArrowUp className="h-4 w-4" aria-hidden="true" />
                        <span className="text-sm font-semibold">
                          {kpi.change}
                        </span>
                      </div>
                    )}
                  </div>

                  <div>
                    <h3 className="text-3xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                      {kpi.value}
                    </h3>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {kpi.title}
                    </p>
                  </div>
                </div>
              );

              return kpi.href ? (
                <Link key={index} href={kpi.href}>
                  {cardContent}
                </Link>
              ) : (
                <React.Fragment key={index}>{cardContent}</React.Fragment>
              );
            })}
          </div>

          {/* Analytics Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Response Trend Chart - Full width */}
            <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl shadow-sm hover:shadow-xl hover:scale-[1.01] transition-all duration-300 border border-gray-200 dark:border-gray-700 p-6 md:p-8">
              <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-6">
                Response Trend Over Time
              </h3>
              {analytics && analytics.trendData.length > 0 ? (
                (() => {
                  const data = analytics.trendData;
                  const W = 850;
                  const H = 380;
                  const PAD_L = 60;
                  const PAD_R = 40;
                  const PAD_T = 20;
                  const PAD_B = 50;
                  const innerW = W - PAD_L - PAD_R;
                  const innerH = H - PAD_T - PAD_B;

                  const maxResp = Math.max(...data.map(d => d.responses), 1);
                  const maxRating = Math.max(...data.map(d => d.avgRating), 10);
                  const minRating = Math.min(...data.map(d => d.avgRating), 0);
                  const x = (i: number) => data.length === 1 ? PAD_L + innerW / 2 : PAD_L + (innerW * i) / (data.length - 1);
                  const yResp = (v: number) => PAD_T + innerH - (v / maxResp) * innerH;
                  const yRate = (v: number) => {
                    const range = maxRating - minRating || 1;
                    return PAD_T + innerH - ((v - minRating) / range) * innerH;
                  };

                  const areaPath = data.length === 1
                    ? `M ${x(0) - 30} ${yResp(data[0].responses)} L ${x(0) + 30} ${yResp(data[0].responses)} L ${x(0) + 30} ${PAD_T + innerH} L ${x(0) - 30} ${PAD_T + innerH} Z`
                    : data
                      .map((d, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${yResp(d.responses)}`)
                      .join(' ')
                    + ` L ${PAD_L + innerW} ${PAD_T + innerH} L ${PAD_L} ${PAD_T + innerH} Z`;

                  const linePath = data.length === 1
                    ? `M ${x(0) - 30} ${yRate(data[0].avgRating)} L ${x(0) + 30} ${yRate(data[0].avgRating)}`
                    : data
                      .map((d, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${yRate(d.avgRating)}`)
                      .join(' ');

                  const ticks = 4;
                  const gridY = Array.from({ length: ticks + 1 }, (_, i) => i / ticks);

                  return (
                    <div className="w-full flex justify-center overflow-x-auto">
                      <svg
                        width={W}
                        height={H}
                        className="min-w-full"
                        onClick={(e) => {
                          if (e.target === e.currentTarget) {
                            setClickedDataPoint(null);
                          }
                        }}
                        style={{ cursor: 'default' }}
                        aria-label="Response trend chart"
                        role="img"
                      >
                        <defs>
                          <linearGradient id="respFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.35" />
                            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.06" />
                          </linearGradient>
                          <linearGradient id="respStroke" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="#60a5fa" />
                            <stop offset="100%" stopColor="#2563eb" />
                          </linearGradient>
                        </defs>
                        {/* Vertical line indicator on click */}
                        {clickedDataPoint !== null && data[clickedDataPoint] && (
                          <g>
                            <line
                              x1={x(clickedDataPoint)}
                              x2={x(clickedDataPoint)}
                              y1={PAD_T}
                              y2={PAD_T + innerH}
                              stroke="#64748b"
                              strokeWidth="2"
                              strokeDasharray="6 4"
                              opacity="0.6"
                            />
                            <g>
                              <rect
                                x={x(clickedDataPoint) - 40}
                                y={yResp(data[clickedDataPoint].responses) - 45}
                                width="80"
                                height="32"
                                fill="#1e40af"
                                rx="6"
                                opacity="0.95"
                              />
                              <text
                                x={x(clickedDataPoint)}
                                y={yResp(data[clickedDataPoint].responses) - 25}
                                textAnchor="middle"
                                fill="white"
                                fontSize="13"
                                fontWeight="600"
                              >
                                {data[clickedDataPoint].responses} resp
                              </text>
                            </g>
                            <g>
                              <rect
                                x={x(clickedDataPoint) + 50}
                                y={yRate(data[clickedDataPoint].avgRating) - 25}
                                width="70"
                                height="32"
                                fill="#16a34a"
                                rx="6"
                                opacity="0.95"
                              />
                              <text
                                x={x(clickedDataPoint) + 85}
                                y={yRate(data[clickedDataPoint].avgRating) - 8}
                                textAnchor="middle"
                                fill="white"
                                fontSize="13"
                                fontWeight="600"
                              >
                                {data[clickedDataPoint].avgRating.toFixed(1)} ⭐
                              </text>
                            </g>
                            <g>
                              <rect
                                x={x(clickedDataPoint) - 70}
                                y={PAD_T + innerH + 50}
                                width="140"
                                height="28"
                                fill="#334155"
                                rx="6"
                                opacity="0.95"
                              />
                              <text
                                x={x(clickedDataPoint)}
                                y={PAD_T + innerH + 68}
                                textAnchor="middle"
                                fill="white"
                                fontSize="13"
                                fontWeight="600"
                              >
                                {data[clickedDataPoint].date}
                              </text>
                            </g>
                          </g>
                        )}
                        {/* grid */}
                        {gridY.map((t, i) => (
                          <g key={i}>
                            <line
                              x1={PAD_L}
                              x2={PAD_L + innerW}
                              y1={PAD_T + innerH - t * innerH}
                              y2={PAD_T + innerH - t * innerH}
                              stroke="#475569"
                              strokeDasharray="4 4"
                            />
                            <text
                              x={PAD_L - 12}
                              y={PAD_T + innerH - t * innerH}
                              textAnchor="end"
                              dominantBaseline="central"
                              fill="#94a3b8"
                              fontSize="12"
                              fontWeight="500"
                            >
                              {Math.round(maxResp * t)}
                            </text>
                          </g>
                        ))}
                        {/* x labels */}
                        {data.map((d, i) => (
                          <text
                            key={`x-${i}`}
                            x={x(i)}
                            y={PAD_T + innerH + 24}
                            textAnchor="middle"
                            fill="#94a3b8"
                            fontSize="12"
                            fontWeight="500"
                          >
                            {d.date}
                          </text>
                        ))}
                        {/* responses area + stroke */}
                        <path d={areaPath} fill="url(#respFill)" />
                        <path
                          d={data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${yResp(d.responses)}`).join(' ')}
                          stroke="url(#respStroke)"
                          strokeWidth={3}
                          fill="none"
                        />
                        {/* avg rating line */}
                        <path d={linePath} stroke="#22c55e" strokeWidth={2.5} fill="none" />
                        {/* points with hover and click effects */}
                        {data.map((d, i) => (
                          <g key={`pt-${i}`}>
                            {/* Hover tooltip for responses */}
                            {hoveredPoint === i && (
                              <g>
                                <rect
                                  x={x(i) - 50}
                                  y={yResp(d.responses) - 50}
                                  width="100"
                                  height="35"
                                  rx="6"
                                  fill="rgba(0, 0, 0, 0.85)"
                                  className="dark:fill-gray-900"
                                  style={{
                                    filter: 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.3))',
                                  }}
                                />
                                <text
                                  x={x(i)}
                                  y={yResp(d.responses) - 35}
                                  textAnchor="middle"
                                  fill="white"
                                  className="dark:fill-white"
                                  fontSize="12"
                                  fontWeight="600"
                                >
                                  Responses: {d.responses}
                                </text>
                                <text
                                  x={x(i)}
                                  y={yResp(d.responses) - 20}
                                  textAnchor="middle"
                                  fill="rgba(255, 255, 255, 0.9)"
                                  className="dark:fill-gray-300"
                                  fontSize="11"
                                  fontWeight="500"
                                >
                                  {d.date}
                                </text>
                              </g>
                            )}
                            {/* Hover tooltip for rating */}
                            {hoveredPoint === i && (
                              <g>
                                <rect
                                  x={x(i) - 50}
                                  y={yRate(d.avgRating) - 50}
                                  width="100"
                                  height="35"
                                  rx="6"
                                  fill="rgba(0, 0, 0, 0.85)"
                                  className="dark:fill-gray-900"
                                  style={{
                                    filter: 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.3))',
                                  }}
                                />
                                <text
                                  x={x(i)}
                                  y={yRate(d.avgRating) - 35}
                                  textAnchor="middle"
                                  fill="white"
                                  className="dark:fill-white"
                                  fontSize="12"
                                  fontWeight="600"
                                >
                                  Rating: {d.avgRating.toFixed(1)}
                                </text>
                                <text
                                  x={x(i)}
                                  y={yRate(d.avgRating) - 20}
                                  textAnchor="middle"
                                  fill="rgba(255, 255, 255, 0.9)"
                                  className="dark:fill-gray-300"
                                  fontSize="11"
                                  fontWeight="500"
                                >
                                  {d.date}
                                </text>
                              </g>
                            )}
                            <circle
                              cx={x(i)}
                              cy={yResp(d.responses)}
                              r={hoveredPoint === i || clickedDataPoint === i ? 8 : 4}
                              fill="#2563eb"
                              onMouseEnter={() => setHoveredPoint(i)}
                              onMouseLeave={() => setHoveredPoint(null)}
                              onClick={(e) => {
                                e.stopPropagation();
                                setClickedDataPoint(clickedDataPoint === i ? null : i);
                              }}
                              style={{
                                cursor: 'pointer',
                                transition: 'all 0.2s ease-in-out',
                                filter: hoveredPoint === i || clickedDataPoint === i ? 'drop-shadow(0 4px 8px rgba(37, 99, 235, 0.4))' : 'none'
                              }}
                              aria-label={`Data point ${i + 1}: ${d.responses} responses on ${d.date}`}
                            />
                            <circle
                              cx={x(i)}
                              cy={yRate(d.avgRating)}
                              r={hoveredPoint === i || clickedDataPoint === i ? 8 : 4}
                              fill="#22c55e"
                              onMouseEnter={() => setHoveredPoint(i)}
                              onMouseLeave={() => setHoveredPoint(null)}
                              onClick={(e) => {
                                e.stopPropagation();
                                setClickedDataPoint(clickedDataPoint === i ? null : i);
                              }}
                              style={{
                                cursor: 'pointer',
                                transition: 'all 0.2s ease-in-out',
                                filter: hoveredPoint === i || clickedDataPoint === i ? 'drop-shadow(0 4px 8px rgba(34, 197, 94, 0.4))' : 'none'
                              }}
                              aria-label={`Data point ${i + 1}: ${d.avgRating} average rating on ${d.date}`}
                            />
                          </g>
                        ))}
                        {/* right axis labels for rating */}
                        {gridY.map((t, i) => (
                          <text
                            key={`ry-${i}`}
                            x={PAD_L + innerW + 10}
                            y={PAD_T + innerH - t * innerH}
                            fill="#94a3b8"
                            fontSize="12"
                            fontWeight="500"
                          >
                            {(minRating + (maxRating - minRating) * t).toFixed(1)}
                          </text>
                        ))}
                      </svg>
                    </div>
                  );
                })()
              ) : (
                <div className="h-64 flex items-center justify-center">
                  <p className="text-sm md:text-base text-gray-600 dark:text-gray-300">No trend data available</p>
                </div>
              )}
            </div>

            {/* Sentiment Distribution (Radial Bar) */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm hover:shadow-xl hover:scale-[1.01] transition-all duration-300 border border-gray-200 dark:border-gray-700 p-6 md:p-8">
              <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-6">
                Sentiment Distribution
              </h3>
              {analytics ? (
                <RadialBarChart
                  data={[
                    {
                      label: 'Positive',
                      value: analytics.sentimentBreakdown.positive,
                      color: '#10b981'
                    },
                    {
                      label: 'Neutral',
                      value: analytics.sentimentBreakdown.neutral,
                      color: '#6b7280'
                    },
                    {
                      label: 'Negative',
                      value: analytics.sentimentBreakdown.negative,
                      color: '#ef4444'
                    },
                  ]}
                  total={analytics.sentimentBreakdown.positive + analytics.sentimentBreakdown.neutral + analytics.sentimentBreakdown.negative}
                  totalLabel="Total"
                  height={350}
                  width={350}
                  strokeWidth={20}
                  gap={4}
                />
              ) : (
                <div className="flex items-center justify-center h-64">
                  <p className="text-sm md:text-base text-gray-600 dark:text-gray-300">No sentiment data available</p>
                </div>
              )}
            </div>
          </div>

          {/* Rating Distribution Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm hover:shadow-xl hover:scale-[1.01] transition-all duration-300 border border-gray-200 dark:border-gray-700 p-6 md:p-8">
            {analytics && analytics.ratingDistribution.length > 0 ? (
              <RatingDistributionChart
                data={analytics.ratingDistribution}
                title="How likely are you to recommend our product to a friend or colleague?"
                width={1000}
                height={500}
              />
            ) : (
              <div className="flex items-center justify-center h-64 w-full">
                <p className="text-sm md:text-base text-gray-600 dark:text-gray-300">No rating data available</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
