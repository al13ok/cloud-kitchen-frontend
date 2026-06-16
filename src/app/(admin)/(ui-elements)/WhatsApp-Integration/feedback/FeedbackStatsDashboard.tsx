// this is the client-side code for the FeedbackStatsDashboard component
"use client";

 

import React, { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Button from "@/components/ui/button/Button";
import type { ApexOptions } from "apexcharts";

 

type RatingCounts = { positive: number; neutral: number; negative: number };

 

type TimeSeriesPoint = {
  bucket: string;
  positive: number;
  neutral: number;
  negative: number;
  total: number;
};

 

type FeedbackStatsResponse = {
  total: number;
  rating_counts: RatingCounts;
  role_breakdown: { role: string; count: number }[];
  time_series: TimeSeriesPoint[];
  group_by: string;
};

 

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

 

type AxisSeries = { name: string; data: number[] }[];
type DonutSeries = number[];

interface FeedbackStatsDashboardProps {
  apiBaseUrl: string;
  filters: Record<string, string | undefined>;
  onClose?: () => void;
}

 

const containerClass =
  "rounded-2xl border border-gray-200 bg-white px-5 pb-5 pt-5 dark:border-gray-800 dark:bg-white/[0.03]";

 

export default function FeedbackStatsDashboard({ apiBaseUrl, filters, onClose }: FeedbackStatsDashboardProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<FeedbackStatsResponse | null>(null);

 

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.append(key, value);
    });
    params.append("group_by", "day");
    return params.toString();
  }, [filters]);

 

  useEffect(() => {
    let ignore = false;
    const fetchStats = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${apiBaseUrl}/feedback/stats?${queryString}`, {
          headers: { accept: "application/json" },
          cache: "no-store",
        });
        if (!res.ok) throw new Error("Failed to load stats");
        const json = (await res.json()) as FeedbackStatsResponse;
        if (!ignore) setData(json);
      } catch (e) {
        // Fallback: compute stats client-side from /feedback list if server stats are unavailable
        try {
          const params = new URLSearchParams(queryString);
          // remove group_by which is not needed for /feedback list
          params.delete("group_by");
          // fetch up to 1000 items in pages of 200
          let page = 1;
          const pageSize = 200;
          let allItems: Array<{ rating?: string; role?: string; timestamp?: string }> = [];
          while (true) {
            params.set("page", String(page));
            params.set("page_size", String(pageSize));
            const listRes = await fetch(`${apiBaseUrl}/feedback?${params.toString()}`, {
              headers: { accept: "application/json" },
              cache: "no-store",
            });
            if (!listRes.ok) throw new Error("Fallback list fetch failed");
            const listJson = await listRes.json();
            const items = (listJson.items || []) as Array<{ rating?: string; role?: string; timestamp?: string }>;
            allItems = allItems.concat(items);
            const total = Number(listJson.total || 0);
            if (allItems.length >= total || allItems.length >= 1000 || items.length < pageSize) break;
            page += 1;
          }

 

          // compute rating counts
          const ratingCounts: RatingCounts = { positive: 0, neutral: 0, negative: 0 };
          const roleMap: Record<string, number> = {};
          const seriesMap: Record<string, { positive: number; neutral: number; negative: number; total: number }> = {};
          for (const it of allItems) {
            const r = String(it.rating || "").toLowerCase();
            if (r === "positive" || r === "neutral" || r === "negative") {
              ratingCounts[r] += 1;
            }
            const roleKey = (it.role || "").toString() || "unknown";
            roleMap[roleKey] = (roleMap[roleKey] || 0) + 1;
            const dt = it.timestamp ? new Date(it.timestamp) : null;
            const bucket = dt && !isNaN(dt.getTime()) ? dt.toISOString().slice(0, 10) : "unknown";
            if (!seriesMap[bucket]) seriesMap[bucket] = { positive: 0, neutral: 0, negative: 0, total: 0 };
            if (r === "positive" || r === "neutral" || r === "negative") {
              seriesMap[bucket][r] += 1;
              seriesMap[bucket].total += 1;
            }
          }
          const role_breakdown = Object.entries(roleMap).map(([role, count]) => ({ role, count }));
          const time_series = Object.entries(seriesMap)
            .filter(([b]) => b !== "unknown")
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([bucket, vals]) => ({ bucket, ...vals }));

 

          const fallbackData: FeedbackStatsResponse = {
            total: allItems.length,
            rating_counts: ratingCounts,
            role_breakdown,
            time_series,
            group_by: "day",
          };
          if (!ignore) {
            setData(fallbackData);
            setError(null);
          }
        } catch (fallbackError) {
          if (!ignore) setError(
            fallbackError instanceof Error ? fallbackError.message : (e instanceof Error ? e.message : "Error fetching stats")
          );
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    fetchStats();
    return () => {
      ignore = true;
    };
  }, [apiBaseUrl, queryString]);

 

  const ratingSeries = useMemo<AxisSeries>(() => {
    const counts = data?.rating_counts || { positive: 0, neutral: 0, negative: 0 };
    return [
      {
        name: "Count",
        data: [counts.positive, counts.neutral, counts.negative],
      },
    ];
  }, [data]);

 

  const ratingOptions = useMemo<ApexOptions>(() => ({
    chart: { type: "bar", toolbar: { show: false }, fontFamily: "Outfit, sans-serif" },
    colors: ["#3B82F6"],
    plotOptions: { bar: { columnWidth: "40%", borderRadius: 6 } },
    dataLabels: { enabled: false },
    xaxis: { categories: ["Positive", "Neutral", "Negative"], labels: { style: { colors: ["#6B7280"] } } },
    yaxis: { labels: { style: { colors: ["#6B7280"] } } },
    grid: { yaxis: { lines: { show: true } }, xaxis: { lines: { show: false } } },
    tooltip: { theme: "dark" },
    legend: { show: false },
  }), []);

 

  const timeSeriesOptions = useMemo<ApexOptions>(() => ({
    chart: { type: "bar", stacked: true, toolbar: { show: false }, fontFamily: "Outfit, sans-serif" },
    plotOptions: { bar: { columnWidth: "45%", borderRadius: 4 } },
    colors: ["#10B981", "#F59E0B", "#EF4444"],
    dataLabels: { enabled: false },
    xaxis: {
      categories: (data?.time_series || []).map((d) => d.bucket),
      labels: { rotate: -30, hideOverlappingLabels: true, style: { colors: ["#6B7280"] } },
    },
    yaxis: { labels: { style: { colors: ["#6B7280"] } } },
    grid: { yaxis: { lines: { show: true } }, xaxis: { lines: { show: false } } },
    tooltip: { shared: true, theme: "dark", intersect: false },
    legend: { position: "top" },
  }), [data]);

 

  const timeSeriesSeries = useMemo<AxisSeries>(() => {
    const ts = data?.time_series || [];
    return [
      { name: "Positive", data: ts.map((d) => d.positive) },
      { name: "Neutral", data: ts.map((d) => d.neutral) },
      { name: "Negative", data: ts.map((d) => d.negative) },
    ];
  }, [data]);

 

  const roleOptions = useMemo<ApexOptions>(() => ({
    chart: { type: "donut", toolbar: { show: false }, fontFamily: "Outfit, sans-serif" },
    labels: (data?.role_breakdown || []).map((r) => r.role || "unknown"),
    legend: { position: "bottom" },
    colors: ["#6366F1", "#06B6D4", "#F97316", "#84CC16", "#EC4899", "#A78BFA"],
    dataLabels: { enabled: false },
    tooltip: { theme: "dark" },
  }), [data]);

 

  const roleSeries = useMemo<DonutSeries>(() => {
    return (data?.role_breakdown || []).map((r) => r.count || 0);
  }, [data]);

 

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Feedback Stats</h3>
        {onClose && (
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        )}
      </div>

 

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className={containerClass}>
          <h4 className="text-base font-medium text-gray-800 dark:text-white/90 mb-4">Rating Breakdown</h4>
          {loading ? (
            <div className="py-10 text-center text-gray-500 dark:text-gray-400">Loading...</div>
          ) : error ? (
            <div className="py-10 text-center text-red-500">{error}</div>
          ) : (
            <ReactApexChart options={ratingOptions} series={ratingSeries} type="bar" height={300} />
          )}
        </div>

 

        <div className={containerClass}>
          <h4 className="text-base font-medium text-gray-800 dark:text-white/90 mb-4">Daily Trend (Stacked)</h4>
          {loading ? (
            <div className="py-10 text-center text-gray-500 dark:text-gray-400">Loading...</div>
          ) : error ? (
            <div className="py-10 text-center text-red-500">{error}</div>
          ) : (
            <div className="max-w-full overflow-x-auto custom-scrollbar">
              <div className="min-w-[700px] xl:min-w-full">
                <ReactApexChart options={timeSeriesOptions} series={timeSeriesSeries} type="bar" height={300} />
              </div>
            </div>
          )}
        </div>

 

        <div className={containerClass}>
          <h4 className="text-base font-medium text-gray-800 dark:text-white/90 mb-4">Role Breakdown</h4>
          {loading ? (
            <div className="py-10 text-center text-gray-500 dark:text-gray-400">Loading...</div>
          ) : error ? (
            <div className="py-10 text-center text-red-500">{error}</div>
          ) : (
            <ReactApexChart options={roleOptions} series={roleSeries} type="donut" height={300} />
          )}
        </div>
      </div>
    </div>
  );
}
