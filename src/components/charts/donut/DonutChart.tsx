"use client";
import React from "react";
import NoChartDisplay from "../NoChartDisplay";
import dynamic from "next/dynamic";
import { ApexOptions } from "apexcharts";

 

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

 

type DonutDatum = { label: string; value: number; color?: string };

 

type DonutChartProps = {
  data?: DonutDatum[];
  totalLabel?: string;
  height?: number;
};

 

export default function DonutChart({ data, totalLabel = "Total", height = 260 }: DonutChartProps) {

  // If data is empty or not provided, show styled no-chart message
  if (!data || data.length === 0) {
    return (
      <NoChartDisplay message="No Charts to Display" subtext="Charts will appear when department data is available." />
    );
  }

  const chartData: DonutDatum[] = data;

 

  const series = chartData.map(d => d.value);
  const labels = chartData.map(d => d.label);
  const colors = chartData.map(d => d.color || "#465fff");

 

  const total = series.reduce((a, b) => a + b, 0);

 

  const options: ApexOptions = {
    chart: { type: "donut", toolbar: { show: false } },
    labels,
    colors,
    legend: { position: "bottom", fontFamily: "Outfit" },
    dataLabels: { enabled: true },
    plotOptions: {
      pie: {
        donut: {
          labels: {
            show: true,
            name: { show: true, fontFamily: "Outfit" },
            value: { show: true, fontFamily: "Outfit" },
            total: {
              show: true,
              label: totalLabel,
              formatter: () => `${total}`,
            },
          },
        },
      },
    },
    tooltip: { y: { formatter: (val: number) => `${val}` } },
  };

 

  return (
    <div className="w-full">
      <ReactApexChart options={options} series={series} type="donut" height={height} />
    </div>
  );
}
