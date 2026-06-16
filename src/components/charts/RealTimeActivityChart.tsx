'use client';

import React from 'react';
import dynamic from 'next/dynamic';

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

interface RealTimeDataPoint {
  timestamp: string;
  page_views?: number;
  active_sessions?: number;
  interactions?: number;
  new_visitors?: number;
}

interface RealTimeActivityChartProps {
  data: RealTimeDataPoint[];
}

const RealTimeActivityChart: React.FC<RealTimeActivityChartProps> = ({ data }) => {
  const [isMobile, setIsMobile] = React.useState(false);
  const [chartHeight, setChartHeight] = React.useState(250);

  React.useEffect(() => {
    const updateDimensions = () => {
      if (typeof window !== 'undefined') {
        const mobile = window.innerWidth < 640;
        setIsMobile(mobile);
        setChartHeight(mobile ? 200 : 250);
      }
    };
    
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  const options = {
    chart: {
      type: 'line' as const,
      height: chartHeight,
      animations: {
        enabled: true,
        easing: 'easeinout',
        speed: 800,
        animateGradually: {
          enabled: true,
          delay: 150
        },
        dynamicAnimation: {
          enabled: true,
          speed: 350
        }
      },
      toolbar: {
        show: false
      },
      zoom: {
        enabled: false
      }
    },
    stroke: {
      curve: 'smooth' as const,
      width: isMobile ? 2 : 3
    },
    colors: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444'],
    xaxis: {
      type: 'datetime' as const,
      labels: {
        style: {
          colors: '#6B7280',
          fontSize: isMobile ? '10px' : '12px'
        },
        rotate: isMobile ? -45 : 0,
        rotateAlways: isMobile
      }
    },
    yaxis: {
      labels: {
        style: {
          colors: '#6B7280',
          fontSize: isMobile ? '10px' : '12px'
        }
      }
    },
    grid: {
      borderColor: '#F3F4F6',
      strokeDashArray: 4,
      padding: {
        left: isMobile ? 0 : 10,
        right: isMobile ? 0 : 10
      }
    },
    legend: {
      position: isMobile ? ('bottom' as const) : ('top' as const),
      horizontalAlign: 'left' as const,
      fontSize: isMobile ? '10px' : '12px',
      markers: {
        size: isMobile ? 6 : 8,
        strokeWidth: 0
      },
      itemMargin: {
        horizontal: isMobile ? 5 : 10
      }
    },
    tooltip: {
      theme: 'light',
      x: {
        format: 'HH:mm:ss'
      }
    }
  };

  const series = [
    {
      name: 'Page Views',
      data: data.map(item => [new Date(item.timestamp).getTime(), item.page_views || 0])
    },
    {
      name: 'Active Sessions',
      data: data.map(item => [new Date(item.timestamp).getTime(), item.active_sessions || 0])
    },
    {
      name: 'Interactions',
      data: data.map(item => [new Date(item.timestamp).getTime(), item.interactions || 0])
    },
    {
      name: 'New Visitors',
      data: data.map(item => [new Date(item.timestamp).getTime(), item.new_visitors || 0])
    }
  ];

  return (
    <div className="w-full h-full">
      <Chart
        options={options}
        series={series}
        type="line"
        height={chartHeight}
      />
    </div>
  );
};

export default RealTimeActivityChart;
