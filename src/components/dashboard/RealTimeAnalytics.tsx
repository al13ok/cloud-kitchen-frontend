/**
 * Real-time Analytics Dashboard Component
 * Builds upon existing LeadIntegrationDashboard to add real-time features
 */

import React, { useState, useEffect, useCallback } from 'react';
import { getAuthHeaders } from '@/utils/api';
import { 
  TrendingUp, 
  Users, 
  Target, 
  Activity,
  Clock,
  AlertTriangle,
  CheckCircle,
  Zap
} from 'lucide-react';
import dynamic from 'next/dynamic';

// Dynamically import ApexCharts
const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

interface RealTimeMetrics {
  totalLeads: number;
  newLeads: number;
  convertedLeads: number;
  pendingLeads: number;
  averageScore: number;
  conversionRate: number;
  activeAgents: number;
  responseTime: number;
}

interface LeadActivity {
  id: string;
  type: 'created' | 'updated' | 'converted' | 'assigned';
  leadName: string;
  timestamp: string;
  details: string;
}

interface RealTimeAnalyticsProps {
  refreshInterval?: number; // in milliseconds
  showActivityFeed?: boolean;
  showMetrics?: boolean;
  showCharts?: boolean;
}

const RealTimeAnalytics: React.FC<RealTimeAnalyticsProps> = ({
  refreshInterval = 3000, // 3 seconds for real-time updates
  showActivityFeed = true,
  showMetrics = true,
  showCharts = true
}) => {
  const [metrics, setMetrics] = useState<RealTimeMetrics>({
    totalLeads: 0,
    newLeads: 0,
    convertedLeads: 0,
    pendingLeads: 0,
    averageScore: 0,
    conversionRate: 0,
    activeAgents: 0,
    responseTime: 0
  });
  
  const [activityFeed, setActivityFeed] = useState<LeadActivity[]>([]);
  const [chartData, setChartData] = useState<{
    leadsOverTime: Array<{ name: string; data: number[] }>;
    conversionTrend: Array<{ name: string; data: number[] }>;
    agentPerformance: Array<{ name: string; data: number[] }>;
  }>({
    leadsOverTime: [],
    conversionTrend: [],
    agentPerformance: []
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [isRealTimeEnabled, setIsRealTimeEnabled] = useState(true);

  // Fetch real-time metrics
  const fetchRealTimeMetrics = useCallback(async () => {
    try {
      const response = await fetch('/api/v1/leads-integration/dashboard/realtime', {
        headers: getAuthHeaders()
      });
      
      if (!response.ok) {
        console.warn('Real-time metrics API not available');
        setError('Failed to load real-time metrics');
        return;
      }
      
      const data = await response.json();
      setMetrics(data.metrics);
      setLastUpdate(new Date());
    } catch (err) {
      console.warn('Error fetching real-time metrics:', err);
      setError('Failed to load real-time metrics');
    }
  }, []);

  // Fetch activity feed
  const fetchActivityFeed = useCallback(async () => {
    try {
      const response = await fetch('/api/v1/leads-integration/activity/feed', {
        headers: getAuthHeaders()
      });
      
      if (!response.ok) {
        console.warn('Activity feed API not available');
        setError('Failed to load activity feed');
        return;
      }
      
      const data = await response.json();
      setActivityFeed(data.activities || []);
    } catch (err) {
      console.warn('Error fetching activity feed:', err);
      setError('Failed to load activity feed');
    }
  }, []);

  // Fetch chart data
  const fetchChartData = useCallback(async () => {
    try {
      const response = await fetch('/api/v1/leads-integration/dashboard/charts', {
        headers: getAuthHeaders()
      });
      
      if (!response.ok) {
        console.warn('Chart data API not available');
        setError('Failed to load chart data');
        return;
      }
      
      const data = await response.json();
      setChartData(data);
    } catch (err) {
      console.warn('Error fetching chart data:', err);
      setError('Failed to load chart data');
    }
  }, []);

  // Initial data fetch
  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true);
      await Promise.all([
        fetchRealTimeMetrics(),
        fetchActivityFeed(),
        fetchChartData()
      ]);
      setLoading(false);
    };

    fetchAllData();
  }, [fetchRealTimeMetrics, fetchActivityFeed, fetchChartData]);

  // Set up real-time polling
  useEffect(() => {
    if (!isRealTimeEnabled) return;

    const interval = setInterval(() => {
      fetchRealTimeMetrics();
      fetchActivityFeed();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [isRealTimeEnabled, refreshInterval, fetchRealTimeMetrics, fetchActivityFeed]);

  // Chart configurations
  const leadsOverTimeOptions = {
    chart: {
      type: 'line' as const,
      height: 300,
      toolbar: { show: false },
      animations: {
        enabled: true,
        easing: 'easeinout',
        speed: 800
      }
    },
    stroke: {
      curve: 'smooth' as const,
      width: 3
    },
    xaxis: {
      type: 'datetime' as const,
      labels: {
        datetimeFormatter: {
          year: 'yyyy',
          month: 'MMM \'yy',
          day: 'dd MMM',
          hour: 'HH:mm'
        }
      }
    },
    yaxis: {
      title: { text: 'Number of Leads' }
    },
    colors: ['#3B82F6', '#10B981', '#F59E0B'],
    legend: {
      position: 'top' as const
    },
    tooltip: {
      x: {
        format: 'dd MMM yyyy HH:mm'
      }
    }
  };

  const conversionTrendOptions = {
    chart: {
      type: 'area' as const,
      height: 300,
      toolbar: { show: false }
    },
    stroke: {
      curve: 'smooth' as const,
      width: 2
    },
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.7,
        opacityTo: 0.3
      }
    },
    xaxis: {
      type: 'datetime' as const
    },
    yaxis: {
      title: { text: 'Conversion Rate (%)' },
      min: 0,
      max: 100
    },
    colors: ['#10B981'],
    tooltip: {
      y: {
        formatter: (val: number) => `${val.toFixed(1)}%`
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <span className="ml-3 text-gray-600">Loading real-time analytics...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <AlertTriangle className="w-5 h-5 text-red-500 mr-2" />
          <span className="text-red-700">Error loading analytics: {error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Real-time Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${isRealTimeEnabled ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
            <span className="text-sm text-gray-600">
              {isRealTimeEnabled ? 'Live' : 'Paused'}
            </span>
          </div>
          <span className="text-xs text-gray-500">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </span>
        </div>
        
        <button
          onClick={() => setIsRealTimeEnabled(!isRealTimeEnabled)}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
            isRealTimeEnabled 
              ? 'bg-green-100 text-green-800 hover:bg-green-200' 
              : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
          }`}
        >
          {isRealTimeEnabled ? 'Pause' : 'Resume'} Real-time
        </button>
      </div>

      {/* Real-time Metrics */}
      {showMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Leads</p>
                <p className="text-2xl font-bold text-gray-900">{metrics.totalLeads || 0}</p>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
            <div className="mt-2 flex items-center text-sm">
              <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
              <span className="text-green-600">+{metrics.newLeads || 0} new today</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Conversion Rate</p>
                <p className="text-2xl font-bold text-gray-900">{(metrics.conversionRate || 0).toFixed(1)}%</p>
              </div>
              <Target className="w-8 h-8 text-green-500" />
            </div>
            <div className="mt-2 flex items-center text-sm">
              <CheckCircle className="w-4 h-4 text-green-500 mr-1" />
              <span className="text-green-600">{metrics.convertedLeads || 0} converted</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Agents</p>
                <p className="text-2xl font-bold text-gray-900">{metrics.activeAgents || 0}</p>
              </div>
              <Activity className="w-8 h-8 text-purple-500" />
            </div>
            <div className="mt-2 flex items-center text-sm">
              <Clock className="w-4 h-4 text-blue-500 mr-1" />
              <span className="text-blue-600">{metrics.responseTime || 0}min avg response</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Average Score</p>
                <p className="text-2xl font-bold text-gray-900">{(metrics.averageScore || 0).toFixed(1)}</p>
              </div>
              <Zap className="w-8 h-8 text-yellow-500" />
            </div>
            <div className="mt-2 flex items-center text-sm">
              <span className="text-gray-600">{metrics.pendingLeads || 0} pending</span>
            </div>
          </div>
        </div>
      )}

      {/* Charts */}
      {showCharts && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Leads Over Time</h3>
            <ReactApexChart
              options={leadsOverTimeOptions}
              series={chartData.leadsOverTime}
              type="line"
              height={300}
            />
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Conversion Trend</h3>
            <ReactApexChart
              options={conversionTrendOptions}
              series={chartData.conversionTrend}
              type="area"
              height={300}
            />
          </div>
        </div>
      )}

      {/* Activity Feed */}
      {showActivityFeed && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {activityFeed.length > 0 ? (
                activityFeed.map((activity, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className={`w-2 h-2 rounded-full mt-2 ${
                      activity.type === 'created' ? 'bg-blue-500' :
                      activity.type === 'converted' ? 'bg-green-500' :
                      activity.type === 'assigned' ? 'bg-purple-500' :
                      'bg-yellow-500'
                    }`}></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900">
                        <span className="font-medium">{activity.leadName}</span> {activity.details}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(activity.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">No recent activity</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RealTimeAnalytics;

