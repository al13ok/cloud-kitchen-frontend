'use client';

import React from 'react';
import dynamic from 'next/dynamic';

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

interface SessionTrendDataPoint {
  timestamp: string;
  avg_duration?: number;
  bounce_rate?: number;
  conversion_rate?: number;
}

interface SessionTrendsChartProps {
  data: SessionTrendDataPoint[];
}

const SessionTrendsChart: React.FC<SessionTrendsChartProps> = ({ data }) => {
  const [chartHeight, setChartHeight] = React.useState(250);
  const [isMobile, setIsMobile] = React.useState(false);

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
      type: 'area' as const,
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
      width: isMobile ? 2 : 2
    },
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.7,
        opacityTo: 0.1,
        stops: [0, 100]
      }
    },
    colors: ['#8B5CF6', '#06B6D4', '#84CC16'],
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
        },
        formatter: (value: number) => {
          if (value < 1) {
            return (value * 100).toFixed(1) + '%';
          }
          return value.toFixed(0);
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
        format: 'MMM dd, HH:mm'
      }
    }
  };

  const series = [
    {
      name: 'Session Duration',
      data: data.map(item => [new Date(item.timestamp).getTime(), item.avg_duration || 0])
    },
    {
      name: 'Bounce Rate',
      data: data.map(item => [new Date(item.timestamp).getTime(), item.bounce_rate || 0])
    },
    {
      name: 'Conversion Rate',
      data: data.map(item => [new Date(item.timestamp).getTime(), item.conversion_rate || 0])
    }
  ];

  return (
    <div className="w-full h-full">
      <Chart
        options={options}
        series={series}
        type="area"
        height={chartHeight}
      />
    </div>
  );
};

export default SessionTrendsChart;
