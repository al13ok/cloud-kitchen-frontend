"use client";
import React from "react";

 

import { ApexOptions } from "apexcharts";

 

import dynamic from "next/dynamic";
// Dynamically import the ReactApexChart component
const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

 

type BarChartOneProps = {
  data?: { label: string; value: number; color?: string }[];
  hideLegend?: boolean;
};

 

export default function BarChartOne({ data, hideLegend = false }: BarChartOneProps) {
  const [isDark, setIsDark] = React.useState(false);
  React.useEffect(() => {
    const update = () => {
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      const hasDarkClass = document.documentElement.classList.contains('dark');
      setIsDark(prefersDark || hasDarkClass);
    };
    update();
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => update();
    mq.addEventListener?.('change', handler);
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => {
      mq.removeEventListener?.('change', handler);
      observer.disconnect();
    };
  }, []);
  // Use provided data or fallback to default
  const chartData = data && data.length > 0 ? data : [
    { label: 'Jan', value: 168, color: '#3366CC' },
    { label: 'Feb', value: 385, color: '#3366CC' },
    { label: 'Mar', value: 201, color: '#3366CC' },
    { label: 'Apr', value: 298, color: '#3366CC' },
    { label: 'May', value: 187, color: '#3366CC' },
    { label: 'Jun', value: 195, color: '#3366CC' },
    { label: 'Jul', value: 291, color: '#3366CC' },
    { label: 'Aug', value: 110, color: '#3366CC' },
    { label: 'Sep', value: 215, color: '#3366CC' },
    { label: 'Oct', value: 390, color: '#3366CC' },
    { label: 'Nov', value: 280, color: '#3366CC' },
    { label: 'Dec', value: 112, color: '#3366CC' },
  ];

 

  const series = [
    {
      name: 'Value',
      data: chartData.map(d => ({
        x: d.label,
        y: d.value,
        fillColor: d.color || '#3366CC',
      })),
    },
  ];

 

  const options: ApexOptions = {
    chart: {
      fontFamily: 'Outfit, sans-serif',
      type: 'bar',
      height: 220,
      toolbar: { show: false },
      background: 'transparent',
      animations: {
        enabled: true,
        speed: 800,
        animateGradually: {
          enabled: true,
          delay: 150
        },
        dynamicAnimation: {
          enabled: true,
          speed: 350
        }
      }
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: '45%',
        borderRadius: 8,
        borderRadiusApplication: 'end',
        dataLabels: {
          position: 'top'
        }
      },
    },
    dataLabels: { 
      enabled: true,
      formatter: function (val: number) {
        return val.toString();
      },
      offsetY: -20,
      style: {
        fontSize: '12px',
        fontWeight: '600',
        colors: [isDark ? '#E5E7EB' : '#374151']
      }
    },
    stroke: { show: true, width: 2, colors: ['transparent'] },
    xaxis: {
      categories: chartData.map(d => d.label),
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: {
        style: {
          colors: isDark ? '#9CA3AF' : '#6B7280',
          fontSize: '13px',
          fontWeight: '500'
        }
      }
    },
    legend: {
      show: !hideLegend,
      position: 'top',
      horizontalAlign: 'left',
      fontFamily: 'Outfit',
      fontSize: '14px',
      fontWeight: '500',
      labels: { colors: isDark ? '#E5E7EB' : '#374151' }
    },
    yaxis: { 
      title: { text: undefined },
      labels: {
        style: {
          colors: isDark ? '#9CA3AF' : '#6B7280',
          fontSize: '12px'
        }
      }
    },
    grid: { 
      yaxis: { lines: { show: true } },
      strokeDashArray: 3,
      borderColor: isDark ? '#374151' : '#E5E7EB'
    },
    fill: { 
      opacity: 0.9,
      type: 'solid'
    },
    tooltip: {
      enabled: true,
      theme: isDark ? 'dark' : 'light',
      style: {
        fontSize: '12px',
        fontFamily: 'Outfit, sans-serif'
      },
      x: { show: false },
      y: { 
        formatter: (val: number) => `${val}`,
        title: {
          formatter: () => ''
        }
      },
      marker: {
        show: true,
      },
      custom: function({ series, seriesIndex, dataPointIndex, w }) {
        const value = series[seriesIndex][dataPointIndex];
        const category = w.globals.labels[dataPointIndex];
        return `<div class="bg-white dark:bg-gray-800 px-3 py-2 rounded-lg shadow-lg border ${isDark ? 'border-gray-700' : 'border-gray-200'}">
          <div class="font-semibold ${isDark ? 'text-gray-200' : 'text-gray-800'}">${category}</div>
          <div class="text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}">Value: <span class="font-medium">${value}</span></div>
        </div>`;
      }
    },
    states: {
      hover: {
        filter: {
          type: 'lighten'
        }
      },
      active: {
        allowMultipleDataPointsSelection: false,
        filter: {
          type: 'darken'
        }
      }
    }
  };

 

  return (
    <div className="max-w-full overflow-x-auto custom-scrollbar">
      <div id="chartOne" className="min-w-[1000px] relative">
        <ReactApexChart options={options} series={series} type="bar" height={220} />
        
        {/* Enhanced visual elements */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
          <div className="absolute top-4 right-4 opacity-10">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-purple-500"></div>
          </div>
          <div className="absolute bottom-4 left-4 opacity-10">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-blue-500"></div>
          </div>
        </div>
      </div>
    </div>
  );
}