import React from 'react';
import { 
  TrendingUp, 
  Users, 
  Target, 
  AlertTriangle, 
  BarChart3,
  MapPin,
  Clock,
  DollarSign,
  Activity,
  ArrowUp,
  ArrowDown
} from 'lucide-react';

const TestDashboard: React.FC = () => {
  // Mock data for testing
  const mockKPIData = {
    total_leads: 1250,
    converted_leads: 89,
    conversion_rate: 7.12,
    avg_response_time: "2.5 hours",
    total_revenue: 125000,
    revenue_growth: 15.5,
    active_agents: 12,
    leads_per_agent: 104
  };

  const mockPipelineOverview = [
    { stage: "Lead Captured", count: 1250, percentage: 100, trend: 'up' as const },
    { stage: "Lead Enriched", count: 1100, percentage: 88, trend: 'up' as const },
    { stage: "Lead Scored", count: 950, percentage: 76, trend: 'stable' as const },
    { stage: "Contacted", count: 750, percentage: 60, trend: 'down' as const },
    { stage: "Qualified", count: 450, percentage: 36, trend: 'up' as const },
    { stage: "Proposal Sent", count: 200, percentage: 16, trend: 'up' as const },
    { stage: "Closed Won", count: 89, percentage: 7.12, trend: 'up' as const }
  ];

  const mockConversionFunnel = [
    { stage: "Lead Captured", leads_count: 1250, conversion_rate: 100, drop_off_rate: 0, avg_duration: "0 min" },
    { stage: "Lead Enriched", leads_count: 1100, conversion_rate: 88, drop_off_rate: 12, avg_duration: "5 min" },
    { stage: "Lead Scored", leads_count: 950, conversion_rate: 76, drop_off_rate: 12, avg_duration: "2 min" },
    { stage: "Contacted", leads_count: 750, conversion_rate: 60, drop_off_rate: 16, avg_duration: "1 hour" },
    { stage: "Qualified", leads_count: 450, conversion_rate: 36, drop_off_rate: 24, avg_duration: "2 days" },
    { stage: "Proposal Sent", leads_count: 200, conversion_rate: 16, drop_off_rate: 20, avg_duration: "3 days" },
    { stage: "Closed Won", leads_count: 89, conversion_rate: 7.12, drop_off_rate: 8.88, avg_duration: "5 days" }
  ];

  const mockConversionRates = [
    { stage: "Lead Captured to Enriched", conversion_rate: 88, previous_rate: 85, trend: 'up' as const },
    { stage: "Enriched to Scored", conversion_rate: 86, previous_rate: 88, trend: 'down' as const },
    { stage: "Scored to Contacted", conversion_rate: 79, previous_rate: 82, trend: 'down' as const },
    { stage: "Contacted to Qualified", conversion_rate: 60, previous_rate: 58, trend: 'up' as const },
    { stage: "Qualified to Proposal", conversion_rate: 44, previous_rate: 42, trend: 'up' as const },
    { stage: "Proposal to Closed Won", conversion_rate: 44.5, previous_rate: 41, trend: 'up' as const }
  ];

  const mockDropOffData = [
    {
      stage: "Lead Enriched",
      drop_off_count: 150,
      drop_off_rate: 12,
      reasons: [
        { reason: "Invalid email", count: 80, percentage: 53.3 },
        { reason: "Invalid phone", count: 45, percentage: 30 },
        { reason: "Duplicate lead", count: 25, percentage: 16.7 }
      ]
    },
    {
      stage: "Lead Scored",
      drop_off_count: 150,
      drop_off_rate: 12,
      reasons: [
        { reason: "Low score", count: 90, percentage: 60 },
        { reason: "Spam detected", count: 35, percentage: 23.3 },
        { reason: "Invalid data", count: 25, percentage: 16.7 }
      ]
    }
  ];

  const mockIPAnalytics = [
    { ip_address: "192.168.1.100", location: "New York, US", leads_count: 45, conversion_rate: 12.5, avg_score: 78, top_sources: ["Website", "Social Media"] },
    { ip_address: "10.0.0.50", location: "California, US", leads_count: 38, conversion_rate: 15.8, avg_score: 82, top_sources: ["Email Campaign", "Referral"] },
    { ip_address: "172.16.0.25", location: "Texas, US", leads_count: 32, conversion_rate: 9.4, avg_score: 65, top_sources: ["Website", "Advertisement"] },
    { ip_address: "203.0.113.10", location: "London, UK", leads_count: 28, conversion_rate: 17.9, avg_score: 85, top_sources: ["Social Media", "Referral"] },
    { ip_address: "198.51.100.5", location: "Toronto, CA", leads_count: 25, conversion_rate: 20.0, avg_score: 88, top_sources: ["Email Campaign", "Website"] },
    { ip_address: "203.0.113.20", location: "Sydney, AU", leads_count: 22, conversion_rate: 13.6, avg_score: 72, top_sources: ["Website", "Social Media"] }
  ];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Leads</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{mockKPIData.total_leads}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Conversion Rate</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{mockKPIData.conversion_rate}%</p>
            </div>
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
              <Target className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">${mockKPIData.total_revenue.toLocaleString()}</p>
              <div className="flex items-center mt-1">
                <ArrowUp className="w-4 h-4 text-green-500" />
                <span className="text-sm text-green-500">{mockKPIData.revenue_growth}%</span>
              </div>
            </div>
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Avg Response Time</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{mockKPIData.avg_response_time}</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Pipeline Overview */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-blue-600" />
          Pipeline Overview
        </h3>
        <div className="space-y-4">
          {mockPipelineOverview.map((stage, index) => (
            <div key={index} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex-1">
                <h4 className="font-medium text-gray-900 dark:text-white">{stage.stage}</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">{stage.percentage}% of total leads</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold text-gray-900 dark:text-white">{stage.count}</p>
                <div className="flex items-center gap-1">
                  {stage.trend === 'up' ? (
                    <ArrowUp className="w-4 h-4 text-green-500" />
                  ) : stage.trend === 'down' ? (
                    <ArrowDown className="w-4 h-4 text-red-500" />
                  ) : (
                    <Activity className="w-4 h-4 text-gray-500" />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Conversion Funnel */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Target className="w-5 h-5 text-green-600" />
          Conversion Funnel
        </h3>
        <div className="space-y-4">
          {mockConversionFunnel.map((stage, index) => (
            <div key={index} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex-1">
                <h4 className="font-medium text-gray-900 dark:text-white">{stage.stage}</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">Avg Duration: {stage.avg_duration}</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold text-gray-900 dark:text-white">{stage.leads_count}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {stage.conversion_rate}% conversion
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Conversion Rates by Stage */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-purple-600" />
          Conversion Rates by Stage
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {mockConversionRates.map((stage, index) => (
            <div key={index} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-gray-900 dark:text-white text-sm">{stage.stage}</h4>
                <div className="flex items-center gap-1">
                  {stage.trend === 'up' ? (
                    <ArrowUp className="w-4 h-4 text-green-500" />
                  ) : stage.trend === 'down' ? (
                    <ArrowDown className="w-4 h-4 text-red-500" />
                  ) : (
                    <Activity className="w-4 h-4 text-gray-500" />
                  )}
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Current Rate:</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{stage.conversion_rate}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Previous Rate:</span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">{stage.previous_rate}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Drop-off Analysis */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-600" />
          Drop-off Analysis
        </h3>
        <div className="space-y-4">
          {mockDropOffData.map((stage, index) => (
            <div key={index} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-gray-900 dark:text-white">{stage.stage}</h4>
                <span className="text-sm text-red-600 dark:text-red-400">
                  {stage.drop_off_rate}% drop-off
                </span>
              </div>
              <div className="space-y-2">
                {stage.reasons.map((reason, reasonIndex) => (
                  <div key={reasonIndex} className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">{reason.reason}</span>
                    <span className="text-gray-900 dark:text-white">{reason.count} ({reason.percentage}%)</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* IP Analytics */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <MapPin className="w-5 h-5 text-indigo-600" />
          Top IP Addresses
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {mockIPAnalytics.map((ip, index) => (
            <div key={index} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-gray-900 dark:text-white">{ip.ip_address}</span>
                <span className="text-sm text-gray-600 dark:text-gray-400">{ip.location}</span>
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Leads:</span>
                  <span className="text-gray-900 dark:text-white">{ip.leads_count}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Conversion:</span>
                  <span className="text-gray-900 dark:text-white">{ip.conversion_rate}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Avg Score:</span>
                  <span className="text-gray-900 dark:text-white">{ip.avg_score}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TestDashboard;
